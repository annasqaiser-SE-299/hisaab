const { Router } = require('express');
const { getBalances } = require('../services/balances');

const router = Router();

router.get('/', (req, res) => {
  res.json(getBalances());
});

module.exports = router;
