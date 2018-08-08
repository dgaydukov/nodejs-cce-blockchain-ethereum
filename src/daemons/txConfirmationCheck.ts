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
import {buildMessage} from "src/daemons/helpers"
import {METHOD_TX_WENT_INTO_BLOCK, METHOD_NEW_TX_CONFIRMATION} from "@root/constList"

class TxConfirmationCheck{
    run(){
        const intervalTime = Number(process.env.RUN_INTERVAL) * 1000
        const node = new EthereumNode()
        const kc = new KafkaConnector()
        let allowRun = true
        const inner = ()=>{
            if(allowRun) {
                debug("start")
                allowRun = false
                this.check(node, kc)
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
    async check(node, kc){
        try{
            const lastBlockNumber = await node.getBlockNumber()
            const dbTxList = await Transaction.find({confirmationNumber: {$lt: process.env.MAX_CONFIRMATION_NUMBER}})
            let txGetIntoBlock = 0;
            let txConfirmationNumberUpdated = 0;
            const len = dbTxList.length
            debug(`number of tx to check: ${len}`)
            for(let i = 0; i < len; i++){
                const tx = await node.getTxById(dbTxList[i].txId)
                if(tx.blockNumber){
                    const confirmationNumber = lastBlockNumber - tx.blockNumber
                    const dbTx = dbTxList.filter(k=>k.txId==tx.hash)[0]
                    if(0 == dbTx.blockNumber){
                        dbTx.blockNumber = tx.blockNumber
                        const _dbTx = await dbTx.save()
                        txGetIntoBlock++
                        kc.send(buildMessage(METHOD_TX_WENT_INTO_BLOCK, {
                                txId: _dbTx.txId,
                                blockNumber: _dbTx.blockNumber,
                                confirmationNumber: confirmationNumber,
                            })
                        )
                    }
                    else if(confirmationNumber > dbTx.confirmationNumber){
                        dbTx.confirmationNumber = confirmationNumber
                        const _dbTx = await dbTx.save()
                        txConfirmationNumberUpdated++
                        kc.send(buildMessage(METHOD_NEW_TX_CONFIRMATION, {
                                txId: _dbTx.txId,
                                blockNumber: _dbTx.blockNumber,
                                confirmationNumber: _dbTx.confirmationNumber,
                            })
                        )
                    }
                }
            }
            debug(`number of tx went into block: ${txGetIntoBlock}`)
            debug(`number of tx with confirmationNumber updated: ${txConfirmationNumberUpdated}`)
        }
        catch(ex){
            debug(`Error: ${ex}`)
        }
    }
}

const txcheck = new TxConfirmationCheck()
txcheck.run()