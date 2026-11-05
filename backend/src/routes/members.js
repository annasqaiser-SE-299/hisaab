const { Router } = require('express');
const { listMembers } = require('../services/members');

const router = Router();

router.get('/', (req, res) => {
  res.json(listMembers());
});

module.exports = router;
