// =====================================================
// CTRAX Technologies - Main Server
// Updated with TRAX Safety /add-sighting API route
// =====================================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 5050;

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose.connect('mongodb://127.0.0.1:27017/ctrax')
.then(() => {
  console.log('MongoDB connected');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// =====================================================
// USER SCHEMA
// =====================================================

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  affiliation: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// =====================================================
// SIGHTING SCHEMA
// =====================================================

const sightingSchema = new mongoose.Schema({
  plate: String,
  confidence: Number,
  vehicle: String,
  speed: Number,
  direction: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  rawData: Object
});

const Sighting =
  mongoose.models.Sighting ||
  mongoose.model('Sighting', sightingSchema);

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// =====================================================
// HOME PAGE
// =====================================================

app.use(express.static(__dirname));

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/homepage.html');
});

// =====================================================
// SIGNUP ROUTE
// =====================================================

app.post('/signup', async (req, res) => {
  try {
    const {
      fullName,
      organization,
      affiliation,
      email,
      password
    } = req.body;

    if (
      !fullName ||
      !organization ||
      !affiliation ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const user = new User({
      fullName: fullName.trim(),
      organization: organization.trim(),
      affiliation,
      email: normalizedEmail,
      password
    });

    await user.save();

    console.log('New user created:', normalizedEmail);

    res.json({
      success: true,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// =====================================================
// LOGIN ROUTE
// =====================================================

app.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('Login successful:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// =====================================================
// ADD-SIGHTING ROUTE
// Receives detections from the Python TRAX Safety pipeline
// POST http://127.0.0.1:5050/add-sighting
// =====================================================

app.post('/add-sighting', async (req, res) => {
  try {
    console.log('\n========== NEW DETECTION RECEIVED ==========');
    console.log(req.body);
    console.log('===========================================\n');

    const sighting = new Sighting({
      plate: req.body.plate || '',
      confidence: req.body.confidence || 0,
      vehicle: req.body.vehicle || '',
      speed: req.body.speed || 0,
      direction: req.body.direction || '',
      timestamp: req.body.timestamp
        ? new Date(req.body.timestamp)
        : new Date(),
      rawData: req.body
    });

    await sighting.save();

    console.log(
      `Saved sighting: ${sighting.plate} | ${sighting.speed} MPH`
    );

    res.json({
      success: true,
      message: 'Sighting received successfully',
      id: sighting._id
    });
  } catch (error) {
    console.error('Error receiving sighting:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to save sighting',
      error: error.message
    });
  }
});

// =====================================================
// GET ALL SIGHTINGS (OPTIONAL FOR DASHBOARD)
// =====================================================

app.get('/api/sightings', async (req, res) => {
  try {
    const sightings = await Sighting.find()
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      success: true,
      sightings
    });
  } catch (error) {
    console.error('Error loading sightings:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to load sightings',
      error: error.message
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5050;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CTRAX server running on port ${PORT}`);
});