<div align="center">

# StickTD

Stick Tower Defense

[**Play**](https://sauerninja.github.io/StickTD/) · [**Download**](https://github.com/SauerNinja/StickTD/releases/latest)

<img src="og-image.png" alt="StickTD gameplay" width="100%">

</div>

A small band of stick-figure defenders. One winding road. Whatever comes down it.

Raise a squad from humble beginnings, send it out to meet every wave, and watch your fighters become something worth remembering. Every battle sharpens a defender, every drop opens a new option, and the road keeps growing long after you think you have seen it all.

## Features

| | |
|---|---|
| **A band worth building**<br>Swordsmen, archers, mages and a long roster of specialists, each with a job of their own. | **Fighters who grow**<br>Every battle shapes who a defender becomes. Train their strengths and unlock new classes along the way. |
| **Fire, lightning and ice**<br>Attune a fighter to an element, or blend two into something rarer. | **A road that grows**<br>The map keeps unfolding, so the line you hold is never quite the same twice. |
| **Loot and the unexpected**<br>Gear, food, treasure and passing travelers reward players who pay attention. | **Waves that escalate**<br>Small scouts give way to heavy hitters, with a boss to close out each chapter. |

## How to play

Open **Build**, choose a defender and place it on the grass beside the road. Press a placed defender to see its stats, spend its training points, move it, give it gear or change which enemy it targets. When the squad is ready, press **Start Wave**.

The map begins as a small patch with a short road, and a lone barricade stands watch on the finish tile when the first wave rolls in. Expanding the map lengthens both ends of the road and opens new ground to build on. Enemies walk from the spawn flags to the finish. One that gets through stays on the map and goes looking for your defenders, so clear it before the next wave. The run ends when every life is lost or every defender is down at once.

Every defender has its own free moves for changing position. It earns more by rising in rank, by finishing off a boss and by carrying Running Shoes.

## Defenders

Every defender starts as a basic class and grows into others by training.

| Branch | Classes |
|---|---|
| **Melee** | Swordsman, Axeman, Spearman, Hammerman, Paladin, Berserker, Lancer |
| **Ranged** | Archer, Marksman, Sniper, Blowdart, Blow Gunner, Dual Squirt Gun, Gatling, Crazy Chef |
| **Magic and support** | Mage, Snap Caster, Cleric, Pope, Necromancer |
| **Explosives and guns** | Bomber, Cowboy, Glaive |
| **Special** | Ninja, Cat Snapper, Merchant, Hacker |
| **Structures** | Barricade, Log Mill, Stone Quarry, Vault |

Defenders earn experience from the enemies they help defeat. Experience becomes points in Strength, Dexterity and Intelligence. Training a stat far enough attunes a fighter to an element and, further on, unlocks a new class in the Build list. A defender that fills every item slot becomes a Hero, and a fully trained one earns a trophy.

## Elements

Strength is fire, Dexterity is lightning and Intelligence is ice. Every attack from an attuned fighter carries its element. Training two stats blends an advanced element:

- **Proton**: fire and lightning
- **Dark Matter**: fire and ice
- **Quasar**: lightning and ice

Elements belong to the fighters who earn them. They are never bought from the Build menu.

## Enemies and waves

- The campaign runs for 100 waves, then carries on as an endless expedition.
- Each wave marches in size order: the smallest enemies first, then larger ones, with the heaviest enemies and a boss closing each chapter.
- Bigger enemies are slower, tougher and worth more experience.
- New enemy families arrive one chapter at a time.
- Some enemies break away from the road to fight a defender on their own.
- A longer road draws larger groups.
- From the eighth wave, some enemies arrive as elites standing on a coloured patch: blue ones are swift, gold ones are tough and red ones hit hard. Elites are worth double gold.
- Calling the next wave soon after clearing one pays bonus gold, shown on the Next Wave button while it lasts.

## Resources and structures

- **Gold** comes from defeated enemies and cleared waves. It pays for defenders, promotions and new ground.
- **Wood and stone** come from clearing trees and rocks, from chests, and from the Log Mill and Stone Quarry, which keep producing between waves.
- **Barricades** stand on the road and hold back everything that reaches them.
- **The Vault** stores items the squad is not using.
- **Campfires** are built on open grass and cook meals from the food you collect.
- **Expand** buys more ground to build on.

In the Build list, a defender you have not unlocked yet shows as a dark silhouette, and one you cannot yet afford shows its cost in red.

## Items, food and the Shop

Defeated enemies, chests and presents leave gear and food beside the road. Drag gear onto a defender to equip it; food is eaten on the spot and raises a stat. Defenders start with empty packs, and the Shop sells gear, supplies and upgrades that help every defender you own. Now and then a merchant caravan crosses the map with goods to trade. Rare finds such as a Merchant's Bell, a Circus Ticket or Troll Bait call a visitor to the road when used.

While placing a defender, a moving black-and-white outline suggests the spot that covers the most road, and each stat button shows what the next point will change.

## Life beside the road

The world changes as the road grows longer, from green meadow into cool pinewood and sandy dunes. Farm animals wander in and raise their young, bees bring honey, a circus may set up camp, and the occasional troll strolls the road looking for trouble.

Blood shows the story of each hit. A blade leaves a curved fan of cast-off, a hammer a broad spatter, an arrow a narrow streak, and a sniper a fine mist. Wounded enemies leave trails, and anything caught in a spray takes the stain and leaves a gap behind it. Blood and gore can be turned off in Settings.

## Settings

- **Video**: graphics quality, including a Performance mode with lighter effects, and automatic render resolution.
- **Audio**: music and sound effects, with separate volume controls.
- **Game**: blood and gore, saving and loading, first-time tips and reset options.
- **Items, Medals and Stats**: an item guide, earned medals and run records.
- **About and Changes**: a description of the game and the latest release notes.

## Your pace, your way

Set the speed, choose your moment, and play on a phone or a computer with touch or mouse. Space pauses and resumes, and the game pauses by itself when the tab is hidden. Save a run to a file and pick it up whenever you like.

## Get the game

Play instantly in a browser, or install a build for Windows, macOS, Linux (Intel/AMD or ARM) or Android from the [Releases](https://github.com/SauerNinja/StickTD/releases/latest) page. Every download is published with checksums and a build attestation, so you can confirm exactly what you are running.

On iPhone or iPad, open the game in Safari, tap Share, then Add to Home Screen. It gets its own icon and fills the screen like an app.

## Run it locally

Serve the folder with any static server and open `index.html`, for example `python3 -m http.server`, then visit `http://localhost:8000`. Opening the file directly also works in most browsers.

## Project layout

| Path | Purpose |
|---|---|
| `index.html` | Page shell, styles and interface |
| `js/audio.js` | Sound engine, sound effects and music |
| `js/config.js` | Settings, balance numbers, game state, medals, saves and the camera |
| `js/effects.js` | Blood, decals, particles and gibs |
| `js/loop.js` | Main loop, collisions, rendering and the attract screen |
| `js/ui.js` | Input, HUD, menus, the Shop and the inspect panel |
| `js/diagnostics.js` | Debug log and the design contract |
| `js/screens.js` | Start and end screens |
| `js/environment.js` | Map, road growth, biomes, scenery and items |
| `js/towers.js` | The stickmen, who are the towers: classes, figures, weapons, targeting, projectiles and combat |
| `js/waves.js` | Enemies, wave plans, random events and livestock |
| `CHANGELOG.md` | Current-version release notes; older entries in `HISTORY.md` |
| `AGENTS.md` | Project rules and the rule-ID ledger |
| `BACKLOG.md` | Open ideas and planned work |

## Made with

HTML5 Canvas, plain JavaScript and the Web Audio API. Every picture is drawn by code and every sound and piece of music is synthesized in the browser. The game is plain scripts with no libraries, no build step and no image or audio files.

<sub>Coding assisted by Claude (Anthropic). Design is human.</sub>

## License

MIT. See [LICENSE](LICENSE).
