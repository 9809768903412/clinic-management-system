const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const createRequireAuth = require('../src/middleware/auth');

test('protected API rejects missing, invalid, expired, revoked, and deleted-user sessions', async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-thirty-two-characters';
  const id = '0123456789abcdef01234567';
  let exists = true;
  const app = express();
  app.get('/private', createRequireAuth({ findById: async () => exists ? { _id: id, authVersion: 1 } : null }), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const get = token => fetch(`http://127.0.0.1:${server.address().port}/private`, { headers: token ? { Cookie: `access_token=${token}` } : {} });
  const token = (version, expiresIn = '1h') => jwt.sign({ version }, process.env.JWT_SECRET, { subject: id, expiresIn });
  try {
    for (const value of [undefined, 'invalid', token(0), token(1, -1)]) assert.equal((await get(value)).status, 401);
    const success = await get(token(1)); assert.equal(success.status, 200); assert.equal(success.headers.get('cache-control'), 'no-store');
    exists = false; assert.equal((await get(token(1))).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
