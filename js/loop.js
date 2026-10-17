"use strict";
// Spatial hash, enemy collisions, the fixed-timestep main loop, update and render, diagnostics frames, the attract screen and the merchant caravan. Loaded after js/stickman.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   SPATIAL HASH
//   MAIN LOOP: FIXED TIMESTEP AND UPDATE
//   TARGET FRAME, RANGE RING AND GROUND GLOW
//   RENDER
//   DEBUG OVERLAY, FPS COUNTER, COUNTDOWN AND BOSS COMPASS
//   PERFORMANCE DIAGNOSTICS
//   ATTRACT SCREEN
//   FIELD MUSIC SCAN AND MERCHANT CARAVAN
//   PRESENTATION EFFECTS AND THE FRAME LOOP
//   GEOMETRY HELPERS
//   PARTICLE POOL
/* =========================================================
   SPATIAL HASH
   ========================================================= */
// CA603 — see HISTORY.md § [1.5.7] Code Archaeology, CA603
const SPATIAL_CELL_OFFSET = 256, SPATIAL_CELL_STRIDE = 1024;
function spatialCellKey(cx, cy){ return (cx + SPATIAL_CELL_OFFSET) * SPATIAL_CELL_STRIDE + (cy + SPATIAL_CELL_OFFSET); }
// CA604 — see HISTORY.md § [1.5.7] Code Archaeology, CA604
function barricadeAttackReady(barricade){
  if(barricade.barricadeContactSince === undefined || barricade.barricadeContactSince === null) barricade.barricadeContactSince = gameTime;
  const since = Math.max(barricade.barricadeContactSince, barricade.lastBarricadeHitAt);
  return gameTime - since >= BARRICADE_HIT_INTERVAL_MS;
}
// One point off, with the wood-and-stone burst that sells it.
function chipBarricade(barricade, attacker){
  barricade.lastBarricadeHitAt = gameTime;
  barricade.barricadeHpLabelUntil = gameTime + 2000;
  barricade.hp = Math.max(0, barricade.hp - 1);
  barricade.barricadeChipUntil = gameTime + BARRICADE_CHIP_MS;
  spawnFloatingText(barricade.x, barricade.y - 26, '-1', '#e63946');
  spawnBarricadeStrikeDebris(barricade, attacker, true);
  playSound('hit', barricade.x);
  if(screenShakeEnabled){ screenShakeUntil = presentationTime + 140; screenShakeMag = Math.max(screenShakeMag, 4); }
  if(barricade.hp <= 0){
    logGameEvent('barricade broke at tile ' + barricade.gridX + ',' + barricade.gridY);
    barricade.active = false;
    activeBarricades.delete(barricade);
    invalidateSpawnFlags();
    { const witness = findNearestActiveTower(barricade.x, barricade.y, 260); if(witness) requestStickmanBark(witness, BARK_TIER_VITAL, '😱', BARK_LINES.BARRICADE, 1, BARK_CHANCE.BARRICADE); }
    spawnParticles(barricade.x, barricade.y, '#8a5a2b', 10);
    playSound('death');
  }
}
// CA605 — see HISTORY.md § [1.5.7] Code Archaeology, CA605
// BARRICADE-STRIKE-01 (1.8.20): every enemy strike on a barricade throws wood and stone away from the attacker; the strike that removes a point also leaves rubble.
function spawnBarricadeStrikeDebris(barricade, attacker, isChip){
  const awayAngle = attacker ? Math.atan2(barricade.y - attacker.y, barricade.x - attacker.x) : undefined;
  spawnParticles(barricade.x, barricade.y, '#b07a3a', isChip ? 5 : 3, 140, 0.9, false, awayAngle, 1.2);
  if(isChip || Math.random() < 0.5) spawnBarricadeChunk(barricade.x, barricade.y - 6, true, awayAngle, isChip);
  const woodPieces = isChip ? 2 : 1;
  for(let i = 0; i < woodPieces; i++) spawnBarricadeChunk(barricade.x, barricade.y - 6, false, awayAngle, isChip);
}
function spawnBarricadeDebris(barricade){
  spawnParticles(barricade.x, barricade.y, '#b07a3a', 4);
  spawnParticles(barricade.x, barricade.y, '#9aa0a6', 3);
  // CA606 — see HISTORY.md § [1.5.7] Code Archaeology, CA606
  spawnBarricadeChunk(barricade.x, barricade.y - 6, true); // the 1 stone chunk
  const woodPieces = 1 + (Math.random() < 0.5 ? 1 : 0); // 1-2 wood chunks
  for(let i = 0; i < woodPieces; i++) spawnBarricadeChunk(barricade.x, barricade.y - 6, false);
}
// CA607 — see HISTORY.md § [1.5.7] Code Archaeology, CA607
const MELEE_DODGE_PX = 7;
function dodgeEnemyFromSwing(enemy, tower){
  const dx = enemy.x - tower.x, dy = enemy.y - tower.y;
  const dist = Math.hypot(dx, dy) || 1;
  const side = ((enemy.id + tower.gridX + tower.gridY) % 2 === 0) ? 1 : -1; // deterministic per pair — no frame-to-frame jitter
  enemy.flinchAngle = Math.atan2(dx, -dy) + (side > 0 ? 0 : Math.PI);
  enemy.flinchMag = MELEE_DODGE_PX * 0.6;
  enemy.flinchStart = realTime;
  enemy.flinchDuration = 160;
  spawnParticles(enemy.x, enemy.y, '#d9d9d9', 2);
}
// LANE-LEASH-01 (1.6.110) — see HISTORY.md § [1.6.110]
const LANE_LEASH_PX = 14;
function leashEnemyToLane(e){
  if(e.isBreakaway || e.escaped || e.isGuardian || e.isHutBuilding || e.isLivestock) return;
  const b = waypointsPx[e.pathIndex+1];
  const a = waypointsPx[e.pathIndex];
  if(!a || !b) return;
  const sx = b.x - a.x, sy = b.y - a.y;
  const len2 = sx*sx + sy*sy;
  if(len2 < 1) return;
  const t = clampNum(((e.x - a.x)*sx + (e.y - a.y)*sy) / len2, 0, 1);
  const cx = a.x + sx*t, cy = a.y + sy*t;
  const ox = e.x - cx, oy = e.y - cy;
  const od = Math.hypot(ox, oy);
  if(od <= LANE_LEASH_PX) return;
  const pull = Math.min(od - LANE_LEASH_PX, 3);
  e.x -= ox/od*pull; e.y -= oy/od*pull;
}
function leashAllEnemiesToLane(){
  for(const e of enemyPool){ if(e.active) leashEnemyToLane(e); }
}
function isCampRouteCrossing(a, b){
  const aCamp = a.isGuardian || a.isHutBuilding, bCamp = b.isGuardian || b.isHutBuilding;
  // CA608 — see HISTORY.md § [1.5.7] Code Archaeology, CA608
  return (aCamp && !bCamp && !b.escaped) || (bCamp && !aCamp && !a.escaped);
}
// QUEUE-HOLD-01 (1.7.87) — see HISTORY.md § [1.7.87]
function isEnemyHeldInPlace(e){ return e.stunnedUntil > gameTime || e.frozenUntil > gameTime; }
function isEnemyFrozen(e){ return e.pileBlocked || isEnemyHeldInPlace(e); }
// CA609 — see HISTORY.md § [1.5.7] Code Archaeology, CA609
function checkStallWatchdog(dt){
  for(const e of enemyPool){
    if(!e.active || e.isBreakaway || e.escaped || e.isGuardian || e.isHutBuilding) continue;
    if(isEnemyFrozen(e) || e.queueSlotDist !== undefined){
      // legitimately blocked — not a bug, don't accumulate strikes while this is true
      e.stallWatchTimer = 0; e.stallStrikes = 0; e.stallWatchTraveled = e.traveled;
      continue;
    }
    e.stallWatchTimer += dt;
    if(e.stallWatchTimer < 500) continue;
    const displaced = Math.hypot(e.x - (e.stallWatchX ?? e.x), e.y - (e.stallWatchY ?? e.y));
    e.stallWatchX = e.x; e.stallWatchY = e.y; // was 1000ms — checking twice as often catches a corner hang-up faster, especially in a mixed-size cluster where a stall can start and end within a couple of seconds
    const progressed = Math.min(e.traveled - e.stallWatchTraveled, displaced); // real displacement, not just the path counter — collision push-back can keep `traveled` rising while the unit never actually moves
    e.stallWatchTimer = 0;
    e.stallWatchTraveled = e.traveled;
    const expectedStepPx = (e.speed || 0) * (e.slowMultiplier === undefined ? 1 : enemyMoveMultiplier(e)) * 0.5; // STALL-JUMP-01 (1.6.116) — see HISTORY.md § [1.6.116]
    const stallThresholdPx = Math.min(e.radius*0.15, expectedStepPx*0.3);
    if(progressed < stallThresholdPx){ // scaled to the enemy's own size rather than a flat 3px — a Boss/Tank crawling 3px in half a second might be genuinely fine, while a tiny fast Swarm doing the same is clearly stuck
      e.stallStrikes++;
      if(e.stallStrikes >= 3){ // 3 strikes at 500ms = ~1.5s of real stall before intervening, down from ~3s
        const target = waypointsPx[e.pathIndex+1];
        if(target){
          const dx = target.x-e.x, dy = target.y-e.y;
          const dist = Math.hypot(dx,dy) || 1;
          const nudge = Math.min(dist, 14); // slightly stronger than before — enough to actually clear a mixed-size pileup at a corner, not just inch forward
          e.x += (dx/dist)*nudge; e.y += (dy/dist)*nudge;
          e.traveled += nudge;
          // CA610 — see HISTORY.md § [1.5.7] Code Archaeology, CA610
          if(nudge >= dist - 0.01) e.pathIndex++;
        }
        e.stallStrikes = 0;
      }
    } else {
      e.stallStrikes = 0; // making real progress again
    }
  }
}
// CA611 — see HISTORY.md § [1.5.7] Code Archaeology, CA611
// PERF-COLLISION-CAP-01 (1.6.44) — see HISTORY.md § [1.6.44]. Measured via a headless stress
// harness against these exact functions: when enemies jam into a dense clump (a Barricade
// chokepoint, a corner backup), a single queryNearby() call can return most of the active
// population, and both collision functions below degrade toward O(n^2) instead of staying near the
// spatial hash's intended near-linear cost. Bounding the neighbor count actually processed per
// query flattens that worst case (measured ~60-70% cost reduction at 400-800 densely-packed
// enemies) without changing behavior below the cap — normal, non-degenerate density never reaches
// it. An extreme clump settles over a few more relaxation passes/frames instead of fully resolving
// in one; same tradeoff already accepted for melee cleave's own MELEE_SWEEP_MAX_TARGETS cap.
const COLLISION_QUERY_CAP = 48;
function largestActiveEnemyRadius(){ let largest = 0; for(const e of enemyPool) if(e.active && e.radius > largest) largest = e.radius; return largest; }
function resolveSweptEnemyCollisions(){
  const hash = buildEnemyHash(), largestRadius = largestActiveEnemyRadius();
  for(const e of enemyPool){
    if(!e.active || e.prevX === undefined || e.isLivestock || e.isBreakaway) continue; // BREAKAWAY-PHASE-01 (1.6.157): an enemy breaking off to attack a stickman is on its own phase and touches neither barricades nor other enemies // WANDERER-PHASE-01 (1.6.137) — see HISTORY.md § [1.6.137]: livestock and the troll pass through everything
    const nearby = queryNearby(hash, e.x, e.y, Math.max(e.radius*3, e.radius + largestRadius + 2) + 40, COLLISION_QUERY_CAP, true);
    const collisionCap = Math.min(nearby.length, COLLISION_QUERY_CAP);
    for(let __ci=0; __ci<collisionCap; __ci++){ const other = nearby[__ci];
      if(e.id >= other.id) continue; // each pair once, same reasoning as resolveEnemyCollisions; checked first because it rejects half the candidates (COLLISION-ORDER-01)
      if(!other.active || other.prevX === undefined || other.isLivestock || other.isBreakaway) continue;
      if(isCampRouteCrossing(e, other)) continue;
      const eFrozen = isEnemyFrozen(e) || e.isHutBuilding;
      const otherFrozen = isEnemyFrozen(other) || other.isHutBuilding;
      if(eFrozen && otherFrozen) continue; // both stationary this frame — nothing to tunnel through, and the regular pass already covers this pair
      const minDist = e.radius + other.radius + 2;
      const px = e.prevX - other.prevX, py = e.prevY - other.prevY;
      const vx = (e.x - e.prevX) - (other.x - other.prevX), vy = (e.y - e.prevY) - (other.y - other.prevY);
      const vSq = vx*vx + vy*vy;
      if(vSq < 0.01) continue; // negligible relative motion this frame — nothing could have tunneled
      let t = -(px*vx + py*vy) / vSq;
      t = Math.max(0, Math.min(1, t));
      const closeX = px + vx*t, closeY = py + vy*t;
      const closeDist = Math.hypot(closeX, closeY);
      if(closeDist >= minDist) continue; // paths never actually came within collision range this frame
      const dx = e.x - other.x, dy = e.y - other.y;
      const dist = Math.hypot(dx,dy) || 0.0001;
      if(dist >= minDist){
        // CA612 — see HISTORY.md § [1.5.7] Code Archaeology, CA612
        const normX = closeDist > 0.0001 ? closeX/closeDist : 1, normY = closeDist > 0.0001 ? closeY/closeDist : 0;
        const corr = (minDist - closeDist) * 0.5;
        if(!eFrozen){ e.x += normX*corr; e.y += normY*corr; }
        if(!otherFrozen){ other.x -= normX*corr; other.y -= normY*corr; }
      }
    }
  }
}
function resolveEnemyCollisions(){
  // CA613 — see HISTORY.md § [1.5.7] Code Archaeology, CA613
  const PASSES = 3;
  // CA614 — see HISTORY.md § [1.5.7] Code Archaeology, CA614
  const COLLISION_RELAX_FACTOR = 0.7;
  const COLLISION_RELAX_SPLIT = COLLISION_RELAX_FACTOR * 0.5; // 0.35 — the per-body coefficient when both sides share the correction
  // PERF-01 (1.6.8) — see HISTORY.md § [1.6.8]. Built once instead of once per pass (previously
  // up to 3 full spatial-hash rebuilds in a single frame). Per-pass displacement is bounded by
  // overlap*COLLISION_RELAX_SPLIT — a few pixels at most — which essentially never moves an enemy
  // across a hash-cell boundary within one frame's worth of passes, so reusing the same hash across
  // all 3 relaxation passes costs no real accuracy. The already-existing early-exit below (a pass
  // that corrects nothing stops the loop) still applies on top of this.
  const hash = buildEnemyHash(), largestRadius = largestActiveEnemyRadius();
  for(let pass = 0; pass < PASSES; pass++){
    let correctionsThisPass = 0; // a pass that corrected nothing means the field is already settled — further passes would repeat identical work
    for(const e of enemyPool){
      if(!e.active || e.isLivestock || e.isBreakaway) continue;
      const nearby = queryNearby(hash, e.x, e.y, e.radius + largestRadius + 2, COLLISION_QUERY_CAP, true);
      const collisionCap = Math.min(nearby.length, COLLISION_QUERY_CAP);
      for(let __ci=0; __ci<collisionCap; __ci++){ const other = nearby[__ci];
        if(e.id >= other.id) continue; // each pair resolved exactly once per pass — without this, A pushes B, then later in the same loop B independently re-detects A and pushes again, doubling the separation and shoving units off the path centerline near corners
        if(!other.active || other.isLivestock || other.isBreakaway) continue;
        if(isCampRouteCrossing(e, other)) continue;
        const dx = e.x - other.x, dy = e.y - other.y;
        const minDist = e.radius + other.radius + 2; // strict non-overlap (was 0.82x, deliberately allowing 18% visual overlap that read as sprite stacking/"invisible" units)
        const distSq = dx*dx + dy*dy;
        if(distSq >= minDist*minDist) continue; // squared-distance rejection: the sqrt only runs for pairs that actually overlap
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        let pushX, pushY;
        if(dist > 0.0001){
          pushX = dx/dist; pushY = dy/dist;
        } else {
          // CA615 — see HISTORY.md § [1.5.7] Code Archaeology, CA615
          const angle = ((e.id * 2654435761 + other.id * 40503) % 360) * Math.PI/180;
          pushX = Math.cos(angle); pushY = Math.sin(angle);
        }
        const eFrozen = isEnemyFrozen(e) || e.isHutBuilding;
        const otherFrozen = isEnemyFrozen(other) || other.isHutBuilding;
        // CA616 — see HISTORY.md § [1.5.7] Code Archaeology, CA616
        if(!eFrozen || !otherFrozen) correctionsThisPass++;
        if(!eFrozen && !otherFrozen){
          // CA617 — see HISTORY.md § [1.5.7] Code Archaeology, CA617
          const speedE = Math.hypot(e.vx, e.vy), speedO = Math.hypot(other.vx, other.vy);
          if(speedE > 5 || speedO > 5){
            const tanX = speedE > speedO ? e.vx/(speedE||1) : other.vx/(speedO||1);
            const tanY = speedE > speedO ? e.vy/(speedE||1) : other.vy/(speedO||1);
            const along = pushX*tanX + pushY*tanY; // component of the push already aligned with travel direction
            const crossX = pushX - along*tanX, crossY = pushY - along*tanY; // perpendicular remainder
            // CA618 — see HISTORY.md § [1.5.7] Code Archaeology, CA618
            pushX = along*tanX + crossX*0.3;
            pushY = along*tanY + crossY*0.3;
            const norm = Math.hypot(pushX, pushY) || 1;
            pushX /= norm; pushY /= norm;
          }
          e.x += pushX*overlap*COLLISION_RELAX_SPLIT; e.y += pushY*overlap*COLLISION_RELAX_SPLIT;
          other.x -= pushX*overlap*COLLISION_RELAX_SPLIT; other.y -= pushY*overlap*COLLISION_RELAX_SPLIT;
        } else if(!eFrozen){
          e.x += pushX*overlap*COLLISION_RELAX_FACTOR; e.y += pushY*overlap*COLLISION_RELAX_FACTOR;
        } else if(!otherFrozen){
          other.x -= pushX*overlap*COLLISION_RELAX_FACTOR; other.y -= pushY*overlap*COLLISION_RELAX_FACTOR;
        } else {
          // CA619 — see HISTORY.md § [1.5.7] Code Archaeology, CA619
          const lateralX = -pushY, lateralY = pushX;
          const nudge = Math.min(overlap, 1.5) * 0.5;
          if(!e.isHutBuilding){ e.x += lateralX*nudge; e.y += lateralY*nudge; }
          if(!other.isHutBuilding){ other.x -= lateralX*nudge; other.y -= lateralY*nudge; }
        }
      }
    }
    if(correctionsThisPass === 0) break; // settled — skip the remaining relaxation passes (and their hash rebuilds)
  }
}
// CA620 — see HISTORY.md § [1.5.7] Code Archaeology, CA620
const EMPTY_ENEMY_HASH = Object.freeze({});
const EMPTY_QUERY_RESULT = Object.freeze([]);
// CA621 — see HISTORY.md § [1.5.7] Code Archaeology, CA621
const enemyHashBucketPool = new Map();
// CA622 — see HISTORY.md § [1.5.7] Code Archaeology, CA622
let spatialQueryCallsThisFrame = 0, hashBuildsThisFrame = 0, queryNearbyMaxResultLenSeen = 0;
function buildEnemyHash(){
  hashBuildsThisFrame++;
  // Fresh short-lived container avoids property deletion on a reused object; the bucket arrays
  // themselves remain pooled. Do not keep a per-build key list: it is unnecessary for cleanup.
  const hash = {_minCellX:Infinity,_maxCellX:-Infinity,_minCellY:Infinity,_maxCellY:-Infinity,_minYByColumn:{},_maxYByColumn:{}};
  for(const e of enemyPool){
    if(!e.active) continue;
    if(e.isLivestock && !e.isHostileNpc && e !== markedTargetEnemy) continue; // TARGET-MARK-01 (1.6.94): passive until marked
    const cellX = Math.floor(e.x/TILE_SIZE), cellY = Math.floor(e.y/TILE_SIZE);
    if(cellX < hash._minCellX) hash._minCellX = cellX;
    if(cellX > hash._maxCellX) hash._maxCellX = cellX;
    if(cellY < hash._minCellY) hash._minCellY = cellY;
    if(cellY > hash._maxCellY) hash._maxCellY = cellY;
    const columnKey = cellX + SPATIAL_CELL_OFFSET;
    if(hash._minYByColumn[columnKey] === undefined || cellY < hash._minYByColumn[columnKey]) hash._minYByColumn[columnKey] = cellY;
    if(hash._maxYByColumn[columnKey] === undefined || cellY > hash._maxYByColumn[columnKey]) hash._maxYByColumn[columnKey] = cellY;
    const k = spatialCellKey(cellX, cellY);
    let bucket = hash[k];
    if(!bucket){
      bucket = enemyHashBucketPool.get(k);
      if(bucket){ bucket.length = 0; } else { bucket = []; enemyHashBucketPool.set(k, bucket); }
      hash[k] = bucket;
    }
    bucket.push(e);
  }
  return hash._minCellX === Infinity ? EMPTY_ENEMY_HASH : hash;
}
// CA623 — see HISTORY.md § [1.5.7] Code Archaeology, CA623
const queryNearbyScratch = [];
let spatialQueryRotation = 0;
// COLLISION-QUERY-EXACT-01 (1.8.43): collision passes ask for exactly the cells their reach touches (exactCells) instead of a padded square, so a crowd's
// capped neighbor list holds the enemies that can actually overlap rather than ones up to two tiles away.
function queryNearby(hash, x, y, range, maxResults, exactCells){
  spatialQueryCallsThisFrame++;
  if(hash === EMPTY_ENEMY_HASH) return EMPTY_QUERY_RESULT; // no active enemies at all — skip the entire cell scan below rather than doing real work to look for nothing
  queryNearbyScratch.length = 0;
  const cellRadius = Math.ceil(range/TILE_SIZE) + 1;
  const cx = Math.floor(x/TILE_SIZE), cy = Math.floor(y/TILE_SIZE);
  const bounded = hash._minCellX !== undefined;
  const nearLeft = exactCells ? Math.floor((x - range)/TILE_SIZE) : cx-cellRadius, nearRight = exactCells ? Math.floor((x + range)/TILE_SIZE) : cx+cellRadius;
  const nearTop = exactCells ? Math.floor((y - range)/TILE_SIZE) : cy-cellRadius, nearBottom = exactCells ? Math.floor((y + range)/TILE_SIZE) : cy+cellRadius;
  const left = bounded ? Math.max(nearLeft, hash._minCellX) : nearLeft;
  const right = bounded ? Math.min(nearRight, hash._maxCellX) : nearRight;
  const top = bounded ? Math.max(nearTop, hash._minCellY) : nearTop;
  const bottom = bounded ? Math.min(nearBottom, hash._maxCellY) : nearBottom;
  for(let cellX=left; cellX<=right; cellX++){
    let columnTop = top, columnBottom = bottom;
    if(hash._minYByColumn){
      const columnKey = cellX + SPATIAL_CELL_OFFSET;
      const minY = hash._minYByColumn[columnKey];
      if(minY === undefined) continue;
      columnTop = Math.max(top, minY);
      columnBottom = Math.min(bottom, hash._maxYByColumn[columnKey]);
    }
    for(let cellY=columnTop; cellY<=columnBottom; cellY++){
      const arr = hash[spatialCellKey(cellX, cellY)];
      if(arr){
        const count = maxResults === undefined ? arr.length : Math.min(arr.length, maxResults-queryNearbyScratch.length);
        // COLLISION-FAIR-01 (1.7.50): when a crowd is bigger than the result cap, always taking the first entries meant the same enemies were returned for everyone and the rest never got a
        // collision pair (the review reproduced 32 of 80 stacked enemies still coincident after 20 passes). The read now starts at a rotating position, so over a few ticks every enemy is covered, with the same bounded work.
        if(count < arr.length){ const startAt = (spatialQueryRotation++ * 17) % arr.length; for(let i=0;i<count;i++) queryNearbyScratch.push(arr[(startAt + i) % arr.length]); }
        else for(let i=0;i<count;i++) queryNearbyScratch.push(arr[i]);
        if(maxResults !== undefined && queryNearbyScratch.length >= maxResults){
          if(queryNearbyScratch.length > queryNearbyMaxResultLenSeen) queryNearbyMaxResultLenSeen = queryNearbyScratch.length;
          return queryNearbyScratch;
        }
      }
    }
  }
  if(queryNearbyScratch.length > queryNearbyMaxResultLenSeen) queryNearbyMaxResultLenSeen = queryNearbyScratch.length;
  return queryNearbyScratch;
}
function firstActiveEnemy(nearby){
  for(const e of nearby) if(e.active) return e;
  return null;
}
function randomActiveEnemy(nearby){
  let activeCount = 0;
  for(const e of nearby) if(e.active) activeCount++;
  if(!activeCount) return null;
  let selected = Math.floor(Math.random()*activeCount);
  for(const e of nearby) if(e.active && selected-- === 0) return e;
  return null;
}
/* =========================================================
   MAIN LOOP: FIXED TIMESTEP AND UPDATE
   ========================================================= */
const FIXED_DT = 1000/60;
function renderLeftoverMs(){ return gameState === 'PLAYING' ? Math.min(accumulator, FIXED_DT) : 0; } // SMOOTH-ANIM-01: the part of the next tick that has already elapsed
let lastTime = 0, accumulator = 0;
const NORMAL_MAX_FRAME_TIME_MS = 100;
const FAST_FORWARD_MAX_FRAME_TIME_MS = 150;
const MAX_SIMULATION_TICK_CAP = Math.ceil(FAST_FORWARD_MAX_FRAME_TIME_MS * MAX_SIMULATION_SPEED_MULTIPLIER / FIXED_DT);
// MOBILE-FPS-CAP-01 (1.6.48) — see HISTORY.md § [1.6.48]. Standard touch/coarse-pointer
// detection (not User-Agent sniffing, which is unreliable and explicitly discouraged) — computed
// once at boot, never re-evaluated per frame.
let frameCapNextAt = 0; // FRAME-CAP-01 (1.6.128)
// VSYNC-PACE-01 (1.7.77) — see HISTORY.md § [1.7.77]
const VSYNC_GAP_SAMPLES = 30, VSYNC_GAP_MIN_MS = 2, VSYNC_GAP_MAX_MS = 50;
const vsyncGapRing = new Float32Array(VSYNC_GAP_SAMPLES), vsyncGapSorted = new Float32Array(VSYNC_GAP_SAMPLES);
let vsyncGapCount = 0, vsyncLastCallbackAt = 0, vsyncIntervalMs = 0;
function sampleVsyncGap(now){
  const gapMs = now - vsyncLastCallbackAt;
  vsyncLastCallbackAt = now;
  if(gapMs < VSYNC_GAP_MIN_MS || gapMs > VSYNC_GAP_MAX_MS) return;
  vsyncGapRing[vsyncGapCount % VSYNC_GAP_SAMPLES] = gapMs;
  vsyncGapCount++;
  if(vsyncGapCount < VSYNC_GAP_SAMPLES || vsyncGapCount % VSYNC_GAP_SAMPLES !== 0) return;
  vsyncGapSorted.set(vsyncGapRing);
  vsyncGapSorted.sort();
  vsyncIntervalMs = vsyncGapSorted[VSYNC_GAP_SAMPLES >> 2];
}
// VSYNC-PROBE-01 (1.7.110): the screen's refresh interval is measured while the loading screen is up (the sampler used to start with the first game frame, so the first second ran on an unsnapped limit and the frame rate wandered between 60 and 30)
let vsyncProbeActive = false;
function probeVsyncDuringLoading(now){
  if(!vsyncProbeActive) return;
  sampleVsyncGap(now);
  requestAnimationFrame(probeVsyncDuringLoading);
}
function vsyncSnappedCapMs(capMs){
  if(capMs <= 0 || vsyncIntervalMs <= 0) return capMs;
  return Math.max(1, Math.round(capMs / vsyncIntervalMs)) * vsyncIntervalMs;
}
function frameCapEarlyToleranceMs(){ return vsyncIntervalMs > 0 ? vsyncIntervalMs * 0.5 : FRAME_CAP_EARLY_TOLERANCE_MS; }
// CA648 — see HISTORY.md § [1.5.7] Code Archaeology, CA648
function checkAllFightersDown(){
  if(gameState !== 'PLAYING' || waveState === 'IDLE') return false;
  if(!everBuiltFighter) return false; // nothing has ever been built yet — not a loss
  // CA649 — see HISTORY.md § [1.5.7] Code Archaeology, CA649
  let fighterCount = 0, anyStanding = false;
  for(const t of towerPool){
    if(!t.active || isStructureType(t.type)) continue;
    fighterCount++;
    if(t.disabledWavesLeft <= 0){ anyStanding = true; break; }
  }
  if(fighterCount === 0 || !anyStanding){
    endGame('Your whole squad was overrun on wave ' + waveIndex + '.\nRebuild and try again.', 'squad_overrun');
    return true;
  }
  return false;
}
function update(dt){
  if(stealthSantaDefeated && !stealthEncounterEnding && gameState==='PLAYING'){ endGame('Santa has fallen. Ninja is now yours.', 'stealth_victory'); return; }
  gameTime += dt;
  updateFlagWind(dt);
  if(gameTime < hitStopUntil) return; // brief freeze-frame on Boss kills — rendering still happens, physics doesn't
  if(checkAllFightersDown()) return; // loss condition: every fighting stickman overrun at once — see checkAllFightersDown()
  // CA650 — see HISTORY.md § [1.5.7] Code Archaeology, CA650
  if(presentationTime - lastGroundItemSweep > 1000){
    lastGroundItemSweep = presentationTime;
    if(groundItems.length){
      groundItems = groundItems.filter(gi => {
        const stillThere = gi === draggingGroundItem || presentationTime - gi.spawnTime < groundItemLifespan(gi);
        if(!stillThere){ creditGroundBagGold(gi); itemLogReleased(gi.itemDef, 'expired on the ground'); }
        return stillThere;
      });
    }
  }
  updateGroundItemDrift(dt);
  // CA651 — see HISTORY.md § [1.5.7] Code Archaeology, CA651
  let __pt = performance.now();
  updateWind(dt);
  updateScenery(dt);
  updateTreatTacticalEffects(dt);
  updateLightningArcs();
  // EXPAND-REALTIME-01 (1.7.36): the reveal is now driven from updatePresentationEffects() in real time, so it plays at the same calm pace at 1x and 10x.
  // PATHING-MASTER-01 (1.5.9) — see HISTORY.md § [1.5.9]
  phaseTime.ambient += performance.now() - __pt; __pt = performance.now();
  if(waveState === 'SPAWNING'){
    // CA652 — see HISTORY.md § [1.5.7] Code Archaeology, CA652
    if(!anyBarricadeQueued && !waveStartCameraPan){
      advanceWaveDispatch(dt);
    }
  }
  phaseTime.spawning += performance.now() - __pt; __pt = performance.now();

  // CA653 — see HISTORY.md § [1.5.7] Code Archaeology, CA653
  updateBarricadesAndPileup();
  phaseTime.barricade += performance.now() - __pt; __pt = performance.now();
  if(enemyPresenceDirty){ // TARGET-MARK-01 (1.6.94): livestock never block a wave from completing; LAG-PASS-02 (1.6.144): a rescan happens only after one of the events listed at enemyPresenceDirty
    laneEnemiesPresent = false; targetableWandererPresent = false;
    for(const scanned of enemyPool){
      if(!scanned.active) continue;
      if(!scanned.isLivestock){ laneEnemiesPresent = true; break; }
      if(scanned.isHostileNpc || scanned === markedTargetEnemy) targetableWandererPresent = true;
    }
    enemyPresenceDirty = false;
  }
  const anyActiveEnemies = laneEnemiesPresent, anyTargetableWanderer = targetableWandererPresent;
  if(anyActiveEnemies){
    let laneUpdated = 0;
    for(const e of enemyPool) if(e.active && !e.isLivestock){ e.renderPrevX=e.x;e.renderPrevY=e.y;e.renderPrevTraveled=e.traveled;e.update(dt); laneUpdated++; } // livestock wander in real time, see updatePresentationEffects()
    if(laneUpdated === 0) enemyPresenceDirty = true; // the last lane enemy is gone: look again once, for a wanderer to fight
    phaseTime.enemyUpdate += performance.now() - __pt; __pt = performance.now();
    resolveSweptEnemyCollisions(); // catches fast movers that fully crossed paths within this frame, before the regular end-of-frame pass
    resolveEnemyCollisions();
    leashAllEnemiesToLane();
    checkStallWatchdog(dt); // last-resort failsafe — forces genuinely deadlocked (never legitimately-blocked) enemies to keep making progress
    phaseTime.collision += performance.now() - __pt; __pt = performance.now();
  }
  const enemyHashLocal = (anyActiveEnemies || anyTargetableWanderer) ? buildEnemyHash() : EMPTY_ENEMY_HASH;
  enemyHash = enemyHashLocal; // keep the module-scope reference current for gore code that needs it
  phaseTime.hashBuild += performance.now() - __pt; __pt = performance.now();
  tallyCommittedProjectileDamage();
  for(const t of towerPool) if(t.active) t.update(dt, enemyHashLocal);
  phaseTime.towerUpdate += performance.now() - __pt; __pt = performance.now();
  for(const p of projectilePool) if(p.active){ p.renderPrevX = p.x; p.renderPrevY = p.y; p.update(dt, enemyHashLocal); }
  phaseTime.projectile += performance.now() - __pt; __pt = performance.now();
  for(const c of catPool) if(c.active) c.update(dt, enemyHashLocal);
  for(const s of skeletonPool) if(s.active) s.update(dt, enemyHashLocal);
  phaseTime.catSkeleton += performance.now() - __pt; __pt = performance.now();
  updateParticles(dt);
  updateForensicDroplets(dt);
  updateBarricadeChunks(dt);
  updateWalkingBlood(dt);
  updateBloodTrails(dt);
  phaseTime.particles += performance.now() - __pt; __pt = performance.now();


  if(waveState === 'ACTIVE'){
    // CA654 — see HISTORY.md § [1.5.7] Code Archaeology, CA654
    const anyAlive = waveRouteObligationsOutstanding(); // LAG-PASS-03 (1.6.152): a plain loop that stops at the first live enemy
    // CA655 — see HISTORY.md § [1.5.7] Code Archaeology, CA655
    if(!anyAlive){
      waveState = 'IDLE';
      audioEngine.setMusicPhase(countLooseEnemies() > 0 ? 'wave' : 'field');
      if(countLooseEnemies() === 0) playSound('wave_clear');
      wavesCompleted++;
      sessionTelemetry.completedHere++;
      reportOnboardingStep('first_wave_completed');
      logGameEvent('wave cleared: lives ' + lives + ', gold ' + gold + ', waves completed ' + wavesCompleted);
      clearDonutShieldAtWaveEnd();
      clearRoundBuffs();
      awardWaveMedals();
      resetShovelCharges();
      beginRoundDebrisCleanup();
      if(lives < 20) barkFromRandomTower(BARK_TIER_IMPORTANT, '😮‍💨', BARK_LINES.CLOSE_CALL, BARK_CHANCE.CLOSE_CALL);
      maybeReportLag();
      trackGameEvent('wave_completed', {
        wave: waveIndex, duration_s: Math.round((telemetryActiveMs() - waveTelemetry.activeAtStartMs)/1000), simulation_duration_s: Math.round((gameTime - waveTelemetry.startedAtGameTime)/1000), lives_start: waveTelemetry.livesAtStart, lives_end: lives,
        lives_lost: Math.max(0, waveTelemetry.livesAtStart - lives), escaped: waveTelemetry.escaped, loose_peak: waveTelemetry.loosePeak, loose_end: countLooseEnemies(),
        loose_drain_lives: waveTelemetry.looseDrainLives, towers_downed: waveTelemetry.towersDowned, gold_start: waveTelemetry.goldAtStart, gold_end: gold,
        towers: countActiveTowers(), fps_median: perfMedianFps(), gap_p95_ms: Math.round(perfPercentile(perfStats.wallGapMsHistory, 0.95))
      });
      if(wavesCompleted % 5 === 0) trackGameEvent('wave_milestone', { waves_completed: wavesCompleted }); // every 5th wave only — every single wave would be noisy without adding real signal
      reportEngagedPlayerOnce();
      // CA656 — see HISTORY.md § [1.5.7] Code Archaeology, CA656
      if(ringRevealQueue.length) advanceRingReveal(1 + Math.floor(Math.random()*3));
      // CA657 — see HISTORY.md § [1.5.7] Code Archaeology, CA657
      for(const s of skeletonPool) s.active = false;
      processClericHealing();
      checkTowerUnlocks();
      maybeSpawnMoreScenery();
      runWaveClearRandomEvents();
      waveCheerStart = presentationTime; waveCheerUntil = presentationTime + WAVE_CHEER_MS;
      grantEarlyGift();
      maybeSpawnCaravan();
      maybeShowWaveTutorialTip();
      // TENNIS-SHOES-MOVE-01 (1.7.44), now the Running Shoes (1.7.113): shoes are a normal item with a passive bonus, not a used item: every pair a stickman carries gives one free move
      // at the start of every round (counted once per pair, up to the cap), with no action from the player.
      for(const t of towerPool) if(t.active && isFighterTower(t)) for(const item of t.equippedItems) if(item.extraMove) grantTowerMove(t, '👟');
      // CA658 — see HISTORY.md § [1.5.7] Code Archaeology, CA658
      if(wavesCompleted % 5 === 0 && freeBarricadesLeft < MAX_FREE_BARRICADES){
        freeBarricadesLeft++;
      }
      // CA659 — see HISTORY.md § [1.5.7] Code Archaeology, CA659
      for(const d of decals){
        if(d.isEmojiDrop && d.char === '💀' && d.wormPending && !d.wormSpawned){
          spawnWormFromSkull(d);
          d.wormSpawned = true;
          d.wormPending = false;
        }
      }
      for(const d of decals){
        if(d.isEmojiDrop && d.char === '💀' && !d.wormSpawned && !d.wormPending){
          if(Math.random() < 0.1) d.wormPending = true;
        }
      }
      { // FREE-EXPAND-EVERY-WAVE-01 (1.6.121) — see HISTORY.md § [1.6.121]
        // CA660 — see HISTORY.md § [1.5.7] Code Archaeology, CA660
        if(countLooseEnemies() === 0) freeExpansionOwed++; // CLEAN-WAVE-EXPAND-01 (1.7.135) — see HISTORY.md § [1.7.135]
        else logGameEvent('free expansion forfeited: escaped enemies still alive at wave end');
      }
      if(wavesCompleted % 10 === 0){
        showMilestoneToast(wavesCompleted);
      }
      gold += 10 + Math.floor(wavesCompleted/2); // scaling reward — keeps pace with infinite waves
      // CA661 — see HISTORY.md § [1.5.7] Code Archaeology, CA661
      if(Math.random() < WAVE_DROP_CHANCE){
        const fighters = towerPool.filter(t => t.active && isFighterTower(t));
        if(fighters.length){
          const near = fighters[Math.floor(Math.random()*fighters.length)];
          const angle = Math.random()*Math.PI*2, dist = 20 + Math.random()*20;
          const drop = WAVE_DROP_ITEMS[Math.floor(Math.random()*WAVE_DROP_ITEMS.length)];
          spawnGroundItem(near.x + Math.cos(angle)*dist, near.y + Math.sin(angle)*dist - 4, drop, 'wave reward');
          showToast(drop.icon + ' ' + drop.name + ' dropped!');
        }
      }
      awardWaveClearExperience();
      const towerReports = towerPool.filter(t => t.active && isFighterTower(t) && t.waveXp > 0).map(t => ({
        icon: t.def.icon, name: t.legendaryName || t.def.name, xp: t.waveXp,
        lastHits: t.waveLastHits || 0, damage: t.waveDamage || 0, assists: t.waveAssists || 0, cleanups: t.waveCleanups || 0,
        statGain: t.waveStatPoints || 0
      }));
      showWaveSummary(waveIndex, gold - waveStartGold, towerReports);
      offerRunReward(wavesCompleted);
      updateHUD();
    }
  }
  phaseTime.waveLogic += performance.now() - __pt;
}
/* =========================================================
   TARGET FRAME, RANGE RING AND GROUND GLOW
   ========================================================= */
const inspTargetFrame = document.getElementById('inspTargetFrame');
const targetPortraitFace = document.getElementById('targetPortraitFace');
const targetName = document.getElementById('targetName');
const targetHpBarFill = document.getElementById('targetHpBarFill');
const targetHpBarText = document.getElementById('targetHpBarText');
const targetDefVal = document.getElementById('targetDefVal');
const targetSpeedVal = document.getElementById('targetSpeedVal');
const targetWeightVal = document.getElementById('targetWeightVal');
// CA662 — see HISTORY.md § [1.5.7] Code Archaeology, CA662
let targetFrameContentKey = '';
let targetFrameWasVisible = false;
let targetFrameLayoutDirty = true, targetFramePanelObserver = null;
let targetFrameLastPanelTower = null, targetFrameLastPanelExpanded = false;
let targetFrameLastTower = null; // #inspect-panel has no fixed height (rows are conditionally hidden per tower type), so switching to a different selected tower can change its geometry even while the target frame stays continuously visible throughout — this catches that case, which resize/visibility-transition alone don't
window.addEventListener('resize', () => { targetFrameLayoutDirty = true; });
function updateTargetFrame(){
  if(!targetFramePanelObserver && typeof ResizeObserver === 'function'){ targetFramePanelObserver = new ResizeObserver(() => { targetFrameLayoutDirty = true; }); targetFramePanelObserver.observe(inspectPanel); }
  const frame = inspTargetFrame;
  const t = selectedTower;
  const pinned = markedTargetEnemy && markedTargetEnemy.active;
  const target = pinned ? markedTargetEnemy : t && t.active ? t.target : null;
  if(!target || !target.active || (!pinned && inspPanelExpanded)){
    if(targetFrameWasVisible){ frame.classList.remove('show'); targetFrameWasVisible = false; }
    return;
  }
  const hpPct = target.maxHp > 0 ? Math.max(0, Math.min(100, (target.hp/target.maxHp)*100)) : 0;
  const moveSpeed = isEnemyHeldInPlace(target) ? 0 : Math.min(target.packedSpeed()*enemyMoveMultiplier(target), target.followSpeedCap === undefined ? Infinity : target.followSpeedCap); // TARGET-SPEED-01 (1.8.43): an enemy held at a barricade keeps its walking speed on the card and reads Blocked
  const contentKey = Math.round(moveSpeed) + ':' + pinned + ':' + target.id + ':' + Math.round(hpPct) + ':' + Math.round(target.hp) + ':' + target.armor + ':' + Math.round(target.speed) + ':' + target.weight.toFixed(2) + ':' + target.shieldHp + ':' + (target.frozenUntil > gameTime) + ':' + (target.stunnedUntil > gameTime) + ':' + (target.bleedUntil > gameTime) + ':' + (target.poisonUntil > gameTime) + ':' + (target.burnUntil > gameTime);
  if(contentKey !== targetFrameContentKey){
    targetFrameContentKey = contentKey;
    document.getElementById('targetHeaderLabel').textContent = pinned ? 'PINNED ENEMY' : 'TARGETING';
    targetPortraitFace.textContent = target.emoji;
    const info = ENEMY_INFO[target.type];
    // CA663 — see HISTORY.md § [1.5.7] Code Archaeology, CA663
    targetName.textContent = target.isHutBuilding ? (target.buildingKind === 'CIRCUS' ? 'Circus' : target.buildingKind === 'CASTLE' ? 'Castle' : target.buildingKind === 'GRAVE' ? 'Zombie Grave' : 'Hut') : target.isGuardian ? (target.hutRef && target.hutRef.buildingKind === 'CASTLE' ? 'Castle Guardian' : target.hutRef && target.hutRef.buildingKind === 'GRAVE' ? 'Grave Zombie' : 'Hut Guardian') : (info ? info.name : target.type);
    targetHpBarFill.style.width = hpPct + '%';
    targetHpBarText.textContent = Math.round(target.hp) + '/' + target.maxHp;
    targetDefVal.textContent = target.armor;
    targetSpeedVal.textContent = Math.round(moveSpeed);
    targetWeightVal.textContent = target.weight.toFixed(1);
    document.getElementById('targetGoldVal').textContent = target.bounty;
    document.getElementById('targetXpVal').textContent = SIZE_TIER_BANDS[target.sizeTier || 'STANDARD'].xp;
    document.getElementById('targetDamageVal').textContent = Math.max(1, Math.round(target.breakDamage*ENEMY_DAMAGE_SCALE*(typeof target.bossDamageMult === 'function' ? target.bossDamageMult() : 1)));
    document.getElementById('targetShieldVal').textContent = Math.round(target.shieldHp || 0);
    document.getElementById('targetEvasionVal').textContent = Math.round(tinyGruntEvasion(target)*100) + '%';
    document.getElementById('targetEffects').textContent = [target.sizeTier, target.escaped ? 'Escaped' : '', target.frozenUntil > gameTime ? 'Frozen' : '', target.pileBlocked ? 'Blocked' : '', target.stunnedUntil > gameTime ? 'Stunned' : '', target.bleedUntil > gameTime ? 'Bleeding' : '', target.poisonUntil > gameTime ? 'Poisoned' : '', target.burnUntil > gameTime ? 'Burning' : ''].filter(Boolean).join(' · ');
  }
  if(!targetFrameWasVisible){
    frame.classList.add('show');
    targetFrameWasVisible = true;
    targetFrameLayoutDirty = true; // just became visible — geometry may be stale from whenever it was last shown
  }
  if((pinned ? target : t) !== targetFrameLastTower){
    targetFrameLastTower = pinned ? target : t;
    targetFrameLayoutDirty = true; // a different tower's panel can have different height (rows are conditionally shown per type), even if the frame never hid in between
  }
  if(t !== targetFrameLastPanelTower || inspPanelExpanded !== targetFrameLastPanelExpanded){ targetFrameLayoutDirty = true; targetFrameLastPanelTower = t; targetFrameLastPanelExpanded = inspPanelExpanded; }
  if(!targetFrameLayoutDirty) return;
  targetFrameLayoutDirty = false;
  const panelRect = inspectPanel.getBoundingClientRect();
  const containerRect = document.getElementById('canvas-frame').getBoundingClientRect();
  const panelVisible = !inspectPanel.classList.contains('hidden');
  const sideLeft = panelVisible ? panelRect.right - containerRect.left + 8 : 8;
  const room = containerRect.width - sideLeft - 8;
  const beside = !pinned && panelVisible && room >= 320;
  frame.style.left = beside ? sideLeft + 'px' : '8px';
  frame.style.right = 'auto';
  const cardBottom = Math.min(!beside && panelVisible ? containerRect.bottom - panelRect.top + 8 : 8, Math.max(8,containerRect.height-200));
  frame.style.bottom = cardBottom + 'px';
  frame.style.width = Math.min(420, beside ? room : containerRect.width - 16) + 'px';
  frame.style.maxWidth = 'calc(100% - 16px)';
  frame.style.minHeight = '0';
  frame.style.maxHeight = Math.max(48,containerRect.height-cardBottom-80) + 'px';
  frame.style.overflowY = 'auto';
}
// CA665 — see HISTORY.md § [1.5.7] Code Archaeology, CA665
// TARGET-MARK-01 (1.6.94): drawn near drawSelectedTowerArrow() since both are player-aimed pointer UI
// RANGE-RING-SUITS-01 (1.7.112) — see HISTORY.md § [1.7.112]: the range edge is a slow counter-clockwise procession of the four card suits in black, white order (club, heart, spade,
// diamond), spaced wide (92 px apart on screen), and everything outside the range is dimmed like fog of war. Real time, constant on-screen size at any zoom.
const RANGE_RING_DOT_PX = 13, RANGE_RING_DOT_SPACING_PX = 92, RANGE_RING_SPEED_PX_PER_S = 30, RANGE_FOG_ALPHA = 0.42;
const RANGE_RING_SUITS = ['CLUB', 'HEART', 'SPADE', 'DIAMOND'];
function traceSuitPath(ctx, suit){
  ctx.beginPath();
  if(suit === 'HEART'){
    ctx.moveTo(0, 0.9); ctx.bezierCurveTo(-1.35, 0.05, -0.95, -0.95, 0, -0.38); ctx.bezierCurveTo(0.95, -0.95, 1.35, 0.05, 0, 0.9);
  } else if(suit === 'DIAMOND'){
    ctx.moveTo(0, -1); ctx.lineTo(0.72, 0); ctx.lineTo(0, 1); ctx.lineTo(-0.72, 0); ctx.closePath();
  } else if(suit === 'SPADE'){
    ctx.moveTo(0, -1); ctx.bezierCurveTo(-1.35, -0.05, -1.0, 0.78, 0, 0.28); ctx.bezierCurveTo(1.0, 0.78, 1.35, -0.05, 0, -1); ctx.closePath();
    ctx.moveTo(0, 0.15); ctx.lineTo(-0.36, 1); ctx.lineTo(0.36, 1); ctx.closePath();
  } else {
    for(const [centerX, centerY] of [[0, -0.52], [-0.52, 0.22], [0.52, 0.22]]){ ctx.moveTo(centerX + 0.46, centerY); ctx.arc(centerX, centerY, 0.46, 0, Math.PI*2); }
    ctx.moveTo(0, -0.52); ctx.lineTo(0.52, 0.22); ctx.lineTo(-0.52, 0.22); ctx.closePath();
    ctx.moveTo(0, 0.1); ctx.lineTo(0.34, 1); ctx.lineTo(-0.34, 1); ctx.closePath();
  }
}
function drawSuitSymbol(ctx, suit, x, y, halfSize){
  const isBlack = suit === 'CLUB' || suit === 'SPADE';
  ctx.save(); ctx.translate(x, y); ctx.scale(halfSize, halfSize);
  traceSuitPath(ctx, suit);
  ctx.lineJoin = 'round'; ctx.lineWidth = 0.5; ctx.strokeStyle = isBlack ? 'rgba(255,255,255,0.92)' : 'rgba(12,8,4,0.92)'; ctx.stroke();
  ctx.fillStyle = isBlack ? '#120d09' : '#ffffff'; ctx.fill();
  ctx.restore();
}
function drawSelectedTowerRange(ctx){
  const tower=selectedTower;
  if(!tower || !tower.active || isStructureType(tower.type)) return;
  const radius=tower.targetingRange || tower.range;
  if(!(radius>0)) return;
  const zoomFactor=Math.max(0.25,camera.zoom), view=fxViewBounds();
  ctx.save();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(6,4,2,'+RANGE_FOG_ALPHA+')';
  ctx.beginPath(); ctx.rect(view.left, view.top, view.right-view.left, view.bottom-view.top); ctx.moveTo(tower.x+radius, tower.y); ctx.arc(tower.x,tower.y,radius,0,Math.PI*2); ctx.fill('evenodd');
  const circumference=2*Math.PI*radius, suitCount=Math.max(8, 4*Math.round(circumference*zoomFactor/RANGE_RING_DOT_SPACING_PX/4)); // a multiple of four keeps the black-white order closed all the way round
  const travelAngle=PREFERS_REDUCED_MOTION ? 0 : (presentationTime/1000)*RANGE_RING_SPEED_PX_PER_S/zoomFactor/radius, step=Math.PI*2/suitCount, halfSize=RANGE_RING_DOT_PX*0.5/zoomFactor;
  for(let index=0; index<suitCount; index++){
    const angle=index*step-travelAngle;
    drawSuitSymbol(ctx, RANGE_RING_SUITS[index%4], tower.x+Math.cos(angle)*radius, tower.y+Math.sin(angle)*radius, halfSize);
  }
  const splash=(tower.splashRadius || 0)+(towerElement(tower)==='QUASAR' ? QUASAR_ELEMENT_SPLASH_RADIUS : 0);
  if(splash>0 && tower.target && tower.target.active){
    ctx.lineCap='butt'; ctx.lineDashOffset=0;
    ctx.setLineDash([6/zoomFactor,4/zoomFactor]);
    ctx.lineWidth=1.5/zoomFactor;
    ctx.strokeStyle='rgba(225,110,45,0.8)';
    ctx.beginPath();ctx.arc(tower.target.x,tower.target.y,splash,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function drawSelectedTowerArrow(ctx){
  if(!selectedTower || !selectedTower.active) return;
  const bob = Math.sin(presentationTime/260) * 7; // GAME-SPEED-SCOPE-01 (1.6.93): a UI pointer, not gameplay — must not speed up with 2x/3x/5x/10x
  const arrowY = selectedTower.y - 58 + bob;
  ctx.save();
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.fillText('👇', selectedTower.x, arrowY);
  ctx.restore();
}
// OVERLAY-RANK-CACHE-01 (1.7.53): the overlay's tower ranking filtered and sorted the whole pool every frame; it is now rebuilt at most every 250 ms.
const OVERLAY_RANK_REFRESH_MS = 250;
let overlayRankBuiltAt = -Infinity, overlayRankCache = [];
function overlayTowerRanking(){
  const now = performance.now();
  if(now - overlayRankBuiltAt >= OVERLAY_RANK_REFRESH_MS){
    overlayRankBuiltAt = now;
    overlayRankCache = towerPool.filter(t => t.active && t.telemetry).sort((a,b) => (b.lifetimeDamage||0) - (a.lifetimeDamage||0));
  }
  return overlayRankCache;
}
// GROUND-GLOW-SPRITE-01 (1.7.52): ground-item glows were a new radial gradient, three colour strings and an arc fill per item per frame.
// Now one small canvas per (hue step, radius) is drawn once and blitted; the pulse is the blit's alpha, which is exactly how the gradient scaled.
const GROUND_GLOW_HUE_STEP = 6;
const groundItemGlowSprites = new Map();
function groundItemGlowSprite(hue, radius, saturation = 100){
  const hueStep = Math.round(hue / GROUND_GLOW_HUE_STEP) % (360 / GROUND_GLOW_HUE_STEP);
  const key = (hueStep * 100 + radius) * 2 + (saturation < 50 ? 1 : 0);
  let sprite = groundItemGlowSprites.get(key);
  if(sprite) return sprite;
  sprite = document.createElement('canvas'); sprite.width = sprite.height = Math.ceil(radius * 2);
  const spriteCtx = sprite.getContext('2d'), centre = sprite.width / 2, hueDegrees = hueStep * GROUND_GLOW_HUE_STEP;
  const gradient = spriteCtx.createRadialGradient(centre, centre, 0, centre, centre, radius);
  const glowSaturation = saturation < 50 ? 0 : 100, glowLightness = saturation < 50 ? 88 : 58;
  gradient.addColorStop(0, `hsla(${hueDegrees}, ${glowSaturation}%, ${glowLightness}%, 0.85)`);
  gradient.addColorStop(0.55, `hsla(${hueDegrees}, ${glowSaturation}%, ${glowLightness}%, 0.35)`);
  gradient.addColorStop(1, `hsla(${hueDegrees}, ${glowSaturation}%, ${glowLightness}%, 0)`);
  spriteCtx.fillStyle = gradient; spriteCtx.fillRect(0, 0, sprite.width, sprite.height);
  groundItemGlowSprites.set(key, sprite);
  return sprite;
}
/* =========================================================
   RENDER
   ========================================================= */
function render(ctx){
  updateTargetFrame();
  updateCameraFollow();
  updateWaveStartCameraPan();
  updateRoundEnemyFollow();
  ctx.setTransform(dprValue,0,0,dprValue,0,0);
  ctx.fillStyle = OPAQUE_CANVAS_BACKGROUND; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  ctx.save();
  let shakeX = 0, shakeY = 0;
  if(screenShakeUntil > presentationTime){
    const remain = (screenShakeUntil - presentationTime) / 130;
    shakeX = (Math.random()*2-1) * screenShakeMag * remain;
    shakeY = (Math.random()*2-1) * screenShakeMag * remain;
  } else {
    screenShakeMag = 0;
  }
  // PAN-SNAP-01 (1.7.36): the camera is drawn at whole device pixels. A fractional offset makes the cached map and every tile edge re-sample (blurred, shimmering
  // seams) on every panning frame; the camera itself stays smooth and fractional, only the drawing position is snapped.
  // PAN-SUBPIXEL-01 (1.7.124): rounding the camera to whole pixels cannot move smoothly below one pixel per frame, so the slow start and end of every automatic pan (and a drag or coast that is barely moving) showed 2 px jumps with frozen frames between them in a recorded clip. While the camera moves slower than PAN_SUBPIXEL_MAX_STEP_PX per frame it is drawn at its exact fractional position; faster motion and a still camera stay snapped.
  const cameraDrawX = camera.x + shakeX, cameraDrawY = camera.y + shakeY;
  if(perfStats.cameraSubpixelMotion) ctx.translate(cameraDrawX, cameraDrawY);
  else ctx.translate(Math.round(cameraDrawX * dprValue) / dprValue, Math.round(cameraDrawY * dprValue) / dprValue);
  ctx.scale(camera.zoom, camera.zoom);

  // CA666 — see HISTORY.md § [1.5.7] Code Archaeology, CA666
  let __rpt = performance.now();
  const worldView = visibleWorldRect();
  if(camera.zoom > CRISP_MAP_MIN_ZOOM) drawCrispMap(ctx, worldView); else blitWorldLayer(ctx, mapCanvas, worldView); // static map, pre-rendered once — see BOOT; CRISP-MAP-01 above it
  if(graphicsQuality === 'high') drawAnimatedFlora(ctx, fxViewBounds());
  drawPendingRingReveal(ctx); // spiral map-growth: tiles already buildable (isInActiveRegion) but not yet baked into mapCanvas — see advanceRingReveal()
  renderPhaseTime.mapBlit += performance.now() - __rpt; __rpt = performance.now();
  maintainDecals();
  if(settledDecalCanvasReady && settledDecalHasContent && camera.zoom <= 1.25) blitWorldLayer(ctx, settledDecalCanvas, worldView); // settled/baked blood pools — one blit instead of hundreds of individual redraws, see rebuildSettledDecalCanvas()
  // CA667 — see HISTORY.md § [1.5.7] Code Archaeology, CA667
  drawDecals(ctx);
  renderPhaseTime.decals += performance.now() - __rpt; __rpt = performance.now();
  drawBuildPreview(ctx);
  drawBarricadeChunks(ctx);
  drawDeathAnims(ctx);
  if(markedTargetEnemy) markedTargetEnemy.pinPaintedId=-1; // only the current visible render may supply the pin anchor
  drawDepthSortedLayer(ctx); // scenery + enemies + towers + bone/skull/worm debris, interleaved by Y-depth — see drawDepthSortedLayer() for why
  drawSelectedTowerRange(ctx);
  drawSelectedTowerArrow(ctx);
  const depthSortedPhaseMs = performance.now() - __rpt;
  renderPhaseTime.depthSorted += depthSortedPhaseMs;
  perfStats.lastDepthSortedMs = depthSortedPhaseMs;
  __rpt = performance.now();
  const groundItemBounds = fxViewBounds();
  for(const zone of lollipopZones){
    if(zone.x + LOLLIPOP_SLOW_RADIUS < groundItemBounds.left || zone.x - LOLLIPOP_SLOW_RADIUS > groundItemBounds.right || zone.y + LOLLIPOP_SLOW_RADIUS < groundItemBounds.top || zone.y - LOLLIPOP_SLOW_RADIUS > groundItemBounds.bottom) continue;
    const timeLeftFrac = Math.max(0, (zone.expiresAt - gameTime) / LOLLIPOP_ZONE_DURATION_MS);
    ctx.save();
    ctx.globalAlpha = 0.35 * timeLeftFrac;
    ctx.fillStyle = '#ff8fd0';
    ctx.beginPath(); ctx.arc(zone.x, zone.y, LOLLIPOP_SLOW_RADIUS, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  for(const gi of groundItems){
    if(draggingGroundItem === gi) continue; // drawn separately below, at the drag cursor instead of its resting spot
    const bob = groundItemBobPx(gi);
    if(!fxVisible(gi.x, gi.y + bob, groundItemBounds)) continue;
    ctx.save();
    if(Number.isFinite(gi.flyStart) && presentationTime - gi.flyStart < gi.flyDur){
      const ft = Math.max(0, (presentationTime - gi.flyStart)/gi.flyDur), fp = 1 - Math.pow(1 - ft, 2);
      ctx.translate((gi.flyFromX - gi.x)*(1 - fp), (gi.flyFromY - gi.y)*(1 - fp) - Math.sin(ft*Math.PI)*34);
    }
    if(Number.isFinite(gi.rejectStartedAt) && presentationTime-gi.rejectStartedAt<240 && !PREFERS_REDUCED_MOTION){
      const t=Math.max(0,(presentationTime-gi.rejectStartedAt)/240),p=1-Math.pow(1-t,2);
      ctx.translate((gi.rejectFromX-gi.x)*(1-p),(gi.rejectFromY-gi.y)*(1-p)-Math.sin(t*Math.PI)*10);
    }
    drawEmojiGroundShadow(ctx,gi.itemDef.icon,gi.x,gi.y,GROUND_ITEM_EMOJI_PX,'sans-serif',1); // SHADOW-ALIGN-01 (1.8.14)
    // CA668 — see HISTORY.md § [1.5.7] Code Archaeology, CA668
    const isFoodOrTreat = gi.itemDef.isFood || gi.itemDef.isTreat || gi.itemDef.isHutLoot;
    const isGoldCurrencyItem = !!gi.itemDef.isGoldBag || !!(gi.itemDef.isHutLoot && gi.itemDef.kind === 'gold');
    const itemRarity = isFoodOrTreat ? (gi.itemDef.isTreat ? TREAT_GLOW_STYLE : FOOD_GLOW_STYLE) : (ITEM_RARITIES[gi.itemDef.rarity] || ITEM_RARITIES.COMMON);
    const hueSpeed = itemRarity.hueMsPerDegree; // ms per degree — lower = faster cycle
    const glowStyle = itemGlowStyle(gi.itemDef);
    const hue = isGoldCurrencyItem ? 44 : glowStyle.rainbow ? (presentationTime / hueSpeed + gi.id * 47) % 360 : glowStyle.hue;
    const ringColorHex = glowStyle.sat < 50 && !isGoldCurrencyItem ? 'hsl(0, 0%, 92%)' : `hsl(${hue.toFixed(0)}, 100%, 58%)`;
    // CA669 — see HISTORY.md § [1.5.7] Code Archaeology, CA669
    const glowPulse = isGoldCurrencyItem ? 0.30 + (Math.sin(presentationTime/430 + gi.id)*0.5 + 0.5)*0.60 : 0.55 + Math.sin(presentationTime/280 + gi.id)*0.25;
    const glowRadius = isGoldCurrencyItem ? Math.max(23, itemRarity.glowRadius) : itemRarity.glowRadius;
    const glowSprite = groundItemGlowSprite(hue, glowRadius, isGoldCurrencyItem ? 100 : glowStyle.sat);
    const entryAlpha = ctx.globalAlpha;
    ctx.globalAlpha = entryAlpha * Math.min(1, glowPulse);
    ctx.drawImage(glowSprite, gi.x - glowRadius, gi.y + bob - glowRadius);
    ctx.globalAlpha = entryAlpha;
    if(graphicsQuality === 'high' && !underHeavyVisualLoad){ ctx.shadowColor = ringColorHex; ctx.shadowBlur = 8; } // GROUND-GLOW-SPRITE-01 (1.7.52): the glow is a cached sprite; the text halo stays on High only
    ctx.font = GROUND_ITEM_EMOJI_PX + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(gi.itemDef.icon, gi.x, gi.y + bob);
    ctx.restore();
  }
  if(draggingGroundItem){
    ctx.save();
    ctx.fillStyle = 'rgba(255,233,168,0.10)';
    ctx.strokeStyle = 'rgba(255,233,168,0.55)';
    ctx.lineWidth = 2;
    for(const circle of activeItemReachCircles()){
      ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawEmojiGroundShadow(ctx,draggingGroundItem.itemDef.icon,dragItemPos.x,dragItemPos.y,26,'sans-serif',1);
    ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(draggingGroundItem.itemDef.icon, dragItemPos.x, dragItemPos.y);
    ctx.restore();
    // CA671 — see HISTORY.md § [1.5.7] Code Archaeology, CA671
    const hoverTarget = itemDropTargetAt(dragItemPos);
    if(hoverTarget){
      ctx.save();
      ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👇🏻', hoverTarget.x, hoverTarget.y - hoverTarget.radius - 18);
      ctx.restore();
    }
  }
  renderPhaseTime.groundItems += performance.now() - __rpt; __rpt = performance.now();
  drawCaravan(ctx);
  for(const c of catPool) if(c.active){ c.draw(ctx); drawBloodStains(ctx, c); }
  for(const s of skeletonPool) if(s.active){ s.draw(ctx); drawBloodStains(ctx, s); }
  for(const p of projectilePool) if(p.active) drawProjectileSmoothed(ctx, p);
  renderPhaseTime.minionsProjectiles += performance.now() - __rpt; __rpt = performance.now();
  drawLightningArcs(ctx);
  drawParticles(ctx);
  drawFloatingTexts(ctx);
  drawItemUseEffects(ctx);
  drawCoinPickups(ctx);
  drawAmbientLogs(ctx);
  renderPhaseTime.particlesText += performance.now() - __rpt; __rpt = performance.now();
  for(const it of depthSortItems) if(it.kind==='e' && it.e.type==='BEE') it.e.draw(ctx); // above world emojis, below interface overlays
  drawMarkedTargetIcon(ctx); // PIN-BEE-01 (1.8.18): after the bee's own pass, so a marked bee has an anchor this frame
  drawSpawnWarningMarker(ctx);
  drawWaveCountdown(ctx);
  for(const it of depthSortItems) if(it.kind === 's') drawClearingHourglass(ctx,it.item,it.size); // CLEAR-OVERLAY-01: above all world props and actors
  for(const it of depthSortItems) if(it.kind === 'r') drawTowerScroll(ctx,it.t,it.scrollY); // SCROLL-OVERLAY-01: above world actors, props and combat effects
  drawBarks(ctx); // CHAT-OVERLAY-01: final world layer, above scrolls and harvest indicators

  ctx.restore();
  drawGoldHudFlights(ctx);
  drawHeartHudFlights(ctx);
  drawBossCompass(ctx);
  updateAndDrawBlowingLeaves(ctx);
  if(showFpsCounter) drawFpsCounter(ctx);
  if(debugOverlay) drawDebugOverlay(ctx);
  renderPhaseTime.overlays += performance.now() - __rpt;
}
/* =========================================================
   DEBUG OVERLAY, FPS COUNTER, COUNTDOWN AND BOSS COMPASS
   ========================================================= */
// Debug mode readout — everything worth seeing in a screenshot or a recorded clip.
function countActive(pool){ let n = 0; for(const item of pool) if(item.active) n++; return n; }
const debugOverlayCanvasElement = document.getElementById('gameCanvas');
const debugOverlayHudElement = document.getElementById('hud-top');
let debugOverlayLayoutDirty = true;
let debugOverlayBelowHudY = 6;
function invalidateDebugOverlayLayout(){ debugOverlayLayoutDirty = true; }
function getDebugOverlayBelowHudY(){
  if(!debugOverlayLayoutDirty) return debugOverlayBelowHudY;
  debugOverlayLayoutDirty = false;
  const canvasRect = debugOverlayCanvasElement && debugOverlayCanvasElement.getBoundingClientRect();
  const hudRect = debugOverlayHudElement && debugOverlayHudElement.getBoundingClientRect();
  debugOverlayBelowHudY = canvasRect && hudRect && debugOverlayHudElement.style.display !== 'none'
    ? Math.ceil(hudRect.bottom - canvasRect.top + 6)
    : 6;
  return debugOverlayBelowHudY;
}
window.addEventListener('resize', invalidateDebugOverlayLayout);
window.addEventListener('orientationchange', invalidateDebugOverlayLayout);
document.addEventListener('fullscreenchange', invalidateDebugOverlayLayout);
let debugOverlayResizeObserver = null;
if(typeof ResizeObserver !== 'undefined'){
  debugOverlayResizeObserver = new ResizeObserver(invalidateDebugOverlayLayout);
  if(debugOverlayCanvasElement) debugOverlayResizeObserver.observe(debugOverlayCanvasElement);
  if(debugOverlayHudElement) debugOverlayResizeObserver.observe(debugOverlayHudElement);
}
// DEBUG-OVERLAY-CACHE-01 (1.6.152) — see HISTORY.md § [1.6.152]. The overlay's text and box size are rebuilt a few times a second, not every frame:
// the per-frame cost is one rectangle and a handful of text draws from the cached layout.
// OVERLAY-HOST-HINT-01 (1.7.55): browsers never expose the CPU model, so the overlay reports what they do expose: OS and CPU architecture from User-Agent Client Hints, else the platform string.
let hostHintText = (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : '';
if(navigator.userAgentData && navigator.userAgentData.getHighEntropyValues){
  navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'platform']).then(hints => {
    const arch = hints.architecture ? hints.architecture + (hints.bitness ? '-' + hints.bitness : '') : '';
    hostHintText = [hints.platform, arch].filter(Boolean).join(' ') || hostHintText;
  }).catch(() => {});
}
const DEBUG_OVERLAY_REFRESH_MS = 250;
let debugOverlayLayout = null, debugOverlayBuiltAt = -1e9;
function drawDebugOverlay(ctx){
  const nowReal = performance.now();
  if(nowReal - debugOverlayBuiltAt >= DEBUG_OVERLAY_REFRESH_MS || (debugOverlayLayout && (debugOverlayLayout.canvasW !== CANVAS_W || debugOverlayLayout.canvasH !== CANVAS_H))){
    debugOverlayLayout = buildDebugOverlayLayout(ctx);
    debugOverlayBuiltAt = nowReal;
  }
  const layout = debugOverlayLayout;
  if(!layout) return;
  ctx.save();
  ctx.font = 'bold ' + layout.fontPx + 'px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(layout.boxLeft, layout.belowHudY, layout.boxWidth, layout.boxHeight);
  ctx.fillStyle = '#7ee787';
  for(let i = 0; i < layout.visibleLines.length; i++) ctx.fillText(layout.visibleLines[i], layout.boxLeft + 6, layout.belowHudY + 4 + i * layout.lineHeight);
  ctx.restore();
}
// OVERLAY-GRID-01 (1.7.119): the summary is a grid of short cells whose columns are as wide as their longest cell, so every row lines up and no cell is ever cut; single long items (GPU, last minute, scale) take a full row and wrap at word breaks instead of being truncated.
const OVERLAY_COLUMN_GAP = 2;
function overlayGridRow(...cells){ return cells.map(String); }
function overlayFullRow(text){ return String(text); }
function alignOverlayRows(entries){
  const columnWidths = [];
  for(const entry of entries) if(Array.isArray(entry)) entry.forEach((cell, column) => { columnWidths[column] = Math.max(columnWidths[column] || 0, cell.length); });
  return entries.map(entry => Array.isArray(entry) ? entry.map((cell, column) => column === entry.length - 1 ? cell : cell.padEnd(columnWidths[column] + OVERLAY_COLUMN_GAP)).join('').trimEnd() : entry);
}
function buildDebugOverlayLayout(ctx){
  const compact=CANVAS_W<600;
  let onPath = 0, escaped = 0, dying = 0;
  for(const e of enemyPool){
    if(!e.active) continue;
    if(e.escaped) escaped++; else onPath++;
    if(e.hp <= 0) dying++;
  }
  const phase = activeWavePlan && activeWavePlan.phases[waveDispatch.phaseIndex];
  const lines = compact ? [
    'v'+GAME_VERSION+' '+graphicsQuality+' '+Math.round(perfStats.smoothedFps || 0)+' FPS',
    'frame '+(perfStats.frameMs || 0).toFixed(1)+' update '+(perfStats.updateMs || 0).toFixed(1)+' render '+(perfStats.renderMs || 0).toFixed(1)+'ms',
    'wave '+waveIndex+' '+waveState+' enemies '+(onPath+escaped),
    'towers '+countActive(towerPool)+' shots '+countActive(projectilePool)+' decals '+decals.length,
    'CPU '+(navigator.hardwareConcurrency || '?')+' threads RAM ~'+(navigator.deviceMemory || '?')+'GiB',
    'GPU '+String(renderEnvironment.gpuRenderer).slice(0,30)
  ] : [
    overlayGridRow('v' + GAME_VERSION + ' ' + graphicsQuality + ' ' + Math.round(perfStats.smoothedFps || 0) + ' FPS', 'zoom ' + camera.zoom.toFixed(2), 'cam ' + Math.round(camera.x) + ',' + Math.round(camera.y)),
    overlayGridRow('CPU ' + (navigator.hardwareConcurrency || '?') + ' threads', 'RAM ' + (navigator.deviceMemory ? '~' + navigator.deviceMemory + ' GiB' : '?'), performance.memory ? 'heap ' + (performance.memory.usedJSHeapSize/1048576).toFixed(0) + ' MiB' : ''),
    overlayGridRow(hostHintText || '', 'screen ' + screen.width + 'x' + screen.height + ' @' + (window.devicePixelRatio || 1).toFixed(2), 'canvas ' + CANVAS_W + 'x' + CANVAS_H),
    overlayFullRow('GPU ' + String(renderEnvironment.gpuRenderer)),
    overlayGridRow('frame ' + (perfStats.frameMs || 0).toFixed(1) + 'ms', 'upd ' + (perfStats.updateMs || 0).toFixed(1) + ' rend ' + (perfStats.renderMs || 0).toFixed(1), 'hud ' + (perfStats.hudMs || 0).toFixed(2) + ' tick ' + (perfStats.msPerTick || 0).toFixed(2)),
    overlayGridRow('speed ' + (perfStats.requestedSpeed || 1).toFixed(0) + 'x asked ' + (perfStats.achievedSpeed || 0).toFixed(1) + 'x', 'ticks x' + (perfStats.ticksThisFrame || 0), 'music ' + ((audioEngine.debugCounters && audioEngine.debugCounters.musicSchedulerAvgMs) || 0).toFixed(2) + 'ms'),
    overlayGridRow('wave ' + waveIndex + ' ' + waveState, phase ? phase.sizeTier + ' b' + (waveDispatch.batchIndex + 1) + '/' + phase.batches.length : '', 'enemies ' + onPath + ' esc ' + escaped + ' die ' + dying),
    overlayGridRow('towers ' + countActive(towerPool) + ' proj ' + countActive(projectilePool), 'decals ' + decals.length + ' (' + perfStats.visibleDecals + ' live)', 'gap ' + smoothedGapMs.toFixed(0) + 'ms low15 ' + Math.round(lowFpsDurationMs/1000) + 's'),
    (() => { const k = decalCategoryCounts(); return overlayGridRow('debris blood ' + k.liveBlood + ' baked ' + k.bakedBlood, 'bones ' + k.bones + ' skulls ' + k.skulls, 'worms ' + k.worms + ' rubble ' + k.rubble); })(),
    overlayGridRow(...panDiagnosticCells()),
    overlayGridRow(...displayPacingCells()),
    overlayFullRow(lastMinuteSummary()),
    overlayFullRow('scale ' + Math.round(RENDER_SCALE_STEPS[renderScaleStep]*100) + '% auto ' + (autoRenderScaleEnabled ? 'on' : 'off') + '  ' + lastGovernorDecision)
  ];
  if(!compact) lines.splice(0, lines.length, ...alignOverlayRows(lines));
  // CA672 — see HISTORY.md § [1.5.7] Code Archaeology, CA672
  const liveTowers = compact ? [] : overlayTowerRanking();
  if(!compact) for(const capture of downingCaptures){
    lines.push('--- downing capture: ' + capture.tower + ' downed in wave ' + capture.wave + (capture.cause ? ' by ' + capture.cause : '') + (capture.done ? '' : ' (still recording)') + ' ---');
    lines.push('  3 s before: ' + summariseDiagFrames(capture.before)); lines.push('  3 s after:  ' + summariseDiagFrames(capture.after));
  }
  if(!compact && liveTowers.length){
    lines.push('--- tower telemetry (top ' + Math.min(10, liveTowers.length) + ' by dmg) ---');
    for(let i=0; i<Math.min(10, liveTowers.length); i++){
      const t = liveTowers[i];
      const tel = t.telemetry;
      const acc = tel.shotsFired > 0 ? Math.round((tel.hitsLanded/tel.shotsFired)*100) : 0;
      lines.push(
        '#' + t.id + ' ' + t.type + ' L' + t.level + '  shots ' + tel.shotsFired + ' hit ' + tel.hitsLanded +
        ' miss ' + tel.misses + ' (' + acc + '%)  dmg ' + Math.round(t.lifetimeDamage||0) + '  kills ' + tel.killsSecured
      );
    }
    if(liveTowers.length > 10) lines.push('+' + (liveTowers.length - 10) + ' more towers not shown');
  }
  ctx.save();
  const baseFontPx=compact ? 8 : 11;
  ctx.font = 'bold '+baseFontPx+'px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // DEBUG-OVERLAY-WIDTH-01 (1.6.3) — see HISTORY.md § [1.6.3]. Restores a fix that existed on
  // main before this session's file chain branched off an older commit and lost it: the backdrop
  // used to be a flat 340px wide, sized before per-tower telemetry existed — a telemetry row
  // (often 60+ monospace characters) regularly overflowed past the box's right edge. Box width is
  // measured against the actual longest line each frame (ctx.measureText()) instead of a
  // hardcoded guess, so it always fits whatever's currently shown.
  // DEBUG-OVERLAY-TOPRIGHT-01 (1.6.56) — see HISTORY.md § [1.6.56]. Anchored top-right, below
  // the FPS counter, instead of top-left below the HUD bar. Every modal that can cover the
  // top-left corner (Build, Shop, Settings) opens from the left-side HUD buttons; top-right, under
  // the FPS counter, is clear of all of them. Still takes the real HUD-bar measurement into
  // account (not just the FPS counter's own height) so it can't collide with that either on an
  // unusually tall or wrapped HUD layout — whichever constraint asks for more room wins.
  const belowFpsY = 4 + FPS_COUNTER_FONT_PX * 1.3 + 6;
  const belowHudY = Math.max(getDebugOverlayBelowHudY(), belowFpsY);
  // DEBUG-OVERLAY-SHRINK-01 (1.6.53) — see HISTORY.md § [1.6.53]. Standing rule: text that
  // doesn't fit its box shrinks to fit, it never wraps to a second physical line. A tower
  // telemetry row is often 60+ monospace characters; if the longest visible line doesn't fit the
  // available canvas width at the default 11px, the whole overlay's font scales down (bounded by
  // MIN_DEBUG_FONT_PX) and every line is re-measured at that size — one line each, always.
  const MIN_DEBUG_FONT_PX = 7;
  const availableWidth = compact ? Math.min(280,CANVAS_W*0.78)-12 : CANVAS_W-24;
  const maxPanelHeight = CANVAS_H - belowHudY - 12;
  const sourceLines = lines.slice();
  const wrapLinesToWidth = (fontPx, widthLimit) => {
    ctx.font = 'bold ' + fontPx + 'px monospace';
    const wrapped = [];
    for(const line of sourceLines){
      let rest = line, first = true;
      while(rest.length){
        let fit = rest.length;
        while(fit > 1 && ctx.measureText((first ? '' : '  ') + rest.slice(0, fit)).width > widthLimit) fit--;
        let cut = fit;
        if(fit < rest.length){ const space = rest.lastIndexOf(' ', fit); if(space > fit * 0.4) cut = space; }
        wrapped.push((first ? '' : '  ') + rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
        first = false;
      }
    }
    return wrapped;
  };
  // DEBUG-OVERLAY-NOCUT-01 (1.7.119): nothing is ever cut off. Rows wrap at word breaks to the panel width, and when the whole panel is taller than the room under the HUD the font shrinks (down to 7 px) until every row fits; rows are dropped only below that size.
  let fontPx = baseFontPx, wrappedLines = wrapLinesToWidth(fontPx, availableWidth);
  while(fontPx > MIN_DEBUG_FONT_PX && wrappedLines.length * (fontPx + (compact ? 2 : 3)) + 8 > maxPanelHeight){
    fontPx--;
    wrappedLines = wrapLinesToWidth(fontPx, availableWidth);
  }
  const lineHeight = fontPx + (compact ? 2 : 3);
  const maxVisibleLines = Math.max(0, Math.floor((maxPanelHeight - 8) / lineHeight));
  if(maxVisibleLines === 0){ ctx.restore(); return null; }
  const visibleLines = wrappedLines.slice(0, maxVisibleLines);
  ctx.font = 'bold ' + fontPx + 'px monospace';
  let maxLineWidth = 0;
  for(let i=0;i<visibleLines.length;i++){
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(visibleLines[i]).width);
  }
  const boxWidth = Math.min(CANVAS_W - 12, Math.round(maxLineWidth) + 12);
  const boxHeight = visibleLines.length * lineHeight + 8;
  const boxLeft = CANVAS_W - 6 - boxWidth; // right-anchored: grows leftward from the right edge
  ctx.restore();
  return { visibleLines, fontPx, lineHeight, boxLeft, belowHudY, boxWidth, boxHeight, canvasW: CANVAS_W, canvasH: CANVAS_H };
}
const FPS_COUNTER_FONT_PX = 26; // FPS-CORNER-01 (1.6.121) — see HISTORY.md § [1.6.121]
let fpsShownValue = 60, fpsShownAt = -1e9;
function drawFpsCounter(ctx){
  const nowReal = performance.now();
  if(nowReal - fpsShownAt >= 1000){ fpsShownValue = Math.round(perfStats.smoothedFps || 60); fpsShownAt = nowReal; }
  const fps = fpsShownValue;
  // FPS-DISPLAY-01 (1.6.56) — see HISTORY.md § [1.6.56]. Bigger and re-thresholded per direct
  // request: 30+ reads as healthy (green), 20-29 as a real but tolerable drop (yellow), anything
  // below 20 — including well below 10 — as a problem (red).
  ctx.fillStyle = fps >= 30 ? '#4caf50' : fps >= 20 ? '#ffc107' : '#f44336';
  ctx.font = 'bold ' + FPS_COUNTER_FONT_PX + 'px monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
  ctx.strokeText(fps + ' FPS', CANVAS_W - 10, CANVAS_H - 8);
  ctx.fillText(fps + ' FPS', CANVAS_W - 10, CANVAS_H - 8);
}
// CA674 — see HISTORY.md § [1.5.7] Code Archaeology, CA674
function drawSpawnWarningMarker(ctx){
  if(waveState !== 'SPAWNING' || !waypointsPx || !waypointsPx.length) return;
  if(waveTimer >= WAVE_COUNTDOWN_MS) return;
  const spawn = waypointsPx[0];
  const bob = Math.sin(presentationTime/220) * 4; // SPAWN-MARKER-CLOCK-01 (1.6.74) — see HISTORY.md § [1.6.74]
  ctx.save();
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e63946';
  if(graphicsQuality !== 'low'){ ctx.shadowColor = '#e63946'; ctx.shadowBlur = 10; }
  // CA675 — see HISTORY.md § [1.5.7] Code Archaeology, CA675
  ctx.translate(spawn.x, spawn.y - SPAWN_MARKER_RISE_PX + bob);
  ctx.scale(1.7, 1);
  ctx.fillText('❗', 0, 0);
  ctx.restore();
}
// MUSIC-COUNTDOWN-01 (1.8.37): the idle music plays on through the start of the 3-2-1 under a short riser, then the wave theme begins early enough that its three pickups fall on the countdown and its bass drop lands exactly on GO!
function waveMusicLeadMs(){ return Math.round(MUSIC_STING_DROP_STEP * 60000 / MUSIC_COMBAT_TEMPO_BPM / 2) + 140; }
function countdownHoldsFieldMusic(){ return waveState === 'SPAWNING' && countdownMusicStage < 2 && waveTimer < WAVE_COUNTDOWN_MS; }
function advanceCountdownMusic(){
  if(countdownMusicStage < 1 && audioEngine.musicPhase === 'field'){ countdownMusicStage = 1; audioEngine.popRiser(audioEngine.ctx.currentTime, (WAVE_COUNTDOWN_MS - waveMusicLeadMs()) / 1000, 0.4); }
  if(countdownMusicStage < 2 && waveTimer >= WAVE_COUNTDOWN_MS - waveMusicLeadMs()){ countdownMusicStage = 2; audioEngine.setMusicPhase(bossIsOnField() ? 'boss' : 'wave', true); }
}
function drawWaveCountdown(ctx){
  if(waveState !== 'SPAWNING' || !waypointsPx || !waypointsPx.length) return;
  if(waveTimer >= WAVE_COUNTDOWN_MS + WAVE_COUNTDOWN_GO_HOLD_MS) return;
  let label, scale, alpha, isGo = false;
  if(waveTimer < WAVE_COUNTDOWN_MS){
    const secondsLeft = 3 - Math.floor(waveTimer/1000); // 3, 2, 1
    label = String(secondsLeft);
    const segT = (waveTimer % 1000) / 1000; // 0..1 within the current second
    scale = 1.3 - segT*0.3; // a little pop at the start of each second, settling down toward the next
    alpha = 0.9;
  } else {
    isGo = true;
    label = 'GO!';
    const t = (waveTimer - WAVE_COUNTDOWN_MS) / WAVE_COUNTDOWN_GO_HOLD_MS;
    scale = 1.4 - t*0.4;
    alpha = 1 - t;
  }
  const spawn = waypointsPx[0];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold ' + Math.round(44*scale) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = isGo ? '#ffd700' : '#ff3b3b'; // red numbers; GO! keeps its own gold celebration color
  const cx = spawn.x, cy = spawn.y - 78; // above the exclamation marker (which sits at spawn.y - 34, plus its own bob)
  ctx.strokeText(label, cx, cy);
  ctx.fillText(label, cx, cy);
  ctx.restore();
}
function drawBossCompass(ctx){
  const boss = enemyPool.find(e => e.active && (e.type === 'BOSS' || e.type === 'SANTA'));
  if(!boss) return;
  const screenX = boss.x*camera.zoom + camera.x;
  const screenY = boss.y*camera.zoom + camera.y;
  const margin = 40;
  const onScreen = screenX >= margin && screenX <= CANVAS_W-margin && screenY >= margin && screenY <= CANVAS_H-margin;
  if(onScreen) return;
  const cx = CANVAS_W/2, cy = CANVAS_H/2;
  const angle = Math.atan2(screenY-cy, screenX-cx);
  // clamp the arrow position to the inner screen edge, in the actual direction of the boss
  const maxX = CANVAS_W/2 - margin, maxY = CANVAS_H/2 - margin;
  const scale = Math.min(Math.abs(maxX/Math.cos(angle)), Math.abs(maxY/Math.sin(angle)));
  const arrowX = cx + Math.cos(angle)*scale, arrowY = cy + Math.sin(angle)*scale;
  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(230,57,70,0.85)';
  ctx.beginPath();
  ctx.moveTo(12,0); ctx.lineTo(-6,-8); ctx.lineTo(-6,8); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👔', arrowX - Math.cos(angle)*18, arrowY - Math.sin(angle)*18);
}
/* =========================================================
   PERFORMANCE DIAGNOSTICS
   ========================================================= */
// CA676 — see HISTORY.md § [1.5.7] Code Archaeology, CA676
const speedWindow = { simMs: 0, wallMs: 0 };
// DOWNING-CAPTURE-01 (1.7.51): the death spike is only visible in the frames just before and after a stickman goes down, and the normal history holds about two seconds. A ring of the last 600
// frames (about ten seconds) is kept, and each time a stickman is downed the 3 seconds before and the 3 seconds after are captured and summarised in the debug log (the last 3 captures).
const diagRing = [], DIAG_RING_MAX = 600, downingCaptures = [], DOWNING_CAPTURE_MS = 3000;
function recordDiagFrame(){
  const frame = { t: presentationTime, frame: perfStats.frameMs, upd: perfStats.updateMs, rend: perfStats.renderMs, hud: perfStats.hudMs || 0, ticks: perfStats.ticksThisFrame, enemies: perfStats.totalActiveEnemies || 0, decals: perfStats.totalDecals || 0 };
  diagRing.push(frame); if(diagRing.length > DIAG_RING_MAX) diagRing.shift();
  for(const capture of downingCaptures) if(!capture.done){ capture.after.push(frame); if(presentationTime - capture.at >= DOWNING_CAPTURE_MS) capture.done = true; }
}
function startDowningCapture(tower, cause){
  downingCaptures.push({ at: presentationTime, wave: waveIndex, tower: tower.type, cause: String(cause || ''), before: diagRing.filter(f => presentationTime - f.t <= DOWNING_CAPTURE_MS), after: [], done: false });
  if(downingCaptures.length > 3) downingCaptures.shift();
}
function summariseDiagFrames(frames){
  if(!frames.length) return 'no frames';
  const worst = frames.reduce((a, b) => b.frame > a.frame ? b : a), over33 = frames.filter(f => f.frame > 33).length;
  const avg = key => (frames.reduce((a, f) => a + (f[key] || 0), 0)/frames.length).toFixed(1);
  return frames.length + ' frames, avg ' + avg('frame') + ' ms (upd ' + avg('upd') + ', rend ' + avg('rend') + ', hud ' + avg('hud') + '), worst ' + worst.frame.toFixed(0) + ' ms (upd ' + worst.upd.toFixed(0) + ', rend ' + worst.rend.toFixed(0) + ', ticks ' + worst.ticks + '), over 33 ms: ' + over33 + ', enemies ' + frames[0].enemies + ' to ' + frames[frames.length-1].enemies + ', decals ' + frames[frames.length-1].decals;
}
const perfStats = { frameMs: 0, updateMs: 0, renderMs: 0, ticksThisFrame: 0, maxTicksSeen: 0, achievedSpeed: 0, requestedSpeed: 1, msPerTick: 0,
  visibleScenery: 0, totalScenery: 0, visibleDecals: 0, totalDecals: 0, lastDepthSortedMs: 0,
  visibleParticles: 0, totalParticles: 0, visibleFloatingTexts: 0, totalFloatingTexts: 0,
  // CA677 — see HISTORY.md § [1.5.7] Code Archaeology, CA677
  frameMsHistory: [], updateMsHistory: [], renderMsHistory: [],
  // CA678 — see HISTORY.md § [1.5.7] Code Archaeology, CA678
  barricadeActiveScanned: 0, barricadeQueuedCount: 0, barricadeSnapCount: 0, barricadeMaxQueueLenSeen: 0,
  // CA679 — see HISTORY.md § [1.5.7] Code Archaeology, CA679
  actualSpeedWindowRealMs: 0, actualSpeedWindowSimulationMs: 0, lastMeasuredActualSpeed: 0, lastAccumulatorDebtMs: 0,
  lastSimulationTickCap: MAX_SIMULATION_TICKS_PER_FRAME, lastFrameTimeClampMs: NORMAL_MAX_FRAME_TIME_MS,
  wallTimeClampHits: 0, wallTimeClampedMs: 0, simulationCatchUpCapHits: 0, cameraBudgetCapHits: 0, cameraBudgetDroppedMs: 0, simulationDebtDroppedMs: 0, lastDroppedSimulationTimeMs: 0,
  cameraMoveXLastFrame: 0, cameraMoveYLastFrame: 0, cameraMovePixelsLastFrame: 0, cameraZoomDeltaLastFrame: 0, cameraMovingLastFrame: false,
  simulationCapEvents: [], sessionTrendSamples: [],
  adaptiveVisualFrames: 0, depthSortPressureFrames: 0,
  // CA680 — see HISTORY.md § [1.5.7] Code Archaeology, CA680
  worstFrameMs: 0, worstFrameAtWave: 0, worstFrameTicks: 0, worstFrameAtReal: 0,
  slowFrameEvents: [], longCallbackGapEvents: [], longTaskEvents: [], longTaskCount: 0, longTaskObserverActive: false, longTaskObserverError: '',
  longAnimationFrameEvents: [], longAnimationFrameCount: 0, longAnimationFrameObserverActive: false, longAnimationFrameObserverError: '',
  interactionEvents: [], interactionEventCount: 0, interactionObserverActive: false, interactionObserverError: '',
  runtimeErrors: [], runtimeErrorCount: 0,
  // CA681 — see HISTORY.md § [1.5.7] Code Archaeology, CA681
  wallGapMsHistory: [], worstWallGapMs: 0, worstWallGapAtWave: 0, worstWallGapAtReal: 0,
  // CA682 — see HISTORY.md § [1.5.7] Code Archaeology, CA682
  ticksThisFrameHistory: [],
  // CA683 — see HISTORY.md § [1.5.7] Code Archaeology, CA683
  spatialQueryCallsLastFrame: 0, hashBuildsLastFrame: 0, enemyHashBucketPoolSize: 0,
  // CA684 — see HISTORY.md § [1.5.7] Code Archaeology, CA684
  visibleEnemies: 0, totalActiveEnemies: 0, visibleTowers: 0, totalActiveTowers: 0,
  // CA685 — see HISTORY.md § [1.5.7] Code Archaeology, CA685
  memorySupported: false, usedHeapMB: 0, totalHeapMB: 0, heapLimitMB: 0,
  heapHistory: [], lastMemorySampleAt: 0 };
// CA686 — see HISTORY.md § [1.5.7] Code Archaeology, CA686
const phaseTime = { ambient: 0, spawning: 0, barricade: 0, enemyUpdate: 0, collision: 0,
  hashBuild: 0, towerUpdate: 0, projectile: 0, catSkeleton: 0, particles: 0, waveLogic: 0 };
const phaseMaxSeen = { ambient: 0, spawning: 0, barricade: 0, enemyUpdate: 0, collision: 0,
  hashBuild: 0, towerUpdate: 0, projectile: 0, catSkeleton: 0, particles: 0, waveLogic: 0 };
function resetPhaseTime(){
  for(const k in phaseTime) phaseTime[k] = 0;
}
// CA687 — see HISTORY.md § [1.5.7] Code Archaeology, CA687
const renderPhaseTime = { mapBlit: 0, decals: 0, depthSorted: 0, groundItems: 0, minionsProjectiles: 0, particlesText: 0, overlays: 0, worldSort: 0, worldScenery: 0, worldEnemies: 0, worldTowers: 0, worldDebris: 0 }; // WORLD-SUBPHASES-01 (1.7.36): depthSorted is the whole world pass; the world* keys split it
function phaseLabel(key){ return key === 'depthSorted' ? 'worldDrawing(whole pass, not only sorting)' : key; }
const renderPhaseMaxSeen = { mapBlit: 0, decals: 0, depthSorted: 0, groundItems: 0, minionsProjectiles: 0, particlesText: 0, overlays: 0, worldSort: 0, worldScenery: 0, worldEnemies: 0, worldTowers: 0, worldDebris: 0 };
function resetRenderPhaseTime(){
  for(const k in renderPhaseTime) renderPhaseTime[k] = 0;
}
function recordUnitDeath(kind, type, cause){
  retainDiagnostic(extendedDiagnostics.deaths,{atMs:performance.now(),wave:waveIndex,kind,type,cause},40);
}
function recentDiagnosticDeaths(){
  const now = performance.now(), recent = [];
  for(const event of extendedDiagnostics.deaths) if(now-event.atMs <= 5000) recent.push({...event,ageMs:now-event.atMs});
  return recent;
}
function recordStateTransition(next){
  if(gameState === next) return;
  telemetryStateChange(next);
  retainDiagnostic(extendedDiagnostics.transitions,{time:new Date().toISOString(),from:gameState,to:next,wave:waveIndex,hidden:document.hidden},60);
}
function countUnexpiredAudioSources(expiry, now){
  let count = 0;
  for(let i=0;i<expiry.length;i++) if(expiry[i] > now) count++;
  return count;
}
function retainDiagnostic(list, event, limit){
  list.push(event);
  if(list.length > limit) list.shift();
}
function recordExtendedDiagnostics(gap){
  const d = extendedDiagnostics;
  if(perfStats.frameMs > 33) d.workloadOver33++;
  if(perfStats.frameMs > 50) d.workloadOver50++;
  if(perfStats.frameMs > 100) d.workloadOver100++;
  if(gap > 33) d.gapOver33++;
  if(gap > 50) d.gapOver50++;
  if(gap > 100) d.gapOver100++;
  const now = performance.now();
  if(now - d.lastContextAt < 1000) return;
  d.lastContextAt = now;
  const key = [gameState,document.hidden,graphicsQuality,gameSpeed,innerWidth,innerHeight,devicePixelRatio].join('|');
  if(key !== d.lastContextKey){
    d.lastContextKey = key;
    retainDiagnostic(d.context, {time:new Date().toISOString(),wave:waveIndex,state:gameState,hidden:document.hidden,quality:graphicsQuality,speed:gameSpeed,width:innerWidth,height:innerHeight,dpr:devicePixelRatio}, 60);
  }
}
function extendedDiagnosticReport(){
  const d = extendedDiagnostics, a = audioEngine, c = a.ctx;
  return '\nEXTENDED LOCAL DIAGNOSTICS\n' +
    'Session counts >33/>50/>100ms workload: '+[d.workloadOver33,d.workloadOver50,d.workloadOver100].join('/')+'; callback gaps (includes background/stalls): '+[d.gapOver33,d.gapOver50,d.gapOver100].join('/')+'\n'+
    'Audio context: '+(c ? c.state : 'not unlocked')+'; sample rate: '+(c ? c.sampleRate : 'unavailable')+'; base/output latency seconds: '+(c && Number.isFinite(c.baseLatency) ? c.baseLatency : 'unavailable')+'/'+(c && Number.isFinite(c.outputLatency) ? c.outputLatency : 'unavailable')+'\n'+
    'Music late recoveries/skipped steps/worst lateness ms: '+a.debugCounters.musicLateRecoveries+'/'+a.debugCounters.musicSkippedSteps+'/'+a.debugCounters.musicWorstLatenessMs.toFixed(2)+'\n'+
    'Save timings (latest 20; milliseconds; UTF-16 code units are not disk bytes): '+JSON.stringify(d.saves)+'\n'+
    'Settled decal rebuild timings (ms; synchronous work, not deferred GPU execution): '+JSON.stringify(d.decalRebuilds)+'\n'+
    'Exact state transitions (latest 60): '+JSON.stringify(d.transitions)+'\n'+
    'Recent unit deaths (latest 40; monotonic session milliseconds): '+JSON.stringify(d.deaths)+'\n'+
    'Sampled context changes (latest 60; one-second sampling may omit short transitions): '+JSON.stringify(d.context)+'\n';
}
const PERF_HISTORY_SIZE = 120;
const perfHistoryNextWriteIndex = new WeakMap();
function recordPerfSample(arr, value){
  if(arr.length < PERF_HISTORY_SIZE){
    arr.push(value);
    if(arr.length === PERF_HISTORY_SIZE) perfHistoryNextWriteIndex.set(arr, 0);
    return;
  }
  const nextWrite = perfHistoryNextWriteIndex.get(arr) || 0;
  arr[nextWrite] = value;
  perfHistoryNextWriteIndex.set(arr, (nextWrite + 1) % PERF_HISTORY_SIZE);
}
function perfHistoryEndpoints(arr){
  if(!arr.length) return [0, 0];
  const nextWrite = perfHistoryNextWriteIndex.get(arr);
  if(nextWrite === undefined) return [arr[0], arr[arr.length - 1]];
  return [arr[nextWrite], arr[(nextWrite + arr.length - 1) % arr.length]];
}
function perfPercentile(arr, p){
  if(!arr.length) return 0;
  const sorted = arr.slice().sort((a,b) => a-b);
  const idx = clampNum(Math.floor(p*sorted.length), 0, sorted.length-1);
  return sorted[idx];
}
const PERF_EVENT_HISTORY_LIMIT = 10;
function recordPerfEventSample(events, durationMs, minimumMs, wallGapMs){
  if(durationMs < minimumMs || (events.length >= PERF_EVENT_HISTORY_LIMIT && durationMs <= events[events.length - 1].durationMs)) return;
  const event = {
    durationMs,
    time: new Date().toISOString(),
    frameMs: perfStats.frameMs,
    updateMs: perfStats.updateMs,
    renderMs: perfStats.renderMs,
    wallGapMs,
    ticks: perfStats.ticksThisFrame,
    tickCap: perfStats.lastSimulationTickCap,
    wave: waveIndex,
    waveState,
    gameState,
    gameSpeed,
    gameTime,
    accumulatorMs: perfStats.lastAccumulatorDebtMs,
    cameraX: camera.x,
    cameraY: camera.y,
    zoom: camera.zoom,
    cameraMoveX: perfStats.cameraMoveXLastFrame,
    cameraMoveY: perfStats.cameraMoveYLastFrame,
    cameraMovePixels: perfStats.cameraMovePixelsLastFrame,
    cameraZoomDelta: perfStats.cameraZoomDeltaLastFrame,
    cameraMoving: perfStats.cameraMovingLastFrame,
    adaptiveDetailActive: underHeavyVisualLoad,
    adaptiveDetailHoldMs: Math.max(0, Math.round(heavyVisualLoadHoldUntil - performance.now())),
    depthSortMs: perfStats.lastDepthSortedMs,
    depthSortPressure: perfStats.lastDepthSortedMs >= HEAVY_VISUAL_LOAD_DEPTH_SORT_MS,
    quality: graphicsQuality,
    dpr: dprValue,
    tabHidden: document.hidden,
    visibleEnemies: perfStats.visibleEnemies,
    activeEnemies: perfStats.totalActiveEnemies,
    visibleTowers: perfStats.visibleTowers,
    activeTowers: perfStats.totalActiveTowers,
    activeProjectiles: countActive(projectilePool),
    activeParticles: perfStats.totalParticles,
    activeTexts: perfStats.totalFloatingTexts,
    deathAnimations: deathAnims.length,
    decalRebuildCount: extendedDiagnostics.decalRebuilds.count,
    decalRebuildLastMs: extendedDiagnostics.decalRebuilds.lastMs,
    recentDeaths: recentDiagnosticDeaths(),
    audioState: audioEngine.ctx ? audioEngine.ctx.state : 'locked',
    audioVoices: audioEngine.ctx ? countUnexpiredAudioSources(audioEngine.activeVoiceExpiry,audioEngine.ctx.currentTime) : 0,
    musicVoices: audioEngine.ctx ? countUnexpiredAudioSources(audioEngine.musicVoiceExpiry,audioEngine.ctx.currentTime) : 0,
    decals: perfStats.totalDecals,
    visibleDecals: perfStats.visibleDecals,
    scenery: perfStats.totalScenery,
    groundItems: groundItems.length,
    hashBuilds: perfStats.hashBuildsLastFrame,
    spatialQueries: perfStats.spatialQueryCallsLastFrame,
    barricadeScanned: perfStats.barricadeActiveScanned,
    barricadeQueued: perfStats.barricadeQueuedCount,
    usedHeapMB: perfStats.memorySupported ? perfStats.usedHeapMB : null,
    updatePhases: { ...phaseTime },
    renderPhases: { ...renderPhaseTime }
  };
  let index = 0;
  while(index < events.length && events[index].durationMs >= durationMs) index++;
  events.splice(index, 0, event);
  if(events.length > PERF_EVENT_HISTORY_LIMIT) events.pop();
}
const LONG_TASK_HISTORY_LIMIT = 20;
const LONG_ANIMATION_FRAME_HISTORY_LIMIT = 20;
const INTERACTION_HISTORY_LIMIT = 30;
const RUNTIME_ERROR_HISTORY_LIMIT = 50;
const diagnosticObservers = [];
function startDiagnosticObserver(entryType, handler, optionVariants, activeField, errorField){
  if(typeof PerformanceObserver !== 'function') return;
  let observer = null;
  try {
    observer = new PerformanceObserver(list => handler(list.getEntries()));
    let observed = false, lastError = null;
    for(const options of optionVariants){
      try {
        observer.observe(options);
        observed = true;
        break;
      } catch(error) {
        lastError = error;
      }
    }
    if(observed){
      diagnosticObservers.push(observer);
      perfStats[activeField] = true;
    } else {
      observer.disconnect();
      perfStats[errorField] = String(lastError && lastError.message || lastError || (entryType + ' unavailable')).slice(0, 160);
    }
  } catch(error) {
    if(observer) observer.disconnect();
    perfStats[errorField] = String(error && error.message || error || (entryType + ' unavailable')).slice(0, 160);
  }
}
function insertTopDurationEvent(events, event, limit){
  let index = 0;
  while(index < events.length && events[index].durationMs >= event.durationMs) index++;
  if(index < limit){
    events.splice(index, 0, event);
    if(events.length > limit) events.pop();
  }
}
const SIMULATION_CAP_EVENT_LIMIT = 20;
const SESSION_TREND_INTERVAL_MS = 60000;
const SESSION_TREND_HISTORY_LIMIT = 120;
let perfTrendWindow = null;
function createPerfTrendWindow(now){
  return { start: now, frames: 0, frameTotal: 0, updateTotal: 0, renderTotal: 0, callbackGapTotal: 0,
    requestedSpeedTotal: 0, maxFrame: 0, maxUpdate: 0, maxRender: 0, maxCallbackGap: 0,
    slowFrames: 0, longGaps: 0, cameraMovingFrames: 0, cameraMovingSlowFrames: 0, cameraMovingRenderTotal: 0, cameraStationaryRenderTotal: 0, maxCameraMovePixels: 0, maxCameraZoomDelta: 0,
    adaptiveDetailFrames: 0, depthSortPressureFrames: 0,
    renderPhaseTotals: Object.fromEntries(Object.keys(renderPhaseTime).map(k => [k, 0])),
    renderPhaseMaxima: Object.fromEntries(Object.keys(renderPhaseTime).map(k => [k, 0])), maxTicks: 0, maxDebt: 0, maxEnemies: 0, maxVisibleEnemies: 0,
    maxTowers: 0, maxVisibleTowers: 0, maxParticles: 0, maxDecals: 0, maxQueries: 0, maxHashes: 0,
    baseCapHits: perfStats.simulationCatchUpCapHits, baseDroppedMs: perfStats.simulationDebtDroppedMs,
    baseWallClampHits: perfStats.wallTimeClampHits, baseWallClampedMs: perfStats.wallTimeClampedMs,
    heapStartMB: perfStats.memorySupported ? perfStats.usedHeapMB : null,
    heapEndMB: perfStats.memorySupported ? perfStats.usedHeapMB : null,
    heapMaxMB: perfStats.memorySupported ? perfStats.usedHeapMB : null,
    startWave: waveIndex, startSpeed: gameSpeed };
}
function recordPerfTrendFrame(now, rawGapMs){
  if(!perfTrendWindow) perfTrendWindow = createPerfTrendWindow(now);
  const w = perfTrendWindow;
  w.frames++;
  w.frameTotal += perfStats.frameMs;
  w.updateTotal += perfStats.updateMs;
  w.renderTotal += perfStats.renderMs;
  w.callbackGapTotal += rawGapMs;
  w.requestedSpeedTotal += gameSpeed;
  if(perfStats.frameMs > w.maxFrame) w.maxFrame = perfStats.frameMs;
  if(perfStats.updateMs > w.maxUpdate) w.maxUpdate = perfStats.updateMs;
  if(perfStats.renderMs > w.maxRender) w.maxRender = perfStats.renderMs;
  if(rawGapMs > w.maxCallbackGap) w.maxCallbackGap = rawGapMs;
  if(perfStats.frameMs >= 16.7) w.slowFrames++;
  if(rawGapMs >= 33.3) w.longGaps++;
  if(underHeavyVisualLoad) w.adaptiveDetailFrames++;
  if(perfStats.lastDepthSortedMs >= HEAVY_VISUAL_LOAD_DEPTH_SORT_MS) w.depthSortPressureFrames++;
  if(perfStats.cameraMovingLastFrame){
    w.cameraMovingFrames++;
    w.cameraMovingRenderTotal += perfStats.renderMs;
    if(perfStats.frameMs >= 16.7) w.cameraMovingSlowFrames++;
  } else {
    w.cameraStationaryRenderTotal += perfStats.renderMs;
  }
  if(perfStats.cameraMovePixelsLastFrame > w.maxCameraMovePixels) w.maxCameraMovePixels = perfStats.cameraMovePixelsLastFrame;
  if(perfStats.cameraZoomDeltaLastFrame > w.maxCameraZoomDelta) w.maxCameraZoomDelta = perfStats.cameraZoomDeltaLastFrame;
  for(const k in renderPhaseTime){
    const phaseMs = renderPhaseTime[k];
    w.renderPhaseTotals[k] += phaseMs;
    if(phaseMs > w.renderPhaseMaxima[k]) w.renderPhaseMaxima[k] = phaseMs;
  }
  if(perfStats.ticksThisFrame > w.maxTicks) w.maxTicks = perfStats.ticksThisFrame;
  if(perfStats.lastAccumulatorDebtMs > w.maxDebt) w.maxDebt = perfStats.lastAccumulatorDebtMs;
  if(perfStats.totalActiveEnemies > w.maxEnemies) w.maxEnemies = perfStats.totalActiveEnemies;
  if(perfStats.visibleEnemies > w.maxVisibleEnemies) w.maxVisibleEnemies = perfStats.visibleEnemies;
  if(perfStats.totalActiveTowers > w.maxTowers) w.maxTowers = perfStats.totalActiveTowers;
  if(perfStats.visibleTowers > w.maxVisibleTowers) w.maxVisibleTowers = perfStats.visibleTowers;
  if(perfStats.totalParticles > w.maxParticles) w.maxParticles = perfStats.totalParticles;
  if(perfStats.totalDecals > w.maxDecals) w.maxDecals = perfStats.totalDecals;
  if(perfStats.spatialQueryCallsLastFrame > w.maxQueries) w.maxQueries = perfStats.spatialQueryCallsLastFrame;
  if(perfStats.hashBuildsLastFrame > w.maxHashes) w.maxHashes = perfStats.hashBuildsLastFrame;
  if(perfStats.memorySupported){
    if(w.heapStartMB === null) w.heapStartMB = perfStats.usedHeapMB;
    w.heapEndMB = perfStats.usedHeapMB;
    if(w.heapMaxMB === null || perfStats.usedHeapMB > w.heapMaxMB) w.heapMaxMB = perfStats.usedHeapMB;
  }
  const elapsed = w.callbackGapTotal;
  if(elapsed < SESSION_TREND_INTERVAL_MS || !w.frames) return;
  perfStats.sessionTrendSamples.push({
    startTime: Number.isFinite(performance.timeOrigin) ? new Date(performance.timeOrigin + w.start).toISOString() : 'unavailable',
    endTime: Number.isFinite(performance.timeOrigin) ? new Date(performance.timeOrigin + now).toISOString() : new Date().toISOString(),
    durationSeconds: elapsed / 1000, wallSpanSeconds: (now - w.start) / 1000,
    frames: w.frames, callbackFps: w.frames / (elapsed / 1000),
    averageFrameMs: w.frameTotal / w.frames, maxFrameMs: w.maxFrame,
    averageUpdateMs: w.updateTotal / w.frames, maxUpdateMs: w.maxUpdate,
    averageRenderMs: w.renderTotal / w.frames, maxRenderMs: w.maxRender,
    averageCallbackGapMs: w.callbackGapTotal / w.frames, maxCallbackGapMs: w.maxCallbackGap,
    slowFrames: w.slowFrames, longGaps: w.longGaps, cameraMovingFrames: w.cameraMovingFrames,
    cameraMovingSlowFrames: w.cameraMovingSlowFrames, cameraMovingFramePercent: w.frames ? (w.cameraMovingFrames/w.frames)*100 : 0,
    adaptiveDetailFrames: w.adaptiveDetailFrames, adaptiveDetailFramePercent: w.frames ? (w.adaptiveDetailFrames/w.frames)*100 : 0,
    depthSortPressureFrames: w.depthSortPressureFrames,
    averageMovingRenderMs: w.cameraMovingFrames ? w.cameraMovingRenderTotal/w.cameraMovingFrames : 0,
    averageStationaryRenderMs: (w.frames-w.cameraMovingFrames) ? w.cameraStationaryRenderTotal/(w.frames-w.cameraMovingFrames) : 0,
    renderPhaseAverageMs: Object.fromEntries(Object.keys(w.renderPhaseTotals).map(k => [k, w.renderPhaseTotals[k]/w.frames])),
    renderPhaseMaxMs: { ...w.renderPhaseMaxima },
    maxCameraMovePixels: w.maxCameraMovePixels, maxCameraZoomDelta: w.maxCameraZoomDelta,
    maxTicks: w.maxTicks, maxDebtMs: w.maxDebt,
    capHits: perfStats.simulationCatchUpCapHits - w.baseCapHits,
    droppedSimulationMs: perfStats.simulationDebtDroppedMs - w.baseDroppedMs,
    wallClampFrames: perfStats.wallTimeClampHits - w.baseWallClampHits,
    wallTimeClampedMs: perfStats.wallTimeClampedMs - w.baseWallClampedMs,
    maxEnemies: w.maxEnemies, maxVisibleEnemies: w.maxVisibleEnemies,
    maxTowers: w.maxTowers, maxVisibleTowers: w.maxVisibleTowers,
    maxParticles: w.maxParticles, maxDecals: w.maxDecals,
    maxQueries: w.maxQueries, maxHashes: w.maxHashes,
    averageRequestedSpeed: w.requestedSpeedTotal / w.frames, endRequestedSpeed: gameSpeed,
    startWave: w.startWave, endWave: waveIndex,
    heapStartMB: w.heapStartMB, heapEndMB: w.heapEndMB, heapMaxMB: w.heapMaxMB
  });
  if(perfStats.sessionTrendSamples.length > SESSION_TREND_HISTORY_LIMIT) perfStats.sessionTrendSamples.shift();
  perfTrendWindow = createPerfTrendWindow(now);
}
function recordSimulationCapEvent(rawGapMs, droppedMs){
  if(droppedMs <= 0) return;
  const event = { durationMs: droppedMs, time: new Date().toISOString(), wallGapMs: rawGapMs,
    wallTimeClampedMs: Math.max(0, rawGapMs - perfStats.lastFrameTimeClampMs), frameMs: perfStats.frameMs,
    updateMs: perfStats.updateMs, renderMs: perfStats.renderMs, ticks: perfStats.ticksThisFrame, tickCap: perfStats.lastSimulationTickCap,
    wave: waveIndex, waveState, gameState, gameSpeed, accumulatorMs: droppedMs,
    activeEnemies: perfStats.totalActiveEnemies, activeTowers: perfStats.totalActiveTowers,
    activeParticles: perfStats.totalParticles, decals: perfStats.totalDecals,
    decalRebuildCount: extendedDiagnostics.decalRebuilds.count,
    decalRebuildLastMs: extendedDiagnostics.decalRebuilds.lastMs,
    recentDeaths: recentDiagnosticDeaths(),
    audioState: audioEngine.ctx ? audioEngine.ctx.state : 'locked',
    audioVoices: audioEngine.ctx ? countUnexpiredAudioSources(audioEngine.activeVoiceExpiry,audioEngine.ctx.currentTime) : 0,
    musicVoices: audioEngine.ctx ? countUnexpiredAudioSources(audioEngine.musicVoiceExpiry,audioEngine.ctx.currentTime) : 0,
    cameraMoveX: perfStats.cameraMoveXLastFrame, cameraMoveY: perfStats.cameraMoveYLastFrame,
    cameraMovePixels: perfStats.cameraMovePixelsLastFrame, cameraZoomDelta: perfStats.cameraZoomDeltaLastFrame,
    cameraMoving: perfStats.cameraMovingLastFrame,
    hashBuilds: perfStats.hashBuildsLastFrame, spatialQueries: perfStats.spatialQueryCallsLastFrame,
    updatePhases: { ...phaseTime }, renderPhases: { ...renderPhaseTime } };
  insertTopDurationEvent(perfStats.simulationCapEvents, event, SIMULATION_CAP_EVENT_LIMIT);
}
function recordLongTaskEntries(entries){
  for(const entry of entries){
    perfStats.longTaskCount++;
    const attributions = [];
    if(entry.attribution){
      for(let i=0;i<entry.attribution.length && i<3;i++){
        const item = entry.attribution[i];
        attributions.push({ name: item.name || '', containerType: item.containerType || '',
          containerName: item.containerName || '', containerId: item.containerId || '' });
      }
    }
    const event = { durationMs: entry.duration, startTimeMs: entry.startTime,
      time: Number.isFinite(performance.timeOrigin) ? new Date(performance.timeOrigin + entry.startTime).toISOString() : 'unavailable',
      attributions };
    insertTopDurationEvent(perfStats.longTaskEvents, event, LONG_TASK_HISTORY_LIMIT);
  }
}
startDiagnosticObserver('longtask', recordLongTaskEntries,
  [{ type: 'longtask', buffered: true }, { type: 'longtask' }], 'longTaskObserverActive', 'longTaskObserverError');
function recordLongAnimationFrameEntries(entries){
  for(const entry of entries){
    perfStats.longAnimationFrameCount++;
    const scripts = [];
    if(entry.scripts){
      for(let i=0;i<entry.scripts.length && i<5;i++){
        const item = entry.scripts[i];
        scripts.push({ source: safeDiagnosticSource(item.sourceURL || ''), functionName: item.sourceFunctionName || '',
          invoker: item.invoker || '', durationMs: item.duration || 0,
          forcedStyleAndLayoutMs: item.forcedStyleAndLayoutDuration || 0 });
      }
    }
    const event = { durationMs: entry.duration, startTimeMs: entry.startTime,
      time: Number.isFinite(performance.timeOrigin) ? new Date(performance.timeOrigin + entry.startTime).toISOString() : 'unavailable',
      blockingDurationMs: entry.blockingDuration || 0,
      renderDurationMs: entry.renderStart ? Math.max(0, (entry.presentationTime || entry.startTime + entry.duration) - entry.renderStart) : 0,
      styleAndLayoutMs: entry.styleAndLayoutStart ? Math.max(0, (entry.presentationTime || entry.startTime + entry.duration) - entry.styleAndLayoutStart) : 0,
      firstUIEventDelayMs: entry.firstUIEventTimestamp ? Math.max(0, entry.firstUIEventTimestamp - entry.startTime) : 0,
      scripts };
    insertTopDurationEvent(perfStats.longAnimationFrameEvents, event, LONG_ANIMATION_FRAME_HISTORY_LIMIT);
  }
}
startDiagnosticObserver('long-animation-frame', recordLongAnimationFrameEntries,
  [{ type: 'long-animation-frame', buffered: true }, { type: 'long-animation-frame' }],
  'longAnimationFrameObserverActive', 'longAnimationFrameObserverError');
function recordInteractionEntries(entries){
  for(const entry of entries){
    perfStats.interactionEventCount++;
    const processingStart = Number(entry.processingStart) || 0;
    const processingEnd = Number(entry.processingEnd) || processingStart;
    const event = { durationMs: entry.duration, name: entry.name || 'unknown',
      startTimeMs: entry.startTime,
      time: Number.isFinite(performance.timeOrigin) ? new Date(performance.timeOrigin + entry.startTime).toISOString() : 'unavailable',
      inputDelayMs: Math.max(0, processingStart - entry.startTime),
      processingMs: Math.max(0, processingEnd - processingStart),
      presentationDelayMs: Math.max(0, entry.startTime + entry.duration - processingEnd),
      interactionId: entry.interactionId || 0 };
    insertTopDurationEvent(perfStats.interactionEvents, event, INTERACTION_HISTORY_LIMIT);
  }
}
startDiagnosticObserver('event', recordInteractionEntries,
  [{ type: 'event', buffered: true, durationThreshold: 16 }, { type: 'event', durationThreshold: 16 },
    { type: 'event', buffered: true }, { type: 'event' }], 'interactionObserverActive', 'interactionObserverError');
function safeDiagnosticSource(source){
  if(!source) return '';
  try {
    const url = new URL(source, location.href);
    return url.origin + url.pathname;
  } catch(error) {
    return String(source).split(/[?#]/)[0].slice(0, 300);
  }
}
function recordRuntimeError(type, message, source, line, column, stack){
  perfStats.runtimeErrorCount++;
  perfStats.runtimeErrors.push({ type, time: new Date().toISOString(), message: String(message || '').slice(0, 1200),
    source: safeDiagnosticSource(source), line: Number(line) || 0, column: Number(column) || 0,
    stack: String(stack || '').slice(0, 3000) });
  if(perfStats.runtimeErrors.length > RUNTIME_ERROR_HISTORY_LIMIT) perfStats.runtimeErrors.shift();
}
window.addEventListener('error', event => {
  const target = event.target;
  if(target && target !== window){
    recordRuntimeError('resource-load', (target.tagName || 'resource') + ' load failure', target.currentSrc || target.src || target.href, 0, 0, '');
    return;
  }
  recordRuntimeError('javascript-error', event.message, event.filename, event.lineno, event.colno, event.error && event.error.stack);
}, true);
window.addEventListener('unhandledrejection', event => {
  const reason = event.reason;
  const message = reason && reason.message ? reason.name ? reason.name + ': ' + reason.message : reason.message : String(reason || 'unhandled promise rejection');
  recordRuntimeError('unhandled-rejection', message, '', 0, 0, reason && reason.stack);
});
/* =========================================================
   ATTRACT SCREEN
   ========================================================= */
// CA688 — see HISTORY.md § [1.5.7] Code Archaeology, CA688
const ATTRACT_FORMATION = [
  { xf: 0.50, yf: 0.32, element: 'FIRE' },     // top-center archer
  { xf: 0.28, yf: 0.62, element: 'ICE' },      // lower-left archer
  { xf: 0.72, yf: 0.62, element: 'ELECTRIC' }  // lower-right archer
];
// CA689 — see HISTORY.md § [1.5.7] Code Archaeology, CA689
const ATTRACT_ELEMENT_COLOR = { FIRE: '#ff6b35', ICE: '#7dd3fc', ELECTRIC: '#f1c40f' };
// CA690 — see HISTORY.md § [1.5.7] Code Archaeology, CA690
const ATTRACT_ENEMY_MOVE_SCALE = 0.60; // ATTRACT-PACE-01: movement only, not demo timing or gameplay
const ATTRACT_ENEMY_POOL = ['GRUNT','SWARM','RUNNER','SPLITTER','SPLITMINI','ZOMBIE','WOLF','MONARCH']; // living creatures only: the archers never shoot rocks, bones, statues or other objects (ATTRACT-LIVING-01)
// CA691 — see HISTORY.md § [1.5.7] Code Archaeology, CA691
const ATTRACT_PHASES = [
  { name: 'CALM',      start: 0,     end: 3000,  spawnEvery: 1400, maxAlive: 3, enemySpeedMult: 0.75 },
  { name: 'ACTION',    start: 3000,  end: 9500,  spawnEvery: 650,  maxAlive: 7, enemySpeedMult: 1.0  },
  { name: 'INTENSE',   start: 9500,  end: 15000, spawnEvery: 340,  maxAlive: 12, enemySpeedMult: 1.25 },
  { name: 'AFTERMATH', start: 15000, end: 18000, spawnEvery: Infinity, maxAlive: 0, enemySpeedMult: 1.0 },
  { name: 'FADE',      start: 18000, end: 19000, spawnEvery: Infinity, maxAlive: 0, enemySpeedMult: 1.0 }
];
const ATTRACT_LOOP_DURATION = ATTRACT_PHASES[ATTRACT_PHASES.length - 1].end;
let attractState = null;
let attractLoopStartTime = 0;
let attractLastFrameTime = 0;
let attractNextSpawnAt = 0;
function attractPhaseAt(loopMs){
  for(const p of ATTRACT_PHASES) if(loopMs >= p.start && loopMs < p.end) return p;
  return ATTRACT_PHASES[ATTRACT_PHASES.length - 1];
}
// CA692 — see HISTORY.md § [1.5.7] Code Archaeology, CA692
function attractSpawnPoint(){
  // ATTRACT-HORIZON-01 (1.7.36): enemies walk in from the left or right edge along the ground band, as if coming over the
  // horizon, and never drop in from the top or bottom of the screen.
  const fromLeft = Math.random() < 0.5, pad = 0.08;
  return { xf: fromLeft ? -pad : 1 + pad, yf: 0.38 + Math.random()*0.42 };
}
function attractFormationCenter(){
  let cx = 0, cy = 0;
  for(const f of ATTRACT_FORMATION){ cx += f.xf; cy += f.yf; }
  return { xf: cx/ATTRACT_FORMATION.length, yf: cy/ATTRACT_FORMATION.length };
}
// The attract screen is mostly the big angry red guy (the Grunt), with a few other living creatures for variety.
function attractPickEnemyType(){
  if(Math.random() < 0.72) return 'GRUNT';
  return ATTRACT_ENEMY_POOL[Math.floor(Math.random()*ATTRACT_ENEMY_POOL.length)];
}
function attractSpawnEnemy(now){
  const spawn = attractSpawnPoint();
  const center = attractFormationCenter();
  // Bounded jitter around the formation center — "controlled random angles, not true randomness."
  const jitter = 0.10;
  const targetXf = clampNum(center.xf + (Math.random()*2-1)*jitter, 0.08, 0.92);
  const targetYf = clampNum(center.yf + (Math.random()*2-1)*jitter, 0.08, 0.92);
  return {
    type: attractPickEnemyType(),
    fromXf: spawn.xf, fromYf: spawn.yf, toXf: targetXf, toYf: targetYf,
    t: 0, speed: 0.00014 + Math.random()*0.00005, flashUntil: 0, spawnedAt: now, dead: false, diedAt: 0, arrows: [], arrowHits: 0, arrowsToKill: attractRollArrowsToKill(), hitAt: -1e9, hitAngle: 0 // halved from 0.00028-0.00038 — a saunter, not a rush, per direct request
  };
}
function initAttractLoop(now){
  attractIsDaytime = null; // SCENE-TIME-OF-DAY-01 (1.7.36): every new attract scene re-rolls day or night, the sun or moon position and the moon phase
  attractLoopStartTime = now;
  attractLastFrameTime = now;
  attractNextSpawnAt = now;
  clearAttractBlood();
  attractState = {
    towers: ATTRACT_FORMATION.map((f, i) => ({
      ...f, nextAttackAt: 900 + i*350, phase: 'idle', phaseStart: 0, phaseDur: 0, target: null, aimAngle: Math.PI/2
    })),
    enemies: [],
    projectiles: [],
    speedMult: ATTRACT_PHASES[0].enemySpeedMult,
    droplets: Array.from({ length: ATTRACT_DROPLET_CAP }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 2, color: '#c0392b' })),
    killCount: 0 // running "defeated" tally, purely cosmetic display — resets each loop, see the HUD-style counter drawn near the top corner
  };
}
function attractEnemyScreenPos(e, t){
  return { xf: e.fromXf + (e.toXf - e.fromXf)*t, yf: e.fromYf + (e.toYf - e.fromYf)*t };
}
// ATTRACT-ARCHERS-01 (1.7.87) — see HISTORY.md § [1.7.87]
const ATTRACT_EMOJI_PX = 62, ATTRACT_DRIFT_ZOOM_MAX = 1.05, ATTRACT_ENGAGE_T = 0.3, ATTRACT_ARROW_FLIGHT_MS = 300, ATTRACT_ARROW_ARC_PX = 22, ATTRACT_SPEED_EASE_MS = 600, ATTRACT_AIM_EASE_MS = 90, ATTRACT_CORPSE_MS = 450;
const ATTRACT_STICKMAN_DRAW_SCALE = 1.8;
const ATTRACT_STICK_RADIUS_PX = 22, ATTRACT_ARROW_DRAW_SCALE = 2.2, ATTRACT_MAX_STUCK_DRAWN = 5, ATTRACT_FLINCH_PX = 6, ATTRACT_FLINCH_MS = 110, ATTRACT_ARROW_WOBBLE_MS = 160;
const ATTRACT_BLOOD_FADE_START_MS = 15000, ATTRACT_BLOOD_FADE_MS = 3500, ATTRACT_DROPLET_CAP = 90, ATTRACT_DROPLET_GRAVITY = 520, ATTRACT_DROPLET_DRAG = 0.0022, ATTRACT_DROPLET_TERMINAL = 620, ATTRACT_DROPLET_GROUND_SQUASH = 0.55;
let attractBloodCanvas = null, attractBloodCtx = null, attractBloodScale = 1;
function ensureAttractBloodCanvas(){
  const scale = Math.min(dprValue, 1.5), width = Math.round(CANVAS_W * scale), height = Math.round(CANVAS_H * scale);
  if(!attractBloodCanvas) attractBloodCanvas = document.createElement('canvas');
  if(attractBloodCanvas.width !== width || attractBloodCanvas.height !== height){ attractBloodCanvas.width = width; attractBloodCanvas.height = height; attractBloodCtx = attractBloodCanvas.getContext('2d'); }
  attractBloodScale = scale;
}
function clearAttractBlood(){ if(!attractBloodCanvas) return; ensureAttractBloodCanvas(); attractBloodCtx.clearRect(0, 0, attractBloodCanvas.width, attractBloodCanvas.height); }
function stampAttractBlood(x, y, angle, lengthPx, widthPx, color, alpha){
  ensureAttractBloodCanvas();
  const c = attractBloodCtx, scale = attractBloodScale;
  c.save(); c.globalAlpha = alpha; c.translate(x * scale, y * scale); c.rotate(angle); c.fillStyle = color;
  c.beginPath(); c.ellipse(0, 0, lengthPx * 0.5 * scale, widthPx * 0.5 * scale, 0, 0, Math.PI * 2); c.fill(); c.restore();
}
function attractBloodColor(type){ const profile = getBloodProfile(type); return Math.random() < 0.2 ? profile.dark : profile.bright; }
function emitAttractBlood(st, enemy, ex, ey, impactAngle, isKill){
  if(!goreMode || !bloodDropletsEnabled) return;
  const low = graphicsQuality === 'low', count = isKill ? (low ? 9 : 16) : (low ? 3 : 5);
  for(let i = 0; i < count; i++){
    const slot = st.droplets.find(d => !d.active);
    if(!slot) break;
    const heading = impactAngle + (Math.random() - 0.5) * (isKill ? Math.PI * 1.6 : 0.9), horizontal = (isKill ? 70 : 40) + Math.random() * (isKill ? 130 : 80);
    slot.active = true; slot.x = ex + Math.cos(heading) * 8; slot.y = ey + 18; slot.z = 18 + Math.random() * 14;
    slot.vx = Math.cos(heading) * horizontal; slot.vy = Math.sin(heading) * horizontal; slot.vz = 60 + Math.random() * (isKill ? 150 : 90);
    slot.size = 1.6 + Math.random() * (isKill ? 1.8 : 1.0); slot.color = attractBloodColor(enemy.type);
  }
  if(isKill) for(let i = 0; i < 3; i++) stampAttractBlood(ex + (Math.random() - 0.5) * 26, ey + 20 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 0.5, 14 + Math.random() * 10, 6 + Math.random() * 5, attractBloodColor(enemy.type), 0.8);
}
function updateAttractDroplets(st, dtSec){
  for(const d of st.droplets){
    if(!d.active) continue;
    const dragRate = ATTRACT_DROPLET_DRAG * Math.hypot(d.vx, d.vy, d.vz);
    d.vx -= d.vx * dragRate * dtSec; d.vy -= d.vy * dragRate * dtSec;
    d.vz -= (ATTRACT_DROPLET_GRAVITY + d.vz * dragRate) * dtSec;
    if(d.vz < -ATTRACT_DROPLET_TERMINAL) d.vz = -ATTRACT_DROPLET_TERMINAL;
    d.x += d.vx * dtSec; d.y += d.vy * dtSec * ATTRACT_DROPLET_GROUND_SQUASH; d.z += d.vz * dtSec;
    if(d.z > 0) continue;
    const speed = Math.hypot(d.vx, d.vy, d.vz) || 1, sinImpact = clampNum(Math.abs(d.vz) / speed, 0.2, 1);
    stampAttractBlood(d.x, d.y, Math.atan2(d.vy, d.vx), d.size / sinImpact, d.size, d.color, 0.55 + Math.random() * 0.35);
    d.active = false;
  }
}
function attractRollArrowsToKill(){ const roll = Math.random(); return roll < 0.3 ? 1 : (roll < 0.8 ? 2 : 3); }
function attractArrowDrag(enemy){ return Math.max(ARROW_SLOW_FLOOR, 1 - ARROW_SLOW_PER_ARROW * enemy.arrows.length); }
function attractEmojiBucketIndex(sizePx){
  const devicePx = sizePx * dprValue * ATTRACT_DRIFT_ZOOM_MAX;
  return devicePx > EMOJI_SPRITE_MAX_PX ? -1 : Math.max(0, Math.ceil(Math.log(devicePx / EMOJI_SPRITE_MIN_PX) / EMOJI_SPRITE_LOG_STEP - 1e-6));
}
function drawAttractEmoji(ctx, emoji, sizePx){
  const bucketIndex = attractEmojiBucketIndex(sizePx);
  if(bucketIndex < 0){ ctx.fillText(emoji, 0, 0); return; }
  const sprite = emojiSpriteFor(emoji, bucketIndex), drawnSide = sprite.side * (sizePx / sprite.fontPx);
  ctx.drawImage(sprite, -drawnSide / 2, -drawnSide / 2, drawnSide, drawnSide);
}
function attractTowerClaims(st, enemy){ for(const tower of st.towers) if(tower.target === enemy) return true; return false; }
function attractPickTarget(st, tx, ty){
  let bestFree = null, bestFreeDist = Infinity, bestAny = null, bestAnyDist = Infinity;
  for(const enemy of st.enemies){
    if(enemy.dead || enemy.t < ATTRACT_ENGAGE_T) continue;
    const pos = attractEnemyScreenPos(enemy, enemy.t), dist = Math.hypot(pos.xf * CANVAS_W - tx, pos.yf * CANVAS_H - ty);
    if(dist < bestAnyDist){ bestAnyDist = dist; bestAny = enemy; }
    if(dist < bestFreeDist && !attractTowerClaims(st, enemy)){ bestFreeDist = dist; bestFree = enemy; }
  }
  return bestFree || bestAny;
}
function attractArrowHit(st, enemy, shot, now){
  const pos = attractEnemyScreenPos(enemy, enemy.t), ex = pos.xf * CANVAS_W, ey = pos.yf * CANVAS_H;
  const impactAngle = Math.atan2(ey - shot.fromY, ex - shot.fromX), perp = impactAngle + Math.PI / 2, lateral = (Math.random() - 0.5) * ATTRACT_STICK_RADIUS_PX * 0.5;
  enemy.hitAt = now; enemy.hitAngle = impactAngle; enemy.arrowHits++;
  enemy.arrows.push({ dx: -Math.cos(impactAngle) * ATTRACT_STICK_RADIUS_PX + Math.cos(perp) * lateral, dy: -Math.sin(impactAngle) * ATTRACT_STICK_RADIUS_PX + Math.sin(perp) * lateral, angle: impactAngle + (Math.random() - 0.5) * 0.3, stuckAt: now });
  if(enemy.arrows.length > ATTRACT_MAX_STUCK_DRAWN) enemy.arrows.shift();
  const isKill = enemy.arrowHits >= enemy.arrowsToKill;
  if(isKill){
    enemy.flashUntil = now + 150; enemy.dead = true; enemy.diedAt = now;
    enemy.burstScale = 0.75 + Math.random()*0.9; // variance so bursts don't all look identical — some kills read as a bigger, more dramatic hit
    enemy.procElement = (shot.element && Math.random() < 0.45) ? shot.element : null;
    st.killCount++;
  }
  emitAttractBlood(st, enemy, ex, ey, impactAngle, isKill);
}
function drawAttractStuckArrow(ctx, arrow, now){
  const age = now - arrow.stuckAt, wobble = age < ATTRACT_ARROW_WOBBLE_MS * 4 ? Math.exp(-age / ATTRACT_ARROW_WOBBLE_MS) * Math.sin(age / 24) * 0.28 : 0;
  ctx.save(); ctx.translate(arrow.dx, arrow.dy); ctx.rotate(arrow.angle + wobble); ctx.scale(ATTRACT_ARROW_DRAW_SCALE, ATTRACT_ARROW_DRAW_SCALE);
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(2, 0); ctx.stroke();
  ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-2, -2.5); ctx.lineTo(-2, 2.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, -2); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, 2); ctx.stroke();
  ctx.restore();
}
function drawAttractFlyingArrow(ctx, shot, target, now){
  const pT = clampNum((now - shot.startTime) / shot.duration, 0, 1), tp = attractEnemyScreenPos(target, target.t), tx = tp.xf * CANVAS_W, ty = tp.yf * CANVAS_H;
  const arc = Math.sin(pT * Math.PI) * ATTRACT_ARROW_ARC_PX, px = shot.fromX + (tx - shot.fromX) * pT, py = shot.fromY + (ty - shot.fromY) * pT - arc;
  const heading = Math.atan2((ty - shot.fromY) - ATTRACT_ARROW_ARC_PX * Math.PI * Math.cos(pT * Math.PI), tx - shot.fromX), glow = ATTRACT_ELEMENT_COLOR[shot.element] || '#f1c40f';
  ctx.save(); ctx.translate(px, py); ctx.rotate(heading); ctx.scale(ATTRACT_ARROW_DRAW_SCALE, ATTRACT_ARROW_DRAW_SCALE); ctx.lineCap = 'round';
  ctx.strokeStyle = glow; ctx.globalAlpha *= 0.55; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-8, 0); ctx.stroke(); ctx.globalAlpha /= 0.55;
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(2, 0); ctx.stroke();
  ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -2.5); ctx.lineTo(-1, 2.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, -2); ctx.moveTo(-8, 0); ctx.lineTo(-10.5, 2); ctx.stroke();
  ctx.restore();
}
let attractSkyRolledAt = -1e9;
let attractIsDaytime = null, attractSkyBodyT = 0.82, attractSkyBodyHeight = 0.35, attractMoonPhase = 4; // rolled once per visit in the attract renderer — day or night backdrop
function renderAttractMode(ctx, now){
  if(!attractState) initAttractLoop(now);
  let dt = now - attractLastFrameTime;
  attractLastFrameTime = now;
  if(dt > 100) dt = 100; // safety clamp, same reasoning as the real game loop's own frameTime clamp

  let loopMs = now - attractLoopStartTime;
  if(loopMs >= ATTRACT_LOOP_DURATION){
    initAttractLoop(now);
    loopMs = 0;
  }
  const phase = attractPhaseAt(loopMs);
  const st = attractState;

  // Fade curve: fades in over the CALM phase's first 700ms, fades out over the FADE phase.
  let fadeT = 1;
  if(loopMs < 700) fadeT = loopMs / 700;
  else if(phase.name === 'FADE'){
    const fadePhase = ATTRACT_PHASES[ATTRACT_PHASES.length - 1];
    fadeT = 1 - clampNum((loopMs - fadePhase.start) / (fadePhase.end - fadePhase.start), 0, 1);
  }

  // CA693 — see HISTORY.md § [1.5.7] Code Archaeology, CA693
  let aliveCount = 0;
  for(const enemy of st.enemies) if(!enemy.dead) aliveCount++;
  if(now >= attractNextSpawnAt && aliveCount < phase.maxAlive && phase.spawnEvery !== Infinity){
    st.enemies.push(attractSpawnEnemy(now));
    attractNextSpawnAt = now + phase.spawnEvery * (0.7 + Math.random()*0.6);
  }
  st.speedMult += (phase.enemySpeedMult - st.speedMult) * (1 - Math.exp(-dt / ATTRACT_SPEED_EASE_MS));
  let keptEnemies = 0;
  for(const enemy of st.enemies){
    if(!enemy.dead){
      enemy.t += enemy.speed * st.speedMult * ATTRACT_ENEMY_MOVE_SCALE * attractArrowDrag(enemy) * dt;
      if(enemy.t >= 1){ enemy.dead = true; enemy.diedAt = now; } // reached the formation center — cleared without a kill-flash
    }
    if(!enemy.dead || now - enemy.diedAt < ATTRACT_CORPSE_MS) st.enemies[keptEnemies++] = enemy; // dead enemies stay long enough for their burst to play
  }
  st.enemies.length = keptEnemies;
  updateAttractDroplets(st, dt / 1000);
  const bloodFade = 1 - smoothStep01(clampNum((loopMs - ATTRACT_BLOOD_FADE_START_MS) / ATTRACT_BLOOD_FADE_MS, 0, 1)); // the blood leaves with the enemies when the scene clears

  ctx.save();
  ctx.globalAlpha=1; ctx.shadowBlur=0;
  ctx.fillStyle='#8b5a2b'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  // CA694 — see HISTORY.md § [1.5.7] Code Archaeology, CA694
  const driftT = now / 9000;
  const driftZoom = 1 + 0.018 + 0.017*Math.sin(driftT);
  const driftPanX = Math.sin(driftT*0.7 + 1.3) * 10;
  const driftPanY = Math.cos(driftT*0.6) * 6;
  ctx.translate(CANVAS_W/2 + driftPanX, CANVAS_H/2 + driftPanY);
  ctx.scale(driftZoom, driftZoom);
  ctx.translate(-CANVAS_W/2, -CANVAS_H/2);
  // CA695 — see HISTORY.md § [1.5.7] Code Archaeology, CA695
  const horizonY = CANVAS_H * 0.12;
  attractSkyRolledAt = Math.max(attractSkyRolledAt, now - 3000); // treat continuous rendering as one visit
  // CA696 — see HISTORY.md § [1.5.7] Code Archaeology, CA696
  if(attractIsDaytime === null || now - attractSkyRolledAt > 4000){
    attractSkyRolledAt = now;
    attractIsDaytime = Math.random() < 0.5;
    // CA697 — see HISTORY.md § [1.5.7] Code Archaeology, CA697
    attractSkyBodyT = 0.12 + Math.random() * 0.76;      // horizontal position, kept off the edges
    attractSkyBodyHeight = 0.22 + Math.random() * 0.45; // height within the sky band
    attractMoonPhase = Math.floor(Math.random() * 8);   // 0 new, 4 full, 7 waning crescent
  }
  // CA698 — see HISTORY.md § [1.5.7] Code Archaeology, CA698
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, attractIsDaytime ? '#5aa7d8' : '#161022');
  skyGrad.addColorStop(1, attractIsDaytime ? '#cfe2c0' : '#3a2c1a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, horizonY);
  const bodyX = CANVAS_W * attractSkyBodyT, bodyY = horizonY * attractSkyBodyHeight, bodyR = attractIsDaytime ? 26 : 22;
  ctx.save();
  ctx.globalAlpha = fadeT * 0.9;
  ctx.fillStyle = attractIsDaytime ? '#ffe9a8' : '#f5f0e6';
  ctx.shadowColor = attractIsDaytime ? '#ffd76b' : '#f5f0e6';
  ctx.shadowBlur = graphicsQuality === 'low' ? 0 : (attractIsDaytime ? 26 : 18);
  ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, Math.PI*2); ctx.fill();
  if(!attractIsDaytime && attractMoonPhase !== 4){
    // CA699 — see HISTORY.md § [1.5.7] Code Archaeology, CA699
    const illumination = Math.abs(attractMoonPhase - 4) / 4;  // 0 full ... 1 new
    const waning = attractMoonPhase > 4;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#231a2e';
    ctx.beginPath();
    ctx.arc(bodyX + (waning ? -1 : 1) * bodyR * illumination * 1.25, bodyY, bodyR * (1 + illumination * 0.08), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#f5f0e6';
  for(let i=0; i<(attractIsDaytime ? 0 : 14); i++){
    // CA700 — see HISTORY.md § [1.5.7] Code Archaeology, CA700
    const sx = ((i*137.5) % 100)/100 * CANVAS_W;
    const sy = ((i*71.3) % 100)/100 * horizonY * 0.9;
    const twinkle = 0.35 + 0.5*Math.abs(Math.sin(now/900 + i*2.1));
    ctx.globalAlpha = fadeT * twinkle;
    ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  const groundRows = 16, groundCols = 10;
  for(let i=0; i<groundRows; i++){
    const t0 = i/groundRows, t1 = (i+1)/groundRows;
    // CA701 — see HISTORY.md § [1.5.7] Code Archaeology, CA701
    const y0 = horizonY + (CANVAS_H-horizonY) * t0*t0;
    const y1 = horizonY + (CANVAS_H-horizonY) * t1*t1;
    for(let c=0; c<groundCols; c++){
      ctx.fillStyle = (i+c)%2===0 ? (attractIsDaytime ? '#8fb268' : '#6f8f52') : (attractIsDaytime ? '#a6c77c' : '#84a562'); // daylight lifts the field so the day/night roll reads through the start-screen dimmer // checkerboard grass, same two-tone-square language as the real game's own buildable area
      const colW = CANVAS_W/groundCols;
      ctx.fillRect(c*colW, y0, colW+1, y1-y0+1);
    }
  }
  ctx.globalAlpha = fadeT;

  // CA702 — see HISTORY.md § [1.5.7] Code Archaeology, CA702
  ctx.save();
  ctx.fillStyle = '#e8dfc8';
  for(let i=0; i<18; i++){
    const baseX = ((i*93.7) % 100)/100 * CANVAS_W;
    const driftSpeed = 0.00002 + (i%5)*0.000006;
    const driftY = ((now * driftSpeed) + (i*61.3)%100/100) % 1.15; // loops past the bottom edge back to the top
    const my = CANVAS_H * (1.05 - driftY);
    const sway = Math.sin(now/1400 + i*3.7) * 14;
    ctx.globalAlpha = fadeT * (0.15 + 0.15*Math.sin(now/1100 + i*1.8));
    ctx.beginPath(); ctx.arc(baseX + sway, my, 1.6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = fadeT;

  if(attractBloodCanvas && bloodFade > 0){
    ctx.save(); ctx.globalAlpha = fadeT * bloodFade;
    ctx.drawImage(attractBloodCanvas, 0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }
  // CA703 — see HISTORY.md § [1.5.7] Code Archaeology, CA703
  for(const t of st.towers){
    const tx = t.xf*CANVAS_W, ty = t.yf*CANVAS_H;
    if(t.phase === 'draw' && (!t.target || t.target.dead)){ t.phase = 'idle'; t.target = null; t.nextAttackAt = now + 120; } // the target fell to another arrow: loose nothing and pick again
    if(t.phase === 'idle' && now >= t.nextAttackAt){
      const chosen = attractPickTarget(st, tx, ty);
      if(chosen){ t.target = chosen; t.phase = 'draw'; t.phaseStart = now; t.phaseDur = 480; }
    }
    if(t.phase !== 'idle' && now - t.phaseStart >= t.phaseDur){
      if(t.target && !t.target.dead){
        const bowGrip = archerNockedArrowTip(t.aimAngle, 1, 0), archerBuild = JOB_BUILD.ARCHER || { scaleX: 1, scaleY: 1 }; // ARROW-GRIP-01 (1.7.131): the attract archers loose from the bow hand too, not from the stickman's feet
        st.projectiles.push({ fromX: tx + bowGrip.x*STICKMAN_SCALE*archerBuild.scaleX*ATTRACT_STICKMAN_DRAW_SCALE, fromY: ty + bowGrip.y*STICKMAN_SCALE*archerBuild.scaleY*ATTRACT_STICKMAN_DRAW_SCALE, target: t.target, startTime: now, duration: ATTRACT_ARROW_FLIGHT_MS, element: t.element });
      }
      t.phase = 'idle'; t.target = null;
      t.nextAttackAt = now + 520 + Math.random()*420;
    }
  }

  for(let i = st.projectiles.length-1; i>=0; i--){
    const shot = st.projectiles[i];
    if(now - shot.startTime < shot.duration) continue;
    if(!shot.target.dead) attractArrowHit(st, shot.target, shot, now);
    st.projectiles.splice(i,1);
  }

  // CA706 — see HISTORY.md § [1.5.7] Code Archaeology, CA706
  ctx.font = ATTRACT_EMOJI_PX + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // CA707 — see HISTORY.md § [1.5.7] Code Archaeology, CA707
  for(const e of st.enemies){
    const p = attractEnemyScreenPos(e, Math.min(e.t, 1));
    const flinchAge = now - e.hitAt, flinch = flinchAge < ATTRACT_FLINCH_MS * 5 ? ATTRACT_FLINCH_PX * Math.exp(-flinchAge / ATTRACT_FLINCH_MS) : 0;
    const ex = p.xf*CANVAS_W + Math.cos(e.hitAngle) * flinch, ey = p.yf*CANVAS_H + Math.sin(e.hitAngle) * flinch;
    if(now < e.flashUntil){
      // CA708 — see HISTORY.md § [1.5.7] Code Archaeology, CA708
      const flashProgress = 1 - (e.flashUntil - now)/150;
      const scale = e.burstScale || 1; // enemies that "died" by reaching the formation silently (no projectile kill) never get burstScale set — falls back to a normal-size burst
      const burstR = (8 + flashProgress * 24) * scale;
      const burstAlpha = 1 - flashProgress;
      const sparkCount = scale > 1.3 ? 10 : 7; // a bigger hit gets a few extra spark lines, reads as genuinely more dramatic rather than just scaled up
      // CA709 — see HISTORY.md § [1.5.7] Code Archaeology, CA709
      const burstColor = e.procElement ? ATTRACT_ELEMENT_COLOR[e.procElement] : '#f1c40f';
      ctx.save();
      ctx.globalAlpha = burstAlpha;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(ex, ey, (6 + flashProgress*4)*scale, 0, Math.PI*2); ctx.fill(); // bright core, shrinks slightly as it fades
      ctx.strokeStyle = burstColor; ctx.fillStyle = burstColor; ctx.lineWidth = 2.5*Math.min(scale, 1.15);
      for(let s=0; s<sparkCount; s++){
        const ang = (s/sparkCount)*Math.PI*2 + e.spawnedAt*0.001; // per-enemy fixed rotation offset so bursts don't all look identical
        if(e.procElement === 'ELECTRIC'){
          // Jagged zigzag instead of a straight line — a lightning-bolt shape, not just a yellow spark.
          const midAng = ang + (Math.random()-0.5)*0.5;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(ang)*burstR*0.5, ey + Math.sin(ang)*burstR*0.5);
          ctx.lineTo(ex + Math.cos(midAng)*burstR*0.78, ey + Math.sin(midAng)*burstR*0.78);
          ctx.lineTo(ex + Math.cos(ang)*burstR, ey + Math.sin(ang)*burstR);
          ctx.stroke();
        } else if(e.procElement === 'ICE'){
          // CA710 — see HISTORY.md § [1.5.7] Code Archaeology, CA710
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(ang)*burstR*0.5, ey + Math.sin(ang)*burstR*0.5);
          ctx.lineTo(ex + Math.cos(ang)*burstR, ey + Math.sin(ang)*burstR);
          ctx.stroke();
          const shardX = ex + Math.cos(ang)*burstR, shardY = ey + Math.sin(ang)*burstR;
          const shardSize = 3.5*scale;
          ctx.beginPath();
          ctx.moveTo(shardX, shardY-shardSize); ctx.lineTo(shardX+shardSize*0.6, shardY);
          ctx.lineTo(shardX, shardY+shardSize); ctx.lineTo(shardX-shardSize*0.6, shardY);
          ctx.closePath(); ctx.fill();
        } else if(e.procElement === 'FIRE'){
          // CA711 — see HISTORY.md § [1.5.7] Code Archaeology, CA711
          const perpAng = ang + Math.PI/2;
          const bow = burstR * 0.18;
          const cx2 = ex + Math.cos(ang)*burstR*0.75 + Math.cos(perpAng)*bow;
          const cy2 = ey + Math.sin(ang)*burstR*0.75 + Math.sin(perpAng)*bow;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(ang)*burstR*0.5, ey + Math.sin(ang)*burstR*0.5);
          ctx.quadraticCurveTo(cx2, cy2, ex + Math.cos(ang)*burstR, ey + Math.sin(ang)*burstR);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(ang)*burstR*0.5, ey + Math.sin(ang)*burstR*0.5);
          ctx.lineTo(ex + Math.cos(ang)*burstR, ey + Math.sin(ang)*burstR);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if(!e.dead || now < e.flashUntil){
      // CA712 — see HISTORY.md § [1.5.7] Code Archaeology, CA712
      const stridePhase = (e.t * 14) % (Math.PI*2); // ~14 "steps" over a full off-screen-to-formation walk
      const bob = Math.abs(Math.sin(stridePhase)) * 5; // always lifts up, never dips below the baseline — reads as a step, not a float
      const squash = 1 + Math.sin(stridePhase) * 0.06;
      // CA713 — see HISTORY.md § [1.5.7] Code Archaeology, CA713
      const perspectiveScale = 0.65 + Math.min(e.t, 1) * 0.35;
      ctx.save();
      ctx.translate(ex, ey - bob);
      ctx.scale(perspectiveScale/squash, perspectiveScale*squash); // wider+shorter at the bob's peak, taller+narrower at the trough — a step's weight shift
      drawAttractEmoji(ctx, CONFIG.ENEMIES[e.type].emoji, ATTRACT_EMOJI_PX);
      for(const arrow of e.arrows) drawAttractStuckArrow(ctx, arrow, now);
      ctx.restore();
    }
  }

  for(const t of st.towers){
    const tx = t.xf*CANVAS_W, ty = t.yf*CANVAS_H;
    const target = (t.target && !t.target.dead) ? t.target : null;
    if(target){
      const p = attractEnemyScreenPos(target, target.t);
      const desiredAngle = Math.atan2(p.yf*CANVAS_H - ty, p.xf*CANVAS_W - tx);
      t.aimAngle += Math.atan2(Math.sin(desiredAngle - t.aimAngle), Math.cos(desiredAngle - t.aimAngle)) * (1 - Math.exp(-dt / ATTRACT_AIM_EASE_MS)); // eased, so the bow swings to a new target instead of snapping
    }
    const angle = t.aimAngle;
    const extraAtk = { hasTarget: !!target };
    if(t.phase === 'draw') extraAtk.drawProgress = clampNum((now-t.phaseStart)/t.phaseDur, 0, 1);
    // CA714 — see HISTORY.md § [1.5.7] Code Archaeology, CA714
    const elementSkins = {
      FIRE:     { skinMain: '#ff9466', skinShade: '#cc4a1f' },
      ICE:      { skinMain: '#bfe8fd', skinShade: '#4fa8d8' },
      ELECTRIC: { skinMain: '#fde68a', skinShade: '#d4a017' }
    };
    if(elementSkins[t.element]){
      extraAtk.skinMain = elementSkins[t.element].skinMain;
      extraAtk.skinShade = elementSkins[t.element].skinShade;
    }
    // CA715 — see HISTORY.md § [1.5.7] Code Archaeology, CA715
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(ATTRACT_STICKMAN_DRAW_SCALE, ATTRACT_STICKMAN_DRAW_SCALE);
    ctx.translate(-tx, -ty);
    drawStickman(ctx, tx, ty, angle, 1, 'ARCHER', extraAtk);
    ctx.restore();
  }

  for(const shot of st.projectiles) drawAttractFlyingArrow(ctx, shot, shot.target, now);
  ctx.save();
  for(const d of st.droplets){
    if(!d.active) continue;
    ctx.fillStyle = d.color; ctx.globalAlpha = fadeT * 0.9;
    ctx.beginPath(); ctx.arc(d.x, d.y - d.z, d.size * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // CA717 — see HISTORY.md § [1.5.7] Code Archaeology, CA717

  // CA718 — see HISTORY.md § [1.5.7] Code Archaeology, CA718
  ctx.save();
  ctx.globalAlpha = fadeT;
  const vignetteGrad = ctx.createRadialGradient(
    CANVAS_W/2, CANVAS_H/2, Math.min(CANVAS_W, CANVAS_H)*0.35,
    CANVAS_W/2, CANVAS_H/2, Math.max(CANVAS_W, CANVAS_H)*0.72
  );
  vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  ctx.restore();
}
/* =========================================================
   FIELD MUSIC SCAN AND MERCHANT CARAVAN
   ========================================================= */
function scanFieldForMusic(){
  let boss = false, enemies = 0;
  for(const enemy of enemyPool){
    if(!enemy.active || enemy.deathResolved || enemy.escaped || enemy.isLivestock || enemy.isGuardian || enemy.isHutBuilding) continue;
    enemies++;
    if(enemy.type === 'BOSS' || enemy.type === 'SANTA') boss = true;
  }
  audioEngine.musicIntensity = Math.min(1, enemies / 18);
  return boss;
}
let softwareRenderingNoticeShown = false;
let attackStateClock = 0;
// CARAVAN-01 (1.7.100) — see HISTORY.md § [1.7.100]
const CARAVAN_FIRST_ROUND_AFTER = 2, CARAVAN_CHANCE = 0.4, CARAVAN_MIN_GAP_ROUNDS = 2, CARAVAN_SPEED_PX_PER_S = 46, CARAVAN_TAP_RADIUS_PX = 36;
const CARAVAN_CLOP_STRIDE_PX = 24, WOOD_SELL_GOLD = 2, STONE_SELL_GOLD = 4;
const caravan = { active: false, exiting: false, phase: 'approach', x: 0, y: 0, dirX: 1, dirY: 0, targetIndex: 1, pathLength: 0, travelPx: 0, wheelPhase: 0, clopPx: 0, lastRound: -99, announced: false };
// CARAVAN-JOURNEY-01 (1.8.40): the merchant crosses the whole map. He steps in from beyond the map edge along the line of the first road tile, walks the bare wilderness, passes the spawn flags, follows the road to the finish carpet, and leaves past it off the other edge, where he is cleared from memory.
const CARAVAN_EDGE_MARGIN_PX = 70, CARAVAN_MAX_TRAVEL_PX = 6000;
function caravanOutsideWorld(x, y){ return x < -CARAVAN_EDGE_MARGIN_PX || x > WORLD_MAX_W + CARAVAN_EDGE_MARGIN_PX || y < -CARAVAN_EDGE_MARGIN_PX || y > WORLD_MAX_H + CARAVAN_EDGE_MARGIN_PX; }
function caravanEdgePoint(fromX, fromY, unitX, unitY){
  let distance = 0;
  while(distance < CARAVAN_MAX_TRAVEL_PX && !caravanOutsideWorld(fromX + unitX*distance, fromY + unitY*distance)) distance += 8;
  return { x: fromX + unitX*distance, y: fromY + unitY*distance };
}
function syncCaravanWag(){ const wag = document.getElementById('caravanWag'); if(wag) wag.hidden = !caravan.active; }
function caravanShopAvailable(){ return caravan.active && !caravan.exiting; }
function releaseCaravan(){ caravan.active = false; caravan.exiting = false; caravan.phase = 'approach'; caravan.travelPx = 0; syncCaravanWag(); updateHUD(); }
function resetCaravan(){ caravan.active = false; caravan.exiting = false; caravan.phase = 'approach'; caravan.lastRound = -99; syncCaravanWag(); }
function maybeSpawnCaravan(){
  if(caravan.active || wavesCompleted <= CARAVAN_FIRST_ROUND_AFTER || wavesCompleted - caravan.lastRound < CARAVAN_MIN_GAP_ROUNDS) return;
  if(wood <= 0 && stone <= 0 && caravan.lastRound > -99) return;
  if(waypointsPx.length < 2 || (caravan.lastRound > -99 && Math.random() >= CARAVAN_CHANCE)) return; // EARLY-HOOK-01: the first visit always comes
  const lead = Math.hypot(waypointsPx[1].x - waypointsPx[0].x, waypointsPx[1].y - waypointsPx[0].y) || 1;
  const unitX = (waypointsPx[1].x - waypointsPx[0].x)/lead, unitY = (waypointsPx[1].y - waypointsPx[0].y)/lead;
  const entry = caravanEdgePoint(waypointsPx[0].x, waypointsPx[0].y, -unitX, -unitY);
  caravan.active = true; caravan.exiting = false; caravan.phase = 'approach'; caravan.travelPx = 0; caravan.clopPx = 0; caravan.announced = false; caravan.lastRound = wavesCompleted;
  caravan.x = entry.x; caravan.y = entry.y; caravan.targetIndex = 1; caravan.pathLength = waypointsPx.length;
  caravan.dirX = unitX; caravan.dirY = unitY;
  syncCaravanWag();
  showToast('🐪 A merchant caravan is crossing. Press him to trade.');
  logGameEvent('caravan arrived after round ' + wavesCompleted);
  trackGameEvent('caravan_arrived', { round: wavesCompleted, wood, stone });
  updateHUD();
}
function retargetCaravanAfterPathChange(){
  let nearestIndex = 0, nearestDistance = Infinity;
  for(let index = 0; index < waypointsPx.length; index++){
    const distance = Math.hypot(waypointsPx[index].x - caravan.x, waypointsPx[index].y - caravan.y);
    if(distance < nearestDistance){ nearestDistance = distance; nearestIndex = index; }
  }
  caravan.targetIndex = Math.min(nearestIndex + 1, waypointsPx.length);
  caravan.pathLength = waypointsPx.length;
}
function stepCaravanToward(target, stepPx){
  const dx = target.x - caravan.x, dy = target.y - caravan.y, distance = Math.hypot(dx, dy) || 0.0001;
  caravan.dirX = dx/distance; caravan.dirY = dy/distance;
  if(distance <= stepPx){ caravan.x = target.x; caravan.y = target.y; return true; }
  caravan.x += caravan.dirX*stepPx; caravan.y += caravan.dirY*stepPx;
  return false;
}
function updateCaravan(frameMs){
  if(!caravan.active) return;
  if(!document.getElementById('shop-modal').classList.contains('hidden') && !caravan.exiting) return; // he waits while the player trades
  if(caravan.phase === 'path' && caravan.pathLength !== waypointsPx.length) retargetCaravanAfterPathChange();
  const stepPx = CARAVAN_SPEED_PX_PER_S * Math.min(100, frameMs) / 1000;
  const startX = caravan.x, startY = caravan.y;
  if(caravan.phase === 'approach'){
    if(!waypointsPx.length){ releaseCaravan(); return; }
    if(stepCaravanToward(waypointsPx[0], stepPx)){ caravan.phase = 'path'; caravan.targetIndex = 1; caravan.pathLength = waypointsPx.length; }
  } else if(caravan.phase === 'path'){
    const target = waypointsPx[caravan.targetIndex];
    if(!target){
      const finishLine = computeFinishLine();
      if(finishLine){ caravan.dirX = finishLine.ux; caravan.dirY = finishLine.uy; }
      caravan.phase = 'exit'; caravan.exiting = true; syncCaravanWag(); updateHUD();
    } else if(stepCaravanToward(target, stepPx)) caravan.targetIndex++;
  } else {
    caravan.x += caravan.dirX*stepPx; caravan.y += caravan.dirY*stepPx;
  }
  const movedPx = Math.hypot(caravan.x - startX, caravan.y - startY);
  caravan.travelPx += movedPx;
  if(caravan.phase === 'exit' && (caravanOutsideWorld(caravan.x, caravan.y) || caravan.travelPx > CARAVAN_MAX_TRAVEL_PX)){ releaseCaravan(); return; }
  if(!caravan.announced && !caravanOutsideWorld(caravan.x, caravan.y)){ caravan.announced = true; playSound('caravan_arrive', caravan.x, undefined, caravan.y); }
  caravan.wheelPhase += movedPx/6;
  caravan.clopPx += movedPx;
  if(caravan.clopPx >= CARAVAN_CLOP_STRIDE_PX){ caravan.clopPx -= CARAVAN_CLOP_STRIDE_PX; if(!caravanOutsideWorld(caravan.x, caravan.y)) playSound('caravan_clop', caravan.x, undefined, caravan.y); }
}
// CARAVAN-LOOK-01 (1.8.40): a covered wagon with a drawn camel and one swept ground shadow, in place of a flat ellipse, a mirrored animal emoji and a floating stack of icons.
function fillSweptShadow(ctx, footprint, sweepX, sweepY, alpha){
  const points = [];
  for(const point of footprint){ points.push([point[0], point[1]], [point[0] + sweepX, point[1] + sweepY]); }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lower = []; for(const point of points){ while(lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], point) <= 0) lower.pop(); lower.push(point); }
  const upper = []; for(let index = points.length - 1; index >= 0; index--){ const point = points[index]; while(upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], point) <= 0) upper.pop(); upper.push(point); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(hull[0][0], hull[0][1]);
  for(let index = 1; index < hull.length; index++) ctx.lineTo(hull[index][0], hull[index][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function drawCaravan(ctx){
  if(!caravan.active || caravanOutsideWorld(caravan.x, caravan.y)) return;
  const facing = caravan.dirX >= 0 ? 1 : -1, bob = Math.sin(caravan.wheelPhase*0.55)*1.1, gait = caravan.wheelPhase*0.35;
  ctx.save();
  ctx.translate(caravan.x, caravan.y);
  if(graphicsQuality === 'high'){
    const left = Math.min(-26*facing, 48*facing), right = Math.max(-26*facing, 48*facing);
    fillSweptShadow(ctx, [[left, 4], [right, 4], [right, 9], [left, 9]], 0.55*30, -0.34*30, 0.24);
  }
  ctx.save();
  ctx.scale(facing, 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // camel: four swinging legs, body, one hump, long curved neck, head, tail
  ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2.4;
  for(const leg of [{ x: 30, phase: 0 }, { x: 34, phase: Math.PI }, { x: 42, phase: Math.PI }, { x: 46, phase: 0 }]){
    const swing = Math.sin(gait + leg.phase)*3.2;
    ctx.beginPath(); ctx.moveTo(leg.x, -11); ctx.lineTo(leg.x + swing*0.5, -6); ctx.lineTo(leg.x + swing, -1); ctx.stroke();
  }
  ctx.fillStyle = '#c99a5b'; ctx.beginPath(); ctx.ellipse(38, -15 + bob, 12, 6.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(33, -19 + bob); ctx.quadraticCurveTo(37, -29 + bob, 42, -19 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c99a5b'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(46, -17 + bob); ctx.quadraticCurveTo(52, -22 + bob, 51, -31 + bob); ctx.stroke();
  ctx.fillStyle = '#c99a5b'; ctx.beginPath(); ctx.ellipse(54, -32 + bob, 5.2, 3, 0.25, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#a97c45'; ctx.beginPath(); ctx.arc(50, -35 + bob, 1.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1b1210'; ctx.beginPath(); ctx.arc(54.5, -33 + bob, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(26, -17 + bob); ctx.quadraticCurveTo(22, -14 + bob, 23, -8 + bob + Math.sin(gait)*1.5); ctx.stroke();
  // harness shaft from the wagon to the camel
  ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, -8 + bob); ctx.lineTo(30, -12 + bob); ctx.stroke();
  // wagon bed with plank line
  ctx.fillStyle = '#8d5a2b'; ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5;
  roundedRectPath(ctx, -26, -15 + bob, 36, 11, 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(62,39,35,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, -10 + bob); ctx.lineTo(10, -10 + bob); ctx.stroke();
  // canopy with a red trim and two ribs
  ctx.fillStyle = '#f1e3b8'; ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-25, -15 + bob); ctx.quadraticCurveTo(-8, -40 + bob, 9, -15 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b5483b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-25, -15 + bob); ctx.lineTo(9, -15 + bob); ctx.stroke();
  ctx.strokeStyle = 'rgba(138,122,82,0.8)'; ctx.lineWidth = 1;
  for(const ribX of [-14, -3]){ ctx.beginPath(); ctx.moveTo(ribX, -15 + bob); ctx.quadraticCurveTo(ribX + 1, -30 + bob, ribX + 3, -15 + bob); ctx.stroke(); }
  // wheels
  for(const wheelX of [-17, 2]){
    ctx.save(); ctx.translate(wheelX, -6);
    ctx.fillStyle = '#d7ccc8'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.rotate(caravan.wheelPhase*facing); ctx.lineWidth = 1.1; ctx.beginPath();
    for(let spoke = 0; spoke < 3; spoke++){ const angle = spoke*Math.PI/3; ctx.moveTo(Math.cos(angle)*6, Math.sin(angle)*6); ctx.lineTo(-Math.cos(angle)*6, -Math.sin(angle)*6); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  ctx.save(); ctx.translate(7*facing, -24 + bob); drawEmojiSprite(ctx, '👳', 14); ctx.restore();
  if(!caravan.exiting){ ctx.save(); ctx.translate(-4*facing, -45 + Math.sin(presentationTime/380)*1.6); drawEmojiSprite(ctx, '🛍️', 13); ctx.restore(); }
  ctx.restore();
}
function tryOpenCaravan(worldX, worldY){
  if(!caravanShopAvailable() || Math.hypot(worldX - caravan.x, worldY - caravan.y - 10) > CARAVAN_TAP_RADIUS_PX) return false;
  playSound('ui_open');
  openShopModal();
  return true;
}
function sellToCaravan(resource, requestedAmount){
  if(!caravanShopAvailable()) return false;
  const have = resource === 'wood' ? wood : stone, amount = Math.min(requestedAmount, have);
  if(amount <= 0) return false;
  const goldGained = amount*(resource === 'wood' ? WOOD_SELL_GOLD : STONE_SELL_GOLD);
  if(resource === 'wood') wood -= amount; else stone -= amount;
  gold += goldGained;
  spawnFloatingText(caravan.x, caravan.y - 52, '+💰' + goldGained, '#ffd54f', 1200);
  playSound('ui_buy');
  logGameEvent('sold ' + amount + ' ' + resource + ' to the caravan for ' + goldGained + ' gold');
  trackGameEvent('caravan_sale', { resource, amount, gold: goldGained });
  updateHUD();
  return true;
}
/* =========================================================
   PRESENTATION EFFECTS AND THE FRAME LOOP
   ========================================================= */
function updatePresentationEffects(frameMs){
  updateCampfireCooking(frameMs);
  updateCaravan(frameMs);
  attackStateClock += frameMs; if(attackStateClock >= 250){ attackStateClock = 0; refreshAttackState(); }
  driveRingReveal(Math.min(frameMs, 100)); // EXPAND-REALTIME-01 (1.7.36): slower (1.9 s in 60 ms steps), always visible, and independent of game speed
  if(!softwareRenderingNoticeShown && renderEnvironment.softwareRendering === true && gameState === 'PLAYING'){
    softwareRenderingNoticeShown = true; // GPU-NOTICE-01 (1.7.36): the browser is drawing on the CPU; a quiet bell note says how to fix it, never a popup
    recordNotification('🖥️ Graphics acceleration is off', 'Your browser is drawing the game on the CPU (' + renderEnvironment.gpuRenderer + '). Turning on hardware acceleration in the browser settings (Settings, System, Use graphics acceleration when available, then restart) usually makes play much smoother. You can also pick Low graphics in Settings.');
  }
  if(freeExpansionOwed > 0 && waveState === 'IDLE'){ freeExpansionOwed--; if(!grantFreeExpansion()) freeExpansionOwed = 0; }
  audioEngine.setMusicPhase(gameState === 'START' ? 'attract' : (waveState !== 'IDLE' && !countdownHoldsFieldMusic()) || countLooseEnemies() > 0 ? (bossIsOnField() ? 'boss' : 'wave') : 'field');
  updateDeathAnims();
  const clampedMs = Math.min(100, frameMs);
  updateFloatingTexts(clampedMs);
  updateCoinPickups(clampedMs);
  updateGoldHudFlights(clampedMs);
  updateHeartHudFlights(clampedMs);
  for(let n=ambientLogs.length-1;n>=0;n--){const log=ambientLogs[n],key=Math.floor(log.x/TILE_SIZE)+','+Math.floor(log.y/TILE_SIZE);if(pathCells.has(key)||nearPathTileSet.has(key)||bonusGrassTiles.has(key)){wood+=log.count*AMBIENT_LOG_WOOD/AMBIENT_LOG_STACK_SIZE;ambientLogs.splice(n,1);updateHUD();}}
  ambientLogElapsedMs += clampedMs;
  if(ambientLogElapsedMs >= AMBIENT_LOG_INTERVAL_MS){ ambientLogElapsedMs %= AMBIENT_LOG_INTERVAL_MS; maybeSpawnAmbientLog(); }
  updateBarks(clampedMs);
  for(const animal of enemyPool) if(animal.active && animal.isLivestock) animal.updateLivestockWander(clampedMs);
}
// Only combat during an actual wave fast-forwards. Between waves everything runs at 1x.
function effectiveGameSpeed(){ return waveState === 'IDLE' ? 1 : gameSpeed; }
// PAN-DIAG-01 (1.7.121, widened 1.7.123): whenever the camera moves, whether from a drag, inertia, the pan to a selected stickman or the wave-start pan, the real gap between frames and the distance the camera moved each frame are kept for the last 120 moving frames and stay after the motion ends. A steady stutter with a healthy FPS shows up here as a large worst gap or a high step jitter, which says whether the cause is frame pacing or uneven camera steps. The display rate and frame cap sit beside it because a cap that is not a clean divisor of the refresh rate paces frames unevenly.
const PAN_SUBPIXEL_MAX_STEP_PX = 8;
const PAN_DIAG_FRAMES = 120, PAN_DIAG_IDLE_FRAMES_TO_RESET = 6;
const panDiagnostic = { gaps: [], steps: [], idleFrames: PAN_DIAG_IDLE_FRAMES_TO_RESET };
function recordPanDiagnostic(frameGapMs, cameraStepPx, cameraMoving){
  if(!cameraMoving){ panDiagnostic.idleFrames++; return; }
  if(panDiagnostic.idleFrames >= PAN_DIAG_IDLE_FRAMES_TO_RESET){ panDiagnostic.gaps.length = 0; panDiagnostic.steps.length = 0; }
  panDiagnostic.idleFrames = 0;
  panDiagnostic.gaps.push(frameGapMs); panDiagnostic.steps.push(cameraStepPx);
  if(panDiagnostic.gaps.length > PAN_DIAG_FRAMES){ panDiagnostic.gaps.shift(); panDiagnostic.steps.shift(); }
}
function panDiagnosticCells(){
  const frameCount = panDiagnostic.gaps.length;
  if(frameCount < 8) return ['pan: move the camera', '', ''];
  const meanStep = panDiagnostic.steps.reduce((sum, step) => sum + step, 0) / frameCount;
  const stepSpread = Math.sqrt(panDiagnostic.steps.reduce((sum, step) => sum + (step - meanStep) * (step - meanStep), 0) / frameCount);
  return [
    'pan gap ' + perfPercentile(panDiagnostic.gaps, 0.5).toFixed(1) + '/' + perfPercentile(panDiagnostic.gaps, 0.95).toFixed(1) + '/' + perfPercentile(panDiagnostic.gaps, 1).toFixed(1) + 'ms',
    'step ' + meanStep.toFixed(1) + 'px',
    'jitter ' + (meanStep > 0.05 ? Math.round(stepSpread / meanStep * 100) : 0) + '%'
  ];
}
function displayPacingCells(){
  return [
    'display ' + (vsyncIntervalMs > 0 ? (1000 / vsyncIntervalMs).toFixed(0) + ' Hz' : '?'),
    'cap ' + (frameCapIntervalMs() > 0 ? frameCapIntervalMs().toFixed(1) + 'ms' : 'off'),
    'uncapped frames ' + cameraMotionFullRateFrames
  ];
}
function loop(now){
  requestAnimationFrame(loop);
  // MOBILE-FPS-CAP-01 (1.6.48) — see HISTORY.md § [1.6.48]. Skip the entire frame (simulation,
  // render, and all perf bookkeeping) on mobile until the target interval has actually elapsed —
  // deliberately BEFORE any work happens, not just skipping the draw call, so this genuinely cuts
  // CPU/GPU work rather than only hiding it. Safe to skip whole frames here because the
  // fixed-timestep accumulator below measures real elapsed time via `lastTime`, not callback
  // count — the next processed frame simply has a larger `frameTime` and the catch-up logic
  // (bounded by the speed-scaled cap calculated inside loop()) handles it.
  sampleVsyncGap(now);
  const frameCapMs = vsyncSnappedCapMs(frameCapIntervalMs());
  if(frameCapMs > 0 && !IS_MOBILE_DEVICE && isCameraMotionActive(now)){
    cameraMotionFullRateFrames++;
    frameCapNextAt = now + frameCapMs; // the limit resumes cleanly after the camera stops, without a burst
  } else if(frameCapMs > 0 && !repaintPending){
    if(now < frameCapNextAt - frameCapEarlyToleranceMs()) return;
    frameCapNextAt = (now - frameCapNextAt > frameCapMs) ? now + frameCapMs : frameCapNextAt + frameCapMs; // keeps the average rate exact without a burst after a slow frame
  }
  if(gameState === 'START'){ audioEngine.setMusicPhase('attract'); renderAttractMode(ctx, now); return; }
  if(gameState !== 'PLAYING'){
    lastTime = now;
    if(repaintPending){ repaintPending = false; render(ctx); }
    return;
  }
  repaintPending = false;
  const frameStart = performance.now();
  let frameTime = Math.max(0, now - lastTime); // CLOCK-NEGATIVE-01 (1.6.117) — see HISTORY.md § [1.6.117]
  // CA719 — see HISTORY.md § [1.5.7] Code Archaeology, CA719
  const rawWallGapMs = frameTime;
  sampleRenderGovernor(rawWallGapMs);
  const maxFrameTimeMs = gameSpeed > 1 ? FAST_FORWARD_MAX_FRAME_TIME_MS : NORMAL_MAX_FRAME_TIME_MS;
  perfStats.lastFrameTimeClampMs = maxFrameTimeMs;
  if(frameTime > maxFrameTimeMs){
    perfStats.wallTimeClampHits++;
    perfStats.wallTimeClampedMs += frameTime - maxFrameTimeMs;
    frameTime = maxFrameTimeMs;
  }
  lastTime = now;
  realTimeFrozen = waveState === 'IDLE';
  if(!realTimeFrozen) realTime += frameTime;
  presentationTime += frameTime;
  const cameraFrameMs = Math.min(frameTime, CAMERA_CLOCK_MAX_STEP_MS);
  cameraPanClock += cameraFrameMs;
  const cameraAtFrameStartX = camera.x, cameraAtFrameStartY = camera.y, cameraAtFrameStartZoom = camera.zoom;
  applyPanInertia(cameraFrameMs);
  // CA720 — see HISTORY.md § [1.5.7] Code Archaeology, CA720
  if(waveState === 'SPAWNING' && waveTimer < WAVE_COUNTDOWN_MS + WAVE_COUNTDOWN_GO_HOLD_MS && !anyBarricadeQueued && !waveStartCameraPan){
    waveTimer += frameTime;
    const countdownBeat = Math.min(3, Math.floor(waveTimer / 1000)); // COUNTDOWN-BUZZER-01 (1.7.36): a buzzer on 3, 2, 1 and a higher one on GO
    if(countdownBeat > countdownBeatPlayed){ countdownBeatPlayed = countdownBeat; playSound(countdownBeat < 3 ? 'countdown_tick' : 'countdown_go', undefined, countdownBeat); }
    advanceCountdownMusic();
  }
  updatePresentationEffects(frameTime);
  const simulationSpeed = effectiveGameSpeed();
  accumulator += frameTime * simulationSpeed;
  let ticksThisFrame = 0;
  // The bounded catch-up cap scales with the accepted frame gap and requested speed.
  const tickCapThisFrame = Math.min(MAX_SIMULATION_TICK_CAP,
    Math.max(MAX_SIMULATION_TICKS_PER_FRAME, Math.ceil(maxFrameTimeMs * simulationSpeed / FIXED_DT)));
  perfStats.lastSimulationTickCap = tickCapThisFrame;

  resetPhaseTime(); // per-phase breakdown accumulates across every tick this frame — see phaseTime/resetPhaseTime and the phaseTime.x += lines inside update()
  resetRenderPhaseTime(); // same pattern, for the render() breakdown below — see renderPhaseTime/resetRenderPhaseTime
  spatialQueryCallsThisFrame = 0; hashBuildsThisFrame = 0; // same: accumulate across every tick this frame, snapshotted into perfStats below
  const updateStart = performance.now();
  let droppedSimulationTimeThisFrame = 0;
  const cameraInputBudget = simulationSpeed >= 5 && performance.now()-lastCameraInteractionAt < CAMERA_MOTION_FULL_RATE_MS;
  let cameraBudgetReached=false;
  while(accumulator + 1e-9 >= FIXED_DT && ticksThisFrame < tickCapThisFrame && gameState === 'PLAYING'){
    update(FIXED_DT);
    accumulator = Math.max(0, accumulator - FIXED_DT);
    ticksThisFrame++;
    if(cameraInputBudget && ticksThisFrame % 2 === 0 && performance.now()-updateStart >= 6){ cameraBudgetReached=true; break; }
  }
  // CA721 — see HISTORY.md § [1.5.7] Code Archaeology, CA721
  if((ticksThisFrame >= tickCapThisFrame || cameraBudgetReached) && accumulator >= FIXED_DT){
    perfStats.simulationCatchUpCapHits++;
    droppedSimulationTimeThisFrame = Math.max(0, accumulator);
    perfStats.simulationDebtDroppedMs += droppedSimulationTimeThisFrame;
    if(cameraBudgetReached && ticksThisFrame < tickCapThisFrame){ perfStats.cameraBudgetCapHits++; perfStats.cameraBudgetDroppedMs += droppedSimulationTimeThisFrame; } // CATCHUP-REASON-01 (1.8.41): the camera's 6 ms budget is counted apart from the tick cap
    accumulator = 0;
  }
  perfStats.updateMs = performance.now() - updateStart;
  flushHUDIfDirty(); // coalesced to once per rendered frame regardless of how many updateHUD() calls happened across this frame's simulation ticks — see the comment above updateHUD() itself
  const renderStart = performance.now();
  // SMOOTH-ANIM-01 (1.7.75): the simulation advances in fixed 16.7 ms ticks, so on a display that is not locked to 60 Hz, or after any slow frame, a rendered frame holds 0, 1 or 2 ticks
  // and every animation timed by gameTime (swings, casts, axe flights, breathing) moves in uneven jumps even at 60 FPS. Drawing now happens at gameTime plus the unspent part of the
  // tick, so those animations advance a little every displayed frame; enemies were already blended this way and projectiles are now too (drawProjectileSmoothed).
  const smoothedAheadMs = renderLeftoverMs();
  gameTime += smoothedAheadMs;
  try { render(ctx); } finally { gameTime -= smoothedAheadMs; }
  perfStats.renderMs = performance.now() - renderStart;
  perfStats.cameraMoveXLastFrame = camera.x - cameraAtFrameStartX;
  perfStats.cameraMoveYLastFrame = camera.y - cameraAtFrameStartY;
  perfStats.cameraMovePixelsLastFrame = Math.hypot(perfStats.cameraMoveXLastFrame, perfStats.cameraMoveYLastFrame);
  perfStats.cameraZoomDeltaLastFrame = Math.abs(camera.zoom - cameraAtFrameStartZoom);
  perfStats.cameraMovingLastFrame = perfStats.cameraMovePixelsLastFrame >= 0.25 || perfStats.cameraZoomDeltaLastFrame >= 0.0005;
  perfStats.cameraSubpixelMotion = (perfStats.cameraMovePixelsLastFrame > 0 || perfStats.cameraZoomDeltaLastFrame > 0) && perfStats.cameraMovePixelsLastFrame < PAN_SUBPIXEL_MAX_STEP_PX;
  recordPanDiagnostic(rawWallGapMs, perfStats.cameraMovePixelsLastFrame, perfStats.cameraMovingLastFrame);
  perfStats.frameMs = performance.now() - frameStart;
  perfStats.ticksThisFrame = ticksThisFrame;
  // SPEED-ACHIEVED-01 (1.7.51): requested speed against the speed actually simulated over the last second (simulated game time divided by wall time), and the cost of one tick,
  // so a slow fast-forward can be told apart from an expensive tick.
  speedWindow.simMs += ticksThisFrame*FIXED_DT; speedWindow.wallMs += rawWallGapMs;
  if(speedWindow.wallMs >= 1000){ perfStats.achievedSpeed = speedWindow.simMs/speedWindow.wallMs; speedWindow.simMs = 0; speedWindow.wallMs = 0; }
  perfStats.requestedSpeed = simulationSpeed; perfStats.msPerTick = ticksThisFrame ? perfStats.updateMs/ticksThisFrame : 0;
  if(ticksThisFrame > perfStats.maxTicksSeen) perfStats.maxTicksSeen = ticksThisFrame;
  recordExtendedDiagnostics(rawWallGapMs);
  recordDiagFrame();
  recordPerfSample(perfStats.frameMsHistory, perfStats.frameMs);
  // CA722 — see HISTORY.md § [1.5.7] Code Archaeology, CA722
  const instFps = rawWallGapMs > 0 ? 1000/rawWallGapMs : 60;
  perfStats.smoothedFps = perfStats.smoothedFps ? perfStats.smoothedFps*0.9 + instFps*0.1 : instFps;
  recordPerfSample(perfStats.updateMsHistory, perfStats.updateMs);
  recordPerfSample(perfStats.renderMsHistory, perfStats.renderMs);
  recordPerfSample(perfStats.ticksThisFrameHistory, ticksThisFrame);
  recordPerfSample(perfStats.wallGapMsHistory, rawWallGapMs);
  if(rawWallGapMs > perfStats.worstWallGapMs){
    perfStats.worstWallGapMs = rawWallGapMs;
    perfStats.worstWallGapAtWave = waveIndex;
    perfStats.worstWallGapAtReal = Date.now(); // see sessionStartRealTime's own comment — debug-log use only
  }
  // CA723 — see HISTORY.md § [1.5.7] Code Archaeology, CA723
  if(perfStats.frameMs > perfStats.worstFrameMs){
    perfStats.worstFrameMs = perfStats.frameMs;
    perfStats.worstFrameAtWave = waveIndex;
    perfStats.worstFrameTicks = ticksThisFrame;
    perfStats.worstFrameAtReal = Date.now();
  }
  // Per-phase max-seen, same pattern as maxTicksSeen above but per subsystem.
  for(const k in phaseTime) if(phaseTime[k] > phaseMaxSeen[k]) phaseMaxSeen[k] = phaseTime[k];
  for(const k in renderPhaseTime) if(renderPhaseTime[k] > renderPhaseMaxSeen[k]) renderPhaseMaxSeen[k] = renderPhaseTime[k];
  perfStats.spatialQueryCallsLastFrame = spatialQueryCallsThisFrame;
  perfStats.hashBuildsLastFrame = hashBuildsThisFrame;
  perfStats.enemyHashBucketPoolSize = enemyHashBucketPool.size;
  // CA724 — see HISTORY.md § [1.5.7] Code Archaeology, CA724
  if(performance.memory){
    perfStats.memorySupported = true;
    if(now - perfStats.lastMemorySampleAt >= 1000){
      perfStats.lastMemorySampleAt = now;
      perfStats.usedHeapMB = performance.memory.usedJSHeapSize / 1048576;
      perfStats.totalHeapMB = performance.memory.totalJSHeapSize / 1048576;
      perfStats.heapLimitMB = performance.memory.jsHeapSizeLimit / 1048576;
      recordPerfSample(perfStats.heapHistory, perfStats.usedHeapMB);
    }
  }
  perfStats.lastAccumulatorDebtMs = accumulator; // leftover simulation time this frame couldn't catch up on, carried into the next one
  perfStats.lastDroppedSimulationTimeMs = droppedSimulationTimeThisFrame;
  // CA725 — see HISTORY.md § [1.5.7] Code Archaeology, CA725
  perfStats.actualSpeedWindowRealMs += Math.max(0, rawWallGapMs);
  // Count completed simulation time against the raw callback gap; clamped frame time would
  // overstate achieved speed whenever the elapsed-time safety ceiling discards wall time.
  perfStats.actualSpeedWindowSimulationMs += ticksThisFrame * FIXED_DT;
  if(perfStats.actualSpeedWindowRealMs >= 1000){
    perfStats.lastMeasuredActualSpeed = perfStats.actualSpeedWindowRealMs > 0
      ? perfStats.actualSpeedWindowSimulationMs / perfStats.actualSpeedWindowRealMs : 0;
    perfStats.actualSpeedWindowRealMs = 0; perfStats.actualSpeedWindowSimulationMs = 0;
  }
  recordPerfEventSample(perfStats.slowFrameEvents, perfStats.frameMs, 16.7, rawWallGapMs);
  recordPerfEventSample(perfStats.longCallbackGapEvents, rawWallGapMs, 33.3, rawWallGapMs);
  recordSimulationCapEvent(rawWallGapMs, droppedSimulationTimeThisFrame);
  recordPerfTrendFrame(now, rawWallGapMs);
}
/* =========================================================
   GEOMETRY HELPERS
   ========================================================= */
// CA455 — see HISTORY.md § [1.5.7] Code Archaeology, CA455
function pointSegmentDist2(px,py, ax,ay, bx,by){
  const abx=bx-ax, aby=by-ay;
  const apx=px-ax, apy=py-ay;
  const abLen2 = abx*abx+aby*aby;
  let t = abLen2 > 0 ? (apx*abx+apy*aby)/abLen2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax+abx*t, cy = ay+aby*t;
  const dx = px-cx, dy = py-cy;
  return dx*dx+dy*dy;
}
/* =========================================================
   PARTICLE POOL
   ========================================================= */
/* Lightweight pooled particles & floating text (rolling-index reuse, no allocation in loop) */
const particles = Array.from({length: PARTICLE_COUNT}, () => ({active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:0,color:'#fff',size:2,friction:0.93,pooled:false}));
let particleIndex = 0;
