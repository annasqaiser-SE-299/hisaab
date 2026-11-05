# Mobile handoff

For the mobile developer and their coding agent. Read this before anything else.

The backend is finished and tested. Your job is `mobile/`, built from `docs/FRONTEND.md` and the mockups in
`docs/mockups/`. `CLAUDE.md` holds the API contract and the rules.

## The one hard rule

**Only change files inside `mobile/`.** You may read and run `backend/`, but never edit it, never reformat it,
and never reinstall packages in a way that changes `backend/package.json` or `backend/package-lock.json`.
Don't edit `CLAUDE.md` or the other docs either.

Agents: if a task seems to need a backend or contract change, stop and tell your user. Don't work around it
and don't make the change yourself. Your user will pass the request to the backend owner.

## Setup

**1. Clone and turn on the guards.** Run these once, from any terminal:

```bash
git clone https://github.com/annasqaiser-SE-299/hisaab.git
cd hisaab
git config core.hooksPath .githooks
mkdir .claude
cp docs/mobile-agent-settings.json .claude/settings.local.json
```

- `core.hooksPath` turns on a pre-commit check that refuses any commit touching `backend/`.
- `.claude/settings.local.json` stops Claude Code's file tools from editing `backend/`. It only affects your
  copy and is not committed. If you use a different agent, give it the hard rule above instead.

**2. Run the backend on your laptop.** You need Node 22 or newer (`node -v`). Use `npm ci`, which leaves the
lockfile unchanged:

```bash
cd backend
npm ci
npm run dev
```

In a second terminal, load the demo data:

```bash
curl -X POST "http://localhost:3000/api/dev/reset?seed=benchmark"
```

Logins are `ali`, `ayesha` and `bilal`, all with password `pass1234`.

**3. Check your phone can reach it.** Find your laptop's IPv4 address with `ipconfig` (Windows) or
`ipconfig getifaddr en0` (Mac), then open `http://<that-IP>:3000/api/health` in the phone's browser. You should
see `{"ok":true}`. If not, put both on the same Wi-Fi and allow Node through the firewall on private networks.

Use `http://<that-IP>:3000` as `API_BASE_URL`, never `localhost`. Set it for whichever laptop runs the backend
at demo time.

If the phone can't reach the laptop on the venue Wi-Fi, the network may be blocking devices from seeing each other.
Turn on the phone's hotspot, connect the laptop to it, and use the laptop's new IP.

**4. Create the app** from the repo root. Answer Yes when asked to skip creating a git repository:

```bash
npx create-expo-app@latest mobile
cd mobile
npx expo start
```

Scan the QR code with Expo Go. If Expo Go says the project needs a newer SDK, update Expo Go from the app store.

**5. Start your agent** from the repo root with this prompt:

> Read MOBILE_HANDOFF.md, CLAUDE.md and docs/FRONTEND.md. Only change files in mobile/. The Expo app already
> exists in mobile/. Finish the package installs in the Setup section of FRONTEND.md, then do Step F1, and propose
> a short plan first.

## Where the docs have changed

`docs/FRONTEND.md` and `CLAUDE.md` already include these. They are listed so you don't build from an older copy.

- **Routes live in `mobile/src/app/`.** The current Expo template uses that instead of `mobile/app/`.
- **No mock mode.** The real API is ready, so skip `USE_MOCK` and `mock.ts`.
- **Member switching.** Home has Ali / Ayesha / Bilal chips. Tapping one signs in as that member using `pass1234`,
  with no login screen in between. The brief requires an active member selector, so this one earns marks.
- **`payer_name` on `Activity`.** Use it for "Ali paid" on Home, because the actor is whoever logged the expense,
  and that can be a different person.
- **`created_by_name` on the duplicate warning.** Use it for "Bilal already logged" in the dialog.
- **Settle Up has no sender picker.** The sender is always the logged-in member, and the API returns 403 otherwise.

## If you run short of time

Mobile is the tighter half of the schedule. Cut in this order:

1. Use spinners instead of skeletons until F8.
2. Put expense delete in the detail sheet only, not on each row. List rows don't include the item names that the
   checkout delete message needs.
3. Add activity grouping (Today, Yesterday) last.

Don't cut these, because the brief marks them: loading indicators, disabled submit buttons while saving, error
toasts, the budget progress bar, and PKR labels.

## Git

```bash
git pull --rebase          # before you start each task
git add mobile             # stage mobile only, never `git add .`
git commit -m "feat(mobile): home dashboard"
git push
```

Tag `v1-mobile` when the demo flow in `docs/DEMO.md` works on the phone.

## Before judging

The brief says each team member must explain the code individually. Before demo time, make sure you can walk
through `src/api/client.ts`, `hooks/useSubmit.ts`, `hooks/useApiQuery.ts`, `AuthContext` and the custom split
logic on the add-expense screen yourself.

## Surprise task at hour 3.5

The backend owner adds the endpoint, and you build the screen from "Surprise task" in `docs/FRONTEND.md`. Agree
on which option it is first, and don't start on the surprise until it is announced.
