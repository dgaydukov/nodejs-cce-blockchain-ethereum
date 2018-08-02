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

    async run(){
        const dbAddress = await Address.findOne({address: {$regex: this.addressFrom, $options: 'i'}})
        if(!dbAddress){
            throw new Error("Address doesn't exist")
        }
        if(dbAddress.balance < this.amount){
            throw new Error(`Not enough money, account balance is: ${dbAddress.balance}`)
        }
        const node = new EthereumNode()
        const tx = await node.sendTransaction(this.addressFrom, this.addressTo, this.amount, dbAddress.password)
        const dbTx = new Transaction({
            txId: tx.transactionHash,
            addressFrom: this.addressFrom,
            addressTo: this.addressTo,
            amount: this.amount,
            type: TYPE.OUTPUT
        })
        const data = dbTx.save()
        return data
    }
}