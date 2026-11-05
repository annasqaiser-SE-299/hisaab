const { z } = require('zod');
const { isRealDate } = require('../services/dates');

const requiredText = (label) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`);

// Decimal places and positivity are checked by toPaisa() in services/money.js.
const money = (label) => z.number({ error: `${label} must be a number.` });

const memberId = (label) => z.string({ error: `${label} is required.` });

const idParams = z.object({
  id: z.coerce.number({ error: 'That id is not valid.' }).int('That id is not valid.').positive('That id is not valid.'),
});

const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like 2026-11.')
  .optional();

const login = z.object({
  username: requiredText('Username'),
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.'),
});

const shoppingQuery = z.object({
  status: z.enum(['pending', 'bought'], { error: 'Status must be pending or bought.' }).optional(),
});

const addShoppingItem = z.object({
  title: requiredText('Item title').max(60, 'Item title can be at most 60 characters.'),
  unit: z.enum(['pack', 'dozen', 'bottle', 'bag'], { error: 'Unit must be pack, dozen, bottle or bag.' }),
  requested_qty: z
    .number({ error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(999, 'Quantity can be at most 999.'),
});

const checkout = z.object({
  item_ids: z
    .array(z.number().int().positive(), { error: 'Select at least one item.' })
    .min(1, 'Select at least one item.')
    .refine((ids) => new Set(ids).size === ids.length, 'An item was selected more than once.'),
  total_paid: money('Total paid'),
  payer_id: memberId('Payer'),
  split_members: z
    .array(z.string(), { error: 'Choose who to split between.' })
    .min(1, 'Choose who to split between.'),
});

const expensesQuery = z.object({ month });

const createExpense = z.object({
  title: requiredText('Title').max(100, 'Title can be at most 100 characters.'),
  category: z.enum(['Groceries', 'Utilities', 'Cleaning', 'Entertainment', 'Other'], {
    error: 'Choose a valid category.',
  }),
  amount: money('Amount'),
  payer_id: memberId('Payer'),
  date: z.string().refine(isRealDate, 'Date must be a real date like 2026-11-05.').optional(),
  split_type: z.enum(['equal', 'custom'], { error: 'Split type must be equal or custom.' }),
  splits: z
    .array(
      z.object({
        member_id: memberId('Split member'),
        amount: z.number({ error: 'Each share must be a number.' }).optional(),
      }),
      { error: 'Choose who to split between.' }
    )
    .min(1, 'Choose who to split between.'),
  confirm_duplicate: z.boolean().optional(),
});

module.exports = {
  idParams,
  login,
  shoppingQuery,
  addShoppingItem,
  checkout,
  expensesQuery,
  createExpense,
  month,
  money,
  memberId,
};
