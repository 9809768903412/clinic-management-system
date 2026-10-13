const express = require('express');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const roles = require('../middleware/roles');

module.exports = function createClinicRouter() {
  const router = express.Router(); router.use(requireAuth(), roles('admin', 'receptionist', 'doctor'));
  router.get('/options', async (_req, res, next) => {
    try { res.json({ doctors: await User.find({ role: 'doctor', active: true }).select('name').sort({ name: 1 }) }); } catch (error) { next(error); }
  });
  router.get('/summary', async (req, res, next) => {
    const scope = req.user.role === 'doctor' ? { doctor: req.user._id } : {};
    try {
      const [patients, scheduled, waiting, completed, upcoming] = await Promise.all([
        Patient.countDocuments({ archived: false }), Appointment.countDocuments({ ...scope, status: 'Scheduled' }), Appointment.countDocuments({ ...scope, status: 'Checked in' }), Appointment.countDocuments({ ...scope, status: 'Completed' }),
        Appointment.find({ ...scope, status: { $in: ['Scheduled', 'Checked in'] } }).populate('patient', 'name patientId').populate('doctor', 'name').sort({ scheduledAt: 1 }).limit(5),
      ]);
      res.json({ patients, scheduled, waiting, completed, upcoming });
    } catch (error) { next(error); }
  });
  router.get('/consultations', roles('doctor'), async (req, res, next) => {
    try { res.json({ items: await Consultation.find({ doctor: req.user._id }).populate('patient', 'name patientId').sort({ createdAt: -1 }).limit(100) }); } catch (error) { next(error); }
  });
  router.post('/consultations', roles('doctor'), async (req, res, next) => {
    const mongoose = require('mongoose');
    const { appointment: id } = req.body || {};
    if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: 'Choose a valid checked-in visit.' });
    const data = {};
    for (const field of ['symptoms', 'findings', 'diagnosis', 'treatment', 'prescription', 'followUpDate']) {
      const value = req.body?.[field] ?? '';
      if (typeof value !== 'string' || value.length > (field === 'followUpDate' ? 10 : 2000)) return res.status(400).json({ message: 'Clinical notes must be text, up to 2000 characters per field.' });
      data[field] = value.trim();
    }
    const { validDate, today } = require('../utils/clinicValidation');
    if (!data.symptoms || !data.diagnosis || (data.followUpDate && (!validDate(data.followUpDate) || data.followUpDate < today()))) return res.status(400).json({ message: 'Symptoms and diagnosis are required. A follow-up date must be today or later.' });
    let session;
    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const visit = await Appointment.findOneAndUpdate({ _id: id, doctor: req.user._id, status: 'Checked in' }, { $set: { status: 'Completed' }, $push: { history: { status: 'Completed', by: req.user._id, at: new Date() } } }, { returnDocument: 'after', session });
        if (!visit) { const error = new Error('Choose one of your checked-in visits. It may already be completed.'); error.status = 409; throw error; }
        await Consultation.create([{ ...data, appointment: visit._id, patient: visit.patient, doctor: req.user._id }], { session });
      });
      return res.status(201).json({ message: 'Consultation saved and visit completed.' });
    } catch (error) {
      if (error.status === 409 || error.code === 11000) return res.status(409).json({ message: error.status === 409 ? error.message : 'This consultation has already been saved.' });
      return next(error);
    } finally { if (session) await session.endSession(); }
  });
  return router;
};
