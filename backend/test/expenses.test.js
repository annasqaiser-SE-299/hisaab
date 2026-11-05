process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { todayKarachi } = require('../src/services/dates');

const tokens = {};

async function as(username) {
  if (!tokens[username]) {
    const res = await request(app).post('/api/auth/login').send({ username, password: 'pass1234' });
    tokens[username] = res.body.token;
  }
  return { Authorization: `Bearer ${tokens[username]}` };
}

const addItem = async (username, title) =>
  request(app)
    .post('/api/shopping')
    .set(await as(username))
    .send({ title, unit: 'pack', requested_qty: 1 });

const EQUAL_ALL = [{ member_id: 'M01' }, { member_id: 'M02' }, { member_id: 'M03' }];

test('routes require a token', async () => {
  for (const path of ['/api/members', '/api/shopping', '/api/expenses']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  }
});

test('shopping: validates input and returns the Item shape', async () => {
  const bad = await request(app)
    .post('/api/shopping')
    .set(await as('ali'))
    .send({ title: 'Milk', unit: 'crate', requested_qty: 1 });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');

  const res = await addItem('ali', 'Milk');
  assert.equal(res.status, 201);
  assert.deepEqual(Object.keys(res.body).sort(), [
    'created_at', 'created_by', 'created_by_name', 'expense_id', 'id', 'requested_qty', 'status', 'title', 'unit',
  ]);
  assert.equal(res.body.created_by_name, 'Ali');
  assert.equal(res.body.status, 'pending');
});

test('shopping delete: only the creator, only while pending', async () => {
  const item = (await addItem('ali', 'Soap')).body;

  const notMine = await request(app).delete(`/api/shopping/${item.id}`).set(await as('bilal'));
  assert.equal(notMine.status, 403);
  assert.equal(notMine.body.error.code, 'NOT_OWNER');

  const mine = await request(app).delete(`/api/shopping/${item.id}`).set(await as('ali'));
  assert.equal(mine.status, 204);

  const gone = await request(app).delete(`/api/shopping/${item.id}`).set(await as('ali'));
  assert.equal(gone.status, 404);
});

test('checkout: posts an equal-split expense and blocks a second checkout', async () => {
  const eggs = (await addItem('ali', 'Eggs')).body;
  const bread = (await addItem('bilal', 'Bread')).body;
  const body = {
    item_ids: [eggs.id, bread.id],
    total_paid: 650,
    payer_id: 'M01',
    split_members: ['M03', 'M01', 'M02'],
  };

  const res = await request(app).post('/api/shopping/checkout').set(await as('ali')).send(body);
  assert.equal(res.status, 201);
  assert.equal(res.body.expense.title, 'Shopping: Eggs, Bread');
  assert.equal(res.body.expense.category, 'Groceries');
  assert.equal(res.body.expense.source, 'checkout');
  assert.deepEqual(res.body.expense.splits.map((s) => s.amount), [216.67, 216.67, 216.66]);
  assert.ok(res.body.items.every((i) => i.status === 'bought' && i.expense_id === res.body.expense.id));

  const again = await request(app).post('/api/shopping/checkout').set(await as('ali')).send(body);
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'ITEM_ALREADY_BOUGHT');
  assert.match(again.body.error.message, /Eggs/);

  const bought = await request(app).delete(`/api/shopping/${eggs.id}`).set(await as('ali'));
  assert.equal(bought.status, 409);
  assert.equal(bought.body.error.code, 'ITEM_BOUGHT');
});

test('checkout: a failure part-way changes nothing', async () => {
  const pending = (await addItem('ali', 'Tea')).body;
  const before = (await request(app).get('/api/expenses').set(await as('ali'))).body.length;

  const res = await request(app)
    .post('/api/shopping/checkout')
    .set(await as('ali'))
    .send({ item_ids: [pending.id, 99999], total_paid: 100, payer_id: 'M01', split_members: ['M01'] });
  assert.equal(res.status, 404);

  const item = (await request(app).get('/api/shopping').set(await as('ali'))).body.find((i) => i.id === pending.id);
  assert.equal(item.status, 'pending');
  const after = (await request(app).get('/api/expenses').set(await as('ali'))).body.length;
  assert.equal(after, before);
});

test('deleting a checkout expense puts its items back to pending', async () => {
  const jam = (await addItem('ali', 'Jam')).body;
  const { expense } = (
    await request(app)
      .post('/api/shopping/checkout')
      .set(await as('ali'))
      .send({ item_ids: [jam.id], total_paid: 300, payer_id: 'M02', split_members: ['M01', 'M02'] })
  ).body;

  const detail = await request(app).get(`/api/expenses/${expense.id}`).set(await as('bilal'));
  assert.deepEqual(detail.body.items.map((i) => i.title), ['Jam']);

  const notMine = await request(app).delete(`/api/expenses/${expense.id}`).set(await as('ayesha'));
  assert.equal(notMine.status, 403, 'the payer is not the creator');

  const res = await request(app).delete(`/api/expenses/${expense.id}`).set(await as('ali'));
  assert.equal(res.status, 204);

  const item = (await request(app).get('/api/shopping').set(await as('ali'))).body.find((i) => i.id === jam.id);
  assert.equal(item.status, 'pending');
  assert.equal(item.expense_id, null);

  const gone = await request(app).get(`/api/expenses/${expense.id}`).set(await as('ali'));
  assert.equal(gone.status, 404);
});

test('expense: 1000.00 equal gives 333.34, 333.33, 333.33 with the Expense shape', async () => {
  const res = await request(app)
    .post('/api/expenses')
    .set(await as('ali'))
    .send({ title: 'Water Bill', category: 'Utilities', amount: 1000, payer_id: 'M01', split_type: 'equal', splits: EQUAL_ALL });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.splits.map((s) => s.amount), [333.34, 333.33, 333.33]);
  assert.equal(res.body.date, todayKarachi());
  assert.equal(res.body.source, 'manual');
  assert.equal(res.body.payer_name, 'Ali');
  assert.equal(res.body.amount_paisa, undefined);
});

test('expense: custom split must add up exactly, and a 0 share may be sent', async () => {
  const body = {
    title: 'Gas Bill',
    category: 'Utilities',
    amount: 100.1,
    payer_id: 'M02',
    split_type: 'custom',
    splits: [{ member_id: 'M01', amount: 50.05 }, { member_id: 'M02', amount: 50 }],
  };
  const off = await request(app).post('/api/expenses').set(await as('ayesha')).send(body);
  assert.equal(off.status, 400);
  assert.match(off.body.error.message, /Shares add up to PKR 100.05/);

  body.splits.push({ member_id: 'M03', amount: 0.05 });
  const ok = await request(app).post('/api/expenses').set(await as('ayesha')).send(body);
  assert.equal(ok.status, 201);

  const zero = await request(app)
    .post('/api/expenses')
    .set(await as('ayesha'))
    .send({ ...body, title: 'Zero share', amount: 10, splits: [{ member_id: 'M01', amount: 10 }, { member_id: 'M03', amount: 0 }] });
  assert.equal(zero.status, 201);
  assert.deepEqual(zero.body.splits.map((s) => s.member_id), ['M01']);
});

test('expense: rejects bad amounts, dates and members', async () => {
  const base = { title: 'X', category: 'Other', amount: 10, payer_id: 'M01', split_type: 'equal', splits: EQUAL_ALL };
  const post = async (changes) =>
    request(app).post('/api/expenses').set(await as('ali')).send({ ...base, ...changes });

  for (const changes of [
    { amount: 0 },
    { amount: -5 },
    { amount: 10.005 },
    { amount: '10' },
    { date: '2099-01-01' },
    { date: '2026-02-31' },
    { payer_id: 'M09' },
    { category: 'Food' },
    { title: '   ' },
    { splits: [] },
    { splits: [{ member_id: 'M01' }, { member_id: 'M01' }] },
    { splits: [{ member_id: 'M09' }] },
    { split_type: 'custom', splits: [{ member_id: 'M01' }] },
  ]) {
    const res = await post(changes);
    assert.equal(res.status, 400, JSON.stringify(changes));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', JSON.stringify(changes));
  }
});

test('expense: a past date is allowed and filed under its own month', async () => {
  const res = await request(app)
    .post('/api/expenses')
    .set(await as('ali'))
    .send({ title: 'Old bill', category: 'Other', amount: 10, payer_id: 'M01', date: '2026-01-15', split_type: 'equal', splits: EQUAL_ALL });
  assert.equal(res.status, 201);

  const jan = await request(app).get('/api/expenses?month=2026-01').set(await as('ali'));
  assert.deepEqual(jan.body.map((e) => e.title), ['Old bill']);
  const current = await request(app).get('/api/expenses').set(await as('ali'));
  assert.ok(!current.body.some((e) => e.title === 'Old bill'));

  const bad = await request(app).get('/api/expenses?month=2026-13').set(await as('ali'));
  assert.equal(bad.status, 400);
});

test('duplicate guard: warns on a normalised title match unless confirmed', async () => {
  const body = { title: 'Internet Bill', category: 'Utilities', amount: 1500, payer_id: 'M03', split_type: 'equal', splits: EQUAL_ALL };
  const first = await request(app).post('/api/expenses').set(await as('bilal')).send(body);
  assert.equal(first.status, 201);

  const dup = await request(app)
    .post('/api/expenses')
    .set(await as('ali'))
    .send({ ...body, title: '  internet   BILL ' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'DUPLICATE_SUSPECTED');
  assert.equal(dup.body.error.details.duplicate.id, first.body.id);
  assert.equal(dup.body.error.details.duplicate.payer_name, 'Bilal');
  assert.equal(dup.body.error.details.duplicate.amount, 1500);

  const otherPayer = await request(app).post('/api/expenses').set(await as('bilal')).send({ ...body, payer_id: 'M01' });
  assert.equal(otherPayer.status, 201);

  const otherAmount = await request(app).post('/api/expenses').set(await as('bilal')).send({ ...body, amount: 1501 });
  assert.equal(otherAmount.status, 201);

  const confirmed = await request(app)
    .post('/api/expenses')
    .set(await as('bilal'))
    .send({ ...body, confirm_duplicate: true });
  assert.equal(confirmed.status, 201);
});

test('idempotency: same key replays the response and creates one row', async () => {
  const body = { title: 'Retry Test', category: 'Other', amount: 90, payer_id: 'M01', split_type: 'equal', splits: EQUAL_ALL };
  const headers = { ...(await as('ali')), 'Idempotency-Key': 'key-1' };

  const first = await request(app).post('/api/expenses').set(headers).send(body);
  const second = await request(app).post('/api/expenses').set(headers).send(body);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.deepEqual(second.body, first.body);

  const rows = (await request(app).get('/api/expenses').set(await as('ali'))).body.filter((e) => e.title === 'Retry Test');
  assert.equal(rows.length, 1);
});

test('idempotency: errors are not stored, and keys are per member', async () => {
  const body = { title: 'Fixable', category: 'Other', amount: 0, payer_id: 'M01', split_type: 'equal', splits: EQUAL_ALL };
  const ali = { ...(await as('ali')), 'Idempotency-Key': 'key-2' };

  const failed = await request(app).post('/api/expenses').set(ali).send(body);
  assert.equal(failed.status, 400);

  const fixed = await request(app).post('/api/expenses').set(ali).send({ ...body, amount: 30 });
  assert.equal(fixed.status, 201);

  const bilal = { ...(await as('bilal')), 'Idempotency-Key': 'key-2' };
  const other = await request(app).post('/api/expenses').set(bilal).send({ ...body, title: 'Bilal own', amount: 30 });
  assert.equal(other.status, 201);
  assert.notEqual(other.body.id, fixed.body.id);
});

test('idempotency: a retried checkout replays instead of returning 409', async () => {
  const item = (await addItem('ali', 'Rice')).body;
  const headers = { ...(await as('ali')), 'Idempotency-Key': 'key-3' };
  const body = { item_ids: [item.id], total_paid: 100, payer_id: 'M01', split_members: ['M01'] };

  const first = await request(app).post('/api/shopping/checkout').set(headers).send(body);
  const retry = await request(app).post('/api/shopping/checkout').set(headers).send(body);
  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.deepEqual(retry.body, first.body);
});

test('unknown routes and bad ids return the standard error shape', async () => {
  const unknown = await request(app).get('/api/nope').set(await as('ali'));
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'NOT_FOUND');

  const badId = await request(app).get('/api/expenses/abc').set(await as('ali'));
  assert.equal(badId.status, 400);
  assert.equal(badId.body.error.code, 'VALIDATION_ERROR');
});
