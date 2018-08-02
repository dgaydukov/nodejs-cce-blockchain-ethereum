
import {Address} from "@db/models/address"
import {EthereumNode} from "@blockchain/ethereumNode"

export class AddressGenerator {
    async getAddress(){
        const node = new EthereumNode()
        const password = Math.random().toString(36).slice(-8)
        const newAddress = await node.getNewAddress(password)
        const dbAddress = new Address({
            address: newAddress,
            password: password
        })
        return dbAddress.save()
    }

    async updateKmId(id, kmId){
        const item = await Address.findOne({_id: id})
        if(item){
            item.kmId = kmId
            item.save()
        }
    }
}