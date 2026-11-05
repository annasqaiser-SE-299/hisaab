const db = require('../db');

// Shared by shopping.js and expenses.js, which both need to return Item objects.
const ITEM_SELECT = `
  SELECT i.id, i.title, i.unit, i.requested_qty, i.status, i.expense_id,
         i.created_by, m.name AS created_by_name, i.created_at
  FROM shopping_items i
  JOIN members m ON m.id = i.created_by
`;

function getItem(id) {
  return db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id);
}

function listItemsForExpense(expenseId) {
  return db.prepare(`${ITEM_SELECT} WHERE i.expense_id = ? ORDER BY i.id`).all(expenseId);
}

module.exports = { ITEM_SELECT, getItem, listItemsForExpense };
