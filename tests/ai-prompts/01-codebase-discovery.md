# 01 — Codebase discovery

**Agent:** Explore (Claude Code subagent specialized in codebase search).
**Goal:** Answer 7 structured questions about 4gaBoards before writing a single line of test
code, so the test architecture is grounded in how the app is actually built.

## Why a single structured prompt vs. ad-hoc grepping

Each grep / read costs context and time. One prompt with a numbered question list returns
a structured report I can reference later. The agent runs many searches in parallel; I only
spend tokens on the synthesis.

## Prompt (verbatim)

> Map 4gaBoards (`/Users/jk/Documents/snorkel-takehome/4gaBoards/`) for Playwright E2E.
> Targets: card lifecycle (CRUD + DnD between lists) and auth (login / invalid / logout /
> session). Facts only, file:line where relevant, ≤500 words, numbered to match:
>
> 1. DnD lib — confirm react-beautiful-dnd + usage site. (Drives mouse-stepping vs `dragTo`.)
> 2. `data-testid` / `data-test` / `data-cy` density: broad, sparse, or none. (Drives locator priority.)
> 3. i18n library + EN string location. (Determines if `getByText` is safe.)
> 4. Login route + actual input `name`/label attrs + demo creds.
> 5. Component paths only: Board, List, Card, CardModal.
> 6. REST API: 3–5 endpoints for auth + project/board/list/card create — method + path.
> 7. Existing E2E setup: yes/no.
>
> No pros/cons, no recommendations to instrument the app.

## Outcome

The agent returned exactly the structure requested:

- rbd v13.1.1 confirmed in `client/package.json`; usage at `client/src/components/Board/Board.jsx` (`handleDragEnd` at L35, `<DragDropContext>` at L126).
- **Zero `data-testid`** anywhere in the client → drove our locator strategy: lean entirely
  on `getByRole` / `getByLabel` / `getByText`. (This is *also* what current Playwright
  best practices recommend — turning a constraint into a virtue.)
- react-i18next, EN strings at `packages/locales/src/en/*.js` (static at test time → safe
  for `getByText`).
- Login: `/login`, fields `name="emailOrUsername"` and `name="password"`, label "Email or
  username".
- API endpoints confirmed at `server/config/routes.js`: enabled the API-seeded test data
  pattern.
- No existing E2E setup → clean slate.

## What was kept vs. discarded

| Kept | Discarded |
|---|---|
| API endpoint list → `helpers/api.ts` | Component file paths (we never need to read them; we read the rendered DOM). |
| EN strings location → confirmed `getByText` is safe | Specific exported translation keys (over-specific; locale strings can change). |
| `data-testid` finding → locator priority order | Suggestions to add test ids (out of scope for a take-home; not our codebase to instrument). |

## Why this beats "explore the repo"

The agent had a clear contract. If it had answered question 4 with "see Login.jsx", I'd have
to make another call. The numbered list with explicit asks ("file + line", "list
endpoints with HTTP methods") forced concrete output.
