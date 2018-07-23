/**
 * Straight way balance check with constant longpolling of bitcoin node (bitcoind) with all addresses that
 * we have in our database. The deamon simply run across every address in db and check if it balance has changed,
 * that means somebody (but not we) made transaction and move money to daemon.
 */
require('module-alias/register')

const debug = require("debug")("mptheck")
import {KafkaConnector} from "@kafka/kafkaConnector"
import {Address} from "@db/models/address"
import {MempoolTx} from "@db/models/mempoolTx"
import {Transaction} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"
import {buildMessage} from "@deamons/helpers"

const RUN_TIME = 10
const WAIT_TIME = 10
const METHOD_NEW_MEMPOOL_TX = "newMempoolTx"

const node = new EthereumNode()
const kc = new KafkaConnector()
let allowRun = true


setInterval(()=>{
    if(allowRun){
        debug("start")
        allowRun = false
        const finishCb = () => {
            allowRun = true
            debug("-------------finish-------------")
        }
        check(finishCb)
    }
}, RUN_TIME * 1000)

const check = (finishCb) => {
    /**
     *  For test purpose you can clear latestblock & transaction
     *  LatestBlock.collection.drop()
     */

     Address.find({}, (err, data)=>{
         const addressList = {}
         debug(`number of address to watch: ${data.length}`)
         if(data){
             data.map(addressItem => {
                 const address = addressItem.address
                 if(address){
                     addressList[address.toLowerCase()] = addressItem
                 }
             })
         }
         MempoolTx.find({}, (err, data)=>{
             if(err){
                 debug(`mempool db table error: ${err}`)
                 return finishCb()
             }
             const dbTxList = {}
             debug(`db tx number: ${data.length}`)
             if(data){
                 data.map(txItem=>{
                     dbTxList[txItem.txId] = 1
                 })
             }
             node.getMempoolTxList((err, pool)=>{
                 if(err || null == pool){
                     debug(`blockchain mempool error: ${err}`)
                     return finishCb()
                 }
                 const txWatchList = []
                 Object.keys(pool.pending).map(addressFrom=>{
                     Object.keys(pool.pending[addressFrom]).map(key=>{
                         const tx = pool.pending[addressFrom][key]
                         if(dbTxList[tx.hash]){
                             return
                         }
                         const newMpTx = new MempoolTx({
                             txId: tx.hash
                         })
                         newMpTx.save((err, dta)=>{

                         })
                         txWatchList.push(tx)
                     })
                 })

                 const len = txWatchList.length
                 debug(`tx number to check: ${len}`)
                 txWatchList.map((tx, i)=>{
                     if(i == len - 1){
                         finishCb()
                     }
                     if(tx.to && addressList[tx.to.toLowerCase()]){
                         debug(`address found: ${tx.to}`)
                         const newTx = new Transaction({
                             txId: tx.hash,
                             addressFrom: tx.from,
                             addressTo: tx.to,
                             amount: tx.value,
                         })
                         newTx.save((err, dta)=>{

                         })
                         kc.send(buildMessage(METHOD_NEW_MEMPOOL_TX, {
                                 txId: tx.hash,
                                 addressFrom: tx.from,
                                 addressTo: tx.to,
                                 amount: tx.value,
                             })
                         )
                     }
                 })
             })
         })
    })
}