/**
 * For every block we check if our addreses has been included. And if yes, we save such transactions and push other microservices
 */

require('module-alias/register')
import {Promise} from "bluebird"
const debug = require("debug")("bcheck")
import {default as config} from "@root/config.json"
import {Address} from "@db/models/address"
import {Transaction, TYPE} from "@db/models/transaction"
import {LatestBlock} from "@db/models/latestBlock"
import {EthereumNode} from "@blockchain/ethereumNode"
import {KafkaConnector} from "@kafka/kafkaConnector"
import {buildMessage} from "@deamons/helpers"

const RUN_TIME = 10
const GET_BLOCK_BY_NUMBER = "eth_getBlockByNumber"
const METHOD_NEW_BALANCE = "newBalance"
const METHOD_NEW_TRANSACTION = "newTx"


const run = () => {
    const node = new EthereumNode()
    const kc = new KafkaConnector()
    let allowRun = true
    const inner = ()=>{
        if(allowRun) {
            debug("start")
            allowRun = false
            check(node, kc)
                .then(() => {
                    debug(`-------------finish-------------`)
                })
                .catch((ex) => {
                    debug(`Error: ${ex}`)
                })
                .finally(() => {
                    allowRun = true
                })
        }
    }
    inner();
    setInterval(inner, RUN_TIME * 1000)
}

const check = (node, kc) =>{
    /**
     *  For test purpose you can clear latestblock & transaction
     *  LatestBlock.collection.drop()
     *  Transaction.collection.drop()
     */

    return new Promise((resolve, reject)=>{
        const dbAddressList = Address.find({})
        const dbLastSyncBlockNumber = LatestBlock.findOne({})
        Promise.all([dbAddressList, dbLastSyncBlockNumber])
            .then(data=>{
                let [dbAddressList, dbLastSyncBlockNumber] = data
                const addressList = {}
                dbAddressList.map(item=>{
                    if(item.address){
                        addressList[item.address.toLowerCase()] = item
                    }
                })
                if(!dbLastSyncBlockNumber){
                    dbLastSyncBlockNumber = new LatestBlock()
                    dbLastSyncBlockNumber = config.ETHEREUM_SYNC_START_BLOCK
                }
                dbLastSyncBlockNumber.blockNumber = Number(dbLastSyncBlockNumber.blockNumber) + 1
                const nodeBlock = node.getBlockByNumber(dbLastSyncBlockNumber.blockNumber)
                return Promise.all([addressList, dbLastSyncBlockNumber, nodeBlock])
            })
            .then(data=>{
                const [addressList, dbLastSyncBlockNumber, nodeBlock] = data
                debug(`block #${dbLastSyncBlockNumber.blockNumber}`)
                debug(`number of tx: ${nodeBlock.transactions.length}`)
                nodeBlock.transactions.map(tx=>{
                        if(tx.to){
                            const addressToItem = addressList[tx.to.toLowerCase()]
                            if(addressToItem){
                                debug(`address found: ${addressToItem.address}`)
                                const txAmount = node.fromWei(tx.value)
                                Transaction.findOne({txId: tx.hash}, (err, dbTx)=>{
                                    if(!dbTx) {
                                        dbTx = new Transaction()
                                        dbTx.txId = tx.hash
                                    }
                                    dbTx.addressFrom = tx.from
                                    dbTx.addressTo = tx.to
                                    dbTx.amount = txAmount
                                    dbTx.blockNumber = dbLastSyncBlockNumber.blockNumber
                                    dbTx.type = TYPE.INPUT
                                    dbTx.save()
                                        .then(data=>{
                                            debug(`tx saved ${data.txId}, address: ${data.addressTo}`)
                                            kc.send(
                                                buildMessage(METHOD_NEW_TRANSACTION, {
                                                    addressFrom: data.addressFrom,
                                                    addressTo: data.addressTo,
                                                    amount: data.amount,
                                                    confirmationNumber: data.confirmationNumber,
                                                    blockNumber: data.blockNumber,
                                                })
                                            )
                                            return Transaction.find({addressTo: tx.to})
                                        })
                                        .then(txList=>{
                                            let balance: number = 0
                                            txList.map(txItem=>{
                                                if(txItem.type == TYPE.INPUT){
                                                    balance += Number(txItem.amount)
                                                }
                                                else{
                                                    balance -= Number(txItem.amount)
                                                }
                                            })
                                            addressToItem.balance = balance
                                            addressToItem.save()
                                                .then(data=>{
                                                    kc.send(
                                                        buildMessage(METHOD_NEW_BALANCE, {
                                                            address: tx.to,
                                                            txId: tx.hash,
                                                            amount: txAmount,
                                                            totalBalance: balance,
                                                        })
                                                    )
                                                })
                                            });
                                        })
                            }
                        }
                        // todo: we send money to somebody??
                        if(tx.from){
                            const addressFromItem = addressList[tx.from.toLowerCase()]
                            if(addressFromItem){

                            }
                        }
                    })
                dbLastSyncBlockNumber.save()
            })
            .then(resolve)
            .catch(reject)
    })
}


run()