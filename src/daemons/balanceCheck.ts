/**
 * Async-Await version of balanceCheck
 */

require('module-alias/register')
const debug = require("debug")("bcheck")
import {Promise} from "bluebird"
import {default as config} from "@root/config.json"
import {Address} from "@db/models/address"
import {Transaction, TYPE} from "@db/models/transaction"
import {LatestBlock} from "@db/models/latestBlock"
import {EthereumNode} from "@blockchain/ethereumNode"
import {KafkaConnector} from "@kafka/kafkaConnector"
import {buildMessage} from "src/daemons/helpers"


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
                    allowRun = true
                    debug(`-------------finish-------------`)
                })
                .catch((ex) => {
                    allowRun = true
                    debug(`Error: ${ex}`)
                })
        }
    }
    inner();
    setInterval(inner, intervalTime)
}

const check = async(node, kc) => {
    /**
     *  For test purpose you can clear latestblock & transaction
     *  LatestBlock.collection.drop()
     *  Transaction.collection.drop()
     */

    try{
        const dbAddressList = await Address.find({})
        let dbLastSyncBlockNumber = await LatestBlock.findOne({})
        const addressList = {}
        dbAddressList.map(item=>{
            if(item.address){
                addressList[item.address.toLowerCase()] = item
            }
        })
        if(!dbLastSyncBlockNumber){
            dbLastSyncBlockNumber = new LatestBlock()
            dbLastSyncBlockNumber.blockNumber = Number(config.ETHEREUM_SYNC_START_BLOCK)
        }
        debug(`block #${dbLastSyncBlockNumber.blockNumber}`)

        dbLastSyncBlockNumber.blockNumber = Number(dbLastSyncBlockNumber.blockNumber) + 1
        const nodeBlock = await node.getBlockByNumber(dbLastSyncBlockNumber.blockNumber)
        const txLen = nodeBlock.transactions.length
        debug(`number of tx: ${txLen}`)
        for(let i = 0; i < txLen; i++){
            const tx = nodeBlock.transactions[i]
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
                let dbTx = await Transaction.findOne({txId: tx.hash})
                const txReceipt = await node.getTxReceiptById(tx.hash)

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
                const data = await dbTx.save()

                debug(`tx saved ${data.txId}, address: ${addressItem.address}`)
                kc.send(
                    buildMessage(METHOD_NEW_TRANSACTION, data)
                )
                const dbTxList = await Transaction.find({$or: [
                        {addressFrom: {$regex: addressItem.address, $options: 'i'}},
                        {addressTo: {$regex: addressItem.address, $options: 'i'}}
                    ]
                })

                let balance: number = 0
                dbTxList.map(txItem => {
                    if (txItem.type == TYPE.INPUT) {
                        balance += Number(txItem.amount)
                    }
                    else {
                        balance -= Number(txItem.amount)
                        balance -= Number(txItem.fee)
                    }
                })
                addressItem.balance = balance
                const dbAddress = await addressItem.save()

                kc.send(
                    buildMessage(METHOD_NEW_BALANCE, {
                        address: dbAddress.address,
                        txId: tx.hash,
                        amount: txAmount,
                        totalBalance: dbAddress.balance,
                    })
                )
            }
        }
        dbLastSyncBlockNumber.save()
    }
    catch(e){

    }
    finally{

    }
}


run()