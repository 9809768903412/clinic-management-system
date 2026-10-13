const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const requireAuth = require('../middleware/auth');
const roles = require('../middleware/roles');
const publicUser = require('../utils/publicUser');
const createRegisterRouter = require('./register');

module.exports = function createStaffRouter() {
  const router = express.Router(); router.use(requireAuth(), roles('admin'));
  router.get('/', async (_req, res, next) => {
    try { res.json({ items: (await User.find().sort({ name: 1 })).map(publicUser) }); } catch (error) { next(error); }
  });
  router.use(createRegisterRouter());
  router.patch('/:id/active', async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id) || typeof req.body?.active !== 'boolean') return res.status(400).json({ message: 'Invalid account or active value.' });
    try {
      const user = await User.findById(req.params.id); if (!user) return res.status(404).json({ message: 'Staff account not found.' });
      if (user.role === 'admin' || String(req.user._id) === String(user._id)) return res.status(409).json({ message: 'The administrator account cannot be disabled here.' });
      if (!req.body.active && user.role === 'doctor' && await Appointment.exists({ doctor: user._id, status: { $in: ['Scheduled', 'Checked in'] } })) return res.status(409).json({ message: 'Resolve this doctor’s active visits before disabling the account.' });
      const updated = await User.findByIdAndUpdate(user._id, { $set: { active: req.body.active }, $inc: { authVersion: 1 } }, { returnDocument: 'after' });
      return res.json({ user: publicUser(updated) });
    } catch (error) { return next(error); }
  });
  return router;
};
