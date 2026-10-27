"use strict";
// Blood, decals, forensic spatter, particles and gibs. Loaded after js/config.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   BLOOD, DECALS AND FORENSIC SPATTER
//   PARTICLES, MIST AND GIBS
//   FLOATING TEXT
//   COINS AND AMBIENT LOGS
//   HUD FLIGHTS (hearts and gold)
//   COIN COLLECTION, GOLD BAGS AND PICKUP DRAWING
/* =========================================================
   BLOOD, DECALS AND FORENSIC SPATTER
   ========================================================= */
const MAX_DECALS = 4200; // BLOOD-LAYER-01: high graphics holds 4200 decals (low holds 2100) so a wave's blood is never recycled
const MAX_DECALS_LOW_QUALITY = 700;
function decalCapacity(){
  if(Number.isFinite(decalBudgetOverride) && decalBudgetOverride >= 0) return Math.floor(decalBudgetOverride);
  return graphicsQuality === 'low' ? MAX_DECALS_LOW_QUALITY : MAX_DECALS;
}
const decals = [];
// Optional airborne spray lands in a separate short-lived budget, never evicting ground signatures.
const sprayDecals = [];
let sprayDecalIndex = 0;
function sprayDecalCapacity(){ return decalCapacity() === 0 ? 0 : (graphicsQuality === 'low' ? 80 : 240); }
function pushSprayDecal(decal){
  const capacity = sprayDecalCapacity();
  if(!goreMode || !bloodDropletsEnabled || capacity <= 0) return;
  if(decal.isDrop && decal.tailScale === undefined) applyStainSurface(decal, bloodSurfaceAt(decal.x, decal.y), decal.len*2/Math.max(0.1, decal.width));
  decal.lifespan = bloodMarkLifespan();
  if(waveState==='IDLE' && wavesCompleted>0){decal.cleanupStarted=true;decal.lifespan=18000;decal.spawnTime=presentationTime-12000;}
  if(sprayDecals.length < capacity) sprayDecals.push(decal);
  else { sprayDecalIndex %= capacity; sprayDecals[sprayDecalIndex] = decal; sprayDecalIndex = (sprayDecalIndex+1)%capacity; }
}
function maintainSprayDecals(){
  if(!goreMode || !bloodDropletsEnabled){ sprayDecals.length=0; sprayDecalIndex=0; return; }
  let write=0;
  for(let read=0;read<sprayDecals.length;read++) if(!sprayDecals[read].cleanupStarted || presentationTime-sprayDecals[read].spawnTime < sprayDecals[read].lifespan) sprayDecals[write++]=sprayDecals[read];
  sprayDecals.length=write;
  const capacity=sprayDecalCapacity();
  if(sprayDecals.length>capacity) sprayDecals.splice(0,sprayDecals.length-capacity);
  sprayDecalIndex=capacity ? sprayDecalIndex%capacity : 0;
}
function enforceDecalCapacity(){
  const capacity=decalCapacity();
  if(decals.length<=capacity) return;
  decals.sort((a,b)=>a.spawnTime-b.spawnTime);
  const removed=decals.splice(0,decals.length-capacity);
  if(removed.some(d=>d.baked)) settledDecalRebuildPending=true;
  decalIndex=capacity ? decalIndex%capacity : 0;
}
const depthSortedDecalsThisFrame = [];
let lastDecalExpirySweep = 0;
// The full expiry and settled-bake sweep runs every 2 s; visible decals still draw every frame and keep their exact lifetimes.
const DECAL_EXPIRY_SWEEP_INTERVAL = 2000;
let blowingLeaves = [], leafGustLastGameTime = null;
function spawnLeafGust(){
  if(blowingLeaves.length > 20) return;
  const count = 3 + Math.floor(Math.random()*3); // 3-5 leaves
  const glyph = wavesCompleted >= 20 ? '🍂' : '🍃'; // one glyph for the whole gust: autumn leaves from wave 20
  for(let i=0; i<count; i++){
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -30 : CANVAS_W + 30;
    const dirX = fromLeft ? 1 : -1;
    blowingLeaves.push({
      glyph,
      x: startX, y: 40 + Math.random()*(CANVAS_H*0.5),
      vx: dirX*(220 + Math.random()*140), vy: 30 + Math.random()*30,
      rot: Math.random()*360, rotSpeed: (Math.random()*2-1)*60, // deg/sec, gentle tumble
      swayAmp: 8 + Math.random()*14, swayFreq: 0.4 + Math.random()*0.6, swayPhase: Math.random()*Math.PI*2,
      size: 16 + Math.random()*9, // per-leaf size variance instead of one flat 20px for every leaf
      spawnedAt: gameTime + i*400 // staggered, not all at once
    });
  }
}
function updateAndDrawBlowingLeaves(ctx){
  if(gameState !== 'PLAYING') return;
  if(!blowingLeaves.length) return;
  const dtSec = Math.min(0.1, (gameTime - (leafGustLastGameTime ?? gameTime)) / 1000);
  leafGustLastGameTime = gameTime;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(let i=blowingLeaves.length-1; i>=0; i--){
    const leaf = blowingLeaves[i];
    if(gameTime < leaf.spawnedAt) continue; // staggered start
    leaf.x += leaf.vx*dtSec; leaf.y += leaf.vy*dtSec; leaf.rot += leaf.rotSpeed*dtSec;
    if(leaf.x < -50 || leaf.x > CANVAS_W+50 || leaf.y > CANVAS_H+50){ blowingLeaves.splice(i,1); continue; }
    const edgeFade = clampNum(Math.min(leaf.x-(-50), (CANVAS_W+50)-leaf.x, (CANVAS_H+50)-leaf.y)/55, 0, 1);
    ctx.globalAlpha = 0.75 * edgeFade;
    const swayX = Math.sin((gameTime-leaf.spawnedAt)/1000 * leaf.swayFreq*Math.PI*2 + leaf.swayPhase) * leaf.swayAmp;
    const scaleX = 0.4 + 0.6*Math.abs(Math.cos(leaf.rot*Math.PI/180*1.7));
    ctx.save();
    ctx.translate(leaf.x+swayX, leaf.y);
    ctx.rotate(leaf.rot*Math.PI/180);
    ctx.scale(scaleX, 1);
    ctx.font = leaf.size+'px serif';
    ctx.fillText(leaf.glyph, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
const deathAnims = []; // a corpse's brief squash-and-fade, kept apart from the enemy pool so the slot can be reused at once
const deathAnimPool = []; // PERF-DEATH-02: the small records are reused across death bursts
function spawnDeathAnim(x, y, emoji, radius){
  const anim = deathAnimPool.pop() || {};
  anim.x = x; anim.y = y; anim.emoji = emoji; anim.radius = radius;
  anim.startTime = presentationTime; anim.duration = 220;
  deathAnims.push(anim);
}
const BARRICADE_CHUNK_GRAVITY = 900;   // px/s^2
const BARRICADE_CHUNK_LIFE_MS = 1100;
const BARRICADE_RUBBLE_LIFESPAN = 90000;
const barricadeChunks = Array.from({ length: 64 }, () => ({ active:false }));
let barricadeChunkIndex = 0;
function spawnBarricadeChunk(x, y, isStone, awayAngle, leavesRubble = true){
  const chunk = barricadeChunks[barricadeChunkIndex];
  barricadeChunkIndex = (barricadeChunkIndex + 1) % barricadeChunks.length;
  const directed = Number.isFinite(awayAngle);
  const angle = directed ? awayAngle + (Math.random() - 0.5) * 1.1 : Math.random() * Math.PI * 2;
  const speed = directed ? 110 + Math.random() * 130 : 60 + Math.random() * 120;
  chunk.leavesRubble = leavesRubble;
  chunk.active = true;
  chunk.x = x; chunk.y = y;
  chunk.vx = Math.cos(angle) * speed;
  chunk.vy = Math.sin(angle) * speed * 0.6; // squashed vertically for the game's shallow top-down perspective
  chunk.lift = 0; chunk.liftV = directed ? 170 + Math.random() * 150 : 90 + Math.random() * 130;
  chunk.rot = Math.random() * Math.PI * 2;
  chunk.spin = (Math.random() - 0.5) * 9;
  chunk.char = isStone ? '🪨' : '🪵';
  chunk.size = (isStone ? 8 : 9) + Math.random() * 4;
  chunk.life = BARRICADE_CHUNK_LIFE_MS;
  chunk.landed = false;
}
function updateBarricadeChunks(dt){
  const seconds = dt / 1000;
  for(const chunk of barricadeChunks){
    if(!chunk.active) continue;
    chunk.life -= dt;
    if(chunk.life <= 0){ chunk.active = false; continue; }
    if(!chunk.landed){
      chunk.x += chunk.vx * seconds;
      chunk.y += chunk.vy * seconds;
      chunk.lift += chunk.liftV * seconds;
      chunk.liftV -= BARRICADE_CHUNK_GRAVITY * seconds;
      chunk.rot += chunk.spin * seconds;
      if(chunk.lift <= 0){
        chunk.lift = 0;
        chunk.landed = true;
        chunk.life = Math.min(chunk.life, 260); // brief settle, then the permanent ground piece takes over
        if(chunk.leavesRubble) pushDecal({
          x: chunk.x, y: chunk.y,
          color: '#fff', rgb: { r:255, g:255, b:255, a:1 }, lifespan: BARRICADE_RUBBLE_LIFESPAN, spawnTime: presentationTime,
          isEmojiDrop: true, isRubble: true, char: chunk.char, size: chunk.size, rot: chunk.rot
        });
      }
    }
  }
}
function drawBarricadeChunks(ctx){
  const bounds = fxViewBounds();
  for(const chunk of barricadeChunks){
    if(!chunk.active || chunk.landed) continue;
    if(!fxExtentVisible(chunk.x, chunk.y-chunk.lift, chunk.size, bounds)) continue;
    ctx.save();
    ctx.globalAlpha = 1; // the flying chunk is solid the whole way; it lands rather than fading out
    ctx.translate(chunk.x, chunk.y - chunk.lift);
    ctx.rotate(chunk.rot);
    ctx.font = Math.round(chunk.size) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(chunk.char, 0, 0);
    ctx.restore();
  }
}
function updateDeathAnims(){
  let write = 0;
  const length = deathAnims.length;
  for(let read = 0; read < length; read++){
    const anim = deathAnims[read];
    if(presentationTime - anim.startTime > anim.duration){
      deathAnimPool.push(anim);
      continue;
    }
    deathAnims[write++] = anim;
  }
  deathAnims.length = write;
}
function drawDeathAnims(ctx){
  if(!deathAnims.length) return;
  const bounds = fxViewBounds();
  for(const d of deathAnims){
    if(!fxExtentVisible(d.x, d.y, d.radius*2, bounds)) continue;
    const t = clampNum((presentationTime - d.startTime) / d.duration, 0, 1);
    const scale = 1 - t*0.75; // squashes down rather than vanishing outright
    const alpha = 1 - t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(d.x, d.y);
    ctx.scale(scale, scale*(1-t*0.3)); // slightly flatter as it settles, not just uniform shrink
    drawEmojiSprite(ctx, d.emoji, d.radius*2);
    ctx.restore();
  }
}
function startDripSite(x, y, color, severity){
  severity = severity === undefined ? 0.4 : clampNum(severity, 0, 1); // callers that don't pass severity (e.g. the Archer puncture-wound gush) keep their previous moderate default
  const dropCount = 1 + Math.round(severity * 7);
  for(let i=0; i<dropCount; i++){
    spawnSatelliteDrops(x + (Math.random()-0.5)*10, y + (Math.random()-0.5)*7, color, 1);
  }
}
let decalIndex = 0;
const SETTLED_DECAL_REBUILD_MIN_MS = 10000, SETTLED_DECAL_REBUILD_IN_WAVE_MS = 60000; // DECAL-REBUILD-DEFER-01: a full re-stamp of the baked layer costs 100+ ms on a bloody board, so mid-wave it waits up to a minute and runs between waves
let settledDecalRebuildPending = false;
let lastSettledDecalRebuild = 0;
function bloodTintForFire(enemy, baseHex){
  return (enemy && enemy.burnUntil > gameTime) ? '#170d08' : baseHex;
}
function hexToRgba(hex, alpha){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function parseColorToRgba(str){
  if(str[0] === '#'){
    return { r: parseInt(str.slice(1,3),16), g: parseInt(str.slice(3,5),16), b: parseInt(str.slice(5,7),16), a: 1 };
  }
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if(!m) return { r:122, g:15, b:15, a:1 }; // fallback — shouldn't happen given this codebase's own color formats
  return { r:+m[1], g:+m[2], b:+m[3], a: m[4] !== undefined ? +m[4] : 1 };
}
function bloodPoolSizeScale(enemyRadius){
  return clampNum(enemyRadius / 15, 0.45, 2.2);
}
function getBloodProfile(enemyType){
  if(enemyType === 'SWARM' || enemyType === 'SPLITTER' || enemyType === 'SPLITMINI'){
    return { bright:'#8bc34a', dark:'#4a7c1f', spray:'#cddc39', isDust:false, viscous:true }; // insect hemolymph
  }
  if(enemyType === 'ZOMBIE'){
    return { bright:'#5a8f3a', dark:'#2e4d1a', spray:'#7fbf4a', isDust:false, viscous:true, noArterial:true };
  }
  if(enemyType === 'MONARCH'){
    // Purple, per its own biology rather than borrowed from anything else in the roster
    return { bright:'#9b5fc0', dark:'#5a2d78', spray:'#c084e0', isDust:false, viscous:false };
  }
  const def = CONFIG.ENEMIES[enemyType];
  if(def && def.isUndead){
    return { bright:'#3a0a0a', dark:'#1a0303', spray:'#5a1515', isDust:false, viscous:true, noArterial:true }; // coagulated, necrotic — oozes, doesn't spurt
  }
  if(enemyType === 'BOULDER' || enemyType === 'ROCKLET' || enemyType === 'TANK'){
    return { bright:'#9e9e9e', dark:'#6d4c41', spray:'#bdbdbd', isDust:true }; // rock/debris, not blood at all — Tank (🗿) is a stone statue, Boulder/Rocklet are literal rock
  }
  return { bright:'#c0392b', dark:'#a3241a', spray:'#ff2020', isDust:false, viscous:false };
}
function hexToHsl(hex){
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s; const l = (max+min)/2;
  if(max === min){ h = 0; s = 0; }
  else {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if(max === r) h = ((g-b)/d + (g<b?6:0));
    else if(max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  return { h, s: s*100, l: l*100 };
}
function hslToHex(h, s, l){
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2*l-1)) * s;
  const x = c * (1 - Math.abs((h/60)%2 - 1));
  const m = l - c/2;
  let r,g,b;
  if(h < 60){ r=c; g=x; b=0; } else if(h < 120){ r=x; g=c; b=0; } else if(h < 180){ r=0; g=c; b=x; }
  else if(h < 240){ r=0; g=x; b=c; } else if(h < 300){ r=x; g=0; b=c; } else { r=c; g=0; b=x; }
  const toHex = v => Math.round((v+m)*255).toString(16).padStart(2,'0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
function shiftHexColor(hex, hueShift, lightShift){
  const hsl = hexToHsl(hex);
  return hslToHex((hsl.h + hueShift + 360) % 360, hsl.s, clampNum(hsl.l + lightShift, 4, 96));
}
function rollBloodProfile(enemyType){
  const base = getBloodProfile(enemyType);
  if(base.isDust) return base; // rock/debris has no biological variance to roll
  const hueJitter = (Math.random()*2-1) * 9;
  const lightJitter = (Math.random()*2-1) * 7;
  return {
    bright: shiftHexColor(base.bright, hueJitter, lightJitter),
    dark: shiftHexColor(base.dark, hueJitter, lightJitter*0.8),
    spray: shiftHexColor(base.spray, hueJitter, lightJitter),
    isDust: false, viscous: base.viscous, noArterial: base.noArterial
  };
}
function resolveGoreArchetype(sourceTower){
  if(!sourceTower || !sourceTower.active) return 'WARRIOR';
  if(sourceTower.type === 'BOMBER') return 'EXPLOSIVE'; // splash/explosive flavor despite being ARCHER-archetype for stats
  if(sourceTower.type === 'CLERIC' || sourceTower.type === 'POPE') return 'HOLY';
  if(sourceTower.type === 'SNAPCASTER') return 'MAGE';
  return CLASS_ARCHETYPE[sourceTower.type] || 'WARRIOR';
}
function resolveWeaponSubtype(sourceTower){
  if(!sourceTower) return 'BLADE';
  if(sourceTower.type === 'HAMMERMAN' || sourceTower.type === 'PALADIN') return 'BLUNT';
  if(sourceTower.type === 'SPEARMAN' || sourceTower.type === 'LANCER') return 'PIERCE';
  return 'BLADE'; // Swordsman, Axeman, Berserker
}
// BLOOD-LEAN-01: fewer, bolder marks: about a third of settling drops leave a stain, cast-off arcs are two to four larger drops.
const BLOOD_SETTLE_STAIN_SHARE = 0.35, BLOOD_SETTLE_STAIN_SIZE = 1.6, BLOOD_BIG_POOL_CHANCE = 0.04, BLOOD_MID_POOL_CHANCE = 0.16;
const BLOOD_ARC_MIN_DROPS = 2, BLOOD_ARC_EXTRA_DROPS = 3, BLOOD_ARC_DROP_SIZE = 1.3;
const DECAL_ELONGATION = Object.freeze({
  ARCHER:    { longMin:1.3,  longSpan:1.5,  shortMin:0.28, shortSpan:0.32 },
  MAGE:      { longMin:1.35, longSpan:0.75, shortMin:0.6,  shortSpan:0.45 },
  EXPLOSIVE: { longMin:0.85, longSpan:0.35, shortMin:0.75, shortSpan:0.35 },
  BLUNT:     { longMin:0.55, longSpan:0.45, shortMin:0.62, shortSpan:0.48 },
  PIERCE:    { longMin:1.15, longSpan:0.9,  shortMin:0.32, shortSpan:0.35 },
  DEFAULT:   { longMin:0.75, longSpan:1.15, shortMin:0.42, shortSpan:0.58 }
});
function spawnDecal(x, y, color, smallBias, biasAngle, archBias, viscous, dmgRollT, sizeScale, victim, transientSpray){
  const roll = Math.random();
  let sizeMult, blobCount;
  if(!smallBias && roll < BLOOD_BIG_POOL_CHANCE){
    // rare bigger pool — noticeably larger, but capped well short of dominating the screen
    sizeMult = 1.7 + Math.random()*0.9;
    blobCount = 4 + Math.floor(Math.random()*2);
  } else if(!smallBias && roll < BLOOD_BIG_POOL_CHANCE + BLOOD_MID_POOL_CHANCE){
    // modest step up from ordinary
    sizeMult = 1.15 + Math.random()*0.55;
    blobCount = 3 + Math.floor(Math.random()*2);
  } else {
    // ordinary splatter — the vast majority of decals, smallBias shrinks it further
    sizeMult = (0.55 + Math.random()*0.45) * (smallBias ? 0.6 : 1);
    blobCount = (2 + Math.floor(Math.random()*2)) - (smallBias ? 1 : 0);
  }
  if(viscous) blobCount = Math.max(2, Math.round(blobCount * 0.6));
  const elong = DECAL_ELONGATION[archBias] || DECAL_ELONGATION.DEFAULT;
  if(archBias === 'MAGE') sizeMult *= 1.75;
  else if(archBias === 'ARCHER') sizeMult *= 0.65;
  else if(archBias === 'BLUNT') sizeMult *= 1.25; // a crushing blow spreads wider underfoot
  else if(archBias === 'PIERCE') sizeMult *= 0.85; // deep but narrow — not a wide pool
  sizeMult = Math.min(sizeMult, 3.2);
  if(dmgRollT !== undefined) sizeMult *= 0.7 + dmgRollT*0.6;
  if(sizeScale !== undefined) sizeMult *= sizeScale;
  const orientAngle = biasAngle !== undefined ? biasAngle + (Math.random()-0.5)*0.9 : Math.random()*Math.PI*2;
  let stretchLong = elong.longMin + Math.random()*elong.longSpan;   // elongation along the main spatter axis
  let stretchShort = elong.shortMin + Math.random()*elong.shortSpan; // narrowness across it — independent of stretchLong
  if(viscous){ stretchLong = stretchLong*0.5 + 0.5; stretchShort = stretchShort*0.5 + 0.5; }
  const cosA = Math.cos(orientAngle), sinA = Math.sin(orientAngle), rgb = parseColorToRgba(color);
  const checksBlockers = victim && !(victim.bloodProfile && victim.bloodProfile.isDust);
  const blobs = [];
  for(let i=0; i<blobCount; i++){
    const a = Math.random()*Math.PI*2;
    const distT = Math.pow(Math.random(), viscous ? 2.4 : 1.4);
    const localX = Math.cos(a) * distT * 10 * stretchLong;
    const localY = Math.sin(a) * distT * 10 * stretchShort;
    const dx = (localX*cosA - localY*sinA) * sizeMult;
    const dy = (localX*sinA + localY*cosA) * sizeMult;
    const r = (Math.random() < 0.2 ? 2.8 + Math.random()*2.4 : 1.2 + Math.random()*2.2) * sizeMult;
    if(checksBlockers && bloodDecalBlocked({x:x+dx,y:y+dy,width:r*2,rgb,angle:orientAngle},x,y,victim,victim.radius*1.1)) continue;
    blobs.push({ dx, dy, r });
  }
  if(!blobs.length) return; // all pool blobs were intercepted: keep the void clear
  let footprintRadius = 0;
  for(const b of blobs) footprintRadius = Math.max(footprintRadius, Math.hypot(b.dx, b.dy) + b.r);
  const decal = { x, y, color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime, isLine: false, blobs, footprintRadius };
  if(transientSpray) pushSprayDecal(decal); else pushDecal(decal);
}
function spawnSwordsmanBloodArc(victim, tower){
  if(!goreMode || !tower || !tower.active || tower.type !== 'SWORDSMAN' || victim.isHutBuilding) return;
  const bio = victim.bloodProfile || getBloodProfile(victim.type);
  if(bio.isDust) return;
  const swingRadius = clampNum(Math.hypot(victim.x-tower.x, victim.y-tower.y), victim.radius*1.2, 120);
  spawnCastOffTrail(victim, Math.atan2(victim.y-tower.y, victim.x-tower.x), swingRadius, towerSwingDir(tower), hexToRgba(bloodTintForFire(victim,bio.bright),0.88), WEAPON_BLOOD_PROFILES.SWORDSMAN);
}
// CASTOFF-TANGENT-01: blood flung off a swinging blade leaves along the tangent of the blade's path.
function spawnCastOffTrail(victim, heading, swingRadius, arcDir, color, profile){
  const bodyScale = bloodPoolSizeScale(victim.radius), weight = Math.sqrt(bodyScale), rgb = parseColorToRgba(color);
  const count = clampNum(Math.round(profile.marks*1.6*bodyScale), 3, 10);
  const pivotX = victim.x - Math.cos(heading)*swingRadius, pivotY = victim.y - Math.sin(heading)*swingRadius;
  let sweptRad = 0;
  for(let drop = 0; drop < count; drop++){
    const along = drop/Math.max(1, count - 1);
    sweptRad += (3 + profile.reach*0.12 + drop*1.4)*weight/swingRadius;
    const releaseAngle = heading + arcDir*sweptRad, travelAngle = releaseAngle + arcDir*Math.PI/2;
    const flightPx = (profile.reach*0.8 + drop*profile.reach*0.45)*weight*(0.8 + Math.random()*0.4);
    const sideways = (Math.random() - 0.5)*0.08*flightPx;
    const width = profile.width*1.9*weight*(1 - 0.4*along)*(0.85 + Math.random()*0.3);
    const sinImpact = clampNum(1/(1 + flightPx/(profile.aspect*6*weight)), 1/FORENSIC_MAX_STAIN_ASPECT, 1);
    const length = width/sinImpact/2;
    const decal = { x: pivotX + Math.cos(releaseAngle)*swingRadius + Math.cos(travelAngle)*flightPx - Math.sin(travelAngle)*sideways,
      y: pivotY + Math.sin(releaseAngle)*swingRadius + Math.sin(travelAngle)*flightPx + Math.cos(travelAngle)*sideways,
      color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
      isDrop: true, angle: travelAngle, len: length, width, footprintRadius: Math.max(length, width) };
    if(!bloodDecalBlocked(decal, victim.x, victim.y, victim)) pushDecal(decal);
  }
}
function spawnCastOffArc(x, y, baseAngle, color, count, arcDir, victim){
  if(!bloodDropletsEnabled) return;
  const bodyScale = victim ? bloodPoolSizeScale(victim.radius) : 1; // BLOOD-ARC-WEIGHT-01
  const dropScale = Math.sqrt(bodyScale);
  const scale = (0.65 + Math.random()*0.9)*dropScale;
  count = Math.max(1, Math.round((count || (BLOOD_ARC_MIN_DROPS + Math.floor(Math.random()*BLOOD_ARC_EXTRA_DROPS)))*bodyScale));
  arcDir = arcDir !== undefined ? arcDir : (Math.random() < 0.5 ? 1 : -1); // fallback random only when a caller genuinely has no tower/handedness context to pass
  const angularStep = (0.15 + Math.random()*0.32) * arcDir;
  let dist = (6 + Math.random()*7) * scale;
  const rgb = parseColorToRgba(color);
  for(let i=0; i<count; i++){
    const angle = baseAngle + angularStep*i;
    dist += (4 + Math.random()*5) * scale * (0.6 + i*0.2); // accelerating spread further along the swing, matching how real cast-off trails spread out
    const px = x + Math.cos(angle)*dist;
    const py = y + Math.sin(angle)*dist;
    const travelAngle = angle + (Math.PI/2)*arcDir;
    const elongation = 1 + i*0.18; // rounder near the source, progressively more elongated further along the arc
    const decal = { x: px, y: py, color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
      isDrop: true, angle: travelAngle, len: (2 + Math.random()*1.5)*elongation*BLOOD_ARC_DROP_SIZE*dropScale, width: (2.2 + Math.random()*1.3)*BLOOD_ARC_DROP_SIZE*dropScale, footprintRadius: (2 + Math.random()*1.5)*elongation*BLOOD_ARC_DROP_SIZE*dropScale };
    if(!bloodDecalBlocked(decal, x, y, victim)) pushDecal(decal);
  }
}
function spawnBloodCastoff(x, y, impactAngle, color, lifespanMult, sizeMult, victim, widthScale){
  sizeMult = sizeMult || 1;
  const widthMult = 1 + (Math.sqrt(Math.max(0, sizeMult)) - 1);
  const maxLen = (8 + Math.random()*16) * sizeMult;
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*(lifespanMult||2)*decalLifespanVariance(), spawnTime: presentationTime, isLine: true,
    angle: impactAngle + (Math.random()-0.5)*0.7,
    maxLen,
    width: (0.4 + Math.random()*1.6) * (widthScale === undefined ? widthMult : widthScale),
    footprintRadius: maxLen
  };
  const blocker = forensicBlockerAlongPath({ originX:x, originY:y, originZ:VOID_BODY_HEIGHT_PX, victim, victimId:victim ? victim.id : undefined, x:x+Math.cos(decal.angle)*maxLen, y:y+Math.sin(decal.angle)*maxLen });
  if(blocker){ stainBloodBlocker(blocker, decal.width*2, decal.rgb, decal.angle); return; } // BLOOD-ALL-VOIDS-01
  pushDecal(decal);
}
const BONE_DROP_CHANCE = 0.05; // GORE-RARITY-01: bones 5% of deaths, skulls 12-19%, blood on every hit
const BONE_LIFESPAN = 1080000; // Legacy rock-debris ceiling; round-end cleanup shortens all remains to a six-second fade.
function spawnBoneDebris(x, y, enemyRadius){
  // BONE-SPREAD-01: every bone has its own size scaled from the enemy and the spread is even across a disc a little wider than the body.
  // GORE-RARITY-01: a bone is mostly a single piece (90% one, 10% two), so bones stay rarer than skulls and far rarer than blood.
  const count = Math.random() < 0.9 ? 1 : 2;
  for(let i=0; i<count; i++){
    const scatterDist = Math.sqrt(Math.random())*enemyRadius*1.1;
    const scatterAngle = Math.random()*Math.PI*2;
    const decal = {
      x: x + Math.cos(scatterAngle)*scatterDist, y: y + Math.sin(scatterAngle)*scatterDist,
      color:'#fff', rgb:{r:255,g:255,b:255,a:1}, lifespan: 120000, spawnTime: presentationTime,
      isEmojiDrop: true, char: '🦴', size: Math.max(5, enemyRadius*(0.35 + Math.random()*0.35)), rot: Math.random()*Math.PI*2
    };
    pushDecal(decal);
  }
}
function spawnRockChips(x, y, enemyRadius, count){
  for(let i=0; i<count; i++){
    const scatterDist = Math.random()*enemyRadius*0.9;
    const scatterAngle = Math.random()*Math.PI*2;
    const decal = {
      x: x + Math.cos(scatterAngle)*scatterDist, y: y + Math.sin(scatterAngle)*scatterDist,
      color:'#fff', rgb:{r:255,g:255,b:255,a:1}, lifespan: BONE_LIFESPAN, spawnTime: presentationTime,
      isEmojiDrop: true, char: '🪨', size: Math.max(4, enemyRadius*0.1*2), rot: Math.random()*Math.PI*2
    };
    pushDecal(decal);
  }
}
function spawnSkullDrop(x, y, enemyRadius){
  const decal = {
    x: x + (Math.random()-0.5)*enemyRadius*0.5, y: y + (Math.random()-0.5)*enemyRadius*0.5,
    color:'#fff', rgb:{r:255,g:255,b:255,a:1}, lifespan: 150000, spawnTime: presentationTime,
    isEmojiDrop: true, char: '💀', size: Math.max(12, enemyRadius), rot: (Math.random()-0.5)*0.6
  };
  pushDecal(decal);
}
function spawnWormFromSkull(skullDecal){
  const angle = Math.random()*Math.PI*2;
  const dist = skullDecal.size * 0.25;
  pushDecal({
    x: skullDecal.x + Math.cos(angle)*dist, y: skullDecal.y + Math.sin(angle)*dist,
    color:'#fff', rgb:{r:255,g:255,b:255,a:1}, lifespan: DEBRIS_LIFESPAN * 2, spawnTime: presentationTime,
    isWorm: true, char: '🪱', size: 10 + Math.random()*4, rot: Math.random()*Math.PI*2
  });
}
function spawnPunctureMark(x, y){
  const decal = { x, y, color:'#1a0505', rgb:{r:26,g:5,b:5}, lifespan: DEBRIS_LIFESPAN*1.4*decalLifespanVariance(), spawnTime: presentationTime,
    isPuncture: true, radius: 1.2 + Math.random()*0.8
  };
  pushDecal(decal);
}
const DRIP_STILL_MIN_PX = 2, DRIP_STILL_SPREAD_PX = 4, DRIP_MOVING_MIN_PX = 5, DRIP_MOVING_PER_SPEED = 0.12, DRIP_MOVING_MAX_PX = 18, DRIP_HEADING_JITTER_RAD = 0.35;
function spawnDripTrail(x, y, color, lifespanMult, mover){ // DRIP-TRAIL-FORENSIC-01: on flat ground a drip from a moving bleeder elongates along travel; a still one stays a short irregular run
  const speed = mover ? Math.hypot(mover.vx || 0, mover.vy || 0) : 0, moving = speed > 8;
  const angle = moving ? Math.atan2(mover.vy, mover.vx) + (Math.random() - 0.5) * DRIP_HEADING_JITTER_RAD : Math.random() * Math.PI * 2;
  const length = moving ? Math.min(DRIP_MOVING_MAX_PX, DRIP_MOVING_MIN_PX + speed * DRIP_MOVING_PER_SPEED * (0.6 + Math.random() * 0.8)) : DRIP_STILL_MIN_PX + Math.random() * DRIP_STILL_SPREAD_PX;
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*(lifespanMult||1.6)*decalLifespanVariance(), spawnTime: presentationTime, isDripTrail: true,
    length, angle, sway: (Math.random() - 0.5) * length * 0.35,
    width: 1 + Math.random(),
    footprintRadius: length
  };
  pushDecal(decal);
}
function spawnSatelliteDrops(x, y, color, count, biasAngle, distMult, victim){
  if(!bloodDropletsEnabled) return;
  const bodyScale = victim ? bloodPoolSizeScale(victim.radius) : 1;
  distMult = (distMult || 1)*bodyScale;
  const rgb = parseColorToRgba(color);
  for(let i=0; i<count; i++){
    const angle = biasAngle !== undefined ? biasAngle + (Math.random()-0.5)*1.4 : Math.random()*Math.PI*2;
    const dist = (6 + Math.random()*16) * distMult;
    const distT = (dist - 6*distMult) / (16*distMult);
    const decal = { x: x + Math.cos(angle)*dist, y: y + Math.sin(angle)*dist,
      color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime, isDrop: true, angle,
      len: ((1.8 + Math.random()*1.4) + distT*2.8)*bodyScale,
      width: ((2.4 + Math.random()*1.6) - distT*1.1)*bodyScale,
      footprintRadius: (1.8 + Math.random()*1.4) + distT*2.8
    };
    if(!bloodDecalBlocked(decal, x, y, victim)) pushDecal(decal);
  }
}
function spawnSkinPeel(x, y, color){
  const spikes = 6 + Math.floor(Math.random()*3);
  const points = [];
  for(let i=0; i<spikes; i++){
    const a = (i/spikes)*Math.PI*2;
    const r = (4 + Math.random()*5);
    points.push({ x: Math.cos(a)*r, y: Math.sin(a)*r*0.7 });
  }
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*1.3*decalLifespanVariance(), spawnTime: presentationTime, isPeel: true, points };
  pushDecal(decal);
}
function drawBloodFootprint(ctx, d, color){
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle); ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(-d.len*0.55, 0, d.width*0.65, d.width*0.65, 0, 0, Math.PI*2); ctx.fill(); // heel
  ctx.beginPath(); ctx.ellipse(d.len*0.25, 0, d.len*0.65, d.width, 0, 0, Math.PI*2); ctx.fill(); // sole
  if(d.dragLen > 0){
    ctx.strokeStyle = color; ctx.lineWidth = d.width*0.6;
    ctx.beginPath(); ctx.moveTo(-d.len, 0); ctx.lineTo(-d.len - d.dragLen, 0); ctx.stroke();
  }
  ctx.restore();
}
function spawnFootprint(x, y, color, angle, dragMult, bodyScale){
  bodyScale=bodyScale || 1;dragMult=clampNum(dragMult || 1,1,1.8);
  const len=(2+Math.random()*0.6)*bodyScale,width=(1+Math.random()*0.4)*bodyScale;
  pushDecal({x,y,color,rgb:parseColorToRgba(color),lifespan:DECAL_LIFESPAN*0.25,spawnTime:presentationTime,isFootprint:true,angle,len,width,dragLen:(dragMult-1)*2*bodyScale,footprintRadius:len+width});
}
const MAX_WET_BLOOD_CHECKS_PER_TICK = 8;
let wetBloodScanCursor = 0;
function updateWalkingBlood(dt){
  if(!goreMode || decals.length === 0) return;
  for(const e of enemyPool){
    if(!e.active) continue;
    e.footTrailTimer = (e.footTrailTimer||0) - dt;
    if(e.wetFeetSteps > 0){
      const traveledStep=Math.hypot(e.x-(e.lastBloodFootX ?? e.x),e.y-(e.lastBloodFootY ?? e.y));
      if((e.lastBloodFootX === undefined || traveledStep >= Math.max(5,e.radius*0.65)) && Math.hypot(e.vx,e.vy)>1){
        e.footTrailTimer = 220 + Math.random()*120;
        e.wetFeetSteps--;
        const fade = e.wetFeetSteps / (e.wetFeetStepsMax||5); // each successive print is fainter/smaller as the blood runs out
        const c = e.wetFeetRgb || {r:122,g:15,b:15};
        const dragMult = 1 + Math.max(0, (e.wetFeetSteps - (e.wetFeetStepsMax - (e.wetFeetSizeBonus||0)))) * 0.5;
        const heading=Math.atan2(e.vy,e.vx)+(Math.random()-0.5)*0.3,side=e.bloodFootSide===1 ? -1 : 1;e.bloodFootSide=side; // FOOTPRINT-GAIT-01: toe-out and stride width vary per step
        const strideSide=side*e.radius*(0.16+Math.random()*0.14);
        spawnFootprint(e.x-Math.sin(heading)*strideSide,e.y+Math.cos(heading)*strideSide,'rgba('+c.r+','+c.g+','+c.b+','+(0.7*fade).toFixed(2)+')',heading,dragMult,bloodPoolSizeScale(e.radius));
        e.lastBloodFootX=e.x;e.lastBloodFootY=e.y;
      }
      continue;
    }
    // not currently leaving prints — check if standing in fresh blood to pick some up (throttled)
    e.wetCheckTimer = (e.wetCheckTimer||0) - dt;
  }
  // WET-FEET-STAGGER-01: at most MAX_WET_BLOOD_CHECKS_PER_TICK enemies search the recent decals per tick; the rotating cursor reaches every enemy in turn.
  const count = enemyPool.length;
  if(!count) return;
  const start = wetBloodScanCursor % count;
  let visited = 0, checks = 0;
  for(; visited < count && checks < MAX_WET_BLOOD_CHECKS_PER_TICK; visited++){
    const e = enemyPool[(start + visited) % count];
    if(!e.active || e.wetFeetSteps > 0 || e.wetCheckTimer > 0) continue;
    e.wetCheckTimer = 400 + Math.random()*200;
    checks++;
    for(let i = decals.length-1; i >= Math.max(0, decals.length-220); i--){
      const d = decals[i];
      if(!isGroundBloodDecal(d)) continue;
      if(presentationTime - d.spawnTime > 7000) continue; // only fresh (still-wet) blood transfers
      const pickupRadius = e.radius + 10 + (d.footprintRadius||0);
      const pickupRadiusSq = pickupRadius * pickupRadius;
      const pickupDx = d.x-e.x, pickupDy = d.y-e.y;
      if(pickupDx*pickupDx + pickupDy*pickupDy < pickupRadiusSq){
        // BLOOD-GROUND-FIXED-01: wet feet copy colour; never move or shrink the source puddle.
        const sizeBonus = Math.min(3, Math.floor((d.footprintRadius||0) / 12));
        e.wetFeetSteps = e.wetFeetStepsMax = 4 + Math.floor(Math.random()*3) + sizeBonus;
        e.wetFeetSizeBonus = sizeBonus;
        e.wetFeetRgb = d.rgb;
        e.footTrailTimer = 0; e.lastBloodFootX=undefined;e.lastBloodFootY=undefined;
        playSound('foot_squelch', e.x, sizeBonus);
        if(d.blobs !== undefined && presentationTime - d.spawnTime < STOMP_FRESH_MS && sizeBonus >= 1) spawnStompSpatter(e.x, e.y, d.color, d.rgb, e.radius);
        break;
      }
    }
  }
  wetBloodScanCursor = (start + Math.max(1, visited)) % count;
}
const POOL_SERUM_MIN_BLOBS = 3, STOMP_FRESH_MS = 3000, STOMP_DROPS_MIN = 4, STOMP_DROPS_SPREAD = 4;
function spawnStompSpatter(x, y, color, rgb, walkerRadius){ // STOMP-SPATTER-01: a step into a fresh pool is a splash: long narrow spatters exit below 40 degrees, tails often reversed toward the pool (James ch.5)
  if(!bloodDropletsEnabled || graphicsQuality === 'low' || underHeavyVisualLoad) return;
  const dropCount = STOMP_DROPS_MIN + Math.floor(Math.random()*STOMP_DROPS_SPREAD), reach = walkerRadius*0.9;
  for(let i = 0; i < dropCount; i++){
    const angle = Math.random()*Math.PI*2, distance = reach*(0.6 + Math.random()*0.9), width = 0.7 + Math.random()*1.0;
    pushSprayDecal({ x: x + Math.cos(angle)*distance, y: y + Math.sin(angle)*distance, color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
      isDrop: true, angle: angle + Math.PI, len: width*(2.2 + Math.random()*2.2), width, tailScale: 1.8, footprintRadius: width*3 });
  }
}
const BLOOD_SATURATION_RADIUS = 26;
const BLOOD_SATURATION_MAX = 10, BLOOD_SATURATION_MAX_HIGH = 40;
function isGroundBloodDecal(d){ return !d.isEmojiDrop && !d.isWorm && !d.isRubble && (d.blobs !== undefined || d.isDrop || d.isLine || d.isDripTrail || d.isPeel || d.isFootprint); }
function isBloodAreaSaturated(x, y){
  let count = 0;
  const scanFrom = Math.max(0, decals.length - 260);
  for(let i = decals.length-1; i >= scanFrom; i--){
    const d = decals[i];
    if(!isGroundBloodDecal(d) || presentationTime-d.spawnTime >= (d.lifespan || DECAL_LIFESPAN)) continue;
    const dx = d.x-x, dy = d.y-y;
    if(dx > BLOOD_SATURATION_RADIUS || dx < -BLOOD_SATURATION_RADIUS || dy > BLOOD_SATURATION_RADIUS || dy < -BLOOD_SATURATION_RADIUS) continue; // cheap box reject before the real distance check
    if(dx*dx + dy*dy < BLOOD_SATURATION_RADIUS*BLOOD_SATURATION_RADIUS){
      count++;
      if(count >= (graphicsQuality === 'low' ? BLOOD_SATURATION_MAX : BLOOD_SATURATION_MAX_HIGH)) return true;
    }
  }
  return false;
}
function pushDecal(decal){
  if(decal.isDrop && decal.tailScale === undefined) applyStainSurface(decal, bloodSurfaceAt(decal.x, decal.y), decal.len*2/Math.max(0.1, decal.width));
  if(isGroundBloodDecal(decal)) decal.lifespan=bloodMarkLifespan();
  if(waveState==='IDLE' && wavesCompleted>0){decal.cleanupStarted=true;decal.lifespan=18000;decal.spawnTime=presentationTime-12000;}
  if(isGroundBloodDecal(decal) && decal.blobs === undefined && isBloodAreaSaturated(decal.x, decal.y)) return;
  const capacity = decalCapacity();
  if(capacity <= 0) return; // zero is an explicit supported setting
  enforceDecalCapacity();
  if(decals.length < capacity){
    decals.push(decal);
  } else {
    decalIndex %= capacity;
    for(let scanned = 0; scanned < capacity && (decals[decalIndex].isEmojiDrop || decals[decalIndex].isWorm); scanned++){
      decalIndex = (decalIndex+1) % capacity;
    }
    if(decals[decalIndex].baked) settledDecalRebuildPending = true; // its stamp must leave the baked cache on the next coalesced rebuild
    decals[decalIndex] = decal; // oldest stain gets overwritten once capped — stays performance-safe indefinitely
    decalIndex = (decalIndex+1) % capacity;
  }
}
const DECAL_LIFESPAN = 75000, DEBRIS_LIFESPAN = 720000;
function bloodMarkLifespan(){ return 60000+Math.random()*30000; }
function bloodStainLifeT(stain){ const age = presentationTime-stain.bornAt, span = stain.lifespan || DECAL_LIFESPAN; return (stain.cleanupStarted ? age : Math.min(age, span*BLOOD_HOLD_LIFE_T))/span; }
function bloodFadeAlpha(t){ return clampNum((1-t)/0.35,0,1); }
function decalLifespanVariance(){
  return 1.15 + Math.random()*1.85; // 1.15x to 3.0x
}
const DECAL_BAKE_MIN_AGE_MS = 12000; // BLOOD-READABILITY-01: fresh detail stays live/sharp longer before cache baking
// BLOOD-STABLE-01: until the round-end clean-up a mark's life stops at BLOOD_HOLD_LIFE_T, so it neither fades nor expires mid-round;
// the clean-up then runs it through BLOOD_DRY_END_T, where its last colour is cached for the bake, and out.
const BLOOD_HOLD_LIFE_T = 0.5, BLOOD_DRY_END_T = 0.60;
const DECAL_BAKE_PRESSURE_MIN_AGE_MS = 4000, DECAL_BAKE_PRESSURE_ON = 90, DECAL_BAKE_PRESSURE_OFF = 40; // DECAL-BAKE-PRESSURE-01
let decalBakePressure = false;
function decalBakeMinAgeMs(d){ return d.baked || decalBakePressure ? DECAL_BAKE_PRESSURE_MIN_AGE_MS : DECAL_BAKE_MIN_AGE_MS; }
const ROUND_CLEANUP_FADE_MS = 6000;
function beginRoundDebrisCleanup(){
  for(const d of decals.concat(sprayDecals)){
    if(d.cleanupStarted) continue;
    d.cleanupStarted=true;
    d.lifespan=ROUND_CLEANUP_FADE_MS*3; d.spawnTime=presentationTime-ROUND_CLEANUP_FADE_MS*2; // BLOOD-STABLE-01: every mark held through the round fades over the same final six seconds
    d.baked=false; delete d.settledColor; delete d.settledAlpha;
  }
  for(const entity of [...towerPool,...enemyPool,...sceneryMap.values()]){
    if(!entity.bloodStains) continue;
    for(const stain of entity.bloodStains){
      if(stain.cleanupStarted) continue;
      stain.cleanupStarted=true;stain.lifespan=ROUND_CLEANUP_FADE_MS*3;stain.bornAt=presentationTime-ROUND_CLEANUP_FADE_MS*2;
    }
    entity.bloodStampKey=null;entity.bloodStainRevision=(entity.bloodStainRevision||0)+1;
  }
  if(settledDecalCanvasReady){ settledDecalContext().clearRect(0,0,WORLD_MAX_W,WORLD_MAX_H); settledDecalHasContent=false; }
  settledDecalRevision++;
  settledDecalRebuildPending=true;
}
function decalAgeMs(d){ const age = presentationTime - d.spawnTime; return d.cleanupStarted ? age : Math.min(age, (d.lifespan || DECAL_LIFESPAN) * BLOOD_HOLD_LIFE_T); } // BLOOD-STABLE-01: until the round-end clean-up starts a mark holds still, neither fading nor expiring
function decalLifeT(d){ return decalAgeMs(d) / (d.lifespan || DECAL_LIFESPAN); }
function isDecalBakeEligible(d){
  const lifeT = decalLifeT(d);
  const age = presentationTime - d.spawnTime;
  if(d.isRubble) return false; // RUBBLE-LIVE-01
  if(d.isEmojiDrop || d.isWorm) return false;
  if(d.isDrop || d.isFootprint) return age >= decalBakeMinAgeMs(d) && lifeT <= 0.60;
  if(d.blobs !== undefined) return age >= decalBakeMinAgeMs(d) && lifeT <= 0.60;
  return false;
}
// FRESH-BLOOD-01: red blood always draws a bright fresh red; other blood keeps the colour it landed with.
function bloodIsRed(rgb){ return rgb.r >= rgb.g*1.5 && rgb.r >= rgb.b*1.5; }
// BLOOD-STABLE-01: a mark never recolours when a later splatter lands.
function agedBloodRgb(d){
  const rgb = d.rgb;
  return bloodIsRed(rgb) ? { r: 255, g: 40, b: 40 } : { r: rgb.r, g: rgb.g, b: rgb.b };
}
function drawBloodDrop(ctx,d,color){
  const width=d.width, len=Math.max(width*0.5,d.len);
  ctx.save();ctx.fillStyle=color;ctx.translate(d.x,d.y);ctx.rotate(d.angle);
  ctx.beginPath();ctx.ellipse(0,0,len,width*0.5,0,0,Math.PI*2);ctx.fill();
  if(len>width*0.65){
    const tipX=len*(d.tailScale || 1.22);
    ctx.beginPath();ctx.moveTo(len*0.65,-width*0.28);
    ctx.quadraticCurveTo(len*1.05,-width*0.12,tipX,0);
    ctx.quadraticCurveTo(len*1.05,width*0.12,len*0.65,width*0.28);ctx.closePath();ctx.fill();
  }
  if(d.spines){
    for(const [spineAngle,spineLength] of d.spines){
      const cosA=Math.cos(spineAngle),sinA=Math.sin(spineAngle),edgeX=cosA*len*0.85,edgeY=sinA*width*0.42,reach=width*spineLength,base=width*0.16;
      ctx.beginPath();ctx.moveTo(edgeX-sinA*base,edgeY+cosA*base);ctx.lineTo(edgeX+cosA*reach,edgeY+sinA*reach);ctx.lineTo(edgeX+sinA*base,edgeY-cosA*base);ctx.closePath();ctx.fill();
    }
  }
  if(d.waveCastOff){
    const satelliteX=len*(d.tailScale || 1.22)*d.waveCastOff, satelliteR=Math.max(0.4,width*0.22);
    ctx.beginPath();ctx.arc(satelliteX,0,satelliteR,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(satelliteX,-satelliteR*0.7);ctx.lineTo(satelliteX-satelliteR*3.2,0);ctx.lineTo(satelliteX,satelliteR*0.7);ctx.closePath();ctx.fill();
  }
  if(d.beads){
    for(const [beadX,beadY,beadRadius] of d.beads){ ctx.beginPath();ctx.arc(beadX*len,beadY*width,width*beadRadius,0,Math.PI*2);ctx.fill(); }
  }
  ctx.restore();
}
function stampSettledDecal(sctx, d){
  // Same geometry, colour, shine and aging as live/zoomed rendering; baking never changes a mark.
  drawOneDecal(sctx, d);
}
function settledDecalContext(){
  const sctx = settledDecalCanvas.getContext('2d');
  sctx.setTransform(dprValue,0,0,dprValue,0,0);
  return sctx;
}
function rebuildSettledDecalCanvas(){
  if(!settledDecalCanvasReady) return;
  const rebuildStarted = performance.now();
  let stampCount = 0;
  const sctx = settledDecalContext();
  sctx.clearRect(0,0,WORLD_MAX_W,WORLD_MAX_H);
  for(const d of decals){
    d.baked = isDecalBakeEligible(d);
    if(d.baked){ stampSettledDecal(sctx, d); stampCount++; }
  }
  settledDecalHasContent = stampCount > 0;
  settledDecalRevision++;
  settledDecalRebuildPending = false;
  lastSettledDecalRebuild = presentationTime;
  const timing = extendedDiagnostics.decalRebuilds, elapsed = performance.now()-rebuildStarted;
  timing.count++; timing.totalMs += elapsed; timing.maxMs = Math.max(timing.maxMs,elapsed);
  timing.lastMs = elapsed; timing.lastStamps = stampCount;
  if(elapsed > 8) timing.over8ms++;
}
function sweepSettledDecals(expiredBakedCount){
  if(!settledDecalCanvasReady) return;
  let sctx = null;
  let liveBloodCount = 0;
  if(expiredBakedCount > 0) settledDecalRebuildPending = true;
  for(const d of decals){
    if(!d.baked && (d.isDrop || d.isFootprint || d.blobs !== undefined)) liveBloodCount++;
    const eligible = isDecalBakeEligible(d);
    if(eligible && !d.baked){
      if(!sctx) sctx = settledDecalContext();
      stampSettledDecal(sctx, d);
      settledDecalHasContent = true;
      settledDecalRevision++;
      d.baked = true;
    } else if(!eligible && d.baked){
      settledDecalRebuildPending = true;
    }
  }
  decalBakePressure = liveBloodCount >= (decalBakePressure ? DECAL_BAKE_PRESSURE_OFF : DECAL_BAKE_PRESSURE_ON);
  const sinceRebuild = presentationTime - lastSettledDecalRebuild;
  if(settledDecalRebuildPending && sinceRebuild >= (waveState === 'IDLE' ? SETTLED_DECAL_REBUILD_MIN_MS : SETTLED_DECAL_REBUILD_IN_WAVE_MS)) rebuildSettledDecalCanvas();
}
function maintainDecals(){
  enforceDecalCapacity();
  maintainSprayDecals();
  if(presentationTime - lastDecalExpirySweep >= DECAL_EXPIRY_SWEEP_INTERVAL){
    lastDecalExpirySweep = presentationTime;
    let expiredBakedCount = 0;
    // Compacted in one pass: splicing each expired entry would make a synchronised expiry quadratic.
    let write = 0;
    const originalLength = decals.length;
    for(let read = 0; read < originalLength; read++){
      const d = decals[read];
      const age = presentationTime - d.spawnTime;
      const lifespan = d.lifespan || DECAL_LIFESPAN;
      if(d.cleanupStarted && age >= lifespan){ if(d.baked) expiredBakedCount++; continue; } // only a mark in its round-end clean-up expires; capacity still recycles the oldest
      decals[write++] = d;
    }
    decals.length = write;
    sweepSettledDecals(expiredBakedCount);
  }
}
// DECAL-CATEGORIES-01: debris counted by kind (cached once per second) so the debug overlay and log show what is on the board and which drawing path it uses.
let decalCategoryCache = { at: -1e9, liveBlood: 0, bakedBlood: 0, bones: 0, skulls: 0, worms: 0, rubble: 0 };
function decalCategoryCounts(){
  const now = performance.now();
  if(now - decalCategoryCache.at < 1000) return decalCategoryCache;
  const c = { at: now, liveBlood: 0, bakedBlood: 0, bones: 0, skulls: 0, worms: 0, rubble: 0 };
  for(const d of decals){
    if(d.isRubble || (d.isEmojiDrop && d.char === '🪨')) c.rubble++;
    else if(d.isWorm) c.worms++;
    else if(d.isEmojiDrop) { if(d.char === '💀') c.skulls++; else c.bones++; }
    else if(d.baked) c.bakedBlood++;
    else c.liveBlood++;
  }
  decalCategoryCache = c;
  return c;
}
function lastMinuteSummary(){
  const samples = perfStats.sessionTrendSamples;
  if(!samples || !samples.length) return 'last minute: collecting';
  const m = samples[samples.length - 1];
  return 'last minute: ' + m.callbackFps.toFixed(0) + ' FPS avg, worst frame ' + m.maxFrameMs.toFixed(0) + 'ms, render avg ' + m.averageRenderMs.toFixed(1) + 'ms';
}
// SMOOTH-ANIM-01: draws a projectile between its previous and current tick positions, like enemies.
function drawProjectileSmoothed(ctx, projectile){
  const blend = gameState === 'PLAYING' ? Math.min(1, accumulator / FIXED_DT) : 1;
  const realX = projectile.x, realY = projectile.y;
  const stepX = realX - projectile.renderPrevX, stepY = realY - projectile.renderPrevY;
  if(blend < 1 && Number.isFinite(stepX) && Number.isFinite(stepY) && stepX*stepX + stepY*stepY < 6400){
    projectile.x = realX - stepX*(1 - blend); projectile.y = realY - stepY*(1 - blend);
    try { projectile.draw(ctx); } finally { projectile.x = realX; projectile.y = realY; }
    return;
  }
  projectile.draw(ctx);
}
// ZOOMED-DECAL-CACHE-01: above 1.25x zoom the world-resolution settled layer is too soft, so settled marks are painted at screen resolution into a
// cached layer with a margin; it is repainted only when the zoom, canvas size or bake changes, or the camera pans past the margin.
const ZOOMED_DECAL_MARGIN_PX = 256;
const zoomedDecalLayer = document.createElement('canvas'), zoomedDecalLayerContext = zoomedDecalLayer.getContext('2d');
let zoomedDecalSignature = '', zoomedDecalPaintE = 0, zoomedDecalPaintF = 0;
function drawZoomedSettledDecals(ctx){
  const matrix = ctx.getTransform(), margin = ZOOMED_DECAL_MARGIN_PX;
  const signature = matrix.a.toFixed(4) + '|' + ctx.canvas.width + 'x' + ctx.canvas.height + '|' + settledDecalRevision;
  if(signature !== zoomedDecalSignature || Math.abs(matrix.e - zoomedDecalPaintE) > margin || Math.abs(matrix.f - zoomedDecalPaintF) > margin){
    const width = ctx.canvas.width + margin*2, height = ctx.canvas.height + margin*2, layer = zoomedDecalLayerContext;
    if(zoomedDecalLayer.width !== width || zoomedDecalLayer.height !== height){ zoomedDecalLayer.width = width; zoomedDecalLayer.height = height; }
    else { layer.setTransform(1,0,0,1,0,0); layer.clearRect(0, 0, width, height); }
    layer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e + margin, matrix.f + margin);
    const zoom = matrix.a || 1, reach = margin / zoom + TILE_SIZE*1.2;
    const bounds = { left: -(matrix.e)/zoom - reach, top: -(matrix.f)/zoom - reach, right: (ctx.canvas.width - matrix.e)/zoom + reach, bottom: (ctx.canvas.height - matrix.f)/zoom + reach };
    for(const d of decals) if(d.baked && !d.isEmojiDrop && !d.isWorm && decalVisible(d, bounds)) drawOneDecal(layer, d);
    zoomedDecalSignature = signature; zoomedDecalPaintE = matrix.e; zoomedDecalPaintF = matrix.f;
  }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(zoomedDecalLayer, matrix.e - zoomedDecalPaintE - margin, matrix.f - zoomedDecalPaintF - margin);
  ctx.restore();
}
function drawDecals(ctx){
  const bounds = decalViewBounds();
  perfStats.totalDecals = decals.length + sprayDecals.length;
  perfStats.visibleDecals = 0;
  depthSortedDecalsThisFrame.length = 0;
  if(goreMode && bloodDropletsEnabled) for(const d of sprayDecals) if(decalAgeMs(d) < d.lifespan && decalVisible(d,bounds)){ perfStats.visibleDecals++; drawOneDecal(ctx,d); }
  const zoomedIn = camera.zoom > 1.25;
  if(zoomedIn && settledDecalHasContent) drawZoomedSettledDecals(ctx);
  for(const d of decals){
    if(d.isRubble){
      if(!d.baked && decalVisible(d,bounds)) drawOneDecal(ctx,d);
      continue;
    }
    if(d.isEmojiDrop || d.isWorm){
      if(decalVisible(d, bounds)) depthSortedDecalsThisFrame.push(d);
      continue;
    }
    if(!d.baked && decalVisible(d, bounds)){
      perfStats.visibleDecals++;
      drawOneDecal(ctx, d);
    }
  }
}
// The visible world rectangle grown by a margin, for culling what is drawn: decals use a tight margin, effects a wider one.
function viewBoundsWithMargin(cullMargin){
  return {
    left: (0 - camera.x) / camera.zoom - cullMargin,
    right: (CANVAS_W - camera.x) / camera.zoom + cullMargin,
    top: (0 - camera.y) / camera.zoom - cullMargin,
    bottom: (CANVAS_H - camera.y) / camera.zoom + cullMargin
  };
}
function decalViewBounds(){ return viewBoundsWithMargin(TILE_SIZE * 1.2); }
function visibleWorldRect(){
  const left = Math.max(0, Math.floor(-camera.x / camera.zoom));
  const top = Math.max(0, Math.floor(-camera.y / camera.zoom));
  const right = Math.min(WORLD_MAX_W, Math.ceil((CANVAS_W - camera.x) / camera.zoom));
  const bottom = Math.min(WORLD_MAX_H, Math.ceil((CANVAS_H - camera.y) / camera.zoom));
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
// CRISP-MAP-01: the baked world map is one pixel per world unit, so above 1.25x zoom the map is redrawn at screen resolution into a cached layer
// with a margin, the same scheme as the zoomed decal layer; while the zoom is still changing the baked map is shown instead.
const CRISP_MAP_MIN_ZOOM = 1.25, CRISP_MAP_MARGIN_PX = 256;
const crispMapLayer = document.createElement('canvas'), crispMapLayerContext = crispMapLayer.getContext('2d');
let crispMapSignature = '', crispMapPaintE = 0, crispMapPaintF = 0, crispMapLastZoom = 0;
function crispMapRevealPending(){
  for(const key of pendingRevealTileKeys){
    const comma = key.indexOf(',');
    if(isInActiveRegion(+key.slice(0, comma), +key.slice(comma + 1))) return true;
  }
  return false;
}
function drawCrispMap(ctx, view){
  const matrix = ctx.getTransform(), margin = CRISP_MAP_MARGIN_PX, zoomSettled = Math.abs(camera.zoom - crispMapLastZoom) < 1e-6;
  crispMapLastZoom = camera.zoom;
  const signature = matrix.a.toFixed(5) + '|' + ctx.canvas.width + 'x' + ctx.canvas.height + '|' + mapBakeRevision;
  const fresh = signature === crispMapSignature && Math.abs(matrix.e - crispMapPaintE) <= margin && Math.abs(matrix.f - crispMapPaintF) <= margin;
  if(ringRevealQueue.length || crispMapRevealPending()){ blitWorldLayer(ctx, mapCanvas, view); return; } // the growing ring reveals tile by tile from the baked map
  if(!fresh){
    if(!zoomSettled){ blitWorldLayer(ctx, mapCanvas, view); return; }
    const width = ctx.canvas.width + margin*2, height = ctx.canvas.height + margin*2, layer = crispMapLayerContext;
    if(crispMapLayer.width !== width || crispMapLayer.height !== height){ crispMapLayer.width = width; crispMapLayer.height = height; }
    else { layer.setTransform(1,0,0,1,0,0); layer.clearRect(0, 0, width, height); }
    layer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e + margin, matrix.f + margin);
    drawMap(layer);
    crispMapSignature = signature; crispMapPaintE = matrix.e; crispMapPaintF = matrix.f;
  }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(crispMapLayer, matrix.e - crispMapPaintE - margin, matrix.f - crispMapPaintF - margin);
  ctx.restore();
}
function blitWorldLayer(ctx, layerCanvas, view){
  if(view.width <= 0 || view.height <= 0) return;
  const rasterScale = layerCanvas.width / WORLD_MAX_W;
  ctx.drawImage(layerCanvas,
    view.left * rasterScale, view.top * rasterScale, view.width * rasterScale, view.height * rasterScale,
    view.left, view.top, view.width, view.height);
}
function decalVisible(d, b){ return d.x >= b.left && d.x <= b.right && d.y >= b.top && d.y <= b.bottom; }
function fxViewBounds(){ return viewBoundsWithMargin(TILE_SIZE * 2); }
function fxExtentVisible(x, y, extent, b){
  return x+extent >= b.left && x-extent <= b.right && y+extent >= b.top && y-extent <= b.bottom;
}
function fxVisible(x, y, b){ return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; }
function drawOneDecal(ctx, d){
  const age = decalAgeMs(d);
  const lifespan = d.lifespan || DECAL_LIFESPAN;
  if(presentationTime - d.spawnTime < 0 || age >= lifespan) return;
  const lifeT = age / lifespan;
  let color, alpha, r, g, b;
  if(!d.isEmojiDrop && !d.isWorm){
    if(lifeT >= BLOOD_DRY_END_T && lifeT <= 0.65 && d.settledColor !== undefined){
      color = d.settledColor;
      alpha = d.settledAlpha;
      const aged = d.settledRgb || (d.settledRgb = agedBloodRgb(d)); r=aged.r;g=aged.g;b=aged.b;
    } else {
      const aged = agedBloodRgb(d); r = aged.r; g = aged.g; b = aged.b; // FRESH-BLOOD-01
      alpha = d.rgb.a * bloodFadeAlpha(lifeT);
      color = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      if(lifeT >= BLOOD_DRY_END_T && lifeT <= 0.65){ d.settledColor = color; d.settledAlpha = alpha; }
    }
  }
  if(d.isFootprint){ // BLOOD-FOOTPRINT-01
    drawBloodFootprint(ctx,d,color);
  } else if(d.isPeel){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(d.x + d.points[0].x, d.y + d.points[0].y);
    for(let index = 1; index < d.points.length; index++) ctx.lineTo(d.x + d.points[index].x, d.y + d.points[index].y);
    ctx.closePath(); ctx.fill();
    // pale blistered highlight in the centre reads as peeled tissue rather than a pool
    ctx.fillStyle = 'rgba(255,220,200,' + (alpha*0.4).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(d.x, d.y, 2.5, 0, Math.PI*2); ctx.fill();
  } else if(d.isLine){
    ctx.strokeStyle = color;
    ctx.lineWidth = d.width;
    ctx.lineCap = 'round';
    const len = d.maxLen;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + Math.cos(d.angle)*len, d.y + Math.sin(d.angle)*len);
    ctx.stroke();
  } else if(d.isDripTrail){
    const len = d.length, dirX = Math.cos(d.angle || Math.PI/2), dirY = Math.sin(d.angle || Math.PI/2);
    const midX = d.x + dirX*len*0.55 - dirY*d.sway, midY = d.y + dirY*len*0.55 + dirX*d.sway;
    const endX = d.x + dirX*len - dirY*d.sway*0.4, endY = d.y + dirY*len + dirX*d.sway*0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = d.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(endX, endY, d.width*0.85, 0, Math.PI*2); ctx.fill();
  } else if(d.isPuncture){
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.radius, 0, Math.PI*2); ctx.fill();
  } else if(d.isEmojiDrop){
    ctx.save();
    ctx.globalAlpha = d.isRubble ? clampNum((1 - decalLifeT(d)) / 0.1, 0, 1) : (d.char === '🦴' || d.char === '💀') ? clampNum((1 - decalLifeT(d)) / 0.4, 0, 1) : 1; // skeletal remains fade over their final 40%
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(d.size) + 'px serif';
    ctx.fillStyle='#fff';ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillText(d.char, 0, 0);
    ctx.restore();
  } else if(d.isWorm){
    const shrinkStart = 0.7;
    const shrinkT = lifeT > shrinkStart ? Math.max(0, 1 - (lifeT-shrinkStart)/(1-shrinkStart)) : 1;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.max(1, Math.round(d.size*shrinkT)) + 'px serif';
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillText(d.char, 0, 0);
    ctx.restore();
  } else if(d.isDrop){
    drawBloodDrop(ctx,d,color);
  } else {
    ctx.fillStyle = color;
    for(const b of d.blobs){
      ctx.beginPath(); ctx.arc(d.x+b.dx, d.y+b.dy, b.r, 0, Math.PI*2); ctx.fill();
    }
    const wetT = lifeT < 0.05 ? 1 - (lifeT/0.05) : 0;
    if(wetT > 0 && d.blobs.length){
      const biggest = d.blobs.reduce((a,b) => b.r > a.r ? b : a);
      ctx.fillStyle = 'rgba(255,255,255,' + (wetT*0.08).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(d.x+biggest.dx - biggest.r*0.25, d.y+biggest.dy - biggest.r*0.3,
        biggest.r*0.35, biggest.r*0.2, -0.5, 0, Math.PI*2);
      ctx.fill();
    }
    const serumT = lifeT > 0.06 && lifeT < 0.45 && d.blobs.length >= POOL_SERUM_MIN_BLOBS ? Math.min(1, (lifeT - 0.06)/0.1) * Math.min(1, (0.45 - lifeT)/0.1) : 0;
    if(serumT > 0){ // POOL-SERUM-01: clot retraction squeezes a pale yellow serum ring out around a pool
      ctx.strokeStyle = 'rgba(214,190,120,' + (0.22*serumT*alpha).toFixed(3) + ')';
      for(const b3 of d.blobs){ ctx.lineWidth = Math.max(0.8, b3.r*0.16); ctx.beginPath(); ctx.arc(d.x+b3.dx, d.y+b3.dy, b3.r*1.06, 0, Math.PI*2); ctx.stroke(); }
    }
    const skeletonT = lifeT > 0.3 ? Math.min(0.4,(lifeT-0.3)) : 0;
    if(skeletonT > 0 && d.blobs.length){
      const rimColor = 'rgba(' + Math.round(r*0.78) + ',' + Math.round(g*0.78) + ',' + Math.round(b*0.78) + ',' + (alpha*0.55*skeletonT).toFixed(2) + ')';
      const coreColor = 'rgba(' + Math.round(r*1.12) + ',' + Math.round(g*1.05) + ',' + Math.round(b*1.05) + ',' + (alpha*0.5*skeletonT).toFixed(2) + ')';
      ctx.strokeStyle = rimColor;
      ctx.fillStyle = coreColor;
      for(const b2 of d.blobs){
        const bx = d.x+b2.dx, by = d.y+b2.dy, br = b2.r;
        ctx.lineWidth = Math.max(1, br*0.28);
        ctx.beginPath(); ctx.arc(bx, by, br*0.86, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, br*0.62, 0, Math.PI*2); ctx.fill();
      }
    }
  }
}
function spawnParticles(x,y,color,count,gravity,friction,pools,coneAngle,coneSpread,sizeMin,isBlood){
  if(isBlood && !bloodDropletsEnabled) return;
  gravity = gravity || 0;
  const baseSize = sizeMin !== undefined ? sizeMin : 2;
  for(let i=0;i<count;i++){
    const p = particles[particleIndex];
    particleIndex = (particleIndex+1) % PARTICLE_COUNT;
    const angle = coneAngle !== undefined ? coneAngle + (Math.random()-0.5)*coneSpread : Math.random()*Math.PI*2;
    const speed = 40 + Math.random()*90;
    p.active = true; p.x = x; p.y = y;
    p.vx = Math.cos(angle)*speed; p.vy = Math.sin(angle)*speed;
    p.gravity = gravity; p.isGib = false; p.isBlood = !!isBlood; p.isStream = false; p.isRing = false; p.isBeam = false; p.isSwingArc = false;
    p.life = p.maxLife = 300 + Math.random()*250;
    p.color = color; p.size = baseSize + Math.random()*baseSize;
    p.friction = friction || 0.93; p.pooled = false; p.canPool = !!pools;
    p.stainsOnSettle = !!pools && Math.random() < BLOOD_SETTLE_STAIN_SHARE; // BLOOD-LEAN-01: only some droplets that settle leave a stain
  }
}
function spawnShockring(x, y, color, maxRadius, angle, arcSpan){
  const p = particles[particleIndex];
  particleIndex = (particleIndex+1) % PARTICLE_COUNT;
  p.active = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.gravity = 0;
  p.isGib = false; p.isBlood = false; p.isStream = false; p.isRing = true; p.isBeam = false; p.isSwingArc = false;
  p.life = p.maxLife = 180 + Math.random()*60;
  p.color = color; p.size = maxRadius || 26;
  p.ringAngle = angle;
  p.ringArc = arcSpan;
  p.friction = 1; p.canPool = false; p.pooled = false;
}
function spawnHolyBeam(x, y, color){
  const p = particles[particleIndex];
  particleIndex = (particleIndex+1) % PARTICLE_COUNT;
  p.active = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.gravity = 0;
  p.isGib = false; p.isBlood = false; p.isStream = false; p.isRing = false; p.isBeam = true; p.isSwingArc = false;
  p.life = p.maxLife = 400 + Math.random()*80;
  p.color = color; p.size = 240; // how far above the target the beam extends
  p.friction = 1; p.canPool = false; p.pooled = false;
  spawnShockring(x, y, hexToRgba('#e6bb61', 0.45), 20 + Math.random()*8); // landing flash where the beam actually strikes
}
function spawnSwingArcGuide(x, y, baseAngle, arcDir, radius){
  const p = particles[particleIndex];
  particleIndex = (particleIndex+1) % PARTICLE_COUNT;
  p.active = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.gravity = 0;
  p.isGib = false; p.isBlood = false; p.isStream = false; p.isRing = false; p.isBeam = false; p.isSwingArc = true;
  p.life = p.maxLife = 260 + Math.random()*60; // quick — a real blade's swept path is only visible for an instant
  p.color = '#ffffff';
  p.friction = 1; p.canPool = false; p.pooled = false;
  p.arcBaseAngle = baseAngle; p.arcDir = arcDir; p.arcRadius = radius || 26;
}
function updateParticles(dt){
  for(const p of particles){
    if(!p.active) continue;
    p.life -= dt;
    if(p.life <= 0){ p.active = false; continue; }
    if(p.isStream){ p.prevX = p.x; p.prevY = p.y; } // track trail start for line rendering
    p.x += p.vx*dt/1000; p.y += p.vy*dt/1000;
    if(p.gravity) p.vy += p.gravity*dt/1000; // directional drip/spray instead of a uniform radial burst
    if(p.isGib){
      p.rot += p.rotSpeed*dt/1000; // tumbling as it flies
      p.rotSpeed *= p.friction;
      const REST = 0.42;
      if(p.x < 4 && p.vx < 0){ p.x = 4; p.vx *= -REST; }
      else if(p.x > WORLD_MAX_W-4 && p.vx > 0){ p.x = WORLD_MAX_W-4; p.vx *= -REST; }
      if(p.y < 4 && p.vy < 0){ p.y = 4; p.vy *= -REST; }
      else if(p.y > WORLD_MAX_H-4 && p.vy > 0){ p.y = WORLD_MAX_H-4; p.vy *= -REST; }
    }
    p.vx *= p.friction; p.vy *= p.friction;
    if(p.canPool && !p.pooled && !p.isGib && p.vx*p.vx + p.vy*p.vy < 36){
      p.pooled = true; // settled: a share of droplets leave a permanent stain instead of just fading out mid-air (BLOOD-LEAN-01)
      if(p.stainsOnSettle) spawnDecal(p.x, p.y, hexToRgba(p.color, 0.5), true, undefined, undefined, undefined, undefined, BLOOD_SETTLE_STAIN_SIZE, undefined, true);
    }
  }
}
function bloodSizeRoll(){
  const roll = -Math.log(Math.max(0.0001, Math.random()));
  return Math.min(4.5, 0.6 + roll * 0.7);
}
function spawnBloodStream(x, y, angle, count, sizeMult, brightColor, darkColor, victim){
  if(!bloodDropletsEnabled) return;
  const weightScale = victim ? bloodPoolSizeScale(victim.radius) : 1, dropScale = Math.sqrt(weightScale);
  sizeMult = sizeMult || bloodSizeRoll();
  const scaledCount = Math.max(1, Math.round(count * Math.min(2.5, sizeMult) * weightScale));
  for(let i=0;i<scaledCount;i++){
    const p = particles[particleIndex];
    particleIndex = (particleIndex+1) % PARTICLE_COUNT;
    const jitter = angle + (Math.random()-0.5)*0.5;
    const speed = (180 + Math.random()*160) * Math.min(1.8, 0.7+sizeMult*0.3) * dropScale;
    p.active = true; p.x = x; p.y = y; p.prevX = x; p.prevY = y;
    p.vx = Math.cos(jitter)*speed; p.vy = Math.sin(jitter)*speed;
    p.gravity = 340; p.isGib = false; p.isBlood = true; p.isStream = true; p.isRing = false; p.isBeam = false; p.isSwingArc = false;
    p.life = p.maxLife = (380 + Math.random()*220) * Math.min(2.2, 0.7+sizeMult*0.4) * dropScale; // longer streams for bigger splatters
    p.color = Math.random() < 0.6 ? (brightColor || '#a01818') : (darkColor || '#7a0f0f');
    p.size = (1.5 + Math.random()*1.5) * Math.min(2, 0.8+sizeMult*0.25) * dropScale; // thicker for bigger splatters
    p.friction = 0.93; p.canPool = false; p.pooled = false;
  }
}
// GORE-EXPLOSION-01: A one-hit kill sometimes bursts into a forensic droplet cloud.
const GORE_EXPLOSION_CHANCE = 0.06, FORENSIC_DROPLET_COUNT = 700, FORENSIC_PX_PER_METER = 28, FORENSIC_GRAVITY_PX = 9.81*FORENSIC_PX_PER_METER;
const FORENSIC_TERMINAL_PX = 7.65*FORENSIC_PX_PER_METER, FORENSIC_MAX_STAIN_ASPECT = 8, FORENSIC_STEP_S = 1/120;
const forensicDroplets = Array.from({ length: FORENSIC_DROPLET_COUNT }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, diameter: 1, color: '#a01818', rgb: null, ageS: 0 }));
let forensicDropletIndex = 0;
// FORENSIC-TERMINAL-02: terminal speed scales with the square root of drop diameter, so 7.65 m/s is the ceiling for large drops and fine mist hangs and drifts.
const FORENSIC_REFERENCE_DIAMETER_PX = 3, FORENSIC_MIN_TERMINAL_SHARE = 0.3;
const FORENSIC_TIME_SCALE = 3; // FORENSIC-PROMPT-LAND-01
function forensicTerminalPxFor(diameterPx){
  return FORENSIC_TERMINAL_PX*clampNum(Math.sqrt(diameterPx/FORENSIC_REFERENCE_DIAMETER_PX), FORENSIC_MIN_TERMINAL_SHARE, 1);
}
// FORENSIC-CLASS-01: drop size follows launch speed the way bloodstain velocity classes do.
const FORENSIC_HIGH_VELOCITY_MS = 7.65, FORENSIC_MIN_DROP_PX = 0.28, FORENSIC_BACKSPATTER_SPEED_SHARE = 0.6;
function forensicDropletSizeFactor(speedMs){
  return clampNum(1.45 - 0.4*Math.log(1 + speedMs/1.5), 0.3, 1.45);
}
function launchAtomizedMist(x, y, z, speedMs, headingRad, elevationRad, baseDiameterPx, color, victim){
  launchForensicDroplet(x, y, z, speedMs*(0.75 + Math.random()*0.35), headingRad + (Math.random() - 0.5)*0.22, elevationRad + (Math.random() - 0.5)*0.2, Math.max(FORENSIC_MIN_DROP_PX, baseDiameterPx*0.55), color, victim);
}
function launchForensicDroplet(x, y, z, speedMs, headingRad, elevationRad, diameterPx, color, victim){
  if(!bloodDropletsEnabled) return;
  const droplet = forensicDroplets[forensicDropletIndex];
  forensicDropletIndex = (forensicDropletIndex + 1) % FORENSIC_DROPLET_COUNT;
  const speedPx = speedMs*FORENSIC_PX_PER_METER, horizontal = Math.cos(elevationRad)*speedPx;
  droplet.active = true; droplet.x = x; droplet.y = y; droplet.z = z;
  droplet.vx = Math.cos(headingRad)*horizontal; droplet.vy = Math.sin(headingRad)*horizontal; droplet.vz = Math.sin(elevationRad)*speedPx;
  droplet.terminalPx = forensicTerminalPxFor(diameterPx); droplet.dragK = FORENSIC_GRAVITY_PX/(droplet.terminalPx*droplet.terminalPx);
  droplet.diameter = diameterPx; droplet.color = color; droplet.rgb = parseColorToRgba(color); droplet.ageS = 0;
  droplet.victim = victim || null; droplet.victimId = victim ? victim.id : undefined;
  droplet.originX = x; droplet.originY = y; droplet.originZ = z;
}
function spawnGoreExplosion(x, y, bio, sourceTower, goreScale, lowDetail, victim, incomingAngle, profileKey){
  if(!goreMode || !bio || bio.isDust || (victim && victim.isHutBuilding)) return;
  spawnForensicSpatter(x,y,bio,sourceTower,1.35,true,goreScale,lowDetail,victim,incomingAngle,profileKey);
  spawnGibs(x,y,Math.round((lowDetail ? 4 : 9)*Math.min(1.5,goreScale)));
  playSound('gore_death',x,undefined,y);
}
// FORENSIC-SPATTER-01: every hit and kill launches droplets through the forensic physics above, not only the rare gore explosion.
// WEAPON-FORENSICS-01: authored mechanism-informed effects; not medical identification.
function weaponBloodProfile(shape, marks, reach, width, aspect, count, speedMin, speedSpan, spread, backShare){
  const local = shape === 'LOCAL';
  return Object.freeze({ shape, marks, reach, width, aspect, count, speedMin, speedSpan, spread, backShare,
    mechanism:shape, elevationBase:local ? -0.35 : 0.05, elevationSpan:local ? 0.15 : 0.6,
    diameterMin:Math.max(0.35,width*0.55), diameterSpan:Math.max(0.25,width*0.6) });
}
const WEAPON_BLOOD_PROFILES = Object.freeze({
  SWORDSMAN:weaponBloodProfile("SWORD",5,15,1.8,2.0,9,5,6,0.65,0.1),
  AXEMAN:weaponBloodProfile("ARC",3,11,2.2,1.8,7,4,5,0.62,0.1),
  AXE_THROWN:weaponBloodProfile("AXIS",3,15,1.9,2.6,6,5,5,0.32,0.22),
  BERSERKER:weaponBloodProfile("ARC",4,19,2.5,2.1,10,5.5,6,0.9,0.12),
  SPEARMAN:weaponBloodProfile("AXIS",3,17,1.4,3.1,7,5,6,0.23,0.35),
  LANCER:weaponBloodProfile("AXIS",3,23,1.3,3.8,8,6,7,0.16,0.3),
  HAMMERMAN:weaponBloodProfile("FAN",4,9,2.6,1.2,10,2.5,4,Math.PI,0.05),
  PALADIN:weaponBloodProfile("FAN",3,7,2.0,1.3,7,2.2,3,1.05,0.03),
  NINJA:weaponBloodProfile("AXIS",2,8,0.7,2.7,3,3.5,4,0.2,0.12),
  CRAZY_CHEF:weaponBloodProfile("AXIS",3,12,1.1,3.0,4,4,4.5,0.36,0.17),
  ARCHER:weaponBloodProfile("AXIS",5,22,1.7,3.2,7,3,5,0.35,0.3),
  BLOWDART:weaponBloodProfile("AXIS",1,4,0.55,1.5,2,1.1,1.8,0.12,0.1),
  BLOW_GUNNER:weaponBloodProfile("AXIS",2,6,0.7,1.7,3,1.5,2.3,0.27,0.14),
  SQUIRTGUN:weaponBloodProfile("LOCAL",2,3,1.4,1.1,3,0.35,0.7,1.3,0),
  GATLING:weaponBloodProfile("AXIS",2,12,0.65,2.5,3,8,7,0.18,0.18),
  GUNALINDER:weaponBloodProfile("AXIS",3,15,0.9,2.9,5,9,8,0.34,0.24),
  MARKSMAN:weaponBloodProfile("AXIS",3,22,0.65,3.5,8,13,10,0.2,0.2),
  SNIPER:weaponBloodProfile("AXIS",3,29,0.5,4.4,10,14,12,0.12,0.25),
  GLAIVE:weaponBloodProfile("AXIS",4,20,1.0,3.2,8,10,10,0.48,0.2),
  BOMBER:weaponBloodProfile("FAN",4,18,1.6,2.0,10,4,7,1.25,0.03),
  MERCHANT:weaponBloodProfile("FAN",2,5,1.25,1.2,3,1,2,1.15,0.05),
  MAGE:weaponBloodProfile("FAN",6,22,2.0,1.8,8,6,8,0.78,0.08),
  SNAPCASTER:weaponBloodProfile("FAN",2,10,0.8,2.2,4,5,6,0.42,0.06),
  CLERIC:weaponBloodProfile("LOCAL",2,2,1.3,1.05,3,0.3,0.5,0.8,0),
  POPE:weaponBloodProfile("LOCAL",3,5,1.1,1.15,4,0.5,0.8,2.1,0),
  NECROMANCER:weaponBloodProfile("LOCAL",2,4,1.2,1.3,4,1,1.5,0.65,0.02),
  SKELETON_CONTACT:weaponBloodProfile("ARC",2,7,1.1,2.2,4,2.5,3,0.48,0.1),
  CAT_SNAPPER:weaponBloodProfile("CLAW",3,5,0.7,3.2,3,1.8,2,0.3,0.02),
  PROTON:weaponBloodProfile("AXIS",3,18,0.75,3.3,6,7,9,0.25,0.1),
  DARK_MATTER:weaponBloodProfile("LOCAL",2,3.5,1.5,1.25,3,0.6,1.2,0.95,0.02),
  QUASAR:weaponBloodProfile("FAN",4,16,0.85,2.4,8,7,9,1.0,0.06),
  ENVIRONMENT:weaponBloodProfile("LOCAL",1,1,1.0,1.0,2,0.2,0.4,1.8,0),
  HACKER:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0),
  BARRICADE:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0),
  LOG_MILL:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0),
  STONE_QUARRY:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0),
  VAULT:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0)
});
function forensicSpatterProfile(sourceTower, profileKey){
  return WEAPON_BLOOD_PROFILES[profileKey || (sourceTower && sourceTower.type)] || WEAPON_BLOOD_PROFILES.ENVIRONMENT;
}
const FLINCH_ACCENT_TURNS = 1.25; // WILLIAMS-ACCENT-01 (Williams, Animator's Survival Kit: a hard accent snaps to the extreme, then springs back past rest before it settles)
function flinchAccentCurve(progress){
  return (1 - progress) * Math.cos(progress * Math.PI * FLINCH_ACCENT_TURNS);
}
function weaponBloodAngle(victim, sourceTower, incomingAngle){
  return Number.isFinite(incomingAngle) ? incomingAngle : sourceTower ? Math.atan2(victim.y-sourceTower.y,victim.x-sourceTower.x) : Math.PI/2;
}
const STICKMAN_BLOOD = Object.freeze({ bright:'#c1121f', dark:'#6b0f1a', spray:'#e5383b', isDust:false, viscous:false });
const STICKMAN_RAGE_CHANCE = 0.05, STICKMAN_RAGE_MS = 6000, STICKMAN_RAGE_DAMAGE = 1.3, STICKMAN_RAGE_SPEED = 1.25;
const RAGE_STEAM_CYCLE_MS = 700;
// STICKMAN-WOUND-01: a stickman struck by an enemy bleeds with the same spatter, stains and droplets as an enemy does, thrown away from the attacker.
function spawnStickmanWound(tower, attacker, damage){
  if(!goreMode) return;
  const angle = Math.atan2(tower.y - attacker.y, tower.x - attacker.x);
  const power = clampNum(0.45 + damage / Math.max(1, tower.maxHp) * 5, 0.45, 1.5);
  spawnForensicSpatter(tower.x, tower.y, STICKMAN_BLOOD, null, power, false, 1, graphicsQuality === 'low' || underHeavyVisualLoad, tower, angle);
  spawnParticles(tower.x, tower.y, STICKMAN_BLOOD.bright, Math.max(2, Math.round(5 * power)), 110, 0.9, true, angle, 0.9, undefined, true);
}
const BLUNT_FIRST_BLOW_SHARE = 0.3, BLUNT_EXPOSURE_PER_BLOW = 0.35; // BLUNT-EXPOSURE-01: a first blunt blow rarely spatters; blood must be exposed before later blows throw it (James ch.7)
function spawnWeaponBloodContact(victim, sourceTower, incomingAngle, profileKey){
  if(!goreMode || victim.isHutBuilding) return;
  const bio = victim.bloodProfile || getBloodProfile(victim.type);
  if(!bio || bio.isDust) return;
  const profile = forensicSpatterProfile(sourceTower,profileKey);
  if(profile.shape === 'NONE') return;
  // Multiple simulation hits in one displayed frame share one contact signature per weapon.
  const key=profileKey || (sourceTower && sourceTower.type) || 'ENVIRONMENT';
  if(victim.lastCoreBloodClock === presentationTime && victim.lastCoreBloodKey === key && victim.lastCoreBloodSerial === victim.spawnSerial) return;
  victim.lastCoreBloodClock=presentationTime; victim.lastCoreBloodKey=key; victim.lastCoreBloodSerial=victim.spawnSerial;
  if(profile.shape === 'SWORD'){ spawnSwordsmanBloodArc(victim,sourceTower); return; }
  if(key === 'MAGE'){
    const heading=weaponBloodAngle(victim,sourceTower,incomingAngle), scale=bloodPoolSizeScale(victim.radius);
    for(let n=0;n<3;n++) spawnBloodCastoff(victim.x,victim.y,heading+(n-1)*0.48+(Math.random()-0.5)*0.18,hexToRgba(bloodTintForFire(victim,bio.bright),0.85),1,scale*(0.9+n*0.25),victim,Math.sqrt(scale)*1.5);
  }
  const weight = Math.sqrt(bloodPoolSizeScale(victim.radius));
  const heading = weaponBloodAngle(victim,sourceTower,incomingAngle);
  const color = hexToRgba(bloodTintForFire(victim,bio.bright),0.88), rgb = parseColorToRgba(color);
  const arcDir = sourceTower ? towerSwingDir(sourceTower) : 1;
  if(profile.shape === 'ARC'){
    spawnCastOffTrail(victim, heading, sourceTower ? clampNum(Math.hypot(victim.x-sourceTower.x, victim.y-sourceTower.y), victim.radius*1.2, 120) : Math.max(victim.radius*1.2, profile.reach*1.5), arcDir, color, profile);
    return;
  }
  if(victim.bluntContactSerial !== victim.spawnSerial){ victim.bluntContactSerial = victim.spawnSerial; victim.bluntContacts = 0; }
  const exposedMarks = profile.shape === 'FAN' ? Math.max(1, Math.round(profile.marks*Math.min(1, BLUNT_FIRST_BLOW_SHARE + BLUNT_EXPOSURE_PER_BLOW*victim.bluntContacts++))) : profile.marks;
  for(let i=0;i<exposedMarks;i++){
    const t = exposedMarks === 1 ? 0.5 : i/(exposedMarks-1);
    let angle = heading, distance = victim.radius*0.8 + profile.reach*(0.3+t*0.7)*weight;
    let offset = 0;
    if(profile.shape === 'CLAW'){ offset = (i-1)*2.5*weight; distance = victim.radius*0.6 + profile.reach*weight; }
    else if(profile.shape === 'LOCAL'){ angle += i*2.39996; distance = profile.reach*(0.4+t*0.6)*weight; }
    else if(profile.shape === 'FAN'){ angle += (t-0.5)*profile.spread*2; }
    else if(i === 0 && profile.marks > 1 && profile.backShare > 0){ angle += Math.PI; distance *= 0.45; }
    else angle += (t-0.5)*profile.spread;
    const width = profile.width*weight*(0.85+Math.random()*0.3);
    const len = width*profile.aspect*(0.9+t*0.2);
    const travel = angle;
    const decal = { x:victim.x+Math.cos(angle)*distance-Math.sin(heading)*offset,
      y:victim.y+Math.sin(angle)*distance+Math.cos(heading)*offset,
      color,rgb,isDrop:true,angle:travel,len,width,footprintRadius:Math.max(len,width),
      lifespan:DECAL_LIFESPAN*decalLifespanVariance(),spawnTime:presentationTime };
    if(!bloodDecalBlocked(decal,victim.x,victim.y,victim)) pushDecal(decal);
  }
}
function spawnForensicSpatter(x, y, bio, sourceTower, hitPower, isKill, goreScale, lowDetail, victim, incomingAngle, profileKey){
  if(!goreMode || !bloodDropletsEnabled || !bio || bio.isDust || (victim && victim.isHutBuilding)) return;
  const bloodWeightScale = victim ? bloodPoolSizeScale(victim.radius) : 1;
  const profile = forensicSpatterProfile(sourceTower, profileKey);
  if(profile.shape === 'NONE') return;
  const sprayAngle = weaponBloodAngle(victim || {x,y}, sourceTower, incomingAngle);
  const killMult = isKill ? 2.6*Math.min(1.5, goreScale) : Math.sqrt(bloodWeightScale);
  const dropletCount = Math.max(1, Math.round(profile.count*1.18*Math.min(1.4, 0.35 + hitPower*0.7)*killMult*(lowDetail ? 0.4 : 1))); // BLOOD-READABILITY-01: modest volume increase, existing weight dimensions retained
  const bodyHeightPx = 1.1*FORENSIC_PX_PER_METER*bloodWeightScale;
  if(!isKill){
    // Fine contact drops appear immediately rather than depending on the wide spray's flight.
    const contactCount = Math.max(1,Math.round((lowDetail ? 1 : 2)*bloodWeightScale));
    for(let n=0;n<contactCount;n++) launchForensicDroplet(x,y,bodyHeightPx*0.25,1.2*Math.sqrt(bloodWeightScale),sprayAngle+(Math.random()-0.5)*1.2,0.2,0.65*Math.sqrt(bloodWeightScale),bio.bright,victim);
  }
  if(victim && !isKill){
    const woundRgb = parseColorToRgba(bio.bright), woundCount = 1 + Math.round(hitPower*2);
    for(let mark = 0; mark < woundCount; mark++) stainEntity(victim, Math.cos(sprayAngle + Math.PI)*victim.radius*0.7 + (Math.random() - 0.5)*victim.radius*0.6, (Math.random() - 0.5)*victim.radius*1.1, (1 + Math.random()*1.4 + hitPower)*bloodWeightScale, woundRgb, sprayAngle);
  }
  for(let drop = 0; drop < dropletCount; drop++){
    const color = Math.random() < 0.6 ? bio.bright : bio.dark;
    const backSpatter = Math.random() < profile.backShare;
    const castoff = profile.shape === 'ARC' || profile.shape === 'SWORD';
    const launchAxis = castoff ? sprayAngle + Math.PI/2*(sourceTower ? towerSwingDir(sourceTower) : 1) : sprayAngle;
    const heading = (backSpatter ? launchAxis + Math.PI : launchAxis) + (Math.random() - 0.5)*2*profile.spread;
    const weightRoot = Math.sqrt(bloodWeightScale), launchHeight = bodyHeightPx*(0.35 + Math.random()*0.8);
    const speedMs = (profile.speedMin + Math.random()*profile.speedSpan)*weightRoot*(backSpatter ? FORENSIC_BACKSPATTER_SPEED_SHARE : 1);
    const elevation = profile.elevationBase + Math.random()*profile.elevationSpan;
    const baseDiameter = (profile.diameterMin + bloodSizeRoll()*0.25 + Math.random()*profile.diameterSpan*0.5)*weightRoot;
    const diameter = Math.max(FORENSIC_MIN_DROP_PX, baseDiameter*(castoff ? 1 : forensicDropletSizeFactor(speedMs)));
    launchForensicDroplet(x, y, launchHeight, speedMs, heading, elevation, diameter, color, victim);
    if(profile.shape === 'AXIS' && speedMs > FORENSIC_HIGH_VELOCITY_MS && !lowDetail) launchAtomizedMist(x, y, launchHeight, speedMs, heading, elevation, diameter, color, victim);
  }
}
function spawnArterialBeat(x, y, bio, headingRad, beatIntensity, lowDetail, victim){
  if(!bio || bio.isDust) return;
  const weightScale = victim ? bloodPoolSizeScale(victim.radius) : 1, dropScale = Math.sqrt(weightScale);
  const dropletCount = Math.max(1, Math.round((2 + beatIntensity*3)*weightScale*(lowDetail ? 0.5 : 1)));
  for(let drop = 0; drop < dropletCount; drop++) launchForensicDroplet(x, y, 0.9*FORENSIC_PX_PER_METER*weightScale, (1.8 + Math.random()*1.8 + beatIntensity)*dropScale, headingRad + (Math.random() - 0.5)*0.35, 0.45 + Math.random()*0.5, (1 + Math.random()*0.8)*dropScale, Math.random() < 0.7 ? bio.bright : bio.dark, victim);
}
// BLOOD-TRAIL-01: a wounded animal leaves a trail you can follow.
const BLOOD_TRAIL_BASE_SPACING_PX = 20, BLOOD_TRAIL_STILL_DRIP_MS = 420;
function updateBloodTrails(dt){
  if(!goreMode) return;
  const lowDetail = graphicsQuality === 'low' || underHeavyVisualLoad;
  for(const enemy of enemyPool){
    if(!enemy.active || enemy.escaped || enemy.isHutBuilding) continue;
    const bio = enemy.bloodProfile;
    if(!bio || bio.isDust) continue;
    const bleeding = enemy.bleedUntil > gameTime && enemy.bleedStackCount > 0, hurtFraction = 1 - clampNum(enemy.hp / enemy.maxHp, 0, 1);
    if(!bleeding && hurtFraction < 0.6){ enemy.trailX = undefined; continue; }
    if(enemy.trailX === undefined){ enemy.trailX = enemy.x; enemy.trailY = enemy.y; enemy.trailAccumPx = 0; enemy.trailStillMs = 0; continue; }
    const stepX = enemy.x - enemy.trailX, stepY = enemy.y - enemy.trailY, stepPx = Math.hypot(stepX, stepY);
    enemy.trailX = enemy.x; enemy.trailY = enemy.y;
    const stacks = bleeding ? Math.max(1, enemy.bleedStackCount) : 0.8;
    const clot = bleeding ? 0.55 + 0.45*clampNum((enemy.bleedUntil - gameTime)/Math.max(1, enemy.bleedUntil - enemy.bleedStartedAt), 0, 1) : 0.5;
    const weightScale = bloodPoolSizeScale(enemy.radius), dropScale = Math.sqrt(weightScale);
    const flow = clampNum(stacks*clot*(0.8 + hurtFraction), 0.4, 3.5);
    const dropColor = Math.random() < 0.7 ? bio.bright : bio.dark;
    if(stepPx > 0.12){
      enemy.trailStillMs = 0; enemy.trailAccumPx += stepPx;
      const spacing = BLOOD_TRAIL_BASE_SPACING_PX/(flow*weightScale)*(lowDetail ? 1.8 : 1);
      if(enemy.trailSpacingRoll === undefined) enemy.trailSpacingRoll = 0.45 + Math.random()*1.1;
      if(enemy.trailAccumPx >= spacing*enemy.trailSpacingRoll){
        enemy.trailAccumPx -= spacing*enemy.trailSpacingRoll; enemy.trailDropCount++;
        enemy.trailSpacingRoll = Math.random() < 0.15 ? 0.2 + Math.random()*0.3 : 0.45 + Math.random()*1.1;
        const speedPx = Math.hypot(enemy.vx || 0, enemy.vy || 0), heading = speedPx > 1 ? Math.atan2(enemy.vy, enemy.vx) : Math.atan2(stepY, stepX);
        const woundHeightPx = (0.45 + Math.random()*0.5)*FORENSIC_PX_PER_METER*weightScale, dropDiameter = (1.3 + Math.min(1.6, flow*0.5) + Math.random()*0.8)*dropScale;
        // BLOOD-TRAIL-SCATTER-01: a walking wound swings with the gait, so drops leave the body at alternating offsets across the line of travel, at irregular spacing and with a few degrees of drift, rather than along one ruler-straight line.
        enemy.trailGaitSide = enemy.trailGaitSide === 1 ? -1 : 1;
        const lateralPx = (enemy.trailGaitSide*(0.12 + Math.random()*0.3) + (Math.random() - 0.5)*0.25)*enemy.radius;
        const dropX = enemy.x - Math.sin(heading)*lateralPx, dropY = enemy.y + Math.cos(heading)*lateralPx;
        launchForensicDroplet(dropX, dropY, woundHeightPx, speedPx/FORENSIC_PX_PER_METER*(0.85 + Math.random()*0.3), heading + (Math.random() - 0.5)*0.55, 0, dropDiameter, dropColor, enemy);
        if(enemy.trailDropCount % 4 === 0 && !lowDetail) for(let satellite = 0; satellite < 2; satellite++) launchForensicDroplet(enemy.x, enemy.y, woundHeightPx, speedPx/FORENSIC_PX_PER_METER*(0.8 + Math.random()*0.4), heading + (Math.random() - 0.5)*0.9, 0.05 + Math.random()*0.2, (0.7 + Math.random()*0.5)*dropScale, dropColor, enemy);
      }
    } else {
      enemy.trailStillMs += dt;
      if(enemy.trailStillMs >= BLOOD_TRAIL_STILL_DRIP_MS/(flow*weightScale)){
        enemy.trailStillMs = 0;
        launchForensicDroplet(enemy.x + (Math.random() - 0.5)*5*dropScale, enemy.y + (Math.random() - 0.5)*3*dropScale, (0.15 + Math.random()*0.45)*FORENSIC_PX_PER_METER*weightScale, 0, Math.random()*Math.PI*2, 0, (2 + Math.min(2, flow*0.6) + Math.random()*0.8)*dropScale, dropColor, enemy);
      }
    }
  }
}
// BLOOD-VOID-01: a body that stands between a wound and the ground catches the droplets that would have landed behind it, which leaves a clean patch (a void pattern) in the spatter and blood on the body itself.
const STICKMAN_STAIN_DRAW_MAX = 16, BLOOD_STAIN_MAX = 64, STATIC_STAIN_LOW_QUALITY_MAX = 6, BLOOD_STAIN_LIFE_MS = 75000;
const VOID_BODY_HEIGHT_PX = 1.1*FORENSIC_PX_PER_METER, BLOCKER_BOUNDS_PAD_PX = 40;
function stainEntity(entity, offsetX, offsetY, size, rgb, angle){
  if(!entity.bloodStains) entity.bloodStains = [];
  const stain = { offsetX, offsetY, size, rgb, angle, lifespan:bloodMarkLifespan(), bornAt: presentationTime };
  if(waveState==='IDLE' && wavesCompleted>0){stain.cleanupStarted=true;stain.lifespan=18000;stain.bornAt=presentationTime-12000;}
  entity.bloodStainRevision=(entity.bloodStainRevision || 0)+1;
  if(entity instanceof Tower && isFighterTower(entity)) bindStickmanStain(entity,stain);
  if(entity.bloodStains.length < BLOOD_STAIN_MAX) entity.bloodStains.push(stain);
  else { entity.bloodStains.shift(); entity.bloodStains.push(stain); } // BLOOD-LAYER-01: the oldest mark leaves, the newest always lands on top
}
function drawBloodStains(ctx, entity){
  if(!goreMode || (entity instanceof Tower && isFighterTower(entity))) return;
  if(Number.isFinite(entity.gx) && Number.isFinite(entity.gy)){
    if(!entity.bloodStains || !entity.bloodStains.length) return;
    const size = sceneryVisualSize(entity), emoji = sceneryEmojiFor(entity, CONFIG.CHANCE_STRUCTURES[entity.type]);
    ctx.save();
    ctx.translate(entity.x, entity.y + size*0.5);
    ctx.scale((entity.flip ? -1 : 1)*(entity.widthStretch || 1), entity.tallStretch || 1);
    ctx.translate(0, -size*0.5 + 2);
    drawEmojiSurfaceBlood(ctx, entity, size, emoji, true);
    ctx.restore();
    return;
  }
  const stains = entity.bloodStains;
  if(!stains || !stains.length) return;
  const drawCap = graphicsQuality === 'low' ? STATIC_STAIN_LOW_QUALITY_MAX : BLOOD_STAIN_MAX; // STAIN-STEADY-01: the cap follows the quality setting only, so a barricade's marks never blink in and out as the frame load changes
  ctx.save();
  for(let index = Math.max(0, stains.length - drawCap); index < stains.length; index++){
    const stain = stains[index], ageT = bloodStainLifeT(stain);
    if(ageT >= 1) continue;
    ctx.globalAlpha = 0.88*bloodFadeAlpha(ageT);
    ctx.fillStyle = bloodStainPaint(stain);
    ctx.beginPath(); ctx.ellipse(entity.x + stain.offsetX, entity.y + stain.offsetY, Math.min(2,stain.size), Math.min(1.4,stain.size*0.7), stain.angle, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function forensicBlockerAlongPath(droplet){
  const fromX = droplet.originX, fromY = droplet.originY, pathX = droplet.x - fromX, pathY = droplet.y - fromY, pathLength = Math.hypot(pathX, pathY);
  if(pathLength < 3) return null;
  const directionX = pathX/pathLength, directionY = pathY/pathLength;
  let nearest = null, nearestAlong = Infinity;
  const consider = (entity, radius, heightPx, isEnemy, groundY = entity.y) => {
    const toX = entity.x - fromX, toY = groundY - fromY;
    if(droplet.victim ? entity === droplet.victim && entity.id === droplet.victimId : toX*toX + toY*toY < radius*radius*0.8) return;
    const along = toX*directionX + toY*directionY;
    if(along <= 0 || along >= pathLength + radius) return;
    const sideways = Math.abs(toX*directionY - toY*directionX);
    if(sideways >= radius) return;
    const rawEntry = along - Math.sqrt(radius*radius - sideways*sideways);
    const entryAlong = droplet.victim && rawEntry <= 0 ? 0.1 : rawEntry;
    if(entryAlong <= 0 || entryAlong >= pathLength || entryAlong >= nearestAlong) return;
    const heightAtBody = droplet.originZ*(1 - entryAlong/pathLength);
    if(heightAtBody > heightPx) return;
    nearest = { entity, along: entryAlong, height: heightAtBody, radius, isEnemy, groundY, sourceX:fromX, sourceY:fromY }; nearestAlong = entryAlong;
  };
  // BLOOD-SURFACES-01
  const boundsLeft = Math.min(fromX, droplet.x) - BLOCKER_BOUNDS_PAD_PX, boundsRight = Math.max(fromX, droplet.x) + BLOCKER_BOUNDS_PAD_PX;
  const boundsTop = Math.min(fromY, droplet.y) - BLOCKER_BOUNDS_PAD_PX, boundsBottom = Math.max(fromY, droplet.y) + BLOCKER_BOUNDS_PAD_PX;
  const outsideBounds = entity => entity.x < boundsLeft || entity.x > boundsRight || entity.y < boundsTop || entity.y > boundsBottom; // BLOCKER-BOUNDS-01: cheap box reject before the ray test
  for(const tower of towerPool) if(tower.active && !outsideBounds(tower)) consider(tower, tower.type === 'BARRICADE' ? 14 : 10, tower.type === 'BARRICADE' ? 20 : (24*(tower.buildScaleY || 1) + 7)*STICKMAN_SCALE*Math.sqrt(tower.weight)*(tower.isLegendary ? 1.1 : 1), false);
  for(const enemy of enemyPool) if(enemy.active && !outsideBounds(enemy)) consider(enemy, enemy.radius*0.8, enemy.radius*2, true);
  const tileLeft = Math.floor(boundsLeft/TILE_SIZE) - 1, tileRight = Math.floor(boundsRight/TILE_SIZE) + 1, tileTop = Math.floor(boundsTop/TILE_SIZE) - 1, tileBottom = Math.floor(boundsBottom/TILE_SIZE) + 1;
  for(let tileY = tileTop; tileY <= tileBottom; tileY++) for(let tileX = tileLeft; tileX <= tileRight; tileX++){
    const item = sceneryMap.get(tileX + ',' + tileY);
    if(!item) continue;
    const size = sceneryVisualSize(item), radius = size*0.4*(item.widthStretch || 1), groundY = item.y + size*0.5;
    if(item.x + radius < Math.min(fromX, droplet.x) || item.x - radius > Math.max(fromX, droplet.x) || groundY + radius < Math.min(fromY, droplet.y) || groundY - radius > Math.max(fromY, droplet.y)) continue;
    consider(item, radius, size*(item.tallStretch || 1), false, groundY);
  }
  for(const cat of catPool) if(cat.active && !outsideBounds(cat)) consider(cat, 12, 18, false);
  for(const skeleton of skeletonPool) if(skeleton.active && !outsideBounds(skeleton)) consider(skeleton, 8, 30, false);
  if(!nearest) return null;
  nearest.hitX = fromX + directionX*nearest.along; nearest.hitY = fromY + directionY*nearest.along;
  return nearest;
}
function bloodDecalBlocked(decal, originX, originY, victim, originZ = VOID_BODY_HEIGHT_PX){
  const blocker = forensicBlockerAlongPath({originX, originY, originZ, victim, victimId:victim ? victim.id : undefined, x:decal.x, y:decal.y});
  if(!blocker) return false;
  stainBloodBlocker(blocker, decal.width || 2, decal.rgb, decal.angle || 0);
  return true;
}
function stainBloodBlocker(blocker, diameter, rgb, angle){
  const body = blocker.entity;
  // Rear rock impacts still block the spray, but the camera cannot see that face.
  if(body.type === 'ROCK' && Number.isFinite(blocker.sourceY) && blocker.sourceY < blocker.groundY) return;
  const heightRatio = Math.min(1, blocker.height/VOID_BODY_HEIGHT_PX);
  stainEntity(body, clampNum(blocker.hitX - body.x, -blocker.radius, blocker.radius), blocker.isEnemy ? clampNum(blocker.radius*0.5 - heightRatio*blocker.radius*1.4, -blocker.radius, blocker.radius*0.6) : blocker.groundY - body.y - blocker.height, Math.max(0.9, diameter*0.7), rgb, angle);
}
function landForensicDroplet(droplet, speedPx){
  const blocker = forensicBlockerAlongPath(droplet);
  if(blocker){
    stainBloodBlocker(blocker, droplet.diameter, droplet.rgb, Math.atan2(droplet.vy, droplet.vx));
    droplet.active = false;
    return;
  }
  const sinImpact = clampNum(Math.abs(droplet.vz)/Math.max(0.001, Math.hypot(droplet.vx,droplet.vy,droplet.vz)), 1/FORENSIC_MAX_STAIN_ASPECT, 1);
  const impactAngle = Math.asin(sinImpact), stainLength = droplet.diameter/Math.sin(impactAngle);
  const decal = { x: droplet.x, y: droplet.y, color: droplet.color, rgb: droplet.rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
    isDrop: true, angle: Math.atan2(droplet.vy, droplet.vx), len: stainLength/2, width: droplet.diameter, footprintRadius: stainLength/2 };
  pushSprayDecal(decal);
  droplet.active = false;
}
// STAIN-SURFACE-01: the target surface, not fall height, decides edge character (James, Kish & Sutton ch. 5). Smooth stone keeps a clean edge;
// rough dirt ruptures the drop into spines with peripheral satellites; grass breaks it into beads on the blades.
const STAIN_SPINE_MIN_WIDTH_PX = 1.1, STAIN_SPINE_MAX = 5, STAIN_BEAD_MIN_WIDTH_PX = 1.4, WAVE_CASTOFF_MIN_ASPECT = 2.4, WAVE_CASTOFF_CHANCE = 0.6;
function bloodSurfaceAt(worldX, worldY){
  const tileX = Math.floor(worldX / TILE_SIZE), tileY = Math.floor(worldY / TILE_SIZE);
  if(pathCells.has(tileX + ',' + tileY)) return 'DIRT';
  return isInActiveRegion(tileX, tileY) ? 'GRASS' : 'DIRT';
}
function applyStainSurface(decal, surface, aspect){
  decal.tailScale = Math.min(2.4, 1.15 + 0.14*Math.max(0, aspect - 1));
  if(aspect >= WAVE_CASTOFF_MIN_ASPECT && Math.random() < WAVE_CASTOFF_CHANCE) decal.waveCastOff = 1.3 + Math.random()*0.5; // WAVE-CASTOFF-01: a 10-25 degree impact flips one satellite off the leading edge, its tail pointing back (Bevel & Gardner ch.4) // STAIN-TAIL-01: the parent tail points away from the origin and lengthens as the impact gets shallower
  if(surface === 'DIRT' && decal.width >= STAIN_SPINE_MIN_WIDTH_PX){
    const spineCount = 2 + Math.floor(Math.random()*(STAIN_SPINE_MAX - 1));
    decal.spines = [];
    for(let i = 0; i < spineCount; i++) decal.spines.push([(Math.random() - 0.5)*Math.PI*(aspect > 1.6 ? 0.9 : 2), 0.18 + Math.random()*0.32]);
  } else if(surface === 'GRASS' && decal.width >= STAIN_BEAD_MIN_WIDTH_PX){
    const beadCount = 2 + Math.floor(Math.random()*2);
    decal.beads = [];
    for(let i = 0; i < beadCount; i++) decal.beads.push([(Math.random() - 0.5)*1.6, (Math.random() - 0.5)*1.4, 0.3 + Math.random()*0.3]);
  }
}
function updateForensicDroplets(dtMs){
  let remainingS = Math.min(dtMs, 100)/1000*FORENSIC_TIME_SCALE;
  while(remainingS > 0){
    const stepS = Math.min(FORENSIC_STEP_S, remainingS);
    remainingS -= stepS;
    for(const droplet of forensicDroplets){
      if(!droplet.active) continue;
      droplet.ageS += stepS;
      droplet.vz -= FORENSIC_GRAVITY_PX*stepS;
      const speedPx = Math.hypot(droplet.vx, droplet.vy, droplet.vz), dragRetention = 1/(1 + droplet.dragK*speedPx*stepS); // DRAG-IMPLICIT-01: F = -k|v|v integrated implicitly, stable for fast mist
      droplet.vx *= dragRetention; droplet.vy *= dragRetention; droplet.vz *= dragRetention;
      if(droplet.vz < -droplet.terminalPx) droplet.vz = -droplet.terminalPx;
      const heightBefore = droplet.z;
      droplet.x += droplet.vx*stepS; droplet.y += droplet.vy*stepS; droplet.z += droplet.vz*stepS;
      if(droplet.z <= 0){
        const overshoot = heightBefore > 0 ? -droplet.z/(heightBefore - droplet.z) : 0;
        droplet.x -= droplet.vx*stepS*overshoot; droplet.y -= droplet.vy*stepS*overshoot; droplet.z = 0;
        landForensicDroplet(droplet, speedPx); continue;
      }
      if(droplet.ageS > 4 || droplet.x < 0 || droplet.y < 0 || droplet.x > WORLD_MAX_W || droplet.y > WORLD_MAX_H) droplet.active = false;
    }
  }
}
function drawForensicDroplets(ctx){
  if(!goreMode || !bloodDropletsEnabled) return;
  for(const droplet of forensicDroplets){
    if(!droplet.active) continue;
    ctx.fillStyle = droplet.color;
    ctx.beginPath(); ctx.arc(droplet.x, droplet.y - droplet.z, Math.max(0.6, droplet.diameter*0.5), 0, Math.PI*2); ctx.fill();
  }
}
/* =========================================================
   PARTICLES, MIST AND GIBS
   ========================================================= */
function spawnExpiratedMist(x, y){
  spawnParticles(x, y - 6, '#d99a9a', 10, 40, 0.9, false); // pale, air-diluted mist — lighter/pinker than normal blood, drifts rather than sprays hard
  spawnParticles(x, y - 6, 'rgba(255,255,255,0.55)', 4, 8, 0.85, false); // a few faint bubble specks, barely falling, fading almost in place
}
function spawnGibs(x, y, count){
  // chunky tumbling debris, heavier and slower than the fine blood spray — distinctly brutal
  for(let i=0;i<count;i++){
    const p = particles[particleIndex];
    particleIndex = (particleIndex+1) % PARTICLE_COUNT;
    const angle = Math.random()*Math.PI*2;
    const speed = 60 + Math.random()*110;
    p.active = true; p.x = x; p.y = y;
    p.vx = Math.cos(angle)*speed; p.vy = Math.sin(angle)*speed - 40; // slight upward pop before gravity takes over
    p.gravity = 420;
    p.isGib = true; p.isBlood = false; p.isStream = false; p.isRing = false; p.isBeam = false; p.isSwingArc = false; p.rot = Math.random()*Math.PI*2; p.rotSpeed = (Math.random()-0.5)*10;
    p.life = p.maxLife = 500 + Math.random()*350;
    p.color = Math.random() < 0.5 ? '#7a0f0f' : '#3a0505';
    p.size = 2.5 + Math.random()*3;
    p.friction = 0.93; p.canPool = false; p.pooled = false;
  }
}
function drawParticles(ctx){
  drawForensicDroplets(ctx);
  const fxBounds = fxViewBounds();
  perfStats.totalParticles = 0;
  perfStats.visibleParticles = 0;
  for(const p of particles){
    if(!p.active) continue;
    perfStats.totalParticles++;
    if(!fxVisible(p.x, p.y, fxBounds) && !(p.isStream && fxVisible(p.prevX, p.prevY, fxBounds))) continue;
    perfStats.visibleParticles++;
    ctx.globalAlpha = Math.max(0, p.life/p.maxLife);
    ctx.fillStyle = p.color;
    if(p.isGib){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size, p.size*2, p.size*2);
      ctx.restore();
    } else if(p.isStream){
      ctx.strokeStyle = p.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = p.size * Math.max(0.3, p.life/p.maxLife); // tapers as the stream loses momentum
      ctx.beginPath(); ctx.moveTo(p.prevX, p.prevY); ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if(p.isRing){
      const t = 1 - p.life/p.maxLife; // 0 (just spawned) -> 1 (about to expire)
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * (1-t); // thins out as it expands, like a real shockwave losing energy
      ctx.beginPath();
      if(p.ringAngle !== undefined && p.ringArc !== undefined){
        ctx.arc(p.x, p.y, p.size*t, p.ringAngle - p.ringArc/2, p.ringAngle + p.ringArc/2);
      } else {
        ctx.arc(p.x, p.y, p.size*t, 0, Math.PI*2);
      }
      ctx.stroke();
    } else if(p.isBeam){
      const fade = Math.max(0, p.life/p.maxLife);
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade*1.4);
      const grad = ctx.createLinearGradient(p.x, p.y-p.size, p.x, p.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.65, p.color);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p.x-3, p.y-p.size);
      ctx.lineTo(p.x+3, p.y-p.size);
      ctx.lineTo(p.x+15, p.y);
      ctx.lineTo(p.x-15, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if(p.isSwingArc){
      const fade = Math.max(0, p.life/p.maxLife);
      ctx.save();
      ctx.globalAlpha = fade*0.55;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.4;
      const span = 2.45; // ~140°
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.arcRadius, p.arcBaseAngle, p.arcBaseAngle + span*p.arcDir, p.arcDir < 0);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
/* =========================================================
   FLOATING TEXT
   ========================================================= */
const PARTICLE_COUNT = 300, TEXT_COUNT = 100;
const floatingTexts = Array.from({length: TEXT_COUNT}, () => ({active:false,x:0,y:0,text:'',color:'#fff',life:0,maxLife:0}));
let textIndex = 0;
const ITEM_POPUP_LIFE_MS = 1800; // item equip/stored popups stay up long enough to read
function spawnFloatingText(x,y,text,color,lifeMs){
  const t = floatingTexts[textIndex];
  textIndex = (textIndex+1) % TEXT_COUNT;
  t.active = true; t.x = x; t.y = y; t.text = text; t.color = color;
  t.life = t.maxLife = lifeMs || 550;
  t.isIcon = false; t.isXp = false; t.fontPx = 0;
}
// DAMAGE-TEXT-SCALE-01 (Schell ch15 channels/dimensions): number size carries hit weight; three fixed sizes keep the text-sprite cache small.
function scaleLastFloatingText(fraction){
  const t = floatingTexts[(textIndex + TEXT_COUNT - 1) % TEXT_COUNT];
  t.fontPx = fraction >= 0.25 ? 17 : fraction < 0.05 ? 11 : 0;
}
function spawnRoutineCombatText(x,y,text,color,lifeMs){
  if(isFastForwardSimplified()) return;
  spawnFloatingText(x,y,text,color,lifeMs);
}
function spawnXpText(x, y, amount, isLastHit){
  spawnFloatingText(x, y, '+' + amount, isLastHit ? '#ffd23f' : '#c9d1d9');
  const t = floatingTexts[(textIndex + TEXT_COUNT - 1) % TEXT_COUNT];
  t.life = t.maxLife = XP_TEXT_LIFE_MS;
  t.isXp = true;
}
function spawnTowerQuip(x,y,text){
  const t = floatingTexts[textIndex];
  textIndex = (textIndex+1) % TEXT_COUNT;
  t.active = true; t.x = x; t.y = y; t.text = text; t.color = '#ffe9a8';
  t.life = t.maxLife = 1800;
  t.isIcon = false; t.fontPx = 0;
}
function updateFloatingTexts(frameMs){
  for(const t of floatingTexts){
    if(!t.active) continue;
    t.life -= frameMs;
    if(t.life <= 0){ t.active = false; continue; }
    if(!t.isIcon) t.y -= 22*frameMs/1000; // plain combat text drifts upward; icons stay put and animate in place instead
  }
}
/* =========================================================
   COINS AND AMBIENT LOGS
   ========================================================= */
const COIN_COUNT = 96;
const coinPickups = Array.from({length: COIN_COUNT}, () => ({active:false,x:0,y:0,vx:0,vy:0,value:0,age:0,lifespan:0,z:0,vz:0,airborne:false,flightMs:0}));
let coinIndex = 0, coinPoolMayShrink = false;
// CHEST-FOUNTAIN-01: A cleared treasure chest throws a fountain of coins

const CHEST_FOUNTAIN_COIN_COUNT = 6; // CHEST-BURST-02
const COIN_GRAVITY_PX_PER_S2 = 900;
const COIN_EMOJI_PX = 12;
const COIN_PICKUP_MIN_MS = 15000, COIN_PICKUP_MAX_MS = 20000; // COIN-LIFETIME-01: coins stay 15 to 20 seconds before they despawn (was 5 to 15)
// AMBIENT-LOG-STACK-01: a log pile holds three logs and each tap collects one (a third of the pile's wood)
const AMBIENT_LOG_INTERVAL_MS = 45000, AMBIENT_LOG_WOOD = 15, AMBIENT_LOG_MAX_ON_BOARD = 12, AMBIENT_LOG_STACK_SIZE = 3, AMBIENT_LOG_MIN_GAP_TILES = 2.5, AMBIENT_LOG_TILE_JITTER = 0.5; // BRANCH-SPREAD-01
const ambientLogs = [];
let ambientLogElapsedMs = 0;
function maybeSpawnAmbientLog(){
  if(!activeRegion || ambientLogs.length >= AMBIENT_LOG_MAX_ON_BOARD) return false;
  const candidates = [];
  const x0=Math.max(1,activeRegion.x0-4), x1=Math.min(COLS-2,activeRegion.x1+4), y0=Math.max(1,activeRegion.y0-4), y1=Math.min(ROWS-2,activeRegion.y1+4);
  for(let attempt=0;attempt<96;attempt++){
    const gx=x0+Math.floor(Math.random()*(x1-x0+1)),gy=y0+Math.floor(Math.random()*(y1-y0+1)),key=gx+','+gy;
    if(pathCells.has(key) || nearPathTileSet.has(key) || bonusGrassTiles.has(key) || sceneryMap.has(key) || tileHasHut(gx,gy))continue;
    const x=(gx+0.5+(Math.random()-0.5)*AMBIENT_LOG_TILE_JITTER)*TILE_SIZE,y=(gy+0.5+(Math.random()-0.5)*AMBIENT_LOG_TILE_JITTER)*TILE_SIZE;
    if(ambientLogs.some(log=>Math.hypot(log.x-x,log.y-y)<TILE_SIZE*AMBIENT_LOG_MIN_GAP_TILES) || groundItems.some(item=>Math.hypot(item.x-x,item.y-y)<TILE_SIZE))continue;
    candidates.push({x,y}); break;
  }
  if(!candidates.length) return false;
  const tile = candidates[Math.floor(Math.random()*candidates.length)];
  ambientLogs.push({ x:tile.x, y:tile.y, count:AMBIENT_LOG_STACK_SIZE });
  return true;
}
function pickupHitSizeWorld(emojiPx, pointerType){
  if(pointerType !== 'touch') return emojiPx;
  const rect = getCanvasRect();
  if(!(rect.width > 0) || !(camera.zoom > 0)) return emojiPx;
  return Math.max(emojiPx, 44 * CANVAS_W / rect.width / camera.zoom);
}
function nearestPickupAt(items, x, y, hitSize, eligible){
  let closest = null, closestDistance = Infinity;
  for(const item of items){
    if(!eligible(item) || !isWithinEmojiSquare(x, y, item.x, item.y, hitSize)) continue;
    const distance = (item.x-x)*(item.x-x) + (item.y-y)*(item.y-y);
    if(distance < closestDistance){ closest = item; closestDistance = distance; }
  }
  return closest;
}
function tryCollectAmbientLog(x, y, pointerType){
  const log = nearestPickupAt(ambientLogs, x, y, pickupHitSizeWorld(30, pointerType), () => true);
  if(!log) return false;
  const logWood = Math.max(0,log.count) * AMBIENT_LOG_WOOD / AMBIENT_LOG_STACK_SIZE;
  ambientLogs.splice(ambientLogs.indexOf(log), 1); // remove before payout: one pickup per branch
  log.count = 0;
  wood += logWood;
  launchGoldHudFlight(log.x,log.y,'🪵');
  playSound('click');
  updateHUD();
  logGameEvent('ambient log collected: '+logWood+' wood');
  return true;
}
function drawAmbientLogs(ctx){
  if(!ambientLogs.length) return;
  const bounds = fxViewBounds();
  ctx.save(); ctx.font='22px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const log of ambientLogs){
    if(!fxVisible(log.x, log.y, bounds)) continue;
    ctx.save(); ctx.translate(log.x,log.y); drawBranchSprite(ctx,30,undefined,log); ctx.restore();
  }
  ctx.restore();
}
function coinPickupLifespan(){ return COIN_PICKUP_MIN_MS + Math.random()*(COIN_PICKUP_MAX_MS-COIN_PICKUP_MIN_MS); }
function restoreLooseInventory(savedItems){
  if(!Array.isArray(savedItems)) return;
  for(const saved of savedItems.slice(0,MAX_GROUND_ITEMS)){
    if(!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y) || saved.x<0 || saved.y<0 || saved.x>WORLD_MAX_W || saved.y>WORLD_MAX_H) continue;
    const def = itemDefinitionForSavedId(saved.itemId);
    if(!def || def.isGoldBag || def.isMapScroll) continue;
    const gi = spawnGroundItem(saved.x,saved.y,def,'restored from save');
    gi.spawnTime = presentationTime - (Number.isFinite(saved.age) ? clampNum(GROUND_ITEM_LIFESPAN, 0, saved.age) : 0);
    applyLegacyLuckyCoinMigration(gi.itemDef,saved.itemId,saved.legacyLuckyCoin === true);
  }
}
function restoreLooseCoins(savedCoins){
  if(!Array.isArray(savedCoins)) return;
  for(const saved of savedCoins.slice(0,10000)){
    if(!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y) || !Number.isFinite(saved.value) || saved.value < 0 || !Number.isFinite(saved.lifespan) || saved.lifespan <= 0) continue;
    if(saved.x < 0 || saved.y < 0 || saved.x > WORLD_MAX_W || saved.y > WORLD_MAX_H) continue;
    const c = acquireCoinSlot();
    c.x=saved.x; c.y=saved.y; c.value=Math.floor(saved.value); c.isDiamond=saved.isDiamond === true; c.fromGoldBag=saved.fromGoldBag === true;
    c.age=Number.isFinite(saved.age) ? clampNum(saved.lifespan, 0, saved.age) : 0;
    c.lifespan=saved.lifespan; c.vx=0; c.vy=0; c.active=true;
  }
}
/* =========================================================
   HUD FLIGHTS (hearts and gold)
   ========================================================= */
// HEART-FLIGHT-01: hearts rise from a Healing Fountain and fly up to the lives counter so the heal is obvious.
const heartHudFlights = Array.from({length:12},()=>({active:false}));
let heartHudFlightCount = 0;
function launchHeartHudFlights(x, y, count, broken){
  if(PREFERS_REDUCED_MOTION || (gameState!=='PLAYING' && gameState!=='PAUSED') || document.hidden) return;
  const hearts = clampNum(count, 1, 6);
  for(let i = 0; i < hearts; i++){
    const flight = heartHudFlights.find(f => !f.active);
    if(!flight) return;
    flight.x = x*camera.zoom + camera.x + (i - (hearts-1)/2)*10; flight.y = y*camera.zoom + camera.y;
    flight.startWidth = CANVAS_W; flight.startHeight = CANVAS_H; flight.age = -i*90; flight.active = true; flight.broken = !!broken; heartHudFlightCount++;
  }
}
// HEART-BREAK-01: when a loose enemy costs a life, a broken heart pops over its head, flies up to the lives counter, and on arrival the counter flashes
// red and a small sound plays, so the loss is unmissable. The life is taken at once as before; this is the animation of it.
function onBrokenHeartLanded(){
  playSound('heart_break');
  if(livesVal && livesVal.animate) livesVal.animate([{ transform: 'scale(1.5)', color: '#ff5a5a' }, { transform: 'scale(1)', color: '' }], { duration: 380, easing: 'ease-out' });
}
function updateHeartHudFlights(dt){
  if(!heartHudFlightCount) return;
  for(const flight of heartHudFlights) if(flight.active){
    flight.age += dt;
    if(flight.age >= 900){
      flight.active = false; heartHudFlightCount--;
      if(flight.broken) onBrokenHeartLanded();
    }
  }
}
// HEART-BEAT-01
function heartBeatScale(ageMs){ const phase = ((ageMs % 900) + 900) % 900; return 1 + 0.16*Math.max(0, 1-Math.abs(phase-90)/65) + 0.1*Math.max(0, 1-Math.abs(phase-230)/55); }
function drawHeartHudFlights(ctx){
  if(!heartHudFlightCount) return;
  const canvasRect = getCanvasRect(), target = livesVal.getBoundingClientRect();
  if(!canvasRect.width || !canvasRect.height) return;
  const tx = (target.left + target.width/2 - canvasRect.left)*CANVAS_W/canvasRect.width;
  const ty = (target.top + target.height/2 - canvasRect.top)*CANVAS_H/canvasRect.height;
  ctx.save(); ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const f of heartHudFlights) if(f.active && f.age >= 0){
    const t = Math.min(1, f.age/900), p = t*t*(3 - 2*t), arc = Math.sin(t*Math.PI);
    const startX = f.x*CANVAS_W/f.startWidth, startY = f.y*CANVAS_H/f.startHeight;
    ctx.globalAlpha = t > 0.9 ? (1 - t)/0.1 : 1;
    if(f.broken){
      const popSize = 16 + 12*Math.max(0, 1 - t*5); // pops big over the enemy's head, then shrinks as it flies
      ctx.font = Math.round(popSize * heartBeatScale(f.age)) + 'px sans-serif';
      ctx.fillText('💔', startX + (tx - startX)*p + arc*14, startY + (ty - startY)*p - arc*30);
      ctx.font = '16px sans-serif';
    } else ctx.fillText('❤️', startX + (tx - startX)*p + arc*14, startY + (ty - startY)*p - arc*30);
  }
  ctx.restore();
}
const goldHudFlights=Array.from({length:32},()=>({active:false}));
let goldHudFlightCount=0, lastGoldHudFlightAt=-1e9;
const GOLD_HUD_FLIGHT_MS = 680;
function resetGoldHudFlights(){
  for(const flight of goldHudFlights) flight.active = false;
  goldHudFlightCount = 0; lastGoldHudFlightAt = -1e9;
}
function launchGoldHudFlight(x,y,icon){
  if(PREFERS_REDUCED_MOTION || (gameState!=='PLAYING' && gameState!=='PAUSED') || document.hidden) return;
  let flight = goldHudFlights.find(f => !f.active);
  if(!flight){ // every slot is flying: the youngest flight of the same icon shows a ×count instead
    flight = goldHudFlights.filter(f => f.icon === (icon || null)).reduce((a, b) => !a || a.age < b.age ? a : b, null);
    if(flight) flight.count = (flight.count || 1) + 1;
    return;
  }
  flight.x = x*camera.zoom + camera.x; flight.y = y*camera.zoom + camera.y;
  flight.startWidth = CANVAS_W; flight.startHeight = CANVAS_H;
  flight.age = 0; flight.count = 1; flight.icon = icon || null; flight.active = true;
  goldHudFlightCount++; lastGoldHudFlightAt = presentationTime;
}
function updateGoldHudFlights(dt){
  if(!goldHudFlightCount) return;
  for(const flight of goldHudFlights){
    if(!flight.active) continue;
    flight.age += dt;
    if(flight.age >= GOLD_HUD_FLIGHT_MS){ flight.active = false; goldHudFlightCount--; }
  }
}
function drawGoldHudFlights(ctx){
  if(!goldHudFlightCount) return;
  const canvasRect=getCanvasRect(),target=goldVal.getBoundingClientRect();
  if(!canvasRect.width || !canvasRect.height)return;
  const tx=(target.left+target.width/2-canvasRect.left)*CANVAS_W/canvasRect.width;
  const ty=(target.top+target.height/2-canvasRect.top)*CANVAS_H/canvasRect.height;
  ctx.save();ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
  for(const f of goldHudFlights) if(f.active){
    const t=Math.min(1,f.age/GOLD_HUD_FLIGHT_MS),p=t*t*(3-2*t),arc=Math.sin(t*Math.PI);
    const startX=f.x*CANVAS_W/f.startWidth,startY=f.y*CANVAS_H/f.startHeight;
    let targetX=tx,targetY=ty;
    if(f.icon === '🪵'){ // wood flies to the Build button, where wood is spent
      const buildRect = document.getElementById('buildBtn').getBoundingClientRect();
      targetX = (buildRect.left + buildRect.width/2 - canvasRect.left)*CANVAS_W/canvasRect.width;
      targetY = (buildRect.top + buildRect.height/2 - canvasRect.top)*CANVAS_H/canvasRect.height;
    }
    const x=startX+(targetX-startX)*p+arc*18,y=startY+(targetY-startY)*p-arc*38;
    ctx.globalAlpha=t>0.88 ? (1-t)/0.12 : 1;
    if(f.icon){ ctx.font='20px sans-serif'; ctx.fillText(f.icon,x,y); ctx.font='14px sans-serif'; } // DIAMOND-FLIES-01: a diamond flies to the gold counter as the gem itself
    else ctx.fillText('🪙',x,y);
    if(f.count > 1){
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#ffe082';
      ctx.fillText('×' + f.count, x + 10, y + 8);
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
    }
  }
  ctx.restore();
}
/* =========================================================
   COIN COLLECTION, GOLD BAGS AND PICKUP DRAWING
   ========================================================= */
// GOLD-FLIGHT-CLICK-01: coins fly up to the gold counter only when the player clicks a coin or opens a bag.
function creditCoin(c, textColor, withFlight){
  if(c.isDiamond){
    // DIAMOND-GOLD-01: a clicked diamond turns into 1 to 100 gold, and nothing else (the permanent passive upgrade is gone), and the gem itself flies up into the gold counter.
    const diamondGold = DIAMOND_MIN_GOLD + Math.floor(Math.random()*(DIAMOND_MAX_GOLD - DIAMOND_MIN_GOLD + 1));
    gold += diamondGold;
    if(withFlight) launchGoldHudFlight(c.x, c.y, '💎');
    spawnFloatingText(c.x, c.y - 34, '+💎' + diamondGold, '#8ee8ff');
    spawnParticles(c.x, c.y, '#8ee8ff', 10);
    playSound('diamond', c.x, undefined, c.y);
    updateHUD();
    return;
  }
  gold += c.value;
  if(withFlight) launchGoldHudFlight(c.x,c.y);
  if(textColor) spawnFloatingText(c.x, c.y - 10, '+💰' + c.value, textColor);
  updateHUD();
}
function findPointClearOfScenery(x, y){
  for(let radius = 24; radius <= 144; radius += 24){
    for(let step = 0; step < 8; step++){
      const px = x + Math.cos(step*Math.PI/4)*radius, py = y + Math.sin(step*Math.PI/4)*radius;
      if(!sceneryAtPoint(px, py)) return { x: px, y: py };
    }
  }
  return { x, y };
}
function acquireCoinSlot(){
  let c = null;
  for(let offset = 0; offset < coinPickups.length; offset++){
    const index = (coinIndex + offset) % coinPickups.length;
    if(!coinPickups[index].active){ c = coinPickups[index]; coinIndex = (index + 1) % coinPickups.length; break; }
  }
  if(!c){
    c = {active:false,x:0,y:0,vx:0,vy:0,value:0,age:0,lifespan:0,z:0,vz:0,airborne:false,flightMs:0,bounces:0,isDiamond:false};
    coinPickups.push(c);
    coinIndex = 0;
    coinPoolMayShrink = true;
  }
  c.active = false;
  c.bounces = 0; c.isDiamond = false; c.fromGoldBag=false;
  c.airborne = false; c.z = 0; c.vz = 0; c.flightMs = 0;
  return c;
}
function trimInactiveCoinPoolTail(){
  if(!coinPoolMayShrink) return;
  while(coinPickups.length > COIN_COUNT && !coinPickups[coinPickups.length-1].active) coinPickups.pop();
  coinPoolMayShrink = coinPickups.length > COIN_COUNT;
  coinIndex %= coinPickups.length;
}
function spawnChestCoinFountain(x, y, totalGold){
  totalGold = Math.max(0, Math.floor(totalGold));
  if(!totalGold) return;
  const count = Math.min(CHEST_FOUNTAIN_COIN_COUNT, totalGold);
  const baseValue = Math.floor(totalGold / count);
  const remainder = totalGold - baseValue * count;
  for(let i=0; i<count; i++){
    const c = acquireCoinSlot();
    const angle = Math.random()*Math.PI*2, sideSpeed = 30 + Math.random()*120;
    const isLastCoin = i === count - 1;
    c.active = true; c.x = x; c.y = y; c.z = 8;
    c.vx = Math.cos(angle)*sideSpeed; c.vy = Math.sin(angle)*sideSpeed*0.6;
    c.vz = 280 + Math.random()*200;
    c.airborne = true;
    c.value = baseValue + (isLastCoin ? remainder : 0);
    c.age = 0;
    c.lifespan = coinPickupLifespan();
  }
}
// EMOJI-HITBOX-01: Every emoji you can click (bags, coins, ground items, enemies, scenery) is hit exactly where it is drawn: its own square, at the size and centre it is drawn with.
function isWithinEmojiSquare(worldX, worldY, centerX, centerY, emojiPx){
  const half = emojiPx / 2;
  return Math.abs(worldX - centerX) <= half && Math.abs(worldY - centerY) <= half;
}
// GOLD-BAG-ITEM-01: A gold bag is an ordinary ground item. Clicking it pays directly; unopened bags keep their gold.
const GOLD_BAG_ITEM = { id: 'GOLD_BAG', name: 'Gold Bag', icon: '💰', rarity: 'COMMON', isGoldBag: true };
const GOLD_BAG_LIFESPAN_MS = 180000, DIAMOND_BAG_CHANCE = 0.1, DIAMOND_MIN_GOLD = 1, DIAMOND_MAX_GOLD = 100, COIN_MAX_SCENERY_BOUNCES = 4;
const GOLD_BAG_MIN_GOLD = 1, GOLD_BAG_MAX_GOLD = 100;
const GOLD_BAG_MIN_COINS = 3, GOLD_BAG_MAX_COINS = 9;
const GOLD_BAG_MIN_COIN_VALUE = 1, GOLD_BAG_MAX_COIN_VALUE = 25;
function rollGoldBagGold(){ return GOLD_BAG_MIN_GOLD + Math.floor(Math.random()*(GOLD_BAG_MAX_GOLD-GOLD_BAG_MIN_GOLD+1)); }
function rollGoldBagCoinCount(){ return GOLD_BAG_MIN_COINS + Math.floor(Math.random()*(GOLD_BAG_MAX_COINS-GOLD_BAG_MIN_COINS+1)); }
function normalizeGoldBagGold(value){ return clampNum(Math.round(value), GOLD_BAG_MIN_GOLD, GOLD_BAG_MAX_GOLD); }
function dropGoldBag(x, y, goldOverride){
  const totalGold = normalizeGoldBagGold(goldOverride === undefined ? rollGoldBagGold() : goldOverride);
  const bagDefinition = Object.create(GOLD_BAG_ITEM);
  bagDefinition.gold = totalGold;
  return spawnGroundItem(x, y, bagDefinition, 'bounty');
}
function creditGroundBagGold(groundItem){
  const definition = groundItem.itemDef;
  if(!definition.isGoldBag) return;
  spawnGoldBagCoinBurst(groundItem.x, groundItem.y, definition.gold);
  rollMapFromBag(groundItem.x, groundItem.y); // ONE-KIND-OF-BAG-01: a bag paid out by timing out gets the same luck roll
  spawnFloatingText(groundItem.x, groundItem.y - 14, '+💰' + definition.gold, '#e6c200');
  updateHUD();
}
function launchCoin(c, x, y){
  const angle = Math.random()*Math.PI*2, sideSpeed = 40 + Math.random()*70;
  c.active = true; c.x = x; c.y = y; c.z = 6;
  c.vx = Math.cos(angle)*sideSpeed; c.vy = Math.sin(angle)*sideSpeed*0.6;
  c.vz = 180 + Math.random()*120;
  c.airborne = true; c.age = 0; c.lifespan = coinPickupLifespan();
}
// GOLD-BAG-COIN-BURST-01: an opened bag bursts into 3 to 9 coins that share its gold exactly.
function spawnGoldBagCoinBurst(x, y, value){
  const total = normalizeGoldBagGold(value);
  const count = Math.min(total, Math.max(Math.ceil(total / GOLD_BAG_MAX_COIN_VALUE), rollGoldBagCoinCount()));
  for(let i=0;i<count;i++){
    const coin = acquireCoinSlot();
    launchCoin(coin, x + (Math.random()-0.5)*16, y - 3);
    coin.value = Math.floor(total/count) + (i < total%count ? 1 : 0);
    coin.fromGoldBag = true;
  }
}
function openGoldBag(groundItem, x, y){
  const bagGold = groundItem.itemDef.gold;
  launchGoldHudFlight(x,y);
  spawnFloatingText(x, y - 16, '+💰' + bagGold, '#ffd700');
  spawnGoldBagCoinBurst(x, y, bagGold);
  rollMapFromBag(x, y); // ONE-KIND-OF-BAG-01: the luck roll
  groundItems = groundItems.filter(gi => gi !== groundItem);
  itemLogReleased(groundItem.itemDef, 'opened');
  if(Math.random() < DIAMOND_BAG_CHANCE){ // a rare diamond, coin-sized, comes out with the coins
    const diamond = acquireCoinSlot();
    launchCoin(diamond, x, y);
    diamond.isDiamond = true; diamond.value = 0;
  }
  spawnParticles(x, y, '#ffd700', 6);
  playSound('bag', x);
  updateHUD();
}
const GROUND_ITEM_EMOJI_PX = 22;
const FOOD_GLOW_STYLE = Object.freeze({glowRadius:16,hueMsPerDegree:90});
const TREAT_GLOW_STYLE = Object.freeze({glowRadius:26,hueMsPerDegree:20});
function groundItemBobPx(gi){
  const popAge = presentationTime - gi.spawnTime;
  const popLift = popAge < 450 ? -Math.sin(popAge/450*Math.PI)*16 : 0;
  return Math.sin(presentationTime/300 + gi.id)*4 + popLift;
}
function tryCollectCoinAt(worldX, worldY, pointerType, hoverOnly){
  // DIAMOND-CLICK-01: hovering or sliding over coins collects coins, but a diamond is only ever collected by a deliberate click or tap.
  const coin = nearestPickupAt(coinPickups, worldX, worldY, pickupHitSizeWorld(COIN_EMOJI_PX, pointerType), item => item.active && !item.airborne && !(hoverOnly && item.isDiamond));
  if(!coin) return false;
  creditCoin(coin, '#ffd700', true);
  playSound('coin', coin.x, undefined, coin.y);
  coin.active = false;
  trimInactiveCoinPoolTail();
  return true;
}
function spawnCoinBurst(x, y, count){
  for(let i=0; i<count; i++){
    const c = acquireCoinSlot();
    const ang = Math.random()*Math.PI*2, speed = 40 + Math.random()*90;
    c.active = true; c.x = x; c.y = y;
    c.vx = Math.cos(ang)*speed; c.vy = Math.sin(ang)*speed;
    c.value = 3 + Math.floor(Math.random()*6); // 3-8 gold each
    c.age = 0;
    c.lifespan = coinPickupLifespan();
  }
}
function updateCoinPickups(dt){
  let expiredCoin = false;
  for(const c of coinPickups){
    if(!c.active) continue;
    c.age += dt;
    if(c.age >= c.lifespan){
      if(!c.isDiamond) creditCoin(c, null, true); // COIN-FADE-FLIGHT-01
      c.active = false;
      expiredCoin = true;
      continue;
    }
    if(c.airborne){
      c.flightMs += dt;
      c.vz -= COIN_GRAVITY_PX_PER_S2*dt/1000;
      c.z += c.vz*dt/1000;
      c.vx *= Math.pow(0.55, dt/1000); c.vy *= Math.pow(0.55, dt/1000);
      c.x += c.vx*dt/1000; c.y += c.vy*dt/1000;
      if(c.z <= 0){
        c.z = 0;
        const blocker = sceneryAtPoint(c.x, c.y); // COIN-BOUNCE-01
        if(blocker && (c.bounces || 0) < COIN_MAX_SCENERY_BOUNCES){
          c.bounces = (c.bounces || 0) + 1;
          let awayX = c.x - blocker.item.x, awayY = c.y - (blocker.item.y + 2), awayLength = Math.hypot(awayX, awayY);
          if(awayLength < 1){ const randomAngle = Math.random()*Math.PI*2; awayX = Math.cos(randomAngle); awayY = Math.sin(randomAngle); awayLength = 1; }
          const kick = 70 + Math.random()*40;
          c.vx = awayX/awayLength*kick; c.vy = awayY/awayLength*kick; c.vz = 140 + Math.random()*40; c.airborne = true; c.flightMs = 0;
        } else {
          if(blocker){ const clearSpot = findPointClearOfScenery(c.x, c.y); c.x = clearSpot.x; c.y = clearSpot.y; }
          c.airborne = false;
          c.vx *= 0.3; c.vy *= 0.3;
        }
      }
      continue;
    }
    c.vx *= Math.pow(0.003, dt/1000); c.vy *= Math.pow(0.003, dt/1000);
    c.x += c.vx*dt/1000; c.y += c.vy*dt/1000;
  }
  if(expiredCoin) trimInactiveCoinPoolTail();
}
let coinGlowCanvas = null;
function getCoinGlowCanvas(){
  if(coinGlowCanvas) return coinGlowCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const glowCtx = canvas.getContext('2d');
  const glow = glowCtx.createRadialGradient(48, 48, 0, 48, 48, 48);
  glow.addColorStop(0, 'rgba(255,215,0,0.50)');
  glow.addColorStop(1, 'rgba(255,190,0,0)');
  glowCtx.fillStyle = glow;
  glowCtx.fillRect(0, 0, 96, 96);
  coinGlowCanvas = canvas;
  return canvas;
}
function drawCoinPickups(ctx){
  const bounds = fxViewBounds();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = COIN_EMOJI_PX + 'px sans-serif';
  for(const c of coinPickups){
    if(!c.active) continue;
    const glyphY = c.airborne ? c.y-c.z : c.y;
    if(!fxVisible(c.x, glyphY, bounds) && !(c.airborne && fxVisible(c.x, c.y, bounds))) continue;
    const coinGlyph = c.isDiamond ? '💎' : '🪙';
    const remainFrac = 1 - c.age/c.lifespan;
    ctx.globalAlpha = remainFrac < 0.15 ? remainFrac/0.15 : 1; // only fades in the final 15% of its life, stays fully visible otherwise
    if(!c.isDiamond){
      const glowX = c.x, glowY = c.airborne ? c.y-c.z : c.y;
      const glowPulse = 0.25 + (Math.sin(presentationTime/430 + c.age/260)*0.5 + 0.5)*0.55;
      const pickupAlpha = ctx.globalAlpha;
      ctx.globalAlpha = pickupAlpha * glowPulse;
      ctx.drawImage(getCoinGlowCanvas(), glowX - 12, glowY - 12, 24, 24);
      ctx.globalAlpha = pickupAlpha;
    }
    if(c.airborne){
      drawEmojiGroundShadow(ctx,coinGlyph,c.x,c.y,COIN_EMOJI_PX,'sans-serif',Math.max(0.25,Math.abs(Math.cos(c.flightMs*0.02))));
      ctx.save();
      ctx.translate(c.x, c.y - c.z);
      ctx.scale(Math.max(0.25, Math.abs(Math.cos(c.flightMs*0.02))), 1);
      ctx.fillText(coinGlyph, 0, 0);
      ctx.restore();
    } else {
      drawEmojiGroundShadow(ctx,coinGlyph,c.x,c.y,COIN_EMOJI_PX,'sans-serif',1);
      ctx.fillText(coinGlyph, c.x, c.y);
    }
  }
  ctx.globalAlpha = 1;
}
function drawFloatingTexts(ctx){
  ctx.textAlign = 'center';
  const fxBounds = fxViewBounds();
  perfStats.totalFloatingTexts = 0;
  perfStats.visibleFloatingTexts = 0;
  for(const t of floatingTexts){
    if(!t.active) continue;
    perfStats.totalFloatingTexts++;
    if(!fxVisible(t.x, t.y, fxBounds)) continue;
    perfStats.visibleFloatingTexts++;
    if(t.isIcon){
      const p = 1 - t.life/t.maxLife; // 0 (just spawned) -> 1 (about to expire)
      const jumpT = Math.min(1, p/0.2);
      const scale = jumpT < 1 ? jumpT*(2.7 - 1.7*jumpT) : 1; // simple overshoot-then-settle curve, no easing library needed
      const wiggle = Math.sin(p*26) * 0.22 * Math.max(0, 1 - p/0.7);
      const alpha = p < 0.7 ? 1 : Math.max(0, 1 - (p-0.7)/0.3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y);
      ctx.rotate(wiggle);
      ctx.scale(scale, scale);
      drawEmojiSprite(ctx, t.text, 16);
      ctx.restore();
    } else {
      ctx.globalAlpha = Math.max(0, t.life/t.maxLife);
      drawTextSprite(ctx, t.text, t.isXp ? 9 : (t.fontPx || 13), t.color, t.x, t.y);
    }
  }
  ctx.globalAlpha = 1;
}
