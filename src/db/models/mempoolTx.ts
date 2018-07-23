
import mongoose = require("mongoose");
import { IMempoolTx } from "@db/interfaces/iMempoolTx";
import {connection} from "@db/connection"


export interface IMempoolTxModel extends IMempoolTx, mongoose.Document {
    //custom methods for your model would be defined here
}

export var MempoolTxSchema: mongoose.Schema = new mongoose.Schema({
    txId: String,
    status: Number,
});


export const MempoolTx: mongoose.Model<IMempoolTxModel> = connection.model<IMempoolTxModel>("MempoolTx", MempoolTxSchema);