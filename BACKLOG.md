# Backlog

Ideas, requests, and suggestions that have come up but aren't built yet. See `AGENTS.md` for the
workflow this file follows — move items to `CHANGELOG.md` and delete them from here once shipped.

## Performance — deferred from the 1.2.44 verified-fix pass

Both scoped from direct code inspection (not from the external Gemini analysis, which mislocated
or hallucinated several claims). Deliberately not attempted in 1.2.44 — real risk of a gameplay/
visual regression if rushed, worse than the lag they'd fix.

- **Settled-decal offscreen baking.** `decals` (array, ~`decals.length` entries) are redrawn in
  full immediate-mode (`drawOneDecal()`, called from `drawDepthSortedLayer()`) every frame for
  the life of the decal, confirmed via `perfStats.visibleDecals` / `perfStats.totalDecals`. Once
  a decal has finished its dynamic phase (splatter animation, color/oxidation aging) it could be
  stamped once onto the existing offscreen `mapCanvas` and spliced out of the active `decals`
  array. Needs, before attempting: (1) the exact field/condition that marks a decal as visually
  "done" — must not bake a decal still mid-animation or its motion freezes visibly; (2) handling
  `dprValue` scaling identically to how `mapCanvas` itself is scaled; (3) what happens to baked
  decals across `rebakeMap()` (map ring expansion) — they need to survive it, not vanish.
- **`activeBarricades` tracking list**, to let `findTouchingBarricade()` skip scanning the full
  `towerPool` for non-barricade towers. Confirmed 4 tower-creation call sites
  (`acquireActive(towerPool)` at 4 locations); destroy/sell paths not yet fully enumerated. A
  tracking list that falls out of sync with actual tower state is a silent gameplay bug (phantom
  or missing barricade collision), not just a missed optimization — needs every mutation site
  enumerated and covered before shipping, not a partial pass.
- **`drawDepthSortedLayer()` per-frame sort-wrapper allocation.** Builds a fresh `items = []` plus
  one `{ sortY, kind, ... }` wrapper object per visible enemy/tower/scenery/decal, every frame, to
  feed the Y-sort. Fixable with a pooled scratch array of reusable wrapper objects, but needs the
  sort kept stable (items at equal `sortY` must not visibly swap render order frame-to-frame) —
  not attempted without confirming `Array.prototype.sort()`'s stability guarantee holds under
  reused-object mutation here.

## Performance — deferred items from the 1.1.31–1.1.33 audit passes

Shipped: idle-simulation fast path (skips enemy-collision work when there are genuinely zero
active enemies), scenery + decal viewport culling, removing a second `getBoundingClientRect()`
read from the camera-pan hot path, and always-on frame/update/render/visible-count telemetry
(`perfStats` in the console). Deferred, in roughly the order a future pass should tackle them —
now that `perfStats` exists, these should be evaluated against real on-device numbers before
being attempted, not from reading code alone:

- **A real design tension found, not a bug — flagging rather than silently changing it.**
  `const low = false;` in the gore-intensity code has an explicit comment: "blood intensity is
  controlled ONLY by the goreMode toggle, never by graphics quality — full gore shows at any
  graphics setting as long as gore is enabled." That's a deliberate content-rating decision (gore
  is a maturity toggle, not a performance knob), not an oversight — but it does mean Low graphics
  currently gets full gore density regardless. Worth an explicit decision: keep gore fully
  decoupled from performance (current behavior), or let Low graphics reduce gore density too while
  keeping the on/off toggle itself independent. Not changed without being asked.
- **Static scenery/decal caching** — bake unchanging scenery and fully-dried blood into offscreen
  canvas layers instead of redrawing every visible item every frame, with explicit cache
  invalidation on clearing/spawning/map-expansion. Chunked (e.g. 256-512px world tiles) rather
  than one world-sized canvas, given the real memory cost of `width × height × 4 bytes` per
  full-world RGBA buffer — calculate that cost against `WORLD_MAX_W`/`WORLD_MAX_H` before building
  it. Genuinely deferred rather than attempted alongside the safer culling wins: invalidation
  correctness (scenery mid-clear, new spawns, map expansion, tallStretch variation, blood still
  actively aging/dripping) carries real risk of visual bugs if rushed, and viewport culling alone
  already resolves the loudest reported symptom (idle panning cost scaling with total world size
  rather than what's actually on screen) with much lower risk. Worth revisiting once `perfStats`
  shows culling alone isn't enough.
- **Spatial-hash allocation churn** — `buildEnemyHash()`/`queryNearby()` allocate fresh
  objects/arrays on every call during real combat (not just the idle case already fixed). Reusing
  storage or switching to numeric cell keys would reduce GC pressure in dense waves — check
  `perfStats.updateMs` during a dense wave first to see whether this is actually worth doing.
- **`MAX_TICKS_PER_FRAME = 90`** — a very high catch-up ceiling for the fixed-timestep loop.
  `perfStats.maxTicksSeen` now tracks this directly — check it after a long dense-wave session
  before deciding whether the ceiling is ever actually approached on real devices.

## Audio mastery — deferred passes (reference: 5 uploaded game-audio books, treated as first-tier
## principles; current index.html as second-tier implementation authority — see AGENTS.md)

The reference material's own master prompt explicitly says "DO NOT IMPLEMENT EVERYTHING IN ONE
PATCH" and lays out an 11-pass order. Pass A (audit) and Pass B (cheap wins: family-cooldown
suppression, stable per-tower bias, 5x/10x secondary-layer thinning, debug counters, click-safety
verification) shipped in 1.1.21. The remaining passes, in the reference document's own order, NOT
attempted — each is a genuinely large, call-site-touching change that deserves its own dedicated,
verified pass rather than being folded into an already-large session:

- **Pass C — true 2D distance.** `panFor(worldX)` verified X-only (no Y at all) — confirmed by
  reading the actual function, not assumed from the books. Adding real distance would mean
  propagating world Y to `playSound()`, which has **61 call sites** (verified by count) — a much
  larger, riskier change than the one-call-site fixes in Pass B. Needs: a listener tied to camera
  world center, squared-distance early rejection before node construction (cull before
  synthesizing, not after), and distance-based timbre/attenuation, not just gain.
- **Pass D — voice intelligence.** Semantic priority tiers (VITAL/IMPORTANT/OPTIONAL) and
  optional voice stealing, layered on top of the existing 28-voice cap and the new family
  suppression from Pass B — not a replacement for either.
- **Pass E — minimal bus architecture.** MASTER → COMBAT/GORE/AMBIENCE/UI, so shared processing
  (EQ, ducking, limiting) happens once per bus instead of being re-applied per voice.
- **Pass F — procedural impact model prototype.** Impulse + resonant response for 2 cases only
  (blade/hard-target, hammer/heavy-target) per the reference document's explicit "start small,
  compare against current sound in real combat, don't generalize if it's worse" guidance.
- **Pass G — material response system**, reusing whatever authoritative material/biology
  classification already exists in the gore system rather than inventing a parallel taxonomy.
- **Pass H — forensic gore audio integration**, so the wet-sound layer agrees with the actual
  visual gore mechanism (impact spatter vs. cast-off vs. passive pooling) instead of one generic
  wet-hit sound regardless of mechanism, and stays silent for non-biological/fully-shielded hits.
- **Pass I — heavy-attack polish** (Sniper, Bomber, boss) once the runtime foundation above is
  stable.
- **Pass J — creature/ambience sound**, only after the combat mix itself is settled.
- **Pass K — whole-palette mastering pass**: audition every major class sound back-to-back for
  consistent perceived loudness/timbre, a phone-speaker translation check, and a mono-compatibility
  check — real listening tests, not something verifiable from source code alone.

## From the 2026-09-13 ChatGPT "master implementation prompt" (barricade fix, Mage DPS rebalance,
## attract-mode redesign, pixel-precise hitboxes, projectile hit/miss pre-roll architecture, and
## the elemental attunement overhaul already shipped in 1.1.47-1.1.53 — everything below is still
## outstanding)

Each needs its own scoped, tested pass per `AGENTS.md` §5 (touches collision/save/entity-lifecycle
risk categories) rather than being bundled into one giant rewrite.

- ~~Pixel-precise enemy hitboxes~~ — shipped in 1.1.50 (alpha-mask narrow phase layered on the
  existing broad-phase circle test; real-glyph visual QA across platform emoji fonts still pending
  an in-browser pass, since this environment has no live Canvas to verify actual glyph shapes).
- ~~Projectile hit/miss pre-roll architecture~~ — shipped in 1.1.52 (`willHit` decided at launch in
  `fireProjectile()`/`fireAxeThrow()`, subtle intercept correction for committed hits, guaranteed
  misses skip collision entirely, dead-target-mid-flight cancels cleanly). Verified via an isolated
  Node re-implementation of the logic, 2000 trials per invariant — real in-browser playtesting
  against SWARM specifically (the stress case named in the original review) still pending, since
  this environment has no live game loop to run the actual file end-to-end.
- ~~Elemental attunement + evolution overhaul~~ — shipped in 1.1.53. `ATTUNEMENTS`
  (STR→Fire/DEX→Electric/INT→Ice, 100pt permanent lock) + `SPECIALIZATIONS` (500pt evolution)
  replace the old flat `threshold:20` first-tier evolutions for Swordsman/Archer/Mage.
  `checkAttunementAndSpecialization()`, save persistence, `migrateLegacyAttunement()` for old
  saves, and the inspect-panel hint were all added; verified with an isolated Node test (16
  assertions: lock-once behavior, no premature specialization from an unattuned stat, all 3 Archer
  branches, and the migration tie-break rules specifically). New `MARKSMAN` class fully defined
  (config/stats/rendering/sound/validation) as Archer's Ice path, replacing the old, review-flagged
  `int→BOMBER` mapping. Scope decisions worth knowing about, not silently glossed over:
  - ~~Bomber and Gunalinder are orphaned from fresh evolution~~ — no longer true, fixed in a later
    pass (see the "every build unit traced to an unlock" entry below): `Gatling → Bomber` (the
    exact future-tier idea this note originally said was out of scope) was decided and
    implemented, closing the gap. This bullet is kept for history, not as a current issue.
  - **Mage has no Fire (STR) specialization.** No existing Mage evolution fits a heavy-impact
    identity, and the review says not to fabricate one just to fill the matrix — an attuned Fire
    Mage simply stays a Mage.
  - **Mage's Ice (INT) specialization is Cleric, a known imperfect thematic fit** (holy/anti-undead,
    not frost/control) kept only because reassigning Cleric's whole identity was out of scope for
    this pass — flagged in the `SPECIALIZATIONS` comments in `index.html`, not hidden.
  - Real in-browser visual QA for Marksman's new rendering, and actual playtesting of the full
    attunement progression across a real game, are both still pending — this environment has no
    live Canvas/game loop to verify either end-to-end.
- ~~Attract-mode redesign~~ — shipped in 1.1.49 (3-Archer formation, perimeter spawns, phased
  calm→action→intense→aftermath→fade vignette).
- **Inspect-panel responsiveness pass.** Prefer CSS grid/flex sizing over `fitStatRowToOneLine()`'s
  whole-row `transform:scale()` for the button row specifically — same no-clipping/no-wrapping
  goal, less legibility loss at extreme late-game values.

## From the 2026-09-13 external code review (ChatGPT, reviewing v1.1.56) — ALL 20 findings now
## confirmed and fixed as of 1.1.72. Full list: 1.1.57 (decal ReferenceError crash, duplicate death
## processing), 1.1.58 (bleed-cap damage not actually capped, Barricade-in-inventory NaN stat
## corruption, coincident-enemy collision never separating), 1.1.61 (axe projectiles inheriting
## poison/magic-missile state), 1.1.62 (pooled enemies inheriting wetFeetSteps/packSpeedBonus),
## 1.1.63 (wave-spawn-queue pool exhaustion losing enemies), 1.1.64 (projectile/firing-cycle pool
## exhaustion consuming cooldown/burst-shots), 1.1.65 (evolution retaining old class fields —
## splashRadius, slowFactor/slowDuration), 1.1.66 (empty-hash query short-circuit, barricade
## queue-scan short-circuit), 1.1.67 (unspent-stat-points scroll blur ungated on Low graphics),
## 1.1.68 (viewport culling for enemies/towers in the depth-sort), 1.1.69 (redundant inspect-panel
## refresh on unrelated-tower kills, positionZoomControls() layout-forcing read on every HUD
## update), 1.1.70 (pointercancel committing actions, save/load not reconstructing Swordsman
## spec/totalSpent), 1.1.71 (restart leaving hitStopUntil/groundItems/deathAnims/accumulator
## un-reset — the most severe bug found in this whole triage, a genuine post-restart soft-lock),
## 1.1.72 (fast-forward not rechecking gameState mid-loop, restoreGameState() mutating live state
## before validating a malformed save). One item was investigated and deliberately left alone with
## documented reasoning, not silently skipped — see "Five separate spatial-hash builds" above.

The review is thorough and specific (exact line numbers, several claims backed by extracted-and-
executed function tests), but it reviewed a static upload, not this live file, so re-verification is
required before acting on any of it — several past sessions in this project have already found that
"looks right on paper" and "confirmed by reading the actual code" are different things worth keeping
separate.

**High-priority correctness bugs — all confirmed and fixed:**
- ~~Pooled enemies retain previous-occupant state across reuse~~ — the full trio the review named
  together (`bleedStackCount`, `wetFeetSteps`, `packSpeedBonus`) is now all fixed: `bleedStackCount`
  in 1.1.58, the other two in 1.1.62. `packSpeedBonus` was the more serious of the two — it's only
  ever recomputed inside `if(this.pack)` in `update()`, so a non-pack enemy reusing a pack-enemy's
  old slot kept a stale speed multiplier permanently, since nothing else ever touched that field
  for it.
- ~~Axe projectiles inherit poison/magic-missile state from a previous shot~~ — fixed in 1.1.61.
  `fireAxeThrow()` never set `poisonDamage`/`poisonDuration` (fireProjectile() does), and separately
  never set `isMagicMissile` either — both real leaks from pooled reuse, the second one visual (a
  reused slot could render a thrown axe as a glowing magic bolt).
- ~~Evolution retaining old class-specific fields~~ — fixed in 1.1.65. `burstCount`/`burstDelay`
  were already explicitly zeroed before `Object.assign()` applies the new tier; checking every
  evolution edge systematically (not just the cited example) found two more real ones needing the
  same treatment: `splashRadius` (confirmed — Bomber→Gunalinder would still deal unintended AOE
  splash, contradicting Gunalinder's own "trades splash for precision" identity) and
  `slowFactor`/`slowDuration` (Mage→Cleric/Pope, lower-impact since Cleric/Pope's own attack path
  never reads them, but still real stale state). Blowdart→Squirtgun was checked too and needs no
  fix — both classes define poison fields in every tier.
- ~~Save/load not fully reconstructing Swordsman specialization or `totalSpent`~~ — fixed in
  1.1.70. Confirmed both exactly: `restoreGameState()` was setting `t.spec` as a bare label
  (`t.spec = td.spec`), completely bypassing `chooseSpec()`'s actual damage/cooldown/swing-arc
  multipliers — a loaded Two-Hander looked right (label, rendering) but fought like an
  unspecialized Swordsman. Now calls the real `chooseSpec()` method. `totalSpent` was never
  persisted in the save payload at all, so loading any save reset every tower's upgrade-investment
  tracking back to its base build cost, undercutting sell value for anything that had been
  upgraded — now persisted, with an explicit safe fallback (the base-cost default) for saves that
  predate this field.
- ~~`pointercancel` sharing a handler with `pointerup`, committing actions on cancel~~ — fixed in
  1.1.70. Confirmed exactly: `onPointerEnd()` had zero check on `e.type`, so a browser-interrupted
  gesture (notification, system gesture, pointer leaving the window, multi-touch conflict) could
  still commit a tap, drop a ground item onto whatever tower/tile happened to be underneath, or
  place a Barricade. Cancel now only does cleanup (release pointer tracking, clear drag state) —
  the ground item involved in a cancelled drag simply stays in `groundItems` untouched, since it
  was never removed in the first place.
- ~~Restart leaving `hitStopUntil`, `groundItems`, `deathAnims`, and the fixed-tick accumulator
  un-reset~~ — fixed in 1.1.71. The most severe bug found in this whole triage: `hitStopUntil`
  gates the ENTIRE simulation tick (`if(gameTime < hitStopUntil) return;` in the main loop) with no
  safety cap of its own, and `resetGame()` reset `gameTime` back to 0 but left `hitStopUntil` at
  whatever stale value a Boss kill in the *previous* session had set it to — restarting after any
  Boss kill could freeze the entire new game's simulation until `gameTime` caught back up to that
  stale value, potentially for minutes depending on how long the prior session ran. Also cleared
  `groundItems`/`deathAnims` (stale entries from the old map/session) and `accumulator`/`lastTime`
  (the fixed-tick loop's own time-tracking, already reset at other legitimate points elsewhere —
  just missing here; lower severity than `hitStopUntil` since `frameTime`'s existing 100ms clamp
  and the 90-tick-per-frame cap already bound how bad a stale value could be).
- ~~Fast-forward not rechecking `gameState` between fixed-tick iterations~~ — fixed in 1.1.72.
  Confirmed exactly: the accumulator-driven catch-up loop only checked `gameState` once, before
  entering, never between individual ticks — a game-over firing mid-loop (e.g. lives hitting 0)
  still let the remaining queued ticks that frame (up to `MAX_TICKS_PER_FRAME=90`) run full
  simulation on an already-ended game. Added `gameState === 'PLAYING'` to the loop's own condition.
- ~~`restoreGameState()` mutating live session state before validating a loaded save~~ — fixed in
  1.1.72. `restoreGameState()` destructively clears all live state (enemyPool/towerPool/
  sceneryMap) in its very first lines, before any validation at all — so a malformed-but-parseable
  save corrupted the live session before the crash that revealed the problem even happened, with no
  way back. Added `validateSaveShape()` as a gate in `loadSaveFileText()`, checking the specific
  fields `restoreGameState()` dereferences without a guard early on (`pathWaypointTiles` is the
  exact field whose absence threw the review's reproduced `Cannot read properties of undefined
  (reading 'map')` error, inside `rebuildPathCellsAndPx()`) — rejects the load before any mutation
  begins, leaving the current run completely untouched. Not exhaustive validation of every nested
  field, but closes the reproduced crash and the most common real failure mode (a non-save file, or
  one from an incompatible/corrupted source).
- ~~Enemy wave-spawn-queue pool exhaustion~~ — fixed in 1.1.63. `spawnQueue.shift()` was removing a
  due entry *before* knowing whether `spawnEnemy()` actually acquired a pool slot, so an exhausted
  pool (220-enemy cap, plausible in a real late-game wave with splits/reinforcements/a barricade
  backup) silently lost that enemy forever rather than deferring it. Checked both split-children
  spawn sites (Boss's periodic Grunt, Splitter's on-death children) while in this code — both
  already guarded correctly (`if(!child) break/continue`), so only the wave queue had this bug.
- ~~Projectile/firing-cycle pool exhaustion~~ — fixed in 1.1.64. Confirmed across all 3 firing
  callers (`updateArcher()`, `updateRanged()`, `updateAxeman()`'s ranged mode): each unconditionally
  set the cooldown (and, for burst weapons, decremented `burstShotsLeft`) right after calling
  `fireProjectile()`/`fireAxeThrow()`, with no check on whether a projectile slot was actually
  acquired. `fireProjectile()`/`fireAxeThrow()` now report success/failure; all 3 callers only
  consume the cooldown/burst-shot on confirmed success, retrying automatically next frame otherwise.

**Performance items — all confirmed and fixed except one deliberate exception (see below):**
- ~~`drawDepthSortedLayer()` drawing every active enemy/tower unconditionally, with no viewport
  cull~~ — fixed in 1.1.68. Extends the exact same bounds-check pattern already proven for scenery,
  with a wider margin (covers floating text/HP bars/labels) and an explicit exemption for
  `selectedTower` (confirmed it's the only tower that ever draws a range circle, which can extend
  far beyond its own body — it must never be culled regardless of position). Simulation is
  completely untouched; this only skips the draw() call for something that couldn't be visible.
- ~~`Tower.draw()`'s unspent-stat-points scroll icon blur ungated on Low graphics~~ — fixed in
  1.1.67. Every other glow effect in this file (the item-pickup glow right above it, ground items,
  the magic-missile projectile glow) already follows the same `graphicsQuality === 'low' ? 0 : ...`
  pattern; this was the one place it was missing, running unconditionally for every tower with
  unspent points, every frame.
- ~~Idle towers querying a known-empty spatial hash~~ — fixed in 1.1.66. `queryNearby()` now
  short-circuits with an identity check against the shared `EMPTY_ENEMY_HASH` sentinel, skipping the
  full nested cell-scan entirely (the review measured up to ~169 empty bucket lookups per query at a
  300px range) rather than doing real work to find nothing.
- ~~Combat-event UI updates each triggering their own full refresh~~ — fixed in 1.1.69, two
  distinct real issues found: (1) `updateInspectPanel()` reads the *global* `selectedTower` rather
  than taking a parameter, so `creditKill()`'s own unconditional call at the end was refreshing the
  panel on every kill in the game as long as *any* tower was selected, even a completely unrelated
  one — removed, since `gainTowerExp()` (called unconditionally at the top of every `creditKill()`)
  already does the correct `if(selectedTower === tower)` gating internally. (2)
  `positionZoomControls()` (a `getBoundingClientRect()` layout-forcing read) was called
  unconditionally from every single `updateHUD()` — but `#hud-top` uses `flex-wrap:nowrap`, so its
  height never actually changes from gold/lives/wave updates, only from a real resize/orientation-
  change (already separately handled) or the one-time reveal when the game starts (now handled
  explicitly at that one call site instead).
- Five separate spatial-hash builds per simulation tick, each allocating fresh bucket storage —
  count confirmed (`resolveSweptEnemyCollisions()`: 1, `resolveEnemyCollisions()`'s 3-pass
  relaxation loop: 3, final targeting hash: 1). Deliberately not touched: the 3 builds inside
  `resolveEnemyCollisions()` aren't redundant — its own comment explains the multi-pass design
  exists specifically so a crowd can settle within one frame instead of visibly fighting over
  several, and each pass moves enemies, so the hash genuinely goes stale between passes. Cutting
  the rebuild count would risk exactly the "stale hash used across passes that move enemies"
  regression the review itself warned against. A safe version of this optimization would need to
  reuse the hash's bucket-array storage across builds (object pooling) rather than reduce how many
  times it's built — a real but more invasive change than the other items in this list, and not
  attempted here without a way to verify it under real load.
- ~~Barricade/pileup queue-assignment search quadratic even with nothing queued~~ — fixed in 1.1.66.
  The O(N²) catchment-matching loop can only ever succeed by matching against an already-blocked
  enemy, so a single `anyBlockedSeed` flag (set alongside the existing per-enemy pass that already
  seeds `claimedSlots`) now skips the whole loop when nothing is blocked — the common case, and
  exactly 4,950 wasted iterations for 100 eligible enemies per the review's own math.
- ~~Audio synthesis (`tone()`/`noise()`) constructing oscillator/gain/filter nodes while muted~~ —
  fixed. Confirmed real: `duck()` already had an `isMuted` guard, but `tone()`/`noise()` — the
  actual node-creating primitives, called both by `duck()`'s callers and directly elsewhere — had
  no such check, so every sound call still built real Web Audio nodes and consumed a voice-budget
  slot even with the game fully muted. Added the identical guard `duck()` already used, placed
  before `reserveVoiceSlot()` too so a muted sound doesn't take a slot an audible one could have
  used. Verified with an isolated test: unmuted calls create real nodes, muted calls create zero,
  and unmuting again correctly resumes normal behavior.

**Design questions raised, not bugs:** ~~the review flagged that `SPECIALIZATIONS`' 500-point
threshold and the pre-existing deeper `EVOLUTIONS` thresholds (Blowdart→Squirtgun at 40,
Marksman→Sniper at 60) could both already be satisfied by the time a tower reaches its 500-point
specialization, making the intermediate class a very brief stage rather than a real milestone~~ —
**moot now, not fixed directly but resolved by the no-transform redesign.** This concern only made
sense when the tower itself transformed (a Swordsman literally becoming a Spearman, carrying its
accumulated stats straight into the next threshold check). Now that a tower never transforms, a
Marksman built from the Build menu starts at 0 stats and has to independently grind its own way
toward Sniper's threshold from scratch — there's no "instant pass-through" scenario left for this
to describe. Kept here as a record of what the concern was and why it no longer applies, not
deleted outright.

**Process recommendation from the review, worth adopting regardless of how the above triages**:
require a same-scene before/after comparison (frame-interval p50/p95/p99, not just `node --check`)
for any change touching update/render loops, collision, targeting, UI refresh, or object lifetimes.
This project has no way to run a browser in this environment to produce that measurement — every
"performance fix" shipped so far has been justified by allocation/logic reasoning and isolated
Node tests, never an actual measured frame-time before/after. That's a real gap worth being
upfront about rather than implying otherwise.

## From the same 2026-09-13 external review — a smaller "still needs targeted validation" list from
## its final round, previously only mentioned in passing and never actually filed here. Re-checked
## against this file: three fixed, one genuinely still blocked on profiling this environment can't do.

- ~~Long-run stat cost (`diminishingStatValue()`)~~ — fixed. The function's tier multiplier floors
  at 0.25 once `tier >= 5` (25+ points) — every point beyond that computed an identical per-chunk
  value via the loop instead of one multiplication. Directly relevant now: a single stat can
  realistically reach several hundred points under the attunement system (500 for specialization,
  750 for Cleric's own Pope evolution), where the old version would loop 100+ times for a
  mathematically constant result. Rewrote the tail as closed-form arithmetic — verified with an
  exhaustive equivalence test against the original loop-only version across ~7,200 (points,
  perPoint) combinations plus the exact new threshold values (100/500/750): bit-identical output
  everywhere, confirming this is a pure speed win with zero behavior change, not a rebalance.
- ~~Target-panel positioning (`updateTargetFrame()`)~~ — fixed. Geometry invalidation covered
  window resize and the frame's own visibility transitions, but not a *different tower being
  selected* while the frame stayed continuously visible throughout (both towers having an active
  target) — a real gap, since `#inspect-panel` has no fixed height (rows are conditionally shown
  per tower type, e.g. Barricade shows fewer than a normal tower), so two different towers'
  panels genuinely can differ in size. Added tracking of which tower the frame's geometry was last
  calculated for, marking it dirty on a change. Verified: a tower switch now triggers a recalc; the
  existing "same tower, many calls" optimization still avoids repeated recalcs, no regression.
- ~~Pause and camera feedback (wheel handler)~~ — fixed. Confirmed pause sets `gameState =
  'PAUSED'`, and the main loop skips rendering entirely whenever `gameState !== 'PLAYING'` — so
  scrolling to zoom while paused updated `camera.zoom` correctly, but nothing re-rendered until
  unpausing, at which point the camera would visibly jump to the new zoom all at once instead of
  the player seeing it happen live. `render()` is a pure drawing function with no simulation side
  effects, so it's safe to call directly — now does, but only while actually paused (the normal
  playing case already gets a fresh frame within ~16ms via the main loop regardless, so nothing
  extra happens there). ~~Pan/pinch gestures had the same underlying gap~~ — also fixed, in a
  later pass: the exact same one-line nudge (`if(gameState !== 'PLAYING') render(ctx);`) added to
  both the pinch-zoom branch and the single-finger pan branch of the pointermove handler.
- **First-hit hitch (`buildEnemyCollisionMask()` / `getEnemyCollisionMask()`)** — genuinely still
  blocked on profiling, not fixed. Confirmed the mask cache is correctly lazy and per-type (built
  once, reused), matching what it should do — the open question is purely whether the *first* hit
  against a never-before-seen enemy type incurs a measurable one-time hitch from the lazy
  glyph-rendering/readback, which this environment has no way to measure. Prewarming upcoming
  wave types would be the fix if profiling ever shows this matters; not attempted speculatively.

- **Enemy seen jumping ahead on the path for no apparent reason** — reported once, no repro
  details (which enemy type, which system was active — pack speed bonus, swept collision push,
  barricade queue snap, or a slow/freeze wearing off could all plausibly look like a "jump" from a
  glance). Not investigated blind; needs at least the enemy type and roughly what else was
  happening on screen (barricade nearby? pack of similar enemies? just got hit by something?) to
  narrow down which system to check first.

## Phase 2 — COMPLETE as of 2026-09-15. All four dual/triple-element combinations from the
## original design (Steam→Blow Gunner, Proton, Dark Matter, Quasar) are now implemented and
## shipped (see CHANGELOG.md). Originally scoped out deliberately: inventing a brand-new tower
## class from scratch (full stats/rendering/sound/validation, the same checklist Marksman needed)
## was judged a much bigger, riskier undertaking than the unlock-tracking system in Phase 1 — that
## caution turned out to be reasonable but not fatal; all four got built incrementally, one at a
## time, each verified against the real code before the next one started. Kept below as the design
## record of how it actually happened, not rewritten as if it were all planned from the start.

- **Dual and triple-element combinations — all four now implemented.** A tower pushed toward a
  second (or third) element rather than just growing the one it's already locked into combines
  into a hybrid, "doing both" (or all three) of its parent elements' effects:
  - 🔥 Fire + ❄️ Ice → **Steam** → unlocks **Blow Gunner** on Archer only — implemented (see
    `HYBRID_SPECIALIZATIONS`/`checkAttunementAndSpecialization()`). The one combo that stayed
    single-base-class; the other three all ended up reachable from anywhere.
  - 🔥 Fire + ⚡ Electric → **Proton** (purple) — implemented, reachable from ALL 3 base classes.
  - ⚡ Electric + ❄️ Ice → **Dark Matter** (black) — implemented, same all-3-base-classes shape as
    Proton.
  - 🔥 Fire + ⚡ Electric + ❄️ Ice, all three equally → **Quasar** (white) — implemented, also
    reachable from all 3 base classes, via a genuinely different check shape than the other three
    (see below).
  This closes the naming gap flagged in an earlier version of this doc — worth recording how each
  open question actually got resolved, not just that it did:
  - **The dual combos fit the existing attunement model well** — a tower already locked into one
    element (`this.attunement`) whose OTHER element's own stat ALSO reaches
    `SPECIALIZATION_THRESHOLD` (500) unlocks the hybrid, alongside its own single-element
    specialization, not instead of it. Confirmed by building three of them this way (Steam,
    Proton, Dark Matter).
  - **"Which base class(es)" turned out to have a real answer beyond "pick one": reachable from
    ALL of them.** First established for Proton by explicit request ("all towers can turn into all
    elements with the right stat combo"), then reused directly for Dark Matter and Quasar without
    needing to re-derive it — `HYBRID_SPECIALIZATIONS` already supported a target being reachable
    from multiple base classes (one entry per base class, all pointing at the same target); this
    pattern is now proven three times over, not a one-off.
  - **"All three equally" for Quasar turned out to have a real answer too, once reframed.** The
    blocker was never that it was impossible — it's that it doesn't fit
    `HYBRID_SPECIALIZATIONS`'s pairKey system, which is built entirely around `this.attunement`
    being one locked value. Quasar simply doesn't go through that system at all: it's checked as
    its own fully independent condition in `checkAttunementAndSpecialization()` — all three raw
    stats (str/dex/int) each reaching `SPECIALIZATION_THRESHOLD` — the exact same technique Cat
    Snapper's raw-DEX check already used to bypass the same system for a different reason. No new
    numeric threshold invented, no change to how `this.attunement` itself works.
- **Classes unlocked by each hybrid, first-reach-anywhere — all four shipped**:
  - Steam → **Blow Gunner**: `poisonDamage` (scald DoT, reusing Blowdart/Squirtgun's field) +
    `slowFactor`/`slowDuration` (chill, reusing Mage's) — both already generic on impact, no new
    status-effect code.
  - Proton → **Proton** (class shares its combo's name): same poisonDamage/slowFactor reuse,
    purple, burn-weighted.
  - Dark Matter → **Dark Matter**: same reuse again, black, slow-weighted instead of burn-weighted
    — the differentiation between all three of these is in the DoT/slow ratio and color, not a new
    mechanic each time.
  - Quasar → **Quasar**: adds `splashRadius` (AoE, already generic on impact, same field
    Bomber/Squirtgun use) on top of the shared poisonDamage/slowFactor combo — genuinely stronger
    in kind, matching that it's gated on 1500 total stat points instead of 1000.
  Each got the full definition checklist Marksman needed originally: `CONFIG.TOWERS` stats/tiers,
  color palette, build scale, job quotes, tower-strategy blurb, `RANGE_CAPS`, `CLASS_ARCHETYPE`
  (all four tagged MAGE regardless of unlock source, matching Cat Snapper's own precedent),
  ranged-shot sound, `EVOLVED_TOWER_TYPES` registration, and validated with real tests against the
  actual extracted code each time — not stubs. Rendering reused the shared Mage/Snapcaster branch
  (extended once, to cover all four) rather than four separate near-duplicate branches.
- **Infrastructure already in place for this, from Phase 1**: `unlockedTowerTypes` (the Set, now
  proven to persist correctly across save/load, and now generalized to cover every tier — not just
  first-tier specializations, see the Phase 1 note below), `showUnlockToast()`, and the
  locked/unlocked Build-menu row pattern are all reusable as-is for however hybrids end up
  triggering — Phase 2 should extend that same system, not build a second parallel one.
- **Explicit confirmation this design was already correct**: Phase 1 shipped with towers actually
  transforming into what they unlocked (`evolveInto()` changing `this.type`); a later explicit
  clarification established that a tower must NEVER change its own type, ever — only unlock the
  next tier as separately buildable. Phase 1 was reworked accordingly (`evolveInto()` is now
  unused/dead code, kept defined rather than deleted). This Phase 2 doc's own design was already
  written assuming exactly that "unlock, don't transform" model, so it needed no changes for the
  clarification beyond the identifier renames above.

### Full proposed unlock-tree map (consolidated 2026-09-15, by request — every class ever
### suggested anywhere in this project's history, mapped against the real current tree; nothing
### below this line is implemented or committed to, it's an index of what's ALREADY specified
### above/elsewhere in this file plus where the gaps actually are)

The real, shipped tree first, since every proposal below only makes sense relative to it — see
`SPECIALIZATIONS`/`EVOLUTIONS` in `index.html` for the source of truth, this is just laid out as a
tree for scanning:

```
SWORDSMAN (Warrior/STR)         ARCHER (Archer/DEX)             MAGE (Mage/INT)
├─ 🔥 HAMMERMAN → PALADIN       ├─ 🔥 GATLING → BOMBER           ├─ ⚡ SNAPCASTER (no deeper tier)
├─ ⚡ AXEMAN → BERSERKER        │         → GUNALINDER → SNIPER  └─ ❄️ CLERIC → POPE
└─ ❄️ SPEARMAN → LANCER        ├─ ⚡ BLOWDART → SQUIRTGUN            (Mage has NO 🔥 Fire path at all —
                                └─ ❄️ MARKSMAN → SNIPER (same         intentional existing gap, not
                                   endpoint as the Fire chain)        an oversight — see AGENTS.md)
```

Every proposal below is a gap-fill or extension of the above, never a replacement — nothing here
overrides an already-shipped class or threshold.

**Axeman/Spearman's deep tier — shipped**: Berserker (Axeman, STR 40) and Lancer (Spearman, DEX 40)
— see CHANGELOG.md 1.2.36. Every Swordsman-lineage branch now has a second tier; this was the last
gap. Note this is NOT the same as the "Warrior tree restructure" proposal further below (which
wanted Axeman itself renamed to "Knight Errant" with Berserker as flavor-staged above that, plus a
separate Hammerman/DEX branch) — what actually shipped is the simpler, purely-additive version:
Axeman keeps its own name and identity, Berserker/Lancer are just its and Spearman's own next tier,
same shape as Hammerman→Paladin already has. The restructure proposal remains just that, unbuilt.

**Hybrid-element classes** (full spec in the Phase 2 entry above this map) — **all four shipped,
this map section is now historical**:
- 🔥+❄️ Steam → unlocks **Blow Gunner** on Archer — **shipped** (see `HYBRID_SPECIALIZATIONS` in
  `index.html`, and CHANGELOG.md).
- 🔥+⚡ Proton (purple) → unlocks **Proton** (the class shares its combo's own name) — **shipped**,
  reachable from ALL 3 base classes rather than one, by explicit request ("all towers can turn
  into all elements with the right stat combo").
- ⚡+❄️ Dark Matter (black) → unlocks **Dark Matter** — **shipped**, same all-3-base-classes shape
  as Proton, confirming that pattern wasn't a one-off — reused directly, no reinvention needed.
- 🔥+⚡+❄️ equally → Quasar (white) → unlocks **Quasar** — **shipped**. The "doesn't fit the
  single-locked-attunement model" problem noted below was real but not fatal: solved by not
  routing it through that model at all — a fully independent raw-triple-stat check
  (str/dex/int each ≥ `SPECIALIZATION_THRESHOLD`) in `checkAttunementAndSpecialization()`, the
  same bypass technique Cat Snapper's own raw-DEX check already used.

**STR-Mage specialization** (full spec in the "large batch of feature requests" entry below,
search this file for "Rogue Sorcerer" for the ORIGINAL proposed version of this): **shipped**,
but not as originally proposed here — built as a direct single-tier Mage specialization
(`SPECIALIZATIONS.MAGE.FIRE = 'NECROMANCER'`, structurally Cleric's mirror) with a skeleton-raising
mechanic, by explicit later request, rather than the 3-tier Rogue Sorcerer → Crazy Wizard →
Necromancer HP-sacrifice-AoE chain originally sketched below. The original 3-tier chain concept
remains just that — a still-unimplemented idea, listed for history, not a description of what
actually shipped. Worth noting the archetype-exclusivity flag from the original proposal below
does NOT apply to what actually shipped: the built Necromancer is a normal INT-scaled
MAGE-archetype class (its own STR-gated *unlock*, same as Cleric's INT-gated unlock, but its
damage still scales off INT like every other Mage-archetype class) — the original chain's
STR-heavy-damage idea, and the "first deliberate exception to archetype-exclusive damage" concern
that came with it, was never actually built.

*Original, unbuilt 3-tier chain concept, for history:* Mage (grown STR-heavy instead of the usual
INT) → **Rogue Sorcerer** → **Crazy Wizard** → **Necromancer** (HP-percentage self-sacrifice AoE
finisher, 1-10% of caster's own max HP per cast, 120s shared cooldown, locked out below 10% HP).
Would have been the first deliberate exception to archetype-exclusive damage in the whole tree
(only STR drives Warrior damage, only INT drives Mage damage, see `README.md`'s Leveling section)
— a real design decision this doc flagged as needing to be made explicitly, not quietly
special-cased in code, if it were ever built. Superseded by the shipped version above; kept here
only as a record of the original idea.

**Warrior tree restructure** (full spec in the same "large batch" entry) — **partially superseded**:
Axeman renamed **Knight Errant** as a pre-evolution flavor stage, with **Berserker** as a further
tier above it (no threshold specified); separately, an Hammerman that then invests DEX (instead of
continuing toward Paladin's INT path) branches into an unnamed distinct dual-wielding class. The
"give Axeman a deeper tier" half of this shipped (see above) — as a Berserker, but WITHOUT the
Axeman→Knight Errant rename, which never happened. The remaining, unbuilt part of this proposal is
narrower now: just the separate Hammerman/DEX branch — a genuine restructure of an already-shipped
part of the tree (Hammerman's single INT-only path into an actual branch), carrying more save-
compatibility/balance risk than the purely-additive Berserker/Lancer addition above did.

**Non-combat NPCs proposed alongside the above** (not towers, not part of the unlock tree, noted
here only because they came up in the same "classes we've discussed" sweep): a static Merchant NPC
gated behind wave 5 (part of the still-open Dota-style item-drop economy), and a wobbling Dwarf
Builder NPC (Hammerman-proportioned, bright orange).

- **Reported: enemies "stick"/seem to have free will at a congested chokepoint, wants a strictly
  preset path.** Investigated, not changed. Confirmed by reading the actual movement code
  (`getPositionAtTraveled()`) that enemies already move along a fixed, precomputed path polyline
  via a single `traveled` distance scalar — this is not steering/free-roaming pathfinding, the
  path itself is exactly the preset system being asked for. What's actually causing the visible
  "sticking" is `resolveEnemyCollisions()`'s local separation/push logic, which perturbs enemies
  perpendicular to the path when several overlap at a chokepoint (like a Barricade) — necessary to
  prevent enemies from perfectly stacking/overlapping, but visually reads as wandering off the
  path when a crowd is dense. That function's own comments document an extensive prior history of
  tuning specifically for this symptom (corner hang-ups, sideways-shoving, double-separation).
  Didn't touch it further without being able to see the result — real risk of undoing already-
  careful prior work blind. If revisited, needs actual visual verification of the outcome, not
  another speculative parameter tweak.

## Ideas

- **External review proposal (2026-09-15, not verified, not implemented)** — a large, unsolicited
  external document proposing two separate bodies of work. Logged here as a summary of themes, not
  a spec to build from — most of it was never checked against the actual code, and treating an
  external AI's speculation as fact (rather than something to verify first) is exactly the trap
  this project has avoided all along. One concrete, checkable claim from it (`spawnQueue.shift()`
  being an O(n) anti-pattern) WAS verified and fixed — see CHANGELOG.md 1.2.26. The rest:
  - **Engineering-process ideas**: explicit state machines for Enemy/Tower/Wave/Projectile instead
    of ad-hoc boolean combinations; a startup validator pass (this project already has
    `validateGameDefinitions()`, worth checking how much of this it already covers before assuming
    a gap); separate RNG streams for wave generation vs. combat rolls vs. cosmetic variation, to
    support a deterministic-replay debug mode; centralized target-invalidation so a
    dead/downed/escaped entity can't linger as a stale reference anywhere; explicit rules for what
    save/load treats as persistent vs. reconstructable vs. transient state; a telemetry/percentile
    frame-time system; an "actual speed vs. requested speed" diagnostic for the game-speed
    multiplier; a disabled-by-default in-file debug self-test harness (specific test cases listed:
    one downed tower removes exactly one life, dead enemies can't be targeted, killstreak survives
    save/load, wind only appears on configured waves, etc.).
  - **Wave-design/economy proposal**: shift wave philosophy from "survive a spike" toward
    "sustained farming" — more total enemies per wave, weaker/more plentiful filler enemies
    (suggested 70-80% of a wave), phased wave construction (warm-up → steady stream → mixed →
    rest → specialist pressure → cleanup → optional elite → reward tail), a real
    results/preparation state between waves instead of auto-rushing into the next one, one
    authoritative death-reward event (kill credit/XP/gold all from a single confirmed last hit,
    never duplicated), a wind schedule (calm through wave 29, gentle tutorial at 30, rare "high
    wind" later — already broadly matches what actually shipped, see the wind system in
    CHANGELOG.md 1.2.19/1.2.21), and target calm-weather hit rates (Swordsman 100%, Archer
    90-95%, Mage 85-90% — this project's actual numbers are close already, worth a real
    comparison before assuming a mismatch). Also proposed smaller "minion" versions of existing
    enemies — weaker, cheaper, filler-tier XP/gold — as a specific, more scoped piece of the
    filler-enemy idea above.
  - None of this has a committed design here — flagged as themes worth considering, each one
    individually, verified against the real code first, not a batch to implement together.

- **"Dark Wizard" concept (mentioned 2026-09-15, not started)**: a crowd-control tower that lifts
  an enemy in place — "force choke" style — dealing damage over time while it's suspended rather
  than a normal instant hit; the enemy can't move while lifted, but stays a valid target for other
  towers to keep attacking during that window. Per-hit damage would be lower than a normal attack
  but land faster/more often, since it's a channeled effect rather than a single strike. The
  description trailed off mid-thought when it came up ("...since it's only doing damage when
  it's...") — genuinely incomplete, not a spec to build from yet. Would need at minimum: which
  base class/stat combo unlocks it, a name, how "suspended in place" actually interacts with the
  existing movement/pathing system (closest precedent is the stun system —
  `applyStun()`/`stunMs` — but a suspended enemy reads as a bigger visual/behavioral departure
  than a stun, not just a longer one), and the actual damage-over-time numbers.

## Design ideas from a deeper skim of "The Principles of Beautiful Web Design" (2026-09-13) — not
## implemented, kept separate from the code-review bug triage above since these are speculative
## design suggestions, not confirmed problems. Grounded in specific sections, not general vibes.

- **Continuance (eye-flow along a line/direction) for the Next Wave button.** The book's example:
  once a viewer's eye starts moving in one direction, it keeps going until something more dominant
  interrupts it — used deliberately, this can guide attention toward a specific call-to-action (the
  book's own Twitter example: the Sign Up button gets continuance + isolation + contrast all at
  once). Right now Next Wave is just another top-bar button with no directional cue pointing at it.
  A subtle idea worth trying: when the wave timer is idle and waiting on the player, a faint
  pulsing arrow or directional glow leading toward it — cheap, reversible, easy to rip out if it
  reads as nagging rather than helpful.
- **Placement — confirmed the game already gets the big one right, not a gap.** The book: center
  and top-left are where a viewer's eye goes first. Build sits top-left (correct instinct already),
  and the inspect panel opens bottom-left when a tower is selected (a deliberate, different zone,
  not competing with Build). Noting this as confirmed-good rather than silently assuming it's fine.
- **Proportion (scale mismatch draws attention) — also confirmed already correctly used, not a
  gap.** Boss enemies are already rendered dramatically larger than regular enemies, which is
  exactly the book's own principle ("an object placed in an environment smaller in scale than
  itself will appear larger... draws viewers' attention, as it seems out of place"). Worth
  confirming this extends to any future big/rare enemy variant — it already applies correctly to
  the existing "BIG!" variant spawn chance, which visibly scales the sprite up.
- **Color psychology — a specific, narrow idea, not a broad repaint.** The book notes orange is
  rare in nature and "tends to jump out" precisely because it's uncommon — currently unused as a
  dedicated signal color anywhere in the UI (gold/red/blue are all already claimed for currency/
  danger/info respectively). A "BIG!" variant enemy or a rare item drop could use orange
  specifically *because* nothing else in the palette currently means anything with it — giving it
  a genuinely unique signal rather than competing with an already-meaningful color. Speculative;
  would need to check nothing else already implies orange=X elsewhere before touching it.
- **Balance (symmetrical vs. asymmetrical) — worth a deliberate look, not yet done.** The book's
  asymmetrical-balance principle: a large element on one side can be balanced by several smaller
  elements on the other, and removing any one of them (its own three-stones example) makes the
  whole composition feel lopsided. Never actually evaluated whether the current gameplay screen
  (top bar centered, inspect panel bottom-left only, no persistent right-side element) reads as
  balanced or left-heavy once a tower is selected — this needs an actual look at a real screenshot
  with a tower selected, not a guess from reading CSS, before deciding whether it's worth touching.
- **Repetition/unity via a repeated small motif.** The book's Dribbble example: repeated thumbnail
  treatment across many cards creates unity even in a visually busy layout. The game already
  repeats a lot (button gradient treatment now consistent, serif headlines consistent) — a smaller
  idea not yet tried: a single small repeated decorative motif (e.g., a tiny corner flourish) on
  every modal panel, the kind of detail that reads as "one designed system" rather than "several
  separately-styled screens." Purely optional polish, not chasing a real gap.



- **Voice budget shipped as a flat global cap (1.0.205), not the full tiered priority system** —
  `reserveVoiceSlot()` protects the engine from unbounded concurrent voices during swarm/explosion
  moments, and critical UI/system sounds bypass it via the new `force` param. What's NOT built:
  per-family priority tiers (combat feedback vs. standard impacts vs. ambient each with their own
  sub-budget) and true voice-stealing (killing an already-playing low-priority voice early to make
  room for a higher-priority one, with a fade-out to avoid clicks) — the current version only ever
  refuses new low-priority sounds, never stops an already-started one. Worth a follow-up if the
  flat cap ever proves too coarse in practice.
- **Distance-based audio mix** — sounds currently pan by camera-relative X (`panFor()`) but have
  no distance attenuation or filtering; only worldX is passed to sound calls, not worldY, so true
  2D distance isn't available without adding a Y param at every call site (a real change, not a
  quick tweak). Would make close fights read as more "in your face" by contrast with quieter,
  slightly low-passed distant combat.
- **Minimal procedural adaptive music layer** — a sparse idle motif, a stinger on wave start, an
  intensity layer during boss waves, resolving back to the motif on game over. A genuine feature/
  design decision (not a polish tweak) — needs its own dedicated pass with mute/preference
  handling and CPU profiling, not something to fold into an audio-polish batch.
- **Tower "sonic identity" formalization** — each tower archetype already has a distinct procedural
  sound (bright/metallic Swordsman, low/heavy Hammerman, string-like Archer, etc.), but this lives
  as ad hoc parameter choices scattered through `SoundEngine.play()`'s switch statement. Worth
  extracting into named palettes (e.g. `AUDIO_PALETTES.METAL_BLADE`, `.BLUNT`, `.MAGIC`) that class
  recipes combine with class-specific modifiers — makes adding a new evolution's sound safer and
  more consistent than hand-tuning frequencies from scratch each time.
- **Three-stage (pre-transient / transient / body-tail) sound envelopes for major attacks —
  prototyped on Mage cast and Hammerman/Paladin swing (1.0.214)**, exactly the 2-sound prototype
  this entry originally called for. Not yet generalized further — worth extending to Bomber's
  explosive lob and Sniper's shot (the other two "heavy, rare" hits) if the pattern reads well in
  actual play, but not to every attack; light/fast attacks (Gatling, Blowdart) don't have the
  weight to justify the extra scheduled layers.
- **Input-action abstraction layer** (physical input → semantic action, e.g. `BUILD_OPEN`,
  `PAUSE_TOGGLE`, `NEXT_WAVE`) — the current Pointer Events handling is solid, but game logic and
  physical input are somewhat coupled in `handleTap()`. A thin dispatcher would let future input
  methods (keyboard shortcuts, gamepad) reuse the same game commands rather than each needing its
  own bespoke wiring. Not urgent — no current input method is blocked by this — but worth doing
  before adding a second input scheme.
- **Page Visibility handling** — no `visibilitychange` listener exists; the fixed-timestep loop's
  frame-time clamp and tick cap already prevent a catastrophic catch-up spike, but tab-switch
  behavior is implicit rather than an intentional design choice (auto-pause vs. catch-up-on-return).
  Worth a deliberate decision, not a default.
- **Save-schema version separate from `GAME_VERSION`** — saves currently stamp `gameVersion` but
  have no independent `schemaVersion`. These answer different questions (which release produced
  this vs. which serialized structure is this) and will matter once a save-format change actually
  needs migration logic, which hasn't happened yet.

- **Substrate-dependent spine/rupture on rough terrain (dirt/path vs. stone/wood)** — no tile-type
  lookup exists anywhere in the codebase currently (grepped for `getTileAt`/`tileType`/a grid array,
  found nothing). Would need new coordinate→tile-type plumbing built from scratch, not just a
  numbers tweak to existing decal code — scope this properly before attempting.

- **Void patterns now built for Mage only (1.0.190)** — the `enemyHash` variable was identified and
  hoisted to module scope to make this safe. Extending the same check to Archer/Blade/Blunt/Pierce's
  own streak/satellite loops is a small, well-scoped follow-up now that the core plumbing exists.

- **Swordsman not attacking past a barricade** — reported multiple times with screenshots, but
  every screenshot provided so far either showed no enemies in range, or enemies not actually
  visible/confirmable as blocked-and-in-range. Traced the full targeting pipeline
  (`findTarget()`, `checkConeHits()`, `queryNearby()`) and found no code that excludes
  barricade-blocked enemies from being valid melee targets — structurally this should already
  work. Needs a screenshot with real enemy monsters (not just a Barricade icon) clearly stacked
  inside the range circle, ideally paired with the console/state at that moment, to actually
  diagnose rather than re-guess at code that reads correctly on every pass so far.

- **Enemy queue/pathing clumping** — substantially reworked across a long series of fixes this
  session: single-attacker-per-barricade (was letting 2+ enemies occupy the same contact spot),
  queue-slot assignment now atomically syncs position/traveled/pathIndex, a swept collision pass
  catches fast movers tunneling through each other within one frame, a follow-speed-cap correctly
  cascades a stun/slow back through an entire queued line (was only propagating one hop), and wave
  spawning now pauses reactively while a barricade queue is backed up (with a 15s force-resume
  safety valve so a jam can never fully soft-lock progress). Should be re-evaluated against fresh
  gameplay screenshots before assuming this is fully closed — pathing bugs in this codebase have
  repeatedly turned out to have more than one contributing cause, so one more clean playtest pass
  specifically looking for remaining clumps (not just barricade queues) is worth doing before
  closing this out for good.

- **Spearman rework**: longer spear, and a new spin-attack that rotates 360° hitting everything
  in its AoE (replacing or supplementing the current cone poke), with a longer cooldown to
  balance the AoE upgrade. A real combat-mechanic and animation change, not a quick tweak.

- **Three visual bugs reported together — re-checked, one resolved, one re-diagnosed, two still
  open**:
  - ~~Blowdart's pose only shows one arm~~ — checked the actual code: this describes an
    *already-removed* old behavior. The current comment on that rendering branch explicitly
    documents that a second "steadying" off-hand existed before, visibly floated apart from the
    body, and was deliberately removed rather than patched — single-arm is the fix that shipped,
    not a bug. Nothing to do here; noting it as resolved so it doesn't get "fixed" backward.
  - Spearman's spear-tip "doesn't line up with the actual visual point" — checked the actual
    coordinates: the shaft line's endpoint and the spearhead triangle's apex both explicitly use
    the identical `tipX, tipY` values, so they're mathematically aligned by construction — there's
    no coordinate bug in the code as written. If this is still visibly off, it's something subtler
    than a coordinate error (scale, timing relative to `swingProgress`, or how it reads at actual
    render size) — needs a real screenshot to diagnose further rather than another code re-read
    turning up the same correct math.
  - Z-order layering issue (a tower's overhead "stats to spend" scroll can render behind an
    adjacent tower above it) — still open, not attempted. The scroll is drawn as part of the same
    single `draw()` call as the tower's body, sorted by the tower's own y-position — but the scroll
    glyph extends well above the tower's head, so a single anchor point doesn't capture where the
    *scroll* actually sits on screen relative to a neighboring tower. A real fix needs the scroll
    sorted by its own screen position, separately from the tower body's — a genuine restructuring
    of the depth-sort pass, not a one-off coordinate tweak, and risky to attempt without a way to
    see the result.
  - Dual Squirt Gun's hand anchor "sits on the muzzle instead of the grip" — still open, not
    attempted. The code uses `textAlign:'left'` so the 🔫 glyph is anchored at one end and extends
    toward the aim direction from there — but which end of the emoji's own internal artwork reads
    as "grip" vs. "muzzle" depends on the platform/font rendering the glyph, which this environment
    has no way to see. Flipping to `textAlign:'right'` is the one-line fix *if* the anchor is
    genuinely on the wrong end, but doing that blind risks making it worse just as easily as better.

- **Attack speed on EXP level-up** — reported that towers seem to gain attack speed just from
  leveling up via EXP, when it should only increase from evolving into a new class or investing
  DEX points directly. Traced `recomputeStats()`: cooldown scaling (`dexMult`) is driven by
  `this.dex` (actual invested DEX points), not `expLevel`, so this shouldn't be happening
  structurally — but gold-tier upgrades already grant small *random* stat growth (0-2 in each
  stat) independent of EXP leveling, which could be the actual source if DEX happens to roll.
  Worth verifying against actual play rather than guessing further.

- **Druid class** — a full DEX-Mage evolution with three switchable combat forms, each a distinct
  AoE-vs-damage tradeoff: Wolf Paws (default; rapid double-swing melee, short range), Bear Paws
  (single huge alternating-claw swing, short-range AoE, massive per-target damage, very slow),
  Squid Tentacles (largest AoE, randomly hits up to 4 targets within it, lowest per-target
  damage). Switching forms costs a pick-one popup with a unique emoji per form, limited to once
  per round. This needs: three full weapon/animation sets in `drawStickman()`, a mode-switch UI
  (popup + cooldown/round-gate tracking on the Tower instance), a new AoE-targeting path distinct
  from the existing single-target/splash-radius model (Bear's "hit everything in a melee cone,"
  Squid's "randomly pick 4 within a wide radius"), and real balance passes across all three modes
  against the rest of the roster. A genuinely large new class, not a quick tower-config addition
  like Gunalinder/Sniper were — those reused all-existing single-target projectile mechanics, this
  needs new combat-resolution logic entirely.

- A large batch of feature requests came in at once (STR-based taunt — now shipped, see
  CHANGELOG), plus several genuinely big ones deferred rather than rushed:
  - **STR-Mage evolution chain**: Mage (STR-heavy) → Rogue Sorcerer → Crazy Wizard → Necromancer,
    ending in an AoE burst that deals damage as a percentage of the caster's own max HP (a
    sacrifice mechanic, 1-10% picked per cast, 120s cooldown shared across all classes with this
    ability, locked out below 10% HP so it can't self-kill).
  - **Swordsman diminishing returns on multi-hit cleave**: currently flat cone damage to everyone
    hit; requested a falloff curve — full damage for the first hit, ~20% reduction per target from
    hits 2-5, exponentially worse beyond 5 targets in one swing.
  - **Warrior tree restructure**: Axeman renamed to "Knight Errant" pre-evolution (dual swordsman
    flavor), a Berserker tier above that; Hammerman reached via pure STR, but gaining DEX *as* a
    Hammerman branches into a distinct dual-wielding path instead — a genuinely branching net
    rather than the current single-path-per-stat evolution model, which is a bigger structural
    change than a stat/number tweak.
  - Forensic-realism gore: directional spatter by weapon archetype and per-enemy blood biology
    shipped in v1.0.76, then substantially deepened this session — real bloodstain-pattern-analysis
    references were pulled directly from an uploaded BPA textbook and cross-checked against the
    code: cast-off now travels as a curved arc tangent to a swing rather than a straight line,
    droplet elongation/size scales with travel distance, pool shape/size is now genuinely distinct
    per weapon archetype (melee/archer/mage/explosive), aging/skeletonization, footprint tracking,
    and a local saturation cap so a heavily-fought corridor doesn't grow unboundedly. Pooling-to-
    static-layer performance optimization (drawing settled decals onto a persistent background
    canvas instead of keeping them all in the live decal array) is still open if decal count ever
    becomes a real perf concern at the 2000-decal cap.
  - Dota-style item economy: empty starting inventories shipped this session (item system reworked
    to one universal item + inter-tower drag-and-drop transfer, see below) — still open: on-death
    item drops, and a static Merchant NPC gated behind wave 5.
  - Dwarf Builder NPC (Hammerman-proportioned, bright orange, wobble-walk animation) plus much more
    pronounced scenery scale variance after wave 3, with isometric depth-sorted overlap rendering
    for oversized trees/boulders.
  - These are all real, well-specified ideas — just too large to land safely in one pass each.
    Happy to scope and build any one of them as its own focused task whenever wanted.

- A batch of suggestions from a separate Gemini conversation assumed architecture that doesn't
  match this repo (separate class files, a pure "STR only helps warriors" gate, poison rendered
  non-green, only two targeting modes). Checked against actual code: poison/curse already
  renders green (`#7cb518` floating text, `rgba(124,181,24,...)` tint), targeting already has
  a `FIRST/CLOSEST/STRONGEST/WEAKEST` cycle (the last one shipped in v1.0.159), a full EXP/level
  system shipped in v1.0.49, Blowdart's pipe-tracking shipped in v1.0.51, true archetype-exclusive
  STR/DEX/INT damage gating shipped in v1.0.52, wave-pacing (one new enemy type per wave, waves
  1-15) also shipped in v1.0.52, and the new-enemy-introduced popup shipped in v1.0.59. Archer
  arrow spawn-point/embedding alignment shipped this session (v1.0.128 — arrows now anchor on the
  actual entry side relative to the shot's real flight path instead of a random position).
  Everything from that batch is now shipped.

- Full WC3/WoW-style floating nametag overlay above every active tower (name, level, HP bar) —
  explicitly scoped out of the compact-panel work as a separate, larger feature. The bottom panel
  covers the same functionality today; this would be a genuine visual addition on top of it.
- Second-tier evolution branches beyond Blowdart→Squirt Gun and Hammerman→Paladin — Spearman and
  Gatling don't have a second tier yet.
- Boss-specific unique attack pattern (currently Boss is a stat-scaled Grunt-alike with periodic
  minion spawning added) — a real signature move was never built.
- `spawnSplitChildren()` always spawns `SPLITMINI` as the child type regardless of the parent —
  Boulder reuses this rather than having its own distinct split target. Fine for now, but if more
  splitting enemies are added, this should become parameterized per-parent.
- Minimap panel (a small radar-style overview of the whole map) — was part of the original WC3
  dashboard concept but never built; the current bottom panel has no map overview at all.
- Undead armor values (Zombie 9, Wraith 4, Skeleton 6, Reaper 10) were a first-pass rebalance —
  worth revisiting once there's actual playtesting data on whether Cleric's 5x curse bonus is
  landing as a meaningful tactical choice or just a minor bonus.
- Expand the level cap from 3 to 10 per tower — currently `canUpgrade()` is bounded by
  `tiers.length`, and every one of the 13 tower configs has exactly 3 tiers. Getting to 10 means
  adding 7 more tiers (range/damage/cooldown progression) to every tower and rebalancing gold
  costs and wave scaling to match — a real content/balance project, not a quick config edit.

## Technical / architecture suggestions

Reviewed against a couple of general HTML5 API reference books at the user's request — most of
what those cover (Canvas API basics, requestAnimationFrame, offscreen-canvas caching) is already
in use correctly in this codebase. A few gaps and one piece of outdated advice worth flagging:

- **No Page Visibility API usage** — the fixed-timestep loop already has a sane defensive cap
  (`MAX_TICKS_PER_FRAME = 90`) so a backgrounded tab can't stall the game on one giant catch-up
  frame, but there's no explicit pause when the tab is hidden — time keeps advancing and the game
  just does a rapid multi-frame catch-up when the tab regains focus. Worth an intentional decision
  either way (auto-pause on `visibilitychange`, vs. keeping the current "catch up on return"
  behavior) rather than leaving it as an implicit side effect of the tick cap.
- **Offline support — outdated book advice worth correcting**: an HTML5-era reference recommends
  the `applicationCache`/manifest-file API for offline support. That API is deprecated and has been
  removed from modern browsers entirely — following it today would ship a feature that silently
  does nothing. The correct modern equivalent, if offline play or "Add to Home Screen"
  installability is ever wanted, is a Service Worker plus a Web App Manifest (`manifest.json`).
  Real value for a browser game like this (works on a flight, installable on mobile like a native
  app), but a genuinely separate, non-trivial addition — not a drop-in replacement for the old API.
- **Web Workers as an optional perf lever, not a first move** — could offload something like decal
  saturation scanning or collision-hash rebuilding off the main thread, especially relevant at the
  5x/10x speed multipliers. Feasible even within the single-file constraint (spawn a Worker from a
  Blob URL built from an inline script string, no separate `.js` file needed) — but message-passing
  overhead between the main thread and a worker isn't free, and none of the current systems have
  been profiled as an actual bottleneck. Worth reaching for only if real profiling on a slow device
  shows a specific hot path worth moving, not as a speculative rewrite.

## Cross-checked against externally-generated code reviews (2026-09-06)

The user shared four long transcripts of a *different* AI tool (not given direct file access to this
repo) analyzing "StickTD" and proposing changes, plus four general web-dev reference books (DOM
Scripting, HTML & CSS, Idiosyncrasies of the HTML Parser, HTML5 Games 2nd ed). Every concrete,
checkable claim was verified against the actual `index.html` before acting on it, rather than trusted
at face value — worth recording both what held up and what didn't, since this kind of external
review will likely happen again.

**Confirmed real and fixed (v1.0.152)**: `updateTargetFrame()` ran unconditionally at the top of
`render()` every frame and did two `getBoundingClientRect()` calls plus six unconditional DOM
writes regardless of whether anything had changed — a genuine, verified layout-thrashing
inefficiency. The specific line numbers cited by the external review (2162–2195) didn't match this
file at all, but the *structural* claim was correct once checked against where the function actually
lives and how it's actually called. Added a dirty-check (content-key comparison for text/HP-bar
writes, a `resize`-driven flag for the expensive geometry recompute) with no visible behavior
change.

**Not acted on — speculative or already contradicted by the real code**: a large "combat log event
bus" / `dispatchCombatFeedback()` rearchitecture modeled on WoW addon internals; splitting every
status effect into a unified `activeAuras` array (a real idea worth having on file, but a big
structural change, not verified as urgent — the current per-status fields work and this session
already tracked down and fixed several real slow/stun-propagation bugs within that structure);
claims about specific `Math.random()` call counts, file sizes, or exact function line ranges — none
of these were independently verified and several were checked and found wrong; a seeded/
separated gameplay-vs-visual RNG split (a real, valid idea for reproducibility, but no current bug
depends on it); a full elemental-orb item system, WoW raid target markers, and a large emoji-icon
status/item overhaul — these are new *feature* proposals, not code-quality findings, and belong
in the Ideas section above if ever pursued deliberately rather than folded in under an "optimization"
framing.

**Declined outright as actively wrong for this project**: removing `user-scalable=no`/pinch-zoom
restrictions or the global `user-select:none` "for accessibility" — these are deliberate touch-UX
choices for a canvas game, not oversights, and undoing them would visibly hurt the mobile
experience for a mobile-first project. Also declined: reorganizing into a deep module folder
structure or introducing a build step — the single-file, zero-dependency constraint is intentional
and explicit in `AGENTS.md`, not something an external review gets to override.

The `queryNearby()` per-call array allocation and the multiple `buildEnemyHash()` rebuilds per
frame were raised again here — both were already identified and evaluated in this same file back
in the "Technical / architecture suggestions" section above, with the same conclusion: real leads,
not verified as safe to change without more confidence than a text review alone can provide.

## Cross-checked against a ChatGPT conversation about code-quality/modularity (2026-09-08)

The user shared a long ChatGPT transcript (no direct repo access) proposing a large refactor
program plus a list of specific "findings." Per this file's own standing rule, every checkable
claim was verified against the actual current code before acting, not trusted at face value.

**Confirmed real and fixed**: the missing `<script>` opening tag before the main program (see
CHANGELOG 1.0.208 — verified directly against raw file bytes on the live `main` branch, not just
the uploaded snapshot); the delayed-sound voice-reservation lifetime bug in `reserveVoiceSlot()`
(1.0.209); `SoundEngine.unlock()`'s inability to resume an existing suspended `AudioContext`
(1.0.210); the duplicated grid→world position math in `Tower.create()` and `attemptMoveTower()`,
extracted into one `setGridPosition()` method (1.0.211); a boot-time `validateGameDefinitions()`
check across every data-driven config table (1.0.212); two genuine gaps in `CHANGELOG.md`'s version sequence — `1.0.203` and `1.0.170` are
both missing between their neighbors (not just the `1.0.203` one the transcript mentioned) — left
as an open gap rather than fabricated, since there's no way to reconstruct what those entries
actually said; two stale `BACKLOG.md` entries removed above (localStorage prefs shipped in
1.0.204/1.0.207, tower UI already shows a min-max damage range) since both claimed a feature
`index.html` had already shipped.

**Checked and found already resolved or non-issues**: the 9-flavor procedural wave system (Swarm/
Elite/Undead/Ambush/BossRush/Vanguard/Trick/Grind/Standard) and its name/label table are already
consistent with each other and with the Code Map — no `% 7` vs `% 9` mismatch found anywhere in
the current file, despite the transcript's specific claim.

**Not acted on — large speculative architecture, not verified against a real current problem**:
explicit finite-state-machine-style game-state transitions, a formal four-clock-domain policy,
1x/3x/10x simulation-equivalence
tests, a repo-wide single-file HTML integrity verifier script, audio priority tiers/mix buses, and
listener-distance audio modeling. Each is a reasonable idea in isolation (the definitions validator
especially is worth a dedicated follow-up pass), but implementing all of them in one
sitting is exactly the kind of large, ambient, everything-at-once change this file's own "smallest
safe fix" discipline argues against. Recorded here so the ideas aren't lost, not silently dropped.

**Declined outright**: the transcript's own suggestion to add a continuous procedural adaptive
music system — a real feature idea, not a code-quality finding, and a much bigger scope decision
than this pass.

## From HTML5 Games, 2nd Edition (Seidelin) — read directly, checked against real code

- **Blend modes for magic/glow effects** (Ch. 6, canvas graphics) — `ctx.globalCompositeOperation`
  (e.g. `'screen'` or `'lighter'`) is completely unused anywhere in this file. Every glow effect
  currently relies on plain alpha blending (translucent fills/strokes layered on top of each
  other). A blend mode would read as genuinely luminous — colors actually brightening where
  layers overlap — instead of just semi-transparent, which is the more accurate look for the
  Warrior/BLUNT's crushing-impact shockring, Cleric's holy beam, and similar glow effects. This is a visual style choice,
  not a bug, so it's recorded here rather than applied — worth a dedicated pass if the goal is
  specifically "make the magic effects look more luminous," tested against a couple of the
  existing glow effects before rolling it out further.
- A large batch of other suggestions from this same source (Web Workers for collision hashing,
  localStorage for settings, a unified aura/status system, decoupling `applyDamage()` into a
  combat-log-style event dispatcher) all repeat ideas already evaluated elsewhere in this file
  (see the "Technical / architecture suggestions" and "Cross-checked against externally-generated
  code reviews" sections above) — not re-litigated here since the conclusions haven't changed:
  real ideas, each with a specific reason they weren't applied blind (unverified as safe, a
  stylistic preference framed as a bug, or a large rearchitecting with no specific broken behavior
  driving it).

