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
const debug = require("debug")("txcheck")
import {KafkaConnector} from "@kafka/kafkaConnector"
import {Transaction} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"
import {buildMessage} from "@deamons/helpers"

const RUN_TIME = 10
const WAIT_TIME = 1
const METHOD_NEW_CONFIRMATION = "newConfirmation"
const METHOD_TX_WENT_INTO_BLOCK = "txWentIntoBlock"
const MAX_CONFIRMATION_NUMBER = process.env.MAX_CONFIRMATION_NUMBER


const node = new EthereumNode()
const kc = new KafkaConnector()


let allowRun = true


setInterval(()=>{
    if(allowRun){
        allowRun = false
        const finishCb = () => {
            allowRun = true
            debug("--------finish--------")
        }
        check(finishCb)
    }
}, RUN_TIME * 1000)





const check = (finishCb) => {
    const finish = () => {
        setTimeout(()=>{
            finishCb()
        }, WAIT_TIME * 1000)
    }
    // node.getCurrentBlockNumber((err, currentBlockNumber)=>{
    //     if(err || null == currentBlockNumber){
    //         debug(`blockchain getCurrentBlockNumber error: ${err}`)
    //         return finish()
    //     }
    //     Transaction.find({confirmationNumber: {$lt: MAX_CONFIRMATION_NUMBER}}, (err, txList)=>{
    //         if(txList){
    //             const len = txList.length
    //             debug(`number of tx to watch: ${len}`)
    //             if(len == 0){
    //                 finish()
    //             }
    //             txList.map((txItem, i)=>{
    //                 setTimeout(()=>{
    //                     node.getTransaction(txItem.txId, (err, tx)=>{
    //                         if(i == len - 1){
    //                             finish()
    //                         }
    //                         if(err || null == tx || !tx.blockNumber){
    //                             return
    //                         }
    //                         const blockNumber = tx.blockNumber
    //                         const confirmationNumber = currentBlockNumber - blockNumber
    //                         //update blockNumber if null
    //                         if(!txItem.blockNumber){
    //                             txItem.blockNumber = blockNumber
    //                             txItem.save((err, data)=>{
    //                                 if(err){
    //                                     return debug(err.toString())
    //                                 }
    //                                 kc.send(buildMessage(METHOD_TX_WENT_INTO_BLOCK, {
    //                                         txId: data.txId,
    //                                         blockNumber: data.blockNumber,
    //                                         confirmationNumber: data.confirmationNumber,
    //                                     })
    //                                 );
    //                             })
    //                         }
    //                         else if(confirmationNumber > 0 && confirmationNumber != txItem.confirmationNumber){
    //                             debug(`txId: ${txItem.txId}, confirmationNumber: ${confirmationNumber}`)
    //                             txItem.confirmationNumber = confirmationNumber
    //                             txItem.save((err, data)=>{
    //                                 if(err){
    //                                     return debug(err.toString())
    //                                 }
    //                                 kc.send(buildMessage(METHOD_NEW_CONFIRMATION, {
    //                                         txId: data.txId,
    //                                         blockNumber: data.blockNumber,
    //                                         confirmationNumber: data.confirmationNumber,
    //                                     })
    //                                 );
    //                             })
    //                         }
    //
    //                     })
    //                 }, i * 100)
    //             })
    //         }
    //         else{
    //             finish()
    //         }
    //     })
    // })

}