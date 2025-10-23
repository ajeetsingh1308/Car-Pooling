const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  createRide,
  getRide,
  updateRide,
  deleteRide,
  searchRides,
  requestRide,
  respondToRideRequest,
  cancelRideRequest,
  startRide,
  completeRide,
  cancelRide,
  updateRideLocation,
  getRidesByUser,
  getRecurringRides,
  sendSafetyAlert
} = require('../controllers/ride.controller');

// Import middleware
const { protect } = require('../middleware/auth');

// All routes in this file are protected
router.use(protect);

// Ride CRUD operations
router.post(
  '/',
  [
    body('startLocation.address').notEmpty().withMessage('Start address is required'),
    body('startLocation.location.coordinates').isArray().withMessage('Start coordinates are required'),
    body('endLocation.address').notEmpty().withMessage('End address is required'),
    body('endLocation.location.coordinates').isArray().withMessage('End coordinates are required'),
    body('departureTime').isISO8601().withMessage('Valid departure time is required'),
    body('availableSeats').isInt({ min: 1 }).withMessage('Available seats must be at least 1'),
    body('fare.perKm').isNumeric().withMessage('Fare per km is required')
  ],
  createRide
);
router.get('/:id', getRide);
router.put('/:id', updateRide);
router.delete('/:id', deleteRide);

// Search rides
router.get('/', searchRides);

// Ride requests
router.post(
  '/:id/request',
  [
    body('pickupLocation.address').notEmpty().withMessage('Pickup address is required'),
    body('pickupLocation.location.coordinates').isArray().withMessage('Pickup coordinates are required'),
    body('dropoffLocation.address').notEmpty().withMessage('Dropoff address is required'),
    body('dropoffLocation.location.coordinates').isArray().withMessage('Dropoff coordinates are required')
  ],
  requestRide
);
router.put(
  '/:id/request/:userId',
  [body('status').isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected')],
  respondToRideRequest
);
router.delete('/:id/request', cancelRideRequest);

// Ride status updates
router.put('/:id/start', startRide);
router.put('/:id/complete', completeRide);
router.put(
  '/:id/cancel',
  [body('reason').notEmpty().withMessage('Cancellation reason is required')],
  cancelRide
);

// Real-time tracking
router.put(
  '/:id/location',
  [
    body('location.coordinates').isArray().withMessage('Location coordinates are required'),
    body('location.coordinates.0').isNumeric().withMessage('Longitude must be a number'),
    body('location.coordinates.1').isNumeric().withMessage('Latitude must be a number')
  ],
  updateRideLocation
);

// User rides
router.get('/user/driver', getRidesByUser);
router.get('/user/passenger', getRidesByUser);

// Recurring rides
router.get('/recurring/all', getRecurringRides);

// Safety alerts
router.post(
  '/:id/safety-alert',
  [
    body('alertType').isIn(['emergency', 'delay', 'detour', 'other']).withMessage('Valid alert type is required'),
    body('message').notEmpty().withMessage('Alert message is required')
  ],
  sendSafetyAlert
);

module.exports = router;
