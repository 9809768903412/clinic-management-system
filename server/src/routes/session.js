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
