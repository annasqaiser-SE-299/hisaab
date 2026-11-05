const { Router } = require('express');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const { isProduction } = require('../config');
const { AppError } = require('../middleware/errors');
const { resetData, seedBenchmark } = require('../services/seed');

const router = Router();

router.post('/reset', validate(schemas.devResetQuery, 'query'), (req, res) => {
  if (isProduction) throw new AppError(404, 'NOT_FOUND', 'That resource does not exist.');

  resetData();
  const seeded = req.query.seed === 'benchmark';
  if (seeded) seedBenchmark();
  res.json({ ok: true, seeded });
});

module.exports = router;
