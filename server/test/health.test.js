const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('health reports database unavailable and unknown routes return JSON 404', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: 'database-unavailable', database: 'disconnected' });
    const missing = await fetch(`${base}/api/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'Route not found.' });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
