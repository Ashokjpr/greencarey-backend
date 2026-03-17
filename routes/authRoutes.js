
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Send OTP to mobile number
// @route   POST /api/auth/send-otp
// @access  Public
router.post('/send-otp', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Check if OTP already exists for this number and update or create
    await Otp.findOneAndUpdate(
      { mobile },
      { otp },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send Real SMS via Fast2SMS
    if (!process.env.FAST2SMS_API_KEY) {
      console.warn("FAST2SMS_API_KEY is missing. Falling back to console log mock.");
      console.log(`[MOCK SMS] OTP for mobile ${mobile} is: ${otp}`);
    } else {
      const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
          authorization: process.env.FAST2SMS_API_KEY,
          message: `Your Green Carey registration OTP is: ${otp}`,
          language: "english",
          route: "q",
          numbers: mobile,
          flash: "0"
        }
      });
      
      console.log("Fast2SMS Response:", response.data);
    }

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error("Fast2SMS Error:", error.response?.data || error.message);
    
    // Fallback so the user can still test registration even if API limits are hit
    console.warn(`[API LIMIT HIT] Cannot send SMS, but OTP is: ${otp}`);
    
    // We send a 200 OK so the frontend form allows user to enter the OTP they saw in the console
    res.status(200).json({ message: "Mock OTP sent (check backend console)" });
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, mobile, password, otp } = req.body;

  try {
    if (!mobile || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required' });
    }

    // Verify OTP
    const validOtp = await Otp.findOne({ mobile, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { mobile }] });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email or mobile already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
    });

    if (user) {
      // Delete OTP after successful registration
      await Otp.deleteOne({ mobile });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { identifier, password, email } = req.body;
  
  // Accept identifier (new method) or email (legacy frontend payload)
  const loginIdentifier = identifier || email;

  try {
    const user = await User.findOne({ 
      $or: [
        { email: loginIdentifier }, 
        { mobile: loginIdentifier }
      ]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    // req.user is already set by protect middleware
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        address: req.user.address,
    });
});

module.exports = router;
