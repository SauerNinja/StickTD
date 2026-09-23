# Agent Instructions — Stick Tower Defense

For any AI agent (Claude Code or otherwise) making changes to this repository. Detailed subsystem
rationale, historical lessons, and best-practice notes live in `AGENTS_REFERENCE.md` — this file
covers what to do and how; that one covers why, in depth, per subsystem. Read this file every
session; open the reference doc only when a specific subsystem note is actually relevant.

## 1. Scope and non-negotiable constraints

- **Single self-contained `index.html`.** No separate runtime JS/CSS files, no build step, no new
  runtime dependencies. Keep it that way regardless of how large the file gets.
- **MIT license.**
- **Canonical reference:** live game at https://sauerninja.github.io/StickTD/, repo (source of
  truth) at https://github.com/SauerNinja/StickTD. Check the live URL or pull current repo state
  before assuming a local copy is current — this repo can be updated outside any given session.
- **Version lives in exactly one place**: `GAME_VERSION` in `index.html`, referenced everywhere
  else (start screen, Settings > About, save files). Never hardcode it a second time.
- Existing owner-directed gameplay, balance, UX, audio, and integration decisions are constraints,
  not suggestions — don't revert or "improve" them without being asked. When one is non-obvious,
  the reasoning is in `AGENTS_REFERENCE.md` or `CHANGELOG.md`, not restated here.

## 2. Evidence and intended behavior

- **Code and executed tests establish implementation behavior.** Explicit user decisions and
  relevant history establish intended behavior. Neither historical prose (a comment, an old
  changelog entry) nor "it currently behaves this way" automatically proves something is correct
  — all three (code, tests, and stated intent) can be stale or wrong, and any one can turn out to
  contradict the other two. When they disagree, say so and check directly rather than picking one
  as automatically authoritative.
- **Treat every external AI-generated suggestion as unverified until checked against the actual
  current file** — a document, another model's transcript, a book excerpt, or a prior Claude
  session's own output in this same file. Specificity (exact line numbers, quoted code, function
  names) reads as credibility even when fabricated or simply stale; it is not evidence on its own.
  Before acting on any such claim: grep/read the real file for the specific thing claimed, confirm
  it matches, and only then treat it as true. This applies equally regardless of source — an
  earlier Claude session's unverified claim gets the same scrutiny as a claim from any other tool.
- **No mandatory textbook reading for ordinary fixes.** Apply concise, actionable principles
  directly: one function does one thing at one level of abstraction; extract a named function for
  any boolean condition complex enough to need a comment; remove genuinely dead code rather than
  flagging it; don't return/pass `null` as a stand-in for failure a caller has to guess how to
  handle. Cite a specific source only when it changes what you'd otherwise do, not as routine
  narration.

## 3. Task execution and navigation

- **Search directly when the target is known** — a function name, config key, or distinctive
  string. Use the README's Code Map or this file's reference doc only when useful for orientation,
  not as a mandatory first step. Code Map line numbers drift; treat a link as a starting point to
  search from, not a guaranteed address.
- **Inspect targeted dependencies, not just the changed function**: relevant callers, what reads
  and writes the same state, the full lifecycle a change touches (`create()` → `upgrade()` → save
  → load, for anything tower-related — `evolveInto()` is no longer part of this: towers never
  change type anymore, see "Architecture overview" below), and any existing test for that area. Reading only the
  function being edited misses exactly the class of bug this file's regression list exists to
  prevent.
- **For an authorized implementation task, continue through**: inspection → a small, cohesive
  patch → relevant tests → handoff. Don't stop at a plan without a real blocker.
- **Ask only when ambiguity materially affects behavior, compatibility, scope, or authority** —
  not for routine implementation choices. Never silently choose a new save-format or gameplay
  policy on the asker's behalf.
- **Prefer the smallest cohesive fix**, not necessarily the fewest changed lines — a fix that
  touches more lines but leaves no inconsistent half-state is smaller in the sense that matters.
- **Reuse existing test tooling.** Add a reusable test for an important regression rather than
  rebuilding a throwaway harness each time the same class of bug is checked.

## 4. Critical regression invariants

Each of these caused a real, shipped bug. Check for the specific failure mode, not just "does this
look reasonable":

- Queue/cleanup logic that depends on an entity still being present must not silently stop running
  once that entity is gone — a real permanent soft-lock shipped this way (spawning deadlocked
  because the one function that reset its own gating flag was skipped when no enemies were alive).
- When resetting a clock/timer, reset every dependent deadline with it, and rebase or clear
  transient state tied to the old clock — don't leave a stale deadline computed against a clock
  that just moved.
- Loading an invalid or corrupt save must not damage the current in-progress session.
- Any value not literally present in the save payload must be *derived* at load time from what is
  saved, before dependent recomputation runs — not left at a default that silently drops a
  permanent bonus (e.g. a Legendary-only stat bonus).
- Object-pool reuse and any delayed callback (`setTimeout`, scheduled audio) must not leak state
  into a replacement entity or a new session after the original is gone/reset.
- Purely visual/cosmetic effects (hit-flinch, wiggle) must never mutate an entity's real simulation
  coordinates — only its rendered position.
- Every `ctx.save()` needs a matching `ctx.restore()` on every code path, including early returns
  — canvas state otherwise leaks into later draws this frame and into the next frame.
- A spatial cache (hash, bucket grid) needs an explicit contract for when it's valid relative to
  entity position updates — stale-but-plausible results are worse than an obvious miss.
- `node --check` proves syntax validity only, never runtime correctness — it will not catch a
  variable used before its own declaration, a wrong-scope state reset, or similar logic bugs.
- Allocating objects/arrays each frame is not proof of a memory leak (most such allocations are
  garbage-collected normally); conversely, high synchronous render/update time in a profiler is
  not the same thing as low displayed FPS. Don't conflate either pair when diagnosing performance.

### Wave and performance invariants (1.3.0+)
- Physical wave order Tiny → Small → Standard → Large → Boss is a design invariant; phases may be
  omitted, never reordered or reopened. Size is materialized in `buildWavePlan()`, never at spawn.
- Batches are outcome-gated (`waveRouteObligationsOutstanding()`), never timer-released.
- All gameplay wave randomness comes from `createSeededRandom(waveSeedFor(waveRunSeed, n))`.
- Escaped enemies stay active and targetable but stop being route obligations; their deaths pay
  only the cleanup pool.
- Presentation (death anims, decals, particles, text) never blocks simulation or wave completion
  and runs on `presentationTime`, not `realTime`.
- Larger `SIZE_TIER_BANDS` entries must stay strictly slower, bigger, and higher-XP (boot-validated).
- No unconditional full-world work in a per-frame or timer path: world caches are blitted through
  `blitWorldLayer()` (viewport slice) and rebuilt only when dirty.
- New features state their per-frame cost: actor count, draw calls, allocations, cleanup.
- A cache-rebuild function that also *promotes* items into the cache cannot be made
  dirty-only without a separate promotion path (1.3.1 regression). Baking = incremental stamp on
  entry + coalesced full rebuild on exit (`sweepSettledDecals()`).
- Decal ageing, expiry, sweep scheduling and baking all run on `presentationTime` (which keeps
  running between waves), never `realTime` (which freezes while idle).
- Ground debris (bones/skulls/rocks) is never baked into the blood layer — later blood stamps would
  cover it. It is drawn live, above blood and below actors.
- The FPS readout must be derived from the wall-clock gap between rAF callbacks, never from how
  long the callback took.
- Any new decal/debris kind must declare whether it bakes (`isDecalBakeEligible()`); static
  geometry must bake. Verify with the perf overlay: live-drawn decals should stay near ~100
  regardless of total decal count.

## 5. Risk-based verification

- **Match verification effort to actual risk.** A documentation-only change doesn't need a
  game-wide runtime audit. A change touching entity lifecycle, collision, spatial caching, or the
  save contract needs a real, executed test — a small standalone Node script exercising the actual
  logic — not just a read-through. Several real bugs in this project were only caught this way.
- **Before shipping any change to `index.html`**, extract the script block and run `node --check`
  on it at minimum. For anything in the previous bullet's risk category, also write and run a
  targeted test for the specific behavior being changed.
- **When consuming an external review or suggestion** (see §2), verify its specific, falsifiable
  claims against the real file before treating any of its conclusions as fact.
- **When genuinely unsure which of several plausible interpretations is correct**, and the file is
  too large to resolve it by reading more, ask rather than guess — a wrong guess that looks
  plausible is worse than a clarifying question.

## 6. Versioning and documentation

- `GAME_VERSION` increments exactly one patch level (`x.y.Z` → `x.y.Z+1`) per meaningful shipped
  change (fix, feature, balance change). Never jump more than one patch level at once; never bump
  minor/major without explicit instruction. Purely cosmetic no-op edits don't need a bump.
- Every meaningful change gets a `CHANGELOG.md` entry the same turn — newest first, under its own
  `## [x.y.z] - YYYY-MM-DD` heading, as a bullet list explaining what changed **and why**. Don't
  batch multiple versions' worth of changes under one heading.
- **Checking the changelog**: for a normal edit, check the current diff for a lost or duplicated
  heading and confirm the new version/date is correct — this catches the real failure mode (a
  `str_replace` whose `old_str` is just a bare heading line can consume and orphan the content that
  used to sit under it). Full-history archaeology across every past version is not routine; do it
  only to resolve an actual, specific contradiction. A historical gap in old version numbers is a
  separate finding to note, never an invented entry to fill.
- `BACKLOG.md` holds ideas, requests, and unfinished explicit asks that come up but aren't acted on
  yet — add a line under `## Ideas` (or the relevant existing section) as they arise, without
  turning a speculative suggestion into a commitment. Move an entry to `CHANGELOG.md` and delete it
  from `BACKLOG.md` once actually shipped — never leave stale duplicates in both.
- Update the documentation actually affected by a change (README, the reference doc, BACKLOG) —
  not every unrelated document out of caution.

## 7. Concise final handoff

End of a work session, report: what actually changed, what tests were actually executed (and their
result), any known limitation, and remaining work. Do not dump an unchanged full file, and don't
repeat analysis already given earlier in the same session.

## 8. Reference index

- **`README.md`'s Code Map** — line-number index into `index.html` by system. Line numbers drift as
  the file grows; treat a link as a starting point to search from, not a guaranteed address. Update
  an entry in the same change that adds a genuinely new named system.
- **`CHANGELOG.md`** — full dated version history, newest first.
- Detailed subsystem rationale (combat/stat formulas, audio architecture, gore/decal system, UI
  layout techniques, head/consent/SEO integration, Canvas/HTML5 best practices, historical
  lessons) lives below in Part 2 of this file — read the section relevant to the task, not the
  whole thing every session.

---

**Growth rule**: only add a new standing instruction when it changes future behavior and isn't
already covered — prefer refining an existing rule over appending a new section. Current constants
live in code, shipped history in `CHANGELOG.md`, pending work in `BACKLOG.md`.

---

# Part 2 — Subsystem Reference

Detailed technical rationale behind non-obvious decisions, organized by subsystem, plus historical
lessons labeled as historical (not current guarantees). Open the section relevant to the task at
hand — this part is not meant to be read in full every session.


## Architecture overview

- `CONFIG.TOWERS`, `CONFIG.ENEMIES`, `CONFIG.WAVES` are the three top-level data tables inside one
  `CONFIG` object — most of the practical benefit of split config files without breaking the
  single-file rule.
- **A tower never transforms into a new class — this is the permanent design, not a WIP state.**
  `Tower.evolveInto()` still exists in the source but is fully unused/dead code (kept defined
  rather than deleted); nothing calls it. Reaching a threshold instead permanently unlocks the
  *next* tier as a separately buildable tower via `unlockTowerTypeBuild()` — the tower that earned
  the unlock keeps its own type and keeps growing its own stats. This applies uniformly at every
  tier, base-class specialization or deep-tier alike.
- The 3 base classes (Swordsman/Archer/Mage) unlock through a two-stage **elemental attunement**
  system: `ATTUNEMENTS` (STR→Fire/DEX→Electric/INT→Ice) permanently locks an element on whichever
  stat first reaches `ATTUNEMENT_THRESHOLD` (100) — checked in
  `Tower.checkAttunementAndSpecialization()`, called from `checkEvolution()` only for
  `BASE_ATTUNABLE_TYPES`. Reaching `SPECIALIZATION_THRESHOLD` (500) in that *same* attuned stat then
  calls `unlockTowerTypeBuild(SPECIALIZATIONS[type][element])`, if one is defined — not every
  base/element combination is (Mage has no Fire specialization; see the comments directly above
  `SPECIALIZATIONS` in `index.html` and `BACKLOG.md` for exactly which cells are intentional gaps
  vs. imperfect fits kept for scope reasons). `EVOLUTIONS` covers every deeper unlock beyond a base
  class's own specialization (Blowdart → Squirt Gun, Hammerman → Paladin, Marksman → Sniper,
  Gatling → Bomber → Gunalinder) using the same flat stat-threshold pattern, unrelated to
  attunement — `checkEvolution()`'s non-base-class branch calls `unlockTowerTypeBuild()` the exact
  same way, never `evolveInto()`. Every class in `EVOLVED_TOWER_TYPES` traces to a real, reachable
  unlock now — verified directly, no orphaned classes (Bomber/Gunalinder were the last gap, closed
  by adding `EVOLUTIONS.GATLING`).
- `unlockedTowerTypes` (a `Set`, persists across save/load, resets on a genuinely new game — same
  precedent as the existing wave-gated starter unlocks via `isTowerUnlocked()`) tracks which
  evolution targets have actually been unlocked this game; `UNLOCKABLE_TOWER_TYPES` and
  `TOWER_UNLOCK_SOURCE_BY_TARGET` are both derived programmatically from `SPECIALIZATIONS` +
  `EVOLUTIONS`, not a separately maintained list. **The exact unlock source/threshold for each
  class is deliberately never shown to players** — the Build menu's locked rows and the in-game
  help modal both use `TOWER_UNLOCK_RIDDLE`, a set of thematic hints, instead of the precise
  mechanical requirement `TOWER_UNLOCK_SOURCE_BY_TARGET` actually holds. This is intentional design
  (discovering the stat/element mapping is meant to be part of the game), not incomplete
  documentation — don't "fix" the in-game UI to be more precise to match this file or `README.md`,
  which document the exact mechanics on purpose since they're developer-facing, not player-facing.
  See `README.md`'s own callout on this at the top of its "Towers & evolutions" section.
- `EVOLVED_TOWER_TYPES` lists everything reachable only via unlock, never built directly from the
  start (includes Hammerman itself). A base-type tower loaded from a save that predates the
  `attunement` field runs `migrateLegacyAttunement()` — deterministic, and in practice a no-op for
  any real save, since `checkEvolution()` has always run synchronously after every stat change, so
  no still-base-type tower should ever actually have a stat at or above 100 in saved data.
- Enemy status effects (burn, poison/curse, slow, stun) live as fields directly on the `Enemy`
  instance (`burnUntil`, `poisonUntil`, `slowTimer`, `stunnedUntil`), checked each tick in
  `update()`. Towers have a parallel set for breakaway-inflicted statuses.
- `drawStickman()` is the single shared rendering function for every tower class — each class
  branches inside it rather than having separate draw functions. Per-tower appearance traits
  (skin/pants/face color, build scale, mustache color) are rolled once in `rollSkinTones()`/
  `rollBuild()` — at `create()`, and re-rolled at `upgrade()` (deliberate, a visual "you got
  stronger" signal; `evolveInto()` used to also re-roll here but is unused now — see "Architecture
  overview"), passed into `drawStickman()` via an `extra`
  object built fresh each render — the render function never reads tower state directly. Mustache:
  invisible at STR ≤ 47, grows with STR, capped at 97; color from `HAIR_COLORS`.
- The bottom inspect panel (`#inspect-panel`) is a WC3/WoW-style nameplate + full-options UI.
  Tapping the nameplate toggles `inspPanelExpanded` between a compact view (portrait, HP bar,
  combat stats) and the full options row (upgrade/move/sell/target/stats/inventory).
- `#inspTargetFrame` is a "target of target" frame next to the inspect panel when the selected
  tower has an active target — repositioned every rendered frame against the panel's actual
  width, since the panel isn't fixed size, via `getBoundingClientRect()`.

## Combat & stats

- Leveling is a genuine EXP system (`gainTowerExp()`), separate from the gold-tier `level` field
  used for Upgrade-button tiers. Every tower has `xp`/`expLevel` (1-99) from kills, killstreak
  milestones, gold-tier upgrades, and round survival. Each level-up grants exactly 1 stat point
  (`allocateStat()`). `CLASS_ARCHETYPE` gates which stat boosts damage per class (STR→Warrior,
  DEX→Archer, INT→Mage — exclusive, not additive across archetypes). Barricades are excluded from
  EXP entirely. Separately, `Tower.upgrade()` (gold-tier tier-up) also grants automatic random
  stat growth on top of the guaranteed tier bump: 3 rolls of 1-6 into a random stat, plus 1-3
  guaranteed into the tower's own favored stat — additive to, not a replacement for, the EXP
  system's manual point.
- `recomputeStats()` computes `missChance` via `computeMissChance()` — a front-loaded, two-segment
  curve, not a flat diminishing-returns formula. `BASE_MISS_CHANCE_BY_ARCHETYPE` sets the zero-DEX
  baseline (Mage 45% / Archer 40% / Warrior 30% — an explicit balance hierarchy), then the curve
  drops steeply to 4% by `ACCURACY_MIDPOINT_DEX` (100 effective DEX) and only trims that remaining
  4% down to a genuine 0% by `ACCURACY_CAP_DEX` (500) — most of the benefit front-loaded into the
  first 100 points, RuneScape-XP-curve-shaped. Identical curve for every archetype, no exceptions.
  Damage stays strictly archetype-exclusive; `missChance` is the one universal DEX effect. Warrior
  damage uses `warriorStrDamageMult()`, a separate curve from the shared `diminishingStatValue()`
  (higher base rate, slower-decaying late-game floor) so heavy STR keeps compounding instead of
  flattening. Critical hits (`critChance`/`critMult`) are a real damage effect (base 2.5%/1.20x,
  DEX/INT scaled, capped 50%/3x), rolled in `applyDamage()` before armor mitigation. `DPS` in the
  inspect panel folds in the crit's expected-value contribution. DEX attack-speed rate is
  3%/point. Ranged lead-prediction is capped by `MAX_LEAD_PREDICT_TIME` (0.2s).
- **HP stat** (`hpStat`, converts to flat bonus HP at 10:1) is archetype-differentiated:
  `HP_STAT_BASE`/`HP_STAT_RATE` give Warrior 3-heart/30HP base growing 0.32/STR point, Archer
  2-heart/20HP growing 0.25/point, Mage 1-heart/10HP growing 0.15/point (Barricade falls back to
  Mage's values). Additive on top of the separate percentage-based `strHpMult`, not a replacement.
- **Armor is item-only.** `shieldPct` (the actual damage-reduction multiplier in `takeDamage()`)
  is derived every `recomputeStats()` call from `baseShieldPct` (class-ability/Legendary source —
  Hammerman's 35%, set at `create()`, +5% from `checkLegendaryStatus()`) plus summed item `armor`
  fields at 1% per point, capped at 90%. `baseShieldPct` isn't in the save payload — derived at
  load time from type + `isLegendary`, same pattern as `legendaryHpMult`, before `recomputeStats()`
  runs. Simpler now than it used to be: since a tower never transforms, `create()` alone sets this
  correctly for every Hammerman regardless of when it's built (a historical bug here — `evolveInto()`
  not also setting this, so a Hammerman reached via the old transform-based evolution never got its
  35% — is now moot, since `evolveInto()` doesn't run at all anymore).
- `validateGameDefinitions()` runs once at boot, cross-checks every data-driven table (WAVES/
  TOWERS/ENEMIES, EVOLUTIONS, SPECIALIZATIONS, SPLIT_CHILD_TYPE, CLASS_ARCHETYPE, FOOTSTEP_WEIGHT,
  JOB_QUOTES, TOWER_STRATEGY, starter/evolved type lists) for dangling references — extend it when
  adding a new table with cross-references of its own.

## Audio architecture

First-tier reference: 5 uploaded game-audio books. The running plan (shipped vs. deferred, and
why) lives in `BACKLOG.md` under "Audio mastery — deferred passes," since it's a living plan.

- `playImpactSound()` is the single call site for every weapon-hit sound (in `applyDamage()`):
  throttles to one voice per weapon family per 35ms via `lastFamilyPlayAt` (bypassed for crits/
  hard hits); `towerAudioBias(towerId)` gives each tower a small (±3%) deterministic pitch offset
  from its own persistent `id`; drops the secondary noise layer for routine hits at `gameSpeed >=
  5`. `SoundEngine.debugCounters` (impactRequested/Played/Suppressed/peakVoices) is always-on
  telemetry — inspect via `audioEngine.debugCounters`.
- `tone()`'s optional `stablePitch` param opts out of the default random ±6% detune (cent-based,
  not linear — a linear swing is asymmetric in perceived pitch since pitch is logarithmic). Every
  UI confirmation sound uses it. `evolution`/`hero`/`legendary` share one A-root ascending motif
  family rather than being disconnected fanfares — `hero` is a 2-note sibling, `legendary` extends
  `evolution`'s 4-note pattern with a 5th note and a sustained double-stop. `isImportantAudioEvent
  (eventType, context)` recognizes boss/selected-tower/crit/evolution — a classification seam for
  a not-yet-built voice-priority pass. `SoundEngine.duck()` is its first consumer: dips
  `master.gain` on `lose`/`levelup`/`evolution`/`hero`/`legendary` — deliberately not `wave`, which
  has 9 call sites across different events and would over-trigger. Skips while muted; the mute
  toggle calls `cancelScheduledValues()` before its direct assignment, since a plain assignment
  doesn't cancel an in-flight duck's scheduled recovery ramp.
- `randomJobQuote()` uses `randomNoRepeat()` (a per-key history ring buffer) instead of raw
  `Math.random()`, which could repeat the same line twice in a row.
- Spawn/reaction chatter: `spawn_chatter` (2-part phrase, placement) and `chatter_short` (1 shorter
  burst, hit/level-up) share an archetype-distinct register system (`CLASS_ARCHETYPE` passed as
  `intensity`): Archer highest pitch, Warrior medium, Mage lowest AND slowest (`tempoMult`
  stretches syllable duration/gaps too, not just pitch). `chatter_short`'s `pitchBias` shifts
  within-register: negative for a hit (startled), positive for a level-up (excited). Hit reaction
  throttled to 2.5s per tower via `lastHitChatterAt`, excluded for Barricade (no `CLASS_ARCHETYPE`
  entry — it has no voice). `TOWER_STRATEGY` feeds the WC3-style aura box next to inventory slots.
- Ambient footsteps: `FOOTSTEP_WEIGHT` classifies each enemy type light/medium/heavy/null (Wraith
  silent); `footstepDist` is a fixed stride length, not a wall-clock timer; `lastFootstepAt`
  throttles actual playback to ~70ms engine-wide regardless of request volume.

## Gore, decals, and visual systems

- `getBloodProfile()`/`rollBloodProfile()` give per-species base palette + per-instance jitter.
  `isDust:true` (rock-bodied enemies) disables blood entirely in favor of dust + `spawnRockChips()`.
  `bloodPoolSizeScale()` scales decal size to the target's actual body radius, blended into
  `goreScale`. `drawDecals()`: an expiry pass, then two ordered draw passes via `drawOneDecal()` —
  blood first, bone/skull/rock/worm debris on top — guaranteeing layering regardless of push order.
  Bones/skulls roll independently on death (78%/45%, `!isDust` only), never fade (fixed alpha,
  permanent — `BONE_LIFESPAN` 45min). Worms are a later mechanic on skulls: each round, a worm
  spawns for any skull marked `wormPending` from the *previous* round (intentional one-round
  delay), then a fresh 10% roll for unrolled skulls. A worm never fades but isn't permanent —
  `WORM_LIFESPAN` = 2x `DECAL_LIFESPAN`, shrinks to nothing over its final 30% of life instead of
  fading. Ground items bob + show a pulsing ring at every graphics setting; while dragging one, a
  👇🏻 indicator marks the valid drop target using the same 26px hit-test radius the real drop
  logic uses.
- `const low = false` in the gore-intensity code is deliberate: blood intensity is controlled only
  by the `goreMode` content toggle, never by graphics quality — full gore shows at any graphics
  setting if gore is enabled. This is a real, known tension with performance (Low graphics
  currently carries full gore cost) — flagged in `BACKLOG.md`, not silently changed.
- Two toast popups share a pattern: `showWaveSummary()` (gold + per-class XP) and
  `showNewEnemyToast()` (stats + ability note, first time a wave contains an unseen type, tracked
  in `seenEnemyTypes` and persisted in saves). Both independent DOM elements with their own
  `setTimeout` fade, so they can't clobber each other if triggered close together.

## Performance

- `update()`'s idle fast path: the collision/hash pipeline (`resolveSweptEnemyCollisions()`,
  `resolveEnemyCollisions()`, `checkStallWatchdog()`, `buildEnemyHash()`) is gated behind an
  `anyActiveEnemies` check — each allocates fresh arrays/Maps every call regardless of enemy
  count. `updateBarricadesAndPileup()` is deliberately *not* gated — see the regression invariant
  in `AGENTS.md` §4 about queue cleanup depending on entity presence; gating it caused exactly
  that failure mode. `EMPTY_ENEMY_HASH` (one frozen `{}`) replaces a fresh allocation on idle
  frames — every reader (`queryNearby()`, targeting, gore checks) degrades safely to "no targets."
- `drawScenery()`/`drawDecals()` both compute visible world bounds once per call and skip
  offscreen items before touching Canvas state. The camera-pan pointermove handler skips
  build-hover/scenery-hover checks once `isDragging` is true, avoiding a second
  `getBoundingClientRect()` read per pointermove during an active drag.
- `perfStats` (always on, negligible cost): frame/update/render ms, ticks-per-frame with a running
  max, visible-vs-total scenery/decal counts — inspect via the console. Downloadable as a full
  debug log (Settings > About > Download Debug Log) alongside game/settings/audio-engine/entity
  pool state and browser/device info.
- Deferred (see `BACKLOG.md` for current status): static scenery/decal caching into offscreen
  canvas layers with explicit invalidation, spatial-hash allocation reduction in real combat (not
  just idle), and `MAX_TICKS_PER_FRAME` tuning — check `perfStats` numbers before attempting any
  of these rather than guessing from reading code.

## Versioning rule (hard constraint)

- Bump ONLY the patch number (the third component) for every change: 1.4.9 -> 1.4.10 -> 1.4.11.
- NEVER bump the minor or major component (1.4.x -> 1.5.0, 1.x -> 2.0.0) unless the user has
  explicitly asked for that bump in this conversation. Scope of work, "feels like a big release",
  or a round with several features is NOT a reason.
- If a minor/major bump was made without instruction, roll it back to the next patch number and
  correct the CHANGELOG headings in the same round.
- The version appears in three places that must stay in sync: `GAME_VERSION`, the CHANGELOG entry
  heading, and the save-file `gameVersion` field (written automatically from `GAME_VERSION`).

## Progression and balance invariants (1.4.x)

- Trained stats are capped at `STAT_EFFECT_CAP` (500) each and `STAT_TOTAL_CAP` (1,000) combined.
  Enforce in `allocateStat()`, promotion and save loading — never only in the UI.
- Assigned stats and unspent points draw on the same 1,000 budget. Never award points that cannot
  be spent; hold the XP instead.
- Milestones are identity only: naming at 500, trophy + XP-to-gold at 1,000. They must never grant
  damage, HP, shields or heals.
- Promotion buys stat rolls only. It must not call `applyTierStats()` or otherwise change damage,
  cooldown or range.
- Stat effects interpolate linearly to their value at the cap; no compounding curves, and no stat
  may drive two multiplicative combat terms at full strength (see `ARCHER_RATE_SHARE`).
- Any new unlock requirement must be reachable under the caps — check before shipping.
- Proton, Quasar and Dark Matter are ELEMENT STATES earned from stat pairs (`MIXED_ELEMENT_RULES`),
  never buildable tower types. A mix requires both of its stats at `MIXED_PAIR_THRESHOLD`; there is
  no balanced-triple route.
- Wave order, the 5:1 little-to-big ratio and seeded construction are invariants; validation runs
  at boot for waves 1–120.

## Lag-creep prevention protocol (mandatory for every change)

Lag in this project has repeatedly crept back through small, individually reasonable changes
(history: 1.1.55 decal-heavy lag, 1.2.43–1.2.52 pan lag and baking, 1.3.1 → 1.3.7 bake regression,
1.3.9 string-key GC churn). Follow all of these before shipping:

1. **Measure, don't guess.** Get a debug log captured *during* the lag (Settings > About >
   Download Debug Log). Compare raw rAF wall-gap vs Frame/Update/Render ms: a high wall gap with
   healthy ms means browser/compositor contention, not game code.
2. **State the cost of every new feature:** per-frame work, per-tick work (× up to 90 ticks/frame
   at 10×), allocation, cleanup, and how it scales with enemy/decal count.
3. **No allocation in hot paths.** No string building, array literals, closures, `.filter/.map`,
   or object literals inside per-tick or per-enemy loops. Spatial keys are integers
   (`spatialCellKey()`); pools are fixed-size and reused.
4. **No unconditional full-world work** in per-frame or timer paths. World caches are blitted as
   the visible slice (`blitWorldLayer()`) and rebuilt only when dirty, coalesced
   (`SETTLED_DECAL_REBUILD_MIN_MS`).
5. **Promotion and rebuild are separate paths.** A function that both promotes items into a cache
   and rebuilds it must never be made dirty-only (the 1.3.1 regression). Bake = incremental stamp
   on entry + coalesced full rebuild on exit.
6. **Every new decal/debris kind declares whether it bakes** (`isDecalBakeEligible()`). Static
   geometry must bake. Target: live-drawn decals ≈100 regardless of total count.
7. **More enemies = more sequential content, not more simultaneous actors.** Waves scale through
   batches; pools must never silently drop units; route gating keeps active counts bounded.
8. **Input handlers never render synchronously.** Use `requestPausedRender()`; camera motion is
   applied once per frame.
9. **Verify with a stress test before shipping:** headless run of 400 kills (≈1,200 decals) and a
   multi-wave 10× playthrough. Record render ms and live-decal count in the CHANGELOG entry.
10. **Structural HTML/CSS edits require a real-browser render check** (Playwright), not only a
    syntax check.

## Head block, consent, and SEO — don't casually reorder or trim

`<head>` contains Google Analytics (`gtag.js`, ID `G-B6H58BQ50N`, gated behind Consent Mode v2)
and SEO meta tags (title, description, keywords, robots, canonical, Open Graph including
site_name/locale, Twitter card, schema.org `VideoGame` JSON-LD) with deliberate keyword choices.
The GA ID is tied to a live property — don't regenerate without being asked. Favicon is an inline
base64 data URI; OG/Twitter images point to `og-image.png` at the site root (a real file — a data
URI there wouldn't be fetched by most social crawlers).

Analytics only collects once the cookie-consent banner (top of `<body>`, fully self-contained) is
accepted — Accept-only by request, no Decline; not accepting leaves the default-denied state.
`gtag('consent','default',...)` must be the first `dataLayer` push, ahead of even `gtag('js',...)`.
The banner text/button use `fitConsentBannerToOneLine()` (same scale-to-fit technique as the HUD)
so they never wrap.

## UI layout techniques

- `#inspCombatRow` (the stat row) never wraps: `fitStatRowToOneLine()` measures true `scrollWidth`
  against the panel's real available width and scales down via a left-anchored transform — no
  floor on the shrink scale (unreadable at extreme late-game values is accepted; wrapping isn't).
  `fitNameplateToStatRow()` explicitly sets the nameplate-mid width from the same available-width
  value rather than trusting flexbox to independently converge to the same edge.
- Same-name items in a row share available space and shrink together via `flex:1 1 0; min-width:0`
  with ellipsis overflow (e.g. Upgrade/Sell buttons around the between-buttons DPS number) rather
  than a fixed width that could overlap or overflow.

## Canvas/HTML5 best practices (from real bugs, not style preference)

- Always set `fillStyle`/`strokeStyle` explicitly, immediately before the draw call that depends
  on it — Canvas state persists across calls and frames; several "renders transparent" bugs traced
  back to a glyph draw silently inheriting a translucent color from whatever drew before it.
- Bracket every `ctx.save()` with `ctx.restore()` on every path, including early returns.
- A discrete instantaneous event (impact, death, decal appearing) renders at full final size on
  the exact frame it happens — no grow-in/fade-in, which decouples "when it visually finishes" from
  "when it happened" and reads as delayed/buggy.
- Render-only cosmetic offsets live in `draw()`, never touch the entity's real `x`/`y` — mutating
  authoritative position for a visual effect risks desyncing pathing/collision that same frame.
- HTML5 semantics: the UI is built from generic `<div>`s throughout (checked directly — zero
  `<header>`/`<nav>`/`<aside>`/`<meter>`/`<progress>`/`<details>`/`<summary>` tags exist). CSS/JS
  select only by class/id, never tag name, so swapping a container's tag is low-risk but purely
  mechanical (find/match the correct closing tag) — do it as its own careful pass, one container
  at a time, not bulk find/replace alongside unrelated work. Icon-only buttons need `aria-label`
  (buttons with visible text alongside their icon already have an adequate accessible name).

## Historical lessons (labeled as historical — not current guarantees, check before relying on them)

- A derived per-frame flag (e.g. "is this enemy currently blocked") must be set by exactly one
  piece of code — splitting assignment across multiple loops, even equivalent-looking ones, is how
  a barricade double-occupancy bug happened.
- A repeated boolean expression should be one named function (`isEnemyFrozen()`), even a one-liner
  — self-documenting, and one place to update instead of an unknown number of copies.
- A cascading effect (status propagating through a queue) must fold in what a neighbor *currently*
  has, not its unmodified base value — a stun/slow propagation bug only traveled one hop because it
  read the wrong one.
- Sanity-check a tuned probability/frequency/size at realistic aggregate scale (a full wave, many
  simultaneous hits), not just one isolated event — several regressions were reasonable alone, too
  much in aggregate.
- Bound unbounded accumulation with a check tied to actual local density, not just a global array
  cap — a cap alone doesn't stop visual clustering in one hot spot while capacity remains elsewhere.
- Any mechanic that can pause/block forward progress needs an explicit timeout/force-resume safety
  valve — see Part 1 §4's queue-cleanup invariant, which this generalizes.
