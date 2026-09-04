# Stick Tower Defense

A free browser-based tower defense game with stickman towers that level up and evolve into
distinct classes, an expanding spiral map, infinite waves, a hero item system, breakaway enemies
that ambush your towers, path-blocking barricades, forensic-grade blood/gore effects, and full
save/load. Single self-contained HTML file — no install, no build step, just open and play.

**[Play it here](https://sauerninja.github.io/StickTD/)**

Zero dependencies: no external images, no external audio, nothing to install. Every stickman,
weapon, and effect is drawn procedurally on an HTML5 Canvas, and every sound is synthesized live
with the Web Audio API.

## Contents

- [How to play](#how-to-play)
- [Towers & evolutions](#towers--evolutions)
- [Tower appearance](#tower-appearance)
- [Enemies](#enemies)
- [Status effects](#status-effects)
- [Blood & gore](#blood--gore)
- [Leveling](#leveling)
- [Waves](#waves)
- [Pathing & AI](#pathing--ai)
- [Items & Heroes](#items--heroes)
- [Resources](#resources)
- [Lives](#lives)
- [Settings](#settings)
- [Save / Load](#save--load)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Contributing](#contributing)
- [Version History](#version-history)
- [License](#license)

## How to play

- Tap **Build**, pick a tower, then tap a hedge tile to place it.
- Tap a placed tower to see its nameplate — a portrait, HP bar, an EXP bar, and combat stats. Tap
  the nameplate again (or the scroll icon, which glows green when you have points to spend) to
  expand into full options: upgrade, sell, move, buy it gear from the **Shop**, cycle its
  targeting priority, or spend stat points.
- Every tower has its own EXP level, up to 99, separate from its gold-bought upgrade tier — see
  **Leveling** below. Investing enough points into one stat evolves the tower into a distinct new
  class — see the tree below.
- The map starts as a tiny 2x2 area and grows outward as you clear waves — some expansions are
  free milestones, others cost gold. Only one expansion can happen per round; extras queue for
  the next.
- The path is a genuine spiral, regenerated (and re-checked against your existing towers) every
  time the map expands.
- Waves continue indefinitely past 100 with procedurally scaling difficulty across 7 rotating
  wave archetypes — this is built to be a long-haul hero-building grind, not a sprint.
- Runs on desktop (mouse + scroll-to-zoom) and mobile (touch, pinch-to-zoom, drag-to-pan).
- Speed up simulation from 1x up to 10x via the HUD speed button. When a tower is selected and
  actively attacking, a red-bordered target frame shows what it's aiming at — HP, armor, and speed.

## Towers & evolutions

Only Swordsman, Archer, Mage, and Barricade are built directly. Every other class is reached by
investing stat points into an existing tower.

| Tower | Role |
|---|---|
| ⚔️ Swordsman | Melee cone sweep — the starting warrior |
| 🏹 Archer | Ranged, visibly draws the bow before firing — slower arrows, real power behind each shot |
| 🔮 Mage | Slows whatever it hits, small chance to burn, freeze, or shock |
| 🚧 Barricade | Doesn't attack — extremely tough, placeable directly on the path, freezes the first enemy that touches it |
| 🔨 Hammerman | *(Swordsman → STR)* Stuns on hit, carries a shield and extra HP |
| 🪓 Axeman | *(Swordsman → DEX)* Dual hand axes; manually toggle between a close swing and a ranged throw |
| 🔱 Spearman | *(Swordsman → INT)* Long melee reach, slow but hard-hitting |
| ⚜️ Paladin | *(Hammerman → INT, 2nd tier)* Every hit deals holy pure damage, bypassing armor entirely |
| 🔫 Gatling | *(Archer → STR)* Very fast, low damage per shot — shreds swarms |
| 🎯 Blowdart | *(Archer → DEX)* Short range, fast fire rate, every dart poisons |
| 💣 Bomber | *(Archer → INT)* Splash damage against groups |
| 🔫 Gunalinder | *(Bomber → INT, 2nd tier)* Trades splash for precision — fires all six chambers of a revolver in a rapid burst, then a long reload |
| 🎯 Sniper | *(Gunalinder → INT, 3rd tier)* The deepest INT investment in the game — one devastating shot at the longest range of any tower |
| 🔫 Dual Squirt Gun | *(Blowdart → DEX, 2nd tier)* Dual-wielded, deeper DEX specialization |
| ✝️ Cleric | *(Mage → INT)* Curses the nearest enemy of any type with a lingering damage-over-time affliction — 5x tick damage against undead. Also heals your lowest-HP tower once per wave. |

Gold-tier upgrades (paid with gold, separate from EXP levels) raise range, cooldown, and unlock
class mechanics, with a modest damage bump included — but damage growth is weighted so a tower's
**primary stat** (see Leveling) is the dominant lever for how hard it actually hits, not the tier
level by itself.

## Tower appearance

Every individual tower rolls its own unique look the moment it's built, independent of every
other tower of the same class:

- **Height & weight** — a per-tower silhouette variance around that class's baseline proportions,
  so two Mages (for example) can read as visibly taller/leaner or shorter/stockier rather than
  sharing one fixed build.
- **Skin tone & pants tone** — each rolled as a fully independent random shade across a wide
  range, not tied to each other and not anchored to the class's own preset color, so within one
  class you'll see every combination: darker skin with lighter pants, lighter skin with darker
  pants, or anything in between. Hue stays per-class (Mage always reads violet, Archer always
  reads green); only lightness is randomized.
- **Face color** is the one deliberate exception — always a subtle shade darker than that
  specific tower's own skin tone, so the face reliably reads as part of the same figure.

Re-rolled (fresh randomization) on **upgrade** and on **evolution**, so leveling up and evolving
visibly show growth and change, not just a stat readout.

## Enemies

Grunt, Swarm, Tank, and Runner make up the early roster, alongside a Boss on wave 15. Fire and
Ice enemies can break off the path entirely to 1v1 a tower directly, inflicting burn or a slow
debuff on it. Splitter breaks into two smaller Splitmini on death; Boulder does the same but
tankier. Healer keeps nearby enemies topped up; Shielded absorbs hits until its shield breaks.
Wolf hunts in a coordinated pack. The Troll has a big bounty and roughly double HP, but walks
*backward* toward the entrance instead of forward — kill it for the payout before it wanders off.

**Undead** (Zombie, Wraith, Skeleton, Reaper) carry real armor and are the intended target for a
Cleric's curse, which deals 5x damage to them specifically. Skeleton revives once on death.
Reaper is the heaviest-armored undead in the roster.

## Status effects

Burn, curse (poison-style DoT), bleeding (see [Blood & gore](#blood--gore)), slow, and stun all
show a periodic reminder label above an affected unit every 120 seconds, so long-running effects
stay visible instead of only appearing the instant they're applied.

## Blood & gore

An 18+ toggle in Settings → Game controls all of it — off by default. With it on, damage produces
biologically-flavored, forensic-style bloodstain effects rather than a generic hit spark:

- **Per-species blood profiles** — insects, undead, and rock/debris enemies each bleed a
  distinct color and texture (necrotic dark ooze for undead, acid-green hemolymph for insects,
  dust for constructs), and every individual enemy of a species additionally rolls its own subtle
  blood tint, so no two enemies bleed an identical, flat color.
- **Directional spatter** — cast-off streaks and satellite droplets fly away from the actual
  striking angle, not radially outward, and vary by attacker archetype (a tight forward cone for
  Archer-style hits, a full radial burst for explosive damage, a directional gush for melee).
- **Running drip trails** — a gently curved, gravity-affected trickle with a small pooled bead at
  the tip, distinct from the initial impact streak — this is what blood does a beat *after*
  landing, not another copy of the impact spatter.
- **Bleeding (DOT)** — a sufficiently heavy hit opens an actual wound: a ticking
  damage-over-time effect that keeps the enemy actively bleeding (spray, drops, occasional new
  pooling) for several seconds, on top of ambient low-HP dripping for anything below 40% HP.
- **Barricade contact-transfer smears** — an enemy pressed against a barricade while bleeding
  leaves a directional wipe stain on the barricade itself, not just a puddle beneath it.
- **Walking blood / footprints** — an enemy that steps in fresh blood picks it up and leaves a
  fading trail of footprints as it walks, running dry after a few steps.
- **Forensic aging** — a fresh stain is bright oxyhemoglobin red, passes through a reddish-brown
  oxidizing stage as it dries, and (once old enough) shows a darker, coagulated skeletonization
  ring around a lighter, flatter interior — real bloodstain-pattern-analysis aging, not a flat
  color fade. Every stain lasts up to 30 minutes with individual per-decal variance, and the map
  supports up to 2,000 concurrent stains before the oldest are recycled.
- **Instant, not delayed** — every blood effect fires at the actual moment of the hit or the
  moment of death. Nothing schedules a delayed trickle that could still be landing seconds after
  an enemy is already gone.

## Leveling

Every tower has its own EXP level (1-99), separate from its gold-bought upgrade tier. EXP comes
from landing kills, killstreak milestones, spending gold to upgrade a tower's tier, and simply
surviving to the end of a round. Each level-up grants exactly one stat point — small and frequent
rather than big lump sums. Barricades don't fight, so they don't earn EXP.

Stat damage bonuses are class-exclusive, Dota-style: STR only boosts damage for Warrior-archetype
towers (Swordsman and its evolutions), DEX only for Archer-style towers (Archer, Gatling,
Blowdart, Bomber, Dual Squirt Gun), and INT only for Mage-archetype towers (Mage, Cleric). STR's
max-HP bonus and DEX's attack-speed/luck bonus stay universal across every class. A tower's
primary stat is the dominant driver of how hard it hits — gold-tier level-ups add real but
comparatively modest raw damage, so investing in the right stat matters more than just buying
levels.

## Waves

100 hand-authored waves, then infinite procedurally-generated ones cycling through 7 archetypes —
Standard, Swarm Surge, Elite Vanguard, Undead Uprising, Ambush Tactics, Siege Assault (boss rush),
and Stone Push (a heavily-armored crowd-control test). A Boss periodically spawns Grunt minions
while active; an off-screen compass arrow points toward it when it's out of view.

The first 15 waves each introduce at most one brand-new enemy type, with a popup explaining its
HP, speed, bounty, and any special behavior the first time it appears. A summary popup at the end
of every wave shows total gold gained and a per-class EXP breakdown.

Enemies within a wave are spaced out on spawn — both within one enemy type's own group and across
every other group spawning that same wave — so a wave with several concurrent enemy types never
dumps them all onto the entrance at the exact same moment.

## Pathing & AI

Enemies path along the map's spiral in genuine single file: a faster unit won't try to overtake
a slower one directly ahead of it (there's no lane to pass in), a queue naturally forms behind an
active Barricade, and a swept collision check catches fast-moving units that would otherwise
tunnel straight through each other within a single frame. Corner-turning uses a forgiving
waypoint-arrival margin so units don't overshoot and backtrack into the units behind them.

## Items & Heroes

Every tower starts with a free class-specific item. Buy better gear per class from the Shop —
Iron, Gold, and a top Masterwork tier that costs wood and stone alongside gold. Global passive
upgrades apply to every tower you own, current and future. A tower with all 4 item slots filled
awakens into a **Hero**, with a permanent stat bonus and a visible crown.

## Resources

Gold from kills and wave clears. Wood and stone from clearing scattered trees and rocks (and rare
treasure chests / relic drops) — spent on the priciest tier of shop gear.

## Lives

Start with 100. Buy an extra life with gold from the **Shop** — each purchase costs
substantially more than the last (exponential scaling), so it's a real emergency valve rather
than a routine top-up.

## Settings

Video (graphics quality: Low / Medium / High, trading off shadows and particle-heavy effects for
performance), Audio (mute), Game (18+ gore toggle, save/load), and About (in-app README
viewer/downloader).

## Save / Load

Progress isn't auto-saved. Settings → Game → **Save Game** downloads a `.txt` file with a random
seed and your full game state. **Load Save** on that same screen restores it — on this device or
any other.

## Tech stack

- **HTML5 Canvas 2D** for all rendering — every stickman, weapon, enemy, particle, and decal is
  drawn procedurally with `CanvasRenderingContext2D` calls, no sprite sheets or image assets.
- **Vanilla JavaScript**, no framework, no bundler, no transpilation step.
- **Web Audio API** for synthesized sound effects — no audio files.
- **A single self-contained `index.html`** — HTML, CSS, and JS all live in one file by design (see
  [Contributing](#contributing)), so the entire game is one download and one `<script>` tag away
  from running.

## Project structure

```
StickTD/
├── index.html      # the entire game — markup, styles, and all game logic
├── AGENTS.md        # workflow rules for AI agents/contributors making changes
├── CHANGELOG.md      # full version history, newest first
├── BACKLOG.md        # ideas and planned features not yet built
├── LICENSE            # MIT
└── README.md          # this file
```

## Running locally

No build step, no package manager, no server required:

1. Clone or download the repo.
2. Open `index.html` directly in any modern browser.

That's it. If your browser restricts local-file features (some autoplay/audio policies behave
differently under `file://`), serve it with any static file server instead, e.g.:

```
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## Contributing

This repo deliberately stays a single-file, zero-dependency project — see
[AGENTS.md](AGENTS.md) for the exact workflow any contributor (human or AI agent) follows when
making a change: bumping `GAME_VERSION` by one patch level per meaningful change, adding a
changelog entry that explains *why* something changed and not just what, and running a syntax
check before finalizing. Check the [live version](https://sauerninja.github.io/StickTD/) and/or
pull the current `main` before starting work, since this repo may be updated between sessions.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full version history, and [BACKLOG.md](BACKLOG.md) for
ideas not yet built.

## License

MIT — see [LICENSE](LICENSE).
