# Stick Tower Defense

A free browser-based tower defense game with 8 unique stickman classes, an expanding spiral map, infinite waves, a hero item system, breakaway enemies that ambush your towers, path-blocking barricades, and full save/load. Single self-contained HTML file — no install, no build step, just open and play.

**[Play it here](https://sauerninja.github.io/StickTD/)**

Zero dependencies: no external images, no external audio, nothing to install. Every stickman, weapon, and effect is drawn procedurally on an HTML5 Canvas, and every sound is synthesized live with the Web Audio API.

## How to play

- Tap **Build**, pick a tower, then tap a hedge tile to place it.
- Tap a placed tower to upgrade it, sell it, **move** it, buy it gear from the **Shop**, or cycle its targeting priority.
- The map starts as a tiny 2x2 area and grows outward as you clear waves — some expansions are free milestones, others cost gold. Only one expansion can happen per round; extras queue for the next.
- The path is a genuine spiral, regenerated (and re-checked against your existing towers) every time the map expands.
- Waves continue indefinitely past 15 with procedurally scaling difficulty — this is built to be a long-haul hero-building grind, not a 15-wave sprint.
- Runs on desktop (mouse + scroll-to-zoom) and mobile (touch, pinch-to-zoom, drag-to-pan).

## Towers

| Tower | Role |
|---|---|
| ⚔️ Swordsman | Melee cone sweep; specializes into Two-Hander or Dual Wield at level 5 |
| 🏹 Archer | Ranged — now visibly draws the bow before firing: slower arrows, real power behind each shot |
| 🪓 Axeman | Dual hand axes; manually toggle between a close swing and a ranged throw |
| 🔱 Spearman | Long melee reach, slow but hard-hitting |
| 🔨 Hammerman | Stuns on hit, carries a shield and extra HP |
| 🔮 Mage | Slows whatever it hits |
| 💣 Bomber | Splash damage against groups |
| 🔫 Gatling | Very fast, low damage per shot — shreds swarms |
| 🚧 Barricade | Doesn't attack. Extremely tough, placeable directly on the path — freezes the first enemy that touches it (and anything queued behind it) for 10 seconds before breaking |

## Enemies

Grunt, Swarm, Tank, Runner, and a Boss on wave 15 make up the core roster. Fire and Ice enemies can break off the path entirely to 1v1 a tower directly, inflicting burn or a slow debuff on it. The Troll has a big bounty and roughly double HP, but walks *backward* toward the entrance instead of forward — kill it for the payout before it wanders off, or it may take a swing at a nearby tower and leave debris that costs gold to clear.

## Items & Heroes

Every tower starts with a free class-specific item. Buy better gear per class from the Shop — Iron, Gold, and a top Masterwork tier that costs wood and stone alongside gold. Global passive upgrades apply to every tower you own, current and future. A tower with all 4 item slots filled awakens into a **Hero**, with a permanent stat bonus and a visible crown.

## Resources

Gold from kills and wave clears. Wood and stone from clearing scattered trees and rocks (and rare treasure chests / relic drops) — spent on the priciest tier of shop gear.

## Settings

Video (graphics quality), Audio (mute), Game (18+ gore toggle, save/load), and About (in-app README viewer/downloader).

## Save / Load

Progress isn't auto-saved. Settings → Game → **Save Game** downloads a `.txt` file with a random seed and your full game state. **Load Save** on that same screen restores it — on this device or any other.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

## License

MIT — see [LICENSE](LICENSE).
