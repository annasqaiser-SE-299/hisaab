process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const openapi = require('../src/openapi');

const operations = Object.entries(openapi.paths).flatMap(([path, methods]) =>
  Object.keys(methods).map((method) => ({ path, method }))
);

test('the Swagger page loads without a token', async () => {
  const res = await request(app).get('/api/docs/');
  assert.equal(res.status, 200);
  assert.match(res.text, /swagger-ui/);
});

test('the docs list all 19 endpoints', () => {
  assert.equal(operations.length, 19);
});

test('every documented endpoint reaches a real route', async () => {
  const login = await request(app).post('/api/auth/login').send({ username: 'ali', password: 'pass1234' });
  const headers = { Authorization: `Bearer ${login.body.token}` };

  for (const { path, method } of operations) {
    const url = `/api${path.replace('{id}', '1')}`;
    const res = await request(app)[method](url).set(headers);
    // This exact message only comes from the catch-all handler for unknown routes.
    assert.notEqual(res.body.error?.message, 'That resource does not exist.', `${method} ${url}`);
  }
});
