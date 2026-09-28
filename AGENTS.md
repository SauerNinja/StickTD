# Agent Instructions — Stick Tower Defense

For any AI agent (Claude Code or otherwise) making changes to this repository. Detailed subsystem
rationale, historical lessons, and best-practice notes live in `AGENTS_REFERENCE.md` — this file
covers what to do and how; that one covers why, in depth, per subsystem. Read this file every
session; open the reference doc only when a specific subsystem note is actually relevant.

## 0. Get oriented from GitHub, not from an uploaded file

`github.com/SauerNinja/StickTD`, `main` branch, is the authoritative source for this project —
ahead of any locally uploaded copy, and especially ahead of an old zip. Assume the live repo is
close to the current state and start there rather than trusting whatever file happens to be
attached to the conversation.

- **Pull the live files directly**, no authentication needed for a public repo:
  `https://raw.githubusercontent.com/SauerNinja/StickTD/main/index.html` (same path for
  `CHANGELOG.md`, `AGENTS.md`, `BACKLOG.md`, `README.md`). Compare `GAME_VERSION` in that file
  against any locally uploaded copy before doing anything else — a mismatch means the upload is
  stale, and the live version wins.
- **List recent commits** via `https://api.github.com/repos/SauerNinja/StickTD/commits` (add
  `?per_page=20` for more, `?since=`/`?until=` to bound a range) for a fast timeline of what
  changed and when, without downloading the whole file history.
- **Diff two points directly** via
  `https://api.github.com/repos/SauerNinja/StickTD/compare/{base}...{head}` (a commit SHA, a tag,
  or `main`) to see the exact patch between them — this is the fastest way to answer "what changed
  since the version I last knew about" without re-reading the whole file cold.
- **Cross-reference `CHANGELOG.md`'s own entries** for the *why* behind a diff — commit messages
  are terse; the changelog's per-version entries carry the reasoning, what was verified, and what
  wasn't.
- The GitHub API is unauthenticated here and rate-limited; if a request comes back rate-limited,
  fall back to the raw file fetches above rather than retrying the API repeatedly.

This is the efficient path to getting current on the project's actual state — cheaper than reading
the whole file fresh, and more reliable than assuming an uploaded copy is current.

## 1. Scope and non-negotiable constraints

- **Check progression intent before changing unlock behavior.** Read the README's player-facing progression overview and the progression invariants in this file, then trace the current unlock source through registration, Build-menu display, purchase, save, and load. The README explains the player experience; this file and the current implementation define the technical contract.
- **`index.html` holds the whole game; the one explicit exception is `CHANGELOG.md`.** No separate
  runtime JS/CSS files, no build step, no new runtime dependencies for anything gameplay-related —
  keep it that way regardless of how large the file gets. The single exception, changed by direct
  owner decision (this doc previously said "single self-contained index.html" with no exceptions;
  that changed because the owner explicitly decided the changelog-duplication problem mattered more
  than that purity): the in-game "what's new" dialog does a same-origin `fetch('CHANGELOG.md')`
  when it opens (see `loadChangelogEntries()`), never during gameplay. This requires the page to be
  served over HTTP(S) with `CHANGELOG.md` alongside `index.html`; under `file://` the fetch fails
  and the dialog shows a plain fallback message instead — expected behavior, not a bug, see
  `maybeShowUpdateNotice()`'s catch block. Do not add further runtime fetches beyond this one
  without the same kind of explicit confirmation this one required.
- **MIT license.**
- **Canonical reference:** live game at https://sauerninja.github.io/StickTD/, repo (source of
  truth) at https://github.com/SauerNinja/StickTD. Check the live URL or pull current repo state
  before assuming a local copy is current — this repo can be updated outside any given session.
- **Current snapshot priority**: when the owner supplies a complete current project snapshot, use its `index.html`, `CHANGELOG.md`, and companion files as the active baseline ahead of older ZIP archives or remembered workspace versions. Record and verify its `GAME_VERSION`; keep any differences from earlier work explicit.
- **Index comment references**: keep code comments brief and avoid embedding long rationale in `index.html`. Any pointer to a detailed changelog explanation must name the exact version heading and archive/entry ID, using the form `CHANGELOG.md § [x.y.z] Section, CA###`. Verify the cited version and ID exist before shipping; put the full explanation in the changelog.
- **README voice**: write `README.md` as enduring, positive, player-facing product copy, with a clear game-package tone. Describe what players experience and can do; keep copy general where exact detail does not help a player's decision. Avoid release chronology, before/after narration, phrases such as "now we no longer" or "used to," implementation history, and defensive lists of absent features. Correct or add copy only when a stable, verified player-facing fact needs it. Put past changes in `CHANGELOG.md` and contributor rules or technical detail in `AGENTS.md`.
- **Version lives in exactly one place**: `GAME_VERSION` in `index.html`, referenced everywhere
  else (start screen, Settings > About, save files). Never hardcode it a second time.
- Existing owner-directed gameplay, balance, UX, audio, and integration decisions are constraints,
  not suggestions — don't revert or "improve" them without being asked. When one is non-obvious,
  the reasoning is in `AGENTS_REFERENCE.md` or `CHANGELOG.md`, not restated here.
- **Never propose or start a core-mechanic rewrite on your own initiative — enforce the owner's
  existing vision strictly, don't reinterpret it.** A real incident, in two parts: (1) an agent
  misread the owner's own stat-threshold-unlock design ("a tower never transforms — reaching a
  threshold permanently unlocks the NEXT tier as its own separately buildable tower") as a request
  to change it to in-place elemental transformation, and started building a case for rewriting it
  — Build tray, ~20 already-shipped evolved tower classes, save schema, rendering — before the
  owner corrected course: the original mechanic was already correct, no rewrite needed. (2) While
  "fixing" what it thought was a stale doc claim in this section ("Proton/Quasar/Dark Matter are
  element states, never buildable towers"), the SAME agent flipped it to say they ARE buildable
  towers — reasoning from the fact that `CONFIG.TOWERS.QUASAR` existed, without checking whether
  Quasar was actually *reachable* through the Build tray's own unlock-source table. It was, but
  only because of one stray line that never should have existed — the doc had been correct all
  along, the code had the bug. Both mistakes share one root cause: treating "I found evidence for X
  in the code" as proof, instead of tracing whether X is actually reachable end-to-end. The lesson:
  when something reads as a design inconsistency, verify by tracing the real path (unlock source →
  registration → UI → purchase, or the equivalent for whatever's in question), not by pattern-
  matching a nearby data entry — and never spend a session building toward a rearchitecture the
  owner hasn't explicitly confirmed. If a request sounds like it wants a mechanic changed, restate
  it back in one sentence and get an explicit yes before writing any code toward it.

## Design pillars — read before touching waves, balance, or gore

- **Wave order and scale.** Every wave sends its smallest enemies in before anything bigger gets to
  move, always at least 2-5 small units for every big one. Size is the tell for strength: bigger
  always means slower, tougher, and worth more XP (1-5x a small kill), never just a reskin.
- **Escapees don't linger.** An enemy that survives past the finish line and dies later still
  disappears — a defeated escapee is not a permanent fixture on the map.
- **Leveling pace.** Roughly 5-7 small kills or 2-3 big ones fill a tower's XP bar and grant a stat
  point. An assist earns only a fractional share of that, never the full reward.
- **Map growth stays incremental.** Expansion winds outward a few tiles at a time, never a whole
  ring at once — organic while the route is young, closing into a full ring as it matures. The
  route is bordered by one green buildable tile on EVERY side, diagonals included (`PATH_BUILDABLE_MARGIN`
  is 1), wherever the route goes, including where it touches the edge of the region rectangle. Buildable
  green is exactly that border (`isInActiveRegion()`), never the rectangle: filtering by the rectangle
  left no grass above or left of the road and dropped green far from it (the 1.6.76 regression). A
  two-tile buffer (1.6.62) was tried and the owner called it too much grass. New border tiles wait in
  `pendingRevealTileKeys` until the expansion reveals them, so growth still spirals outward. An
  expansion that reveals nothing must still close (`finalizeRingExpansion()`), or no later one can start. Never redraw more of the map than the part that
  just changed, per the lag-creep protocol above.
- **Cleave weakens as it connects.** Melee cleave hits a bounded number of enemies with damage
  falling off on each successive target, and bleed only takes hold on the first, full-damage hit —
  never on the fall-off hits behind it.
- **Wind and Luck are retired, not deleted.** Ambient miss-chance wind and DEX's bonus-gold Luck
  were pulled for reading as confusing, not for being broken — the plumbing stays inert (see the
  Lag-creep protocol's note on `windCeilingForWave`) so either can be re-enabled on purpose later,
  never by accident.
- **Blood volume tracks crit, not randomness.** Spray size sits on a skewed scale — small most of
  the time, a large splatter only when a crit actually lands. Crit stays the rare, coveted stat;
  blood volume is how a player feels that rarity, not an independent coin flip.
- **DEX stays precious.** Attack-speed scaling from DEX must never let a player out-DPS
  accuracy/other-stat investment just by dumping points into speed — see Combat & stats below for
  the current diminishing-returns curve that protects this. Any future DEX rebalance keeps this
  intent, not just the current numbers.
- **Investing in power widens the swing, not just the average.** Training a tower's primary stat
  should stretch its min/max damage roll further apart, not simply raise the midpoint — a heavily
  invested tower reads as swingier, not just stronger on average.
- **Santa is the real final boss.** Highest HP in the game, replacing the ordinary boss on the
  campaign's last wave, periodically summoning fast Cookie enemies instead of healing. The same
  voice carries into the cookie-consent banner — large and dryly self-aware that the cookies are
  for save data and debugging, framed as Santa keeping his own naughty-or-nice list.
- **UI holds up at every screen size.** Stat buttons and every scale-to-fit HUD element stay
  legible and correctly sized on a large screen, not just a small one — verify both ends, not just
  mobile.

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
- **Fast-forward catch-up budget**: `MAX_SIMULATION_TICKS_PER_FRAME` is the 1x baseline (8 ticks).
  Above 1x, the accepted frame gap is capped at 150ms and the per-frame tick cap scales to cover
  that gap at the requested speed, with a hard maximum of 90 ticks at 10x; 1x retains its 100ms
  frame-time ceiling. Keep the cap and supported `SPEED_LEVELS` synchronized. Do not reduce the
  cap back to a fixed 8 ticks, which made low-FPS 5x sessions run near 1x and discard most of the
  accumulated simulation time.
- **Actual-speed telemetry** compares completed simulation milliseconds against the raw rAF
  callback gap, not the clamped frame delta. Keep reported catch-up cap and discarded-debt values
  alongside callback FPS; a low callback rate with low synchronous JS render/update time does not
  by itself prove a game-code hot spot or a JavaScript heap leak.
- Verify speed changes with focused timing checks at 1x, 5x, and 10x, then compare a same-device,
  same-wave gameplay capture. A synthetic loop test verifies arithmetic, not browser-compositor FPS.
- Any new decal/debris kind must declare whether it bakes (`isDecalBakeEligible()`); static
  geometry must bake. Verify with the perf overlay: live-drawn decals should stay near ~100
  regardless of total decal count.
- **A bake/cache-promotion delay must be an absolute time (ms), never a fraction of a lifespan
  constant.** Real incident (1.4.46): `isDecalBakeEligible()` baked at `lifeT >= 0.45` — fine at
  the original 5-minute `DECAL_LIFESPAN`, but when that lifespan was later extended to 30 minutes
  (so stains would visually persist longer), the SAME fraction silently became a 13.5-real-minute
  bake delay, and every decal in a normal session stayed in the expensive live-draw path the whole
  time. Two independent concerns — how long something visually lasts, and how soon it's cheap to
  render — must never share one tunable number. Now `DECAL_BAKE_MIN_AGE_MS` (an absolute constant),
  decoupled from `DECAL_LIFESPAN` on purpose. Applies to any future cache/bake timing, not just
  this one: if a "when does X become cheap" check is ever written as `elapsed/someDuration >=
  fraction`, treat that as a bug on sight, not a style choice — someDuration will get tuned later
  for an unrelated reason and silently drag the fraction's real-time meaning with it.

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
  `## [x.y.z] - YYYY-MM-DD — title` heading, as a bullet list explaining what changed **and why**.
  Don't batch multiple versions' worth of changes under one heading. This is the ONLY place a
  changelog entry is written — `index.html` no longer embeds a duplicate copy (see §1's
  `CHANGELOG.md` fetch exception); there is nothing to keep in sync by hand anymore, because there's
  only one copy. If you ever find yourself editing changelog content inside `index.html` itself,
  stop — that means the fetch-based loader broke or was reverted, not that this is the right place
  to write it.
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
  `EVOLUTIONS`, not a separately maintained list. Treat `TOWER_UNLOCK_SOURCE_BY_TARGET` as the
  source for player-facing unlock descriptions. Keep locked-row copy direct, useful, and free of
  cryptic riddles; state the relevant wave, source class, or stat requirement when it helps the
  player understand their next goal. The README gives a broad roster and progression overview;
  these invariants and the verified source tables define exact behavior.
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

## Route markers (spawn flags, finish carpet)

Both the spawn flags and the finish carpet are computed directly from the path's own waypoints —
never searched for among nearby buildable tiles, never cached independently of the path. Each
marker sits on one straight edge of its own tile: the carpet on the finish tile's forward/exit
edge (`computeFinishLine()`, anchored to the path's last waypoint), the two flags together on the
spawn tile's backward/entrance edge — the edge farthest from the carpet — (`computeSpawnFlags()`,
anchored to the first waypoint). The two functions are deliberate mirrors of each other: same
technique, opposite end of the path, opposite edge of the tile. A flag's `awayX/awayY` points
further backward, away from the tile, and is fixed once per path computation — never recomputed
from a flag's position relative to some other point at draw time, which produces an unstable,
edge-on-looking banner instead of a broad readable one. Neither marker's shape or position depends
on wind; only the flag's flutter animation does, and even that reads from a fixed ambient
constant, not the disabled miss-chance wind system.

The flag pole must stay clearly lighter than the dirt background (`drawFinishFlagPole()`, light
shaft in a dark outline, currently about 4.2:1). It was once a dark brown close to the dirt color
(about 1.2:1), which made the pole vanish and the banners look detached. Any recolor of the pole
must keep at least 3:1 contrast against `#8b5a2b`.

Dirt-path tiles and buildable green tiles form one chessboard. Green is light where `(gx+gy)%2===0`;
dirt is dark where `(gx+gy)%2===1`, so a dark dirt tile always touches light green. Path colors come
only from `pathTileColor()` (`PATH_TILE_DARK`, `PATH_TILE_LIGHT`), used by both `drawMap()` and
`paintPathTileBase()`. Never give those two functions separate path colors: they once diverged and the
path changed look after every expansion. The light dirt tone must stay slightly lighter than the
`#8b5a2b` background so it never merges with it. It is the warm orange-brown `#926438`. A grey taupe
(`#9a8266`) was tried and the owner rejected it as "way too grey": keep both path tones warm.

Ground details (pebbles on dirt, grass tufts on green) come from `paintPathPebbles()` and
`paintGrassTufts()`, seeded per tile by `seedTileRandom(gx, gy, salt)`. Never use `Math.random()` for them:
a tile must paint identically on every repaint. Keep them inside `GROUND_DETAIL_EDGE_MARGIN` of the tile
edge, and call the shared painters from every place that paints a path or buildable tile.
The seed includes `groundDetailRunSeed` (random per page load, saved with the game), so each run is unique but a
tile never changes within a run. The starting map gets a chosen budget from `pickStarterGroundDetails()`:
1 to 2 path tiles with 1 to 2 pebbles, 1 to 2 grass tiles with a tuft, the other starting tiles clean. The owner
wants only a few details on the first blocks; never raise those budgets. `validateDesignContract()` must run
after `initRegionAndPath()` because it inspects the chosen starter tiles.

## Stickman poses

Idle weapon-arm angle for hand-held weapons is `IDLE_GRIP_ARM_ANGLE`: the arm hangs down and forward at the
side and the weapon rests angled up from the hand. Never set the idle arm to the weapon's own angle for
swords, hammers, guns or bombers; that raises the arm and holds the weapon stiffly up (the 1.6.59
regression). Every class branch in `drawStickman()` must define `handX`/`handY` before using them; a
missing definition throws every frame that class is drawn, and `node --check` will not catch it. Before
shipping any pose change, render every `CONFIG.TOWERS` type both idle and engaged with the real
`drawStickman()` and confirm there are no exceptions.

## Design contract

Owner-decided rules are executable: `validateDesignContract()` runs at boot, never throws, and reports to the
console and to the Debug Log line "Design contract". It checks pole contrast, warm and ordered path tones,
the dirt/green checkerboard, the range balance theory below, the green border around the route (at boot and
after every expansion), corridor margin, pebble sparsity and starter budgets, the idle weapon arm and the
flag wind direction. When the owner states a new rule, add a named constant for it and one check there,
and add the rule's reason to its check message. Do not loosen a check to make a change pass: ask the owner.

**Range balance theory (owner-decided, `RANGE-BALANCE-01`).** Range grows linearly with INT from a tower's
starting range to its `RANGE_CAPS` value at 500 INT (`interpolateRangeByInt()`), so a starting range must sit well
below the cap: the Archer starts at 140 (cap 380) and reaches 260 at 250 INT. The role decides how far it goes:
melee (WARRIOR archetype) has the shortest starting and maximum ranges, archer types (ARCHER) sit in the middle,
and mage style (MAGE) ends up with the longest. `RANGE_BANDS` holds the numbers per role (melee caps 140-220,
archer caps 240-400, mage caps 400-520; starts at most 70%, 55% and 55% of the cap), `rangeRoleOf()` assigns
roles from `CLASS_ARCHETYPE`, and Cleric, Pope, Merchant and Glaive are support exemptions
(`RANGE_ROLE_OVERRIDES`). Every tower with a range needs a `RANGE_CAPS` entry: a missing one silently defaults to
double its start. Never raise a start or cap out of its band to make a tower feel stronger; move its role or ask
the owner. The spawn "!" marker and every other presentation-only animation must use
`presentationTime`, not `gameTime`, so game speed never changes how fast they move.

The spawn flags are triangular pennants, not rectangles: a vertical hoist edge at the top of the pole
tapering to one tip point (`computeFlagPennantShape()`). The cloth is a light-wind traveling wave that is
zero at the pole and grows toward the tip. Fold shading is drawn per strip from the same cross-section
vertices as the silhouette (`drawPennantFoldShading()`), never as a separate shape, so folds cannot
drift off the outline. Keep the wind light: small amplitude, slow speed, about one and a quarter folds.
The flag wind blows only while NO wave is in progress (`waveState === 'IDLE'`, see `updateFlagWind()`): the calm
between waves, even when enemies are loose. It rises in 1.2 s, and the moment a wave starts it dies over 2.5 s.
While the wave is active the flags are lifeless: hanging straight down along the pole, gathered to about half
their length, with no ripple or fold shading computed at all, to keep combat frames cheap. 1.6.74 had the wind
backwards; the contract tests both directions. In the calm the flags must look like real wind: a slow, uneven
gust level (`flagGustLevel()`) lifts the flag from a drooping lull to nearly level, lengthens the cloth and
strengthens the ripple in a gust, and the ripple runs perpendicular to the flag's own tilted axis. Keep them
narrow (hoist half height 7): not limp in the wind, not wide.

## Loose enemies, chance structures

Loose enemies (`enemy.escaped`: crossed the finish and still alive): each costs 1 life every 6 seconds while it
lives (`LOOSE_ENEMY_LIFE_DRAIN_MS`, `advanceLooseDrain()`, run in `updateEscaped()` on simulation time), in any
wave state; each stays on the route and its grass border (`isLooseWalkableAt()`, `confineLooseEnemyToRoute()`),
never on the bare dirt outside it; the count shows under the Next Wave button (`countLooseEnemies()`,
`#looseNotice`) as plain text, "🏃 N loose", with no background and no drain wording, and hides at zero.
Lives changes of every kind show only beside the health counter (`showLivesChange()`, `#livesChangePop`, red
minus / green plus, like the gold pop) and never over enemies or other map objects. The game-over screen has
Play Again as the large primary button and Download Debug Log as a smaller secondary one below it. The region-rectangle clamp they used to have is gone: the rectangle no
longer describes where the grass is.

Chance structures (`CONFIG.CHANCE_STRUCTURES`, `maybeSpawnChanceStructures()`, `useChanceStructure()`): rare
structures that appear on the grass border when a wave is cleared, stored as scenery items with
`isChanceStructure`. The Healing Fountain (⛲) holds a pool of 10 lives; a tap restores as many missing lives as
it can, up to the pool, never above `maxLivesNow()`; it stays with its remaining pool and vanishes when the pool
is spent; used at full health it heals nothing and stays. Spawn chance rises when the player is hurt and with a
pity timer, capped at `maxChance` (0.6), never before `minWavesCompleted`, never above `maxOnBoard`. To add a
structure: one table row plus a case in `useChanceStructure()`. Their rings must stay steady (no pulsing
opacity): nothing in this game fades in and out repeatedly.

## Reset options and storage keys

Settings → Game → Reset options (`clearUnlocksAndRestart()`, `clearAllProgressAndRestart()`) clears every
StickTD storage key by prefix: `stickTD_` and `sticktd:`. Any new `localStorage` key must start with one of
those prefixes, or "Clear All Cookies & Data" will silently miss it. Both reset paths end in
`location.reload()` and must not write storage between the clear and the reload. Unlocks are re-derived
from waves completed by `checkTowerUnlocks()`, so clearing them in place without a reload would re-grant
them at the next wave check.

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
  canvas layers with explicit invalidation and spatial-hash allocation reduction in real combat
  (not just idle). Treat the speed-scaled catch-up ceiling as an active tuning point; compare
  real-device cap hits, dropped debt, callback gaps, and update cost before changing it.

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

These invariants and the owner's current instructions define progression behavior; keep the README focused on the player experience.

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
- Proton, Quasar and Dark Matter are ELEMENT STATES a tower earns and carries on its OWN existing
  attack (`MIXED_ELEMENT_RULES`, `refreshElementState()`, `applyAttunementStatus()`,
  `QUASAR_ELEMENT_SPLASH_RADIUS`) — never separately buildable tower types, and never a
  transformation of the tower that earned them; that tower stays exactly what it was. A mix
  requires both stats at `MIXED_PAIR_THRESHOLD`.
  This invariant has now been wrong in BOTH directions in this file within one day — first stated
  correctly, then flipped to "ARE buildable towers" by an agent who found that `CONFIG.TOWERS.QUASAR`
  literally existed and assumed the code was right and the doc was stale, without checking whether
  the code path that made it *reachable* actually existed. It didn't: Quasar (and only Quasar, not
  Proton or Dark Matter) had one stray line —
  `TOWER_UNLOCK_SOURCE_BY_TARGET.QUASAR = { kind: 'triple-stat', ... }` — that wrongly registered it
  as a real Build-tray unlock, contradicting the elemental system every other part of the codebase
  (including Quasar's own `applyAttunementStatus()` case) already correctly used. Removed in 1.4.50;
  `CONFIG.TOWERS.QUASAR` itself is kept, legacy-only, purely so a pre-existing save with one already
  built still loads. The lesson for next time: when a doc/code mismatch is suspected, check whether
  the thing is actually *reachable* end-to-end (unlock source → Build tray → purchase), not just
  whether a data entry for it exists — a leftover/dead data entry proves nothing on its own.
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
   **Why, precisely** (V8 Orinoco GC design — Hannes Payer, Google/Chrome/V8): young-generation
   collection assumes *"most objects will die young"* and is fast on exactly that case — a
   throwaway object that dies within roughly the same collection cycle is nearly free. The
   expensive case is the opposite: an object that survives just long enough to be copied and
   promoted into the old generation, where it becomes Full-GC material (marking + sweeping +
   compaction, plus a write-barrier cost on every pointer write into it from then on). This means
   the danger isn't "allocation" as a blanket concept, it's allocation of things that *almost* die
   immediately but don't quite — a scratch array rebuilt every tick that happens to survive past
   one young-gen sweep is worse than either a true one-frame throwaway or a genuinely pooled object
   that's never re-allocated at all. Pooling wins either way, but this is the actual mechanism, not
   just a rule of thumb — cite it rather than restating "avoid allocation" without the reason.
   **Ceiling on what's achievable**: a natively-compiled engine (e.g. a WC3 custom map) has no
   generational garbage collector making scheduling decisions at all — fixed, pre-arranged memory
   per object type, no GC pauses, ever. A browser tab running on V8 *will* periodically pause the
   main thread for young-gen scavenging regardless of code quality, and a Full GC if enough
   survives. Careful pooling can push that cost down close to negligible (plenty of JS/Canvas games
   hold 60fps for hours), but "zero GC pauses" isn't an achievable target here the way it is in a
   natively compiled engine — don't treat a nonzero GC cost alone as evidence of a code bug.
4. **No unconditional full-world work** in per-frame or timer paths. World caches are blitted as
   the visible slice (`blitWorldLayer()`) and rebuilt only when dirty, coalesced
   (`SETTLED_DECAL_REBUILD_MIN_MS`). Map expansion repaints stay scoped to the new ring's rectangle
   (`paintNewRingTiles()`) plus the finish carpet's own footprint at its old and new position
   (`repaintFinishCarpetFootprint()`) — never a full-map redraw. `rebakeMap()`/`drawMap()` (the true
   `WORLD_MAX_W × WORLD_MAX_H` redraw) is reserved for save/load restore and DPR/resize, where a
   one-time full repaint is the correct scope, not a recurring one.
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
11. **A function that writes DOM text/attributes never reads a layout-forcing property**
    (`clientWidth`, `scrollWidth`, `offsetWidth`, `getBoundingClientRect()`) later in the same
    synchronous call — that forces a synchronous reflow the JS-timing overlay (`phaseTime.*`)
    cannot see. Read first and cache, or defer the read to the next animation frame.

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

- **Every UI and input change targets both mobile and desktop, at any screen scale, with both
  mouse and touch.** Nothing gets built mouse-only or desktop-only by default — layout math derives
  from actual measured canvas/element dimensions (never a hardcoded screen-size assumption), and
  interaction handlers respond to both pointer and touch events. Verify a change at a narrow mobile
  width, not only at whatever width it happened to be built at.
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
- Nothing fades in and out repeatedly — no `globalAlpha` or rgba-alpha modulated by a continuous
  `sin()` on a warning banner, marker, or indicator. The only acceptable fade is one-way, out,
  permanently. Position and color can still pulse or bob for attention; opacity does not cycle.
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

## Weight and size rules (1.6.64)
- **Derived weight is not saved state.** Enemy weight follows its current radius (15px = 1.0), and tower weight follows capped STR (1.0–1.5); visual size follows sqrt(weight). Keep these derived values synchronized automatically through getters, including after save loads and size-tier changes. Lancer damage uses target weight with a 0.5–1.75 multiplier.
