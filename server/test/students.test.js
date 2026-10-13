const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createStudentRouter = require('../src/routes/students');

function matches(row, query) {
  return Object.entries(query).every(([key, value]) => key === '$or' ? value.some(condition => matches(row, condition)) : value instanceof RegExp ? value.test(row[key]) : row[key] === value);
}
function store() {
  const rows = []; let number = 1;
  return {
    rows,
    create: async data => { const row = { ...data, _id: String(number++).padStart(24, '0') }; rows.push(row); return row; },
    find: query => {
      let result = rows.filter(row => matches(row, query)).slice().reverse();
      const chain = { sort: () => chain, skip: n => { result = result.slice(n); return chain; }, limit: n => { result = result.slice(0, n); return chain; }, then: resolve => Promise.resolve(result).then(resolve) };
      return chain;
    },
    distinct: async (field, query) => [...new Set(rows.filter(row => matches(row, query)).map(row => row[field]))],
    countDocuments: async query => rows.filter(row => matches(row, query)).length,
    findOneAndUpdate: async (query, update) => { const row = rows.find(row => matches(row, query)); if (!row) return null; Object.assign(row, update.$set); return row; },
    findOneAndDelete: async query => { const index = rows.findIndex(row => matches(row, query)); return index < 0 ? null : rows.splice(index, 1)[0]; },
  };
}
async function withApi(run) {
  const data = store(); const app = express(); app.use(express.json());
  app.use('/students', createStudentRouter(data, (req, res, next) => { if (!req.get('X-Test-User')) return res.sendStatus(401); req.user = { _id: req.get('X-Test-User') }; next(); }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const request = (method, path = '', body, owner = 'owner-a') => fetch(`http://127.0.0.1:${server.address().port}/students${path}`, { method, headers: { 'Content-Type': 'application/json', ...(owner ? { 'X-Test-User': owner } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  try { await run(request, data); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('student CRUD validates input, persists changes through the adapter, and isolates owners', async () => {
  await withApi(async request => {
    assert.equal((await request('GET', '', undefined, null)).status, 401);
    assert.equal((await request('POST', '', { name: 'A', course: '', age: 1.5 })).status, 400);
    const response = await request('POST', '', { name: ' Alice ', course: ' IT ', age: 20, owner: 'owner-b' });
    assert.equal(response.status, 201); const { student } = await response.json(); assert.equal(student.owner, 'owner-a'); assert.equal(student.name, 'Alice');
    assert.equal((await request('PUT', '/bad-id', {})).status, 400);
    assert.equal((await request('PUT', `/${student._id}`, { name: 'Alice', course: 'CS', age: 21 }, 'owner-b')).status, 404);
    const updated = await request('PUT', `/${student._id}`, { name: 'Alice', course: 'CS', age: 21 }); assert.equal(updated.status, 200); assert.equal((await updated.json()).student.course, 'CS');
    assert.equal((await request('DELETE', `/${student._id}`, undefined, 'owner-b')).status, 404);
    const list = await request('GET'); assert.equal((await list.json()).items.length, 1);
    assert.equal((await request('DELETE', `/${student._id}`)).status, 204);
    assert.equal((await request('DELETE', `/${student._id}`)).status, 404);
  });
});
test('search is literal and account-scoped; pagination validates and clamps pages', async () => {
  await withApi(async (request, data) => {
    for (let n = 0; n < 12; n++) await data.create({ name: `Student ${n}`, course: 'IT', age: 20, owner: 'owner-a' });
    await data.create({ name: 'Other student', course: 'IT', age: 20, owner: 'owner-b' });
    const first = await (await request('GET', '?page=1&limit=10')).json(); assert.equal(first.items.length, 10); assert.equal(first.total, 12); assert.equal(first.pages, 2);
    const last = await (await request('GET', '?page=99&limit=10')).json(); assert.equal(last.page, 2); assert.equal(last.items.length, 2);
    const found = await (await request('GET', '?search=Student%2011')).json(); assert.equal(found.total, 1);
    const literal = await (await request('GET', '?search=%2E%2A')).json(); assert.equal(literal.total, 0);
    for (const query of ['?page=0', '?limit=999', '?page=abc', '?search=a&search=b']) assert.equal((await request('GET', query)).status, 400);
  });
});

 test('dashboard summary includes only current account records', async () => {
  await withApi(async (request, data) => {
    await data.create({ name: 'Alice', course: 'IT', age: 20, owner: 'owner-a' });
    await data.create({ name: 'Bob', course: 'CS', age: 21, owner: 'owner-b' });
    const response = await request('GET', '/summary'); assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.total, 1); assert.equal(result.courses, 1); assert.equal(result.latest[0].name, 'Alice');
  });
});
