const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { pageQuery, literalSearch } = require('../utils/clinicValidation');

const transitions = { Scheduled: ['Checked in', 'Cancelled', 'No-show'], 'Checked in': ['Cancelled'] };
function validSlot(value) {
  const date = new Date(value);
  return typeof value === 'string' && !Number.isNaN(date.getTime()) && date.getUTCMinutes() % 30 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}
const details = query => query.populate('patient', 'name patientId birthDate contact archived').populate('doctor', 'name');
function createAppointmentRouter() {
  const router = express.Router(); router.use(requireAuth(), roles('admin', 'receptionist', 'doctor'));
  router.get('/', async (req, res, next) => {
    const params = pageQuery(req.query); if (!params) return res.status(400).json({ message: 'Invalid search or page parameters.' });
    const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : {};
    if (req.query.status) { if (!['Scheduled', 'Checked in', 'Completed', 'Cancelled', 'No-show'].includes(req.query.status)) return res.status(400).json({ message: 'Invalid visit status.' }); filter.status = req.query.status; }
    try {
      if (params.search) { const expression = literalSearch(params.search); const patients = await Patient.find({ $or: [{ name: expression }, { patientId: expression }] }).select('_id'); filter.patient = { $in: patients.map(patient => patient._id) }; }
      const total = await Appointment.countDocuments(filter), pages = Math.max(1, Math.ceil(total / params.limit)), page = Math.min(params.page, pages);
      const items = await details(Appointment.find(filter).sort({ scheduledAt: -1, _id: -1 }).skip((page - 1) * params.limit).limit(params.limit));
      return res.json({ items, total, pages, page });
    } catch (error) { return next(error); }
  });
  router.post('/', roles('admin', 'receptionist'), async (req, res, next) => {
    const { patient, doctor, scheduledAt, visitType, reason = '' } = req.body || {};
    if (!mongoose.isObjectIdOrHexString(patient) || !mongoose.isObjectIdOrHexString(doctor) || !['Appointment', 'Walk-in'].includes(visitType) || typeof reason !== 'string' || reason.length > 200) return res.status(400).json({ message: 'Choose a patient, doctor, visit type, and reason under 200 characters.' });
    if (!validSlot(scheduledAt) || new Date(scheduledAt) < new Date(Date.now() - (visitType === 'Walk-in' ? 30 * 60 * 1000 : 0))) return res.status(400).json({ message: 'Choose a future 30-minute slot (00 or 30 minutes). Walk-ins may use the current slot.' });
    try {
      if (!await Patient.exists({ _id: patient, archived: false })) return res.status(400).json({ message: 'Choose an active patient.' });
      if (!await User.exists({ _id: doctor, role: 'doctor', active: true })) return res.status(400).json({ message: 'Choose an active doctor.' });
      const status = visitType === 'Walk-in' ? 'Checked in' : 'Scheduled';
      const appointment = await Appointment.create({ patient, doctor, scheduledAt, visitType, reason: reason.trim(), status, createdBy: req.user._id, history: [{ status, by: req.user._id }] });
      return res.status(201).json({ appointment: await details(Appointment.findById(appointment._id)) });
    } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'This doctor already has a visit in that slot. Choose another slot or doctor.' }); return next(error); }
  });
  router.patch('/:id/status', roles('admin', 'receptionist'), async (req, res, next) => {
    const status = req.body?.status;
    if (!mongoose.isObjectIdOrHexString(req.params.id) || !['Checked in', 'Cancelled', 'No-show'].includes(status)) return res.status(400).json({ message: 'Invalid appointment or status.' });
    try {
      const current = await Appointment.findById(req.params.id); if (!current) return res.status(404).json({ message: 'Appointment not found.' });
      if (!(transitions[current.status] || []).includes(status)) return res.status(409).json({ message: 'This visit cannot move to that status.' });
      if (status === 'Checked in' && current.scheduledAt > new Date()) return res.status(409).json({ message: 'This appointment is not due for check-in yet.' });
      if (status === 'No-show' && current.scheduledAt > new Date()) return res.status(409).json({ message: 'Mark a no-show only after the appointment time.' });
      const appointment = await details(Appointment.findOneAndUpdate({ _id: current._id, status: current.status }, { $set: { status }, $push: { history: { status, at: new Date(), by: req.user._id } } }, { returnDocument: 'after' }));
      if (!appointment) return res.status(409).json({ message: 'This visit was updated by another staff member. Refresh and try again.' });
      return res.json({ appointment });
    } catch (error) { return next(error); }
  });
  return router;
}
module.exports = { createAppointmentRouter, validSlot, transitions };
