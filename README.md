# Stick Tower Defense

A free browser-based tower defense game with stickman towers that level up and evolve into
distinct classes, an expanding spiral map, infinite waves, a hero item system, breakaway enemies
that ambush your towers, path-blocking barricades, and full save/load. Single self-contained HTML
file — no install, no build step, just open and play.

**[Play it here](https://sauerninja.github.io/StickTD/)**

Zero dependencies: no external images, no external audio, nothing to install. Every stickman,
weapon, and effect is drawn procedurally on an HTML5 Canvas, and every sound is synthesized live
with the Web Audio API.

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
- Waves continue indefinitely past 15 with procedurally scaling difficulty across 7 rotating
  wave archetypes — this is built to be a long-haul hero-building grind, not a 15-wave sprint.
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

Burn, curse (poison-style DoT), slow, and stun all show a periodic reminder label above an
affected unit every 120 seconds, so long-running effects stay visible instead of only appearing
the instant they're applied.

## Leveling

Every tower has its own EXP level (1-99), separate from its gold-bought upgrade tier. EXP comes
from landing kills, killstreak milestones, spending gold to upgrade a tower's tier, and simply
surviving to the end of a round. Each level-up grants exactly one stat point — small and frequent
rather than big lump sums. Barricades don't fight, so they don't earn EXP.

Stat damage bonuses are class-exclusive, Dota-style: STR only boosts damage for Warrior-archetype
towers (Swordsman and its evolutions), DEX only for Archer-style towers (Archer, Gatling,
Blowdart, Bomber, Dual Squirt Gun), and INT only for Mage-archetype towers (Mage, Cleric). STR's
max-HP bonus and DEX's attack-speed/luck bonus stay universal across every class.

## Waves

100 hand-authored waves, then infinite procedurally-generated ones cycling through 7 archetypes —
Standard, Swarm Surge, Elite Vanguard, Undead Uprising, Ambush Tactics, Siege Assault (boss rush),
and Stone Push (a heavily-armored crowd-control test). A Boss periodically spawns Grunt minions
while active; an off-screen compass arrow points toward it when it's out of view.

The first 15 waves each introduce at most one brand-new enemy type, with a popup explaining its
HP, speed, bounty, and any special behavior the first time it appears. A summary popup at the end
of every wave shows total gold gained and a per-class EXP breakdown.

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

Video (graphics quality), Audio (mute), Game (18+ gore toggle, save/load), and About (in-app
README viewer/downloader).

## Save / Load

Progress isn't auto-saved. Settings → Game → **Save Game** downloads a `.txt` file with a random
seed and your full game state. **Load Save** on that same screen restores it — on this device or
any other.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full version history, and [BACKLOG.md](BACKLOG.md) for
ideas not yet built.

## License

MIT — see [LICENSE](LICENSE).

