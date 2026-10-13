const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
  role: { type: String, enum: ['admin', 'receptionist', 'doctor'], default: 'receptionist' },
  active: { type: Boolean, default: true },
  authVersion: { type: Number, default: 0 },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
