const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  getUserProfile,
  updateUserProfile,
  updateVehicleDetails,
  updatePreferences,
  addEmergencyContact,
  removeEmergencyContact,
  uploadVerificationDocuments,
  addFrequentRoute,
  updateFrequentRoute,
  deleteFrequentRoute,
  getUserRatings,
  submitRating,
  getNotifications,
  markNotificationAsRead,
  getEnvironmentalImpact
} = require('../controllers/user.controller');

// Import middleware
const { protect } = require('../middleware/auth');

// All routes in this file are protected
router.use(protect);

// User profile routes
router.get('/profile', getUserProfile);
router.put(
  '/profile',
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phoneNumber').optional().notEmpty().withMessage('Phone number cannot be empty')
  ],
  updateUserProfile
);

// Vehicle routes
router.put(
  '/vehicle',
  [
    body('make').notEmpty().withMessage('Vehicle make is required'),
    body('model').notEmpty().withMessage('Vehicle model is required'),
    body('year').isNumeric().withMessage('Year must be a number'),
    body('color').notEmpty().withMessage('Vehicle color is required'),
    body('licensePlate').notEmpty().withMessage('License plate is required'),
    body('capacity').isNumeric().withMessage('Capacity must be a number'),
    body('fuelType').isIn(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG']).withMessage('Invalid fuel type'),
    body('fuelEfficiency').isNumeric().withMessage('Fuel efficiency must be a number')
  ],
  updateVehicleDetails
);

// Preferences routes
router.put('/preferences', updatePreferences);

// Emergency contact routes
router.post(
  '/emergency-contacts',
  [
    body('name').notEmpty().withMessage('Contact name is required'),
    body('relationship').notEmpty().withMessage('Relationship is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required')
  ],
  addEmergencyContact
);
router.delete('/emergency-contacts/:id', removeEmergencyContact);

// Verification routes
router.post('/verification-documents', uploadVerificationDocuments);

// Frequent routes
router.post(
  '/frequent-routes',
  [
    body('name').notEmpty().withMessage('Route name is required'),
    body('startLocation.address').notEmpty().withMessage('Start address is required'),
    body('startLocation.location.coordinates').isArray().withMessage('Start coordinates are required'),
    body('endLocation.address').notEmpty().withMessage('End address is required'),
    body('endLocation.location.coordinates').isArray().withMessage('End coordinates are required'),
    body('schedule').isArray().withMessage('Schedule is required')
  ],
  addFrequentRoute
);
router.put('/frequent-routes/:id', updateFrequentRoute);
router.delete('/frequent-routes/:id', deleteFrequentRoute);

// Ratings routes
router.get('/ratings', getUserRatings);
router.post(
  '/ratings',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('rideId').notEmpty().withMessage('Ride ID is required'),
    body('role').isIn(['driver', 'passenger']).withMessage('Role must be driver or passenger'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional()
  ],
  submitRating
);

// Notification routes
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);

// Environmental impact routes
router.get('/environmental-impact', getEnvironmentalImpact);

module.exports = router;
