const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { AppError } = require('../middleware/errors');

function login(username, password) {
  const row = db
    .prepare('SELECT * FROM members WHERE username = ?')
    .get(username.toLowerCase());

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong username or password.');
  }

  const member = { id: row.id, name: row.name, username: row.username };
  const token = jwt.sign({ sub: row.id }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, member };
}

// Returns the member id from a valid token, or null if it is bad or expired.
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }).sub;
  } catch {
    return null;
  }
}

module.exports = { login, verifyToken };
