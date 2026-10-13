const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const createRegisterRouter = require('./routes/register');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// This endpoint reports readiness without exposing database credentials.
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ready' : 'database-unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', createRegisterRouter());

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  const status = error.status === 400 ? 400 : 500;
  res.status(status).json({ message: status === 400 ? 'Invalid request body.' : 'An unexpected server error occurred.' });
});

module.exports = app;
