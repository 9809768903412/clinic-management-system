const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const createSessionRouter = require('../src/routes/session');

test('logout clears cookie and revokes old tokens', async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-thirty-two-characters';
  const user = { _id: '0123456789abcdef01234567', name: 'Student', email: 'student@example.com', authVersion: 0 };
  const users = { findById: async () => user, updateOne: async () => { user.authVersion += 1; } };
  const token = jwt.sign({ version: 0 }, process.env.JWT_SECRET, { subject: user._id, expiresIn: '1h' });
  const app = express(); app.use('/api/auth', createSessionRouter(users));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const options = { headers: { Cookie: `access_token=${token}` } };
  try {
    const me = await fetch(`${base}/me`, options); assert.equal(me.status, 200);
    assert.deepEqual((await me.json()).user, { id: user._id, name: user.name, email: user.email });
    const logout = await fetch(`${base}/logout`, { ...options, method: 'POST' });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie'), /access_token=;/);
    assert.equal(user.authVersion, 1);
    assert.equal((await fetch(`${base}/me`, options)).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
