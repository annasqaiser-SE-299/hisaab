const { Router } = require('express');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const { toPaisa } = require('../services/money');
const { getBudget, setBudget } = require('../services/budget');

const router = Router();

router.get('/', validate(schemas.budgetQuery, 'query'), (req, res) => {
  res.json(getBudget(req.query.month));
});

router.put('/', validate(schemas.updateBudget), (req, res) => {
  res.json(setBudget(toPaisa(req.body.amount, { label: 'Budget' })));
});

module.exports = router;
