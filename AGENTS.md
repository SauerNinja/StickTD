# Agent Instructions — Stick Tower Defense

This file is for any AI agent (Claude Code or otherwise) making changes to this repository.

## Canonical reference

- **Live game:** https://sauerninja.github.io/StickTD/
- **Repo (source of truth):** https://github.com/SauerNinja/StickTD

Before making changes, check the live URL and/or pull the current repo state rather than assuming
the version you have locally is current — this repo may be updated outside of any given session.

## Versioning: do NOT bump without explicit instruction

`GAME_VERSION` in `index.html` must only change when the user explicitly asks for a version bump.
Do not increment it automatically just because you shipped a feature, fix, or balance change —
even a meaningful one. Treat version bumps as a deliberate, user-directed action, not a routine
side effect of editing the game.

## Required workflow: update the changelog

Whenever you make a meaningful change to `index.html` — a new feature, a balance change, a bug fix,
a rework of an existing system — you must:

1. **Add an entry to `CHANGELOG.md`**, at the top (newest first). If the user has just directed a
   version bump, use a new `## [x.y.z] - YYYY-MM-DD` heading. If not, add the entry under an
   `## [Unreleased]` heading at the top instead — don't invent a version number yourself. When the
   user does eventually ask for a bump, roll the accumulated `[Unreleased]` entries into the new
   versioned heading at that point.

2. Each entry is a **bullet list**, and each bullet should say what changed **and why** — not just
   "fixed archer," but "fixed archer's cooldown being too fast for its draw animation to read
   clearly." A future agent (or the repo owner) should be able to understand the *reasoning* behind
   a change from the changelog alone, without re-reading the whole diff.

3. Keep entries **user-facing and honest** — describe what actually changed in the game, not
   internal refactor details, unless the refactor itself is the point of the entry.

## Other conventions already established in this repo

- Single self-contained `index.html`. No build step, no external dependencies, no separate JS/CSS
  files. Keep it that way.
- Before shipping any change, run a syntax check: extract the script block and run `node --check`
  on it. For anything touching game-critical logic (pathfinding, save/load, combat math), write a
  small standalone Node script that exercises the actual logic and verifies it — don't just assume
  correctness from reading the code. Several real bugs in this project were only caught this way.
- `README.md` is the player-facing overview. `CHANGELOG.md` is the version history. Don't merge
  these — keep the changelog itself out of the README beyond linking to it.
- Version number lives in exactly one place (`GAME_VERSION` in `index.html`) and is referenced
  everywhere else (start screen, Settings > About, save files). Don't hardcode it a second time.
