const User = require('../models/user.model');
const Ride = require('../models/ride.model');
const Transaction = require('../models/transaction.model');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');

// @desc    Get wallet balance
// @route   GET /api/payments/wallet/balance
// @access  Private
exports.getWalletBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        balance: user.wallet.balance,
        currency: 'INR'
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add funds to wallet
// @route   POST /api/payments/wallet/add-funds
// @access  Private
exports.addFundsToWallet = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { amount, paymentMethod, paymentDetails } = req.body;
    
    // TODO: Integrate with payment gateway
    
    // Create transaction
    const transaction = await Transaction.create({
      sender: req.user.id,
      receiver: req.user.id,
      amount,
      currency: 'INR',
      type: 'wallet_topup',
      status: 'completed',
      paymentMethod,
      paymentDetails,
      description: 'Wallet top-up'
    });
    
    // Update user wallet
    const user = await User.findById(req.user.id);
    user.wallet.balance += amount;
    user.wallet.transactions.push(transaction._id);
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: user.wallet.balance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Withdraw funds from wallet
// @route   POST /api/payments/wallet/withdraw
// @access  Private
exports.withdrawFunds = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { amount, bankDetails } = req.body;
    
    // Check if user has enough balance
    const user = await User.findById(req.user.id);
    
    if (user.wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // TODO: Integrate with payment gateway for withdrawal
    
    // Create transaction
    const transaction = await Transaction.create({
      sender: req.user.id,
      receiver: req.user.id,
      amount,
      currency: 'INR',
      type: 'wallet_withdrawal',
      status: 'pending',
      paymentMethod: 'bank_transfer',
      paymentDetails: bankDetails,
      description: 'Wallet withdrawal'
    });
    
    // Update user wallet
    user.wallet.balance -= amount;
    user.wallet.transactions.push(transaction._id);
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: user.wallet.balance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transaction history
// @route   GET /api/payments/transactions
// @access  Private
exports.getTransactionHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const transactions = await Transaction.find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id }
      ]
    })
      .populate('sender', 'firstName lastName profilePicture')
      .populate('receiver', 'firstName lastName profilePicture')
      .populate('ride', 'startLocation endLocation departureTime')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await Transaction.countDocuments({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id }
      ]
    });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transaction details
// @route   GET /api/payments/transactions/:id
// @access  Private
exports.getTransactionDetails = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('receiver', 'firstName lastName profilePicture')
      .populate('ride', 'startLocation endLocation departureTime');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check if user is sender or receiver
    if (
      transaction.sender.toString() !== req.user.id &&
      transaction.receiver.toString() !== req.user.id
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Initiate ride payment
// @route   POST /api/payments/ride/:rideId
// @access  Private
exports.initiateRidePayment = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { amount, paymentMethod } = req.body;
    const { rideId } = req.params;
    
    // Find the ride
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if user is a passenger in the ride
    const passengerIndex = ride.passengers.findIndex(
      p => p.user.toString() === req.user.id && p.status === 'accepted'
    );
    
    if (passengerIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'You are not a passenger in this ride'
      });
    }
    
    // Check if payment is already made
    if (ride.passengers[passengerIndex].fare && ride.passengers[passengerIndex].fare.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already made for this ride'
      });
    }
    
    let transaction;
    
    if (paymentMethod === 'wallet') {
      // Check if user has enough balance
      const user = await User.findById(req.user.id);
      
      if (user.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
      
      // Create transaction
      transaction = await Transaction.create({
        sender: req.user.id,
        receiver: ride.driver,
        ride: rideId,
        amount,
        currency: 'INR',
        type: 'ride_payment',
        status: 'completed',
        paymentMethod: 'wallet',
        description: 'Ride payment'
      });
      
      // Update passenger wallet
      user.wallet.balance -= amount;
      user.wallet.transactions.push(transaction._id);
      await user.save();
      
      // Update driver wallet
      const driver = await User.findById(ride.driver);
      driver.wallet.balance += amount;
      driver.wallet.transactions.push(transaction._id);
      await driver.save();
      
      // Update ride payment status
      ride.passengers[passengerIndex].fare = {
        amount,
        currency: 'INR',
        status: 'paid'
      };
      await ride.save();
      
      // Create notification for driver
      await Notification.create({
        recipient: ride.driver,
        sender: req.user.id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You received a payment of ₹${amount} from ${req.user.firstName} ${req.user.lastName}`,
        ride: rideId,
        transaction: transaction._id
      });
    } else {
      // For other payment methods
      // TODO: Integrate with payment gateway
      
      // Create transaction
      transaction = await Transaction.create({
        sender: req.user.id,
        receiver: ride.driver,
        ride: rideId,
        amount,
        currency: 'INR',
        type: 'ride_payment',
        status: 'pending',
        paymentMethod,
        description: 'Ride payment'
      });
      
      // Update ride payment status
      ride.passengers[passengerIndex].fare = {
        amount,
        currency: 'INR',
        status: 'pending'
      };
      await ride.save();
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete ride payment
// @route   PUT /api/payments/ride/:rideId/complete
// @access  Private
exports.completeRidePayment = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { transactionId } = req.body;
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check if user is the sender
    if (transaction.sender.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to complete this transaction'
      });
    }
    
    // Check if transaction is pending
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${transaction.status}`
      });
    }
    
    // Update transaction status
    transaction.status = 'completed';
    await transaction.save();
    
    // Find the ride
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Update ride payment status
    const passengerIndex = ride.passengers.findIndex(
      p => p.user.toString() === req.user.id
    );
    
    if (passengerIndex !== -1) {
      ride.passengers[passengerIndex].fare.status = 'paid';
      await ride.save();
    }
    
    // Update driver wallet
    const driver = await User.findById(ride.driver);
    driver.wallet.balance += transaction.amount;
    driver.wallet.transactions.push(transaction._id);
    await driver.save();
    
    // Create notification for driver
    await Notification.create({
      recipient: ride.driver,
      sender: req.user.id,
      type: 'payment_received',
      title: 'Payment Received',
      message: `You received a payment of ₹${transaction.amount} from ${req.user.firstName} ${req.user.lastName}`,
      ride: rideId,
      transaction: transaction._id
    });
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request refund
// @route   POST /api/payments/ride/:rideId/refund
// @access  Private
exports.requestRefund = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    
    // Find the ride
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if user is a passenger in the ride
    const passengerIndex = ride.passengers.findIndex(
      p => p.user.toString() === req.user.id && p.status === 'accepted'
    );
    
    if (passengerIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'You are not a passenger in this ride'
      });
    }
    
    // Check if payment is made
    if (!ride.passengers[passengerIndex].fare || ride.passengers[passengerIndex].fare.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No payment found for this ride'
      });
    }
    
    // Find the transaction
    const transaction = await Transaction.findOne({
      sender: req.user.id,
      receiver: ride.driver,
      ride: rideId,
      type: 'ride_payment',
      status: 'completed'
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Create refund transaction
    const refundTransaction = await Transaction.create({
      sender: ride.driver,
      receiver: req.user.id,
      ride: rideId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: 'refund',
      status: 'pending',
      paymentMethod: transaction.paymentMethod,
      description: `Refund for ride. Reason: ${reason}`
    });
    
    // Create notification for driver
    await Notification.create({
      recipient: ride.driver,
      sender: req.user.id,
      type: 'refund_requested',
      title: 'Refund Requested',
      message: `${req.user.firstName} ${req.user.lastName} has requested a refund of ₹${transaction.amount}. Reason: ${reason}`,
      ride: rideId,
      transaction: refundTransaction._id
    });
    
    res.status(200).json({
      success: true,
      data: refundTransaction
    });
  } catch (err) {
    next(err);
  }
};
