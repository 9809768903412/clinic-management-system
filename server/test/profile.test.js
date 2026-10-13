const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const createSessionRouter = require('../src/routes/session');

test('profile validates names, updates only the authenticated account, and omits secrets', async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-thirty-two-characters';
  const user = { _id: '0123456789abcdef01234567', name: 'Student', email: 'student@example.com', authVersion: 0, passwordHash: 'private' };
  let writes = 0;
  const users = { findById: async () => user, findByIdAndUpdate: async (id, update) => { assert.equal(id, user._id); assert.deepEqual(Object.keys(update.$set), ['name']); writes++; Object.assign(user, update.$set); return user; } };
  const app = express(); app.use(express.json()); app.use('/api/auth', createSessionRouter(users));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const token = jwt.sign({ version: 0 }, process.env.JWT_SECRET, { subject: user._id, expiresIn: '1h' });
  const patch = (body, cookie = token) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: `access_token=${cookie}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await patch({ name: 'Someone' }, null)).status, 401);
    for (const name of ['', 'a', {}, 'x'.repeat(81)]) assert.equal((await patch({ name })).status, 400);
    assert.equal(writes, 0);
    const response = await patch({ name: ' Updated Name ', email: 'hacker@example.com', authVersion: 999 }); assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).user, { id: user._id, name: 'Updated Name', email: 'student@example.com' });
    assert.equal(user.authVersion, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
