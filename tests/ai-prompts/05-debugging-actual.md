# 05 — Actual debugging loop (what really happened)

Real run-through of the AI-assisted iteration once tests started executing. This is the
most representative artifact for "efficient AI usage" — speculative locators meet reality,
and the loop tightens.

## Phase 1: Login form labels

**Speculative:** `getByLabel('Email or username')`

**Reality (from reading `client/src/components/Login/Login.jsx:201-216`):** The labels are
plain `<div className={s.inputLabel}>{t('common.emailOrUsername')}</div>` divs — no
`<label htmlFor>` association. `getByLabel` finds nothing.

**Diagnostic prompt I'd give an agent:** *"`getByLabel('Email or username')` returns
nothing — JSX renders the label as a sibling `<div>`, no `htmlFor`. Rank stable selectors
for an input with no label association, no placeholder, no `data-testid`. Don't propose
instrumenting the app; this is a third-party codebase."*

**Fix kept:** `page.locator('input[name="emailOrUsername"]')`. The `name` attribute is a
form-contract identifier, more stable than a hashed CSS class.

## Phase 2: Post-login indicator

**Speculative:** `getByRole('main')`. The app has no `<main>`.

**Reality (from a one-shot DOM exploration spec):** Authenticated home renders only
`Header_wrapper` + `Static_wrapper` divs and buttons identified by `title` attributes.

**Diagnostic move:** wrote a short `_explore.spec.ts` that dumps roles, button titles, and
class prefixes via `page.evaluate`. Two minutes of exploration replaced ten minutes of
guessing.

**Fix kept:** `page.locator('button[title="Profile and Settings"]')` — header element,
present on every authenticated page, renders before any data fetch. (First tried
`getByRole('button', { name: 'Profile and Settings' })` but failed: the button's visible
text "DD" — user initials — overrides the title for accessible-name calculation.)

## Phase 3: API request shapes

**Speculative:** `POST /api/projects/:id/boards` with `{ name, position }`.

**Reality (from probing `curl`):** Sails server requires `isGithubConnected: false` to be
present in board create, and `isCollapsed: false` for list create. Without them, returns
`E_MISSING_OR_INVALID_PARAMS`.

**Fix kept:** Helper passes the required no-op fields and asserts `body.item?.id` — fails
fast with the actual server response if the contract drifts again.

## Phase 4: List/card semantic locators

**Speculative:** `getByRole('region')` for lists, `getByRole('article')` for cards.

**Reality:** Lists and cards have no ARIA roles at all. They're CSS-modules divs:
`List_outerWrapper__<hash>`, `Card_wrapper__<hash>`, `Card_name__<hash>`.

**Fix kept:** Partial-class matching: `[class*="List_outerWrapper"]` and
`[class*="Card_wrapper"]` — survives CSS-modules hash changes, drifts only if the
component is renamed (rare).

## Phase 5: rbd drag-and-drop

**Speculative:** `dragTo()` would just work.

**Reality:** As the best-practices skill warned (`drag-drop.md` Tip #2), rbd ignores
single-mousemove drags. Two valid fixes per the Playwright API: `dragTo(target,
{ steps: 20 })` or the manual `hover → mouse.down → mouse.move(target, { steps: 20 })
→ mouse.up`. We chose the manual form to keep the hover-before-mousedown ordering and
the rbd rationale visible at the call site.

**Subtle gotcha:** `Card_wrapper` is the rbd-Draggable element. Calling `.click()` on it
routes to the drag handler, not to "open card". For DnD: target `Card_wrapper`. For
opening the modal: target the inner `Card_name`.

**Fix kept:** `card()` returns the `Card_wrapper` (DnD-ready); `openCard` chains to
`.locator('[class*="Card_name"]').click()` to avoid the rbd handler.

## Phase 6: Modal close

**Speculative:** `Escape` closes the modal.

**Reality:** `Escape` exits inline-edit mode (e.g., title editor) but leaves the modal
open. There's an explicit `Close Card` icon button in the modal header.

**Fix kept:** `getByRole('button', { name: 'Close Card' })`.

## Phase 7: Delete confirmation popup

**Speculative:** Confirm popup has a "Delete" button distinct from the modal's "Delete
Card" trigger.

**Reality:** Both buttons match `name=/Delete/i`. Distinguishing factor: visible text
case. Trigger has `title="Delete Card"` (capital, no visible text). Confirm has visible
text `"Delete card"` (lowercase 'c').

**Fix kept:** `{ name: 'Delete Card', exact: true }` for trigger and `{ name: 'Delete
card', exact: true }` for confirm — both case-sensitive whole-string matches.

## Phase 8: Rate limiting under stress

**Symptom:** Under `--repeat-each=3`, ~30 logins in quick succession trigger the server's
`tooManyFailedAttempts` rate limiter (429).

**Diagnosis:** The `api` fixture was test-scoped — every test re-logged in.

**Fix kept:** Worker-scoped `api` fixture. Each worker logs in once and reuses the token
for all its tests. ~4 logins per full run instead of 10. Single-pass CI is unaffected
either way; this only mattered for stress validation.

## Phase 9: Logout invalidates the suite-level token

**Symptom:** `Board_boardContainer` not visible — page redirected to `/login`. Workers
running card-lifecycle in parallel were hitting `playwright/.auth/user.json`'s token
*after* the logout test in another worker had killed it server-side. Serial-mode-within-a-
file orders nothing across workers.

**Fix kept:** The logout test gets its own clean context via
`test.use({ storageState: { cookies: [], origins: [] } })`, does a UI login → UI logout
within that isolated session, and never touches `user.json`. The token in `user.json`
stays valid for every other worker. Verified: 91/91 green at `--repeat-each=10`.

## Phase 10: Auth rate limiter accumulating across runs

**Symptom:** Single-pass green; sequential runs flake on the 5th in 60s. The "invalid
credentials" test fails because the server returns 429 instead of "Invalid username or
password."

**Diagnosis:** `server/api/policies/rate-limit-auth.js` buckets failed attempts by
`(emailOrUsername, IP)`. Re-using `demo` + wrong password every run incremented the
same bucket; 5 failures in 60s tripped the limiter.

**Fix kept:** Rotate the bad username per run — `nope${Math.random().toString(36).slice(2, 10)}`
(within the 16-char username constraint). Each run hits its own bucket. The real `demo`
user's bucket stays clean.

## Phase 11: Dev-server contention with default 4 workers

**Symptom:** Intermittent `Loading…` spinner on `page.reload()` exceeding the 10s
`expect.timeout`. Pure server-side load — Sails dev mode is single-threaded.

**Fix kept:** `workers: isCI ? '50%' : 1`. Local runs sequentially (dev server is the
bottleneck, not the test machine). CI keeps `'50%'` because production hardware
parallelizes fine. Also added `globalSetup: ./e2e/global-setup.ts` that API-deletes any
leftover `E2E*` projects before each run, so the dashboard never gets bloated by debug
runs that crashed mid-cleanup.

## Phase 12: ESLint caught a redundant `networkidle`

**Symptom:** None — the suite passed. But after wiring up `eslint-plugin-playwright` with
the `flat/recommended` preset, `no-networkidle` flagged `BoardPage.goto:10`.

**Diagnosis:** We had `await page.waitForLoadState('networkidle')` *after* asserting
`Board_boardContainer` was visible. Subsequent test actions auto-wait anyway, and 4gaBoards
opens WebSockets that can keep the network busy indefinitely — exactly why the rule
discourages it.

**Fix kept:** Removed the line. `--repeat-each=5` dropped from 55.7s → 42.7s with the same
46/46 zero-flake result. The lint rule paid for itself on day one.

## Meta

**Total iterations from "first failing run" to zero-flake green at `--repeat-each=10`
(91/91):** 11 cycles of {run → read failure → targeted exploration via `_explore.spec.ts`
or trace-viewer → minimal fix → re-run}.

**Single biggest accelerator:** the throwaway `_explore.spec.ts` pattern — write a tiny
test that uses `page.evaluate` to dump real DOM structure, run it, throw it away. Three
times faster than reading source and guessing.

**What I would have done worse without AI:** spent more time per locator iteration. The
cycle was tight because the agent could read multiple component files in parallel while
I was re-running the suite.
