"use strict";
// Settings and balance numbers, object pools, game state, toasts, medals, saves and the camera. Loaded after js/audio.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   CONFIG
//   OBJECT POOLS
//   ECONOMY: GOLD, WOOD, MARKET AND BUILD COSTS
//   SETTINGS, CLOCKS, WIND AND PREFERENCES
//   RUN STATE, GROUND ITEMS AND LOOT
//   ITEM DRAG, SELECTION AND MARKED TARGET
//   NOTIFICATIONS, ACTS AND MEDALS
//   TOWER UNLOCKS, MOVES AND TOASTS
//   CLERIC HEALING AND KILLSTREAKS
//   ELEMENTS, ATTUNEMENT AND CHAIN LIGHTNING
//   STAT NOTES, DPS BREAKDOWN AND CHANGELOG NOTICE
//   EXPERIENCE, LEVELS AND PROMOTIONS
//   STICKMAN BARKS
//   AUTO-SPEND AND SAVE FILES
//   CAMERA (zoom + pan)
/* =========================================================
   FILE MAP — index.html loads these files in this order (MODULE-FILES-01, AUDIO-SPLIT-01, FILE-SPLIT-01)
     audio        the Web Audio sound engine, synthesized sound effects and the adaptive music score
     config       settings and balance numbers, object pools, game state, toasts, medals, saves and the camera
     effects      blood, decals, forensic spatter, particles and gibs
     loop         spatial hash, enemy collisions, the fixed-timestep main loop (update and render),
                  diagnostics frames, the attract screen and the merchant caravan
     ui           canvas and input setup, HUD, menus, shop, the inspect panel, and the pause,
                  speed and zoom controls
     diagnostics  the debug log, README export, the design contract and the self-tests
     screens      start and end screens and the first-play cues
     environment  map and path, scenery, flora, campfire, chance structures, huts and graves
     towers       the towers, which are the stickmen: CONFIG.TOWERS (every class's numbers, icon and
                  unlocks), elements, promotions, the stickman figure, weapons and poses, the Tower
                  and Projectile classes
     waves        CONFIG.ENEMIES (emoji, health, speed, bounty), size and family tiers, the wave
                  plan, bosses, trolls, circus, the Enemy class; the end of the file runs the
                  boot sequence and starts the game
   A file may use another file's names only inside functions, or at load time only when that
   file comes earlier in this list.
   ========================================================= */

/* =========================================================
   CONFIG
   ========================================================= */
const GAME_VERSION = '1.8.69'; // Every upload bumps this and the top CHANGELOG.md heading together (RELEASE-VERSION-01).
const GAME_SCRIPT_ORDER = ['audio', 'config', 'effects', 'loop', 'ui', 'diagnostics', 'screens', 'environment', 'towers', 'waves']; // FILE-SPLIT-01: the file map above, as data for the design contract
// LONG-TASK-LOG-01 (1.7.97) — see HISTORY.md § [1.7.97]: records main-thread tasks of 50 ms or more, so a debug log can say whether something blocked the page or the browser simply delayed the frame
const MAIN_THREAD_LONG_TASK_LIMIT = 200, mainThreadLongTasks = [];
if(typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.includes('longtask')){
  new PerformanceObserver(list => {
    for(const entry of list.getEntries()){
      const attribution = entry.attribution && entry.attribution[0];
      mainThreadLongTasks.push({ atIso: new Date(performance.timeOrigin + entry.startTime).toISOString(), ms: entry.duration, source: attribution ? (attribution.containerType + ' ' + (attribution.containerName || attribution.containerSrc || '')).trim() : 'unattributed' });
    }
    if(mainThreadLongTasks.length > MAIN_THREAD_LONG_TASK_LIMIT) mainThreadLongTasks.splice(0, mainThreadLongTasks.length - MAIN_THREAD_LONG_TASK_LIMIT);
  }).observe({ type: 'longtask', buffered: true });
}
const TILE_SIZE = 64, COLS = 32, ROWS = 20;
const WORLD_MAX_W = TILE_SIZE * COLS, WORLD_MAX_H = TILE_SIZE * ROWS; // fixed maximum world extent — map generation/caching/bounds-checking always use this, never the viewport size
let CANVAS_W = WORLD_MAX_W, CANVAS_H = WORLD_MAX_H; // viewport/display resolution — recalculated to match the actual window shape by updateCanvasDimensions()
const STICKMAN_SCALE = 1.15;      // slightly larger tower figures
const IDLE_GRIP_ARM_ANGLE = Math.PI/2 - 0.7; // IDLE-GRIP-01 (1.6.73) — see HISTORY.md § [1.6.73]
const IDLE_WEAPON_ANGLE = Math.PI/2; // weapon hangs down at rest instead of frozen pointing up (this.angle's default)
// CA007 — see HISTORY.md § [1.5.7] Code Archaeology, CA007
const HAIR_COLORS = ['hsl(0,0%,8%)', 'hsl(25,35%,18%)', 'hsl(28,45%,32%)', 'hsl(45,55%,62%)', 'hsl(18,68%,42%)', 'hsl(0,0%,78%)', 'hsl(15,50%,30%)'];
function colorAtLightness(hslStr, lightness){
  const m = hslStr.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
  if(!m) return hslStr;
  const h = +m[1], s = +m[2];
  return 'hsl(' + h + ',' + s + '%,' + Math.round(lightness) + '%)';
}
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// CA008 — see HISTORY.md § [1.5.7] Code Archaeology, CA008
const _pxFontCache = {};
function pxFont(size){
  const px = Math.round(size);
  return _pxFontCache[px] || (_pxFontCache[px] = px + 'px serif');
}
// EMOJI-SPRITE-01 (1.7.76) — see HISTORY.md § [1.7.76]
const EMOJI_SPRITE_MIN_PX = 16, EMOJI_SPRITE_MAX_PX = 192, EMOJI_SPRITE_STEP = Math.pow(2, 1/6), EMOJI_SPRITE_LOG_STEP = Math.log(EMOJI_SPRITE_STEP), EMOJI_SPRITE_PAD = 1.5, EMOJI_SPRITE_CACHE_LIMIT = 384;
const emojiSpriteRows = new Map();
let emojiSpriteCount = 0;
// EMOJI-SPRITE-LRU-01 (1.8.43): a full cache used to clear every sprite at once, so every visible emoji was re-rasterized in the next frames; now only the
// least recently drawn quarter is dropped.
let emojiSpriteUseClock = 0;
function evictStaleEmojiSprites(){
  const entries = [];
  for(const [emoji, row] of emojiSpriteRows) row.forEach((sprite, bucketIndex) => { if(sprite) entries.push({ row, bucketIndex, used: sprite.lastUsed || 0, emoji }); });
  entries.sort((a, b) => a.used - b.used);
  const dropCount = Math.ceil(entries.length / 4);
  for(let index = 0; index < dropCount; index++){ const entry = entries[index]; entry.row[entry.bucketIndex] = undefined; emojiSpriteCount--; }
}
function emojiSpriteFor(emoji, bucketIndex){
  let row = emojiSpriteRows.get(emoji);
  if(!row){ row = []; emojiSpriteRows.set(emoji, row); }
  let sprite = row[bucketIndex];
  if(sprite){ sprite.lastUsed = ++emojiSpriteUseClock; return sprite; }
  if(emojiSpriteCount >= EMOJI_SPRITE_CACHE_LIMIT) evictStaleEmojiSprites();
  const fontPx = Math.round(EMOJI_SPRITE_MIN_PX * Math.pow(EMOJI_SPRITE_STEP, bucketIndex)), side = Math.ceil(fontPx * EMOJI_SPRITE_PAD);
  sprite = document.createElement('canvas'); sprite.width = side; sprite.height = side;
  const spriteCtx = sprite.getContext('2d');
  spriteCtx.font = pxFont(fontPx); spriteCtx.textAlign = 'center'; spriteCtx.textBaseline = 'middle'; spriteCtx.fillStyle = '#000000';
  spriteCtx.fillText(emoji, side / 2, side / 2);
  sprite.fontPx = fontPx; sprite.side = side;
  sprite.lastUsed = ++emojiSpriteUseClock;
  row[bucketIndex] = sprite; emojiSpriteCount++;
  return sprite;
}
// TEXT-SPRITE-01 (1.7.99) — see HISTORY.md § [1.7.99]. Floating numbers are rastered once per text, colour and zoom step, then blitted with their fade alpha
const TEXT_SPRITE_CACHE_LIMIT = 640, TEXT_SPRITE_STEP_LOG = Math.log(Math.SQRT2), TEXT_SPRITE_MAX_SCALE = 8;
const textSpriteCache = new Map();
const textSpriteMeasureCtx = document.createElement('canvas').getContext('2d');
function textSpriteFor(text, fontPx, color, scaleIndex){
  const key = fontPx + '|' + color + '|' + scaleIndex + '|' + text;
  let sprite = textSpriteCache.get(key);
  if(sprite) return sprite;
  if(textSpriteCache.size >= TEXT_SPRITE_CACHE_LIMIT){ let dropCount = TEXT_SPRITE_CACHE_LIMIT >> 2; for(const key of textSpriteCache.keys()){ textSpriteCache.delete(key); if(--dropCount <= 0) break; } } // EMOJI-SPRITE-LRU-01: drop the oldest quarter, never the whole cache
  const scale = Math.min(TEXT_SPRITE_MAX_SCALE, Math.pow(Math.SQRT2, scaleIndex)), font = 'bold ' + (fontPx * scale) + 'px Verdana';
  textSpriteMeasureCtx.font = font;
  const width = Math.ceil(textSpriteMeasureCtx.measureText(text).width + 4 * scale), height = Math.ceil(fontPx * 1.6 * scale);
  sprite = document.createElement('canvas'); sprite.width = width; sprite.height = height;
  const spriteCtx = sprite.getContext('2d');
  spriteCtx.font = font; spriteCtx.textAlign = 'center'; spriteCtx.textBaseline = 'middle'; spriteCtx.fillStyle = color;
  spriteCtx.fillText(text, width / 2, height / 2);
  sprite.scale = scale;
  textSpriteCache.set(key, sprite);
  return sprite;
}
function drawTextSprite(ctx, text, fontPx, color, x, y){
  const deviceScale = Math.max(1, camera.zoom * dprValue);
  const scaleIndex = Math.max(0, Math.ceil(Math.log(deviceScale) / TEXT_SPRITE_STEP_LOG - 1e-6));
  const sprite = textSpriteFor(text, fontPx, color, scaleIndex);
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(sprite, x - sprite.width / (2 * sprite.scale), y - sprite.height / (2 * sprite.scale), sprite.width / sprite.scale, sprite.height / sprite.scale);
}
// STRUCTURE-FIRE-01 (1.7.100): a damaged structure smolders, and the lower its health the more flames rise from it. The look runs on real time, so game speed never changes it.
const STRUCTURE_FIRE_START_FRACTION = 0.6, STRUCTURE_FIRE_MAX_FLAMES = 7;
function drawFlameLayer(ctx, x, y, halfWidth, height, sway, color){
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x - halfWidth, y);
  ctx.quadraticCurveTo(x - halfWidth*0.9, y - height*0.55, x + sway, y - height);
  ctx.quadraticCurveTo(x + halfWidth*0.9, y - height*0.55, x + halfWidth, y);
  ctx.quadraticCurveTo(x, y + halfWidth*0.5, x - halfWidth, y);
  ctx.closePath(); ctx.fill();
}
function drawStructureFire(ctx, x, y, hpFraction, seed){
  if(!(hpFraction < STRUCTURE_FIRE_START_FRACTION)) return;
  const intensity = clampNum(1 - hpFraction/STRUCTURE_FIRE_START_FRACTION, 0, 1);
  const flameCount = Math.max(1, Math.ceil(intensity*STRUCTURE_FIRE_MAX_FLAMES)), seconds = presentationTime/1000;
  ctx.save();
  for(let flame = 0; flame < flameCount; flame++){
    const phase = seed*1.7 + flame*2.399;
    const baseX = x + Math.sin(phase*1.3)*13, baseY = y + 12 - (flame % 3)*5 + Math.cos(phase)*3;
    const height = 9 + intensity*13 + 3*Math.sin(seconds*9 + phase*3), halfWidth = 4.5 + intensity*4, sway = Math.sin(seconds*7 + phase)*halfWidth*0.5;
    drawFlameLayer(ctx, baseX, baseY, halfWidth, height, sway, 'rgba(214,69,20,0.9)');
    drawFlameLayer(ctx, baseX, baseY, halfWidth*0.62, height*0.72, sway*0.8, 'rgba(255,167,38,0.95)');
    drawFlameLayer(ctx, baseX, baseY, halfWidth*0.3, height*0.42, sway*0.6, 'rgba(255,236,140,0.95)');
  }
  ctx.restore();
}
function drawEmojiSprite(ctx, emoji, sizePx){
  const devicePx = sizePx * camera.zoom * dprValue;
  if(!(devicePx > 0)) return;
  if(devicePx > EMOJI_SPRITE_MAX_PX){ ctx.font = pxFont(sizePx); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000000'; ctx.fillText(emoji, 0, 0); return; }
  const bucketIndex = Math.max(0, Math.ceil(Math.log(devicePx / EMOJI_SPRITE_MIN_PX) / EMOJI_SPRITE_LOG_STEP - 1e-6));
  ctx.imageSmoothingQuality = 'low';
  const sprite = emojiSpriteFor(emoji, bucketIndex), drawnSide = sprite.side * (Math.round(sizePx) / sprite.fontPx);
  ctx.drawImage(sprite, -drawnSide / 2, -drawnSide / 2, drawnSide, drawnSide);
}
// CA009 — see HISTORY.md § [1.5.7] Code Archaeology, CA009
// ENEMY-ATTACK-ANIM-01 (1.7.58): an enemy hitting a stickman or barricade winds up, lunges and recoils in step with its attack timer, and puffs an
// Animal Crossing style anger mark and steam from its head. Pure drawing: it reads the attack timer and never changes when damage lands.
const LIVESTOCK_PAIR_HEART_DIST_PX = 64, LIVESTOCK_PAIR_CHECK_MS = 250, LIVESTOCK_PAIR_HEART_COOLDOWN_MS = 12000, LIVESTOCK_PAIR_HEART_COOLDOWN_SPREAD_MS = 8000; // LIVESTOCK-PAIR-HEART-01 (1.7.90)
const LIVESTOCK_EMOTE_MIN_GAP_MS = 7000, LIVESTOCK_EMOTE_GAP_SPREAD_MS = 9000, LIVESTOCK_EMOTE_LIFE_MS = 1500;
function smoothStep01(x){ const q = x < 0 ? 0 : x > 1 ? 1 : x; return q * q * (3 - 2 * q); }
function attackLungeAmount(phase){
  if(phase < 0.25) return 1 - smoothStep01(phase / 0.25);
  if(phase < 0.6) return 0;
  if(phase < 0.88) return -0.45 * smoothStep01((phase - 0.6) / 0.28);
  return -0.45 + 1.45 * smoothStep01((phase - 0.88) / 0.12);
}
function attackAngerPopScale(phase){
  if(phase >= 0.55 && phase < 0.7){ const q = (phase - 0.55) / 0.15; return smoothStep01(q) * (1 + 0.3 * Math.sin(q * Math.PI)); }
  if(phase >= 0.7 && phase < 0.88) return 1;
  if(phase >= 0.88) return 1 + 0.25 * Math.sin(((phase - 0.88) / 0.12) * Math.PI);
  if(phase < 0.3) return 1 - smoothStep01(phase / 0.3);
  return 0;
}
function drawAngerSteam(ctx, x, y, radius, phase){
  if(phase < 0.6) return;
  const rise = (phase - 0.6) / 0.4;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for(let puff = 0; puff < 2; puff++){
    const t = (rise + puff * 0.45) % 1;
    ctx.globalAlpha = 0.7 * (1 - t);
    ctx.beginPath();
    ctx.arc(x + (puff ? 1 : -1) * radius * (0.35 + 0.25 * t), y - radius * (0.95 + 0.8 * t), radius * 0.2 * (0.6 + t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawStatusIcons(ctx, cx, cy, radius, emoji, count, periodMs, orbitAboveHead){
  const t = performance.now();
  ctx.font = pxFont(radius * (orbitAboveHead ? 0.85 : 0.55));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000'; // opaque baseline so the glyph never inherits a stray translucent fillStyle from whatever drew before it
  for(let i=0; i<count; i++){
    let x, y;
    if(orbitAboveHead){
      const phase = (t/periodMs) + (i*Math.PI*2/count);
      x = cx + Math.cos(phase)*radius*1.3;
      y = cy + Math.sin(phase)*radius*0.55; // flattened ellipse orbit — classic cartoon "stun stars" silhouette, lightning-themed here
    } else {
      const angle = i*(Math.PI*2/count) + t/900;
      x = cx + Math.cos(angle)*radius*0.85;
      y = cy + Math.sin(angle)*radius*0.85 + Math.sin(t/180 + i)*2; // gentle flicker bob, not a rigid fixed position
    }
    ctx.fillText(emoji, x, y);
  }
}
const emojiShadowMasks = new Map();
const companionShadowMask=document.createElement('canvas');
companionShadowMask.width=64;companionShadowMask.height=64;

const companionShadowCtx=companionShadowMask.getContext('2d');
function drawCompanionGroundShadow(ctx,x,y,kind,phase,attack){
  if(graphicsQuality!=='high') return;
  const m=companionShadowCtx;
  m.clearRect(0,0,64,64);m.save();
  if(kind==='cat') drawCat(m,32,32,0,0.55,{crouch:true,attackProgress:attack});
  else drawSkeleton(m,32,32,phase,attack);
  m.globalCompositeOperation='source-in';m.fillStyle='#000';m.fillRect(0,0,64,64);m.restore();
  const foot=kind==='cat'?6:10;
  ctx.save();ctx.shadowBlur=0;ctx.globalAlpha*=0.24;ctx.translate(x,y+foot);
  ctx.transform(1,0,-0.55,0.34,0,0);
  ctx.drawImage(companionShadowMask,-32,-32-foot);ctx.restore();
}
function drawEmojiGroundShadow(ctx,emoji,x,y,size,family,stretchX,tallStretch,strength){
  if(graphicsQuality !== 'high') return;
  const key=emoji+'|'+(family || 'serif');
  let mask=emojiShadowMasks.get(key);
  if(!mask){
    mask=document.createElement('canvas'); mask.width=64; mask.height=64;
    const m=mask.getContext('2d'); m.font='40px '+(family || 'serif'); m.textAlign='center'; m.textBaseline='middle';
    const metrics=m.measureText(emoji), descent=metrics.actualBoundingBoxDescent; mask.footRatio=Number.isFinite(descent) ? Math.max(0,descent)/40 : 0.45;
    mask.widthRatio=Number.isFinite(metrics.actualBoundingBoxLeft) ? Math.max(0.3,(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)/40) : 0.9;
    mask.heightRatio=Number.isFinite(metrics.actualBoundingBoxAscent) ? Math.max(0.3,(metrics.actualBoundingBoxAscent+Math.max(0,descent))/40) : 0.9;
    m.fillText(emoji,32,32);
    const pixels=m.getImageData(0,0,64,64).data;
    let bottom=-1;
    for(let row=63;row>=0 && bottom<0;row--) for(let col=0;col<64;col++) if(pixels[(row*64+col)*4+3]>16){bottom=row;break;}
    if(bottom>=0) mask.footRatio=(bottom+0.5-32)/40; // painted contact, not font padding
    m.globalCompositeOperation='source-in'; m.fillStyle='#000'; m.fillRect(0,0,64,64);
    if(emojiShadowMasks.size>=64) emojiShadowMasks.delete(emojiShadowMasks.keys().next().value);
    emojiShadowMasks.set(key,mask);
  }
  const factor=size/40,foot=size*mask.footRatio, tall=tallStretch || 1;
  const anchorY=y+foot+(tall-1)*(foot-size*0.5+2); // same bottom-anchored stretch as scenery
  if(emoji==='📦'){
    // BOX-SHADOW-01 (1.7.36): the cardboard box is a cube standing on a diamond-shaped base, and the glyph's lowest point is the front
    // corner of that base. The old squashed silhouette hung below that corner like a strip. Now the shadow is the cube's real footprint,
    // swept toward the back-right by its height like every other shadow, drawn as one fill so overlaps never double-darken.
    const halfWidth=size*mask.widthRatio*0.42, halfDepth=halfWidth*0.55, boxHeight=size*mask.heightRatio*0.8;
    const cx=x, cy=y+foot-halfDepth+size*0.04, vx=0.55*boxHeight, vy=-0.34*boxHeight; // slightly larger than the base so a soft contact rim shows under the box edges
    const base=[[cx-halfWidth,cy],[cx,cy-halfDepth],[cx+halfWidth,cy],[cx,cy+halfDepth]];
    // convex hull of the base diamond and the same diamond moved by the sweep vector: one simple polygon, one fill, no winding cancellation
    const pts=[]; for(const p of base){ pts.push([p[0],p[1]],[p[0]+vx,p[1]+vy]); }
    pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lower=[]; for(const p of pts){ while(lower.length>=2 && cross(lower[lower.length-2],lower[lower.length-1],p)<=0) lower.pop(); lower.push(p); }
    const upper=[]; for(let k=pts.length-1;k>=0;k--){ const p=pts[k]; while(upper.length>=2 && cross(upper[upper.length-2],upper[upper.length-1],p)<=0) upper.pop(); upper.push(p); }
    const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
    ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha*=0.3; ctx.fillStyle='#000'; ctx.beginPath(); ctx.moveTo(hull[0][0],hull[0][1]);
    for(let k=1;k<hull.length;k++) ctx.lineTo(hull[k][0],hull[k][1]);
    ctx.closePath(); ctx.fill(); ctx.restore();
    return;
  }
  ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha*=(strength === undefined ? 0.24 : strength); ctx.translate(x,anchorY); // SHADOW-TALL-01 (1.7.36): a stretched tree casts a proportionally longer shadow, anchored at the same foot
  ctx.transform(1,0,(emoji==='📦' ? -0.28 : -0.55)*tall,(emoji==='📦' ? 0.22 : 0.34)*tall,0,0);
  ctx.scale(stretchX || 1,1); ctx.drawImage(mask,-32*factor,-32*factor-foot,64*factor,64*factor); ctx.restore();
}
const JOB_COLORS = {
  SWORDSMAN: { main:'hsl(355,65%,80%)', shade:'hsl(355,50%,60%)' }, // warm red
  NINJA:     { main:'#424957', shade:'#202632' },
  ARCHER:    { main:'hsl(130,50%,78%)', shade:'hsl(130,42%,58%)' }, // forest green
  AXEMAN:    { main:'hsl(28,70%,78%)',  shade:'hsl(28,55%,58%)'  }, // burnt orange
  SPEARMAN:  { main:'hsl(195,55%,80%)', shade:'hsl(195,42%,60%)' }, // cyan/teal
  HAMMERMAN: { main:'hsl(45,45%,75%)',  shade:'hsl(45,35%,52%)'  }, // dull bronze
  PALADIN:   { main:'hsl(48,80%,82%)',  shade:'hsl(45,70%,55%)'  }, // radiant gold
  MAGE:      { main:'hsl(270,50%,82%)', shade:'hsl(270,38%,62%)' }, // violet
  SNAPCASTER:{ main:'hsl(48,75%,78%)',  shade:'hsl(48,55%,56%)' },  // electric yellow — visually distinct from full Mage's violet, matches its lightning identity
  BOMBER:    { main:'hsl(42,60%,78%)',  shade:'hsl(42,48%,58%)'  }, // amber/brown
  GATLING:   { main:'hsl(220,18%,80%)', shade:'hsl(220,22%,55%)' }, // desaturated steel gray-blue
  CLERIC:    { main:'hsl(48,70%,90%)',  shade:'hsl(48,45%,68%)'  }, // pale gold-white
  POPE:      { main:'hsl(45,75%,80%)',  shade:'hsl(42,60%,50%)'  }, // richer, deeper gold — grander than Cleric's pale gold-white
  BLOWDART:  { main:'hsl(95,45%,75%)',  shade:'hsl(95,38%,52%)'  }, // sickly poison green
  SQUIRTGUN: { main:'hsl(105,70%,68%)', shade:'hsl(105,60%,42%)' }, // vivid acid green
  GUNALINDER:{ main:'hsl(15,25%,68%)',  shade:'hsl(15,30%,42%)'  }, // dark gunmetal brown
  SNIPER:    { main:'hsl(100,15%,62%)', shade:'hsl(100,20%,38%)' }, // desaturated tactical gray-green
  MARKSMAN:  { main:'hsl(205,20%,66%)', shade:'hsl(205,25%,42%)' },  // cool tactical steel-blue, distinct from Cowboy's warm brown and Sniper's green
  // CA010 — see HISTORY.md § [1.5.7] Code Archaeology, CA010
  CAT_SNAPPER: { main:'hsl(0,0%,22%)', shade:'hsl(0,0%,8%)' },
  NECROMANCER: { main:'hsl(280,25%,55%)', shade:'hsl(280,30%,30%)' }, // muted dark purple — distinct from Mage's own brighter violet, reads as "corrupted" rather than "arcane"
  BLOW_GUNNER: { main:'hsl(200,30%,82%)', shade:'hsl(200,25%,55%)' }, // pale steam-blue mist, distinct from Squirtgun's vivid acid green and Marksman's cooler steel-blue
  PROTON: { main:'hsl(275,65%,68%)', shade:'hsl(275,55%,42%)' }, // vivid purple — "space electricity," distinct from Necromancer's own muted dark purple
  DARK_MATTER: { main:'hsl(240,15%,28%)', shade:'hsl(240,20%,10%)' }, // near-black with a cold blue undertone — void-black, distinct from Cat Snapper's neutral gray
  QUASAR: { main:'hsl(50,15%,92%)', shade:'hsl(50,20%,72%)' }, // blinding near-white with a faint warm tint, distinct from Pope's richer gold and every other pale entry
  BERSERKER: { main:'hsl(0,55%,50%)', shade:'hsl(0,55%,30%)' }, // raw, angry red — distinct from Axeman's own burnt orange
  LANCER: { main:'hsl(195,60%,55%)', shade:'hsl(195,55%,35%)' } // deeper, more saturated blue than Spearman's own pale teal — precision, not flash
};
const JOB_BUILD = {
  SWORDSMAN: { scaleX:1.00, scaleY:1.00 }, // average
  NINJA:     { scaleX:0.88, scaleY:1.02 },
  ARCHER:    { scaleX:0.90, scaleY:1.08 }, // lean and tall
  AXEMAN:    { scaleX:1.15, scaleY:0.90 }, // stout
  SPEARMAN:  { scaleX:0.86, scaleY:1.15 }, // tall and lanky
  HAMMERMAN: { scaleX:1.25, scaleY:0.85 }, // broadest and shortest — a wall of a man
  PALADIN:   { scaleX:1.20, scaleY:0.90 }, // broad but a touch more upright than Hammerman
  MAGE:      { scaleX:0.85, scaleY:1.05 }, // slender
  SNAPCASTER:{ scaleX:0.85, scaleY:1.02 }, // similarly slender, slightly less imposing than full Mage
  BOMBER:    { scaleX:1.20, scaleY:0.88 }, // stout, heavy-set
  GATLING:   { scaleX:1.12, scaleY:0.95 }, // bulky
  CLERIC:    { scaleX:0.92, scaleY:1.05 },  // upright, composed
  POPE:      { scaleX:0.96, scaleY:1.08 },  // slightly grander stance than Cleric
  BLOWDART:  { scaleX:0.88, scaleY:1.02 },  // lean and quick
  SQUIRTGUN: { scaleX:0.86, scaleY:1.00 },  // even lighter, built for speed
  GUNALINDER:{ scaleX:1.08, scaleY:0.95 },  // stocky gunslinger stance
  SNIPER:    { scaleX:0.84, scaleY:1.10 },  // lean, low profile
  MARKSMAN:  { scaleX:0.88, scaleY:1.07 },  // lean, between Cowboy's stocky stance and Sniper's full leanness
  CAT_SNAPPER: { scaleX:0.92, scaleY:0.94 }, // a touch narrower and shorter than average — a slight hunch, not a distinct body type
  NECROMANCER: { scaleX:0.87, scaleY:1.06 }, // gaunt and a bit tall, like Mage but leaner still
  BLOW_GUNNER: { scaleX:0.9, scaleY:0.97 }, // close to base Archer's own build — a hybrid of two siblings, not a distinct body type
  PROTON: { scaleX:0.95, scaleY:1.02 }, // reachable from any base class, so kept close to the shared Mage-archetype default rather than leaning toward any one source
  DARK_MATTER: { scaleX:0.95, scaleY:1.02 }, // same reasoning as Proton — reachable from any base class
  QUASAR: { scaleX:0.98, scaleY:1.05 }, // very slightly grander than the other hybrids — the hardest unlock in the game, reads as a touch more imposing
  BERSERKER: { scaleX:1.08, scaleY:1.04 }, // a bit broader/bulkier than base Axeman — raw power, reads bigger
  LANCER: { scaleX:0.84, scaleY:1.18 } // even leaner and taller than Spearman's own already-tall build — precision over bulk
};
// Flavor lines per class — tied to combat role/personality, not to any real-world region or ethnicity.
const JOB_QUOTES = {
  SWORDSMAN: ["For honor!", "Steel and resolve.", "Stand and fight!", "Blade drawn, ready!", "Let's settle this."],
  NINJA:     ["One hand, then the other.", "Quiet hands. Sharp stars."],
  ARCHER:    ["Straight and true.", "Never miss twice.", "Eyes on the horizon.", "Nock and loose!", "Steady hands."],
  AXEMAN:    ["Close or far, I'm ready!", "Feel my swing!", "Two blades, one job.", "Cleave through!", "Bring them close."],
  SPEARMAN:  ["Keep your distance.", "Reach exceeds your grasp.", "Patience, then the strike.", "Not one step closer.", "The tip finds its mark."],
  HAMMERMAN: ["Nothing gets past this shield!", "Stand behind me.", "One good hit is all it takes.", "Hold the line!", "Feel the weight."],
  PALADIN:   ["By holy light, be still.", "The undead have no refuge here.", "Faith is my shield.", "Righteous and ready.", "None shall pass."],
  MAGE:      ["Arcane forces, obey!", "The cold does the work for me.", "Knowledge is my weapon.", "Let the spell begin.", "Power, unleashed."],
  BOMBER:    ["Fire in the hole!", "Stand back — way back.", "Boom first, questions later.", "Lit and ready.", "Clear the blast radius!"],
  GATLING:   ["Say hello to my everything.", "Spin it up!", "Rate of fire: maximum.", "Barrels hot!", "Keep 'em coming."],
  MERCHANT:  ["Business is business.", "Everything has a price.", "Gold well spent, gold well earned.", "Step right up.", "I never miss a sale."],
  GLAIVE:    ["Structures fall, one by one.", "No wall stands forever.", "Reload's worth the wait.", "Foundations crack under this.", "Precision over speed."],
  HACKER:    ["Just checking my email.", "I'm in.", "Loading... 99%.", "Nothing to see here.", "Have you tried turning it off and on?"],
  CLERIC:    ["None shall fall today.", "Be still, and be healed.", "The undead have no place here.", "Grace and judgment.", "Faith mends what's broken."],
  POPE:      ["Let all be judged as one.", "The light spares no evil.", "By my word, be cleansed.", "None escape this grace.", "The faithful stand eternal."],
  BLOWDART:  ["One prick is all it takes.", "The poison does the rest.", "Fast hands, sharp aim.", "A little sting, a lot of damage.", "Silent and precise."],
  SQUIRTGUN: ["Double the guns, double the burn.", "Acid doesn't miss twice.", "Wet work, my specialty.", "Corrosive and ready.", "Let it burn."],
  GUNALINDER:["Six rounds, six problems solved.", "Reloading is for the slow.", "Empty the cylinder!", "Spin the barrel!", "Every shot counts."],
  SNIPER:    ["One shot. That's all I need.", "Nothing outruns this range.", "Patience is the real weapon.", "Target acquired.", "One breath, one shot."],
  MARKSMAN:  ["Steady hands, sure aim.", "I don't miss twice.", "Line it up.", "Trigger discipline.", "Every round's placed, not sprayed."],
  SNAPCASTER:["The bolt finds its mark.", "Lightning at my command.", "Snap, and it's over.", "Precision and power.", "Watch the sparks fly."],
  CAT_SNAPPER:["Here, kitty.", "Go get 'em.", "Claws out.", "Fetch.", "Good cat."],
  NECROMANCER:["Rise.", "Death is no obstacle.", "Bones remember how to fight.", "Serve me once more.", "None truly rest."],
  BLOW_GUNNER:["Feel the burn.", "Hot and cold.", "Steam clears the air.", "One breath is all it takes.", "Scalded and chilled."],
  CRAZY_CHEF:["Order up!", "Knives out.", "Chop chop.", "Mise en place.", "Fresh cuts, hot and fast."],
  PROTON:["Feel the charge.", "Nowhere left to run.", "Burned and stunned.", "The stars provide.", "Crackling with purpose."],
  DARK_MATTER:["Into the void.", "Nothing escapes gravity.", "The dark provides too.", "Cold and absolute.", "Swallowed whole."],
  QUASAR:["Behold.", "All three, at once.", "The rarest light.", "Nothing survives this.", "Ascendant."],
  BERSERKER:["No more finesse.", "Feel my rage.", "Cleave through.", "Nothing stands.", "All of you, at once."],
  LANCER:["Precision finds its mark.", "Not a hair closer.", "Every thrust, true.", "The tip never wavers.", "Reach and ruin."]
};
// CA011 — see HISTORY.md § [1.5.7] Code Archaeology, CA011
const _noRepeatHistory = {};
function randomNoRepeat(historyKey, length){
  if(length <= 1) return 0;
  let next;
  do { next = Math.floor(Math.random() * length); } while(next === _noRepeatHistory[historyKey]);
  _noRepeatHistory[historyKey] = next;
  return next;
}
function randomJobQuote(type){
  const lines = JOB_QUOTES[type];
  return lines ? lines[randomNoRepeat('quip_' + type, lines.length)] : '';
}
// CA013 — see HISTORY.md § [1.5.7] Code Archaeology, CA013
const MAX_ITEM_SLOTS = 6;
const HERO_BONUS_STAT = 5;
// CA014 — see HISTORY.md § [1.5.7] Code Archaeology, CA014
// RANGE-BALANCE-01 (1.6.76) — see HISTORY.md § [1.6.76]
const RANGE_CAPS = {
  SWORDSMAN: 160, HAMMERMAN: 140, PALADIN: 150, BERSERKER: 150, AXEMAN: 180, SPEARMAN: 200, LANCER: 220,
  NINJA: 230, BLOWDART: 240, BLOW_GUNNER: 250, SQUIRTGUN: 260, CRAZY_CHEF: 260, GUNALINDER: 310, BOMBER: 320, SNAPCASTER: 320,
  GATLING: 340, MARKSMAN: 360, ARCHER: 380, SNIPER: 400,
  NECROMANCER: 400, CAT_SNAPPER: 420, QUASAR: 430, PROTON: 440, DARK_MATTER: 450, MAGE: 480,
  CLERIC: 260, POPE: 280, MERCHANT: 260, GLAIVE: 300
};
const RANGE_BANDS = {
  MELEE:   { start: [85, 150],  cap: [140, 220], maxStartShareOfCap: 0.70 },
  RANGED:  { start: [110, 240], cap: [240, 400], maxStartShareOfCap: 0.55 },
  CASTER:  { start: [170, 300], cap: [400, 520], maxStartShareOfCap: 0.55 },
  SUPPORT: { start: [120, 240], cap: [200, 320], maxStartShareOfCap: 0.75 }
};
const RANGE_ROLE_BY_ARCHETYPE = { WARRIOR: 'MELEE', ARCHER: 'RANGED', MAGE: 'CASTER' };
const RANGE_ROLE_OVERRIDES = { CLERIC: 'SUPPORT', POPE: 'SUPPORT', MERCHANT: 'SUPPORT', GLAIVE: 'SUPPORT' };
function rangeRoleOf(type){ return RANGE_ROLE_OVERRIDES[type] || RANGE_ROLE_BY_ARCHETYPE[CLASS_ARCHETYPE[type]] || null; }
const MELEE_REST_POSE_TYPES = new Set(['SWORDSMAN','SPEARMAN','HAMMERMAN','PALADIN','BERSERKER','LANCER','CLERIC','POPE','BARRICADE']);
function usesRangedRestPose(tower){
  if(tower.type === 'AXEMAN') return tower.axeMode === 'RANGE';
  return !MELEE_REST_POSE_TYPES.has(tower.type);
}
// CA015 — see HISTORY.md § [1.5.7] Code Archaeology, CA015
function diminishingStatValue(points, perPoint){
  let total = 0, remaining = points, tier = 0;
  // CA016 — see HISTORY.md § [1.5.7] Code Archaeology, CA016
  while(remaining > 0 && tier < 5){
    const inTier = Math.min(5, remaining);
    const tierMult = 1 - tier*0.15;
    total += inTier * perPoint * tierMult;
    remaining -= inTier;
    tier++;
  }
  // CA017 — see HISTORY.md § [1.5.7] Code Archaeology, CA017
  if(remaining > 0) total += statTailValue(remaining, perPoint * 0.25);
  return total;
}
// CA018 — see HISTORY.md § [1.5.7] Code Archaeology, CA018
const STAT_TAIL_SOFTNESS = 50;
// RANGE-CURVE-01 (1.6.74) — see HISTORY.md § [1.6.74]
function interpolateRangeByInt(startingRange, rangeCap, intRangeFraction){
  return Math.round(startingRange + (rangeCap - startingRange) * intRangeFraction);
}
let statPreviewRunning = false; // STAT-PREVIEW-01: true while statPointPreview tries a point, so no one-time Veteran moment fires
const STAT_EFFECT_CAP = 500;        // a single stat's effects stop growing here (matches the trained-stat cap)
const STAT_TOTAL_CAP = 1000;        // combined trained stats per stickman
const NAMING_THRESHOLD = 500;       // combined trained stats that unlock naming
const PRIMARY_DAMAGE_STAT_OVERRIDE = {}; // every Archer-archetype class scales direct damage from DEX
const CHEF_MAGAZINE = 5, CHEF_RELOAD_MS = 10000; // Crazy Chef: five knives per burst, then 10s to restock the block
const PRIMARY_DAMAGE_PER_POINT = 0.0015; // +75% primary-stat damage at 500 — small on purpose; that stat also buys rate/range/HP/accuracy
function cappedStatPoints(points){ return Math.min(points, STAT_EFFECT_CAP); }
// EQUIPMENT-OVER-CAP-01 (1.7.113) — see HISTORY.md § [1.7.113]: the 500 cap limits what is learned; equipment adds on top of it
function statEffectPoints(trainedPoints, equipmentPoints){ return Math.min(trainedPoints, STAT_EFFECT_CAP) + equipmentPoints; }
function getTrainedStatTotal(tower){ return (tower.str || 0) + (tower.dex || 0) + (tower.int || 0); }
function statTailValue(points, perPointAtTailStart){
  return perPointAtTailStart * STAT_TAIL_SOFTNESS * Math.log(1 + points / STAT_TAIL_SOFTNESS);
}
// CA020 — see HISTORY.md § [1.5.7] Code Archaeology, CA020
const BASE_MISS_CHANCE_BY_ARCHETYPE = { MAGE: 0.38, ARCHER: 0.34, WARRIOR: 0.36 };
// CA021 — see HISTORY.md § [1.5.7] Code Archaeology, CA021
const ACCURACY_MIDPOINT_DEX = 100;
const ACCURACY_MIDPOINT_MISS = 0.04;
const ACCURACY_CAP_DEX = 500;
function computeMissChance(baseMissChance, dexEff){
  if(dexEff <= 0) return baseMissChance;
  if(dexEff < ACCURACY_MIDPOINT_DEX){
    const t = dexEff / ACCURACY_MIDPOINT_DEX;
    return baseMissChance + (ACCURACY_MIDPOINT_MISS - baseMissChance) * t;
  }
  if(dexEff < ACCURACY_CAP_DEX){
    const t = (dexEff - ACCURACY_MIDPOINT_DEX) / (ACCURACY_CAP_DEX - ACCURACY_MIDPOINT_DEX);
    return ACCURACY_MIDPOINT_MISS * (1 - t);
  }
  return 0; // 500+ effective DEX — a genuinely guaranteed hit, a deliberate design choice per explicit request, superseding the old "never fully guaranteed to hit" 2% floor
}
// PRD-ROLLS-01 (1.8.51): critical hits and misses roll against a luck balance kept per stickman: the stated chance accrues on every roll and each event that fires pays one back, and the chance used is nudged toward evening the balance (PRD_LUCK_PULL). The long-run rate equals the stated chance exactly, even when it changes from roll to roll (wind, evasion), while miss streaks and crit droughts become rare.
const PRD_LUCK_PULL = 0.5;
function prdRollFires(chance, holder, balanceKey){
  if(!(chance > 0)) return false;
  if(chance >= 1 || !holder) return Math.random() < chance;
  const balance = holder[balanceKey] || 0;
  const fires = Math.random() < clampNum(chance + PRD_LUCK_PULL * balance, 0, 1);
  holder[balanceKey] = balance + chance - (fires ? 1 : 0);
  return fires;
}
const EARLY_HP_CAP_TYPES = ['ARCHER']; // stays fragile no matter how tough it gets
const EARLY_STAT_CAP_POINTS = 15; // points beyond this stop contributing to the capped stat specifically
// CA023 — see HISTORY.md § [1.5.7] Code Archaeology, CA023
const SPLIT_CHILD_TYPE = { SPLITTER: 'SPLITMINI', BOULDER: 'ROCKLET' };
// CA024 — see HISTORY.md § [1.5.7] Code Archaeology, CA024
const FOOTSTEP_WEIGHT = {
  SWARM: 0, RUNNER: 0, MONARCH: 0, WOLF: 0, SPLITMINI: 0, ROCKLET: 0,
  TANK: 2, BOSS: 2, BOULDER: 2, ZOMBIE: 2, REAPER: 2, TROLL: 2,
  WRAITH: null
};
// CA028 — see HISTORY.md § [1.5.7] Code Archaeology, CA028
const HP_STAT_BASE = { WARRIOR: 3, ARCHER: 2, MAGE: 1 }; // starting hearts at 0 STR — 30/20/10 flat bonus HP
const HP_STAT_RATE = { WARRIOR: 0.32, ARCHER: 0.25, MAGE: 0.15 }; // additional hearts per STR point (before the shared diminishing-returns curve)
const PREFERRED_STAT_MULT = 1.6; // a tower's archetype-preferred stat is 60% more effective per point — Dota-style: specialization and consistent investment pay off substantially, so under-leveled towers fall meaningfully behind rather than staying roughly competitive
// CA029 — see HISTORY.md § [1.5.7] Code Archaeology, CA029
const MAX_LEAD_PREDICT_TIME = 0.2;
// CA030 — see HISTORY.md § [1.5.7] Code Archaeology, CA030
const LEAD_INTERCEPT_MAX_TIME = 0.25;
// CA031 — see HISTORY.md § [1.5.7] Code Archaeology, CA031
function calculateLeadIntercept(originX, originY, projectileSpeed, targetX, targetY, targetVx, targetVy){
  const relX = targetX - originX, relY = targetY - originY;
  const a = targetVx*targetVx + targetVy*targetVy - projectileSpeed*projectileSpeed;
  const b = 2*(relX*targetVx + relY*targetVy);
  const c = relX*relX + relY*relY;
  let t = 0;
  if(Math.abs(a) < 0.0001){
    // CA032 — see HISTORY.md § [1.5.7] Code Archaeology, CA032
    if(Math.abs(b) > 0.0001) t = -c/b;
  } else {
    const disc = b*b - 4*a*c;
    if(disc >= 0){
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b + sqrtDisc)/(2*a), t2 = (-b - sqrtDisc)/(2*a);
      // CA033 — see HISTORY.md § [1.5.7] Code Archaeology, CA033
      if(t1 > 0 && t2 > 0) t = Math.min(t1, t2);
      else if(t1 > 0) t = t1;
      else if(t2 > 0) t = t2;
    }
  }
  t = Math.max(0, Math.min(t, LEAD_INTERCEPT_MAX_TIME));
  const ix = targetX + targetVx*t, iy = targetY + targetVy*t;
  return Math.atan2(iy - originY, ix - originX);
}
// CA034 — see HISTORY.md § [1.5.7] Code Archaeology, CA034
const PROJECTILE_HOMING_MAX_TURN_RATE = 0.45;
const PROJECTILE_HOMING_MAX_ANGLE = 0.20; // ~11 degrees
// CA035 — see HISTORY.md § [1.5.7] Code Archaeology, CA035
const ATTUNEMENT_THRESHOLD = 100;
// CA036 — see HISTORY.md § [1.5.7] Code Archaeology, CA036
const MELEE_SWEEP_MAX_TARGETS = 3;
const MELEE_SWEEP_FALLOFF = 0.35; // each successive target (closest-first) takes 35% less than the one before it, compounding
const SPECIALIZATION_THRESHOLD = 500;
// BLOWDART-UNLOCK-01 (1.6.7) — see HISTORY.md § [1.6.7]. Blowdart unlocks at a lower DEX bar
// than the shared specialization threshold every other stat-specialization tower uses — direct
// request. Kept as a per-target override map (rather than changing SPECIALIZATION_THRESHOLD
// itself) so Gatling/Marksman/Hammerman/Axeman/Spearman/Necromancer/Snapcaster/Cleric/Cat Snapper
// are all completely unaffected.
const SPECIALIZATION_THRESHOLD_OVERRIDE = { BLOWDART: 250 };
function specializationThresholdFor(targetType){
  return SPECIALIZATION_THRESHOLD_OVERRIDE[targetType] !== undefined ? SPECIALIZATION_THRESHOLD_OVERRIDE[targetType] : SPECIALIZATION_THRESHOLD;
}
const ATTUNEMENTS = { str: 'FIRE', dex: 'ELECTRIC', int: 'ICE' };
const ATTUNEMENT_STAT_BY_ELEMENT = { FIRE: 'str', ELECTRIC: 'dex', ICE: 'int' };
const ATTUNEMENT_ICON = { FIRE: '🔥', ELECTRIC: '⚡', ICE: '❄️' };
function tintSkinTowardElement(nativeHex, elementHex, blendAmount){
  const native = hexToRgbChannels(nativeHex), element = hexToRgbChannels(elementHex);
  const blended = native.map((channel, i) => Math.round(channel + (element[i]-channel)*blendAmount));
  return '#' + blended.map(v => v.toString(16).padStart(2,'0')).join('');
}
const BASE_ATTUNABLE_TYPES = ['SWORDSMAN', 'ARCHER', 'MAGE'];
// CA037 — see HISTORY.md § [1.5.7] Code Archaeology, CA037
const SPECIALIZATIONS = {
  SWORDSMAN: { FIRE: 'HAMMERMAN', ELECTRIC: 'AXEMAN', ICE: 'SPEARMAN' },
  ARCHER: { FIRE: 'GATLING', ELECTRIC: 'BLOWDART', ICE: 'MARKSMAN' },
  MAGE: { FIRE: 'NECROMANCER', ELECTRIC: 'SNAPCASTER', ICE: 'CLERIC' }
};
// CA038 — see HISTORY.md § [1.5.7] Code Archaeology, CA038
const HYBRID_SPECIALIZATIONS = {
  SWORDSMAN: {},
  ARCHER: { 'FIRE+ICE': 'BLOW_GUNNER' },
  MAGE: {}
};
const MIXED_PAIR_THRESHOLD = 250;
// ICE-BLOCK-01 (1.7.36): Ice is the rarest element to proc but the most effective: it freezes for 2 to 5 seconds (longer with INT),
// the frozen enemy blocks the units queued behind it, and frozen enemies take extra damage.
const ICE_PROC_SHARE = 0.45, ICE_FREEZE_MIN_MS = 2000, ICE_FREEZE_MAX_MS = 5000, FROZEN_DAMAGE_MULT = 1.3;
// CA040 — see HISTORY.md § [1.5.7] Code Archaeology, CA040
const QUASAR_ELEMENT_SPLASH_RADIUS = 40;
const MIXED_ELEMENT_RULES = [
  { element:'PROTON',      test: t => t.str >= MIXED_PAIR_THRESHOLD && t.dex >= MIXED_PAIR_THRESHOLD },  // Fire + Electric
  { element:'DARK_MATTER', test: t => t.str >= MIXED_PAIR_THRESHOLD && t.int >= MIXED_PAIR_THRESHOLD },  // Fire + Ice
  { element:'QUASAR',      test: t => t.dex >= MIXED_PAIR_THRESHOLD && t.int >= MIXED_PAIR_THRESHOLD }   // Electric + Ice
];
const EVOLUTIONS = {
  // CA041 — see HISTORY.md § [1.5.7] Code Archaeology, CA041
  BLOWDART: { dex: {target:'SQUIRTGUN', threshold:40} }, // deeper DEX specialization — a second tier beyond the first evolution
  HAMMERMAN: { int: {target:'PALADIN', threshold:40} }, // holy devotion — a second tier beyond the first evolution
  // CA042 — see HISTORY.md § [1.5.7] Code Archaeology, CA042
  AXEMAN: { str: {target:'BERSERKER', threshold:40} },
  SPEARMAN: { dex: {target:'LANCER', threshold:40} },
  // CA043 — see HISTORY.md § [1.5.7] Code Archaeology, CA043
  GATLING: { str: {target:'BOMBER', threshold:40} },
  BOMBER: { int: {target:'GUNALINDER', threshold:40} }, // now genuinely reachable via the Gatling unlock above, not just kept working for legacy saves
  GUNALINDER: { int: {target:'SNIPER', threshold:60} }, // deepest INT investment in the game, longest range as the payoff
  // CA044 — see HISTORY.md § [1.5.7] Code Archaeology, CA044
  MARKSMAN: { int: {target:'SNIPER', threshold:60} },
  // CA045 — see HISTORY.md § [1.5.7] Code Archaeology, CA045
  CLERIC: { int: {target:'POPE', threshold:STAT_EFFECT_CAP} } // 500 INT (the per-stat cap); the old extra 750-combined requirement was unreachable under the caps and is gone
};
// STRUCTURE-PRODUCERS-01 (1.7.100) — see HISTORY.md § [1.7.100]
const PRODUCER_TYPES = ['LOG_MILL','STONE_QUARRY','VAULT'];
const PRODUCER_INTERVAL_MS = 60000, PRODUCER_COST_GROWTH = 1.6;
const PRODUCER_DEFS = {
  LOG_MILL: { resource:'wood', icon:'🪵', field:'🏭', parts:[['🌲',24,-12,-5],['🌳',24,12,-7],['🪵',15,-14,8],['🪵',15,13,9],['🏭',22,0,3]], yields:[12,24,45], build:{gold:90,wood:80,stone:40}, upgrades:[{gold:110,wood:120,stone:60},{gold:220,wood:240,stone:120}], hp:[120,180,260] },
  VAULT: { vault:true, resource:null, icon:'🏛️', field:'🏛️', parts:[['🏛️',36,0,0]], yields:[0,0,0], slots:[18,24,30], build:{gold:60,wood:70,stone:320}, upgrades:[{gold:0,wood:90,stone:480},{gold:0,wood:150,stone:800}], hp:[160,240,340] }, // VAULT-01 (1.8.37)
  STONE_QUARRY: { resource:'stone', icon:'⛰️', field:'⛰️', parts:[['⛰️',38,0,-2],['🏭',17,2,9]], yields:[10,20,38], build:{gold:90,wood:40,stone:80}, upgrades:[{gold:110,wood:60,stone:120},{gold:220,wood:120,stone:240}], hp:[120,180,260] }
};
const PRODUCER_MAX_LEVEL = 3;
const isProducerType = type => PRODUCER_TYPES.includes(type);
const isStructureType = type => type === 'BARRICADE' || isProducerType(type);
const isVaultType = type => type === 'VAULT';
const itemCapacityOf = tower => isVaultType(tower.type) ? PRODUCER_DEFS.VAULT.slots[Math.max(1, Math.min(PRODUCER_MAX_LEVEL, tower.level)) - 1] : MAX_ITEM_SLOTS;
const isFighterTower = tower => !!tower && !isStructureType(tower.type);
const STARTER_TOWER_TYPES = ['SWORDSMAN','ARCHER','MAGE','BARRICADE']; // the only types shown in the Build menu (beyond what unlocking reveals) — always exactly these 4: Swordsman/Archer/Mage as the 3 basic intro classes, plus Barricade (not a fighter, but still Build-purchased, not Shop) so its already-written display logic in the Build tray loop is actually reachable. Everything else — including Cat Snapper — has to be unlocked first; nothing gets added here going forward.
const EVOLVED_TOWER_TYPES = ['NINJA','HAMMERMAN','AXEMAN','SPEARMAN','GATLING','BLOWDART','BOMBER','CLERIC','SQUIRTGUN','PALADIN','GUNALINDER','SNIPER','SNAPCASTER','MARKSMAN','POPE','NECROMANCER','BLOW_GUNNER','CAT_SNAPPER','BERSERKER','LANCER','CRAZY_CHEF','MERCHANT','GLAIVE']; // reachable via evolution OR a pure wave gate (Merchant/Glaive have no evolution path at all, same as this list already accommodates for the wave-gate side of Axeman/Spearman/Hammerman) — never built directly before being unlocked one way or the other
// CA046 — see HISTORY.md § [1.5.7] Code Archaeology, CA046
const MAX_ONE_PER_BOARD_TYPES = ['PALADIN','SQUIRTGUN','SNIPER','POPE','NECROMANCER','HACKER'];
const HACK_TOWER_TYPES = ['HACKER']; // buildable only while Hacks are enabled in Settings; never part of normal progression
const HACKER_STEALTH_MS = 8000, HACKER_MAX_HP = 20;
// CA047 — see HISTORY.md § [1.5.7] Code Archaeology, CA047
const SCALING_COST_TYPES = ['NINJA', 'SWORDSMAN', 'ARCHER', 'AXEMAN', 'SPEARMAN', 'HAMMERMAN', 'BERSERKER', 'LANCER', 'MAGE', 'CAT_SNAPPER', 'SNAPCASTER', 'BOMBER', 'MERCHANT', 'GLAIVE', 'GATLING', 'CLERIC', 'CRAZY_CHEF', 'BLOWDART', 'BLOW_GUNNER', 'PROTON', 'DARK_MATTER', 'QUASAR', 'GUNALINDER', 'MARKSMAN']; // PRICE-SCALING-01 (1.6.83): every buildable stickman type except Barricade (wood/stone) and the max-one-per-board types (PALADIN, SQUIRTGUN, SNIPER, POPE, NECROMANCER) // PRICE-SCALING-01 (1.6.83): every buildable stickman type except Barricade (wood/stone, not gold)
const SCALING_COST_GROWTH = 2.25; // cost multiplier per existing on-board copy of that type — e.g. a 50-gold base becomes ~113/253/569 gold for the 2nd/3rd/4th copy
// CA054 — see HISTORY.md § [1.5.7] Code Archaeology, CA054
const PERMANENT_UNLOCKS_KEY = 'stickTD_permanentTowerUnlocks';
function loadPermanentUnlocks(){
  try{
    const raw = localStorage.getItem(PERMANENT_UNLOCKS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  }catch(err){ return new Set(); } // private mode/corrupt data — fall back to empty rather than throwing
}
function savePermanentUnlocks(){
  try{ localStorage.setItem(PERMANENT_UNLOCKS_KEY, JSON.stringify([...unlockedTowerTypes])); }
  catch(err){ /* storage unavailable — the run still works, it just won't remember past this session */ }
}
let unlockedTowerTypes = loadPermanentUnlocks();
function unlockTowerTypeBuild(type){
  if(unlockedTowerTypes.has(type)) return; // already unlocked — no toast on a repeat reach
  unlockedTowerTypes.add(type);
  savePermanentUnlocks();
  showUnlockToast([type]);
}
// CA055 — see HISTORY.md § [1.5.7] Code Archaeology, CA055
const LUCKY_BRANCH = { id:'LUCKY_BRANCH', name:'Lucky Branch', icon:'🌿', str:1, dex:1, int:1, armor:1, cost:180, woodCost:15 }; // SHOP-VALUE-01 (1.8.61): priced like the Rare gear it matches (180 total stats), so the shop no longer undercuts drops
const IRON_CHARM = { id:'IRON_CHARM', name:'Iron Charm', icon:'🧿', armor:3, cost:90, stoneCost:20 };
const SWIFT_FEATHER = { id:'SWIFT_FEATHER', name:'Swift Feather', icon:'🪶', str:1, dex:2, int:1, cost:85 };
const BARRICADE_ITEM = { id:'BARRICADE_ITEM', name:'Barricade', icon:'🚧', cost:0, woodCost:600, stoneCost:300, isBarricade:true };
// MEDICAL-SHOP-01 (1.6.82) — see HISTORY.md § [1.6.82]. Purchased once, held in inventory (never
// equipped to a tower), consumed automatically the moment it would otherwise matter.
const BANDAGE_ITEM = { id:'BANDAGE_ITEM', name:'Bandage', icon:'🩹', cost:40, healLives:3, isMedical:true };
const FIRST_AID_ITEM = { id:'FIRST_AID_ITEM', name:'First Aid Kit', icon:'🧰', cost:110, healFraction:0.5, isMedical:true };
const DEFIBRILLATOR_ITEM = { id:'DEFIBRILLATOR_ITEM', name:'Defibrillator', icon:'🩺', cost:250, isMedical:true, isRevive:true };
const MEDICAL_ITEMS = [ BANDAGE_ITEM, FIRST_AID_ITEM, DEFIBRILLATOR_ITEM ];
let hasDefibrillator = false;
// MERCHANT-SELL-01 (1.7.101) — see HISTORY.md § [1.7.101]: selling an item gives back half of what it cost, or half of the price the merchant would ask for it when it cost nothing (a found item).
// MERCHANT-POTIONS-01 (1.7.101): the merchant stocks every stim, tonic and medical item, plus a Revive that brings a downed stickman back.
const ITEM_SELL_FRACTION = 0.5, MERCHANT_COMMON_PRICE = 100, MERCHANT_LEGENDARY_PRICE = 3000, REVIVE_STICKMAN_COST = 350, REVIVE_STICKMAN_HP_FRACTION = 0.5;
const MERCHANT_POTION_PRICES = { ADRENALINE: 120, COMBAT_STIM: 120, SPOTTER_SCOPE: 100, FIELD_MEDKIT: 90, HYPER_SERUM: 300, TONIC_NANO: 80, TONIC_ESPRESSO: 150 };
function itemMerchantPrice(def){
  if(def.cost > 0) return def.cost;
  if(MERCHANT_POTION_PRICES[def.id]) return MERCHANT_POTION_PRICES[def.id];
  if(def.rarity === 'COMMON') return MERCHANT_COMMON_PRICE;
  if(def.rarity === 'LEGENDARY') return MERCHANT_LEGENDARY_PRICE;
  return MERCHANT_BASE_PRICE[def.rarity] || 0;
}
function itemSellValue(item){ return Math.floor(itemMerchantPrice(item)*ITEM_SELL_FRACTION); }
function merchantPotionDefs(){ return [...STIM_ITEMS, ...LOOT_TONIC_ITEMS.filter(def => def.kind !== 'gold')]; }
function buyMerchantPotion(def){
  const tower = selectedTower, price = MERCHANT_POTION_PRICES[def.id];
  if(!tower || !tower.active || !isFighterTower(tower) || tower.type === 'HACKER' || gold < price || tower.equippedItems.length >= MAX_ITEM_SLOTS) return false;
  if(!tower.receiveItem(Object.assign({}, def, { cost: price }))) return false;
  gold -= price;
  playSound('ui_buy');
  return true;
}
function canReviveSelectedStickman(){ const tower = selectedTower; return !!(tower && tower.active && isFighterTower(tower) && tower.disabledWavesLeft > 0); }
function reviveSelectedStickman(){
  if(!canReviveSelectedStickman() || gold < REVIVE_STICKMAN_COST) return false;
  const tower = selectedTower;
  gold -= REVIVE_STICKMAN_COST;
  tower.disabledWavesLeft = 0; tower.disabledUntil = 0;
  tower.hp = Math.max(1, Math.round(tower.maxHp*REVIVE_STICKMAN_HP_FRACTION));
  spawnFloatingText(tower.x, tower.y - 44, '✨ Revived!', '#ffd700');
  spawnParticles(tower.x, tower.y, '#ffd700', 12);
  playSound('hero');
  return true;
}
function buyMedicalItem(def){
  if(gold < def.cost) return false;
  gold -= def.cost;
  if(def.isRevive){ if(hasDefibrillator) { gold += def.cost; return false; } hasDefibrillator = true; }
  else if(def.healFraction){ const healed = Math.min(Math.round((maxLivesNow()-lives)*def.healFraction), maxLivesNow()-lives); if(healed>0){ lives += healed; showLivesChange(healed); } }
  else if(def.healLives){ const healed = Math.min(def.healLives, maxLivesNow()-lives); if(healed>0){ lives += healed; showLivesChange(healed); } }
  playSound('click');
  return true;
}
// CA056 — see HISTORY.md § [1.5.7] Code Archaeology, CA056
function barricadeRepairCost(t){
  const missingFrac = 1 - (t.hp / t.maxHp);
  return {
    wood: Math.ceil(BARRICADE_ITEM.woodCost * missingFrac * 0.5),
    stone: Math.ceil(BARRICADE_ITEM.stoneCost * missingFrac * 0.5)
  };
}
const UNIVERSAL_ITEMS = [ LUCKY_BRANCH, IRON_CHARM, SWIFT_FEATHER, BARRICADE_ITEM ];
// ITEM-DROPS-01 (1.6.81) — see HISTORY.md § [1.6.81]
Object.assign(LUCKY_BRANCH, { rarity: 'RARE' });
Object.assign(IRON_CHARM, { rarity: 'UNCOMMON' });
Object.assign(SWIFT_FEATHER, { rarity: 'UNCOMMON' });
Object.assign(BARRICADE_ITEM, { rarity: 'COMMON' });
// ITEM-GLOW-01 (1.7.113) — see HISTORY.md § [1.7.113]: rainbow is the rarest glow and belongs to Legendary items only; every other kind has one fixed colour (vegetables green, fruit blue, meat orange;
// gear white, yellow, purple, pink by rarity), on the ground and in the inventory.
const ITEM_RARITIES = {
  COMMON:    { label: 'Common',    weight: 66,   glowRadius: 20, hueMsPerDegree: 60, statBudget: [10, 20], ringColor: '#cfd8dc', glowHue: 0,   glowSat: 0 },
  UNCOMMON:  { label: 'Uncommon',  weight: 26,   glowRadius: 22, hueMsPerDegree: 45, statBudget: [25, 40], ringColor: '#66bb6a', glowHue: 48,  glowSat: 100 },
  RARE:      { label: 'Rare',      weight: 7,    glowRadius: 26, hueMsPerDegree: 30, statBudget: [45, 60], ringColor: '#42a5f5', glowHue: 268, glowSat: 100 },
  EPIC:      { label: 'Epic',      weight: 1,    glowRadius: 30, hueMsPerDegree: 18, statBudget: [65, 80], ringColor: '#ce93d8', glowHue: 330, glowSat: 100 },
  LEGENDARY: { label: 'Legendary', weight: 0.25, glowRadius: 34, hueMsPerDegree: 12, statBudget: [85, 100], ringColor: '#ffffff', rainbow: true }
};
const FOOD_GLOW_HUE_BY_KIND = { VEGETABLE: 125, FRUIT: 210, MEAT: 28 }, TREAT_GLOW_HUE = 175, HUT_XP_GLOW_HUE = 285;
function itemGlowStyle(def){
  if(def.isFood) return { hue: FOOD_GLOW_HUE_BY_KIND[def.kind] !== undefined ? FOOD_GLOW_HUE_BY_KIND[def.kind] : 125, sat: 100, rainbow: false };
  if(def.isTreat) return { hue: TREAT_GLOW_HUE, sat: 100, rainbow: false };
  if(def.isHutLoot) return { hue: HUT_XP_GLOW_HUE, sat: 100, rainbow: false };
  const rarity = ITEM_RARITIES[def.rarity] || ITEM_RARITIES.COMMON;
  return rarity.rainbow ? { hue: 0, sat: 100, rainbow: true } : { hue: rarity.glowHue, sat: rarity.glowSat, rainbow: false };
}
function itemGlowClass(def){
  const style = itemGlowStyle(def);
  if(style.rainbow) return 'glow-rainbow';
  if(def.isFood) return def.kind === 'MEAT' ? 'glow-orange' : def.kind === 'FRUIT' ? 'glow-blue' : 'glow-green';
  if(def.isTreat) return 'glow-teal';
  if(def.isHutLoot) return '';
  return ({ COMMON: 'glow-white', UNCOMMON: 'glow-yellow', RARE: 'glow-purple', EPIC: 'glow-pink' })[def.rarity] || '';
}
const ITEM_GLOW_CLASSES = ['glow-rainbow', 'glow-green', 'glow-blue', 'glow-orange', 'glow-teal', 'glow-white', 'glow-yellow', 'glow-purple', 'glow-pink'];
function applyItemGlowClass(element, def){
  element.classList.remove(...ITEM_GLOW_CLASSES);
  const glowClass = def ? itemGlowClass(def) : '';
  if(glowClass) element.classList.add(glowClass);
}
const DROP_ITEM_ROWS = [
  ['RUSTY_NAIL', 'Rusty Nail', '🔩', 'COMMON', { str: 2 }],
  ['WORN_BOOTS', 'Worn Boots', '🥾', 'COMMON', { dex: 2 }],
  ['RUNNING_SHOES', 'Running Shoes', '👟', 'LEGENDARY', { str: 20, dex: 50, int: 20 }, { extraMove: true }],
  ['FANCY_HAT', 'Fancy Hat', '🎩', 'LEGENDARY', { str: 20, dex: 20, int: 50 }, { rangeBonus: 0.01 }],
  ['WOOL_SCARF', 'Wool Scarf', '🧣', 'COMMON', { armor: 2 }],
  ['GLASS_MARBLE', 'Glass Marble', '🫧', 'COMMON', { int: 2 }],
  ['LEATHER_GLOVE', 'Leather Glove', '🧤', 'COMMON', { str: 1, armor: 1 }],
  ['BRASS_COMPASS', 'Brass Compass', '🧭', 'COMMON', { dex: 1, int: 1 }],
  ['PADDED_VEST', 'Padded Vest', '🦺', 'COMMON', { armor: 3 }],
  ['WOODEN_WHISTLE', 'Wooden Whistle', '🎺', 'COMMON', { dex: 2, armor: 1 }],
  ['CANDLE_STUB', 'Candle Stub', '🕯️', 'COMMON', { int: 2, armor: 1 }],
  ['HUNTER_BADGE', 'Hunter Badge', '🎖️', 'UNCOMMON', { str: 2, dex: 1 }],
  ['SCHOLAR_LENS', 'Scholar Lens', '🔍', 'UNCOMMON', { int: 2, dex: 1 }],
  ['IRON_HELM', 'Iron Helm', '⛑️', 'UNCOMMON', { armor: 4 }],
  ['SWIFT_BOOTS', 'Swift Boots', '👢', 'UNCOMMON', { dex: 3 }],
  ['WAR_DRUM', 'War Drum', '🥁', 'UNCOMMON', { str: 2, int: 1, armor: 1 }],
  ['MOON_PENDANT', 'Moon Pendant', '📿', 'UNCOMMON', { int: 3, armor: 1 }],
  ['STORM_UMBRELLA', 'Storm Umbrella', '☔', 'UNCOMMON', { armor: 2, dex: 2 }],
  ['SILVER_BELL', 'Silver Bell', '🔔', 'UNCOMMON', { str: 1, dex: 1, int: 2 }],
  ['DRAGON_SCALE', 'Dragon Scale', '🐉', 'RARE', { str: 3, armor: 3 }],
  ['STAR_COMPASS', 'Star Compass', '⭐', 'RARE', { dex: 3, int: 3 }],
  ['ANCIENT_TOME', 'Ancient Tome', '📜', 'RARE', { int: 5, armor: 1 }],
  ['GUARDIAN_SHIELD', 'Guardian Shield', '🛡️', 'RARE', { armor: 6, str: 1 }],
  ['LIGHTNING_BOLT', 'Lightning Bolt', '🌩️', 'RARE', { dex: 4, str: 2 }],
  ['CHAMPION_MEDAL', 'Champion Medal', '🏅', 'RARE', { str: 2, dex: 2, int: 2 }],
  ['PHOENIX_EMBER', 'Phoenix Ember', '🪔', 'EPIC', { str: 4, int: 4 }],
  ['TITAN_GAUNTLET', 'Titan Gauntlet', '🥊', 'EPIC', { str: 6, armor: 4 }],
  ['AURORA_PRISM', 'Aurora Prism', '🌈', 'EPIC', { str: 3, dex: 3, int: 3, armor: 3 }],
  ['GRUNT_HEADBAND', 'Grunt Headband', '🎀', 'COMMON', { str: 2, armor: 1 }],
  ['ANT_JAW', 'Ant Jaw', '🦷', 'COMMON', { dex: 2 }],
  ['GRANITE_HEART', 'Granite Heart', '🪨', 'RARE', { armor: 5, str: 1 }],
  ['SHADOW_SASH', 'Shadow Sash', '🧵', 'UNCOMMON', { dex: 4 }],
  ['FIEND_HORN', 'Fiend Horn', '📯', 'RARE', { str: 4, int: 2, armor: 1 }],
  ['HOLIDAY_STOCKING', 'Holiday Stocking', '🧦', 'EPIC', { str: 2, dex: 2, int: 2, armor: 3 }],
  ['FORTUNE_SLIP', 'Fortune Slip', '🥠', 'COMMON', { int: 2, dex: 1 }],
  ['KNIGHT_PAWN', 'Knight Pawn', '♟️', 'UNCOMMON', { str: 1, armor: 3 }],
  ['BRIDGE_TOLL', 'Bridge Toll', '💰', 'RARE', { str: 3, armor: 2, dex: 1 }],
  ['EMBER_CORE', 'Ember Core', '🔥', 'UNCOMMON', { str: 3, int: 1 }],
  ['FROST_SHARD', 'Frost Shard', '❄️', 'UNCOMMON', { int: 3, armor: 1 }],
  ['SPORE_FLASK', 'Spore Flask', '🧪', 'UNCOMMON', { int: 3, dex: 1 }],
  ['MENDERS_PIN', 'Mender\'s Pin', '📌', 'UNCOMMON', { armor: 3, int: 1 }],
  ['FIELD_HELMET', 'Field Helmet', '🪖', 'UNCOMMON', { armor: 4, str: 1 }],
  ['GRAVE_CHARM', 'Grave Charm', '⚰️', 'UNCOMMON', { armor: 2, str: 2 }],
  ['SPECTRAL_VEIL', 'Spectral Veil', '🕸️', 'UNCOMMON', { dex: 3, int: 1 }],
  ['BONE_WHISTLE', 'Bone Whistle', '🦴', 'COMMON', { dex: 2, int: 1 }],
  ['WOLF_FANG', 'Wolf Fang', '🐾', 'UNCOMMON', { str: 2, dex: 2 }],
  ['MIDNIGHT_CHARM', 'Midnight Charm', '🌙', 'RARE', { int: 4, str: 1 }],
  ['GEODE', 'Geode', '💎', 'RARE', { armor: 4, int: 2 }],
  ['BUTTERFLY_WING', 'Butterfly Wing', '🦋', 'UNCOMMON', { dex: 4 }]
];
// EQUIPMENT-RARITY-STATS-01 (1.7.137): each supported stat has its own rarity band, not a total budget.
const EQUIPMENT_NATIVE_STAT_MAX = { COMMON:3, UNCOMMON:4, RARE:6, EPIC:6, LEGENDARY:50 };
function equipmentStatBonus(value, rarityKey){
  if(!value) return 0;
  const band = ITEM_RARITIES[rarityKey].statBudget;
  return Math.round(band[0] + (band[1]-band[0])*clampNum((value-1)/(EQUIPMENT_NATIVE_STAT_MAX[rarityKey]-1),0,1));
}
for(const item of [LUCKY_BRANCH,IRON_CHARM,SWIFT_FEATHER]) for(const stat of ['str','dex','int','armor']) if(item[stat]) item[stat] = equipmentStatBonus(item[stat],item.rarity);
const DROP_ITEMS = DROP_ITEM_ROWS.map(([id, name, icon, rarity, stats, extras]) => Object.freeze({ id, name, icon, rarity, str: equipmentStatBonus(stats.str,rarity), dex: equipmentStatBonus(stats.dex,rarity), int: equipmentStatBonus(stats.int,rarity), armor: equipmentStatBonus(stats.armor,rarity), rangeBonus: (extras && extras.rangeBonus) || 0, extraMove: !!(extras && extras.extraMove), cost: 0, isDropOnly: true }));
const ITEM_BY_ID = new Map([...UNIVERSAL_ITEMS, ...DROP_ITEMS].map(item => [item.id, item]));
const LEGACY_ITEM_ID_MIGRATIONS = { LUCKY_COIN: 'BRASS_COMPASS', TENNIS_SHOES: 'RUNNING_SHOES' };
function itemDefinitionForSavedId(id){
  const migratedId = LEGACY_ITEM_ID_MIGRATIONS[id] || id;
  return ITEM_BY_ID.get(migratedId) || CONSUMABLE_BY_ID.get(migratedId);
}
function applyLegacyLuckyCoinMigration(item, savedId, hasLegacyMarker){
  if(item && item.id === 'BRASS_COMPASS' && (savedId === 'LUCKY_COIN' || hasLegacyMarker)){
    item.str = 1; item.legacyLuckyCoin = true;
  }
  return item;
}
const SHOVEL_CHARGES_PER_ROUND = 3, SHOVEL_DIG_MS = 700, SHOVEL_CHEST_CHANCE = 0.03; // SHOVEL-CHARGES-01 (1.8.18)
const SHOVEL_ITEM = Object.freeze({ id: 'SHOVEL', name: 'Shovel', icon: '🪏', rarity: 'UNCOMMON', isDiggingTool: true, isReusable: true, str: 0, dex: 0, int: 0, armor: 0, cost: 0, isDropOnly: true });
// LOOT-TABLE-01 (1.6.99) — see HISTORY.md § [1.6.99]. Morrowind-style container table. THEME: medieval-modern
// fusion — knights and crossbows beside energy drinks, nano-tonics and bounty chips. New loot names, icons and
// flavor should keep blending the two eras (Nano-Tonic, Espresso Elixir, Bounty Chip), never one alone.
// A regular enemy rolls ONCE against LOOT_KILL_ODDS; most kills drop nothing. On a hit it drops exactly
// ONE item: the category comes from LOOT_CATEGORY_WEIGHTS_BY_TIER (supply = common, tonic = uncommon, gear = rare).
// Gear is the only category that touches ITEM_RARITIES; SIGNATURE_SHARE_OF_GEAR_DROPS of gear drops are the
// enemy's own signature item. Bosses ignore all of this and always drop signature + generic gear plus a Treat.
const SIGNATURE_SHARE_OF_GEAR_DROPS = 0.35;
// LOOT-ODDS-01 (1.6.116) — see HISTORY.md § [1.6.116]
// LOOT-RARER-01 (1.7.45): owner says items appear too often and too easily and rare items are not rare enough. Since 1.7.38 there are 1.5 times as many enemies, so the same per-kill odds gave 1.5 times as many
// items per wave. Odds are now about 0.6 times what they were (a little under the pre-1.7.38 rate per wave), gear is rarer still, the per-wave cap is lower, and rare and epic items are rarer.
const LOOT_KILL_ODDS = { supply: 1/170, tonic: 1/430, gear: 1/1000 };
const LOOT_CATEGORY_WEIGHTS_BY_TIER = {
  TINY:     { supply: 76, tonic: 20, gear: 4 },
  SMALL:    { supply: 72, tonic: 22, gear: 6 },
  STANDARD: { supply: 66, tonic: 25, gear: 9 },
  LARGE:    { supply: 46, tonic: 32, gear: 22 }
};
const LOOT_REGULAR_DROP_CAP_BASE = 2;      // max regular-enemy drops per wave at wave 0...
const LOOT_REGULAR_DROP_CAP_PER_10_WAVES = 1; // ...plus this many per 10 waves, up to the max below
const LOOT_REGULAR_DROP_CAP_MAX = 5;
// HUT-LOOT-01 (1.6.84) — see HISTORY.md § [1.6.84]. A destroyed hut/camp bursts into 3-5 gold/XP
// pickups scattered nearby, on top of its existing bounty payout. Reuses the ground-item system
// (rainbow-glow, drag-or-touch collection) rather than a new entity pool.
const HUT_LOOT_ROWS = [
  ['LOOT_GOLD_SMALL', 'Coin Pouch', '🪙', 'gold', 8], ['LOOT_GOLD_LARGE', 'Coin Purse', '💰', 'gold', 18],
  ['LOOT_XP', 'Training Scroll', '📜', 'xp', 25]
];
const HUT_LOOT_ITEMS = HUT_LOOT_ROWS.map(([id, name, icon, kind, amount]) => Object.freeze({ id, name, icon, kind, amount, isHutLoot: true }));
const LOOT_TONIC_ROWS = [
  ['TONIC_NANO', 'Nano-Tonic', '🧪', 'heal', 4],
  ['TONIC_ESPRESSO', 'Espresso Elixir', '☕', 'xp', 60],
  ['TONIC_BOUNTY_CHIP', 'Bounty Chip', '💳', 'gold', 40]
];
const LOOT_TONIC_ITEMS = LOOT_TONIC_ROWS.map(([id, name, icon, kind, amount]) => Object.freeze({ id, name, icon, kind, amount, isHutLoot: true }));
function spawnHutLootChest(x, y){
  const count = 3 + Math.floor(Math.random()*3);
  for(let i=0; i<count; i++){
    const angle = Math.random()*Math.PI*2, dist = 14 + Math.random()*26;
    spawnGroundItem(x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, HUT_LOOT_ITEMS[Math.floor(Math.random()*HUT_LOOT_ITEMS.length)], 'hut chest');
  }
  spawnParticles(x, y, '#ffd23f', 16);
}
function applyHutLootItem(lootDef, nearTower){
  const lootTier = lootDef.id.startsWith('TONIC_') ? 1 : 0;
  if(lootDef.kind === 'heal'){
    const healed = Math.min(lootDef.amount, maxLivesNow() - lives);
    if(healed > 0){ lives += healed; showLivesChange(healed); }
    showItemUseFeedback(lootDef, nearTower, 'HEAL', lootTier, ['Lives +' + lootDef.amount]);
  }
  else if(lootDef.kind === 'gold'){ gold += lootDef.amount; showItemUseFeedback(lootDef, nearTower, 'GAIN', lootTier, ['Gold +' + lootDef.amount]); }
  else if(nearTower){ gainTowerExp(nearTower, lootDef.amount); showItemUseFeedback(lootDef, nearTower, 'GAIN', lootTier, ['XP +' + lootDef.amount]); }
}
// ITEM-CRAFTING-01 (1.6.96) — see HISTORY.md § [1.6.96]. WC3-style consumable recipes, entirely
// within a stickman's own inventory: no separate codex, salvage, or set-bonus system, and no crafting
// UI beyond the inventory itself. Combining CONSUMES the exact ingredient items from that stickman's
// equippedItems and adds the result — never a shared/global stash, never partial credit toward a recipe.
const CRAFTING_RECIPES = [
  { result: 'HUNTER_BADGE',    ingredients: ['RUSTY_NAIL', 'LEATHER_GLOVE'] },
  { result: 'SWIFT_BOOTS',     ingredients: ['WORN_BOOTS', 'BRASS_COMPASS'] },
  { result: 'IRON_HELM',       ingredients: ['WOOL_SCARF', 'PADDED_VEST'] },
  { result: 'SCHOLAR_LENS',    ingredients: ['GLASS_MARBLE', 'CANDLE_STUB'] },
  { result: 'SILVER_BELL',     ingredients: ['BRASS_COMPASS', 'WOODEN_WHISTLE'] },
  { result: 'WAR_DRUM',        ingredients: ['RUSTY_NAIL', 'WOOL_SCARF', 'GLASS_MARBLE'] },
  { result: 'STORM_UMBRELLA',  ingredients: ['WOOL_SCARF', 'WORN_BOOTS'] },
  { result: 'CHAMPION_MEDAL',  ingredients: ['HUNTER_BADGE', 'SCHOLAR_LENS'] },
  { result: 'GUARDIAN_SHIELD', ingredients: ['IRON_HELM', 'SWIFT_BOOTS'] },
  { result: 'LIGHTNING_BOLT',  ingredients: ['SWIFT_BOOTS', 'SILVER_BELL'] },
  { result: 'DRAGON_SCALE',    ingredients: ['IRON_HELM', 'WAR_DRUM'] },
  { result: 'STAR_COMPASS',    ingredients: ['SCHOLAR_LENS', 'SWIFT_BOOTS'] },
  { result: 'ANCIENT_TOME',    ingredients: ['SCHOLAR_LENS', 'MOON_PENDANT'] },
  { result: 'PHOENIX_EMBER',   ingredients: ['DRAGON_SCALE', 'CHAMPION_MEDAL'] },
  { result: 'TITAN_GAUNTLET',  ingredients: ['GUARDIAN_SHIELD', 'DRAGON_SCALE'] },
  { result: 'AURORA_PRISM',    ingredients: ['STAR_COMPASS', 'LIGHTNING_BOLT', 'CHAMPION_MEDAL'] }
];
// Consumes-first order the ingredients list into a lookup for fast "does this tower have the pieces" checks.
const STACKABLE_ITEM_IDS = new Set(['HONEY']); // STACK-HONEY-01 (1.8.18): these share one inventory slot and carry a count
function heldCount(item){ return item.count || 1; }
function takeOneFromHeld(tower, item){
  if(heldCount(item) > 1){ item.count = heldCount(item) - 1; return false; }
  tower.equippedItems.splice(tower.equippedItems.indexOf(item), 1);
  return true;
}
function findCraftableRecipeFor(equippedItems, cook){
  const heldIds = equippedItems.flatMap(item => Array(heldCount(item)).fill(item.id));
  for(const recipe of CRAFTING_RECIPES){
    if(recipe.fuelCost && !(cook && findLitCampfireNear(cook, recipe.fuelCost))) continue;
    const heldCopy = [...heldIds];
    const hasEveryIngredient = recipe.ingredients.every(ingredientId => {
      const foundIndex = heldCopy.indexOf(ingredientId);
      if(foundIndex === -1) return false;
      heldCopy.splice(foundIndex, 1);
      return true;
    });
    if(hasEveryIngredient) return recipe;
  }
  return null;
}
function craftItemOn(tower){
  const recipe = findCraftableRecipeFor(tower.equippedItems, tower);
  if(!recipe) return false;
  const cookingFire = recipe.fuelCost ? findLitCampfireNear(tower, recipe.fuelCost) : null;
  if(cookingFire){ cookingFire.fuel -= recipe.fuelCost; spawnFloatingText(cookingFire.x, cookingFire.y - 22, '🪵 -' + recipe.fuelCost + ' fuel', '#ffb74d', ITEM_POPUP_LIFE_MS); }
  for(const ingredientId of recipe.ingredients){
    const held = tower.equippedItems.find(item => item.id === ingredientId);
    if(held){ if(takeOneFromHeld(tower, held)) itemLogReleased(held, 'consumed by crafting'); }
  }
  const resultDef = makeItemInstance(lookupItemDef(recipe.result), 'crafted by ' + itemHolderLabel(tower));
  tower.equippedItems.push(resultDef);
  itemLogHeldBy(resultDef, tower);
  refreshQuickUse(tower);
  tower.recomputeStats();
  tower.checkHeroStatus();
  spawnFloatingText(tower.x, tower.y - 44, (recipe.fuelCost ? '🍳 ' : '🔧 ') + resultDef.icon + ' ' + resultDef.name + '!', '#ffe066');
  spawnParticles(tower.x, tower.y, '#ffe066', 12);
  playSound('levelup');
  trackGameEvent('item_crafted', { result: recipe.result, tower_type: tower.type });
  return true;
}
const ITEM_GUIDE_SEEN_KEY = 'stickTD_itemGuideSeen';
const FIRST_ESCAPE_SEEN_KEY = 'stickTD_firstEscapeSeen';
const FIRST_TOWER_DOWN_SEEN_KEY = 'stickTD_firstTowerDownSeen';
// FIRST-TIME-ALERTS-01 (1.6.84) — see HISTORY.md § [1.6.84]. One-time explanatory toasts, shown once
// per browser (localStorage-gated) and skippable entirely via the Introduction Text setting above.
const firstTimeAlertSessionSeen = new Set();
function maybeShowFirstTimeAlert(storageKey, message, color){
  if(!introTextEnabled || firstTimeAlertSessionSeen.has(storageKey)) return;
  let alreadySeen = false;
  try{ alreadySeen = !!localStorage.getItem(storageKey); }catch(err){ /* storage unavailable: show every time this session */ }
  if(alreadySeen) return;
  firstTimeAlertSessionSeen.add(storageKey);
  try{ localStorage.setItem(storageKey, '1'); }catch(err){ /* storage unavailable: nothing to remember */ }
  showToast(message, color);
}
function itemStatSummary(itemDef){
  const parts = [];
  if(itemDef.cookedStats)for(const [stat,n] of Object.entries(itemDef.cookedStats))parts.push('+'+n+' '+stat.toUpperCase());
  if(itemDef.str) parts.push('+' + itemDef.str + ' STR');
  if(itemDef.dex) parts.push('+' + itemDef.dex + ' DEX');
  if(itemDef.int) parts.push('+' + itemDef.int + ' INT');
  if(itemDef.armor) parts.push('+' + itemDef.armor + ' Armor');
  if(itemDef.rangeBonus) parts.push('+' + Math.round(itemDef.rangeBonus*100) + '% range');
  if(itemDef.extraMove) parts.push('+1 move each round');
  return parts.join('  ');
}
function rollDropRarity(isBossDrop){
  const weights = isBossDrop ? BOSS_RARITY_WEIGHTS : null;
  let totalWeight = 0;
  for(const key of Object.keys(ITEM_RARITIES)) totalWeight += weights ? weights[key] : ITEM_RARITIES[key].weight;
  let roll = Math.random() * totalWeight;
  for(const key of Object.keys(ITEM_RARITIES)){
    roll -= weights ? weights[key] : ITEM_RARITIES[key].weight;
    if(roll < 0) return key;
  }
  return 'COMMON';
}
function pickGenericDropItem(rarity){
  const candidates = DROP_ITEMS.filter(item => item.rarity === rarity);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
// CA057 — see HISTORY.md § [1.5.7] Code Archaeology, CA057
const WAVE_DROP_ITEMS = [ LUCKY_BRANCH, IRON_CHARM, SWIFT_FEATHER ];
const WAVE_DROP_CHANCE = 0.12;
const PASSIVE_UPGRADES = [
  { id:'GLOBAL_STR', name:"Warrior's Blessing", icon:'💪', stat:'str', baseCost:100, costGrowth:1.6 },
  { id:'GLOBAL_DEX', name:'Swift Wind',         icon:'🏃', stat:'dex', baseCost:100, costGrowth:1.6 },
  { id:'GLOBAL_INT', name:'Ancient Wisdom',     icon:'🧠', stat:'int', baseCost:100, costGrowth:1.6 }
];
let globalPassiveCounts = {};
const RUN_REWARD_DEFS=Object.freeze({
  STR:{icon:'💪',name:"Warrior's Blessing",description:'+2 effective STR for all current and future defenders this run. More health and melee power.',passive:'GLOBAL_STR'},
  DEX:{icon:'🏃',name:'Swift Wind',description:'+2 effective DEX for all current and future defenders this run. More attack speed and accuracy; ranged classes also gain damage.',passive:'GLOBAL_DEX'},
  INT:{icon:'🧠',name:'Ancient Wisdom',description:'+2 effective INT for all current and future defenders this run. More range and spell power, with stronger critical hits.',passive:'GLOBAL_INT'},
  SUPPLY:{icon:'🪙',name:'Travel Supplies'},
  RECOVER:{icon:'🩹',name:'Field Recovery',description:'Restore up to 6 player lives and 20% of each standing defender’s maximum health. Excludes downed defenders and barricades.'}
});
const MAX_PENDING_RUN_REWARDS=8;
let runBoonCounts={};
let pendingRunRewards=[];
let lastRunRewardWave=0;
function runRewardGold(wave){ return Math.min(100,30+wave*2); }
function runRewardDescription(id,wave){
  return id==='SUPPLY'?'Gain '+runRewardGold(wave)+' gold to spend on your squad.':RUN_REWARD_DEFS[id].description;
}
function runRecoveryHp(tower){
  if(!tower.active || isStructureType(tower.type) || tower.disabledWavesLeft>0 || tower.hp<=0) return 0;
  return Math.max(0,Math.min(tower.maxHp-tower.hp,Math.round(tower.maxHp*0.2)));
}
function runRewardPreview(id,wave){
  if(id==='SUPPLY') return 'Gold: '+gold+' → '+(gold+runRewardGold(wave))+'.';
  if(id==='RECOVER'){
    const healLives=Math.max(0,Math.min(6,maxLivesNow()-lives));
    let hp=0,defenders=0;
    for(const tower of towerPool){const heal=runRecoveryHp(tower);if(heal>0){hp+=heal;defenders++;}}
    return healLives || hp ? 'Now: +'+healLives+' lives and '+Math.round(hp)+' HP across '+defenders+' standing defender'+(defenders===1?'':'s')+'.' : 'No recovery needed now. You can keep this reward for later.';
  }
  const def=RUN_REWARD_DEFS[id];
  return 'Run blessing total after choosing: +'+((runBoonCounts[def.passive]||0)+2)+' '+id+'. Stat limits still apply.';
}
function refreshRunRewardButton(){
  const button=document.getElementById('runRewardBtn');
  button.hidden=pendingRunRewards.length===0;
  button.textContent='🎁'+(pendingRunRewards.length>1?' '+pendingRunRewards.length:'');
  button.setAttribute('aria-label','Choose milestone reward'+(pendingRunRewards.length>1?' ('+pendingRunRewards.length+' waiting)':''));
  fitHudTopToOneLine();
}
function restoreRunRewards(state){
  pendingRunRewards=[];runBoonCounts={};
  for(const id of ['GLOBAL_STR','GLOBAL_DEX','GLOBAL_INT']){
    const count=state.runBoonCounts?.[id];if(Number.isInteger(count)&&count>=0&&count<=1000000)runBoonCounts[id]=count;
  }
  const completed=Math.max(0,Math.floor(state.wavesCompleted||0));
  const seen=new Set();
  for(const saved of []){
    if(!saved || !Number.isInteger(saved.wave) || saved.wave<3 || saved.wave>completed || (saved.wave!==3 && saved.wave%10!==0) || seen.has(saved.wave) || !Array.isArray(saved.ids)) continue;
    const ids=[...new Set(saved.ids)].filter(id=>Object.prototype.hasOwnProperty.call(RUN_REWARD_DEFS,id));
    if(ids.length!==3) continue;
    seen.add(saved.wave);pendingRunRewards.push({wave:saved.wave,ids});
  }
  pendingRunRewards.sort((a,b)=>a.wave-b.wave);
  lastRunRewardWave=Number.isInteger(state.lastRunRewardWave)?Math.max(0,Math.min(completed,state.lastRunRewardWave)):completed;
  if(pendingRunRewards.length) lastRunRewardWave=Math.max(lastRunRewardWave,pendingRunRewards.at(-1).wave);
  refreshRunRewardButton();
}
// RUN-REWARD-REMOVED-01 (1.7.36): owner decision — choice rewards were never requested and are not wanted. Nothing offers one.
function offerRunReward(wave){
  return;
  if((wave!==3 && wave%10!==0) || wave<=lastRunRewardWave) return;
  lastRunRewardWave=wave;
  const ids=wave===3?['STR','DEX','INT']:Object.keys(RUN_REWARD_DEFS);
  if(wave!==3){
    const rng=createSeededRandom(waveSeedFor(waveRunSeed,800000+wave));
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  }
  if(pendingRunRewards.length>=MAX_PENDING_RUN_REWARDS){
    const old=pendingRunRewards.shift(),amount=runRewardGold(old.wave);
    gold+=amount;logGameEvent('unclaimed wave '+old.wave+' reward banked as '+amount+' gold');
    const entry=notificationHistory.find(entry=>entry.rewardWave===old.wave);
    if(entry){entry.message='🪙 Wave '+old.wave+' reward banked';entry.explanation='Added '+amount+' gold automatically when eight newer rewards were waiting.';delete entry.rewardWave;}
  }
  const reward={wave,ids:ids.slice(0,3)};pendingRunRewards.push(reward);refreshRunRewardButton();
  const title='🎁 Wave '+wave+' reward';
  const id=recordNotification(title,'Choose one reward for this run. You can leave it waiting and keep playing.');
  const entry=notificationHistory.find(entry=>entry.id===id);if(entry) entry.rewardWave=wave;
  showToast(title,null,null,id);playSound('evolution');
}
function openRunReward(wave){
  const reward=pendingRunRewards.find(reward=>reward.wave===wave)||pendingRunRewards[0];
  if(!reward) return;
  openNotificationEntry(0,{message:'🎁 Wave '+reward.wave+' reward',explanation:'This reward has already been claimed.',rewardWave:reward.wave,read:true});
}
function claimRunReward(wave,id){
  if(gameState!=='PLAYING' && gameState!=='PAUSED')return false;
  const index=pendingRunRewards.findIndex(reward=>reward.wave===wave);
  if(index<0 || !pendingRunRewards[index].ids.includes(id)) return false;
  pendingRunRewards.splice(index,1);
  const def=RUN_REWARD_DEFS[id];
  let receipt=runRewardDescription(id,wave);
  if(def.passive){
    runBoonCounts[def.passive]=(runBoonCounts[def.passive]||0)+2;
    for(const t of towerPool) if(t.active) t.recomputeStats();
  } else if(id==='SUPPLY'){
    const amount=runRewardGold(wave);gold+=amount;receipt='Added '+amount+' gold.';
  } else {
    const healed=Math.max(0,Math.min(6,maxLivesNow()-lives));lives+=healed;if(healed)showLivesChange(healed);
    let hp=0,defenders=0;
    for(const t of towerPool){const heal=runRecoveryHp(t);if(heal>0){t.hp+=heal;hp+=heal;defenders++;}}
    receipt='Restored '+healed+' lives and '+Math.round(hp)+' HP across '+defenders+' standing defender'+(defenders===1?'':'s')+'.';
  }
  const entry=notificationHistory.find(entry=>entry.rewardWave===wave);
  if(entry){entry.message='🎁 '+def.name+' claimed';entry.explanation=receipt;delete entry.rewardWave;}
  logGameEvent('wave '+wave+' reward chosen: '+id);
  refreshRunRewardButton();updateHUD();updateInspectPanel();
  document.getElementById('notification-detail-popup').close();playSound('evolution');
  return true;
}
function passiveCost(def){
  return Math.round(def.baseCost * Math.pow(def.costGrowth, globalPassiveCounts[def.id]||0));
}
function buyPassive(id){
  const def = PASSIVE_UPGRADES.find(p => p.id === id);
  if(!def) return false;
  const cost = passiveCost(def);
  if(gold < cost) return false;
  gold -= cost;
  globalPassiveCounts[id] = (globalPassiveCounts[id]||0) + 1;
  for(const t of towerPool) if(t.active) t.recomputeStats();
  playSound('click');
  updateHUD();
  return true;
}
function itemStatLine(def){ return itemStatSummary(def); }
// RATE-CURVE-01: 50 DEX = 1.02x, 250 = 1.5x, 500 = 3x; no preferred-stat speed multiplier.
function attackRateFromDex(dex){ const t = clampNum(dex / STAT_EFFECT_CAP, 0, 1); return 1 + 2*t*t; }
const CONFIG = {};
function validateGameDefinitions(){
  const problems = [];
  const towerTypes = Object.keys(CONFIG.TOWERS);
  const enemyTypes = Object.keys(CONFIG.ENEMIES);

  // Wave plans — ascending size phases, 5:1 little-to-big ratio, chapter introductions, XP budget
  for(const problem of validateSizeTierBands()) problems.push('SIZE_TIER_BANDS: ' + problem);
  for(let waveNumber = 1; waveNumber <= CAMPAIGN_WAVE_COUNT + 20; waveNumber++){
    for(const problem of validateWavePlan(buildWavePlan(waveNumber))) problems.push(problem);
  }

  // CONFIG.TOWERS — every tier's core numeric fields must be finite
  for(const type of towerTypes){
    const def = CONFIG.TOWERS[type];
    if(!Array.isArray(def.tiers) || def.tiers.length === 0){
      problems.push('CONFIG.TOWERS.' + type + '.tiers is empty or missing');
      continue;
    }
    def.tiers.forEach((tier, tierIdx) => {
      for(const field of ['range', 'damage', 'cooldown']){
        if(!Number.isFinite(tier[field])) problems.push('CONFIG.TOWERS.' + type + '.tiers[' + tierIdx + '].' + field + ' = ' + tier[field] + ' — must be a finite number');
      }
    });
  }

  // CONFIG.ENEMIES — core numeric fields must be finite and positive where it matters
  for(const type of enemyTypes){
    const def = CONFIG.ENEMIES[type];
    if(!(Number.isFinite(def.baseHp) && def.baseHp > 0)) problems.push('CONFIG.ENEMIES.' + type + '.baseHp = ' + def.baseHp + ' — must be a positive finite number');
    if(!(Number.isFinite(def.speed) && def.speed > 0)) problems.push('CONFIG.ENEMIES.' + type + '.speed = ' + def.speed + ' — must be a positive finite number');
    if(!(Number.isFinite(def.radius) && def.radius > 0)) problems.push('CONFIG.ENEMIES.' + type + '.radius = ' + def.radius + ' — must be a positive finite number');
  }

  // EVOLUTIONS — every source and target tower must actually exist
  for(const sourceType of Object.keys(EVOLUTIONS)){
    if(!towerTypes.includes(sourceType)) problems.push('EVOLUTIONS.' + sourceType + ' — source tower not in CONFIG.TOWERS');
    const branches = EVOLUTIONS[sourceType];
    for(const stat of Object.keys(branches)){
      const branch = branches[stat];
      if(!towerTypes.includes(branch.target)) problems.push('EVOLUTIONS.' + sourceType + '.' + stat + '.target = "' + branch.target + '" — not in CONFIG.TOWERS');
      if(!(Number.isFinite(branch.threshold) && branch.threshold > 0)) problems.push('EVOLUTIONS.' + sourceType + '.' + stat + '.threshold = ' + branch.threshold + ' — must be a positive finite number');
    }
  }

  // CA074 — see HISTORY.md § [1.5.7] Code Archaeology, CA074
  const validElements = Object.values(ATTUNEMENTS);
  for(const baseType of Object.keys(SPECIALIZATIONS)){
    if(!BASE_ATTUNABLE_TYPES.includes(baseType)) problems.push('SPECIALIZATIONS.' + baseType + ' — not in BASE_ATTUNABLE_TYPES');
    const branches = SPECIALIZATIONS[baseType];
    for(const element of Object.keys(branches)){
      if(!validElements.includes(element)) problems.push('SPECIALIZATIONS.' + baseType + '.' + element + ' — not a valid attunement element');
      const target = branches[element];
      if(!towerTypes.includes(target)) problems.push('SPECIALIZATIONS.' + baseType + '.' + element + ' = "' + target + '" — not in CONFIG.TOWERS');
    }
  }

  // CA075 — see HISTORY.md § [1.5.7] Code Archaeology, CA075
  for(const baseType of Object.keys(HYBRID_SPECIALIZATIONS)){
    if(!BASE_ATTUNABLE_TYPES.includes(baseType)) problems.push('HYBRID_SPECIALIZATIONS.' + baseType + ' — not in BASE_ATTUNABLE_TYPES');
    const branches = HYBRID_SPECIALIZATIONS[baseType];
    for(const pairKey of Object.keys(branches)){
      const parts = pairKey.split('+');
      const expectedKey = parts.length === 2 ? [...parts].sort().join('+') : null;
      if(parts.length !== 2 || !validElements.includes(parts[0]) || !validElements.includes(parts[1]) || pairKey !== expectedKey){
        problems.push('HYBRID_SPECIALIZATIONS.' + baseType + '.' + pairKey + ' — not two valid attunement elements in sorted-order "A+B" form');
      }
      const target = branches[pairKey];
      if(!towerTypes.includes(target)) problems.push('HYBRID_SPECIALIZATIONS.' + baseType + '.' + pairKey + ' = "' + target + '" — not in CONFIG.TOWERS');
    }
  }

  // SPLIT_CHILD_TYPE — parent and child must both exist as enemy types
  for(const parentType of Object.keys(SPLIT_CHILD_TYPE)){
    if(!enemyTypes.includes(parentType)) problems.push('SPLIT_CHILD_TYPE.' + parentType + ' — parent not in CONFIG.ENEMIES');
    const childType = SPLIT_CHILD_TYPE[parentType];
    if(!enemyTypes.includes(childType)) problems.push('SPLIT_CHILD_TYPE.' + parentType + ' = "' + childType + '" — child not in CONFIG.ENEMIES');
  }

  // CLASS_ARCHETYPE — every keyed tower must exist
  for(const type of Object.keys(CLASS_ARCHETYPE)){
    if(!towerTypes.includes(type)) problems.push('CLASS_ARCHETYPE.' + type + ' — not in CONFIG.TOWERS');
  }

  // STARTER_TOWER_TYPES / EVOLVED_TOWER_TYPES — every listed type must exist
  for(const type of STARTER_TOWER_TYPES) if(!towerTypes.includes(type)) problems.push('STARTER_TOWER_TYPES contains "' + type + '" — not in CONFIG.TOWERS');
  for(const type of EVOLVED_TOWER_TYPES) if(!towerTypes.includes(type)) problems.push('EVOLVED_TOWER_TYPES contains "' + type + '" — not in CONFIG.TOWERS');
  // CA076 — see HISTORY.md § [1.5.7] Code Archaeology, CA076
  for(const type of EVOLVED_TOWER_TYPES){
    if(!UNLOCKABLE_TOWER_TYPES.includes(type)) problems.push('"' + type + '" is in EVOLVED_TOWER_TYPES but missing from UNLOCKABLE_TOWER_TYPES/TOWER_UNLOCK_SOURCE_BY_TARGET — it would never appear in the Build tray at all, locked or unlocked');
  }
  // CA077 — see HISTORY.md § [1.5.7] Code Archaeology, CA077
  const KNOWN_UNREACHABLE_LEGACY_TYPES = ['PROTON','DARK_MATTER','QUASAR']; // element states, deliberately never buildable — see their own comments above TOWER_UNLOCK_SOURCE_BY_TARGET
  for(const type of towerTypes){
    if(STARTER_TOWER_TYPES.includes(type) || isProducerType(type) || EVOLVED_TOWER_TYPES.includes(type) || KNOWN_UNREACHABLE_LEGACY_TYPES.includes(type) || HACK_TOWER_TYPES.includes(type)) continue;
    problems.push('CONFIG.TOWERS.' + type + ' is not in STARTER_TOWER_TYPES, EVOLVED_TOWER_TYPES, or KNOWN_UNREACHABLE_LEGACY_TYPES — it has no known path to ever being built, on purpose or by accident');
  }

  // CA078 — see HISTORY.md § [1.5.7] Code Archaeology, CA078
  for(const type of MAX_ONE_PER_BOARD_TYPES) if(!towerTypes.includes(type)) problems.push('MAX_ONE_PER_BOARD_TYPES contains "' + type + '" — not in CONFIG.TOWERS');
  for(const type of SCALING_COST_TYPES) if(!towerTypes.includes(type)) problems.push('SCALING_COST_TYPES contains "' + type + '" — not in CONFIG.TOWERS');
  for(const type of SCALING_COST_TYPES) if(MAX_ONE_PER_BOARD_TYPES.includes(type)) problems.push('"' + type + '" is in both SCALING_COST_TYPES and MAX_ONE_PER_BOARD_TYPES — contradictory');

  // FOOTSTEP_WEIGHT — every keyed enemy type must exist
  for(const type of Object.keys(FOOTSTEP_WEIGHT)){
    if(!enemyTypes.includes(type)) problems.push('FOOTSTEP_WEIGHT.' + type + ' — not in CONFIG.ENEMIES');
  }

  // CA079 — see HISTORY.md § [1.5.7] Code Archaeology, CA079
  for(const type of towerTypes){
    if(!isStructureType(type) && !JOB_QUOTES[type]) problems.push('JOB_QUOTES is missing an entry for "' + type + '" — that tower would spawn with no quip at all');
  }

  // CA080 — see HISTORY.md § [1.5.7] Code Archaeology, CA080
  for(const type of EVOLVED_TOWER_TYPES){
    if(!TOWER_STRATEGY[type]) problems.push('TOWER_STRATEGY is missing an entry for "' + type + '" — its aura box would render empty');
  }

  if(problems.length){
    throw new Error('validateGameDefinitions() found ' + problems.length + ' problem(s):\n' + problems.map(p => '  - ' + p).join('\n'));
  }
}
// DESIGN-CONTRACT-01 (1.6.74) — see HISTORY.md § [1.6.74]
const POLE_MIN_CONTRAST_RATIO = 3;
const PATH_TILE_MIN_SATURATION = 0.45;
const MIN_PATH_BUILDABLE_MARGIN = 1;
const MAX_PATH_BUILDABLE_MARGIN = 1;
const MAX_PATH_PEBBLE_TILE_CHANCE = 0.65;
const MAX_STARTER_DETAIL_TILES = 2;
function hexToRgbChannels(hex){
  const digits = hex.replace('#', '');
  return [parseInt(digits.slice(0,2), 16), parseInt(digits.slice(2,4), 16), parseInt(digits.slice(4,6), 16)];
}
function relativeLuminanceOfHex(hex){
  const linear = hexToRgbChannels(hex).map(channel => {
    const unit = channel/255;
    return unit <= 0.03928 ? unit/12.92 : Math.pow((unit + 0.055)/1.055, 2.4);
  });
  return 0.2126*linear[0] + 0.7152*linear[1] + 0.0722*linear[2];
}
function contrastRatioOfHex(hexA, hexB){
  const lighter = Math.max(relativeLuminanceOfHex(hexA), relativeLuminanceOfHex(hexB));
  const darker = Math.min(relativeLuminanceOfHex(hexA), relativeLuminanceOfHex(hexB));
  return (lighter + 0.05) / (darker + 0.05);
}
function saturationOfHex(hex){
  const channels = hexToRgbChannels(hex);
  const highest = Math.max(...channels), lowest = Math.min(...channels);
  return highest === 0 ? 0 : (highest - lowest) / highest;
}
function countMissingPathBorderTiles(){
  let missing = 0;
  for(const key of pathCells){
    const [pathX, pathY] = key.split(',').map(Number);
    for(let dx=-PATH_BUILDABLE_MARGIN; dx<=PATH_BUILDABLE_MARGIN; dx++){
      for(let dy=-PATH_BUILDABLE_MARGIN; dy<=PATH_BUILDABLE_MARGIN; dy++){
        const neighborX = pathX + dx, neighborY = pathY + dy;
        if(neighborX < 0 || neighborX >= COLS || neighborY < 0 || neighborY >= ROWS) continue;
        if(pathCells.has(neighborX+','+neighborY) || dirtTileKeys.has(neighborX+','+neighborY)) continue;
        if(!isInActiveRegion(neighborX, neighborY)) missing++;
      }
    }
  }
  return missing;
}
// Checked once the starting barricade has been placed: a new game must begin with exactly one Barricade on the
// finish tile at full health (STARTING-BARRICADE-01). It went missing twice because nothing noticed.
function validateStartingBarricade(){
  const problems = [];
  const barricades = towerPool.filter(tower => tower.active && tower.type === 'BARRICADE');
  const finishTile = pathWaypointTiles[pathWaypointTiles.length - 1];
  if(barricades.length !== 1) problems.push('a new game must start with exactly 1 barricade, found ' + barricades.length + ' (STARTING-BARRICADE-01)');
  else if(barricades[0].gridX !== finishTile.x || barricades[0].gridY !== finishTile.y) problems.push('the starting barricade must sit on the finish tile (STARTING-BARRICADE-01)');
  else if(barricades[0].hp !== barricades[0].maxHp) problems.push('the starting barricade must start at full health (STARTING-BARRICADE-01)');
  return problems;
}
function reportPathBorderProblems(){
  designContractProblems = designContractProblems.filter(problem => !problem.startsWith('path border'));
  const missingBorderTiles = countMissingPathBorderTiles();
  if(!missingBorderTiles) return;
  const message = 'path border: ' + missingBorderTiles + ' tile(s) touching the route are not buildable green (PATH-BORDER-01)';
  designContractProblems.push(message);
  console.warn(message);
}
function validateRangeBalance(){
  const problems = [];
  if(attackRateFromDex(0)!==1 || attackRateFromDex(250)!==1.5 || attackRateFromDex(500)!==3) problems.push('DEX cadence must develop gradually toward 500 (RATE-CURVE-01).');
  const cakeRecipe=FIRE_RECIPES.find(r=>r.id==='WEDDING_CAKE');
  if(!cakeRecipe || cakeRecipe.ingredients.filter(id=>id==='HONEY').length!==5 || BERRY_FOOD_IDS.some(id=>cakeRecipe.ingredients.filter(v=>v===id).length!==2) || lookupItemDef('WEDDING_CAKE_SLICE').cookedStats.int!==lookupItemDef('WEDDING_CAKE').cookedStats.int/4) problems.push('Wedding cake needs two of each berry and five honey; slices retain quarter value (CAKE-SHARING-01).');
  if(!String(applyFoodItem).includes("i<3") || !String(applyFoodItem).includes("foodDef.id==='WEDDING_CAKE'") || !String(updateCampfireCooking).includes('wood--') || chanceStructureSpawnChance('CAMPFIRE')!==0) problems.push('Campfires are built, consume shared wood gradually, and cake leaves three slices (CAMPFIRE-COOKING-02).');

  if(document.getElementById('inspLuckRow') || ['inspHpStatVal','inspDefVal','inspAtkVal','inspCritVal','inspSpeedVal','inspRangeVal'].some(id => !document.getElementById(id)?.parentElement?.title)) problems.push('Combat stats explain their meanings on hover and Luck is removed (STAT-TOOLTIPS-01).');
  const startsByRole = {}, capsByRole = {};
  for(const [type, def] of Object.entries(CONFIG.TOWERS)){
    const startingRange = def.tiers[0].range;
    if(type === 'BARRICADE' || !(startingRange > 0)) continue;
    const role = rangeRoleOf(type);
    if(!role){ problems.push(type + ' has no range role; give it an archetype or a RANGE_ROLE_OVERRIDES entry (RANGE-BALANCE-01)'); continue; }
    const band = RANGE_BANDS[role];
    const rangeCap = RANGE_CAPS[type];
    if(!(rangeCap > 0)){ problems.push(type + ' has no RANGE_CAPS entry, so its cap would silently default to double its start (RANGE-BALANCE-01)'); continue; }
    if(startingRange < band.start[0] || startingRange > band.start[1]) problems.push(type + ' starting range ' + startingRange + ' is outside the ' + role + ' band ' + band.start[0] + '-' + band.start[1] + ' (RANGE-BALANCE-01)');
    const capFloor=type==='NINJA' ? 230 : band.cap[0];
    if(rangeCap < capFloor || rangeCap > band.cap[1]) problems.push(type + ' range cap ' + rangeCap + ' is outside the ' + role + ' band ' + capFloor + '-' + band.cap[1] + ' (RANGE-BALANCE-01)');
    if(startingRange / rangeCap > band.maxStartShareOfCap) problems.push(type + ' starts at ' + Math.round(startingRange/rangeCap*100) + '% of its cap; ' + role + ' towers must start at most ' + Math.round(band.maxStartShareOfCap*100) + '% so range grows with INT (RANGE-BALANCE-01)');
    const tierRanges = def.tiers.map(tier => tier.range);
    for(let i=1; i<tierRanges.length; i++) if(tierRanges[i] < tierRanges[i-1]) problems.push(type + ' tier ranges must not shrink (RANGE-BALANCE-01)');
    if(Math.max(...tierRanges) > rangeCap) problems.push(type + ' has a tier range above its cap (RANGE-BALANCE-01)');
    (startsByRole[role] = startsByRole[role] || []).push(startingRange);
    (capsByRole[role] = capsByRole[role] || []).push(rangeCap);
  }
  // MELEE-RANGE-BALANCE-01 (1.6.108): reach hierarchy owner asked for. Spearman out-reaches Axeman, and Cleric then Pope out-reach every
  // melee class, at every tier and at the INT cap.
  const tierRangeOf = (type, tierIndex) => CONFIG.TOWERS[type].tiers[tierIndex].range;
  const meleeLineage = ['SWORDSMAN','HAMMERMAN','PALADIN','BERSERKER','AXEMAN','SPEARMAN','LANCER'];
  for(let tierIndex = 0; tierIndex < 3; tierIndex++){
    if(tierRangeOf('SPEARMAN', tierIndex) <= tierRangeOf('AXEMAN', tierIndex)) problems.push('Spearman must out-reach Axeman at tier ' + (tierIndex+1) + ' (MELEE-RANGE-BALANCE-01)');
    for(const meleeType of meleeLineage){
      if(tierRangeOf('CLERIC', tierIndex) <= tierRangeOf(meleeType, tierIndex)) problems.push('Cleric must out-reach ' + meleeType + ' at tier ' + (tierIndex+1) + ' (MELEE-RANGE-BALANCE-01)');
    }
    if(tierRangeOf('POPE', tierIndex) < tierRangeOf('CLERIC', tierIndex)) problems.push('Pope must reach at least as far as Cleric at tier ' + (tierIndex+1) + ' (MELEE-RANGE-BALANCE-01)');
  }
  if(RANGE_CAPS.SPEARMAN <= RANGE_CAPS.AXEMAN) problems.push('Spearman range cap must exceed Axeman (MELEE-RANGE-BALANCE-01)');
  for(const meleeType of meleeLineage) if(RANGE_CAPS.CLERIC <= RANGE_CAPS[meleeType]) problems.push('Cleric range cap must exceed ' + meleeType + ' (MELEE-RANGE-BALANCE-01)');
  if(RANGE_CAPS.POPE < RANGE_CAPS.CLERIC) problems.push('Pope range cap must be at least Cleric (MELEE-RANGE-BALANCE-01)');
  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  if(startsByRole.MELEE && startsByRole.RANGED && startsByRole.CASTER){
    if(!(average(startsByRole.MELEE) < average(startsByRole.RANGED) && average(startsByRole.RANGED) < average(startsByRole.CASTER))) problems.push('average starting range must run melee < archer types < mage style (RANGE-BALANCE-01)');
    if(!(Math.max(...capsByRole.MELEE) < Math.min(...capsByRole.RANGED))) problems.push('every melee cap must be below every archer-type cap (RANGE-BALANCE-01)');
    if(!(Math.max(...capsByRole.RANGED) <= Math.min(...capsByRole.CASTER))) problems.push('every mage-style cap must reach at least the longest archer-type cap (RANGE-BALANCE-01)');
  }
  return problems;
}
/* =========================================================
   OBJECT POOLS
   ========================================================= */
function acquireActive(pool){
  // CA170 — see HISTORY.md § [1.5.7] Code Archaeology, CA170
  for(let i=0; i<pool.length; i++){
    if(!pool[i].active) return pool[i];
  }
  return null;
}
/* =========================================================
   ECONOMY: GOLD, WOOD, MARKET AND BUILD COSTS
   ========================================================= */
let gold = 150, lives = 100;
// GOLD-SINKS-01 (1.7.49): owner asked for more places to sink gold. Three new Shop sections: a Market of rations (+2 STR, INT or DEX for the selected stickman, eaten at once, the price
// rising with every one bought), a Training Yard (experience for the selected stickman, the price rising too) and a Travelling Merchant whose three gear items change every wave.
const RATION_BASE_COST = 150, RATION_COST_GROWTH = 1.18, RATION_STAT_GAIN = 2;
const DRILL_BASE_COST = 60, DRILL_COST_GROWTH = 1.12, DRILL_XP_MULTIPLIER = 3;
const MERCHANT_STOCK_SIZE = 3, MERCHANT_BASE_PRICE = { UNCOMMON: 300, RARE: 800, EPIC: 2000 };
const RATIONS = [ { stat: 'str', name: 'Meat Ration', icon: '🥩' }, { stat: 'int', name: 'Fruit Ration', icon: '🍇' }, { stat: 'dex', name: 'Veggie Ration', icon: '🥔' } ];
let marketBought = { str: 0, int: 0, dex: 0 }, drillsBought = 0, merchantBoughtWave = -1, merchantBoughtIds = new Set();
function rationCost(stat){ return Math.round(RATION_BASE_COST * Math.pow(RATION_COST_GROWTH, marketBought[stat] || 0)); }
function drillCost(){ return Math.round((DRILL_BASE_COST + 10*waveIndex) * Math.pow(DRILL_COST_GROWTH, drillsBought)); }
function merchantStock(){
  const rng = createSeededRandom(waveSeedFor(waveRunSeed, waveIndex) ^ 0xA5A5A5);
  const stock = [];
  for(let n = 0; n < MERCHANT_STOCK_SIZE; n++){
    const roll = rng(), rarity = roll < 0.6 ? 'UNCOMMON' : roll < 0.95 ? 'RARE' : 'EPIC';
    const pool = DROP_ITEMS.filter(item => item.rarity === rarity);
    if(!pool.length) continue;
    const def = pool[Math.floor(rng()*pool.length)];
    stock.push({ def, cost: Math.round(MERCHANT_BASE_PRICE[rarity] * (1 + waveIndex*0.02)) });
  }
  return stock;
}
function buyRation(stat){
  const tower = selectedTower;
  if(!tower || !tower.active || isStructureType(tower.type) || tower.type === 'HACKER') return false;
  const cost = rationCost(stat);
  if(gold < cost) return false;
  if(Math.min(STAT_EFFECT_CAP - (tower[stat] || 0), STAT_TOTAL_CAP - getTrainedStatTotal(tower)) <= 0){ showToast(stat.toUpperCase() + ' is already at its limit for this stickman'); playSound('ui_deny'); return false; } // never charge for nothing
  gold -= cost; marketBought[stat] = (marketBought[stat] || 0) + 1;
  const granted = grantStatPoints(tower, stat, RATION_STAT_GAIN);
  spawnFloatingText(tower.x, tower.y - 30, stat.toUpperCase() + ' +' + granted, '#ffb74d'); playSound('item_eat', tower.x, undefined, tower.y);
  updateInspectPanel(); updateHUD();
  return true;
}
function buyDrill(){
  const tower = selectedTower;
  if(!tower || !tower.active || isStructureType(tower.type) || tower.type === 'HACKER') return false;
  const cost = drillCost();
  if(gold < cost) return false;
  gold -= cost; drillsBought++;
  const xp = foodFruitXp() * DRILL_XP_MULTIPLIER; gainTowerExp(tower, xp);
  spawnFloatingText(tower.x, tower.y - 30, 'XP +' + xp, '#7dd3fc'); playSound('click');
  updateInspectPanel(); updateHUD();
  return true;
}
function buyMerchantItem(index){
  const tower = selectedTower; if(!tower || !tower.active) return false;
  if(merchantBoughtWave !== waveIndex){ merchantBoughtWave = waveIndex; merchantBoughtIds = new Set(); }
  const offer = merchantStock()[index];
  if(!offer || merchantBoughtIds.has(index) || gold < offer.cost) return false;
  const priced = Object.create(offer.def, { cost: { value: offer.cost, enumerable: true, writable: true } }); // the item definitions are frozen, so the price is set as an own property
  if(!tower.buyItem(priced)) return false;
  merchantBoughtIds.add(index); awardMedal('TRADER'); playSound('click'); updateInspectPanel(); updateHUD();
  return true;
}
let livesBought = 0; // count of lives purchased this run — drives the exponential buy-life cost curve
function buyLifeCost(){ return Math.round(30 * Math.pow(1.6, livesBought)); }
let wood = 0, stone = 0;
// CA209 — see HISTORY.md § [1.5.7] Code Archaeology, CA209
let freeBarricadesLeft = 0;
const MAX_FREE_BARRICADES = 3;
// CA211 — see HISTORY.md § [1.5.7] Code Archaeology, CA211
function currentBuildCost(type){
  const base = CONFIG.TOWERS[type].baseCost;
  if(!SCALING_COST_TYPES.includes(type)) return base;
  return Math.round(base * Math.pow(SCALING_COST_GROWTH, towerCountOnBoard(type)));
}
// CA212 — see HISTORY.md § [1.5.7] Code Archaeology, CA212
function isTowerTypeAvailable(type){
  if(!MAX_ONE_PER_BOARD_TYPES.includes(type) && !UNLOCKABLE_TOWER_TYPES.includes(type)) return true; // SPECIAL-ONE-01 (1.8.40): every special stickman, not only a few, is limited to one on the board
  return towerCountOnBoard(type) === 0;
}
// BARRICADE-COST-01 (1.6.110) — see HISTORY.md § [1.6.110]
const BARRICADE_COST_BASE_WOOD = 90, BARRICADE_COST_BASE_STONE = 45, BARRICADE_COST_GROWTH = 1.9;
function currentBarricadeCost(){
  const growth = Math.pow(BARRICADE_COST_GROWTH, Math.max(0, towerCountOnBoard('BARRICADE') - 1));
  return { wood: Math.round(BARRICADE_COST_BASE_WOOD * growth), stone: Math.round(BARRICADE_COST_BASE_STONE * growth) };
}
function producerBuildCost(type){
  const base = PRODUCER_DEFS[type].build, growth = Math.pow(PRODUCER_COST_GROWTH, towerCountOnBoard(type));
  return { gold: Math.round(base.gold*growth), wood: Math.round(base.wood*growth), stone: Math.round(base.stone*growth) };
}
function canAffordProducerCost(cost){ return gold >= cost.gold && wood >= cost.wood && stone >= cost.stone; }
function producerUpgradeCost(tower){ return PRODUCER_DEFS[tower.type].upgrades[tower.level - 1] || null; }
function producerCostLabel(cost){ return [cost.gold > 0 ? '💰' + cost.gold : '', '🪵' + cost.wood, '🪨' + cost.stone].filter(Boolean).join(' '); }
function canAffordTower(type){
  if(hackFreeBuild && type !== 'BARRICADE') return true;
  if(isProducerType(type)) return canAffordProducerCost(producerBuildCost(type));
  if(type === 'BARRICADE'){
    if(freeBarricadesLeft > 0) return true;
    const bc = currentBarricadeCost();
    return wood >= bc.wood && stone >= bc.stone;
  }
  return gold >= currentBuildCost(type);
}
/* =========================================================
   SETTINGS, CLOCKS, WIND AND PREFERENCES
   ========================================================= */
function initialGraphicsQuality(environment){
  if(environment.softwareRendering !== false) return 'low';
  return /nvidia|geforce|quadro|radeon|\bamd\b|\bintel\b|apple|adreno|mali|powervr|vivante|tegra/i.test(environment.gpuRenderer) ? 'high' : 'low';
}
// RENDER-ENV-DIAG-01 (1.6.120) — see HISTORY.md § [1.6.120]
const renderEnvironment = { gpuRenderer: 'not read yet', softwareRendering: null, battery: 'unavailable', energySaverHint: '' };
let graphicsQuality = initialGraphicsQuality(renderEnvironment); // 'high' | 'low' — chosen on the start screen, controls DPR cap + skips a few glow layers
// PERF-02 (1.6.9) — see HISTORY.md § [1.6.9]. Adaptive detail reduction under heavy on-screen
// load, independent of the player's own graphicsQuality choice. Measured (not guessed): a real
const HEAVY_VISUAL_LOAD_ENEMY_THRESHOLD = 40;
let underHeavyVisualLoad = false;
let heavyVisualLoadHoldUntil = 0; // ADAPTIVE-HOLD-REALTIME-01 (1.7.36): the hold is measured in real time, not frames, so a slow screen no longer keeps reduced detail on three times as long
const HEAVY_VISUAL_LOAD_DEPTH_SORT_MS = 8;
const HEAVY_VISUAL_LOAD_HOLD_MS = 750;
function refreshHeavyVisualLoadState(){
  const enemyLoad = (perfStats.visibleEnemies || 0) >= HEAVY_VISUAL_LOAD_ENEMY_THRESHOLD;
  const loadNow = performance.now();
  if(enemyLoad || perfStats.lastDepthSortedMs >= HEAVY_VISUAL_LOAD_DEPTH_SORT_MS) heavyVisualLoadHoldUntil = loadNow + HEAVY_VISUAL_LOAD_HOLD_MS;
  underHeavyVisualLoad = enemyLoad || loadNow < heavyVisualLoadHoldUntil || renderScaleStep > 0 || (gameSpeed >= 5 && loadNow-lastCameraInteractionAt < CAMERA_MOTION_FULL_RATE_MS);
  if(perfStats.lastDepthSortedMs >= HEAVY_VISUAL_LOAD_DEPTH_SORT_MS) perfStats.depthSortPressureFrames++;
  if(underHeavyVisualLoad) perfStats.adaptiveVisualFrames++;
}
let hacksEnabled = false; // gameplay option in Settings > Game: unlocks the Hacker stickman and his developer menu
let hackGodMode = false, hackFreeBuild = false, hacksUsed = false;
let bloodDropletsEnabled = true; // BLOOD-DROPLETS-OPTION-01 (1.7.137)
let goreMode = true; // optional blood-and-gore effects, enabled by default and controlled in Settings > Game
// INTRO-TEXT-01 (1.6.84) — see HISTORY.md § [1.6.84]. Folded into the existing localStorage-based
// prefs system (sticktd:prefs:v1) rather than a second, cookie-specific mechanism: every other toggle
// already persists this way and cookies offer no real advantage in a same-origin single-page game.
let introTextEnabled = true;
// CA213 — see HISTORY.md § [1.5.7] Code Archaeology, CA213
const BLOOD_ON_HIT_CHANCE = 0.7;
let showZoomControls = false; // on-screen +/-/reset buttons — off by default since pinch/scroll zoom already works; opt-in for anyone who prefers explicit buttons
let debugOverlay = false; // Debug mode: FPS, entity counts, wave phase, decal load and version — for useful screenshots/videos
let autoCameraPans = true; // camera moves itself to a killstreak holder; opt-out in Settings > Video
let showFpsCounter = false; // small live FPS readout overlay, opt-in — separate from the full debug log, for players who just want a quick glance during play
let screenShakeUserSet = false;
// REDUCED-MOTION-01 (1.6.153) — see HISTORY.md § [1.6.153]. A player whose system asks for reduced motion starts with screen shake off and without the enemy hop and lean; the shake setting still overrides the default.
const PREFERS_REDUCED_MOTION = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let screenShakeEnabled = false;
let autoRenderScaleEnabled = true, autoRenderScaleUserSet = false, lowFpsOfferAnswered = false;
let renderScaleFloorPercent = 75, renderScaleFloorUserSet = false;
let renderScaleStep = 0; // gore-kill impact shake — opt-out for anyone sensitive to camera shake/motion
let gameSpeed = 1; // 1x / 2x / 3x / 5x / 10x fast-forward, cycled via the HUD button
const MAX_SIMULATION_TICKS_PER_FRAME = 8; // base catch-up budget at 1x; scale it with gameSpeed so fast-forward does not silently run at 1x
const MAX_SIMULATION_SPEED_MULTIPLIER = 10; // must match the highest supported SPEED_LEVELS entry
let gameTime = 0;  // advances by FIXED_DT per physics tick — used for swing-animation timing so it speeds up with gameSpeed
let realTime = 0;  // advances by actual elapsed wall-clock ms, NOT scaled by gameSpeed — decal (blood) aging uses this instead of gameTime, so running at 3x/10x speed doesn't make blood fade faster in real time
// PAN-CLOCK-01 (1.7.124): the clock every automatic camera pan and the drag coast run on. It follows real time but never advances more than CAMERA_CLOCK_MAX_STEP_MS in one frame, so a long frame (a recorded clip shows 60-100 ms gaps mid-pan) shows the camera continuing from where it was instead of jumping 40-80 px ahead.
const CAMERA_CLOCK_MAX_STEP_MS = 24;
let cameraPanClock = 0;
let presentationTime = 0; // advances every rendered PLAYING frame, including between waves — drives transient presentation (death animations) that must finish even while realTime is frozen
let realTimeFrozen = false; // true while waveState is IDLE (between waves) — blood shouldn't age at all during the rest period between rounds
// CA214 — see HISTORY.md § [1.5.7] Code Archaeology, CA214
let windStrength = 0;
let windTarget = 0;
let windRetargetTimer = 0;
let windCeilingForWave = 0.15; // set fresh each round in startNextWave() — see there for the actual progression curve
let windDirAngle = Math.random()*Math.PI*2;
let windDirTarget = windDirAngle;
let windDirRetargetTimer = 0;
function updateWind(dt){
  windRetargetTimer -= dt;
  if(windRetargetTimer <= 0){
    windRetargetTimer = 6000 + Math.random()*9000; // a new target every 6-15s — noticeably slower/more gradual than before
    const maxStep = 0.35; // how far a single retarget can reach from wherever wind currently is — never a jump straight from calm to a full gust
    const step = (Math.random()*2 - 1) * maxStep;
    windTarget = clampNum(windStrength + step, 0, windCeilingForWave);
  }
  windStrength += (windTarget - windStrength) * Math.min(1, dt/4500); // slower ease than before — a gentler, more gradual build/fade rather than a quick slide
  windDirRetargetTimer -= dt;
  if(windDirRetargetTimer <= 0){
    windDirRetargetTimer = 8000 + Math.random()*10000;
    windDirTarget = windDirAngle + (Math.random()*2-1)*(Math.PI*0.6); // direction drifts by up to ~110°, never spins instantly to face the opposite way
  }
  let diff = windDirTarget - windDirAngle;
  while(diff > Math.PI) diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  windDirAngle += diff * Math.min(1, dt/6000);
}
// CA215 — see HISTORY.md § [1.5.7] Code Archaeology, CA215
function windMissPenalty(tower){
  const archetype = CLASS_ARCHETYPE[tower.type];
  if(archetype !== 'ARCHER' && archetype !== 'MAGE') return 0;
  let penalty = windStrength * 0.25; // up to +25 percentage points of miss chance at max wind
  if(archetype === 'MAGE') penalty += windStrength * windStrength * 0.15;
  return penalty;
}
// CAMERA-SMOOTH-01 (1.6.156) — see HISTORY.md § [1.6.156]. Moving the camera (drag pan, glide after release, zoom, pinch, tower follow, wave-start pan) always renders at the screen's full
// refresh rate, whatever the frame-rate limit says. The limit exists to save power while watching; at 30 FPS a pan reads as lag, which is what the owner reported after the limit
// became the default on Low graphics. A contract check fails if the main loop stops consulting isCameraMotionActive().
const CAMERA_MOTION_FULL_RATE_MS = 400;
let lastCameraInteractionAt = -1e9, cameraMotionFullRateFrames = 0;
function markCameraInteraction(){ lastCameraInteractionAt = performance.now(); }
function isCameraMotionActive(now){
  if(now - lastCameraInteractionAt < CAMERA_MOTION_FULL_RATE_MS) return true;
  if(panInertia.active || waveStartCameraPan || (roundEnemyFollow && roundEnemyFollow.enemy) || (cameraFollow && cameraFollow.phase === 'panning')) return true;
  return isDragging && activePointers.size > 0;
}
const IS_MOBILE_DEVICE = (navigator.maxTouchPoints > 0) && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); // MOBILE-CAP-FINE-POINTER-01 (1.6.127) — see HISTORY.md § [1.6.127]. A touch laptop or desktop with a mouse or trackpad is not a phone
let frameCapEnabled = true, frameCapFpsUser = null; // FRAME-CAP-01 (1.6.128) — see HISTORY.md § [1.6.128]
const FRAME_CAP_MIN_FPS = 30, FRAME_CAP_MAX_FPS = 250, FRAME_CAP_EARLY_TOLERANCE_MS = 2;
// MOBILE-LOCK-30-01 (1.7.110) — see HISTORY.md § [1.7.110]: a phone is detected once at boot (touch, coarse pointer, no fine pointer) and always runs at a steady 30 FPS, even when the camera moves; a computer follows the graphics setting (60 on High, 30 on Low) and keeps full-rate camera motion. A frame rate the player sets in Settings still wins.
const MOBILE_FRAME_CAP_FPS = 30;
function defaultFrameCapFps(){ return IS_MOBILE_DEVICE ? MOBILE_FRAME_CAP_FPS : graphicsQuality === 'high' ? 60 : 30; }
function frameCapFps(){ return frameCapFpsUser !== null ? frameCapFpsUser : defaultFrameCapFps(); }
function frameCapIntervalMs(){ return frameCapEnabled ? 1000 / frameCapFps() : 0; }
let isMuted = false;
// CA216 — see HISTORY.md § [1.5.7] Code Archaeology, CA216
let decalBudgetOverride = null;
let builtTowerTypesThisSession = new Set(); // which tower types have been built this session — see the tower_built GA event
const extendedDiagnostics = { workloadOver33:0, workloadOver50:0, workloadOver100:0, gapOver33:0, gapOver50:0, gapOver100:0, decalRebuilds:{count:0,totalMs:0,maxMs:0,lastMs:0,lastStamps:0,over8ms:0}, saves:[], deaths:[], transitions:[], context:[], lastContextAt:-Infinity, lastContextKey:'' };
const PREFS_KEY = 'sticktd:prefs:v1';
// RUN-SEED-01 (1.8.26): every run is built from a short code. A code typed in Settings > Game is used once for the next run; otherwise a random one is made and shown on the end screen, so any run can be replayed.
const RUN_SEED_KEY = 'sticktd:seed:v1';
function hashSeedText(text, salt){
  let hash = (2166136261 ^ salt) >>> 0;
  for(let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash >>> 0;
}
const runSeedCode = (function(){
  let typed = '';
  try{ typed = (localStorage.getItem(RUN_SEED_KEY) || '').trim().toUpperCase().slice(0, 24); localStorage.removeItem(RUN_SEED_KEY); }catch(err){ /* storage unavailable: a random code is used */ }
  return typed || Math.random().toString(36).slice(2, 8).toUpperCase();
})();
function runSeedFor(salt){ return hashSeedText(runSeedCode, salt); }
function savePrefs(){
  const started = performance.now();
  try{
    const payload = JSON.stringify({ manualRenderScaleStep:!autoRenderScaleEnabled ? renderScaleStep : undefined, graphicsQuality, goreMode, bloodDropletsEnabled, hacksEnabled, isMuted, audioMasterVolume, audioMusicVolume, audioSfxVolume, showFpsCounter, screenShakeEnabled, screenShakeUserSet, frameCapEnabled, frameCapFps: frameCapFpsUser === null ? undefined : frameCapFpsUser, autoRenderScaleEnabled, autoRenderScaleChoiceMade: autoRenderScaleUserSet ? true : undefined, lowFpsOfferAnswered, renderScaleFloorPercent: renderScaleFloorUserSet ? renderScaleFloorPercent : undefined, debugOverlay, autoCameraPans, medalNotificationsEnabled, decalBudgetOverride });
    const jsonDone = performance.now();
    localStorage.setItem(PREFS_KEY,payload);
    retainDiagnostic(extendedDiagnostics.saves,{time:new Date().toISOString(),kind:'preferences',success:true,jsonMs:jsonDone-started,writeMs:performance.now()-jsonDone,codeUnits:payload.length},20);
  }catch(e){
    retainDiagnostic(extendedDiagnostics.saves,{time:new Date().toISOString(),kind:'preferences',success:false,elapsedMs:performance.now()-started,error:String(e && e.name || 'storage error').slice(0,80)},20);
  }
}
function loadPrefs(){
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(p.graphicsQuality === 'high' || p.graphicsQuality === 'low') graphicsQuality = p.graphicsQuality;
    if(typeof p.goreMode === 'boolean') goreMode = p.goreMode;
    if(typeof p.bloodDropletsEnabled === 'boolean') bloodDropletsEnabled = p.bloodDropletsEnabled;
    if(typeof p.hacksEnabled === 'boolean') hacksEnabled = p.hacksEnabled;
    if(typeof p.introTextEnabled === 'boolean') introTextEnabled = p.introTextEnabled;
    if(typeof p.isMuted === 'boolean') isMuted = p.isMuted;
    if(Number.isFinite(p.audioMasterVolume)) audioMasterVolume = clampNum(p.audioMasterVolume, 0, 1);
    if(Number.isFinite(p.audioMusicVolume)) audioMusicVolume = clampNum(p.audioMusicVolume, 0, 1);
    if(Number.isFinite(p.audioSfxVolume)) audioSfxVolume = clampNum(p.audioSfxVolume, 0, 1);
    if(typeof p.showFpsCounter === 'boolean') showFpsCounter = p.showFpsCounter;
    if(typeof p.debugOverlay === 'boolean') debugOverlay = p.debugOverlay;
    if(typeof p.autoCameraPans === 'boolean') autoCameraPans = p.autoCameraPans;
    if(typeof p.medalNotificationsEnabled === 'boolean') medalNotificationsEnabled = p.medalNotificationsEnabled;
    if(typeof p.screenShakeEnabled === 'boolean'){ screenShakeEnabled = p.screenShakeEnabled; screenShakeUserSet = true; }
    else screenShakeEnabled = graphicsQuality === 'high' && !PREFERS_REDUCED_MOTION;
    if(typeof p.frameCapEnabled === 'boolean') frameCapEnabled = p.frameCapEnabled;
    if(Number.isFinite(p.frameCapFps)) frameCapFpsUser = clampNum(Math.round(p.frameCapFps), FRAME_CAP_MIN_FPS, FRAME_CAP_MAX_FPS);
    if(typeof p.lowFpsOfferAnswered === 'boolean') lowFpsOfferAnswered = p.lowFpsOfferAnswered;
    if(p.autoRenderScaleChoiceMade === true){ autoRenderScaleEnabled = !!p.autoRenderScaleEnabled; autoRenderScaleUserSet = true; }
    else if(p.autoRenderScaleEnabled === true) autoRenderScaleEnabled = true;
    else autoRenderScaleEnabled = graphicsQuality === 'low' && !lowFpsOfferAnswered;
    if([25, 50, 75, 100].includes(p.renderScaleFloorPercent)){ renderScaleFloorPercent = p.renderScaleFloorPercent; renderScaleFloorUserSet = true; }
    else renderScaleFloorPercent = graphicsQuality === 'high' ? 100 : 75;
    if(!autoRenderScaleEnabled && renderScaleStep !== 0){ renderScaleStep = 0; try{ localStorage.removeItem('stickTD_renderStep'); }catch(err){ /* storage unavailable */ } }
    if(graphicsQuality === 'low' && !autoRenderScaleEnabled && Number.isInteger(p.manualRenderScaleStep) && p.manualRenderScaleStep >= 0 && p.manualRenderScaleStep <= 3) renderScaleStep = p.manualRenderScaleStep;
    if(Number.isFinite(p.decalBudgetOverride) && p.decalBudgetOverride >= 0) decalBudgetOverride = p.decalBudgetOverride;
  }catch(e){ /* corrupted or unavailable — fall back to the existing defaults above */ }
}
loadPrefs();
// CA217 — see HISTORY.md § [1.5.7] Code Archaeology, CA217
function syncPrefsToDOM(){
  const gfxHigh = document.getElementById('gfxHighRadio');
  const gfxLow = document.getElementById('gfxLowRadio');
  if(gfxHigh && gfxLow){
    (graphicsQuality === 'high' ? gfxHigh : gfxLow).checked = true;
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.toggle('selected', b.dataset.quality === graphicsQuality));
  }
  const muteToggle = document.getElementById('settingsMuteToggle');
  if(muteToggle) muteToggle.checked = isMuted;
  syncAudioVolumeControls();
  const goreToggleSettings = document.getElementById('settingsGoreToggle');
  if(goreToggleSettings) goreToggleSettings.checked = goreMode;
  document.getElementById('settingsBloodDropletsToggle').checked = bloodDropletsEnabled;
  { const hacksToggleSettings = document.getElementById('settingsHacksToggle'); if(hacksToggleSettings) hacksToggleSettings.checked = hacksEnabled; }
}
// CA218 — see HISTORY.md § [1.5.7] Code Archaeology, CA218
(function syncDecalBudgetToDOM(){
  const sel = document.getElementById('settingsDecalBudget');
  const customInput = document.getElementById('settingsDecalBudgetCustom');
  if(!sel || !customInput) return;
  const presets = [700, 4200, 2100, 1500, 2500];
  function applyFromControls(){
    if(sel.value === 'custom'){
      customInput.classList.remove('hidden');
      const v = parseInt(customInput.value, 10);
      decalBudgetOverride = Number.isFinite(v) && v >= 0 ? v : decalBudgetOverride;
    } else {
      customInput.classList.add('hidden');
      decalBudgetOverride = parseInt(sel.value, 10);
    }
    enforceDecalCapacity();maintainSprayDecals();
    if(settledDecalRebuildPending) rebuildSettledDecalCanvas();
    savePrefs();requestPausedRedraw();
  }
  if(presets.includes(decalBudgetOverride)){
    sel.value = String(decalBudgetOverride);
    customInput.classList.add('hidden');
  } else if(Number.isFinite(decalBudgetOverride)){
    sel.value = 'custom';
    customInput.value = decalBudgetOverride;
    customInput.classList.remove('hidden');
  } else {
    // CA219 — see HISTORY.md § [1.5.7] Code Archaeology, CA219
    sel.value = graphicsQuality === 'low' ? '700' : '4200';
  }
  sel.addEventListener('change', applyFromControls);
  customInput.addEventListener('input', applyFromControls);
})();
/* =========================================================
   RUN STATE, GROUND ITEMS AND LOOT
   ========================================================= */
let waveIndex = 0;          // number of waves started
let freeExpansionOwed = 0; // CLEAN-WAVE-EXPAND-01 (1.7.135): earned only when no escaped enemies remain at wave end; missed bonuses are never queued
// EXPAND-PER-WAVE-01 (1.7.75): owner decision, replacing EXPAND-AFTER-CLEAR-01 (every enemy defeated first) and UNLIMITED-EXPANSION-01. EXPAND-MID-WAVE-01 (1.7.126): owner decision, expanding is also allowed while a wave is in progress (the route extension already shifts every live enemy's path index); it never needs an empty field, so a loose enemy no longer blocks it. The player may buy ONE expansion per wave (PAID_EXPANSIONS_PER_WAVE), and a wave ending with no escaped enemies still alive gives its own free one.
const PAID_EXPANSIONS_PER_WAVE = 1;
function expansionBlockedReason(){
  if(paidExpansionWaveIndex === waveIndex && PAID_EXPANSIONS_PER_WAVE <= 1) return 'one per wave';
  return '';
}
let waveState = 'IDLE';     // IDLE (between waves, Next Wave available) | SPAWNING (activeWavePlan dispatching outcome-gated batches, see advanceWaveDispatch()) | ACTIVE (fully spawned, waiting for anyAlive to go false — see the ACTIVE->IDLE transition in update() for wave-complete rewards). No separate CLEARING/RESULTS/COUNTDOWN states exist — the round-start "3-2-1-GO" overlay (drawWaveCountdown()) and the wave-summary popup are both TRANSIENT presentation layered on top of SPAWNING/the ACTIVE->IDLE instant, not additional waveState values of their own.
let everBuiltFighter = false; // true the moment the player has ever had an active non-Barricade tower — see checkAllFightersDown(), which uses this to distinguish "wiped mid-wave" from "hasn't built anything yet"
let waveStartGold = 0;      // gold snapshot taken when a wave starts, for the wave-end summary popup's gold-gained readout
let seenEnemyTypes = new Set(); // enemy types the player has already been shown a "new enemy" popup for
let anyBarricadeQueued = false; // set by updateBarricadesAndPileup() each frame — when true, wave spawning pauses (see update()) so new enemies don't keep piling onto an already-backed-up queue
let barricadeQueueStartedAt = 0; // when the current unbroken stretch of congestion began — drives the 15s force-resume safety valve so spawning can never pause permanently, even if the player has no way left to break the jam
let waveTimer = 0, countdownBeatPlayed = -1, countdownMusicStage = 0;
// CA221 — see HISTORY.md § [1.5.7] Code Archaeology, CA221
const sessionStartRealTime = Date.now();
// CA222 — see HISTORY.md § [1.5.7] Code Archaeology, CA222
let tabHiddenCount = 0, tabLastHiddenAt = 0, tabLastShownAt = 0, tabTotalHiddenMs = 0;
// CA223 — see HISTORY.md § [1.5.7] Code Archaeology, CA223
let totalPausedMs = 0;
let pauseStartedAtReal = null;
let stealthRun=false;
let stealthSantaSpawned=false;
let stealthSantaDefeated=false;
let stealthEncounterEnding=false;
let gameState = 'START';    // START | PLAYING | GAME_OVER | VICTORY
let selectedBuildType = null;
// CA224 — see HISTORY.md § [1.5.7] Code Archaeology, CA224
let groundItems = []; // { id, x, y, itemDef, spawnTime } — dropped items sitting on the map, waiting to be dragged onto a tower
const MAX_GROUND_ITEMS = 24; // a real, previously-missing cap — nothing evicted this before; over a genuinely long session with uncollected drops this grew without bound
const GROUND_ITEM_LIFESPAN = 300000;
const FOOD_ITEM_LIFESPAN = 120000; // INVENTORY-CONSUMABLES-01 (1.6.110) — see HISTORY.md § [1.6.110]
const TREAT_ITEM_LIFESPAN = 150000;
function groundItemLifespan(gi){ return gi.itemDef.isGoldBag ? gi.goldBagLifespanMs : gi.itemDef.isStim ? TREAT_ITEM_LIFESPAN : gi.itemDef.isTreat ? TREAT_ITEM_LIFESPAN : (gi.itemDef.isFood || gi.itemDef.isHutLoot) ? FOOD_ITEM_LIFESPAN : GROUND_ITEM_LIFESPAN; }
let lastGroundItemSweep = 0;
// ITEM-LOG-01 (1.6.132) — see HISTORY.md § [1.6.132]. Every item is a per-copy instance of its shared definition, so one copy can be followed from the moment it is found to the moment it is used or lost.
const ITEM_LOG_LIMIT = 300;
const itemLog = [];
const itemLogByInstance = new Map();
function itemLogClock(ms){ const totalSeconds = Math.max(0, Math.floor(ms/1000)); return Math.floor(totalSeconds/60) + ':' + String(totalSeconds % 60).padStart(2, '0'); }
function itemHolderLabel(tower){ return tower.type + '#' + tower.id; }
function makeItemInstance(itemDef, source){
  if(Object.prototype.hasOwnProperty.call(itemDef, 'instanceId')) return itemDef;
  const instance = Object.create(itemDef);
  instance.instanceId = idCounter++;
  const record = { instanceId: instance.instanceId, name: itemDef.name, source: source || 'unknown', foundAtMs: presentationTime, foundWave: waveIndex, holder: null, heldSinceMs: 0, segments: [], usedAtMs: null, usedWave: null, usedBy: null, outcome: 'on the ground' };
  itemLog.push(record);
  itemLogByInstance.set(instance.instanceId, record);
  if(itemLog.length > ITEM_LOG_LIMIT) itemLogByInstance.delete(itemLog.shift().instanceId);
  return instance;
}
function itemLogHeldBy(instance, tower){
  const record = itemLogByInstance.get(instance.instanceId);
  if(!record) return;
  record.holder = itemHolderLabel(tower); record.heldSinceMs = presentationTime; record.outcome = 'held';
}
function itemLogReleased(instance, outcome){
  const record = instance ? itemLogByInstance.get(instance.instanceId) : undefined;
  if(!record) return;
  if(record.holder){ record.segments.push({ unit: record.holder, ms: presentationTime - record.heldSinceMs }); record.holder = null; }
  record.outcome = outcome;
}
function itemLogUsed(instance, tower){
  const record = itemLogByInstance.get(instance.instanceId);
  if(!record) return;
  record.usedAtMs = presentationTime; record.usedWave = waveIndex; record.usedBy = itemHolderLabel(tower);
  itemLogReleased(instance, 'used');
}
function itemLogHeldMs(record){
  let total = record.holder ? presentationTime - record.heldSinceMs : 0;
  for(const segment of record.segments) total += segment.ms;
  return total;
}
function itemLogReport(){
  const counts = { held: 0, used: 0, ground: 0, expired: 0, other: 0 };
  for(const record of itemLog){
    if(record.outcome === 'held') counts.held++; else if(record.outcome === 'used') counts.used++; else if(record.outcome === 'on the ground') counts.ground++; else if(record.outcome.startsWith('expired')) counts.expired++; else counts.other++;
  }
  let text = 'ITEM LOG (last ' + itemLog.length + ' items: ' + counts.used + ' used, ' + counts.held + ' held, ' + counts.ground + ' on the ground, ' + counts.expired + ' expired, ' + counts.other + ' other)\n';
  text += '---------------------------------------------------------------------------------------------\n';
  text += '  clock is real time since the page opened (m:ss); held = time inside a stickman\'s slots\n';
  for(const record of itemLog){
    const units = record.segments.map(segment => segment.unit + ' ' + Math.round(segment.ms/1000) + 's');
    if(record.holder) units.push(record.holder + ' ' + Math.round((presentationTime - record.heldSinceMs)/1000) + 's (now)');
    text += '  #' + record.instanceId + ' ' + record.name + ' | found ' + itemLogClock(record.foundAtMs) + ' wave ' + record.foundWave + ' (' + record.source + ')' +
      ' | held ' + Math.round(itemLogHeldMs(record)/1000) + 's' + (units.length ? ' by ' + units.join(', ') : '') +
      ' | ' + (record.usedAtMs === null ? 'not used' : 'used ' + itemLogClock(record.usedAtMs) + ' wave ' + record.usedWave + ' by ' + record.usedBy) +
      ' | ' + record.outcome + '\n';
  }
  return text;
}
// GAME-EVENT-LOG-01 (1.6.132) — see HISTORY.md § [1.6.132]
const GAME_EVENT_LOG_LIMIT = 200;
const gameEventLog = [];
function logGameEvent(text){
  gameEventLog.push({ atMs: presentationTime, wave: waveIndex, text });
  if(gameEventLog.length > GAME_EVENT_LOG_LIMIT) gameEventLog.shift();
}
function gameEventReport(){
  let text = 'GAME EVENT LOG (last ' + gameEventLog.length + ' events; clock is real time since the page opened)\n';
  text += '---------------------------------------------------------------------------------------------\n';
  for(const gameEvent of gameEventLog) text += '  ' + itemLogClock(gameEvent.atMs) + '  wave ' + gameEvent.wave + '  ' + gameEvent.text + '\n';
  return text;
}
let groundItemsRestoring = false;
function pickItemLandingPoint(x, y){
  for(let attempt = 0; attempt < 14; attempt++){
    const angle = Math.random()*Math.PI*2, distance = 30 + Math.random()*46;
    const lx = x + Math.cos(angle)*distance, ly = y + Math.sin(angle)*distance*0.85;
    const gx = Math.floor(lx/TILE_SIZE), gy = Math.floor(ly/TILE_SIZE);
    if(pathCells.has(gx+','+gy) || !isInActiveRegion(gx, gy)) continue;
    return { x: lx, y: ly };
  }
  return { x, y }; // no grass spot found: the item stays where it dropped, never on an invalid tile
}
// LOOT-RARITY-SOUND-01 (1.8.57): Rare, Epic and Legendary gear announce themselves with a rising chime of 2, 3 or 4 notes, so the rarity is heard before it is read (Diablo's ring-drop sound).
const LOOT_DROP_SOUND_TIERS = { RARE: 2, EPIC: 3, LEGENDARY: 4 };
function spawnGroundItem(x, y, itemDef, source){
  if(groundItems.length >= MAX_GROUND_ITEMS){
    // CA225 — see HISTORY.md § [1.5.7] Code Archaeology, CA225
    let oldestIdx = -1, oldestTime = Infinity;
    for(let i = 0; i < groundItems.length; i++){
      if(!canEvictGroundItem(groundItems[i])) continue;
      if(groundItems[i].spawnTime < oldestTime){ oldestTime = groundItems[i].spawnTime; oldestIdx = i; }
    }
    if(oldestIdx !== -1){ creditGroundBagGold(groundItems[oldestIdx]); itemLogReleased(groundItems[oldestIdx].itemDef, 'removed: ground item limit'); groundItems.splice(oldestIdx, 1); }
  }
  // ITEM-ARC-01 (1.7.44): owner decision — dropped items fly out in an arc and land at a random spot around where they dropped, preferably on grass and off the road, so they do not
  // cover the path. Items restored from a save, and the very first frame of a loaded game, appear in place.
  const landing = groundItemsRestoring ? { x, y } : pickItemLandingPoint(x, y); // reduced-motion players still land on grass, only the flight is skipped
  const item = { id: idCounter++, x: landing.x, y: landing.y, itemDef: makeItemInstance(itemDef, source), spawnTime: presentationTime, driftAt: presentationTime + ITEM_DRIFT_DELAY_MIN_MS + Math.random()*ITEM_DRIFT_DELAY_SPREAD_MS };
  if(!PREFERS_REDUCED_MOTION && (landing.x !== x || landing.y !== y)){ item.flyFromX = x; item.flyFromY = y; item.flyStart = presentationTime; item.flyDur = 520; }
  if(item.itemDef.isGoldBag) item.goldBagLifespanMs = GOLD_BAG_LIFESPAN_MS;
  groundItems.push(item);
  const lootTier = LOOT_DROP_SOUND_TIERS[item.itemDef.rarity];
  if(lootTier && !groundItemsRestoring) playSound('loot_drop', landing.x, lootTier, landing.y); // LOOT-RARITY-SOUND-01 (1.8.57)
  maybeShowItemGuide();
  return item;
}
// LOOT-TABLE-01 (1.6.99): supply = common (fruit, coin pouches), tonic = uncommon (potions, meat, vegetables,
// purses, training scrolls), gear = rare (equipment, see ITEM_RARITIES). Picks are made lazily so the food and
// hut-loot tables above can be declared in any order.
const LOOT_SUPPLY_SOURCES = [
  { weight: 70, pick: () => pickFoodOfKind('FRUIT') },
  { weight: 30, pick: () => HUT_LOOT_ITEMS[0] }
];
const LOOT_TONIC_SOURCES = [
  { weight: 45, pick: () => pickFromList(LOOT_TONIC_ITEMS) },
  { weight: 25, pick: () => pickFoodOfKind('MEAT') },
  { weight: 10, pick: () => pickFoodOfKind('VEGETABLE') },
  { weight: 20, pick: () => pickFromList([HUT_LOOT_ITEMS[1], HUT_LOOT_ITEMS[2]]) }
];
let lootWaveTracked = -1, lootRegularDropsThisWave = 0;
const FIRST_MAP_DROP_KILL = 5;
const FIRST_MAP_SCROLL_ITEM = Object.freeze({ id: 'FIRST_MAP_SCROLL', name: 'Map', icon: '🗺️', rarity: 'SPECIAL', isMapScroll: true, cost: 0, isDropOnly: true });
// ONE-KIND-OF-BAG-01 (1.7.43): owner decision — there is only one kind of bag, the normal gold bag, and it has a luck roll: about one bag in a hundred lets a Map fall out when it is opened.
// The separate "map bag" item (id GOLD_MAP_BAG) and its 1 in 250 enemy drop are gone; a saved one from an older version loads as a Map.
const MAP_FROM_BAG_CHANCE = 0.01, LEGACY_MAP_BAG_ID = 'GOLD_MAP_BAG';
function rollMapFromBag(x, y){
  if(Math.random() >= MAP_FROM_BAG_CHANCE || groundItems.length >= MAX_GROUND_ITEMS) return false;
  spawnGroundItem(x + (Math.random()-0.5)*20, y - 10, FIRST_MAP_SCROLL_ITEM, 'gold bag');
  showToast('A map fell out of the bag! Click it for a free expansion.');
  trackGameEvent('item_dropped', { item: FIRST_MAP_SCROLL_ITEM.id, rarity: FIRST_MAP_SCROLL_ITEM.rarity, enemy_type: 'gold_bag' });
  return true;
}
let firstTenEnemyKillCount = 0, firstMapScrollDropped = false;
function pickFromList(list){ return list[Math.floor(Math.random() * list.length)]; }
function pickFoodOfKind(kindName){ return pickFromList(FOOD_ITEMS.filter(item => item.kind === kindName)); }
function pickWeighted(entries){
  let roll = Math.random() * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for(const entry of entries){ roll -= entry.weight; if(roll < 0) return entry; }
  return entries[entries.length - 1];
}
function regularLootCapForWave(){
  return Math.min(LOOT_REGULAR_DROP_CAP_MAX, LOOT_REGULAR_DROP_CAP_BASE + Math.floor(waveIndex / 10) * LOOT_REGULAR_DROP_CAP_PER_10_WAVES);
}
function rollRegularLootItem(enemy, category){
  if(category === 'supply') return { category, item: pickWeighted(LOOT_SUPPLY_SOURCES).pick() };
  if(category === 'tonic') return { category, item: pickWeighted(LOOT_TONIC_SOURCES).pick() };
  const signatureId = ENEMY_SIGNATURE_DROPS[enemy.type];
  const useSignature = signatureId && Math.random() < SIGNATURE_SHARE_OF_GEAR_DROPS;
  return { category, item: useSignature ? ITEM_BY_ID.get(signatureId) : pickGenericDropItem(rollDropRarity(false)) };
}
// REACH-HINT-01 (1.8.45): a fighter placed where no road tile is within his range gets a one-time hint, shown only after that mistake.
function fighterReachesRoute(tower){
  const reach = tower.range + TILE_SIZE * 0.5;
  for(const tile of pathWaypointTiles) if(Math.hypot((tile.x + 0.5) * TILE_SIZE - tower.x, (tile.y + 0.5) * TILE_SIZE - tower.y) <= reach) return true;
  return false;
}
function hintIfFighterOutOfReach(tower){
  if(!fighterReachesRoute(tower)) showTutorialTipOnce('fighter_out_of_reach', '🎯 Too far from the road to hit anything.');
}
// EARLY-HOOK-01 (1.8.41): clearing the first wave always leaves an Uncommon item beside a stickman, so the player has something to equip before wave 2.
function grantEarlyGift(){
  if(wavesCompleted !== 1) return;
  const holder = towerPool.find(t => t.active && isFighterTower(t));
  const gift = pickGenericDropItem('UNCOMMON');
  if(!holder || !gift) return;
  spawnGroundItem(holder.x + 34, holder.y + 6, gift, 'first wave reward');
  showToast('🎁 First spoils! Drag it onto a stickman.');
}
function dropItemsFromEnemy(enemy){
  if(enemy.isGuardian || enemy.isHutBuilding) return;
  if(!firstMapScrollDropped){
    firstTenEnemyKillCount++;
    if(firstTenEnemyKillCount >= FIRST_MAP_DROP_KILL){
      firstMapScrollDropped = true;
      spawnGroundItem(enemy.x, enemy.y - 8, FIRST_MAP_SCROLL_ITEM, 'early enemy');
      showToast('Map found. Press it for a free expansion.');
      trackGameEvent('item_dropped', { item: FIRST_MAP_SCROLL_ITEM.id, rarity: FIRST_MAP_SCROLL_ITEM.rarity, enemy_type: enemy.type });
    }
  }
  if(Math.random() < 1/500) dropGoldBag(enemy.x + (Math.random()-0.5)*18, enemy.y);
  const tier = enemyDropTier(enemy);
  const dropped = [];
  if(tier === 'BOSS'){
    const guaranteedCount = BOSS_GUARANTEED_COMMON_ROLLS.min + Math.floor(Math.random() * (BOSS_GUARANTEED_COMMON_ROLLS.max - BOSS_GUARANTEED_COMMON_ROLLS.min + 1));
    for(let i = 0; i < guaranteedCount; i++){
      const commonRolled = rollRegularLootItem(enemy, Math.random() < 0.7 ? 'supply' : 'tonic');
      if(commonRolled.item) dropped.push(commonRolled);
    }
    let gearDropped = false;
    const signatureId = ENEMY_SIGNATURE_DROPS[enemy.type];
    if(signatureId && Math.random() < BOSS_SIGNATURE_CHANCE){ dropped.push({ category: 'gear', item: ITEM_BY_ID.get(signatureId) }); gearDropped = true; }
    for(let rollIndex = 0; rollIndex < BOSS_GEAR_ROLLS; rollIndex++){
      if(Math.random() >= BOSS_GEAR_ROLL_CHANCE) continue;
      const generic = pickGenericDropItem(rollDropRarity(true));
      if(generic && !dropped.some(entry => entry.item === generic)){ dropped.push({ category: 'gear', item: generic }); gearDropped = true; }
    }
    if(!gearDropped && bossesSinceGearDrop >= BOSS_BAD_LUCK_LIMIT){
      const pity = signatureId ? ITEM_BY_ID.get(signatureId) : pickGenericDropItem(rollDropRarity(true));
      if(pity){ dropped.push({ category: 'gear', item: pity }); gearDropped = true; }
    }
    bossesSinceGearDrop = gearDropped ? 0 : bossesSinceGearDrop + 1;
  } else {
    if(lootWaveTracked !== waveIndex){ lootWaveTracked = waveIndex; lootRegularDropsThisWave = 0; }
    if(lootRegularDropsThisWave >= regularLootCapForWave()) return;
    const killRoll = Math.random();
    const killCategory = killRoll < LOOT_KILL_ODDS.gear ? 'gear' : killRoll < LOOT_KILL_ODDS.gear + LOOT_KILL_ODDS.tonic ? 'tonic' : killRoll < LOOT_KILL_ODDS.gear + LOOT_KILL_ODDS.tonic + LOOT_KILL_ODDS.supply ? 'supply' : null;
    if(!killCategory) return;
    const rolled = rollRegularLootItem(enemy, killCategory);
    if(!rolled.item) return;
    lootRegularDropsThisWave++;
    dropped.push(rolled);
  }
  for(let i=0; i<dropped.length; i++){
    const { category, item } = dropped[i];
    const spread = dropped.length > 1 ? (i - (dropped.length-1)/2) * 22 : 0;
    if(item.isHutLoot && item.kind === 'gold'){ dropGoldBag(enemy.x + spread, enemy.y); continue; } // COIN-ITEM-BAG-01 (1.6.116) — see HISTORY.md § [1.6.116]
    spawnGroundItem(enemy.x + spread, enemy.y - 6, item, 'enemy ' + enemy.type);
    trackGameEvent('item_dropped', { item: item.id, rarity: item.rarity || category.toUpperCase(), enemy_type: enemy.type });
    if(item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY') showToast(item.icon + ' ' + ITEM_RARITIES[item.rarity].label + ' item: ' + item.name);
    else if(category === 'tonic') showToast(item.icon + ' ' + item.name + ' dropped!');
  }
}
// The first item a player ever sees opens a one-time guide that explains items and the inventory.
let itemGuideShownThisPage = false, itemGuidePausedGame = false;
function maybeShowItemGuide(){
  if(itemGuideShownThisPage) return;
  let alreadySeen = false;
  try{ alreadySeen = !!localStorage.getItem(ITEM_GUIDE_SEEN_KEY); }catch(err){ /* storage unavailable: show once per page load */ }
  if(alreadySeen || !introTextEnabled) return;
  itemGuideShownThisPage = true;
  try{ localStorage.setItem(ITEM_GUIDE_SEEN_KEY, '1'); }catch(err){ /* storage unavailable: nothing to remember */ }
  showToast('Drag items onto a stickman. Press consumables to use.');
  trackGameEvent('item_guide_shown', {});
}
function closeItemGuide(){
  document.getElementById('item-guide-modal').classList.add('hidden');
  if(itemGuidePausedGame){ itemGuidePausedGame = false; resumeGame(); }
  playSound('ui_close');
}
/* =========================================================
   ITEM DRAG, SELECTION AND MARKED TARGET
   ========================================================= */
let draggingGroundItem = null; // the ground item currently being dragged, or null
let dragItemPos = { x:0, y:0 }; // current world-space position of the item while dragging, for rendering it under the cursor
// ITEM-MOVE-01 (1.6.104) — see HISTORY.md § [1.6.104]. A dragged ground item can be set down anywhere on the map,
// but only inside the reach (targeting range circle) of at least one fighting stickman. Outside every circle the
// item slides to the nearest point on the closest circle's edge; with no stickman to reach it, it cannot move.
const ITEM_DROP_SNAP_RADIUS=16;
function itemDropTargetAt(point){
  let nearest=null,nearestDistSquared=ITEM_DROP_SNAP_RADIUS*ITEM_DROP_SNAP_RADIUS;
  for(const tower of towerPool){
    if(!tower.active || (isStructureType(tower.type) && !isVaultType(tower.type))) continue;
    // HEAD-SNAP-01 (1.7.36): the whole stickman counts, so hovering over the head snaps as readily as hovering over the body.
    const dx=tower.x-point.x,dy=tower.y-point.y,dyHead=tower.y-28-point.y,dyTorso=tower.y-12-point.y;
    const distanceSquared=Math.min(dx*dx+dy*dy, dx*dx+dyHead*dyHead, dx*dx+dyTorso*dyTorso);
    if(distanceSquared<nearestDistSquared){nearest=tower;nearestDistSquared=distanceSquared;}
  }
  return nearest;
}
function draggedItemPositionAt(point,item){
  const target=itemDropTargetAt(point);
  if(target)return {x:target.x,y:target.y};
  const free=clampToItemReach(point,activeItemReachCircles(),item);
  if(isLooseWalkableAt(free.x,free.y))return free;
  const fallback=dragItemPos || item;
  return {x:fallback.x,y:fallback.y};
}
function activeItemReachCircles(){
  const circles = [];
  for(const tower of towerPool){
    if(!tower.active || isStructureType(tower.type)) continue;
    circles.push({ x: tower.x, y: tower.y, r: tower.targetingRange });
  }
  return circles;
}
// ITEM-BOUNDS-01 (1.6.116) — see HISTORY.md § [1.6.116]
function clampToItemReach(point, circles, fallback){
  if(!circles.length) return { x: fallback.x, y: fallback.y };
  let best = null, bestGap = Infinity;
  for(const circle of circles){
    const dx = point.x - circle.x, dy = point.y - circle.y;
    const distance = Math.hypot(dx, dy);
    if(distance <= circle.r) return { x: point.x, y: point.y };
    const gap = distance - circle.r;
    if(gap < bestGap){
      bestGap = gap;
      best = { x: circle.x + dx / distance * circle.r, y: circle.y + dy / distance * circle.r };
    }
  }
  return best;
}
let selectedTower = null;
let inspPanelExpanded = false; // compact (name/level/basic stats) by default; full options behind an explicit button
let idCounter = 1;
// TARGET-MARK-01 (1.6.94) — see HISTORY.md § [1.6.94]. One global marked target at a time (enemy or
// livestock). Every tower's findTarget() gives it absolute priority while it is within that tower's
// range, ahead of normal scoring, so the player can hand-pick a threat — or point every tower at a
// wandering animal to have it hunted down for its meat. Clicking a different valid target moves the
// mark; clicking empty space, or the mark dying, clears it.
let markedTargetEnemy = null;
// LAG-PASS-02 (1.6.144) — see HISTORY.md § [1.6.144]. Whether lane enemies or a fightable wanderer exist is remembered between ticks instead of rescanned every tick:
// it is refreshed when an enemy spawns, a wanderer dies, the marked target changes, or the lane loop finds no lane enemy left to update.
let enemyPresenceDirty = true, laneEnemiesPresent = false, targetableWandererPresent = false;
function setMarkedTarget(enemy){
  markedTargetEnemy = enemy;
  enemyPresenceDirty = true;
  if(enemy && enemy.type === 'BEE') awardMedal('BEE_WATCHER');
  if(enemy) trackGameEvent('target_marked', { target_type: enemy.isLivestock ? 'livestock' : 'enemy', enemy_type: enemy.type });
}
function tryMarkTargetAt(worldX, worldY){
  let closest = null, closestDistance = Infinity;
  for(const e of enemyPool){
    if(!e.active || e.escaped) continue;
    if(!isWithinEmojiSquare(worldX, worldY, e.x, e.y, e.radius*2)) continue; // the enemy emoji is drawn at radius*2 px
    const distance = Math.hypot(e.x-worldX, e.y-worldY);
    if(distance < closestDistance){ closestDistance = distance; closest = e; }
  }
  if(closest){ setMarkedTarget(closest); return true; }
  return false;
}
// PIN-PAINTED-TOP-01: cache occupied pixel extrema only when a marked sprite first needs them.
function markedSpritePixels(sprite){
  if(sprite.markedPixels) return sprite.markedPixels;
  const pixels=sprite.getContext('2d').getImageData(0,0,sprite.side,sprite.side).data;
  const edges=[];let tipX=0,tipY=-1;
  for(let x=0;x<sprite.side;x++){
    let top=-1,bottom=-1;
    for(let y=0;y<sprite.side;y++) if(pixels[(y*sprite.side+x)*4+3]>16){if(top<0)top=y;bottom=y;}
    if(top>=0){edges.push(x,top,x,bottom);if(bottom>tipY){tipX=x;tipY=bottom;}}
  }
  return sprite.markedPixels={edges,tipX,tipY};
}
function captureMarkedEmojiTop(ctx,enemy,size){
  if(markedTargetEnemy !== enemy) return;
  const devicePx=size*camera.zoom*dprValue;
  if(!(devicePx>0)){enemy.pinTopDeviceY=undefined;return;}
  const bucket=Math.max(0,Math.ceil(Math.log(devicePx/EMOJI_SPRITE_MIN_PX)/EMOJI_SPRITE_LOG_STEP-1e-6));
  const sprite=emojiSpriteFor(enemy.emoji,bucket),paint=markedSpritePixels(sprite),scale=Math.round(size)/sprite.fontPx,m=ctx.getTransform();
  let top=Infinity;
  for(let i=0;i<paint.edges.length;i+=2){const x=(paint.edges[i]-sprite.side/2)*scale,y=(paint.edges[i+1]-sprite.side/2)*scale;top=Math.min(top,m.b*x+m.d*y+m.f);}
  enemy.pinTopDeviceY=top;enemy.pinCenterDeviceX=m.e;enemy.pinPaintedId=enemy.id;
}
const PIN_TIP_SINK_CSS_PX = 3; // PIN-SINK-01 (1.8.17): the pin's tip sits this many CSS pixels below the painted top of the enemy emoji, so it touches the emoji instead of floating over it
function drawMarkedTargetIcon(ctx){
  const enemy=markedTargetEnemy;
  if(!enemy || !enemy.active || enemy.pinPaintedId!==enemy.id || !Number.isFinite(enemy.pinTopDeviceY)) return;
  const size=Math.round(enemy.radius*1.1+10),devicePx=size*camera.zoom*dprValue;
  const bucket=Math.max(0,Math.ceil(Math.log(devicePx/EMOJI_SPRITE_MIN_PX)/EMOJI_SPRITE_LOG_STEP-1e-6));
  const sprite=emojiSpriteFor('📌',bucket),paint=markedSpritePixels(sprite),scale=size*camera.zoom*dprValue/sprite.fontPx;
  const tipX=(paint.tipX+0.5)*scale,tipY=(paint.tipY+0.5)*scale;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(sprite,enemy.pinCenterDeviceX-tipX,Math.floor(enemy.pinTopDeviceY)+dprValue*PIN_TIP_SINK_CSS_PX-tipY,sprite.side*scale,sprite.side*scale);
  ctx.restore();
}
/* =========================================================
   NOTIFICATIONS, ACTS AND MEDALS
   ========================================================= */
let hoverCell = null; // {gx,gy} - for build-placement snap preview and move-mode snap preview
let hoveredSceneryKey = null; // "gx,gy" of scenery currently hovered/touched — shows its clear price
let wavesCompleted = 0;
let hasUnseenUnlock = false;
let unlockToastTimer = null;
// CA799 — see HISTORY.md § [1.6.63] Wave/unlock toast ordering.
let waveSummaryActive = false;
const pendingToastMessages = [];
const unlockToastEl = document.getElementById('unlock-toast');
const unlockToastTextEl = document.getElementById('unlockToastText');
const notificationHistory = [];
let notificationIdSequence = 0;
function countUnreadNotifications(entries){ return entries.reduce((count, entry) => count + (entry.read ? 0 : 1), 0); }
function markNotificationsRead(entries){ for(const entry of entries) entry.read = true; }
function dismissNotificationEntry(entries, id){ const index = entries.findIndex(entry => entry.id === id); if(index < 0) return false; entries.splice(index, 1); return true; }
function defaultNotificationExplanation(message){
  if(/wave .*complete|survived to wave/i.test(message)) return 'This wave has ended. The summary shows Gold earned and each defender’s combat, XP, and stat gains.';
  if(/new enemy/i.test(message)) return 'A new enemy type has joined the campaign. Its health, movement speed, bounty, and special behavior are shown here.';
  if(/boss|santa approaching/i.test(message)) return 'A boss phase is entering the road. Prepare your defenders before it reaches the base.';
  if(/unlock|evolution/i.test(message)) return 'This defender is now available in Build under Stickmen Defenders.';
  if(/map|expand/i.test(message)) return 'Map growth opens more buildable ground and extends the route. You can buy one expansion per wave, during or between waves.';
  if(/gold|coin|💰/i.test(message)) return 'Gold is player currency. Click a landed coin to collect it immediately; fading gold coins pay automatically when they expire. Gold Bags pay their listed amount when opened.';
  if(/item|found|drop|loot/i.test(message)) return 'This item or reward has appeared in the game. Open the item details or click the pickup to see how to collect it.';
  return 'This notification records a game update. Open the related menu or inspect the board to see its current effect.';
}
function renderNotificationPanel(){
  const list = document.getElementById('notification-list');
  list.textContent = '';
  for(let i = notificationHistory.length-1; i >= 0; i--){
    const entry = notificationHistory[i];
    const row = document.createElement('li');
    row.classList.toggle('unread', !entry.read);
    const copy = document.createElement('div'); copy.className = 'notification-copy';
    const message = document.createElement('button'); message.type = 'button'; message.className = 'notification-message'; message.dataset.notificationId = entry.id; message.setAttribute('aria-haspopup', 'dialog'); message.textContent = entry.message; copy.appendChild(message);
    row.appendChild(copy);
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'notification-dismiss'; dismiss.dataset.notificationId = entry.id; dismiss.setAttribute('aria-label', 'Dismiss notification: ' + entry.message); dismiss.textContent = '×'; row.appendChild(dismiss);
    list.appendChild(row);
  }
  const unread = countUnreadNotifications(notificationHistory);
  document.getElementById('notification-badge').textContent = unread ? ' ' + unread : '';
}
function recordNotification(message, explanation, enemyTypes, always){
  if(!introTextEnabled && !always) return null;
  const entry = { id: ++notificationIdSequence, message: notificationTitle(message), explanation: explanation || (notificationTitle(message) !== message ? message : defaultNotificationExplanation(message)), read: false };
  if(enemyTypes && enemyTypes.length) entry.enemyTypes = enemyTypes.slice();
  notificationHistory.push(entry);
  if(notificationHistory.length > 60) notificationHistory.shift();
  renderNotificationPanel();
  return entry.id;
}
// RUN-PROGRESS-01 (1.8.26): named acts, medals and an end-of-run summary. Medals and the best run are remembered in this browser; acts are announced in Notifications.
const ACT_NAMES = Object.freeze(['The Meadow Road', 'Pinewood Passage', 'Sunburnt Dunes', 'The Long Detour', 'Crow Hill', 'Stonewater Crossing', 'The Hollow Mile', 'Ember Pass', 'The Last Camp', 'The North Road']);
const ACT_NUMERALS = Object.freeze(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);
function actNumberForWave(wave){ return clampNum(Math.ceil(Math.max(1, wave) / 10), 1, ACT_NAMES.length); }
function actTitleForWave(wave){ const act = actNumberForWave(wave); return 'Act ' + ACT_NUMERALS[act - 1] + ' — ' + ACT_NAMES[act - 1]; }
function announceActStart(wave){
  if(wave % 10 !== 1) return;
  recordNotification('🗺️ ' + actTitleForWave(wave), 'A new act begins on wave ' + wave + '. Each act is ten waves long.', undefined, true);
  trackGameEvent('act_started', { act: actNumberForWave(wave), act_name: ACT_NAMES[actNumberForWave(wave) - 1] });
}
const MEDALS_KEY = 'sticktd:medals:v1', BEST_RUN_KEY = 'sticktd:bestrun:v1';
const MEDAL_DEFS = Object.freeze([
  { id:'FIRST_STEPS', icon:'🥉', name:'First Steps', text:'Clear wave 1.' },
  { id:'TEN_DOWN', icon:'🥈', name:'Ten Down', text:'Clear wave 10.' },
  { id:'FLAWLESS_TEN', icon:'🛡️', name:'Flawless Ten', text:'Clear wave 10 without losing a single life.' },
  { id:'QUARTER', icon:'🥇', name:'Quarter Century', text:'Clear wave 25.' },
  { id:'HALFWAY', icon:'🏆', name:'Halfway There', text:'Clear wave 50.' },
  { id:'CENTURY', icon:'👑', name:'Path to Victory', text:'Clear wave 100.' },
  { id:'CARTOGRAPHER', icon:'🗺️', name:'Cartographer', text:'Expand the map five times.' },
  { id:'DIGGER', icon:'🪏', name:'Digger', text:'Dig with a shovel.' },
  { id:'TREASURE', icon:'🧰', name:'Treasure Hunter', text:'Dig up a treasure chest.' },
  { id:'BEE_WATCHER', icon:'🐝', name:'Bee Watcher', text:'Pin a bee.' },
  { id:'HONEY_HOARDER', icon:'🍯', name:'Honey Hoarder', text:'Carry five honey at once.' },
  { id:'ENRAGED', icon:'😡', name:'Seeing Red', text:'Have a stickman fly into a rage.' },
  { id:'HOT_STREAK', icon:'🔥', name:'Hot Streak', text:'Trigger a killstreak.' },
  { id:'CHEF', icon:'🍳', name:'Camp Chef', text:'Start a recipe at a campfire.' },
  { id:'TROLL_SPOTTER', icon:'🧌', name:'Troll Spotter', text:'Meet a wandering troll.' },
  { id:'RINGMASTER', icon:'🎪', name:'Ringmaster', text:'Find a circus beside the road.' },
  { id:'TRADER', icon:'🐪', name:'Trader', text:'Trade with a merchant.' }
]);
let medalNotificationsEnabled = true;
const earnedMedals = new Set();
try{ for(const id of JSON.parse(localStorage.getItem(MEDALS_KEY) || '[]')) if(MEDAL_DEFS.some(def => def.id === id)) earnedMedals.add(id); }catch(err){ /* storage unavailable: medals last for this session */ }
function renderMedalList(){
  const list = document.getElementById('medalList'), summary = document.getElementById('medalSummary');
  if(!list || !summary) return;
  summary.textContent = earnedMedals.size + ' of ' + MEDAL_DEFS.length + ' medals earned.';
  list.textContent = '';
  for(const def of MEDAL_DEFS){
    const row = document.createElement('li');
    row.classList.toggle('unseen', !earnedMedals.has(def.id));
    row.title = def.text;
    row.textContent = (earnedMedals.has(def.id) ? def.icon : '🔒') + ' ' + def.name + ' — ' + def.text;
    list.appendChild(row);
  }
}
function awardMedal(id){
  if(earnedMedals.has(id)) return;
  const def = MEDAL_DEFS.find(medal => medal.id === id);
  if(!def) return;
  earnedMedals.add(id);
  try{ localStorage.setItem(MEDALS_KEY, JSON.stringify([...earnedMedals])); }catch(err){ /* storage unavailable: medals last for this session */ }
  renderMedalList();
  trackGameEvent('medal_earned', { medal: id, medals_total: earnedMedals.size });
  if(medalNotificationsEnabled) recordNotification(def.icon + ' Medal: ' + def.name, def.text, undefined, true);
}
function awardWaveMedals(){
  if(wavesCompleted >= 1) awardMedal('FIRST_STEPS');
  if(wavesCompleted >= 10) awardMedal('TEN_DOWN');
  if(wavesCompleted === 10 && lives >= 100) awardMedal('FLAWLESS_TEN');
  if(wavesCompleted >= 25) awardMedal('QUARTER');
  if(wavesCompleted >= 50) awardMedal('HALFWAY');
  if(wavesCompleted >= 100) awardMedal('CENTURY');
}
let sessionKills = 0, bestKillStreak = 0, runEndedAsBest = false;
// RUN-SHARE-01 (1.8.28): gamers can copy the run seed from the end screen, and players on a storefront build get a button to that storefront's page to rate or comment.
const PLATFORM_RATING_PAGES = Object.freeze({ 'itch.io':'https://sauerninja.itch.io/sticktd', gamejolt:'https://gamejolt.com/games/sticktd/1103755' });
function copyRunSeed(button){
  const done = () => { button.textContent = '✓ Seed copied'; };
  try{ navigator.clipboard.writeText(runSeedCode).then(done, () => { button.textContent = 'Seed ' + runSeedCode; }); }catch(err){ button.textContent = 'Seed ' + runSeedCode; }
}
function describeRunEnd(){
  let best = null;
  try{ best = JSON.parse(localStorage.getItem(BEST_RUN_KEY) || 'null'); }catch(err){ /* storage unavailable: no personal best */ }
  const reached = Math.max(waveIndex, wavesCompleted);
  const isNewBest = !best || !(best.wave >= reached);
  runEndedAsBest = isNewBest;
  if(isNewBest){ try{ localStorage.setItem(BEST_RUN_KEY, JSON.stringify({ wave: reached, kills: sessionKills })); }catch(err){ /* storage unavailable */ } }
  return [
    'Reached wave ' + reached + ' — ' + actTitleForWave(reached),
    sessionKills + ' kills · best streak ' + bestKillStreak,
    isNewBest ? '★ New personal best' : 'Personal best: wave ' + best.wave,
    'Run seed ' + runSeedCode
  ].join('\n');
}
function toggleNotificationPanel(open){
  const panel = document.getElementById('notification-panel');
  const shouldOpen = open === undefined ? panel.classList.contains('hidden') : open;
  panel.classList.toggle('hidden', !shouldOpen);
  if(shouldOpen){
    positionNotificationControls(true);
    if(!towerModalEl.classList.contains('hidden')) closeTowerModal();
    renderNotificationPanel();
  }
}
let notificationPopupPausedGame = false;
function openNotificationEntry(id, overrideEntry){
  const entry = overrideEntry || notificationHistory.find(item => item.id === id);
  if(!entry) return;
  entry.read = true;
  renderNotificationPanel();
  toggleNotificationPanel(false);
  const popup = document.getElementById('notification-detail-popup');
  document.getElementById('notification-detail-title').textContent = entry.message;
  const icon = document.getElementById('notification-detail-icon');
  const enemyTypes = (entry.enemyTypes || []).filter(type => CONFIG.ENEMIES[type] && ENEMY_INFO[type]);
  popup.classList.toggle('enemy-detail', enemyTypes.length > 0);
  icon.hidden = enemyTypes.length === 0;
  icon.textContent = enemyTypes.map(type => CONFIG.ENEMIES[type].emoji).join(' ');
  const copy = document.getElementById('notification-detail-copy');
  copy.textContent = '';
  const reward=pendingRunRewards.find(reward=>reward.wave===entry.rewardWave);
  if(reward){
    icon.hidden=false;icon.textContent='🎁';copy.textContent='Choose one reward for this run. You can close this and decide later.';
    for(const id of reward.ids){
      const def=RUN_REWARD_DEFS[id],button=document.createElement('button');button.type='button';button.className='run-reward-choice';
      const title=document.createElement('strong');title.textContent=def.icon+' '+def.name;button.appendChild(title);
      const detail=document.createElement('span');detail.textContent=runRewardDescription(id,reward.wave);button.appendChild(detail);
      const preview=document.createElement('span');preview.className='run-reward-preview';preview.textContent=runRewardPreview(id,reward.wave);button.appendChild(preview);
      button.addEventListener('click',()=>claimRunReward(reward.wave,id));copy.appendChild(button);
    }
  } else if(enemyTypes.length){
    for(const type of enemyTypes){
      const def = CONFIG.ENEMIES[type], info = ENEMY_INFO[type];
      const card = document.createElement('div'); card.className = 'enemy-detail-card';
      if(enemyTypes.length > 1){ const heading = document.createElement('h3'); heading.textContent = def.emoji + ' ' + info.name; card.appendChild(heading); }
      const stats = document.createElement('div'); stats.className = 'enemy-detail-stats';
      const tiers = (FAMILY_TIER_ELIGIBILITY[type] || [FAMILY_NATIVE_TIER[type] || 'STANDARD']).map(tier => SIZE_TIER_BANDS[tier]);
      const range = values => Math.min(...values) === Math.max(...values) ? String(values[0]) : Math.min(...values) + '–' + Math.max(...values);
      const weightMin = Math.max(0.25,Math.min(...tiers.map(tier => tier.radiusMin))/15).toFixed(2);
      const weightMax = Math.max(0.25,Math.max(...tiers.map(tier => tier.radiusMax))/15).toFixed(2);
      for(const [label,value] of [['❤️ Health (base)',def.baseHp],['💨 Speed (base)',def.speed],['🪙 Gold (base)',def.bounty],['✨ Kill XP',range(tiers.map(tier => tier.xp))],['⚖️ Weight (min–max)',weightMin + '–' + weightMax]]){
        const stat = document.createElement('div'); stat.className = 'enemy-detail-stat';
        const amount = document.createElement('strong'); amount.textContent = String(value); stat.appendChild(amount);
        stat.appendChild(document.createTextNode(label)); stats.appendChild(stat);
      }
      card.appendChild(stats);
      const description = document.createElement('p'); description.textContent = info.desc; card.appendChild(description); copy.appendChild(card);
    }
  } else copy.textContent = entry.explanation;
  if(!popup.open){
    notificationPopupPausedGame = gameState === 'PLAYING';
    stopStatHold();
    if(notificationPopupPausedGame){ recordStateTransition('PAUSED'); gameState = 'PAUSED'; audioEngine.setMusicPaused(true); }
    positionNotificationDetail(popup);
    popup.showModal();
    positionNotificationDetail(popup);
  }
}
function positionNotificationDetail(popup){
  const bell=document.getElementById('notificationBellOpen').getBoundingClientRect();
  const viewport=window.visualViewport;
  const left=viewport ? viewport.offsetLeft : 0, top=viewport ? viewport.offsetTop : 0;
  const width=viewport ? viewport.width : window.innerWidth, height=viewport ? viewport.height : window.innerHeight;
  popup.style.width=Math.min(420,Math.max(0,width-24))+'px';
  const y=Math.max(top+12,Math.min(bell.bottom+8,top+height-100));
  popup.style.left=Math.max(left+12,Math.min(bell.left,left+width-Math.min(420,width-24)-12))+'px';
  popup.style.top=y+'px';popup.style.maxHeight=Math.max(60,top+height-y-12)+'px';
}
window.addEventListener('resize',()=>{const popup=document.getElementById('notification-detail-popup');if(popup.open)positionNotificationDetail(popup);});
if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{const popup=document.getElementById('notification-detail-popup');if(popup.open)positionNotificationDetail(popup);});
const notificationDetailPopup = document.getElementById('notification-detail-popup');
notificationDetailPopup.addEventListener('keydown', e => e.stopPropagation());
notificationDetailPopup.addEventListener('pointerdown', e => e.stopPropagation());
notificationDetailPopup.addEventListener('close', () => {
  if(notificationPopupPausedGame && gameState === 'PAUSED') resumeGame();
  notificationPopupPausedGame = false;
});
document.getElementById('notification-detail-close').addEventListener('click', () => notificationDetailPopup.close());
document.getElementById('runRewardBtn').addEventListener('pointerdown',e=>e.stopPropagation());
document.getElementById('runRewardBtn').addEventListener('click',e=>{e.stopPropagation();openRunReward();});
function notificationTitle(message){
  if(/enemy left the path|breaking off/i.test(message)) return '😡 Enemy aggression';
  if(/enemy escaped.*wandering/i.test(message)) return '🏃 Enemy escaped';
  return message;
}
function bindNotificationPopup(element){
  const open = () => openNotificationEntry(Number(element.dataset.notificationId));
  element.addEventListener('click', e => { if(e.target.closest('#newEnemyCloseBtn')) return; open(); });
  element.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
}
bindNotificationPopup(document.getElementById('unlock-toast'));
bindNotificationPopup(document.getElementById('wave-summary-toast'));
bindNotificationPopup(document.getElementById('new-enemy-details'));
bindNotificationPopup(document.getElementById('killstreak-banner'));
document.getElementById('notificationBellOpen').addEventListener('click', () => toggleNotificationPanel());
document.getElementById('notification-close').addEventListener('click', () => toggleNotificationPanel(false));
document.getElementById('notification-read-all').addEventListener('click', () => { markNotificationsRead(notificationHistory); renderNotificationPanel(); });
document.getElementById('notification-list').addEventListener('click', e => {
  const dismiss = e.target.closest('button.notification-dismiss[data-notification-id]');
  if(dismiss){ dismissNotificationEntry(notificationHistory, Number(dismiss.dataset.notificationId)); renderNotificationPanel(); return; }
  const button = e.target.closest('button.notification-message[data-notification-id]');
  if(!button) return;
  const entry = notificationHistory.find(item => item.id === Number(button.dataset.notificationId));
  if(!entry) return;
  openNotificationEntry(entry.id);
});
/* =========================================================
   TOWER UNLOCKS, MOVES AND TOASTS
   ========================================================= */
// MOVE-PER-STICKMAN-01 (1.7.127): free relocations belong to each stickman (`tower.moveCharges`), not to the whole team. Each starts with one and gains one per promotion, per boss kill it lands and per pair of Running Shoes at the start of every round, up to MAX_MOVE_CHARGES.
const MAX_MOVE_CHARGES = 3;
function grantTowerMove(tower, reason){
  if(!tower || !tower.active || tower.moveCharges >= MAX_MOVE_CHARGES) return false;
  tower.moveCharges++;
  spawnFloatingText(tower.x, tower.y - 84, '🔀 +1 move (' + reason + ')', '#ffe082');
  return true;
}
let moveModeTower = null; // set while the player is choosing where to relocate a tower
function isTowerUnlocked(type){
  return wavesCompleted >= CONFIG.TOWERS[type].unlocksAfterWave;
}
// BUILD-UNLOCK-FIX-01 (1.6.6) — see HISTORY.md § [1.6.6]. isTowerUnlocked() is only correct for
// STARTER_TOWER_TYPES (always-available, gated purely by the current session's wavesCompleted).
// Every other tower's real buildability comes from unlockedTowerTypes — a PERMANENT, account-wide
// set that survives across games (via evolution or checkTowerUnlocks()'s own wave-gate scan) — not
// from the current session's live wave count. Using isTowerUnlocked() as a generic "still
// buildable" gate was wrong for any non-starter type: a tower a player already has permanently
// unlocked from a previous playthrough would show correctly as available in the Build menu, but
// silently fail to place until THIS session's wavesCompleted happened to catch back up to that
// tower's own gate — reading as "I select it, tap a tile, and nothing happens." This is the one
// source of truth both the Build menu's display and the actual placement confirm now share.
function isTowerBuildableNow(type){
  if(isProducerType(type)) return true;
  if(HACK_TOWER_TYPES.includes(type)) return hacksEnabled;
  return STARTER_TOWER_TYPES.includes(type) ? isTowerUnlocked(type) : unlockedTowerTypes.has(type);
}
function checkTowerUnlocks(){
  // CA226 — see HISTORY.md § [1.5.7] Code Archaeology, CA226
  const newlyUnlocked = [];
  for(const type in CONFIG.TOWERS){
    const gate = CONFIG.TOWERS[type].unlocksAfterWave;
    if(gate > 0 && wavesCompleted >= gate && !unlockedTowerTypes.has(type)) newlyUnlocked.push(type);
  }
  if(newlyUnlocked.length){
    for(const type of newlyUnlocked) unlockedTowerTypes.add(type);
    savePermanentUnlocks();
    showUnlockToast(newlyUnlocked);
  }
}
// TOAST-QUEUE-01 (1.8.46): a toast waits its turn instead of replacing one still on screen, so messages fired together at a wave clear are each read; every message also stays in the notification inbox.
const TOAST_QUEUE_MAX = 4;
function isToastBusyWithOther(message){ return unlockToastTimer !== null && unlockToastEl.classList.contains('show') && unlockToastTextEl.textContent !== notificationTitle(message); }
function queueToastMessage(message, notificationId){
  if(pendingToastMessages.some(entry => entry.message === message)) return;
  if(pendingToastMessages.length >= TOAST_QUEUE_MAX) pendingToastMessages.shift();
  pendingToastMessages.push({ message, notificationId });
}
function showToast(message, color, explanation, existingNotificationId){
  const notificationId = existingNotificationId || recordNotification(message, explanation);
  if(waveSummaryActive || isToastBusyWithOther(message)){ queueToastMessage(message, notificationId); return; }
  const toast = unlockToastEl;
  unlockToastTextEl.textContent = notificationTitle(message);
  toast.dataset.notificationId = notificationId || '';
  toast.classList.add('show');
  clearTimeout(unlockToastTimer);
  unlockToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    unlockToastTimer = null;
    if(!waveSummaryActive && pendingToastMessages.length){ const next = pendingToastMessages.shift(); showToast(next.message, null, null, next.notificationId); }
  }, 3200);
  playSound('wave');
}
function showUnlockToast(types){
  const names = types.map(t => CONFIG.TOWERS[t].name).join(', ');
  showToast('🎉 New tower unlocked: ' + names);
  playSound('evolution'); // the game's biggest fanfare, previously only reachable from the now-dead evolveInto() — this is the event that actually deserves it now
  hasUnseenUnlock = true;
  refreshTrayUI();
}
function showMilestoneToast(wave){
  showToast('🏆 Survived to Wave ' + wave + '!');
}
function showNewEnemyToast(types){
  const el = document.getElementById('new-enemy-toast');
  const enemyDetails = types.map(type => {
    const def = CONFIG.ENEMIES[type], info = ENEMY_INFO[type];
    return def && info ? info.name + ': ' + def.baseHp + ' health, speed ' + def.speed + ', bounty ' + def.bounty + '. ' + info.desc : '';
  }).filter(Boolean).join('\n');
  document.getElementById('newEnemyTitle').textContent = 'New enemy: ' + types.map(type => (CONFIG.ENEMIES[type]?.emoji || '') + ' ' + (ENEMY_INFO[type]?.name || type)).join(', ');
  const notificationId = recordNotification('New enemy: ' + types.map(type => ENEMY_INFO[type]?.name || type).join(', '), enemyDetails || undefined, types);
  el.dataset.notificationId = notificationId || '';
  document.getElementById('new-enemy-details').dataset.notificationId = notificationId || '';
  el.classList.add('show');
  clearTimeout(showNewEnemyToast._t);
  showNewEnemyToast._t = setTimeout(() => el.classList.remove('show'), 6600); // +20% over the original 5500ms
  playSound('wave');
}
document.getElementById('newEnemyCloseBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  clearTimeout(showNewEnemyToast._t); // prevent a stale timeout from hiding a later toast that fires soon after
  document.getElementById('new-enemy-toast').classList.remove('show');
});
function showWaveSummary(waveNum, goldGained, towerReports){
  const el = document.getElementById('wave-summary-toast');
  // A wave unlock can be announced just before this report opens; defer the toast so the
  // larger summary cannot cover it. Other toasts requested while the summary is open queue too.
  if(unlockToastEl.classList.contains('show')){
    pendingToastMessages.unshift({ message: unlockToastTextEl.textContent, notificationId: Number(unlockToastEl.dataset.notificationId) || null });
    unlockToastEl.classList.remove('show');
    clearTimeout(unlockToastTimer);
    unlockToastTimer = null;
  }
  waveSummaryActive = true;
  const waveSummaryMessage = 'Wave ' + waveNum + ' complete — +' + goldGained + ' Gold';
  const reportDetails = towerReports.slice().sort((a,b) => b.xp - a.xp).map(report => report.name + ': ' + Math.round(report.damage) + ' damage, ' + report.lastHits + ' last hits, ' + report.assists + ' assists, +' + Math.round(report.xp) + ' XP' + (report.statGain ? ', +' + report.statGain + ' stat' : '')).join('\n');
  document.getElementById('wave-summary-toast').dataset.notificationId = recordNotification(waveSummaryMessage, 'Wave ' + waveNum + ' complete. Earned ' + goldGained + ' player Gold.' + (reportDetails ? '\n\nDefender results:\n' + reportDetails : '')) || '';
  document.getElementById('waveSummaryNum').textContent = waveNum;
  el.classList.add('show');
  clearTimeout(showWaveSummary._t);
  showWaveSummary._t = setTimeout(() => {
    el.classList.remove('show');
    waveSummaryActive = false;
    if(pendingToastMessages.length){ const next = pendingToastMessages.shift(); showToast(next.message, null, null, next.notificationId); }
  }, 4500);
}
/* =========================================================
   CLERIC HEALING AND KILLSTREAKS
   ========================================================= */
// CA227 — see HISTORY.md § [1.5.7] Code Archaeology, CA227
function processClericHealing(){
  const clerics = towerPool.filter(t => t.active && (t.type === 'CLERIC' || t.type === 'POPE'));
  if(!clerics.length) return;
  const healedThisRound = new Set();
  for(const cleric of clerics){
    let target = null, bestFrac = Infinity;
    for(const t of towerPool){
      if(!t.active || healedThisRound.has(t) || t.hp >= t.maxHp) continue;
      const frac = t.hp / t.maxHp;
      if(frac < bestFrac){ bestFrac = frac; target = t; }
    }
    if(!target) break; // nothing left on the board that still needs healing
    healedThisRound.add(target);
    const healed = Math.min(target.maxHp - target.hp, cleric.healAmount);
    target.hp += healed;
    spawnFloatingText(target.x, target.y - 34, '+' + healed + ' ✝️', '#ffe9a8');
    spawnParticles(target.x, target.y, '#ffe9a8', 8);
  }
}
// CA228 — see HISTORY.md § [1.5.7] Code Archaeology, CA228
let killstreakHolder = null;
const KILLSTREAK_TIERS = [
  { count:100,  label:'KILLING SPREE' },
  { count:200,  label:'DOMINATING' },
  { count:300,  label:'MEGA KILL' },
  { count:400,  label:'UNSTOPPABLE' },
  { count:500,  label:'WICKED SICK' },
  { count:600,  label:'MONSTER KILL' },
  { count:700,  label:'GODLIKE' },
  { count:800,  label:'HOLY SHIT!' },
  { count:900,  label:'BEYOND GODLIKE' },
  { count:1000, label:'ASCENDED' }
];
function showKillstreakBanner(label){
  const el = document.getElementById('killstreak-banner');
  el.textContent = label;
  el.dataset.notificationId = recordNotification(label, 'A combat milestone has been reached. Kill-streak awards mark sustained kills; size-phase labels identify the largest enemy group entering the road.') || '';
  el.classList.add('show');
  if(typeof el.animate === 'function'){
    if(showKillstreakBanner._animation) showKillstreakBanner._animation.cancel();
    el.style.animation = 'none';
    showKillstreakBanner._animation = el.animate([
      {opacity:0,transform:'translateY(-5px)',offset:0},
      {opacity:1,transform:'translateY(0)',offset:0.12},
      {opacity:1,transform:'translateY(0)',offset:0.80},
      {opacity:0,transform:'translateY(-3px)',offset:1}
    ], {duration:2200,easing:'ease-out',fill:'forwards'});
  }else{
    el.classList.remove('show');
    const generation = (showKillstreakBanner._generation || 0) + 1;
    showKillstreakBanner._generation = generation;
    requestAnimationFrame(() => {
      if(showKillstreakBanner._generation === generation) el.classList.add('show');
    });
  }
  clearTimeout(showKillstreakBanner._t);
  showKillstreakBanner._t = setTimeout(() => el.classList.remove('show'), 2200);
  playSound('wave');
}
/* =========================================================
   ELEMENTS, ATTUNEMENT AND CHAIN LIGHTNING
   ========================================================= */
// CA229 — see HISTORY.md § [1.5.7] Code Archaeology, CA229
const NAMING_HINT_FROM = 450, MASTERY_HINT_FROM = 900;
// CA230 — see HISTORY.md § [1.5.7] Code Archaeology, CA230
const ATTUNEMENT_PROC_MIN = 0.08, ATTUNEMENT_PROC_MAX = 0.32;
// ELEMENT-INFUSION-01 (1.7.36): a stickman's mixed element comes from its two highest stats that are at least
// MIXED_PAIR_THRESHOLD (ties go STR, then DEX, then INT). One qualifying stat is a single element; none is no element.
const MIXED_ELEMENT_BY_PAIR = { 'str+dex':'PROTON', 'str+int':'DARK_MATTER', 'dex+int':'QUASAR' };
function mixedElementFor(tower){
  const order = ['str','dex','int'];
  const ready = order.filter(stat => (tower[stat] || 0) >= MIXED_PAIR_THRESHOLD)
    .sort((a, b) => ((tower[b] || 0) - (tower[a] || 0)) || (order.indexOf(a) - order.indexOf(b)));
  if(ready.length < 2) return null;
  return MIXED_ELEMENT_BY_PAIR[[ready[0], ready[1]].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join('+')];
}
function refreshElementState(tower){
  if(!tower || isStructureType(tower.type)) return;
  const element = mixedElementFor(tower);
  if(element === (tower.elementState || null)) return;
  tower.elementState = element;
  if(!element) return;
  playSound('legendary');
  spawnFloatingText(tower.x, tower.y - 46, ELEMENT_LABELS[element] + ' unlocked!', '#c792ea');
  showToast(ELEMENT_LABELS[element] + ' — ' + towerDisplayName(tower) + ' mixed a new element!');
}
function attunementProcChance(tower){
  const stat = tower.attunement === 'FIRE' ? tower.str : tower.attunement === 'ELECTRIC' ? tower.dex : tower.attunement === 'ICE' ? tower.int : Math.max(tower.str, tower.dex, tower.int);
  const chance = ATTUNEMENT_PROC_MIN + (ATTUNEMENT_PROC_MAX - ATTUNEMENT_PROC_MIN) * cappedStatPoints(stat || 0) / STAT_EFFECT_CAP;
  return (!tower.elementState && tower.attunement === 'ICE') ? chance * ICE_PROC_SHARE : chance;
}
// ELEMENT-EFFECTS-01 (1.6.88) — see HISTORY.md § [1.6.88]. Electric attunement arcs from the struck
// enemy to nearby ones (plain array scan — chain counts are small, no spatial hash needed), stunning
// each and dealing a fraction of the tower's damage, with a jagged visual bolt between each pair.
const CHAIN_LIGHTNING_MAX_JUMPS = 3;
const CHAIN_LIGHTNING_JUMP_RADIUS = 90;
const CHAIN_LIGHTNING_STUN_MS = 500;
const CHAIN_LIGHTNING_DAMAGE_FRACTION = 0.35;
const activeLightningArcs = []; // { x1,y1,x2,y2, expiresAt }
function spawnChainLightning(tower, firstEnemy, maxJumps){
  firstEnemy.applyStun(CHAIN_LIGHTNING_STUN_MS);
  spawnFloatingText(firstEnemy.x, firstEnemy.y - firstEnemy.radius - 14, '⚡ Shocked!', '#ffe14d');
  const struck = new Set([firstEnemy]);
  let current = firstEnemy;
  for(let jump = 0; jump < (maxJumps || CHAIN_LIGHTNING_MAX_JUMPS); jump++){
    let nearestEnemy = null, nearestDistance = CHAIN_LIGHTNING_JUMP_RADIUS;
    for(const candidate of enemyPool){
      if(!candidate.active || struck.has(candidate) || candidate.escaped) continue;
      const distance = Math.hypot(candidate.x-current.x, candidate.y-current.y);
      if(distance < nearestDistance){ nearestDistance = distance; nearestEnemy = candidate; }
    }
    if(!nearestEnemy) break;
    activeLightningArcs.push({ x1: current.x, y1: current.y, x2: nearestEnemy.x, y2: nearestEnemy.y, expiresAt: gameTime + 180 });
    nearestEnemy.applyStun(CHAIN_LIGHTNING_STUN_MS);
    nearestEnemy.applyDamage(Math.round(tower.damage * CHAIN_LIGHTNING_DAMAGE_FRACTION), tower, false, false, true, false);
    spawnFloatingText(nearestEnemy.x, nearestEnemy.y - nearestEnemy.radius - 14, '⚡', '#ffe14d');
    struck.add(nearestEnemy);
    current = nearestEnemy;
  }
}
// SHOCK-BURST-01 (1.6.113) — see HISTORY.md § [1.6.113]
// SHAKE-WEIGHT-01 (1.6.116) — see HISTORY.md § [1.6.116]
const KILL_SHAKE_MIN_WEIGHT = 0.7, KILL_SHAKE_PX_PER_WEIGHT = 5, KILL_SHAKE_MAX_PX = 9, KILL_SHAKE_BASE_MS = 90, KILL_SHAKE_MS_PER_WEIGHT = 70, KILL_SHAKE_MAX_MS = 320;
function applyKillShake(enemy){
  if(!screenShakeEnabled || enemy.escaped || enemy.isLivestock || isFastForwardSimplified()) return;
  const shakePx = clampNum((enemy.weight - KILL_SHAKE_MIN_WEIGHT) * KILL_SHAKE_PX_PER_WEIGHT, 0, KILL_SHAKE_MAX_PX);
  if(shakePx <= 0) return;
  screenShakeUntil = Math.max(screenShakeUntil, presentationTime + Math.min(KILL_SHAKE_MAX_MS, KILL_SHAKE_BASE_MS + enemy.weight * KILL_SHAKE_MS_PER_WEIGHT));
  screenShakeMag = Math.max(screenShakeMag, shakePx);
}
const DUAL_OFFHAND_DELAY_FRACTION = 0.45;
const SHOCK_BURST_WINDOW_MS = 3000, SHOCK_BURST_RADIUS = 44, SHOCK_BURST_MAX_TARGETS = 4, SHOCK_BURST_HP_FRACTION = 0.3;
let shockBurstActive = false;
function dischargeShockBurst(dead, sourceTower){
  if(shockBurstActive || dead.shockedUntil <= gameTime || dead.escaped || dead.isLivestock) return;
  shockBurstActive = true;
  const burstDamage = Math.min(dead.maxHp * SHOCK_BURST_HP_FRACTION, (sourceTower && sourceTower.damage ? sourceTower.damage : dead.maxHp) * 3);
  let hitCount = 0;
  for(const other of enemyPool){
    if(hitCount >= SHOCK_BURST_MAX_TARGETS) break;
    if(!other.active || other === dead || other.escaped || other.isLivestock || other.isHutBuilding) continue;
    if(Math.hypot(other.x - dead.x, other.y - dead.y) > SHOCK_BURST_RADIUS + other.radius) continue;
    activeLightningArcs.push({ x1: dead.x, y1: dead.y, x2: other.x, y2: other.y, expiresAt: gameTime + 180 });
    other.applyDamage(Math.round(burstDamage), sourceTower, false, false, true, false);
    hitCount++;
  }
  if(hitCount) spawnFloatingText(dead.x, dead.y - dead.radius - 14, '⚡ Discharge!', '#ffe14d');
  shockBurstActive = false;
}
function updateLightningArcs(){
  for(let i = activeLightningArcs.length - 1; i >= 0; i--) if(gameTime >= activeLightningArcs[i].expiresAt) activeLightningArcs.splice(i, 1);
}
function drawLightningArcs(ctx){
  if(!activeLightningArcs.length) return;
  ctx.save();
  ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.shadowColor = '#ffe14d'; ctx.shadowBlur = graphicsQuality === 'high' ? 6 : 0; // LIGHTNING-BLUR-HIGH-01 (1.7.53)
  for(const arc of activeLightningArcs){
    const midX = (arc.x1+arc.x2)/2 + (Math.random()-0.5)*10, midY = (arc.y1+arc.y2)/2 + (Math.random()-0.5)*10;
    ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1); ctx.lineTo(midX, midY); ctx.lineTo(arc.x2, arc.y2); ctx.stroke();
  }
  ctx.restore();
}
// ELEMENT-INFUSION-01 (1.7.36): Fire burns like bleed but fire, Ice freezes, Electric chains lightning. A mixed element
// (Proton = Fire+Electric, Dark Matter = Fire+Ice, Quasar = Electric+Ice) applies both of its component effects on the same proc.
function applyElementComponent(tower, enemy, element, labelY){
  switch(element){
    case 'FIRE':
      enemy.applyBurn(10000, tower);
      spawnRoutineCombatText(enemy.x, labelY, '🔥 Burning!', '#ff8844');
      break;
    case 'ICE':
      if(tower.elementState && Math.random() >= ICE_PROC_SHARE) break;
      enemy.applyFreeze(ICE_FREEZE_MIN_MS + (ICE_FREEZE_MAX_MS - ICE_FREEZE_MIN_MS) * cappedStatPoints(tower.int || 0) / STAT_EFFECT_CAP);
      spawnRoutineCombatText(enemy.x, labelY, '🧊 Frozen!', '#7dd3fc');
      break;
    case 'ELECTRIC':
      enemy.shockedUntil = gameTime + SHOCK_BURST_WINDOW_MS;
      spawnChainLightning(tower, enemy);
      break;
  }
}
function applyAttunementStatus(tower, enemy){
  if(!tower || !tower.active || !enemy || !enemy.active) return;
  const element = tower.elementState || tower.attunement; // a mixed element supersedes the base attunement
  if(!element) return;
  if(Math.random() >= attunementProcChance(tower)) return;
  const labelY = enemy.y - enemy.radius - 14;
  const parts = ELEMENT_COMPONENTS[element] || [element];
  for(let i = 0; i < parts.length; i++) applyElementComponent(tower, enemy, parts[i], labelY - i*12);
}
/* =========================================================
   STAT NOTES, DPS BREAKDOWN AND CHANGELOG NOTICE
   ========================================================= */
function statTierNote(tower){
  // CA232 — see HISTORY.md § [1.5.7] Code Archaeology, CA232
  return '';
}
function progressionMilestoneNote(tower){
  const trained = getTrainedStatTotal(tower);
  if(trained >= MASTERY_THRESHOLD) return '🏆 Fully trained — XP earns gold';
  if(trained >= MASTERY_HINT_FROM) return '🏆 ' + trained + '/' + MASTERY_THRESHOLD;
  if(trained >= NAMING_THRESHOLD) return tower.legendaryName ? '' : '✒️ Name unit';
  if(trained >= NAMING_HINT_FROM) return '✒️ Naming soon — ' + trained + '/' + NAMING_THRESHOLD;
  return '';
}
// CA233 — see HISTORY.md § [1.5.7] Code Archaeology, CA233
function showDpsBreakdownModal(tower){
  const body = document.getElementById('dpsBreakdownBody');
  body.textContent = dpsBreakdownText(tower);
  document.getElementById('dpsBreakdownTitle').textContent = '⚔️ ' + towerDisplayName(tower) + ' — how its DPS is calculated';
  document.getElementById('dps-breakdown-modal').classList.remove('hidden');
}
function dpsBreakdownText(t){
  const archetype = CLASS_ARCHETYPE[t.type];
  const primaryStat = archetype === 'WARRIOR' ? 'STR' : archetype === 'ARCHER' ? 'DEX' : archetype === 'MAGE' ? 'INT' : 'none';
  const primaryValue = archetype === 'WARRIOR' ? t.str : archetype === 'ARCHER' ? t.dex : t.int;
  const shotsPerSecond = t.cooldown > 0 ? 1000 / t.cooldown : 0;
  const varianceHalf = Math.min(0.6, (t.type === 'MAGE' ? 0.4 : 0.2) + (t.primaryStatEff ? diminishingStatValue(t.primaryStatEff, 0.0003) : 0)); // matches applyDamage()'s stat-expanded variance band
  // CA798 — see HISTORY.md § [1.6.61] Cleric damage display.
  const clericUndeadMultiplier = t.type === 'CLERIC' ? 5 : 1;
  const averageDamage = t.damage * clericUndeadMultiplier;
  const accuracy = 1 - (t.missChance || 0);
  const lines = [
    'Primary stat: ' + primaryStat + ' ' + (primaryValue || 0) + ' trained, ' + Math.round(t.primaryStatEff || 0) + ' effective → damage x' + (1 + PRIMARY_DAMAGE_PER_POINT * cappedStatPoints(t.primaryStatEff || 0)).toFixed(2),
    'Damage per hit: ' + Math.round(averageDamage * (1 - varianceHalf)) + '-' + Math.round(averageDamage * (1 + varianceHalf)) + ' (avg ' + averageDamage.toFixed(1) + ')',
    ...(t.type === 'CLERIC' ? ['Target: undead only; 5x smite ignores armor'] : []),
    ...(t.type === 'LANCER' ? ['Lance damage: 0.5x–1.75x by enemy weight (15px radius = 1.0)'] : []),
    'Attack rate: ' + shotsPerSecond.toFixed(2) + '/s (cooldown ' + Math.round(t.cooldown) + 'ms)',
    'Current cooldown rate x' + (t.baseCooldown / Math.max(1,t.cooldown)).toFixed(2) + ' (stats and active buffs)',
    'Accuracy: ' + Math.round(accuracy * 100) + '%   Crit: ' + Math.round((t.critChance || 0) * 100) + '% x' + (t.critMult || 1.2).toFixed(2),
    'Range: ' + Math.round(t.range || t.meleeRange || 0) + ' (INT ' + (t.int || 0) + ' of ' + STAT_EFFECT_CAP + ' toward the class cap)',
    'Max HP: ' + Math.round(t.maxHp) + ' (class health growth, effective STR and active modifiers)',
    'Run blessings: STR +' + (runBoonCounts.GLOBAL_STR||0) + ', DEX +' + (runBoonCounts.GLOBAL_DEX||0) + ', INT +' + (runBoonCounts.GLOBAL_INT||0),
    '',
    'Shown DPS = avg damage x rate x accuracy x crit' + (t.type === 'CLERIC' ? ' against undead.' : t.splashRadius > 0 ? ', single target only — splash hits everything within ' + Math.round(t.splashRadius) + '.' : '.'),
    'Stats and equipment contribute to growth; class tiers set baseline damage and abilities.'
  ];
  return lines.join('\n');
}
let _changelogCache = null;
// CHANGES-TAB-01 (1.7.97) — see HISTORY.md § [1.7.97]: only the top of the changelog is fetched, with a timeout, so the tab never sits blank
const CHANGELOG_FIRST_CHUNK_BYTES = 98304, CHANGELOG_FETCH_TIMEOUT_MS = 10000, CHANGELOG_MIN_ENTRIES = 8;
async function fetchChangelogText(firstChunkOnly, fileName = 'CHANGELOG.md'){
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), CHANGELOG_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(fileName, { cache: 'no-cache', signal: controller.signal, headers: firstChunkOnly ? { Range: 'bytes=0-' + (CHANGELOG_FIRST_CHUNK_BYTES - 1) } : {} });
    if(!res.ok) throw new Error(fileName + ' fetch failed: ' + res.status);
    return { text: await res.text(), partial: res.status === 206 };
  } finally { clearTimeout(timer); }
}
function parseChangelogEntries(text, dropLastEntry){
  const entries = [];
  // CA236 — see HISTORY.md § [1.5.7] Code Archaeology, CA236
  const headingRe = /^## \[([^\]]+)\] [—–-] (\S+)(?: \(UTC\))?(?: [—–-] (.+))?$/gm;
  const matches = [...text.matchAll(headingRe)];
  const lastIndex = dropLastEntry ? matches.length - 1 : matches.length;
  for(let i = 0; i < lastIndex; i++){
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i+1].index : text.length;
    const body = text.slice(start, end);
    let items = [...body.matchAll(/^- (.+(?:\n(?!- |## )\s{2}.*)*)/gm)]
      .map(im => im[1].replace(/\n\s{2}/g, ' ').trim());
    if(items.length === 0){
      const prose = body.replace(/\n{2,}/g, ' ').trim();
      if(prose) items = [prose];
    }
    entries.push({ v: m[1], date: m[2], title: m[3] || '', items });
  }
  return entries;
}
async function loadChangelogEntries(){
  if(_changelogCache) return _changelogCache;
  const first = await fetchChangelogText(true);
  let entries = parseChangelogEntries(first.text, first.partial);
  if(first.partial && entries.length < CHANGELOG_MIN_ENTRIES) entries = parseChangelogEntries((await fetchChangelogText(false)).text, false);
  if(entries.length < CHANGELOG_MIN_ENTRIES){
    try {
      const archived = await fetchChangelogText(true, 'HISTORY.md');
      entries = entries.concat(parseChangelogEntries(archived.text, archived.partial));
    } catch(error) { console.warn('HISTORY.md unavailable; showing current release notes only', error); }
  }
  _changelogCache = entries;
  return entries;
}
const CHANGES_NOTICE_RELEASES = 8, CHANGES_NOTICE_ITEMS_PER_RELEASE = 6;
const CHANGELOG_URL = 'https://github.com/SauerNinja/StickTD/blob/main/CHANGELOG.md';
function appendChangelogLink(root){
  const link = document.createElement('a');
  link.href = CHANGELOG_URL; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'View current release notes';
  root.appendChild(link);
  const history=document.createElement('a'); history.href='https://github.com/SauerNinja/StickTD/blob/main/HISTORY.md'; history.target='_blank'; history.rel='noopener'; history.textContent=' · Earlier versions'; root.appendChild(history);
}
async function openChangesNotice(){
  document.getElementById('updateVersionBig').textContent = 'v' + GAME_VERSION;
  const list = document.getElementById('updateHighlights');
  list.replaceChildren();
  document.getElementById('updateFooterNote').textContent = 'Latest releases';
  document.getElementById('update-modal').classList.remove('hidden');
  const loadingNote = document.createElement('div');
  loadingNote.textContent = 'Loading release notes…';
  list.appendChild(loadingNote);
  try {
    const entries = await loadChangelogEntries();
    loadingNote.remove();
    for(const entry of entries.slice(0, CHANGES_NOTICE_RELEASES)){
      const heading = document.createElement('div');
      heading.className = 'update-entry-head';
      heading.textContent = 'v' + entry.v + (entry.title ? ' — ' + entry.title : '');
      list.appendChild(heading);
      const items = document.createElement('ul');
      for(const text of entry.items.slice(0, CHANGES_NOTICE_ITEMS_PER_RELEASE)){ const li = document.createElement('li'); li.textContent = text; items.appendChild(li); }
      list.appendChild(items);
    }
  } catch(err){
    const note = document.createElement('div');
    note.textContent = 'Release notes could not be loaded right now. ';
    loadingNote.remove();
    list.appendChild(note);
  }
  appendChangelogLink(list);
}
function closeChangesNotice(){ document.getElementById('update-modal').classList.add('hidden'); }
function renderSettingsChangelog(){
  const root = document.getElementById('settingsChangelog');
  root.replaceChildren();
  const status = document.createElement('p');
  status.textContent = 'Loading release notes…';
  root.appendChild(status);
  loadChangelogEntries().then(entries => {
    status.remove();
    for(const entry of entries.slice(0, 8)){
      const section = document.createElement('section');
      section.className = 'settings-changelog-entry';
      const title = document.createElement('h3');
      title.textContent = 'v' + entry.v + (entry.title ? ' — ' + entry.title : '');
      section.appendChild(title);
      const list = document.createElement('ul');
      for(const text of entry.items.slice(0, 8)){ const item = document.createElement('li'); item.textContent = text; list.appendChild(item); }
      section.appendChild(list); root.appendChild(section);
    }
    appendChangelogLink(root);
  }).catch(() => {
    status.textContent = 'Release notes could not be loaded right now.';
    appendChangelogLink(root);
  });
}
/* =========================================================
   EXPERIENCE, LEVELS AND PROMOTIONS
   ========================================================= */
// CA238 — see HISTORY.md § [1.5.7] Code Archaeology, CA238
const STAT_TIER_STEP = 100;
// CA239 — see HISTORY.md § [1.5.7] Code Archaeology, CA239
function refreshStatTier(tower){
  const trained = getTrainedStatTotal(tower);
  const tier = Math.floor(trained / STAT_TIER_STEP);
  if(tier <= (tower.statTierReached || 0)) return;
  tower.statTierReached = tier;
  // CA240 — see HISTORY.md § [1.5.7] Code Archaeology, CA240
  spawnParticles(tower.x, tower.y, '#ffd23f', 10);
  playSound('stat_spend');
}
function refreshProgressionMilestones(tower){
  if(!tower || isStructureType(tower.type)) return;
  refreshStatTier(tower);
  const trained = getTrainedStatTotal(tower);
  if(trained >= NAMING_THRESHOLD && !tower.namingUnlocked){
    tower.namingUnlocked = true;
    showToast('\u2712\ufe0f ' + towerDisplayName(tower) + ' can be named.');
  }
  if(trained >= MASTERY_THRESHOLD && !tower.isMastered){
    tower.isMastered = true;
    tower.isLegendary = true; // overhead trophy marker
    playSound('legendary');
    showToast('\ud83c\udfc6 ' + towerDisplayName(tower) + ' is fully trained \u2014 XP now earns gold!');
  }
}
function checkLegendaryStatus(tower){ refreshProgressionMilestones(tower); }
const STREAK_TIMEOUT_MS = 1200; // tighter window — kills must be genuinely rapid to keep a streak alive
// CA241 — see HISTORY.md § [1.5.7] Code Archaeology, CA241
const MAX_TOWER_LEVEL = 10000;
const MAX_PROMOTION_LEVEL = 99;
function firstPromotionCost(def){
  const firstPricedTier = def.tiers.find(tier => Number.isFinite(tier.upgradeCost));
  return firstPricedTier ? firstPricedTier.upgradeCost : 100;
}
function rollPromotionDie(){ return 1 + Math.floor(Math.random() * PROMOTION_ROLL_MAX); }
const TRAINING_BAR_XP = 100;
const ASSIST_POOL_FRACTION = 0.28;
const ESCAPED_CLEANUP_FRACTION = 0.25;
const TRAINING_BAR_ROLLS = 2, TRAINING_ROLL_MIN = 1, TRAINING_ROLL_MAX = 3;
function xpForNextLevel(){ return TRAINING_BAR_XP; }
function distributePromotionDice(totalDice, favoredStat){
  const dice = { str: 0, dex: 0, int: 0 };
  const stats = ['str', 'dex', 'int'];
  if(favoredStat){
    dice[favoredStat] = Math.ceil(totalDice / 2); // the class's main stat takes half the dice, the other two split the rest
    const others = stats.filter(stat => stat !== favoredStat);
    const rest = totalDice - dice[favoredStat];
    const firstShare = Math.floor(rest / 2) + (rest % 2 && Math.random() < 0.5 ? 1 : 0);
    dice[others[0]] = firstShare; dice[others[1]] = rest - firstShare;
  } else {
    const base = Math.floor(totalDice / 3);
    for(const stat of stats) dice[stat] = base;
    for(let extra = totalDice - base * 3; extra > 0; extra--) dice[stats[Math.floor(Math.random() * 3)]]++;
  }
  return dice;
}
function rollPromotionDice(count){
  let total = 0;
  for(let i = 0; i < count; i++) total += rollPromotionDie();
  return total;
}
// CA242 — see HISTORY.md § [1.5.7] Code Archaeology, CA242
function rollTrainingBarPoints(){
  let points = 0;
  for(let i = 0; i < TRAINING_BAR_ROLLS; i++) points += TRAINING_ROLL_MIN + Math.floor(Math.random() * (TRAINING_ROLL_MAX - TRAINING_ROLL_MIN + 1));
  return points;
}
function gainTowerExp(tower, amount){
  if(tower && amount > 0) tower.lifetimeXp = (tower.lifetimeXp || 0) + amount;
  if(tower && tower.active && tower.isMastered && amount > 0){
    // CA243 — see HISTORY.md § [1.5.7] Code Archaeology, CA243
    tower.masteryXpRemainder = (tower.masteryXpRemainder || 0) + amount;
    const earnedGold = Math.floor(tower.masteryXpRemainder / MASTERY_XP_PER_GOLD);
    if(earnedGold > 0){
      tower.masteryXpRemainder -= earnedGold * MASTERY_XP_PER_GOLD;
      gold += earnedGold;

      spawnXpText(tower.x, tower.y - 22, earnedGold, true);
    }
    return;
  }
  if(!tower.active || isStructureType(tower.type) || tower.expLevel >= MAX_TOWER_LEVEL || amount <= 0) return;
  tower.xp += amount;
  tower.waveXp = (tower.waveXp || 0) + amount;
  let leveled = false;
  let pointsGainedThisCall = 0;
  while(tower.expLevel < MAX_TOWER_LEVEL && tower.xp >= TRAINING_BAR_XP){
    // CA244 — see HISTORY.md § [1.5.7] Code Archaeology, CA244
    const remainingCapacity = STAT_TOTAL_CAP - getTrainedStatTotal(tower) - tower.statPoints;
    if(remainingCapacity <= 0){ tower.trainingHeld = true; break; }
    tower.trainingHeld = false;
    tower.xp -= TRAINING_BAR_XP;
    tower.expLevel++;
    const barPoints = Math.min(rollTrainingBarPoints(), remainingCapacity); // a final bar awards only what fits
    tower.statPoints += barPoints;
    if(tower.autoSpend) autoSpendStatPoints(tower);
    tower.waveStatPoints = (tower.waveStatPoints || 0) + barPoints;
    pointsGainedThisCall += barPoints;
    leveled = true;
  }
  if(tower.expLevel >= MAX_TOWER_LEVEL) tower.xp = 0;
  if(leveled){
    // CA245 — see HISTORY.md § [1.5.7] Code Archaeology, CA245
    spawnFloatingText(tower.x, tower.y - 40, '+' + pointsGainedThisCall + ' STAT' + (pointsGainedThisCall === 1 ? '' : 'S') + '!', '#ffd23f');
    if(tower.hp > tower.maxHp * LEVELUP_FANFARE_MIN_HP_FRACTION){
      playSound('levelup');
      playSound('chatter_short', tower.x, { archetype: CLASS_ARCHETYPE[tower.type], pitchBias: 40 }, tower.y);
    } // bright, excited — an upward reaction
  }
  if(selectedTower === tower) updateInspectPanel();
}
function creditKill(tower, forStreak, lastHitXp){
  if(forStreak === undefined) forStreak = true;
  tower.killCount++;
  sessionKills++;
  gainTowerExp(tower, lastHitXp);
  tower.waveLastHits = (tower.waveLastHits || 0) + 1;
  spawnXpText(tower.x + 12, tower.y - 22, lastHitXp, true);
  if(!forStreak){ updateHUD(); return; }
  if(gameTime - (tower.lastKillTime || 0) > STREAK_TIMEOUT_MS){
    tower.killStreak = 0; tower.nextStreakTier = 0;
  }
  if(killstreakHolder && killstreakHolder !== tower){
    killstreakHolder.killStreak = 0; killstreakHolder.nextStreakTier = 0;
  }
  killstreakHolder = tower;
  tower.lastKillTime = gameTime;
  tower.killStreak++;
  bestKillStreak = Math.max(bestKillStreak, tower.killStreak);
  while(tower.nextStreakTier < KILLSTREAK_TIERS.length && tower.killStreak >= KILLSTREAK_TIERS[tower.nextStreakTier].count){
    showKillstreakBanner(KILLSTREAK_TIERS[tower.nextStreakTier].label);
    awardMedal('HOT_STREAK');
    tower.bloodLustUntil = gameTime + 12000;
    if(autoCameraPans) panCameraToTower(tower);
    tower.nextStreakTier++;
  }
  checkLegendaryStatus(tower);
  updateHUD();
}
function distributeSharedXp(enemy, poolXp, excludedTower, label, color){
  let totalDamage = 0;
  for(const [tower, damage] of enemy.damageLedger){
    if(tower !== excludedTower && tower.active && isFighterTower(tower)) totalDamage += damage;
  }
  if(totalDamage <= 0) return;
  for(const [tower, damage] of enemy.damageLedger){
    if(tower === excludedTower || !tower.active || isStructureType(tower.type)) continue;
    const shareXp = poolXp * damage / totalDamage;
    gainTowerExp(tower, shareXp);
    if(label === 'CLEANUP') tower.waveCleanups = (tower.waveCleanups || 0) + 1;
    else tower.waveAssists = (tower.waveAssists || 0) + 1;
    if(shareXp >= 1) spawnXpText(tower.x - 12, tower.y - 22, Math.round(shareXp), false);
  }
}
function awardWaveClearExperience(){
  const amount = WAVE_CLEAR_XP_BASE + WAVE_CLEAR_XP_PER_WAVE * waveIndex;
  for(const tower of towerPool){
    if(!tower.active || isStructureType(tower.type)) continue;
    gainTowerExp(tower, amount);
    spawnXpText(tower.x, tower.y - 34, Math.round(amount), false);
  }
}
function awardKillExperience(enemy, killerTower, forStreak){
  const tierXp = SIZE_TIER_BANDS[enemy.sizeTier || 'STANDARD'].xp;
  if(enemy.escaped){
    distributeSharedXp(enemy, tierXp * ESCAPED_CLEANUP_FRACTION, null, 'CLEANUP', '#aab4bd');
    updateHUD();
    return;
  }
  if(killerTower && killerTower.active) creditKill(killerTower, forStreak, tierXp);
  distributeSharedXp(enemy, tierXp * ASSIST_POOL_FRACTION, killerTower, 'ASSIST', '#8fd3ff');
}
// CA247 — see HISTORY.md § [1.5.7] Code Archaeology, CA247
function generateSaveSeed(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0; i<6; i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
/* =========================================================
   STICKMAN BARKS
   ========================================================= */
// CA248 — see HISTORY.md § [1.5.7] Code Archaeology, CA248
// STICKMAN-BARKS-01 (1.6.110) — see HISTORY.md § [1.6.110]
const BARK_MAX_ACTIVE = 2, BARK_COOLDOWN_MS = 6000, BARK_LIFE_MS = 2200, BARK_FADE_MS = 400, BARK_CLUSTER_RADIUS = 160, BARK_OPTIONAL_QUIET_MS = 3000;
// BARK-CHANCE-01 (1.6.111) — see HISTORY.md § [1.6.111]
const BARK_CHANCE = { CRITICAL: 0.45, HURT: 0.25, LEAK: 0.3, BOSS_KILL: 0.5, CLOSE_CALL: 0.5, WAVE_START: 0.2, SWARM: 0.12, IDLE: 0.15, BARRICADE: 0.5 };
const BARK_SWARM_ENEMY_COUNT = 6, BARK_IDLE_MS = 20000;
const BARK_FAILED_ROLL_QUIET_MS = 12000;
const BARK_TIER_VITAL = 1, BARK_TIER_IMPORTANT = 2, BARK_TIER_OPTIONAL = 3;
const BARK_LINES = {
  CRITICAL: ['Need a medic over here!', "I'm bleeding out!", 'Hold the line... barely...'],
  HURT: ['Taking heavy fire!', "Can't hold them alone!", 'My guard is slipping!'],
  LEAK: ['Slipped right past me!', 'Get back here!', 'Someone stop that runner!'],
  BOSS_KILL: ['Sit down!', 'Target neutralized.', "Who's next?"],
  CLOSE_CALL: ['That was way too close.', 'Still breathing...', 'We actually survived that?!'],
  WAVE_START: ['Weapons primed!', 'Ready on the line!', 'Here they come!'],
  SWARM: ["There's too many of them!", "They're breaking through!", 'Concentrate fire!'],
  IDLE: ['Am I in the wrong spot?', 'Send some my way!', 'Quiet... too quiet.'],
  BARRICADE: ['The barricade is down!', 'They broke through!', 'Fall back!']
};
const barkPool = Array.from({ length: BARK_MAX_ACTIVE }, () => ({ active:false, tower:null, text:'', emoji:'', tier:0, style:0, timer:0 }));
let lastCombatDamageAt = -99999;
function requestStickmanBark(tower, tier, emoji, lines, style, chance){
  if(!tower || !tower.active || isStructureType(tower.type)) return;
  if(presentationTime - (tower.lastBarkAt === undefined ? -99999 : tower.lastBarkAt) < BARK_COOLDOWN_MS) return;
  if(presentationTime < (tower.barkRollQuietUntil || 0)) return;
  if(chance !== undefined && Math.random() >= chance){ tower.barkRollQuietUntil = presentationTime + BARK_FAILED_ROLL_QUIET_MS; return; }
  if(tier === BARK_TIER_OPTIONAL && presentationTime - lastCombatDamageAt < BARK_OPTIONAL_QUIET_MS) return;
  for(const slot of barkPool){
    if(!slot.active) continue;
    if(slot.tower === tower) return;
    if(Math.hypot(slot.tower.x - tower.x, slot.tower.y - tower.y) < BARK_CLUSTER_RADIUS && tier >= slot.tier) return;
  }
  let target = null;
  for(const slot of barkPool) if(!slot.active){ target = slot; break; }
  if(!target && tier === BARK_TIER_VITAL){
    let weakest = null;
    for(const slot of barkPool) if(slot.tier > BARK_TIER_VITAL && (!weakest || slot.tier > weakest.tier)) weakest = slot;
    target = weakest;
  }
  if(!target) return;
  target.active = true; target.tower = tower; target.tier = tier; target.style = style || 0;
  target.text = lines[Math.floor(Math.random()*lines.length)];
  target.textWidth = null;
  target.emoji = emoji; target.timer = BARK_LIFE_MS;
  tower.lastBarkAt = presentationTime;
  playSound('chatter_short', tower.x, { archetype: CLASS_ARCHETYPE[tower.type], pitchBias: tier === BARK_TIER_VITAL ? -50 : 25 }, tower.y);
}
function updateBarks(frameMs){
  for(const slot of barkPool){
    if(!slot.active) continue;
    slot.timer -= frameMs;
    if(slot.timer <= 0 || !slot.tower.active) slot.active = false;
  }
}
function drawBarks(ctx){
  for(const slot of barkPool){
    if(!slot.active) continue;
    const t = slot.tower;
    const alpha = slot.timer < BARK_FADE_MS ? Math.max(0, slot.timer/BARK_FADE_MS) : 1;
    const rise = (1 - slot.timer/BARK_LIFE_MS) * 8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 10px Verdana, sans-serif';
    if(slot.textWidth === null || slot.textWidth === undefined) slot.textWidth = ctx.measureText(slot.text).width;
    const textWidth = slot.textWidth;
    const bw = textWidth + 32, bh = 20, bx = t.x - bw/2, by = t.y - 64 - rise;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = slot.style === 1 ? '#e53935' : slot.style === 2 ? '#fbc02d' : '#333333';
    ctx.lineWidth = 1.5;
    roundedRectPath(ctx, bx, by, bw, bh, 5);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x - 4, by + bh); ctx.lineTo(t.x, by + bh + 5); ctx.lineTo(t.x + 4, by + bh); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '12px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(slot.emoji, bx + 4, by + bh/2 + 1);
    ctx.font = 'bold 10px Verdana, sans-serif';
    ctx.fillText(slot.text, bx + 22, by + bh/2 + 1);
    ctx.restore();
  }
}
function barkFromRandomTower(tier, emoji, lines, chance){
  let pick = null, seen = 0;
  for(const t of towerPool){
    if(!t.active || isStructureType(t.type) || t.disabledWavesLeft > 0) continue;
    seen++;
    if(Math.random() < 1/seen) pick = t;
  }
  if(pick) requestStickmanBark(pick, tier, emoji, lines, 0, chance);
}
/* =========================================================
   AUTO-SPEND AND SAVE FILES
   ========================================================= */
// AUTO-SPEND-01 (1.6.110) — see HISTORY.md § [1.6.110]
const AUTO_SPEND_ORDER = { WARRIOR: ['str','dex','int'], ARCHER: ['dex','str','int'], MAGE: ['int','dex','str'] };
function autoSpendStatPoints(tower){
  if(!tower || !tower.active || !tower.autoSpend || tower.statPoints <= 0 || isStructureType(tower.type)) return;
  const order = AUTO_SPEND_ORDER[CLASS_ARCHETYPE[tower.type]] || AUTO_SPEND_ORDER.WARRIOR;
  let guard = 600;
  while(tower.statPoints > 0 && guard-- > 0){
    let spent = false;
    for(const stat of order){ if(tower.allocateStat(stat)){ spent = true; break; } }
    if(!spent) break;
  }
  if(selectedTower === tower) updateInspectPanel();
}
function serializeGameState(){
  const towersData = towerPool.filter(t => t.active).map(t => ({
    type: t.type, gridX: t.gridX, gridY: t.gridY, level: t.level,
    foodConstitution: t.foodConstitution || 0,
    str: t.str, dex: t.dex, int: t.int, statPoints: t.statPoints, autoSpend: !!t.autoSpend, xp: t.xp, expLevel: t.expLevel,
    isMastered: t.isMastered, namingUnlocked: t.namingUnlocked, masteryXpRemainder: t.masteryXpRemainder || 0, elementState: t.elementState,
    spec: t.spec || null,
    itemIds: t.equippedItems.map(i => i.id),
    itemCosts: t.equippedItems.map(i => i.cost || 0), // MERCHANT-SAVE-01 (1.7.50): the price actually paid, so the half refund survives a reload
    legacyLuckyCoinSlots: t.equippedItems.map((item, index) => item.legacyLuckyCoin ? index : -1).filter(index => index >= 0),
    attunement: t.attunement || null,
    hp: t.hp, maxHp: t.maxHp, targetMode: t.targetMode, moveCharges: t.moveCharges,
    totalSpent: t.totalSpent,
    killCount: t.killCount, killStreak: t.killStreak, nextStreakTier: t.nextStreakTier,
    isLegendary: t.isLegendary, legendaryName: t.legendaryName, disabledWavesLeft: t.disabledWavesLeft,
    producerTimerMs: isProducerType(t.type) ? t.producerTimerMs : undefined
  }));
  const sceneryData = [...sceneryMap.entries()].map(([key, item]) => ({ key, item }));
  const harvestedTileData = [...harvestedTileKeys];
  const itemTypesUsedData = [...itemTypesUsed];
  const goldBagData = groundItems.filter(gi => gi.itemDef.isGoldBag).map(gi => ({ x: gi.x, y: gi.y, gold: gi.itemDef.gold }));
  const savedExpansionItems = groundItems.filter(gi => gi.itemDef.isMapScroll).map(gi => ({ x: gi.x, y: gi.y, itemId: gi.itemDef.id }));
  return {
    // CA249 — see HISTORY.md § [1.5.7] Code Archaeology, CA249
    presentationClockMs: presentationTime, seed: generateSaveSeed(), savedAt: new Date().toISOString(), gameVersion: GAME_VERSION, schemaVersion: 1,
    looseInventory: groundItems.filter(gi=>!gi.itemDef.isGoldBag && !gi.itemDef.isMapScroll && itemDefinitionForSavedId(gi.itemDef.id)).map(gi=>({x:gi.x,y:gi.y,itemId:gi.itemDef.id,age:Math.max(0,presentationTime-gi.spawnTime),legacyLuckyCoin:!!gi.itemDef.legacyLuckyCoin})),
    livestockGrowthVersion:2,
    livestock:enemyPool.filter(e=>e.active && e.isLivestock && LIVESTOCK_TYPES[e.type] && !LIVESTOCK_TYPES[e.type].hunter).slice(0,LIVESTOCK_MAX_ON_BOARD+CIRCUS_EXTRA_LIVESTOCK_CAP).map(e=>({type:e.type,x:e.x,y:e.y,growthRounds:e.growthRounds,honeyElapsedMs:e.type==='BEE'?(e.honeyElapsedMs||0):undefined,healthFraction:e.hp/e.maxHp,savedId:e.id,mateId:e.breedingPartner ? e.breedingPartner.id : null,birthDueRound:e.birthDueRound||0,breedReadyRound:e.breedReadyRound||0})),
    looseCoins: coinPickups.filter(c=>c.active).map(c=>({x:c.x,y:c.y,value:c.value,isDiamond:!!c.isDiamond,fromGoldBag:!!c.fromGoldBag,age:c.age,lifespan:c.lifespan})),
    gold, lives, livesBought, marketBought, drillsBought, merchantSold:{ wave: merchantBoughtWave, indexes: [...merchantBoughtIds] }, waveIndex:(stealthRun && waveIndex===10 && !stealthSantaDefeated) ? 9 : Math.max(0, waveIndex - (waveState !== 'IDLE' ? 1 : 0)), waveReplayed: waveState !== 'IDLE', freeExpansionOwed, hacksUsed, // WAVE-SAVE-01 (1.7.51): a save made in the middle of a wave resumes by starting that wave again (it used to skip it)
    wavesCompleted, stealthRun, wood, stone, freeBarricadesLeft, waveRunSeed, hasDefibrillator, donutShieldHits, bonusGrassTiles: [...bonusGrassTiles], bonusMaxLivesFromMeat,
    groundDetailRunSeed, firstTenEnemyKillCount, firstMapScrollDropped, starterGroundDetails: { region: [...starterRegionTileKeys], pebbles: [...starterPebbleTileKeys], tufts: [...starterTuftTileKeys] },
    globalPassiveCounts, runBoonCounts:{...runBoonCounts}, pendingRunRewards:pendingRunRewards.map(reward=>({wave:reward.wave,ids:reward.ids.slice()})), lastRunRewardWave, activeRegion, pathWaypointTiles, expansionLevel, paidExpansions, paidExpansionWaveIndex,
    latestExpansionTiles: latestExpansionTiles.map(t => ({x:t.x,y:t.y})),
    // CA250 — see HISTORY.md § [1.5.7] Code Archaeology, CA250
    ringRevealedArr: ringCandidateRegion ? [...ringRevealed] : undefined,
    ringCandidateRegion: ringCandidateRegion || undefined,
    goreMode, bloodDropletsEnabled, graphicsQuality, showZoomControls, showFpsCounter, screenShakeEnabled, seenEnemyTypes: [...seenEnemyTypes],
    unlockedTowerTypes: [...unlockedTowerTypes],
    ambientLogs: ambientLogs.map(log => ({ x:log.x, y:log.y, count:log.count })), ambientLogElapsedMs,
    towers: towersData, scenery: sceneryData, harvestedTiles: harvestedTileData, itemTypesUsed: itemTypesUsedData, goldBags: goldBagData, expansionItems: savedExpansionItems
  };
}
function downloadSaveFile(){
  const saveStarted = performance.now();
  const state = serializeGameState();
  const stateDone = performance.now();
  const serializedState = JSON.stringify(state);
  retainDiagnostic(extendedDiagnostics.saves, {time:new Date().toISOString(),kind:'download',wave:waveIndex,stateMs:stateDone-saveStarted,jsonMs:performance.now()-stateDone,codeUnits:serializedState.length},20);
  const text = 'STICK TOWER DEFENSE — SAVE FILE\n' +
    'Seed: ' + state.seed + '\n' +
    'Game version: ' + state.gameVersion + '\n' +
    'Saved: ' + state.savedAt + '\n' +
    'Do not edit below this line — upload this whole file via Settings > Game > Load Save to restore.\n\n' +
    serializedState;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'StickTD-save-wave' + wavesCompleted + '-' + new Date().toISOString().slice(0, 10) + '.txt'; a.click(); // readable name (wave and date) so several saves do not all look alike
  URL.revokeObjectURL(url);
  showToast('💾 Saved (seed ' + state.seed + ')');
  trackGameEvent('save_downloaded', { waves_completed: wavesCompleted });
}
// CA251 — see HISTORY.md § [1.5.7] Code Archaeology, CA251
function migrateLegacyAttunement(t){
  const candidates = [['str', t.str||0], ['dex', t.dex||0], ['int', t.int||0]]
    .filter(([, v]) => v >= ELEMENT_INFUSE_THRESHOLD);
  if(candidates.length === 0) return null; // nothing qualifies — stays unattuned, correct and expected for virtually every real save
  const maxVal = Math.max(...candidates.map(([, v]) => v));
  const topStats = candidates.filter(([, v]) => v === maxVal);
  if(topStats.length !== 1) return null; // exact tie among qualifying stats — leave unattuned rather than arbitrarily picking one
  return ATTUNEMENTS[topStats[0][0]];
}
// LOAD-ALL-OR-NOTHING-01 (1.7.51): an outside review found that loading did not replace every piece of run state (a pending free expansion, hack toggles, the marked enemy, speech bubbles
// holding towers from the old game, the move mode) and that an error half way through loading left the current game cleared. Loading now resets every run-scoped variable first, and if loading throws,
// the game that was running is put back from a copy taken before anything was touched.
function clearRunScopedStateForLoad(){
  freeExpansionOwed = 0; paidExpansionWaveIndex = -1; hackGodMode = false; hackFreeBuild = false; hacksUsed = false; hackMenuOpenFor = null;
  if(typeof setMarkedTarget === 'function') setMarkedTarget(null); markedTargetEnemy = null;
  for(const bark of barkPool){ bark.active = false; bark.tower = null; bark.text = ''; }
  if(moveModeTower) exitMoveMode();
  pendingSlotPress = null; hoveredSceneryKey = null; pendingRunRewards = [];
  lootWaveTracked = -1; lootRegularDropsThisWave = 0;
  merchantBoughtWave = -1; merchantBoughtIds = new Set();
}
function restoreGameState(state){
  groundItemsRestoring = true;
  let rollback = null;
  try{ rollback = JSON.parse(JSON.stringify(serializeGameState())); }catch(e){ rollback = null; }
  try{
    clearRunScopedStateForLoad();
    return restoreGameStateInner(state);
  } catch(error){
    if(rollback){ try{ clearRunScopedStateForLoad(); restoreGameStateInner(rollback); }catch(secondError){} }
    throw error;
  } finally { groundItemsRestoring = false; }
}
// SCENERY-SAVE-CLOCK-01: save clocks are local to a session; preserve ages, never absolute timestamps.
function restoreSceneryClock(savedItem, savedClock){
  const item = { ...savedItem };
  const hasClock = Number.isFinite(savedClock) && savedClock >= 0;
  if(item.isClearing){
    const elapsed = hasClock && Number.isFinite(item.clearStart) ? clampNum(savedClock-item.clearStart,0,Math.max(0,item.clearMs || 0)) : 0;
    item.clearStart = presentationTime-elapsed;
  }
  if(Number.isFinite(item.revealBornAt)) item.revealBornAt = presentationTime-(hasClock ? Math.max(0,savedClock-item.revealBornAt) : 450);
  if(Array.isArray(item.bloodStains)) item.bloodStains = item.bloodStains.map(stain => ({ ...stain, bornAt: presentationTime-(hasClock && Number.isFinite(stain.bornAt) ? Math.max(0,savedClock-stain.bornAt) : 0) }));
  item.bloodStampKey = null;
  return item;
}
function restoreGameStateInner(state){
  for(const e of enemyPool) e.active = false;
  enemyPresenceDirty = true;
  for(const t of towerPool) t.active = false;
  activeBarricades.clear();
  for(const p of projectilePool) p.active = false;
  for(const c of catPool) c.active = false; // temporary companions never persist across a save — see CatCompanion's own comment
  for(const s of skeletonPool) s.active = false; // same — skeletons are round-scoped, never saved
  for(const p of particles) p.active = false;
  for(const t of floatingTexts) t.active = false;
  placingCampfire=false; if(cookingDialog && cookingDialog.open) cookingDialog.close();
  sceneryMap.clear();
  guardedRoadEndKeys.clear();
  invalidateSpawnFlags();
  clearingScenery.length = 0;
  // Loading replaces the current run; unsaved loose loot cannot cross into it.
  groundItems.length = 0;
  draggingGroundItem = null;
  waveStartCameraPan = null;
  for(const coin of coinPickups) coin.active = false;
  coinPoolMayShrink = coinPickups.length > COIN_COUNT;
  selectedTower = null;
  cancelCameraFollow();
  ambientLogs.length = 0;
  ambientLogElapsedMs = Number.isFinite(state.ambientLogElapsedMs) ? Math.max(0, Math.min(AMBIENT_LOG_INTERVAL_MS - 1, state.ambientLogElapsedMs)) : 0;

  stealthRun=typeof state.stealthRun==='boolean'?state.stealthRun:window.analyticsConsentChoice==='denied';
  stealthSantaSpawned=false;stealthSantaDefeated=false;stealthEncounterEnding=false;
  gold = state.gold; lives = state.lives; livesBought = state.livesBought || 0; marketBought = Object.assign({ str: 0, int: 0, dex: 0 }, state.marketBought || {}); drillsBought = state.drillsBought || 0;
  freeExpansionOwed = Number.isInteger(state.freeExpansionOwed) && state.freeExpansionOwed > 0 ? Math.min(state.freeExpansionOwed, 10) : 0; hacksUsed = !!state.hacksUsed;
  merchantBoughtWave = (state.merchantSold && Number.isFinite(state.merchantSold.wave)) ? state.merchantSold.wave : -1; merchantBoughtIds = new Set(((state.merchantSold && state.merchantSold.indexes) || []).filter(Number.isInteger)); waveIndex = state.waveIndex;
  firstMapScrollDropped = state.firstMapScrollDropped !== undefined ? !!state.firstMapScrollDropped : ((state.wavesCompleted || 0) > 0 || (state.waveIndex || 0) > 0);
  firstTenEnemyKillCount = Number.isFinite(state.firstTenEnemyKillCount) ? state.firstTenEnemyKillCount : (firstMapScrollDropped ? FIRST_MAP_DROP_KILL : 0);
  hasDefibrillator = !!state.hasDefibrillator;
  donutShieldHits = state.donutShieldHits || 0;
  bonusGrassTiles.clear(); for(const key of (state.bonusGrassTiles||[])) bonusGrassTiles.add(key);
  dirtTileKeys.clear(); // a dirt list saved by 1.7.37 to 1.7.40 is ignored: those tiles are grass again
  rebuildNearPathTileSet();
  bonusMaxLivesFromMeat = state.bonusMaxLivesFromMeat || 0;
  chocolateAtkSpeedBuffUntil = 0; lollipopZones.length = 0; // temporary buffs never persist across a save
  lastShownLives = null; // a loaded save is not a change in lives: no pop for it
  waveRunSeed = Number.isFinite(state.waveRunSeed) ? (state.waveRunSeed >>> 0) : waveSeedFor(state.waveIndex || 0, 7919);
  if(Number.isFinite(state.groundDetailRunSeed)) groundDetailRunSeed = state.groundDetailRunSeed >>> 0;
  starterRegionTileKeys.clear(); starterPebbleTileKeys.clear(); starterTuftTileKeys.clear();
  const savedStarterDetails = state.starterGroundDetails || {};
  for(const key of (savedStarterDetails.region || [])) starterRegionTileKeys.add(key);
  for(const key of (savedStarterDetails.pebbles || [])) starterPebbleTileKeys.add(key);
  for(const key of (savedStarterDetails.tufts || [])) starterTuftTileKeys.add(key);
  wavesCompleted = state.wavesCompleted; wood = state.wood; stone = state.stone;
  if(wavesCompleted > CARAVAN_FIRST_ROUND_AFTER) caravan.lastRound = wavesCompleted - CARAVAN_MIN_GAP_ROUNDS; // CARAVAN-LOAD-01 (1.8.43): a loaded run past round 3 keeps the normal caravan odds instead of a guaranteed first visit
  freeBarricadesLeft = state.freeBarricadesLeft || 0;
  globalPassiveCounts = state.globalPassiveCounts || {};
  notificationPopupPausedGame=false;
  if(notificationDetailPopup.open)notificationDetailPopup.close();
  restoreRunRewards(state);
  activeRegion = state.activeRegion; pathWaypointTiles = state.pathWaypointTiles;
  expansionLevel = state.expansionLevel || 0;
  paidExpansionWaveIndex = Number.isInteger(state.paidExpansionWaveIndex) ? state.paidExpansionWaveIndex : -1;
  paidExpansions = state.paidExpansions !== undefined ? state.paidExpansions : expansionLevel; // an older save counts every earlier expansion as bought, as before
  latestExpansionTiles = Array.isArray(state.latestExpansionTiles) ? state.latestExpansionTiles : [];
  // CA252 — see HISTORY.md § [1.5.7] Code Archaeology, CA252
  if(state.ringCandidateRegion){
    // PATH-BORDER-01 (1.6.76) — see HISTORY.md § [1.6.76]
    ringCandidateRegion = state.ringCandidateRegion;
    ringRevealed = new Set(); ringRevealQueue = [];
    pendingRevealTileKeys.clear();
    ringRevealTotalTiles = 0;
    ringRevealTimer = 0;
  } else {
    ringCandidateRegion = null; ringRevealed = new Set(); ringRevealQueue = [];
  }
  if(state.goreMode !== undefined) goreMode = state.goreMode;
  if(typeof state.bloodDropletsEnabled === 'boolean') bloodDropletsEnabled = state.bloodDropletsEnabled;
  if(!bloodDropletsEnabled) for(const droplet of forensicDroplets) droplet.active = false;
  if(state.graphicsQuality){ graphicsQuality = state.graphicsQuality; setupCanvas(); }
  showZoomControls = !!state.showZoomControls;
  document.getElementById('zoom-controls').classList.toggle('show', showZoomControls);
  if(state.showFpsCounter !== undefined) showFpsCounter = state.showFpsCounter;
  if(state.screenShakeEnabled !== undefined) screenShakeEnabled = state.screenShakeEnabled;
  // CA253 — see HISTORY.md § [1.5.7] Code Archaeology, CA253
  for(const t of (state.unlockedTowerTypes || [])) unlockedTowerTypes.add(t);
  savePermanentUnlocks();
  if(state.seenEnemyTypes){
    seenEnemyTypes = new Set(state.seenEnemyTypes);
  } else {
    // CA254 — see HISTORY.md § [1.5.7] Code Archaeology, CA254
    seenEnemyTypes = new Set();
    for(const family of Object.keys(FAMILY_INTRODUCTION_WAVE)){
      if(FAMILY_INTRODUCTION_WAVE[family] <= state.waveIndex) seenEnemyTypes.add(family);
    }
  }
  rebuildPathCellsAndPx();
  lockStartingBorderOutsideRegion(); // STARTING-MAP-01 (1.6.79) — see HISTORY.md § [1.6.79]
  generateFlora();

  for(const s of (state.scenery || [])){
    const restoredItem = restoreSceneryClock(s.item, state.presentationClockMs);
    if(restoredItem.type === 'STONE_CAIRN') restoredItem.type = 'WOODPILE'; // EVENT-NO-CAIRN-01: migrate the copied item, preserving the input save
    normalizeSceneryHarvest(restoredItem);
    normalizeCookingJob(restoredItem);
    sceneryMap.set(s.key, restoredItem);
  }
  rebuildClearingScenery();
  harvestedTileKeys.clear();
  for(const harvestedKey of (state.harvestedTiles || [])) harvestedTileKeys.add(harvestedKey);
  itemTypesUsed.clear();
  for(const usedItemId of (state.itemTypesUsed || [])) itemTypesUsed.add(usedItemId);
  for(const savedBag of (state.goldBags || [])){
    if(!Number.isFinite(savedBag.x) || !Number.isFinite(savedBag.y) || !Number.isFinite(savedBag.gold)) continue;
    dropGoldBag(savedBag.x, savedBag.y, savedBag.gold);
  }
  for(const savedItem of (state.expansionItems || [])){
    if(!Number.isFinite(savedItem.x) || !Number.isFinite(savedItem.y)) continue;
    const itemDef = (savedItem.itemId === FIRST_MAP_SCROLL_ITEM.id || savedItem.itemId === LEGACY_MAP_BAG_ID) ? FIRST_MAP_SCROLL_ITEM : null; // a saved map bag from 1.7.42 or older becomes a Map
    if(itemDef) spawnGroundItem(savedItem.x, savedItem.y, itemDef, 'restored from save');
  }

  restoreLooseCoins(state.looseCoins);
  restoreLivestock(state.livestock,state.livestockGrowthVersion);
  restoreLooseInventory(state.looseInventory);

  for(const td of (state.towers || [])){
    const t = acquireActive(towerPool);
    if(!t) continue;
    t.create(td.type, td.gridX, td.gridY);
    t.level = td.level;
    t.applyTierStats();
    t.foodConstitution = Number.isFinite(td.foodConstitution) ? clampNum(td.foodConstitution,0,STAT_EFFECT_CAP) : 0;
    t.str = td.str||0; t.dex = td.dex||0; t.int = td.int||0; t.statPoints = td.statPoints||0; t.autoSpend = !!td.autoSpend;
    if(td.attunement !== undefined){
      t.attunement = td.attunement || null;
    } else if(BASE_ATTUNABLE_TYPES.includes(t.type)){
      t.attunement = migrateLegacyAttunement(t);
    }
    if(isStructureType(t.type)){ t.str = 0; t.dex = 0; t.int = 0; t.statPoints = 0; } // obstacle, not a tower — clears any stray stats an old (pre-fix) corrupted save might carry, on top of recomputeStats()'s own guard which already made maxHp safe regardless
    t.xp = td.xp||0; t.expLevel = td.expLevel||1;
    if(td.spec) t.chooseSpec(td.spec); // calls the real spec-choice logic (damage/cooldown/swing-arc multipliers), not a bare label assignment — chooseSpec() itself guards against re-applying if t.spec is somehow already set
    if(td.totalSpent !== undefined) t.totalSpent = td.totalSpent; // else: an old save predating this field — t.create() above already set totalSpent to this tower's base cost, a safe (if not perfectly accurate for a heavily-upgraded legacy tower) fallback rather than a crash
    if(td.targetMode) t.targetMode = td.targetMode;
    t.moveCharges = Number.isFinite(td.moveCharges) ? clampNum(td.moveCharges, 0, MAX_MOVE_CHARGES) : 1;
    if(isProducerType(t.type)) t.producerTimerMs = Number.isFinite(td.producerTimerMs) ? td.producerTimerMs : 0;
    const legacyLuckyCoinSlots = new Set(td.legacyLuckyCoinSlots || []);
    t.equippedItems = (td.itemIds||[]).map((id, index) => {
      const def = itemDefinitionForSavedId(id);
      if(!def) return null;
      const restored = makeItemInstance(def, 'restored from save');
      const paid = Array.isArray(td.itemCosts) ? td.itemCosts[index] : undefined;
      if(Number.isFinite(paid) && paid > 0 && paid !== restored.cost) Object.defineProperty(restored, 'cost', { value: paid, enumerable: true, writable: true }); // MERCHANT-SAVE-01
      return applyLegacyLuckyCoinMigration(restored, id, legacyLuckyCoinSlots.has(index)); // retain the retired coin's +1 STR through later saves
    }).filter(Boolean);
    for(const restored of t.equippedItems) itemLogHeldBy(restored, t);
    t.isLegendary = !!td.isLegendary; t.legendaryName = td.legendaryName || '';
    // CA255 — see HISTORY.md § [1.5.7] Code Archaeology, CA255
    t.str = Math.min(t.str, STAT_EFFECT_CAP); t.dex = Math.min(t.dex, STAT_EFFECT_CAP); t.int = Math.min(t.int, STAT_EFFECT_CAP);
    while(getTrainedStatTotal(t) > STAT_TOTAL_CAP){
      const largest = ['str','dex','int'].reduce((a, b) => t[b] > t[a] ? b : a, 'str');
      t[largest]--;
    }
    t.statPoints = Math.min(t.statPoints, Math.max(0, STAT_TOTAL_CAP - getTrainedStatTotal(t)));
    t.masteryXpRemainder = td.masteryXpRemainder || 0;
    t.elementState = td.elementState || null;
    t.isMastered = td.isMastered !== undefined ? !!td.isMastered : getTrainedStatTotal(t) >= MASTERY_THRESHOLD;
    t.isLegendary = t.isMastered; // legacy saves earned the trophy at 100 stats; it now means fully trained
    t.namingUnlocked = td.namingUnlocked !== undefined ? !!td.namingUnlocked : (!!t.legendaryName || getTrainedStatTotal(t) >= NAMING_THRESHOLD);
    t.legendaryHpMult = 1; // naming/mastery no longer grant HP // must be set before recomputeStats() so max HP includes it
    t.baseShieldPct = (t.type === 'HAMMERMAN' ? 0.35 : 0); // must be set before recomputeStats() so shieldPct includes it — item-granted armor is added on top inside recomputeStats() itself, from the just-restored equippedItems
    t.recomputeStats();
    t.checkHeroStatus();
    if(td.hp !== undefined) t.hp = Math.min(td.hp, t.maxHp); // clamp protects against loading an older
    // CA256 — see HISTORY.md § [1.5.7] Code Archaeology, CA256
    t.killCount = td.killCount || 0; t.killStreak = td.killStreak || 0; t.nextStreakTier = td.nextStreakTier || 0;
    t.disabledWavesLeft = td.disabledWavesLeft || 0;
  }

  waveState = 'IDLE'; resetWaveDispatch();
  repairMissingExpansionScenery();
  screenShakeUntil = 0; screenShakeMag = 0;
  rebakeMap();
  if(ringCandidateRegion) finalizeRingExpansion(); // PATH-BORDER-01 (1.6.76) — see HISTORY.md § [1.6.76]
  centerCameraOnActiveRegion();
  recordStateTransition('PLAYING'); gameState = 'PLAYING';
  blowingLeaves = [];
  document.getElementById('start-screen').classList.add('hidden');
  // CA257 — see HISTORY.md § [1.5.7] Code Archaeology, CA257
  const hudTopEl = document.getElementById('hud-top');
  hudTopEl.style.display = 'flex';
  document.getElementById('pause-overlay').classList.add('hidden'); // covers loading a save while paused — otherwise stuck visible, since gameState is set to PLAYING directly here rather than through the pause button's own toggle
  fitHudTopToOneLine(true);
  positionZoomControls();
  updateHUD();
  updateInspectPanel();
  for(const log of (Array.isArray(state.ambientLogs) ? state.ambientLogs : []).slice(0, AMBIENT_LOG_MAX_ON_BOARD)){
    if(!log || !Number.isFinite(log.x) || !Number.isFinite(log.y)) continue;
    const gx = Math.floor(log.x/TILE_SIZE), gy = Math.floor(log.y/TILE_SIZE);
    if(gx<1 || gy<1 || gx>=COLS-1 || gy>=ROWS-1 || pathCells.has(gx+','+gy) || nearPathTileSet.has(gx+','+gy) || bonusGrassTiles.has(gx+','+gy) || tileHasHut(gx, gy) || ambientLogs.some(saved => Math.floor(saved.x/TILE_SIZE) === gx && Math.floor(saved.y/TILE_SIZE) === gy)) continue;
    ambientLogs.push({ x:gx*TILE_SIZE+TILE_SIZE/2, y:gy*TILE_SIZE+TILE_SIZE/2, count:Number.isFinite(log.count) ? clampNum(Math.round(log.count), 1, AMBIENT_LOG_STACK_SIZE) : AMBIENT_LOG_STACK_SIZE });
  }
}
// CA258 — see HISTORY.md § [1.5.7] Code Archaeology, CA258
function validateSaveShape(state){
  if(!state || typeof state !== 'object') return false;
  if(typeof state.gold !== 'number' || typeof state.lives !== 'number') return false;
  if(!Array.isArray(state.pathWaypointTiles)) return false;
  if(!state.activeRegion || typeof state.activeRegion !== 'object') return false;
  // CA259 — see HISTORY.md § [1.5.7] Code Archaeology, CA259
  if(state.towers !== undefined){
    if(!Array.isArray(state.towers)) return false;
    for(const td of state.towers){
      if(!td || typeof td !== 'object') return false;
      if(typeof td.type !== 'string' || !CONFIG.TOWERS[td.type]) return false;
      if(typeof td.gridX !== 'number' || typeof td.gridY !== 'number') return false;
    }
  }
  if(state.scenery !== undefined && !Array.isArray(state.scenery)) return false;
  if(state.harvestedTiles !== undefined && !Array.isArray(state.harvestedTiles)) return false;
  if(state.itemTypesUsed !== undefined && !Array.isArray(state.itemTypesUsed)) return false;
  if(state.goldBags !== undefined && !Array.isArray(state.goldBags)) return false;
  // SAVE-ROUTE-CHECK-01 (1.7.50): an outside review found a null route tile passed this check and then threw in the middle of loading, after the current game had already been cleared.
  // Every route tile is now checked here, before anything is touched, as a whole number inside the map, and consecutive tiles must touch.
  if(!Array.isArray(state.pathWaypointTiles) || state.pathWaypointTiles.length < 2 || state.pathWaypointTiles.some(tile => !tile || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) || tile.x < 0 || tile.y < 0 || tile.x >= COLS || tile.y >= ROWS)) return false;
  for(let k = 1; k < state.pathWaypointTiles.length; k++){ const a = state.pathWaypointTiles[k-1], b = state.pathWaypointTiles[k]; if(Math.abs(a.x-b.x) + Math.abs(a.y-b.y) !== 1) return false; }
  if(state.expansionItems !== undefined && (!Array.isArray(state.expansionItems) || state.expansionItems.some(item => !item || !Number.isFinite(item.x) || !Number.isFinite(item.y) || ![FIRST_MAP_SCROLL_ITEM.id, LEGACY_MAP_BAG_ID].includes(item.itemId)))) return false;
  return true;
}
function loadSaveFileText(text){
  const jsonStart = text.indexOf('{');
  if(jsonStart === -1){ trackGameEvent('save_load_failed', {reason:'missing_json'}); showToast('⚠️ Not a valid save file'); return; }
  try{
    const state = JSON.parse(text.slice(jsonStart));
    if(!validateSaveShape(state)){ trackGameEvent('save_load_failed', {reason:'invalid_shape'}); showToast('⚠️ Not a valid save file — your current game is untouched'); return; }
    const previousTelemetry = telemetrySummaryPayload('save_replaced');
    restoreGameState(state);
    reportSessionSummary('save_replaced', previousTelemetry);
    beginTelemetryRun(true);
    const versionNote = (state.gameVersion && state.gameVersion !== GAME_VERSION)
      ? ' — from v' + state.gameVersion + ', this is v' + GAME_VERSION : '';
    showToast('💾 Loaded save (seed ' + (state.seed || '?') + ')' + versionNote + (state.waveReplayed ? ' - the unfinished wave starts again' : ''));
    trackGameEvent('save_loaded', { save_version: state.gameVersion || 'unknown', waves_completed: wavesCompleted });
  } catch(err){
    trackGameEvent('save_load_failed', {reason:err instanceof SyntaxError ? 'invalid_json' : 'restore_failed'});
    showToast('⚠️ Could not read that save file');
  }
}
/* =========================================================
   CAMERA (zoom + pan)
   ========================================================= */
const MIN_ZOOM = 0.6, MAX_ZOOM = 6; // ZOOM-CLOSER-01 (1.6.121) — see HISTORY.md § [1.6.121]
const FAST_FORWARD_SIMPLIFY_SPEED = 5; // FAST-SIMPLIFY-01 (1.6.125) — see HISTORY.md § [1.6.125]. At this speed and above, purely cosmetic motion and routine combat text are skipped
function isFastForwardSimplified(){ return effectiveGameSpeed() >= FAST_FORWARD_SIMPLIFY_SPEED; }
const ENEMY_STRIDE_LENGTH_PER_RADIUS = 0.5, ENEMY_HOP_PER_RADIUS = 0.2, ENEMY_TILT_RADIANS = 0.13, ENEMY_STRIDE_SQUASH = 0.12; // ENEMY-STRIDE-01 (1.6.124) — see HISTORY.md § [1.6.124]
const FIT_MAX_ZOOM = 2.45; // START-ZOOM-01 (1.6.123; owner's 2.1x view 1.6.154; closer at the owner's request 1.8.43) — see HISTORY.md § [1.6.154]. The automatic fit opens at 2.45x on the opening patch (2.7x was too close, 0.9x too far), smaller only if the screen cannot fit the opening area; the player zooms from there
const camera = { x: 0, y: 0, zoom: 1 };
let cameraFollow = null; // { tower, selectTime, phase: 'waiting'|'panning'|'locked', panStartX, panStartY }
function startCameraFollow(tower){
  roundEnemyFollow = null;
  waveStartCameraPan = null; // mutually exclusive with the wave-start pan below — whichever the player's attention is on wins, they never fight over camera.x/y/zoom in the same frame
  cameraFollow = { tower, selectTime: cameraPanClock, phase: 'waiting', panStartX: 0, panStartY: 0 };
}
// REAL-TIME-PRESENTATION-01 (1.6.103): every camera pan below runs on cameraPanClock (real elapsed time), never gameTime, so 1x/2x/3x/5x/10x cannot change how fast the camera moves.
// CA260 — see HISTORY.md § [1.5.7] Code Archaeology, CA260
let waveStartCameraPan = null;
let roundEnemyFollow = null; // first dispatched enemy plus spawn serial; never retarget this round
function startTrollCameraPan(troll){
  cancelCameraFollow(); panInertia.active=false;
  const targetZoom=camera.zoom;
  waveStartCameraPan={panStartTime:cameraPanClock,panStartX:camera.x,panStartY:camera.y,panStartZoom:camera.zoom,targetZoom,targetX:CANVAS_W/2-troll.x*targetZoom,targetY:CANVAS_H/2-troll.y*targetZoom};
}
const SPAWN_MARKER_RISE_PX = 34; // the height of the exclamation mark above the spawn tile centre, shared by the marker and the pan
function startWaveStartCameraPan(){
  if(!waypointsPx || !waypointsPx.length) return;
  cameraFollow = null;
  panInertia.active = false;
  roundEnemyFollow = { enemy: null, serial: 0, lastClock: cameraPanClock };
  const spawn = waypointsPx[0];
  const targetZoom = Math.max(camera.zoom, 1.2); // guaranteed minimum close-up, never zooms OUT from wherever the player already is — same idea as the tower-follow zoom guarantee, slightly less aggressive since this is a broader "here's where the wave is coming from" glance, not a close look at one tower
  waveStartCameraPan = {
    panStartTime: cameraPanClock, panStartX: camera.x, panStartY: camera.y, panStartZoom: camera.zoom,
    targetZoom, targetX: CANVAS_W/2 - spawn.x*targetZoom, targetY: CANVAS_H/2 - spawn.y*targetZoom // CAMERA-SPAWN-01 (1.8.37): the wave-start pan centres on the spawn tile where the enemies appear, so the marker and the 3-2-1 sit above the middle of the view
  };
}
function updateWaveStartCameraPan(){
  if(!waveStartCameraPan) return;
  if(cameraFollow){ waveStartCameraPan = null; return; } // player selected a tower mid-pan — hand off to that instead of fighting it
  const PAN_MS = 1200;
  const f = waveStartCameraPan;
  const t = Math.min(1, (cameraPanClock - f.panStartTime) / PAN_MS);
  const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; // smooth ease-in-out cubic, same curve as the tower-follow pan
  camera.zoom = f.panStartZoom + (f.targetZoom - f.panStartZoom)*eased;
  camera.x = f.panStartX + (f.targetX - f.panStartX)*eased;
  camera.y = f.panStartY + (f.targetY - f.panStartY)*eased;
  if(t >= 1) waveStartCameraPan = null;
}
function cancelCameraFollow(){
  waveStartCameraPan = null;
  roundEnemyFollow = null;
  cameraFollow = null;
}
// ROUND-CAMERA-01 (1.7.172): track the rendered position on the presentation clock.
function updateRoundEnemyFollow(){
  const f = roundEnemyFollow;
  if(!f || waveStartCameraPan || gameState === 'PAUSED') return;
  if(gameState !== 'PLAYING'){ roundEnemyFollow = null; return; }
  if(!f.enemy){ f.lastClock = cameraPanClock; return; }
  const e = f.enemy;
  if(!e.active || e.spawnSerial !== f.serial){ roundEnemyFollow = null; return; }
  const blend = Math.min(1, accumulator / FIXED_DT);
  const x = Number.isFinite(e.renderPrevX) ? e.renderPrevX + (e.x - e.renderPrevX) * blend : e.x;
  const y = Number.isFinite(e.renderPrevY) ? e.renderPrevY + (e.y - e.renderPrevY) * blend : e.y;
  const dt = Math.max(0, Math.min(CAMERA_CLOCK_MAX_STEP_MS, cameraPanClock - f.lastClock));
  f.lastClock = cameraPanClock;
  const ease = 1 - Math.exp(-dt / 100);
  camera.x += (CANVAS_W / 2 - x * camera.zoom - camera.x) * ease;
  camera.y += (CANVAS_H / 2 - y * camera.zoom - camera.y) * ease;
}
function updateCameraFollow(){
  if(!cameraFollow || cameraFollow.tower !== selectedTower || !selectedTower.active){
    cameraFollow = null;
    return;
  }
  const f = cameraFollow;
  const RECOMMENDED_ZOOM = 1.3; // guaranteed minimum close-up distance — zooms in to at least this, never zooms out past wherever the user already is
  const WAIT_MS = 150, PAN_MS = 1400;
  if(f.phase === 'waiting'){
    if(cameraPanClock - f.selectTime >= WAIT_MS){
      f.phase = 'panning';
      f.panStartTime = cameraPanClock;
      f.panStartX = camera.x; f.panStartY = camera.y;
      f.panStartZoom = camera.zoom;
      f.targetZoom = Math.max(camera.zoom, RECOMMENDED_ZOOM); // guarantees at least this zoom level, but never zooms OUT from wherever the user already is
      // CA262 — see HISTORY.md § [1.5.7] Code Archaeology, CA262
      f.targetX = CANVAS_W/2 - f.tower.x*f.targetZoom;
      f.targetY = CANVAS_H/2 - towerVisualCenterY(f.tower)*f.targetZoom;
    }
    return;
  }
  if(f.phase === 'panning'){
    const t = Math.min(1, (cameraPanClock - f.panStartTime) / PAN_MS);
    // CA263 — see HISTORY.md § [1.5.7] Code Archaeology, CA263
    const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    camera.zoom = f.panStartZoom + (f.targetZoom - f.panStartZoom)*eased;
    camera.x = f.panStartX + (f.targetX - f.panStartX)*eased;
    camera.y = f.panStartY + (f.targetY - f.panStartY)*eased;
    // CA264 — see HISTORY.md § [1.5.7] Code Archaeology, CA264
    if(t >= 1) f.phase = 'locked';
    return;
  }
  // locked — continuously re-center on the tower (it may be moving, e.g. mid Move-mode drag)
  camera.x = CANVAS_W/2 - f.tower.x*camera.zoom;
  camera.y = CANVAS_H/2 - towerVisualCenterY(f.tower)*camera.zoom;
}
let screenShakeUntil = 0, screenShakeMag = 0; // gore kills trigger a brief impact shake
let hitStopUntil = 0; // brief physics freeze on Boss kills
// WAVE-CHEER-01 (1.8.43): when a wave is cleared every standing fighter raises his weapon and hops for a moment; the ground shadow stays put, so the hop reads as a jump.
const WAVE_CHEER_MS = 1800, WAVE_CHEER_HOP_PX = 5;
let waveCheerStart = -1e9, waveCheerUntil = -1e9;
// CLOSE-CALL-01 (1.8.43): an enemy killed within one tile of the finish freezes the action for a beat and shows CLOSE!, at most once every few seconds.
const CLOSE_CALL_RADIUS_PX = 70, CLOSE_CALL_FREEZE_MS = 140, CLOSE_CALL_GAP_MS = 4000;
let lastCloseCallAt = -1e9;
// CA265 — see HISTORY.md § [1.5.7] Code Archaeology, CA265
let pausedRenderQueued = false;
function requestPausedRender(){
  if(pausedRenderQueued) return;
  pausedRenderQueued = true;
  requestAnimationFrame(() => { pausedRenderQueued = false; if(gameState !== 'START'){ flushHUDIfDirty(); render(ctx); } });
}
// CA266 — see HISTORY.md § [1.5.7] Code Archaeology, CA266
const PAN_INERTIA_DECAY_PER_MS = 0.005;
const PAN_INERTIA_MIN_SPEED = 0.02; // canvas px per ms
const PAN_VELOCITY_SMOOTHING = 0.35;
const panInertia = { vx: 0, vy: 0, active: false, lastMoveTime: 0 };
function trackPanVelocity(dxCanvas, dyCanvas, eventTime){
  const elapsed = Math.max(1, eventTime - panInertia.lastMoveTime);
  panInertia.lastMoveTime = eventTime;
  if(elapsed > 80){ panInertia.vx = 0; panInertia.vy = 0; return; }
  panInertia.vx += (dxCanvas / elapsed - panInertia.vx) * PAN_VELOCITY_SMOOTHING;
  panInertia.vy += (dyCanvas / elapsed - panInertia.vy) * PAN_VELOCITY_SMOOTHING;
}
function startPanInertia(eventTime){
  panInertia.active = eventTime - panInertia.lastMoveTime < 60 && Math.hypot(panInertia.vx, panInertia.vy) > PAN_INERTIA_MIN_SPEED;
}
function stopPanInertia(){ panInertia.active = false; panInertia.vx = 0; panInertia.vy = 0; }
function applyPanInertia(frameMs){
  if(!panInertia.active) return;
  camera.x += panInertia.vx * frameMs;
  camera.y += panInertia.vy * frameMs;
  clampCamera();
  const decay = Math.exp(-PAN_INERTIA_DECAY_PER_MS * frameMs);
  panInertia.vx *= decay; panInertia.vy *= decay;
  if(Math.hypot(panInertia.vx, panInertia.vy) < PAN_INERTIA_MIN_SPEED) stopPanInertia();
}
function clampCamera(){
  const contentW = WORLD_MAX_W * camera.zoom;
  const contentH = WORLD_MAX_H * camera.zoom;
  let minX, maxX, minY, maxY;
  if(contentW <= CANVAS_W){
    // the world (at this zoom) is smaller than the viewport — center it instead of edge-clamping
    minX = maxX = (CANVAS_W - contentW) / 2;
  } else {
    minX = CANVAS_W - contentW;
    maxX = 0;
  }
  if(contentH <= CANVAS_H){
    minY = maxY = (CANVAS_H - contentH) / 2;
  } else {
    minY = CANVAS_H - contentH;
    maxY = 0;
  }
  camera.x = Math.min(maxX, Math.max(minX, camera.x));
  camera.y = Math.min(maxY, Math.max(minY, camera.y));
}
// zoom while keeping the world point under (canvasX,canvasY) fixed on screen
function zoomAt(canvasX, canvasY, newZoom){
  markCameraInteraction();
  cancelCameraFollow();
  newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  const worldX = (canvasX - camera.x) / camera.zoom;
  const worldY = (canvasY - camera.y) / camera.zoom;
  camera.zoom = newZoom;
  camera.x = canvasX - worldX*camera.zoom;
  camera.y = canvasY - worldY*camera.zoom;
  clampCamera();
}
// CA267 — see HISTORY.md § [1.5.7] Code Archaeology, CA267
function panCameraToTower(tower){
  if(!tower || !tower.active) return;
  stopPanInertia();
  camera.x = CANVAS_W / 2 - tower.x * camera.zoom;
  camera.y = CANVAS_H / 2 - tower.y * camera.zoom;
  clampCamera();
}
function centerCameraOnActiveRegion(zoom){
  const cx = (activeRegion.x0 + activeRegion.x1 + 1)/2 * TILE_SIZE;
  const cy = (activeRegion.y0 + activeRegion.y1 + 1)/2 * TILE_SIZE;
  if(!zoom){
    const regionW = (activeRegion.x1 - activeRegion.x0 + 1) * TILE_SIZE;
    const regionH = (activeRegion.y1 - activeRegion.y0 + 1) * TILE_SIZE;
    const fitZoom = Math.min(CANVAS_W/regionW, CANVAS_H/regionH) * 0.8;
    zoom = Math.min(FIT_MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom));
  }
  camera.zoom = zoom;
  camera.x = CANVAS_W/2 - cx*camera.zoom;
  camera.y = CANVAS_H/2 - cy*camera.zoom;
  clampCamera();
}
