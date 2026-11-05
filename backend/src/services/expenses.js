const db = require('../db');
const { AppError } = require('../middleware/errors');
const { toRupees } = require('./money');
const { todayKarachi, currentMonthKarachi, isFutureDate } = require('./dates');
const { equalSplit, validateCustomSplit, assertKnownUniqueMembers } = require('./splits');
const { listMembers } = require('./members');
const { listItemsForExpense } = require('./items');

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const EXPENSE_SELECT = `
  SELECT e.*, payer.name AS payer_name, creator.name AS created_by_name
  FROM expenses e
  JOIN members payer ON payer.id = e.payer_id
  JOIN members creator ON creator.id = e.created_by
`;

function toExpense(row) {
  const splits = db
    .prepare(
      `SELECT s.member_id, m.name, s.share_paisa
       FROM expense_splits s JOIN members m ON m.id = s.member_id
       WHERE s.expense_id = ? ORDER BY s.member_id`
    )
    .all(row.id);

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    amount: toRupees(row.amount_paisa),
    payer_id: row.payer_id,
    payer_name: row.payer_name,
    split_type: row.split_type,
    source: row.source,
    date: row.expense_date,
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    splits: splits.map((s) => ({
      member_id: s.member_id,
      name: s.name,
      amount: toRupees(s.share_paisa),
    })),
  };
}

function findExpenseRow(id) {
  const row = db.prepare(`${EXPENSE_SELECT} WHERE e.id = ?`).get(id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'That expense no longer exists.');
  return row;
}

function listExpenses(month = currentMonthKarachi()) {
  const rows = db
    .prepare(
      `${EXPENSE_SELECT}
       WHERE substr(e.expense_date, 1, 7) = ?
       ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC`
    )
    .all(month);
  return rows.map(toExpense);
}

function getExpense(id) {
  return { ...toExpense(findExpenseRow(id)), items: listItemsForExpense(id) };
}

// Writes one expense and its splits. Callers run this inside their own transaction.
function insertExpense({ title, category, amountPaisa, payerId, splitType, source, date, createdBy, splits }) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO expenses
         (title, category, amount_paisa, payer_id, split_type, source, expense_date, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title, category, amountPaisa, payerId, splitType, source, date, createdBy, new Date().toISOString());

  const insertSplit = db.prepare(
    'INSERT INTO expense_splits (expense_id, member_id, share_paisa) VALUES (?, ?, ?)'
  );
  for (const split of splits) insertSplit.run(lastInsertRowid, split.member_id, split.share_paisa);

  return toExpense(findExpenseRow(lastInsertRowid));
}

function normaliseTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Same payer + same amount + same normalised title, logged in the last 24 hours.
function findDuplicate({ title, amountPaisa, payerId }) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const candidates = db
    .prepare(
      `${EXPENSE_SELECT}
       WHERE e.payer_id = ? AND e.amount_paisa = ? AND e.created_at >= ?
       ORDER BY e.created_at DESC, e.id DESC`
    )
    .all(payerId, amountPaisa, since);
  return candidates.find((row) => normaliseTitle(row.title) === normaliseTitle(title));
}

function createExpense(createdBy, { title, category, amountPaisa, payerId, date, splitType, splits, confirmDuplicate }) {
  const memberIds = listMembers().map((m) => m.id);
  if (!memberIds.includes(payerId)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unknown member: ${payerId}.`);
  }

  const expenseDate = date ?? todayKarachi();
  if (isFutureDate(expenseDate)) {
    throw new AppError(400, 'VALIDATION_ERROR', "Expense date can't be in the future.");
  }

  let finalSplits;
  if (splitType === 'custom') {
    finalSplits = validateCustomSplit(amountPaisa, splits, memberIds);
  } else {
    const splitIds = splits.map((s) => s.member_id);
    assertKnownUniqueMembers(splitIds, memberIds);
    finalSplits = equalSplit(amountPaisa, splitIds);
  }

  if (!confirmDuplicate) {
    const duplicate = findDuplicate({ title, amountPaisa, payerId });
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_SUSPECTED', 'This looks like an expense that was already logged.', {
        duplicate: {
          id: duplicate.id,
          title: duplicate.title,
          amount: toRupees(duplicate.amount_paisa),
          payer_name: duplicate.payer_name,
          created_by_name: duplicate.created_by_name,
          created_at: duplicate.created_at,
        },
      });
    }
  }

  return db.transaction(() =>
    insertExpense({
      title,
      category,
      amountPaisa,
      payerId,
      splitType,
      source: 'manual',
      date: expenseDate,
      createdBy,
      splits: finalSplits,
    })
  )();
}

// Deleting a checkout expense puts its items back on the list as Pending.
// Splits are removed by ON DELETE CASCADE.
function deleteExpense(id, memberId) {
  const row = findExpenseRow(id);
  if (row.created_by !== memberId) {
    throw new AppError(403, 'NOT_OWNER', 'Only the person who logged this expense can delete it.');
  }
  db.transaction(() => {
    db.prepare("UPDATE shopping_items SET status = 'pending', expense_id = NULL WHERE expense_id = ?").run(id);
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  })();
}

module.exports = { listExpenses, getExpense, insertExpense, createExpense, deleteExpense };
