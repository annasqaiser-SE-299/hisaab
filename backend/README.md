# Hisaab backend

Express + SQLite REST API. The full contract is in `../CLAUDE.md`, section 5.

## Run

Needs Node 22 or newer.

```bash
npm install
npm run dev              # restarts on change
npm start                # without restarts
npm test                 # all tests, each file on its own in-memory DB
npm run seed:benchmark   # reset the local DB and load the official benchmark
```

Copy `.env.example` to `.env` to change the defaults. Data is stored in `data/app.db`.
The server listens on `0.0.0.0:3000`, so a phone on the same Wi-Fi can reach it.
If the phone can't connect, allow Node through Windows Firewall on private networks.

Logins: `ali`, `ayesha`, `bilal`, all with password `pass1234`.

## Try the API in a browser

With the server running, open `http://localhost:3000/api/docs` (not available in production):

1. Run `POST /dev/reset` with `seed=benchmark` for clean demo data.
2. Run `POST /auth/login` and copy the token from the response.
3. Click **Authorize** and paste the token.
4. Open any endpoint, click **Try it out**, then **Execute**.

The page is built from `src/openapi.js`, so update that file when an endpoint changes.

## Endpoints

All paths start with `/api`. Everything except health, login and dev needs
`Authorization: Bearer <token>`.

| Method and path | Purpose |
|---|---|
| `GET /health` | Server check |
| `POST /auth/login` | Sign in, returns a token and the member |
| `GET /auth/me` | The signed-in member |
| `GET /members` | Household members |
| `GET /shopping` | Items, optional `?status=pending` or `bought` |
| `POST /shopping` | Add an item |
| `DELETE /shopping/:id` | Delete your own pending item |
| `POST /shopping/checkout` | Buy items and post an equal-split expense |
| `GET /expenses` | Expenses, optional `?month=YYYY-MM` |
| `GET /expenses/:id` | One expense with its bought items |
| `POST /expenses` | Add an equal or custom expense |
| `DELETE /expenses/:id` | Delete your own expense |
| `GET /balances` | Net balance per member |
| `POST /settle` | Record a payment you made |
| `GET /settlements` | Payments, newest first |
| `GET /budget` | Budget status, optional `?month=YYYY-MM` |
| `PUT /budget` | Change the monthly budget |
| `GET /activity` | Timeline, optional `?limit=50` |
| `POST /dev/reset` | Wipe data, `?seed=benchmark` loads the benchmark (404 in production) |

`POST /shopping/checkout`, `POST /expenses` and `POST /settle` accept an `Idempotency-Key` header.

## Where the logic lives

| File | Responsibility |
|---|---|
| `src/services/money.js` | The only place rupees and paisa are converted |
| `src/services/splits.js` | Equal and custom split rules |
| `src/services/balances.js` | Net balances, the single source of truth |
| `src/services/settlements.js` | The 7 settlement rules |
| `src/services/shopping.js` | Checkout transaction |
| `src/middleware/idempotency.js` | Safe retries |

Balances use `net = paid - share + sent - received`. The formula printed in the brief has the
last two signs swapped, which contradicts the brief's own benchmark.
