
import {Address} from "@db/models/address"
import {EthereumNode} from "@blockchain/ethereumNode"

export class AddressGenerator {
    async getAddress(){
        const node = new EthereumNode()
        const password = Math.random().toString(36).slice(-8)
        const newAddress = await node.getNewAddress(password)
        const address = new Address({
            address: newAddress,
            password: password
        })
        const dbAddress = await address.save()
        return dbAddress
    }

    async updateKmId(id, kmId){
        const item = await Address.findOne({_id: id})
        if(item){
            item.kmId = kmId
            item.save()
        }
    }
}