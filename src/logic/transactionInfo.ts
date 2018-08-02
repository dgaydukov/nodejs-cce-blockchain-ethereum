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

    async get(){
        const dbTx = await Transaction.findOne({txId: this.txId})
        if(!dbTx){
            throw new Error("Transaction doesn't exist")
        }
        return dbTx
    }
}