# Backlog

Ideas, requests, and suggestions that have come up but aren't built yet. See `AGENTS.md` for the
workflow this file follows — move items to `CHANGELOG.md` and delete them from here once shipped.

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

## Ideas

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

- **Three visual bugs reported together, not yet fixed**:
  - Blowdart's pose only shows one arm holding the pipe to the mouth — should be two arms, one
    bent supporting/steadying it.
  - Z-order layering issue: a tower with an active "stats to spend" scroll indicator overhead can
    render *behind* an adjacent tower above it on the grid, when it should render in front. Likely
    needs a proper Y-sort across the whole tower draw pass rather than a one-off fix.
  - Spearman's spear-tip graphic doesn't line up with the actual visual point of the weapon.
  - Dual Squirt Gun's hand anchor sits on the muzzle instead of the grip.

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

