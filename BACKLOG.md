# Backlog

Ideas, requests, and suggestions that have come up but aren't built yet. See `AGENTS.md` for the
workflow this file follows — move items to `CHANGELOG.md` and delete them from here once shipped.

## Ideas

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
