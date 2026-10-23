"use strict";
// The towers, which are the stickmen: class definitions, elements, promotions, the stickman figure, weapons and poses, the Tower class and projectiles.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   TOWER DEFINITIONS (CONFIG.TOWERS)
//   STRATEGY TIPS, ARCHETYPES AND UNLOCKS
//   ELEMENTS
//   PROMOTIONS AND MASTERY
//   CLASS BALANCE AND ANIMATION
//   STICKMAN FIGURES, WEAPONS AND POSES (STICKMEN-ARE-TOWERS-01: every tower is a stickman)
//   TOWER CLASS
//   PROJECTILES
/* =========================================================
   TOWER DEFINITIONS (CONFIG.TOWERS)
   ========================================================= */
CONFIG.TOWERS = {
  NINJA: {
    name:'Ninja', icon:'🥷', baseCost:300, unlocksAfterWave:0,
    blurb:"Alternates throwing stars from each hand: the fastest sustained attacker, with light hits and no close-range blind spot. Unlocked by defeating the Stealth Santa, who arrives as the Wave 10 boss of a Stealth run (turn on Stealth mode in Settings).",
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
      { range: 90,  damage: 18, cooldown: 840 },
      { range: 100, damage: 28, cooldown: 770, upgradeCost: 80 },
      { range: 115, damage: 42, cooldown: 680, upgradeCost: 120 },
      { range: 125, damage: 58, cooldown: 630, upgradeCost: 175 },
      { range: 135, damage: 78, cooldown: 570, upgradeCost: 245 }
    ]
  },
  ARCHER: {
    name: 'Archer', icon: '🏹', baseCost: 60, unlocksAfterWave: 0,
    blurb: "A patient marksman who draws the bow fully before each shot. His arrows rarely miss, and the ones that bite deep leave the target bleeding. He is the root of the ranged branch: training a stat to 250 attunes him to an element, and 500 unlocks a specialization.",
    tiers: [
      { range: 140, damage: 20, cooldown: 1430, drawTime: 800, projectileSpeed: 480 },
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
    blurb: "Swings a gilded hammer whose holy blows hit undead 50% harder and break graves, along with the Hammerman's stun. Only one can stand on the board. Unlocked by training a Hammerman's Intelligence to 40.",
    tiers: [
      { range: 100, damage: 24, cooldown: 1000, stunMs: 550 },
      { range: 110, damage: 36, cooldown: 900,  stunMs: 700, upgradeCost: 115 },
      { range: 125, damage: 54, cooldown: 800,  stunMs: 850, upgradeCost: 175 }
    ]
  },
  BERSERKER: {
    name: 'Berserker', icon: '👹', baseCost: 600, unlocksAfterWave: 0,
    blurb: "Gives up the Axeman's throw for a much wider, harder cleave that catches more of a crowd in each swing. Unlocked by training an Axeman's Strength to 40.",
    tiers: [
      { range: 105, damage: 32, cooldown: 900 },
      { range: 115, damage: 50, cooldown: 800, upgradeCost: 120 },
      { range: 130, damage: 75, cooldown: 700, upgradeCost: 180 }
    ]
  },
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
      { range: 180, damage: 197,  cooldown: 7800, projectileSpeed: 1400, slowFactor: 0.35, slowDuration: 1500 },
      { range: 200, damage: 293, cooldown: 7000, projectileSpeed: 1500, slowFactor: 0.45, slowDuration: 1700, upgradeCost: 90 },
      { range: 220, damage: 384, cooldown: 6200, projectileSpeed: 1600, slowFactor: 0.55, slowDuration: 2000, upgradeCost: 130 }
    ]
  },
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
  MERCHANT: {
    name: 'Merchant', icon: '👳', baseCost: 140, unlocksAfterWave: 15,
    blurb: "Keeps the Shop open while he stands; if he is downed, the Shop stays closed until another Merchant is standing. A deliberately weak fighter whose Money Bag bursts into coins over a wide radius and reloads slowly. Unlocks at Wave 15.",
    tiers: [
      { range: 170, damage: 40, cooldown: 35000, projectileSpeed: 200, splashRadius: 110 },
      { range: 185, damage: 55, cooldown: 32000, projectileSpeed: 210, splashRadius: 125, upgradeCost: 160 },
      { range: 200, damage: 75, cooldown: 29000, projectileSpeed: 220, splashRadius: 140, upgradeCost: 220 }
    ]
  },
  GLAIVE: {
    name: 'Glaive', icon: '⚙️', baseCost: 130, unlocksAfterWave: 20,
    blurb: "A heavy gun built for fortifications: 5x damage against camp buildings (huts, castles, graves and the circus), ordinary against everything else, with a very long reload. Unlocks at Wave 20.",
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
    blurb: "Calls down holy light after a very long cooldown, dealing 5x damage to undead and ignoring their armor, enough to finish small undead in one strike (bosses can survive). Once per wave it also heals the weakest tower, and several Clerics each choose a different one. Unlocked by training a Mage's Intelligence to 500.",
    tiers: [
      { range: 150, damage: 11, cooldown: 12500, healAmount: 25, curseDuration: 3000 },
      { range: 170, damage: 16, cooldown: 11000, healAmount: 40, curseDuration: 3400, upgradeCost: 95 },
      { range: 190, damage: 22, cooldown: 9500,  healAmount: 60, curseDuration: 3800, upgradeCost: 150 }
    ]
  },
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
  BLOW_GUNNER: {
    name: 'Blow Gunner', icon: '♨️', baseCost: 700, unlocksAfterWave: 0,
    blurb: "Fires darts carrying scalding vapor: the Blowdart's poison and a brief chilling slow land together on every hit. Unlocked by training an Archer's Strength and Intelligence to 500 each.",
    tiers: [
      { range: 125, damage: 9,  cooldown: 300, projectileSpeed: 460, poisonDamage: 4, poisonDuration: 3200, slowFactor: 0.2,  slowDuration: 900 },
      { range: 140, damage: 13, cooldown: 250, projectileSpeed: 490, poisonDamage: 6, poisonDuration: 3400, slowFactor: 0.25, slowDuration: 1000, upgradeCost: 105 },
      { range: 155, damage: 19, cooldown: 205, projectileSpeed: 520, poisonDamage: 9, poisonDuration: 3800, slowFactor: 0.3,  slowDuration: 1100, upgradeCost: 150 }
    ]
  },
  PROTON: {
    name: 'Proton', icon: '☄️', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Strength and Dexterity to 250. Every hit can burn its target and chain lightning to nearby enemies.",
    tiers: [
      { range: 190, damage: 26, cooldown: 1500, projectileSpeed: 1000, poisonDamage: 10, poisonDuration: 3000, slowFactor: 0.3,  slowDuration: 1200 },
      { range: 210, damage: 40, cooldown: 1300, projectileSpeed: 1100, poisonDamage: 15, poisonDuration: 3200, slowFactor: 0.38, slowDuration: 1400, upgradeCost: 140 },
      { range: 230, damage: 58, cooldown: 1100, projectileSpeed: 1200, poisonDamage: 22, poisonDuration: 3600, slowFactor: 0.45, slowDuration: 1600, upgradeCost: 200 }
    ]
  },
  DARK_MATTER: {
    name: 'Dark Matter', icon: '🕳️', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Strength and Intelligence to 250. Every hit can burn its target and freeze it in place.",
    tiers: [
      { range: 195, damage: 22, cooldown: 1450, projectileSpeed: 950,  poisonDamage: 8,  poisonDuration: 3100, slowFactor: 0.4,  slowDuration: 1500 },
      { range: 215, damage: 34, cooldown: 1250, projectileSpeed: 1050, poisonDamage: 12, poisonDuration: 3300, slowFactor: 0.48, slowDuration: 1700, upgradeCost: 145 },
      { range: 235, damage: 50, cooldown: 1050, projectileSpeed: 1150, poisonDamage: 18, poisonDuration: 3700, slowFactor: 0.55, slowDuration: 1900, upgradeCost: 205 }
    ]
  },
  QUASAR: {
    name: 'Quasar', icon: '🌟', baseCost: 0, unlocksAfterWave: 0,
    blurb: "A mixed element rather than a tower, earned by any stickman who trains Dexterity and Intelligence to 250. Every hit can chain lightning and freeze its target, and splashes everything in a small radius around it.",
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
const TOWER_STRATEGY = {
  CRAZY_CHEF: { text: 'A ranged knife thrower whose damage scales with Strength. Invest in Strength to increase knife damage.' },
  HAMMERMAN: { text: 'Front-line tank: a shield, extra health and a stun on every hit. Place it where enemies hit first, and let squishier towers shoot over its shoulder.' },
  PALADIN:   { text: 'Holy front-liner: Hammerman\'s tankiness plus bonus damage against undead. The answer to an Undead Uprising wave — put it where the coffins are heaviest.' },
  AXEMAN:    { text: 'Switch-hitter: toggle between melee and thrown axes once per wave. Read the wave, then commit — it can\'t change its mind again until the next one.' },
  SPEARMAN:  { text: 'Reach fighter: longer melee range than any other Warrior, so it can hit before enemies close in. Place it one tile back from the chokepoint, not right on it.' },
  GATLING:   { text: 'Sustained rate of fire over raw per-hit power. Best against long, high-count waves (Swarm, The Grind) where uptime matters more than a single big hit.' },
  NINJA: { text:'Rapid alternating stars reward focused fire. Light damage per hit, with no close-range blind spot.' },
  BLOWDART:  { text: 'Poison DoT specialist: modest hit damage, but the poison keeps ticking after the shot lands. Strong against tanky single targets that will stay in range a while.' },
  SQUIRTGUN: { text: 'Dual-gun acid, Blowdart\'s bigger sibling: each splash adds a coat, up to three per enemy, and every coat slows and burns a little more. Keep it firing into the same crowd.' },
  BOMBER:    { text: 'The dedicated splash-damage tower: one shot hits every enemy in its blast radius. Built for dense clumps (Swarm, Elite Vanguard), wasted on a single isolated target.' },
  MERCHANT:  { text: 'Keeps the Shop open while alive — downed, and it locks until another one is standing. Deliberately the worst combat tower in the game; his real value is Shop access and passive gold from Money Bag coin bursts, not his damage.' },
  GLAIVE:    { text: 'Anti-structure specialist — 5x damage against camp buildings (huts, castles, graves, the circus), unremarkable against ordinary enemies. Huge reload; save him for the buildings, not the horde.' },
  GUNALINDER:{ text: 'Burst-fire revolver: several fast shots, then a longer reload. Real DPS is high but lumpy — check its DPS number, not just the per-shot damage, to judge it fairly.' },
  SNIPER:    { text: 'Longest range and heaviest single-hit damage of any tower, but slow. Place it where it can see the most of the path at once rather than close to a chokepoint.' },
  MARKSMAN:  { text: "The Archer's Intelligence specialization: one carefully aimed shot at a time, longer range and harder-hitting than base Archer but without Gatling's rate of fire or Blowdart's poison. Training it to 60 Intelligence unlocks the Sniper." },
  SNAPCASTER:{ text: 'Mage class unlocked through DEX instead of INT: faster casts than base Mage, with a chance to chain lightning to a nearby second target. Rewards a DEX-heavy build over the usual INT one.' },
  CLERIC:    { text: 'A support tower that heals allies and directly smites undead. Its immediate holy hit deals 5x damage and ignores armor, making it especially dangerous to small undead while bosses can endure it.' },
  POPE:      { text: "Unlocked for the Build menu when a Cleric reaches 500 INT, the per-stat cap. Hits every enemy in range at once instead of one target. Placement matters more than ever: it wants to see as much of the path as possible, not just one chokepoint." },
  NECROMANCER:{ text: "Unlocked by a Mage reaching 500 STR. Fires dark bolts and raises a fresh band of skeletons at the start of every round; they crumble when the round ends. Place it close enough for the skeletons to reach the path." },
  BLOW_GUNNER:{ text: "Unlocked when one Archer has both STR and INT at 500. Every hit applies Blowdart poison and a Mage-style chilling slow together, so it suits tough enemies that stay in range." },
  CAT_SNAPPER:{ text: "Unlocked by an Archer reaching 500 DEX, whatever its element. Its damage comes from shadow cats that chase and scratch, so place it where the cats can reach the path quickly." },
  PROTON:{ text: "Fire and Electric combined. Any stickman earns it by training both STR and DEX to 250: every hit burns its target and chains lightning to nearby enemies." },
  DARK_MATTER:{ text: "Fire and Ice combined. Any stickman earns it by training both STR and INT to 250: every hit burns its target and can freeze it in place." },
  QUASAR:{ text: "Electric and Ice combined. Any stickman earns it by training both DEX and INT to 250: every hit chains lightning to nearby enemies, can freeze its target and splashes everything in a small radius around it." },
  BERSERKER:{ text: "An Axeman trained to 40 Strength — trades the throw-toggle for a much wider, harder cleave. Bring it in close where its swing can actually catch a crowd; it's a brute-force AoE tool, not a precision one." },
  LANCER:{ text: "A Spearman trained to 40 Dexterity carries a knight lance and strikes harder against larger, heavier enemies. Damage scales with target size: half damage at tiny scale, normal damage at standard scale, and up to 1.75x against the heaviest foes." },
};
// CLASS-EMOJI-01: no two classes share an emoji; each strategy tip takes the class's own icon
for(const strategyType of Object.keys(TOWER_STRATEGY)) if(CONFIG.TOWERS[strategyType]) TOWER_STRATEGY[strategyType].icon = CONFIG.TOWERS[strategyType].icon;
const CLASS_ARCHETYPE = {
  SWORDSMAN:'WARRIOR', AXEMAN:'WARRIOR', SPEARMAN:'WARRIOR', HAMMERMAN:'WARRIOR', PALADIN:'WARRIOR',
  NINJA:'ARCHER', ARCHER:'ARCHER', BLOWDART:'ARCHER', GATLING:'ARCHER', BOMBER:'ARCHER', SQUIRTGUN:'ARCHER', MERCHANT:'ARCHER', GLAIVE:'ARCHER',
  GUNALINDER:'ARCHER', SNIPER:'ARCHER', SNAPCASTER:'ARCHER', MARKSMAN:'ARCHER', BLOW_GUNNER:'ARCHER',
  MAGE:'MAGE', CLERIC:'MAGE', POPE:'MAGE', NECROMANCER:'MAGE', HACKER:'MAGE',
  CAT_SNAPPER:'MAGE',
  PROTON:'MAGE', DARK_MATTER:'MAGE', QUASAR:'MAGE', CRAZY_CHEF:'ARCHER',
  BERSERKER:'WARRIOR', LANCER:'WARRIOR'
};
const TOWER_UNLOCK_SOURCE_BY_TARGET = {};
for(const baseType of Object.keys(SPECIALIZATIONS)){
  for(const element of Object.keys(SPECIALIZATIONS[baseType])){
    TOWER_UNLOCK_SOURCE_BY_TARGET[SPECIALIZATIONS[baseType][element]] = { kind: 'element', baseType, element };
  }
}
for(const sourceType of Object.keys(CLASS_STAT_UNLOCKS)){
  for(const stat of Object.keys(CLASS_STAT_UNLOCKS[sourceType])){
    const branch = CLASS_STAT_UNLOCKS[sourceType][stat];
    TOWER_UNLOCK_SOURCE_BY_TARGET[branch.target] = { kind: 'stat', baseType: sourceType, stat, threshold: branch.threshold };
  }
}
for(const baseType of Object.keys(HYBRID_SPECIALIZATIONS)){
  for(const pairKey of Object.keys(HYBRID_SPECIALIZATIONS[baseType])){
    TOWER_UNLOCK_SOURCE_BY_TARGET[HYBRID_SPECIALIZATIONS[baseType][pairKey]] = { kind: 'hybrid', baseType, pairKey };
  }
}
TOWER_UNLOCK_SOURCE_BY_TARGET.CAT_SNAPPER = { kind: 'stat', baseType: 'ARCHER', stat: 'dex', threshold: SPECIALIZATION_THRESHOLD };
TOWER_UNLOCK_SOURCE_BY_TARGET.CRAZY_CHEF = { kind: 'stat', baseType: 'ARCHER', stat: 'str', threshold: CRAZY_CHEF_STR_THRESHOLD };
TOWER_UNLOCK_SOURCE_BY_TARGET.MERCHANT = { kind: 'wave', baseType: null };
TOWER_UNLOCK_SOURCE_BY_TARGET.NINJA = { kind: 'challenge', baseType: null };
TOWER_UNLOCK_SOURCE_BY_TARGET.GLAIVE = { kind: 'wave', baseType: null };
const UNLOCKABLE_TOWER_TYPES = Object.keys(TOWER_UNLOCK_SOURCE_BY_TARGET);
/* =========================================================
   ELEMENTS
   ========================================================= */
// ELEMENT-TINT-01: Once a tower has locked an elemental
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
// ELEMENT-INFUSION-01: Elements are earned by a stickman, never built as towers.
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
const PROMOTION_COST_GROWTH = 1.35; // PROMOTION-VALUE-01: stays well under SCALING_COST_GROWTH so promoting beats buying another copy
function promotionRankLabel(rank){ return 'Rank ' + rank; }
function promotionCostFor(firstPromotionCost, currentLevel){ return Math.round(firstPromotionCost * Math.pow(PROMOTION_COST_GROWTH, currentLevel - 1)); }
// PROMOTION-SCALE-01: A promotion is worth 5 training bars of dice applied automatically (passive) and another 5 handed over as spendable points (active).
const PROMOTION_BAR_MULTIPLIER = 5;
const PROMOTION_PASSIVE_ROLLS = PROMOTION_BAR_MULTIPLIER * TRAINING_BAR_ROLLS, PROMOTION_SPENDABLE_ROLLS = 2 * PROMOTION_BAR_MULTIPLIER * TRAINING_BAR_ROLLS;
const PROMOTION_TALENT_DICE_MIN = 2, PROMOTION_TALENT_DICE_MAX = 6; // PROMOTION-VALUE-01: a random stat gets a bonus talent roll each promotion
const PROMOTION_TALENT_LABELS = { str:'💪 Strength', dex:'🏃 Dexterity', int:'🧠 Intelligence' };
// LEVELUP-QUIET-01
const LEVELUP_FANFARE_MIN_HP_FRACTION = 0.25;
const XP_TEXT_LIFE_MS = 1100;
/* =========================================================
   CLASS BALANCE AND ANIMATION
   ========================================================= */
const ARCHER_IDLE_ANGLE = 0;
// MAGE-RECOIL-01: casting kicks the staff back (equal and opposite to the bolt), flips the tip up, pushes the body back, and flashes the orb with a ring and sparks.
const MAGE_CAST_RECOIL_MS = 450;
function mageRecoilKick(castProgress){ return castProgress * castProgress * (1 + 0.35 * Math.sin((1 - castProgress) * Math.PI * 3)); }
const SWORDSMAN_ATTACK_COOLDOWN_MULTIPLIER = 1.2;
function applyClassCooldownBalance(type, cooldown){
  return Math.round(cooldown * (type === 'SWORDSMAN' ? SWORDSMAN_ATTACK_COOLDOWN_MULTIPLIER : type === 'MAGE' ? 1.4 : 1.15));
}
function towerVisualCenterY(t){
  const buildScaleY = t.buildScaleY || (JOB_BUILD[t.type] && JOB_BUILD[t.type].scaleY) || 1;
  return t.y + (-5.5) * STICKMAN_SCALE * buildScaleY;
}
function towerSwingDir(tower){
  if(tower.swingHandedness === undefined) tower.swingHandedness = Math.random() < 0.5 ? 1 : -1;
  return tower.swingHandedness;
}
// ARCHER-NOCK-01: one formula gives the arrowhead position of the nocked arrow in the archer's local drawing space, used by the renderer and by fireProjectile so the shot leaves exactly where the drawn arrow was.
const ARCHER_BASE_ARM_LEN = 13, ARCHER_BOW_ARM_EXTRA = 5, ARCHER_FRONT_SHOULDER_OFFSET = 1.8, ARCHER_ARROWHEAD_REACH = 4, ARCHER_DRAW_PUSH = 2;
function archerNockedArrowTip(angle, drawAmount, headReach = ARCHER_ARROWHEAD_REACH){
  const bowArmLength = ARCHER_BASE_ARM_LEN + ARCHER_BOW_ARM_EXTRA + drawAmount*ARCHER_DRAW_PUSH, bend = -0.08 - drawAmount*0.10;
  const frontShoulderX = -Math.sin(angle)*ARCHER_FRONT_SHOULDER_OFFSET, frontShoulderY = -13 + Math.cos(angle)*ARCHER_FRONT_SHOULDER_OFFSET;
  const upperLength = bowArmLength*0.52, foreLength = bowArmLength*0.48 + headReach;
  return { x: frontShoulderX + Math.cos(angle + bend)*upperLength + Math.cos(angle)*foreLength, y: frontShoulderY + Math.sin(angle + bend)*upperLength + Math.sin(angle)*foreLength };
}
const ARCHER_ARROW_PIVOT_Y = -15, ARCHER_RENOCK_SHARE = 0.35;
/* =========================================================
   STICKMAN FIGURES, WEAPONS AND POSES (STICKMEN-ARE-TOWERS-01: every tower is a stickman)
   ========================================================= */
function weaponLenFromScale(minLen, maxLen, weaponScale){
  const t = clampNum((weaponScale - 1) / 0.6, 0, 1);
  return minLen + t * (maxLen - minLen);
}
// MELEE-SWING-01
const MELEE_SMEAR_SPAN_T = 0.16, MELEE_SMEAR_SHOULDER_Y = -13;
function easeInOutQuad(u){ return u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2) / 2; }
function meleeLungePx(swingT){
  if(swingT < 0.2) return -1.8 * easeInOutQuad(swingT / 0.2);
  if(swingT < 0.6){ const u = (swingT - 0.2) / 0.4; return -1.8 + 7.3 * (1 - Math.pow(1 - u, 3)); }
  return 5.5 * (1 - easeInOutQuad((swingT - 0.6) / 0.4));
}
function spearThrustPx(swingT){
  if(swingT < 0.25) return -4 * easeInOutQuad(swingT / 0.25);
  if(swingT < 0.55){ const u = (swingT - 0.25) / 0.3; return -4 + 13 * (1 - Math.pow(1 - u, 3)); }
  return 9 * (1 - easeInOutQuad((swingT - 0.55) / 0.45));
}
function drawMeleeSmear(ctx, extra){
  if(weaponMarkCount === 0) return;
  const mark = weaponMarkSlots[0], radius = Math.hypot(mark.handX, mark.handY - MELEE_SMEAR_SHOULDER_Y) + mark.length * 0.92;
  const from = extra.trailFrom, to = extra.trailTo, counterClockwise = to < from;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = extra.trailColor || '#ffffff';
  for(let band = 0; band < 3; band++){
    const reach = 1 - band * 0.33;
    ctx.globalAlpha = (0.14 + band * 0.12) * extra.trailStrength; ctx.lineWidth = 4.2 - band * 1.2;
    ctx.beginPath(); ctx.arc(0, MELEE_SMEAR_SHOULDER_Y, radius - band * 1.1, to - (to - from) * reach, to, counterClockwise); ctx.stroke();
  }
  ctx.restore();
}
// WEAPON-ENCHANT-SYNC-01
const weaponMarkSlots = [{ handX: 0, handY: 0, angle: 0, length: 0 }, { handX: 0, handY: 0, angle: 0, length: 0 }];
const WEAPON_ENCHANT_FALLBACK_LEN = 14;
let weaponMarkCount = 0, weaponHandLast = null;
function markWeapon(handX, handY, angle, length){
  if(weaponMarkCount >= weaponMarkSlots.length) return;
  const slot = weaponMarkSlots[weaponMarkCount++];
  slot.handX = handX; slot.handY = handY; slot.angle = angle; slot.length = length;
}
function drawWeaponEnchant(ctx, element, fallbackAngle){
  if(weaponMarkCount === 0 && weaponHandLast) markWeapon(weaponHandLast.handX, weaponHandLast.handY, fallbackAngle, WEAPON_ENCHANT_FALLBACK_LEN);
  const parts = ELEMENT_COMPONENTS[element] || [element];
  ctx.save(); ctx.lineCap = 'round';
  for(let m = 0; m < weaponMarkCount; m++){
    const mark = weaponMarkSlots[m], dirX = Math.cos(mark.angle), dirY = Math.sin(mark.angle), perpX = -dirY, perpY = dirX;
    for(let p = 0; p < parts.length; p++){
      const shift = parts.length > 1 ? (p === 0 ? -1.4 : 1.4) : 0, visuals = ELEMENT_VISUALS[parts[p]];
      const x1 = mark.handX + dirX*mark.length*0.2 + perpX*shift, y1 = mark.handY + dirY*mark.length*0.2 + perpY*shift;
      const x2 = mark.handX + dirX*mark.length + perpX*shift, y2 = mark.handY + dirY*mark.length + perpY*shift;
      if(graphicsQuality !== 'low'){ ctx.globalAlpha = 0.35; ctx.strokeStyle = visuals.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.globalAlpha = 0.9; ctx.strokeStyle = visuals.color; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
  const lead = weaponMarkSlots[0];
  if(weaponMarkCount > 0){
    ctx.globalAlpha = 1; ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let p = 0; p < parts.length; p++){
      const along = lead.length + 4 + p*8;
      ctx.fillText(ELEMENT_ATTACK_EMOJI[parts[p]], lead.handX + Math.cos(lead.angle)*along, lead.handY + Math.sin(lead.angle)*along - 2);
    }
  }
  ctx.restore();
}
// BODY-BLOOD-ATTACH-01: stains bind to real limb segments and interpolate with the current pose.
let bloodPoseOwner = null;
function recordBloodSegment(x1,y1,x2,y2){
  if(!bloodPoseOwner) return;
  const owner = bloodPoseOwner, index = owner.bloodSegmentCount++;
  let segment = owner.bloodSegments[index];
  if(!segment) segment = owner.bloodSegments[index] = {x1:0,y1:0,x2:0,y2:0};
  segment.x1=x1;segment.y1=y1;segment.x2=x2;segment.y2=y2;
}
function bindStickmanStain(entity,stain){
  const pose = entity.bloodPose;
  const sx = pose ? pose.sx : STICKMAN_SCALE*(entity.buildScaleX || 1)*Math.sqrt(entity.weight || 1);
  const sy = pose ? pose.sy : STICKMAN_SCALE*(entity.buildScaleY || 1)*Math.sqrt(entity.weight || 1);
  const x = (entity.x+stain.offsetX-(pose ? pose.x : entity.x))/sx, y = (entity.y+stain.offsetY-(pose ? pose.y : entity.y))/sy;
  const headRx = pose ? pose.headRx : 7, headRy = pose ? pose.headRy : 7;
  if((x/headRx)**2+((y+24)/headRy)**2 <= 1.5){
    stain.part=-1;stain.u=clampNum(x/headRx,-0.8,0.8);stain.v=clampNum((y+24)/headRy,-0.8,0.8);
  } else {
    let best=Infinity;stain.part=0;stain.u=0.5;stain.v=0;
    for(let i=0;i<(entity.bloodSegmentCount || 0);i++){
      const seg=entity.bloodSegments[i],dx=seg.x2-seg.x1,dy=seg.y2-seg.y1,len2=dx*dx+dy*dy;
      const t=clampNum(((x-seg.x1)*dx+(y-seg.y1)*dy)/Math.max(0.01,len2),0,1);
      const px=seg.x1+dx*t,py=seg.y1+dy*t,dist=(x-px)**2+(y-py)**2;
      if(dist<best){best=dist;stain.part=i;stain.u=t;stain.v=clampNum(((x-px)*-dy+(y-py)*dx)/Math.sqrt(Math.max(0.01,len2)),-0.65,0.65);}
    }
  }
  stain.bodySize=clampNum(stain.size/Math.max(sx,sy),0.35,1.1);
}
function bloodStainPaint(stain){
  const age=Math.max(0,presentationTime-stain.bornAt),step=Math.floor(age/500);
  if(stain.paintStep!==step){
    const color=agedBloodRgb(stain);
    stain.paint='rgb('+color.r+','+color.g+','+color.b+')';stain.paintStep=step;
  }
  return stain.paint;
}
function drawStickmanBloodStains(ctx,owner,headRx,headRy){
  if(!goreMode || !owner || !owner.bloodStains) return;
  const cap=(graphicsQuality==='low' || underHeavyVisualLoad) ? 6 : STICKMAN_STAIN_DRAW_MAX; // each stickman mark is clipped to a limb, so far fewer are drawn than on rocks and trees
  for(let i=Math.max(0,owner.bloodStains.length-cap);i<owner.bloodStains.length;i++){
    const stain=owner.bloodStains[i],age=bloodStainLifeT(stain);
    if(age>=1) continue;
    if(stain.part===undefined) bindStickmanStain(owner,stain);
    let x,y;
    ctx.save();ctx.beginPath();
    if(stain.part===-1){
      ctx.ellipse(0,-24,headRx,headRy,0,0,Math.PI*2);x=stain.u*headRx;y=-24+stain.v*headRy;
    } else {
      const seg=owner.bloodSegments[stain.part];
      if(!seg || stain.part >= owner.bloodSegmentCount){ctx.restore();continue;}
      const dx=seg.x2-seg.x1,dy=seg.y2-seg.y1,len=Math.max(0.01,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx);
      // Capsule clip is the same three-pixel round-capped limb stroke.
      ctx.arc(seg.x1,seg.y1,1.5,angle+Math.PI/2,angle+Math.PI*1.5);
      ctx.arc(seg.x2,seg.y2,1.5,angle-Math.PI/2,angle+Math.PI/2);ctx.closePath();
      x=seg.x1+dx*stain.u-dy/len*stain.v;y=seg.y1+dy*stain.u+dx/len*stain.v;
    }
    ctx.clip();ctx.globalAlpha *= (stain.rgb.a===undefined ? 1 : stain.rgb.a)*0.88*bloodFadeAlpha(age);
    ctx.fillStyle=bloodStainPaint(stain);ctx.beginPath();ctx.ellipse(x,y,stain.bodySize,stain.bodySize*0.75,stain.angle,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
const surfacePixelCache = new Map(), SURFACE_PIXEL_CACHE_MAX = 48;
function drawEmojiSurfaceBlood(ctx,entity,size,emoji,scenery){
  emoji=emoji || entity.emoji;
  if(!goreMode || !entity.bloodStains || !entity.bloodStains.length) return;
  if(!entity.bloodStains.some(stain=>bloodStainLifeT(stain)<1)){
    entity.bloodStains.length=0; entity.bloodStampKey=null; return; // expired marks never rerasterize an empty mask every 500ms
  }
  const stampKey=entity.bloodStainRevision+':'+emoji+':'+(entity.tallStretch || 1)+':'+(entity.widthStretch || 1)+':'+entity.flip+':'+size+':'+(entity.bloodStains.some(stain=>stain.cleanupStarted) ? Math.floor(presentationTime/500) : 0)+':'+graphicsQuality+':'+underHeavyVisualLoad; // BLOOD-STAMP-CACHE-01
  let canvas=entity.bloodStampCanvas;
  if(!canvas || typeof canvas.getContext !== 'function'){
    canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    Object.defineProperty(entity,'bloodStampCanvas',{value:canvas,writable:true,configurable:true,enumerable:false});entity.bloodStampKey=null; // renderer cache must never enter scenery saves
  }
  if(entity.bloodStampKey!==stampKey){
    const m=canvas.getContext('2d'),scale=128/(size*1.8),cap=(graphicsQuality==='low' || underHeavyVisualLoad) ? 6 : BLOOD_STAIN_MAX;
    m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,128,128);m.save();m.translate(64,64);m.scale(scale,scale);
    const surfaceKey=emoji+':'+size+':'+(entity.widthStretch || 1)+':'+(entity.tallStretch || 1)+':'+entity.flip;
    let surfacePixels=null;
    if(scenery && entity.bloodStains.some((stain,index)=>index>=entity.bloodStains.length-cap && bloodStainLifeT(stain)<1 && stain.surfaceKey!==surfaceKey)){
      const pixelKey=surfaceKey+':'+entity.type+(entity.type==='BRANCH' ? ':'+entity.x+','+entity.y : '');
      surfacePixels=surfacePixelCache.get(pixelKey);
      if(!surfacePixels){ // BLOOD-STAMP-CACHE-01
        m.globalAlpha=1;if(scenery && entity.type==='BRANCH') drawBranchSprite(m,size,undefined,entity); else if(scenery && entity.type==='STUMP') drawStumpSprite(m,size); else drawEmojiSprite(m,emoji,size);surfacePixels=m.getImageData(0,0,128,128).data;
        m.save();m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,128,128);m.restore();
        if(surfacePixelCache.size>=SURFACE_PIXEL_CACHE_MAX) surfacePixelCache.delete(surfacePixelCache.keys().next().value);
        surfacePixelCache.set(pixelKey,surfacePixels);
      }
    }
    for(let i=Math.max(0,entity.bloodStains.length-cap);i<entity.bloodStains.length;i++){
      const stain=entity.bloodStains[i],age=bloodStainLifeT(stain);
      if(age>=1) continue;
      m.globalAlpha=(stain.rgb.a===undefined ? 1 : stain.rgb.a)*0.88*bloodFadeAlpha(age);m.fillStyle=bloodStainPaint(stain);
      const sx=scenery ? (entity.widthStretch || 1)*(entity.flip ? -1 : 1) : 1,sy=scenery ? (entity.tallStretch || 1) : 1;
      let px=stain.offsetX/sx,py=scenery ? (stain.offsetY-size*0.5)/sy+size*0.5-2 : stain.offsetY;
      if(scenery){ // SURFACE-BLOOD-VISIBLE-01
        if(stain.surfaceKey!==surfaceKey && surfacePixels){
          const targetX=64+px*scale,targetY=64+py*scale;let best=Infinity,bestX=64,bestY=64;
          for(let y=0;y<128;y++) for(let x=0;x<128;x++) if(surfacePixels[(y*128+x)*4+3]>128){
            const distance=(x-targetX)*(x-targetX)+(y-targetY)*(y-targetY);
            if(distance<best){best=distance;bestX=x;bestY=y;}
          }
          stain.surfaceX=(bestX+0.5-64)/scale;stain.surfaceY=(bestY+0.5-64)/scale;stain.surfaceKey=surfaceKey;
        }
        if(stain.surfaceKey===surfaceKey){px=stain.surfaceX;py=stain.surfaceY;}
      }
      m.beginPath();m.ellipse(px,py,Math.min(stain.size,size*0.06,2),Math.min(stain.size*0.7,size*0.045,1.4),stain.angle,0,Math.PI*2);m.fill();
    }
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'destination-in';
    if(scenery && entity.type === 'BRANCH') drawBranchSprite(m, size, undefined, entity);
    else if(scenery && entity.type === 'STUMP') drawStumpSprite(m, size);
    else drawEmojiSprite(m, emoji, size);
    m.restore();
    entity.bloodStampKey = stampKey;
  }
  ctx.drawImage(canvas,-size*0.9,-size*0.9,size*1.8,size*1.8);
}
// GUN-FACING-01: the 🔫 glyph is drawn muzzle-left, so rotating it by the aim angle held the gun backwards.
function drawGunEmoji(ctx, handX, handY, aimAngle){
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(aimAngle);
  ctx.scale(-1, Math.cos(aimAngle) < 0 ? -1 : 1);
  ctx.textAlign = 'right';
  ctx.fillText('🔫', 0, 0);
  ctx.restore();
}
function drawArmAndHand(ctx, shoulderX, shoulderY, angle, armLen, color, bend){
  if(bend === undefined) bend = -0.3;
  const upperLen = armLen*0.52, foreLen = armLen*0.48;
  const elbowAngle = angle + bend;
  const elbowX = shoulderX + Math.cos(elbowAngle)*upperLen;
  const elbowY = shoulderY + Math.sin(elbowAngle)*upperLen;
  const handX = elbowX + Math.cos(angle)*foreLen;
  const handY = elbowY + Math.sin(angle)*foreLen;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(shoulderX,shoulderY); ctx.lineTo(elbowX,elbowY); ctx.lineTo(handX,handY);
  ctx.stroke();
  recordBloodSegment(shoulderX,shoulderY,elbowX,elbowY);recordBloodSegment(elbowX,elbowY,handX,handY);
  weaponHandLast = { handX, handY };
  return weaponHandLast;
}
function drawCat(ctx, x, y, rotation, scale, options){
  options = options || {};
  const crouch = options.crouch ? 2 : 0; // active/attacking cats sit a bit lower and more alert than the upright idle pose
  const attackT = options.attackProgress || 0; // 0-1, a brief paw-swipe pulse — see CatCompanion.update()
  ctx.save();
  ctx.translate(x, y);
  if(rotation) ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#111111';
  // tail — behind the body, so the swipe/legs below draw on top of its base
  ctx.strokeStyle = '#111111'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  const tailFlick = options.idle ? Math.sin((options.phase||0) + (options.t||0)) * 2 : 0;
  ctx.beginPath();
  ctx.moveTo(-9, crouch);
  ctx.quadraticCurveTo(-16, -2+crouch, -13, -8+crouch-tailFlick);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(0, crouch, 10, crouch ? 5 : 6, 0, 0, Math.PI*2);
  ctx.fill();
  // four short legs — the front pair swipes outward during an attack pulse, the back pair stays put
  ctx.lineWidth = 1.4;
  const legY = crouch + 5;
  ctx.beginPath();
  ctx.moveTo(-6, legY); ctx.lineTo(-7, legY+4);
  ctx.moveTo(-2, legY); ctx.lineTo(-3, legY+4);
  ctx.stroke();
  const pawSwipe = Math.sin(attackT*Math.PI) * 5;
  ctx.beginPath();
  ctx.moveTo(4, legY); ctx.lineTo(4+pawSwipe, legY+4-pawSwipe*0.3);
  ctx.moveTo(7, legY); ctx.lineTo(7+pawSwipe, legY+4-pawSwipe*0.3);
  ctx.stroke();
  // head + triangular ears
  ctx.fillStyle = '#111111';
  ctx.beginPath(); ctx.arc(9, -5+crouch, 6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6,-9+crouch); ctx.lineTo(8,-14+crouch); ctx.lineTo(10,-9+crouch); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(11,-9+crouch); ctx.lineTo(13,-14+crouch); ctx.lineTo(14.5,-9+crouch); ctx.closePath(); ctx.fill();
  // small pale eyes, so the face reads against the otherwise fully black silhouette
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath(); ctx.arc(11, -6+crouch, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -6+crouch, 1, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
class CatCompanion{
  constructor(){ this.active = false; }
  spawn(sourceTower, targetEnemy, x, y){
    this.bloodStains = undefined; this.bloodStainNext = 0; this.bloodStainRevision = 0; this.bloodStampKey = null;
    this.sourceTower = sourceTower; this.sourceTowerId = sourceTower.id;
    this.targetEnemy = targetEnemy; this.targetId = targetEnemy ? targetEnemy.id : undefined;
    this.x = x; this.y = y;
    this.age = 0;
    this.lifetime = sourceTower.catLifetime || 3500;
    this.attackCooldown = sourceTower.catAttackCooldown || 900;
    this.attackTimer = this.attackCooldown * 0.4; // lands and scratches a bit sooner than a full cooldown after arriving, not instantly on contact
    this.phase = Math.random()*Math.PI*2;
    this.attackProgress = 0;
    this.active = true;
  }
  update(dt, enemyHash){
    this.age += dt;
    if(this.age >= this.lifetime || !this.sourceTower.active || this.sourceTower.id !== this.sourceTowerId){ this.active = false; return; } // GENERATION-CHECK-01: the owner is gone or its slot was reused
    if(!this.targetEnemy || !this.targetEnemy.active || this.targetEnemy.id !== this.targetId){
      this.targetEnemy = randomActiveEnemy(queryNearby(enemyHash, this.x, this.y, 160));
      if(!this.targetEnemy){ this.active = false; return; }
      this.targetId = this.targetEnemy.id;
    }
    const orbitAngle = gameTime*0.004 + this.phase;
    const desiredX = this.targetEnemy.x + Math.cos(orbitAngle)*13;
    const desiredY = this.targetEnemy.y - 8 + Math.sin(orbitAngle)*5;
    const followStrength = Math.min(1, dt/120); // light smoothing so it visibly glides to the target rather than teleporting each frame
    this.x += (desiredX - this.x) * followStrength;
    this.y += (desiredY - this.y) * followStrength;
    this.attackProgress = Math.max(0, this.attackProgress - dt/220);
    this.attackTimer -= dt;
    if(this.attackTimer <= 0 && this.targetEnemy.active){
      if(!rollDirectAttackMiss(this.sourceTower, this.targetEnemy)) this.targetEnemy.applyDamage(this.sourceTower.damage, this.sourceTower, undefined, false, true, false, false, Math.atan2(this.targetEnemy.y-this.y,this.targetEnemy.x-this.x), 'CAT_SNAPPER');
      this.attackTimer += this.attackCooldown;
      this.attackProgress = 1;
    }
  }
  draw(ctx){
    drawCompanionGroundShadow(ctx,this.x,this.y,'cat',0,this.attackProgress);
    drawCat(ctx, this.x, this.y, 0, 0.55, { crouch: true, attackProgress: this.attackProgress });
  }
}
const MAX_ACTIVE_CATS = 24;
const catPool = Array.from({length: MAX_ACTIVE_CATS}, () => new CatCompanion());
class SkeletonMinion{
  constructor(){ this.active = false; }
  spawn(sourceTower, x, y, damage, cooldown, range){
    this.bloodStains = undefined; this.bloodStainNext = 0; this.bloodStainRevision = 0; this.bloodStampKey = null;
    this.sourceTower = sourceTower; this.sourceTowerId = sourceTower.id;
    this.x = x; this.y = y;
    this.damage = damage; this.attackCooldown = cooldown; this.range = range;
    this.attackTimer = Math.random()*cooldown; // staggered so a freshly-raised band doesn't all swing in lockstep on the very first tick
    this.attackProgress = 0;
    this.phase = Math.random()*Math.PI*2;
    this.active = true;
  }
  update(dt, enemyHash){
    if(!this.sourceTower.active || this.sourceTower.id !== this.sourceTowerId){ this.active = false; return; } // GENERATION-CHECK-01
    this.attackProgress = Math.max(0, this.attackProgress - dt/220);
    this.attackTimer -= dt;
    if(this.attackTimer > 0) return;
    const target = firstActiveEnemy(queryNearby(enemyHash, this.x, this.y, this.range));
    if(!target) return; // stays raised and waiting — does not expire just for having nothing in range right now, only at round-complete
    if(!rollDirectAttackMiss(this.sourceTower, target)) target.applyDamage(this.damage, this.sourceTower, undefined, false, true, false, false, Math.atan2(target.y-this.y,target.x-this.x), 'SKELETON_CONTACT');
    this.attackTimer = this.attackCooldown;
    this.attackProgress = 1;
  }
  draw(ctx){ drawCompanionGroundShadow(ctx,this.x,this.y,'skeleton',this.phase,this.attackProgress); drawSkeleton(ctx, this.x, this.y, this.phase, this.attackProgress); }
}
const MAX_ACTIVE_SKELETONS = 8;
const skeletonPool = Array.from({length: MAX_ACTIVE_SKELETONS}, () => new SkeletonMinion());
function raiseSkeletonsForTower(t){
  const count = t.skeletonCount || 0;
  for(let i=0; i<count; i++){
    const skel = acquireActive(skeletonPool);
    if(!skel) break; // pool exhausted — the remaining skeletons for this tower simply aren't raised, no crash, no unbounded growth
    const ang = (i/count)*Math.PI*2;
    skel.spawn(t, t.x + Math.cos(ang)*18, t.y + Math.sin(ang)*18, t.skeletonDamage, t.skeletonCooldown, t.skeletonRange);
  }
}
function drawSkeleton(ctx, x, y, phase, attackProgress){
  const bob = Math.sin(gameTime/260 + phase) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.strokeStyle = '#e8e4d8'; ctx.fillStyle = '#e8e4d8'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0,-10); ctx.lineTo(0,2);
  ctx.moveTo(0,2); ctx.lineTo(-4,10);
  ctx.moveTo(0,2); ctx.lineTo(4,10);
  ctx.stroke();
  ctx.beginPath(); // ribcage hint
  ctx.moveTo(-2,-4); ctx.lineTo(2,-4);
  ctx.moveTo(-2,-1); ctx.lineTo(2,-1);
  ctx.stroke();
  const swipe = Math.sin(attackProgress*Math.PI) * 4; // brief outward arm pulse on attack, otherwise resting at the sides
  ctx.beginPath();
  ctx.moveTo(0,-8); ctx.lineTo(-5-swipe, -3);
  ctx.moveTo(0,-8); ctx.lineTo(5+swipe, -3);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-14,5,0,Math.PI*2); ctx.fill(); // skull
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-1.8,-15,1,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(1.8,-15,1,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawSwordBlade(ctx, handX, handY, angle, level, big, lowGfx, bladeLen, thickness){
  thickness = thickness || 1;
  const dirX = Math.cos(angle), dirY = Math.sin(angle), perpX = -dirY, perpY = dirX;
  const baseHalf = (big ? 2.7 : 2) * thickness, tipHalf = baseHalf * 0.45, shoulderAt = bladeLen * 0.82;
  const moveAt = (along, across) => ctx.moveTo(handX + dirX*along + perpX*across, handY + dirY*along + perpY*across);
  const lineAt = (along, across) => ctx.lineTo(handX + dirX*along + perpX*across, handY + dirY*along + perpY*across);
  const guardAt = Math.min(3,bladeLen*0.15), guardHalf = Math.min((big ? 4.2 : 3.1)*thickness,(bladeLen-guardAt)*0.22); // SWORD-PROPORTION-01
  // Grip sits at the palm; avoid extending the sword butt toward the elbow.
  ctx.lineCap = 'round'; ctx.strokeStyle = '#6b4930'; ctx.lineWidth = 2.3 * thickness;
  ctx.beginPath(); moveAt(-Math.min(0.8,bladeLen*0.05), 0); lineAt(guardAt - 0.5, 0); ctx.stroke();
  // soft glow for high-tier blades (a wide translucent stroke, never shadowBlur)
  if(level >= 3 && !lowGfx){
    ctx.strokeStyle = 'rgba(125,211,252,0.3)'; ctx.lineWidth = baseHalf * 2 + 2.2;
    ctx.beginPath(); moveAt(guardAt, 0); lineAt(bladeLen, 0); ctx.stroke();
  }
  // tapered blade ending in a point
  ctx.fillStyle = level >= 3 ? '#dfe9ee' : '#e6eaee';
  ctx.beginPath();
  moveAt(guardAt, baseHalf); lineAt(shoulderAt, tipHalf); lineAt(bladeLen, 0);
  lineAt(shoulderAt, -tipHalf); lineAt(guardAt, -baseHalf);
  ctx.closePath(); ctx.fill();
  if(!lowGfx){
    // bright edge on one side and a darker fuller down the middle give the steel some depth
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); moveAt(guardAt + 1, baseHalf * 0.8); lineAt(shoulderAt, tipHalf * 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,92,104,0.55)';
    ctx.beginPath(); moveAt(guardAt + 2, 0); lineAt(bladeLen * 0.78, 0); ctx.stroke();
  }
  // straight crossguard
  ctx.strokeStyle = big ? '#e8b64a' : '#a9afb5'; ctx.lineWidth = Math.min((big ? 2.2 : 1.7)*thickness,(bladeLen-guardAt)*0.12);
  ctx.beginPath(); moveAt(guardAt, -guardHalf); lineAt(guardAt, guardHalf); ctx.stroke();
  // pommel
  ctx.fillStyle = big ? '#e8b64a' : '#7a5230';
  ctx.beginPath(); ctx.arc(handX - dirX*Math.min(1.2, bladeLen*0.08), handY - dirY*Math.min(1.2, bladeLen*0.08), Math.min((big ? 1.7 : 1.3)*thickness,bladeLen*0.09), 0, Math.PI * 2); ctx.fill();
}
function drawAxeHead(ctx, handX, handY, angle, level, haftLen, thickness){
  thickness = thickness || 1;
  const tipX = handX + Math.cos(angle)*haftLen, tipY = handY + Math.sin(angle)*haftLen;
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2.5*thickness;
  ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tipX,tipY); ctx.stroke();
  const perpX = -Math.sin(angle), perpY = Math.cos(angle);
  const headSize = 7*thickness;
  ctx.fillStyle = level >= 3 ? '#bdeaff' : '#9aa0a6';
  ctx.beginPath();
  ctx.moveTo(tipX + perpX*headSize, tipY + perpY*headSize);
  ctx.lineTo(tipX + Math.cos(angle)*6*thickness, tipY + Math.sin(angle)*6*thickness);
  ctx.lineTo(tipX - perpX*headSize, tipY - perpY*headSize);
  ctx.lineTo(tipX - Math.cos(angle)*3*thickness, tipY - Math.sin(angle)*3*thickness);
  ctx.closePath();
  ctx.fill();
}
const stickmanShadowMask = document.createElement('canvas');
stickmanShadowMask.width=256; stickmanShadowMask.height=256;
const stickmanShadowCtx = stickmanShadowMask.getContext('2d');
// SHADOW-CACHE-01: each fighter keeps its own silhouette canvas, redrawn only when its pose changes (angle in 6 degree steps, swing, lunge, walk phase) and at most
// every 60 ms, so an idle fighter costs one blit per frame. A small least-recently-used set bounds the memory.
const stickmanShadowCache = new Map(), STICKMAN_SHADOW_CACHE_MAX = 48, STICKMAN_SHADOW_REFRESH_MS = 60;
function evictLeastRecentStickmanShadow(){
  let oldestId = null, oldestUse = Infinity;
  for(const [id, candidate] of stickmanShadowCache) if(candidate.used < oldestUse){ oldestUse = candidate.used; oldestId = id; }
  stickmanShadowCache.delete(oldestId);
}
function paintStickmanSilhouette(maskCtx, maskScale, angle, level, type, extra){
  maskCtx.setTransform(1,0,0,1,0,0); maskCtx.globalAlpha = 1; maskCtx.globalCompositeOperation = 'source-over'; maskCtx.clearRect(0,0,256,256);
  maskCtx.save(); maskCtx.translate(128,128); maskCtx.scale(maskScale, maskScale);
  extra.shadowPass = true; drawStickman(maskCtx, 0, 0, angle, level, type, extra); extra.shadowPass = false;
  maskCtx.restore();
  maskCtx.globalCompositeOperation = 'source-in'; maskCtx.fillStyle = '#000'; maskCtx.fillRect(0,0,256,256); maskCtx.globalCompositeOperation = 'source-over';
}
function stickmanShadowEntry(owner){
  let entry = stickmanShadowCache.get(owner.id);
  if(!entry){
    if(stickmanShadowCache.size >= STICKMAN_SHADOW_CACHE_MAX) evictLeastRecentStickmanShadow();
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    entry = { canvas, ctx: canvas.getContext('2d'), key: '', at: -1e9, used: 0 };
    stickmanShadowCache.set(owner.id, entry);
  }
  entry.used = presentationTime;
  return entry;
}
function drawStickmanGroundShadow(ctx,x,y,angle,level,type,extra,owner){
  const bx=extra.buildScaleX || (JOB_BUILD[type] && JOB_BUILD[type].scaleX) || 1;
  const by=extra.buildScaleY || (JOB_BUILD[type] && JOB_BUILD[type].scaleY) || 1;
  const ls=extra.isLegendary ? 1.1 : 1;
  const ms=Math.min(1,96/(80*Math.max(bx,by)*STICKMAN_SCALE*ls));
  let mask = stickmanShadowMask;
  if(owner){
    const entry = stickmanShadowEntry(owner);
    const key = type + '|' + level + '|' + Math.round(angle*10) + '|' + Math.round((extra.swingProgress||0)*6) + '|' + Math.round(extra.lungeAmt||0) + '|' + Math.round((extra.castProgress||0)*4) + '|' + (extra.spec||'') + '|' + (extra.hasTarget ? 1 : 0) + '|' + (extra.walkPhase === undefined ? '' : Math.round(extra.walkPhase*2)) + '|' + (extra.headItem||'') + '|' + Math.round(bx*20) + '|' + Math.round(by*20);
    if(entry.key !== key && presentationTime - entry.at >= STICKMAN_SHADOW_REFRESH_MS){
      paintStickmanSilhouette(entry.ctx, ms, angle, level, type, extra);
      entry.key = key; entry.at = presentationTime;
    }
    mask = entry.canvas;
  } else {
    paintStickmanSilhouette(stickmanShadowCtx, ms, angle, level, type, extra);
  }
  const footY=20*by*STICKMAN_SCALE*ls;
  ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha*=0.24; ctx.translate(x,y+footY); ctx.transform(1,0,-0.55,0.34,0,0);
  // only the part of the 256 canvas the silhouette can occupy is blitted (measured across all 29 fighter types: x -46..46, y -69..32 from the centre), a quarter of the area
  ctx.drawImage(mask, 64, 48, 128, 120, (-64)/ms, (-80)/ms-footY, 128/ms, 120/ms); ctx.restore();
}
function drawMageStaffLight(ctx,x,y,radius,shadowPass,glow){
  radius*=1.2;
  const breath=PREFERS_REDUCED_MOTION ? 0.65 : 0.5+0.5*Math.sin(presentationTime/650+x*0.11);
  if(glow && !shadowPass){
    ctx.fillStyle='rgba(255,255,255,'+(0.08+breath*0.14)+')';
    ctx.beginPath();ctx.arc(x,y,radius+1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,'+(0.18+breath*0.20)+')';
    ctx.beginPath();ctx.arc(x,y,radius+0.8,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle=shadowPass ? '#000' : '#fff';
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
}
const WALK_SPEED_PX_PER_MS = 0.17, FOOT_SIDES = Object.freeze([-1, 1]);
const MERCHANT_BAG_REACH = 6, CHEF_KNIFE_REACH = 13, GLAIVE_BARREL_MIN_LEN = 16, GLAIVE_BARREL_MAX_LEN = 24;
const GATLING_BELT_STUDS = Object.freeze([0.2, 0.4, 0.6, 0.8]), BANDOLIER_STUDS = Object.freeze([0.25, 0.5, 0.75]);
function drawHandSparks(ctx, handX, handY, tickSeed, angleOffsetDeg){
  for(let k = 0; k < 2; k++){
    const sparkAngle = ((tickSeed*37 + k*113 + angleOffsetDeg) % 360) * Math.PI/180;
    const innerLength = 4 + ((tickSeed + k*5) % 4), outerLength = innerLength + 3 + k*2;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + Math.cos(sparkAngle)*innerLength, handY + Math.sin(sparkAngle)*innerLength);
    ctx.lineTo(handX + Math.cos(sparkAngle + 0.7)*outerLength, handY + Math.sin(sparkAngle + 0.7)*outerLength);
    ctx.stroke();
  }
}
// The pistol pivots at the grip and points along the aim; a green droplet sits at the muzzle.
function drawSquirtPistol(ctx, handX, handY, gunAngle, gunLen, lowGfx){
  drawGunEmoji(ctx, handX, handY, gunAngle);
  markWeapon(handX, handY, gunAngle, gunLen);
  if(lowGfx) return;
  ctx.fillStyle = 'rgba(124,220,24,0.5)';
  ctx.beginPath(); ctx.arc(handX + Math.cos(gunAngle)*gunLen, handY + Math.sin(gunAngle)*gunLen, 2.5, 0, Math.PI*2); ctx.fill();
}
function blendAngleShortest(from, to, t){
  const diff = ((to - from + Math.PI*3) % (Math.PI*2)) - Math.PI;
  return from + diff*t;
}
function drawStickman(ctx, x, y, angle, level, type, extra){
  const skinMain = (extra && extra.skinMain) || '#f5f0e6';
  const skinShade = (extra && extra.skinShade) || '#cfc8b8';
  const faceColor = (extra && extra.faceColor) || 'hsl(110,40%,25%)';
  const lowGfx = !!(extra && extra.lowGfx);
  const build = { scaleX: (extra && extra.buildScaleX) || (JOB_BUILD[type] && JOB_BUILD[type].scaleX) || 1,
                   scaleY: (extra && extra.buildScaleY) || (JOB_BUILD[type] && JOB_BUILD[type].scaleY) || 1 };

  ctx.save();
  ctx.translate((graphicsQuality==='high' ? x : Math.round(x))+0.5, (graphicsQuality==='high' ? y : Math.round(y))+0.5);
  weaponMarkCount = 0; weaponHandLast = null;
  const lunge = (extra && extra.lungeAmt) || 0;
  if(lunge) ctx.translate(Math.cos(angle)*lunge, Math.sin(angle)*lunge);
  if(extra && extra.walkPhase !== undefined) ctx.translate(0, -Math.abs(Math.sin(extra.walkPhase))*1.6);
  if(extra && !extra.hasTarget){
    const breathPhase = (x*0.7 + y*0.3) % 1000;
    const breathY = Math.sin((gameTime + breathPhase) / 900) * 0.6;
    ctx.translate(0, breathY);
  }
  ctx.scale(STICKMAN_SCALE, STICKMAN_SCALE);
  const legendaryScale = (extra && extra.isLegendary) ? 1.1 : 1;
  if(legendaryScale !== 1) ctx.scale(legendaryScale, legendaryScale);
  ctx.scale(build.scaleX, build.scaleY);
  const priorBloodOwner=bloodPoseOwner;
  bloodPoseOwner=extra && !extra.shadowPass ? extra.bloodOwner : null;
  if(bloodPoseOwner){
    const owner=bloodPoseOwner;
    if(!owner.bloodSegments) owner.bloodSegments=[];
    owner.bloodSegmentCount=0;
    const pose=owner.bloodPose || (owner.bloodPose={});
    const walkY=extra.walkPhase !== undefined ? -Math.abs(Math.sin(extra.walkPhase))*1.6 : 0;
    const breathY=!extra.hasTarget ? Math.sin((gameTime+(x*0.7+y*0.3)%1000)/900)*0.6 : 0;
    pose.x=x+0.5+Math.cos(angle)*lunge;pose.y=y+0.5+Math.sin(angle)*lunge+walkY+breathY;
    pose.sx=STICKMAN_SCALE*legendaryScale*build.scaleX;pose.sy=STICKMAN_SCALE*legendaryScale*build.scaleY;
    pose.headRx=7/build.scaleX;pose.headRy=7/build.scaleY;
    recordBloodSegment(0,-17,0,4);
  }
  ctx.lineWidth = 3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  ctx.strokeStyle = skinMain;
  ctx.fillStyle = faceColor;
  ctx.beginPath(); ctx.ellipse(0,-24, 7/build.scaleX, 7/build.scaleY, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-17); ctx.lineTo(0,4); ctx.stroke();
  // equipped head-slot item, if any — drawn right on top of the head
  if(extra && extra.headItem === 'archer_hat'){
    ctx.save();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.ellipse(0, -29, 8, 2.5, 0, 0, Math.PI*2); ctx.fill(); // brim
    ctx.beginPath();
    ctx.moveTo(-4.5,-29); ctx.quadraticCurveTo(0,-38,4.5,-29); ctx.closePath(); ctx.fill(); // peaked crown
    ctx.strokeStyle = '#d94f4f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(3,-35); ctx.quadraticCurveTo(10,-41,7,-30); ctx.stroke(); // feather
    ctx.restore();
  }
  // WEARABLE-ITEMS-01: the Fancy Hat sits on the head and the Running Shoes on the feet while they are in the pack
  if(extra && extra.wearsFancyHat){ ctx.save(); ctx.translate(0, -31.5); drawEmojiSprite(ctx, '🎩', 15); ctx.restore(); }
  if(extra && extra.mustacheColor && (extra.str || 0) > 47){
    const mT = clampNum(((extra.str||0) - 47) / 50, 0, 1); // 0 right at the threshold, 1 at the cap
    const mReach = 2 + mT*5; // half-width each side: barely-there at threshold, a real handlebar at the cap
    const mY = -21; // lower-front of the head circle — reads as sitting just above the mouth
    ctx.save();
    ctx.strokeStyle = extra.mustacheColor;
    ctx.lineWidth = 1.5 + mT*1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, mY);
    ctx.quadraticCurveTo(-mReach*0.6, mY-1, -mReach, mY + mT*1.5); // left side, curling upward more at bigger sizes
    ctx.moveTo(0, mY);
    ctx.quadraticCurveTo(mReach*0.6, mY-1, mReach, mY + mT*1.5); // right side, mirrored
    ctx.stroke();
    ctx.restore();
  }
  // legs: shaded tone for a subtle two-tone look
  ctx.strokeStyle = skinShade;
  ctx.beginPath();
  const legSwing = (extra && extra.walkPhase !== undefined) ? Math.sin(extra.walkPhase)*7 : 0; // walking: the feet swap places each step
  ctx.moveTo(0,4); ctx.lineTo(-8 + legSwing, 20 - Math.max(0, legSwing)*0.25);
  ctx.moveTo(0,4); ctx.lineTo(8 + legSwing, 20 - Math.max(0, -legSwing)*0.25);
  ctx.stroke();
  recordBloodSegment(0,4,-8+legSwing,20-Math.max(0,legSwing)*0.25);
  recordBloodSegment(0,4,8+legSwing,20-Math.max(0,-legSwing)*0.25);
  if(extra && extra.wearsRunningShoes){
    const shoeFlip = Math.cos(angle) >= 0 ? -1 : 1; // the shoe emoji points left; mirror it to face the way the stickman faces
    for(const side of FOOT_SIDES){
      ctx.save();
      ctx.translate(side*8 + legSwing, 20.5 - Math.max(0, -side*legSwing)*0.25);
      ctx.scale(shoeFlip, 1);
      drawEmojiSprite(ctx, '👟', 9);
      ctx.restore();
    }
  }

  const isDual = type === 'SWORDSMAN' && extra && extra.spec === 'DUAL' && extra.angle2 != null;
  const isTwoHander = type === 'SWORDSMAN' && extra && extra.spec === 'TWOHANDER';

  const shoulderX = 0, shoulderY = -13, armLen = 13;

  if(type === 'SWORDSMAN'){
    const swingT = extra.swingProgress || 0;
    const dynamicBend = -0.3 + swingT*0.55; // cocked back at wind-up, extends through the strike
    const swordLen = weaponLenFromScale(isTwoHander ? 17 : 15, isTwoHander ? 24 : 23, extra.weaponScale);
    const charge = (isTwoHander && swingT === 0) ? (extra.chargeProgress || 0) : 0;
    const chargeShake = charge > 0.5 ? Math.sin(presentationTime/40) * (charge-0.5)*2 * 0.09 : 0; // only trembles in the back half of the charge, amplitude ramping toward release
    const drawTwoHanderExtras = (handX, handY, bladeAngle) => {
      ctx.strokeStyle = skinMain; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(handX,handY); ctx.stroke();
      recordBloodSegment(-8,-8,handX,handY);
      if(charge <= 0.5 || lowGfx) return;
      const tipX = handX + Math.cos(bladeAngle)*swordLen, tipY = handY + Math.sin(bladeAngle)*swordLen;
      ctx.strokeStyle = `rgba(255,220,180,${((charge-0.5)*0.7).toFixed(2)})`;
      ctx.lineWidth = 1.5 + charge*2;
      ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tipX,tipY); ctx.stroke();
      if(charge > 0.88){
        // final flicker right before release, same threshold-flash language as Mage's own
        const flicker = 0.5 + 0.5*Math.sin(presentationTime/55);
        ctx.fillStyle = `rgba(255,255,255,${(flicker*(charge-0.88)/0.12).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
      }
    };
    if(isDual){
      const hand1 = drawArmAndHand(ctx, shoulderX, shoulderY, angle, armLen, skinMain, -0.5 + swingT*0.55);
      drawSwordBlade(ctx, hand1.handX, hand1.handY, angle, level, false, lowGfx, swordLen, extra.weaponThickness);
      markWeapon(hand1.handX, hand1.handY, angle, swordLen);
      const hand2 = drawArmAndHand(ctx, shoulderX, shoulderY, extra.angle2, armLen, skinMain, 0.5 - swingT*0.55);
      drawSwordBlade(ctx, hand2.handX, hand2.handY, extra.angle2, level, false, lowGfx, swordLen, extra.weaponThickness);
      markWeapon(hand2.handX, hand2.handY, extra.angle2, swordLen);
    } else if(!extra.hasTarget){
      // IDLE-GRIP-01
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
      const restAngle = IDLE_GUN_ANGLE + chargeShake;
      const hand = drawArmAndHand(ctx, shoulderX, shoulderY, IDLE_GRIP_ARM_ANGLE, armLen, skinMain, 0.15);
      drawSwordBlade(ctx, hand.handX, hand.handY, restAngle, level, isTwoHander, lowGfx, swordLen, extra.weaponThickness);
      markWeapon(hand.handX, hand.handY, restAngle, swordLen);
      if(isTwoHander) drawTwoHanderExtras(hand.handX, hand.handY, restAngle);
    } else {
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
      const swingAngle = angle + chargeShake;
      const hand = drawArmAndHand(ctx, shoulderX, shoulderY, swingAngle, armLen, skinMain, dynamicBend);
      drawSwordBlade(ctx, hand.handX, hand.handY, swingAngle, level, isTwoHander, lowGfx, swordLen, extra.weaponThickness);
      markWeapon(hand.handX, hand.handY, swingAngle, swordLen);
      if(isTwoHander) drawTwoHanderExtras(hand.handX, hand.handY, swingAngle);
    }
  } else if(type==='NINJA'){
    ctx.fillStyle='#202632';ctx.fillRect(-6,-28,12,8);
    ctx.strokeStyle='#bdc9d7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-25);ctx.lineTo(3,-25);ctx.stroke();
    for(let i=0;i<2;i++){
      const bend=i?0.45:-0.45;
      const hand=drawArmAndHand(ctx,shoulderX,shoulderY,extra.hasTarget?angle:IDLE_GRIP_ARM_ANGLE,armLen,skinMain,bend);
      ctx.save();ctx.translate(hand.handX,hand.handY);ctx.scale(0.65,0.65);drawAmmoShape(ctx,'STAR','#bfc8d6');ctx.restore();
    }
  } else if(type === 'ARCHER'){
    const drawAmt = extra.drawProgress || 0; // 0 = relaxed, 1 = fully drawn and about to loose
    const perpX = -Math.sin(angle), perpY = Math.cos(angle);
    const shoulderOffset = 1.8;
    const frontShoulderX = shoulderX + perpX*shoulderOffset, frontShoulderY = shoulderY + perpY*shoulderOffset;
    const backShoulderX = shoulderX - perpX*shoulderOffset, backShoulderY = shoulderY - perpY*shoulderOffset;
    const quiverSide = Math.cos(angle) >= 0 ? -1 : 1;
    const quiverInnerX = quiverSide * 2.5, quiverOuterX = quiverSide * 7.5;
    const quiverTop = -11, quiverBottom = 0;
    // shoulder strap connecting the quiver to the body, so the gap reads as "worn" rather than floating
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(quiverInnerX, quiverTop+2); ctx.stroke();
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(Math.min(quiverInnerX,quiverOuterX), quiverTop, Math.abs(quiverOuterX-quiverInnerX), quiverBottom-quiverTop);
    ctx.strokeStyle = '#4a2e15'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.min(quiverInnerX,quiverOuterX), quiverTop, Math.abs(quiverOuterX-quiverInnerX), quiverBottom-quiverTop);
    for(let i=0; i<3; i++){
      const fx = quiverInnerX + quiverSide*(1 + i*1.5);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(fx, quiverTop); ctx.lineTo(fx, quiverTop-5); ctx.stroke();
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx-1.2, quiverTop-4.5); ctx.lineTo(fx+1.2, quiverTop-2.8); ctx.stroke();
    }
    const bowArmBend = -0.08 - drawAmt*0.10; // straightens slightly under tension
    const bowArmLen = armLen + 5 + drawAmt*2; // tiny forward push as it braces against the pull
    const hand = drawArmAndHand(ctx, frontShoulderX, frontShoulderY, angle, bowArmLen, skinMain, bowArmBend);
    const handX = hand.handX, handY = hand.handY;
    markWeapon(handX, handY, angle, 14);
    const bowTopX = handX + Math.cos(angle - Math.PI/2)*10;
    const bowTopY = handY + Math.sin(angle - Math.PI/2)*10;
    const bowBotX = handX + Math.cos(angle + Math.PI/2)*10;
    const bowBotY = handY + Math.sin(angle + Math.PI/2)*10;
    const bowFlex = 4 + drawAmt*7; // the bow itself bends further under tension as it's drawn
    const bowMidX = handX + Math.cos(angle)*bowFlex;
    const bowMidY = handY + Math.sin(angle)*bowFlex;
    if(level >= 3 && !lowGfx){
      ctx.strokeStyle = 'rgba(125,211,252,0.5)'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(bowTopX,bowTopY);
      ctx.quadraticCurveTo(bowMidX,bowMidY,bowBotX,bowBotY);
      ctx.stroke();
    }
    ctx.strokeStyle = level >= 3 ? '#bdeaff' : '#c88a4a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bowTopX,bowTopY);
    ctx.quadraticCurveTo(bowMidX,bowMidY,bowBotX,bowBotY);
    ctx.stroke();
    const pullBack = 6 + drawAmt*15;
    const drawX = handX - Math.cos(angle)*pullBack;
    const drawY = handY - Math.sin(angle)*pullBack;
    const elbowMidX = (backShoulderX + drawX) / 2;
    const elbowMidY = (backShoulderY + drawY) / 2;
    const elbowX = elbowMidX;
    const elbowY = elbowMidY + 4;
    ctx.strokeStyle = skinMain; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(backShoulderX, backShoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(drawX, drawY);
    ctx.stroke();
    recordBloodSegment(backShoulderX,backShoulderY,elbowX,elbowY);recordBloodSegment(elbowX,elbowY,drawX,drawY);
    ctx.strokeStyle = 'rgba(245,240,230,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bowTopX,bowTopY); ctx.lineTo(drawX,drawY); ctx.lineTo(bowBotX,bowBotY);
    ctx.stroke();
    // nocked arrow — only visible once a draw is actually underway, growing clearer as it charges
    const nockAmount = extra.nockAmount !== undefined ? extra.nockAmount : Math.min(1, drawAmt*1.3);
    if(nockAmount > 0.02){
      ctx.save();
      ctx.globalAlpha = nockAmount;
      const arrowTip = archerNockedArrowTip(angle, drawAmt);
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(drawX,drawY); ctx.lineTo(arrowTip.x,arrowTip.y); ctx.stroke();
      ctx.strokeStyle = '#c7ccd1'; ctx.lineWidth = 1;
      const fx = arrowTip.x, fy = arrowTip.y;
      ctx.beginPath();
      ctx.moveTo(fx,fy); ctx.lineTo(fx - Math.cos(angle-0.3)*5, fy - Math.sin(angle-0.3)*5);
      ctx.moveTo(fx,fy); ctx.lineTo(fx - Math.cos(angle+0.3)*5, fy - Math.sin(angle+0.3)*5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = skinMain;
    ctx.beginPath(); ctx.arc(drawX,drawY,1.8,0,Math.PI*2); ctx.fill();
  } else if(type === 'MAGE' || type === 'SNAPCASTER' || type === 'PROTON' || type === 'DARK_MATTER' || type === 'QUASAR'){
    const cast = extra.castProgress || 0;
    const castKick = mageRecoilKick(cast);
    const wandBend = -0.3 - castKick*0.9; // arm snaps back and up on the cast
    const restBlend = extra.restBlend || 0;
    const armAngle = blendAngleShortest(angle, Math.PI/2 - 0.7, restBlend); // matches Swordsman's actual resting sword-hand arm angle
    const staffClimbSign = Math.cos(angle) >= 0 ? -1 : 1; // the tip rises on both sides when facing left or right
    const staffAngle = blendAngleShortest(angle, IDLE_GUN_ANGLE, restBlend) + staffClimbSign * castKick * 0.55; // matches Swordsman's actual resting blade direction, plus the muzzle climb
    const offHand = drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, armAngle, armLen, skinMain, wandBend);
    const handX = hand.handX, handY = hand.handY;
    if(type === 'SNAPCASTER'){
      // SNAPCASTER-HANDS-01
      const tickSeed = Math.floor(presentationTime/90);
      ctx.save();
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      drawHandSparks(ctx, hand.handX, hand.handY, tickSeed, 0);
      drawHandSparks(ctx, offHand.handX, offHand.handY, tickSeed, 61);
      ctx.restore();
    }
    if(type !== 'SNAPCASTER'){
      // staff extends both beyond the grip and a little behind it, like a real held staff, with a pulsing orb at the tip
      const staffLen = weaponLenFromScale(14, 22, extra.weaponScale);
      const recoilSlide = castKick * 6, staffGripX = handX - Math.cos(angle)*recoilSlide, staffGripY = handY - Math.sin(angle)*recoilSlide;
      const tipX = staffGripX + Math.cos(staffAngle)*staffLen, tipY = staffGripY + Math.sin(staffAngle)*staffLen;
      const buttX = staffGripX - Math.cos(staffAngle)*7, buttY = staffGripY - Math.sin(staffAngle)*7;
      markWeapon(staffGripX, staffGripY, staffAngle, staffLen);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2.5*extra.weaponThickness;
      ctx.beginPath(); ctx.moveTo(buttX,buttY); ctx.lineTo(tipX,tipY); ctx.stroke();
      const charge = extra.chargeProgress || 0;
      const pulse = 2.1 + charge*0.6 + cast*2.2;
      drawMageStaffLight(ctx,tipX,tipY,pulse,!!extra.shadowPass,!lowGfx || graphicsQuality==='high' && !extra.preview);
      if(cast > 0.04 && !extra.shadowPass){
        ctx.save();
        ctx.globalAlpha = cast * 0.85; ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(tipX, tipY, 3 + (1 - cast) * 14, 0, Math.PI*2); ctx.stroke();
        const sparkLen = 3 + (1 - cast) * 9;
        ctx.beginPath();
        for(let spark = -1; spark <= 1; spark++){
          const sparkAngle = angle + spark * 0.55, sparkStart = 4 + (1 - cast) * 8;
          ctx.moveTo(tipX + Math.cos(sparkAngle)*sparkStart, tipY + Math.sin(sparkAngle)*sparkStart);
          ctx.lineTo(tipX + Math.cos(sparkAngle)*(sparkStart + sparkLen), tipY + Math.sin(sparkAngle)*(sparkStart + sparkLen));
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  } else if(type === 'BOMBER'){
    // small pouch of spare shells on the hip
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-3, -4, 6, 5, 1.2) : ctx.rect(-3, -4, 6, 5); ctx.fill();
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 1; ctx.stroke();
    const bomberAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen, skinMain);
    const handX = hand.handX, handY = hand.handY;
    ctx.strokeStyle = level >= 3 ? '#bdeaff' : '#5c5c5c';
    ctx.lineWidth = 6*extra.weaponThickness; ctx.lineCap = 'butt';
    const tubeLen = weaponLenFromScale(12, 19, extra.weaponScale);
    const tubeX = handX + Math.cos(bomberAngle)*tubeLen, tubeY = handY + Math.sin(bomberAngle)*tubeLen;
    ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tubeX,tubeY); ctx.stroke();
    markWeapon(handX, handY, bomberAngle, tubeLen);
    ctx.lineCap = 'round';
  } else if(type === 'GATLING'){
    // ammo belt across the chest
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-4,-15); ctx.lineTo(4,2); ctx.stroke();
    if(!lowGfx){
      ctx.fillStyle = '#c7ccd1';
      for(const t of GATLING_BELT_STUDS){
        ctx.beginPath(); ctx.arc(-4+8*t, -15+17*t, 0.9, 0, Math.PI*2); ctx.fill();
      }
    }
    const gatlingAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen, skinMain);
    const handX = hand.handX, handY = hand.handY;
    // twin parallel barrels
    const perpX = -Math.sin(gatlingAngle), perpY = Math.cos(gatlingAngle);
    ctx.strokeStyle = level >= 3 ? '#bdeaff' : '#8a8f98';
    ctx.lineWidth = 2.5*extra.weaponThickness;
    for(const side of FOOT_SIDES){
      const bx = handX+perpX*3*side, by = handY+perpY*3*side;
      const barrelLen = weaponLenFromScale(14, 22, extra.weaponScale);
      const tx = bx+Math.cos(gatlingAngle)*barrelLen, ty = by+Math.sin(gatlingAngle)*barrelLen;
      markWeapon(bx, by, gatlingAngle, barrelLen);
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.stroke();
    }
  } else if(type === 'AXEMAN' || type === 'BERSERKER'){
    const axeLen = weaponLenFromScale(15, 24, extra.weaponScale);
    // AXEMAN-IDLE-01: with no target both axes hang down at the sides instead of pointing the last attack direction.
    const axeAngle = extra.hasTarget ? angle : Math.PI/2 + 0.15;
    const hand1 = drawArmAndHand(ctx, shoulderX, shoulderY, axeAngle, armLen, skinMain, -0.4);
    drawAxeHead(ctx, hand1.handX, hand1.handY, axeAngle, level, axeLen, extra.weaponThickness);
    markWeapon(hand1.handX, hand1.handY, axeAngle, axeLen);
    const hand2 = drawArmAndHand(ctx, shoulderX, shoulderY, axeAngle, armLen, skinMain, 0.4);
    drawAxeHead(ctx, hand2.handX, hand2.handY, axeAngle, level, axeLen, extra.weaponThickness);
  } else if(type === 'SPEARMAN' || type === 'LANCER'){
    const spearBend = -0.3 + (extra.swingProgress || 0)*0.55;
    const spearAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE; // idle: upright, tilted 55° for head clearance; engaged: thrusts at the target
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, spearAngle, armLen + (extra.thrustPx || 0), skinMain, spearBend);
    const handX = hand.handX, handY = hand.handY;
    // long shaft, extending a little behind the hand too for a held-pole look
    const shaftLen = weaponLenFromScale(type === 'LANCER' ? 20 : 15, type === 'LANCER' ? 30 : 24, extra.weaponScale);
    const tipX = handX + Math.cos(spearAngle)*shaftLen, tipY = handY + Math.sin(spearAngle)*shaftLen;
    markWeapon(handX, handY, spearAngle, shaftLen);
    // SPEARHEAD-01: the shaft stops where the blade starts, and the leaf-shaped head is what reaches the tip of the weapon.
    const headLen = type === 'LANCER' ? 14 : 12, headHalfWidth = (type === 'LANCER' ? 5 : 4.4)*Math.min(1.3, extra.weaponThickness);
    const dirX = Math.cos(spearAngle), dirY = Math.sin(spearAngle), perpX = -dirY, perpY = dirX;
    const headBaseX = tipX - dirX*headLen, headBaseY = tipY - dirY*headLen;
    const backX = handX - dirX*8, backY = handY - dirY*8;
    ctx.strokeStyle = type === 'LANCER' ? '#6b4930' : '#8a5a2b';
    ctx.lineWidth = (type === 'LANCER' ? 3.5 : 2.5)*extra.weaponThickness;
    ctx.beginPath(); ctx.moveTo(backX,backY); ctx.lineTo(headBaseX,headBaseY); ctx.stroke();
    ctx.fillStyle = type === 'LANCER' || level >= 3 ? '#bdeaff' : '#c7ccd1';
    ctx.strokeStyle = '#7d848c'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(headBaseX, headBaseY);
    ctx.quadraticCurveTo(headBaseX + dirX*headLen*0.45 + perpX*headHalfWidth*1.8, headBaseY + dirY*headLen*0.45 + perpY*headHalfWidth*1.8, tipX, tipY);
    ctx.quadraticCurveTo(headBaseX + dirX*headLen*0.45 - perpX*headHalfWidth*1.8, headBaseY + dirY*headLen*0.45 - perpY*headHalfWidth*1.8, headBaseX, headBaseY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if(type === 'LANCER'){
      const guardX = headBaseX, guardY = headBaseY;
      ctx.strokeStyle = '#c7ccd1'; ctx.lineWidth = 2.2*extra.weaponThickness;
      ctx.beginPath(); ctx.moveTo(guardX - perpX*5, guardY - perpY*5); ctx.lineTo(guardX + perpX*5, guardY + perpY*5); ctx.stroke();
    }
  } else if(type === 'HAMMERMAN' || type === 'PALADIN'){
    const isPaladin = type === 'PALADIN'; // PALADIN-FIGURE-01: the Hammerman's hammer and shield, gilded, with a cross on the shield
    const hammerBend = -0.3 + (extra.swingProgress || 0)*0.55;
    const hammerAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    // IDLE-GRIP-01
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen, skinMain, hammerBend);
    const handX = hand.handX, handY = hand.handY;
    // hammer: haft + a rectangular head (not a wedge — reads as blunt, not bladed)
    const haftLen = weaponLenFromScale(14, 22, extra.weaponScale);
    const tipX = handX + Math.cos(hammerAngle)*haftLen, tipY = handY + Math.sin(hammerAngle)*haftLen;
    markWeapon(handX, handY, hammerAngle, haftLen);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3*extra.weaponThickness;
    ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tipX,tipY); ctx.stroke();
    const perpX = -Math.sin(hammerAngle), perpY = Math.cos(hammerAngle);
    const headLen = 10 * extra.weaponThickness;
    ctx.fillStyle = isPaladin ? '#e8c768' : level >= 3 ? '#bdeaff' : '#8a8f98';
    ctx.beginPath();
    ctx.moveTo(tipX + perpX*8 - Math.cos(hammerAngle)*headLen*0.3, tipY + perpY*8 - Math.sin(hammerAngle)*headLen*0.3);
    ctx.lineTo(tipX + perpX*8 + Math.cos(hammerAngle)*headLen*0.7, tipY + perpY*8 + Math.sin(hammerAngle)*headLen*0.7);
    ctx.lineTo(tipX - perpX*8 + Math.cos(hammerAngle)*headLen*0.7, tipY - perpY*8 + Math.sin(hammerAngle)*headLen*0.7);
    ctx.lineTo(tipX - perpX*8 - Math.cos(hammerAngle)*headLen*0.3, tipY - perpY*8 - Math.sin(hammerAngle)*headLen*0.3);
    ctx.closePath();
    ctx.fill();
    // shield strapped to the off-hand — the tower's defining trait, shown explicitly rather than implied
    const shieldArm = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? IDLE_WEAPON_ANGLE : (Math.PI/2 + 0.7), armLen*0.6, skinMain, -0.2);
    const shieldX = shieldArm.handX, shieldY = shieldArm.handY - 3;
    ctx.fillStyle = isPaladin ? '#f5f0e6' : level >= 3 ? '#bdeaff' : '#9aa0a6';
    ctx.beginPath(); ctx.arc(shieldX, shieldY, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = isPaladin ? '#c9a84c' : '#7a5230'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(shieldX, shieldY, 7, 0, Math.PI*2); ctx.stroke();
    if(isPaladin){
      ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(shieldX, shieldY - 4.5); ctx.lineTo(shieldX, shieldY + 4.5); ctx.moveTo(shieldX - 3, shieldY - 1); ctx.lineTo(shieldX + 3, shieldY - 1); ctx.stroke();
    }
  } else if(type === 'HACKER'){
    // HACKER-01: no weapon at all — both hands hold an open laptop in front of the chest.
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const typingHand = drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 - 0.55, armLen, skinMain, -0.15);
    ctx.save();
    ctx.translate(typingHand.handX, typingHand.handY - 1);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-8, 0, 16, 2.4);
    ctx.fillStyle = '#263238';
    ctx.fillRect(-7, -10, 14, 10);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-5.8, -8.8, 11.6, 7.6);
    ctx.strokeStyle = '#0d47a1'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, -6.4); ctx.lineTo(-1.6, -5); ctx.lineTo(-4, -3.6); ctx.moveTo(0, -3.4); ctx.lineTo(3.6, -3.4); ctx.stroke();
    ctx.restore();
    if(!lowGfx){
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.arc(0, -29, 5.2, Math.PI, 0); ctx.fill();
    }
  } else if(type === 'CLERIC'){
    const isCasting = !!(extra && extra.hasTarget);
    // off-hand: relaxed at the opposite side always
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const castAngle = isCasting ? angle : (Math.PI/2 - 0.7);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, castAngle, armLen, skinMain, isCasting ? -0.3 : -0.15);
    {
      // CLERIC-BIBLE-01
      const bookX = hand.handX, bookY = hand.handY;
      markWeapon(bookX, bookY, castAngle, 10);
      ctx.save();
      ctx.translate(bookX, bookY - 2);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(-4, -6, 8, 11);
      ctx.fillStyle = '#f3ead2';
      ctx.fillRect(-3.2, -5.2, 6.4, 9.4);
      ctx.fillStyle = level >= 3 ? '#8a5a1e' : '#6b4423';
      ctx.fillRect(-4, -6, 3, 11);
      ctx.strokeStyle = isCasting ? '#ffe9a8' : '#d8c9a0';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(1.6, -4); ctx.lineTo(1.6, 2); ctx.moveTo(-0.2, -2); ctx.lineTo(3.4, -2); ctx.stroke();
      ctx.restore();
    }
    // soft halo above the head — always present, independent of casting state
    if(!lowGfx){
      ctx.strokeStyle = 'rgba(255,233,168,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -30, 7, 2.5, 0, 0, Math.PI*2); ctx.stroke();
    }
    {
      const intProgress = clampNum(((extra.int||0) - CLERIC_HAT_INT_START) / (STAT_EFFECT_CAP - CLERIC_HAT_INT_START), 0, 1);
      const hatR = 2.5 + intProgress*3.5; // 2.5px at the start, 6px when the Cleric is about to unlock the Pope
      ctx.fillStyle = level >= 3 ? '#ffe9a8' : '#d8c9a0';
      ctx.strokeStyle = '#b89b5e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -29, hatR, Math.PI, 0); ctx.fill(); ctx.stroke();
    }
  } else if(type === 'POPE'){
    const isCasting = !!(extra && extra.hasTarget);
    const raiseAngle = isCasting ? -Math.PI/2 - 0.55 : -Math.PI/2 - 0.25;
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, raiseAngle, armLen, skinMain, -0.2);
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI - raiseAngle, armLen, skinMain, 0.2);
    if(isCasting){
      const handX = hand.handX, handY = hand.handY;
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(handX, handY-8); ctx.lineTo(handX, handY+5); ctx.stroke();
      markWeapon(handX, handY+5, -Math.PI/2, 13);
      ctx.beginPath(); ctx.moveTo(handX-5, handY-2); ctx.lineTo(handX+5, handY-2); ctx.stroke();
    }
    // grand halo — visibly larger than Cleric's, matching the bigger everything else
    if(!lowGfx){
      ctx.strokeStyle = 'rgba(255,233,168,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -31, 10, 3.5, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = '#fdf6e3';
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -29); ctx.lineTo(-2, -44); ctx.lineTo(0, -40); ctx.lineTo(2, -44); ctx.lineTo(6, -29);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2,-44); ctx.lineTo(2,-31); ctx.stroke(); // center seam
    if(!lowGfx){
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(0, -34, 1.3, 0, Math.PI*2); ctx.fill(); // small gold band ornament
    }
    ctx.strokeStyle = '#fdf6e3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4,-29); ctx.lineTo(-5,-20); ctx.stroke(); // back lappets
    ctx.beginPath(); ctx.moveTo(4,-29); ctx.lineTo(5,-20); ctx.stroke();
  } else if(type === 'BLOWDART'){
    const mouthAngle = extra.hasTarget ? angle : Math.PI/2 + 0.15; // relaxed: pipe held loosely down at the side; engaged: raised to the mouth and aimed at the target
    const faceSign = Math.cos(mouthAngle) >= 0 ? 1 : -1; // only used to mirror the decorative dart pouch
    // small dart pouch on the hip, opposite the blowing hand
    ctx.fillStyle = '#4a5a2a';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-faceSign*6-2.5, -3, 5, 6, 1.5) : ctx.rect(-faceSign*6-2.5, -3, 5, 6);
    ctx.fill();
    ctx.strokeStyle = '#2f3a1a'; ctx.lineWidth = 1;
    ctx.stroke();
    const mouthX = 0, mouthY = -21; // just under the head circle, above the shoulder line — the "mouth"
    const hand = extra.hasTarget
      ? drawArmAndHand(ctx, mouthX, mouthY, mouthAngle, armLen*0.7, skinMain, -0.3*faceSign)
      : drawArmAndHand(ctx, shoulderX, shoulderY, mouthAngle, armLen*0.9, skinMain, 0.1);
    const handX = hand.handX, handY = hand.handY;
    const pipeAngle = mouthAngle;
    const tipX = handX + Math.cos(pipeAngle)*14*extra.weaponScale, tipY = handY + Math.sin(pipeAngle)*14*extra.weaponScale;
    markWeapon(handX, handY, pipeAngle, 14*extra.weaponScale);
    // BLOWDART-ARM-01: a blowgun is held in both hands; the off-hand reaches from the shoulder to a point partway along the pipe.
    if(extra.hasTarget){
      const offGripX = handX + Math.cos(pipeAngle)*7*extra.weaponScale, offGripY = handY + Math.sin(pipeAngle)*7*extra.weaponScale;
      const offAngle = Math.atan2(offGripY - shoulderY, offGripX - shoulderX);
      const offDist = Math.hypot(offGripX - shoulderX, offGripY - shoulderY);
      drawArmAndHand(ctx, shoulderX, shoulderY, offAngle, offDist, skinMain, 0.15*faceSign);
    } else {
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 - 0.7, armLen*0.8, skinMain, -0.12);
    }
    ctx.strokeStyle = '#5a7a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tipX,tipY); ctx.stroke();
    if(!lowGfx){
      ctx.fillStyle = 'rgba(124,181,24,0.4)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'SQUIRTGUN'){
    // bandolier — crossed straps with cartridge dots, fitting a dual-gunner better than a quiver
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4,-15); ctx.lineTo(4,2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,-15); ctx.lineTo(-4,2); ctx.stroke();
    if(!lowGfx){
      ctx.fillStyle = '#c7ccd1';
      for(const t of BANDOLIER_STUDS){
        ctx.beginPath(); ctx.arc(-4+8*t, -15+17*t, 1, 0, Math.PI*2); ctx.fill();
      }
    }
    // dual-wielded pistols, both hands actively aiming — no relaxed off-hand for a gunslinger stance
    const gunAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const hand1 = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : (Math.PI/2 + 0.7), armLen*0.9, skinMain, -0.2);
    const hand2 = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen*0.9, skinMain, 0.2);
    ctx.font = (14 * extra.weaponScale * (0.85 + extra.weaponThickness*0.15)) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const gunLen = weaponLenFromScale(11, 17, extra.weaponScale);
    drawSquirtPistol(ctx, hand1.handX, hand1.handY, gunAngle, gunLen, lowGfx);
    drawSquirtPistol(ctx, hand2.handX, hand2.handY, gunAngle, gunLen, lowGfx);
  } else if(type === 'GUNALINDER'){
    const gunAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const mainHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.9, skinMain, -0.15);
    drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle + 0.35, armLen*0.75, skinMain, 0.1); // off-hand cupping underneath
    ctx.font = (15 * extra.weaponScale * (0.85 + extra.weaponThickness*0.15)) + 'px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const gunLen = weaponLenFromScale(12, 18, extra.weaponScale);
    drawGunEmoji(ctx, mainHand.handX, mainHand.handY, gunAngle);
    markWeapon(mainHand.handX, mainHand.handY, gunAngle, gunLen);
    if(!lowGfx){
      const tipX = mainHand.handX + Math.cos(gunAngle)*gunLen, tipY = mainHand.handY + Math.sin(gunAngle)*gunLen;
      ctx.fillStyle = 'rgba(200,160,60,0.5)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'MARKSMAN'){
    const gunAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const gripHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.85, skinMain, -0.1);
    drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.95, skinMain, 0.08); // support hand closer in than the Sniper's, for a shorter weapon
    ctx.strokeStyle = '#4a5a68'; ctx.lineWidth = 2.5 * (0.8 + extra.weaponThickness*0.2);
    const barrelLen = weaponLenFromScale(15, 21, extra.weaponScale); // between Cowboy's short revolver and Sniper's notably long barrel
    const tipX = gripHand.handX + Math.cos(gunAngle)*barrelLen, tipY = gripHand.handY + Math.sin(gunAngle)*barrelLen;
    markWeapon(gripHand.handX, gripHand.handY, gunAngle, barrelLen);
    ctx.beginPath(); ctx.moveTo(gripHand.handX, gripHand.handY); ctx.lineTo(tipX, tipY); ctx.stroke();
    if(!lowGfx){
      ctx.fillStyle = 'rgba(180,200,220,0.5)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2.2,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'SNIPER'){
    const gunAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const gripHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.85, skinMain, -0.1);
    const supportHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*1.1, skinMain, 0.05); // extended support hand further along the barrel
    ctx.strokeStyle = '#5a6b52'; ctx.lineWidth = 2.5 * (0.8 + extra.weaponThickness*0.2);
    const barrelLen = weaponLenFromScale(22, 30, extra.weaponScale); // notably longer than every other weapon in the game
    const tipX = gripHand.handX + Math.cos(gunAngle)*barrelLen, tipY = gripHand.handY + Math.sin(gunAngle)*barrelLen;
    markWeapon(gripHand.handX, gripHand.handY, gunAngle, barrelLen);
    ctx.beginPath(); ctx.moveTo(gripHand.handX, gripHand.handY); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.font = (11 * extra.weaponScale) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔭', supportHand.handX, supportHand.handY - 3); // scope glint above the support hand
    if(!lowGfx){
      ctx.fillStyle = 'rgba(200,220,180,0.55)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'CAT_SNAPPER'){
    const throwAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, throwAngle, armLen, skinMain, -0.35); // relaxed supporting arm
    const raisedAngle = throwAngle - 0.55; // held higher than the throw line itself, so the cat reads as carried rather than mid-swing
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, raisedAngle, armLen, skinMain, 0.35);
    const tp = extra.throwProgress || 0;
    const releaseDist = tp * 16;
    const catX = hand.handX + Math.cos(throwAngle)*(4 + releaseDist);
    const bobPhase = (extra.buildScaleX||1)*3 + (extra.buildScaleY||1);
    const bob = tp > 0 ? 0 : Math.abs(Math.sin(gameTime/280 + bobPhase)) * 5;
    const catY = hand.handY - 10 - bob - releaseDist*0.3;
    drawCat(ctx, catX, catY, tp > 0 ? throwAngle : 0, 0.62, { idle: tp <= 0, phase: bobPhase });
  } else if(type === 'NECROMANCER'){
    const castAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, castAngle + Math.PI*0.85, armLen*0.75, skinMain, -0.3); // relaxed off-hand, well clear of the casting arm
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, castAngle, armLen, skinMain, -0.2);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2 * (0.8 + extra.weaponThickness*0.2);
    const boneLen = weaponLenFromScale(10, 15, extra.weaponScale);
    const tipX = hand.handX + Math.cos(castAngle)*boneLen, tipY = hand.handY + Math.sin(castAngle)*boneLen;
    markWeapon(hand.handX, hand.handY, castAngle, boneLen);
    ctx.beginPath(); ctx.moveTo(hand.handX, hand.handY); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.font = (13 * extra.weaponScale) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💀', tipX, tipY - 3);
    if(!lowGfx){
      ctx.fillStyle = 'rgba(90,45,130,0.5)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'MERCHANT'){
    // MERCHANT-FIGURE-01: a turbaned trader holding up the Money Bag he throws
    const throwAngle = extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, throwAngle, armLen, skinMain, -0.25);
    markWeapon(hand.handX, hand.handY, throwAngle, MERCHANT_BAG_REACH);
    ctx.save(); ctx.translate(hand.handX, hand.handY - 3); drawEmojiSprite(ctx, '💰', 11*extra.weaponScale); ctx.restore();
    ctx.fillStyle = '#f3e9d2';
    ctx.beginPath(); ctx.ellipse(0, -29.5, 7.5, 3.6, 0, 0, Math.PI*2); ctx.fill();
    if(!lowGfx){ ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, -31, 1.3, 0, Math.PI*2); ctx.fill(); }
  } else if(type === 'GLAIVE'){
    // GLAIVE-FIGURE-01: a heavy two-handed launcher with a curved blade loaded at the muzzle
    const gunAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const gripHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.85, skinMain, -0.1);
    drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*1.05, skinMain, 0.06);
    const barrelLen = weaponLenFromScale(GLAIVE_BARREL_MIN_LEN, GLAIVE_BARREL_MAX_LEN, extra.weaponScale);
    const dirX = Math.cos(gunAngle), dirY = Math.sin(gunAngle);
    const tipX = gripHand.handX + dirX*barrelLen, tipY = gripHand.handY + dirY*barrelLen;
    markWeapon(gripHand.handX, gripHand.handY, gunAngle, barrelLen);
    ctx.strokeStyle = '#5d6168'; ctx.lineWidth = 4.2 * (0.8 + extra.weaponThickness*0.2); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(gripHand.handX - dirX*3, gripHand.handY - dirY*3); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = level >= 3 ? '#bdeaff' : '#c9ced6'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(tipX, tipY, 4.5, gunAngle - Math.PI*0.55, gunAngle + Math.PI*0.55); ctx.stroke();
  } else if(type === 'CRAZY_CHEF'){
    // CHEF-FIGURE-01: a chef's toque and a kitchen knife ready to throw
    const knifeAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen, skinMain, -0.2);
    markWeapon(hand.handX, hand.handY, knifeAngle, CHEF_KNIFE_REACH);
    ctx.save(); ctx.translate(hand.handX, hand.handY); ctx.rotate(knifeAngle); ctx.translate(5, 0); drawAmmoShape(ctx, 'KNIFE'); ctx.restore();
    ctx.fillStyle = '#fafafa'; ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 0.8;
    ctx.fillRect(-5, -34, 10, 4); ctx.strokeRect(-5, -34, 10, 4);
    ctx.beginPath(); ctx.arc(-3, -36, 3.4, 0, Math.PI*2); ctx.arc(3, -36, 3.4, 0, Math.PI*2); ctx.arc(0, -38.5, 3.8, 0, Math.PI*2); ctx.fill();
  } else if(type === 'BLOW_GUNNER'){
    const mouthAngle = extra.hasTarget ? angle : IDLE_GUN_ANGLE;
    const mouthX = 0, mouthY = -21;
    const hand = drawArmAndHand(ctx, mouthX, mouthY, mouthAngle, armLen*0.7, skinMain, -0.3);
    const tipX = hand.handX + Math.cos(mouthAngle)*14*extra.weaponScale, tipY = hand.handY + Math.sin(mouthAngle)*14*extra.weaponScale;
    markWeapon(hand.handX, hand.handY, mouthAngle, 14*extra.weaponScale);
    ctx.strokeStyle = '#8fa8b3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hand.handX,hand.handY); ctx.lineTo(tipX,tipY); ctx.stroke();
    if(!lowGfx){
      const wispT = (gameTime % 900) / 900;
      ctx.fillStyle = 'rgba(200,232,240,0.35)';
      ctx.beginPath(); ctx.arc(tipX, tipY - wispT*4, 2.2 + wispT*1.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,232,240,0.22)';
      ctx.beginPath(); ctx.arc(tipX+1.5, tipY - wispT*6 - 2, 1.8 + wispT*1.1, 0, Math.PI*2); ctx.fill();
    }
  }

  if(level >= 2){
    ctx.save();
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(2, -10);
    ctx.lineTo(4.5, 2);
    ctx.lineTo(-4.5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if(level >= 3){
    ctx.fillStyle = '#c7ccd1';
    ctx.beginPath(); ctx.ellipse(0,-24, 8/build.scaleX, 8/build.scaleY, 0, Math.PI, 0); ctx.fill();
  }
  if(bloodPoseOwner) drawStickmanBloodStains(ctx,bloodPoseOwner,7/build.scaleX,7/build.scaleY);
  bloodPoseOwner=priorBloodOwner;
  if(extra && extra.trailStrength > 0 && !extra.shadowPass && !lowGfx) drawMeleeSmear(ctx, extra);
  if(extra && extra.enchantElement && !extra.shadowPass) drawWeaponEnchant(ctx, extra.enchantElement, angle);
  ctx.restore();
}
/* =========================================================
   TOWER CLASS
   ========================================================= */
const MIN_ATTACK_COOLDOWN_MS = 80, NINJA_MIN_COOLDOWN_MS = 45;
// The muzzle sits at the hand plus the drawn weapon length, so a shot leaves from the tip the renderer draws.
const MUZZLE_WEAPON_REACH = Object.freeze({
  MAGE: { armShare: 1, minLen: 14, maxLen: 22 }, SNAPCASTER: { armShare: 1, minLen: 14, maxLen: 22 }, GATLING: { armShare: 1, minLen: 14, maxLen: 22 },
  BOMBER: { armShare: 1, minLen: 12, maxLen: 19 }, SQUIRTGUN: { armShare: 0.9, minLen: 11, maxLen: 17 }, BLOW_GUNNER: { armShare: 0.85, minLen: 9, maxLen: 14 },
  CAT_SNAPPER: { armShare: 1, minLen: 10, maxLen: 16 }, NECROMANCER: { armShare: 1, minLen: 10, maxLen: 15 },
  PROTON: { armShare: 1, minLen: 10, maxLen: 15 }, DARK_MATTER: { armShare: 1, minLen: 10, maxLen: 15 }, QUASAR: { armShare: 1, minLen: 10, maxLen: 15 },
  GLAIVE: { armShare: 0.85, minLen: GLAIVE_BARREL_MIN_LEN, maxLen: GLAIVE_BARREL_MAX_LEN }, CRAZY_CHEF: { armShare: 1, minLen: CHEF_KNIFE_REACH, maxLen: CHEF_KNIFE_REACH },
  MERCHANT: { armShare: 1, minLen: MERCHANT_BAG_REACH, maxLen: MERCHANT_BAG_REACH }
});
const MAGIC_MISSILE_TYPES = new Set(['MAGE', 'SNAPCASTER', 'NECROMANCER', 'PROTON', 'DARK_MATTER', 'QUASAR']);
const PROJECTILE_COLOR_BY_TOWER = Object.freeze({
  MAGE: '#7dd3fc', SNAPCASTER: '#7dd3fc', BOMBER: '#3a2a1a', BLOWDART: '#7cb518', CAT_SNAPPER: '#2a2a2a', NECROMANCER: '#5a2d82',
  BLOW_GUNNER: '#c8e8f0', SQUIRTGUN: '#8bd62f', PROTON: '#a855f7', DARK_MATTER: '#1a1a2e', QUASAR: '#fdf6d8'
});
const TANK_DAMAGE_PER_XP = 10;
const HIT_FLINCH_MS = 180, HIT_FLINCH_PX = 3.5;
const DIRECT_DAMAGE_SHARE = 0.8; // TOWER-BUFF-01 (was 0.7, COMBAT-BALANCE-181): every stickman hits about 14% harder
const RANGED_SHOT_SOUND = Object.freeze({
  ARCHER: 'shot_archer', SNIPER: 'shot_sniper', GATLING: 'shot_gatling',
  BLOWDART: 'shot_blowdart', GUNALINDER: 'shot_gunalinder', SQUIRTGUN: 'shot_squirtgun',
  MARKSMAN: 'shot_rifle', CAT_SNAPPER: 'shot_cat', BLOW_GUNNER: 'shot_blowdart', NINJA: 'shot_star', GLAIVE: 'shot_glaive', MERCHANT: 'shot_coins',
  CRAZY_CHEF: 'shot_knife', BOMBER: 'shot_bomber', MAGE: 'cast_mage', SNAPCASTER: 'cast_mage', NECROMANCER: 'cast_mage', PROTON: 'cast_mage', DARK_MATTER: 'cast_mage', QUASAR: 'cast_mage'
});
const NINJA_SHOT_SOUND_GAP_MS = 140;
// A shot rolled as a miss flies past the target by at least 20 px, to a random side.
function deflectProjectileAsMiss(projectile, tower, aimAngle, targetRadius, distanceToTarget){
  const missOffsetPx = Math.max(targetRadius*1.8, 20) * (Math.random() < 0.5 ? -1 : 1);
  const missAngle = aimAngle + Math.atan2(missOffsetPx, distanceToTarget);
  projectile.vx = Math.cos(missAngle)*tower.projectileSpeed;
  projectile.vy = Math.sin(missAngle)*tower.projectileSpeed;
  projectile.angle = missAngle;
  projectile.isGuaranteedMiss = true;
  projectile.missRevealAt = gameTime + (distanceToTarget/tower.projectileSpeed)*1000;
  if(tower.telemetry) tower.telemetry.misses++;
}
const TOWER_OVERRUN_MS = 4000, TOWER_OVERRUN_WAVES = 3, TOWER_RECOVERY_HP_FRACTION = 0.3;
const MELEE_SWING_TYPES = new Set(['SWORDSMAN', 'SPEARMAN', 'HAMMERMAN', 'PALADIN', 'BERSERKER', 'LANCER']);
const EXACT_INTERCEPT_TYPES = new Set(['ARCHER', 'MARKSMAN', 'SNIPER', 'BLOWDART', 'SQUIRTGUN', 'BLOW_GUNNER']);
const GLOBAL_ATTACK_SLOW_MULT = 1.2, TIER_DAMAGE_GROWTH = 0.45; // only 45% of the raw tier-to-tier damage jump carries through
function towerCountOnBoard(type){
  let n = 0;
  for(const t of towerPool) if(t.active && t.type === type) n++;
  return n;
}
function towerDisplayName(tower){ return (tower.legendaryName || tower.def.name) + ' ' + tower.def.icon; }
function isPlainStuckArrow(a){ const kind = a.kind; return kind !== 'AXE' && kind !== 'DART' && kind !== 'BULLET' && kind !== 'PELLET' && kind !== 'KNIFE' && kind !== 'BLADE'; }
class Tower{
  constructor(){ this.active = false; }
  // MOVE-WALKS-01: when a stickman is moved to another tile he walks there with the walking animation instead of teleporting.
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
    this.swingArc = type === 'BERSERKER' ? Math.PI * 1.1 : type === 'SPEARMAN' ? Math.PI * SPEARMAN_SWEEP_ARC_FRACTION : Math.PI * 0.85; // SPEARMAN-SWEEP-01
    this.swingDuration = type === 'SPEARMAN' ? 550 : 300;
    this.slowFactor = 0; this.slowDuration = 0; this.splashRadius = 0;
    this.meleeRange = 0; this.meleeDamage = 0; this.meleeCooldown = 0;
    this.stunMs = 0; // HAMMERMAN only, from tier config
    this.isDrawing = false; this.drawStart = 0; this.drawProgress = 0; this.baseDrawTime = 0; // ARCHER only
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
    this.critLuckBalance = 0; this.missLuckBalance = 0; // PRD-ROLLS-01: expected minus actual crits and misses
    this.nextStreakTier = 0; // index into KILLSTREAK_TIERS, so each tier only fires once per streak
    this.isLegendary = false;
    this.legendaryName = '';
    this.hp = this.maxHp;
    this.baseShieldPct = type === 'HAMMERMAN' ? 0.35 : 0;
    this.shieldPct = this.baseShieldPct;
    this.disabledUntil = 0;   // can't attack while overrun (hp hit 0)
    this.disabledWavesLeft = 0; // reaching 0 HP locks the tower out for the next TOWER_OVERRUN_WAVES waves
    this.telemetry = isStructureType(this.type) ? null : { shotsFired: 0, misses: 0, hitsLanded: 0, killsSecured: 0 }; // damage itself reuses the existing lifetimeDamage/waveDamage fields rather than a duplicate counter
    this.burnUntil = 0;       // FIRE breakaway status
    this.burnTickTimer = 0;
    this.iceSlowUntil = 0;    // ICE breakaway status — halves effective attack speed
    this.statusLabelTimer = 0; // periodic reminder text for active status effects
    // WC3-hero-style distributable stats: STR = damage, DEX = attack speed, INT = range
    this.foodConstitution = 0;
    this.str = 0; this.dex = 0; this.int = 0; this.statPoints = 0; this.autoSpend = false;
    this.elementState = null;
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
    this.lastKillTime = -1e9; // KILL-READY-01: when this stickman last secured a kill
    this.lastTargetTime = 0;
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
    if(!isStructureType(type)) everBuiltFighter = true;
    this.applyTierStats();
  }
  get def(){ return CONFIG.TOWERS[this.type]; }
  minAttackCooldownMs(){ return this.type === 'NINJA' ? NINJA_MIN_COOLDOWN_MS : MIN_ATTACK_COOLDOWN_MS; }
  // STR raises stickman mass to 1.5x at the stat cap; appearance follows sqrt(mass).
  get weight(){ return 1 + clampNum(this.str || 0, 0, 500) / 1000; }
  rollSkinTones(){
    const jobColor = JOB_COLORS[this.type] || { main:'hsl(0,0%,80%)', shade:'hsl(0,0%,58%)' };
    const skinL = 35 + Math.random()*53;  // fully independent uniform roll, 35-88 — not anchored to this class's own preset skin lightness
    const pantsL = 28 + Math.random()*64;
    this.skinMain = colorAtLightness(jobColor.main, skinL);
    this.skinShade = colorAtLightness(jobColor.shade, pantsL);
    this.faceColor = colorAtLightness(jobColor.main, clampNum(skinL - (8 + Math.random()*2), 25, 80)); // always 8-10% darker than THIS tower's own skinMain — the one non-independent layer, by design
    this.mustacheColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];
  }
  rollBuild(){
    const base = JOB_BUILD[this.type] || { scaleX:1, scaleY:1 };
    const weightJitter = (Math.random()*2 - 1) * 0.14; // ±14% breadth/weight
    const heightJitter = (Math.random()*2 - 1) * 0.14; // ±14% height, independent of weight so proportions genuinely vary, not just uniform scaling
    this.buildScaleX = clampNum(base.scaleX * (1 + weightJitter), 0.65, 1.55);
    this.buildScaleY = clampNum(base.scaleY * (1 + heightJitter), 0.70, 1.40);
  }
  applyTierStats(){
    this.burstCount = 0; this.burstDelay = 0;
    this.splashRadius = 0; this.slowFactor = 0; this.slowDuration = 0;
    Object.assign(this, this.def.tiers[Math.min(this.level, this.def.tiers.length) - 1]); // promotions past the authored tier table keep the top tier's baseline; growth comes from promotion stat rolls
    // GLOBAL-ATTACK-SLOW-01: every tier cooldown is 20% slower, applied once where tier values land on the instance.
    this.cooldown = applyClassCooldownBalance(this.type, Math.round(this.cooldown * GLOBAL_ATTACK_SLOW_MULT));
    if(this.meleeCooldown) this.meleeCooldown = Math.round(this.meleeCooldown * GLOBAL_ATTACK_SLOW_MULT);
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
  recomputeStats(){
    if(this.type === 'BARRICADE'){ this.maxHp = 10; return; }
    if(isProducerType(this.type)){ this.maxHp = PRODUCER_DEFS[this.type].hp[this.level - 1] || PRODUCER_DEFS[this.type].hp[0]; this.baseMaxHp = this.maxHp; this.hp = Math.min(this.hp, this.maxHp); return; }
    let itemStr = 0, itemDex = 0, itemInt = 0, itemArmor = 0, rangeItemMult = 1;
    this.wearsFancyHat = false; this.wearsRunningShoes = false;
    for(const item of this.equippedItems){
      itemStr += item.str || 0; itemDex += item.dex || 0; itemInt += item.int || 0; itemArmor += item.armor || 0;
      rangeItemMult *= 1 + (item.rangeBonus || 0);
      if(item.id === 'FANCY_HAT') this.wearsFancyHat = true;
      if(item.extraMove) this.wearsRunningShoes = true;
    }
    this.shieldPct = Math.min(0.9, this.baseShieldPct + itemArmor*0.01);
    const heroBonus = this.isHero ? HERO_BONUS_STAT : 0;
    const globalStr = (globalPassiveCounts.GLOBAL_STR || 0)+(runBoonCounts.GLOBAL_STR || 0);
    const globalDex = (globalPassiveCounts.GLOBAL_DEX || 0)+(runBoonCounts.GLOBAL_DEX || 0);
    const globalInt = (globalPassiveCounts.GLOBAL_INT || 0)+(runBoonCounts.GLOBAL_INT || 0);
    const totalStr = this.str + itemStr + heroBonus + globalStr;
    const totalDex = this.dex + itemDex + heroBonus + globalDex;
    const totalInt = this.int + itemInt + heroBonus + globalInt;
    const archetype = CLASS_ARCHETYPE[this.type];
    const strEff = archetype === 'WARRIOR' ? totalStr * PREFERRED_STAT_MULT : totalStr;
    const dexEff = archetype === 'ARCHER' ? totalDex * PREFERRED_STAT_MULT : totalDex;
    const intEff = archetype === 'MAGE' ? totalInt * PREFERRED_STAT_MULT : totalInt;
    const strPref = archetype === 'WARRIOR' ? PREFERRED_STAT_MULT : 1, dexPref = archetype === 'ARCHER' ? PREFERRED_STAT_MULT : 1, intPref = archetype === 'MAGE' ? PREFERRED_STAT_MULT : 1;
    const strPoints = statEffectPoints((this.str + heroBonus + globalStr) * strPref, itemStr * strPref), dexPoints = statEffectPoints((this.dex + heroBonus + globalDex) * dexPref, itemDex * dexPref), intPoints = statEffectPoints((this.int + heroBonus + globalInt) * intPref, itemInt * intPref);
    const strMult = 1 + PRIMARY_DAMAGE_PER_POINT * strPoints;
    // DEX attack cadence uses the capped late-building curve below.
    const dexMult = attackRateFromDex(totalDex);
    const intRangeFraction = Math.min(1, intPoints / STAT_EFFECT_CAP); // reaches the class range cap exactly at 500 INT
    // CHEF-STRENGTH-01: the Crazy Chef is an Archer whose thrown knives scale with Strength, as her description and tip promise.
    const damageScalesWithStr = archetype === 'WARRIOR' || this.type === 'CRAZY_CHEF';
    const dexDamageMult = 1 + PRIMARY_DAMAGE_PER_POINT * dexPoints;
    const intDamageMult = 1 + PRIMARY_DAMAGE_PER_POINT * intPoints;
    const primaryDamageMult = damageScalesWithStr ? strMult : archetype === 'ARCHER' ? dexDamageMult : archetype === 'MAGE' ? intDamageMult : 1;
    this.damage = Math.max(1, Math.round(this.baseDamage * primaryDamageMult * DIRECT_DAMAGE_SHARE));
    this.primaryStatEff = damageScalesWithStr ? strEff : archetype === 'ARCHER' ? dexEff : archetype === 'MAGE' ? intEff : 0;
    if(!this.isVeteran && !statPreviewRunning && UNLOCKED_CLASS_TYPES.includes(this.type) && this.primaryStatEff >= 250){
      this.isVeteran = true;
      spawnFloatingText(this.x, this.y - 40, '⭐ Veteran!', '#ffd700');
    }
    if(this.isVeteran) this.damage = Math.round(this.damage * 1.1);
    this.cooldown = Math.max(this.minAttackCooldownMs(), Math.round(this.baseCooldown / dexMult));
    if(this.type === 'CLERIC' && this.baseHealAmount) this.healAmount = Math.round(this.baseHealAmount * (1 + intPoints / STAT_EFFECT_CAP));
    // MELEE-RANGE-BALANCE-01: every class, Cleric included, grows toward its range cap with INT.
    const cap = RANGE_CAPS[this.type] || this.baseRange * 2;
    this.range = interpolateRangeByInt(this.baseRange, cap, intRangeFraction) * rangeItemMult;
    if(this.baseMeleeDamage) this.meleeDamage = Math.max(1, Math.round(this.baseMeleeDamage * primaryDamageMult * DIRECT_DAMAGE_SHARE));
    if(this.baseMeleeCooldown) this.meleeCooldown = Math.max(MIN_ATTACK_COOLDOWN_MS, Math.round(this.baseMeleeCooldown / dexMult));
    if(this.baseMeleeRange){
      const cap = RANGE_CAPS[this.type] || this.baseMeleeRange * 2;
      this.meleeRange = interpolateRangeByInt(this.baseMeleeRange, cap, intRangeFraction) * rangeItemMult;
    }
    if(this.baseDrawTime) this.drawTime = Math.max(120, Math.round(this.baseDrawTime / dexMult));
    if(this.basePoisonDamage) this.poisonDamage = Math.round(this.basePoisonDamage * (1 + intPoints / STAT_EFFECT_CAP));
    const strForHp = EARLY_HP_CAP_TYPES.includes(this.type) ? Math.min(strPoints, EARLY_STAT_CAP_POINTS) : strPoints;
    const strHpMult = 1 + strForHp * 2 / STAT_EFFECT_CAP; // up to 3x max HP at 500 STR — STR is the late-wave survivability stat
    const hpStatBase = HP_STAT_BASE[archetype] || HP_STAT_BASE.MAGE;
    const hpStatRate = HP_STAT_RATE[archetype] || HP_STAT_RATE.MAGE;
    this.hpStat = Math.min(STAT_EFFECT_CAP,hpStatBase + strForHp * hpStatRate * 0.5 + (this.foodConstitution || 0)); // FOOD-CONSTITUTION-01
    const hpStatBonus = Math.round(this.hpStat * 10);
    const newMaxHp = Math.round(this.baseMaxHp * strHpMult * this.legendaryHpMult) + hpStatBonus;
    const hpDelta = newMaxHp - this.maxHp;
    this.maxHp = newMaxHp;
    if(hpDelta > 0) this.hp += hpDelta; // gaining max HP heals by the increase, rather than being wasted or forcing a full heal
    const baseMissChance = BASE_MISS_CHANCE_BY_ARCHETYPE[archetype] || BASE_MISS_CHANCE_BY_ARCHETYPE.WARRIOR; // per-archetype baseline (see BASE_MISS_CHANCE_BY_ARCHETYPE)
    this.missChance = computeMissChance(baseMissChance, dexEff); // front-loaded curve, see computeMissChance()
    this.critChance = Math.min(0.5, 0.025 + diminishingStatValue(dexEff, 0.005));
    this.critMult = Math.min(3, 1.2 + diminishingStatValue(intEff, 0.01));

    if(this.rageUntil > gameTime){
      this.damage = Math.round(this.damage * STICKMAN_RAGE_DAMAGE);
      this.cooldown = Math.max(this.minAttackCooldownMs(), Math.round(this.cooldown / STICKMAN_RAGE_SPEED));
      if(this.meleeDamage) this.meleeDamage = Math.round(this.meleeDamage * STICKMAN_RAGE_DAMAGE);
      if(this.meleeCooldown) this.meleeCooldown = Math.max(MIN_ATTACK_COOLDOWN_MS, Math.round(this.meleeCooldown / STICKMAN_RAGE_SPEED));
    }
    const roundBuffs = this.roundBuffs;
    if(roundBuffs){
      this.damage = Math.round(this.damage * roundBuffs.damage);
      this.cooldown = Math.max(this.minAttackCooldownMs(), Math.round(this.cooldown / roundBuffs.speed));
      this.range = Math.round(this.range * roundBuffs.range);
      if(this.meleeDamage) this.meleeDamage = Math.round(this.meleeDamage * roundBuffs.damage);
      if(this.meleeCooldown) this.meleeCooldown = Math.max(MIN_ATTACK_COOLDOWN_MS, Math.round(this.meleeCooldown / roundBuffs.speed));
      if(this.meleeRange) this.meleeRange = Math.round(this.meleeRange * roundBuffs.range);
    }
    if(this.type === 'HACKER'){ this.maxHp = HACKER_MAX_HP; this.hp = Math.min(this.hp, this.maxHp); }
  }
  // Purchase and equip a type-matching shop item with gold (starter items have cost 0, used at creation).
  buyItem(def){
    if(this.equippedItems.length >= MAX_ITEM_SLOTS) return false;
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
  receiveItem(def){
    if(def && def.isGoldBag) return false; // GOLD-BAG-COIN-BURST-01
    explainItemKindOnce(def);
    if(isStructureType(this.type) && !isVaultType(this.type)) return false; // BARRICADE-NO-INVENTORY-01
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
    if(!TRAINED_STATS.includes(stat)) return false;
    if(this[stat] >= STAT_EFFECT_CAP) return false;              // per-stat trained cap (500)
    if(getTrainedStatTotal(this) >= STAT_TOTAL_CAP) return false; // combined trained cap (1000)
    this[stat]++;
    this.statPoints--;
    logGameEvent(itemHolderLabel(this) + ' spent a point on ' + stat.toUpperCase() + ' (now ' + this[stat] + ', ' + this.statPoints + ' left to spend)');
    this.recomputeStats();
    this.checkClassUnlocks();
    refreshProgressionMilestones(this);
    return true;
  }
  checkClassUnlocks(){
    if(BASE_ATTUNABLE_TYPES.includes(this.type)){
      this.checkAttunementAndSpecialization();
      return;
    }
    this.infuseElements();
    const statUnlockMap = CLASS_STAT_UNLOCKS[this.type];
    if(!statUnlockMap) return; // not a base class, or has no further tier to unlock
    let targetType = null;
    if(statUnlockMap.str && this.str >= statUnlockMap.str.threshold) targetType = statUnlockMap.str.target;
    else if(statUnlockMap.dex && this.dex >= statUnlockMap.dex.threshold) targetType = statUnlockMap.dex.target;
    else if(statUnlockMap.int && this.int >= statUnlockMap.int.threshold) targetType = statUnlockMap.int.target;
    if(targetType) unlockTowerTypeBuild(targetType);
  }
  // ELEMENT-INFUSION-01: every stickman, not only the three starting classes, can be infused at 250 in a stat
  // and mixes a second element at 250 in another stat. Unlocked classes use this; base classes also unlock branches above.
  // Drops an attunement whose stat fell below the threshold, then attunes to the first stat (STR, DEX, INT) at the threshold; true when newly attuned.
  attuneToReadyStat(){
    if(this.attunement && (this[ATTUNEMENT_STAT_BY_ELEMENT[this.attunement]] || 0) < ELEMENT_INFUSE_THRESHOLD) this.attunement = null;
    if(this.attunement) return false;
    const readyStat = TRAINED_STATS.find(stat => this[stat] >= ELEMENT_INFUSE_THRESHOLD);
    if(!readyStat) return false;
    this.attunement = ATTUNEMENTS[readyStat];
    return true;
  }
  infuseElements(){
    if(isStructureType(this.type)) return;
    if(this.attuneToReadyStat()){
      spawnFloatingText(this.x, this.y - 40, ATTUNEMENT_ICON[this.attunement] + ' Infused!', '#ffd700');
      playSound('levelup');
    }
    refreshElementState(this);
  }
  checkAttunementAndSpecialization(){
    if(CLASS_ARCHETYPE[this.type] === 'ARCHER' && this.str >= CRAZY_CHEF_STR_THRESHOLD) unlockTowerTypeBuild('CRAZY_CHEF'); // an Archer who trains Strength learns to throw knives
    if(this.attuneToReadyStat()){
      const target = SPECIALIZATIONS[this.type] && SPECIALIZATIONS[this.type][this.attunement];
      const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[this.attunement];
      const remaining = Math.max(0, specializationThresholdFor(target) - (this[attunedStat]||0));
      const suffix = target ? (' — ' + remaining + ' more ' + attunedStat.toUpperCase() + ' to ' + CONFIG.TOWERS[target].name) : '';
      spawnFloatingText(this.x, this.y - 40, ATTUNEMENT_ICON[this.attunement] + ' Attuned!' + suffix, '#ffd700');
      playSound('levelup');
    }
    if(this.type === 'ARCHER' && this.dex >= SPECIALIZATION_THRESHOLD) unlockTowerTypeBuild('CAT_SNAPPER');
    refreshElementState(this);
    if(!this.attunement) return;
    const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[this.attunement];
    const specializationTarget = SPECIALIZATIONS[this.type] && SPECIALIZATIONS[this.type][this.attunement];
    if(specializationTarget && this[attunedStat] >= specializationThresholdFor(specializationTarget)) unlockTowerTypeBuild(specializationTarget);
    for(const other of Object.values(ATTUNEMENTS)){
      if(other === this.attunement) continue;
      const otherStat = ATTUNEMENT_STAT_BY_ELEMENT[other];
      if(this[otherStat] < SPECIALIZATION_THRESHOLD) continue;
      const pairKey = [this.attunement, other].sort().join('+'); // order-independent — locking Fire first or Ice first both reach 'FIRE+ICE'
      const hybridTarget = HYBRID_SPECIALIZATIONS[this.type] && HYBRID_SPECIALIZATIONS[this.type][pairKey];
      if(hybridTarget) unlockTowerTypeBuild(hybridTarget);
    }
  }
  // NO-EVOLVE-IN-PLACE-01: a stat threshold unlocks a new class in the Build tray; the tower that reached it keeps its own class.
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
  promotionCapacity(){ return Math.max(0, STAT_TOTAL_CAP - getTrainedStatTotal(this) - this.statPoints); }
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
    if(this.type === 'BARRICADE') return false;
    if(!this.canUpgrade()) return false;
    const cost = this.nextUpgradeCost();
    if(gold < cost) return false;
    gold -= cost; this.totalSpent += cost; this.level++;
    const archetype = CLASS_ARCHETYPE[this.type];
    const favoredStat = archetype === 'WARRIOR' ? 'str' : archetype === 'ARCHER' ? 'dex' : archetype === 'MAGE' ? 'int' : null;
    const promotionDice = distributePromotionDice(PROMOTION_PASSIVE_ROLLS, favoredStat);
    const rolled = { str: rollPromotionDice(promotionDice.str), dex: rollPromotionDice(promotionDice.dex), int: rollPromotionDice(promotionDice.int) };
    const talentStat = TRAINED_STATS[Math.floor(Math.random()*TRAINED_STATS.length)];
    const talentBonus = rollPromotionDice(PROMOTION_TALENT_DICE_MIN + Math.floor(Math.random()*(PROMOTION_TALENT_DICE_MAX - PROMOTION_TALENT_DICE_MIN + 1)));
    rolled[talentStat] += talentBonus;
    const granted = { str:0, dex:0, int:0 };
    for(const stat of TRAINED_STATS){
      for(let i = 0; i < rolled[stat]; i++){
        if(this[stat] >= STAT_EFFECT_CAP || getTrainedStatTotal(this) >= STAT_TOTAL_CAP) break;
        this[stat]++; granted[stat]++;
      }
    }
    const spendablePoints = Math.min(this.promotionCapacity(), rollPromotionDice(PROMOTION_SPENDABLE_ROLLS));
    this.statPoints += spendablePoints;
    if(this.autoSpend) autoSpendStatPoints(this);
    spawnFloatingText(this.x, this.y - 52, '💪+' + granted.str + ' 🏃+' + granted.dex + ' 🧠+' + granted.int, '#ffd700');
    if(spendablePoints) spawnFloatingText(this.x, this.y - 68, '+' + spendablePoints + ' SPENDABLE', '#7dd3fc');
    spawnFloatingText(this.x, this.y - 84, 'Talent: ' + PROMOTION_TALENT_LABELS[talentStat] + ' +' + talentBonus, '#ffb74d');
    refreshProgressionMilestones(this);
    this.rollSkinTones(); // re-rolls skin/face shade so leveling up is visibly reflected in appearance, not just stats
    this.checkClassUnlocks();
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
    const current = this.target; // AIM-STEADY-01: stay on the attacker already being fought instead of flipping between a crowd of attackers every tick
    if(current && current.active && !current.deathResolved && current.hp > 0 && current.attackBumpTarget === this && Math.hypot(current.x-this.x, current.y-this.y) <= this.targetingRange) return;
    let attacker = null, attackerDistance = Infinity;
    for(const enemy of nearby){
      if(!enemy.active || enemy.deathResolved || enemy.hp<=0 || enemy.attackBumpTarget !== this) continue;
      const distance = Math.hypot(enemy.x-this.x, enemy.y-this.y);
      if(distance <= this.targetingRange && distance < attackerDistance){ attacker = enemy; attackerDistance = distance; }
    }
    if(attacker){ this.target = attacker; return; }
    // TARGET-MARK-01: the marked target (see setMarkedTarget()) always wins while in range and
    // after immediate attackers, ahead of ordinary target ranking.
    if(markedTargetEnemy && markedTargetEnemy.active && !markedTargetEnemy.escaped){
      const markedDistance = Math.hypot(markedTargetEnemy.x-this.x, markedTargetEnemy.y-this.y);
      if(markedDistance <= this.targetingRange){
        this.target = markedTargetEnemy;
        return;
      }
    }
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
    const isMeleeTower = MELEE_SWING_TYPES.has(this.type) || this.type === 'AXEMAN';
    let skipScan = false;
    if(!isMeleeTower){
      if(this.type === 'CLERIC' || this.type === 'POPE'){
        skipScan = this.cooldownTimer > 0;
      } else if(this.cooldownTimer > 0 && this.target && this.target.active){
        const dCur = Math.hypot(this.target.x-this.x, this.target.y-this.y);
        if(dCur <= this.targetingRange) skipScan = true;
        else this.target = null;
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
    const recentlyEngaged = this.cooldownTimer > 0 || (gameTime - (this.lastTargetTime||0)) < 500;
    if(this.target){
      if(EXACT_INTERCEPT_TYPES.has(this.type)){
        // Straight-flying shots aim at the exact launch-time intercept; mid-flight correction covers a target that turns after launch.
        this.angle = calculateLeadIntercept(this.x, this.y, this.projectileSpeed || 1, this.target.x, this.target.y, this.target.vx, this.target.vy);
      } else {
        const dx = this.target.x-this.x, dy = this.target.y-this.y;
        const dist = Math.hypot(dx,dy) || 0.0001;
        const timeToImpact = this.projectileSpeed ? Math.min(dist / this.projectileSpeed, MAX_LEAD_PREDICT_TIME) : 0;
        const predX = this.target.x + this.target.vx*timeToImpact;
        const predY = this.target.y + this.target.vy*timeToImpact;
        this.angle = Math.atan2(predY-this.y, predX-this.x);
      }
    } else if(((usesRangedRestPose(this) && !this.target) || (!recentlyEngaged && this.type !== 'MAGE')) && !(gameTime - this.lastKillTime < POST_KILL_READY_MS)){
      this.angle = this.type === 'ARCHER' ? ARCHER_IDLE_ANGLE : IDLE_WEAPON_ANGLE;
    } // else: keep whatever this.angle already was — don't snap to idle mid-cooldown or during the grace window
    if(MELEE_SWING_TYPES.has(this.type)) this.updateSwordsman(dt, nearby);
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
    // Cleric's smite is a direct holy hit, not a delayed poison effect. This makes its
    // anti-undead role legible on impact; it ignores armor but shares the attack miss roll.
    // applyDamage() adds HOLY_VS_UNDEAD_MULT, so the input is divided by it to land at exactly CLERIC_SMITE_MULT before variance and crits.
    const holyDamage = target.isUndead ? this.damage * (CLERIC_SMITE_MULT / HOLY_VS_UNDEAD_MULT) : this.damage;
    if(this.telemetry) this.telemetry.shotsFired++;
    const missed=rollDirectAttackMiss(this,target); // ALL-CLASS-MISS-01
    if(!missed) target.applyDamage(holyDamage,this,true,true,false,true,true);
    spawnHolyBeam(target.x+(missed ? target.radius*2 : 0),target.y,'#fff3c4');
    playSound('cast_cleric', this.x, undefined, this.y);
    this.cooldownTimer = this.cooldown;
  }
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
  // HACKER-01: when attacked the Hacker drops a smoke screen and goes stealth; enemies stop choosing him
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
    const reduced = Math.max(1, Math.round(amount * (1-(this.shieldPct||0))));
    this.hp = Math.max(0, this.hp - reduced);
    spawnFloatingText(this.x, this.y - 30, '-'+reduced, '#ff5555');
    lastCombatDamageAt = presentationTime;
    if(attacker && isFighterTower(this)){ spawnStickmanWound(this, attacker, reduced); this.maybeEnrage(); }
    if(attacker && isFighterTower(this)){ this.hitFlinchAt = presentationTime; this.hitFlinchAngle = Math.atan2(this.y - attacker.y, this.x - attacker.x); } // HIT-FLINCH-01
    if(isFighterTower(this) && this.type !== 'HACKER'){ // TANK-XP-01: a stickman learns from the punishment it takes, 1 XP per 10 damage
      this.tankDamageBank = (this.tankDamageBank || 0) + reduced;
      const tankXp = Math.floor(this.tankDamageBank / TANK_DAMAGE_PER_XP);
      if(tankXp > 0){ this.tankDamageBank -= tankXp * TANK_DAMAGE_PER_XP; gainTowerExp(this, tankXp); }
    }
    if(this.type === 'HACKER') this.goStealth();
    if(this.hp > 0){
      const hpFrac = this.hp / this.maxHp;
      if(hpFrac < 0.25) requestStickmanBark(this, BARK_TIER_VITAL, '🤕', BARK_LINES.CRITICAL, 1, BARK_CHANCE.CRITICAL);
      else if(hpFrac < 0.5) requestStickmanBark(this, BARK_TIER_IMPORTANT, '😟', BARK_LINES.HURT, 2, BARK_CHANCE.HURT);
    }
    if(isFighterTower(this) && (!this.lastHitChatterAt || gameTime - this.lastHitChatterAt > 2500)){
      this.lastHitChatterAt = gameTime;
      playSound('chatter_short', this.x, { archetype: CLASS_ARCHETYPE[this.type], pitchBias: -40 }, this.y);
    }
    if(statusType === 'BURN') this.burnUntil = gameTime + 3000;
    if(statusType === 'ICE') this.iceSlowUntil = Math.max(this.iceSlowUntil, gameTime + 3000);
    if(this.hp <= 0 && this.disabledUntil <= gameTime){ this.becomeOverrun('attack'); return true; }
    return false;
  }
  // TOWER-OVERRUN-01: a stickman at 0 HP sits out the next TOWER_OVERRUN_WAVES waves and recovers with part of its health, whatever downed it.
  becomeOverrun(cause){
    this.disabledUntil = gameTime + TOWER_OVERRUN_MS;
    this.disabledWavesLeft = TOWER_OVERRUN_WAVES;
    reportTowerDowned(this, cause);
    maybeShowFirstTimeAlert(FIRST_TOWER_DOWN_SEEN_KEY, '⚠️ ' + (this.def ? this.def.name : this.type) + ' overrun. Recovers in a few rounds.', '#ff4444');
    this.hp = Math.round(this.maxHp * TOWER_RECOVERY_HP_FRACTION);
    this.killStreak = 0; this.nextStreakTier = 0;
    spawnFloatingText(this.x, this.y - 44, '⚠️ Overrun!', '#ff4444');
    playSound('lose');
    if(squadWipedOut() && gameState === 'PLAYING') endRunOnSquadWipe();
  }
  maybeEnrage(){ // STICKMAN-RAGE-01: a struck stickman has a small chance to fly into a rage
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
        if(this.hp <= 0 && this.disabledUntil <= gameTime) this.becomeOverrun('burn');
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
      }
    }
  }
  fireProjectile(){
    this.lastFireTime = gameTime;
    const angle = this.angle;
    const armLen = 13;
    const weaponScale = (this.baseRange && this.baseRange > 0) ? clampNum(this.range / this.baseRange, 1.0, 1.6) : 1;
    let localReach;
    const weaponReach = MUZZLE_WEAPON_REACH[this.type];
    if(this.type === 'ARCHER') localReach = armLen + 5 + 2; // bow arm at full draw: firing only happens then
    else if(this.type === 'BLOWDART') localReach = armLen*0.7 + 14*weaponScale; // short pipe at the mouth, the same formula the renderer uses
    else if(weaponReach) localReach = armLen*weaponReach.armShare + weaponLenFromScale(weaponReach.minLen, weaponReach.maxLen, weaponScale);
    else localReach = armLen + 10;
    const muzzleOffset = localReach * STICKMAN_SCALE;
    const bodyScaleY = this.buildScaleY || (JOB_BUILD[this.type] && JOB_BUILD[this.type].scaleY) || 1;
    const legendaryScale = this.isLegendary ? 1.1 : 1;
    const pivotBaseY = (this.type === 'BLOWDART' || this.type === 'BLOW_GUNNER') ? -21 : this.type === 'ARCHER' ? ARCHER_ARROW_PIVOT_Y : -13; // ARROW-HEIGHT-01
    const shoulderYWorld = pivotBaseY * STICKMAN_SCALE * bodyScaleY * legendaryScale;
    let spawnX = this.x + Math.cos(angle)*muzzleOffset;
    let spawnY = this.y + shoulderYWorld + Math.sin(angle)*muzzleOffset;
    if(this.type==='ARCHER'){ // ARROW-GRIP-01
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
    // CLOSE-SHOT-01: against an enemy closer than the muzzle reach, the shot spawns on the line to the target instead of beside or past it.
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
    // PROJECTILE-AIM-01: the muzzle sits above the tower centre, so flight direction is re-aimed from the spawn point; the weapon pose keeps the centre angle.
    const flightAngle = this.target ? Math.atan2(this.target.y - spawnY, this.target.x - spawnX) : angle;
    p.vx = Math.cos(flightAngle)*this.projectileSpeed;
    p.vy = Math.sin(flightAngle)*this.projectileSpeed;
    p.spawnTime = gameTime;
    p.maxFlightMs = Math.max(600, (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000 * 1.8);
    p.damage = this.damage;
    if(this.type === 'GLAIVE' && this.target && this.target.isHutBuilding) p.damage = Math.round(p.damage * 5);
    if(this.burstCount === 2 && this.burstShotsLeft < this.burstCount) p.damage = Math.round(p.damage * 0.25);
    p.angle = flightAngle; // PROJECTILE-AIM-01
    p.slowFactor = this.slowFactor || 0;
    p.slowDuration = this.slowDuration || 0;
    p.splashRadius = (this.splashRadius || 0) + (towerElement(this) === 'QUASAR' ? QUASAR_ELEMENT_SPLASH_RADIUS : 0);
    p.isAxe = false;
    p.ammo = PROJECTILE_AMMO_BY_TOWER[this.type] || 'ARROW';
    const arcFlightDistancePx = Math.hypot(this.target.x - spawnX, this.target.y - spawnY); // ARROW-LOOK-01
    p.arcSpawnTime = gameTime; p.arcFlightMs = (arcFlightDistancePx / this.projectileSpeed) * 1000; p.flightDistancePx = arcFlightDistancePx;
    p.arcPx = p.ammo === 'ARROW' ? Math.min(ARROW_ARC_MAX_PX, arcFlightDistancePx * ARROW_ARC_PER_PX) : 0;
    p.isMoneyBag = this.type === 'MERCHANT';
    if(p.isMoneyBag){
      p.axeSpawnTime = gameTime;
      p.axeFlightMs = (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000;
    }
    p.effectType = this.type === 'CAT_SNAPPER' ? 'CAT' : null;
    p.isMagicMissile = MAGIC_MISSILE_TYPES.has(this.type);
    p.sourceTower = this;
    p.poisonDamage = this.poisonDamage || 0;
    p.poisonDuration = this.poisonDuration || 0;
    p.acidDamage = this.acidDamage || 0; p.acidDuration = this.acidDuration || 0; p.acidSlow = this.acidSlow || 0; p.acidRadius = this.acidRadius || 0; // ACID-COAT-01
    p.elementKey = towerElement(this);
    p.elementColor = (ELEMENT_VISUALS[p.elementKey] || {}).color || null;
    p.color = PROJECTILE_COLOR_BY_TOWER[this.type] || '#f1c40f';
    p.trackedTarget = null; p.trackedId = undefined; p.isGuaranteedMiss = false; p.missRevealAt = 0; p.missRevealed = false;
    if(!p.splashRadius && this.target){
      p.trackedTarget = this.target; p.trackedId = this.target ? this.target.id : undefined;
      const willHit = !prdRollFires(attackMissChance(this.missChance, this.target), this, 'missLuckBalance');
      if(!willHit) deflectProjectileAsMiss(p, this, angle, this.target.radius, Math.hypot(this.target.x-spawnX, this.target.y-spawnY) || 1);
    }
    if(this.type !== 'NINJA' || gameTime - (this.ninjaSoundAt ?? -Infinity) >= NINJA_SHOT_SOUND_GAP_MS){
      playSound(RANGED_SHOT_SOUND[this.type] || 'shot_archer', this.x, undefined, this.y);
      if(this.type === 'NINJA') this.ninjaSoundAt = gameTime;
    }
    return true;
  }
  updateAxeman(dt, nearby){
    if(!this.target){ this.renderSwordAngle = IDLE_WEAPON_ANGLE; }
    if(this.target && !this.isSwinging && this.cooldownTimer <= 0){
      if(this.axeMode === 'MELEE'){
        this.isSwinging = true;
        this.swingStart = gameTime;
        this.hitSet.clear();
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
    const timeToImpact = Math.min(dist / this.projectileSpeed, MAX_LEAD_PREDICT_TIME);
    const predX = t.x + t.vx*timeToImpact;
    const predY = t.y + t.vy*timeToImpact;
    const angle = Math.atan2(predY-this.y, predX-this.x);
    const armLen = 13;
    const weaponScale = (this.baseRange && this.baseRange > 0) ? clampNum(this.range / this.baseRange, 1.0, 1.6) : 1;
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
    p.spawnTime = gameTime;
    p.maxFlightMs = Math.max(600, (Math.hypot(this.target.x-spawnX, this.target.y-spawnY) / this.projectileSpeed) * 1000 * 1.8);
    p.damage = this.damage;
    p.angle = angle;
    p.slowFactor = 0; p.slowDuration = 0; p.splashRadius = 0; p.poisonDamage = 0; p.poisonDuration = 0; p.acidDamage = 0;
    p.isAxe = true; p.spinAngle = 0; p.sourceTower = this; p.isMagicMissile = false;
    p.axeSpawnTime = gameTime;
    p.axeFlightMs = Math.max(200, timeToImpact*1000);
    p.effectType = null; // reset — see fireProjectile()'s identical reset for why this must be unconditional on every fire path
    p.color = '#9aa0a6';
    p.trackedTarget = t; p.trackedId = t ? t.id : undefined;
    const willHit = !prdRollFires(attackMissChance(this.missChance, t), this, 'missLuckBalance');
    p.isGuaranteedMiss = false; p.missRevealAt = 0; p.missRevealed = false;
    if(!willHit) deflectProjectileAsMiss(p, this, angle, t.radius, dist);
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
      this.hitSet.clear();
      this.baseAngle = this.angle;
      this.lastSwordAngle = this.baseAngle - this.swingArc/2;
      // TWOHANDED-RHYTHM-01
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
          this.swingStart2 = gameTime + this.swingDuration * DUAL_OFFHAND_DELAY_FRACTION; // DUAL-STAGGER-01
          this.hitSet2.clear();
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
  targetScore(e, distance){
    switch(this.targetMode){
      case 'FIRST': return e.traveled;
      case 'LAST': return -e.traveled; // TARGET-LAST-01
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
  visualSwingOffset(t){ // MELEE-SWING-01
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
  checkConeHits(nearby, prevA, currA, hitSet, damage, radius, stunMs, isHoly){
    damage = damage ?? this.damage;
    radius = radius ?? this.range;
    const lo = Math.min(prevA, currA), hi = Math.max(prevA, currA);
    let streakClaimed = false;
    if(hitSet.size >= MELEE_SWEEP_MAX_TARGETS) return;
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
      if(this.telemetry) this.telemetry.shotsFired++;
      if(prdRollFires(attackMissChance(this.missChance, e), this, 'missLuckBalance')){
        // HUT-PUSHBACK-01: only living enemies dodge a missed swing; camp buildings never slide.
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
  drawRageMark(ctx){ // RAGE-MARK-01: an anger vein above the head, with steam venting during a rage
    const pose = this.bloodPose;
    if(!pose) return;
    const markX = pose.x + 11*pose.sx, markY = pose.y - 38*pose.sy;
    const throb = 1 + 0.18*Math.abs(Math.sin(presentationTime / 140));
    ctx.save();
    ctx.translate(markX, markY); ctx.scale(throb, throb);
    ctx.strokeStyle = '#d61f1f'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for(let quadrant = 0; quadrant < 4; quadrant++){
      ctx.rotate(Math.PI/2);
      ctx.beginPath(); ctx.moveTo(1.4, -4.4); ctx.quadraticCurveTo(1.4, -1.4, 4.4, -1.4); ctx.stroke();
    }
    ctx.restore();
    if(this.rageUntil <= gameTime || graphicsQuality === 'low' || underHeavyVisualLoad) return;
    const headX = pose.x, headY = pose.y - 28*pose.sy;
    ctx.save();
    for(let puff = 0; puff < 2; puff++){
      const life = ((presentationTime + puff*350) % RAGE_STEAM_CYCLE_MS) / RAGE_STEAM_CYCLE_MS, side = puff ? 1 : -1;
      ctx.fillStyle = 'rgba(235,235,235,' + (0.75*(1 - life)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(headX + side*(7 + life*6)*pose.sx, headY - life*14*pose.sy, (2 + life*4)*pose.sx, 0, Math.PI*2); ctx.fill();
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
    this.drawElementSwingArc(ctx);
    if(this.type === 'BARRICADE'){
      // ENEMY-HEADBUTT-01: the attacking emoji carries the impact cue; no red damage disc.
      ctx.font = pxFont(28*STICKMAN_SCALE);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      drawEmojiGroundShadow(ctx,'🚧',this.x,this.y,28*STICKMAN_SCALE,'serif',1); // SHADOW-ALIGN-01: the mask uses the font the glyph is drawn with, so the foot lines up
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
    let lungeAmt = 0, swingProgress = 0;
    const usesSwingAngle = MELEE_SWING_TYPES.has(this.type) || this.type === 'AXEMAN';
    if(this.isSwinging && usesSwingAngle){
      const st = Math.min(1, (gameTime-this.swingStart)/this.swingDuration);
      lungeAmt = meleeLungePx(st) * (this.type === 'SPEARMAN' || this.type === 'LANCER' ? 0.5 : 1); // lean back in the wind-up, step into the strike, settle (MELEE-SWING-01)
      swingProgress = st;
    }
    let castProgress = 0;
    if(this.type === 'MAGE' || this.type === 'SNAPCASTER' || this.type === 'PROTON' || this.type === 'DARK_MATTER' || this.type === 'QUASAR'){
      const sinceFired = gameTime - this.lastFireTime;
      if(sinceFired < MAGE_CAST_RECOIL_MS) castProgress = 1 - sinceFired/MAGE_CAST_RECOIL_MS;
      lungeAmt = -mageRecoilKick(castProgress) * 3; // MAGE-RECOIL-01: the body is pushed back as the staff kicks
    }
    let throwProgress = 0;
    if(this.type === 'CAT_SNAPPER'){
      const sinceThrown = gameTime - this.lastFireTime;
      if(sinceThrown < 350) throwProgress = 1 - sinceThrown/350;
    }
    let chargeProgress = 0;
    if((this.type === 'MAGE' || this.type === 'SNAPCASTER' || (this.type === 'SWORDSMAN' && this.spec === 'TWOHANDER')) && this.cooldown > 0){
      chargeProgress = clampNum(1 - (Math.max(0, this.cooldownTimer - renderLeftoverMs()) / this.cooldown), 0, 1);
    }
    const headItemDef = this.equippedItems.find(it => it.headItem);
    const weaponScale = (this.baseRange && this.baseRange > 0) ? clampNum(this.range / this.baseRange, 1.0, 1.6) : 1;
    const weaponThickness = Math.min(1.8, 1 + diminishingStatValue(this.str, 0.025)); // STR: noticeably thicker blade/head, diminishing and capped
    const holdingAfterKill = gameTime - this.lastKillTime < POST_KILL_READY_MS; // KILL-READY-01: after a kill the weapon stays raised for a few seconds before the idle pose
    const restBlend = clampNum(((gameTime - Math.max(this.lastTargetTime||0, this.lastKillTime + POST_KILL_READY_MS - 2000)) - 2000) / 1500, 0, 1);
    const cheering = presentationTime < waveCheerUntil && !this.target && !this.isSwinging && !(this.disabledWavesLeft > 0) && isFighterTower(this); // WAVE-CHEER-01
    const hasTargetPose = !!this.target || holdingAfterKill || cheering || (!usesRangedRestPose(this) &&
      (this.cooldownTimer > 0 || (gameTime - (this.lastTargetTime||0)) < 500));
    const strSizeScale = Math.sqrt(this.weight);
    const isSpearType = this.type === 'LANCER';
    const swingTrail = (this.isSwinging && !isSpearType && swingProgress > 0.2 && swingProgress < 0.82 && this.baseAngle !== undefined && graphicsQuality !== 'low')
      ? { from: this.baseAngle + this.visualSwingOffset(Math.max(0, swingProgress - MELEE_SMEAR_SPAN_T)), to: this.baseAngle + this.visualSwingOffset(swingProgress), strength: swingProgress < 0.6 ? 1 : 1 - (swingProgress - 0.6) / 0.22 } : null;
    const extra = { trailFrom: swingTrail ? swingTrail.from : undefined, trailTo: swingTrail ? swingTrail.to : undefined, trailStrength: swingTrail ? swingTrail.strength : 0, thrustPx: isSpearType && this.isSwinging ? spearThrustPx(swingProgress) : 0, walkPhase: this.isWalking ? (this.walkPhase || 0) : undefined, skinMain: this.skinMain, skinShade: this.skinShade, faceColor: this.faceColor, buildScaleX: this.buildScaleX * strSizeScale, buildScaleY: this.buildScaleY * strSizeScale, lowGfx: graphicsQuality === 'low' || underHeavyVisualLoad, drawProgress: this.drawProgress, nockAmount: this.type === 'ARCHER' ? this.archerNockAmount() : undefined, lungeAmt, swingProgress, castProgress, chargeProgress, throwProgress, isLegendary: this.isLegendary, headItem: headItemDef ? headItemDef.headItem : null, hasTarget: hasTargetPose, weaponScale, weaponThickness, str: this.str, int: this.int, mustacheColor: this.mustacheColor, restBlend };
    extra.bloodOwner = this;
    extra.wearsFancyHat = !!this.wearsFancyHat; extra.wearsRunningShoes = !!this.wearsRunningShoes;
    // ELEMENT-TINT-01: a locked attunement or mixed element tints skin toward that element,
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
    const swingingVisualAngle = (usesSwingAngle && this.isSwinging && this.baseAngle !== undefined)
      ? (this.type === 'LANCER' || isFastForwardSimplified() ? this.baseAngle : this.baseAngle + this.visualSwingOffset(Math.min(1, (gameTime - this.swingStart) / this.swingDuration))) : null;
    const desiredDrawAngle = swingingVisualAngle !== null ? swingingVisualAngle : cheering ? -Math.PI/2 + Math.sin((presentationTime - waveCheerStart)/160 + this.id)*0.35 : (usesSwingAngle ? this.renderSwordAngle : this.angle);
    const poseElapsed = Math.min(100,Math.max(0,presentationTime-(this.poseDrawTime || presentationTime)));
    this.poseDrawTime=presentationTime;
    const showSwingArc = (this.isSwinging || this.isSwinging2) && !isFastForwardSimplified(); // AIM-STEADY-01: at 5x and 10x a swing lasts a frame or two, so the blade eases toward the aim instead of flashing through its arc
    if(!Number.isFinite(this.poseDrawAngle) || showSwingArc || PREFERS_REDUCED_MOTION) this.poseDrawAngle=desiredDrawAngle;
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
      // NO-CANVAS-FILTER-01
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
    const flinchT = PREFERS_REDUCED_MOTION || !Number.isFinite(this.hitFlinchAt) ? 1 : (presentationTime - this.hitFlinchAt) / HIT_FLINCH_MS;
    const flinchPx = flinchT < 1 ? Math.sin(flinchT * Math.PI) * HIT_FLINCH_PX : 0; // HIT-FLINCH-01: a struck stickman rocks back from the blow and settles, inspired by the Unity remake's hit reactions
    drawStickman(ctx, this.x + Math.cos(this.hitFlinchAngle || 0)*flinchPx, this.y + cheerHop + Math.sin(this.hitFlinchAngle || 0)*flinchPx, drawAngle, this.level, this.type, extra);
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
        ctx.fillText(countLabel(this.disabledWavesLeft, 'round') + ' left', this.x, this.y - 44);
      }
    }

    if(this.isHero){
      ctx.font = '13px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
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
    if((this.bloodLustUntil > gameTime || this.rageUntil > gameTime) && isFighterTower(this)) this.drawRageMark(ctx);
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
const PROJECTILE_AMMO_BY_TOWER = { // AMMO-KIND-01
  NINJA:'STAR', BLOWDART: 'DART', BLOW_GUNNER: 'DART', SQUIRTGUN: 'PELLET',
  GATLING: 'BULLET', GUNALINDER: 'BULLET', MARKSMAN: 'BULLET', SNIPER: 'BULLET',
  CRAZY_CHEF: 'KNIFE', GLAIVE: 'BLADE'
};
const BLEED_PER_ARROW_MAX_HP_SHARE = 0.004, BLEED_ARROW_REFRESH_MS = 1000, MAX_STUCK_ARROWS = 4, ARROW_SLOW_PER_ARROW = 0.08, ARROW_SLOW_FLOOR = 0.6; // BLEED-WHILE-STUCK-01
// STICK-CHANCE-01: arrows sticking in enemies had fallen to 2% with a 2%-per-point slope, so it almost never happened below
// 50 STR and was always on above it. Restored to a visible baseline that rises gradually with every STR point: about 12% at 0 STR,
// about 52% at 250 and about 92% at 500 (the stat effect cap).
const PROJECTILE_STICK_BASE_CHANCE = 0.12, PROJECTILE_STICK_PER_STRENGTH = 0.0016;
function projectileStickChance(strength){ return clampNum(PROJECTILE_STICK_BASE_CHANCE + clampNum(strength || 0, 0, STAT_EFFECT_CAP)*PROJECTILE_STICK_PER_STRENGTH, 0, 0.95); }
const SPEARMAN_SWEEP_ARC_FRACTION = 1.3, POST_KILL_READY_MS = 4000;
const ELECTRIC_CHAIN_RADIUS_PX = 70;
const SNAPCASTER_PROC_CHANCE = 0.35, SNAPCASTER_BURN_SHARE = 0.15, SNAPCASTER_FREEZE_SHARE = 0.30;
// The first live combat target, other than the origin, inside the radius.
function firstOtherCombatTargetWithin(origin, radius){
  for(const candidate of enemiesNear(origin.x, origin.y, radius)){
    if(!isCombatTarget(candidate) || candidate === origin) continue;
    const dx = candidate.x - origin.x, dy = candidate.y - origin.y;
    if(dx*dx + dy*dy <= radius*radius) return candidate;
  }
  return null;
}
const ACID_MAX_STACKS = 3, ACID_STACK_GAP_MS = 450, ACID_TICK_MS = 600, ACID_SLOW_REFRESH_MS = 700;
function coatEnemiesInAcid(x, y, projectile){
  for(const enemy of enemiesNear(x, y, projectile.acidRadius)){
    if(!isCombatTarget(enemy) || Math.hypot(enemy.x-x, enemy.y-y) > projectile.acidRadius + enemy.radius) continue;
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
// GENERATION-CHECK-01: enemies, towers and projectiles live in recycled pools, so a held reference can end up pointing at a different, newer occupant of the same slot.
function projectileTargetLost(p){ return !!(p.trackedTarget && (!p.trackedTarget.active || p.trackedTarget.id !== p.trackedId)); }
class Projectile{
  constructor(){ this.active = false; }
  update(dt, enemyHash){
    if(this.trackedTarget && this.trackedTarget.active && this.trackedTarget.id !== this.trackedId) this.trackedTarget = { active: false, id: -1, x: this.x, y: this.y, radius: 0 }; // the slot was recycled: behave as if the target died
    const prevX = this.x, prevY = this.y;
    this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
    if(this.isAxe) this.spinAngle = (this.spinAngle||0) + dt*0.018;
    if(this.x < -20 || this.x > WORLD_MAX_W+20 || this.y < -20 || this.y > WORLD_MAX_H+20 || (this.maxFlightMs && gameTime - this.spawnTime >= this.maxFlightMs)){
      if(this.trackedTarget && this.trackedTarget.active && !this.isGuaranteedMiss && !this.splashRadius){
        this.x = this.trackedTarget.x; this.y = this.trackedTarget.y;
        this.onImpact(this.trackedTarget);
      }
      this.active = false; return;
    }
    if(this.isGuaranteedMiss){
      if(!this.missRevealed && gameTime >= this.missRevealAt){
        this.missRevealed = true;
        playSound('miss', this.x, undefined, this.y);
        if(this.trackedTarget) spawnFloatingText(this.trackedTarget.x, this.trackedTarget.y - this.trackedTarget.radius - 6, 'MISS', '#aaaaaa');
        spawnParticles(this.x, this.y, '#999999', 2);
      }
      return;
    }
    if(this.trackedTarget && !this.trackedTarget.active){
      this.active = false;
      spawnParticles(this.x, this.y, this.color || '#ffffff', 2);
      return;
    }
    // Homing correction also applies to exactIntercept shots.
    if(this.trackedTarget && !this.splashRadius){
      const desiredAngle = Math.atan2(this.trackedTarget.y - this.y, this.trackedTarget.x - this.x);
      const curAngle = Math.atan2(this.vy, this.vx);
      let diff = desiredAngle - curAngle;
      while(diff > Math.PI) diff -= Math.PI*2;
      while(diff < -Math.PI) diff += Math.PI*2;
      if(Math.abs(diff) <= PROJECTILE_HOMING_MAX_ANGLE){
        const maxTurn = PROJECTILE_HOMING_MAX_TURN_RATE * dt/1000;
        const turn = clampNum(diff, -maxTurn, maxTurn);
        const newAngle = curAngle + turn;
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(newAngle)*speed;
        this.vy = Math.sin(newAngle)*speed;
        this.angle = newAngle;
      }
    }
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
      const missChance = this.sourceTower ? (this.sourceTower.missChance || 0) : 0;
      if(prdRollFires(attackMissChance(missChance, hitEnemy), this.sourceTower, 'missLuckBalance')){
        spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 6, 'MISS', '#aaaaaa');
        spawnParticles(this.x, this.y, '#999999', 2);
        return;
      }
      let streakClaimed = false;
      if(this.sourceTower && this.sourceTower.telemetry) this.sourceTower.telemetry.hitsLanded++; // one shot, one hit — regardless of how many enemies the splash actually catches
      for(const e of enemiesNear(this.x, this.y, this.splashRadius)){ // SPLASH-HASH-01
        if(!isCombatTarget(e)) continue;
        const d = Math.hypot(e.x-this.x, e.y-this.y);
        if(d <= this.splashRadius){
          e.applyDamage(this.damage, this.sourceTower, !streakClaimed, false, true, false, false, Math.atan2(e.y-this.y,e.x-this.x), this.sourceTower ? this.sourceTower.type : 'ENVIRONMENT');
          applyAttunementStatus(this.sourceTower, e);
          if(e.hp <= 0 || !e.active) streakClaimed = true; // this hit killed it — only the first such kill counts for streak
        }
      }
      spawnParticles(this.x, this.y, '#ffb347', 14);
      playSound('death');
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
        this.embedInEnemy(hitEnemy, impactAngle, stickKind);
      }
      if(this.sourceTower && this.sourceTower.type === 'SNAPCASTER' && hitEnemy.active){
        hitEnemy.shockedUntil = gameTime + SHOCK_BURST_WINDOW_MS;
        spawnChainLightning(this.sourceTower, hitEnemy, 2); // SNAPCASTER-CHAIN-01
        if(Math.random() < SNAPCASTER_PROC_CHANCE) this.applySnapcasterProc(hitEnemy);
      }
      spawnParticles(this.x, this.y, this.color || '#ffffff', 3);
    }
  }
  embedInEnemy(hitEnemy, impactAngle, stickKind){
    const stickDist = hitEnemy.radius*0.85, perpendicular = impactAngle + Math.PI/2;
    const lateralJitter = (Math.random()-0.5)*stickDist*0.5; // natural scatter across the entry side
    const dx = -Math.cos(impactAngle)*stickDist + Math.cos(perpendicular)*lateralJitter;
    const dy = -Math.sin(impactAngle)*stickDist + Math.sin(perpendicular)*lateralJitter;
    hitEnemy.embeddedArrows.push({ dx, dy, angle: impactAngle + (Math.random()-0.5)*0.3, kind: stickKind });
    hitEnemy.applyBleed(Math.max(1, Math.round(hitEnemy.maxHp * BLEED_PER_ARROW_MAX_HP_SHARE)), BLEED_ARROW_REFRESH_MS, this.sourceTower);
    if(goreMode) startDripSite(hitEnemy.x, hitEnemy.y, hexToRgba((hitEnemy.bloodProfile || getBloodProfile(hitEnemy.type)).dark, 0.75), this.damage / hitEnemy.maxHp); // the gush is sized to how much this shot hurt
  }
  // MAGE-NEUTRAL-01: a Snap Caster bolt sometimes burns, freezes or shocks; a shock jumps to one more enemy close by.
  applySnapcasterProc(hitEnemy){
    const roll = Math.random();
    if(roll < SNAPCASTER_BURN_SHARE){
      hitEnemy.applyBurn(3000, this.sourceTower);
      spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '🔥 Burning!', '#ff8844');
      if(goreMode) spawnSkinPeel(hitEnemy.x, hitEnemy.y, 'rgba(180,60,20,0.7)');
    } else if(roll < SNAPCASTER_FREEZE_SHARE){
      hitEnemy.applySlow(0.85, 1500);
      spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '🧊 Frozen!', '#7dd3fc');
      if(goreMode) spawnSkinPeel(hitEnemy.x, hitEnemy.y, 'rgba(120,80,90,0.65)');
    } else {
      hitEnemy.applyStun(700);
      spawnFloatingText(hitEnemy.x, hitEnemy.y - hitEnemy.radius - 14, '⚡ Shocked!', '#ffe14d');
      const chainTarget = firstOtherCombatTargetWithin(hitEnemy, ELECTRIC_CHAIN_RADIUS_PX);
      if(chainTarget){
        chainTarget.applyStun(400);
        chainTarget.applyDamage(Math.round(this.damage*0.4), this.sourceTower, false, false, true, false);
        spawnFloatingText(chainTarget.x, chainTarget.y - chainTarget.radius - 14, '⚡ Chained!', '#ffe14d');
        if(graphicsQuality !== 'low'){
          for(let step = 1; step < 5; step++){
            const t = step/5;
            spawnParticles(hitEnemy.x + (chainTarget.x-hitEnemy.x)*t, hitEnemy.y + (chainTarget.y-hitEnemy.y)*t, '#ffe14d', 1);
          }
        }
      }
    }
    spawnParticles(hitEnemy.x, hitEnemy.y, '#c9a8ff', 6);
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
        ctx.strokeStyle = this.color || '#7dd3fc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = this.color || '#7dd3fc';
        ctx.globalAlpha = 0.55;
      } else {
        // fading trail behind the missile reads as a bolt of energy, not an arrow
        const trailGrad = ctx.createLinearGradient(-14, 0, 0, 0);
        trailGrad.addColorStop(0, 'rgba(125,211,252,0)');
        trailGrad.addColorStop(1, this.color || '#7dd3fc');
        ctx.strokeStyle = trailGrad; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
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
    if(graphicsQuality !== 'low'){
      const trailEnd = -Math.min(20, 8 + (this.flightDistancePx || 0)*flightProgress/ARROW_DRAW_SCALE);
      ctx.strokeStyle = this.elementColor || 'rgba(255,246,214,0.6)'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(trailEnd, 0); ctx.lineTo(-8, 0); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(2, 0); ctx.stroke();
    ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -2.5); ctx.lineTo(-1, 2.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, -2); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, 2); ctx.stroke();
    ctx.restore();
  }
}
// AMMO-KIND-01: Drawn at the origin, pointing along +x
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
