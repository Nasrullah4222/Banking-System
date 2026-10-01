const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controllers")

const router = express.Router();

/**
 * @description Create a new accounts
 * @POST /api/accounts/
 * @protected
 */
router.post("/accounts", authMiddleware.authMiddleware, accountController.createAccountController );

/**
 * @description fetch all acccounts
 * @GET /api/accounts/balance/:accountId
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController)

module.exports = router;