# 04 — Debugging template

When a spec flakes or fails, this is the prompt structure I use. It's deliberately
context-rich so the agent doesn't have to guess what we've already tried.

## Template

> Diagnose, don't fix. Playwright spec failing.
>
> - **Behavior under test:** *(one sentence, user-facing — not the code)*
> - **Spec:** `tests/e2e/specs/<file>.ts:<line>`
> - **Failure mode:** timeout / assertion / not-found / flaky
> - **Already ruled out:** *(bullets — element renders, network 200, etc.)*
> - **Failing snippet:** *(3–5 lines)*
> - **Trace top events:** *(3 from `show-trace`)*
> - **My hypothesis:** *(what I think + why)*
>
> Give 2–3 ranked alternative hypotheses. For #1, propose the smallest diagnostic
> (a `console.log`, `page.pause()`, `expect.poll`, locator dump) — not a rewrite. I'll
> rewrite once we know which hypothesis holds.

## Why this works

- **"Diagnose, don't fix"** stops the agent from rewriting the test in a way that papers
  over the actual bug.
- **"Already ruled out"** stops it from re-suggesting the obvious.
- **"Ranked alternatives"** treats the agent as a hypothesis generator, not an oracle.
- **"Smallest diagnostic"** keeps the loop tight.

## Likely failure modes for this project (pre-noted)

| Symptom | First hypothesis to test |
|---|---|
| Card move via mouse DnD silently no-ops | rbd ignored a too-fast drag — increase `steps` in `dragCardToList`. |
| Card move via keyboard DnD doesn't activate | Card not focusable; rbd attaches keyboard handlers to a child. Inspect the actual focused element. |
| Card modal `getByRole('textbox')` ambiguous | Multiple textboxes inside dialog; chain `.first()` or filter by `name:`. |
| Logout menu item not found | Menu is in a portal outside `[role=navigation]`; query at page level. |
| Card title `getByText` matches twice (board + modal) | Scope to `boardPage.list(...)` or `cardModal.dialog`. |
| Real-time socket update races UI assertion | Replace `toBeVisible` with `expect.poll` or wait on the `PATCH` response. |
