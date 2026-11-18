const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./Dbconnection');
const authRoutes = require('./Routes/AuthRoutes');
const predictRoutes = require('./Routes/PredictRoutes');
const chatRoutes = require('./Routes/ChatRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Environment-aware dynamic CORS
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, same-origin, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Always allow localhost in development or testing
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow Vercel preview and production deployments (*.vercel.app)
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // Allow explicitly configured production frontend URL
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, '')) {
            return callback(null, true);
        }

        // Allow deployment-specific hostnames
        if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) {
            return callback(null, true);
        }

        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-id'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Serverless-aware MongoDB connection middleware
app.use(async (req, res, next) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
    } catch (e) {
        // App will continue in fallback mode if DB is momentarily unreachable
    }
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', predictRoutes);
app.use('/api', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Lifestyle AI Prediction & XAI API',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
    });
});

const path = require('path');
const fs = require('fs');

// Serve static frontend assets if built (used for Docker container and standalone production)
const frontendDist = path.join(__dirname, '..', 'Frontend', 'lifestyleprediction', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api/')) {
            return res.sendFile(path.join(frontendDist, 'index.html'));
        }
        next();
    });
} else {
    // Root welcome endpoint for API-only mode
    app.get('/', (req, res) => {
        res.json({
            message: 'Welcome to the Lifestyle Disease Prediction & Explainable AI (XAI) API',
            endpoints: {
                health: '/api/health',
                predict: 'POST /api/predict',
                assessments: 'GET /api/assessments',
                modelInsights: 'GET /api/model/insights',
                chat: 'POST /api/chat',
                authRegister: 'POST /api/auth/register',
                authLogin: 'POST /api/auth/login'
            }
        });
    });
}

// Global Error Handler (Sanitizes stack traces in production)
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: isProd ? 'Internal server error' : (err.message || 'Internal server error')
    });
});

// Start persistent server when running directly in local dev
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
