const mongoose = require('mongoose');
const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  visitType: { type: String, enum: ['Appointment', 'Walk-in'], default: 'Appointment' },
  reason: { type: String, trim: true, maxlength: 200, default: '' },
  status: { type: String, enum: ['Scheduled', 'Checked in', 'Completed', 'Cancelled', 'No-show'], default: 'Scheduled' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  history: [{ status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
}, { timestamps: true });
appointmentSchema.index({ doctor: 1, scheduledAt: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['Scheduled', 'Checked in'] } } });
module.exports = mongoose.model('Appointment', appointmentSchema);
