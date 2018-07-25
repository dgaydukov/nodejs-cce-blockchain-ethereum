/**
 * Build and execute transaction
 *
 */

import {Promise} from "bluebird"
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

    run(){
        return new Promise((resolve, reject)=>{
            Address.findOne({address: {$regex: this.addressFrom, $options: 'i'}})
                .then(addressItem=>{
                    if(!addressItem){
                        throw new Error("Address doesn't exist")
                    }
                    if(addressItem.balance < this.amount){
                        throw new Error(`Not enough money, account balance is: ${addressItem.balance}`)
                    }
                    const node = new EthereumNode()
                    return node.sendTransaction(this.addressFrom, this.addressTo, this.amount, addressItem.password)
                })
                .then(receipt=>{
                    const tx = new Transaction({
                        txId: receipt.transactionHash,
                        addressFrom: this.addressFrom,
                        addressTo: this.addressTo,
                        amount: this.amount,
                        type: TYPE.OUTPUT
                    })
                    return tx.save()
                })
                .then(txItem=>{
                    resolve(txItem)
                })
                .catch(ex=>{
                    reject(ex)
                })
        })
    }
}