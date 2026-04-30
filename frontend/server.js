const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'mentai_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware to prevent caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Routes

// Home - redirect to login or dashboard
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Register page
app.get('/register', (req, res) => {
    res.render('register', { error: null, success: null });
});

app.post('/register', async (req, res) => {
    try {
        const { admission_number, full_name, email, password, confirm_password } = req.body;

        // Basic validation
        if (password !== confirm_password) {
            return res.render('register', {
                error: 'Passwords do not match!',
                success: null
            });
        }

        // Call Flask API
        const response = await axios.post(`${FLASK_API_URL}/api/register`, {
            admission_number,
            full_name,
            email,
            password
        });

        if (response.data.success) {
            res.render('register', {
                error: null,
                success: 'Registration successful! Please login.'
            });
        }
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
        res.render('register', { error: errorMsg, success: null });
    }
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const { admission_number, password } = req.body;

        // Call Flask API
        const response = await axios.post(`${FLASK_API_URL}/api/login`, {
            admission_number,
            password
        });

        if (response.data.success) {
            // Set session
            req.session.user = response.data.data;
            res.redirect('/dashboard');
        }
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Invalid credentials!';
        res.render('login', { error: errorMsg });
    }
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const admission_number = req.session.user.admission_number;

        // Fetch profile from Flask API
        const response = await axios.get(`${FLASK_API_URL}/api/profile/${admission_number}`);

        if (response.data.success) {
            res.render('dashboard', {
                user: req.session.user,
                profile: response.data.data
            });
        }
    } catch (error) {
        res.render('dashboard', {
            user: req.session.user,
            profile: req.session.user
        });
    }
});

// Profile page
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const admission_number = req.session.user.admission_number;

        // Fetch profile from Flask API
        const response = await axios.get(`${FLASK_API_URL}/api/profile/${admission_number}`);

        if (response.data.success) {
            res.render('profile', {
                user: req.session.user,
                profile: response.data.data
            });
        }
    } catch (error) {
        res.render('profile', {
            user: req.session.user,
            profile: req.session.user
        });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

// Forgot password page
app.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { error: null, success: null });
});

// Start server
app.listen(PORT, () => {
console.log(`✅ MentAi Frontend Server running on http://localhost:${PORT}`);
    console.log(`✅ Connected to Flask API at ${FLASK_API_URL}`);
});
