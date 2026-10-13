const express = require('express');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

function createRegisterRouter(users = User) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    const { name, email, password, confirmPassword, role } = req.body || {};
    const errors = {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (cleanName.length < 2 || cleanName.length > 80) errors.name = 'Enter a name between 2 and 80 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) errors.email = 'Enter a valid email address.';
    if (typeof password !== 'string' || password.length < 8 || password.length > 128 || !password.trim()) {
      errors.password = 'Use a password between 8 and 128 characters.';
    }
    if (typeof confirmPassword !== 'string' || password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (role !== undefined && !['receptionist', 'doctor'].includes(role)) errors.role = 'Choose doctor or receptionist.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields.', errors });

    try {
      const passwordHash = await hashPassword(password);
      const user = await users.create({ name: cleanName, email: cleanEmail, passwordHash, role: role || 'receptionist', active: true });
      return res.status(201).json({
        message: 'Account created successfully.',
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'This email is already registered.', errors: { email: 'This email is already registered.' } });
      return next(error);
    }
  });

  return router;
}

module.exports = createRegisterRouter;
