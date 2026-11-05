const db = require('../db');
const { toRupees } = require('./money');
const { currentMonthKarachi } = require('./dates');

// Thresholds compare integers, so 74.96% is never rounded up into Near Limit.
function budgetStatus(spentPaisa, budgetPaisa) {
  if (spentPaisa * 100 < budgetPaisa * 75) return 'On Track';
  if (spentPaisa < budgetPaisa) return 'Near Limit';
  return 'Over Budget';
}

// Spending is expenses only. Settlements move money between members, so they don't count.
function getBudget(month = currentMonthKarachi()) {
  const budgetPaisa = Number(
    db.prepare("SELECT value FROM settings WHERE key = 'monthly_budget'").get().value
  );
  const spentPaisa = db
    .prepare(
      `SELECT COALESCE(SUM(amount_paisa), 0) AS total
       FROM expenses WHERE substr(expense_date, 1, 7) = ?`
    )
    .get(month).total;

  return {
    month,
    budget: toRupees(budgetPaisa),
    spent: toRupees(spentPaisa),
    remaining: toRupees(budgetPaisa - spentPaisa),
    percent_used: Math.round((spentPaisa * 1000) / budgetPaisa) / 10,
    status: budgetStatus(spentPaisa, budgetPaisa),
  };
}

function setBudget(amountPaisa) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monthly_budget', ?)")
    .run(String(amountPaisa));
  return getBudget();
}

module.exports = { getBudget, setBudget };
