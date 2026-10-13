const mongoose = require('mongoose');
const consultationSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symptoms: { type: String, required: true, maxlength: 2000 },
  findings: { type: String, maxlength: 2000, default: '' },
  diagnosis: { type: String, required: true, maxlength: 2000 },
  treatment: { type: String, maxlength: 2000, default: '' },
  prescription: { type: String, maxlength: 2000, default: '' },
  followUpDate: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Consultation', consultationSchema);
