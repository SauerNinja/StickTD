<div align="center">

# StickTD

Stick Tower Defense

[**Play**](https://sauerninja.github.io/StickTD/)

<img src="og-image.png" alt="StickTD gameplay" width="100%">

</div>

A tower defense game about a small band of stick-figure defenders and the road they hold.

Place your fighters, watch them grow stronger with every battle, and see how far the line can go.

## Features

| | |
|---|---|
| **A band of defenders**<br>Choose who stands where and give each fighter a role. | **Growth**<br>Fighters gain strength in battle and unlock new classes. |
| **Elements**<br>Fire, ice and lightning, on their own or combined. | **A growing road**<br>Each wave opens new ground to build on. |
| **Waves**<br>Enemies arrive in greater numbers, with bosses along the way. | **Your pace**<br>Run the game as fast or as slow as suits you. |

## How to play

Open **Build**, choose a defender, then tap a green tile to place it. Tap a placed defender to see its stats, spend training points, upgrade, sell, move, equip it from the **Shop**, or change who it targets. When you are ready, press **Start Wave**.

The map begins as a tiny patch with a short road. Each wave opens new ground and lengthens the road, so there is always more to build on. Enemies walk the road from the spawn flags to the finish. Lose all your lives and the run ends.

Every defender has its own free moves for relocating on the map. A defender gains one on each promotion and each boss it kills, and a pair of Running Shoes gives one every round. Paid map expansion is available at any time, once per wave. A wave earns a free expansion only if no escaped enemies remain when it ends; otherwise that bonus is lost.

Blood is part of the fight. Each hit throws droplets that fly and land the way real spatter does, shaped by the weapon: a mist from a sniper, a radial spatter from a hammer, a cast-off fan from a blade, a spray from an arrow's entry and exit wounds. A wounded enemy leaves a trail of drops you can follow, and a body, tree or rock caught in a spray blocks it, leaving a clean void in the pattern and a stain on itself. Body stains follow the moving pose and use the same drying colors as ground blood.

Pin an enemy to see its health, combat stats, rewards and current effects. Tiny Grunts in existing batches have one health point and an extra 15% chance to evade attacks, including melee.

Farm babies grow over seven completed rounds. A chicken starts as an egg kept on grass for three rounds, then spends three rounds as a chick.

The game is played on a phone or a computer, with touch or mouse. Space pauses and resumes. Speed buttons run the game faster or slower, and the game pauses by itself when the tab is hidden.

## Defenders

Every defender starts as a basic class and grows into others by training.

| Branch | Classes |
|---|---|
| **Melee** | Swordsman, Axeman, Spearman, Hammerman, Paladin, Berserker, Lancer |
| **Ranged** | Archer, Marksman, Sniper, Blowdart, Blow Gunner, Dual Squirt Gun, Gatling, Crazy Chef |
| **Magic and support** | Mage, Snap Caster, Cleric, Pope, Necromancer |
| **Explosives and guns** | Bomber, Cowboy, Glaive |
| **Special** | Ninja, Cat Snapper, Merchant, Hacker |
| **Structures** | Barricade, Log Mill, Stone Quarry |

Defenders earn experience from the enemies they finish off. Experience turns into stat points: Strength, Dexterity and Intelligence. Training a stat far enough attunes a fighter to an element and, further on, unlocks a new class. Fully trained fighters earn a trophy.

A defender that fills all of its item slots with equipment becomes a Hero.

## Elements

Strength is fire, Dexterity is lightning and Intelligence is ice. Every attack from an attuned fighter carries its element. Training two stats mixes an advanced element:

- **Proton**: fire and lightning
- **Dark Matter**: fire and ice
- **Quasar**: lightning and ice

Advanced elements are not towers. They are earned by any fighter who trains the right two stats.

## Enemies and waves

- The campaign is 100 waves. After it ends the game continues as an endless expedition.
- Each wave marches in size order: the smallest enemies first, then larger ones. Large enemies and bosses come at the end of every fifth wave.
- Bigger enemies are slower, tougher and worth more experience.
- New enemy families arrive in chapters of five waves.
- Some enemies break away from the road to fight a defender on their own.
- A longer road brings more enemies and larger groups.

## Resources and structures

- **Gold** comes from kills and cleared waves. It pays for defenders, upgrades and map expansions.
- **Wood and stone** come from clearing trees and rocks, and from chests found on the map. They pay for Barricades, Log Mills, Stone Quarries and the best equipment.
- **Barricades** block the road. Nothing walks past a standing one.
- **Log Mills and Stone Quarries** deliver wood and stone on their own, even between waves.
- **Expand** buys more ground to build on.

In the Build list, a defender you have not unlocked yet shows as a dark silhouette. A defender you can unlock but cannot yet afford shows its cost in red.

## Items and the Shop

Transferable equipment grants larger bonuses by rarity: 10–20 points per supported stat for Common gear, 25–40 Uncommon, 45–60 Rare, 65–80 Epic and 85–100 Legendary. Food and consumable bonuses retain their existing values. Each defender begins with a free item for its class. The Shop sells better gear for each class and upgrades that help every defender you own.

## Settings

- **Video**: graphics quality and automatic render resolution.
- **Audio**: music and sound effects, with separate volume controls.
- **Game**: blood and gore on or off, a separate splatter-droplet toggle, and saving and loading.
- **About**: this description of the game.

## Saving

A run is saved to a file you download and load again later. Nothing is stored on a server.

Release 1.7.167 gives each starting path orientation and grass side an independent 50% chance and places two harvestable wasteland stumps within the opening view.

## Made with

HTML5 Canvas, plain JavaScript and the Web Audio API. Every picture is drawn by code and every sound and piece of music is synthesized in the browser. The whole game is one `index.html` with no libraries, no build step and no image or audio files.

## License

MIT. See [LICENSE](LICENSE).

Wasteland branches gather instantly for 5–10 wood, free of gold cost.

### 1.7.162 — stat explanations
Hover over combat stats to read their meanings, including defense, damage, critical hits, attack interval and range. Luck and its clover percentage are removed.

### 1.7.163
Potted plants collect instantly and yield 2–3 berries. Swordsman blood arcs remain visible outside the victim on landed hits, including killing blows, independently of airborne-droplet settings.

### 1.7.167
Enemies move40% more slowly on the opening title screen. Gameplay movement and speed controls keep their existing behavior.

### 1.7.166
Each attacking class now has its own weapon-specific blood profile and restrained ground-impact pattern. Blades, thrusts, crushing blows, projectiles, claws and fictional spell effects keep distinct shapes and directions, including with optional droplets disabled. Prior breeding, sizing, fixed-puddle and 60–90-second fading fixes remain.

### 1.7.165
Blood marks fade away over 60–90 seconds, with restrained elliptical spatter and smaller, less glossy pools. Optional droplets keep their separate budget. Babies require two mature parents; hearts identify a pair due next round, and both parents rest for three rounds after birth. Baskets are larger and presents smaller, including in existing saves.

