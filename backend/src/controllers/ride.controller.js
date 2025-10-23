const Ride = require('../models/ride.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');

// @desc    Create a new ride
// @route   POST /api/rides
// @access  Private
exports.createRide = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Add user as driver
    req.body.driver = req.user.id;
    
    // Get vehicle details from user
    const user = await User.findById(req.user.id);
    req.body.vehicle = user.vehicle;
    
    // Create ride
    const ride = await Ride.create(req.body);
    
    // Add ride to user's rides as driver
    user.ridesAsDriver.push(ride._id);
    await user.save();
    
    res.status(201).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single ride
// @route   GET /api/rides/:id
// @access  Private
exports.getRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'firstName lastName profilePicture rating vehicle')
      .populate('passengers.user', 'firstName lastName profilePicture rating');
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a ride
// @route   PUT /api/rides/:id
// @access  Private
exports.updateRide = async (req, res, next) => {
  try {
    let ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this ride'
      });
    }
    
    // Don't allow updating if ride is in progress or completed
    if (ride.status === 'in_progress' || ride.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ride that is ${ride.status}`
      });
    }
    
    ride = await Ride.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    // Notify passengers about the update
    const passengers = ride.passengers.filter(p => p.status === 'accepted');
    
    for (const passenger of passengers) {
      await Notification.create({
        recipient: passenger.user,
        sender: req.user.id,
        type: 'ride_updated',
        title: 'Ride Updated',
        message: 'A ride you are part of has been updated',
        ride: ride._id
      });
    }
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a ride
// @route   DELETE /api/rides/:id
// @access  Private
exports.deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this ride'
      });
    }
    
    // Don't allow deleting if ride is in progress
    if (ride.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a ride that is in progress'
      });
    }
    
    // Notify passengers about the deletion
    const passengers = ride.passengers.filter(p => p.status === 'accepted');
    
    for (const passenger of passengers) {
      await Notification.create({
        recipient: passenger.user,
        sender: req.user.id,
        type: 'ride_cancelled',
        title: 'Ride Cancelled',
        message: 'A ride you were part of has been cancelled',
        ride: ride._id
      });
    }
    
    await ride.remove();
    
    // Remove ride from user's rides as driver
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { ridesAsDriver: ride._id }
    });
    
    // Remove ride from passengers' rides as passenger
    for (const passenger of passengers) {
      await User.findByIdAndUpdate(passenger.user, {
        $pull: { ridesAsPassenger: ride._id }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search for rides
// @route   GET /api/rides
// @access  Private
exports.searchRides = async (req, res, next) => {
  try {
    const {
      startLat,
      startLng,
      endLat,
      endLng,
      date,
      seats,
      maxDistance,
      preferences
    } = req.query;
    
    // Build query
    const query = {
      status: 'scheduled',
      departureTime: { $gte: new Date() },
      availableSeats: { $gte: seats || 1 }
    };
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.departureTime = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Add preferences filter if provided
    if (preferences) {
      const preferencesObj = JSON.parse(preferences);
      Object.keys(preferencesObj).forEach(key => {
        query[`preferences.${key}`] = preferencesObj[key];
      });
    }
    
    // Add location filter if coordinates provided
    if (startLat && startLng) {
      const maxDist = maxDistance || 5000; // Default 5km
      
      query['startLocation.location'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(startLng), parseFloat(startLat)]
          },
          $maxDistance: maxDist
        }
      };
    }
    
    if (endLat && endLng) {
      const maxDist = maxDistance || 5000; // Default 5km
      
      query['endLocation.location'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(endLng), parseFloat(endLat)]
          },
          $maxDistance: maxDist
        }
      };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const rides = await Ride.find(query)
      .populate('driver', 'firstName lastName profilePicture rating vehicle')
      .sort({ departureTime: 1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await Ride.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: rides.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: rides
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request to join a ride
// @route   POST /api/rides/:id/request
// @access  Private
exports.requestRide = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if user is the driver
    if (ride.driver.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request to join your own ride'
      });
    }
    
    // Check if user has already requested
    const existingRequest = ride.passengers.find(
      p => p.user.toString() === req.user.id
    );
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You have already requested to join this ride'
      });
    }
    
    // Check if ride is full
    if (ride.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This ride is full'
      });
    }
    
    // Add user to passengers
    ride.passengers.push({
      user: req.user.id,
      status: 'pending',
      pickupLocation: req.body.pickupLocation,
      dropoffLocation: req.body.dropoffLocation
    });
    
    await ride.save();
    
    // Create notification for driver
    await Notification.create({
      recipient: ride.driver,
      sender: req.user.id,
      type: 'ride_request',
      title: 'New Ride Request',
      message: `${req.user.firstName} ${req.user.lastName} has requested to join your ride`,
      ride: ride._id
    });
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Respond to ride request
// @route   PUT /api/rides/:id/request/:userId
// @access  Private
exports.respondToRideRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this ride'
      });
    }
    
    // Find the passenger request
    const passengerIndex = ride.passengers.findIndex(
      p => p.user.toString() === req.params.userId && p.status === 'pending'
    );
    
    if (passengerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Passenger request not found'
      });
    }
    
    // Update request status
    ride.passengers[passengerIndex].status = status;
    
    // If accepted, decrease available seats
    if (status === 'accepted') {
      ride.availableSeats -= 1;
      
      // Add ride to passenger's rides as passenger
      await User.findByIdAndUpdate(req.params.userId, {
        $push: { ridesAsPassenger: ride._id }
      });
    }
    
    await ride.save();
    
    // Create notification for passenger
    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: status === 'accepted' ? 'ride_accepted' : 'ride_rejected',
      title: status === 'accepted' ? 'Ride Request Accepted' : 'Ride Request Rejected',
      message: status === 'accepted'
        ? 'Your ride request has been accepted'
        : 'Your ride request has been rejected',
      ride: ride._id
    });
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel ride request
// @route   DELETE /api/rides/:id/request
// @access  Private
exports.cancelRideRequest = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Find the passenger request
    const passengerIndex = ride.passengers.findIndex(
      p => p.user.toString() === req.user.id
    );
    
    if (passengerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You have not requested to join this ride'
      });
    }
    
    // If request was accepted, increase available seats
    if (ride.passengers[passengerIndex].status === 'accepted') {
      ride.availableSeats += 1;
      
      // Remove ride from passenger's rides as passenger
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { ridesAsPassenger: ride._id }
      });
    }
    
    // Remove passenger from ride
    ride.passengers.splice(passengerIndex, 1);
    
    await ride.save();
    
    // Create notification for driver
    await Notification.create({
      recipient: ride.driver,
      sender: req.user.id,
      type: 'ride_cancelled',
      title: 'Ride Request Cancelled',
      message: `${req.user.firstName} ${req.user.lastName} has cancelled their ride request`,
      ride: ride._id
    });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start a ride
// @route   PUT /api/rides/:id/start
// @access  Private
exports.startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to start this ride'
      });
    }
    
    // Check if ride is already in progress or completed
    if (ride.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Ride is already ${ride.status}`
      });
    }
    
    // Update ride status
    ride.status = 'in_progress';
    ride.currentLocation = {
      location: ride.startLocation.location,
      updatedAt: Date.now()
    };
    
    await ride.save();
    
    // Notify accepted passengers
    const passengers = ride.passengers.filter(p => p.status === 'accepted');
    
    for (const passenger of passengers) {
      await Notification.create({
        recipient: passenger.user,
        sender: req.user.id,
        type: 'ride_started',
        title: 'Ride Started',
        message: 'Your ride has started',
        ride: ride._id
      });
    }
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete a ride
// @route   PUT /api/rides/:id/complete
// @access  Private
exports.completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to complete this ride'
      });
    }
    
    // Check if ride is in progress
    if (ride.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Ride must be in progress to complete, current status: ${ride.status}`
      });
    }
    
    // Update ride status
    ride.status = 'completed';
    ride.currentLocation = {
      location: ride.endLocation.location,
      updatedAt: Date.now()
    };
    
    await ride.save();
    
    // Update environmental impact for driver and passengers
    const driver = await User.findById(ride.driver);
    const passengers = ride.passengers.filter(p => p.status === 'accepted');
    
    // Calculate environmental impact
    const distance = ride.route.distance || 0;
    const fuelEfficiency = ride.vehicle.fuelEfficiency || 15; // Default: 15 km/l
    const passengerCount = passengers.length;
    
    // Calculate fuel saved (assuming each passenger would have used their own vehicle)
    const fuelSaved = (distance * passengerCount) / fuelEfficiency;
    
    // Calculate CO2 saved (average 2.3 kg CO2 per liter of fuel)
    const co2Saved = fuelSaved * 2.3;
    
    // Calculate trees equivalent (average tree absorbs 22 kg CO2 per year)
    const treesEquivalent = co2Saved / 22;
    
    // Update driver's environmental impact
    driver.environmentalImpact.co2Saved += co2Saved;
    driver.environmentalImpact.fuelSaved += fuelSaved;
    driver.environmentalImpact.treesEquivalent += treesEquivalent;
    await driver.save();
    
    // Notify and update passengers
    for (const passenger of passengers) {
      // Create notification
      await Notification.create({
        recipient: passenger.user,
        sender: req.user.id,
        type: 'ride_completed',
        title: 'Ride Completed',
        message: 'Your ride has been completed',
        ride: ride._id
      });
      
      // Update passenger's environmental impact
      const passengerUser = await User.findById(passenger.user);
      passengerUser.environmentalImpact.co2Saved += co2Saved / passengerCount;
      passengerUser.environmentalImpact.fuelSaved += fuelSaved / passengerCount;
      passengerUser.environmentalImpact.treesEquivalent += treesEquivalent / passengerCount;
      await passengerUser.save();
    }
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel a ride
// @route   PUT /api/rides/:id/cancel
// @access  Private
exports.cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if user is driver or passenger
    const isDriver = ride.driver.toString() === req.user.id;
    const isPassenger = ride.passengers.some(
      p => p.user.toString() === req.user.id && p.status === 'accepted'
    );
    
    if (!isDriver && !isPassenger) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to cancel this ride'
      });
    }
    
    // Check if ride is already completed or cancelled
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Ride is already ${ride.status}`
      });
    }
    
    if (isDriver) {
      // Driver cancelling the entire ride
      ride.status = 'cancelled';
      ride.cancellationReason = req.body.reason;
      ride.cancellationTime = Date.now();
      
      // Notify all accepted passengers
      const passengers = ride.passengers.filter(p => p.status === 'accepted');
      
      for (const passenger of passengers) {
        await Notification.create({
          recipient: passenger.user,
          sender: req.user.id,
          type: 'ride_cancelled',
          title: 'Ride Cancelled',
          message: `Your ride has been cancelled by the driver. Reason: ${req.body.reason}`,
          ride: ride._id
        });
        
        // Remove ride from passenger's rides as passenger
        await User.findByIdAndUpdate(passenger.user, {
          $pull: { ridesAsPassenger: ride._id }
        });
      }
      
      // Remove ride from driver's rides as driver
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { ridesAsDriver: ride._id }
      });
    } else {
      // Passenger cancelling their participation
      const passengerIndex = ride.passengers.findIndex(
        p => p.user.toString() === req.user.id
      );
      
      ride.passengers[passengerIndex].status = 'cancelled';
      ride.availableSeats += 1;
      
      // Create notification for driver
      await Notification.create({
        recipient: ride.driver,
        sender: req.user.id,
        type: 'passenger_cancelled',
        title: 'Passenger Cancelled',
        message: `${req.user.firstName} ${req.user.lastName} has cancelled their participation in your ride. Reason: ${req.body.reason}`,
        ride: ride._id
      });
      
      // Remove ride from passenger's rides as passenger
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { ridesAsPassenger: ride._id }
      });
    }
    
    await ride.save();
    
    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update ride location
// @route   PUT /api/rides/:id/location
// @access  Private
exports.updateRideLocation = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Make sure user is ride owner
    if (ride.driver.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this ride location'
      });
    }
    
    // Check if ride is in progress
    if (ride.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Can only update location for rides in progress'
      });
    }
    
    // Update location
    ride.currentLocation = {
      location: {
        type: 'Point',
        coordinates: req.body.location.coordinates
      },
      updatedAt: Date.now()
    };
    
    await ride.save();
    
    res.status(200).json({
      success: true,
      data: ride.currentLocation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get rides by user (as driver or passenger)
// @route   GET /api/rides/user/driver or /api/rides/user/passenger
// @access  Private
exports.getRidesByUser = async (req, res, next) => {
  try {
    const isDriver = req.path.includes('/driver');
    const status = req.query.status || 'all';
    
    let query = {};
    
    if (isDriver) {
      query.driver = req.user.id;
    } else {
      query['passengers.user'] = req.user.id;
      
      if (req.query.status === 'accepted') {
        query['passengers.status'] = 'accepted';
      }
    }
    
    if (status !== 'all' && status !== 'accepted') {
      query.status = status;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const rides = await Ride.find(query)
      .populate('driver', 'firstName lastName profilePicture rating')
      .populate('passengers.user', 'firstName lastName profilePicture rating')
      .sort({ departureTime: -1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await Ride.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: rides.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: rides
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get recurring rides
// @route   GET /api/rides/recurring/all
// @access  Private
exports.getRecurringRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({
      isRecurring: true,
      status: 'scheduled',
      driver: req.user.id
    }).sort({ departureTime: 1 });
    
    res.status(200).json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send safety alert
// @route   POST /api/rides/:id/safety-alert
// @access  Private
exports.sendSafetyAlert = async (req, res, next) => {
  try {
    const { alertType, message } = req.body;
    
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if user is driver or passenger
    const isDriver = ride.driver.toString() === req.user.id;
    const isPassenger = ride.passengers.some(
      p => p.user.toString() === req.user.id && p.status === 'accepted'
    );
    
    if (!isDriver && !isPassenger) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to send safety alerts for this ride'
      });
    }
    
    // Create notifications for all ride participants
    const recipients = [ride.driver];
    ride.passengers
      .filter(p => p.status === 'accepted')
      .forEach(p => recipients.push(p.user));
    
    // Remove the sender from recipients
    const recipientsFiltered = recipients.filter(
      r => r.toString() !== req.user.id
    );
    
    for (const recipient of recipientsFiltered) {
      await Notification.create({
        recipient,
        sender: req.user.id,
        type: 'safety_alert',
        title: `Safety Alert: ${alertType}`,
        message,
        ride: ride._id
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Safety alert sent successfully'
    });
  } catch (err) {
    next(err);
  }
};
