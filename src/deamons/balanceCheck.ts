/**
 * For every block we check if our addreses has been included. And if yes, we save such transactions and push other microservices
 */

require('module-alias/register')
const debug = require("debug")("bcheck")
import {default as config} from "@root/config.json"
import {Address} from "@db/models/address"
import {Transaction, TYPE} from "@db/models/transaction"
import {LatestBlock} from "@db/models/latestBlock"
import {EthereumNode} from "@blockchain/ethereumNode"
import {KafkaConnector} from "@kafka/kafkaConnector"
import {buildMessage} from "@deamons/helpers"

const RUN_TIME = 10
const WAIT_TIME = 1
const GET_BLOCK_BY_NUMBER = "eth_getBlockByNumber"
const METHOD_NEW_BALANCE = "newBalance"
const METHOD_NEW_TRANSACTION = "newTx"


let allowRun = true
const node = new EthereumNode()
const kc = new KafkaConnector()


setInterval(()=>{
    if(allowRun){
        allowRun = false
        const finishCb = (n = null) => {
            if(n){
                debug(`------------finish block #${n}------------`)
            }
            allowRun = true
        }
        check(finishCb)
    }
}, RUN_TIME * 1000)

const check = (finishCb) =>{
    /**
     *  For test purpose you can clear latestblock & transaction
     *  LatestBlock.collection.drop()
     *  Transaction.collection.drop()
     */
    const finish = (lastBlockNumber = null, lastBlock = null) => {
        if(lastBlock){
            lastBlock.save();
        }
        setTimeout(()=>{
            finishCb(lastBlockNumber)
        }, WAIT_TIME * 1000)
    }

    Address.find({}, (err, data)=>{
        debug(`number of address to watch: ${data.length}`)
        const addressList = {}
        if(data){
            data.map(addressItem=>{
                if(addressItem.address){
                    addressList[addressItem.address.toLowerCase()] = addressItem
                }
            })
        }

        //get last checked block
        LatestBlock.findOne({}, (err, lastBlock)=>{
            let lastBlockNumber;
            if(!lastBlock){
                lastBlock = new LatestBlock()
                lastBlockNumber = config.ETHEREUM_SYNC_START_BLOCK
            }
            else{
                lastBlockNumber = lastBlock.blockNumber
            }
            lastBlockNumber = Number(lastBlockNumber)
            lastBlock.blockNumber = lastBlockNumber + 1
            const options = {
                uri: config.ETHEREUM_NODE_BASE_URL,
                method: 'POST',
                json: {
                    jsonrpc: "2.0",
                    method: GET_BLOCK_BY_NUMBER,
                    params: ["0x"+Number(lastBlockNumber).toString(16), true],
                    id: 1,
                }
            };
            // node.getBlockByNumber(lastBlockNumber, (err, block)=>{
            //     debug(`block #${lastBlockNumber}`)
            //     if(err || null == block){
            //         debug(`blockchain getBlockByNumber error: ${err}`)
            //         return finish()
            //     }
            //
            //     const len = block.transactions.length
            //     debug(`number of tx: ${len}`)
            //     if(len == 0){
            //         finish(lastBlockNumber, lastBlock)
            //     }
            //     block.transactions.map((tx, i)=>{
            //         if(len == i + 1){
            //             finish(lastBlockNumber, lastBlock)
            //         }
            //         if(tx.to){
            //             const addressToItem = addressList[tx.to.toLowerCase()]
            //             if(addressToItem){
            //                 debug(`address found: ${addressToItem.address}`)
            //                 const amount = tx.value * 10**-18
            //                 Transaction.findOne({txId: tx.hash}, (err, dbTx)=>{
            //                     if(!dbTx) {
            //                         dbTx = new Transaction()
            //                         dbTx.txId = tx.hash
            //                     }
            //                     dbTx.addressFrom = tx.from
            //                     dbTx.addressTo = tx.to
            //                     dbTx.amount = amount
            //                     dbTx.blockNumber = lastBlockNumber
            //                     dbTx.type = TYPE.INPUT
            //                     dbTx.save((err, data)=>{
            //                         debug(`tx saved ${data.txId}, address: ${data.addressTo}`)
            //                         Transaction.find({addressTo: tx.to}, (err, data)=>{
            //                             if(data){
            //                                 let balance: number = 0
            //                                 data.map(txItem=>{
            //                                     if(txItem.type == TYPE.INPUT){
            //                                         balance += Number(txItem.amount)
            //                                     }
            //                                     else{
            //                                         balance -= Number(txItem.amount)
            //                                     }
            //                                 })
            //                                 addressToItem.balance = balance
            //                                 addressToItem.save((err, savedItem)=>{
            //                                     kc.send(buildMessage(METHOD_NEW_BALANCE, {
            //                                             address: tx.to,
            //                                             txId: tx.hash,
            //                                             amount: amount,
            //                                             totalBalance: balance,
            //                                         })
            //                                     )
            //                                 });
            //                             }
            //                         })
            //                         kc.send(buildMessage(METHOD_NEW_TRANSACTION, {
            //                                 addressFrom: data.addressFrom,
            //                                 addressTo: data.addressTo,
            //                                 amount: data.amount,
            //                                 confirmationNumber: data.confirmationNumber,
            //                                 blockNumber: data.blockNumber,
            //                             })
            //                         )
            //                     })
            //                 })
            //             }
            //         }
            //         // todo: we send money to somebody??
            //         if(tx.from){
            //             const addressFromItem = addressList[tx.from.toLowerCase()]
            //             if(addressFromItem){
            //
            //             }
            //         }
            //     })
            // })
        })
    });
}