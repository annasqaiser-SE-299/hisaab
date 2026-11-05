# Hisaab — Shared Living App

Full-stack mobile app for flatmates: shopping list with checkout, shared expenses with exact PKR splitting,
debt settlement, monthly budget, activity feed. Built for the RC3 Mobile App Development challenge.

- **Backend:** Node.js + Express + SQLite (`backend/`)
- **Mobile:** Expo React Native + TypeScript (`mobile/`)
- **Building mobile?** Start with `MOBILE_HANDOFF.md`.
- **Spec:** `CLAUDE.md` (read first) · `docs/BACKEND.md` · `docs/FRONTEND.md` · `docs/DEMO.md`
- **Mockups:** open `docs/mockups/index.html` in a browser

## Quick start

```bash
# backend
cd backend && npm install && npm run dev            # http://<LAN-IP>:3000/api/health
curl -X POST http://localhost:3000/api/dev/reset?seed=benchmark

# mobile (set API_BASE_URL in mobile/src/config.ts to http://<LAN-IP>:3000)
cd mobile && npm install && npx expo start          # scan QR with Expo Go
```
Logins: `ali` / `ayesha` / `bilal`, password `pass1234`.

## Team workflow

- Person A works only in `backend/`, Person B only in `mobile/` → almost no merge conflicts.
- `git pull` before each Claude Code prompt, commit small, `git push` when it works.
- Commit messages: `feat(backend): …`, `feat(mobile): …`, `fix(...): …`.
- Tags: `v1-backend`, `v1-mobile`, `v1-stable` (before surprise), `v2-surprise`.

## Timeline (adjust to your real deadline)

| Time | Backend (A) | Mobile (B) |
|---|---|---|
| 0:00–0:15 | Repo + setup, B1 starts | Expo project on phone, F1 starts |
| 0:15–1:00 | B1 DB + auth, B2 split engine | F1 foundation |
| 1:00–2:00 | B3 shopping/checkout, B4 expenses + guards | F2 login, F3 home, F4 shopping |
| 2:00–2:45 | B5 balances/settle/budget/activity, B6 benchmark test | F5 expenses + settle, F6 add expense |
| 2:45–3:30 | B7 hardening, help integrate | F7 activity, F8 polish |
| 3:30 | **Tag v1-stable** — full demo run on the phone | |
| 3:30–4:30 | Surprise task (backend prompt) | Surprise task (mobile prompt) |
| 4:30–5:00 | Rehearse demo + code defense, final push | Rehearse demo + code defense, final push |
