# Changelog

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
