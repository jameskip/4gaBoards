# 03 — Design decisions: prompts that shaped the architecture

These are meta-prompts to the assistant that drove what to test and how to structure it.
Captured here because the *plan* is a deliverable too — and the way we arrived at it
matters more than the final shape.

## Prompt: feature selection

> Take-home: Playwright E2E for 4gaBoards (kanban). Pick 1–2 features to test where
> "why these" beats "why not the others." For each pick: the user-visible risk it covers
> + why it's stable enough for E2E. Then list 3 features to explicitly defer with one-
> line rationales — not "out of time," real reasons (third-party dep, low risk, requires
> infra we don't have, etc.).

**Outcome:** Settled on (a) auth, (b) card lifecycle. Kept SSO, markdown editor, import,
multi-user collab as out-of-scope with explicit reasons. The "explicit reasons" matter:
in a real interview, "we didn't test SSO because Playwright docs explicitly warn against
testing third-party providers" is a defensible answer; "we ran out of time" isn't.

## Prompt: defending each architecture choice

> Audit the plan against Playwright best practices (skill + context7). For every
> architecture choice — locator strategy, auth fixture, data seeding, DnD approach,
> browser matrix, server orchestration — produce a one-line "why" citing the doc/skill
> section it comes from. Flag any choice I can't defend that way; ignore the ones I can.
> Output: just the flags + suggested replacement.

This was the highest-leverage prompt of the project. It forced every decision into a
"why" column — locator strategy, auth fixture, API-seeded data, DnD approach,
single-browser-by-default, no `webServer` orchestration. Each one is now defensible in
an interview without notes.

The prompt's value comes from inverting the default: instead of "review and tell me
what's good," it asks only for the indefensible choices. Cuts noise; surfaces gaps.

## Prompt: optimize for conciseness and readability

> Scan the test code for: (1) page-object methods called by zero specs, (2) helpers used
> exactly once, (3) comments that restate the next line, (4) redundant waits before a
> web-first assertion. Report a list — file:line + which category. Don't edit; I'll cut.

Translated this into concrete rules I applied as I wrote:

- Page objects expose only locators that specs actually use. No "just in case" methods.
- Helpers are pure functions or single-purpose classes — no abstract base classes.
- No comments that restate the code. One-line JSDoc only when *why* isn't obvious (e.g.,
  the rbd note in `dnd.ts`).
- Test bodies read as `Given / When / Then` without saying so.
- Fixture file is one screen.

## What I deliberately did *not* ask the AI to do

| Not asked | Why |
|---|---|
| "Write all the tests for me" | Synthesis must be human — agents conflate similar specs into one. |
| "Pick the features for me" | Feature selection is the most opinionated part of the plan. |
| "Mock the database / API" | The skill's `when-to-mock.md` philosophy: prefer real infra unless flake or speed forces otherwise. We have a local stack; use it. |
| "Generate test data factories" | Nine spec tests; data is inline. Factories would be over-engineering. |
| "Add data-testid to the React app" | Not our code to instrument; semantic locators are the modern best practice. |
