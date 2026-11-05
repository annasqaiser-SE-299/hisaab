const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const schemas = require('../validation/schemas');
const { login } = require('../services/auth');

const router = Router();

router.post('/login', validate(schemas.login), (req, res) => {
  res.json(login(req.body.username, req.body.password));
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ member: req.member });
});

module.exports = router;
