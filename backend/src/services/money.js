const { AppError } = require('../middleware/errors');

// The ONLY place money is converted. Everything else works in integer paisa,
// because floats can't hold values like 0.07 exactly.

// We check decimals on the printed number. `rupees * 100` is not reliable for this:
// 19.99 * 100 is 1998.9999999999998, which would wrongly reject a valid amount.
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

function toPaisa(rupees, { allowZero = false, label = 'Amount' } = {}) {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} must be a number.`);
  }
  if (rupees < 0 || (rupees === 0 && !allowZero)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} must be greater than 0.`);
  }
  if (!TWO_DECIMALS.test(String(rupees))) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} can have at most 2 decimal places.`);
  }
  const paisa = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paisa)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} is too large.`);
  }
  return paisa;
}

function toRupees(paisa) {
  return paisa / 100;
}

// 123450 → "PKR 1,234.50", used in error messages.
function formatPKR(paisa) {
  const text = toRupees(paisa).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `PKR ${text}`;
}

module.exports = { toPaisa, toRupees, formatPKR };
