# 4ga Boards — E2E Test Plan

## 1. Overview

This plan covers end-to-end tests for **4ga Boards**, a kanban-style project management app
(React + Redux frontend, Sails.js + PostgreSQL backend, deployed via Docker Compose). Tests
are written with **Playwright** and target the locally-running stack at `http://localhost:3000`.

The plan focuses on **two features** chosen for being load-bearing to the product:

1. **Authentication** — gates every other workflow.
2. **Card lifecycle on a board** — the irreducible kanban core (create, edit, move, delete).

Depth over breadth: 9 spec tests + 1 auth setup = 10 total, each independently meaningful
and resilient enough to run in CI without flake. Verified zero flakes at `--repeat-each=10`
(91/91 green).

## 2. System Under Test

| Aspect | Value |
|---|---|
| Application | 4ga Boards (`ghcr.io/rargames/4gaboards:latest`) |
| URL | `http://localhost:3000` |
| Default credentials | `demo` / `demo` |
| Frontend stack | React, Redux, Redux-Saga, Redux-ORM, react-beautiful-dnd, react-i18next |
| Backend stack | Sails.js, Knex.js, PostgreSQL 16 |
| Auth endpoint | `POST /api/access-tokens` (returns bearer token) |
| Logout endpoint | `DELETE /api/access-tokens/me` |
| Data hierarchy | Project → Board → List → Card → Task |

## 3. Features Selected & Why

### 3.1 Authentication (4 tests)

Authentication gates every other interactive flow. A flaky auth fixture would propagate
failures into every other test, so dedicated tests of the login flow itself — plus a
storage-state shortcut for everything else — give us both signal *and* speed.

### 3.2 Card lifecycle on a board (5 tests)

The kanban value proposition lives in this flow. If create / edit / move / delete on cards
breaks, the product is unusable regardless of what else works. It also exercises the riskiest
technical surface in the codebase (drag-and-drop via react-beautiful-dnd), which is where
real-world regressions tend to land.

## 4. Out of Scope (and Why)

| Excluded | Reason |
|---|---|
| SSO providers (Google / GitHub / Microsoft / OIDC) | Playwright's documented best practice is to not test third-party services. Their sign-in pages change unpredictably; the value-add for a take-home is low. |
| Markdown editor internals | Surface feature, not core to kanban semantics. |
| Import / export from Trello | Requires fixture files and tests a one-shot migration path, not core daily-use behavior. |
| Multi-user real-time sync | Requires multi-context coordination; scope creep for the time available. Worth a follow-up suite. |
| Mobile / tablet viewports | The product is positioned as a "wide-screen design"; mobile is not the primary target. |
| Cross-browser (Firefox / WebKit) | Wired in config but not run by default; should be a nightly CI matrix, not gating PR runs. |

## 5. Environment & Setup

**Prerequisites**: Docker Desktop running.

```bash
# from repo root
docker compose up -d                 # bring up app + postgres
# wait until http://localhost:3000 returns 200
pnpm i                                # installs Playwright with the test deps
pnpm exec playwright install chromium # download browser
pnpm test:e2e                         # runs the suite (script added in package.json)
```

App stack and test stack are deliberately decoupled: we do **not** orchestrate Docker via
Playwright's `webServer` option, because that would conflate test infra with deployed infra.
The README documents the prereq.

## 6. Test Architecture Decisions

Each decision below is paired with the *why*, so reviewers can challenge or extend it.

### 6.1 Locator strategy: role > label > text > CSS

The 4gaBoards client has **zero `data-testid` attributes**. Rather than retrofit the
codebase, we lean on user-facing locators (`getByRole`, `getByLabel`, `getByText`), which is
the pattern Playwright explicitly recommends in its best-practices doc. As a side benefit,
these locators double as a low-grade accessibility check — if a button isn't reachable by
role, that's a real a11y bug worth surfacing. CSS selectors are a last-resort fallback,
scoped to component-level CSS-module hashes.

### 6.2 Authenticate once, reuse storage state

A dedicated **auth setup project** runs first, logs in once with `demo`/`demo`, and writes
the authenticated cookies/localStorage to `playwright/.auth/user.json`. Every other test
boots with `storageState: <that file>` and skips the login flow. The auth-specific specs
(login success, invalid creds, logout, persistence) **opt out** of the shared storage state
so they exercise the real flow.

This is the documented Playwright auth pattern and gives us:
- Faster runs (no login per test).
- Sharper failure signals (an auth setup failure stops the suite at the source).
- True isolation for the auth specs themselves.

### 6.3 API-seeded test data, UI-asserted behavior

Each card-lifecycle test creates its own project + board + lists via the REST API in a
`beforeEach` and tears them down in `afterEach`. The UI is then driven only for the
behavior under test (e.g., the move-card interaction), and assertions hit the UI to confirm
what the user sees.

**Why:** parallel-safe (each test owns its data, no shared-state flake), faster (no
multi-click setup chains), and produces sharper failure signals — if a card-move test fails,
it's because the move broke, not because board creation timed out.

### 6.4 Page Object Model via a single `pages` fixture

`LoginPage`, `BoardPage`, `CardModal`, `HeaderPage` POMs encapsulate the brittle bits
(modal open/close, DnD helper, post-login indicator, logout sequence) so specs read as
behavior, not as click sequences. All POMs are exposed under one `pages: { ... }`
fixture (Mozilla FxA's pattern) so specs destructure once:

```ts
test('logout', async ({ pages: { loginPage, header, page } }) => { ... });
```

This scales cleanly as POMs multiply and keeps test signatures uniform. Light POMs only
— no abstract base classes; each POM is one screen of code.

### 6.5 Drag-and-drop: incremental mouse primary, keyboard fallback

The Playwright best-practices guidance for `react-beautiful-dnd` is explicit: a single-
mousemove drag is silently ignored — the library needs **multiple `mousemove` events** to
recognize a drag. Two API-supported fixes: `locator.dragTo(target, { steps: N })` or the
manual mouse path. We use the manual path so the hover-before-mousedown ordering is
explicit at the call site:

```ts
const target = await boundsCenter(targetList);
await card.hover();
await page.mouse.down();
await page.mouse.move(target.x, target.y, { steps: 20 });  // Playwright interpolates
await page.mouse.up();
```

If the mouse path ever flakes, a **keyboard fallback** exercises rbd's built-in
accessibility path (`focus → Space → Arrow → Space`). Both live in `helpers/dnd.ts`. We
assert the **final DOM state** — the card visible in the target list, absent from the
source, and persistence confirmed via `page.reload()` followed by re-asserting the new
location. That covers the "drop succeeded" *and* "the server accepted the move" surfaces
without coupling the test to specific request URLs.

### 6.6 Web-first assertions only

`expect(locator).toBeVisible()`, `toHaveCount()`, `toHaveText()`, `expect.poll(...)` for
real-time scenarios. Zero `waitForTimeout`. Auto-waiting is the entire point of Playwright;
arbitrary sleeps are an antipattern that hides race conditions. Enforced by
`eslint-plugin-playwright` (`no-wait-for-timeout`, `no-networkidle`,
`missing-playwright-await`).

### 6.7 CI-aware config

| Setting | Local | CI |
|---|---|---|
| `fullyParallel` | `true` | `true` |
| `retries` | `0` | `2` |
| `workers` | `1` (Sails dev server is single-threaded — concurrent contexts cause spinner-stalls) | `'50%'` |
| `trace` | `'on-first-retry'` | `'on-first-retry'` |
| `forbidOnly` | `false` | `true` |
| `reporter` | `list` | `html` + `github` |

Trace on first retry, not always — running traces every test is wasteful and is called out
as suboptimal in the Playwright docs.

### 6.8 Forced English locale

`react-i18next` selects locale from the browser's `Accept-Language`. We pin
`locale: 'en-US'` in `use:` to keep `getByText` matches deterministic regardless of the
runner's environment.

## 7. Test Cases — Authentication & Session

Split across two spec files:

- `auth.spec.ts` — runs in the **`auth` project** with empty storage state. Tests the login
  UI flow itself (the unauthenticated → authenticated transition).
- `session.spec.ts` — runs in the **`chromium` project** with the saved storage state.
  Tests behaviors that assume the user is already authenticated.

### A1. Valid credentials redirect away from /login (`auth.spec.ts`)
- **Given** the user is on `/login`
- **When** they submit `demo` / `demo`
- **Then** the URL is no longer `/login`
- **And** the header user-menu button is visible

### A2. Invalid credentials show an error (`auth.spec.ts`)
- **Given** the user is on `/login`
- **When** they submit a non-existent username (`nope${random}`) with any password
- **Then** the error "Invalid username or password" is visible
- **And** the URL is still `/login`

The username is rotated per-run (within the server's 16-char limit) so consecutive runs
don't share a rate-limit bucket — see Risks (§9) for the rationale.

### A3. Session persists across reload (`session.spec.ts`)
- **Given** an authenticated user (via storage state) on `/`
- **When** they reload the page
- **Then** the header user-menu button is still visible
- **And** the URL is not `/login`

### A4. Logout returns to /login and clears the session (`session.spec.ts`)
- **Given** a fresh isolated context (`test.use({ storageState: { cookies: [], origins: [] } })`)
- **When** the user logs in via UI, opens the user menu, clicks "Log Out"
- **Then** they land on `/login`
- **And** reloading does not restore the previous session

The logout test runs in its own `describe` with cleared storage state. It logs in via UI,
gets its own ephemeral token, then logs out — invalidating *that* token only. The
suite-level `playwright/.auth/user.json` token used by every other test is never touched,
so logout cannot poison parallel workers (and `--repeat-each` runs cleanly).

## 8. Test Cases — Card Lifecycle

Five specs in `card-lifecycle.spec.ts`, each independent. Each test seeds its own project +
board via API in setup (per-test data isolation) and tears it down in fixture teardown.

### C1. Create a new card in a list
- **Given** a board with a list named "To Do"
- **When** the user clicks "Add card", types `"Buy milk"`, presses Enter
- **Then** the card appears in the list
- **And** a reload preserves it (persistence check)

### C2. Edit a card title via the modal
- **Given** a board with a card titled `"Original"`
- **When** the user opens the card, edits the title to `"Renamed"`, closes the modal
- **Then** the card on the board shows `"Renamed"` and `"Original"` is gone

### C3. Move a card between lists via DnD (mouse)
- **Given** a board with lists "To Do" and "In Progress" and a card "Task A" in "To Do"
- **When** the user drags "Task A" onto "In Progress" via incremental mouse moves
- **Then** "Task A" is in "In Progress" and absent from "To Do"
- **And** a reload preserves the new position (persistence check)

### C4. Reorder a card within the same list via keyboard DnD
- **Given** a list with cards in order `["A", "B", "C"]`
- **When** the user focuses "A", presses `Space`, `ArrowDown` × 2, `Space`
- **Then** the rendered order is `[B, C, A]`

### C5. Delete a card from the modal
- **Given** a board with a card titled `"Doomed"`
- **When** the user opens the card, clicks "Delete Card", confirms "Delete card"
- **Then** the card is no longer on the board
- **And** a reload confirms the deletion persisted

**Deferred (not in shipping suite):** Edit-description test. The description editor is a
markdown component (`react-markdown` + custom toolbar) with multiple internal states
(view / edit / save). Adding a robust spec for it is straightforward but the scope spike
exceeded the take-home time budget. Approach when revisited: probe the editor's textarea
via `page.locator('[class*="MarkdownEditor"] textarea')` and the save button text. The
plan and helpers are reusable; only the spec body and a `setDescription` POM method need
adding.

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| react-beautiful-dnd flakes under mouse-based DnD | Resolved | — | `mouse.move(target, { steps: 20 })` satisfies rbd's mousemove threshold; verified zero flakes at `--repeat-each=10`. Keyboard a11y path remains as a documented fallback. |
| Real-time websocket update lags UI assertion | Medium | Spurious failures on move/delete | Use `expect(locator).toBeVisible()` (auto-retries) or `expect.poll` for indirect state |
| Demo seed data shared across test workers | Medium | Cross-test interference | Each test creates its own project; never mutates seed data |
| Single shared `demo` user under high parallel load | Medium | Server-side rate limit (429) on repeated logins | Worker-scoped `api` fixture: each worker logs in once and reuses the token across all its tests. Invalid-credentials test rotates the bad username per run (`nope${Math.random()...}`) so each failure hits its own rate-limit bucket. For sustained CI, recommend per-worker test users (`worker-${index}@example.com`). |
| Logout test invalidates the auth.setup-generated token | Resolved | — | Logout test runs under `test.use({ storageState: { cookies: [], origins: [] } })` in its own `describe`. UI login → UI logout in an isolated session; never touches `playwright/.auth/user.json`. Verified zero flakes at `--repeat-each=10` (91/91). |
| i18n locale mismatch breaks `getByText` | Low | Tests fail on non-EN runners | Pin `locale: 'en-US'` in Playwright config |
| Login flow changes (new MFA, captcha) | Low | Auth setup project breaks | Auth setup is one file; quick to update; failure is loud |
| App version drift between test runs | Low | Selectors break silently | Pin docker image tag; document version in README |

## 10. AI Agent Usage Strategy

Per the assignment, prompts given to AI agents are themselves a graded deliverable
(`tests/ai-prompts/`). The strategy is:

1. **Discovery before code.** Before writing tests, an Explore-style agent maps the codebase
   for selector strategy, DnD library, i18n setup, API routes, and existing test infra.
   Saves us from writing tests that fight the framework.
2. **Scaffolding by template, not by retyping.** Agents generate boilerplate
   (config, fixtures, POM skeletons) from a clear spec; humans review and tighten.
3. **Debugging in writing.** When DnD or auth specs flake, the failing trace and a focused
   prompt go to an agent for a hypothesis. Documented so reviewers can see the diagnostic
   loop.
4. **Concise, context-rich prompts.** Each prompt includes: what we already know, what we've
   ruled out, what specifically we want back, and a length cap. We do not ask agents to
   "implement the feature" — synthesis stays with the human.

Each prompt file in `tests/ai-prompts/` includes the prompt verbatim, a one-line note on the
outcome, and what we kept vs. discarded.

## 11. How to Run

```bash
# from repo root, with docker compose stack running
pnpm test:e2e                       # full suite, chromium only
pnpm test:e2e --ui                  # interactive UI mode
pnpm test:e2e --project=chromium specs/auth.spec.ts   # one file
pnpm test:e2e --headed              # watch the browser
pnpm exec playwright show-report    # open last HTML report
```

Trace files for failed retries are at `playwright-report/`. Open one with
`pnpm exec playwright show-trace path/to/trace.zip`.

**CI:** `.github/workflows/e2e.yml` runs the full pipeline on every push and PR — lint
→ docker compose up → wait for `/api/core-settings-public` → install Playwright browsers
(no cache; per Playwright official guidance, restore time ≈ download time) → run tests
(GitHub Actions auto-sets `CI=true` so config promotes `workers: '50%'` and `retries: 2`)
→ upload HTML report always (except on cancellation) and failure traces + app logs on
failure. Concurrent runs on the same ref are cancelled.
