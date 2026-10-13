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
    let session;
    try {
      session = await mongoose.startSession();
      let updated;
      await session.withTransaction(async () => {
        const user = await User.findById(req.params.id).session(session);
        if (!user) { const error = new Error('Staff account not found.'); error.status = 404; throw error; }
        if (user.role === 'admin' || String(req.user._id) === String(user._id)) { const error = new Error('The administrator account cannot be disabled here.'); error.status = 409; throw error; }
        updated = await User.findByIdAndUpdate(user._id, { $set: { active: req.body.active }, $inc: { authVersion: 1, __v: 1 } }, { session, returnDocument: 'after' });
        if (!req.body.active && user.role === 'doctor' && await Appointment.exists({ doctor: user._id, status: { $in: ['Scheduled', 'Checked in'] } }).session(session)) { const error = new Error('Resolve this doctor’s active visits before disabling the account.'); error.status = 409; throw error; }
      });
      return res.json({ user: publicUser(updated) });
    } catch (error) { if ([404, 409].includes(error.status)) return res.status(error.status).json({ message: error.message }); return next(error); }
    finally { if (session) await session.endSession(); }
  });
  return router;
};
