const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createVercelHandler = require('../src/vercelHandler');

test('serverless handler waits for readiness and hides setup failures', async () => {
  let ready = false;
  const app = express(); app.get('/api/check', (_req, res) => { assert.equal(ready, true); res.json({ ok: true }); });
  const server = express();
  server.use('/unavailable', createVercelHandler(async () => { throw new Error('private database credentials'); }, app));
  server.use(createVercelHandler(async () => { ready = true; }, app));
  const listener = server.listen(0, '127.0.0.1'); await new Promise(resolve => listener.once('listening', resolve));
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const success = await fetch(`${base}/api/check`); assert.equal(success.status, 200); assert.deepEqual(await success.json(), { ok: true });
    const unavailable = await fetch(`${base}/unavailable`); assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get('cache-control'), 'no-store'); assert.equal(JSON.stringify(await unavailable.json()).includes('private'), false);
  } finally { await new Promise(resolve => listener.close(resolve)); }
});
