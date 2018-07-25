/**
 * Application enter point
 */


//require('look').start()
require('module-alias/register')


import express = require('express')
import {KafkaConnector} from "@kafka/kafkaConnector"

// import {EthereumNode} from "@blockchain/ethereumNode";
// const node = new EthereumNode()
//
// const promiseList = []
// for(let i = 0; i < 3; i++){
//     const password = (+new Date()).toString()
//     promiseList.push(node.getNewAddress(password))
// }
//
// promiseList.reduce((promise, func) =>{
//     console.log(promise, func)
//         return promise.then(result => func().then(Array.prototype.concat.bind(result)))
//     },
//     Promise.resolve()
// )
// .then(list=>{
//     console.log("list", list)
// })
//     .catch(ex=>{
//         console.log("ex", ex)
//     })

//node.getTotalBalance().then(balance=>{})

const app = express()
const port = process.env.PORT

const kc = new KafkaConnector()
kc.listen()

app.listen(port, (err) => {
    if (err) {
        return console.error(err)
    }
    console.log(`Listening http://127.0.0.1:${port}`)
})