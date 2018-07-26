/**
 * Application enter point
 */


//require('look').start()
require('module-alias/register')


import express = require('express')
import {KafkaConnector} from "@kafka/kafkaConnector"

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