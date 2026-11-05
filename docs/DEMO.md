# Demo, code defense & surprise plan

## Before judging (5 min)

1. Backend running on the laptop (`npm start`), phone on the same Wi-Fi, app open in Expo Go.
2. `curl -X POST http://localhost:3000/api/dev/reset?seed=benchmark` → clean benchmark state.
3. Pull to refresh on Home. You should see (as Ayesha): PKR 4,200.00 of 5,000.00 · Near Limit 84% ·
   "You owe PKR 450.00" · 3 pending items.
4. Have the app logged in as **Ali** to start (he does the shopping trip).
5. Keep a token ready in case a judge calls the API directly, because every route except health, login and dev returns 401 without one:
   `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"ali\",\"password\":\"pass1234\"}"`
6. If asked why Settle Up has no sender picker: the sender is always the logged-in member, so nobody can record a payment on someone else's behalf. Tap a chip on Home to act as another member.

## 5-minute demo script

| Time | Who / screen | Action | Say |
|---|---|---|---|
| 0:00 | Login | Sign in as `ali` | "Each flatmate has their own account, and the server checks who is allowed to do what on every write." |
| 0:20 | Home (Ali) | Point at budget card, balance card (+250 owed), pending count | "Spending, budget status and balances are calculated live from the data, never stored." |
| 0:45 | Shopping | Tick Eggs + Bread → Checkout, PKR 650, payer Ali, all three | "650 ÷ 3 leaves 2 paisa — they go to M01 then M02, so it sums exactly." Show shares 216.67 / 216.67 / 216.66. |
| 1:20 | Shopping | Try checking out the same items again (or show they're now Bought) | "Re-checkout is blocked by the server — that fixes 'logged twice'." |
| 1:40 | Expenses → Add | Log "Water Bill" 1,000 equal → 333.34 / 333.33 / 333.33 | "This is the exact rounding rule from the brief." |
| 2:10 | Expenses → Add | Log a custom split bill, show Save disabled until remaining = 0 | |
| 2:30 | Expenses → Add | Re-enter Water Bill 1,000 by Ali → duplicate warning | "We catch duplicates within 24 hours; you can still save if it's real." |
| 2:50 | Expenses | Show balances table, total 0.00 ✓; open an expense detail | "Net = paid − share + sent − received. The brief prints the last two signs swapped, which contradicts its own benchmark, so we followed the benchmark. The total is always zero." |
| 3:15 | Tap the Ayesha chip on Home | Settle Up → Ali → try more than allowed → error toast | "Over-settlements, self-payments and non-debtors are rejected by the server." |
| 3:40 | Settle Up | Use max → Record settlement | Balances update; spending unchanged. |
| 4:00 | Home / Activity | Budget status unchanged by settlement; Activity shows the timeline | "Settlements move money between us; they're not household spending." |
| 4:20 | (Surprise feature) | Demo whichever option was announced | |
| 4:45 | Laptop | Stop & restart server, pull to refresh — data is still there | "SQLite persistence; the app reloads from the server." |

Practise it twice. If something breaks live, reset with the dev endpoint and continue.

## Oral code defense — be ready to explain

**Backend person**
- `services/splits.js`: why integer paisa; `floor`, remainder, sort by member id.
- `services/balances.js`: the net formula and why the sum is always 0.
- `services/settlements.js`: each validation rule and its order; why `min(debt, credit)`.
- `services/shopping.js → checkout()`: why it runs in a transaction; how 409 prevents double logging.
- `middleware/idempotency.js`: what happens if the phone retries the same request.
- `middleware/auth.js`: JWT verify, `req.member`, ownership checks (403).

**Mobile person**
- `src/api/client.ts`: one place for base URL, token, errors, NETWORK_ERROR, 401 handling.
- `hooks/useSubmit.ts`: in-flight lock → no double taps; idempotency key reuse on network retry.
- `hooks/useApiQuery.ts`: loading/error/data, refetch on focus.
- `AuthContext`: SecureStore persistence, one-tap member switch.
- Add-expense screen: custom split "remaining to allocate" computed in paisa; duplicate dialog flow.

**Both:** walk through one request end to end, e.g. tapping "Confirm checkout" → client → route → zod →
service → transaction → response → toast → refetch.

Ask Claude Code: *"Explain `<file>` line by line as if I'm being examined, then ask me 5 questions about it."*

## Surprise task (hour 3.5) — plan

1. `git pull`, make sure both halves are committed and tagged (`v1-stable`).
2. Read the announced option together (2 min). Prompts for every option are ready in
   `docs/BACKEND.md` and `docs/FRONTEND.md` → "Surprise task".
3. Backend builds the endpoint + test first (~20 min) and pushes; mobile builds UI against the contract meanwhile.
4. Integrate, run the full demo flow again, commit, tag `v2-surprise`.
5. Stop new work 30 min before the deadline. Final push 10 min before.
