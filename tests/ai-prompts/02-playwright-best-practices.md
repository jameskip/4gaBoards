# 02 — Playwright best-practices consultation

**Tools:** `playwright-best-practices` skill (local) + `context7` MCP server (Playwright
official docs) + Mozilla FxA's [functional-testing reference](https://mozilla.github.io/ecosystem-platform/reference/functional-testing)
for production-scale patterns (single `pages` fixture, severity tags, account trackers).

## Why both, and in what order

| Source | Strength | When to consult |
|---|---|---|
| `playwright-best-practices` skill | Curated, opinionated, organized by activity (DnD, auth, fixtures, etc.) | First — narrow what to read |
| `context7` Playwright docs | Authoritative, current API reference | Second — confirm specific syntax (`dragTo`, `defineConfig` options) |
| Training data | Always-on but stale | Last resort — flag as "needs verification" |

## Targeted skill prompts

The skill is structured as an activity index. I read the index page, then jumped directly
to the relevant files:

- `testing-patterns/drag-drop.md` — biggest project risk
- `advanced/authentication.md` — storage state + setup project pattern
- `core/locators.md` — priority order for a no-`data-testid` codebase
- `core/fixtures-hooks.md` — POM-as-fixture pattern
- `core/page-object-model.md` — POM structure
- `core/configuration.md` — production-ready config

## Targeted context7 queries

Three parallel, keyword-only queries — each scoped to one gap I couldn't close from the
skill alone. Keyword form (not prose) is deliberate: context7 ranks on token overlap, so
loading the query with the exact API surface I want returns the relevant page faster.

> locators getByRole getByLabel priority web-first assertions auto-wait test isolation

> storageState authentication setup project login-once reuse session dependencies

> drag-and-drop react-beautiful-dnd dragTo mouse.move steps keyboard fallback

The DnD query was the highest-value: confirmed that `dragTo()` with default options
fails silently against rbd because it dispatches only one mousemove between source and
target — rbd needs many. The fix is `{ steps }`, available either as `dragTo(target,
{ steps })` or via the manual `mouse.move(target, { steps })` path. This flipped our
DnD strategy from "keyboard primary" to "incremental mouse primary" before any spec was
written.

## Decisions that came directly from skill / context7

| Decision | Source |
|---|---|
| `setup` project + `dependencies: ['setup']` for auth | skill `authentication.md` + context7 |
| `storageState: { cookies: [], origins: [] }` for auth specs | skill `authentication.md` ("Unauthenticated Tests" pattern) |
| Incremental `mouse.move(target, { steps })` for rbd (equivalent: `dragTo(t, { steps })`) | skill `drag-drop.md` Tip #2, context7 confirmed |
| `trace: 'on-first-retry'`, not `'on'` | skill `configuration.md` artifact strategy |
| Reporter: CI = `[dot, html, github]`; local = `[list, html on-failure]` | skill `reporting.md` Decision Guide for GitHub Actions — `dot` keeps Actions logs informative during the run; `github` adds PR annotations; `html` for post-run drill-down |
| `forbidOnly: !!CI`, `retries: isCI ? 2 : 0`, `workers: isCI ? '50%' : 1` | skill `configuration.md` production config; local `workers: 1` because the Sails dev server is single-threaded and chokes under contention |
| `globalSetup` API-cleans stale `E2E*` projects before each run | skill `global-setup.md` "one-time DB seed" pattern; prevents test data accumulating into a slow dashboard |
| Single `pages: { loginPage, boardPage, cardModal, header }` fixture; specs destructure once | Mozilla FxA's functional-testing convention — keeps test signatures uniform as POMs multiply, centralizes all DOM selectors out of spec files |
| `HeaderPage` POM extracted for `userMenu` + `logout()` (was inline in 2 specs) | Mozilla FxA: "Centralize all DOM selectors in POMs, not inline in tests" |
| `eslint-plugin-playwright` with `flat/recommended` + extras (`no-focused-test`, `no-skipped-test`, `missing-playwright-await`, `no-wait-for-timeout`, `expect-expect`, `valid-title`) | Catches `.only`/`.skip` commits, missing awaits, arbitrary timeouts. Caught a redundant `waitForLoadState('networkidle')` on first run — see 05 Phase 12. |
| Modern flat ESLint config: `typescript-eslint` v8 unified package + `tseslint.configs.recommendedTypeChecked` (type-aware) | Type-aware linting catches floating promises and `any` access — caught untyped `await res.json()` in `helpers/api.ts` on first run; fixed with `ItemResponse<T>` typing |
| `eslint-plugin-perfectionist` — sort-imports, sort-named-imports, sort-exports, sort-named-exports only (skipping `recommended-natural`) | Sorted imports auto-fixable; full preset is too aggressive (sorts class members and object keys, breaking semantic ordering of config files and POMs) |
| Locator priority `getByRole > getByLabel > getByText` | skill `locators.md` priority order |
| API-seeded test data + UI-asserted behavior | skill `architecture/when-to-mock.md` philosophy |
| `expect.timeout: 10_000` separately from test `timeout: 30_000` (skill recommends 5–10s; we use 10s for headroom under dev-server load) | skill `configuration.md` |

## Anti-patterns explicitly avoided

From skill anti-pattern tables:

- ❌ `page.waitForTimeout(2000)` after login → ✅ `await expect(...).toBeVisible()`
- ❌ Hardcoding real credentials → ✅ env vars (we hardcode the documented `demo`/`demo` seed creds inline; for any real account this would move to `process.env.TEST_USER`)
- ❌ Logging in via UI before every test → ✅ storageState shortcut
- ❌ `.btn-primary` CSS selector → ✅ `getByRole('button', { name: 'Log in' })`
- ❌ `trace: 'on'` always → ✅ `'on-first-retry'`
- ❌ Committing `.auth/*.json` → ✅ `tests/.gitignore` includes `playwright/.auth/`
