const express = require('express');
const User = require('../models/User');
const createRequireAuth = require('../middleware/auth');
const { cookieOptions } = require('./login');

function createSessionRouter(users = User) {
  const router = express.Router();
  const requireAuth = createRequireAuth(users);
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
  });
  router.patch('/profile', requireAuth, async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be 2–80 characters.' });
    try {
      const user = await users.findByIdAndUpdate(req.user._id, { $set: { name } }, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: 'Account not found.' });
      return res.json({ message: 'Profile updated.', user: { id: user._id, name: user.name, email: user.email } });
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
