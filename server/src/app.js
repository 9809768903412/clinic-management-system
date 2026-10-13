const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const createPatientRouter = require('./routes/patients');
const { createAppointmentRouter } = require('./routes/appointments');
const createClinicRouter = require('./routes/clinic');
const createStaffRouter = require('./routes/staff');
const createSessionRouter = require('./routes/session');
const { createLoginRouter } = require('./routes/login');

const app = express();
if (process.env.VERCEL) app.set('trust proxy', 1);

function allowedOrigin(req, origin) {
  if (origin === (process.env.CLIENT_ORIGIN || 'http://localhost:5173')) return true;
  if (!process.env.VERCEL) return false;
  const host = req.get('host');
  return Boolean(host && origin === `https://${host}`);
}
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));

// This endpoint reports readiness without exposing database credentials.
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ready' : 'database-unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use('/api', (req, res, next) => {
  const origin = req.get('Origin');
  if (req.method !== 'GET' && origin && !allowedOrigin(req, origin)) return res.status(403).json({ message: 'Request origin is not allowed.' });
  next();
});
app.post('/api/auth/register', (_req, res) => res.status(403).json({ message: 'Staff accounts are created by the clinic administrator.' }));
app.use('/api/auth', createLoginRouter());
app.use('/api/auth', createSessionRouter());
app.use('/api/patients', createPatientRouter());
app.use('/api/appointments', createAppointmentRouter());
app.use('/api/clinic', createClinicRouter());
app.use('/api/staff', createStaffRouter());

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  const status = error.status === 400 ? 400 : 500;
  res.status(status).json({ message: status === 400 ? 'Invalid request body.' : 'An unexpected server error occurred.' });
});

module.exports = app;
