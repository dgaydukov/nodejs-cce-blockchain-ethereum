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

    get(){
        return new Promise((resolve, reject)=>{
            Address.findOne({address: {$regex: this.address, $options: 'i'}})
                .then(addressItem=>{
                    if(!addressItem){
                        throw new Error("Address doesn't exist")
                    }
                    return {
                        address: this.address,
                        balance: addressItem.balance,
                        tx: []
                    }
                })
                .then(addressInfo=>{
                    const txList = Transaction.find({$or: [
                            {addressFrom: {$regex: this.address, $options: 'i'}},
                            {addressTo: {$regex: this.address, $options: 'i'}}
                        ]
                    })
                    return Promise.all([addressInfo, txList]);
                })
                .then(data=>{
                    const [addressInfo, txList] = data
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
                })
                .then(addressInfo=>{
                    resolve(addressInfo)
                })
                .catch(ex=>{
                    reject(ex)
                })
        })
    }
}