const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  course: { type: String, required: true, trim: true, maxlength: 80 },
  age: { type: Number, required: true, min: 1, max: 120, validate: Number.isInteger },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
