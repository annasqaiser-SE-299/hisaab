# Mobile build guide (Person B)

You own `mobile/`. Read `CLAUDE.md` first — the API contract (section 5) and UX rules (section 7) are final.
The **mockups in `docs/mockups/` are the visual source of truth**: open `docs/mockups/index.html` in a browser
to see all 15 screens. Each prompt below names the mockup file(s) Claude Code must read and replicate.

## Setup (10 min)

From the repo root:
```bash
npx create-expo-app@latest mobile        # answer Yes when asked to skip creating a git repository
cd mobile
npx expo install expo-secure-store expo-crypto expo-font @react-native-community/datetimepicker
npx expo install @expo-google-fonts/plus-jakarta-sans
npm i react-native-toast-message
npx expo start                           # scan the QR code with Expo Go on the phone
```
Find the laptop's LAN IP (`ipconfig` on Windows → IPv4) and put it in `src/config.ts`. Phone and laptop must
be on the same Wi-Fi. The backend is already built, so there is no mock mode.

## Folder structure (target)

The current Expo template (SDK 58) keeps routes in `src/app/`. Wherever this guide says `app/...`, use
`mobile/src/app/...`. The `@/` import alias points to `mobile/src/`. Delete the template's example screens and
components rather than building on them.

```
mobile/
  src/app/
    _layout.tsx               # fonts, AuthProvider, Toast, auth gate (no token → /login)
    login.tsx                 # mockup 01
    (tabs)/
      _layout.tsx             # 4 tabs: Home, Shopping, Expenses, Activity
      index.tsx               # Home — mockup 02 (+13 budget sheet)
      shopping.tsx            # mockup 03 (+04 checkout sheet)
      expenses.tsx            # mockup 05 (+07 settle, +11 detail, +14 delete)
      activity.tsx            # mockup 12
    expense/new.tsx           # mockups 06 + 09 (+10 duplicate dialog)
    smart-settle.tsx          # mockup 08 — ONLY if surprise Option 1 is announced
  src/
    config.ts                 # API_BASE_URL
    theme.ts                  # colours, spacing, radius, font names (tokens below)
    api/
      client.ts               # request(): base URL, Bearer token, JSON, ApiError, NETWORK_ERROR, 401 handler
      endpoints.ts            # typed functions: login, getMembers, getShopping, checkout, createExpense, ...
      types.ts                # Item, Expense, Balance, Budget, Settlement, Activity (match CLAUDE.md exactly)
    context/AuthContext.tsx   # token + member, login(), logout(), restore from SecureStore on start
    hooks/
      useApiQuery.ts          # { data, loading, error, refetch } + refetch on screen focus
      useSubmit.ts            # in-flight lock, loading flag, one Idempotency-Key per submission, toasts
    components/
      PrimaryButton.tsx       # variants: primary / dark / outline / danger; loading spinner; disabled
      Card.tsx, Chip.tsx, ChipGroup.tsx, StatusTag.tsx, ProgressBar.tsx, MoneyText.tsx
      TextField.tsx, AmountField.tsx, Stepper.tsx, SegmentedControl.tsx, Checkbox.tsx
      BottomSheet.tsx         # RN Modal, slide up, dim backdrop, drag handle, close button
      ConfirmDialog.tsx       # mockup 14 (centered alert dialog)
      DuplicateDialog.tsx     # mockup 10
      OfflineBanner.tsx, Skeleton.tsx, EmptyState.tsx   # mockup 15
      sheets/CheckoutSheet.tsx, SettleUpSheet.tsx, ExpenseDetailSheet.tsx, BudgetSheet.tsx
    utils/
      money.ts                # formatPKR(1234.5) → "PKR 1,234.50"; parseAmount(text)
      split.ts                # equalSplitPreview (same algorithm as backend — preview only)
      dates.ts                # todayISO(), formatDate("2026-11-05") → "05 Nov 2026", relative times
```

## Design tokens (`src/theme.ts`) — taken from the mockups

| Token | Value | Use |
|---|---|---|
| `bg` | `#F3F5F4` | screen background |
| `surface` | `#FFFFFF` | cards, sheets, inputs |
| `border` | `#E2E8E5` | card borders |
| `borderStrong` | `#CBD5D1` | inputs, unselected chips |
| `divider` | `#EEF1EF` | list row separators, progress track |
| `text` | `#10201B` | primary text, dark buttons |
| `textMuted` | `#5A6B65` | labels, secondary text |
| `accent` | `#0E7C6B` | primary buttons, active tab, selected chip border |
| `accentSoft` / `accentText` | `#E3F3EF` / `#0A5F52` | selected chip fill, Bought tag |
| `owed` / `owedSoft` | `#12703A` / `#E6F4EA` | positive balances, On Track |
| `owe` / `oweSoft` / `oweText` | `#B3212A` / `#FCEBEC` / `#8E1A22` | negative balances, errors, danger |
| `warn` / `warnSoft` / `warnText` | `#D97706` / `#FDF1E2` / `#8A4307` | Near Limit bar, Pending tag, remaining-to-allocate |
| `backdrop` | `rgba(16,32,27,0.45)` | behind sheets/dialogs |

- Font: **Plus Jakarta Sans** (400/600/700/800). Big money numbers 800 weight, `fontVariant: ['tabular-nums']`.
- Spacing scale 4 / 8 / 12 / 16 / 20 / 24. Screen padding 16. Card padding 16–20.
- Radius: cards 16–20, inputs/buttons 12–16, chips 999, sheets 24 (top corners).
- Touch targets ≥ 44 px. Primary buttons 52–56 px tall. Tab bar 84 px with 4 equal tabs.
- Budget bar colour by status: On Track `owed`, Near Limit `warn`, Over Budget `owe`.

## Mockup → code map

| Mockup (`docs/mockups/`) | Build as |
|---|---|
| `01-login.html` | `app/login.tsx` |
| `02-home.html` | `app/(tabs)/index.tsx` |
| `03-shopping.html` | `app/(tabs)/shopping.tsx` |
| `04-checkout.html` | `components/sheets/CheckoutSheet.tsx` |
| `05-expenses.html` | `app/(tabs)/expenses.tsx` |
| `06-add-expense-custom.html`, `09-add-expense-equal.html` | `app/expense/new.tsx` (one screen, Equal/Custom toggle) |
| `07-settle-up.html` | `components/sheets/SettleUpSheet.tsx` (+ error toast) |
| `08-smart-settle.html` | `app/smart-settle.tsx` (surprise Option 1 only) |
| `10-duplicate-warning.html` | `components/DuplicateDialog.tsx` |
| `11-expense-detail.html` | `components/sheets/ExpenseDetailSheet.tsx` |
| `12-activity.html` | `app/(tabs)/activity.tsx` |
| `13-budget-edit.html` | `components/sheets/BudgetSheet.tsx` |
| `14-delete-confirm.html` | `components/ConfirmDialog.tsx` |
| `15-states.html` | `OfflineBanner`, `Skeleton`, `EmptyState`, `PrimaryButton` loading, success/error toasts |

Mockup data is the benchmark seen by **Ayesha**. Real screens use live API data.

---

## Step F1 — Foundation (≈ 40 min)

> Read CLAUDE.md and docs/FRONTEND.md. In `mobile/` (fresh create-expo-app project), delete the template's
> example screens/components and build the foundation: `src/config.ts` (API_BASE_URL),
> `src/theme.ts` with the exact tokens from FRONTEND.md, `src/api/types.ts` matching CLAUDE.md section 5 shapes
> exactly, `src/api/client.ts` (Bearer token from AuthContext, JSON parse, throws ApiError {status, code,
> message, details}; fetch failure → code NETWORK_ERROR message "Can't reach server. Check Wi-Fi."; 401 → calls
> the registered logout handler), `src/api/endpoints.ts` with a typed function for every endpoint in CLAUDE.md
> 5.1–5.7,
> `AuthContext` (SecureStore persistence), `useApiQuery` (refetch on focus + pull-to-refresh support) and
> `useSubmit` (in-flight lock, Idempotency-Key via expo-crypto randomUUID — reused only when retrying
> after a NETWORK_ERROR, new after any server response — error toast with
> server message). Root `_layout.tsx`: load Plus Jakarta Sans, AuthProvider, Toast, redirect to /login without a
> token. `(tabs)/_layout.tsx`: 4 tabs Home, Shopping, Expenses, Activity with icons and the active colour from
> docs/mockups/02-home.html. Build the shared components listed in FRONTEND.md, matching the mockups' styling.

**Check:** app opens on the phone, tabs switch, nothing crashes.
Commit: `feat(mobile): foundation, api client, theme, components`

## Step F2 — Login (≈ 15 min)

> Build `app/login.tsx` exactly like docs/mockups/01-login.html: brand block, Sign in card with Username and
> Password fields, Sign in button with loading state, inline error box for INVALID_CREDENTIALS, demo-account
> chips that fill the username field. On success store token + member and go to Home.

## Step F3 — Home (≈ 30 min)

> Build `app/(tabs)/index.tsx` from docs/mockups/02-home.html: header with initials avatar, "Signed in as" name
> and Ali / Ayesha / Bilal chips (tapping another member calls login with the seeded password `pass1234` and
> swaps the token, with no login screen) plus a small Sign out button (logout → /login); budget card (GET /budget: month label, spent, budget,
> progress bar coloured by status, status badge with percent, remaining — show "Over budget by PKR X" when
> negative); balance card for the logged-in member from GET /balances (red "You owe", green "You are owed",
> neutral "You're all settled up", plus who-is-owed line and a Settle up button that opens the SettleUpSheet);
> pending items and month-expense count tiles; Recent activity (first 3 of GET /activity, using `payer_name` for "Ali paid") with "See all" →
> Activity tab. Pencil button opens BudgetSheet (docs/mockups/13-budget-edit.html: amount field, live preview
> of percent/status/remaining, PUT /budget). Skeleton while loading (docs/mockups/15-states.html), pull-to-refresh.

## Step F4 — Shopping + checkout (≈ 35 min)

> Build `app/(tabs)/shopping.tsx` from docs/mockups/03-shopping.html: add-item card (title, unit chips pack/
> dozen/bottle/bag, quantity stepper, Add button → POST /shopping), Pending list with checkboxes, Pending tag,
> "added by" text and a delete button only on my own items (ConfirmDialog → DELETE), Bought list with Bought
> tag, and a floating "Checkout N items" bar when items are selected. EmptyState when the list is empty.
> CheckoutSheet from docs/mockups/04-checkout.html: selected item chips, total paid AmountField, payer chips
> (default me), split-member checkboxes (default all) with live per-person shares from utils/split.ts and the
> leftover-paisa note, Confirm button via useSubmit → POST /shopping/checkout, success toast, refetch, clear selection.

## Step F5 — Expenses + settle (≈ 40 min)

> Build `app/(tabs)/expenses.tsx` from docs/mockups/05-expenses.html: header with Add expense button
> (→ /expense/new); Balances card with a table (Member, Paid, Share, Net coloured, my row highlighted, "Total
> PKR 0.00 ✓"), Settle up button (SettleUpSheet) and Smart Settle button (hidden until the surprise task —
> keep the prop ready); this month's expense list (GET /expenses) with category · payer · split text, Checkout
> tag, delete only on mine. Tapping an expense opens ExpenseDetailSheet (docs/mockups/11-expense-detail.html:
> category + source tags, amount, payer/date/logged-by line, bought items for checkout expenses, who-owes-what
> list, paisa note, Delete button for the creator → ConfirmDialog from docs/mockups/14-delete-confirm.html with
> the "items go back to Pending" sentence for checkout expenses).
> SettleUpSheet from docs/mockups/07-settle-up.html: From = me with my debt (read-only), Pay to = members who
> are owed with their credit, amount field with "Max you can settle with X: PKR Y" hint and "Use max", client
> hint validation, Record settlement via useSubmit → POST /settle; server errors as the red toast. If I don't
> owe anything, show "You're all settled up" instead of the form.

## Step F6 — Add expense + duplicate guard (≈ 30 min)

> Build `app/expense/new.tsx` from docs/mockups/06-add-expense-custom.html and 09-add-expense-equal.html: title,
> category chips, date (datetimepicker, max = today), amount, paid-by chips (default me), Equal/Custom
> segmented control. Equal: member checkboxes with live shares and the leftover-paisa note. Custom: an amount
> input per member and a "Remaining to allocate PKR X" bar; Save is disabled with the text "Allocate PKR X
> more to save" until remaining is exactly 0.00 (compare in paisa). Save via useSubmit → POST /expenses. On 409
> DUPLICATE_SUSPECTED show DuplicateDialog (docs/mockups/10-duplicate-warning.html) with the existing
> expense's details (`created_by_name` for "X already logged", `payer_name` for "X paid"): "Don't save, view existing" goes back; "Save anyway" re-sends the same body
> with confirm_duplicate: true and a new Idempotency-Key.

## Step F7 — Activity (≈ 15 min)

> Build `app/(tabs)/activity.tsx` from docs/mockups/12-activity.html: GET /activity grouped into Today /
> Yesterday / date headers, icon tile per type (settlement green arrow, checkout cart, expense receipt), text
> "Ayesha paid Ali", "Ali checked out Milk, Rice", "Bilal added Internet Bill", subtitle with category/split and
> time, amount on the right (settlements green). Pull-to-refresh, EmptyState.

## Step F8 — Resilience & polish (≈ 20 min)

> Go through every screen against docs/mockups/15-states.html and CLAUDE.md section 7: skeletons on first load,
> OfflineBanner with Retry whenever the last request failed with NETWORK_ERROR, every submit button disabled +
> spinner while in flight, success and error toasts, 401 → login. Check spacing, font weights, PKR formatting
> and colours against the mockups. Make sure there are no console warnings (keys, missing deps).

**Check (with real backend):** run the demo flow in docs/DEMO.md on the phone. Then stop the
backend and confirm the offline banner + toast appear, restart it and pull to refresh.
Commit + `git tag v1-mobile`.

---

## Surprise task — mobile prompts (hour 3.5)

- **Option 1 Smart Settle:**
  > Show the Smart Settle button on the Expenses balances card. Build `app/smart-settle.tsx` from
  > docs/mockups/08-smart-settle.html: summary card with the number of payments, one card per suggestion from
  > GET /balances/simplify ("Ayesha → Ali · PKR 250.00"); One-Tap Settle calls POST /settle (useSubmit, spinner
  > "Settling…", then "Settled ✓"); suggestions where I'm not the sender show "Only X can record this" instead of
  > a button; Refresh suggestions button; refetch balances after each settle.
- **Option 2 Tax & discount:**
  > In CheckoutSheet add Tax (%) and Discount (PKR) fields under the total, and a live breakdown: items total,
  > + tax, − discount, = final amount (computed in paisa), with the per-person shares based on the final amount.
  > Send tax_percent and discount_amount; show them in ExpenseDetailSheet when present.
- **Option 3 Category budgets:**
  > On Home add a "Spending by category" card: a row per category with a small bar (share of budget) and amount;
  > categories with exceeded: true show a warning badge "Groceries limit exceeded" in the owe colours.
- **Option 4 Recurring:**
  > Add a "Mark as monthly recurring bill" checkbox to the add-expense screen (sends is_recurring) and a
  > "Generate monthly recurring bills" button on Home → POST /expenses/recurring/apply, toast "Created N bills".

Keep every existing screen working — run the full demo flow again before pushing.
