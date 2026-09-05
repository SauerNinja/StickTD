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
The patch number (`Z`) is not capped at 99 — it can go as high as needed (`1.0.100`, `1.0.250`,
etc.). Only bump the minor version (`Y`, e.g. `1.0.x` → `1.1.0`) when explicitly instructed to.

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

## Architecture overview

- `CONFIG.TOWERS`, `CONFIG.ENEMIES`, `CONFIG.WAVES` are the three top-level data tables — each a
  clearly separated, named section inside one `CONFIG` object. This gives most of the practical
  benefit of split config files without breaking the single-file rule below.
- `EVOLUTIONS` maps starter/first-tier towers to their evolved forms, keyed by which stat
  (str/dex/int) triggers it and the point threshold required. Some towers have a second-tier
  evolution beyond that (e.g. Blowdart → Squirt Gun, Hammerman → Paladin).
- Enemy status effects (burn, poison/curse, slow, stun) live as fields directly on the `Enemy`
  instance (`burnUntil`, `poisonUntil`, `slowTimer`, `stunnedUntil`), checked each tick in
  `update()`. Towers have their own parallel set for breakaway-inflicted statuses.
- `drawStickman()` is the single shared rendering function for every tower class — each class
  branches inside it (`if(type === 'ARCHER')` etc.) rather than having separate draw functions.
- The bottom inspect panel (`#inspect-panel`) is the WC3/WoW-style nameplate + full options UI.
  Tapping the nameplate toggles `inspPanelExpanded` between a compact view (portrait, HP bar,
  combat stats) and the full options row (upgrade/move/sell/target/stats/inventory).
- `#inspTargetFrame` is a separate WoW-style "target of target" frame shown next to the inspect
  panel whenever the selected tower has an active target. It's repositioned every rendered frame
  via `getBoundingClientRect()` against `#inspect-panel`'s actual width, since the panel isn't a
  fixed size. Updated in `render()`, not on state-change events, so its HP bar tracks combat live.
- Leveling is a genuine EXP system (`gainTowerExp()`), separate from the gold-tier `level` field
  used for Upgrade-button tiers. Every tower has `xp`/`expLevel` (1-99), fed by kills, killstreak
  milestones, gold-tier upgrades, and round survival (granted to every active tower at wave-end).
  Each level-up grants exactly 1 stat point. `CLASS_ARCHETYPE` gates which stat actually boosts
  damage per class (STR→Warrior, DEX→Archer-style, INT→Mage — Dota-style, exclusive, not additive
  across archetypes). Barricades are explicitly excluded from EXP in `gainTowerExp()` since they
  don't fight.
- Two toast-style popups reuse the same visual pattern: `showWaveSummary()` (gold + per-class XP,
  at wave end) and `showNewEnemyToast()` (stats + a one-line ability note from `ENEMY_INFO`, the
  first time a `CONFIG.WAVES` entry contains a type not yet in `seenEnemyTypes`, which is
  persisted in save files). Both auto-fade via `setTimeout` and are independent DOM elements so
  they can't clobber each other if triggered close together.

## Dates

Always use the actual current date for changelog entries and any other dated content — check it
rather than assuming or reusing a date from earlier in the session. Don't guess a plausible-sounding
date; if genuinely uncertain what today's date is, ask rather than guess.

## Treat AI-generated suggestions from other sources as unverified, not authoritative

This repo has occasionally received large batches of suggestions from other AI tools (e.g. output
from a separate chat with a different model) that assume things about the codebase without having
actually seen it — different architecture (ES6 modules, classes like `WaveManager`/`GoreController`
that don't exist here), different damage formulas, different balance numbers. Never implement such
suggestions wholesale. Read them for ideas if useful, but verify every specific claim against the
actual current code before acting on it, and default to the patterns already established in this
file and the codebase over an external document's assumptions.

## Recurring failure modes caught this session — check for these specifically

- **Changelog heading consumption.** A `str_replace` whose `old_str` is just a version heading
  line (e.g. `## [1.0.38] - 2026-09-02`) with no surrounding context can match and consume that
  exact heading when inserting a new one above it, silently orphaning the content that used to
  sit under it. This happened repeatedly. Before shipping any `CHANGELOG.md` edit, run this check:
  extract every `## [x.y.z]` heading, confirm the list is strictly descending, has no duplicates,
  and — critically — has no gaps against the full expected range from `1.0.0` to the current
  version. A "descending, no duplicates" check alone is not enough; it will pass even with a
  heading missing from the middle.
- **CSS defined for JS-toggled classes.** Every element whose class gets toggled by JS (most
  commonly `.hidden`) needs an actual matching CSS rule (`#id.hidden{display:none;}` or a shared
  rule that covers it). This codebase has no generic `.hidden{}` fallback — each element's rule is
  defined individually. Adding a new toggleable element without its own CSS rule means the JS runs
  correctly but has zero visible effect. `node --check` will not catch this.
- **Bulk find-and-replace matching inside a variable's own declaration line.** A regex meant to
  insert a reset/assignment after every `x = y;` occurrence can match that exact pattern inside
  `let x = y;` too, inserting an assignment *before* the `let` declaration — a temporal-dead-zone
  `ReferenceError` at runtime that `node --check` cannot detect since it's syntactically valid.
  After any bulk regex edit across multiple call sites, manually review each insertion point.

## Best practices — HTML5 markup

Cross-checked against a general HTML5 reference (semantic elements, outlining, accessibility).
Most of this is already followed; stated explicitly here so it stays that way as the UI grows:

- Use the semantic element that actually matches the content's role (`<header>`, `<nav>`,
  `<aside>`, `<section>`, `<meter>`, `<progress>`, `<details>`) rather than a generic `<div>` with
  a class name doing the same job — already the convention in this codebase's UI overlays, keep it
  that way for any new panel/control.
- Keep a sane heading outline (one logical `<h1>` per page, nested headings inside `<section>`s
  rather than skipping levels) if any new UI text content is added — this repo's overlays are
  mostly icon/canvas-driven so this rarely comes up, but applies the moment prose content does.
- Prefer a native element with built-in semantics/keyboard behavior (`<button>`, `<progress>`,
  `<meter>`) over a styled `<div>` faking the same widget — free accessibility and keyboard
  support that a fake widget doesn't get without extra ARIA work.
- New interactive custom UI (shop cards, item slots) should stay reachable/operable via keyboard
  where practical, not just pointer/touch events, even though this is primarily a touch-driven
  mobile game.

## Best practices — Canvas rendering (learned from real bugs this session)

These are not style preferences — every one of them was the direct root cause of a real, shipped
bug that took real debugging effort to trace. Treat them as required, not optional:

- **Always set `fillStyle`/`strokeStyle` explicitly, immediately before the draw call that
  depends on it — never assume it's still whatever you set earlier.** Canvas 2D context state
  persists across draw calls and even across frames. Multiple "enemies/barricades render
  transparent" bugs this session traced back to a glyph draw (`ctx.fillText(emoji, ...)`) that
  never set its own `fillStyle`, silently inheriting a translucent color left behind by whatever
  aura/effect happened to draw immediately before it that frame.
- **Bracket any `ctx.save()` with a matching `ctx.restore()` in every code path**, including early
  returns. An unmatched `save()`/`restore()` pair leaks transform/alpha/filter state into every
  subsequent draw call for the rest of the frame (and into the *next* frame, since canvas state
  isn't reset automatically between `requestAnimationFrame` calls).
- **A discrete physical event (an impact, a death, a decal appearing) should render at full,
  final size on the exact frame it happens — no grow-in/fade-in animation.** A grow animation on
  something logically instantaneous decouples "when it visually finishes appearing" from "when it
  actually happened," which reads as delayed/buggy even though the trigger fired at the correct
  instant. This was traced and fixed twice this session (once by shortening the animation, which
  wasn't enough; the actual fix was removing it entirely).
- **Render-only cosmetic offsets (hit-flinch, bump wiggle) must live in `draw()`, never touch the
  entity's real `x`/`y`.** Mutating the authoritative position for a purely visual effect risks
  desyncing anything else that reads that position that same frame (pathing, collision, `traveled`
  distance) — a bug that's hard to notice until it compounds over many frames.

## Best practices — state management & derived flags

- **A given piece of derived-per-frame state (e.g. "is this enemy currently blocked/frozen") gets
  set by exactly one piece of code.** Splitting a flag's assignment across multiple loops or
  conditions — even ones that look equivalent — is how the barricade double-occupancy bug
  happened: one loop set `pileBlocked = true` for both the actual attacker and a bystander, and a
  *separate* loop assumed anything already `pileBlocked` didn't need further handling, silently
  stranding the bystander.
- **When the same boolean expression is computed in more than one place, extract it into one
  named function** (see `isEnemyFrozen()`), even if it's a one-liner. Beyond the obvious DRY
  benefit, a named predicate is self-documenting and gives future changes exactly one place to
  update instead of an unknown number of copies to find.
- **A cascading effect (a status propagating backward through a queue, a value inherited from a
  neighbor) must fold in whatever the neighbor *actually currently has*, not the neighbor's own
  unmodified base value.** The stun/slow propagation bug this session was exactly this: unit B's
  speed cap was computed from unit A's base speed instead of from whatever cap A itself had
  already inherited, so the effect only ever traveled one hop before silently stopping.

## Best practices — scale & aggregate effects

- **When tuning a probability, frequency, or size, sanity-check the cumulative effect at realistic
  scale (a full wave, many simultaneous hits, several seconds of continuous combat), not just one
  isolated event.** Several regressions this session were "reasonable in isolation, way too much
  in aggregate" — individually-modest blood decal sizes/frequencies compounding into a solid mass
  once a real wave's worth of hits landed in the same corridor.
- **Bound unbounded accumulation with a check tied to actual local density** (see
  `isBloodAreaSaturated()`), not just a global array size cap. A global cap (`MAX_DECALS`) only
  prevents unbounded memory growth — it does nothing to stop visual clustering in one specific
  hot spot while plenty of capacity remains elsewhere.
- **Any mechanic that can pause or block forward progress (spawn pausing on congestion, an enemy
  queue waiting on a barricade) needs an explicit timeout/force-resume safety valve.** A condition
  that's *usually* temporary must never be allowed to become a permanent soft-lock if the player's
  situation (e.g. no gold left) means it can't naturally resolve on its own.



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
