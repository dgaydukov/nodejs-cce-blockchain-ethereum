
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

    getTxById(txId){
        return eth.getTransaction(txId)
    }
    getTxReceiptById(txId){
        return eth.getTransactionReceipt(txId)
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

    async sendTransaction(from, to, amount, unlockPassword){
        const unlock = eth.personal.unlockAccount(from, unlockPassword, 30)
        if(!unlock){
            throw new Error(`Can't open account, maybe wrong password`)
        }
        const tx = eth.sendTransaction({
            from: from,
            to: to,
            value: web3.utils.toWei(amount.toString())
        })
        return tx
    }

    getBalance(address){
        return eth.getBalance(address);
    }

    async getTotalBalance(){
        const list = await eth.getAccounts()
        const len = list.length
        let total = 0
        for(let i = 0; i < len; i++){
            const balance = await eth.getBalance(list[i])
            total += this.fromWei(balance)
        }
        return total
    }

    toWei(amount){
        return Number(web3.utils.toWei(amount, "ether"))
    }
    fromWei(amount){
        return Number(web3.utils.fromWei(amount, "ether"))
    }
}









