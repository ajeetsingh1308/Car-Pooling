const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail
} = require('../controllers/auth.controller');

// Import middleware
const { protect } = require('../middleware/auth');

// Define routes
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required')
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  login
);

router.get('/logout', logout);
router.get('/me', protect, getMe);

router.post(
  '/forgotpassword',
  [body('email').isEmail().withMessage('Please include a valid email')],
  forgotPassword
);

router.put(
  '/resetpassword/:resettoken',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  resetPassword
);

router.put(
  '/updatepassword',
  protect,
  [
    body('currentPassword').exists().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  updatePassword
);

router.get('/verify-email/:token', verifyEmail);

module.exports = router;
