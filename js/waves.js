"use strict";
// Enemy definitions, bosses, huts, trolls, the wave plan, the Enemy class and the boot sequence.
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
// BOSS-STUN-RESIST-01: bosses shake off stuns and freezes in about a third of the time, so a stun-on-hit tower slows a boss without pinning it in place.
const STUN_RESISTANT_TYPES = new Set(['BOSS', 'SANTA', 'REAPER']), BOSS_STUN_SHARE = 0.35;
const ICE_ENEMY_MIN_SLOW_MULT = 0.85, ICE_ENEMY_HOLD_SHARE = 0.35;
const SKITTER_STEP_TYPES = new Set(['SWARM']); // ANT-SKITTER-01: insects tick across the ground instead of thudding
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
  FIRE: { name:'Fire', desc:'Can break off the path to burn a tower directly. Never burns.' },
  ICE: { name:'Ice', desc:'Can break off the path to slow a tower directly. Slows and freezes barely hold it.' },
  SPLITTER: { name:'Splitter', desc:'Splits into two smaller Splitmini on death.' },
  SPLITMINI: { name:'Splitmini', desc:'A smaller fragment left behind by a Splitter.' },
  HEALER: { name:'Healer', desc:'Heals nearby allies over time — kill it first.' },
  SHIELDED: { name:'Shielded', desc:'Absorbs hits with a shield before taking real damage.' },
  ZOMBIE: { name:'Zombie', desc:'Heavily armored undead — the Cleric\'s smite and the Pope\'s curse hit it five times harder.' },
  WRAITH: { name:'Wraith', desc:'Fast, armored undead.' },
  SKELETON: { name:'Skeleton', desc:'Undead that revives once after being killed.' },
  WOLF: { name:'Wolf', desc:'Quick, and more likely than most to break off the path and attack a stickman.' },
  REAPER: { name:'Reaper', desc:'The heaviest-armored undead in the roster.' },
  BOULDER: { name:'Boulder', desc:'Tanky, and splits on death like a heavier Splitter.' },
  ROCKLET: { name:'Rocklet', desc:'A smaller rock fragment left behind by a Boulder.' },
  MONARCH: { name:'Monarch', desc:'Among the fastest things on the path — hard to hit, doesn\'t hit hard back.' }
};
CONFIG.ENEMIES = {
  // BALANCE-02: speeds sit about 47.5% below the original table; hit points about 15% above it.
  GRUNT:  { emoji:'😡', baseHp:84,  speed:27,  bounty:6,  radius:15, armor:0, breakawayChance:0.02, breakDamage:6 },
  SWARM:  { emoji:'🐜', baseHp:31,  speed:41,  bounty:2,  radius:9,  armor:0, breakawayChance:0.02, breakDamage:4 },
  TANK:   { emoji:'🗿', baseHp:308, speed:14,  bounty:16, radius:22, armor:6, breakawayChance:0.02, breakDamage:10 },
  RUNNER: { emoji:'🥷', baseHp:63,  speed:57,  bounty:9,  radius:12, armor:0, breakawayChance:0.02, breakDamage:6 },
  BOSS:   { emoji:'👹', baseHp:3087,speed:11,  bounty:173,radius:34, armor:8, breakawayChance:0,    breakDamage:6 },
  SANTA:  { emoji:'🎅', baseHp:7716,speed:10,  bounty:400,radius:38, armor:10, breakawayChance:0,   breakDamage:8 },
  COOKIE: { emoji:'🍪', baseHp:25,  speed:62,  bounty:3,  radius:9,  armor:0, breakawayChance:0,    breakDamage:2 },
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
  WOLF: { emoji:'🐺', baseHp:45,  speed:38,  bounty:7,  radius:11, armor:0, breakawayChance:0.03, breakDamage:5 },
  REAPER: { emoji:'💀', baseHp:253, speed:17, bounty:23, radius:20, armor:10, breakawayChance:0.02, breakDamage:7, isUndead:true },
  BOULDER: { emoji:'🪨', baseHp:365, speed:13, bounty:18, radius:23, armor:5, breakawayChance:0.02, breakDamage:8, splits:true },
  ROCKLET: { emoji:'🪨', baseHp:124, speed:18, bounty:5,  radius:13, armor:0, breakawayChance:0,    breakDamage:4 },
  MONARCH: { emoji:'🦋', baseHp:38,  speed:59,  bounty:6,  radius:10, armor:0, breakawayChance:0.02, breakDamage:3 },
  // TARGET-MARK-01: livestock are Enemy instances (isLivestock) with the full damage and death pipeline; they never follow the path or count toward a wave,
  // and a couple of hits end one once the player has marked it as a target.
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
// ENEMY-PACE-01
const ENEMY_WALK_SPEED_SCALE = 0.25;
const ENEMY_SPAWN_GAP_MS = 5000, ENEMY_TIER_PACE_FACTOR = 0.85;
// OPENING-PACE-01: waves 1 and 2 space units 2.5 s apart and wave 1 allows two enemies on the route at once, so the first enemy is on screen at GO.
const OPENING_SPAWN_GAP_MS = 2500, OPENING_PACE_LAST_WAVE = 2, WAVE_ONE_MAX_ON_ROUTE = 2;
const SAVE_TIP_WAVE = 3;
const WAVE_ONE_HP_SCALE = 0.6; // FIRST-KILLS-01: wave-1 units fall in two or three hits, as the genre's first enemies do
// OPENING-FLOW-01: waves 3-10 send units 1.5 s apart so a new player's first 15 minutes reach about wave 5 instead of wave 3; walk speed is unchanged (ENEMY-PACE-01)
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
const ARMOR_MIN_DAMAGE_SHARE = 0.5;
const ENEMY_DAMAGE_SCALE = 0.6, ENEMY_ATTACK_INTERVAL_SCALE = 1.6;
const LOOSE_MELEE_INTERVAL_MS = 1200, ENEMY_MELEE_INTERVAL_MS = Math.round(LOOSE_MELEE_INTERVAL_MS * ENEMY_ATTACK_INTERVAL_SCALE); // escaped enemies swing faster than breakaways and guardians
const ENEMY_FAMILY_SPEED_MIN = Math.min(...Object.values(CONFIG.ENEMIES).map(def => def.speed));
const ENEMY_FAMILY_SPEED_MAX = Math.max(...Object.values(CONFIG.ENEMIES).map(def => def.speed));
// MORE-ENEMIES-01: the game should not get harder, but since all you do is attack enemies, there should be more of them. The little, small and
// standard counts are multiplied by ENEMY_COUNT_MULTIPLIER on every wave; enemy health, speed, damage, bounty and the Large and Boss counts are untouched, so each enemy is exactly as
// strong as before, there are simply more of them to fight, farm and level on.
const EARLY_COUNT_RAMP = [1.5, 1.15, 1.3, 1.4]; // EARLY-RAMP-01: wave 1 keeps its count; waves 2-4 grow back into the full count instead of jumping 2.4x while a three-stickman squad finds its feet
const ENEMY_COUNT_MULTIPLIER = 1.5, LATE_ENEMY_COUNT_MULTIPLIER = 1.2; // after wave 50 the counts are already in the hundreds, so the extra is smaller to protect frame rate
function tierPopulationForWave(waveNumber){
  const population = baseTierPopulationForWave(waveNumber);
  const countMultiplier = waveNumber > 50 ? LATE_ENEMY_COUNT_MULTIPLIER : waveNumber <= EARLY_COUNT_RAMP.length ? EARLY_COUNT_RAMP[waveNumber - 1] : ENEMY_COUNT_MULTIPLIER;
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
// GROUP-SIZE-ROUTE-01: groups are bigger the longer the road is.
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
const enemyDeathTiming = { count:0, totalMs:0, maxMs:0, over8ms:0 };
function tinyGruntEvasion(enemy){ return enemy && enemy.type === 'GRUNT' && enemy.sizeTier === 'TINY' ? 0.15 : 0; }
function attackMissChance(base, enemy){ return clampNum((base || 0) + tinyGruntEvasion(enemy), 0, 1); }
function rollDirectAttackMiss(tower, enemy){
  if(!prdRollFires(attackMissChance(tower ? tower.missChance : 0, enemy), tower, 'missLuckBalance')) return false;
  spawnFloatingText(enemy.x, enemy.y - enemy.radius - 6, 'MISS', '#aaaaaa');
  if(tower && tower.telemetry) tower.telemetry.misses++;
  return true;
}
// Knight's lance: damage scales with target weight relative to a standard 15 px unit, from 0.5x up to 1.75x.
function lancerWeightDamageMultiplier(weight){ return clampNum(Number(weight) || 1, 0.5, 1.75); }
// WEIGHT-HP-181, WEIGHT-HP-182: same species and wave scale, double weight means double HP before integer rounding, Tiny Grunts included.
function enemyHealthAtWeight(type,weight,hpScale){
  return Math.max(1,Math.round(CONFIG.ENEMIES[type].baseHp * Math.max(0.25,weight) * hpScale * 1.25));
}
/* =========================================================
   BOSSES
   ========================================================= */
const BOSS_GUARANTEED_COMMON_ROLLS = { min: 1, max: 2 }, BOSS_GEAR_ROLLS = 3, BOSS_GEAR_ROLL_CHANCE = 0.15, BOSS_SIGNATURE_CHANCE = 0.6, BOSS_BAD_LUCK_LIMIT = 3;
let bossesSinceGearDrop = 0;
const BOSS_RARITY_WEIGHTS = { COMMON: 0, UNCOMMON: 42, RARE: 46, EPIC: 12, LEGENDARY: 2 };
// MUSIC-BOSS-01: cached every 300 ms so the per-frame phase choice never scans the enemy pool each frame.
let bossFieldCheckAt = 0, bossFieldCached = false;
function bossIsOnField(){
  const now = performance.now();
  if(now - bossFieldCheckAt > 300){
    bossFieldCheckAt = now;
    bossFieldCached = scanFieldForMusic();
  }
  return bossFieldCached;
}
const BOSS_ATTACK_MULT = 5; // BOSS-AGGRO-01
const BOSS_AGGRO_RADIUS = 300;
function bossCountForWave(waveNumber){
  if(waveNumber % 10 !== 0) return 0;
  if(waveNumber <= 40) return 1;
  if(waveNumber <= 70) return 2;
  if(waveNumber <= 90) return 3;
  return 4;
}
// ROUTE-SCALES-WAVE-01: the longer the road, the more enemies come. A road about as long as expected for this wave changes nothing;
// a much longer one (for example a huge road on wave 1) multiplies the little and standard enemies, up to 2.5 times.
function expectedRouteLengthForWave(waveNumber){ return 4 + 2*waveNumber; }
function routeLengthFactor(waveNumber){
  const length = (typeof pathWaypointTiles !== 'undefined' && pathWaypointTiles) ? pathWaypointTiles.length : 0;
  return Math.max(1, Math.min(routeLengthFactorCap(waveNumber), length / expectedRouteLengthForWave(waveNumber)));
}
// OPENING-CROWD-CAP-01: the long-road crowd bonus ramps in over the first ten waves (1.5 at wave 2 up to the usual 2.5 at wave 10), so early waves on an expanded map last minutes, not a quarter hour
const ROUTE_FACTOR_MAX = 2.5, OPENING_ROUTE_FACTOR_BASE = 1.25, OPENING_ROUTE_FACTOR_PER_WAVE = 0.125;
function routeLengthFactorCap(waveNumber){ return Math.min(ROUTE_FACTOR_MAX, OPENING_ROUTE_FACTOR_BASE + OPENING_ROUTE_FACTOR_PER_WAVE * waveNumber); }
function scaledPopulation(population, waveNumber){
  const factor = routeLengthFactor(waveNumber);
  if(factor <= 1.0001) return population;
  for(const tier of ['TINY','SMALL','STANDARD']) if(population[tier]) population[tier] = Math.round(population[tier] * factor);
  return population;
}
function bossHpScale(waveNumber){ return waveNumber < 20 ? 0.4 : 1; }
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
  if(phase.sizeTier === 'SMALL') return;
  if(phase.sizeTier === 'BOSS'){
    const isSanta = phase.batches.some(batch=>batch.units.some(unit=>unit.family==='SANTA'));
    bossWarningLog.push({ wave: waveIndex, phaseIndex: waveDispatch.phaseIndex, reason: 'BOSS phase entered' });
    if(bossWarningLog.length > 10) bossWarningLog.shift();
    showBossWarning(isSanta ? '🎅 SANTA APPROACHING' : 'BOSS APPROACHING');
    if(isSanta) trackGameEvent('santa_boss_encountered', { wave: waveIndex });
  }
  else if(phase.sizeTier === 'LARGE') showKillstreakBanner(SIZE_PHASE_BANNERS[phase.sizeTier]);
  else showToast(SIZE_PHASE_BANNERS[phase.sizeTier]);
  playSound(phase.sizeTier === 'BOSS' || phase.sizeTier === 'LARGE' ? 'wave' : 'click');
}
// WAVE-RUSH-01: When the player has cleared every enemy still on the route
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
// LOOSE-NOTICE-01
function countLooseEnemies(){
  let looseCount = 0;
  for(const enemy of enemyPool) if(enemy.active && enemy.escaped) looseCount++;
  return looseCount;
}
/* =========================================================
   WAVE START
   ========================================================= */
// EARLY-CALL-01: calling the next wave soon after clearing one pays bonus gold, falling to nothing over EARLY_CALL_WINDOW_MS of game time
// (paused time does not count), after Kingdom Rush's early call.
const EARLY_CALL_WINDOW_MS = 20000, EARLY_CALL_BASE_GOLD = 8, EARLY_CALL_GOLD_PER_WAVE = 1.5;
let waveClearedAtGameTime = -Infinity;
function earlyCallBonusNow(){
  if(wavesCompleted <= 0 || !Number.isFinite(waveClearedAtGameTime)) return 0;
  const remaining = Math.max(0, EARLY_CALL_WINDOW_MS - (gameTime - waveClearedAtGameTime));
  return Math.round((EARLY_CALL_BASE_GOLD + EARLY_CALL_GOLD_PER_WAVE * wavesCompleted) * remaining / EARLY_CALL_WINDOW_MS);
}
function resetTowerWaveTallies(tower){
  tower.waveXp = 0; tower.waveLastHits = 0; tower.waveAssists = 0; tower.waveCleanups = 0; tower.waveDamage = 0; tower.waveStatPoints = 0;
  if(tower.type === 'AXEMAN') tower.axeSwitchesLeft = 1;
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
    showTutorialTipOnce('first_early_call', '💰 Calling the next wave quickly after a clear pays bonus gold. The bonus shrinks to nothing over ' + Math.round(EARLY_CALL_WINDOW_MS / 1000) + ' seconds.');
  }
  if(waveIndex === 0){ stealthRun=window.analyticsConsentChoice==='denied'; markFirstWaveStarted(); }
  if(Math.random() < 0.02){
    spawnLeafGust();
  }
  for(const tower of towerPool){
    if(!tower.active) continue;
    if(tower.disabledWavesLeft > 0) tower.disabledWavesLeft--;
    if(tower.type === 'NECROMANCER') raiseSkeletonsForTower(tower);
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
  const looseAtStart = countLooseEnemies();
  Object.assign(waveTelemetry, { activeAtStartMs:telemetryActiveMs(), startedAtGameTime: gameTime, livesAtStart: lives, goldAtStart: gold, escaped: 0, towersDowned: 0, loosePeak: looseAtStart, looseDrainLives: 0, lagReported: false });
  announceActStart(waveIndex);
  trackGameEvent('wave_started', { wave: waveIndex, lives, gold, towers: countActiveTowers(), loose: looseAtStart, unlocked_towers: unlockedTowerTypes.size });
  for(const tower of towerPool) if(tower.active) resetTowerWaveTallies(tower);
  playSound('roundStart');
  updateHUD();
}
/* =========================================================
   HUTS, CASTLES AND GRAVES
   ========================================================= */
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
// CAMP-BUILDINGS-01: every camp building is a stationary GRUNT-based Enemy; the table holds what differs between kinds.
// Health multipliers ramp with the wave where a kind opens early (the hut), and guardians respawn in pairs once all are down.
const CAMP_BUILDING_KINDS = {
  HUT:    { emoji: '🛖', healthMultiplier: () => 1.5 + Math.min(6.5, Math.max(0, waveIndex - 1)*0.18), bountyMult: 8,  guardian: { type: 'GRUNT',  healthMultiplier: () => 1.5 + Math.min(3, Math.max(0, waveIndex - 1)*0.08), spreadPx: 50, bountyMult: 4 } },
  CASTLE: { emoji: '🏰', healthMultiplier: () => 26, bountyMult: 10, guardian: { type: 'CHESS',  healthMultiplier: () => 1.4, spreadPx: 60, bountyMult: 3, emojiChoices: ['♟','♙','♞','♘','♝','♗','♜','♖','♛','♕','♚','♔'] } },
  GRAVE:  { emoji: '🪦', healthMultiplier: () => 20, bountyMult: 8,  guardian: { type: 'ZOMBIE', healthMultiplier: () => 1.2, spreadPx: 60, bountyMult: 3 } },
  CIRCUS: { emoji: '🎪', healthMultiplier: () => CIRCUS_HEALTH_MULTIPLIER, bountyMult: 6, guardian: null }
};
const CAMP_GUARDIANS_PER_BUILDING = 2;
function spawnCampGuardian(building){
  const spec = CAMP_BUILDING_KINDS[building.buildingKind].guardian;
  const guardian = spec && acquireActive(enemyPool);
  if(!guardian) return null; // pool exhausted: the camp has fewer guardians this time rather than blocking anything else
  guardian.spawn(spec.type, spec.healthMultiplier() * waveHpScale(waveIndex), false, false);
  if(spec.emojiChoices) guardian.emoji = spec.emojiChoices[Math.floor(Math.random()*spec.emojiChoices.length)];
  guardian.isGuardian = true;
  guardian.hutRef = building;
  guardian.hutAnchorX = building.x; guardian.hutAnchorY = building.y;
  guardian.x = building.x + (Math.random() - 0.5)*spec.spreadPx;
  guardian.y = building.y + (Math.random() - 0.5)*spec.spreadPx;
  guardian.bounty = Math.round(guardian.bounty * spec.bountyMult);
  building.guardiansAliveCount = (building.guardiansAliveCount || 0) + 1;
  return guardian;
}
function spawnCampGuardianPair(building){
  for(let index = 0; index < CAMP_GUARDIANS_PER_BUILDING; index++) spawnCampGuardian(building);
}
function spawnCampBuilding(kind, x, y){
  const spec = CAMP_BUILDING_KINDS[kind];
  const building = acquireActive(enemyPool);
  if(!building) return null;
  building.spawn('GRUNT', spec.healthMultiplier() * waveHpScale(waveIndex), false, false);
  building.emoji = spec.emoji;
  building.isHutBuilding = true;
  building.buildingKind = kind;
  building.x = x; building.y = y;
  building.speed = 0;
  building.guardiansAliveCount = 0;
  building.destroyed = false;
  building.respawnAt = null;
  building.campDamageLedger = new Map();
  building.bounty = Math.round(building.bounty * spec.bountyMult);
  if(spec.guardian) spawnCampGuardianPair(building);
  return building;
}
function spawnHuts(oldRegion, newRegion){
  const tile = findHutPlacementTile(oldRegion, newRegion);
  if(!tile) return false; // no safe new tile: try again after a later expansion
  return !!spawnCampBuilding('HUT', tile.x, tile.y);
}
/* =========================================================
   TUTORIAL TIPS, WAVE-CLEAR EVENTS AND LIFE LOSS
   ========================================================= */
const SEEN_TIPS_KEY = 'sticktd:seenTips:v1';
let seenTutorialTips = new Set();
(function loadSeenTips(){
  try{ seenTutorialTips = new Set(JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) || '[]')); }catch(e){ /* fresh start */ }
})();
function showTutorialTipOnce(id, message){
  if(seenTutorialTips.has(id)) return;
  seenTutorialTips.add(id);
  try{ localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seenTutorialTips])); }catch(e){ /* private mode or full storage: the tip shows again next session */ }
  showToast(message);
  playSound('wave');
}
function maybeShowWaveTutorialTip(){
  if(wavesCompleted === SAVE_TIP_WAVE) showTutorialTipOnce('save_stopping_point', '💾 Good stopping point. Save from ⚙️ Settings.'); // SAVE-TIP-01: the first short session ends on a win with a way to keep it
  if(wavesCompleted === 25){
    showTutorialTipOnce('zombies_incoming', '🧟 Zombies arrive at Wave ' + FAMILY_INTRODUCTION_WAVE.ZOMBIE + ' — only Holy damage (Paladin, Cleric, Pope) hurts them well. Train a Mage\'s INT to ' + specializationThresholdFor('CLERIC') + ' to unlock the Cleric.');
  }
  if(wavesCompleted === 30){
    showTutorialTipOnce('zombie_graves', '🧟 Zombies are here. Watch for Zombie Graves (🪦) — non-Holy attacks barely scratch them or their guardians.');
  }
}
const MAX_EXTRA_BUILDINGS_ON_BOARD = 3;
// EVENT-PACING-01: a random hostile event (wandering troll, extra building, circus) needs a breather behind it, so after one appears the next wave clear brings only peaceful events.
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
  let liveBuildings = 0;
  for(const enemy of enemyPool) if(enemy.active && enemy.isHutBuilding && !enemy.destroyed) liveBuildings++;
  if(liveBuildings >= MAX_EXTRA_BUILDINGS_ON_BOARD) return;
  const chance = Math.min(0.5, 0.08 + (waveIndex - 20) * 0.01); // 8% at wave 20, capped at 50%
  if(Math.random() >= chance) return;
  const tile = findHutPlacementTile();
  if(!tile || !tryClaimRandomEventSlot()) return;
  logGameEvent('random event: extra building');
  if(waveIndex >= 30){
    const roll = Math.random();
    spawnCampBuilding(roll < 0.40 ? 'HUT' : roll < 0.73 ? 'CASTLE' : 'GRAVE', tile.x, tile.y);
  } else spawnCampBuilding(Math.random() < 0.6 ? 'HUT' : 'CASTLE', tile.x, tile.y);
}
function loseLife(n){
  if(absorbLeakWithDonutShield()){
    const finish = waypointsPx && waypointsPx.length ? waypointsPx[waypointsPx.length - 1] : null; // the shield sparkles where the leak would have happened
    if(finish) spawnParticles(finish.x, finish.y, '#ffb3d9', 6);
    playSound('click');
    return;
  }
  lives -= n;
  livesLostThisRun += n;
  if(lives <= 0 && hasDefibrillator){
    hasDefibrillator = false;
    lives = Math.max(1, Math.ceil(maxLivesNow() * DEFIBRILLATOR_REVIVE_LIVES_FRACTION)); // the HUD shows the change itself
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
const TROLL_ATTACK_RADIUS = 58, TROLL_ATTACK_INTERVAL_MS = 1600, TROLL_ATTACK_DAMAGE = 10, TROLL_AGGRO_RADIUS = 300, TROLL_HUNT_SPEED_MULT = 1.3; // TROLL-HUNT-01
// LIVESTOCK-01: farm animals, bees and circus performers wander the road and its grass border (isLooseWalkableAt), drop their meat item when
// killed, and never count toward a wave. Towers attack one only after the player marks it (TARGET-MARK-01); hunters (clown, wandering troll) attack stickmen.
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
// TROLL-ENTRANCE-01: the troll enters from the map rim and walks a few rim stops before it charges.
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
// WANDERING-TROLL-01
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
  awardMedal('TROLL_SPOTTER'); // DISCOVERY-MEDALS-01
  playSound('troll_arrive', troll.x, undefined, troll.y);
  spawnFloatingText(troll.x, troll.y - troll.radius - 22, '🧌 Troll!', '#ffb74d');
  showTutorialTipOnce('first_troll', '🧌 A Wandering Troll has arrived. It hunts nearby stickmen, so keep it inside the range of your strongest towers. One is guaranteed every fifth round, and others can wander in between.');
  return true;
}
// CIRCUS-01: the circus is a peaceful building; every round end it sends out a monkey, an elephant or a clown.
const CIRCUS_MIN_WAVE = 3, CIRCUS_CHANCE_PER_WAVE = 0.14, CIRCUS_HEALTH_MULTIPLIER = 6, CIRCUS_EXTRA_LIVESTOCK_CAP = 4, CIRCUS_MAX_CLOWNS = 3;
const CIRCUS_PERFORMER_WEIGHTS = [['MONKEY', 0.4], ['ELEPHANT', 0.3], ['CLOWN', 0.3]];
/* =========================================================
   SIZE AND FAMILY TIERS
   ========================================================= */
const CAMPAIGN_WAVE_COUNT = 100;
const SIZE_TIER_ORDER = ['TINY', 'SMALL', 'STANDARD', 'LARGE', 'BOSS'];
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
// EARLY-HOOK-01: the first minutes escape an all-Grunt run.
const EARLY_PREVIEW_BY_WAVE = Object.freeze({ 2: ['SWARM', 0.15], 3: ['SWARM', 0.25], 4: ['WOLF', 0.15], 5: ['WOLF', 0.2], 7: ['RUNNER', 0.15], 8: ['RUNNER', 0.2] });
const EARLY_NO_RUSH_LAST_WAVE = 2;
function earlyPreviewFamily(waveNumber){ return EARLY_PREVIEW_BY_WAVE[waveNumber] ? EARLY_PREVIEW_BY_WAVE[waveNumber][0] : null; }
// ENEMY-EMOJI-VARIETY-01: Grunts and Swarm pick one of several faces per unit from the wave seed, so a wave reads as a crowd, not clones.
const ENEMY_EMOJI_VARIANTS = Object.freeze({ SWARM: ['🐜', '🪲'] }); // GRUNT-ONE-FACE-01: a Grunt is always 😡, like every other enemy keeps its one emoji
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
const WAVE_COUNTDOWN_MS = 3000;
const WAVE_COUNTDOWN_GO_HOLD_MS = 500;
const WAVE_CLEAR_XP_BASE = 8, WAVE_CLEAR_XP_PER_WAVE = 1.5;
let waveRunSeed = runSeedFor(0xA3);
const HEALER_AURA_RADIUS_PX = 90;
const LOOSE_SEPARATION_RANGE_PX = 48, LOOSE_SEPARATION_GAP_PX = 10, LOOSE_SEPARATION_WEIGHT = 2.5;
const ESCAPE_WALKBACK_MAX_TILES = 4, DRIP_INTO_DRIP_RADIUS_PX = 12, DRIP_INTO_DRIP_SATELLITES_MIN = 3;
const LIVESTOCK_AVOID_MARGIN_PX = 26, LIVESTOCK_AVOID_STRENGTH = 2.2;
let activeWavePlan = null;
const waveDispatch = { phaseIndex:0, batchIndex:0, unitIndex:0, unitGapRemainingMs:0, gapRemainingMs:0, resolvedUnits:0, batchEnemies:[], batchSerials:[], releaseHoldMs:0 };
const BATCH_RELEASE_SPACING_PX = 240, BATCH_RELEASE_MAX_HOLD_MS = 6000; // RELEASE-HOLD-CAP-01
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
// WAVE-FORMATION-01: every wave from the second on is dealt in one of six formations, so waves stop arriving as the same even drip.
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
      const size = clampNum(shape.size, 1, units.length - cursor);
      const batchUnits = units.slice(cursor, cursor + size);
      for(const unit of batchUnits) unit.batchIndex = batches.length;
      batches.push({ batchIndex: batches.length, units: Object.freeze(batchUnits), presentationGapMs: band.batchGapMs * shape.gap });
      cursor += size;
    }
    const tempoFactor = (sizeTier === 'BOSS' || waveNumber <= 1) ? 1 : WAVE_TEMPO_GAP_FACTOR; // TEMPO-01: batches after wave 1 arrive 25% closer together
    if(formation !== 'STEADY' && batches.length > 1){
      const steadyTotal = Math.ceil(units.length / ((minBatch + maxBatch) / 2)) * band.batchGapMs;
      const actualTotal = batches.reduce((sum, batch) => sum + batch.presentationGapMs, 0);
      const scale = clampNum(steadyTotal / actualTotal, 0.3, 1.6);
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
// ELITE-ENEMIES-01: from wave 8 a few Small, Standard and Large enemies spawn as elites with one modifier, shown by a coloured patch on the ground
// under them, the same colour everywhere so the colour teaches the counter (Diablo's palette-swapped monsters): blue Swift moves faster, gold Tough has double
// health, red Fierce hits stickmen harder. Elites pay double bounty. The chance starts at 3% and grows a little each wave, up to 8%.
const ENEMY_AGGRO_POSE_MS = 600;
const ELITE_FIRST_WAVE = 8, ELITE_BASE_CHANCE = 0.03, ELITE_CHANCE_PER_WAVE = 0.0005, ELITE_MAX_CHANCE = 0.08;
const ELITE_KINDS = Object.freeze({
  SWIFT: { label: 'Swift', color: '#4fc3f7' },
  TOUGH: { label: 'Tough', color: '#ffca28' },
  FIERCE: { label: 'Fierce', color: '#ff7043' }
});
const ELITE_KIND_IDS = Object.keys(ELITE_KINDS), ELITE_SIZE_TIERS = new Set(['SMALL', 'STANDARD', 'LARGE']);
function maybeMakeElite(enemy, spec){
  if(waveIndex < ELITE_FIRST_WAVE || !ELITE_SIZE_TIERS.has(spec.sizeTier) || spec.family === 'SANTA' || spec.family === 'BOSS') return;
  if(Math.random() >= Math.min(ELITE_MAX_CHANCE, ELITE_BASE_CHANCE + ELITE_CHANCE_PER_WAVE * (waveIndex - ELITE_FIRST_WAVE))) return;
  const kind = ELITE_KIND_IDS[Math.floor(Math.random() * ELITE_KIND_IDS.length)];
  enemy.eliteKind = kind;
  if(kind === 'SWIFT') enemy.speed *= 1.35;
  else if(kind === 'TOUGH'){ enemy.maxHp = Math.round(enemy.maxHp * 2); enemy.hp = enemy.maxHp; }
  else enemy.breakDamage = Math.round((enemy.breakDamage || 0) * 1.6);
  enemy.bounty = Math.round(enemy.bounty * 2);
  spawnFloatingText(enemy.x, enemy.y - enemy.radius - 14, 'Elite: ' + ELITE_KINDS[kind].label, ELITE_KINDS[kind].color);
  showTutorialTipOnce('first_elite', '⭐ Elite enemies stand on a coloured patch: blue is Swift, gold is Tough, red is Fierce. They pay double gold.');
}
function drawEliteGroundPatch(ctx, enemy){
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = ELITE_KINDS[enemy.eliteKind].color;
  ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.72, enemy.radius * 1.15, enemy.radius * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// ENEMY-STARTLE-01: small enemies near an ally that dies give a short startled hop, a group reaction that reads as awareness (Diablo's Fallen, Isbister's enemy moments).
const ENEMY_STARTLE_MS = 320, ENEMY_STARTLE_RADIUS_PX = 46;
function startleNearbyAllies(fallen){
  for(const ally of enemiesNear(fallen.x, fallen.y, ENEMY_STARTLE_RADIUS_PX)){
    if(!ally.active || ally === fallen || ally.isLivestock || ally.isHutBuilding || (ally.sizeTier !== 'TINY' && ally.sizeTier !== 'SMALL')) continue;
    if(Math.hypot(ally.x - fallen.x, ally.y - fallen.y) <= ENEMY_STARTLE_RADIUS_PX) ally.startledUntil = presentationTime + ENEMY_STARTLE_MS;
  }
}
// OPENING-SPAWN-GAP-01: up to OPENING_FLOW_LAST_WAVE the body gap at the entrance is 8 px instead of 24, so slow early walkers leave without long waits
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
const surroundContenders=[];
const SURROUND_MAX_RINGS = 20, SURROUND_BODY_GAP_PX = 8;
function isSurroundRival(other, enemy, target){
  if(other === enemy || !other.active || other.surroundTarget !== target || other.surroundTargetId !== target.id || other.surroundOwnerId !== other.id) return false;
  return other.breakawayTarget === target || other.escapedAttackTarget === target || other.attackBumpTarget === target
    || (other.isGuardian && other.hutRef && campLeaderTower(other.hutRef) === target);
}
function surroundSlotIsFree(enemy, x, y){
  for(const other of surroundContenders){
    if(Math.hypot(x - other.surroundX, y - other.surroundY) < enemy.radius + other.radius + SURROUND_BODY_GAP_PX) return false;
  }
  return true;
}
// Returns the enemy itself; its surroundX/surroundY fields hold the offset, so no destination object is allocated per tick.
function enemySurroundPoint(enemy, target){
  if(target.type === 'BARRICADE') return null;
  if(enemy.surroundTarget === target && enemy.surroundTargetId === target.id && enemy.surroundOwnerId === enemy.id) return enemy;
  enemy.surroundTarget = target; enemy.surroundTargetId = target.id; enemy.surroundOwnerId = enemy.id;
  const preferred = Math.atan2(enemy.y - target.y, enemy.x - target.x), innerRadius = Math.max(26, enemy.radius*1.75 + 12);
  const ringStep = enemy.radius*2 + SURROUND_BODY_GAP_PX;
  surroundContenders.length = 0; // SURROUND-CONTENDERS-01: rivals for this target are gathered once, not per candidate slot
  for(const other of enemyPool) if(isSurroundRival(other, enemy, target)) surroundContenders.push(other);
  for(let ring = 0; ring < SURROUND_MAX_RINGS; ring++){
    const ringRadius = innerRadius + ring*ringStep, slots = Math.max(6, Math.floor(Math.PI*2*ringRadius/ringStep));
    for(let slot = 0; slot < slots; slot++){
      const angle = preferred + slot*Math.PI*2/slots, x = Math.cos(angle)*ringRadius, y = Math.sin(angle)*ringRadius;
      if(!surroundSlotIsFree(enemy, x, y)) continue;
      enemy.surroundX = x; enemy.surroundY = y; enemy.surroundWaiting = ring > 0;
      return enemy;
    }
  }
  enemy.surroundX = Math.cos(preferred)*innerRadius*(SURROUND_MAX_RINGS + 1);
  enemy.surroundY = Math.sin(preferred)*innerRadius*(SURROUND_MAX_RINGS + 1);
  enemy.surroundWaiting = true;
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
const ENEMY_STATUS_LABELS = Object.freeze([
  { text: '🔥 BURNING', color: '#ff8844', isActive: enemy => enemy.burnUntil > gameTime },
  { text: '☠️ CURSED', color: '#7cb518', isActive: enemy => enemy.poisonUntil > gameTime },
  { text: '🩸 BLEEDING', color: '#e63946', isActive: enemy => enemy.bleedUntil > gameTime },
  { text: '🧊 SLOWED', color: '#7dd3fc', isActive: enemy => enemy.slowTimer > 0 },
  { text: '⭐ STUNNED', color: '#ffe066', isActive: enemy => enemy.stunnedUntil > gameTime }
]);
function drawStuckProjectileShape(ctx, kind){
  if(kind === 'AXE'){
    ctx.strokeStyle = '#704b2d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.fillStyle = '#aeb5bc'; ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(7, -3); ctx.lineTo(9, 0); ctx.lineTo(7, 3); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
  } else if(kind === 'DART'){
    ctx.strokeStyle = '#514631'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, 0); ctx.stroke();
    ctx.fillStyle = '#d8c99a'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-9, -2); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();
  } else if(kind === 'BULLET' || kind === 'PELLET'){
    ctx.fillStyle = kind === 'BULLET' ? '#b9a36a' : '#75c7df'; ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 1.8, 0, 0, Math.PI*2); ctx.fill();
  } else if(kind === 'KNIFE' || kind === 'BLADE'){
    ctx.fillStyle = '#cfd6d9'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(2, -2); ctx.lineTo(5, 0); ctx.lineTo(2, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#69482d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-8, 0); ctx.stroke();
  }
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
    this.speed = def.speed * ENEMY_WALK_SPEED_SCALE; // ENEMY-PACE-01
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
      this.maxHp = Math.max(1, Math.round(this.maxHp * 0.35));
      this.hp = this.maxHp;
      this.radius = Math.max(5, Math.round(this.radius * 0.55));
      this.bounty = Math.max(1, Math.round(this.bounty * 0.3));
      this.speed = this.speed * 1.1;
    } else {
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
    this.frozenUntil = 0; // ELEMENT-EFFECTS-01
    this.burnUntil = 0;
    this.burnTickTimer = 0;
    this.lastBurnSource = null;
    this.poisonUntil = 0;
    this.poisonTickTimer = 0;
    this.poisonDamagePerTick = 0;
    this.lastPoisonSource = null;
    this.acidStacks = 0; this.acidUntil = 0; this.acidTickTimer = 0; this.acidDamagePerStack = 0; this.acidSlowPerStack = 0; this.acidNextStackAt = 0; this.lastAcidSource = null;
    this.bleedUntil = 0;         // open-wound bleeding DOT — lasts as long as any arrow is stuck, independent of the passive low-HP drip
    this.bleedStartedAt = 0;
    this.bleedTickTimer = 0;
    this.dotTextPending = [0, 0, 0]; this.dotTextShownAt = [-1e9, -1e9, -1e9]; // DOT-TEXT-01: bleed, burn and poison damage is summed and shown once per real second
    this.bleedDamagePerTick = 0;
    this.bloodStains = undefined; this.bloodStainRevision=0;this.bloodStampKey=null;this.bleedSprayHeading = undefined; this.trailX = undefined; this.trailY = undefined; this.trailAccumPx = 0; this.trailStillMs = 0; this.trailDropCount = 0;
    this.bleedStackCount = 0;
    if(this.bleedStackDamages) this.bleedStackDamages.length = 0; else this.bleedStackDamages = [];
    this.lastBleedSource = null;
    this.bloodProfile = rollBloodProfile(type);
    this.statusLabelTimer = 0; // periodic reminder text for active status effects
    this.stallWatchX = null; this.stallWatchY = null;
    this.stallWatchTraveled = 0; // last-resort anti-bunching failsafe — see checkStallWatchdog()
    this.stallWatchTimer = 0;
    this.stallStrikes = 0;
    this.flinchStart = 0;
    this.flinchAngle = 0;
    this.flinchMag = 0;
    this.flinchDuration = 1;
    this.pileBlocked = false; // frozen by a Barricade (either touching one, or queued up behind another blocked mob)
    this.touchingBarricade = false; // true only for the one actually pressed against the barricade (drives the bump animation)
    this.bumpTime = 0;
    this.attackBumpTarget = null;
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
    this.lastBloodFootX=undefined;this.lastBloodFootY=undefined;this.bloodFootSide=0;
    this.wetFeetSteps = 0; this.wetFeetStepsMax = 0; this.wetFeetSizeBonus = 0;
    this.isUndead = !!def.isUndead;
    this.footstepWeight = FOOTSTEP_WEIGHT[type] !== undefined ? FOOTSTEP_WEIGHT[type] : 1;
    this.footstepDist = this.footstepWeight === null ? Infinity : (this.radius * 17);
    this.sizeTier = 'STANDARD';
    this.spawnSerial = ++enemySpawnSerial;
    if(!this.damageLedger) this.damageLedger = new Map();
    this.damageLedger.clear();
    this.enrageCueFired = false; // one-shot low-HP growl for Boss/Troll (see update())
    this.isStealthSanta=false;
    this.escaped = false;
    this.wanderVx = 0; this.wanderVy = 0; this.wanderRepickTimer = 0; this.moveVx = 0; this.moveVy = 0; this.steerVx = 0; this.steerVy = 0;
    this.wanderGoalActive = false; this.wanderGoalX = 0; this.wanderGoalY = 0;
    this.escapedAttackTarget = null; this.escapedAttackTimer = 0; this.escapedAttackCheckTimer = 0;
    this.looseDrainMs = 0; this.dripSiteX = undefined;
    this.breedingPartner=null;this.birthDueRound=0;this.breedReadyRound=0;
    this.heartStartAt = -1e9; this.heartCooldownUntil = 0; this.heartCheckTimer = 0;
    this.isHostileNpc = false; this.isLivestock = false; this.livestockWalking = false; this.trollRoute = null; // LIVESTOCK-RECYCLE-01
    this.isGuardian = false; this.hutRef = null; this.hutAnchorX = 0; this.hutAnchorY = 0;
    this.isHutBuilding = false; this.guardiansAliveCount = 0; this.respawnAt = null; this.destroyed = false; this.buildingKind = null;
    this.growthRounds = LIVESTOCK_ADULT_ROUNDS;
    this.active = true;
  }
  showStatusLabels(){
    let offsetPx = 0;
    for(const label of ENEMY_STATUS_LABELS){
      if(!label.isActive(this)) continue;
      spawnRoutineCombatText(this.x, this.y - this.radius - 14 - offsetPx, label.text, label.color);
      offsetPx += 14;
    }
  }
  showDotDamageText(slot, amount, emoji, color){
    this.dotTextPending[slot] += amount;
    if(presentationTime - this.dotTextShownAt[slot] < DOT_TEXT_INTERVAL_MS) return;
    this.dotTextShownAt[slot] = presentationTime;
    spawnRoutineCombatText(this.x, this.y - this.radius - 6, this.dotTextPending[slot] + emoji, color);
    this.dotTextPending[slot] = 0;
  }
  applySlow(factor, duration){
    const newMultiplier = this.type === 'ICE' ? Math.max(ICE_ENEMY_MIN_SLOW_MULT, 1 - factor) : 1 - factor; // ELEMENTAL-ENEMY-RESIST-01: an ice enemy shrugs off most slows
    if(newMultiplier < this.slowMultiplier) this.slowMultiplier = newMultiplier; // strongest slow wins
    this.slowTimer = Math.max(this.slowTimer, duration);
  }
  applyStun(ms){
    this.stunnedUntil = Math.max(this.stunnedUntil, gameTime + ms * (STUN_RESISTANT_TYPES.has(this.type) ? BOSS_STUN_SHARE : 1));
  }
  checkLivestockPairHearts(dt){
    this.heartCheckTimer-=dt;if(this.heartCheckTimer>0) return;
    this.heartCheckTimer=LIVESTOCK_PAIR_CHECK_MS;prepareLivestockPair(this);
  }
  updateLivestockWander(dt){
    if(livestockIsEgg(this)){ this.vx = 0; this.vy = 0; this.livestockWalking = false; return; }
    if(this.trollRoute && this.trollRoute.length){ this.walkTrollEntrance(dt); return; }
    if(!this.isHostileNpc && this.type!=='BEE') this.checkLivestockPairHearts(dt);
    if(this.type==='BEE'){ updateBeeHoney(this,dt); this.updateBeeFlight(dt); return; }
    // LIVESTOCK-CUTE-01: idle a moment, then amble in a direction for a bit, then idle again. Driven in real time
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
        this.faceLivestockAlongVelocity();
      } else {
        this.retargetTimer = LIVESTOCK_IDLE_MS_MIN + Math.random()*(LIVESTOCK_IDLE_MS_MAX - LIVESTOCK_IDLE_MS_MIN);
        this.vx = 0; this.vy = 0;
      }
    }
    if(!isLooseWalkableAt(this.x, this.y)){
      // LIVESTOCK-UNSTUCK-01: an animal that ends up on ground it cannot walk (map change, odd spawn tile) would bounce in place
      // forever, because every step fails the walkable check. Move it to the middle of the active region's nearest walkable tile.
      const rescue = nearestLooseWalkableTileCenter(this.x, this.y);
      if(rescue){ // WANDERER-GLIDE-01: walk back toward walkable ground instead of jumping there
        const rescueDistance = Math.hypot(rescue.x - this.x, rescue.y - this.y) || 1;
        const rescueStep = Math.min(rescueDistance, LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * 2.5 * dt/1000);
        this.x += (rescue.x - this.x)/rescueDistance*rescueStep; this.y += (rescue.y - this.y)/rescueDistance*rescueStep;
      }
    }
    const hunter = LIVESTOCK_TYPES[this.type] && LIVESTOCK_TYPES[this.type].hunter;
    if(hunter){
      this.trollAttackTimer = (this.trollAttackTimer||0) - dt;
      const swingNow = this.trollAttackTimer <= 0, swingReach = hunter.attackRadius + this.radius;
      if(swingNow) this.trollAttackTimer = hunter.attackIntervalMs;
      let huntTarget = null, huntDist = hunter.aggroRadius;
      for(const tower of towerPool){
        if(!tower.active || tower.type === 'BARRICADE') continue;
        const distance = Math.hypot(tower.x - this.x, tower.y - this.y);
        if(swingNow && distance <= swingReach && !(tower.disabledWavesLeft > 0)){
          tower.takeDamage(hunter.attackDamage);
          spawnParticles(tower.x, tower.y, '#ffb74d', 4);
        }
        if(tower.active && distance < huntDist){ huntTarget = tower; huntDist = distance; }
      }
      this.attackBumpTarget = huntTarget && huntDist <= hunter.attackRadius + this.radius ? huntTarget : null;
      if(huntTarget){
        this.retargetTimer = 600; this.livestockWalking = true;
        if(huntDist <= hunter.attackRadius * 0.8 + this.radius){ this.vx = 0; this.vy = 0; }
        else {
          const huntSpeed = LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * hunter.speedMult;
          this.vx = (huntTarget.x - this.x)/huntDist*huntSpeed; this.vy = (huntTarget.y - this.y)/huntDist*huntSpeed;
        }
        this.faceLivestockAlongVelocity();
      }
    }
    const walkSpeed = this.livestockWalking ? Math.hypot(this.vx, this.vy) : 0;
    if(walkSpeed > 0 && !isLooseWalkableAt(this.x + this.vx/walkSpeed*NPC_EDGE_LOOKAHEAD_PX, this.y + this.vy/walkSpeed*NPC_EDGE_LOOKAHEAD_PX)){
      const inward = nearestLooseWalkableTileCenter(this.x, this.y);
      const turn = inward ? Math.atan2(inward.y - this.y, inward.x - this.x) + (Math.random()-0.5)*0.8 : Math.random()*Math.PI*2;
      this.vx = Math.cos(turn)*walkSpeed; this.vy = Math.sin(turn)*walkSpeed;
      this.faceLivestockAlongVelocity();
    }
    // LIVESTOCK-SMOOTH-01: vx/vy is where the animal wants to go; its actual motion eases toward that (plus the enemy-avoidance bend,
    // computed fresh each frame) instead of snapping, so turns, starts and stops read as a walk rather than a twitch.
    this.steerVx = this.livestockWalking ? this.vx : 0; this.steerVy = this.livestockWalking ? this.vy : 0;
    if(walkSpeed > 0 && !hunter) this.steerAroundEnemies(walkSpeed);
    const ease = 1 - Math.exp(-dt / LIVESTOCK_MOTION_EASE_MS);
    this.moveVx += (this.steerVx - this.moveVx) * ease; this.moveVy += (this.steerVy - this.moveVy) * ease;
    this.faceLivestockAlongVelocity();
    const stepX = this.x + this.moveVx*dt/1000, stepY = this.y + this.moveVy*dt/1000;
    if(isLooseWalkableAt(stepX, stepY)){ this.x = stepX; this.y = stepY; }
    else { this.vx = 0; this.vy = 0; this.moveVx = 0; this.moveVy = 0; this.retargetTimer = 0; }
  }
  // BEE-GLIDE-01: a bee flies anywhere over the open map (road, rocks and trees included) on a heading that turns smoothly toward a slowly changing goal, with a gentle speed swell, instead of the
  // walk/idle bursts, instant edge turns and enemy-steering nudges ground animals use, which made it jerk.
  updateBeeFlight(dt){
    const seconds = dt/1000, cruise = LIVESTOCK_TYPES.BEE.speed * LIVESTOCK_WALK_SPEED_MULT;
    if(!Number.isFinite(this.beeHeading)){ this.beeHeading = Math.random()*Math.PI*2; this.beeGoalHeading = this.beeHeading; this.beePhase = Math.random()*Math.PI*2; }
    this.retargetTimer = (this.retargetTimer||0) - dt;
    const aheadX = this.x + Math.cos(this.beeHeading)*NPC_EDGE_LOOKAHEAD_PX, aheadY = this.y + Math.sin(this.beeHeading)*NPC_EDGE_LOOKAHEAD_PX;
    if(!beeCanFlyAt(aheadX, aheadY)){
      this.beeGoalHeading = Math.atan2((activeRegion.y0 + activeRegion.y1 + 1)*TILE_SIZE/2 - this.y, (activeRegion.x0 + activeRegion.x1 + 1)*TILE_SIZE/2 - this.x);
      this.retargetTimer = BEE_RETARGET_MS_MIN;
    } else if(this.retargetTimer <= 0){
      this.beeGoalHeading = this.beeHeading + (Math.random()*2 - 1)*BEE_GOAL_SWING_RAD;
      this.retargetTimer = BEE_RETARGET_MS_MIN + Math.random()*(BEE_RETARGET_MS_MAX - BEE_RETARGET_MS_MIN);
    }
    let turn = this.beeGoalHeading - this.beeHeading;
    while(turn > Math.PI) turn -= Math.PI*2;
    while(turn < -Math.PI) turn += Math.PI*2;
    this.beeHeading += clampNum(turn, -BEE_TURN_RATE*seconds, BEE_TURN_RATE*seconds);
    this.beePhase += seconds*BEE_SWELL_HZ*Math.PI*2;
    const speed = cruise*(1 + BEE_SWELL_SHARE*Math.sin(this.beePhase));
    this.vx = Math.cos(this.beeHeading)*speed; this.vy = Math.sin(this.beeHeading)*speed;
    this.livestockWalking = true;
    if(this.vx > cruise*BEE_FACE_FLIP_SHARE) this.livestockFacesRight = true;
    else if(this.vx < -cruise*BEE_FACE_FLIP_SHARE) this.livestockFacesRight = false;
    const stepX = this.x + this.vx*seconds, stepY = this.y + this.vy*seconds;
    if(beeCanFlyAt(stepX, stepY) || !beeCanFlyAt(this.x, this.y)){ this.x = stepX; this.y = stepY; }
  }
  faceLivestockAlongVelocity(){
    const sideways = this.moveVx || this.vx;
    if(sideways > LIVESTOCK_FACE_FLIP_PX_S) this.livestockFacesRight = true;
    else if(sideways < -LIVESTOCK_FACE_FLIP_PX_S) this.livestockFacesRight = false;
  }
  walkTrollEntrance(dt){
    const stop = this.trollRoute[0], dx = stop.x - this.x, dy = stop.y - this.y, distance = Math.hypot(dx, dy);
    const stepPx = LIVESTOCK_TYPES[this.type].speed * LIVESTOCK_WALK_SPEED_MULT * TROLL_ENTRANCE_SPEED_MULT * dt/1000;
    this.livestockWalking = true; this.attackBumpTarget = null;
    if(distance <= Math.max(stepPx, 4)){
      this.x = stop.x; this.y = stop.y; this.vx = 0; this.vy = 0;
      this.trollRoute.shift();
      if(!this.trollRoute.length){ this.retargetTimer = 0; this.livestockWalking = false; }
      return;
    }
    this.vx = dx/distance*stepPx*1000/dt; this.vy = dy/distance*stepPx*1000/dt;
    this.livestockFacesRight = dx > 0;
    this.x += dx/distance*stepPx; this.y += dy/distance*stepPx;
  }
  // LIVESTOCK-AVOID-01: animals and bees bend their walk away from enemies on the road instead of passing through them.
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
    this.steerVx = steerX / steerLength * walkSpeed; this.steerVy = steerY / steerLength * walkSpeed;
  }
  applyFreeze(ms){
    this.frozenUntil = Math.max(this.frozenUntil, gameTime + ms * (STUN_RESISTANT_TYPES.has(this.type) ? BOSS_STUN_SHARE : this.type === 'ICE' ? ICE_ENEMY_HOLD_SHARE : 1));
  }
  applyBurn(ms, sourceTower){
    if(this.type === 'FIRE') return; // ELEMENTAL-ENEMY-RESIST-01: a fire enemy does not burn
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
    if(this.bleedStackDamages.length < 4) this.bleedStackDamages.push(damagePerTick);
    this.bleedStackCount = this.bleedStackDamages.length;
    this.bleedUntil = Math.max(this.bleedUntil, gameTime + ms);
    if(this.bleedStackCount <= 1) this.bleedStartedAt = gameTime;
    let stackDamageTotal = 0;
    for(const stackDamage of this.bleedStackDamages) stackDamageTotal += stackDamage;
    this.bleedDamagePerTick = stackDamageTotal;
    if(sourceTower) this.lastBleedSource = sourceTower;
  }
  update(dt){
    // TARGET-MARK-01: livestock never path-follow, attack, or take part in wave logic — just
    // wander, confined to the walkable road/grass area, unless and until they take damage from being
    // the marked target, in which case the normal hit/flash/death pipeline below still applies to them.
    if(this.isLivestock){ this.updateLivestockWander(dt); return; }
    this.prevX = this.x; this.prevY = this.y;
    this.statusLabelTimer -= dt;
    if(this.statusLabelTimer <= 0){
      this.statusLabelTimer = 120000;
      this.showStatusLabels();
    }
    if(goreMode && this.hp > 0 && (this.hp < this.maxHp * 0.4 || this.bleedUntil > gameTime) && !(this.bloodProfile || getBloodProfile(this.type)).isDust){
      this.arterialDripTimer = (this.arterialDripTimer||0) - dt;
      if(this.arterialDripTimer <= 0){
        this.arterialDripTimer = 900 + Math.random()*700;
        const bio = this.bloodProfile || getBloodProfile(this.type);
        const speedNow = Math.hypot(this.vx, this.vy);
        if(speedNow > 15){
          const travelAngle = Math.atan2(this.vy, this.vx); // DRIP-TRAIL-FORENSIC-01: drops shed on the move keep the walker's momentum and elongate forward
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), 1, travelAngle, 0.35, this);
          if(this.bleedUntil > gameTime){
            spawnSatelliteDrops(this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, hexToRgba(bio.dark, 0.5), 2, travelAngle, 0.3, this);
          }
          this.dripSiteX = undefined;
        } else {
          const dripX = this.x + (Math.random()-0.5)*8, dripY = this.y + (Math.random()-0.5)*8;
          const intoOwnDrip = this.dripSiteX !== undefined && Math.hypot(dripX - this.dripSiteX, dripY - this.dripSiteY) < DRIP_INTO_DRIP_RADIUS_PX;
          spawnSatelliteDrops(dripX, dripY, hexToRgba(bio.dark, 0.6), intoOwnDrip ? DRIP_INTO_DRIP_SATELLITES_MIN + Math.floor(Math.random()*3) : 1, undefined, intoOwnDrip ? 1.4 : undefined, this); // DRIP-INTO-DRIP-01: a drop landing in its own wet stain throws satellites in random directions (Bevel & Gardner ch.8)
          if(!intoOwnDrip){ this.dripSiteX = dripX; this.dripSiteY = dripY; }
          if(Math.random() < 0.4) spawnDripTrail(this.x + (Math.random()-0.5)*6, this.y, hexToRgba(bio.dark, 0.55), undefined, this); // standing still long enough for it to actually run down, not just splash beneath
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
    if(this.bleedStackCount > 0 && this.embeddedArrows.length > 0) this.bleedUntil = Math.max(this.bleedUntil, gameTime + BLEED_ARROW_REFRESH_MS); // BLEED-WHILE-STUCK-01
    if(this.bleedUntil > gameTime){
      this.bleedTickTimer -= dt;
      if(this.bleedTickTimer <= 0){
        const bleedDmg = Math.max(1, Math.round(this.bleedDamagePerTick));
        this.recordContribution(this.lastBleedSource, bleedDmg, false);
        this.hp -= bleedDmg;
        this.showDotDamageText(DOT_TEXT_BLEED, bleedDmg, '🩸', '#e63946');
        const totalDuration = Math.max(1, this.bleedUntil - this.bleedStartedAt);
        const remainingFrac = clampNum((this.bleedUntil - gameTime) / totalDuration, 0, 1);
        const cessation = 0.35 + remainingFrac*0.65; // never fully silent until it actually ends, but visibly weaker near the end
        const pulse = 0.5 + 0.5*Math.sin((gameTime - this.bleedStartedAt) / 480 * Math.PI*2);
        this.bleedTickTimer = 420 + (1-pulse)*480; // 420ms at the peak of a beat, up to 900ms in the trough
        const hypoDamp = 0.4 + 0.6 * clampNum(this.hp / this.maxHp, 0, 1);
        const beatIntensity = cessation * (0.55 + pulse*0.75) * hypoDamp;
        if(goreMode && !this.bloodProfile.isDust){
          const bio = this.bloodProfile;
          const bleedStacks = Math.max(1, this.bleedStackCount); // BLEED-MULTIPLIES-01
          spawnParticles(this.x, this.y, bio.bright, Math.max(1, Math.round(3*beatIntensity*bleedStacks)), 160, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          if(this.bleedSprayHeading === undefined) this.bleedSprayHeading = Math.random()*Math.PI*2;
          spawnArterialBeat(this.x, this.y, bio, this.bleedSprayHeading, Math.min(1.5, beatIntensity*bleedStacks), graphicsQuality === 'low' || underHeavyVisualLoad, this);
          const satelliteDropCount = Math.floor(beatIntensity*bleedStacks + Math.random());
          if(satelliteDropCount > 0) spawnSatelliteDrops(this.x + (Math.random()-0.5)*8, this.y + (Math.random()-0.5)*8, hexToRgba(bio.dark, 0.65), satelliteDropCount, undefined, undefined, this);
          if(Math.random() < Math.min(1, 0.3*cessation*bleedStacks)) spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), 0.55), true, undefined, undefined, bio.viscous, undefined, bloodPoolSizeScale(this.radius), this);
          if(Math.random() < Math.min(1, 0.3*cessation*bleedStacks)) spawnDripTrail(this.x + (Math.random()-0.5)*6, this.y, hexToRgba(bio.dark, 0.55), undefined, this);
        }
        if(this.hp <= 0){ this.die(this.lastBleedSource, false); return; }
      }
    } else {
      this.bleedDamagePerTick = 0; // expired — a fresh wound starts clean rather than keeping a stale strength
      this.bleedStackCount = 0; // all arrows have finished bleeding out; the next one starts a fresh count
      this.bleedStackDamages.length = 0;
    }
    if(this.healsAllies) this.updateHealAura(dt);
    if(this.hasShield) this.updateShieldRegen(dt);
    if(this.escaped){ this.updateEscaped(dt); return; }
    if(this.isGuardian){ this.updateGuardian(dt); return; }
    if(this.isHutBuilding){ this.updateHutBuilding(dt); return; }
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
      this.santaSpawnTimer = (this.santaSpawnTimer||4000) - dt;
      if(this.santaSpawnTimer <= 0){
        this.santaSpawnTimer = 5000 + Math.random()*2000;
        spawnFloatingText(this.x, this.y - this.radius - 12, '🎅 Ho ho ho!', '#e63946');
        spawnParticles(this.x, this.y, '#e6c200', 10);
        getEnemyCollisionMask('COOKIE');
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
    let effectiveSpeed = this.tierWalkSpeed() * enemyMoveMultiplier(this);
    if(this.followSpeedCap !== undefined && this.followSpeedCap < effectiveSpeed) effectiveSpeed = this.followSpeedCap;
    if(this.queueSlotDist !== undefined) effectiveSpeed = Math.min(effectiveSpeed, Math.max(0, this.queueSlotDist-this.traveled)*1000/Math.max(1,dt));
    const target = waypointsPx[this.pathIndex+1];
    if(!target){
      const fl = computeFinishLine();
      if(!fl){ this.reachEnd(); return; } // no finish line yet: the enemy finishes at once rather than getting stuck with nowhere to walk
      const alongDist = (this.x - fl.edgeX)*fl.ux + (this.y - fl.edgeY)*fl.uy;
      if(alongDist >= this.radius){ this.reachEnd(); return; }
      const finalSpeed = this.tierWalkSpeed() * enemyMoveMultiplier(this);
      this.vx = fl.ux*finalSpeed; this.vy = fl.uy*finalSpeed;
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      this.traveled += finalSpeed*dt/1000;
      return;
    }
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const moveDist = effectiveSpeed * dt / 1000;
    this.vx = dx/dist*effectiveSpeed; this.vy = dy/dist*effectiveSpeed;
    let distMovedThisFrame;
    if(dist <= (this.queueSlotDist !== undefined ? moveDist : Math.max(moveDist, 3))){
      this.x = target.x; this.y = target.y;
      this.pathIndex++;
      this.traveled += dist;
      distMovedThisFrame = dist;
      const cornerTarget = waypointsPx[this.pathIndex+1];
      const leftover = moveDist - dist;
      if(leftover > 0 && cornerTarget){
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
    if(this.footstepWeight !== null){
      this.footstepDist -= distMovedThisFrame;
      if(this.footstepDist <= 0){
        this.footstepDist += this.radius * 17;
        if(typeof camera !== 'undefined'){
          const onScreenX = this.x*camera.zoom + camera.x, onScreenY = this.y*camera.zoom + camera.y;
          if(onScreenX > -80 && onScreenX < CANVAS_W+80 && onScreenY > -80 && onScreenY < CANVAS_H+80){
            playSound(SKITTER_STEP_TYPES.has(this.type) ? 'skitter' : 'footstep', this.x, this.footstepWeight, this.y); // ANT-SKITTER-01
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
    for(const e of enemiesNear(this.x, this.y, HEALER_AURA_RADIUS_PX)){
      if(!e.active || e === this || e.hp >= e.maxHp || e.isLivestock || e.isHutBuilding) continue; // HEAL-AURA-ALLIES-01: heals fellow lane enemies only, never animals or camp buildings
      if(Math.hypot(e.x-this.x, e.y-this.y) > HEALER_AURA_RADIUS_PX) continue;
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
  // ENEMY-PACE-01: walking speed never exceeds the size tier's band and carries a further 15% slowdown.
  tierWalkSpeed(){
    const band = SIZE_TIER_BANDS[this.sizeTier];
    return (band ? Math.min(band.speedMax, this.speed) : this.speed) * ENEMY_TIER_PACE_FACTOR;
  }
  recordContribution(sourceTower, amount, countsAsShotHit){
    if(!sourceTower || !sourceTower.active || amount <= 0) return;
    this.damageLedger.set(sourceTower, (this.damageLedger.get(sourceTower) || 0) + amount);
    sourceTower.lifetimeDamage = (sourceTower.lifetimeDamage || 0) + clampNum(this.hp, 0, amount);
    sourceTower.waveDamage = (sourceTower.waveDamage || 0) + clampNum(this.hp, 0, amount);
    // HIT-ACCURACY-01: splash, procs, chains and minions pass countsAsShotHit === false, so hitsLanded stays one per fired shot.
    if(sourceTower.telemetry && countsAsShotHit !== false) sourceTower.telemetry.hitsLanded++;
  }
  applySizeTier(sizeTier, sizeJitter, hpScale){
    const band = SIZE_TIER_BANDS[sizeTier];
    const def = CONFIG.ENEMIES[this.type];
    const familySpeedRank = clampNum((def.speed - ENEMY_FAMILY_SPEED_MIN) / (ENEMY_FAMILY_SPEED_MAX - ENEMY_FAMILY_SPEED_MIN), 0, 1);
    const sizeRank = clampNum(sizeJitter, 0, 1);
    this.sizeTier = sizeTier;
    this.isMini = sizeTier === 'TINY';
    this.isBig = sizeTier === 'LARGE';
    const visualSizeRank = 0.5 + 0.5*Math.sign(sizeRank*2-1)*Math.pow(Math.abs(sizeRank*2-1),0.65); // ENEMY-SIZE-VARIETY-01: more visible extremes inside the existing tier.
    this.radius = band.radiusMin + visualSizeRank*(band.radiusMax-band.radiusMin);
    this.speed = (band.speedMin + familySpeedRank * (band.speedMax - band.speedMin)) * ENEMY_WALK_SPEED_SCALE; // ENEMY-PACE-01
    this.maxHp = enemyHealthAtWeight(this.type,this.weight,hpScale);
    this.hp = this.maxHp;
    this.bounty = Math.max(1, Math.round(def.bounty * band.bountyMult));
    this.footstepDist = this.footstepWeight === null ? Infinity : (this.radius * 17);
  }
  spawnSplitChildren(){
    this.hasSplit = true;
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
    const moveSpeed = this.tierWalkSpeed();
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
    const interval = hunter ? hunter.attackIntervalMs : (this.isBreakaway || this.isGuardian) ? ENEMY_MELEE_INTERVAL_MS : LOOSE_MELEE_INTERVAL_MS;
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
    const blocker = findTouchingBarricade(this);
    const t = (blocker && blocker.active && blocker.hp > 0) ? blocker : this.breakawayTarget;
    if(!t || !t.active || t.disabledWavesLeft > 0){ this.endBreakaway(); return; }
    if(!this.closeOnAttackTarget(t, this.tierWalkSpeed(), dt)) return;
    this.breakAttackTimer -= dt;
    if(this.breakAttackTimer > 0) return;
    this.breakAttackTimer = ENEMY_MELEE_INTERVAL_MS;
    const defeated = this.strikeTower(t);
    if(this.holyLifesteal){
      const healed = Math.min(this.maxHp - this.hp, Math.round(this.breakDamage*0.5));
      if(healed > 0) this.hp += healed;
      spawnFloatingText(this.x, this.y - this.radius - 10, '✝️ +'+healed, '#ffe9a8');
      spawnParticles(t.x, t.y, '#ffe9a8', 6);
    }
    if(defeated && t === this.breakawayTarget) this.endBreakaway();
  }
  // ENEMY-ENGAGE-01: walks to its surround slot beside the target (or within 26 px with no slot); true once it is pressed against the target and free to attack.
  closeOnAttackTarget(t, speed, dt){
    const surround = enemySurroundPoint(this,t);
    const dx = t.x + (surround ? surround.surroundX : 0) - this.x, dy = t.y + (surround ? surround.surroundY : 0) - this.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    if(dist > (surround ? 2 : 26)){
      this.attackBumpTarget = null; // still closing distance — not pressed against it yet
      moveAroundScenery(this, dx, dy, surround ? Math.min(speed, dist*1000/Math.max(1,dt)) : speed, dt);
      return false;
    }
    this.vx = 0; this.vy = 0;
    if(surround && surround.surroundWaiting){ this.attackBumpTarget = null; return false; }
    this.attackBumpTarget = t;
    this.bumpTime += dt;
    return true;
  }
  strikeTower(t){ return t.takeDamage(Math.max(1, Math.round(this.breakDamage * ENEMY_DAMAGE_SCALE * this.bossDamageMult())), this.statusOnTower, this); }
  endBreakaway(){
    this.isBreakaway = false;
    this.attackBumpTarget = null;
    this.breakawayDone = true; // won't try again this life — resumes its original path from here
  }
  reachEnd(){
    const livesBeforeEscape = lives;
    loseLife(1);
    if(lives < livesBeforeEscape) launchHeartHudFlights(this.x, this.y - this.radius - 10, 1, true); // HEART-BREAK-01: the life lost to an escape flies to the counter too
    playSound('threat', this.x, undefined, this.y);
    maybeShowFirstTimeAlert(FIRST_ESCAPE_SEEN_KEY, '🏃 An enemy escaped. It will attack your towers.', '#ff8a65');
    waveTelemetry.escaped++;
    waveTelemetry.loosePeak = Math.max(waveTelemetry.loosePeak, countLooseEnemies() + 1);
    this.escaped = true;
    logGameEvent(this.type + ' escaped the road at ' + Math.round(this.hp) + '/' + this.maxHp + ' HP; lives ' + lives);
    { const leakWitness = findNearestActiveTower(this.x, this.y, 260); if(leakWitness) requestStickmanBark(leakWitness, BARK_TIER_IMPORTANT, '💢', BARK_LINES.LEAK, 0, BARK_CHANCE.LEAK); }
    this.wanderRepickTimer = 0; // pick a wander heading on the very next tick instead of waiting out a leftover timer value
  }
  updateEscaped(dt){
    // LOOSE-DRAIN-01
    const looseDrain = advanceLooseDrain(this.looseDrainMs, waveIndex >= LOOSE_DRAIN_FIRST_WAVE ? dt : 0);
    this.looseDrainMs = looseDrain.remainingMs;
    for(let heartIndex=0; heartIndex<looseDrain.hearts && gameState === 'PLAYING'; heartIndex++){
      const livesBeforeDrain = lives;
      loseLife(1); // the change shows by the health counter (showLivesChange()), never on the enemy
      if(lives < livesBeforeDrain) launchHeartHudFlights(this.x, this.y - this.radius - 10, 1, true); // HEART-BREAK-01: the broken heart flies from its head to the counter
      waveTelemetry.looseDrainLives++;
    }
    // LOOSE-CONFINE-01
    if(!isLooseWalkableAt(this.x, this.y) && this.walkBackOntoRoute(dt)) return;
    const positionBeforeMoveX = this.x, positionBeforeMoveY = this.y;
    this.updateEscapedMovement(dt);
    if(gameState === 'PLAYING' && confineLooseEnemyToRoute(this, positionBeforeMoveX, positionBeforeMoveY) && this.escapedAttackTarget) this.escapedAttackTarget = null;
  }
  // ESCAPE-WALKBACK-01: an enemy that slips past the finish line stands just off the walkable area; it walks back onto the nearest route tile instead of jumping there.
  walkBackOntoRoute(dt){
    let nearestPoint = null, nearestDistance = Infinity;
    for(const point of waypointsPx){
      const distance = Math.hypot(point.x - this.x, point.y - this.y);
      if(distance < nearestDistance){ nearestDistance = distance; nearestPoint = point; }
    }
    if(!nearestPoint) return false;
    if(nearestDistance === 0) return false;
    if(nearestDistance > ESCAPE_WALKBACK_MAX_TILES * TILE_SIZE){ this.x = nearestPoint.x; this.y = nearestPoint.y; return false; }
    const stepPx = Math.min(nearestDistance, this.tierWalkSpeed() * enemyMoveMultiplier(this) * dt / 1000);
    this.x += (nearestPoint.x - this.x) / nearestDistance * stepPx;
    this.y += (nearestPoint.y - this.y) / nearestDistance * stepPx;
    return true;
  }
  bossDamageMult(){ return (this.type === 'BOSS' || this.type === 'SANTA') ? BOSS_ATTACK_MULT : 1; }
  looseSeparationHeading(heading){ // LOOSE-SEPARATION-01: escaped enemies steer apart instead of trailing each other in a line
    let pushX = 0, pushY = 0;
    for(const other of enemiesNear(this.x, this.y, LOOSE_SEPARATION_RANGE_PX)){
      if(other === this || !other.active || other.isLivestock || other.isHutBuilding) continue; // LOOSE-SEPARATION-01: steer clear of every enemy, escaped or still on the road
      const dx = this.x - other.x, dy = this.y - other.y, distance = Math.hypot(dx, dy) || 0.001, reach = this.radius + other.radius + LOOSE_SEPARATION_GAP_PX;
      if(distance >= reach) continue;
      const strength = (reach - distance) / reach;
      pushX += dx / distance * strength; pushY += dy / distance * strength;
    }
    if(!pushX && !pushY) return heading;
    return Math.atan2(Math.sin(heading) + pushY*LOOSE_SEPARATION_WEIGHT, Math.cos(heading) + pushX*LOOSE_SEPARATION_WEIGHT);
  }
  updateEscapedMovement(dt){
    this.attackBumpTarget = null; // recomputed fresh below every tick — never left stale if the target changes or drops
    if(this.escapedAttackTarget && this.escapedAttackTarget.active && !(this.escapedAttackTarget.disabledWavesLeft > 0)){
      const blocker = findTouchingBarricade(this);
      const t = (blocker && blocker.active && blocker.hp > 0) ? blocker : this.escapedAttackTarget;
      if(this.closeOnAttackTarget(t, this.tierWalkSpeed()*0.7, dt)){
        this.escapedAttackTimer -= dt;
        if(this.escapedAttackTimer <= 0){
          this.escapedAttackTimer = LOOSE_MELEE_INTERVAL_MS;
          if(this.strikeTower(t) && t === this.escapedAttackTarget){ this.escapedAttackTarget = null; this.attackBumpTarget = null; }
        }
      }
      return; // skip the aimless-wander movement below while actively engaging a tower
    }
    this.escapedAttackCheckTimer -= dt; // LOOSE-ROAM-01: roam the open ground until a stickman is in contact range
    if(this.escapedAttackCheckTimer <= 0){
      const isBossType = this.bossDamageMult() > 1;
      this.escapedAttackCheckTimer = isBossType ? 400 : 250;
      const contactTarget = findNearestActiveTower(this.x, this.y, isBossType ? BOSS_AGGRO_RADIUS : LOOSE_CONTACT_RADIUS_TILES*TILE_SIZE);
      if(contactTarget){ this.escapedAttackTarget = contactTarget; this.escapedAttackTimer = 0; return; }
    }
    let heading = (this.wanderVx || this.wanderVy) ? Math.atan2(this.wanderVy, this.wanderVx) : Math.random()*Math.PI*2;
    this.wanderRepickTimer -= dt;
    if(this.wanderGoalActive && Math.hypot(this.wanderGoalX - this.x, this.wanderGoalY - this.y) < LOOSE_WANDER_GOAL_REACHED_PX) this.wanderGoalActive = false;
    if(!this.wanderGoalActive || this.wanderRepickTimer <= 0){
      this.wanderRepickTimer = LOOSE_WANDER_COMMIT_MIN_MS + Math.random()*LOOSE_WANDER_COMMIT_SPREAD_MS;
      const goal = pickLooseRoamGoal(this.x, this.y, heading);
      this.wanderGoalActive = !!goal;
      if(goal){ this.wanderGoalX = goal.x; this.wanderGoalY = goal.y; }
    }
    if(this.wanderGoalActive){
      let headingError = Math.atan2(this.wanderGoalY - this.y, this.wanderGoalX - this.x) - heading;
      headingError = Math.atan2(Math.sin(headingError), Math.cos(headingError));
      const maxTurn = LOOSE_WANDER_STEER_RAD_PER_S * dt / 1000;
      heading += clampNum(headingError, -maxTurn, maxTurn);
    }
    heading = this.looseSeparationHeading(heading);
    const strollSpeed = this.tierWalkSpeed() * LOOSE_WANDER_EXPLORE_SPEED;
    heading = moveAroundScenery(this, Math.cos(heading), Math.sin(heading), strollSpeed, dt, true);
    this.wanderVx = Math.cos(heading) * strollSpeed;
    this.wanderVy = Math.sin(heading) * strollSpeed;
  }
  updateGuardian(dt){
    this.attackBumpTarget = null;
    const hut = this.hutRef;
    const leader = (hut && hut.active) ? campLeaderTower(hut) : null;
    const guardRadius = 42; // idle leash — tight, reads as "guarding," not patrolling
    if(leader){
      const distFromHut = Math.hypot(this.x - this.hutAnchorX, this.y - this.hutAnchorY);
      if(distFromHut <= GUARDIAN_COMBAT_LEASH){
        this.guardianReturning = false;
        const surround = enemySurroundPoint(this,leader);
        const dx = leader.x + (surround ? surround.surroundX : 0) - this.x, dy = leader.y + (surround ? surround.surroundY : 0) - this.y;
        const dist = Math.hypot(dx,dy) || 0.0001;
        const engageRange = surround ? 2 : 26; // same engage range updateBreakaway() uses against a tower
        if(dist > engageRange){
          const moveSpeed = surround ? Math.min(this.tierWalkSpeed(),dist*1000/Math.max(1,dt)) : this.tierWalkSpeed();
          this.vx = dx/dist*moveSpeed; this.vy = dy/dist*moveSpeed;
          this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
        } else {
          this.vx = 0; this.vy = 0;
          if(surround && surround.surroundWaiting){ this.attackBumpTarget = null; return; }
          this.attackBumpTarget = leader;
          this.guardAttackTimer = (this.guardAttackTimer||0) - dt;
          if(this.guardAttackTimer <= 0){
            this.guardAttackTimer = ENEMY_MELEE_INTERVAL_MS;
            this.strikeTower(leader);
          }
        }
        return;
      }
      // Beyond the combat leash — disengage and walk home below, same as "no target."
    }
    const homeDx = this.hutAnchorX - this.x, homeDy = this.hutAnchorY - this.y;
    const homeDist = Math.hypot(homeDx, homeDy);
    if(homeDist > guardRadius){
      this.guardianReturning = true;
      const returnSpeed = this.tierWalkSpeed() * 0.6;
      this.vx = homeDx/homeDist*returnSpeed; this.vy = homeDy/homeDist*returnSpeed;
      this.x += this.vx*dt/1000; this.y += this.vy*dt/1000;
      return;
    }
    this.guardianReturning = false;
    this.wanderRepickTimer -= dt;
    if(this.wanderRepickTimer <= 0){
      this.wanderRepickTimer = 900 + Math.random()*1400;
      const ang = Math.random()*Math.PI*2;
      const bumbleSpeed = this.tierWalkSpeed() * 0.32; // slow, tight bumble — reads as "guarding," not patrolling
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
  updateHutBuilding(dt){
    if(this.destroyed) return; // dead structures don't respawn anything — see die()'s isHutBuilding branch, which sets this permanently
    if(this.guardiansAliveCount > 0 || !this.respawnAt) return; // lane isn't clear yet, or no respawn currently scheduled
    if(gameTime < this.respawnAt) return;
    this.respawnAt = null;
    spawnCampGuardianPair(this);
  }
  applyDamage(amount, sourceTower, forStreak, isHoly, allowBleed, countsAsShotHit, ignoreArmor, bloodImpactAngle, bloodProfileKey){
    if(!this.active || this.deathResolved) return;
    this.damageHitCount = (this.damageHitCount || 0) + 1;
    const isGraveTarget = (this.isHutBuilding && this.buildingKind === 'GRAVE') || (this.isGuardian && this.hutRef && this.hutRef.buildingKind === 'GRAVE');
    if(isGraveTarget && !isHoly) amount = Math.max(1, Math.round(amount * 0.05));
    this.recordContribution(sourceTower, amount, countsAsShotHit);
    const effectiveVarianceHalfWidth = damageSpreadHalfWidth(sourceTower);
    const damageVariance = (1 - effectiveVarianceHalfWidth) + Math.random()*(effectiveVarianceHalfWidth*2);
    let dmg = Math.max(1, Math.round(amount * damageVariance));
    const isCritical = sourceTower ? prdRollFires(sourceTower.critChance, sourceTower, 'critLuckBalance') : Math.random() < 0.025;
    if(isCritical) dmg = Math.round(dmg * (sourceTower ? sourceTower.critMult : 1.2));
    // Cleric's direct smite opts into armor bypass. Keep it explicit so Paladin's holy swings
    // retain their established armor interaction.
    const holyBonus = (isHoly && this.isUndead);
    if(holyBonus) dmg = Math.round(dmg * HOLY_VS_UNDEAD_MULT);
    if(this.frozenUntil > gameTime) dmg = Math.round(dmg * FROZEN_DAMAGE_MULT); // ICE-BLOCK-01 shatter bonus
    if(this.armor && !ignoreArmor) dmg = Math.max(1, dmg - this.armor, dmg * ARMOR_MIN_DAMAGE_SHARE); // ARMOR-FLOOR-01
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
    if(sourceTower && (this.isGuardian || this.isHutBuilding)){
      const hut = this.isHutBuilding ? this : this.hutRef;
      if(hut && hut.active){
        if(!hut.campDamageLedger) hut.campDamageLedger = new Map();
        const counted = Math.min(dmg, this.hp);
        hut.campDamageLedger.set(sourceTower, (hut.campDamageLedger.get(sourceTower) || 0) + counted);
      }
    }
    this.hp -= dmg;
    if(countsAsShotHit !== false || bloodProfileKey) spawnWeaponBloodContact(this, sourceTower, bloodImpactAngle, bloodProfileKey); // SWORD-BLOOD-ARC-01: outside generic spray chance, after shield absorption
    this.flashTimer = 120;
    const flinchSeverity = clampNum(dmg / this.maxHp, 0, 1);
    const hitRoll = damageVariance;
    const dmgRollT = clampNum((hitRoll - (1-effectiveVarianceHalfWidth)) / (effectiveVarianceHalfWidth*2), 0, 1);
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
    // PERF-DEATH-01: hit splashes thin to 15% on Low graphics, under heavy load and while panning at 5x or faster; death bursts keep their own budget.
    if(this.isHutBuilding){
      if(Math.random() < 0.15) spawnBarricadeDebris(this);
    } else if(goreMode && Math.random() < BLOOD_ON_HIT_CHANCE * ((graphicsQuality === 'low' || underHeavyVisualLoad || (gameSpeed >= 5 && performance.now()-lastCameraInteractionAt < CAMERA_MOTION_FULL_RATE_MS)) ? 0.15 : 1)){
      const bio = this.bloodProfile || getBloodProfile(this.type);
      const viscFriction = bio.viscous ? 0.88 : 0.93; // thicker fluids decelerate faster, don't travel as far
      const arch = resolveGoreArchetype(sourceTower);
      const impactAngle = weaponBloodAngle(this, sourceTower, bloodImpactAngle);
      const NORMAL_HIT_CEILING = 0.55;
      let bloodScaleT = Math.pow(Math.random(), 3) * NORMAL_HIT_CEILING;
      const canSplatterBig = this.sizeTier === 'LARGE' || this.sizeTier === 'BOSS';
      if(isCritical){
        const critCeiling = canSplatterBig ? 1 : NORMAL_HIT_CEILING + (1-NORMAL_HIT_CEILING)*0.4;
        bloodScaleT = Math.max(bloodScaleT, NORMAL_HIT_CEILING + Math.pow(Math.random(), 0.6) * (critCeiling - NORMAL_HIT_CEILING));
      }
      const hpFrac = Math.max(0.15, this.hp / this.maxHp);
      if(!this.recentAttackers) this.recentAttackers = new Map();
      if(sourceTower) this.recentAttackers.set(sourceTower, gameTime);
      for(const [tw, t] of this.recentAttackers){ if(gameTime - t > 400) this.recentAttackers.delete(tw); }
      const concurrentAttackers = Math.max(1, this.recentAttackers.size);
      const hitPower = (0.15 + bloodScaleT * 1.85) * (0.7 + flinchSeverity*0.5) * (0.9 + hitRoll*0.15) * hpFrac / concurrentAttackers;
      const bloodWeightScale = bloodPoolSizeScale(this.radius);
      const weapon = resolveWeaponSubtype(sourceTower);
      spawnForensicSpatter(this.x, this.y, bio, sourceTower, hitPower, false, 1, graphicsQuality === 'low' || underHeavyVisualLoad, this, bloodImpactAngle, bloodProfileKey);
      if(bio.isDust){
        spawnParticles(this.x, this.y, bio.bright, 8, 200, undefined, undefined, undefined, undefined, undefined, !bio.isDust); // rock chips, no liquid streams or pooling
        if(Math.random() < 0.1) spawnRockChips(this.x, this.y, this.radius, 1); // 1-in-10 chance per hit — a visible chip, not just dust
      } else if(arch === 'ARCHER'){
        spawnParticles(this.x, this.y, bio.spray, Math.max(2, Math.round(6*hitPower)), 60, 0.94, true, impactAngle, 0.5, undefined, !bio.isDust);
        spawnParticles(this.x, this.y, bio.spray, Math.max(1, Math.round(2*hitPower)), 50, 0.92, true, impactAngle + Math.PI, 0.55, undefined, !bio.isDust);
        if(Math.random() < 0.7) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6), undefined, this);
        if(!bio.isDust){
          spawnPunctureMark(this.x, this.y);
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.55), Math.max(1, Math.round((2 + Math.floor(Math.random()*2))*hitPower)), impactAngle, 2.4, this); // several fine mist droplets flung well past the wound, not just one
          if(Math.random() < 0.4) spawnBloodCastoff(this.x, this.y, impactAngle, hexToRgba(bio.dark, 0.5), undefined, 0.8 * bloodWeightScale, this); // an occasional short, thin graze streak — small, but adds to the visible mark count
        }
      } else if(arch === 'MAGE'){
        // MAGE-BLOOD-RANGE-01 — independent weight-scaled streak length and width; shared blocker interception.
        const mageConeWidth = 2.3; // ~132° — wide enough to read as a blast, not a pinpoint beam
        const mageBurstMult = isCritical ? 1.4 : 1;
        spawnParticles(this.x, this.y, bio.bright, Math.round(6*hitPower*mageBurstMult*bloodWeightScale), 420, 0.88, true, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
        spawnParticles(this.x, this.y, bio.spray, Math.round(4*hitPower*mageBurstMult*bloodWeightScale), 460, 0.86, true, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
        if(!bio.isDust){
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), Math.max(2, Math.round((9 + Math.floor(Math.random()*4))*hitPower)), impactAngle, 1.6, this);
          const mageRollT = clampNum((damageVariance - 0.6) / 0.8, 0, 1); // 0 at the Mage's lowest roll (0.6x), 1 at its highest (1.4x)
          const sprayVolumeRoll = Math.random();
          const sprayVolume = sprayVolumeRoll < 0.55 ? 0.5 : sprayVolumeRoll < 0.9 ? 1 : 1.5;
          const streakCount = Math.max(1, Math.round((1 + mageRollT * 3) * sprayVolume));
          for(let s=0; s<streakCount; s++){
            const streakAngle = impactAngle + (Math.random()-0.5)*mageConeWidth;
            spawnBloodCastoff(this.x, this.y, streakAngle, hexToRgba(bio.dark, 0.6 + Math.random()*0.15), undefined, (0.25 + Math.pow(Math.random(),2)*1.55) * bloodWeightScale, this, (0.25 + Math.random()*0.55)*bloodWeightScale);
          }
        }
        spawnParticles(this.x, this.y, bio.spray, Math.max(2, Math.round(8*hitPower)), 180, 0.85, true, impactAngle + Math.PI, 0.6, undefined, !bio.isDust);
        if(!bio.isDust) spawnParticles(this.x, this.y, '#c9a8ff', Math.max(2, Math.round(6*hitPower)), 300, 0.87, false, impactAngle, mageConeWidth);
      } else if(arch === 'EXPLOSIVE'){
        spawnParticles(this.x, this.y, bio.bright, Math.round(10*hitPower), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
        spawnParticles(this.x, this.y, bio.dark, Math.max(2, Math.round(6*hitPower)), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
        spawnParticles(this.x, this.y, '#8a8a8a', Math.max(1, Math.round(5*hitPower)), 140, 0.9, false);
      } else {
        if(weapon === 'BLUNT'){
          spawnParticles(this.x, this.y, bio.bright, Math.round(16*hitPower), 170, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          spawnParticles(this.x, this.y, bio.dark, Math.max(2, Math.round(6*hitPower)), 170, 0.9, true, undefined, undefined, undefined, !bio.isDust);
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.65), Math.max(1, Math.round((2 + Math.floor(Math.random()*2))*hitPower)), undefined, undefined, this);
          spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.5), (18 + Math.random()*8) * (0.85 + hitPower*0.2) * bloodWeightScale, impactAngle, Math.PI*1.15);
          if(flinchSeverity > 0.55) spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.4), (9 + Math.random()*4) * (0.9 + hitPower*0.15) * bloodWeightScale, impactAngle, Math.PI*0.8);
          if(Math.random() < 0.3) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.55), undefined, this);
        } else if(weapon === 'PIERCE'){
          spawnParticles(this.x, this.y, bio.bright, Math.max(2, Math.round(10*hitPower)), 240, viscFriction, true, impactAngle, 0.7, undefined, !bio.isDust);
          spawnBloodStream(this.x, this.y, impactAngle, Math.max(1, Math.round(3*hitPower)), 1.2, bio.bright, bio.dark, this);
          if(Math.random() < 0.6) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6), undefined, this);
          spawnDripTrail(this.x - Math.cos(impactAngle)*7, this.y - Math.sin(impactAngle)*7, hexToRgba(bio.dark, 0.5), undefined, this);
        } else {
          const slashAngle = impactAngle + Math.PI/2 + (Math.random()-0.5)*0.5;
          const firstBlood = sourceTower && !sourceTower.weaponBloodied;
          if(sourceTower) sourceTower.weaponBloodied = true;
          const bloodedMult = firstBlood ? 0.22 : 1;
          const cutSize = (0.4 + flinchSeverity*1.7) * bloodedMult * (0.35 + bloodScaleT * 1.5) * hpFrac / concurrentAttackers;
          const cutColor = shiftHexColor(bio.dark, (Math.random()-0.5)*8, (Math.random()-0.5)*6);
          spawnParticles(this.x, this.y, bio.bright, Math.max(2, Math.round(12*hitPower)), 200, viscFriction, true, undefined, undefined, undefined, !bio.isDust);
          spawnBloodCastoff(this.x, this.y, slashAngle, hexToRgba(cutColor, 0.7), undefined, cutSize * bloodWeightScale, this);
          if(sourceTower && graphicsQuality !== 'low'){
            spawnSwingArcGuide(this.x, this.y, slashAngle, towerSwingDir(sourceTower), this.radius + 14);
          }
          if(!firstBlood){
            if(sourceTower && sourceTower.type === 'AXEMAN'){
              spawnCastOffArc(this.x, this.y, slashAngle + Math.PI + (Math.random()-0.5)*0.3, hexToRgba(cutColor, 0.65), undefined, towerSwingDir(sourceTower), this);
              if(Math.random() < 0.6){
                spawnCastOffArc(this.x, this.y, slashAngle + Math.PI + (Math.random()-0.5)*0.9, hexToRgba(bio.dark, 0.55), 2 + Math.floor(Math.random()*2), -towerSwingDir(sourceTower), this);
              }
            } else if(!sourceTower || sourceTower.type !== 'SWORDSMAN'){
              spawnCastOffArc(this.x, this.y, slashAngle + Math.PI, hexToRgba(cutColor, 0.65), undefined, sourceTower ? towerSwingDir(sourceTower) : undefined, this);
            }
          }
          if(Math.random() < 0.4) spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.6), undefined, this);
          if(flinchSeverity > 0.6){
            const spurtAngle = slashAngle + (Math.random()<0.5 ? Math.PI/2 : -Math.PI/2);
            spawnBloodStream(this.x, this.y, spurtAngle, 1, 0.7, bio.bright, bio.dark, this);
          }
        }
      }
      const decalArch = arch === 'WARRIOR' ? weapon : arch;
      if(!bio.isDust) playImpactSound(decalArch, this.x, hitPower, isCritical, sourceTower ? sourceTower.id : undefined, this.y);
      const markChance = (arch === 'ARCHER' || arch === 'MAGE') ? 0.5 : 0.3;
      if(!bio.isDust && this.hp > 0 && Math.random() < markChance){
        spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), 0.5), true, impactAngle, decalArch, bio.viscous, dmgRollT, bloodPoolSizeScale(this.radius), this);
      }
      const severity = dmg / this.maxHp;
      if(!bio.isDust && this.hp > 0 && severity > 0.08){
        startDripSite(this.x, this.y, hexToRgba(bio.dark, 0.65), severity);
      }
      if(!bio.isDust && this.hp > 0 && severity > 0.15 && Math.random() < 0.3){
        spawnDripTrail(this.x, this.y, hexToRgba(bio.dark, 0.62), undefined, this);
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
    if((this.type === 'BOSS' || this.type === 'SANTA') && sourceTower){
      grantTowerMove(sourceTower, 'boss kill');
      requestStickmanBark(sourceTower, BARK_TIER_IMPORTANT, '😎', BARK_LINES.BOSS_KILL, 0, BARK_CHANCE.BOSS_KILL);
    }
    if(this.type === 'TROLL' && !this.escaped){ for(let b=0; b<2; b++) dropGoldBag(this.x + (b*2-1)*10, this.y); }
    else if(Math.random() < 0.15 && !this.escaped){
      const coin = acquireCoinSlot();
      launchCoin(coin, this.x, this.y);
      coin.value = 1 + Math.floor(Math.random()*3);
    }
    const explodesInGore = goreMode && this.damageHitCount === 1 && !!sourceTower && !this.isHutBuilding && !(this.bloodProfile || getBloodProfile(this.type)).isDust && Math.random() < GORE_EXPLOSION_CHANCE; // GORE-EXPLOSION-01
    if(!explodesInGore) spawnDeathAnim(this.x, this.y, this.emoji, this.radius); // brief squash-and-fade in place of an instant vanish
    this.active = false;
    if(this.escaped && waveState==='IDLE' && gameState==='PLAYING' && countLooseEnemies()===0) playSound('wave_clear');
    if(this.isStealthSanta){ stealthSantaDefeated=true; unlockTowerTypeBuild('NINJA'); }
    if(this.isGuardian && this.hutRef && this.hutRef.active){
      this.hutRef.guardiansAliveCount = Math.max(0, this.hutRef.guardiansAliveCount - 1);
      if(this.hutRef.guardiansAliveCount === 0 && !this.hutRef.destroyed){
        this.hutRef.respawnAt = gameTime + 60000; // a hut respawns its occupant after a fixed 60 s
      }
    }
    if(this.isHutBuilding){
      this.destroyed = true;
      this.respawnAt = null;
      spawnFloatingText(this.x, this.y - this.radius - 24, this.buildingKind === 'CIRCUS' ? 'Circus closed!' : 'Camp cleared!', '#ffd23f');
      spawnHutLootChest(this.x, this.y);
    }
    const bountyMult = this.escaped ? ESCAPED_CLEANUP_FRACTION : 1; // LUCK-REMOVED-01
    const bountyGold = Math.round(this.bounty * bountyMult);
    if(this.type === 'TANK'){
      const bountyStone = Math.round(14 * bountyMult);
      stone += bountyStone;
      spawnFloatingText(this.x, this.y - this.radius - 20, '+' + bountyStone + '🪨', '#bdbdbd');
    } else if(this.sizeTier === 'LARGE' && !this.escaped && bountyGold >= 2){
      // LARGE-BAGS-01
      dropGoldBag(this.x, this.y, bountyGold);
    } else {
      gold += bountyGold;
    }
    dropItemsFromEnemy(this);
    if(this.type === 'BOSS' || this.type === 'SANTA') dropTreatFromBoss(this);
    // PERF-DEATH-01: Low graphics and crowded battles take the lighter death-effect path.
    const low = graphicsQuality === 'low' || underHeavyVisualLoad;
    const proximityT = clampNum(this.traveled / (routeTotalLength() || 1), 0, 1); // 0 at spawn, 1 at the finish line
    let proximityMult = 1;
    if(proximityT > 0.75 && Math.random() < 0.25) proximityMult = 1.12; // close to the finish — slight chance of bigger
    else if(proximityT < 0.25 && Math.random() < 0.35) proximityMult = 0.88; // still near spawn — slight pull toward smaller
    const bloodWeightScale = bloodPoolSizeScale(this.radius); // BLOOD-WEIGHT-01
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
          spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 2 : 5)*goreScale), 90, 0.94, !low, undefined, undefined, undefined, !bio.isDust);
          if(!low) spawnParticles(this.x, this.y, bio.bright, Math.max(1, Math.round(2*goreScale)), 80, 0.92, false, impactAngle + Math.PI, 0.55, undefined, !bio.isDust); // back-spatter, same asymmetric treatment as the hit-time branch above
          if(!bio.noArterial){
            for(let d=0; d<Math.round(3*goreScale); d++){
              spawnDripTrail(this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*7, hexToRgba(bio.dark, 0.6), undefined, this);
            }
            if(!low) spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.5), 2 + Math.floor(Math.random()*2), impactAngle, 2.6, this);
          }
          spawnGibs(this.x, this.y, Math.max(1, Math.round(1*goreScale)));
        } else if(arch === 'MAGE'){
          const mageConeWidth = 2.3;
          spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 8 : 18)*goreScale), 400, viscFriction, !low, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
          spawnParticles(this.x, this.y, bio.spray, Math.round((low ? 5 : 10)*goreScale), 440, viscFriction, !low, impactAngle, mageConeWidth, 0.7*bloodWeightScale, !bio.isDust);
          if(!low){
            spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.7), 8 + Math.floor(Math.random()*4), impactAngle, 1.6, this);
            const streakCount = Math.max(1,Math.round((3 + Math.floor(Math.random()*4))*goreScale));
            for(let s=0; s<streakCount; s++){
              const streakAngle = impactAngle + (Math.random()-0.5)*mageConeWidth;
              spawnBloodCastoff(this.x, this.y, streakAngle, hexToRgba(bio.dark, 0.6), undefined, (0.25 + Math.pow(Math.random(),2)*1.55) * bloodWeightScale, this, (0.25 + Math.random()*0.55)*bloodWeightScale);
            }
          }
          spawnGibs(this.x, this.y, Math.max(2, Math.round(3*goreScale)));
        } else {
          const weapon = resolveWeaponSubtype(sourceTower);
          if(weapon === 'BLUNT'){
            spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 7 : 16)*goreScale), 210, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            spawnParticles(this.x, this.y, bio.dark, Math.round((low ? 5 : 9)*goreScale), 210, viscFriction, !low, undefined, undefined, undefined, !bio.isDust);
            if(!low){
              spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.65), 3 + Math.floor(Math.random()*2), undefined, undefined, this);
              spawnShockring(this.x, this.y, hexToRgba(bio.dark, 0.5), (22 + Math.random()*9) * bloodWeightScale, impactAngle, Math.PI*1.15);
            }
            spawnGibs(this.x, this.y, Math.max(2, Math.round(3*goreScale))); // a crushing kill scatters more debris than a clean cut
          } else if(weapon === 'PIERCE'){
            spawnParticles(this.x, this.y, bio.bright, Math.round((low ? 4 : 9)*goreScale), 240, viscFriction, !low, impactAngle, 0.8, undefined, !bio.isDust);
            if(!bio.noArterial){
              const gushCount = Math.max(2, Math.round(4*goreScale));
              for(let g=0; g<gushCount; g++){
                spawnBloodStream(this.x, this.y, impactAngle + (Math.random()-0.5)*0.3, low ? 1 : 2, 1.9 + Math.random()*0.9, bio.bright, bio.dark, this);
              }
            }
            spawnGibs(this.x, this.y, Math.max(1, Math.round(2*goreScale)));
          } else {
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
        if(!low && !bio.isDust && !bio.noArterial && Math.random() < 0.15){
          spawnExpiratedMist(this.x, this.y);
        }
        if(!low && !bio.isDust){
          spawnParticles(this.x, this.y, bio.spray, Math.max(3, Math.round(9*goreScale)), 130, 0.9, false, undefined, undefined, 0.5, !bio.isDust);
        }
        if(!bio.isDust && Math.random() < BONE_DROP_CHANCE) spawnBoneDebris(this.x, this.y, this.radius);
        if(!bio.isDust && Math.random() < 0.08 + this.radius/200) spawnSkullDrop(this.x, this.y, this.radius); // bigger enemies leave a skull more often: about 12% at radius 9, 16% at 15, 19% at 22
        if(Math.random() < 0.55){
          const decalArch = arch === 'WARRIOR' ? resolveWeaponSubtype(sourceTower) : arch;
          spawnDecal(this.x, this.y, hexToRgba(bloodTintForFire(this, bio.dark), low ? 0.6 : 0.75), false, impactAngle, decalArch, bio.viscous, undefined, bloodPoolSizeScale(this.radius), this);
        }
        if(!low){
          spawnSatelliteDrops(this.x, this.y, hexToRgba(bio.dark, 0.75), 2 + Math.floor(Math.random()*3), undefined, undefined, this);
          startDripSite(this.x, this.y, hexToRgba(bio.dark, 0.7));
          if(Math.random() < 0.7){
            spawnDripTrail(this.x + (Math.random()-0.5)*8, this.y + (Math.random()-0.5)*5, hexToRgba(bio.dark, 0.6), undefined, this);
          }
        }
        if(!low && sourceTower && sourceTower.type !== 'SWORDSMAN' && arch !== 'EXPLOSIVE' && Math.random() < 0.5){
          const castoffAngle = Math.atan2(this.y - sourceTower.y, this.x - sourceTower.x);
          if(arch === 'WARRIOR' && resolveWeaponSubtype(sourceTower) === 'BLADE'){
            spawnCastOffArc(this.x, this.y, castoffAngle, hexToRgba(bio.dark, 0.6), undefined, towerSwingDir(sourceTower), this);
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
    playSound('gore_death', this.x, goreScale, this.y);
    updateHUD();
    const deathElapsedMs = performance.now() - deathStartedAt;
    enemyDeathTiming.count++;
    enemyDeathTiming.totalMs += deathElapsedMs;
    enemyDeathTiming.maxMs = Math.max(enemyDeathTiming.maxMs, deathElapsedMs);
    if(deathElapsedMs >= 8) enemyDeathTiming.over8ms++;
  }
  drawAngryBrows(ctx){
    ctx.strokeStyle = '#b92320'; ctx.lineWidth = Math.max(1.5, this.radius*0.11); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-this.radius*0.55, -this.radius*0.34); ctx.lineTo(-this.radius*0.12, -this.radius*0.17);
    ctx.moveTo(this.radius*0.55, -this.radius*0.34); ctx.lineTo(this.radius*0.12, -this.radius*0.17);
    ctx.stroke();
  }
  // STUCK-BATCH-01: plain arrows share one shaft path and one head path per enemy; other projectiles get their own transform.
  drawStuckProjectiles(ctx, baseX, baseY){
    let hasSpecialStuck = false, hasPlainStuck = false;
    for(const stuck of this.embeddedArrows){
      if(!isPlainStuckArrow(stuck)){ hasSpecialStuck = true; continue; }
      hasPlainStuck = true;
      if(stuck.cos === undefined){ stuck.cos = Math.cos(stuck.angle); stuck.sin = Math.sin(stuck.angle); }
    }
    if(hasPlainStuck){
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath();
      for(const stuck of this.embeddedArrows){
        if(!isPlainStuckArrow(stuck)) continue;
        const originX = baseX + stuck.dx, originY = baseY + stuck.dy;
        ctx.moveTo(originX - 8*stuck.cos, originY - 8*stuck.sin); ctx.lineTo(originX + 2*stuck.cos, originY + 2*stuck.sin);
      }
      ctx.stroke();
      ctx.fillStyle = '#3a2410'; ctx.beginPath();
      for(const stuck of this.embeddedArrows){
        if(!isPlainStuckArrow(stuck)) continue;
        const originX = baseX + stuck.dx, originY = baseY + stuck.dy, cos = stuck.cos, sin = stuck.sin;
        ctx.moveTo(originX + 2*cos, originY + 2*sin);
        ctx.lineTo(originX - 2*cos + 2.5*sin, originY - 2*sin - 2.5*cos);
        ctx.lineTo(originX - 2*cos - 2.5*sin, originY - 2*sin + 2.5*cos);
        ctx.closePath();
      }
      ctx.fill();
    }
    if(!hasSpecialStuck) return;
    ctx.save();
    ctx.translate(baseX, baseY);
    for(const stuck of this.embeddedArrows){
      if(isPlainStuckArrow(stuck)) continue;
      ctx.save();
      ctx.translate(stuck.dx, stuck.dy);
      ctx.rotate(stuck.angle);
      drawStuckProjectileShape(ctx, stuck.kind);
      ctx.restore();
    }
    ctx.restore();
  }
  draw(ctx){
    ctx.save();
    ctx.globalAlpha = 1.0;
    if(this.escaped && !this.isLivestock && !this.isGuardian && !this.isHutBuilding){
      // LOOSE-GLOW-01: a loose enemy sits in a soft, gently pulsing red glow with no outline; the enemy itself is always fully drawn.
      const glowPulse = 0.5 + 0.5*Math.sin(presentationTime/500), looseGlow = looseEnemyGlowSprite(this.radius, glowPulse);
      ctx.drawImage(looseGlow.canvas, this.x - looseGlow.radius, this.y - looseGlow.radius); // LOOSE-GLOW-CACHE-01
    }
    // PERF-02: under heavy visual load the translucent status tints are skipped; the status icons always draw.
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
      const pulse = Math.sin(presentationTime/300)*2;
      ctx.strokeStyle = 'rgba(124,252,124,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius*1.15+pulse, 0, Math.PI*2); ctx.stroke();
    }
    if(this.isHutBuilding && this.hp < this.maxHp){
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
      // ENEMY-HEADBUTT-01: one wind-up/headbutt/recoil pose for barricades and stickmen.
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
    const flinchElapsed = realTime - this.flinchStart;
    if(flinchElapsed < this.flinchDuration){
      const flinchT = 1 - flinchElapsed/this.flinchDuration;
      bumpDx += Math.cos(this.flinchAngle) * this.flinchMag * flinchT;
      bumpDy += Math.sin(this.flinchAngle) * this.flinchMag * flinchT;
    }
    ctx.save();
    const isStriding = !this.isLivestock && speed > 5 && !isFastForwardSimplified() && !PREFERS_REDUCED_MOTION;
    const strideDistance=Number.isFinite(this.renderPrevTraveled) && gameState==='PLAYING' ? this.renderPrevTraveled+(this.traveled-this.renderPrevTraveled)*Math.min(1,accumulator/FIXED_DT) : this.traveled;
    const strideAngle = strideDistance / Math.max(4, this.radius*ENEMY_STRIDE_LENGTH_PER_RADIUS) + this.id*1.3; // ENEMY-STRIDE-01 — distance-driven, so a slower enemy steps slower but always visibly steps
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
    const aggroAge = presentationTime - this.aggroStartedAt, aggroFresh = this.aggroStartedAt >= 0 && aggroAge >= 0 && aggroAge < ENEMY_AGGRO_POSE_MS;
    if(aggroFresh && !PREFERS_REDUCED_MOTION){
      const tension = Math.sin(Math.PI*aggroAge/ENEMY_AGGRO_POSE_MS);
      ctx.scale(1 + tension*0.08, 1 + tension*0.08);
      ctx.rotate(Math.sin(aggroAge/35)*tension*0.025);
    }
    drawEmojiSprite(ctx, this.emoji, this.radius*2);
    captureMarkedEmojiTop(ctx,this,this.radius*2);
    drawEmojiSurfaceBlood(ctx,this,this.radius*2);
    if(aggroFresh) this.drawAngryBrows(ctx);
    ctx.restore();
    if(this.isLivestock && !PREFERS_REDUCED_MOTION && !underHeavyVisualLoad) this.drawLivestockEmote(ctx);
    const showsAngerSteam = attackAnimating && !underHeavyVisualLoad && graphicsQuality !== 'low' && ((this.id*37 + Math.floor(gameTime/800)*17) % 100) < 25;
    if(showsAngerSteam && attackAngerPopScale(attackPhaseNow) > 0.02) drawAngerSteam(ctx, this.x + bumpDx, this.y + bumpDy, this.radius, attackPhaseNow); // NO-ATTACK-RING-01
    if(this.embeddedArrows && this.embeddedArrows.length) this.drawStuckProjectiles(ctx, this.x + bumpDx, this.y + bumpDy + walkBob);
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
const ENEMY_MASK_REF_SIZE = 40;
let enemyMaskCanvas = null, enemyMaskCtx = null;
const enemyCollisionMasks = {};
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
    return null;
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
  return mask.alpha[my*mask.size + mx] > 20;
}
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
let enemyHash = null;
/* =========================================================
   BOOT
   ========================================================= */
syncPrefsToDOM();
validateGameDefinitions();
for(const type in CONFIG.ENEMIES) getEnemyCollisionMask(type);
initRegionAndPath();
function refreshDesignContractProblems(){
  designContractProblems = validateDesignContract();
  if(designContractProblems.length) console.warn('validateDesignContract() found ' + designContractProblems.length + ' problem(s):\n' + designContractProblems.map(problem => '  - ' + problem).join('\n'));
}
refreshDesignContractProblems();
loadGameSourceText().then(() => { if(gameSourceText !== null) refreshDesignContractProblems(); });
generateFlora();
// CONTEXT-RESTORE-01: a phone can drop a canvas's drawing surface when memory is tight or the app is backgrounded, which blanks it.
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
resizeMapCanvasForDpr();
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
// BOOT-WARMUP-01
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
  // WARMUP-NEW-SPRITES-01: the structures, the caravan and floating numbers are drawn from sprite caches, so their sprites are built here instead of on first use in a wave
  for(const producerType of PRODUCER_TYPES) for(const [partEmoji, partSize] of PRODUCER_DEFS[producerType].parts) queueGlyph(partEmoji, partSize);
  queueGlyph('🪵', 16); queueGlyph('🎩', 15); queueGlyph('👟', 9);
  queueGlyph('🐪', 26); queueGlyph('👳', 15); queueGlyph('🛍️', 16);
  const sceneryDrawGlyphs = [...TREE_VARIANT_EMOJI, '🪨', '🪴', '📦', '🎁', '🥢', ...Object.values(EVENT_PROP_EMOJI)], scenerySizes = new Set();
  for(let scale = CONFIG.SCENERY.minScale; scale <= CONFIG.SCENERY.maxScale + 1e-6; scale += BOOT_SCENERY_SCALE_STEP) scenerySizes.add(Math.round(TILE_SIZE * 0.72 * scale));
  for(const sizePx of scenerySizes) for(const glyph of sceneryDrawGlyphs) queueGlyph(glyph, sizePx);
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
  // SCENERY-WARM-01: the map bakes scenery emoji at whole-pixel sizes between the smallest and largest scale; each is rasterized once here, not on the first bake.
  const sceneryScratch = document.createElement('canvas');
  sceneryScratch.width = sceneryScratch.height = BOOT_SCENERY_SCRATCH_PX;
  const sceneryScratchCtx = sceneryScratch.getContext('2d');
  sceneryScratchCtx.textAlign = 'center'; sceneryScratchCtx.textBaseline = 'middle';
  const sceneryGlyphs = [...sceneryDrawGlyphs, '💰', '💎'];
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
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const loadingScreen = document.getElementById('loading-screen');
    document.getElementById('game-wrapper').classList.add('loaded');
    loadingScreen.classList.add('done');
    setTimeout(() => { loadingScreen.hidden = true; }, BOOT_FADE_OUT_MS);
  }));
}
// AUDIO-GESTURE-01: a phone grants audio only on a finger lift (touchend, pointerup, click), so the unlock listeners stay until the audio context is actually running.
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
