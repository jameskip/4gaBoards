# AI Agent Usage Log

This folder contains the prompts I gave to AI agents while building this E2E suite. The
goal is to show *how* AI was used efficiently, not just *that* it was used.

## Working principles

1. **Discovery before code.** Map the codebase first. A targeted Explore-style agent
   answers structured questions — locator strategy, DnD library, i18n, API routes — so
   we don't write tests that fight the framework.
2. **Skill > training data.** When a Playwright-best-practices skill is available, read
   it directly. Library docs (Playwright via context7) trump general knowledge for fast-
   moving tooling.
3. **Synthesis stays human.** Agents do search and boilerplate. Decisions (what to test,
   what to mock, what to defer) are made in the conversation and recorded here, not
   delegated.
4. **Each prompt is reproducible.** Verbatim prompt + outcome + what was kept vs. discarded.

## Files

| File | Purpose |
|---|---|
| [01-codebase-discovery.md](01-codebase-discovery.md) | One-shot Explore agent prompt to map selectors, DnD library, API surface. |
| [02-playwright-best-practices.md](02-playwright-best-practices.md) | How the `playwright-best-practices` skill and `context7` Playwright docs were consulted. |
| [03-design-decisions.md](03-design-decisions.md) | Meta-prompts that shaped the test plan and architecture. |
| [04-debugging-template.md](04-debugging-template.md) | Reusable template for when a test flakes — context-rich, not "fix it". |
| [05-debugging-actual.md](05-debugging-actual.md) | The actual debugging loop that took the suite from first-run failures to zero-flake at `--repeat-each=10` (91/91 green) — locator iteration, API-contract surprises, rbd quirks, rate limiter, dev-server contention. |
