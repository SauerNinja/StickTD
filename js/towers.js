"use strict";
// Tower definitions, elements, promotions, the Tower class and projectiles. Loaded after js/environment.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   TOWER DEFINITIONS (CONFIG.TOWERS)
//   STRATEGY TIPS, ARCHETYPES AND UNLOCKS
//   ELEMENTS
//   PROMOTIONS AND MASTERY
//   CLASS BALANCE AND ANIMATION
//   TOWER CLASS
//   PROJECTILES
/* =========================================================
   TOWER DEFINITIONS (CONFIG.TOWERS)
   ========================================================= */
CONFIG.TOWERS = {
  NINJA: {
    name:'Ninja', icon:'🥷', baseCost:300, unlocksAfterWave:0,
    blurb:"Alternates throwing stars from each hand: the fastest sustained attacker, with light hits and no close-range blind spot. Unlocked by defeating the Stealth Santa, who arrives as the Wave 10 boss of a Stealth run (start with Play Stealth).",
    tiers:[
      {range:120,damage:2,cooldown:60,projectileSpeed:620},
      {range:135,damage:3,cooldown:55,projectileSpeed:660,upgradeCost:120},
      {range:150,damage:4,cooldown:50,projectileSpeed:700,upgradeCost:180}
    ]
  },
  SWORDSMAN: {
    name: 'Swordsman', icon: '⚔️', baseCost: 50, unlocksAfterWave: 0,
    blurb: "A front-line fighter whose sweeping blade strikes every enemy in a cone ahead of him. Affordable and dependable, and the root of the melee branch: Strength, Dexterity or Intelligence trained to 250 attunes him to an element, and 500 in that stat unlocks a specialization.",
    tiers: [
      { range: 90,  damage: 18, cooldown: 1700 }, // tier-1 cooldown raised 1350→1550 per direct feedback ("all stickmen probably have too fast hit speed starting off") — later tiers (earned through promotion) are untouched
      { range: 100, damage: 28, cooldown: 770, upgradeCost: 80 },
      { range: 115, damage: 42, cooldown: 680, upgradeCost: 120 },
      { range: 125, damage: 58, cooldown: 630, upgradeCost: 175 },
      { range: 135, damage: 78, cooldown: 570, upgradeCost: 245 }
    ]
  },
  ARCHER: {
    name: 'Archer', icon: '🏹', baseCost: 60, unlocksAfterWave: 0,
    blurb: "A patient marksman who draws the bow fully before each shot. Arrows land hard, and the ones that bite deep leave the target bleeding. He is the root of the ranged branch: training a stat to 250 attunes him to an element, and 500 unlocks a specialization.",
    tiers: [
      { range: 140, damage: 20, cooldown: 1430, drawTime: 800, projectileSpeed: 480 }, // tier-1 cooldown raised 1150→1300, same "too fast starting off" feedback as Swordsman
      { range: 170, damage: 30, cooldown: 1350, drawTime: 650, projectileSpeed: 540, upgradeCost: 95 },
      { range: 200, damage: 44, cooldown: 1250, drawTime: 550, projectileSpeed: 600, upgradeCost: 135 }
    ]
  },
  AXEMAN: {
    name: 'Axeman', icon: '🪓', baseCost: 375, unlocksAfterWave: 5,
    blurb: "Dual-wields hand axes and switches between a close swing and a ranged throw, with one free switch per wave. Unlocked by training a Swordsman's Dexterity to 500.",
    tiers: [
      { range: 115, meleeRange: 70, damage: 34, meleeDamage: 14, cooldown: 1400, meleeCooldown: 500, projectileSpeed: 320 },
      { range: 130, meleeRange: 80, damage: 48, meleeDamage: 20, cooldown: 1250, meleeCooldown: 450, projectileSpeed: 340, upgradeCost: 100 },
      { range: 145, meleeRange: 90, damage: 66, meleeDamage: 28, cooldown: 1100, meleeCooldown: 400, projectileSpeed: 360, upgradeCost: 150 }
    ]
  },
  SPEARMAN: {
    name: 'Spearman', icon: '🔱', baseCost: 325, unlocksAfterWave: 5,
    blurb: "Sweeps its long spear through the widest arc of any melee fighter, catching a whole crowd with reach well past a sword, at the cost of a slow wind-up. Unlocked by training a Swordsman's Intelligence to 500.",
    tiers: [
      { range: 125, damage: 40, cooldown: 1800 },
      { range: 140, damage: 60, cooldown: 1650, upgradeCost: 110 },
      { range: 155, damage: 85, cooldown: 1500, upgradeCost: 160 }
    ]
  },
  HAMMERMAN: {
    name: 'Hammerman', icon: '🔨', baseCost: 425, unlocksAfterWave: 10,
    blurb: "Stuns whatever it hits and carries a shield and extra health, which makes it the natural anchor when a mob breaks off to attack. Unlocked by training a Swordsman's Strength to 500.",
    tiers: [
      { range: 95,  damage: 23, cooldown: 950, stunMs: 500 },
      { range: 105, damage: 34, cooldown: 850, stunMs: 650, upgradeCost: 100 },
      { range: 120, damage: 52, cooldown: 750, stunMs: 800, upgradeCost: 155 }
    ]
  },
  PALADIN: {
    name: 'Paladin', icon: '⚜️', baseCost: 650, unlocksAfterWave: 0,
    blurb: "Delivers holy damage that ignores armor, along with the Hammerman's stun. Only one can stand on the board. Unlocked by training a Hammerman's Intelligence to 40.",
    tiers: [
      { range: 100, damage: 24, cooldown: 1000, stunMs: 550 },
      { range: 110, damage: 36, cooldown: 900,  stunMs: 700, upgradeCost: 115 },
      { range: 125, damage: 54, cooldown: 800,  stunMs: 850, upgradeCost: 175 }
    ]
  },
  // CA058 — see HISTORY.md § [1.5.7] Code Archaeology, CA058
  BERSERKER: {
    name: 'Berserker', icon: '👹', baseCost: 600, unlocksAfterWave: 0,
    blurb: "Gives up the Axeman's throw for a much wider, harder cleave that catches more of a crowd in each swing. Unlocked by training an Axeman's Strength to 40.",
    tiers: [
      { range: 105, damage: 32, cooldown: 900 },
      { range: 115, damage: 50, cooldown: 800, upgradeCost: 120 },
      { range: 130, damage: 75, cooldown: 700, upgradeCost: 180 }
    ]
  },
  // CA059 — see HISTORY.md § [1.5.7] Code Archaeology, CA059
  LANCER: {
    name: 'Lancer', icon: '🏇', baseCost: 550, unlocksAfterWave: 0,
    blurb: "A knight's lance whose impact grows with the weight of its target, so the biggest enemies suffer most. Unlocked by training a Spearman's Dexterity to 40.",
    tiers: [
      { range: 140, damage: 44, cooldown: 1700 },
      { range: 160, damage: 66, cooldown: 1550, upgradeCost: 125 },
      { range: 180, damage: 94, cooldown: 1400, upgradeCost: 185 }
    ]
  },
  MAGE: {
    name: 'Mage', icon: '🔮', baseCost: 70, unlocksAfterWave: 0,
    blurb: "Fires rarely, but every shot counts: a slow, high-velocity blast that explodes on impact and slows whatever survives. Training Strength, Dexterity or Intelligence to 250 infuses him with an element that can burn, shock or freeze, and 500 unlocks a specialization.",
    tiers: [
      { range: 180, damage: 128,  cooldown: 7800, projectileSpeed: 1400, slowFactor: 0.35, slowDuration: 1500 },
      { range: 200, damage: 346, cooldown: 7000, projectileSpeed: 1500, slowFactor: 0.45, slowDuration: 1700, upgradeCost: 90 },
      { range: 220, damage: 1051, cooldown: 6200, projectileSpeed: 1600, slowFactor: 0.55, slowDuration: 2000, upgradeCost: 130 }
    ]
  },
  // CA060 — see HISTORY.md § [1.5.7] Code Archaeology, CA060
  CAT_SNAPPER: {
    name: 'Cat Snapper', icon: '🐈‍⬛', baseCost: 450, unlocksAfterWave: 0,
    blurb: "Sends a shadow cat after its target. The cat latches on and scratches for a few seconds before slipping away; up to two are out at once. Unlocked by training an Archer's Dexterity to 500.",
    tiers: [
      { range: 175, damage: 8,  cooldown: 1350, projectileSpeed: 300, catAttackCooldown: 900, catLifetime: 3500, maxActiveCats: 2 },
      { range: 195, damage: 13, cooldown: 1150, projectileSpeed: 330, catAttackCooldown: 780, catLifetime: 4200, maxActiveCats: 2, upgradeCost: 100 },
      { range: 215, damage: 20, cooldown: 950,  projectileSpeed: 360, catAttackCooldown: 660, catLifetime: 4900, maxActiveCats: 2, upgradeCost: 145 }
    ]
  },
  SNAPCASTER: {
    name: 'Snap Caster', icon: '⚡', baseCost: 475, unlocksAfterWave: 8,
    blurb: "A Mage who dual-wields wands and casts a rapid two-bolt burst each cycle. Each bolt hits lighter than a full Mage blast, but a high chain-lightning chance makes it the choice against clustered swarms. Unlocked by training a Mage's Dexterity to 500.",
    tiers: [
      { range: 150, damage: 58,  cooldown: 1650, burstCount: 2, burstDelay: 190, projectileSpeed: 1500, slowFactor: 0.25, slowDuration: 900 },
      { range: 165, damage: 88, cooldown: 1450, burstCount: 2, burstDelay: 170, projectileSpeed: 1600, slowFactor: 0.3,  slowDuration: 1000, upgradeCost: 100 },
      { range: 180, damage: 126, cooldown: 1250, burstCount: 2, burstDelay: 150, projectileSpeed: 1700, slowFactor: 0.35, slowDuration: 1100, upgradeCost: 145 }
    ]
  },
  BOMBER: {
    name: 'Bomber', icon: '💣', baseCost: 450, unlocksAfterWave: 6,
    blurb: "Lobs explosives that splash across a whole group: strong against dense crowds, wasted on a lone target. Unlocked by training a Gatling's Strength to 40.",
    tiers: [
      { range: 150, damage: 22, cooldown: 1500, projectileSpeed: 260, splashRadius: 55 },
      { range: 168, damage: 38, cooldown: 1350, projectileSpeed: 280, splashRadius: 65, upgradeCost: 110 },
      { range: 186, damage: 54, cooldown: 1200, projectileSpeed: 300, splashRadius: 78, upgradeCost: 155 }
    ]
  },
  // CA061 — see HISTORY.md § [1.5.7] Code Archaeology, CA061
  MERCHANT: {
    name: 'Merchant', icon: '👳', baseCost: 140, unlocksAfterWave: 15,
    blurb: "Keeps the Shop open while he stands; if he is downed, the Shop stays closed until another Merchant is standing. A deliberately weak fighter whose Money Bag bursts into coins over a wide radius and reloads slowly. Unlocks at Wave 15.",
    tiers: [
      { range: 170, damage: 40, cooldown: 35000, projectileSpeed: 200, splashRadius: 110 },
      { range: 185, damage: 55, cooldown: 32000, projectileSpeed: 210, splashRadius: 125, upgradeCost: 160 },
      { range: 200, damage: 75, cooldown: 29000, projectileSpeed: 220, splashRadius: 140, upgradeCost: 220 }
    ]
  },
  // CA062 — see HISTORY.md § [1.5.7] Code Archaeology, CA062
  GLAIVE: {
    name: 'Glaive', icon: '⚙️', baseCost: 130, unlocksAfterWave: 20,
    blurb: "A heavy gun built for fortifications: 5x damage against Huts and Castles, ordinary against everything else, with a very long reload. Unlocks at Wave 20.",
    tiers: [
      { range: 170, damage: 60,  cooldown: 8000, projectileSpeed: 340 },
      { range: 185, damage: 85,  cooldown: 7200, projectileSpeed: 360, upgradeCost: 175 },
      { range: 200, damage: 115, cooldown: 6500, projectileSpeed: 380, upgradeCost: 240 }
    ]
  },
  GATLING: {
    name: 'Gatling', icon: '🌪️', baseCost: 400, unlocksAfterWave: 9,
    blurb: "Fires a rapid stream of light shots that shreds swarms. Unlocked by training an Archer's Strength to 500.",
    tiers: [
      { range: 150, damage: 5,  cooldown: 140, projectileSpeed: 560 },
      { range: 170, damage: 7,  cooldown: 110, projectileSpeed: 600, upgradeCost: 100 },
      { range: 190, damage: 10, cooldown: 90,  projectileSpeed: 640, upgradeCost: 150 }
    ]
  },
  HACKER: {
    name: 'Hacker', icon: '💻', baseCost: 150, unlocksAfterWave: 0,
    blurb: "Does not attack and has almost no health. When hit, he vanishes behind a smoke screen and turns stealthy, though area attacks can still reach him. Tap him to open the Hack menu. Requires Hacks to be enabled in Settings, and only one can be on the field at a time, downed or not.",
    tiers: [
      { range: 0, damage: 0, cooldown: 999999 }
    ]
  },
  BARRICADE: {
    name: 'Barricade', icon: '🚧', baseCost: 0, woodCost: 600, stoneCost: 300, unlocksAfterWave: 0,
    blurb: "A tough obstacle that blocks the road: nothing gets past a standing one, breakaway enemies included, though enemies never go out of their way to attack it. Bought from Build with wood and stone (or a free-barricade charge), then placed on a path tile.",
    tiers: [
      { range: 0, damage: 0, cooldown: 999999 }
    ]
  },
  LOG_MILL: {
    name: 'Log Mill', icon: '🪵', baseCost: PRODUCER_DEFS.LOG_MILL.build.gold, woodCost: PRODUCER_DEFS.LOG_MILL.build.wood, stoneCost: PRODUCER_DEFS.LOG_MILL.build.stone, unlocksAfterWave: 0,
    blurb: "Saws and stacks wood every 60 seconds, including between waves, with a larger delivery at each level. Costs gold, wood and stone, and each extra mill costs more. It does not fight and cannot be moved; enemies can attack it like any stickman, and it burns as its health falls.",
    tiers: [ { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 } ]
  },
  STONE_QUARRY: {
    name: 'Stone Quarry', icon: '⛰️', baseCost: PRODUCER_DEFS.STONE_QUARRY.build.gold, woodCost: PRODUCER_DEFS.STONE_QUARRY.build.wood, stoneCost: PRODUCER_DEFS.STONE_QUARRY.build.stone, unlocksAfterWave: 0,
    blurb: "Cuts and hauls stone every 60 seconds, including between waves, with a larger delivery at each level. Costs gold, wood and stone, and each extra quarry costs more. It does not fight and cannot be moved; enemies can attack it like any stickman, and it burns as its health falls.",
    tiers: [ { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 } ]
  },
  VAULT: {
    name: 'Vault', icon: '🏛️', baseCost: PRODUCER_DEFS.VAULT.build.gold, woodCost: PRODUCER_DEFS.VAULT.build.wood, stoneCost: PRODUCER_DEFS.VAULT.build.stone, unlocksAfterWave: 0,
    blurb: "A stone vault that only stores items: 18 slots in three rows of six, and two stone-and-wood expansions each add another row of six. Drag items in from the ground or from a stickman and drag them out again; gear inside gives no bonus. Costs a little gold and wood and a lot of stone, and each extra vault costs more. It does not fight and cannot be moved; enemies can attack it like any stickman, and selling it puts its items back on the ground.",
    tiers: [ { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 }, { range: 0, damage: 0, cooldown: 999999 } ]
  },
  CLERIC: {
    name: 'Cleric', icon: '✝️', baseCost: 375, unlocksAfterWave: 5,
    blurb: "Calls down holy light after the longest cooldown of any tower, dealing 5x damage to undead and ignoring their armor, enough to finish small undead in one strike (bosses can survive). Once per wave it also heals the weakest tower, and several Clerics each choose a different one. Unlocked by training a Mage's Intelligence to 500.",
    tiers: [
      { range: 150, damage: 11, cooldown: 12500, healAmount: 25, curseDuration: 3000 },
      { range: 170, damage: 16, cooldown: 11000, healAmount: 40, curseDuration: 3400, upgradeCost: 95 },
      { range: 190, damage: 22, cooldown: 9500,  healAmount: 60, curseDuration: 3800, upgradeCost: 150 }
    ]
  },
  // CA063 — see HISTORY.md § [1.5.7] Code Archaeology, CA063
  NECROMANCER: {
    name: 'Necromancer', icon: '💀', baseCost: 550, unlocksAfterWave: 0,
    blurb: "Fires dark bolts and, at the start of each round, raises a band of skeletons to hold the line; they crumble when the round ends and a fresh band rises with the next. Only one can stand on the board. Unlocked by training a Mage's Strength to 500.",
    tiers: [
      { range: 175, damage: 30, cooldown: 2200, projectileSpeed: 900,  skeletonCount: 2, skeletonDamage: 6,  skeletonCooldown: 900, skeletonRange: 70 },
      { range: 190, damage: 46, cooldown: 1900, projectileSpeed: 950,  skeletonCount: 3, skeletonDamage: 9,  skeletonCooldown: 800, skeletonRange: 75, upgradeCost: 130 },
      { range: 205, damage: 68, cooldown: 1600, projectileSpeed: 1000, skeletonCount: 4, skeletonDamage: 13, skeletonCooldown: 700, skeletonRange: 80, upgradeCost: 190 }
    ]
  },
  POPE: {
    name: 'Pope', icon: '🧑‍🦳', baseCost: 800, unlocksAfterWave: 0,
    blurb: "A Cleric's final form: a holy nova strikes every enemy in range at once, still dealing 5x damage to undead, and he still heals the weakest tower once per wave. Only one can stand on the board. Unlocked by training a Cleric's Intelligence to 500.",
    tiers: [
      { range: 160, damage: 30, cooldown: 8000, healAmount: 80, curseDuration: 4000 },
      { range: 180, damage: 40, cooldown: 7200, healAmount: 100, curseDuration: 4400, upgradeCost: 220 },
      { range: 200, damage: 52, cooldown: 6400, healAmount: 130, curseDuration: 4800, upgradeCost: 300 }
    ]
  },
  CRAZY_CHEF: {
    name: 'Crazy Chef', icon: '🔪', baseCost: 500, unlocksAfterWave: 0,
    blurb: "A ranged bruiser who scales on Strength: she hurls a burst of five kitchen knives, then spends ten seconds restocking. Unlocked by training an Archer's Strength to 100.",
    tiers: [
      { range: 130, damage: 16, cooldown: 400, projectileSpeed: 430 },
      { range: 145, damage: 24, cooldown: 360, projectileSpeed: 460, upgradeCost: 95 },
      { range: 160, damage: 34, cooldown: 320, projectileSpeed: 500, upgradeCost: 140 }
    ]
  },
  BLOWDART: {
    name: 'Blowdart', icon: '🎯', baseCost: 400, unlocksAfterWave: 7,
    blurb: "Short range and light hits, but it fires faster than an Archer, and every dart is poisoned for steady damage over time. Unlocked by training an Archer's Dexterity to 250.",
    tiers: [
      { range: 120, damage: 7,  cooldown: 460, projectileSpeed: 420, poisonDamage: 2, poisonDuration: 2600 },
      { range: 135, damage: 10, cooldown: 390, projectileSpeed: 450, poisonDamage: 4, poisonDuration: 2800, upgradeCost: 90 },
      { range: 150, damage: 14, cooldown: 320, projectileSpeed: 480, poisonDamage: 6, poisonDuration: 3200, upgradeCost: 130 }
    ]
  },
  SQUIRTGUN: {
    name: 'Dual Squirt Gun', icon: '🔫', baseCost: 650, unlocksAfterWave: 0,
    blurb: "Twin water pistols spraying green acid that coats every enemy in a small splash. Each coat stacks up to 3 times, slowing like glue and burning like poison, but the shots themselves barely hurt. Only one can stand on the board. Unlocked by training a Blowdart's Dexterity to 40.",
    tiers: [
      { range: 125, damage: 2, cooldown: 340, projectileSpeed: 460, acidDamage: 2, acidDuration: 3600, acidSlow: 0.10, acidRadius: 34 },
      { range: 140, damage: 3, cooldown: 300, projectileSpeed: 490, acidDamage: 3, acidDuration: 3900, acidSlow: 0.12, acidRadius: 40, upgradeCost: 95 },
      { range: 160, damage: 5, cooldown: 260, projectileSpeed: 520, acidDamage: 5, acidDuration: 4200, acidSlow: 0.15, acidRadius: 46, upgradeCost: 135 }
    ]
  },
  // CA064 — see HISTORY.md § [1.5.7] Code Archaeology, CA064
  BLOW_GUNNER: {
    name: 'Blow Gunner', icon: '♨️', baseCost: 700, unlocksAfterWave: 0,
    blurb: "Fires darts carrying scalding vapor: the Blowdart's poison and a brief chilling slow land together on every hit. Unlocked by training an Archer's Strength and Intelligence to 500 each.",
    tiers: [
      { range: 125, damage: 9,  cooldown: 300, projectileSpeed: 460, poisonDamage: 4, poisonDuration: 3200, slowFactor: 0.2,  slowDuration: 900 },
      { range: 140, damage: 13, cooldown: 250, projectileSpeed: 490, poisonDamage: 6, poisonDuration: 3400, slowFactor: 0.25, slowDuration: 1000, upgradeCost: 105 },
      { range: 155, damage: 19, cooldown: 205, projectileSpeed: 520, poisonDamage: 9, poisonDuration: 3800, slowFactor: 0.3,  slowDuration: 1100, upgradeCost: 150 }
    ]
  },
  // CA065 — see HISTORY.md § [1.5.7] Code Archaeology, CA065
  PROTON: {
    name: 'Proton', icon: '☄️', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Strength and Dexterity to 250. Its bolts burn on contact and disrupt the target's nerves, slowing it.",
    tiers: [
      { range: 190, damage: 26, cooldown: 1500, projectileSpeed: 1000, poisonDamage: 10, poisonDuration: 3000, slowFactor: 0.3,  slowDuration: 1200 },
      { range: 210, damage: 40, cooldown: 1300, projectileSpeed: 1100, poisonDamage: 15, poisonDuration: 3200, slowFactor: 0.38, slowDuration: 1400, upgradeCost: 140 },
      { range: 230, damage: 58, cooldown: 1100, projectileSpeed: 1200, poisonDamage: 22, poisonDuration: 3600, slowFactor: 0.45, slowDuration: 1600, upgradeCost: 200 }
    ]
  },
  // CA066 — see HISTORY.md § [1.5.7] Code Archaeology, CA066
  DARK_MATTER: {
    name: 'Dark Matter', icon: '🕳️', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Strength and Intelligence to 250. Its void-black bolts sap the target's energy, hitting harder with the slow than with the burn.",
    tiers: [
      { range: 195, damage: 22, cooldown: 1450, projectileSpeed: 950,  poisonDamage: 8,  poisonDuration: 3100, slowFactor: 0.4,  slowDuration: 1500 },
      { range: 215, damage: 34, cooldown: 1250, projectileSpeed: 1050, poisonDamage: 12, poisonDuration: 3300, slowFactor: 0.48, slowDuration: 1700, upgradeCost: 145 },
      { range: 235, damage: 50, cooldown: 1050, projectileSpeed: 1150, poisonDamage: 18, poisonDuration: 3700, slowFactor: 0.55, slowDuration: 1900, upgradeCost: 205 }
    ]
  },
  // CA067 — see HISTORY.md § [1.5.7] Code Archaeology, CA067
  QUASAR: {
    name: 'Quasar', icon: '🌟', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Dexterity and Intelligence to 250. Its blinding bursts hit everything in a small radius, not only the direct target.",
    tiers: [
      { range: 190, damage: 20, cooldown: 1700, projectileSpeed: 900,  splashRadius: 55, poisonDamage: 8,  poisonDuration: 2800, slowFactor: 0.3,  slowDuration: 1300 },
      { range: 210, damage: 31, cooldown: 1500, projectileSpeed: 1000, splashRadius: 65, poisonDamage: 12, poisonDuration: 3000, slowFactor: 0.36, slowDuration: 1500, upgradeCost: 180 },
      { range: 230, damage: 46, cooldown: 1300, projectileSpeed: 1100, splashRadius: 75, poisonDamage: 18, poisonDuration: 3400, slowFactor: 0.42, slowDuration: 1700, upgradeCost: 260 }
    ]
  },
  GUNALINDER: {
    name: 'Cowboy', icon: '🤠', baseCost: 550, unlocksAfterWave: 0,
    blurb: "Fires all six chambers of a revolver in a rapid burst, then reloads for a long while: precision in place of splash. Unlocked by training a Bomber's Intelligence to 40.",
    tiers: [
      { range: 150, damage: 9,  cooldown: 1700, burstCount: 6, burstDelay: 90, projectileSpeed: 380 },
      { range: 165, damage: 13, cooldown: 1550, burstCount: 6, burstDelay: 80, projectileSpeed: 410, upgradeCost: 150 },
      { range: 180, damage: 18, cooldown: 1400, burstCount: 6, burstDelay: 70, projectileSpeed: 440, upgradeCost: 210 }
    ]
  },
  SNIPER: {
    name: 'Sniper', icon: '🦅', baseCost: 800, unlocksAfterWave: 0,
    blurb: "One devastating shot at the longest range of any tower, with a very slow reload. Only one can stand on the board. Unlocked by training a Cowboy's or a Marksman's Intelligence to 60.",
    tiers: [
      { range: 200, damage: 120, cooldown: 2800, projectileSpeed: 600 },
      { range: 220, damage: 170, cooldown: 2600, projectileSpeed: 640, upgradeCost: 260 },
      { range: 240, damage: 230, cooldown: 2400, projectileSpeed: 680, upgradeCost: 340 }
    ]
  },
  MARKSMAN: {
    name: 'Marksman', icon: '🧊', baseCost: 425, unlocksAfterWave: 6,
    blurb: "One carefully aimed rifle shot at a time: more range and damage than the Archer, without the Gatling's rate of fire or the Blowdart's poison. Unlocked by training an Archer's Intelligence to 500.",
    tiers: [
      { range: 160, damage: 60,  cooldown: 1000, projectileSpeed: 520 },
      { range: 180, damage: 85,  cooldown: 900,  projectileSpeed: 560, upgradeCost: 140 },
      { range: 200, damage: 115, cooldown: 800,  projectileSpeed: 600, upgradeCost: 190 }
    ]
  }
};
/* =========================================================
   STRATEGY TIPS, ARCHETYPES AND UNLOCKS
   ========================================================= */
// CA012 — see HISTORY.md § [1.5.7] Code Archaeology, CA012
const TOWER_STRATEGY = {
  CRAZY_CHEF: { icon: '🔪', text: 'A ranged knife thrower whose damage scales with Strength. Invest in Strength to increase knife damage.' },
  HAMMERMAN: { icon: '🔨', text: 'Front-line tank: highest HP of any tower and a chance to stun on breakaway. Place it where enemies hit first, and let squishier towers shoot over its shoulder.' },
  PALADIN:   { icon: '✝️', text: 'Holy front-liner: Hammerman\'s tankiness plus bonus damage against undead. The answer to an Undead Uprising wave — put it where the coffins are heaviest.' },
  AXEMAN:    { icon: '🪓', text: 'Switch-hitter: toggle between melee and thrown axes once per wave. Read the wave, then commit — it can\'t change its mind again until the next one.' },
  SPEARMAN:  { icon: '🔱', text: 'Reach fighter: longer melee range than any other Warrior, so it can hit before enemies close in. Place it one tile back from the chokepoint, not right on it.' },
  GATLING:   { icon: '🔫', text: 'Sustained rate of fire over raw per-hit power. Best against long, high-count waves (Swarm, The Grind) where uptime matters more than a single big hit.' },
  NINJA: { icon:'🥷', text:'Rapid alternating stars reward focused fire. Light damage per hit, with no close-range blind spot.' },
  BLOWDART:  { icon: '🧪', text: 'Poison DoT specialist: modest hit damage, but the poison keeps ticking after the shot lands. Strong against tanky single targets that will stay in range a while.' },
  SQUIRTGUN: { icon: '💧', text: 'Dual-gun acid DoT, Blowdart\'s bigger sibling. Two independent damage-over-time stacks instead of one — thrives the same way, just harder.' },
  BOMBER:    { icon: '💣', text: 'The only splash-damage tower — one shot hits every enemy in its blast radius. Built for dense clumps (Swarm, Elite Vanguard), wasted on a single isolated target.' },
  MERCHANT:  { icon: '👳', text: 'Keeps the Shop open while alive — downed, and it locks until another one is standing. Deliberately the worst combat tower in the game; his real value is Shop access and passive gold from Money Bag coin bursts, not his damage.' },
  GLAIVE:    { icon: '⚙️', text: 'Anti-structure specialist — 5x damage against Hut/Castle/Grave buildings specifically, unremarkable against ordinary enemies. Huge reload; save him for the buildings, not the horde.' },
  GUNALINDER:{ icon: '🔄', text: 'Burst-fire revolver: several fast shots, then a longer reload. Real DPS is high but lumpy — check its 🥈 DPS stat, not just the per-shot number, to judge it fairly.' },
  SNIPER:    { icon: '🔭', text: 'Longest range and heaviest single-hit damage of any tower, but slow. Place it where it can see the most of the path at once rather than close to a chokepoint.' },
  MARKSMAN:  { icon: '🔫', text: "Ice Archer's specialization: one carefully aimed shot at a time, longer range and harder-hitting than base Archer but without Gatling's rate of fire or Blowdart's poison. Deep INT investment unlocks the Sniper." },
  SNAPCASTER:{ icon: '⚡', text: 'Mage class unlocked through DEX instead of INT: faster casts than base Mage, with a chance to chain lightning to a nearby second target. Rewards a DEX-heavy build over the usual INT one.' },
  CLERIC:    { icon: '✨', text: 'A support tower that heals allies and directly smites undead. Its immediate holy hit deals 5x damage and ignores armor, making it especially dangerous to small undead while bosses can endure it.' },
  POPE:      { icon: '⛪', text: "Unlocked for the Build menu when a Cleric reaches 500 INT, the per-stat cap. Hits every enemy in range at once instead of one target. Placement matters more than ever: it wants to see as much of the path as possible, not just one chokepoint." },
  NECROMANCER:{ icon: '💀', text: "Mage class unlocked through STR instead of INT: a dark bolt attack, plus a small band of skeleton minions raised near it at the start of every round (gone again the instant the round ends). The skeletons aren't a one-time boost — budget for them fresh each round, and place this where its own raised band can actually reach the path." },
  BLOW_GUNNER:{ icon: '♨️', text: "Archer class unlocked by pushing STR and INT both to 500, not just the one that locked the attunement first. Every hit carries both Blowdart's poison DoT and a Mage-style chilling slow at once, a genuinely different identity from either single-element sibling rather than a stronger version of one." },
  CAT_SNAPPER:{ icon: '🐈‍⬛', text: "Unlocked by an Archer reaching 500 DEX — a raw stat threshold, not tied to which element that Archer ends up attuning to. Throws temporary shadow-cat companions instead of dealing damage directly; the real question when placing this is whether its cats can actually reach the path, not just this tower's own range." },
  PROTON:{ icon: '☄️', text: "Fire and Electric combined. Any stickman earns it by training both STR and DEX to 250: every hit burns its target and chains lightning to nearby enemies." },
  DARK_MATTER:{ icon: '🕳️', text: "Fire and Ice combined. Any stickman earns it by training both STR and INT to 250: every hit burns its target and can freeze it in place." },
  QUASAR:{ icon: '🌟', text: "Electric and Ice combined. Any stickman earns it by training both DEX and INT to 250: every hit chains lightning to nearby enemies, can freeze its target and splashes everything in a small radius around it." },
  BERSERKER:{ icon: '👹', text: "An Axeman pushed to STR 500 instead of a second element — trades the throw-toggle for a much wider, harder cleave. Bring it in close where its swing can actually catch a crowd; it's a brute-force AoE tool, not a precision one." },
  LANCER:{ icon: '🎯', text: "A Spearman pushed to DEX 500 carries a knight lance and strikes harder against larger, heavier enemies. Damage scales with target size: half damage at tiny scale, normal damage at standard scale, and up to 1.75x against the heaviest foes." },
};
// CA073 — see HISTORY.md § [1.5.7] Code Archaeology, CA073
// CLASS-EMOJI-01 (1.7.111) — see HISTORY.md § [1.7.111]: no two classes share an emoji; the strategy tips use the class's own icon
for(const strategyType of Object.keys(TOWER_STRATEGY)) if(CONFIG.TOWERS[strategyType]) TOWER_STRATEGY[strategyType].icon = CONFIG.TOWERS[strategyType].icon;
const CLASS_ARCHETYPE = {
  SWORDSMAN:'WARRIOR', AXEMAN:'WARRIOR', SPEARMAN:'WARRIOR', HAMMERMAN:'WARRIOR', PALADIN:'WARRIOR',
  NINJA:'ARCHER', ARCHER:'ARCHER', BLOWDART:'ARCHER', GATLING:'ARCHER', BOMBER:'ARCHER', SQUIRTGUN:'ARCHER', MERCHANT:'ARCHER', GLAIVE:'ARCHER',
  GUNALINDER:'ARCHER', SNIPER:'ARCHER', SNAPCASTER:'ARCHER', MARKSMAN:'ARCHER', BLOW_GUNNER:'ARCHER',
  MAGE:'MAGE', CLERIC:'MAGE', POPE:'MAGE', NECROMANCER:'MAGE', HACKER:'MAGE',
  // CA025 — see HISTORY.md § [1.5.7] Code Archaeology, CA025
  CAT_SNAPPER:'MAGE',
  // CA026 — see HISTORY.md § [1.5.7] Code Archaeology, CA026
  PROTON:'MAGE', DARK_MATTER:'MAGE', QUASAR:'MAGE', CRAZY_CHEF:'ARCHER',
  // CA027 — see HISTORY.md § [1.5.7] Code Archaeology, CA027
  BERSERKER:'WARRIOR', LANCER:'WARRIOR'
};
// CA048 — see HISTORY.md § [1.5.7] Code Archaeology, CA048
const TOWER_UNLOCK_SOURCE_BY_TARGET = {}; // target type -> the REAL mechanical unlock source — internal only now (see TOWER_UNLOCK_RIDDLE in buildTowerModal() for what's actually shown to players), kept for deriving UNLOCKABLE_TOWER_TYPES and any future dev/debug tooling
for(const baseType of Object.keys(SPECIALIZATIONS)){
  for(const element of Object.keys(SPECIALIZATIONS[baseType])){
    TOWER_UNLOCK_SOURCE_BY_TARGET[SPECIALIZATIONS[baseType][element]] = { kind: 'element', baseType, element };
  }
}
for(const sourceType of Object.keys(EVOLUTIONS)){
  for(const stat of Object.keys(EVOLUTIONS[sourceType])){
    const branch = EVOLUTIONS[sourceType][stat];
    TOWER_UNLOCK_SOURCE_BY_TARGET[branch.target] = { kind: 'stat', baseType: sourceType, stat, threshold: branch.threshold };
  }
}
// CA049 — see HISTORY.md § [1.5.7] Code Archaeology, CA049
for(const baseType of Object.keys(HYBRID_SPECIALIZATIONS)){
  for(const pairKey of Object.keys(HYBRID_SPECIALIZATIONS[baseType])){
    TOWER_UNLOCK_SOURCE_BY_TARGET[HYBRID_SPECIALIZATIONS[baseType][pairKey]] = { kind: 'hybrid', baseType, pairKey };
  }
}
// CA050 — see HISTORY.md § [1.5.7] Code Archaeology, CA050
TOWER_UNLOCK_SOURCE_BY_TARGET.CAT_SNAPPER = { kind: 'stat', baseType: 'ARCHER', stat: 'dex', threshold: SPECIALIZATION_THRESHOLD };
// CA051 — see HISTORY.md § [1.5.7] Code Archaeology, CA051
TOWER_UNLOCK_SOURCE_BY_TARGET.CRAZY_CHEF = { kind: 'stat', baseType: 'ARCHER', stat: 'str', threshold: ATTUNEMENT_THRESHOLD };
// CA052 — see HISTORY.md § [1.5.7] Code Archaeology, CA052
TOWER_UNLOCK_SOURCE_BY_TARGET.MERCHANT = { kind: 'wave', baseType: null };
TOWER_UNLOCK_SOURCE_BY_TARGET.NINJA = { kind: 'challenge', baseType: null };
// Same reasoning as Merchant directly above — a plain wave gate, no evolution/stat path.
TOWER_UNLOCK_SOURCE_BY_TARGET.GLAIVE = { kind: 'wave', baseType: null };
// CA053 — see HISTORY.md § [1.5.7] Code Archaeology, CA053
const UNLOCKABLE_TOWER_TYPES = Object.keys(TOWER_UNLOCK_SOURCE_BY_TARGET);
/* =========================================================
   ELEMENTS
   ========================================================= */
// ELEMENT-TINT-01 (1.6.86) — see HISTORY.md § [1.6.86]. Once a tower has locked an elemental
// attunement (or carries a mixed elementState — see towerElement()), its skin tints toward that
// element's color on top of its own native skin tone, and its attack animation shows the element's
// themed emoji at the muzzle. A downed tower's grey overrides this (drawn after, in Tower.draw()).
const ELEMENT_SKIN_TINTS = {
  FIRE:     { skinMain: '#ff9466', skinShade: '#cc4a1f' },
  ELECTRIC: { skinMain: '#fde68a', skinShade: '#d4a017' },
  ICE:      { skinMain: '#bfe8fd', skinShade: '#4fa8d8' },
  PROTON:      { skinMain: '#ffb069', skinShade: '#d4701f' },
  DARK_MATTER: { skinMain: '#a8a0cf', skinShade: '#5a4f8a' },
  QUASAR:      { skinMain: '#cfe6ff', skinShade: '#6aa0e0' }
};
const ELEMENT_ATTACK_EMOJI = { FIRE: '🔥', ELECTRIC: '⚡', ICE: '❄️', PROTON: '☄️', DARK_MATTER: '🌑', QUASAR: '🌟' };
// CA039 — see HISTORY.md § [1.5.7] Code Archaeology, CA039
// ELEMENT-INFUSION-01 (1.7.36) — see HISTORY.md § [1.7.36]. Elements are earned by a stickman, never built as towers.
const ELEMENT_INFUSE_THRESHOLD = 250;
const ELEMENT_COMPONENTS = { PROTON:['FIRE','ELECTRIC'], DARK_MATTER:['FIRE','ICE'], QUASAR:['ELECTRIC','ICE'] };
// One palette for every elemental visual — projectile tint, flight trail and melee swing arc.
const ELEMENT_VISUALS = {
  FIRE:        { color:'#ff7a2f', glow:'rgba(255,122,47,0.55)' },
  ICE:         { color:'#7dd3fc', glow:'rgba(125,211,252,0.55)' },
  ELECTRIC:    { color:'#ffe14d', glow:'rgba(255,225,77,0.55)' },
  PROTON:      { color:'#ff5722', glow:'rgba(255,87,34,0.6)' },
  QUASAR:      { color:'#c792ea', glow:'rgba(199,146,234,0.6)' },
  DARK_MATTER: { color:'#b39ddb', glow:'rgba(120,110,160,0.6)' }
};
const ELEMENT_LABELS = { PROTON:'☄️ Proton', QUASAR:'🌟 Quasar', DARK_MATTER:'🌑 Dark Matter', FIRE:'🔥 Fire', ICE:'🧊 Ice', ELECTRIC:'⚡ Electric' };
function towerElement(tower){ return tower ? (tower.elementState || tower.attunement) : null; }
/* =========================================================
   PROMOTIONS AND MASTERY
   ========================================================= */
const MASTERY_THRESHOLD = STAT_TOTAL_CAP; // trophy + XP-to-gold conversion
const MASTERY_XP_PER_GOLD = 25;
const PROMOTION_ROLL_MAX = 3; // promotion buys stat ROLLS only (1-3 per stat, +1-3 into the primary) — never direct combat power
const PROMOTION_COST_GROWTH = 1.5; // matches the authored tier costs (~80 → 120 → 175 → 245), then keeps compounding
function promotionRankLabel(rank){ return 'Rank ' + rank; }
function promotionCostFor(firstPromotionCost, currentLevel){ return Math.round(firstPromotionCost * Math.pow(PROMOTION_COST_GROWTH, currentLevel - 1)); }
// PROMOTION-SCALE-01 (1.6.145) — see HISTORY.md § [1.6.145]. A promotion is worth 5 training bars of dice applied automatically (passive) and another 5 handed over as spendable points (active).
const PROMOTION_BAR_MULTIPLIER = 5;
const PROMOTION_PASSIVE_ROLLS = PROMOTION_BAR_MULTIPLIER * TRAINING_BAR_ROLLS, PROMOTION_SPENDABLE_ROLLS = PROMOTION_BAR_MULTIPLIER * TRAINING_BAR_ROLLS;
// LEVELUP-QUIET-01 (1.6.113) — see HISTORY.md § [1.6.113]
const LEVELUP_FANFARE_MIN_HP_FRACTION = 0.25;
// CA558 — see HISTORY.md § [1.5.7] Code Archaeology, CA558
const XP_TEXT_LIFE_MS = 1100;
/* =========================================================
   CLASS BALANCE AND ANIMATION
   ========================================================= */
const ARCHER_IDLE_ANGLE = 0; // Archer's bow is a two-handed rig tied to a fixed-position quiver on the back — a neutral forward-facing angle keeps the bow, arms, and quiver all reading as one coherent pose
// MAGE-RECOIL-01 (1.7.61): casting kicks the staff back (equal and opposite to the bolt), flips the tip up, pushes the body back, and flashes the orb with a ring and sparks.
const MAGE_CAST_RECOIL_MS = 450;
function mageRecoilKick(castProgress){ return castProgress * castProgress * (1 + 0.35 * Math.sin((1 - castProgress) * Math.PI * 3)); }
const ARCHER_RATE_SHARE = 0.4; // Legacy balance reference; runtime cadence now uses attackRateFromDex.
const SWORDSMAN_ATTACK_COOLDOWN_MULTIPLIER = 1.2;
function applyClassCooldownBalance(type, cooldown){
  return Math.round(cooldown * (type === 'SWORDSMAN' ? SWORDSMAN_ATTACK_COOLDOWN_MULTIPLIER : type === 'MAGE' ? 1.4 : 1.15));
}
function towerVisualCenterY(t){
  // CA261 — see HISTORY.md § [1.5.7] Code Archaeology, CA261
  const buildScaleY = t.buildScaleY || (JOB_BUILD[t.type] && JOB_BUILD[t.type].scaleY) || 1;
  return t.y + (-5.5) * STICKMAN_SCALE * buildScaleY;
}
// CA502 — see HISTORY.md § [1.5.7] Code Archaeology, CA502
function towerSwingDir(tower){
  if(tower.swingHandedness === undefined) tower.swingHandedness = Math.random() < 0.5 ? 1 : -1;
  return tower.swingHandedness;
}
// ARCHER-NOCK-01 (1.7.114): one formula gives the arrowhead position of the nocked arrow in the archer's local drawing space, used by the renderer and by fireProjectile so the shot leaves exactly where the drawn arrow was.
const ARCHER_BASE_ARM_LEN = 13, ARCHER_BOW_ARM_EXTRA = 5, ARCHER_FRONT_SHOULDER_OFFSET = 1.8, ARCHER_ARROWHEAD_REACH = 4, ARCHER_DRAW_PUSH = 2;
function archerNockedArrowTip(angle, drawAmount, headReach = ARCHER_ARROWHEAD_REACH){
  const bowArmLength = ARCHER_BASE_ARM_LEN + ARCHER_BOW_ARM_EXTRA + drawAmount*ARCHER_DRAW_PUSH, bend = -0.08 - drawAmount*0.10;
  const frontShoulderX = -Math.sin(angle)*ARCHER_FRONT_SHOULDER_OFFSET, frontShoulderY = -13 + Math.cos(angle)*ARCHER_FRONT_SHOULDER_OFFSET;
  const upperLength = bowArmLength*0.52, foreLength = bowArmLength*0.48 + headReach;
  return { x: frontShoulderX + Math.cos(angle + bend)*upperLength + Math.cos(angle)*foreLength, y: frontShoulderY + Math.sin(angle + bend)*upperLength + Math.sin(angle)*foreLength };
}
const ARCHER_ARROW_PIVOT_Y = -15, ARCHER_RENOCK_SHARE = 0.35;
/* =========================================================
   TOWER CLASS
   ========================================================= */
// CA210 — see HISTORY.md § [1.5.7] Code Archaeology, CA210
function towerCountOnBoard(type){
  let n = 0;
  for(const t of towerPool) if(t.active && t.type === type) n++;
  return n;
}
function towerDisplayName(tower){ return (tower.legendaryName || tower.def.name) + ' ' + tower.def.icon; }
function isPlainStuckArrow(a){ const kind = a.kind; return kind !== 'AXE' && kind !== 'DART' && kind !== 'BULLET' && kind !== 'PELLET' && kind !== 'KNIFE' && kind !== 'BLADE'; }
// CA378 — see HISTORY.md § [1.5.7] Code Archaeology, CA378
class Tower{
  constructor(){ this.active = false; }
  // CA379 — see HISTORY.md § [1.5.7] Code Archaeology, CA379
  // MOVE-WALKS-01 (1.7.44): owner decision — when a stickman is moved to another tile he walks there with the walking animation instead of teleporting. The tile is reserved
  // at once (so nothing else can be placed on it), the body travels there at a steady pace, and he cannot act until he arrives.
  walkTo(gridX, gridY){
    this.gridX = gridX; this.gridY = gridY;
    this.walkTargetX = gridX*TILE_SIZE + TILE_SIZE/2; this.walkTargetY = gridY*TILE_SIZE + TILE_SIZE/2;
    this.isWalking = true; this.walkPhase = this.walkPhase || 0; this.target = null;
    this.walkSpeed = Math.max(WALK_SPEED_PX_PER_MS, Math.hypot(this.walkTargetX - this.x, this.walkTargetY - this.y)/2400); // a long walk never takes more than about 2.4 seconds
    invalidateSpawnFlags();
  }
  advanceWalk(dt){
    const dx = this.walkTargetX - this.x, dy = this.walkTargetY - this.y, dist = Math.hypot(dx, dy), step = (this.walkSpeed || WALK_SPEED_PX_PER_MS) * dt;
    this.walkPhase = (this.walkPhase || 0) + dt*0.022;
    if(dist <= step || dist < 0.5){ this.x = this.walkTargetX; this.y = this.walkTargetY; this.isWalking = false; this.walkPhase = undefined; invalidateSpawnFlags(); return; }
    this.x += dx/dist*step; this.y += dy/dist*step;
  }
  setGridPosition(gridX, gridY){
    this.isWalking = false; this.walkPhase = undefined;
    this.gridX = gridX; this.gridY = gridY;
    this.x = gridX*TILE_SIZE + TILE_SIZE/2;
    this.y = gridY*TILE_SIZE + TILE_SIZE/2;
    invalidateSpawnFlags();
  }
  create(type, gridX, gridY){
    this.id = idCounter++;
    this.type = type;
    if(type === 'BARRICADE') activeBarricades.add(this); // see activeBarricades' own declaration — every creation path funnels through here
    this.setGridPosition(gridX, gridY);
    this.level = 1;
    this.target = null;
    this.cooldownTimer = 0;
    this.angle = type === 'ARCHER' ? ARCHER_IDLE_ANGLE : IDLE_WEAPON_ANGLE;
    this.poseDrawAngle=this.angle; this.poseDrawTime=presentationTime;
    this.renderSwordAngle = IDLE_WEAPON_ANGLE;
    this.targetMode = 'FIRST';
    this.totalSpent = CONFIG.TOWERS[type].baseCost;
    this.isSwinging = false;
    this.hitSet = new Set();
    this.lastSwordAngle = 0;
    this.swingStart = 0;
    this.swingArc = type === 'BERSERKER' ? Math.PI * 1.1 : type === 'SPEARMAN' ? Math.PI * SPEARMAN_SWEEP_ARC_FRACTION : Math.PI * 0.85; // SPEARMAN-SWEEP-01 (1.8.40): the Spearman's sweep is the widest melee arc in the game // Berserker's own wide cleave (~198°) — same per-type override precedent as TWOHANDER Swordsman's own chooseSpec(), just fixed at construction instead of chosen mid-game since Berserker is a whole separate class, not a spec pick
    this.swingDuration = type === 'SPEARMAN' ? 550 : 300;
    this.slowFactor = 0; this.slowDuration = 0; this.splashRadius = 0;
    this.meleeRange = 0; this.meleeDamage = 0; this.meleeCooldown = 0;
    this.stunMs = 0; // HAMMERMAN only, from tier config
    this.isDrawing = false; this.drawStart = 0; this.drawProgress = 0; this.baseDrawTime = 0; // ARCHER only
    // CA380 — see HISTORY.md § [1.5.7] Code Archaeology, CA380
    this.maxHp = type === 'BARRICADE' ? 10 : isProducerType(type) ? PRODUCER_DEFS[type].hp[0] : (type === 'HACKER' ? HACKER_MAX_HP : (type === 'HAMMERMAN' ? 180 : 100));
    this.stealthUntil = 0;
    this.baseMaxHp = this.maxHp; // snapshot — STR's HP bonus and the Legendary bonus both multiply on top of this, not on top of each other
    this.legendaryHpMult = 1;
    this.barricadeContactSince = null; // gameTime when something first started attacking this barricade — the first point needs a full interval
    this.lastBarricadeHitAt = -99999; // BARRICADE only: gameTime of the last HP loss, for the BARRICADE_HIT_INTERVAL_MS rate limit
    this.barricadeHpLabelUntil = 0;
    this.producerTimerMs = 0; // LOG_MILL / STONE_QUARRY only: game time banked toward the next delivery
    this.ninjaHand=0;this.ninjaSoundAt=-Infinity;
    this.lastFireTime = -99999; // used for brief post-fire flourish animations (e.g. Mage's wand cast)
    this.killCount = 0;      // total kills — each one grants a small amount of EXP toward the tower's level
    this.rageUntil = 0;
    this.bloodLustUntil = 0; // gameTime until the killstreak blood-lust aura fades
    this.killStreak = 0;     // consecutive kills within the streak time window; resets on a lapse or defeat
    this.lastKillTime = 0;
    this.nextStreakTier = 0; // index into KILLSTREAK_TIERS, so each tier only fires once per streak
    this.isLegendary = false;
    this.legendaryName = '';
    this.hp = this.maxHp;
    this.baseShieldPct = type === 'HAMMERMAN' ? 0.35 : 0; // flat damage reduction from breakaway attacks — class ability, not an item, kept separate from item-granted armor
    // CA381 — see HISTORY.md § [1.5.7] Code Archaeology, CA381
    this.shieldPct = this.baseShieldPct;
    this.disabledUntil = 0;   // can't attack while overrun (hp hit 0)
    this.disabledWavesLeft = 0; // reaching 0 HP locks the tower out for the next 2 waves, not just a short timer
    // CA382 — see HISTORY.md § [1.5.7] Code Archaeology, CA382
    this.telemetry = isStructureType(this.type) ? null : { shotsFired: 0, misses: 0, hitsLanded: 0, killsSecured: 0 }; // damage itself reuses the existing lifetimeDamage/waveDamage fields rather than a duplicate counter
    this.burnUntil = 0;       // FIRE breakaway status
    this.burnTickTimer = 0;
    this.iceSlowUntil = 0;    // ICE breakaway status — halves effective attack speed
    this.statusLabelTimer = 0; // periodic reminder text for active status effects
    // WC3-hero-style distributable stats: STR = damage, DEX = attack speed, INT = range
    this.foodConstitution = 0;
    this.str = 0; this.dex = 0; this.int = 0; this.statPoints = 0; this.autoSpend = false;
    this.elementState = null; // null | 'PROTON' | 'QUASAR' | 'DARK_MATTER' — a MIXED element earned from the stat combination, see refreshElementState()
    this.attunement = null; // null | 'FIRE' | 'ELECTRIC' | 'ICE' — permanently locked once set, see checkAttunementAndSpecialization()
    this.moveCharges = 1;
    this.bloodStains = undefined;this.bloodSegmentCount=0;this.bloodPose=undefined;
    this.xp = 0; this.expLevel = 1; // Dota-style EXP level, separate from promotion rank `level` above —
    // grants 1 stat point per completed 100-XP training bar. Fed by last hits (full size-tier XP) and assists (shared fractional pool).
    this.waveXp = 0; // XP earned so far THIS wave only — reset each time a new wave starts, used for the wave-end summary popup
    this.baseDamage = 0; this.baseCooldown = 0; this.baseRange = 0;
    this.baseMeleeDamage = 0; this.baseMeleeCooldown = 0; this.baseMeleeRange = 0;
    this.equippedItems = []; this.isHero = false;
    this.roundBuffs = null;
    this.lastKillTime = -1e9; // KILL-READY-01 (1.8.40): when this stickman last secured a kill
    this.lastTargetTime = 0; // grace-period anchor so briefly losing a target doesn't instantly snap the attack pose back to idle — see update()
    this.axeMode = 'MELEE'; // AXEMAN only: manual toggle, switchable once per wave
    this.axeSwitchesLeft = 1;
    this.spec = null; // SWORDSMAN only, chosen at level 5: 'TWOHANDER' | 'DUAL'
    this.target2 = null;
    this.isSwinging2 = false;
    this.hitSet2 = new Set();
    this.lastSwordAngle2 = 0;
    this.baseAngle2 = 0;
    this.swingStart2 = 0;
    this.renderSwordAngle2 = IDLE_WEAPON_ANGLE;
    this.rollSkinTones();
    this.rollBuild();
    this.active = true;
    if(!isStructureType(type)) everBuiltFighter = true; // see checkAllFightersDown() — lets a genuine "sold/lost everything mid-wave" wipe end the run, without risking a false game-over before the player has built anything at all
    this.applyTierStats();
  }
  get def(){ return CONFIG.TOWERS[this.type]; }
  // STR raises stickman mass to 1.5x at the stat cap; appearance follows sqrt(mass).
  get weight(){ return 1 + clampNum(this.str || 0, 0, 500) / 1000; }
  // CA383 — see HISTORY.md § [1.5.7] Code Archaeology, CA383
  rollSkinTones(){
    const jobColor = JOB_COLORS[this.type] || { main:'hsl(0,0%,80%)', shade:'hsl(0,0%,58%)' };
    const skinL = 35 + Math.random()*53;  // fully independent uniform roll, 35-88 — not anchored to this class's own preset skin lightness
    // CA384 — see HISTORY.md § [1.5.7] Code Archaeology, CA384
    const pantsL = 28 + Math.random()*64; // fully independent uniform roll, 28-92 — not anchored to this class's own preset pants lightness, and not derived from skinL either
    this.skinMain = colorAtLightness(jobColor.main, skinL);
    this.skinShade = colorAtLightness(jobColor.shade, pantsL);
    this.faceColor = colorAtLightness(jobColor.main, clampNum(skinL - (8 + Math.random()*2), 25, 80)); // always 8-10% darker than THIS tower's own skinMain — the one non-independent layer, by design
    this.mustacheColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]; // only ever visible once STR > 47 — see drawStickman() — but rolled here alongside the other stable per-tower appearance traits so it's set the moment the tower exists, not the moment it first qualifies
  }
  // CA385 — see HISTORY.md § [1.5.7] Code Archaeology, CA385
  rollBuild(){
    const base = JOB_BUILD[this.type] || { scaleX:1, scaleY:1 };
    const weightJitter = (Math.random()*2 - 1) * 0.14; // ±14% breadth/weight
    const heightJitter = (Math.random()*2 - 1) * 0.14; // ±14% height, independent of weight so proportions genuinely vary, not just uniform scaling
    this.buildScaleX = clampNum(base.scaleX * (1 + weightJitter), 0.65, 1.55);
    this.buildScaleY = clampNum(base.scaleY * (1 + heightJitter), 0.70, 1.40);
  }
  applyTierStats(){
    this.burstCount = 0; this.burstDelay = 0; // cleared first — Object.assign only sets fields present in the new tier, so a class without burst-fire data (i.e. anything but Cowboy) must not inherit a stale value from whatever this tower was before evolving
    // CA386 — see HISTORY.md § [1.5.7] Code Archaeology, CA386
    this.splashRadius = 0; this.slowFactor = 0; this.slowDuration = 0;
    Object.assign(this, this.def.tiers[Math.min(this.level, this.def.tiers.length) - 1]); // promotions past the authored tier table keep the top tier's baseline; growth comes from promotion stat rolls
    // GLOBAL-ATTACK-SLOW-01 (1.6.60) — see HISTORY.md § [1.6.60]. Direct request: every tower
    // attacks 20% slower. Applied once here, at the single point tier cooldown values land on the
    // instance, rather than hand-editing every tier's cooldown number across every tower.
    this.cooldown = Math.round(this.cooldown * 1.2);
    this.cooldown = applyClassCooldownBalance(this.type, this.cooldown);
    if(this.meleeCooldown) this.meleeCooldown = Math.round(this.meleeCooldown * 1.2);
    // CA387 — see HISTORY.md § [1.5.7] Code Archaeology, CA387
    const TIER_DAMAGE_GROWTH = 0.45; // only 45% of the raw tier-to-tier damage jump carries through
    const tier1 = this.def.tiers[0];
    if(this.damage !== undefined && tier1.damage !== undefined){
      this.baseDamage = Math.round(tier1.damage + (this.damage - tier1.damage) * TIER_DAMAGE_GROWTH);
      this.damage = this.baseDamage; // keep the raw field consistent before recomputeStats() reapplies the stat multiplier on top
    } else {
      this.baseDamage = this.damage;
    }
    this.baseCooldown = this.cooldown;
    this.baseRange = this.range;
    if(this.meleeDamage !== undefined && tier1.meleeDamage !== undefined){
      this.baseMeleeDamage = Math.round(tier1.meleeDamage + (this.meleeDamage - tier1.meleeDamage) * TIER_DAMAGE_GROWTH);
      this.meleeDamage = this.baseMeleeDamage;
    } else {
      this.baseMeleeDamage = this.meleeDamage || 0;
    }
    this.baseMeleeCooldown = this.meleeCooldown || 0;
    this.baseMeleeRange = this.meleeRange || 0;
    this.baseDrawTime = this.drawTime || 0;
    this.baseHealAmount = this.healAmount || 0;
    this.basePoisonDamage = this.poisonDamage || 0;
    this.burstShotsLeft = 0; // burst-fire state (Cowboy's revolver) — fresh cycle after any tier change
    this.recomputeStats();
  }
  // CA388 — see HISTORY.md § [1.5.7] Code Archaeology, CA388
  recomputeStats(){
    // CA389 — see HISTORY.md § [1.5.7] Code Archaeology, CA389
    if(this.type === 'BARRICADE'){ this.maxHp = 10; return; }
    if(isProducerType(this.type)){ this.maxHp = PRODUCER_DEFS[this.type].hp[this.level - 1] || PRODUCER_DEFS[this.type].hp[0]; this.baseMaxHp = this.maxHp; this.hp = Math.min(this.hp, this.maxHp); return; }
    let itemStr = 0, itemDex = 0, itemInt = 0, itemArmor = 0, rangeItemMult = 1;
    this.wearsFancyHat = false; this.wearsRunningShoes = false;
    for(const it of this.equippedItems){ itemStr += it.str || 0; itemDex += it.dex || 0; itemInt += it.int || 0; itemArmor += it.armor || 0; rangeItemMult *= 1 + (it.rangeBonus || 0); if(it.id === 'FANCY_HAT') this.wearsFancyHat = true; if(it.extraMove) this.wearsRunningShoes = true; }
    // CA390 — see HISTORY.md § [1.5.7] Code Archaeology, CA390
    this.shieldPct = Math.min(0.9, this.baseShieldPct + itemArmor*0.01);
    const heroBonus = this.isHero ? HERO_BONUS_STAT : 0;
    const globalStr = (globalPassiveCounts.GLOBAL_STR || 0)+(runBoonCounts.GLOBAL_STR || 0);
    const globalDex = (globalPassiveCounts.GLOBAL_DEX || 0)+(runBoonCounts.GLOBAL_DEX || 0);
    const globalInt = (globalPassiveCounts.GLOBAL_INT || 0)+(runBoonCounts.GLOBAL_INT || 0);
    const totalStr = this.str + itemStr + heroBonus + globalStr;
    const totalDex = this.dex + itemDex + heroBonus + globalDex;
    const totalInt = this.int + itemInt + heroBonus + globalInt;
    // CA391 — see HISTORY.md § [1.5.7] Code Archaeology, CA391
    const archetype = CLASS_ARCHETYPE[this.type];
    const strEff = archetype === 'WARRIOR' ? totalStr * PREFERRED_STAT_MULT : totalStr;
    const dexEff = archetype === 'ARCHER' ? totalDex * PREFERRED_STAT_MULT : totalDex;
    const intEff = archetype === 'MAGE' ? totalInt * PREFERRED_STAT_MULT : totalInt;
    const strPref = archetype === 'WARRIOR' ? PREFERRED_STAT_MULT : 1, dexPref = archetype === 'ARCHER' ? PREFERRED_STAT_MULT : 1, intPref = archetype === 'MAGE' ? PREFERRED_STAT_MULT : 1;
    const strPoints = statEffectPoints((this.str + heroBonus + globalStr) * strPref, itemStr * strPref), dexPoints = statEffectPoints((this.dex + heroBonus + globalDex) * dexPref, itemDex * dexPref), intPoints = statEffectPoints((this.int + heroBonus + globalInt) * intPref, itemInt * intPref);
    // CA392 — see HISTORY.md § [1.5.7] Code Archaeology, CA392
    const strMult = 1 + PRIMARY_DAMAGE_PER_POINT * strPoints;
    // CA393 — see HISTORY.md § [1.5.7] Code Archaeology, CA393
    // DEX attack cadence uses the capped late-building curve below.
    // CA394 — see HISTORY.md § [1.5.7] Code Archaeology, CA394
    const dexMult = attackRateFromDex(totalDex);
    const intRangeFraction = Math.min(1, intPoints / STAT_EFFECT_CAP); // reaches the class range cap exactly at 500 INT
    // Crazy Chef is an Archer that hits with Strength — her knives are thrown, not shot.
    const archerDamageStat = dexEff;
    const dexDamageMult = 1 + PRIMARY_DAMAGE_PER_POINT * dexPoints;
    const intDamageMult = 1 + PRIMARY_DAMAGE_PER_POINT * intPoints;
    // CA395 — see HISTORY.md § [1.5.7] Code Archaeology, CA395
    const primaryDamageMult = archetype === 'WARRIOR' ? strMult : archetype === 'ARCHER' ? dexDamageMult : archetype === 'MAGE' ? intDamageMult : 1;
    this.damage = Math.max(1, Math.round(this.baseDamage * primaryDamageMult * 0.7)); // COMBAT-BALANCE-181: lower direct damage, including loaded defenders
    // CA396 — see HISTORY.md § [1.5.7] Code Archaeology, CA396
    this.primaryStatEff = archetype === 'WARRIOR' ? strEff : archetype === 'ARCHER' ? archerDamageStat : archetype === 'MAGE' ? intEff : 0;
    // CA397 — see HISTORY.md § [1.5.7] Code Archaeology, CA397
    if(!this.isVeteran && EVOLVED_TOWER_TYPES.includes(this.type) && this.primaryStatEff >= 250){
      this.isVeteran = true;
      spawnFloatingText(this.x, this.y - this.radius - 18, '⭐ Veteran!', '#ffd700');
    }
    if(this.isVeteran) this.damage = Math.round(this.damage * 1.1);
    this.cooldown = Math.max(this.type==='NINJA'?45:80, Math.round(this.baseCooldown / dexMult));
    if(this.type === 'CLERIC' && this.baseHealAmount) this.healAmount = Math.round(this.baseHealAmount * (1 + intPoints / STAT_EFFECT_CAP));
    // MELEE-RANGE-BALANCE-01 (1.6.108): Cleric used to keep a fixed range while every other class grew toward its cap with INT,
    // so a trained Axeman out-reached it. Cleric now scales like everyone else, toward the longest cap of the melee and support lineage.
    const cap = RANGE_CAPS[this.type] || this.baseRange * 2;
    this.range = interpolateRangeByInt(this.baseRange, cap, intRangeFraction) * rangeItemMult;
    if(this.baseMeleeDamage) this.meleeDamage = Math.max(1, Math.round(this.baseMeleeDamage * primaryDamageMult * 0.7));
    if(this.baseMeleeCooldown) this.meleeCooldown = Math.max(80, Math.round(this.baseMeleeCooldown / dexMult));
    if(this.baseMeleeRange){
      const cap = RANGE_CAPS[this.type] || this.baseMeleeRange * 2;
      this.meleeRange = interpolateRangeByInt(this.baseMeleeRange, cap, intRangeFraction) * rangeItemMult;
    }
    if(this.baseDrawTime) this.drawTime = Math.max(120, Math.round(this.baseDrawTime / dexMult));

    if(this.basePoisonDamage) this.poisonDamage = Math.round(this.basePoisonDamage * (1 + intPoints / STAT_EFFECT_CAP));

    const strForHp = EARLY_HP_CAP_TYPES.includes(this.type) ? Math.min(strPoints, EARLY_STAT_CAP_POINTS) : strPoints;
    const strHpMult = 1 + strForHp * 2 / STAT_EFFECT_CAP; // up to 3x max HP at 500 STR — STR is the late-wave survivability stat
    // CA398 — see HISTORY.md § [1.5.7] Code Archaeology, CA398
    const hpStatBase = HP_STAT_BASE[archetype] || HP_STAT_BASE.MAGE;
    const hpStatRate = HP_STAT_RATE[archetype] || HP_STAT_RATE.MAGE;
    this.hpStat = Math.min(STAT_EFFECT_CAP,hpStatBase + strForHp * hpStatRate * 0.5 + (this.foodConstitution || 0)); // FOOD-CONSTITUTION-01 (1.7.141)
    const hpStatBonus = Math.round(this.hpStat * 10);
    const newMaxHp = Math.round(this.baseMaxHp * strHpMult * this.legendaryHpMult) + hpStatBonus;
    const hpDelta = newMaxHp - this.maxHp;
    this.maxHp = newMaxHp;
    if(hpDelta > 0) this.hp += hpDelta; // gaining max HP heals by the increase, rather than being wasted or forcing a full heal

    const baseMissChance = BASE_MISS_CHANCE_BY_ARCHETYPE[archetype] || BASE_MISS_CHANCE_BY_ARCHETYPE.WARRIOR; // per-archetype baseline (see BASE_MISS_CHANCE_BY_ARCHETYPE)
    this.missChance = computeMissChance(baseMissChance, dexEff); // front-loaded curve — see computeMissChance() for the full design writeup

    // CA399 — see HISTORY.md § [1.5.7] Code Archaeology, CA399
    this.critChance = Math.min(0.5, 0.025 + diminishingStatValue(dexEff, 0.005));
    this.critMult = Math.min(3, 1.2 + diminishingStatValue(intEff, 0.01));

    if(this.rageUntil > gameTime){
      this.damage = Math.round(this.damage * STICKMAN_RAGE_DAMAGE);
      this.cooldown = Math.max(this.type==='NINJA'?45:80, Math.round(this.cooldown / STICKMAN_RAGE_SPEED));
      if(this.meleeDamage) this.meleeDamage = Math.round(this.meleeDamage * STICKMAN_RAGE_DAMAGE);
      if(this.meleeCooldown) this.meleeCooldown = Math.max(80, Math.round(this.meleeCooldown / STICKMAN_RAGE_SPEED));
    }
    const roundBuffs = this.roundBuffs;
    if(roundBuffs){
      this.damage = Math.round(this.damage * roundBuffs.damage);
      this.cooldown = Math.max(this.type==='NINJA'?45:80, Math.round(this.cooldown / roundBuffs.speed));
      this.range = Math.round(this.range * roundBuffs.range);
      if(this.meleeDamage) this.meleeDamage = Math.round(this.meleeDamage * roundBuffs.damage);
      if(this.meleeCooldown) this.meleeCooldown = Math.max(80, Math.round(this.meleeCooldown / roundBuffs.speed));
      if(this.meleeRange) this.meleeRange = Math.round(this.meleeRange * roundBuffs.range);
    }
    if(this.type === 'HACKER'){ this.maxHp = HACKER_MAX_HP; this.hp = Math.min(this.hp, this.maxHp); }
  }
  // Purchase and equip a type-matching shop item with gold (starter items have cost 0, used at creation).
  buyItem(def){
    if(this.equippedItems.length >= MAX_ITEM_SLOTS) return false;
    // CA400 — see HISTORY.md § [1.5.7] Code Archaeology, CA400
    const useFreeCharge = def.isBarricade && freeBarricadesLeft > 0;
    if(!useFreeCharge){
      if(def.cost > 0 && gold < def.cost) return false;
      if(def.woodCost && wood < def.woodCost) return false;
      if(def.stoneCost && stone < def.stoneCost) return false;
    }
    const purchaseGoldBefore = gold, purchaseWoodBefore = wood, purchaseStoneBefore = stone;
    if(useFreeCharge){
      freeBarricadesLeft--;
    } else {
      if(def.cost > 0) gold -= def.cost;
      if(def.woodCost) wood -= def.woodCost;
      if(def.stoneCost) stone -= def.stoneCost;
    }
    const purchased = makeItemInstance(def, 'shop purchase');
    this.equippedItems.push(purchased);
    itemLogHeldBy(purchased, this);
    refreshQuickUse(this);
    this.recomputeStats();
    this.checkHeroStatus();
    trackGameEvent('item_purchased', { item: def.id || def.name, payment_type: useFreeCharge ? 'free_charge' : (def.woodCost || def.stoneCost ? 'wood_stone' : def.cost > 0 ? 'gold' : 'free'), cost:Math.max(0,purchaseGoldBefore-gold), wood_cost:Math.max(0,purchaseWoodBefore-wood), stone_cost:Math.max(0,purchaseStoneBefore-stone) });
    return true;
  }
  // CA401 — see HISTORY.md § [1.5.7] Code Archaeology, CA401
  receiveItem(def){
    if(def && def.isGoldBag) return false; // see HISTORY.md § [1.6.176] Clarify notifications, expansion scenery, and first speed-up, GOLD-BAG-COIN-BURST-01.
    if(isStructureType(this.type) && !isVaultType(this.type)) return false; // BARRICADE-NO-INVENTORY-01 (1.6.121) — see HISTORY.md § [1.6.121]
    const stack = STACKABLE_ITEM_IDS.has(def.id) ? this.equippedItems.find(item => item.id === def.id) : null;
    if(stack){ stack.count = heldCount(stack) + heldCount(def); if(stack.id === 'HONEY' && stack.count >= 5) awardMedal('HONEY_HOARDER'); refreshQuickUse(this); return true; }
    if(this.equippedItems.length >= itemCapacityOf(this)) return false;
    const received = makeItemInstance(def, 'given');
    this.equippedItems.push(received);
    itemLogHeldBy(received, this);
    refreshQuickUse(this);
    this.recomputeStats();
    this.checkHeroStatus();
    return true;
  }
  unequipItem(index){
    const it = this.equippedItems[index];
    if(!it) return false;
    this.equippedItems.splice(index, 1);
    itemLogReleased(it, 'sold back');
    refreshQuickUse(this);
    gold += itemSellValue(it); // MERCHANT-SELL-01: half of what it cost, or half of the merchant's price
    if(it.woodCost) wood += Math.floor(it.woodCost*0.5);
    if(it.stoneCost) stone += Math.floor(it.stoneCost*0.5);
    this.recomputeStats();
    return true;
  }
  checkHeroStatus(){
    if(isStructureType(this.type)) return;
    let gearCount = 0;
    for(const carried of this.equippedItems) if(!isConsumableDef(carried)) gearCount++;
    if(!this.isHero && gearCount >= MAX_ITEM_SLOTS){
      this.isHero = true;
      spawnFloatingText(this.x, this.y - 30, '⭐ HERO!', '#ffd700');
      playSound('hero');
      this.recomputeStats();
    }
  }
  allocateStat(stat){
    if(isStructureType(this.type)) return false; // obstacle, not a tower — defensive invariant even though statPoints should already always be 0 for it
    if(this.statPoints <= 0) return false;
    if(!['str','dex','int'].includes(stat)) return false;
    if(this[stat] >= STAT_EFFECT_CAP) return false;              // per-stat trained cap (500)
    if(getTrainedStatTotal(this) >= STAT_TOTAL_CAP) return false; // combined trained cap (1000)
    this[stat]++;
    this.statPoints--;
    logGameEvent(itemHolderLabel(this) + ' spent a point on ' + stat.toUpperCase() + ' (now ' + this[stat] + ', ' + this.statPoints + ' left to spend)');
    this.recomputeStats();
    this.checkEvolution();
    refreshProgressionMilestones(this);
    return true;
  }
  // CA402 — see HISTORY.md § [1.5.7] Code Archaeology, CA402
  checkEvolution(){
    if(BASE_ATTUNABLE_TYPES.includes(this.type)){
      this.checkAttunementAndSpecialization();
      return;
    }
    this.infuseElements();
    const evoMap = EVOLUTIONS[this.type];
    if(!evoMap) return; // not a base class, or has no further tier to unlock
    let targetType = null;
    if(evoMap.str && this.str >= evoMap.str.threshold) targetType = evoMap.str.target;
    else if(evoMap.dex && this.dex >= evoMap.dex.threshold) targetType = evoMap.dex.target;
    else if(evoMap.int && this.int >= evoMap.int.threshold) targetType = evoMap.int.target;
    if(targetType) unlockTowerTypeBuild(targetType);
  }
  // ELEMENT-INFUSION-01 (1.7.36): every stickman, not only the three starting classes, can be infused at 250 in a stat
  // and mixes a second element at 250 in another stat. Evolved classes use this; base classes also unlock branches above.
  infuseElements(){
    if(isStructureType(this.type)) return;
    if(this.attunement && (this[ATTUNEMENT_STAT_BY_ELEMENT[this.attunement]] || 0) < ELEMENT_INFUSE_THRESHOLD) this.attunement = null;
    if(!this.attunement){
      if(this.str >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.str;
      else if(this.dex >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.dex;
      else if(this.int >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.int;
      if(this.attunement){
        spawnFloatingText(this.x, this.y - 40, ATTUNEMENT_ICON[this.attunement] + ' Infused!', '#ffd700');
        playSound('levelup');
      }
    }
    refreshElementState(this);
  }
  // CA403 — see HISTORY.md § [1.5.7] Code Archaeology, CA403
  checkAttunementAndSpecialization(){
    if(this.attunement && (this[ATTUNEMENT_STAT_BY_ELEMENT[this.attunement]] || 0) < ELEMENT_INFUSE_THRESHOLD) this.attunement = null;
    if(CLASS_ARCHETYPE[this.type] === 'ARCHER' && this.str >= ATTUNEMENT_THRESHOLD) unlockTowerTypeBuild('CRAZY_CHEF'); // an Archer who trains Strength learns to throw knives
    if(!this.attunement){
      if(this.str >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.str;
      else if(this.dex >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.dex;
      else if(this.int >= ELEMENT_INFUSE_THRESHOLD) this.attunement = ATTUNEMENTS.int;
      if(this.attunement){
        // CA404 — see HISTORY.md § [1.5.7] Code Archaeology, CA404
        const target = SPECIALIZATIONS[this.type] && SPECIALIZATIONS[this.type][this.attunement];
        const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[this.attunement];
        const remaining = Math.max(0, specializationThresholdFor(target) - (this[attunedStat]||0));
        const suffix = target ? (' — ' + remaining + ' more ' + attunedStat.toUpperCase() + ' to ' + CONFIG.TOWERS[target].name) : '';
        spawnFloatingText(this.x, this.y - 40, ATTUNEMENT_ICON[this.attunement] + ' Attuned!' + suffix, '#ffd700');
        playSound('levelup');
      }
    }
    // CA405 — see HISTORY.md § [1.5.7] Code Archaeology, CA405
    if(this.type === 'ARCHER' && this.dex >= SPECIALIZATION_THRESHOLD) unlockTowerTypeBuild('CAT_SNAPPER');
    // CA406 — see HISTORY.md § [1.5.7] Code Archaeology, CA406
    refreshElementState(this);
    if(!this.attunement) return;
    const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[this.attunement];
    {
      const target = SPECIALIZATIONS[this.type] && SPECIALIZATIONS[this.type][this.attunement];
      if(target && this[attunedStat] >= specializationThresholdFor(target)) unlockTowerTypeBuild(target); // no target defined for this (type, element) pair yet is a valid, permanent end state — see SPECIALIZATIONS comments
    }
    // CA407 — see HISTORY.md § [1.5.7] Code Archaeology, CA407
    for(const other of Object.values(ATTUNEMENTS)){
      if(other === this.attunement) continue;
      const otherStat = ATTUNEMENT_STAT_BY_ELEMENT[other];
      if(this[otherStat] < SPECIALIZATION_THRESHOLD) continue;
      const pairKey = [this.attunement, other].sort().join('+'); // order-independent — locking Fire first or Ice first both reach 'FIRE+ICE'
      const hybridTarget = HYBRID_SPECIALIZATIONS[this.type] && HYBRID_SPECIALIZATIONS[this.type][pairKey];
      if(hybridTarget) unlockTowerTypeBuild(hybridTarget);
    }
  }
  // NO-EVOLVE-IN-PLACE-01 (1.6.96) — see HISTORY.md § [1.6.96]. There is no evolve-in-place system:
  // reaching a stat threshold permanently unlocks a new type for the Build tray (unlockTowerTypeBuild(),
  // called from checkEvolution()/checkAttunementAndSpecialization() above); the existing tower that
  // triggered it is untouched and keeps playing as what it already is. evolveInto() used to transform a
  // tower in place; it had no remaining call sites and is removed.
  // CA411 — see HISTORY.md § [1.5.7] Code Archaeology, CA411
  applyChefBurst(){
    if(this.type !== 'CRAZY_CHEF') return;
    if(this.chefKnivesLeft === undefined) this.chefKnivesLeft = CHEF_MAGAZINE;
    this.chefKnivesLeft--;
    if(this.chefKnivesLeft <= 0){
      this.chefKnivesLeft = CHEF_MAGAZINE;
      this.cooldownTimer = CHEF_RELOAD_MS;
      spawnFloatingText(this.x, this.y - 40, '🔪 Restocking…', '#e0e0e0');
    }
  }
  canUpgrade(){ if(isProducerType(this.type)) return this.level < PRODUCER_MAX_LEVEL; return this.type !== 'BARRICADE' && this.level < MAX_PROMOTION_LEVEL && this.promotionCapacity() > 0; }
  // CA412 — see HISTORY.md § [1.5.7] Code Archaeology, CA412
  promotionCapacity(){ return Math.max(0, STAT_TOTAL_CAP - getTrainedStatTotal(this) - this.statPoints); }
  // CA413 — see HISTORY.md § [1.5.7] Code Archaeology, CA413
  nextUpgradeCost(){ if(isProducerType(this.type)) return 0; return this.canUpgrade() ? promotionCostFor(firstPromotionCost(this.def), this.level) : 0; }
  updateProducer(dt){
    if(isVaultType(this.type)) return;
    if(this.disabledUntil > gameTime || this.disabledWavesLeft > 0) return;
    this.producerTimerMs += dt;
    if(this.producerTimerMs < PRODUCER_INTERVAL_MS) return;
    this.producerTimerMs -= PRODUCER_INTERVAL_MS;
    const producerDef = PRODUCER_DEFS[this.type], amount = producerDef.yields[this.level - 1];
    if(producerDef.resource === 'wood') wood += amount; else stone += amount;
    spawnFloatingText(this.x, this.y - 34, '+' + amount + producerDef.icon, producerDef.resource === 'wood' ? '#c8a46a' : '#b0bec5', 1400);
    spawnParticles(this.x, this.y, producerDef.resource === 'wood' ? '#c8a46a' : '#b0bec5', 4);
    updateHUD();
  }
  upgradeProducer(){
    const cost = producerUpgradeCost(this);
    if(!cost || !canAffordProducerCost(cost)) return false;
    gold -= cost.gold; wood -= cost.wood; stone -= cost.stone;
    this.totalSpent += cost.gold; this.level++;
    this.recomputeStats(); this.hp = this.maxHp;
    spawnFloatingText(this.x, this.y - 44, '⬆️ Level ' + this.level, '#ffd700');
    spawnParticles(this.x, this.y, '#ffd700', 8);
    return true;
  }
  upgrade(){
    if(isProducerType(this.type)) return this.upgradeProducer();
    if(this.type === 'BARRICADE') return false; // obstacle, not a tower — see recomputeStats() for the full rationale; independent guard here rather than only trusting canUpgrade()
    if(!this.canUpgrade()) return false;
    const cost = this.nextUpgradeCost();
    if(gold < cost) return false;
    gold -= cost; this.totalSpent += cost; this.level++;
    // CA414 — see HISTORY.md § [1.5.7] Code Archaeology, CA414
    const archetype = CLASS_ARCHETYPE[this.type];
    const favoredStat = archetype === 'WARRIOR' ? 'str' : archetype === 'ARCHER' ? 'dex' : archetype === 'MAGE' ? 'int' : null;
    const promotionDice = distributePromotionDice(PROMOTION_PASSIVE_ROLLS, favoredStat);
    const rolled = { str: rollPromotionDice(promotionDice.str), dex: rollPromotionDice(promotionDice.dex), int: rollPromotionDice(promotionDice.int) };
    const granted = { str:0, dex:0, int:0 };
    for(const stat of ['str','dex','int']){
      for(let i = 0; i < rolled[stat]; i++){
        if(this[stat] >= STAT_EFFECT_CAP || getTrainedStatTotal(this) >= STAT_TOTAL_CAP) break;
        this[stat]++; granted[stat]++;
      }
    }
    const spendablePoints = Math.min(this.promotionCapacity(), rollPromotionDice(PROMOTION_SPENDABLE_ROLLS));
    this.statPoints += spendablePoints;
    if(this.autoSpend) autoSpendStatPoints(this); // two additional promotion rolls become player-allocated points; promotion remains stat-only
    spawnFloatingText(this.x, this.y - 52, '💪+' + granted.str + ' 🏃+' + granted.dex + ' 🧠+' + granted.int, '#ffd700');
    if(spendablePoints) spawnFloatingText(this.x, this.y - 68, '+' + spendablePoints + ' SPENDABLE', '#7dd3fc');
    refreshProgressionMilestones(this);
    this.rollSkinTones(); // re-rolls skin/face shade so leveling up is visibly reflected in appearance, not just stats
    // CA415 — see HISTORY.md § [1.5.7] Code Archaeology, CA415
    this.checkEvolution();
    grantTowerMove(this, 'promotion');
    playSound('click');
    trackGameEvent('tower_upgraded', { tower_type: this.type, level: this.level, cost });
    return true;
  }
  // Called once, right after reaching level 5, when the player picks a Swordsman specialization.
  chooseSpec(spec){
    if(this.type !== 'SWORDSMAN' || this.spec) return;
    if(spec === 'TWOHANDER'){
      this.swingArc = Math.PI * 1.15;                       // huge sweep, ~207°
      this.baseDamage = Math.round(this.baseDamage * 1.6);  // one big hit
      this.baseCooldown = Math.round(this.baseCooldown * 1.25);
    } else if(spec === 'DUAL'){
      this.baseDamage = Math.round(this.baseDamage * 0.75); // two lighter, faster strikes
      this.baseCooldown = Math.round(this.baseCooldown * 0.9);
    }
    this.spec = spec;
    this.recomputeStats(); // reapply STR/DEX on top of the new spec-adjusted base
    playSound('click');
  }
  sellValue(){ return Math.floor(this.totalSpent * 0.7); }

  get targetingRange(){
    if(this.type === 'AXEMAN') return this.axeMode === 'MELEE' ? this.meleeRange : this.range;
    return this.range;
  }
  toggleAxeMode(){
    if(this.type !== 'AXEMAN' || this.axeSwitchesLeft <= 0) return false;
    this.axeMode = this.axeMode === 'MELEE' ? 'RANGE' : 'MELEE';
    this.axeSwitchesLeft--;
    this.target = null; // re-acquire under the new range immediately
    return true;
  }
  findTarget(nearby){
    let attacker = null, attackerDistance = Infinity;
    for(const enemy of nearby){
      if(!enemy.active || enemy.deathResolved || enemy.hp<=0 || enemy.attackBumpTarget !== this) continue;
      const distance = Math.hypot(enemy.x-this.x, enemy.y-this.y);
      if(distance <= this.targetingRange && distance < attackerDistance){ attacker = enemy; attackerDistance = distance; }
    }
    if(attacker){ this.target = attacker; return; }
    // TARGET-MARK-01 (1.6.94): the marked target (see setMarkedTarget()) always wins while in range and
    // after immediate attackers, ahead of ordinary target ranking.
    if(markedTargetEnemy && markedTargetEnemy.active && !markedTargetEnemy.escaped){
      const markedDistance = Math.hypot(markedTargetEnemy.x-this.x, markedTargetEnemy.y-this.y);
      if(markedDistance <= this.targetingRange){
        this.target = markedTargetEnemy;
        return;
      }
    }
    // CA416 — see HISTORY.md § [1.5.7] Code Archaeology, CA416
    const hysteresisMult = this.type === 'MAGE' ? 6.0 : 1.15;
    const hysteresisMultNeg = this.type === 'MAGE' ? 0.35 : 0.85;
    const range = this.targetingRange;
    let best = null, bestScore = -Infinity;
    for(const e of nearby){
      if(!e.active || e.deathResolved || e.hp<=0) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if(d > range) continue;
      const score = this.targetScore(e, d);
      if(score > bestScore){ bestScore = score; best = e; }
    }
    if(this.target && this.target.active){
      const d = Math.hypot(this.target.x-this.x, this.target.y-this.y);
      if(d <= range){
        const currentScore = this.targetScore(this.target, d);
        const threshold = currentScore >= 0 ? currentScore*hysteresisMult : currentScore*hysteresisMultNeg;
        if(!best || best === this.target || bestScore <= threshold) return;
      }
    }
    this.target = best;
  }

  update(dt, enemyHash){
    this.updateHealthStatus(dt);
    if(this.shovelDig && gameTime >= this.shovelDig.finishAt){ const dig = this.shovelDig; this.shovelDig = null; digWithShovel(this, dig.site); refreshQuickUse(this); }
    if(isProducerType(this.type)){ this.updateProducer(dt); return; }
    if(this.isWalking){ this.advanceWalk(dt); return; } // MOVE-WALKS-01: no targeting or attacking while walking
    if(this.type === 'HACKER') return; // HACKER-01: never targets, attacks, trains or promotes
    if(this.disabledUntil > gameTime || this.disabledWavesLeft > 0) return; // overrun by a breakaway enemy — can't act until it recovers
    const iceMult = this.iceSlowUntil > gameTime ? 0.5 : 1;
    const chocolateMult = chocolateAtkSpeedBuffUntil > gameTime ? (1 + CHOCOLATE_ATK_SPEED_BONUS) : 1;
    this.cooldownTimer -= dt*iceMult*chocolateMult;
    // CA417 — see HISTORY.md § [1.5.7] Code Archaeology, CA417
    const isMeleeTower = this.type === 'SWORDSMAN' || this.type === 'SPEARMAN' || this.type === 'HAMMERMAN' || this.type === 'PALADIN' || this.type === 'BERSERKER' || this.type === 'LANCER' || this.type === 'AXEMAN';
    let skipScan = false;
    if(!isMeleeTower){
      if(this.type === 'CLERIC' || this.type === 'POPE'){
        skipScan = this.cooldownTimer > 0; // updateClericSmite/updatePopeSmite already no-op entirely in that state — no behavior change, just skips the scan that fed them nothing
      } else if(this.cooldownTimer > 0 && this.target && this.target.active){
        const dCur = Math.hypot(this.target.x-this.x, this.target.y-this.y);
        if(dCur <= this.targetingRange) skipScan = true;
        else this.target = null; // fell out of range mid-cooldown — drop it so the scan below finds a real target instead of the tower silently holding a dead aim until cooldown expires
      }
    }
    const nearby = skipScan ? EMPTY_QUERY_RESULT : queryNearby(enemyHash, this.x, this.y, this.targetingRange);
    if(nearby.length >= BARK_SWARM_ENEMY_COUNT) requestStickmanBark(this, BARK_TIER_IMPORTANT, '😱', BARK_LINES.SWARM, 2, BARK_CHANCE.SWARM);
    else if(nearby.length === 0 && waveState === 'ACTIVE' && gameTime - Math.max(this.lastTargetTime || 0, waveTelemetry.startedAtGameTime) > BARK_IDLE_MS) requestStickmanBark(this, BARK_TIER_OPTIONAL, '🥱', BARK_LINES.IDLE, 0, BARK_CHANCE.IDLE);
    if(this.type === 'CLERIC'){ this.updateClericSmite(dt, nearby); return; }
    if(this.type === 'POPE'){ this.updatePopeSmite(dt, nearby); return; }
    this.findTarget(nearby);
    if(this.target && !this.target.active) this.target = null;
    if(this.target) this.lastTargetTime = gameTime; // grace-period anchor — see recentlyEngaged below
    // CA418 — see HISTORY.md § [1.5.7] Code Archaeology, CA418
    const recentlyEngaged = this.cooldownTimer > 0 || (gameTime - (this.lastTargetTime||0)) < 500;
    if(this.target){
      if(this.type === 'ARCHER' || this.type === 'MARKSMAN' || this.type === 'SNIPER' || this.type === 'BLOWDART' || this.type === 'SQUIRTGUN' || this.type === 'BLOW_GUNNER'){
        // CA419 — see HISTORY.md § [1.5.7] Code Archaeology, CA419 (superseded in part — mid-flight homing
        // correction is NOT skipped for these anymore, see HISTORY.md § [1.5.8]). Extended to
        // Blowdart/Squirtgun/Blow Gunner in [1.6.7] — same "flies past, damage registers ~2s late"
        // symptom reported for Blowdart specifically, same fix: an exact launch-time intercept
        // instead of the shorter linear extrapolation below, while keeping the mid-flight
        // correction as the safety net for a target that moves after launch.
        this.angle = calculateLeadIntercept(this.x, this.y, this.projectileSpeed || 1, this.target.x, this.target.y, this.target.vx, this.target.vy);
      } else {
        const dx = this.target.x-this.x, dy = this.target.y-this.y;
        const dist = Math.hypot(dx,dy) || 0.0001;
        // CA420 — see HISTORY.md § [1.5.7] Code Archaeology, CA420
        const timeToImpact = this.projectileSpeed ? Math.min(dist / this.projectileSpeed, MAX_LEAD_PREDICT_TIME) : 0;
        const predX = this.target.x + this.target.vx*timeToImpact;
        const predY = this.target.y + this.target.vy*timeToImpact;
        this.angle = Math.atan2(predY-this.y, predX-this.x);
      }
    } else if(((usesRangedRestPose(this) && !this.target) || (!recentlyEngaged && this.type !== 'MAGE')) && !(gameTime - this.lastKillTime < POST_KILL_READY_MS)){
      // CA421 — see HISTORY.md § [1.5.7] Code Archaeology, CA421
      this.angle = this.type === 'ARCHER' ? ARCHER_IDLE_ANGLE : IDLE_WEAPON_ANGLE;
    } // else: keep whatever this.angle already was — don't snap to idle mid-cooldown or during the grace window
    if(this.type === 'SWORDSMAN' || this.type === 'SPEARMAN' || this.type === 'HAMMERMAN' || this.type === 'PALADIN' || this.type === 'BERSERKER' || this.type === 'LANCER') this.updateSwordsman(dt, nearby);
    else if(this.type === 'AXEMAN') this.updateAxeman(dt, nearby);
    else if(this.type === 'ARCHER') this.updateArcher(dt);
    else this.updateRanged();
  }
  // Only ever engages undead within its detection radius — never fires on ordinary enemies.
  updateClericSmite(dt, nearby){
    if(this.cooldownTimer > 0) return;
    let target = null, bestD = Infinity;
    for(const e of nearby){
      if(!e.isUndead) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if(d < bestD){ bestD = d; target = e; }
    }
    if(!target){ this.angle = IDLE_WEAPON_ANGLE; return; }
    this.angle = Math.atan2(target.y-this.y, target.x-this.x);
    // CA797 — see HISTORY.md § [1.6.61] Cleric smite.
    // Cleric's smite is a direct holy hit, not a delayed poison effect. This makes its
    // anti-undead role legible on impact; it ignores armor but shares the attack miss roll.
    // applyDamage() supplies a 1.5x holy-vs-undead multiplier. Divide the input by it
    // first so the final smite is exactly 5x tower damage, before variance and crits.
    const holyDamage = target.isUndead ? this.damage * (5 / 1.5) : this.damage;
    if(this.telemetry) this.telemetry.shotsFired++;
    const missed=rollDirectAttackMiss(this,target); // ALL-CLASS-MISS-01 (1.7.137)
    if(!missed) target.applyDamage(holyDamage,this,true,true,false,true,true);
    spawnHolyBeam(target.x+(missed ? target.radius*2 : 0),target.y,'#fff3c4');
    playSound('cast_cleric', this.x, undefined, this.y);
    this.cooldownTimer = this.cooldown;
  }
  // CA423 — see HISTORY.md § [1.5.7] Code Archaeology, CA423
  updatePopeSmite(dt, nearby){
    if(this.cooldownTimer > 0) return;
    if(!nearby.length){ this.angle = IDLE_WEAPON_ANGLE; return; }
    const curseDur = this.curseDuration || 3000;
    const tickCount = Math.max(1, Math.round(curseDur / 600));
    const perTick = this.damage / tickCount;
    for(const target of nearby){
      const curseTick = target.isUndead ? Math.round(perTick * 5) : Math.round(perTick);
      if(this.telemetry) this.telemetry.shotsFired++;
      if(!rollDirectAttackMiss(this, target)) target.applyPoison(curseTick, curseDur, this);
    }
    spawnShockring(this.x, this.y, hexToRgba('#ffe9a8', 0.75), this.range);
    spawnShockring(this.x, this.y, hexToRgba('#e6bb61', 0.45), 30);
    playSound('cast_cleric', this.x, undefined, this.y);
    this.cooldownTimer = this.cooldown;
  }
  // Called from a breakaway enemy's attack. Returns true if this hit dropped the tower to 0 HP.
  // HACKER-01 (1.7.36): when attacked the Hacker drops a smoke screen and goes stealth; enemies stop choosing him
  // (see findNearestActiveTower) but direct area damage still reaches him.
  goStealth(){
    this.stealthUntil = gameTime + HACKER_STEALTH_MS;
    spawnParticles(this.x, this.y, '#9aa4ad', graphicsQuality === 'low' ? 6 : 14);
    spawnFloatingText(this.x, this.y - 44, '💨 Stealth', '#cfd8dc');
    for(const enemy of enemyPool) if(enemy.active && enemy.breakawayTarget === this && typeof enemy.endBreakaway === 'function') enemy.endBreakaway();
  }
  takeDamage(amount, statusType, attacker){
    if(hackGodMode && this.type !== 'BARRICADE') return false;
    if(this.type === 'BARRICADE'){
      if(!barricadeAttackReady(this)){ spawnBarricadeStrikeDebris(this, attacker, false); return this.hp <= 0; }
      chipBarricade(this, attacker);
      return this.hp <= 0;
    }
    // CA424 — see HISTORY.md § [1.5.7] Code Archaeology, CA424
    const reduced = Math.max(1, Math.round(amount * (1-(this.shieldPct||0))));
    this.hp = Math.max(0, this.hp - reduced);
    spawnFloatingText(this.x, this.y - 30, '-'+reduced, '#ff5555');
    lastCombatDamageAt = presentationTime;
    if(attacker && isFighterTower(this)){ spawnStickmanWound(this, attacker, reduced); this.maybeEnrage(); }
    if(this.type === 'HACKER') this.goStealth();
    if(this.hp > 0){
      const hpFrac = this.hp / this.maxHp;
      if(hpFrac < 0.25) requestStickmanBark(this, BARK_TIER_VITAL, '🤕', BARK_LINES.CRITICAL, 1, BARK_CHANCE.CRITICAL);
      else if(hpFrac < 0.5) requestStickmanBark(this, BARK_TIER_IMPORTANT, '😟', BARK_LINES.HURT, 2, BARK_CHANCE.HURT);
    }
    // CA425 — see HISTORY.md § [1.5.7] Code Archaeology, CA425
    if(isFighterTower(this) && (!this.lastHitChatterAt || gameTime - this.lastHitChatterAt > 2500)){
      this.lastHitChatterAt = gameTime;
      playSound('chatter_short', this.x, { archetype: CLASS_ARCHETYPE[this.type], pitchBias: -40 }, this.y);
    }
    if(statusType === 'BURN') this.burnUntil = gameTime + 3000;
    if(statusType === 'ICE') this.iceSlowUntil = Math.max(this.iceSlowUntil, gameTime + 3000);
    if(this.hp <= 0 && this.disabledUntil <= gameTime){
      this.disabledUntil = gameTime + 4000;
      this.disabledWavesLeft = 3; // decrements at the start of each wave; 3 correctly locks through both N+1 and N+2, free by N+3 — "out for 2 of the next rounds"
      reportTowerDowned(this, 'attack');
      maybeShowFirstTimeAlert(FIRST_TOWER_DOWN_SEEN_KEY, '⚠️ ' + (this.def ? this.def.name : this.type) + ' overrun. Recovers in a few rounds.', '#ff4444');
      this.hp = Math.round(this.maxHp * 0.3); // recovers with partial HP once the disable ends
      this.killStreak = 0; this.nextStreakTier = 0;
      spawnFloatingText(this.x, this.y - 44, '⚠️ Overrun!', '#ff4444');
      playSound('lose');
      return true;
    }
    return false;
  }
  maybeEnrage(){ // STICKMAN-RAGE-01 (1.8.20): a struck stickman has a small chance to fly into a rage
    if(this.hp <= 0 || this.rageUntil > gameTime || Math.random() >= STICKMAN_RAGE_CHANCE) return;
    this.rageUntil = gameTime + STICKMAN_RAGE_MS;
    awardMedal('ENRAGED');
    this.recomputeStats();
    spawnFloatingText(this.x, this.y - 44, '😡 Enraged!', '#ff4d4d');
    playSound('hero', this.x);
  }
  updateHealthStatus(dt){
    if(this.rageUntil && gameTime >= this.rageUntil){ this.rageUntil = 0; this.recomputeStats(); }
    this.statusLabelTimer -= dt;
    if(this.statusLabelTimer <= 0){
      this.statusLabelTimer = 120000;
      let offset = 0;
      if(this.burnUntil > gameTime){ spawnFloatingText(this.x, this.y - 40 - offset, '🔥 BURNING', '#ff8844'); offset += 14; }
      if(this.iceSlowUntil > gameTime){ spawnFloatingText(this.x, this.y - 40 - offset, '🧊 SLOWED', '#7dd3fc'); offset += 14; }
    }
    if(this.burnUntil > gameTime){
      this.burnTickTimer -= dt;
      if(this.burnTickTimer <= 0){
        this.burnTickTimer = 500;
        this.hp = Math.max(0, this.hp - 4);
        spawnFloatingText(this.x, this.y - 30, '-4🔥', '#ff8844');
        if(this.hp <= 0 && this.disabledUntil <= gameTime){
          this.disabledUntil = gameTime + 4000;
          this.disabledWavesLeft = 3;
          reportTowerDowned(this, 'burn');
          this.hp = Math.round(this.maxHp * 0.3);
          this.killStreak = 0; this.nextStreakTier = 0;
        }
      }
    }
    if(this.type !== 'BARRICADE' && this.hp < this.maxHp && this.disabledUntil <= gameTime && this.disabledWavesLeft <= 0){
      const regenRate = this.isHero ? 0.03 : 0.01; // Heroes recover HP three times as fast
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp*regenRate*dt/1000);
    }
  }

  archerNockAmount(){
    if(!this.target) return 0;
    if(this.isDrawing || this.cooldownTimer <= 0) return 1;
    return clampNum(1 - this.cooldownTimer/Math.max(1, this.cooldown*ARCHER_RENOCK_SHARE), 0, 1);
  }
  updateArcher(dt){
    if(!this.target){ this.isDrawing = false; this.drawProgress = 0; return; }
    if(!this.isDrawing && this.cooldownTimer <= 0){
      this.isDrawing = true;
      this.drawStart = gameTime;
    }
    if(this.isDrawing){
      const elapsed = gameTime - this.drawStart;
      this.drawProgress = Math.min(1, elapsed / Math.max(1, this.drawTime));
      if(this.drawProgress >= 1){
        if(this.fireProjectile()){
          this.isDrawing = false;
          this.drawProgress = 0;
          this.cooldownTimer = this.cooldown;
          this.applyChefBurst(); // Crazy Chef: after the fifth knife this replaces the cooldown with a long restock
        } // else: pool exhausted this frame — stay fully drawn and retry next frame once a slot frees up
      }
    }
  }
  updateRanged(){
    if(this.target && this.cooldownTimer <= 0){
      if(this.burstCount > 1 && this.burstShotsLeft === 0){
        this.burstShotsLeft = this.burstCount; // start a fresh burst
      }
      if(this.fireProjectile()){
        if(this.burstCount > 1){
          this.burstShotsLeft--;
          this.cooldownTimer = this.burstShotsLeft > 0 ? this.burstDelay : this.cooldown;
        } else {
          this.cooldownTimer = this.cooldown;
        }
      } // else: pool exhausted this frame — cooldownTimer stays <=0 and burstShotsLeft is untouched, so the very next frame retries the same shot rather than silently consuming it
    }
  }
  fireProjectile(){
    this.lastFireTime = gameTime;
    // CA426 — see HISTORY.md § [1.5.7] Code Archaeology, CA426
    const angle = this.angle;
    // CA427 — see HISTORY.md § [1.5.7] Code Archaeology, CA427
    const armLen = 13;
    const weaponScale = (this.baseRange && this.baseRange > 0) ? Math.min(1.6, Math.max(1.0, this.range / this.baseRange)) : 1;
    let localReach;
    switch(this.type){
      case 'ARCHER': localReach = armLen + 5 + 2; break; // bowArmLen at full draw (drawAmt=1, since firing only happens then)
      case 'MAGE': localReach = armLen + weaponLenFromScale(14, 22, weaponScale); break;
      case 'SNAPCASTER': localReach = armLen + weaponLenFromScale(14, 22, weaponScale); break;
      case 'BOMBER': localReach = armLen + weaponLenFromScale(12, 19, weaponScale); break;
      case 'GATLING': localReach = armLen + weaponLenFromScale(14, 22, weaponScale); break;
      case 'BLOWDART': localReach = armLen*0.7 + 14*weaponScale; break; // short pipe held near the mouth — matches the render formula exactly, which does scale the pipe length
      case 'SQUIRTGUN': localReach = armLen*0.9 + weaponLenFromScale(11, 17, weaponScale); break;
      case 'BLOW_GUNNER': localReach = armLen*0.85 + weaponLenFromScale(9, 14, weaponScale); break;
      case 'CAT_SNAPPER': localReach = armLen + weaponLenFromScale(10, 16, weaponScale); break;
      case 'NECROMANCER': localReach = armLen + weaponLenFromScale(10, 15, weaponScale); break;
      case 'PROTON': localReach = armLen + weaponLenFromScale(10, 15, weaponScale); break;
      case 'DARK_MATTER': localReach = armLen + weaponLenFromScale(10, 15, weaponScale); break;
      case 'QUASAR': localReach = armLen + weaponLenFromScale(10, 15, weaponScale); break;
      default: localReach = armLen + 10;
    }
    const muzzleOffset = localReach * STICKMAN_SCALE;
    // CA428 — see HISTORY.md § [1.5.7] Code Archaeology, CA428
    const bodyScaleY = this.buildScaleY || (JOB_BUILD[this.type] && JOB_BUILD[this.type].scaleY) || 1;
    const legendaryScale = this.isLegendary ? 1.1 : 1;
    const pivotBaseY = (this.type === 'BLOWDART' || this.type === 'BLOW_GUNNER') ? -21 : this.type === 'ARCHER' ? ARCHER_ARROW_PIVOT_Y : -13; // ARROW-HEIGHT-01 (1.7.112): the archer's arrows leave 2 px higher, level with the string // Blow Gunner is also a mouth-anchored blowgun weapon, same as Blowdart — keep the spawn point in sync
    const shoulderYWorld = pivotBaseY * STICKMAN_SCALE * bodyScaleY * legendaryScale;
    let spawnX = this.x + Math.cos(angle)*muzzleOffset;
    let spawnY = this.y + shoulderYWorld + Math.sin(angle)*muzzleOffset;
    if(this.type==='ARCHER'){ // ARROW-GRIP-01 (1.7.124): the arrow is released from the bow hand itself (the grip at the middle of the bow), not from a point out ahead of it, so it no longer appears to leave the quiver side and drift to the target
      const arrowTip=archerNockedArrowTip(angle,1,0), bodyScaleX=(this.buildScaleX||1)*Math.sqrt(this.weight)*STICKMAN_SCALE*legendaryScale, bodyScaleYWorld=(this.buildScaleY||1)*Math.sqrt(this.weight)*STICKMAN_SCALE*legendaryScale;
      spawnX=this.x+arrowTip.x*bodyScaleX; spawnY=this.y+arrowTip.y*bodyScaleYWorld;
    }
    if(this.type==='NINJA'){
      const bend=this.ninjaHand?0.45:-0.45;
      const weightScale=Math.sqrt(this.weight)*legendaryScale*STICKMAN_SCALE;
      const hx=Math.cos(angle+bend)*armLen*0.52+Math.cos(angle)*armLen*0.48;
      const hy=-13+Math.sin(angle+bend)*armLen*0.52+Math.sin(angle)*armLen*0.48;
      spawnX=this.x+hx*this.buildScaleX*weightScale;
      spawnY=this.y+hy*this.buildScaleY*weightScale;
    }
    // CLOSE-SHOT-01 (1.7.106) — see HISTORY.md § [1.7.106]: against an enemy closer than the muzzle reach the shot used to spawn beside or past the target and fly up to 180 degrees off the aim. The spawn point now stops a short run-up before the target's edge on the line from the shoulder, so the shot always travels forward along the aim.
    if(this.target && this.type !== 'NINJA'){
      const pivotY = this.y + shoulderYWorld, toTargetX = this.target.x - this.x, toTargetY = this.target.y - pivotY, pivotDistance = Math.hypot(toTargetX, toTargetY);
      const closeReach = pivotDistance - ((this.target.radius || 14) + CLOSE_SHOT_RUNUP_PX);
      if(closeReach < muzzleOffset && pivotDistance > 0.001){
        const reach = Math.max(0, closeReach);
        spawnX = this.x + toTargetX/pivotDistance*reach; spawnY = pivotY + toTargetY/pivotDistance*reach;
      }
    }
    const p = acquireActive(projectilePool);
    if(!p) return false; // pool exhausted — caller must not treat this as a fired shot
    if(this.type==='NINJA') this.ninjaHand=1-this.ninjaHand;
    if(this.telemetry) this.telemetry.shotsFired++;
    p.active = true;
    p.renderPrevX = undefined; p.renderPrevY = undefined;
    p.x = spawnX; p.y = spawnY;
    // PROJECTILE-AIM-01 (1.6.95) — see HISTORY.md § [1.6.95]. `angle` above is aimed from the tower's
    // CENTER at the target, but the muzzle spawns well above center (shoulderYWorld — largest for
    // Blowdart/Blow Gunner, mouth-anchored weapons). Firing along that same angle from the elevated
    // spawn point sends the shot flying parallel to, but above, the correct line — worst at close
    // range, exactly the reported "dart fires over the target's head" bug. Flight direction is
    // recomputed from the actual spawn point to the target; the muzzle POSITION above still uses the
    // tower-center angle, since that's what makes the weapon point convincingly at the target.
    const flightAngle = this.target ? Math.atan2(this.target.y - spawnY, this.target.x - spawnX) : angle;
    p.vx = Math.cos(flightAngle)*this.projectileSpeed;
    p.vy = Math.sin(flightAngle)*this.projectileSpeed;
    // CA429 — see HISTORY.md § [1.5.7] Code Archaeology, CA429
    p.spawnTime = gameTime;
    p.maxFlightMs = Math.max(600, (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000 * 1.8);
    p.damage = this.damage;
    // CA430 — see HISTORY.md § [1.5.7] Code Archaeology, CA430
    if(this.type === 'GLAIVE' && this.target && this.target.isHutBuilding) p.damage = Math.round(p.damage * 5);
    // CA431 — see HISTORY.md § [1.5.7] Code Archaeology, CA431
    if(this.burstCount === 2 && this.burstShotsLeft < this.burstCount) p.damage = Math.round(p.damage * 0.25);
    p.angle = flightAngle; // PROJECTILE-AIM-01 (1.6.95): visual orientation matches the corrected flight direction, not the muzzle-position angle
    p.slowFactor = this.slowFactor || 0;
    p.slowDuration = this.slowDuration || 0;
    p.splashRadius = (this.splashRadius || 0) + (towerElement(this) === 'QUASAR' ? QUASAR_ELEMENT_SPLASH_RADIUS : 0);
    p.isAxe = false;
    p.ammo = PROJECTILE_AMMO_BY_TOWER[this.type] || 'ARROW';
    const arcFlightDistancePx = Math.hypot(this.target.x - spawnX, this.target.y - spawnY); // ARROW-LOOK-01 (1.7.91)
    p.arcSpawnTime = gameTime; p.arcFlightMs = (arcFlightDistancePx / this.projectileSpeed) * 1000; p.flightDistancePx = arcFlightDistancePx;
    p.arcPx = p.ammo === 'ARROW' ? Math.min(ARROW_ARC_MAX_PX, arcFlightDistancePx * ARROW_ARC_PER_PX) : 0;
    // CA432 — see HISTORY.md § [1.5.7] Code Archaeology, CA432
    p.isMoneyBag = this.type === 'MERCHANT';
    if(p.isMoneyBag){
      p.axeSpawnTime = gameTime;
      p.axeFlightMs = (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000;
    }
    // CA433 — see HISTORY.md § [1.5.7] Code Archaeology, CA433
    p.effectType = this.type === 'CAT_SNAPPER' ? 'CAT' : null;
    p.isMagicMissile = this.type === 'MAGE' || this.type === 'SNAPCASTER' || this.type === 'NECROMANCER' || this.type === 'PROTON' || this.type === 'DARK_MATTER' || this.type === 'QUASAR';
    p.sourceTower = this;
    p.poisonDamage = this.poisonDamage || 0;
    p.poisonDuration = this.poisonDuration || 0;
    p.acidDamage = this.acidDamage || 0; p.acidDuration = this.acidDuration || 0; p.acidSlow = this.acidSlow || 0; p.acidRadius = this.acidRadius || 0; // ACID-COAT-01
    p.elementKey = towerElement(this);
    p.elementColor = (ELEMENT_VISUALS[p.elementKey] || {}).color || null;
    p.color = (this.type === 'MAGE' || this.type === 'SNAPCASTER') ? '#7dd3fc' : this.type === 'BOMBER' ? '#3a2a1a' : this.type === 'BLOWDART' ? '#7cb518' : this.type === 'CAT_SNAPPER' ? '#2a2a2a' : this.type === 'NECROMANCER' ? '#5a2d82' : this.type === 'BLOW_GUNNER' ? '#c8e8f0' : this.type === 'SQUIRTGUN' ? '#8bd62f' : this.type === 'PROTON' ? '#a855f7' : this.type === 'DARK_MATTER' ? '#1a1a2e' : this.type === 'QUASAR' ? '#fdf6d8' : '#f1c40f';
    // CA434 — see HISTORY.md § [1.5.7] Code Archaeology, CA434
    p.trackedTarget = null; p.trackedId = undefined; p.isGuaranteedMiss = false; p.missRevealAt = 0; p.missRevealed = false;
    if(!p.splashRadius && this.target){
      p.trackedTarget = this.target; p.trackedId = this.target ? this.target.id : undefined;
      const willHit = Math.random() >= attackMissChance(this.missChance + windMissPenalty(this), this.target);
      if(!willHit){
        // CA436 — see HISTORY.md § [1.5.7] Code Archaeology, CA436
        const missOffsetPx = Math.max(this.target.radius*1.8, 20) * (Math.random() < 0.5 ? -1 : 1);
        const distToTarget = Math.hypot(this.target.x-spawnX, this.target.y-spawnY) || 1;
        const angleOffset = Math.atan2(missOffsetPx, distToTarget);
        const missAngle = angle + angleOffset;
        p.vx = Math.cos(missAngle)*this.projectileSpeed;
        p.vy = Math.sin(missAngle)*this.projectileSpeed;
        p.angle = missAngle;
        p.isGuaranteedMiss = true;
        if(this.telemetry) this.telemetry.misses++;
        p.missRevealAt = gameTime + (distToTarget/this.projectileSpeed)*1000;
      }
    }
    const rangedSound = {
      ARCHER: 'shot_archer', SNIPER: 'shot_sniper', GATLING: 'shot_gatling',
      BLOWDART: 'shot_blowdart', GUNALINDER: 'shot_gunalinder', SQUIRTGUN: 'shot_squirtgun',
      MARKSMAN: 'shot_gunalinder', CAT_SNAPPER: 'shot_cat', BLOW_GUNNER: 'shot_blowdart',
      CRAZY_CHEF: 'shot_archer', BOMBER: 'shot_bomber', MAGE: 'cast_mage', SNAPCASTER: 'cast_mage', NECROMANCER: 'cast_mage', PROTON: 'cast_mage', DARK_MATTER: 'cast_mage', QUASAR: 'cast_mage'
    }[this.type] || 'shot_archer';
    if(this.type!=='NINJA' || gameTime-(this.ninjaSoundAt ?? -Infinity)>=140){
      playSound(this.type==='NINJA'?'shot_blowdart':rangedSound, this.x, undefined, this.y);
      if(this.type==='NINJA') this.ninjaSoundAt=gameTime;
    }
    return true;
  }

  updateAxeman(dt, nearby){
    if(!this.target){ this.renderSwordAngle = IDLE_WEAPON_ANGLE; }
    if(this.target && !this.isSwinging && this.cooldownTimer <= 0){
      if(this.axeMode === 'MELEE'){
        this.isSwinging = true;
        this.swingStart = gameTime;
        this.hitSet = new Set();
        this.baseAngle = this.angle;
        this.lastSwordAngle = this.baseAngle - this.swingArc/2;
        this.cooldownTimer = this.meleeCooldown;
        playSound('swing_axe', this.x, undefined, this.y);
      } else {
        if(this.fireAxeThrow()) this.cooldownTimer = this.cooldown; // pool exhausted this frame — stay off cooldown and retry next frame otherwise
      }
    }
    if(this.isSwinging){
      const t = Math.min(1, (gameTime-this.swingStart)/this.swingDuration);
      const currAngle = this.baseAngle + this.swingOffset(t);
      this.checkConeHits(nearby, this.lastSwordAngle, currAngle, this.hitSet, this.meleeDamage, this.meleeRange);
      this.lastSwordAngle = currAngle;
      this.renderSwordAngle = currAngle;
      if(t >= 1) this.isSwinging = false;
    } else if(this.target){
      this.renderSwordAngle = this.angle;
    }
  }
  fireAxeThrow(){
    const t = this.target;
    const dx = t.x-this.x, dy = t.y-this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const timeToImpact = Math.min(dist / this.projectileSpeed, MAX_LEAD_PREDICT_TIME); // see MAX_LEAD_PREDICT_TIME note above (1.1.2)
    const predX = t.x + t.vx*timeToImpact;
    const predY = t.y + t.vy*timeToImpact;
    const angle = Math.atan2(predY-this.y, predX-this.x);
    const armLen = 13;
    const weaponScale = (this.baseRange && this.baseRange > 0) ? Math.min(1.6, Math.max(1.0, this.range / this.baseRange)) : 1;
    const muzzleOffset = (armLen + weaponLenFromScale(15, 24, weaponScale)) * STICKMAN_SCALE;
    const bodyScaleY = this.buildScaleY || (JOB_BUILD[this.type] && JOB_BUILD[this.type].scaleY) || 1;
    const legendaryScale = this.isLegendary ? 1.1 : 1;
    const shoulderYWorld = -13 * STICKMAN_SCALE * bodyScaleY * legendaryScale;
    const spawnX = this.x + Math.cos(angle)*muzzleOffset;
    const spawnY = this.y + shoulderYWorld + Math.sin(angle)*muzzleOffset;
    const p = acquireActive(projectilePool);
    if(!p) return false; // pool exhausted — caller must not treat this as a fired shot
    if(this.telemetry) this.telemetry.shotsFired++;
    p.active = true;
    p.renderPrevX = undefined; p.renderPrevY = undefined;
    p.x = spawnX; p.y = spawnY;
    p.vx = Math.cos(angle)*this.projectileSpeed;
    p.vy = Math.sin(angle)*this.projectileSpeed;
    // CA437 — see HISTORY.md § [1.5.7] Code Archaeology, CA437
    p.spawnTime = gameTime;
    p.maxFlightMs = Math.max(600, (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000 * 1.8);
    p.damage = this.damage;
    p.angle = angle;
    p.slowFactor = 0; p.slowDuration = 0; p.splashRadius = 0; p.poisonDamage = 0; p.poisonDuration = 0; p.acidDamage = 0;
    p.isAxe = true; p.spinAngle = 0; p.sourceTower = this; p.isMagicMissile = false;
    // CA438 — see HISTORY.md § [1.5.7] Code Archaeology, CA438
    p.axeSpawnTime = gameTime;
    p.axeFlightMs = Math.max(200, timeToImpact*1000);
    p.effectType = null; // reset — see fireProjectile()'s identical reset for why this must be unconditional on every fire path
    p.color = '#9aa0a6';
    // CA439 — see HISTORY.md § [1.5.7] Code Archaeology, CA439
    p.trackedTarget = t; p.trackedId = t ? t.id : undefined;
    const willHit = Math.random() >= attackMissChance(this.missChance, t);
    p.isGuaranteedMiss = false; p.missRevealAt = 0; p.missRevealed = false;
    if(!willHit){
      const missOffsetPx = Math.max(t.radius*1.8, 20) * (Math.random() < 0.5 ? -1 : 1);
      const angleOffset = Math.atan2(missOffsetPx, dist);
      const missAngle = angle + angleOffset;
      p.vx = Math.cos(missAngle)*this.projectileSpeed;
      p.vy = Math.sin(missAngle)*this.projectileSpeed;
      p.angle = missAngle;
      p.isGuaranteedMiss = true;
      if(this.telemetry) this.telemetry.misses++;
      p.missRevealAt = gameTime + (dist/this.projectileSpeed)*1000;
    }
    this.renderSwordAngle = angle;
    playSound('throw_axe', this.x, undefined, this.y);
    return true;
  }

  isTwoHandedMelee(){ return (this.type === 'SWORDSMAN' && this.spec === 'TWOHANDER') || this.type === 'HAMMERMAN' || this.type === 'PALADIN' || this.type === 'BERSERKER'; }
  updateSwordsman(dt, nearby){
    const hasDual = this.spec === 'DUAL';
    if(!this.isSwinging && this.target && this.cooldownTimer <= 0){
      this.isSwinging = true;
      this.swingStart = gameTime;
      this.hitSet = new Set();
      this.baseAngle = this.angle;
      this.lastSwordAngle = this.baseAngle - this.swingArc/2;
      // TWOHANDED-RHYTHM-01 (1.6.110) — see HISTORY.md § [1.6.110]
      if(this.isTwoHandedMelee()){
        this.rhythmBeat = ((this.rhythmBeat || 0) + 1) % 2;
        this.cooldownTimer = this.cooldown * (this.rhythmBeat === 1 ? 0.4 : 1.6);
      } else {
        this.cooldownTimer = this.cooldown;
      }
      const meleeSound = (this.type === 'SPEARMAN' || this.type === 'LANCER') ? 'swing_pierce'
        : (this.type === 'HAMMERMAN' || this.type === 'PALADIN') ? 'swing_blunt'
        : 'swing_blade'; // Swordsman, Axeman, Berserker
      playSound(meleeSound, this.x, undefined, this.y);

      if(hasDual){
        const secondary = this.findSecondaryTarget(nearby);
        this.target2 = secondary;
        if(secondary){
          this.isSwinging2 = true;
          this.swingStart2 = gameTime + this.swingDuration * DUAL_OFFHAND_DELAY_FRACTION; // DUAL-STAGGER-01 (1.6.121) — see HISTORY.md § [1.6.121]
          this.hitSet2 = new Set();
          this.baseAngle2 = Math.atan2(secondary.y-this.y, secondary.x-this.x);
          this.lastSwordAngle2 = this.baseAngle2 - this.swingArc/2;
        } else {
          this.isSwinging2 = false;
        }
      }
    }
    if(this.isSwinging){
      const t = Math.min(1, (gameTime-this.swingStart)/this.swingDuration);
      const currAngle = this.baseAngle + this.swingOffset(t);
      this.checkConeHits(nearby, this.lastSwordAngle, currAngle, this.hitSet, undefined, undefined, this.stunMs, this.type === 'PALADIN');
      this.lastSwordAngle = currAngle;
      this.renderSwordAngle = currAngle;
      if(t >= 1) this.isSwinging = false;
    } else {
      this.renderSwordAngle = this.target ? this.angle : IDLE_WEAPON_ANGLE;
    }
    if(hasDual){
      if(this.isSwinging2 && gameTime < this.swingStart2){
        this.renderSwordAngle2 = this.baseAngle2 + this.swingOffset(0);
        this.lastSwordAngle2 = this.baseAngle2 - this.swingArc/2;
      } else if(this.isSwinging2){
        const t2 = Math.min(1, (gameTime-this.swingStart2)/this.swingDuration);
        const currAngle2 = this.baseAngle2 + this.swingOffset(t2);
        this.checkConeHits(nearby, this.lastSwordAngle2, currAngle2, this.hitSet2);
        this.lastSwordAngle2 = currAngle2;
        this.renderSwordAngle2 = currAngle2;
        if(t2 >= 1) this.isSwinging2 = false;
      } else {
        this.renderSwordAngle2 = this.target2 ? this.angle : IDLE_WEAPON_ANGLE;
      }
    }
  }
  findSecondaryTarget(nearby){
    let best = null, bestScore = -Infinity;
    for(const e of nearby){
      if(!e.active || e.deathResolved || e.hp<=0 || e === this.target) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if(d > this.range) continue;
      const score = this.targetScore(e, d);
      if(score > bestScore){ bestScore = score; best = e; }
    }
    return best;
  }
  // CA440 — see HISTORY.md § [1.5.7] Code Archaeology, CA440
  targetScore(e, distance){
    switch(this.targetMode){
      case 'FIRST': return e.traveled;
      case 'LAST': return -e.traveled; // TARGET-LAST-01 (1.7.137)
      case 'STRONGEST': return e.hp;
      case 'WEAKEST': return -e.hp;
      case 'FARM': {
        const remainingHp = e.hp - (e.incomingDamage || 0);
        if(remainingHp <= 0) return -1e9;
        return remainingHp <= this.damage ? 1e6 - remainingHp : -remainingHp;
      }
      case 'UNCLAIMED': return e.hp - (e.incomingDamage || 0) <= 0 ? -1e9 : e.traveled;
      case 'ASSIST': return e.maxHp > 0 ? e.hp / e.maxHp * 1000 + e.traveled * 0.001 : 0;
      default: return -distance;
    }
  }
  visualSwingOffset(t){ // same as swingOffset through the strike; the recovery settles on the aim so the blade never snaps back (MELEE-SWING-01)
    const w = this.swingArc;
    if(t < 0.6) return this.swingOffset(t);
    return w * (1 - easeInOutQuad((t - 0.6) / 0.4));
  }
  swingOffset(t){
    const w = this.swingArc;
    if(t < 0.2){
      const p = t/0.2;
      return -(w*0.2)*Math.sin(p*Math.PI/2);
    } else if(t < 0.6){
      const p = (t-0.2)/0.4;
      const ease = 1 - Math.pow(1-p, 3);
      return -(w*0.2) + (w*1.2*ease);
    } else {
      const p = (t-0.6)/0.4;
      return w - (w*p*0.5);
    }
  }
  // CA441 — see HISTORY.md § [1.5.7] Code Archaeology, CA441
  checkConeHits(nearby, prevA, currA, hitSet, damage, radius, stunMs, isHoly){
    damage = damage ?? this.damage;
    radius = radius ?? this.range;
    const lo = Math.min(prevA, currA), hi = Math.max(prevA, currA);
    let streakClaimed = false;
    // CA442 — see HISTORY.md § [1.5.7] Code Archaeology, CA442
    if(hitSet.size >= MELEE_SWEEP_MAX_TARGETS) return;
    // CA443 — see HISTORY.md § [1.5.7] Code Archaeology, CA443
    const slotE = this._sweepE || (this._sweepE = new Array(MELEE_SWEEP_MAX_TARGETS));
    const slotD = this._sweepD || (this._sweepD = new Array(MELEE_SWEEP_MAX_TARGETS));
    let slotCount = 0;
    for(const e of nearby){
      if(hitSet.has(e.id)) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if(d > radius) continue;
      let ang = Math.atan2(e.y-this.y, e.x-this.x);
      while(ang < lo - Math.PI) ang += Math.PI*2;
      while(ang > hi + Math.PI) ang -= Math.PI*2;
      if(ang < lo || ang > hi) continue;
      // CA444 — see HISTORY.md § [1.5.7] Code Archaeology, CA444
      let insertAt = slotCount < MELEE_SWEEP_MAX_TARGETS ? slotCount : -1;
      for(let i = 0; i < slotCount; i++){
        if(d < slotD[i]){ insertAt = i; break; }
      }
      if(insertAt === -1) continue; // farther than every current slot and slots are full
      const endAt = Math.min(slotCount, MELEE_SWEEP_MAX_TARGETS - 1);
      for(let i = endAt; i > insertAt; i--){ slotE[i] = slotE[i-1]; slotD[i] = slotD[i-1]; }
      slotE[insertAt] = e; slotD[insertAt] = d;
      if(slotCount < MELEE_SWEEP_MAX_TARGETS) slotCount++;
    }
    for(let i = 0; i < slotCount; i++){
      const e = slotE[i];
      // Already validated (radius + arc) during selection above — no need to recheck here.
      const isFirstHitThisSwing = hitSet.size === 0; // captured before this hit is added below — true only for the very first target this whole swing connects with
      const fallenOff = Math.pow(1 - MELEE_SWEEP_FALLOFF, hitSet.size); // hitSet.size is this swing's hit count so far, before this one is added
      hitSet.add(e.id);
      if(this.telemetry) this.telemetry.shotsFired++; // melee "shot" = one swing actually connecting with one target, hit or miss — see checkConeHits' own per-target roll below
      if(Math.random() < attackMissChance(this.missChance, e)){
        // CA445 — see HISTORY.md § [1.5.7] Code Archaeology, CA445
        // HUT-PUSHBACK-01 (1.6.7) — see HISTORY.md § [1.6.7]. dodgeEnemyFromSwing() had no
        // isHutBuilding guard, so a missed swing against a Hut/Castle physically shoved the
        // building 7px sideways every time — a static structure visibly sliding on every miss,
        // which is exactly what read as "pushback." Buildings don't dodge; only living enemies do.
        if(!e.isHutBuilding) dodgeEnemyFromSwing(e, this);
        spawnFloatingText(e.x, e.y - e.radius - 6, 'MISS', '#aaaaaa');
        if(this.telemetry) this.telemetry.misses++;
        continue;
      }
      const weightScale = this.type === 'LANCER' ? lancerWeightDamageMultiplier(e.weight) : 1;
      e.applyDamage(Math.round(damage * fallenOff * weightScale), this, !streakClaimed, !!isHoly, isFirstHitThisSwing);
      applyAttunementStatus(this, e);
      if(!e.active) streakClaimed = true; // this hit killed it — only the first such kill counts for streak
      if(stunMs) e.applyStun(stunMs);
    }
  }

  // CA446 — see HISTORY.md § [1.5.7] Code Archaeology, CA446
  drawElementSwingArc(ctx){
    const element = towerElement(this);
    if(!element || graphicsQuality === 'low' || underHeavyVisualLoad || !this.swingStart) return;
    const elapsed = gameTime - this.swingStart;
    if(elapsed < 0 || elapsed > this.swingDuration) return;
    const visuals = ELEMENT_VISUALS[element];
    const progress = clampNum(elapsed / this.swingDuration, 0, 1);
    const reach = (this.meleeRange || 36) * 0.85;
    const start = (this.baseAngle !== undefined ? this.baseAngle : this.angle || 0) - this.swingArc / 2;
    ctx.save();
    ctx.strokeStyle = visuals.glow;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1 - progress * 0.7;
    ctx.beginPath();
    ctx.arc(this.x, this.y, reach, start, start + this.swingArc * progress);
    ctx.stroke();
    ctx.restore();
  }
  drawBloodLustAura(ctx){
    const pulse = 0.5 + 0.5 * Math.sin(gameTime / 160);
    const radius = 26 + pulse * 4;
    ctx.save();
    // CA447 — see HISTORY.md § [1.5.7] Code Archaeology, CA447
    if(graphicsQuality === 'low' || underHeavyVisualLoad){
      ctx.fillStyle = 'rgba(180,10,10,' + (0.28 + pulse * 0.14).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(this.x, this.y, radius * 0.82, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      return;
    }
    const glow = ctx.createRadialGradient(this.x, this.y, radius * 0.25, this.x, this.y, radius);
    glow.addColorStop(0, 'rgba(180,10,10,' + (0.35 + pulse * 0.2).toFixed(2) + ')');
    glow.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(this.x, this.y, radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,40,40,' + (0.5 + pulse * 0.35).toFixed(2) + ')';
    ctx.lineWidth = 2 + pulse;
    ctx.beginPath(); ctx.arc(this.x, this.y, radius * 0.82, 0, Math.PI*2); ctx.stroke();
    for(let i = 0; i < 5; i++){
      const angle = (gameTime / 900) + i * (Math.PI * 2 / 5);
      const dripPhase = ((gameTime / 12) + i * 37) % 26;
      ctx.fillStyle = 'rgba(150,10,10,' + Math.max(0, 0.55 - dripPhase / 60).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(this.x + Math.cos(angle) * radius * 0.82, this.y + Math.sin(angle) * radius * 0.5 + dripPhase, 1.6, 3.4, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawProducer(ctx){
    const producerDef = PRODUCER_DEFS[this.type], downed = this.disabledWavesLeft > 0;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
    if(downed) ctx.globalAlpha = 0.55;
    drawEmojiGroundShadow(ctx, producerDef.parts[0][0], this.x, this.y, 34, 'serif', 1);
    ctx.translate(this.x, this.y);
    for(const [partEmoji, partSize, partX, partY] of producerDef.parts){ ctx.save(); ctx.translate(partX, partY); drawEmojiSprite(ctx, partEmoji, partSize); ctx.restore(); }
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#ffd54f';
    for(let pip = 0; pip < this.level; pip++){ ctx.beginPath(); ctx.arc(this.x - 8 + pip*8, this.y + 19, 2.2, 0, Math.PI*2); ctx.fill(); }
    if(!downed){ const barW = 28; ctx.fillStyle = '#2a2a2a'; ctx.fillRect(this.x - barW/2, this.y + 23, barW, 3); ctx.fillStyle = isVaultType(this.type) ? '#ffd54f' : producerDef.resource === 'wood' ? '#8bc34a' : '#90a4ae'; ctx.fillRect(this.x - barW/2, this.y + 23, barW*Math.min(1, (isVaultType(this.type) ? this.equippedItems.length / itemCapacityOf(this) : this.producerTimerMs/PRODUCER_INTERVAL_MS)), 3); }
    const hpFraction = this.hp / this.maxHp;
    if(hpFraction < 1){ const barW = 30, barY = this.y - 24; ctx.fillStyle = '#3a1a1a'; ctx.fillRect(this.x - barW/2, barY, barW, 4); ctx.fillStyle = 'rgb(' + Math.round(230 - hpFraction*154) + ',' + Math.round(57 + hpFraction*118) + ',' + Math.round(70 + hpFraction*10) + ')'; ctx.fillRect(this.x - barW/2, barY, barW*hpFraction, 4); }
    ctx.restore();
    drawStructureFire(ctx, this.x, this.y, hpFraction, this.id);
  }
  draw(ctx, isSelected){
    if(isProducerType(this.type)){ this.drawProducer(ctx); return; }
    if((this.bloodLustUntil > gameTime || this.rageUntil > gameTime) && isFighterTower(this)) this.drawBloodLustAura(ctx);
    this.drawElementSwingArc(ctx);
    if(this.type === 'BARRICADE'){
      // ENEMY-HEADBUTT-01 (1.7.139): the attacking emoji carries the impact cue; no red damage disc.
      ctx.font = pxFont(28*STICKMAN_SCALE); // 28*STICKMAN_SCALE is a true constant (STICKMAN_SCALE never changes at runtime) — this was rebuilding the identical string on literally every tower, every frame, forever
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // CA449 — see HISTORY.md § [1.5.7] Code Archaeology, CA449
      ctx.fillStyle = '#ffffff';
      drawEmojiGroundShadow(ctx,'🚧',this.x,this.y,28*STICKMAN_SCALE,'serif',1); // SHADOW-ALIGN-01 (1.8.14): the mask uses the font the glyph is drawn with, so the foot lines up
      ctx.fillText('🚧', this.x, this.y);
      if(this.hp < this.maxHp && this.hp > 0){
        const frac = this.hp / this.maxHp;
        const r = Math.round(230 - frac*(230-76));
        const g = Math.round(57 + frac*(175-57));
        const b = Math.round(70 + frac*(80-70));
        ctx.font = 'bold 11px Verdana';
        const hpLabel = Math.round(this.hp) + '/10';
        if(gameTime < (this.barricadeHpLabelUntil || 0)){
          ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.fillText(hpLabel, this.x, this.y - 22);
        }
        const barW = 26, barY = this.y - 14;
        ctx.fillStyle = '#3a1a1a'; ctx.fillRect(this.x-barW/2, barY, barW, 4);
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(this.x-barW/2, barY, barW*frac, 4);
      }
      return;
    }
    // CA450 — see HISTORY.md § [1.5.7] Code Archaeology, CA450
    let lungeAmt = 0, swingProgress = 0;
    if(this.isSwinging && (this.type === 'SWORDSMAN' || this.type === 'SPEARMAN' || this.type === 'HAMMERMAN' || this.type === 'AXEMAN' || this.type === 'BERSERKER' || this.type === 'LANCER')){
      const st = Math.min(1, (gameTime-this.swingStart)/this.swingDuration);
      lungeAmt = meleeLungePx(st) * (this.type === 'SPEARMAN' || this.type === 'LANCER' ? 0.5 : 1); // lean back in the wind-up, step into the strike, settle (MELEE-SWING-01)
      swingProgress = st;
    }
    let castProgress = 0;
    if(this.type === 'MAGE' || this.type === 'SNAPCASTER' || this.type === 'PROTON' || this.type === 'DARK_MATTER' || this.type === 'QUASAR'){
      const sinceFired = gameTime - this.lastFireTime;
      if(sinceFired < MAGE_CAST_RECOIL_MS) castProgress = 1 - sinceFired/MAGE_CAST_RECOIL_MS;
      lungeAmt = -mageRecoilKick(castProgress) * 3; // MAGE-RECOIL-01 (1.7.61): the body is pushed back as the staff kicks
    }
    // CA451 — see HISTORY.md § [1.5.7] Code Archaeology, CA451
    let throwProgress = 0;
    if(this.type === 'CAT_SNAPPER'){
      const sinceThrown = gameTime - this.lastFireTime;
      if(sinceThrown < 350) throwProgress = 1 - sinceThrown/350;
    }
    // CA452 — see HISTORY.md § [1.5.7] Code Archaeology, CA452
    let chargeProgress = 0;
    if((this.type === 'MAGE' || this.type === 'SNAPCASTER' || (this.type === 'SWORDSMAN' && this.spec === 'TWOHANDER')) && this.cooldown > 0){
      chargeProgress = clampNum(1 - (Math.max(0, this.cooldownTimer - renderLeftoverMs()) / this.cooldown), 0, 1);
    }
    const headItemDef = this.equippedItems.find(it => it.headItem);
    const weaponScale = (this.baseRange && this.baseRange > 0) ? Math.min(1.6, Math.max(1.0, this.range / this.baseRange)) : 1;
    const weaponThickness = Math.min(1.8, 1 + diminishingStatValue(this.str, 0.025)); // STR: noticeably thicker blade/head, diminishing and capped
    // CA453 — see HISTORY.md § [1.5.7] Code Archaeology, CA453
    const holdingAfterKill = gameTime - this.lastKillTime < POST_KILL_READY_MS; // KILL-READY-01 (1.8.40): after a kill the weapon stays raised for a few seconds before the idle pose
    const restBlend = clampNum(((gameTime - Math.max(this.lastTargetTime||0, this.lastKillTime + POST_KILL_READY_MS - 2000)) - 2000) / 1500, 0, 1);
    const cheering = presentationTime < waveCheerUntil && !this.target && !this.isSwinging && !(this.disabledWavesLeft > 0) && isFighterTower(this); // WAVE-CHEER-01 (1.8.43)
    const hasTargetPose = !!this.target || holdingAfterKill || cheering || (!usesRangedRestPose(this) &&
      (this.cooldownTimer > 0 || (gameTime - (this.lastTargetTime||0)) < 500));
    const strSizeScale = Math.sqrt(this.weight);
    const isSpearType = this.type === 'LANCER';
    const swingTrail = (this.isSwinging && !isSpearType && swingProgress > 0.2 && swingProgress < 0.82 && this.baseAngle !== undefined && graphicsQuality !== 'low')
      ? { from: this.baseAngle + this.visualSwingOffset(Math.max(0, swingProgress - MELEE_SMEAR_SPAN_T)), to: this.baseAngle + this.visualSwingOffset(swingProgress), strength: swingProgress < 0.6 ? 1 : 1 - (swingProgress - 0.6) / 0.22 } : null;
    const extra = { trailFrom: swingTrail ? swingTrail.from : undefined, trailTo: swingTrail ? swingTrail.to : undefined, trailStrength: swingTrail ? swingTrail.strength : 0, thrustPx: isSpearType && this.isSwinging ? spearThrustPx(swingProgress) : 0, walkPhase: this.isWalking ? (this.walkPhase || 0) : undefined, skinMain: this.skinMain, skinShade: this.skinShade, faceColor: this.faceColor, buildScaleX: this.buildScaleX * strSizeScale, buildScaleY: this.buildScaleY * strSizeScale, lowGfx: graphicsQuality === 'low' || underHeavyVisualLoad, drawProgress: this.drawProgress, nockAmount: this.type === 'ARCHER' ? this.archerNockAmount() : undefined, lungeAmt, swingProgress, castProgress, chargeProgress, throwProgress, isLegendary: this.isLegendary, headItem: headItemDef ? headItemDef.headItem : null, hasTarget: hasTargetPose, weaponScale, weaponThickness, str: this.str, int: this.int, mustacheColor: this.mustacheColor, restBlend };
    extra.bloodOwner = this;
    extra.wearsFancyHat = !!this.wearsFancyHat; extra.wearsRunningShoes = !!this.wearsRunningShoes;
    // ELEMENT-TINT-01 (1.6.86): a locked attunement or mixed element tints skin toward that element,
    // blended on top of this tower's own native colors rather than replacing them outright.
    const activeElement = towerElement(this);
    const elementTint = activeElement && ELEMENT_SKIN_TINTS[activeElement];
    if(elementTint){
      extra.skinMain = tintSkinTowardElement(this.skinMain, elementTint.skinMain, 0.45);
      extra.skinShade = tintSkinTowardElement(this.skinShade, elementTint.skinShade, 0.45);
    }
    if(this.type === 'SWORDSMAN' && this.spec){
      extra.spec = this.spec;
      extra.angle2 = this.spec === 'DUAL' ? this.renderSwordAngle2 : null;
    }
    const usesSwingAngle = this.type === 'SWORDSMAN' || this.type === 'SPEARMAN' || this.type === 'AXEMAN' || this.type === 'HAMMERMAN' || this.type === 'BERSERKER' || this.type === 'LANCER';
    const swingingVisualAngle = (usesSwingAngle && this.isSwinging && this.baseAngle !== undefined)
      ? (this.type === 'LANCER' ? this.baseAngle : this.baseAngle + this.visualSwingOffset(Math.min(1, (gameTime - this.swingStart) / this.swingDuration))) : null;
    const desiredDrawAngle = swingingVisualAngle !== null ? swingingVisualAngle : cheering ? -Math.PI/2 + Math.sin((presentationTime - waveCheerStart)/160 + this.id)*0.35 : (usesSwingAngle ? this.renderSwordAngle : this.angle);
    const poseElapsed = Math.min(100,Math.max(0,presentationTime-(this.poseDrawTime || presentationTime)));
    this.poseDrawTime=presentationTime;
    if(!Number.isFinite(this.poseDrawAngle) || this.isSwinging || this.isSwinging2 || PREFERS_REDUCED_MOTION) this.poseDrawAngle=desiredDrawAngle;
    else this.poseDrawAngle += Math.atan2(Math.sin(desiredDrawAngle-this.poseDrawAngle),Math.cos(desiredDrawAngle-this.poseDrawAngle))*(1-Math.exp(-poseElapsed/75));
    const drawAngle = this.poseDrawAngle;

    if(this.isHero){
      const pulse = Math.sin(performance.now()/200)*1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20+pulse, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,215,0,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if(this.nextStreakTier > 0 && gameTime - this.lastKillTime <= STREAK_TIMEOUT_MS){
      const pulse = Math.sin(performance.now()/150)*2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 24+pulse, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,235,59,0.75)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,235,59,0.6)';
      ctx.shadowBlur = (graphicsQuality === 'low' || underHeavyVisualLoad) ? 0 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if(graphicsQuality === 'high') drawStickmanGroundShadow(ctx, this.x, this.y, drawAngle, this.level, this.type, extra, this);

    const isDisabled = this.disabledUntil > gameTime || this.disabledWavesLeft > 0;
    if(isDisabled){
      // NO-CANVAS-FILTER-01 (1.6.79) — see HISTORY.md § [1.6.79]
      ctx.save();
      ctx.globalAlpha = 0.55;
      extra.skinMain = DOWNED_TOWER_SKIN_MAIN;
      extra.skinShade = DOWNED_TOWER_SKIN_SHADE;
    }
    const hackerStealth = this.type === 'HACKER' && this.stealthUntil > gameTime;
    if(hackerStealth){
      ctx.save(); ctx.globalAlpha = 0.3;
    }
    extra.enchantElement = (activeElement && !isDisabled) ? activeElement : null; // drawn inside drawStickman, on the weapon itself (WEAPON-ENCHANT-SYNC-01)
    const cheerHop = cheering && !PREFERS_REDUCED_MOTION ? -Math.abs(Math.sin((presentationTime - waveCheerStart)/150 + this.id*1.7))*WAVE_CHEER_HOP_PX : 0;
    drawStickman(ctx, this.x, this.y + cheerHop, drawAngle, this.level, this.type, extra);
    if(this.shovelDig) drawShovelDigSwing(ctx, this);
    if(hackerStealth){
      ctx.restore();
      ctx.save(); ctx.fillStyle = 'rgba(160,170,178,0.35)';
      for(let puff = 0; puff < 4; puff++){
        const puffAngle = puff*1.7 + this.id, puffR = 9 + (puff%2)*5;
        ctx.beginPath(); ctx.arc(this.x + Math.cos(puffAngle)*puffR, this.y - 6 + Math.sin(puffAngle)*puffR*0.6, 7 + (puff%3), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    if(isDisabled){
      ctx.restore();
      ctx.font = '14px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💫', this.x, this.y - 30);
      if(this.disabledWavesLeft > 0){
        ctx.font = 'bold 10px Verdana';
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText(this.disabledWavesLeft + ' rounds left', this.x, this.y - 44);
      }
    }

    if(this.isHero){
      ctx.font = '13px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700'; // same missing-fillStyle class of bug as the enemy/barricade fixes — icon glyphs must never inherit a stale translucent color from whatever drew last
      const buildY = this.buildScaleY || (JOB_BUILD[this.type] || {scaleY:1}).scaleY;
      ctx.fillText('👑', this.x, this.y - 41*STICKMAN_SCALE*buildY);
    }
    if(this.isLegendary){
      ctx.font = '15px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
      const buildY = this.buildScaleY || (JOB_BUILD[this.type] || {scaleY:1}).scaleY;
      const trophyY = this.isHero ? this.y - 55*STICKMAN_SCALE*buildY : this.y - 41*STICKMAN_SCALE*buildY;
      ctx.fillText('🏆', this.x, trophyY);
      if(this.legendaryName){
        ctx.font = 'bold 10px Verdana';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText(this.legendaryName + ' ' + this.def.icon, this.x, this.y + 34*STICKMAN_SCALE);
      }
    }
    // CA454 — see HISTORY.md § [1.5.7] Code Archaeology, CA454
    if(this.hp < this.maxHp){
      const barW = 26, barY = this.y - 34;
      ctx.fillStyle = '#3a1a1a';
      ctx.fillRect(this.x-barW/2, barY, barW, 4);
      ctx.fillStyle = (this.hp/this.maxHp) > 0.4 ? '#4caf50' : '#e63946';
      ctx.fillRect(this.x-barW/2, barY, barW*Math.max(0,this.hp/this.maxHp), 4);
      if(this.burnUntil > gameTime){ ctx.font='10px serif'; ctx.textAlign='left'; ctx.fillText('🔥', this.x+barW/2+2, barY+3); }
      if(this.iceSlowUntil > gameTime){ ctx.font='10px serif'; ctx.textAlign='left'; ctx.fillText('🧊', this.x+barW/2+(this.burnUntil>gameTime?14:2), barY+3); }
    }
  }
}
const towerPool = Array.from({length: 80}, () => new Tower());
/* =========================================================
   PROJECTILES
   ========================================================= */
const CLOSE_SHOT_RUNUP_PX = 9;
const ARROW_ARC_MAX_PX = 20, ARROW_ARC_PER_PX = 0.07, ARROW_DRAW_SCALE = 1.5;
const PROJECTILE_AMMO_BY_TOWER = { // AMMO-KIND-01 (1.6.129) — see HISTORY.md § [1.6.129]. Only the Archer shoots arrows; unlisted towers keep the arrow shape
  NINJA:'STAR', BLOWDART: 'DART', BLOW_GUNNER: 'DART', SQUIRTGUN: 'PELLET',
  GATLING: 'BULLET', GUNALINDER: 'BULLET', MARKSMAN: 'BULLET', SNIPER: 'BULLET',
  CRAZY_CHEF: 'KNIFE', GLAIVE: 'BLADE'
};
const BLEED_PER_ARROW_MAX_HP_SHARE = 0.004, BLEED_ARROW_REFRESH_MS = 1000, MAX_STUCK_ARROWS = 4, ARROW_SLOW_PER_ARROW = 0.08, ARROW_SLOW_FLOOR = 0.6; // BLEED-WHILE-STUCK-01 (1.6.131) — see HISTORY.md § [1.6.131]
// STICK-CHANCE-01 (1.7.36): arrows sticking in enemies had fallen to 2% with a 2%-per-point slope, so it almost never happened below
// 50 STR and was always on above it. Restored to a visible baseline that rises gradually with every STR point: about 12% at 0 STR,
// about 52% at 250 and about 92% at 500 (the stat effect cap).
const PROJECTILE_STICK_BASE_CHANCE = 0.12, PROJECTILE_STICK_PER_STRENGTH = 0.0016;
function projectileStickChance(strength){ return clampNum(PROJECTILE_STICK_BASE_CHANCE + Math.min(STAT_EFFECT_CAP, Math.max(0, strength || 0))*PROJECTILE_STICK_PER_STRENGTH, 0, 0.95); }
const SPEARMAN_SWEEP_ARC_FRACTION = 1.3, POST_KILL_READY_MS = 4000;
const ACID_MAX_STACKS = 3, ACID_STACK_GAP_MS = 450, ACID_TICK_MS = 600, ACID_SLOW_REFRESH_MS = 700;
function coatEnemiesInAcid(x, y, projectile){
  for(const enemy of enemyPool){
    if(!enemy.active || Math.hypot(enemy.x-x, enemy.y-y) > projectile.acidRadius + enemy.radius) continue;
    enemy.applyAcidCoat(projectile.acidDamage, projectile.acidDuration, projectile.acidSlow, projectile.sourceTower);
  }
  spawnParticles(x, y, '#8bd62f', 5);
}
function projectileStickKind(sourceTower){
  if(!sourceTower) return null;
  if(sourceTower.type === 'ARCHER') return 'ARROW';
  if(sourceTower.type === 'AXEMAN') return sourceTower.axeMode === 'RANGE' ? 'AXE' : null;
  return Object.prototype.hasOwnProperty.call(PROJECTILE_AMMO_BY_TOWER, sourceTower.type) ? PROJECTILE_AMMO_BY_TOWER[sourceTower.type] : null;
}
function bleedSourceAllowed(sourceTower){ return !!projectileStickKind(sourceTower); }
// GENERATION-CHECK-01 (1.7.51): enemies, towers and projectiles live in recycled pools, so a held reference can end up pointing at a different, newer occupant of the same slot. An outside
// review reproduced a projectile reserving damage on, and homing onto, an enemy that was not the one it was fired at, and a cat attacking with a recycled tower's identity. Every enemy and
// tower already gets a fresh id when it is created, so each holder now remembers the id it was given and treats a different id as "the target is gone".
function projectileTargetLost(p){ return !!(p.trackedTarget && (!p.trackedTarget.active || p.trackedTarget.id !== p.trackedId)); }
class Projectile{
  constructor(){ this.active = false; }
  update(dt, enemyHash){
    if(this.trackedTarget && this.trackedTarget.active && this.trackedTarget.id !== this.trackedId) this.trackedTarget = { active: false, id: -1, x: this.x, y: this.y, radius: 0 }; // the slot was recycled: behave as if the target died
    const prevX = this.x, prevY = this.y;
    this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
    if(this.isAxe) this.spinAngle = (this.spinAngle||0) + dt*0.018;
    if(this.x < -20 || this.x > WORLD_MAX_W+20 || this.y < -20 || this.y > WORLD_MAX_H+20 || (this.maxFlightMs && gameTime - this.spawnTime >= this.maxFlightMs)){
      // CA458 — see HISTORY.md § [1.5.7] Code Archaeology, CA458
      if(this.trackedTarget && this.trackedTarget.active && !this.isGuaranteedMiss && !this.splashRadius){
        this.x = this.trackedTarget.x; this.y = this.trackedTarget.y; // so onImpact's few this.x/this.y-based cosmetic effects (not just the correctly hitEnemy-anchored ones) land on the enemy, not off-world at the boundary
        this.onImpact(this.trackedTarget);
      }
      this.active = false; return;
    }
    // CA459 — see HISTORY.md § [1.5.7] Code Archaeology, CA459
    if(this.isGuaranteedMiss){
      if(!this.missRevealed && gameTime >= this.missRevealAt){
        this.missRevealed = true;
        playSound('miss', this.x, undefined, this.y);
        if(this.trackedTarget) spawnFloatingText(this.trackedTarget.x, this.trackedTarget.y - this.trackedTarget.radius - 6, 'MISS', '#aaaaaa');
        spawnParticles(this.x, this.y, '#999999', 2);
      }
      return;
    }
    // CA460 — see HISTORY.md § [1.5.7] Code Archaeology, CA460
    if(this.trackedTarget && !this.trackedTarget.active){
      this.active = false;
      spawnParticles(this.x, this.y, this.color || '#ffffff', 2);
      return;
    }
    // CA461 — see HISTORY.md § [1.5.7] Code Archaeology, CA461. CA-FIX-01 (1.5.8) — this guard used to also
    // exclude `this.exactIntercept` shots; that was a regression, see HISTORY.md § [1.5.8].
    if(this.trackedTarget && !this.splashRadius){
      const desiredAngle = Math.atan2(this.trackedTarget.y - this.y, this.trackedTarget.x - this.x);
      const curAngle = Math.atan2(this.vy, this.vx);
      let diff = desiredAngle - curAngle;
      while(diff > Math.PI) diff -= Math.PI*2;
      while(diff < -Math.PI) diff += Math.PI*2;
      // CA462 — see HISTORY.md § [1.5.7] Code Archaeology, CA462
      if(Math.abs(diff) <= PROJECTILE_HOMING_MAX_ANGLE){
        const maxTurn = PROJECTILE_HOMING_MAX_TURN_RATE * dt/1000;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const newAngle = curAngle + turn;
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(newAngle)*speed;
        this.vy = Math.sin(newAngle)*speed;
        this.angle = newAngle;
      }
    }
    // CA463 — see HISTORY.md § [1.5.7] Code Archaeology, CA463
    const segLen = Math.hypot(this.x-prevX, this.y-prevY);
    const nearby = queryNearby(enemyHash, this.x, this.y, (this.splashRadius || 24) + segLen);
    for(const e of nearby){
      const d2 = pointSegmentDist2(e.x, e.y, prevX, prevY, this.x, this.y);
      if(d2 <= e.radius*e.radius){
        if(!segmentHitsEnemyMask(e, prevX, prevY, this.x, this.y)) continue; // passed the broad-phase circle but the segment never actually crossed the visible glyph — not a real hit
        this.onImpact(e);
        this.active = false;
        return;
      }
    }
  }
  onImpact(hitEnemy){
    if(this.effectType === 'CAT'){
      // CA464 — see HISTORY.md § [1.5.7] Code Archaeology, CA464
      const maxCats = (this.sourceTower && this.sourceTower.maxActiveCats) || 2;
      const perTowerCount = this.sourceTower
        ? catPool.reduce((n,c) => n + (c.active && c.sourceTower === this.sourceTower ? 1 : 0), 0)
        : maxCats;
      if(perTowerCount < maxCats){
        const cat = acquireActive(catPool);
        if(cat) cat.spawn(this.sourceTower, hitEnemy, this.x, this.y);
        // else: global cat pool exhausted — the throw simply has no further effect, no crash, no unlimited spawning
      }
      spawnParticles(this.x, this.y, '#333333', 4);
      return;
    }
    if(this.splashRadius > 0){
      // CA465 — see HISTORY.md § [1.5.7] Code Archaeology, CA465
      const missChance = this.sourceTower ? ((this.sourceTower.missChance || 0) + windMissPenalty(this.sourceTower)) : 0;
      if(Math.random() < attackMissChance(missChance, hitEnemy)){
        spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 6, 'MISS', '#aaaaaa');
        spawnParticles(this.x, this.y, '#999999', 2);
        return;
      }
      let streakClaimed = false;
      if(this.sourceTower && this.sourceTower.telemetry) this.sourceTower.telemetry.hitsLanded++; // one shot, one hit — regardless of how many enemies the splash actually catches
      for(const e of enemyPool){
        if(!e.active) continue;
        const d = Math.hypot(e.x-this.x, e.y-this.y);
        if(d <= this.splashRadius){
          e.applyDamage(this.damage, this.sourceTower, !streakClaimed, false, true, false, false, Math.atan2(e.y-this.y,e.x-this.x), this.sourceTower ? this.sourceTower.type : 'ENVIRONMENT');
          applyAttunementStatus(this.sourceTower, e);
          if(e.hp <= 0 || !e.active) streakClaimed = true; // this hit killed it — only the first such kill counts for streak
        }
      }
      spawnParticles(this.x, this.y, '#ffb347', 14);
      playSound('death');
      // CA466 — see HISTORY.md § [1.5.7] Code Archaeology, CA466
      if(this.isMoneyBag) spawnCoinBurst(this.x, this.y, 1 + Math.floor(Math.random()*7));
    } else {
      const impactAngle = Math.atan2(this.vy, this.vx);
      hitEnemy.applyDamage(this.damage, this.sourceTower, undefined, false, true, true, false, impactAngle, this.isAxe ? 'AXE_THROWN' : (this.sourceTower ? this.sourceTower.type : 'ENVIRONMENT'));
      applyAttunementStatus(this.sourceTower, hitEnemy);
      if(this.slowFactor) hitEnemy.applySlow(this.slowFactor, this.slowDuration);
      if(this.poisonDamage > 0 && hitEnemy.active) hitEnemy.applyPoison(this.poisonDamage, this.poisonDuration, this.sourceTower);
      if(this.acidDamage > 0) coatEnemiesInAcid(hitEnemy.x, hitEnemy.y, this);
      const stickKind = projectileStickKind(this.sourceTower);
      if(stickKind && hitEnemy.active && hitEnemy.embeddedArrows.length < MAX_STUCK_ARROWS && Math.random() < projectileStickChance(this.sourceTower.str)){
          // CA467 — see HISTORY.md § [1.5.7] Code Archaeology, CA467
          const stickDist = hitEnemy.radius*0.85;
          const perp = impactAngle + Math.PI/2;
          const lateralJitter = (Math.random()-0.5)*stickDist*0.5; // some natural scatter across the entry side, not perfectly on one exact line every time
          const dx = -Math.cos(impactAngle)*stickDist + Math.cos(perp)*lateralJitter;
          const dy = -Math.sin(impactAngle)*stickDist + Math.sin(perp)*lateralJitter;
          hitEnemy.embeddedArrows.push({ dx, dy, angle: impactAngle + (Math.random()-0.5)*0.3, kind: stickKind });
          hitEnemy.applyBleed(Math.max(1, Math.round(hitEnemy.maxHp * BLEED_PER_ARROW_MAX_HP_SHARE)), BLEED_ARROW_REFRESH_MS, this.sourceTower);
        if(goreMode) startDripSite(hitEnemy.x, hitEnemy.y, hexToRgba((hitEnemy.bloodProfile || getBloodProfile(hitEnemy.type)).dark, 0.75), this.damage / hitEnemy.maxHp); // ongoing gush from the puncture, sized to how much this specific shot actually hurt
      }
      if(this.sourceTower && this.sourceTower.type === 'SNAPCASTER' && hitEnemy.active){
        hitEnemy.shockedUntil = gameTime + SHOCK_BURST_WINDOW_MS;
        spawnChainLightning(this.sourceTower, hitEnemy, 2); // SNAPCASTER-CHAIN-01 (1.6.110) — see HISTORY.md § [1.6.110]
      }
      if(this.sourceTower && this.sourceTower.type === 'SNAPCASTER' && hitEnemy.active){ // MAGE-NEUTRAL-01 (1.6.116) — see HISTORY.md § [1.6.116]
        const isSnap = true;
        // CA468 — see HISTORY.md § [1.5.7] Code Archaeology, CA468
        const procChance = isSnap ? 0.35 : 0.15;
        const burnCut = isSnap ? 0.15 : 0.34;
        const freezeCut = isSnap ? 0.30 : 0.67;
        if(Math.random() < procChance){
        const roll = Math.random();
        if(roll < burnCut){
          hitEnemy.applyBurn(3000, this.sourceTower);
          spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '🔥 Burning!', '#ff8844');
          if(goreMode) spawnSkinPeel(hitEnemy.x, hitEnemy.y, 'rgba(180,60,20,0.7)');
        } else if(roll < freezeCut){
          hitEnemy.applySlow(0.85, 1500);
          spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '🧊 Frozen!', '#7dd3fc');
          if(goreMode) spawnSkinPeel(hitEnemy.x, hitEnemy.y, 'rgba(120,80,90,0.65)');
        } else {
          hitEnemy.applyStun(700);
          spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '⚡ Shocked!', '#ffe14d');
          let chainTarget = null;
          for(const candidate of enemyPool){
            if(!candidate.active || candidate === hitEnemy) continue;
            const chainDx = candidate.x - hitEnemy.x, chainDy = candidate.y - hitEnemy.y;
            if(chainDx*chainDx + chainDy*chainDy <= 4900){ chainTarget = candidate; break; }
          }
          if(chainTarget){
            chainTarget.applyStun(400);
            chainTarget.applyDamage(Math.round(this.damage*0.4), this.sourceTower, false, false, true, false);
            spawnFloatingText(chainTarget.x, chainTarget.y - chainTarget.radius - 14, '⚡ Chained!', '#ffe14d');
            if(graphicsQuality !== 'low'){
              // CA469 — see HISTORY.md § [1.5.7] Code Archaeology, CA469
              const steps = 5;
              for(let i=1; i<steps; i++){
                const t = i/steps;
                spawnParticles(hitEnemy.x + (chainTarget.x-hitEnemy.x)*t, hitEnemy.y + (chainTarget.y-hitEnemy.y)*t, '#ffe14d', 1);
              }
            }
          }
        }
        spawnParticles(hitEnemy.x, hitEnemy.y, '#c9a8ff', 6);
        }
      }
      spawnParticles(this.x, this.y, this.color || '#ffffff', 3);
    }
  }
  // Short comet tail behind an elementally-charged shot, drawn opposite its travel direction.
  drawElementTrail(ctx){
    if(graphicsQuality === 'low') return;
    const visuals = ELEMENT_VISUALS[this.elementKey] || { glow:'rgba(255,255,255,0.4)' };
    const speed = Math.hypot(this.vx || 0, this.vy || 0) || 1;
    const tailX = this.x - (this.vx || 0) / speed * 16, tailY = this.y - (this.vy || 0) / speed * 16;
    const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    gradient.addColorStop(0, visuals.glow);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.strokeStyle = gradient; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tailX, tailY); ctx.stroke();
    ctx.restore();
  }
  draw(ctx){
    if(this.elementColor) this.drawElementTrail(ctx);
    if(this.splashRadius > 0){
      // CA470 — see HISTORY.md § [1.5.7] Code Archaeology, CA470
      if(this.isMoneyBag){
        const flightProgress = this.axeFlightMs ? Math.min(1, (gameTime - this.axeSpawnTime) / this.axeFlightMs) : 0;
        const arcLift = Math.sin(flightProgress * Math.PI) * 30;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '20px sans-serif';
        ctx.fillText('💰', this.x, this.y - arcLift);
        ctx.restore();
        return;
      }
      ctx.fillStyle = this.elementColor || this.color || '#3a2a1a';
      ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      return;
    }
    if(this.isAxe){
      const flightProgress = this.axeFlightMs ? Math.min(1, (gameTime - this.axeSpawnTime) / this.axeFlightMs) : 0;
      const arcLift = Math.sin(flightProgress * Math.PI) * 14; // peaks mid-flight, back to 0 at launch/impact
      ctx.save();
      ctx.translate(this.x, this.y - arcLift);
      ctx.rotate(this.spinAngle || 0);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.stroke(); // handle
      ctx.fillStyle = this.color || '#9aa0a6';
      ctx.beginPath();
      ctx.moveTo(6,-6); ctx.lineTo(11,0); ctx.lineTo(6,6); ctx.lineTo(3,0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    if(this.isMagicMissile){
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      if(graphicsQuality === 'low'){
        // CA471 — see HISTORY.md § [1.5.7] Code Archaeology, CA471
        ctx.strokeStyle = this.color || '#7dd3fc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = this.color || '#7dd3fc';
        ctx.globalAlpha = 0.55;
      } else {
      // fading trail behind the missile — reads as a fast-moving bolt of energy, not an arrow
      const trailGrad = ctx.createLinearGradient(-14, 0, 0, 0);
      trailGrad.addColorStop(0, 'rgba(125,211,252,0)');
      trailGrad.addColorStop(1, this.color || '#7dd3fc');
      ctx.strokeStyle = trailGrad; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
      // CA472 — see HISTORY.md § [1.5.7] Code Archaeology, CA472
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = this.color || '#7dd3fc';
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); // soft outer bloom, additive
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = this.color || '#7dd3fc';
      ctx.globalAlpha = 0.55;
      }
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      return;
    }
    if(this.ammo === 'ARROW'){ this.drawArrow(ctx); return; }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawAmmoShape(ctx, this.ammo, this.color || '#f1c40f');
    ctx.restore();
  }
  drawArrow(ctx){
    const flightProgress = this.arcFlightMs > 0 ? Math.min(1, Math.max(0, (gameTime - this.arcSpawnTime) / this.arcFlightMs)) : 0, arcPx = this.arcPx || 0;
    const lift = Math.sin(flightProgress * Math.PI) * arcPx;
    const liftPerSecond = this.arcFlightMs > 0 ? arcPx * Math.PI * Math.cos(flightProgress * Math.PI) / (this.arcFlightMs / 1000) : 0;
    const heading = Math.atan2((this.vy || 0) - liftPerSecond, this.vx || 1), headColor = this.elementColor || '#cfd6d9';
    ctx.save(); ctx.translate(this.x, this.y - lift); ctx.rotate(heading); ctx.scale(ARROW_DRAW_SCALE, ARROW_DRAW_SCALE); ctx.lineCap = 'round';
    if(graphicsQuality !== 'low'){ const trailEnd = -Math.min(20, 8 + (this.flightDistancePx || 0)*flightProgress/ARROW_DRAW_SCALE); ctx.strokeStyle = this.elementColor || 'rgba(255,246,214,0.6)'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(trailEnd, 0); ctx.lineTo(-8, 0); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(2, 0); ctx.stroke();
    ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -2.5); ctx.lineTo(-1, 2.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, -2); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, 2); ctx.stroke();
    ctx.restore();
  }
}
// AMMO-KIND-01 (1.6.129) — see HISTORY.md § [1.6.129]. Drawn at the origin, pointing along +x
function drawAmmoShape(ctx, ammo, color){
  if(ammo==='STAR'){
    ctx.fillStyle='#bfc8d6';ctx.strokeStyle='#596477';ctx.lineWidth=0.7;ctx.beginPath();
    for(let i=0;i<8;i++){ const a=i*Math.PI/4,r=i%2?2:6; const x=Math.cos(a)*r,y=Math.sin(a)*r; if(i) ctx.lineTo(x,y);else ctx.moveTo(x,y); }
    ctx.closePath();ctx.fill();ctx.stroke();
  } else if(ammo === 'BULLET'){
    ctx.strokeStyle = '#4a4d54'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-1,0); ctx.stroke();
    ctx.fillStyle = '#7d828c';
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c3c7cf';
    ctx.beginPath(); ctx.arc(-0.7, -0.7, 0.8, 0, Math.PI*2); ctx.fill();
  } else if(ammo === 'PELLET'){
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI*2); ctx.fill();
  } else if(ammo === 'DART'){
    ctx.strokeStyle = '#5a4a32'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(3,0); ctx.stroke();
    ctx.fillStyle = '#c9ced6';
    ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(2.5,-1.6); ctx.lineTo(2.5,1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-8,-2.2); ctx.lineTo(-4.5,0); ctx.lineTo(-8,2.2); ctx.closePath(); ctx.fill();
  } else if(ammo === 'KNIFE'){
    ctx.fillStyle = '#c9ced6';
    ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(0,-2.4); ctx.lineTo(-2,0); ctx.lineTo(0,2.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-8,0); ctx.stroke();
  } else if(ammo === 'BLADE'){
    ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-2, 0, 7, -Math.PI*0.55, Math.PI*0.55); ctx.stroke();
  } else {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8,0); ctx.lineTo(8,0);
    ctx.moveTo(8,0); ctx.lineTo(4,-3);
    ctx.moveTo(8,0); ctx.lineTo(4,3);
    ctx.stroke();
  }
}
const projectilePool = Array.from({length: 150}, () => new Projectile());
// CA474 — see HISTORY.md § [1.5.7] Code Archaeology, CA474
const committedProjectileTargets = new Set();
function tallyCommittedProjectileDamage(){
  for(const e of committedProjectileTargets) e.incomingDamage = 0;
  committedProjectileTargets.clear();
  for(const p of projectilePool){
    if(p.active && p.trackedTarget && !p.isGuaranteedMiss && p.trackedTarget.active){
      if(p.trackedTarget.id !== p.trackedId) continue; // GENERATION-CHECK-01: never reserve damage on a recycled enemy
    if(!committedProjectileTargets.has(p.trackedTarget)){ p.trackedTarget.incomingDamage = 0; committedProjectileTargets.add(p.trackedTarget); }
      p.trackedTarget.incomingDamage += p.damage || 0;
    }
  }
}
