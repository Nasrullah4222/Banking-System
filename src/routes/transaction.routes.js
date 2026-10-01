const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router()

/**
 * @POST /api/transaction/
 * @description Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);

transactionRoutes.post("", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);