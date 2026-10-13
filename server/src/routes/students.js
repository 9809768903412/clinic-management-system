const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const createRequireAuth = require('../middleware/auth');

function validateStudent(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const course = typeof body?.course === 'string' ? body.course.trim() : '';
  const age = body?.age;
  const errors = {};
  if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2–80 characters.';
  if (!course || course.length > 80) errors.course = 'Enter a course, up to 80 characters.';
  if (!Number.isInteger(age) || age < 1 || age > 120) errors.age = 'Age must be a whole number between 1 and 120.';
  return { errors, data: { name, course, age } };
}

function createStudentRouter(students = Student, requireAuth = createRequireAuth()) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', async (req, res, next) => {
    try {
      const items = await students.find({ owner: req.user._id }).sort({ createdAt: -1, _id: -1 });
      return res.json({ items });
    } catch (error) { return next(error); }
  });
  router.post('/', async (req, res, next) => {
    const { errors, data } = validateStudent(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the student details.', errors });
    try { return res.status(201).json({ student: await students.create({ ...data, owner: req.user._id }) }); }
    catch (error) { return next(error); }
  });
  router.put('/:id', async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid student ID.' });
    const { errors, data } = validateStudent(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the student details.', errors });
    try {
      const student = await students.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $set: data }, { new: true, runValidators: true });
      if (!student) return res.status(404).json({ message: 'Student not found.' });
      return res.json({ student });
    } catch (error) { return next(error); }
  });
  router.delete('/:id', async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid student ID.' });
    try {
      const student = await students.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      if (!student) return res.status(404).json({ message: 'Student not found.' });
      return res.sendStatus(204);
    } catch (error) { return next(error); }
  });
  return router;
}
module.exports = createStudentRouter;
