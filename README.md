# Stick Tower Defense

![Stick Tower Defense gameplay](og-image.png)

Build a stickman defense that grows with every wave. Train a roster of distinct towers, unlock new specialists, and shape a winding battlefield as your campaign expands. Gather resources, place barricades, equip your heroes, and adapt your strategy against an endless stream of enemies.

**[Play it here](https://sauerninja.github.io/StickTD/)** · **[Full changelog](https://github.com/SauerNinja/StickTD/blob/main/CHANGELOG.md)**

StickTD brings procedural stickman art, synthesized sound, and long-form tower progression to your browser. Downloadable saves let you carry a campaign between devices.

## Build your strategy

Build a reliable frontline, invest in the stats that suit each tower, and grow your options over time.

1. **Develop distinctive towers.** Each class brings its own role, combat style, and stat strengths.
2. **Unlock specialists through play.** Stat milestones and wave progress add new classes to the Build menu.
3. **Shape elemental attacks.** Attunements and mixed effects add distinct combat traits to your towers.
4. **Invest in growth.** Training and promotion give you more ways to develop each unit.
5. **Expand your battlefield.** New route and build space open as your campaign advances.

## Contents

- [Build your strategy](#build-your-strategy)
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
- [Huts](#huts)
- [Lives](#lives)
- [Settings](#settings)
- [Save / Load](#save--load)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Code map](#code-map)
- [Running locally](#running-locally)
- [Contributing](#contributing)
- [Version History](#version-history)
- [License](#license)

## How to play

- Tap **Build**, choose a tower, then tap a hedge tile to place it. Each arrival gets a short class-flavored quip and a synthesized voice blip.
- Select a tower to view its portrait, health, experience, and combat stats. Open its nameplate for upgrades, movement, selling, equipment, targeting, and stat allocation.
- Train towers through combat and invest in their strengths. Stat milestones open specialist classes for your roster.
- Clear waves to expand the spiral battlefield. Free milestones and paid expansions create new route and build space as your campaign grows.
- Face an endless sequence of waves with nine rotating archetypes and enemies that grow in size, strength, and rewards.
- Play with a mouse on desktop or touch controls on mobile. Pan, zoom, pause, and set the simulation speed from the HUD.
- Select an actively attacking tower to see its target's health, armor, and movement speed.

### Stat icon legend

Every icon used across the HUD, a tower's inspect panel, its target frame, and its stat buttons:

**Top HUD bar**
| Icon | Meaning |
|---|---|
| ❤️ | Lives remaining — reaching 0 ends the run |
| 💰 | Gold — spent on building most towers, upgrading, expanding, and the Shop |
| 🔀 | Free tower relocations left (earn 1 more every 2 waves, capped) |
| 🏗️ Build / 🛒 Shop / ⚙️ | Open the build tray, item shop, or settings |
| ⏸/▶ and 1x/2x/.../10x | Pause/resume and simulation speed |

**Tower inspect panel — combat stats** (left to right: HP/armor first, then the damage cluster)
| Icon | Meaning |
|---|---|
| ❤️ | Current / max HP |
| 🛡️ | Armor — percentage damage reduction on incoming hits |
| ⚔️ | Damage, shown as its real min-max range (the actual random roll band every hit uses) |
| 💥 | Critical hits — shown as chance, then ⚔️ and the damage multiplier (e.g. "2.5% ⚔️1.20") |
| ⏳ | Full attack-cycle time, in seconds |
| 🥈 | Average damage per second, including expected critical hits and accuracy (burst-fire towers use their full attack cycle) |
| 🎯 | Range — attack radius in world units |

The stats row scales to fit on one line across panel widths.

**Tower inspect panel — stat allocation**
| Icon | Stat | What it does |
|---|---|---|
| 💪 | STR | +3% max HP per point for every class; additionally the sole source of damage for Warrior-archetype towers (Swordsman and its evolutions), on a curve built to keep scaling meaningfully into the late game |
| 🏃 | DEX | Universal +3% attack speed, reduced miss chance, and 💥 crit chance per point for every class, regardless of archetype; additionally the sole source of damage for Archer-archetype towers |
| 🧠 | INT | +6 range and 💥 critical damage per point; increases healing for Clerics and drives Mage damage |

Warrior damage scales with STR, Archer damage with DEX, and Mage damage with INT. DEX improves accuracy and critical chance across the roster; INT improves range and critical damage. Critical hits begin at 2.5% chance and 1.20x damage, with DEX and INT increasing those values up to their caps.

**Tower strategy (the aura box)** — specialist towers display a round glowing WC3-style icon
next to their inventory slots. Tap it for a concise note about the class's role and tactics.

**Target frame** (shown when a selected tower is actively attacking something)
| Icon | Meaning |
|---|---|
| 🛡️ | The target enemy's armor |
| 👟 | The target enemy's movement speed |

## Towers & evolutions

Build a defense from classes with complementary strengths. Training and wave milestones expand your roster, while elemental attunements and mixed effects add new character to a tower's attacks. Each class keeps a distinct combat role, from close-range defense to long-range damage, support, control, and utility.

| Tower | Role |
|---|---|
| ⚔️ Swordsman | Close-range warrior with broad melee attacks |
| 🏹 Archer | Draws and fires powerful long-range arrows |
| 🔮 Mage | Ranged magic with slowing and elemental effects |
| 🚧 Barricade | Durable path defense that stops an enemy at contact |
| 🔨 Hammerman | Shielded bruiser with stunning attacks |
| 🪓 Axeman | Switches between close swings and thrown axes |
| 👹 Berserker | Wide, hard-hitting melee attacks |
| 🔱 Spearman | Long-reach, deliberate melee strikes |
| 🎯 Lancer | Extended reach for controlling the frontline |
| ⚜️ Paladin | Holy attacks that cut through armor |
| 🔫 Gatling | Rapid fire for clearing groups |
| 🔪 Crazy Chef | Strength-driven kitchen knife thrower |
| 🎯 Blowdart | Fast darts that poison targets |
| 🔫 Dual Squirt Gun | Dual-wielded elemental fire |
| ♨️ Blow Gunner | Combines poison and chilling effects |
| 🔫 Marksman | Measured rifle shots with extended range |
| 🎯 Sniper | High-impact attacks from the longest range |
| 🐈‍⬛ Cat Snapper | Sends shadow cats to pursue and scratch targets |
| ⚡ Snap Caster | Quick electric casts that can chain between enemies |
| ✝️ Cleric | Supports allies and curses undead foes |
| 💀 Necromancer | Dark magic and a temporary skeleton guard |
| 🧑‍🦳 Pope | Spreads a powerful curse across nearby enemies |
| 💣 Bomber | Explosive attacks against clustered enemies |
| 🔫 Gunalinder | Rapid revolver bursts followed by a long reload |
| 👳 Merchant | Keeps the Shop available and earns bonus gold |
| ⚙️ Glaive | Specialist attacks against huts and other structures |

Proton, Dark Matter, and Quasar are mixed elemental effects carried by a tower's attacks. Their combinations bring burn, stun, and slow effects into a tower's existing combat style. See **Elements** under [Leveling](#leveling) for details.

Gold-tier upgrades improve range, cooldown, and class abilities while adding damage. A tower's primary stat remains its main source of combat growth.

## Tower appearance

Each tower has an individual look shaped by its class, silhouette, and stat growth. Skin and clothing tones vary from unit to unit, while class colors and signature details keep the roster easy to read. STR investment adds a growing mustache, giving long-serving warriors a visible mark of their progress.

## Enemies

Grunt, Swarm, Tank, and Runner make up the early roster, alongside a Boss on wave 15. Fire and
Ice enemies can break off the path entirely to 1v1 a tower directly, inflicting burn or a slow
debuff on it. Splitter breaks into two smaller Splitmini on death; Boulder does the same but
tankier. Healer keeps nearby enemies topped up; Shielded absorbs hits until its shield breaks.
Wolf hunts in a coordinated pack. The Troll has a large bounty, roughly double HP, and walks backward toward the entrance. Defeat it before it escapes.

**Undead** (Zombie, Wraith, Skeleton, Reaper) carry real armor and are the intended target for a
Cleric's curse, which deals 5x damage to them specifically. Skeleton revives once on death.
Reaper is the heaviest-armored undead in the roster.

## Status effects

Burn, curse (poison-style DoT), bleeding (see [Blood & gore](#blood--gore)), slow, and stun are marked by periodic reminders and distinct visuals: drifting ice crystals, flickering flames, and orbiting lightning bolts. Crowd-control effects can spread through queued enemies, extending their impact along the route.

## Blood & gore

An 18+ toggle in Settings → Game controls the game's forensic-style combat effects. Every weapon and enemy brings its own visual signature to the battlefield.

- Bladed swings leave curved cast-off arcs, blunt impacts create broad spatter and shockrings, and piercing attacks produce narrow forward streaks.
- Impact scale reflects hit strength and enemy size. Species profiles distinguish insect hemolymph, undead residue, and the dust and stone chips of rock-bodied enemies.
- Running drips, bleeding wounds, barricade transfer smears, and footprints give combat a visible trail across the map.
- Stains pass from fresh red through oxidized brown to aged, layered patterns. Individual lifetimes and local density limits preserve definition along busy paths.
- Bone fragments, skulls, and burrowing worms add battlefield detail, with each effect drawn in its own layer.

## Leveling

Each tower develops along two progression tracks, with **500 points per stat and 1,000 total**.

- **Training (XP):** enemy defeats award XP, with the largest share going to the tower that lands the final hit. Towers that helped receive an assist share based on damage. Every 100 XP rolls **2 × (1–3) stat points**.
- **Promotion (gold):** a promotion rolls 1–3 points into each stat and an additional 1–3 into the tower's main stat. Cost grows ×1.5 per rank (80 → 120 → 180 → 270 → …), with all rolls respecting the stat caps.

**Milestones.** At **500 total trained stats**, name a tower. At **1,000**, earn its training trophy and convert its XP share into gold at 25 XP per coin.

**Stat growth.** STR improves health and Warrior damage; DEX improves attack speed, accuracy, and critical chance, and drives Archer damage; INT improves range and critical damage, and drives Mage damage. Each tower's archetype defines its primary damage stat.

**Elements.** At 100 points in a stat, a tower attunes to Fire (STR), Electric (DEX), or Ice (INT). Developing two stats to 500 combines their elements: Fire + Electric creates Proton, Fire + Ice creates Dark Matter, and Electric + Ice creates Quasar. These effects bring burn, stun, or slow traits to attacks. Elemental effects can appear on projectiles and melee strikes, with proc chance scaling through stat investment.

**Class unlocks.** Stat milestones and wave progress reveal new specialists for the Build menu. Elemental attunement opens class-specific branches; some towers have further specialist paths.

**Spending points.** Tap a stat to spend one point or hold to continue spending. The panel previews upcoming progression milestones.

**Targeting modes.** Choose First, Closest, Strongest, Weakest, Farm, Assist, or Unclaimed to set how each tower selects its targets.

## Waves

Every wave follows a size order: Tiny, Small, Standard, then Large enemies and Bosses on every fifth wave. Dispatch advances as each group clears the route or reaches the finish. Larger enemies move more slowly, bring greater strength, and offer more XP. Wave plans include plentiful smaller foes alongside major threats.

The opening 15 waves introduce enemy families gradually, with a short guide to each type's health, speed, bounty, and abilities. End-of-wave summaries report gold gained and experience earned by class.

After wave 100, nine rotating wave archetypes provide varied pacing, enemy mixes, and combat challenges. Bosses can summon Grunt minions, with a compass marker to track those out of view. Spawn spacing keeps the entrance clear as groups arrive.

## Pathing & AI

Enemies follow the spiral in single file, forming natural queues at Barricades. Swept collision checks keep fast-moving units in contact with the route and one another. Dispatch adapts to a backed-up queue, and a safety timeout helps combat resume if movement stalls. Waypoint margins guide clean turns around spiral corners.

## Items & Heroes

Every tower has six transferable item slots. Shared items support any class: the **Lucky Branch** 🌿 (+1
STR/+1 DEX/+1 INT, gold + wood), and the **Barricade** 🚧 item (see Resources below) — both
buyable from the Shop for whichever tower you have selected. Items can be dragged directly from
one tower's inventory onto another to transfer them, or dropped on the ground first. A ground
item bobs gently with a soft pulsing ring around it at every graphics setting, and while you're
actively dragging one, a 👇🏻 indicator appears above a valid tower drop target. Global passive upgrades apply to every tower you own, current and future. A tower with all
6 item slots filled awakens into a **Hero**, with a permanent stat bonus and a visible crown, and
its own distinct sound. A tower whose STR+DEX+INT reaches 100 total becomes **Legendary** — a
separate, rarer milestone with its own small permanent stat bonus, a player-chosen name, and the
biggest fanfare in the game.

## Resources

Earn gold from enemy defeats and wave clears. Gather wood and stone from trees, rocks, treasure chests, and relic drops to fund premium equipment and Barricades.

Buy the Barricade item from the Shop (600🪵/300🪨), place it from a tower's inventory onto a valid path tile, then store or transfer it as your defense changes. Every five waves banks one free Barricade charge, up to three. Tanks add stone to the battlefield when defeated.

## Huts

Guarded huts bring optional objectives and valuable rewards to the expanding map. Two guardians defend each camp and retaliate when a tower attacks. Defeat the guardians for gold, then destroy the hut for a larger reward and building materials. Camps can recruit fresh guardians when the nearby lane is clear.

## Lives

Start with 100 lives. Extra lives are available in the Shop, with costs that rise after each purchase.

An enemy costs a life when its full body crosses the checkered finish line. Escaped enemies remain on the map as live targets across waves, and defeating them earns a gold and XP cleanup reward. During breaks between waves, wandering enemies may hunt nearby towers.

## Settings

Video (graphics quality: Low / High, trading off shadows and particle-heavy effects for
performance), Audio (mute), Game (18+ gore toggle, save/load), and About (in-app README
viewer/downloader, plus **Download Debug Log** — one text file with live performance stats, full
game/settings state, audio engine status, entity pool counts, and browser/device info, for
attaching to a bug report).

## Save / Load

Settings → Game → **Save Game** downloads a `.txt` file with a random seed and your full game state. **Load Save** restores that campaign on this device or another.

## Tech stack

- **HTML5 Canvas 2D** draws stickmen, weapons, enemies, particles, and decals procedurally.
- **Vanilla JavaScript** powers the game and its interface.
- **Web Audio API** synthesizes sound effects.
- The game lives in `index.html`, with `CHANGELOG.md` alongside it for in-game release notes.

## Project structure

```
StickTD/
├── index.html      # game markup, styles, and logic
├── AGENTS.md        # workflow rules for AI agents/contributors making changes
├── CHANGELOG.md      # full version history, newest first — the single source of truth; the in-game "what's new" dialog fetches this file directly
├── BACKLOG.md        # ideas and planned features not yet built
├── LICENSE            # MIT
└── README.md          # this file
```

## Code map

Direct links into `index.html` on GitHub, jumping straight to where each system actually lives.
Use the section headers around each destination to navigate when line references shift.

**Wave, XP and performance systems** — search for these names:
- `buildWavePlan()` / `validateWavePlan()` / `SIZE_TIER_BANDS` — seeded wave construction, size
  tiers, boot-time validation of waves 1–120.
- `advanceWaveDispatch()` / `currentBatchReleased()` — phase-strict, batch-overlapping dispatch.
- `Enemy.applySizeTier()` / `Enemy.packedSpeed()` / `Enemy.recordContribution()` — size stats,
  tier speed ceiling, damage ledger.
- `awardKillExperience()` / `creditKill()` / `distributeSharedXp()` / `gainTowerExp()` — XP.
- `Tower.upgrade()` / `promotionCostFor()` / `promotionCapacity()` / `Tower.targetScore()` — promotion and targeting.
- `STAT_EFFECT_CAP` / `STAT_TOTAL_CAP` / `refreshProgressionMilestones()` / `progressionMilestoneNote()` — stat caps, naming at 500, mastery at 1,000, XP-to-gold.
- `MIXED_ELEMENT_RULES` / `refreshElementState()` / `applyAttunementStatus()` / `ELEMENT_VISUALS` — element mixes, on-hit status and the elemental projectile/swing visuals.
- `dpsBreakdownText()` / `maybeShowUpdateNotice()` — the tap-to-explain DPS panel and the what's-new dialog.
- `drawDebugOverlay()` / `panCameraToTower()` / `Tower.drawBloodLustAura()` — debug mode, killstreak pan and aura.
- `sweepSettledDecals()` / `isDecalBakeEligible()` / `blitWorldLayer()` — gore baking and
  viewport-cropped world layers.
- `buildEnemyHash()` / `spatialCellKey()` / `queryNearby()` — integer-keyed spatial hash.
- `applyPanInertia()` / `requestPausedRender()` — camera glide and paused-render coalescing.

**Major sections**
- [Config (tunables, tower/enemy stat tables)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L700)
- [Map / path generation](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1212)
- [Scenery (trees/rocks)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1434)
- [`CONFIG.FLORA` / `spawnFlora()` — sparse cosmetic ground-cover accents, baked into the static map layer](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1533)
- [`scheduleLeafGust()` / `updateAndDrawBlowingLeaves()` — one ambient gust of leaves drifting across the screen, 20-60s into a game](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6515)
- [`ATTUNEMENTS` / `SPECIALIZATIONS` — the two-stage elemental attunement (100, permanent lock) + specialization (500) tables](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1206)
- [`checkAttunementAndSpecialization()` — the runtime check for the above, called from `checkEvolution()` for the 3 base classes only](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5214)
- [`unlockedTowerTypes` / `unlockTowerTypeBuild()` — unlocks tower types for direct Build-menu purchase](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1363)
- [Audio synthesis (`SoundEngine`)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2015)
- [Game state / save-load](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2046)
- [Camera (zoom + pan)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2380)
- [Entity classes (Enemy, Tower, Projectile)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2500)
- [Stickman rendering](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5139)
- [Spatial hash](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5699)
- [Waves](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5888)
- [Main loop (fixed timestep)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6095)
- [Canvas / input setup](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6321)
- [UI wiring](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6593)
- [Start / end screens](https://github.com/SauerNinja/StickTD/blob/main/index.html#L7338)
- [Boot](https://github.com/SauerNinja/StickTD/blob/main/index.html#L7424)

**Core gameplay systems**
- [`CONFIG.TOWERS` (per-tower stats/tiers)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L932)
- [`CONFIG.ENEMIES` (per-enemy stats)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1069)
- [`SPLIT_CHILD_TYPE` — which fragment type a splitting enemy leaves behind (Splitter→Splitmini, Boulder→Rocklet)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L896)
- [`updateBarricadesAndPileup()` — barricade contact, enemy queueing](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1493)
- [`computeFinishLine()` — shared geometry for the finish-line carpet and full-body crossing check; `reachEnd()`/`updateEscaped()` — escaped enemies remain active targets](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2681)
- [`class Enemy`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2502)
- [`class Tower`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L3342)
- [`class Projectile`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L4249) — includes `pointSegmentDist2()`, the swept-collision check that stops fast projectiles (Mage especially) tunneling through moving targets
- [`class CatCompanion`/`drawCat()`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L8111) — Cat Snapper's pooled temporary companion (follows its target's current x/y, never the path itself) and the shared procedural cat renderer both the companion and Cat Snapper's own idle pose use
- [`class SkeletonMinion`/`raiseSkeletonsForTower()`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L8195) — Necromancer's pooled round-scoped minions (raised in `startNextWave()`, destroyed on wave-complete), and `drawSkeleton()` just below it
- [`findTarget()` — per-tower targeting, including Mage's wide hysteresis margin to avoid mid-charge target snapping](https://github.com/SauerNinja/StickTD/blob/main/index.html#L3342)
- [`drawStickman()` — procedural tower/weapon rendering](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5221)
- [`checkStallWatchdog()` — anti-bunching failsafe](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5717)
- [`resolveSweptEnemyCollisions()` / `resolveEnemyCollisions()`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5756)
- [`generateProceduralWave()` and its 9 named flavor generators (Swarm/Elite/Undead/Ambush/BossRush/Vanguard/Trick/Grind/Standard)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6765)
- [`validateGameDefinitions()` — boot-time cross-reference check across every data-driven config table](https://github.com/SauerNinja/StickTD/blob/main/index.html#L1323)
- [`update(dt)` — the actual per-frame simulation tick](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6100)
- [`render(ctx)` — the actual per-frame draw call](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6225)
- [`updateHUD()`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L6610)
- [`fitHudTopToOneLine()` — scales the top bar to fit narrow screens](https://github.com/SauerNinja/StickTD/blob/main/index.html#L7181)
- [`updateInspectPanel()`](https://github.com/SauerNinja/StickTD/blob/main/index.html#L7090)

**Blood & gore system** (see [Blood & gore](#blood--gore) above for the player-facing description)
- [`getBloodProfile()` / `rollBloodProfile()` — per-species base palette + per-instance color jitter](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5010)
- [`bloodTintForFire()` — sooty/darkened tint for wounds taken while burning](https://github.com/SauerNinja/StickTD/blob/main/index.html#L4995)
- [`resolveGoreArchetype()` / `resolveWeaponSubtype()` — which forensic taxonomy branch a hit uses](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5084)
- [`spawnDecal()` — the main ground-pool particle system, archetype-specific shape/size table lives here](https://github.com/SauerNinja/StickTD/blob/main/index.html#L4559)
- [`spawnCastOffArc()` / `spawnBloodCastoff()` — directional cast-off streaks (Blade's swing arc, Mage's radiating cone)](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5217)
- [`towerSwingDir()` — per-tower swing handedness for consistent cast-off arcs](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5241)
- [`spawnSwingArcGuide()` — the "air line": a brief visible trace of the blade's actual swept path, geometrically identical to the angle driving the real cast-off blood](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5757)
- [`spawnSatelliteDrops()` — secondary scattered droplets, distance-scaled elongation](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5335)
- [`spawnShockring()` — Blunt's partial-arc impact ring, biased away from the attacker](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5693)
- [`spawnPunctureMark()` — Archer's dark, understated entry-wound mark](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5304)
- [`spawnExpiratedMist()` — air-diluted pale mist + bubble specks, an occasional death-time flourish independent of weapon type](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5781)
- [`spawnBoneDebris()` / `spawnSkullDrop()` / `spawnWormFromSkull()` — skeletal remains and worms that emerge from skulls](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5936)
- [`updateWalkingBlood()` — footprints (swipe) and pool disturbance (wipe), both distinct BPA mechanisms](https://github.com/SauerNinja/StickTD/blob/main/index.html#L5383)
- [`playImpactSound()` — per-archetype impact audio, scaled by the same hit-power roll driving the visuals](https://github.com/SauerNinja/StickTD/blob/main/index.html#L2196)

## Running locally

Run the game with a static file server:

1. Clone or download the repo — keep `index.html` and `CHANGELOG.md` together, same folder.
2. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Serving the folder over HTTP(S) also enables the in-game update panel to load `CHANGELOG.md` alongside the game.

## Contributing

See [AGENTS.md](AGENTS.md) for project conventions, verification steps, and contributor guidance. Review the current game and source files before changing project behavior; record shipped changes in [CHANGELOG.md](CHANGELOG.md).

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full version history, and [BACKLOG.md](BACKLOG.md) for
ideas not yet built.

## License

MIT — see [LICENSE](LICENSE).

Based on thoughts by Setvin Noether ([@SauerNinja](https://github.com/SauerNinja)).

Suggested citation: Setvin Noether, *Stick Tower Defense* (StickTD), https://sauerninja.github.io/StickTD/
