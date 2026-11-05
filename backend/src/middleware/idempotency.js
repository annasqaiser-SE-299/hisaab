const db = require('../db');

// If a phone retries a request with the same Idempotency-Key, we replay the stored
// response instead of doing the work again. Route handlers are synchronous, so two
// requests with the same key can't run at the same time.
function idempotency(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) return next();

  const stored = db
    .prepare('SELECT status_code, response_body FROM idempotency_keys WHERE key = ? AND member_id = ?')
    .get(key, req.member.id);
  if (stored) {
    return res.status(stored.status_code).json(JSON.parse(stored.response_body));
  }

  // Only 2xx responses are stored, so a failed request can be fixed and retried.
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      db.prepare(
        `INSERT OR IGNORE INTO idempotency_keys (key, member_id, route, status_code, response_body, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(key, req.member.id, req.originalUrl, res.statusCode, JSON.stringify(body), new Date().toISOString());
    }
    return sendJson(body);
  };
  next();
}

module.exports = idempotency;
