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


const METHOD_NEW_BALANCE = "newBalance"
const METHOD_NEW_TRANSACTION = "newTx"




const run = () => {
    const intervalTime = Number(process.env.RUN_INTERVAL) * 1000
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
    setInterval(inner, intervalTime)
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
                    dbLastSyncBlockNumber.blockNumber = config.ETHEREUM_SYNC_START_BLOCK
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

                    let addressItem;
                    let txType;
                    if(tx.to && addressList[tx.to.toLowerCase()]) {
                        addressItem = addressList[tx.to.toLowerCase()]
                        txType = TYPE.INPUT
                    }
                    if(tx.from && addressList[tx.from.toLowerCase()]){
                        addressItem = addressList[tx.from.toLowerCase()]
                        txType = TYPE.OUTPUT
                    }

                    if(addressItem) {
                        debug(`address found: ${addressItem.address}`)
                        const txAmount = node.fromWei(tx.value)
                        const dbTx = Transaction.findOne({txId: tx.hash})
                        const txReceipt = node.getTxReceiptById(tx.hash)
                            Promise.all([dbTx, txReceipt])
                            .then(data => {
                                let [dbTx, txReceipt] = data
                                const txFee = node.fromWei((txReceipt.gasUsed * tx.gasPrice).toString())
                                if (!dbTx) {
                                    dbTx = new Transaction()
                                    dbTx.txId = tx.hash
                                }
                                dbTx.addressFrom = tx.from
                                dbTx.addressTo = tx.to
                                dbTx.amount = txAmount
                                dbTx.fee = txFee
                                dbTx.blockNumber = dbLastSyncBlockNumber.blockNumber
                                dbTx.type = txType
                                return dbTx.save()
                            })
                            .then(data => {
                                debug(`tx saved ${data.txId}, address: ${addressItem.address}`)
                                kc.send(
                                    buildMessage(METHOD_NEW_TRANSACTION, {
                                        addressFrom: data.addressFrom,
                                        addressTo: data.addressTo,
                                        amount: data.amount,
                                        fee: data.fee,
                                        confirmationNumber: data.confirmationNumber,
                                        blockNumber: data.blockNumber,
                                    })
                                )
                                return Transaction.find({$or: [
                                        {addressFrom: {$regex: addressItem.address, $options: 'i'}},
                                        {addressTo: {$regex: addressItem.address, $options: 'i'}}
                                    ]
                                })
                            })
                            .then(txList => {
                                //recalculate balance
                                let balance: number = 0
                                txList.map(txItem => {
                                    if (txItem.type == TYPE.INPUT) {
                                        balance += Number(txItem.amount)
                                    }
                                    else {
                                        balance -= Number(txItem.amount)
                                        balance -= Number(txItem.fee)
                                    }
                                })
                                addressItem.balance = balance
                                return addressItem.save()
                            })
                            .then(data => {
                                kc.send(
                                    buildMessage(METHOD_NEW_BALANCE, {
                                        address: data.address,
                                        txId: tx.hash,
                                        amount: txAmount,
                                        totalBalance: data.balance,
                                    })
                                )
                            })
                    }
                })
                dbLastSyncBlockNumber.save()
            })
            .then(resolve)
            .catch(reject)
    })
}


run()