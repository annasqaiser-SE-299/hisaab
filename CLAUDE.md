# Hisaab — Shared Living App (project spec, read before every task)

Hackathon project (RC3 Mobile App Development). Full-stack mobile app for 3 flatmates — Ali (M01), Ayesha (M02),
Bilal (M03) — to manage a shopping list, log shared expenses, split bills exactly, settle debts and track a
monthly budget. Currency: PKR. Two developers: one owns `backend/`, one owns `mobile/`.

Other docs: `docs/BACKEND.md` (backend build steps), `docs/FRONTEND.md` (mobile build steps + design),
`docs/DEMO.md` (demo script, surprise task plans), `docs/mockups/` (UI mockups as HTML — the visual source of truth).

**Everything in this file is FINAL. Do not change the stack, schema, endpoints, field names or rules without
asking the user first — the other developer is building against them.**

---

## 1. Tech stack

**Backend** (`backend/`): Node.js 20+, Express 4, JavaScript (CommonJS), `better-sqlite3` (DB file
`backend/data/app.db`), `zod` (validation), `jsonwebtoken` + `bcryptjs` (auth), `cors`, `dotenv`.
Dev: `nodemon`. Tests: built-in `node:test` + `supertest`.

**Mobile** (`mobile/`): Expo (latest SDK), React Native, TypeScript, `expo-router` (tabs template),
`expo-secure-store` (token), `react-native-toast-message`, `expo-crypto` (`randomUUID` for idempotency keys),
`@react-native-community/datetimepicker`, `@expo-google-fonts/plus-jakarta-sans` + `expo-font`.
State: React Context + small custom hooks (no Redux). HTTP: `fetch` wrapped in one client.

Phone runs the app in **Expo Go**. API base URL = laptop LAN IP (e.g. `http://192.168.1.10:3000`), never
`localhost`. Server listens on `0.0.0.0:3000`.

---

## 2. Final decisions (locked)

| Topic | Decision |
|---|---|
| Household | One household, 3 seeded accounts. No sign-up screen. |
| Auth | Username + password → JWT (7 days). Seeded logins `ali` / `ayesha` / `bilal`, password `pass1234`. |
| Member selector | Replaced by "Signed in as X" + **Switch account** (logs out → login screen). |
| Ownership rules | Settle: sender must be the logged-in user. Delete expense / shopping item: only its creator. Payer of an expense or checkout can be anyone. |
| Money | Stored as integer **paisa**. API sends/receives **rupees as numbers with ≤ 2 decimals**. |
| Balances | All-time (debts carry across months). |
| Spending & budget | Per calendar month, by `expense_date`. One household budget (default PKR 5,000), editable. |
| Budget status | `< 75%` On Track · `75% to < 100%` Near Limit · `≥ 100%` Over Budget. |
| Categories | `Groceries`, `Utilities`, `Cleaning`, `Entertainment`, `Other`. Checkout expenses = `Groceries`. |
| Checkout split | Equal only (among chosen members). Custom split only for manual expenses. |
| Expense date | Defaults to today (Asia/Karachi). Past allowed, **future rejected**. |
| Delete | Pending shopping items (creator only). Expenses (creator only); deleting a checkout expense puts its items back to Pending. Settlements are never deleted. |
| Extras (Tier 1) | Duplicate-expense warning · server-side idempotency keys · expense detail · activity feed. |
| Dev reset | `POST /api/dev/reset?seed=benchmark` wipes data and loads the official benchmark. |
| Timezone | Asia/Karachi for "today" and month boundaries. `created_at` stored as ISO UTC. |

---

## 3. Money rules (CRITICAL — judges test these)

- All money is **integer paisa** in the DB and in all calculations. Never do float maths on money.
- Convert only at the route boundary, in `services/money.js`:
  `toPaisa(rupees)`: reject if not a finite number, ≤ 0 where positivity is required, or more than 2 decimals;
  return `Math.round(rupees * 100)`. `toRupees(paisa)` = `paisa / 100`.
- **Equal split** (`services/splits.js → equalSplit(totalPaisa, memberIds)`):
  sort member ids ascending (M01, M02, M03); `base = Math.floor(total / n)`; `remainder = total - base * n`;
  the first `remainder` members get `base + 1`, the rest `base`.
  - 1000.00 over M01, M02, M03 → **333.34, 333.33, 333.33**
  - 650.00 over all three → 216.67, 216.67, 216.66
- **Custom split**: every listed member exists, no duplicates, each share ≥ 0 with ≤ 2 decimals, and the shares
  sum **exactly** to the amount (compare in paisa). Members with 0 may be omitted.
- **Net balance** (`services/balances.js → computeBalances()` — the single source of truth):
  `net = paid − shareOwed + settlementsReceived − settlementsSent`. The sum over all members is always 0.
- **Settlement validation** (`POST /api/settle`), in this order, each with a clear message:
  1. amount > 0 with ≤ 2 decimals
  2. recipient exists
  3. `sender_id` equals the logged-in member (403 `SENDER_MUST_BE_YOU`)
  4. sender ≠ recipient ("You can't pay yourself.")
  5. sender net < 0 ("You don't owe anything right now.")
  6. recipient net > 0 ("Ali isn't owed anything right now.")
  7. amount ≤ min(|sender net|, recipient net) — message names the limit, e.g.
     "Amount exceeds Ali's credit of PKR 250.00." or "Amount exceeds your debt of PKR 200.00."
- Settlements are **not spending**. Household spending = sum of expenses in the month only.

---

## 4. Database schema (SQLite, `PRAGMA foreign_keys = ON`)

```sql
CREATE TABLE members (
  id            TEXT PRIMARY KEY,            -- 'M01'
  name          TEXT NOT NULL,               -- 'Ali'
  username      TEXT NOT NULL UNIQUE,        -- 'ali'
  password_hash TEXT NOT NULL
);

CREATE TABLE shopping_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  unit          TEXT NOT NULL CHECK (unit IN ('pack','dozen','bottle','bag')),
  requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','bought')),
  expense_id    INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  created_by    TEXT NOT NULL REFERENCES members(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE expenses (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  title                 TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('Groceries','Utilities','Cleaning','Entertainment','Other')),
  amount_paisa          INTEGER NOT NULL CHECK (amount_paisa > 0),
  payer_id              TEXT NOT NULL REFERENCES members(id),
  split_type            TEXT NOT NULL CHECK (split_type IN ('equal','custom')),
  source                TEXT NOT NULL CHECK (source IN ('manual','checkout')),
  expense_date          TEXT NOT NULL,       -- 'YYYY-MM-DD' (Asia/Karachi)
  created_by            TEXT NOT NULL REFERENCES members(id),
  created_at            TEXT NOT NULL,       -- ISO UTC
  -- reserved for surprise options (nullable, unused until announced):
  items_total_paisa     INTEGER,             -- Option 2
  tax_percent           REAL,                -- Option 2
  discount_paisa        INTEGER,             -- Option 2
  is_recurring          INTEGER NOT NULL DEFAULT 0,  -- Option 4
  recurring_template_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL  -- Option 4
);

CREATE TABLE expense_splits (
  expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id),
  share_paisa INTEGER NOT NULL CHECK (share_paisa >= 0),
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE settlements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    TEXT NOT NULL REFERENCES members(id),
  recipient_id TEXT NOT NULL REFERENCES members(id),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  created_by   TEXT NOT NULL REFERENCES members(id),
  created_at   TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                        -- seed: ('monthly_budget', '500000')
);

CREATE TABLE idempotency_keys (
  key           TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  route         TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  PRIMARY KEY (key, member_id)
);
```

Seed on first start (if `members` is empty): M01 Ali/`ali`, M02 Ayesha/`ayesha`, M03 Bilal/`bilal`, all with
bcrypt hash of `pass1234`; `monthly_budget = 500000`.

Every multi-step write (checkout, expense + splits, expense delete) runs inside `db.transaction()`.
Keep route handlers **synchronous** (better-sqlite3 is sync) — this also makes idempotency race-free.

---

## 5. API contract

Base path `/api`. JSON in and out. All amounts in **rupees** (numbers, 2 decimals). Dates `YYYY-MM-DD`.

**Auth:** every route except `/api/health`, `/api/auth/login` and `/api/dev/*` requires
`Authorization: Bearer <token>`. Missing/invalid/expired token → 401 `UNAUTHORIZED`.

**Errors (always this shape):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message shown in the app.", "details": {} } }
```

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | bad body/query (zod) |
| 400 | `SETTLEMENT_INVALID` | any settlement rule 4–7 |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | no/bad token / wrong login |
| 403 | `NOT_OWNER` / `SENDER_MUST_BE_YOU` | ownership rules |
| 404 | `NOT_FOUND` | unknown id |
| 409 | `ITEM_ALREADY_BOUGHT` | checkout includes a non-pending item |
| 409 | `ITEM_BOUGHT` | deleting a bought item |
| 409 | `DUPLICATE_SUSPECTED` | possible duplicate expense (see 5.4) |
| 500 | `INTERNAL_ERROR` | anything unexpected (never leak stack traces) |

**Idempotency:** `POST /shopping/checkout`, `POST /expenses` and `POST /settle` accept an optional
`Idempotency-Key` header (UUID). If the same key from the same member was already processed, return the
stored status + body without doing anything again. Store only **2xx** responses (an error can be fixed and retried with the same key).

### 5.1 System & auth
| Method & path | Body / query | Success |
|---|---|---|
| GET `/health` | – | `{ "ok": true }` |
| POST `/auth/login` | `{ username, password }` | `{ token, member: { id, name, username } }` |
| GET `/auth/me` | – | `{ member: { id, name, username } }` |

### 5.2 Members
| GET `/members` | – | `[{ id, name, username }]` sorted by id |
|---|---|---|

### 5.3 Shopping
| Method & path | Body / query | Success |
|---|---|---|
| GET `/shopping` | `?status=pending\|bought` (optional) | `[Item]` — pending first, then newest |
| POST `/shopping` | `{ title (1–60 chars), unit, requested_qty (int 1–999) }` | 201 `Item` |
| DELETE `/shopping/:id` | – | 204 · 403 `NOT_OWNER` · 409 `ITEM_BOUGHT` |
| POST `/shopping/checkout` | `{ item_ids: [1,2], total_paid: 650, payer_id: "M02", split_members: ["M01","M02","M03"] }` | 201 `{ expense: Expense, items: [Item] }` |

`Item = { id, title, unit, requested_qty, status, expense_id, created_by, created_by_name, created_at }`

Checkout rules: `item_ids` non-empty, unique, all exist and are `pending` (else 409 `ITEM_ALREADY_BOUGHT`,
message names the item); `total_paid > 0`; payer exists; `split_members` non-empty and valid. In one
transaction: create an equal-split expense (`category = Groceries`, `source = checkout`,
`title = "Shopping: " + item titles joined by ", "`, `expense_date = today`, `created_by = me`), mark the
items `bought` with `expense_id`.

### 5.4 Expenses
| Method & path | Body / query | Success |
|---|---|---|
| GET `/expenses` | `?month=YYYY-MM` (default current month) | `[Expense]` newest first |
| GET `/expenses/:id` | – | `Expense` + `items: [Item]` (bought items, for checkout expenses) |
| POST `/expenses` | see below | 201 `Expense` |
| DELETE `/expenses/:id` | – | 204 · 403 `NOT_OWNER` |

POST body:
```json
{ "title": "Internet Bill", "category": "Utilities", "amount": 1500, "payer_id": "M03",
  "date": "2026-11-05", "split_type": "custom",
  "splits": [{ "member_id": "M01", "amount": 500 }, { "member_id": "M02", "amount": 300 }, { "member_id": "M03", "amount": 700 }],
  "confirm_duplicate": false }
```
For `split_type: "equal"`, `splits` is `[{ "member_id": "M01" }, ...]` (amounts ignored). `date` optional
(default today); future dates → 400.

`Expense = { id, title, category, amount, payer_id, payer_name, split_type, source, date, created_by,
created_by_name, created_at, splits: [{ member_id, name, amount }] }`

**Duplicate guard:** for manual expenses, if an expense exists with the same `payer_id`, same `amount`, the
same normalised title (trimmed, lower-case, single spaces) and `created_at` within the last 24 hours, and
`confirm_duplicate` is not `true` → 409 `DUPLICATE_SUSPECTED` with
`details: { duplicate: { id, title, amount, payer_name, created_at } }`. The app shows a dialog; "Save anyway"
re-sends the same body with `confirm_duplicate: true`.

**Delete:** creator only. If `source = checkout`, its items go back to `pending` with `expense_id = NULL`
(same transaction). Splits cascade.

### 5.5 Balances & settlements
| Method & path | Body / query | Success |
|---|---|---|
| GET `/balances` | – | `{ balances: [{ member_id, name, paid, share, settlements_received, settlements_sent, net }], total: 0 }` |
| POST `/settle` | `{ sender_id: "M02", recipient_id: "M01", amount: 250 }` | 201 `{ id, sender_id, sender_name, recipient_id, recipient_name, amount, created_at }` |
| GET `/settlements` | – | `[Settlement]` newest first |

### 5.6 Budget
| Method & path | Body / query | Success |
|---|---|---|
| GET `/budget` | `?month=YYYY-MM` (default current) | `{ month, budget, spent, remaining, percent_used, status }` |
| PUT `/budget` | `{ amount }` (> 0) | same shape for the current month |

`percent_used` rounded to 1 decimal. `remaining` may be negative. `status`: `On Track` / `Near Limit` / `Over Budget`.

### 5.7 Activity
| GET `/activity` | `?limit=50` | `[Activity]` newest first by `created_at` |
|---|---|---|

`Activity = { id: "expense-12" | "settlement-3", type: "expense" | "checkout" | "settlement", title, amount,
actor_id, actor_name, counterparty_name (settlements only, else null), category (null for settlements),
split_type, split_count, created_at }` — `actor` = creator for expenses/checkouts, sender for settlements.
The app formats the text ("Ayesha paid Ali", "Ali checked out Milk, Rice", "Bilal added Internet Bill").

### 5.8 Dev
| POST `/dev/reset` | `?seed=benchmark` (optional) | `{ ok: true, seeded: true\|false }` |
|---|---|---|
Disabled (404) when `NODE_ENV=production`. Wipes all tables except `members`, resets budget to 5,000, then
optionally runs the benchmark seed **through the service functions** (same code path as the app).

### 5.9 Reserved for the Hour-3.5 surprise (do NOT build until announced)
`GET /balances/simplify` (Option 1) · `tax_percent` + `discount_amount` on checkout (Option 2) ·
`GET /budget/categories` (Option 3) · `is_recurring` on POST `/expenses` + `POST /expenses/recurring/apply` (Option 4).

---

## 6. Official benchmark (must pass exactly)

Seeded by `/api/dev/reset?seed=benchmark` and asserted in `backend/test/benchmark.test.js`:

1. Items Milk (2 bottle) and Rice (1 bag) added by Ali → **checkout** by Ali, total 780.00, split M01/M02/M03 → 260 each.
2. Cleaning Supplies — Cleaning — Ayesha pays 900.00, equal between Ali & Ayesha → 450 each. (created by Ayesha)
3. Internet Bill — Utilities — Bilal pays 1,500.00, custom Ali 500 / Ayesha 300 / Bilal 700. (created by Bilal)
4. Electricity Bill — Utilities — Ali pays 1,020.00, equal all three → 340 each. (created by Ali)
5. Extra pending items (no money effect, matches mockups): Eggs (1 dozen, Bilal), Bread (2 pack, Ayesha), Cooking Oil (1 bottle, Ayesha).

Expected: spending **4,200.00** · budget 5,000.00 · remaining **800.00** · **84.0% Near Limit**.
Ali paid 1,800 / share 1,550 / net **+250.00** · Ayesha 900 / 1,350 / **−450.00** · Bilal 1,500 / 1,300 / **+200.00** · total 0.00.
Then Ayesha → Ali 250 ⇒ Ali 0, Ayesha −200; Ayesha → Bilal 200 ⇒ everyone 0. Spending still 4,200.00.

---

## 7. Mobile UX rules (details + mockups in docs/FRONTEND.md)

- Tabs: **Home, Shopping, Expenses, Activity**. Login screen when no valid token.
- Every API action: loading indicator; submit button disabled while in flight (no double taps); one
  `Idempotency-Key` per submission attempt: reused only when retrying after a network failure, a new one after any server response.
- Errors: toast with the server's `error.message`. Network failure → "Can't reach server. Check Wi-Fi."
  401 anywhere → clear token, go to login.
- Screens refetch on focus and support pull-to-refresh. Server is the authority; client checks are hints.
- Money always displayed as `PKR 1,234.50` (`formatPKR`). Owed = green, owe = red, Near Limit = amber.

---

## 8. Conventions

- Backend: routes are thin (validate with zod → call a service → respond). Business logic only in `services/`.
  No SQL in routes. Errors via `AppError(status, code, message, details)` + one error middleware.
- Mobile: all HTTP in `src/api/client.ts`; screens never call `fetch` directly. Shared UI in `src/components/`.
  Colours/spacing only from `src/theme.ts`.
- Clear names, small functions, short comments on money/rounding/settlement logic — **each of us must explain
  this code orally to the judges.**
- Backend: run `npm test` after changes. Don't add libraries beyond section 1 without asking.
- Git: work only in your own folder; pull before starting, commit small (`feat(backend): checkout endpoint`),
  push when something works. Tag stable points (`git tag v1-stable`).
