# Backend build guide (Person A)

You own `backend/`. Read `CLAUDE.md` first — it is the contract the mobile app is built against.
Give each prompt below to Claude Code **in order**, check the result, commit, push, then move on.

## Folder structure (target)

```
backend/
  package.json
  .env.example            # PORT=3000, JWT_SECRET=dev-secret-change-me, NODE_ENV=development
  data/                   # app.db lives here (git-ignored)
  src/
    index.js              # loads .env, creates app, listens on 0.0.0.0:PORT
    app.js                # builds the express app (exported for tests)
    config.js
    db/index.js           # opens SQLite, PRAGMA foreign_keys, creates tables, first-run seed
    middleware/
      auth.js             # requireAuth: verifies JWT → req.member = { id, name, username }
      errors.js           # AppError class, notFound, errorHandler → { error: { code, message, details } }
      idempotency.js      # Idempotency-Key replay for checkout / expenses / settle
      validate.js         # validate(zodSchema, 'body' | 'query')
    validation/schemas.js # all zod schemas
    routes/               # auth, members, shopping, expenses, balances, settlements, budget, activity, dev
    services/
      money.js            # toPaisa, toRupees  (ONLY place money is converted)
      dates.js            # todayKarachi(), currentMonthKarachi(), isFutureDate()
      splits.js           # equalSplit, validateCustomSplit
      balances.js         # computeBalances()  (single source of truth)
      budget.js           # getBudget(month), setBudget(amount)
      shopping.js         # list/add/delete items, checkout()
      expenses.js         # list/get/create/delete, findDuplicate()
      settlements.js      # validateSettlement(), createSettlement(), list
      activity.js         # listActivity(limit)
      seed.js             # seedMembers(), resetData(), seedBenchmark()
  test/
    splits.test.js
    balances.test.js
    settle.test.js
    benchmark.test.js     # full API run with supertest
```

## Setup (5 min)

```bash
cd backend
npm init -y
npm i express better-sqlite3 zod jsonwebtoken bcryptjs cors dotenv
npm i -D nodemon supertest
```
If `better-sqlite3` fails to install on Windows, run `npm i better-sqlite3 --build-from-source` or upgrade to
Node 20 LTS / 22 LTS (prebuilt binaries exist for those).

---

## Step B1 — Skeleton, database, auth (≈ 35 min)

> Read CLAUDE.md fully. In `backend/`, create the structure from docs/BACKEND.md. Implement `src/db/index.js`
> with the exact schema from CLAUDE.md section 4 and the first-run seed (3 members with bcrypt hashes of
> `pass1234`, monthly_budget 500000). Implement `config.js`, `app.js`, `index.js` (listen on 0.0.0.0:PORT),
> `middleware/errors.js` (AppError + JSON error handler + 404), `middleware/validate.js`, `middleware/auth.js`
> (Bearer JWT, 7-day expiry, 401 UNAUTHORIZED), and routes `GET /api/health`, `POST /api/auth/login`,
> `GET /api/auth/me`, `GET /api/members`. Add `cors()` and `express.json()`. npm scripts: `dev` (nodemon),
> `start`, `test` (`node --test`). Add `.env.example` and make `data/` auto-created.

**Check:**
```bash
npm run dev
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"ayesha\",\"password\":\"pass1234\"}"
```
Copy the token, then `curl http://localhost:3000/api/members -H "Authorization: Bearer <token>"`.
Also open `http://<laptop-LAN-IP>:3000/api/health` **on the phone's browser** — if that fails, fix Wi-Fi /
Windows firewall now (allow Node on private networks).

Commit: `feat(backend): db schema, seed, auth`

## Step B2 — Money + split engine with tests (≈ 20 min)

> Implement `services/money.js` (toPaisa rejects non-finite, more than 2 decimals; toRupees),
> `services/dates.js` (Asia/Karachi today/month helpers using Intl), and `services/splits.js` (equalSplit with
> remainder paisa to lowest member ids first; validateCustomSplit that checks members, duplicates, non-negative,
> exact sum) exactly per CLAUDE.md section 3. Write `test/splits.test.js` covering: 1000.00/3 → 333.34, 333.33,
> 333.33; 650/3 → 216.67, 216.67, 216.66; 900/2; 0.01 split 3 ways; unsorted input ids; custom sum mismatch
> rejected; toPaisa(10.005) rejected. Add short comments explaining the remainder logic.

**Check:** `npm test` passes.
Commit: `feat(backend): money and split engine`

## Step B3 — Shopping + checkout (≈ 25 min)

> Implement shopping per CLAUDE.md 5.3: zod schemas, `services/shopping.js`, `routes/shopping.js` with
> GET (status filter, pending first), POST, DELETE (creator only, pending only), and POST /checkout in one
> transaction (409 ITEM_ALREADY_BOUGHT naming the item, equal split via splits.js, title "Shopping: …",
> category Groceries, source checkout, created_by = req.member.id). Responses use the exact `Item` and
> `Expense` shapes from CLAUDE.md, amounts in rupees.

**Check:** add 2 items, checkout them, checkout the same ids again → 409.
Commit: `feat(backend): shopping and checkout`

## Step B4 — Expenses, duplicate guard, idempotency (≈ 30 min)

> Implement CLAUDE.md 5.4: `services/expenses.js` and `routes/expenses.js` with GET list (month filter,
> default current Karachi month), GET by id (with bought items for checkout expenses), POST (equal or custom,
> date default today, reject future dates, duplicate guard → 409 DUPLICATE_SUSPECTED with details.duplicate
> unless confirm_duplicate is true), DELETE (creator only; checkout items back to pending in the same
> transaction). Then implement `middleware/idempotency.js` per CLAUDE.md section 5 and apply it to
> POST /shopping/checkout, POST /expenses and POST /settle (key + member_id; replay stored status and body;
> store only 2xx responses).

**Check:** post the same expense twice → second is 409 DUPLICATE_SUSPECTED; with `confirm_duplicate: true` it
saves. Post twice with the same `Idempotency-Key` header → same response, only one row created.
Commit: `feat(backend): expenses, duplicate guard, idempotency`

## Step B5 — Balances, settlements, budget, activity (≈ 30 min)

> Implement `services/balances.js → computeBalances()` (all-time; paid, share, settlements received/sent,
> net; total must be 0), `GET /api/balances`; `services/settlements.js` with validation rules 1–7 in the order
> and with the messages from CLAUDE.md section 3, `POST /api/settle` and `GET /api/settlements`;
> `services/budget.js` with `GET /api/budget` and `PUT /api/budget` (status thresholds, percent to 1 decimal,
> negative remaining allowed); `services/activity.js` with `GET /api/activity` (union of expenses, checkouts and
> settlements, newest first, exact Activity shape). Write `test/balances.test.js` and `test/settle.test.js`
> (self-payment, non-debtor sender, over-settlement, sender ≠ logged-in user → 403).

Commit: `feat(backend): balances, settle, budget, activity`

## Step B6 — Dev reset + benchmark test (≈ 20 min)

> Implement `services/seed.js` (`resetData()`, `seedBenchmark()` using the service functions, not raw SQL
> inserts for money) and `POST /api/dev/reset?seed=benchmark` (404 when NODE_ENV=production). Benchmark data is
> CLAUDE.md section 6 including the 3 extra pending items. Add npm script `seed:benchmark` that resets and
> seeds directly. Write `test/benchmark.test.js` using supertest against a temporary DB file: log in, reset with
> seed, assert every expected number in section 6 (spending, remaining, percent, status, each member's paid /
> share / net, total 0), then log in as Ayesha, settle 250 to Ali and 200 to Bilal, assert all nets 0 and
> spending still 4200.

**Check:** `npm test` all green, then `npm run seed:benchmark` and call `/api/balances`.
Commit + `git tag v1-backend`.

## Step B7 — Hardening (≈ 15 min, before hour 3)

> Review the backend against CLAUDE.md: every endpoint's response shape, every error code, ownership rules,
> no stack traces in responses, zod messages turned into readable sentences, consistent rupee formatting
> (2 decimals). Add a `backend/README.md` section listing endpoints and how to run tests. Fix anything that
> doesn't match.

Tell the frontend person as soon as each step is pushed — they switch from mock data to the real endpoint.

---

## Surprise task — backend prompts (hour 3.5)

Start from the stable tag. Give Claude Code the announced option's text from the PDF plus the prompt below.

- **Option 1 Smart Settle:**
  > Add `GET /api/balances/simplify`: take computeBalances(), split into debtors and creditors (in paisa),
  > repeatedly pair the largest debtor with the largest creditor, transfer min(|debt|, credit), until all are 0.
  > Return `[{ from_id, from_name, to_id, to_name, amount }]`. Add a test: benchmark → Ayesha→Ali 250, Ayesha→Bilal 200.
- **Option 2 Tax & discount:**
  > Extend POST /shopping/checkout with optional `tax_percent` (0–100, ≤ 2 decimals) and `discount_amount`
  > (≥ 0). items_total = total_paid; final = round(items_total × (1 + tax/100)) − discount, in paisa; reject
  > final ≤ 0. Save items_total_paisa, tax_percent, discount_paisa on the expense and return them. Split the final amount.
- **Option 3 Category budgets:**
  > Add `GET /api/budget/categories?month=`: spending per category (all 5 categories, zeros included), each
  > with `amount`, `percent_of_budget`, and `exceeded: true` when the category is more than 40% of the monthly budget.
- **Option 4 Recurring:**
  > Accept `is_recurring` on POST /expenses (store it). Add `POST /api/expenses/recurring/apply`: for each
  > recurring template, if no expense with `recurring_template_id = template.id` exists in the current month
  > (and the template itself isn't in this month), copy it with the same splits, today's date, created_by = me.
  > Return `{ created: [Expense], skipped: n }`. Running it twice creates nothing the second time.

Don't break existing tests — run `npm test` before pushing.
