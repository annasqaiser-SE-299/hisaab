const db = require('../db');
const { toRupees } = require('./money');

// The single source of truth for who owes what. Balances are always calculated
// from the data, never stored, and cover all time (debts carry across months).
//
//   net = paid - share + settlementsSent - settlementsReceived
//
// Positive net means the member is owed money. Paying a debt moves the sender toward 0,
// so `sent` is added. Receiving money moves the recipient toward 0, so `received` is
// subtracted. The brief's benchmark requires this: Ayesha (-450) pays Ali (+250) 250,
// giving Ayesha -200 and Ali 0. The formula printed in the brief has these two signs
// swapped, which would give -700 and +500.
//
// The sum over all members is always 0. Every expense adds its amount to the payer's
// `paid` and the same amount across everyone's `share`. Every settlement adds the
// same amount to one member's `sent` and another's `received`.
function computeBalances() {
  const rows = db
    .prepare(
      `SELECT m.id AS member_id, m.name,
         (SELECT COALESCE(SUM(amount_paisa), 0) FROM expenses WHERE payer_id = m.id) AS paid,
         (SELECT COALESCE(SUM(share_paisa), 0) FROM expense_splits WHERE member_id = m.id) AS share,
         (SELECT COALESCE(SUM(amount_paisa), 0) FROM settlements WHERE recipient_id = m.id) AS settlements_received,
         (SELECT COALESCE(SUM(amount_paisa), 0) FROM settlements WHERE sender_id = m.id) AS settlements_sent
       FROM members m
       ORDER BY m.id`
    )
    .all();

  return rows.map((r) => ({
    ...r,
    net: r.paid - r.share + r.settlements_sent - r.settlements_received,
  }));
}

function getBalances() {
  const balances = computeBalances();
  return {
    balances: balances.map((b) => ({
      member_id: b.member_id,
      name: b.name,
      paid: toRupees(b.paid),
      share: toRupees(b.share),
      settlements_received: toRupees(b.settlements_received),
      settlements_sent: toRupees(b.settlements_sent),
      net: toRupees(b.net),
    })),
    total: toRupees(balances.reduce((sum, b) => sum + b.net, 0)),
  };
}

module.exports = { computeBalances, getBalances };
