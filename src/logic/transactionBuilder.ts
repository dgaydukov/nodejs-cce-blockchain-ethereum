/**
 *
 *
 */

import {Address} from "@db/models/address"
import {Transaction, TYPE} from "@db/models/transaction"
import {EthereumNode} from "@blockchain/ethereumNode"



export class TransactionBuilder {
    addressFrom: string
    addressTo: string
    amount: number

    constructor(from, to, amount) {
        this.addressFrom = from;
        this.addressTo = to;
        this.amount = amount;
    }

    run(cb){
        Address.findOne({address: {$regex: this.addressFrom, $options: 'i'}}, (err, addressItem)=>{
            if(err || null == addressItem){
                return cb(err)
            }
            if(addressItem.balance < this.amount){
                return cb(`not enough money, account balance is:${addressItem.balance}`)
            }
            const node = new EthereumNode()
            node.sendTransaction(this.addressFrom, this.addressTo, this.amount, addressItem.password, (err, txId)=>{
                if(err){
                    return cb(err)
                }
                else{
                    const tx = new Transaction()
                    tx.txId = txId
                    tx.addressFrom = this.addressFrom
                    tx.addressTo = this.addressTo
                    tx.amount = this.amount
                    tx.type = TYPE.OUTPUT
                    tx.save((err, data)=>{
                        cb(err, data)
                    })
                }
            })
        })
    }
}