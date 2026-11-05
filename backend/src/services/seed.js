const db = require('../db');
const { DEFAULT_BUDGET_PAISA } = db;
const { setBudget } = require('./budget');
const shopping = require('./shopping');
const { createExpense } = require('./expenses');

const ALI = 'M01';
const AYESHA = 'M02';
const BILAL = 'M03';

// Wipes everything except members and restarts ids from 1.
function resetData() {
  db.transaction(() => {
    db.exec(`
      DELETE FROM shopping_items;
      DELETE FROM expense_splits;
      DELETE FROM settlements;
      DELETE FROM expenses;
      DELETE FROM idempotency_keys;
      DELETE FROM sqlite_sequence;
    `);
    setBudget(DEFAULT_BUDGET_PAISA);
  })();
}

// The official benchmark, CLAUDE.md section 6. It goes through the same service
// functions as the app, so the seeded numbers also test the real money code.
function seedBenchmark() {
  db.transaction(() => {
    const milk = shopping.addItem(ALI, { title: 'Milk', unit: 'bottle', requestedQty: 2 });
    const rice = shopping.addItem(ALI, { title: 'Rice', unit: 'bag', requestedQty: 1 });
    shopping.checkout(ALI, {
      itemIds: [milk.id, rice.id],
      totalPaisa: 78000,
      payerId: ALI,
      splitMembers: [ALI, AYESHA, BILAL],
    });

    createExpense(AYESHA, {
      title: 'Cleaning Supplies',
      category: 'Cleaning',
      amountPaisa: 90000,
      payerId: AYESHA,
      splitType: 'equal',
      splits: [{ member_id: ALI }, { member_id: AYESHA }],
    });

    createExpense(BILAL, {
      title: 'Internet Bill',
      category: 'Utilities',
      amountPaisa: 150000,
      payerId: BILAL,
      splitType: 'custom',
      splits: [
        { member_id: ALI, share_paisa: 50000 },
        { member_id: AYESHA, share_paisa: 30000 },
        { member_id: BILAL, share_paisa: 70000 },
      ],
    });

    createExpense(ALI, {
      title: 'Electricity Bill',
      category: 'Utilities',
      amountPaisa: 102000,
      payerId: ALI,
      splitType: 'equal',
      splits: [{ member_id: ALI }, { member_id: AYESHA }, { member_id: BILAL }],
    });

    // No money effect: these match the pending list in the mockups.
    shopping.addItem(BILAL, { title: 'Eggs', unit: 'dozen', requestedQty: 1 });
    shopping.addItem(AYESHA, { title: 'Bread', unit: 'pack', requestedQty: 2 });
    shopping.addItem(AYESHA, { title: 'Cooking Oil', unit: 'bottle', requestedQty: 1 });
  })();
}

module.exports = { resetData, seedBenchmark };
