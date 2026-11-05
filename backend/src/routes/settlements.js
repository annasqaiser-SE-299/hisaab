const { Router } = require('express');
const validate = require('../middleware/validate');
const idempotency = require('../middleware/idempotency');
const schemas = require('../validation/schemas');
const { toPaisa } = require('../services/money');
const { createSettlement, listSettlements } = require('../services/settlements');

const router = Router();

router.post('/settle', idempotency, validate(schemas.settle), (req, res) => {
  const { sender_id, recipient_id, amount } = req.body;
  const settlement = createSettlement({
    senderId: sender_id,
    recipientId: recipient_id,
    amountPaisa: toPaisa(amount),
    loggedInId: req.member.id,
  });
  res.status(201).json(settlement);
});

router.get('/settlements', (req, res) => {
  res.json(listSettlements());
});

module.exports = router;
