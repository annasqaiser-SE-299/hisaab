const db = require('../db');
const { AppError } = require('../middleware/errors');
const { toRupees, formatPKR } = require('./money');
const { computeBalances } = require('./balances');
const { getMember } = require('./members');

const SETTLEMENT_SELECT = `
  SELECT s.id, s.sender_id, sender.name AS sender_name,
         s.recipient_id, recipient.name AS recipient_name,
         s.amount_paisa, s.created_at
  FROM settlements s
  JOIN members sender ON sender.id = s.sender_id
  JOIN members recipient ON recipient.id = s.recipient_id
`;

function toSettlement({ amount_paisa, ...row }) {
  return { ...row, amount: toRupees(amount_paisa) };
}

const invalid = (message) => new AppError(400, 'SETTLEMENT_INVALID', message);

// Rule 1 (amount is positive with at most 2 decimals) is checked by toPaisa() in
// the route. Rules 2 to 7 run here, in the order the spec requires.
function validateSettlement({ senderId, recipientId, amountPaisa, loggedInId }) {
  const recipient = getMember(recipientId);
  if (!recipient) throw new AppError(404, 'NOT_FOUND', 'That recipient does not exist.');

  if (senderId !== loggedInId) {
    throw new AppError(403, 'SENDER_MUST_BE_YOU', 'You can only record payments you made yourself.');
  }
  if (senderId === recipientId) throw invalid("You can't pay yourself.");

  const balances = computeBalances();
  const senderNet = balances.find((b) => b.member_id === senderId).net;
  const recipientNet = balances.find((b) => b.member_id === recipientId).net;

  if (senderNet >= 0) throw invalid("You don't owe anything right now.");
  if (recipientNet <= 0) throw invalid(`${recipient.name} isn't owed anything right now.`);

  // A settlement can't push either person past zero: the sender can't pay more than
  // they owe, and the recipient can't receive more than they are owed.
  const debt = -senderNet;
  const credit = recipientNet;
  if (amountPaisa > Math.min(debt, credit)) {
    throw invalid(
      credit <= debt
        ? `Amount exceeds ${recipient.name}'s credit of ${formatPKR(credit)}.`
        : `Amount exceeds your debt of ${formatPKR(debt)}.`
    );
  }
}

function createSettlement({ senderId, recipientId, amountPaisa, loggedInId }) {
  validateSettlement({ senderId, recipientId, amountPaisa, loggedInId });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO settlements (sender_id, recipient_id, amount_paisa, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(senderId, recipientId, amountPaisa, loggedInId, new Date().toISOString());

  return toSettlement(db.prepare(`${SETTLEMENT_SELECT} WHERE s.id = ?`).get(lastInsertRowid));
}

function listSettlements() {
  return db
    .prepare(`${SETTLEMENT_SELECT} ORDER BY s.created_at DESC, s.id DESC`)
    .all()
    .map(toSettlement);
}

module.exports = { validateSettlement, createSettlement, listSettlements };
