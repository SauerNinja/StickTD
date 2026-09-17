# Changelog

## [1.2.42] - 2026-09-15 — Zombie moved to wave 15; new feature: Huts (WC3-style creep camps)
Two items by direct request, both fully implemented.
- **Zombie's introduction moved from wave 6 to wave 15** — removed from the 4 early hand-authored
  waves it used to appear in (6, 7, 8, 10), with modest count bumps to the remaining types in each
  so they don't feel thin. Now first appears in the wave-15 BOSS milestone wave, by which point
  it's actually plausible a dedicated Mage has reached Cleric (500 INT, well past the 100 INT
  attunement minimum) rather than facing an armored enemy on the very first few towers.
- **New: Huts** — stationary, off-path "creep camp" structures (WC3-style), each guarded by 2
  enemies. Kill the guardians for an immediate bounty; the hut itself is far tankier still and
  pays a much bigger one-time reward when destroyed. If the hut survives and both guardians are
  confirmed dead, it respawns 2 fresh ones after a random 1-5 minute real-time wait — never while
  a guardian is still alive, and never at all once the hut itself has been destroyed.
  - Built by reusing the `Enemy` class/pool entirely (`isGuardian`/`isHutBuilding` flags) rather
    than a parallel system — the exact same active-flag exclusion pattern already proven this
    session for escaped enemies, not a new concept. Guardians wander within a bounded 70px radius
    of their hut (reusing the same soft-bounce wander code `updateEscaped()` already uses, just
    anchored differently) and use GRUNT's own moveset/appearance, boosted well past a normal
    Grunt's stats. Both guardians and the hut itself are excluded from wave-completion checks and
    the barricade-pileup system, matching the existing exclusion pattern for escaped enemies.
  - Placement: one hut spawns at game start on a random valid off-path tile within the starting
    active region.
  - New pool-reuse fields (`isGuardian`/`hutRef`/`hutAnchorX/Y`/`isHutBuilding`/
    `guardiansAliveCount`/`respawnAt`/`destroyed`) all reset explicitly in `spawn()`, matching the
    established pattern for every other pool-reused state this session.
  - **Caught and fixed a real bug before shipping**: the hut originally used `spawn('TANK', ...)`
    for its base stats — but `die()` has a TANK-specific branch that pays a *fixed* flat stone
    amount on death, completely ignoring `this.bounty`. That would have silently swallowed the
    intended 8x bounty boost for destroying a hut. Switched the hut to a GRUNT base (with a much
    larger HP multiplier to compensate for GRUNT's lower base HP) so its reward actually lands on
    the normal gold path where the bounty multiplier applies.
- Verified against the real extracted `updateGuardian()`/`updateHutBuilding()` methods, not a
  reimplementation: guardian wander confirmed to never exceed its 70px bound over 2000 simulated
  ticks; hut confirmed to refuse respawning while any guardian is alive, even past its timer;
  confirmed to wait for the scheduled time before respawning; confirmed to spawn exactly 2 fresh
  guardians and clear its timer once both conditions are met; and confirmed a destroyed hut never
  respawns anything again regardless of timer state.
- `node --check` on the extracted script: clean.

## [1.2.41] - 2026-09-15 — Progression fix, per your confirmed answer: promotion is now mostly a gold sink; the actual bug turned out to be a mislabeled display
Confirmed direction: promotion mostly a gold sink, XP/kills the main way to grow. Investigating
turned up something better than expected — the underlying architecture already had the right
separation (`tower.level` = gold-bought tier, driven only by Promote; `tower.expLevel` = XP
counter, driven only by kills); the actual bug was narrower than the source document assumed: the
inspect panel's "Lv." was reading `expLevel` instead of `level`, so the player only ever saw the
XP counter labeled as "Level" and never saw the real Promote-driven tier at all — exactly matching
"units keep leveling without leveling."
- **`inspLevel.textContent` now reads `t.level`** (the real, gold-bought tier) instead of
  `t.expLevel`. This alone was most of the reported confusion — no deeper architecture change
  needed, since the separation the document called for already existed underneath.
- **Promotion's random stat grant replaced with a small, predictable +1 to the favored stat only**
  — previously 3 independent 1-6 rolls plus a guaranteed 1-3, averaging ~12.48 raw stats per
  promotion (confirmed by simulation, matching the source document's own claimed ~12.5 exactly).
  The tier's own baseline stat bump from `applyTierStats()` is completely untouched — that's the
  real reward for promoting; this only removes the second, swingy stat generator competing with
  kills/XP for being the main way a tower grows.
- Relabeled the two places that referenced "LEVEL"/"MAX LEVEL" using `expLevel` (the training
  floating-text and the XP bar's cap label) to "Training"/"MAX TRAINING", so the same
  level-vs-training-level confusion can't recur from a different UI element than the one that
  actually caused the report.
- `README.md` updated: the promotion stat description, and a note directly on the "Lv." display
  explaining which counter it actually shows.
- Verified the exact old/new promotion magnitude by simulation (100,000 trials): confirmed the old
  ~12.48 average, confirmed the new value is a flat, deterministic +1. `node --check` on the
  extracted script: clean.
- **HUD layout**: confirmed not wanted — left the compact centered bar exactly as it was.

## [1.2.40] - 2026-09-15 — Inspect panel now shows a disabled tower's downed status, not just its raw HP; checked the world-space visual and found it already better than assumed
- **Inspect panel**: a disabled tower's HP bar previously showed its recovered ~30% value with no
  indication it's actually locked out of attacking — reading as "nearly dead" rather than "already
  went down and is recovering." Now suffixes the number with `(DOWNED · N rounds)` when
  `disabledWavesLeft > 0`, using the exact same field the world-space visual already reads.
- **Checked the in-world visual first, found it doesn't need the fix the document proposed**: it
  claimed the current disabled state is "only a greyed-out disabled state" with no clear
  communication. Read the actual draw code — it already shows a grayscale/dizzy treatment PLUS an
  explicit "N rounds left" text label above the tower, which is arguably clearer than the
  document's own suggested single "DOWNED" word, since it also tells the player exactly how much
  longer to wait. Left this alone rather than replacing something already working.
- `node --check` on the extracted script: clean.

## [1.2.39] - 2026-09-15 — Revive-skull marker gets a contrast badge; the Cleric-threshold "inconsistency" turned out not to be one
- **Revive-skull readability**: the skull drawn above a revived enemy previously had nothing
  separating it from whatever body might be standing right behind it — a floating annotation with
  no visual anchor of its own. Now drawn on a small dark circular badge for contrast, the simpler
  of the two fixes the source document proposed (the fuller version — actively checking nearby
  enemy positions and nudging the marker to avoid them — would need `draw()` to receive a
  nearby-enemies list it doesn't currently get passed, meaningfully more invasive for a purely
  cosmetic issue).
- **Checked, not a bug**: the document flagged Cleric's unlock as "inconsistent" — 100 INT for
  attunement vs. 500 INT for specialization. That's not an inconsistency, it's the same two-stage
  design every single-element specialization in the game already uses uniformly (Hammerman,
  Axeman, Spearman, Gatling, Blowdart, Marksman, Necromancer, Snapcaster all attune at 100 and
  specialize at 500 — confirmed directly, not assumed). Nothing to reconcile here; the document
  appears to have misread the two-stage system as a single inconsistent threshold.
- **Deliberately not touched**: the HUD responsive-layout suggestion (spreading the bar into
  left/center/right groups on wide screens). Reconsidered rather than implemented — this is the
  core always-visible gameplay HUD, its current fit-to-scale system is already carefully tuned
  (see the 1.2.13 fix for exactly how delicate this area has been), and "spread it across an
  ultrawide monitor" is a genuinely debatable improvement, not an obvious bug — many games
  deliberately keep HUD controls compact and centered rather than stretched across available
  width. Restructuring live, always-visible markup for a subjective aesthetic call from an
  external document isn't a risk worth taking without it actually being confirmed as wanted.
- `node --check` on the extracted script: clean.

## [1.2.38] - 2026-09-15 — Two real bugs fixed from the bunching-analysis document: downed towers stop getting re-targeted, wave speed-sort no longer scrambles composition
Both confirmed against the real code before fixing, not taken on faith.
- **Downed/disabled towers can no longer be picked as a new breakaway/escaped-enemy attack
  target** (`findNearestActiveTower()` now excludes `disabledWavesLeft > 0`, not just
  `!active`). Previously an already-defenseless, disabled tower could be re-targeted and
  re-disabled indefinitely by a different attacker, since only `.active` was checked — a real
  gap, confirmed directly.
- **Existing attackers now drop a target the instant it goes down mid-attack**, not just when
  it's fully destroyed — both `updateBreakaway()` and `updateEscaped()`'s tower-attack branch now
  check `disabledWavesLeft` alongside `.active` before continuing to engage.
- **Wave speed-sort no longer reassigns enemy types globally across the whole wave** — this was a
  real, confirmed issue directly related to something raised before ("faster speeds at front...
  didn't organize it good"): the old code took every enemy type in the entire wave, sorted them
  fastest-to-slowest, and reassigned them onto the timeline, which could pull a wave's intended
  climax unit (often its slowest) all the way to the front. Replaced with a bounded local window
  (6 slots): fast-before-slow ordering still applies to units close enough together in time to
  actually catch up to each other, but nothing can be reassigned outside its own local
  neighborhood — a wave's overall authored shape (which group opens, which closes) stays intact.
  Verified directly: a simulated Grunt→Runner→Boss wave keeps its Boss near the very end instead
  of it being pulled to the front, the type multiset is unchanged, and fast-before-slow ordering
  still holds within each window.
- `node --check` on the extracted script: clean.
- Everything else surfaced by the same 417-page document — the progression/promotion rework (with
  its own internal, later self-correction worth taking seriously), the full wave beat/phase
  compiler, the responsive HUD layout, Zombie's intro-wave timing, the Cleric 100-vs-500 INT
  threshold, enemy selection/inspection, and the "Huts" idea — remain unbuilt, each a real,
  separate project rather than something to guess at alongside these two verified fixes.

## [1.2.37] - 2026-09-15 — Entrance gating added to spawnEnemy() — path-distance safety on top of the existing time-based spawn delay
A 417-page external document specifically analyzing enemy bunching. Unlike some earlier ones, its
core diagnostic claims were checked and confirmed accurate against the real file — the exact
`queueGap` formula and the `nudge = Math.min(overlap, 1.5) * 0.5` limit both matched exactly. Its
top recommendation ("make path-progress authoritative over collision") is a genuine core-movement
rewrite — the same scale of risk as the other big architecture items already deferred this session,
not attempted here. Its one clearly safe, additive suggestion — entrance gating — is implemented.
- New `lastSpawnedEnemy` tracking + a check in `spawnEnemy()`: won't release a new enemy until the
  previously-spawned one has moved at least `(its radius + the new enemy's radius + 8px)` from the
  shared spawn point. Time-based delay alone can still let two enemies materialize close together
  if their scheduled delays are tight relative to frame rate — this is a real path-distance check
  on top, not a replacement.
- Reuses the exact same "return false, retry next frame" contract `spawnEnemy()` already has for
  pool exhaustion — the spawn-drain loop's existing comment already documents this exact retry
  behavior, so no new plumbing needed in the caller at all.
- `lastSpawnedEnemy.active` naturally goes stale-safe on its own once that enemy dies, despawns, or
  escapes — no explicit reset needed between waves.
- Verified against a faithful transcription of the real logic: first spawn always succeeds, a
  too-close second spawn correctly blocks, unblocks once the required gap is actually reached, and
  correctly ignores a stale reference once the tracked enemy goes inactive.
- Most of the rest of this 417-page document overlaps heavily with the two performance/architecture
  documents already substantially processed across 1.2.26-1.2.35 (telemetry, spawn queue, barricade
  scratch reuse, HUD coalescing, wind staging, progression separation, minion variants) — not
  re-processed here as new work. `node --check` on the extracted script: clean.

## [1.2.36] - 2026-09-15 — New classes: Berserker and Lancer — Axeman/Spearman's own deep tier, closing the last gap in the Swordsman lineage
Every other Swordsman-lineage branch already had a second tier (Hammerman→Paladin); Axeman and
Spearman were dead ends. Fixed by explicit request, with a clean, defensible pattern for the one
open technical decision (which stat triggers each): Hammerman (STR-locked) already crosses to INT
for Paladin, so this cycles it rather than reusing the same pairing twice — Axeman (DEX-locked)
grows STR for Berserker, Spearman (INT-locked) grows DEX for Lancer. A full STR→INT→DEX loop
across the three branches.
- **Berserker** (👹, from Axeman, STR 40): trades Axeman's throw-toggle for a much wider cleave
  (`swingArc` override — same per-type-override precedent TWOHANDER Swordsman's `chooseSpec()`
  already established) and higher raw damage — a brute-force AoE identity.
- **Lancer** (🎯, from Spearman, DEX 40): even longer reach than base Spearman, precision over
  power — the longest-ranged melee class in the game.
- Both dispatch through the exact same generic `checkEvolution()`/`EVOLUTIONS` mechanism already
  proven by Hammerman→Paladin and Blowdart→Squirtgun — zero new code needed there, just the table
  entries.
- Render branches reuse their parent's exact visual (Berserker → Axeman's dual-axe pose, Lancer →
  Spearman's thrust pose) rather than falling through to a generic default — thematically correct,
  reusing proven code instead of writing new geometry.
- Full definition checklist: `JOB_COLORS`/`JOB_BUILD`/`JOB_QUOTES`/`RANGE_CAPS`/`CLASS_ARCHETYPE`
  (both WARRIOR, matching their parents)/`TOWER_STRATEGY`/`EVOLVED_TOWER_TYPES`/
  `TOWER_UNLOCK_RIDDLE`, plus the shared melee-swing update dispatch, swing-lunge animation check,
  and `usesSwingAngle`.
- **Caught and fixed a real miss before shipping**: `resolveWeaponSubtype()` (drives gore-wound
  flavor) would have silently defaulted Lancer to the generic `BLADE` treatment instead of
  `PIERCE` like its parent Spearman, since it wasn't in the function's own explicit list yet —
  found by reading the function directly rather than assuming inheritance would "just work."
- Also caught two smaller mistakes in my own draft before they shipped: a typo in a comment
  ("Berserman"), and a color comment that guessed Axeman was "steel-gray" — checked the real value,
  it's burnt orange, corrected the comment to match.
- Verified against the real extracted derivation/reachability/evolution-trigger logic: both classes
  confirmed present in `UNLOCKABLE_TOWER_TYPES` (22/22, matching `EVOLVED_TOWER_TYPES`'s own
  count); the Build-tray reachability gate (from the 1.2.24 pass) correctly hides each until its
  own prerequisite — Axeman, Spearman — is unlocked, and correctly reveals it once that happens.
  `node --check` on the extracted script: clean.

## [1.2.35] - 2026-09-15 — Self-test harness extended to cover the two most recent features
Added regression coverage for the last two passes to `runDebugSelfTests()`, matching its own stated
purpose — anything that could regress silently in a later pass should have a standing check.
- Mini/Big variant mutual exclusivity, and confirms Mini's stat reduction actually reduces (HP,
  radius, bounty all lower than a normal spawn) — regression coverage for 1.2.33.
- `BLOOD_ON_HIT_CHANCE` is confirmed a real probability strictly less than 1 — regression coverage
  for 1.2.34, guarding against a future edit accidentally turning it back into a no-op.
- Checked BACKLOG.md for any other standalone quick win before closing this pass — nothing left
  that isn't already flagged there as a genuinely larger project, not a small addition.
- `node --check` on the extracted script: clean.

## [1.2.34] - 2026-09-15 — Blood no longer spawns on every single hit — new per-hit chance, ~30% less frequent
Every landed hit previously produced a blood event unconditionally whenever the goreMode toggle
was on (an implicit 100% per-hit rate) — reported as too much, with the actual blood generation
itself explicitly not the issue.
- New `BLOOD_ON_HIT_CHANCE` (0.7), gating whether `applyDamage()`'s blood-generation block runs at
  all for a given hit — applied identically across every archetype (Warrior/Archer/Mage/dust)
  rather than singling one out, since the report wasn't archetype-specific. A pure frequency gate:
  nothing inside the block — the actual particle/decal spawning, colors, sizing, all the tuned
  behavior — was touched at all. A hit that does pass the roll looks exactly as it always did.
- Deliberately scoped to ordinary per-hit blood only, not the separate death burst in `die()` —
  that's its own unconditional `if(goreMode)` block, untouched. A kill reads as a more significant,
  climactic moment than routine damage, so it keeping a guaranteed blood event while ordinary hits
  don't always draw blood matches the "even with damage, blood doesn't always occur" reasoning
  behind the request rather than contradicting it.
- `node --check` on the extracted script: clean.

## [1.2.33] - 2026-09-15 — New "mini" filler enemy variant — smaller, weaker, worth much less
The one piece of the wave-economy proposal small and safe enough to ship on its own: smaller
"minion" versions of existing enemies, explicitly requested as a scoped-down alternative to the
full wave/filler redesign. Built by mirroring the existing `isBig` variant system exactly, in the
opposite direction, rather than inventing a new mechanism.
- New `isMini` flag on `Enemy`, mutually exclusive with `isBig` (a spawn roll only ever picks one —
  confirmed directly: forcing both true still only ever produces the Big variant, Mini is silently
  suppressed). A mini enemy keeps its normal appearance/emoji and every type-specific special
  ability (a mini Splitter still splits, a mini Fire enemy still ignites) — only its stats shrink:
  35% max HP, 55% radius, 30% bounty/XP, a slight +10% speed (reads as "small and skittering" even
  before the size difference registers).
- New `MINI_VARIANT_CHANCE` (12% per spawn) — deliberately much more common than `BIG_VARIANT_CHANCE`
  (0.5%): a Big spawn is a rare golden-text event, a Mini spawn is meant to be a real, regular part
  of ordinary wave composition, giving frequent easy last-hit opportunities without touching wave
  generation, spawn timing, or phasing at all.
- No floating-text callout for Mini spawns (unlike Big's "BIG!" toast) — at 12% frequency that would
  be genuinely spammy, unlike the rare 0.5% Big roll where a callout is a nice occasional treat.
- Checked that `isBig` (the field this mirrors) is read nowhere else in the codebase outside
  `spawn()` itself, confirming `isMini` needs no additional UI/inspect-panel wiring either — fully
  self-contained. Checked every other `.spawn()` call site (the self-test harness, Splitter's
  child-spawn) — none pass a 4th argument, so `isMini` defaults to falsy there, no unintended minis
  from those paths.
- `node --check` on the extracted script: clean.

## [1.2.32] - 2026-09-15 — Attract screen finally gets the checkerboard ground and low-angle perspective requested earlier
This request had slipped — asked for several turns ago, never actually implemented while other
fixes took priority. Done now, scoped as a real 2D approximation rather than a true 3D rewrite: a
genuine perspective transform of the whole simulation's coordinate system would mean touching
enemy/tower/projectile positioning logic, not just how they're drawn — much larger, much riskier,
and not what was actually needed to deliver the requested look.
- **Perspective checkerboard ground**: `renderAttractMode()`'s old flat single-color background
  replaced with a row-by-row checkerboard, each row's height growing quadratically from the
  horizon (thin) toward the bottom of the screen (tall) — the standard 2D trick for a receding
  ground-plane illusion, achieved entirely through ordinary Canvas 2D fills, not a real 3D or CSS
  transform. Same two-tone-square language as the real game's own buildable-area checkerboard.
- **Bigger, closer-camera towers and enemies**: tower draw calls now wrapped in an outer
  `ctx.scale(1.8, 1.8)` around each tower's own position — composes with whatever `drawStickman()`
  already does internally, which is completely untouched — rather than touching the `level`
  parameter, which drives real gameplay-facing tier scaling in the actual game. Enemy emoji font
  size increased from 22px to 32px to match.
- Entirely self-contained to `renderAttractMode()` — no gameplay logic (spawning, targeting,
  projectile timing) touched at all, and nothing here can affect the real game's own rendering,
  layout, or hit-testing.
- Verified the perspective math directly: confirmed zero gaps between consecutive ground rows,
  row height growing monotonically from the horizon toward the bottom, and full coverage reaching
  exactly the bottom edge of the screen with no leftover gap. `node --check` on the extracted
  script: clean.

## [1.2.31] - 2026-09-15 — State machines and save-state classification documented explicitly; one real mistake caught and corrected before shipping
Pure documentation this pass — no runtime behavior changed, deliberately: a full enum-based state
machine refactor would touch every read site across the file for zero behavioral difference, given
every invariant documented here was already individually verified true across the last several
passes. Formalizing what's already true in comments, not rewriting working code to prove it.
- **Enemy's legal states** documented above `class Enemy{}`: SPAWNING/ADVANCING/QUEUED/ESCAPED/
  INACTIVE, with the actual field combinations each one corresponds to.
- **Wave's legal states** — the existing `waveState` comment expanded with what each state actually
  means and where its transitions happen; confirmed there's no separate countdown/results state
  under the hood — the round-start "3-2-1-GO" overlay and the wave-summary popup are both
  presentation layered on top of SPAWNING/the ACTIVE→IDLE instant, not additional state values.
- **Save-state classification** documented above `serializeGameState()`: persistent (saved) vs.
  reconstructable (rebuilt on load) vs. transient (simply doesn't exist after a load), with a
  concrete list of what falls in each category.
- **Tower's legal states** — caught and corrected a real mistake in my own first draft before
  shipping it: the first version claimed reaching 0 HP destroys a tower (active=false). Checked
  `takeDamage()` directly and found that's not what happens — a tower at 0 HP recovers to 30% HP
  and gets locked out of attacking for 2 waves (`disabledWavesLeft`), staying fully present and
  selectable the whole time. A tower's `active` flag only ever goes false from the player selling
  it, or a full pool reset — never from combat alone. This is a genuine "downed and recovering"
  mechanic already built into the game, just not one where the tower actually leaves the board —
  the opposite of what the external review assumed didn't exist. Rewrote the documentation to
  match reality rather than assumption.
- `node --check` on the extracted script: clean.

**Where this leaves the full list from both external documents**: everything that was concrete,
low-risk, and independently verifiable has now been done — spawn queue, barricade scratch reuse
and its telemetry, HUD coalescing, percentile/actual-speed telemetry, the debug self-test harness,
and now this documentation pass. What's left — decoupled combat events, deterministic RNG
separation, and the full wave-economy/filler-enemy redesign — are each genuinely large,
gameplay-touching projects, not verifiable by code-reading and `node --check` alone the way
everything above was. Strongly recommend an actual playthrough before any of those three, given how
many passes have now landed on top of each other unseen.

## [1.2.30] - 2026-09-15 — HUD updates coalesced to once per frame; one duplicate-hash claim investigated and found more nuanced than assumed
- **Real fix**: `updateHUD()` was called directly from `creditKill()` — meaning every single kill
  triggered a full round of `getElementById()`+`textContent` DOM writes immediately, even though
  most of those values (wood/stone/move charges/wave progress) rarely change on any given kill.
  During a dense wave with several kills landing in one frame (especially at 5x/10x, where
  multiple simulation ticks run per rendered frame), that's real repeated DOM work for no visible
  benefit — the player only ever sees the result once per rendered frame regardless. `updateHUD()`
  is now a dirty flag; the actual DOM work (renamed `updateHUDImmediate()`) flushes at most once
  per frame from `loop()`, after that frame's simulation ticks finish. Every one of the 25 existing
  call sites is unaffected — same name, same call shape, just deferred and coalesced. Checked that
  nothing anywhere reads back from the DOM elements `updateHUD()` writes to expecting an immediate
  synchronous update — confirmed none does, safe to defer. Verified the coalescing itself: 5 calls
  within one frame correctly collapse to exactly 1 real DOM update; a quiet frame with none does
  zero wasted work.
- **Investigated, not changed**: the "duplicate `buildEnemyHash()` calls per tick" claim from the
  external review. Traced all 3 call sites — `resolveSweptEnemyCollisions()`,
  `resolveEnemyCollisions()` (itself in a 3-pass relaxation loop), and the tower-targeting hash.
  This isn't simple duplicate waste: `resolveEnemyCollisions()`'s loop rebuilds because positions
  actually shift between each of its 3 relaxation passes (rebuilding is required, not wasteful),
  and even the very first rebuild in that loop can be justified by `resolveSweptEnemyCollisions()`
  occasionally nudging positions on a tunnel-through detection. A genuine optimization here would
  mean threading a "did anything actually move" flag through several tightly-coupled, carefully-
  tuned collision functions with a long history of subtle fixes (many documented in their own
  comments) — real risk for a small, inconsistent payoff (skipping at most one rebuild out of
  three-to-four already-necessary ones). Left alone rather than forcing an optimization that isn't
  as clear-cut as it was described.
- `node --check` on the extracted script: clean.

## [1.2.29] - 2026-09-15 — Barricade hot path no longer allocates fresh collections every tick, plus its own telemetry
A second external review (a correction pass on the first one) flagged that `updateBarricadesAndPileup()`
creates a fresh array/Map/Set on every single simulation tick — a real, concrete, low-risk
optimization, unlike most of the first document's claims. Also specifically named `packSpeedBonus`
and `splashRadius` as pool-reset risks; checked both directly — both already correctly reset (the
`packSpeedBonus` reset even has its own comment already describing this exact scenario), so no
change needed there, another confirmed-already-handled item rather than a real gap.
- New module-level `barricadeActiveScratch`/`barricadeAttackerScratch`/`barricadeClaimedSlotsScratch`,
  cleared (`.length = 0` / `.clear()`) at the top of each call instead of freshly allocated. Nothing
  outside the function ever held a reference to these between calls (confirmed by checking for a
  `return` or any external capture — there is none), and nothing reads them before they're rebuilt
  each call, so reuse changes no behavior. Verified the reuse pattern itself with an isolated test:
  two consecutive "calls" against different enemy sets show no leakage between them.
- `MAX_QUEUE_DEPTH` (the queue-depth cap added last pass) hoisted from a function-local constant to
  a module-level one, so the debug log can report the real live cap instead of a second
  hand-typed copy of the same number that could quietly drift out of sync with it.
- New barricade telemetry in `perfStats`/the debug log: active enemies scanned, enemies currently
  queued, the highest queue length ever seen, and snap operations performed this tick — previously
  invisible, no way to tell from the debug log alone whether a lag spike during a pileup was the
  barricade system itself or something else.
- `node --check` on the extracted script: clean.
- **Explicitly not done this pass, and why**: the second document's own advice was followed here —
  it explicitly said not to jump to a full Structure-of-Arrays/typed-array rewrite, and to use
  scratch-collection reuse first, profiling before going further. That's exactly the scope taken.
  Decoupled combat events (a pooled, bounded event queue between `Enemy.applyDamage()` and its
  presentation effects), one-hash-per-tick reuse across collision/targeting/splash, and HUD
  dirty-flagging are all real, larger follow-ups, not attempted here.

## [1.2.28] - 2026-09-15 — Percentile telemetry, "actual speed" diagnostic, and a real debug self-test harness
Two more items from the external-review list, both purely additive (nothing existing changed
behavior) and both genuinely new capability, not bug fixes for something broken.
- **Percentile frame-time tracking**: `perfStats` now keeps a rolling 120-sample window
  (`frameMsHistory`/`updateMsHistory`/`renderMsHistory`) and the debug log reports median/p95/p99/
  max for each, not just the last frame's snapshot — an average can look perfectly healthy while
  intermittent stalls hide inside it; this is what actually surfaces them. Verified the percentile
  math directly: a single outlier spike among otherwise-steady samples correctly shows up in
  p99/max while leaving the median untouched, and an empty history returns 0 rather than crashing.
- **"Actual speed" diagnostic**: requested `gameSpeed` vs. a real ~1-second rolling measurement of
  ticks actually executed, plus the current accumulator debt (leftover simulation time not yet
  caught up) — answers "is a stutter a render problem, a simulation problem, or genuine catch-up
  debt" at a glance instead of guessing from the existing ticks-this-frame number alone.
- **New `runDebugSelfTests()`** — never called automatically anywhere, purely for manual console
  invocation. Built from real invariants of THIS codebase's actual mechanics, not the external
  document's generic checklist verbatim — several of its listed tests ("downed towers," "repeated
  damage while downed") describe a different game's mechanics and don't apply here, so weren't
  included. Covers: dead enemies excluded from targeting, escaped-enemy pool-reuse fields reset
  cleanly, escaped enemies excluded from wave-completion, wind respects its per-wave ceiling and
  stays archetype-scoped (Warriors never penalized, Mage exceeds Archer at high wind), hybrid-table
  internal consistency, and every evolved tower type actually reachable from the Build tray (the
  exact bug class the 1.2.20 pass found and fixed — re-asserted here as a standing regression test).
  Deliberately uses standalone `new Enemy()` instances and pure-function calls throughout, never
  touching `enemyPool`/`towerPool` — safe to run at any time, including mid-game.
- **Caught and fixed a real bug in the self-test harness itself before shipping**: the first draft
  of test #1 called `buildEnemyHash()` expecting to pass it an array — it actually reads straight
  from the global `enemyPool` with no parameter, so the test as written would have needed to touch
  live pool state, contradicting its own stated "never touches the real pools" safety guarantee.
  Rewritten to test the underlying `.active` filter predicate directly instead.
- `node --check` on the extracted script: clean.
- **Still remaining from the full list, explicitly not attempted this pass**: separated RNG streams
  for deterministic replay, formal state-machine enums (the invariants they'd encode are already
  true in practice per the 1.2.27 audit — this would document that explicitly, not fix broken
  behavior), save/load state reclassification, and the full wave-economy/filler-enemy redesign —
  each still its own dedicated, verified pass, logged in `BACKLOG.md`.

## [1.2.27] - 2026-09-15 — Barricade queue now has a hard depth cap; most other claims from the external review turned out to already be handled
Continued working the external-review list in verified batches. Result: most of the "invariant"
concerns were already structurally guaranteed by the existing code, not real gaps — worth recording
exactly what was checked and found, not just "reviewed, looks fine."
- **Real gap found and fixed**: `updateBarricadesAndPileup()`'s queue-catchment chain had no upper
  bound on length. The existing logic already guarantees no two enemies share a queue slot and
  exactly one attacker per barricade (both confirmed by reading the code, not assumed) — but
  nothing capped how LONG one chain could grow. New `MAX_QUEUE_DEPTH` (40): past that depth, further
  enemies fall back to `resolveEnemyCollisions()`'s normal physical spacing instead of getting a
  queue slot, rather than the chain extending without limit.
- **Checked and confirmed already correct, no change needed**:
  - Target invalidation ("dead enemies remain targetable") — every tower already does
    `if(this.target && !this.target.active) this.target = null;` every single tick. Self-healing
    every frame, not a centralized broadcast, but the same guarantee.
  - `findNearestActiveTower()` already filters `!t.active` — a downed/removed tower is never
    returned as a valid breakaway target.
  - Barricade single-attacker-per-barricade and no-duplicate-queue-slot invariants — both already
    enforced by construction (`attackerByBarricade` Map, `claimedSlots` Set), not by luck.
  - Path waypoint connectivity — `buildSpiralPathTiles()`'s bridging pass already guarantees every
    consecutive waypoint pair is a single adjacent step; this isn't validated after the fact, it's
    structurally impossible for generation to produce a disconnected path.
  - `validateGameDefinitions()` already checks nonnegative spawn delays, positive finite stats,
    every cross-reference between `CONFIG`/`SPECIALIZATIONS`/`EVOLUTIONS`/`HYBRID_SPECIALIZATIONS`/
    `CLASS_ARCHETYPE`/etc. — roughly 30 checks already in place before this pass even started.
- `node --check` on the extracted script: clean.
- **Explicitly not attempted this pass** — genuinely large NEW systems, not fixes for existing bugs,
  and each deserves its own dedicated, verified pass rather than being squeezed in here: separated
  RNG streams for deterministic replay, a telemetry/percentile frame-time system, the disabled-by-
  default debug self-test harness, formal state-machine enums (the invariants they'd encode are
  already true in practice, per the checks above — this would be making that explicit/documented,
  not fixing broken behavior), save/load state reclassification, and the full wave-economy/filler-
  enemy redesign. All still logged in `BACKLOG.md`.

## [1.2.26] - 2026-09-15 — Spawn queue no longer uses shift() — one verified fix pulled out of a large external proposal
An external review document proposed a large set of changes (state-machine refactor, telemetry,
deterministic RNG/replay, a debug self-test harness, save-state migration rules, plus a separate
11-point wave-economy redesign). Not implementing that wholesale — it's a dozen-plus separate
projects, several assuming problems without confirming they exist in this codebase. Spot-checked
its `spawnQueue.shift()` claim specifically, since it was concrete and quick to verify — confirmed
accurate by reading the actual spawn loop, so fixed that one thing on its own merits.
- New `spawnQueueIndex` cursor, replacing repeated `spawnQueue.shift()` calls in the per-frame spawn
  loop. `shift()` is O(n) per call (re-indexes the whole remaining array) — harmless at the wave
  sizes this game has shipped with so far, but a real, well-known anti-pattern worth fixing cheaply
  now rather than after waves grow larger.
- `spawnQueue` itself is never trimmed during a wave anymore — only the cursor advances. Every
  `push()`/`sort()`/full-array-iteration call site in `startNextWave()` (queue construction, the
  speed-reordering pass, the countdown-offset pass, the anti-bunching spacing pass) is unaffected,
  since all of those run before any spawning starts, on the still-complete array. Reset to 0
  alongside `spawnQueue = []` at all three existing reset points (new-game, wave-start rebuild,
  full game reset) — checked each site individually rather than assuming one catch-all reset
  existed.
- The important existing pool-exhaustion behavior — a failed spawn attempt leaves that entry
  queued and retries it next frame, rather than losing it — is preserved exactly: the cursor simply
  doesn't advance past a failed `spawnEnemy()` call.
- Verified against a faithful transcription of the real loop: spawn order preserved, wave-complete
  transition still fires at the right moment, the source array is confirmed genuinely untouched
  (still holds all entries throughout), and the pool-exhaustion retry-same-entry behavior confirmed
  working via a forced-failure test. `node --check` on the extracted script: clean.

## [1.2.25] - 2026-09-15 — Flags are real long-triangle pennants now, not kites
The previous ripple redesign (two parallel edges each rippling independently, only tapering 30% by
the far end) produced a parallelogram-with-a-wave, which read as a kite/diamond rather than a
flag. Rewritten as an actual triangle: a fixed, perfectly vertical hoist edge running down from the
pole's own top (matching the pole line exactly, never offset or rippled — a real seam doesn't
wave), tapering to a single free-fluttering tip point. Both flags use the exact same construction,
just recolored — "attached the same way" by definition, not by coincidence.
- Verified the actual geometry against the real formula: the hoist edge is confirmed perfectly
  vertical (both points share the same x-coordinate) at a fixed 9px height, the tip is genuinely
  displaced away from the pole, and the three points form a real, non-degenerate triangle (nonzero
  area) rather than three near-collinear points. `node --check` on the extracted script: clean.

## [1.2.24] - 2026-09-15 — Build tray no longer shows deep-tier evolutions before their own prerequisite is unlocked
Real report, confirmed by reading the actual Build-tray code: it rendered a locked row for every
one of the ~20 unlockable classes from wave 0, including ones gated on investing in a class
("Cleric", "Gunalinder") that isn't buildable yet at all — reaching Pope needs 750 INT on a
*Cleric* specifically, but Cleric itself has to be unlocked first. The riddle text for those rows
gave no indication a whole separate unlock had to happen first.
- Deep-tier evolutions (`EVOLUTIONS`-driven — Paladin, Squirtgun, Bomber, Gunalinder, Sniper, Pope)
  now don't render a row at all until their own prerequisite class is actually unlocked. Element/
  hybrid/triple-stat unlocks (Hammerman, Blowdart, Gatling, Marksman, Snapcaster, Cleric,
  Necromancer, Blow Gunner, Cat Snapper, Proton, Dark Matter, Quasar) are unaffected — all rooted
  directly at a base class, buildable from wave 0 same as always.
- Checks EVERY `EVOLUTIONS` entry targeting a given class, not just one — Sniper specifically has
  TWO valid prerequisite paths (Gunalinder OR Marksman), and the existing
  `TOWER_UNLOCK_SOURCE_BY_TARGET` lookup only ever remembers whichever was written last, so reusing
  it here would have wrongly hidden Sniper behind just one of its two real paths.
- **Caught a real bug in my own first attempt at this fix, before it shipped**: the initial version
  initialized its "is this reachable" flag to `true`, which meant the loop's own early-exit check
  fired on the very first `EVOLUTIONS` entry that didn't even target the class in question at all
  — silently defeating the entire fix (every row still would have shown, immediately, regardless
  of prerequisites). Caught by running an isolated test against the real code before shipping, not
  assumed correct from the logic reading right on a re-read — re-verified after the fix with the
  same test, now passing on every case including the Sniper dual-path one.
- `node --check` on the extracted script: clean.

## [1.2.23] - 2026-09-15 — Dark Matter and Quasar shipped — every hybrid from the original design doc is now implemented
The last two hybrids, both by explicit request to finish "mapping it all." Same reuse discipline
as Proton/Blow Gunner throughout — no brand new status-effect systems needed for either.
- **`DARK_MATTER`** (Electric+Ice, near-black): same all-3-base-classes shape as Proton — whichever
  of Swordsman/Archer/Mage pushes both DEX and INT to 500 first unlocks it. Same
  poisonDamage/slowFactor reuse as every other hybrid, just weighted toward the slow rather than
  the burn (Electric+Ice both read as control/disable more than damage-over-time) — the
  differentiation from Proton/Blow Gunner is in the ratio, not a new mechanic.
- **`QUASAR`** (all three elements, near-white): the genuine capstone — gated on a real trigger,
  not left unsolved. The blocker was never actually "impossible," it was "doesn't fit the
  single-locked-attunement pairKey system" — true, but Quasar doesn't have to go through that
  system at all. New independent check in `checkAttunementAndSpecialization()`: all three raw
  stats (str/dex/int) each reaching `SPECIALIZATION_THRESHOLD` (500) — the same threshold every
  other unlock already uses, checked directly, the same way Cat Snapper's raw-DEX check already
  bypasses the attunement system entirely. Reachable from any base class, same as the other two.
  Its kit adds `splashRadius` (AoE, already generic on impact, same field Bomber/Squirtgun use) on
  top of the shared poisonDamage/slowFactor combo — genuinely stronger in kind, not just tier
  level, matching that it's gated on 1500 total stat points instead of 1000.
- Full definition checklist for both: `JOB_COLORS`/`JOB_BUILD`/`JOB_QUOTES`/`RANGE_CAPS`/
  `CLASS_ARCHETYPE`/`TOWER_STRATEGY`/`EVOLVED_TOWER_TYPES`/`TOWER_UNLOCK_RIDDLE`, `fireProjectile()`
  reach/color/sound, `isMagicMissile`, and both extended into the shared Mage/Snapcaster/Proton
  render branch and its `castProgress` flourish rather than new branches from scratch. New manual
  `TOWER_UNLOCK_SOURCE_BY_TARGET.QUASAR` entry (not table-driven, same pattern Cat Snapper needed).
- Caught and fixed one real mistake while writing Dark Matter's blurb text — briefly wrote out
  self-correcting reasoning ("wait, DEX and INT...") into the actual player-facing string before
  catching it on the next pass. Cleaned before shipping, not left in.
- `BACKLOG.md`'s Phase 2 doc updated end to end: both marked shipped, the "map" section's
  per-hybrid status lines corrected, and the multi-base-class pattern now explicitly noted as
  proven and reusable (it's been used 3 times now, not a one-off).
- Verified against the real extracted trigger logic, not assumed from Proton's precedent: Dark
  Matter confirmed unlocking from all 3 base classes independently; Quasar confirmed NOT firing
  with only two of the three stats at 500 (a real negative test, not just a positive one), then
  confirmed firing once the third stat also reaches it; Quasar confirmed reachable from Swordsman
  and Archer, not just Mage; both confirmed present in `UNLOCKABLE_TOWER_TYPES` (20 entries total,
  matching `EVOLVED_TOWER_TYPES`'s own count exactly). `node --check` on the extracted script:
  clean.

## [1.2.22] - 2026-09-15 — New tower: Proton — Fire+Electric hybrid, reachable from ANY base class; Quasar and Dark Wizard still not ready
- **New `PROTON`**: purple "space electricity," burns on contact plus a brief electrical
  slow — same dual-existing-mechanic-reuse shape `BLOW_GUNNER` already established (poisonDamage
  reskinned as burn, slowFactor as the disruption), so this needed no new status-effect code.
- **Reachable from all 3 base classes, not just one** — a deliberate departure from every other
  hybrid/specialization in the game, which are each tied to exactly one base class.
  `HYBRID_SPECIALIZATIONS` now has a `SWORDSMAN`/`ARCHER`/`MAGE` entry each mapping their own
  `'ELECTRIC+FIRE'` pair to the SAME `PROTON` target — whichever tower gets Fire+Electric to 500/500
  first unlocks it, one shared class rather than three separate variants (a much bigger,
  differently-scoped ask that wasn't what was actually requested). Archetype-tagged `MAGE`
  regardless of which base class actually unlocked it, same pattern `CAT_SNAPPER` already
  established.
- Full definition checklist: `JOB_COLORS`/`JOB_BUILD`/`JOB_QUOTES`/`RANGE_CAPS`/`CLASS_ARCHETYPE`/
  `TOWER_STRATEGY`/`EVOLVED_TOWER_TYPES`, `fireProjectile()` reach/color/sound, `isMagicMissile`,
  and a new `TOWER_UNLOCK_RIDDLE` entry phrased generically ("from any path") rather than naming
  one source class, since it genuinely isn't tied to one. Reuses the shared `MAGE`/`SNAPCASTER`
  render branch and `castProgress` cast-flourish computation directly (both extended to include
  `PROTON`) rather than writing a new render branch from near-scratch.
- **Quasar remains unbuilt** — still no defined trigger mechanism ("all three equally" doesn't fit
  the single-locked-attunement model any more than it did before) and no unlocked-class name.
  **Dark Wizard** (the "force-choke, lift enemies in place, other towers can still hit them"
  concept mentioned alongside this) is logged as a future idea, not started — the description
  trailed off mid-thought and it wasn't the request being acted on this turn.
- Verified against the real extracted derivation and trigger logic: `PROTON` confirmed present in
  `UNLOCKABLE_TOWER_TYPES`; the hybrid trigger fires correctly from all 3 base classes
  independently (Swordsman, Archer, and Mage each unlock it on reaching Fire+Electric 500/500,
  tested as three separate scenarios against the real code, not assumed from symmetry). `node
  --check` on the extracted script: clean.

## [1.2.21] - 2026-09-15 — Wind overhaul: gentler flutter, gradual bounded gusts, ceiling scales with wave progress, wind direction, both flags get a contrasting outline
A full pass on wind feedback — every point addressed.
- **Black flag now gets a white outline** (was white-only before) — both banners read clearly
  against any background now, not just the white one against a dark path tile.
- **Flutter redesigned** — the old two-point version moved the whole banner shape rigidly back and
  forth (read as a fish tail flicking). Now a real multi-point traveling wave: amplitude is exactly
  0 right at the pole (where real cloth is pinned) and grows toward the free end, with the ripple's
  phase shifting along the banner's length so the wave visibly travels outward instead of the whole
  shape swaying in place. Speed and amplitude both scaled down from before too — gentler overall.
- **Wind changes far more gradually now**: retarget interval up from 2.5-6.5s to 6-15s, and the
  ease rate slowed roughly 3x (`dt/1500` → `dt/4500`).
- **Never jumps straight to a high value**: `updateWind()` rewritten as a bounded random walk —
  each new target is a step of at most ±0.35 from wherever wind currently is, not an independent
  re-roll — so reaching a strong gust always visibly ramps through the intermediate range first.
- **New `windCeilingForWave`**, set fresh in `startNextWave()`: climbs linearly from a gentle 0.15
  at wave 0 to a full 1.0 ceiling by wave 30. Rough wind is now genuinely rare early on and a real,
  regular possibility later — "each wave needs a wind amount" — rather than one flat cap for the
  whole game. `windStrength` itself isn't reset between waves, only the ceiling it can climb toward.
- **New `windDirAngle`**: a separate, independently and slowly drifting value (its own bounded
  walk, same shape as the strength one) that gently leans the flag's flutter — purely cosmetic;
  `windMissPenalty()` stays direction-agnostic exactly as originally specified, only strength
  drives the gameplay effect.
- Verified against the real extracted `updateWind()`: single-retarget jumps never exceed the
  ±0.35 step bound; with state properly reset first, wind genuinely never exceeds a given ceiling
  over a long simulated run (an initial test run showed a value above the ceiling, traced to carried-over
  state from a prior scenario in the test harness itself, not the actual code — confirmed by
  re-running with a clean reset); per-tick change stays small, confirming gradual easing rather
  than a snap; and the flutter's ripple amplitude is confirmed exactly 0 at the pole, growing
  toward the free end. `node --check` on the extracted script: clean.

## [1.2.20] - 2026-09-15 — Cat Snapper is now unlocked (Archer, DEX 500), not a starter — and a real pre-existing bug found along the way
Standing instruction going forward: only Swordsman, Archer, and Mage are the 3 basic intro classes
(plus Barricade, the one non-fighting utility exception) — nothing else gets added to
`STARTER_TOWER_TYPES`. Cat Snapper was there by mistake; moved to a proper unlock instead.
- **Removed from `STARTER_TOWER_TYPES`**, added to `EVOLVED_TOWER_TYPES`. `CONFIG.TOWERS.CAT_SNAPPER`'s
  `baseCost` changed from 80 to 0, matching every other evolution-only class's convention.
- **New unlock condition: an Archer reaching 500 DEX** — a raw stat threshold checked directly in
  `checkAttunementAndSpecialization()`, independent of attunement/element entirely (fires even if
  that Archer hasn't attuned to anything yet, or already attuned to a different element), since all
  3 of Archer's own element slots were already taken (Gatling/Blowdart/Marksman) and this was never
  going through `SPECIALIZATIONS` at all. Reuses `SPECIALIZATION_THRESHOLD` (500), the same number
  every other specialization unlock already uses.
- Archetype stayed `MAGE` (unchanged) rather than switching to DEX/`ARCHER` scaling just because
  the unlock source changed — a deliberately conservative call, flagged rather than silently
  assumed, since the request was about the unlock condition specifically.
- **Found and fixed a real pre-existing bug while wiring this up**: `TOWER_UNLOCK_SOURCE_BY_TARGET`
  (which `UNLOCKABLE_TOWER_TYPES` — and therefore the Build tray's entire locked/unlocked row
  loop — is derived from) only ever pulled from `SPECIALIZATIONS` and `EVOLUTIONS`, never
  `HYBRID_SPECIALIZATIONS`. That meant **Blow Gunner has never actually appeared in the Build tray
  at all, locked or unlocked**, since it shipped — confirmed by extracting and running the real
  derivation logic, not assumed. Fixed by folding `HYBRID_SPECIALIZATIONS` into the same
  derivation, plus Cat Snapper's own explicit entry (not table-driven, so it needed one by hand).
- Added a `validateGameDefinitions()` check that would have caught this: every
  `EVOLVED_TOWER_TYPES` entry must now actually appear in `UNLOCKABLE_TOWER_TYPES`, or boot fails
  loudly instead of silently leaving a class unreachable.
- Filled in 3 missing `TOWER_UNLOCK_RIDDLE` entries found the same way (Necromancer, Blow Gunner,
  Cat Snapper all had none — silently falling back to a generic "a secret combination" message
  instead of a themed hint, not a crash, but real missing polish caught in the same sweep).
- Verified against the real extracted derivation and unlock-check logic: both `CAT_SNAPPER` and
  `BLOW_GUNNER` now confirmed present in `UNLOCKABLE_TOWER_TYPES` (17 entries total, matching
  `EVOLVED_TOWER_TYPES`'s own count); the DEX-500 check fires correctly whether or not that Archer
  is already attuned to something else, and correctly stays Archer-exclusive (a Mage reaching DEX
  500 unlocks Snapcaster as normal, never Cat Snapper). `node --check` on the extracted script:
  clean.

## [1.2.19] - 2026-09-15 — New system: ambient wind — flags flutter with it, Archers/Mages miss more in a gust, Mages even more
A real gameplay-affecting weather system, not just a visual — the flags are its visible gauge.
- **New `windStrength`** (0 calm to 1 max gust), eased toward a randomly re-picked target every
  2.5-6.5s rather than snapping, so it reads as genuine gusts and lulls instead of a flicker.
  Squared random distribution when picking a new target, so calm/light wind comes up more often
  than a real "very windy" spike — the strong gusts stay a real, noticeable event, not the norm.
  Advances on `gameTime`'s own dt (already scaled by `gameSpeed`), so gusts speed up consistently
  with the game rather than gusting in real-time while their effect lags behind at high speed.
- **`drawFinishFlagPole()`** now animates a cloth-like ripple (two moving control points, the tip
  lagging the mid-point's phase so the wave visibly travels out along the banner) — amplitude and
  speed both scale with `windStrength`, so a calm moment barely moves the flag and a strong gust
  visibly whips it. Direction of the flutter is always perpendicular to whichever way the banner
  already points away from its pole — the wind's own direction is never part of the calculation
  anywhere in this system, only its strength, exactly as asked.
- **New `windMissPenalty(tower)`**: added to the existing miss-chance roll at every ranged-attack
  site that actually applies to Archer/Mage-archetype towers (`fireProjectile()`'s single-target
  pre-roll, `Projectile.onImpact()`'s splash roll, Cleric's own smite roll) — Warrior-archetype
  melee rolls (the cone-sweep hit check, Axeman's throw) are untouched, since a melee swing isn't
  meaningfully wind-affected the way a projectile actually in flight is. Archer-archetype gets up
  to +25 percentage points of miss chance at max wind; Mage-archetype gets that same base penalty
  PLUS an extra quadratic-in-wind term on top, so it grows visibly faster than the Archer penalty
  as wind increases — "even more when very windy," not just the same flat amount every archetype
  shares.
- `windStrength`/its retarget timer reset to a fresh calm state in `resetGame()`, so a new game
  doesn't inherit whatever gust happened to be mid-swing in the previous session.
- Verified against the real extracted `updateWind()`/`windMissPenalty()`: Warrior-archetype towers
  get exactly zero penalty at any wind level; Archer's penalty scales linearly with wind; Mage's
  penalty is measurably larger than Archer's at high wind (confirming the quadratic term actually
  does something, not just present in the formula); wind eases smoothly over many ticks and never
  leaves its [0,1] bounds. `node --check` on the extracted script: clean.

## [1.2.18] - 2026-09-15 — Escaped enemies no longer force-cleared at the next wave start — they persist until actually killed
Direct request: enemies left wandering from a previous round were being force-deactivated the
instant the next wave started (a deliberate design choice as of 1.2.16, since reversed). Now they
just... stay, across as many rounds as it takes, until something actually kills them.
- Removed the clearing loop from `startNextWave()` entirely.
- No other logic needed to change: the wave-completion check already excludes escaped enemies via
  its own `!e.escaped` filter regardless of how long they've been wandering, so this can't cause a
  wave to hang waiting on one. `resetGame()`/`restoreGameState()` still unconditionally deactivate
  every enemy on a real reset or save load — untouched, and correctly so, since that's a full
  reset, not a between-wave clear.
- Updated the now-stale comments this left behind in `reachEnd()` and the wave-completion check,
  plus `README.md`'s own description of the mechanic, which still said "until the next wave
  starts."
- No behavior worth a Node re-verification here — this is a deletion, not new logic; the two
  pieces of logic that actually matter (the wave-completion exclusion, and `updateEscaped()`'s own
  attack/wander behavior) were both already verified correct in the 1.2.17 pass and are completely
  unaffected by removing the clear. `node --check` on the extracted script: clean.

## [1.2.17] - 2026-09-15 — Flags depth-sort like trees now; escaped enemies can attack towers directly, at high chance
Two separate fixes/features requested together.
- **Flags moved from the static baked map layer into the dynamic depth-sorted layer**
  (`drawDepthSortedLayer()`, the same per-frame Y-sorted list trees/rocks/enemies/towers/debris
  already share), instead of being baked once into `mapCanvas` where they'd always draw behind
  every enemy and blood decal regardless of actual position — a flag has real height, same as a
  tree, so it needs the same occlusion treatment. `drawMap()` no longer draws them at all; the
  static layer is carpet-only now. `computeSpawnFlags()` itself is unchanged, just called from a
  different place (once per frame instead of once at bake time).
- **Escaped/wandering enemies (see `reachEnd()`/`updateEscaped()`) can now attack nearby towers
  directly**, at a deliberately high, periodically-re-rolled chance (0.5 per ~1-2s check, vs. the
  normal on-path `breakawayChance` field, which tops out at 0.6 total across a whole lifetime for
  Fire/Ice and is mostly 0.02-0.04) — a real, escalating cost for leaving an escapee wandering, not
  just something to go hunt down for the bonus kill. Reuses `findNearestActiveTower()` and
  `Tower.takeDamage()` exactly as the existing on-path breakaway system already does (same
  damage/defeat/gore handling, zero special-casing needed there) — this is a parallel, separate
  targeting/movement path, not a reuse of `isBreakaway`/`updateBreakaway()` itself, since those
  never actually run for an escaped enemy (`update()`'s dispatch returns via `updateEscaped()`
  before reaching that check at all). Shorter engage range (140) than the on-path version's 320 —
  a wandering escapee shouldn't be able to threaten a tower from clear across the map, only one
  it's actually bumbled near. New pool-reuse fields (`escapedAttackTarget`/`escapedAttackTimer`/
  `escapedAttackCheckTimer`) reset explicitly in `spawn()`, matching the existing
  `wanderVx`/`wanderVy`/`wanderRepickTimer` pattern.
- Verified the full attack cycle against the real extracted `updateEscaped()` method (not a
  reimplementation): no tower nearby produces zero false-positive attacks; a tower within range is
  correctly acquired, chased toward (distance measurably decreases), engaged at the exact
  `breakDamage` value and cadence, and the target is correctly cleared once the tower reports
  itself defeated. `node --check` on the extracted script: clean.

## [1.2.16] - 2026-09-15 — Finish-line flags moved to the SPAWN tile instead of the finish tile
The carpet stays exactly where it was (the finish tile, unchanged). The two flags moved
somewhere else entirely, per direct request: instead of marking the finish tile, they now mark the
spawn tile — where enemies actually appear — on its own far edge (both flags on the same line,
facing away from the direction enemies first walk), reading as a start line rather than a finish
marker.
- New `computeSpawnFlags()`, a direct mirror of `computeFinishLine()`'s own geometry but anchored
  at `waypointsPx[0]`/`[1]` (the path's first waypoint and the initial direction of travel leaving
  it) instead of the last two. `computeFinishLine()` itself is now carpet-only — its now-unused
  `center`/`flagLower`/`flagUpper` fields were removed from its return value entirely rather than
  left dead; confirmed its only other caller (`Enemy.update()`'s final-stretch crossing check)
  never touched those fields, only `edgeX`/`edgeY`/`ux`/`uy`, so removing them is not a regression.
- Both functions are recomputed fresh from the live path every call — same "never cached" approach
  either way — so if the spawn point or the finish point changes between rounds (map expansion,
  reroll), both the carpet and the flags already track correctly with no new wave-change handling
  needed.
- `drawFinishFlagPole()` itself is unchanged — still the procedural vector pole from the previous
  pass, just now called with the spawn tile's geometry instead of the finish tile's.
- Verified against the real extracted functions with a longer, multi-segment test path: the spawn
  flags land on the same line as each other, and end up far from the finish carpet's own position
  (confirming they're genuinely anchored to a different tile, not still tied to the finish tile
  under a different name). `node --check` on the extracted script: clean.

## [1.2.15] - 2026-09-15 — Finish-line flags moved to the tile's far edge, both on the same line, opposite the carpet
Replaced the diagonal-corner placement from the previous pass with a clearer, explicit spec: both
flags on the same edge of the finish tile — the edge farthest from the carpet (the tile's far side,
opposite the carpet's own edge), not split across a diagonal.
- `computeFinishLine()`'s flag geometry reworked: instead of picking a diagonal corner pair, it now
  mirrors the carpet's own edge across the tile's center (along the direction of travel) to get the
  far edge, then takes that edge's own two corners — both flags end up on that one line together.
- Recomputed fresh from the current path every call, same as before — already correctly tracks a
  path that changes between rounds (map expansion, reroll) with no extra caching logic needed.
- Verified for all 4 cardinal exit directions against the real extracted function: both flags
  confirmed to share either the same X or the same Y (a real single line, not an approximation),
  and that line sits exactly one full tile-width (64px) from the carpet's own edge in every case —
  the tile's true opposite side. `node --check` on the extracted script: clean.

## [1.2.14] - 2026-09-15 — Finish-line flags: real vector poles instead of emoji, pole bottom now sits exactly on the corner
Two fixes from an annotated screenshot report. Re-verified the diagonal-corner math from the
previous pass first (fresh Node check against all 4 cardinal exit directions, same result as
before: white at the corner most against the direction of travel, black at its true diagonal
opposite, both genuine tile corners) — it checked out again, so if the reported position still
looks wrong after this, the most likely explanation is the build being looked at predates that
fix rather than a new geometry bug; flagged this directly rather than guessing a third layout.
- **New `drawFinishFlagPole()`**: a small procedural pole-and-banner, replacing the 🏴/🏳️ emoji
  glyphs entirely. Nothing about it depends on how — or whether — a given platform's emoji font
  renders those two specific characters, which is the most likely actual cause of the reported
  "pixelation," not fully resolved by the earlier mapCanvas DPR fix alone since that only addressed
  the layer's raster resolution, not per-glyph font rendering quality.
- **Pole bottom now sits exactly at the corner coordinate — no outward offset.** The previous
  version nudged the flag 6px outward from its corner "for visual clarity," which technically
  contradicted "planted right on the corner" from the start. Removed entirely; each banner now
  flutters outward (away from the tile's own center) instead of the whole flag being offset.
- `node --check` on the extracted script: clean.

## [1.2.13] - 2026-09-15 — Fixed HUD bar sometimes rendering full-size/unscaled at game start, clipping both edges
Root-caused, not guessed at: `fitHudTopToOneLine()`'s very first call runs once at script-load
time, before `#hud-top` is ever made visible (it starts `display:none` and only becomes `flex`
when Play is pressed — see the `playBtn` handler). Measured while hidden, `scrollWidth` reads 0,
so the function correctly-by-its-own-logic concludes "0 is never wider than the screen, no scaling
needed" — and locks that wrong conclusion into `hudFitSignature`, the fingerprint that gates every
later recompute. Nothing then re-triggers a real recompute until the lives/gold/wave digit COUNT
happens to change or the window resizes, so the bar could sit at its true natural width (centered
via `margin:0 auto`, comfortably wider than a phone screen) — clipping both edges symmetrically —
for an arbitrary stretch of actual play, until one of those unrelated events happened to fire.
- Added an explicit forced `fitHudTopToOneLine(true)` call in the `playBtn` handler, right where
  `#hud-top` actually becomes visible — same fix shape, same call site, as the existing
  `positionZoomControls()` call one line below it, which already exists for the identical
  underlying reason ("just went from display:none (height 0) to visible").
- Verified the specific bug (naturalWidth=0 → concludes no scaling needed) and the fix (measuring
  after real content exists → correctly computes a scale) against the actual branching logic.
  `node --check` on the extracted script: clean.

## [1.2.12] - 2026-09-15 — Finish-line carpet is now a real 2D checkerboard; flags moved to the tile's true diagonal corners
Two related fixes from a screenshot: the carpet had stopped reading as checkered, and the flags
weren't where they were asked to be.
- **The carpet was never actually a checkerboard** — it only alternated color along one axis (the
  perpendicular direction), producing a single row of stripes, not a 2D check pattern. Rewritten as
  a real 8×2 grid alternating in both directions (`(col+row)%2`), with each cell now a true 8×8px
  square (64px edge ÷ 8 cols, 16px thickness ÷ 2 rows) — unambiguously checkered regardless of
  zoom or the path's exit angle.
- **Flags moved from the two ends of the carpet's own edge to the finish tile's actual diagonal
  corners.** Previously both flags sat on the exit edge only (adjacent corners of the tile, both on
  the side enemies cross) — correct-looking for some exit angles but not what was asked for.
  `computeFinishLine()` now also returns the tile's true opposite-corner pair: one corner picked as
  whichever is most aligned with the direction of travel, the other computed as its exact
  reflection through the tile's own center (`center*2 - exitCorner`), guaranteeing a genuine
  diagonal regardless of which way the path exits. Each flag nudges outward along its own
  corner-to-center line now, not a shared travel-direction offset, since the two corners point
  different ways from center.
- The carpet's own edge-flush geometry (`lowerP`/`upperP`/`edgeX`/`edgeY`/`ux`/`uy`) — and
  therefore the enemy full-body-crossing check in `Enemy.update()`, which reads those same fields —
  is completely untouched; only added fields, nothing removed or renamed.
- Verified against the real extracted `computeFinishLine()` for all 4 cardinal exit directions: the
  two flag corners are confirmed true diagonal opposites through the tile center (not just visually
  distant) and each really is one of the tile's 4 real corners (32px off-center in both axes), and
  `edgeX`/`edgeY`/`ux`/`uy` are numerically identical to their pre-change values — confirming zero
  regression to the crossing logic. `node --check` on the extracted script: clean.

## [1.2.11] - 2026-09-15 — New tower: Blow Gunner — the first dual-element hybrid class, built from scratch (Phase 2 wasn't actually started before this)
Corrected an overstatement from the previous turn's summary: this wasn't "ready to build" the way
it was described — the whole hybrid-element system (Phase 2 in `BACKLOG.md`) had zero code behind
it, just a design doc with an explicitly unresolved open question ("what stat state actually
triggers the combo... not something to guess an implementation for"). Built the system for real
this time, making one concrete, documented judgment call to answer that open question rather than
leaving it blocked.
- **The trigger decision**: a tower already locked into one element (`this.attunement`) whose
  OTHER element's own stat ALSO reaches `SPECIALIZATION_THRESHOLD` (500) — reusing the exact same
  threshold single-element specialization already uses, in either order (lock Fire then push Ice's
  stat to 500, or lock Ice then push Fire's — both work identically). Not a new number invented,
  the existing pattern applied one more time. Additive, not exclusive: a hybrid unlocks *alongside*
  the single-element specialization, off the same stat growth — picking one doesn't foreclose the
  other.
- **New `HYBRID_SPECIALIZATIONS` table + generic pair-detection loop** in
  `checkAttunementAndSpecialization()`, order-independent (sorted `'ELEMENT+ELEMENT'` key). Only
  `ARCHER: { 'FIRE+ICE': 'BLOW_GUNNER' }` is actually defined — Proton and Dark Matter still have
  no target base class or unlocked-class name, so wiring triggers for them would've been pure
  invention with zero anchor point, unlike Blow Gunner which had a confirmed name, hybrid name, and
  target base class already given. Quasar isn't attempted at all — three-way balance doesn't fit
  this two-element model to begin with.
- **`CONFIG.TOWERS.BLOW_GUNNER`**: combines `poisonDamage` (Blowdart/Squirtgun's own scald-like
  DoT) with `slowFactor`/`slowDuration` (Mage's own chill) on one class for the first time — both
  already apply fully generically on impact, so this needed zero new status-effect code, the same
  "free mechanic reuse" pattern as the last three new classes this session.
- Full definition checklist otherwise: `JOB_COLORS`/`JOB_BUILD`/`JOB_QUOTES`/`RANGE_CAPS`/
  `CLASS_ARCHETYPE`/`TOWER_STRATEGY`/`EVOLVED_TOWER_TYPES`, `fireProjectile()` reach/color/sound,
  a full `drawStickman()` render branch (Blowdart's exact mouth-anchor fix reused, a drifting
  steam-wisp instead of a droplet), and a new `validateGameDefinitions()` check for
  `HYBRID_SPECIALIZATIONS` matching the existing `SPECIALIZATIONS` check's shape.
- **Corrected two now-stale claims found while touching this system**: `BACKLOG.md` previously said
  Proton could only ever target Swordsman/Archer because "Mage has no Fire path" — that constraint
  disappeared the moment Necromancer shipped (`SPECIALIZATIONS.MAGE.FIRE`) two turns ago, and
  nobody had gone back to fix the claim. Also corrected `BACKLOG.md`'s "STR-Mage evolution chain"
  section, which still described Necromancer by its *original, unbuilt* 3-tier
  Rogue-Sorcerer→Crazy-Wizard→Necromancer HP-sacrifice-AoE design — restructured to clearly
  separate "what was originally proposed" from "what actually shipped," since they turned out to
  be two quite different designs.
- Verified the hybrid trigger against the real extracted `SPECIALIZATIONS`/`HYBRID_SPECIALIZATIONS`
  tables and a faithful transcription of the real `checkAttunementAndSpecialization()` logic, as
  true incremental play (sequential stat growth across multiple calls, not one snapshot) rather
  than a single-shot approximation: order-independence confirmed both directions, the undefined
  Proton pair correctly produces nothing, and a different base class (Swordsman) reaching the same
  Fire+Ice stat state correctly produces nothing since the pair is only defined for Archer.
  `node --check` on the extracted script: clean.

## [1.2.10] - 2026-09-15 — Named the level-5 Swordsman spec "Zweihander" and gave it a real charge-up
Turns out most of this request was already built: the level-5 Swordsman "Two-Hander" spec already
existed (bigger blade, wider swing arc, +60% damage, +25% cooldown) — it just wasn't named
"Zweihander" and had no charge-up mechanic of its own. Confirmed the "and blood" part needed no
new code at all: the gore system already scales hit-time particle counts by `dmg / target.maxHp`
(`flinchSeverity`), so a genuinely bigger hit already produces a proportionally bigger burst with
zero class-specific code, and the weapon-type lookup already falls through to `'BLADE'` for
anything not explicitly Hammerman/Paladin (blunt) or Spearman (pierce) — exactly right for a giant
two-handed sword, so that needed no changes either.
- **Renamed** "Two-Hander" → **"Zweihander"** everywhere it's shown: the level-5 spec-choice card,
  the tower's own name label, and the debug-log class description.
- **New charge-up wind-up**: extended the existing `chargeProgress` mechanic (previously
  Mage/Snapcaster-only — continuous 0→1 built from `cooldownTimer/cooldown`, already driving
  Mage's own glowing-orb telegraph) to also cover a Zweihander Swordsman. Reused rather than
  reinvented, so it can never drift out of sync with the tower's actual real cooldown timing. Drives
  a trembling blade (shake amplitude ramps in only the back half of the charge, toward release) and
  a building edge-glow with the same final-flicker-right-before-release language Mage's orb already
  uses, in its own warm-white palette rather than a copy of Mage's blue/violet — reads as its own
  weapon's "getting ready," not a reused effect.
- Neither the existing damage/cooldown multipliers (still +60%/+25%) nor the swing-arc widening
  were touched — this was about naming and telegraphing what was already there, not a rebalance.
- Filled in two real, pre-existing documentation gaps found while touching this system: `README.md`
  never actually documented the level-5 spec choice at all (now does), and its INT-archetype class
  list was already stale from the last two towers added (missing Necromancer and Cat Snapper).
- Caught myself about to bump the version to 1.3.0 (minor) out of habit for the third time this
  session — corrected to 1.2.10 (patch-only, per `AGENTS.md`).
- Verified `chargeProgress`'s and the shake amplitude's math against the real formulas across a
  full charge cycle (0→1, with the shake staying exactly 0 through the first half and ramping only
  in the back half). `node --check` on the extracted script: clean.

## [1.2.9] - 2026-09-15 — New tower: Necromancer — Mage's STR specialization, raises skeletons each round; fixed a Cat Snapper sound bug from 1.2.8
- **`SPECIALIZATIONS.MAGE.FIRE = 'NECROMANCER'`** fills a gap that was explicitly left undefined in
  the code ("Fire/STR is intentionally left undefined... not to invent one just to fill the cell")
  — now filled by direct request. Reached the same way Cleric is (attunement at STR 100, unlocks at
  STR 500), structurally its mirror: a single Mage specialization tier with an attack plus one
  support ability, just STR-gated instead of INT-gated.
- **Own attack**: a dark bolt, reusing the standard projectile/`onImpact()` path unchanged (no
  special-casing needed) — same magic-missile visual treatment as Mage, recolored dark purple.
- **Signature ability**: raises `skeletonCount` (2/3/4 by tier) skeleton minions near itself at the
  start of every round (`startNextWave()` → new `raiseSkeletonsForTower()`), destroyed the instant
  that round actually completes (the `waveState` ACTIVE→IDLE transition) — never carried into the
  between-round lull. New pooled `SkeletonMinion` class + `skeletonPool` (8-slot, generous headroom
  over what's actually reachable): stationary, auto-attacks the nearest active enemy within its own
  small range on a timer. Deliberately **not damageable by enemies** — same simplification
  `CatCompanion` already uses; making them killable would mean teaching the breakaway-targeting
  system a new kind of valid target, a separate feature this didn't take on.
- **Capped at one active Necromancer on the board** (`MAX_ONE_PER_BOARD_TYPES`), by explicit
  request — flagged in comments as a deliberate exception, since it's only a first-tier
  specialization, not a deepest-tier class like the other three entries in that list.
- New `drawSkeleton()`: small procedural bone-white silhouette (no emoji), same approach as
  `drawCat()`.
- **Found and fixed a real bug from 1.2.8 while re-touching this same area**: Cat Snapper's
  `'shot_cat'` sound was defined in the audio engine but never actually added to `fireProjectile()`'s
  `rangedSound` lookup table, so every Cat Snapper shot has been silently falling back to Archer's
  bowstring-twang sound since it shipped. Fixed; `'shot_cat'` now actually plays.
- Verified the skeleton lifecycle against the REAL extracted `SkeletonMinion` class and
  `raiseSkeletonsForTower()` (not a reimplementation): attack timing and damage-credit-to-tower
  correct, a skeleton with nothing in range stays raised rather than expiring early, inactive
  enemies are correctly ignored, a tier-3 Necromancer raises exactly 4 skeletons spread around
  itself, round-complete clears them all, and the pool never exceeds its cap even under an
  artificial multi-Necromancer stress test. Cross-checked every new table entry
  (`JOB_COLORS`/`JOB_BUILD`/`JOB_QUOTES`/`RANGE_CAPS`/`CLASS_ARCHETYPE`/`TOWER_STRATEGY`) is
  actually present, not just planned. `node --check` on the extracted script: clean.

## [1.2.8] - 2026-09-15 — New tower: Cat Snapper — throws temporary companion cats instead of dealing damage directly
A genuinely new tower class, built from an external spec but verified line-by-line against the real
code before anything was written — not trusted as-is. A 4th directly-buildable starter alongside
Swordsman/Archer/Mage, sitting entirely outside the evolution tree: nothing evolves into it, and it
evolves into nothing.
- **`CONFIG.TOWERS.CAT_SNAPPER`** (baseCost 80, unlocked from wave 0): its thrown cat projectile
  doesn't deal impact damage itself — the cat becomes a pooled `CatCompanion` that follows its
  target's *current* x/y every frame and scratches it periodically for a few seconds, then expires.
  Deliberately not a second lane-walking agent — it can't affect pathfinding, collision, breakaway
  logic, or barricade queueing no matter what it does, because it never reads path/waypoint state
  at all, only the target enemy's live position.
- **Archetype-tagged `MAGE`**, not a special case: this alone gives it the same generic INT-scaled
  damage/range/HP formulas every other archetype-driven tower already uses — verified by checking
  every literal `this.type === 'MAGE'` branch in the file (wide damage variance, magic-missile
  visual, burn/freeze/shock procs) and confirming none of them should or do fire for Cat Snapper.
  Its own damage number is the tower's regular `this.damage` — deliberately not a separate
  `catDamage` field, so a cat's scratch damage can never drift out of sync with what the tower's
  own stat display shows.
- **Capped at 2 active cats per Cat Snapper**, checked *before* touching the pool (so a tower
  already at its own limit doesn't needlessly acquire-then-release a slot another Cat Snapper could
  use), plus a global 24-cat hard cap (`MAX_ACTIVE_CATS`) shared across every Cat Snapper on the
  board — pool exhaustion just means that one throw has no further effect, never a crash or
  unbounded growth.
- **`drawCat()`**: a small shared procedural cat silhouette (ellipse/arc/line primitives, no emoji,
  no image asset) used identically by Cat Snapper's own idle/throwing pose and by
  `CatCompanion.draw()` — same renderer, different pose flags (idle bob vs. crouched paw-swipe).
- **Caught and fixed a real pool-reuse bug while wiring this up**: `Projectile`'s new `effectType`
  field (marks a shot as a cat throw vs. a normal hit) has to be reset unconditionally on *every*
  code path that fires a projectile, or a reused pooled `Projectile` could carry a stale `'CAT'`
  value into an unrelated later shot. `fireProjectile()` set it correctly from the start;
  `fireAxeThrow()` (Axeman's separate throw-acquisition path) did not, until this pass.
- Save/load needed zero special-case code — `applyTierStats()`'s `Object.assign(this, tier)`
  already generically picks up the new `catAttackCooldown`/`catLifetime`/`maxActiveCats` tier
  fields, and `restoreGameState()`'s tower-restore loop is fully type-generic. Only real change:
  `catPool` now gets cleared alongside every other transient pool in both `restoreGameState()` and
  `resetGame()` — companions never persist into a save, same as particles or projectiles never do.
- Verified against the REAL extracted `CatCompanion` class and `catPool` (not a reimplementation),
  via an isolated Node harness: the per-tower cap correctly blocks a 3rd cat for the same tower
  while a different tower is unaffected; the global pool never exceeds its 24-slot cap under
  sustained spawning pressure; a cat correctly deactivates once its lifetime expires, having landed
  exactly the expected number of scratches, each one credited to the source tower; a cat whose
  target dies with a live enemy nearby retargets and keeps going; one whose target dies with
  nothing nearby expires cleanly. `node --check` on the extracted script: clean.

## [1.2.7] - 2026-09-15 — Hyper-rare towers capped at one on board; Swordsman/Archer/Mage cost scales with count
Direct request: the deepest evolution in each lineage should be genuinely rare, while the 3 base
classes stay unlimited but progressively more expensive to spam.
- **New `MAX_ONE_PER_BOARD_TYPES` = Paladin, Squirtgun, Sniper, Pope.** These are specifically the
  4 classes that have a real 2nd evolution tier beyond their own base specialization (Hammerman→
  Paladin, Blowdart→Squirtgun, Gatling→Bomber→Gunalinder→Sniper and Marksman→Sniper, Cleric→Pope) —
  Axeman/Spearman/Snapcaster have no deeper tier at all, so they're each already their own
  lineage's endpoint, not part of this "hyper-rare" category. New `isTowerTypeAvailable(type)`
  checks live board state (`towerCountOnBoard()`), not a one-time-ever flag, so selling or losing
  the existing copy opens the slot back up. Enforced at the actual placement handler (with a clear
  "⛔ Only one X at a time" floating-text reason instead of silently doing nothing), the build
  preview's tile-validity check, and the Build-tray row itself (shows "already on the field" and
  can't be tapped while at capacity).
- **New `SCALING_COST_TYPES` = Swordsman, Archer, Mage, with `SCALING_COST_GROWTH` = 1.2.** Stay
  genuinely unlimited in count, but the price of the next one compounds 20% per already-active copy
  of that same type on the board (a 💰50 Swordsman: 50/60/72/86/104/124/... for the 1st through
  6th). New `currentBuildCost(type)` is the single authoritative calculation — `canAffordTower()`,
  the actual gold deduction at placement, and every build-tray cost label all call it, so none of
  them can drift out of sync with each other or with what a player actually gets charged. Returns
  the flat, unchanged `CONFIG.TOWERS[type].baseCost` for every type outside this list (Barricade
  included — separate wood/stone economy, untouched).
- `validateGameDefinitions()` extended to cross-check both new lists against real `CONFIG.TOWERS`
  keys and confirm they're mutually exclusive (a capped-at-one type scaling its own cost by count
  would be contradictory, since it can never exceed 1).
- Verified `currentBuildCost()`'s compounding and `isTowerTypeAvailable()`'s cap/release cycle
  against the real `CONFIG.TOWERS` table and the real constant lists extracted from `index.html`,
  not reimplemented values. `node --check` on the extracted script: clean.

## [1.2.6] - 2026-09-15 — Round-start countdown: "3-2-1-GO" plus a trumpet fanfare, wave now starts 3s later
Direct follow-up to the leaf-gust timing change: since the gust (and camera pan) now both fire
right at round start, giving them a moment to actually land before enemies arrive.
- **New `WAVE_COUNTDOWN_MS` (3000ms) flat delay**, added uniformly to every spawn's already-tuned
  delay in `startNextWave()` — every existing relative-spacing/anti-bunching calculation earlier in
  that function is untouched; this just shifts the whole finished timeline later by a constant.
  Confirmed no other code reads a spawn entry's `.delay` besides that construction logic and the
  single spawn-gating check in `update()`, so nothing else needed to change.
- **New `drawWaveCountdown()`**: a screen-space "3… 2… 1… GO!" overlay with a small pop-and-settle
  scale animation each second, visible only during the countdown window
  (`waveState==='SPAWNING' && waveTimer < WAVE_COUNTDOWN_MS+500`) — reads `waveTimer`/`waveState`,
  never writes them, so it can't affect actual spawn timing regardless of render timing/frame
  drops. "GO!" lands and fades exactly as the first enemy of the wave actually spawns.
- **New `'roundStart'` sound**: a real short-short-short-long bugle-call fanfare (sawtooth voice,
  brassier than the sine-based `'evolution'`/`'hero'`/`'legendary'` unlock-fanfare family, so it
  reads as a distinct "a round is starting" cue rather than one more member of that vocabulary) —
  replaces the plain single-tone `'wave'` sound at this one call site only; `'wave'` itself and its
  7 other existing call sites elsewhere in the file are untouched.
- Verified the countdown's label/scale/alpha sequence against the real constants for the full
  0-3600ms range: correctly steps 3→2→1→GO! on schedule and fades out by 3500ms, exactly as the
  first enemy spawns. `node --check` on the extracted script: clean.

## [1.2.5] - 2026-09-15 — Leaf gust: tied to round start, glyph no longer mixed, brown gated to wave 20+
Follow-up to the 1.2.4 leaf-motion pass, this time about timing and which leaf art gets used, per
direct request.
- **Trigger changed from "once, 20-60s after boot" to every round start.** Removed the
  `nextLeafGustAt`/`scheduleLeafGust()` wall-clock scheduling entirely (dead code once this
  landed) — `spawnLeafGust()` is now called directly from `startNextWave()`, alongside the other
  per-round-start effects already there (camera pan, wave sound). Recurs every wave now, not once
  per game.
- **No more mixing green/brown within one gust.** Previously each of the 3-5 leaves in a gust
  independently rolled between 🍃 and 🍂. Now the whole gust shares a single glyph, decided once
  per gust.
- **Brown leaves gated to wave 20+.** 🍃 (green) through the wave completing the 19th round,
  🍂 (brown) from the wave that starts after the 20th round is cleared onward — gated on
  `wavesCompleted >= 20`, the same "past wave N" convention already used elsewhere in the file
  (e.g. tower unlock gating), not a separately invented threshold check.
- Added a small safety cap (skip spawning if >20 leaves are already in flight) so a pathological
  back-to-back-wave-start case can't accumulate leaf objects without bound — not a normal-play
  concern, a gust's own leaves clear out well within one wave's real duration.
- Verified the wave-gate logic against the real threshold value (0/1/19/20/21/50 all resolve to
  the correct glyph) and confirmed zero remaining references to the removed scheduling functions.
  `node --check` on the extracted script: clean.

## [1.2.4] - 2026-09-15 — Blowing-leaves gust: more natural motion, not just a flat diagonal line
Player feedback on the ambient leaf gust (`scheduleLeafGust()`/`spawnLeafGust()`/
`updateAndDrawBlowingLeaves()`): the motion itself read as flat — a straight-line drift at
constant rotation speed and constant opacity. Cadence/timing (one gust per game, 20-60s in, 3-5
leaves) is unchanged; only how each leaf actually moves and renders.
- **Lateral sway**: each leaf now rides a per-leaf sine-wave flutter (random amplitude 8-22px,
  frequency 0.4-1.0Hz, phase) on top of its existing straight drift, so it visibly sways
  side-to-side as it crosses the screen instead of tracing one flat diagonal.
- **Tumble illusion**: `ctx.scale(scaleX, 1)` pulses between 0.4-1.0, tied to the leaf's own
  rotation at a non-1:1 rate (so it never locks into an obviously mechanical loop) — a flat glyph
  has no real depth to tumble through, so this simulates it flashing edge-on as it spins rather
  than rotating like a flat coin.
- **Edge fade instead of a flat 0.75 alpha for the whole flight**: opacity now scales with
  proximity to the despawn bounds, so a leaf visibly emerges near the screen edge and dissolves
  back out at the other end rather than popping in/out at a constant opacity.
- **Per-leaf size variance** (16-25px, was a flat 20px for every leaf) for a bit of depth.
- Verified with an isolated Node simulation of a full leaf flight against the real formulas: edge
  fade correctly ramps 0→1 near spawn and back to 0 near despawn, sway stays bounded within its
  own amplitude, scaleX stays within [0.4, 1.0] throughout. `node --check` on the extracted script:
  clean.

## [1.2.3] - 2026-09-15 — Finish line rework: flush-to-edge carpet, real full-body crossing, escaped enemies wander instead of vanishing, static map layer no longer upscale-blurred
Player-requested rework of the finish line, in three parts: how it looks, when an enemy actually
counts as having crossed it, and what happens to that enemy afterward.
- **The checkered carpet is now flush with the true outer edge of the final path tile, not
  floating over the tile's center.** The last path waypoint sits at its tile's CENTER (see
  `rebuildPathCellsAndPx()`), and the carpet used to be drawn straddling that center point — never
  actually reaching the tile's real boundary. New shared `computeFinishLine()` (used by both the
  render and the enemy-crossing check below, so they can never drift apart) computes the tile's
  actual exit edge — exactly one half-tile further out from the last waypoint, along the real
  direction of travel there — and the carpet's outer boundary sits exactly on it, extending inward
  by its own thickness rather than overhanging past it. Flags sit at the two corners of that same
  edge line, nudged slightly further out so they read as planted flagpoles rather than floating on
  the checkered pattern; font bumped 22px→26px. Orientation is still fully general (black flag
  always at the further-down/+Y corner, white at the further-up corner), not a hardcoded
  left/right assumption — verified for all 4 cardinal exit directions with an isolated Node
  harness pulling the real `computeFinishLine()` out of `index.html`: the edge point lands exactly
  `TILE_SIZE/2` (32px) beyond the last waypoint in every case, and the black/white corner
  assignment is consistent regardless of which way the spiral path happens to be exiting.
- **An enemy's entire sprite must now actually cross that edge before anything happens — not just
  reach the last waypoint's center.** Previously `reachEnd()` fired the instant
  `waypointsPx[pathIndex+1]` didn't exist, i.e. immediately upon reaching the center of the final
  tile, with no further travel at all. The enemy now keeps walking straight in the same direction
  past that point, and only triggers once its own BACK edge (center minus its radius, projected
  along the direction of travel) has cleared the tile's real boundary — verified with an isolated
  Node simulation stepping a walking enemy frame-by-frame against the real crossing formula: it
  triggers at the exact frame its trailing edge clears the line, not earlier.
- **Reaching the finish line no longer deletes the enemy.** `reachEnd()` still costs a life exactly
  as before (unchanged), but the enemy now sets `escaped=true` and keeps wandering the map
  aimlessly (`updateEscaped()`) instead of deactivating — still a fully live, killable target (same
  generic death/loot/gore handling as any other enemy; `buildEnemyHash()`/`queryNearby()` already
  gate purely on `active`, not path state, so towers auto-target it with no changes needed there).
  Gives the between-waves lull something to do beyond watching the timer, per the original request
  ("even in the after wave section there might be stuff to do... not just taking life"). Escaped
  enemies are explicitly excluded from `updateBarricadesAndPileup()`, `checkStallWatchdog()`, and —
  critically — the wave-completion `anyAlive` check, so a wave can still end normally with
  wanderers left on screen; without that last exclusion, one escaped enemy would have permanently
  blocked every subsequent wave from ever completing. They're cleared out (no further life/gold
  penalty either way) at the top of `startNextWave()`, bounding how long any of them stick around
  and preventing unbounded accumulation across a long infinite-wave run. All new/changed
  pool-reuse fields (`escaped`, `wanderVx/Vy`, `wanderRepickTimer`) reset explicitly in `spawn()`.
- **Fixed the actual root cause of the reported carpet/flag pixelation: the static map layer baked
  at a flat 1x raster and got stretched to fill a high-DPI screen.** `mapCanvas` (checkerboard,
  flora, and the finish line itself — the whole static layer, pre-baked once and blitted every
  frame) was sized at exactly `WORLD_MAX_W × WORLD_MAX_H` regardless of the display's actual
  device-pixel ratio, while the main visible canvas already correctly scales by `dprValue` (up to
  2x). Blitting a 1x source into a 2x-scaled destination context meant the browser had to upscale
  it, blurring every fine detail baked into that layer — the finish line's small checkered squares
  and flag glyphs most visibly, since they're the smallest/highest-detail elements on it, but not
  actually specific to them. `mapCanvas` now bakes at `WORLD_MAX_W/H × dprValue`
  (`resizeMapCanvasForDpr()`), `rebakeMap()` scales its drawing context by the same `dprValue` so
  `drawMap()` itself stays entirely in world-pixel coordinates unchanged, and the blit call now
  passes explicit `WORLD_MAX_W, WORLD_MAX_H` destination dimensions (required once the source
  raster is larger than those — otherwise `drawImage` would render the whole map `dprValue`×
  oversized). Re-bakes automatically if `dprValue` ever changes after boot (graphics-quality
  toggle, or a rare cross-monitor DPI change) via a `mapCanvasReady` guard flag in `setupCanvas()`
  — needed because `mapCanvas` itself is declared later, in BOOT, and referencing it from
  `setupCanvas()`'s very first (pre-BOOT) call would otherwise throw.
- `node --check` on the full extracted script after every batch of changes in this pass: clean.

## [1.2.2] - 2026-09-15 — Save-load stabilization pass: closed the remaining `validateSaveShape()` gap
Triage pass against a P0-ordered checklist (persistence/state-corruption first, per project
convention). Inspected `serializeGameState()`, `restoreGameState()`, `validateSaveShape()`,
`resetGame()`, pooled-object/delayed-callback lifecycles, and projectile hit/miss/wave-generation
invariants. Found and fixed one real, verified issue; everything else in the checklist came back
clean on inspection (see REMAINING-equivalent notes below) and was left untouched.
- **`validateSaveShape()` didn't validate `state.towers`/`state.scenery`, so a malformed-but-JSON-
  parseable save could still crash deep inside `restoreGameState()` — after its destructive clear
  of every live pool had already run.** This was explicitly flagged as a known gap when
  `validateSaveShape()` was first added in 1.1.72 ("Not exhaustive validation of every nested
  field"). Two concrete repro paths, both verified against the real `CONFIG.TOWERS` table via an
  isolated Node harness (not simulated/guessed): (1) `state.towers` present but not an array — the
  `for(const td of state.towers)` loop in `restoreGameState()` throws immediately; (2) a tower
  entry with a `type` that isn't a real `CONFIG.TOWERS` key — `t.create()` dereferences
  `CONFIG.TOWERS[type].baseCost` unguarded and throws. In both cases the exception is swallowed by
  `loadSaveFileText()`'s try/catch, which reports "⚠️ Could not read that save file" — reading as
  "nothing happened," when the live in-progress session (enemyPool/towerPool/projectilePool/
  sceneryMap, all cleared in `restoreGameState()`'s first lines) was actually already destroyed
  with no way back. `validateSaveShape()` now additionally rejects: `state.towers` present and not
  an array; any tower entry that isn't an object, has a non-string/unrecognized `type`, or has
  non-numeric `gridX`/`gridY`; and `state.scenery` present and not an array. Verified with an
  isolated Node harness that extracts the real `CONFIG.TOWERS` table and the real
  `validateSaveShape()` function from `index.html` (not a reimplementation) and runs 6 cases
  (4 malformed, 1 valid, 1 the original reproduced crash shape) — all now resolve correctly; the
  valid-save case still passes. `node --check` on the full extracted script: clean.
- **Everything else inspected in this pass came back clean, no changes made:**
  pooled-object/delayed-callback safety (only 7 `setTimeout()` call sites total, all DOM-toast
  cosmetic — no pooled entity, target, or gameplay timer uses `setTimeout()`; audio scheduling
  already uses Web Audio's own `currentTime`-based scheduling, not JS timers); `resetGame()`
  producing fresh-launch-equivalent state; save/load of items, attunement, legendary status, and
  stat fields (all correctly derived at load time before `recomputeStats()` runs, per the existing
  `baseShieldPct`/`legendaryHpMult` pattern); wave-generation emptiness/stuck-queue guards; and the
  projectile hit/miss/double-damage invariant (pre-roll architecture already shipped and isolated-
  Node-tested in 1.1.52).

## [1.2.1] - 2026-09-14 — One more real audio fix, plus a BACKLOG staleness sweep
- **`tone()`/`noise()` now correctly skip real Web Audio node creation while muted.** `duck()`
  already had this guard; the actual node-creating primitives didn't. Every sound call — muted or
  not — was building real oscillator/gain/filter nodes and consuming a voice-budget slot for
  something nobody could hear. Added the identical guard `duck()` already used, before
  `reserveVoiceSlot()` too so a muted sound doesn't take a slot an audible one could have used.
  Verified with an isolated test: unmuted calls create real nodes, muted calls create none, and
  unmuting resumes normal behavior correctly.
- **Swept `BACKLOG.md` for entries the no-transform redesign made stale, not just added new ones.**
  Found one real case: a design concern (from the original external review) that specialization
  and deeper-evolution thresholds could overlap, making an intermediate class "a very brief stage."
  That only made sense when a tower's accumulated stats carried straight through a literal
  transformation — now that a tower never transforms, a freshly-unlocked class starts at 0 stats
  and has to independently earn its own way toward the next threshold, so the scenario this was
  warning about no longer exists. Marked resolved-by-redesign rather than left to describe a
  problem the current architecture can't actually produce.
- Full sweep of the in-game help modal and README for any remaining stale references (old evolution
  thresholds, orphaned-class language) — both came back clean; nothing left to fix there.

## [1.2.0] - 2026-09-14 — Milestone: full documentation consistency pass for the unlock system
Requested as a full expert review before calling the no-transform unlock system "the new normal"
rather than a recent change still settling in. Bumped to 1.2.0 to mark it as the current stable
baseline, not a routine patch. Every fix below came from actually re-reading `AGENTS.md` end to
end looking for drift, not assuming the earlier passes caught everything.

- **`AGENTS.md`'s Architecture overview — the single most load-bearing technical paragraph in the
  whole file — completely rewritten.** It still described the OLD transform-based system in detail
  (towers "evolve into" their specialization) as if it were current. Now states the permanent
  design plainly up front: a tower never transforms, `evolveInto()` is dead code, every unlock
  (base-class specialization or deep-tier) goes through `unlockTowerTypeBuild()`. Added the
  previously-undocumented facts that all 14 evolved classes now trace to a real unlock (Bomber/
  Gunalinder's gap closed via `EVOLUTIONS.GATLING`) and that the exact unlock source is
  *deliberately* never shown to players (`TOWER_UNLOCK_RIDDLE`) — with an explicit instruction not
  to "fix" the in-game UI to match this file's own precision, since that would undo the intended
  mystery. Cross-referenced against `README.md`'s matching callout so both files agree on *why*
  they differ from the game itself, not just that they do.
- **Found and fixed three more smaller drift spots in `AGENTS.md`** while doing the full read: the
  tower lifecycle example still listed `evolveInto()` as a real step (`create() → evolveInto() →
  upgrade()`); the appearance-rerolling note still said traits re-roll at `evolveInto()`; and the
  `baseShieldPct`/Hammerman-armor note still described a historical bug tied to `evolveInto()` not
  setting a field, presented as a live concern rather than moot code that no longer runs.
- **Caught something the doc read actually turned up in the real code, not just in the docs**: the
  `'evolution'` sound — deliberately built as the game's biggest fanfare, bigger than `levelup` or
  `wave` — only ever played from inside `evolveInto()`. Since nothing calls that anymore, the
  fanfare has been completely unreachable since the no-transform redesign shipped, with no
  replacement. Reconnected it to `showUnlockToast()`, the event that actually replaced the old
  transform moment — arguably deserves the fanfare more now, since an unlock is permanent for the
  rest of the game rather than a one-off. Fixed the stale in-code comment on the sound preset
  itself too ("a tower transforming into a new class" → accurate description of what fires it now).
- Confirmed `isImportantAudioEvent()`'s `evolution` classification and the shared A-root motif
  family (`evolution`/`hero`/`legendary`) are both unaffected — those describe the sound's own
  musical/priority properties, not when it fires, and needed no changes.
- Full syntax check after every batch of changes in this pass, all clean.

## [1.1.83] - 2026-09-14 — Pan/pinch pause-redraw gap closed, design principles committed to memory
Checked context for anything asked but never finished, rather than assuming everything was done.
Found two real loose ends and closed both.

- **Pan/pinch camera gestures now redraw immediately while paused**, matching the wheel-zoom fix
  from an earlier pass. That fix was explicitly noted at the time as "pan/pinch likely have the
  same gap but weren't touched" — confirmed true by reading the actual pointermove handler: both
  the pinch-zoom branch and the single-finger pan branch updated `camera.zoom`/`camera.x`/`camera.y`
  with no redraw while paused, so the camera would silently accumulate a pan/zoom offscreen and
  visibly jump all at once on unpause. Same one-line, already-proven fix
  (`if(gameState !== 'PLAYING') render(ctx);`) added to both branches — `render()` is a pure
  drawing function with no simulation side effects, so calling it directly outside the main loop
  is safe, exactly as already established for the wheel case.
- **Committed the design-book principles to persistent memory** — asked for several turns ago,
  never actually done (checked memory directly rather than assuming). Wrote
  `/topics/design-principles.md`: a distilled reference covering Texture, Typography, Layout/
  Emphasis (Placement, Continuance, Isolation, Contrast, Proportion), Color, and Imagery, each
  tied to where it's already been applied in this project (or explicitly not, with the reasoning
  why) — so future design work can reference this instead of re-skimming the PDF, and so
  already-settled judgment calls (Balance needs a real screenshot to evaluate, small UI elements
  are correctly left flat, this environment can't visually confirm gradients) aren't re-litigated.
- Everything else checked and confirmed still accurate: all 20 findings from the original external
  code review are done (per `BACKLOG.md`'s own summary, verified present); the no-transform unlock
  redesign and full 14/14 unlock coverage from the last two versions are intact; the Phase 2
  dual-element combination system (Steam, Blow Gunner) remains deliberately unimplemented and
  documented, not forgotten; the first-hit hitch and the reported "enemy jumping ahead" both remain
  correctly blocked on profiling/repro information this environment can't supply on its own.

## [1.1.82] - 2026-09-14 — Full unlock coverage + mysterious in-game reveal
Two explicit requests: (1) make sure every buildable evolved tower actually traces to a real
unlock, no exceptions, and (2) stop telling players exactly which stat/element unlocks what —
make it something to discover, not read off a label.

- **Closed the last real coverage gap.** Bomber and Gunalinder were the only two evolved classes
  with no reachable unlock path (documented, not hidden, in earlier passes) — nothing unlocked
  Bomber itself, so nothing could grind toward Gunalinder either. Added `EVOLUTIONS.GATLING`
  (`str: 40 → BOMBER`), the exact "Gatling → Bomber" deep tier this project's own design notes had
  called out as the eventual intent but deferred pending a real threshold decision. Reused the same
  `threshold: 40` convention every sibling deep-tier unlock already uses (Hammerman→Paladin,
  Blowdart→Squirtgun) rather than inventing an arbitrary new number. This makes Gunalinder reachable
  transitively too, once Bomber is built and grinds its own existing int:40 path. **All 14 evolved
  tower types now trace to a real, reachable unlock — verified directly against
  `EVOLVED_TOWER_TYPES`, not assumed.**
- **Made the unlock system genuinely mysterious in-game, on purpose.** The Build menu's locked rows
  used to say exactly "Reach ❄️ Ice on a Swordsman (INT 500) to unlock" — replaced with unique,
  thematic riddles per class (`TOWER_UNLOCK_RIDDLE`) that hint at the stat (raw power / swiftness /
  a sharp mind) and the element's feel (ignite / crackle / frost) without literally naming the
  source class, the stat, or the threshold number. The tower's own icon and name stay visible (so
  there's still a specific, known goal), only the *how* is now something to notice or puzzle out.
  Rewrote the in-game help modal the same way — it used to include the full exact evolution-tree
  table; now it explains the general shape of the system (grow stats, unlock better towers,
  original tower keeps its identity) without spelling out the per-class mapping.
- **README kept exactly precise on purpose, with a note explaining why that's correct.** README is
  a technical/developer reference, not player-facing UI, so it's appropriate for it to document the
  real mechanics exactly — added an explicit callout at the top of the Towers & evolutions section
  so a future editor understands the in-game UI is *supposed* to differ from this document, rather
  than "fixing" the Build menu to match the docs and accidentally undoing the mystery. Also added
  proper table rows for Bomber/Gunalinder (previously described as orphaned) and corrected the
  stale claim that they were unreachable.
- **Fixed a real bug caught by the syntax check, not shipped blind**: one riddle
  ("Deep obsession with one's own craft...") used a plain apostrophe that terminated its string
  literal early, breaking the whole script. Fixed with the same `\u2019` curly-apostrophe
  convention already used correctly in every other riddle with a possessive — caught before
  delivery, not after.
- Corrected the now-stale "Bomber/Gunalinder orphaned" note in `BACKLOG.md` (accurate when
  written, superseded by this pass) rather than leaving it to contradict the current code.
- Verified with isolated tests: all 14 evolved types now have a traceable unlock path (up from 12);
  Bomber's real source is confirmed as Gatling+STR, Gunalinder's as Bomber+INT (transitively
  reachable); and every one of the 14 unlockable types has its own riddle in the actual shipped
  file (checked the real dictionary's keys directly, not a mirror) — no silent fallback needed.

## [1.1.81] - 2026-09-14 — No-transform unlock redesign, implemented and verified end-to-end
- **Explicit clarification acted on directly**: a tower must never change its own type, ever —
  reaching a threshold only unlocks the *next* tier as a separately buildable tower, at every tier,
  not just the base-class specializations. Reworked `checkEvolution()` and
  `checkAttunementAndSpecialization()` so neither calls `evolveInto()` anymore; both now call
  `unlockTowerTypeBuild()` (renamed from `unlockSpecializationBuild()`, generalized scope) instead.
  `evolveInto()` itself is left defined but explicitly marked unused, rather than deleted outright.
- **Generalized the unlock-tracking system to cover every tier**, not just the 8 first-tier
  specializations from the previous pass. `UNLOCKABLE_TOWER_TYPES` and
  `TOWER_UNLOCK_SOURCE_BY_TARGET` are now derived from *both* `SPECIALIZATIONS` and `EVOLUTIONS`
  (12 total: the original 8 plus Paladin/Squirt Gun/Sniper/Pope), each tagged `element` or `stat`
  so the Build menu's locked-row message can describe either kind correctly (e.g. "Reach ❄️ Ice on
  a Swordsman (INT 500)" vs. "Reach INT 40 on a Hammerman"). Bomber and Gunalinder are deliberately
  excluded from the unlockable list — nothing currently unlocks Bomber itself (a known, previously
  documented gap), so nothing can grind it toward Gunalinder either; showing either as a locked row
  promising a reachable unlock would be misleading.
- **Rewrote the in-game help modal and README's evolution section** — both previously said a tower
  "evolves into" or "transforms into" its specialization, which is now simply false. Both now
  explicitly state a tower keeps its own identity forever, with the exact clarifying example
  (grinding a Swordsman unlocks Spearman, the Swordsman stays a Swordsman) used directly in both.
  Updated `BACKLOG.md`'s Phase 2 (dual-element combination) doc for the renamed identifiers and
  confirmed its own design was already written assuming the correct "unlock, don't transform"
  model — it needed no conceptual changes, just the rename.
- Verified with 11 isolated assertions covering the actual redesigned logic: the derived unlock
  list contains exactly 12 types with Bomber/Gunalinder correctly excluded; the exact clarifying
  example (a Swordsman reaching 500 INT stays type `'SWORDSMAN'` while unlocking Spearman); the
  same non-transformation confirmed for two deep-tier cases (a Blowdart reaching its own DEX
  threshold, a Marksman reaching its own INT threshold); and an unlock firing exactly once even
  when two different towers independently reach the same threshold.

## [1.1.80] - 2026-09-14 — Camera pan to spawn, finish-line carpet, selection arrow, two visual cleanups
- **Confirmed the no-transform unlock redesign from last turn is complete and correct**, including
  Cleric→Pope specifically (the exact case raised): `checkEvolution()` already routes every
  flat-`EVOLUTIONS`-table case, Cleric's deep-tier unlock included, through `unlockTowerTypeBuild()`
  rather than transforming the tower — verified by re-reading the actual current code, not assumed.
- **Removed the serum-separation ring effect on blood decals** per direct feedback — a pale
  yellow/tan stroked halo drawn around blood pool blobs during early clotting, which read as an
  unwanted white ring. Removed the whole block cleanly.
- **Removed the persistent gold ring around BIG-variant enemies** per direct feedback. The actual
  BIG mechanic (bigger size, more HP) and its spawn-time "BIG!" floating text are both untouched —
  only the decorative ring that stayed around it for the enemy's whole lifetime is gone.
- **New: camera pans to the wave's spawn point when a wave starts**, the same eased pan/zoom curve
  already used when selecting a tower, but built as a fully separate, independent mechanism rather
  than touching the existing (already carefully-tuned) tower-follow code at all. Mutually exclusive
  with tower-follow — whichever the player's attention is on wins, they never fight over the
  camera in the same frame. Reads the actual last-known path endpoint (`waypointsPx[0]`), not a
  fixed guess.
- **New: animated pointer above the currently selected tower** — a smooth bobbing 👇, distinct
  bob cadence from the existing ground-item bob so the two never look like the same animation,
  soft glow gated behind Low graphics matching every other glow effect in this file.
- **New: a checkered finish-line carpet across the actual end of the path**, black flag 🏴 at the
  lower end, white flag 🏳️ at the upper end. Orientation is derived from the real last two path
  waypoints (perpendicular to the direction of travel there), not a fixed horizontal/vertical
  assumption — the spiral path can end pointing any direction. Baked into the existing static map
  cache alongside the dirt texture and flora, so this is a one-time cost on map generation/
  expansion, not a per-frame draw. Verified the lower/upper flag assignment with an isolated test
  across straight, vertical, and diagonal path-end directions, plus the degenerate zero-length-
  segment edge case (confirmed no NaN/crash).
- **Investigated, deliberately did not change**: the reported "enemies stick, want a strict preset
  path" concern. Confirmed by reading `getPositionAtTraveled()` that movement already follows a
  fixed precomputed path polyline, not free-roaming pathfinding — that part already matches what
  was asked for. The visible "sticking" is the local separation system at chokepoints doing
  necessary work (preventing enemies from perfectly overlapping), and that system's own code
  already documents an extensive history of prior tuning for exactly this symptom. Didn't touch it
  further without being able to visually verify the result — logged in `BACKLOG.md` with the
  reasoning so a future pass with real visual verification doesn't have to re-derive it.
- Verified: full-file syntax check after every change this turn, plus isolated logic tests for the
  finish-line flag geometry (5 assertions, including the degenerate edge case).

## [1.1.79] - 2026-09-14 — New system: specializations unlock permanently, buildable from then on
Implemented the core of the requested unlock system — reusing the existing attunement/
specialization system as the trigger rather than replacing it, since it already does exactly what
was being described ("getting an ice Swordsman unlocks the Spearman" is precisely how
`SPECIALIZATIONS.SWORDSMAN.ICE = 'SPEARMAN'` already works, just not previously exposed as a
Build-menu unlock). The dual-element combination system (Steam, a new "Blow Gunner" class) is
deliberately NOT implemented here — see below and `BACKLOG.md`.

- **Every specialization class permanently unlocks as directly Build-menu-buildable the first
  time any tower actually reaches it.** New `unlockedSpecializations` (a `Set`, persists across
  save/load, resets on a new game — same precedent as the existing wave-gated starter unlocks) and
  `unlockSpecializationBuild()`, hooked into `checkAttunementAndSpecialization()` right where a
  specialization already fires. Reuses the existing `showUnlockToast()` mechanism, so this reads
  as the same kind of "🎉 New tower unlocked" notification the game already gives for wave-gated
  starters, not a new, separate notification style.
- **Build menu now shows all 8 specialization classes** (Hammerman, Axeman, Spearman, Gatling,
  Blowdart, Marksman, Snap Caster, Cleric) as rows, extending the *exact* locked/unlocked row
  system the Build menu already had for wave-gated starters (grayed styling, 🔒 message, a `?`
  help-toggle button) rather than building new UI from scratch. A locked row explains precisely
  what to do: e.g. "🔒 Reach ❄️ Ice on a Swordsman (INT 500) to unlock." Once unlocked, a
  specialization is placeable directly like any starter tower, buying at tier 1 for its existing
  `baseCost` — confirmed the placement/affordability pipeline is fully generic and never actually
  restricted to `STARTER_TOWER_TYPES`, so no changes were needed there at all.
- `UNLOCKABLE_SPECIALIZATION_TYPES` and `SPECIALIZATION_SOURCE_BY_TARGET` (the reverse lookup used
  to build each locked row's message) are both derived programmatically from `SPECIALIZATIONS`
  itself, not a separately maintained list — a future specialization is automatically covered.
- Also updated the in-game help modal and README to explain the new unlock mechanic, with the
  exact example from the request (Ice Swordsman → Spearman) used as the worked example in both.
- Verified with 10 isolated assertions: the derived type list contains exactly the right 8 classes;
  the reverse lookup correctly maps the exact example given (Spearman ← Swordsman+Ice) and a second
  one (Blowdart ← Archer+Electric); an unlock toast fires exactly once even if a second tower
  reaches the same specialization later; two different specializations unlock independently with
  their own toasts; a save/restore round-trip preserves unlocks correctly; and a save from before
  this feature existed restores to an empty (not crashing, not retroactively-unlocked) state.
- **Deliberately not implemented**: the dual-element combination system (Fire+Ice→Steam, unlocking
  a new "Blow Gunner" class on an Archer reaching it). Fully specified in `BACKLOG.md` as Phase 2,
  including the open design questions that need answering first (what actually triggers a hybrid,
  whether it replaces or sits alongside single-element specialization) and the full "new class"
  checklist it would need — the same one Marksman got, not a stub. Doing this alongside Phase 1 in
  one pass risked shipping an untested brand-new tower class; Phase 1's infrastructure
  (`unlockedSpecializations`, `showUnlockToast()`, the Build-menu row pattern) is designed to be
  directly reusable once Phase 2 is actually scoped.

## [1.1.78] - 2026-09-14 — XP decoupled from Promote/wave-survival, ambient leaf gust, doc fixes
- **EXP now comes only from kills.** Removed two XP grants that contradicted the intended design:
  Promote (gold-tier upgrade) no longer grants XP directly, and every active tower no longer gets
  passive XP just for surviving a wave regardless of whether it landed a hit. Leveling — and the
  one stat point each level grants — now reflects active combat performance specifically, not gold
  spent or time survived. A tower that never lands a kill stays at level 1; this is intentional.
  Confirmed Cleric/Pope's curse-tick kills still route through the same `die()` → `creditKill()`
  path as every other kill type, so they're not accidentally excluded from the only XP source left.
  Promote's own separate random-stat-roll-on-upgrade mechanic is untouched — that's a distinct
  "gear training" layer, not XP.
- **Fixed the awkward static leaf on the ground.** `🍃` (leaf fluttering in wind) was in the
  static ground-flora pool, randomly rotated and sitting still — its own artwork implies motion,
  which is exactly why a stationary rotated copy read as visually wrong. Removed from static flora
  (`CONFIG.FLORA.COMMON`); `🍂` (fallen leaf, correctly implies "already on the ground") stays.
- **New ambient leaf gust.** A one-time gust of 3-5 leaves drifts across the screen 20-60s after a
  game starts (new game, restart, or load — not on unpause), purely decorative, no gameplay effect.
  This is the natural home for the fluttering-leaf glyph removed from static flora above, rather
  than a separate bolt-on. Verified with isolated tests: scheduled delay always falls in the
  20-60s window, spawn count is always 3-5 and actually varies, every leaf starts off-screen on
  one side, and a leaf that drifts past the far edge gets cleaned up correctly.
- **STR/DEX/INT buttons sized down** slightly from the standard 40px panel-button height per
  feedback that they were reading as oversized in the tight stats row.
- **Logged, not guess-fixed**: an enemy reported jumping ahead on the path for no apparent reason.
  No repro details (enemy type, what else was happening) to narrow down which of several systems
  (pack speed bonus, swept collision push, barricade queue snap, a slow/freeze wearing off) could
  plausibly look like a "jump" from a glance — added to `BACKLOG.md` rather than touched blind.
- **Doc accuracy pass while updating README for the XP change**: caught and fixed two genuinely
  stale numbers in `AGENTS.md` an external review had correctly flagged — the miss-chance
  baselines and lead-prediction cap were both still describing an old formula/value, several
  versions out of date. Also fixed a real mismatch between the Build help text ("free expansion
  every 3 waves") and what the code actually implements (every 4 waves, confirmed at the actual
  `wavesCompleted % 4 === 0` check).
- **Re-verified the bone depth-sort fix (1.1.60) is still correctly in place and architecturally
  complete** — confirmed bones only ever render through one path (the fixed
  `drawDepthSortedLayer()`, with its tie-break epsilon), and the general decal loop explicitly
  excludes them, so there's no second/bypassing draw call. If bones are still rendering above
  enemies on the live site, the most likely explanation is the deployed copy predates 1.1.60 —
  that fix only takes effect once this file is actually uploaded to the live repo.

## [1.1.77] - 2026-09-13 — Actual gameplay visuals this time: dirt path texture
Shifted from menus/UI to the gameplay canvas itself, per a direct request. Checked several
candidates before picking where to actually spend the change.

- **The dirt path — the single largest, flattest surface in the entire game, and the one every
  enemy/tower/particle is seen against — was one flat solid fill plus a faint 6% edge-shading
  overlay.** Added sparse, low-opacity speckle texture (a mix of small darker "packed dirt" and
  lighter "dusty patch" dots per tile, using the Texture chapter's own point-based-texture
  principle) directly grounded in the same reasoning already used for the flora system: enough to
  read as real ground detail from normal viewing distance, restrained enough not to compete with
  blood decals or floating combat text during a fight. Baked once into the existing background
  cache alongside everything else `drawMap()` already does — zero added per-frame cost, this is a
  one-time cost paid only on map generation/expansion, exactly like the rest of that function.
- **Checked, and deliberately left alone**: enemy HP bars are 4-5px tall — a gradient wouldn't
  actually read at that scale, it would just look like noise. Same reasoning as the toggle/disabled
  button states left flat earlier: small at-a-glance meters are a case where flatness is correct,
  not a remaining gap. Didn't force a change onto something that didn't need one.
- Verified: JS syntax unaffected (this touches only the canvas-drawing code inside `drawMap()`, no
  HTML/CSS).

## [1.1.76] - 2026-09-13 — Deeper pass through the design book's remaining chapters
Went back through Layout & Composition and Color specifically (the two chapters not yet drawn
from — Texture and Typography were already used). Verified what the codebase already does well
before looking for gaps, rather than assuming there was more to fix everywhere.

- **What was already fine, checked rather than assumed**: the proximity principle (a heading should
  sit closer to the content it introduces than the content before it) — `#help-modal-inner h3`
  already uses asymmetric margin (`16px 0 6px`, more space above than below), which is the correct
  pattern the book describes, not something needing a fix. The game's warm brown/gold/green palette
  with red/blue used as deliberate contrasting accents is already a reasonably disciplined color
  scheme, not the kind of clashing or arbitrary palette the Color chapter warns against.
- **One real, safe, additive gap found**: gold, lives, wood, and stone counts in the top HUD were
  all styled completely identically — same white color, same weight — despite gold being the
  number a player watches constantly to decide what to build next, and lives being the number that
  ends the game at zero. Applied the same isolation-via-contrast focal-point principle already used
  for the flora feature: `#goldVal` now tints gold, `#livesVal` a warm rose (same family as the
  existing `--danger` red used elsewhere for damage/danger). Wood and stone stay plain white on
  purpose — secondary resources that shouldn't compete for attention with the two that matter most
  turn to turn. Only color/font-weight changed, nothing about size or spacing, so this can't affect
  the tight-fit top bar's width or wrapping at all.
- Deliberately did not add speculative whitespace/padding increases to the modal bodies — several
  of those (Settings, Help) have a fixed `max-height` with internal scrolling, and guessing at
  spacing changes there risks overflow or clipping I have no way to visually verify. Real
  whitespace tuning in those panels is a legitimate next step, just not one to guess at blind.
- Verified: JS syntax unaffected, CSS braces/parens balanced (249/249, 361/361).

## [1.1.75] - 2026-09-13 — Extended the design-book treatment to every other menu/panel
Same two techniques as the start-screen pass (serif headline typography, gradient/depth instead of
flat fills), applied consistently everywhere else the identical flat pattern showed up. Pure CSS —
nothing removed, no HTML/JS touched.

- **Every modal panel** (Build tray, Settings, Help, Barricade help, Specialization choice, Shop —
  6 in total) shared the exact same flat `background:var(--wood)` fill. All now use a consistent
  carved-wood gradient with a subtle inset highlight, via one text substitution applied identically
  everywhere it appeared — same visual language, not six different treatments.
- **Every modal headline** now uses the same serif display face as the start-screen title, added
  via one small grouped CSS rule that doesn't touch any of the existing six h2 rules' own color/
  size/margin declarations at all — purely additive on top of them.
- **The most-seen buttons in the entire game** — Build/Shop/gear (`.hud-action-btn`) and Next Wave
  (`#nextWaveBtn`), visible on literally every frame during gameplay — had the exact same flat
  single-color fill the old Play button had. Same gradient/inset-highlight treatment now. Left the
  toggle/disabled states (`.hud-btn.active`, `#nextWaveBtn:disabled`) flat on purpose — those are
  state indicators where plainness aids at-a-glance reading, not a remaining polish gap.
- **The inspect panel, target frame, unlock toast, wave-summary toast, and move-mode banner** all
  shared one identical flat dark-brown background — the single most common panel color in the whole
  UI. One substitution applied everywhere it appeared, so the tower-selection panel (arguably the
  single most-viewed panel during actual play) gets the same depth treatment as everything else.
- **Specialization-choice cards and shop item cards** got the same subtle gradient instead of a
  flat wood-light fill, for consistency with the panels around them.
- Both modal-close buttons (Help, Barricade help) got the same button gradient as the Play/Next
  Wave/HUD-action buttons — one substitution, since their rules were textually identical.
- Verified after every batch: JS syntax unaffected (CSS-only changes), and CSS brace/paren counts
  balanced at each step (247/247 braces, 359/359 parens) given how many of these were multi-
  occurrence substitutions rather than single hand-edited rules.

## [1.1.74] - 2026-09-13 — Start-screen typography and button depth, grounded in the design book
Purely additive CSS — nothing removed, no HTML structure changes, no JS touched. Grounded in two
specific principles from *The Principles of Beautiful Web Design* (already used earlier this
project for the flora feature): pairing a distinct typeface for headline vs. body text is what
gives a design real hierarchy instead of one flat font doing every job, and a flat single-color
fill with one plain drop-shadow is the book's own example of "pick a few colors and call it a day"
— texture and layered depth are what separate adequate from distinctive.

- **Title now uses a serif display face** (`Georgia, 'Times New Roman', serif` — system fonts only,
  zero-dependency, no external font request) instead of the same Trebuchet MS sans-serif used for
  every button and HUD label in the game. The flat single 2px drop-shadow is now a layered
  carved/wood-burned effect (a dark offset shadow for depth, a warm inner glow, and a thin top
  highlight) instead of one flat offset.
- **Play button, quality-picker buttons, and link buttons** (About/Changelog/etc.) all replaced
  their flat single-color fills with a subtle top-to-bottom gradient plus an inset highlight edge —
  reads as an embossed plaque/carved wood rather than a flat rectangle. Existing hover/selected/
  active states (the quality button's gold selection glow, the link button's hover fill, a new
  press-down state on the Play button) are all preserved or extended, never removed.
- Verified: JS syntax unaffected (this touches only the `<style>` block), and CSS brace count
  balanced before/after (246/246) given several of these were multi-line rule replacements.

## [1.1.73] - 2026-09-13 — Three more from a re-check of the review's smaller "still needs
## validation" list
Went back to the actual PDF rather than relying on memory — found a section (the review's own
"areas still need targeted validation" list from its final round) that had only ever been mentioned
in passing and never actually filed or acted on. Three of its four items turned out fixable.

- **Optimized `diminishingStatValue()`'s constant-rate tail into closed-form arithmetic.** Its
  tier multiplier floors at 0.25 once past 25 points, so every point beyond that was looping
  through a mathematically identical per-chunk calculation instead of one multiplication —
  directly relevant now, since a single stat can realistically reach several hundred points under
  this session's own attunement work (500 for specialization, 750 for Cleric's Pope evolution),
  where the old version would loop 100+ times for a constant result. Verified with an exhaustive
  equivalence test against the original — ~7,200 (points, perPoint) combinations plus the exact
  new threshold values, bit-identical output everywhere. A pure speed win, zero behavior change,
  not a rebalance.
- **Fixed `updateTargetFrame()` not recalculating geometry when a different tower is selected**
  while the frame stays continuously visible throughout (both the old and new tower having an
  active target). `#inspect-panel` has no fixed height — rows are conditionally shown per tower
  type — so two different towers' panels genuinely can differ in size, and the frame's position/
  size (calculated relative to the panel) could go stale across a tower switch that resize/
  visibility-transition checks alone never caught. Now tracks which tower the geometry was last
  calculated for and marks it dirty on a change. Verified: a tower switch triggers a recalc, and
  repeated calls on the same tower still don't (no regression to the existing dirty-flag
  optimization).
- **Fixed camera zoom going invisible while paused.** Confirmed pause sets `gameState =
  'PAUSED'`, and the main loop skips rendering entirely whenever `gameState !== 'PLAYING'` — so
  scrolling to zoom while paused correctly updated `camera.zoom`, but nothing on screen reflected
  it until unpausing, at which point the camera would visibly snap to the new zoom all at once.
  `render()` has no simulation side effects, so the wheel handler now calls it directly, but only
  while actually paused — the normal playing case already gets a fresh frame within ~16ms via the
  main loop regardless. Noted in `BACKLOG.md` that pan/pinch gestures likely share this same gap
  but weren't touched in this pass, rather than leaving that inconsistency undocumented.
- **Left the fourth item (first-hit hitch in `buildEnemyCollisionMask()`) genuinely unfixed** —
  confirmed the mask cache is already correctly lazy and per-type, exactly as it should be; the
  open question is purely whether the first hit against a never-seen enemy type causes a
  measurable hitch, which needs real profiling this environment can't do. Not attempted
  speculatively.
- Filed the review's full "still needs targeted validation" list in `BACKLOG.md` for the first
  time — it had only ever been summarized in a chat reply before, never actually written down.

## [1.1.72] - 2026-09-13 — Final two: this closes out the entire external code review
All 20 findings from the 2026-09-13 external review are now confirmed and fixed (one item was
investigated and deliberately left alone with documented reasoning — the hash rebuilds inside the
enemy-collision relaxation loop, which are genuinely necessary, not redundant — that's the one
exception to "all fixed," not an oversight).

- **Fixed fast-forward continuing to simulate after game-over within the same frame.** The
  accumulator-driven catch-up loop (which can process up to `MAX_TICKS_PER_FRAME=90` ticks in one
  frame at high speed multipliers) only checked `gameState` once, before entering — a game-over
  firing mid-loop (lives hitting 0 partway through a batch of ticks) still let every remaining
  queued tick that frame run full simulation on an already-ended game. Added `gameState ===
  'PLAYING'` directly to the loop's own condition. Verified with 3 assertions: the exact reported
  scenario (game-over on the very first of a queued batch) now stops immediately instead of running
  the rest; the normal (no game-over) case matches an unmodified reference loop exactly, no
  regression; and game-over landing on the very last queued tick still processes all of them
  correctly (the check runs after `update()`, not before, so it can't shave off a legitimate tick).
- **Fixed `restoreGameState()` destructively mutating live session state before validating a
  loaded save.** The function clears all live state (`enemyPool`/`towerPool`/`sceneryMap`) in its
  very first lines, with no validation beforehand — so a malformed-but-parseable save (the review's
  exact reproduction: loading `{}`) corrupted the current run before the resulting crash
  (`Cannot read properties of undefined (reading 'map')`, inside `rebuildPathCellsAndPx()`'s
  `pathWaypointTiles.map(...)`) even revealed the problem, with no way back to the previous
  session. Rather than restructure the whole function (real regression risk on a large, already-
  tested piece of code I have no way to playtest here), added `validateSaveShape()` as a gate in
  `loadSaveFileText()` — checks the specific fields `restoreGameState()` dereferences unguarded
  early on, and rejects the load *before* any mutation begins if the shape looks wrong. Not
  exhaustive validation of every nested field, but closes the reproduced crash and the most common
  real failure mode (a non-save file, or one from an incompatible/corrupted source). Verified with
  9 assertions: the exact `{}` input is rejected, several other malformed shapes are rejected
  (missing/wrong-type `pathWaypointTiles`, missing `activeRegion`, wrong-type `gold`), and — just
  as important — a genuinely valid save shape (including a minimal fresh-game-like one) still
  passes and loads normally.
- `BACKLOG.md`'s two subsection headers ("claimed, not yet re-verified") updated to reflect that
  everything under them is now confirmed and fixed, rather than leaving stale, inaccurate framing
  in place now that the underlying claims have all actually been checked.

## [1.1.71] - 2026-09-13 — Restart residual state: the most severe bug found in this whole triage
- **Fixed a genuine post-restart soft-lock.** `hitStopUntil` gates the *entire* simulation tick in
  the main loop (`if(gameTime < hitStopUntil) return;`), with no safety cap of its own — unlike
  `frameTime` (clamped to 100ms) or the accumulator-driven catch-up loop (capped at
  `MAX_TICKS_PER_FRAME = 90`). `resetGame()` already reset `gameTime` back to 0, but never touched
  `hitStopUntil` — so restarting after *any* Boss kill in the previous session left the new game
  comparing `gameTime=0` against whatever stale (potentially large) value a prior Boss kill had set,
  freezing the entire new game's simulation until `gameTime` caught back up to it. Depending on how
  long the previous session ran, that could be a very long freeze indeed. `hitStopUntil = 0;` now
  sits right next to `gameTime = 0;` in the reset block, where it always should have been.
- **Also cleared three more pieces of genuinely stale session state**: `groundItems` and
  `deathAnims` (leftover entries from the old map/session — `deathAnims` is lower-impact since its
  short fixed duration means it self-expires within a couple of frames regardless, but still real
  residual state), and `accumulator`/`lastTime` (the fixed-tick loop's own time-tracking, already
  reset at other legitimate points elsewhere in this file like pause-resume — just missing from
  `resetGame()` specifically).
- Verified with an isolated test simulating a "dirty" session exactly as described (a long previous
  game, a Boss kill 40ms before the stale `gameTime`, leftover accumulator/ground items/death
  anims): confirms every field resets correctly, confirms the critical freeze check
  (`gameTime < hitStopUntil`) no longer blocks simulation after the fix, and separately confirms
  the *old* behavior really would have frozen the new game — not just a theoretical risk.
- `BACKLOG.md` updated — eighteen of the review's ~20 findings are now confirmed and fixed.

## [1.1.70] - 2026-09-13 — pointercancel committing actions, save/load spec/totalSpent fidelity
- **Fixed `pointercancel` sharing a handler with `pointerup` and being able to commit actions.**
  `onPointerEnd()` had zero check on `e.type` — a browser-interrupted gesture (an incoming
  notification, a system gesture, the pointer leaving the window, a multi-touch conflict) could
  still commit a tap, drop a ground item onto whatever tower/tile happened to be underneath, or
  place a Barricade, none of which the user actually intended. Cancel now only does cleanup
  (release pointer tracking, clear drag state) with zero action committed — a ground item involved
  in a cancelled drag simply stays in `groundItems` untouched, since it was never removed from that
  array in the first place. Verified with 7 assertions: cancelled taps/drags commit nothing, while
  genuine `pointerup` events still work exactly as before (no regression).
- **Fixed two real save/load fidelity bugs.** `restoreGameState()` was setting `t.spec` as a bare
  label (`t.spec = td.spec`), completely bypassing `chooseSpec()`'s actual damage/cooldown/swing-arc
  multipliers — a loaded Two-Hander Swordsman *looked* right (label, rendering) but *fought* like
  an unspecialized one, missing all its real stat changes. Now calls the real `chooseSpec()`
  method, which is itself guarded against double-application. Separately, `totalSpent` (which
  drives sell value) was never persisted in the save payload at all — loading any save reset every
  tower's upgrade-investment tracking back to its base build cost, undercutting sell value for
  anything that had been upgraded. Now persisted, with an explicit safe fallback (the base-cost
  default `create()` already sets) for saves that predate this field. Verified with 9 assertions:
  a loaded Two-Hander now has identical actual damage/cooldown/swing-arc to a live one (confirmed
  the old behavior really was broken, not just theorized); the re-application guard still works;
  a loaded tower's sell value now matches its real investment instead of resetting to base cost;
  and a legacy save with no `totalSpent` field falls back safely with no crash.

## [1.1.69] - 2026-09-13 — Combat UI refresh: two real redundant-work bugs fixed
The last performance item from the external review, and it turned out to be two distinct real
issues rather than one vague "coalesce refreshes" ask.

- **`creditKill()` was refreshing the inspect panel on every kill in the game, from any tower, as
  long as *any* tower was selected.** `updateInspectPanel()` reads the global `selectedTower`
  rather than taking a parameter — so `creditKill()`'s own unconditional call at the end re-rendered
  whichever tower's panel happened to be open, regardless of whether that tower had anything to do
  with the kill that just happened. `gainTowerExp()` (called unconditionally at the top of every
  `creditKill()` invocation) already does the correct `if(selectedTower === tower)` check
  internally, making `creditKill()`'s own call purely redundant whenever it *did* matter, and purely
  wasted DOM work whenever it didn't. Removed from both branches of `creditKill()`; `updateHUD()`
  calls are untouched since `gainTowerExp()` never touches those.
- **`positionZoomControls()` — a `getBoundingClientRect()` layout-forcing read — was called
  unconditionally from every single `updateHUD()` invocation**, which fires on every kill, every
  resource change, constantly during combat. But `#hud-top` uses `flex-wrap:nowrap`, so its actual
  rendered height never changes from any of those events — only from a genuine window resize or
  orientation change (both already have their own dedicated listeners) or the one-time reveal when
  `hud-top` first goes from `display:none` to visible at game start. Moved the call to that one
  specific transition point instead. Worth noting: the function right above this one in
  `updateHUD()` (`fitHudTopToOneLine()`) already had exactly the right instinct, per its own
  existing comment ("guarded internally — only re-measures when gold/lives/wave digit count
  actually changed") — `positionZoomControls()` just never got the same treatment.
- Verified both with isolated tests of the actual logic: a kill from an unrelated tower no longer
  touches the inspect panel at all while a different tower is selected (HUD still refreshes
  correctly, since that's global); a kill from the selected tower refreshes the panel exactly once,
  not twice; a killstreak-milestone kill (a genuinely distinct second XP-gain event, not a
  duplicate) still correctly triggers two refreshes; 50 simulated rapid HUD updates during a kill
  burst now trigger zero `positionZoomControls()` calls (was 50); and the one legitimate reveal
  transition still positions the zoom controls exactly once.
- This closes out the external review's original performance-item list in full. `BACKLOG.md`
  updated — fifteen of the review's ~20 total findings are now confirmed and fixed; the remainder
  are the two correctness bugs not related to lag/efficiency (save/load specialization fidelity,
  `pointercancel` committing taps) and the one performance item deliberately left alone with
  documented reasoning (the 3 hash rebuilds inside the enemy-collision relaxation loop, which are
  genuinely necessary, not redundant).

## [1.1.68] - 2026-09-13 — Viewport culling for enemies/towers, plus an investigated-but-declined item
Focused on efficiency/lag specifically, with an explicit constraint: no feature or gameplay loss.

- **`drawDepthSortedLayer()` now culls offscreen enemies and towers from the draw pass**, extending
  the exact same bounds-check pattern already proven correct for scenery — nothing new invented.
  Uses a wider margin than scenery's own (covers floating text, HP bars, and legendary name labels,
  which can extend further above an enemy/tower than any scenery ever does), and explicitly exempts
  `selectedTower` from culling: confirmed by reading `Tower.draw()` that it's the *only* tower that
  ever draws a range circle (gated behind `if(isSelected)`), which can extend far beyond the
  tower's own body — so it must never be culled regardless of its position relative to the camera.
  Simulation (`update()`) is completely untouched by this; it only skips the `draw()` call for
  something that couldn't have been visible anyway, so nothing about how the game plays changes,
  only how much gets drawn on a large expanded map or a zoomed-in view.
- Verified with an isolated test of the actual cull logic (6 assertions): an onscreen enemy is
  included, a far-offscreen one is excluded, an enemy just past the visible edge but within the
  wider actor margin is still included (confirming labels/HP bars won't clip), a non-selected
  offscreen tower is excluded, an offscreen *selected* tower is still always included regardless of
  position, and inactive entities remain excluded exactly as before regardless of culling.
- **Investigated the "5 spatial-hash builds per tick" finding and deliberately did not touch it.**
  The count is real (`resolveSweptEnemyCollisions()`: 1, `resolveEnemyCollisions()`'s 3-pass
  relaxation loop: 3, final targeting hash: 1), but the 3 builds inside the relaxation loop aren't
  redundant — that loop's own existing comment explains the multi-pass design exists specifically
  so a crowd of enemies can settle within one frame instead of visibly fighting over several, and
  each pass genuinely moves enemies, so the hash is genuinely stale by the next pass. Cutting the
  rebuild count here would risk exactly the "stale hash used across passes that move enemies"
  regression the review itself explicitly warned against, and I have no way to verify jitter/pileup
  behavior under real load in this environment. Documented in `BACKLOG.md` with what a *safe*
  version of this optimization would actually require (reusing bucket-array storage across builds,
  not reducing how many happen), so a future pass with real profiling capability doesn't have to
  re-derive this reasoning from scratch.
- `BACKLOG.md` updated — fourteen of the review's ~20 findings are now confirmed and fixed.

## [1.1.67] - 2026-09-13 — One more simple fix I'd overlooked: scroll-blur Low-graphics gate
Asked directly whether every simple/low-effort item from the review had actually been done — it
hadn't. Checking the full remaining list against what had shipped so far turned up one real miss.

- **Gated the unspent-stat-points scroll icon's blur behind the Low-graphics setting.** Every other
  glow effect in this file (the item-pickup glow a few lines above this exact code, ground items,
  the magic-missile projectile glow) already follows the same `graphicsQuality === 'low' ? 0 : ...`
  pattern — this was the one place it was missing, running unconditionally
  (`ctx.shadowBlur = 8 + pulse*6`) for every tower with unspent stat points, every single frame,
  regardless of the player's graphics setting. Matches the existing convention exactly rather than
  inventing a new one.
- `BACKLOG.md` updated — thirteen of the review's ~20 findings are now confirmed and fixed.

## [1.1.66] - 2026-09-13 — Two low-effort, high-impact performance fixes from the external review
Picked deliberately for effort/impact — both are small, safe, behavior-preserving short-circuits
around wasted work, not structural rewrites.

- **`queryNearby()` now short-circuits entirely when there are no active enemies.** Every idle
  tower calls this every frame regardless of whether there's anything to find — previously it
  always ran the full nested cell-scan (the review measured up to ~169 empty bucket lookups per
  query at a 300px range) and allocated a fresh result array, even against a hash guaranteed to
  have zero entries. Now checks by identity against the existing `EMPTY_ENEMY_HASH` sentinel
  (already used elsewhere to represent "no active enemies this tick") and returns immediately with
  a fresh empty array — skips all the real work, costs one reference comparison. Verified a normal
  (non-empty) hash still finds real entries correctly, and that a plain empty object that *isn't*
  the sentinel still goes through the real scan (so this only fires on the specific known-empty
  case, not any object that happens to have no keys).
- **The barricade/pileup queue-assignment search no longer runs its O(N²) loop when nothing is
  actually blocked.** The loop can only ever succeed by matching an enemy against one that's
  already `pileBlocked` — with zero blocked enemies (the common case: no barricade currently under
  contact), every single iteration was guaranteed to immediately hit the `!ahead.pileBlocked` skip
  and do nothing, for `N*(N-1)/2` iterations (4,950 for the review's 100-enemy example). A single
  `anyBlockedSeed` flag, set alongside the existing pass that already seeds `claimedSlots`, now
  skips the whole assignment loop when nothing is blocked. Verified with an isolated test: exactly
  0 inner-loop iterations for 100 unblocked enemies (was 4,950), and confirmed the loop still runs
  and can still find matches correctly when something genuinely is blocked.
- Neither fix changes any observable behavior in the normal/non-empty case — both are strict
  short-circuits around work that was previously guaranteed to accomplish nothing.
- `BACKLOG.md` updated — twelve of the review's ~20 findings are now confirmed and fixed.

## [1.1.65] - 2026-09-13 — Tenth confirmed bug: evolution retaining old class-specific fields
- **Fixed `splashRadius` surviving Bomber → Gunalinder**, exactly as the review reproduced.
  `applyTierStats()` already explicitly zeroed `burstCount`/`burstDelay` before applying the new
  tier's data (a previous fix for this same pattern), but missed `splashRadius` — Bomber's tiers
  define it (55-78 depending on tier), Gunalinder's don't, and `Object.assign()` only overwrites
  fields present in the new tier's data, leaving the old value in place. A Gunalinder would have
  kept dealing unintended AOE splash damage on every shot, directly contradicting its own blurb
  ("trades splash for precision").
- **Checked every evolution edge systematically, not just the cited example, and found one more
  real leak**: Mage's tiers define `slowFactor`/`slowDuration` in every tier, but neither Cleric's
  nor Pope's do — a Mage evolving into either would leave a stale slow value behind. Lower impact
  than the splash bug (Cleric/Pope's own curse-based attack path never reads these fields, so it's
  dead state rather than an active gameplay effect), but real leftover state with no business
  surviving the evolution regardless.
- **Checked Blowdart → Squirtgun too and confirmed it needs no fix** — both classes define
  `poisonDamage`/`poisonDuration` in every tier, so there's no gap for a stale value to hide in.
- Both new leaks fixed the same way as the existing `burstCount`/`burstDelay` fix: explicitly
  zeroed in `applyTierStats()` before `Object.assign()` applies the destination tier's actual data.
- Verified with an isolated test of the actual fixed logic: confirms Gunalinder no longer retains
  Bomber's splash radius while still correctly getting its own burst fields; confirms Cleric no
  longer retains Mage's slow fields while still correctly getting its own heal/curse fields; and
  confirms evolving in the *other* direction (back into a splash or slow class) still works
  correctly — the zero-first reset doesn't permanently disable these fields for classes that
  actually use them.
- `BACKLOG.md` updated — ten of the review's ~20 findings are now confirmed and fixed.

## [1.1.64] - 2026-09-13 — Ninth confirmed bug: projectile pool exhaustion wasting cooldowns/bursts
The direct sibling of 1.1.63's enemy-spawn-queue fix — same underlying pattern (a pooled-resource
acquisition that can fail, with a caller that didn't check), on the firing side instead of the
spawning side.

- **Fixed all 3 projectile-firing callers unconditionally consuming a cooldown or burst shot even
  when no projectile slot was actually acquired.** `updateArcher()` (bow-draw completion),
  `updateRanged()` (the generic ranged path — Mage, Gatling, Blowdart, etc.), and
  `updateAxeman()`'s ranged-throw mode all called `fireProjectile()`/`fireAxeThrow()` and then
  immediately set `this.cooldownTimer = this.cooldown` (and, for burst weapons,
  `this.burstShotsLeft--`) with no check on success — but both fire functions silently no-op on
  pool exhaustion (`if(!p) return;`, previously with nothing communicated back to the caller). A
  pool-exhausted archer would complete a full draw animation, "fire" nothing, and go on cooldown as
  if it had — silently wasting the attack with no projectile ever appearing. A burst weapon could
  lose individual shots mid-burst the same way, ending early with fewer actual shots than intended.
- `fireProjectile()` and `fireAxeThrow()` now both return `true`/`false` to report whether a
  projectile was actually acquired and launched. All 3 callers now only advance their cooldown/
  burst state on confirmed success — a failed attempt leaves the tower fully drawn (Archer) or off
  cooldown (everything else), retrying automatically next frame once a slot frees up, rather than
  silently eating the attack.
- Verified with an isolated test covering all 3 callers plus the burst-mid-sequence case
  specifically (11 assertions): confirms no cooldown/burst-count is consumed while the pool is
  simulated exhausted, and confirms each caller correctly fires and advances its cooldown/burst
  state once the pool frees up on a later attempt — including a burst weapon correctly resuming
  from its actual remaining shot count rather than restarting or skipping.
- This closes out the review's original combined "pool exhaustion (enemy/projectile)" finding in
  full — both halves (the enemy spawn queue in 1.1.63, the projectile firing cycle here) are now
  fixed. `BACKLOG.md` updated — nine of the review's ~20 findings are now confirmed and fixed.

## [1.1.63] - 2026-09-13 — Eighth confirmed bug: wave-spawn-queue pool exhaustion losing enemies
Prompted by a request to look closely at enemy organization/deployment specifically. Went straight
to the wave-spawn queue and enemy-pool acquisition path.

- **Fixed a real bug where an exhausted enemy pool could silently lose a queued wave spawn
  forever.** `spawnQueue.shift()` removed a due entry from the queue *before* knowing whether
  `spawnEnemy()` actually acquired a slot from the 220-enemy pool — `spawnEnemy()` itself just
  silently returned on failure with no signal to the caller. In a real late-game scenario (a big
  wave, Splitter/Splitmini children, Boss reinforcements, and a barricade backup all sharing the
  same 220-slot pool concurrently), pool exhaustion is plausible, not theoretical — and when it
  happened, that enemy was gone: not spawned, not requeued, just silently missing from the wave.
  `spawnEnemy()` now returns `true`/`false` to report success, and the queue only advances
  (`shift()`) on confirmed success — a failed attempt leaves the entry at the front of the queue
  and `break`s out of the spawn loop entirely for that frame (the pool won't free up mid-frame, so
  continuing to try later-queued entries would either waste cycles or spin without progress),
  retrying automatically once a slot frees up on a later frame.
- **Checked both split-children spawn sites while in this code** — Boss's periodic Grunt spawn and
  Splitter's on-death children both already guard correctly (`if(!child) break/continue`), so this
  was specifically a wave-queue bug, not a pattern repeated elsewhere in enemy spawning.
- Verified with an isolated test of the actual queue-processing logic: confirms nothing spawns and
  the due entry is *not* lost while the pool is simulated full; confirms the exact same entry
  successfully spawns once the pool frees up on a later attempt, with the queue fully draining; and
  confirms the normal (never-exhausted) case behaves identically to before, with no regression.
- Split the review's original combined "pool exhaustion (enemy/projectile)" bullet in `BACKLOG.md`
  — the enemy-spawn-queue half is now fixed, the projectile/firing-cycle half (a burst shot or
  cooldown consumed even when no projectile slot was acquired) is still unverified and unchanged.

## [1.1.62] - 2026-09-13 — Seventh confirmed bug from the external review: pooled enemy state leaks
- **Fixed `packSpeedBonus` and the wet-feet fields never being reset in `Enemy.spawn()`.** The more
  serious of the two: `packSpeedBonus` is only ever recomputed inside `if(this.pack){...}` in
  `update()` — so a non-pack enemy that reuses a pool slot previously occupied by a pack-type enemy
  kept that pack enemy's last speed multiplier *permanently*, since nothing else ever touches this
  field for a non-pack enemy. The movement formula (`effectiveSpeed = this.speed *
  this.slowMultiplier * (this.packSpeedBonus || 1)`) applies it unconditionally regardless of
  whether the enemy is actually a pack member. Also fixed `wetFeetSteps`/`wetFeetStepsMax`/
  `wetFeetSizeBonus`, which `update()` reads unconditionally (`if(e.wetFeetSteps > 0)`) with no
  check on whether *this* enemy actually just stepped in blood — a freshly-spawned enemy reusing a
  slot that last had active wet footprints could immediately show them despite never having
  touched blood. All three now explicitly reset in `spawn()`, matching the pattern used for the
  other status fields there.
- Verified with an isolated test simulating a slot reused across an incompatible enemy-type swap
  (pack enemy → non-pack enemy, wet-footprint enemy → fresh enemy): confirms the stale speed bonus
  and footprint state no longer carry over, confirms the actual movement-formula and footstep-check
  math now produce the correct baseline result for a freshly-reset enemy, and confirms a genuinely
  pack-type enemy still spawns correctly (no false negative introduced by the fix).
- `BACKLOG.md` updated — seven of the review's ~20 findings are now confirmed and fixed. This also
  closes out the "pooled enemies retain previous-occupant state" bullet in full — all three fields
  the review named together (`bleedStackCount`, `wetFeetSteps`, `packSpeedBonus`) are now fixed
  across 1.1.58 and this version.

## [1.1.61] - 2026-09-13 — Sixth confirmed bug from the external review: axe projectile state leak
- **Fixed two real field-leak bugs in `fireAxeThrow()`**, a separate projectile-pool acquisition
  path from `fireProjectile()`'s. Comparing every field the two paths set side-by-side (not just
  re-checking the one the review named) turned up two distinct leaks, not one:
  - `poisonDamage`/`poisonDuration` were never set at all — `fireProjectile()` explicitly zeroes
    them when not applicable, but `fireAxeThrow()` skipped them entirely. A reused pooled
    projectile that last held a poisoned Blowdart shot could leak that poison onto a thrown axe,
    since `onImpact()`'s poison-application check (`if(this.poisonDamage > 0)`) has no per-class
    gating of its own.
  - `isMagicMissile` was also never set — left stale from a reused slot that previously held a Mage
    bolt, a thrown axe would render as a glowing magic missile instead of a spinning axe. Purely
    visual, but a real and noticeable bug.
  Both fixed by adding the missing resets to `fireAxeThrow()`'s existing explicit-zeroing block,
  matching `fireProjectile()`'s pattern exactly. The one remaining field difference between the two
  paths (`spinAngle`, set only by `fireAxeThrow()`) is confirmed harmless — it's only ever read
  when `isAxe` is true, which `fireProjectile()` always sets to `false`, so a stale value there is
  simply never consumed by a non-axe shot.
- Verified with an isolated test simulating a "dirty" pool slot carrying stale poison/magic-missile
  state from a previous shot: confirms both fields reset correctly, confirms the other explicit
  resets are unaffected, and confirms `onImpact()`'s poison-application condition would now
  correctly evaluate false for the fixed axe throw.
- `BACKLOG.md` updated — six of the review's ~20 findings are now confirmed and fixed.

## [1.1.60] - 2026-09-13 — Fixed bones still rendering on top of enemies standing on them
- **The 1.1.54 depth-sort fix for bones had a real bug in the exact case it was meant to fix.**
  `Array.sort` is stable, and debris was pushed into `drawDepthSortedLayer()`'s items array *after*
  enemies/towers — so for an enemy standing precisely on a bone's own tile (the single most common
  case, since that's literally where bones drop), the stable sort kept the enemy earlier in the
  sorted order (drawn first, further back) and the bone later (drawn on top). That's backwards from
  the intended fix, and specifically invisible unless an enemy was actually standing on the exact
  bone tile — which is exactly the "enemies walking beneath the bones" report. My own comment at
  the time claimed this case "naturally" resolved correctly; it was never actually verified and was
  wrong.
- Fixed by giving debris a tiny negative epsilon on its sort position (`d.y - 0.5`) rather than the
  raw `d.y` — far too small to affect ordering at any real depth difference, but enough to reliably
  break exact ties in favor of the enemy standing there instead of the bone underneath it.
- Verified with an isolated test of the actual sort logic: an enemy at the exact same position as a
  bone now draws on top of it; an enemy meaningfully behind or in front of a bone still sorts
  correctly either way (unaffected by the epsilon); and a side-by-side comparison against the old
  (un-epsiloned) version confirms the bug was real, not just theorized — the old logic really did
  draw the bone on top at an exact tie.

## [1.1.59] - 2026-09-13 — New Pope class, Cleric's growing hat, bleed-cooldown fix
- **New `POPE` class** — Cleric's deep-tier AOE evolution, reached at 750 total INT (500 to first
  become Cleric via `SPECIALIZATIONS.MAGE.ICE`, +250 more per this request — a bare 250 would
  already be satisfied the instant Cleric is reached, since `EVOLUTIONS` thresholds check the raw
  cumulative stat, not "since this evolution," so the actual number had to be 750, not 250. Flagging
  this plainly rather than silently picking one). New `updatePopeSmite()`: instead of Cleric's
  single closest-target curse, every enemy within range gets cursed simultaneously in a holy nova,
  same curse-tick/5x-undead-damage mechanics as Cleric, visualized with the existing
  `spawnShockring()` particle effect (no new particle system needed). Registered everywhere a new
  evolved class needs to be: `CONFIG.TOWERS`, `EVOLUTIONS`, `EVOLVED_TOWER_TYPES`,
  `CLASS_ARCHETYPE`, color palette, build scale, job quotes, tower-strategy blurb, `RANGE_CAPS`,
  the once-per-wave heal mechanic (Pope keeps healing, per its blurb), and the HOLY damage-type
  classification. New rendering: a two-armed "blessing" pose and a grand mitre (tall pointed hat
  with back lappets) replacing Cleric's skullcap entirely.
- **Cleric's hat now visibly grows** from the moment it's first reached (500 INT) up to the
  threshold where it evolves into Pope (750 INT) — a small skullcap scaling from 2.5px to 6px,
  telegraphing the coming evolution the whole way there rather than it arriving with no visual
  buildup.
- **Fixed a real bug found while building Pope's rendering**: my draft had a garbled, redundant
  third arm-draw call with nonsense angle math, and used a `-shoulderX` that implied a left/right
  shoulder offset — this codebase's actual convention (confirmed by checking Cleric's own arms) is
  a single central shoulder point at x=0, with both arms distinguished by angle only. Caught before
  shipping, not after.
- **Added a 10s per-enemy cooldown before a new bleed event can trigger.** Previously, any hit
  dealing over 15% of an enemy's max HP retriggered `applyBleed()` immediately, with no cooldown at
  all — a fast-firing tower (Gatling, Blowdart) landing repeated qualifying hits on the same enemy
  could restack bleed several times a second, which is what was actually causing the reported
  visual clutter (repeated floating "BLEEDING" text, drip trails, and stack recalculation), not the
  bleed mechanic itself. New `Enemy.lastBleedTriggerAt` gates the trigger.
- **Caught and fixed a real bug in my own fix while testing it**: initializing the new cooldown
  field to `0` (the "never triggered yet" sentinel) is broken, because `0` is falsy in JavaScript —
  a bare `!this.lastBleedTriggerAt` guard would keep evaluating `true` forever after the very first
  trigger happened to fire at `gameTime` exactly `0` (which is legitimately possible), permanently
  bypassing the cooldown. An isolated test of the exact rapid-refire scenario caught this
  immediately (a "20 rapid hits should produce 1 trigger" case failed against the naive version).
  Fixed by using `-Infinity` as the sentinel instead, which also let the guard simplify to a single
  time comparison with no separate falsy check needed.
- Verified with isolated Node tests: Pope's AOE hits every enemy in range at once (not just the
  closest), applies the undead damage bonus correctly, and correctly no-ops with an empty range or
  while on cooldown (4 assertions). The bleed cooldown was tested against the first-hit case, 20
  rapid re-hits within the window (produces exactly 1 trigger, not 20), the exact 10-second
  boundary in both directions, below-threshold hits never triggering regardless of cooldown, and a
  simulated pool-reuse reset not inheriting a stale cooldown from a previous occupant (8
  assertions, all passing only after the `-Infinity` fix above).
- Updated the in-game help modal's evolution tree and README's towers table to include Pope,
  matching the standard set earlier this session for keeping player-facing docs in sync with new
  classes as they're added, rather than letting them drift stale again.

## [1.1.58] - 2026-09-13 — Three more confirmed bugs from the external review
Continuing the triage from 1.1.57 — three more findings re-verified against this file and fixed,
each with an isolated regression test reproducing the exact reported scenario.

- **Fixed the 4-stack bleed cap not actually capping damage.** `bleedStackCount` was correctly
  capped at 4, but `bleedDamagePerTick` kept accumulating unbounded on every application regardless
  — 6 applications of 10 damage produced a "4 stacks" display while actually dealing 60 damage/tick,
  not 40. Now tracks each stack's own damage-per-tick in an array (`bleedStackDamages`, max 4
  entries, since different arrows can roll different damage — a single "cap using the newest value"
  approach would be wrong), and derives `bleedDamagePerTick` as their sum. A 5th+ application still
  refreshes bleed duration but no longer adds to the damage total. Also fixed a related pooling
  bug found while in this code: `Enemy.spawn()` reset every other bleed field but not
  `bleedStackCount` itself, so a reused pool slot could start "pre-stacked" from whatever its
  previous occupant had. Verified with 10 assertions: the exact 6×10 scenario now caps at 40;
  mixed-strength stacks sum correctly; a 5th application refreshes duration without adding damage;
  and a simulated pool-reuse reset starts genuinely clean.
- **Fixed Barricade-in-inventory corrupting a tower's entire stat calculation.** `BARRICADE_ITEM`
  has no `str`/`dex`/`int` fields, and the item-stat accumulator (`itemStr += it.str` etc.) had no
  guard against `undefined` — `itemArmor` already had one (`it.armor || 0`), just not the other
  three, for no apparent reason. `undefined + number = NaN`, which then poisoned every downstream
  stat (damage, range, cooldown, max HP, miss chance) for the whole tower once a Barricade sat in
  its inventory. Fixed by matching the armor field's existing pattern. Verified: a Barricade alone
  now contributes exactly zero stats instead of NaN; a real item stored alongside a Barricade keeps
  its own stats intact; ordinary multi-item inventories are unaffected.
- **Fixed exactly-coincident enemies never separating.** `resolveEnemyCollisions()`'s divide-by-zero
  guard (`Math.hypot(dx,dy) || 0.0001`) only prevented a crash — when `dx` and `dy` are both
  exactly zero, dividing them by any fallback distance still produces a `(0,0)` push direction, so
  the pair never actually moved apart. Now derives a deterministic direction from the pair's own
  enemy IDs when centers coincide, rather than `Math.random()` — the same coincident pair always
  separates the same way instead of either staying stuck or jittering a different direction every
  frame. Verified: a coincident pair now gets a real non-zero push; the same pair produces an
  identical direction on repeated calls (no jitter); different ID pairs get different directions;
  and the normal (non-coincident) case is completely unaffected.
- Remaining findings from the review are still untouched and still listed in `BACKLOG.md` — this
  pass did not attempt pooled-state leaks beyond bleed, axe/poison inheritance, evolution field
  retention, save/load fidelity, pool exhaustion, input cancellation, or any of the performance
  items (viewport culling, empty-hash queries, UI refresh coalescing, hash-build reuse).

## [1.1.57] - 2026-09-13 — Two confirmed bugs fixed from an external code review
A detailed external review (ChatGPT, reviewing v1.1.56) raised ~20 findings across rendering,
combat, pooling, save/load, and input. Rather than act on all of them at once, each was
re-verified against the actual current file before touching anything — two were confirmed real
and fixed here with an executed regression test; the rest are triaged honestly in `BACKLOG.md`,
distinguishing what's independently verified from what's merely plausible.

- **Fixed a real `ReferenceError` crash in `drawOneDecal()`**, introduced by the previous session's
  "skip color computation for bones" optimization (1.1.55). `r`/`g`/`b` were declared with `let`
  inside the `if(!d.isEmojiDrop && !d.isWorm)` block, but the oxidation-ring/skeletonization effect
  for aged blood pools (~120s+ into a pool's life) reads them from *outside* that block — block-
  scoped `let` doesn't leak past its braces, so any blood pool old enough to reach that code threw
  immediately. Fixed by hoisting the declarations to function scope (assigning, not re-declaring,
  inside the conditional) — the bones/worms optimization itself is untouched. Verified by
  extracting the actual current function and running it against a blood-pool decal at ages 0,
  60000, 120000, 120001, 180000, and 600000ms — all pass now (120001ms threw before the fix).
- **Fixed duplicate death processing when two damage sources kill the same enemy in one tick.**
  `Enemy.die()` had no re-entrancy guard, and the targeting/collision hash is built once per tick
  before towers attack — so a kill earlier in the tick doesn't remove that corpse from the hash
  until the next rebuild. A second hit landing on the same (now-dead) enemy reference would run the
  *entire* death sequence again: bounty awarded twice, kill credited twice, death particles/sound/
  floating text spawned twice. Added `if(!this.active) return;` to the top of both
  `Enemy.applyDamage()` and `Enemy.die()`. Verified with an isolated reproduction of the exact
  scenario (two lethal hits, same tick): bounty and kill-credit now fire exactly once, and a
  separate check confirmed the revive mechanic (which deliberately keeps an enemy `active` through
  its first "death") is unaffected by the new guard.
- Everything else from the review — dead-enemy target selection, pooled-enemy state leaking across
  reuse, axe projectiles inheriting a previous projectile's poison, the bleed-stack damage cap not
  actually capping total damage, barricade-in-inventory producing NaN-adjacent stat corruption,
  coincident-enemy collision never separating, evolution retaining a previous class's fields,
  save/load not fully restoring specialization modifiers, pool-exhaustion silently dropping spawns,
  `pointercancel` still committing a tap, and the reported viewport-culling/empty-hash/UI-refresh
  performance items — has **not** been independently verified against this file yet. Full triage
  with priority is in `BACKLOG.md`. None of it is claimed fixed here.

## [1.1.56] - 2026-09-13 — Front-loaded "RuneScape-style" accuracy curve
- **Replaced the generic diminishing-returns accuracy formula with a purpose-built two-segment
  curve hitting exact requested targets**: 100 effective DEX now misses just 4% of the time
  (safely under the requested 5% ceiling), and 500 effective DEX is a genuinely guaranteed hit
  (0% miss) — a deliberate, explicit design choice that supersedes the previous "never fully
  guaranteed to hit" 2% floor.
- **Front-loaded on purpose, RuneScape-style**: the 0→100 DEX stretch does almost all the work
  (dropping from the archetype's base miss — 30-45% depending on class — all the way down to just
  4%, a huge reduction over a comparatively small investment), while 100→500 DEX (4x the point
  investment) only trims that remaining 4% sliver down to a true 0%. Same shape as RuneScape's XP
  curve, where the early levels are cheap and the last stretch costs disproportionately more for a
  smaller gain — applied here to accuracy-gained-per-DEX-point instead of XP-cost-per-level.
  New `computeMissChance()`, replacing the `diminishingStatValue()`-based calculation (that generic
  helper is still used elsewhere — HP, crit chance — untouched here).
- Archetype baselines (Warrior 30%, Archer 40%, Mage 45% at 0 DEX, from the previous session's
  rebalance) are unchanged and still feed into the new curve as its starting point — only the
  DEX-to-accuracy-reduction shape changed, not the zero-investment baseline.
- Archer's existing 1.6x preferred-stat multiplier on DEX (`PREFERRED_STAT_MULT`) still applies
  before this curve runs, so Archer reaches both milestones (4% miss, 0% miss) at a lower raw DEX
  investment than Warrior/Mage — 62.5 raw DEX for the 4%-miss milestone, exactly the same
  "specialization pays off faster in your preferred stat" pattern already used everywhere else in
  this game's stat system.
- Verified numerically (19 assertions, not by hand): every archetype hits exactly 4% miss at
  dexEff=100 and exactly 0% at dexEff=500 and beyond; dexEff=0 always equals the archetype's base;
  and for every archetype, the accuracy gained across 0-100 DEX is at least 5x larger than the
  accuracy gained across 100-500 DEX, confirming the front-loaded shape actually holds rather than
  just hitting the two named anchor points with an arbitrary curve in between.

## [1.1.55] - 2026-09-13 — Performance: decal-heavy scene lag
Player-reported lag in a scene with heavy accumulated blood/bone debris and several active
enemies at a chokepoint. Two real, measurable per-frame costs found and fixed — both are pure
efficiency changes with no visual or behavioral difference, so nothing here should look any
different, just run lighter in decal-dense areas.

- **Removed per-item closure allocation in `drawDepthSortedLayer()`.** Every scenery piece, enemy,
  tower, and (as of the previous session's bone-depth-sort fix) every visible bone/skull/worm decal
  was allocating a fresh arrow function every single frame just to be sorted once and invoked
  immediately after — in a scene with a lot of accumulated debris, that's potentially hundreds of
  throwaway closures created and garbage-collected 60 times a second for no behavioral benefit.
  Replaced with plain tagged objects (`{sortY, kind, ...}`) dispatched through one `switch` in the
  draw loop — identical sort order, identical visual output, no extra allocation.
- **Skipped the blood color-aging computation entirely for bone/skull/worm decals, which never use
  its result.** `drawOneDecal()` was unconditionally running its full forensic color-aging math
  (branching arithmetic plus a fresh `rgba(...)` string concatenation) for every decal regardless
  of type — but bones are hardcoded to a fixed full opacity and worms shrink instead of fading, so
  neither branch ever reads the `color`/`alpha` this computed. That's real, wasted per-frame work
  on a result nothing consumes, for every bone/skull decal on screen — and a scene that's been
  fighting at one chokepoint for a while can easily have a lot of those, since bone debris has a
  45-minute lifespan by design. Now scoped behind an `if(!d.isEmojiDrop && !d.isWorm)` check.
- Not touched: decal lifespans and the 2000-decal cap are unchanged — those were deliberately tuned
  in an earlier session so blood/bone stains last long enough to feel persistent across a long game
  rather than disappearing early, and changing them wasn't part of what was reported. If a
  chokepoint scene is still heavy after this, lowering `BONE_LIFESPAN`/`DECAL_LIFESPAN` or the
  `MAX_DECALS` cap would be the next lever, but that's a balance/feel trade-off worth a deliberate
  decision, not a silent side effect of a performance pass.

## [1.1.54] - 2026-09-13 — Preload flash, UI polish, bone z-order, arrow homing, accuracy rebalance
Player-reported feedback from a live playtest, addressed in full this pass (a partial version of
this was designed in the previous session but never actually shipped as a file — corrected here).

- **Fixed the preload flash.** `#hud-top` was visible by default in CSS (`display:flex`) and only
  hidden by a JS line that ran at the very end of boot — meaning the browser could paint at least
  one frame with the raw HUD buttons showing before JS had a chance to hide them. `#hud-top` now
  defaults to `display:none` in CSS itself, and the whole `#game-wrapper` (canvas + start-screen +
  hud-top together) fades in from black via a `.loaded` class added after a double
  `requestAnimationFrame` — guaranteeing the browser has actually painted a real frame before the
  fade begins, rather than fading in an unpainted canvas.
- **Removed the dark gradient bar behind the top HUD buttons** (`#hud-top`'s
  `linear-gradient(180deg,rgba(74,47,29,0.92),rgba(74,47,29,0))` background) — buttons now sit
  directly over the canvas with no shadow/backing bar, per feedback.
- **Renamed the gold-tier "Upgrade" button to "Promote"** to avoid confusion with the unrelated
  stat-based evolution system, which already uses "upgrade" as a generic word in its own hint text.
  Also fixed the Promote/Sell button pair from equal-width flex distribution (`flex:1 1 0`, which
  forces both buttons to the same width regardless of content, so a long cost value on one button
  drags the other down too) to content-based sizing (`flex:0 1 auto`) — each button now sizes to
  its own text, while the existing `fitOptRowToOneLine()` row-level scaling (confirmed already
  running on every panel refresh, not just window resize) still guarantees the row never overflows
  regardless of how large the cost number gets. Deliberately did NOT add `text-overflow:ellipsis`
  to these buttons — the codebase's own history shows that was already tried on this exact button
  and reverted because it silently truncated the cost number itself, which is why the row-scaling
  approach exists in the first place.
- **Fixed STR/DEX/INT button sizing** — `#inspStatsRow button.stat-btn` was overriding the panel's
  standard button size (40px min-height, 8px/10px padding, used by every other button in the same
  panel) down to a smaller 36px/6px-9px with no documented reason, making them look subtly
  undersized next to Target/Move/Promote/Sell. Now inherits the standard size like everything else.
- **Fixed bone/skull/worm debris rendering above every enemy on screen regardless of actual depth.**
  This was a deliberate design choice from an earlier session (`drawDebrisDecals()`, a separate
  always-on-top pass) that correctly fixed a real prior bug — debris used to flicker out when an
  enemy walked directly onto its exact tile — but overcorrected into "always above everything,"
  which reads just as wrong when a skull renders in front of an enemy that should visually be in
  front of it. Removed that separate pass entirely and folded debris into the existing
  `drawDepthSortedLayer()` (sorted by its own y-position, the exact same mechanism already proven
  correct for trees) — this fixes both problems at once: an enemy standing exactly on a skull's
  tile still occludes it correctly (matching y, natural sort tie), while an enemy elsewhere on the
  path now sorts correctly relative to it instead of always losing.
- **Arrows no longer visibly curve toward their target like homing missiles.** The intercept
  correction added for the projectile pre-roll architecture (`PROJECTILE_HOMING_MAX_TURN_RATE`)
  was tuned at 7 rad/s, which was clearly visible as arrows bending mid-flight — especially from
  Archer, whose arrows are intentionally slow (320-400px/s) by design, giving the correction a long
  flight time to compound over. Lowered to 1.5 rad/s (a subtle safety net again, not a visible
  flight-path change) and separately sped up Archer's own projectiles to 480-600px/s (up from
  320-400) so shots also simply spend less time in flight for any drift to accumulate over — the
  bow-draw/cooldown cadence that's the tower's actual "slow but powerful" identity is untouched,
  only how fast the arrow travels once loosed.
- **Rebalanced accuracy — misses were essentially unseeable in practice.** The old formula
  (`BASE_MISS_CHANCE_BY_ARCHETYPE` + a 0.007-per-DEX-point diminishing bonus) saturated to the 2%
  floor by roughly 20-30 DEX — trivial to reach through ordinary leveling alone — which is why
  Archers were reported to "never miss." Raised the base miss chances substantially (Warrior
  7%→30%, Archer 14%→40%, Mage 22%→45% at zero DEX) and lowered the per-point rate to 0.0025 so the
  curve actually spans this game's real DEX range under the new attunement system (100 for
  attunement, 500 for specialization) instead of maxing out almost immediately. Verified the
  resulting curve numerically rather than by hand: a zero-DEX Archer now misses 40% of shots, a
  modestly-invested one (100 DEX) still misses ~27%, and only heavy investment (~350+ DEX) brings
  it down near the 2% floor — DEX remains the sole accuracy lever for every archetype, exactly as
  intended, just tuned to actually matter across the stat range that now exists.
- On the reported wave-6 enemy bunching: verified `resolveSweptEnemyCollisions()`,
  `resolveEnemyCollisions()`, and `checkStallWatchdog()` are all still intact and running every
  frame, unchanged by anything in this session. The screenshot's clustering at a Barricade
  chokepoint looks like expected queueing behavior at a bottleneck rather than the pathing bug this
  codebase has iterated on extensively before (see CHANGELOG history) — but this environment has no
  way to actually play the game and reproduce live clustering, so this is a code-level check, not a
  playtest confirmation. Flagging honestly rather than claiming it's fixed or ruled out.

## [1.1.53] - 2026-09-13 — Elemental attunement + evolution overhaul, new Marksman class
- **Replaced the flat `threshold:20` first-tier evolution for the 3 base classes** (Swordsman/
  Archer/Mage) with the two-stage design from the 2026-09-13 external review: whichever stat
  reaches `ATTUNEMENT_THRESHOLD` (100) first permanently locks an element on the tower
  (`ATTUNEMENTS`: STR→Fire/DEX→Electric/INT→Ice) — the lock never changes afterward even if a
  different stat later overtakes it. Reaching `SPECIALIZATION_THRESHOLD` (500) in that *same*
  attuned stat then evolves the tower into `SPECIALIZATIONS[type][element]`, if one is defined.
  New `Tower.checkAttunementAndSpecialization()`, called from `checkEvolution()` only for
  `BASE_ATTUNABLE_TYPES` — every deeper evolution beyond a base class's own specialization
  (Blowdart→Squirt Gun, Hammerman→Paladin, Marksman→Sniper) is unrelated to attunement and keeps
  using the old flat-threshold `EVOLUTIONS` table exactly as before.
- **New `MARKSMAN` class** — Archer's Ice (INT) specialization, replacing the old `int→BOMBER`
  mapping the review specifically flagged as wrong ("INT Archer is the gun-precision path... do NOT
  map INT Archer to Bomber"). Fully defined per the review's own checklist: `CONFIG.TOWERS` stats/
  tiers (a mid-tier precision rifle sitting between base Archer and Sniper), color palette, build
  scale, job quotes, tower-strategy tooltip, `RANGE_CAPS`, `CLASS_ARCHETYPE` (ARCHER, matching
  every other gun/bow evolution), ranged-shot sound (reuses `shot_gunalinder` rather than building
  a whole new audio preset — out of scope for this pass), a full `drawStickman()` rendering branch
  (two-handed medium rifle, visually a stepping stone between Gunalinder's revolver and Sniper's
  long rifle), `EVOLVED_TOWER_TYPES` registration, and its own deeper evolution to Sniper — reusing
  Gunalinder's already-established `int:60` threshold rather than inventing a new one.
- **Save persistence + legacy migration.** `Tower.attunement` is now part of the save payload
  (`serializeGameState()`/`restoreGameState()`). A base-class tower loaded from a save that
  predates this field runs the new `migrateLegacyAttunement()`: a single stat at or above 100
  picks that element; multiple qualifying stats pick the unique highest; an exact tie among
  qualifying stats leaves the tower unattuned rather than guessing. In practice this is a defensive
  safety net, not a fix for something that can currently happen — `checkEvolution()` has always run
  synchronously after every stat change in this codebase (both `allocateStat()` and `upgrade()`'s
  random growth call it), so no still-base-type tower in any real save should ever actually have a
  stat at or above 100 to begin with.
- **`validateGameDefinitions()` extended** to cross-check the new `SPECIALIZATIONS` table (every
  base type is attunable, every element key is real, every target tower exists) — same pattern as
  the existing `EVOLUTIONS` check.
- **Inspect-panel evolution hint rewritten** for the 3 base classes: shows attunement progress
  toward 100 before locking in (when one stat is unambiguously ahead), then specialization progress
  toward 500 after locking in, or a plain "Attuned" label with no further-evolution implication if
  this base/element combination has no specialization defined. Every other tower type keeps the
  unchanged old hint logic.
- **In-game help modal and README rewritten** — both still described the old flat "invest 10+
  points" system (the README table also still listed `int→BOMBER`), and the help modal specifically
  had drifted from the actual code in a second, unrelated way: it said "Blowdart → DEX 25 → Squirt
  Gun" while the code has always used threshold 40. Both now describe the two-stage system
  accurately, include Marksman, include Snap Caster (which existed in code but was never listed in
  either document before this pass), and note that Bomber/Gunalinder remain fully functional for
  existing towers but are no longer reachable via a fresh Archer's evolution.
- **Scope decisions made explicit, not silently glossed over** (see `BACKLOG.md` for the full
  writeup): Mage has no Fire/STR specialization defined (no existing evolution fits, and the review
  says not to fabricate one); Mage's Ice/INT specialization is Cleric, a known imperfect thematic
  fit (holy/anti-undead, not frost) kept only because reassigning Cleric's identity was out of
  scope here; Bomber and Gunalinder are consequently orphaned from fresh evolution paths, though
  fully preserved and functional for any tower that's already one.
- Verified with an isolated Node test of the actual attunement/specialization/migration logic (16
  assertions, since this environment has no live game loop to run the real file end-to-end):
  confirmed the lock fires exactly at 100 and never moves afterward even when other stats
  overtake it; confirmed an unattuned stat crossing 500 does *not* trigger a premature
  specialization; confirmed all 3 Archer branches (Fire→Gatling, Electric→Blowdart, Ice→Marksman)
  fire correctly at 500 in the correct stat; confirmed an attuned base class with no defined
  specialization (Mage/Fire) stays at its base type indefinitely without crashing or fabricating an
  evolution; and confirmed all 4 `migrateLegacyAttunement()` cases (single qualifier, unique
  highest among multiple qualifiers, exact tie → unattuned, nothing qualifies → unattuned).

## [1.1.52] - 2026-09-13 — Projectile hit/miss pre-roll architecture
- **Accuracy is now decided at launch, never at the moment of geometric contact.** Previously
  every single-target shot (Archer, Mage, Axeman's throw, etc.) flew a normal aimed path and only
  rolled `missChance` in `onImpact()` — the instant it geometrically touched the enemy. That meant
  every miss in the game visually looked exactly like a hit (the shot flew straight in and touched
  the target) and only afterward revealed "actually, that didn't count" — the precise "accuracy
  miss whose projectile visually hits" contradiction the PDF review flagged. `fireProjectile()`
  (and `fireAxeThrow()`, a separate acquisition path with its own copy of the same logic) now roll
  `willHit` once, before the shot even leaves the tower.
- **A rolled hit tracks its target and gets subtle continuous intercept correction**
  (`PROJECTILE_HOMING_MAX_TURN_RATE`, 7 rad/s cap) each frame in `Projectile.update()` — enough to
  keep actually connecting with a moving/turning target beyond what the one-time lead-prediction
  computed at launch could guarantee, not fast enough to look like a homing missile. `onImpact()`
  no longer re-rolls accuracy for single-target shots — reaching it at all now means `willHit` was
  already true.
- **A rolled miss is deliberately aimed off-target** at launch (a lateral offset scaled to the
  target's own radius) and flagged `isGuaranteedMiss` — `update()` skips collision resolution
  entirely for that shot, so it can never accidentally land on a *different* enemy standing in its
  path either. The "MISS" floating text and particle now appear at the moment the shot would have
  crossed the target (timed from launch), not immediately.
- **A committed hit whose target dies before the shot arrives cancels cleanly** (`update()` checks
  `trackedTarget.active` every frame) instead of potentially drifting into and hitting a nearby
  enemy it was never rolled against.
- **Splash-radius shots (Bomber) are explicitly untouched** — they're not aimed at one tracked
  enemy's silhouette the way a bolt/arrow/axe is, so `onImpact()` keeps its own independent
  accuracy roll exactly as before, scoped now to the `splashRadius > 0` branch specifically.
- Caught and fixed one real object-pool leak risk while writing this: `fireAxeThrow()` acquires
  from the same `projectilePool` as `fireProjectile()` but is a separate code path — without
  explicitly resetting `trackedTarget`/`isGuaranteedMiss`/`missRevealAt`/`missRevealed` there too,
  a thrown axe reusing a pooled slot could have silently inherited a stale `isGuaranteedMiss=true`
  from whatever that slot last fired (skipping all collision forever) or gone back to never being
  able to miss at all. Both acquisition sites now set every one of these fields unconditionally on
  every fire.
- Verified with an isolated Node test of the actual pre-roll/homing/cancellation logic (faithfully
  reproduced with mocked `spawnFloatingText`/`spawnParticles`/collision-mask dependencies, 2000
  randomized trials per case, since this environment has no live Canvas/game loop to run the real
  file end-to-end): forced-hit shots landed exactly on the intended target with correct damage
  2000/2000; forced-miss shots dealt zero damage and showed MISS 2000/2000; a target dying
  mid-flight canceled the shot cleanly with zero damage 2000/2000; a forced-miss shot never hit a
  bystander enemy sitting directly on the original aim line, 0/2000; and a moving target crossing
  the original aim line was still hit via intercept correction, 2000/2000.

## [1.1.51] - 2026-09-13 — Sparse decorative ground flora
- **Added purely cosmetic ground-cover accents** (`CONFIG.FLORA`, `floraMap`) scattered across
  buildable tiles as the board expands — a small design touch requested against
  *The Principles of Beautiful Web Design*'s color-restraint/focal-point guidance (a very limited,
  consistent base palette; an isolated, high-contrast element is what reads as a focal point, not
  color used liberally). Two tiers:
  - **COMMON** (🌿 herb, 🌱 seedling, 🍀 clover, 🌾 sheaf of rice, 🍃 fluttering leaf, 🍂 fallen leaf)
    — low-key green/brown ground texture, `coverage: 0.09` (9% of buildable non-path tiles).
  - **ACCENT** (🍁 maple leaf, 🍄 mushroom, 🌺 hibiscus, 🌻 sunflower) — saturated color, held to
    `accentShare: 0.12` of *that* 9% (≈1% of all buildable tiles), so color stays genuinely rare
    rather than just "less common," the same isolation-creates-a-focal-point idea applied to a
    tile-based scatter instead of a page layout.
  - Each glyph gets a random rotation, small positional jitter, and 75-125% size variance
    (`spawnFlora()`) so a cluster of the same glyph never reads as a stamped repeating pattern.
- **Purely decorative — no gameplay/economy effect.** Never clearable, never yields wood/stone,
  never occupies a tile (a tower or Barricade can still be built directly on top of one; it's
  background paint, not an obstacle). Not part of the save-file schema at all — regenerated fresh
  for the loaded region on load, same as it is for a new game, since it carries no state worth
  preserving exactly.
- **Follows the exact same "only the new ring" pattern already used for scenery** (matching
  `scatterSceneryInRing()`): `generateFlora()` seeds the whole starting region once; every map
  expansion calls the new `scatterFloraInRing()`, which only ever touches the freshly-revealed
  ring, leaving already-active ground (and anything built on it) untouched — so the board reads as
  an ever-larger, ever-more-detailed world as it grows, not as existing ground re-rolling under the
  player's own towers. Also cleared from any tile the extending path spiral now crosses, mirroring
  the existing scenery cleanup in `performExpansion()`.
- **Baked into the existing static ground layer** (`drawMap()`/`mapCanvas`) rather than drawn
  per-frame in the dynamic depth-sorted entity layer — flora is flat ground texture with no
  occlusion needs, unlike trees/rocks, which stay dynamic specifically so an actor can visibly pass
  in front of or behind one. Zero added per-frame draw cost.
- Verified with an isolated Node logic test of the placement math (no live Canvas needed for this
  part): simulated a 900-tile region, confirmed actual placement count matches the configured
  coverage fraction exactly, confirmed the accent tier landed at ~11% of placed flora (target 12%,
  within one simulation's random variance) rather than leaking into the common tier, and confirmed
  every entry's rotation/offset stayed within its intended range. Real-glyph visual density/spacing
  still benefits from an in-browser look — this environment has no live Canvas to render the actual
  emoji glyphs at actual tile scale.

## [1.1.50] - 2026-09-13 — Pixel-precise enemy hitboxes
- **Projectile hits now require actually crossing the visible emoji, not just its bounding
  circle.** Added a narrow-phase alpha-mask test (`getEnemyCollisionMask()`,
  `segmentHitsEnemyMask()`) layered strictly on top of the existing broad-phase swept-circle check
  in `Projectile.update()` — the old `pointSegmentDist2 <= radius^2` test still runs first and
  unchanged; a hit now also has to cross an opaque pixel of the actual glyph to register. This
  closes the gap the PDF review flagged: `Enemy.draw()` renders each emoji at a font-size of
  exactly `radius*2`, but the collision test was the full bounding circle, so a shot could visibly
  pass through empty padding next to a narrow glyph (a stick-shape enemy, say) and still count as a
  hit.
- **Implementation**: one small 40×40 reference-size mask is rendered per enemy *type* (not per
  instance) using the exact same `font`/`textAlign`/`textBaseline` settings `Enemy.draw()` already
  uses, then its alpha channel is cached (`enemyCollisionMasks`). Test coordinates for any real
  instance are rescaled by that instance's actual `radius` (`mask.size / (e.radius*2)`) before
  sampling, so boss-scaled and size-jittered enemies of the same type still test correctly against
  one shared cached mask rather than needing a mask per exact size. The projectile's full
  this-frame travel segment is sampled (`segmentHitsEnemyMask()`), not just its endpoint, since a
  fast Mage bolt can cross an enemy within a single frame — same swept-collision reasoning the
  broad-phase check already used.
- **Deliberately fails safe in every direction**: if a mask hasn't been built yet, `getImageData()`
  throws (tainted/unsupported canvas), or a coordinate falls outside the cached mask's own bounds,
  every helper returns a result that defers to the *old* radius-only behavior rather than ever
  creating a new miss where the previous code would have hit. This is a pure narrow-phase addition,
  never a replacement — a broken or unavailable mask can only fail open, not closed.
- Verified with an isolated Node test (no live Canvas/DOM available in this environment) against a
  fabricated circular alpha buffer standing in for a real glyph: confirmed a segment through the
  buffer's center hits, a segment offset just outside the fabricated glyph's radius but still
  inside the old bounding circle correctly misses (the exact gap this change closes), a segment
  just inside the glyph radius still hits, a long fast segment sweeping through the shape is still
  caught by the sampling loop, a segment entirely outside the mask's bounds misses, and the
  missing-mask fallback path returns `true` (fail open). Real-glyph visual verification (actual
  emoji shapes vary by platform font) still needs an in-browser pass before shipping to players.

## [1.1.49] - 2026-09-13 — Attract mode rebuilt as a curated arcade vignette
- **Replaced the 3-scene mixed-tower attract mode with a single fixed 3-Archer formation** (top-
  center, lower-left, lower-right, in a shallow arc) per the discussed redesign — no more
  Swordsman/Mage rotating through different lane layouts.
- **Enemies now spawn from randomized points around the full screen perimeter** (`attractSpawnPoint()`
  picks top/bottom/left/right at random, just outside the canvas edge) instead of following one
  fixed hand-authored lane path. Each spawn's travel target is the formation's own center with a
  bounded random jitter (`attractSpawnEnemy()`) — enough variety that enemies don't all converge on
  one pixel, but still clearly reads as "attacking the group" rather than scattering randomly, per
  the "controlled random angles, not true randomness" requirement.
- **Added phase-driven pacing** (`ATTRACT_PHASES`): CALM (sparse spawns, 0-3s) → ACTION (steady
  spawns, 3-9.5s) → INTENSE (fast spawns, higher concurrent cap, 9.5-15s) → AFTERMATH (spawning
  stops, remaining enemies clear, 15-18s) → FADE (18-19s) → loop. One curated ~19s cycle (inside
  the requested 15-25s window) replaces the previous straight loop with no intensity arc.
- Removed the old scene-rotation state (`buildAttractScenes()`, `attractScenes`,
  `attractSceneIndex`, `ATTRACT_SCENE_DURATION`, `attractLanePointAt()`) — verified no other call
  sites referenced any of it before deleting. New state (`ATTRACT_FORMATION`, `attractState`,
  `attractLoopStartTime`, `attractPhaseAt()`, `attractSpawnPoint()`, `attractFormationCenter()`,
  `attractSpawnEnemy()`, `initAttractLoop()`) is fully self-contained, still never touches real
  `enemyPool`/`towerPool`/`projectilePool`.
- Verified with an isolated Node smoke test of the spawn/phase/timing math (no Canvas dependency):
  2000 simulated frames across multiple full loop cycles, confirmed no `NaN` in any spawn's
  position/target fields, spawn rate correctly capped per phase's `maxAlive`, and phase transitions
  advance in order without getting stuck.
- Not covered by this pass: the "title card / high-score interlude" visual dressing mentioned
  alongside the video-reference research — the phase timeline/spawn behavior it inspired is done,
  the optional interlude card itself is cosmetic polish and stays in `BACKLOG.md`.

## [1.1.48] - 2026-09-13 — Mage starter DPS rebalance
- **Mage's expected DPS brought in line with Swordsman** (the balance anchor), rather than running
  roughly 2-3x hotter at low/mid tiers. Measured actual current-code DPS first rather than
  guessing: at tier 1, Mage was 187 dmg / 4.86s cooldown ≈ 38.5 expected DPS against Swordsman's
  18 dmg / 1.35s ≈ 13.3 — nearly 3x. Retuned all three Mage tiers so `damage ≈ targetDPS *
  cooldown` using Swordsman's own tier DPS as the target, while pushing cooldown up (slower,
  matching Mage's intended identity) rather than just cutting damage:
  - Tier 1: 187 dmg / 4860ms → **80 dmg / 6000ms** (DPS ~38.5 → ~13.3, matches Swordsman tier 1)
  - Tier 2: 319 dmg / 4320ms → **216 dmg / 5400ms** (DPS ~73.8 → ~40.0, matches Swordsman tier 2)
  - Tier 3: 495 dmg / 3780ms → **657 dmg / 4800ms** (DPS ~130.9 → ~136.9, matches Swordsman tier 3)
  Mage's existing ±40% damage-variance band (`varianceHalfWidth`, `applyDamage()`) is untouched —
  it still swings much wider than Swordsman/Archer's ±20%, so Mage keeps its "rare dramatic hit"
  identity, it just no longer has a higher *average* DPS than the other two starters on top of
  that variance. Range/projectileSpeed/slow fields unchanged.
- Not done in this pass — logged to `BACKLOG.md` instead of silently dropped: the projectile
  hit/miss pre-roll architecture, pixel-precise (alpha-mask) enemy hitboxes, the full 100/500-point
  elemental attunement + evolution overhaul (Fire/Electric/Ice, new Marksman class), the
  curated-vignette attract-mode redesign, and the inspect-panel responsiveness pass. These are
  large, architecturally risky changes on a single 10k-line file and need their own scoped,
  tested passes per `AGENTS.md` §5 rather than being rushed through together with a balance tweak.

## [1.1.47] - 2026-09-08 — HOTFIX: Barricade crash, and Build's Barricade row was actually dead code
- **Mage resting pose corrected further** — v1.1.46 changed the rest *angle* but kept a single
  shared angle driving both the arm and the staff extension. Re-checked Swordsman's actual
  resting mechanics precisely: its arm hangs down-and-out while its blade points up near the
  shoulder via a *completely separate* angle — the arm and weapon-direction are two independently
  angled things, not one shared compromise angle. Restructured so the Mage's arm angle and staff
  direction now blend independently toward their own Swordsman-matching targets, unified (both
  equal to the aim angle) whenever actually aiming so nothing changes there. Verified numerically:
  confirmed exact continuity at restBlend=0 (no discontinuity re-engaging a target) and confirmed
  the arm/staff genuinely diverge to different angles at full rest, matching Swordsman's real
  arm-vs-blade geometric split rather than approximating it.
- **Fixed the Barricade upgrade crash at its root.** `recomputeStats()` had no Barricade guard at
  all — it fell through to the generic stat pipeline, and since Barricade has no
  `CLASS_ARCHETYPE` entry, `hpStatBase`/`hpStatRate` silently fell back to Mage's values. The
  actual trigger: `upgrade()`'s random stat-growth loop (`this[stat] += 1-6`) also had zero
  Barricade guard, so if reached it would inflate `str/dex/int` directly on a Barricade instance,
  which `recomputeStats()` would then use to compute a wildly different `maxHp` instead of the
  fixed 10 — the flash/crash. Added an early return in `recomputeStats()` hard-setting `maxHp=10`
  for Barricade, plus independent defensive guards in `canUpgrade()`, `upgrade()`, and
  `allocateStat()` (not just relying on one to protect the others). Verified with a direct
  functional test: a simulated Barricade with `str=47` now correctly stays at `maxHp=10`.
- **Found something bigger while tracing the reported "Shop purchase is confusing" complaint**:
  `STARTER_TOWER_TYPES` (which controls what the Build menu actually shows) never included
  `'BARRICADE'` — meaning the Build tray's already-written Barricade cost/afford display logic was
  completely dead code, unreachable. The Shop wasn't just a confusing *alternative* path — it was
  the *only* path, because Build genuinely could never show a Barricade row at all. Added
  `'BARRICADE'` to `STARTER_TOWER_TYPES` (verified every other usage of that constant first to
  confirm no side effects) — this alone is what makes Build → Barricade → tap tile reachable for
  the first time.
- **Found and fixed the matching cost bug**: `CONFIG.TOWERS.BARRICADE` had no `woodCost`/
  `stoneCost` fields at all, even though the Build tray's display code already read
  `def.woodCost`/`def.stoneCost` — an always-`undefined` comparison, meaning the affordability
  check was silently broken. Added the real values (600 wood / 300 stone, matching what
  `BARRICADE_ITEM` used to charge). Fixed `canAffordTower()` to actually check free-charge/wood/
  stone for Barricade instead of gold (previously `gold >= 0`, always true). Fixed the real
  placement handler, which — even after the above — still only ever deducted gold via
  `baseCost` (0 for Barricade, so nothing was ever charged): now consumes a free charge first,
  otherwise deducts wood+stone, mirroring `buyItem()`'s existing pattern. Verified with 4
  functional tests: exact-cost placement, free-charge-available (wood/stone untouched), 
  insufficient-resources (nothing consumed), and free-charge consumed exactly once.
- **Removed Barricade from the Shop's purchasable items** — the confusing duplicate path (buy
  into a tower's inventory, then drag onto the path) is gone. `UNIVERSAL_ITEMS` itself is
  untouched (still needed for save-file item lookups and the Store/pickup mechanic, which reuses
  `BARRICADE_ITEM`'s shape as a ground-item template, not a purchase — confirmed that re-placement
  path was already correctly free before touching anything nearby).
- **Simplified Barricade's inspect panel** — hides the EXP bar, combat stat row, allocatable
  stats, and inventory row entirely (not just showing zeros in them); keeps only durability,
  Move, Store, Sell, and its own help button. Cleaned up now-redundant dead conditions this left
  behind further down the function.
- **Save/load**: Barricade's `str/dex/int/statPoints` are now explicitly zeroed on load, on top
  of `recomputeStats()`'s own guard which already made `maxHp` safe regardless — fully matching
  "Barricades shouldn't have any stats," not just "stats don't affect their HP anymore."
- Updated Barricade's config blurb and its dedicated help-modal text, both of which still
  described the old Shop/inventory/drag workflow. Removed a now-dead Barricade branch in
  `itemStatLine()` (its only caller already excludes Barricade items).
- This entire fix was driven by a detailed external code review (via an uploaded PDF) making
  specific, falsifiable claims about the codebase — every claim was individually verified against
  the actual current file before acting on it, per this project's own standing rule about
  external AI-generated suggestions, rather than trusted at face value. Several of the claims led
  to finding *additional*, more severe problems (the dead `STARTER_TOWER_TYPES` entry, the missing
  cost fields) than the review itself had found.
## [1.1.46] - 2026-09-08 — Mage resting stance fixed, real scenery depth-sorting
- **Mage's resting staff pose fixed** — checked Swordsman's actual idle stance directly rather
  than guessing: it's a dedicated upright pose (weapon held near the body, arms bent up), not
  "angle pointing down." The Mage's rest angle from 1.1.41 (straight down, `Math.PI/2`) was wrong
  for exactly that reason — it doesn't match the reference pose it was supposed to echo, and reads
  worse for a staff than a sword since the staff extends further past the hand. Changed to mostly
  upright (`-Math.PI/2 + 0.3`), so the orb settles near shoulder height at rest instead of
  pointing at the ground. Kept the same smooth-blend mechanism (not a hard switch) since that's
  what prevents the orb from visually snapping to a new screen position — the original bug this
  system exists to avoid.
- **Real Y-depth sorting between scenery and entities**, replacing the fixed "all scenery, then
  all entities" draw order. Checked scenery placement rules first: trees can be placed on any
  buildable tile, so towers are commonly right next to them — ruling out simply moving scenery to
  always draw on top, which would have hidden towers standing near a tree in the common case
  instead of just fixing the specific reported one. New `drawDepthSortedLayer()` builds one list
  from visible scenery + active enemies + active towers, sorted by Y position (a tree's own base,
  an entity's own y), and draws in that order — a tree now correctly occludes anything positioned
  behind its base and is correctly occluded by anything in front of it, verified with both
  directions of a representative test case before shipping.
- Extracted `drawOneSceneryItem()` from the old `drawScenery()` (same pattern already used for
  `drawOneDecal()`) so the per-item logic could be reused inside the new sorted pass.
  `drawScenery()` itself is now genuinely dead code and was removed rather than left behind, per
  this project's own standard — confirmed no other call site referenced it first.
## [1.1.45] - 2026-09-08 — attract mode: stronger pan, genuinely random enemies
- **Camera pan/zoom significantly increased** — horizontal amplitude 0.04→0.11 of canvas width,
  vertical 0.03→0.08, faster periods, wider zoom range (1.06±0.05 → 1.1±0.09) — a much more
  noticeable drift than before.
- **Enemies are now genuinely randomized, not a fixed hand-authored list.** Each scene previously
  had the same hardcoded enemy lineup every time it played (e.g. always `['GRUNT','SWARM',
  'GRUNT','TANK','SWARM']`); now every scene init draws from a broad 18-type pool
  (`ATTRACT_ENEMY_POOL`) at random, and count increased from 5 to 7 for a busier lane. Every pool
  entry individually verified to exist in `CONFIG.ENEMIES` with a real emoji before trusting it,
  not assumed from memory.
- **Verified with an extended 100-second simulation** (6,000 frames): confirmed 17 of the 18
  possible enemy types actually appeared across scene re-initializations (real randomization, not
  theoretical), zero NaN across 18,000 `drawStickman()` calls, and projectiles still resolving
  cleanly rather than accumulating.
## [1.1.44] - 2026-09-08 — attract mode rebuilt as a real mini-simulation
- **Start-screen demo now actually emulates gameplay** instead of showing static/idle poses.
  Rebuilt `renderAttractMode()` as a genuine self-contained mini-simulation with its own
  enemies/towers/projectiles (still fully isolated from real game state — never touches
  `enemyPool`/`towerPool`/`projectilePool`): towers actually attack on a real cycle, driving
  `drawStickman()`'s real swing/draw/cast animation fields rather than a frozen pose, and Archer/
  Mage fire projectiles that visibly travel to their target and land.
- **Three distinct scenes**, each with a different tower layout and a differently-shaped enemy
  lane (straight left-to-right, a bent V-shape, a reverse descending diagonal) — not the same
  arrangement shifted sideways.
- **Slow autonomous camera pan/zoom** for a retro-arcade drift feel, layered as a pure rendering
  transform so it doesn't affect any of the simulation math underneath.
- **Top HUD bar now hidden during the start screen** — it was visible (dimmed) behind the attract
  mode, which read as real UI rather than a demo. Restored the moment Play is pressed.
- **Runtime-tested with an actual 50-second simulation** (3,000 frames), not just a syntax check:
  confirmed zero NaN positions/angles across 9,000 `drawStickman()` calls, correct scene-cycling
  count, stable enemy count, and projectiles correctly resolving to zero rather than leaking
  unbounded — before trusting any of this was working.
- The dark vignette overlay from 1.1.39 is unchanged, per explicit confirmation it was already
  right — only the content moving behind it changed.
## [1.1.43] - 2026-09-08 — reduced aim lead-prediction further
- **`MAX_LEAD_PREDICT_TIME` reduced from 0.35s to 0.2s** — per direct feedback that towers still
  aimed noticeably too far ahead of their target even with the existing cap. Quantified the actual
  effect before shipping: at typical enemy speeds (27–112 world units/sec), this cuts the
  extrapolated lead distance by roughly 43% across the board — from ~9 down to ~5 world units at
  slow speeds, and from ~39 down to ~22 at the fastest enemy speeds in the game. Trades away more
  of the technically-correct lead on long straight stretches (the less common case on this
  winding path) in exchange for meaningfully less overshoot near the frequent turns.
## [1.1.42] - 2026-09-08 — inspect panel button rows: no more clipped text or wrapping
- **DPS now has a label**: a small gold "DPS" caption sits above the number, centered, with a
  subtle glow on the value — replacing a bare number with no indication of what it was.
- **Upgrade's cost text will never be cut off again.** The Upgrade/Sell/DPS row previously used
  `flex-shrink` + `text-overflow:ellipsis` to make room for the DPS number between them, which is
  exactly what was clipping Upgrade's cost — confirmed directly in the reported screenshot
  ("Upgrade (..."). Replaced with the same guaranteed-single-line scaling already proven on the
  main stat row: the whole row shrinks together via a CSS transform when it doesn't fit, so every
  character stays visible, just smaller — never clipped.
- **Target/Move (and the axe-mode/help buttons) will never wrap to a second line again** — that
  row used `flex-wrap:wrap`, which is what was dropping them down a line at some widths. Same
  fix: `fitOptRowToOneLine()`, a reusable version of the stat row's scale-to-fit technique, now
  applied to both button rows. Called once at the true end of `updateInspectPanel()`, after every
  button's text (cost, sell value, target mode, move charges) is confirmed already set, rather
  than guessing at ordering by calling it mid-function.
## [1.1.41] - 2026-09-08 — Mage staff no longer stuck floating at an old angle when idle
- **Fixed the Mage's staff/orb staying locked at whatever angle it last aimed at, indefinitely,
  once genuinely idle** — visible in a screenshot as the orb floating off to the side, detached
  from a natural resting pose. Traced to an earlier, documented fix that intentionally removed a
  *different* bug (the staff used to snap instantly between "aimed" and a separate idle pose,
  which looked like the whole cast restarting) by simply always using the last-aimed angle
  forever — which fixed the snap but introduced this: no path back to a neutral resting pose at
  all once truly idle, so an awkward last-aimed angle could persist on screen permanently.
- **Fix**: new `restBlend`, computed once in `Tower.draw()` from time since `lastTargetTime` —
  stays 0 for the first 2s after losing a target (preserving the original no-snap fix for brief
  disengagement), then ramps smoothly to 1 over the next 1.5s if still idle. The Mage's arm and
  staff both blend from the last-aimed angle toward a neutral resting angle (straight down) as
  `restBlend` increases, using shortest-path angle interpolation so it never spins the long way
  around at the ±π wraparound.
- Runtime-verified both pieces: the timing curve (0 through 2s, ramping 2s–3.5s, holding at 1
  after), and the wraparound case specifically — confirmed the interpolated angle is
  mathematically equivalent through `cos`/`sin` (which is the only place it's ever used) even
  when the raw intermediate number falls outside the usual ±π range.
## [1.1.40] - 2026-09-08 — HOTFIX: skulls occluded by walking enemies, misread as "fading"
- **Fixed skulls (and bones/worms) appearing to fade in and out as enemies walked past.** Root
  cause wasn't an alpha bug — checked the actual rendering code first (it correctly hardcodes full
  opacity for this debris, with no fade curve and no pulsing effect anywhere near it) and the
  actual draw order, which is what turned out to be wrong: `drawDecals()` drew all debris
  (bones/skulls/worms) in the same early pass as blood, *before* enemies in the render pipeline —
  so any enemy walking directly over a skull's tile fully occluded it while passing over, then it
  reappeared once the enemy moved on. Visually that reads exactly as "fading in and out randomly
  as minions walk," confirmed by checking the render order line-by-line rather than assuming.
- **Fix**: split `drawDecals()` into blood-only (unchanged position, before scenery) and a new
  `drawDebrisDecals()` for bones/skulls/worms, called after both enemies and towers in the render
  pipeline. Debris was already designed as permanent, always-visible scene furniture — this
  extends that guarantee to include "never hidden by anything that walks over it," not just
  "never fades," which is what was actually being reported.
- Verified both draw functions are still called exactly once each (no double-draw risk from the
  split), and `perfStats`' visible/total decal counters correctly still track across both passes.
## [1.1.39] - 2026-09-08
- **Consent overlay is now full-screen and blocking** — covers the entire viewport with a
  near-opaque background instead of a small dismissable bottom bar, so nothing underneath
  (including Play) is reachable until Accept is clicked. The z-index (999) was already above every
  other modal in the game (max 25), so this only needed the layout redesign, not a z-index change.
  Removed `fitConsentBannerToOneLine()` — that scale-to-fit technique existed specifically to keep
  everything on one line in a thin bottom bar; the new centered card has room to wrap text
  normally, so it's no longer needed.
- **New start-screen attract-mode background** — a decorative loop of Swordsman/Archer/Mage
  facing a small procession of enemies, cycling between two arrangements every 10s with a brief
  fade transition, retro-arcade-attract-screen style. Fully isolated from real game state: uses
  `drawStickman()` with minimal fake objects (verified every field defaults gracefully when
  absent, rather than assumed) instead of real Tower instances, and its own timing based on the
  raw animation-frame timestamp rather than the global `gameTime` (which is frozen before Play is
  pressed) — nothing here can leak into or be affected by the actual game. Caught and fixed a real
  mistake while wiring this in: an edit meant to insert a new render branch before `loop()`
  accidentally deleted the `function loop(now){` line itself, breaking the whole file — found via
  the immediate syntax check this project always runs before shipping, fixed before it could ship.
- Start screen's background overlay changed from a flat 92%-opaque fill to a radial vignette
  (65% opacity near the center where the menu sits, 90% toward the edges) so the attract-mode
  animation is visible but the menu buttons and title stay clearly readable — split off from the
  end-screen's rule, which keeps the original opaque background unchanged.
- **Moved Changes/Share/Copy Link buttons from the start screen into Settings > About**, alongside
  the existing README/debug-log links — same button IDs and click handlers, markup relocated only.
## [1.1.38] - 2026-09-08 — item-only armor, panel layout, enemy damage rebalance
- **Armor now comes only from items — Lucky Branch grants +1 armor, 1 armor = 1% damage
  reduction.** New per-item `armor` field, summed alongside the existing str/dex/int item
  summation in `recomputeStats()`. `shieldPct` (the actual damage-reduction multiplier) is now a
  derived value recomputed every call from a new `baseShieldPct` (the class-ability/Legendary
  source, e.g. Hammerman's signature 35%) plus item armor at a fixed 1%-per-point rate, capped at
  90% — same ceiling the Legendary bonus already used. Runtime-verified the full matrix (no items,
  Lucky Branch alone, stacked Lucky Branches, Hammerman base, Hammerman+Legendary+heavy armor
  hitting the cap) before shipping.
- **Found and fixed a real, reachable pre-existing bug while restructuring this**: Hammerman is
  evolution-only (never built directly), but `evolveInto()` updated `baseMaxHp` for the new class
  and never touched the shield field at all — meaning a tower evolving into Hammerman never
  actually got its signature 35% shield. Fixed alongside the `baseMaxHp` line it already sat next
  to; also preserves the Legendary shield bonus across evolution now, matching how
  `legendaryHpMult` already did.
- **Save/load fix required by the same restructuring**: `baseShieldPct` isn't itself part of the
  save payload (nothing equivalent was, before this change), so it's now derived at load time from
  the restored type + `isLegendary` — same pattern already used for `legendaryHpMult` — before
  `recomputeStats()` runs.
- **Panel layout**: removed DPS from the compact stat row; it now lives between the Upgrade and
  Sell buttons (only visible when the panel is expanded, since that's where those buttons already
  live) as a plain number. Upgrade/Sell now share space equally and shrink together
  (`flex:1 1 0`, ellipsis overflow) so there's always room for it. Added 🆙 to Upgrade and 🏷️ to
  Sell. Removed the "+" prefix from the luck display.
- **Enemy damage rebalanced down ~20% across the board** (`breakDamage` — the damage enemies deal
  attacking towers/barricades directly), preserving relative differences between enemy types
  rather than an arbitrary flat cut. Life-loss damage (`loseLife(1)` on reaching the end) was
  already a flat 1 regardless of enemy type and untouched — the scalable damage source was
  `breakDamage`.
## [1.1.37] - 2026-09-08 — HP stat rebalance: archetype-differentiated base + growth rate
- **Replaced the single universal HP-stat rate (0.004/point, deliberately the hardest stat in the
  game) with archetype-differentiated base values and growth rates, per explicit spec**: Warrior
  starts at 3 "heart" (30 flat bonus HP) and grows 0.32/STR point; Archer starts at 2 (20 HP)
  growing 0.25/point; Mage starts at 1 (10 HP) growing 0.15/point. New `HP_STAT_BASE`/`HP_STAT_RATE`
  lookup tables keyed by `CLASS_ARCHETYPE`, same pattern as the existing per-archetype miss-chance
  table. Barricade (no `CLASS_ARCHETYPE` entry) falls back to Mage's values, the lowest, since
  it's not a fighting class.
- **Verified the exact starting values numerically before shipping** — confirmed 30/20/10 bonus
  HP at STR=0 for Warrior/Archer/Mage respectively, matching the spec precisely, not just
  eyeballed from the formula.
- This is a real, substantial, class-differentiated stat now rather than the previous
  near-invisible version — still additive on top of the existing percentage-based `strHpMult`,
  which is unchanged.
## [1.1.36] - 2026-09-08
- **HP-stat display precision increased from 2 to 3 decimal places** — verified the actual bug
  before fixing it: at STR=1, `hpStat` correctly computes to `0.004`, but 2-decimal rounding
  displayed it as literal `0`, making a correctly-working stat look broken. At STR=4-5 it rounded
  to `0.02`, matching what was reported as "0.02 too low" — the real value was there, just hidden
  by insufficient display precision, not a math error in the underlying calculation.
- **Removed the "%" suffix from the defense/armor stat**, as requested.
## [1.1.35] - 2026-09-08 — HOTFIX: permanent wave soft-lock from 1.1.32's idle fast path
- **Fixed a real, confirmed permanent soft-lock introduced by 1.1.32's idle-simulation
  optimization** — reported live with a screenshot: wave stuck at 1/100, nothing spawning, a
  damaged barricade with a blood trail (an enemy had died there). Root cause: `anyBarricadeQueued`
  (which gates whether spawning is allowed to continue, and normally has a 15-second force-resume
  safety valve) is *only* ever recalculated inside `updateBarricadesAndPileup()` — which 1.1.32
  gated behind an active-enemy check for performance. If the last enemy touching a barricade died
  while the flag was `true`, it stayed stuck `true` forever: nothing left to recalculate it, which
  blocked all future spawning, which meant no enemy could ever become active again, which meant
  the function — including its own safety valve — never ran again either. A genuine deadlock, not
  a rare edge case.
- **Fix**: moved `updateBarricadesAndPileup()` back outside the active-enemy gate so it runs
  every single frame unconditionally again, exactly as it did before 1.1.32 — this structurally
  guarantees `anyBarricadeQueued` can never go stale, since it's recalculated fresh from live data
  every frame regardless of enemy count. It's cheap even with zero enemies (an empty array/Map),
  unlike the collision-resolution and hash-building work, which was the actual performance cost
  and has no similar side effect — verified by scanning all three remaining gated functions
  (`resolveSweptEnemyCollisions()`, `resolveEnemyCollisions()`, `checkStallWatchdog()`) for any
  module-level state assignment before trusting they were safe to leave gated: all three only
  touch local variables or per-enemy instance properties, nothing global.
- The idle-frame performance win itself is preserved — the actually-expensive work (hash building,
  collision resolution) still only runs when enemies exist.
## [1.1.34] - 2026-09-08 — Download Debug Log
- **New Settings > About button: "🪲 Download Debug Log (.txt)"** — one plain-text file covering
  everything genuinely useful for debugging a report: timestamp + game version, live
  `perfStats` (frame/update/render ms, ticks/frame, visible-vs-total scenery/decal counts), full
  game state (wave, gold/wood/stone, lives, camera), current settings (graphics quality, gore,
  mute), audio engine state (AudioContext state/sample rate, active voice count, impact
  suppression counters), every entity pool's active-vs-capacity count, and browser/device info
  (user agent, window/screen size, devicePixelRatio). Filename includes the version and an
  ISO timestamp. Reuses the exact same Blob/download pattern already used for save files and the
  README, rather than inventing a new one.
- **Every referenced variable individually verified to exist** before trusting this — checked
  `MAX_MOVE_CHARGES`, `MAX_FREE_BARRICADES`, `MAX_DECALS`, `dprValue`, `groundItems`,
  `deathAnims`, `particles`, `floatingTexts`, and `decals` all by name against the real
  declarations, not assumed from memory.
- **Runtime-tested, not just syntax-checked**: extracted `generateDebugLog()` and executed it
  against a fully stubbed environment covering every field it reads, confirming real, correctly
  formatted output with no thrown errors before shipping.
## [1.1.33] - 2026-09-08 — decal culling + performance telemetry
- **Decal viewport culling** — same principle as 1.1.32's scenery culling, applied to
  `drawDecals()`'s two ordered draw passes. Decals aren't tile-aligned like scenery, so this is a
  plain bounds check per decal rather than a grid-cell lookup. Caught and fixed my own mistake
  while building this: my first pass added a third full traversal of the decals array purely to
  count visible ones for telemetry — exactly the kind of wasted work this whole effort is trying
  to eliminate. Folded the counting into the two existing draw passes instead.
- **New always-on performance telemetry** (`perfStats`, inspectable from the console) — frame ms,
  update ms, render ms, ticks-per-frame (with a running max), and visible-vs-total counts for both
  scenery and decals. This is the instrumentation step the original audit recommended doing
  *first*; every remaining deferred performance item in BACKLOG.md now has a real number to check
  before being attempted, instead of being inferred from reading code alone.
- **Deliberately did not attempt static scenery/decal caching this round** — the single largest
  remaining lever per the audit, but genuinely higher-risk than everything else shipped: cache
  invalidation has to correctly handle scenery mid-clear, new spawns, map expansion, and blood
  that's still actively aging/dripping. Viewport culling (1.1.32 + this version) already resolves
  the loudest reported symptom — idle-panning cost scaling with total world size rather than
  what's actually visible — at much lower risk. Logged in BACKLOG.md to revisit once `perfStats`
  shows culling alone isn't sufficient.
## [1.1.32] - 2026-09-08 — archetype voices, luck display, performance audit response
- **New: towers now use their cute chatter voice beyond just placement.** Taking a hit (throttled
  to at most once per 2.5s per tower — a tower hit repeatedly by breakaway enemies shouldn't
  react to every single one) and leveling up (naturally rate-limited by the XP curve, no extra
  throttling needed) each trigger a short reactive "word" — distinct from the full 2-part phrase
  played on placement. New `chatter_short` sound case alongside the existing `spawn_chatter`.
  Barricade explicitly excluded from the hit reaction — `CLASS_ARCHETYPE` has no entry for it
  (verified before excluding it), and an inanimate obstacle shouldn't have a voice.
- **Archetype-distinct voice registers, per spec**: Archer highest pitch, Warrior medium, Mage
  lowest AND slowest to talk — a new `tempoMult` stretches Mage's syllable duration and gaps too,
  not just its pitch, so it genuinely reads as a slower, more deliberate voice rather than just a
  deeper one. Random variance still exists within each register, so same-class towers sound like
  different individuals, not clones.
- **Removed the luck stat's "+0%"** — hidden entirely when luck is actually 0% instead of always
  showing a value that adds no information.
- **Performance audit response** (external review, cross-checked against the real code before
  acting on any of it — every claim below was independently verified by reading the actual
  functions, not taken on faith): implemented the top three verified, safe findings —
  - **Idle-simulation fast path**: the full enemy-collision pipeline (`updateBarricadesAndPileup()`,
    swept + regular collision resolution, stall watchdog, hash building) previously ran every
    single frame regardless of whether any enemies existed — each of those functions allocates
    fresh arrays/Maps/objects even with zero active enemies, confirmed by reading them directly.
    Now gated on an actual active-enemy check (not `waveState`, to avoid any edge-case gap); every
    other system — tower cooldowns/targeting, projectiles, particles, death animations, floating
    text, scenery timers — still runs unconditionally every frame, exactly as before.
  - **Scenery viewport culling**: `drawScenery()` previously rendered every scenery item in the
    world regardless of visibility — confirmed zero culling existed by reading the function. Now
    computes visible world bounds once per call and skips offscreen items before any Canvas state
    (font, fillStyle, transforms) is touched.
  - **Camera-pan hot path**: verified a real double `getBoundingClientRect()` read per
    pointermove during an active drag — the scenery-hover and build-hover checks ran
    unconditionally even while panning, each independently re-querying canvas geometry for a
    tooltip that's irrelevant while the camera is being actively dragged. Both now skip entirely
    once a drag is confirmed.
  - **Declined to silently change**: `const low = false` in the gore-intensity code has an
    explicit comment stating gore intensity is deliberately decoupled from graphics quality — a
    content-rating decision, not an oversight. Flagged in BACKLOG.md as a real tension worth an
    explicit decision, not changed without being asked.
  - **Deferred to BACKLOG.md**, in the audit's own recommended order: static scenery/decal
    caching, decal viewport culling, spatial-hash allocation reduction, `MAX_TICKS_PER_FRAME`
    instrumentation, and frame-timing telemetry — each is a larger, riskier change than the three
    shipped here, and several of the audit's own remaining findings need real profiling evidence
    before they're worth acting on further, not just static code reading.
## [1.1.30] - 2026-09-08
- **Removed the redundant ❤️ current/max HP display from the compact stat row** — the HP bar
  directly above it already shows the exact same numbers (and, as of 1.1.29, toggles to a
  percentage on click), so the stat row was just duplicating it. Kept the 💗 HP-stat indicator on
  its own, since that's genuinely different information not shown anywhere else. Verified no other
  code referenced the two removed elements before deleting them.
## [1.1.29] - 2026-09-08
- **The HP bar is now clickable — toggles between exact numbers (78/100) and percentage (78%).**
  A display preference, not per-tower state, so it persists across different tower selections
  until clicked again. Added `cursor:pointer` so it's visually discoverable.
- **Caught and fixed a real bug while building this, before it shipped**: the toggle's state
  variable was initially declared with `let` *inside* `updateInspectPanel()`, which runs on every
  panel refresh — that would have reset the toggle back to the default every single time the panel
  updated, making it effectively never stick. Moved the declaration to module scope. Verified with
  a runtime test simulating repeated panel refreshes between clicks, confirming the mode now
  actually persists instead of resetting.
## [1.1.28] - 2026-09-08
- **Crit multiplier symbol changed from ⚔️ to 🗡️ (dagger)** — the code already correctly said
  ⚔️, but a screenshot showed it rendering as a plain "✕" fallback glyph, likely because
  crossed-swords needs more font/emoji support than a single dagger does. Also avoids reusing the
  same icon as the base damage stat two columns to the left in the same row.
- **The new HP stat (1.1.27) is now actually visible in the panel** — previously it only silently
  added to the total HP number, with no way to see it existed or was growing, which is why it kept
  reading as "nothing changed" for towers with little STR invested even though the math was
  correct. New 💗 indicator next to the HP display shows the raw derived value directly.
## [1.1.27] - 2026-09-08 — new "HP stat" mechanic
- **New derived `hpStat`, fed by tiny decimal increments from STR, converting to flat bonus HP at
  a 10:1 ratio** (23 HP stat = 230 bonus HP), per explicit spec. Deliberately additive on top of
  the existing percentage-based `strHpMult` — that system is completely unchanged, this is a
  separate, much slower-growing bonus layered underneath it, not a replacement.
- **Verified this is genuinely the hardest stat to grow in the game, not just by name**: rate is
  0.004 per STR point — checked against every other per-point rate already in the game (DEX
  accuracy 0.007, DEX attack speed 0.03, STR's own HP% 0.03) and confirmed smaller than all of
  them before picking the number. At STR 2000 — an extreme late-game value — the bonus is still
  only +20 HP, confirming the scale holds even under heavy investment rather than becoming trivial
  to max out.
## [1.1.26] - 2026-09-08 — STR mustache
- **Towers with STR above 47 now grow a mustache**, sized proportionally to STR above the
  threshold and capped at a maximum (full size by STR 97) — verified numerically across the full
  range including extreme late-game STR values (150, 600) before shipping, confirming the cap
  actually holds rather than growing unboundedly.
- **Color rolled once per tower** from a realistic human hair palette (`HAIR_COLORS`: black, dark
  brown, brown, blonde, ginger/red, gray/white, auburn) — same stable-roll pattern already used for
  skin and pants tone in `rollSkinTones()`, so it's set the moment a tower is created and re-rolls
  on upgrade/evolution exactly like those existing traits already do (deliberate existing behavior
  — "leveling up visibly shows growth," not something new introduced here).
- Threaded through the existing `extra` object `drawStickman()` already receives each render — no
  new per-frame state reads, no changes to the rendering function's calling convention.
## [1.1.25] - 2026-09-08 — Hero/Legendary sound family (Nintendo economy + WoW rarity escalation)
- **Found StickTD's two real achievement tiers were badly under-served, audio-wise.** Hero (6
  item slots filled) reused the same generic `'wave'` blip already flagged this session as
  over-used across 9 different events. Legendary (100 total stats — permanent, player-named, the
  single rarest milestone in the game) played **no sound at all**. Verified both by reading the
  actual `checkHeroStatus()`/`checkLegendaryStatus()` code before changing anything.
- **Built as one shared, escalating motif family, not two disconnected new sounds** — `'hero'` is
  a quick 2-note sibling of `'evolution'`'s existing A-root ascending language; `'legendary'`
  reuses `'evolution'`'s exact 4-note pattern verbatim, then extends it with a 5th rising note and
  a sustained double-stop (two notes held together) for a conclusive finish. Same underlying
  vocabulary recontextualized into a grander form at each rarity tier, rather than three unrelated
  fanfares — matches the "shared class motifs with contextual variation" principle already applied
  elsewhere this session, and mirrors how tiered-rarity loot audio escalates a shared sonic
  language rather than switching languages per tier.
- **Duck depth escalates with rarity, verified numerically**: hero −2.5dB (gain 0.375) → evolution
  −4dB (0.316, unchanged) → legendary −5dB (0.281, the deepest duck in the game) — confirmed
  correctly ordered before shipping, not just assumed from the dB numbers looking right.
- Legendary's sound fires immediately on reaching the milestone, before the existing blocking
  `prompt()` naming dialog — the "you did it" moment is heard right away, not only after the
  player answers a dialog.
## [1.1.24] - 2026-09-08 — dynamic mix ducking (real consumer of the priority seam)
- **New `SoundEngine.duck(amountDb, durationSec)`** — briefly dips the master bus so a genuinely
  important moment (losing a life, leveling up, a tower evolving) gets real headroom against
  whatever combat clutter is playing, instead of just making the cue itself louder. The first real
  consumer of the `isImportantAudioEvent()` classification seam added in 1.1.22.
- **Found and fixed a real interaction bug before it could ship**: the mute toggle does a plain
  `gain.value =` assignment with no `cancelScheduledValues()` — muting mid-duck could have left a
  queued recovery ramp that silently un-muted the game moments later. Fixed the mute handler to
  cancel scheduled automation first. Runtime-tested the exact scenario (duck in flight, mute fires
  mid-ramp): confirmed the gain correctly stays at 0 instead of drifting back to 0.5.
- **Scoped deliberately**: ducks on `'lose'`, `'levelup'`, and `'evolution'` only — verified
  `'wave'` has 9 call sites across genuinely different events (chest pickups, expansions,
  milestones, not just wave-start), which would have over-triggered constantly. This was already
  flagged as the exact risk to avoid in BACKLOG.md's "Mix ducking on important cues" entry, written
  before this was built — followed that guidance rather than taking the shortcut.
- Removed the "Mix ducking on important cues" entry from BACKLOG.md — shipped.
## [1.1.23] - 2026-09-08 — two verified fixes from a Gemini review, rest declined
- **Fixed `randomJobQuote()` repeating the same line consecutively** — confirmed real by reading
  the actual code (`Math.floor(Math.random()*lines.length)`, zero history tracking). New
  `randomNoRepeat()` ring-buffer helper, one history slot per tower type. Runtime-tested: 30 picks
  from a 5-option pool produced zero consecutive repeats.
- **Fixed a real, mathematically-verified pitch asymmetry in `tone()`'s random detune** — the old
  linear `±6%` swing produced +100.9 cents up but −107.1 cents down for the same input range
  (calculated directly, not assumed from a citation) since pitch perception is logarithmic. New
  cent-based math gives exactly ±100 cents, verified symmetric, with almost identical audible
  magnitude to before (0.9439/1.0595 vs. the old 0.94/1.06).
- **Everything else from the reviewed Gemini output declined for this pass**: its headline
  "concurrent-impact throttling" proposal is already shipped (1.1.21, from an earlier session
  Gemini wasn't aware of); its specific book/page citations couldn't be verified without reading
  the source PDFs directly, which wasn't done; and several proposals (LFSR noise emulation,
  comb-filter feedback delay lines, granular "evaporation" synthesis, HDR mix windowing, dot-
  product wind vectoring, polyrhythmic music scheduling) are real techniques in the abstract but
  meaningfully heavier systems than their "quick win" framing suggested, for uncertain payoff on
  an already-lean procedural engine.
## [1.1.22] - 2026-09-08 — Audio Pass B, continued (UI pitch stability, evolution fanfare, priority seam)
- **Fixed a real, verified bug: `tone()` applied a random ±6% pitch detune to every call
  unconditionally, including UI confirmation sounds** (`click`, `ui_open`, `ui_close`, `ui_buy`,
  `ui_deny`) — exactly the case the reference material specifically warns against, since pitch
  randomization on button feedback can make the intended state read as ambiguous. New optional
  9th `stablePitch` param on `tone()`, opted into by every UI case; every other existing call site
  is unaffected (purely additive). Runtime-verified: `stablePitch=true` produces detune=1 exactly
  every call, `false` still varies as before.
- **Verified the deny/confirm/open/close acoustic grammar while making this fix — already
  correct, not changed**: `ui_buy` is bright/rising/sine, `ui_deny` is low/falling/buzzy-square,
  `ui_open` expands upward, `ui_close` contracts downward. Matches the reference material's
  recommended grammar exactly. Confirmed rather than assumed broken.
- **New dedicated `evolution` sound** — a real 3-note ascending fanfare with a sparkle harmonic
  and reverb, `stablePitch` since it's a state-confirmation cue. Found while auditing: evolution
  previously reused the generic `'wave'` sound — the same one-tone blip as a routine wave clear,
  expansion, or chest pickup — meaning one of the rarest, most exciting events in the game sounded
  identical to background noise. `evolveInto()` now calls `playSound('evolution')`.
- **New `isImportantAudioEvent(eventType, context)` helper** — a clean classification seam for
  future voice-priority work (deferred Pass D), recognizing boss/selected-tower/crit/evolution as
  "important." Not wired into deep priority logic yet, since that system doesn't exist — exists so
  a future pass has one place to plug into instead of four scattered ad-hoc checks. Runtime-tested
  all four true cases, the false/routine case, and the no-context-argument case (doesn't throw).
## [1.1.21] - 2026-09-08 — Audio Pass B (family suppression, per-tower bias, speed thinning)
- **New per-weapon-family concurrency suppression in `playImpactSound()`** — verified first that
  this is the ONLY call site for weapon-hit sounds (one call, in `applyDamage()`, not scattered).
  At most one impact voice per weapon family (BLADE/BLUNT/PIERCE/ARCHER/MAGE/EXPLOSIVE) plays every
  35ms; crits and hard hits always bypass it. Runtime-tested (not just syntax-checked) with a
  stubbed harness: 20 rapid same-family hits in 100ms correctly dropped to 3 actual voices, and a
  crit fired inside the suppression window correctly bypassed it. Fixes dense Gatling/swarm fights
  stacking many acoustically-identical impact sounds at once.
- **New stable per-tower audio bias** — `towerAudioBias(towerId)`, a cheap deterministic hash of
  the tower's own persistent `id` (verified real and stable — assigned once in `Tower.create()`),
  giving each tower a small (±3%) fixed pitch offset instead of every hit sounding identical or
  using fresh per-call randomness. No save-format change needed. Sanity-checked the hash: well
  distributed across sample IDs, correctly neutral (1.0, no bias) when no tower ID is available.
- **Automatic secondary-layer thinning at 5x/10x game speed** — routine (non-crit) impact hits
  drop their noise()-layer detail at high simulation speed, since individual secondary layers stop
  being perceptually distinct at that density anyway; crits and hard hits keep full detail always.
- **Always-on debug telemetry** (`audioEngine.debugCounters`: impactRequested/impactPlayed/
  impactSuppressed, plus `peakVoices` tracked in the existing `reserveVoiceSlot()`) — near-zero
  cost, inspectable from the browser console, so future audio tuning has real data instead of
  guesswork.
- **Click-safety audited, not changed** — checked `tone()`'s actual envelope: instant onset at
  `osc.start()` (correct for a percussive impulse, not a bug) into a smooth exponential release.
  No discontinuity found; no code change needed.
- **Logged the remaining larger audio-mastery passes to BACKLOG.md** (true 2D distance — verified
  61 `playSound()` call sites, confirming why that's a separate, larger pass; voice-priority tiers;
  bus architecture; procedural material response; forensic gore-audio integration; whole-palette
  mastering) rather than attempting all of them in one already-large session, per the reference
  material's own explicit "do not implement everything in one patch" instruction.
## [1.1.20] - 2026-09-08
- Added a 🍪 cookie emoji to the left of the consent banner's Accept button text.
## [1.1.19] - 2026-09-08
- **Consent banner is now Accept-only** — removed the Decline button per request. Worth flagging
  plainly: without a Decline action, there's no explicit "no" a visitor can click; not accepting
  just leaves consent at its already-denied default rather than recording an active refusal. Not
  legal advice, just noting the tradeoff since it's the opposite of what the Decline button was
  originally there for.
- **Banner text and button never wrap to a second line anymore** — new
  `fitConsentBannerToOneLine()`, the same scale-to-fit technique already used for the top HUD bar
  and the inspect panel's stat row: measures the content's true natural width, compares to the
  banner's actual available width, and shrinks it with a left-anchored transform instead of
  letting it wrap.
## [1.1.18] - 2026-09-08
- **Added the remaining common SEO tags**: `robots`, `og:site_name`, `og:locale`, and a
  schema.org `VideoGame` JSON-LD structured-data block (the one addition with real SEO teeth left
  — it's what lets search engines show rich results instead of a plain link). Purely additive,
  nothing existing reordered or touched.
- **New cookie-consent banner, wired to Google Consent Mode v2.** Analytics previously ran
  completely unconditionally with no consent mechanism at all. Now: `gtag('consent', 'default',
  ...)` in `<head>` denies `analytics_storage` by default (pushed before `gtag('config', ...)`,
  since Consent Mode requires that ordering); a new banner at the top of `<body>` — fully
  self-contained, its own markup/CSS/script, no dependency on the main game script — lets the
  visitor Accept or Decline, calls `gtag('consent', 'update', ...)` accordingly, and remembers the
  choice in `localStorage` so the banner doesn't reappear on later visits.
- Verified before shipping: the new JSON-LD block is valid JSON (parsed and checked, not just
  visually inspected), the new consent-banner script is independently syntax-valid, and the full
  document's script-tag structure is still balanced — the project's own established boot-integrity
  check, since a malformed `<script>` tag here was exactly the class of bug that caused the 1.0.208
  hotfix.
## [1.1.17] - 2026-09-08 — HOTFIX
- **Fixed a boot-crashing bug from 1.1.16: `ReferenceError: Cannot access 'DECAL_LIFESPAN' before
  initialization`.** The new worm feature added a top-level `const WORM_LIFESPAN = DECAL_LIFESPAN
  * 2` right after `spawnSkullDrop()` (around line 5977), but `DECAL_LIFESPAN` itself isn't
  declared until much later in the file (around line 6176) — a classic temporal-dead-zone
  violation: top-level `const`/`let` statements execute in file order, so referencing one before
  its own declaration line runs throws immediately, crashing the entire boot sequence. Fixed by
  removing the standalone `WORM_LIFESPAN` constant and computing `DECAL_LIFESPAN * 2` inline
  inside `spawnWormFromSkull()`'s function body instead — function bodies are only evaluated when
  actually called, well after the whole script has finished parsing, so this is safe regardless of
  where either constant is declared.
- **Verified this class of bug doesn't exist anywhere else in the file**, not just at the one
  reported site: ran the entire extracted script end-to-end in Node with stubbed DOM/browser APIs
  (canvas, AudioContext, localStorage, etc.) rather than only checking the specific error reported.
  It now executes fully with zero errors, confirming no other "used before declared" bug is
  lurking elsewhere — this is a stronger check than `node --check`, which only validates syntax,
  not execution-order correctness.
## [1.1.16] - 2026-09-08
- **Bones/skulls no longer depend on push order to render above blood — found and fixed the real
  cause.** They were never actually fading (verified — already fixed opacity from an earlier
  pass), but `drawDecals()` drew every decal type in one shared pass ordered purely by when each
  was pushed to the array; a bone pushed before a later blood pool could end up rendered
  underneath it, which likely read as "fading" even though it wasn't. Split into
  `drawOneDecal()` (unchanged rendering logic) called in two ordered passes — blood/other decals
  first, then bone/skull/rock/worm debris on top — so the layering is now guaranteed, not
  incidental.
- **Bone and skull drop chance increased again** — still felt low after the last bump. Bone 58% →
  78%, skull 32% → 45%.
- **New: worms crawl out of skulls.** Each round, every skull decal has a 1-in-10 chance to be
  marked for a worm — but the worm doesn't actually appear until the round after it's rolled, a
  one-round delay before it emerges. Each skull only ever grows one worm. Worms never fade (same
  as bones), but unlike bones they're not permanent: they live twice as long as a blood stain
  (`WORM_LIFESPAN` = 2x `DECAL_LIFESPAN`) and, instead of an alpha fade-out, shrink smoothly to
  nothing over their final 30% of life — reads as burrowing away rather than a wound-style fade.
## [1.1.15] - 2026-09-08
- **Two-part spawn chatter** — the gibberish voice blip is now two short phrase parts (like two
  words) with a pitch step between them (one part higher, one lower, direction randomized) and a
  small pause in between, instead of one flat continuous babble. Reads more like actual speech
  intonation.
- **Barricade reworked into a Shop-purchased, draggable item — no longer a Build-menu tower.**
  This was the feature explicitly deferred in 1.1.11 as needing its own focused pass; built now:
  - Removed `BARRICADE` from `STARTER_TOWER_TYPES` — no longer appears in the Build tray at all.
  - New `BARRICADE_ITEM` (600🪵/300🪨) added to the Shop, bought like any other item into the
    selected tower's inventory via the existing `buyItem()` flow.
  - Dragging a Barricade item out of inventory now has two valid drop targets instead of one:
    drop it on a tower to store it (existing item-transfer behavior, now labeled "🚧 Stored!"),
    or drop it on a valid empty path tile to place it live ("🚧 Placed!", a real
    `Tower.create('BARRICADE', ...)`, free since it was already paid for at purchase). Missing
    both leaves it sitting as a ground item, the same fallback every item drag already has.
  - New "📦 Store (pick up)" button on a selected live Barricade — converts it back into a
    draggable ground item instead of only being sellable (Sell still exists, still gives the
    current 70%-of-`totalSpent` gold refund, which is 0 for Barricade since it was never bought
    with gold — Store is the real way to reclaim value).
  - **Rewired the free-barricade milestone (every 5 waves, 1.1.11) into the new Shop purchase
    flow** — `buyItem()` now consumes a banked `freeBarricadesLeft` charge before checking
    wood/stone, and the Shop card shows "🎁 FREE!" when one's available. This needed explicit
    attention: moving Barricade out of the Build menu would have silently orphaned that milestone
    otherwise, since it used to live in the Build-menu placement handler specifically.
  - Cleaned up the now-dead Barricade branches in `canAffordTower()` and the Build-menu placement
    handler, verified unreachable before removing (Barricade can never be `selectedBuildType`
    anymore). Also removed `CONFIG.TOWERS.BARRICADE`'s now-redundant `woodCost`/`stoneCost`
    fields, verified unused anywhere else — that cost now lives solely on `BARRICADE_ITEM`.
  - Updated the Barricade blurb and its dedicated help modal, both of which still described the
    old cheap/Build-menu flow.
- **Ground items now read more clearly as draggable** — the existing gentle bob (it was already
  there, just subtle) increased slightly, plus a new soft pulsing ring around every ground item,
  visible at every graphics setting (not gated behind high graphics like the glow already was) —
  a consistent, always-on "this can be picked up" signal.
- **New 👇🏻 drop-target pointer** — while dragging an item, whichever tower is currently the
  valid drop target shows a pointing-finger indicator above it, using the exact same 26px
  hit-test radius the actual drop logic already uses, so what's shown always matches what would
  really happen if released right now.
- **Audio mastering, verified rather than rebuilt**: the master bus already had a real chain
  (compressor, soft-clip saturation, a 350Hz "boxiness" EQ notch) from earlier work — confirmed
  every sound in the game, including everything added this session (spawn chatter, stat-spend
  chime, footsteps, crit-hit layers), correctly routes through `tone()`/`noise()` into that same
  chain with no bypasses. Nothing needed changing there; this was a check, not a guess-and-fix.
## [1.1.14] - 2026-09-08
- **Crit multiplier now shows ⚔️ instead of a literal "x"** — e.g. "2.5% ⚔️1.20" instead of
  "2.5% x1.20".
- **Nameplate HP/XP bar area now dynamically extends to guarantee flush alignment with the stat
  row**, instead of relying on `#inspNameplateMid`'s `flex:1 1 auto` to independently converge to
  the same right edge through normal browser layout. New `fitNameplateToStatRow()` explicitly
  computes `#inspNameplateMid`'s width from the exact same source value
  `fitStatRowToOneLine()` already uses (`panel.clientWidth - 16`), so the scroll/close buttons and
  the stat row's right edge are now driven by one shared calculation rather than two independent
  layout systems that could each round slightly differently. Called on every panel refresh and on
  resize/orientation change, same trigger points as the stat-row fit.
## [1.1.13] - 2026-09-08
- **Barricade cost raised from 6🪵/3🪨 to 600🪵/300🪨**, a substantial investment now rather than
  a cheap early-game buy. Updated the (previously stale) "cheap obstacle" blurb text to match.
- **Rocks now cost more gold to clear than trees** — new `rockClearCostMult` (1.6x), applied on
  top of the existing size-based clear-cost formula so a rock is always pricier than an
  equivalently-sized tree, not just at one particular size. Shows up automatically in the existing
  on-scenery cost label (no separate UI work needed — it already renders `item.clearCost` live).
## [1.1.12] - 2026-09-08
- **Rebuilt the inspect panel's stat row to never wrap, using the same proven technique already
  working for the top HUD bar instead of another manual padding/gap guess.** Previous attempts
  (allowing `flex-wrap:wrap`, trimming button sizes/gaps) never actually fixed the underlying
  problem and produced a messy two-line wrap under real content. New `fitStatRowToOneLine()` —
  structurally identical to `fitHudTopToOneLine()` — measures the row's true natural width via
  `scrollWidth`, compares it to the inspect panel's actual available inner width
  (`clientWidth - 16px`, its real padding, not a guess), and scales the row down with a CSS
  transform anchored at the left edge so its right edge lands exactly at the panel's inner right
  boundary — the same boundary the nameplate's buttons already reach, so they're now
  *structurally* guaranteed to align rather than depending on both rows happening to add up to
  matching widths. `#inspCombatRow` itself switched from `flex-wrap:wrap` to `nowrap` — it now
  physically cannot wrap to a second line.
- **No floor on the shrink scale, per explicit instruction** — `fitHudTopToOneLine()` stops
  shrinking at 0.4 so its buttons stay tappable, but this row is read-only text with more stats
  than the HUD has buttons, so it's allowed to shrink indefinitely if content grows very wide late
  game. Unreadable at extreme values is an accepted trade-off; wrapping to a second line is not.
- Called on every `updateInspectPanel()` refresh (so it re-fits whenever stat text actually
  changes — new tower selected, stat point spent, upgrade bought) and on resize/orientation
  change, matching the HUD version's own trigger points.
## [1.1.11] - 2026-09-08
- **Barricade now costs wood + stone (6🪵/3🪨), not gold.** Updated the build tray, the tile-hover
  affordability preview, and the actual placement handler together through one new shared
  `canAffordTower()` helper, so all three can never disagree about whether a Barricade is
  affordable. `baseCost` kept at 0 rather than removed from the config, since other code may
  assume the field exists.
- **New "free barricade" milestone**: every 5 waves cleared, banks one free-barricade charge (capped
  at 3), consumed automatically on your next Barricade build before wood/stone are ever checked.
  Chose every 5 waves as a defensible middle ground for "a bit more often, somewhere from every 3
  to every 10 waves" — flagging that choice explicitly in case a different number was meant.
  `freeBarricadesLeft` now persists through save/load alongside `moveCharges`.
- **Tank (🗿) now drops stone instead of gold on death** — thematically fitting for a stone statue,
  and gives the wood/stone economy a real income source beyond scenery clearing. Set to 14 stone
  (roughly matching Tank's own 16 gold bounty), not the suggested 112 — that figure is ~7x Tank's
  own bounty and ~11x a full scenery clear, which would let one Tank kill trivialize Barricade's
  entire wood/stone cost. Flagging this adjustment explicitly rather than silently changing the
  requested number.

### Deliberately not attempted this pass: Barricade as a draggable inventory item
The request to turn Barricade into an item — carried in a tower's inventory slot, dragged out onto
a valid path tile within that tower's own attack range to place it, dragged back into any tower's
inventory as long as it's currently within that tower's range — is a genuinely new mechanic, not a
variation on anything that exists today. It would need: a new item-to-live-tower conversion system,
new drag-drop interactions distinct from the existing item-transfer-between-towers drag (which
moves items between inventories, never onto the map), and new range/tile validation layered on top
of both. Given the size and risk of getting the edge cases wrong (multiple barricades in flight,
save/load state for an item mid-transformation, interaction with the existing Build-menu placement
flow), this needs its own focused pass rather than being folded into an already-large batch — noted
here rather than attempted partially or silently dropped.

## [1.1.10] - 2026-09-08
- **Real critical-hit system, replacing the old purely-cosmetic one.** Previously "crits" were a
  flat 10% chance that only changed the floating damage-text color — no actual damage effect.
  Added real `critChance` (base 2.5%, scales with DEX, capped 50%) and `critMult` (base 1.20x,
  scales with INT, capped 3x), computed in `recomputeStats()` exactly like DEX's other universal
  effects (accuracy, attack speed, luck). The crit roll now happens before armor mitigation and
  actually multiplies real damage. New 💥 stat in the inspect panel shows both chance and
  multiplier. DPS now correctly folds in the crit's expected-value contribution instead of
  understating real average output.
- **New WC3-style "aura box"** next to the inventory slots — a round glowing icon, visible only
  for evolved/specialist towers (Hammerman, Axeman, Spearman, Paladin, Blowdart, Gatling, Bomber,
  Squirtgun, Gunalinder, Sniper, Snap Caster, Cleric), tap to open a strategy tooltip explaining
  that class's niche. New `TOWER_STRATEGY` data table, one icon + one strategy line per class.
- **Two real gaps found and fixed while building the above**: Snap Caster was missing from
  `EVOLVED_TOWER_TYPES` (an evolution-only tower not marked as one), and `validateGameDefinitions()`
  gained a `TOWER_STRATEGY` coverage check so a future missing entry can't silently render an
  empty aura box.
- **Inspect panel stat row reordered** — ❤️ HP and 🛡️ armor now come first, ahead of the damage
  cluster (⚔️ damage, 💥 crit, ⏳ speed, 🥈 DPS), per feedback.
- **⏳ now shows time per attack (seconds) instead of attacks per second** — reads directly as
  "how long one attack takes" rather than a frequency the player has to mentally invert.
- **DEX's attack-speed rate toned down from 8%/point to 3%/point.** At moderate investment the old
  rate could more than double attack speed — far stronger than DEX's other universal effects
  (accuracy, crit chance, luck), which all move gradually. Attack speed is now a genuinely
  fractional DEX bonus like the rest, not a dominant one. Updated the three places that referenced
  the old 8% figure (help modal, inline comment, stat tooltip).
- **Nameplate header widened a pinch** — trimmed gaps and button sizes slightly (28px→26px,
  8px→6px gaps) so the HP/XP bars get a bit more room and the scroll/close buttons sit closer to
  flush with the stat row's right edge below, per feedback that they didn't line up.
## [1.1.9] - 2026-09-08
- **Spawn quips now last 1800ms instead of 550ms.** A tower's placement quip (`JOB_QUOTES`,
  shown via `randomJobQuote()`) was using the generic `spawnFloatingText()`, whose life is a fixed
  550ms shared with every other floating combat number — nowhere near enough time to actually
  read a multi-word phrase before it faded. New `spawnTowerQuip()` reuses the same pooled
  mechanism (same rise-and-fade behavior, correctly scales to any duration) with a 1800ms life
  instead, specifically for this one use.
- **More quote variety per class** — every tower type's `JOB_QUOTES` pool grew from 3 lines to
  5, and **Snap Caster was found to have no entry at all** (spawning with a silently empty quip)
  and now has 5 lines like everyone else.
- **New cute "spawn chatter" voice sound** — a Sims-style gibberish blip, 3-5 quick
  randomly-pitched syllables in a playful stutter, with a randomized base pitch each time so
  different spawns sound like different (equally cute) little voices rather than one robotic
  loop. Plays alongside the quip on every real tower placement.
- **Extended `validateGameDefinitions()` with a `JOB_QUOTES` coverage check** — every non-
  Barricade tower type must have an entry, catching exactly the kind of silent gap Snap Caster
  had. Verified it actually works by deliberately removing an entry and confirming the validator
  caught it with the exact tower name, before restoring it.
- **Fixed the trigger site, not just the content** — `Tower.create()` is also called during
  save/load restoration and starting-barricade seeding, not just real placements; the quip/sound
  trigger was deliberately kept at the actual build-tap handler (where it already lived) rather
  than moved into `create()` itself, which would have made every tower on a loaded save shout
  its quip simultaneously the moment the save loads.
## [1.1.8] - 2026-09-08
- **Slightly increased bone and skull debris drop chance** on death — bone fragments 50% → 58%,
  skull drops 25% → 32%, a modest bump per feedback, not a dramatic one.
## [1.1.7] - 2026-09-08
- **Grouped ⏳ attack speed and 🥈 DPS together with ⚔️ damage on the left of the inspect panel's
  combat stat row**, per feedback — previously speed and DPS sat on opposite ends of the row
  (order was damage, HP, armor, range, speed, luck, DPS). New order: damage, speed, DPS, HP,
  armor, range, luck. Pure markup reorder — no stat calculations changed.
- **Added a full stat-icon legend to the README's "How to play" section**, covering every symbol
  used in the top HUD bar, the inspect panel's combat stats, the STR/DEX/INT stat buttons, and the
  target-of-target frame. Also fixed a second, separate spot with the same stale "7 rotating wave
  archetypes" claim already corrected elsewhere in the README (actually 9, including Trick Rush
  and The Grind).
## [1.1.6] - 2026-09-08
- **Tank (🗿, "the stone guy") no longer bleeds — dust and 🪨 rock-chip debris instead.**
  `getBloodProfile()` was only special-casing Boulder/Rocklet as rock/debris (`isDust:true`);
  Tank fell through to the generic red "standard flesh" profile despite being a literal stone
  statue. Added it to the same group. New `spawnRockChips()` function (modeled on the existing
  bone-debris pattern) scatters small 🪨 emoji chips at a fixed 1/10 of the enemy's own radius —
  2-5 on death, plus a 1-in-10 chance per non-lethal hit. Applies to Boulder/Rocklet too, not just
  Tank, since they share the same rock material and `isDust` gate.
- **Ants' green blood, verified already correct — no bug found.** Traced the full pipeline
  end-to-end (`getBloodProfile` → `rollBloodProfile` → every `spawnParticles`/`spawnDecal` call
  site in the hit/death handlers) before touching anything. Swarm's blood profile has always been
  green (`#8bc34a`/`#4a7c1f`/`#cddc39`, "insect hemolymph"), and every call site correctly threads
  `bio.bright`/`bio.dark`/`bio.spray` through with no hardcoded red anywhere. What likely read as
  "wrong" is fixed below — every enemy's blood pool was the same size regardless of species, which
  made a swarm of small ants look visually generic/uniform even with the right color.
- **Blood amount now actually scales to the size of the enemy being targeted.** Previously ground-
  pool decal size depended only on weapon archetype and the hit's damage roll — a tiny Swarm ant
  and a Boss produced an identically-sized pool for the same weapon type. New
  `bloodPoolSizeScale(enemyRadius)` (relative to Grunt's radius as baseline, same convention the
  existing HP-based `goreScale` already uses) scales every ground-pool `spawnDecal()` call, and
  `goreScale` itself now blends HP and radius together instead of HP alone, so death-burst particle
  counts reflect actual body size too.
- **Found and fixed a real, separate bug while updating the docs below**: `generateProceduralWave()`
  cycles through 9 wave flavors (`n % 9`, including Trick and Grind — wired in during an earlier
  fix), but `WAVE_TYPE_NAMES` only had 7 entries and the toast-label lookup still used `% 7` — so
  Trick/Grind waves generated correctly but displayed the wrong name (whichever of Standard/Swarm
  Surge the wrong modulus landed on instead). Added the two missing names and fixed the modulus.
- **README/AGENTS.md updated** to reflect everything new since the last documentation pass: the
  accuracy hierarchy and its removal of per-archetype caps, `warriorStrDamageMult()`'s late-game
  scaling, the gold-tier-upgrade random stat growth formula (separate from EXP leveling), the DPS/
  min-max-damage UI, `MAX_LEAD_PREDICT_TIME`, `validateGameDefinitions()`, the gore/blood system
  (previously undocumented in AGENTS.md entirely), the ambient-footstep system, and the corrected
  9-flavor wave rotation.
## [1.1.5] - 2026-09-08
- **Removed `EARLY_ACCURACY_CAP_TYPES` — DEX-based accuracy now scales identically for every
  tower, with no exceptions.** Previously Mage, Cleric, Swordsman, Spearman, Axeman, and
  Hammerman had their accuracy-from-DEX contribution capped at 15 effective points ("casters and
  melee warriors aren't precision fighters"); Archer and the rest scaled uncapped. Per explicit
  direction, that exception is gone — the exact same `diminishingStatValue()` accuracy formula now
  applies to every archetype. Damage remains untouched and still strictly archetype-gated: only
  STR drives Warrior damage, only DEX drives Archer damage, only INT drives Mage damage — DEX's
  universal accuracy benefit was never a damage bonus for non-Archer classes and still isn't.
- **Reworked gold-tier upgrade stat growth**: 3 independent rolls of 1-6 points each into a
  randomly chosen stat (so a given upgrade might land on 1-3 different stats, or stack multiple
  rolls onto the same one), plus a guaranteed extra 1-3 points into the tower's favored/main stat
  specifically (STR for Warriors, DEX for Archers, INT for Mages). Replaces the previous flat
  0-2-per-stat-plus-1-2-favored growth — average total growth per upgrade rises from ~4.5 points
  to ~12.5, a real but contained bump since upgrades are gold-gated and limited to 2-4 total per
  tower, not a per-EXP-level system (EXP leveling's separate "1 stat point to spend" per level is
  unchanged).
- **Menu button sound gaps fixed** — the "How Everything Works" help modal and the Barricade help
  modal had no sound at all on open, close, or backdrop-tap-to-dismiss, unlike every other modal
  in the game (Build/Shop/Settings all already played ui_open/ui_close). Also fixed: the Settings
  modal's backdrop-tap-to-dismiss was silent even though its own ✕ button wasn't; the Video/Audio/
  Game/About settings tabs had no sound at all when switching between them.
- **New `stat_spend` sound — a distinct, warmer, more lingering chime specifically for allocating
  a stat point**, replacing the plain generic `click` that action shared with every other minor UI
  tap. A soft sine glide up a perfect fourth, plus a higher harmonic a third above staggered
  slightly for shimmer, both sent to reverb for a smooth tail instead of a short dry blip.
## [1.1.4] - 2026-09-08 — balance pass
- **New baseline (zero-DEX) miss-chance hierarchy by archetype, per explicit balance direction:
  Mage misses the most, Archer a moderate amount, melee (Warrior) the least.** Previously every
  tower shared one flat 12% baseline regardless of class, only diverging once DEX was actually
  invested. New `BASE_MISS_CHANCE_BY_ARCHETYPE`: Mage 22%, Archer 14%, Warrior 7% (Cleric already
  maps to the Mage archetype, so it inherits Mage's tier automatically). None severe on their
  own — verified numerically before shipping across a realistic DEX range: at 0 DEX the order is
  exactly Mage 22% > Archer 14% > Warrior 7%; Archer (DEX is its preferred, uncapped stat) drops
  fastest with investment, Warrior and Mage (both capped at 15 effective DEX for accuracy
  specifically) floor out more slowly, with Mage settling around 13% even fully invested since
  its own damage stat is INT, not DEX — matches "misses the most" as a standing identity, not
  just a starting number.
- **Swordsman and Archer's starting (tier 1 only) attack speed reduced, balanced against Mage's
  relative pace.** Previously Swordsman's 780ms cooldown (1.28 attacks/sec) was about 6.2x Mage's
  tier-1 rate, and Archer's real cycle (drawTime+cooldown, 1250ms, 0.8/s) was about 3.9x — too
  extreme a gap at the very start. New tier-1 values: Swordsman cooldown 780ms → 1350ms (0.74/s,
  ~3.6x Mage); Archer drawTime 510ms → 800ms and cooldown 740ms → 1150ms (cycle 1950ms, 0.51/s,
  ~2.5x Mage) — drawTime and cooldown both scaled by the same proportion so the draw/reload split
  stays the same shape, just slower overall. Tiers 2+ intentionally left untouched, so upgrading
  now restores meaningfully more of the speed gap instead of starting from an already-fast
  baseline — verified the new ratios numerically before shipping, not just eyeballed.
## [1.1.3] - 2026-09-08
- **Inspect panel: removed the redundant flat damage number, now shows only the min-max range.**
  Previously showed both "33 (26-40)" — the flat base value next to its own variance range,
  which just repeated information the range already conveys more precisely.
- **Added a real DPS stat (🥈) to the inspect panel, for every tower type.** Computed as average
  damage per hit (the variance band is symmetric, so the base damage value already is the
  average) × attacks/second, discounted by the tower's actual `missChance` — the same "relative
  accuracy" mechanic that drives every attack type already (a shot that physically connects but
  rolls a miss due to low DEX-based accuracy deals zero damage, so it belongs in an "accurate" DPS
  number). Burst-fire towers (Gunalinder, Snap Caster) get their real full-cycle time — the short
  gaps between burst shots plus the long reload after — not just the reload cooldown alone, which
  would have understated their real DPS. Deliberately scoped to guaranteed direct-hit damage only:
  doesn't add incidental splash against extra targets, poison/burn DoT ticks, or Snap Caster's
  chance-based chain lightning — all real bonuses, but situational on top of this baseline.
  Verified against every tower/tier in `CONFIG.TOWERS` before shipping: no NaN, Infinity, or
  negative results anywhere, including Barricade (which never attacks) and every burst-fire tier.
- **`#inspCombatRow` changed from `nowrap`+`overflow:hidden` to `wrap`**, so adding the 7th stat
  (DPS) can never clip/truncate a stat for any tower at any screen width — if the row can't fit
  seven stats on one line, it now flows to a second line instead of cutting one off. The outer
  `#inspect-panel` is already auto-height with its own `flex-wrap`, so a wrapped second line just
  grows the panel naturally.
## [1.1.2] - 2026-09-08
- **Footsteps cut to a fifth as often and dropped to the quietest audible level**, per direct
  feedback that even 1.1.1's throttle/gain fix was still too loud during a big ant swarm. Per-step
  stride widened from 3.4x to 17x each enemy's radius (a fifth as many trigger attempts), and gain
  dropped from 16-30% to 4-9% depending on weight class — a bare ambient texture now, not a sound
  competing for attention. The 70ms engine-wide throttle from 1.1.1 is unchanged.
- **Warrior (Swordsman/Hammerman/Axeman/Spearman/Paladin) STR damage buffed, with a real late-game
  scaling fix** — feedback that Swordsman felt weak and didn't scale well into the endgame. Added
  `warriorStrDamageMult()`, a dedicated curve used only for this one calculation (every other
  stat-driven effect in the game — DEX accuracy/luck, INT range, HP, Archer/Mage damage — still
  uses the shared `diminishingStatValue()` unchanged): base rate raised 6%/point → 8%/point, and
  the actual late-game fix, the per-tier floor raised 25% → 40% with slower per-tier falloff (15%
  → 12%), so heavy STR investment keeps compounding meaningfully instead of flattening to
  near-linear growth past 25 points. Verified numerically before shipping: +17% damage at 10 STR,
  growing to nearly +100% by 600 STR — unchanged at 0 STR, growing gap exactly where the "late
  game" complaint was aimed at. Updated the two UI tooltips and the in-game help text that
  hardcoded the old "+6% damage" figure for STR specifically (DEX/INT are still accurate at +6%
  and untouched).
- **Capped ranged-tower lead-prediction time (new `MAX_LEAD_PREDICT_TIME` = 0.35s)** — feedback:
  "archers aiming totally off, not hitting many shots." Investigated the actual aim/fire code
  first rather than guessing: found no double-miss-chance roll and no stale-angle bug (both ruled
  out by reading the code directly), but did find that the lead-prediction formula extrapolated a
  target's current velocity all the way out to the shot's full flight time — up to ~0.8s at
  Archer's max range/min speed. This map's spiral path turns every 1-3 tiles, so a target
  routinely changes direction well before a slow-arriving shot reaches the point it was
  extrapolated to, and the arrow flies straight past the corner. Capping the extrapolation window
  trades a little lead accuracy on long straight stretches for much more reliability near turns.
  Applied to the one shared aiming formula used by every ranged tower's continuous aim, plus the
  separate Axeman-throw prediction — benefits Archer specifically as reported, but the same root
  cause affects every ranged class equally.

## [1.1.1] - 2026-09-08 — MINOR VERSION BUMP (explicit instruction)
- **Fixed the ant "army" problem — ambient footsteps were far too loud and too frequent during a
  big Swarm wave.** Root cause: the 1.0.214 footstep sound used `noise()`'s untouched default
  gain of 1 (the same loudness as a real combat impact) with no limit on how many could actually
  play at once — a 40+ ant swarm meant dozens of concurrent identical noise bursts stacking into
  a wall of sound. Two fixes: (1) `noise()` gained a real `gainMult` param, and footsteps now play
  at 16-30% amplitude depending on weight class, well under combat volume; (2) a new engine-wide
  throttle (`lastFootstepAt`) limits actual footstep playback to at most one every ~70ms
  regardless of how many enemies request one in the same frame, collapsing a stampede into an
  audible patter instead of a chorus. Also widened each enemy's per-step stride (2.2x → 3.4x its
  radius) so fewer requests are wasted against the throttle to begin with. Removed the heavy-
  footfall low-thump tone layer added in 1.0.214 — with per-weight gain now doing the differentiation
  work, the extra tone wasn't earning its complexity.

### Highlights of the 1.0.x range — what actually mattered most
Every change has its own dated entry below; these are the ones worth calling out specifically:

- **1.0.208 (the big one): a missing `<script>` opening tag had the entire ~7,800-line main game
  program sitting outside any script element** — verified against the live repo's actual raw
  bytes, not just a visual read, confirming it wasn't a snapshot-only artifact. The single highest-
  impact fix in this range by a wide margin: everything else assumes the game runs at all.
- **1.0.212: `validateGameDefinitions()`** — a boot-time check across every data-driven config
  table (waves, towers, enemies, evolutions, splits, archetypes). Verified twice before shipping:
  clean against real data, and confirmed to actually catch a deliberately introduced typo. The
  most durable addition — it protects every future edit to those tables, not just a one-time fix.
- **1.0.209/1.0.210: two real Web Audio correctness bugs** (delayed-sound voice-budget accounting;
  `AudioContext` unable to resume once suspended) — both invisible in normal play, both the kind
  of bug that only shows up as "audio randomly stops working" days later with no obvious cause.
- **1.0.214/1.0.215/1.1.1: the audio "personality" pass** — staged pre-transient/transient/tail
  envelopes on Mage cast and Hammerman swing, a full swing_blade redesign from user feedback,
  per-type ambient footsteps (including a deliberately silent Wraith), a one-shot Boss/Troll
  enrage growl, then this entry's fix once footsteps proved too aggressive in real play. The
  through-line: every one of these was checked against actual gameplay feedback or actual data,
  not shipped on first guess.
- **1.0.211: `Tower.setGridPosition()`** — a small one, but the cleanest example of this range's
  actual discipline: duplication was verified real (not assumed) before extracting it.

## [1.0.215] - 2026-09-08
- **New favicon: the actual stickman-with-sword character, centered, background removed.**
  Replaced the previous data-URI favicon (a generic placeholder graphic) with a proper cutout of
  the Swordsman sprite — segmented from a real gameplay screenshot by distance-matching against
  the three background tile colors (dirt, and both green tiles), connected-component cleanup to
  fill the sword-hand region and remove stray tile-grout line artifacts, then centered on a
  transparent square canvas and downscaled to 32×32 with high-quality resampling. Both the
  `rel="icon"` and `rel="shortcut icon"` data URIs updated together, plus the standalone
  `favicon.png` asset in the repo root for consistency.
- **Swordsman's swing sound redesigned — user feedback: previous version was "too high pitch and
  quick," read as a "tink" rather than an actual blade slice.** Old `swing_blade` case was a
  2600Hz highpass noise burst (0.06s) plus a 720Hz triangle spike (0.05s) — very short, very
  high-pitched. New version: a wider, lower bandpass "whoosh" (1500Hz, 0.10s) standing in for the
  blade actually cutting air, followed 20ms later by a lower, longer metallic ring (320Hz
  triangle, 0.13s) so the ring reads as the cut landing rather than one simultaneous spike.
- **Removed `case 'sword'` — dead code, verified zero call sites anywhere in the file.**
  `playSound('sword')` is never actually called; Swordsman's real attack sound has always been
  dispatched as `'swing_blade'` (see `updateSwordsman()`'s `meleeSound` selection). Found while
  investigating the swing-sound feedback above — the case that actually needed fixing was
  `swing_blade`, not the unreachable generic `'sword'` case sitting next to it.
## [1.0.214] - 2026-09-08
- **Ambient footstep sounds per enemy type.** Every enemy previously walked in total silence
  (only stepping into a blood pool made any sound — see 'foot_squelch'). Added a lightweight
  `footstep` sound keyed to actual distance walked (a fixed stride length per step, so faster
  enemies naturally step more often with no separate timer needed), classified by a new
  `FOOTSTEP_WEIGHT` lookup: light/skittery (Swarm, Runner, Monarch, Wolf, Splitmini, Rocklet),
  heavy/thudding (Tank, Boss, Boulder, Zombie, Reaper, Troll), and medium (everything else, the
  default). Wraith is deliberately silent — `null` weight disables footsteps entirely for a
  distinct ghostly-glide identity rather than an oversight. Thinned to roughly the visible camera
  area so an off-screen swarm doesn't spend voice budget on steps nobody can hear.
- **One-shot "enrage" growl for Boss and Troll at low HP.** A new `enrage` sound cue (low
  pitch-drop tone + noise) fires once per enemy the first time its HP drops below 30% —
  telegraphs the state change through sound, not just a shrinking health bar. Checked before the
  pileBlocked/stunned early-returns in `Enemy.update()` so it still fires even while an enemy is
  queued at a barricade, since burn/poison/bleed can still be ticking its HP down during that time.
- **Staged (pre-transient / transient / tail) attack envelopes**, prototyped on two attacks per
  the existing BACKLOG note rather than rewritten everywhere at once: Hammerman/Paladin's
  `swing_blunt` now has a barely-there anticipatory thump before the crushing impact, plus an
  extended low tail after it; Mage/Snap Caster's `cast_mage` now has a faint shimmer anticipation
  before the existing blast, plus an extended bass tail so the cast's weight lingers into the shot
  instead of cutting off abruptly.
- **Added optional `delay` support to `noise()`**, mirroring `tone()`'s existing parameter —
  needed to schedule the new staged envelopes' follow-up noise bursts slightly after their initial
  hit. Also fixes the same delay-vs-reservation-lifetime accounting `tone()` had before 1.0.209:
  `noise()` now passes its own delay through to `reserveVoiceSlot()` too.
- Extended `validateGameDefinitions()` (1.0.212) to also check every `FOOTSTEP_WEIGHT` key is a
  real enemy type.
## [1.0.213] - 2026-09-08
- **Top HUD bar shrunk a touch to stop it crowding/clipping the screen edges.** A real-device
  screenshot showed "Build" cut off on the left and "Next Wave" cut off on the right —
  `fitHudTopToOneLine()` was computing its scale to exactly fill the available width, leaving zero
  margin for sub-pixel/font-metric rendering variance between the measurement pass and the actual
  paint. Added a flat 0.94 safety-margin multiplier on top of the existing fit-to-width
  calculation, so the bar now sits with a small consistent gap from both edges instead of
  computing right up to them.
## [1.0.212] - 2026-09-08
- **Added `validateGameDefinitions()`, a boot-time integrity check across every data-driven
  table** (`CONFIG.WAVES`, `CONFIG.TOWERS`, `CONFIG.ENEMIES`, `EVOLUTIONS`, `SPLIT_CHILD_TYPE`,
  `CLASS_ARCHETYPE`, `STARTER_TOWER_TYPES`, `EVOLVED_TOWER_TYPES`). None of these cross-references
  get any static checking from JavaScript itself — a typo in a wave's enemy type or an evolution's
  target tower previously became a silent `undefined` deep inside gameplay, often not surfacing
  until whatever specific wave/evolution/split was actually reached. Now checked once at boot,
  before anything else touches these tables; collects every problem found (not just the first) and
  throws one descriptive error naming the exact table/key/value at fault, which the existing
  `window.onerror` diagnostic already displays on-screen — no new error-reporting plumbing needed.
  Verified against the real current tables (zero problems found, confirming no false positives)
  and against a deliberately introduced typo (correctly caught and reported) before shipping.
## [1.0.211] - 2026-09-08
- **Extracted `Tower.setGridPosition(gridX, gridY)`** — the grid→world position conversion
  (`x = gridX*TILE_SIZE + TILE_SIZE/2`, same for `y`) was duplicated verbatim in `create()` and
  `attemptMoveTower()`. Not a bug today, but exactly the kind of duplicated-idea case this file's
  own `isEnemyFrozen()` precedent argues for extracting — two independent copies of one invariant
  is how they'd eventually drift if only one were ever updated. Pure refactor, no behavior change.
## [1.0.210] - 2026-09-08
- **`SoundEngine.unlock()` can now resume an existing suspended `AudioContext`.** Previously it
  returned immediately once `this.unlocked` was `true`, with no path to `resume()` an
  already-constructed context the browser had suspended (tab backgrounding, mobile audio
  lifecycle policies) — a later user tap/gesture couldn't bring audio back for the rest of the
  session. Now every call checks the existing context's `state` and resumes it if it isn't
  `'running'`; only the very first call constructs a new context. Resume failures are caught and
  ignored — the game stays fully playable with no audio rather than throwing.
## [1.0.209] - 2026-09-08
- **Fixed voice-budget reservation lifetime for delayed sounds.** `reserveVoiceSlot(duration)`
  always reserved `now + duration`, but `tone()` can schedule a note at `currentTime + delay` and
  stop it at `delay + duration` later (added in 1.0.205 for sample-accurate multi-note sequencing).
  A delayed note's real end time was undercounted, so its voice-budget reservation could expire
  while the oscillator was still scheduled or actively playing, silently letting the global voice
  cap (1.0.205) undercount real load. `reserveVoiceSlot()` now takes an optional `delay` param and
  `tone()` passes its own delay through, so reservation lifetime matches the actual scheduled
  start/stop time.
## [1.0.208] - 2026-09-08 — HOTFIX
- **Fixed a missing `<script>` opening tag that left the entire main game program (everything from
  `"use strict"` through the final `</script>`, ~7,800 lines) outside any script element.** The
  share-button IIFE's own `<script>...</script>` block closed correctly, but the main program that
  immediately follows it had no opening `<script>` tag of its own — only the trailing `</script>`
  at the very end of the file, which (per the HTML parsing spec) is a stray end tag with nothing on
  the stack to close once the parser isn't in script-data state. Verified directly against the raw
  bytes of both the uploaded snapshot and the live `main` branch on GitHub (identical, confirming
  this wasn't a snapshot-only artifact) by counting and diffing every `<script>`/`</script>` pair
  rather than trusting a visual read. Fixed by adding the missing opening tag immediately after the
  share-button script's closing tag. `node --check` on the extracted script body confirms the
  program itself was always syntactically valid JavaScript — the defect was purely in the HTML
  document structure around it, which a JS-only syntax check can never catch.
## [1.0.207] - 2026-09-08
- **Replaced the oversized 321×321 favicon with a properly-sized 32×32 version, plus a
  `shortcut icon` fallback.** The original data actually decoded to a valid PNG (verified
  directly — proper signature, correct dimensions), so the underlying image was never corrupted;
  321×321 is just unusually large for a favicon and some browsers are inconsistent about scaling
  an oversized data-URI icon down cleanly. Standard favicon sizing plus a second `rel` for older
  browser compatibility maximizes the chance it actually renders. Also worth noting for anyone
  still not seeing it live: browsers cache favicons aggressively per-domain — a normal refresh
  often isn't enough, and the live GitHub Pages site won't show it at all until this file is
  actually uploaded there.
## [1.0.206] - 2026-09-08
- **Added real master-bus production processing — the last major lever for "produced" sound
  quality that hadn't been touched.** Signal chain was `source → master gain → compressor →
  destination`; now `source → master gain → 350 Hz boxiness cut → soft-clip saturation →
  compressor → destination`.
  - **Master EQ cut**: a gentle peaking filter at 350 Hz (Q 1.5, -4 dB). That band is where
    overlapping mid-range content — impacts, most of this engine's oscillator/noise sounds —
    accumulates into mud when several play at once; carving a shallow dip there gives sub-bass
    punch and upper-mid transient clarity room to actually cut through instead of the mix
    blurring into one crowded register.
  - **Soft-clip saturation**: a real `WaveShaperNode` with a hyperbolic-tangent transfer curve
    (`tanh(k·x)`, k=1.5) — the standard analog-style saturation curve. This is what makes a mix
    feel glued and intentional rather than just loud: it rounds off peaks smoothly instead of
    squaring them off the way hard digital clipping does, adding subtle warmth on the loudest
    simultaneous moments (swarm deaths, explosions) without coloring quiet sounds.
  - Both stages sit in the existing signal path everything already flows through (`this.master`),
    so no other code needed to change — reverb, mute, and every `tone()`/`noise()` call
    automatically pick up the new processing.
## [1.0.205] - 2026-09-08
- **Web Audio clock scheduling replaces `setTimeout()` for all three multi-note sounds**
  (`levelup`, `cast_cleric`, `ui_buy`). `tone()` gained an optional `delay` parameter, scheduled
  against `audioCtx.currentTime` up front rather than firing a second `tone()` call from a JS
  timer later — `setTimeout` is the wrong clock for tight audio timing, subject to JS event-loop
  jitter/throttling (background tabs, heavy simulation frames) that the audio hardware clock isn't.
- **Added a real global voice budget** — a genuine CPU/audio-thread safeguard, not a mix-quality
  nicety. Previously nothing stopped a 40-enemy swarm death or a cluster of simultaneous
  splash-damage hits from each independently spawning full oscillator/buffer/filter graphs with
  zero coordination. New `reserveVoiceSlot()` tracks active-voice expiry timestamps and caps
  concurrent voices at 28; wired directly into `tone()`/`noise()` themselves (the two lowest-level
  primitives everything in the engine funnels through, including `playImpactSound()` which
  bypasses the `play()` dispatcher entirely) — so this protects the whole engine without needing
  per-call-site changes anywhere else in the file. Once the budget is full, a new sound call
  simply produces no sound rather than piling on further voices.
- **Critical UI/system sounds bypass the voice budget entirely** — new `force` parameter on
  `tone()`, applied to `wave`, `lose`, `levelup`, `ui_buy`, and `ui_deny`. These should never be
  silently dropped just because a chaotic battle moment happened to fill the budget with combat
  noise; routine gameplay sounds (impacts, gore deaths, standard attacks) remain correctly
  subject to the cap, which is exactly the category the budget is meant to manage.
## [1.0.204] - 2026-09-08
- **Fixed a real, confirmed audio graph bug: reverb was never actually reverberating anything.**
  Verified against the live code (not assumed from external analysis): every `reverbSend` call
  site connected the dry source straight into `reverbGain`, completely bypassing `reverbNode` (the
  actual `ConvolverNode`) — the convolver had zero input the whole time, despite its impulse
  response being generated correctly. Separately, `reverbGain` connected directly to `compressor`,
  bypassing `this.master` entirely — since mute works by zeroing `master.gain`, any sound using
  `reverbSend` (critical hits, Mage, explosions) could still be faintly audible while "muted."
  Both fixed: the wet-send call sites in `tone()`/`noise()` now connect into `reverbNode` itself,
  and `reverbGain` now routes through `master` like every other sound.
- **Fixed a real early-boot fragility bug.** The diagnostic `window.error` handler is installed
  inside `<head>`, ~400 lines before `<body>` is even parsed — an error thrown early enough in
  boot meant `document.body` was still `null`, so the handler's own `.appendChild` would throw,
  silently swallowing both the original error and the diagnostic meant to report it. Now falls
  back to `document.documentElement` when `body` isn't available yet.
- **`noise()` no longer allocates and fills a brand-new `AudioBuffer` on every single call.**
  `noise()` fires extremely often (gore, impacts, explosions, UI) and was generating fresh
  sample-by-sample white noise every time — real repeated allocation/CPU work for content that
  doesn't need to be unique per call. Now generates one shared 2-second noise buffer once, lazily,
  and each call plays a random-offset slice of it (still audibly different call to call — the
  random offset changes, not the underlying data) with the original linear fade-out replicated via
  a `GainNode` envelope instead of baked into per-call buffer data. No audible behavior change,
  real performance win.
- **Added lightweight `localStorage` persistence for UI preferences** — graphics quality, mute,
  and the 18+ gore toggle now survive a page reload, separate from and without touching the
  existing file-based full game save system. Wrapped in try/catch throughout since storage can
  throw in restrictive contexts (private browsing, disabled storage) — persistence failing never
  breaks the game, it just silently doesn't persist that session. All three real toggle handlers
  (`gfxHighRadio`/`gfxLowRadio`/`settingsMuteToggle`/`settingsGoreToggle`/`goreToggle`) now save on
  change, and the actual DOM controls (not just the JS variables) sync to loaded values at boot.
## [1.0.202] - 2026-09-07
- **Attack speed display now shows two decimals instead of one** (`inspSpeedVal`), so gradual
  per-DEX-point increases (the underlying formula was already granular — +8%/point, diminishing
  — only the display was coarse) are actually visible rather than rounding several consecutive
  DEX points to the same displayed number.
- **Added Snap Caster — a new DEX-triggered Mage evolution** (`dex: {target:'SNAPCASTER',
  threshold:12}`), trading Mage's "rare and massive" identity for real firing frequency: cooldown
  1650/1450/1250ms — a big jump down from Mage's 4860/4320/3780, but still clearly slower than
  Archer's 740/630/520, matching "still slower than Archer" exactly. Damage scaled down to match
  (78/118/168) and its own signature: chain lightning procs at 35% per hit (vs. base Mage's 15%)
  and skewed heavily toward the shock+chain branch specifically rather than an even three-way
  split with burn/freeze.
- Wiring notes for future evolutions of this shape: `CLASS_ARCHETYPE.SNAPCASTER` is set to
  `'ARCHER'` (DEX-scaled damage, matching the established precedent that an evolution's ongoing
  stat-scaling archetype is independent of its trigger stat — Bomber is INT-triggered but stays
  ARCHER-archetype the same way). Because `CLASS_ARCHETYPE` also feeds the gore-archetype fallback,
  that would have given Snap Caster kills Archer's puncture-mark treatment despite still being
  visually a magic bolt — added an explicit override in `resolveGoreArchetype()` (same shape as
  the existing Bomber/Cleric overrides) so its kills correctly read as Mage's cone. Also extended
  every exact `type === 'MAGE'` check needed for correct rendering/behavior: `isMagicMissile`/
  projectile color, the staff-angle/charge-glow render logic, `drawStickman`'s pose branch, and
  added `JOB_BUILD`/skin-color table entries (a distinct electric-yellow tint, not a reused violet)
  so it doesn't just render as an undifferentiated Mage. Left Mage-specific target-lock hysteresis
  and the ±40% damage-variance width as Mage-only — Snap Caster's cooldown is too fast to need the
  anti-snap treatment, and its identity is speed/consistency, not variance.
## [1.0.201] - 2026-09-07
- **Fixed bones/skulls never actually being permanent — a real latent bug, not just a fade-timing
  preference.** Their decal render branch used the shared `alpha` variable (which includes the
  85%-lifespan fadeOut curve), but their `rgb` object never had an `.a` property, so
  `alpha = rgb.a * fadeOut` evaluated to `NaN`. Canvas silently ignores an invalid `globalAlpha`
  value, meaning bones/skulls were actually rendering at whatever opacity happened to be left over
  from the previous draw call — undefined behavior, not a controlled fade. Fixed by hardcoding
  `globalAlpha = 1` for this decal type explicitly, and added the missing `.a:1` to the underlying
  rgb objects for correctness. They now render at full, consistent opacity for their entire
  lifespan, never fading.
- **Cleric's curse kills now get their own dedicated death treatment — a fine "evaporation" mist —
  instead of silently falling through to the generic melee default.** Cleric isn't mapped in
  `CLASS_ARCHETYPE` at all, so `resolveGoreArchetype()` was defaulting every Cleric-caused kill to
  `'WARRIOR'`, giving a curse-dissolved undead the same cut-and-arc treatment as an actual sword
  strike — despite Cleric never physically touching anything. New `'HOLY'` archetype, grounded in
  BPA's own glossary definition of "Misting" (blood atomized to a fine spray by the application of
  force) — here that force is the curse itself, not a weapon. Rendered as overwhelmingly fine mist
  using the existing `sizeMin` fine-particle capability, almost no gibs, no directional cast-off at
  all (nothing here has a swing or impact vector to align with), with a pale golden-white holy tint
  mixed into the enemy's own blood color rather than replacing it — so a species' identity (still
  green for undead/insects, still red for standard flesh) stays legible underneath the overlay.
## [1.0.200] - 2026-09-07
- **Full physics-book review: added inelastic map-edge bouncing and rotational damping for gibs,
  closing a gap confirmed open since an early review.** Physics for JS Games ch.13 gives the real
  formula for a non-perfectly-elastic wall bounce: the velocity component perpendicular to the wall
  is scaled by a restitution factor (0-1) on impact rather than simply negated. Previously gibs had
  zero boundary collision at all — confirmed months ago and left as a known gap since most marks are
  placed by scripted formula rather than true flight. Fixed now specifically for gibs (the one
  particle type with enough visual weight for a bounce to actually read): they bounce off the map
  edge with a moderate 0.42 restitution factor instead of flying straight through it. Also added
  rotational damping (`p.rotSpeed *= p.friction`, same coefficient already decaying linear
  velocity) — previously a gib's tumble rate was constant forever, spinning at full speed even
  once essentially stopped moving, which was physically inconsistent with its own decelerating
  linear velocity right next to it.
## [1.0.199] - 2026-09-07
- **Map expansion now takes longer, per request.** `grantFreeExpansion()`'s cadence stretched from
  every 3 waves to every 4 (~33% longer between extensions), keeping the same guaranteed early-game
  unlocks (waves 1-4) so the opening still feels generous.
- **Found and fixed a real balance bug while investigating wave pacing: waves 45-99 in the fixed
  wave table were a repeating block with byte-identical enemy counts every ~7-wave cycle — zero
  difficulty growth across more than half the fixed wave range.** Confirmed waves 1-44 scale
  properly (counts genuinely increment wave to wave); the growth flatlines completely starting
  exactly at wave 45. The wave-type cadences (Boss every 10, Trick every 7-offset-by-1, etc.)
  overlap irregularly rather than forming one clean repeating unit, so hand-restructuring the raw
  literal data risked scrambling which wave gets which flavor. Fixed safely instead: enemy counts
  now scale smoothly with wave number for any wave in that flat range, applied at spawn-queue
  build time rather than to the stored data — every wave's composition, flavor, and label stays
  exactly as originally authored; only how many of each enemy actually spawn grows, from the
  original count at wave 45 up to +65% by wave 99. Wave 100 (the actual milestone Boss finale) and
  every wave before 45 are completely unaffected.
## [1.0.198] - 2026-09-07
- **Confirmed ants (SWARM) already have distinct blood** — `getBloodProfile()` already routed
  SWARM/SPLITTER/SPLITMINI to a bright-green "insect hemolymph" palette, not standard flesh red.
  No change needed there; verified before assuming it needed building.
- **Zombies now bleed a distinct sickly green, separate from every other undead's shared dark
  necrotic red.** Zombie is still flagged `isUndead` for Cleric-targeting/curse purposes — this is
  purely a blood-color carve-out, checked before the generic isUndead fallback so Wraith, Skeleton,
  and Reaper keep their existing coagulated dark-red look while Zombie gets its own genre-classic
  ooze.
- **Added Monarch (🦋) — the fastest enemy in the game at speed 112**, beating the previous fastest
  (Wraith, 94). Low HP (33) and modest bounty (6), matching a fast-fragile role. Purple blood
  (`bright:'#9b5fc0'`), its own distinct profile rather than borrowed from anything else in the
  roster. Added to `generateSwarmWave()` — the "🐜 SWARM SURGE" wave type already emphasizes fast,
  numerous, fragile enemies (Swarm, Wolf, Runner), so a fast fragile butterfly fits the existing
  theme rather than needing a new wave category.
## [1.0.197] - 2026-09-07
- **Added a distinct visceral death sound (`gore_death`), separated out from the generic `death`
  sound rather than modifying it directly.** Caught a real scoping issue before shipping: `death`
  is a shared sound also used for barricades breaking and scenery (trees/rocks) being cleared —
  making that one wetter/more visceral would have made a barricade sound like a splat too. New
  case instead: layered noise body (the "splat"), a low falling tone underneath for weight, and a
  brief bandpass crack on top for texture — scaled by `goreScale` (already driving the rest of the
  death event), so a Boss's death sounds a bit heavier than a Grunt's. Wired into the actual enemy
  `die()` call site in place of the old generic sound.
- **Added a footstep-in-blood sound, grounded directly in a specific BPA passage (ch.5): "stepping
  into a pool of blood can cause spatters on the inner aspects of footwear... blood is splashed
  from one shoe to the other."** That's a real physical contact event the book treats as
  significant, not a silent non-event — new `foot_squelch` fires the instant an enemy's foot first
  contacts a fresh pool (the existing footprint-pickup trigger point), scaled a touch wetter for a
  bigger puddle via the same size-bonus already driving how many steps the trail lasts.
- Extended `AudioEngine.play()` and the `playSound()` wrapper to accept optional `worldX`/
  `intensity` params, routed through the stereo panning and reverb-send infrastructure added in
  1.0.192 — both new sounds use real spatial positioning, not dead-center like the untouched
  legacy cases.
## [1.0.196] - 2026-09-07
- **Fixed Mage whiffing shots against moving targets — a real projectile-tunneling bug, not a
  targeting/aim issue.** Traced it precisely rather than guess: the lead-prediction aim angle was
  already correct (confirmed in 1.0.181's work — `fireProjectile()` reuses the exact same angle
  computed in `update()`), and collision detection only ever tested the projectile's exact current
  position each frame against nearby enemies. Mage's `projectileSpeed` is 1400-1600 units/sec — 2.5
  to 4x every other tower in the game (Archer 320-400, Gatling 560-640, Bomber 260-300) — so at a
  typical frame step it can move further in one tick than a target enemy's own radius, letting the
  shot skip clean past a MOVING target between one position check and the next. A stationary target
  doesn't have this problem, since the single-point check has a far better chance of landing inside
  a radius that isn't also moving — matching exactly what was reported ("missed until the enemy
  stopped"). Fixed with proper swept collision: new `pointSegmentDist2()` checks distance from each
  candidate enemy to the LINE SEGMENT the projectile traveled this frame, not just its new endpoint,
  and the enemy-search radius now widens to cover that whole segment length. Applies to every
  projectile in the game, not just Mage's — any sufficiently fast shot was theoretically exposed to
  the same tunneling risk, just far less noticeably at normal tower speeds.
## [1.0.195] - 2026-09-07
- **Fixed a real bug found while modularizing "the stone guy drops rocks": Boulder was splitting
  into two 🦠 SPLITMINI microbes on death, complete with insect-green blood, instead of its own
  rock fragments.** `spawnSplitChildren()` hardcoded `'SPLITMINI'` regardless of which enemy type
  actually split — even though Boulder's own in-game description always said "splits on death like
  a heavier Splitter," implying its own distinct fragment, not a borrowed one. Added a proper
  `ROCKLET` enemy type (🪨, stats scaled from Boulder the same way SPLITMINI is scaled from
  Splitter) and fixed `getBloodProfile()` so it's correctly classified as rock/dust rather than
  falling through to standard flesh blood.
- **Modularized the split-child dispatch — the actual "make it less spaghetti" ask.** Replaced the
  hardcoded string with `SPLIT_CHILD_TYPE`, a single lookup table (`{ SPLITTER: 'SPLITMINI',
  BOULDER: 'ROCKLET' }`) now living next to the enemy config tables where it belongs. Adding a
  future splitting enemy is one new line in that table, not a new branch inside
  `spawnSplitChildren()` itself — the function's own logic never needs to change again to support
  a new split relationship. Confirmed no other code special-cases Boulder specifically (only the
  blood-profile lookup did) — enemies render generically via their own `emoji`/`radius` fields, so
  Rocklet needed no additional rendering hook to work correctly.
## [1.0.194] - 2026-09-07
- **Mage cooldown reduced 10% and damage increased 10%, all three tiers.** Cooldown:
  5400/4800/4200ms → 4860/4320/3780ms. Damage: 170/290/450 → 187/319/495. Since the ±40% damage
  variance is proportional, the min/max range scales with the new base automatically — no separate
  variance change needed. Range, slow effects, and everything else about Mage is untouched.
## [1.0.193] - 2026-09-07
- **Added skeletal remains on death — bones and skull drops, two independent probability rolls.**
  `spawnBoneDebris()`: 50% chance, 1-3 🦴 emoji scattered around the death point, each individually
  sized 1/10 to 1/5 of the enemy's own diameter. `spawnSkullDrop()`: separate 25% chance, one 💀
  sized at half the enemy's diameter. Neither is gated to a particular weapon or archetype — bones
  are a property of the body, not of what killed it — but both skip dust/construct enemies
  (`bio.isDust`), which have no skeleton to leave behind. Rendered as a new `isEmojiDrop` decal
  type, deliberately kept OUT of the existing blood hemoglobin-oxidation color pipeline (bone
  doesn't oxidize the way fresh blood does) — just a plain glyph that pops in on spawn and fades
  with its own lifespan. Persist notably longer than blood (45 minutes vs. blood's ~30) via a fixed
  `BONE_LIFESPAN`, since there's no forensic reason for bone fragments to fade on the same clock a
  wet bloodstain does.
## [1.0.192] - 2026-09-07
- **Substantially upgraded combat sound — the forensics book has essentially nothing on acoustics
  (checked directly rather than assume), so this is grounded in the physics book's kinetic-energy
  framing and real Web Audio synthesis technique instead.**
  - **Stereo panning**: new `panFor(worldX)` converts a hit's world position to a -1..1 pan value
    relative to the camera's current view — a hit on the left of the screen now genuinely sounds
    more in the left ear. Added as optional params to `tone()`/`noise()`; every existing call site
    that doesn't pass one still plays dead-center exactly as before, zero risk to the ~60 existing
    sound cases.
  - **Synthesized reverb send**: a real `ConvolverNode` fed a procedurally-generated impulse
    response (exponentially-decaying noise, same buffer-synthesis technique the existing `noise()`
    already used — no external audio file), routed only to genuinely big moments (critical hits,
    Mage) via an optional `reverbSend` param, so most sounds stay dry and punchy while the big hits
    get real spatial weight.
  - **Impact sound now scales with the same `hitPower`/`isCritical` roll already driving the blood
    visuals** — previously combat sound was static per weapon type regardless of how hard a hit
    actually landed, the one place the "sync numbers/visuals/audio to the same roll" pattern hadn't
    reached. New `playImpactSound()`, distinct timbre per archetype reasoned from kinetic energy
    (sharper/faster impacts get brighter high-frequency noise, heavier/slower ones get more
    low-end) rather than just louder copies of one generic sound: Blade sharp/bright, Blunt
    low/dull, Pierce thin/focused, Archer soft/understated (matching the same "modest external
    signs despite real damage" forensic point behind its dark entry-wound mark), Mage layered
    shimmer+weight scaling hardest of any archetype (matching its ±40% variance band), Explosive
    a heavy low thud. Hooked into `applyDamage` at the exact point `decalArch`/`hitPower`/
    `isCritical` are already computed — no new state needed.
## [1.0.191] - 2026-09-07
- **Fire-DOT now interacts with blood for the first time — a burning enemy's ground pools render
  darkened and sooty instead of the normal fresh blood tone.** Scanned BPA's full chapter list for
  unexplored material and found "Effects of Fire and Soot on Bloodstains" (ch.9): blood exposed to
  active heat/soot appears distinctly darker than an ordinary stain, and the two are visually
  sequenced differently at a real scene. Checked the existing burn-tick handler and confirmed it
  had zero interaction with blood at all — a burning enemy bled the exact same bright color as a
  non-burning one. New `bloodTintForFire(enemy, baseHex)` checks `burnUntil > gameTime` and swaps
  in a sooty near-black (`#170d08`) in place of the enemy's normal blood-dark tone. Wired into all
  three ground-pool decal call sites (bleed-tick, hit-time, death-time) — the most visually
  prominent, persistent marks — rather than every single spawn call across the file, keeping the
  change contained while still being clearly visible during an active burn.
## [1.0.190] - 2026-09-07
- **Void patterns implemented for Mage's streak cone — the first real gap-in-the-pattern effect
  in the game, previously deferred twice for lacking safe access to nearby-enemy data.** BPA
  ch.9-10: an absence of blood in an otherwise-sprayed area, caused by another body physically
  blocking the spray at the instant of the hit. Root blocker resolved: `enemyHash` (the spatial
  query structure used for tower targeting) was only ever a per-frame local inside the main loop,
  inaccessible from deep inside `Enemy.prototype.applyDamage()`/`die()` without threading a new
  parameter through every call site. Hoisted it to module scope instead (assigned fresh each frame,
  same timing as before) — a much smaller, safer change than rewriting `applyDamage`'s signature.
  Mage's streak loop now queries the small local neighborhood once per hit (not once per streak),
  and any individual streak whose ray would pass within another active enemy's own radius before
  reaching its landing distance is simply skipped — a real, physically-grounded gap rather than
  every streak always drawing regardless of what's standing in the way. Scoped to Mage only for
  now as a clean first implementation; extending to other archetypes is a small follow-up given the
  core plumbing is now in place.
## [1.0.189] - 2026-09-07
- **Added a genuine dark "entry wound" mark for Archer, grounded in a specific book passage that
  hadn't been mined yet.** BPA ch.2 ("Stab Wounds"/"Gunshot Wounds"): puncture wounds are deeper
  than they measure on the surface, and "abdominal stab wounds, even fatal ones, rarely have
  significant external bleeding" — the same section notes low/moderate-velocity penetrating wounds
  (an arrow, nowhere near the >2000 ft/s "near amputation" threshold) bleed "quite modest[ly]"
  externally despite real lethality. New `spawnPunctureMark()`: a small, dark near-black point
  (`#1a0505`), deliberately understated rather than the bright arterial red used everywhere else —
  the actual visible blood comes from the separate spray/satellite/drip/back-spatter layers around
  it, matching the book's point that the entry point itself looks modest even when the wound is
  serious. Replaces a call that had genuinely existed for a while (`spawnDecal(..., true)`,
  reusing the standard colorful blob decal at high opacity) whose OWN comment already promised
  "a small, concentrated dark mark right at the wound" — the code just never actually delivered
  a distinct dark mark until now; this makes it match what it already claimed to do. Archer is now
  the only archetype with this specific "dark pinprick + scattered pale halo" signature — Blade's
  mark is a linear cut, Blunt's a round crush, Mage's a wide cone.
## [1.0.188] - 2026-09-07
- **Walking blood trail now actually appears while an enemy has an arrow-induced bleed status,
  not just when it's below 40% HP.** Found the real gap: the ongoing drip system was gated
  entirely on low HP — a freshly arrow-struck enemy at, say, 70% HP with an active bleed produced
  no walking trail at all, even though it was genuinely bleeding. Widened the trigger to
  `hp < 40% OR bleedUntil > gameTime`, so any bled enemy now leaves a trail regardless of overall
  health. Also scatters a couple of extra, much finer flecks slightly off the main drip line while
  moving — a person walking with an open wound doesn't drip in one perfectly straight thread, real
  trails scatter a bit side to side with each step.
- **Bleed is now cumulative — multiple arrows stuck in the same target add to the bleed rate
  instead of just refreshing to whichever hit was strongest.** `applyBleed()` previously took
  `Math.max()` of the new and existing damage-per-tick (explicitly "doesn't stack"); it now adds
  them together, capped at 4 stacks (`bleedStackCount`) so a fast-firing Archer can't compound this
  into an unbounded instant death spiral — a real body also only has so much blood pressure to lose
  regardless of how many wounds are open. The cessation-taper clock (`bleedStartedAt`) only resets
  on the very first arrow, so a second or third one stacking onto an existing wound doesn't restart
  the taper from scratch. Stack count resets to 0 once the bleed fully expires.
## [1.0.187] - 2026-09-07
- **Added an animated "still bleeding" indicator — jumps out, wiggles, then fades over 2 seconds,
  firing roughly every 20 seconds while an enemy's bleed status is active.** New `spawnBleedIcon()`,
  distinct from the existing plain-text status reminder (`🩸 BLEEDING`, which still fires separately
  every 120s) — this one is a genuinely animated 🩸 emoji: a quick overshoot-bounce scale-up in the
  first 20% of its life, a decaying side-to-side wiggle through the middle, and a fade only in the
  final 30%. Reuses the existing pooled `floatingTexts` array (a new `isIcon` flag distinguishes it
  in `drawFloatingTexts`) rather than a separate system. Note: shares the same 100-slot pool as
  every other floating combat number, so during a very dense wave with lots of simultaneous hits,
  a bleed icon could occasionally get its pool slot recycled before its 2-second animation finishes
  — the same trade-off every other floating text already has, not something unique to this feature.
  The "tiny driblets" half of the request was already covered by the existing cardiac bleed-tick
  system (1.0.164), which spawns small drip particles every 420-900ms while bleeding — no changes
  needed there.
## [1.0.186] - 2026-09-07
- **Mage's base damage doubled across all three tiers**: 85→170, 145→290, 225→450. Since the ±40%
  damage variance (1.0.182) is a proportional multiplier on top of base damage, doubling the base
  automatically scales the min/max range with it — tier 1's roll is now 102-238 instead of 51-119,
  still the same ±40% spread, just twice as powerful in both directions as requested. Cooldowns,
  range, slow effects, and everything else about Mage are unchanged — this is purely a damage buff.
- **Enhanced Mage's cast sound** to match the increased power — added a deep bass thump underneath
  the existing two-tone rising shimmer (`cast_mage`), so a rarer, now much harder-hitting cast has
  the low-end weight to match.
## [1.0.185] - 2026-09-07
- **Lowered the HUD-bar fit-to-screen floor from 0.55x to 0.4x.** Re-verified the full containment
  chain (viewport meta tag, `#game-wrapper` → `#canvas-frame` → `#hud-top`) and found it structurally
  sound — but the reported edge-clipping screenshots may have predated the 1.0.172/1.0.176 HUD
  fixes, so this is a safety-net change rather than a confirmed root-cause fix. At the old 0.55
  floor, if the bar's natural content was wide enough relative to a narrow screen, the mathematically
  required scale could fall below what the floor allowed, and the floor would win — leaving genuine
  overflow past the screen edge rather than a fully-fit bar. "Never clip" now takes priority over
  "never shrink too small," since the reported problem was content sticking out past the edge, not
  legibility.
## [1.0.184] - 2026-09-07
- **Fixed an unbounded size-stacking bug causing an occasional, forensically implausible giant
  blood pool — confirmed from screenshots showing a single splat visibly dominating over a full
  tile.** `spawnDecal`'s rare "bigger pool" tier (a ~4% chance, `sizeMult` 1.7-2.6x) was multiplying
  on top of the archetype size multiplier with no combined cap — Mage's own multiplier is already
  1.75x (the largest of any archetype), so a rare-tier roll landing on a Mage hit could reach
  2.6*1.75 = 4.55x base size. Added a hard ceiling of 3.2x on the FINAL size after both multipliers
  are applied, universally across every archetype — Mage's rare-tier pool is still the largest
  possible splatter in the game (above any other archetype's own 2.6x rare-tier ceiling on its
  own), it just can no longer compound unbounded when both the rare roll and the archetype
  multiplier land at the same time.
## [1.0.183] - 2026-09-07
- **Blunt-trauma shockring is no longer a full 360° circle.** Confirmed it was already correctly
  scaled by the min/max damage variance system (`hitPower`), but the ring itself was hardcoded to
  `ctx.arc(..., 0, Math.PI*2)` — a complete circle biased equally in every direction, including
  straight back toward the attacking tower. Real displaced blood from a blunt impact biases toward
  the far side of the blow, not equally toward whatever struck it. `spawnShockring()` now takes an
  optional `angle`/`arcSpan` pair: the arc is centered on `impactAngle` (the blow's actual direction
  of travel) and spans roughly 205° for the primary ring, 145° for the smaller secondary echo —
  more than a half circle so it doesn't look clipped, but genuinely biased away from the source
  rather than a full ring. Omitting both parameters preserves the old full-circle behavior for any
  future caller that doesn't pass them. Applied to all three existing call sites (hit-time primary
  ring, hit-time secondary echo, and death-time ring).
## [1.0.182] - 2026-09-07
- **Fixed footprints essentially never appearing despite large, visible areas of blood on the
  ground — a real bug, not a rarity tuning issue.** `spawnBloodCastoff` (the big dramatic radiating
  lines dominating recent screenshots) anchors its decal at the impact point, but the visible line
  reaches up to ~100px away for Mage's biggest streaks — yet it never set `footprintRadius`, so
  `updateWalkingBlood`'s pickup check only looked within ~20-30px of that anchor. An enemy standing
  at the far end of a long, clearly-visible streak registered as nowhere near any blood at all.
  Added `footprintRadius` to `spawnBloodCastoff` (set to the line's own `maxLen`) and
  `spawnDripTrail` (same anchor-vs-visual-extent issue, smaller scale), plus minor completeness
  additions to `spawnCastOffArc`/`spawnSatelliteDrops`'s individual drop decals. This should now
  apply to every blood type, matching what was asked — the pickup logic itself was never
  weapon/archetype-specific, it just couldn't see past a decal's own anchor point before.
- **Mage now has the widest damage variance band of any tower: ±40% (0.6x-1.4x), vs. ±20%
  everywhere else.** Its rare, high-stakes shots should feel the most volatile — a real dud or a
  real haymaker — matching its "rare, devastating shots" identity more than a tightly-banded roll
  would. Still symmetric around 1.0 and still a fixed proportional band (scales identically at
  every tier), so average DPS is unaffected — this only widens hit-to-hit spread specifically for
  Mage. Updated the streak-count `dmgRollT` calculation (1.0.181's "1 to 4 lines" feature) to match
  the new 0.6-1.4 range instead of the old hardcoded 0.8-1.2.
## [1.0.181] - 2026-09-07 — HOTFIX
- **Fixed a serious regression from 1.0.179: Mage could stop attacking entirely.** The previous fix
  made Mage's `findTarget()` return early and skip re-evaluation completely as long as its current
  target stayed `.active` and in range — an absolute lock with no path back to normal scanning. If
  that very first lock ever landed on a target Mage structurally couldn't damage for any reason
  (there's a known separate unresolved issue in this codebase about some towers failing to hit
  targets behind barricades), Mage would stay stuck on that unreachable target forever, since
  nothing could ever trigger a re-scan — the normal retargeting churn that used to accidentally
  paper over this was exactly what got removed. Replaced the hard lock with a much wider hysteresis
  margin instead (6.0x for positive-score modes, 0.35x for negative/CLOSEST, vs. 1.15x/0.85x for
  every other tower) — the full scan-and-compare flow still runs every frame, so Mage can always
  self-correct, it just takes a drastically better-scoring target to actually pull it away
  mid-charge instead of a minor 15% edge. Every other tower's targeting is unchanged.
## [1.0.180] - 2026-09-07
- **Fixed the actual visual source of Mage's "resetting" cast — a pose snap, not a data reset.**
  1.0.179 confirmed `chargeProgress`/`cooldownTimer` never reset on target loss/change. What DOES
  reset: `staffAngle` (and the arm angle feeding it) switched between "aimed at target" and a
  separate upright "idle" pose the instant `hasTarget` flipped false — which happens naturally once
  Mage sits fully charged waiting for a target for more than 500ms (very common given its 4.2-5.4s
  cooldown), or the moment a new target appears. The glowing charge orb is drawn at the staff's tip,
  so that pose snap physically moved it to a different screen position each time — reading exactly
  like the whole cast restarting even though the charge percentage itself never moved. Fixed at both
  the data and render layer: `this.angle` no longer snaps to the idle pose for Mage specifically
  (it now holds its last aimed direction indefinitely while waiting for a target), and the staff/arm
  render now always points along `angle` unconditionally instead of branching on `hasTarget`. The
  charge-up is now visually continuous regardless of target presence or changes, exactly as
  requested. No other tower type's angle or pose logic is affected.
## [1.0.179] - 2026-09-07
- **Fixed Mage's attack visibly "resetting" mid-charge.** Traced the actual state first before
  touching anything: `chargeProgress`/`cooldownTimer` were confirmed to have zero dependency on
  target identity — they were never actually being reset. The real cause was `findTarget()`'s
  standard 15% hysteresis margin being re-evaluated every frame for every tower, including Mage —
  fine for towers that fire in under a second, but Mage's cooldown is 4.2-5.4s, by far the longest
  charge window in the game. Over that stretch it's easy for a faster/closer enemy to edge out the
  current target's score by more than 15% at some point, silently swapping `this.target` mid-charge
  — and since the aim angle re-predicts toward whichever target is currently selected every frame,
  that swap made the Mage's arm visibly snap to a totally different direction mid-cast, reading
  exactly like the attack recalibrating from scratch. Mage now locks onto its target for the
  entire charge-up once acquired, skipping the re-scan entirely as long as that target stays alive
  and in range — only re-evaluating when it actually dies or leaves range, never because a
  better-scoring target happened to wander by. Every other tower's targeting is unchanged.
## [1.0.178] - 2026-09-07
- **Archer now has real back-spatter, at both hit-time and death-time.** Checked the book's actual
  attribution rather than assuming: BPA ch.7 ties forward+back spatter specifically to gunshot-type
  high-velocity PENETRATION — which is Archer's real-world analog (an arrow/bolt puncture), not
  Mage's magical blast. Mage got this treatment first, but Archer is the textbook case for it and
  had none. Added a smaller, shorter-range burst fired back toward the tower on every Archer hit
  and kill, matching the book's described asymmetry (back-spatter is markedly less voluminous than
  the forward exit spray, not a mirrored burst in both directions).
- **`spawnParticles()` gained an optional `sizeMin` parameter** (defaults to `undefined`, reproducing
  the original 2-4px range exactly for every existing call site) so a caller can request genuinely
  fine mist droplets instead of the standard size band.
- **Added a universal death-time atomization mist layer**, using the new `sizeMin` parameter — a
  distinct band of fine 0.5-1px particles radiating omnidirectionally on top of whatever
  weapon-specific death burst already fired, scaled by the same `goreScale` (bigger enemies produce
  more of it) as the rest of the death event. Every kill now has more visible "small particle"
  texture regardless of which archetype or weapon actually landed the blow.
## [1.0.177] - 2026-09-07
- **Fixed cast-off streak width to genuinely follow a sqrt curve, matching what the code's own
  comment always claimed but the formula never actually did.** `widthMult` was `1 + (sizeMult-1)*
  0.55` — linear, not sqrt, so it barely flattened growth at high sizeMult. This is exactly why
  Mage's radiating streaks (sizeMult 3.0-4.2, the largest in the game) read visibly bolder/thicker
  than intended — BPA explicitly describes cast-off as "linear," i.e. a thin line regardless of
  length. Changed to `1 + (Math.sqrt(sizeMult) - 1)`, a true sqrt relationship: Blade's existing
  range (sizeMult 0.4-2.1) is barely affected, while Mage's long streaks get meaningfully thinner
  without losing any length — only width flattens.
## [1.0.176] - 2026-09-07
- **Cleaned up inconsistent HUD button sizing from the 1.0.172 one-line fix.** Two separate root
  causes: (1) none of the HUD buttons had `white-space:nowrap` or `flex-shrink:0`, so on top of the
  intentional outer `transform:scale()` fit, the browser was ALSO independently flex-shrinking each
  button below its own natural content width — "Next Wave ▶" has the longest text, so it was the
  one that visibly wrapped into two lines, while shorter buttons just looked slightly squeezed
  instead. Added `#hud-top > *{flex-shrink:0;white-space:nowrap;}` so every button keeps its
  natural size and never wraps internally — the outer scale is now the ONLY thing responsible for
  fitting the bar to the screen, instead of two competing sizing mechanisms fighting each other.
  (2) `.hud-btn` (Pause/1x), `.hud-action-btn` (Build/Shop/gear), and `#nextWaveBtn` had three
  different min-heights (36px/38px/42px) — unified all three to 38px for one consistent button
  height across the whole bar.
## [1.0.175] - 2026-09-07
- **Added a discrete critical hit tier** — separate from the continuous `hitRoll`/`hitPower`
  variance (1.0.168, 1.0.170): a 10% chance per hit of `isCritical`, giving hitPower/cutSize a flat
  1.35x boost (mutually exclusive with the anomalous-minimal roll) and its own floating combat-text
  treatment (💥 prefix, gold color) distinct from normal and holy-bonus damage numbers. Closes the
  "maybe a crit" item that had been sitting open since it was first mentioned.
- **Added the "wipe" pool-disturbance mechanic — BPA distinguishes this from the existing footprint
  "swipe" system, and previously only swipe existed.** A swipe is a bloody object depositing new
  marks on clean ground (the existing footprint trail, correctly modeled). A wipe is the opposite:
  something passing through ALREADY-wet blood disturbs the stain itself. Layered into the existing
  throttled `updateWalkingBlood` pickup-check loop (no new per-frame cost) — when a moving enemy
  steps into a fresh pool decal, its blobs now nudge slightly along the enemy's direction of travel
  and shrink a touch each time, so a pool a creep walks through visibly smears and thins in its
  wake instead of sitting untouched forever.
- **Added expirated blood as its own forensic mechanism (BPA ch.8)** — blood mixed with air from a
  throat/chest wound, mechanically distinct from puncture/blunt/slash spatter and not tied to which
  weapon delivered the killing blow (a sword, arrow, or mace can all plausibly catch the airway).
  New `spawnExpiratedMist()`: a fine pale pink air-diluted mist plus a few faint near-static white
  "bubble" specks. Fires as an occasional (15%) additive flourish layered on top of whatever
  weapon-specific death gore already fired — never replaces it, gated off for dust/no-arterial
  enemies and low-detail deaths.
## [1.0.174] - 2026-09-07 — HOTFIX
- **Fixed a boot-crashing regression from 1.0.172 that prevented the game from starting at all.**
  `fitHudTopToOneLine()` referenced the outer `livesVal`/`goldVal`/`waveVal` consts, but was called
  immediately at script load (`fitHudTopToOneLine(true)`, line ~6671) — well before those consts
  are actually declared (line ~6922), throwing `ReferenceError: Cannot access 'livesVal' before
  initialization` and halting the entire script. Fixed by having the function look elements up
  directly via `document.getElementById()` instead of relying on the outer consts, which
  decouples it from declaration order entirely regardless of where or when it's called. My error —
  the 1.0.172 syntax check (`node --check`) caught malformed JS but couldn't catch a temporal-dead-
  zone runtime error, since that only surfaces on actual execution, not static parsing.
## [1.0.173] - 2026-09-07
- **Added serum separation rings to pooled bloodstains — a real, distinct forensic detail (BPA
  ch.9, "Clotting of Blood") that had been referenced from an external AI's fictional code review
  but never actually verified or built.** Grepped the live file for "serum"/"clot" and confirmed
  zero hits before implementing. As a real clot retracts, it squeezes out the remaining liquid
  serum, which spreads slightly beyond the clot's own edge as a thin, translucent pale-yellow halo
  — deliberately separate from the existing skeletonization rim (which darkens the stain's OWN
  edge); serum sits just outside it. Windowed to the wet clot-retraction period only: onset within
  the first couple minutes of real clotting, fully gone again by the point a stain reads as fully
  dried (matched to the same 40%-of-life mark the existing color-aging curve settles at). Gated to
  pools with genuinely sized blobs (`r > 2.5`) — real serum separation isn't visible on fine spatter
  flecks, only larger pooled stains.
- **Bleed-tick spurts now weaken as a creep's OVERALL blood volume drops, not just as the current
  wound ages.** `beatIntensity` was previously scoped entirely to the individual wound's own
  cessation taper — a creep already worn down to a sliver of HP by earlier hits still spurted at
  full "just opened" strength from a freshly-reapplied bleed. New `hypoDamp = 0.4 + 0.6 *
  (this.hp/this.maxHp)` factor floors at 0.4 (even a dying creep still visibly bleeds, just weakly,
  never fully silent) and scales down toward that floor as overall HP drops — matching real
  hypovolemic shock, where a body running low on blood simply has less pressure left to spurt with,
  regardless of how fresh any one wound is. Closes a gap self-flagged during an earlier review pass.
## [1.0.172] - 2026-09-07
- **Top HUD bar (Build/Shop/gear, hearts/gold/wave stats, Pause/1x/Next Wave) no longer wraps onto
  a second row on narrow mobile screens — it now always stays on one line, scaling the whole bar
  down proportionally instead.** Previously `#hud-top` used `flex-wrap:wrap`, which caused Next
  Wave and other controls to spill below the stat readouts on phone-width screens. Switched to
  `flex-wrap:nowrap` and added `fitHudTopToOneLine()`, which measures the bar's natural unwrapped
  width against the available screen width and applies a single `transform:scale()` to the whole
  bar if it doesn't fit — every button keeps its exact proportions and icon/text relationship, just
  smaller as a unit, floored at 0.55x so it never shrinks past legibility. Guarded with a cheap
  fingerprint of just the gold/lives/wave text (the only things that could change the bar's natural
  width mid-game) so the expensive re-measure only actually runs when that fingerprint changes or
  on resize/orientationchange — not on every `updateHUD()` call, which fires on every kill/hit and
  could be many times a second during a dense wave.
## [1.0.171] - 2026-09-07
- **Blade cast-off is now dampened on a tower's genuinely first-ever hit, grounded directly in a
  cited forensic passage (BPA ch.8): "the initial blow generally does not produce sufficient
  exposed blood on the weapon to produce cast-off bloodstains."** Cast-off specifically requires
  blood already coating the weapon from a prior strike — it's distinct from the wound's own spatter,
  which happens on hit one same as any other. Added `sourceTower.weaponBloodied`, tracked per-tower
  (not per-enemy — a blade doesn't get wiped clean between victims mid-battle): the very first hit
  any given Swordsman/Axeman lands, ever, produces a cast-off line/arc at ~22% normal size; every
  hit after that (on any target) is full-strength, since the blade stays bloodied for the rest of
  the fight. The wound-source particle spray is untouched by this — only the weapon-borne cast-off
  line and arc are dampened, matching exactly what the cited mechanism actually claims.
- **Added a small, uniform "anomalously minimal hit" chance (9%) across every archetype** — not
  from a specific book formula, but consistent with its general point that real spatter volume
  isn't perfectly predictable from force alone (skin elasticity, exact strike angle, and where a
  blow lands all shift the outcome independent of raw force). `isAnomalousMinimal` multiplies
  `hitPower` (and Blade's `cutSize`) down to ~35-40% on the rare hits it triggers — the visual
  equivalent of a real solid strike that, for whatever reason, just didn't produce much visible
  blood. Gives every archetype the "sometimes it's just smaller" variance previously only Blade had
  a taste of via `hitRoll`'s ±18% band, without touching actual damage dealt.
## [1.0.169] - 2026-09-07
- **Masterwork pass: every weapon archetype now has a fully distinct ground-pool shape, not just a
  distinct hit-time particle burst.** `spawnDecal`'s elongation table only ever branched on ARCHER/
  MAGE/EXPLOSIVE — Blade, Blunt, and Pierce (all three "WARRIOR" sub-types) silently shared one
  identical pool profile, even though their particle bursts had been differentiated for several
  versions. Root cause: the `weapon` variable (BLADE/BLUNT/PIERCE) was declared inside a block that
  went out of scope before reaching the decal call. Hoisted `weapon` to the top of the hit
  resolution (computed once per hit, negligible cost) so it's available everywhere in the function,
  and gave `spawnDecal` two new branches: BLUNT is now the roundest/widest of the three melee
  weapons (matches its shockring/radial identity, `sizeMult *= 1.25`), PIERCE is now the narrowest/
  most elongated (a deep thrust gushes along one tight line, `sizeMult *= 0.85`), and BLADE keeps
  the original moderate directional-cut profile as the fallback default.
- **Death blows now also sub-branch by weapon type — previously every melee kill collapsed
  identically regardless of what actually killed it.** BLUNT deaths now get a radial burst plus
  their own shockring (echoing the hit-time BLUNT identity instead of borrowing Blade's directional
  gush streams) and slightly more gib debris. PIERCE deaths are now narrower and more forward-gush-
  heavy (fewer ambient particles, a stronger tighter stream) than the ambient Blade collapse. Blade
  keeps its existing directional-collapse treatment, now explicitly its own branch rather than the
  only option. The death-time ground pool also now uses the correct weapon-specific shape from the
  point above, instead of always falling back to the generic WARRIOR profile.
- **EXPLOSIVE (Bomber) hit-time burst now scales with `hitPower`** — the last archetype still
  firing a flat particle count regardless of hit severity, closing a gap flagged twice previously.
## [1.0.168] - 2026-09-07
- **Real per-hit damage variance added (±20% min/max roll), and it now directly drives the blood
  system instead of blood staying on a purely cosmetic random roll.** Previously `hitRoll` (the
  variable that adds "no two identical hits look the same" variety to blood) was a plain
  `Math.random()` with zero connection to actual damage — now it IS the same roll that determines
  how much damage the hit actually deals. `damageVariance = 0.8 + Math.random()*0.4`, applied to
  the base damage before armor/shield mitigation, symmetric around 1.0 so average DPS over many
  hits is completely unchanged (a Uniform 0.8-1.2 roll has a mean of exactly 1.0) — this adds
  hit-to-hit spread, it does not shift overall tower balance up or down. Because it's a fixed
  proportional band rather than an absolute bonus, it scales identically at every tower tier — a
  level-99 Mage's roll is exactly as bounded as a level-1 Archer's, so blood intensity still can't
  creep up with tower level, the original concern this whole system was built to avoid. Net effect:
  a lucky high roll now deals visibly more damage on the floating combat text number AND produces a
  visibly bigger, gorier splatter in the same hit — what the player sees numerically and visually
  now agree with each other.
## [1.0.167] - 2026-09-07
- **Mage impacts now punch through in a wide forward cone instead of scattering omnidirectionally
  or reusing the Swordsman's swing-arc geometry.** Both the hit-time and death-time Mage branches
  previously called `spawnCastOffArc()` for their radiating streaks — but that function's math
  (`arcDir`, `angularStep`, a tangent-angle offset) models blood flung tangentially off a *rotating
  swinging weapon*, which is Swordsman/Axeman's physics, not a stationary bolt's. That's the actual
  reason Mage could still read as "swordsman-flavored" even after 1.0.161 removed the shared
  shockring — the streak shape itself was still swing-derived. Dropped `spawnCastOffArc` from both
  Mage branches entirely; streaks are now straight `spawnBloodCastoff` spokes confined to a ~132°
  cone (`mageConeWidth = 2.3`) centered on `impactAngle` — the bolt's actual direction of travel —
  instead of scattered at fully random angles around the whole circle. The main particle bursts and
  satellite drops are now cone-confined the same way (`spawnParticles`'s existing `coneAngle`/
  `coneSpread` params, previously unused by Mage; `spawnSatelliteDrops`'s `biasAngle`).
- **Mage's ground pool is now a wide directional splash oriented along the bolt's travel, not a
  round blob.** `spawnDecal`'s MAGE elongation profile changed from near-round (`longMin:0.95,
  shortMin:0.85`) to genuinely cone-shaped (`longMin:1.35, shortMin:0.6`) — stays the single
  largest pool of the four archetypes (unchanged `sizeMult *= 1.75`), but now reads as a wide
  forward splash instead of a big circle, giving Mage a shape distinct from both Archer's thin
  narrow streak and Warrior's moderate cut-line smear.
## [1.0.166] - 2026-09-07
- **Every hit now gets a purely cosmetic, bounded ±18% random roll (`hitRoll`) applied on top of
  the existing severity-based scaling (`hitPower`/`cutSize`), so two hits of identical damage no
  longer produce visually identical blood.** This is intentionally separate from severity: `hitRoll`
  is plain `Math.random()` with zero relationship to actual damage dealt, tower tier, or target HP
  — it can never scale up with tower level the way a damage-based multiplier could, so a level-99
  Mage's cosmetic variance is exactly as bounded as a level-1 Archer's. Actual damage values, DPS,
  and combat balance are completely untouched by this — it only affects the visual size of
  particle counts/cut-line length, never HP subtracted. Addresses "the blood looks too predictable/
  the same pattern every time" without risking blood scaling out of control as towers level up.
## [1.0.165] - 2026-09-07
- **Swordsman's cast-off cut-line no longer draws at near-full size on a light graze.** `cutSize`
  (the multiplier on the blade's cut-line/cast-off length) had a floor of `1.1` — meaning even the
  weakest possible hit still drew the wound at ~110% of tuned base size, which is why every
  Swordsman hit read as a heavy strike regardless of how little damage it actually dealt. Floor
  dropped to `0.4` (a genuinely thin nick), ceiling trimmed from `2.5x` to `2.1x` for balance. Also
  scaled the BLADE branch's general blood-spray particle count by hit severity (`hitPower`, see
  below) — previously fixed at `12` regardless of how hard the hit landed, the one archetype branch
  this scaling had been missed on in the prior pass.

## [1.0.164] - 2026-09-07
- **Arterial bleed-tick now pulses on a cardiac rhythm instead of firing on a flat 700ms metronome.**
  A sine wave keyed to how long the wound's been open drives both tick spacing (420ms at the peak
  of a beat, up to 900ms in the trough) and spurt size together — a strong beat means a bigger
  spurt *and* a shorter wait until the next one, matching how real arterial bleeding surges and
  eases rather than dripping at constant intensity. Persistent ground marks (decal, drip trail)
  intentionally stay on the existing cessation taper rather than the beat — a permanent stain
  flickering in size with a heartbeat would look wrong; only the momentary spray pulses.

## [1.0.163] - 2026-09-07
- **Blood pools now read as genuinely thicker/more viscous for insect and undead enemies, not just
  slower-draining underfoot.** `spawnDecal()` gained an optional `viscous` parameter (defaults to
  off — every untouched call site is unaffected), reusing the existing `bio.viscous` flag already
  driving footprint friction. When set: blob count drops ~40% (fewer, chunkier clumps instead of a
  wide scatter), the center-weighting exponent tightens from 1.4 to 2.4 (blobs cluster instead of
  spreading), and the archetype's elongation blends halfway toward round (a viscous Mage hit still
  reads rounder than a viscous Archer hit, just less extreme than either would with normal blood).
  Threaded through the three call sites where `bio` was already in scope (hit-time mark, death-time
  pool, bleed-tick decal).

## [1.0.162] - 2026-09-07
- **Mage, Archer, Warrior/BLUNT, and Warrior/PIERCE hit-time gore now scales with how hard the hit
  actually was, not a fixed burst every time.** Only the BLADE cut-line previously scaled with hit
  severity (`cutSize`) — every other archetype fired identical particle/satellite/streak counts on
  a graze and a near-kill alike, which is the actual mechanism behind Mage in particular always
  reading as "maxed out." New shared `hitPower` scalar (`0.55 + flinchSeverity*0.75`, so an average
  hit still looks like the tuned baseline and only real extremes stand out) now multiplies: Archer's
  spray/satellite counts, Mage's primary bursts/satellite count/streak count/back-spatter, BLUNT's
  primary bursts/satellite count/shockring radius, and PIERCE's gush particle/stream counts.

## [1.0.161] - 2026-09-06
- **Mage damage rebalanced — the tower was badly underpowered.** Base tier damage was 6/9/13,
  which against its 5.4s/4.8s/4.2s cooldowns worked out to roughly 1-3 DPS — far below every other
  tower (Archer alone runs 27-85 DPS across its tiers) and completely out of line with the Mage's
  "rare, devastating shot" identity: it was rare, but not devastating. Raised to 85/145/225 damage
  per hit (≈14x at tier 1), landing Mage's DPS in the same range as Archer's while it keeps its own
  identity through the slow effect and now-larger impact visuals rather than through raw uptime.
- **Moved the circular shockring gore effect from Mage to Warrior/BLUNT (Hammerman/Paladin).**
  Forensically, a round/radial ring pattern is a blunt-trauma signature — a crushing weapon
  compresses a genuinely round area of impact. A magical bolt or a blade has no such surface, so
  giving Mage a ring read as generic "circular splash" rather than something specific to how the
  hit actually happened. Mage's impact identity is now pure directional streak: cast-off-arc drop
  fans (shared with Warrior's slash technique) bumped from 6-9 to 8-11 per hit, each one longer
  (2.2-3.0 → 2.8-3.8 size multiplier), so the removed ring's visual weight is replaced by more/
  longer radiating lines instead of a round shape. Warrior/BLUNT gained a modest shockring
  (18-26px) alongside its existing radial particle burst, which is the one melee case where a ring
  is the forensically correct read.
- Gave every tower archetype its own attack sound instead of two shared generic tones. Previously
  every ranged tower (Archer, Sniper, Gatling, Blowdart, Gunalinder, Squirtgun, Mage) fired the
  same `'bow'` tone and every melee tower (Swordsman, Spearman, Hammerman, Paladin, Axeman) fired
  the same `'sword'` tone; Cleric had no attack sound at all. Added 13 distinct synthesized sounds
  dispatched by actual tower type (`swing_blade`, `swing_pierce`, `swing_blunt`, `swing_axe`/
  `throw_axe`, `shot_archer`, `shot_sniper`, `shot_gatling`, `shot_blowdart`, `shot_gunalinder`,
  `shot_squirtgun`, `shot_bomber`, `cast_mage`, `cast_cleric`), plus a separate `monster_swing` for
  the Troll's tower-bash attack so it no longer borrows the Swordsman's sound.
- Separated menu/UI sounds from combat sounds and from each other. Added `ui_open`/`ui_close`
  (short up/down blips on the Build, Shop, and Settings modals — previously silent on open/close),
  and `ui_buy` (a two-note purchase chime on Buy Life and tower Upgrade, previously either a
  generic `click` or no sound). `click` is kept for lightweight taps (tabs, item slots, toggles).
  Extended the synth engine's `noise()` helper to take a filter frequency/type so several of these
  (e.g. Sniper's crack, Gunalinder's clack) layer filtered noise under a tone instead of every
  sound being a single pure oscillator sweep.
- Tightened the top HUD bar further and removed the fullscreen button. `justify-content:center`
  with an explicit `column-gap` (added in 1.0.160) still consumed more horizontal space at narrow
  widths than the old `space-between` did when there was no slack to spread, pushing "Next Wave"
  onto a second row on mobile/minimized windows. Set `column-gap` to a tight `3px` by default and
  only widen it to `clamp(6px,1.2vw,12px)` above a `640px` breakpoint, trimmed padding on all HUD
  buttons, and removed the fullscreen button (markup, its `pointerdown`/`fullscreenchange`
  listeners, and its CSS rule) entirely per direct request, freeing up enough width that
  minimized/mobile keeps everything on one row again. Also added a `<meter>` for the lives gauge
  and a `<progress>` bar for wave completion next to the existing HUD spans.

## [1.0.160] - 2026-09-06
- Fixed the top HUD bar spreading edge-to-edge on wide desktop screens. `#hud-top` used
  `justify-content:space-between` with no width cap, which stretches its children across the full
  viewport width — on a narrow mobile window there's little width to spread across so it looks
  naturally clustered, but the exact same rule spreads far apart on a wide monitor. Added
  `max-width:900px; margin:0 auto;` so the bar caps out at a fixed width and centers itself on wide
  screens, bringing the two ends much closer together, while having zero effect on any viewport
  already narrower than that (mobile is unaffected).
- Traced and fixed the real cause of the Mage "resetting its attack" complaint. The cooldown timer
  itself was never actually resetting on a target switch (confirmed: it decrements unconditionally
  every frame regardless of target, and fires the instant a target is available with cooldown
  expired) — but the visible arm/staff pose was. The grace window added in 1.0.149 was a fixed
  500ms, and with cooldowns now running 4.2-9.5s (the Mage rebalance in 1.0.144), a real gap
  between one target leaving its limited range and the next arriving routinely exceeds 500ms —
  so the pose kept snapping back to idle mid-charge every time a target cycled out, even though the
  actual charge was still counting down the whole time. That constant visual "reset" is what read
  as the tower being stun-locked and never firing, even though it should have already been firing
  correctly on whatever target happened to be in range once its cooldown expired. Fixed by tying
  the engaged pose to the cooldown itself (`this.cooldownTimer > 0`) rather than only recent target
  presence — the tower now visibly stays in its ready/charging stance for its entire cooldown,
  falling back to a genuine idle pose only once fully charged with nothing to shoot at for a real
  stretch. If enemies are still slipping through completely unhit after this, that would point to a
  real range/cooldown balance question rather than a bug — worth reporting separately if so.

## [1.0.159] - 2026-09-06
- Implemented the `WEAKEST` targeting mode — flagged as open across at least three separate
  `BACKLOG.md` entries going back several sessions, but never actually built. Added it consistently
  everywhere the existing `FIRST`/`CLOSEST`/`STRONGEST` modes are handled: both scoring functions
  (`findTarget()` and `findSecondaryTarget()`), scored as `-hp` so the shared "higher score wins"
  comparison works identically to every other mode, and added to the mode-cycling button's list.
  The UI label and save/load path both already just read/write the mode as a plain string with no
  hardcoded list to update, so this needed no other changes to show up correctly or survive a save.

## [1.0.158] - 2026-09-06
- Wired two fully-built, previously-abandoned wave generators into the procedural wave rotation:
  `generateTrickWave()` (looks like an easy opener, then springs a real threat partway through)
  and `generateGrindWave()` (long, sustained, high-total-count — tests economy over time rather
  than a reaction-check flood). Both were complete, used the exact same data format as every other
  working generator, and had zero call sites anywhere in the file — confirmed before touching
  anything. Widened the wave-variety cycle from `n % 7` to `n % 9` to include them. Purely
  additive: two more distinct wave flavors, nothing existing removed or changed in what it does.
  Honest note on the one real side effect: widening the modulo shifts which specific wave *number*
  lands on which flavor going forward, since the remainder arithmetic changes — that has no
  player-facing meaning attached to it (nothing tracks "wave 47 is always Elite type"), but it's a
  real change to the mapping, not just new content sitting inertly alongside the old.
- Removed `resetCamera()` — confirmed zero call sites anywhere in the file (same standard applied
  to the two dead color-helper functions removed in 1.0.154). Removing genuinely unreachable code
  changes zero behavior, since nothing was ever calling it.

## [1.0.157] - 2026-09-06
- Read HTML5 Games, 2nd Edition (Seidelin) Chapter 3 ("Going Mobile," p. 73, Listing 3-28)
  directly and checked its exact mobile-browser-lockdown CSS recipe against this file's real
  styles. Found a genuine, verified, purely-additive gap: `user-select:none` and
  `-webkit-user-select:none` were already present, but the book's other three properties for the
  same purpose were missing entirely — `-webkit-touch-callout:none` (suppresses the long-press
  callout menu on tappable elements), `-webkit-tap-highlight-color:rgba(0,0,0,0)` (removes the
  gray flash Android/older WebKit browsers show on tap), and `-webkit-text-size-adjust:none`
  (stops the browser auto-resizing text on orientation change). All three added to the same
  top-level `html,body` rule the existing properties were already on. Zero functional risk — these
  only suppress default mobile-browser chrome behaviors that have no place in a touch game to
  begin with, and don't affect layout, JS, or anything CSS/JS actually reads.
- Also checked the same book's Chapter 6 canvas-graphics recommendations (state stack discipline,
  curves, blend modes) against the real code: curve usage (`quadraticCurveTo`) and consistent
  `lineCap:'round'` are already applied correctly (5 and 4 real usages respectively) — confirmed
  rather than assumed. `ctx.globalCompositeOperation` (blend modes, e.g. `'screen'`/`'lighter'` for
  a genuinely luminous glow instead of plain alpha blending on magic effects) is completely unused
  anywhere in the file — a real, valid stylistic opportunity, recorded in `BACKLOG.md` rather than
  applied here, since it's a visual style choice rather than a correctness fix.

## [1.0.156] - 2026-09-06
- Read HTML5 Mastery directly (not a summary) and found a real, significant, previously-unverified
  gap: this project's own `AGENTS.md` claimed semantic HTML5 elements (`<header>`, `<nav>`,
  `<aside>`, `<meter>`, `<progress>`, `<details>`) were "already the convention" in this codebase's
  UI — a direct count found zero of any of them anywhere in `index.html`. The entire UI is 124
  generic `<div>`s. That claim was inherited from an aspirational description early in this
  project's history and never actually checked against the file — corrected in `AGENTS.md` now,
  along with the real finding that a proper fix is genuinely low-risk (CSS/JS here style and select
  by class/id, never by tag name) but deserves its own careful, one-container-at-a-time pass rather
  than a bulk rename risked in the same turn as unrelated work, since a mismatched closing tag in
  deeply nested markup wouldn't be caught by the JS syntax check this project already runs.
- Shipped the one part of that finding that's unambiguously zero-risk this turn: added `aria-label`
  to the 9 buttons in the file that are genuinely icon-only (no visible text content at all) and
  didn't have one — `settingsBtn`, `fullscreenBtn`, `inspExpandChevron`, `inspClose`,
  `statsInfoBtn`, `barricadeInfoBtn`, `towerModalClose`, `shopModalClose`, `settingsModalClose`.
  Buttons that already have visible text alongside their icon (`buildBtn`: "🏗️ Build", etc.)
  already had an adequate accessible name and needed nothing added.
- Added a "Code map" section to `README.md`: direct GitHub links into specific lines of
  `index.html` for every major section and several specific systems people actually go looking for
  (`CONFIG.TOWERS`, `class Enemy`, `spawnDecal()`, the main loop, etc.), with an explicit caveat
  that line numbers drift as the file changes and the section-header comment above a given spot is
  the reliable anchor if a link lands slightly off.
- Added two durable principles to `AGENTS.md`: `CHANGELOG.md` outranks inline comments when the
  two disagree about why something is the way it is (comments can silently go stale as code
  changes around them — directly motivated by the two stale comments found and fixed in 1.0.155;
  the changelog is dated, versioned, and append-only by this project's own discipline, so it's the
  more reliable record), plus explicit guidance for an AI agent working with a smaller effective
  context window than Claude's (read the file's own navigation aids before reading code, search
  for specifics instead of reading broad ranges, state uncertainty plainly instead of guessing).

## [1.0.155] - 2026-09-06
- Fixed two stale comments found via a direct audit against Clean Code's own warning ("the older
  a comment is, and the farther away it is from the code it describes, the more likely it is to be
  just plain wrong"): two comments near the follow-speed-cap buffer and radius-aware spawn spacing
  still described Swarm's radius as 12px, left over from before the enemy size-tier redesign
  changed it to 9px a few versions ago. The formulas themselves were never wrong (they read
  `.radius` live off the enemy, so they auto-adjusted correctly) — only the illustrative numbers in
  the comments explaining *why* the formula exists had gone stale. No behavior change, pure
  documentation-accuracy fix.

## [1.0.154] - 2026-09-06
- Removed two confirmed-dead color helper functions (`jitterColorLightness()`,
  `darkerJitteredColor()`) — verified zero call sites anywhere in the file (not even a stale
  reference) before removing; superseded by `colorAtLightness()` when the tower skin-tone system
  was reworked earlier this session, but the old functions were never cleaned up.
- Found and fixed real, verified code duplication: `toCanvasCoords(e)` — a helper that converts a
  pointer event to world-space coordinates — sat completely unused while its exact two-line
  computation (`toRawCanvasCoords()` + camera pan/zoom adjustment) was manually copy-pasted at
  five separate call sites across the pointer-drag, hover-preview, and scenery-hover-price
  handlers. Consolidated all five onto the existing helper. Pure textual substitution with
  identical runtime output at every site — verified each one computes exactly the same values as
  what it replaced before making the change, not just that it looked equivalent.

## [1.0.153] - 2026-09-06
- Found and fixed a real, verified consistency gap while re-reading the Canvas 2D performance
  chapters against the actual rendering code: `ctx.shadowBlur` (a genuinely expensive per-pixel
  operation) is already correctly gated behind the Low-graphics setting in a couple of places, but
  the Mage's magic-missile projectile render used both `shadowBlur` *and* a per-frame
  `createLinearGradient()` allocation with no gate at all — Low graphics mode was silently not
  saving anything on the one projectile type that actually used the expensive path. Added the same
  gate used elsewhere: Low graphics now renders the missile with a flat stroke/fill (same silhouette,
  no gradient allocation, no shadow blur). Applied the same gate to the ground-item glow for full
  consistency (lower real impact there, since ground items are few and short-lived, but the setting
  should mean the same thing everywhere it's checked).
- Confirmed (rather than assumed) that `updateHUD()`/`refreshTrayUI()` are correctly event-driven
  — called only from the ~23 real gameplay events that actually change gold/lives/wave/tray state,
  never from the render loop — so no further action needed there; this matches the same
  event-driven-not-polled principle that motivated the `updateTargetFrame()` fix in 1.0.152.

## [1.0.152] - 2026-09-06
- Fixed a real, verified performance issue: `updateTargetFrame()` ran unconditionally at the top of
  `render()` (every single frame, 60fps) and did two `getBoundingClientRect()` calls (forcing
  synchronous browser layout) plus six unconditional DOM text/style writes every time, regardless
  of whether the target, its stats, or the panel's on-screen position had actually changed. Added a
  dirty-check: text/HP-bar content now only writes to the DOM when the underlying values
  (target identity, HP, armor, speed) actually change, and the expensive geometry recompute only
  runs when the frame just became visible or the layout may genuinely have moved (window
  resize) — not every frame regardless of state. No visible behavior change; the target nameplate
  still updates in real time whenever its values do.

## [1.0.151] - 2026-09-06
- Fixed the between-TYPE size hierarchy (ants smaller than Grunts, Tank/Boulder bigger than
  Grunts, etc.) being drowned out by the individual per-spawn size variance added in 1.0.150. That
  variance (±20%) was wide enough to overlap between adjacent types — every type's base radius was
  squeezed into a narrow 10-20px band except Boss, so a big Swarm (12×1.2=14.4) and a small Grunt
  (16×0.8=12.8) could land at nearly the same rendered size, erasing the type-level distinction the
  request was actually about. Two changes together fix it: widened the base radius values into
  clear tiers (mini 8-9 / small 11-14 / standard 14-16 / big 19-23 / huge 34 for Boss), and
  tightened individual variance from ±20% down to ±12% so it no longer crosses tier boundaries.
  Checked the resulting ranges directly: Swarm's largest possible individual (10.1px) is now well
  below Grunt's smallest (13.2px), and Tank's smallest (19.4px) is well above Grunt's largest
  (16.8px) — the type hierarchy is now reliable, not just usually-true. The HP/bounty stat
  correlation from 1.0.150 was rescaled to match the new, tighter variance range (still 0.9x-1.1x
  HP / 0.93x-1.07x bounty end to end). No changes needed anywhere else — the radius-aware spawn
  spacing and follow-speed-cap buffer formulas from earlier versions are written generically
  relative to a reference size rather than hardcoded per type, so they scale correctly with the new
  values automatically.

## [1.0.150] - 2026-09-06
- Added natural per-instance size variance to every enemy type. Radius (and therefore rendered
  size, since the emoji font size already derives from `this.radius` directly) was previously a
  fixed constant straight from `CONFIG.ENEMIES`, identical for every individual of a type — the
  only size variation that existed at all was the rare 0.5% golden "Big" variant. Now every
  ordinary spawn rolls 80%-120% of its type's base radius, so within one Swarm wave some ants
  genuinely read smaller and some bigger, not just uniformly identical. A modest, fair stat
  correlation goes with it — a smaller individual has proportionally less HP (0.85x-1.15x range)
  and is worth slightly less bounty (0.9x-1.1x), so a smaller hitbox isn't a free lunch for
  squeezing through congestion with no tradeoff. Skipped for the golden Big variant, which keeps
  its own distinct, consistent 1.4x scale-up rather than layering two separate size systems.
  Nothing else needed to change — all the pathing/collision code already reads `e.radius` live off
  each enemy instance rather than a fixed per-type lookup, so per-instance variance drops in
  cleanly on top of it.

## [1.0.149] - 2026-09-06
- Fixed the Mage attack pose (and every ranged tower's) visibly resetting to idle every time it
  briefly lost a target — even between two kills a frame apart. `this.angle` and `extra.hasTarget`
  (which drives the whole arm/staff pose, not just the aim direction) both snapped straight back to
  idle the instant `this.target` became null, then re-engaged the moment a new target was found —
  reading as the whole attack animation restarting constantly, even though the underlying cooldown/
  charge (fixed in 1.0.146) was never actually reset. Added a 500ms grace window
  (`recentlyEngaged`, anchored on `lastTargetTime`): losing a target now holds the last aim angle
  and engaged pose for half a second before falling back to idle, so a brief gap between targets no
  longer visibly resets the animation.
- Added a second, independent lever against on-path bunching, on top of the speed-based type
  reordering from 1.0.148: small, numerous enemy types (Swarm, Splitmini) still visibly bunch even
  with the mixed-speed catch-up problem eliminated, because their tiny radius means many of them
  physically fit within collision-trigger range of each other at the same flat spacing that's
  plenty of room for something bigger. Added a radius-aware minimum spawn gap, applied after the
  speed-based type reassignment so it reflects whichever type actually ended up in each slot — a
  Swarm-sized enemy (12px radius) now gets a meaningfully wider gap from the spawn before it than a
  standard 16-18px enemy does, while nothing changes for anything at or above that size.

## [1.0.148] - 2026-09-06
- Reordered wave spawn types by speed instead of leaving them in whatever order each curated/
  procedural wave's groups happened to list them in. A slow unit (Tank, Boss) spawning ahead of a
  faster one (Runner, Swarm) meant the faster unit inevitably caught up to it on the path and had
  its own speed capped to match (`followSpeedCap`, added in 1.0.139) — a direct, entirely avoidable
  contributor to visible on-path bunching, and one that happened on nearly every wave with mixed
  unit types, exactly as reported. Fixed at the source: after a wave's spawn queue is fully built
  and timed, the enemy *types* (not their delays/timing — every spawn still happens at the exact
  same moment as before) are reassigned across the queue so speed strictly decreases from the
  first spawn to the last. A fast unit now never spawns behind something slower in the first place,
  so it never needs to catch up and get capped by it.

## [1.0.147] - 2026-09-06
- Widened scenery size variance — `minScale`/`maxScale` was 1.0-1.3 (only a 30% size range, and no
  way to ever roll smaller than "normal"), which is why some pieces looked bigger than others but
  none looked genuinely small. Now 0.6-1.6, so a real range of small saplings/pebbles up through
  large old growth is possible. Clear cost/time still interpolate proportionally across the new
  range automatically (a small 0.6-scale piece is now correctly cheaper/faster to clear too, not
  just visually smaller).
- Added a distinct tall/stretched tree variant (25% of trees, 1.15-1.5x) — a genuinely different
  silhouette from just "a bigger tree," rolled independently of the normal size scale so a tree can
  be small-and-tall, large-and-stretched, or any other combination. The stretch is anchored at the
  tree's base rather than its center, so the trunk stays correctly planted at ground level while
  only the canopy extends upward — scaling from the center instead would have sunk the trunk into
  the ground as the tree got taller, which is the "correct layers" this was asking for.

## [1.0.146] - 2026-09-06
- Fixed a real aim mismatch on every ranged tower, most visible on Mage since its shots are now
  rare enough for a miss-looking hit to actually be noticed: the visible weapon rotation
  (`this.angle`) aimed straight at the target's *current* position, while the actual projectile
  fired along a lead-predicted angle accounting for the target's velocity (`fireProjectile()`).
  Against a moving target those two angles diverge, so the tower visibly aimed one way while the
  shot flew another. Unified them — the weapon now rotates using the same lead-predicted angle the
  shot will actually use, computed once per frame and reused directly in `fireProjectile()` instead
  of being recalculated a second time (guaranteeing they can never drift apart again).
- Added a real answer to "the charge should happen even if not targeting": Mage's cooldown was
  already ticking down regardless of whether a target existed (that part was never actually
  broken), but there was zero visual feedback of it — so during the new, much longer wait between
  shots the tower looked idle/unresponsive right up until it suddenly fired. The staff-tip orb now
  visibly grows and brightens continuously as the cooldown counts down (`chargeProgress`, driven
  purely by `cooldownTimer`/`cooldown`, with no dependency on having a target), with a fast white
  flicker in the final 15% before release. The long wait now reads as deliberate build-up instead
  of looking broken — and this should also make the "high-impact blood barely shows up" complaint
  resolve on its own, since it was really "the tower doesn't look like it's doing anything for 5-9
  seconds," not that the (already-amplified) hit effects themselves were too weak.
- Tightened the stall-watchdog failsafe added in 1.0.140 in response to continued reports of mixed-
  unit-type corner pileups: checks twice as often (every 500ms instead of 1000ms) and intervenes
  after ~1.5s of real stall instead of ~3s, with a stronger correction nudge (32px, up from 24) so
  it actually clears a mixed-size pileup rather than just inching forward. The "no real progress"
  threshold is now scaled to each enemy's own radius instead of a flat 3px, so a large Tank/Boss
  crawling a few pixels isn't mistaken for a stall the way a tiny fast Swarm doing the same
  genuinely would be.

## [1.0.145] - 2026-09-05
- Rebalanced Cleric (Mage's one evolution) to match Mage's new "high-impact, long-wait" identity
  instead of firing at a moderate, steady rate — the longest cooldown of any tower now, exactly as
  requested: cooldown roughly 5x (2500/2200/1900ms → 12500/11000/9500ms), damage 20% lower
  (14/20/28 → 11/16/22).
- Added a real visual match for the ability: Cleric's curse now manifests as an actual strike of
  white-hot holy light descending vertically onto the target from directly overhead, with a bright
  flash at the point of impact — not a plain colored particle puff like before. New
  `spawnHolyBeam()` reuses the shared particle pool (same pattern as the Mage shockring) so it
  costs one extra pool slot and fades on its own; only fires when the curse actually lands (not on
  a miss). The undead 5x-tick-damage bonus is unchanged.

## [1.0.144] - 2026-09-05
- Reworked Mage into a rare, devastating-shot class instead of a moderate-frequency damage dealer:
  cooldown increased exactly 5x across all three tiers (1080/960/840ms → 5400/4800/4200ms),
  damage reduced 20% (7/11/16 → 6/9/13), and projectile speed roughly doubled again on top of the
  earlier increase (660/700/740 → 1400/1500/1600 — by a wide margin the fastest projectile in the
  game; a literal 10x as originally described would put it at 6600+, which would cross the whole
  map in a fraction of a second and read as an invisible hitscan rather than a visible bolt, so
  interpreted as "dramatically faster" rather than the literal multiplier).
  **Balance note worth flagging directly**: a 5x longer cooldown combined with 20% less damage per
  hit is roughly a ~84% reduction in sustained DPS compared to before, and a similarly large drop
  in how often its slow debuff is actually applied to enemies. This is a deliberate, large role
  shift — Mage becomes an occasional, spectacular set-piece hit rather than a steady contributor —
  worth confirming that's the intended tradeoff in actual play, not just in the numbers.
  - The impact itself was amplified further to match the new rarity: more particles (36/20, up
    from 26/14), a guaranteed double shockwave ring (was a 40% chance for the second one), more
    satellite drops (7-9, up from 5-6), and more/bolder radiating streaks (4-7, up from 2-4). Same
    amplification applied to the death burst.

## [1.0.143] - 2026-09-05
- Cleaned up `updateBarricadesAndPileup()`, the pathing function that's had the most iteration
  this session: merged two pairs of loops that each iterated the same `active` array separately
  for no reason — computing `candidateBarricade` was its own pass right after building the
  `active` list even though neither step depends on the other having finished for every enemy
  first, and the same was true for the queue-position-reset pass and the claimed-slots pass right
  after the sort. Reduced from 7 full passes over the active enemy list down to 5, purely by
  combining genuinely independent, order-agnostic work — no behavior change, verified by the
  original `queueSlotDist === undefined` check in the claimed-slots loop being tautologically true
  in every case (since the very same merged loop had just set it), confirming the merge preserves
  identical results.
- Looked at two other real opportunities and deliberately left them alone rather than guess:
  the spatial hash (`buildEnemyHash()`) gets rebuilt up to 5 times per frame across swept
  collision, the 3-pass collision relaxation, and tower targeting — but each rebuild reflects a
  genuinely different point in time where positions have already changed since the last one, so
  collapsing any of them would mean resolving collisions against stale positions. Similarly,
  `queryNearby()` allocates a fresh array on every call (called dozens of times per frame) — a
  shared/reused buffer would cut that allocation pressure, but would require verifying zero
  reentrancy across every caller (`findTarget`, `updateSwordsman`, `updateClericSmite`, and others)
  to guarantee nothing reads a stale buffer mid-use, which wasn't verifiable with full confidence
  in this pass. Both are real, specific leads for a future session with room to verify them
  properly — flagged here rather than either ignored or guessed at.

## [1.0.142] - 2026-09-05
- Fixed Mage's long blood streaks reading as too thick. `spawnBloodCastoff()`'s `sizeMult`
  parameter previously scaled length and width identically, so a "longer, bolder" streak got
  proportionally thicker into more of a smear than a line. Width now scales at just over half the
  rate of length (a dampened curve), so a long streak actually reads as long and thin, the way a
  real cast-off streak should. Also pulled Mage's own streak `sizeMult` range down (1.8-2.6 →
  1.4-2.0) on top of that general fix.
- Fixed blood decals rendering on top of trees/rocks instead of underneath them. `drawScenery()`
  was called before `drawDecals()` every frame; swapped the order — blood now sits on the ground
  and scenery (a physically taller object) correctly occludes any stain directly behind it, instead
  of stains appearing painted over tree canopies.
- Removed the pulsing yellow "upgrade available" glow ring that rendered under every tower whose
  next gold-tier upgrade the player could currently afford — redundant with the tower panel's own
  scroll/upgrade indicator, and with enough affordable towers on screen at once it read as visual
  clutter rather than useful signal.
- Footprints now genuinely streak/smear rather than staying uniform round dots when an enemy has
  just stepped through a large blood pool — the first few steps out of a big pile drag an
  elongated mark that gradually shortens back to a normal print as the extra blood from that pile
  runs out, instead of every footprint (big pile or small) looking the same shape.
- On the reported bunching: the fixes already shipped this session (proportional follow-speed-cap
  buffer, stronger tangent-bias separation, single-attacker-per-barricade, and the stall-watchdog
  failsafe in 1.0.140 that forces any illegitimately-stuck enemy to keep progressing after 3
  seconds) are all still in this build and confirmed present in the code. No new structural
  pathing change went into this version specifically, since there's no new concrete lead beyond
  what's already been tried — if a Swarm-heavy wave is still visibly clumping after 1.0.139/1.0.140,
  the most useful next step would be pinpointing whether it's a hard stop (the stall watchdog
  should catch that within ~3s) or just slow/congested movement through a genuine chokepoint
  (which is closer to expected behavior than a bug).

## [1.0.141] - 2026-09-05
- Mage's projectile speed increased substantially: 520/550/580 across its three tiers, now
  660/700/740 — now the fastest projectile in the game (previously Gatling's 560-640 was faster),
  matching the "high impact, high energy" identity the blood effects have been building toward.
- Added long, bold radiating blood streaks to Mage hits and kills — previously the Mage burst was
  all particles, satellite drops, and shockwave rings, with no actual streak lines the way Warrior
  gets. 2-4 bold cast-off streaks (sizeMult 1.8-2.6, longer than even Warrior's cut) now fan out
  omnidirectionally from the impact point on every hit — omnidirectional rather than aligned to
  one strike vector, since a magical blast has no swing direction the way a blade does. Kills spawn
  3-5 of the same streaks for extra intensity on the killing blow.

## [1.0.140] - 2026-09-05
- Added a last-resort anti-bunching failsafe, independent of whatever the specific root cause of
  any given stuck-cluster bug turns out to be — this session has found and fixed several genuine
  contributing bugs to enemy clumping, but rather than continuing to chase the next possible edge
  case one at a time, added a structural guarantee that bunching can never permanently block a
  wave's progress at all, regardless of cause. `checkStallWatchdog()` tracks each enemy's actual
  path progress (`traveled`) over rolling ~1-second windows. Every *legitimate* reason an enemy
  stops advancing (queued at a barricade, stunned) is explicitly excluded up front and never
  accumulates a strike. For everything else — an enemy that isn't supposed to be blocked at all
  but has made essentially no forward progress for 3 consecutive seconds anyway — it gets a single
  forced nudge directly toward its next waypoint, bypassing the normal collision-limited movement
  just for that one correction, and the counter resets. This is invisible during ordinary play (it
  only ever fires when something has already gone wrong elsewhere) and doesn't fix any specific
  bug on its own, but it's a hard ceiling: no enemy can now be stuck in place for more than a few
  seconds, no matter what future or undiscovered issue might otherwise cause it.

## [1.0.139] - 2026-09-05
- Found a likely real contributor to the "swarm cluster stuck in a column" issue reported with
  screenshots of a Swarm wave. Two changes:
  - The follow-speed-cap's trigger buffer (how close a unit needs to be to the one ahead before its
    speed gets capped to match) was a flat 14px regardless of unit size. That's trivial for a
    Tank/Boss, but over 1.5x a Swarm's entire diameter (radius 12) — meaning a dense cluster of
    small, fast Swarm units was capping each other's speed far more eagerly than proportionally
    reasonable, cascading a "slow down and wait" chain through an entire tightly-packed group even
    when there was still plenty of physical room to keep moving. The buffer now scales with the
    pair's own combined radius (capped at 14, so larger units are unaffected), which meaningfully
    tightens the trigger range for small enemies specifically.
  - Reduced the collision-separation tangent-bias's cross-path damping from 0.45 to 0.3 — dense
    clusters of many identical-speed units (exactly what a big Swarm wave funneling through a
    single-tile entrance produces) settle faster when separation leans further into sliding past
    each other along the path instead of jostling side to side, which is what let a tightly-packed
    group keep shoving each other without making net forward progress.
  - This is a genuine improvement to a real contributing mechanism, but given how many angles this
    class of bug has had, worth confirming against fresh gameplay before considering it fully
    closed — please flag if a Swarm-heavy wave still visibly clumps after this.

## [1.0.138] - 2026-09-05
- Archer and Mage hits/kills now carry just as much visual presence as Warrior's slash, matching
  the actual request rather than the earlier interpretation of "low-impact" as "visually sparse":
  - The persistent ground-mark chance is now archetype-aware — Archer and Mage were leaving
    visibly fewer lasting marks than Warrior even though each is just as intense in its own way,
    so both now roll at 50% instead of the shared 30% (Warrior stays at 30%, since its cut-line +
    arc are already a guaranteed, substantial mark every hit).
  - Archer keeps its low-concentration puncture identity but the mist now scatters as 2-3 droplets
    per hit instead of 1, plus an occasional short graze streak — less blood *concentration*, but
    just as many visible marks, achieved through spread rather than volume. Same boost applied to
    its death burst (more drip trails, more far-flung droplets).
  - Mage gets more satellite drops per hit (5-6, up from 4) and death (4-6, new), plus a chance of
    a second, tighter inner shockring on some hits for extra flourish.

## [1.0.137] - 2026-09-05
- Made the BLADE (Swordsman/Axeman) slash pattern itself genuinely unique per hit, not just
  randomized in shape:
  - The cut-line's size now scales with how hard the hit actually was (using the same severity
    value already driving hit-flinch) — a glancing graze leaves a thin nick, a heavy blow a bold,
    unmistakable gash, instead of every blade hit drawing the identical size line regardless of
    damage dealt.
  - Axeman's dual axes now produce two independent, overlapping cast-off arcs from slightly
    different angles (with a chance of a third, smaller one), instead of the exact same single-arc
    effect Swordsman gets — dual-wielding finally reads as a genuinely different weapon rather
    than reusing one-blade gore.
  - Added a small per-hit color micro-jitter on top of each enemy's own fixed blood tint for the
    cut-line and arc specifically — real blood shade varies slightly hit to hit (oxygenation,
    thickness, freshness), not one flat tone reused for every slash a given enemy ever takes.

## [1.0.136] - 2026-09-05
- Found the actual reason melee blood kept reading as repetitive: every WARRIOR-archetype class —
  Swordsman and Axeman (bladed), but also Hammerman/Paladin (blunt mace) and Spearman (thrusting
  spear) — produced the exact identical cut-line-plus-cast-off-arc pattern regardless of what
  weapon actually hit. Added `resolveWeaponSubtype()` and split the WARRIOR branch into three real
  wound geometries: **BLADE** (Swordsman/Axeman) keeps the cut-line + cast-off arc; **BLUNT**
  (Hammerman/Paladin) now produces genuine blunt-trauma impact spatter — an omnidirectional burst
  with no single directional cut line, since a mace crushes rather than cuts; **PIERCE** (Spearman)
  now produces a real puncture-and-gush along one line, closer to an arrow wound in geometry but
  more violent, with no perpendicular cut-line and no swing arc since a thrust doesn't sweep
  tangentially. The death-time cessation cast-off arc is now also gated to bladed weapons only —
  a mace or spear doesn't carry blood on an edge the way a sword does.
- Widened `spawnCastOffArc()`'s own randomness substantially — drop count (was a narrow 4-6, now
  3-8), angular step, and a new overall per-call `scale` factor that varies the whole arc's reach
  and tightness together, on top of the existing per-drop jitter. A full-force overhead swing and
  a quick short jab no longer produce arcs that read as the same shape just repositioned.

## [1.0.135] - 2026-09-05
- Mage impacts are now unmistakably the most violent of the three archetypes, not just "more
  particles than before." Added `spawnShockring()` — a brief expanding, fading ring at the point
  of impact, reusing the existing particle pool (new `isRing` flag) so it costs nothing extra to
  manage. Mage hits and kills now spawn this ring alongside a bigger, faster particle burst
  (26/14 on hit, up from 22/10; 28/18 on a low-graphics-safe death burst, up from 22/14) and
  slightly stronger back-spatter.
- Archer impacts now follow the requested tradeoff exactly: less blood and a smaller immediate
  burst (particle count cut further, from 5 to 4 on hit), but real forensic accuracy to how a
  genuine high-velocity fine mist behaves — low friction (0.94, up from 0.85) means the spray that
  does fly carries much more of its initial speed before settling, and a chance of one satellite
  droplet flung 2.6x further than the normal scatter range. Less volume, more distance — the
  opposite tradeoff from Mage's big-but-close burst. Applied the same "fewer particles, one
  far-flung droplet" identity to Archer's death burst for consistency with the hit-time behavior.
- Added a `distMult` parameter to `spawnSatelliteDrops()` so a specific caller (Archer's far-flung
  mist droplet) can send a drop well beyond the normal scatter range without changing the default
  behavior for every other caller.

## [1.0.134] - 2026-09-05
- Simplified the table-of-contents comment added in 1.0.133 — dropped the line numbers (which
  drift as the file changes and were half the clutter) and the mixed prose/description format in
  favor of a single clean line of section names to search for, matching the plain style of the
  section headers themselves.

## [1.0.133] - 2026-09-05
- Code-quality pass with zero gameplay/behavior changes, focused purely on readability and
  maintainability:
  - Added a table-of-contents comment at the very top of the script listing every major section
    (config, entity classes, wave system, main loop, UI wiring, etc.) with its approximate line
    number, so navigating this large single-file codebase — by a human or an AI working on it — 
    doesn't require scrolling blind or guessing which section a given system lives in.
  - Extracted `isEnemyFrozen(e)` — the exact same "is this enemy currently unable to move" check
    (blocked at a barricade OR stunned) was independently duplicated 5 times across 3 different
    functions (`updateBarricadesAndPileup`, `resolveSweptEnemyCollisions`,
    `resolveEnemyCollisions`). Centralized into one named helper with identical logic — this is a
    pure DRY refactor with no behavior change, it just means there's one definition to update if
    "frozen" ever needs to account for a new status effect in the future, instead of five.
  - Deliberately did not touch performance-sensitive areas (e.g. the 3-pass collision relaxation's
    per-pass spatial-hash rebuilds) where a naive optimization could subtly change collision
    accuracy — safe correctness took priority over speculative speedups there.

## [1.0.132] - 2026-09-05
- Sword slashes now produce a real cast-off ARC, not just a straight streak. Checked the
  bloodstain-pattern-analysis reference directly: real cast-off (blood thrown from a weapon during
  a swing) travels tangentially to the arc of that swing and lands as a curved trail of individual
  drops — "wide or narrow linear or slightly curved trails... with the more elongated bloodstains
  most distant from the source," rounder near the origin and progressively more elongated further
  along the arc as the impact angle gets more acute. Added `spawnCastOffArc()`, which places a fan
  of individual teardrop stains along a curving path away from the wound, each oriented tangent to
  its own point on the arc (the actual direction that specific drop was flung, not radially outward
  from the wound) with increasing elongation further out — a real swing-arc pattern instead of one
  straight line. Warrior melee hits now spawn the direct cut-line at the wound itself PLUS this
  cast-off arc trailing away from it; the killing blow's death-time cast-off also switched from a
  straight streak to the same arc (a cessation cast-off — the blade stops abruptly at the target
  while blood already in flight keeps going, per the same reference).

## [1.0.131] - 2026-09-05
- Found the real reason Warrior/Archer/Mage blood still looked the same despite the archetype-
  specific hit particles from 1.0.128: those particles fade within about a second, but the ground
  decal — the thing that actually persists for up to 30 minutes and is what a player is really
  comparing when they say two classes "look the same" — fell through to one shared shape profile
  for both Warrior AND Mage, and had no size difference between any archetype at all. Now all four
  archetypes have their own distinct pool shape AND size: Archer pools are long, narrow, and
  noticeably smaller (a real puncture drags into a thin streak, not a wide pool); Mage pools are the
  biggest and roundest of the four (a violent, omnidirectional high-energy impact); Explosive stays
  round but mid-sized; Warrior keeps its original moderate directional smear. Also gave the Warrior
  slash-wound cast-off line its own bold size multiplier (1.8x length/width) so it reads clearly as
  an actual cut instead of just another same-size generic streak.

## [1.0.130] - 2026-09-05
- Simplified the Shop down to one unified view instead of switching between Items/Passives/
  Inventory tabs — with only one item in the game (Lucky Branch) and three passives, tab-switching
  was more navigation than the content actually needed. Removed the Inventory tab entirely (it just
  listed every tower's equipped items, redundant with each tower's own panel) and now show equipped
  items, the Lucky Branch purchase card, and the three passive upgrades together in one scrollable
  list, with a section divider between items and passives. Current wood/stone is now shown right in
  the shop note line instead of being tucked away in the removed Inventory tab.
- Lucky Branch now also costs wood (15), not just gold — gives wood collected from clearing scenery
  an actual use again now that it's not spent on the old per-class Masterwork gear tier.

## [1.0.129] - 2026-09-05
- Fixed enemies not reliably picking up footprints when walking through big blood puddles. The
  wet-feet pickup check compared an enemy's distance to a pool decal's stored anchor point only —
  but a big or massive pool's actual blobs can spread well beyond that anchor, so an enemy visibly
  standing in the edge of a large puddle wasn't detected as being "in blood" unless it happened to
  be near the exact center point. Each pool decal now records how far its own blobs actually reach
  (`footprintRadius`), and the pickup check extends its range by that amount — matching what's
  actually drawn on screen instead of just the stored coordinate. Stepping in a genuinely big pool
  now also picks up a little more blood, taking a couple of extra steps to run dry than a small
  splatter does.

## [1.0.128] - 2026-09-05
- Fixed embedded arrows appearing to stick out of a random side of the enemy (sometimes the middle,
  sometimes the far side) regardless of where the shot actually came from. The embedding position
  was a fully random angle around the enemy, unrelated to the arrow's real flight path. It now
  anchors on the near side relative to the shot's travel direction (the side facing the shooter,
  where the arrow struck first), with the arrow's own angle matching the real flight path so the
  head visibly points inward and the shaft sticks out the correct entry side, with a little natural
  lateral scatter so it's not the exact same spot every time.
- Added themed status-effect visuals instead of every effect being a flat colored circle wash:
  drifting ice-crystal icons around a slowed/frozen unit, flickering flame icons around a burning
  one, and lightning bolts orbiting above a stunned one's head (stun previously had no dedicated
  visual at all). The colored circle tint stays underneath as a base, with the icons on top making
  what's actually affecting a unit readable at a glance.
- Fixed stun/slow only propagating one unit back through a queue instead of cascading through the
  whole line. A follower's speed cap was computed from the unit ahead's own base speed and slow
  debuff, but not from whatever cap THAT unit had already inherited from further ahead — so a
  stunned unit would correctly freeze the one directly behind it, but a third unit further back
  only checked the second unit's own (unaffected) stun state and missed the inherited block
  entirely. The cap now folds in whatever the unit ahead is already limited to, so a stun or slow
  correctly cascades back through an entire queued line, not just to the immediate follower.
- Extended the archetype-specific blood identity (melee slash / archer puncture / mage burst) from
  hits to kills as well — previously only the EXPLOSIVE (Bomber) death burst was differentiated,
  everything else shared one generic "ordinary death" burst regardless of what actually killed it.
  Archer kills now stay low-impact even in death (minimal burst, drip trails instead of a wide
  gush); Mage kills get a faster, wider, higher-energy burst than an ordinary collapse; Warrior
  kills keep the existing directional-collapse-with-arterial-gush behavior.
- Added back-spatter to Mage hits: a small amount of fine mist thrown back toward the source, not
  just forward through the target — real high-velocity impacts do this, and it's specifically what
  forensic investigators look for to determine where a shot came from, so it fits the "high-impact"
  identity Mage hits are going for.

## [1.0.127] - 2026-09-05
- Fixed two units visibly overlapping/occupying the same space at a barricade, which was also the
  real cause of what looked like enemies "jamming up on corners" near barricades. The 1.0.125 fix
  that limits a barricade to one attacker at a time set `pileBlocked = true` for every enemy found
  touching it — attacker and non-attacker alike — before deciding which one was the real attacker.
  Since the queue-catchment pass (which assigns a real, non-overlapping resting slot) skips any
  enemy that's already `pileBlocked`, the non-attacker "runner-up" enemy was marked blocked without
  ever being given a slot, so it just sat wherever it already was — directly overlapping the
  attacker. Now only the actual attacker gets `pileBlocked` set in that step; anyone else who was
  also in contact range falls through to the queue-catchment pass and gets a proper slot behind the
  attacker instead.
- Impact blood is now genuinely distinct per weapon archetype instead of two of the three sharing
  one generic branch:
  - **Melee (Warrior)** now reads as an actual laceration: cast-off streaks are angled roughly
    perpendicular to the strike direction (the cut line itself, since a slash travels across the
    target rather than straight into it) and bleed along both directions of that line, with a
    chance of a running drip down from the wound — a knife/blade wound, not a generic splash.
  - **Archer** flipped from a high-velocity spray cone to a genuine low-impact puncture: a handful
    of low-speed particles right at the wound and a strong chance of a slow drip, since an arrow
    makes a small precise hole rather than blasting blood outward with force.
  - **Mage** is now its own dedicated branch (previously grouped in with Warrior) — fast, wide, high
    particle-count radial burst plus an instant cluster of satellite drops, reading as a violent,
    high-energy magical impact rather than a controlled directional spray.
- Reduced the flat per-spawn delay bonus from 2000ms down to 400ms. Wave spawning now also pauses
  reactively whenever anything is actually queued at a barricade (1.0.125) and enforces a 350ms
  global minimum gap between any two spawns regardless of congestion — with those two handling real
  congestion control, unconditionally taxing every single spawn by a full 2 seconds was needlessly
  slow when the lane was completely clear.
- Added a safety valve against a permanent soft-lock: if a barricade jam holds continuously for 15
  seconds — most critically if the player is out of gold and literally cannot afford anything that
  would break it — wave spawning now force-resumes regardless of whether the jam actually cleared.
  Without this, an unbreakable jam combined with an empty wallet could pause spawning forever,
  preventing the wave (and the run) from ever finishing.

## [1.0.126] - 2026-09-04
- Reworked the item system to be WC3/Dota-style: one shared item pool for every tower instead of
  14 separate class-specific gear lists. Replaced the entire `SHOP_ITEMS` structure (Wooden/Iron/
  Gold/Masterwork tiers per class, ~50 individual items) with a single universal item — **Lucky
  Branch** 🌿, +1 STR / +1 DEX / +1 INT — usable by any tower, any class, no restrictions. More
  items can be added to this same shared list later without touching anything else. The pre-existing
  rare "Sturdy Branch" scenery-clear drop was the same concept already (a universal +1/+1/+1 relic)
  and is now unified with the shop item as the same object.
- Towers no longer start with a free class-specific "starter" weapon — matching Dota/WC3, units
  start with empty item slots and you equip everything yourself. Items also now carry through
  evolution instead of being cleared (they're universal, so they still make sense on the new class).
- Items can now be dragged directly from one tower to another, WC3/Dota-inventory style. Tapping a
  filled item slot in a tower's panel picks the item up (removing it from that tower on the spot)
  and hands control to the same drag-and-drop pipeline already used for picking up ground/relic
  item drops — drag it over another tower on the map and release to equip it there instead, no gold
  charged either way since this moves an already-owned item rather than buying one. Added a new
  `Tower.prototype.receiveItem()` for this (and for ground pickups) that never touches gold/wood/
  stone, since reusing `buyItem()` for a transfer would have incorrectly re-charged for an item the
  player already paid for. Tapping an empty slot still opens the shop, same as before.
- Shop UI simplified from 14 per-class tabs down to one shared Items tab (plus the existing
  Passives and Inventory tabs) — any tower can buy directly from the same list once selected.

## [1.0.125] - 2026-09-04
- Fixed multiple enemies simultaneously "attacking" the same barricade at once. Contact range
  (radius+14px) was generous enough that two or three enemies squeezed together on a wide tile
  could all independently register as touching the same barricade, each playing the contact-bump
  animation as if several were hitting it at the same time. `updateBarricadesAndPileup()` now picks
  exactly one front-most enemy per barricade as the actual attacker (bump animation + damage tick);
  everyone else in contact range is queued and frozen like normal, waiting their turn, instead of
  also visibly attacking.
- Wave spawning now pauses entirely while any enemy is queued/waiting at a barricade, instead of
  continuing to add new enemies on top of an already-backed-up line. `waveTimer` itself freezes
  while paused (not just the spawn check), so nothing becomes "overdue" and there's no burst of
  catch-up spawns the instant the blockage clears — spawning just resumes exactly where it left off.
- Fixed the last enemy of a wave sometimes getting visibly cut off mid death-animation. `die()`
  sets the enemy inactive immediately but its squash-and-fade animation (added in 1.0.124) still
  has up to ~220ms left to play; the wave-complete check only looked at whether any enemy was still
  `active`, so on the very last kill of a wave it could trigger the wave-complete
  popup/transition on the exact same frame the corpse's animation started. Wave completion now also
  waits for any in-flight death animation to finish before triggering.

## [1.0.124] - 2026-09-04
- Added two missing pieces of core hit-feedback/death animation, both purely render-only additions
  with zero interaction with pathing, collision, or targeting logic:
  - **Hit-flinch reaction** — every hit now nudges the enemy sprite a small amount away from the
    strike direction, decaying back to rest over ~130-220ms depending on how heavy the hit was
    (a graze barely registers, a heavy blow visibly rocks the target back). This never touches
    `this.x`/`this.y` (or `traveled`/`pathIndex`) — it's applied the same way the existing
    barricade-bump wiggle already was, as an additive render-only offset in `draw()`, so it's
    completely safe regardless of how often it fires and applies whether or not the gore toggle is
    on, since it's core hit feedback rather than a gore effect.
  - **Death animation** — enemies previously vanished the instant their HP hit 0. `die()` now
    captures a lightweight, fully decoupled squash-and-fade snapshot (`spawnDeathAnim()`, tracked
    entirely outside the `Enemy`/`enemyPool` system in its own small array) before deactivating the
    enemy, so a kill now visibly settles over ~220ms instead of popping out of existence. Being
    fully decoupled from the enemy object itself means it carries no risk of a "dying but still
    targetable/collidable" state — the real enemy is gone immediately as before; the animation is
    just a brief visual echo drawn on top.

## [1.0.123] - 2026-09-04
- Fixed blood corridors accumulating into an endless "spaghetti" of streaks along any lane that saw
  sustained fighting (e.g. an Archer repeatedly hitting enemies walking down the same stretch of
  path over a whole wave). Every accessory blood mark (cast-off streaks, drip trails, satellite
  drops, footprints) had no upper bound on how many could stack in the same small area over time —
  each individual hit was reasonably sized on its own, but a heavily-fought corridor just kept
  layering more on indefinitely. Added a local saturation check in `pushDecal()` (the single choke
  point every blood decal already passes through): once a spot already has ~10 accessory marks
  within a 26px radius, further ones there are skipped instead of piling on. The main wound pool
  decal (the one with a `blobs` array — one per hit/death) is exempt, so a fresh wound still always
  gets its mark; only the smaller repeating accessory marks are capped. A real fought-over spot
  still reads as visibly bloodied, it just stops growing new distinct streaks past a realistic
  saturation point instead of accumulating without limit for the rest of the wave.

## [1.0.122] - 2026-09-04
- Three real bloodstain-pattern-analysis (BPA) principles added to the blood system, not just more
  volume:
  - **Distance-based droplet shape** — `spawnSatelliteDrops()` now ties a droplet's elongation and
    width to how far it actually landed from the source. A droplet that travels further strikes at
    a shallower angle and carries less mass, so it stretches into a longer, more directional
    teardrop while getting narrower; near-origin drops stay rounder and squatter. Previously length
    and width were independent random rolls with no relationship to the distance the drop itself
    landed at.
  - **Archetype-aware pool elongation** — `spawnDecal()` now varies aspect ratio by attacker
    archetype instead of a single random range for everything: a high-velocity piercing hit
    (Archer) strikes at a shallow angle and drags into a long, directional stain; an omnidirectional
    blast (explosive) has no single strike vector and pools closer to circular; ordinary melee/magic
    hits fall in between. Reflects the real BPA relationship between impact angle and stain shape.
  - **Bleeding cessation taper** — the bleed DOT no longer spurts at constant full intensity and
    then cuts off dead the instant it expires. Spurt particle count, and the chance of a fresh
    satellite drop/decal/drip trail on each tick, now taper down as the wound approaches its own
    natural end (down to roughly a third of peak intensity right before it closes), matching how
    real bleeding actually winds down rather than stopping abruptly.

## [1.0.121] - 2026-09-04
- Removed the decal grow-in animation entirely. Every blood decal (pools, streaks, drip trails,
  droplets, skin peels) previously animated from small to full size over a short window after
  spawning — even shortened to 180ms in the last pass, this was still a visible fade/expand effect,
  not how real blood spatter behaves: an impact deposits blood at full extent in that instant, it
  doesn't grow into shape afterward. `growT` (the animation's 0-1 progress value used throughout
  `drawDecals()`) is now a fixed 1, so every decal renders at its full, final size on the exact
  frame it's created. This is a straightforward accuracy fix, not a tuning pass — no more grow
  animation, at any duration, for any decal type.

## [1.0.120] - 2026-09-04
- Fixed blood pools ballooning into one huge, unreadable solid mass instead of distinct forensic
  splatter. The 1.0.118 pass that fixed repetitive shapes also left `spawnDecal()`'s size tiers far
  too large (rare pools up to 6.5x size with up to 15 blobs) and, combined with 1.0.118 removing
  `smallBias` from the death-pool call (needed so deaths could roll bigger than hits, but with no
  upper guardrail), several nearby deaths could each independently roll a massive pool and merge
  into a single dominating blob — exactly what the screenshots showed. Size tiers are now capped
  much lower across the board (max ~2.6x instead of ~6.5x, max 9 blobs instead of 15, smaller blob
  radii), and the extra streak/drip-trail/satellite-drop frequency added in 1.0.116 is dialed back
  down (fewer decals per hit and per death) so the forensic shape variety from 1.0.118 stays
  readable as distinct splatters instead of solid coverage.
- Fixed blood appearing to keep "blooming" after the enemy that caused it was already gone. Every
  decal grows from small to full size over a fixed animation window — this was 700ms, which on the
  now-much-larger pools was long enough to visibly notice a puddle still expanding well after the
  corpse had already vanished (the enemy is removed instantly; the pool's own grow-in animation
  isn't), reading as delayed/out-of-nowhere blood even though it was triggered at the correct
  instant. Shortened to 180ms — still a soft appearance, not an instant pop, but fast enough that
  it no longer visibly outlives the death that caused it.

## [1.0.119] - 2026-09-04
- Fixed drip trails and cast-off streaks reading as oversized. The size widening in 1.0.118 (aimed
  at breaking up repetitive shapes) overshot on raw size along with it — `spawnDripTrail()` length
  pulled back from 12-38px to 7-20px and width from 1.6-3.2px to 1-2px; `spawnBloodCastoff()`
  length pulled back from 9-35px to 8-24px and width from 1.3-4.5px to 1-2.6px. Shape variety
  (random orientation, angle jitter) from 1.0.118 is untouched — only the raw dimensions were
  too big.
- Fixed footprints becoming noticeably rarer. `updateWalkingBlood()`'s wet-feet pickup check only
  scanned the most recent 40 decals (within the last 4 seconds) for something nearby to step in —
  with several more streaks/drips now spawned per hit and per death, those 40 most-recent decals
  could easily all belong to a fight happening somewhere else on the map within a couple of
  seconds, so an enemy standing right next to an actual puddle would still find nothing fresh
  enough to pick up. Widened the scan to the most recent 220 decals and the freshness window to 7
  seconds. Footprints themselves are also sized up slightly and drawn at higher opacity (0.55x ->
  0.7x of the fade factor) so they read clearly against the larger splatters/streaks around them
  instead of getting visually lost.

## [1.0.118] - 2026-09-04
- Fixed blood splatters looking repetitive/patterned instead of forensically unique per hit.
  `spawnDecal()` (the main pooling splatter) previously jittered its blobs inside the exact same
  fixed rectangular envelope every time — same aspect ratio, same orientation, independent uniform
  jitter — just rescaled by size, so any two same-size splatters looked like the same shape moved
  around. It now gives every decal its own randomized identity: a random orientation (loosely
  following the actual impact angle when the caller has one, otherwise fully random), a random
  aspect ratio (independent elongation and narrowness per decal, so some splatters end up nearly
  round and others a long smear), and blobs placed with a center-weighted polar distribution
  instead of rectangular jitter — a dense core with scattered outliers, the way a real bloodstain
  actually forms, plus mostly small flecks with occasional bigger merged blobs rather than every
  blob drawing from one narrow radius band. Also fixed the death-pool decal call incorrectly
  passing `smallBias=true`, which forced literally every kill's pool into the same narrow size
  band and skipped the big/massive pool rolls entirely — every death looked the same size, which
  was a large part of the repetitive look. Cast-off streak (`spawnBloodCastoff`) angle/length/
  width jitter ranges were also widened, since the previous narrow bands (±0.15 rad, 14-28px,
  2-3.5px) made every streak read as the same shape too.

## [1.0.117] - 2026-09-04
- Fixed blood appearing to spawn out of nowhere several seconds after an enemy had already died.
  `startDripSite()` (used for both a heavy mid-combat wound and the killing blow) scheduled a
  delayed trickle of up to 8 drops landing over the following ~2-5 seconds at a fixed world
  position — but that schedule was completely decoupled from the enemy itself (it only stored x,y,
  not a reference to the unit), so it kept firing regardless of whether the enemy was still alive,
  already dead, or long gone. A killing blow's own drip burst could keep adding new blood at that
  spot for several seconds after the body was already gone, which is exactly the "blood coming from
  nowhere" a few seconds post-death. `startDripSite()` now fires its entire burst immediately, at
  the actual instant of the hit or the instant of death — same total amount of blood (still
  proportional to how heavy the hit was), just with zero delay, so blood now only ever appears at a
  real moment of impact or death, never afterward. The separate ongoing low-HP passive drip and the
  bleed DOT tick are unaffected by this — both are already gated on the enemy still being alive
  (`hp > 0`) each frame, so they've always stopped the instant an enemy actually dies.

## [1.0.116] - 2026-09-04
- More blood streaks, and more realistic-looking blood overall. Added a new decal type,
  `spawnDripTrail()` — a gently curved running drip with a small pooled bead at the tip, rendered
  with a quadratic curve rather than a straight line, distinct from the existing straight cast-off
  streak (which reads as the initial spatter at the moment of impact, not what blood does a beat
  after landing). Wired it into hits, deaths, the ongoing low-HP passive drip, and the bleed DOT
  tick, so running drips show up throughout combat, not just at the killing blow. Also increased
  streak frequency generally: hit-time cast-off chance raised (30-55% -> 50-75%), plus a chance at a
  second off-angle streak per hit since real spatter rarely lands as one clean line; satellite drop
  chance on hit raised from 50% to 65%; death now spawns a 2-3 streak fan around the strike
  direction instead of a single 40%-chance streak, 2-3 drip trails off the death pool at varying
  angles, and more satellite drops (3-6, up from 2-4).

## [1.0.115] - 2026-09-04
- Pants (skinShade) lightness range widened and shifted up — was a uniform 18-85 (mean ~51), which
  landed in the visually dark/muddy zone often enough that it read as "pants are always dark," even
  though the roll itself was already uniform random. Several classes' pants base hue is fairly
  saturated (deep red, violet, etc.), which reads darker to the eye than the same lightness number
  would on a lighter hue. Now rolls uniformly across 28-92 (mean ~60) — still a wide 64-point spread
  so genuinely dark pants remain a real possibility, just no longer dominating the distribution.

## [1.0.114] - 2026-09-04
- Fixed fast units trying to walk past a slower unit directly ahead of them on the same single-file
  path — there's no lane to pass in, so every frame the faster unit kept computing its own full
  speed and shoving into the slower unit's back, which the collision passes then had to keep
  fighting right back. That push-and-correct cycle every frame is what read as jittery bumping
  whenever a fast type (Runner, Wraith, Swarm) caught up to a slow one (Tank, Zombie, Boulder).
  `updateBarricadesAndPileup()` now computes a `followSpeedCap` for each enemy once something is
  genuinely close ahead of it (near actual contact distance, not just anywhere on the same path),
  set to that leading unit's own current effective speed — 0 if the leader is stopped/frozen. Enemy
  movement now clamps to that cap when it's lower than the unit's own speed, so a fast unit
  naturally slows to match the pace of whatever's directly in front of it instead of trying to
  overtake. Units with nothing close ahead are completely unaffected and move at full speed.

## [1.0.113] - 2026-09-04
- Rebalanced damage growth so the primary stat (STR for Warriors, DEX for Archers, INT for Mages)
  is the dominant lever for how hard a tower hits, instead of gold-tier level-ups alone. Every
  class's raw tier table has a large built-in damage jump from tier 1 to its max tier (e.g.
  Swordsman goes 18 -> 78, a 4.3x increase) that previously carried through in full and then got
  the primary-stat multiplier applied on top of it — so most of a tower's total damage growth came
  from spending gold on levels, and investing stat points barely moved the needle by comparison.
  `Tower.prototype.applyTierStats()` now anchors to tier 1's own damage and only lets 45% of the
  growth above that baseline carry through before the stat multiplier applies. Leveling up still
  feels rewarding — more range, faster cooldown, unlocked mechanics, and a real but smaller damage
  bump — but the primary stat is now what actually drives a tower's damage ceiling. Applies
  universally from one place, covering every tower's ranged/primary damage and (for Axeman) its
  separate melee-swing damage the same way.

## [1.0.112] - 2026-09-04
- Fixed multiple enemy types dumping onto the spawn tile at the exact same moment, a direct cause
  of on-path bunching. Each wave definition can have several concurrent enemy-type groups (some
  curated waves have 6-8), and every group's first unit starts at delay 0 — so a wave with, say,
  Grunt/Swarm/Tank/Fire groups all beginning at once spawned all four on the same tick, stacked on
  the same tile, before pathing had any chance to spread them out. The previous per-group spacing
  only staggered spawns within one type's own group and did nothing to prevent this cross-group
  overlap. The fully merged, sorted spawn queue now gets a pass enforcing a hard 350ms minimum gap
  between every individual spawn regardless of which group it came from — any spawn that would land
  too close to the one before it gets pushed later in time instead.

## [1.0.111] - 2026-09-04
- Fixed skin and pants tone not actually being independent of the class's preset color — Mage in
  particular kept landing with light pants nearly every time. The previous roll applied a random
  offset ON TOP of each class's own fixed base lightness (e.g. Mage's preset pants tone happens to
  sit fairly light), so the result was still statistically anchored to that preset instead of being
  genuinely free. `Tower.prototype.rollSkinTones()` now rolls skin and pants lightness as two fully
  independent uniform-random values across a wide fixed range each, completely ignoring the class's
  own preset lightness — every class can now land anywhere from notably dark to notably light on
  either layer, with no bias toward its preset tone. `faceColor` remains the one deliberate
  exception: it's always derived as 8-10% darker than that specific tower's own rolled skin, so the
  face still reliably reads as a shade of the head/body rather than an unrelated random color.

## [1.0.110] - 2026-09-04
- Increased the gap between individual enemy spawns by 2 seconds, to give the pathing/collision
  system noticeably more room to settle each new arrival before the next one shows up. Applied as
  `group.spawnDelay + 2000` at the single point where every wave's spawn queue gets built, so it
  covers every hand-authored wave (1-100+) and every procedurally generated wave uniformly, rather
  than needing to edit each wave definition's individual spawnDelay value by hand.

## [1.0.109] - 2026-09-04
- Fixed the main remaining source of jittery enemy pathing and enemies bumping into each other.
  `updateBarricadesAndPileup()` had a second, separate "anti-overlap" pass — independent from the
  actual barricade-queue logic — that teleport-snapped any enemy whose raw path-distance
  (`traveled`) to the one ahead of it fell under the queue spacing, with **no spatial (x,y) check
  at all**. That condition is true for essentially every normally marching column of enemies on
  every single frame (that's what a marching column is), so it was fighting ordinary forward
  movement continuously — snap back, move forward, snap back again, every frame, for most of the
  enemies on screen at once. It could also misfire across entirely separate lanes, since two
  enemies can land on a similar `traveled` value while being physically far apart on a looping or
  spiral path. Removed it entirely: `resolveSweptEnemyCollisions()` and `resolveEnemyCollisions()`
  (run later the same frame, after movement) already enforce spacing correctly using each enemy's
  real physical position, which is the right layer for this and doesn't have either problem. The
  genuine barricade-queue snapping (enemies actually touching or chained behind a blocked
  barricade) is untouched and still works as before.

## [1.0.108] - 2026-09-04
- Fixed barricades (and several other glyph overlays) occasionally rendering "ghosted"/partially
  see-through, the same underlying bug as the enemy transparency fix in 1.0.107 but in a different
  spot: `ctx.fillText('🚧', ...)` for barricades never set `fillStyle` immediately before drawing,
  so it inherited whatever translucent color the previous draw call left behind — most often a
  fading blood decal (`drawDecals()` runs before towers every frame and sets `fillStyle` to a
  partial-alpha rgba as part of its own fade-out). Audited every other emoji/icon `fillText` call
  in the renderer for the same missing-fillStyle gap and fixed each one: the enemy revive skull
  icon, the tower crown/trophy/scroll overlays, the disabled-tower dizzy icon, and the scenery
  (trees/rocks/chests) glyphs, which are the first thing drawn each frame and were therefore the
  most exposed to inheriting stale state left over from the end of the previous frame.

## [1.0.107] - 2026-09-04
- Fixed enemies rendering fully transparent. The status-aura circles drawn just before the enemy's
  emoji sprite (slow/burn/poison/pileBlocked rings) each set `ctx.fillStyle` to a translucent rgba
  color and never reset it afterward — `ctx.globalAlpha` being forced back to 1.0 doesn't help here,
  since a color string's own alpha channel is independent of `globalAlpha`. On rendering paths where
  the emoji glyph honors `fillStyle` as a tint, the enemy sprite itself was inheriting whatever
  translucent aura color had been drawn last (most commonly the pileBlocked ring, which fires
  constantly for any queued unit) — that's what actually produced "all enemies transparent," not a
  compositing/alpha leak. `fillStyle` is now forced to a fully opaque color immediately before the
  glyph is drawn, regardless of what aura rings drew before it.
- Fixed fast-moving enemies occasionally walking straight through each other instead of colliding.
  The existing collision system only ever compares each enemy's position at the start and end of a
  frame — two enemies moving toward each other fast enough can start a frame apart, fully cross
  paths, and end the frame apart again on the other side without their positions ever actually
  coinciding at either checkpoint, so the check never sees an overlap at all. Added
  `resolveSweptEnemyCollisions()`, which runs before the regular collision pass and checks each
  pair's closest approach along their actual movement segment for the frame (a swept circle-vs-
  circle test), not just the two endpoints — catching and correcting the tunnel-through case the
  endpoint-only check structurally cannot see.

## [1.0.106] - 2026-09-04
- Further fixed enemies bunching up and getting stuck on each other. Three remaining issues after
  the previous pass: (1) the queue spacing behind a blocked enemy was a flat 26px regardless of
  enemy size, but `resolveEnemyCollisions()`'s own non-overlap distance is `radius*2+2` — for
  anything bigger than a Swarm (radius 12), that's already wider than 26px, so a freshly-snapped
  queue slot was immediately flagged as "overlapping" again on the very next collision pass,
  fighting itself every frame and reading as jittery/stuck. Queue spacing is now derived per-enemy
  from its own radius with margin over the collision system's own minimum distance, so a queue
  snap is never immediately re-flagged. (2) A single collision-resolution pass per frame isn't
  enough to settle a genuine cluster of 3+ enemies converging at once — resolving pair A/B could
  immediately re-overlap pair B/C, so dense crowds only fully settled over several visible frames.
  `resolveEnemyCollisions()` now runs 3 relaxation passes per frame (rebuilding the spatial hash
  each time) so crowds actually settle within the frame instead of visibly fighting it out over
  time. (3) Separation between two moving, unblocked enemies was purely radial, which shoves units
  rounding a corner sideways off the path centerline and into walls — a direct cause of corner
  hang-ups. Pushes between moving enemies are now biased toward their own direction of travel
  (damping the cross-path component to 45%) so overlap gets resolved mostly by units sliding past
  each other along the path, not by getting shoved off it.
- Added a genuine bleeding damage-over-time effect. Sufficiently heavy hits (>15% of the target's
  max HP) now open an actual wound — a ticking DOT (strongest application wins, doesn't stack)
  that, on top of the existing low-HP passive drip, actively sprays fresh blood, drops satellite
  droplets, and occasionally lays down a new pooling decal on every tick while it's active. Shows
  a periodic "🩸 BLEEDING" reminder label the same way Burning/Cursed already do.
- Blood color now varies per individual enemy, not just per species. Previously every enemy of a
  given type (and every hit on it) drew from one exact flat palette. Each enemy now rolls its own
  blood tint once at spawn (a per-instance hue/lightness jitter on top of its species' base
  palette) and keeps it consistent across every hit and its eventual death — so two Grunts
  standing side by side can now visibly bleed slightly different, individually-distinct shades of
  red, the same way their skin tones already vary.

## [1.0.105] - 2026-09-04
- Towers of the same class now vary in height and weight, not just color. New
  `Tower.prototype.rollBuild()` rolls an independent ±14% height jitter and ±14% weight/breadth
  jitter around that class's own baseline `JOB_BUILD` proportions, so two Mages (for example) can
  genuinely read as a taller/leaner one and a shorter/stockier one instead of both sharing one
  fixed silhouette. Rolled once at `create()` and re-rolled at `evolveInto()` (new class, new
  physique); intentionally NOT re-rolled on `upgrade()` — leveling up is the same individual
  getting stronger, not growing a different body. All internal spawn-point/label-height math that
  previously read the flat per-class `JOB_BUILD` scale (projectile muzzle offsets, the crown/
  trophy/stat-point icon height, camera-follow centering) now reads each tower's own rolled
  `buildScaleX`/`buildScaleY` instead, so those stay visually anchored to the actual (now varied)
  sprite instead of an average class silhouette.
- Pants/lower-body tone now varies independently of skin tone instead of tracking it at a fixed
  contrast. Previously `skinShade` (the legs) was darkened by the exact same offset as `skinMain`
  (the body/head), so within a class every tower's pants were always the same relative shade as
  its skin. `Tower.prototype.rollSkinTones()` now rolls a separate ±28% offset for `skinShade`,
  so it's now common to see, e.g., a darker-skinned Mage with lighter pants and a lighter-skinned
  Mage with darker pants — real per-tower variety instead of one tone driving both layers.

## [1.0.104] - 2026-09-04
- Fixed enemies bunching up, ghosting/stacking on top of each other, and hanging up or backtracking
  on corners. This was four separate interacting bugs: (1) queue-slot snapping in
  `updateBarricadesAndPileup()` moved an enemy's `x`/`y` to its new queue position but never
  updated `traveled`/`pathIndex`, so the very next movement tick recomputed a target from the
  stale, further-along waypoint and yanked the enemy straight back toward where it had just been
  snapped from; (2) the waypoint-arrival check required landing within one exact frame's movement
  of a corner, so a collision push of even a fraction of a pixel past the corner caused a full
  reversal-and-retry loop while trailing enemies piled into the reversing unit; (3)
  `resolveEnemyCollisions()` had no per-pair filter, so every overlapping pair got pushed apart
  twice in the same frame (once when processed as A→B, again as B→A), and skipped separation
  entirely whenever both units were queue-blocked — which is every unit in a queue, so physics
  shut off exactly where crowding was worst; (4) the 70px queue-catchment radius was pure
  Euclidean distance against a 64px-wide path grid, so enemies on parallel lanes of a spiral/
  hairpin turn falsely detected each other as queued and snapped across tracks. Added a shared
  `snapEnemyToTraveled()` helper that keeps position and path-progress state atomic, a path-
  distance gate on the catchment check, an ID-ordered collision pass, a true non-overlap `minDist`,
  and a gentle lateral nudge for chokepoint units instead of a full physics lockout.
- Fixed enemies visually fading or disappearing when clustered/queued. The hit-flash effect was
  painting a translucent white *fill* circle directly over the sprite on every hit; several
  overlapping fills on a tight cluster taking simultaneous damage washed the emoji colors out
  toward white, reading as faded or invisible units. Replaced it with a stroked ring outside the
  sprite so the emoji itself is never painted over, and wrapped `Enemy.prototype.draw()` in a
  strict `ctx.save()`/`ctx.restore()` pair with an explicit `globalAlpha` reset so no state can
  leak between one enemy's draw call and the next.
- Locked the bottom-left inspect panel's combat stats row to a single line at all viewport widths.
  `#inspCombatRow` was wrapping to a second row inside the 320px panel because six stats at
  `gap:10px`/`font-size:clamp(11px,1.8vw,14px)` needed ~380px but only had ~304px available,
  which also inflated the placard's height. Switched to `flex-wrap:nowrap`, tightened the gap to
  `clamp(2px,0.8vw,5px)`, and scaled the font down to `clamp(9px,1.3vw,11px)` with `line-height:1`.
- Reworked stickman face color so it's a genuine subtle shade of the tower's own skin tone instead
  of a near-black mask. The old `darkerJitteredColor()` had a hard 55% lightness ceiling, which
  crushed light/pastel body colors (e.g. Archer's pale green) down to a muddy near-black head.
  Removed that ceiling and tied `faceColor` directly to each tower's own rolled `skinMain` instead
  of the class's flat base color.
- Every tower class now rolls genuinely distinct, wide-range individual skin tones (not just a
  small ±8% wobble), and re-rolls its shade on upgrade and on evolution so leveling up and
  evolving are visibly reflected in appearance. New shared `Tower.prototype.rollSkinTones()`
  derives `skinMain`, `skinShade`, and `faceColor` from one shared per-tower lightness offset
  (±22%) so all three layers stay tonally coherent instead of three independently-randomized
  colors; applies to all classes, not just Archer.
- Extended forensic blood realism and field lifespan. `MAX_DECALS` raised from 500 to 2000 and
  `DECAL_LIFESPAN` raised from 300s (5 min) to 1800s (30 min) — in long, high-wave games old
  stains were being capacity-recycled or expiring well before their timer, which read as blood
  simply not lasting. Seriously wounded enemies (below 40% HP) now drip continuously as they
  travel, not just at the instant of a specific hit — fast-moving wounded units trail an elongated
  teardrop behind their direction of travel, stationary/queued ones pool in place. Enemies pressed
  against a barricade while bleeding now leave a directional contact-transfer wipe smear on the
  barricade itself, distinct from the general splatter beneath them. Aged blood pools (roughly
  2+ minutes into their life) now render a darkened, oxidized outer rim with a slightly lighter,
  flatter interior — a skeletonization/drying-ring effect — so long-lived stains visibly read as
  older rather than staying visually identical for their whole lifespan.

## [1.0.103] - 2026-09-03
- Blood decals now last longer with real per-decal variance instead of one flat duration: every
  decal is guaranteed at least 15% longer than the previous baseline, and sometimes up to 3x
  longer — a pool that used to always last exactly 300s now ranges 345s-900s, streaks range
  690s-1800s (up to 30 min). Verified the distribution numerically across 10,000 samples before
  shipping (min 1.15x, max 3.00x, average 2.08x). Footprint trail marks were deliberately left
  without this variance — they're meant to stay short-lived, distinct from the actual wound stain.
- Stickman faces now have a real fill instead of being hollow outlines — a darker, per-instance
  randomized shade of that tower's own body color (same hue, same jitter mechanism already used
  for skinMain/skinShade), giving every tower a genuinely distinct face color rather than a
  transparent head. New `darkerJitteredColor()` helper, since the existing `jitterColorLightness()`
  has a 30-92 lightness floor specifically to keep skin tones legible, which would have prevented
  it from ever landing on a genuinely dark tone.

## [1.0.102] - 2026-09-03
- Fixed the actual bug behind blood fading faster at higher game speeds. Decals were aging
  against `gameTime`, which advances proportionally faster the higher `gameSpeed` is set (more
  simulation ticks run per real second) — so a decal with a fixed `gameTime` lifespan genuinely
  reached that threshold sooner in real wall-clock time at 3x/10x. Added a separate `realTime`
  clock that advances by actual unscaled elapsed milliseconds regardless of game speed; every
  decal (blob pools, streaks, satellite drops, skin-peel, footprints) now ages against that
  instead. Verified with a simulation: at identical 10 real seconds elapsed, `gameTime` was 10s/
  30s/100s at 1x/3x/10x speed respectively, while `realTime` stayed exactly 10s in all three —
  confirming decals now age identically no matter the speed setting.
- Blood no longer ages at all during the rest period between waves (`waveState === 'IDLE'`) —
  `realTime` is frozen during that window, so time spent deciding what to build next doesn't eat
  into a stain's lifespan.
- Decal capacity raised from 150 to 500 concurrent — "more max allowed blood."
- Decoupled blood intensity from graphics quality entirely. The death-gore block was scaling
  particle counts and skipping several effects (satellite drops, drip sites, castoff streaks)
  whenever `graphicsQuality === 'low'`, on top of the goreMode toggle. Blood is now controlled
  only by whether gore is enabled — full intensity gore shows at any graphics setting.

## [1.0.101] - 2026-09-03
- Removed the arbitrary periodic "wounded" gushing — previously any enemy below 35% HP had a
  background timer independently re-rolling a chance to gush every ~1-2s, with no connection to
  any specific attack. Dripping is now tied directly to the hit that caused it: `startDripSite()`
  takes a `severity` param (the hit's damage as a fraction of the target's max HP) and scales drop
  count proportionally — 1 drop for a graze up to 8 for a near-fatal blow, and hits below an 8%
  severity threshold don't start a drip at all. Verified the scaling numerically across a range of
  hit sizes before shipping. Applied to both the general on-hit case and the Archer puncture-wound
  gush, which now also scales by the actual shot's damage instead of a fixed default.

## [1.0.100] - 2026-09-03
- Non-lethal hits now have a real chance (40%) to leave a lasting mark on the ground, not just
  transient particles. Every on-hit gore branch already spawned particles/streams on every hit,
  but all of that fades within about a second — without a persistent decal, blood only ever
  visibly stuck around after the killing blow, which is exactly what was reported. New decal is
  smaller/less frequent than the full death pool (uses the existing `smallBias` mode) so repeated
  hits build up visible battle damage without outshining an actual kill. Applies uniformly across
  every archetype branch (Warrior/Mage, Archer, Explosive) except dust/rock enemies, which never
  leave blood decals.

## [1.0.99] - 2026-09-03
- Extended base decal lifespan again (180s → 300s / 5 min) — every decal type scales with this
  since they're all multipliers of the base, so streaks now last up to 10 minutes.
- Added a wet-sheen glisten highlight to fresh pools — real blood is glossy/reflective when wet
  and goes matte as it dries, which the existing color-darkening curve alone didn't capture. A
  soft white highlight on the pool's largest blob fades out smoothly over the first ~15s of life
  (verified numerically: 0.35 alpha at spawn → 0 by 15s), giving fresh wounds a genuinely wet look
  distinct from the reddish-brown oxidizing stage that follows.

## [1.0.98] - 2026-09-03
- Fixed enemies piling up messily instead of forming a clean single-file "conga line" queue at a
  chokepoint (e.g. behind a Barricade). Root cause: the old queue system only chained a line
  through enemies that were *strictly adjacent* in traveled-order — on an early-game wide-open
  map, enemies approaching from different lateral positions with similar-but-not-adjacent traveled
  values fell through that check entirely and were left to fight for space via the generic
  collision-push system instead, producing the jumbled scatter.
  - Rewrote the queue assignment as a single forward pass with a real spatial catchment radius
    (70px) around any already-blocked enemy, so multiple lanes converging on one chokepoint all
    get pulled into the same queue regardless of traveled-adjacency.
  - Caught and fixed two real bugs while building this, both found via standalone simulation
    before shipping (per the game-critical-logic testing convention): (1) an early version
    overwrote `traveled` itself when snapping an enemy into its slot, which could create ties with
    another enemy's original traveled value and break the "genuinely ahead" ordering check; fixed
    by tracking slot position in a separate `queueSlotDist` field, never touching `traveled`.
    (2) even after that fix, two enemies that were each individually closer (by original position)
    to the very front of the line than to each other could still independently compute the exact
    same slot — fixed with explicit slot-collision tracking that walks an enemy further back in
    fixed increments until it finds a genuinely free spot.
  - Verified with two simulations before shipping: a 5-enemy multi-lane convergence, and an 8
    -enemy stress test with fully randomized scattered starting positions — both produced a clean
    line with zero overlapping slots.

## [1.0.97] - 2026-09-03
- Mage's projectile now visually reads as a magic missile instead of a generic arrow — a glowing
  white-hot orb core with a soft colored outer glow and a fading energy trail behind it, instead
  of the shared line-and-barbs shape every other physical projectile uses.
- Mage's projectile speed reverted back up to high-velocity (520-580, was 320-360 from an earlier
  "slower but higher impact" pass) per explicit correction — fast-traveling and hard-hitting
  rather than slow and hard-hitting. Damage stayed at its earlier boosted values. The heavier
  on-hit blood splatter for Mage specifically (18 vs 14 particles, 7 vs 4 streams, 55% vs 30%
  castoff chance, shipped in 1.0.87) was already in place and confirmed still intact.

## [1.0.96] - 2026-09-03
- Reworked camera-follow's pan math to remove a coupling bug: target X/Y were being recomputed
  every frame using the *currently animating* zoom, and since both position and zoom shared the
  same easing curve, the target itself was a moving point rather than a fixed one — mathematically
  this makes camera.x/y follow a quadratic path (there's a `zoom(t) * eased(t)` term, which is
  quadratic in `t`) instead of a straight line, which can produce a "wrong direction, then
  corrects" motion depending on the tower's position and zoom delta. Target X/Y/zoom are now all
  computed once at pan start and interpolated independently — verified with a simulation that the
  tower's distance to true center now shrinks on every single step with no exceptions, which is
  mathematically guaranteed by this construction regardless of tower position or zoom delta.
  (My reproduction of the *old* code's exact failure case wasn't conclusive in every scenario I
  tried, so I won't overclaim I nailed the precise prior mechanism — but the new version is
  provably immune to this class of bug either way, which is the property that actually matters.)
- Cut the wait-before-panning from 600ms to 150ms — was reported as pausing too long before
  starting.

## [1.0.95] - 2026-09-03
- Fixed embedded arrows not actually moving with the enemy body. The body itself is drawn with a
  knockback-bump offset (`bumpDx/bumpDy`, from pressing against a Barricade) plus a constant
  walk-bob while moving, but the embedded-arrow rendering only ever used the raw `this.x, this.y`
  — never those same offsets. The arrows were visually lagging behind the body's normal bob motion
  the entire time it walked, which is very likely what looked like a collision/overlap glitch in
  the reported screenshot (an arrow rendering slightly detached from its own enemy can look like
  two separate overlapping things). Arrows now use the identical adjusted position the body uses.
- Also moved the arrow's anchor point from a small random offset clustered near center (up to
  ±0.35 radius) to the body's actual edge (0.85 radius, at a random angle around it) — reads as a
  real puncture wound at the surface instead of something floating near the middle of the sprite.
- Reviewed `resolveEnemyCollisions()` for gaps while investigating — it applies uniformly to every
  active enemy (including breakaway ones), no exclusion holes found; the arrow desync above is the
  most likely actual cause of what was reported as a collision issue.

## [1.0.94] - 2026-09-03
- Doubled the base decal lifespan again (90s → 180s) — real bloodstains persist for hours without
  cleanup, and fading this fast was undercutting that. Every decal type scales with this: pools
  now last 180s, streaks (already 2x the base) go to 360s, skin-peel patches to 234s, footprint
  trails stay quick at 45s. The color-aging curve (bright red → reddish-brown → dried) is
  fraction-based, so it automatically stretches proportionally with the longer lifespan rather
  than needing to be recalibrated separately.

## [1.0.93] - 2026-09-03
- Changed the overhead "unspent stat points available" indicator from a glowing 💀 skull to a
  glowing 📜 scroll, matching the same icon already used for the in-panel expand toggle. Confirmed
  the click-to-open-straight-to-stats behavior (tapping a tower with points auto-expands to the
  stats section instead of landing collapsed) was already in place and untouched by this change.

## [1.0.92] - 2026-09-03
- Camera pan/follow now centers on each tower's true visual midpoint, not its raw draw anchor.
  `drawStickman()` translates to `(tower.x, tower.y)` at foot level, not the sprite's visual
  center — the local sprite actually spans roughly head-top (-31) to feet (+20), so its true
  midpoint sits noticeably above the anchor point. Centering purely on `tower.y` left the
  character sitting visibly below true screen center. New `towerVisualCenterY()` helper accounts
  for this, plus each class's own body `scaleY` (same per-class-proportions pattern already used
  for the projectile-spawn muzzle-alignment fix). Verified with a standalone simulation for both
  a lean class (Archer) and a squat one (Hammerman) that the visual midpoint — not just the
  anchor — lands exactly on screen center in both cases.

## [1.0.91] - 2026-09-03
- Fixed camera-follow zooming out unexpectedly. The 1.0.89 "fixed distance" change made the pan
  always target exactly 1.3x zoom regardless of the current zoom level — if the player had
  already zoomed in further than that before selecting a tower, the follow would pull the camera
  back OUT to 1.3x, which read as a random wrong-direction zoom. Restored the "never zoom out"
  guarantee: the pan now targets `Math.max(currentZoom, 1.3)` — guarantees at least that close-up
  distance when zoomed out further, but leaves the zoom alone if already closer than that.
  Verified all three cases (zoomed out, at the recommended distance, zoomed in further) with a
  standalone check before shipping.

## [1.0.90] - 2026-09-03
- New universal, shared-item drop system, Dota-style: opened treasure chests now have an 8% chance
  to drop a 🌿 Sturdy Branch (+1 STR/DEX/INT, works on any tower — not class-specific gear) as a
  physical item sitting on the map. Drag it onto whichever tower should hold it to equip; it stays
  put if you release it somewhere else, so a failed drop just leaves it available to try again.
  - Implemented real pointer drag-and-drop: ground-item hit-testing on pointerdown takes priority
    over the normal camera-pan drag, item position tracks the cursor in world-space during the
    drag, and release checks for a tower under the drop point.
  - Reuses the existing `buyItem()` equip path (cost 0, so no gold is charged) — respects the
    same 6-slot cap and Hero-awakening check every other item already does.
  - **Scope note**: this adds a new universal item alongside the existing per-class Shop gear
    system (13 classes × 4 tiers) rather than replacing it — removing that entire established,
    balanced system is a much bigger decision than adding a new item type, so it wasn't done
    without confirming that's actually wanted first.

## [1.0.89] - 2026-09-03
- Camera pan-to-unit reworked: total sequence cut from 9s (3s wait + 6s pan) to 2s (0.6s wait +
  1.4s pan) — the old duration felt far too slow. Switched from a razor-edge exponential ease-in
  (where ~90% of the motion was crammed into the final instant, making it look like nothing was
  happening for most of the sequence) to a smooth ease-in-out cubic, so movement is visible
  throughout instead of a long dead pause followed by a snap.
- Zoom now always pans to the fixed 1.3x recommended distance regardless of the current zoom
  level, instead of only zooming in when already more zoomed out than that.
- Re-verified with a standalone simulation that the tower's screen position still lands exactly
  on true center at completion under the new timing/curve.

## [1.0.88] - 2026-09-03
- Fixed the actual bug behind camera pan-to-unit never centering: `clampCamera()` bounds the
  camera against the full theoretical `WORLD_MAX_W/H` (the largest the map could ever expand to),
  not the currently revealed play area. Early in a run, the active region sits near one corner of
  that theoretical space, so centering on a tower there required a camera position the clamp was
  silently overriding back to its restrictive bounds every single frame — the pan was fighting
  itself the whole time. Intentional camera-follow now skips that clamp entirely, since it's a
  deliberate move, not a manual pan that needs edge protection. Verified with a standalone
  simulation that the tower's screen position now lands exactly on true center at pan completion.
- Added the requested "pan to a recommended distance" — the camera now also eases zoom toward a
  comfortable 1.3x close-up alongside the position pan (only zooms in if already more zoomed out
  than that, never zooms out), animating together with the position pan rather than as a separate
  step.
- Also shipping forensic gore work built last session that got left unversioned:
  - Real forensic bloodstain-aging timeline, calibrated so one round represents ~5 real-world
    hours: bright oxyhemoglobin red holds for the first ~10 equivalent minutes, transitions
    through a reddish-brown oxidizing stage, and settles to the fully-dried true color by ~2
    equivalent hours — a genuine two-stage color transition instead of one flat lerp. Verified the
    curve numerically at real-world-hour checkpoints before shipping.
  - Badly-wounded-but-still-alive enemies (below 35% HP) now periodically gush a little blood
    while moving, not just on the hit that wounded them — a real wound keeps bleeding.

## [1.0.87] - 2026-09-03
- Streaks (cast-off decals) now last 2x as long as blob pools/drops instead of sharing one
  universal lifespan — they were called out as a favorite effect and were fading at the same rate
  as everything else.
- New walking-blood system: any enemy standing on or near still-fresh blood (spawned within the
  last 4s) picks it up on its feet and leaves a trail of small, quick-fading footprint marks as it
  walks away — each print fainter than the last until it runs dry (verified the decay curve
  numerically: 0.46 → 0.37 → 0.28 → 0.18 → 0.09 → 0 over 6 steps). This was the explicitly
  requested effect that didn't exist yet.
- Weapon-specific forensic differentiation:
  - **Archer**: arrows now physically embed and stay stuck in the enemy (small angled shaft +
    arrowhead rendered on the body, capped at 4 so a heavily-hit enemy doesn't turn into a
    pincushion), and each hit starts an ongoing gush (a drip site) on top of the normal splatter —
    a real puncture wound bleeds continuously, not just once.
  - **Mage**: projectiles now travel noticeably slower (320-360 vs. the old 460-500) but hit
    harder (damage raised ~20-25% per tier to compensate) — a heavier, more deliberate bolt.
    Mage hits also spawn significantly more streaks (18 particles/7 streams vs. 14/4 for a
    standard melee hit, castoff chance nearly doubled to 55%) and elemental procs (burn/freeze)
    now leave a new "skin peeling" decal — a jagged blistered patch with a pale raw-tissue
    highlight, visually distinct from a normal blood pool since it's elemental damage, not a
    physical wound.
  - Melee (Warrior/generic) kept as the existing castoff-sweep baseline that Archer/Mage now
    build on top of.

## [1.0.86] - 2026-09-03
- Camera pan-to-unit: selecting or placing a tower now waits 3s, then pans the camera to center on
  it over 6s using a strong exponential ease-in — barely moves for the first few seconds, then
  rapidly accelerates to arrival (verified numerically: only ~3% of the pan distance covered at
  the 3s mark of the pan itself, 50% covered by 90% through it). Camera then continuously tracks
  the tower while it stays selected. Cancels cleanly on manual drag, pinch/scroll zoom, or
  deselection — wired into all 6 deselection points in the code individually.
- Blood decal lifecycle reworked: decals previously never actually expired, only got recycled by
  capacity (150-decal cap, oldest overwritten). Now they have a real 90-second lifespan (doubled
  from a 45s baseline) — bright red at spawn, shifting to the enemy's true biology color over the
  first 20% of life, holding steady, then fading to fully transparent over the final 15% so old
  stains clear out instead of accumulating indefinitely. Verified the full color/alpha curve
  numerically across the lifespan before shipping.
- Wired the previously-declared-but-unused `bio.viscous` flag (from the biology profiles shipped
  in 1.0.76) into real friction physics: insect hemolymph and coagulated undead blood now
  genuinely travel less far than thin standard blood (0.88 friction vs 0.93), a real fluid-density
  difference instead of a flag that did nothing.
- ⚖️ Target and 🔀 Move button icons.
- Zoom-controls Settings toggle (Settings → Game), off by default since pinch/scroll zoom already
  works without the on-screen buttons — persisted in saves.
- Real enemy-enemy collision resolution, replacing the previous system which only checked the one
  enemy directly ahead in path order and explicitly excluded stunned/frozen enemies from collision
  entirely — meaning a frozen enemy wasn't an obstacle at all and everyone walked straight through
  it. `resolveEnemyCollisions()` now does genuine circle-circle collision against every nearby
  enemy (reusing the existing spatial hash), including frozen ones as real static obstacles that
  can't be pushed and can't be walked through — verified both the normal-pair and frozen-pair
  cases with a standalone simulation before shipping.
  - Caught a real bug while wiring this in: an early edit's `str_replace` matched and consumed
    `buildEnemyHash()`'s own function-signature line while inserting the new collision function
    above it — the exact "heading consumption" failure pattern `AGENTS.md` already warns about,
    just in code instead of the changelog. Caught immediately by the mandatory `node --check`
    pass and fixed before continuing.

## [1.0.85] - 2026-09-03
- Target and Move buttons now show ⚖️ and 🔀 icons.
- Added a Settings → Game toggle for the on-screen zoom +/-/reset buttons, off by default (pinch
  and scroll-to-zoom already work without them) — opt-in for anyone who prefers explicit buttons.
  Persisted in save files.
- General enemy anti-overlap: previously the path-queue system only kicked in when an enemy was
  actively blocked (a Barricade, or queued behind one). A fast enemy (Runner) catching up to a
  slow one ahead of it (Tank) on the open path had nothing stopping it from visually overlapping
  or passing through. Extended `updateBarricadesAndPileup()`'s spacing check to apply generally,
  not just to blocked chains — enemies now hold a minimum trailing distance from whatever's ahead
  of them regardless of whether anything is actually blocking, without touching the existing
  blocked-queue snap logic's behavior.
- Post-death drip sites: kills now spawn a few extra blood drops over the next ~1-2.5 seconds
  after the initial splatter, instead of everything landing in one instant burst. Capped pool
  (24 concurrent drip sites, oldest cut short past that) to stay performance-safe.
- Logged two large requested features to `BACKLOG.md` with real scoping rather than rushing them:
  walking-blood forensics (footprint decals as enemies track through spatter) and a full three-form
  Druid class (Wolf/Bear/Squid AoE tradeoffs, mode-switch UI, once-per-round gate) — both need new
  subsystems beyond what a quick config addition can cover.

## [1.0.84] - 2026-09-03
- New deep INT evolution chain for Archer's Bomber branch: Bomber → Gunalinder (INT 25, 2nd tier)
  → Sniper (INT 40, 3rd tier) — the deepest single-stat investment of any class in the game.
  - **Gunalinder**: a revolver that fires all 6 chambers in a rapid burst (90ms between shots)
    before a long reload, implemented as a real state machine in `updateRanged()` rather than a
    reskin of the existing single-shot firing loop. Caught and fixed a bug in my own first draft
    of this logic, where the very first shot incorrectly jumped straight to the full reload
    cooldown instead of starting the burst — verified the corrected timing with a standalone
    simulation (6 shots in the first 450ms, clean 1700ms gap before the next burst).
  - **Sniper**: 420 base range (cap 520) — confirmed via the DPS/range table used in the 1.0.70
    balance pass that this is genuinely the longest range of any tower, ahead of Mage's previous
    420 cap.
  - Caught a real stale-field bug while wiring this up: `applyTierStats()` uses `Object.assign()`,
    which never clears fields absent from a new tier. Without an explicit reset, a tower evolving
    *away* from Gunalinder would keep its old `burstCount` and incorrectly keep firing in bursts.
  - Full gear tiers, colors, body proportions, flavor quotes, and custom `drawStickman()` poses
    (two-handed revolver grip; extended rifle barrel with a scope glint) for both classes. README
    and the in-game help modal's evolution tree updated to match.

## [1.0.83] - 2026-09-03
- Towers with unspent stat points now show a glowing green 💀 above their head on the map (gentle
  pulsing glow via `shadowBlur`, not a hard flash), stacking above the Hero crown/Legendary trophy
  if the tower has those too. Excludes Barricades, which never earn stat points.
- Tapping a tower on the map now auto-expands the inspect panel straight to full options if it has
  points to spend, instead of always landing on the collapsed view and requiring a second tap on
  the 📜 scroll toggle.

## [1.0.82] - 2026-09-03
- Added individual satellite blood drops — a new decal type (`isDrop`, small elongated teardrops
  each oriented along their own travel angle) scattered near a splatter, matching the real
  bloodstain-pattern-analysis phenomenon where a main spatter breaks into smaller individual
  droplets around its edges rather than being one uniform blob. Biased toward the impact
  direction on hits (angled scatter), fully radial around the pool on deaths. Gated off low
  graphics for the death case to stay perf-conscious, same as the other death-only decal effects.

## [1.0.81] - 2026-09-03
- Fixed target frame overflowing off the right edge on mobile — confirmed via an actual mobile
  screenshot (this had been logged in `BACKLOG.md` as unconfirmed since all prior sizing feedback
  came from desktop screenshots; now verified real). On viewports under 600px wide,
  `updateTargetFrame()` now stacks it above the inspect panel instead of to its right, and clamps
  its max-width to the available space either way so it can't run off-screen in either layout.

## [1.0.80] - 2026-09-03
- Two more forensic-accuracy passes on top of the archetype/biology work from 1.0.76:
  - **Real mist cone, not radial.** Archer-hit "mist" was still using the generic fully-radial
    `spawnParticles()` — its own code comment claimed a "tight cone along impactAngle" but nothing
    actually constrained the angle. Added real cone support (`coneAngle`/`coneSpread` params) and
    wired mist to a genuine ~46° cone. Verified numerically: 1000 simulated spawns, max deviation
    from the impact angle came out to exactly 0.400 rad (~23°), matching the intended half-cone.
  - **Per-particle friction + ground pooling.** Every particle previously decayed velocity at the
    same universal 0.93/frame regardless of type, so mist behaved identically to heavy splatter.
    Mist now uses 0.80 friction — decelerates hard into a dense cluster (2.5 units/s left after
    ~333ms vs. 51.5 for normal splatter, verified with a standalone simulation) instead of
    spreading like every other particle. Blood particles that settle (velocity < 6) now leave a
    tiny permanent ground stain via the existing capped decal system instead of just fading
    invisibly mid-air — real droplets land and soak in.
  - Guarded against a real bug from the shared particle-pool architecture: `spawnGibs()` and
    `spawnBloodStream()` pull from the same recycled `particles` array as `spawnParticles()`, so a
    slot's leftover `friction`/`canPool` state from a previous spawn could bleed into the next
    unrelated particle type. Both functions now explicitly reset those fields.

## [1.0.79] - 2026-09-03
- Non-explosive deaths no longer use a full omnidirectional particle burst — that was reading as
  an "explosion" regardless of what actually killed the enemy, since the same ~90-100-particle
  radial spray fired for every death. Only genuinely explosive kills (Bomber) keep that burst now;
  every other kill gets a modest ambient splatter plus a tight arterial "gush" of a few large
  streams weighted toward the direction of the last hit — a directional collapse instead of a pop.
  Also cut gib (chunky flying debris) count down to 1-2 for ordinary kills instead of 4-10, since
  visible chunks flying read as "explosion" more than fine spray does.
  - Verified the actual particle-count reduction numerically before shipping: a Grunt-tier
    ordinary kill went from 101 particles to 30 (~70% cut); a Boss-tier one from 181 to 53.

## [1.0.78] - 2026-09-03
- Condensed the top HUD stats: ❤️ Lives and 💰 Gold now sit on one row, 🔀 move-charges and Wave
  count on a row below that, instead of all four spread across a single horizontal line. Saves
  meaningful horizontal space next to the Build/Shop/Settings buttons and Next Wave button.

## [1.0.77] - 2026-09-03
- Starting lives raised from 30 to 100 (HUD default, initial state, and new-game reset all
  updated together).
- Caught and fixed a stale README instruction while updating this: it still said "Tap the ❤️ HUD
  stat to buy an extra life," but buy-life moved into the Shop modal back in v1.0.73 — the HUD
  heart is just a readout now. Updated the wording to point at the Shop instead.

## [1.0.76] - 2026-09-03
- Gore now branches on both weapon archetype and enemy biology instead of one universal red
  particle burst everywhere:
  - **Weapon archetype** (`resolveGoreArchetype()`): Archer-type towers produce tight,
    high-velocity forward-spatter mist along the impact angle; Bomber (explosive despite being
    ARCHER-archetype for stats) produces a 360° burst with no directional constraint; everything
    else (Warrior/Mage) gets the medium-velocity castoff sweep, weighted toward the impact angle
    but not fully constrained to it.
  - **Enemy biology** (`getBloodProfile()`, keyed off properties the game already tracks —
    `isUndead`, and type for Swarm/Splitter/Boulder): insects (Swarm, Splitter, Splitmini) bleed
    cyan-green hemolymph; undead (anything with `isUndead: true`) bleed near-black coagulated
    blood and skip the bright high-velocity arterial-spray layer entirely (real coagulated blood
    oozes, it doesn't spurt); Boulder produces gray/brown rock dust with no liquid streams and no
    pooling decal at all, since it isn't blood.
  - Extended `spawnBloodStream()` to accept optional bright/dark color overrides (previously
    hardcoded to standard red regardless of what was hit) and added a `hexToRgba()` helper so
    decal/castoff alpha transparency still works with biology colors instead of only literal red.
  - Caught and fixed a self-inflicted bug during this edit: an early `str_replace` accidentally
    deleted `spawnDecal()`'s own function-signature line while inserting the two new helper
    functions above it — caught immediately by the mandatory `node --check` pass before
    continuing, per the verification workflow in `AGENTS.md`.

## [1.0.75] - 2026-09-03
- Target-of-target frame now hides entirely while the inspect panel is expanded (full options
  open) instead of stretching to match the panel's height — it reappears once the panel is
  collapsed. Solves the negative-space complaint more directly than resizing it ever would.
- Removed the redundant "🛒 Items" button — the inventory slots themselves have been clickable to
  open the Shop since 1.0.72, so the separate button was dead weight.
- Inventory expanded from 4 slots to a true 6-slot Dota-style grid — `MAX_ITEM_SLOTS` bumped to 6
  (the actual game mechanic, not just the visual), Hero-awakening threshold updated to match
  (fill all 6 to become a Hero, was 4), help modal and stale code comments updated accordingly.
  Inter-tower drag-and-drop item throwing between slots logged to `BACKLOG.md` as its own
  follow-up — real pointer-drag and cross-tower hit-testing is a distinct feature from the slot
  display itself.

## [1.0.74] - 2026-09-03
- Audited every suggestion from the Gemini "chapter" documents against the actual current code:
  - **Shipped**: New Enemy toast polish — each enemy's emoji is now 2.6em with a hardware-accelerated
    (`transform`-only) waddle keyframe, a ✕ close button in the top-right clears the pending
    timeout and dismisses early, and the auto-hide timer went from 5500ms to 6600ms (+20%).
  - **Already existed, no change needed**: `EVOLUTIONS`/`CLASS_ARCHETYPE` gating, wave-pacing,
    the new-enemy-introduced popup itself, and archetype-exclusive STR/DEX/INT damage — all from
    earlier versions this same session, re-verified still correct.
  - **Explicitly contradicts a later, real instruction — not applied**: widening
    `#inspect-panel` to 360px (a Gemini-draft fix for stat-row wrapping) directly conflicts with
    the actual person's explicit request earlier this session to shrink it from 480px to 320px.
    Removing `#inspTargetFrame`'s `minHeight` and shrink-wrapping it also directly contradicts the
    actual person's explicit request to make it match the main panel's height. Both left as-is.
  - **Genuinely missing, but too large for a single pass — logged to `BACKLOG.md` instead**:
    forensic-realism gore rewrite (directional spatter by weapon archetype, per-enemy blood
    biology/color, pooling to a static layer), mobile-viewport stacking for the target frame.

## [1.0.73] - 2026-09-03
- Buy Life moved out of the main HUD and into the Shop modal as a dedicated row below the header
  (❤️ Lives counter + Buy Life button, same exponential cost curve as before) — the HUD now shows
  lives as a plain readout again, matching the original request that it not clutter the main
  screen.
- Removed the redundant HUD mute button (🔊/🔇 in the top-right controls). Mute already lived in
  Settings → Audio; having it duplicated in the main HUD wasn't necessary.
- New STR-based "taunt" mechanic: breakaway targeting (`findNearestActiveTower`, used by Fire/Ice
  breakaway attacks and Troll's swing) is now weighted by both proximity and each candidate
  tower's STR investment, not pure nearest-distance. A tower with 20 STR is roughly 2.24x more
  likely to draw aggro than an identical-distance 0-STR tower — works for any archetype, so a
  heavily-STR Mage can out-taunt a low-STR Warrior, per request. Verified the weighting
  numerically before shipping.
- Logged several larger requested features to `BACKLOG.md` rather than rushing them: a STR-Mage
  evolution chain (Rogue Sorcerer → Crazy Wizard → Necromancer with an HP-percentage sacrifice
  AoE), Swordsman cleave diminishing returns past 5 targets, a restructured branching Warrior
  evolution net (Axeman → "Knight Errant" → Berserker; Hammerman gaining DEX branching into a
  dual-wield path), a forensic-realism gore rewrite, a Dota-style item-drop/merchant economy, and
  a wobbling Dwarf Builder NPC with more pronounced post-wave-3 scenery scaling. Each is
  well-specified but large enough to deserve its own focused pass rather than a rushed bundle.

## [1.0.72] - 2026-09-03
- Inventory row now shows 4 bordered WC3/Dota-style item slots instead of a plain text summary
  (icons joined by spaces, or "No items"). Used 4 slots specifically to match the actual
  `MAX_ITEM_SLOTS`/Hero-awakening mechanic (filling all 4 makes a tower a Hero) rather than the
  visually-iconic-but-mismatched 6-slot Dota inventory grid.
  - Empty slots show a dim inset border; filled slots show the item's icon with a gold glow and
    a tooltip with its name.
  - Slots are clickable — tapping any of them (filled or empty) opens the Shop for that tower's
    gear, same as the existing 🛒 Items button.

## [1.0.71] - 2026-09-03
- Added a small "TARGETING" header label above the enemy name in the target-of-target frame.
- Widened the target frame (220px → 270px max-width) and enlarged its content — bigger portrait
  (32px → 40px), slightly larger gaps — to fill the panel's height (which already matches the
  player nameplate's height as of 1.0.65) instead of leaving empty top/bottom padding.
- Fixed Troll being able to randomly appear as early as wave 1 — the 2% random-substitution roll
  in `startNextWave()` wasn't checking whether Troll had actually been introduced yet, so it could
  show up (with no explanatory popup) well before its official wave-22 debut. Now gated on
  `seenEnemyTypes.has('TROLL')`, which the new-enemy-introduced system (1.0.59) already tracks.

## [1.0.70] - 2026-09-03
- Balance pass applying "shorter range = more damage, higher attack speed = less damage" as a
  general design check across all towers. Extracted tier-1 range, damage-per-hit, and
  attacks/second for every tower and sorted by range to find violations:
  - **Bomber was the clear violator** — 2nd-longest range in the game (240) with higher per-hit
    damage (26) than every short-range melee unit except Spearman. Trimmed its range ~12.5%
    across all three tiers (240/260/280 → 210/228/246), damage left untouched — its high damage
    is now earned by sitting mid-pack on range instead of near the top.
  - Fast attackers already fit the pattern well and needed no changes: Gatling (7.14/s, 5 dmg),
    Squirtgun (5.00/s, 6 dmg), and Blowdart (2.70/s, 8 dmg) all pair high attack speed with low
    per-hit damage, exactly as intended.
  - Slow, short-range hitters already fit too: Spearman (0.56/s, 40 dmg — README's own "slow but
    hard-hitting") and the melee Warriors (Swordsman/Hammerman/Paladin) all trend toward more
    damage as range drops.
  - **Deliberately left Archer alone** despite having the single longest range (260) paired with
    above-average damage (20) — its README-documented identity is explicitly built around this
    exact trait ("slower arrows, real power behind each shot"). Treated as an intentional,
    documented exception rather than an oversight to silently override.
  - Also left Mage and Cleric's low damage-for-their-range as-is — both are utility casters
    (slow/status, curse/heal) whose value was never meant to come from raw hit damage.

## [1.0.69] - 2026-09-03
- More splatter on impact: each hit's particle burst went from 9 → 14, its directional blood
  stream from 3 → 4 particles, and hits now have a 30% chance of a directional castoff streak too
  (previously impacts had no streak at all, only kills did).
- Less reliance on ground pools at death, while keeping the particle/gib/stream burst as-is (the
  part that was already liked): the main death pool now only appears 65% of the time (was
  guaranteed), and when it does, uses a new `smallBias` decal mode that skips the big/massive pool
  rolls entirely — verified numerically that this drops the average pool size from ~1.72x to
  ~0.60x. The two chained "extra stain" pools that could previously stack up to 3 total decals per
  kill (35% × up to 2 more) were removed outright; the occasional directional castoff streak (a
  spatter line, not a filled pool) stays.

## [1.0.68] - 2026-09-03
- Fixed Blowdart's disconnected-looking arm: it had a second "steadying" off-hand anchored 4px
  off the torso centerline (`shoulderX - 4*faceSign`), which visibly floated apart from the body
  instead of reading as attached to it. Removed that off-hand entirely rather than patching its
  anchor — matches the single-arm reference sketch provided.
- The remaining arm now anchors at mouth height (just under the head, above the shoulder line)
  instead of shoulder height, so the pipe reads as actually held up to the face in one continuous
  gesture from head to tip, per the reference sketch.
- Updated the dart's actual spawn point in `fireProjectile()` to match — it was still using the
  universal shoulder-height pivot (-13) for every class; Blowdart now uses -21 (mouth height) so
  the dart still leaves exactly from the visible pipe tip instead of drifting out of sync with the
  new arm position.

## [1.0.67] - 2026-09-03
- Evolution hint now shows the target class's own icon and name in an "X Upgrade" format instead
  of a generic 🔒 lock emoji — e.g. "🔫 Gatling Upgrade — 6 more STR" instead of
  "🔒 6 more STR → Gatling".
- All 26 gold-tier upgrade costs across every tower bumped ~35% (rounded to the nearest 5) — e.g.
  Swordsman's three upgrades were 60/90/130/180, now 80/120/175/245. Ties into the same
  "grinding is more consequential" pass from 1.0.63 — gold investment now demands more commitment.

## [1.0.66] - 2026-09-03
- Reorganized the expanded options into two explicit rows instead of relying on flex-wrap to
  land buttons in a sensible place: Upgrade + Sell on top, Target + Move (+ Axeman's Mode toggle
  when applicable) + ❓ below.
- The evolution hint now sits inline on the same line as "STATS: N to spend" instead of its own
  row below the stat buttons.
- Split the ❓ help modal in two: the general one (now genuinely only about stickmen/hero towers —
  leveling, stats, archetypes, evolution, items, Legendary status, kill streaks, downed towers)
  no longer mentions Barricades at all. Barricade gets its own dedicated ❓ button and modal
  (block-strength HP, map expansion) — only one of the two ❓ buttons is visible at a time,
  swapped based on the selected tower's type.

## [1.0.65] - 2026-09-03
- Target-of-target frame now matches the inspect panel's actual rendered height (`min-height` set
  dynamically off the panel's `getBoundingClientRect()`, same call that already positions it) so
  the two plates read as one consistent set instead of the enemy plate looking noticeably shorter.

## [1.0.64] - 2026-09-03
- Attack speed on tower nameplates now uses ⏳ (hourglass) instead of ⚡. Walk speed on enemies
  (the target-of-target frame and the new-enemy-introduced popup) now uses 👟 (shoe) instead of
  ⚡ — distinguishes "how fast it attacks" from "how fast it moves" at a glance instead of both
  sharing the same lightning-bolt icon. Other unrelated uses of ⚡ (Kill Streaks header, shock
  status text, Masterwork gear icons) left as-is.

## [1.0.63] - 2026-09-03
- Starting lives raised from 20 to 30.
- New buy-life button (the ❤️ HUD stat is now clickable): costs gold, exponentially more
  expensive each purchase (`30 × 1.6^purchases` — 30, 48, 77, 123, 197...). Persisted across
  save/load via `livesBought`.
- All 18 enemies rebalanced to be slower but more dangerous: ~28% slower movement speed, ~22%
  more HP, ~15% more bounty and break-damage. Easier to track and react to, but hit harder and
  take longer to kill — same overall difficulty curve, different pacing.
- Added a leisurely walking bob to every enemy, synced to actual distance traveled (not just
  time) so it reads as a real gait rather than idle floating — was previously a totally static
  sprite except for the existing speed-based stretch/squash.
- Widened the archetype-preferred-stat payoff (`PREFERRED_STAT_MULT` 1.25 → 1.6): specialization
  and consistent stat investment now matter substantially more, Dota-style — an under-leveled or
  poorly-specialized tower falls meaningfully behind against the now-tankier enemy roster, instead
  of staying roughly competitive regardless of investment.

## [1.0.62] - 2026-09-03
- Full balance audit across all 13 towers and 18 enemies, done with actual computed metrics
  rather than eyeballing — extracted `CONFIG` and ran standalone Node scripts to compute:
  - **Tower DPS-per-gold-cost** (tier-1, accounting for melee-vs-ranged hybrid modes correctly —
    e.g. Axeman's dual-mode toggle was previously double-counted by summing both instead of
    taking the active one — and poison as a flat DPS bonus at its fixed 600ms tick rate).
  - **Tier-to-tier DPS growth ratios** for every tower (all towers scale ~1.5×-1.9× per tier
    upgrade — already consistent, no changes needed here).
  - **Enemy bounty-vs-threat ratio** (a composite of HP, armor, and speed) to find under/over
    -rewarded enemies.
  - Findings: most of the roster was already internally consistent. Two genuine outliers:
    - **Hammerman** was clearly under-tuned relative to similarly-costed towers (0.248 DPS/gold
      vs a 0.34-0.48 peer range) even accounting for its stun/shield/tank utility — damage bumped
      ~15% across all three tiers (20/30/45 → 23/34/52), landing at 0.285 DPS/gold: still lower
      than pure-damage classes (as its tank role should be), but no longer a stark outlier.
    - **Zombie**'s bounty (9) was low for its threat level — comparable HP+armor profile to Tank
      (150hp/9armor vs Tank's 220hp/6armor) but paid far less than Tank's 14 bounty. Bumped to 12.
  - Deliberately did NOT touch: Bomber (low single-target DPS is offset by its 55-radius splash,
    not captured by a per-target DPS metric), Mage/Cleric (their value is slow/status/curse/heal
    utility, not raw hit damage — by design), or Troll (intentionally the highest bounty-per-threat
    in the game, since its whole gimmick is a short kill window before it wanders off).

## [1.0.61] - 2026-09-03
- Reorganized the expanded stats section: was one cramped wrapping row (points counter, evolution
  hint, and all three STR/DEX/INT buttons all jammed together, wrapping unevenly). Now it's three
  clean stacked rows — a points-available header, an even 3-column STR/DEX/INT button grid, and
  a highlighted evolution-hint callout box below it.
- The evolution hint is now smarter about when to show a prediction: it only calls out a "most
  likely" evolution when exactly one relevant stat is strictly ahead of the others. At the start
  (all zero) or when two-plus stats are tied, it hides entirely instead of guessing — e.g.
  investing the first point in DEX now shows "🔓 9 more DEX → Axeman" or similar, but a fresh
  tower or an even 2/2/0 split shows nothing.

## [1.0.60] - 2026-09-03
- New WoW-style "target of target" frame: when the selected tower has an active target, a small
  red-bordered frame appears just to the right of the inspect panel showing that enemy's emoji,
  name, live HP bar, 🛡️ armor, and ⚡ speed. Only visible while the tower is actively targeting
  something — hidden otherwise.
  - Updates every rendered frame (not just on state-change events like the main panel) so the
    HP bar tracks combat live.
  - Positioned dynamically off the inspect panel's actual rendered width via
    `getBoundingClientRect()` rather than a fixed CSS offset, since the panel's width varies with
    its content.

## [1.0.59] - 2026-09-03
- Barricades no longer earn EXP or level up. They don't attack, so kill/killstreak XP never
  applied to them anyway, but the round-survival XP grant was universal and silently leveling
  them up regardless — fixed at the single `gainTowerExp()` funnel so every XP source respects it.
- New "New Enemy!" popup at the start of any wave that introduces an enemy type the player hasn't
  seen yet — same visual language as the wave-end summary popup, showing that enemy's emoji,
  name, HP/speed/bounty, and a one-line note on its special behavior (e.g. Healer heals allies,
  Skeleton revives once, Troll walks backward for a big bounty). Auto-fades after 5.5s.
  - Tracks `seenEnemyTypes`, persisted in save files; older saves reconstruct it from wave history
    on load so an in-progress run doesn't suddenly re-announce enemies already met.
  - Verified against the wave data that this fires exactly once per new type across waves 1-15,
    matching the one-new-enemy-per-wave pacing shipped in v1.0.52.

## [1.0.58] - 2026-09-03
- Speed button now cycles 1x → 2x → 3x → 5x → 10x → back to 1x (was capped at 3x).
- Added a safety cap (90 physics ticks per rendered frame) to the main loop's fixed-timestep
  catch-up, so a slow device running at 10x can't stall on one giant frame trying to fully catch
  up — any leftover simulation time just rolls into the next frame instead.

## [1.0.57] - 2026-09-03
- Reverted the XP bar's height back to 9px (undoing the 1.0.53 thinning) — that wasn't the
  actual complaint.
- Shrunk the panel's overall max-width from 480px to 320px, so the HP/XP bar (which stretches to
  fill available nameplate width) is shorter and the whole panel no longer runs most of the way
  across the screen.

## [1.0.56] - 2026-09-03
- The 📜 scroll toggle button now glows green (same style as the STR/DEX/INT stat buttons) whenever
  the selected tower has unspent stat points — visible even while the panel is collapsed, so
  players notice there's something to spend without having to open the full options first.

## [1.0.55] - 2026-09-03
- Fixed projectiles spawning visibly lower than the weapon they're supposedly fired from.
  `fireProjectile()` and `fireAxeThrow()` both used a flat shoulder-pivot height (`-13 *
  STICKMAN_SCALE`) for every class, but `drawStickman()` also scales that pivot by each class's
  own body proportions (`JOB_BUILD[type].scaleY`) and by the Legendary 1.1x size bump — neither of
  which the spawn-point math accounted for. Tall/lean classes like Archer (scaleY 1.08) render
  their weapon noticeably higher than the old flat pivot placed it, so their arrows spawned below
  the bow. Both spawn functions now multiply in the same `bodyScaleY` and Legendary factor that
  the renderer actually uses, so the muzzle position matches the visible weapon tip again.

## [1.0.54] - 2026-09-03
- New wave-end summary popup: shows total gold gained this wave, plus a per-class breakdown of
  EXP earned, each row led by that exact tower type's own emoji (e.g. a Blowdart's row uses 🎯,
  not the base Archer's 🏹) sorted highest-XP first. Auto-fades after 4.5s.
  - Added per-wave XP tracking (`tower.waveXp`), reset when each new wave starts, accumulated
    alongside the existing lifetime `xp` field inside `gainTowerExp()`.
  - Added a `waveStartGold` snapshot taken at wave start so the popup can show gold gained
    specifically during that wave (kills, bounty, and the end-of-wave gold bonus), not lifetime
    totals.

## [1.0.53] - 2026-09-03
- XP bar shrunk (9px→6px height, smaller text) so it reads as a slim secondary bar under HP
  rather than competing with it for visual weight.
- Combat stats row (⚔️❤️🛡️🎯⚡🍀) switched from `justify-content:space-between` to centered
  with a fixed 10px gap — the space-between was stretching gaps unevenly wide across the panel
  width. Also pulled tighter against the nameplate above it.

## [1.0.52] - 2026-09-03
- Reworked the first 15 hand-authored waves so each one introduces at most one brand-new enemy
  type instead of dumping several at once — previously wave 6 introduced Zombie and Skeleton
  together, and wave 7 introduced Runner, Splitter, and Wraith all in the same wave. Verified with
  a standalone script confirming exactly one new type per wave across waves 1-15 (wave 2 is a pure
  Grunt ramp-up with no new type, by design).
- True Dota-style stat gating: STR, DEX, and INT damage bonuses are now exclusive to their
  matching archetype instead of all applying at once. Previously every tower got the same +6%
  damage/point from STR regardless of class, with DEX/INT adding *extra* damage on top for
  Archer/Mage types. Now damage comes only from the archetype's own preferred stat — STR for
  Warriors, DEX for Archers, INT for Mages — matching the rate that STR previously had (+6%/point,
  same diminishing-returns curve). STR's +3% max HP/point and DEX's attack-speed/luck bonuses
  remain universal, since those were never framed as the "damage stat."
  - This was already correctly wired for the archetype system (Blowdart, Gatling, Bomber, and
    Squirtgun already counted as Archer-archetype via `CLASS_ARCHETYPE`; Cleric already counted as
    Mage-archetype) — no changes needed there, just the damage formula itself.
  - Updated the STR/DEX/INT button tooltips and the in-game "❓ How Everything Works" modal to
    describe the new gating accurately, and made the tooltips archetype-aware (`CLASS_ARCHETYPE`
    lookup) instead of checking the literal base type, so Blowdart/Gatling/Bomber/Squirtgun/Cleric
    now show the correct damage-stat callout too — previously only the base Archer/Mage classes
    got that tooltip text even though the mechanic already applied to their evolutions.

## [1.0.51] - 2026-09-03
- Blowdart's blowpipe now tracks the target continuously, same pattern as Mage's wand and
  Squirtgun's pistols — it previously only flipped between two fixed left/right poses regardless
  of the actual aim angle, so the pipe visibly wasn't pointing at what it was shooting. The
  projectile's actual spawn point (`fireProjectile()`) was already angle-correct; only the visible
  sprite was static. Draw geometry now matches the muzzle-offset formula exactly
  (`armLen*0.7 + 14*weaponScale`) so the dart leaves right from the pipe's tip at any facing angle.

## [1.0.50] - 2026-09-03
- Nameplate HP/XP bar now stretches to fill the available width next to the portrait instead of
  being capped at a fixed 170px, so it reads as noticeably longer/more prominent.
- Combat stats row (⚔️❤️🛡️🎯⚡🍀) now spreads evenly across the panel's full width
  (`justify-content:space-between`) to match the width of the nameplate row above it, instead of
  clumping on the left with unused space on the right.
- Tightened overall panel padding (10px→8px) and inter-element gap (8px→6px) for a more condensed
  look, per feedback that the previous pass was still too roomy.

## [1.0.49] - 2026-09-03
- Full leveling system rework, replacing the old "gold-tier upgrade = level" mechanic with a
  genuine Dota-style EXP system:
  - Every tower now has its own EXP level (1-99), tracked separately from its gold-bought upgrade
    tier. The nameplate's "Lv." now shows this EXP level.
  - EXP is earned from kills (small, frequent), killstreak milestones (a bigger burst), gold-tier
    upgrades (a flat training bonus), and — new — simply surviving to the end of a round, which
    now grants EXP to every active tower on the board.
  - Each level-up grants exactly 1 stat point, replacing the old flat "+4 points per gold-tier
    upgrade" lump sum, so growth is smaller and much more frequent rather than arriving in big
    chunks.
  - The nameplate's second bar (previously "evolution progress," shown only for evolvable towers)
    is now always visible and shows live XP progress toward the next level instead. Evolution
    progress moved into a small italic hint line in the expanded stats panel
    (e.g. "🔓 STR 7/10 → Hammerman").
  - Added a distinct two-tone level-up chime.
  - Updated the in-game "❓ How Everything Works" modal to explain the new leveling flow.
  - Save/load updated to persist the new `xp`/`expLevel` fields; older saves default to level 1.
  - Verified the leveling curve with a standalone 3-hour simulated-grind script (per the
    game-critical-logic testing convention) — reaches level 99 in a plausible timeframe without
    runaway growth or dead ends.

## [1.0.48] - 2026-09-03
- Reverted the bottom-left close button placement from 1.0.47 — that looked disconnected from
  the nameplate. ❌ now sits inline in the nameplate row, directly to the right of the 📜 toggle,
  same 28×28 square size as the toggle.
- Capped the inspect panel's overall width (`max-width:min(480px, 100% - 16px)`) instead of
  stretching it edge-to-edge across the screen — it was expanding much wider than the content
  needed.

## [1.0.47] - 2026-09-03
- Inspect panel's ❌ close button now matches the 📜 toggle button's size and square shape (was a
  much larger circular badge) and moved from an overlapping top-right corner to the bottom-left
  of the panel, so it no longer visually competes with the nameplate/portrait area.

## [1.0.46] - 2026-09-03
- Nameplate toggle button now shows 📜 instead of the ⌄/⌃ text arrow — the arrow still had a
  legible up/down state, so it's now conveyed with a CSS rotation on the scroll icon instead of
  swapping glyphs.
- Inspect panel's close button now shows ❌ instead of ✕, matching the emoji-forward icon style
  used elsewhere in the panel (⚔️❤️🛡️🎯⚡🍀).
- Condensed the nameplate row: smaller portrait, tighter gaps between the name/level line and the
  HP/evolution bars, and a smaller close button so the emoji doesn't look oversized in its circle.

All notable changes to Stick Tower Defense are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

See `AGENTS.md` for the workflow this file follows. See `BACKLOG.md` for ideas not yet built.

## [1.0.45] - 2026-09-03

- **Fixed projectiles spawning too low** — found the actual bug: the muzzle offset formula was
  purely radial from the tower's ground-level base position, completely omitting the fixed
  shoulder-height offset (`shoulderY = -13`) every class's arm/weapon pivots from before extending
  outward along the aim angle. For the most common case — a roughly horizontal shot at a
  similarly-positioned enemy — the old formula added zero vertical correction at all, so arrows
  spawned from the tower's dead-center ground point instead of ~15 world units up at actual bow
  height. Fixed both spawn sites (the main projectile function and Axeman's thrown axe) by adding
  the same fixed shoulder baseline the render-time hand position already uses, verified with real
  numbers before shipping rather than assumed correct from the formula alone.

## [1.0.44] - 2026-09-03

- **Fixed the close button overlapping the chevron** — moved `#inspClose` out of the flex flow
  entirely and absolutely-positioned it to the panel's own top-right corner, so it can never
  compete for space with the nameplate's chevron again.
- **Condensed the HP bar to real WoW scale** — was stretching edge-to-edge across the whole panel
  via `flex:1 1 auto`; capped the nameplate's middle column to a fixed 170px and shrank the bar
  height, matching how compact real WoW unit frames actually are.
- **Added an evolution-progress bar** — checked first and confirmed there's no actual numeric
  EXP/kill-count system in this game at all; leveling is entirely gold-purchased tier upgrades.
  Rather than fabricate a fake progress bar with no underlying data, built this against what's
  actually real: progress toward the nearest stat-based evolution threshold, honestly hidden for
  classes with no further evolution path (Spearman, Cleric, Squirt Gun, Paladin).
- Logged "expand level cap to 10" and "build a real EXP system" as backlog items rather than
  building them now — both are genuine content/balance projects (7 more tiers × 13 tower configs
  for the level cap alone), not something to fold into a UI polish pass.

## [1.0.43] - 2026-09-02

- **Added exponential-rarity blood stream sizing** — on-hit streams were previously a fixed size
  every time (count=3, no variance). Added an exponential-distribution size roll: verified with a
  20,000-sample simulation that ~58% of hits produce small splatters, ~28% normal, ~10% big, and
  only ~3.4% genuinely huge — a real long-tail rarity curve, not a flat random range. Floored at
  0.6x so blood is never absent on any hit (confirmed the floor still produces ~88-95% of baseline
  size, never zero), capped at 4.5x so the rare huge case stays dramatic without running away
  (up to 2.2x longer, ~2x thicker, nearly 3x as many streams). Both existing call sites (on-hit
  and on-death) get this automatically since the new parameter is optional and backward-compatible
  — death streams now share the same rarity curve as a free consistency win.

## [1.0.42] - 2026-09-02

- **Rebuilt the nameplate to actually look like a WoW nameplate** — added a circular portrait
  frame showing the tower's icon as its "face", a proper HP bar (fill + text overlay, green
  gradient) instead of no health visual at all, and replaced the small inline chevron text with
  a genuinely obvious bordered button (32x32, gold border, higher contrast). Verified every new
  element has exactly one HTML definition and consistent JS references before shipping — full
  syntax and HTML tag-balance checks both passed clean.
- Confirmed the Cleric fixes from the prior message were already shipped (v1.0.40) rather than
  redoing duplicate work — the uploaded screenshot and document were repeats of the same context.

## [1.0.41] - 2026-09-02

- **Added periodic status-effect reminder labels** — burn, curse, slow, and stun on enemies (and
  burn/slow on towers, from breakaway attacks) now surface floating text naming the active status
  every 120 seconds, not just at the moment it's applied. Long-running effects were easy to lose
  track of otherwise. Confirmed `spawnFloatingText`'s actual signature before wiring calls to it
  rather than assuming.
- **Process change**: added `BACKLOG.md` alongside `CHANGELOG.md`, and updated `AGENTS.md` to
  capture ideas and suggestions as they come up mid-conversation, not just completed work.

## [1.0.40] - 2026-09-02

- **Fixed Cleric only ever attacking undead** — confirmed the exact bug: `if(!e.isUndead) continue`
  skipped every non-undead enemy in target selection, meaning Cleric was effectively non-functional
  whenever no undead were nearby. Now targets the nearest enemy of any type.
- **Cleric is now a curse-DoT, not a single instant hit** — reused the existing poison/DoT
  infrastructure (`applyPoison`) instead of a burst `applyDamage` call. Deals 5x tick damage
  against undead specifically. Verified the actual tick math against the real 600ms poison tick
  interval rather than assuming a fixed tick count — undead take up to 138 total damage at max
  tier, normal enemies a real but modest 15-30.
- **Fixed Cleric's damage dropping on evolution from Mage** — confirmed with real numbers: Mage's
  max tier (13) was higher than Cleric's base tier (6), meaning a fully-upgraded Mage evolving into
  Cleric was a straight downgrade. Rescaled Cleric to 14/20/28 — even its base tier now exceeds
  Mage's fully-upgraded one.
- **Fixed the idle pose holding a cross overhead permanently** — the raised casting-arm gesture
  was unconditional every frame, idle or not. Now only raises toward the target while actively
  casting; rests at a natural side position when idle, matching the pattern used by every other
  class in the file.


- **Fixed the compact/expand feature being completely non-functional** — while checking "anything
  else" after the nameplate redesign, found that `#inspFullOptions` had zero matching CSS anywhere
  in the file. Every other `.hidden` toggle in this codebase is defined per-element (there's no
  shared generic rule), and this element never got its own — meaning the JS was correctly toggling
  the class the whole time, but nothing told the browser what that class should actually do to
  this element. The full options section had been showing unconditionally regardless of expand
  state since the feature was built. Added the missing rule and reverified both the JS syntax and
  full HTML tag balance before shipping.

## [1.0.39] - 2026-09-02

- **Fixed the compact/expand feature being completely non-functional** — while checking "anything
  else" after the nameplate redesign, found that `#inspFullOptions` had zero matching CSS anywhere
  in the file. Every other `.hidden` toggle in this codebase is defined per-element (there's no
  shared generic rule), and this element never got its own — meaning the JS was correctly toggling
  the class the whole time, but nothing told the browser what that class should actually do to
  this element. The full options section had been showing unconditionally regardless of expand
  state since the feature was built. Added the missing rule and reverified both the JS syntax and
  full HTML tag balance before shipping.

## [1.0.38] - 2026-09-02

- **Redesigned the panel toggle to match real WC3 nameplate behavior** — removed the separate
  "⌄ Options" button entirely. Tapping the nameplate itself (name + level) now toggles between
  compact and full view, with just a small chevron indicating it's expandable, rather than a
  labeled button explaining what to do. Added proper tap styling (active-state highlight, pointer
  cursor) since no CSS existed for these elements before. Verified full HTML tag balance and
  confirmed no dangling references to the removed button anywhere in the file before shipping.

## [1.0.37] - 2026-09-02

- **Tapping a tower now shows a compact view first, with a "⌄ Options" button to open the full
  panel** — matches the requested WC3/WoW nameplate flow (tap the unit, get basic info, use a
  button to expand into full options) without building a separate canvas-tracked floating overlay,
  which would have needed real-time world-to-screen projection and carried genuine risk of
  positioning edge cases. Reused the existing bottom panel instead: compact by default (name,
  level, combat stats), full options (upgrade/move/sell/target/stats/inventory) collapsed behind
  the button, resetting to compact every time a different tower is newly selected.
- **Caught a genuinely dangerous bug before shipping this** — a bulk find-and-replace used to add
  the reset logic across 10 call sites matched a substring inside the variable's own `let`
  declaration line, inserting an assignment to `inspPanelExpanded` *before* its declaration. This
  is a temporal-dead-zone violation that would have thrown a ReferenceError and crashed the
  entire game on page load — and critically, `node --check` (syntax-only) does not catch this
  class of bug at all, since the code is syntactically valid. Found it by manually reviewing every
  insertion site rather than trusting the syntax check alone, then verified the fix with an actual
  Node execution simulating the real declaration order, not just a re-run of `--check`.

## [1.0.36] - 2026-09-02

- **Fixed remaining projectile-spawn precision errors** — checked every class's muzzle offset
  formula directly against its exact render geometry rather than trusting the earlier
  approximations. Confirmed Mage, Bomber, Gatling, and Squirt Gun were already exact matches
  (no change needed). Found two real, confirmed discrepancies: Blowdart's formula was missing the
  weaponScale multiplier on the pipe length (9.7px error at max INT investment — nearly a third
  of the correct offset), and Archer was missing the +2 draw-tension term the render math applies
  at full draw (2.3px error). Also confirmed the bow's visual midpoint is exactly at the hand
  position (bowTop/bowBot are both offset perpendicular from the hand, not from a further point),
  so "spawns from the middle of the bow" was already structurally correct — the fix was in the
  reach distance leading up to that point, not the concept.

## [1.0.35] - 2026-09-02

- **Added an upgrade-available glow** — a pulsing golden ring appears around any tower that's
  below max level *and* currently affordable, visible directly on the map without needing to
  select the tower first. Confirmed this didn't already exist anywhere in the codebase before
  building it — no nametag or upgrade-indicator system was present at all.
- **Note on scope**: full WC3/WoW-style floating nametags above every active tower (name, level,
  HP bar, expandable panel) is a substantially larger feature — real-time world-to-screen
  projection for potentially 20+ simultaneous towers, with a real risk of cluttering the screen.
  Built the concrete, immediately useful piece (the glow) rather than the full overlay system in
  the same pass; the existing bottom inspect panel already covers stats/leveling once a tower is
  selected.

## [1.0.34] - 2026-09-02

- **Bomber and Gatling now have distinguishing gear** — audited every class and confirmed these
  two (plus Spearman) were the only ones with zero accessory of any kind. Gave Bomber a shell
  pouch on the hip and Gatling an ammo belt across the chest with cartridge marks (reused the
  same geometry already verified clear of the head from the bandolier work). Left Spearman as-is
  — a spear alone is a complete look and doesn't need added gear the way a gunner does.
- **Confirmed no save/load gap from this session's visual work** — checked `serializeGameState()`
  directly: weaponScale, weaponThickness, and decals are all computed fresh from stats (str/dex/
  int/range) that were already being saved, not separate state that needed new persistence.

## [1.0.33] - 2026-09-02

- **Quiver gap widened slightly** — was still reading as a bit too attached to the body.
- **Blowdart now has a hip pouch** instead of no back accessory at all — a small dart pouch on
  the hip, opposite the throwing hand.
- **Squirt Gun now has a bandolier** instead of no accessory — crossed straps across the torso
  with cartridge dots, fitting a dual-gunner better than a quiver would. Verified the bandolier's
  top point stays clear of the head before shipping.

## [1.0.32] - 2026-09-02

- **Blood decals now grow and settle over time instead of appearing instantly at full size** —
  each stain tracks its own spawn time; blobs start small and expand to full size over 0.7
  seconds (verified with the actual curve math), then the whole decal darkens/settles to 75%
  opacity over the next few seconds and holds there permanently — a lasting stain, not a
  vanishing effect.
- **Added occasional directional cast-off streaks** — real blood spatter travels away from where
  the strike came from, not radially outward like a splash. ~40% of kills (when the attacking
  tower is known) now spawn a growing line decal along that actual attacker-to-target angle,
  alongside the normal splatter.

## [1.0.31] - 2026-09-02

- **Quiver no longer merges into the body** — was touching the torso flush at x=0; given a small
  gap plus a visible shoulder strap connecting it to the body, so it reads as worn on a strap
  instead of fused into the silhouette.
- **Blood puddles are only sometimes messy now, not every time** — the extra scattered decals were
  guaranteed on every single kill. Made them probabilistic: verified the actual resulting split —
  65% of kills leave one clean stain, ~35% get the messier multi-splatter look. Every kill still
  leaves a mark, just not maximum chaos every time.

## [1.0.30] - 2026-09-02

- **Projectiles now spawn from the actual weapon tip instead of the tower's center** — confirmed
  the bug: every arrow, bolt, staff blast, and mortar shell was spawning from `this.x, this.y`
  regardless of where the weapon visually is. Fixed for all 6 ranged classes (Archer, Mage,
  Bomber, Gatling, Blowdart, Squirt Gun) plus Axeman's thrown axe — found this was a second,
  separate code path that would've been missed if only the main projectile function was checked.
  The offset replicates the same local-space reach (arm length + weapon length) used when
  rendering the stickman, converted to world-space, so it scales correctly with weaponScale (INT
  investment) exactly like the visible weapon does — verified with real numbers across every
  class and both ends of the INT range (20-40px offsets, growing correctly where the weapon
  itself grows, fixed where it doesn't).

## [1.0.29] - 2026-09-02

- **Quiver rebuilt per spec** — replaced the abstract line-fan with an actual rectangular quiver
  body (filled, outlined) with three arrow shafts and fletching sticking out the top, its inner
  edge touching the torso directly instead of floating disconnected or being hidden behind it.
  Also flipped the side logic — was on the same side as the facing direction, now correctly on
  the opposite side (facing right → quiver on the left, and vice versa). Caught the fletching tips
  poking 2 units into the head with the initial position before shipping, adjusted and reverified
  clear.

## [1.0.28] - 2026-09-02

- **Added a rare "massive pool" tier to blood decals** — was previously a binary normal/big split
  (80%/20%); now a three-tier system where ~70% stay ordinary, ~22% come out noticeably bigger,
  and ~7% are genuinely massive splatters (up to 5x the size of a typical pool). Verified the
  actual distribution and size ranges with a 5000-sample simulation before shipping, not just
  eyeballed the probabilities.

## [1.0.27] - 2026-09-02

- **Actually fixed the quiver rendering in front of the body instead of behind it** — the previous
  three attempts only adjusted its X/Y position, but the real bug was draw order: the quiver was
  drawn *after* the torso, so it always rendered on top regardless of where it sat. Also, the
  quiver was positioned far enough from center (±6 units) that the torso's own line never actually
  overlapped it, so even correct draw order alone wouldn't have occluded anything — verified this
  with the actual geometry before attempting a fix. Brought the quiver base in to ±2 units from
  center and now explicitly redraw the torso on top of it with a deliberately widened stroke,
  confirmed with real numbers to genuinely cover the quiver base this time.

## [1.0.26] - 2026-09-02

- **Screen shake now only triggers on Boss kills** — every single enemy death was shaking the
  screen, which gets tiring fast during dense waves with dozens of kills. Regular kills keep all
  the gore (streams, gibs, particles, decals) but stay visually calm; Bosses stay impactful.

## [1.0.25] - 2026-09-02

- **Real flowing blood streams with water physics** — new particle type that tracks its previous
  position each tick and renders as a genuine connected line (not a dot or dash), tapering in
  width as it loses momentum. Verified with actual physics math: the stream arcs downward under
  gravity while decelerating, exactly like a real jet of liquid rather than scattered dust.
  Directional on hit (uses the actual angle from attacker to target), radiating outward on death.
- **Fixed the Archer's quiver still overlapping the head** — lowered it to back/shoulder-blade
  height and shortened the arrow fan; verified the new top edge sits well below the head boundary
  instead of extending past it.

## [1.0.24] - 2026-09-02

- **Gore now scales with the size of the kill** — a Swarm death is a smaller burst than a Tank or
  Boss death, instead of every kill spawning an identical amount of gore regardless of how tough
  the enemy was. Scales off the enemy's own maxHp, bounded between 0.7x and 1.8x so it stays
  proportional without Bosses spawning an absurd particle count.
- **Subtle idle breathing sway** — towers with no target now have a small vertical bob instead of
  standing perfectly rigid. Each tower's phase is offset by its own position so a row of idle
  towers doesn't all bob in unison.

## [1.0.23] - 2026-09-02

- **Fixed the Archer's quiver on the wrong side of the back** — flipped its position, and made it
  dynamically mirror based on facing direction (was a fixed position regardless of which way the
  Archer was aiming), so it stays correct whichever direction the tower faces, not just the one
  snapshot it was reported in.

## [1.0.22] - 2026-09-02

- **All arms now connect at exactly one shared shoulder point** instead of two nearby-but-distinct
  offset points (was ±1.5-4 units apart depending on class). Applied to all 26 occurrences across
  every weapon-holding class.
- **Chest plate redesigned as a tapered trapezoid** — narrow at the top, widening toward the
  waist, instead of a uniform-width bar. Also moved its top edge from y=-16 down to y=-10, giving
  7 units of real clearance from the neck (was reaching almost up to it).

## [1.0.21] - 2026-09-02

- **Fixed the Archer's drawing-arm shoulder sitting almost on the neck** — verified with real
  coordinates: the back shoulder was landing just 0.5 units below the head/neck boundary when
  facing horizontally, from a shoulder offset (3.5) that was too large. Reduced to 1.8, which
  pulls it to 2.2 units of clearance — over 4x more room — confirmed with the same math before
  shipping, not just eyeballed.

## [1.0.20] - 2026-09-02

- **Armor now draws on top of arms instead of being crossed over by them** — the chest plate
  (level 2+) and helmet (level 3+) were rendered before the arms, so arm lines cut across and
  obscured them. Moved armor rendering to happen after everything else instead.
- **Increased weapon size growth per INT investment** — first attempt at this actually made growth
  *slower* (verified the mistake with real numbers before shipping it, then reverted). The
  correct fix: increased the actual min/max size targets for all 8 classes by roughly 15-30%
  rather than changing the growth curve itself. Confirmed with real numbers that the same amount
  of INT investment now produces a visibly bigger weapon (e.g. Swordsman: 17.5 units old vs. 19.0
  new, at the same realistic investment level) while the zero-INT baseline size didn't shrink.
  Re-verified head clearance against every new max size — Swordsman and Two-Hander needed more
  conservative caps (23/24 instead of an initially-planned 26/30) to stay clear.

## [1.0.19] - 2026-09-02

- **Restored upright weapons when idle/between rounds** — a couple versions ago these were
  switched to hang downward to sidestep a head-clearance issue with the bigger weapon sizes, but
  upright reads better and was the original design intent. Restored the 55°-tilted upright pose
  and re-verified with real numbers (not assumed from before) that every class's current actual
  max size still clears the head at this angle — all 7 confirmed clear, none needed further
  adjustment.

## [1.0.18] - 2026-09-02

- **Fixed the Archer's drawing-arm elbow bending unnaturally upward when facing right (or left)**
  — traced the exact cause: the back shoulder's own offset already sits above center when facing
  horizontally, and the old perpendicular elbow-kick compounded in that same direction, stacking
  the elbow well above the shoulder. Replaced the perpendicular kick with a fixed downward droop,
  matching real archery form (the drawing elbow stays level or drops slightly, never rises).
  Verified with real coordinates for the exact "facing right" case reported — the elbow now sits
  below the shoulder instead of stacked above it, and this holds at every facing direction since
  the droop no longer depends on aim angle at all.

## [1.0.17] - 2026-09-02

- **Fixed the off-hand crossing to the wrong side of the body while swinging** — last version's
  vertical clamp only stopped it from swinging up into the air, but didn't stop the horizontal
  case: when the weapon swings toward the left, its "exact opposite" angle points right, sending
  the off-hand (anchored on the left shoulder) reaching all the way across the body. Confirmed
  this with real angle math before touching code. Rather than patching the direction-tracking
  approach a third time, replaced it entirely — the off-hand is now fixed at its natural resting
  angle regardless of the weapon's swing direction, so there is no longer any possible angle where
  it can cross the body or swing upward, verified by testing it against five different weapon
  angles and confirming the output is now identical every time. Applied to all 6 classes that
  shared the old pattern (Swordsman, Spearman, Mage, Bomber, Gatling, Cleric).

## [1.0.16] - 2026-09-02

- **Fixed the off-hand swinging up into the air while attacking** — it counterbalanced the exact
  opposite of the weapon arm's swing angle, which is correct most of the time but points straight
  up whenever the enemy being fought happens to be above the tower. Clamped so it reflects back
  downward instead, keeping the same left/right lean without ever raising into the air. Verified
  across five different swing scenarios (enemy above, below, left, right, diagonal) — the exact
  "enemy above" case that broke before now stays correctly grounded. Applied to all 6 affected
  classes (Swordsman, Spearman, Mage, Bomber, Gatling, Cleric).
- **Fixed a color mismatch on the Archer** — the nocked arrow shown mid-draw was brown, but the
  actual fired arrow projectile is yellow/gold. Matched them so the same arrow looks consistent
  whether it's being drawn or already in flight.

## [1.0.15] - 2026-09-02

- **Weapons are noticeably bigger at base, and STR now makes them thicker** — added a new
  `weaponThickness` stat (diminishing returns, capped at 1.8x) applied to blade width, crossguard
  size, hilt size, and equivalent head/tip geometry across every weapon-holding class. INT still
  controls length via the existing system, now with meaningfully larger min/max ranges per class
  (e.g. Swordsman went from 9-12.5 to 14-24 units).
- The bigger base sizes meant the old straight-up idle pose no longer had enough vertical
  clearance below the head, so idle weapons across all affected classes now tilt 55° instead of
  pointing straight up — verified with real numbers that every single class's new maximum size
  stays clear of the head at this angle, not just guessed at.

## [1.0.14] - 2026-09-02

- **Fixed arms visually floating away from the torso** — every two-armed class positioned its
  arms starting ±3 to ±4 units to either side of the torso's centerline, with nothing drawn to
  bridge that gap, so arms read as disconnected from the body. Reduced to ±1.5 across all 15
  affected call sites (still enough separation to distinguish left/right, but close enough to
  read as actually attached).
- **Fixed the Archer's drawing-arm elbow flaring the wrong way** — the elbow kick used a fixed
  rotational formula independent of which side the back shoulder actually sits on, so depending
  on which direction the Archer was facing, the elbow could bend toward the body instead of away
  from it. Now kicks in the same direction the back shoulder is already offset, which is
  guaranteed correct regardless of facing — verified across all four cardinal directions, not
  just the one that happened to look right during testing.

## [1.0.13] - 2026-09-02

- **Found and removed the actual root cause of every "extra limb" report across this entire
  session.** There was a leftover global block — drawn unconditionally, for every class except
  Axeman and dual/two-hander Swordsman specs, completely outside the careful per-class off-hand
  systems that were built afterward — that stamped a hardcoded extra arm-like line (0,-12) to
  (-10,-2) on top of everything else, every single frame. Every class already had its own correct
  off-hand logic; this was pure leftover dead code silently drawing a genuine extra limb on top of
  it the whole time. Manually verified (not just scripted) that Swordsman, Mage, and Spearman each
  render exactly the arms they should — no more, no less — with this block gone.

## [1.0.12] - 2026-09-02

- **Fixed weapon size changing when a tower swings/fires** — idle and engaged poses were computing
  weapon length from two entirely different formulas (a short idle-safe base vs. the old full
  combat length), so the weapon visibly grew or shrank depending on whether the tower had a
  target. Replaced with a single shared function (`weaponLenFromScale`) that both states now call
  identically — same length whether idle or mid-swing, only INT/range investment changes it.
- Every weapon-holding class now has an explicit min length (at no INT invested) and max length
  (at that class's own range cap), verified with real numbers: min is hit exactly at baseline,
  max is hit exactly at the range cap, and the value never overshoots even against out-of-range
  inputs. Applied to all 8 classes — Swordsman, Axeman, Spearman, Hammerman, Mage, Bomber,
  Gatling, and Squirt Gun.

## [1.0.11] - 2026-09-02

- **Fixed weapon growth (INT/range investment) being completely invisible when idle** — a
  regression from the head-overlap fix two versions ago. Proved it with real numbers: every
  weaponScale from 1.0x to 1.6x was clamping to the exact same length, meaning INT investment had
  zero visible effect on idle weapon size, for all 7 affected classes (Swordsman, Spearman,
  Hammerman, Mage, Bomber, Gatling, Squirt Gun). The fix: idle poses now use their own shorter
  base length sized to fit entirely within the safe head-clearance budget, so growth is visible
  at every single step across the realistic range, while the clamp remains as a safety net only
  for genuinely extreme edge cases (e.g. a maxed-out Two-Hander).
- **Lowered the shoulder pivot slightly** (y=-15 → y=-13) — the previous "attach arms at the
  body's edge" fix had overcorrected a bit too high.

## [1.0.10] - 2026-09-02

- **Random pool-size variance** — roughly 1 in 5 blood pools now come out dramatically bigger
  (verified: up to 2.6x larger at the extreme, not just marginal noise), with more blobs and a
  wider spread, so the ground doesn't fill up with uniform puddles.
- Pushed overall gore further: more particles in every layer, more gib debris per kill (up to 10
  at high graphics), and a third scattered stain per death for a genuinely messy, uneven pool
  rather than a tidy ring around the kill point.

## [1.0.9] - 2026-09-02

- **Fixed Archer's drawing arm — the real cause of the recurring "extra limb" look.** The string
  arm was using the same generic fixed-segment-ratio arm function as every other class, but that
  function assumes a roughly full-length reach. Pulling it in close (as short as 6 units, early
  in the draw animation) forced the upper arm and forearm into a cramped, overlapping fold that
  read as an extra limb. Replaced with proper geometry for this specific case: the string hand
  slides back from the bow grip along the aim axis exactly like a real draw motion, and the elbow
  kicks out perpendicular to the shoulder-to-hand line so it stays clean at any pull distance.
  Verified with real geometry math across the full draw cycle (0% to 100%) — both arm segments
  stay a sane, non-degenerate length the entire time, no collapse at any point.

## [1.0.8] - 2026-09-02

- **Significantly escalated gore intensity** — main blood burst nearly doubled (22→42 particles),
  added a third bright high-velocity spray layer, and a new tumbling "gib" debris system (chunky
  rotating squares, distinct from the fine spray, with heavier physics). Pooling decals now spawn
  two overlapping stains per death instead of one, each with more and larger splatter blobs.
  Screen shake on kill increased and lasts longer. On-hit spray (not just kills) also boosted, so
  every hit reads as visceral, not just the kill itself.
- Fixed a real bug caught before shipping the above: the particle pool is reused in a circular
  buffer, so a slot previously used for the new gib debris could leak its rotating-square render
  mode into a later, unrelated particle spawn. Every regular particle spawn now explicitly resets
  that flag.

## [1.0.7] - 2026-09-02

- **Extended curated waves from 20 to 100** — rather than hand-typing 80 one-off arrays (slow,
  error-prone, hard to balance consistently), built on the existing procedural-wave formulas and
  added two new archetypes: 🃏 Trick (opens deceptively weak, then springs Splitters/Trolls/Tanks
  mid-wave) and ⛏️ Grind (a long, widely-spaced slog testing sustained DPS and economy rather than
  burst reaction). Waves cycle through 7 archetypes with a dedicated 👑 Boss milestone every 10th
  wave (30, 40, 50...100), all baked into real, concrete wave definitions rather than left to
  run-time randomness.
- Caught and fixed a real overflow bug during generation: the original count-scaling formulas,
  uncapped, would have produced a 698-enemy wave by wave 98 — nearly 3x the enemy pool's actual
  220-object capacity, meaning most of that wave would have silently failed to spawn. Capped the
  scaling input so the worst-case wave (157 enemies) stays safely under the pool limit.
- The wave-type toast (previously only shown for waves beyond the hand-authored range) now also
  fires for these new curated waves, so the Trick/Grind/Boss distinction is visible in-game.

## [1.0.6] - 2026-09-02

- **Fixed idle weapons overshooting past the head** — a regression from raising the shoulder
  pivot two versions ago (to fix arms attaching at the middle of the body): every class's idle
  "weapon held straight up" pose never got re-checked against the new, higher shoulder position,
  so the sword/staff/hammer/etc. tip was crossing up into the head — confirmed with actual
  geometry math, not just a guess (blade tip landed inside the head's circle at every weapon
  scale, even the base case). Added a shared clamp so any idle weapon's upward reach is capped
  just below the head, applied to all 7 affected classes (Swordsman, Spearman, Hammerman, Mage,
  Bomber, Gatling, Squirt Gun) from one shared function.

## [1.0.5] - 2026-09-02

- **Gravity on gore particles** — the blood burst on hit/death now arcs and falls instead of
  spraying out in a flat radial pattern, reading as actual directional spray rather than a
  generic particle puff. Every other particle use (gold pickups, sparkles, star effects) is
  unaffected — gravity is opt-in per spawn.
- **Persistent ground blood decals** — enemy deaths in gore mode now leave a permanent pooling
  stain on the ground (a few overlapping irregular blobs, not a plain circle), capped at 150
  active stains on a circular buffer so it stays performance-safe over a long session. Clears on
  a new game and immediately when gore mode is turned off.

## [1.0.4] - 2026-09-02

- **Extended curated waves from 15 to 20** — 5 new hand-authored waves escalating through the full
  enemy roster (heavier Tank/Zombie/Wraith combinations, denser Swarm/Wolf floods, an Undead
  Uprising, and a Shielded/Splitter gauntlet), ending in a bigger 2-Boss finale at wave 20.
  Procedural generation still takes over seamlessly past that, unchanged.
- **Steeper per-wave HP scaling** — 20% growth per wave instead of 15%, so difficulty ramps up
  meaningfully faster across the whole game, not just in the new waves.
- Confirmed Barricades were already correctly restricted to path tiles only (this had been flagged
  as possibly missing — checked the actual code and it was already implemented correctly).

## [1.0.3] - 2026-09-02

- **Fixed DEX/INT damage bonuses not applying to evolved classes** — the check was against a
  tower's literal type (`'ARCHER'`, `'MAGE'`) rather than its archetype, so Blowdart, Squirt Gun,
  Gatling, Bomber, and Cleric all silently lost their own archetype's primary damage scaling the
  moment they evolved. Now checks archetype, so every class in a family keeps its stat scaling
  through every evolution stage.
- Added an Attack Speed stat (⚡, attacks/second) to the tower inspect panel — previously only
  visible indirectly through cooldown timing, not shown as an actual number anywhere.
- Squirt Gun now renders holding actual pistol emoji (🔫) instead of plain grey line-shapes.

## [1.0.2] - 2026-09-02

- **Fixed arms attaching at the middle of the body instead of the shoulder** — the shared shoulder
  pivot every class's arms draw from was sitting roughly a third of the way down the torso rather
  than at the top edge near the neck. One constant change fixes this for every class at once.
- **Redesigned Blowdart's rendering** — replaced its continuous-angle arm/pipe rig (the same
  fragile pattern that kept causing detached-looking limbs) with a simple left/right facing flip:
  one arm fixed in a mouth-held pose, mirrored depending on which side it's shooting toward,
  instead of tracking an arbitrary rotation angle.
- Removed the static version line from README.md — it duplicated the in-game version display and
  was easy to forget updating, causing it to silently drift out of sync.

## [1.0.1] - 2026-09-02

Class identity overhaul: three starting towers with a full evolution tree, a real stat system
with archetype preferences and diminishing returns, and a much deeper combat layer (poison, holy
damage, accuracy). Also a significant mobile/rendering pass — this was the single largest patch
since 1.0.0.

**Class archetypes & evolution**
- Only Swordsman, Archer, and Mage are directly buildable now. Every other class — Axeman,
  Spearman, Hammerman, Gatling, Blowdart, Bomber, Cleric — is reached by investing 10+ points into
  a specific stat on one of those three, a one-way transformation that keeps accumulated stats.
- New second-tier evolution: Blowdart → Dual Squirt Gun at 25 DEX, twin water pistols spraying
  corrosive green acid.
- Every class belongs to one of three archetypes (Warrior/STR, Archer-style/DEX, Mage/INT) — a
  tower's favored stat is 25% more effective per point than the same investment on a mismatched
  class.
- Diminishing returns on every stat: every 5 points invested, the next 5 are worth progressively
  less, down to a 25% floor.
- Some classes cap out early on a stat that doesn't fit their identity — Mage/Cleric/all four
  melee classes plateau on accuracy at 15 DEX; Archer plateaus on HP at 15 STR.

**Stat effects**
- STR: damage and max HP. DEX: attack speed, accuracy (new miss-chance system, 12% base), and
  🍀 Luck — bonus gold per kill. INT: range, plus class-specific bonuses (Mage's own damage,
  Archer's own damage, Blowdart/Squirt Gun's poison strength).
- Random stat growth on every level-up (0-2 in each stat, plus a bonus 1-2 in the favored stat),
  on top of manually-spendable points (bumped from 3 to 4 per level).
- 100 total stats invested makes a tower Legendary — name it, permanent +10% size, +5% max HP,
  +5% damage reduction.

**Combat & status effects**
- Poison (Blowdart/Squirt Gun), holy damage bonus vs. undead (Cleric's smite, 1.5x + armor
  bypass), chain lightning on the Mage's shock proc.
- A tower that hits 0 HP is now locked out of action for the next 2 full rounds, not just a
  short timer.
- Kill streaks retuned: 1.2s window between kills (was too forgiving), splash/cone hits only
  count once toward a streak regardless of how many enemies they kill at once.

**New enemies & towers**
- Zombie, Wraith, Skeleton (revives once), Wolf (pack speed bonus) — Zombie/Wraith/Skeleton
  tagged undead, vulnerable to holy damage.
- Cleric tower — heals the board's lowest-HP tower once per round (multiple Clerics coordinate,
  never piling onto the same target), separately smites nearby undead.
- 6 procedurally-generated wave archetypes past wave 15 (Swarm Surge, Elite Vanguard, Undead
  Uprising, Ambush Tactics, Siege Assault, Standard) instead of one scaling formula forever.

**Rendering & animation**
- Every weapon-holding class now has both arms genuinely rendered and connected — several classes
  had been missing an off-hand entirely, or had one frozen independently of the weapon arm's
  actual swing/aim angle.
- Idle stance (no target): both arms at a symmetric 45°, weapon held up, independent of arm angle.
  Engaged: weapon points/swings at the target, off-hand counterbalances opposite it.
- Fixed heads rendering as ovals instead of circles — the head was drawn as a perfect circle, but
  after each class's own non-uniform body scale had already been applied to the canvas transform,
  so the circle was getting stretched by that ratio. Radii are now pre-compensated per class.
- Weapon visual length now scales with a tower's actual range (INT investment).

**Mobile & UI**
- Fixed the root cause of the game needing "Desktop site" mode to render correctly on phones — a
  hard CSS block was completely hiding the game whenever the screen was portrait, and separately a
  camera-clamp formula assumed the viewport and the world were always the same size.
- Canvas now fills the actual window at native resolution instead of a fixed letterboxed frame.
- Consolidated two separate "?" info buttons into one comprehensive help modal.
- Moved the Expand button into the Build menu to reclaim HUD space.

- Swordsman attack speed increased (~13-15% shorter cooldown across all tiers).
- Archer attack speed decreased (~13-15% longer draw + cooldown cycle across all tiers) to better
  balance its higher per-shot damage from the draw mechanic.
- Inspect panel stat display reworked: STR/DEX/INT no longer look like disabled/dimmed buttons —
  they stay normal-colored always, gain a green glow specifically when points are available to
  spend, and use a recessed inset-shadow "slider" style instead of a flat raised-button background
  so they read as a display, not a clickable action. Info icons (❓) for STATS and INVENTORY moved
  to sit before their labels and lost their button chrome (plain glyph, no circle/border).

## [1.0.0] - 2026-08-31

First versioned release. Baseline snapshot of the full feature set built up to this point.

- **8 tower classes plus Barricade** (Swordsman, Archer, Axeman, Spearman, Hammerman, Mage, Bomber,
  Gatling) — each with a distinct color identity, body build, and combat role, so classes read as
  visually distinct at a glance rather than reskins of the same figure.
- **Archer draw mechanic** — the bow now visibly charges before firing instead of snapping to a
  static pose; slower arrows but real damage behind a completed draw, because the old instant-fire
  archer didn't read as an archer at all.
- **Expanding spiral map** — starts as a tiny 2x2 area (half path, half buildable), and grows ring
  by ring as waves clear. Expansions alternate between extending the path as a connected spiral
  loop and adding pure buildable space, so the map both winds outward visually and gives you room
  to build, rather than regenerating into a disconnected new shape each time.
- **Barricade** — a non-attacking, path-placeable obstacle. Freezes the first enemy that touches it
  (and anything queued behind it, spaced so they never overlap) — HP only drops from actual hits,
  rate-limited to 1 point per 2 seconds, because a passive timer didn't feel like a "health" stat.
- **Breakaway enemies** — Fire and Ice types (and a small chance for any enemy) can leave the path
  entirely to attack a tower directly, inflicting burn or a slow debuff on it. Gives towers actual
  stakes beyond just DPS math.
- **Troll enemy** — big bounty, walks backward toward the entrance instead of forward, and can
  swing at a nearby tower to drop debris that costs gold to clear.
- **Hero item system** — every tower starts with free class gear; better gear (Iron/Gold/Masterwork)
  is bought per-class from the Shop, plus global passives that apply to every tower owned. A tower
  with all 4 slots filled awakens as a Hero with a permanent stat bonus.
- **Infinite waves** — procedurally scaled difficulty continues past wave 15, since this is meant
  to support long hero-building sessions rather than end at a fixed wave count.
- **Settings menu** — Video (graphics quality), Audio (mute), Game (18+ gore toggle, save/load),
  About (in-app README viewer/downloader).
- **Save / Load** — full game state serializes to a downloadable `.txt` file with a random seed
  header; restorable on this device or any other. Save files are stamped with the game version.
- Numerous balance passes (Swordsman attack speed up, Archer attack speed down, melee swing arc
  widened so it reliably hits everything within its stated range) and bug fixes (an upgrade-cost
  method name colliding with a same-named tier data field, which silently broke every tower upgrade
  past the first one; a Barricade HP display bug caused by a generic regen system applying to a
  tower type it shouldn't have; map generation that could leave zero buildable tiles in a small
  starting region).
