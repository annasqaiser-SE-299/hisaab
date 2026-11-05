# Project status and continuation guide

For anyone picking up this project, including a coding agent in any IDE. It needs no earlier chat history.

**Last updated:** 2026-11-05, during phase 2. Update this file at the end of every phase.

## What this is

Hisaab is a full-stack mobile app for 3 flatmates: shopping list, shared expenses with exact PKR splitting, debt
settlement, monthly budget and an activity feed. It is an entry for the RC3 Mobile App Development challenge
(5 hours, 100 marks, 5-minute live demo plus individual oral code defense).

- **Repo:** https://github.com/annasqaiser-SE-299/hisaab (private, branch `main`)
- **Stack:** Node 22+, Express, SQLite in `backend/`. Expo, React Native, TypeScript in `mobile/`.

## Read these, in this order

1. `PROJECT_STATUS.md`: this file, for current progress
2. `CLAUDE.md`: API contract and rules, final unless the team agrees a change
3. `docs/FRONTEND.md`: mobile build steps F1 to F8, design tokens, surprise prompts
4. `docs/mockups/index.html`: the visual source of truth, 15 screens
5. `docs/DEMO.md`: demo script and code defense topics
6. `MOBILE_HANDOFF.md`: setup steps and the backend guards
7. `docs/BACKEND.md`: only needed for backend work, including the surprise endpoints

The official brief is `RC3 - Mobile app development Task (1).pdf`. It is not in the repo, so ask the team for it.

## Progress

| Phase | State |
|---|---|
| 1. Backend | **Done:** all endpoints, 53 passing tests, official benchmark passes, data survives restarts |
| 2. Access and device setup | **In progress:** backend answers on the laptop's Wi-Fi address and the firewall allows Node. Still to do: invite teammate, test from a real phone, create the Expo app |
| 3. Mobile foundation (F1) | Not started, `mobile/` does not exist yet |
| 4. Login and Home (F2, F3) | Not started |
| 5. Shopping and checkout (F4) | Not started |
| 6. Expenses, settle, add expense (F5, F6) | Not started |
| 7. Activity and polish (F7, F8) | Not started |
| 8. Testing, then tag `v1-stable` | Not started |
| 9. Surprise task at hour 3.5 | Not started, must wait for the announcement |
| 10. Rehearsal and submission | Not started |

**The next action is phase 2.** The detailed plan is below.

## Decisions that differ from what you might assume

- **Net balance is `paid - share + sent - received`.** The brief prints the last two signs swapped, which
  contradicts its own benchmark. The code follows the benchmark, and the team should say so to the judges.
- **Member switching is one tap.** Home has Ali / Ayesha / Bilal chips that sign in with the seeded password.
- **Settle Up has no sender picker.** The sender is always the logged-in member, otherwise the API returns 403.
- **All routes except health, login and dev need a token.** Keep one ready in case a judge calls the API directly.
- **There is no mock mode.** The mobile app uses the real API from the start.
- **Money is integer paisa.** `backend/src/services/money.js` is the only place it is converted.
- **`backend/.npmrc` sets `ignore-scripts=true`.** Without it, installing `better-sqlite3` fails on machines with
  no C++ toolchain. Don't remove it.

## Rules for whoever continues

- The brief prints a ban on AI coding tools, with disqualification as the penalty. The team reports that the
  teachers allow AI for their group and that the rule is for another group. Get that in writing before judging.
- Each team member must be able to explain the code individually at the oral defense.
- Ownership: `backend/` belongs to one developer and `mobile/` to the other. If you work on mobile, follow the
  guards in `MOBILE_HANDOFF.md`.
- Commit small, for example `feat(mobile): home dashboard`. Run `git pull --rebase` first and push when it works.
- Ignore `Downloads\CLAUDE.md` on the original laptop. It describes an unrelated project, Campus Companion.

## Run the backend

```bash
cd backend
npm ci
npm run dev
curl -X POST "http://localhost:3000/api/dev/reset?seed=benchmark"
npm test
```

Logins are `ali`, `ayesha` and `bilal`, all with password `pass1234`. The API listens on `0.0.0.0:3000`. The phone
needs the laptop's LAN IP, never `localhost`.

## Build plan

### Phase 2: Access and device setup (15 min)
1. Invite the teammate to the repo.
2. Teammate follows the setup section of `MOBILE_HANDOFF.md`.
3. Open `http://<laptop-IP>:3000/api/health` in the phone's browser. Fix Wi-Fi or the firewall if it fails.
4. Run `npx create-expo-app@latest mobile` from the repo root, answering Yes to skip creating a git repository,
   and open it in Expo Go. A trial run of the template showed SDK 58, routes in `src/app/` and no nested `.git`.
   If devices can't see each other on the venue Wi-Fi, use the phone's hotspot.

**Done when:** the template app runs on the phone and the phone can reach the API.

### Phase 3: Mobile foundation, F1 (40 min)
Theme tokens, API client, typed endpoints, AuthContext, `useApiQuery`, `useSubmit`, tab layout, shared components.

**Done when:** the app opens on the phone and the tabs switch without crashing.

### Phase 4: Login and Home, F2 and F3 (45 min)
Login screen, member chips, budget card, balance card, pending and expense counts, recent activity, budget sheet.

**Done when:** as Ayesha, Home shows PKR 4,200.00 of 5,000.00, Near Limit 84%, You owe PKR 450.00, 3 pending items.

### Phase 5: Shopping and checkout, F4 (35 min)
Add item, pending and bought lists, multi-select, checkout sheet with live shares.

**Done when:** checking out 650.00 across all three shows 216.67, 216.67, 216.66 and the items move to Bought.

### Phase 6: Expenses, settle, add expense, F5 and F6 (70 min)
Balances table, expense list and detail, delete, settle sheet, add expense with equal and custom splits, duplicate
dialog.

**Done when:** an over-limit settlement shows the server's error toast, and Save stays disabled until a custom
split adds up.

### Phase 7: Activity and polish, F7 and F8 (35 min)
Activity timeline, loading and empty states, offline banner, success and error toasts, spacing pass.

**Done when:** every screen matches its mockup and has loading, empty and error states.

### Phase 8: Testing (30 min), then tag `v1-stable`
1. **Automated:** `npm test` in `backend/` is all green and `npx tsc --noEmit` in `mobile/` is clean.
2. **Official benchmark on the phone:** reset with the seed, check every number on Home and the balances table,
   then settle Ayesha to Ali 250 and Ayesha to Bilal 200. Everyone should reach 0.00 with spending still 4,200.00.
3. **Rule checks in the app:**
   - 1,000.00 split equally gives 333.34, 333.33, 333.33
   - Self-payment, over-settlement and non-debtor settlements are rejected with a clear message
   - A future expense date is rejected
   - The same expense entered twice shows the duplicate warning
   - Deleting a checkout expense returns its items to Pending
4. **Resilience:** double-tap every submit button and confirm one record. Stop the server and confirm the banner
   and toast, then restart and pull to refresh. Restart the server and the app, and confirm the data is still there.
5. **Brief checklist:** go through the brief's Questions 1 to 4 line by line and tick each one.
6. Run the full demo in `docs/DEMO.md` once. Fix what breaks, then tag `v1-stable`.

**Done when:** all of the above pass on the real phone.

### Phase 9: Surprise task at hour 3.5 (up to 60 min)
Prompts for all 4 options are in `docs/BACKEND.md` and `docs/FRONTEND.md`. Build the endpoint and its test first,
then the screen. Re-run the demo flow, then tag `v2-surprise`. Don't build this before it is announced.

### Phase 10: Rehearsal and submission (30 min)
Practise the 5-minute demo twice. Each member walks through their code topics from `docs/DEMO.md` without help.
Stop new work 30 minutes before the deadline and do the final push 10 minutes before it.
