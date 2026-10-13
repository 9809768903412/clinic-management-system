const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createLoginRouter } = require('../src/routes/login');
const { hashPassword } = require('../src/utils/password');

test('login rejects bad credentials and sets a signed HttpOnly cookie', async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-thirty-two-characters';
  const user = { _id: 'abc', name: 'Student', email: 'student@example.com', passwordHash: await hashPassword('school-password') };
  const app = express(); app.use(express.json());
  app.use('/api/auth', createLoginRouter({ findOne: query => ({ select: async () => query.email === user.email ? user : null }) }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({})).status, 400);
    for (const email of [user.email, 'unknown@example.com']) assert.equal((await post({ email, password: 'wrong' })).status, 401);
    const response = await post({ email: ' STUDENT@EXAMPLE.COM ', password: 'school-password' });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/);
    assert.equal(jwt.verify(cookie.match(/access_token=([^;]+)/)[1], process.env.JWT_SECRET, { algorithms: ['HS256'] }).sub, 'abc');
    assert.equal((await response.json()).user.passwordHash, undefined);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
