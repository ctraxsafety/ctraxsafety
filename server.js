// =====================================================
// CTRAX Technologies - Main Server
// Updated with TRAX Safety /add-sighting API route
// =====================================================

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose.connect(process.env.MONGODB_URI)
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
// SIGN UP ROUTE
// =====================================================
app.post('/signup', async (req, res) => {
  try {
    console.log('Signup request body:', req.body);

    // Get submitted values
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    // Success response
    res.json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Signup error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
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