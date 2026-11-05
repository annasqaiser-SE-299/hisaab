const db = require('../db');

const PUBLIC_FIELDS = 'id, name, username';

function listMembers() {
  return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM members ORDER BY id`).all();
}

function getMember(id) {
  return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM members WHERE id = ?`).get(id);
}

module.exports = { listMembers, getMember };
