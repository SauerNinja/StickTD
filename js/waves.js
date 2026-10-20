"use strict";
// Enemy definitions, bosses, huts, trolls, the wave plan, the Enemy class and the boot sequence. Loaded after js/towers.js; the end of this file starts the game.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   ENEMY DEFINITIONS (CONFIG.ENEMIES)
//   ENEMY BALANCE
//   BOSSES
//   WAVE START
//   HUTS, CASTLES AND GRAVES
//   TUTORIAL TIPS, WAVE-CLEAR EVENTS AND LIFE LOSS
//   TROLLS AND CIRCUS
//   SIZE AND FAMILY TIERS
//   WAVE PLAN AND DISPATCH
//   ENEMY CLASS
//   ENEMY COLLISION MASKS AND POOL
//   BOOT
//   START THE GAME (runs last, after every file has loaded)
/* =========================================================
   ENEMY DEFINITIONS (CONFIG.ENEMIES)
   ========================================================= */
// CA022 — see HISTORY.md § [1.5.7] Code Archaeology, CA022
const ENEMY_INFO = {
  GRUNT: { name:'Grunt', desc:'Basic all-rounder — no special tricks.' },
  SWARM: { name:'Swarm', desc:'Fast and numerous, but very fragile.' },
  TANK: { name:'Tank', desc:'Slow, but tough and armored.' },
  RUNNER: { name:'Runner', desc:'Very fast, low HP — outruns most attack speeds.' },
  BOSS: { name:'Boss', desc:'Massive HP and armor. Always arrives last in its wave and periodically rallies, restoring a little health.' },
  SANTA: { name:'Santa', desc:'The true final boss — replaces the Boss on the very last wave. Highest HP in the game, and periodically summons a few fast Cookies instead of healing.' },
  COOKIE: { name:'Cookie', desc:'One of Santa\'s own — small and weak, but very fast. Ho ho ho.' },
  CHESS: { name:'Chess Piece', desc:'A Castle guardian — a random chess piece each time, black or white. Breaks off to attack a tower far more often than anything else on the board.' },
  TROLL: { name:'Troll', desc:'Huge bounty, but walks backward toward the entrance instead of forward — kill it before it wanders off!' },
  FIRE: { name:'Fire', desc:'Can break off the path to burn a tower directly.' },
  ICE: { name:'Ice', desc:'Can break off the path to slow a tower directly.' },
  SPLITTER: { name:'Splitter', desc:'Splits into two smaller Splitmini on death.' },
  SPLITMINI: { name:'Splitmini', desc:'A smaller fragment left behind by a Splitter.' },
  HEALER: { name:'Healer', desc:'Heals nearby allies over time — kill it first.' },
  SHIELDED: { name:'Shielded', desc:'Absorbs hits with a shield before taking real damage.' },
  ZOMBIE: { name:'Zombie', desc:'Heavily armored undead — extra vulnerable to a Cleric\'s curse.' },
  WRAITH: { name:'Wraith', desc:'Fast, armored undead.' },
  SKELETON: { name:'Skeleton', desc:'Undead that revives once after being killed.' },
  WOLF: { name:'Wolf', desc:'Hunts in a coordinated pack.' },
  REAPER: { name:'Reaper', desc:'The heaviest-armored undead in the roster.' },
  BOULDER: { name:'Boulder', desc:'Tanky, and splits on death like a heavier Splitter.' },
  ROCKLET: { name:'Rocklet', desc:'A smaller rock fragment left behind by a Boulder.' },
  MONARCH: { name:'Monarch', desc:'The fastest thing on the path — hard to hit, doesn\'t hit hard back.' }
};
CONFIG.ENEMIES = {
  // CA068 — see HISTORY.md § [1.5.7] Code Archaeology, CA068. BALANCE-01 (1.6.1) — see HISTORY.md §
  // [1.6.1]: every baseHp +15%, every speed -25% from this table's original values.
  // BALANCE-02 (1.6.7) — see HISTORY.md § [1.6.7]: direct follow-up ("still don't see it, need
  // much more") — every speed cut a further 30% on top of the 1.6.1 pass (≈47.5% below original).
  GRUNT:  { emoji:'😡', baseHp:84,  speed:27,  bounty:6,  radius:15, armor:0, breakawayChance:0.02, breakDamage:6 },
  SWARM:  { emoji:'🐜', baseHp:31,  speed:41,  bounty:2,  radius:9,  armor:0, breakawayChance:0.02, breakDamage:4 },
  TANK:   { emoji:'🗿', baseHp:308, speed:14,  bounty:16, radius:22, armor:6, breakawayChance:0.02, breakDamage:10 },
  RUNNER: { emoji:'🥷', baseHp:63,  speed:57,  bounty:9,  radius:12, armor:0, breakawayChance:0.02, breakDamage:6 },
  BOSS:   { emoji:'👹', baseHp:3087,speed:11,  bounty:173,radius:34, armor:8, breakawayChance:0,    breakDamage:6 },
  // CA069 — see HISTORY.md § [1.5.7] Code Archaeology, CA069
  SANTA:  { emoji:'🎅', baseHp:7716,speed:10,  bounty:400,radius:38, armor:10, breakawayChance:0,   breakDamage:8 },
  // CA070 — see HISTORY.md § [1.5.7] Code Archaeology, CA070
  COOKIE: { emoji:'🍪', baseHp:25,  speed:62,  bounty:3,  radius:9,  armor:0, breakawayChance:0,    breakDamage:2 },
  // CA071 — see HISTORY.md § [1.5.7] Code Archaeology, CA071
  CHESS:  { emoji:'♟', baseHp:150, speed:20,  bounty:14, radius:14, armor:3, breakawayChance:0.9,  breakDamage:9 },
  TROLL:  { emoji:'🧌', baseHp:275, speed:24,  bounty:52, radius:20.9, armor:2, breakawayChance:0, breakDamage:0 },
  FIRE:   { emoji:'🔥', baseHp:77,  speed:34,  bounty:10, radius:13, armor:0, breakawayChance:0.6,  breakDamage:8, statusOnTower:'BURN' },
  ICE:    { emoji:'🧊', baseHp:84,  speed:28,  bounty:10, radius:13, armor:0, breakawayChance:0.6,  breakDamage:6, statusOnTower:'ICE' },
  SPLITTER: { emoji:'🦠', baseHp:98,  speed:22,  bounty:7,  radius:14, armor:0, breakawayChance:0.02, breakDamage:5, splits:true },
  SPLITMINI:{ emoji:'🦠', baseHp:33,  speed:32,  bounty:2,  radius:8,  armor:0, breakawayChance:0,    breakDamage:2 },
  HEALER: { emoji:'💉', baseHp:120, speed:21,  bounty:13, radius:15, armor:0, breakawayChance:0.02, breakDamage:5, healsAllies:true, holyLifesteal:true },
  SHIELDED: { emoji:'🛡️', baseHp:133, speed:19,  bounty:12, radius:16, armor:0, breakawayChance:0.02, breakDamage:6, hasShield:true },
  ZOMBIE: { emoji:'🧟', baseHp:210, speed:12,  bounty:14, radius:19, armor:9, breakawayChance:0.02, breakDamage:7, isUndead:true },
  WRAITH: { emoji:'👻', baseHp:53,  speed:49,  bounty:9,  radius:12, armor:4, breakawayChance:0.04, breakDamage:5, isUndead:true },
  SKELETON: { emoji:'🦴', baseHp:91,  speed:22,  bounty:12, radius:15, armor:6, breakawayChance:0.02, breakDamage:5, revives:true, isUndead:true },
  WOLF: { emoji:'🐺', baseHp:45,  speed:38,  bounty:7,  radius:11, armor:0, breakawayChance:0.03, breakDamage:5, pack:true },
  REAPER: { emoji:'💀', baseHp:253, speed:17, bounty:23, radius:20, armor:10, breakawayChance:0.02, breakDamage:7, isUndead:true },
  BOULDER: { emoji:'🪨', baseHp:365, speed:13, bounty:18, radius:23, armor:5, breakawayChance:0.02, breakDamage:8, splits:true },
  ROCKLET: { emoji:'🪨', baseHp:124, speed:18, bounty:5,  radius:13, armor:0, breakawayChance:0,    breakDamage:4 },
  MONARCH: { emoji:'🦋', baseHp:38,  speed:59,  bounty:6,  radius:10, armor:0, breakawayChance:0.02, breakDamage:3 },
  // TARGET-MARK-01 (1.6.94) — see HISTORY.md § [1.6.94]. Livestock are real Enemy instances (isLivestock),
  // so they get the full damage/elemental/death pipeline for free, but never path-follow, attack, or
  // count toward a wave — see the isLivestock branch near the top of Enemy.update() and in die().
  // Passive and low-HP: a couple of hits from any tower ends one, once it's actually been marked as a target.
  CHICKEN: { emoji:'🐔', baseHp:12, speed:18, bounty:0, radius:10, armor:0, breakawayChance:0, breakDamage:0 },
  PIG:     { emoji:'🐷', baseHp:22, speed:14, bounty:0, radius:14, armor:0, breakawayChance:0, breakDamage:0 },
  COW:     { emoji:'🐄', baseHp:32, speed:10, bounty:0, radius:15, armor:0, breakawayChance:0, breakDamage:0 },
  MONKEY:   { emoji:'🐒', baseHp:20, speed:20, bounty:0, radius:11, armor:0, breakawayChance:0, breakDamage:0 },
  ELEPHANT: { emoji:'🐘', baseHp:70, speed:9,  bounty:0, radius:19, armor:0, breakawayChance:0, breakDamage:0 },
  CLOWN:    { emoji:'🤡', baseHp:60, speed:18, bounty:0, radius:13, armor:0, breakawayChance:0, breakDamage:0 },
  BEE: { emoji:'🐝', baseHp:20, speed:24, bounty:0, radius:8, armor:0, breakawayChance:0, breakDamage:0 },
  WANDERING_TROLL: { emoji:'🧌', baseHp:240, speed:16, bounty:0, radius:20.9, armor:2, breakawayChance:0, breakDamage:0 }
};
/* =========================================================
   ENEMY BALANCE
   ========================================================= */
// ENEMY-PACE-01 (1.6.80) — see HISTORY.md § [1.6.80]
const ENEMY_WALK_SPEED_SCALE = 0.25;
const ENEMY_SPAWN_GAP_MS = 5000;
// OPENING-PACE-01 (1.8.43): owner agreed the start was slow. Waves 1 and 2 space units 2.5 s apart, and wave 1 lets two enemies walk the route at once
// (it was strictly one at a time, about 13 s of waiting per enemy), so the first enemy is on screen at GO and the lesson keeps moving.
const OPENING_SPAWN_GAP_MS = 2500, OPENING_PACE_LAST_WAVE = 2, WAVE_ONE_MAX_ON_ROUTE = 2;
const SAVE_TIP_WAVE = 3;
const WAVE_ONE_HP_SCALE = 0.6; // FIRST-KILLS-01 (1.8.44): wave-1 units fall in two or three hits, as the genre's first enemies do
// OPENING-FLOW-01 (1.8.64): waves 3-10 send units 1.5 s apart so a new player's first 15 minutes reach about wave 5 instead of wave 3; walk speed is unchanged (ENEMY-PACE-01)
const OPENING_FLOW_SPAWN_GAP_MS = 1500, OPENING_FLOW_LAST_WAVE = 10;
function spawnGapForWave(waveNumber){
  if(waveNumber <= OPENING_PACE_LAST_WAVE) return OPENING_SPAWN_GAP_MS;
  return waveNumber <= OPENING_FLOW_LAST_WAVE ? OPENING_FLOW_SPAWN_GAP_MS : ENEMY_SPAWN_GAP_MS;
}
const ENEMY_SIGNATURE_DROPS = { GRUNT: 'GRUNT_HEADBAND', SWARM: 'ANT_JAW', TANK: 'GRANITE_HEART', RUNNER: 'SHADOW_SASH', BOSS: 'FIEND_HORN', SANTA: 'HOLIDAY_STOCKING', COOKIE: 'FORTUNE_SLIP', CHESS: 'KNIGHT_PAWN', TROLL: 'BRIDGE_TOLL', FIRE: 'EMBER_CORE', ICE: 'FROST_SHARD', SPLITTER: 'SPORE_FLASK', HEALER: 'MENDERS_PIN', SHIELDED: 'FIELD_HELMET', ZOMBIE: 'GRAVE_CHARM', WRAITH: 'SPECTRAL_VEIL', SKELETON: 'BONE_WHISTLE', WOLF: 'WOLF_FANG', REAPER: 'MIDNIGHT_CHARM', BOULDER: 'GEODE', MONARCH: 'BUTTERFLY_WING' };
function enemyDropTier(enemy){
  if(enemy.type === 'BOSS' || enemy.type === 'SANTA') return 'BOSS';
  return enemy.sizeTier || (enemy.isBig ? 'LARGE' : enemy.isMini ? 'TINY' : 'STANDARD');
}
function enemyMoveMultiplier(e){ const stuckCount = e.embeddedArrows ? e.embeddedArrows.length : 0; return e.slowMultiplier * Math.max(ARROW_SLOW_FLOOR, 1 - ARROW_SLOW_PER_ARROW * stuckCount); }
// WANDERING-TROLL-01 (1.6.110) — see HISTORY.md § [1.6.110]
const ARMOR_MIN_DAMAGE_SHARE = 0.5;
// CA624 — see HISTORY.md § [1.5.7] Code Archaeology, CA624
const ENEMY_DAMAGE_SCALE = 0.6, ENEMY_ATTACK_INTERVAL_SCALE = 1.6, ENEMY_HP_SCALE = 0.85;
const ENEMY_FAMILY_SPEED_MIN = Math.min(...Object.values(CONFIG.ENEMIES).map(def => def.speed));
const ENEMY_FAMILY_SPEED_MAX = Math.max(...Object.values(CONFIG.ENEMIES).map(def => def.speed));
// MORE-ENEMIES-01 (1.7.38): owner decision — the game should not get harder, but since all you do is attack enemies, there should be more of them. The little, small and
// standard counts are multiplied by ENEMY_COUNT_MULTIPLIER on every wave; enemy health, speed, damage, bounty and the Large and Boss counts are untouched, so each enemy is exactly as
// strong as before, there are simply more of them to fight, farm and level on.
const ENEMY_COUNT_MULTIPLIER = 1.5, LATE_ENEMY_COUNT_MULTIPLIER = 1.2; // after wave 50 the counts are already in the hundreds, so the extra is smaller to protect frame rate
function tierPopulationForWave(waveNumber){
  const population = baseTierPopulationForWave(waveNumber);
  const countMultiplier = waveNumber > 50 ? LATE_ENEMY_COUNT_MULTIPLIER : ENEMY_COUNT_MULTIPLIER;
  for(const tier of ['TINY','SMALL','STANDARD']) if(population[tier]) population[tier] = Math.max(1, Math.round(population[tier] * countMultiplier));
  return scaledPopulation(population, waveNumber);
}
function baseTierPopulationForWave(waveNumber){
  if(waveNumber < EARLY_WAVE_POPULATION.length) return Object.assign({ TINY:0, SMALL:0, STANDARD:0, LARGE:0, BOSS:0 }, EARLY_WAVE_POPULATION[waveNumber]);
  const littleTotal = 189 + Math.round(5.5 * (waveNumber - 15)); // 1.5x the handoff curve — more small enemies to farm
  const tinyCount = Math.round(littleTotal * 0.76);
  const population = { TINY:tinyCount, SMALL:littleTotal - tinyCount, STANDARD:12 + Math.round(0.6 * (waveNumber - 15)), LARGE:0, BOSS:0 };
  if(isMasteryWave(waveNumber)){
    const totalBig = Math.floor(littleTotal / 5);
    population.BOSS = bossCountForWave(waveNumber);
    population.LARGE = totalBig - population.BOSS;
  }
  return population;
}
// CA628 — see HISTORY.md § [1.5.7] Code Archaeology, CA628
// GROUP-SIZE-ROUTE-01 (1.7.37): owner decision — groups are bigger the longer the road is. The batch size range is multiplied by the same road-length factor that scales the
// enemy counts (never for Boss batches or wave 1, and Large batches grow only half as fast), so a long road brings both more enemies and larger groups of them.
function batchSizeRangeForWave(waveNumber, sizeTier){
  if(sizeTier === 'BOSS') return [1, 1];
  if(waveNumber === 1) return [1, 1];
  const base = waveNumber <= 50 ? ({ TINY:[3,5], SMALL:[2,5], STANDARD:[2,4], LARGE:[2,3] })[sizeTier] : ({ TINY:[7,10], SMALL:[6,9], STANDARD:[5,8], LARGE:[5,7] })[sizeTier];
  const factor = sizeTier === 'LARGE' ? 1 + (routeLengthFactor(waveNumber) - 1)*0.5 : routeLengthFactor(waveNumber);
  return [Math.max(1, Math.round(base[0]*factor)), Math.max(1, Math.round(base[1]*factor))];
}
function chapterFamilyForWave(waveNumber){
  if(waveNumber > CAMPAIGN_WAVE_COUNT) return null;
  const chapterStart = waveNumber - ((waveNumber - 1) % 5);
  for(const family of Object.keys(FAMILY_INTRODUCTION_WAVE)){
    if(family !== 'BOSS' && FAMILY_INTRODUCTION_WAVE[family] === chapterStart) return family;
  }
  return null;
}
function expeditionThemeIndex(waveNumber){
  const expeditionDepth = waveNumber - CAMPAIGN_WAVE_COUNT;
  if(expeditionDepth % 4 === 0) return FARM_THEME_INDEX;
  const bagRound = Math.floor((expeditionDepth - 1) / 4);
  const rng = createSeededRandom(waveSeedFor(waveRunSeed, 100000 + bagRound));
  const bag = EXPEDITION_THEMES.map((_, i) => i).filter(i => i !== FARM_THEME_INDEX);
  for(let i = bag.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return bag[(expeditionDepth - 1) % 4];
}
function learnedFamiliesForWave(waveNumber){
  return Object.keys(FAMILY_INTRODUCTION_WAVE).filter(family => family !== 'BOSS' && FAMILY_INTRODUCTION_WAVE[family] <= waveNumber);
}
function familyWeightsForTier(waveNumber, sizeTier, partnerFamily, emphasisFamilies){
  const chapterFamily = chapterFamilyForWave(waveNumber);
  const position = (waveNumber - 1) % 5;
  const weights = [];
  for(const family of learnedFamiliesForWave(waveNumber)){
    if(!FAMILY_TIER_ELIGIBILITY[family].includes(sizeTier)) continue;
    if(family === chapterFamily && position === 0) continue;
    let weight = 1;
    if(family === chapterFamily) weight = position === 4 && sizeTier === 'LARGE' ? 6 : 3;
    if(family === partnerFamily) weight = 3;
    if(emphasisFamilies && emphasisFamilies.includes(family)) weight = 4;
    weights.push({ family, weight });
  }
  return weights;
}
function pickWeightedFamily(rng, weights){
  let total = 0;
  for(const w of weights) total += w.weight;
  let roll = rng() * total;
  for(const w of weights){ roll -= w.weight; if(roll <= 0) return w.family; }
  return weights[weights.length - 1].family;
}
function introductionSlotCount(tierCount){ return Math.min(6, Math.max(2, Math.round(tierCount * 0.15))); }
// CA268 — see HISTORY.md § [1.5.7] Code Archaeology, CA268
const enemyDeathTiming = { count:0, totalMs:0, maxMs:0, over8ms:0 };
// Knight's lance: target weight is linear size relative to a standard 15px-radius unit.
// Half damage at minimum size, 1x at standard size, capped at 1.75x for very large targets.
function tinyGruntEvasion(enemy){ return enemy && enemy.type === 'GRUNT' && enemy.sizeTier === 'TINY' ? 0.15 : 0; }
function attackMissChance(base, enemy){ return clampNum((base || 0) + tinyGruntEvasion(enemy), 0, 1); }
function rollDirectAttackMiss(tower, enemy){
  if(!prdRollFires(attackMissChance(tower ? tower.missChance : 0, enemy), tower, 'missLuckBalance')) return false;
  spawnFloatingText(enemy.x, enemy.y - enemy.radius - 6, 'MISS', '#aaaaaa');
  if(tower && tower.telemetry) tower.telemetry.misses++;
  return true;
}
function lancerWeightDamageMultiplier(weight){ return clampNum(Number(weight) || 1, 0.5, 1.75); }
// WEIGHT-HP-181, WEIGHT-HP-182 (1.8.17): same species and wave scale, double weight means double HP before integer rounding, Tiny Grunts included.
function enemyHealthAtWeight(type,weight,hpScale){
  return Math.max(1,Math.round(CONFIG.ENEMIES[type].baseHp * Math.max(0.25,weight) * hpScale * 1.25));
}
/* =========================================================
   BOSSES
   ========================================================= */
const BOSS_GUARANTEED_COMMON_ROLLS = { min: 1, max: 2 }, BOSS_GEAR_ROLLS = 3, BOSS_GEAR_ROLL_CHANCE = 0.15, BOSS_SIGNATURE_CHANCE = 0.6, BOSS_BAD_LUCK_LIMIT = 3;
let bossesSinceGearDrop = 0;
const BOSS_RARITY_WEIGHTS = { COMMON: 0, UNCOMMON: 42, RARE: 46, EPIC: 12, LEGENDARY: 2 };
// REAL-TIME-PRESENTATION-01 (1.6.105): things the player watches rather than fights run once per rendered frame in real
// time, so they look identical at every game speed and keep working between waves: floating text, coin flights and
// livestock wandering.
// MUSIC-BOSS-01 (1.7.36): cached every 300 ms so the per-frame phase choice never scans the enemy pool each frame.
let bossFieldCheckAt = 0, bossFieldCached = false;
function bossIsOnField(){
  const now = performance.now();
  if(now - bossFieldCheckAt > 300){
    bossFieldCheckAt = now;
    bossFieldCached = scanFieldForMusic();
  }
  return bossFieldCached;
}
const BOSS_ATTACK_MULT = 5; // BOSS-AGGRO-01 (1.6.110) — see HISTORY.md § [1.6.110]
const BOSS_AGGRO_RADIUS = 300;
function bossCountForWave(waveNumber){
  if(waveNumber % 10 !== 0) return 0;
  if(waveNumber <= 10) return 1;
  if(waveNumber <= 40) return 1;
  if(waveNumber <= 70) return 2;
  if(waveNumber <= 90) return 3;
  return 4;
}
// ROUTE-SCALES-WAVE-01 (1.7.36): owner decision — the longer the road, the more enemies come. A road about as long as expected for this wave changes nothing;
// a much longer one (for example a huge road on wave 1) multiplies the little and standard enemies, up to 2.5 times. Large and Boss counts never change.
function expectedRouteLengthForWave(waveNumber){ return 4 + 2*waveNumber; }
function routeLengthFactor(waveNumber){
  const length = (typeof pathWaypointTiles !== 'undefined' && pathWaypointTiles) ? pathWaypointTiles.length : 0;
  return Math.max(1, Math.min(routeLengthFactorCap(waveNumber), length / expectedRouteLengthForWave(waveNumber)));
}
// OPENING-CROWD-CAP-01 (1.8.65): the long-road crowd bonus ramps in over the first ten waves (1.5 at wave 2 up to the usual 2.5 at wave 10), so early waves on an expanded map last minutes, not a quarter hour
const ROUTE_FACTOR_MAX = 2.5, OPENING_ROUTE_FACTOR_BASE = 1.25, OPENING_ROUTE_FACTOR_PER_WAVE = 0.125;
function routeLengthFactorCap(waveNumber){ return Math.min(ROUTE_FACTOR_MAX, OPENING_ROUTE_FACTOR_BASE + OPENING_ROUTE_FACTOR_PER_WAVE * waveNumber); }
function scaledPopulation(population, waveNumber){
  const factor = routeLengthFactor(waveNumber);
  if(factor <= 1.0001) return population;
  for(const tier of ['TINY','SMALL','STANDARD']) if(population[tier]) population[tier] = Math.round(population[tier] * factor);
  return population;
}
function bossHpScale(waveNumber){ return waveNumber < 20 ? 0.4 : 1; }
// CA631 — see HISTORY.md § [1.5.7] Code Archaeology, CA631
const BOSS_WARNING_MS = 2600;
let bossWarningUntil = 0;
let bossWarningLabel = 'BOSS APPROACHING';
function showBossWarning(label){
  bossWarningUntil = presentationTime + BOSS_WARNING_MS;
  bossWarningLabel = label || 'BOSS APPROACHING';
  showToast(bossWarningLabel, null, 'A boss phase is entering the road. Prepare your defenders before it reaches the base.');
  playSound('wave');
  if(screenShakeEnabled){ screenShakeUntil = presentationTime + 600; screenShakeMag = Math.max(screenShakeMag, 7); }
}
const bossWarningLog = [];
function announceSizePhase(phase){
  // CA632 — see HISTORY.md § [1.5.7] Code Archaeology, CA632
  if(phase.sizeTier === 'SMALL') return;
  if(phase.sizeTier === 'BOSS'){
    // CA633 — see HISTORY.md § [1.5.7] Code Archaeology, CA633
    const isSanta = phase.batches.some(batch=>batch.units.some(unit=>unit.family==='SANTA')); // waveIndex already incremented for the in-progress wave by the time SPAWNING dispatches its BOSS phase (see startNextWave()'s waveIndex++, which runs before advanceWaveDispatch ever calls this)
    bossWarningLog.push({ wave: waveIndex, phaseIndex: waveDispatch.phaseIndex, reason: 'BOSS phase entered' });
    if(bossWarningLog.length > 10) bossWarningLog.shift();
    showBossWarning(isSanta ? '🎅 SANTA APPROACHING' : 'BOSS APPROACHING');
    if(isSanta) trackGameEvent('santa_boss_encountered', { wave: waveIndex });
  }
  else if(phase.sizeTier === 'LARGE') showKillstreakBanner(SIZE_PHASE_BANNERS[phase.sizeTier]);
  else showToast(SIZE_PHASE_BANNERS[phase.sizeTier]);
  playSound(phase.sizeTier === 'BOSS' || phase.sizeTier === 'LARGE' ? 'wave' : 'click');
}
// WAVE-RUSH-01 (1.6.100) — see HISTORY.md § [1.6.100]. When the player has cleared every enemy still on the route
// mid-wave, the remaining unit-spacing and batch/phase presentation gaps are pointless waiting: drop them so the next
// enemy is released immediately. Held back only while a boss warning banner is on screen.
function rushDispatchIfFieldClear(){
  if(activeWavePlan && activeWavePlan.waveNumber <= EARLY_NO_RUSH_LAST_WAVE) return;
  if(bossWarningUntil > 0 && presentationTime < bossWarningUntil) return;
  if(waveRouteObligationsOutstanding()) return;
  waveDispatch.unitGapRemainingMs = 0;
  waveDispatch.gapRemainingMs = 0;
}
function advanceWaveDispatch(dt){
  const plan = activeWavePlan;
  if(!plan || waveTimer < WAVE_COUNTDOWN_MS) return;
  const phase = plan.phases[waveDispatch.phaseIndex];
  if(!phase){ waveState = 'ACTIVE'; updateHUD(); return; }
  rushDispatchIfFieldClear();
  const batch = phase.batches[waveDispatch.batchIndex];
  if(waveDispatch.unitIndex < batch.units.length){
    if(waveDispatch.unitGapRemainingMs > 0){ waveDispatch.unitGapRemainingMs -= dt; return; } // ENEMY-PACE-01: space the units out
    if(spawnWaveUnit(batch.units[waveDispatch.unitIndex])){
      waveDispatch.unitIndex++;
      waveDispatch.batchEnemies.push(lastSpawnedEnemy);
      waveDispatch.batchSerials.push(lastSpawnedSerial);
      waveDispatch.unitGapRemainingMs = spawnGapForWave(plan.waveNumber);
    }
    return;
  }
  const isLastBatchOfPhase = waveDispatch.batchIndex >= phase.batches.length - 1;
  if(plan.waveNumber === 1){
    if(routeObligationCount() >= WAVE_ONE_MAX_ON_ROUTE) return;
    if(waveDispatch.unitGapRemainingMs > 0){ waveDispatch.unitGapRemainingMs -= dt; return; }
  } else if(isLastBatchOfPhase){
    if(waveRouteObligationsOutstanding()) return;
  } else if(!currentBatchReleased() && waveDispatch.releaseHoldMs < BATCH_RELEASE_MAX_HOLD_MS){
    waveDispatch.releaseHoldMs += dt;
    return;
  }
  if(waveDispatch.gapRemainingMs > 0){ waveDispatch.gapRemainingMs -= dt; return; }
  waveDispatch.releaseHoldMs = 0;
  waveDispatch.resolvedUnits += batch.units.length;
  waveDispatch.unitIndex = 0;
  waveDispatch.batchEnemies.length = 0; waveDispatch.batchSerials.length = 0;
  waveDispatch.batchIndex++;
  if(waveDispatch.batchIndex >= phase.batches.length){
    waveDispatch.batchIndex = 0;
    waveDispatch.phaseIndex++;
    const nextPhase = plan.phases[waveDispatch.phaseIndex];
    if(nextPhase){
      announceSizePhase(nextPhase);
      waveDispatch.gapRemainingMs = nextPhase.sizeTier === 'BOSS' ? SIZE_TIER_BANDS.BOSS.batchGapMs : batch.presentationGapMs * 2;
    }
  } else {
    waveDispatch.gapRemainingMs = batch.presentationGapMs;
  }
  updateHUD();
}
// LOOSE-NOTICE-01 (1.6.77) — see HISTORY.md § [1.6.77]
function countLooseEnemies(){
  let looseCount = 0;
  for(const enemy of enemyPool) if(enemy.active && enemy.escaped) looseCount++;
  return looseCount;
}
/* =========================================================
   WAVE START
   ========================================================= */
// EARLY-CALL-01 (1.8.62): calling the next wave soon after clearing one pays bonus gold, falling to nothing over EARLY_CALL_WINDOW_MS of game time
// (paused time does not count), after Kingdom Rush's early call. Waiting is never punished; calling early is rewarded. Not paid before the first wave.
const EARLY_CALL_WINDOW_MS = 20000, EARLY_CALL_BASE_GOLD = 8, EARLY_CALL_GOLD_PER_WAVE = 1.5;
let waveClearedAtGameTime = -Infinity;
function earlyCallBonusNow(){
  if(wavesCompleted <= 0 || !Number.isFinite(waveClearedAtGameTime)) return 0;
  const remaining = Math.max(0, EARLY_CALL_WINDOW_MS - (gameTime - waveClearedAtGameTime));
  return Math.round((EARLY_CALL_BASE_GOLD + EARLY_CALL_GOLD_PER_WAVE * wavesCompleted) * remaining / EARLY_CALL_WINDOW_MS);
}
function startNextWave(){
  if(waveState !== 'IDLE') return;
  const earlyCallGold = earlyCallBonusNow();
  waveClearedAtGameTime = -Infinity;
  if(earlyCallGold > 0){
    gold += earlyCallGold;
    if(waypointsPx.length) spawnFloatingText(waypointsPx[0].x, waypointsPx[0].y - 46, '+💰' + earlyCallGold + ' early call', '#ffd54f', 1400);
    playSound('coin');
    trackGameEvent('early_call_bonus', { wave: waveIndex + 1, gold: earlyCallGold });
    showFirstTimeNotice('first_early_call', '💰 Calling the next wave quickly after a clear pays bonus gold. The bonus shrinks to nothing over 20 seconds.');
  }
  if(waveIndex === 0){ stealthRun=window.analyticsConsentChoice==='denied'; markFirstWaveStarted(); }
  // CA635 — see HISTORY.md § [1.5.7] Code Archaeology, CA635
  if(Math.random() < 0.02){
    spawnLeafGust();
    showToast('🍃 Lucky Wave!');
  }
  // CA636 — see HISTORY.md § [1.5.7] Code Archaeology, CA636
  windCeilingForWave = 0; // Wind removed per direct feedback ("wind is confusing, suggest removing for now") — forced to a permanent 0 ceiling here rather than deleting updateWind()/windMissPenalty() outright, so windStrength always converges to 0 and every downstream effect (Archer/Mage miss-chance penalty, the flag's wind-lean visual) goes fully inert without touching every one of their call sites in one pass. Can be re-enabled later (or the dead plumbing actually removed) by restoring the old progression curve here.
  // CA637 — see HISTORY.md § [1.5.7] Code Archaeology, CA637
  for(const t of towerPool){
    if(t.active && t.disabledWavesLeft > 0) t.disabledWavesLeft--;
  }
  // CA638 — see HISTORY.md § [1.5.7] Code Archaeology, CA638
  for(const t of towerPool){
    if(t.active && t.type === 'NECROMANCER') raiseSkeletonsForTower(t);
  }
  barkFromRandomTower(BARK_TIER_OPTIONAL, '🫡', BARK_LINES.WAVE_START, BARK_CHANCE.WAVE_START);
  const plan = buildWavePlan(waveIndex + 1);
  const newTypes = [];
  for(const phase of plan.phases){
    for(const batch of phase.batches){
      for(const unit of batch.units){
        if(!seenEnemyTypes.has(unit.family)){
          seenEnemyTypes.add(unit.family);
          newTypes.push(unit.family);
          getEnemyCollisionMask(unit.family);
        }
      }
    }
  }
  if(newTypes.length) showNewEnemyToast(newTypes);
  showToast(plan.label);
  resetWaveDispatch();
  activeWavePlan = plan;
  waveTimer = 0; countdownBeatPlayed = -1; countdownMusicStage = 0;
  waveIndex++;
  waveState = 'SPAWNING';
  logGameEvent('wave started: lives ' + lives + ', gold ' + gold + ', speed ' + gameSpeed + 'x');
  startWaveStartCameraPan();
  waveStartGold = gold; // snapshot for the wave-end summary popup's gold-gained readout
  Object.assign(waveTelemetry, { activeAtStartMs:telemetryActiveMs(), startedAtGameTime: gameTime, livesAtStart: lives, goldAtStart: gold, escaped: 0, towersDowned: 0, loosePeak: countLooseEnemies(), looseDrainLives: 0, lagReported: false });
  waveMaxHpGainedFromMeat = 0;
  announceActStart(waveIndex);
  trackGameEvent('wave_started', { wave: waveIndex, lives, gold, towers: countActiveTowers(), loose: countLooseEnemies(), unlocked_towers: unlockedTowerTypes.size });
  for(const t of towerPool) if(t.active){ t.waveXp = 0; t.waveLastHits = 0; t.waveAssists = 0; t.waveCleanups = 0; t.waveDamage = 0; t.waveStatPoints = 0; }
  for(const t of towerPool) if(t.active && t.type === 'AXEMAN') t.axeSwitchesLeft = 1;
  playSound('roundStart');
  updateHUD();
}
/* =========================================================
   HUTS, CASTLES AND GRAVES
   ========================================================= */
// CA639 — see HISTORY.md § [1.5.7] Code Archaeology, CA639
function findHutPlacementTile(oldRegion, newRegion){
  if(!activeRegion) return null;
  const candidates = [];
  const blockedPlacementTiles = new Set();
  for(const key of sceneryMap.keys()){
    const [sx, sy] = key.split(',').map(Number);
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) blockedPlacementTiles.add((sx+dx)+','+(sy+dy));
  }
  for(const e of enemyPool) if(e.active && e.isHutBuilding){
    const bx=Math.floor(e.x/TILE_SIZE), by=Math.floor(e.y/TILE_SIZE);
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) blockedPlacementTiles.add((bx+dx)+','+(by+dy));
  }
  for(const t of towerPool) if(t.active) blockedPlacementTiles.add(t.gridX+','+t.gridY);
  const finishTile = pathWaypointTiles[pathWaypointTiles.length-1];
  const eventEndKeys = new Set(randomEventEndTileKeys());
  const newlyOpened = latestExpansionTiles;
  for(const {x:gx,y:gy} of newlyOpened){
    const key = gx+','+gy;
    if(!isInActiveRegion(gx,gy) || pathCells.has(key) || blockedPlacementTiles.has(key)) continue;
    if(finishTile && Math.abs(gx-finishTile.x)+Math.abs(gy-finishTile.y) < 3) continue; // keep camps off the finish approach
    if(!eventEndKeys.has(key)) continue;
    candidates.push([gx,gy]);
  }
  if(!candidates.length) return null;
  const [gx,gy] = candidates[Math.floor(Math.random()*candidates.length)];
  return { x: gx*TILE_SIZE + TILE_SIZE/2, y: gy*TILE_SIZE + TILE_SIZE/2 };
}
// CA640 — see HISTORY.md § [1.5.7] Code Archaeology, CA640
function campLeaderTower(hut){
  if(!hut.campDamageLedger || hut.campDamageLedger.size === 0) return null;
  let best = null, bestAmount = -1;
  for(const [tower, amount] of hut.campDamageLedger){
    if(!tower.active || tower.disabledWavesLeft > 0) continue;
    if(amount > bestAmount || (amount === bestAmount && best && tower.id < best.id)){
      best = tower; bestAmount = amount;
    }
  }
  return best;
}
function spawnHutGuardian(hutRef){
  const e = acquireActive(enemyPool);
  if(!e) return null; // pool exhausted — the hut just has fewer guardians than intended this time rather than blocking anything else
  // CA641 — see HISTORY.md § [1.5.7] Code Archaeology, CA641
  const guardianHpMultiplier = 1.5 + Math.min(3, Math.max(0, waveIndex-1)*0.08);
  e.spawn('GRUNT', guardianHpMultiplier * waveHpScale(waveIndex), false, false); // camp guards scale up gradually instead of opening at triple HP
  e.isGuardian = true;
  e.hutRef = hutRef;
  e.hutAnchorX = hutRef.x; e.hutAnchorY = hutRef.y;
  e.x = hutRef.x + (Math.random()-0.5)*50;
  e.y = hutRef.y + (Math.random()-0.5)*50;
  e.bounty = Math.round(e.bounty * 4); // a real, deliberate reward for clearing a camp — meant to feel worth the detour
  hutRef.guardiansAliveCount = (hutRef.guardiansAliveCount||0) + 1;
  return e;
}
function spawnHut(x, y){
  const hut = acquireActive(enemyPool);
  if(!hut) return null;
  const hutHealthMultiplier = 1.5 + Math.min(6.5, Math.max(0, waveIndex-1)*0.18);
  hut.spawn('GRUNT', hutHealthMultiplier * waveHpScale(waveIndex), false, false); // starts below the former 4x and ramps gradually toward 8x
  hut.emoji = '🛖'; // overridden from GRUNT's own default — this needs to read as a structure, not another enemy
  hut.isHutBuilding = true;
  hut.buildingKind = 'HUT';
  hut.x = x; hut.y = y;
  hut.speed = 0;
  hut.guardiansAliveCount = 0;
  hut.destroyed = false;
  hut.respawnAt = null;
  // CA642 — see HISTORY.md § [1.5.7] Code Archaeology, CA642
  hut.campDamageLedger = new Map();
  hut.bounty = Math.round(hut.bounty * 8); // the big one-time payout for actually clearing the whole camp, not just its guardians
  spawnHutGuardian(hut);
  spawnHutGuardian(hut);
  return hut;
}
function spawnHuts(oldRegion, newRegion){
  const tile = findHutPlacementTile(oldRegion, newRegion);
  if(!tile) return false; // no safe new tile — try again after a later expansion
  return !!spawnHut(tile.x, tile.y);
}
// CA643 — see HISTORY.md § [1.5.7] Code Archaeology, CA643
const CHESS_PIECE_EMOJIS = ['♟','♙','♞','♘','♝','♗','♜','♖','♛','♕','♚','♔'];
function spawnCastleGuardian(castleRef){
  const e = acquireActive(enemyPool);
  if(!e) return null;
  e.spawn('CHESS', 1.4 * waveHpScale(waveIndex), false, false);
  e.emoji = CHESS_PIECE_EMOJIS[Math.floor(Math.random()*CHESS_PIECE_EMOJIS.length)]; // per-instance override of CHESS's own default ♟ — same pattern spawnHut() already uses for 🛖
  e.isGuardian = true;
  e.hutRef = castleRef;
  e.hutAnchorX = castleRef.x; e.hutAnchorY = castleRef.y;
  e.x = castleRef.x + (Math.random()-0.5)*60;
  e.y = castleRef.y + (Math.random()-0.5)*60;
  e.bounty = Math.round(e.bounty * 3);
  castleRef.guardiansAliveCount = (castleRef.guardiansAliveCount||0) + 1;
  return e;
}
// CA644 — see HISTORY.md § [1.5.7] Code Archaeology, CA644
function spawnCastle(x, y){
  const castle = acquireActive(enemyPool);
  if(!castle) return null;
  castle.spawn('GRUNT', 26 * waveHpScale(waveIndex), false, false); // meaningfully tougher than Hut's 16x — the upgrade building, not a reskin
  castle.emoji = '🏰';
  castle.isHutBuilding = true;
  castle.buildingKind = 'CASTLE';
  castle.x = x; castle.y = y;
  castle.speed = 0;
  castle.guardiansAliveCount = 0;
  castle.destroyed = false;
  castle.respawnAt = null;
  castle.campDamageLedger = new Map();
  castle.bounty = Math.round(castle.bounty * 10);
  spawnCastleGuardian(castle);
  spawnCastleGuardian(castle);
  return castle;
}
// CA645 — see HISTORY.md § [1.5.7] Code Archaeology, CA645
function spawnGraveGuardian(graveRef){
  const e = acquireActive(enemyPool);
  if(!e) return null;
  e.spawn('ZOMBIE', 1.2 * waveHpScale(waveIndex), false, false);
  e.isGuardian = true;
  e.hutRef = graveRef;
  e.hutAnchorX = graveRef.x; e.hutAnchorY = graveRef.y;
  e.x = graveRef.x + (Math.random()-0.5)*60;
  e.y = graveRef.y + (Math.random()-0.5)*60;
  e.bounty = Math.round(e.bounty * 3);
  graveRef.guardiansAliveCount = (graveRef.guardiansAliveCount||0) + 1;
  return e;
}
function spawnGrave(x, y){
  const grave = acquireActive(enemyPool);
  if(!grave) return null;
  grave.spawn('GRUNT', 20 * waveHpScale(waveIndex), false, false); // between Hut (16x) and Castle (26x) — its real toughness is the 95% non-Holy damage reduction, not raw HP
  grave.emoji = '🪦';
  grave.isHutBuilding = true;
  grave.buildingKind = 'GRAVE';
  grave.x = x; grave.y = y;
  grave.speed = 0;
  grave.guardiansAliveCount = 0;
  grave.destroyed = false;
  grave.respawnAt = null;
  grave.campDamageLedger = new Map();
  grave.bounty = Math.round(grave.bounty * 8);
  spawnGraveGuardian(grave);
  spawnGraveGuardian(grave);
  return grave;
}
/* =========================================================
   TUTORIAL TIPS, WAVE-CLEAR EVENTS AND LIFE LOSS
   ========================================================= */
// CA646 — see HISTORY.md § [1.5.7] Code Archaeology, CA646
const SEEN_TIPS_KEY = 'sticktd:seenTips:v1';
let seenTutorialTips = new Set();
(function loadSeenTips(){
  try{ seenTutorialTips = new Set(JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) || '[]')); }catch(e){ /* fresh start */ }
})();
function showFirstTimeNotice(id, message){ showTutorialTipOnce(id, message); }
function showTutorialTipOnce(id, message){
  if(seenTutorialTips.has(id)) return;
  seenTutorialTips.add(id);
  try{ localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seenTutorialTips])); }catch(e){ /* private-mode/storage-full — tip just shows again next time, not the end of the world */ }
  showToast(message);
  playSound('wave');
}
function maybeShowWaveTutorialTip(){
  if(wavesCompleted === SAVE_TIP_WAVE) showTutorialTipOnce('save_stopping_point', '💾 Good stopping point. Save from ⚙️ Settings.'); // SAVE-TIP-01 (1.8.45): the first short session ends on a win with a way to keep it
  if(wavesCompleted === 25){
    showTutorialTipOnce('zombies_incoming', '🧟 Zombies arrive at Wave 30 — only Holy damage (Cleric/Pope) hurts them well. Train a Mage\'s INT to 100 to unlock Cleric.');
  }
  if(wavesCompleted === 30){
    showTutorialTipOnce('zombie_graves', '🧟 Zombies are here. Watch for Zombie Graves (🪦) — non-Holy attacks barely scratch them or their guardians.');
  }
}
// CA647 — see HISTORY.md § [1.5.7] Code Archaeology, CA647
const MAX_EXTRA_BUILDINGS_ON_BOARD = 3;
// EVENT-PACING-01 (1.8.25): a random hostile event (wandering troll, extra building, circus) needs a breather behind it, so after one appears the next wave clear brings only peaceful events.
const HOSTILE_EVENT_BREATHER_WAVES = 2;
let lastHostileEventWave = -HOSTILE_EVENT_BREATHER_WAVES;
function runWaveClearRandomEvents(){
  runCircusRoundEnd();
  maybeSpawnBee();
  const trollBefore = trollIsOnBoard();
  maybeSpawnGuaranteedTroll();
  if(!trollBefore && trollIsOnBoard()) lastHostileEventWave = wavesCompleted;
  const hostileAttempts = new Set([maybeSpawnWanderingTroll, maybeSpawnExtraBuilding, maybeSpawnCircus]);
  const attempts = [maybeSpawnWanderingTroll, maybeSpawnChanceStructures, maybeSpawnExtraBuilding, maybeSpawnCircus];
  shuffleArray(attempts); // shuffled order; expansion-wide cap prevents event floods
  for(const attempt of attempts){
    if(randomEventSlotsUsed >= 2) break;
    if(!hostileAttempts.has(attempt)){ attempt(); continue; }
    if(wavesCompleted - lastHostileEventWave < HOSTILE_EVENT_BREATHER_WAVES) continue;
    const slotsBefore = randomEventSlotsUsed, trollWasOnBoard = trollIsOnBoard();
    attempt();
    if(randomEventSlotsUsed > slotsBefore || (!trollWasOnBoard && trollIsOnBoard())) lastHostileEventWave = wavesCompleted;
  }
}
function maybeSpawnExtraBuilding(){
  if(randomEventSlotsUsed >= 2 || waveIndex < 20) return;
  const liveBuildings = enemyPool.filter(e => e.active && e.isHutBuilding && !e.destroyed).length;
  if(liveBuildings >= MAX_EXTRA_BUILDINGS_ON_BOARD) return;
  const chance = Math.min(0.5, 0.08 + (waveIndex - 20) * 0.01); // 8% at wave 20, capped at 50%
  if(Math.random() >= chance) return;
  const tile = findHutPlacementTile();
  if(!tile || !tryClaimRandomEventSlot()) return;
  logGameEvent('random event: extra building');
  if(waveIndex >= 30){
    const roll = Math.random();
    if(roll < 0.40) spawnHut(tile.x, tile.y);
    else if(roll < 0.73) spawnCastle(tile.x, tile.y);
    else spawnGrave(tile.x, tile.y);
  } else if(Math.random() < 0.6) spawnHut(tile.x, tile.y); else spawnCastle(tile.x, tile.y);
}
function loseLife(n){
  if(absorbLeakWithDonutShield()){ spawnParticles(0, 0, '#ffb3d9', 6); playSound('click'); return; }
  lives -= n;
  if(lives <= 0 && hasDefibrillator){
    hasDefibrillator = false;
    lives = Math.max(1, Math.ceil(maxLivesNow() * 0.25));
    showLivesChange(lives);
    playSound('wave');
    trackGameEvent('defibrillator_used', { lives_after: lives });
    updateHUD();
    return;
  }
  if(lives <= 0){ lives = 0; endGame(undefined, 'lives'); }
  updateHUD();
}
/* =========================================================
   TROLLS AND CIRCUS
   ========================================================= */
// LIVESTOCK-01 (1.6.92) — see HISTORY.md § [1.6.92]. Chickens, pigs and cows sometimes appear on a
// map expansion, wander freely within the road and its grass border (same confinement rule as a loose
// enemy: isLooseWalkableAt()/confineLooseEnemyToRoute()), and are harvested with a tap, dropping their
// associated meat item exactly like any other ground-item pickup. They never attack, are never attacked
// by towers, and do not count toward any wave.
const TROLL_ATTACK_RADIUS = 58, TROLL_ATTACK_INTERVAL_MS = 1600, TROLL_ATTACK_DAMAGE = 10, TROLL_AGGRO_RADIUS = 300, TROLL_HUNT_SPEED_MULT = 1.3; // TROLL-HUNT-01 (1.6.116) — see HISTORY.md § [1.6.116]
// CIRCUS-01 (1.7.114): the circus is a peaceful building; every round end it sends out a monkey, an elephant or a clown. Monkeys and elephants use the same mature-pair, next-round birth and three-round rest rules as farm animals; clowns hunt stickmen like the troll.
const LIVESTOCK_TYPES = {
  BEE: { emoji:'🐝', meatId:'HONEY', speed:24, radius:8 },
  CHICKEN: { emoji: '🐔', meatId: 'DRUMSTICK', speed: 18, radius: 10 },
  PIG:     { emoji: '🐷', meatId: 'BACON',     speed: 14, radius: 14 },
  COW:     { emoji: '🐄', meatId: 'STEAK',     speed: 10, radius: 15 },
  MONKEY:  { emoji: '🐒', meatId: 'BANANA',    speed: 20, radius: 11, roundBreeder: true },
  ELEPHANT:{ emoji: '🐘', meatId: 'STEAK',     speed: 9,  radius: 19, roundBreeder: true },
  CLOWN:   { emoji: '🤡', meatId: 'DRUMSTICK', speed: 18, radius: 13, hunter: { attackRadius: CLOWN_ATTACK_RADIUS, attackIntervalMs: CLOWN_ATTACK_INTERVAL_MS, attackDamage: CLOWN_ATTACK_DAMAGE, aggroRadius: CLOWN_AGGRO_RADIUS, speedMult: CLOWN_HUNT_SPEED_MULT, goldBags: 1, label: 'clown' } },
  WANDERING_TROLL: { emoji: '🧌', meatId: 'STEAK', speed: 16, radius: 20.9, isTroll: true, hunter: { attackRadius: TROLL_ATTACK_RADIUS, attackIntervalMs: TROLL_ATTACK_INTERVAL_MS, attackDamage: TROLL_ATTACK_DAMAGE, aggroRadius: TROLL_AGGRO_RADIUS, speedMult: TROLL_HUNT_SPEED_MULT, goldBags: 2, label: 'wandering troll' } }
};
const TROLL_EVENT_CHANCE_PER_WAVE = 0.18;
// TROLL-ENTRANCE-01 (1.8.40): the troll no longer appears on the finish tile and charges. It steps in from the map edge, crosses the bare ground, enters the grass, strolls along the grass rim to a few spots, and only then starts hunting.
const TROLL_ENTRANCE_SPEED_MULT = 2.2, TROLL_RIM_STOPS = 3;
function pickTrollEdgeSpawnPoint(){
  const margin = 24;
  let best = null, bestDistance = Infinity;
  for(let attempt = 0; attempt < 6; attempt++){
    const side = Math.floor(Math.random()*4), along = Math.random();
    const point = side === 0 ? { x: margin, y: along*WORLD_MAX_H } : side === 1 ? { x: WORLD_MAX_W - margin, y: along*WORLD_MAX_H } : side === 2 ? { x: along*WORLD_MAX_W, y: margin } : { x: along*WORLD_MAX_W, y: WORLD_MAX_H - margin };
    const inward = nearestLooseWalkableTileCenter(point.x, point.y);
    const distance = inward ? Math.hypot(inward.x - point.x, inward.y - point.y) : Infinity;
    if(distance < bestDistance){ best = point; bestDistance = distance; }
  }
  return best;
}
function buildTrollEntranceRoute(spot){
  const route = [];
  const entry = nearestLooseWalkableTileCenter(spot.x, spot.y);
  if(!entry) return route;
  route.push(entry);
  const rim = [];
  for(let gy = 0; gy < ROWS; gy++) for(let gx = 0; gx < COLS; gx++){
    if(!isLooseWalkableAt(gx*TILE_SIZE + 1, gy*TILE_SIZE + 1)) continue;
    const open = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => !isLooseWalkableAt((gx+dx)*TILE_SIZE + 1, (gy+dy)*TILE_SIZE + 1));
    if(open) rim.push({ x: gx*TILE_SIZE + TILE_SIZE/2, y: gy*TILE_SIZE + TILE_SIZE/2 });
  }
  let from = entry;
  for(let stop = 0; stop < TROLL_RIM_STOPS && rim.length; stop++){
    const choice = rim.filter(tile => Math.hypot(tile.x - from.x, tile.y - from.y) > TILE_SIZE*1.5);
    const next = (choice.length ? choice : rim)[Math.floor(Math.random()*(choice.length || rim.length))];
    route.push(next); from = next;
  }
  return route;
}
function trollIsOnBoard(){ return enemyPool.some(e => e.active && e.type === 'WANDERING_TROLL'); }
function spawnWanderingTroll(){
  if(!waypointsPx.length) return false;
  const spot = pickTrollEdgeSpawnPoint();
  if(!spot) return false;
  const troll = acquireActive(enemyPool);
  if(!troll) return false;
  tryClaimRandomEventSlot();
  logGameEvent('random event: wandering troll');
  troll.spawn('WANDERING_TROLL', 1, false, false);
  troll.isLivestock = true; troll.isHostileNpc = true;
  troll.x = spot.x; troll.y = spot.y;
  troll.retargetTimer = 0; troll.livestockWalking = false; troll.trollAttackTimer = TROLL_ATTACK_INTERVAL_MS;
  troll.trollRoute = buildTrollEntranceRoute(spot);
  if(trollArrivalsThisRun++ === 0) startTrollCameraPan(troll);
  awardMedal('TROLL_SPOTTER'); // DISCOVERY-MEDALS-01 (1.8.55)
  playSound('troll_arrive', troll.x, undefined, troll.y);
  spawnFloatingText(troll.x, troll.y - troll.radius - 22, '🧌 Troll!', '#ffb74d');
  showFirstTimeNotice('first_troll', '🧌 A Wandering Troll has arrived. It hunts nearby stickmen, so keep it inside the range of your strongest towers. One arrives every fifth round.');
  return true;
}
// CIRCUS-01 (1.7.114)
const CIRCUS_MIN_WAVE = 3, CIRCUS_CHANCE_PER_WAVE = 0.14, CIRCUS_HEALTH_MULTIPLIER = 6, CIRCUS_EXTRA_LIVESTOCK_CAP = 4, CIRCUS_MAX_CLOWNS = 3;
const CIRCUS_PERFORMER_WEIGHTS = [['MONKEY', 0.4], ['ELEPHANT', 0.3], ['CLOWN', 0.3]];
function spawnCircus(x, y){
  const circus = acquireActive(enemyPool);
  if(!circus) return null;
  circus.spawn('GRUNT', CIRCUS_HEALTH_MULTIPLIER * waveHpScale(waveIndex), false, false);
  circus.emoji = '🎪';
  circus.isHutBuilding = true; circus.buildingKind = 'CIRCUS';
  circus.x = x; circus.y = y; circus.speed = 0;
  circus.guardiansAliveCount = 0; circus.destroyed = false; circus.respawnAt = null;
  circus.campDamageLedger = new Map();
  circus.bounty = Math.round(circus.bounty * 6);
  return circus;
}
/* =========================================================
   SIZE AND FAMILY TIERS
   ========================================================= */
const CAMPAIGN_WAVE_COUNT = 100;
const SIZE_TIER_ORDER = ['TINY', 'SMALL', 'STANDARD', 'LARGE', 'BOSS'];
// CA625 — see HISTORY.md § [1.5.7] Code Archaeology, CA625
const SIZE_TIER_BANDS = {
  TINY:     { label:'Tiny',     radiusMin:6,  radiusMax:10, speedMin:50, speedMax:60, hpMult:0.7, bountyMult:0.9, xp:17, batchGapMs:380 },
  SMALL:    { label:'Small',    radiusMin:11, radiusMax:13, speedMin:41, speedMax:49, hpMult:1.3, bountyMult:1.5, xp:20, batchGapMs:500 },
  STANDARD: { label:'Standard', radiusMin:14, radiusMax:19, speedMin:30, speedMax:40, hpMult:2.0,  bountyMult:2.2, xp:25, batchGapMs:650 },
  LARGE:    { label:'Large',    radiusMin:21, radiusMax:30, speedMin:20, speedMax:29, hpMult:5.6,  bountyMult:3.5, xp:40, batchGapMs:900 },
  BOSS:     { label:'Boss',     radiusMin:44, radiusMax:52, speedMin:8,  speedMax:13, hpMult:1.0,  bountyMult:2.2, xp:50, batchGapMs:2200 }
};
const SIZE_PHASE_BANNERS = {
  TINY:'🐜 TINY HORDE INCOMING', SMALL:'⚔️ SMALL ENEMIES INCOMING', STANDARD:'🛡️ STANDARD GUARD',
  LARGE:'😡 LARGE ENEMIES APPROACHING', BOSS:'👹 BOSS APPROACHING'
};
const FAMILY_INTRODUCTION_WAVE = {
  GRUNT:1, SWARM:6, BOSS:10, WOLF:11, RUNNER:16, SPLITTER:21, FIRE:26, ICE:31, HEALER:36, SHIELDED:41,
  SKELETON:46, WRAITH:51, TANK:56, TROLL:61, ZOMBIE:30, REAPER:71, BOULDER:76, MONARCH:86, SANTA:CAMPAIGN_WAVE_COUNT
};
const FAMILY_TIER_ELIGIBILITY = {
  GRUNT:['TINY','SMALL','STANDARD','LARGE'], SWARM:['TINY','SMALL'], WOLF:['TINY','SMALL','STANDARD','LARGE'],
  RUNNER:['TINY','SMALL','STANDARD','LARGE'], SPLITTER:['SMALL','STANDARD','LARGE'], FIRE:['TINY','SMALL','STANDARD','LARGE'],
  ICE:['TINY','SMALL','STANDARD','LARGE'], HEALER:['SMALL','STANDARD','LARGE'], SHIELDED:['SMALL','STANDARD','LARGE'],
  SKELETON:['TINY','SMALL','STANDARD','LARGE'], WRAITH:['TINY','SMALL','STANDARD','LARGE'], TANK:['STANDARD','LARGE'],
  TROLL:['STANDARD','LARGE'], ZOMBIE:['SMALL','STANDARD','LARGE'], REAPER:['STANDARD','LARGE'], BOULDER:['STANDARD','LARGE'],
  MONARCH:['TINY','SMALL'], BOSS:['BOSS'], SANTA:['BOSS']
};
const FAMILY_NATIVE_TIER = { SWARM:'TINY', MONARCH:'TINY', BOSS:'BOSS' };
// EARLY-HOOK-01 (1.8.41): the first minutes escape an all-Grunt run. Wave 1 stays the gentle one-at-a-time Tiny lesson, wave 2 mixes Small Grunts in, a new kind of enemy
// guests every few waves ahead of its own chapter (a share of eligible Tiny and Small slots), wave 4 ends on Standard-size champion Grunts,
// and waves 1 and 2 never rush the spawn gaps; OPENING-PACE-01 (1.8.43) keeps those gaps short so the opening stays busy.
const EARLY_PREVIEW_BY_WAVE = Object.freeze({ 2: ['SWARM', 0.15], 3: ['SWARM', 0.25], 4: ['WOLF', 0.15], 5: ['WOLF', 0.2], 7: ['RUNNER', 0.15], 8: ['RUNNER', 0.2] });
const EARLY_NO_RUSH_LAST_WAVE = 2;
function earlyPreviewFamily(waveNumber){ return EARLY_PREVIEW_BY_WAVE[waveNumber] ? EARLY_PREVIEW_BY_WAVE[waveNumber][0] : null; }
// ENEMY-EMOJI-VARIETY-01 (1.8.41): Grunts and Swarm pick one of several faces per unit from the wave seed, so a wave reads as a crowd, not clones.
const ENEMY_EMOJI_VARIANTS = Object.freeze({ SWARM: ['🐜', '🪲'] }); // GRUNT-ONE-FACE-01 (1.8.53): a Grunt is always 😡, like every other enemy keeps its one emoji
const EARLY_WAVE_POPULATION = [
  null,
  { TINY:10 }, { TINY:18, SMALL:6 }, { TINY:36, SMALL:4 }, { TINY:45, SMALL:9, STANDARD:1 }, { TINY:54, SMALL:12, LARGE:8 },
  { TINY:63, SMALL:15, STANDARD:2 }, { TINY:72, SMALL:18, STANDARD:3 }, { TINY:81, SMALL:21, STANDARD:4 },
  { TINY:90, SMALL:24, STANDARD:5 }, { TINY:100, SMALL:27, STANDARD:6, LARGE:16, BOSS:1 },
  { TINY:108, SMALL:30, STANDARD:7 }, { TINY:117, SMALL:33, STANDARD:8 }, { TINY:126, SMALL:36, STANDARD:9 },
  { TINY:135, SMALL:39, STANDARD:10 }, { TINY:144, SMALL:45, STANDARD:12, LARGE:25 }
];
const EXPEDITION_THEMES = [
  { label:'🌾 FARM EXPEDITION', families:['GRUNT','SWARM','MONARCH','WOLF'] },
  { label:'🐜 SWARM EXPEDITION', families:['SWARM','MONARCH','RUNNER'] },
  { label:'🧟 UNDEAD EXPEDITION', families:['SKELETON','ZOMBIE','WRAITH','REAPER'] },
  { label:'🔥 ELEMENTAL EXPEDITION', families:['FIRE','ICE'] },
  { label:'🛡️ ARMORED EXPEDITION', families:['SHIELDED','TANK','BOULDER'] },
  { label:'🦠 SPLITTER EXPEDITION', families:['SPLITTER','BOULDER'] },
  { label:'💉 SUSTAIN EXPEDITION', families:['HEALER','TROLL','SHIELDED'] },
  { label:'🐺 VANGUARD EXPEDITION', families:['WOLF','RUNNER','WRAITH'] }
];
const FARM_THEME_INDEX = 0;
const WAVE_POSITION_LABELS = ['Introduction', 'Reinforcement', 'Combination', 'Farming', 'Mastery'];
/* =========================================================
   WAVE PLAN AND DISPATCH
   ========================================================= */
// CA220 — see HISTORY.md § [1.5.7] Code Archaeology, CA220
const WAVE_COUNTDOWN_MS = 3000;
const WAVE_COUNTDOWN_GO_HOLD_MS = 500; // how long the "GO!" label lingers after the 3-2-1 finishes, before drawWaveCountdown() stops drawing it — hoisted here (was a local const inside drawWaveCountdown()) so loop()'s real-time countdown advance uses the exact same upper bound
// CA246 — see HISTORY.md § [1.5.7] Code Archaeology, CA246
const WAVE_CLEAR_XP_BASE = 8, WAVE_CLEAR_XP_PER_WAVE = 1.5;
let waveRunSeed = runSeedFor(0xA3);
const ESCAPE_WALKBACK_MAX_TILES = 4, LOOSE_SETTLE_MIN_MS = 20000, LOOSE_SETTLE_SPREAD_MS = 10000; // LOOSE-SETTLE-01 (1.8.37)
const LIVESTOCK_AVOID_MARGIN_PX = 26, LIVESTOCK_AVOID_STRENGTH = 2.2;
let activeWavePlan = null;
const waveDispatch = { phaseIndex:0, batchIndex:0, unitIndex:0, unitGapRemainingMs:0, gapRemainingMs:0, resolvedUnits:0, batchEnemies:[], batchSerials:[], releaseHoldMs:0 };
// CA626 — see HISTORY.md § [1.5.7] Code Archaeology, CA626
const BATCH_RELEASE_SPACING_PX = 240, BATCH_RELEASE_MAX_HOLD_MS = 6000; // RELEASE-HOLD-CAP-01 (1.8.64): a batch fighting a stickman at the entrance holds the next batch at most 6 s of game time, so a melee stickman near the spawn no longer freezes the wave
// CA627 — see HISTORY.md § [1.5.7] Code Archaeology, CA627
// A size phase clears before the next size phase enters.
function routeLengthPx(){ return routeTotalLength(); }
function currentBatchReleased(){
  for(let i = 0; i < waveDispatch.batchEnemies.length; i++){
    const e = waveDispatch.batchEnemies[i];
    if(e.spawnSerial !== waveDispatch.batchSerials[i] || !e.active || e.escaped) continue;
    if(e.traveled < BATCH_RELEASE_SPACING_PX) return false; // still bunched near the entrance
  }
  return true;
}
function createSeededRandom(seed){
  let state = seed >>> 0;
  return function nextSeededRandom(){
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function waveSeedFor(runSeed, waveNumber){
  return (Math.imul(runSeed ^ 0x9E3779B9, 2654435761) + Math.imul(waveNumber, 40503)) >>> 0;
}
function seededIntBetween(rng, min, max){ return min + Math.floor(rng() * (max - min + 1)); }
function isMasteryWave(waveNumber){ return waveNumber % 5 === 0; }
// WAVE-FORMATION-01 (1.7.36): every wave from the second on is dealt in one of six formations, so waves stop arriving as the same even drip.
// Formations only change the rhythm inside a size phase (batch sizes, gaps between batches and whether a family travels in convoys); phases stay in ascending
// size order, the units, XP and gold budgets are untouched, wave 1 and the boss phase never change, and total spawn time stays close to the steady pacing.
const WAVE_TEMPO_GAP_FACTOR = 0.75;
const WAVE_FORMATIONS = ['STEADY', 'SURGE', 'TRICKLE', 'PULSE', 'BUILD', 'IRREGULAR'];
function waveFormationFor(waveNumber){
  if(waveNumber <= 1) return 'STEADY';
  let previous = 'STEADY';
  for(let n = 2; n <= waveNumber; n++){
    const roll = createSeededRandom(waveSeedFor(waveRunSeed, n) ^ 0x9e3779b9)();
    let index = Math.floor(roll * WAVE_FORMATIONS.length);
    if(WAVE_FORMATIONS[index] === previous) index = (index + 1 + Math.floor(createSeededRandom(waveSeedFor(waveRunSeed, n) ^ 0x85ebca6b)() * (WAVE_FORMATIONS.length - 1))) % WAVE_FORMATIONS.length;
    previous = WAVE_FORMATIONS[index];
  }
  return previous;
}
function formationBatchShape(formation, minBatch, maxBatch, batchNumber, progress, rng){
  switch(formation){
    case 'SURGE': return { size: seededIntBetween(rng, Math.ceil(minBatch*1.5), Math.ceil(maxBatch*1.7)), gap: 1.5 };
    case 'TRICKLE': return { size: seededIntBetween(rng, 1, Math.max(2, Math.ceil(minBatch*0.5))), gap: 0.7 };
    case 'PULSE': return batchNumber % 2 === 0 ? { size: maxBatch, gap: 1.4 } : { size: minBatch, gap: 0.6 };
    case 'BUILD': return { size: Math.round(minBatch + (maxBatch - minBatch)*progress), gap: 1.3 - 0.6*progress };
    case 'IRREGULAR': return { size: seededIntBetween(rng, minBatch, maxBatch), gap: 0.6 + rng() };
    default: return { size: seededIntBetween(rng, minBatch, maxBatch), gap: 1 };
  }
}
function buildWavePlan(waveNumber){
  const seed = waveSeedFor(waveRunSeed, waveNumber);
  const rng = createSeededRandom(seed);
  const population = tierPopulationForWave(waveNumber);
  const chapterFamily = chapterFamilyForWave(waveNumber);
  const position = (waveNumber - 1) % 5;
  const learned = learnedFamiliesForWave(waveNumber);
  const olderFamilies = learned.filter(family => family !== chapterFamily);
  const partnerFamily = position === 2 && olderFamilies.length ? olderFamilies[Math.floor(rng() * olderFamilies.length)] : null;
  const themeIndex = waveNumber > CAMPAIGN_WAVE_COUNT ? expeditionThemeIndex(waveNumber) : -1;
  const emphasisFamilies = themeIndex >= 0 ? EXPEDITION_THEMES[themeIndex].families : null;
  const introTier = chapterFamily && position === 0
    ? (FAMILY_NATIVE_TIER[chapterFamily] || (population.STANDARD > 0 ? 'STANDARD' : FAMILY_TIER_ELIGIBILITY[chapterFamily][0]))
    : null;
  const phases = [];
  const waveFormation = waveFormationFor(waveNumber);
  let xpBudget = 0, goldBudget = 0, uniqueId = 0;
  for(const sizeTier of SIZE_TIER_ORDER){
    const tierCount = population[sizeTier];
    if(!tierCount) continue;
    const band = SIZE_TIER_BANDS[sizeTier];
    const units = [];
    const introSlots = sizeTier === introTier ? (chapterFamily === 'GRUNT' ? tierCount : introductionSlotCount(tierCount)) : 0;
    const weights = sizeTier === 'BOSS' ? [{ family: (waveNumber === CAMPAIGN_WAVE_COUNT || (stealthRun && waveNumber===10) ? 'SANTA' : 'BOSS'), weight:1 }] : familyWeightsForTier(waveNumber, sizeTier, partnerFamily, emphasisFamilies);
    for(let i = 0; i < tierCount; i++){
      let family = i < introSlots ? chapterFamily : (weights.length ? pickWeightedFamily(rng, weights) : 'GRUNT');
      const preview = EARLY_PREVIEW_BY_WAVE[waveNumber];
      if(preview && i >= introSlots && (sizeTier === 'TINY' || sizeTier === 'SMALL') && FAMILY_TIER_ELIGIBILITY[preview[0]].includes(sizeTier) && rng() < preview[1]) family = preview[0];
      units.push({ uniqueId: uniqueId++, family, sizeTier, sizeJitter: rng(), phaseIndex: phases.length, batchIndex: 0 });
      xpBudget += band.xp;
      goldBudget += Math.max(1, Math.round(CONFIG.ENEMIES[family].bounty * band.bountyMult));
    }
    for(let i = units.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
    const [minBatch, maxBatch] = batchSizeRangeForWave(waveNumber, sizeTier);
    const batches = [];
    const formation = (sizeTier === 'BOSS' || waveNumber <= 1) ? 'STEADY' : waveFormation;
    if(formation !== 'STEADY' && rng() < 0.5){ // convoys: units of one family travel together
      const byFamily = new Map();
      for(const unit of units){ if(!byFamily.has(unit.family)) byFamily.set(unit.family, []); byFamily.get(unit.family).push(unit); }
      units.length = 0;
      for(const group of byFamily.values()) units.push(...group);
    }
    for(let cursor = 0; cursor < units.length;){
      const shape = formationBatchShape(formation, minBatch, maxBatch, batches.length, cursor / units.length, rng);
      const size = Math.max(1, Math.min(units.length - cursor, shape.size));
      const batchUnits = units.slice(cursor, cursor + size);
      for(const unit of batchUnits) unit.batchIndex = batches.length;
      batches.push({ batchIndex: batches.length, units: Object.freeze(batchUnits), presentationGapMs: band.batchGapMs * shape.gap });
      cursor += size;
    }
    const tempoFactor = (sizeTier === 'BOSS' || waveNumber <= 1) ? 1 : WAVE_TEMPO_GAP_FACTOR; // TEMPO-01 (1.7.36): owner says the tempo is weak and too easy, so batches arrive closer together
    if(formation !== 'STEADY' && batches.length > 1){
      const steadyTotal = Math.ceil(units.length / ((minBatch + maxBatch) / 2)) * band.batchGapMs;
      const actualTotal = batches.reduce((sum, batch) => sum + batch.presentationGapMs, 0);
      const scale = Math.max(0.3, Math.min(1.6, steadyTotal / actualTotal));
      for(const batch of batches) batch.presentationGapMs = Math.max(120, Math.round(batch.presentationGapMs * scale));
    }
    if(tempoFactor !== 1) for(const batch of batches) batch.presentationGapMs = Math.max(120, Math.round(batch.presentationGapMs * tempoFactor));
    phases.push({ sizeTier, totalUnits: tierCount, batches: Object.freeze(batches) });
  }
  const little = population.TINY + population.SMALL;
  const big = population.LARGE + population.BOSS;
  return Object.freeze({
    waveNumber, seed, formation: waveFormation, phases: Object.freeze(phases), xpBudget, goldBudget,
    populationTotal: little + population.STANDARD + big,
    littleToBigRatio: big ? little / big : Infinity,
    newFamilyIntroduced: position === 0 ? chapterFamily : null,
    label: themeIndex >= 0 ? EXPEDITION_THEMES[themeIndex].label
      : (chapterFamily ? (CONFIG.ENEMIES[chapterFamily].emoji + ' ' + chapterFamily + ' · ' + WAVE_POSITION_LABELS[position]) : ('⚔️ MASTERY · ' + WAVE_POSITION_LABELS[position]))
  });
}
function expectedXpBudget(waveNumber){
  const population = tierPopulationForWave(waveNumber);
  let total = 0;
  for(const sizeTier of SIZE_TIER_ORDER) total += population[sizeTier] * SIZE_TIER_BANDS[sizeTier].xp;
  return total;
}
function validateWavePlan(plan){
  const problems = [];
  const where = 'wave ' + plan.waveNumber;
  let lastTierRank = -1;
  for(const phase of plan.phases){
    const rank = SIZE_TIER_ORDER.indexOf(phase.sizeTier);
    if(rank <= lastTierRank) problems.push(where + ': phase ' + phase.sizeTier + ' out of ascending size order');
    lastTierRank = rank;
    for(const batch of phase.batches){
      if(!batch.units.length) problems.push(where + ': empty batch in ' + phase.sizeTier);
      for(const unit of batch.units){
        if(unit.sizeTier !== phase.sizeTier) problems.push(where + ': unit tier ' + unit.sizeTier + ' inside ' + phase.sizeTier + ' phase');
        if(!FAMILY_TIER_ELIGIBILITY[unit.family] || !FAMILY_TIER_ELIGIBILITY[unit.family].includes(unit.sizeTier)) problems.push(where + ': ' + unit.family + ' not eligible for ' + unit.sizeTier);
        if(FAMILY_INTRODUCTION_WAVE[unit.family] > plan.waveNumber && earlyPreviewFamily(plan.waveNumber) !== unit.family && !(stealthRun && plan.waveNumber===10 && unit.family==='SANTA' && phase.sizeTier==='BOSS')) problems.push(where + ': ' + unit.family + ' appears before its introduction wave');
      }
    }
  }
  const population = tierPopulationForWave(plan.waveNumber);
  const big = population.LARGE + population.BOSS;
  if(big && population.TINY + population.SMALL < 5 * big) problems.push(where + ': fewer than 5 little enemies per big enemy');
  if(big && !isMasteryWave(plan.waveNumber)) problems.push(where + ': Large/Boss enemies on a non-mastery wave');
  if(Math.abs(plan.xpBudget - expectedXpBudget(plan.waveNumber)) > expectedXpBudget(plan.waveNumber) * 0.05) problems.push(where + ': XP budget outside ±5%');
  if(plan.waveNumber === 1){
    const tinyPhase = plan.phases[0];
    if(!tinyPhase || tinyPhase.sizeTier !== 'TINY' || tinyPhase.totalUnits !== tierPopulationForWave(1).TINY || tinyPhase.batches.some(b => b.units.length !== 1)) problems.push('wave 1: must be sequential single Tiny batches, 15 on a starting road (10 times ENEMY_COUNT_MULTIPLIER) and more on a longer one');
  }
  return problems;
}
function validateSizeTierBands(){
  const problems = [];
  for(let i = 1; i < SIZE_TIER_ORDER.length; i++){
    const smaller = SIZE_TIER_BANDS[SIZE_TIER_ORDER[i-1]], larger = SIZE_TIER_BANDS[SIZE_TIER_ORDER[i]];
    if(larger.speedMax >= smaller.speedMin) problems.push(SIZE_TIER_ORDER[i] + ' speed band overlaps ' + SIZE_TIER_ORDER[i-1]);
    if(larger.radiusMin <= smaller.radiusMax) problems.push(SIZE_TIER_ORDER[i] + ' radius band overlaps ' + SIZE_TIER_ORDER[i-1]);
    if(larger.xp <= smaller.xp) problems.push(SIZE_TIER_ORDER[i] + ' XP not above ' + SIZE_TIER_ORDER[i-1]);
  }
  return problems;
}
function waveHpScale(waveNumber){
  const chapterIndex = Math.floor((waveNumber - 1) / 5);
  // CA629 — see HISTORY.md § [1.5.7] Code Archaeology, CA629
  return 1 + chapterIndex * 0.9 + ((waveNumber - 1) % 5) * 0.09;
}
function isRouteObligation(enemy){ return enemy.active && !enemy.escaped && !enemy.isGuardian && !enemy.isHutBuilding && !enemy.isLivestock; }
function waveRouteObligationsOutstanding(){
  for(const e of enemyPool) if(isRouteObligation(e)) return true;
  return false;
}
function routeObligationCount(){
  let count = 0;
  for(const e of enemyPool) if(isRouteObligation(e)) count++;
  return count;
}
function resetWaveDispatch(){
  activeWavePlan = null;
  waveDispatch.phaseIndex = 0; waveDispatch.batchIndex = 0; waveDispatch.unitIndex = 0;
  waveDispatch.gapRemainingMs = 0; waveDispatch.unitGapRemainingMs = 0; waveDispatch.resolvedUnits = 0; waveDispatch.releaseHoldMs = 0;
  waveDispatch.batchEnemies.length = 0; waveDispatch.batchSerials.length = 0;
}
// CA630 — see HISTORY.md § [1.5.7] Code Archaeology, CA630
let lastSpawnedEnemy = null;
let lastSpawnedSerial = 0;
let enemySpawnSerial = 0;
function spawnWaveUnit(spec){
  const incomingRadius = SIZE_TIER_BANDS[spec.sizeTier].radiusMax;
  if(lastSpawnedEnemy && lastSpawnedEnemy.spawnSerial === lastSpawnedSerial && lastSpawnedEnemy.active && !lastSpawnedEnemy.escaped && !lastSpawnedEnemy.isBreakaway){
    if(lastSpawnedEnemy.traveled < enemySpawnClearance(lastSpawnedEnemy.radius, incomingRadius)) return false;
  }
  const e = acquireActive(enemyPool);
  if(!e) return false;
  const isStealthSanta=stealthRun && waveIndex===10 && spec.family==='SANTA';
  const strengthWave=isStealthSanta?CAMPAIGN_WAVE_COUNT:waveIndex;
  const hpScale = waveHpScale(strengthWave) * (spec.sizeTier === 'BOSS' ? bossHpScale(strengthWave) : 1) * (strengthWave === 1 ? WAVE_ONE_HP_SCALE : 1);
  e.spawn(spec.family, hpScale, false, false);
  e.applySizeTier(spec.sizeTier, spec.sizeJitter, hpScale);
  const emojiVariants = ENEMY_EMOJI_VARIANTS[spec.family];
  if(emojiVariants) e.emoji = emojiVariants[Math.floor(spec.sizeJitter * 997) % emojiVariants.length];
  e.isStealthSanta=isStealthSanta;
  if(isStealthSanta) stealthSantaSpawned=true;
  if(spec.sizeTier === 'LARGE') spawnFloatingText(e.x, e.y - e.radius - 14, 'BIG!', '#ffd700');
  if(roundEnemyFollow && !roundEnemyFollow.enemy){
    roundEnemyFollow.enemy = e; roundEnemyFollow.serial = e.spawnSerial; roundEnemyFollow.lastClock = cameraPanClock;
  }
  if(e.type==='TROLL'){e.radius*=1.1;startTrollCameraPan(e);}
  maybeMakeElite(e, spec);
  lastSpawnedEnemy = e;
  lastSpawnedSerial = e.spawnSerial;
  return true;
}
// ELITE-ENEMIES-01 (1.8.62): from wave 8 a few Small, Standard and Large enemies spawn as elites with one modifier, shown by a coloured patch on the ground
// under them, the same colour everywhere so the colour teaches the counter (Diablo's palette-swapped monsters): blue Swift moves faster, gold Tough has double
// health, red Fierce hits stickmen harder. Elites pay double bounty. The chance starts at 3% and grows a little each wave, up to 8%.
const ELITE_FIRST_WAVE = 8, ELITE_BASE_CHANCE = 0.03, ELITE_CHANCE_PER_WAVE = 0.0005, ELITE_MAX_CHANCE = 0.08;
const ELITE_KINDS = Object.freeze({
  SWIFT: { label: 'Swift', color: '#4fc3f7' },
  TOUGH: { label: 'Tough', color: '#ffca28' },
  FIERCE: { label: 'Fierce', color: '#ff7043' }
});
const ELITE_KIND_IDS = Object.keys(ELITE_KINDS);
function maybeMakeElite(enemy, spec){
  if(waveIndex < ELITE_FIRST_WAVE || !['SMALL','STANDARD','LARGE'].includes(spec.sizeTier) || spec.family === 'SANTA' || spec.family === 'BOSS') return;
  if(Math.random() >= Math.min(ELITE_MAX_CHANCE, ELITE_BASE_CHANCE + ELITE_CHANCE_PER_WAVE * (waveIndex - ELITE_FIRST_WAVE))) return;
  const kind = ELITE_KIND_IDS[Math.floor(Math.random() * ELITE_KIND_IDS.length)];
  enemy.eliteKind = kind;
  if(kind === 'SWIFT') enemy.speed *= 1.35;
  else if(kind === 'TOUGH'){ enemy.maxHp = Math.round(enemy.maxHp * 2); enemy.hp = enemy.maxHp; }
  else enemy.breakDamage = Math.round((enemy.breakDamage || 0) * 1.6);
  enemy.bounty = Math.round(enemy.bounty * 2);
  spawnFloatingText(enemy.x, enemy.y - enemy.radius - 14, 'Elite: ' + ELITE_KINDS[kind].label, ELITE_KINDS[kind].color);
  showFirstTimeNotice('first_elite', '⭐ Elite enemies stand on a coloured patch: blue is Swift, gold is Tough, red is Fierce. They pay double gold.');
}
function drawEliteGroundPatch(ctx, enemy){
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = ELITE_KINDS[enemy.eliteKind].color;
  ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.72, enemy.radius * 1.15, enemy.radius * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// ENEMY-STARTLE-01 (1.8.55): small enemies near an ally that dies give a short startled hop, a group reaction that reads as awareness (Diablo's Fallen, Isbister's enemy moments). Drawing only; movement and timing are unchanged.
const ENEMY_STARTLE_MS = 320, ENEMY_STARTLE_RADIUS_PX = 46;
function startleNearbyAllies(fallen){
  for(const ally of enemyPool){
    if(!ally.active || ally === fallen || ally.isLivestock || ally.isHutBuilding || (ally.sizeTier !== 'TINY' && ally.sizeTier !== 'SMALL')) continue;
    if(Math.abs(ally.x - fallen.x) > ENEMY_STARTLE_RADIUS_PX || Math.abs(ally.y - fallen.y) > ENEMY_STARTLE_RADIUS_PX) continue;
    if(Math.hypot(ally.x - fallen.x, ally.y - fallen.y) <= ENEMY_STARTLE_RADIUS_PX) ally.startledUntil = presentationTime + ENEMY_STARTLE_MS;
  }
}
// OPENING-SPAWN-GAP-01 (1.8.69): slow walkers left the entrance only every ~3.3 s, the real limit on early wave length; waves up to OPENING_FLOW_LAST_WAVE keep an 8 px gap instead of 24
const SPAWN_GAP_PX = 24, OPENING_SPAWN_GAP_PX = 8;
function enemySpawnClearance(previousRadius, incomingRadius){
  // The gap is a visible space between bodies after accounting for both enemy radii.
  const gapPx = waveIndex <= OPENING_FLOW_LAST_WAVE ? OPENING_SPAWN_GAP_PX : SPAWN_GAP_PX;
  return previousRadius + incomingRadius + gapPx;
}
/* =========================================================
   ENEMY CLASS
   ========================================================= */
// MELEE-SURROUND-01: reserve stable body-separated positions; outer rings wait.
function enemySurroundPoint(enemy,target){
  if(target.type === 'BARRICADE') return null;
  if(enemy.surroundTarget !== target || enemy.surroundTargetId !== target.id || enemy.surroundOwnerId !== enemy.id){
    enemy.surroundTarget=target;enemy.surroundTargetId=target.id;enemy.surroundOwnerId=enemy.id;
    const preferred=Math.atan2(enemy.y-target.y,enemy.x-target.x),radius=Math.max(26,enemy.radius*1.75+12);
    let chosen=false;
    for(let ring=0;ring<20 && !chosen;ring++){
      const r=radius+ring*(enemy.radius*2+8),slots=Math.max(6,Math.floor(Math.PI*2*r/(enemy.radius*2+8)));
      for(let n=0;n<slots;n++){
        const angle=preferred+n*Math.PI*2/slots,x=Math.cos(angle)*r,y=Math.sin(angle)*r;
        let free=true;
        for(const other of enemyPool){
          if(other===enemy || !other.active || other.surroundTarget!==target || other.surroundTargetId!==target.id || other.surroundOwnerId!==other.id) continue;
          if(other.breakawayTarget!==target && other.escapedAttackTarget!==target && other.attackBumpTarget!==target && !(other.isGuardian && other.hutRef && campLeaderTower(other.hutRef)===target)) continue;
          if(Math.hypot(x-other.surroundX,y-other.surroundY)<enemy.radius+other.radius+8){free=false;break;}
        }
        if(free){enemy.surroundX=x;enemy.surroundY=y;enemy.surroundWaiting=ring>0;chosen=true;break;}
      }
    }
    if(!chosen){enemy.surroundX=Math.cos(preferred)*radius*21;enemy.surroundY=Math.sin(preferred)*radius*21;enemy.surroundWaiting=true;}
  }
  // Reuse enemy fields instead of allocating destinations each tick.
  return enemy;
}
const looseEnemyGlowSprites = new Map(), LOOSE_GLOW_PULSE_STEPS = 8, LOOSE_GLOW_SPRITE_MAX = 96;
function looseEnemyGlowSprite(enemyRadius, glowPulse){
  const radiusKey = Math.round(enemyRadius), pulseStep = Math.round(glowPulse*LOOSE_GLOW_PULSE_STEPS), key = radiusKey*64 + pulseStep;
  let entry = looseEnemyGlowSprites.get(key);
  if(entry) return entry;
  const pulse = pulseStep/LOOSE_GLOW_PULSE_STEPS, glowRadius = radiusKey*2.6 + pulse*3, side = Math.ceil(glowRadius*2);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = side;
  const spriteCtx = canvas.getContext('2d'), halo = spriteCtx.createRadialGradient(side/2, side/2, radiusKey*0.4, side/2, side/2, glowRadius);
  halo.addColorStop(0, 'rgba(255,50,50,' + (0.42 + 0.18*pulse).toFixed(2) + ')');
  halo.addColorStop(0.55, 'rgba(255,60,60,' + (0.16 + 0.08*pulse).toFixed(2) + ')');
  halo.addColorStop(1, 'rgba(255,60,60,0)');
  spriteCtx.fillStyle = halo; spriteCtx.fillRect(0, 0, side, side);
  if(looseEnemyGlowSprites.size >= LOOSE_GLOW_SPRITE_MAX) looseEnemyGlowSprites.delete(looseEnemyGlowSprites.keys().next().value);
  entry = { canvas, radius: side/2 };
  looseEnemyGlowSprites.set(key, entry);
  return entry;
}
class Enemy{
  constructor(){ this.active = false; }
  // Weight is a readable size-scale stat: radius 15 is the standard 1.0 reference.
  // Enemy family and wave-size radius changes therefore update weight automatically.
  get weight(){ return Math.max(0.25, (this.radius || 15) / 15); }
  get constitution(){ return this.maxHp; }
  spawn(type, hpMultiplier, isBig, isMini){
    if(markedTargetEnemy === this) setMarkedTarget(null);
    this.deathResolved = false;
    this.damageHitCount = 0;
    this.renderPrevX=undefined;this.renderPrevY=undefined;this.renderPrevTraveled=undefined;
    enemyPresenceDirty = true;
    const def = CONFIG.ENEMIES[type];
    this.id = idCounter++;
    this.pinPaintedId=-1;this.pinTopDeviceY=undefined;
    this.type = type;
    this.emoji = def.emoji;
    this.startledUntil = 0;
    this.eliteKind = null;
    this.armor = def.armor;
    this.maxHp = Math.round(def.baseHp * hpMultiplier);
    this.hp = this.maxHp;
    this.speed = def.speed * ENEMY_WALK_SPEED_SCALE; // ENEMY-PACE-01 (1.6.79) — see HISTORY.md § [1.6.79]
    this.bounty = def.bounty;
    this.radius = def.radius;
    this.embeddedArrows = [];
    this.isBig = !!isBig;
    this.isMini = !isBig && !!isMini; // mutually exclusive with isBig — a spawn roll only ever picks one variant, never both
    if(this.isBig){
      this.maxHp = Math.round(this.maxHp * 1.2);
      this.hp = this.maxHp;
      this.radius = Math.round(this.radius * 1.4);
      this.bounty = Math.round(this.bounty * 1.4);
      this.speed = this.speed * 1.2;
    } else if(this.isMini){
      // CA269 — see HISTORY.md § [1.5.7] Code Archaeology, CA269
      this.maxHp = Math.max(1, Math.round(this.maxHp * 0.35));
      this.hp = this.maxHp;
      this.radius = Math.max(5, Math.round(this.radius * 0.55));
      this.bounty = Math.max(1, Math.round(this.bounty * 0.3));
      this.speed = this.speed * 1.1; // a touch quicker — skitters rather than plods, reads as "small" on its own even before the radius difference registers
    } else {
      // CA270 — see HISTORY.md § [1.5.7] Code Archaeology, CA270
      const sizeRoll = 0.88 + Math.random()*0.24; // 88%-112% of the type's base radius
      this.radius = Math.max(6, Math.round(this.radius * sizeRoll));
      const sizeFrac = (sizeRoll - 0.88) / 0.24; // 0 (smallest) .. 1 (largest), normalized for the formulas below
      const hpMult = 0.9 + sizeFrac*0.2;     // 0.9x at the small end, 1.1x at the large end
      const bountyMult = 0.93 + sizeFrac*0.14; // 0.93x-1.07x — a gentler swing than HP
      this.maxHp = Math.max(1, Math.round(this.maxHp * hpMult));
      this.hp = this.maxHp;
      this.bounty = Math.max(1, Math.round(this.bounty * bountyMult));
    }
    if(!LIVESTOCK_TYPES[type]){this.maxHp=enemyHealthAtWeight(type,this.weight,hpMultiplier);this.hp=this.maxHp;} // GRUNT-CONSTITUTION-01: weight, not wave scaling
    this.pathIndex = 0;
    this.x = waypointsPx[0].x; this.y = waypointsPx[0].y;
    this.vx = 0; this.vy = 0;
    this.traveled = 0;
    this.flashTimer = 0;
    this.slowMultiplier = 1;
    this.slowTimer = 0;
    this.stunnedUntil = 0; this.shockedUntil = 0;
    this.frozenUntil = 0; // ELEMENT-EFFECTS-01 (1.6.88): ICE attunement — full stop, distinct from stunnedUntil so the icon (🧊 vs ⚡) tells them apart
    this.burnUntil = 0;
    this.burnTickTimer = 0;
    this.lastBurnSource = null;
    this.poisonUntil = 0;
    this.poisonTickTimer = 0;
    this.poisonDamagePerTick = 0;
    this.lastPoisonSource = null;
    this.acidStacks = 0; this.acidUntil = 0; this.acidTickTimer = 0; this.acidDamagePerStack = 0; this.acidSlowPerStack = 0; this.acidNextStackAt = 0; this.lastAcidSource = null;
    this.bleedUntil = 0;         // open-wound bleeding DOT — lasts as long as any arrow is stuck, independent of the passive low-HP drip
    this.bleedStartedAt = 0;     // reference point for the cessation taper — spurt intensity winds down as the wound approaches bleedUntil instead of cutting off abruptly at full strength
    this.bleedTickTimer = 0;
    this.dotTextPending = [0, 0, 0]; this.dotTextShownAt = [-1e9, -1e9, -1e9]; // DOT-TEXT-01 (1.7.89): bleed, burn and poison damage is summed and shown once per real second
    this.bleedDamagePerTick = 0;
    this.bloodStains = undefined; this.bloodStainRevision=0;this.bloodStampKey=null;this.bleedSprayHeading = undefined; this.trailX = undefined; this.trailY = undefined; this.trailAccumPx = 0; this.trailStillMs = 0; this.trailDropCount = 0;
    this.bleedStackCount = 0;    // was missing from this reset — a reused pool slot could otherwise inherit a stale stack count from whatever this slot last held
    this.bleedStackDamages = []; // per-stack damage-per-tick values (max 4) — see applyBleed(), this is what actually enforces the 4-stack cap on total damage, not just the display count
    this.lastBleedSource = null;
    this.bloodProfile = rollBloodProfile(type); // cached once per spawn so this individual's blood stays a consistent shade across every hit, rather than re-randomizing per wound
    this.statusLabelTimer = 0; // periodic reminder text for active status effects
    this.stallWatchX = null; this.stallWatchY = null;
    this.stallWatchTraveled = 0; // last-resort anti-bunching failsafe — see checkStallWatchdog()
    this.stallWatchTimer = 0;
    this.stallStrikes = 0;
    this.flinchStart = 0; // hit-reaction nudge — render-only offset applied in draw(), never touches this.x/this.y itself, so it can't desync pathing/collision no matter how often it fires
    this.flinchAngle = 0;
    this.flinchMag = 0;
    this.flinchDuration = 1;
    this.pileBlocked = false; // frozen by a Barricade (either touching one, or queued up behind another blocked mob)
    this.touchingBarricade = false; // true only for the one actually pressed against the barricade (drives the bump animation)
    this.bumpTime = 0;
    // CA271 — see HISTORY.md § [1.5.7] Code Archaeology, CA271
    this.attackBumpTarget = null;
    // CA272 — see HISTORY.md § [1.5.7] Code Archaeology, CA272
    this.willBreakaway = Math.random() < (def.breakawayChance || 0);
    this.aggroStartedAt=-1;
    this.breakawayDone = false;
    this.isBreakaway = false;
    this.breakawayTarget = null;
    this.breakAttackTimer = 0;
    this.breakDamage = def.breakDamage || 6;
    this.statusOnTower = def.statusOnTower || null;
    this.isTroll = type === 'TROLL';
    this.trollSwingTimer = 4000 + Math.random()*2500;
    this.splits = !!def.splits;
    this.hasSplit = false; // guards against a split-of-a-split — SPLITMINI never has def.splits set, so this stays moot for them
    this.healsAllies = !!def.healsAllies;
    this.holyLifesteal = !!def.holyLifesteal;
    this.healTickTimer = 0;
    this.hasShield = !!def.hasShield;
    this.shieldHp = this.hasShield ? 20 : 0;
    this.shieldMaxHp = 20;
    this.shieldRegenTimer = 0;
    this.revives = !!def.revives;
    this.hasRevived = false;
    this.pack = !!def.pack;
    this.packSpeedBonus = 1; // only ever recomputed inside if(this.pack) in update() — a non-pack enemy reusing a pack-enemy's old slot would otherwise keep a stale bonus forever, since nothing else ever touches this field for it
    this.packCheckTimer = 0;
    this.lastBloodFootX=undefined;this.lastBloodFootY=undefined;this.bloodFootSide=0;
    this.wetFeetSteps = 0; this.wetFeetStepsMax = 0; this.wetFeetSizeBonus = 0; // read unconditionally in update() with no gate on whether THIS enemy actually stepped in blood — must start at zero, not inherit a previous occupant's mid-sequence values
    this.isUndead = !!def.isUndead;
    // CA273 — see HISTORY.md § [1.5.7] Code Archaeology, CA273
    this.footstepWeight = FOOTSTEP_WEIGHT[type] !== undefined ? FOOTSTEP_WEIGHT[type] : 1;
    this.footstepDist = this.footstepWeight === null ? Infinity : (this.radius * 17);
    this.sizeTier = 'STANDARD';
    this.spawnSerial = ++enemySpawnSerial;
    if(!this.damageLedger) this.damageLedger = new Map();
    this.damageLedger.clear();
    this.enrageCueFired = false; // one-shot low-HP growl for Boss/Troll (see update())
    // CA274 — see HISTORY.md § [1.5.7] Code Archaeology, CA274
    this.isStealthSanta=false;
    this.escaped = false;
    this.wanderVx = 0; this.wanderVy = 0; this.wanderRepickTimer = 0;
    this.wanderTurnRate = 0; this.wanderGoalActive = false; this.wanderGoalX = 0; this.wanderGoalY = 0;
    this.escapedAttackTarget = null; this.escapedAttackTimer = 0; this.escapedAttackCheckTimer = 0;
    this.looseDrainMs = 0; this.escapeSettleMs = 0;
    // CA275 — see HISTORY.md § [1.5.7] Code Archaeology, CA275
    this.breedingPartner=null;this.birthDueRound=0;this.breedReadyRound=0;
    this.heartStartAt = -1e9; this.heartCooldownUntil = 0; this.heartCheckTimer = 0;
    this.isHostileNpc = false; this.isLivestock = false; this.livestockWalking = false; this.trollRoute = null; // LIVESTOCK-RECYCLE-01 (1.6.106): pooled enemies are reused, so a slot that once held a pig must not stay flagged as livestock
    this.isGuardian = false; this.hutRef = null; this.hutAnchorX = 0; this.hutAnchorY = 0;
    this.isHutBuilding = false; this.guardiansAliveCount = 0; this.respawnAt = null; this.destroyed = false; this.buildingKind = null;
    this.growthRounds = LIVESTOCK_ADULT_ROUNDS;
    this.active = true;
  }
  showDotDamageText(slot, amount, emoji, color){
    this.dotTextPending[slot] += amount;
    if(presentationTime - this.dotTextShownAt[slot] < DOT_TEXT_INTERVAL_MS) return;
    this.dotTextShownAt[slot] = presentationTime;
    spawnRoutineCombatText(this.x, this.y - this.radius - 6, this.dotTextPending[slot] + emoji, color);
    this.dotTextPending[slot] = 0;
  }
  applySlow(factor, duration){
    const newMultiplier = 1 - factor;
    if(newMultiplier < this.slowMultiplier) this.slowMultiplier = newMultiplier; // strongest slow wins
    this.slowTimer = Math.max(this.slowTimer, duration);
  }
  applyStun(ms){
    this.stunnedUntil = Math.max(this.stunnedUntil, gameTime + ms);
  }
  checkLivestockPairHearts(dt){
    this.heartCheckTimer-=dt;if(this.heartCheckTimer>0) return;
    this.heartCheckTimer=LIVESTOCK_PAIR_CHECK_MS;prepareLivestockPair(this);
  }
  updateLivestockWander(dt){
    if(livestockIsEgg(this)){ this.vx = 0; this.vy = 0; this.livestockWalking = false; return; }
    if(this.trollRoute && this.trollRoute.length){ this.walkTrollEntrance(dt); return; }
    if(!this.isHostileNpc && this.type!=='BEE') this.checkLivestockPairHearts(dt);
    if(this.type==='BEE') updateBeeHoney(this,dt);
    // LIVESTOCK-CUTE-01 (1.6.105): idle a moment, then amble in a direction for a bit, then idle again. Driven in real time
    // once per rendered frame (updatePresentationEffects()), so animals move between waves and at every game speed.
    this.retargetTimer = (this.retargetTimer||0) - dt;
    if(this.retargetTimer <= 0){
      this.livestockWalking = !this.livestockWalking;
      if(this.livestockWalking){
        this.retargetTimer = LIVESTOCK_WALK_MS_MIN + Math.random()*(LIVESTOCK_WALK_MS_MAX - LIVESTOCK_WALK_MS_MIN);
        let angle = Math.random()*Math.PI*2;
        for(let tries = 0; tries < 8 && !isLooseWalkableAt(this.x + Math.cos(angle)*80, this.y + Math.sin(angle)*80); tries++) angle = Math.random()*Math.PI*2;
        const wanderSpeed = LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT;
        this.vx = Math.cos(angle)*wanderSpeed; this.vy = Math.sin(angle)*wanderSpeed;
        if(this.vx > 1) this.livestockFacesRight = true; else if(this.vx < -1) this.livestockFacesRight = false;
      } else {
        this.retargetTimer = LIVESTOCK_IDLE_MS_MIN + Math.random()*(LIVESTOCK_IDLE_MS_MAX - LIVESTOCK_IDLE_MS_MIN);
        this.vx = 0; this.vy = 0;
      }
    }
    if(!isLooseWalkableAt(this.x, this.y)){
      // LIVESTOCK-UNSTUCK-01 (1.6.109): an animal that ends up on ground it cannot walk (map change, odd spawn tile) would bounce in place
      // forever, because every step fails the walkable check. Move it to the middle of the active region's nearest walkable tile.
      const rescue = nearestLooseWalkableTileCenter(this.x, this.y);
      if(rescue){ // WANDERER-GLIDE-01 (1.6.157): walk back toward walkable ground instead of jumping there
        const rescueDistance = Math.hypot(rescue.x - this.x, rescue.y - this.y) || 1;
        const rescueStep = Math.min(rescueDistance, LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * 2.5 * dt/1000);
        this.x += (rescue.x - this.x)/rescueDistance*rescueStep; this.y += (rescue.y - this.y)/rescueDistance*rescueStep;
      }
    }
    const hunter = LIVESTOCK_TYPES[this.type] && LIVESTOCK_TYPES[this.type].hunter;
    if(hunter){
      this.trollAttackTimer = (this.trollAttackTimer||0) - dt;
      if(this.trollAttackTimer <= 0){
        this.trollAttackTimer = hunter.attackIntervalMs;
        for(const t of towerPool){
          if(!t.active || t.type === 'BARRICADE' || t.disabledWavesLeft > 0) continue;
          if(Math.hypot(t.x - this.x, t.y - this.y) <= hunter.attackRadius + this.radius){
            t.takeDamage(hunter.attackDamage);
            spawnParticles(t.x, t.y, '#ffb74d', 4);
          }
        }
      }
      let huntTarget = null, huntDist = hunter.aggroRadius;
      for(const t of towerPool){
        if(!t.active || t.type === 'BARRICADE') continue;
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if(d < huntDist){ huntTarget = t; huntDist = d; }
      }
      this.attackBumpTarget = huntTarget && huntDist <= hunter.attackRadius + this.radius ? huntTarget : null;
      if(huntTarget){
        this.retargetTimer = 600; this.livestockWalking = true;
        if(huntDist <= hunter.attackRadius * 0.8 + this.radius){ this.vx = 0; this.vy = 0; }
        else {
          const huntSpeed = LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * hunter.speedMult;
          this.vx = (huntTarget.x - this.x)/huntDist*huntSpeed; this.vy = (huntTarget.y - this.y)/huntDist*huntSpeed;
        }
        if(this.vx > 1) this.livestockFacesRight = true; else if(this.vx < -1) this.livestockFacesRight = false;
      }
    }
    if(!this.livestockWalking) return;
    const walkSpeed = Math.hypot(this.vx, this.vy);
    if(walkSpeed > 0 && !isLooseWalkableAt(this.x + this.vx/walkSpeed*NPC_EDGE_LOOKAHEAD_PX, this.y + this.vy/walkSpeed*NPC_EDGE_LOOKAHEAD_PX)){
      const inward = nearestLooseWalkableTileCenter(this.x, this.y);
      const turn = inward ? Math.atan2(inward.y - this.y, inward.x - this.x) + (Math.random()-0.5)*0.8 : Math.random()*Math.PI*2;
      this.vx = Math.cos(turn)*walkSpeed; this.vy = Math.sin(turn)*walkSpeed;
      if(this.vx > 1) this.livestockFacesRight = true; else if(this.vx < -1) this.livestockFacesRight = false;
    }
    if(walkSpeed > 0 && !hunter) this.steerAroundEnemies(walkSpeed);
    const stepX = this.x + this.vx*dt/1000, stepY = this.y + this.vy*dt/1000;
    if(isLooseWalkableAt(stepX, stepY)){ this.x = stepX; this.y = stepY; }
    else { this.vx = 0; this.vy = 0; this.retargetTimer = 0; }
  }
  walkTrollEntrance(dt){
    const stop = this.trollRoute[0], dx = stop.x - this.x, dy = stop.y - this.y, distance = Math.hypot(dx, dy);
    const stepPx = LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * TROLL_ENTRANCE_SPEED_MULT * dt/1000;
    this.livestockWalking = true; this.attackBumpTarget = null;
    if(distance <= Math.max(stepPx, 4)){ this.x = stop.x; this.y = stop.y; this.vx = 0; this.vy = 0; this.trollRoute.shift(); if(!this.trollRoute.length){ this.retargetTimer = 0; this.livestockWalking = false; } return; }
    this.vx = dx/distance*stepPx*1000/dt; this.vy = dy/distance*stepPx*1000/dt;
    this.livestockFacesRight = dx > 0;
    this.x += dx/distance*stepPx; this.y += dy/distance*stepPx;
  }
  // LIVESTOCK-AVOID-01 (1.8.30): animals and bees bend their walk away from enemies on the road instead of passing through them. Enemies within their own radius plus LIVESTOCK_AVOID_MARGIN_PX push the heading away and to the side it already leans, harder the closer they are, so a head-on animal curves around instead of backing up; the walking speed is unchanged.
  steerAroundEnemies(walkSpeed){
    let pushX = 0, pushY = 0;
    for(const other of enemyPool){
      if(!other.active || other.isLivestock) continue;
      const reach = other.radius + this.radius + LIVESTOCK_AVOID_MARGIN_PX;
      const offsetX = this.x - other.x, offsetY = this.y - other.y, squaredDistance = offsetX*offsetX + offsetY*offsetY;
      if(squaredDistance >= reach*reach || squaredDistance === 0) continue;
      const distance = Math.sqrt(squaredDistance), closeness = (reach - distance) / reach;
      pushX += offsetX / distance * closeness; pushY += offsetY / distance * closeness;
    }
    const pushLength = Math.hypot(pushX, pushY);
    if(pushLength === 0) return;
    const awayX = pushX / pushLength, awayY = pushY / pushLength, headingX = this.vx / walkSpeed, headingY = this.vy / walkSpeed;
    const side = (awayX * headingY - awayY * headingX) >= 0 ? 1 : -1;
    const steerX = headingX + (awayX - awayY * side) * pushLength * LIVESTOCK_AVOID_STRENGTH, steerY = headingY + (awayY + awayX * side) * pushLength * LIVESTOCK_AVOID_STRENGTH;
    const steerLength = Math.hypot(steerX, steerY) || 1;
    this.vx = steerX / steerLength * walkSpeed; this.vy = steerY / steerLength * walkSpeed;
    if(this.vx > 1) this.livestockFacesRight = true; else if(this.vx < -1) this.livestockFacesRight = false;
  }
  applyFreeze(ms){
    this.frozenUntil = Math.max(this.frozenUntil, gameTime + ms);
  }
  applyBurn(ms, sourceTower){
    this.burnUntil = Math.max(this.burnUntil, gameTime + ms);
    if(sourceTower) this.lastBurnSource = sourceTower;
  }
  applyPoison(damagePerTick, ms, sourceTower){
    this.poisonUntil = Math.max(this.poisonUntil, gameTime + ms);
    this.poisonDamagePerTick = Math.max(this.poisonDamagePerTick||0, damagePerTick); // strongest poison wins, doesn't stack
    if(sourceTower) this.lastPoisonSource = sourceTower;
  }
  applyAcidCoat(damagePerStack, ms, slowPerStack, sourceTower){
    if(this.acidUntil <= gameTime) this.acidStacks = 0;
    if(gameTime >= this.acidNextStackAt && this.acidStacks < ACID_MAX_STACKS){ this.acidStacks++; this.acidNextStackAt = gameTime + ACID_STACK_GAP_MS; }
    this.acidUntil = Math.max(this.acidUntil, gameTime + ms);
    this.acidDamagePerStack = Math.max(this.acidDamagePerStack, damagePerStack); this.acidSlowPerStack = Math.max(this.acidSlowPerStack, slowPerStack);
    this.applySlow(this.acidSlowPerStack*this.acidStacks, ACID_SLOW_REFRESH_MS);
    if(sourceTower) this.lastAcidSource = sourceTower;
  }
  applyBleed(damagePerTick, ms, sourceTower){
    // CA276 — see HISTORY.md § [1.5.7] Code Archaeology, CA276
    if(!this.bleedStackDamages) this.bleedStackDamages = [];
    if(this.bleedStackDamages.length < 4) this.bleedStackDamages.push(damagePerTick);
    this.bleedStackCount = this.bleedStackDamages.length;
    this.bleedUntil = Math.max(this.bleedUntil, gameTime + ms);
    if(this.bleedStackCount <= 1) this.bleedStartedAt = gameTime; // reference point for the cessation taper — only reset on the FIRST arrow, so a second/third stacking on doesn't restart the clock
    this.bleedDamagePerTick = this.bleedStackDamages.reduce((a,b) => a+b, 0);
    if(sourceTower) this.lastBleedSource = sourceTower;
  }
  update(dt){
    // TARGET-MARK-01 (1.6.94): livestock never path-follow, attack, or take part in wave logic — just
    // wander, confined to the walkable road/grass area, unless and until they take damage from being
    // the marked target, in which case the normal hit/flash/death pipeline below still applies to them.
    if(this.isLivestock){ this.updateLivestockWander(dt); return; }
    // CA277 — see HISTORY.md § [1.5.7] Code Archaeology, CA277
    this.prevX = this.x; this.prevY = this.y;
    // CA278 — see HISTORY.md § [1.5.7] Code Archaeology, CA278
    this.statusLabelTimer -= dt;
    if(this.statusLabelTimer <= 0){
      this.statusLabelTimer = 120000;
      let offset = 0;
      if(this.burnUntil > gameTime){ spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offset, '🔥 BURNING', '#ff8844'); offset += 14; }
      if(this.poisonUntil > gameTime){ spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offset, '☠️ CURSED', '#7cb518'); offset += 14; }
      if(this.bleedUntil > gameTime){ spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offset, '🩸 BLEEDING', '#e63946'); offset += 14; }
      if(this.slowTimer > 0){ spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offset, '🧊 SLOWED', '#7dd3fc'); offset += 14; }
      if(this.stunnedUntil > gameTime){ spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offset, '⭐ STUNNED', '#ffe066'); offset += 14; }
    }
    // CA279 — see HISTORY.md § [1.5.7] Code Archaeology, CA279
    // CA280 — see HISTORY.md § [1.5.7] Code Archaeology, CA280
    if(goreMode && this.hp > 0 && (this.hp < this.maxHp * 0.4 || this.bleedUntil > gameTime) && !(this.bloodProfile || getBloodProfile(this.type)).isDust){
      this.arterialDripTimer = (this.arterialDripTimer||0) - dt;
      if(this.arterialDripTimer <= 0){
        this.arterialDripTimer = 900 + Math.random()*700;
        const bio = this.bloodProfile || getBloodProfile(this.type);
        const speedNow = Math.hypot(this.vx, this.vy);
        if(speedNow > 15){
          // CA281 — see HISTORY.md § [1.5.7] Code Archaeology, CA281
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), 1, Math.atan2(-this.vy, -this.vx), undefined, this);
          if(this.bleedUntil > gameTime){
            spawnSatelliteDrops(this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, hexToRgba(bio.dark, 0.5), 2, Math.atan2(-this.vy, -this.vx), 0.5, this);
          }
        } else {
          // CA282 — see HISTORY.md § [1.5.7] Code Archaeology, CA282
          spawnSatelliteDrops(this.x + (Math.random()-0.5)*8, this.y + (Math.random()-0.5)*8, hexToRgba(bio.dark, 0.6), 1, undefined, undefined, this);
          if(Math.random() < 0.4) spawnDripTrail(this.x + (Math.random()-0.5)*6, this.y, hexToRgba(bio.dark, 0.55)); // standing still long enough for it to actually run down, not just splash beneath
        }
      }
    }
    if(this.burnUntil > gameTime){
      this.burnTickTimer -= dt;
      if(this.burnTickTimer <= 0){
        this.burnTickTimer = 500;
        const burnDmg = Math.max(1, Math.round(this.maxHp * 0.04));
        this.recordContribution(this.lastBurnSource, burnDmg, false);
        this.hp -= burnDmg;
        this.showDotDamageText(DOT_TEXT_BURN, burnDmg, '🔥', '#ff8844');
        spawnParticles(this.x, this.y, '#ff6b35', 3);
        if(this.hp <= 0){ this.die(this.lastBurnSource, false); return; }
      }
    }
    if(this.poisonUntil > gameTime){
      this.poisonTickTimer -= dt;
      if(this.poisonTickTimer <= 0){
        this.poisonTickTimer = 600;
        const poisonDmg = Math.max(1, Math.round(this.poisonDamagePerTick));
        this.recordContribution(this.lastPoisonSource, poisonDmg, false);
        this.hp -= poisonDmg;
        this.showDotDamageText(DOT_TEXT_POISON, poisonDmg, '☠️', '#7cb518');
        spawnParticles(this.x, this.y, '#7cb518', 3);
        if(this.hp <= 0){ this.die(this.lastPoisonSource, false); return; }
      }
    } else {
      this.poisonDamagePerTick = 0; // expired — a fresh application starts clean rather than keeping a stale strength
    }
    if(this.acidUntil > gameTime){
      this.acidTickTimer -= dt;
      if(this.acidTickTimer <= 0){
        this.acidTickTimer = ACID_TICK_MS;
        const acidDmg = Math.max(1, Math.round(this.acidDamagePerStack*this.acidStacks));
        this.applySlow(this.acidSlowPerStack*this.acidStacks, ACID_SLOW_REFRESH_MS);
        this.recordContribution(this.lastAcidSource, acidDmg, false);
        this.hp -= acidDmg;
        this.showDotDamageText(DOT_TEXT_POISON, acidDmg, '🧪', '#8bd62f');
        spawnParticles(this.x, this.y, '#8bd62f', 2);
        if(this.hp <= 0){ this.die(this.lastAcidSource, false); return; }
      }
    } else { this.acidStacks = 0; this.acidDamagePerStack = 0; this.acidSlowPerStack = 0; }
    if(this.bleedStackCount > 0 && this.embeddedArrows.length > 0) this.bleedUntil = Math.max(this.bleedUntil, gameTime + BLEED_ARROW_REFRESH_MS); // BLEED-WHILE-STUCK-01 (1.6.131)
    if(this.bleedUntil > gameTime){
      this.bleedTickTimer -= dt;
      if(this.bleedTickTimer <= 0){
        const bleedDmg = Math.max(1, Math.round(this.bleedDamagePerTick));
        this.recordContribution(this.lastBleedSource, bleedDmg, false);
        this.hp -= bleedDmg;
        this.showDotDamageText(DOT_TEXT_BLEED, bleedDmg, '🩸', '#e63946');
        // CA283 — see HISTORY.md § [1.5.7] Code Archaeology, CA283
        const totalDuration = Math.max(1, this.bleedUntil - this.bleedStartedAt);
        const remainingFrac = clampNum((this.bleedUntil - gameTime) / totalDuration, 0, 1);
        const cessation = 0.35 + remainingFrac*0.65; // never fully silent until it actually ends, but visibly weaker near the end
        // CA284 — see HISTORY.md § [1.5.7] Code Archaeology, CA284
        const pulse = 0.5 + 0.5*Math.sin((gameTime - this.bleedStartedAt) / 480 * Math.PI*2);
        this.bleedTickTimer = 420 + (1-pulse)*480; // 420ms at the peak of a beat, up to 900ms in the trough
        // CA285 — see HISTORY.md § [1.5.7] Code Archaeology, CA285
        const hypoDamp = 0.4 + 0.6 * clampNum(this.hp / this.maxHp, 0, 1);
        const beatIntensity = cessation * (0.55 + pulse*0.75) * hypoDamp;
        if(goreMode && !this.bloodProfile.isDust){
          const bio = this.bloodProfile;
          const bleedStacks = Math.max(1, this.bleedStackCount); // BLEED-MULTIPLIES-01 (1.6.155) — see HISTORY.md § [1.6.155]: the blood effect scales with the number of stuck arrows, like the damage does
          spawnParticles(this.x, this.y, bio.bright, Math.max(1, Math.round(3*beatIntensity*bleedStacks)), 160, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          if(this.bleedSprayHeading === undefined) this.bleedSprayHeading = Math.random()*Math.PI*2;
          spawnArterialBeat(this.x, this.y, bio, this.bleedSprayHeading, Math.min(1.5, beatIntensity*bleedStacks), graphicsQuality === 'low' || underHeavyVisualLoad, this);
          const satelliteDropCount = Math.floor(beatIntensity*bleedStacks + Math.random());
          if(satelliteDropCount > 0) spawnSatelliteDrops(this.x + (Math.random()-0.5)*8, this.y + (Math.random()-0.5)*8, hexToRgba(bio.dark, 0.65), satelliteDropCount, undefined, undefined, this);
          if(Math.random() < Math.min(1, 0.3*cessation*bleedStacks)) spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), 0.55), true, undefined, undefined, bio.viscous, undefined, bloodPoolSizeScale(this.radius), this);
          if(Math.random() < Math.min(1, 0.3*cessation*bleedStacks)) spawnDripTrail(this.x + (Math.random()-0.5)*6, this.y, hexToRgba(bio.dark, 0.55));
        }
        if(this.hp <= 0){ this.die(this.lastBleedSource, false); return; }
      }
    } else {
      this.bleedDamagePerTick = 0; // expired — a fresh wound starts clean rather than keeping a stale strength
      this.bleedStackCount = 0; // all arrows have finished bleeding out — the next one starts a fresh count
      this.bleedStackDamages = [];
    }
    if(this.healsAllies) this.updateHealAura(dt);
    if(this.hasShield) this.updateShieldRegen(dt);
    // CA286 — see HISTORY.md § [1.5.7] Code Archaeology, CA286
    if(this.escaped){ this.updateEscaped(dt); return; }
    // CA287 — see HISTORY.md § [1.5.7] Code Archaeology, CA287
    if(this.isGuardian){ this.updateGuardian(dt); return; }
    if(this.isHutBuilding){ this.updateHutBuilding(dt); return; }
    // CA288 — see HISTORY.md § [1.5.7] Code Archaeology, CA288
    if(((this.type === 'BOSS' || this.type === 'SANTA') || this.isTroll) && !this.enrageCueFired && this.hp > 0 && this.hp < this.maxHp * 0.3){
      this.enrageCueFired = true;
      playSound('enrage', this.x, undefined, this.y);
    }
    if(this.pileBlocked){
      this.vx = 0; this.vy = 0;
      if(this.touchingBarricade) this.bumpTime += dt;
      if(this.flashTimer > 0) this.flashTimer -= dt;
      return;
    }
    if(this.stunnedUntil > gameTime || this.frozenUntil > gameTime){
      this.vx = 0; this.vy = 0;
      if(this.flashTimer > 0) this.flashTimer -= dt;
      return;
    }
    if(this.isBreakaway){ this.updateBreakaway(dt); return; }
    if(this.isTroll){ this.updateTroll(dt); return; }
    if(this.type === 'BOSS'){
      this.bossSpawnTimer = (this.bossSpawnTimer||3000) - dt;
      if(this.bossSpawnTimer <= 0){
        this.bossSpawnTimer = 3500 + Math.random()*1500;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03);
        spawnFloatingText(this.x, this.y - this.radius - 12, '📯 Rally!', '#ff8a65');
        spawnParticles(this.x, this.y, '#ff8a65', 8);
      }
    }
    if(this.type === 'SANTA'){
      // CA289 — see HISTORY.md § [1.5.7] Code Archaeology, CA289
      this.santaSpawnTimer = (this.santaSpawnTimer||4000) - dt;
      if(this.santaSpawnTimer <= 0){
        this.santaSpawnTimer = 5000 + Math.random()*2000;
        spawnFloatingText(this.x, this.y - this.radius - 12, '🎅 Ho ho ho!', '#e63946');
        spawnParticles(this.x, this.y, '#e6c200', 10);
        getEnemyCollisionMask('COOKIE'); // pre-warm once rather than lazily building it on the very first Cookie's first collision check mid-fight — same pre-warm every OTHER enemy type gets from the wave plan's own newTypes loop, which Cookies never pass through since they're spawned directly here, not via buildWavePlan()
        const cookieCount = 2 + Math.floor(Math.random()*2); // 2-3
        for(let i=0; i<cookieCount; i++){
          const c = acquireActive(enemyPool);
          if(!c) break;
          c.spawn('COOKIE', waveHpScale(this.isStealthSanta?CAMPAIGN_WAVE_COUNT:waveIndex));
          const ang = Math.random()*Math.PI*2, dist = this.radius + 10 + Math.random()*14;
          c.x = this.x + Math.cos(ang)*dist; c.y = this.y + Math.sin(ang)*dist;
          c.pathIndex = this.pathIndex; c.traveled = this.traveled; // start from wherever Santa currently is on the route, not the spawn tile
        }
      }
    }
    if(this.slowTimer > 0){
      this.slowTimer -= dt;
      if(this.slowTimer <= 0){ this.slowTimer = 0; this.slowMultiplier = 1; }
    }
    if(this.pack){
      this.packSpeedBonus = 1; // packs keep their formation visuals but never gain movement speed
    }
    let effectiveSpeed = this.packedSpeed() * enemyMoveMultiplier(this);
    // CA290 — see HISTORY.md § [1.5.7] Code Archaeology, CA290
    if(this.followSpeedCap !== undefined && this.followSpeedCap < effectiveSpeed) effectiveSpeed = this.followSpeedCap;
    if(this.queueSlotDist !== undefined) effectiveSpeed = Math.min(effectiveSpeed, Math.max(0, this.queueSlotDist-this.traveled)*1000/Math.max(1,dt));
    const target = waypointsPx[this.pathIndex+1];
    if(!target){
      // CA291 — see HISTORY.md § [1.5.7] Code Archaeology, CA291
      const fl = computeFinishLine();
      if(!fl){ this.reachEnd(); return; } // degenerate/unset path — fail safe to the old immediate behavior rather than getting stuck with nowhere to walk
      const alongDist = (this.x - fl.edgeX)*fl.ux + (this.y - fl.edgeY)*fl.uy;
      if(alongDist >= this.radius){ this.reachEnd(); return; }
      const finalSpeed = this.packedSpeed() * enemyMoveMultiplier(this);
      this.vx = fl.ux*finalSpeed; this.vy = fl.uy*finalSpeed;
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      this.traveled += finalSpeed*dt/1000;
      return;
    }
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const moveDist = effectiveSpeed * dt / 1000;
    this.vx = dx/dist*effectiveSpeed; this.vy = dy/dist*effectiveSpeed;
    // CA292 — see HISTORY.md § [1.5.7] Code Archaeology, CA292
    let distMovedThisFrame;
    if(dist <= (this.queueSlotDist !== undefined ? moveDist : Math.max(moveDist, 3))){
      this.x = target.x; this.y = target.y;
      this.pathIndex++;
      this.traveled += dist;
      distMovedThisFrame = dist;
      const cornerTarget = waypointsPx[this.pathIndex+1];
      const leftover = moveDist - dist;
      if(leftover > 0 && cornerTarget){
        // CA293 — see HISTORY.md § [1.5.7] Code Archaeology, CA293
        const cdx = cornerTarget.x - this.x, cdy = cornerTarget.y - this.y;
        const cornerDist = Math.hypot(cdx, cdy) || 0.0001;
        const carried = Math.min(leftover, cornerDist);
        this.x += cdx / cornerDist * carried; this.y += cdy / cornerDist * carried;
        this.vx = cdx / cornerDist * effectiveSpeed; this.vy = cdy / cornerDist * effectiveSpeed;
        this.traveled += carried;
        distMovedThisFrame += carried;
      }
    } else {
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      this.traveled += moveDist;
      distMovedThisFrame = moveDist;
    }
    // CA294 — see HISTORY.md § [1.5.7] Code Archaeology, CA294
    if(this.footstepWeight !== null){
      this.footstepDist -= distMovedThisFrame;
      if(this.footstepDist <= 0){
        this.footstepDist += this.radius * 17;
        if(typeof camera !== 'undefined'){
          const onScreenX = this.x*camera.zoom + camera.x, onScreenY = this.y*camera.zoom + camera.y;
          if(onScreenX > -80 && onScreenX < CANVAS_W+80 && onScreenY > -80 && onScreenY < CANVAS_H+80){
            playSound('footstep', this.x, this.footstepWeight, this.y);
          }
        }
      }
    }
    if(this.flashTimer > 0) this.flashTimer -= dt;
    // once eligible and a little into its walk, actually trigger the breakaway
    if(this.willBreakaway && !this.breakawayDone && this.traveled > 32){
      this.tryStartBreakaway();
    }
  }
  updateHealAura(dt){
    this.healTickTimer -= dt;
    if(this.healTickTimer > 0) return;
    this.healTickTimer = 1000;
    let healedAny = false;
    for(const e of enemyPool){
      if(!e.active || e === this || e.hp >= e.maxHp) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if(d > 90) continue;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.06);
      healedAny = true;
    }
    if(healedAny){
      spawnParticles(this.x, this.y, '#7cfc7c', 3);
    }
  }
  updateShieldRegen(dt){
    if(this.shieldHp >= this.shieldMaxHp) return;
    this.shieldRegenTimer -= dt;
    if(this.shieldRegenTimer <= 0){
      this.shieldRegenTimer = 300;
      this.shieldHp = Math.min(this.shieldMaxHp, this.shieldHp + this.shieldMaxHp*0.08);
    }
  }
  // CA295 — see HISTORY.md § [1.5.7] Code Archaeology, CA295
  packedSpeed(){
    const packed = this.speed * (this.packSpeedBonus || 1);
    const band = SIZE_TIER_BANDS[this.sizeTier];
    const capped = band ? Math.min(packed, Math.max(this.speed, band.speedMax)) : packed;
    return capped * 0.85; // extra 15% reduction for the requested slower, less rushed pacing

  }
  recordContribution(sourceTower, amount, countsAsShotHit){
    if(!sourceTower || !sourceTower.active || amount <= 0) return;
    this.damageLedger.set(sourceTower, (this.damageLedger.get(sourceTower) || 0) + amount);
    sourceTower.lifetimeDamage = (sourceTower.lifetimeDamage || 0) + Math.min(amount, Math.max(0, this.hp));
    sourceTower.waveDamage = (sourceTower.waveDamage || 0) + Math.min(amount, Math.max(0, this.hp));
    // CA296 — see HISTORY.md § [1.5.7] Code Archaeology, CA296
    // HIT-ACCURACY-01 (1.6.53) — see HISTORY.md § [1.6.53]. hitsLanded must stay 1:1 with
    // shotsFired for the accuracy telemetry (hit/shots %) to mean anything. It doesn't by default:
    // splash damage hits every enemy in radius from one shot, elemental bonus procs and
    // chain-lightning deal a second damage instance from the same shot, and summoned minions
    // (cats, skeletons) attack on their own independent cadence with no shotsFired of their own.
    // Every one of those calls applyDamage() too. countsAsShotHit === false marks a call that must
    // still credit damage/gold/kills normally but must not inflate the shot-accuracy count.
    if(sourceTower.telemetry){
      if(countsAsShotHit !== false) sourceTower.telemetry.hitsLanded++;
    }
  }
  applySizeTier(sizeTier, sizeJitter, hpScale){
    const band = SIZE_TIER_BANDS[sizeTier];
    const def = CONFIG.ENEMIES[this.type];
    const familySpeedRank = clampNum((def.speed - ENEMY_FAMILY_SPEED_MIN) / (ENEMY_FAMILY_SPEED_MAX - ENEMY_FAMILY_SPEED_MIN), 0, 1);
    const sizeRank = clampNum(sizeJitter, 0, 1);
    this.sizeTier = sizeTier;
    this.isMini = sizeTier === 'TINY';
    this.isBig = sizeTier === 'LARGE';
    const visualSizeRank = 0.5 + 0.5*Math.sign(sizeRank*2-1)*Math.pow(Math.abs(sizeRank*2-1),0.65); // ENEMY-SIZE-VARIETY-01 (1.7.141): more visible extremes inside the existing tier.
    this.radius = band.radiusMin + visualSizeRank*(band.radiusMax-band.radiusMin);
    this.speed = (band.speedMin + familySpeedRank * (band.speedMax - band.speedMin)) * ENEMY_WALK_SPEED_SCALE; // ENEMY-PACE-01 (1.6.79) — see HISTORY.md § [1.6.79]
    this.maxHp = enemyHealthAtWeight(this.type,this.weight,hpScale);
    this.hp = this.maxHp;
    this.bounty = Math.max(1, Math.round(def.bounty * band.bountyMult));
    this.footstepDist = this.footstepWeight === null ? Infinity : (this.radius * 17);
  }
  spawnSplitChildren(){
    this.hasSplit = true;
    // CA297 — see HISTORY.md § [1.5.7] Code Archaeology, CA297
    const childType = SPLIT_CHILD_TYPE[this.type] || 'SPLITMINI';
    for(let i=0; i<2; i++){
      const child = acquireActive(enemyPool);
      if(!child) break;
      child.spawn(childType, waveHpScale(waveIndex));
      child.applySizeTier(this.sizeTier === 'BOSS' ? 'LARGE' : this.sizeTier, Math.random(), waveHpScale(waveIndex) * 0.5);
      child.x = this.x + (Math.random()*16-8);
      child.y = this.y + (Math.random()*16-8);
      child.pathIndex = this.pathIndex;
      child.traveled = this.traveled;
    }
  }
  updateTroll(dt){
    // CA298 — see HISTORY.md § [1.5.7] Code Archaeology, CA298
    if(this.flashTimer > 0) this.flashTimer -= dt;
    this.trollSwingTimer -= dt;
    if(this.trollSwingTimer <= 0){
      this.trollSwingTimer = 4000 + Math.random()*2500;
      const tower = findNearestActiveTower(this.x, this.y, 150);
      if(tower && Math.random() < 0.4){
        tower.takeDamage(Math.max(1, Math.round(12 * ENEMY_DAMAGE_SCALE)), null);
        spawnDebrisNear(tower.x, tower.y);
        spawnFloatingText(this.x, this.y - this.radius - 8, '🥢 Swing!', '#8a5a2b');
        playSound('monster_swing', this.x, undefined, this.y);
      }
    }
    const target = waypointsPx[this.pathIndex-1];
    if(!target){ this.active = false; return; } // wandered back past the entrance — just gone, no penalty either way
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const moveSpeed = this.packedSpeed();
    const moveDist = moveSpeed * dt / 1000;
    this.vx = dx/dist*moveSpeed; this.vy = dy/dist*moveSpeed;
    if(dist <= moveDist){
      this.x = target.x; this.y = target.y;
      this.pathIndex--;
    } else {
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
    }
  }
  drawLivestockEmote(ctx){
    // LIVESTOCK-PARENTS-01: hearts only identify a valid mature pair due next round; chicken music notes remain decorative.
    if(this.isHostileNpc) return;
    let age;
    const birthing=livestockPairDueSoon(this);
    if(birthing){ age=(presentationTime-this.heartStartAt)%LIVESTOCK_EMOTE_LIFE_MS; } else if(this.type === 'CHICKEN'){
      if(!(this.livestockEmoteAt > 0)) this.livestockEmoteAt = presentationTime + LIVESTOCK_EMOTE_MIN_GAP_MS + Math.random() * LIVESTOCK_EMOTE_GAP_SPREAD_MS;
      age = presentationTime - this.livestockEmoteAt;
      if(age < 0) return;
      if(age > LIVESTOCK_EMOTE_LIFE_MS){
        this.livestockEmoteAt = presentationTime + LIVESTOCK_EMOTE_MIN_GAP_MS + Math.random() * LIVESTOCK_EMOTE_GAP_SPREAD_MS;
        return;
      }
    } else return;
    const life = age / LIVESTOCK_EMOTE_LIFE_MS;
    ctx.save();
    ctx.globalAlpha = life < 0.6 ? 1 : 1 - (life - 0.6) / 0.4;
    ctx.font = 'bold ' + Math.max(10, Math.round(this.radius * 0.95)) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = birthing ? '#ff6b9d' : '#f5a623';
    const glyph = birthing ? '♥' : '♪', glyphX = this.x + Math.sin(life * 5) * 3, glyphY = this.y - this.radius * 1.1 - life * 14;
    const popScale = life < 0.15 ? 0.6 + 0.4 * smoothStep01(life / 0.15) * (1 + 0.3 * Math.sin(life / 0.15 * Math.PI)) : 1;
    ctx.translate(glyphX, glyphY); ctx.scale(popScale, popScale);
    ctx.strokeText(glyph, 0, 0); ctx.fillText(glyph, 0, 0);
    ctx.restore();
  }
  attackPhase(){
    const hunter = this.isLivestock && LIVESTOCK_TYPES[this.type] && LIVESTOCK_TYPES[this.type].hunter;
    const interval = hunter ? hunter.attackIntervalMs : (this.isBreakaway || this.isGuardian) ? Math.round(800 * ENEMY_ATTACK_INTERVAL_SCALE) : 800;
    const timer = Math.max(0, (hunter ? this.trollAttackTimer : this.isGuardian ? this.guardAttackTimer : this.isBreakaway ? this.breakAttackTimer : this.escapedAttackTimer) - renderLeftoverMs());
    return clampNum(1 - timer / interval, 0, 1);
  }
  tryStartBreakaway(){
    const target = findNearestActiveTower(this.x, this.y, 320);
    if(!target){ this.breakawayDone = true; return; } // nothing worth breaking away for — stay on path
    this.isBreakaway = true;
    playSound('threat', this.x, undefined, this.y);
    maybeShowFirstTimeAlert('stickTD_firstBreakawaySeen', '⚡ An enemy left the path. Protect your tower!', '#ff8a65');
    this.breakawayTarget = target;
    this.breakAttackTimer = 0;
    this.aggroStartedAt=presentationTime;
  }
  updateBreakaway(dt){
    // CA299 — see HISTORY.md § [1.5.7] Code Archaeology, CA299
    const blocker = findTouchingBarricade(this);
    const t = (blocker && blocker.active && blocker.hp > 0) ? blocker : this.breakawayTarget;
    if(!t || !t.active || t.disabledWavesLeft > 0){ this.endBreakaway(); return; } // drop the target the instant it goes down, not just when it's fully destroyed — an already-disabled tower is defenseless and shouldn't keep getting re-hit/re-disabled by the same attacker
    const surround = enemySurroundPoint(this,t);
    const dx = t.x + (surround ? surround.surroundX : 0) - this.x, dy = t.y + (surround ? surround.surroundY : 0) - this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const engageRange = surround ? 2 : 26;
    if(dist > engageRange){
      this.attackBumpTarget = null; // still closing distance — not pressed against it yet
      const moveSpeed = surround ? Math.min(this.packedSpeed(),dist*1000/Math.max(1,dt)) : this.packedSpeed();
      this.vx = dx/dist*moveSpeed; this.vy = dy/dist*moveSpeed;
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
    } else {
      this.vx = 0; this.vy = 0;
        if(surround && surround.surroundWaiting){this.attackBumpTarget=null;return;}
      this.attackBumpTarget = t;
      this.bumpTime += dt;
      this.breakAttackTimer -= dt;
      if(this.breakAttackTimer <= 0){
        this.breakAttackTimer = Math.round(800 * ENEMY_ATTACK_INTERVAL_SCALE);
        const defeated = t.takeDamage(Math.max(1, Math.round(this.breakDamage * ENEMY_DAMAGE_SCALE * this.bossDamageMult())), this.statusOnTower, this);
        if(this.holyLifesteal){
          const healed = Math.min(this.maxHp - this.hp, Math.round(this.breakDamage*0.5));
          if(healed > 0) this.hp += healed;
          spawnFloatingText(this.x, this.y - this.radius - 10, '✝️ +'+healed, '#ffe9a8');
          spawnParticles(t.x, t.y, '#ffe9a8', 6);
        }
        // CA300 — see HISTORY.md § [1.5.7] Code Archaeology, CA300
        if(defeated && t === this.breakawayTarget) this.endBreakaway();
      }
    }
  }
  endBreakaway(){
    this.isBreakaway = false;
    this.attackBumpTarget = null;
    this.breakawayDone = true; // won't try again this life — resumes its original path from here
  }
  reachEnd(){
    const livesBeforeEscape = lives;
    loseLife(1);
    if(lives < livesBeforeEscape) launchHeartHudFlights(this.x, this.y - this.radius - 10, 1, true); // HEART-BREAK-01 (1.7.74): the life lost to an escape flies to the counter too
    playSound('threat', this.x, undefined, this.y);
    maybeShowFirstTimeAlert(FIRST_ESCAPE_SEEN_KEY, '🏃 An enemy escaped. It will attack your towers.', '#ff8a65');
    waveTelemetry.escaped++;
    waveTelemetry.loosePeak = Math.max(waveTelemetry.loosePeak, countLooseEnemies() + 1);
    // CA301 — see HISTORY.md § [1.5.7] Code Archaeology, CA301
    this.escaped = true;
    this.escapeSettleMs = LOOSE_SETTLE_MIN_MS + Math.random() * LOOSE_SETTLE_SPREAD_MS;
    logGameEvent(this.type + ' escaped the road at ' + Math.round(this.hp) + '/' + this.maxHp + ' HP; lives ' + lives);
    { const leakWitness = findNearestActiveTower(this.x, this.y, 260); if(leakWitness) requestStickmanBark(leakWitness, BARK_TIER_IMPORTANT, '💢', BARK_LINES.LEAK, 0, BARK_CHANCE.LEAK); }
    this.wanderRepickTimer = 0; // pick a wander heading on the very next tick instead of waiting out a leftover timer value
  }
  // CA302 — see HISTORY.md § [1.5.7] Code Archaeology, CA302
  updateEscaped(dt){
    // LOOSE-DRAIN-01 (1.6.77) — see HISTORY.md § [1.6.77]
    const looseDrain = advanceLooseDrain(this.looseDrainMs, waveIndex >= LOOSE_DRAIN_FIRST_WAVE ? dt : 0);
    this.looseDrainMs = looseDrain.remainingMs;
    for(let heartIndex=0; heartIndex<looseDrain.hearts && gameState === 'PLAYING'; heartIndex++){
      const livesBeforeDrain = lives;
      loseLife(1); // the change shows by the health counter (showLivesChange()), never on the enemy
      if(lives < livesBeforeDrain) launchHeartHudFlights(this.x, this.y - this.radius - 10, 1, true); // HEART-BREAK-01 (1.7.74): the broken heart flies from its head to the counter
      waveTelemetry.looseDrainLives++;
    }
    // LOOSE-CONFINE-01 (1.6.77) — see HISTORY.md § [1.6.77]
    if(!isLooseWalkableAt(this.x, this.y) && this.walkBackOntoRoute(dt)) return;
    const positionBeforeMoveX = this.x, positionBeforeMoveY = this.y;
    this.updateEscapedMovement(dt);
    if(gameState === 'PLAYING' && confineLooseEnemyToRoute(this, positionBeforeMoveX, positionBeforeMoveY) && this.escapedAttackTarget) this.escapedAttackTarget = null;
  }
  // ESCAPE-WALKBACK-01 (1.8.29): an enemy that slips past the finish line stands just off the walkable area; it walks back onto the nearest route tile instead of jumping there. Only a far-off position (a loaded save or a changed map) is still placed directly.
  walkBackOntoRoute(dt){
    let nearestPoint = null, nearestDistance = Infinity;
    for(const point of waypointsPx){
      const distance = Math.hypot(point.x - this.x, point.y - this.y);
      if(distance < nearestDistance){ nearestDistance = distance; nearestPoint = point; }
    }
    if(!nearestPoint) return false;
    if(nearestDistance > ESCAPE_WALKBACK_MAX_TILES * TILE_SIZE){ this.x = nearestPoint.x; this.y = nearestPoint.y; return false; }
    const stepPx = Math.min(nearestDistance, this.packedSpeed() * enemyMoveMultiplier(this) * dt / 1000);
    this.x += (nearestPoint.x - this.x) / nearestDistance * stepPx;
    this.y += (nearestPoint.y - this.y) / nearestDistance * stepPx;
    return true;
  }
  placeOnNearestRouteTile(){
    let nearestPoint = null, nearestDistance = Infinity;
    for(const point of waypointsPx){
      const distance = Math.hypot(point.x - this.x, point.y - this.y);
      if(distance < nearestDistance){ nearestDistance = distance; nearestPoint = point; }
    }
    if(nearestPoint){ this.x = nearestPoint.x; this.y = nearestPoint.y; }
  }
  bossDamageMult(){ return (this.type === 'BOSS' || this.type === 'SANTA') ? BOSS_ATTACK_MULT : 1; }
  updateEscapedMovement(dt){
    this.attackBumpTarget = null; // recomputed fresh below every tick — never left stale if the target changes or drops
    if(this.escapeSettleMs > 0){ this.escapeSettleMs -= dt; this.vx = 0; this.vy = 0; this.curiousTarget = null; return; }
    if(this.escapedAttackTarget && this.escapedAttackTarget.active && !(this.escapedAttackTarget.disabledWavesLeft > 0)){
      // CA303 — see HISTORY.md § [1.5.7] Code Archaeology, CA303
      const blocker = findTouchingBarricade(this);
      const t = (blocker && blocker.active && blocker.hp > 0) ? blocker : this.escapedAttackTarget;
      const surround = enemySurroundPoint(this,t);
    const dx = t.x + (surround ? surround.surroundX : 0) - this.x, dy = t.y + (surround ? surround.surroundY : 0) - this.y;
      const dist = Math.hypot(dx,dy) || 0.0001;
      const engageRange = surround ? 2 : 26;
      if(dist > engageRange){
        this.attackBumpTarget = null; // still closing distance — not pressed against it yet
        const chaseSpeed = surround ? Math.min(this.packedSpeed()*0.7,dist*1000/Math.max(1,dt)) : this.packedSpeed()*0.7; // faster than aimless bumbling (0.4x below) but short of full on-path speed — reads as "went after that one on purpose"
        this.vx = dx/dist*chaseSpeed; this.vy = dy/dist*chaseSpeed;
        this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      } else {
        this.vx = 0; this.vy = 0;
        if(surround && surround.surroundWaiting){this.attackBumpTarget=null;return;}
        this.attackBumpTarget = t;
        this.bumpTime += dt;
        this.escapedAttackTimer -= dt;
        if(this.escapedAttackTimer <= 0){
          this.escapedAttackTimer = 800; // same cadence as the normal on-path breakaway attack
          const defeated = t.takeDamage(Math.max(1, Math.round(this.breakDamage * ENEMY_DAMAGE_SCALE * this.bossDamageMult())), this.statusOnTower, this);
          // CA304 — see HISTORY.md § [1.5.7] Code Archaeology, CA304
          if(defeated && t === this.escapedAttackTarget){ this.escapedAttackTarget = null; this.attackBumpTarget = null; }
        }
      }
      return; // skip the aimless-wander movement below while actively engaging a tower
    }
    // CA305 — see HISTORY.md § [1.5.7] Code Archaeology, CA305
    this.escapedAttackCheckTimer -= dt;
    if(this.escapedAttackCheckTimer <= 0){
      const isBossType = this.bossDamageMult() > 1;
      this.escapedAttackCheckTimer = isBossType ? 400 : 1000 + Math.random()*1000;
      if(isBossType){
        const bossTarget = findNearestActiveTower(this.x, this.y, BOSS_AGGRO_RADIUS);
        if(bossTarget){ this.escapedAttackTarget = bossTarget; this.escapedAttackTimer = 0; }
      } else {
        // LOOSE-SETTLE-01 (1.8.37): after sitting still near the finish line an escaped enemy heads for the closest stickman wherever it stands.
        const target = findNearestActiveTower(this.x, this.y);
        this.curiousTarget = target || null;
        if(target){ this.escapedAttackTarget = target; this.escapedAttackTimer = 0; }
      }
    }
    // LOOSE-WANDERLUST-01 (1.7.73): owner request — loose enemies explore the grass and loop around instead of jiggling in place next to the finish line. Every few seconds an
    // escaped enemy either picks a far-off walkable tile and strolls toward it, or sets off on a wide, gentle circle; it keeps its heading between decisions, so it travels. A curious
    // stickman nearby still pulls it (the old 60 percent lean) and a blocked step still turns it round (the confine code flips its velocity, which is read back as the heading).
    this.wanderRepickTimer -= dt;
    if(this.wanderGoalActive){
      if(Math.hypot(this.wanderGoalX - this.x, this.wanderGoalY - this.y) < LOOSE_WANDER_GOAL_REACHED_PX) this.wanderGoalActive = false, this.wanderRepickTimer = 0;
    }
    if(this.wanderRepickTimer <= 0){
      this.wanderRepickTimer = LOOSE_WANDER_COMMIT_MIN_MS + Math.random()*LOOSE_WANDER_COMMIT_SPREAD_MS;
      this.wanderGoalActive = false; this.wanderTurnRate = 0;
      if(this.curiousTarget && this.curiousTarget.active && Math.random() < 0.6){
        this.wanderGoalActive = true; this.wanderGoalX = this.curiousTarget.x; this.wanderGoalY = this.curiousTarget.y; // curious: ambles toward a nearby stickman
      } else if(Math.random() < LOOSE_WANDER_EXPLORE_SHARE){
        const goal = pickLooseExploreGoal(this.x, this.y);
        if(goal){ this.wanderGoalActive = true; this.wanderGoalX = goal.x; this.wanderGoalY = goal.y; }
      }
      if(!this.wanderGoalActive) this.wanderTurnRate = (Math.random() < 0.5 ? -1 : 1) * (LOOSE_WANDER_TURN_MIN + Math.random()*LOOSE_WANDER_TURN_SPREAD); // a wide loop, radius about 40 to 90 px
    }
    let heading = (this.wanderVx || this.wanderVy) ? Math.atan2(this.wanderVy, this.wanderVx) : Math.random()*Math.PI*2;
    if(this.wanderGoalActive){
      let headingError = Math.atan2(this.wanderGoalY - this.y, this.wanderGoalX - this.x) - heading;
      headingError = Math.atan2(Math.sin(headingError), Math.cos(headingError));
      const maxTurn = LOOSE_WANDER_STEER_RAD_PER_S * dt / 1000;
      heading += Math.max(-maxTurn, Math.min(maxTurn, headingError));
    } else {
      heading += this.wanderTurnRate * dt / 1000;
    }
    const strollSpeed = this.packedSpeed() * (this.wanderGoalActive ? LOOSE_WANDER_EXPLORE_SPEED : LOOSE_WANDER_LOOP_SPEED); // still slower than a run, so it reads as loose rather than fleeing
    this.wanderVx = Math.cos(heading) * strollSpeed;
    this.wanderVy = Math.sin(heading) * strollSpeed;
    this.vx = this.wanderVx; this.vy = this.wanderVy;
    this.x += this.vx*dt/1000;
    this.y += this.vy*dt/1000;
    // CA307 — the region-rectangle clamp that stood here is replaced by confineLooseEnemyToRoute() (LOOSE-CONFINE-01)
  }
  // CA308 — see HISTORY.md § [1.5.7] Code Archaeology, CA308
  updateGuardian(dt){
    this.attackBumpTarget = null;
    const hut = this.hutRef;
    const leader = (hut && hut.active) ? campLeaderTower(hut) : null;
    const guardRadius = 42; // idle leash — tight, reads as "guarding," not patrolling
    if(leader){
      const distFromHut = Math.hypot(this.x - this.hutAnchorX, this.y - this.hutAnchorY);
      if(distFromHut <= GUARDIAN_COMBAT_LEASH){
        // CA309 — see HISTORY.md § [1.5.7] Code Archaeology, CA309
        this.guardianReturning = false;
        const surround = enemySurroundPoint(this,leader);
    const dx = leader.x + (surround ? surround.surroundX : 0) - this.x, dy = leader.y + (surround ? surround.surroundY : 0) - this.y;
        const dist = Math.hypot(dx,dy) || 0.0001;
        const engageRange = surround ? 2 : 26; // same engage range updateBreakaway() uses against a tower
        if(dist > engageRange){
          const moveSpeed = surround ? Math.min(this.packedSpeed(),dist*1000/Math.max(1,dt)) : this.packedSpeed();
      this.vx = dx/dist*moveSpeed; this.vy = dy/dist*moveSpeed;
          this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
        } else {
          this.vx = 0; this.vy = 0;
        if(surround && surround.surroundWaiting){this.attackBumpTarget=null;return;}
          this.attackBumpTarget = leader;
          this.guardAttackTimer = (this.guardAttackTimer||0) - dt;
          if(this.guardAttackTimer <= 0){
            this.guardAttackTimer = Math.round(800 * ENEMY_ATTACK_INTERVAL_SCALE); // same cadence updateBreakaway() uses
            leader.takeDamage(Math.max(1, Math.round(this.breakDamage * ENEMY_DAMAGE_SCALE * this.bossDamageMult())), this.statusOnTower, this);
          }
        }
        return;
      }
      // Beyond the combat leash — disengage and walk home below, same as "no target."
    }
    // CA310 — see HISTORY.md § [1.5.7] Code Archaeology, CA310
    const homeDx = this.hutAnchorX - this.x, homeDy = this.hutAnchorY - this.y;
    const homeDist = Math.hypot(homeDx, homeDy);
    if(homeDist > guardRadius){
      this.guardianReturning = true;
      const returnSpeed = this.packedSpeed() * 0.6;
      this.vx = homeDx/homeDist*returnSpeed; this.vy = homeDy/homeDist*returnSpeed;
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      return;
    }
    this.guardianReturning = false;
    this.wanderRepickTimer -= dt;
    if(this.wanderRepickTimer <= 0){
      this.wanderRepickTimer = 900 + Math.random()*1400;
      const ang = Math.random()*Math.PI*2;
      const bumbleSpeed = this.packedSpeed() * 0.32; // slow, tight bumble — reads as "guarding," not patrolling
      this.wanderVx = Math.cos(ang)*bumbleSpeed;
      this.wanderVy = Math.sin(ang)*bumbleSpeed;
    }
    this.vx = this.wanderVx; this.vy = this.wanderVy;
    this.x += this.vx*dt/1000;
    this.y += this.vy*dt/1000;
    const dx = this.x - this.hutAnchorX, dy = this.y - this.hutAnchorY;
    const dist = Math.hypot(dx,dy) || 0.0001;
    if(dist > guardRadius){
      this.x = this.hutAnchorX + dx/dist*guardRadius;
      this.y = this.hutAnchorY + dy/dist*guardRadius;
      this.wanderVx = -dx/dist*Math.abs(this.wanderVx||30);
      this.wanderVy = -dy/dist*Math.abs(this.wanderVy||30);
    }
  }
  // CA311 — see HISTORY.md § [1.5.7] Code Archaeology, CA311
  updateHutBuilding(dt){
    if(this.destroyed) return; // dead structures don't respawn anything — see die()'s isHutBuilding branch, which sets this permanently
    if(this.guardiansAliveCount > 0 || !this.respawnAt) return; // lane isn't clear yet, or no respawn currently scheduled
    if(gameTime < this.respawnAt) return;
    this.respawnAt = null;
    // CA312 — see HISTORY.md § [1.5.7] Code Archaeology, CA312
    for(let i=0;i<2;i++){
      if(this.buildingKind === 'CASTLE') spawnCastleGuardian(this);
      else if(this.buildingKind === 'GRAVE') spawnGraveGuardian(this);
      else spawnHutGuardian(this);
    }
  }
  applyDamage(amount, sourceTower, forStreak, isHoly, allowBleed, countsAsShotHit, ignoreArmor, bloodImpactAngle, bloodProfileKey){
    if(!this.active || this.deathResolved) return; // already dead — a stale reference (this tick's targeting/collision hash is built before towers attack, so a kill earlier in the same tick doesn't remove the corpse from it until the next rebuild) must not re-process damage, blood marks, or a second die() call
    this.damageHitCount = (this.damageHitCount || 0) + 1;
    // CA313 — see HISTORY.md § [1.5.7] Code Archaeology, CA313
    const isGraveTarget = (this.isHutBuilding && this.buildingKind === 'GRAVE') || (this.isGuardian && this.hutRef && this.hutRef.buildingKind === 'GRAVE');
    if(isGraveTarget && !isHoly) amount = Math.max(1, Math.round(amount * 0.05));
    this.recordContribution(sourceTower, amount, countsAsShotHit);
    // CA314 — see HISTORY.md § [1.5.7] Code Archaeology, CA314
    const varianceHalfWidth = (sourceTower && sourceTower.type === 'MAGE') ? 0.4 : 0.2;
    // CA315 — see HISTORY.md § [1.5.7] Code Archaeology, CA315
    const statSpreadBonus = (sourceTower && sourceTower.primaryStatEff) ? diminishingStatValue(sourceTower.primaryStatEff, 0.0003) : 0;
    const effectiveVarianceHalfWidth = Math.min(0.6, varianceHalfWidth + statSpreadBonus);
    const damageVariance = (1 - effectiveVarianceHalfWidth) + Math.random()*(effectiveVarianceHalfWidth*2);
    let dmg = Math.max(1, Math.round(amount * damageVariance));
    // CA316 — see HISTORY.md § [1.5.7] Code Archaeology, CA316
    const isCritical = sourceTower ? prdRollFires(sourceTower.critChance, sourceTower, 'critLuckBalance') : Math.random() < 0.025;
    if(isCritical) dmg = Math.round(dmg * (sourceTower ? sourceTower.critMult : 1.2));
    // CA797 — see HISTORY.md § [1.6.61] Cleric smite.
    // Cleric's direct smite opts into armor bypass. Keep it explicit so Paladin's holy swings
    // retain their established armor interaction.
    const holyBonus = (isHoly && this.isUndead);
    if(holyBonus) dmg = Math.round(dmg * 1.5);
    if(this.frozenUntil > gameTime) dmg = Math.round(dmg * FROZEN_DAMAGE_MULT); // ICE-BLOCK-01 shatter bonus
    if(this.armor && !ignoreArmor) dmg = Math.max(1, dmg - this.armor, dmg * ARMOR_MIN_DAMAGE_SHARE); // ARMOR-FLOOR-01 (1.6.121) — see HISTORY.md § [1.6.121]
    if(this.hasShield && this.shieldHp > 0){
      const absorbed = Math.min(this.shieldHp, dmg);
      this.shieldHp -= absorbed;
      dmg -= absorbed;
      this.shieldRegenTimer = 3000; // getting hit delays the next regen tick
      spawnParticles(this.x, this.y, '#7dd3fc', 4);
      if(dmg <= 0){
        this.flashTimer = 60;
        if(absorbed > 0) spawnFloatingText(this.x, this.y - this.radius, 'BLOCKED', '#7dd3fc');
        return; // shield fully absorbed this hit — no HP lost, no kill possible from it
      }
    }
    // CA317 — see HISTORY.md § [1.5.7] Code Archaeology, CA317
    if(sourceTower && (this.isGuardian || this.isHutBuilding)){
      const hut = this.isHutBuilding ? this : this.hutRef;
      if(hut && hut.active){
        if(!hut.campDamageLedger) hut.campDamageLedger = new Map();
        const counted = Math.min(dmg, this.hp);
        hut.campDamageLedger.set(sourceTower, (hut.campDamageLedger.get(sourceTower) || 0) + counted);
      }
    }
    this.hp -= dmg;
    if(countsAsShotHit !== false || bloodProfileKey) spawnWeaponBloodContact(this, sourceTower, bloodImpactAngle, bloodProfileKey); // SWORD-BLOOD-ARC-01 (1.7.163): outside generic spray chance, after shield absorption
    this.flashTimer = 120;
    // CA318 — see HISTORY.md § [1.5.7] Code Archaeology, CA318
    const flinchSeverity = clampNum(dmg / this.maxHp, 0, 1);
    // CA319 — see HISTORY.md § [1.5.7] Code Archaeology, CA319
    const hitRoll = damageVariance;
    // CA320 — see HISTORY.md § [1.5.7] Code Archaeology, CA320
    const dmgRollT = clampNum((hitRoll - (1-effectiveVarianceHalfWidth)) / (effectiveVarianceHalfWidth*2), 0, 1);
    // CA321 — see HISTORY.md § [1.5.7] Code Archaeology, CA321
    this.flinchAngle = weaponBloodAngle(this, sourceTower, bloodImpactAngle);
    this.flinchMag = 1.5 + flinchSeverity*5;
    this.flinchStart = realTime;
    this.flinchDuration = 130 + flinchSeverity*90;
    if(holyBonus){
      spawnRoutineCombatText(this.x, this.y - this.radius, '✨' + Math.round(dmg), '#ffe9a8');
    } else if(isCritical){
      spawnRoutineCombatText(this.x, this.y - this.radius, '💥' + Math.round(dmg), '#ffd23f');
    } else {
      spawnRoutineCombatText(this.x, this.y - this.radius, Math.round(dmg).toString(), '#ff6b6b');
    }
    // CA322 — see HISTORY.md § [1.5.7] Code Archaeology, CA322
    if(this.isHutBuilding){
      if(Math.random() < 0.15) spawnBarricadeDebris(this); // lowered from 0.35 — a hut's 16x-normal HP means a long fight lands far more hits than a barricade ever takes, so the same per-hit chance produced a lot more accumulated rubble around a hut than around a barricade dying quickly
    // PERF-DEATH-01 (1.6.14): the reference footage is set to Low and already shows dozens of
    // persistent hit decals with zero deaths. Keep impact gore, but thin repeated hit splashes on
    // Low/crowded frames; death bursts use the same quality-aware budget below.
    } else if(goreMode && Math.random() < BLOOD_ON_HIT_CHANCE * ((graphicsQuality === 'low' || underHeavyVisualLoad || (gameSpeed >= 5 && performance.now()-lastCameraInteractionAt < CAMERA_MOTION_FULL_RATE_MS)) ? 0.15 : 1)){
      const bio = this.bloodProfile || getBloodProfile(this.type);
      const viscFriction = bio.viscous ? 0.88 : 0.93; // thicker fluids decelerate faster, don't travel as far
      const arch = resolveGoreArchetype(sourceTower);
      const impactAngle = weaponBloodAngle(this, sourceTower, bloodImpactAngle);
      // CA323 — see HISTORY.md § [1.5.7] Code Archaeology, CA323
      const NORMAL_HIT_CEILING = 0.55;
      let bloodScaleT = Math.pow(Math.random(), 3) * NORMAL_HIT_CEILING;
      // CA324 — see HISTORY.md § [1.5.7] Code Archaeology, CA324
      const canSplatterBig = this.sizeTier === 'LARGE' || this.sizeTier === 'BOSS';
      if(isCritical){
        const critCeiling = canSplatterBig ? 1 : NORMAL_HIT_CEILING + (1-NORMAL_HIT_CEILING)*0.4;
        bloodScaleT = Math.max(bloodScaleT, NORMAL_HIT_CEILING + Math.pow(Math.random(), 0.6) * (critCeiling - NORMAL_HIT_CEILING));
      }
      // CA325 — see HISTORY.md § [1.5.7] Code Archaeology, CA325
      const hpFrac = Math.max(0.15, this.hp / this.maxHp);
      if(!this.recentAttackers) this.recentAttackers = new Map();
      if(sourceTower) this.recentAttackers.set(sourceTower, gameTime);
      for(const [tw, t] of this.recentAttackers){ if(gameTime - t > 400) this.recentAttackers.delete(tw); }
      const concurrentAttackers = Math.max(1, this.recentAttackers.size);
      const hitPower = (0.15 + bloodScaleT * 1.85) * (0.7 + flinchSeverity*0.5) * (0.9 + hitRoll*0.15) * hpFrac / concurrentAttackers;
      // CA326 — see HISTORY.md § [1.5.7] Code Archaeology, CA326
      const bloodWeightScale = bloodPoolSizeScale(this.radius);
      const weapon = resolveWeaponSubtype(sourceTower);
      spawnForensicSpatter(this.x, this.y, bio, sourceTower, hitPower, false, 1, graphicsQuality === 'low' || underHeavyVisualLoad, this, bloodImpactAngle, bloodProfileKey);
      if(bio.isDust){
        spawnParticles(this.x, this.y, bio.bright, 8, 200, undefined, undefined, undefined, undefined, undefined, !bio.isDust); // rock chips, no liquid streams or pooling
        if(Math.random() < 0.1) spawnRockChips(this.x, this.y, this.radius, 1); // 1-in-10 chance per hit — a visible chip, not just dust
      } else if(arch === 'ARCHER'){
        // CA327 — see HISTORY.md § [1.5.7] Code Archaeology, CA327
        spawnParticles(this.x, this.y, bio.spray, Math.max(2, Math.round(6*hitPower)), 60, 0.94, true, impactAngle, 0.5, undefined, !bio.isDust);
        // CA328 — see HISTORY.md § [1.5.7] Code Archaeology, CA328
        spawnParticles(this.x, this.y, bio.spray, Math.max(1, Math.round(2*hitPower)), 50, 0.92, true, impactAngle + Math.PI, 0.55, undefined, !bio.isDust);
        if(Math.random() < 0.7) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6));
        if(!bio.isDust){
          // CA329 — see HISTORY.md § [1.5.7] Code Archaeology, CA329
          spawnPunctureMark(this.x, this.y);
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.55), Math.max(1, Math.round((2 + Math.floor(Math.random()*2))*hitPower)), impactAngle, 2.4, this); // several fine mist droplets flung well past the wound, not just one
          if(Math.random() < 0.4) spawnBloodCastoff(this.x, this.y, impactAngle, hexToRgba(bio.dark, 0.5), undefined, 0.8 * bloodWeightScale, this); // an occasional short, thin graze streak — small, but adds to the visible mark count
        }
      } else if(arch === 'MAGE'){
        // CA330 — see HISTORY.md § [1.5.7] Code Archaeology, CA330
        // MAGE-BLOOD-RANGE-01 (1.7.137) — independent weight-scaled streak length and width; shared blocker interception.
        const mageConeWidth = 2.3; // ~132° — wide enough to read as a blast, not a pinpoint beam
        // CA331 — see HISTORY.md § [1.5.7] Code Archaeology, CA331
        const mageBurstMult = isCritical ? 1.4 : 1;
        spawnParticles(this.x, this.y, bio.bright, Math.round(6*hitPower*mageBurstMult*bloodWeightScale), 420, 0.88, true, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
        spawnParticles(this.x, this.y, bio.spray, Math.round(4*hitPower*mageBurstMult*bloodWeightScale), 460, 0.86, true, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
        if(!bio.isDust){
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), Math.max(2, Math.round((9 + Math.floor(Math.random()*4))*hitPower)), impactAngle, 1.6, this);
          // CA332 — see HISTORY.md § [1.5.7] Code Archaeology, CA332
          const dmgRollT = clampNum((damageVariance - 0.6) / 0.8, 0, 1); // 0 at Mage's min roll (0.6x), 1 at its max roll (1.4x) — matches the widened ±40% band above
          // CA333 — see HISTORY.md § [1.5.7] Code Archaeology, CA333
          const sprayVolumeRoll = Math.random();
          const sprayVolume = sprayVolumeRoll < 0.55 ? 0.5 : sprayVolumeRoll < 0.9 ? 1 : 1.5;
          const streakCount = Math.max(1, Math.round((1 + dmgRollT * 3) * sprayVolume));
          // CA334 — see HISTORY.md § [1.5.7] Code Archaeology, CA334
          for(let s=0; s<streakCount; s++){
            const streakAngle = impactAngle + (Math.random()-0.5)*mageConeWidth;
            spawnBloodCastoff(this.x, this.y, streakAngle, hexToRgba(bio.dark, 0.6 + Math.random()*0.15), undefined, (0.25 + Math.pow(Math.random(),2)*1.55) * bloodWeightScale, this, (0.25 + Math.random()*0.55)*bloodWeightScale);
          }
        }
        // CA335 — see HISTORY.md § [1.5.7] Code Archaeology, CA335
        spawnParticles(this.x, this.y, bio.spray, Math.max(2, Math.round(8*hitPower)), 180, 0.85, true, impactAngle + Math.PI, 0.6, undefined, !bio.isDust);
        // CA336 — see HISTORY.md § [1.5.7] Code Archaeology, CA336
        if(!bio.isDust) spawnParticles(this.x, this.y, '#c9a8ff', Math.max(2, Math.round(6*hitPower)), 300, 0.87, false, impactAngle, mageConeWidth);
      } else if(arch === 'EXPLOSIVE'){
        // CA337 — see HISTORY.md § [1.5.7] Code Archaeology, CA337
        spawnParticles(this.x, this.y, bio.bright, Math.round(10*hitPower), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
        spawnParticles(this.x, this.y, bio.dark, Math.max(2, Math.round(6*hitPower)), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
        // CA338 — see HISTORY.md § [1.5.7] Code Archaeology, CA338
        spawnParticles(this.x, this.y, '#8a8a8a', Math.max(1, Math.round(5*hitPower)), 140, 0.9, false);
      } else {
        // CA339 — see HISTORY.md § [1.5.7] Code Archaeology, CA339
        if(weapon === 'BLUNT'){
          // CA340 — see HISTORY.md § [1.5.7] Code Archaeology, CA340
          spawnParticles(this.x, this.y, bio.bright, Math.round(16*hitPower), 170, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          spawnParticles(this.x, this.y, bio.dark, Math.max(2, Math.round(6*hitPower)), 170, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.65), Math.max(1, Math.round((2 + Math.floor(Math.random()*2))*hitPower)), undefined, undefined, this);
          spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.5), (18 + Math.random()*8) * (0.85 + hitPower*0.2) * bloodWeightScale, impactAngle, Math.PI*1.15); // a crushing blow compresses a visibly wider ring than a light glancing knock — biased toward the far side of impact, not a full circle back toward the source
          // CA341 — see HISTORY.md § [1.5.7] Code Archaeology, CA341
          if(flinchSeverity > 0.55) spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.4), (9 + Math.random()*4) * (0.9 + hitPower*0.15) * bloodWeightScale, impactAngle, Math.PI*0.8);
          if(Math.random() < 0.3) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.55));
        } else if(weapon === 'PIERCE'){
          // CA342 — see HISTORY.md § [1.5.7] Code Archaeology, CA342
          spawnParticles(this.x, this.y, bio.bright, Math.max(2, Math.round(10*hitPower)), 240, viscFriction, true, impactAngle, 0.7, undefined, !bio.isDust);
          spawnBloodStream(this.x, this.y, impactAngle, Math.max(1, Math.round(3*hitPower)), 1.2, bio.bright, bio.dark, this);
          if(Math.random() < 0.6) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6));
          // CA343 — see HISTORY.md § [1.5.7] Code Archaeology, CA343
          spawnDripTrail(this.x - Math.cos(impactAngle)*7, this.y - Math.sin(impactAngle)*7, hexToRgba(bio.dark, 0.5));
        } else {
          // CA344 — see HISTORY.md § [1.5.7] Code Archaeology, CA344
          const slashAngle = impactAngle + Math.PI/2 + (Math.random()-0.5)*0.5;
          // CA345 — see HISTORY.md § [1.5.7] Code Archaeology, CA345
          const firstBlood = sourceTower && !sourceTower.weaponBloodied;
          if(sourceTower) sourceTower.weaponBloodied = true;
          const bloodedMult = firstBlood ? 0.22 : 1;
          // CA346 — see HISTORY.md § [1.5.7] Code Archaeology, CA346
          const cutSize = (0.4 + flinchSeverity*1.7) * bloodedMult * (0.35 + bloodScaleT * 1.5) * hpFrac / concurrentAttackers; // reuses the same sliding-scale roll, size-gating, HP-proportional reserve, and concurrent-attacker split as hitPower above
          // CA347 — see HISTORY.md § [1.5.7] Code Archaeology, CA347
          const cutColor = shiftHexColor(bio.dark, (Math.random()-0.5)*8, (Math.random()-0.5)*6);
          spawnParticles(this.x, this.y, bio.bright, Math.max(2, Math.round(12*hitPower)), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
          spawnBloodCastoff(this.x, this.y, slashAngle, hexToRgba(cutColor, 0.7), undefined, cutSize * bloodWeightScale, this);
          // CA348 — see HISTORY.md § [1.5.7] Code Archaeology, CA348
          if(sourceTower && graphicsQuality !== 'low'){
            spawnSwingArcGuide(this.x, this.y, slashAngle, towerSwingDir(sourceTower), this.radius + 14);
          }
          if(!firstBlood){
          if(sourceTower && sourceTower.type === 'AXEMAN'){
            // CA349 — see HISTORY.md § [1.5.7] Code Archaeology, CA349
            spawnCastOffArc(this.x, this.y, slashAngle + Math.PI + (Math.random()-0.5)*0.3, hexToRgba(cutColor, 0.65), undefined, sourceTower ? towerSwingDir(sourceTower) : undefined, this);
            if(Math.random() < 0.6){
              spawnCastOffArc(this.x, this.y, slashAngle + Math.PI + (Math.random()-0.5)*0.9, hexToRgba(bio.dark, 0.55), 2 + Math.floor(Math.random()*2), sourceTower ? -towerSwingDir(sourceTower) : undefined, this);
            }
          } else if(!sourceTower || sourceTower.type !== 'SWORDSMAN'){
            spawnCastOffArc(this.x, this.y, slashAngle + Math.PI, hexToRgba(cutColor, 0.65), undefined, sourceTower ? towerSwingDir(sourceTower) : undefined, this);
          }
          }
          if(Math.random() < 0.4) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6));
          // CA350 — see HISTORY.md § [1.5.7] Code Archaeology, CA350
          if(flinchSeverity > 0.6){
            const spurtAngle = slashAngle + (Math.random()<0.5 ? Math.PI/2 : -Math.PI/2);
            spawnBloodStream(this.x, this.y, spurtAngle, 1, 0.7, bio.bright, bio.dark, this);
          }
        }
      }
      // CA351 — see HISTORY.md § [1.5.7] Code Archaeology, CA351
      const decalArch = arch === 'WARRIOR' ? weapon : arch;
      if(!bio.isDust) playImpactSound(decalArch, this.x, hitPower, isCritical, sourceTower ? sourceTower.id : undefined, this.y);
      const markChance = (arch === 'ARCHER' || arch === 'MAGE') ? 0.5 : 0.3;
      if(!bio.isDust && this.hp > 0 && Math.random() < markChance){
        spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), 0.5), true, impactAngle, decalArch, bio.viscous, dmgRollT, bloodPoolSizeScale(this.radius), this);
      }
      // CA352 — see HISTORY.md § [1.5.7] Code Archaeology, CA352
      const severity = dmg / this.maxHp;
      if(!bio.isDust && this.hp > 0 && severity > 0.08){
        startDripSite(this.x, this.y, hexToRgba(bio.dark, 0.65), severity);
      }
      // CA353 — see HISTORY.md § [1.5.7] Code Archaeology, CA353
      if(!bio.isDust && this.hp > 0 && severity > 0.15 && Math.random() < 0.3){
        spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.62));
      }
    } else {
      spawnParticles(this.x, this.y, '#ffaa33', 3, 0);
    }
    if(this.hp <= 0) this.die(sourceTower, forStreak, bloodImpactAngle, bloodProfileKey);
  }
  die(sourceTower, forStreak, bloodImpactAngle, bloodProfileKey){
    if(!this.active || this.deathResolved) return; // already fully dead — see the matching guard in applyDamage() for the main reason this matters
    recordUnitDeath('enemy',this.type,this.escaped ? 'escaped enemy defeated' : 'defeated');
    if(!this.isLivestock && !this.isHutBuilding && !underHeavyVisualLoad) startleNearbyAllies(this);
    if(this.isLivestock && !LIVESTOCK_TYPES[this.type]) this.isLivestock = false; // LIVESTOCK-RECYCLE-01 safety net: a real enemy can never be treated as livestock
    if(this.isLivestock){
      this.active = false;
      enemyPresenceDirty = true;
      if(markedTargetEnemy === this) markedTargetEnemy = null;
      const def = LIVESTOCK_TYPES[this.type];
      if(def.hunter){
        logGameEvent(def.hunter.label + ' defeated');
        const bagCount = def.hunter.goldBags + (def.isTroll ? Math.floor(Math.random()*2) : 0);
        for(let b=0; b<bagCount; b++) dropGoldBag(this.x + (b-1)*14, this.y);
      } else {
        const meatCount = livestockMeatDropCount(this.type);
        for(let n=0;n<meatCount;n++) spawnGroundItem(this.x+(n-(meatCount-1)/2)*10, this.y-6, FOOD_BY_ID.get(def.meatId), 'livestock');
      }
      spawnParticles(this.x, this.y, '#ffcc99', 10);
      playSound('click');
      trackGameEvent('livestock_harvested', { livestock: this.type });
      return;
    }
    const deathStartedAt = performance.now();
    if(this.revives && !this.hasRevived){
      this.hasRevived = true;
      this.maxHp = Math.round(this.maxHp * 0.5); // permanently weaker second life
      this.hp = this.maxHp;
      spawnFloatingText(this.x, this.y - this.radius - 10, '💀 Reanimated!', '#c9a8ff');
      spawnParticles(this.x, this.y, '#c9a8ff', 10);
      playSound('wave');
      return; // not actually dead yet — no bounty, no kill credit, skip normal death handling
    }
    this.deathResolved = true;
    if(markedTargetEnemy === this) setMarkedTarget(null);
    if(this.splits && !this.hasSplit) this.spawnSplitChildren();
    dischargeShockBurst(this, sourceTower);
    // recordContribution() runs before HP subtraction, so it cannot detect the lethal hit.
    // Count only an actual death, after the revive guard, and only once.
    if(sourceTower && sourceTower.active && sourceTower.telemetry) sourceTower.telemetry.killsSecured++;
    if(sourceTower && sourceTower.active) sourceTower.lastKillTime = gameTime;
    awardKillExperience(this, sourceTower, forStreak);
    applyKillShake(this);
    if((this.type === 'BOSS' || this.type === 'SANTA') && sourceTower) grantTowerMove(sourceTower, 'boss kill');
    if((this.type === 'BOSS' || this.type === 'SANTA') && sourceTower) requestStickmanBark(sourceTower, BARK_TIER_IMPORTANT, '😎', BARK_LINES.BOSS_KILL, 0, BARK_CHANCE.BOSS_KILL);
    if(this.type === 'TROLL' && !this.escaped){ for(let b=0; b<2; b++) dropGoldBag(this.x + (b*2-1)*10, this.y); }
    else if(Math.random() < 0.15 && !this.escaped){
      const coin=acquireCoinSlot();coin.value=1+Math.floor(Math.random()*3);coin.age=0;coin.lifespan=coinPickupLifespan();coin.active=true;launchCoin(coin,this.x,this.y);
    }
    const explodesInGore = goreMode && this.damageHitCount === 1 && !!sourceTower && !this.isHutBuilding && !(this.bloodProfile || getBloodProfile(this.type)).isDust && Math.random() < GORE_EXPLOSION_CHANCE; // GORE-EXPLOSION-01 (1.7.100)
    if(!explodesInGore) spawnDeathAnim(this.x, this.y, this.emoji, this.radius); // brief squash-and-fade in place of an instant vanish
    this.active = false;
    if(this.escaped && waveState==='IDLE' && gameState==='PLAYING' && countLooseEnemies()===0) playSound('wave_clear');
    if(this.isStealthSanta){ stealthSantaDefeated=true; unlockTowerTypeBuild('NINJA'); }
    // CA355 — see HISTORY.md § [1.5.7] Code Archaeology, CA355
    if(this.isGuardian && this.hutRef && this.hutRef.active){
      this.hutRef.guardiansAliveCount = Math.max(0, this.hutRef.guardiansAliveCount - 1);
      if(this.hutRef.guardiansAliveCount === 0 && !this.hutRef.destroyed){
        this.hutRef.respawnAt = gameTime + 60000; // fixed 60s per direct feedback (was a random 1-5 minute wait)
      }
    }
    if(this.isHutBuilding){
      this.destroyed = true;
      this.respawnAt = null;
      spawnFloatingText(this.x, this.y - this.radius - 24, this.buildingKind === 'CIRCUS' ? 'Circus closed!' : 'Camp cleared!', '#ffd23f');
      spawnHutLootChest(this.x, this.y);
    }
    const bountyMult = this.escaped ? ESCAPED_CLEANUP_FRACTION : 1; // LUCK-REMOVED-01 (1.7.162)
    const bountyGold = Math.round(this.bounty * bountyMult);
    if(this.type === 'TANK'){
      const bountyStone = Math.round(14 * bountyMult);
      stone += bountyStone;
      spawnFloatingText(this.x, this.y - this.radius - 20, '+' + bountyStone + '🪨', '#bdbdbd');
    } else if(this.sizeTier === 'LARGE' && !this.escaped && bountyGold >= 2){
      // LARGE-BAGS-01 (1.6.116) — see HISTORY.md § [1.6.116]
      dropGoldBag(this.x, this.y, bountyGold);
    } else {
      gold += bountyGold;
      
    }
    dropItemsFromEnemy(this);
    if(this.type === 'BOSS' || this.type === 'SANTA') dropTreatFromBoss(this);
    // PERF-DEATH-01 (1.6.14): low graphics and crowded battles use the authored lighter death
    // effect path. The old hard-coded false forced full particle/decal bursts even at low quality.
    const low = graphicsQuality === 'low' || underHeavyVisualLoad;
    // CA356 — see HISTORY.md § [1.5.7] Code Archaeology, CA356
    const proximityT = clampNum(this.traveled / (routeLengthPx() || 1), 0, 1); // 0 at spawn, 1 at the finish line
    let proximityMult = 1;
    if(proximityT > 0.75 && Math.random() < 0.25) proximityMult = 1.12; // close to the finish — slight chance of bigger
    else if(proximityT < 0.25 && Math.random() < 0.35) proximityMult = 0.88; // still near spawn — slight pull toward smaller
    const bloodWeightScale = bloodPoolSizeScale(this.radius); // BLOOD-WEIGHT-01 (1.7.134) — see HISTORY.md § [1.7.134]
    const goreScale = (this.bloodProfile && this.bloodProfile.isDust ? Math.min(1.8, Math.max(0.7, (this.maxHp/60 + this.radius/15) / 2)) : bloodWeightScale) * proximityMult;
    if(goreMode){
      const bio = this.bloodProfile || getBloodProfile(this.type);
      const viscFriction = bio.viscous ? 0.88 : 0.93; // thicker fluids decelerate faster, don't travel as far
      const arch = resolveGoreArchetype(sourceTower);
      if(explodesInGore) spawnGoreExplosion(this.x, this.y, bio, sourceTower, goreScale, low, this, bloodImpactAngle, bloodProfileKey);
      else spawnForensicSpatter(this.x, this.y, bio, sourceTower, 1, true, goreScale, low, this, bloodImpactAngle, bloodProfileKey);
      if(bio.isDust){
        // rock/debris burst — chunky dust, no liquid streams, no pooling decal
        spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 14 : 36)*goreScale), 220, undefined, undefined, undefined, undefined, undefined, !bio.isDust);
        spawnParticles(this.x, this.y, bio.dark, Math.round((low ? 8 : 20)*goreScale), 220, undefined, undefined, undefined, undefined, undefined, !bio.isDust);
        spawnGibs(this.x, this.y, Math.round((low ? 5 : 12)*goreScale));
        spawnRockChips(this.x, this.y, this.radius, 2 + Math.floor(Math.random()*4)); // 2-5 visible chips on death
      } else {
        const impactAngle = weaponBloodAngle(this, sourceTower, bloodImpactAngle);
        if(arch === 'HOLY'){
          // CA357 — see HISTORY.md § [1.5.7] Code Archaeology, CA357
          const holyBright = shiftHexColor(bio.bright, 25, 22);
          const holySpray = shiftHexColor(bio.spray, 25, 28);
          spawnParticles(this.x, this.y, holyBright, Math.round((low ? 10 : 26)*goreScale), 90, 0.85, false, undefined, undefined, 0.5, true);
          if(!bio.noArterial) spawnParticles(this.x, this.y, holySpray, Math.round((low ? 8 : 20)*goreScale), 60, 0.82, false, undefined, undefined, 0.4, true);
          if(!low) spawnGibs(this.x, this.y, 1); // a single small fragment — mostly mist, not a burst
          spawnHolyBeam(this.x, this.y, '#fff3c4');
        } else if(arch === 'EXPLOSIVE'){
          // genuinely explosive kill — a real radial burst is earned here, not the default
          spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 18 : 48)*goreScale), 260, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
          spawnParticles(this.x, this.y, bio.dark, Math.round((low ? 9 : 24)*goreScale), 260, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
          if(!bio.noArterial) spawnParticles(this.x, this.y, bio.spray, Math.round((low ? 5 : 13)*goreScale), 340, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
          spawnGibs(this.x, this.y, Math.round((low ? 4 : 10)*goreScale));
          for(let s=0; s<Math.round((low ? 3 : 6)*goreScale); s++){
            spawnBloodStream(this.x, this.y, Math.random()*Math.PI*2, low ? 1 : 2, undefined, bio.bright, bio.dark, this);
          }
        } else if(arch === 'ARCHER'){
          // CA358 — see HISTORY.md § [1.5.7] Code Archaeology, CA358
          spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 2 : 5)*goreScale), 90, 0.94, !low, undefined, undefined, undefined, !bio.isDust);
          if(!low) spawnParticles(this.x, this.y, bio.bright, Math.max(1, Math.round(2*goreScale)), 80, 0.92, false, impactAngle + Math.PI, 0.55, undefined, !bio.isDust); // back-spatter, same asymmetric treatment as the hit-time branch above
          if(!bio.noArterial){
            for(let d=0; d<Math.round(3*goreScale); d++){
              spawnDripTrail(this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*7, hexToRgba(bio.dark, 0.6));
            }
            if(!low) spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.5), 2 + Math.floor(Math.random()*2), impactAngle, 2.6, this);
          }
          spawnGibs(this.x, this.y, Math.max(1, Math.round(1*goreScale)));
        } else if(arch === 'MAGE'){
          // CA359 — see HISTORY.md § [1.5.7] Code Archaeology, CA359
          const mageConeWidth = 2.3;
          spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 8 : 18)*goreScale), 400, viscFriction, !low, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
          spawnParticles(this.x, this.y, bio.spray, Math.round((low ? 5 : 10)*goreScale), 440, viscFriction, !low, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
          if(!low){
            spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), 8 + Math.floor(Math.random()*4), impactAngle, 1.6, this);
            const streakCount = Math.max(1,Math.round((3 + Math.floor(Math.random()*4))*goreScale));
            // CA360 — see HISTORY.md § [1.5.7] Code Archaeology, CA360
            for(let s=0; s<streakCount; s++){
              const streakAngle = impactAngle + (Math.random()-0.5)*mageConeWidth;
              spawnBloodCastoff(this.x, this.y, streakAngle, hexToRgba(bio.dark, 0.6), undefined, (0.25 + Math.pow(Math.random(),2)*1.55) * bloodWeightScale, this, (0.25 + Math.random()*0.55)*bloodWeightScale);
            }
          }
          spawnGibs(this.x, this.y, Math.max(2, Math.round(3*goreScale)));
        } else {
          // CA361 — see HISTORY.md § [1.5.7] Code Archaeology, CA361
          const weapon = resolveWeaponSubtype(sourceTower);
          if(weapon === 'BLUNT'){
            // CA362 — see HISTORY.md § [1.5.7] Code Archaeology, CA362
            spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 7 : 16)*goreScale), 210, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            spawnParticles(this.x, this.y, bio.dark, Math.round((low ? 5 : 9)*goreScale), 210, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            if(!low){
              spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.65), 3 + Math.floor(Math.random()*2), undefined, undefined, this);
              spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.5), (22 + Math.random()*9) * bloodWeightScale, impactAngle, Math.PI*1.15);
            }
            spawnGibs(this.x, this.y, Math.max(2, Math.round(3*goreScale))); // a crushing kill scatters more debris than a clean cut
          } else if(weapon === 'PIERCE'){
            // CA363 — see HISTORY.md § [1.5.7] Code Archaeology, CA363
            spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 4 : 9)*goreScale), 240, viscFriction, !low, impactAngle, 0.8, undefined, !bio.isDust);
            if(!bio.noArterial){
              const gushCount = Math.max(2, Math.round(4*goreScale));
              for(let g=0; g<gushCount; g++){
                spawnBloodStream(this.x, this.y, impactAngle + (Math.random()-0.5)*0.3, low ? 1 : 2, 1.9 + Math.random()*0.9, bio.bright, bio.dark, this);
              }
            }
            spawnGibs(this.x, this.y, Math.max(1, Math.round(2*goreScale)));
          } else {
            // CA364 — see HISTORY.md § [1.5.7] Code Archaeology, CA364
            spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 6 : 14)*goreScale), 220, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            spawnParticles(this.x, this.y, bio.dark, Math.round((low ? 4 : 8)*goreScale), 220, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            if(!bio.noArterial){
              const gushCount = Math.max(2, Math.round(3*goreScale));
              for(let g=0; g<gushCount; g++){
                const jitter = impactAngle + (Math.random()-0.5)*0.6;
                spawnBloodStream(this.x, this.y, jitter, low ? 1 : 2, 1.6 + Math.random()*0.8, bio.bright, bio.dark, this);
              }
            }
            spawnGibs(this.x, this.y, Math.max(1, Math.round(2*goreScale))); // minimal debris, not chunks flying everywhere
          }
        }
        // CA365 — see HISTORY.md § [1.5.7] Code Archaeology, CA365
        if(!low && !bio.isDust && !bio.noArterial && Math.random() < 0.15){
          spawnExpiratedMist(this.x, this.y);
        }
        // CA366 — see HISTORY.md § [1.5.7] Code Archaeology, CA366
        if(!low && !bio.isDust){
          spawnParticles(this.x, this.y, bio.spray, Math.max(3, Math.round(9*goreScale)), 130, 0.9, false, undefined, undefined, 0.5, !bio.isDust);
        }
        // CA367 — see HISTORY.md § [1.5.7] Code Archaeology, CA367
        if(!bio.isDust && Math.random() < BONE_DROP_CHANCE) spawnBoneDebris(this.x, this.y, this.radius);
        if(!bio.isDust && Math.random() < 0.08 + this.radius/200) spawnSkullDrop(this.x, this.y, this.radius); // bigger enemies leave a skull more often: about 12% at radius 9, 16% at 15, 19% at 22
        if(Math.random() < 0.55){
          // CA368 — see HISTORY.md § [1.5.7] Code Archaeology, CA368
          const decalArch = arch === 'WARRIOR' ? resolveWeaponSubtype(sourceTower) : arch;
          spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), low ? 0.6 : 0.75), false, impactAngle, decalArch, bio.viscous, undefined, bloodPoolSizeScale(this.radius), this);
        }
        if(!low){
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.75), 2 + Math.floor(Math.random()*3), undefined, undefined, this);
          startDripSite(this.x, this.y, hexToRgba(bio.dark, 0.7));
          // CA369 — see HISTORY.md § [1.5.7] Code Archaeology, CA369
          if(Math.random() < 0.7){
            spawnDripTrail(this.x + (Math.random()-0.5)*8, this.y + (Math.random()-0.5)*5, hexToRgba(bio.dark, 0.6));
          }
        }
        if(!low && sourceTower && sourceTower.type !== 'SWORDSMAN' && arch !== 'EXPLOSIVE' && Math.random() < 0.5){
          const castoffAngle = Math.atan2(this.y - sourceTower.y, this.x - sourceTower.x);
          if(arch === 'WARRIOR' && resolveWeaponSubtype(sourceTower) === 'BLADE'){
            // CA370 — see HISTORY.md § [1.5.7] Code Archaeology, CA370
            spawnCastOffArc(this.x, this.y, castoffAngle, hexToRgba(bio.dark, 0.6), undefined, sourceTower ? towerSwingDir(sourceTower) : undefined, this);
          } else {
            spawnBloodCastoff(this.x, this.y, castoffAngle, hexToRgba(bio.dark, 0.6), undefined, bloodWeightScale, this);
          }
        }
      }
      if(this.type === 'BOSS' || this.type === 'SANTA'){
        hitStopUntil = gameTime + 40; // brief 40ms freeze-frame for impact weight — a different effect than screen shake, not covered by that toggle
      }
    } else {
      spawnParticles(this.x, this.y, '#ffd23f', low ? 5 : 9);
    }
    const finish = waypointsPx[waypointsPx.length - 1];
    if(finish && !this.escaped && !this.isLivestock && !this.isGuardian && presentationTime - lastCloseCallAt > CLOSE_CALL_GAP_MS && Math.hypot(this.x - finish.x, this.y - finish.y) < CLOSE_CALL_RADIUS_PX){
      lastCloseCallAt = presentationTime;
      hitStopUntil = Math.max(hitStopUntil, gameTime + CLOSE_CALL_FREEZE_MS);
      spawnFloatingText(this.x, this.y - this.radius - 14, 'CLOSE!', '#ffd54f', 900);
    }
    // CA371 — see HISTORY.md § [1.5.7] Code Archaeology, CA371
    playSound('gore_death', this.x, goreScale, this.y);
    updateHUD();
    const deathElapsedMs = performance.now() - deathStartedAt;
    enemyDeathTiming.count++;
    enemyDeathTiming.totalMs += deathElapsedMs;
    enemyDeathTiming.maxMs = Math.max(enemyDeathTiming.maxMs, deathElapsedMs);
    if(deathElapsedMs >= 8) enemyDeathTiming.over8ms++;
  }
  draw(ctx){
    ctx.save();
    ctx.globalAlpha = 1.0; // strictly bracket every enemy draw pass so no leftover alpha/composite state from a previous draw call (this enemy or another) can wash this one out
    if(this.escaped && !this.isLivestock && !this.isGuardian && !this.isHutBuilding){
      // LOOSE-GLOW-01 (1.7.42): owner dislikes the red ring; a loose enemy now sits in a soft red glow, the same idea as the glow on items, with no outline anywhere.
      // It brightens and dims gently (pulsing glows are fine; only phasing of things the player needs is not) and the enemy itself is always fully drawn.
      const glowPulse = 0.5 + 0.5*Math.sin(presentationTime/500), looseGlow = looseEnemyGlowSprite(this.radius, glowPulse);
      ctx.drawImage(looseGlow.canvas, this.x - looseGlow.radius, this.y - looseGlow.radius); // LOOSE-GLOW-CACHE-01 (1.8.41): one cached sprite per radius and pulse step instead of a new gradient per loose enemy per frame
    }
    // PERF-02 (1.6.9) — see HISTORY.md § [1.6.9]. The translucent aura RINGS below are purely
    // decorative reinforcement of information the status icons (drawStatusIcons calls) already
    // convey — under heavy visual load we skip only these rings, never the icons themselves, so
    // crowd-control feedback stays fully readable either way.
    if(this.slowMultiplier < 1){
      if(!underHeavyVisualLoad){
        ctx.fillStyle = 'rgba(125,211,252,0.25)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.05, 0, Math.PI*2); ctx.fill();
      }
      drawStatusIcons(ctx, this.x, this.y, this.radius, '❄️', 2, 500);
    }
    if(this.burnUntil > gameTime){
      if(!underHeavyVisualLoad){
        ctx.fillStyle = 'rgba(255,107,53,0.22)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.05, 0, Math.PI*2); ctx.fill();
      }
      drawStatusIcons(ctx, this.x, this.y, this.radius, '🔥', 3, 260);
    }
    if(this.stunnedUntil > gameTime){
      drawStatusIcons(ctx, this.x, this.y - this.radius*1.35, this.radius*0.75, '⚡', 3, 220, true);
    }
    if(this.frozenUntil > gameTime){
      drawStatusIcons(ctx, this.x, this.y - this.radius*1.35, this.radius*0.75, '🧊', 2, 400, true);
    }
    if(this.acidUntil > gameTime && this.acidStacks > 0){
      ctx.fillStyle = 'rgba(139,214,47,' + (0.16 + 0.12*this.acidStacks) + ')';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.04, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8bd62f';
      for(let stack = 0; stack < this.acidStacks; stack++){ ctx.beginPath(); ctx.arc(this.x + (stack-(this.acidStacks-1)/2)*7, this.y - this.radius*1.3, 2.4, 0, Math.PI*2); ctx.fill(); }
    }
    if(this.poisonUntil > gameTime && !underHeavyVisualLoad){
      ctx.fillStyle = 'rgba(124,181,24,0.3)';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.05, 0, Math.PI*2); ctx.fill();
    }
    if(this.hasShield && this.shieldHp > 0){
      ctx.strokeStyle = 'rgba(125,211,252,' + (0.4 + 0.5*(this.shieldHp/this.shieldMaxHp)) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.25, 0, Math.PI*2); ctx.stroke();
    }
    if(this.healsAllies && !underHeavyVisualLoad){
      const pulse = Math.sin(performance.now()/300)*2;
      ctx.strokeStyle = 'rgba(124,252,124,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.15+pulse, 0, Math.PI*2); ctx.stroke();
    }
    if(this.isHutBuilding && this.hp < this.maxHp){
      // CA372 — see HISTORY.md § [1.5.7] Code Archaeology, CA372
      const hpFrac = this.hp / this.maxHp;
      if(hpFrac < 0.66){
        const damageT = clampNum((0.66 - hpFrac) / 0.66, 0, 1); // 0 right at the threshold, 1 at 0 HP
        const flicker = 0.85 + Math.sin(gameTime/90 + this.id)*0.15;
        const fireSize = (14 + damageT*22) * flicker;
        ctx.font = Math.round(fireSize) + 'px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔥', this.x, this.y - this.radius*0.9);
        if(damageT > 0.5) ctx.fillText('🔥', this.x - this.radius*0.5, this.y - this.radius*0.5); // a second, smaller flame joins once it's badly damaged
      }
    }
    if(this.revives && this.hasRevived){
      // CA373 — see HISTORY.md § [1.5.7] Code Archaeology, CA373
      const markerY = this.y - this.radius - 6;
      ctx.fillStyle = 'rgba(20,20,20,0.85)';
      ctx.beginPath(); ctx.arc(this.x, markerY, 7, 0, Math.PI*2); ctx.fill();
      ctx.font = '10px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💀', this.x, markerY);
    }
    if(!enemyShadowsBatched) drawEmojiGroundShadow(ctx,this.emoji,this.x,this.y,this.radius*2,'serif',1); // ENEMY-SHADOW-BATCH-01
    if(this.eliteKind) drawEliteGroundPatch(ctx, this);
    const speed = Math.hypot(this.vx, this.vy);
    let bumpDx = 0, bumpDy = 0, attackAnimating = false, attackPhaseNow = 0, attackLungeNow = 0, attackLeanSign = 1;
    const attackTarget = this.touchingBarricade ? findTouchingBarricade(this) : this.attackBumpTarget;
    if(attackTarget && attackTarget.active){
      // ENEMY-HEADBUTT-01 (1.7.139): one wind-up/headbutt/recoil pose for barricades and stickmen.
      const t = attackTarget;
      const ddx = t.x-this.x, ddy = t.y-this.y;
      const dlen = Math.hypot(ddx,ddy) || 1;
      attackAnimating = !PREFERS_REDUCED_MOTION && !isFastForwardSimplified();
      if(attackAnimating){
        attackPhaseNow = this.touchingBarricade
          ? ((gameTime - Math.max(t.barricadeContactSince || 0,t.lastBarricadeHitAt || 0) + 400) % 800)/800
          : this.attackPhase();
        attackLungeNow = attackLungeAmount(attackPhaseNow);
        const lungePx = attackLungeNow * this.radius * 0.75;
        bumpDx = (ddx/dlen)*lungePx;
        bumpDy = (ddy/dlen)*lungePx;
        attackLeanSign = ddx >= 0 ? 1 : -1;
      } else {
        const bumpAmt = Math.abs(Math.sin(this.bumpTime/220)) * 4;
        bumpDx = (ddx/dlen)*bumpAmt;
        bumpDy = (ddy/dlen)*bumpAmt;
      }
    }
    // CA375 — see HISTORY.md § [1.5.7] Code Archaeology, CA375
    const flinchElapsed = realTime - this.flinchStart;
    if(flinchElapsed < this.flinchDuration){
      const flinchT = 1 - flinchElapsed/this.flinchDuration;
      bumpDx += Math.cos(this.flinchAngle) * this.flinchMag * flinchT;
      bumpDy += Math.sin(this.flinchAngle) * this.flinchMag * flinchT;
    }
    ctx.save();
    const isStriding = !this.isLivestock && speed > 5 && !isFastForwardSimplified() && !PREFERS_REDUCED_MOTION;
    const strideDistance=Number.isFinite(this.renderPrevTraveled) && gameState==='PLAYING' ? this.renderPrevTraveled+(this.traveled-this.renderPrevTraveled)*Math.min(1,accumulator/FIXED_DT) : this.traveled;
    const strideAngle = strideDistance / Math.max(4, this.radius*ENEMY_STRIDE_LENGTH_PER_RADIUS) + this.id*1.3; // ENEMY-STRIDE-01 (1.6.124) — distance-driven, so a slower enemy steps slower but always visibly steps
    const strideLift = isStriding ? Math.abs(Math.sin(strideAngle)) : 0;
    const startleLeft = this.startledUntil - presentationTime;
    const startleHop = startleLeft > 0 ? Math.sin((1 - startleLeft / ENEMY_STARTLE_MS) * Math.PI) * this.radius * 0.35 : 0;
    const walkBob = this.isLivestock ? 0 : -strideLift * this.radius * ENEMY_HOP_PER_RADIUS - startleHop;
    ctx.translate(this.x+bumpDx, this.y+bumpDy+walkBob);
    if(isStriding){
      const strideStretch = 1 + (strideLift - 0.5) * ENEMY_STRIDE_SQUASH; // taller at the top of the hop, wider on landing
      ctx.rotate(Math.cos(strideAngle) * ENEMY_TILT_RADIANS); // lean toward the stepping side, alternating each step
      ctx.scale(1/strideStretch, strideStretch);
    }
    if(this.isLivestock){
      if(this.livestockFacesRight) ctx.scale(-1, 1); // the farm emoji face left by default
    }
    if(speed > 20 && !this.isLivestock){
      const angle = Math.atan2(this.vy, this.vx);
      const stretch = 1 + Math.min(0.25, speed/700);
      const squash = 1/stretch;
      ctx.rotate(angle); ctx.scale(stretch, squash); ctx.rotate(-angle);
    }
    if(attackAnimating){
      const rearBack = Math.max(0, -attackLungeNow), strikeForward = Math.max(0, attackLungeNow);
      ctx.rotate(attackLeanSign * attackLungeNow * 0.32);
      ctx.scale(1 - 0.1 * rearBack + 0.12 * strikeForward, 1 + 0.12 * rearBack - 0.08 * strikeForward);
    }
    const aggroAge=presentationTime-this.aggroStartedAt;
    if(this.aggroStartedAt>=0 && aggroAge>=0 && aggroAge<600 && !PREFERS_REDUCED_MOTION){
      const tension=Math.sin(Math.PI*aggroAge/600);
      ctx.scale(1+tension*0.08,1+tension*0.08);
      ctx.rotate(Math.sin(aggroAge/35)*tension*0.025);
    }
    // CA376 — see HISTORY.md § [1.5.7] Code Archaeology, CA376
    drawEmojiSprite(ctx, this.emoji, this.radius*2);
    captureMarkedEmojiTop(ctx,this,this.radius*2);
    drawEmojiSurfaceBlood(ctx,this,this.radius*2);
    if(this.aggroStartedAt>=0 && aggroAge>=0 && aggroAge<600){
      ctx.strokeStyle='#b92320';ctx.lineWidth=Math.max(1.5,this.radius*0.11);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(-this.radius*0.55,-this.radius*0.34);ctx.lineTo(-this.radius*0.12,-this.radius*0.17);
      ctx.moveTo(this.radius*0.55,-this.radius*0.34);ctx.lineTo(this.radius*0.12,-this.radius*0.17);ctx.stroke();
    }
    ctx.restore();
    if(this.isLivestock && !PREFERS_REDUCED_MOTION && !underHeavyVisualLoad) this.drawLivestockEmote(ctx);
    if(attackAnimating && !underHeavyVisualLoad && ((this.id*37 + Math.floor(gameTime/800)*17) % 100) < 25){
      const popScale = attackAngerPopScale(attackPhaseNow);
      if(popScale > 0.02){
        const headX = this.x + bumpDx, headY = this.y + bumpDy;
        if(graphicsQuality !== 'low') drawAngerSteam(ctx, headX, headY, this.radius, attackPhaseNow); // NO-ATTACK-RING-01 (1.8.54): the red anger mark over attacking enemies is removed; the lunge and steam carry the attack
      }
    }
    if(this.embeddedArrows && this.embeddedArrows.length){
      const stuckBaseX = this.x+bumpDx, stuckBaseY = this.y+bumpDy+walkBob;
      let hasSpecialStuck = false, hasPlainStuck = false; // STUCK-BATCH-01 (1.7.93): plain arrows share one path per enemy instead of a save/transform/restore each
      for(const a of this.embeddedArrows){ if(isPlainStuckArrow(a)){ hasPlainStuck = true; if(a.cos === undefined){ a.cos = Math.cos(a.angle); a.sin = Math.sin(a.angle); } } else hasSpecialStuck = true; }
      if(hasPlainStuck){
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath();
        for(const a of this.embeddedArrows){ if(!isPlainStuckArrow(a)) continue; const ox = stuckBaseX + a.dx, oy = stuckBaseY + a.dy; ctx.moveTo(ox - 8*a.cos, oy - 8*a.sin); ctx.lineTo(ox + 2*a.cos, oy + 2*a.sin); }
        ctx.stroke();
        ctx.fillStyle = '#3a2410'; ctx.beginPath();
        for(const a of this.embeddedArrows){ if(!isPlainStuckArrow(a)) continue; const ox = stuckBaseX + a.dx, oy = stuckBaseY + a.dy, c = a.cos, sn = a.sin; ctx.moveTo(ox + 2*c, oy + 2*sn); ctx.lineTo(ox - 2*c + 2.5*sn, oy - 2*sn - 2.5*c); ctx.lineTo(ox - 2*c - 2.5*sn, oy - 2*sn + 2.5*c); ctx.closePath(); }
        ctx.fill();
      }
      if(hasSpecialStuck){
      ctx.save();
      ctx.translate(stuckBaseX, stuckBaseY);
      for(const a of this.embeddedArrows){
        if(isPlainStuckArrow(a)) continue;
        ctx.save();
        ctx.translate(a.dx, a.dy);
        ctx.rotate(a.angle);
        if(a.kind === 'AXE'){
          ctx.strokeStyle = '#704b2d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(5, 0); ctx.stroke();
          ctx.fillStyle = '#aeb5bc'; ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(7, -3); ctx.lineTo(9, 0); ctx.lineTo(7, 3); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
        } else if(a.kind === 'DART'){
          ctx.strokeStyle = '#514631'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, 0); ctx.stroke();
          ctx.fillStyle = '#d8c99a'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-9, -2); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();
        } else if(a.kind === 'BULLET' || a.kind === 'PELLET'){
          ctx.fillStyle = a.kind === 'BULLET' ? '#b9a36a' : '#75c7df'; ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 1.8, 0, 0, Math.PI*2); ctx.fill();
        } else if(a.kind === 'KNIFE' || a.kind === 'BLADE'){
          ctx.fillStyle = '#cfd6d9'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(2, -2); ctx.lineTo(5, 0); ctx.lineTo(2, 2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#69482d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-8, 0); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      }
    }
    ctx.globalAlpha = 1.0; // guard against any alpha left set by a preceding draw call bleeding into the next enemy/decal pass

    const barW = this.radius*1.8;
    ctx.fillStyle = '#3a1a1a';
    ctx.fillRect(this.x-barW/2, this.y-this.radius-12, barW, 5);
    ctx.fillStyle = (this.hp/this.maxHp) > 0.4 ? '#4caf50' : '#e63946';
    ctx.fillRect(this.x-barW/2, this.y-this.radius-12, barW*Math.max(0,this.hp/this.maxHp), 5);
    ctx.restore();
  }
}
/* =========================================================
   ENEMY COLLISION MASKS AND POOL
   ========================================================= */
// CA456 — see HISTORY.md § [1.5.7] Code Archaeology, CA456
const ENEMY_MASK_REF_SIZE = 40; // arbitrary but fixed reference font-size (px) for every cached mask; real instances are rescaled to this at test time
let enemyMaskCanvas = null, enemyMaskCtx = null;
const enemyCollisionMasks = {}; // type -> {size, alpha:Uint8ClampedArray} | null (null = build failed once, narrow phase skipped for that type from then on)
function buildEnemyCollisionMask(type){
  const def = CONFIG.ENEMIES[type];
  if(!def || !def.emoji) return null;
  try{
    if(!enemyMaskCanvas){
      enemyMaskCanvas = document.createElement('canvas');
      enemyMaskCanvas.width = ENEMY_MASK_REF_SIZE; enemyMaskCanvas.height = ENEMY_MASK_REF_SIZE;
      enemyMaskCtx = enemyMaskCanvas.getContext('2d', { willReadFrequently: true });
    }
    const mctx = enemyMaskCtx;
    mctx.clearRect(0, 0, ENEMY_MASK_REF_SIZE, ENEMY_MASK_REF_SIZE);
    mctx.fillStyle = '#000000';
    mctx.font = ENEMY_MASK_REF_SIZE + 'px serif';
    mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.fillText(def.emoji, ENEMY_MASK_REF_SIZE/2, ENEMY_MASK_REF_SIZE/2);
    const data = mctx.getImageData(0, 0, ENEMY_MASK_REF_SIZE, ENEMY_MASK_REF_SIZE).data;
    const alpha = new Uint8ClampedArray(ENEMY_MASK_REF_SIZE * ENEMY_MASK_REF_SIZE);
    for(let i=0;i<alpha.length;i++) alpha[i] = data[i*4+3]; // keep the alpha channel only — that's the whole silhouette test
    return { size: ENEMY_MASK_REF_SIZE, alpha };
  } catch(err){
    return null; // getImageData can throw on a tainted/unsupported canvas — narrow phase just doesn't apply for this type, broad-phase circle still does
  }
}
function getEnemyCollisionMask(type){
  if(!(type in enemyCollisionMasks)) enemyCollisionMasks[type] = buildEnemyCollisionMask(type);
  return enemyCollisionMasks[type];
}
// True if world-space point (wx,wy) lands on an opaque (or nearly opaque) pixel of enemy e's glyph.
function pointOnEnemyMask(e, wx, wy){
  const mask = getEnemyCollisionMask(e.type);
  if(!mask) return true; // no mask available — defer entirely to the existing radius-only result
  const scale = mask.size / (e.radius * 2); // world px -> reference-mask px, using the same radius*2=font-size relationship Enemy.draw() itself uses
  const mx = Math.floor((wx - e.x) * scale + mask.size/2);
  const my = Math.floor((wy - e.y) * scale + mask.size/2);
  if(mx < 0 || my < 0 || mx >= mask.size || my >= mask.size) return false; // outside the glyph's own bounding box entirely
  return mask.alpha[my*mask.size + mx] > 20; // small threshold rather than a strict >0 — heavily antialiased glyph edge pixels have near-zero alpha and shouldn't register as a hit
}
// CA457 — see HISTORY.md § [1.5.7] Code Archaeology, CA457
function segmentHitsEnemyMask(e, x0, y0, x1, y1){
  const mask = getEnemyCollisionMask(e.type);
  if(!mask) return true;
  const scale = mask.size / (e.radius * 2);
  const segLenMaskPx = Math.hypot(x1-x0, y1-y0) * scale;
  const steps = Math.max(1, Math.min(20, Math.ceil(segLenMaskPx / 2))); // ~2 mask-px per sample
  for(let i=0;i<=steps;i++){
    const t = i/steps;
    if(pointOnEnemyMask(e, x0+(x1-x0)*t, y0+(y1-y0)*t)) return true;
  }
  return false;
}
/* Object pools (persistent entities; acquired by search since placement is user-driven, not per-frame) */
const enemyPool = Array.from({length: 220}, () => new Enemy());
// CA475 — see HISTORY.md § [1.5.7] Code Archaeology, CA475
let enemyHash = null;

/* =========================================================
   BOOT
   ========================================================= */
syncPrefsToDOM();
validateGameDefinitions();
// CA792 — see HISTORY.md § [1.5.7] Code Archaeology, CA792
for(const type in CONFIG.ENEMIES) getEnemyCollisionMask(type);
initRegionAndPath();
designContractProblems = validateDesignContract();
if(designContractProblems.length) console.warn('validateDesignContract() found ' + designContractProblems.length + ' problem(s):\n' + designContractProblems.map(problem => '  - ' + problem).join('\n'));
loadGameSourceText().then(() => { if(gameSourceText === null) return; designContractProblems = validateDesignContract(); if(designContractProblems.length) console.warn('validateDesignContract() found ' + designContractProblems.length + ' problem(s):\n' + designContractProblems.map(problem => '  - ' + problem).join('\n')); });
generateFlora();
// CONTEXT-RESTORE-01 (1.7.109): a phone can drop a canvas's drawing surface when memory is tight or the app is backgrounded, which blanks it. The surface is now kept restorable and, once restored, the screen, the map layer and the blood layer are redrawn.
function restoreCanvasLayers(){
  ctx.setTransform(dprValue,0,0,dprValue,0,0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = graphicsQuality === 'low' ? 'low' : 'high';
  if(mapCanvasReady) rebakeMap();
  if(settledDecalCanvasReady) rebuildSettledDecalCanvas();
  requestRepaint();
}
canvas.addEventListener('contextlost', (event) => { event.preventDefault(); });
canvas.addEventListener('contextrestored', restoreCanvasLayers);
document.addEventListener('visibilitychange', () => { if(!document.hidden) requestRepaint(); });
window.addEventListener('pageshow', requestRepaint);
const mapCanvas = document.createElement('canvas');
mapCanvasReady = true;
resizeMapCanvasForDpr(); // sizes at the current dprValue and bakes the first frame — see rebakeMap() for re-bakes on map expansion, resizeMapCanvasForDpr() for a later DPR change
// CA793 — see HISTORY.md § [1.5.7] Code Archaeology, CA793
const settledDecalCanvas = document.createElement('canvas');
settledDecalCanvas.width = WORLD_MAX_W * dprValue;
settledDecalCanvas.height = WORLD_MAX_H * dprValue;
settledDecalCanvasReady = true;
generateScenery();
seedStartingBarricades();
for(const startingProblem of validateStartingBarricade()){ designContractProblems.push(startingProblem); console.warn(startingProblem); }
for(const selfTestFailure of runBootSelfTests()){ designContractProblems.push(selfTestFailure); console.warn(selfTestFailure); }
centerCameraOnActiveRegion();
document.getElementById('versionText').textContent = GAME_VERSION;
document.getElementById('aboutVersionText').textContent = GAME_VERSION;
updateHUD();
// BOOT-WARMUP-01 (1.7.78) — see HISTORY.md § [1.7.78]
const BOOT_WARM_DAMAGE_NUMBERS = 60;
const BOOT_MIN_DISPLAY_MS = 2000, BOOT_WARMUP_SLICE_MS = 8, BOOT_WARMUP_ZOOMS = [0.8, 1, 1.5, FIT_MAX_ZOOM, 3], BOOT_ITEM_GLYPH_SCRATCH_PX = 64;
const BOOT_STICKMAN_WARM_LEVELS = [1, 4], BOOT_SCRATCH_PX = 256, BOOT_REHEARSAL_RENDERS = 3, BOOT_SCENERY_SCRATCH_PX = 128, BOOT_SCENERY_SCALE_STEP = 0.02;
const BOOT_JOB_WEIGHT = Object.freeze({ enemySprite: 1, glowSprite: 0.3, itemGlyph: 0.3, stickman: 2, companion: 1, effect: 1, rehearsalRender: 12 });
function createBootScratchContext(){
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = BOOT_SCRATCH_PX;
  return scratch.getContext('2d');
}
function listBootCanvasEffectJobs(scratchCtx){
  const size = BOOT_SCRATCH_PX, half = size / 2;
  return [
    () => { const gradient = scratchCtx.createLinearGradient(0, 0, size, size); gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#246'); scratchCtx.fillStyle = gradient; scratchCtx.fillRect(0, 0, size, size); },
    () => { const gradient = scratchCtx.createRadialGradient(half, half, 0, half, half, half); gradient.addColorStop(0, 'rgba(255,200,60,0.9)'); gradient.addColorStop(1, 'rgba(255,200,60,0)'); scratchCtx.fillStyle = gradient; scratchCtx.fillRect(0, 0, size, size); },
    () => { scratchCtx.save(); scratchCtx.shadowColor = 'rgba(255,235,59,0.6)'; scratchCtx.shadowBlur = 8; scratchCtx.beginPath(); scratchCtx.arc(half, half, 40, 0, Math.PI * 2); scratchCtx.stroke(); scratchCtx.restore(); },
    () => { scratchCtx.save(); scratchCtx.globalCompositeOperation = 'lighter'; scratchCtx.fillStyle = 'rgba(255,120,40,0.5)'; scratchCtx.fillRect(20, 20, 120, 120); scratchCtx.restore(); },
    () => { scratchCtx.save(); scratchCtx.globalCompositeOperation = 'source-in'; scratchCtx.fillStyle = '#000'; scratchCtx.fillRect(0, 0, size, size); scratchCtx.restore(); },
    () => { scratchCtx.save(); scratchCtx.beginPath(); scratchCtx.arc(half, half, 60, 0, Math.PI * 2); scratchCtx.clip(); scratchCtx.fillStyle = '#c33'; scratchCtx.fillRect(0, 0, size, size); scratchCtx.restore(); },
    () => { scratchCtx.save(); scratchCtx.setLineDash([0.001, 9]); scratchCtx.lineCap = 'round'; scratchCtx.lineWidth = 4; scratchCtx.beginPath(); scratchCtx.arc(half, half, 70, 0, Math.PI * 2); scratchCtx.stroke(); scratchCtx.restore(); },
    () => { scratchCtx.save(); scratchCtx.translate(half, half); scratchCtx.rotate(0.6); scratchCtx.beginPath(); scratchCtx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2); scratchCtx.fillStyle = 'rgba(150,10,20,0.8)'; scratchCtx.fill(); scratchCtx.restore(); },
    () => { for(const quality of ['low', 'high']){ scratchCtx.save(); scratchCtx.imageSmoothingQuality = quality; scratchCtx.translate(half, half); scratchCtx.rotate(0.3); scratchCtx.scale(0.7, 1.3); scratchCtx.drawImage(scratchCtx.canvas, -half, -half); scratchCtx.restore(); } }
  ];
}
function listBootWarmupJobs(){
  const jobs = [], queuedKeys = new Set();
  const addJob = (weight, run) => jobs.push({ weight, run });
  const queueGlyph = (emoji, sizePx) => {
    for(const zoom of BOOT_WARMUP_ZOOMS){
      const devicePx = sizePx * zoom * dprValue;
      if(!(devicePx > 0) || devicePx > EMOJI_SPRITE_MAX_PX) continue;
      const bucketIndex = Math.max(0, Math.ceil(Math.log(devicePx / EMOJI_SPRITE_MIN_PX) / EMOJI_SPRITE_LOG_STEP - 1e-6)), key = emoji + '|' + bucketIndex;
      if(queuedKeys.has(key)) continue;
      queuedKeys.add(key);
      addJob(BOOT_JOB_WEIGHT.enemySprite, () => emojiSpriteFor(emoji, bucketIndex));
    }
  };
  for(const type in CONFIG.ENEMIES) queueGlyph(CONFIG.ENEMIES[type].emoji, CONFIG.ENEMIES[type].radius * 2);
  // WARMUP-NEW-SPRITES-01 (1.7.110): the structures, the caravan and floating numbers are drawn from sprite caches, so their sprites are built here instead of on first use in a wave
  for(const producerType of PRODUCER_TYPES) for(const [partEmoji, partSize] of PRODUCER_DEFS[producerType].parts) queueGlyph(partEmoji, partSize);
  queueGlyph('🪵', 16); queueGlyph('🎩', 15); queueGlyph('👟', 9);
  queueGlyph('🐪', 26); queueGlyph('👳', 15); queueGlyph('🛍️', 16);
  const sceneryDrawGlyphs = [...TREE_VARIANT_EMOJI, '🪨', '🪴', '📦', '🎁', '🥢', ...Object.values(EVENT_PROP_EMOJI)];
  for(let scale = CONFIG.SCENERY.minScale; scale <= CONFIG.SCENERY.maxScale + 1e-6; scale += BOOT_SCENERY_SCALE_STEP) for(const glyph of sceneryDrawGlyphs) queueGlyph(glyph, Math.round(TILE_SIZE * 0.72 * scale));
  const textScaleIndexes = new Set();
  for(const zoom of BOOT_WARMUP_ZOOMS) textScaleIndexes.add(Math.max(0, Math.ceil(Math.log(Math.max(1, zoom * dprValue)) / TEXT_SPRITE_STEP_LOG - 1e-6)));
  for(const scaleIndex of textScaleIndexes) for(let damage = 1; damage <= BOOT_WARM_DAMAGE_NUMBERS; damage++) addJob(BOOT_JOB_WEIGHT.itemGlyph, () => textSpriteFor(String(damage), 13, '#ff6b6b', scaleIndex));
  queueGlyph(FLORA_SEEDLING_GLYPH, TILE_SIZE * 0.42);
  const attractBucketIndex = attractEmojiBucketIndex(ATTRACT_EMOJI_PX);
  if(attractBucketIndex >= 0) for(const type of ATTRACT_ENEMY_POOL){ const emoji = CONFIG.ENEMIES[type].emoji; addJob(BOOT_JOB_WEIGHT.enemySprite, () => emojiSpriteFor(emoji, attractBucketIndex)); }
  const glowRadii = new Set([FOOD_GLOW_STYLE.glowRadius, TREAT_GLOW_STYLE.glowRadius, 23]);
  for(const rarity of Object.values(ITEM_RARITIES)) glowRadii.add(rarity.glowRadius);
  for(let hueStep = 0; hueStep < 360 / GROUND_GLOW_HUE_STEP; hueStep++) for(const radius of glowRadii) addJob(BOOT_JOB_WEIGHT.glowSprite, () => groundItemGlowSprite(hueStep * GROUND_GLOW_HUE_STEP, radius));
  for(const radius of glowRadii) addJob(BOOT_JOB_WEIGHT.glowSprite, () => groundItemGlowSprite(0, radius, 0));
  const glyphScratch = document.createElement('canvas');
  glyphScratch.width = glyphScratch.height = BOOT_ITEM_GLYPH_SCRATCH_PX;
  const glyphScratchCtx = glyphScratch.getContext('2d');
  glyphScratchCtx.font = GROUND_ITEM_EMOJI_PX + 'px serif'; glyphScratchCtx.textAlign = 'center'; glyphScratchCtx.textBaseline = 'middle';
  const itemIcons = new Set();
  for(const itemDef of ITEM_BY_ID.values()) if(itemDef.icon) itemIcons.add(itemDef.icon);
  for(const icon of itemIcons) addJob(BOOT_JOB_WEIGHT.itemGlyph, () => { glyphScratchCtx.clearRect(0, 0, BOOT_ITEM_GLYPH_SCRATCH_PX, BOOT_ITEM_GLYPH_SCRATCH_PX); glyphScratchCtx.fillText(icon, BOOT_ITEM_GLYPH_SCRATCH_PX / 2, BOOT_ITEM_GLYPH_SCRATCH_PX / 2); });
  // SCENERY-WARM-01 (1.7.97): the log's 21 ms first draw of scenery was the browser rasterizing each emoji at each size for the first time; the map draws them at whole-pixel sizes between the smallest and largest scale
  const sceneryScratch = document.createElement('canvas');
  sceneryScratch.width = sceneryScratch.height = BOOT_SCENERY_SCRATCH_PX;
  const sceneryScratchCtx = sceneryScratch.getContext('2d');
  sceneryScratchCtx.textAlign = 'center'; sceneryScratchCtx.textBaseline = 'middle';
  const sceneryGlyphs = [...TREE_VARIANT_EMOJI, '🪨', '🪴', '📦', '🎁', '🥢', '💰', '💎', ...Object.values(EVENT_PROP_EMOJI)], scenerySizes = new Set();
  for(let scale = CONFIG.SCENERY.minScale; scale <= CONFIG.SCENERY.maxScale + 1e-6; scale += BOOT_SCENERY_SCALE_STEP) scenerySizes.add(Math.round(TILE_SIZE * 0.72 * scale));
  for(const glyph of sceneryGlyphs) for(const sizePx of scenerySizes) addJob(BOOT_JOB_WEIGHT.itemGlyph, () => { sceneryScratchCtx.font = sizePx + 'px serif'; sceneryScratchCtx.fillText(glyph, BOOT_SCENERY_SCRATCH_PX / 2, BOOT_SCENERY_SCRATCH_PX / 2); });
  const scratchCtx = createBootScratchContext();
  for(const effectJob of listBootCanvasEffectJobs(scratchCtx)) addJob(BOOT_JOB_WEIGHT.effect, effectJob);
  for(const type of Object.keys(JOB_COLORS)) for(const level of BOOT_STICKMAN_WARM_LEVELS) addJob(BOOT_JOB_WEIGHT.stickman, () => {
    const colors = JOB_COLORS[type], appearance = Object.assign({}, buildPreviewAppearance, { skinMain: colors.main, skinShade: colors.shade });
    scratchCtx.save(); scratchCtx.setTransform(1, 0, 0, 1, BOOT_SCRATCH_PX / 2, BOOT_SCRATCH_PX / 2); scratchCtx.clearRect(-BOOT_SCRATCH_PX / 2, -BOOT_SCRATCH_PX / 2, BOOT_SCRATCH_PX, BOOT_SCRATCH_PX);
    drawStickman(scratchCtx, 0, 0, IDLE_WEAPON_ANGLE, level, type, appearance);
    scratchCtx.restore();
  });
  addJob(BOOT_JOB_WEIGHT.companion, () => { scratchCtx.save(); scratchCtx.setTransform(1, 0, 0, 1, 0, 0); drawCat(scratchCtx, 32, 32, 0, 0.55, { crouch: true, attackProgress: 0 }); drawSkeleton(scratchCtx, 96, 32, 0, 0); scratchCtx.restore(); });
  for(let pass = 0; pass < BOOT_REHEARSAL_RENDERS; pass++) addJob(BOOT_JOB_WEIGHT.rehearsalRender, () => render(ctx));
  return jobs;
}
const BOOT_FADE_OUT_MS = 480;
const bootWarmupStats = { jobs: 0, workMs: 0, shownMs: 0 };
async function runBootWarmup(){
  const loadingScreen = document.getElementById('loading-screen'), loadingProgress = document.getElementById('loadingProgress');
  const jobs = listBootWarmupJobs(), startedAt = performance.now();
  let totalWeight = 0;
  for(const job of jobs) totalWeight += job.weight;
  bootWarmupStats.jobs = jobs.length;
  bootWarmupStats.device = IS_MOBILE_DEVICE ? 'mobile' : 'desktop';
  let completed = 0, completedWeight = 0, warmFraction = 0, timeFraction = 0;
  while(warmFraction < 1 || timeFraction < 1){
    const sliceEndsAt = performance.now() + BOOT_WARMUP_SLICE_MS;
    const sliceStartedAt = performance.now();
    while(completed < jobs.length && performance.now() < sliceEndsAt){ jobs[completed].run(); completedWeight += jobs[completed].weight; completed++; }
    bootWarmupStats.workMs += performance.now() - sliceStartedAt;
    warmFraction = jobs.length ? completedWeight / totalWeight : 1;
    timeFraction = Math.min(1, (performance.now() - startedAt) / BOOT_MIN_DISPLAY_MS);
    const shownFraction = Math.min(warmFraction, timeFraction);
    loadingProgress.value = Math.round(shownFraction * 100);
    loadingScreen.style.setProperty('--loading-pct', shownFraction.toFixed(3));
    await new Promise(resolve => setTimeout(resolve, completed < jobs.length ? 0 : 16));
  }
  bootWarmupStats.shownMs = performance.now() - startedAt;
}
function startFirstFrame(){
  vsyncProbeActive = false;
  requestAnimationFrame(loop);
  // CA794 — see HISTORY.md § [1.5.7] Code Archaeology, CA794
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const loadingScreen = document.getElementById('loading-screen');
    document.getElementById('game-wrapper').classList.add('loaded');
    loadingScreen.classList.add('done');
    setTimeout(() => { loadingScreen.hidden = true; }, BOOT_FADE_OUT_MS);
  }));
}
// AUDIO-GESTURE-01 (1.7.107) — see HISTORY.md § [1.7.107]: on a phone a touch only counts as permission to play sound when the finger lifts (touchend / pointerup / click), not on touch-down, and the old one-time pointerdown listener was used up by a touch-down that could not start the audio. Every gesture now retries until the audio context is running.
function unlockAudioOnGesture(){
  unlockAudio();
  if(audioEngine.ctx && audioEngine.ctx.state === 'running') for(const gestureType of AUDIO_UNLOCK_EVENTS) document.removeEventListener(gestureType, unlockAudioOnGesture, true);
}
/* =========================================================
   START THE GAME (runs last, after every file has loaded)
   ========================================================= */
for(const gestureType of AUDIO_UNLOCK_EVENTS) document.addEventListener(gestureType, unlockAudioOnGesture, { capture: true });
tryAutoplayAudio();
vsyncProbeActive = true; requestAnimationFrame(probeVsyncDuringLoading);

runBootWarmup().finally(startFirstFrame);
