process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

const tokens = {};

async function as(username) {
  if (!tokens[username]) {
    const res = await request(app).post('/api/auth/login').send({ username, password: 'pass1234' });
    tokens[username] = res.body.token;
  }
  return { Authorization: `Bearer ${tokens[username]}` };
}

const settle = async (username, sender_id, recipient_id, amount, headers = {}) =>
  request(app)
    .post('/api/settle')
    .set({ ...(await as(username)), ...headers })
    .send({ sender_id, recipient_id, amount });

function assertRejected(res, status, code, message) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
  if (message) assert.equal(res.body.error.message, message);
}

test.beforeEach(async () => {
  // Benchmark nets: Ali +250, Ayesha -450, Bilal +200
  await request(app).post('/api/dev/reset?seed=benchmark');
});

test('rule 1: amount must be positive with at most 2 decimals', async () => {
  for (const amount of [0, -10, 10.005]) {
    assertRejected(await settle('ayesha', 'M02', 'M01', amount), 400, 'VALIDATION_ERROR');
  }
  assertRejected(await settle('ayesha', 'M02', 'M01', '50'), 400, 'VALIDATION_ERROR');
});

test('rule 2: recipient must exist', async () => {
  assertRejected(await settle('ayesha', 'M02', 'M09', 50), 404, 'NOT_FOUND');
});

test('rule 3: sender must be the logged-in member', async () => {
  assertRejected(await settle('ali', 'M02', 'M01', 50), 403, 'SENDER_MUST_BE_YOU');
});

test('rule 4: no paying yourself', async () => {
  assertRejected(await settle('ayesha', 'M02', 'M02', 50), 400, 'SETTLEMENT_INVALID', "You can't pay yourself.");
});

test('rule 5: sender must owe money', async () => {
  assertRejected(await settle('ali', 'M01', 'M03', 50), 400, 'SETTLEMENT_INVALID', "You don't owe anything right now.");
});

test('rule 6: recipient must be owed money', async () => {
  await settle('ayesha', 'M02', 'M01', 250);
  assertRejected(await settle('ayesha', 'M02', 'M01', 50), 400, 'SETTLEMENT_INVALID', "Ali isn't owed anything right now.");
});

test("rule 7: can't exceed the recipient's credit", async () => {
  assertRejected(
    await settle('ayesha', 'M02', 'M01', 250.01),
    400,
    'SETTLEMENT_INVALID',
    "Amount exceeds Ali's credit of PKR 250.00."
  );
});

test("rule 7: can't exceed the sender's debt", async () => {
  // Bilal takes the whole share of a bill Ali paid, so Ali's credit passes Ayesha's debt.
  await request(app)
    .post('/api/expenses')
    .set(await as('ali'))
    .send({
      title: 'Big Bill',
      category: 'Other',
      amount: 1000,
      payer_id: 'M01',
      split_type: 'custom',
      splits: [{ member_id: 'M03', amount: 1000 }],
    });
  // Now Ayesha owes 450 and Ali is owed 1,250.
  assertRejected(
    await settle('ayesha', 'M02', 'M01', 450.01),
    400,
    'SETTLEMENT_INVALID',
    'Amount exceeds your debt of PKR 450.00.'
  );
});

test('rules run in order: self-payment is reported before the debt check', async () => {
  assertRejected(await settle('ali', 'M01', 'M01', 50), 400, 'SETTLEMENT_INVALID', "You can't pay yourself.");
});

test('a valid settlement returns the Settlement shape and is listed newest first', async () => {
  const first = await settle('ayesha', 'M02', 'M01', 100.5);
  assert.equal(first.status, 201);
  assert.deepEqual(Object.keys(first.body).sort(), [
    'amount', 'created_at', 'id', 'recipient_id', 'recipient_name', 'sender_id', 'sender_name',
  ]);
  assert.equal(first.body.amount, 100.5);
  assert.equal(first.body.sender_name, 'Ayesha');
  assert.equal(first.body.recipient_name, 'Ali');

  const second = await settle('ayesha', 'M02', 'M03', 50);
  const list = await request(app).get('/api/settlements').set(await as('bilal'));
  assert.deepEqual(list.body.map((s) => s.id), [second.body.id, first.body.id]);
});

test('settlements do not change household spending', async () => {
  const spent = async () => (await request(app).get('/api/budget').set(await as('ali'))).body.spent;
  const before = await spent();
  await settle('ayesha', 'M02', 'M01', 250);
  assert.equal(await spent(), before);
});

test('idempotency: a retried settlement is recorded once', async () => {
  const headers = { 'Idempotency-Key': 'settle-1' };
  const first = await settle('ayesha', 'M02', 'M01', 250, headers);
  const retry = await settle('ayesha', 'M02', 'M01', 250, headers);
  assert.equal(first.status, 201);
  assert.equal(retry.status, 201, 'without the key this would fail rule 6');
  assert.deepEqual(retry.body, first.body);

  const list = await request(app).get('/api/settlements').set(await as('ali'));
  assert.equal(list.body.length, 1);
});
