

import mongoose = require("mongoose");
import { ILatestBlock } from "@db/interfaces/iLatestBlock";
import {connection} from "@db/connection"


export interface IILatestBlockModel extends ILatestBlock, mongoose.Document {
    //custom methods for your model would be defined here
}

const LatestBlockSchema: mongoose.Schema = new mongoose.Schema({
    blockNumber: Number,
});

export const LatestBlock: mongoose.Model<IILatestBlockModel> = connection.model<IILatestBlockModel>("LatestBlock", LatestBlockSchema);