const test = require('node:test');
const assert = require('node:assert/strict');
const { toPaisa, toRupees, formatPKR } = require('../src/services/money');
const { equalSplit, validateCustomSplit } = require('../src/services/splits');

const MEMBERS = ['M01', 'M02', 'M03'];
const shares = (splits) => splits.map((s) => s.share_paisa);

test('equalSplit: 1000.00 over 3 is 333.34, 333.33, 333.33', () => {
  assert.deepEqual(shares(equalSplit(100000, MEMBERS)), [33334, 33333, 33333]);
});

test('equalSplit: 650.00 over 3 is 216.67, 216.67, 216.66', () => {
  assert.deepEqual(shares(equalSplit(65000, MEMBERS)), [21667, 21667, 21666]);
});

test('equalSplit: 900.00 over 2 is 450 each', () => {
  assert.deepEqual(shares(equalSplit(90000, ['M01', 'M02'])), [45000, 45000]);
});

test('equalSplit: 0.01 over 3 gives the single paisa to M01', () => {
  assert.deepEqual(shares(equalSplit(1, MEMBERS)), [1, 0, 0]);
});

test('equalSplit: leftover paisa follows id order, not input order', () => {
  const result = equalSplit(100000, ['M03', 'M01', 'M02']);
  assert.deepEqual(result.map((s) => s.member_id), MEMBERS);
  assert.deepEqual(shares(result), [33334, 33333, 33333]);
});

test('equalSplit: always conserves the exact total', () => {
  for (const total of [1, 2, 99, 100, 7777, 100001, 123456789]) {
    for (const n of [1, 2, 3]) {
      const sum = shares(equalSplit(total, MEMBERS.slice(0, n))).reduce((a, b) => a + b, 0);
      assert.equal(sum, total);
    }
  }
});

test('validateCustomSplit: accepts an exact sum and drops zero shares', () => {
  const result = validateCustomSplit(
    150000,
    [
      { member_id: 'M01', share_paisa: 50000 },
      { member_id: 'M02', share_paisa: 0 },
      { member_id: 'M03', share_paisa: 100000 },
    ],
    MEMBERS
  );
  assert.deepEqual(result.map((s) => s.member_id), ['M01', 'M03']);
});

test('validateCustomSplit: rejects a sum mismatch', () => {
  assert.throws(
    () => validateCustomSplit(150000, [{ member_id: 'M01', share_paisa: 140000 }], MEMBERS),
    /Shares add up to PKR 1,400.00 but the amount is PKR 1,500.00/
  );
});

test('validateCustomSplit: rejects duplicates and unknown members', () => {
  const twice = [
    { member_id: 'M01', share_paisa: 50 },
    { member_id: 'M01', share_paisa: 50 },
  ];
  assert.throws(() => validateCustomSplit(100, twice, MEMBERS), /more than once/);
  assert.throws(
    () => validateCustomSplit(100, [{ member_id: 'M09', share_paisa: 100 }], MEMBERS),
    /Unknown member: M09/
  );
});

test('toPaisa: accepts values that break naive float checks', () => {
  assert.equal(toPaisa(0.07), 7);
  assert.equal(toPaisa(1.1), 110);
  assert.equal(toPaisa(4.35), 435);
  assert.equal(toPaisa(19.99), 1999);
  assert.equal(toPaisa(333.34), 33334);
});

test('toPaisa: rejects more than 2 decimals', () => {
  assert.throws(() => toPaisa(10.005), /at most 2 decimal/);
  assert.throws(() => toPaisa(1e-7), /at most 2 decimal/);
});

test('toPaisa: rejects non-finite, negative and non-number values', () => {
  for (const bad of [NaN, Infinity, '100', null, undefined]) {
    assert.throws(() => toPaisa(bad), /must be a number/);
  }
  assert.throws(() => toPaisa(-5), /greater than 0/);
});

test('toPaisa: rejects values too large to be exact', () => {
  assert.throws(() => toPaisa(9e15), /too large/);
});

test('toPaisa: zero only when allowed', () => {
  assert.throws(() => toPaisa(0), /greater than 0/);
  assert.equal(toPaisa(0, { allowZero: true }), 0);
});

test('toRupees and formatPKR', () => {
  assert.equal(toRupees(33334), 333.34);
  assert.equal(formatPKR(123450), 'PKR 1,234.50');
});
