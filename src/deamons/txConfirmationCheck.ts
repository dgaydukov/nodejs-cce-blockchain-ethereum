/**
 * For every transaction that has confirmationNumber less than required(6 by default) we push bitcoin node to check if confirmationNumber
 * changed
 * Solution is based on this answer
 * https://ethereum.stackexchange.com/questions/2881/how-to-get-the-transaction-confirmations-using-the-json-rpc
 * 1. Get blockNumber from this https://ethereum.stackexchange.com/questions/2881/how-to-get-the-transaction-confirmations-using-the-json-rpc, if blockNumber is null, that mean fork happened, and transaction was revoked
 * 2. Get current block number https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_blocknumber
 * 3. Subtract blockNumber from currentBlockNumber
 *
 *
 * Here we also update blockNumber for tx that was created by out bitcoin node
 */
require('module-alias/register')
import {Promise} from "bluebird"
const debug = require("debug")("txcheck")
import {KafkaConnector} from "@kafka/kafkaConnector"
import {Transaction} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"
import {buildMessage} from "@deamons/helpers"

const RUN_TIME = 10
const METHOD_NEW_CONFIRMATION = "newConfirmation"
const METHOD_TX_WENT_INTO_BLOCK = "txWentIntoBlock"
const MAX_CONFIRMATION_NUMBER = process.env.MAX_CONFIRMATION_NUMBER



const run = () => {
    const node = new EthereumNode()
    const kc = new KafkaConnector()
    let allowRun = true

    setInterval(()=>{
        if(allowRun){
            debug("start")
            allowRun = false
            check(node, kc)
                .then(()=>{
                    debug(`-------------finish-------------`)
                })
                .catch((ex)=>{
                    debug(`Error: ${ex}`)
                })
                .finally(()=>{
                    allowRun = true
                })
        }
    }, RUN_TIME * 1000)
}





const check = (node, kc) => {
    return new Promise((resolve, reject)=>{
        node.getBlockNumber()
            .then(lastBlockNumber=>{
                const dbTxList = Transaction.find({confirmationNumber: {$lt: MAX_CONFIRMATION_NUMBER}})
                return Promise.all([lastBlockNumber, dbTxList])
            })
            .then(data=>{
                const [lastBlockNumber, dbTxList] = data
                const promiseList = []
                dbTxList.map(tx=> {
                    promiseList.push(node.getTransaction(tx.txId))
                })
                const nodeTxList = Promise.all(promiseList)
                return Promise.all([lastBlockNumber, dbTxList, nodeTxList])
            })
            .then(data=>{
                const [lastBlockNumber, dbTxList, nodeTxList] = data
                nodeTxList.map(tx=>{
                    const confirmationNumber = lastBlockNumber - tx.blockNumber
                    const dbTx = dbTxList.filter(k=>k.txId==tx.hash)[0]
                    //update blockNumber if null
                    if(dbTx.blockNumber == 0){
                        dbTx.blockNumber = tx.blockNumber
                        dbTx.save()
                            .then(data=>{
                                kc.send(buildMessage(METHOD_TX_WENT_INTO_BLOCK, {
                                        txId: data.txId,
                                        blockNumber: data.blockNumber,
                                        confirmationNumber: data.confirmationNumber,
                                    })
                                )
                            })
                    }
                    else if(confirmationNumber > dbTx.confirmationNumber){
                        dbTx.confirmationNumber = confirmationNumber
                        dbTx.save()
                            .then(data=>{
                                kc.send(buildMessage(METHOD_NEW_CONFIRMATION, {
                                        txId: data.txId,
                                        blockNumber: data.blockNumber,
                                        confirmationNumber: data.confirmationNumber,
                                    })
                                )
                            })
                    }
                })
            })
            .catch(ex=>{
                reject(ex)
            })
    })
}