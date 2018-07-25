
import {Address} from "@db/models/address"
import {EthereumNode} from "@blockchain/ethereumNode"

export class AddressGenerator {
    getAddress(){
        const node = new EthereumNode()
        const password = Math.random().toString(36).slice(-8)
        return new Promise((resolve, reject) => {
            node.getNewAddress(password)
                .then(newAddress=>{
                    const address = new Address()
                    address.address = newAddress
                    address.password = password
                    return address.save()
                })
                .then(addressModel=>{
                    resolve(addressModel)
                })
                .catch(ex=>{
                    reject(ex)
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