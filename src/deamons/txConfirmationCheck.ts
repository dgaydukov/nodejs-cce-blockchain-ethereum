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
import {Promise} from "bluebird"
import {KafkaConnector} from "@kafka/kafkaConnector"
import {Transaction} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"
import {buildMessage} from "@deamons/helpers"


const METHOD_NEW_CONFIRMATION = "newConfirmation"
const METHOD_TX_WENT_INTO_BLOCK = "txWentIntoBlock"



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

const check = (node, kc) => {
    return new Promise((resolve, reject)=>{
        node.getBlockNumber()
            .then(lastBlockNumber=>{
                const dbTxList = Transaction.find({confirmationNumber: {$lt: process.env.MAX_CONFIRMATION_NUMBER}})
                return Promise.all([lastBlockNumber, dbTxList])
            })
            .then(data=>{
                const [lastBlockNumber, dbTxList] = data
                debug(`number of tx to check: ${dbTxList.length}`)
                const promiseList = []
                dbTxList.map(tx=> {
                    promiseList.push(node.getTxById(tx.txId))
                })
                return Promise.all([lastBlockNumber, dbTxList, ...promiseList])
            })
            .then(data=>{
                const [lastBlockNumber, dbTxList, ...nodeTxList] = data
                let txGetIntoBlock = 0;
                let txConfirmationNumberUpdated = 0;
                nodeTxList.map(tx=>{
                    if(tx.blockNumber){
                        const confirmationNumber = lastBlockNumber - tx.blockNumber
                        const dbTx = dbTxList.filter(k=>k.txId==tx.hash)[0]
                        if(0 == dbTx.blockNumber){
                            dbTx.blockNumber = tx.blockNumber
                            dbTx.save()
                                .then(data=>{
                                    txGetIntoBlock++
                                    kc.send(buildMessage(METHOD_TX_WENT_INTO_BLOCK, {
                                            txId: data.txId,
                                            blockNumber: data.blockNumber,
                                            confirmationNumber: confirmationNumber,
                                        })
                                    )
                                })
                        }
                        else if(confirmationNumber > dbTx.confirmationNumber){
                            dbTx.confirmationNumber = confirmationNumber
                            dbTx.save()
                                .then(data=>{
                                    txConfirmationNumberUpdated++
                                    kc.send(buildMessage(METHOD_NEW_CONFIRMATION, {
                                            txId: data.txId,
                                            blockNumber: data.blockNumber,
                                            confirmationNumber: data.confirmationNumber,
                                        })
                                    )
                                })
                        }
                    }
                })
                debug(`number of tx went into block: ${txGetIntoBlock}`)
                debug(`number of tx with confirmationNumber updated: ${txConfirmationNumberUpdated}`)
            })
            .then(resolve)
            .catch(reject)
    })
}

run();