const { Router } = require('express');
const validate = require('../middleware/validate');
const idempotency = require('../middleware/idempotency');
const schemas = require('../validation/schemas');
const { toPaisa } = require('../services/money');
const shopping = require('../services/shopping');

const router = Router();

router.get('/', validate(schemas.shoppingQuery, 'query'), (req, res) => {
  res.json(shopping.listItems(req.query.status));
});

router.post('/', validate(schemas.addShoppingItem), (req, res) => {
  const { title, unit, requested_qty } = req.body;
  res.status(201).json(shopping.addItem(req.member.id, { title, unit, requestedQty: requested_qty }));
});

router.post('/checkout', idempotency, validate(schemas.checkout), (req, res) => {
  const { item_ids, total_paid, payer_id, split_members } = req.body;
  const result = shopping.checkout(req.member.id, {
    itemIds: item_ids,
    totalPaisa: toPaisa(total_paid, { label: 'Total paid' }),
    payerId: payer_id,
    splitMembers: split_members,
  });
  res.status(201).json(result);
});

router.delete('/:id', validate(schemas.idParams, 'params'), (req, res) => {
  shopping.deleteItem(req.params.id, req.member.id);
  res.status(204).end();
});

module.exports = router;
