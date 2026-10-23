# Changelog

Current minor-version family only. Older entries: [HISTORY.md](HISTORY.md). Versions use major.minor.patch; archive the previous family when minor changes.

Entry rules: every entry names the functions, rule IDs, constants and files it changed; cites the commit SHA or version where a behavior was introduced or last worked (`git show <sha> -- index.html`) whenever that history explains the change; and says why. One bullet per change. Entries are never edited after their release ships, and release notes list every entry since the previous published release automatically.

## [1.8.103] — 2026-10-23 (UTC)

- Plurals (PLURAL-01): new `countLabel(count, singular, plural)` in js/config.js is used for the counts that read wrong at 1: the end-of-run summary ("1 kill", `describeRunEnd`), the inspect-panel downed suffix ("DOWNED · 1 round", `updateInspectPanelNow`), the attunement countdown ("1 point until Fire Attunement") and the downed label over a stickman (`Tower.draw`, replacing last round's one-off check).

## [1.8.102] — 2026-10-23 (UTC)

- Hack menu rows on a phone (HACK-ROWS-EVEN-01, `openHackMenu` in js/ui.js and index.html CSS): at 390 px the four gold grants wrapped 3 and 1, and the Stickmen and Summon rows 2 and 1. Gold grants now sit four across, or two by two below 560 px, and the long-label rows (Stickmen, Field, Summon) stack one per line on a phone. Measured buttons per line at 390 px: Gold 2+2, Wood 3, Stone 3, Stickmen 1+1+1, Field 1+1, Summon 1+1+1, Rules 2.
- A downed stickman with one round to go read "1 rounds left"; `Tower.draw` now says "1 round left".

## [1.8.101] — 2026-10-23 (UTC)

- Cookie notice (CONSENT-OK-01, index.html, js/ui.js, js/screens.js): the Santa bar now says only "Ho, ho, ho! Santa needs your cookies to remember if you're naughty or nice." and has a single "🍪 OK" button (`grantStickTDAnalyticsConsent`). The "🥷 Play Stealth" decline button left the bar; Stealth mode is now a Settings → Game checkbox ("🥷 Stealth mode — play without analytics cookies"), which calls `declineStickTDAnalyticsConsent` when checked and grants again when cleared, and still brings the Stealth Santa on wave 10. The end of a stealth run no longer reopens the bar to ask for cookies. Analytics remain fully blocked until OK is pressed. The Ninja blurb, AGENTS.md and both consent design-contract checks follow the new flow; the unused `openStickTDAnalyticsChoice`, `afterStealthConsentChoice` hook and "Review Analytics Choice" button were removed.
- Music (js/audio.js), adding to the current direction rather than changing it:
  - MUSIC-VARIATION-02: the wave theme no longer repeats note for note. On odd cycles its weak eighth notes become stepwise upper neighbour tones in key (`musicUpperNeighbour`), and every third cycle lifts the last phrase bar of the final section an octave as a climax.
  - MUSIC-COUNTERLINE-01: in the final section of even cycles a slow counter-melody in the warm voice holds a chord tone per bar (third, then fifth) under the lead.
  - All four cycle variants were scheduled step by step in Chromium without errors; how they sound still needs a listen.

## [1.8.100] — 2026-10-23 (UTC)

- Swordsman blade jitter (AIM-STEADY-01, js/towers.js). Two causes:
  - `Tower.findTarget` picked the nearest of the enemies attacking the stickman afresh every tick, with no hysteresis, so a crowd jostling around it flipped the aim between attackers. It now keeps the current target while that target is still attacking it, alive and in range.
  - At 5x and 10x (`isFastForwardSimplified`) a whole swing lasts a frame or two of real time, and the drawn blade bypassed its pose smoothing during swings, so it flashed through its arc several times a second. At those speeds the blade now eases toward the swing's aim (`baseAngle`) through the normal 75 ms pose smoothing; at 1x–3x the full swing arc is unchanged.
  - Measured on a Swordsman with eight attackers over 180 frames: at 10x, frames where the drawn blade jumped more than 35° fell from 34 to 0 and the average per-frame turn from 19.2° to 0.3°; at 1x, 13 to 11 (the rest are real swings).
- Hit flinch (HIT-FLINCH-01, inspired by the per-unit hit reactions in spinner323's Unity remake): a stickman struck by an enemy rocks back up to 3.5 px away from the blow and settles over 180 ms of real time (`HIT_FLINCH_MS`, `HIT_FLINCH_PX`), drawn only, never moving the stickman, and off under reduced motion.

## [1.8.99] — 2026-10-23 (UTC)

- Escaped enemies roam everywhere off the road (LOOSE-ROAM-01, supersedes LOOSE-PERIMETER-01): `pickLooseRoamGoal` (js/environment.js) picks goals on any open, non-road, non-scenery tile of the map, preferring ground ahead, instead of only rim tiles; `moveAroundScenery` takes an `avoidRoad` flag so a roamer that has left the road treats road tiles like rocks and never walks back up it against the wave; `looseSeparationHeading` now steers clear of every enemy, escaped or still marching, not just other escaped ones. The unused `pickLoosePerimeterGoal` and `isLoosePerimeterTile` were removed and both design-contract checks now test the new rule.
- Ant footsteps (ANT-SKITTER-01): Swarm ants played the generic low thud (`footstep`, 30 ms lowpass noise) on every short stride, a dull drumming in a big swarm. They now play `skitter`, a quiet two-tick patter of 5–6 ms high bandpass noise with random pitch, at most every 0.11 s (`SKITTER_MIN_GAP_S`); other enemies keep their footsteps.
- Tank experience (TANK-XP-01): a stickman gains 1 XP for every 10 damage it takes (`TANK_DAMAGE_PER_XP`, banked between hits in `Tower.takeDamage`), so the stickman holding the line levels too. The Hacker and structures earn none.
- Early balance after wave 2 overran a three-stickman squad (lives 100 to 58 in the supplied screenshots, 15 escaped, two stickmen downed):
  - TOWER-BUFF-01: the direct-damage share in `Tower.recomputeStats` (COMBAT-BALANCE-181) rises from 0.7 to 0.8 (`DIRECT_DAMAGE_SHARE`), about 14% more damage for every stickman and every class, so the ARCHETYPE-BALANCE-01 order is kept: level 1 after misses is now Swordsman 7.4, Mage 6.8, Archer 5.8 damage per second.
  - EARLY-RAMP-01: the enemy count multiplier ramps 1.5, 1.15, 1.3, 1.4 over waves 1–4 (`EARLY_COUNT_RAMP`) before the usual 1.5, so wave 2 sends 28 enemies instead of 36 (wave 1 stays 15, wave 3 is 52, wave 5 unchanged at 107). Enemy health and damage are untouched.
  - Escaped enemies, which hunt stickmen and caused the downings, now swing every 1.2 s instead of 0.8 s (`LOOSE_MELEE_INTERVAL_MS`), still faster than a breakaway.
- Blood history audit: every spawn, draw, stamp, bake and paint function for blood, spatter, drips, streaks, cast-off, mist, spray, gibs, shock rings, pools, wounds, stains and footprints defined anywhere in the repository's 134 commits was compared with the current code. All are present except `drawDebrisDecals`, which 1.1.56 (commit bfda3de) deliberately folded into the depth-sorted layer. The high-impact streaks are `spawnBloodCastoff` (8 call sites, including the Mage's three weight-scaled streaks per hit and the death fan), `spawnBloodStream` (6), `spawnCastOffTrail` and `spawnSwordsmanBloodArc` (blade arcs), `spawnDripTrail` (11) and `spawnShockring` (7).

## [1.8.98] — 2026-10-23 (UTC)

- First-time item notices (ITEM-KIND-NOTICE-01, `explainItemKindOnce` in js/environment.js): the first time fruit, vegetables and meat each appear in a player's game, and the first time each medicine, stim and tonic appears (Adrenaline Shot, Combat Stim, Spotter Scope, Field Medkit, Hyper-Serum, Nano-Tonic, Espresso Elixir, Bounty Chip, Bandage, First Aid Kit, Defibrillator), a toast names it and its notification explains exactly what it does and how to use it. The numbers come from the live constants (`FOOD_STAT_GAIN_MIN/MAX`, `FOOD_XP_MIN/MAX`, each stim's `effects`, each tonic's `amount`, `DEFIBRILLATOR_REVIVE_LIVES_FRACTION`). Called from `spawnGroundItem` (not while a save is restoring), `Tower.receiveItem` and `buyMedicalItem`; each notice is remembered per browser with the other first-time tips (`seenTutorialTips`). New consumables get their notice automatically through the same function.
- Ground-animal motion (LIVESTOCK-SMOOTH-01, `updateLivestockWander` and `steerAroundEnemies` in js/waves.js): pigs, cows, chickens and the other animals snapped to each new direction, stopped dead and were re-bent every frame by the enemy-avoidance steer, which made the pig bounce around near the wave. `vx`/`vy` is now only where an animal wants to go; its real motion (`moveVx`/`moveVy`) eases toward that (plus a freshly computed avoidance bend) over about a quarter second (`LIVESTOCK_MOTION_EASE_MS` 260), it slows to a stop instead of halting, and it only turns to face left or right past `LIVESTOCK_FACE_FLIP_PX_S`. Measured on a pig over 600 frames: the largest frame-to-frame change in motion fell from 2.22 to 0.17 px.
- The 1.8.97 entry now credits GitHub user spinner323, whose Unity remake inspired the boss stun resistance and the Fire and Ice enemy resistances.

## [1.8.97] — 2026-10-23 (UTC)

- Archetype balance (ARCHETYPE-BALANCE-01, requested order: Archer most accurate, lightest damage, medium range; Mage longest range, least accurate, medium damage; melee most damage, medium accuracy, shortest range). Measured in game before the change: damage after misses at promotion level 1 was Archer 4.7, Mage 4.3, Swordsman 3.4, and at level 3 Mage 22.6 against Archer 8.4 and Swordsman 13.1, so melee was weakest early and the Mage dominated later. Changes: `BASE_MISS_CHANCE_BY_ARCHETYPE` (js/config.js) ARCHER 0.34→0.28, WARRIOR 0.36, MAGE 0.38→0.44; Swordsman tier 1 cooldown 1700→840 (js/towers.js; tier 1 was more than twice as slow as tier 2); Mage tier damage 128/346/1051→197/293/384. After, levels 1/2/3 read Swordsman 6.9/9.2/13.1, Mage 5.9/8.0/10.6, Archer 5.1/7.0/9.2 damage per second after misses, ranges unchanged (Mage 180–220, Archer 140–200, Swordsman 90–125). Bleed, the Mage's splash and slow and the Swordsman's cone sit on top. The Archer blurb ("Arrows land hard") and the Help class lines now describe these roles.
- From a review of the community Unity remake by GitHub user spinner323 (github.com/spinner323/StickTD, branch codex/unity-enhanced-build), credited with the idea for both rules below: StickTD already has its enemy roster, targeting modes, healer, splitter and between-wave healing; two of its rules were worth bringing back. BOSS-STUN-RESIST-01: Boss, Santa and Reaper keep 35% of every stun and freeze (`applyStun`, `applyFreeze`, `STUN_RESISTANT_TYPES`), so stun-on-hit classes slow a boss without pinning it. ELEMENTAL-ENEMY-RESIST-01: Fire enemies never burn (`applyBurn`) and Ice enemies keep at most a 15% slow (`ICE_ENEMY_MIN_SLOW_MULT`) and 35% of a freeze, giving the Fire and Ice families a counterplay identity; their `ENEMY_INFO` descriptions say so.

## [1.8.96] — 2026-10-23 (UTC)

- Bee flight (BEE-GLIDE-01, `Enemy.updateBeeFlight` in js/waves.js, constants and `beeCanFlyAt` in js/environment.js): bees used the ground-animal wander in `updateLivestockWander`, so they stopped and started in walk/idle bursts, snapped to a new direction at every edge check and were nudged frame to frame by `steerAroundEnemies` while crossing the road among the wave, which read as jerking. A bee now flies on a heading that turns toward a slowly changing goal at most `BEE_TURN_RATE` (1.6 rad/s), with a gentle ±25% speed swell, never stops, flies over road, rocks and trees anywhere inside the open map and curves back toward its middle near the edge. Facing flips only past 35% of cruise speed sideways, so it no longer flickers left and right. Measured in Chromium over 240 frames: largest heading change 3.1° per movement step, with no stalls. Honey laying is unchanged.

## [1.8.95] — 2026-10-23 (UTC)

- Empty "Close" popup (NOTIFICATION-DETAIL-ONLY-01): pressing a toast such as "First spoils! Drag it onto a stickman." paused the game and opened the notification detail window holding only the generic line "This notification records a game update…" and a Close button. `defaultNotificationExplanation` (js/config.js) no longer returns that filler, and `openNotificationEntry` opens no window for a notice with no real explanation or enemy card. The item explanation now says how items work (drag gear to equip, food to eat, pass between stickmen, store in a Vault) and also matches "spoils"; the gold explanation no longer claims coins pay out on expiry or that bags pay a listed amount.
- Items that were literal elements are now practical gear (ids unchanged, so saves keep them): Ember Core 🔥 is the Oil Lantern 🏮, Frost Shard ❄️ (which also shared the Ice element icon) is Snow Goggles 🥽, and Lightning Bolt 🌩️ is the Battery Pack 🔋. Stats, rarity, drop sources and recipes are unchanged.
- Expansion sound (`expand_build`, js/audio.js; EXPAND-JINGLE-01): after the four hammer hits and the thud, new ground now answers with a short rising G–B–D–G motif and a held chord with a soft shimmer, transposed to the key the music is in (`musicShift`, as the wave-clear fanfare does) and ducking the music for 1.6 s so it reads clearly. Notes and timing live in `EXPAND_JINGLE_NOTES` and `EXPAND_JINGLE_CHORD`.

## [1.8.94] — 2026-10-23 (UTC)

- Suggested build spot (`drawBuildSpotHint`, js/environment.js; BUILD-SPOT-MARCH-01): the static gold dashed square is now black and white dashes that march clockwise around the tile, so it reads as the game's suggestion rather than part of the ground. Two `strokeRect` passes with `lineDashOffset` half a period apart, driven by `presentationTime` (`BUILD_SPOT_DASH_PX` 9, `BUILD_SPOT_MARCH_MS_PER_PX` 25), so game speed never changes how fast it moves; it holds still when the system asks for reduced motion (`PREFERS_REDUCED_MOTION`). AGENTS.md and the README describe the new look.

## [1.8.93] — 2026-10-23 (UTC)

- Weapon sounds (CLASS-SHOT-VOICE-01): five classes borrowed another weapon's shot sound through `RANGED_SHOT_SOUND` (js/towers.js) — the Ninja's stars used the blowdart puff, the Crazy Chef's knives the bow, the Marksman's rifle the Cowboy's revolver, and the Glaive's heavy gun and the Merchant's Money Bag fell through to the bow default. Each now has its own synthesized voice in `SoundEngine.playEvent` (js/audio.js): `shot_star` (thin whistle and a small metal ting), `shot_knife` (spinning-blade whoosh), `shot_rifle` (dry crack, sharper than the revolver), `shot_glaive` (slow low boom with a short room tail) and `shot_coins` (a three-note pinned-pitch jingle). Each has an `AUDIO_EVENT_GAPS` entry so rapid fire never stacks, and all start voices without errors in Chromium. The unused `bow` event was removed.

## [1.8.92] — 2026-10-22 (UTC)

- End screen bug (END-RATE-HIDDEN-01): "⭐ Rate or comment on this page" showed on every platform, GitHub Pages and the desktop and Android builds included, where it has no page and does nothing. `endGame` toggles its `hidden` class correctly, but `.link-btn` sets `display:inline-flex` and the page has no general `.hidden` rule, so the class had no effect. Added `.link-btn.hidden{display:none;}`; a page-wide probe now finds no element with the `hidden` class still displayed, in play or on the end screen.
- End screen spacing: "Copy run seed" touched the bottom of Play Again; the small end buttons now sit 10 px apart, with the debug log set off at 18 px.
- Start screen on phones (START-OPTIONS-REACH-01): the Santa consent bar covered the "⚙️ Options" button until the player answered it. While the bar shows, Options moves to the top-right corner, clear of the wordmark and the Graphics row; it returns to the bottom-right once the bar is gone.

## [1.8.91] — 2026-10-22 (UTC)

- Shop on a 390 px phone (TEXT-FIT-01, SHOP-ONE-LINE-01): item stats, descriptions and section headings wrapped onto two or three lines (Lucky Branch stats, First Aid Kit, Defibrillator, every section divider). New `shrinkTextToOneLine` in js/ui.js shrinks a line until it fits, down to `SHOP_TEXT_MIN_PX` (8 px), and `buildShopGrid` runs it over card names, stat lines, costs and dividers. `addDivider` now puts the section title and its note on two separate lines, and the notes and medical descriptions were shortened so they stay readable at that size ("Heals 50% of lost lives", "Revives you once at 25% lives", "Back at 50% health"). The First Aid percentage now reads `healFraction` instead of a literal 50%. `openShopModal` unhides the window before building the grid so the fitting can measure it.
- Settings: choosing a tab at the edge of the scrolling tab row on a phone scrolls it fully into view.

## [1.8.90] — 2026-10-22 (UTC)

- Phone layout pass at 390x780 (touch, 2x pixels) with every class unlocked and a stickman holding three-digit stats: no Build-menu name or cost, HUD button, stat button or inspect-panel label wraps to a second line or clips.
- The same pass showed the Santa consent bar covering the selected stickman's panel (`#inspect-panel`) until the player answers it, so a new phone player could not see or spend stats. CONSENT-UNDER-MODAL-01 now also hides the bar while the panel is open; it returns unchanged when the stickman is deselected.

## [1.8.89] — 2026-10-22 (UTC)

- Act notices past the campaign (`announceActStart`, `actTitleForWave`, js/config.js): `actNumberForWave` clamps to the tenth act, so from wave 101 every tenth wave posted "Act X — The North Road… A new act begins" again, and the end screen named Act X for Expedition waves. Wave 101 now posts one "🧭 The Expedition" notice, later waves post none, and `actTitleForWave` returns "The Expedition" beyond `CAMPAIGN_WAVE_COUNT` (ACT-ANNOUNCE-01, with a design-contract check). The `act_started` analytics event reports the Expedition as act 11.
- Wave summary notification said "Earned N player Gold"; it now says "Earned N gold", the wording used everywhere else.
- `loadSaveFileText`: a file with no JSON said "Not a valid save file" while a malformed one added "— your current game is untouched"; both now say the latter, which is true in both cases.
- Save round trip verified in Chromium: three stickmen, a mid-wave save at 5x, `serializeGameState` → `loadSaveFileText` → `serializeGameState`. The only differences are the per-save seed label, the expected `waveReplayed` reset (WAVE-SAVE-01) and fields that load as explicit `false`/`null` instead of absent.

## [1.8.88] — 2026-10-21 (UTC)

- Wind was not inert (WIND-REMOVED-01, project rule 7: no wind effect on accuracy anywhere). `windCeilingForWave` started at 0.15 on every page load and only dropped to 0 when a wave started, and `windStrength` then eased down over several seconds, so archers and mages carried up to about 3.75 extra percentage points of miss chance before and early in the first wave (troll and breakaway fights included) through `windMissPenalty` in `Tower.update` and `Projectile` hit rolls. Removed the whole system: `updateWind`, `windMissPenalty` and the wind state in js/config.js, the `updateWind(dt)` call in `update` (js/loop.js), the reset in `startNextWave` (js/waves.js) and the two wind self-tests, replaced by one check that no wind code exists. The flag flutter (`updateFlagWind`) is visual only and stays. AGENTS.md no longer calls the plumbing inert.
- "🍃 Lucky Wave!" toast removed from `startNextWave`: it announced luck on a 2% roll but changed nothing in play. The leaf gust it accompanied still blows.
- Toasts: the map-from-bag toast said "Click"; it now says "Press" like every other touch-and-mouse prompt. "New tower unlocked" says "New class unlocked" (CLASS-UNLOCK-WORDING-01).

## [1.8.87] — 2026-10-21 (UTC)

- Item Guide (`#item-guide-modal`, index.html) checked against the code and rewritten where it was wrong:
  - It said a Gold Bag pays "its listed amount" on click; a bag opens in place or on a stickman and spills coins (ONE-KIND-OF-BAG-01), and coins are collected by sweeping over them.
  - It said every item adds STR, DEX, INT or Armor; rare gear also adds range or a move (`itemStatSummary`), and food is eaten on drop. Meat raises maximum health through Constitution (`FOOD_STAT_BY_KIND.MEAT = 'con'`, `grantFoodConstitution`), not Strength.
  - "All six slots filled is promoted to Hero" now says the six slots must hold gear and that the stickman "becomes" a Hero (`checkHeroStatus` ignores consumables; "promoted" is the Promote button's word).
  - "Bosses always leave something special" now matches the boss table: guaranteed supplies (`BOSS_GUARANTEED_COMMON_ROLLS`) and often a rarer piece.
- Stat button tooltips (`updateInspectPanelNow`, js/ui.js): the Crazy Chef's DEX tooltip claimed DEX raised her direct damage and the STR tooltip did not; the damage note now follows the same rule as `primaryDamageMult` in `Tower.recomputeStats` (CHEF-STRENGTH-01).
- Build menu bug (`appendUnlockableRow` in `buildTowerModal`, js/ui.js): every unlocked class whose blurb lacked the words "Only one" was shown with " Only one can be active." appended, so 18 classes that can be built many times (Hammerman, Axeman, Gatling, Marksman, Cleric, Crazy Chef, Merchant, Glaive and others) told players they were limited to one. The note is now added only for `MAX_ONE_PER_BOARD_TYPES`, and those blurbs already say it. The line has been present since at least 1.8.47 (commit 611b5ba, where it moved into js/ui.js). Verified by rendering the Build menu with every class unlocked: zero rows now carry the stray note.

## [1.8.86] — 2026-10-21 (UTC)

- Medal audit (`MEDAL_DEFS`, js/config.js): every one of the 17 medals has an `awardMedal` call. Flawless Ten ("without losing a single life") tested `lives >= 100` at wave 10, so a run that lost lives and healed back (food, market lives, `loseLife` defibrillator path) could still earn it. A new `livesLostThisRun` counter, raised in `loseLife` after the donut shield, now decides it (FLAWLESS-MEDAL-01). The counter is saved with the run; older saves without it count as flawless only when their saved lives are at least 100.
- Squad wipe (SQUAD-WIPE-01) had two near-duplicate checks with different rules and messages: `checkAllFightersDown` in js/loop.js counted the Hacker as a fighter (so a lone standing Hacker kept a run alive, against the rule) and ended with "Your whole squad was overrun…" / `squad_overrun`, while the downing path in js/towers.js used `squadWipedOut` and "Every stickman was overrun…" / `squad_down`. `checkAllFightersDown` now calls `squadWipedOut` (which also covers a squad sold down to nothing after `everBuiltFighter`), and both paths end through one `endRunOnSquadWipe` in js/environment.js with one message, one analytics reason (`squad_down`) and a wave number of at least 1 instead of "wave 0".

## [1.8.85] — 2026-10-21 (UTC)

- First-time tips checked against the code (`showTutorialTipOnce` calls):
  - `zombies_incoming` (js/waves.js `maybeShowWaveTutorialTip`) told players to train a Mage's INT to 100 for the Cleric; the Cleric unlocks at 500 (`specializationThresholdFor('CLERIC')`). It now reads the threshold and `FAMILY_INTRODUCTION_WAVE.ZOMBIE` instead of hard-coded numbers, and names the Paladin as holy damage too (`applyDamage` `isHoly`).
  - `first_early_call` reads `EARLY_CALL_WINDOW_MS` instead of a literal 20 seconds.
  - `first_troll` said one troll arrives every fifth round; it is guaranteed every fifth round (`GUARANTEED_TROLL_EVERY_N_WAVES`) and can also arrive in between (`TROLL_EVENT_CHANCE_PER_WAVE`).
  - `first_circus` said the circus sends "a new animal" and to watch for clowns; it now says performers are usually animals and sometimes a clown, matching `pickCircusPerformerType`.
- In-game About: "global passive upgrades" now says "passive bonuses", the Shop's own section name.

## [1.8.84] — 2026-10-21 (UTC)

- README.md fact check against the code: "Each defender begins with a free item for its class" was false (`Tower.create` equips nothing; only `buyItem` from the Shop or drops add gear), so it now says defenders start with empty packs. "Lose every life and the run ends" now also names the squad wipe (SQUAD-WIPE-01, `endGame(..., 'lives')` in `loseLife`). Elites from wave 8 at double gold (`maybeMakeElite`), the early-call bonus (EARLY-CALL-01), the 2x2 start (`initRegionAndPath`), Performance mode, Space to pause and the placement hint were confirmed.
- In-game About text (`getReadmeText`, js/ui.js): removed "free" and "in development" (README voice rule); "Tap a placed tower to upgrade" now says promote (CLASS-UNLOCK-WORDING-01); wood and stone now also name barricades, structures and the Log Mill and Stone Quarry; the Settings line lists all eight tabs (Items, Medals, Stats and Changes were missing).

## [1.8.83] — 2026-10-21 (UTC)

- Help text bug, js/ui.js Help body: the Crazy Chef was described as scaling on DEX; `Tower.update` (`damageScalesWithStr`) and its blurb and tip scale it on Strength. The Help sentence now says Strength.
- Unlock wording in code (CLASS-UNLOCK-WORDING-01, NO-EVOLVE-IN-PLACE-01): `EVOLUTIONS` is now `CLASS_STAT_UNLOCKS`, `EVOLVED_TOWER_TYPES` is `UNLOCKED_CLASS_TYPES`, `Tower.checkEvolution` is `Tower.checkClassUnlocks`, and the `evolution` sound event is `class_unlock` (js/audio.js maps, js/config.js, js/environment.js). Comments on the Squirt Gun, Paladin and Gunalinder rows, the Pope mitre and the unlock-message toast no longer say "evolution". AGENTS.md code map updated to the new names.
- `ATTUNEMENT_THRESHOLD` (100) never governed attunement (that is `ELEMENT_INFUSE_THRESHOLD`, 250); it is renamed `CRAZY_CHEF_STR_THRESHOLD`, and the Cleric mitre growth in `drawStickman` reads its own `CLERIC_HAT_INT_START` (100) instead of borrowing it. No behavior changes.
- Unlock audit: every `TOWER_UNLOCK_SOURCE_BY_TARGET` rule was compared with its class blurb (23 classes); all thresholds and sources match, including Blowdart at 250 DEX (`SPECIALIZATION_THRESHOLD_OVERRIDE`) and Sniper from Cowboy or Marksman at 60 INT.

## [1.8.82] — 2026-10-21 (UTC)

- `TOWER_STRATEGY` in js/towers.js: four tips rewritten to plain, accurate sentences without filler. MARKSMAN: "Deep INT investment" replaced with the actual Sniper unlock (60 Intelligence). BLOW_GUNNER, CAT_SNAPPER and NECROMANCER: removed the "not just the one that…", "a genuinely different identity" and "the real question…" phrasing; each now states its unlock, what it does and one placement point.
- Codebase sweep: no duplicate top-level functions or constants across the ten scripts, no function or upper-case constant defined without a use, and no `console.log`, `TODO` or commented-out code outside diagnostics.

## [1.8.81] — 2026-10-21 (UTC)

- index.html CSS: the Santa consent bar (`#consent-banner`, z-index 999) covered the bottom of Settings and other windows on short screens. While any `*-modal` window is open the bar is hidden and returns unchanged when the window closes (CONSENT-UNDER-MODAL-01); consent state and the bar's own buttons are untouched.
- Performance profile (181 forced enemies, 3x speed, headless): simulation about 2.4 ms per tick, `updateBarricadesAndPileup` the largest single cost at about 0.6 ms in a worst-case single pile, garbage collection about 2%; no code change was warranted.

## [1.8.80] — 2026-10-21 (UTC)

- Sound design pass, js/audio.js: the effects reverb in `SoundEngine.initReverb` was raw white noise with no pre-delay, which hisses on every send; it now shares `buildDecayImpulse` with `buildMusicReverb` (REVERB-IMPULSE-01), giving it a 12 ms pre-delay and a smoothed, darker tail (`SFX_REVERB_SMOOTHING` 0.45). The duplicated impulse loop in `buildMusicReverb` is gone.
- `SoundEngine.noise`: lowpassed effects far off screen also lose high end, down to 45% of their cutoff at the quietest distance (`SFX_DISTANCE_DARKEN_FLOOR`, SFX-DISTANCE-01), so distant combat sits behind on-screen hits instead of only getting quieter.

## [1.8.79] — 2026-10-21 (UTC)

- Forensic blood audit against the spec (quadratic drag, 7.65 m/s terminal velocity, α = arcsin(W/L) stains): `updateForensicDroplets` in js/effects.js now applies gravity, then drag F = −k|v|v as an implicit retention factor 1/(1 + k|v|dt) (DRAG-IMPLICIT-01), so fast sniper mist can never overshoot or reverse in one step; k stays g/v_t² per drop.
- Attract screen droplets (`updateAttractDroplets`, js/loop.js) used an unrelated drag (0.0022) and a 620 px/s clamp that the drag never reached; `ATTRACT_DROPLET_TERMINAL` is now 7.65 m/s at the screen's own scale and `ATTRACT_DROPLET_DRAG` is derived from it, with the same implicit drag, and stain elongation shares `FORENSIC_MAX_STAIN_ASPECT` with gameplay.
- Delta-time: `loop` in js/loop.js now resets a wall gap above 0.15 s to zero (`FRAME_GAP_RESET_MS`, DT-RESET-01) instead of clamping it, so a tab switch or stall advances nothing; the debug log counts the whole gap as clamped.
- Audio mastering (`SoundEngine.prewarm`, js/audio.js): explicit glue-compressor attack 6 ms and release 160 ms, plus a brickwall limiter (−1.5 dB, 20:1, 1 ms attack) after it (MASTER-LIMITER-01) so dense waves cannot clip the output.

## [1.8.78] — 2026-10-21 (UTC)
### Second full pass: in-game text matches the game, page markup and styles cleaned, shared enemy attack code
Player-facing text corrected against the code:
- Locked Build rows (`buildTowerModal`, UNLOCK-HELP-01):
  - Axeman, Spearman, Hammerman, Bomber, Gatling, Cleric, Blowdart, Marksman and Snap Caster also unlock on their own when their wave is cleared (`unlocksAfterWave`, `checkTowerUnlocks`), but their locked rows named only the training route. The row now adds the wave.
  - The in-game README and the How Everything Works help say the same.
- Class texts (`CONFIG.TOWERS`, `TOWER_STRATEGY` in `js/towers.js`):
  - The Paladin blurb claimed holy damage that ignores armor; only the Cleric's smite does. Paladin swings hit undead 50% harder (`HOLY_VS_UNDEAD_MULT`) and break graves.
  - The Berserker and Lancer tips said they unlock at 500 when `EVOLUTIONS` sets 40.
  - The Squirt Gun tip described two DoT stacks; it has one acid coat that stacks to `ACID_MAX_STACKS` = 3.
  - The Cowboy tip pointed at a 🥈 DPS icon that does not exist.
  - The Proton, Dark Matter and Quasar blurbs described effects they do not have. They now name their two component effects (`ELEMENT_COMPONENTS`), matching their tips.
- Enemy texts (`ENEMY_INFO` in `js/waves.js`):
  - The Monarch is no longer "the fastest thing on the path" (the Cookie is faster).
  - The Zombie names the Cleric's smite and the Pope's curse instead of "a Cleric's curse".
  - The Wolf no longer claims pack hunting. Its `pack` flag was set and never read; the flag is removed and the text names its real trait, a higher break-off chance.
- How Everything Works and Item Guide (`index.html`):
  - The favoured stat counts 60% more (`PREFERRED_STAT_MULT` = 1.6), not 25%.
  - Training XP comes from last hits, assists and cleared waves (not killstreaks or promotions).
  - Gear drops from enemies and the Merchant opens the Shop (there is no class-specific Shop gear); Heroes get +5 to every stat (`HERO_BONUS_STAT`).
  - Unlock paths are shown by the Build menu's ? rather than hidden.
  - Items land beside the road, not on it.
- Barricade help: the button is 📦 Pick up (not Store), and one expansion can be bought per wave (none queue).
- Settings:
  - The Audio note describes the field, battle and boss themes.
  - The frame-rate note adds that phones run at 30 FPS.
  - The decal presets are listed in ascending order.

Page (`index.html`):
- ERROR-OVERLAY-SCOPE-01: a cross-origin script error (only "Script error." with no file, as the Analytics tag reports) no longer covers the running game with the red boot-error screen.
- The consent bar's styles moved from a `<style>` element inside `<body>`, which is not valid HTML there, into the head stylesheet.
- Removed:
  - the always-hidden `waveSummaryGold`, `waveSummaryXpList` and `newEnemyList` elements and their CSS;
  - the unused `newEnemyWaddle` keyframes;
  - duplicate `.hidden` and option-row rules;
  - an overridden `box-shadow` on the Build menu;
  - an empty SANTA-CONSENT-VOICE-01 comment.
- Stale CSS comments are rewritten: the Shop is no longer described as tabbed, the Options and See changes buttons are described correctly, and version stamps are gone. The two settings dropdowns share `.settings-select` instead of repeated inline styles.

Code:
- ENEMY-ENGAGE-01 (`js/waves.js`):
  - `closeOnAttackTarget(t, speed, dt)` and `strikeTower(t)` replace the copied approach-and-strike blocks in `updateBreakaway` and `updateEscapedMovement` and the leader strike in the queue code.
  - A test confirmed breakaway and escaped enemies still reach and damage a stickman.
- `attuneToReadyStat()` (`js/towers.js`) replaces the attunement choice copied in `infuseElements` and `checkAttunementAndSpecialization`.
- `viewBoundsWithMargin` (`js/effects.js`) backs `decalViewBounds` and `fxViewBounds`.
- `activeGrassCells` (`js/environment.js`) backs `generateScenery` and `generateFlora`.
- `diagnosticFrameContext` (`js/loop.js`) backs both slow-frame and cap-event snapshots.
- `IDLE_GUN_ANGLE` replaces 15 copies of `-Math.PI/2 + 0.96`, and `HONEY_GROUND_CAP` replaces a literal 20.
- Analytics: `TELEMETRY_SHARED_PARAMS` omitted `build`, which every event sends. ANALYTICS-PARAMS-01 now checks name lengths only, and ANALYTICS-PARAM-BUDGET-01 derives its shared list from `TELEMETRY_SHARED_PARAMS` instead of a second copy.
- Comments: the LOOT-TABLE-01 note no longer says bosses always drop gear, and the BLOOD-LAYER-01 and finish-line fallback notes no longer narrate history.

## [1.8.77] — 2026-10-20 (UTC)
### Line-by-line review of the remaining files: player-facing fixes, dead features removed
Player-facing fixes:
- Settings: the Introduction Text switch now persists across reloads; `savePrefs` (`js/config.js`) was not writing `introTextEnabled` although `loadPrefs` read it (INTRO-TEXT-01).
- Inspect panel stat tooltips (`updateInspectPanelNow`, `js/ui.js`): the Intelligence button said INT drives every stickman's accuracy and overwrote the correct tooltips set just above it. Accuracy comes from DEX (`computeMissChance`). The overriding line is gone and the OWNER-LEDGER-01 self-test now checks the DEX wording.
- In-game README (`getReadmeText`): elements attune at 250 rather than 100, mixed elements need two stats at 250 rather than 500 and apply both component effects, stickmen start with empty packs, any enemy (not only Fire and Ice) may break off the path, and Gatling was listed twice. XP, caps and proc numbers are now read from the game constants.
- Settings > About "More info" text (`js/diagnostics.js`) describes the current expansion, Barricade, gear and Hero rules.
- Donut shield (`loseLife`, `js/waves.js`): the sparkle for an absorbed leak was spawned at world point (0,0), the top-left corner of the map; it now appears at the finish line.
- Defibrillator (`loseLife`): the revive passed the new lives total to `showLivesChange` as if it were a change, on top of the HUD's own pop; the HUD alone shows it. The Shop text says it fires when lives run out (`DEFIBRILLATOR_REVIVE_LIVES_FRACTION`).
- `applyTreatItem` (`js/environment.js`): the Lollipop zone and sparkle no longer fall back to a non-existent `treatDef._x/_y`.

Dead code and duplication:
- RUN-REWARD-REMOVED-01: the wave choice-reward system sat behind an early `return;` in `offerRunReward`. It is removed: `RUN_REWARD_DEFS`, `pendingRunRewards`, `claimRunReward`, `openRunReward`, `runRecoveryHp`, the hidden 🎁 button and its CSS, the notification-popup branch and its self-test. `restoreRunBoons` still loads run blessings recorded by older saves.
- Build menu (`buildTowerModal`, `js/ui.js`): each row's ? listener never ran because the grid's capture listener opens the shared help popup first (BUILD-HELP-01). They are removed, and the five copied select handlers are now `chooseBuildType(type)`.
- Campfire crafting: `findLitCampfireNear`, `CAMPFIRE_COOK_REACH_PX` and every `fuelCost` branch in `craftItemOn` and `findCraftableRecipeFor` are removed (no crafting recipe uses fuel).
- `drawOuterWastelandTrees` is removed (BRANCH-WASTELAND-02 forbids calling it). `paintGroundTile` replaces three copies of the tile-painting branch, with `DIRT_BACKGROUND_COLOR` instead of hard-coded hex and `FINISH_CARPET_DEPTH_PX`.
- `damageSpreadHalfWidth(tower)` (DAMAGE-SPREAD-01) replaces three copies of the damage-variance formula in `applyDamage`, the inspect panel and `dpsBreakdownText`. `CLERIC_SMITE_MULT` and `HOLY_VS_UNDEAD_MULT` replace the literal 5 and 1.5.
- `pauseGame()` and `keyboardFocusIsElsewhere()` (KEYBOARD-FOCUS-01) replace three copies each in `js/ui.js`. `openSettingsModal` is shared by both Settings buttons, `addDivider` builds every Shop divider, and `easeInOutCubic` serves both camera pans.
- Removed:
  - `statTierNote` (always empty) and the `checkLegendaryStatus` and `markFirstNextWaveCueAction` aliases;
  - `itemStatLine` (an alias of `itemStatSummary`);
  - `openNotificationEntry`'s unused override parameter and the `isImportantAudioEvent` context parameter;
  - `expansionBlockedReason`'s constant check;
  - the `resizeGameFrame` resize listeners.
- LONG-TASK-LOG-01: the second long-task observer in `js/config.js` and its debug-log section duplicated the one in `js/loop.js`; only the richer one remains. The debug log no longer prints the hack and contract lines twice.
- Audio (`js/audio.js`): `scheduleMusicStep` lost the constant `cadence=false` and the non-combat lead branches it made unreachable. `CHATTER_REGISTERS` and `CHATTER_TEMPO` (CHATTER-VOICES-01) replace two copied tables, and the truncated case comments are completed.
- `pickWeighted` (`js/config.js`) is shared by the stim and summon rolls.

Self-checks:
- FIRST-BUILD-CUE-01 and FIRST-WAVE-ACTION-01 no longer report false problems mid-game: the Build hand may show during play, and the Start Wave label may carry the early-call gold.
- The livestock-bounty check had an operator-precedence error that made it always pass.
- Two vacuous contract conditions (`!String(Tower.prototype.update).length` and `!String(canvas.onpointermove || '1')`) are replaced with real checks.
- Two self-tests only tested their own array filters; they now call `isCombatTarget`, and the second checks TARGET-MARK-01.

Comments:
- Version stamps, history narration and half-finished comments are rewritten across `js/config.js`, `js/ui.js`, `js/audio.js`, `js/environment.js`, `js/screens.js` and `js/diagnostics.js`.

## [1.8.76] — 2026-10-20 (UTC)
### Environment and effects review: shared helpers, dead code removed
- TAUNT-PICK-01 (`towerTauntScore`, `findNearestActiveTower` in `js/environment.js`): taunt scoring split out and the nearest-tower search no longer allocates per call; the design-contract check in `js/diagnostics.js` follows the new function.
- `dropTreasureBags(x,y,count)` and `dropBerries(x,y,count)` (`js/environment.js`) replace four copied drop loops in `updateScenery`, the CHEST and COIN_POUCH loot and `digWithShovel`.
- `makeBranchPiece(gx,gy,rng)` and `SCENERY_TREE_SHARE` (`spawnScenery`): dead branch and unused `treeRockSplit` removed; the tree share now derives from `TREE_ROCK_TREE_SHARE_ON_EXPANSION`.
- `isEndRingTile` no longer allocates; the unused `scatterSceneryInRing` and `waveMaxHpGainedFromMeat` are removed.
- `updateBarricadesAndPileup`: magic numbers named `QUEUE_CATCHMENT_PX`, `QUEUE_MAX_TRAVELED_GAP_PX`, `BARRICADE_QUEUE_TIMEOUT_MS`.
- `rollStimItem` and `rollSummonItem` use the shared `pickWeighted` (`js/config.js`) instead of two copied weighted rolls; `countChanceStructuresOnBoard` folded into `countSceneryOfType`.
- `applyTreatItem`: the Lollipop zone and treat sparkle used a non-existent `treatDef._x/_y` fallback; both now use the resolved drop anchor.
- SHOVEL-CHARGES-01 contract check (`js/diagnostics.js`) follows the dig loot into `dropTreasureBags`.
- `js/effects.js` tail: `DECAL_ELONGATION`, `ROUND_CLEANUP_FADE_MS`, `GOLD_HUD_FLIGHT_MS`, `resetGoldHudFlights()`; dead `BLOOD_STAIN_DRY_RGB` removed; stale blood-ageing comments point at BLOOD-STABLE-01.

## [1.8.75] — 2026-10-20 (UTC)
### Analytics keeps every measured value; lighter share image; page comments cleaned
- ANALYTICS-PARAM-BUDGET-01 (`window.trackEvent` in `index.html`): Google Analytics keeps 25 parameters per event. The 12 shared labels plus each event's own values pushed two events over that limit, and the sender silently cut the last ones:
  - `wave_completed` lost `towers`, `fps_median` and `gap_p95_ms`;
  - `game_over` lost `loose_end` and `fps_median`.

  Over the budget, the sender now drops only the labels that can be rebuilt from other fields first (`telemetry_schema` is constant, `play_label` is platform/build, `event_group` follows from the event name), so measured values always arrive. A design contract check fails if any declared event would still overflow. Checked by sending both events in Chromium: each arrived with all its values at exactly 25 parameters.
- `og-image.png` re-encoded losslessly without the unused alpha channel, so share previews and the manifest screenshot load faster. The pixels are identical, so the `?v=4` cache key stays.
- `index.html` comments follow COMMENT-HYGIENE-01, like the scripts:
  - CA pointers, HISTORY.md references and version stamps after rule IDs are removed;
  - the rule IDs are kept.

## [1.8.74] — 2026-10-20 (UTC)
### Run ends on a squad wipe, four stickmen get their figures, line-by-line review of waves and towers
- SQUAD-WIPE-01 (`squadWipedOut` in `js/environment.js`, called from `Tower.becomeOverrun`): the run ends with Game Over when every fighting stickman is down at once. Before this, a board of downed stickmen showing "3 rounds left" kept running while enemies stood on them. The Hacker never fights, so he cannot keep a run alive.
- DOWNING-CAPTURE-01: the overlay showed three 3-second frame summaries per downing, which made it far wider than the screen. The overlay now shows one line ("downings captured: N (details in the debug log)"), and the full capture stays in the debug log.
- Four stickmen had no `drawStickman` branch and were drawn with no arms or weapon. They now have figures:
  - PALADIN-FIGURE-01: the Paladin carries the Hammerman's hammer and shield, gilded, with a cross on the shield.
  - MERCHANT-FIGURE-01: the Merchant wears a turban and holds up his Money Bag.
  - GLAIVE-FIGURE-01: the Glaive holds a heavy two-handed launcher with a curved blade at the muzzle.
  - CHEF-FIGURE-01: the Crazy Chef wears a toque and holds a kitchen knife.
  - Their muzzle points are added to `MUZZLE_WEAPON_REACH`, and the Paladin now lunges and swings like the other melee classes.
- CHEF-STRENGTH-01 (`Tower.recomputeStats`): the Crazy Chef's description and tip say her damage scales with Strength, but the code used Dexterity like every other Archer. She now scales with Strength.
- The Veteran text spawned at `this.radius`, which towers do not have, so it was placed at NaN and never showed. It now appears above the stickman.
- TOWER-OVERRUN-01 (`Tower.becomeOverrun`): a burn now downs a stickman the same way an attack does, with the alert, the "Overrun!" text and the sound. The overrun timing is named in `TOWER_OVERRUN_MS`, `TOWER_OVERRUN_WAVES` and `TOWER_RECOVERY_HP_FRACTION`.
- Player text corrections:
  - Cleric: "a very long cooldown", where it said "the longest cooldown of any tower", which the Merchant has.
  - Glaive: the 5x bonus applies to all camp buildings, including graves and the circus.
  - Bomber tip: "the dedicated splash tower", where it said "the only splash tower".
  - Marksman tip: the Archer's Intelligence specialization, where it said "Ice Archer".
  - Hammerman tip: it stuns on every hit.
- Strategy-tip icons that were overwritten at load were removed from `TOWER_STRATEGY`.
- `js/waves.js` review:
  - CAMP-BUILDINGS-01: `spawnCampBuilding` and `spawnCampGuardian` with `CAMP_BUILDING_KINDS` replace four building spawners and three guardian spawners.
  - The surround-slot search is split into `isSurroundRival` and `surroundSlotIsFree`.
  - `tierWalkSpeed` replaces `packedSpeed`, and the pack speed bonus, which was always 1, is removed.
  - `ENEMY_STATUS_LABELS` and `Enemy.showStatusLabels` replace five copied lines.
  - The bleed stack array is cleared instead of being reallocated on every tick for every enemy.
  - Hunters (clown and troll) scan the towers once per frame instead of twice.
  - `drawStuckProjectiles`, `drawStuckProjectileShape` and `drawAngryBrows` are split out of `Enemy.draw`.
  - Enemy attack cadences are named in `LOOSE_MELEE_INTERVAL_MS` and `ENEMY_MELEE_INTERVAL_MS`.
  - Unused `placeOnNearestRouteTile`, `routeLengthPx` and the `showFirstTimeNotice` alias are removed.
  - The boot warm-up's scenery glyph lists are deduplicated.
- `js/towers.js` review:
  - `MELEE_SWING_TYPES`, `EXACT_INTERCEPT_TYPES`, `MAGIC_MISSILE_TYPES`, `PROJECTILE_COLOR_BY_TOWER`, `RANGED_SHOT_SOUND` and `MUZZLE_WEAPON_REACH` replace long type chains and per-shot object literals.
  - `deflectProjectileAsMiss` replaces two copies of the miss logic.
  - `Projectile.embedInEnemy` and `Projectile.applySnapcasterProc` are split out of `onImpact`; the second removes constant ternaries.
  - Sword blades are drawn without allocating a dozen arrays per frame.
  - `paintStickmanSilhouette` replaces two copies of the shadow-mask paint.
  - Hit sets are reused instead of reallocated on every swing.
  - `TRAINED_STATS` (`js/config.js`) replaces eight `['str','dex','int']` literals.
- `js/effects.js` (first half):
  - `DECAL_ELONGATION` table.
  - The constant `growT` is removed from `drawOneDecal`.
  - Stale ageing comments are corrected to BLOOD-STABLE-01.
  - Blood on scenery reuses `sceneryEmojiFor`.
  - The dead stain colour constant is removed.
- Comments that narrated history or requests now state the current rule.
- Checked over http in Chromium:
  - design contract clean at boot, no console errors;
  - every class attacked and drew;
  - all four new figures rendered, both aiming and idle;
  - camps and guardians spawned and respawned;
  - one stickman down kept the run going, and all down ended it.

## [1.8.73] — 2026-10-20 (UTC)
### Line-by-line review: loop, helpers, comment voice, dead code
Read `js/loop.js` in full and swept every other script for minified one-liners, per-frame allocations, unused functions and history narration in comments.
- DIAG-RING-01 (`recordDiagFrame`, `copyDiagFrame`, `startDowningCapture` in `js/loop.js`): the diagnostics frame history is a preallocated ring (`diagRing`, `diagRingNext`) instead of an array that grew and shifted every frame.
- `recordPerfEventSample` reuses `insertTopDurationEvent` instead of a second copy of the same sorted insert.
- `update` (`js/loop.js`): wave-clear counts loose enemies once (`looseAtClear`) instead of three times; the two skull-worm loops are merged under `SKULL_WORM_CHANCE`; the HP percentage uses `clampNum`. The CLEAN-WAVE-EXPAND-01 contract check now matches `looseAtClear`.
- `collectAmbientLogsOnClaimedGround` replaces a minified one-line loop in `updatePresentationEffects`.
- `ATTRACT_ELEMENT_SKINS`: the start screen built its element skin table for every archer on every frame; it is now one constant.
- SURROUND-CONTENDERS-01 (`enemySurroundPoint`, `js/waves.js`) and food stats (`grantFoodConstitution`, `grantFoodStatPoints` called from `grantFoodStat`, `js/environment.js`) carry the deduplication from this review.
- `spawnRevealedScenery` and `countSceneryOfType` (`js/environment.js`) replace two copies of the reveal-and-restore-level sequence and an inline chest count (PROP-CAP-01).
- `maybeSpawnExtraBuilding` counts live huts without `enemyPool.filter`; the skin-peel decal path draws without a `forEach` closure.
- `refreshDesignContractProblems` (`js/waves.js`) replaces two copies of the contract warning.
- CAMERA-SMOOTH-01 contract check ignores the idle probe while another camera motion (wave-start pan, enemy follow, inertia, drag) is active, so it no longer reports a false problem mid-wave.
- Minified one-liners expanded in `Tower.recomputeStats` (equipped items), the scenery blood stamp in `js/towers.js`, and the notification row builder in `js/config.js`.
- Dead functions removed: `agedBloodColor`, `buildSpiralPathTiles`, `countDistinctTiles`, `buildFallbackPath`.
- COMMENT-HYGIENE-01, third pass: comments that narrated past behaviour, requests or regressions now state the current rule (MAP-CORRIDOR-01, PATHING-MASTER-01, SPAWN-FLAG-PLACEMENT-01, GLOBAL-ATTACK-SLOW-01, NO-EVOLVE-IN-PLACE-01, BUILD-ORDER-01, DOM-REFLOW-01 and others); the remaining version stamps and HISTORY.md pointers in code are gone.
- Checked over http in Chromium: design contract clean at boot, self-tests pass, no console errors; a forced escape patrolled and engaged a stickman; the stress wave and blood stain run finished without errors. FIRST-BUILD-CUE-01 and FIRST-WAVE-ACTION-01 still appear mid-game, as on 1.8.69.

## [1.8.72] — 2026-10-20 (UTC)
### Code-wide audit: area queries, wildlife bugs, dead code, comment voice
Audited every script with scans for whole-pool loops, duplicate helpers, unused functions and constants, loose equality, `var` and comment voice, then fixed what they found.
- ENEMIES-NEAR-01 (`enemiesNear` in `js/loop.js`): one spatial-hash radius query, padded by `NEARBY_QUERY_MARGIN_PX` 40 and returned as a copy, now serves every area effect that scanned all 220 pool slots:
  - `Projectile.onImpact` splash (SPLASH-HASH-01) and electric chain (radius named `ELECTRIC_CHAIN_RADIUS_PX`, was a bare 4900 squared);
  - `coatEnemiesInAcid`, `spawnChainLightning`, `dischargeShockBurst`;
  - `Enemy.updateHealAura` (radius named `HEALER_AURA_RADIUS_PX`), `startleNearbyAllies`, `Enemy.looseSeparationHeading`.
- Wildlife bugs: `spawnChainLightning` could jump to bees and livestock that were never marked (TARGET-MARK-01). The Healer's aura (HEAL-AURA-ALLIES-01) healed farm animals and camp buildings. Both now skip them.
- SURROUND-CONTENDERS-01 (`enemySurroundPoint`): rivals for a target's surround slots are gathered once per call instead of rescanning the whole pool for every candidate slot (up to 20 rings x dozens of slots).
- BLOCKER-BOUNDS-01 (`forensicBlockerAlongPath`, `js/effects.js`): every landing droplet tested every stickman, enemy, cat, skeleton and scenery item, up to 700 droplets per gore burst. Bodies outside the flight's bounding box (40 px pad) are rejected first, and scenery is read only from the tiles the flight crosses (`sceneryMap.get`), not by iterating the whole map. The BLOOD-SURFACES-01 contract check now matches the tile lookup.
- 43 inline `Math.max(a, Math.min(b, v))` clamps replaced with the existing `clampNum`.
- Dead code removed; none had a reference anywhere in code, strings or `index.html`:
  - functions `breedCircusAnimals`, `burnCampfiresAtWaveEnd`, `generateConflictFreePath`, `isGrownRoundBreeder`, `rollGoldBagCoinValue`, `stampSettledDebris`, `stampSettledDrop`;
  - constants `AMBIENT_LOG_STACK_SLOTS`, `ARCHER_RATE_SHARE`, `CAMPFIRE_MAX_FUEL`, `CAMPFIRE_WOOD_PER_LOG`, `CAMPFIRE_FUEL_PER_LOG`, `ENEMY_HP_SCALE` (its use was dropped in commit ba30f1e), `FORENSIC_DRAG_K`, `LIVESTOCK_BREED_CHANCE`, `LIVESTOCK_BIRTHS_PER_EXPANSION`, `LIVESTOCK_PAIR_HEART_COOLDOWN_MS`, `LIVESTOCK_PAIR_HEART_COOLDOWN_SPREAD_MS`, `MEAT_MAXHP_BY_ID`, `MEAT_MAXHP_CAP_PER_WAVE`, `MEAT_MAXHP_OVERFLOW_GOLD_PER_POINT`, `MUSIC_MAJOR_INTERVALS`, `MUSIC_PHRYGIAN_INTERVALS`, `QUEUE_PACK_GAP_PER_RADIUS`, `SPRAY_DECAL_LIFE_MS`.
- COMMENT-HYGIENE-01, second pass:
  - 32 "owner decision/says/asked" phrasings removed;
  - 229 "see HISTORY.md §" pointers and 546 version stamps after rule IDs removed (rule IDs stay searchable in CHANGELOG and HISTORY);
  - 91 comments over 140 characters cut to their first sentence, and 39 orphaned continuation lines removed.
- AGENTS.md gains the ENEMIES-NEAR-01 area-query rule and a dead-code rule.
- Already clean: no `var` declarations and no loose `==` (one `!= null` idiom kept).
- Checked over http in Chromium: design contract clean at boot, all self-tests pass, no console errors. A three-fighter wave ran at 5x, and chain lightning, splash and startle ran with live enemies. The two contract notes seen mid-game (FIRST-BUILD-CUE-01, FIRST-WAVE-ACTION-01) also appear on 1.8.69 and depend on game state.

## [1.8.71] — 2026-10-20 (UTC)
### Escapes spread out, splash damage uses the spatial hash
- LOOSE-SEPARATION-01 (`Enemy.looseSeparationHeading`, called from `updateEscapedMovement`): escaped enemies within their radii plus 10 px of each other bend their heading apart (weight 2.5, neighbours from `queryNearby`). A group that escapes together no longer walks the rim as a single-file line. Constants `LOOSE_SEPARATION_RANGE_PX`, `LOOSE_SEPARATION_GAP_PX` and `LOOSE_SEPARATION_WEIGHT` in `js/waves.js`.
- SPLASH-HASH-01 (`Projectile.onImpact`, `js/towers.js`): splash damage queried every enemy in `enemyPool` (BACKLOG 1.8.47, Ericson 7.1). It now reads the radius from the spatial hash with `queryNearby`, copying the list because damage callbacks reuse its scratch array. Passive wildlife stays out because the hash already excludes it (TARGET-MARK-01).
- Checked over http in Chromium: design contract clean at boot, all self-tests pass, no console errors, a wave starts and a forced escape patrols.

## [1.8.70] — 2026-10-20 (UTC)
### Escapes patrol, solid scenery, passive wildlife, promotion value, rage look, comment cleanup
- LOOSE-PERIMETER-01 (`js/waves.js` `Enemy.reachEnd`, `updateEscapedMovement`; `js/environment.js` `pickLoosePerimeterGoal`, `isLoosePerimeterTile`): an escaped enemy no longer stands still for 20-30 s (LOOSE-SETTLE-01 from 1.8.37 removed with `escapeSettleMs`, `LOOSE_SETTLE_*`, the loop-turn wander and `curiousTarget`). It patrols the grass rim at once, preferring rim tiles ahead of its heading, and engages a stickman only on contact (`LOOSE_CONTACT_RADIUS_TILES` 1.1). Bosses keep `BOSS_AGGRO_RADIUS`. Stroll speed 0.55 → 0.7 of lane speed.
- SCENERY-SOLID-01 (`isSceneryBlockedAt`, `moveAroundScenery` in `js/environment.js`): trees and rocks are solid to every enemy walking off the road (breakaway chase, escaped chase, rim patrol). The walker turns to its own preferred side in 0.6 rad steps until its lookahead clears the tile. An enemy already standing on a tree or rock tile walks straight off it. Rim goals never land on scenery, and each pick adds a random spread so escaped enemies fan out along the rim instead of bunching at the finish.
- TARGET-MARK-01 (`isCombatTarget` in `js/loop.js`): bees and livestock were still caught by splash (`Projectile` splash loop), acid (`coatEnemiesInAcid`) and chain lightning even though single-target aim skipped them. All four paths now share one filter: wildlife takes damage only after the player marks it.
- PROMOTION-VALUE-01 (`Tower.upgrade`, `js/towers.js`): spendable points doubled (`PROMOTION_SPENDABLE_ROLLS` 10 → 20 dice), plus a random talent roll of 2-6 dice into one random stat, shown as "Talent: …". `PROMOTION_COST_GROWTH` 1.5 → 1.35, against 2.25 per extra copy (`SCALING_COST_GROWTH`). One-per-board unlocked classes are unchanged and enforced by `isTowerTypeAvailable`.
- RAGE-MARK-01 (`Tower.drawRageMark` replaces `drawBloodLustAura`): the pulsing red disc, ring and dripping dots are gone. Rage and blood lust show a throbbing anger vein above the head, drawn on top of the figure from `bloodPose`; rage also vents two steam puffs (`RAGE_STEAM_CYCLE_MS` 700, High graphics only).
- FORENSIC-PROMPT-LAND-01 (`updateForensicDroplets`, `FORENSIC_TIME_SCALE` 3): gore-burst droplets, mist above all, hung in the air for 1-3 s, so their stains and void patterns appeared well after the kill. Flight now runs three times faster; trajectories, impact angles and stain shapes are unchanged.
- DRIP-TRAIL-FORENSIC-01 (`spawnDripTrail`, drip branch of the decal painter in `js/effects.js`; all 10 callers in `js/waves.js` pass the enemy): drip trails were drawn as straight screen-down streaks, a vertical-surface pattern that formed a comb of parallel lines along a horizontal road. On flat ground a drip from a moving bleeder now elongates along its travel (5-18 px, scaled by speed, ±0.17 rad jitter) and a still bleeder leaves a short run in a random direction.
- FOOTPRINT-GAIT-01 (`updateWalkingBlood`): bloody footprints vary toe-out (±0.15 rad) and stride width per step instead of a ruler-straight double line.
- STAIN-SURFACE-01 (`bloodSurfaceAt`, `applyStainSurface`, applied in `pushDecal` and `pushSprayDecal` to every drop stain): the target surface decides the edge, as in James, Kish & Sutton ch. 5. Drops on dirt (road and outer ground) get 2-5 short tapered spines; drops on grass break into 2-3 beads. Shapes are rolled once at creation, so baked and live stains match.
- STAIN-TAIL-01 (`drawBloodDrop`): the parent tail lengthens with impact obliquity (`tailScale` 1.15 + 0.14 per unit of L/W above 1, capped at 2.4), so shallow hits read as exclamation marks pointing away from the source.
- POOL-SERUM-01 (pool branch of the decal painter): pools of 3+ blobs show a faint pale-yellow serum ring while drying (lifeT 0.06-0.45), ahead of the existing dark-rim skeletonization.
- STOMP-SPATTER-01 (`spawnStompSpatter`, from the wet-feet pickup in `updateWalkingBlood`): an enemy stepping into a pool under 3 s old splashes 4-7 long, narrow spatters around it. Their tails point back toward the pool, the reversed directionality that James, Kish & Sutton ch. 5 gives for splashes, where most spatters leave below 40°. It is a one-time stamp: no moving fluid and no per-frame cost. High graphics only.
- WAVE-CASTOFF-01 (`applyStainSurface`, `drawBloodDrop`): 60% of stains with L/W ≥ 2.4 (impact ≤ ~25°) flip one satellite off the leading edge, its tail pointing back to the parent (Bevel & Gardner ch. 4).
- BLUNT-EXPOSURE-01 (`spawnWeaponBloodContact`): a first blunt (FAN-profile: Hammerman, Paladin) blow throws 30% of the usual marks, rising 35% per further blow to the same enemy. Blood has to be exposed before blows spatter it (James ch. 7). Edged weapons are unchanged because they open a wound on the first hit.
- DRIP-INTO-DRIP-01 (arterial-drip branch of `Enemy.update`): a still bleeder whose next drop lands within 12 px of its last drip throws 3-5 satellites in random directions. On the move, shed drops now carry the walker's momentum and elongate forward; before this they pointed backward, against the book physics.
- DECAL-REBUILD-DEFER-01 (`sweepSettledDecals`): a debug capture showed a 160 ms render frame. Full re-stamps of the baked blood layer ran every 10 s once capacity evictions began, and cost 100+ ms on a bloody board. Mid-wave they now wait up to 60 s (`SETTLED_DECAL_REBUILD_IN_WAVE_MS`); between waves the 10 s cadence stays.
- Item: `KNIGHT_PAWN` is shown as "Captured Pawn" (id kept for saves).
- COMMENT-HYGIENE-01: 733 pointer-only `// CA### — see HISTORY.md` lines removed (the archaeology stays in HISTORY.md by number); 168 trailing comments over 110 characters cut to their rule IDs, or removed when they had none. AGENTS.md comment rule rewritten.
- Checked over http in Chromium: design contract clean at boot, all self-tests pass, no console errors; a wave started, a forced escape picked a rim goal and engaged an adjacent stickman.

## [1.8.69] — 2026-10-20 (UTC)
### Final pass: wave stall fix, faster opening spawns, search snippet
- RELEASE-HOLD-CAP-01 fix: the 1.8.64 cap reset `waveDispatch.releaseHoldMs` before the inter-batch `gapRemainingMs` was used up, so each frame of the gap restarted the 6 s hold. A batch held at the entrance could wait about 100 s instead of 6. `advanceWaveDispatch` in `js/waves.js` now clears the hold only when the batch advances. A trace of wave 3 showed the stall, and a new-player playthrough confirmed the fix.
- OPENING-SPAWN-GAP-01: `enemySpawnClearance` used a 24 px gap between bodies, so slow walkers left the entrance only every ~3.3 s, the real limit on early wave length. Waves up to `OPENING_FLOW_LAST_WAVE` (10) now use `OPENING_SPAWN_GAP_PX` 8; later waves keep `SPAWN_GAP_PX` 24.
- New-player playthrough (game time, building as gold arrives, using the map, buying expansions):
  - wave durations: 161, 388, 618, 633 and 841 s for waves 1-5;
  - lives at wave 5: 91;
  - no console errors.
  The remaining length tracks enemy count (55, 98, 148 and 191 enemies in waves 2-5), set by `ENEMY_COUNT_MULTIPLIER` 1.5 (owner's "more small enemies to farm") and road length.
- Search: the meta description is cut to 146 characters, under Google's ~155 cut-off, in `index.html` (description, Open Graph, Twitter, JSON-LD) and `manifest.json`.
- Checked: design contract clean, all self-tests pass, desktop and phone audits clean.

## [1.8.68] — 2026-10-20 (UTC)
### Search: real text for crawlers inside index.html
- SEO-NO-EXTRA-PAGES-01: search engines read little game text because the game draws on a canvas. Added, all inside `index.html` with no new files:
  - three About-panel paragraphs (`aboutSearchSummary` and the two after it) naming the classes, enemies, elements, structures, visitors and supported devices, all taken from the game data;
  - a fuller `gameCanvas` fallback text;
  - a clearer `titleWordmark` accessible name, "StickTD: Free Stickman Tower Defense Game".
- Nothing visible changes outside the About panel, which scrolls as before (checked at 390 px).
- `sitemap.xml` lastmod set to 2026-10-20.
- Checked: design contract clean, all self-tests pass.

## [1.8.67] — 2026-10-20 (UTC)
### Guide pages removed
- SEO-NO-EXTRA-PAGES-01: the owner did not authorize extra pages, and the README already covers the guide material. `how-to-play.html`, `stickmen.html`, `enemies.html` and `faq.html` from 1.8.66 are deleted, along with every link to them: the VideoGame `hasPart` list, the About panel guide line, the `noscript` guide line, the `sitemap.xml` entries and the README links. The search improvements to `index.html` (title, description, keywords, structured data, WebSite node), `manifest.json` and the sitemap image entry stay. AGENTS.md records the rule.
- Checked: no remaining links to the removed pages, every JSON-LD block parses, design contract clean, all self-tests pass.

## [1.8.66] — 2026-10-19 (UTC)
### Search: guide pages, sharper title and richer structured data
- SEO-GUIDES-01: four crawlable guide pages built from the game's own data (`CONFIG.TOWERS` blurbs and costs, `CONFIG.ENEMIES` stats, `FAMILY_INTRODUCTION_WAVE`): `how-to-play.html` (with HowTo structured data), `stickmen.html` (every class with cost and unlock path, ItemList), `enemies.html` (every family with first wave, base health, armor, speed and ability, plus elites) and `faq.html` (FAQPage). Each page has its own title, description, canonical URL, Open Graph and Twitter tags, BreadcrumbList and WebPage data, shared navigation, a Play button, and the AI disclosure line. They are plain static pages with no game code and no image files, and they adapt to light and dark mode. Checked at 390 and 1280 px with no sideways scrolling.
- SEO-TITLE-01: the title is now "StickTD — Free Stickman Tower Defense Game, No Download" (55 characters, under Google's cut-off). Page, Open Graph, Twitter and `manifest.json` share it. The meta description names the search terms players use: free, stickman tower defense, browser, no download, phone, tablet and PC.
- Structured data in `index.html`: VideoGame gains alternate names, keywords, `numberOfPlayers`, `gameItem` and `hasPart` links to the guides; a WebSite node is added.
- Crawl paths: the About panel (`aboutGuideLinks`) and the `noscript` block link to all four guides. `sitemap.xml` lists all five URLs with an image entry for `og-image.png`.
- Checked: every JSON-LD block parses, every internal link resolves, design contract clean, all self-tests pass.

## [1.8.65] — 2026-10-19 (UTC)
### First 15 minutes: early crowds sized to the opening
- OPENING-CROWD-CAP-01: the long-road crowd bonus (`routeLengthFactor` in `js/waves.js`, GROUP-SIZE-ROUTE-01) now ramps in over the first ten waves through `routeLengthFactorCap` (`OPENING_ROUTE_FACTOR_BASE` 1.25 + `OPENING_ROUTE_FACTOR_PER_WAVE` 0.125 per wave, up to `ROUTE_FACTOR_MAX` 2.5 by wave 10). An expanded map no longer makes wave 2 or 3 two and a half times bigger. Later waves are unchanged, as are walk speed (ENEMY-PACE-01) and the farm count multiplier.
- Measured over three new-player playthroughs (game time): wave 2 now takes 220-320 s (was 470), and waves 3 and 4 take 180-310 s (was 560-890). Lives at wave 4 were 90, 98 and 51; the 51 run lost its lives on one map's layout, so the next balance pass should look at map variance.
- Checked: design contract clean, all self-tests pass, no console errors.

## [1.8.64] — 2026-10-19 (UTC)
### First 15 minutes: waves no longer stall
- RELEASE-HOLD-CAP-01: a playthrough built like a new player's (stickmen bought as gold arrives, the free map used, expansions bought) showed wave 2 spending up to 553 of 790 s waiting in `currentBatchReleased`, because a melee stickman near the entrance held the batch inside `BATCH_RELEASE_SPACING_PX`. `advanceWaveDispatch` in `js/waves.js` now waits at most `BATCH_RELEASE_MAX_HOLD_MS` (6000 ms of game time) per batch (`waveDispatch.releaseHoldMs`, cleared in `resetWaveDispatch`).
- OPENING-FLOW-01: waves 3-10 space units `OPENING_FLOW_SPAWN_GAP_MS` (1500 ms) apart instead of `ENEMY_SPAWN_GAP_MS` (5000 ms) (`spawnGapForWave`, `OPENING_FLOW_LAST_WAVE` in `js/waves.js`). Walk speed (ENEMY-PACE-01, `ENEMY_WALK_SPEED_SCALE`) and waves 11 on are unchanged.
- Measured with the same scripted squad (game time): wave 2 went from 480-972 s to about 470 s, and wave 3 from 838-887 s to 559 s, with no lives lost by wave 3. The remaining length comes from enemy count growing with road length and slow walkers queuing at the entrance (about 2-3.5 s per enemy). Both are owner rules, so they were left alone.
- Not a bug: tips seemed to show twice, but the playthrough was logging queued tips when they were replayed. Elites already start at wave 8 (`ELITE_FIRST_WAVE`).
- Checked: design contract clean, all self-tests pass, no console errors.

## [1.8.63] — 2026-10-19 (UTC)
### Early-call bonus on the button, elite names on the enemy card, README
- EARLY-CALL-01: the Next Wave button now shows the early-call gold while it lasts, for example "Next Wave +💰26" (`nextWaveActionLabel` in `js/ui.js`), and counts it down: `update` in `js/loop.js` refreshes the HUD only when the whole-gold amount changes (`shownEarlyCallBonus`). Checked at 1280x800 (the button grows from "Next Wave" to fit) and 390x780 (the top bar shrinks to fit on one line as before; nothing wraps or is cut off).
- ELITE-ENEMIES-01: the enemy card puts the elite kind in front of the name, for example "Tough Grunt" (`updateTargetFrame` in `js/loop.js`).
- README: Enemies and waves mention elites and the early-call bonus; Items mentions the Merchant's Bell, Circus Ticket and Troll Bait, the build-spot outline and the stat-point preview; Settings mentions Performance mode.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.62] — 2026-10-19 (UTC)
### Elite enemies, early-call gold, summon items, build hint, stat preview, Performance mode
- ELITE-ENEMIES-01: from wave 8 a few Small, Standard and Large enemies spawn as elites (`maybeMakeElite` in `js/waves.js`, called from `spawnWaveUnit`): 3% at wave 8, growing 0.05% a wave to at most 8%. Each gets one modifier, shown by a static coloured patch on the ground under it (`drawEliteGroundPatch`) and a one-time "Elite" label: blue Swift moves 35% faster, gold Tough has double health, red Fierce hits stickmen 60% harder. Elites pay double bounty. The same colour always means the same thing, so the colour teaches the counter (Diablo's palette-swapped monsters, Stay Awhile and Listen). Bosses, Santa and Tiny enemies are never elite. Measured over 2,000 test spawns at wave 30: 3.8% elite, split evenly between the three kinds.
- EARLY-CALL-01: starting the next wave soon after a clear pays bonus gold (`earlyCallBonusNow` and `startNextWave` in `js/waves.js`, the clear time recorded in `update` in `js/loop.js`): 8 gold plus 1.5 per wave cleared, shrinking to nothing over 20 seconds of game time, so paused time does not count. Waiting is never punished. A floating "+💰 early call" shows the payment and a one-time notice explains it. Adapted from Kingdom Rush's early call.
- SUMMON-ITEMS-01: three new finds call a visitor when used from a stickman's inventory (`SUMMON_ITEMS`, `summonVisitor`, `useStoredConsumable` in `js/environment.js`): Merchant's Bell 🛎️ calls the caravan, Circus Ticket 🎟️ a circus, Troll Bait 🪤 a wandering troll. Supply crates give one instead of a stim 20% of the time. If that visitor is already on the field, or there is no room, the item is kept and a short message says why (VISITOR-LIMIT-01). A summoned circus may now stand up to two tiles from the road (`findFreeTileBesideRoad`).
- BUILD-SPOT-HINT-01: with a class chosen in the Build menu, the free tile that covers the most road within that class's starting range gets a static gold dashed outline (`bestBuildSpotFor`, `drawBuildSpotHint`), a "good spot" suggestion after Buckland's support-spot scoring. It is cached until the map, the road, the stickmen or the scenery change.
- STAT-PREVIEW-01: each Strength, Dexterity and Intelligence button's tooltip now ends with what the next point would change, for example "miss 34.0% → 33.5%, critical 2.5% → 3.3%" (`statPointPreview` in `js/ui.js`). The preview adds the point, recomputes and restores the stickman exactly, including health and the Veteran flag; `statPreviewRunning` keeps the one-time Veteran moment from firing during a preview. The panel layout is unchanged.
- PERFORMANCE-MODE-01: the Low graphics option is now called Performance mode in Settings and on the quality buttons. It behaves exactly as before.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone; each feature was exercised in the browser (all three summons placed one visitor each and a second use kept the item, the early bonus was 9 gold at 5 seconds and 0 at 25, the preview left health, stats and points unchanged), and a screenshot shows the build hint and the three elite patches.

## [1.8.61] — 2026-10-18 (UTC)
### Fast-mover collisions on flat arrays, Lucky Branch priced fairly
- COLLISION-ARRAYS-01 (continued): `resolveSweptEnemyCollisions` in `js/loop.js`, the pass that catches fast enemies crossing each other within one tick, now runs on the same flat arrays as the relaxation passes, using the speed arrays to hold each enemy's previous position. From the same starting state the old and new pass produced bit-identical positions in six snapshots with 220 enemies, at about 0.4 to 0.85 ms per call instead of 1.15 to 4.55 ms.
- SHOP-VALUE-01: the 1.8.59 audit found the shop's Lucky Branch gave 180 total stats for 70 gold and 15 wood, more than any Rare drop, so it made drops pointless. Its shop price is now 180 gold and 15 wood (`LUCKY_BRANCH` in `js/config.js`), in line with Swift Feather's roughly one gold per stat point. Its stats, its scenery and wave drops, and the other shop items are unchanged.
- Kept: the Tiny Grunt's extra 15% dodge (TINY-GRUNT-EVASION-01), which the owner asked for in 1.7.136.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.60] — 2026-10-18 (UTC)
### Less lag when enemies pile up at a barricade
- COLLISION-ARRAYS-01: a CPU profile with 220 enemies piled at the barricade (wave 30, fully expanded map, eight fighters) put about 60% of all script time in enemy-to-enemy collision and the pile-up queue. The arithmetic was cheap; the time went on reading fields from enemy objects that carry dozens of dynamically added properties (Albrecht, Pitfalls of Object Oriented Programming). `resolveEnemyCollisions` in `js/loop.js` now copies each enemy's position, radius, speed and flags into flat typed arrays once per call (`loadCollisionArrays`), runs its three relaxation passes on those, and writes the positions back. `findQueueCatchmentLeader` in `js/environment.js` reads the queue's pre-snap positions from flat arrays (`snapshotCatchmentArrays`) and tests distance before eligibility.
- Same results: from the same starting state, the old and new collision code produced bit-identical positions for every enemy in six separate snapshots, and the old and new catchment search chose the same leader for all 216 to 217 queued enemies in four snapshots.
- Measured in a headless browser without a graphics card, 220 enemies piled up: the collision function fell from about 4 to 8 ms to about 1.1 to 1.5 ms per call, the pile-up step from about 6 to 7.5 ms to 2.5 to 3 ms per tick, the frame rate rose from 23 to 27 fps to 28 to 30 fps, and the worst frame fell from 80 to 96 ms to 38 to 56 ms. A normal desktop with a graphics card will start from a higher frame rate; the saving per tick is the same.
- Not changed yet: the swept collision pass, the catch-up that runs up to 8 simulation ticks after a slow frame, and enemy drawing (about 3 ms with 220 enemies).
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.59] — 2026-10-18 (UTC)
### Quieter repeat visitors, shop and loot audit
- REPEAT-FANFARE-01: every wandering troll pulled the camera across the map and every circus played the full wave fanfare, however many had come before. Now only the first troll of a run pans the camera (`spawnWanderingTroll` in `js/waves.js`) and only the first circus plays the fanfare; later circuses honk where they set up (`setUpCircusAt` in `js/environment.js`). The troll's own arrival sound, labels, notices and medal checks are unchanged. The counters (`trollArrivalsThisRun`, `circusArrivalsThisRun`) reset with each new run in `initRegionAndPath`. Diablo kept its biggest surprises one-time because repeating them would have been tedious (Stay Awhile and Listen).
- Shop, drops and cooking audited against each other (`BACKLOG.md` § 1.8.50): the shop's Lucky Branch gives 180 total stats for 70 gold and 15 wood, more than any Rare drop and the weakest Epic, so it is the obvious buy and makes lower drops pointless. Left for an owner decision. Meals and stims, and the drop tiers, are in line.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.58] — 2026-10-18 (UTC)
### Fuller start-screen intro, battle music back to full tempo
- MUSIC-INTRO-BED-01: the first four bars of the start-screen song (`scheduleAttractStep` in `js/audio.js`) played only the low melody, so the song opened thin, and the loud chorus at the end of the 24-bar cycle stopped dead before the quiet intro began again. A new `scheduleAttractIntroBed` adds a soft chord pad on bars 0 and 2 (root, third and fifth, the first swell a little quieter) and, from bar 1, a harp-like arpeggio rising through the chord and climbing a little in level each bar, resting with the existing breath at the end of bar 3. On the last bar it lays a quiet tonic chord (root, fifth, octave) under the final beats that rings into the next cycle. All new notes are optional voices, so they give way under the start screen's voice limit, and they follow the key shift of each cycle. Diablo's composer gave each new environment at least 20 seconds to establish itself (Stay Awhile and Listen). The battle and idle music are unchanged.
- MUSIC-DRIVE-01: the wave music was reported as weaker than it used to be. Comparing every music change since 1.8.19, the largest loss of drive is MUSIC-COHESION-01 (1.8.35), which slowed the wave theme from 144 to 132 BPM and the boss theme from 152 to 132 to share the start screen's 88 BPM pulse. `MUSIC_COMBAT_TEMPO_BPM` returns to 144 and `MUSIC_BOSS_TEMPO_BPM` to 152 in `js/audio.js`, so the boss is again faster than a normal wave. The MUSIC-COHESION-01 contract check now requires 144 and 152 instead of 1.5 times the field tempo; the shared key check is unchanged. The shared key, the melody (MUSIC-THEME-01), the opening sting and everything else stay as they are. If the wave music still falls short, the next suspects are the 1.8.41 melody rewrite and the 1.8.43 cut to one riser per cycle.
- Checked: design contract clean, all self-tests pass, no console errors, the start screen runs a full music cycle without errors. Neither change has been heard; both need a listen.

## [1.8.57] — 2026-10-17 (UTC)
### Rare drops chime, inspect panel timed
- LOOT-RARITY-SOUND-01: Rare, Epic and Legendary gear now play a rising chime when they drop: 2, 3 or 4 bell notes of a major arpeggio in the score's current key, panned to where the item lands (`LOOT_DROP_SOUND_TIERS` and `spawnGroundItem` in `js/config.js`, `loot_drop` in `js/audio.js`). Common and Uncommon drops, food and items restored from a save stay silent. Diablo gave its ring drop a distinctive sound so players heard treasure before they saw it (Stay Awhile and Listen).
- HUD-DOM-PHASE-01: `updateInspectPanel` (`js/ui.js`) now times its DOM work into a new `inspectDom` render phase beside `hudDom`, so the debug log shows the whole cost of the page interface. The panel's code moved unchanged into `updateInspectPanelNow`.
- Checked: design contract clean, all self-tests pass, no console errors, the chime plays for each tier without error, waves play on desktop and phone.

## [1.8.56] — 2026-10-17 (UTC)
### The Hacker can summon the caravan, a circus and a troll
- HACK-SUMMON-01: the Hacker's menu (`openHackMenu`, `runHackAction` in `js/ui.js`) gains a Summon row: Summon the caravan, Summon a circus, Summon a troll. To share code with the random arrivals, `maybeSpawnCaravan` (`js/loop.js`) now calls a new `spawnCaravan`, and `maybeSpawnCircus` (`js/environment.js`) calls a new `setUpCircusAt`; the troll uses the existing `spawnWanderingTroll`. A summoned circus may stand on any free tile beside the road (`findFreeTileBesideRoad`), not only on freshly opened expansion tiles, so it works on any map. The CARAVAN-JOURNEY-01 contract check now reads `spawnCaravan`.
- VISITOR-LIMIT-01: at most one caravan, one circus and one troll can be on the field at a time, whether random or summoned. A summon that would make a second one shows a short toast instead ("The caravan is already here."). All three can be present together. At random this stays rare: the caravan has its own schedule, and the troll and circus share the two random-event slots per expansion. Checked: after six expansions, summoning all three gave one of each, and summoning them again changed nothing.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.55] — 2026-10-17 (UTC)
### Enemies react to a fallen ally, discovery medals, HUD timing in the debug log
- ENEMY-STARTLE-01: when an enemy dies, Tiny and Small enemies within 46 px give a short startled hop (`startleNearbyAllies` and `ENEMY_STARTLE_MS` 320 in `js/waves.js`, drawn through `walkBob` in the `Enemy` draw). Diablo's Fallen reacted to dying allies and Isbister lists awareness as a key enemy moment. Drawing only: movement, speed and timing are unchanged, and it is skipped under heavy visual load. It loops over `enemyPool` rather than `queryNearby` because a death can happen inside a loop that is reading the shared query results.
- DISCOVERY-MEDALS-01: three medals reward discovery rather than skill (Sid Meier's Memoir!, Civilization's discovery badges): Troll Spotter 🧌 when a wandering troll arrives (`spawnWanderingTroll`), Ringmaster 🎪 when a circus sets up (`maybeSpawnCircus`), Trader 🐪 on the first purchase from a merchant (`buyMerchantItem`) or sale to the caravan (`sellToCaravan`).
- HUD-DOM-PHASE-01: the debug log's render phases now include `hudDom`, the time `flushHUDIfDirty` spends writing the HUD to the page, which the canvas phases never counted (The WoW Diary: its interface cost ten times its frame budget before anyone measured it). The inspect panel is not yet timed.
- Not changed: splash damage still loops over every enemy (`Projectile.onImpact`). Switching it to the spatial grid could miss enemies spawned in the same frame and share the query results with chain lightning, so it stays as is.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.54] — 2026-10-17 (UTC)
### No red ring on enemy attacks, scattered walking blood trails
- NO-ATTACK-RING-01: an enemy attacking a stickman drew a red four-arc anger mark (`drawAngerMark` in `js/config.js`, called from the `Enemy` draw in `js/waves.js`) that read as a red circle popping up. The mark and its function are removed; the attack still shows through the lunge (`attackLungeAmount`) and the steam puffs (`drawAngerSteam`).
- BLOOD-TRAIL-SCATTER-01: a wounded enemy's walking trail (`updateBloodTrails` in `js/effects.js`) launched every drop from the body centre along the heading with only ±3° of drift at fixed spacing, so the trail formed straight lines. Drops now leave from alternating gait offsets across the line of travel (12 to 42% of the body radius plus jitter), drift up to ±16°, vary their carried speed ±15%, and fall at irregular spacing (45 to 155% of the base, with occasional close pairs). Each drop still lands through the forensic droplet physics, so its elongation still points the direction of travel.
- Checked: design contract clean, all self-tests pass, no console errors, waves play on desktop and phone.

## [1.8.53] — 2026-10-17 (UTC)
### Grunts keep one face
- GRUNT-ONE-FACE-01: about half of all Grunts spawned as 🤬 (the cursing face with the covered mouth) instead of 😡, picked from `ENEMY_EMOJI_VARIANTS.GRUNT` in `js/waves.js` since GRUNT-RED-01 (1.8.43). No other enemy changes face, so Grunts no longer do: the GRUNT entry is removed and every Grunt is 😡. The design contract in `js/diagnostics.js` now fails if a Grunt variant list returns or the Grunt emoji is not 😡.
- Correction to 1.8.52: the six-wave desktop and phone playthroughs were run after that release was built and passed.
- Checked: design contract clean, all 19 self-tests pass, no console errors, waves spawn on desktop and phone.

## [1.8.52] — 2026-10-17 (UTC)
### The stickmen are the towers: stickman code moves into js/towers.js
- STICKMEN-ARE-TOWERS-01: the stickmen are the towers, so the stickman figure, weapons and poses (`drawStickman` and its helpers, formerly `js/stickman.js`, split out in 1.8.47) now live in `js/towers.js` as the section STICKMAN FIGURES, WEAPONS AND POSES, just before the Tower class. The code moved unchanged. `js/stickman.js` is removed from `GAME_SCRIPT_ORDER`, the file map in `js/config.js`, the script tags in `index.html`, the README project layout and `AGENTS.md`. A parse of all ten files confirms no load-time statement uses a name from a later file (MODULE-FILES-01). The design contract fails if `js/stickman.js` is loaded again or `drawStickman` is not declared in `js/towers.js`.
- Checked: `release.py check` passes and the page boots with a clean design contract and all self-tests passing. The longer six-wave and phone runs were not repeated for this release.

## [1.8.51] — 2026-10-17 (UTC)
### Fairer crits and misses, a melody for building
- PRD-ROLLS-01: critical hits (`Enemy` damage path in `js/waves.js`) and every attack-miss roll (ranged and melee in `Tower`, splash in `Projectile.onImpact`, `rollDirectAttackMiss`) used a fresh `Math.random()` each time, so a 10% miss chance produced back-to-back misses 10% of the time and gaps of over 100 rolls between crits. They now go through `prdRollFires` in `js/config.js`: each stickman keeps a luck balance (`critLuckBalance`, `missLuckBalance`) that adds the stated chance on every roll and subtracts one when the event fires, and the chance used is nudged toward evening it (`PRD_LUCK_PULL` 0.5). Measured over 400,000 rolls: the average equals the stated chance to four decimals, including when it varies per roll (wind, the Tiny Grunt evasion bonus); back-to-back misses at 10% fall from 10.2% to 0.6%; the longest gap at 10% falls from 111 to 23. A first attempt with a per-roll step table (classic PRD) was measured drifting from 9.5% to 11.9% when the chance changed per roll and was replaced before release. Sid Meier's Memoir! (Civilization Revolution) and Game Balance Ch19-20. Self-test added (19 total).
- BUILD-MELODY-01: placing a stickman played the same `click` every time (`handleTap` in `js/ui.js`). It now plays `build_note`, the next note of a 12-note phrase (`BUILD_MELODY_STEPS`) in the score's current key (`musicShift`), so repeated building forms a tune, as SimGolf did (Sid Meier's Memoir!). Same length and level as the click.
- Arrival cues: the 1.8.50 backlog note said champions and the circus arrived with no cue; the code already shows "🛡️ STANDARD GUARD" for the champion phase and a sound, notice and clown honk for the circus. The backlog item is corrected and nothing was added.
- Checked at 1280x800 and at 390x780 with touch: design contract clean, all 19 self-tests pass at boot, no console errors or warnings, towers fight through two waves at 5x, the build melody cycles through all 12 notes, and a save round-trip loads without error. Miss rates in play match 1.8.47 (stated chance plus the Tiny Grunt evasion). Not compared: before/after renders; nothing visual changed.

## [1.8.50] — 2026-10-17 (UTC)
### Self-tests run at every boot, second reference-book review
- SELF-TESTS-AT-BOOT-01: the 18 self-tests in `runDebugSelfTests` (`js/diagnostics.js`) only ran when called by hand, which is how the wave-1 test stayed red from 1.7.38 to 1.8.49 unnoticed. The boot sequence at the end of `js/waves.js` now runs them once through `runBootSelfTests`, which restores `idCounter` and `enemySpawnSerial` afterwards so the run leaves no trace in game state, and `validateDesignContract` appends any failure (`bootSelfTestFailures`), so a failure appears in the console, in the design-contract line of every debug log and after the source scan re-runs the contract. `runDebugSelfTests(logResults)` skips its 18 console lines when called from boot. The run takes about 4 ms. Checked by forcing `calculateLeadIntercept` to return NaN: both lead-intercept tests were reported through the contract, and nothing was reported once it was restored.
- RELEASE-CHECKLIST-01 in `AGENTS.md`: the comment item now follows the existing comment-reference rule (short code comments, long rationale in the changelog) instead of forbidding new reference comments, and the rule names SELF-TESTS-AT-BOOT-01.
- `BACKLOG.md` gains a second reference-book section (Sid Meier's Memoir!, Stay Awhile and Listen, The WoW Diary, Better Game Characters by Design, Pitfalls of Object Oriented Programming), each item checked against the code: critical hits and misses use plain random rolls with no streak control, fighter placement repeats one click, champions and the circus arrive without a cue, build-menu help is hand-written text beside data in `CONFIG.TOWERS`, and DOM update cost is not in the render phases.
- Checked: design contract clean, all 18 self-tests pass at boot, no console errors, three waves start and spawn.

## [1.8.49] — 2026-10-17 (UTC)
### Wave-1 self-test matches the real wave, release checklist
- WAVE-ONE-COUNT-01: the self-test "wave 1 is ten sequential single Tiny batches" in `runDebugSelfTests` (`js/diagnostics.js`) had failed since 1.7.38, which gave every wave 1.5 times as many enemies (`ENEMY_COUNT_MULTIPLIER` in `js/waves.js`); HISTORY.md § [1.7.38] records wave 1 as 15 single Tiny batches by design. The test now compares the batch count with `tierPopulationForWave(1).TINY`, so it follows the multiplier and the road-length scaling (`scaledPopulation`) instead of a hard-coded 10. The wave itself is unchanged. The wave-1 problem text in `validateWavePlan` now says 15 instead of ten.
- RELEASE-CHECKLIST-01: `AGENTS.md` gains the per-release checklist (read before changing, reuse helpers, short why-comments only, contract and self-tests and console and a spawning wave checked over http, honest reporting, specific changelog, no unrequested pushes or deletes, failing self-tests fixed in the next release).
- Checked: design contract clean, all 18 self-tests pass for the first time since 1.7.38, no console errors, three waves start and spawn.

## [1.8.48] — 2026-10-17 (UTC)
### Every script file gets accurate section banners and a Contents list
- FILE-CONTENTS-01: each file in `js/` now opens with a one-line description and a Contents list of its section banners in order. `js/config.js`, `js/environment.js`, `js/towers.js` and `js/waves.js` gained the description line the other seven files already had.
- Stale banners left by the 1.8.43 and 1.8.47 splits are corrected: the duplicate file-title banners in `js/audio.js` and `js/ui.js` are removed; "ENTITY CLASSES: TOWER" and "ENTITY CLASSES: PROJECTILE" in `js/loop.js` (over `pointSegmentDist2` and the particle pool) become GEOMETRY HELPERS and PARTICLE POOL; "ENTITY CLASSES: PROJECTILE" in `js/environment.js` (over `activeBarricades`) becomes ACTIVE BARRICADES; the truncated "SCENERY (rocks & trees" title is completed.
- Oversized mixed sections are split with new banners and no code moved: GAME STATE in `js/config.js` (about 2,000 lines) into twelve topics from the economy to save files; MAIN LOOP in `js/loop.js` into update, target frame, render, debug overlay, performance diagnostics, attract screen, caravan and the frame loop; `js/environment.js` into twenty topics including telemetry, depth sorting, ground painting and flags; plus coins and HUD flights in `js/effects.js`, menus and settings in `js/ui.js`, wave start and huts in `js/waves.js`, and sound-effect dispatch in `js/audio.js`.
- The design contract checks each file's Contents list against its banners (`contentsListMatchesBanners`, `sourcesByScriptFile` and `gameScriptSources` in `js/diagnostics.js`), so the lists cannot drift; skipped on `file:` like the rest of SOURCE-SCAN-01. Rule added to `AGENTS.md`.
- No behavior change: only comments and the new contract check differ. Checked: design contract clean, the self-tests match 1.8.47 (the existing wave-1 batch check still fails, unrelated), no console errors, and three waves start and spawn.

## [1.8.47] — 2026-10-16 (UTC)
### Game shell split into seven files, AI-assisted coding note, fuller README
- FILE-SPLIT-01: `js/config.js` still held about 13,160 lines after AUDIO-SPLIT-01 (1.8.43). It is now split along its existing section banners into `js/config.js` (settings, balance numbers, object pools, game state, toasts, medals, saves and the camera), `js/effects.js` (blood, decals, particles and gibs), `js/stickman.js` (stickman figures, weapons and poses), `js/loop.js` (spatial hash, collisions, the main loop, update and render, the attract screen and the caravan), `js/ui.js` (canvas and input setup, HUD, menus, the Shop, the inspect panel and the pause, speed and zoom controls), `js/diagnostics.js` (the debug log, README export, the design contract and the self-tests) and `js/screens.js` (start and end screens and the first-play cues). The code moved unchanged, each file in strict mode. One block changed position: the inspect panel and the pause, speed and zoom controls, which sat after the debug log, now close `js/ui.js`, so the debug log sits with the design contract. A parse of all eleven files confirms no load-time statement uses a name from a later file (MODULE-FILES-01). `GAME_SCRIPT_ORDER` in `js/config.js` lists the load order; the design contract fails when the script tags in `index.html` differ from it, and `release.py check` fails when a file in `js/` has no script tag. Checked: no load errors, the design contract passes, the wave-6 save loads and plays, the start screen and a gameplay frame render at 1280x800 and 390x780, Space pauses and resumes, and the speed buttons, zoom buttons and inspect panel work.
- AI-DISCLOSURE-01: Settings > About carries a small note, "Coding assisted by Claude (Anthropic). Design is human." (`#aboutAssistNote` in `index.html`, sized to fit one line on phones), and the same line appears in the README and in the in-game README text (`AI_ASSIST_NOTE`, `getReadmeText` in `js/ui.js`). The design contract and `release.py check` fail if it is missing.
- README-SECTIONS-01: the 1.8.5 README rewrite (commit `831f83b`) dropped the How to play, Enemies and waves, Resources and structures, Items and Settings sections that the README voice rule in `AGENTS.md` lists. They are back, rewritten from the 1.8.1 text (commit `b504c58`) without tuning numbers, with the Vault, campfires, the merchant caravan, biomes, the animals beside the road, the starting barricade on the finish tile, and the new script files in the project layout.

## [1.8.46] — 2026-10-16 (UTC)
### Early runs survive one leaky wave, messages no longer overwrite each other
- LOOSE-DRAIN-GRACE-01: a scripted opening (Swordsman and Archer first, one more fighter after wave 1, more built every few seconds) lost the whole run in wave 2 or 3 on both 1.8.41 and 1.8.45: about 13 escapes cost 13 lives, then the escaped enemies drained 86 more, one life every 6 seconds each (LOOSE-DRAIN-01). In waves 1 to 3 an escape still costs its one life and a loose enemy still hunts stickmen, but it no longer drains lives (`LOOSE_DRAIN_FIRST_WAVE` 4 in `js/environment.js`, applied in `Enemy.updateEscaped`). The same opening now clears wave 2 with 72 to 87 lives and wave 3 with 69. Kingdom Rush and Plants vs. Zombies cost one life per leak in their opening levels. Design contract checks the rule.
- TOAST-QUEUE-01: a toast replaced any toast still on screen, so messages fired together were lost: on the first kills the item guide was replaced by "Map found" in the same millisecond, and at a wave clear the gift, caravan, tip and drop messages replaced each other. A toast now waits its turn while another is showing (`isToastBusyWithOther`, `queueToastMessage`, at most `TOAST_QUEUE_MAX` 4 waiting, duplicates dropped); every message is still kept in the notification inbox.
- TELEMETRY-CATALOG-01: `item_drifted` (an item drifting to a stickman) was sent but missing from `TELEMETRY_EVENTS`, so it was never recorded and printed a console warning each time. It is now declared with its `item` and `tower_type` parameters; it is the only event the code sends that was missing.

## [1.8.45] — 2026-10-16 (UTC)
### Out-of-reach hint, save tip after wave 3, shorter early messages
- REACH-HINT-01: a fighter placed where no road tile is within his range now gets a one-time hint, "Too far from the road to hit anything." (`fighterReachesRoute`, `hintIfFighterOutOfReach`, called from `handleTap` after a fighter is built; shown once through `showTutorialTipOnce`). Plants vs. Zombies shows such hints only after the mistake (BACKLOG genre comparison).
- SAVE-TIP-01: the third wave clear suggests saving once, "Good stopping point. Save from ⚙️ Settings." (`SAVE_TIP_WAVE` 3 in `maybeShowWaveTutorialTip`), so a short first session ends on a win with a way to keep it.
- FIRST-ALERT-SHORT-01 (extended): the remaining early messages are cut to the eight-word standard: the wave-1 gift ("First spoils! Drag it onto a stickman." in `grantEarlyGift`), the map drop (`dropItemsFromEnemy`), the item guide (`maybeShowItemGuide`) and the caravan arrival. They say "Press" instead of "Click" or "tap", so the wording fits mouse and touch.
- Design contract checks REACH-HINT-01 and SAVE-TIP-01.

## [1.8.44] — 2026-10-16 (UTC)
### Faster first kills, shorter first-time alerts
- FIRST-KILLS-01: a wave-1 Tiny Grunt held by a Swordsman took about 4 to 8 seconds to die, where the genre's first enemies fall in one or two hits (BACKLOG genre comparison, 1.8.43). Wave-1 units now spawn with 60% hit points (`WAVE_ONE_HP_SCALE` 0.6, applied in `spawnWaveUnit` when the strength wave is 1); bounty, XP and later waves are unchanged. Design contract checks the rule.
- FIRST-ALERT-SHORT-01: three first-time alerts ran 13 to 17 words; Plants vs. Zombies keeps on-screen hints to eight words. The escape alert reads "An enemy escaped. It will attack your towers." (`js/waves.js`, enemy escape), the breakaway alert "An enemy left the path. Protect your tower!" (`js/waves.js`, breakaway), and the overrun alert names the fighter and "overrun. Recovers in a few rounds." (`js/towers.js`, `FIRST_TOWER_DOWN_SEEN_KEY`).
- WAVE-CLEAR-CHECK-01: the wave-clear test in `update` repeated the route-enemy filter by hand; it now calls `waveRouteObligationsOutstanding` (`isRouteObligation`, OPENING-PACE-01), so the opening pace and the wave-clear test share one definition of an enemy still owed to the route.

## [1.8.43] — 2026-10-16 (UTC)
### Faster opening, closer start view, Santa bar, phone target card, victory cheer, close calls, red Grunts, unique item icons, wider biomes
- OPENING-PACE-01: owner agreed the start was slow. Wave 1 released one enemy only after the previous one died and every wave waited 5 s between units, so the first minutes had about 13 s of waiting per enemy. Waves 1 and 2 now space units 2.5 s apart (`OPENING_SPAWN_GAP_MS`, `OPENING_PACE_LAST_WAVE` 2, `spawnGapForWave`), and wave 1 lets two enemies walk the route at once (`WAVE_ONE_MAX_ON_ROUTE`, `routeObligationCount`, `isRouteObligation` in `js/waves.js`); waves 3 on keep `ENEMY_SPAWN_GAP_MS` 5000 (ENEMY-PACE-01). The first enemy still walks out at GO, 3 s after Start Wave. Design contract checks the rule.
- START-ZOOM-01: at the owner's request the opening view is closer on the starting patch: `FIT_MAX_ZOOM` 2.45 (from 2.1, set 1.6.154; 2.7 was too close). Screens that cannot fit the patch at 2.45 still fit it (a 390-pixel phone opens at about 2.44x). The wasteland stump placement (`spawnWastelandStumps`) uses the same value, so its branches stay in view.
- SANTA-CONSENT-BAR-01: the Santa analytics notice covered the whole title screen with a dark overlay before the player saw the game. It is now a slim bar along the bottom (`#consent-banner`, `#consent-inner`, `#consentActions` CSS in `index.html`) with the same Santa face, text, two buttons and consent logic; on phones the buttons sit side by side under the text, and the graphics picker moves up above the bar while it is shown.
- PHONE-TARGET-CARD-01: on phones the targeting card took about 157 pixels of a 780-pixel screen. Below 640 pixels wide it keeps every stat but packs them three to a row with a 40-pixel portrait and a thinner health bar (about 110 pixels tall).
- TARGET-SPEED-01: the enemy card showed Speed 0 for any enemy waiting at a barricade, which read as a broken stat. Its walking speed now stays on the card and the effects line says Blocked; Frozen and Stunned enemies still show 0. Shield uses 🔰 instead of repeating Armor's 🛡️.
- AUDIO-SPLIT-01: `js/config.js` held the whole game shell, about 14,800 lines. The sound engine, synthesized effects and adaptive music (`SoundEngine`, `audioEngine`, `playSound`, `unlockAudio`, the music tables, about 1,670 lines) now live in their own file, `js/audio.js`, loaded before `js/config.js`. The code moved unchanged, in strict mode as before; the file map at the top of `js/config.js` lists the five files and their load order. Checked: no load errors, sounds play, the music scheduler advances, the design contract passes.
- CRISP-MAP-01: the map bitmap is baked at one pixel per world unit (two on high-density phones), so at the 2x to 4.7x zoom most play happens at, tile edges, grass tufts and path pebbles were stretched and soft, the blurry look in desktop and phone screenshots. Above 1.25x zoom the map is now drawn at screen resolution into a layer with a 256-pixel margin (`drawCrispMap`, `CRISP_MAP_MIN_ZOOM`, `CRISP_MAP_MARGIN_PX`) and reused until the zoom, canvas, a map repaint (`mapBakeRevision`, bumped by `rebakeMap` and the three partial map repaints) or a pan past the margin changes it. While the zoom is still changing, and while a new ring of tiles is revealing, the baked bitmap is shown as before, so camera moves and the reveal animation are unchanged. A repaint costs about 1 ms and happens only when the camera settles.
- ZOOMED-DECAL-CACHE-01: above 1.25x zoom, where most play happens, every settled blood mark was redrawn one by one every frame, because the world-resolution settled layer is too soft up close; with the 4200-mark High budget that measured about 6 to 8 ms per frame. Settled marks are now drawn once into a screen-resolution layer with a 256-pixel margin (`drawZoomedSettledDecals`, `ZOOMED_DECAL_MARGIN_PX`) and reused until the zoom, canvas, settled marks (`settledDecalRevision`) or a pan past the margin changes; fresh marks still draw live on top. The same 4200 marks now cost about 0.1 ms per frame. Compared against the old drawing, 103 of a million pixels differ in alpha by more than 24 of 255, from 8-bit rounding where hundreds of translucent drops overlap.
- COLLISION-QUERY-EXACT-01: with a crowd on the road, enemy collision was the most expensive part of each simulation tick (about 5.5 ms per tick with 220 enemies, multiplied by every tick at 5x and 10x). Each enemy searched a padded 5 by 5 block of tiles and then spent half its capped 48-neighbor list on pairs it skips. `resolveEnemyCollisions` and `resolveSweptEnemyCollisions` now ask `queryNearby` for exactly the tiles an overlap can reach (`exactCells`, reach from the largest active enemy, `largestActiveEnemyRadius`) and reject already-handled pairs first (COLLISION-ORDER-01). Collision time dropped about 40% (11 ms to 6 to 7 ms per two ticks in the same seeded crowd) with the same settling: 306 against 308 pixels of total remaining overlap.
- SCENERY-SHADOW-PAN-01: panning still repainted the scenery shadow layer every frame (SCENERY-SHADOW-CACHE-01 only skipped repaints while the camera was still). The layer is now painted with a 256-pixel margin around the screen (`SCENERY_SHADOW_MARGIN_PX`, `repaintSceneryShadowLayer` in `js/environment.js`), so a pan slides the painted layer and repaints only once the camera has moved past the margin or the zoom or visible scenery changes. Compared pixel for pixel against the 1.8.41 shadow drawing at five camera positions and three zooms, including whole and fractional pans: identical.
- CARAVAN-LOAD-01: loading a save reset the caravan's visit history, so every load past round 3 guaranteed the first-visit merchant after the next round. A loaded run past round 3 now keeps the normal 40% chance (`caravan.lastRound` set from `wavesCompleted` in the save loader).
- EMOJI-SPRITE-LRU-01: when the emoji sprite cache filled (384 sprites, reached over long sessions with zooming), it cleared every sprite at once, so every emoji on screen was re-rasterized in the next few frames, a guaranteed stutter. `emojiSpriteFor` now drops only the least recently drawn quarter (`evictStaleEmojiSprites`, `lastUsed`), and the text sprite cache (640) drops its oldest quarter instead of clearing.
- ITEM-ICON-UNIQUE-01: four items shared an emoji with a class. Glass Marble is now 🫧 (was the Mage's 🔮), Lightning Bolt 🌩️ and Defibrillator 🩺 (were the Snap Caster's ⚡), and Phoenix Ember 🪔 (was the Blow Gunner's ♨️). Saves store item ids, so carried items keep working. The design contract now fails if any item shares a class emoji; the Barricade item is the Barricade itself and keeps 🚧.
- BIOME-WIDE-01: biome patches are larger (`BIOME_PATCH_TILES` 11, from 8) and the meadow band between Pinewood and Dunes is wider (`tileBiome` thresholds 0.36 and 0.64, from 0.38 and 0.62). Pinewood and Dunes still never touch.
- WORKFLOW-NODE24-01: the release workflow warned that its actions target the retired Node.js 20 runtime. `.github/workflows/release.yml` now uses the first Node.js 24 major of each official action (`checkout` v5, `setup-node` v5, `setup-python` v6, `setup-java` v5, `upload-artifact` v5, `download-artifact` v5); inputs are unchanged. `android-actions/setup-android` v3 and `attest-build-provenance` v2 are left as they are.
- COMBAT-RISER-01: the wave and boss music played a two-bar rising sweep every 8 bars, so a quarter of every battle cycle was sweeping. `scheduleCombatLayers` now plays one sweep per 24-bar cycle, in the two bars before the key change, at a lower level (0.35, boss 0.6, from 0.55 and 0.8). The opening sting's riser and the idle music's sweeps are unchanged.
- GRUNT-RED-01: 1.8.41 gave Grunts yellow faces (😠 😤) among their variants, so a Grunt no longer read as the red enemy. Grunt variants are now only the red 😡 and 🤬, and Swarm keeps 🐜 and 🪲 without the red ladybug (`ENEMY_EMOJI_VARIANTS` in `js/waves.js`).
- WAVE-CHEER-01: when a wave is cleared, every standing fighter raises his weapon and hops for 1.8 seconds (`WAVE_CHEER_MS`, `WAVE_CHEER_HOP_PX` 5, `waveCheerUntil`, set where `wavesCompleted` increments; drawn in `Tower.draw`). Each fighter hops on his own beat, his ground shadow stays on the ground so the hop reads as a jump, and reduced-motion players see the raised weapon without the hop. Downed fighters do not cheer.
- CLOSE-CALL-01: an enemy killed within about one tile of the finish freezes the action for 140 ms and shows CLOSE! (`CLOSE_CALL_RADIUS_PX` 70, `CLOSE_CALL_FREEZE_MS`, at most once every 4 seconds through `lastCloseCallAt`), reusing the boss-kill freeze (`hitStopUntil`).

## [1.8.42] — 2026-10-14 (UTC)
### Scenery shadows drawn once instead of every frame
- SCENERY-SHADOW-CACHE-01: the scenery shadow layer (SCENERY-SHADOW-UNION-01, 1.8.32) was cleared, repainted and laid on the ground every frame, which forces the browser to flush that layer each frame. On the wave-6 save at 2x zoom this cost about 24 ms of every frame (17 ms at 1x), the same scenery-drawing phase behind the 120 to 669 ms spikes in the 1.8.35 debug log. `paintSceneryGroundShadows` in `js/environment.js` now repaints the layer only when the camera, canvas size, graphics quality or any scenery item's position, size or kind changes (`sceneryShadowSignatureFor`); otherwise it lays down the layer it already painted. The same scene now draws in about 1 to 2 ms a frame with the camera still. Shadows look the same; while the camera pans the layer still repaints each frame.

## [1.8.41] — 2026-10-14 (UTC)
### Merchant journey, spearman sweep, new wave theme, early-wave hook, smoother biomes
- CARAVAN-JOURNEY-01: the merchant appeared on the first road tile the moment a round ended. He now enters from beyond the map edge along the line of the road (`caravanEdgePoint`), crosses the bare ground, passes the spawn flags, follows the road to the finish carpet and leaves past it off the far edge, where `releaseCaravan` clears him (`phase` 'approach', 'path', 'exit' in `updateCaravan`). His arrival sound plays when he first comes into the map. While he is on the map a 👳 hangs under the Shop button and wags every few seconds (`#caravanWag`, `syncCaravanWag`).
- CARAVAN-LOOK-01: the wagon is redrawn with a canopy, plank bed, spoked wheels, a drawn camel (hump, long neck) whose legs swing with the walk, the 👳 driver and a smaller bag marker, and its flat ellipse shadow is one swept shadow (`fillSweptShadow`) that falls back and to the right like every other shadow.
- BIOME-GRADIENT-01: grass, swamp-green and desert patches were hashed per 5-tile cell, so a tile row could go meadow, pinewood, dunes in three tiles. `tileBiome` now reads one smooth noise field (`biomeNoise`, 8-tile cells, gentle warp) ordered Pinewood, Meadow, Dunes, so Pinewood and Dunes never touch and every change passes through a meadow band. Biomes are a function of tile and run seed, so a loaded save repaints its far tiles in the new layout.
- EARLY-HOOK-01: waves 1 to 5 were all Grunts, the first new enemy arrived at wave 6 and the opening waves ended quickly whenever the field was clear. Wave 1 stays the gentle one-at-a-time lesson of 15 Tiny Grunts; wave 2 mixes 9 Small Grunts in with 27 Tiny ones (`EARLY_WAVE_POPULATION`). Waves 1 and 2 never rush the five-second unit spacing (`EARLY_NO_RUSH_LAST_WAVE`, `rushDispatchIfFieldClear`), so together they take about five to six minutes at 1x. A new kind of enemy guests ahead of its chapter every few waves in Tiny and Small slots (`EARLY_PREVIEW_BY_WAVE`: Swarm at waves 2 and 3, Wolf at 4 and 5, Runner at 7 and 8), wave 4 adds two Standard-size champion Grunts, and wave 5 keeps its Large Mastery pack. Clearing wave 1 always leaves an Uncommon item beside a stickman (`grantEarlyGift`), and the first merchant caravan always comes after round 3 instead of a 40% chance after round 5 (`CARAVAN_FIRST_ROUND_AFTER` 2); his first visit comes even before the player has wood or stone, and later visits keep the 40% chance, the 2-round gap and the need for wood or stone. The wave validator allows the guests before their own introduction wave; all 100 campaign plans validate.
- ENEMY-EMOJI-VARIETY-01: Grunts wear one of 😡 😠 🤬 😤 and Swarm one of 🐜 🪲 🐞 per unit, chosen from the wave seed (`ENEMY_EMOJI_VARIANTS` in `spawnWaveUnit`), so a wave reads as a crowd.
- CATCHUP-REASON-01: the debug log's single catch-up counter mixed the speed tick cap with the camera's 6 ms update budget. A new line, "Catch-up by reason", counts camera-budget exits and their dropped simulation time separately (`cameraBudgetCapHits`, `cameraBudgetDroppedMs`).
- MENU-EXCLUSIVE-01: opening the Shop, Settings, a stickman's panel, the hack menu or the cooking dialog now closes the build menu if it is open (`closeBuildMenuIfOpen` in `js/config.js`), so two panels never stack.
- MUSIC-BIP-01: the wave and boss themes gain quiet high plucks in the melody's rests (`scheduleMusicStep`): each one repeats the note before it an octave up, on alternating rests only, at about a fifth of the lead's level, and is dropped first when the voice budget is tight. A 24-bar run gives 42 bips against 190 lead notes.
- LOOSE-GLOW-CACHE-01: each loose enemy built a new radial gradient every frame for its red glow; `looseEnemyGlowSprite` in `js/waves.js` now caches one sprite per radius and pulse step (8 steps, 96 sprites max). Ground items drop their text halo (`shadowBlur`) while `underHeavyVisualLoad` is set, as the tower halos already do. The debug log you sent showed its 120 to 669 ms spikes in scenery drawing, which the 1.8.40 blood-stamp cache already addresses; these two are the remaining per-frame costs found by auditing every gradient, `shadowBlur` and `getImageData` call.
- CHANGELOG-SCROLL-01: the Changes tab had its own scroll box inside the settings scroll area. `.settings-changelog` no longer sets its own height, so the settings body scrolls once.
- SPEARMAN-SWEEP-01: the Spearman now sweeps its spear through a 234 degree arc (`SPEARMAN_SWEEP_ARC_FRACTION` 1.3, wider than the Berserker's 198), hitting everything in the arc at its full reach, with the swing smear and a sweeping weapon instead of a fixed thrust. The Lancer keeps its precise thrust.
- SPEARHEAD-01: the spear's shaft ran to the very tip and a small flat triangle sat behind it. The shaft now stops at the blade and a leaf-shaped head (12 px, 14 px on the Lancer) forms the tip.
- KILL-READY-01: after a kill a stickman keeps the weapon raised for four seconds (`POST_KILL_READY_MS`, `lastKillTime`, set in `Enemy.die`) before the idle pose begins, for ranged and melee alike.
- MUSIC-THEME-01: the wave theme played degrees of whichever chord was sounding, so the melody only shuffled around five notes. `MUSIC_WAVE_THEME` is a real 24-bar tune in absolute semitones over Dm Dm F C / Dm Gm F Dm / Dm C Gm Dm: a heroic rising call answered higher, a climbing sequence through Gm and F, then a soaring section that lands home. Boss waves flatten the second for the darker mode.

## [1.8.40] — 2026-10-14 (UTC)
### Acid squirt gun, troll entrance, special stickmen, lag
- ACID-COAT-01: the Dual Squirt Gun was far too strong (14 damage at 140 ms plus 10 poison). Its shots now do 2, 3 and 5 damage on a 340, 300 and 260 ms cooldown and splash green acid (`acidRadius` 34, 40, 46 px) that coats every enemy in reach. Coats stack up to three times (`ACID_MAX_STACKS`, one new stack per 450 ms per enemy), each stack burns for `acidDamage` per 600 ms and slows like glue by `acidSlow` (10, 12 and 15% per stack), and the coat lasts 3.6 to 4.2 seconds. `coatEnemiesInAcid` in `js/towers.js`, `Enemy.applyAcidCoat` and the acid tick in `js/waves.js`, a green tint with a drop per stack on the enemy, green pellets.
- GUN-FACING-01: the 🔫 glyph is drawn muzzle-left, so the Squirt Gun and Gunalinder held it backwards. `drawGunEmoji` mirrors it so the muzzle leads along the aim and keeps it upright when aiming left.
- TROLL-ENTRANCE-01: the wandering troll no longer appears on the finish tile and charges. `pickTrollEdgeSpawnPoint` places it on the map edge, `buildTrollEntranceRoute` walks it across the bare ground into the grass and to three spots along the grass rim, and `walkTrollEntrance` moves it without attacking until the route is done.
- BUILD-MENU-GROUPS-03 and SPECIAL-ONE-01: every unlocked stickman (Axeman, Spearman, Blowdart, Marksman, Cleric, Dual Squirt Gun, Bomber and the rest) now stands in Stickmen Defenders instead of under Structures, and every special stickman is limited to one on the board; a taken one reads "(already active)" instead of "(already on the field)" and its blurb says only one can be active (`isTowerTypeAvailable`, `appendUnlockableRow`).
- BLOOD-STAMP-CACHE-01: marks on rocks and trees were re-rasterized every half second and read their sprite back from the canvas for every new mark, which can stall a frame at high zoom. A held stamp is now rebuilt only when a mark is added or the round-end fade runs, and the sprite pixel map is read once per sprite shape (`surfacePixelCache`). Stickman limbs draw at most 16 marks (`STICKMAN_STAIN_DRAW_MAX`).

## [1.8.39] — 2026-10-14 (UTC)
### Road character and no more staircases
- ROAD-CHARACTER-01: roads kept growing as one diagonal staircase because the common TURN style turned on every step. Measured over 60 seeded runs, 73% of turns were staircase turns. `orderRoadDirections` now makes TURN and HOOK go straight for a tile between turns (19% staircase turns), and HOOK curls the same way for the whole run (`roadCurlDirection`). Each run draws one road character from its seed in `roadCharacterForRun` (`ROAD_CHARACTERS`: MEANDER 40%, COILING 25%, LONG 20%, WANDERING 15%) that sets the growth-style weights, so coiling, spiral-like roads now appear and roads differ run to run. Spacing and exit rules are unchanged, so a road still never cuts itself off.

## [1.8.38] — 2026-10-14 (UTC)
### Layered blood on scenery and stickmen, tidy stack counts
- BLOOD-LAYER-01: marks on rocks, trees and stickmen overwrote an arbitrary older mark once 14 were stored, so splatter vanished in one spot and reappeared nearby, and older marks were painted over newer ones. `stainEntity` now drops only the oldest mark, `BLOOD_STAIN_MAX` is 64 (low graphics and heavy load still draw 6), `drawBloodStains`, `drawStickmanBloodStains` and `drawEmojiSurfaceBlood` paint oldest first so the newest lies on top, `bloodStainLifeT` holds marks steady until round-end clean-up, which fades them over six seconds. High graphics now keeps 4200 ground decals (`MAX_DECALS`, was 2100, so the ring no longer recycles a wave's blood; the 2100 budget stays selectable as Classic) and allows 40 ground marks per patch (`BLOOD_SATURATION_MAX_HIGH`) instead of 10.
- SLOT-COUNT-01: stack counts such as x2 on honey are a small corner badge (`data-count`, CSS in `index.html`) set by `updateQuickSlots` and `renderInventorySlots`, instead of text beside the icon.

## [1.8.37] — 2026-10-14 (UTC)
### Countdown music and spawn camera, settling escapees, item drift, vault, bee honey, steady blood
- MUSIC-COUNTDOWN-01: the wave theme used to cut in as soon as Next Wave was pressed. The idle music now plays on into the 3-2-1 under a short riser, and `advanceCountdownMusic()` in `js/config.js` starts the wave or boss theme `waveMusicLeadMs()` before GO so its three brass pickups fall on the countdown and its bass drop (MUSIC-STING-02) lands exactly on GO!. Waves that begin with enemies still loose keep their wave music as before.
- LOOSE-SETTLE-01: an enemy that passes the finish line now stands still for 20 to 30 seconds (`LOOSE_SETTLE_MIN_MS`, `LOOSE_SETTLE_SPREAD_MS` in `js/waves.js`, set in `reachEnd()`), then heads for the closest stickman wherever it is and keeps choosing the closest one if its target falls. It used to wander the grass and attack only stickmen it came near, so `LOOSE_NOTICE_RADIUS` is removed. The lives it drains while loose are unchanged. Wander code remains only for the case where no stickman is standing.
- SCENERY-SHADOW-UNION-01 follow-up: the merged tree-shadow layer cleared and laid down the whole canvas every frame, which can cost a few milliseconds of copying that the frame timer does not show. `paintSceneryGroundShadows()` now clears and lays down only the box the shadows occupy.
- BLOOD-STABLE-01: blood on the ground used to recolour as it aged and was re-stamped in steps whenever the settled-blood layer was rebuilt, so older splatter visibly changed when a new splatter landed, and marks faded or expired in the middle of a fight. Now a mark keeps the colour it landed with (`agedBloodRgb()` in `js/config.js`: red blood stays fresh red, other blood keeps its own colour, FRESH-BLOOD-01 otherwise unchanged), holds still without fading or expiring until the round-end clean-up (`decalAgeMs()`, `BLOOD_HOLD_LIFE_T`), is no longer re-stamped on a timer, and new splatter simply lies on top. The round-end clean-up (`beginRoundDebrisCleanup()`) now fades every held mark over the same final six seconds instead of removing the ones that had outlived their old lifespan at once. Marks created between waves and blood stains on stickmen, enemies and scenery are unchanged.
- VAULT-01: a new 🏛️ Vault in the Build menu, a structure that only stores items. It has 18 slots (three rows of six, like a stickman's inventory in rows) and two upgrades that each add a row of six (24, then 30). Cost: a little gold and wood and a lot of stone (`PRODUCER_DEFS.VAULT` in `js/config.js`: 60 gold, 70 wood, 320 stone, growing 1.6 times for each vault already built); upgrades cost wood and stone only (90 wood and 480 stone, then 150 wood and 800 stone). Drag items in from the ground or from a stickman (food is stored, not eaten) and drag them out again; gear inside gives no bonus, nothing is used by clicking, and the inspect panel shows the holder's slot count (`renderInventorySlots()`, `itemCapacityOf()`). It does not fight, cannot be moved, can be attacked like the other structures and, when sold, puts its items back on the ground. It is saved like any structure and draws a gold fill bar for how full it is. Items on the ground do not drift into a vault by themselves.
- BEE-HONEY-02: a bee made honey on a fixed 60-second timer. `updateBeeHoney()` in `js/environment.js` now draws a random 5 to 10 minute wait after each honey (`BEE_HONEY_MIN_MS`, `BEE_HONEY_SPREAD_MS`), the way a Minecraft chicken lays eggs. The elapsed time is still saved with the bee; the wait is drawn again when a save is loaded.
- ITEM-DRIFT-02: loose items wait 20 to 30 seconds after they land (`ITEM_DRIFT_DELAY_MIN_MS`, `ITEM_DRIFT_DELAY_SPREAD_MS`, stored as `driftAt`) before they start to move on their own, so the player has time to drag them first, and then only drift to the closest stickman that can actually take them (`towerCanTakeDriftItem()` in `js/environment.js`: a free item slot or a matching stack). Before, an item walked toward the closest stickman even when that stickman's inventory was full and then sat beside it; now, with no stickman able to take it, it does not move at all.
- CAMERA-SPAWN-01: the wave-start pan now centres on the spawn tile where enemies appear instead of the exclamation mark above it, so the marker and the numbers sit above the middle of the view rather than being the focus. `SPAWN_MARKER_RISE_PX` still places the marker itself.

## [1.8.36] — 2026-10-14 (UTC)
### Start-screen music eases into each part
- MUSIC-ATTRACT-EASE-01: the start-screen sections (intro, two verses, build, chorus) used to jump straight to their full level, so kick, snare and hats arrived heavy. `attractEasedLevel()` in `js/config.js` now glides each section from the previous section's level to its own over its first half with a smooth curve, and the two bass drops are softer (0.65 to 0.4 and 1 to 0.8). The intro also loses the held root-and-fifth drone and the octave pad that sounded like a bagpipe: the pads now join in the first verse and the oboe answer in the second, so the opening is only the soft warm motif. Section levels, chords and tempo are unchanged.

## [1.8.35] — 2026-10-14 (UTC)
### One key and one pulse across all the music
- MUSIC-COHESION-01: the start screen was in C minor while the field, wave and boss themes were in D minor, and the four themes ran at 88, 104, 144 and 152 BPM. The start screen now plays the same i, VI, VII, V progression in D minor as the field theme (`MUSIC_ATTRACT_TONIC` 50, chords 38, 34, 36, 45), and the tempos share one pulse: start screen and field 88 BPM, wave and boss 132 BPM (1.5 times). The boss keeps its Phrygian mode, faster drums and extra volume to stay distinct. All themes keep rotating keys together through `musicKeyShift()`.

## [1.8.34] — 2026-10-14 (UTC)
### Fewer voices at the opening, the theme stated right after the drop
- MUSIC-OPENING-01: when a wave or boss theme starts, the first bar now plays only the sting (pickups, riser and the silence before the drop), with no groove, hats, layers or melody under it, so the drop lands cleanly. The bar after the drop plays the rising leitmotif in brass over the groove and holds back the regular melody, so the theme is heard on its own before the song proceeds. Both bars are tracked by `musicBarRole` in `scheduleMusicStep()`.

## [1.8.33] — 2026-10-14 (UTC)
### Path to Victory opening: a bass drop on the downbeat
- MUSIC-STING-02: the four evenly spaced brass hits and long sweep that opened the wave and boss themes are replaced. `scheduleMusicSting()` in `js/config.js` now plays three rising brass pickups (`MUSIC_STING_PICKUPS`, each with a timpani stroke and growing in volume), a short riser through the last half bar, then lands the bass drop on the next downbeat (`MUSIC_STING_DROP_STEP`, one bar after the start) together with a timpani stroke, a crash and a held brass power chord. Boss waves use the same shape, louder.

## [1.8.32] — 2026-10-14 (UTC)
### Overlapping tree shadows no longer double-darken
- SCENERY-SHADOW-UNION-01: where one tree's shadow crossed another's the ground was darker than under either (each shadow was a separate 24% black fill). `paintSceneryGroundShadows()` in `js/environment.js` now paints the silhouette shadows fully dark into one layer (`beginSceneryShadowLayer()`) and lays the layer on the ground once at `SCENERY_SHADOW_STRENGTH` (0.24), so overlaps match the rest of the shadow. `drawEmojiGroundShadow()` in `js/config.js` gains an optional `strength` argument (default 0.24, so tower and enemy shadows are unchanged). The box shadow (0.3) and the branch shadow keep their own strengths and are still painted directly. Shadow shapes, sizes and strengths are unchanged; the same idea already governs the batched enemy shadows (ENEMY-SHADOW-BATCH-01) and the box shadow (BOX-SHADOW-01).

## [1.8.31] — 2026-10-14 (UTC)
### Shadows never cross a tree
- SCENERY-SHADOW-PASS-01: `drawOneSceneryItem()` in `js/environment.js` painted each item's ground shadow immediately before its sprite, so a shadow drawn later (a neighbouring tree, rock or box standing at the same depth) lay across the sprite of the item drawn before it, such as the trunk of the tree beside it. The shadow code is now `drawSceneryGroundShadow()` (with `sceneryEmojiFor()` for the shared glyph choice) and runs for every scenery item in one pass before any sprite in the world draw loop, as the batched enemy shadows already do (ENEMY-SHADOW-BATCH-01). The shadow shapes, sizes and strengths are unchanged.

## [1.8.30] — 2026-10-14 (UTC)
### Animals and bees avoid enemies
- LIVESTOCK-AVOID-01: `Enemy.steerAroundEnemies()` in `js/waves.js`, called from `updateLivestockWander()`, bends the heading of every wandering animal and bee away from, and to the side of, active enemies within the enemy's radius plus its own plus `LIVESTOCK_AVOID_MARGIN_PX` (26), harder the closer the enemy is (`LIVESTOCK_AVOID_STRENGTH` 2.2). Walking speed is unchanged. Hostile hunters such as the troll ignore it, because they walk toward towers on purpose.

## [1.8.29] — 2026-10-14 (UTC)
### Escaped enemies no longer jump
- ESCAPE-WALKBACK-01: `Enemy.updateEscaped()` in `js/waves.js` called `placeOnNearestRouteTile()` the moment an enemy that had crossed the finish line stood off the walkable area, which moved it instantly to the nearest route tile. `walkBackOntoRoute()` now walks it there at its own speed. Only a position more than `ESCAPE_WALKBACK_MAX_TILES` (4) tiles away, such as after loading a save, is still placed directly.

## [1.8.28] — 2026-10-13 (UTC)
### Gamer-facing run sharing and telemetry, one organised pattern
- AGENTS.md Code map gains a "Run progress, sharing and reporting" group naming each system by function; the related contract checks sit together under one label in `js/config.js`; the `ANALYTICS.md` rule now says "when present" because the file is optional (it is not in the repository).
- RUN-SHARE-01: the end screen gains `endCopySeedBtn` (`copyRunSeed()` copies `runSeedCode`) and `endRateBtn`, shown only on itch.io and Game Jolt builds, which opens that storefront page (`PLATFORM_RATING_PAGES`). No prompt appears during play.
- TELEMETRY-01: `act_started` and `medal_earned` are new events in `TELEMETRY_EVENTS` (`js/environment.js`), sent from `announceActStart()` and `awardMedal()`. `game_over` now also carries `kills`, `best_streak`, `seed`, `personal_best` and `act`, so reports can show where players stop, which medals they earn and how deep their runs go.

## [1.8.27] — 2026-10-13 (UTC)
### One naming pattern for SEO and Analytics
- SEO-TITLE-01: the page title, `og:title`, `twitter:title` and the install name in `manifest.json` are the same string, "StickTD — Free Stick Tower Defense Game". Analytics had split one site across three page titles (older builds used different titles), which made views look like three pages.
- ANALYTICS-LABEL-01: `STICKTD_PLAY_LABEL` in `index.html` is `<platform>/<build>` (github-pages/web, itch.io/web, newgrounds/web, desktop-app/windows-x64, android-app/android). `analyticsPageTitle()` sends "StickTD · <label>" as the Analytics page title, `analyticsPageLocation()` sends `…/StickTD/play/<label>` (campaign tags still kept), and every event carries `play_label` and `referrer_site` (newgrounds, itch.io, github, steam, youtube, reddit, search, gamejolt, other, direct). `detectPlayPlatform()` now recognises Newgrounds hosts (`newgrounds`). Register `play_label` and `referrer_site` as event-scoped custom dimensions in GA4 to report on them.

### Sharp canvas on every profile
- SHARP-CANVAS-01: `setupCanvas()` in `js/config.js` caps the pixel ratio at 2 for the low graphics profile as well as high (it was 1), so phones are drawn at their real sharpness. The automatic render-scale governor still lowers resolution (floor 75%) only when frame rate drops.

## [1.8.26] — 2026-10-13 (UTC)
### Seeded runs, named acts, medals, end-of-run summary
- RUN-SEED-01: `runSeedCode`, `hashSeedText()` and `runSeedFor()` in `js/config.js` build `waveRunSeed` (`js/waves.js`) and `groundDetailRunSeed` (`js/environment.js`) from a short code. A code typed in Settings > Game (`settingsRunSeed`, stored under `RUN_SEED_KEY`) is used once for the next run; otherwise a random code is made. Wave composition, road growth, scenery and ground details repeat for the same code; other random events do not.
- RUN-PROGRESS-01: `ACT_NAMES`, `actTitleForWave()` and `announceActStart()` name each ten-wave act and announce it in Notifications. `MEDAL_DEFS`, `awardMedal()`, `awardWaveMedals()` and `renderMedalList()` add 14 medals kept in this browser (`MEDALS_KEY`), listed in a new Settings > Medals tab. `settingsMedalToggle` (`medalNotificationsEnabled`, saved in prefs, default on) controls whether earned medals appear in Notifications. `recordNotification()` gains an `always` argument so act and medal notices show even with intro text off.
- RUN-SUMMARY-01: `describeRunEnd()` fills `#endRunSummary` on the end screen with wave reached, act, kills, best streak, seed and personal best (`BEST_RUN_KEY`). `creditKill()` counts `sessionKills` and `bestKillStreak`.

## [1.8.25] — 2026-10-13 (UTC)
### Event pacing
- EVENT-PACING-01: `runWaveClearRandomEvents()` in `js/waves.js` records the wave of each hostile event (`lastHostileEventWave`) and skips the random troll, extra building and circus rolls for `HOSTILE_EVENT_BREATHER_WAVES` (2) wave clears afterwards. Peaceful events (bees, chests, picnics, chance structures), the guaranteed troll every fifth wave and every existing chance are unchanged, so hostile events arrive with a rest behind each one instead of in clusters.

## [1.8.24] — 2026-10-13 (UTC)
### Music voice guard, items you place stay put
- MUSIC-VOICES-01: the design contract scans `SoundEngine` for every voice name passed to `popTone()` and `musicTone()` and fails when the engine has no such voice, which is the mistake that broke the wave theme in 1.8.20.
- ITEM-DRIFT-01: an item the player drops on the ground (`placedByPlayer`) no longer drifts toward a stickman, so items left for cooking or placement stay where they were put.

## [1.8.23] — 2026-10-13 (UTC)
### Lead voice: ducking, shimmer, swell
- MUSIC-LEAD-02: `popTone()` ducks `pad`, `harmony`, `pluck` and `warm` notes by 20% (`MUSIC_LEAD_DUCK`) while a lead or oboe note sounds, adds a quiet triangle an octave above every lead note (`MUSIC_LEAD_OCTAVE_LEVEL`), and lets lead notes of 0.6 s or longer swell 15% toward their end (`MUSIC_LEAD_SWELL`).

## [1.8.22] — 2026-10-13 (UTC)
### Console-style lead articulation
- MUSIC-LEAD-01: `popTone()` gives the `lead` and `oboe` voices (`vibrato` in `POP_VOICES`) a 35 ms scoop up from 24 cents flat at the start of every note of 0.3 s or longer, and a sine vibrato (5.2–5.6 Hz, 9–11 cents) that fades in after a short delay, so held melody notes sing instead of sitting still.

## [1.8.21] — 2026-10-13 (UTC)
### Instant mushrooms, a grander expansion
- MUSHROOM-INSTANT-01: `isInstantOpenProp()` includes MUSHROOMS and `normalizeSceneryHarvest()` no longer gives them a 20–50 s clearing time, so a tap collects them at once like a bush.
- MUSIC-LEITMOTIF-01 fix: `scheduleLeitmotif()` plays its brass through `musicTone()` (the `brass` voice is not in `POP_VOICES`; the 1.8.20 call raised an error in the wave and boss themes). The wave theme is titled Path to Victory in the settings text.
- EXPANSION-GLORY-01: `advanceRingReveal()` calls `spawnExpansionSparkles()` for every tile as it opens, and `finalizeRingExpansion()` ends with `spawnExpansionFinale()`: a golden burst from the centre of the new map, the level-up chime and a brief gentle shake (honouring the screen-shake setting and low-detail mode).

## [1.8.20] — 2026-10-13 (UTC)
### Barricade strikes, stickman wounds, rage, a shared music theme
- BARRICADE-STRIKE-01: `spawnBarricadeStrikeDebris()` throws wood and stone away from the attacker on every enemy strike on a barricade (`Tower.takeDamage()` now receives the attacker), larger and on a higher arc. Only the strike that removes a point leaves rubble, so the ground does not fill with it.
- STICKMAN-WOUND-01: `spawnStickmanWound()` gives a struck stickman the same forensic spatter, stains and spray an enemy gets, thrown away from the attacker.
- STICKMAN-RAGE-01: each hit on a stickman has a `STICKMAN_RAGE_CHANCE` (5%) to enrage it for 6 s with +30% damage and +25% attack speed, the red aura and a "😡 Enraged!" call.
- MUSIC-LEITMOTIF-01: `MUSIC_LEITMOTIF` plays as an oboe in the idle score and as brass in the wave and boss scores every eighth bar, so both share one theme. MUSIC-JOURNEY-01: `MUSIC_CYCLE_SHIFTS` has twelve keys, so the score takes longer to repeat its key path.

## [1.8.19] — 2026-10-13 (UTC)
### Louder, fuller music
- MUSIC-LOUD-01: `MUSIC_MAKEUP_GAIN` 1.33 → 1.75, `MUSIC_SECTION_LEVEL` [0.92, 1.02, 1.16], `MUSIC_AIR_DB` 3.2, and the master compressor in `SoundEngine` uses threshold −15 dB, knee 18 and ratio 5 so the louder mix stays clean instead of clipping.
- MUSIC-HEROIC-01: `scheduleHeroicPhraseHit()` adds a crash, a timpani stroke and a two-bar brass power chord (root, fifth, octave) on every eighth bar of the wave and boss themes, called from `scheduleCombatLayers()`.

## [1.8.18] — 2026-10-12 (UTC)
### Small logs, rarer bones, shovel charges and treasure
- LOG-SIZE-01: `sceneryVisualSize()` caps BRANCH and STUMP items at `LOG_MAX_SCALE` (0.54) and `drawStumpSprite()` now draws at 1.0× instead of 1.6× its cell, so no giant log can appear, including in old saves.
- GORE-RARITY-01: `BONE_DROP_CHANCE` is 0.05 per death (was 0.18) and `spawnBoneDebris()` drops one bone 90% of the time, two otherwise (was 1.5 on average). Skulls (12–19%) are now more common than bones, and blood still marks every hit.
- PIN-BEE-01: `drawMarkedTargetIcon()` is now called after the bee's elevated draw pass, so a pinned bee has a painted-top anchor on the frame it is drawn (it was drawn one pass too early, so the pin never appeared on bees).
- CAMERA-MARKER-01: `startWaveStartCameraPan()` centres on the exclamation mark (`SPAWN_MARKER_RISE_PX`, 34, shared with `drawSpawnWarningMarker()`) instead of 78 px above the spawn.
- STACK-HONEY-01: Honey stacks in one slot with a count (`STACKABLE_ITEM_IDS`, `heldCount()`, `takeOneFromHeld()`). The quick-use row shows `×N`, using or cooking takes one at a time, and dragging a stack out lifts a single honey.
- ITEM-DRIFT-01: `updateGroundItemDrift()` slowly moves loose items toward the nearest stickman whose range covers them. Every item that arrives is stored in the stickman's inventory: consumables are kept, not used, and gear counts as equipped at once because `recomputeStats()` already adds the stats of everything carried (Warcraft-style). Gold bags, expansion scrolls and barricades stay put. Dragging a consumable onto a stickman still uses it.
- SHOVEL-CHARGES-01: the shovel shows in the quick-use row with its remaining digs, has `SHOVEL_CHARGES_PER_ROUND` (3) digs, and `resetShovelCharges()` refills them when a wave is cleared. Using it starts a 700 ms dig (`beginShovelDig()`, `drawShovelDigSwing()`): the stickman swings the shovel and dirt flies at the chosen spot, then `digWithShovel()` resolves the result. A 3% roll finds a treasure chest that opens into 2–4 gold bags. The shovel is still never consumed (SHOVEL-REUSABLE-01).

## [1.8.17] — 2026-10-12 (UTC)
### Build order, pin position, Grunt health
- BUILD-MENU-ORDER-02: `buildTowerModal()` in `js/config.js` lists Stickmen Defenders first, then Structures (Expand, Log Mill, Stone Quarry, Campfire), then Fortifications and Locked. This reverses BUILD-MAP-GROWTH-ORDER-01 (1.6.x); the design-contract check now requires Defenders before Structures.
- PIN-SINK-01: `drawMarkedTargetIcon()` places the pin's tip `PIN_TIP_SINK_CSS_PX` (3) CSS pixels below the painted top of the enemy emoji, where it was 1, so the pin touches the emoji instead of hovering over it.
- WEIGHT-HP-182: `enemyHealthAtWeight()` in `js/waves.js` no longer returns 1 for a Tiny Grunt. Every road enemy's HP is species base × weight × wave scale × 1.25, and weight is radius ÷ 15, so size, weight and HP rise together. The Tiny Grunt keeps its 15-point evasion bonus. This reverses the owner decision of 1.7.136 (AGENTS.md updated); Tiny Grunt waves are now far tougher than the 1 HP they had and may need rebalancing.

## [1.8.16] — 2026-10-12 (UTC)
### Smaller branch piles
- BRANCH-SIZE-01: `drawBranchSprite()` in `js/environment.js` draws each 🪾 glyph at 0.38–0.62 of the piece size (was 0.55–0.95) and keeps the glyphs within 0.5 by 0.32 of the piece size of the centre (was 0.7 by 0.45), so a pile covers about half its former area and each stick is smaller. Count, angles, mirroring, pickup, masks, shadows and wood yield are unchanged.

## [1.8.15] — 2026-10-12 (UTC)
### Music follows the reference scores
- MUSIC-REFERENCE-01: fourteen reference MIDI files were parsed for tempo, key, voicing, bass movement and rhythm. They show that the dark scores hold a bass note for several bars, repeat a short motif over a fixed groove, pair two timbres, leave rests, and accent with timpani. Only those general techniques are used; no melody, chord sequence or rhythm from the files is copied.
- Start screen (`scheduleAttractStep()`): `MUSIC_ATTRACT_TEMPO_BPM` goes from 98 to 88. Verse chords change every four bars, not two (the chorus keeps two). A quiet low root-and-fifth pad and a timpani hit (`MUSIC_TIMPANI_HZ`) mark each four-bar change. A new `oboe` entry in `POP_VOICES` plays a counter-line on beats two and four. The verse kick drops to beats one and three, the plucked arpeggio starts at bar 8 and plays only on strong steps until the build, and bars 3 and 11 rest for their last three eighths. The second and chorus phrases use rows 4–7 of `MUSIC_COMBAT_MELODY`, so the motif develops instead of repeating.
- Field and wave music: a timpani downbeat every fourth bar (`scheduleFieldStep()`, `scheduleMusicStep()`), a low fifth under the wave chord pad (`scheduleCombatLayers()`), a quiet root-and-fifth drone in the field arrangements that had none, and a short tom fill at the end of every fourth bar of the wave and boss themes (`scheduleDrumFill()`). `MUSIC_TOM_PITCHES` is lowered to 150, 128, 108 and 92 Hz so the fills sound like timpani rather than small toms.
- Ran all 192 steps of the start screen, field, wave and boss themes without errors; the voice load matches 1.8.14 within 2%. Not listened to.

## [1.8.14] — 2026-10-12 (UTC)
### Shadows line up with their objects
- SHADOW-ALIGN-01: `drawEmojiGroundShadow()` measures where an emoji touches the ground in the font family it is given, but the barricade's shadow asked for `Verdana` while its glyph is drawn in `serif`, so the shadow's foot sat lower than the legs. `Tower.draw()` now passes `serif`. The ground-item shadow in `js/config.js` asked for `serif` while the item glyph is drawn in `sans-serif`; it now asks for `sans-serif`. Coins, dragged items, scenery, enemies and structures already matched.
- FLAG-SHADOW-01: `drawFinishFlagPole()` cast the pole, finial and pennant as separate translucent shapes, so the shadow was darker where they overlapped. `drawFlagGroundShadow()` in `js/environment.js` paints them opaque into one small canvas and casts that once at the usual 24% opacity, with the same slant and anchor as before.
- `validateDesignContract()` checks both; `AGENTS.md` ledger item 39 states the rule.

## [1.8.13] — 2026-10-12 (UTC)
### Start-screen music tempo
- MUSIC-ATTRACT-03: `MUSIC_ATTRACT_TEMPO_BPM` in `js/config.js` goes from 112 to 98, because the start-screen march played too fast. Everything else in the arrangement is unchanged.

## [1.8.12] — 2026-10-12 (UTC)
### Wasteland branches return to the leafless-tree emoji
- BRANCH-EMOJI-01: `drawBranchSprite()` in `js/environment.js` draws one to three 🪾 glyphs per branch pile (`BRANCH_GLYPH`) through `drawEmojiSprite()`, each at its own size, offset, angle and mirroring from `branchRandomFor(piece, variant)`, so the glyphs lie scattered and read as loose sticks while staying identical across frames, saves and loads. This replaces the procedural stick drawing of BRANCH-STICKS-01 (1.8.4) and restores the glyph of BRANCH-PICKUP-03 (1.8.1, `ba30f1e`). Pickup, masks, shadows and wood yield are unchanged. `validateDesignContract()` now checks for `BRANCH_GLYPH`.
- 🪾 needs an emoji font that includes Unicode 16; a system without it shows an empty box. Not checked on older systems.
### Start-screen music
- MUSIC-ATTRACT-03: the attract arrangement in `scheduleAttractStep()` moves from the bright major pop progression (I-V-vi-IV, 128 BPM) to a minor-key march (i, VI, VII, V from `MUSIC_ATTRACT_CHORDS`) at 112 BPM. The melody uses `MUSIC_COMBAT_INTERVALS`, the lead and harmony sit an octave lower, the plucked arpeggio moves down an octave and gets quieter, and the offbeat open hats and the claps are gone. Structure, bass, snares, fills, risers and crashes are unchanged. Run through every one of the 24 bars without errors; not listened to.

## [1.8.11] — 2026-10-12 (UTC)
### Music starts with the loading screen in the installed apps
- AUTOPLAY-APP-01: `tryAutoplayAudio()` in `js/config.js` resumed the audio context only when the page already had a click or key press (`navigator.userActivation.hasBeenActive`). The desktop and Android apps allow sound without one (`autoplay-policy` switch in `main.cjs`), so their music waited for the first click after loading. When `window.STICKTD_PLATFORM` is `desktop-app` or `android-app`, the attempt now runs at once and the start-screen music begins about half a second into loading. A browser still needs a first click, tap or key press, because browsers refuse sound before one; that click starts the music immediately, and the unlock listeners are active from the first moment of loading.
- Measured in Chromium with autoplay allowed: the context is running and the music scheduler started 0.6 s after the page began loading and played through the whole loading screen. Not measured in the packaged apps.

## [1.8.10] — 2026-10-11 (UTC)
### Four files, grouped by what a designer edits
- MODULE-FILES-01: `js/` holds four files, loaded in this order: `config.js` (settings, balance numbers, game state, camera, effects, rendering, main loop, sound engine and music, input, HUD, menus, debug log, design contract), `environment.js` (map and path, scenery, flora, campfire, chance structures), `towers.js` and `waves.js`. The file map at the top of `js/config.js` lists them. `js/core.js`, `js/world.js`, `js/units.js`, `js/audio.js` and `js/ui.js` from 1.8.8 are gone.
- `towers.js` opens with `CONFIG.TOWERS` (every class's numbers, icon and unlocks), then strategy tips, elements, promotions, class balance, the `Tower` class and `Projectile`. `waves.js` opens with `CONFIG.ENEMIES` and `ENEMY_INFO` (emoji, health, speed, bounty), then enemy balance, bosses, trolls and circus, size and family tiers, the wave plan and the `Enemy` class. Each group has a banner.
- `CONFIG` is declared empty in `js/config.js`; `CONFIG.TOWERS` is assigned in `js/towers.js`, `CONFIG.ENEMIES` in `js/waves.js` and `CONFIG.SCENERY`, `CONFIG.FLORA` and `CONFIG.CHANCE_STRUCTURES` in `js/environment.js`. Load-time reads of `CONFIG` fall after their assignments (checked by parsing every file).
- The BOOT section (`validateGameDefinitions()`, `initRegionAndPath()`, `generateScenery()`, the loading screen and `startFirstFrame()`) moved to the end of `js/waves.js`, because it calls functions from every earlier file at load time. Nothing else in the game starts before it.
- 12 statements that read a later file's names at load time moved with their data (for example `LIVESTOCK_TYPES` to `js/waves.js`). Line contents are otherwise unchanged apart from banners; a parse of every file finds no top-level use of a later file's names.
- `release.py`, `AGENTS.md` and the `?v=` tags point at the new files.
- RELEASE-PIPELINE-01: `.github/workflows/release.yml` builds each package in its own job (`windows`, `linux_x64`, `linux_arm64`, `mac_arm64`, `mac_x64`, `android`) instead of a matrix; the steps and uploaded artifact names are unchanged and `release` waits for all six. The macOS jobs and download rows are named `macOS ARM64` and `macOS x64` after their architecture.
- RELEASE-PIPELINE-01: the Authenticity section of the generated release notes now says the files were built from the public source at the release commit by GitHub Actions on GitHub-hosted machines, with links to the commit, the workflow file at that commit and the workflow run (`compose_release_notes()` in `release.py`).
- VISUAL-DRIFT-01: `LOOK_LOCKS` and `validateLookLocks()` in `js/config.js` pin the title, top bar and button colours, fonts and shapes; `validateDesignContract()` reports `look changed` when one differs. `AGENTS.md` gains ledger item 38, a "Look continuity" list and a pre-delivery step that compares start and gameplay frames before and after a change. Found by rendering 1.0.0, 1.4.64, 1.6.42, 1.7.7, 1.7.75, 1.7.165, 1.8.1 and this version: the look is identical from 1.7.165 on, and the earlier visual changes were the title-screen overhaul and HUD rework; the only flip-flop in the style rules across 119 commits is the update dialog (removed in 1.4.43, restored later).

## [1.8.8] — 2026-10-11 (UTC)
### Analytics and search data name the exact build
- ANALYTICS-BUILD-01: `index.html` sets `window.STICKTD_BUILD` to `windows-x64`, `macos-arm64`, `linux-arm64` and so on for the desktop apps, `android` for the Android app and `web` in a browser. `window.trackEvent()` and the run telemetry in `js/environment.js` send it as the `build` parameter beside `platform`, and the debug log prints it. The desktop shell in `release.py` (`main.cjs`) passes `process.platform` and `process.arch` in the page address so each binary reports its own system and architecture. Register `build` as a custom dimension in Google Analytics to report on it.
- Search data: the JSON-LD block lists Windows, macOS, Linux, Android and the browser as platforms and links the latest release as `downloadUrl`.
- `validateDesignContract()` checks the label's format and that both event paths send it.
- MODULE-FILES-01: the 12 files from 1.8.7 are regrouped into 5 in `js/`: core (config, state, camera, effects, rendering, spatial hash, main loop), world (map, scenery, campfire, chance structures, waves), audio, units (enemy, tower, projectile) and ui (UI, debug log, design contract, boot). Line contents are unchanged. `renderEnvironment` and the pool sizes `PARTICLE_COUNT` and `TEXT_COUNT` moved up in `js/core.js` because core now loads before the files that held them; a parse of every file found no other top-level use of a later file's names. The file map at the top of `js/core.js` lists each file.

## [1.8.7] — 2026-10-11 (UTC)
### Twelve script files instead of twenty-four
- MODULE-FILES-01: the 24 files from 1.8.6 are regrouped into 12 in `js/`: config, environment (map, scenery, campfire, chance structures), audio, state (state, camera), enemy, tower (tower, projectile), effects (blood, particles), waves, game-loop (stickman rendering, spatial hash, main loop), ui (input, ui), diagnostics (debug log, design contract) and boot (screens, boot). The line contents are unchanged.
- Three blocks moved: `acquireActive()` (OBJECT POOLS) now sits at the end of `js/config.js`, `validateDesignContract()` with its source scan (SOURCE-SCAN-01) follows the debug log in `js/diagnostics.js`, and the wave plan loads before stickman rendering. None of them is used at load time before its new position; a parse of every file found no top-level use of a later file's names.
- The file map at the top of `js/config.js` lists each file and what it holds.
- SCRIPT-LOAD-01: the load-failure message from 1.8.6 also fired when the analytics tag was blocked or offline and covered the game. It now applies only to the game's own `js/` files, so a blocked or offline analytics tag never interrupts play.

## [1.8.6] — 2026-10-11 (UTC)
### The game becomes a set of script files
- MODULE-FILES-01: the 24,500-line inline script in `index.html` is now 24 plain script files in `js/`, cut at the section banners in their original order: config, design-contract, map, scenery, campfire, chance-structures, pools, audio, state, camera, enemy, tower, projectile, blood, particles, stickman-rendering, spatial-hash, waves, main-loop, input, ui, debug-log, screens, boot. Joined in order the bodies are byte-identical to the previous script. `index.html` keeps the markup, styles, analytics and consent scripts and loads the files with `<script src="js/NAME.js?v=1.8.6">` tags. The file map at the top of `js/config.js` lists the order.
- Load order: `syncPrefsToDOM()` ran as an immediate function in `js/state.js` and called `syncAudioVolumeControls()` from `js/ui.js`, which a single script had hoisted. It is now an ordinary function called first in `js/boot.js`. A parse of every file found no other top-level use of a name from a later file.
- SCRIPT-VERSION-01: `validateDesignContract()` and `release.py` `read_game_version()` require every script tag's `?v=` to equal `GAME_VERSION`, which now lives in `js/config.js`. `release.py` stages the `js/` folder with the web files.
- SOURCE-SCAN-01: four ledger checks searched `document.scripts` text for rule IDs, which is empty for external files. `loadGameSourceText()` fetches the files over http(s), `sourceMentions()` runs the checks, and `js/boot.js` re-runs the contract once the text arrives. Pages opened from disk skip the scan.
- SCRIPT-LOAD-01: `index.html` shows which file failed when a game script cannot load.
- Verified headless from disk and over http: contract clean, no page errors, two waves at speed. Error line numbers in debug logs are now per file.

## [1.8.5] — 2026-10-11 (UTC)
### Campfire structure, realistic cast-off, analytics in installed builds
- CAMPFIRE-STRUCTURE-01: the Campfire was a separate button above the Build menu list (added in 393de2f). `buildTowerModal()` now adds it as a normal row after the producer rows in Structures, priced 💰60 🪵50 🪨10 through `producerCostLabel()`. New `CAMPFIRE_BUILD_WOOD` and `canAffordCampfire()`; `placeCampfire()` requires and spends the wood; `refreshBuildMenuAvailability()` dims the row instead of disabling it.
- CASTOFF-TANGENT-01: the Swordsman's ground blood was a half-ring around the victim (`spawnCastOffArc(..., circular)`). New `spawnCastOffTrail()` releases each drop from the blade tip further along the swing and lands it down the tangent, so marks form a curved row beyond the wound on the follow-through side, longer and thinner with distance (alpha = asin(W/L)). Used by `spawnSwordsmanBloodArc()` and by `spawnWeaponBloodContact()` for every `ARC` profile; the circular mode is removed.
- FORENSIC-TERMINAL-02: `launchForensicDroplet()` gives each drop its own terminal speed (7.65 m/s ceiling for large drops, scaling with the square root of diameter) and drag constant k = g / terminal², so fine mist hangs and drifts. `updateForensicDroplets()` now places a landing at the exact ground-contact point instead of the overshoot position.
- ANALYTICS-APP-01: `detectPlayPlatform()` reports `desktop-app` (Electron user agent on a `file:` page, so embedded previews inside Electron hosts keep reporting `embedded`) and `android-app` (Capacitor native on `localhost`) instead of `local-file` or `other`. In installed builds `enableStickTDAnalytics()` sets `client_storage:'none'` with a stored `client_id` (`installedClientId()`), because cookies do not persist on `file://`, and reports the public page URL. If the tag fails to load offline, it reloads when the `online` event fires.
- NATIVE-ICON-01: the Windows portable exe, Linux AppImage and macOS app used the default installer icon. `release.py` `scale_favicon()` now enlarges `favicon.png` to 512 px at build time without smoothing, so it stays crisp and no extra image is committed, and `write_native_project()` puts it into the packaging folder and sets it as the `win`, `linux` and `mac` icon and the Electron window icon; the window menu bar is hidden.
- NATIVE-SHELL-01: the desktop shell in `release.py` `write_native_project()` (`main.cjs`) lifts the browser autoplay block so music starts without a click, toggles fullscreen with F11, allows one running copy (a second launch focuses the first), sets a minimum window size, shows the window only once it has painted on a dark background, and opens `https` links in the player's browser instead of discarding them. The Android shell paints the same background colour behind the page.
- HOMESCREEN-01: iPhone and iPad have no installable release file without a paid Apple developer account, so the web page is the install path. `index.html` gains `apple-touch-icon` and the `apple-mobile-web-app-*` and `mobile-web-app-capable` meta tags (fullscreen, own title, translucent status bar), the home-screen icon is `favicon.png`, and the README explains Add to Home Screen.
- RELEASE-PIPELINE-01: `.github/workflows/release.yml` built Windows in its own job beside a Linux and macOS `desktop` matrix. Windows now joins that one matrix (Windows, Linux, macOS Apple Silicon, macOS Intel) with its signing choice made per platform, so the run graph shows Desktop builds, Android and Publish release.
- Code map: sizing the sections showed the banners misled — ENTITY CLASSES is 5,449 lines and holds 64 blood and decal functions, and the campfire code sits inside SCENERY. The clusters now carry their own banners, all listed in the table of contents: BLOOD, DECALS AND FORENSIC SPATTER; CAMPFIRE AND COOKING; the Enemy (1,500 lines), Tower (1,400) and Projectile (270) classes; DESIGN CONTRACT (`validateDesignContract()`); and DEBUG LOG (`generateDebugLog()`). The table of contents at the top of `index.html` now lists the sections in file order and names WAVE PLAN as it appears; the audio engine and music score, which sat unlabelled inside OBJECT POOLS, get their own AUDIO AND MUSIC banner. No behaviour changed.
- RELEASE-PIPELINE-01: Linux ARM64 AppImage added to the desktop matrix in `.github/workflows/release.yml` (native `ubuntu-24.04-arm` runner), listed in `release.py` `DOWNLOADS` and the README. It is attested and checksummed like every other file.

## [1.8.4] — 2026-10-11 (UTC)
### Branches become scattered sticks
- BRANCH-STICKS-01: `drawBranchSprite()` drew the 🪾 leafless-tree glyph, so wasteland branches read as small standing trees (introduced in 1.7.175, branch-pickup work after 393de2f). It now draws a loose scatter of two to four sticks. Each stick has its own length, thickness, bend, colour, orientation and sometimes a twig. New `branchRandomFor(piece, variant)` seeds a generator from the piece's tile, so every pile differs and stays identical across frames, saves and loads.
- Call sites updated to pass the piece: `drawSceneryEmoji()`, the shadow pass in the scenery draw loop, `drawAmbientLogs()` and both blood-surface masks in `drawEmojiSurfaceBlood()`. Pickup, wood yield and clearing logic are untouched (BRANCH-PICKUP-03 still holds: one atomic pickup).
- The design contract's branch check now requires a stick sprite and rejects the tree glyph.

## [1.8.3] — 2026-10-11 (UTC)
### Forensic drop classes for weapon blood
- FORENSIC-CLASS-01: `spawnForensicSpatter()` sized every airborne drop from the weapon's mark width alone, so a rifle round and a hammer blow threw drops of the same character. New `forensicDropletSizeFactor(speedMs)` shrinks a drop as its launch speed rises, from large low-speed drops through mid-sized medium-speed drops to fine drops above blood's 7.65 m/s terminal speed (`FORENSIC_HIGH_VELOCITY_MS`), floored at `FORENSIC_MIN_DROP_PX`. Per-weapon identity from the 1.7.166 registry is kept, since the factor multiplies each profile's own width.
- `launchAtomizedMist()`: ballistic (`AXIS`) weapons add one extra fine drop to each drop launched above 7.65 m/s, so Sniper, Marksman, Gatling and Cowboy leave a fine forward mist. Skipped on Low graphics. Blade cast-off (`SWORD`, `ARC`) keeps full-size drops, because shear off a moving edge does not atomize.
- Back-spatter now leaves at 60% of forward speed for every weapon (`FORENSIC_BACKSPATTER_SPEED_SHARE`). The earlier condition tested `profile.mechanism === 'ARROW'`, which no profile ever carries, so it never applied. The permanently false `exitSpray` constant is removed.
- `WEAPON_BLOOD_PROFILES.HAMMERMAN`: spread becomes π so a blunt blow throws a medium-speed radial spatter around the impact; Paladin keeps its restrained fan.
- Measured on 20 simultaneous hits in a headless run: Sniper averages 0.34 px drops at 16 m/s, Hammerman 1.75 px at 4 m/s with near-uniform heading spread; no runtime errors. Sustained GPU cost with dense mist is unmeasured.

## [1.8.2] — 2026-10-11 (UTC)
### Release pipeline, archive references and regression fixes
- SWORDSMAN-RATE-01: `validateDesignContract()` still asserted the pre-1.7.174 multipliers (Archer and Mage ×1.0) and reported a failure on every load since 393de2f, which set `applyClassCooldownBalance()` to Swordsman 1.2, Mage 1.4 and every other class 1.15. The assertion now checks those multipliers. Gameplay values are unchanged.
- Archive references: 995 comments in `index.html` pointed to `CHANGELOG.md §` for entries that moved to HISTORY.md in b504c58 and 9bb49f3; they now read `HISTORY.md §`.
- CHANGES-TAB-01: `fetchChangelogText(firstChunkOnly, fileName)` and `loadChangelogEntries()` read HISTORY.md when CHANGELOG.md holds fewer than `CHANGELOG_MIN_ENTRIES` entries, so the Changes tab keeps listing earlier releases after an archive.
- Metadata: the description meta tags, JSON-LD and `manifest.json` no longer say "in development".
- Release pipeline (`.github/workflows/release.yml`, `release.py`): one release per version, tagged `vMAJOR.MINOR.PATCH` and never replaced; a push without a version bump builds nothing. Notes list every CHANGELOG.md and HISTORY.md entry newer than the previous published release. Assets are the Windows portable EXE, Linux AppImage, macOS DMGs (Intel and Apple Silicon), the Android APK and `SHA256SUMS.txt`, each with a GitHub build-provenance attestation. The web zip, standalone HTML and changelog assets are removed. Windows, macOS and Android code signing activate when their repository secrets exist; without them the packages stay unsigned and the APK debug-signed.
- README rewritten as box copy; AGENTS.md gains the release and changelog-entry rules.

## [1.8.1] — 2026-10-11 (UTC)
### Combat balance, branch collection and release builds
- Lower defender direct and alternate melee damage by 30% through stat recomputation; applies to loaded defenders. Preserve stat caps, weapon profiles and spell effects. Archer tier cooldowns become 1430/1350/1250 ms before existing multipliers, instead of 1430/693/572; draw times become 800/650/550 ms. Mage base damage becomes 22 rather than 26 to keep starting single-target expected output close to Archer while retaining wider variance and splash. This is a tuning pass, not a claim of completed playtesting.
- WEIGHT-HP-181: road enemies use species base HP × weight × wave HP multiplier × 1.25, rounded once. Within the same species/wave, doubling weight doubles unrounded HP. Preserve Tiny Grunts at 1 HP; livestock health is unchanged. Old saved live enemies retain their saved health; newly spawned enemies use the new rule.
- Bees draw once in an elevated world pass above scenery, actors and loose-item emojis, below speech and interface overlays.
- Retain cumulative 1.7.175 branch fixes: 🪾 sprites, one atomic pickup, wood flights to Build. Preserve 1.7.174 music, blood, cooking, bees/honey, cake, camera and reporting work.
- Move all previous release entries intact into HISTORY.md. Current changelog contains only 1.8.x. Agent guidance searches history selectively.
- Every main-branch push builds web, Windows portable EXE, Linux AppImage, macOS DMG (Intel and Apple Silicon) and Android debug APK. Commit-specific releases prevent silently replacing a build. Native packages are unsigned/test-signed and require platform validation; no production signing or store submission is implied.

