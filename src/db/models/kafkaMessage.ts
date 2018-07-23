

import mongoose = require("mongoose");
import { IKafkaMessage } from "@db/interfaces/iKafkaMessage"
import {connection} from "@db/connection"


export interface IKafkaMessageModel extends IKafkaMessage, mongoose.Document {
    //custom methods for your model would be defined here
}

const KafkaMessageSchema: mongoose.Schema = new mongoose.Schema({
    topic: String,
    value: String,
    offset: Number,
    partition: Number,
    highWaterOffset: Number,
    key: String,
    timestamp: Date,
    hash: String,
});

export const KafkaMessage: mongoose.Model<IKafkaMessageModel> = connection.model<IKafkaMessageModel>("KafkaMessage", KafkaMessageSchema);