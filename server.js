
// =====================================================
// CTRAX Technologies - Main Server
// Homepage, Authentication, TRAX Safety, and Demo Requests
// =====================================================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

// =====================================================
// GENERAL MIDDLEWARE
// =====================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'ctrax-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve website files and images
app.use(express.static(__dirname));

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// =====================================================
// USER SCHEMA
// =====================================================

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User =
  mongoose.models.User ||
  mongoose.model('User', userSchema);

// =====================================================
// TRAX SAFETY SIGHTING SCHEMA
// =====================================================

const sightingSchema = new mongoose.Schema({
  plate: String,
  confidence: Number,
  vehicle: String,
  speed: Number,
  direction: String,

  latitude: Number,
  longitude: Number,

  cameraId: String,
  zone: String,

  timestamp: {
    type: Date,
    default: Date.now
  },

  rawData: mongoose.Schema.Types.Mixed
});

const Sighting =
  mongoose.models.Sighting ||
  mongoose.model('Sighting', sightingSchema);

// =====================================================
// DEMO REQUEST SCHEMA
// =====================================================

const demoRequestSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },

  lastName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    default: ''
  },

  organization: {
    type: String,
    required: true,
    trim: true
  },

  affiliation: {
    type: String,
    required: true,
    trim: true
  },

  challenges: {
    type: String,
    default: ''
  },

  timeline: {
    type: String,
    default: ''
  },

  status: {
    type: String,
    default: 'New'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DemoRequest =
  mongoose.models.DemoRequest ||
  mongoose.model('DemoRequest', demoRequestSchema);

// =====================================================
// HOME PAGE
// =====================================================

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/homepage.html');
});

// =====================================================
// REQUEST A DEMO
// POST /request-demo
// Saves customer demo requests to MongoDB
// =====================================================

app.post('/request-demo', async (req, res) => {
  try {
    console.log('\n========== NEW DEMO REQUEST ==========');

    // Confirm database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB is not connected');

      return res.status(503).json({
        success: false,
        message: 'The database is temporarily unavailable.'
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      organization,
      affiliation,
      challenges,
      timeline
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !organization ||
      !affiliation
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.'
      });
    }

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Create the demo request
    const demoRequest = new DemoRequest({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '',
      organization: organization.trim(),
      affiliation: affiliation.trim(),
      challenges: challenges || '',
      timeline: timeline || '',
      status: 'New'
    });

    // Save request to MongoDB
    await demoRequest.save();

    console.log('DEMO REQUEST SAVED SUCCESSFULLY');

    console.log({
      requestId: demoRequest._id,
      name: `${demoRequest.firstName} ${demoRequest.lastName}`,
      email: demoRequest.email,
      organization: demoRequest.organization,
      affiliation: demoRequest.affiliation,
      timeline: demoRequest.timeline
    });

    console.log('======================================\n');

    return res.status(201).json({
      success: true,
      message: 'Your demo request was submitted successfully.',
      requestId: demoRequest._id
    });

  } catch (error) {
    console.error('DEMO REQUEST ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to submit your demo request.',
      error: 'SERVER_ERROR'
    });
  }
});

// =====================================================
// SIGN UP ROUTE
// POST /signup
// =====================================================

app.post('/signup', async (req, res) => {
  try {
    const email = (req.body.email || '')
      .toLowerCase()
      .trim();

    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.'
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.'
    });

  } catch (error) {
    console.error('Signup error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
});

// =====================================================
// LOGIN ROUTE
// POST /login
// =====================================================

app.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '')
      .toLowerCase()
      .trim();

    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Store user session
    req.session.userId = user._id;
    req.session.userEmail = user.email;

    return res.json({
      success: true,
      message: 'Login successful.',
      redirect: '/dashboard'
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
});

// =====================================================
// TRAX SAFETY ADD-SIGHTING ROUTE
// POST /add-sighting
// Receives detections from the Python TRAX pipeline
// =====================================================

app.post('/add-sighting', async (req, res) => {
  try {
    console.log('\n========== NEW DETECTION RECEIVED ==========');
    console.log(req.body);
    console.log('============================================\n');

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable.'
      });
    }

    const sighting = new Sighting({
      plate: req.body.plate || '',
      confidence: req.body.confidence ?? 0,
      vehicle: req.body.vehicle || '',
      speed: req.body.speed ?? 0,
      direction: req.body.direction || '',

      latitude: req.body.latitude ?? 39.7684,
      longitude: req.body.longitude ?? -86.1581,

      cameraId: req.body.cameraId || 'TRAX-INDY-01',
      zone: req.body.zone || 'Downtown',

      timestamp: req.body.timestamp
        ? new Date(req.body.timestamp)
        : new Date(),

      rawData: req.body
    });

    await sighting.save();

    console.log(
      `Saved sighting: ${sighting.plate} | ${sighting.speed} MPH`
    );

    return res.status(201).json({
      success: true,
      message: 'Sighting received successfully.',
      id: sighting._id
    });

  } catch (error) {
    console.error('Error receiving sighting:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save sighting.',
      error: error.message
    });
  }
});

// =====================================================
// GET ALL SIGHTINGS
// GET /api/sightings
// =====================================================

app.get('/api/sightings', async (req, res) => {
  try {
    const sightings = await Sighting.find()
      .sort({ timestamp: -1 })
      .limit(100);

    return res.json({
      success: true,
      sightings
    });

  } catch (error) {
    console.error('Error loading sightings:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load sightings.',
      error: error.message
    });
  }
});

// =====================================================
// DASHBOARD ROUTE
// =====================================================

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }

  res.sendFile(__dirname + '/test_camera.html');
});

// =====================================================
// SERVER STATUS
// =====================================================

app.get('/api/status', (req, res) => {
  return res.json({
    success: true,
    server: 'CTRAX Technologies',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
    timestamp: new Date()
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5050;

app.listen(PORT, '0.0.0.0', () => {
  console.log('======================================');
  console.log('CTRAX TECHNOLOGIES SERVER STARTED');
  console.log(`Port: ${PORT}`);
  console.log('Demo requests: POST /request-demo');
  console.log('Sightings: POST /add-sighting');
  console.log('======================================');
});
