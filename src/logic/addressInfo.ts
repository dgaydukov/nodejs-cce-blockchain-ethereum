/**
 * Return information about address and it transactions
 */

import {Promise} from "bluebird"
import {Address} from "@db/models/address"
import {Transaction} from "@db/models/transaction"


export class AddressInfo{
    address: string;

    constructor(address){
        this.address = address
    }

    async get(){
        const dbAddress = await Address.findOne({address: {$regex: this.address, $options: 'i'}})
        if(!dbAddress){
            throw new Error("Address doesn't exist")
        }
        const addressInfo = {
            address: this.address,
            balance: dbAddress.balance,
            tx: []
        }
        const txList = await Transaction.find({$or: [
                {addressFrom: {$regex: this.address, $options: 'i'}},
                {addressTo: {$regex: this.address, $options: 'i'}}
            ]
        })
        txList.map(tx=> {
            addressInfo.tx.push({
                txId: tx.txId,
                confirmationNumber: tx.confirmationNumber,
                blockNumber: tx.blockNumber,
                addressFrom: tx.addressFrom,
                addressTo: tx.addressTo,
                amount: tx.amount,
                fee: tx.fee,
                type: tx.type,
            })
        })
        return addressInfo
    }
}