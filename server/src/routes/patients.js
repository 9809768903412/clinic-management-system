const express = require('express');
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const requireAuth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { patientInput, pageQuery, literalSearch } = require('../utils/clinicValidation');

function createPatientRouter(patients = Patient, auth = requireAuth()) {
  const router = express.Router(); router.use(auth, roles('admin', 'receptionist', 'doctor'));
  router.get('/', async (req, res, next) => {
    const params = pageQuery(req.query); if (!params) return res.status(400).json({ message: 'Invalid search or page parameters.' });
    if (req.query.archived !== undefined && !['true', 'false'].includes(req.query.archived)) return res.status(400).json({ message: 'Invalid archive filter.' });
    const filter = { archived: req.query.archived === 'true' };
    if (params.search) { const expression = literalSearch(params.search); filter.$or = [{ name: expression }, { patientId: expression }, { contact: expression }]; }
    try {
      const total = await patients.countDocuments(filter), pages = Math.max(1, Math.ceil(total / params.limit)), page = Math.min(params.page, pages);
      const items = await patients.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * params.limit).limit(params.limit);
      res.json({ items, total, pages, page });
    } catch (error) { next(error); }
  });
  router.post('/', roles('admin', 'receptionist'), async (req, res, next) => {
    const { data, errors } = patientInput(req.body); if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the patient details.', errors });
    try { return res.status(201).json({ patient: await patients.create({ ...data, createdBy: req.user._id }) }); } catch (error) { return next(error); }
  });
  router.put('/:id', roles('admin', 'receptionist'), async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid patient ID.' });
    const { data, errors } = patientInput(req.body); if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the patient details.', errors });
    try { const patient = await patients.findOneAndUpdate({ _id: req.params.id }, { $set: data }, { returnDocument: 'after', runValidators: true }); if (!patient) return res.status(404).json({ message: 'Patient not found.' }); return res.json({ patient }); } catch (error) { return next(error); }
  });
  router.patch('/:id/archive', roles('admin', 'receptionist'), async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id) || typeof req.body?.archived !== 'boolean') return res.status(400).json({ message: 'Invalid patient or archive value.' });
    try {
      if (req.body.archived && await Appointment.exists({ patient: req.params.id, status: { $in: ['Scheduled', 'Checked in'] } })) return res.status(409).json({ message: 'Complete or cancel active visits before archiving this patient.' });
      const patient = await patients.findOneAndUpdate({ _id: req.params.id }, { $set: { archived: req.body.archived } }, { returnDocument: 'after' });
      if (!patient) return res.status(404).json({ message: 'Patient not found.' }); return res.json({ patient });
    } catch (error) { return next(error); }
  });
  router.get('/:id/history', roles('doctor'), async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid patient ID.' });
    try {
      if (!await patients.exists({ _id: req.params.id })) return res.status(404).json({ message: 'Patient not found.' });
      const items = await Consultation.find({ patient: req.params.id }).populate('doctor', 'name').sort({ createdAt: -1 }); res.json({ items });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = createPatientRouter;
