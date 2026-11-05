const express = require('express');
const cors = require('cors');
const requireAuth = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));

// Everything below needs a valid token
app.use('/api', requireAuth);
app.use('/api/members', require('./routes/members'));
app.use('/api/shopping', require('./routes/shopping'));
app.use('/api/expenses', require('./routes/expenses'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
