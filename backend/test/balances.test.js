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

const addExpense = async (username, body) =>
  request(app)
    .post('/api/expenses')
    .set(await as(username))
    .send({ category: 'Other', payer_id: 'M01', split_type: 'equal', ...body });

const getBudget = async () => (await request(app).get('/api/budget').set(await as('ali'))).body;
const setBudget = async (amount) =>
  request(app).put('/api/budget').set(await as('ali')).send({ amount });

test.beforeEach(async () => {
  await request(app).post('/api/dev/reset');
});

test('balances start at zero', async () => {
  const { body } = await request(app).get('/api/balances').set(await as('ali'));
  assert.equal(body.total, 0);
  assert.deepEqual(body.balances.map((b) => b.net), [0, 0, 0]);
});

test('balances always total 0, even when splits leave leftover paisa', async () => {
  const everyone = [{ member_id: 'M01' }, { member_id: 'M02' }, { member_id: 'M03' }];
  for (const [i, amount] of [1000, 650, 0.01, 0.02, 33.33, 99.99, 1234.57].entries()) {
    const res = await addExpense('ali', { title: `Bill ${i}`, amount, payer_id: `M0${(i % 3) + 1}`, splits: everyone });
    assert.equal(res.status, 201);
    const { body } = await request(app).get('/api/balances').set(await as('ali'));
    assert.equal(body.total, 0);
    const sumInPaisa = body.balances.reduce((sum, b) => sum + Math.round(b.net * 100), 0);
    assert.equal(sumInPaisa, 0);
  }
});

test('deleting an expense removes it from balances', async () => {
  const { body: expense } = await addExpense('ali', { title: 'Temp', amount: 300, splits: [{ member_id: 'M01' }, { member_id: 'M02' }] });
  await request(app).delete(`/api/expenses/${expense.id}`).set(await as('ali'));
  const { body } = await request(app).get('/api/balances').set(await as('ali'));
  assert.deepEqual(body.balances.map((b) => b.net), [0, 0, 0]);
});

test('budget status changes exactly at 75% and 100%', async () => {
  const single = [{ member_id: 'M01' }];
  await addExpense('ali', { title: 'A', amount: 3749.99, splits: single });
  let budget = await getBudget();
  assert.equal(budget.status, 'On Track');
  assert.equal(budget.percent_used, 75, 'rounds to 75.0 but is still under the line');

  await addExpense('ali', { title: 'B', amount: 0.01, splits: single });
  budget = await getBudget();
  assert.equal(budget.status, 'Near Limit');
  assert.equal(budget.percent_used, 75);

  await addExpense('ali', { title: 'C', amount: 1249.99, splits: single });
  budget = await getBudget();
  assert.equal(budget.status, 'Near Limit');
  assert.equal(budget.remaining, 0.01);

  await addExpense('ali', { title: 'D', amount: 0.01, splits: single });
  budget = await getBudget();
  assert.equal(budget.status, 'Over Budget');
  assert.equal(budget.percent_used, 100);
  assert.equal(budget.remaining, 0);
});

test('remaining can go negative', async () => {
  await addExpense('ali', { title: 'Huge', amount: 6000, splits: [{ member_id: 'M01' }] });
  const budget = await getBudget();
  assert.equal(budget.remaining, -1000);
  assert.equal(budget.percent_used, 120);
  assert.equal(budget.status, 'Over Budget');
});

test('PUT /budget updates the budget and validates the amount', async () => {
  const ok = await setBudget(6000);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.budget, 6000);
  assert.deepEqual(Object.keys(ok.body).sort(), ['budget', 'month', 'percent_used', 'remaining', 'spent', 'status']);

  for (const bad of [0, -1, 10.005, 'lots']) {
    const res = await setBudget(bad);
    assert.equal(res.status, 400, String(bad));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('budget counts only the requested month', async () => {
  await addExpense('ali', { title: 'Old', amount: 500, date: '2026-01-10', splits: [{ member_id: 'M01' }] });
  assert.equal((await getBudget()).spent, 0);
  const jan = await request(app).get('/api/budget?month=2026-01').set(await as('ali'));
  assert.equal(jan.body.spent, 500);
  assert.equal(jan.body.month, '2026-01');
});

test('activity merges all types newest first with the exact shape', async () => {
  await request(app).post('/api/dev/reset?seed=benchmark');
  const settled = await request(app)
    .post('/api/settle')
    .set(await as('ayesha'))
    .send({ sender_id: 'M02', recipient_id: 'M01', amount: 250 });
  assert.equal(settled.status, 201);

  const { body } = await request(app).get('/api/activity').set(await as('ali'));
  assert.deepEqual(body.map((a) => a.type), ['settlement', 'expense', 'expense', 'expense', 'checkout']);
  assert.deepEqual(body.map((a) => a.title), [
    'Ayesha paid Ali', 'Electricity Bill', 'Internet Bill', 'Cleaning Supplies', 'Shopping: Milk, Rice',
  ]);

  const [settlement, electricity, internet, cleaning, checkout] = body;
  assert.equal(settlement.id, `settlement-${settled.body.id}`);
  assert.equal(settlement.actor_name, 'Ayesha');
  assert.equal(settlement.counterparty_name, 'Ali');
  assert.equal(settlement.category, null);
  assert.equal(settlement.amount, 250);

  assert.equal(electricity.counterparty_name, null);
  assert.equal(electricity.split_count, 3);
  assert.equal(internet.split_type, 'custom');
  assert.equal(cleaning.split_count, 2);
  assert.match(checkout.id, /^expense-\d+$/);
  assert.equal(checkout.category, 'Groceries');

  assert.deepEqual(Object.keys(checkout).sort(), [
    'actor_id', 'actor_name', 'amount', 'category', 'counterparty_name', 'created_at',
    'id', 'split_count', 'split_type', 'title', 'type',
  ]);

  const limited = await request(app).get('/api/activity?limit=2').set(await as('ali'));
  assert.equal(limited.body.length, 2);
  const bad = await request(app).get('/api/activity?limit=0').set(await as('ali'));
  assert.equal(bad.status, 400);
});
