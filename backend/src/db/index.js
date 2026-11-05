const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { dbPath } = require('../config');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  unit          TEXT NOT NULL CHECK (unit IN ('pack','dozen','bottle','bag')),
  requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','bought')),
  expense_id    INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  created_by    TEXT NOT NULL REFERENCES members(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  title                 TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('Groceries','Utilities','Cleaning','Entertainment','Other')),
  amount_paisa          INTEGER NOT NULL CHECK (amount_paisa > 0),
  payer_id              TEXT NOT NULL REFERENCES members(id),
  split_type            TEXT NOT NULL CHECK (split_type IN ('equal','custom')),
  source                TEXT NOT NULL CHECK (source IN ('manual','checkout')),
  expense_date          TEXT NOT NULL,
  created_by            TEXT NOT NULL REFERENCES members(id),
  created_at            TEXT NOT NULL,
  items_total_paisa     INTEGER,
  tax_percent           REAL,
  discount_paisa        INTEGER,
  is_recurring          INTEGER NOT NULL DEFAULT 0,
  recurring_template_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id),
  share_paisa INTEGER NOT NULL CHECK (share_paisa >= 0),
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    TEXT NOT NULL REFERENCES members(id),
  recipient_id TEXT NOT NULL REFERENCES members(id),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  created_by   TEXT NOT NULL REFERENCES members(id),
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  route         TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  PRIMARY KEY (key, member_id)
);
`;

const SEED_MEMBERS = [
  { id: 'M01', name: 'Ali', username: 'ali' },
  { id: 'M02', name: 'Ayesha', username: 'ayesha' },
  { id: 'M03', name: 'Bilal', username: 'bilal' },
];
const SEED_PASSWORD = 'pass1234';
const DEFAULT_BUDGET_PAISA = 500000;

function seedIfEmpty(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM members').get();
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);
  const insertMember = db.prepare(
    'INSERT INTO members (id, name, username, password_hash) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (const m of SEED_MEMBERS) insertMember.run(m.id, m.name, m.username, passwordHash);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monthly_budget', ?)")
      .run(String(DEFAULT_BUDGET_PAISA));
  })();
}

function openDatabase() {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

module.exports = openDatabase();
module.exports.DEFAULT_BUDGET_PAISA = DEFAULT_BUDGET_PAISA;
