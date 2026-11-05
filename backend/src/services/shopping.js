const db = require('../db');
const { AppError } = require('../middleware/errors');
const { todayKarachi } = require('./dates');
const { equalSplit, assertKnownUniqueMembers } = require('./splits');
const { listMembers } = require('./members');
const { ITEM_SELECT, getItem } = require('./items');
const { insertExpense } = require('./expenses');

function listItems(status) {
  const where = status ? 'WHERE i.status = ?' : '';
  const params = status ? [status] : [];
  return db
    .prepare(
      `${ITEM_SELECT} ${where}
       ORDER BY i.status = 'pending' DESC, i.created_at DESC, i.id DESC`
    )
    .all(...params);
}

function addItem(createdBy, { title, unit, requestedQty }) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO shopping_items (title, unit, requested_qty, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, unit, requestedQty, createdBy, new Date().toISOString());
  return getItem(lastInsertRowid);
}

function deleteItem(id, memberId) {
  const item = getItem(id);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'That item no longer exists.');
  if (item.created_by !== memberId) {
    throw new AppError(403, 'NOT_OWNER', 'Only the person who added this item can delete it.');
  }
  if (item.status === 'bought') {
    throw new AppError(409, 'ITEM_BOUGHT', `${item.title} was already bought, so it can't be deleted.`);
  }
  db.prepare('DELETE FROM shopping_items WHERE id = ?').run(id);
}

// Runs in one transaction: if anything fails, no expense is created and no item
// changes. An item can only leave Pending once, which blocks a double checkout.
function checkout(createdBy, { itemIds, totalPaisa, payerId, splitMembers }) {
  const memberIds = listMembers().map((m) => m.id);
  if (!memberIds.includes(payerId)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unknown member: ${payerId}.`);
  }
  assertKnownUniqueMembers(splitMembers, memberIds);

  return db.transaction(() => {
    const items = itemIds.map((id) => {
      const item = getItem(id);
      if (!item) throw new AppError(404, 'NOT_FOUND', `Item ${id} no longer exists.`);
      if (item.status !== 'pending') {
        throw new AppError(409, 'ITEM_ALREADY_BOUGHT', `${item.title} was already bought.`);
      }
      return item;
    });

    const expense = insertExpense({
      title: `Shopping: ${items.map((i) => i.title).join(', ')}`,
      category: 'Groceries',
      amountPaisa: totalPaisa,
      payerId,
      splitType: 'equal',
      source: 'checkout',
      date: todayKarachi(),
      createdBy,
      splits: equalSplit(totalPaisa, splitMembers),
    });

    const markBought = db.prepare("UPDATE shopping_items SET status = 'bought', expense_id = ? WHERE id = ?");
    for (const id of itemIds) markBought.run(expense.id, id);

    return { expense, items: itemIds.map(getItem) };
  })();
}

module.exports = { listItems, addItem, deleteItem, checkout };
