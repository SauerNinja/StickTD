# Agent Instructions — Stick Tower Defense

For any AI agent (Claude Code or otherwise) making changes to this repository. Part 1 covers what
to do and how; Part 2 (below the standing rules and sections 0-8) holds the detailed subsystem
rationale, historical lessons and best-practice notes. Read Part 1 every session; open the Part 2
section for a subsystem only when it is actually relevant.

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
- **Map growth stays incremental.** Expansion winds outward a few tiles at a time, never a whole ring at once. The route keeps grass on every side and between its own legs (see Map, route and start-of-game rules). Never redraw more of the map than the part that
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

## Owner standing rules — apply to every change

The owner has stated these repeatedly. They are written generally on purpose: the detail (names, constants, version history) lives in the section named at the end of each line, in code, and in `CHANGELOG.md`. A rule the owner states is baked in here and, where it can be tested, as a design contract check, so it cannot quietly regress. Refine a bullet before adding a new one.

**How work is done**
- **The owner supplies the evidence** (debug log, save file, screenshots, clips, opinion). Do not run long or arbitrary simulations to settle a balance or lag question; decide from these notes and the code, and ask for data when evidence is really needed. Short, targeted checks of your own change are fine.
- **Check a report against the live version first.** Screenshots often come from an older build; the debug overlay shows the version. Say so plainly instead of assuming the fix failed.
- **Never create new files unless the owner asks for one.** Fold guidance into `AGENTS.md`, `README.md`, `BACKLOG.md` or `CHANGELOG.md`; the game stays one `index.html` with its existing companions.
- **Deliver the complete current `index.html` plus only the documents that changed**, flat and individually, never zipped. Every change gets a version bump, a changelog entry and, for a stated rule, a contract check.
- **Player-facing text is professional.** No jokes, filler or dialogue on item use, and no tutorial hints for things that are obvious on their own. The README stays general and unshowy.

**Things the player handles are objects first, actions second**
- Nothing opens, applies or collects itself. Consumables go into a stickman's slots and are used by a click or hotkey; gold bags open only on a click. See *Consumables and the item log*.
- One clear moment of feedback per use (what, exact amount, class colour, sound), timed on real time, fading out once. See *Consumables and the item log*.
- Every clickable emoji is hit on its own drawn border, never a looser circle or a whole tile. See *Target marking* and `isWithinEmojiSquare()`.

**World rules**
- Wandering units (livestock, troll) never interact with the lane or barricades, never bounce or jump (they walk back to walkable ground instead of snapping), and are still fought by towers when hostile or marked. An enemy that has broken off to attack a stickman is on its own phase and never collides with barricades or other enemies (`BREAKAWAY-PHASE-01`). See *Loose enemies, chance structures*.
- Random events happen at most once per expand, through one shared slot. The owner's refinement, not yet built: per expand, one event 3 to 5 squares from the spawn flags and one 3 to 5 squares from the finish line, only positive, easy, non-aggressive events until wave 5, and never announced to the player. See *Loose enemies, chance structures*.
- Scenery is biggest on the tiles touching the road ends (always trees and rocks, never bushes), medium around them, small and tiny toward the middle; tiles the player has cleared rarely regrow. See *End-of-road scenery density*.
- Bleeding comes only from arrows that stay stuck; every weapon draws its own ammo. See *Ammo kinds and bleeding*.
- Enemies keep their spacing on the road and pack tightly when stacked at a barricade. See *Map, route and start-of-game rules*.
- The camera opens at the owner's chosen view, 2.1x (`FIT_MAX_ZOOM`; 2.7x was too close, 0.9x too far), smaller only when the screen cannot fit the opening area; the player decides to zoom in or out from there. See *Map, route and start-of-game rules*.
- Game speed changes combat only; presentation (camera, text, items, animals) runs on real time, and cosmetic motion is reduced at the fastest speeds. See *Game speed and clocks*.
- Camera motion (drag pan, glide, zoom, pinch, tower follow, wave-start pan) always renders at the screen's full refresh rate, whatever the frame-rate limit says (`CAMERA-SMOOTH-01`); the design contract fails if the main loop stops consulting `isCameraMotionActive()`. The price of the next bought expansion grows only with expansions the player has bought, never with free ones (`EXPANSION-PRICE-01`).
- A system that asks for reduced motion starts with screen shake off and without the enemy hop and lean (`PREFERS_REDUCED_MOTION`); any new decorative motion checks it.

**Progression sizes are multiples of one unit**
- A training bar is the unit; a promotion is a fixed multiple of it, half automatic and half spendable, all as random rolls. Stims and meals last until the wave ends. See *Promotion size*.

**Performance**
- Prefer events over per-tick scans, no per-frame DOM work or allocation, fixed pools, and a cheap "anything to draw" exit on every draw routine. Measure before claiming a saving, and say when something is not measured. See *Lag-creep prevention protocol*.

---

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

- Consumables (food, treats, stims, meals) are carried in a stickman's six item slots and used on demand (slot click or keys 1-6), passed by dragging to another stickman, or dragged back to the map within stickman reach. They are never applied on pickup or auto-eaten at wave end.
- Canvas resolution is owned by the render governor: `setupCanvas()` multiplies the device pixel ratio by the current render-scale step, and every cache sized from `dprValue` follows it. Do not size canvases from `window.devicePixelRatio` directly.
- Cooking recipes (any recipe with `fuelCost`) are available only to a stickman within reach of a lit Campfire, and spend that fire's fuel; the Campfire is a chance structure whose fuel is saved with the scenery item and burns one per completed wave.
- Automatic render resolution is opt-in and off by default, slow to react, and silent during play (debug overlay and log only). It never goes below the player's chosen lowest level (25%, 50%, 75% or 100% for never; default 75% on Low, 100% on High), including for a saved older step. It is offered once after sustained low frame rate and always reversible in Settings.
- Screen shake scales with the killed enemy's weight and defaults on for High graphics and off for Low unless the player chose otherwise.
- Wandering NPCs spawn outside every stickman's reach (skipped when none exists) and steer away from map edges instead of snapping back. Big scenery gathers at the road ends by the flags, with very little in the middle.
- Stat items show only their rainbow glow, never a ring. Enemies never drop a coin item; gold arrives as a bag of small coins.
- When handing work to another assistant, reference source files as plain-text raw.githubusercontent.com URLs, and describe every change completely.
- Decorative emote and speech-bubble effects are chance-based, never guaranteed, capped at two bubbles on screen, timed in real time, and free of per-frame allocation.
- Barricades are unlimited; price rises steeply with the number already on the field. Enemy displacement from misses or hits is render-only; real positions change only through path movement and collision resolution, and route-following enemies stay leashed to the lane.
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
- `BACKLOG.md` is the master list of everything still open, organized by what the item is waiting on
  (owner setup, owner decisions, a real playthrough, evidence, scoped content, balance data, audio,
  UI, repro-needed reports). Add new items to the matching section with a status tag, without turning
  a speculative suggestion into a commitment. Move an entry to `CHANGELOG.md` and delete it from
  `BACKLOG.md` once actually shipped — never leave stale duplicates in both, and never add a
  round-by-round history section; history is the changelog and git.
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
- **Owner standing rules** (above) are the short list; the sections named in them (Consumables and the item log, Item codex, Promotion size, Ammo kinds and bleeding, Target marking, End-of-road scenery density, Loose enemies, chance structures, Game speed and clocks) hold the detail.
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

The flag pole stays clearly lighter than the dirt background: a light shaft in a dark outline with a round finial, at least 3:1 contrast against `#8b5a2b` (`FLAG_POLE_COLOR`, `DIRT_BACKGROUND_COLOR`).

The spawn flags are triangular pennants: a vertical hoist edge at the top of the pole tapering to one tip (`computeFlagPennantShape()`), 14px tall at the hoist (hoist half height 7). Fold shading is drawn per strip from the same cross-section vertices as the silhouette (`drawPennantFoldShading()`), so a fold always sits on the outline. Wind blows only while no wave is in progress (`waveState === 'IDLE'`, `updateFlagWind()`), even when enemies are loose: it rises over 1.2 s, and dies over 2.5 s when a wave starts. While a wave is active the flags hang straight down along the pole, gathered to about half length, with no ripple and no fold shading computed. In the calm, an uneven gust level (`flagGustLevel()`) lifts the flag from a drooping lull to nearly level, lengthens the cloth and strengthens the ripple, and the ripple runs perpendicular to the flag's own tilted axis.

Dirt-path tiles and buildable green tiles form one chessboard. Green is light where `(gx+gy)%2===0`; dirt is dark where `(gx+gy)%2===1`, so a dark dirt tile always touches light green. Path colors come only from `pathTileColor()` (`PATH_TILE_DARK`, `PATH_TILE_LIGHT`), used by both `drawMap()` and `paintPathTileBase()`. Both tones stay warm orange-brown (`#835528` and `#926438`), with the light tone slightly lighter than the `#8b5a2b` background.

Ground details (pebbles on dirt, grass tufts on green) come from `paintPathPebbles()` and `paintGrassTufts()`, seeded per tile by `seedTileRandom(gx, gy, salt)`; never `Math.random()`, so a tile paints identically on every repaint. Details stay inside `GROUND_DETAIL_EDGE_MARGIN` of the tile edge, and every place that paints a path or buildable tile calls the shared painters. The seed includes `groundDetailRunSeed` (random per page load, saved with the game). The starting map takes a chosen budget from `pickStarterGroundDetails()`: 1 to 2 path tiles with 1 to 2 pebbles and 1 to 2 grass tiles with a tuft, the other starting tiles clean.

## Map, route and start-of-game rules

- **Starting position.** A new game has exactly 2 route tiles, 2 grass tiles inside the starting 2x2 region, and 1 Barricade on the finish tile at full health (`seedStartingBarricades()`, `validateStartingBarricade()`). The rest of the border stays locked (`lockStartingBorderOutsideRegion()`, `pendingRevealTileKeys`) until the first expansion. A save made before the first expansion restores the same lock.
- **Border.** Buildable green is exactly the border within `PATH_BUILDABLE_MARGIN` (1) of the route, diagonals included, on every side (`isInActiveRegion()`); it never depends on the region rectangle. New border tiles wait in `pendingRevealTileKeys` until the expansion reveals them. An expansion that reveals nothing still closes (`finalizeRingExpansion()`).
- **Route spacing.** Two route tiles three or more steps apart along the road never touch, edge or corner, so a strip of grass separates each leg from the next (`routeSpacingViolationCount()`, `extendPathWithNewRing()`). Growth tries a spaced connector first and falls back to the plain simple-path rule only when none exists.
- **Enemy pace.** Walking speed is `ENEMY_WALK_SPEED_SCALE` (0.25, at most 0.3) times each enemy's base speed. Each wave unit after the first spawns `ENEMY_SPAWN_GAP_MS` (5000, at least 4500) after the previous one, in simulation time.
- **No canvas filters.** Never assign `ctx.filter` on the game canvas: the browser rasterises every primitive through a filter pass that the game's own frame timers cannot see. A downed tower uses grey skin colors and reduced opacity instead (`DOWNED_TOWER_SKIN_MAIN`, `DOWNED_TOWER_SKIN_SHADE`).
- **Telemetry.** Analytics events are declared once in `TELEMETRY_EVENTS` and sent only through `trackGameEvent()`, which forwards declared parameters only, adds `game_version`, `wave` and `quality`, and records the last 60 events for the Debug Log. Event and parameter names are snake_case, at most 40 characters, at most 25 parameters per event including the three standard ones, string values at most 100 characters. To report something new, add it to the catalog first. Events are consent-gated by `window.trackEvent()`.
- **Presentation clocks.** Presentation-only animation (the spawn "!" marker, flag flutter, the selection-hand
  pointer, scenery clearing progress) uses `presentationTime`, not `gameTime`, so game speed does not
  change its rate.
- **Game-speed scope (`GAME-SPEED-SCOPE-01`, owner-decided).** The 1x/2x/3x/5x/10x control is meant to
  speed up enemy movement and tower attack rate only, proportionately — nothing else. Anything that is
  real-world work-in-progress (clearing scenery, a UI timer, a pointer animation) must run on
  `presentationTime`/real elapsed time, never `gameTime`. This has only been audited and fixed for the
  cases the owner actually flagged (scenery clearing, the selection-hand pointer) as of 1.6.93 — a full
  pass over every remaining `gameTime`-driven animation has not been done, because several of them
  (enemy flicker, tower shake, ground-item bob, livestock bob) belong to entities that already move at
  game speed, and whether each should track game speed or not needs a case-by-case call, not a blanket
  find-and-replace. When touching any such animation, check which category it falls in before assuming.

## Stickman poses

Idle weapon-arm angle for hand-held weapons is `IDLE_GRIP_ARM_ANGLE`: the arm hangs down and forward and the weapon rests angled up from the hand. Every class branch in `drawStickman()` defines `handX`/`handY` before using them; a missing definition throws every frame that class is drawn, and `node --check` does not catch it. Before shipping any pose change, render every `CONFIG.TOWERS` type idle and engaged with the real `drawStickman()` and confirm there are no exceptions.

## Design contract

Owner-decided rules are executable: `validateDesignContract()` runs at boot after `initRegionAndPath()`, never throws, and reports to the console and the Debug Log line "Design contract". It covers pole contrast, warm and ordered path tones, the chessboard, range balance, the route border, the starting position, corridor margin, pebble and starter budgets, enemy pace, telemetry catalog rules, loose-enemy rules, chance-structure rules, the idle weapon arm, flag wind direction, ammo kinds, the bleed source and consumable storage. A new owner rule gets a named constant and one check there. A check is never loosened to make a change pass.

**Range balance (`RANGE-BALANCE-01`).** Range grows linearly with INT from a tower's starting range to its `RANGE_CAPS` value at 500 INT (`interpolateRangeByInt()`), so a starting range sits well below the cap. Melee (WARRIOR archetype) has the shortest starting and maximum ranges, archer types (ARCHER) sit in the middle, and mage style (MAGE) has the longest. `RANGE_BANDS` holds the numbers per role (melee caps 140-220, archer caps 240-400, mage caps 400-520; starts at most 70%, 55% and 55% of the cap), `rangeRoleOf()` assigns roles from `CLASS_ARCHETYPE`, and Cleric, Pope, Merchant and Glaive are support exemptions (`RANGE_ROLE_OVERRIDES`). Every tower with a range has a `RANGE_CAPS` entry, because a missing one defaults to double its start.

## Loose enemies, chance structures

Loose enemies (`enemy.escaped`: crossed the finish and still alive) each cost 1 life every 6 seconds (`LOOSE_ENEMY_LIFE_DRAIN_MS`, `advanceLooseDrain()`, run in `updateEscaped()` on simulation time), in any wave state. Each stays on the route and its grass border (`isLooseWalkableAt()`, `confineLooseEnemyToRoute()`). The count shows as plain text under the Next Wave button ("🏃 N loose", `#looseNotice`, no background) and hides at zero. Lives changes of every kind show only beside the health counter (`showLivesChange()`, `#livesChangePop`; red minus, green plus) and never over enemies or other map objects. The game-over screen has Play Again as the large primary button, then a smaller Download Debug Log button; its message is two even rows, the sentence and then the call to action.

Chance structures (`CONFIG.CHANCE_STRUCTURES`, `maybeSpawnChanceStructures()`, `useChanceStructure()`) are rare scenery items with `isChanceStructure` that appear on the grass border when a wave is cleared. The Healing Fountain (⛲) holds a pool of 10 lives; a tap restores as many missing lives as it can, never above `maxLivesNow()`; it keeps its remaining pool and vanishes when the pool is spent; used at full health it heals nothing and stays. Spawn chance rises when the player is hurt and with a pity timer, capped at `maxChance` (0.6), never before `minWavesCompleted`, never above `maxOnBoard`. A new structure is one table row plus a case in `useChanceStructure()`. Structure rings are steady, never pulsing.

## Elemental attunement combat effects

Fire burns for 10s (`applyBurn()`); it and every other DoT (bleed, poison) track independent `*Until` timers on the enemy, so they always stack — never make one DoT cancel or override another. Ice fully freezes for 10s (`applyFreeze()`, `frozenUntil`), stopping movement the same way `stunnedUntil` does; keep the 🧊 icon distinct from Electric's ⚡ so the two read differently. Electric arcs via `spawnChainLightning()` (`CHAIN_LIGHTNING_MAX_JUMPS`, `_JUMP_RADIUS`), stunning and partially damaging each jump target, with visuals in `activeLightningArcs`/`drawLightningArcs()`.

## Boss treat tactical effects

Donut, Chocolate and Lollipop (in `TREAT_ITEMS`) each carry a secondary effect beyond the shared heal/XP/gold bundle every treat grants, dispatched in `applyTreatItem()`. Donut's shield (`donutShieldHits`, capped `DONUT_SHIELD_MAX`) is checked first in `loseLife()`, before the Defibrillator, and cleared by `clearDonutShieldAtWaveEnd()` on every wave completion. Chocolate's buff (`chocolateAtkSpeedBuffUntil`) is read where tower cooldown ticks down; stacking extends the timer rather than multiplying. Lollipop zones (`lollipopZones`) are ticked once per frame in `updateTreatTacticalEffects()` and apply the enemy's own `applySlow()` — never build a second slow system when this one already exists. Only the shield persists across a save; the other two are temporary and reset on load.

## Elemental tower tint and attack emoji

`towerElement(tower)` is the single source of truth for a tower's active element (locked attunement or mixed elementState). Real gameplay towers tint skin toward `ELEMENT_SKIN_TINTS[element]` (blended via `tintSkinTowardElement()`, never a flat replace) and show `ELEMENT_ATTACK_EMOJI[element]` at the muzzle while aiming/attacking. The downed-tower grey (`NO-CANVAS-FILTER-01`) is applied after and overrides the tint.

## End-of-road scenery density

Scenery near either end of the route (spawn flags, finish line) is denser and larger than mid-route, tapering over `END_SCENERY_RADIUS_TILES` route tiles (`pathEndProximity()`, `spawnExtraEndScenery()`, both called from `generateScenery()` and `scatterSceneryInRing()`). The random scale roll in `spawnScenery()` is biased toward the top of the range near the ends, and the tree/rock split shifts toward rock. Distance is measured along the route, not straight-line. Purpose: encourage building in the middle, keeping both ends open for the road to keep expanding.

**Size gradient and harvested tiles (`END-RING-01`, `SCENERY-GRADIENT-01`).** Trees and rocks follow the distance from the road ends. The tiles that touch a road end, on the sides not taken by the route (normally three per end), always hold the biggest pieces: `fillEndRing()` runs after every wave and expansion, fills any free ring tile with a piece of at least `END_RING_MIN_SIZE_FRAC` (a piece the player has cleared grows back once the tile is empty, and a tile a tower or hut occupies is skipped), and replaces a smaller piece that landed there first. Ring tiles hold only trees and rocks (`RING-ONLY-BIG-01`): random scenery never lands on them (`isEndRingTile()`), and `fillEndRing()` also replaces a bush, crate or smaller piece that got there first, so a potted plant never sits where a rock belongs. The end guards place medium pieces around the ring (`END_GUARD_MAX_SIZE_FRAC`). Everywhere else `treeRockSizeFrac()` sets the size from `pathEndProximity()`: medium near the ends, then medium-small, small and tiny toward the middle of the road, and `treeRockKeepChance()` thins them out the same way, so the middle carries mostly small and tiny pieces. A tile the player has cleared once is remembered (`harvestedTileKeys`, saved as `harvestedTiles`) and rarely grows a tree or rock again (`HARVESTED_TILE_KEEP_FACTOR`); the ring tiles ignore that memory. New pieces therefore appear mainly at the ends and on tiles never cleared. The design contract checks that the ring size stays above the gradient.

## Analytics parameter names

Event parameters in `TELEMETRY_EVENTS` must never be named `source`, `medium`, `campaign`, `term`, `content`, `value` or `currency` (`ANALYTICS-PARAMS-01`). Google Analytics reads those as traffic-source or revenue fields: an enemy name sent as `source` showed up as a session source ("GRUNT / (not set)"). Use a specific name instead (`enemy_type`, `script_file`, `setting_value`, `payment_type`). The design contract fails if a declared parameter uses one. Renaming a parameter starts a new series in Google Analytics; older events keep the old name.

Key events are few and single-shot. `game_started`, `engaged_player` (sent at most once per session, after a few waves are cleared) and `save_downloaded` are the ones to mark as key events in Google Analytics; `wave_milestone` repeats every few waves, so it is a measurement event, not a key event. A new event meant to be a key event should fire at most once per session.

**Share image.** `og-image.png` in the repository root is the picture shown when the game is shared; it must be 1200 by 630 pixels (the size the `og:image:width` and `og:image:height` tags state) and is referenced with a `?v=` number in the Open Graph, Twitter and structured-data tags. When the picture changes, raise that number everywhere together so social sites fetch the new one instead of their cached copy. It shows the owner's cover art whole, never cropped, on a clean dark background with no blurred copy of the picture beside it. The art contains ESRB-style rating badges at its bottom-left; StickTD has no official rating, so flag that before the image is reused anywhere a rating would be taken at face value (a store page, for example).

**Where the master list lives.** The `TELEMETRY_EVENTS` table in `index.html` is the single master list of events and their parameters; nothing else restates it. The owner's one-time clicks in Google Analytics and Search Console (key events, custom dimensions, retention, site verification) live in `BACKLOG.md` in section 1 ("Owner setup"), not here. When a change adds a parameter worth reporting on, add it to that list's custom dimensions or metrics in the same change.

## First-time alerts and Introduction Text

One-time explanatory popups (welcome, Item Guide, first enemy escape, first tower overrun) all go through `maybeShowFirstTimeAlert()` or the same localStorage-gate pattern, and all respect `introTextEnabled` (Settings → Game → "First-time tips and alerts"). Never add a second persistence mechanism for this category — fold new first-time popups into the existing `sticktd:prefs:v1` blob.

## Meat max-HP and livestock

Random events share one slot per expand (`RANDOM-EVENT-SLOT-01`): the wandering troll, chance structures such as the campfire and fountain, extra buildings, hut camps and livestock all call `tryClaimRandomEventSlot()` before they spawn, and only the first to succeed in an expand gets it. A wave clear opens the slot (`openRandomEventSlot()`), then `runWaveClearRandomEvents()` tries the wave-clear events in shuffled order, so none has priority; the free expansion that follows, and any livestock or hut it would add, find the slot taken. A paid expansion opens a fresh slot. Each event that happens writes a "random event:" line to the game event log. New random events must claim the slot the same way; the design contract checks the slot semantics.

Enemy presence is remembered between ticks, not rescanned every tick (`LAG-PASS-02`): `laneEnemiesPresent` and `targetableWandererPresent` are refreshed only when `enemyPresenceDirty` is set, which happens when an enemy spawns, a wanderer dies, the marked target changes, enemies are cleared, or the lane loop updates no lane enemy. While lane enemies exist the lane loop that already runs supplies the answer, so the check costs nothing per tick. Any new way to add or remove an enemy outside `spawn()` and `die()` must set the flag.

Towers see a hostile wanderer (the troll) or a marked animal even when no lane enemy is alive (`TROLL-FIGHTS-BACK-01`): the per-tick enemy hash is built whenever a lane enemy, a hostile wanderer or the marked target exists, not only when lane enemies do. Between waves the troll is often the only enemy on the field, and an empty hash leaves every tower blind to it.

Gold bags (`GOLD-BAG-ITEM-01`) are ordinary ground items, drawn like every other item with no ring and no number: click one to open it where it lies, drag it to move it, or drop it on a stickman to open it there; its coins pop out of wherever it is opened. Nothing opens a bag automatically: not a stickman standing near it, not the end of a wave, not a timer. Every source (enemy bounty bags, the troll, chests, lucky-coin and hut gold items) calls `dropGoldBag()`. Gold is never lost: a bag removed by the ground-item limit or by its three-minute lifespan is credited unopened (`creditGroundBagGold()`), and bags on the ground are saved with the game (`goldBags`). Coins never come to rest on a tree or rock (`COIN-BOUNCE-01`): a landing coin bounces off scenery, and after a few bounces moves to the nearest clear spot, so a click meant for a coin cannot clear scenery. One bag in ten also pops a diamond, a coin-sized pickup that grants a permanent passive upgrade (`DIAMOND-COIN-01`). A treasure chest always drops one to three bags, and the present and treasure chest keep one fixed size each, the chest larger (`FIXED_SCENERY_SCALE`).

Wandering units (livestock and the troll, every enemy with `isLivestock`) never interact with the lane (`WANDERER-PHASE-01`): they are skipped by both collision passes, by the barricade pile-up and by the follow-speed cap, so they cannot push, block or slow a lane enemy and are not pushed by one; they remain valid targets for towers when marked or hostile. They glide while wandering, with no hop or rocking rotation, and `findTouchingBarricade()` returns nothing for them, so they never touch, bump or count toward a barricade; the design contract checks that too. The design contract places a wanderer on top of a lane enemy and fails if either moves.

Meat items raise `bonusMaxLivesFromMeat` (folded into `maxLivesNow()`) as well as healing, tiered in `MEAT_MAXHP_BY_ID` and capped per wave at `MEAT_MAXHP_CAP_PER_WAVE` (reset in the wave-started hook); overflow becomes gold via `MEAT_MAXHP_OVERFLOW_GOLD_PER_POINT`. Never remove this cap — it is what keeps meat drops from making the Shop's Extra Life price pointless. Livestock are real pooled Enemy instances (`isLivestock` flag, `CONFIG.ENEMIES` CHICKEN/PIG/COW, `maybeSpawnLivestockOnExpansion()`), not a parallel system — this reuses the full damage/elemental/death pipeline instead of re-implementing it. `Enemy.updateLivestockWander()` confines them to the walkable road/grass area (`isLooseWalkableAt()`) and skips all hostile AI. `buildEnemyHash()` excludes `isLivestock` enemies from normal tower targeting unless they are `markedTargetEnemy`; `die()` branches on `isLivestock` to drop the matching meat instead of gold/XP and clear the mark. Never let livestock block wave completion — the `anyActiveEnemies`/`anyAlive` checks explicitly exclude them.

## Item crafting

`CRAFTING_RECIPES` (`findCraftableRecipeFor()`, `craftItemOn()`) are the only "make an item from other items"
mechanic in the game — never add a codex, salvage, or set-bonus system alongside it; that was explicitly
ruled out. Crafting only ever consumes exact ingredient items from one tower's own `equippedItems` and adds
one result item; there is no global/shared stash. The 🔧 Combine button in the inspect panel is the only UI —
it shows only when the currently-selected tower's inventory satisfies a recipe exactly.

## Evolve-in-place — does not exist

There is no in-place tower transformation. Reaching a stat threshold permanently unlocks a new type for the
Build tray (`unlockTowerTypeBuild()`, called from `checkEvolution()`/`checkAttunementAndSpecialization()`);
the tower that triggered it is never changed. If you find yourself writing code that reassigns `tower.type`
on an existing, already-built tower, stop — that pattern was removed on purpose (`NO-EVOLVE-IN-PLACE-01`).

## Consumables and the item log

Consumables follow Warcraft 3 custom-game item rules. Food, treats, stims, cooked meals, and hut loot such as tonics and pouches are picked up into a stickman's six item slots and are used only when the player clicks the slot or presses its number key (1-6), through `activateInventorySlot()` and `useStoredConsumable()`. Dropping a consumable on a stickman stores it (`receiveItem()`), dropping it elsewhere leaves it on the ground, and nothing applies a consumable on pickup, on drop, at the end of a wave or on expiry. `isConsumableDef()` is the single test for what counts as a consumable, and every new consumable definition must satisfy it and be registered in `CONSUMABLE_BY_ID` so saves restore it (`CONSUMABLE-STORED-01`, checked by the design contract).

When a stickman's panel is collapsed, a quick-use row floats above it (`updateQuickSlots()`, `QUICK-USE-01`): one box per consumable in the inventory, each showing its slot number and icon, packed from the left with no gaps (a lone consumable in slot 6 sits in the first box). Passive items are skipped, the row is hidden when there is no consumable, when the panel is expanded (the full inventory is visible there) and for barricades. A click on a box uses the item; a drag out of a box works like a drag out of the inventory. The number keys keep working. The row is refreshed by events, through `refreshQuickUse()`: when an item is used, bought, received, sold back, crafted or dragged out (plus the normal panel refresh on selecting or expanding), never on a timer or per frame. Any new place that adds or removes an inventory item must call it.

Using a consumable is one deliberate moment (`showItemUseFeedback()`, `ITEM-USE-FEEDBACK-01`): the item's icon rises above the stickman, an exact readout sits under it (effect and amount, plus "Until the wave ends" for round buffs), a single ring in the item class colour expands once for tier 1 and 2 items, and a short synthesized motif plays. There are four item classes in `ITEM_USE_CLASSES` (heal green, power amber, haste blue, gain gold), each with a colour and a motif, and three tiers: 0 plain, 1 with ring, 2 with ring, longer hold and a closing note (cooked meals, boss treats, Hyper-Serum, max-life meat). The moment runs on real time, never on game speed, has no jokes or dialogue, and every part fades out once; nothing pulses or repeats. New consumables call `showItemUseFeedback()` from their apply function instead of spawning ad-hoc floating text, and the design contract checks that every class has a colour and motif. The first use of each item type writes one line to the game event log (`recordFirstItemUse()`, saved as `itemTypesUsed`). While a round buff is active the nameplate shows a pip (`updateBuffPips()`): stat icons and the percentage, merged when several stats share the same value. Stims and meals last until the wave ends, so the pip states that and shows no countdown.

Every clickable emoji is hit exactly where it is drawn (`EMOJI-HITBOX-01`): its own square, at the font size and centre it is drawn with, tested through `isWithinEmojiSquare()`. That covers gold bags (`GOLD_BAG_EMOJI_PX`), coins (`COIN_EMOJI_PX`), ground items (`GROUND_ITEM_EMOJI_PX` and `groundItemBobPx()`, so the box follows the bobbing item), enemies and livestock (a square of twice the radius) and scenery (`sceneryAtPoint()`, which also checks the neighbouring tiles because big pieces reach into them, using the same `TILE_SIZE * 0.72 * scale` size the piece is drawn at). Size and centre come from the same constant or function the draw code uses, so the hitbox and the picture cannot drift apart; a new clickable emoji must do the same. Combat collision radii are a separate gameplay value and are not part of this rule. Every item is a per-copy instance (`makeItemInstance()`, an object whose prototype is the shared definition), so the Debug Log's ITEM LOG can follow one copy: time found and its source, each stickman that held it and for how long, time and user when used, and how it ended (used, expired, sold back, crafted away, lost with a sold unit). A new place that creates, moves, uses or destroys an item calls the matching `itemLog*` function. The GAME EVENT LOG in the same file records waves, escapes, broken barricades, sales, moves and stat points through `logGameEvent()`.

## Promotion size

A promotion is worth five training bars (`PROMOTION_BAR_MULTIPLIER`, `PROMOTION-SCALE-01`): `PROMOTION_PASSIVE_ROLLS` dice of 1-3 applied automatically, split by `distributePromotionDice()` (half to the class's main stat, the rest shared between the other two, or an even split with no archetype), plus `PROMOTION_SPENDABLE_ROLLS` dice handed over as spendable points. A training bar stays at two dice, about 4 points, and promotions are expressed in multiples of it so the two stay in proportion. Stat caps still apply.

## Item codex

Settings has an Items tab (`renderItemCodex()`, `ITEM-CODEX-01`) that lists every consumable in `CONSUMABLE_BY_ID`: used types show icon and name, unused ones show as not used yet. It reads the saved first-use record (`itemTypesUsed`) and is built only when the tab opens.

## Ammo kinds and bleeding

Only the base Archer shoots arrows. Every other ranged tower has its own ammo kind in `PROJECTILE_AMMO_BY_TOWER`, drawn by `drawAmmoShape()`: darts for Blowdart and Blow Gunner, pellets for the Dual Squirt Gun, tiny lead bullets for Gatling, Gunalinder, Marksman and Sniper, knives for the Crazy Chef and a crescent blade for the Glaive. A new ranged tower is added to that table; a tower left out falls back to the arrow shape and fails the design contract check (`AMMO-KIND-01`).

Arrows that hit an enemy stay stuck in it (Archer only, up to four, `MAX_STUCK_ARROWS`). Each point of the Archer's strength adds `BLEED_DAMAGE_PER_STRENGTH` (0.2) to every arrow's bleed per tick (`BLEED-STRENGTH-01`), and there is no floating blood icon on bleeding enemies: only the damage numbers and the blood itself. Bleeding multiplies with the arrows in the target (`BLEED-MULTIPLIES-01`): each stuck arrow is one stack, damage per tick is the sum of the stacks (three arrows deal three times one arrow) and the blood effect (spray, drops, pools, drips) scales with the stack count; the design contract checks the damage rule. Each stuck arrow adds one bleed stack, and the bleed lasts as long as any arrow is stuck (`BLEED-WHILE-STUCK-01`): while an enemy carries an arrow its bleed is refreshed every update, and it ends only when the enemy dies or leaves play. Each arrow's stack deals `BLEED_PER_ARROW_MAX_HP_SHARE` of the enemy's maximum health per tick, kept small because the bleed does not expire. Bleeding starts only from an Archer hit, through `bleedSourceAllowed()` (`BLEED-ARROW-ONLY-01`); hits from melee, thrown, dart, gun and magic towers do not cause it. The ammo and bleed-source rules are part of the design contract.

## Projectile aim

A ranged shot's flight direction (`p.vx`/`p.vy`, `p.angle` in `fireProjectile()`) is computed from the
actual muzzle spawn point to the target — never reuse the tower-center-to-target `angle` for flight once
the spawn point (`spawnX`/`spawnY`) is known, since the muzzle sits above center by `shoulderYWorld` and
reusing the center angle sends the shot flying parallel to, but above, the correct line. `fireAxeThrow()`
has its own separate calculation and is not affected by this rule.

## Target marking

One global `markedTargetEnemy` (`setMarkedTarget()`, `tryMarkTargetAt()`, drawn as 🎯 via `drawMarkedTargetIcon()`). Every tower's `findTarget()` checks it first and takes it unconditionally while in range and past the minimum-range rule, ahead of normal scoring. This is also the only way an unmarked (passive) livestock enemy becomes attackable, since `buildEnemyHash()` otherwise hides it from targeting entirely.

## Dirt-to-grass ratio

`bonusGrassTiles` (checked in `isInActiveRegion()` alongside the normal border) adds one extra buildable tile every `EXTRA_GRASS_EVERY_N_EXPANSIONS` (4) expansions, via `maybeAddBonusGrassTile()`. This is separate from and additive to the strict 1-tile border (`PATH-BORDER-01`): never fold bonus tiles into the border-completeness check, and never let this cadence go to 0 or negative.

## Map expansion frequency

`EXPANSIONS_PER_CYCLE` (3) caps expansions per idle period, checked in `expandRegion()`/`grantFreeExpansion()` and shown in the build menu. Since 1.6.76 an expansion adds only a few route tiles, not a whole ring, so this cap can stay generous without any single expansion growing the map by a large amount.

## Build cost scaling

`SCALING_COST_TYPES` covers every stickman type except Barricade and the max-one-per-board types; `SCALING_COST_GROWTH` (at least 2.25) multiplies cost per existing copy of that type on the board (`currentBuildCost()`). Never add a max-one-per-board type to the scaling list — `validateGameDefinitions()` rejects the contradiction.

## Food, treats and medical supplies

Food (`FOOD_ITEMS`) and Treats (`TREAT_ITEMS`) are a separate drop pool from equipment: dragging one onto a stickman applies its effect immediately via `applyFoodItem()`/`applyTreatItem()` and removes it, never occupying an item slot. Meat heals lives only — never raise `maxLivesNow()` from food; that is an explicit design boundary protecting the Shop's Extra Life economy. Medical Shop items (`MEDICAL_ITEMS`) are bought via `buyMedicalItem()` and either apply immediately or are held (Defibrillator) until `loseLife()` would end the run.

## Game speed and clocks

The 1x/2x/3x/5x/10x speed multiplies `gameTime` (simulation time) only. Camera pans and follow, screen shake, warning banners and floating text run on `presentationTime` (real elapsed time) so they are identical at every speed (REAL-TIME-PRESENTATION-01, 1.6.103). Anything that affects the fight (movement, cooldowns, statuses, spawn spacing) stays on `gameTime`, and only fast-forwards during an actual wave: `effectiveGameSpeed()` is 1 while `waveState` is `IDLE`. Presentation that must keep running between waves and at every speed (floating text, coin flights, livestock wandering, ground-item bob, glow and despawn timers) is driven once per rendered frame from `updatePresentationEffects()` or timed with `presentationTime`; never add such effects to `update(dt)`, which runs once per simulation tick. New UI or camera effects must use `presentationTime`; never time them with `gameTime` or a per-tick `dt`.

## Items and drops

Items are equipment that adds Strength, Dexterity, Intelligence or Armor through `recomputeStats()`. The shop sells only `UNIVERSAL_ITEMS`; every other item is drop-only (`DROP_ITEMS`, `cost: 0`) and is looked up by id in `ITEM_BY_ID`, including when a save is loaded. A new item is one row in `DROP_ITEM_ROWS`, with its stat total inside its rarity's `statBudget`; a new signature drop is one entry in `ENEMY_SIGNATURE_DROPS`. Drops are rolled once per enemy death by `dropItemsFromEnemy()` (general chance by size tier, signature chance `SIGNATURE_DROP_CHANCE`, bosses always). Ground items are dragged onto a stickman; the ring glow grows with rarity. The first item ever seen opens the one-time Item Guide (`maybeShowItemGuide()`, key `stickTD_itemGuideSeen`), which pauses the game while open. Player-facing text about items follows the game-manual voice: general, professional, no change commentary.

**Loot table (LOOT-TABLE-01, 1.6.99) — theme is medieval-modern fusion.** Any new loot (items, tonics, enemy signature drops) should blend both eras: knights, wells and crossbows alongside energy drinks, nano-tonics, chips and coffee (e.g. Nano-Tonic, Espresso Elixir, Bounty Chip). Do not add purely medieval or purely modern loot. Regular enemies drop through one roll in `dropItemsFromEnemy()`: `LOOT_DROP_CHANCE_BY_TIER` decides whether anything drops, `LOOT_CATEGORY_WEIGHTS_BY_TIER` picks supply (common), tonic (uncommon) or gear (rare), and exactly one item drops. Do not add independent per-kill drop rolls or raise these chances without reading the per-wave cap (`LOOT_REGULAR_DROP_CAP_*`) and the design-contract check. Bosses are the exception and always drop signature and generic gear plus a Treat.

## Reset options and storage keys

Settings → Game → Reset options (`clearUnlocksAndRestart()`, `clearAllProgressAndRestart()`) clears every StickTD storage key by prefix: `stickTD_` and `sticktd:`. Every new `localStorage` key starts with one of those prefixes. Both reset paths end in `location.reload()` and write no storage between the clear and the reload, because unlocks are re-derived from waves completed by `checkTowerUnlocks()`.

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
why) lives in `BACKLOG.md` section 7 ("Audio — deferred passes"), since it's a living plan.

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

Recent additions to the pattern: debug-only text is rebuilt a few times a second and cached (`buildDebugOverlayLayout()`), never per frame; "is anything alive" questions use a plain loop that stops at the first hit or a remembered flag (`enemyPresenceDirty`), never a closure per tick; a draw routine returns before doing any setup when it has nothing to draw.

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
- Trees and rocks belong near the flags and finish line only; each road end keeps at least 3 big pieces within 2 tiles; nothing may grow on a hut.
- Barricades have no stats, DPS or inventory in the panel and refuse items. Elements with `display` set by an id rule need an explicit hidden override, because `.hidden` alone will not hide them.
