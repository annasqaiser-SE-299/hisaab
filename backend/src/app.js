const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');
const { isProduction } = require('./config');
const requireAuth = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dev', require('./routes/dev'));
if (!isProduction) {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, { swaggerOptions: { persistAuthorization: true } })
  );
}

// Everything below needs a valid token
app.use('/api', requireAuth);
app.use('/api/members', require('./routes/members'));
app.use('/api/shopping', require('./routes/shopping'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api', require('./routes/settlements'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/activity', require('./routes/activity'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
