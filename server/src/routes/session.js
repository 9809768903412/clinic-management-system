const express = require('express');
const createRequireAuth = require('../middleware/auth');

function createSessionRouter() {
  const router = express.Router();
  router.get('/me', createRequireAuth(), (req, res) => {
    res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
  });
  return router;
}
module.exports = createSessionRouter;
