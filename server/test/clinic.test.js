const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const roles = require('../src/middleware/roles');
const { patientInput, pageQuery, literalSearch, today } = require('../src/utils/clinicValidation');
const { validSlot, transitions } = require('../src/routes/appointments');
const createPatientRouter = require('../src/routes/patients');
const app = require('../src/app');

async function withServer(application, run) {
  const server = application.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('patient validation rejects impossible dates, future birthdays, and injection values', () => {
  const valid = { name: ' Fictional Patient ', birthDate: '2000-01-01', sex: 'Not specified', contact: '09123456789', address: '' };
  assert.deepEqual(patientInput(valid).errors, {}); assert.equal(patientInput(valid).data.name, 'Fictional Patient');
  for (const birthDate of ['2020-02-30', '2999-01-01', {}, '1880-01-01']) assert.ok(patientInput({ ...valid, birthDate }).errors.birthDate);
  assert.ok(patientInput({ ...valid, contact: {} }).errors.contact); assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(literalSearch('.*').test('Patient'), false); assert.equal(pageQuery({ page: '0' }), null);
});
test('clinic permissions reject inactive users and protect doctor-only routes', async () => {
  const application = express(); application.use((req, _res, next) => { req.user = { role: req.get('X-Role'), active: req.get('X-Active') !== 'false' }; next(); });
  application.get('/notes', roles('doctor'), (_req, res) => res.json({ allowed: true }));
  await withServer(application, async base => {
    for (const role of ['receptionist', 'admin']) assert.equal((await fetch(base + '/notes', { headers: { 'X-Role': role } })).status, 403);
    assert.equal((await fetch(base + '/notes', { headers: { 'X-Role': 'doctor' } })).status, 200);
    assert.equal((await fetch(base + '/notes', { headers: { 'X-Role': 'doctor', 'X-Active': 'false' } })).status, 403);
  });
});
test('patients are shared with staff, while doctors cannot write demographic records', async () => {
  let saved;
  const patients = { countDocuments: async filter => { assert.equal(filter.owner, undefined); return 1; }, find: filter => { assert.equal(filter.owner, undefined); const query = { sort: () => query, skip: () => query, limit: async () => [{ name: 'Shared Patient' }] }; return query; }, create: async input => { saved = input; return input; } };
  const application = express(); application.use(express.json()); application.use(createPatientRouter(patients, (req, _res, next) => { req.user = { _id: 'staff-id', role: req.get('X-Role'), active: true }; next(); }));
  await withServer(application, async base => {
    const read = await fetch(base, { headers: { 'X-Role': 'doctor' } }); assert.equal(read.status, 200); assert.equal((await read.json()).items[0].name, 'Shared Patient');
    const body = JSON.stringify({ name: 'Patient', birthDate: '2000-01-01', sex: 'Not specified', contact: '09123456789', address: '' });
    assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Role': 'doctor' }, body })).status, 403);
    assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Role': 'receptionist' }, body })).status, 201);
    assert.equal(saved.createdBy, 'staff-id');
    assert.equal((await fetch(base + '/0123456789abcdef01234567', { method: 'DELETE', headers: { 'X-Role': 'doctor' } })).status, 403);
    assert.equal((await fetch(base + '/bad-id', { method: 'DELETE', headers: { 'X-Role': 'receptionist' } })).status, 400);
  });
});
test('public registration is closed and appointment rules use 30-minute slots', async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-thirty-two-characters';
  await withServer(app, async base => { assert.equal((await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403); assert.equal((await fetch(base + '/api/staff')).status, 401); });
  assert.equal(validSlot('2026-10-15T01:30:00.000Z'), true); assert.equal(validSlot('2026-10-15T01:15:00.000Z'), false);
  assert.equal(transitions.Scheduled.includes('Completed'), false); assert.equal(transitions['Checked in'].includes('Scheduled'), false);
});
