const { AppError } = require('../middleware/errors');
const { formatPKR } = require('./money');

const invalid = (message) => new AppError(400, 'VALIDATION_ERROR', message);

function assertKnownUniqueMembers(memberIds, knownIds) {
  if (new Set(memberIds).size !== memberIds.length) {
    throw invalid('A member appears more than once in the split.');
  }
  const unknown = memberIds.find((id) => !knownIds.includes(id));
  if (unknown) throw invalid(`Unknown member: ${unknown}.`);
}

// Example: 100000 paisa between 3 members. base = 33333, remainder = 1.
// The first `remainder` members, in ascending id order, get 1 extra paisa,
// giving 33334, 33333, 33333. The shares always add up to the exact total.
function equalSplit(totalPaisa, memberIds) {
  const sorted = [...memberIds].sort();
  const base = Math.floor(totalPaisa / sorted.length);
  const remainder = totalPaisa - base * sorted.length;
  return sorted.map((member_id, index) => ({
    member_id,
    share_paisa: index < remainder ? base + 1 : base,
  }));
}

// `splits` is [{ member_id, share_paisa }]. Members with a 0 share are dropped,
// because they owe nothing on this expense.
function validateCustomSplit(totalPaisa, splits, knownIds) {
  assertKnownUniqueMembers(splits.map((s) => s.member_id), knownIds);

  const sum = splits.reduce((total, s) => total + s.share_paisa, 0);
  if (sum !== totalPaisa) {
    throw invalid(`Shares add up to ${formatPKR(sum)} but the amount is ${formatPKR(totalPaisa)}.`);
  }
  return splits.filter((s) => s.share_paisa > 0);
}

module.exports = { equalSplit, validateCustomSplit, assertKnownUniqueMembers };
