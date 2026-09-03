# Agent Instructions — Stick Tower Defense

This file is for any AI agent (Claude Code or otherwise) making changes to this repository.

## Canonical reference

- **Live game:** https://sauerninja.github.io/StickTD/
- **Repo (source of truth):** https://github.com/SauerNinja/StickTD

Before making changes, check the live URL and/or pull the current repo state rather than assuming
the version you have locally is current — this repo may be updated outside of any given session.

## Versioning: auto-bump one patch level per meaningful change

`GAME_VERSION` in `index.html` increments by exactly one patch level (`x.y.Z` → `x.y.Z+1`) for
each meaningful change shipped — a bug fix, feature, or balance change. Never jump more than one
patch level in a single change, and never bump the minor or major version without explicit
instruction. Purely cosmetic/no-op edits (typo fixes in comments, whitespace) don't need a bump.

## Required workflow: update the changelog

Whenever you make a meaningful change to `index.html` — a new feature, a balance change, a bug fix,
a rework of an existing system — you must:

1. **Add an entry to `CHANGELOG.md`**, at the top (newest first), under a new `## [x.y.z] -
   YYYY-MM-DD` heading matching the version you just bumped to. Don't leave meaningful changes
   sitting under `[Unreleased]` — since versioning is now automatic per change, each one gets its
   own versioned heading immediately rather than waiting to be batched later.

2. Each entry is a **bullet list**, and each bullet should say what changed **and why** — not just
   "fixed archer," but "fixed archer's cooldown being too fast for its draw animation to read
   clearly." A future agent (or the repo owner) should be able to understand the *reasoning* behind
   a change from the changelog alone, without re-reading the whole diff.

3. Keep entries **user-facing and honest** — describe what actually changed in the game, not
   internal refactor details, unless the refactor itself is the point of the entry.

## Ideas & backlog — capture as they come up, not just what's done

`CHANGELOG.md` only records completed, shipped work. That's not enough — ideas, requests, and
half-formed suggestions that come up mid-conversation but aren't acted on yet get lost the moment
the session ends, forcing the person to re-explain them later.

Keep a `BACKLOG.md` at the repo root for this. When the person floats an idea, mentions a feature
they might want later, or a suggestion comes up that isn't being implemented right now, add a
one-line entry under `## Ideas` before moving on — don't wait until it's "worth" recording. When an
idea from the backlog gets built, move it to `CHANGELOG.md` under its version and delete it from
`BACKLOG.md` rather than leaving stale duplicates in both files.

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
