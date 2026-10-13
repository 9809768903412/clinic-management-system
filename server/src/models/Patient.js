const mongoose = require('mongoose');
const { randomBytes } = require('node:crypto');
const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, default: () => `P-${randomBytes(5).toString('hex').toUpperCase()}` },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  birthDate: { type: String, required: true },
  sex: { type: String, enum: ['Female', 'Male', 'Other', 'Not specified'], default: 'Not specified' },
  contact: { type: String, required: true, trim: true, maxlength: 30 },
  address: { type: String, trim: true, maxlength: 500, default: '' },
  archived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Patient', patientSchema);
