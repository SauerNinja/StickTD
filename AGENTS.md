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
  Each level-up grants exactly 1 stat point (spent manually via `allocateStat()`). `CLASS_ARCHETYPE`
  gates which stat actually boosts damage per class (STR→Warrior, DEX→Archer-style, INT→Mage —
  Dota-style, exclusive, not additive across archetypes). Barricades are explicitly excluded from
  EXP in `gainTowerExp()` since they don't fight. Separately, `Tower.upgrade()` (the gold-tier
  tier-up, not an EXP level) also grants automatic random stat growth on top of the guaranteed
  tier stat bump: 3 rolls of 1-6 points each into a randomly chosen stat, plus a guaranteed 1-3
  points into the tower's own favored/main stat — deliberately separate from and additive to the
  EXP system's manual 1-point-per-level, not a replacement for it.
- **Accuracy/damage/crit balance system** — `recomputeStats()` computes `missChance` from
  `BASE_MISS_CHANCE_BY_ARCHETYPE` (Mage 22% / Archer 14% / Warrior 7% at zero DEX, an explicit
  balance hierarchy, not a bug) minus `dexAccuracy` (`diminishingStatValue(dexEff, 0.007)`), floored
  at 2%. This formula is now identical for every archetype with no exceptions — there used to be an
  `EARLY_ACCURACY_CAP_TYPES` early-cap for casters/melee, removed per explicit balance direction.
  Damage itself stays strictly archetype-exclusive as always (see the Leveling bullet above);
  `missChance` is the one universal DEX effect that applies regardless of class. Warrior damage
  specifically uses `warriorStrDamageMult()`, a separate curve from the shared
  `diminishingStatValue()` (higher base rate, higher/slower-decaying late-game floor) so heavy STR
  investment keeps compounding into the endgame instead of flattening out — every other stat effect
  in the game still uses the shared curve unchanged. Critical hits (`critChance`/`critMult` on
  every tower) are a real damage effect, not the old purely-cosmetic version: `critChance` (base
  2.5%, DEX-scaled, capped 50%) and `critMult` (base 1.20x, INT-scaled, capped 3x), rolled in
  `applyDamage()` before armor mitigation so a crit still gets partially reduced by armor like any
  other hit. `DPS` in the inspect panel folds in the crit's expected-value contribution
  (`critChance × (critMult-1)`) so it doesn't understate real average output. DEX's attack-speed
  rate is 3%/point (not 8% — toned down since it could more than double attack speed at moderate
  investment, far stronger than DEX's other universal effects). Ranged-tower lead-prediction aim is
  capped by `MAX_LEAD_PREDICT_TIME` (0.35s) so a slow shot doesn't extrapolate a target's velocity
  past a corner on this winding spiral path. `validateGameDefinitions()` runs once at boot and
  cross-checks every data-driven table (`CONFIG.WAVES`/`TOWERS`/`ENEMIES`, `EVOLUTIONS`,
  `SPLIT_CHILD_TYPE`, `CLASS_ARCHETYPE`, `FOOTSTEP_WEIGHT`, `JOB_QUOTES`, `TOWER_STRATEGY`,
  starter/evolved type lists) for dangling references — extend it, don't bypass it, when adding a
  new table with cross-references of its own.
- **Spawn-quip and aura-box systems** — `JOB_QUOTES` (keyed by tower type, 5 lines each) feeds
  `randomJobQuote()`, shown via `spawnTowerQuip()` (a 1800ms-life floating text, NOT the generic
  550ms `spawnFloatingText()` — a real multi-word phrase needs real time to read) plus a
  `spawn_chatter` gibberish voice blip — two short phrase parts with a pitch step between them
  (one higher, one lower, direction randomized) and a small pause in between, rather than one flat
  continuous babble — both triggered only at the actual build-tap placement
  handler — NOT inside `Tower.create()`, which is also called during save/load restoration and
  starting-barricade seeding, so putting the trigger there would fire every tower's quip
  simultaneously on every load. `TOWER_STRATEGY` (keyed by `EVOLVED_TOWER_TYPES`, one icon + one
  strategy line each) feeds the WC3-style aura box next to a tower's inventory slots — hidden for
  Swordsman/Archer/Mage/Barricade, tap-to-toggle tooltip for everyone else.
- **Inspect-panel dynamic-fit layout** — `#inspCombatRow` (the stat row) never wraps; instead
  `fitStatRowToOneLine()` (same technique as the top HUD's `fitHudTopToOneLine()`) measures the
  row's true `scrollWidth`, compares to `#inspect-panel`'s `clientWidth - 16` (its real padding),
  and scales the row down via a left-anchored CSS transform — no floor on the shrink scale here
  unlike the HUD version, since unreadable-at-extreme-late-game-values is an accepted trade-off but
  wrapping is not. `fitNameplateToStatRow()` explicitly sets `#inspNameplateMid`'s width from that
  exact same `clientWidth - 16` value, rather than trusting its `flex:1 1 auto` to independently
  converge to the same right edge as the stat row through normal flexbox layout — deliberately
  computing both rows from one shared source value so they can't disagree. Both run on every
  `updateInspectPanel()` refresh and on resize/orientation change.
- **Barricade economy** — Barricade is NOT a Build-menu tower (removed from `STARTER_TOWER_TYPES`,
  1.1.15) — it's `BARRICADE_ITEM`, a Shop-purchased item (`UNIVERSAL_ITEMS`, 600🪵/300🪨) bought via
  the normal `buyItem()` flow into a tower's inventory. Dragging it out of inventory has two valid
  drop targets (`onPointerEnd()`): a tower (existing item-transfer behavior, stores it) or a valid
  empty path tile (`isTileBuildable(gx, gy, null, 'BARRICADE')`, converts it into a real
  `Tower.create('BARRICADE', ...)`, free since it was already paid for at purchase). A live
  Barricade's "Store" button reverses this — deactivates it and drops a fresh ground item at its
  position. `freeBarricadesLeft` (capped at `MAX_FREE_BARRICADES`) grants one free charge every 5
  waves cleared, consumed in `buyItem()` before wood/stone are ever checked — persists through
  save/load like `moveCharges` already does; this lives in `buyItem()` specifically because
  Barricade purchases happen there now, not in the old Build-menu placement handler. `CONFIG.TOWERS
  .BARRICADE` no longer carries `woodCost`/`stoneCost` — those fields moved to `BARRICADE_ITEM` and
  were removed from the tower config as dead once nothing read them from there anymore.
  `canAffordTower(type)` (build tray/hover/placement) is back to a plain gold check now that
  Barricade doesn't go through it. Rocks cost more gold to clear than trees
  (`CONFIG.SCENERY.rockClearCostMult`, applied on top of the existing size-based `clearCost`
  formula in `spawnScenery()`). Tank (🗿) grants stone instead of gold on death — the one
  enemy-side stone source beyond clearing rocks yourself.
- **Gore/blood system** — `getBloodProfile(enemyType)` returns the per-species base palette
  (color + `isDust`/`viscous`/`noArterial` flags); `rollBloodProfile()` wraps it with per-instance
  hue/lightness jitter so no two enemies of the same type bleed an identical flat color.
  `isDust:true` (rock/stone-bodied enemies — Boulder, Rocklet, Tank) disables blood entirely
  everywhere it's checked (particles, decals, drip trails, bone/skull debris) in favor of dust
  particles and `spawnRockChips()` — small 🪨 emoji-drop debris at a fixed 1/10 of the enemy's own
  radius, 2-5 on death and a 1-in-10 chance per non-lethal hit. `bloodPoolSizeScale(enemyRadius)`
  (relative to Grunt's radius as baseline, same convention as `goreScale`) scales ground-pool decal
  size and blends into `goreScale` itself, so blood amount reflects the actual target's body size,
  not just damage/HP. `drawDecals()` runs the array through an expiry pass, then TWO ordered draw
  passes via the shared `drawOneDecal()` helper — blood/other decals first, then bone/skull/rock/
  worm debris (`isEmojiDrop || isWorm`) on top — so that layering is now guaranteed regardless of
  push order, not incidental to it (1.1.16 fix; previously one shared pass meant a bone pushed
  before later blood could render underneath it). `spawnBoneDebris()`/`spawnSkullDrop()` roll
  independently on death (78%/45%, `!bio.isDust` only) and never fade (fixed alpha, permanent
  debris — `BONE_LIFESPAN` = 45 min). Worms are a separate, later mechanic layered on top of
  skulls specifically: each round, the wave-completion handler first spawns a worm
  (`spawnWormFromSkull()`) for any skull marked `wormPending` from the PREVIOUS round, then rolls a
  fresh 10% chance for skulls not yet rolled (`!wormSpawned && !wormPending`) — the one-round delay
  between roll and appearance is intentional, not a bug. A worm never fades either, but isn't
  permanent like a bone: `WORM_LIFESPAN` = 2x `DECAL_LIFESPAN`, and instead of an alpha fade-out it
  shrinks smoothly to nothing over its final 30% of life (`drawOneDecal()`'s `isWorm` branch).
  Ground items sitting on the map (`groundItems`) bob and show a soft pulsing ring at every
  graphics setting as a consistent "this is draggable" signal; while actively dragging one, a
  👇🏻 indicator appears above whichever tower is currently the valid drop target, using the exact
  same 26px hit-test radius the real drop logic in `onPointerEnd()` uses so the two can never
  disagree. Ambient footsteps are a separate system: `FOOTSTEP_WEIGHT` classifies each
  enemy type light/medium/heavy (or `null` — Wraith, deliberately silent), `footstepDist` is a fixed
  stride LENGTH per step (not a wall-clock timer) so faster enemies step more often naturally, and
  `SoundEngine`'s `lastFootstepAt` throttles actual playback to one every ~70ms engine-wide
  regardless of how many enemies request one in the same frame — without that throttle, a large
  swarm wave stacks into a wall of sound.
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

Cross-checked against a general HTML5 reference (semantic elements, outlining, accessibility)
directly against the real file — this superseded an earlier, wrong claim in this same section that
semantic elements were "already the convention" here. They aren't: a direct count found zero
`<header>`, `<nav>`, `<aside>`, `<meter>`, `<progress>`, `<details>`, or `<summary>` tags anywhere
in `index.html` — the entire UI (top HUD bar, inspect panel, shop/settings/help modals, target
frame) is built from 124 generic `<div>`s. That earlier claim was never actually checked against
the file; it was carried over from an aspirational description rather than verified. Correcting it
here rather than leaving it is itself the point of this section existing.

- **The gap is real, but a fix is genuinely low-risk when done carefully**: checked, and this
  codebase's CSS and JS both style/select by `.class` and `#id`, never by tag name
  (`getElementsByTagName`, `div.foo{}` CSS rules, and similar tag-dependent patterns all came back
  empty). That means swapping a container's tag — e.g. `<div id="hud-top">` to
  `<header id="hud-top">` — changes nothing CSS or JS cares about; the risk is purely mechanical
  (finding and changing the *correct* matching closing tag in deeply nested markup without
  mismatching it, which `node --check` can't catch since it only validates the JS half of the
  file). Do this as its own small, carefully-verified pass — one container at a time, re-reading
  the exact nesting before touching a closing tag — not as a bulk find/replace across the file in
  the same turn as unrelated work. `#hud-top` (the persistent top bar: stats + primary actions) and
  `#inspect-panel` (the selected-entity detail panel) are the two clearest, most self-contained
  candidates to start with — `<header>` and `<aside>` respectively are both defensible fits.
- Keep a sane heading outline (one logical `<h1>` per page, nested headings inside `<section>`s
  rather than skipping levels) if any new UI text content is added — this repo's overlays are
  mostly icon/canvas-driven so this rarely comes up, but applies the moment prose content does.
- Prefer a native element with built-in semantics/keyboard behavior (`<button>`, `<progress>`,
  `<meter>`) over a styled `<div>` faking the same widget — free accessibility and keyboard
  support that a fake widget doesn't get without extra ARIA work. Concretely: the HP bars
  (`#inspHpBarFill`, `#targetHpBarFill`, evolution progress) are currently `<div>`s with a
  JS-driven `style.width` percentage — each one is a genuine `<meter>`/`<progress>` candidate, and
  converting them carries the same low structural risk as above (styled by class/id, not tag) plus
  the same "verify the exact markup before touching it" caveat.
- Icon-only buttons (no visible text content — an emoji/symbol is the entire button) needed
  `aria-label`, since a `title` attribute alone isn't reliably announced by all screen readers, and
  most icon-only buttons here had neither. Checked precisely rather than assuming — buttons that
  already have visible text alongside their icon (`buildBtn`: "🏗️ Build", `inspUpgradeBtn`:
  "Upgrade …", etc.) already have an adequate accessible name from that text and didn't need
  anything added. Added `aria-label` to the ones that were genuinely icon-only and missing one:
  `settingsBtn`, `fullscreenBtn`, `inspExpandChevron`, `inspClose`, `statsInfoBtn`,
  `barricadeInfoBtn`, `towerModalClose`, `shopModalClose`, `settingsModalClose` (9 total, shipped
  in 1.0.156). Purely additive — an attribute nothing currently reads changes nothing else about
  behavior or layout.
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

## Verify external AI-generated code reviews before acting on them

A batch of transcripts from a different AI tool analyzing "StickTD" (without direct access to this
repo) surfaced real fabrication risk worth naming explicitly: confident, specific-sounding claims —
exact line numbers, quoted code snippets, function names — that didn't match this file at all once
checked. The failure mode isn't "external review is useless," it's that specificity reads as
credibility even when it's fabricated, and a plausible-sounding line number is not evidence.
Treat any code review, bug report, or optimization suggestion that arrives via a document, another
AI's transcript, or a book rather than from directly reading the actual current file the same way:
- Before changing anything, check the specific, falsifiable claim against the real file (grep the
  claimed pattern, view the claimed line range) — not just whether the general *idea* sounds
  plausible. A structural claim can be correct even when every line number attached to it is wrong,
  and a specific-sounding claim can be entirely wrong even when it's stated with total confidence.
- A large rearchitecting proposal (event buses, unified data structures, module splits) is worth
  recording as a considered idea, but isn't itself evidence of a bug — implement it only once a
  real, currently-broken behavior traces back to the thing being proposed.
- New feature proposals dressed up as "optimizations" or "easy wins" (item systems, UI overhauls,
  new mechanics) belong in the Ideas section of `BACKLOG.md` under their own merit, not folded
  into a performance/cleanup pass just because the source document framed them together.
- Suggestions to relax deliberate UX choices (touch-zoom restrictions, text-selection scoping) for
  generic "accessibility" or "standards compliance" reasons need the same scrutiny as any other
  claim — check whether the current behavior was a deliberate choice recorded elsewhere in this
  file first, not just whether the suggestion sounds like good practice in the abstract.

## Clean Code (Robert C. Martin) — principles actually worth holding this codebase to

Read directly from the book (not a summary of a summary) and cross-checked against real code
before writing anything down here. The two rules below are the ones this codebase can actually
be held to without contradicting its own single-file, comment-heavy, hard-won-bug-fix style —
applied as a filter for future edits, not a mandate to rewrite what already works.

- **"The first rule of functions is that they should be small. The second rule is that they should
  be smaller than that."** — genuinely true, and also genuinely in tension with this file's
  largest functions (`applyDamage`, `Enemy.die`, `Tower.update`, `Tower.draw` are all 100+ lines).
  The honest reading for this project: these are long because they resolve many real, previously-
  debugged interactions (archetype branches, status effects, gore variants), not because they're
  poorly organized — and the book's own test isn't line count in isolation, it's whether a
  function does work at more than one level of abstraction (see below). Don't decompose these
  under a blanket "make it smaller" mandate; only extract a piece when it's genuinely
  self-contained (no shared mutable state beyond its own inputs) and the extraction doesn't just
  restate the code under a new name with no real abstraction gained (the book calls this out
  directly: renaming a block without changing its level of abstraction isn't "doing one thing,"
  it's decoration).
- **"Functions should do one thing. They should do it well. They should do it only."** — the
  book's own test for this: a function does one thing if everything in it sits at one level of
  abstraction below the function's own name, and you can't meaningfully extract another
  function from it whose name isn't just a restatement of the code it replaces. Already applied
  correctly once in this codebase (`isEnemyFrozen()`, extracted from five duplicated inline
  boolean checks) — that's the shape to repeat: pull out a *named condition* or a genuinely
  separable sub-computation, not to hit a line-count target.
- **G28, Encapsulate Conditionals**: "Boolean logic is hard enough to understand without having
  to see it in the context of an if or while statement. Extract functions that explain the intent
  of the conditional." `isEnemyFrozen()` already does exactly this. Apply the same test to any
  *new* multi-clause boolean condition before it ships: if it needs a comment to explain what it
  means, it should probably be a named function instead.
- **Genuinely dead code gets removed, not just flagged** — the book treats unused code as a
  correctness issue, not a style nit (it actively misleads the next reader into thinking it's
  live). Two functions (`jitterColorLightness`, `darkerJitteredColor`) and one real duplication
  (`toCanvasCoords()` sitting unused while its own logic was hand-copied five times) were found
  and fixed this way in 1.0.154 — verified zero call sites (including string/dynamic references)
  before removing anything, per this file's own read-before-writing discipline elsewhere.
- **Not applying**: the book's OO-heavy chapters (Objects and Data Structures, Classes, Systems,
  dependency injection, the Law of Demeter as a hard rule) assume a codebase organized into many
  small classes with enforced encapsulation — the opposite of this project's single-file,
  config-object, plain-function style, which is a deliberate, working choice recorded elsewhere
  in this file. Citing "Clean Code says use more classes" against this project's architecture is
  citing the wrong context, not a real finding.

## Clean Code, second pass — Meaningful Names, Comments, Error Handling

Read the book's own text for these chapters (not a summary) and checked each principle against
this file directly rather than assuming it either does or doesn't apply.

**Meaningful Names (Ch. 2)** — the chapter's central example (a function called `getThem()` over
an unlabeled `theList`, needing four unstated assumptions to understand) describes exactly the
failure mode this codebase already avoids: names here consistently answer "why does this exist,
what does it do, how is it used" without needing a paired comment to explain the name itself
(`isEnemyFrozen`, `findTouchingBarricade`, `resolveWeaponSubtype`, `spawnCastOffArc` all pass the
book's own test — you can tell what each does from the name alone). Checked specifically for the
book's two sharpest anti-patterns and found neither: no disinformative names (nothing named like a
different data structure than it is, e.g. calling something `...List` that isn't a list), and no
noise-word pairs (no `TowerData`/`TowerInfo`-style duplicate concepts distinguished only by a
meaningless suffix). Genuinely nothing to fix here — recorded as confirmation, not just skipped.

**Comments (Ch. 4)** — this is the chapter with the most real tension against this project's own
established style, worth resolving explicitly rather than picking a side by default. The book's
position is blunt: "comments are always failures... the proper use of comments is to compensate
for our failure to express ourselves in code," and its sharpest warning is that a comment's
accuracy decays as the code around it changes, because "programmers can't realistically maintain
them." Read against this file's actual comment style, the resolution is: this codebase's
comments are overwhelmingly the two categories the book itself calls out as legitimate —
**Explanation of Intent** (why a decision was made, e.g. "capped at 14 so larger units keep the
original buffer") and **Warning of Consequences** (what breaks if this is changed carelessly,
e.g. the isEnemyFrozen/queue-catchment comments explaining exactly why a naive version cascades
wrong) — not the bad categories (comments restating what the next line already says, or comments
compensating for code so tangled it needs narration to follow). The book isn't actually opposed
to this house style; it's opposed to comments substituting for clarity, which is different from
what's happening here.
- What the book's warning *does* apply to directly, and what 1.0.155 found and fixed: a comment
  that cites a specific number (a radius, a threshold, a version) will go stale the moment that
  number changes elsewhere, if the edit doesn't also touch the comment. Two comments were found
  citing Swarm's radius as 12 after it had been changed to 9 several versions earlier — the
  formulas were unaffected (they read the value live), only the illustrative numbers in their own
  explanatory comments were wrong.
- **New discipline going forward, directly motivated by this**: when an edit changes a specific
  number, name, or threshold that a *nearby* comment also cites as an example or justification,
  update that comment in the same edit — don't leave it for a future pass to notice. This is
  cheap to do in the moment and expensive to catch later (it took a deliberate audit to find these
  two, and there's no guarantee it caught every instance).

**Error Handling / null (Ch. 7)** — checked "Don't Return Null" / "Don't Pass Null" against how
this codebase actually uses `null`. The book's target is functions that return `null` as a stand-in
for failure, forcing every caller to defensively re-check it or risk a crash three call-sites away
from where the actual problem is. That's not what's happening here: `this.target = null`,
`selectedTower = null`, `moveModeTower = null` and similar are a legitimate, ordinary "this
optional reference currently has nothing selected" state — the same pattern virtually every game
engine uses for "no current target" — not an error signal a caller has to guess how to handle.
Worth keeping in mind if a *new* utility function is ever added that returns "not found" as
`null`/`undefined` in a way that forces the caller to add its own defensive check: prefer returning
a sentinel/empty value the caller can use unconditionally (an empty array instead of `null` for "no
matches," for instance) over a `null` that has to be checked at every call site — but this isn't a
gap in the current code, just a standard to hold future additions to.

## CHANGELOG.md outranks inline comments when they disagree

Inline comments explain intent at the moment they were written and can silently go stale as the
code around them changes (see the two stale radius references found and fixed in 1.0.155 — the
formulas were still correct, only the comments' example numbers had drifted). `CHANGELOG.md` is
different in kind, not just in degree: every entry is dated, versioned, and — by this file's own
"read before writing" discipline — appended to, never rewritten. That makes it the more reliable
source when a comment's claim and the changelog's account of the same change disagree, and the
first place to check (not a single nearby comment) when the question is "why is this the way it
is," especially for anything that's been touched more than once — the changelog makes repeated
iteration on the same system obvious (several consecutive entries about pathing, or about a
specific tower's balance) in a way one static comment next to the current code can't.

- **When starting a session on this project, check the current real-world date against the most
  recent `CHANGELOG.md` entry's date.** A large gap means more elapsed time for browser APIs,
  the hosting platform, or the wider context this code runs in to have changed in ways nothing in
  the repo itself would reflect — treat assumptions about "current" behavior (browser support,
  platform quirks) with more caution the older the latest entry is, the same way a comment's
  reliability was reasoned about above.
- **When an edit changes a specific number, name, or behavior that an existing comment describes,
  update that comment in the same edit** (already stated under the Clean Code section above) —
  and separately, the changelog entry for that edit is what makes the change independently
  verifiable later even if a comment update gets missed anyway. The two aren't redundant: the
  comment explains the reasoning in place; the changelog is the dated record that the reasoning
  changed at all.
- This doesn't mean comments should be sparser or the changelog more verbose than either already
  is — both continue exactly as documented elsewhere in this file. It means: when they conflict,
  trust the changelog, and go there first when reconstructing why something is the way it is.

## Clean Code, third pass — Function Arguments

The book's guidance: "the ideal number of arguments for a function is zero... any function with
more than three (polyadic) needs very special justification." Checked against a real, current
outlier in this file: `spawnParticles(x,y,color,count,gravity,friction,pools,coneAngle,coneSpread,
sizeMin)` — ten positional arguments, several optional and easy to transpose by position (`pools`
vs `coneAngle` are both easy to mix up at a call site without checking the signature). The book's
own recommended fix for exactly this shape — many optional/flag-like arguments — is grouping
related ones into a single object parameter, which most call sites could then pass positionally
only for the few args they actually vary and rely on defaults for the rest. Recorded here as a
genuine, honest tension (not yet fixed) rather than silently accepted: refactoring it now would
touch every one of its ~30 call sites in one pass, which is exactly the kind of wide, ambient
across-the-file change this project's own "smallest safe fix" discipline argues against doing
opportunistically. Worth doing deliberately, as its own scoped pass, if this function grows a
9th/10th parameter's worth of complexity again — not a reason to leave it entirely un-flagged now.

## The `<head>` block is a fixed external integration — don't casually reorder or trim it

`index.html`'s `<head>` contains Google Analytics (`gtag.js`, measurement ID `G-B6H58BQ50N`,
gated behind Google Consent Mode v2 — see below) and a block of SEO meta tags (title, description,
keywords, robots, canonical, Open Graph including site_name/locale, Twitter card, and a
schema.org `VideoGame` JSON-LD block) with specific, deliberate keyword choices (stick tower
defense, StickTD, sauerninja, setvin noether). The GA measurement ID is tied to a live property —
don't regenerate or swap it without being asked. The favicon is an inline base64 data URI (verified
to work reliably); the OG/Twitter image tags point to `og-image.png` at the site root, which is a
real file that needs to exist in the repo — a data URI there wouldn't be fetched by most
social-media crawlers, unlike the favicon.

Analytics only actually collects once a visitor accepts the cookie-consent banner (top of
`<body>`, fully self-contained — own markup/CSS/script, no dependency on the main game script).
Accept-only by request — no Decline button; a visitor who never clicks Accept simply stays on the
default-denied state, with no separate explicit "no" action available. `gtag('consent', 'default',
...)` in `<head>` denies `analytics_storage` (and the ad-related signals, unused here but included
for Consent Mode completeness) until the banner's Accept button calls `gtag('consent', 'update',
{analytics_storage:'granted'})`; the choice is remembered in `localStorage`
(`stickTD_consentChoice`) so the banner doesn't reappear on later visits. Order matters for Consent
Mode — the default must be pushed before `gtag('config', ...)` runs, which is why it's the first
`dataLayer` push in `<head>`, ahead of even `gtag('js', ...)`. The banner's text and button never
wrap to a second line — `fitConsentBannerToOneLine()` (same scale-to-fit technique as
`fitHudTopToOneLine()`/`fitStatRowToOneLine()`) shrinks the content to fit instead.

## Navigating this file — the README Code Map is the front door

Clean Code's "Newspaper Metaphor" (ch. 5): a well-organized source file reads like a newspaper —
a headline and synopsis first, increasing detail as you read further down, and no single
undifferentiated wall of text. This file already follows that in spirit via its
`/* ===== SECTION NAME ===== */` header comments, but a section header only helps once you're
already looking at the right *area* of a ~8,000+ line file — it doesn't help you find that area
in the first place. That's what `README.md`'s **Code Map** section is for: treat it as the
newspaper's actual table of contents, not supplementary documentation.

- **Before grepping blind, check the Code Map first.** It links directly to GitHub line numbers
  for every major system (towers, enemies, gore/blood, audio, waves, UI). Line numbers drift as
  the file changes — the Code Map says this explicitly — so treat a link as a starting point to
  search from (jump to that area, then find the nearest `/* ===== ... ===== */` header or the
  named function you actually need), not a guaranteed exact address.
- **When adding a genuinely new named system** (a new archetype, a new major function, a new
  top-level concept — not a tweak to something that already has an entry), add or update its
  Code Map entry in the same change, the same discipline already required for `CHANGELOG.md`.
  An outdated map is worse than no map: it actively misdirects the next reader (human or AI)
  with confidence instead of correctly saying "not indexed yet."
- **The Code Map is a map, not a copy.** Entries should be one line — system name, a few words on
  what it does, the link — not a restatement of what's already better explained by the code's own
  comments once you get there. If an entry needs more than one line to be useful, that's a signal
  the linked function itself needs a better name or a clearer header comment, not a longer map.



This file is verified to have been reviewed by more than one AI tool with real access to this
repo, and at least one pass (see the "Cross-checked against externally-generated code reviews"
section above) came from a tool that had no direct file access at all and fabricated specifics as
a result. A different, related failure mode is a tool that *does* have real file access but a much
smaller effective context window than Claude's — it may not be able to hold this whole ~7,400-line
file, or even one whole large function, in context at once. The guidance below is aimed at
preventing that tool from confidently guessing (the same failure mode as the no-access case, just
from a different cause) rather than at correcting it after the fact:

- **Read the map before reading the file.** `AGENTS.md`, `BACKLOG.md`, and the table-of-contents
  comment at the very top of the `<script>` block in `index.html` exist specifically so a tool can
  orient itself without loading the whole file. Read those first; they cost little context and
  usually answer "which section" before a single line of game logic needs to be read.
- **Search for the specific thing, don't read broad ranges to find it.** A targeted search for a
  function name, a config key, or a distinctive string (the way every fix in this file's own
  history was actually located) uses a small, bounded amount of context regardless of file size. A
  wide, exploratory read of "the surrounding few hundred lines to get context" does not, and is the
  first thing to cut if context is tight.
- **Read only the function or block being changed, not its whole containing section.** This file's
  sections (`ENTITY CLASSES`, `WAVES`, `MAIN LOOP`, etc.) can run to hundreds or thousands of lines;
  the section header tells you where to look, not how much to read once you're there.
- **State uncertainty plainly instead of asserting a claim that couldn't actually be verified.** If
  a line number, a function's current behavior, or a value can't be confirmed because it wasn't
  actually read this turn, say so rather than presenting a best guess as a checked fact — this is
  the same discipline the "verify external reviews" section asks of anyone *consuming* a claim
  about this codebase; it applies just as much to anyone *producing* one under a tight context
  budget.
- **When genuinely unsure which of several plausible interpretations of a request is correct and
  the file is too large to resolve it by reading more, ask** rather than guess and risk an edit
  that looks plausible but touches the wrong section — consistent with this project's own
  "smallest safe fix" priority over speculative changes.
