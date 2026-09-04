# Backlog

Ideas, requests, and suggestions that have come up but aren't built yet. See `AGENTS.md` for the
workflow this file follows — move items to `CHANGELOG.md` and delete them from here once shipped.

## Ideas

- **Swordsman not attacking past a barricade** — reported multiple times with screenshots, but
  every screenshot provided so far either showed no enemies in range, or enemies not actually
  visible/confirmable as blocked-and-in-range. Traced the full targeting pipeline
  (`findTarget()`, `checkConeHits()`, `queryNearby()`) and found no code that excludes
  barricade-blocked enemies from being valid melee targets — structurally this should already
  work. Needs a screenshot with real enemy monsters (not just a Barricade icon) clearly stacked
  inside the range circle, ideally paired with the console/state at that moment, to actually
  diagnose rather than re-guess at code that reads correctly on every pass so far.

- **Enemy queue/pathing still clumping despite the v1.0.98 rework** — the multi-lane convergence
  queue system was rebuilt and verified with two passing standalone simulations (5-enemy and
  8-enemy convergence tests), but real gameplay screenshots since then still show enemies
  stacking messily instead of forming a clean line. This means either the simulations don't
  reflect a real-game edge case (e.g. actual path curvature, multiple adjacent Barricades, or
  enemies of very different radii/speeds interacting in a way the simplified test didn't cover),
  or there's a separate bug in how the queue system integrates with actual `Enemy` objects vs.
  the plain test objects used in the simulation. Needs an actual debugging session against real
  gameplay state, not another isolated simulation — the pattern so far has been "simulation
  passes, real game still shows the bug," which means the simulation isn't modeling something
  that matters.

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
  like Gunalinder/Sniper (shipped this session) were — those reused all-existing single-target
  projectile mechanics, this needs new combat-resolution logic entirely.

- Inter-tower drag-and-drop item transfer ("throwing" items between stickmen, Dota-style) — the
  6-slot inventory itself shipped this session, but dragging an item from one tower's slot onto
  another tower within range needs real pointer-drag state tracking, hit-testing against other
  towers' screen positions, and drop-target UI feedback. A genuinely separate feature from the
  slot display itself.

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
  - Forensic-realism gore rewrite: directional spatter by weapon archetype and per-enemy blood
    biology/color shipped in v1.0.76. Pooling-to-static-layer performance optimization (drawing
    settled decals onto a persistent background canvas instead of keeping them in the live decal
    array) is still open if decal count ever becomes a real perf concern.
  - Dota-style item economy: empty starting inventories, on-death item drops, a static Merchant
    NPC gated behind wave 5, drag-and-drop item throwing between towers scaled by range.
  - Dwarf Builder NPC (Hammerman-proportioned, bright orange, wobble-walk animation) plus much more
    pronounced scenery scale variance after wave 3, with isometric depth-sorted overlap rendering
    for oversized trees/boulders.
  - These are all real, well-specified ideas — just too large to land safely in one pass each.
    Happy to scope and build any one of them as its own focused task whenever wanted.

- A batch of suggestions from a separate Gemini conversation assumed architecture that doesn't
  match this repo (separate class files, a pure "STR only helps warriors" gate, poison rendered
  non-green, only two targeting modes). Checked against actual code: poison/curse already
  renders green (`#7cb518` floating text, `rgba(124,181,24,...)` tint), targeting already has
  a `FIRST/CLOSEST/STRONGEST` cycle, a full EXP/level system shipped in v1.0.49, Blowdart's
  pipe-tracking shipped in v1.0.51, true archetype-exclusive STR/DEX/INT damage gating shipped in
  v1.0.52, wave-pacing (one new enemy type per wave, waves 1-15) also shipped in v1.0.52, and the
  new-enemy-introduced popup shipped in v1.0.59. Genuinely open items from that batch, not yet
  built: a `WEAKEST` targeting mode; Archer arrow spawn-point trig alignment to the bow across all
  facing angles; Dual Squirt Gun hand anchor sitting on the muzzle instead of the grip.

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
