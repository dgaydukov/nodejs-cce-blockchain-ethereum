/**
 * Application entry point
 */

require('module-alias/register')
const {promisify} = require('util');
import express = require('express')
import {KafkaConnector} from "@kafka/kafkaConnector"

const app = express()
const port = process.env.PORT
const kc = new KafkaConnector()
kc.listen()

promisify(app.listen)(port)
    .then(()=>{
        console.log(`Listening http://127.0.0.1:${port}`)
    })
    .catch(ex=>{
        console.log(`error: ${ex}`)
    })