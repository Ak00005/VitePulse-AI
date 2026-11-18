const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lifestyle_ai_jwt_secret_key_2026';

// Middleware to strictly enforce valid JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required. Please sign in to access your assessment history.',
            isGuest: true
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({
            error: 'Session expired or invalid token. Please sign in again.',
            isGuest: true
        });
    }
};

// Middleware to optionally extract user from JWT if present, without blocking guests
const optionalToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.id;
        } catch (err) {
            // Invalid/expired token: treat as guest
            req.user = null;
            req.userId = null;
        }
    } else {
        req.user = null;
        req.userId = null;
    }
    next();
};

module.exports = {
    JWT_SECRET,
    verifyToken,
    optionalToken
};
