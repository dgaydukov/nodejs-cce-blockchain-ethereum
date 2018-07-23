

import mongoose = require("mongoose");
import { IAddress } from "@db/interfaces/iAddress"
import {connection} from "@db/connection"


export interface IAddressModel extends IAddress, mongoose.Document {
    //custom methods for your model would be defined here
}

const AddressSchema: mongoose.Schema = new mongoose.Schema({
    address: String,
    confirmationNumber: Number,
    password: String,
    pkey: String,
    hash: String,
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now},
    kmId: Number,
});

export const Address: mongoose.Model<IAddressModel> = connection.model<IAddressModel>("Address", AddressSchema);