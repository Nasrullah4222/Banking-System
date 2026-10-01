const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    fromAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        require: [true, "Transaction must be associated with from account."],
        index: true
    },
    toAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with to account."],
        index: true
    },
    status:{
        type: String,
        enum:{
            value:["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED."
        },
    },
    amount:{
        type:Number,
        required: [true, "Ammount is required for creating transaction."],
        min: [0, "Transaction amout cannot be negative."]
    },
    idempotencyKey:{
        type: String,
        required: [true, "Idempotency Key is required to create a transaction"],
        index: true,
        unique: true
    }
},{timestamps: true})