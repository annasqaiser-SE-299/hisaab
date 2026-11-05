// The API description behind the Swagger page at /api/docs. The contract itself is in
// CLAUDE.md section 5. test/docs.test.js checks that every path here reaches a real route.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: 'array', items: ref(name) });
const nullable = (type) => ({ type: [type, 'null'] });

const json = (schema, example) => ({
  'application/json': { schema, ...(example ? { example } : {}) },
});
const body = (schema, example) => ({ required: true, content: json(schema, example) });
const ok = (description, schema) => ({
  description,
  ...(schema ? { content: json(schema) } : {}),
});
const error = (description) => ({ description, content: json(ref('Error')) });

const unauthorized = { 401: error('Missing, invalid or expired token') };
const badRequest = { 400: error('Validation failed') };
const notFound = { 404: error('Not found') };
const PUBLIC = { security: [] };

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
  example: 1,
};
const monthParam = {
  name: 'month',
  in: 'query',
  description: 'YYYY-MM. Defaults to the current month in Asia/Karachi.',
  schema: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
};
const idempotencyKey = {
  name: 'Idempotency-Key',
  in: 'header',
  description: 'Optional. Sending the same key again replays the stored response instead of repeating the action.',
  schema: { type: 'string' },
};

const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Human-readable message shown in the app.' },
          details: { type: 'object' },
        },
      },
    },
  },
  Member: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'M01' },
      name: { type: 'string', example: 'Ali' },
      username: { type: 'string', example: 'ali' },
    },
  },
  Item: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string', example: 'Milk' },
      unit: { type: 'string', enum: ['pack', 'dozen', 'bottle', 'bag'] },
      requested_qty: { type: 'integer', example: 2 },
      status: { type: 'string', enum: ['pending', 'bought'] },
      expense_id: nullable('integer'),
      created_by: { type: 'string', example: 'M01' },
      created_by_name: { type: 'string', example: 'Ali' },
      created_at: { type: 'string', format: 'date-time' },
    },
  },
  Expense: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string', example: 'Internet Bill' },
      category: { type: 'string', enum: ['Groceries', 'Utilities', 'Cleaning', 'Entertainment', 'Other'] },
      amount: { type: 'number', example: 1500 },
      payer_id: { type: 'string', example: 'M03' },
      payer_name: { type: 'string', example: 'Bilal' },
      split_type: { type: 'string', enum: ['equal', 'custom'] },
      source: { type: 'string', enum: ['manual', 'checkout'] },
      date: { type: 'string', format: 'date' },
      created_by: { type: 'string', example: 'M03' },
      created_by_name: { type: 'string', example: 'Bilal' },
      created_at: { type: 'string', format: 'date-time' },
      splits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            member_id: { type: 'string', example: 'M01' },
            name: { type: 'string', example: 'Ali' },
            amount: { type: 'number', example: 500 },
          },
        },
      },
    },
  },
  ExpenseWithItems: {
    allOf: [ref('Expense'), { type: 'object', properties: { items: arrayOf('Item') } }],
  },
  Balances: {
    type: 'object',
    properties: {
      balances: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            member_id: { type: 'string', example: 'M01' },
            name: { type: 'string', example: 'Ali' },
            paid: { type: 'number', example: 1800 },
            share: { type: 'number', example: 1550 },
            settlements_received: { type: 'number', example: 0 },
            settlements_sent: { type: 'number', example: 0 },
            net: { type: 'number', example: 250 },
          },
        },
      },
      total: { type: 'number', example: 0 },
    },
  },
  Settlement: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      sender_id: { type: 'string', example: 'M02' },
      sender_name: { type: 'string', example: 'Ayesha' },
      recipient_id: { type: 'string', example: 'M01' },
      recipient_name: { type: 'string', example: 'Ali' },
      amount: { type: 'number', example: 250 },
      created_at: { type: 'string', format: 'date-time' },
    },
  },
  Budget: {
    type: 'object',
    properties: {
      month: { type: 'string', example: '2026-11' },
      budget: { type: 'number', example: 5000 },
      spent: { type: 'number', example: 4200 },
      remaining: { type: 'number', example: 800 },
      percent_used: { type: 'number', example: 84 },
      status: { type: 'string', enum: ['On Track', 'Near Limit', 'Over Budget'] },
    },
  },
  Activity: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'expense-12' },
      type: { type: 'string', enum: ['expense', 'checkout', 'settlement'] },
      title: { type: 'string', example: 'Internet Bill' },
      amount: { type: 'number', example: 1500 },
      actor_id: { type: 'string', example: 'M03' },
      actor_name: { type: 'string', example: 'Bilal' },
      payer_name: nullable('string'),
      counterparty_name: nullable('string'),
      category: nullable('string'),
      split_type: nullable('string'),
      split_count: nullable('integer'),
      created_at: { type: 'string', format: 'date-time' },
    },
  },
};

const paths = {
  '/health': {
    get: { tags: ['System'], summary: 'Check the server is running', ...PUBLIC, responses: { 200: ok('Server is up') } },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Sign in and get a token',
      description: 'Copy the token from the response, click Authorize at the top of this page and paste it in.',
      ...PUBLIC,
      requestBody: body(
        {
          type: 'object',
          required: ['username', 'password'],
          properties: { username: { type: 'string' }, password: { type: 'string' } },
        },
        { username: 'ayesha', password: 'pass1234' }
      ),
      responses: { 200: ok('Signed in'), ...badRequest, 401: error('Wrong username or password') },
    },
  },
  '/auth/me': {
    get: { tags: ['Auth'], summary: 'The signed-in member', responses: { 200: ok('The member'), ...unauthorized } },
  },
  '/members': {
    get: {
      tags: ['Members'],
      summary: 'List household members',
      responses: { 200: ok('Members', arrayOf('Member')), ...unauthorized },
    },
  },
  '/shopping': {
    get: {
      tags: ['Shopping'],
      summary: 'List items, pending first',
      parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'bought'] } }],
      responses: { 200: ok('Items', arrayOf('Item')), ...badRequest, ...unauthorized },
    },
    post: {
      tags: ['Shopping'],
      summary: 'Add an item',
      requestBody: body(
        {
          type: 'object',
          required: ['title', 'unit', 'requested_qty'],
          properties: {
            title: { type: 'string', maxLength: 60 },
            unit: { type: 'string', enum: ['pack', 'dozen', 'bottle', 'bag'] },
            requested_qty: { type: 'integer', minimum: 1, maximum: 999 },
          },
        },
        { title: 'Tea', unit: 'pack', requested_qty: 1 }
      ),
      responses: { 201: ok('Item added', ref('Item')), ...badRequest, ...unauthorized },
    },
  },
  '/shopping/checkout': {
    post: {
      tags: ['Shopping'],
      summary: 'Buy items and post an equal-split expense',
      description: 'After the benchmark seed, items 3, 4 and 5 are Eggs, Bread and Cooking Oil.',
      parameters: [idempotencyKey],
      requestBody: body(
        {
          type: 'object',
          required: ['item_ids', 'total_paid', 'payer_id', 'split_members'],
          properties: {
            item_ids: { type: 'array', items: { type: 'integer' } },
            total_paid: { type: 'number' },
            payer_id: { type: 'string' },
            split_members: { type: 'array', items: { type: 'string' } },
          },
        },
        { item_ids: [3, 4], total_paid: 650, payer_id: 'M02', split_members: ['M01', 'M02', 'M03'] }
      ),
      responses: {
        201: ok('Expense posted and items marked bought'),
        ...badRequest,
        ...unauthorized,
        ...notFound,
        409: error('An item was already bought'),
      },
    },
  },
  '/shopping/{id}': {
    delete: {
      tags: ['Shopping'],
      summary: 'Delete your own pending item',
      parameters: [idParam],
      responses: {
        204: ok('Deleted'),
        ...badRequest,
        ...unauthorized,
        403: error('Only the creator can delete it'),
        ...notFound,
        409: error('The item was already bought'),
      },
    },
  },
  '/expenses': {
    get: {
      tags: ['Expenses'],
      summary: 'List expenses for a month, newest first',
      parameters: [monthParam],
      responses: { 200: ok('Expenses', arrayOf('Expense')), ...badRequest, ...unauthorized },
    },
    post: {
      tags: ['Expenses'],
      summary: 'Add an equal or custom expense',
      description:
        'For an equal split, send splits as [{ "member_id": "M01" }, ...]. Custom shares must add up exactly to the amount.',
      parameters: [idempotencyKey],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'category', 'amount', 'payer_id', 'split_type', 'splits'],
              properties: {
                title: { type: 'string', maxLength: 100 },
                category: { type: 'string', enum: ['Groceries', 'Utilities', 'Cleaning', 'Entertainment', 'Other'] },
                amount: { type: 'number' },
                payer_id: { type: 'string' },
                date: { type: 'string', format: 'date', description: 'Defaults to today. Future dates are rejected.' },
                split_type: { type: 'string', enum: ['equal', 'custom'] },
                splits: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['member_id'],
                    properties: { member_id: { type: 'string' }, amount: { type: 'number' } },
                  },
                },
                confirm_duplicate: { type: 'boolean', description: 'Send true to save after a duplicate warning.' },
              },
            },
            examples: {
              equal: {
                summary: 'Equal split: 1,000 gives 333.34, 333.33, 333.33',
                value: {
                  title: 'Water Bill',
                  category: 'Utilities',
                  amount: 1000,
                  payer_id: 'M01',
                  split_type: 'equal',
                  splits: [{ member_id: 'M01' }, { member_id: 'M02' }, { member_id: 'M03' }],
                },
              },
              custom: {
                summary: 'Custom split',
                value: {
                  title: 'Gas Bill',
                  category: 'Utilities',
                  amount: 600,
                  payer_id: 'M03',
                  split_type: 'custom',
                  splits: [
                    { member_id: 'M01', amount: 100 },
                    { member_id: 'M02', amount: 200 },
                    { member_id: 'M03', amount: 300 },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        201: ok('Expense added', ref('Expense')),
        ...badRequest,
        ...unauthorized,
        409: error('Looks like a duplicate. Resend with confirm_duplicate: true to save anyway.'),
      },
    },
  },
  '/expenses/{id}': {
    get: {
      tags: ['Expenses'],
      summary: 'One expense with its bought items',
      parameters: [idParam],
      responses: { 200: ok('The expense', ref('ExpenseWithItems')), ...badRequest, ...unauthorized, ...notFound },
    },
    delete: {
      tags: ['Expenses'],
      summary: 'Delete your own expense',
      description: 'Deleting a checkout expense puts its items back to Pending.',
      parameters: [idParam],
      responses: {
        204: ok('Deleted'),
        ...badRequest,
        ...unauthorized,
        403: error('Only the creator can delete it'),
        ...notFound,
      },
    },
  },
  '/balances': {
    get: {
      tags: ['Balances'],
      summary: 'Net balance per member',
      description: 'net = paid - share + sent - received. The total is always 0.',
      responses: { 200: ok('Balances', ref('Balances')), ...unauthorized },
    },
  },
  '/settle': {
    post: {
      tags: ['Balances'],
      summary: 'Record a payment you made',
      description: 'The sender must be you, so sign in as ayesha to try this example after the benchmark seed.',
      parameters: [idempotencyKey],
      requestBody: body(
        {
          type: 'object',
          required: ['sender_id', 'recipient_id', 'amount'],
          properties: {
            sender_id: { type: 'string' },
            recipient_id: { type: 'string' },
            amount: { type: 'number' },
          },
        },
        { sender_id: 'M02', recipient_id: 'M01', amount: 250 }
      ),
      responses: {
        201: ok('Payment recorded', ref('Settlement')),
        400: error('Bad amount, self-payment, nothing owed, or over the limit'),
        ...unauthorized,
        403: error('The sender is not you'),
        404: error('The recipient does not exist'),
      },
    },
  },
  '/settlements': {
    get: {
      tags: ['Balances'],
      summary: 'List payments, newest first',
      responses: { 200: ok('Payments', arrayOf('Settlement')), ...unauthorized },
    },
  },
  '/budget': {
    get: {
      tags: ['Budget'],
      summary: 'Budget status for a month',
      parameters: [monthParam],
      responses: { 200: ok('Budget status', ref('Budget')), ...badRequest, ...unauthorized },
    },
    put: {
      tags: ['Budget'],
      summary: 'Change the monthly budget',
      requestBody: body(
        { type: 'object', required: ['amount'], properties: { amount: { type: 'number' } } },
        { amount: 6000 }
      ),
      responses: { 200: ok('Budget status for this month', ref('Budget')), ...badRequest, ...unauthorized },
    },
  },
  '/activity': {
    get: {
      tags: ['Activity'],
      summary: 'Timeline of expenses, checkouts and payments',
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } }],
      responses: { 200: ok('Timeline', arrayOf('Activity')), ...badRequest, ...unauthorized },
    },
  },
  '/dev/reset': {
    post: {
      tags: ['Dev'],
      summary: 'Wipe all data, optionally loading the benchmark',
      description: 'Logins keep working. Not available in production.',
      ...PUBLIC,
      parameters: [{ name: 'seed', in: 'query', schema: { type: 'string', enum: ['benchmark'] } }],
      responses: { 200: ok('Data reset'), ...badRequest },
    },
  },
};

module.exports = {
  openapi: '3.1.0',
  info: {
    title: 'Hisaab API',
    version: '1.0.0',
    description:
      '1. Run POST /dev/reset with seed=benchmark for clean demo data.\n' +
      '2. Run POST /auth/login and copy the token.\n' +
      '3. Click Authorize and paste the token.\n' +
      '4. Open any endpoint, click Try it out, then Execute.',
  },
  servers: [{ url: '/api' }],
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
};
