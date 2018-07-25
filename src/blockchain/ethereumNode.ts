
import {Promise} from "bluebird"
import {default as config} from "@root/config.json"
const debug = require("debug")("blockchain")
const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.HttpProvider(config.ETHEREUM_NODE_BASE_URL))
const eth = web3.eth


eth.extend({
    property: 'txpool',
    methods: [{
        name: 'content',
        call: 'txpool_content'
    },{
        name: 'inspect',
        call: 'txpool_inspect'
    },{
        name: 'status',
        call: 'txpool_status'
    }]
});



export class EthereumNode{
    getNewAddress(password){
        return eth.personal.newAccount(password)
    }

    getTransaction(txId){
        return eth.getTransaction(txId)
    }

    getMempoolTxContent(){
        return web3.eth.txpool.content()
    }

    getBlockNumber(){
        return eth.getBlockNumber()
    }

    getBlockByNumber(number){
        return eth.getBlock(number, true)
    }

    sendTransaction(from, to, amount, unlockPassword){
        return new Promise((resolve, reject)=>{
            eth.personal.unlockAccount(from, unlockPassword, 30)
                .then((isOpen) => {
                    if(!isOpen){
                        throw new Error(`Can't open account, maybe wrong password`)
                    }
                    return eth.sendTransaction({
                        from: from,
                        to: to,
                        value: web3.utils.toWei(amount.toString())
                    })
                })
                .then(receipt=>{
                    resolve(receipt)
                })
                .catch(ex=>{
                    reject(ex)
                })
        })
    }

    getBalance(address){
        return eth.getBalance(address);
    }

    getTotalBalance(){
        return new Promise((resolve, reject)=>{
            let total = 0;
            eth.getAccounts()
                .then(data=>{
                    debug(`number of accounts is: ${data.length}`)
                    const promiseList = []
                    data.map(address=>{
                        promiseList.push(eth.getBalance(address))
                    })
                    return Promise.all(promiseList)
                })
                .then(data=>{
                    let totalBalance: number = 0
                    data.map(balance=>{
                        totalBalance += Number(web3.utils.fromWei(balance, "ether"))
                    })
                    debug(`total balance is: ${totalBalance}`)
                    return totalBalance
                })
                .then(resolve)
                .catch(reject)
            })
    }
}









