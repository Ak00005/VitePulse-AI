const express = require('express');
const router = express.Router();
const { optionalToken } = require('../middleware/auth');
const { processChatMessage } = require('../services/geminiChatService');

/**
 * POST /api/chat
 * User-authenticated AI assistant endpoint with controlled tool calling
 */
router.post('/chat', optionalToken, async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message text is required.' });
        }

        if (message.length > 1500) {
            return res.status(400).json({ error: 'Message exceeds maximum allowed length (1500 characters).' });
        }

        const userId = req.userId || null;

        const response = await processChatMessage({
            message: message.trim(),
            history: Array.isArray(history) ? history : [],
            userId
        });

        return res.json({
            message: response.message,
            action: response.action || null,
            actions: response.actions || [],
            toolExecuted: response.toolExecuted || null,
            isGuest: !userId
        });
    } catch (error) {
        console.error('Chat endpoint error:', error);
        return res.status(500).json({
            error: "I'm having trouble connecting right now. You can still access your assessments and history normally.",
            details: error.message
        });
    }
});

module.exports = router;

