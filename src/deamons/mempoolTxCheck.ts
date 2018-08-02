/**
 * Straight way balance check with constant longpolling of bitcoin node (bitcoind) with all addresses that
 * we have in our database. The deamon simply run across every address in db and check if it balance has changed,
 * that means somebody (but not we) made transaction and move money to daemon.
 */
require('module-alias/register')
const debug = require("debug")("mptheck")
import {Promise} from "bluebird"
import {KafkaConnector} from "@kafka/kafkaConnector"
import {Address} from "@db/models/address"
import {MempoolTx} from "@db/models/mempoolTx"
import {Transaction} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"
import {buildMessage} from "@deamons/helpers"


const METHOD_NEW_MEMPOOL_TX = "newMempoolTx"



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

const check = async (node, kc) => {
    /**
     *  For test purpose you can clear latestblock & transaction
     *  LatestBlock.collection.drop()
     */
    try{
        const dbAddressList = await Address.find()
        const dbMempoolTxList = await MempoolTx.find()
        debug(`number of address to watch: ${dbAddressList.length}`)
        debug(`number of mempool tx in db: ${dbMempoolTxList.length}`)
        const addressList = {};
        const mempoolTxList = {};
        dbAddressList.map(item=>{
            const address = item.address
            if(address){
                addressList[address.toLowerCase()] = item
            }
        })
        dbMempoolTxList.map(txItem=>{
            mempoolTxList[txItem.txId] = 1
        })
        const pool = await node.getMempoolTxContent()
        const txWatchList = []
        Object.keys(pool.pending).map(addressFrom => {
            Object.keys(pool.pending[addressFrom]).map(key => {
                const tx = pool.pending[addressFrom][key]
                if (mempoolTxList[tx.hash]) {
                    return
                }
                const newMpTx = new MempoolTx({
                    txId: tx.hash
                })
                newMpTx.save()
                txWatchList.push(tx)
            })
        })
        const len = txWatchList.length
        debug(`number of mempool tx to check: ${len}`)
        let inputTxNumber = 0
        txWatchList.map(async(tx)=>{
            if(tx.to && addressList[tx.to.toLowerCase()]){
                inputTxNumber++
                debug(`address found: ${tx.to}`)
                const amount = parseInt(tx.value, 16)*10**-18
                const newTx = new Transaction({
                    txId: tx.hash,
                    addressFrom: tx.from,
                    addressTo: tx.to,
                    amount: amount,
                })
                const dbTx = await newTx.save()
                kc.send(buildMessage(METHOD_NEW_MEMPOOL_TX, dbTx))
            }
        })
        debug(`number of incoming tx in mempool: ${inputTxNumber}`)
    }
    catch(ex){
        debug(`Error: ${ex}`)
    }
}


run()