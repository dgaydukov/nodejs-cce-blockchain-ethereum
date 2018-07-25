/**
 * Return information about transaction
 */

import {Promise} from "bluebird"
import {Transaction} from "@db/models/transaction"

export class TransactionInfo{
    txId: string;

    constructor(txId){
        this.txId = txId
    }

    get(){
        return new Promise((resolve, reject)=>{
            Transaction.findOne({txId: this.txId})
                .then(tx=> {
                    if(!tx){
                        throw new Error("Transaction doesn't exist")
                    }
                    return {
                        txId: tx.txId,
                        confirmationNumber: tx.confirmationNumber,
                        blockNumber: tx.blockNumber,
                        addressFrom: tx.addressFrom,
                        addressTo: tx.addressTo,
                        amount: tx.amount,
                        type: tx.type,
                    }
                })
                .then(txInfo=>{
                    resolve(txInfo)
                })
                .catch(ex=>{
                    reject(ex)
                })
        })
    }
}