const { Router } = require('express');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const { listActivity } = require('../services/activity');

const router = Router();

router.get('/', validate(schemas.activityQuery, 'query'), (req, res) => {
  res.json(listActivity(req.query.limit));
});

module.exports = router;
