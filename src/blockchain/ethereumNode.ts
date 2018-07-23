
const debug = require("debug")("blockchain")
import {default as config} from "@root/config.json"
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
    getNewAddress(password, cb){
        eth.personal.newAccount(password, (error, address)=>{
            if(error){
                debug(`error on address creating: ${error.message}`)
            }
            else{
                debug(`new address ${address} created`)
            }
            cb(error, address)
        })
    }

    getBalance(address, cb){
        eth.getBalance(address, (error, balance)=>{
            debug(`balance of ${address} is ${balance}`)
            cb(error, balance)
        });
    }

    getAddressList(cb){
        eth.getAccounts((err, list)=>{
            cb(err, list)
        })
    }

    getTransaction(txId, cb){
        eth.getTransaction(txId, (err, tx)=>{
            cb(err, tx)
        })
    }

    getCurrentBlockNumber(cb){
        eth.getBlockNumber( (err, tx)=>{
            cb(err, tx)
        })
    }

    getBlockByNumber(number, cb){
        eth.getBlock(number, true,  (err, block)=>{
            cb(err, block)
        })
    }

    getMempoolTxList(cb){
        web3.eth.txpool.content()
            .then(pool=>{
                cb(null, pool)
            })
            .catch(err=>{
                cb(err)
            })
    }

    getTotalBalance(cb){
        let total = 0;
        eth.getAccounts((err, list)=>{
            const len = list.length
            list.map((address, i)=>{
                eth.getBalance(address, (err, balance)=>{
                    if(!err){
                        debug(`balance of ${address} is ${balance}`)
                        total += parseFloat(balance)
                    }

                    if(i == len - 1){
                        debug(`total balance ${total}`)
                        cb(total)
                    }
                })
            })
        })
    }

    sendTransaction(from, to, amount, unlockPassword, cb){
        eth.personal.unlockAccount(from, unlockPassword, 30)
            .then((response) => {
                eth.sendTransaction({
                    from: from,
                    to: to,
                    value: web3.utils.toWei(amount.toString())
                }, (err, result)=>{
                    cb(err, result)
                });
            }).catch((err) => {
                cb(err)
            });


    }
}









