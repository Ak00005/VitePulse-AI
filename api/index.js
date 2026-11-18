/**
 * VitaPulse AI — Vercel Serverless Function Entry Point for Node.js Express Backend
 *
 * Routes:
 * - /api/auth/* (register, login, me)
 * - /api/assessments/* (history, details, delete)
 * - /api/chat (VitaPulse conversational assistant)
 * - /api/model/insights (research benchmarks and feature weights)
 * - /api/health (service health probe)
 */

const app = require('../Backend/index.js');

module.exports = app;

