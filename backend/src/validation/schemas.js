const { z } = require('zod');

const requiredText = (label) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`);

const login = z.object({
  username: requiredText('Username'),
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.'),
});

module.exports = { login };
