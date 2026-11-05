const db = require('../db');
const { toRupees } = require('./money');

// Merges expenses and settlements into one timeline. Rows can share a created_at
// (seeding writes several in the same millisecond), so `kind_rank` and `row_id`
// break ties. Within a tie, settlements come first and the newest id leads.
function listActivity(limit = 50) {
  const rows = db
    .prepare(
      `SELECT e.id AS row_id, 1 AS kind_rank, e.source, e.title, e.amount_paisa,
              e.created_by AS actor_id, actor.name AS actor_name, NULL AS counterparty_name,
              e.category, e.split_type,
              (SELECT COUNT(*) FROM expense_splits s WHERE s.expense_id = e.id) AS split_count,
              e.created_at
       FROM expenses e
       JOIN members actor ON actor.id = e.created_by
       UNION ALL
       SELECT s.id, 0, 'settlement', actor.name || ' paid ' || other.name, s.amount_paisa,
              s.sender_id, actor.name, other.name,
              NULL, NULL, NULL,
              s.created_at
       FROM settlements s
       JOIN members actor ON actor.id = s.sender_id
       JOIN members other ON other.id = s.recipient_id
       ORDER BY created_at DESC, kind_rank ASC, row_id DESC
       LIMIT ?`
    )
    .all(limit);

  return rows.map((r) => ({
    id: `${r.source === 'settlement' ? 'settlement' : 'expense'}-${r.row_id}`,
    type: r.source === 'manual' ? 'expense' : r.source,
    title: r.title,
    amount: toRupees(r.amount_paisa),
    actor_id: r.actor_id,
    actor_name: r.actor_name,
    counterparty_name: r.counterparty_name,
    category: r.category,
    split_type: r.split_type,
    split_count: r.split_count,
    created_at: r.created_at,
  }));
}

module.exports = { listActivity };
