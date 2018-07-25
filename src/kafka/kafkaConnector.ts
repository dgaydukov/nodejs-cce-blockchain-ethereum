
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

        KafkaMessage.find({})
            .then(data=>{
                const hashList = {}
                data.map(item=>{
                    hashList[item.hash] = 1
                })
                return hashList
            })
            .then(hashList=>{
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
                    const hash = sha256(message.topic + message.value + message.offset)
                    if(hashList[hash]){
                        return
                    }
                    debug(`------------new kafka message------------`, JSON.stringify(message))
                    const km = new KafkaMessage(Object.assign({}, message, {hash: hash}))
                    km.save()
                        .then(kmData=>{
                            const msg = JSON.parse(message.value)
                            const response = Object.assign({}, msg)
                            switch(msg.metadata.methodName){
                                case METHOD_GET_ADDRESS:
                                    let gen = new AddressGenerator()
                                    gen.getAddress()
                                        .then((addressModel: any)=>{
                                            response.data.address = addressModel.address
                                            this.send(response, (kmId)=>{
                                                gen.updateKmId(addressModel._id, kmId)
                                            })
                                        })
                                        .catch(ex=>{
                                            response.error = {
                                                message: ex.toString()
                                            }
                                            this.send(response)
                                        })
                                    break;

                                case METHOD_SEND_TRANSACTION:
                                    let tx = new TransactionBuilder(msg.data.from, msg.data.to, msg.data.amount)
                                    tx.run()
                                        .then(txItem=>{
                                            response.data.txId = txItem.txId
                                            response.data.type = txItem.type
                                        })
                                        .catch(ex=>{
                                            response.error = {
                                                message: ex.toString()
                                            }
                                        })
                                        .finally(()=>{
                                            this.send(response)
                                        })
                                    break;



                                case METHOD_GET_ADDRESS_INFO:
                                    const addrInfo = new AddressInfo(msg.data.address)
                                    addrInfo.get()
                                        .then(addressInfo=>{
                                            Object.assign(response.data, addressInfo)
                                        })
                                        .catch(ex=>{
                                            response.error = {
                                                message: ex.toString()
                                            }
                                        })
                                        .finally(()=>{
                                            this.send(response)
                                        })
                                    break;

                                case METHOD_GET_TRANSACTION_INFO:
                                    const txInfo = new TransactionInfo(msg.data.txId)
                                    txInfo.get()
                                        .then(txInfo=>{
                                            Object.assign(response.data, txInfo)
                                        })
                                        .catch(ex=>{
                                            response.error = {
                                                message: ex.toString()
                                            }
                                        })
                                        .finally(()=>{
                                            this.send(response)
                                        })
                                    break;

                                default:
                                    response.error = {
                                        message: `unknown kafka request method: ${msg.metadata.methodName}`,
                                    }
                                    this.send(response)
                                    break;
                            }
                        })
                })
            })
            .catch(ex=>{
                debug(`Error on KafkaMessage.listen: ${ex}`)
            })
    }
}