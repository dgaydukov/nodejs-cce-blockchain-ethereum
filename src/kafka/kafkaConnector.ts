
import kafka = require('kafka-node')
const debug = require("debug")("kafka")
const sha256 = require("sha256")
import {default as config} from "@root/config.json"
import {AddressGenerator} from "@logic/addressGenerator"
import {TransactionBuilder} from "@logic/transactionBuilder"
import {AddressInfo} from "@logic/addressInfo"
import {TransactionInfo} from "@logic/transactionInfo"
import {KafkaMessage} from "@db/models/kafkaMessage"
import {METHOD_GET_ADDRESS,METHOD_SEND_TRANSACTION,METHOD_GET_ADDRESS_INFO,METHOD_GET_TRANSACTION_INFO} from "@root/constList"

interface iMessage{
    topic: string,
    value: string,
    offset: number,
    partition: number,
    key?: string,
    timestamp: Date,
}

export class KafkaConnector{
    client: kafka.Client;

    constructor(){
        this.client = new kafka.KafkaClient({kafkaHost: config.KAFKA_CONNECTION})
    }

    send(message: Object){
        return new Promise((resolve, reject)=>{
            const producer = new kafka.Producer(this.client);
            const payloads = [
                { topic: config.KAFKA_TOPIC_SEND, messages: [JSON.stringify(message)]},
            ];
            producer.send(payloads,  (err, data)=>{
                if(err){
                    return reject(err)
                }
                const messageId = data[config.KAFKA_TOPIC_SEND][0]
                debug(`kafkaMessageId: ${messageId}`, message)
                resolve(messageId)
            });
        })
    }

    async listen(){
        /**
         * for testing purpose you can clear message table
         * KafkaMessage.collection.drop()
         */

        const dbKmList = await KafkaMessage.find()
        const hashList = {}
        dbKmList.map(item=>{
            hashList[item.hash] = 1
        })
        const consumer = new kafka.Consumer(
            this.client,
            [
                { topic: config.KAFKA_TOPIC_LISTEN, partition: 0},
            ],
            {
                autoCommit: false,
                fromOffset: true,
            }
        )
        consumer.on('message', async (message: iMessage)=>{
            try{
                const hash = sha256(message.topic + message.value + message.offset)
                if(hashList[hash]){
                    return
                }
                debug(`------------new kafka message------------`, JSON.stringify(message))
                const km = new KafkaMessage(Object.assign({}, message, {hash: hash}))
                km.save()
                const msg = JSON.parse(message.value)
                const response = Object.assign({}, msg)
                switch(msg.metadata.methodName){
                    case METHOD_GET_ADDRESS:
                        let gen = new AddressGenerator()
                        const dbAddress = await gen.getAddress()
                        response.data.address = dbAddress.address
                        const kmId = await this.send(response)
                        gen.updateKmId(dbAddress._id, kmId)
                        break;

                    case METHOD_SEND_TRANSACTION:
                        let tx = new TransactionBuilder(msg.data.from, msg.data.to, msg.data.amount)
                        const dbTx = await tx.run()
                        response.data.txId = dbTx.txId
                        response.data.type = dbTx.type
                        this.send(response)
                        break;

                    case METHOD_GET_ADDRESS_INFO:
                        const addrInfo = new AddressInfo(msg.data.address)
                        const addressInfo = await addrInfo.get()
                        Object.assign(response.data, addressInfo)
                        this.send(response)
                        break;

                    case METHOD_GET_TRANSACTION_INFO:
                        const txInfo = new TransactionInfo(msg.data.txId)
                        const _dbTx = await txInfo.get()
                        Object.assign(response.data, _dbTx)
                        this.send(response)
                        break;

                    default:
                        response.error = {
                            message: `unknown kafka request method: ${msg.metadata.methodName}`,
                        }
                        this.send(response)
                        break;
                }
            }
            catch (ex) {
                debug(`Error on KafkaConnector.listen: ${ex}`)
            }
        })
    }
}