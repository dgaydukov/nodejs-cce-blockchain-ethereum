
import mongoose = require("mongoose");
import { ITransaction } from "@db/interfaces/iTransaction";
import {connection} from "@db/connection"


export interface ITransactionModel extends ITransaction, mongoose.Document {
    //custom methods for your model would be defined here
}
const TransactionSchema: mongoose.Schema = new mongoose.Schema({
    txId: String,
    addressFrom: String,
    addressTo: String,
    amount: Number,
    fee: Number,
    datetime: { type: Date, default: Date.now},
    confirmationNumber: { type: Number, default: 0},
    blockNumber: { type: Number, default: 0},
    type: Number,
});

export const TYPE = {
    INPUT: 1,
    OUTPUT: 2,
}

export const Transaction: mongoose.Model<ITransactionModel> = connection.model<ITransactionModel>("Transaction", TransactionSchema);