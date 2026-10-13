const express = require('express');
const publicUser = require('../utils/publicUser');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const { verifyPassword } = require('../utils/password');

const cookieOptions = { httpOnly: true, secure: Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };

function createLoginRouter(users = User) {
  const router = express.Router();
  router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again later.' } }), async (req, res, next) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128 || !email.trim() || !password) {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }
    if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Authentication is not configured.' });
    try {
      const user = await users.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
      if (!user || user.active === false || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
      const token = jwt.sign({ version: user.authVersion || 0 }, process.env.JWT_SECRET, { subject: String(user._id), expiresIn: '1h', algorithm: 'HS256' });
      res.cookie('access_token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      return res.json({ user: publicUser(user) });
    } catch (error) { return next(error); }
  });
  return router;
}
module.exports = { createLoginRouter, cookieOptions };
