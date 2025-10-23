const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      homeAddress: req.body.homeAddress,
      workAddress: req.body.workAddress,
      settings: req.body.settings
    };
    
    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update vehicle details
// @route   PUT /api/users/vehicle
// @access  Private
exports.updateVehicleDetails = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { vehicle: req.body },
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: user.vehicle
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updatePreferences = async (req, res, next) => {
  try {
    const { driverPreferences, passengerPreferences } = req.body;
    
    const fieldsToUpdate = {};
    
    if (driverPreferences) {
      fieldsToUpdate.driverPreferences = driverPreferences;
    }
    
    if (passengerPreferences) {
      fieldsToUpdate.passengerPreferences = passengerPreferences;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        driverPreferences: user.driverPreferences,
        passengerPreferences: user.passengerPreferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add emergency contact
// @route   POST /api/users/emergency-contacts
// @access  Private
exports.addEmergencyContact = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const user = await User.findById(req.user.id);
    
    user.emergencyContacts.push(req.body);
    await user.save();
    
    res.status(201).json({
      success: true,
      data: user.emergencyContacts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove emergency contact
// @route   DELETE /api/users/emergency-contacts/:id
// @access  Private
exports.removeEmergencyContact = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Find the contact index
    const contactIndex = user.emergencyContacts.findIndex(
      contact => contact._id.toString() === req.params.id
    );
    
    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    // Remove the contact
    user.emergencyContacts.splice(contactIndex, 1);
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user.emergencyContacts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload verification documents
// @route   POST /api/users/verification-documents
// @access  Private
exports.uploadVerificationDocuments = async (req, res, next) => {
  try {
    // TODO: Implement file upload logic
    
    const user = await User.findById(req.user.id);
    
    // Add document paths to user
    if (req.body.documents && Array.isArray(req.body.documents)) {
      user.verificationDocuments = [
        ...user.verificationDocuments,
        ...req.body.documents
      ];
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user.verificationDocuments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add frequent route
// @route   POST /api/users/frequent-routes
// @access  Private
exports.addFrequentRoute = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const user = await User.findById(req.user.id);
    
    user.frequentRoutes.push(req.body);
    await user.save();
    
    res.status(201).json({
      success: true,
      data: user.frequentRoutes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update frequent route
// @route   PUT /api/users/frequent-routes/:id
// @access  Private
exports.updateFrequentRoute = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Find the route index
    const routeIndex = user.frequentRoutes.findIndex(
      route => route._id.toString() === req.params.id
    );
    
    if (routeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Update the route
    user.frequentRoutes[routeIndex] = {
      ...user.frequentRoutes[routeIndex].toObject(),
      ...req.body
    };
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user.frequentRoutes[routeIndex]
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete frequent route
// @route   DELETE /api/users/frequent-routes/:id
// @access  Private
exports.deleteFrequentRoute = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Find the route index
    const routeIndex = user.frequentRoutes.findIndex(
      route => route._id.toString() === req.params.id
    );
    
    if (routeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Remove the route
    user.frequentRoutes.splice(routeIndex, 1);
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user.frequentRoutes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user ratings
// @route   GET /api/users/ratings
// @access  Private
exports.getUserRatings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'reviews.reviewer',
      select: 'firstName lastName profilePicture'
    });
    
    res.status(200).json({
      success: true,
      data: {
        rating: user.rating,
        reviews: user.reviews
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit rating for another user
// @route   POST /api/users/ratings
// @access  Private
exports.submitRating = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { userId, rideId, role, rating, comment } = req.body;
    
    // Find the user to rate
    const userToRate = await User.findById(userId);
    
    if (!userToRate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add the review
    userToRate.reviews.push({
      reviewer: req.user.id,
      role,
      rating,
      comment,
      date: Date.now()
    });
    
    // Update the average rating
    if (role === 'driver') {
      const driverRatings = userToRate.reviews.filter(r => r.role === 'driver');
      const totalRating = driverRatings.reduce((sum, r) => sum + r.rating, 0);
      userToRate.rating.asDriver.average = totalRating / driverRatings.length;
      userToRate.rating.asDriver.count = driverRatings.length;
    } else {
      const passengerRatings = userToRate.reviews.filter(r => r.role === 'passenger');
      const totalRating = passengerRatings.reduce((sum, r) => sum + r.rating, 0);
      userToRate.rating.asPassenger.average = totalRating / passengerRatings.length;
      userToRate.rating.asPassenger.count = passengerRatings.length;
    }
    
    await userToRate.save();
    
    // Create notification for the rated user
    await Notification.create({
      recipient: userId,
      sender: req.user.id,
      type: 'rating_received',
      title: 'New Rating Received',
      message: `You received a ${rating}-star rating from ${req.user.firstName} ${req.user.lastName}`,
      ride: rideId
    });
    
    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('sender', 'firstName lastName profilePicture');
    
    const total = await Notification.countDocuments({ recipient: req.user.id });
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get environmental impact
// @route   GET /api/users/environmental-impact
// @access  Private
exports.getEnvironmentalImpact = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user.environmentalImpact
    });
  } catch (err) {
    next(err);
  }
};
