
import {Address} from "@db/models/address"
import {EthereumNode} from "@blockchain/ethereumNode"

export class AddressGenerator {
    getAddress(cb){
        const node = new EthereumNode()
        const password = Math.random().toString(36).slice(-8)
        node.getNewAddress(password,(error, newAddress)=>{
            if(error){
                return cb(error)
            }
            const address = new Address()
            address.address = newAddress
            address.password = password
            address.save((err, data) => {
                cb(err, data)
            })
        })
    }
    updateKmId(id, kmId){
        Address.findOne({_id: id}, (err, item)=>{
            if(item){
                item.kmId = kmId
                item.save((err, data)=>{
                    //console.log(data)
                })
            }
        })
    }
}