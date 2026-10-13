const express = require('express');
const publicUser = require('../utils/publicUser');
const User = require('../models/User');
const createRequireAuth = require('../middleware/auth');
const { cookieOptions } = require('./login');

function createSessionRouter(users = User) {
  const router = express.Router();
  const requireAuth = createRequireAuth(users);
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });
  router.patch('/profile', requireAuth, async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be 2–80 characters.' });
    try {
      const user = await users.findByIdAndUpdate(req.user._id, { $set: { name } }, { returnDocument: 'after', runValidators: true });
      if (!user) return res.status(404).json({ message: 'Account not found.' });
      return res.json({ message: 'Profile updated.', user: publicUser(user) });
    } catch (error) { return next(error); }
  });
  router.post('/password', requireAuth, async (req, res, next) => {
    const { currentPassword, password, confirmPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || currentPassword.length > 128 || typeof password !== 'string' || password.length < 8 || password.length > 128 || !password.trim() || password !== confirmPassword) return res.status(400).json({ message: 'Enter your current password and matching new passwords (8–128 characters).' });
    try {
      const { verifyPassword, hashPassword } = require('../utils/password');
      const user = await users.findById(req.user._id).select('+passwordHash');
      if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' });
      const updated = await users.findOneAndUpdate({ _id: user._id, passwordHash: user.passwordHash }, { $set: { passwordHash: await hashPassword(password) }, $inc: { authVersion: 1 } }, { returnDocument: 'after' });
      if (!updated) return res.status(409).json({ message: 'Your password was changed by another request. Log in again.' });
      res.clearCookie('access_token', cookieOptions);
      return res.json({ message: 'Password updated. Log in again with your new password.' });
    } catch (error) { return next(error); }
  });
  router.post('/logout', requireAuth, async (req, res, next) => {
    try {
      // Changing the version invalidates this account's existing tokens.
      await users.updateOne({ _id: req.user._id }, { $inc: { authVersion: 1 } });
      res.clearCookie('access_token', cookieOptions);
      return res.sendStatus(204);
    } catch (error) { return next(error); }
  });
  return router;
}
module.exports = createSessionRouter;
