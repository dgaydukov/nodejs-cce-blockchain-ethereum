
import kafka = require('kafka-node')
const debug = require("debug")("kafka")
const sha256 = require("sha256")
import {default as config} from "@root/config.json"
import {AddressGenerator} from "@logic/addressGenerator"
import {TransactionBuilder} from "@logic/transactionBuilder"
import {AddressInfo} from "@logic/addressInfo"
import {TransactionInfo} from "@logic/transactionInfo"
import {KafkaMessage} from "@db/models/kafkaMessage"


const METHOD_GET_ADDRESS = "getAddress"
const METHOD_SEND_TRANSACTION = "sendTransaction"
const METHOD_GET_ADDRESS_INFO = "getAddressInfo"
const METHOD_GET_TRANSACTION_INFO = "getTransactionInfo"

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

    send(message: Object, cb = null){
        const producer = new kafka.Producer(this.client);
        const payloads = [
            { topic: config.KAFKA_TOPIC_SEND, messages: [JSON.stringify(message)]},
        ];
        producer.send(payloads,  (err, data)=>{
            const messageId = data[config.KAFKA_TOPIC_SEND][0]
            debug(`kafkaMessageId: ${messageId}`, message)
            if(cb){
                cb(messageId)
            }
        });
    }

    listen(){
        /**
         * for testing purpose you can clear message table
         * KafkaMessage.collection.drop()
         */

        KafkaMessage.find({}, (err, data)=>{
            const hashList = {}
            data.map(item=>{
                hashList[item.hash] = 1
            })
            runListener(hashList)
        })


        const runListener = (hashList)=>{
            const consumer = new kafka.Consumer(
                this.client,
                [
                    { topic: config.KAFKA_TOPIC_LISTEN, partition: 0},
                ],
                {
                    autoCommit: false,
                    fromOffset: true,
                }
            );
            consumer.on('message', (message: iMessage)=>{
                const hash = sha256(message.topic+message.value+message.offset)
                if(hashList[hash]){
                    return
                }
                debug(`------------new kafka message------------`, JSON.stringify(message))
                const cb = () => {
                    const km = new KafkaMessage(Object.assign({}, message, {hash: hash}))
                    km.save((err, data)=>{
                    })
                }
                try{
                    const msg = JSON.parse(message.value)
                    const response = Object.assign({}, msg)
                    const data = response.data
                    switch(msg.metadata.methodName){
                        case METHOD_GET_ADDRESS:
                            let gen = new AddressGenerator()
                            gen.getAddress((err, addressItem)=>{
                                if(err){
                                    response.error = {
                                        message: err.message
                                    }
                                    this.send(response)
                                }
                                else{
                                    data.address = addressItem.address
                                    this.send(response, (kmId)=>{
                                        gen.updateKmId(addressItem._id, kmId)
                                    })
                                }
                                cb()
                            })
                            break;

                        case METHOD_SEND_TRANSACTION:
                            let tx = new TransactionBuilder(msg.data.from, msg.data.to, msg.data.amount)
                            tx.run((err, tx)=>{
                                if(err){
                                    response.error = {
                                        message: err.message
                                    }
                                }
                                else{
                                    data.txId = tx.txId
                                    data.type = tx.type
                                }
                                cb()
                                this.send(response)
                            })
                            break;



                        case METHOD_GET_ADDRESS_INFO:
                            const addrInfo = new AddressInfo(msg.data.address)
                            addrInfo.get((err, item)=>{
                                if(err){
                                    response.error = {
                                        message: err.toString()
                                    }
                                }
                                else{
                                    response.data = Object.assign({}, data, item)
                                }
                                cb()
                                this.send(response)
                            })
                            break;

                        case METHOD_GET_TRANSACTION_INFO:
                            const txInfo = new TransactionInfo(msg.data.txId)
                            txInfo.get((err, item)=>{
                                if(err){
                                    response.error = {
                                        message: err.toString()
                                    }
                                }
                                else{
                                    response.data = Object.assign({}, data, item)
                                }
                                cb()
                                this.send(response)
                            })
                            break;

                        default:
                            response.error = {
                                message: `unknown kafka request method: ${msg.metadata.methodName}`,
                            }
                            cb()
                            this.send(response)
                            break;
                    }
                }
                catch(e){
                    debug(`kafka input message error: ${e.message}`)
                    cb()
                }
            });
        }

    }
}