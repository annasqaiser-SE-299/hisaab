const { Router } = require('express');
const validate = require('../middleware/validate');
const idempotency = require('../middleware/idempotency');
const schemas = require('../validation/schemas');
const { toPaisa } = require('../services/money');
const expenses = require('../services/expenses');

const router = Router();

router.get('/', validate(schemas.expensesQuery, 'query'), (req, res) => {
  res.json(expenses.listExpenses(req.query.month));
});

router.get('/:id', validate(schemas.idParams, 'params'), (req, res) => {
  res.json(expenses.getExpense(req.params.id));
});

router.post('/', idempotency, validate(schemas.createExpense), (req, res) => {
  const { title, category, amount, payer_id, date, split_type, splits, confirm_duplicate } = req.body;

  // Equal splits ignore any amounts sent. Custom shares may be 0.
  const convertedSplits = splits.map((s) =>
    split_type === 'custom'
      ? { member_id: s.member_id, share_paisa: toPaisa(s.amount, { allowZero: true, label: 'Each share' }) }
      : { member_id: s.member_id }
  );

  const expense = expenses.createExpense(req.member.id, {
    title,
    category,
    amountPaisa: toPaisa(amount),
    payerId: payer_id,
    date,
    splitType: split_type,
    splits: convertedSplits,
    confirmDuplicate: confirm_duplicate === true,
  });
  res.status(201).json(expense);
});

router.delete('/:id', validate(schemas.idParams, 'params'), (req, res) => {
  expenses.deleteExpense(req.params.id, req.member.id);
  res.status(204).end();
});

module.exports = router;
