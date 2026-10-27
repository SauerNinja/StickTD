"use strict";
// Map and path, expansion, livestock, scenery, flora, food, campfire, chance structures, telemetry, depth sorting and map painting.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   SCENERY CONFIG (CONFIG.SCENERY)
//   MAP / PATH
//   EXPANSION, ROUTE GROWTH AND RING REVEAL
//   GROUND ITEM DRIFT AND SHOVEL
//   LIVESTOCK, RANDOM EVENTS, BEES, TROLLS AND CIRCUS
//   SCENERY: ROCKS, TREES AND FLORA
//   ROUTE LENGTH AND BARRICADE PILE-UP
//   SCENERY PLACEMENT AND ROAD-END GUARD
//   FOOD, ITEM USE FEEDBACK AND STAT GAINS
//   TREATS, STIMS, MEALS AND THE CONSUMABLE REGISTRY
//   CAMPFIRE AND COOKING
//   CHANCE STRUCTURES
//   BIOMES AND SCENERY DRAWING
//   LOOSE ENEMIES
//   TELEMETRY AND ANALYTICS
//   DEPTH SORT AND ACTOR DRAWING
//   GROUND AND PATH PAINTING
//   SPAWN AND FINISH FLAGS
//   MAP BAKE AND BUILD PREVIEW
//   ACTIVE BARRICADES
/* =========================================================
   SCENERY CONFIG (CONFIG.SCENERY)
   ========================================================= */
CONFIG.SCENERY = {
  coverage: 0.22,          // fraction of buildable (non-path) tiles scattered with scenery at game start
  minScale: 0.6, maxScale: 1.6,
  minClearCost: 25, maxClearCost: 250, // gold cost interpolated across the scale range
  rockClearCostMult: 1.6,
  minClearMs: 15000, maxClearMs: 40000, // GAME-SPEED-SCOPE-01
  baseResourceYield: 10,   // wood/stone granted at scale 1.0, scales up with size
  superChance: 0.0001,     // 0.01% per scenery spawn
  superYieldMultiplier: 8,
  superClearMs: 80000, // GAME-SPEED-SCOPE-01: 10x, matching the regular clear-time increase
  superBonusGold: 50,
  respawnChancePerWave: 0.4, // chance, each wave cleared, that 1-2 new scenery pieces appear on empty tiles
};
CONFIG.FLORA = {
  coverage: 0, // PURPOSEFUL-PROPS-01: no non-interactable decorative emoji ground cover
  accentShare: 0.12,
  COMMON: ['🌿','🍀','🍂'],
  ACCENT: ['🍁','🍄','🌺','🌻']
};
// CHANCE-STRUCTURES-01
CONFIG.CHANCE_STRUCTURES = {
  FOUNTAIN: {
    emoji: '⛲', name: 'Healing Fountain', color: '#7dd3fc', scale: 1.05, useMs: 600,
    healLives: 10, minWavesCompleted: 2, maxOnBoard: 1,
    baseChance: 0.18, hurtShare: 0.7, hurtBonusChance: 0.12, desperateShare: 0.4, desperateBonusChance: 0.12,
    pityPerWave: 0.05, maxChance: 0.6
  },
  CAMPFIRE: {
    emoji: '🔥', name: 'Campfire', color: '#ffb74d', scale: 1.0, useMs: 400,
    healLives: 0, minWavesCompleted: 3, maxOnBoard: 1,
    baseChance: 0.14, hurtShare: 0, hurtBonusChance: 0, desperateShare: 0, desperateBonusChance: 0,
    pityPerWave: 0.04, maxChance: 0.5
  }
};
/* =========================================================
   MAP / PATH
   ========================================================= */
let activeRegion = null;      // {x0,y0,x1,y1} inclusive tile bounds of the currently unlocked square
let paidExpansionWaveIndex = -1; // EXPAND-PER-WAVE-01: the wave number at the last bought expansion; one bought expansion per wave
let paidExpansions = 0; // EXPANSION-PRICE-01
let expansionLevel = 0;       // number of FULLY-completed rings so far (a ring mid-spiral-reveal doesn't count yet — see ringRevealQueue)
let pathWaypointTiles = [];   // ordered [{x,y}] grid coords the path follows
let pathCells = new Set();    // Set of "gx,gy" strings for quick lookup
let waypointsPx = [];         // pixel-space version of pathWaypointTiles, what Enemy movement reads
let ringRevealed = new Set();       // "gx,gy" tiles of the in-progress ring already revealed
let ringRevealQueue = [];           // remaining {x,y} tiles of the in-progress ring, in perimeter order
let ringCandidateRegion = null;     // the full next-ring rectangle ringRevealQueue is walking the boundary of
// PATHING-MASTER-01: Drives the spiral reveal by real elapsed
// time (see driveRingReveal() in update()) instead of only at wave-trigger/wave-complete moments.
let ringRevealTimer = 0;
let ringRevealTotalTiles = 0; // size of the CURRENT ring's queue at the moment it began — see driveRingReveal()
const RING_REVEAL_INTERVAL_MS = 60;   // tick cadence for the reveal animation — how often another chunk unveils
const RING_REVEAL_TARGET_MS = 1900;   // target total time to fully reveal a ring, whatever its size
/* =========================================================
   EXPANSION, ROUTE GROWTH AND RING REVEAL
   ========================================================= */
function expansionCost(){
  return Math.round(80 * Math.pow(1.6, paidExpansions));
}
function regionFullyExpanded(){
  return activeRegion.x0 <= 0 && activeRegion.y0 <= 0 && activeRegion.x1 >= COLS-1 && activeRegion.y1 >= ROWS-1;
}
// MAP-CORRIDOR-01: a tile is buildable only inside the active region AND within PATH_BUILDABLE_MARGIN of the path (nearPathTileSet),
// so the grass forms a corridor that frames the road rather than filling the whole region rectangle.
const PATH_BUILDABLE_MARGIN = 1; // PATH-BORDER-01
let nearPathTileSet = new Set();
// GRASS-NEVER-SHRINKS-01: the road is always surrounded by grass and the green area only ever grows. dirtTileKeys stays empty so saves
// that still carry a dirt list load; such a list is ignored.
const dirtTileKeys = new Set();
function rebuildNearPathTileSet(){
  const next = new Set();
  for(const tile of pathWaypointTiles){
    for(let dx = -PATH_BUILDABLE_MARGIN; dx <= PATH_BUILDABLE_MARGIN; dx++){
      for(let dy = -PATH_BUILDABLE_MARGIN; dy <= PATH_BUILDABLE_MARGIN; dy++){
        const neighborX = tile.x + dx, neighborY = tile.y + dy;
        if(neighborX < 0 || neighborX >= COLS || neighborY < 0 || neighborY >= ROWS) continue;
        next.add(neighborX + ',' + neighborY); // square/Chebyshev neighborhood includes diagonal forest tiles
      }
    }
  }
  for(const key of pathCells) next.delete(key); // never paint/build on route tiles themselves
  for(const key of dirtTileKeys) next.delete(key);
  nearPathTileSet = next;
}
function rebuildPathCellsAndPx(){
  pathCells = new Set(pathWaypointTiles.map(p => p.x+','+p.y));
  waypointsPx = pathWaypointTiles.map(p => ({
    x: p.x*TILE_SIZE + TILE_SIZE/2, y: p.y*TILE_SIZE + TILE_SIZE/2
  }));
  invalidateSpawnFlags();
  rebuildNearPathTileSet(); // MAP-CORRIDOR-01
}
// ROUTE-SPACING-01: two route tiles that touch (diagonals included) must be at least ROUTE_SPACING_MIN_STEP_GAP steps apart along the route.
const ROUTE_SPACING_MIN_STEP_GAP = 3;
let routeSpacingRelaxedExpansions = 0;
function routeSpacingViolationCount(tiles){
  const indexByKey = new Map();
  for(let i=0; i<tiles.length; i++) indexByKey.set(tiles[i].x+','+tiles[i].y, i);
  let violations = 0;
  for(let i=0; i<tiles.length; i++){
    for(let dx=-1; dx<=1; dx++){
      for(let dy=-1; dy<=1; dy++){
        if(!dx && !dy) continue;
        const otherIndex = indexByKey.get((tiles[i].x+dx)+','+(tiles[i].y+dy));
        if(otherIndex !== undefined && otherIndex - i >= ROUTE_SPACING_MIN_STEP_GAP) violations++;
      }
    }
  }
  return violations;
}
function pathTipExit(point, occupied){
  let best = null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const exit=[];
    let x=point.x+dx,y=point.y+dy;
    while(x>=0 && x<COLS && y>=0 && y<ROWS && !occupied.has(x+','+y)){
      exit.push({x,y}); x+=dx; y+=dy;
    }
    if(exit.length && (x<0 || x>=COLS || y<0 || y>=ROWS) && (!best || exit.length<best.length)) best=exit;
  }
  if(best) return best;
  const queue=[point], parents=new Map([[point.x+','+point.y,null]]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const tile={x:current.x+dx,y:current.y+dy}, key=tile.x+','+tile.y;
      if(tile.x<0 || tile.x>=COLS || tile.y<0 || tile.y>=ROWS || occupied.has(key) || parents.has(key)) continue;
      parents.set(key,current); queue.push(tile);
      let tail=null;
      for(const [rx,ry] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const ray=[]; let x=tile.x+rx,y=tile.y+ry;
        while(x>=0 && x<COLS && y>=0 && y<ROWS && !occupied.has(x+','+y) && !parents.has(x+','+y)){
          ray.push({x,y});x+=rx;y+=ry;
        }
        if(x<0 || x>=COLS || y<0 || y>=ROWS){tail=ray;break;}
      }
      if(tail){
        const exit=[]; let cursor=tile;
        while(cursor!==point){exit.push(cursor); cursor=parents.get(cursor.x+','+cursor.y);}
        return exit.reverse().concat(tail);
      }
    }
  }
  return null;
}
let pathExitReservationPath=null, pathExitReservationTowers='', pathExitReservedKeys=new Set();
function reservedPathExitTile(gx,gy){
  if(!pathWaypointTiles.length) return false;
  const towers=towerPool.filter(tower=>tower.active);
  const towerKey=towers.map(tower=>tower.gridX+','+tower.gridY).join(';');
  if(pathExitReservationPath!==pathWaypointTiles || pathExitReservationTowers!==towerKey){
    const occupied=new Set(pathCells);
    for(const tower of towers) occupied.add(tower.gridX+','+tower.gridY);
    const reserved=new Set();
    for(const tip of [pathWaypointTiles[0],pathWaypointTiles[pathWaypointTiles.length-1]]){
      const exit=pathTipExit(tip,occupied);
      if(exit) for(const tile of exit) reserved.add(tile.x+','+tile.y);
    }
    pathExitReservationPath=pathWaypointTiles; pathExitReservationTowers=towerKey; pathExitReservedKeys=reserved;
  }
  return pathExitReservedKeys.has(gx+','+gy);
}
// PATH-WINDY-01: most expansions prefer turning (spacing and exit-room rules still decide what is possible), so the road keeps winding.
let pathTurnFirstChance = 0.85;
// ROAD-VARIETY-01: roads should have vast possibilities, mostly normal but sometimes wild. Each expansion draws a growth style:
// TURN (the normal winding), ZIGZAG, STRAIGHT, HOOK (keep curling the same way, making loops and coils) or DRIFT (random).
// Whatever the style, the spacing and exit rules still decide what is possible, so a road can be wild but never cuts itself off.
const ROAD_GROWTH_STYLE_WEIGHTS = [['TURN', 0.47], ['ZIGZAG', 0.17], ['STRAIGHT', 0.12], ['HOOK', 0.14], ['DRIFT', 0.10]];
const ROAD_WILD_STYLES = new Set(['HOOK', 'DRIFT']), ROAD_WILD_CHANCE = 0.12;
// ROAD-CHARACTER-01: every run draws one road character from its seed, so one run winds, another coils, another runs long, another wanders.
const ROAD_CHARACTERS = [
  { name: 'MEANDER', chance: 0.40, weights: [['TURN', 0.52], ['ZIGZAG', 0.05], ['STRAIGHT', 0.15], ['HOOK', 0.18], ['DRIFT', 0.10]] },
  { name: 'COILING', chance: 0.25, weights: [['TURN', 0.20], ['ZIGZAG', 0.03], ['STRAIGHT', 0.07], ['HOOK', 0.60], ['DRIFT', 0.10]] },
  { name: 'LONG', chance: 0.20, weights: [['TURN', 0.28], ['ZIGZAG', 0.04], ['STRAIGHT', 0.50], ['HOOK', 0.08], ['DRIFT', 0.10]] },
  { name: 'WANDERING', chance: 0.15, weights: [['TURN', 0.25], ['ZIGZAG', 0.05], ['STRAIGHT', 0.10], ['HOOK', 0.20], ['DRIFT', 0.40]] }
];
function roadCharacterForRun(){
  let roll = createSeededRandom(waveSeedFor(waveRunSeed ^ 0x3c6ef372, 17))();
  for(const character of ROAD_CHARACTERS){ if(roll < character.chance) return character; roll -= character.chance; }
  return ROAD_CHARACTERS[0];
}
function roadCurlDirection(){ return createSeededRandom(waveSeedFor(waveRunSeed ^ 0x510e527f, 23))() < 0.5 ? -1 : 1; }
function pickRoadGrowthStyle(rng = Math.random, weights = ROAD_GROWTH_STYLE_WEIGHTS){
  let roll = rng();
  for(const [style, weight] of weights){ if(roll < weight) return style; roll -= weight; }
  return 'TURN';
}
function roadOpenness(tile, occupied, region){
  let free = 0;
  for(let dx = -2; dx <= 2; dx++) for(let dy = -2; dy <= 2; dy++){
    const x = tile.x + dx, y = tile.y + dy;
    if(x < 0 || x >= COLS || y < 0 || y >= ROWS || occupied.has(x+','+y)) continue;
    free++;
  }
  return free / 25;
}
function orderRoadDirections(chain, occupied, region, style, wild, rng = Math.random){
  const tip = chain[chain.length-1], previous = chain[chain.length-2], beforePrevious = chain[chain.length-3];
  const straight = previous ? [tip.x - previous.x, tip.y - previous.y] : null;
  const lastTurn = (previous && beforePrevious) ? ((previous.x - beforePrevious.x)*(tip.y - previous.y) - (previous.y - beforePrevious.y)*(tip.x - previous.x)) : 0;
  const scored = [[1,0],[-1,0],[0,1],[0,-1]].map(dir => {
    const tile = { x: tip.x + dir[0], y: tip.y + dir[1] };
    let stylePull = 0;
    if(straight){
      const isStraight = dir[0] === straight[0] && dir[1] === straight[1];
      const turn = straight[0]*dir[1] - straight[1]*dir[0];
      if(style === 'STRAIGHT') stylePull = isStraight ? 1 : 0;
      else if(style === 'TURN') stylePull = (isStraight ? lastTurn !== 0 : lastTurn === 0) ? 1 : 0;
      else if(style === 'HOOK') stylePull = lastTurn !== 0 ? (isStraight ? 1.2 : 0) : (turn && Math.sign(turn) === roadCurlDirection() ? 1.2 : 0);
      else if(style === 'ZIGZAG') stylePull = turn && (!lastTurn || Math.sign(turn) !== Math.sign(lastTurn)) ? 1.2 : 0;
    }
    // ROAD-PATTERN-PREFERENCE-01
    const openWeight = wild ? 0.4 : 2.2, styleWeight = style === 'DRIFT' ? 0.2 : 3.5, randomWeight = wild ? 1.8 : 0.7;
    return { dir, score: roadOpenness(tile, occupied, region)*openWeight + stylePull*styleWeight + rng()*randomWeight };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(entry => entry.dir);
}
// Towers that sit where the road now runs are moved to the nearest free buildable tile (an expansion can happen mid-wave; the road only grows, so live enemies keep their place).
function activeTowerTileKeys(){
  const keys = [];
  for(const tower of towerPool) if(tower.active && tower.type !== 'BARRICADE') keys.push(tower.gridX + ',' + tower.gridY);
  return keys;
}
function relocateTowersOffRoute(){
  for(const tower of towerPool){
    if(!tower.active || tower.type === 'BARRICADE') continue;
    const here = tower.gridX+','+tower.gridY;
    if(!pathCells.has(here) && (isInActiveRegion(tower.gridX, tower.gridY) || pendingRevealTileKeys.has(here) || nearPathTileSet.has(here))) continue;
    let best = null;
    // first choice: the nearest free buildable tile; second choice: the nearest grass tile, clearing its tree, rock or bush for the stickman
    for(const clearScenery of [false, true]){
      for(let radius = 1; radius <= 40 && !best; radius++){
        for(let dx = -radius; dx <= radius && !best; dx++) for(let dy = -radius; dy <= radius; dy++){
          if(Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const gx = tower.gridX + dx, gy = tower.gridY + dy, key = gx+','+gy;
          if(!clearScenery){ if(isTileBuildable(gx, gy, tower, tower.type)){ best = { gx, gy }; break; } }
          else if(nearPathTileSet.has(key) && !pathCells.has(key) && !pendingRevealTileKeys.has(key) && !reservedPathExitTile(gx, gy) && !towerPool.some(t => t.active && t !== tower && t.gridX === gx && t.gridY === gy)){
            const item = sceneryMap.get(key);
            if(!item || item.type === 'TREE' || item.type === 'ROCK' || item.type === 'BUSH'){ if(item) sceneryMap.delete(key); best = { gx, gy }; break; }
          }
        }
      }
      if(best) break;
    }
    if(!best) continue;
    tower.walkTo(best.gx, best.gy);
    spawnFloatingText(tower.x, tower.y - 20, 'Moved onto the grass', '#ffe082');
    logGameEvent(itemHolderLabel(tower) + ' moved onto the grass at tile ' + best.gx + ',' + best.gy + ' because the road grew');
  }
}
function extendPathWithNewRing(oldPath, newRegion, arcLength){
  // ROAD-FREEDOM-01: towers never block road growth, because they can move; any tower the road grows over is relocated after the growth is committed.
  const occupied = new Set(oldPath.map(p => p.x+','+p.y));
  const towerTileKeys = activeTowerTileKeys().filter(key => !occupied.has(key));
  const growthRng = createSeededRandom(waveSeedFor(waveRunSeed ^ 0x6a09e667,oldPath.length)); // ROAD-SEEDED-PLAN-01: future styles/ties derive from the run's saved seed.
  const growthStyle = pickRoadGrowthStyle(growthRng, roadCharacterForRun().weights);
  const wildGrowth = ROAD_WILD_STYLES.has(growthStyle) || growthRng() < ROAD_WILD_CHANCE;
  const perEndGrowth = clampNum(arcLength || 2, 1, PATH_GROWTH_TILES_MAX); // EXPAND-BOTH-ENDS-01: both ends grow by the same 1 to 3 tiles
  const existingSpacingViolations=routeSpacingViolationCount(oldPath);
  let spacingAllowance = 0; // ROAD-ESCAPE-01: only raised when a strict growth is impossible
  function grow(point, length){
    const addition = [];
    if(length <= 0) return addition;
    const behind = point === oldPath[0] ? [oldPath[2], oldPath[1], oldPath[0]] : [oldPath[oldPath.length-3], oldPath[oldPath.length-2], oldPath[oldPath.length-1]];
    const chainBase = behind.filter(Boolean);
    function walk(tip){
      if(addition.length === length) return !!pathTipExit(tip,occupied);
      const chain = chainBase.concat(addition);
      const directions = orderRoadDirections(chain, occupied, newRegion, growthStyle, wildGrowth, growthRng);
      for(const [dx,dy] of directions){
        const tile = {x:tip.x+dx,y:tip.y+dy}, key=tile.x+','+tile.y;
        if(tile.x<newRegion.x0 || tile.x>newRegion.x1 || tile.y<newRegion.y0 || tile.y>newRegion.y1 || occupied.has(key)) continue;
        occupied.add(key); addition.push(tile);
        const candidate=point===oldPath[0] ? [...addition.slice().reverse(),...oldPath] : [...start.slice().reverse(),...oldPath,...addition];
        if(routeSpacingViolationCount(candidate)>existingSpacingViolations+spacingAllowance){addition.pop();occupied.delete(key);continue;}
        const otherTip = point === oldPath[0] ? oldPath[oldPath.length-1] : (start.length ? start[start.length-1] : oldPath[0]);
        if(pathTipExit(otherTip,occupied) && walk(tile)) return true;
        addition.pop(); occupied.delete(key);
      }
      return false;
    }
    walk(point);
    return addition;
  }
  const last = oldPath[oldPath.length-1];
  // ROAD-ESCAPE-01: the road can cut itself off from expansion.
  let start = [], finish = [];
  // EXPAND-BOTH-ENDS-01: every expansion grows the spawn end and the finish end by the SAME number of tiles, 1 to 3 each.
  const plans = [];
  for(const spacingAllowanceStage of [0, 2, 5, 12]){
    for(let equalGrowth = perEndGrowth; equalGrowth >= 1; equalGrowth--) plans.push([equalGrowth, equalGrowth, spacingAllowanceStage, equalGrowth === perEndGrowth ? 8 : 4]);
  }
  plans.push([1, 0, 30, 6], [0, 1, 30, 6]);
  // TOWERS-STAY-PUT-01: growth first avoids every tile a stickman stands on, so an expansion normally never touches a fighter; only if no growth is possible that way
  // are fighters treated as movable (and then moved to the nearest grass by relocateTowersOffRoute, clearing scenery for them if they must).
  for(const avoidTowers of [true, false]){
    if(avoidTowers){ for(const key of towerTileKeys) occupied.add(key); } else { for(const key of towerTileKeys) occupied.delete(key); }
    for(const [planStart, planFinish, allowance, tries] of plans){
      spacingAllowance = allowance;
      for(let attempt=0; attempt<tries; attempt++){
        start = grow(oldPath[0], planStart); finish = grow(last, planFinish);
        const okay = (!planStart || start.length === planStart) && (!planFinish || finish.length === planFinish)
          && pathTipExit(start.length ? start[start.length-1] : oldPath[0], occupied) && pathTipExit(finish.length ? finish[finish.length-1] : last, occupied);
        if(okay) return [...start.reverse(),...oldPath,...finish];
        for(const tile of [...start,...finish]) occupied.delete(tile.x+','+tile.y);
        start = []; finish = [];
      }
    }
  }
  return oldPath;
}
// PATH-SPIRAL-01, EXPAND-BOTH-ENDS-01: every expansion adds 1 to 3 route tiles at each end, the same number at both (2 to 6 in total).
const PATH_GROWTH_TILES_MIN = 1, PATH_GROWTH_TILES_MAX = 3;
const HUT_MIN_EXPANSION_LEVEL = 3;
const GUARDIAN_COMBAT_LEASH = 260;
let hutsSpawnedThisGame = false;
// REPEAT-FANFARE-01: the first troll and the first circus of a run get the full arrival (camera pan, fanfare); later ones arrive quietly, as Diablo kept its big surprises one-time.
let trollArrivalsThisRun = 0, circusArrivalsThisRun = 0;
let latestExpansionTiles = [];
function initRegionAndPath(){
  resetGoldHudFlights();
  const w = 2, h = 2;
  const x0 = Math.floor(COLS/2) - Math.floor(w/2);
  const y0 = Math.floor(ROWS/2) - Math.floor(h/2);
  activeRegion = { x0, y0, x1: x0+w-1, y1: y0+h-1 };
  expansionLevel = 0;
  paidExpansions = 0;
  paidExpansionWaveIndex = -1;
  hutsSpawnedThisGame = false;
  trollArrivalsThisRun = 0; circusArrivalsThisRun = 0;
  resetCaravan();
  latestExpansionTiles = [];
  dirtTileKeys.clear();
  ringRevealed = new Set(); ringRevealQueue = []; ringCandidateRegion = null; // fresh game — no in-progress ring carried over
  ringRevealTotalTiles = 0; ringRevealTimer = 0;
  const verticalStart = Math.random() < 0.5, farSideStart = Math.random() < 0.5;
  pathWaypointTiles = verticalStart
    ? [{x:x0+(farSideStart ? 1 : 0),y:y0},{x:x0+(farSideStart ? 1 : 0),y:y0+1}]
    : [{x:x0,y:y0+(farSideStart ? 1 : 0)},{x:x0+1,y:y0+(farSideStart ? 1 : 0)}];
  rebuildPathCellsAndPx();
  lockStartingBorderOutsideRegion(); // STARTING-MAP-01
  pickStarterGroundDetails(); // GROUND-DETAIL-RUN-01
}
function performExpansion(label, labelColor){
  playSound('expand_build');
  if(ringCandidateRegion){ advanceRingReveal(ringRevealQueue.length); if(ringCandidateRegion && !ringRevealQueue.length) finalizeRingExpansion(); }
  if(!ringCandidateRegion){
    if(!beginNextRingReveal()) return false;
    openRandomEventSlot();
    pendingRingLabel = label; pendingRingLabelColor = labelColor; // shown once the ring actually closes, not on each partial reveal
  }
  advanceRingReveal(1 + Math.floor(Math.random()*3));
  if(ringCandidateRegion && !ringRevealQueue.length) finalizeRingExpansion(); // PATH-BORDER-01
  updateHUD();
  return true;
}
let pendingRingLabel = '🗺️ Map Expanded!', pendingRingLabelColor = '#ffd700';
// Enemies can walk the committed route before its grass animation finishes, so the new route and its neighbourhood are repainted into
// the cached map at once, including old tiles whose buildable status changed with the wider corridor, without rebaking the whole world.
function paintCommittedExpansionPath(oldPath){
  const oldKeys = new Set(oldPath.map(p => p.x+','+p.y));
  const changed = pathWaypointTiles.filter(p => !oldKeys.has(p.x+','+p.y));
  if(!changed.length) return;
  mapBakeRevision++;
  const mctx = mapCanvas.getContext('2d');
  mctx.setTransform(dprValue,0,0,dprValue,0,0);
  const dirtyTiles = new Set();
  for(const tile of changed){
    for(let dx=-PATH_BUILDABLE_MARGIN; dx<=PATH_BUILDABLE_MARGIN; dx++){
      for(let dy=-PATH_BUILDABLE_MARGIN; dy<=PATH_BUILDABLE_MARGIN; dy++){
        dirtyTiles.add((tile.x+dx)+','+(tile.y+dy));
      }
    }
  }
  for(const key of dirtyTiles){
    const [gx,gy] = key.split(',').map(Number);
    if(gx<0 || gx>=COLS || gy<0 || gy>=ROWS) continue;
    const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
    if(pathCells.has(key)){
      sceneryMap.delete(key);
      floraMap.delete(key);
      paintPathTileBase(mctx, gx, gy);
    } else if(isInActiveRegion(gx, gy)){
      paintBuildableTileBase(mctx, gx, gy);
    } else if(activeRegion && gx>=activeRegion.x0 && gx<=activeRegion.x1 && gy>=activeRegion.y0 && gy<=activeRegion.y1){
      mctx.fillStyle = '#8b5a2b';
      mctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    }
  }
}
function beginNextRingReveal(){
  const previousFinishLine = computeFinishLine();
  const arcLength=PATH_GROWTH_TILES_MIN+Math.floor(Math.random()*(PATH_GROWTH_TILES_MAX-PATH_GROWTH_TILES_MIN+1));
  const oldPath=pathWaypointTiles, candidate=extendPathWithNewRing(oldPath,{x0:0,y0:0,x1:COLS-1,y1:ROWS-1},arcLength);
  if(candidate===oldPath || candidate.length===oldPath.length) return false;
  const newRegion={...activeRegion};
  for(const tile of candidate){
    newRegion.x0=clampNum(tile.x-PATH_BUILDABLE_MARGIN, 0, newRegion.x0);
    newRegion.y0=clampNum(tile.y-PATH_BUILDABLE_MARGIN, 0, newRegion.y0);
    newRegion.x1=clampNum(tile.x+PATH_BUILDABLE_MARGIN, newRegion.x1, COLS-1);
    newRegion.y1=clampNum(tile.y+PATH_BUILDABLE_MARGIN, newRegion.y1, ROWS-1);
  }
  ringCandidateRegion=newRegion;
  const previouslyBorderingKeys=nearPathTileSet;
  pathWaypointTiles=candidate;
  const prepended = pathWaypointTiles.findIndex(tile => tile.x===oldPath[0].x && tile.y===oldPath[0].y);
  if(prepended > 0){
    for(const enemy of enemyPool) if(enemy.active){ enemy.pathIndex += prepended; enemy.traveled += prepended*TILE_SIZE; }
  }
  rebuildPathCellsAndPx();
  relocateTowersOffRoute(); // ROAD-FREEDOM-01
  // GRASS-NEVER-SHRINKS-01: the road is always framed by grass, and grass is only ever added to; no border tile is trimmed or turned to dirt.
  // PATH-BORDER-01
  const oldTip = oldPath[oldPath.length-1];
  const oldPathKeys = new Set(oldPath.map(p => p.x+','+p.y));
  const revealTiles = [];
  for(const tile of pathWaypointTiles){
    if(!oldPathKeys.has(tile.x+','+tile.y)) revealTiles.push({ x: tile.x, y: tile.y });
  }
  for(const lockedKey of [...pendingRevealTileKeys]){
    if(!nearPathTileSet.has(lockedKey)){ pendingRevealTileKeys.delete(lockedKey); continue; } // became route: revealed as route
    const [lockedX, lockedY] = lockedKey.split(',').map(Number);
    revealTiles.push({ x: lockedX, y: lockedY }); // STARTING-MAP-01: the first expansion opens the locked starting border
  }
  for(const key of nearPathTileSet){
    if(previouslyBorderingKeys.has(key)) continue;
    const [borderX, borderY] = key.split(',').map(Number);
    revealTiles.push({ x: borderX, y: borderY });
    pendingRevealTileKeys.add(key);
  }
  const distanceFromOldTip = tile => Math.min(Math.hypot(tile.x-oldTip.x,tile.y-oldTip.y),Math.hypot(tile.x-oldPath[0].x,tile.y-oldPath[0].y));
  revealTiles.sort((tileA, tileB) => distanceFromOldTip(tileA) - distanceFromOldTip(tileB));
  paintCommittedExpansionPath(oldPath);
  mapBakeRevision++;
  const finishCtx=mapCanvas.getContext('2d');
  finishCtx.setTransform(dprValue,0,0,dprValue,0,0);
  repaintFinishCarpetFootprint(finishCtx,previousFinishLine);
  drawFinishCarpet(finishCtx,computeFinishLine());
  ringRevealQueue = revealTiles;
  ringRevealTotalTiles = ringRevealQueue.length; // PATHING-MASTER-01
  ringRevealTimer = 0;
  return true;
}
// EXPANSION-GLORY-01: each tile glitters as it opens, and the finished map ends in a golden burst, a rising chime and a gentle shake.
function spawnExpansionSparkles(x, y){
  const lowDetail = graphicsQuality === 'low' || underHeavyVisualLoad;
  spawnParticles(x, y, '#ffe08a', lowDetail ? 2 : 6, 70, 0.92, false);
  if(!lowDetail) spawnParticles(x, y, '#ffffff', 2, 40, 0.9, false);
}
function spawnExpansionFinale(region){
  const x = (region.x0 + region.x1 + 1) / 2 * TILE_SIZE, y = (region.y0 + region.y1 + 1) / 2 * TILE_SIZE;
  const lowDetail = graphicsQuality === 'low' || underHeavyVisualLoad;
  spawnParticles(x, y, '#ffd700', lowDetail ? 12 : 40, 260, 0.92, false);
  if(!lowDetail) spawnParticles(x, y, '#fff6c9', 16, 180, 0.9, false);
  playSound('levelup');
  if(screenShakeEnabled){ screenShakeUntil = presentationTime + 220; screenShakeMag = Math.max(screenShakeMag, 3); }
}
function countSceneryOfType(type){
  let count = 0;
  for(const item of sceneryMap.values()) if(item.type === type) count++;
  return count;
}
function spawnRevealedScenery(tileX, tileY, key, type){
  const level = expansionLevel;
  expansionLevel++;
  spawnScenery(tileX, tileY, type);
  expansionLevel = level;
  const item = sceneryMap.get(key);
  if(item) item.revealBornAt = presentationTime;
}
function advanceRingReveal(n){
  if(!ringRevealQueue.length) return;
  for(let i=0; i<n && ringRevealQueue.length; i++){
    const t = ringRevealQueue.shift();
    ringRevealed.add(t.x+','+t.y);
    pendingRevealTileKeys.delete(t.x+','+t.y);
    spawnExpansionSparkles((t.x+0.5)*TILE_SIZE, (t.y+0.5)*TILE_SIZE);
    // Reveal useful scenery with its own tile, rather than the final batch.
    const key=t.x+','+t.y;
    if(!pathCells.has(key) && !sceneryMap.has(key) && sceneryPlanRandom(t.x, t.y, 32 + expansionLevel + 1)() < CONFIG.SCENERY.coverage){
      spawnRevealedScenery(t.x, t.y, key);
    }
    if(!pathCells.has(key) && isEndRingTile(t.x, t.y) && !sceneryMap.has(key) && keepRoomToBuild(1)){
      spawnRevealedScenery(t.x, t.y, key, sceneryPlanRandom(t.x, t.y, 74)() < 0.6 ? 'TREE' : 'ROCK');
    }
    maybeSpawnRandomEventsOnExpansion([key],true);
    invalidateSpawnFlags();
  }
  if(!ringRevealQueue.length) finalizeRingExpansion();
}
// PATHING-MASTER-01: the route commits instantly when a ring starts, so the visible reveal is driven every frame and finishes
// within about two seconds, throttled by RING_REVEAL_INTERVAL_MS so the spiral is seen growing. Wave-start and wave-end calls are a catch-up net.
function driveRingReveal(dt){
  if(!ringRevealQueue.length){
    ringRevealTimer = 0;
    if(ringCandidateRegion) finalizeRingExpansion(); // PATH-BORDER-01
    return;
  }
  ringRevealTimer += dt;
  const totalTicks = Math.max(1, Math.round(RING_REVEAL_TARGET_MS / RING_REVEAL_INTERVAL_MS));
  const tilesPerTick = Math.max(1, Math.ceil(ringRevealTotalTiles / totalTicks)); // scales with ring size so a huge late-game ring doesn't take proportionally longer than a small early one
  while(ringRevealTimer >= RING_REVEAL_INTERVAL_MS && ringRevealQueue.length){
    ringRevealTimer -= RING_REVEAL_INTERVAL_MS;
    advanceRingReveal(tilesPerTick);
  }
}
// ROOM-TO-BUILD-01: new scenery is placed only while at least MIN_CLEAR_GRASS_FRACTION of the grass stays clear, so old road-end guard trees and rocks
// never leave the player with nowhere to build.
const MIN_CLEAR_GRASS_FRACTION = 0.45;
function keepRoomToBuild(reserveSlots = 0){
  // SCENERY-PRESERVE-01: preserve old scenery; enforce room when placing new props instead of deleting old ones.
  const grass = [...nearPathTileSet].filter(key => !pathCells.has(key));
  return !grass.length || grass.filter(key => !sceneryMap.has(key)).length-reserveSlots >= Math.ceil(grass.length*MIN_CLEAR_GRASS_FRACTION);
}
function animateNewExpansionScenery(previousScenery){
  for(const [key,item] of sceneryMap) if(previousScenery.get(key) !== item && !Number.isFinite(item.revealBornAt)) item.revealBornAt=presentationTime;
}
function finalizeRingExpansion(){
  const previousScenery = new Map(sceneryMap); // one snapshot per expansion, never in the render loop
  const oldRegion = { ...activeRegion };
  const oldFinishLine = computeFinishLine();
  const newRegion = ringCandidateRegion;
  latestExpansionTiles = [...ringRevealed].map(key=>{ const [x,y]=key.split(',').map(Number); return {x,y}; });
  activeRegion = newRegion;
  expansionLevel++;
  rebuildPathCellsAndPx();
  for(const tile of pathWaypointTiles){
    sceneryMap.delete(tile.x+','+tile.y);
    floraMap.delete(tile.x+','+tile.y);
  }
  // Ordinary scenery was placed during advanceRingReveal; do not spawn it twice.
  spawnOutsideBranches(Math.floor(Math.random()*4));
  ensureEndGuardScenery();
  scatterFloraInRing(oldRegion, newRegion, ringRevealed);
  keepRoomToBuild(); // ROOM-TO-BUILD-01
  if(randomEventHostileAllowed(waveIndex) && expansionLevel >= HUT_MIN_EXPANSION_LEVEL && !hutsSpawnedThisGame && randomEventSlotsUsed < 2){
    hutsSpawnedThisGame = spawnHuts(oldRegion, newRegion); // new tiles only, after scenery; never force a camp beside the finish or into an established build area
    if(hutsSpawnedThisGame){ tryClaimRandomEventSlot(); logGameEvent('random event: hut camp'); }
  }
  const revealedBorderKeys = [...ringRevealed];
  ringRevealed.clear();
  ringRevealQueue = [];
  pendingRevealTileKeys.clear();
  ringCandidateRegion = null;
  maybeAddBonusGrassTile(revealedBorderKeys);
  breedLivestockOnExpansion();
  maybeSpawnRandomEventsOnExpansion(revealedBorderKeys);
  maybeDropExpansionShovel(revealedBorderKeys);
  animateNewExpansionScenery(previousScenery); // entrance for endpoint top-ups and fallback props, preserving old objects
  mapBakeRevision++;
  const mctx = mapCanvas.getContext('2d');
  mctx.setTransform(dprValue,0,0,dprValue,0,0);
  repaintFinishCarpetFootprint(mctx, oldFinishLine);
  paintNewRingTiles(mctx, oldRegion, newRegion);
  for(const key of [...revealedBorderKeys, ...bonusGrassTiles]){
    const [borderX, borderY] = key.split(',').map(Number);
    if(pathCells.has(key)) paintPathTileBase(mctx, borderX, borderY);
    else if(isInActiveRegion(borderX, borderY)) paintBuildableTileBase(mctx, borderX, borderY);
  }
  reportPathBorderProblems();
  drawFinishCarpet(mctx, computeFinishLine());
  spawnFloatingText((newRegion.x0+newRegion.x1)/2*TILE_SIZE, newRegion.y0*TILE_SIZE-10, pendingRingLabel, pendingRingLabelColor);
  playSound('wave');
  spawnExpansionFinale(newRegion);
  if(expansionLevel >= 5) awardMedal('CARTOGRAPHER');
  trackGameEvent('map_expanded', { expansion_level: expansionLevel, route_tiles: pathWaypointTiles.length, spacing_relaxed: routeSpacingRelaxedExpansions });
  updateHUD();
}
// EXPAND-PER-WAVE-01: one bought expansion per wave.
function expandRegion(){
  if(regionFullyExpanded() || expansionBlockedReason()) return false;
  const cost = expansionCost();
  if(gold < cost) return false;
  if(!performExpansion('🗺️ Map Expanded!', '#ffd700')) return false;
  gold -= cost;
  paidExpansions++;
  paidExpansionWaveIndex = waveIndex;
  updateHUD();
  return true;
}
function grantFreeExpansion(){
  if(regionFullyExpanded()) return false;
  return performExpansion('🎁 Free Map Expansion!', '#7dd3fc');
}
// EARLY-REWARD-USE-01: a map-expansion pickup is consumed only when the expansion actually happens.
function resolveExpansionPickupUse(expand, consume, blocked){
  if(!expand()){ blocked(); return false; }
  consume();
  return true;
}
function isExpansionPickupItem(item){ return !!(item && item.itemDef && item.itemDef.isMapScroll); }
function canEvictGroundItem(item){ return item !== draggingGroundItem && !isExpansionPickupItem(item); }
function useFreeExpansionPickup(groundItem, color){
  return resolveExpansionPickupUse(grantFreeExpansion, () => {
    groundItems = groundItems.filter(gi => gi !== groundItem);
    itemLogReleased(groundItem.itemDef, 'used');
    spawnParticles(groundItem.x, groundItem.y, color, 12);
    playSound('class_unlock');
  }, () => showToast('There is no room left to expand.'));
}
/* =========================================================
   GROUND ITEM DRIFT AND SHOVEL
   ========================================================= */
function shovelDigPoint(tower){
  const range = Math.max(TILE_SIZE, tower.targetingRange || tower.range || TILE_SIZE);
  for(let attempt = 0; attempt < 12; attempt++){
    const angle = Math.random()*Math.PI*2, distance = Math.sqrt(Math.random())*range;
    const x = tower.x + Math.cos(angle)*distance, y = tower.y + Math.sin(angle)*distance;
    const tx = Math.floor(x/TILE_SIZE), ty = Math.floor(y/TILE_SIZE);
    if(isInActiveRegion(tx, ty) && !pathCells.has(tx+','+ty) && isLooseWalkableAt(x, y) && !sceneryAtPoint(x, y)) return { x, y };
  }
  return null;
}
const ITEM_DRIFT_SPEED_PX_PER_S = 9, ITEM_DRIFT_STOP_PX = 13, ITEM_DRIFT_STORE_PX = 15; // ITEM-DRIFT-01
const ITEM_DRIFT_DELAY_MIN_MS = 20000, ITEM_DRIFT_DELAY_SPREAD_MS = 10000; // ITEM-DRIFT-02
function towerCanTakeDriftItem(tower, def){ return tower.equippedItems.length < MAX_ITEM_SLOTS || (STACKABLE_ITEM_IDS.has(def.id) && tower.equippedItems.some(item => item.id === def.id)); }
function itemDriftsToTowers(def){ return !def.isGoldBag && !def.isMapScroll && !def.isBarricade; }
function updateGroundItemDrift(dt){
  if(!groundItems.length) return;
  let candidates = null;
  for(const gi of groundItems){
    if(gi === draggingGroundItem || gi.placedByPlayer || !itemDriftsToTowers(gi.itemDef)) continue;
    if(presentationTime < gi.driftAt) continue;
    if(gi.flyStart !== undefined && presentationTime - gi.flyStart < gi.flyDur) continue;
    if(gi.rejectStartedAt !== undefined && presentationTime - gi.rejectStartedAt < 1500) continue;
    if(!candidates) candidates = towerPool.filter(t => t.active && !t.isWalking && !isStructureType(t.type));
    let nearest = null, nearestDistance = Infinity;
    for(const t of candidates){
      const distance = Math.hypot(t.x - gi.x, t.y - gi.y);
      if(distance < nearestDistance && distance <= (t.targetingRange || t.range || 0) && towerCanTakeDriftItem(t, gi.itemDef)){ nearest = t; nearestDistance = distance; }
    }
    if(!nearest) continue;
    if(nearestDistance <= ITEM_DRIFT_STORE_PX && nearest.receiveItem(gi.itemDef)){ // Warcraft-style: anything in a stickman's inventory counts as carried, gear included
      groundItems = groundItems.filter(other => other !== gi);
      spawnFloatingText(nearest.x, nearest.y - 40, gi.itemDef.icon, '#ffffff', ITEM_POPUP_LIFE_MS);
      trackGameEvent('item_drifted', { item: gi.itemDef.id, tower_type: nearest.type });
      if(selectedTower === nearest) updateInspectPanel();
      continue;
    }
    if(nearestDistance <= ITEM_DRIFT_STOP_PX) continue;
    const step = Math.min(nearestDistance - ITEM_DRIFT_STOP_PX, ITEM_DRIFT_SPEED_PX_PER_S * dt / 1000);
    gi.x += (nearest.x - gi.x) / nearestDistance * step;
    gi.y += (nearest.y - gi.y) / nearestDistance * step;
  }
}
function shovelChargesLeft(tower){ return tower.shovelCharges === undefined ? SHOVEL_CHARGES_PER_ROUND : tower.shovelCharges; }
function resetShovelCharges(){ // SHOVEL-CHARGES-01: clearing a wave refills every stickman's digs
  for(const t of towerPool){ if(t.active && t.shovelCharges !== undefined){ t.shovelCharges = SHOVEL_CHARGES_PER_ROUND; refreshQuickUse(t); } }
}
function beginShovelDig(tower){
  if(tower.shovelDig) return false;
  if(shovelChargesLeft(tower) <= 0){ showToast('The shovel needs a rest until the wave is cleared.'); playSound('ui_deny'); return false; }
  const site = shovelDigPoint(tower);
  if(!site){ showToast('No clear patch of ground nearby.'); playSound('ui_deny'); return false; }
  tower.shovelCharges = shovelChargesLeft(tower) - 1;
  awardMedal('DIGGER');
  tower.shovelDig = { site, startedAt: gameTime, finishAt: gameTime + SHOVEL_DIG_MS };
  spawnParticles(tower.x, tower.y + 6, '#c9a66b', 8);
  playSound('click');
  return true;
}
function drawShovelDigSwing(ctx, tower){
  const dig = tower.shovelDig, progress = clampNum((gameTime - dig.startedAt) / SHOVEL_DIG_MS, 0, 1);
  const swing = Math.sin(progress * Math.PI * 3);
  ctx.save();
  ctx.translate(tower.x + 12, tower.y - 4);
  ctx.rotate(-0.9 + swing * 0.7);
  ctx.font = pxFont(18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SHOVEL_ITEM.icon, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#8b6a3e';
  for(let fleck = 0; fleck < 5; fleck++){
    const lift = Math.max(0, Math.sin(progress * Math.PI * 3 + fleck)) * 8;
    ctx.beginPath(); ctx.arc(dig.site.x + (fleck - 2) * 3, dig.site.y - lift, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function digWithShovel(tower, site){
  spawnParticles(site.x, site.y, '#c9a66b', 10);
  const roll = Math.random();
  if(roll < 0.02){
    const gear = pickGenericDropItem(rollDropRarity(false));
    if(gear){ spawnGroundItem(site.x, site.y, gear, 'dug up'); showToast('A buried ' + gear.name + '!'); trackGameEvent('item_dropped', { item: gear.id, rarity: gear.rarity, enemy_type: 'shovel' }); playSound('class_unlock'); return true; }
  }
  if(roll < 0.02 + SHOVEL_CHEST_CHANCE){
    dropTreasureBags(site.x, site.y, 2 + Math.floor(Math.random()*3));
    spawnParticles(site.x, site.y, '#ffd700', 14);
    spawnFloatingText(site.x, site.y - 14, '🧰 Treasure chest!', '#ffd700', ITEM_POPUP_LIFE_MS);
    awardMedal('TREASURE');
    playSound('wave');
    return true;
  }
  if(roll < 0.84){
    const food = pickFoodOfKind('VEGETABLE');
    spawnGroundItem(site.x, site.y, food, 'dug up');
    spawnFloatingText(site.x, site.y - 12, food.icon + ' ' + food.name, '#b9e769', ITEM_POPUP_LIFE_MS);
    playSound('click');
    return true;
  }
  spawnBoneDebris(site.x, site.y, 12);
  spawnFloatingText(site.x, site.y - 12, 'Just bones.', '#d7d1c5', ITEM_POPUP_LIFE_MS);
  playSound('click');
  return true;
}
function maybeDropExpansionShovel(revealedKeys){
  if(Math.random() >= 0.015 || groundItems.length >= MAX_GROUND_ITEMS) return;
  for(const key of revealedKeys){
    const [tx, ty] = key.split(',').map(Number);
    if(pathCells.has(key) || !isInActiveRegion(tx, ty) || sceneryMap.has(key)) continue;
    const x = (tx+0.5)*TILE_SIZE, y = (ty+0.5)*TILE_SIZE;
    if(!sceneryAtPoint(x, y)){
      spawnGroundItem(x, y, SHOVEL_ITEM, 'map expansion');
      trackGameEvent('item_dropped', { item: SHOVEL_ITEM.id, rarity: SHOVEL_ITEM.rarity, enemy_type: 'map' });
      showToast('A shovel turned up on the new ground. Give it to a stickman to dig.');
      return;
    }
  }
}
// PATH-BORDER-01
const pendingRevealTileKeys = new Set();
let mapBakeRevision = 0; // CRISP-MAP-01: bumps whenever the baked map bitmap changes
// STARTING-MAP-01
const STARTING_PATH_TILE_COUNT = 2;
const STARTING_GRASS_TILE_COUNT = 2;
function lockStartingBorderOutsideRegion(){
  pendingRevealTileKeys.clear();
  if(expansionLevel !== 0 || ringCandidateRegion || !activeRegion) return;
  for(const key of nearPathTileSet){
    const [borderX, borderY] = key.split(',').map(Number);
    const insideStartingRegion = borderX >= activeRegion.x0 && borderX <= activeRegion.x1 && borderY >= activeRegion.y0 && borderY <= activeRegion.y1;
    if(!insideStartingRegion) pendingRevealTileKeys.add(key);
  }
}
// GRASS-RATIO-01: The route border stays a strict 1-tile ring
// (PATH_BUILDABLE_MARGIN), but every EXTRA_GRASS_EVERY_N_EXPANSIONS-th expansion adds one bonus grass
// tile just outside that ring, nudging the long-run dirt:grass ratio from 1:1 toward roughly 1:1.25
// without touching the border rule itself. Bonus tiles are tracked separately (bonusGrassTiles) so the
// border-completeness contract check is unaffected by them.
const EXTRA_GRASS_EVERY_N_EXPANSIONS = 4;
const bonusGrassTiles = new Set();
function isInActiveRegion(gx, gy){
  const key = gx+','+gy;
  if(bonusGrassTiles.has(key)) return true;
  return nearPathTileSet.has(key) && !pendingRevealTileKeys.has(key);
}
/* =========================================================
   LIVESTOCK, RANDOM EVENTS, BEES, TROLLS AND CIRCUS
   ========================================================= */
const CLOWN_ATTACK_RADIUS = 40, CLOWN_ATTACK_INTERVAL_MS = 1100, CLOWN_ATTACK_DAMAGE = 4, CLOWN_AGGRO_RADIUS = 260, CLOWN_HUNT_SPEED_MULT = 1.5;
const LIVESTOCK_ADULT_ROUNDS = 7, LIVESTOCK_BABY_SIZE_FRACTION = 0.3; // ANIMAL-GROWTH-01
function livestockAdultRounds(animal){ return animal.type === 'CHICKEN' ? 6 : LIVESTOCK_ADULT_ROUNDS; }
function livestockOnGrass(animal){ // EGG-ALL-GRASS-01
  const tileX = Math.floor(animal.x/TILE_SIZE), tileY = Math.floor(animal.y/TILE_SIZE);
  return isInActiveRegion(tileX, tileY) && !pathCells.has(tileX + ',' + tileY);
}
function livestockIsEgg(animal){ return animal.type === 'CHICKEN' && animal.growthRounds < 3; }
const LIVESTOCK_MAX_ON_BOARD = 8;
const LIVESTOCK_WALK_MS_MIN = 900, LIVESTOCK_WALK_MS_MAX = 2200;
const LIVESTOCK_IDLE_MS_MIN = 700, LIVESTOCK_IDLE_MS_MAX = 2400;
const LIVESTOCK_WALK_SPEED_MULT = 2.4; // the base speeds are for a slow amble; walking bursts are shorter so they need a bit more
// TARGET-MARK-01: livestock are Enemy instances (see CONFIG.ENEMIES CHICKEN/PIG/COW
// and Enemy.updateLivestockWander()), so drawing and update reuse the normal enemy render/update paths
// automatically; only spawning needs its own entry point.
function countLivestockOnBoard(){ return enemyPool.filter(e => e.active && e.isLivestock).length; }
// NPC-SAFE-SPAWN-01
const NPC_EDGE_LOOKAHEAD_PX = 28;
const LIVESTOCK_MOTION_EASE_MS = 260, LIVESTOCK_FACE_FLIP_PX_S = 6; // LIVESTOCK-SMOOTH-01
const BEE_TURN_RATE = 1.6, BEE_GOAL_SWING_RAD = 1.3, BEE_RETARGET_MS_MIN = 900, BEE_RETARGET_MS_MAX = 2200, BEE_SWELL_HZ = 0.7, BEE_SWELL_SHARE = 0.25, BEE_FACE_FLIP_SHARE = 0.35; // BEE-GLIDE-01
function beeCanFlyAt(x, y){ return !!activeRegion && isInActiveRegion(Math.floor(x/TILE_SIZE), Math.floor(y/TILE_SIZE)); }
const NPC_SPAWN_SAFETY_BUFFER_PX = 45, NPC_SPAWN_ATTEMPTS = 30;
function pickNpcSpawnPointOutsideStickmanReach(preferredKeys){
  let candidateKeys = preferredKeys;
  if(!candidateKeys){
    candidateKeys = [];
    for(let gx = activeRegion.x0; gx <= activeRegion.x1; gx++) for(let gy = activeRegion.y0; gy <= activeRegion.y1; gy++) if(isLooseWalkableAt(gx*TILE_SIZE + 1, gy*TILE_SIZE + 1)) candidateKeys.push(gx+','+gy);
    for(const key of pathCells) if(!candidateKeys.includes(key)) candidateKeys.push(key);
  }
  if(!candidateKeys.length) return null;
  for(let attempt = 0; attempt < NPC_SPAWN_ATTEMPTS; attempt++){
    const [gx, gy] = candidateKeys[Math.floor(Math.random()*candidateKeys.length)].split(',').map(Number);
    const px = gx*TILE_SIZE + TILE_SIZE/2, py = gy*TILE_SIZE + TILE_SIZE/2;
    let covered = false;
    for(const t of towerPool){
      if(!t.active || isStructureType(t.type)) continue;
      const safeDist = t.targetingRange + NPC_SPAWN_SAFETY_BUFFER_PX;
      const dx = px - t.x, dy = py - t.y;
      if(dx*dx + dy*dy < safeDist*safeDist){ covered = true; break; }
    }
    if(!covered) return { x: px, y: py };
  }
  return null;
}
// ONE-EVENT-PER-END-01: every expansion makes exactly one positive random event within 3 to 5 route squares of the spawn flags and one within
// 3 to 5 squares of the finish carpet (fewer only if a hostile event already took a slot or no tile is free): a treasure chest, a supply crate, a potted
// berry bush or a wandering farm animal. Nothing else spawns as a random extra.
const EVENT_PROP_EMOJI = { PICNIC: '🧺', WOODPILE: '🪵', BIRD_NEST: '🪺', MUSHROOMS: '🍄' };
const EVENT_PROP_TYPES = new Set(['CHEST', 'SUPPLY_CRATE', 'BUSH', ...Object.keys(EVENT_PROP_EMOJI)]);
// EVENT-VARIETY-01: random events are all positive and easy: a present, a supply crate, a berry bush, a farm animal, a fountain or campfire, a picnic basket (food and sometimes
// a stim), a wood pile (wood), a bird nest (a few coins) and a mushroom patch (food). Presents stay rare and nests rarer still.
const RANDOM_EVENT_CHOICES = [['CHEST', 0.06], ['SUPPLY_CRATE', 0.09], ['BUSH', 0.20], ['LIVESTOCK', 0.22], ['CHANCE', 0.18], ['PICNIC', 0.08], ['WOODPILE', 0.07], ['BIRD_NEST', 0.02], ['MUSHROOMS', 0.08]]; // CHANCE is a fountain or campfire when one is currently due
function pickRandomEventChoice(){
  let roll = Math.random();
  for(const [name, weight] of RANDOM_EVENT_CHOICES){ if(roll < weight) return name; roll -= weight; }
  return 'CHEST';
}
function maybeSpawnRandomEventsOnExpansion(revealedBorderKeys, tileOnly){
  const alreadyUsed = randomEventSlotsUsed;
  for(let side = 0; side < 2; side++){
    if(side < alreadyUsed || randomEventSlotsUsed >= 2) continue; // slot 0 is the flag end, slot 1 the finish end
    const eligible = randomEventEndTileKeys(side === 0);
    if(!eligible.length) continue;
    const revealed = new Set(revealedBorderKeys);
    let candidates = eligible.filter(key => revealed.has(key) && !pathCells.has(key));
    const isFree = key => { const [gx, gy] = key.split(',').map(Number); return isSceneryTileAvailable(gx, gy); };
    candidates = candidates.filter(isFree);
    if(!candidates.length && !tileOnly) candidates = eligible.filter(isFree);
    if(!candidates.length) continue;
    let choice = pickRandomEventChoice();
    if(choice === 'LIVESTOCK'){
      const spot = countLivestockOnBoard()+pendingLivestockBirths() < LIVESTOCK_MAX_ON_BOARD ? pickNpcSpawnPointOutsideStickmanReach(candidates) : null;
      const typeKeys = Object.keys(LIVESTOCK_TYPES).filter(k => !LIVESTOCK_TYPES[k].hunter && !LIVESTOCK_TYPES[k].roundBreeder);
      const animal = spot ? acquireActive(enemyPool) : null;
      if(animal && tryClaimRandomEventSlot()){
        const type = typeKeys[Math.floor(Math.random()*typeKeys.length)];
        logGameEvent('random event: livestock (' + type + ') near the ' + (side === 0 ? 'flags' : 'finish'));
        animal.spawn(type, 1, false, false);
        animal.isLivestock = true; animal.x = spot.x; animal.y = spot.y;
        animal.retargetTimer = Math.random()*LIVESTOCK_IDLE_MS_MAX; animal.livestockWalking = false;
        continue;
      }
      if(animal) animal.active = false;
      choice = 'BUSH';
    }
    if(choice === 'CHANCE'){
      const due = Object.keys(CONFIG.CHANCE_STRUCTURES).filter(type => chanceStructureSpawnChance(type) > 0);
      choice = due.length ? due[Math.floor(Math.random()*due.length)] : 'BUSH';
      if(due.length) chanceStructureDrySpells[choice] = 0;
    }
    if(choice === 'CHEST' && countSceneryOfType('CHEST') >= 2) choice = 'SUPPLY_CRATE'; // PROP-CAP-01: never more than two unopened presents on the board
    if(EVENT_PROP_TYPES.has(choice)){
      let props = 0; for(const item of sceneryMap.values()) if(EVENT_PROP_TYPES.has(item.type)) props++;
      const propLimit = Math.max(2, Math.floor(nearPathTileSet.size * 0.3));
      if(props >= propLimit) continue;
    }
    if(choice === 'BIRD_NEST'){ // NEST-NEAR-TREE-01
      const nearTree = candidates.filter(key => { const [gx,gy] = key.split(',').map(Number); return [...sceneryMap.values()].some(item => item.type === 'TREE' && Math.abs(item.gx-gx) <= 1 && Math.abs(item.gy-gy) <= 1); });
      if(nearTree.length) candidates = nearTree; else choice = 'BUSH';
    }
    const key = candidates[Math.floor(Math.random()*candidates.length)];
    const [gx, gy] = key.split(',').map(Number);
    if(!tryClaimRandomEventSlot()) continue;
    logGameEvent('random event: ' + choice + ' near the ' + (side === 0 ? 'flags' : 'finish'));
    spawnScenery(gx, gy, choice);
    spawnParticles(gx*TILE_SIZE + TILE_SIZE/2, gy*TILE_SIZE + TILE_SIZE/2, '#ffe082', 10);
  }
}
function findLivestockBirthSpot(parent){
  for(let attempt=0;attempt<12;attempt++){
    const angle=Math.random()*Math.PI*2, distance=parent.radius+LIVESTOCK_TYPES[parent.type].radius+8;
    const x=parent.x+Math.cos(angle)*distance,y=parent.y+Math.sin(angle)*distance;
    if(x<8 || y<8 || x>WORLD_MAX_W-8 || y>WORLD_MAX_H-8 || !isLooseWalkableAt(x,y)) continue;
    if(parent.type === 'CHICKEN' && !livestockOnGrass({x,y})) continue;
    if(enemyPool.some(e=>e.active && Math.hypot(e.x-x,e.y-y)<e.radius+LIVESTOCK_TYPES[parent.type].radius+4)) continue;
    if(towerPool.some(t=>t.active && Math.hypot(t.x-x,t.y-y)<LIVESTOCK_TYPES[parent.type].radius+18)) continue;
    return {x,y};
  }
  return null;
}
const LIVESTOCK_BREED_REST_ROUNDS = 3;
function matureBreedingAnimal(a){ return !!(a && a.active && a.hp>0 && a.isLivestock && !a.isHostileNpc && LIVESTOCK_TYPES[a.type] && !LIVESTOCK_TYPES[a.type].hunter && a.growthRounds>=livestockAdultRounds(a)); }
function livestockPairValid(a){
  const b=a && a.breedingPartner;
  return matureBreedingAnimal(a) && matureBreedingAnimal(b) && a!==b && a.type===b.type && b.breedingPartner===a && a.birthDueRound===b.birthDueRound;
}
function livestockPairDueSoon(a){ return livestockPairValid(a) && a.birthDueRound===wavesCompleted+1; }
function clearLivestockPair(a){
  const b=a.breedingPartner;
  a.breedingPartner=null;a.birthDueRound=0;a.heartStartAt=-1e9;
  if(b && b.breedingPartner===a){b.breedingPartner=null;b.birthDueRound=0;b.heartStartAt=-1e9;}
}
function pendingLivestockBirths(){ let count=0;for(const a of enemyPool) if(livestockPairValid(a) && a.id<a.breedingPartner.id) count++;return count; }
function prepareLivestockPair(a){
  if(a.breedingPartner && (!livestockPairValid(a) || a.birthDueRound<=wavesCompleted)) clearLivestockPair(a);
  if(!matureBreedingAnimal(a) || a.breedingPartner || wavesCompleted<(a.breedReadyRound||0)) return;
  const cap=LIVESTOCK_TYPES[a.type].roundBreeder ? LIVESTOCK_MAX_ON_BOARD+CIRCUS_EXTRA_LIVESTOCK_CAP : LIVESTOCK_MAX_ON_BOARD;
  if(countLivestockOnBoard()+pendingLivestockBirths()>=cap) return;
  for(const b of enemyPool){
    if(b===a || !matureBreedingAnimal(b) || b.type!==a.type || b.breedingPartner || wavesCompleted<(b.breedReadyRound||0)) continue;
    if(Math.hypot(a.x-b.x,a.y-b.y)>LIVESTOCK_PAIR_HEART_DIST_PX || !findLivestockBirthSpot(a)) continue;
    a.breedingPartner=b;b.breedingPartner=a;a.birthDueRound=b.birthDueRound=wavesCompleted+1;
    a.heartStartAt=b.heartStartAt=presentationTime;return;
  }
}
function breedLivestockOnExpansion(){ for(const a of enemyPool) prepareLivestockPair(a); }
function birthLivestockPairs(){
  // The due pair must still contain two living adults. Never reuse a parent twice.
  for(const a of enemyPool){
    if(!a.breedingPartner) continue;
    if(!livestockPairValid(a)){clearLivestockPair(a);continue;}
    if(a.birthDueRound>wavesCompleted || a.id>a.breedingPartner.id) continue;
    const b=a.breedingPartner;
    const cap=LIVESTOCK_TYPES[a.type].roundBreeder ? LIVESTOCK_MAX_ON_BOARD+CIRCUS_EXTRA_LIVESTOCK_CAP : LIVESTOCK_MAX_ON_BOARD;
    const spot=countLivestockOnBoard()<cap ? findLivestockBirthSpot(a) : null;
    const baby=spot ? acquireActive(enemyPool) : null;
    clearLivestockPair(a);
    if(!baby) continue;
    baby.spawn(a.type,1,false,false);baby.isLivestock=true;baby.x=spot.x;baby.y=spot.y;
    baby.growthRounds=0;applyLivestockGrowthSize(baby);baby.retargetTimer=LIVESTOCK_IDLE_MS_MAX;baby.livestockWalking=false;
    a.breedReadyRound=b.breedReadyRound=wavesCompleted+LIVESTOCK_BREED_REST_ROUNDS;
    logGameEvent('paired livestock birth: '+a.type);
  }
}
function restoreLivestock(savedAnimals, growthVersion){
  if(!Array.isArray(savedAnimals)) return;
  const restored=new Map();
  for(const saved of savedAnimals.slice(0,LIVESTOCK_MAX_ON_BOARD+CIRCUS_EXTRA_LIVESTOCK_CAP)){
    if(!saved || !LIVESTOCK_TYPES[saved.type] || LIVESTOCK_TYPES[saved.type].hunter || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) continue;
    if(saved.x<8 || saved.y<8 || saved.x>WORLD_MAX_W-8 || saved.y>WORLD_MAX_H-8 || !isLooseWalkableAt(saved.x,saved.y)) continue;
    const animal=acquireActive(enemyPool);if(!animal) break;
    animal.spawn(saved.type,1,false,false);animal.isLivestock=true;animal.x=saved.x;animal.y=saved.y;
    animal.growthRounds=Number.isFinite(saved.growthRounds) ? clampNum(Math.round(saved.growthRounds),0,livestockAdultRounds(animal)) : livestockAdultRounds(animal);
    if(growthVersion !== 2 && animal.growthRounds >= 3) animal.growthRounds=livestockAdultRounds(animal); // old three-round adults stay adults
    if(!Number.isFinite(animal.growthRounds)) animal.growthRounds=LIVESTOCK_ADULT_ROUNDS;
    if(animal.type==='BEE') animal.honeyElapsedMs=clampNum(Number(saved.honeyElapsedMs)||0,0,BEE_HONEY_MAX_MS);
    applyLivestockGrowthSize(animal);
    animal.hp=Math.max(1,Math.round(animal.maxHp*clampNum(Number(saved.healthFraction)||1,0.01,1)));
    animal.retargetTimer=LIVESTOCK_IDLE_MS_MAX;animal.livestockWalking=false;
    animal.breedReadyRound=Number.isFinite(saved.breedReadyRound) ? Math.max(wavesCompleted,Math.round(saved.breedReadyRound)) : wavesCompleted;
    animal.birthDueRound=saved.birthDueRound===wavesCompleted+1 ? saved.birthDueRound : 0;
    if(Number.isFinite(saved.savedId)) restored.set(saved.savedId,{animal,saved});
  }
  for(const {animal,saved} of restored.values()){
    const mate=restored.get(saved.mateId);
    if(mate && mate.saved.mateId===saved.savedId && animal.birthDueRound && mate.animal.birthDueRound===animal.birthDueRound && animal.breedReadyRound<=wavesCompleted && mate.animal.breedReadyRound<=wavesCompleted){animal.breedingPartner=mate.animal;animal.heartStartAt=presentationTime;}
  }
  for(const {animal} of restored.values()) if(!livestockPairValid(animal)) clearLivestockPair(animal);
}
// RANDOM-EVENT-SLOT-01: at most two random events can claim slots per expansion.
let randomEventSlotsUsed = 0;
function openRandomEventSlot(){ randomEventSlotsUsed = 0; }
function tryClaimRandomEventSlot(){
  if(randomEventSlotsUsed >= 2) return false;
  randomEventSlotsUsed++;
  return true;
}
const GUARANTEED_TROLL_EVERY_N_WAVES = 5;
function pickEndTileSpawnPoint(){
  const endKeys = randomEventEndTileKeys();
  const clearSpot = (endKeys.length ? pickNpcSpawnPointOutsideStickmanReach(endKeys) : null) || pickNpcSpawnPointOutsideStickmanReach();
  if(clearSpot) return clearSpot;
  const fallbackKeys = endKeys.length ? endKeys : [...pathCells];
  if(!fallbackKeys.length) return null;
  const [gx, gy] = fallbackKeys[Math.floor(Math.random()*fallbackKeys.length)].split(',').map(Number);
  return { x: gx*TILE_SIZE + TILE_SIZE/2, y: gy*TILE_SIZE + TILE_SIZE/2 };
}
// Bees wander on the playable ground; production uses real play time, never fast-forward.
const BEE_HONEY_MIN_MS=300000, BEE_HONEY_SPREAD_MS=300000, BEE_HONEY_MAX_MS=BEE_HONEY_MIN_MS+BEE_HONEY_SPREAD_MS, BEE_MAX_ON_BOARD=2; // BEE-HONEY-02: each honey comes after a random 5 to 10 minutes, the way a Minecraft chicken lays eggs
function rollBeeHoneyDueMs(){ return BEE_HONEY_MIN_MS+Math.random()*BEE_HONEY_SPREAD_MS; }
function maybeSpawnBee(){
  if(enemyPool.filter(e=>e.active && e.type==='BEE').length>=BEE_MAX_ON_BOARD) return;
  const spot=pickEndTileSpawnPoint(); if(!spot) return;
  const bee=placeLivestock('BEE',{...spot,radius:0},LIVESTOCK_ADULT_ROUNDS);
  if(bee){bee.honeyElapsedMs=0;bee.honeyDueMs=rollBeeHoneyDueMs();spawnFloatingText(bee.x,bee.y-20,'🐝 Bee','#ffe082');}
}
const HONEY_GROUND_CAP = 20; // bees stop dropping honey while this many jars lie on the ground
function updateBeeHoney(bee,dt){
  if(gameState!=='PLAYING' || !bee.active || bee.type!=='BEE') return;
  if(!Number.isFinite(bee.honeyDueMs)) bee.honeyDueMs=rollBeeHoneyDueMs();
  bee.honeyElapsedMs=Math.min(BEE_HONEY_MAX_MS,(bee.honeyElapsedMs||0)+clampNum(dt, 0, 100));
  if(bee.honeyElapsedMs<bee.honeyDueMs || !isLooseWalkableAt(bee.x,bee.y)) return;
  if(groundItems.filter(gi=>gi.itemDef.id==='HONEY').length>=HONEY_GROUND_CAP) return;
  bee.honeyElapsedMs=0; bee.honeyDueMs=rollBeeHoneyDueMs();
  spawnGroundItem(bee.x,bee.y,lookupItemDef('HONEY'),'bee honey');
}
function maybeSpawnGuaranteedTroll(){
  if(wavesCompleted <= 0 || wavesCompleted % GUARANTEED_TROLL_EVERY_N_WAVES !== 0 || trollIsOnBoard()) return;
  spawnWanderingTroll();
}
function maybeSpawnWanderingTroll(){
  if(!randomEventHostileAllowed(waveIndex)) return; // early random events stay peaceful and helpful
  if(randomEventSlotsUsed >= 2 || trollIsOnBoard()) return;
  if(Math.random() >= TROLL_EVENT_CHANCE_PER_WAVE) return;
  spawnWanderingTroll();
}
function liveCircuses(){ return enemyPool.filter(e => e.active && e.isHutBuilding && e.buildingKind === 'CIRCUS' && !e.destroyed); }
function livestockSizeScale(animal){
  if(livestockIsEgg(animal)) return 0.4;
  const age = animal.type === 'CHICKEN' ? animal.growthRounds - 3 : animal.growthRounds;
  const rounds = animal.type === 'CHICKEN' ? 3 : LIVESTOCK_ADULT_ROUNDS;
  const babyScale=animal.type === 'CHICKEN' ? 0.4 : LIVESTOCK_BABY_SIZE_FRACTION;
  return babyScale + (1-babyScale)*clampNum(age / rounds,0,1);
}
function livestockMeatDropCount(type,rng = Math.random){return type === 'PIG' ? 1+Math.floor(rng()*3) : 1;}
function applyLivestockGrowthSize(animal){
  const base = CONFIG.ENEMIES[animal.type], sizeScale = livestockSizeScale(animal), healthFraction = animal.maxHp > 0 ? animal.hp / animal.maxHp : 1;
  animal.emoji = livestockIsEgg(animal) ? '🥚' : animal.type === 'CHICKEN' && animal.growthRounds < 6 ? '🐤' : base.emoji;
  animal.radius = base.radius * sizeScale;
  animal.maxHp = Math.max(4, Math.round(base.baseHp * sizeScale));
  animal.hp = Math.max(1, Math.round(animal.maxHp * healthFraction));
}
function growLivestockOneRound(){
  for(const animal of enemyPool){
    if(!animal.active || !animal.isLivestock || !LIVESTOCK_TYPES[animal.type] || LIVESTOCK_TYPES[animal.type].hunter || animal.growthRounds >= livestockAdultRounds(animal)) continue;
    if(livestockIsEgg(animal) && !livestockOnGrass(animal)) continue;
    animal.growthRounds++;
    applyLivestockGrowthSize(animal);
    spawnParticles(animal.x, animal.y, '#b9f6ca', 5);
    if(animal.growthRounds >= livestockAdultRounds(animal)) spawnFloatingText(animal.x, animal.y - animal.radius - 14, 'Grown up', '#b9f6ca');
  }
}
function livestockCapacityLeft(){ return LIVESTOCK_MAX_ON_BOARD + CIRCUS_EXTRA_LIVESTOCK_CAP - countLivestockOnBoard() - pendingLivestockBirths(); }
function findLivestockSpotNear(anchor, animalRadius){
  for(let attempt = 0; attempt < 16; attempt++){
    const angle = Math.random()*Math.PI*2, distance = (anchor.radius || 20) + animalRadius + 6 + Math.random()*22;
    const x = anchor.x + Math.cos(angle)*distance, y = anchor.y + Math.sin(angle)*distance;
    if(x < 8 || y < 8 || x > WORLD_MAX_W - 8 || y > WORLD_MAX_H - 8 || !isLooseWalkableAt(x, y)) continue;
    if(enemyPool.some(e => e.active && e !== anchor && Math.hypot(e.x - x, e.y - y) < e.radius + animalRadius + 3)) continue;
    return { x, y };
  }
  return null;
}
function placeLivestock(type, anchor, growthRounds){
  if(livestockCapacityLeft() <= 0) return null;
  const spot = findLivestockSpotNear(anchor, LIVESTOCK_TYPES[type].radius);
  if(!spot) return null;
  const animal = acquireActive(enemyPool);
  if(!animal) return null;
  animal.spawn(type, 1, false, false);
  animal.isLivestock = true; animal.isHostileNpc = !!LIVESTOCK_TYPES[type].hunter;
  animal.growthRounds = growthRounds;
  applyLivestockGrowthSize(animal);
  animal.x = spot.x; animal.y = spot.y;
  animal.retargetTimer = LIVESTOCK_IDLE_MS_MAX; animal.livestockWalking = false; animal.trollAttackTimer = LIVESTOCK_TYPES[type].hunter ? LIVESTOCK_TYPES[type].hunter.attackIntervalMs : 0;
  return animal;
}
function pickCircusPerformerType(){
  const clownsOnBoard = enemyPool.filter(e => e.active && e.type === 'CLOWN').length;
  const options = CIRCUS_PERFORMER_WEIGHTS.filter(([type]) => type !== 'CLOWN' || clownsOnBoard < CIRCUS_MAX_CLOWNS);
  let roll = Math.random() * options.reduce((sum, [, weight]) => sum + weight, 0);
  for(const [type, weight] of options){ if(roll < weight) return type; roll -= weight; }
  return options[0][0];
}
function sendCircusPerformer(circus){
  const type = pickCircusPerformerType();
  const performer = placeLivestock(type, circus, LIVESTOCK_ADULT_ROUNDS);
  if(!performer) return;
  spawnParticles(performer.x, performer.y, '#ffe082', 8);
  if(type === 'CLOWN'){
    playSound('clown_honk', performer.x, undefined, performer.y);
    spawnFloatingText(performer.x, performer.y - performer.radius - 14, '🤡 Clown!', '#ff8a80');
    showTutorialTipOnce('first_clown', '🤡 Clowns from the circus hunt nearby stickmen. Monkeys and elephants are harmless and can be harvested for food.');
  } else {
    playSound('coin', performer.x, undefined, performer.y);
  }
  logGameEvent('circus performer: ' + type);
}
function runCircusRoundEnd(){
  growLivestockOneRound();
  birthLivestockPairs();
  for(const circus of liveCircuses()){
    sendCircusPerformer(circus);
  }
}
function maybeSpawnCircus(){
  if(randomEventSlotsUsed >= 2 || waveIndex < CIRCUS_MIN_WAVE || liveCircuses().length > 0) return;
  if(Math.random() >= CIRCUS_CHANCE_PER_WAVE) return;
  const tile = findHutPlacementTile();
  if(!tile || !tryClaimRandomEventSlot()) return;
  setUpCircusAt(tile);
}
// HACK-SUMMON-01: a summoned circus may stand on any free tile beside the road, not only on freshly opened expansion tiles.
function findFreeTileBesideRoad(){
  if(!activeRegion) return null;
  const finishTile = pathWaypointTiles[pathWaypointTiles.length-1], candidates = [];
  const occupied = new Set([...towerPool].filter(t => t.active).map(t => t.gridX+','+t.gridY));
  for(const e of enemyPool) if(e.active && e.isHutBuilding) occupied.add(Math.floor(e.x/TILE_SIZE)+','+Math.floor(e.y/TILE_SIZE));
  for(let gx = activeRegion.x0; gx <= activeRegion.x1; gx++) for(let gy = activeRegion.y0; gy <= activeRegion.y1; gy++){
    const key = gx+','+gy;
    if(pathCells.has(key) || sceneryMap.has(key) || occupied.has(key)) continue;
    if(finishTile && Math.abs(gx-finishTile.x)+Math.abs(gy-finishTile.y) < 3) continue;
    let besideRoad = false; for(let ox = -2; ox <= 2 && !besideRoad; ox++) for(let oy = -2; oy <= 2; oy++) if(Math.abs(ox) + Math.abs(oy) <= 2 && pathCells.has((gx+ox)+','+(gy+oy))){ besideRoad = true; break; }
    if(!besideRoad) continue;
    candidates.push([gx, gy]);
  }
  if(!candidates.length) return null;
  const [gx, gy] = candidates[Math.floor(Math.random()*candidates.length)];
  return { x: gx*TILE_SIZE + TILE_SIZE/2, y: gy*TILE_SIZE + TILE_SIZE/2 };
}
function setUpCircusAt(tile){
  if(!tile || liveCircuses().length > 0 || !spawnCampBuilding('CIRCUS', tile.x, tile.y)) return false;
  logGameEvent('random event: circus');
  awardMedal('RINGMASTER');
  playSound(circusArrivalsThisRun++ === 0 ? 'wave' : 'clown_honk', tile.x, undefined, tile.y);
  showTutorialTipOnce('first_circus', '🎪 A circus has set up beside the road. It sends out a performer at the end of every round, usually an animal and sometimes a clown that hunts stickmen. It never adds enemies to the waves.');
  return true;
}
function maybeAddBonusGrassTile(revealedBorderKeys){
  if(expansionLevel % EXTRA_GRASS_EVERY_N_EXPANSIONS !== 0) return;
  const candidates = [];
  for(const key of revealedBorderKeys){
    if(pathCells.has(key)) continue;
    const [bx, by] = key.split(',').map(Number);
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = bx+dx, ny = by+dy;
      if(nx<0 || nx>=COLS || ny<0 || ny>=ROWS) continue;
      const nkey = nx+','+ny;
      if(pathCells.has(nkey) || nearPathTileSet.has(nkey) || bonusGrassTiles.has(nkey)) continue;
      candidates.push(nkey);
    }
  }
  if(!candidates.length) return;
  bonusGrassTiles.add(candidates[Math.floor(Math.random()*candidates.length)]);
}
function drawPendingRingReveal(ctx){
  if(!ringRevealed.size) return;
  ctx.save();
  for(const key of ringRevealed){
    const [gx, gy] = key.split(',').map(Number);
    if(pathCells.has(key)) continue;
    paintBuildableTileBase(ctx, gx, gy);
  }
  ctx.restore();
}
/* =========================================================
   SCENERY: ROCKS, TREES AND FLORA
   ========================================================= */
const sceneryMap = new Map(); // "gx,gy" -> scenery object
const clearingScenery = [];
function rebuildClearingScenery(){
  clearingScenery.length = 0;
  for(const entry of sceneryMap) if(entry[1].isClearing) clearingScenery.push(entry);
}
const floraMap = new Map(); // "gx,gy" -> {gx, gy, x, y, glyph, rotDeg, offX, offY, sizeFrac} — purely decorative, see CONFIG.FLORA
function shuffleArray(arr, rng = Math.random){
  for(let i=arr.length-1; i>0; i--){
    const j = Math.floor(rng()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
// TAUNT-PICK-01: an enemy picks a stickman in reach at random, weighted toward closer ones and toward high Strength (taunt).
function towerTauntScore(tower, x, y, maxDist){
  if(!tower.active || tower.disabledWavesLeft > 0 || tower.type === 'BARRICADE' || (tower.type === 'HACKER' && tower.stealthUntil > gameTime)) return 0;
  const distance = Math.hypot(tower.x - x, tower.y - y);
  if(distance > (maxDist || Infinity)) return 0;
  return (1 + diminishingStatValue(tower.str || 0, 0.08)) / (distance + 40);
}
function findNearestActiveTower(x, y, maxDist){
  let total = 0, lastCandidate = null;
  for(const tower of towerPool){
    const score = towerTauntScore(tower, x, y, maxDist);
    if(score > 0){ total += score; lastCandidate = tower; }
  }
  if(!lastCandidate) return null;
  let roll = Math.random() * total;
  for(const tower of towerPool){
    roll -= towerTauntScore(tower, x, y, maxDist);
    if(roll <= 0) return tower;
  }
  return lastCandidate;
}
function findTouchingBarricade(e){
  if(e.isLivestock || e.isBreakaway) return null; // WANDERER-PHASE-01 and BREAKAWAY-PHASE-01 — livestock and the troll never touch a barricade
  const touchDist = e.radius + 14;
  const touchDistSq = touchDist * touchDist;
  for(const t of activeBarricades){
    if(!t.active) continue;
    const dx = t.x - e.x, dy = t.y - e.y;
    if(dx*dx + dy*dy <= touchDistSq) return t;
  }
  return null;
}
/* =========================================================
   ROUTE LENGTH AND BARRICADE PILE-UP
   ========================================================= */
let routeCumulativeLengths = [], routeCacheWaypointsRef = null;
function ensureRouteLengthCache(){
  if(routeCacheWaypointsRef === waypointsPx) return;
  routeCumulativeLengths.length = waypointsPx.length;
  routeCumulativeLengths[0] = 0;
  for(let i = 1; i < waypointsPx.length; i++){
    const a = waypointsPx[i-1], b = waypointsPx[i];
    routeCumulativeLengths[i] = routeCumulativeLengths[i-1] + Math.hypot(b.x-a.x, b.y-a.y);
  }
  routeCacheWaypointsRef = waypointsPx;
}
function routeSegmentIndexAt(dist){
  ensureRouteLengthCache();
  let lo = 0, hi = routeCumulativeLengths.length - 2;
  while(lo < hi){
    const mid = (lo + hi) >> 1;
    if(routeCumulativeLengths[mid+1] >= dist) hi = mid; else lo = mid + 1;
  }
  return lo;
}
function routeTotalLength(){
  ensureRouteLengthCache();
  return routeCumulativeLengths[routeCumulativeLengths.length-1] || 0;
}
function getPositionAtTraveled(dist){
  if(dist <= 0) return { x: waypointsPx[0].x, y: waypointsPx[0].y };
  if(dist >= routeTotalLength()){
    const last = waypointsPx[waypointsPx.length-1];
    return { x: last.x, y: last.y };
  }
  const i = routeSegmentIndexAt(dist);
  const a = waypointsPx[i], b = waypointsPx[i+1];
  const segLen = routeCumulativeLengths[i+1] - routeCumulativeLengths[i];
  const t = segLen > 0 ? (dist - routeCumulativeLengths[i]) / segLen : 0;
  return { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t };
}
const barricadeActiveScratch = [];
const barricadeAttackerScratch = new Map();
const barricadeClaimedSlotsScratch = new Set();
const MAX_QUEUE_DEPTH = 40, QUEUE_CATCHMENT_PX = 70, QUEUE_MAX_TRAVELED_GAP_PX = 110, BARRICADE_QUEUE_TIMEOUT_MS = 15000;
const DOT_TEXT_BLEED = 0, DOT_TEXT_BURN = 1, DOT_TEXT_POISON = 2, DOT_TEXT_INTERVAL_MS = 1000;
const FOLLOW_BRAKE_ZONE_PX = 36, FOLLOW_STOP_GAP_PX = 2, FOLLOW_BRAKE_PER_S = 3; // QUEUE-HOLD-01
const QUEUE_PACK_MIN_GAP = 16; // PILE-PACK-01: queued standard enemies stand about 24 px apart
const BARRICADE_CHIP_MS = 260; // how long a barricade shakes/flashes after losing a point
const BARRICADE_HIT_INTERVAL_MS = 10000; // max 1 HP lost per 10s from ANY source — pile-up attackers and direct takeDamage() hits share this one limiter
// COLLISION-ARRAYS-01: the pre-snap positions and progress of the sorted queue are also copied to flat arrays, and the distance test runs before
// the eligibility test, so a pile of enemies with nearly equal progress (where the binary search cannot narrow the range) reads plain numbers in its inner loop.
// The nearest eligible leader inside the catchment is the same one as before.
let catchmentArrayLength = 0, catchmentPreX, catchmentPreY, catchmentPreTraveled;
function snapshotCatchmentArrays(active){
  if(active.length > catchmentArrayLength){
    catchmentArrayLength = Math.max(active.length, catchmentArrayLength * 2, 64);
    catchmentPreX = new Float64Array(catchmentArrayLength);
    catchmentPreY = new Float64Array(catchmentArrayLength);
    catchmentPreTraveled = new Float64Array(catchmentArrayLength);
  }
  for(let i = 0; i < active.length; i++){
    catchmentPreX[i] = active[i].preSnapX; catchmentPreY[i] = active[i].preSnapY; catchmentPreTraveled[i] = active[i].preSnapTraveled;
  }
}
function findQueueCatchmentLeader(active, endExclusive, behindIndex, maxTraveledGap, catchmentRadius){
  // `active` is sorted by traveled descending and the catchment arrays hold its pre-snap values in that order.
  // Binary-search the first plausible ahead unit; farther-ahead units cannot be catchment leaders.
  const behindX = catchmentPreX[behindIndex], behindY = catchmentPreY[behindIndex], behindTraveled = catchmentPreTraveled[behindIndex];
  let low = 0, high = endExclusive;
  while(low < high){
    const mid = (low + high) >> 1;
    if(catchmentPreTraveled[mid] - behindTraveled > maxTraveledGap) low = mid + 1;
    else high = mid;
  }
  let bestAhead = null, bestDist = Infinity;
  for(let j = low; j < endExclusive; j++){
    const d = Math.hypot(catchmentPreX[j]-behindX, catchmentPreY[j]-behindY);
    if(d >= catchmentRadius || d >= bestDist) continue;
    const ahead = active[j];
    if(!ahead.pileBlocked && ahead.queueSlotDist === undefined && !isEnemyHeldInPlace(ahead)) continue; // reserve approaching queue members too (QUEUE-BODY-GAP-01)
    bestDist = d; bestAhead = ahead;
  }
  return bestAhead;
}
function updateBarricadesAndPileup(){
  perfStats.barricadeSnapCount = 0;
  const active = barricadeActiveScratch;
  active.length = 0;
  for(const e of enemyPool){
    if(!e.active || e.isLivestock || e.isBreakaway || e.escaped || e.isGuardian || e.isHutBuilding) continue;
    e.pileBlocked = false;
    e.touchingBarricade = false;
    e.candidateBarricade = e.stunnedUntil > gameTime ? undefined : findTouchingBarricade(e); // independent per-enemy — merged into this same pass rather than a separate loop over `active` right after, since neither depends on the other having run first
    active.push(e);
  }
  const attackerByBarricade = barricadeAttackerScratch;
  attackerByBarricade.clear();
  for(const e of active){
    const barricade = e.candidateBarricade;
    if(!barricade || barricade.hp <= 0) continue;
    const current = attackerByBarricade.get(barricade);
    if(!current || e.traveled > current.traveled) attackerByBarricade.set(barricade, e);
  }
  for(const e of active){
    const barricade = e.candidateBarricade;
    e.candidateBarricade = undefined;
    if(!barricade || barricade.hp <= 0) continue;
    if(attackerByBarricade.get(barricade) !== e) continue;
    e.pileBlocked = true;
    e.touchingBarricade = true;
    if(barricade.barricadeContactSince === undefined || barricade.barricadeContactSince === null) barricade.barricadeContactSince = gameTime;
    if(barricadeAttackReady(barricade)){
      chipBarricade(barricade);
      if(goreMode && e.hp < e.maxHp){
        const bio = e.bloodProfile || getBloodProfile(e.type);
        if(!bio.isDust){
          const wipeAngle = Math.atan2(e.y - barricade.y, e.x - barricade.x) + Math.PI/2 + (Math.random()-0.5)*0.5;
          spawnBloodCastoff(barricade.x + (Math.random()-0.5)*10, barricade.y + (Math.random()-0.5)*10, wipeAngle, hexToRgba(bio.dark, 0.6), 4);
        }
      }
    }
  }
  active.sort((a,b) => b.traveled - a.traveled); // front of the line first
  // PILE-PACK-01: Enemies arrive spaced out (spawn gap plus follow speed cap),
  // but once stacked behind a barricade they pack tightly so area attacks can catch many at once.
  const queueGap = (e,ahead) => Math.max(e.radius + ahead.radius + 2 + (ahead.touchingBarricade ? ahead.radius*0.75 : 0), QUEUE_PACK_MIN_GAP); // QUEUE-BODY-GAP-01
  const claimedSlots = barricadeClaimedSlotsScratch;
  claimedSlots.clear();
  let anyBlockedSeed = false;
  for(const e of active){
    e.queueSlotDist = undefined; e.preSnapX = e.x; e.preSnapY = e.y; e.preSnapTraveled = e.traveled;
    if(e.pileBlocked || isEnemyHeldInPlace(e)){ claimedSlots.add(Math.round(e.traveled)); anyBlockedSeed = true; } // enemies already directly touching a barricade occupy their own traveled position
  }
  if(anyBlockedSeed){
    snapshotCatchmentArrays(active);
    for(let i=0; i<active.length; i++){
      const behind = active[i];
      if(behind.pileBlocked) continue; // already blocked directly (touching a barricade)
      if(claimedSlots.size > MAX_QUEUE_DEPTH) continue;
      const bestAhead = findQueueCatchmentLeader(active, i, i, QUEUE_MAX_TRAVELED_GAP_PX, QUEUE_CATCHMENT_PX);
      if(bestAhead){
        const spacing = queueGap(behind,bestAhead);
        const aheadSlot = bestAhead.queueSlotDist !== undefined ? bestAhead.queueSlotDist : bestAhead.traveled;
        let slotDist = Math.max(0, Math.round(aheadSlot) - spacing);
        while(claimedSlots.has(slotDist) && slotDist > 0) slotDist -= spacing;
        // Arc distance compresses across a corner; reserve enough physical room as well.
        const aheadPoint = getPositionAtTraveled(aheadSlot);
        while(slotDist > 0){
          const point = getPositionAtTraveled(slotDist);
          if(!point || !aheadPoint || Math.hypot(point.x-aheadPoint.x,point.y-aheadPoint.y) >= spacing) break;
          slotDist = Math.max(0,slotDist-2);
        }
        claimedSlots.add(slotDist);
        behind.queueSlotDist = slotDist;
        behind.pileBlocked = behind.traveled >= slotDist;
        if(behind.pileBlocked) settleEnemyTowardSlot(behind, slotDist);
        perfStats.barricadeSnapCount++;
      }
    }
  }
  for(const e of active) e.followSpeedCap = undefined;
  for(let i=1; i<active.length; i++){
    const ahead = active[i-1], behind = active[i];
    const d = Math.hypot(ahead.preSnapX-behind.preSnapX, ahead.preSnapY-behind.preSnapY);
    const contactPx = ahead.radius + behind.radius, gapPx = d - contactPx;
    if(gapPx <= FOLLOW_BRAKE_ZONE_PX){
      const aheadHeld = isEnemyFrozen(ahead);
      const aheadOwnSpeed = ahead.tierWalkSpeed() * enemyMoveMultiplier(ahead);
      const aheadEffectiveSpeed = aheadHeld ? 0 : Math.min(ahead.followSpeedCap !== undefined ? ahead.followSpeedCap : Infinity, aheadOwnSpeed);
      behind.followSpeedCap = aheadEffectiveSpeed + Math.max(0, gapPx - FOLLOW_STOP_GAP_PX) * FOLLOW_BRAKE_PER_S;
    }
  }
  let queuedCount = 0;
  for(const e of active) if(e.pileBlocked) queuedCount++;
  const nowQueued = queuedCount > 0;
  perfStats.barricadeActiveScanned = active.length;
  perfStats.barricadeQueuedCount = queuedCount;
  if(perfStats.barricadeQueuedCount > perfStats.barricadeMaxQueueLenSeen) perfStats.barricadeMaxQueueLenSeen = perfStats.barricadeQueuedCount;
  if(nowQueued){
    if(!barricadeQueueStartedAt) barricadeQueueStartedAt = gameTime;
  } else {
    barricadeQueueStartedAt = 0;
  }
  anyBarricadeQueued = nowQueued && (gameTime - barricadeQueueStartedAt < BARRICADE_QUEUE_TIMEOUT_MS);
}
const QUEUE_SETTLE_PX_PER_TICK = 6;
function settleEnemyTowardSlot(e, slotDist){
  const offsetPx = slotDist - e.traveled;
  if(offsetPx > 0) return; // QUEUE-NO-PULL-01
  snapEnemyToTraveled(e, Math.abs(offsetPx) <= QUEUE_SETTLE_PX_PER_TICK ? slotDist : e.traveled + Math.sign(offsetPx) * QUEUE_SETTLE_PX_PER_TICK);
}
function snapEnemyToTraveled(e, slotDist){
  const pos = getPositionAtTraveled(slotDist);
  e.x = pos.x; e.y = pos.y;
  e.traveled = slotDist;
  e.pathIndex = slotDist >= routeTotalLength() ? waypointsPx.length-1 : routeSegmentIndexAt(slotDist);
}
function isTileBuildable(gx, gy, ignoreTower, forType){
  if(gx<0||gx>=COLS||gy<0||gy>=ROWS) return false;
  const key = gx+','+gy;
  const onPath = pathCells.has(key);
  if(forType === 'BARRICADE'){
    // Barricades belong on unlocked route tiles. isInActiveRegion() intentionally excludes
    // route tiles from its green build corridor, so checking it first made barricades impossible.
    const unlocked = (activeRegion && gx>=activeRegion.x0 && gx<=activeRegion.x1 && gy>=activeRegion.y0 && gy<=activeRegion.y1) || ringRevealed.has(key);
    if(!onPath || !unlocked) return false;
  } else {
    if(onPath || !isInActiveRegion(gx, gy) || reservedPathExitTile(gx,gy)) return false; // other towers remain off the route
  }
  if(sceneryMap.has(key)) return false;
  if(towerPool.some(t => t.active && t !== ignoreTower && t.gridX===gx && t.gridY===gy)) return false;
  return true;
}
function spawnDebrisNear(x, y){
  const gx = Math.round(x/TILE_SIZE), gy = Math.round(y/TILE_SIZE);
  const candidates = [];
  for(let dx=-1; dx<=1; dx++){
    for(let dy=-1; dy<=1; dy++){
      const cx = gx+dx, cy = gy+dy;
      if(isTileBuildable(cx, cy)) candidates.push([cx,cy]);
    }
  }
  if(!candidates.length) return;
  const [cx, cy] = candidates[Math.floor(Math.random()*candidates.length)];
  sceneryMap.set(cx+','+cy, {
    gx: cx, gy: cy, x: cx*TILE_SIZE+TILE_SIZE/2, y: cy*TILE_SIZE+TILE_SIZE/2,
    type: 'STICKS', isSuper: false, scale: 1, clearCost: 30, clearMs: 1200, goldYield: 0,
    woodYield: 0, stoneYield: 0, isClearing: false, clearStart: 0
  });
  invalidateSpawnFlags();
}
/* =========================================================
   SCENERY PLACEMENT AND ROAD-END GUARD
   ========================================================= */
// END-SCENERY-01: Trees and rocks spawn more often, and
// larger, near the spawn flags and the finish line, tapering to normal over END_SCENERY_RADIUS_TILES
// route tiles. The goal is to visually nudge building toward the middle of the road, leaving both
// ends open for the road to keep expanding without a stickman sitting in the way. Distance is measured
// along the route (path-tile index), not straight-line, so it tracks the winding road, not the map edge.
const END_SCENERY_RADIUS_TILES = 10;
const END_SCENERY_MAX_COVERAGE_BONUS = 0.7;
// LAG-SCENERY-01: pathEndProximity() scanned every route tile per call, and scenery placement calls it per cell (and per sort
// comparison), which grows quadratically as the road lengthens. Results are memoized per tile and thrown away whenever the route changes.
const pathEndProximityCache = new Map();
let pathEndProximityCacheSignature = '';
function pathEndProximity(gx, gy){
  if(!pathWaypointTiles || !pathWaypointTiles.length) return 0;
  const lastTile = pathWaypointTiles[pathWaypointTiles.length - 1];
  const signature = pathWaypointTiles.length + ':' + pathWaypointTiles[0].x + ',' + pathWaypointTiles[0].y + ':' + lastTile.x + ',' + lastTile.y;
  if(signature !== pathEndProximityCacheSignature){ pathEndProximityCache.clear(); pathEndProximityCacheSignature = signature; }
  const cacheKey = gx * 4096 + gy;
  const cached = pathEndProximityCache.get(cacheKey);
  if(cached !== undefined) return cached;
  const proximity = computePathEndProximity(gx, gy);
  pathEndProximityCache.set(cacheKey, proximity);
  return proximity;
}
function computePathEndProximity(gx, gy){
  let nearestRouteIndex = -1, nearestDistance = Infinity;
  for(let i=0; i<pathWaypointTiles.length; i++){
    const tile = pathWaypointTiles[i];
    const distance = Math.abs(tile.x-gx) + Math.abs(tile.y-gy);
    if(distance < nearestDistance){ nearestDistance = distance; nearestRouteIndex = i; }
  }
  if(nearestRouteIndex === -1) return 0;
  const stepsFromStart = nearestRouteIndex, stepsFromEnd = pathWaypointTiles.length - 1 - nearestRouteIndex;
  const stepsFromNearestEnd = Math.min(stepsFromStart, stepsFromEnd) + nearestDistance;
  return Math.max(0, 1 - stepsFromNearestEnd / END_SCENERY_RADIUS_TILES);
}
function sceneryPlanRandom(gx, gy, salt = 0){
  return createSeededRandom(waveSeedFor(waveRunSeed ^ 0x3c6ef372 ^ salt, Math.imul(gx,73856093) ^ Math.imul(gy,19349663)));
}
function spawnExtraEndScenery(cells, spawnedKeys){
  for(const [cx, cy] of cells){
    const key = cx+','+cy;
    if(spawnedKeys.has(key)) continue;
    const proximity = pathEndProximity(cx, cy);
    if(proximity > 0 && sceneryPlanRandom(cx,cy,11)() < proximity * END_SCENERY_MAX_COVERAGE_BONUS) spawnScenery(cx, cy);
  }
}
const SCENERY_FIRST_WAVE_INDEX = 1;
// HUT-CLEAR-01
function tileHasHut(gx, gy){
  for(const e of enemyPool){
    if(e.active && e.isHutBuilding && Math.floor(e.x/TILE_SIZE) === gx && Math.floor(e.y/TILE_SIZE) === gy) return true;
  }
  return false;
}
// END-RING-01: Size tiers for trees and rocks: the tiles touching a road end are the prime spots for the biggest pieces,
// other tiles near an end get medium pieces, and the middle of the road gets rare, small ones.
// SCENERY-GRADIENT-01: Trees and rocks shrink and thin out with distance from the road ends, and tiles the player has cleared rarely grow them again.
const END_RING_MIN_SIZE_FRAC = 0.85;
const TREE_ROCK_SIZE_FRAC_AT_MIDDLE = 0.08, TREE_ROCK_SIZE_FRAC_SLOPE = 0.55, TREE_ROCK_SIZE_FRAC_SPREAD = 0.25;
const TREE_ROCK_TREE_SHARE_ON_EXPANSION = 0.60, TREE_ROCK_MIN_KEEP_CHANCE = 0.10, HARVESTED_TILE_KEEP_FACTOR = 0.12;
const SCENERY_TREE_SHARE = 0.15 + 0.85*TREE_ROCK_TREE_SHARE_ON_EXPANSION; // about two thirds of ordinary scenery are trees, the rest rocks
const harvestedTileKeys = new Set();
const ROCK_SIZE_CLASS_FRAC = [0.2, 0.55, 0.9]; // small, medium, large — a rock is one of three even sizes and is never stretched
const ROCK_SIZE_FRAC_SPREAD = 0.6; // ROCK-VARIETY-01: rocks vary more in size than trees
function treeRockSizeFrac(proximity, type, rng = Math.random){
  const spread = type === 'ROCK' ? ROCK_SIZE_FRAC_SPREAD : TREE_ROCK_SIZE_FRAC_SPREAD;
  let sizeFrac = TREE_ROCK_SIZE_FRAC_AT_MIDDLE + TREE_ROCK_SIZE_FRAC_SLOPE * proximity + (rng() - 0.5) * spread;
  if(type === 'ROCK' && sizeFrac < 0) sizeFrac = -sizeFrac * 0.8; // reflect instead of piling every small rock onto the minimum size
  return clampNum(sizeFrac, 0, 1);
}
function treeRockKeepChance(proximity, tileKey){
  const gradient = TREE_ROCK_MIN_KEEP_CHANCE + (1 - TREE_ROCK_MIN_KEEP_CHANCE) * proximity * proximity;
  return harvestedTileKeys.has(tileKey) ? gradient * HARVESTED_TILE_KEEP_FACTOR : gradient;
}
const LOG_MAX_SCALE = 0.54; // LOG-SIZE-01: branches and logs never draw larger than a regular small log
const FIXED_SCENERY_SCALE = { CHEST: 0.48, COIN_POUCH: 0.95, BUSH: 0.68, BIRD_NEST: 0.22, PICNIC: 0.68 }; // the potted berry bush stays compact beside trees, rocks and chests
const SMALL_SCENERY_SIZE_MULTIPLIER = 0.5, SMALL_SCENERY_COST_MULTIPLIER = 0.5, SMALL_SCENERY_BUDDY_CHANCE = 0.5;
function smallSceneryHarvestCost(fullSizeCost){ return Math.max(1, Math.round(fullSizeCost * SMALL_SCENERY_COST_MULTIPLIER)); }
function isSceneryTileAvailable(gx,gy){
  if(gx<0 || gx>=COLS || gy<0 || gy>=ROWS) return false;
  const key=gx+','+gy;
  return !pathCells.has(key) && isInActiveRegion(gx,gy) && !sceneryMap.has(key) && !tileHasHut(gx,gy) && !towerPool.some(t=>t.active && t.gridX===gx && t.gridY===gy);
}
function repairMissingExpansionScenery(){
  if(expansionLevel<=0 || harvestedTileKeys.size || !sceneryGrowthAllowed()) return;
  for(const item of sceneryMap.values()) if(item.type==='TREE' || item.type==='ROCK') return;
  if(!pathWaypointTiles || pathWaypointTiles.length<2) return;
  for(const end of [pathWaypointTiles[0],pathWaypointTiles[pathWaypointTiles.length-1]]){ guardRoadEnd(end); topUpCloseGuard(end); }
}
function sceneryGrowthAllowed(){
  return waveIndex>=SCENERY_FIRST_WAVE_INDEX || expansionLevel>0;
}
function spawnScenery(gx, gy, forceType, forcedSizeFrac, smallOptions){
  if(sceneryMap.has(gx+','+gy)) return; // never replace an existing prop during ordinary expansion
  if(!forceType && !keepRoomToBuild(1)) return;
  if(!sceneryGrowthAllowed()) return;
  if(tileHasHut(gx, gy)) return; // FIRST-LEVEL-CLEAR-01: the opening wave is played on a clean map
  if(!forceType && isEndRingTile(gx, gy)) return; // RING-ONLY-BIG-01
  const rng = !forceType || forceType === 'TREE' || forceType === 'ROCK' ? sceneryPlanRandom(gx,gy) : Math.random;
  const S = CONFIG.SCENERY;
  const isSmallScenery = !!(smallOptions && smallOptions.small);
  const endProximity = pathEndProximity(gx, gy);
  let type;
  if(forceType){
    type = forceType;
  } else {
    // ONE-EVENT-PER-END-01: chests, supply crates and berry bushes are random events, placed one near each road end per expansion
    // by maybeSpawnRandomEventsOnExpansion(); the ordinary tile roll only grows trees and rocks.
    type = rng() < SCENERY_TREE_SHARE ? 'TREE' : 'ROCK'; // EXPANSION-SCENERY-BALANCE-01
    if(rng() >= treeRockKeepChance(endProximity, gx + ',' + gy)) return;
  }
  if(type==='BUSH'){ for(const item of sceneryMap.values()) if(item.type==='BUSH') return; }
  const chanceDefinition = CONFIG.CHANCE_STRUCTURES[type];
  const isTreeOrRock = type === 'TREE' || type === 'ROCK';
  if(isTreeOrRock && forcedSizeFrac === undefined) forcedSizeFrac = treeRockSizeFrac(endProximity, type, rng);
  if(type === 'ROCK' && forcedSizeFrac !== undefined) forcedSizeFrac = ROCK_SIZE_CLASS_FRAC[Math.min(ROCK_SIZE_CLASS_FRAC.length - 1, Math.floor(forcedSizeFrac * ROCK_SIZE_CLASS_FRAC.length))]; // ROCK-SIZES-01
  const isSuper = !chanceDefinition && !isTreeOrRock && FIXED_SCENERY_SCALE[type] === undefined && rng() < S.superChance;
  const baseScaleRoll = S.minScale + rng()*(S.maxScale-S.minScale);
  const endBiasedScale = baseScaleRoll + (S.maxScale - baseScaleRoll) * endProximity;
  const regularScale = type === 'MUSHROOMS' ? rollMushroomScale(rng) : chanceDefinition ? chanceDefinition.scale : FIXED_SCENERY_SCALE[type] !== undefined ? FIXED_SCENERY_SCALE[type] : (isSuper ? S.maxScale : forcedSizeFrac !== undefined ? S.minScale + forcedSizeFrac*(S.maxScale-S.minScale) : Math.max(baseScaleRoll, endBiasedScale));
  const scale = isSmallScenery && Number.isFinite(smallOptions.scale) ? smallOptions.scale : regularScale;
  const sizeFrac = clampNum((scale - S.minScale) / (S.maxScale - S.minScale), 0, 1);
  const priceScale = isSmallScenery ? Math.min(S.maxScale, scale / SMALL_SCENERY_SIZE_MULTIPLIER) : scale;
  const priceSizeFrac = clampNum((priceScale - S.minScale) / (S.maxScale - S.minScale), 0, 1);
  const baseYield = Math.round(S.baseResourceYield * scale) * (isSuper ? S.superYieldMultiplier : 1);

  let clearCost = Math.round(S.minClearCost + priceSizeFrac*(S.maxClearCost-S.minClearCost));
  if(type === 'ROCK') clearCost = Math.round(clearCost * S.rockClearCostMult);
  if(isSmallScenery) clearCost = smallSceneryHarvestCost(clearCost);
  let clearMs = isSuper ? S.superClearMs : Math.round(S.minClearMs + sizeFrac*(S.maxClearMs-S.minClearMs));
  let goldYield = 0;
  if(type === 'BUSH'){ clearCost = 0; clearMs = 0; } // POTTED-BUSH-FREE-01
  if(EVENT_PROP_EMOJI[type]){ clearCost = 0; clearMs = 500; }
  if(type === 'SUPPLY_CRATE'){ clearCost = 0; clearMs = 0; } // CLICK-OPEN-FREE-01: cardboard boxes open free on the click.
  if(type === 'CHEST'){ clearCost = 0; clearMs = 500; goldYield = 40 + Math.floor(rng()*90); }
  if(type === 'ITEM'){ clearCost = 0; clearMs = 500; }
  if(type === 'COIN_POUCH'){ clearCost = 0; clearMs = 500; }
  if(chanceDefinition){ clearCost = 0; clearMs = chanceDefinition.useMs; }

  sceneryMap.set(gx+','+gy, {
    isChanceStructure: !!chanceDefinition, healPool: chanceDefinition ? chanceDefinition.healLives : 0, fuel: type === 'CAMPFIRE' ? CAMPFIRE_START_FUEL : 0,
    gx, gy, x: gx*TILE_SIZE+TILE_SIZE/2, y: gy*TILE_SIZE+TILE_SIZE/2,
    type, isSuper, isSmallScenery, scale, clearCost, clearMs, goldYield, mushroomSizeVersion: type === 'MUSHROOMS' ? 1 : undefined,
    tallStretch: type === 'TREE' && rng() < 0.25 ? 1.15 + rng()*0.4 : 1,
    // SCENERY-VARIETY-01: trees vary in variant, height and width; trees and rocks may be mirrored.
    variant: type === 'TREE' ? rollTreeVariant(gx, gy, rng) : 0, flip: (type === 'TREE' || type === 'ROCK') && rng() < 0.5,
    widthStretch: type === 'TREE' ? 0.9 + rng()*0.28 : 1,
    woodYield: type === 'TREE' ? baseYield : 0,
    stoneYield: type === 'ROCK' ? baseYield : 0,
    isClearing: false, clearStart: 0
  });
  normalizeSceneryHarvest(sceneryMap.get(gx+','+gy));
  invalidateSpawnFlags();
  if(!isSmallScenery && isTreeOrRock && scale >= 1.05 && rng() < SMALL_SCENERY_BUDDY_CHANCE){
    const neighbours = [];
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++){
      if(dx === 0 && dy === 0) continue;
      const nx = gx + dx, ny = gy + dy;
      if(isEndRingTile(nx, ny) || !isSceneryTileAvailable(nx, ny) || tileHasHut(nx, ny)) continue;
      neighbours.push([nx, ny]);
    }
    if(neighbours.length){
      const [smallX, smallY] = neighbours[Math.floor(rng()*neighbours.length)];
      spawnScenery(smallX, smallY, type, undefined, { small:true, scale:scale*SMALL_SCENERY_SIZE_MULTIPLIER });
    }
  }
}
// END-GUARD-01: Both ends of the road (the spawn flags and the finish line)
// are guarded by large, expensive rocks and trees so the player is discouraged from building beside them and
// walling off the lane; paying to clear one is the player's option for expanding into that space. Idempotent:
// it tops each road end up to END_GUARD_MIN_PIECES nearby pieces, nearest tiles first, once per distinct end tile
// (guardedRoadEndKeys), so it can run after every wave and expansion, guards each new end as the road grows, and
// never re-fills space the player has paid to clear.
const END_GUARD_RADIUS_TILES = 3;
const END_GUARD_MIN_PIECES = 6;
const END_GUARD_MIN_SIZE_FRAC = 0.4, END_GUARD_MAX_SIZE_FRAC = 0.7;
const END_GUARD_ROCK_SHARE = 0.40;
function pieceCountNearTile(tile, radiusTiles){
  let count = 0;
  for(const item of sceneryMap.values()){
    if(item.isChanceStructure) continue;
    if(Math.abs(item.gx - tile.x) + Math.abs(item.gy - tile.y) <= radiusTiles) count++;
  }
  return count;
}
const guardedRoadEndKeys = new Set();
function guardRoadEnd(endTile){
  const rng = sceneryPlanRandom(endTile.x,endTile.y,21);
  const endKey = endTile.x + ',' + endTile.y;
  if(guardedRoadEndKeys.has(endKey)) return;
  guardedRoadEndKeys.add(endKey);
  let existing = pieceCountNearTile(endTile, END_GUARD_RADIUS_TILES);
  if(existing >= END_GUARD_MIN_PIECES) return;
  const candidates = [];
  for(let gx = endTile.x - END_GUARD_RADIUS_TILES; gx <= endTile.x + END_GUARD_RADIUS_TILES; gx++){
    for(let gy = endTile.y - END_GUARD_RADIUS_TILES; gy <= endTile.y + END_GUARD_RADIUS_TILES; gy++){
      const distance = Math.abs(gx - endTile.x) + Math.abs(gy - endTile.y);
      if(distance === 0 || distance > END_GUARD_RADIUS_TILES) continue;
      if(!isSceneryTileAvailable(gx, gy)) continue;
      candidates.push({ gx, gy, distance, tieBreak: rng() });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.tieBreak - b.tieBreak);
  for(const spot of candidates){
    if(existing >= END_GUARD_MIN_PIECES) break;
    const type = rng() < END_GUARD_ROCK_SHARE ? 'ROCK' : 'TREE';
    const sizeFrac = END_GUARD_MIN_SIZE_FRAC + rng() * (END_GUARD_MAX_SIZE_FRAC - END_GUARD_MIN_SIZE_FRAC);
    spawnScenery(spot.gx, spot.gy, type, sizeFrac);
    if(sceneryMap.has(spot.gx + ',' + spot.gy)) existing++;
  }
}
// END-CLOSE-GUARD-01: Every wave, each road end keeps at least this many big pieces within two tiles
// so a tower can never wall off the flags or the finish line.
const END_CLOSE_GUARD_RADIUS_TILES = 2, END_CLOSE_GUARD_MIN_PIECES = 3;
function topUpCloseGuard(endTile){
  const rng = sceneryPlanRandom(endTile.x,endTile.y,22);
  let near = pieceCountNearTile(endTile, END_CLOSE_GUARD_RADIUS_TILES);
  if(near >= END_CLOSE_GUARD_MIN_PIECES) return;
  const candidates = [];
  for(let gx = endTile.x - END_CLOSE_GUARD_RADIUS_TILES; gx <= endTile.x + END_CLOSE_GUARD_RADIUS_TILES; gx++){
    for(let gy = endTile.y - END_CLOSE_GUARD_RADIUS_TILES; gy <= endTile.y + END_CLOSE_GUARD_RADIUS_TILES; gy++){
      const distance = Math.abs(gx - endTile.x) + Math.abs(gy - endTile.y);
      if(distance === 0 || distance > END_CLOSE_GUARD_RADIUS_TILES) continue;
      if(!isSceneryTileAvailable(gx, gy) || tileHasHut(gx, gy)) continue;
      candidates.push({ gx, gy, distance, tieBreak: rng() });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.tieBreak - b.tieBreak);
  for(const spot of candidates){
    if(near >= END_CLOSE_GUARD_MIN_PIECES) break;
    spawnScenery(spot.gx, spot.gy, rng() < END_GUARD_ROCK_SHARE ? 'ROCK' : 'TREE', END_GUARD_MIN_SIZE_FRAC + rng() * (END_GUARD_MAX_SIZE_FRAC - END_GUARD_MIN_SIZE_FRAC));
    if(sceneryMap.has(spot.gx + ',' + spot.gy)) near++;
  }
}
// A tile is in an end ring when it touches a road end on a side and is not route itself.
function isEndRingTile(gx, gy){
  if(!pathWaypointTiles || pathWaypointTiles.length < 2 || pathCells.has(gx + ',' + gy)) return false;
  const startTile = pathWaypointTiles[0], finishTile = pathWaypointTiles[pathWaypointTiles.length - 1];
  return Math.abs(gx - startTile.x) + Math.abs(gy - startTile.y) === 1 || Math.abs(gx - finishTile.x) + Math.abs(gy - finishTile.y) === 1;
}
function endRingTiles(endTile){
  const tiles = [];
  for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
    const gx = endTile.x + dx, gy = endTile.y + dy;
    if(!pathCells.has(gx + ',' + gy)) tiles.push({ gx, gy });
  }
  return tiles;
}
function fillEndRing(endTile){
  const rng = sceneryPlanRandom(endTile.x,endTile.y,23); // the tiles touching a road end always hold a prime-size piece; a tile a tower or hut occupies is skipped
  for(const tile of endRingTiles(endTile)){
    const key = tile.gx + ',' + tile.gy;
    if(!isInActiveRegion(tile.gx, tile.gy)) continue;
    const existing = sceneryMap.get(key);
    const isBigTreeOrRock = existing && (existing.type === 'TREE' || existing.type === 'ROCK') && (existing.scale - CONFIG.SCENERY.minScale) / (CONFIG.SCENERY.maxScale - CONFIG.SCENERY.minScale) >= END_RING_MIN_SIZE_FRAC;
    if(existing && !existing.isClearing && !existing.isChanceStructure && !isBigTreeOrRock) sceneryMap.delete(key); // a bush, crate or smaller piece that landed on a ring tile is replaced by a prime-size tree or rock
    if(!isSceneryTileAvailable(tile.gx, tile.gy) || tileHasHut(tile.gx, tile.gy)) continue;
    spawnScenery(tile.gx, tile.gy, rng() < END_GUARD_ROCK_SHARE ? 'ROCK' : 'TREE', END_RING_MIN_SIZE_FRAC + rng() * (1 - END_RING_MIN_SIZE_FRAC));
  }
}
function ensureEndGuardScenery(){
  if(!sceneryGrowthAllowed() || !pathWaypointTiles || pathWaypointTiles.length < 2) return;
  const startTile = pathWaypointTiles[0], finishTile = pathWaypointTiles[pathWaypointTiles.length - 1];
  fillEndRing(startTile);
  fillEndRing(finishTile);
  guardRoadEnd(startTile);
  guardRoadEnd(finishTile);
  topUpCloseGuard(startTile);
  topUpCloseGuard(finishTile);
}
// BRANCH-EMOJI-01: a branch is one to three small leafless-tree glyphs lying at random angles.
const BRANCH_GLYPH = '🪾';
function branchRandomFor(piece, variant){
  const tileHash = piece ? (Number.isFinite(piece.gx) ? (piece.gx*73856093) ^ (piece.gy*19349663) : (Math.round(piece.x)*73856093) ^ (Math.round(piece.y)*19349663)) : 0;
  let state = (tileHash ^ (variant*83492791)) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
const BRANCH_SPREAD_MIN = 0.36, BRANCH_SPREAD_RANGE = 0.16;
function drawBranchSprite(ctx, size, color, piece, variant = 0){
  const random = branchRandomFor(piece, variant), glyphCount = 1 + Math.floor(random()*3), slotStart = random()*Math.PI*2;
  for(let glyph = 0; glyph < glyphCount; glyph++){
    // BRANCH-SPREAD-01: each stick takes its own slot around the spot instead of piling on the others.
    const slotAngle = slotStart + glyph*Math.PI*2/glyphCount + (random() - 0.5)*0.6, spread = glyphCount > 1 ? size*(BRANCH_SPREAD_MIN + random()*BRANCH_SPREAD_RANGE) : 0;
    const glyphSize = size*(0.34 + random()*0.2), offsetX = Math.cos(slotAngle)*spread, offsetY = Math.sin(slotAngle)*spread*0.7, angle = slotAngle + Math.PI/2 + (random() - 0.5)*0.8, mirrored = random() < 0.5;
    ctx.save();
    ctx.translate(offsetX, offsetY); ctx.rotate(angle); if(mirrored) ctx.scale(-1, 1);
    drawEmojiSprite(ctx, BRANCH_GLYPH, glyphSize);
    ctx.restore();
  }
}
// A free, click-to-collect branch lying off the grass: 5 to 10 wood.
function makeBranchPiece(gx, gy, rng){
  const scale = 0.42 + rng()*0.12;
  return { gx, gy, x: (gx + 0.5)*TILE_SIZE, y: (gy + 0.5)*TILE_SIZE, type: 'BRANCH', scale, tallStretch: 1, widthStretch: 1, flip: false, isSuper: false,
    clearCost: 0, clearMs: 0, woodYield: 5 + Math.floor(rng()*6), stoneYield: 0, isClearing: false, clearStart: 0 };
}
function spawnOutsideBranches(count){
  const ends=[pathWaypointTiles[0],pathWaypointTiles[pathWaypointTiles.length-1]];
  for(let n=0;n<count;n++) for(let attempt=0;attempt<30;attempt++){
    const end=ends[n%2],gx=end.x+Math.floor(Math.random()*9)-4,gy=end.y+Math.floor(Math.random()*9)-4,key=gx+','+gy;
    if(gx<1 || gy<1 || gx>=COLS-1 || gy>=ROWS-1 || pathCells.has(key) || nearPathTileSet.has(key) || bonusGrassTiles.has(key) || sceneryMap.has(key) || towerPool.some(t=>t.active && t.gridX===gx && t.gridY===gy)) continue;
    const branch = makeBranchPiece(gx, gy, Math.random);
    branch.revealBornAt = presentationTime;
    sceneryMap.set(key, branch);
    break;
  }
}
function spawnWastelandStumps(){
  const candidates=[],start=pathWaypointTiles[0];
  const cx=(activeRegion.x0+activeRegion.x1+1)*TILE_SIZE/2,cy=(activeRegion.y0+activeRegion.y1+1)*TILE_SIZE/2;
  const openingZoom=Math.min(FIT_MAX_ZOOM,Math.max(MIN_ZOOM,Math.min(CANVAS_W/(2*TILE_SIZE),CANVAS_H/(2*TILE_SIZE))*0.8));
  const halfX=CANVAS_W/(2*openingZoom)-TILE_SIZE*0.35;
  const halfY=Math.max(TILE_SIZE*1.6,(CANVAS_H/2-70)/openingZoom-TILE_SIZE*0.35);
  for(let gx=1;gx<COLS-1;gx++) for(let gy=1;gy<ROWS-1;gy++){
    const key=gx+','+gy,x=(gx+0.5)*TILE_SIZE,y=(gy+0.5)*TILE_SIZE,distance=Math.hypot(x-cx,y-cy)/TILE_SIZE;
    if(isInActiveRegion(gx,gy) || nearPathTileSet.has(key) || bonusGrassTiles.has(key) || pathCells.has(key) || sceneryMap.has(key) || distance<1.5 || distance>6 || Math.abs(x-cx)>halfX || Math.abs(y-cy)>halfY) continue;
    candidates.push({gx,gy,priority:distance*(0.6+0.4*sceneryPlanRandom(gx,gy,71)())});
  }
  candidates.sort((a,b)=>b.priority-a.priority);
  let placed=0,first=null;
  for(const {gx,gy} of candidates){
    if(first && Math.hypot(gx-first[0],gy-first[1])<2) continue;
    sceneryMap.set(gx + ',' + gy, makeBranchPiece(gx, gy, sceneryPlanRandom(gx, gy, 72)));
    if(!first) first=[gx,gy];
    if(++placed===2) break;
  }
}
let stumpSpriteCanvas=null;
function drawStumpSprite(ctx,size){
  if(!stumpSpriteCanvas){
    stumpSpriteCanvas=document.createElement('canvas');stumpSpriteCanvas.width=64;stumpSpriteCanvas.height=64;
    const m=stumpSpriteCanvas.getContext('2d');m.translate(32,32);drawStumpShape(m,40);
  }
  ctx.drawImage(stumpSpriteCanvas,-size*0.5,-size*0.5,size,size);
}
function drawStumpShape(ctx,size){
  ctx.fillStyle='#69432d';ctx.beginPath();ctx.ellipse(0,size*0.22,size*0.36,size*0.19,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#805334';ctx.fillRect(-size*0.26,-size*0.12,size*0.52,size*0.37);
  ctx.fillStyle='#bc9662';ctx.beginPath();ctx.ellipse(0,-size*0.12,size*0.27,size*0.16,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#8d663e';ctx.lineWidth=Math.max(0.7,size*0.025);
  ctx.beginPath();ctx.ellipse(0,-size*0.12,size*0.16,size*0.09,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,-size*0.12,size*0.07,size*0.04,0,0,Math.PI*2);ctx.stroke();
}
// SCENERY-CORRIDOR-01: the active region's bounding rectangle includes plain dirt outside the near-path corridor, so scenery and flora only take
// tiles that are in the active region proper and off the road.
function activeGrassCells(){
  const cells = [];
  for(let gx=activeRegion.x0; gx<=activeRegion.x1; gx++){
    for(let gy=activeRegion.y0; gy<=activeRegion.y1; gy++) if(!pathCells.has(gx+','+gy) && isInActiveRegion(gx, gy)) cells.push([gx,gy]);
  }
  return cells;
}
function generateScenery(){
  placingCampfire=false; if(cookingDialog && cookingDialog.open) cookingDialog.close();
  sceneryMap.clear();
  guardedRoadEndKeys.clear();
  harvestedTileKeys.clear();
  invalidateSpawnFlags();
  clearingScenery.length = 0;
  const cells = activeGrassCells();
  shuffleArray(cells, sceneryPlanRandom(activeRegion.x0,activeRegion.y0,31 + expansionLevel));
  const count = Math.floor(cells.length * CONFIG.SCENERY.coverage);
  const spawnedKeys = new Set();
  for(let i=0; i<count; i++){ spawnScenery(cells[i][0], cells[i][1]); spawnedKeys.add(cells[i][0]+','+cells[i][1]); }
  spawnExtraEndScenery(cells, spawnedKeys);
  spawnWastelandStumps();
  for(let n=0;n<4;n++) maybeSpawnAmbientLog();
}
// FLORA-GROWTH-01: HIGH graphics only: flora is drawn live instead of being baked into the
// static map, so seedlings can bounce up and grow into their flower. Low graphics keeps the baked, static flora (drawMap()).
// Flora present at game start is fully grown; flora added by a map expansion grows in over FLORA_GROW_MS.
const FLORA_GROW_MS = 5000;
const FLORA_GROW_STAGGER_MS = 3000;
const FLORA_SEEDLING_STAGE_END = 0.45; // share of the growth spent as a seedling before the real glyph pops in
const FLORA_SEEDLING_GLYPH = '🌿';
function easeOutBack(t){ const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*Math.pow(t-1, 3) + c1*Math.pow(t-1, 2); }
function drawAnimatedFlora(ctx, bounds){
  if(CONFIG.FLORA.coverage <= 0) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const item of floraMap.values()){
    if(pendingRevealTileKeys.has(item.gx+','+item.gy)) continue;
    const x = item.x + item.offX, y = item.y + item.offY;
    if(!fxVisible(x, y, bounds)) continue;
    const grown = presentationTime - item.growStartAt;
    const growth = grown >= FLORA_GROW_MS ? 1 : Math.max(0, grown / FLORA_GROW_MS);
    if(growth <= 0) continue;
    const isSeedling = growth < FLORA_SEEDLING_STAGE_END && item.glyph !== FLORA_SEEDLING_GLYPH;
    const stageProgress = isSeedling ? growth / FLORA_SEEDLING_STAGE_END : (growth - (item.glyph === FLORA_SEEDLING_GLYPH ? 0 : FLORA_SEEDLING_STAGE_END)) / (item.glyph === FLORA_SEEDLING_GLYPH ? 1 : 1 - FLORA_SEEDLING_STAGE_END);
    const scale = growth >= 1 ? 1 : Math.max(0.05, easeOutBack(Math.min(1, stageProgress)));
    const sway = Math.sin(presentationTime/1400 + item.swayPhase) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(item.rotDeg * Math.PI/180 + sway);
    ctx.scale(scale, scale);
    drawEmojiSprite(ctx, isSeedling ? FLORA_SEEDLING_GLYPH : item.glyph, TILE_SIZE*0.42*item.sizeFrac);
    ctx.restore();
  }
}
function spawnFlora(gx, gy, animateGrowth){
  if(CONFIG.FLORA.coverage <= 0) return;
  const F = CONFIG.FLORA;
  const isAccent = Math.random() < F.accentShare;
  const pool = isAccent ? F.ACCENT : F.COMMON;
  const glyph = pool[Math.floor(Math.random()*pool.length)];
  floraMap.set(gx+','+gy, {
    gx, gy, x: gx*TILE_SIZE+TILE_SIZE/2, y: gy*TILE_SIZE+TILE_SIZE/2, glyph, isAccent,
    rotDeg: Math.round(Math.random()*360),
    offX: Math.round((Math.random()*2-1) * TILE_SIZE*0.22),
    offY: Math.round((Math.random()*2-1) * TILE_SIZE*0.22),
    growStartAt: animateGrowth ? presentationTime + Math.random()*FLORA_GROW_STAGGER_MS : -Infinity, swayPhase: Math.random()*Math.PI*2,
    sizeFrac: 0.45 + Math.random()*0.3 // 45% to 75% of the base glyph size
  });
}
function generateFlora(){
  floraMap.clear();
  const cells = activeGrassCells();
  shuffleArray(cells);
  const count = Math.floor(cells.length * CONFIG.FLORA.coverage);
  for(let i=0; i<count; i++) spawnFlora(cells[i][0], cells[i][1]);
}
function seedStartingBarricades(){
  // STARTING-BARRICADE-01
  const pathTiles = pathWaypointTiles;
  if(pathTiles.length < 2) return;
  const spot = pathTiles[pathTiles.length - 1];
  const t = acquireActive(towerPool);
  if(!t) return;
  t.create('BARRICADE', spot.x, spot.y); // full 10 HP, same as any player-built barricade
}
function scatterFloraInRing(oldRegion, newRegion, newlyRevealedKeys){
  const cells = [];
  for(let gx=newRegion.x0; gx<=newRegion.x1; gx++){
    for(let gy=newRegion.y0; gy<=newRegion.y1; gy++){
      const wasActive = gx>=oldRegion.x0 && gx<=oldRegion.x1 && gy>=oldRegion.y0 && gy<=oldRegion.y1;
      if(newlyRevealedKeys ? !newlyRevealedKeys.has(gx+','+gy) : wasActive) continue;
      if(pathCells.has(gx+','+gy)) continue;
      if(!isInActiveRegion(gx, gy)) continue; // SCENERY-CORRIDOR-01: flora never lands outside the green corridor
      if(towerPool.some(t => t.active && t.gridX===gx && t.gridY===gy)) continue;
      cells.push([gx,gy]);
    }
  }
  shuffleArray(cells);
  const count = Math.floor(cells.length * CONFIG.FLORA.coverage);
  for(let i=0; i<count; i++) spawnFlora(cells[i][0], cells[i][1], true);
}
const TREE_SURGE_WAVES = [3, 4, 5];
const ROCK_SURGE_WAVES = [2, 3, 4];
function maybeSpawnMoreScenery(){
  ensureEndGuardScenery();
  const upcomingWave = waveIndex + 1; // this runs in the IDLE gap right before that wave starts
  const isTreeSurge = TREE_SURGE_WAVES.includes(upcomingWave);
  const isRockSurge = ROCK_SURGE_WAVES.includes(upcomingWave);
  if(!isTreeSurge && !isRockSurge && Math.random() >= CONFIG.SCENERY.respawnChancePerWave) return;
  const empties = [];
  for(let gx=activeRegion.x0; gx<=activeRegion.x1; gx++){
    for(let gy=activeRegion.y0; gy<=activeRegion.y1; gy++){
      if(isSceneryTileAvailable(gx,gy) && (!harvestedTileKeys.has(gx + ',' + gy) || Math.random() < HARVESTED_TILE_KEEP_FACTOR)) empties.push([gx,gy]);
    }
  }
  if(!empties.length) return;
  shuffleArray(empties);
  empties.sort((a, b) => pathEndProximity(b[0], b[1]) - pathEndProximity(a[0], a[1]));
  const n = (isTreeSurge || isRockSurge)
    ? Math.max(0, Math.min(empties.length - 1, 4 + Math.floor(Math.random()*4))) // 4-7, capped to leave >=1 tile open
    : Math.min(empties.length, 1 + Math.floor(Math.random()*2));
  const forceType = isTreeSurge ? 'TREE' : isRockSurge ? 'ROCK' : undefined;
  for(let i=0; i<n; i++){
    const smallRock = isRockSurge ? 0.08 + Math.random()*0.20 : undefined;
    spawnScenery(empties[i][0], empties[i][1], forceType, smallRock, isRockSurge ? { small:true } : undefined);
  }
}
function isInstantOpenProp(item){
  return ['SUPPLY_CRATE','CHEST','PICNIC','COIN_POUCH','ITEM','STUMP','BRANCH','BUSH','MUSHROOMS'].includes(item.type); // MUSHROOM-INSTANT-01
}
function rollMushroomScale(rng = Math.random){
  const tier = rng(), size = rng();
  return tier < 0.85 ? 0.6+size*0.09 : tier < 0.97 ? 0.8+size*0.35 : 1.35+size*0.25;
}
function mushroomHarvestCount(item){
  const scale=clampNum(item.scale || CONFIG.SCENERY.minScale,CONFIG.SCENERY.minScale,CONFIG.SCENERY.maxScale);
  return scale<=1 ? Math.round(3+2*(scale-CONFIG.SCENERY.minScale)/(1-CONFIG.SCENERY.minScale)) : Math.round(5+5*(scale-1)/(CONFIG.SCENERY.maxScale-1));
}
function normalizeSceneryHarvest(item){
  if(item.type==='STUMP'){item.type='BRANCH';item.woodYield=5+Math.floor(sceneryPlanRandom(item.gx,item.gy,73)()*6);item.stoneYield=0;}
  if(item.type==='BRANCH'){item.clearCost=0;item.clearMs=0;} 
  if(isInstantOpenProp(item)){item.clearCost=0;item.clearMs=0;}
  if(item.type==='MUSHROOMS'){
    if(item.mushroomSizeVersion !== 1){if(!item.isClearing) item.scale=rollMushroomScale(sceneryPlanRandom(item.gx,item.gy,159));item.mushroomSizeVersion=1;}
    item.scale=clampNum(item.scale || CONFIG.SCENERY.minScale,CONFIG.SCENERY.minScale,CONFIG.SCENERY.maxScale);
    item.clearCost=0;item.clearMs=0;
  }
}
function sceneryClearCost(item){
  if(isInstantOpenProp(item)) return 0;
  let cost = item.clearCost;
  if(item.type === 'TREE' && towerPool.some(t => t.active && t.type === 'AXEMAN')) cost = Math.ceil(cost * 0.25); // Axeman: cutting trees 75% off
  if(item.type === 'ROCK' && towerPool.some(t => t.active && t.type === 'HAMMERMAN')) cost = Math.ceil(cost * 0.5); // Hammerman: mining rocks 50% off
  return cost;
}
function startClearingScenery(item){
  if(item.isClearing || sceneryMap.get(item.gx+','+item.gy) !== item) return;
  normalizeSceneryHarvest(item);
  const cost = sceneryClearCost(item);
  if(gold < cost){
    spawnFloatingText(item.x, item.y - 20, 'Not enough gold', '#e63946');
    return;
  }
  gold -= cost;
  item.isClearing = true;
  item.clearStart = presentationTime; // GAME-SPEED-SCOPE-01: real time, so 1x/2x/3x/5x/10x never shortens how long clearing actually takes
  rebuildClearingScenery();
  if(isInstantOpenProp(item)) updateScenery(0); else playSound('chop');
  updateHUD();
}
// Bags of gold sized to the wave: 15 + 4 per wave, give or take 20%, laid out side by side.
function dropTreasureBags(x, y, count){
  for(let bagIndex = 0; bagIndex < count; bagIndex++){
    const bagGold = Math.floor((15 + waveIndex*4) * (0.8 + Math.random()*0.4));
    dropGoldBag(x + (bagIndex - (count - 1)/2)*16, y, bagGold);
  }
}
function dropBerries(x, y, count){
  for(let berry = 0; berry < count; berry++){
    const berryId = drawFromShuffleBag(BERRY_FOOD_IDS), angle = berry / count * Math.PI * 2;
    spawnGroundItem(x + Math.cos(angle)*12, y - 4 + Math.sin(angle)*8, FOOD_BY_ID.get(berryId), 'scenery');
  }
}
function grantEventProp(item){
  const x = item.x, y = item.y;
  const dropFood = (count, pool) => { for(let n = 0; n < count; n++){ const food = pool[Math.floor(Math.random()*pool.length)]; const angle = n/count*Math.PI*2; spawnGroundItem(x + Math.cos(angle)*12, y - 4 + Math.sin(angle)*8, food, 'scenery'); } };
  const anyFood = [...FOOD_BY_ID.values()].filter(food => food && food.isFood);
  const berries = BERRY_FOOD_IDS.map(id => FOOD_BY_ID.get(id)).filter(Boolean);
  if(item.type === 'PICNIC'){
    // a picnic basket is food only: one meat, one fruit and one vegetable, so it raises Constitution, INT and DEX
    for(const [n, kind] of ['MEAT', 'FRUIT', 'VEGETABLE'].entries()){ const angle = n/3*Math.PI*2; spawnGroundItem(x + Math.cos(angle)*12, y - 4 + Math.sin(angle)*8, pickFoodOfKind(kind), 'scenery'); }
  } else if(item.type === 'WOODPILE'){
    const amount = 30 + Math.floor(Math.random()*31); wood += amount; launchGoldHudFlight(x,y,'🪵'); spawnFloatingText(x, y - 22, '+🪵' + amount, '#c8a46a'); updateHUD();
  } else if(item.type === 'BIRD_NEST'){
    spawnChestCoinFountain(x, y - 6, 18 + Math.floor(Math.random()*26));
    if(Math.random() < 0.2) dropFood(1, berries);
  } else if(item.type === 'MUSHROOMS'){
    dropFood(mushroomHarvestCount(item), [FOOD_BY_ID.get('MUSHROOM')]); // MUSHROOM-PATCH-01: a mushroom patch drops mushrooms (a vegetable, so DEX), never broccoli or garlic
  }
  spawnParticles(x, y, '#ffe082', 10);
  playSound('wave');
}
function updateScenery(dt){
  for(let i = 0; i < clearingScenery.length;){
    const [key, item] = clearingScenery[i];
    let keepItemAfterUse = false;
    if(sceneryMap.get(key) !== item || !item.isClearing){
      clearingScenery.splice(i, 1);
      continue;
    }
    if(presentationTime - item.clearStart < item.clearMs){ i++; continue; }
    if(!item.isChanceStructure){ harvestedTileKeys.add(key); trackGameEvent('scenery_cleared', { scenery_type: item.type }); }
    if(item.isChanceStructure){
      keepItemAfterUse = !useChanceStructure(item);
    } else if(item.type === 'BUSH'){
      dropBerries(item.x, item.y, 2 + Math.floor(Math.random()*2));
    } else if(EVENT_PROP_EMOJI[item.type]){
      grantEventProp(item); // EVENT-VARIETY-01
    } else if(item.type === 'SUPPLY_CRATE'){
      const stim = Math.random() < SUMMON_FROM_CRATE_CHANCE ? rollSummonItem() : rollStimItem();
      spawnGroundItem(item.x, item.y - 4, stim, 'scenery');
      spawnFloatingText(item.x, item.y - 24, stim.icon + ' ' + stim.name, '#7dd3fc', ITEM_POPUP_LIFE_MS);
      spawnParticles(item.x, item.y, '#b0895a', 8);
      playSound('crate_open', item.x, undefined, item.y);
    } else if(item.type === 'CHEST'){
      { // CHEST-LOOT-01
        // gold bag (25%), two gold bags (5%), a stim (12%) or a handful of berries (13%), so a bag comes out of only 30% of chests and no two chests feel the same.
        const lootRoll = Math.random();
        if(lootRoll < 0.45){ spawnChestCoinFountain(item.x, item.y - 6, item.goldYield); }
        else if(lootRoll < 0.70){ spawnChestCoinFountain(item.x, item.y - 6, item.goldYield); dropTreasureBags(item.x, item.y, 1); }
        else if(lootRoll < 0.75){ dropTreasureBags(item.x, item.y, 2); }
        else if(lootRoll < 0.87){ const stim = rollStimItem(); spawnGroundItem(item.x, item.y - 4, stim, 'scenery'); spawnFloatingText(item.x, item.y - 24, stim.icon + ' ' + stim.name, '#7dd3fc', ITEM_POPUP_LIFE_MS); }
        else dropBerries(item.x, item.y, 2 + Math.floor(Math.random()*2));
      }
      if(Math.random() < 0.25){
        const dessert=drawFromShuffleBag(TREAT_ITEMS);
        spawnGroundItem(item.x,item.y-4,dessert,'chest dessert');
        spawnFloatingText(item.x,item.y-24,dessert.icon+' '+dessert.name,'#7dd3fc',ITEM_POPUP_LIFE_MS);
      }
      spawnParticles(item.x, item.y, '#ffd700', 12);
      playSound('chest_open', item.x, undefined, item.y);
      if(Math.random() < 0.08){
        spawnGroundItem(item.x, item.y - 4, LUCKY_BRANCH, 'scenery');
        spawnFloatingText(item.x, item.y - 36, '🌿 Sturdy Branch!', '#8bc34a');
      }
    } else if(item.type === 'COIN_POUCH'){ // legacy saves only; never generated any more
      dropTreasureBags(item.x, item.y, 1 + Math.floor(Math.random()*3)); // TREASURE-CHEST-BAGS-01: always one to three cash bags
      spawnParticles(item.x, item.y, '#ffd700', 10);
      playSound('wave');
    } else if(item.type === 'ITEM'){
      const p = drawFromShuffleBag(PASSIVE_UPGRADES);
      globalPassiveCounts[p.id] = (globalPassiveCounts[p.id]||0) + 1;
      for(const t of towerPool) if(t.active) t.recomputeStats();
      spawnFloatingText(item.x, item.y - 20, '✨ ' + p.name, '#a78bfa');
      spawnParticles(item.x, item.y, '#a78bfa', 12);
      playSound('wave');
    } else if(item.type === 'STICKS'){
      spawnFloatingText(item.x, item.y - 20, 'Cleared!', '#c9a86a');
      spawnParticles(item.x, item.y, '#8a5a2b', 8);
      playSound('death');
    } else {
      wood += item.woodYield;
      if(item.woodYield) launchGoldHudFlight(item.x,item.y,'🪵');
      stone += item.stoneYield;
      let msg = '';
      if(item.woodYield) msg += '+' + item.woodYield + '🪵 ';
      if(item.stoneYield) msg += '+' + item.stoneYield + '🪨';
      spawnFloatingText(item.x, item.y - 20, msg.trim(), '#c9a86a');
      if(item.isSuper){
        gold += CONFIG.SCENERY.superBonusGold;
        spawnFloatingText(item.x, item.y - 36, '+' + CONFIG.SCENERY.superBonusGold + '💰 SUPER!', '#ffd700');
      }
      spawnParticles(item.x, item.y, item.type === 'TREE' ? '#4caf50' : '#9aa0a6', item.isSuper ? 16 : 8);
      playSound('death');
    }
    if(keepItemAfterUse){
      item.isClearing = false; // a fountain with healing left, or one used at full health, stays for later
    } else {
      sceneryMap.delete(key);
      invalidateSpawnFlags();
    }
    clearingScenery.splice(i, 1);
    updateHUD();
  }
}
/* =========================================================
   FOOD, ITEM USE FEEDBACK AND STAT GAINS
   ========================================================= */
// FOOD-DROPS-01: food is a drop pool of its own beside equipment. It never takes an inventory slot: dropping it on a stickman applies it at once
// (see FOOD-STATS-01 below for what each kind raises). Boss kills always drop exactly one Treat, a stronger bundled reward.
const FOOD_ITEM_ROWS = [
  ['APPLE', 'Apple', '🍎', 'FRUIT'], ['BANANA', 'Banana', '🍌', 'FRUIT'], ['GRAPES', 'Grapes', '🍇', 'FRUIT'],
  ['TANGERINE', 'Tangerine', '🍊', 'FRUIT'], ['STRAWBERRY', 'Strawberry', '🍓', 'FRUIT'], ['WATERMELON', 'Watermelon', '🍉', 'FRUIT'],
  ['CHERRIES', 'Cherries', '🍒', 'FRUIT'], ['PINEAPPLE', 'Pineapple', '🍍', 'FRUIT'], ['PEACH', 'Peach', '🍑', 'FRUIT'], ['KIWI', 'Kiwi', '🥝', 'FRUIT'],
  ['BLUEBERRY', 'Blueberries', '🫐', 'FRUIT'], ['HONEY', 'Honey', '🍯', 'FRUIT'],
  ['CARROT', 'Carrot', '🥕', 'VEGETABLE'], ['HOT_PEPPER', 'Hot Pepper', '🌶️', 'VEGETABLE'], ['BROCCOLI', 'Broccoli', '🥦', 'VEGETABLE'],
  ['CORN', 'Corn', '🌽', 'VEGETABLE'], ['EGGPLANT', 'Eggplant', '🍆', 'VEGETABLE'], ['POTATO', 'Potato', '🥔', 'VEGETABLE'], ['GARLIC', 'Garlic', '🧄', 'VEGETABLE'], ['MUSHROOM', 'Mushroom', '🍄', 'VEGETABLE'],
  ['BACON', 'Bacon', '🥓', 'MEAT'], ['DRUMSTICK', 'Drumstick', '🍗', 'MEAT'], ['STEAK', 'Steak', '🥩', 'MEAT'], ['MEAT_BONE', 'Meat on the Bone', '🍖', 'MEAT']
];
const FOOD_ITEMS = FOOD_ITEM_ROWS.map(([id, name, icon, kind]) => Object.freeze({ id, name, icon, kind, isFood: true }));
// BUSH-BERRIES-01: the fruit ids a Bush can drop — every real berry-shaped fruit in the catalog.
const BERRY_FOOD_IDS = ['STRAWBERRY', 'CHERRIES', 'BLUEBERRY', 'GRAPES'];
const FOOD_BY_ID = new Map(FOOD_ITEMS.map(item => [item.id, item]));
// ITEM-KIND-NOTICE-01: the first time each food kind and each medicine, stim, tonic, treat, summon item or the shovel appears in a player's game, a notice explains exactly what it does.
function foodKindNotice(kind){ return ({
  FRUIT: ['🍎 Fruit', 'Drop fruit on a stickman and it is eaten at once: it heals a little and adds ' + FOOD_STAT_GAIN_MIN + '–' + FOOD_STAT_GAIN_MAX + ' Intelligence and ' + FOOD_XP_MIN + '–' + FOOD_XP_MAX + ' experience.'],
  VEGETABLE: ['🥕 Vegetables', 'Drop a vegetable on a stickman and it is eaten at once: it heals a little and adds ' + FOOD_STAT_GAIN_MIN + '–' + FOOD_STAT_GAIN_MAX + ' Dexterity and ' + FOOD_XP_MIN + '–' + FOOD_XP_MAX + ' experience.'],
  MEAT: ['🍗 Meat', 'Drop meat on a stickman and it is eaten at once: it heals and adds ' + FOOD_STAT_GAIN_MIN + '–' + FOOD_STAT_GAIN_MAX + ' Constitution, which raises maximum health, plus ' + FOOD_XP_MIN + '–' + FOOD_XP_MAX + ' experience.']
})[kind]; }
function consumableEffectText(def){
  if(def.isMedical) return def.isRevive ? 'When your lives run out, it brings them back to ' + Math.round(DEFIBRILLATOR_REVIVE_LIVES_FRACTION*100) + '% once.' : def.healFraction ? 'Restores ' + Math.round(def.healFraction*100) + '% of your missing lives.' : 'Restores ' + def.healLives + ' lives.';
  if(def.isTreat){
    const extra = def.id === 'DONUT' ? ' It also shields your lives from the next ' + countLabel(DONUT_SHIELD_GAIN, 'escape') + '.'
      : def.id === 'CHOCOLATE' ? ' It also raises attack speed by ' + Math.round(CHOCOLATE_ATK_SPEED_BONUS*100) + '% for ' + Math.round(CHOCOLATE_BUFF_DURATION_MS/1000) + ' seconds.'
      : def.id === 'LOLLIPOP' ? ' It also leaves a sticky zone that slows enemies for ' + Math.round(LOLLIPOP_ZONE_DURATION_MS/1000) + ' seconds.' : '';
    return 'A rare treat: it heals the stickman, gives ' + def.xp + ' experience and ' + countLabel(def.spendablePoints, 'stat point') + (def.gold ? ', and pays ' + def.gold + ' gold' : '') + '.' + extra;
  }
  if(def.isSummon) return def.summons === 'caravan' ? 'Calls the merchant caravan to the road.' : def.summons === 'circus' ? 'Calls a circus to set up beside the road.' : 'Lures a wandering troll onto the map.';
  if(def.isDiggingTool) return 'Lets a stickman dig the ground nearby for buried items, ' + SHOVEL_CHARGES_PER_ROUND + ' digs each round.';
  if(def.isHutLoot) return def.kind === 'heal' ? 'Restores ' + def.amount + ' lives.' : def.kind === 'gold' ? 'Pays ' + def.amount + ' gold.' : 'Gives the stickman ' + def.amount + ' experience.';
  const effects = def.effects || [{ stat: def.stat, value: def.value }];
  return effects.map(effect => effect.stat === 'heal' ? 'Heals the stickman by ' + Math.round(effect.value*100) + '% of its health.'
    : effect.stat === 'all' ? 'Raises damage, attack speed and range by ' + Math.round((effect.value-1)*100) + '% until the wave ends.'
    : ROUND_BUFF_LABELS[effect.stat] + ' +' + Math.round((effect.value-1)*100) + '% until the wave ends.').join(' ');
}
// MEAL-NOTICE-01: a campfire meal explains its own fixed stat gains, which replace the random gain of raw food.
const COOKED_STAT_NAMES = { con: 'Constitution', int: 'Intelligence', dex: 'Dexterity', str: 'Strength' };
function cookedMealNoticeText(def){
  const gains = Object.entries(def.cookedStats).map(([stat, amount]) => '+' + Math.round(amount) + ' ' + (COOKED_STAT_NAMES[stat] || stat.toUpperCase())).join(', ');
  return 'A cooked meal: drop it on a stickman and it is eaten at once. It heals a little, gives ' + FOOD_XP_MIN + '–' + FOOD_XP_MAX + ' experience and adds ' + gains + '. Cooking multiplies what the raw ingredients would give, up to the limit for each stat.';
}
function explainItemKindOnce(def){
  if(!def || typeof seenTutorialTips === 'undefined') return;
  let key, title, text;
  if(def.isCookedMeal){ key = 'item_' + def.id; title = def.icon + ' ' + def.name; text = cookedMealNoticeText(def); }
  else if(def.isFood && foodKindNotice(def.kind)){ key = 'food_' + def.kind; [title, text] = foodKindNotice(def.kind); }
  else if(def.isMedical || def.isHutLoot || def.isTreat || def.isSummon || def.isDiggingTool || (def.isStim && !def.isMeal)){
    key = 'item_' + def.id; title = def.icon + ' ' + def.name;
    text = consumableEffectText(def) + (def.isMedical ? '' : ' Drag it onto a stickman, then press it in the pack to use it.');
  } else return;
  if(seenTutorialTips.has(key)) return;
  seenTutorialTips.add(key);
  try{ localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seenTutorialTips])); }catch(e){ /* private mode or full storage: the notice shows again next session */ }
  showToast(title, undefined, text);
}
// Food heals the receiving stickman; meat adds Constitution, fruit INT, vegetables DEX.
const MEAT_HEAL_BY_ID = { BACON: 6, DRUMSTICK: 10, STEAK: 16, MEAT_BONE: 24 };
// Kept only so old saves that carry it still load; food grants no player lives.
let bonusMaxLivesFromMeat = 0;
function foodFruitXp(){ return Math.round(15 + Math.min(35, waveIndex)); }
// ITEM-USE-FEEDBACK-01: One deliberate moment per consumable use: the item's icon rises above the stickman, an exact readout
// sits under it, a single ring in the item class colour expands once (tier 1 and 2), and a short motif per class plays.
const ITEM_USE_CLASSES = {
  HEAL:  { color: '#7be07b', wave: 'sine',     notes: [[523, 0.16], [659, 0.26]] },
  POWER: { color: '#ffb347', wave: 'triangle', notes: [[330, 0.09], [440, 0.09], [587, 0.2]] },
  HASTE: { color: '#7dd3fc', wave: 'triangle', notes: [[494, 0.07], [659, 0.07], [880, 0.16]] },
  GAIN:  { color: '#ffd23f', wave: 'sine',     notes: [[659, 0.1], [784, 0.1], [1047, 0.22]] }
};
const ITEM_USE_NOTE_GAP_S = 0.09;
const ITEM_USE_HOLD_MS_BY_TIER = [1500, 1800, 2400];
const ITEM_USE_RING_MS = 600, ITEM_USE_RISE_MS = 350, ITEM_USE_RISE_PX = 16, ITEM_USE_FADE_SHARE = 0.25, ITEM_USE_STACK_LIFT_PX = 32;
const ITEM_USE_EFFECT_LIMIT = 16;
const itemUseEffects = Array.from({ length: ITEM_USE_EFFECT_LIMIT }, () => ({ active: false }));
let itemUseEffectIndex = 0;
const itemTypesUsed = new Set();
function renderItemCodex(){ // ITEM-CODEX-01 — built when the Items tab opens, never per frame
  const list = document.getElementById('itemCodexList');
  list.textContent = '';
  let used = 0;
  for(const def of CONSUMABLE_BY_ID.values()){
    const seen = itemTypesUsed.has(def.id);
    if(seen) used++;
    const entry = document.createElement('li');
    entry.textContent = seen ? def.icon + ' ' + def.name : '❔ Not used yet';
    if(!seen) entry.className = 'unseen';
    list.appendChild(entry);
  }
  document.getElementById('itemCodexSummary').textContent = used + ' of ' + CONSUMABLE_BY_ID.size + ' consumables used so far.';
}
function recordFirstItemUse(def){
  if(itemTypesUsed.has(def.id)) return;
  itemTypesUsed.add(def.id);
  logGameEvent('New item recorded: ' + def.name);
}
const ROUND_BUFF_NOTE = 'Until the wave ends';
function packItemUseLines(parts){
  const effectParts = parts.filter(part => part !== ROUND_BUFF_NOTE);
  const lines = [];
  for(let i = 0; i < effectParts.length; i += 2) lines.push(effectParts.slice(i, i + 2).join('   '));
  if(effectParts.length < parts.length) lines.push(ROUND_BUFF_NOTE);
  return lines;
}
function playItemUseSound(itemClass, tier, worldX){
  const motif = ITEM_USE_CLASSES[itemClass];
  const pan = audioEngine.panFor(worldX);
  let delay = 0;
  for(const [frequency, length] of motif.notes){
    audioEngine.tone(frequency, length, motif.wave, undefined, pan, tier >= 1, delay, true, true);
    delay += ITEM_USE_NOTE_GAP_S;
  }
  if(tier >= 2) audioEngine.tone(motif.notes[motif.notes.length - 1][0] * 1.5, 0.34, motif.wave, undefined, pan, true, delay, true, true);
}
function showItemUseFeedback(def, tower, itemClass, tier, parts){
  if(!tower || !tower.active) return;
  let stacked = 0;
  for(const effect of itemUseEffects) if(effect.active && effect.tower === tower) stacked++;
  const effect = itemUseEffects[itemUseEffectIndex];
  itemUseEffectIndex = (itemUseEffectIndex + 1) % ITEM_USE_EFFECT_LIMIT;
  effect.active = true; effect.tower = tower; effect.itemClass = itemClass; effect.tier = tier; effect.icon = def.icon;
  effect.lines = packItemUseLines(parts); effect.startAt = presentationTime; effect.durationMs = ITEM_USE_HOLD_MS_BY_TIER[tier]; effect.stackLift = stacked * ITEM_USE_STACK_LIFT_PX;
  if(def.isMapScroll) playSound('item_scroll', tower.x, undefined, tower.y);
  else if(/stim|adrenaline|syringe|inject|serum|shot\b/i.test(def.name || '')) playSound('item_inject', tower.x, undefined, tower.y);
  else if(def.isFood) playSound('item_eat', tower.x, undefined, tower.y);
  else if(def.isPotion || (def.icon && ['💊','🧪','⚗️','🍷','🍶','🧴'].includes(def.icon))) playSound('item_potion', tower.x, undefined, tower.y);
  else playItemUseSound(itemClass, tier, tower.x);
}
function drawItemUseEffects(ctx){
  let anyEffect = false;
  for(const effect of itemUseEffects) if(effect.active){ anyEffect = true; break; }
  if(!anyEffect) return; // LAG-PASS-01: nothing to draw on almost every frame
  const fxBounds = fxViewBounds();
  for(const effect of itemUseEffects){
    if(!effect.active) continue;
    const age = presentationTime - effect.startAt;
    if(age >= effect.durationMs || !effect.tower.active){ effect.active = false; continue; }
    const centerX = effect.tower.x, centerY = towerVisualCenterY(effect.tower);
    if(!fxVisible(centerX, centerY, fxBounds)) continue;
    const color = ITEM_USE_CLASSES[effect.itemClass].color;
    ctx.save();
    if(effect.tier >= 1 && age < ITEM_USE_RING_MS){
      const ringProgress = age / ITEM_USE_RING_MS;
      ctx.globalAlpha = 1 - ringProgress;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5 - ringProgress * 1.2;
      ctx.beginPath(); ctx.arc(centerX, centerY, 10 + (1 - Math.pow(1 - ringProgress, 3)) * 30, 0, Math.PI * 2); ctx.stroke();
    }
    const fadeStart = effect.durationMs * (1 - ITEM_USE_FADE_SHARE);
    ctx.globalAlpha = age < fadeStart ? 1 : 1 - (age - fadeStart) / (effect.durationMs - fadeStart);
    const riseProgress = Math.min(1, age / ITEM_USE_RISE_MS);
    const iconY = centerY - 76 - effect.stackLift - ITEM_USE_RISE_PX * (1 - Math.pow(1 - riseProgress, 3));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = pxFont(24);
    ctx.fillText(effect.icon, centerX, iconY);
    ctx.font = 'bold 12px Verdana';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = color;
    for(let i = 0; i < effect.lines.length; i++){
      ctx.strokeText(effect.lines[i], centerX, iconY + 22 + i * 15);
      ctx.fillText(effect.lines[i], centerX, iconY + 22 + i * 15);
    }
    ctx.restore();
  }
}
// FOOD-STATS-01: food is eaten instantly when dropped on a stickman and is mainly there to raise stats, like the vitamins and berries in Pokemon:
// meat raises CON (maximum health), fruit raises INT and vegetables (potatoes and the rest) raise DEX.
const FOOD_STAT_BY_KIND = { MEAT: 'con', FRUIT: 'int', VEGETABLE: 'dex' };
// FOOD-ROLL-01: every food gives 1 to 3 points of its stat (meat CON, fruit INT, vegetables DEX) and 1 to 10 experience, rolled when it is eaten.
const FOOD_STAT_GAIN_MIN = 1, FOOD_STAT_GAIN_MAX = 3, FOOD_XP_MIN = 1, FOOD_XP_MAX = 10;
function rollFoodRange(minimum, maximum){ return minimum + Math.floor(Math.random() * (maximum - minimum + 1)); }
// STAT-GRANT-01: a stat grant respects both the per-stat cap and the combined trained cap.
function grantStatPoints(tower, stat, amount){
  if(!tower || isStructureType(tower.type) || !TRAINED_STATS.includes(stat)) return 0;
  const room = Math.min(STAT_EFFECT_CAP - (tower[stat] || 0), STAT_TOTAL_CAP - getTrainedStatTotal(tower));
  const granted = clampNum(room, 0, amount);
  if(granted <= 0) return 0;
  tower[stat] = (tower[stat] || 0) + granted;
  logGameEvent(itemHolderLabel(tower) + ' gained ' + granted + ' ' + stat.toUpperCase() + ' (now ' + tower[stat] + ')');
  tower.recomputeStats();
  if(typeof tower.checkClassUnlocks === 'function') tower.checkClassUnlocks();
  refreshProgressionMilestones(tower);
  if(tower === selectedTower) updateInspectPanel();
  return granted;
}
function grantFoodConstitution(tower, wanted){ // constitution from food is capped like a learned stat and raises maximum health through recomputeStats
  const granted = Math.min(wanted, Math.max(0, Math.floor(STAT_EFFECT_CAP - (tower.hpStat || 0))));
  tower.foodConstitution = (tower.foodConstitution || 0) + granted;
  tower.recomputeStats();
  return granted;
}
function grantFoodStatPoints(tower, stat, wanted){ return stat === 'con' ? grantFoodConstitution(tower, wanted) : grantStatPoints(tower, stat, wanted); }
function grantFoodStat(foodDef, tower){
  if(!tower) return '';
  if(foodDef.cookedStats){
    const parts = [];
    for(const [stat, wanted] of Object.entries(foodDef.cookedStats)) parts.push(stat.toUpperCase() + ' +' + grantFoodStatPoints(tower, stat, wanted));
    if(tower === selectedTower) updateInspectPanel();
    return parts.join(' · ');
  }
  const stat = FOOD_STAT_BY_KIND[foodDef.kind]; if(!stat) return '';
  const granted = grantFoodStatPoints(tower, stat, rollFoodRange(FOOD_STAT_GAIN_MIN, FOOD_STAT_GAIN_MAX));
  if(tower === selectedTower) updateInspectPanel();
  return granted > 0 ? stat.toUpperCase() + ' +' + granted : stat.toUpperCase() + ' at its limit';
}
function eatDroppedFood(groundItem, tower){
  groundItems = groundItems.filter(gi => gi !== groundItem);
  applyFoodItem(groundItem.itemDef, tower);
  trackGameEvent('food_used', { item: groundItem.itemDef.id, tower_type: tower.type, instant: true });
  updateHUD();
}
function healFedStickman(tower,amount){
  if(!tower || !tower.active || !Number.isFinite(tower.maxHp)) return;
  tower.hp = Math.min(tower.maxHp,Math.max(0,tower.hp)+Math.max(0,amount || 0));
}
function applyFoodItem(foodDef, nearTower){
  if(!nearTower) return; // FOOD-STICKMAN-HEALTH-01: food is for a stickman, never player lives.
  const foodStatText = grantFoodStat(foodDef, nearTower);
  if(foodDef.id==='WEDDING_CAKE') for(let i=0;i<3;i++){
    const angle=i*Math.PI*2/3;
    spawnGroundItem(nearTower.x+Math.cos(angle)*18,nearTower.y+Math.sin(angle)*18,lookupItemDef('WEDDING_CAKE_SLICE'),'wedding cake shared');
  }
  const foodXp = rollFoodRange(FOOD_XP_MIN, FOOD_XP_MAX);
  if(foodXp > 0) gainTowerExp(nearTower,foodXp);
  const healing = foodDef.kind === 'MEAT' ? (MEAT_HEAL_BY_ID[foodDef.id] || 6) : foodDef.kind === 'FRUIT' ? 1 : 2;
  healFedStickman(nearTower,healing);
  // Meat raises the existing heart/Constitution value and max health through recomputeStats().
  const parts = [foodStatText,foodXp > 0 ? 'XP +' + foodXp : ''].filter(Boolean);
  showItemUseFeedback(foodDef,nearTower,'HEAL',0,parts); // no numeric healing/lives readout
}
/* =========================================================
   TREATS, STIMS, MEALS AND THE CONSUMABLE REGISTRY
   ========================================================= */
// ---------------- Boss Treats: guaranteed combo drop on every boss/Santa kill ----------------
const TREAT_ROWS = [
  ['COOKIE', 'Holiday Cookie', '🍪', 10, 40, 15], ['CUPCAKE', 'Gourmet Cupcake', '🧁', 8, 50, 0],
  ['ICE_CREAM', 'Sundae', '🍨', 12, 60, 0], ['CAKE_SLICE', 'Slice of Cake', '🍰', 15, 75, 0], ['GRAND_CAKE', 'Grand Tier Cake', '🎂', 25, 120, 0],
  ['DONUT', 'Glazed Donut', '🍩', 12, 55, 0], ['CHOCOLATE', 'Golden Chocolate', '🍫', 15, 80, 25], ['LOLLIPOP', 'Swirl Lollipop', '🍭', 10, 50, 0]
];
const TREAT_ITEMS = TREAT_ROWS.map(([id, name, icon, heal, xp, gold]) => Object.freeze({ id, name, icon, heal, xp, gold, spendablePoints: Math.max(1, Math.round(xp/30)), isTreat: true }));
// TREAT-TACTICS-01: Three treats carry a secondary tactical
// effect on top of the shared heal/XP/gold bundle every treat already grants (see applyTreatItem()):
//   DONUT: +3 shield charges (capped 5) that absorb the next leaks at 0 life cost each, expiring
//   (unused charges burst for +1 gold each) the instant the current wave is cleared — never carried over.
//   CHOCOLATE: instant gold (its normal treat.gold) plus a temporary global attack-speed boost.
//   LOLLIPOP: a sticky, slowing zone on the road at the drop point for a limited time.
const DONUT_SHIELD_MAX = 5;
const DONUT_SHIELD_GAIN = 3;
const CHOCOLATE_ATK_SPEED_BONUS = 0.05;
const CHOCOLATE_BUFF_DURATION_MS = 12000;
const LOLLIPOP_SLOW_FACTOR = 0.25;
const LOLLIPOP_SLOW_RADIUS = 60;
const LOLLIPOP_ZONE_DURATION_MS = 8000;
let donutShieldHits = 0;
let chocolateAtkSpeedBuffUntil = 0;
const lollipopZones = []; // { x, y, expiresAt }
function absorbLeakWithDonutShield(){
  if(donutShieldHits <= 0) return false;
  donutShieldHits--;
  return true;
}
function clearDonutShieldAtWaveEnd(){
  if(donutShieldHits > 0){ gold += donutShieldHits; donutShieldHits = 0; }
}
function updateTreatTacticalEffects(dt){
  for(let i = lollipopZones.length - 1; i >= 0; i--) if(gameTime >= lollipopZones[i].expiresAt) lollipopZones.splice(i, 1);
  if(!lollipopZones.length) return;
  for(const enemy of enemyPool){
    if(!enemy.active) continue;
    for(const zone of lollipopZones){
      if(Math.hypot(enemy.x - zone.x, enemy.y - zone.y) <= LOLLIPOP_SLOW_RADIUS){ enemy.applySlow(LOLLIPOP_SLOW_FACTOR, 250); break; }
    }
  }
}
function dropTreatFromBoss(enemy){
  const treat = TREAT_ITEMS[Math.floor(Math.random() * TREAT_ITEMS.length)];
  spawnGroundItem(enemy.x, enemy.y - 10, treat, 'boss treat');
  trackGameEvent('item_dropped', { item: treat.id, rarity: 'TREAT', enemy_type: enemy.type });
  showToast(treat.icon + ' A ' + treat.name + ' appeared!');
}
function applyTreatItem(treatDef, nearTower, dropX, dropY){
  healFedStickman(nearTower,treatDef.heal); // edible treats also heal the recipient, not player lives
  if(treatDef.gold){ gold += treatDef.gold; }
  if(nearTower) gainTowerExp(nearTower, treatDef.xp);
  const anchorX = nearTower ? nearTower.x : (dropX||0), anchorY = nearTower ? nearTower.y : (dropY||0);
  const treatParts = ['XP +' + treatDef.xp];
  if(nearTower && nearTower.active && treatDef.spendablePoints){
    const points = Math.min(treatDef.spendablePoints, nearTower.promotionCapacity());
    nearTower.statPoints += points;
    if(points) treatParts.push('Spendable +' + points);
    if(selectedTower === nearTower) updateInspectPanel();
  }
  if(treatDef.gold) treatParts.push('Gold +' + treatDef.gold);
  if(treatDef.id === 'DONUT'){
    donutShieldHits = Math.min(DONUT_SHIELD_MAX, donutShieldHits + DONUT_SHIELD_GAIN);
    treatParts.push('Shield ' + DONUT_SHIELD_GAIN + ' hits');
  } else if(treatDef.id === 'CHOCOLATE'){
    chocolateAtkSpeedBuffUntil = Math.max(chocolateAtkSpeedBuffUntil, gameTime) + CHOCOLATE_BUFF_DURATION_MS;
    treatParts.push('Attack speed +' + Math.round(CHOCOLATE_ATK_SPEED_BONUS*100) + '% for ' + Math.round(CHOCOLATE_BUFF_DURATION_MS/1000) + ' s');
  } else if(treatDef.id === 'LOLLIPOP'){
    lollipopZones.push({ x: anchorX, y: anchorY, expiresAt: gameTime + LOLLIPOP_ZONE_DURATION_MS });
    treatParts.push('Slow zone');
  }
  spawnParticles(anchorX, anchorY, '#ffd23f', 14);
  showItemUseFeedback(treatDef, nearTower, 'GAIN', 2, treatParts);
}
// INVENTORY-CONSUMABLES-01
// SUPPLY-CRATE-01
const STIM_ITEMS = [
  Object.freeze({ id:'ADRENALINE', name:'Adrenaline Shot', icon:'💉', isStim:true, stat:'speed', value:1.2, weight:30 }),
  Object.freeze({ id:'COMBAT_STIM', name:'Combat Stim', icon:'💊', isStim:true, stat:'damage', value:1.2, weight:30 }),
  Object.freeze({ id:'SPOTTER_SCOPE', name:'Spotter Scope', icon:'🔭', isStim:true, stat:'range', value:1.2, weight:25 }),
  Object.freeze({ id:'FIELD_MEDKIT', name:'Field Medkit', icon:'🩹', isStim:true, stat:'heal', value:0.4, weight:15 }),
  Object.freeze({ id:'HYPER_SERUM', name:'Hyper-Serum', icon:'🧪', isStim:true, stat:'all', value:1.15, weight:5 })
];
// SUMMON-ITEMS-01: three rare finds call a visitor when used: the Merchant's Bell the caravan, the Circus Ticket a circus, the Troll Bait a wandering troll.
// A use that would make a second visitor of the same kind keeps the item and says so (VISITOR-LIMIT-01).
const SUMMON_ITEMS = [
  Object.freeze({ id:'MERCHANT_BELL', name:"Merchant's Bell", icon:'🛎️', isSummon:true, summons:'caravan', weight:40 }),
  Object.freeze({ id:'CIRCUS_TICKET', name:'Circus Ticket', icon:'🎟️', isSummon:true, summons:'circus', weight:30 }),
  Object.freeze({ id:'TROLL_BAIT', name:'Troll Bait', icon:'🪤', isSummon:true, summons:'troll', weight:30 })
];
const SUMMON_FROM_CRATE_CHANCE = 0.2;
function rollSummonItem(){ return pickWeighted(SUMMON_ITEMS); }
function summonVisitor(kind){
  if(kind === 'caravan') return spawnCaravan() ? 'ok' : '🐪 The caravan is already here.';
  if(kind === 'circus'){ if(liveCircuses().length > 0) return '🎪 A circus is already set up.'; return setUpCircusAt(findFreeTileBesideRoad()) ? 'ok' : '🎪 No room beside the road for a circus.'; }
  if(kind === 'troll'){ if(trollIsOnBoard()) return '🧌 A troll is already here.'; return spawnWanderingTroll() ? 'ok' : '🧌 No room for a troll to enter.'; }
  return 'Nothing answered.';
}
function rollStimItem(){ return pickWeighted(STIM_ITEMS); }
function applyStimItem(def, tower){
  if(!def || !tower || !tower.active) return false;
  const effects = def.effects || [{ stat: def.stat, value: def.value }];
  const parts = [];
  let hasRoundBuff = false;
  for(const effect of effects){
    if(effect.stat === 'heal'){
      tower.hp = Math.min(tower.maxHp, tower.hp + Math.round(tower.maxHp*effect.value));
      if(!def.isMeal) parts.push('Health +' + Math.round(effect.value*100) + '%'); // meals follow the no-numeric-healing food rule
      continue;
    }
    hasRoundBuff = true;
    const rb = tower.roundBuffs || (tower.roundBuffs = { damage:1, speed:1, range:1, expiresAfterWave: waveState === 'IDLE' ? waveIndex + 1 : waveIndex });
    rb.expiresAfterWave = Math.max(rb.expiresAfterWave || 0, waveState === 'IDLE' ? waveIndex + 1 : waveIndex);
    if(effect.stat === 'all'){ rb.damage = Math.max(rb.damage, effect.value); rb.speed = Math.max(rb.speed, effect.value); rb.range = Math.max(rb.range, effect.value); parts.push('Damage, speed and range +' + Math.round((effect.value-1)*100) + '%'); }
    else { rb[effect.stat] = Math.max(rb[effect.stat], effect.value); parts.push(ROUND_BUFF_LABELS[effect.stat] + ' +' + Math.round((effect.value-1)*100) + '%'); }
  }
  if(hasRoundBuff) parts.push(ROUND_BUFF_NOTE);
  const stats = effects.map(effect => effect.stat);
  const itemClass = stats.includes('damage') ? 'POWER' : stats.some(stat => stat === 'speed' || stat === 'range' || stat === 'all') ? 'HASTE' : 'HEAL';
  showItemUseFeedback(def, tower, itemClass, def.isMeal || def.id === 'HYPER_SERUM' ? 2 : 1, parts);
  if(selectedTower === tower) updateInspectPanel();
  return true;
}
const ROUND_BUFF_LABELS = { damage: 'Damage', speed: 'Attack speed', range: 'Range' };
function clearRoundBuffs(){
  for(const t of towerPool){
    if(!t.active || !t.roundBuffs || (t.roundBuffs.expiresAfterWave || 0) > waveIndex) continue;
    t.roundBuffs = null;
    t.recomputeStats();
  }
  if(selectedTower) updateInspectPanel();
}
// COOKING-01
const MEAL_ITEMS = [
  Object.freeze({ id:'BREAKFAST_PLATE', name:'Breakfast Plate', icon:'🍳', isStim:true, isMeal:true, effects:[{ stat:'speed', value:1.25 }] }),
  Object.freeze({ id:'HEARTY_STEW', name:'Hearty Stew', icon:'🍲', isStim:true, isMeal:true, effects:[{ stat:'heal', value:0.6 }] }),
  Object.freeze({ id:'FRUIT_SALAD', name:'Fruit Salad', icon:'🥗', isStim:true, isMeal:true, effects:[{ stat:'range', value:1.25 }] }),
  Object.freeze({ id:'ROAST_FEAST', name:'Roast Feast', icon:'🍱', isStim:true, isMeal:true, effects:[{ stat:'damage', value:1.25 }] }),
  Object.freeze({ id:'FIERY_RAGOUT', name:'Fiery Ragout', icon:'🥘', isStim:true, isMeal:true, effects:[{ stat:'damage', value:1.3 }, { stat:'speed', value:1.15 }] }),
  Object.freeze({ id:'SUNRISE_SKILLET', name:'Sunrise Skillet', icon:'🥞', isStim:true, isMeal:true, effects:[{ stat:'speed', value:1.3 }, { stat:'heal', value:0.3 }] }),
  Object.freeze({ id:'BERRY_PIE', name:'Berry Pie', icon:'🥧', isStim:true, isMeal:true, effects:[{ stat:'range', value:1.3 }, { stat:'heal', value:0.3 }] }),
  Object.freeze({ id:'HARVEST_CURRY', name:'Harvest Curry', icon:'🍛', isStim:true, isMeal:true, effects:[{ stat:'damage', value:1.2 }, { stat:'speed', value:1.2 }, { stat:'range', value:1.2 }, { stat:'heal', value:0.3 }] })
];
// Recipe catalog; fuelCost supplies the baseline for timed shared-storage cooking. Legacy meal definitions remain loadable.
const COOKING_RECIPES = [
  { result: 'HARVEST_CURRY',   ingredients: ['CARROT', 'POTATO', 'CORN', 'HOT_PEPPER'], fuelCost: 3 },
  { result: 'FIERY_RAGOUT',    ingredients: ['STEAK', 'GARLIC', 'HOT_PEPPER'], fuelCost: 2 },
  { result: 'SUNRISE_SKILLET', ingredients: ['BACON', 'POTATO', 'CORN'], fuelCost: 2 },
  { result: 'BERRY_PIE',       ingredients: ['STRAWBERRY', 'CHERRIES', 'BLUEBERRY'], fuelCost: 2 },
  { result: 'BREAKFAST_PLATE', ingredients: ['BACON', 'POTATO'], fuelCost: 1 },
  { result: 'HEARTY_STEW',     ingredients: ['STEAK', 'CARROT'], fuelCost: 1 },
  { result: 'FRUIT_SALAD',     ingredients: ['APPLE', 'BLUEBERRY'], fuelCost: 1 },
  { result: 'ROAST_FEAST',     ingredients: ['MEAT_BONE', 'DRUMSTICK'], fuelCost: 1 }
];
// Cooking is selected at the campfire; equipment crafting remains in the inventory.
function lookupItemDef(itemId){ return ITEM_BY_ID.get(itemId) || CONSUMABLE_BY_ID.get(itemId); }
const CONSUMABLE_BY_ID = new Map();
for(const consumableDef of MEAL_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of STIM_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of SUMMON_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of FOOD_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of TREAT_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of HUT_LOOT_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
for(const consumableDef of LOOT_TONIC_ITEMS) CONSUMABLE_BY_ID.set(consumableDef.id, consumableDef);
CONSUMABLE_BY_ID.set(SHOVEL_ITEM.id, SHOVEL_ITEM);
/* =========================================================
   CAMPFIRE AND COOKING
   ========================================================= */
// CAMPFIRE-COOKING-02: explicit board-wide ingredient collection, incremental shared wood.
const CAMPFIRE_BUILD_GOLD=60, CAMPFIRE_BUILD_WOOD=50, CAMPFIRE_BUILD_STONE=10, CAMPFIRE_WOOD_STEP_MS=5000;
function canAffordCampfire(){ return gold>=CAMPFIRE_BUILD_GOLD && wood>=CAMPFIRE_BUILD_WOOD && stone>=CAMPFIRE_BUILD_STONE; }
let placingCampfire=false, cookingDialog=null, cookingDialogFire=null, cookingUiClock=0;
const FIRE_RECIPES=COOKING_RECIPES.map(r=>({...r,id:'COOKED_'+r.result,multiplier:r.ingredients.length===2?5:r.ingredients.length===3?10:15,woodCost:r.fuelCost*5}));
FIRE_RECIPES.push({id:'WEDDING_CAKE',result:'WEDDING_CAKE',ingredients:[...BERRY_FOOD_IDS.flatMap(id=>[id,id]),...Array(5).fill('HONEY')],multiplier:25,woodCost:40});
for(const recipe of FIRE_RECIPES){
  const old=lookupItemDef(recipe.result), stats={};
  for(const id of recipe.ingredients){ const food=lookupItemDef(id), stat=food && FOOD_STAT_BY_KIND[food.kind]; if(stat) stats[stat]=(stats[stat]||0)+((FOOD_STAT_GAIN_MIN+FOOD_STAT_GAIN_MAX)/2)*recipe.multiplier; }
  const def=Object.freeze({id:recipe.id,name:old?old.name:'Wedding Cake',icon:old?old.icon:'🎂',isFood:true,isCookedMeal:true,kind:'FRUIT',cookedStats:Object.freeze(stats)});
  recipe.def=def; CONSUMABLE_BY_ID.set(def.id,def);
}
const weddingCakeStats=CONSUMABLE_BY_ID.get('WEDDING_CAKE').cookedStats;
CONSUMABLE_BY_ID.set('WEDDING_CAKE_SLICE',Object.freeze({id:'WEDDING_CAKE_SLICE',name:'Wedding Cake Slice',icon:'🍰',isFood:true,isCookedMeal:true,kind:'FRUIT',cookedStats:Object.freeze(Object.fromEntries(Object.entries(weddingCakeStats).map(([stat,value])=>[stat,value/4])))}));
function findCampfireIngredients(recipe){
  const candidates=[];
  for(const gi of groundItems) if(gi!==draggingGroundItem) candidates.push({item:gi.itemDef,ground:gi});
  for(const tower of towerPool) if(tower.active) for(const item of tower.equippedItems) for(let unit=0;unit<heldCount(item);unit++) candidates.push({item,tower});
  const chosen=[];
  for(const id of recipe.ingredients){ const index=candidates.findIndex(c=>c.item.id===id); if(index<0) return null; chosen.push(candidates.splice(index,1)[0]); }
  return chosen;
}
function startCampfireRecipe(fire,recipeId){
  if(gameState!=='PLAYING' || fire.cookingJob || sceneryMap.get(fire.gx+','+fire.gy)!==fire) return false;
  const recipe=FIRE_RECIPES.find(r=>r.id===recipeId); if(!recipe) return false;
  const chosen=findCampfireIngredients(recipe); if(!chosen) return false;
  // Resolve every unique ingredient before consuming any of them.
  const touched=new Set();
  for(const source of chosen){
    if(source.ground) groundItems.splice(groundItems.indexOf(source.ground),1);
    else { takeOneFromHeld(source.tower,source.item); touched.add(source.tower); }
    itemLogReleased(source.item,'consumed by campfire: '+recipe.id);
  }
  for(const tower of touched){ refreshQuickUse(tower); tower.recomputeStats(); tower.checkHeroStatus(); }
  fire.cookingJob={recipeId:recipe.id,woodUsed:0,segmentRemainingMs:0,progressMs:0};
  awardMedal('CHEF');
  if(selectedTower) updateInspectPanel();
  logGameEvent('cooking started: '+recipe.id); updateHUD(); return true;
}
function normalizeCookingJob(fire){
  if(fire.type!=='CAMPFIRE') return;
  fire.fuel=0; // Legacy stored fuel does not create free shared wood.
  const job=fire.cookingJob, recipe=job && FIRE_RECIPES.find(r=>r.id===job.recipeId);
  if(!recipe || !Number.isFinite(job.woodUsed) || !Number.isFinite(job.segmentRemainingMs) || !Number.isFinite(job.progressMs)){ delete fire.cookingJob; return; }
  job.woodUsed=clampNum(Math.floor(job.woodUsed),0,recipe.woodCost);
  job.segmentRemainingMs=clampNum(job.segmentRemainingMs,0,CAMPFIRE_WOOD_STEP_MS);
  if(job.woodUsed===0) job.segmentRemainingMs=0;
  job.progressMs=job.woodUsed*CAMPFIRE_WOOD_STEP_MS-job.segmentRemainingMs;
}
// CAMPFIRE-CRACKLE-01: a burning campfire in view crackles at a rate that wanders like a real fire's flare and lull.
const FIRE_CRACKLES_PER_S_MIN = 2, FIRE_CRACKLES_PER_S_MAX = 9, FIRE_FLARE_DRIFT = 0.0008, fireFlareLevels = new WeakMap();
function crackleBurningFire(fire, frameMs){
  if(!fxVisible(fire.x, fire.y, fxViewBounds())) return;
  const flare = clampNum((fireFlareLevels.has(fire) ? fireFlareLevels.get(fire) : 0.5) + (Math.random()*2 - 1)*FIRE_FLARE_DRIFT*frameMs, 0, 1);
  fireFlareLevels.set(fire, flare); // kept outside the scenery object so it never enters a save
  const cracklesPerSecond = FIRE_CRACKLES_PER_S_MIN + (FIRE_CRACKLES_PER_S_MAX - FIRE_CRACKLES_PER_S_MIN)*flare*flare;
  if(Math.random() < cracklesPerSecond*frameMs/1000) playSound('fire_crackle', fire.x, flare, fire.y);
}
function updateCampfireCooking(frameMs){
  if(gameState!=='PLAYING') return;
  for(const fire of sceneryMap.values()){
    if(fire.type!=='CAMPFIRE') continue;
    const job=fire.cookingJob; fire.fuel=0; if(!job) continue;
    const recipe=FIRE_RECIPES.find(r=>r.id===job.recipeId); if(!recipe){ delete fire.cookingJob; continue; }
    let remaining=clampNum(frameMs, 0, 100);
    while(remaining>0 && job.progressMs<recipe.woodCost*CAMPFIRE_WOOD_STEP_MS){
      if(job.segmentRemainingMs<=0){
        if(wood<1 || job.woodUsed>=recipe.woodCost) break;
        wood--; job.woodUsed++; job.segmentRemainingMs=CAMPFIRE_WOOD_STEP_MS; updateHUD();
      }
      const advance=Math.min(remaining,job.segmentRemainingMs);
      job.segmentRemainingMs-=advance; job.progressMs+=advance; remaining-=advance;
    }
    fire.fuel=job.segmentRemainingMs>0?1:0;
    if(fire.fuel>0) crackleBurningFire(fire, frameMs);
    if(job.progressMs>=recipe.woodCost*CAMPFIRE_WOOD_STEP_MS){
      spawnGroundItem(fire.x,fire.y,recipe.def,'cooked at campfire'); delete fire.cookingJob; fire.fuel=0;
      spawnFloatingText(fire.x,fire.y-25,recipe.def.icon+' Ready','#ffe082'); logGameEvent('cooking completed: '+recipe.id);
    }
  }
  if(cookingDialog && cookingDialog.open){ cookingUiClock+=frameMs; if(cookingUiClock>=500){ cookingUiClock=0; refreshCookingDialog(); } }
}
function cookingStatus(fire){
  const job=fire.cookingJob; if(!job) return 'Choose a recipe';
  const recipe=FIRE_RECIPES.find(r=>r.id===job.recipeId); if(!recipe) return 'Choose a recipe';
  return recipe.def.name+' · '+Math.floor(job.progressMs/(recipe.woodCost*CAMPFIRE_WOOD_STEP_MS)*100)+'% · '+(job.segmentRemainingMs<=0 && wood<1?'Waiting for wood':(recipe.woodCost-job.woodUsed)+' wood left to burn');
}
function refreshCookingDialog(){
  const fire=cookingDialogFire;
  if(!fire || sceneryMap.get(fire.gx+','+fire.gy)!==fire){ cookingDialog.close(); return; }
  cookingDialog.querySelector('[data-status]').textContent=cookingStatus(fire)+' · Stored wood: '+Math.floor(wood);
  for(const button of cookingDialog.querySelectorAll('[data-recipe]')){ const recipe=FIRE_RECIPES.find(r=>r.id===button.dataset.recipe); button.disabled=!!fire.cookingJob || !findCampfireIngredients(recipe); }
}
function openCookingDialog(fire){
  closeBuildMenuIfOpen();
  if(!cookingDialog){
    cookingDialog=document.createElement('dialog');
    cookingDialog.style.cssText='max-width:min(580px,90vw);max-height:80vh;overflow:auto;background:#29221b;color:#fff0d0;border:2px solid #a87539;border-radius:10px;padding:20px';
    cookingDialog.setAttribute('aria-label','Campfire recipes');
    cookingDialog.innerHTML='<h2>Campfire</h2><p data-status></p><p>Ingredients are taken from the ground and all stickman inventories when cooking starts. Wood burns from shared storage: one every five seconds. Cooking waits when wood runs out. Meals grant permanent stats, subject to the normal stat caps. Wedding cake gives its full stat value on the first bite and leaves three slices, each worth one-quarter of that value.</p><div data-recipes></div><button type="button" data-close>Close</button>';
    for(const recipe of FIRE_RECIPES){
      const row=document.createElement('p'),button=document.createElement('button');button.type='button';button.dataset.recipe=recipe.id;button.textContent='Cook '+recipe.def.icon+' '+recipe.def.name;
      button.addEventListener('click',()=>{startCampfireRecipe(cookingDialogFire,recipe.id);refreshCookingDialog();});
      const counts={};for(const id of recipe.ingredients) counts[id]=(counts[id]||0)+1;
      const detail=document.createElement('small');detail.style.display='block';detail.textContent=Object.entries(counts).map(([id,n])=>n+' × '+(lookupItemDef(id)?.name || id)).join(', ')+' · '+recipe.woodCost+' wood · '+recipe.woodCost*5+' seconds · '+recipe.multiplier+'× ingredient stat value · '+Object.entries(recipe.def.cookedStats).map(([stat,n])=>'+'+n+' '+stat.toUpperCase()).join(', ');
      row.append(button,detail);cookingDialog.querySelector('[data-recipes]').append(row);
    }
    cookingDialog.querySelector('[data-close]').onclick=()=>cookingDialog.close();
    cookingDialog.addEventListener('keydown',e=>e.stopPropagation()); document.body.append(cookingDialog);
  }
  cookingDialogFire=fire;refreshCookingDialog();if(!cookingDialog.open)cookingDialog.showModal();
}
function placeCampfire(gx,gy){
  if(!isInActiveRegion(gx,gy) || !isTileBuildable(gx,gy) || pathCells.has(gx+','+gy) || sceneryMap.has(gx+','+gy) || tileHasHut(gx,gy) || !canAffordCampfire()){playSound('ui_deny');return false;}
  gold-=CAMPFIRE_BUILD_GOLD;wood-=CAMPFIRE_BUILD_WOOD;stone-=CAMPFIRE_BUILD_STONE;
  const fire={gx,gy,x:(gx+0.5)*TILE_SIZE,y:(gy+0.5)*TILE_SIZE,type:'CAMPFIRE',scale:0.85,isChanceStructure:true,fuel:0,healPool:0,isClearing:false,clearCost:0,clearMs:0,tallStretch:1,widthStretch:1};
  sceneryMap.set(gx+','+gy,fire);placingCampfire=false;invalidateSpawnFlags();updateHUD();playSound('click');openCookingDialog(fire);return true;
}
function isConsumableDef(def){ return !!(def && (def.isFood || def.isTreat || def.isStim || def.isHutLoot || def.isDiggingTool || def.isSummon)); } // CONSUMABLE-STORED-01
function useStoredConsumable(tower, slotIndex){
  if(!tower || !tower.active || !Array.isArray(tower.equippedItems) || !Number.isInteger(slotIndex)) return false;
  const def = tower.equippedItems[slotIndex];
  if(!isConsumableDef(def)) return false;
  if(def.isDiggingTool){ // SHOVEL-REUSABLE-01, SHOVEL-CHARGES-01
    if(!beginShovelDig(tower)) return false;
    refreshQuickUse(tower);
    recordFirstItemUse(def);
    trackGameEvent('shovel_used', { item: def.id, tower_type: tower.type });
    return true;
  }
  if(def.isSummon){
    const outcome = summonVisitor(def.summons);
    if(outcome !== 'ok'){ showToast(outcome); playSound('ui_deny'); return false; }
    if(takeOneFromHeld(tower, def)) itemLogUsed(def, tower);
    refreshQuickUse(tower); recordFirstItemUse(def);
    spawnFloatingText(tower.x, tower.y - 40, def.icon + ' ' + def.name, '#ffe082', ITEM_POPUP_LIFE_MS);
    trackGameEvent('summon_used', { item: def.id, tower_type: tower.type });
    if(selectedTower === tower) updateInspectPanel();
    return true;
  }
  if(takeOneFromHeld(tower, def)) itemLogUsed(def, tower);
  refreshQuickUse(tower);
  recordFirstItemUse(def);
  if(def.isHutLoot) applyHutLootItem(def, tower); else if(def.isStim) applyStimItem(def, tower); else if(def.isFood) applyFoodItem(def, tower); else applyTreatItem(def, tower, tower.x, tower.y);
  tower.recomputeStats();
  trackGameEvent(def.isHutLoot ? 'hut_loot_used' : def.isStim ? 'stim_used' : def.isFood ? 'food_used' : 'treat_used', { item: def.id, tower_type: tower.type });
  if(selectedTower === tower) updateInspectPanel();
  return true;
}
function activateInventorySlot(tower, slotIndex){
  if(!tower || !tower.active || isVaultType(tower.type) || !Array.isArray(tower.equippedItems) || !Number.isInteger(slotIndex)) return;
  const def = tower.equippedItems[slotIndex];
  if(!def) return;
  if(isConsumableDef(def)){ useStoredConsumable(tower, slotIndex); if(gameState==='PAUSED') requestPausedRender(); return; }
  spawnFloatingText(tower.x, tower.y - 40, def.icon + ' ' + def.name, '#ffe082', ITEM_POPUP_LIFE_MS);
  if(gameState==='PAUSED') requestPausedRender();
}
// CHANCE-STRUCTURES-01
const chanceStructureDrySpells = {};
function maxLivesNow(){ return 100 + livesBought + bonusMaxLivesFromMeat; }
function livesMissingNow(){ return Math.max(0, maxLivesNow() - lives); }
function chanceStructureSpawnChance(type){
  if(type === 'CAMPFIRE') return 0;
  const definition = CONFIG.CHANCE_STRUCTURES[type];
  if(wavesCompleted < definition.minWavesCompleted) return 0;
  if(countSceneryOfType(type) >= definition.maxOnBoard) return 0;
  const livesShare = lives / maxLivesNow();
  let chance = definition.baseChance;
  if(livesShare <= definition.hurtShare) chance += definition.hurtBonusChance;
  if(livesShare <= definition.desperateShare) chance += definition.desperateBonusChance;
  chance += (chanceStructureDrySpells[type] || 0) * definition.pityPerWave;
  return Math.min(definition.maxChance, chance);
}
function randomEventHostileAllowed(wave){ return wave >= 5; }
function randomEventEndpointRouteDistance(routeIndex, nearestDistance, routeLength, fromStart){
  return (fromStart ? routeIndex : routeLength-1-routeIndex) + nearestDistance;
}
function randomEventEndTileKeys(startSideOverride){
  if(!pathWaypointTiles.length) return [];
  const startSide = startSideOverride === undefined ? randomEventSlotsUsed === 0 : startSideOverride;
  const candidates = [];
  const routeIndexByKey = new Map(pathWaypointTiles.map((tile, index) => [tile.x+','+tile.y, index]));
  for(const key of nearPathTileSet){
    const [gx, gy] = key.split(',').map(Number);
    if(!isTileBuildable(gx, gy)) continue;
    let nearestIndex = -1, nearestDistance = Infinity;
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++){
      const routeIndex = routeIndexByKey.get((gx+dx)+','+(gy+dy));
      if(routeIndex === undefined) continue;
      const distance = Math.abs(dx)+Math.abs(dy);
      if(distance < nearestDistance){ nearestDistance = distance; nearestIndex = routeIndex; }
    }
    if(nearestIndex < 0) continue;
    const routeDistance = randomEventEndpointRouteDistance(nearestIndex, nearestDistance, pathWaypointTiles.length, startSide);
    if(routeDistance >= 3 && routeDistance <= 5) candidates.push(key);
  }
  return candidates;
}
function pickChanceStructureTile(){
  const candidates = randomEventEndTileKeys().map(key => key.split(',').map(Number));
  return candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : null;
}
function maybeSpawnChanceStructures(){
  for(const type of Object.keys(CONFIG.CHANCE_STRUCTURES)){
    if(randomEventSlotsUsed >= 2) break;
    const chance = chanceStructureSpawnChance(type);
    if(chance <= 0) continue;
    if(Math.random() >= chance){ chanceStructureDrySpells[type] = (chanceStructureDrySpells[type] || 0) + 1; continue; }
    const tile = pickChanceStructureTile();
    if(!tile) continue;
    const definition = CONFIG.CHANCE_STRUCTURES[type];
    if(!tryClaimRandomEventSlot()) break;
    logGameEvent('random event: ' + definition.name);
    spawnScenery(tile[0], tile[1], type);
    chanceStructureDrySpells[type] = 0;
    spawnParticles(tile[0]*TILE_SIZE + TILE_SIZE/2, tile[1]*TILE_SIZE + TILE_SIZE/2, definition.color, 12);
    trackGameEvent('chance_structure_spawned', { structure: type, lives });
  }
}
// CAMPFIRE-01
const CAMPFIRE_START_FUEL = 3;
function drawCampfire(ctx, item, size){
  ctx.save();
  ctx.translate(item.x, item.y + 6);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a2f1d'; ctx.lineWidth = size*0.2;
  ctx.beginPath(); ctx.moveTo(-size*0.34, size*0.1); ctx.lineTo(size*0.34, -size*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-size*0.34, -size*0.1); ctx.lineTo(size*0.34, size*0.1); ctx.stroke();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = size*0.13;
  ctx.beginPath(); ctx.moveTo(-size*0.34, size*0.1); ctx.lineTo(size*0.34, -size*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-size*0.34, -size*0.1); ctx.lineTo(size*0.34, size*0.1); ctx.stroke();
  ctx.restore();
  if(item.fuel > 0){
    const flameScale = 0.55 + 0.45*Math.min(1, item.fuel/4);
    const wobble = 1 + Math.sin(presentationTime/140 + item.gx)*0.06;
    ctx.font = Math.round(size*flameScale*wobble) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔥', item.x, item.y - size*0.12*flameScale);
  }
  ctx.font = 'bold 11px Verdana';
  ctx.fillStyle = item.fuel > 0 ? '#ffe3b0' : '#c9a86a'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
  const fuelLabel = item.cookingJob ? cookingStatus(item) : 'Recipes';
  ctx.strokeText(fuelLabel, item.x, item.y + size*0.5 + 10);
  ctx.fillText(fuelLabel, item.x, item.y + size*0.5 + 10);
}
/* =========================================================
   CHANCE STRUCTURES
   ========================================================= */
// Returns true when the structure is used up (and should disappear), false when it stays.
function useChanceStructure(item){
  const definition = CONFIG.CHANCE_STRUCTURES[item.type];
  if(item.type === 'CAMPFIRE'){ openCookingDialog(item); return false; }
  if(item.type === 'FOUNTAIN'){
    const healed = Math.min(item.healPool, livesMissingNow());
    if(healed <= 0){
      spawnFloatingText(item.x, item.y - 22, '❤️ Full health', definition.color);
      return false;
    }
    lives += healed;
    item.healPool -= healed;
    trackGameEvent('chance_structure_used', { structure: item.type, healed, pool_left: item.healPool });
    spawnFloatingText(item.x, item.y - 22, '+' + healed + ' ❤️', '#ff8fa3');
    spawnParticles(item.x, item.y, definition.color, graphicsQuality === 'low' ? 14 : 28);
    spawnParticles(item.x, item.y - 10, '#bfe9ff', graphicsQuality === 'low' ? 8 : 16); // water drops
    launchHeartHudFlights(item.x, item.y - 10, Math.ceil(healed / 2));
    playSound('wave');
    return item.healPool <= 0;
  }
  return true;
}
function chanceStructureHoverLabel(item){
  const definition = CONFIG.CHANCE_STRUCTURES[item.type];
  if(item.type === 'CAMPFIRE') return '🔥 ' + cookingStatus(item) + ' — tap for recipes';
  return definition.emoji + ' ' + item.healPool + ' ❤️ left';
}
function sceneryAtPoint(worldX, worldY){
  const tileX = Math.floor(worldX/TILE_SIZE), tileY = Math.floor(worldY/TILE_SIZE);
  let best = null, bestDistance = Infinity;
  for(let dx = -1; dx <= 1; dx++) for(let dy = -1; dy <= 1; dy++){
    const key = (tileX + dx) + ',' + (tileY + dy);
    const item = sceneryMap.get(key);
    if(!item || !isWithinEmojiSquare(worldX, worldY, item.x, item.y + 2, sceneryVisualSize(item))) continue; // same size and centre drawOneSceneryItem() uses
    const distance = Math.hypot(item.x - worldX, item.y + 2 - worldY);
    if(distance < bestDistance){ bestDistance = distance; best = { key, item }; }
  }
  return best;
}
function sceneryVisualSize(item){
  return TILE_SIZE*0.72*(item.type==='MUSHROOMS' ? Math.min(CONFIG.SCENERY.maxScale,item.scale || CONFIG.SCENERY.minScale) : item.type==='BIRD_NEST' ? Math.min(0.22,item.scale || 0.22) : item.type==='PICNIC' ? FIXED_SCENERY_SCALE.PICNIC : item.type==='CHEST' ? FIXED_SCENERY_SCALE.CHEST : item.type==='SUPPLY_CRATE' ? Math.min(0.68,item.scale) : (item.type==='BRANCH' || item.type==='STUMP') ? Math.min(LOG_MAX_SCALE,item.scale) : item.scale); // LOG-SIZE-01
}
/* =========================================================
   BIOMES AND SCENERY DRAWING
   ========================================================= */
// Tree kinds: a leafy tree (58%), an evergreen (30%) and a palm (12%). Saved scenery keeps its kind because it is stored with the item.
const TREE_VARIANT_EMOJI = ['🌳', '🌲', '🌴'];
// BIOMES-01: the other tree kinds and grass colours only appear after a very long road.
// BIOME_MIN_DISTANCE_TILES away from the starting tile, wavy patches of land (about 5 tiles across, edges warped so they are not squares) become Pinewood (cool green grass, mostly
// evergreens) or Dunes (sandy ground, mostly palms), with meadow in between, like Minecraft biomes.
const BIOME_MIN_DISTANCE_TILES = 8, BIOME_PATCH_TILES = 11, BIOME_WARP_TILES = 1.6;
// BIOME-GRADIENT-01: biomes follow one smooth noise field ordered Pinewood, Meadow, Dunes, so Pinewood and Dunes never touch and every change passes through a wide meadow band.
const BIOME_GRASS = Object.freeze({ MEADOW: ['#8fae6e', '#4f7a3f'], PINEWOOD: ['#7fa68f', '#3f6f5a'], DUNES: ['#c9b97a', '#a89b58'] });
function biomeCellHash(cellX, cellY){
  let hash = (Math.imul(cellX + 7919, 374761393) ^ Math.imul(cellY + 104729, 668265263) ^ groundDetailRunSeed) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}
function biomeNoise(fieldX, fieldY){
  const cellX = Math.floor(fieldX), cellY = Math.floor(fieldY), fractionX = fieldX - cellX, fractionY = fieldY - cellY;
  const easeX = fractionX*fractionX*(3 - 2*fractionX), easeY = fractionY*fractionY*(3 - 2*fractionY);
  const top = biomeCellHash(cellX, cellY)*(1 - easeX) + biomeCellHash(cellX + 1, cellY)*easeX;
  const bottom = biomeCellHash(cellX, cellY + 1)*(1 - easeX) + biomeCellHash(cellX + 1, cellY + 1)*easeX;
  return top*(1 - easeY) + bottom*easeY;
}
function tileBiome(gx, gy){
  if(Math.max(Math.abs(gx - Math.floor(COLS/2)), Math.abs(gy - Math.floor(ROWS/2))) < BIOME_MIN_DISTANCE_TILES) return 'MEADOW';
  const seedPhase = (groundDetailRunSeed % 6283) / 1000;
  const warpedX = gx + BIOME_WARP_TILES * Math.sin(gy * 0.31 + seedPhase), warpedY = gy + BIOME_WARP_TILES * Math.sin(gx * 0.27 + seedPhase * 1.7);
  const level = biomeNoise(warpedX / BIOME_PATCH_TILES, warpedY / BIOME_PATCH_TILES);
  return level < 0.36 ? 'PINEWOOD' : level > 0.64 ? 'DUNES' : 'MEADOW';
}
function grassTileFill(gx, gy, isLightTile){ return BIOME_GRASS[tileBiome(gx, gy)][isLightTile ? 0 : 1]; }
function rollTreeVariant(gx, gy, rng = Math.random){
  const biome = tileBiome(gx, gy), roll = rng();
  if(biome === 'PINEWOOD') return roll < 0.85 ? 1 : 0;
  if(biome === 'DUNES') return roll < 0.85 ? 2 : 0;
  return 0;
}
// SCENERY-SPRITE-01
function drawSceneryEmoji(ctx, emoji, item, size){
  ctx.save();
  ctx.translate(item.x, item.y + 2);
  if(Number.isFinite(item.revealBornAt) && presentationTime-item.revealBornAt < 450 && !PREFERS_REDUCED_MOTION){const t=Math.min(1,Math.max(0,(presentationTime-item.revealBornAt)/450));ctx.globalAlpha*=t;const pop=0.7+0.3*t+Math.sin(t*Math.PI)*0.12;ctx.scale(pop,pop);ctx.rotate(Math.sin(t*Math.PI)*0.08);}
  if(item.isClearing) ctx.globalAlpha *= 0.32;
  if(item.type === 'BRANCH') drawBranchSprite(ctx,size,undefined,item); else if(item.type === 'STUMP') drawStumpSprite(ctx,size); else drawEmojiSprite(ctx, emoji, size);
  ctx.restore();
}
function sceneryEmojiFor(item, chanceDefinition){
  return chanceDefinition ? chanceDefinition.emoji : EVENT_PROP_EMOJI[item.type] ? EVENT_PROP_EMOJI[item.type] : item.type === 'TREE' ? (TREE_VARIANT_EMOJI[item.variant || 0] || '🌳') : item.type === 'ROCK' ? '🪨' : item.type === 'BUSH' ? '🪴' : item.type === 'SUPPLY_CRATE' ? '📦' : item.type === 'CHEST' ? '🎁' : item.type === 'STICKS' ? '🥢' : item.type === 'COIN_POUCH' ? '💰' : '💎';
}
// SCENERY-SHADOW-PASS-01: every scenery ground shadow is painted in one pass before any scenery, actor or tower sprite, so a shadow never lies across a tree, rock or stickman standing beside it.
function drawSceneryGroundShadow(ctx, item, size, strength = SCENERY_SHADOW_STRENGTH){
  const emoji = sceneryEmojiFor(item, CONFIG.CHANCE_STRUCTURES[item.type]);
  if(item.type==='BRANCH'){
    if(graphicsQuality==='high'){ctx.save();ctx.globalAlpha*=0.24;ctx.translate(item.x+size*0.08,item.y+2);ctx.transform(1,0,-0.35,0.25,0,0);drawBranchSprite(ctx,size,undefined,item);ctx.restore();}
  } else if(item.type==='STUMP'){
    if(graphicsQuality==='high'){ctx.save();ctx.globalAlpha*=strength;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(item.x+size*0.1,item.y+2+size*0.30,size*0.37,size*0.12,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  } else drawEmojiGroundShadow(ctx,emoji,item.x,item.y+2,Math.round(size),'serif',(item.flip ? -1 : 1)*(item.widthStretch || 1),item.tallStretch || 1,strength);
}
// SCENERY-SHADOW-UNION-01: silhouette shadows are painted fully dark into one layer and the layer is laid on the ground once at the shadow strength, so where two shadows overlap the ground is no darker than under one.
const SCENERY_SHADOW_STRENGTH = 0.24;
const sceneryShadowLayer = document.createElement('canvas'), sceneryShadowLayerContext = sceneryShadowLayer.getContext('2d');
// SCENERY-SHADOW-CACHE-01: painting the shadow layer and laying it on the ground in the same frame forces the browser to flush the layer every frame,
// which measured 16 ms per frame against under 2 ms for the same work split up, and lines up with the scenery spikes in debug logs.
const SCENERY_SHADOW_MARGIN_PX = 256;
let sceneryShadowSignature = 0, sceneryShadowPaintE = 0, sceneryShadowPaintF = 0, sceneryShadowBox = null;
function sceneryShadowSignatureFor(ctx, sortedItems){
  const matrix = ctx.getTransform();
  let hash = Math.imul(Math.round(matrix.a * 1000), 31) ^ Math.imul(ctx.canvas.width, 7919) ^ Math.imul(ctx.canvas.height, 104729) ^ (graphicsQuality === 'high' ? 1 : 2);
  for(const it of sortedItems){
    if(it.kind !== 's') continue;
    const item = it.item;
    hash = Math.imul(hash ^ (Math.round(item.x) * 73856093 ^ Math.round(item.y) * 19349663 ^ Math.round(it.size * 8) * 83492791 ^ item.type.length * 2654435761 ^ item.type.charCodeAt(0)), 16777619) >>> 0;
  }
  return hash || 1;
}
function isDirectSceneryShadow(item){ return item.type === 'BRANCH' || sceneryEmojiFor(item, CONFIG.CHANCE_STRUCTURES[item.type]) === '📦'; }
function repaintSceneryShadowLayer(ctx, sortedItems){
  const matrix = ctx.getTransform(), margin = SCENERY_SHADOW_MARGIN_PX, layer = sceneryShadowLayerContext;
  const width = ctx.canvas.width + margin*2, height = ctx.canvas.height + margin*2;
  if(sceneryShadowLayer.width !== width || sceneryShadowLayer.height !== height){ sceneryShadowLayer.width = width; sceneryShadowLayer.height = height; }
  else if(sceneryShadowBox){ layer.setTransform(1,0,0,1,0,0); layer.clearRect(sceneryShadowBox.x, sceneryShadowBox.y, sceneryShadowBox.w, sceneryShadowBox.h); }
  sceneryShadowBox = null;
  layer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e + margin, matrix.f + margin);
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for(const it of sortedItems){
    if(it.kind !== 's' || isDirectSceneryShadow(it.item)) continue;
    const reach = it.size * 2 * matrix.a, layerX = matrix.a * it.item.x + matrix.e + margin, layerY = matrix.d * it.item.y + matrix.f + margin;
    if(layerX + reach < 0 || layerY + reach < 0 || layerX - reach > width || layerY - reach > height) continue;
    left = Math.min(left, layerX - reach); right = Math.max(right, layerX + reach); top = Math.min(top, layerY - reach); bottom = Math.max(bottom, layerY + reach);
    drawSceneryGroundShadow(layer, it.item, it.size, 1);
  }
  const boxX = Math.max(0, Math.floor(left)), boxY = Math.max(0, Math.floor(top)), boxW = Math.min(width, Math.ceil(right)) - boxX, boxH = Math.min(height, Math.ceil(bottom)) - boxY;
  if(boxW > 0 && boxH > 0) sceneryShadowBox = { x: boxX, y: boxY, w: boxW, h: boxH };
  sceneryShadowPaintE = matrix.e; sceneryShadowPaintF = matrix.f;
}
function paintSceneryGroundShadows(ctx, sortedItems){
  for(const it of sortedItems) if(it.kind === 's' && isDirectSceneryShadow(it.item)) drawSceneryGroundShadow(ctx, it.item, it.size);
  if(graphicsQuality !== 'high') return;
  const matrix = ctx.getTransform(), margin = SCENERY_SHADOW_MARGIN_PX, signature = sceneryShadowSignatureFor(ctx, sortedItems);
  const shiftX = matrix.e - sceneryShadowPaintE, shiftY = matrix.f - sceneryShadowPaintF;
  if(signature !== sceneryShadowSignature || Math.abs(shiftX) > margin || Math.abs(shiftY) > margin){
    repaintSceneryShadowLayer(ctx, sortedItems);
    sceneryShadowSignature = signature;
  }
  const box = sceneryShadowBox;
  if(!box) return;
  const offsetX = matrix.e - sceneryShadowPaintE - margin, offsetY = matrix.f - sceneryShadowPaintF - margin;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha *= SCENERY_SHADOW_STRENGTH;
  ctx.drawImage(sceneryShadowLayer, box.x, box.y, box.w, box.h, box.x + offsetX, box.y + offsetY, box.w, box.h);
  ctx.restore();
}
function drawOneSceneryItem(ctx, key, item, size){
  if(item.type === 'COIN_POUCH'){
    const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, size*0.72);
    glow.addColorStop(0, 'rgba(255,205,45,0.48)'); glow.addColorStop(1, 'rgba(255,190,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(item.x, item.y, size*0.72, 0, Math.PI*2); ctx.fill();
  }
  if(item.isSuper){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,0,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(item.x, item.y, size*0.62, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.font = Math.round(size) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; // must never inherit leftover fillStyle from whatever drew immediately before it
  const chanceDefinition = CONFIG.CHANCE_STRUCTURES[item.type];
  const emoji = sceneryEmojiFor(item, chanceDefinition);
  if(chanceDefinition){
    // CHANCE-STRUCTURE-GLOW-01: A soft radial glow behind the
    // structure while it can actually help, replacing the earlier stroked ring outline. Steady, never
    // pulsing: nothing here fades in and out.
    if(item.type === 'CAMPFIRE'){
      ctx.save();if(item.isClearing) ctx.globalAlpha*=0.32;drawCampfire(ctx, item, size);ctx.restore();
      if(key === hoveredSceneryKey){
        ctx.font = 'bold 10px Verdana'; ctx.fillStyle = '#ffb74d';
        ctx.fillText(chanceStructureHoverLabel(item), item.x, item.y - size*0.5 - 6);
      }
      return;
    }
    drawSceneryEmoji(ctx, emoji, item, size);
    ctx.font = 'bold 11px Verdana';
    ctx.fillStyle = '#ffe3e8'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
    ctx.strokeText('❤️' + item.healPool, item.x, item.y + size*0.5 + 8);
    ctx.fillText('❤️' + item.healPool, item.x, item.y + size*0.5 + 8);
    ctx.font = Math.round(size) + 'px serif';
    if(item.isClearing){
      const progress = Math.min(1, (presentationTime-item.clearStart)/item.clearMs);
      ctx.save();
      const barW = size*0.9, barX = item.x - barW/2, barY = item.y + size*0.5 + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(barX, barY, barW*progress, 5);
      ctx.restore();
    } else if(key === hoveredSceneryKey && item.type !== 'BUSH'){
      ctx.font = 'bold 10px Verdana'; ctx.fillStyle = '#7dd3fc';
      ctx.fillText(chanceStructureHoverLabel(item), item.x, item.y - size*0.5 - 6);
    }
    return;
  }
  if(item.isClearing){
    // CLEAR-PIE-01: the clearing progress is a clock-wipe wedge that sweeps clockwise from the top behind the emoji: one yellow
    // gradient wedge by itself, with no dark disc behind it, no stripes and no outline.
    const clearProgress = Math.min(1, Math.max(0, (presentationTime - item.clearStart)/item.clearMs)), pieRadius = size*0.5, startAngle = -Math.PI/2;
    if(clearProgress > 0){
      ctx.save();
      const pieGradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, pieRadius);
      pieGradient.addColorStop(0, '#fff6a8'); pieGradient.addColorStop(0.6, '#ffd93b'); pieGradient.addColorStop(1, '#f2a900');
      ctx.fillStyle = pieGradient; ctx.beginPath(); ctx.moveTo(item.x, item.y);
      ctx.arc(item.x, item.y, pieRadius, startAngle, startAngle + clearProgress*Math.PI*2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.font = Math.round(size) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  }
  // CLEAR-HOURGLASS-01: timed harvest sprites fade inside drawSceneryEmoji().
  const stretch = item.tallStretch || 1, wide = item.widthStretch || 1, mirrored = !!item.flip;
  if(stretch !== 1 || wide !== 1 || mirrored){
    const baseY = item.y + size*0.5;
    ctx.save();
    ctx.translate(item.x, baseY);
    ctx.scale((mirrored ? -1 : 1) * wide, stretch);
    ctx.translate(-item.x, -baseY);
    drawSceneryEmoji(ctx, emoji, item, size);
    ctx.restore();
  } else {
    drawSceneryEmoji(ctx, emoji, item, size);
  }
  // CLEAR-OVERLAY-01: the hourglass is drawn by drawClearingHourglass() after scenery and actors.
  if(item.isClearing || key !== hoveredSceneryKey) return;
  const displayCost = sceneryClearCost(item); // includes the Axeman/Hammerman discount; shown only while hovered or tapped
  if(displayCost <= 0) return;
  ctx.font = 'bold 10px Verdana';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('💰' + displayCost, item.x, item.y + size*0.5 + 4);
}
function drawClearingHourglass(ctx, item, size){
  if(!item.isClearing || item.clearMs <= 0) return;
  ctx.save();
  ctx.translate(item.x, item.y);
  const flipT = Math.max(0,presentationTime - item.clearStart) % 1800;
  // One sprite and a complete eased turn: identical pose at the cycle boundary.
  if(!PREFERS_REDUCED_MOTION && flipT > 1200){
    const t=(flipT-1200)/600;
    ctx.rotate(Math.PI*2*t*t*(3-2*t));
  }
  drawEmojiSprite(ctx, '⌛', clampNum(size*0.4, 20, 26));
  ctx.restore();
}
/* =========================================================
   LOOSE ENEMIES
   ========================================================= */
// LOOSE-DRAIN-01 / LOOSE-CONFINE-01
const DOWNED_TOWER_SKIN_MAIN = '#9b9b9b';
const DOWNED_TOWER_SKIN_SHADE = '#7a7a7a';
const LOOSE_ENEMY_LIFE_DRAIN_MS = 6000;
const LOOSE_DRAIN_FIRST_WAVE = 4; // LOOSE-DRAIN-GRACE-01
function advanceLooseDrain(drainMs, dtMs){
  const totalMs = drainMs + dtMs;
  const hearts = Math.floor(totalMs / LOOSE_ENEMY_LIFE_DRAIN_MS);
  return { hearts, remainingMs: totalMs - hearts*LOOSE_ENEMY_LIFE_DRAIN_MS };
}
function nearestLooseWalkableTileCenter(worldX, worldY){
  const originTileX = Math.floor(worldX / TILE_SIZE), originTileY = Math.floor(worldY / TILE_SIZE);
  for(let radius = 1; radius <= 12; radius++){
    for(let dx = -radius; dx <= radius; dx++){
      for(let dy = -radius; dy <= radius; dy++){
        if(Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const tileX = originTileX + dx, tileY = originTileY + dy;
        if(pathCells.has(tileX+','+tileY) || isInActiveRegion(tileX, tileY)) return { x: tileX*TILE_SIZE + TILE_SIZE/2, y: tileY*TILE_SIZE + TILE_SIZE/2 };
      }
    }
  }
  return null;
}
const LOOSE_WANDER_COMMIT_MIN_MS = 2200, LOOSE_WANDER_COMMIT_SPREAD_MS = 3000;
const LOOSE_WANDER_STEER_RAD_PER_S = 2.4, LOOSE_WANDER_GOAL_REACHED_PX = 18;
const LOOSE_WANDER_EXPLORE_SPEED = 0.7, LOOSE_WANDER_GOAL_SAMPLES = 8, LOOSE_WANDER_AVOID_FINISH_TILES = 2.5;
// Picks the farthest of a few random walkable tiles that are not right next to the finish line, so loose enemies spread out over the grass.
function pickLooseExploreGoal(fromX, fromY){
  if(!activeRegion) return null;
  const finishPoint = waypointsPx && waypointsPx.length ? waypointsPx[waypointsPx.length - 1] : null;
  let best = null, bestDistance = 0;
  for(let attempt = 0; attempt < LOOSE_WANDER_GOAL_SAMPLES; attempt++){
    const tileX = activeRegion.x0 + Math.floor(Math.random() * (activeRegion.x1 - activeRegion.x0 + 1));
    const tileY = activeRegion.y0 + Math.floor(Math.random() * (activeRegion.y1 - activeRegion.y0 + 1));
    const goalX = tileX*TILE_SIZE + TILE_SIZE/2 + (Math.random()-0.5)*TILE_SIZE*0.6, goalY = tileY*TILE_SIZE + TILE_SIZE/2 + (Math.random()-0.5)*TILE_SIZE*0.6;
    if(!isLooseWalkableAt(goalX, goalY)) continue;
    if(finishPoint && Math.hypot(goalX - finishPoint.x, goalY - finishPoint.y) < LOOSE_WANDER_AVOID_FINISH_TILES*TILE_SIZE) continue;
    const distance = Math.hypot(goalX - fromX, goalY - fromY);
    if(distance > bestDistance){ bestDistance = distance; best = { x: goalX, y: goalY }; }
  }
  return best;
}
const LOOSE_CONTACT_RADIUS_TILES = 1.1, LOOSE_PERIMETER_GOAL_MIN_TILES = 1, LOOSE_PERIMETER_GOAL_SAMPLES = 24;
// LOOSE-ROAM-01: escaped enemies roam the whole open map off the road (never walking back up it), preferring ground ahead of their heading.
function isLooseRoamTile(tileX, tileY){
  const centerX = tileX*TILE_SIZE + TILE_SIZE/2, centerY = tileY*TILE_SIZE + TILE_SIZE/2;
  return isInActiveRegion(tileX, tileY) && !pathCells.has(tileX + ',' + tileY) && !isSceneryBlockedAt(centerX, centerY);
}
function pickLooseRoamGoal(fromX, fromY, headingRad){
  if(!activeRegion) return null;
  let best = null, bestScore = -Infinity;
  for(let attempt = 0; attempt < LOOSE_PERIMETER_GOAL_SAMPLES; attempt++){
    const tileX = activeRegion.x0 + Math.floor(Math.random() * (activeRegion.x1 - activeRegion.x0 + 1));
    const tileY = activeRegion.y0 + Math.floor(Math.random() * (activeRegion.y1 - activeRegion.y0 + 1));
    if(!isLooseRoamTile(tileX, tileY)) continue;
    const goalX = tileX*TILE_SIZE + TILE_SIZE/2 + (Math.random()-0.5)*TILE_SIZE*0.6, goalY = tileY*TILE_SIZE + TILE_SIZE/2 + (Math.random()-0.5)*TILE_SIZE*0.6;
    const distance = Math.hypot(goalX - fromX, goalY - fromY);
    if(distance < LOOSE_PERIMETER_GOAL_MIN_TILES*TILE_SIZE) continue;
    const score = Math.cos(Math.atan2(goalY - fromY, goalX - fromX) - headingRad) + Math.random()*2 - distance/(TILE_SIZE*10);
    if(score > bestScore){ bestScore = score; best = { x: goalX, y: goalY }; }
  }
  return best || pickLooseExploreGoal(fromX, fromY);
}
const SCENERY_DETOUR_ANGLES = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5];
function isSceneryBlockedAt(worldX, worldY){ // SCENERY-SOLID-01: trees and rocks are solid to anything walking off the road
  const item = sceneryMap.get(Math.floor(worldX / TILE_SIZE) + ',' + Math.floor(worldY / TILE_SIZE));
  return !!item && (item.type === 'TREE' || item.type === 'ROCK');
}
function isRoadTileAt(worldX, worldY){ return pathCells.has(Math.floor(worldX / TILE_SIZE) + ',' + Math.floor(worldY / TILE_SIZE)); }
function moveAroundScenery(walker, dirX, dirY, speedPxPerS, dtMs, avoidRoad){ // steps toward (dirX, dirY), turning to the walker's preferred side until the lookahead clears scenery (and the road, for an off-road roamer)
  const baseAngle = Math.atan2(dirY, dirX), stepPx = speedPxPerS * dtMs / 1000, lookaheadPx = (walker.radius || 10) + 6;
  const side = walker.detourSide || (walker.detourSide = Math.random() < 0.5 ? -1 : 1);
  const keepOffRoad = avoidRoad && !isRoadTileAt(walker.x, walker.y);
  for(const offset of SCENERY_DETOUR_ANGLES){
    const angle = baseAngle + offset * side, cosA = Math.cos(angle), sinA = Math.sin(angle);
    const aheadX = walker.x + cosA*lookaheadPx, aheadY = walker.y + sinA*lookaheadPx;
    if(isSceneryBlockedAt(aheadX, aheadY) || (keepOffRoad && isRoadTileAt(aheadX, aheadY))) continue;
    walker.vx = cosA * speedPxPerS; walker.vy = sinA * speedPxPerS;
    walker.x += cosA * stepPx; walker.y += sinA * stepPx;
    return angle;
  }
  if(!isSceneryBlockedAt(walker.x, walker.y)){ walker.vx = 0; walker.vy = 0; return baseAngle; }
  walker.vx = Math.cos(baseAngle) * speedPxPerS; walker.vy = Math.sin(baseAngle) * speedPxPerS;
  walker.x += walker.vx * dtMs / 1000; walker.y += walker.vy * dtMs / 1000;
  return baseAngle;
}
function isLooseWalkableAt(worldX, worldY){
  const tileX = Math.floor(worldX / TILE_SIZE), tileY = Math.floor(worldY / TILE_SIZE);
  return pathCells.has(tileX+','+tileY) || isInActiveRegion(tileX, tileY);
}
// Returns true when the move had to be undone or slid along an edge. Velocity is turned around so the
// enemy heads back into the walkable area instead of pressing against the edge.
function confineLooseEnemyToRoute(enemy, previousX, previousY){
  if(isLooseWalkableAt(enemy.x, enemy.y)) return false;
  if(isLooseWalkableAt(enemy.x, previousY)){ enemy.y = previousY; enemy.wanderVy = -enemy.wanderVy; return true; }
  if(isLooseWalkableAt(previousX, enemy.y)){ enemy.x = previousX; enemy.wanderVx = -enemy.wanderVx; return true; }
  enemy.x = previousX; enemy.y = previousY;
  enemy.wanderVx = -enemy.wanderVx; enemy.wanderVy = -enemy.wanderVy;
  return true;
}
/* =========================================================
   TELEMETRY AND ANALYTICS
   ========================================================= */
// TELEMETRY-01
const TELEMETRY_EVENTS = {
  game_started: ['device', 'viewport', 'first_visit', 'loaded_save'],
  wave_started: ['wave', 'lives', 'gold', 'towers', 'loose', 'unlocked_towers'],
  wave_completed: ['wave', 'duration_s', 'simulation_duration_s', 'lives_start', 'lives_end', 'lives_lost', 'escaped', 'loose_peak', 'loose_end', 'loose_drain_lives', 'towers_downed', 'gold_start', 'gold_end', 'towers', 'fps_median', 'gap_p95_ms'],
  wave_milestone: ['waves_completed'],
  engaged_player: ['waves_completed', 'duration_s'],
  tower_built: ['tower_type', 'cost', 'wood_cost', 'stone_cost', 'payment_type', 'towers', 'first_of_type'],
  tower_upgraded: ['tower_type', 'level', 'cost'],
  tower_sold: ['tower_type', 'level', 'refund'],
  tower_downed: ['tower_type', 'tower_level', 'cause', 'towers_standing'],
  item_purchased: ['item', 'payment_type', 'cost', 'wood_cost', 'stone_cost'],
  map_expanded: ['expansion_level', 'route_tiles', 'spacing_relaxed'],
  item_drifted: ['item', 'tower_type'],
  summon_used: ['item', 'tower_type'], // SUMMON-ITEMS-01
  early_call_bonus: ['wave', 'gold'], // EARLY-CALL-01 // TELEMETRY-CATALOG-01: every event the code sends is declared
  item_dropped: ['item', 'rarity', 'enemy_type'], // ANALYTICS-PARAMS-01
  item_equipped: ['item', 'rarity', 'tower_type', 'items_carried'],
  item_guide_shown: [],
  item_crafted: ['result', 'tower_type'],
  game_speed_changed: ['speed'],
  target_marked: ['target_type', 'enemy_type'],
  food_collected: ['item', 'tower_type'],
  food_used: ['item', 'tower_type', 'instant'],
  shovel_used: ['tower_type'],
  treat_used: ['item', 'tower_type'],
  stim_used: ['item', 'tower_type'],
  stim_collected: ['item', 'tower_type'],
  treat_collected: ['item', 'tower_type'],
  defibrillator_used: ['lives_after'],
  hut_loot_collected: ['item'],
  hut_loot_used: ['item', 'tower_type'],
  caravan_arrived: ['round', 'wood', 'stone'],
  caravan_sale: ['resource', 'amount', 'gold'],
  livestock_harvested: ['livestock'],
  chance_structure_spawned: ['structure', 'lives'],
  chance_structure_used: ['structure', 'healed', 'pool_left'],
  scenery_cleared: ['scenery_type'],
  shop_opened: ['gold'],
  settings_changed: ['setting', 'setting_value'],
  save_downloaded: ['waves_completed'],
  save_loaded: ['save_version', 'waves_completed'],
  save_load_failed: ['reason'],
  progress_reset: ['kind'],
  santa_boss_encountered: ['wave'],
  act_started: ['act', 'act_name'],
  medal_earned: ['medal', 'medals_total'],
  game_over: ['kills', 'best_streak', 'seed', 'personal_best', 'act', 'cause', 'wave_reached', 'waves_completed', 'duration_s', 'towers_built', 'towers_downed', 'lives_bought', 'loose_end', 'fps_median'],
  lag_detected: ['median_gap_ms', 'p95_gap_ms', 'towers_downed', 'enemies', 'loose', 'decals', 'particles'],
  session_summary: ['wave', 'duration_s', 'elapsed_s', 'max_wave', 'waves_completed', 'towers_built', 'ended_in_game_over', 'end_reason'],
  play_activity: ['active_seconds', 'waves_completed', 'checkpoint_reason'],
  onboarding_step: ['step'],
  life_purchased: ['cost', 'lives_after'],
  game_error: ['error_kind', 'error_type', 'line']
};
const TELEMETRY_RECENT_LIMIT = 200;
const LAG_MEDIAN_GAP_THRESHOLD_MS = 90;
const LAG_MIN_SAMPLES = 60;
const telemetryRecent = [];
const sessionTelemetry = { startedAtMs: 0, activeMs: 0, activeSince: null, reportedActiveMs: 0, completedHere: 0, origin: 'fresh', runId:'none', onboarding: new Set(), towersBuilt: 0, towersDowned: 0, gameOverReported: false, engagedReported: false };
const TELEMETRY_SHARED_PARAMS = ['game_version','wave','quality','platform','build','device','telemetry_schema','run_origin','event_group','run_id'];
function telemetryActiveMs(){
  return sessionTelemetry.activeMs + (sessionTelemetry.activeSince === null ? 0 : Math.max(0, performance.now() - sessionTelemetry.activeSince));
}
function telemetryStateChange(next){
  sessionTelemetry.activeMs = telemetryActiveMs();
  sessionTelemetry.activeSince = sessionTelemetry.startedAtMs && next === 'PLAYING' && !document.hidden ? performance.now() : null;
}
function beginTelemetryRun(loadedSave){
  Object.assign(sessionTelemetry, { startedAtMs:performance.now(), activeMs:0, activeSince:document.hidden ? null : performance.now(), reportedActiveMs:0, completedHere:0, origin:loadedSave ? 'save' : 'fresh', runId:window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10), towersBuilt:0, towersDowned:0, gameOverReported:false, engagedReported:false });
  sessionTelemetry.onboarding.clear();
  builtTowerTypesThisSession.clear();
  trackGameEvent('game_started', { device:IS_MOBILE_DEVICE ? 'mobile' : 'desktop', viewport:Math.round(innerWidth/100)*100+'x'+Math.round(innerHeight/100)*100, first_visit:telemetryFirstVisit(), loaded_save:loadedSave });
  try{ localStorage.setItem('stickTD_welcomeSeen', '1'); }catch(e){}
}
function telemetryFirstVisit(){
  try{ return !localStorage.getItem('stickTD_welcomeSeen'); }catch(e){ return false; }
}
function reportOnboardingStep(step){
  if(!sessionTelemetry.startedAtMs || sessionTelemetry.origin !== 'fresh' || sessionTelemetry.onboarding.has(step)) return;
  sessionTelemetry.onboarding.add(step);
  trackGameEvent('onboarding_step', { step });
}
function reportPlayActivity(reason){
  if(!sessionTelemetry.startedAtMs) return;
  const total = telemetryActiveMs();
  const seconds = Math.floor((total - sessionTelemetry.reportedActiveMs)/1000);
  sessionTelemetry.reportedActiveMs += seconds*1000; // consume locally even without consent; never replay
  if(seconds > 0) trackGameEvent('play_activity', { active_seconds:seconds, waves_completed:sessionTelemetry.completedHere, checkpoint_reason:reason });
}
window.onStickTDAnalyticsEnabled = function(){ sessionTelemetry.reportedActiveMs = telemetryActiveMs(); };
setInterval(() => { if(!document.hidden && gameState === 'PLAYING') reportPlayActivity('interval'); }, 60000);
function telemetryEventGroup(name){
  if(/^(game_error|lag_detected)$/.test(name)) return 'diagnostics';
  if(/^(game_started|game_over|session_summary|play_activity|engaged_player|onboarding_step)$/.test(name)) return 'engagement';
  if(/^(wave_|tower_|target_|santa_)/.test(name)) return 'combat';
  if(/^(settings_|save_|progress_|game_speed)/.test(name)) return 'settings';
  return 'economy';
}
const ENGAGED_PLAYER_WAVES = 5; // ENGAGED-PLAYER-01
function reportEngagedPlayerOnce(){
  if(sessionTelemetry.engagedReported || sessionTelemetry.completedHere < ENGAGED_PLAYER_WAVES) return;
  sessionTelemetry.engagedReported = true;
  trackGameEvent('engaged_player', { waves_completed: sessionTelemetry.completedHere, duration_s: Math.round(telemetryActiveMs()/1000) });
}
const waveTelemetry = { activeAtStartMs: 0, startedAtGameTime: 0, livesAtStart: 0, goldAtStart: 0, escaped: 0, towersDowned: 0, loosePeak: 0, looseDrainLives: 0, lagReported: false };
function trackGameEvent(name, params){
  const declaredParams = TELEMETRY_EVENTS[name];
  if(!declaredParams){ console.warn('trackGameEvent: "' + name + '" is not in TELEMETRY_EVENTS'); return; }
  const payload = { game_version:GAME_VERSION, wave:waveIndex, quality:graphicsQuality, platform:window.STICKTD_PLATFORM || 'other', build:window.STICKTD_BUILD || 'web', device:IS_MOBILE_DEVICE ? 'mobile' : 'desktop', telemetry_schema:2, run_origin:sessionTelemetry.origin, run_id:sessionTelemetry.runId, event_group:telemetryEventGroup(name) };
  if(params){
    for(const key of declaredParams){
      if(params[key] === undefined) continue;
      const value = params[key];
      if(typeof value === 'string') payload[key] = value.slice(0, 100);
      else if(typeof value === 'boolean') payload[key] = value ? 1 : 0;
      else if(typeof value === 'number' && Number.isFinite(value)) payload[key] = value;
    }
  }
  const queued = window.trackEvent ? window.trackEvent(name, payload) === true : false;
  telemetryRecent.push({ atSecond: Math.round(gameTime/1000), name, payload, delivery:queued ? 'queued' : 'local_only' });
  if(telemetryRecent.length > TELEMETRY_RECENT_LIMIT) telemetryRecent.shift();
}
(function readRenderEnvironment(){
  try{
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if(!gl){ renderEnvironment.gpuRenderer = 'WebGL unavailable'; renderEnvironment.softwareRendering = null; }
    else {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'renderer name hidden by the browser';
      renderEnvironment.gpuRenderer = name;
      renderEnvironment.softwareRendering = /swiftshader|llvmpipe|basic render|software|softpipe/i.test(name);
      const lose = gl.getExtension('WEBGL_lose_context'); if(lose) lose.loseContext();
    }
  }catch(err){ renderEnvironment.gpuRenderer = 'could not be read'; }
  try{
    if(navigator.getBattery) navigator.getBattery().then(b => { renderEnvironment.battery = (b.charging ? 'charging' : 'on battery') + ', ' + Math.round(b.level*100) + '%'; }).catch(() => {});
  }catch(err){ /* battery status unavailable */ }
})();
const deviceDiagnostics = { architecture:'unavailable', bitness:'unavailable', model:'unavailable', platformVersion:'unavailable', storage:'unavailable', browserBrands:'unavailable' };
function readDeviceDiagnostics(){
  try {
    if(navigator.userAgentData){
      deviceDiagnostics.browserBrands = (navigator.userAgentData.brands || []).map(b => b.brand+' '+b.version).join(', ') || 'unavailable';
      if(navigator.userAgentData.getHighEntropyValues) navigator.userAgentData.getHighEntropyValues(['architecture','bitness','model','platformVersion']).then(info => {
        for(const key of ['architecture','bitness','model','platformVersion']) deviceDiagnostics[key] = info[key] || 'unavailable';
      }).catch(() => {});
    }
  } catch(error) {}
  try {
    if(navigator.storage && navigator.storage.estimate){
      deviceDiagnostics.storage = 'estimate pending';
      navigator.storage.estimate().then(info => {
        const mib = n => Number.isFinite(n) ? (n/1048576).toFixed(1)+' MiB' : 'unavailable';
        deviceDiagnostics.storage = 'origin usage '+mib(info.usage)+' / quota '+mib(info.quota);
      }).catch(() => { deviceDiagnostics.storage='unavailable'; });
    }
  } catch(error) { deviceDiagnostics.storage='unavailable'; }
}
readDeviceDiagnostics();
function deviceDebugReport(){
  const memory = performance.memory;
  const mib = n => Number.isFinite(n) ? (n/1048576).toFixed(1)+' MiB' : 'unavailable';
  const connection = navigator.connection;
  return 'CPU model: unavailable (browser API); logical threads: '+(navigator.hardwareConcurrency || 'unavailable')+'; architecture: '+deviceDiagnostics.architecture+'; bitness: '+deviceDiagnostics.bitness+'\n' +
    'GPU diagnostic WebGL renderer: '+renderEnvironment.gpuRenderer+'; Canvas 2D GPU assignment/VRAM/utilization: unavailable\n' +
    'RAM approximate browser-reported bucket: '+(navigator.deviceMemory ? navigator.deviceMemory+' GiB' : 'unavailable')+'; total/free physical RAM: unavailable\n' +
    'JS heap used/allocated/limit: '+(memory ? mib(memory.usedJSHeapSize)+' / '+mib(memory.totalJSHeapSize)+' / '+mib(memory.jsHeapSizeLimit) : 'unavailable')+' (browser-specific; not system memory)\n' +
    'Storage: '+deviceDiagnostics.storage+' (origin estimate, not disk capacity); drive model/SSD/HDD/external drive: unavailable\n' +
    'OS/platform: '+(navigator.userAgentData?.platform || navigator.platform || 'unavailable')+'; version: '+deviceDiagnostics.platformVersion+'; device model: '+deviceDiagnostics.model+'\n' +
    'Browser brands: '+deviceDiagnostics.browserBrands+'; user agent: '+navigator.userAgent+'\n' +
    'Display: '+screen.width+'x'+screen.height+'; available '+screen.availWidth+'x'+screen.availHeight+'; color depth '+screen.colorDepth+'; DPR '+(window.devicePixelRatio || 1)+'; viewport '+window.innerWidth+'x'+window.innerHeight+'\n' +
    'Network estimate: '+(connection ? connection.effectiveType+'; downlink '+connection.downlink+' Mbps; RTT '+connection.rtt+' ms; save-data '+connection.saveData : 'unavailable')+'\n' +
    'Power snapshot: '+renderEnvironment.battery+'; touch points: '+(navigator.maxTouchPoints || 0)+'; language: '+navigator.language+'\n' +
    'CPU/GPU load, clock speed, temperature and storage health: unavailable in standard browser APIs\n';
}
function framePacingVerdict(){
  const medianGapMs = perfPercentile(perfStats.wallGapMsHistory, 0.5);
  const p95GapMs = perfPercentile(perfStats.wallGapMsHistory, 0.95);
  if(!(medianGapMs > 0)) return 'not enough frames sampled yet';
  const gameMs = (perfStats.updateMs || 0) + (perfStats.renderMs || 0);
  const text = 'median gap ' + medianGapMs.toFixed(1) + ' ms, 95th percentile ' + p95GapMs.toFixed(1) + ' ms, game time ' + gameMs.toFixed(1) + ' ms per frame';
  if(frameCapEnabled && Math.abs(medianGapMs - frameCapIntervalMs()) < 4) return text + ' — matches the game\'s own frame rate cap of ' + frameCapFps() + ' FPS (Settings, Video)';
  if(medianGapMs >= 29 && medianGapMs <= 38 && p95GapMs <= 45 && gameMs < 8) return text + ' — steady near 30 FPS with little game time: typical of a browser Energy Saver, OS battery saver or a 30 Hz display mode, not of game code';
  if(gameMs >= medianGapMs*0.6) return text + ' — game time is a large share of each frame';
  if(medianGapMs > 22) return text + ' — slow frames with little game time: the delay is outside game code (browser, graphics driver or display)';
  return text + ' — healthy';
}
function perfMedianFps(){
  const medianGapMs = perfPercentile(perfStats.wallGapMsHistory, 0.5);
  return medianGapMs > 0 ? Math.round(1000/medianGapMs) : 0;
}
function countTowersDownedNow(){
  let downed = 0;
  for(const tower of towerPool) if(tower.active && isFighterTower(tower) && tower.disabledWavesLeft > 0) downed++;
  return downed;
}
// SQUAD-WIPE-01: the run ends when every fighting stickman is down at once; the Hacker never fights, so he cannot keep a run alive.
function squadWipedOut(){
  let fighters = 0;
  for(const tower of towerPool){
    if(!tower.active || !isFighterTower(tower) || tower.type === 'HACKER') continue;
    if(!(tower.disabledWavesLeft > 0)) return false;
    fighters++;
  }
  return fighters > 0 || everBuiltFighter;
}
function endRunOnSquadWipe(){
  endGame('Every stickman was overrun on wave ' + Math.max(1, waveIndex) + '.\nRebuild your squad and try again.', 'squad_down');
}
function countActiveTowers(){
  let active = 0;
  for(const tower of towerPool) if(tower.active && isFighterTower(tower)) active++;
  return active;
}
// A run of slow frames that the game's own timers cannot explain (the browser delaying the frame
// callback) is reported once per wave, with what was on screen, so a lag cause can be found from the numbers.
function maybeReportLag(){
  if(waveTelemetry.lagReported || perfStats.wallGapMsHistory.length < LAG_MIN_SAMPLES) return;
  const medianGapMs = perfPercentile(perfStats.wallGapMsHistory, 0.5);
  if(medianGapMs < LAG_MEDIAN_GAP_THRESHOLD_MS) return;
  waveTelemetry.lagReported = true;
  trackGameEvent('lag_detected', {
    median_gap_ms: Math.round(medianGapMs), p95_gap_ms: Math.round(perfPercentile(perfStats.wallGapMsHistory, 0.95)),
    towers_downed: countTowersDownedNow(), enemies: perfStats.totalActiveEnemies, loose: countLooseEnemies(),
    decals: perfStats.totalDecals, particles: perfStats.totalParticles
  });
}
function reportTowerDowned(tower, cause){
  recordUnitDeath('tower downed',tower.type,cause);
  sessionTelemetry.towersDowned++; waveTelemetry.towersDowned++;
  startDowningCapture(tower, cause);
  trackGameEvent('tower_downed', { tower_type: tower.type, tower_level: tower.level, cause, towers_standing: countActiveTowers() - countTowersDownedNow() });
}
function telemetrySummaryPayload(reason){
  return { wave:waveIndex, duration_s:Math.round(telemetryActiveMs()/1000), elapsed_s:sessionTelemetry.startedAtMs ? Math.round((performance.now()-sessionTelemetry.startedAtMs)/1000) : 0,
    max_wave:waveIndex, waves_completed:sessionTelemetry.completedHere, towers_built:sessionTelemetry.towersBuilt, ended_in_game_over:sessionTelemetry.gameOverReported, end_reason:reason };
}
function reportSessionSummary(reason = 'game_over', snapshot = null){
  if(!sessionTelemetry.startedAtMs) return;
  reportPlayActivity(reason);
  trackGameEvent('session_summary', snapshot || telemetrySummaryPayload(reason));
  sessionTelemetry.activeMs = telemetryActiveMs();
  sessionTelemetry.activeSince = null;
  sessionTelemetry.startedAtMs = 0;
}
/* =========================================================
   DEPTH SORT AND ACTOR DRAWING
   ========================================================= */
const depthSortPool = [];
const depthSortItems = [];
function getDepthSortItem(i){
  let o = depthSortPool[i];
  if(!o){ o = {}; depthSortPool[i] = o; }
  return o;
}
function towerScrollY(t){
  const buildY = t.buildScaleY || (JOB_BUILD[t.type] || {scaleY:1}).scaleY;
  let scrollY = t.y - 41*STICKMAN_SCALE*buildY;
  if(t.isLegendary) scrollY -= 14*STICKMAN_SCALE;
  else if(t.isHero) scrollY -= 8*STICKMAN_SCALE;
  return scrollY;
}
function drawTowerScroll(ctx, t, scrollY){
  ctx.font = '14px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pulse = 0.55 + 0.45*Math.sin(gameTime/220); // gentle glow pulse, not a hard flash
  ctx.save();
  ctx.shadowColor = '#4caf50'; ctx.shadowBlur = (graphicsQuality === 'low' || underHeavyVisualLoad) ? 0 : 8 + pulse*6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('📜', t.x, scrollY);
  ctx.restore();
}
// ENEMY-SHADOW-BATCH-01: each enemy shadow was a skewed bitmap blit, which cost about 0.06 ms of drawing per enemy in the 150-enemy benchmark.
let enemyShadowsBatched = false;
const ENEMY_SHADOW_BATCH_MIN = 24;
function drawBatchedEnemyShadows(ctx, actorLeft, actorRight, actorTop, actorBottom){
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath();
  for(const e of enemyPool){
    if(!e.active || e.x < actorLeft || e.x > actorRight || e.y < actorTop || e.y > actorBottom) continue;
    const cx = e.x + e.radius*0.3, cy = e.y + e.radius*0.55, rx = e.radius*0.95, ry = e.radius*0.38;
    ctx.moveTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  }
  ctx.fill(); ctx.restore();
}
function drawDepthSortedLayer(ctx){
  refreshHeavyVisualLoadState();
  const cullMargin = TILE_SIZE * 1.5;
  const viewLeft = (0 - camera.x) / camera.zoom - cullMargin;
  const viewRight = (CANVAS_W - camera.x) / camera.zoom + cullMargin;
  const viewTop = (0 - camera.y) / camera.zoom - cullMargin;
  const viewBottom = (CANVAS_H - camera.y) / camera.zoom + cullMargin;
  depthSortItems.length = 0;
  let poolIdx = 0;
  let visibleSceneryCount = 0;
  for(const [key, item] of sceneryMap){
    if(item.x < viewLeft || item.x > viewRight || item.y < viewTop || item.y > viewBottom) continue;
    visibleSceneryCount++;
    const size = sceneryVisualSize(item);
    const baseY = item.y + size*0.5; // the item's "feet" — same anchor tallStretch already uses, so depth matches what visually reads as its base
    const o = getDepthSortItem(poolIdx++); o.sortY = baseY; o.kind = 's'; o.key = key; o.item = item; o.size = size;
    depthSortItems.push(o);
  }
  const actorViewLeft = viewLeft - 60, actorViewRight = viewRight + 60, actorViewTop = viewTop - 60, actorViewBottom = viewBottom + 60;
  let visibleEnemyCount = 0, totalActiveEnemyCount = 0;
  for(const e of enemyPool){
    if(!e.active) continue;
    totalActiveEnemyCount++;
    if(e.x < actorViewLeft || e.x > actorViewRight || e.y < actorViewTop || e.y > actorViewBottom) continue;
    visibleEnemyCount++;
    const o = getDepthSortItem(poolIdx++); o.sortY = e.y; o.kind = 'e'; o.e = e;
    depthSortItems.push(o);
  }
  let visibleTowerCount = 0, totalActiveTowerCount = 0;
  for(const t of towerPool){
    if(!t.active) continue;
    totalActiveTowerCount++;
    // SELECTED-CULL-01: a selected fighter is still culled once it is well off screen (its inspector stays open); the margin covers its weapon and labels.
    const selectedMargin = t === selectedTower ? 160 : 0;
    if(t.x < actorViewLeft - selectedMargin || t.x > actorViewRight + selectedMargin || t.y < actorViewTop - selectedMargin || t.y > actorViewBottom + selectedMargin) continue;
    visibleTowerCount++;
    const o = getDepthSortItem(poolIdx++); o.sortY = t.y; o.kind = 't'; o.t = t;
    depthSortItems.push(o);
    if(t.statPoints > 0 && isFighterTower(t)){
      const scrollY = towerScrollY(t);
      const so = getDepthSortItem(poolIdx++); so.sortY = scrollY; so.kind = 'r'; so.t = t; so.scrollY = scrollY;
      depthSortItems.push(so);
    }
  }
  perfStats.visibleEnemies = visibleEnemyCount; perfStats.totalActiveEnemies = totalActiveEnemyCount;
  enemyShadowsBatched = visibleEnemyCount >= ENEMY_SHADOW_BATCH_MIN;
  if(enemyShadowsBatched) drawBatchedEnemyShadows(ctx, actorViewLeft, actorViewRight, actorViewTop, actorViewBottom);
  perfStats.visibleTowers = visibleTowerCount; perfStats.totalActiveTowers = totalActiveTowerCount;
  let worldMark = performance.now();
  for(const d of depthSortedDecalsThisFrame){
    perfStats.visibleDecals++;
    drawOneDecal(ctx, d);
  }
  renderPhaseTime.worldDebris += performance.now() - worldMark; worldMark = performance.now();
  const sf = computeSpawnFlags();
  if(sf){
    const o1 = getDepthSortItem(poolIdx++); o1.sortY = sf.flagLower.y + FLAG_SORT_BIAS; o1.kind = 'f'; o1.pos = sf.flagLower; o1.center = sf.center; o1.isBlack = true;
    depthSortItems.push(o1);
    const o2 = getDepthSortItem(poolIdx++); o2.sortY = sf.flagUpper.y + FLAG_SORT_BIAS; o2.kind = 'f'; o2.pos = sf.flagUpper; o2.center = sf.center; o2.isBlack = false;
    depthSortItems.push(o2);
  }
  depthSortItems.sort((a,b) => a.sortY - b.sortY);
  renderPhaseTime.worldSort += performance.now() - worldMark;
  worldMark = performance.now();
  paintSceneryGroundShadows(ctx, depthSortItems);
  renderPhaseTime.worldScenery += performance.now() - worldMark;
  for(const it of depthSortItems){
    worldMark = performance.now();
    switch(it.kind){
      case 's': drawOneSceneryItem(ctx, it.key, it.item, it.size); drawBloodStains(ctx, it.item); renderPhaseTime.worldScenery += performance.now() - worldMark; break;
      case 'e': {
        if(it.e.type==='BEE') break; // elevated pass below
        const e=it.e,blend=gameState==='PLAYING' ? Math.min(1,accumulator/FIXED_DT) : 1;
        ctx.save();
        if(!e.isLivestock && Number.isFinite(e.renderPrevX) && Number.isFinite(e.renderPrevY))ctx.translate((e.renderPrevX-e.x)*(1-blend),(e.renderPrevY-e.y)*(1-blend));
        e.draw(ctx);ctx.restore();renderPhaseTime.worldEnemies += performance.now() - worldMark;break;
      }
      case 't': it.t.draw(ctx, it.t === selectedTower); drawBloodStains(ctx, it.t); renderPhaseTime.worldTowers += performance.now() - worldMark; break;
      case 'r': break; // SCROLL-OVERLAY-01: drawn after the world below
      case 'f': {
        // FLAG-BROADSIDE-01: awayX/awayY is the fixed across-the-path direction stored by computeSpawnFlags(), so the banner always faces the viewer broadside.
        drawFinishFlagPole(ctx, it.pos.x, it.pos.y, it.pos.awayX, it.pos.awayY, it.isBlack);
        break;
      }
    }
  }
  perfStats.visibleScenery = visibleSceneryCount;
  perfStats.totalScenery = sceneryMap.size;
}
function roundedRectPath(ctx,x,y,w,h,r){
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); return; }
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function computeFinishLine(){
  if(!waypointsPx || waypointsPx.length < 2) return null;
  const end = waypointsPx[waypointsPx.length - 1];
  const prev = waypointsPx[waypointsPx.length - 2];
  const dirX = end.x - prev.x, dirY = end.y - prev.y;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  const ux = dirX/dirLen, uy = dirY/dirLen;
  const perpX = -uy, perpY = ux;
  const halfSpan = TILE_SIZE * 0.5;
  const edgeX = end.x + ux*halfSpan, edgeY = end.y + uy*halfSpan;
  const pA = { x: edgeX + perpX*halfSpan, y: edgeY + perpY*halfSpan };
  const pB = { x: edgeX - perpX*halfSpan, y: edgeY - perpY*halfSpan };
  const lowerPolePoint = pA.y >= pB.y ? pA : pB;
  const upperPolePoint = pA.y >= pB.y ? pB : pA;
  return { edgeX, edgeY, ux, uy, lowerPolePoint, upperPolePoint };
}
/* =========================================================
   GROUND AND PATH PAINTING
   ========================================================= */
// GROUND-DETAIL-01
const PATH_PEBBLE_TILE_CHANCE = 0.55;
const PATH_PEBBLE_MIN_COUNT = 1;
const PATH_PEBBLE_MAX_COUNT = 3;
const PATH_BOULDER_CHANCE = 0.04;
const GRASS_TUFT_TILE_CHANCE = 0.4;
const GRASS_TUFT_SECOND_CHANCE = 0.25;
const GROUND_DETAIL_EDGE_MARGIN = 10;
const PEBBLE_STONE_TONES = ['rgba(92,82,72,0.6)', 'rgba(140,130,118,0.6)', 'rgba(190,182,170,0.6)'];
const GRASS_BLADE_TONES_ON_LIGHT_TILE = ['#5d8846', '#6c9a52'];
const GRASS_BLADE_TONES_ON_DARK_TILE = ['#86b364', '#6f9c55'];
// GROUND-DETAIL-RUN-01
const STARTER_PEBBLE_TILES_MAX = 2;
const STARTER_PEBBLES_PER_TILE_MAX = 2;
const STARTER_TUFT_TILES_MAX = 2;
let groundDetailRunSeed = runSeedFor(0x51);
const starterRegionTileKeys = new Set();
const starterPebbleTileKeys = new Set();
const starterTuftTileKeys = new Set();
let tileRandomState = 0;
function seedTileRandom(gx, gy, salt){
  tileRandomState = (Math.imul(gx + 1, 374761393) ^ Math.imul(gy + 1, 668265263) ^ Math.imul(salt, 1274126177) ^ groundDetailRunSeed) >>> 0;
  nextTileRandom();
  nextTileRandom();
}
function nextTileRandom(){
  tileRandomState = (tileRandomState + 0x6D2B79F5) >>> 0;
  let mixed = tileRandomState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
}
function pickStarterGroundDetails(){
  starterRegionTileKeys.clear(); starterPebbleTileKeys.clear(); starterTuftTileKeys.clear();
  const pathKeys = [...pathCells];
  const grassKeys = [];
  for(const key of nearPathTileSet){
    const [borderX, borderY] = key.split(',').map(Number);
    if(!pathCells.has(key) && isInActiveRegion(borderX, borderY)) grassKeys.push(key);
  }
  for(const key of pathKeys) starterRegionTileKeys.add(key);
  for(const key of grassKeys) starterRegionTileKeys.add(key);
  seedTileRandom(0, 0, 3);
  for(const keys of [pathKeys, grassKeys]){
    for(let i=keys.length-1; i>0; i--){
      const swapIndex = Math.floor(nextTileRandom() * (i + 1));
      const held = keys[i]; keys[i] = keys[swapIndex]; keys[swapIndex] = held;
    }
  }
  const pebbleTileCount = Math.min(pathKeys.length, 1 + Math.floor(nextTileRandom() * STARTER_PEBBLE_TILES_MAX));
  const tuftTileCount = Math.min(grassKeys.length, 1 + Math.floor(nextTileRandom() * STARTER_TUFT_TILES_MAX));
  for(let i=0; i<pebbleTileCount; i++) starterPebbleTileKeys.add(pathKeys[i]);
  for(let i=0; i<tuftTileCount; i++) starterTuftTileKeys.add(grassKeys[i]);
}
function paintPathPebbles(ctx, gx, gy){
  seedTileRandom(gx, gy, 1);
  const isStarterTile = starterRegionTileKeys.has(gx+','+gy);
  const tileGetsPebbles = isStarterTile ? starterPebbleTileKeys.has(gx+','+gy) : nextTileRandom() < PATH_PEBBLE_TILE_CHANCE;
  if(!tileGetsPebbles) return;
  const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
  const span = TILE_SIZE - GROUND_DETAIL_EDGE_MARGIN*2;
  const minPebbles = isStarterTile ? 1 : PATH_PEBBLE_MIN_COUNT;
  const maxPebbles = isStarterTile ? STARTER_PEBBLES_PER_TILE_MAX : PATH_PEBBLE_MAX_COUNT;
  const pebbleCount = minPebbles + Math.floor(nextTileRandom() * (maxPebbles - minPebbles + 1));
  for(let i=0; i<pebbleCount; i++){
    const centerX = tx + GROUND_DETAIL_EDGE_MARGIN + nextTileRandom()*span;
    const centerY = ty + GROUND_DETAIL_EDGE_MARGIN + nextTileRandom()*span;
    const isBoulder = nextTileRandom() < PATH_BOULDER_CHANCE;
    const radius = isBoulder ? 2.2 + nextTileRandom()*0.8 : 0.8 + nextTileRandom()*1.1;
    const stoneTone = PEBBLE_STONE_TONES[Math.floor(nextTileRandom() * PEBBLE_STONE_TONES.length)];
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(centerX + radius*0.35, centerY + radius*0.5, radius*1.05, radius*0.8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = stoneTone;
    ctx.beginPath(); ctx.ellipse(centerX, centerY, radius, radius*0.82, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.arc(centerX - radius*0.3, centerY - radius*0.3, radius*0.35, 0, Math.PI*2); ctx.fill();
  }
}
function paintGrassTufts(ctx, gx, gy, isLightTile){
  seedTileRandom(gx, gy, 2);
  const isStarterTile = starterRegionTileKeys.has(gx+','+gy);
  const tileGetsTufts = isStarterTile ? starterTuftTileKeys.has(gx+','+gy) : nextTileRandom() < GRASS_TUFT_TILE_CHANCE;
  if(!tileGetsTufts) return;
  const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
  const bladeTones = isLightTile ? GRASS_BLADE_TONES_ON_LIGHT_TILE : GRASS_BLADE_TONES_ON_DARK_TILE;
  const tuftCount = nextTileRandom() < GRASS_TUFT_SECOND_CHANCE ? 2 : 1;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for(let tuft=0; tuft<tuftCount; tuft++){
    const baseX = tx + GROUND_DETAIL_EDGE_MARGIN + nextTileRandom()*(TILE_SIZE - GROUND_DETAIL_EDGE_MARGIN*2);
    const baseY = ty + GROUND_DETAIL_EDGE_MARGIN + 6 + nextTileRandom()*(TILE_SIZE - GROUND_DETAIL_EDGE_MARGIN*2 - 6);
    const bladeCount = 3 + Math.floor(nextTileRandom()*3);
    for(let blade=0; blade<bladeCount; blade++){
      const leanRadians = (nextTileRandom() - 0.5) * 1.1;
      const bladeLength = 5 + nextTileRandom()*4.5;
      const bend = (nextTileRandom() - 0.5) * 2.4;
      const tipX = baseX + Math.sin(leanRadians)*bladeLength;
      const tipY = baseY - Math.cos(leanRadians)*bladeLength;
      ctx.strokeStyle = bladeTones[blade % bladeTones.length];
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + Math.sin(leanRadians)*bladeLength*0.5 + bend, baseY - Math.cos(leanRadians)*bladeLength*0.55, tipX, tipY);
      ctx.stroke();
    }
  }
}
function paintBuildableTileBase(ctx, gx, gy){
  const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
  const light = isLightBuildableTile(gx, gy);
  ctx.fillStyle = grassTileFill(gx, gy, light);
  ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
  if(tileBiome(gx, gy) !== 'DUNES') paintGrassTufts(ctx, gx, gy, light);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(tx+0.5, ty+0.5, TILE_SIZE-1, TILE_SIZE-1);
}
// PATH-CHESS-01
const DIRT_BACKGROUND_COLOR = '#8b5a2b';
const FLAG_POLE_COLOR = '#e8d9b0';
const PATH_TILE_DARK = '#835528';
const PATH_TILE_LIGHT = '#926438';
function isLightBuildableTile(gx, gy){ return (gx+gy) % 2 === 0; }
function isDarkPathTile(gx, gy){ return !isLightBuildableTile(gx, gy); }
function pathTileColor(gx, gy){ return isDarkPathTile(gx, gy) ? PATH_TILE_DARK : PATH_TILE_LIGHT; }
function paintPathTileBase(ctx, gx, gy){
  ctx.fillStyle = pathTileColor(gx, gy);
  ctx.fillRect(gx*TILE_SIZE, gy*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  paintPathPebbles(ctx, gx, gy);
}
function paintGroundTile(ctx, gx, gy){
  if(pathCells.has(gx+','+gy)) paintPathTileBase(ctx, gx, gy);
  else if(isInActiveRegion(gx, gy)) paintBuildableTileBase(ctx, gx, gy);
  else { ctx.fillStyle = DIRT_BACKGROUND_COLOR; ctx.fillRect(gx*TILE_SIZE, gy*TILE_SIZE, TILE_SIZE, TILE_SIZE); }
}
const FINISH_CARPET_DEPTH_PX = 16;
function drawFinishCarpet(ctx, fl){
  if(!fl) return;
  const { ux, uy, lowerPolePoint, upperPolePoint } = fl;
  const stripThickness = FINISH_CARPET_DEPTH_PX;
  const cols = 8, rows = 2; // 8x2 cells, each a true square (64px edge / 8 cols = 8px; 16px thickness / 2 rows = 8px)
  for(let row=0; row<rows; row++){
    const r0 = row/rows, r1 = (row+1)/rows;
    for(let col=0; col<cols; col++){
      const c0 = col/cols, c1 = (col+1)/cols;
      ctx.fillStyle = (col+row)%2===0 ? '#1a1a1a' : '#f0f0f0';
      const outerX0 = upperPolePoint.x+(lowerPolePoint.x-upperPolePoint.x)*c0, outerY0 = upperPolePoint.y+(lowerPolePoint.y-upperPolePoint.y)*c0;
      const outerX1 = upperPolePoint.x+(lowerPolePoint.x-upperPolePoint.x)*c1, outerY1 = upperPolePoint.y+(lowerPolePoint.y-upperPolePoint.y)*c1;
      ctx.beginPath();
      ctx.moveTo(outerX0 - ux*stripThickness*r0, outerY0 - uy*stripThickness*r0);
      ctx.lineTo(outerX1 - ux*stripThickness*r0, outerY1 - uy*stripThickness*r0);
      ctx.lineTo(outerX1 - ux*stripThickness*r1, outerY1 - uy*stripThickness*r1);
      ctx.lineTo(outerX0 - ux*stripThickness*r1, outerY0 - uy*stripThickness*r1);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(upperPolePoint.x, upperPolePoint.y); ctx.lineTo(lowerPolePoint.x, lowerPolePoint.y); ctx.stroke();
}
function repaintFinishCarpetFootprint(ctx, fl){
  if(!fl) return;
  const { ux, uy, lowerPolePoint, upperPolePoint } = fl;
  const stripThickness = FINISH_CARPET_DEPTH_PX;
  const xs = [lowerPolePoint.x, upperPolePoint.x, lowerPolePoint.x - ux*stripThickness, upperPolePoint.x - ux*stripThickness];
  const ys = [lowerPolePoint.y, upperPolePoint.y, lowerPolePoint.y - uy*stripThickness, upperPolePoint.y - uy*stripThickness];
  const gx0 = Math.floor(Math.min(...xs)/TILE_SIZE) - 1, gx1 = Math.ceil(Math.max(...xs)/TILE_SIZE) + 1;
  const gy0 = Math.floor(Math.min(...ys)/TILE_SIZE) - 1, gy1 = Math.ceil(Math.max(...ys)/TILE_SIZE) + 1;
  for(let gx=gx0; gx<=gx1; gx++){
    for(let gy=gy0; gy<=gy1; gy++){
      if(gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) paintGroundTile(ctx, gx, gy);
    }
  }
}
// MAP-CORRIDOR-01: new ring tiles outside the path corridor are painted as plain dirt, never as buildable grass.
function paintNewRingTiles(ctx, oldRegion, newRegion){
  for(let gx=newRegion.x0; gx<=newRegion.x1; gx++){
    for(let gy=newRegion.y0; gy<=newRegion.y1; gy++){
      const insideOld = oldRegion && gx>=oldRegion.x0 && gx<=oldRegion.x1 && gy>=oldRegion.y0 && gy<=oldRegion.y1;
      if(!insideOld) paintGroundTile(ctx, gx, gy); // tiles inside the old region were baked by an earlier expansion
    }
  }
}
/* =========================================================
   SPAWN AND FINISH FLAGS
   ========================================================= */
let spawnFlagsCache = null;
let spawnFlagsDirty = true;
function invalidateSpawnFlags(){ spawnFlagsDirty = true; }
// SPAWN-FLAG-PLACEMENT-01: both spawn flags sit in one line on the spawn tile's back edge, opposite the first walking direction,
// mirroring computeFinishLine(), which puts the carpet on the last tile's exit edge. Never search nearby tiles for them.
function computeSpawnFlags(){
  if(!spawnFlagsDirty) return spawnFlagsCache;
  spawnFlagsDirty = false;
  spawnFlagsCache = null;
  if(!waypointsPx || waypointsPx.length < 2) return null;
  const start = waypointsPx[0];
  const next = waypointsPx[1];
  const dirX = next.x - start.x, dirY = next.y - start.y;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  const ux = dirX/dirLen, uy = dirY/dirLen;
  const perpX = -uy, perpY = ux;
  const halfSpan = TILE_SIZE * 0.5;
  // The spawn tile's back edge: computeFinishLine()'s exit edge with the travel direction reversed.
  const edgeX = start.x - ux*halfSpan, edgeY = start.y - uy*halfSpan;
  const pA = { x: edgeX + perpX*halfSpan, y: edgeY + perpY*halfSpan };
  const pB = { x: edgeX - perpX*halfSpan, y: edgeY - perpY*halfSpan };
  const flagLower = pA.y >= pB.y ? pA : pB; // "lower" = further down/+Y = black flag, same convention as computeFinishLine()
  const flagUpper = pA.y >= pB.y ? pB : pA;
  // Both flags fly backward, away from the tile.
  flagLower.awayX = -ux; flagLower.awayY = -uy;
  flagUpper.awayX = -ux; flagUpper.awayY = -uy;
  spawnFlagsCache = { center: start, flagLower, flagUpper };
  return spawnFlagsCache;
}
// FLAG-PENNANT-01
const FLAG_SEGMENTS = 24;
const FLAG_PENNANT_LENGTH = 46;
const FLAG_HOIST_HALF_HEIGHT = 7;
const FLAG_WAVE_AMPLITUDE = 2.6;
const FLAG_TIP_FLUTTER_AMPLITUDE = 0.9;
const FLAG_WAVE_SPEED = 1.5;
const FLAG_WAVE_FOLD_CYCLES = 1.25;
const FLAG_GRAVITY_DROOP = 4;
const FLAG_FOLD_SLOPE_LIMIT = 0.85;
const FLAG_HANG_RADIANS_STILL = 1.38;
const FLAG_LIMP_LENGTH_SCALE = 0.55;
const FLAG_LULL_HANG_RADIANS = 0.55;
const FLAG_GUST_HANG_RADIANS = 0.03;
const FLAG_WIND_RISE_MS = 1200;
const FLAG_WIND_FALL_MS = 2500;
const FLAG_WIND_VISIBLE_THRESHOLD = 0.02;
let flagWindStrength = 0;
// FLAG-WIND-GATE-01
function updateFlagWind(dtMs){
  const targetStrength = waveState === 'IDLE' ? 1 : 0;
  if(flagWindStrength === targetStrength) return;
  if(targetStrength > flagWindStrength) flagWindStrength = Math.min(targetStrength, flagWindStrength + dtMs/FLAG_WIND_RISE_MS);
  else flagWindStrength = Math.max(targetStrength, flagWindStrength - dtMs/FLAG_WIND_FALL_MS);
}
const FLAG_FORESHORTEN_STRENGTH = 0.16;
const flagRipple = new Float32Array(FLAG_SEGMENTS + 1);
const flagTopX = new Float32Array(FLAG_SEGMENTS + 1);
const flagTopY = new Float32Array(FLAG_SEGMENTS + 1);
const flagBottomX = new Float32Array(FLAG_SEGMENTS + 1);
const flagBottomY = new Float32Array(FLAG_SEGMENTS + 1);
// FLAG-REALISTIC-WIND-01
function flagGustLevel(gustClockSeconds, flagPhaseOffset){
  const slowSwell = Math.sin(gustClockSeconds*0.55 + flagPhaseOffset*0.6);
  const mediumSwell = Math.sin(gustClockSeconds*1.35 + flagPhaseOffset*1.3 + 1.7);
  const quickFlutter = Math.sin(gustClockSeconds*3.1 + flagPhaseOffset*2.1);
  return clampNum(0.55 + 0.30*slowSwell + 0.15*mediumSwell + 0.06*quickFlutter, 0, 1);
}
function computeFlagPennantShape(baseX, baseY, awayX, awayY, perpX, perpY, isBlack){
  const windAmount = flagWindStrength;
  const isWindBlowing = windAmount >= FLAG_WIND_VISIBLE_THRESHOLD;
  const flagPhaseOffset = isBlack ? 1.7 : 0;
  const gustLevel = isWindBlowing ? flagGustLevel(gameTime/1000, flagPhaseOffset) : 0;
  const windyHangRadians = FLAG_LULL_HANG_RADIANS + (FLAG_GUST_HANG_RADIANS - FLAG_LULL_HANG_RADIANS) * gustLevel;
  const hangRadians = FLAG_HANG_RADIANS_STILL + (windyHangRadians - FLAG_HANG_RADIANS_STILL) * windAmount;
  const windyLengthScale = 0.78 + 0.22*gustLevel;
  const lengthScale = FLAG_LIMP_LENGTH_SCALE + (windyLengthScale - FLAG_LIMP_LENGTH_SCALE) * windAmount;
  const alongScale = FLAG_PENNANT_LENGTH * lengthScale * Math.cos(hangRadians);
  const hangDropPerT = FLAG_PENNANT_LENGTH * lengthScale * Math.sin(hangRadians);
  const rippleDirectionX = -Math.sin(hangRadians) * (awayX >= 0 ? -1 : 1);
  const rippleDirectionY = -Math.cos(hangRadians);
  if(isWindBlowing){
    const wavePhase = gameTime/1000*FLAG_WAVE_SPEED + flagPhaseOffset;
    const foldRadiansAlongLength = FLAG_WAVE_FOLD_CYCLES * Math.PI * 2;
    const rippleStrength = FLAG_WAVE_AMPLITUDE * (0.35 + 0.65*gustLevel) * windAmount;
    const flutterStrength = FLAG_TIP_FLUTTER_AMPLITUDE * (0.4 + 0.6*gustLevel) * windAmount;
    for(let i=0; i<=FLAG_SEGMENTS; i++){
      const t = i/FLAG_SEGMENTS;
      const mainWave = Math.sin(wavePhase - t*foldRadiansAlongLength) * rippleStrength * t;
      const tipFlutter = Math.sin(wavePhase*2.4 - t*foldRadiansAlongLength*1.8) * flutterStrength * t * t;
      flagRipple[i] = mainWave + tipFlutter;
    }
  } else {
    flagRipple.fill(0);
  }
  const droopPixels = FLAG_GRAVITY_DROOP * (0.25 + 0.75*windAmount*gustLevel);
  for(let i=0; i<=FLAG_SEGMENTS; i++){
    const t = i/FLAG_SEGMENTS;
    const slopeAcrossNeighbors = flagRipple[Math.min(i+1, FLAG_SEGMENTS)] - flagRipple[Math.max(i-1, 0)];
    const edgeOnAmount = Math.min(1, Math.abs(slopeAcrossNeighbors) / (FLAG_FOLD_SLOPE_LIMIT*2));
    const halfHeight = FLAG_HOIST_HALF_HEIGHT * (1 - t) * (1 - FLAG_FORESHORTEN_STRENGTH*edgeOnAmount);
    const centerX = baseX + awayX*alongScale*t + rippleDirectionX*flagRipple[i];
    const centerY = baseY + awayY*alongScale*t + rippleDirectionY*flagRipple[i] + hangDropPerT*t + droopPixels*t*t;
    flagTopX[i] = centerX - perpX*halfHeight;
    flagTopY[i] = centerY - perpY*halfHeight;
    flagBottomX[i] = centerX + perpX*halfHeight;
    flagBottomY[i] = centerY + perpY*halfHeight;
  }
}
function tracePennantSilhouette(ctx){
  ctx.beginPath();
  ctx.moveTo(flagTopX[0], flagTopY[0]);
  for(let i=1; i<=FLAG_SEGMENTS; i++) ctx.lineTo(flagTopX[i], flagTopY[i]);
  for(let i=FLAG_SEGMENTS; i>=0; i--) ctx.lineTo(flagBottomX[i], flagBottomY[i]);
  ctx.closePath();
}
function drawPennantFoldShading(ctx, isBlack){
  if(flagWindStrength < FLAG_WIND_VISIBLE_THRESHOLD) return;
  for(let i=0; i<FLAG_SEGMENTS; i++){
    const tiltNormalized = Math.max(-1, Math.min(1, (flagRipple[i+1] - flagRipple[i]) / FLAG_FOLD_SLOPE_LIMIT));
    const isTiltedAway = tiltNormalized > 0;
    if(isBlack === isTiltedAway) continue;
    const foldAlpha = 0.3 * Math.abs(tiltNormalized);
    ctx.fillStyle = isBlack ? 'rgba(255,255,255,' + foldAlpha.toFixed(3) + ')' : 'rgba(40,40,70,' + foldAlpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(flagTopX[i], flagTopY[i]);
    ctx.lineTo(flagTopX[i+1], flagTopY[i+1]);
    ctx.lineTo(flagBottomX[i+1], flagBottomY[i+1]);
    ctx.lineTo(flagBottomX[i], flagBottomY[i]);
    ctx.closePath();
    ctx.fill();
  }
}
// FLAG-POLE-CONTRAST-01
const FLAG_SORT_BIAS = 1e6; // FLAG-OVER-SCENERY-01
// FLAG-SHADOW-01: pole, finial and pennant are painted opaque into one small canvas and cast as one shape at one opacity, so overlapping parts never double-darken
const FLAG_SHADOW_PAD_X = 90, FLAG_SHADOW_PAD_TOP = 70, FLAG_SHADOW_PAD_BOTTOM = 12;
const flagShadowCanvas = document.createElement('canvas');
flagShadowCanvas.width = FLAG_SHADOW_PAD_X*2; flagShadowCanvas.height = FLAG_SHADOW_PAD_TOP + FLAG_SHADOW_PAD_BOTTOM;
const flagShadowCtx = flagShadowCanvas.getContext('2d');
function drawFlagGroundShadow(ctx, x, y, poleH){
  const shape = flagShadowCtx;
  shape.setTransform(1,0,0,1,0,0); shape.clearRect(0,0,flagShadowCanvas.width,flagShadowCanvas.height);
  shape.translate(FLAG_SHADOW_PAD_X - x, FLAG_SHADOW_PAD_TOP - y);
  shape.fillStyle='#000'; shape.strokeStyle='#000'; shape.lineWidth=4.4; shape.lineCap='round';
  shape.beginPath(); shape.moveTo(x,y); shape.lineTo(x,y-poleH); shape.stroke();
  shape.beginPath(); shape.arc(x,y-poleH-1.5,2.9,0,Math.PI*2); shape.fill();
  tracePennantSilhouette(shape); shape.fill();
  ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha*=0.24;
  ctx.translate(x,y); ctx.transform(1,0,-0.55,0.34,0,0);
  ctx.drawImage(flagShadowCanvas,-FLAG_SHADOW_PAD_X,-FLAG_SHADOW_PAD_TOP);
  ctx.restore();
}
function drawFinishFlagPole(ctx, x, y, awayX, awayY, isBlack){
  const poleH = 34;
  if(graphicsQuality === 'high'){
    const shadowDirX = awayX >= 0 ? 1 : -1;
    computeFlagPennantShape(x, y - poleH + FLAG_HOIST_HALF_HEIGHT, shadowDirX, 0, 0, shadowDirX, isBlack);
    drawFlagGroundShadow(ctx, x, y, poleH);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,18,8,0.75)'; ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-poleH); ctx.stroke();
  ctx.strokeStyle = FLAG_POLE_COLOR; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-poleH); ctx.stroke();
  ctx.fillStyle = FLAG_POLE_COLOR; ctx.strokeStyle = 'rgba(30,18,8,0.75)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y-poleH-1.5, 2.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // FLAG-HORIZONTAL-01: the banner points straight left or right, never diagonally, and both flags share one direction.
  const bannerDirX = awayX >= 0 ? 1 : -1;
  computeFlagPennantShape(x, y - poleH + FLAG_HOIST_HALF_HEIGHT, bannerDirX, 0, 0, bannerDirX, isBlack);
  ctx.save();
  ctx.fillStyle = isBlack ? '#1a1a1a' : '#f5f5f5';
  tracePennantSilhouette(ctx);
  ctx.fill();
  drawPennantFoldShading(ctx, isBlack);
  ctx.strokeStyle = isBlack ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  tracePennantSilhouette(ctx);
  ctx.stroke();
  ctx.restore();
}
/* =========================================================
   MAP BAKE AND BUILD PREVIEW
   ========================================================= */
function drawMap(ctx){
  ctx.fillStyle = DIRT_BACKGROUND_COLOR;
  ctx.fillRect(0,0,WORLD_MAX_W,WORLD_MAX_H);
  // BRANCH-WASTELAND-02: unrevealed dirt stays plain; only collectible branches appear on it.
  for(let gx=0; gx<COLS; gx++){
    for(let gy=0; gy<ROWS; gy++) if(pathCells.has(gx+','+gy)) paintPathTileBase(ctx, gx, gy);
  }
  const gridStrokes = [];
  for(let gx=0; gx<COLS; gx++){
    for(let gy=0; gy<ROWS; gy++){
      if(pathCells.has(gx+','+gy)) continue;
      if(!isInActiveRegion(gx, gy)) continue;
      const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
      const light = isLightBuildableTile(gx, gy);
      ctx.fillStyle = grassTileFill(gx, gy, light);
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
      if(tileBiome(gx, gy) !== 'DUNES') paintGrassTufts(ctx, gx, gy, light);
      gridStrokes.push([tx+0.5, ty+0.5]);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for(const [x, y] of gridStrokes) ctx.rect(x, y, TILE_SIZE-1, TILE_SIZE-1);
  ctx.stroke();
  drawFinishCarpet(ctx, computeFinishLine());
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const item of graphicsQuality === 'high' || CONFIG.FLORA.coverage <= 0 ? [] : floraMap.values()){ // high graphics draws flora live, see drawAnimatedFlora()
    ctx.save();
    ctx.translate(item.x + item.offX, item.y + item.offY);
    ctx.rotate(item.rotDeg * Math.PI/180);
    ctx.font = Math.round(TILE_SIZE*0.42*item.sizeFrac) + 'px serif';
    ctx.fillText(item.glyph, 0, 0);
    ctx.restore();
  }
}
function rebakeMap(){
  mapBakeRevision++;
  const mctx = mapCanvas.getContext('2d');
  mctx.setTransform(dprValue,0,0,dprValue,0,0);
  drawMap(mctx);
}
function resizeMapCanvasForDpr(){
  mapCanvas.width = WORLD_MAX_W * dprValue;
  mapCanvas.height = WORLD_MAX_H * dprValue;
  rebakeMap();
  if(settledDecalCanvasReady){
    settledDecalCanvas.width = WORLD_MAX_W * dprValue;
    settledDecalCanvas.height = WORLD_MAX_H * dprValue;
    rebuildSettledDecalCanvas(); // resizing clears the raster — rebuild from `decals` (source of truth) rather than lose every accumulated bake on a graphics-quality toggle
  }
}
const buildPreviewAppearance={preview:true,lowGfx:true,hasTarget:false,weaponScale:1,weaponThickness:1,drawProgress:0,castProgress:0,chargeProgress:0,swingProgress:0,throwProgress:0,str:0,int:0};
// BUILD-SPOT-HINT-01: while a class is chosen in the Build menu, the free tile that covers the most road within that class's starting range gets a marching
// black-and-white outline, a "good spot" hint from Buckland's support-spot scoring. It is a suggestion only; any buildable tile can still be used.
let buildSpotHintCache = { key: '', tile: null };
const BUILD_SPOT_DASH_PX = 9, BUILD_SPOT_MARCH_MS_PER_PX = 90;
function bestBuildSpotFor(type){
  const def = CONFIG.TOWERS[type];
  if(!def || !def.tiers || !def.tiers[0] || !activeRegion || isProducerType(type) || type === 'BARRICADE') return null;
  const range = def.tiers[0].range, key = type + '|' + mapBakeRevision + '|' + pathCells.size + '|' + towerPool.reduce((count, t) => count + (t.active ? 1 : 0), 0) + '|' + sceneryMap.size;
  if(buildSpotHintCache.key === key) return buildSpotHintCache.tile;
  const roadCenters = []; for(const cellKey of pathCells){ const [rx, ry] = cellKey.split(',').map(Number); roadCenters.push(rx*TILE_SIZE + TILE_SIZE/2, ry*TILE_SIZE + TILE_SIZE/2); }
  let best = null, bestScore = 0;
  const rangeSq = range*range;
  for(let gx = activeRegion.x0; gx <= activeRegion.x1; gx++) for(let gy = activeRegion.y0; gy <= activeRegion.y1; gy++){
    if(!isTileBuildable(gx, gy, null, type)) continue;
    const cx = gx*TILE_SIZE + TILE_SIZE/2, cy = gy*TILE_SIZE + TILE_SIZE/2;
    let score = 0; for(let i = 0; i < roadCenters.length; i += 2){ const dx = roadCenters[i] - cx, dy = roadCenters[i+1] - cy; if(dx*dx + dy*dy <= rangeSq) score++; }
    if(score > bestScore){ bestScore = score; best = { gx, gy }; }
  }
  buildSpotHintCache = { key, tile: best };
  return best;
}
function drawBuildSpotHint(ctx){
  if(!selectedBuildType || moveModeTower) return;
  const spot = bestBuildSpotFor(selectedBuildType);
  if(!spot) return;
  // BUILD-SPOT-MARCH-01: black and white dashes chase each other clockwise around the tile, so the hint reads as a live suggestion.
  const marchOffset = PREFERS_REDUCED_MOTION ? 0 : -((presentationTime / BUILD_SPOT_MARCH_MS_PER_PX) % (BUILD_SPOT_DASH_PX * 2));
  const inset = 4, side = TILE_SIZE - inset*2;
  ctx.save();
  ctx.lineWidth = 3; ctx.setLineDash([BUILD_SPOT_DASH_PX, BUILD_SPOT_DASH_PX]);
  ctx.strokeStyle = '#111111'; ctx.lineDashOffset = marchOffset;
  ctx.strokeRect(spot.gx*TILE_SIZE + inset, spot.gy*TILE_SIZE + inset, side, side);
  ctx.strokeStyle = '#ffffff'; ctx.lineDashOffset = marchOffset + BUILD_SPOT_DASH_PX;
  ctx.strokeRect(spot.gx*TILE_SIZE + inset, spot.gy*TILE_SIZE + inset, side, side);
  ctx.restore();
}
function drawBuildPreview(ctx){
  drawBuildSpotHint(ctx);
  if(!hoverCell) return;
  if(!selectedBuildType && !moveModeTower) return;
  const { gx, gy } = hoverCell;
  if(gx<0||gx>=COLS||gy<0||gy>=ROWS) return;
  let valid;
  if(moveModeTower){
    valid = isTileBuildable(gx, gy, moveModeTower, moveModeTower.type);
  } else {
    valid = isTileBuildable(gx, gy, null, selectedBuildType) && canAffordTower(selectedBuildType) && isTowerTypeAvailable(selectedBuildType);
  }
  const tx = gx*TILE_SIZE, ty = gy*TILE_SIZE;
  ctx.save();
  ctx.fillStyle = valid ? 'rgba(241,196,15,0.30)' : 'rgba(230,57,70,0.35)';
  ctx.strokeStyle = valid ? 'rgba(241,196,15,0.9)' : 'rgba(230,57,70,0.9)';
  ctx.lineWidth = 2;
  roundedRectPath(ctx, tx+4, ty+4, TILE_SIZE-8, TILE_SIZE-8, 10);
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha=valid ? 0.65 : 0.35;
  const previewType=moveModeTower ? moveModeTower.type : selectedBuildType;
  if(isProducerType(previewType)){
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [partEmoji, partSize, partX, partY] of PRODUCER_DEFS[previewType].parts){ ctx.font=pxFont(partSize); ctx.fillText(partEmoji, tx+TILE_SIZE/2+partX, ty+TILE_SIZE/2+partY); }
  } else if(previewType==='BARRICADE'){
    ctx.font=pxFont(28*STICKMAN_SCALE);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🚧',tx+TILE_SIZE/2,ty+TILE_SIZE/2);
  } else {
    const colors=JOB_COLORS[previewType] || JOB_COLORS.SWORDSMAN;
    buildPreviewAppearance.skinMain=colors.main;buildPreviewAppearance.skinShade=colors.shade;
    drawStickman(ctx,tx+TILE_SIZE/2,ty+TILE_SIZE/2,IDLE_WEAPON_ANGLE,1,previewType,buildPreviewAppearance);
  }
  ctx.restore();
}
/* =========================================================
   ACTIVE BARRICADES
   ========================================================= */
const activeBarricades = new Set();
