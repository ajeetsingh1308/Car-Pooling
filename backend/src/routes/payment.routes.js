const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  getWalletBalance,
  addFundsToWallet,
  withdrawFunds,
  getTransactionHistory,
  getTransactionDetails,
  initiateRidePayment,
  completeRidePayment,
  requestRefund
} = require('../controllers/payment.controller');

// Import middleware
const { protect } = require('../middleware/auth');

// All routes in this file are protected
router.use(protect);

// Wallet routes
router.get('/wallet/balance', getWalletBalance);
router.post(
  '/wallet/add-funds',
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('paymentMethod').isIn(['card', 'upi', 'netbanking']).withMessage('Valid payment method is required'),
    body('paymentDetails').notEmpty().withMessage('Payment details are required')
  ],
  addFundsToWallet
);
router.post(
  '/wallet/withdraw',
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('bankDetails').notEmpty().withMessage('Bank details are required')
  ],
  withdrawFunds
);

// Transaction routes
router.get('/transactions', getTransactionHistory);
router.get('/transactions/:id', getTransactionDetails);

// Ride payment routes
router.post(
  '/ride/:rideId',
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('paymentMethod').isIn(['wallet', 'card', 'upi', 'netbanking', 'cash']).withMessage('Valid payment method is required')
  ],
  initiateRidePayment
);
router.put('/ride/:rideId/complete', completeRidePayment);
router.post(
  '/ride/:rideId/refund',
  [body('reason').notEmpty().withMessage('Refund reason is required')],
  requestRefund
);

module.exports = router;
