const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createRegisterRouter = require('../src/routes/register');
const { hashPassword, verifyPassword } = require('../src/utils/password');

async function withApi(users, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createRegisterRouter(users));
  app.use((error, _req, res, _next) => res.status(error.status === 400 ? 400 : 500).json({ message: error.status === 400 ? 'Invalid request body.' : 'An unexpected server error occurred.' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try { await run(post); } finally { await new Promise(resolve => server.close(resolve)); }
}
const valid = { name: ' Test Student ', email: ' STUDENT@EXAMPLE.COM ', password: 'school-password', confirmPassword: 'school-password' };

test('registration normalizes fields, hashes password, and omits secrets', async () => {
  let saved;
  await withApi({ create: async input => { saved = input; return { _id: 'user-id', ...input }; } }, async post => {
    const response = await post(valid);
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.deepEqual(body.user, { id: 'user-id', name: 'Test Student', email: 'student@example.com' });
    assert.equal(saved.password, undefined);
    assert.equal(saved.confirmPassword, undefined);
    assert.equal(await verifyPassword(valid.password, saved.passwordHash), true);
    assert.equal(await verifyPassword('wrong-password', saved.passwordHash), false);
    assert.equal(JSON.stringify(body).includes(saved.passwordHash), false);
  });
});

test('invalid input is rejected without writing a user', async () => {
  await withApi({ create: async () => assert.fail('Invalid input reached persistence') }, async post => {
    for (const input of [null, {}, { name: {}, email: [], password: 123, confirmPassword: 123 }, { ...valid, password: 'short' }, { ...valid, confirmPassword: 'different' }]) {
      const response = await post(input);
      assert.equal(response.status, 400);
    }
  });
});

test('duplicate email returns 409 and storage failure hides details', async () => {
  await withApi({ create: async () => { throw Object.assign(new Error('private'), { code: 11000 }); } }, async post => {
    const response = await post(valid);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).errors.email, 'This email is already registered.');
  });
  await withApi({ create: async () => { throw new Error('private database details'); } }, async post => {
    const response = await post(valid);
    assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await response.json()).includes('private'), false);
  });
});

test('identical passwords have different salted hashes', async () => {
  const first = await hashPassword(valid.password);
  const second = await hashPassword(valid.password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(valid.password, first), true);
});
