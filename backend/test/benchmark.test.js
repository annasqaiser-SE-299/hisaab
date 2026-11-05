process.env.DB_PATH = ':memory:';

// The official benchmark from the challenge brief. Every number must match exactly.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

async function as(username) {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'pass1234' });
  assert.equal(res.status, 200);
  return { Authorization: `Bearer ${res.body.token}` };
}

const netsOf = (body) => Object.fromEntries(body.balances.map((b) => [b.name, b.net]));

test('official benchmark, end to end', async () => {
  const seeded = await request(app).post('/api/dev/reset?seed=benchmark');
  assert.deepEqual(seeded.body, { ok: true, seeded: true });

  const ayesha = await as('ayesha');

  // Budget before settlements
  const budget = (await request(app).get('/api/budget').set(ayesha)).body;
  assert.equal(budget.spent, 4200);
  assert.equal(budget.budget, 5000);
  assert.equal(budget.remaining, 800);
  assert.equal(budget.percent_used, 84);
  assert.equal(budget.status, 'Near Limit');

  // Balances before settlements
  const before = (await request(app).get('/api/balances').set(ayesha)).body;
  assert.equal(before.total, 0);
  const [ali, aye, bilal] = before.balances;
  assert.deepEqual([ali.name, ali.paid, ali.share, ali.net], ['Ali', 1800, 1550, 250]);
  assert.deepEqual([aye.name, aye.paid, aye.share, aye.net], ['Ayesha', 900, 1350, -450]);
  assert.deepEqual([bilal.name, bilal.paid, bilal.share, bilal.net], ['Bilal', 1500, 1300, 200]);

  // Expenses and splits
  const expenses = (await request(app).get('/api/expenses').set(ayesha)).body;
  assert.deepEqual(expenses.map((e) => [e.title, e.amount]), [
    ['Electricity Bill', 1020],
    ['Internet Bill', 1500],
    ['Cleaning Supplies', 900],
    ['Shopping: Milk, Rice', 780],
  ]);
  const shareOf = (title) => expenses.find((e) => e.title === title).splits.map((s) => s.amount);
  assert.deepEqual(shareOf('Shopping: Milk, Rice'), [260, 260, 260]);
  assert.deepEqual(shareOf('Cleaning Supplies'), [450, 450]);
  assert.deepEqual(shareOf('Internet Bill'), [500, 300, 700]);
  assert.deepEqual(shareOf('Electricity Bill'), [340, 340, 340]);

  // Shopping list: 3 pending, 2 bought
  const pending = (await request(app).get('/api/shopping?status=pending').set(ayesha)).body;
  assert.deepEqual(pending.map((i) => i.title).sort(), ['Bread', 'Cooking Oil', 'Eggs']);
  const bought = (await request(app).get('/api/shopping?status=bought').set(ayesha)).body;
  assert.deepEqual(bought.map((i) => i.title).sort(), ['Milk', 'Rice']);

  // Settlement 1: Ayesha pays Ali 250
  const first = await request(app)
    .post('/api/settle')
    .set(ayesha)
    .send({ sender_id: 'M02', recipient_id: 'M01', amount: 250 });
  assert.equal(first.status, 201);
  const afterFirst = (await request(app).get('/api/balances').set(ayesha)).body;
  assert.deepEqual(netsOf(afterFirst), { Ali: 0, Ayesha: -200, Bilal: 200 });
  assert.equal(afterFirst.total, 0);

  // Settlement 2: Ayesha pays Bilal 200
  const second = await request(app)
    .post('/api/settle')
    .set(ayesha)
    .send({ sender_id: 'M02', recipient_id: 'M03', amount: 200 });
  assert.equal(second.status, 201);
  const afterSecond = (await request(app).get('/api/balances').set(ayesha)).body;
  assert.deepEqual(netsOf(afterSecond), { Ali: 0, Ayesha: 0, Bilal: 0 });
  assert.equal(afterSecond.total, 0);

  // Settlements don't change spending
  const finalBudget = (await request(app).get('/api/budget').set(ayesha)).body;
  assert.equal(finalBudget.spent, 4200);
  assert.equal(finalBudget.status, 'Near Limit');
});

test('dev reset wipes data and can run repeatedly', async () => {
  await request(app).post('/api/dev/reset?seed=benchmark');
  await request(app).post('/api/dev/reset?seed=benchmark');
  const ayesha = await as('ayesha');
  assert.equal((await request(app).get('/api/budget').set(ayesha)).body.spent, 4200, 'not doubled');

  const empty = await request(app).post('/api/dev/reset');
  assert.deepEqual(empty.body, { ok: true, seeded: false });
  assert.equal((await request(app).get('/api/budget').set(ayesha)).body.spent, 0);
  assert.deepEqual((await request(app).get('/api/shopping').set(ayesha)).body, []);

  const bad = await request(app).post('/api/dev/reset?seed=nope');
  assert.equal(bad.status, 400);
});

test('dev reset restores a changed budget and keeps logins working', async () => {
  const ali = await as('ali');
  await request(app).put('/api/budget').set(ali).send({ amount: 9000 });
  await request(app).post('/api/dev/reset');
  const res = await request(app).get('/api/budget').set(ali);
  assert.equal(res.status, 200, 'old tokens stay valid because members are kept');
  assert.equal(res.body.budget, 5000);
});
