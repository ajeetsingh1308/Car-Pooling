const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/user.model');
const Ride = require('../models/ride.model');
const Transaction = require('../models/transaction.model');

let authToken;
let userId;
let rideId;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/greenride_test');
  
  // Clear test database
  await User.deleteMany({});
  await Ride.deleteMany({});
  await Transaction.deleteMany({});
});

afterAll(async () => {
  // Disconnect from test database
  await mongoose.connection.close();
});

describe('Authentication API', () => {
  test('Should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '1234567890'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.success).toBe(true);
    
    authToken = res.body.token;
  });
  
  test('Should login with registered user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.success).toBe(true);
    
    authToken = res.body.token;
  });
  
  test('Should get current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('email', 'test@example.com');
    expect(res.body.data).toHaveProperty('firstName', 'Test');
    
    userId = res.body.data._id;
  });
});

describe('User API', () => {
  test('Should update user profile', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Updated',
        lastName: 'User'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('firstName', 'Updated');
    expect(res.body.data).toHaveProperty('lastName', 'User');
  });
  
  test('Should add vehicle details', async () => {
    const res = await request(app)
      .put('/api/users/vehicle')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        make: 'Honda',
        model: 'Civic',
        year: 2020,
        color: 'Blue',
        licensePlate: 'ABC123',
        capacity: 4,
        fuelType: 'Petrol',
        fuelEfficiency: 15
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('make', 'Honda');
    expect(res.body.data).toHaveProperty('model', 'Civic');
  });
});

describe('Ride API', () => {
  test('Should create a new ride', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startLocation: {
          address: 'Test Start Location',
          location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139]
          }
        },
        endLocation: {
          address: 'Test End Location',
          location: {
            type: 'Point',
            coordinates: [77.0266, 28.4595]
          }
        },
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        availableSeats: 3,
        fare: {
          perKm: 5,
          baseFare: 50,
          currency: 'INR'
        }
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty('startLocation');
    expect(res.body.data).toHaveProperty('endLocation');
    expect(res.body.data).toHaveProperty('availableSeats', 3);
    
    rideId = res.body.data._id;
  });
  
  test('Should search for rides', async () => {
    const res = await request(app)
      .get('/api/rides')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        startLat: 28.6139,
        startLng: 77.2090,
        endLat: 28.4595,
        endLng: 77.0266
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  
  test('Should get ride details', async () => {
    const res = await request(app)
      .get(`/api/rides/${rideId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('_id', rideId);
    expect(res.body.data).toHaveProperty('driver');
  });
});

describe('Payment API', () => {
  test('Should get wallet balance', async () => {
    const res = await request(app)
      .get('/api/payments/wallet/balance')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('balance');
  });
  
  test('Should add funds to wallet', async () => {
    const res = await request(app)
      .post('/api/payments/wallet/add-funds')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 500,
        paymentMethod: 'card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123'
        }
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('transaction');
    expect(res.body.data).toHaveProperty('newBalance');
    expect(res.body.data.newBalance).toBeGreaterThanOrEqual(500);
  });
  
  test('Should get transaction history', async () => {
    const res = await request(app)
      .get('/api/payments/transactions')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
