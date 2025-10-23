const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    make: String,
    model: String,
    year: Number,
    color: String,
    licensePlate: String,
    capacity: Number,
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG']
    },
    fuelEfficiency: Number // km/l or km/kWh
  },
  startLocation: {
    address: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  endLocation: {
    address: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  waypoints: [{
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    arrivalTime: Date
  }],
  route: {
    distance: Number, // in kilometers
    duration: Number, // in minutes
    polyline: String, // encoded polyline
    directions: String // JSON string of directions
  },
  departureTime: {
    type: Date,
    required: true
  },
  estimatedArrivalTime: {
    type: Date,
    required: true
  },
  recurringDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringEndDate: {
    type: Date
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 1
  },
  passengers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending'
    },
    pickupLocation: {
      address: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      }
    },
    dropoffLocation: {
      address: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      }
    },
    fare: {
      amount: Number,
      currency: {
        type: String,
        default: 'INR'
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
      }
    },
    rating: {
      value: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String
    }
  }],
  preferences: {
    smoking: {
      type: Boolean,
      default: false
    },
    pets: {
      type: Boolean,
      default: false
    },
    music: {
      type: Boolean,
      default: true
    },
    conversation: {
      type: Boolean,
      default: true
    }
  },
  fare: {
    perKm: {
      type: Number,
      required: true
    },
    baseFare: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  currentLocation: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    updatedAt: {
      type: Date
    }
  },
  environmentalImpact: {
    co2Saved: Number, // in kg
    fuelSaved: Number, // in liters
    treesEquivalent: Number
  },
  notes: String,
  cancellationReason: String,
  cancellationTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for geospatial queries
rideSchema.index({ 'startLocation.location': '2dsphere' });
rideSchema.index({ 'endLocation.location': '2dsphere' });
rideSchema.index({ 'waypoints.location': '2dsphere' });
rideSchema.index({ 'currentLocation.location': '2dsphere' });

// Calculate environmental impact before saving
rideSchema.pre('save', async function(next) {
  if (this.isModified('route.distance') || this.isModified('vehicle.fuelEfficiency') || this.isModified('passengers')) {
    const distance = this.route.distance || 0;
    const fuelEfficiency = this.vehicle.fuelEfficiency || 15; // Default: 15 km/l
    const passengerCount = this.passengers.filter(p => p.status === 'accepted').length;
    
    // Calculate fuel saved (assuming each passenger would have used their own vehicle)
    const fuelSaved = (distance * passengerCount) / fuelEfficiency;
    
    // Calculate CO2 saved (average 2.3 kg CO2 per liter of fuel)
    const co2Saved = fuelSaved * 2.3;
    
    // Calculate trees equivalent (average tree absorbs 22 kg CO2 per year)
    const treesEquivalent = co2Saved / 22;
    
    this.environmentalImpact = {
      co2Saved,
      fuelSaved,
      treesEquivalent
    };
  }
  
  next();
});

module.exports = mongoose.model('Ride', rideSchema);
