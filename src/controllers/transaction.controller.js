const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")
const { resolve } = require("nodemailer/lib/shared/url.js")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {
    /**
     * @Validate_Request
     */
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;
    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
                message: "fromAccount, toAccount, amout and idempotencyKey required",
        })
    }
    
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })
    const toUserAccount = await accountModel.findOne({
        _id: toUserAccount,
    })

    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message:"Invalid fromAccount or toAccount."
        })
    }


    /**
     * @Validate_Idempotency_Key
     * @description Prevent faulty multiple transaction.
     */
    const isTransactionAlreadyExist = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(!isTransactionAlreadyExist){
        if(isTransactionAlreadyExist === "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already processed."
            })
        }
        if(isTransactionAlreadyExist === "PENDING"){
            return res.status(200).json({
                message: "Transaction is processing"
            })
        }
        if(isTransactionAlreadyExist === "FAILED"){
            return res.status(500).json({
                message: "Transaction processing failed"
            })
        }
        if(isTransactionAlreadyExist === "REVERSED"){
            return res.status(500).json({
                message: "Transaction was reversed, please try again"
            })
        }
    }


    /**
     * @Check_Account_Status
     * @description Transaction only should happens when both side of account is ACTIVE
     */

    if(!fromUserAccount.status === "ACTIVE" || !toUserAccount.status === "ACTIVE"){
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction."
        })
    }


    /**
     * @Drive_Sender_balance_from_ledger
     * @description Balance deducting accounts needs to be check if he has sufficient balance.
     * @useMehtod aggregation pipeline
     */

    const balance = await fromUserAccount.getBalance()

    if(balance < amount)[
        res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested balance is ${amount}.`
        })
    ]

    /**
     * @Create Transaction
     */
    try{
        const session = await mongoose.startSession();
        session.startTransaction();
        
        const transaction = await (transactionModel.create({
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        },{session}))[0]
        
        const debitLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }],{session}) 

        await (() =>{
            return new Promise((resolve)=>setTimeout(resolve, 10*1000));
        })

        const creditLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }],{session}) 
        
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id},
            { status: "COMPLETED" },
            { session }
        )
        await session.commitTransaction();
        session.endSession();
        
    }catch(error){
        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime",
        })
    }
    

    /**
     *@Send_Transaction_Email
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
    return res.status(201).json({
        message: "Transaction completed succeseefully.",
        transaction: transaction
    })
    
}

async function createInitialFundsTransaction(req, res){
    const { toAccount, amount, idempotencyKey } = req.body;

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required."
        })
    }
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })
    if(!toUserAccount){
        return res.status(400).json({
            message: "Account Invalid."
        })
    }

    const fromUserAccount = await accountModel.findOne({
        systemUser: true,
        user: req.user._id
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System user account not found!"
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }],{session})

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }],{session})

    transaction.status = "COMPLETED";
    await transaction.save({session});

    return res.status(201).json({
        message: "Initial funds transaction completed successfully.",
        transaction: transaction
    })



}

module.exports ={createTransaction, createInitialFundsTransaction};