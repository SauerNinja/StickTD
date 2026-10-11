"use strict";

/* =========================================================
   FILE MAP — index.html loads these four files in this order (MODULE-FILES-01)
     config       settings and balance numbers, game state, camera, effects, rendering, main loop,
                  sound engine and music, input, HUD, menus and shop, debug log, design contract
     environment  map and path, scenery, flora, campfire, chance structures, huts and graves
     towers       CONFIG.TOWERS (every class's numbers, icon and unlocks), elements, promotions,
                  the Tower and Projectile classes
     waves        CONFIG.ENEMIES (emoji, health, speed, bounty), size and family tiers, the wave
                  plan, bosses, trolls, circus, the Enemy class; the end of the file runs the
                  boot sequence and starts the game
   A file may use another file's names only inside functions, or at load time only when that
   file comes earlier in this list.
   ========================================================= */

/* =========================================================
   CONFIG
   ========================================================= */
const GAME_VERSION = '1.8.10'; // Every upload bumps this and the top CHANGELOG.md heading together (RELEASE-VERSION-01).
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
function emojiSpriteFor(emoji, bucketIndex){
  let row = emojiSpriteRows.get(emoji);
  if(!row){ row = []; emojiSpriteRows.set(emoji, row); }
  let sprite = row[bucketIndex];
  if(sprite) return sprite;
  if(emojiSpriteCount >= EMOJI_SPRITE_CACHE_LIMIT){ emojiSpriteRows.clear(); emojiSpriteCount = 0; row = []; emojiSpriteRows.set(emoji, row); }
  const fontPx = Math.round(EMOJI_SPRITE_MIN_PX * Math.pow(EMOJI_SPRITE_STEP, bucketIndex)), side = Math.ceil(fontPx * EMOJI_SPRITE_PAD);
  sprite = document.createElement('canvas'); sprite.width = side; sprite.height = side;
  const spriteCtx = sprite.getContext('2d');
  spriteCtx.font = pxFont(fontPx); spriteCtx.textAlign = 'center'; spriteCtx.textBaseline = 'middle'; spriteCtx.fillStyle = '#000000';
  spriteCtx.fillText(emoji, side / 2, side / 2);
  sprite.fontPx = fontPx; sprite.side = side;
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
  if(textSpriteCache.size >= TEXT_SPRITE_CACHE_LIMIT) textSpriteCache.clear();
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
function drawAngerMark(ctx, x, y, size, popScale, wiggle){
  ctx.save();
  ctx.translate(x, y); ctx.rotate(wiggle); ctx.scale(popScale, popScale);
  ctx.lineCap = 'round';
  for(let pass = 0; pass < 2; pass++){
    ctx.strokeStyle = pass === 0 ? '#7f1d1d' : '#ff4b4b';
    ctx.lineWidth = pass === 0 ? size * 0.62 : size * 0.38;
    ctx.beginPath();
    for(let arm = 0; arm < 4; arm++){
      const centreAngle = arm * Math.PI / 2 + Math.PI / 4;
      ctx.moveTo(Math.cos(centreAngle - 0.5) * size, Math.sin(centreAngle - 0.5) * size);
      ctx.arc(0, 0, size, centreAngle - 0.5, centreAngle + 0.5);
    }
    ctx.stroke();
  }
  ctx.restore();
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
function drawEmojiGroundShadow(ctx,emoji,x,y,size,family,stretchX,tallStretch){
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
  ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha*=0.24; ctx.translate(x,anchorY); // SHADOW-TALL-01 (1.7.36): a stretched tree casts a proportionally longer shadow, anchored at the same foot
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
const PRODUCER_TYPES = ['LOG_MILL','STONE_QUARRY'];
const PRODUCER_INTERVAL_MS = 60000, PRODUCER_COST_GROWTH = 1.6;
const PRODUCER_DEFS = {
  LOG_MILL: { resource:'wood', icon:'🪵', field:'🏭', parts:[['🌲',24,-12,-5],['🌳',24,12,-7],['🪵',15,-14,8],['🪵',15,13,9],['🏭',22,0,3]], yields:[12,24,45], build:{gold:90,wood:80,stone:40}, upgrades:[{gold:110,wood:120,stone:60},{gold:220,wood:240,stone:120}], hp:[120,180,260] },
  STONE_QUARRY: { resource:'stone', icon:'⛰️', field:'⛰️', parts:[['⛰️',38,0,-2],['🏭',17,2,9]], yields:[10,20,38], build:{gold:90,wood:40,stone:80}, upgrades:[{gold:110,wood:60,stone:120},{gold:220,wood:120,stone:240}], hp:[120,180,260] }
};
const PRODUCER_MAX_LEVEL = 3;
const isProducerType = type => PRODUCER_TYPES.includes(type);
const isStructureType = type => type === 'BARRICADE' || isProducerType(type);
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
const LUCKY_BRANCH = { id:'LUCKY_BRANCH', name:'Lucky Branch', icon:'🌿', str:1, dex:1, int:1, armor:1, cost:70, woodCost:15 };
const IRON_CHARM = { id:'IRON_CHARM', name:'Iron Charm', icon:'🧿', armor:3, cost:90, stoneCost:20 };
const SWIFT_FEATHER = { id:'SWIFT_FEATHER', name:'Swift Feather', icon:'🪶', str:1, dex:2, int:1, cost:85 };
const BARRICADE_ITEM = { id:'BARRICADE_ITEM', name:'Barricade', icon:'🚧', cost:0, woodCost:600, stoneCost:300, isBarricade:true };
// MEDICAL-SHOP-01 (1.6.82) — see HISTORY.md § [1.6.82]. Purchased once, held in inventory (never
// equipped to a tower), consumed automatically the moment it would otherwise matter.
const BANDAGE_ITEM = { id:'BANDAGE_ITEM', name:'Bandage', icon:'🩹', cost:40, healLives:3, isMedical:true };
const FIRST_AID_ITEM = { id:'FIRST_AID_ITEM', name:'First Aid Kit', icon:'🧰', cost:110, healFraction:0.5, isMedical:true };
const DEFIBRILLATOR_ITEM = { id:'DEFIBRILLATOR_ITEM', name:'Defibrillator', icon:'⚡', cost:250, isMedical:true, isRevive:true };
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
  ['GLASS_MARBLE', 'Glass Marble', '🔮', 'COMMON', { int: 2 }],
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
  ['LIGHTNING_BOLT', 'Lightning Bolt', '⚡', 'RARE', { dex: 4, str: 2 }],
  ['CHAMPION_MEDAL', 'Champion Medal', '🏅', 'RARE', { str: 2, dex: 2, int: 2 }],
  ['PHOENIX_EMBER', 'Phoenix Ember', '♨️', 'EPIC', { str: 4, int: 4 }],
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
function findCraftableRecipeFor(equippedItems, cook){
  const heldIds = equippedItems.map(item => item.id);
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
    const index = tower.equippedItems.findIndex(item => item.id === ingredientId);
    if(index !== -1) itemLogReleased(tower.equippedItems.splice(index, 1)[0], 'consumed by crafting');
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
   GAME STATE
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
  merchantBoughtIds.add(index); playSound('click'); updateInspectPanel(); updateHUD();
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
  if(!MAX_ONE_PER_BOARD_TYPES.includes(type)) return true;
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
function producerCostLabel(cost){ return '💰' + cost.gold + ' 🪵' + cost.wood + ' 🪨' + cost.stone; }
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
function savePrefs(){
  const started = performance.now();
  try{
    const payload = JSON.stringify({ manualRenderScaleStep:!autoRenderScaleEnabled ? renderScaleStep : undefined, graphicsQuality, goreMode, bloodDropletsEnabled, hacksEnabled, isMuted, audioMasterVolume, audioMusicVolume, audioSfxVolume, showFpsCounter, screenShakeEnabled, screenShakeUserSet, frameCapEnabled, frameCapFps: frameCapFpsUser === null ? undefined : frameCapFpsUser, autoRenderScaleEnabled, autoRenderScaleChoiceMade: autoRenderScaleUserSet ? true : undefined, lowFpsOfferAnswered, renderScaleFloorPercent: renderScaleFloorUserSet ? renderScaleFloorPercent : undefined, debugOverlay, autoCameraPans, decalBudgetOverride });
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
  const presets = [700, 2100, 1500, 2500];
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
    sel.value = graphicsQuality === 'low' ? '700' : '2100';
  }
  sel.addEventListener('change', applyFromControls);
  customInput.addEventListener('input', applyFromControls);
})();
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
let waveTimer = 0, countdownBeatPlayed = -1;
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
  const item = { id: idCounter++, x: landing.x, y: landing.y, itemDef: makeItemInstance(itemDef, source), spawnTime: presentationTime };
  if(!PREFERS_REDUCED_MOTION && (landing.x !== x || landing.y !== y)){ item.flyFromX = x; item.flyFromY = y; item.flyStart = presentationTime; item.flyDur = 520; }
  if(item.itemDef.isGoldBag) item.goldBagLifespanMs = GOLD_BAG_LIFESPAN_MS;
  groundItems.push(item);
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
function dropItemsFromEnemy(enemy){
  if(enemy.isGuardian || enemy.isHutBuilding) return;
  if(!firstMapScrollDropped){
    firstTenEnemyKillCount++;
    if(firstTenEnemyKillCount >= FIRST_MAP_DROP_KILL){
      firstMapScrollDropped = true;
      spawnGroundItem(enemy.x, enemy.y - 8, FIRST_MAP_SCROLL_ITEM, 'early enemy');
      showToast('Map found. Click it for a free expansion.');
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
  showToast('Items can be dragged onto a stickman. Click a carried consumable to use it.');
  trackGameEvent('item_guide_shown', {});
}
function closeItemGuide(){
  document.getElementById('item-guide-modal').classList.add('hidden');
  if(itemGuidePausedGame){ itemGuidePausedGame = false; resumeGame(); }
  playSound('ui_close');
}
let draggingGroundItem = null; // the ground item currently being dragged, or null
let dragItemPos = { x:0, y:0 }; // current world-space position of the item while dragging, for rendering it under the cursor
// ITEM-MOVE-01 (1.6.104) — see HISTORY.md § [1.6.104]. A dragged ground item can be set down anywhere on the map,
// but only inside the reach (targeting range circle) of at least one fighting stickman. Outside every circle the
// item slides to the nearest point on the closest circle's edge; with no stickman to reach it, it cannot move.
const ITEM_DROP_SNAP_RADIUS=16;
function itemDropTargetAt(point){
  let nearest=null,nearestDistSquared=ITEM_DROP_SNAP_RADIUS*ITEM_DROP_SNAP_RADIUS;
  for(const tower of towerPool){
    if(!tower.active || isStructureType(tower.type)) continue;
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
function drawMarkedTargetIcon(ctx){
  const enemy=markedTargetEnemy;
  if(!enemy || !enemy.active || enemy.pinPaintedId!==enemy.id || !Number.isFinite(enemy.pinTopDeviceY)) return;
  const size=Math.round(enemy.radius*1.1+10),devicePx=size*camera.zoom*dprValue;
  const bucket=Math.max(0,Math.ceil(Math.log(devicePx/EMOJI_SPRITE_MIN_PX)/EMOJI_SPRITE_LOG_STEP-1e-6));
  const sprite=emojiSpriteFor('📌',bucket),paint=markedSpritePixels(sprite),scale=size*camera.zoom*dprValue/sprite.fontPx;
  const tipX=(paint.tipX+0.5)*scale,tipY=(paint.tipY+0.5)*scale;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(sprite,enemy.pinCenterDeviceX-tipX,Math.floor(enemy.pinTopDeviceY)+dprValue-tipY,sprite.side*scale,sprite.side*scale);
  ctx.restore();
}
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
function recordNotification(message, explanation, enemyTypes){
  if(!introTextEnabled) return null;
  const entry = { id: ++notificationIdSequence, message: notificationTitle(message), explanation: explanation || (notificationTitle(message) !== message ? message : defaultNotificationExplanation(message)), read: false };
  if(enemyTypes && enemyTypes.length) entry.enemyTypes = enemyTypes.slice();
  notificationHistory.push(entry);
  if(notificationHistory.length > 60) notificationHistory.shift();
  renderNotificationPanel();
  return entry.id;
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
function showToast(message, color, explanation, existingNotificationId){
  const notificationId = existingNotificationId || recordNotification(message, explanation);
  if(waveSummaryActive){ pendingToastMessages.push({ message, notificationId }); return; }
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
  while(tower.nextStreakTier < KILLSTREAK_TIERS.length && tower.killStreak >= KILLSTREAK_TIERS[tower.nextStreakTier].count){
    showKillstreakBanner(KILLSTREAK_TIERS[tower.nextStreakTier].label);
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
const FIT_MAX_ZOOM = 2.1; // START-ZOOM-01 (1.6.123, set to the owner's preferred view 1.6.154) — see HISTORY.md § [1.6.154]. The automatic fit opens at 2.1x (the owner's chosen start view, between 2.7x which was too close and 0.9x which was too far), smaller only if the screen cannot fit the opening area; the player zooms from there
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
function startWaveStartCameraPan(){
  if(!waypointsPx || !waypointsPx.length) return;
  cameraFollow = null;
  panInertia.active = false;
  roundEnemyFollow = { enemy: null, serial: 0, lastClock: cameraPanClock };
  const spawn = waypointsPx[0];
  const targetZoom = Math.max(camera.zoom, 1.2); // guaranteed minimum close-up, never zooms OUT from wherever the player already is — same idea as the tower-follow zoom guarantee, slightly less aggressive since this is a broader "here's where the wave is coming from" glance, not a close look at one tower
  waveStartCameraPan = {
    panStartTime: cameraPanClock, panStartX: camera.x, panStartY: camera.y, panStartZoom: camera.zoom,
    targetZoom, targetX: CANVAS_W/2 - spawn.x*targetZoom, targetY: CANVAS_H/2 - (spawn.y - 78)*targetZoom
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
/* =========================================================
   BLOOD, DECALS AND FORENSIC SPATTER
   ========================================================= */
const MAX_DECALS = 2100; // 1.7.144: requested high graphics default
const MAX_DECALS_LOW_QUALITY = 700; // 1.7.144: requested low graphics default
// CA476 — see HISTORY.md § [1.5.7] Code Archaeology, CA476
function decalCapacity(){
  if(Number.isFinite(decalBudgetOverride) && decalBudgetOverride >= 0) return Math.floor(decalBudgetOverride);
  return graphicsQuality === 'low' ? MAX_DECALS_LOW_QUALITY : MAX_DECALS;
}
const decals = [];
// Optional airborne spray lands in a separate short-lived budget, never evicting ground signatures.
const sprayDecals = [], SPRAY_DECAL_LIFE_MS = 90000;
let sprayDecalIndex = 0;
function sprayDecalCapacity(){ return decalCapacity() === 0 ? 0 : (graphicsQuality === 'low' ? 80 : 240); }
function pushSprayDecal(decal){
  const capacity = sprayDecalCapacity();
  if(!goreMode || !bloodDropletsEnabled || capacity <= 0) return;
  decal.lifespan = bloodMarkLifespan();
  if(waveState==='IDLE' && wavesCompleted>0){decal.cleanupStarted=true;decal.lifespan=18000;decal.spawnTime=presentationTime-12000;}
  if(sprayDecals.length < capacity) sprayDecals.push(decal);
  else { sprayDecalIndex %= capacity; sprayDecals[sprayDecalIndex] = decal; sprayDecalIndex = (sprayDecalIndex+1)%capacity; }
}
function maintainSprayDecals(){
  if(!goreMode || !bloodDropletsEnabled){ sprayDecals.length=0; sprayDecalIndex=0; return; }
  let write=0;
  for(let read=0;read<sprayDecals.length;read++) if(presentationTime-sprayDecals[read].spawnTime < sprayDecals[read].lifespan) sprayDecals[write++]=sprayDecals[read];
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
// CA477 — see HISTORY.md § [1.5.7] Code Archaeology, CA477
let lastDecalExpirySweep = 0;
// Full-array expiry and settled-bake maintenance is bounded by the decal cap.
// Running this sweep every 2s instead of twice per second cuts maintenance scans
// by 75%; visible decals still render every frame and retain their exact lifetimes.
const DECAL_EXPIRY_SWEEP_INTERVAL = 2000;
// CA478 — see HISTORY.md § [1.5.7] Code Archaeology, CA478
let blowingLeaves = [];
function spawnLeafGust(){
  // CA479 — see HISTORY.md § [1.5.7] Code Archaeology, CA479
  if(blowingLeaves.length > 20) return;
  const count = 3 + Math.floor(Math.random()*3); // 3-5 leaves
  const glyph = wavesCompleted >= 20 ? '🍂' : '🍃'; // one glyph for the whole gust — see comment above
  for(let i=0; i<count; i++){
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -30 : CANVAS_W + 30;
    const dirX = fromLeft ? 1 : -1;
    blowingLeaves.push({
      glyph,
      x: startX, y: 40 + Math.random()*(CANVAS_H*0.5),
      vx: dirX*(220 + Math.random()*140), vy: 30 + Math.random()*30, // px/sec — was 30-70 (took 30-60+ seconds to cross), far too slow for "leave the screen fast"; now a real gust that clears out in a few seconds
      rot: Math.random()*360, rotSpeed: (Math.random()*2-1)*60, // deg/sec, gentle tumble
      // CA480 — see HISTORY.md § [1.5.7] Code Archaeology, CA480
      swayAmp: 8 + Math.random()*14, swayFreq: 0.4 + Math.random()*0.6, swayPhase: Math.random()*Math.PI*2,
      size: 16 + Math.random()*9, // per-leaf size variance instead of one flat 20px for every leaf
      spawnedAt: gameTime + i*400 // staggered, not all at once
    });
  }
}
function updateAndDrawBlowingLeaves(ctx){
  if(gameState !== 'PLAYING') return;
  if(!blowingLeaves.length) return;
  const dtSec = Math.min(0.1, (gameTime - (updateAndDrawBlowingLeaves._lastGameTime ?? gameTime)) / 1000);
  updateAndDrawBlowingLeaves._lastGameTime = gameTime;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(let i=blowingLeaves.length-1; i>=0; i--){
    const leaf = blowingLeaves[i];
    if(gameTime < leaf.spawnedAt) continue; // staggered start
    leaf.x += leaf.vx*dtSec; leaf.y += leaf.vy*dtSec; leaf.rot += leaf.rotSpeed*dtSec;
    if(leaf.x < -50 || leaf.x > CANVAS_W+50 || leaf.y > CANVAS_H+50){ blowingLeaves.splice(i,1); continue; }
    // CA481 — see HISTORY.md § [1.5.7] Code Archaeology, CA481
    const edgeFade = clampNum(Math.min(leaf.x-(-50), (CANVAS_W+50)-leaf.x, (CANVAS_H+50)-leaf.y)/55, 0, 1);
    ctx.globalAlpha = 0.75 * edgeFade;
    const swayX = Math.sin((gameTime-leaf.spawnedAt)/1000 * leaf.swayFreq*Math.PI*2 + leaf.swayPhase) * leaf.swayAmp;
    // CA482 — see HISTORY.md § [1.5.7] Code Archaeology, CA482
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
const deathAnims = []; // lightweight, fully decoupled from Enemy/enemyPool — a corpse gets a brief
const deathAnimPool = []; // PERF-DEATH-02 (1.6.21) — reuse tiny transient records across death bursts
function spawnDeathAnim(x, y, emoji, radius){
  const anim = deathAnimPool.pop() || {};
  anim.x = x; anim.y = y; anim.emoji = emoji; anim.radius = radius;
  anim.startTime = presentationTime; anim.duration = 220;
  deathAnims.push(anim);
}
// CA484 — see HISTORY.md § [1.5.7] Code Archaeology, CA484
const BARRICADE_CHUNK_GRAVITY = 900;   // px/s^2
const BARRICADE_CHUNK_LIFE_MS = 1100;
const BARRICADE_RUBBLE_LIFESPAN = 90000; // timber/stone lies in the dirt for ~90s, then fades out over its final 10% — cut down from 5 minutes: a hut fight (16x a normal enemy's HP, so many more hits land over its lifetime than a 10-HP barricade ever takes) was piling up rubble far faster than it could clear, and the pieces are explicitly protected from the decal-cap eviction that recycles everything else (see pushDecal()'s isEmojiDrop skip), so nothing else was ever going to thin them out either
const barricadeChunks = Array.from({ length: 64 }, () => ({ active:false }));
let barricadeChunkIndex = 0;
function spawnBarricadeChunk(x, y, isStone){
  const chunk = barricadeChunks[barricadeChunkIndex];
  barricadeChunkIndex = (barricadeChunkIndex + 1) % barricadeChunks.length;
  // CA485 — see HISTORY.md § [1.5.7] Code Archaeology, CA485
  const angle = Math.random() * Math.PI * 2;
  const speed = 60 + Math.random() * 120;
  chunk.active = true;
  chunk.x = x; chunk.y = y;
  chunk.vx = Math.cos(angle) * speed;
  chunk.vy = Math.sin(angle) * speed * 0.6; // squashed vertically for the game's shallow top-down perspective
  chunk.lift = 0; chunk.liftV = 90 + Math.random() * 130;
  chunk.rot = Math.random() * Math.PI * 2;
  chunk.spin = (Math.random() - 0.5) * 9;
  chunk.char = isStone ? '🪨' : '🪵';
  chunk.size = (isStone ? 6 : 7) + Math.random() * 3;
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
        pushDecal({
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
  // CA486 — see HISTORY.md § [1.5.7] Code Archaeology, CA486
  severity = severity === undefined ? 0.4 : Math.max(0, Math.min(1, severity)); // callers that don't pass severity (e.g. the Archer puncture-wound gush) keep their previous moderate default
  const dropCount = 1 + Math.round(severity * 7); // bigger hit relative to the target's max HP = more drops, proportionally — from a single drop for a scratch up to 8 for a near-fatal blow
  for(let i=0; i<dropCount; i++){
    spawnSatelliteDrops(x + (Math.random()-0.5)*10, y + (Math.random()-0.5)*7, color, 1);
  }
}
let decalIndex = 0;
const SETTLED_DECAL_REBUILD_MIN_MS = 10000;
let settledDecalRebuildPending = false;
let lastSettledDecalRebuild = 0;
// CA487 — see HISTORY.md § [1.5.7] Code Archaeology, CA487
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
// CA488 — see HISTORY.md § [1.5.7] Code Archaeology, CA488
function bloodPoolSizeScale(enemyRadius){
  return clampNum(enemyRadius / 15, 0.45, 2.2);
}
function getBloodProfile(enemyType){
  // CA489 — see HISTORY.md § [1.5.7] Code Archaeology, CA489
  if(enemyType === 'SWARM' || enemyType === 'SPLITTER' || enemyType === 'SPLITMINI'){
    return { bright:'#8bc34a', dark:'#4a7c1f', spray:'#cddc39', isDust:false, viscous:true }; // insect hemolymph
  }
  if(enemyType === 'ZOMBIE'){
    // CA490 — see HISTORY.md § [1.5.7] Code Archaeology, CA490
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
  return { bright:'#c0392b', dark:'#a3241a', spray:'#ff2020', isDust:false, viscous:false }; // standard flesh — dark tone lightened from #7a0f0f (was reading near-black once pooled/layered); still a clear shade step down from bright, just not muddy
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
// CA491 — see HISTORY.md § [1.5.7] Code Archaeology, CA491
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
  if(sourceTower.type === 'CLERIC' || sourceTower.type === 'POPE') return 'HOLY'; // was falling through to the generic 'WARRIOR' default (a melee cut-and-arc treatment) despite Cleric being neither melee nor physically striking anything — its curse kills deserve their own identity, not a borrowed one
  if(sourceTower.type === 'SNAPCASTER') return 'MAGE'; // same override shape as Bomber/Cleric above — SnapCaster is ARCHER-archetype for DEX-based stat scaling, but it's still visually a magic bolt from a staff, not an arrow; its kills should read as Mage's cone, not Archer's puncture mark
  return CLASS_ARCHETYPE[sourceTower.type] || 'WARRIOR';
}
// CA492 — see HISTORY.md § [1.5.7] Code Archaeology, CA492
function resolveWeaponSubtype(sourceTower){
  if(!sourceTower) return 'BLADE';
  if(sourceTower.type === 'HAMMERMAN' || sourceTower.type === 'PALADIN') return 'BLUNT';
  if(sourceTower.type === 'SPEARMAN' || sourceTower.type === 'LANCER') return 'PIERCE';
  return 'BLADE'; // Swordsman, Axeman, Berserker
}
// BLOOD-LEAN-01 (1.7.71): owner said there was too much micro blood and asked for something more efficient that is still realistic and impressive. Every blood particle that settled
// used to leave its own stain, so one blade hit left about a dozen specks, plus five to eight more per cast-off arc. Now about a third of settling droplets stain, each a little
// bigger, a cast-off arc is two to four larger drops, and big pools are a little more common, so the same fight leaves fewer, bolder marks and uses far fewer decals.
const BLOOD_SETTLE_STAIN_SHARE = 0.35, BLOOD_SETTLE_STAIN_SIZE = 1.6, BLOOD_BIG_POOL_CHANCE = 0.04, BLOOD_MID_POOL_CHANCE = 0.16;
const BLOOD_ARC_MIN_DROPS = 2, BLOOD_ARC_EXTRA_DROPS = 3, BLOOD_ARC_DROP_SIZE = 1.3;
function spawnDecal(x, y, color, smallBias, biasAngle, archBias, viscous, dmgRollT, sizeScale, victim, transientSpray){
  const roll = Math.random();
  let sizeMult, blobCount;
  // CA493 — see HISTORY.md § [1.5.7] Code Archaeology, CA493
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
  // CA494 — see HISTORY.md § [1.5.7] Code Archaeology, CA494
  if(viscous) blobCount = Math.max(2, Math.round(blobCount * 0.6));
  // CA495 — see HISTORY.md § [1.5.7] Code Archaeology, CA495
  const elong = archBias === 'ARCHER' ? { longMin:1.3, longSpan:1.5, shortMin:0.28, shortSpan:0.32 }
              : archBias === 'MAGE' ? { longMin:1.35, longSpan:0.75, shortMin:0.6, shortSpan:0.45 }
              : archBias === 'EXPLOSIVE' ? { longMin:0.85, longSpan:0.35, shortMin:0.75, shortSpan:0.35 }
              : archBias === 'BLUNT' ? { longMin:0.55, longSpan:0.45, shortMin:0.62, shortSpan:0.48 }
              : archBias === 'PIERCE' ? { longMin:1.15, longSpan:0.9, shortMin:0.32, shortSpan:0.35 }
              : { longMin:0.75, longSpan:1.15, shortMin:0.42, shortSpan:0.58 };
  if(archBias === 'MAGE') sizeMult *= 1.75;
  else if(archBias === 'ARCHER') sizeMult *= 0.65;
  else if(archBias === 'BLUNT') sizeMult *= 1.25; // a crushing blow spreads wider underfoot
  else if(archBias === 'PIERCE') sizeMult *= 0.85; // deep but narrow — not a wide pool
  // CA496 — see HISTORY.md § [1.5.7] Code Archaeology, CA496
  sizeMult = Math.min(sizeMult, 3.2);
  // CA497 — see HISTORY.md § [1.5.7] Code Archaeology, CA497
  if(dmgRollT !== undefined) sizeMult *= 0.7 + dmgRollT*0.6;
  // CA498 — see HISTORY.md § [1.5.7] Code Archaeology, CA498
  if(sizeScale !== undefined) sizeMult *= sizeScale;
  const orientAngle = biasAngle !== undefined ? biasAngle + (Math.random()-0.5)*0.9 : Math.random()*Math.PI*2;
  let stretchLong = elong.longMin + Math.random()*elong.longSpan;   // elongation along the main spatter axis
  let stretchShort = elong.shortMin + Math.random()*elong.shortSpan; // narrowness across it — independent of stretchLong
  // CA499 — see HISTORY.md § [1.5.7] Code Archaeology, CA499
  if(viscous){ stretchLong = stretchLong*0.5 + 0.5; stretchShort = stretchShort*0.5 + 0.5; }
  const cosA = Math.cos(orientAngle), sinA = Math.sin(orientAngle);
  const blobs = [];
  for(let i=0; i<blobCount; i++){
    const a = Math.random()*Math.PI*2;
    const distT = Math.pow(Math.random(), viscous ? 2.4 : 1.4); // viscous pools hold their blobs tighter to the center — less scatter, thicker fluid doesn't fling as far even at rest
    const localX = Math.cos(a) * distT * 10 * stretchLong;
    const localY = Math.sin(a) * distT * 10 * stretchShort;
    const dx = (localX*cosA - localY*sinA) * sizeMult;
    const dy = (localX*sinA + localY*cosA) * sizeMult;
    // CA500 — see HISTORY.md § [1.5.7] Code Archaeology, CA500
    const r = (Math.random() < 0.2 ? 2.8 + Math.random()*2.4 : 1.2 + Math.random()*2.2) * sizeMult;
    if(victim && !(victim.bloodProfile && victim.bloodProfile.isDust) && bloodDecalBlocked({x:x+dx,y:y+dy,width:r*2,rgb:parseColorToRgba(color),angle:orientAngle},x,y,victim,victim.radius*1.1)) continue;
    blobs.push({ dx, dy, r });
  }
  if(!blobs.length) return; // all pool blobs were intercepted: keep the void clear
  // CA501 — see HISTORY.md § [1.5.7] Code Archaeology, CA501
  let footprintRadius = 0;
  for(const b of blobs) footprintRadius = Math.max(footprintRadius, Math.hypot(b.dx, b.dy) + b.r);
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime, isLine: false, blobs, footprintRadius };
  if(transientSpray) pushSprayDecal(decal); else pushDecal(decal);
}
function spawnSwordsmanBloodArc(victim, tower){
  if(!goreMode || !tower || !tower.active || tower.type !== 'SWORDSMAN' || victim.isHutBuilding) return;
  const bio = victim.bloodProfile || getBloodProfile(victim.type);
  if(bio.isDust) return;
  const swingRadius = clampNum(Math.hypot(victim.x-tower.x, victim.y-tower.y), victim.radius*1.2, 120);
  spawnCastOffTrail(victim, Math.atan2(victim.y-tower.y, victim.x-tower.x), swingRadius, towerSwingDir(tower), hexToRgba(bloodTintForFire(victim,bio.bright),0.88), WEAPON_BLOOD_PROFILES.SWORDSMAN);
}
// CASTOFF-TANGENT-01 (1.8.5) — see CHANGELOG.md § [1.8.5]: blood flung off a swinging blade leaves along the tangent of the blade's path. Each drop is released from the blade tip's position further along the swing and lands a growing distance down that tangent, so the marks form a curved row beyond the wound on the follow-through side, never a ring around the victim. Stain length follows alpha = asin(W/L): the farther a drop flies, the shallower it lands and the longer the mark.
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
  // CA503 — see HISTORY.md § [1.5.7] Code Archaeology, CA503
  const bodyScale = victim ? bloodPoolSizeScale(victim.radius) : 1; // BLOOD-ARC-WEIGHT-01 (1.7.138)
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
    const travelAngle = angle + (Math.PI/2)*arcDir; // tangent to the arc at this point — the actual direction this specific drop was flung, not radially outward from the wound
    const elongation = 1 + i*0.18; // rounder near the source, progressively more elongated further along the arc
    const decal = { x: px, y: py, color, rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
      isDrop: true, angle: travelAngle, len: (2 + Math.random()*1.5)*elongation*BLOOD_ARC_DROP_SIZE*dropScale, width: (2.2 + Math.random()*1.3)*BLOOD_ARC_DROP_SIZE*dropScale, footprintRadius: (2 + Math.random()*1.5)*elongation*BLOOD_ARC_DROP_SIZE*dropScale };
    if(!bloodDecalBlocked(decal, x, y, victim)) pushDecal(decal);
  }
}
function spawnBloodCastoff(x, y, impactAngle, color, lifespanMult, sizeMult, victim, widthScale){
  // CA504 — see HISTORY.md § [1.5.7] Code Archaeology, CA504
  sizeMult = sizeMult || 1;
  // CA505 — see HISTORY.md § [1.5.7] Code Archaeology, CA505
  const widthMult = 1 + (Math.sqrt(Math.max(0, sizeMult)) - 1);
  const maxLen = (8 + Math.random()*16) * sizeMult;
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*(lifespanMult||2)*decalLifespanVariance(), spawnTime: presentationTime, isLine: true,
    angle: impactAngle + (Math.random()-0.5)*0.7,
    maxLen,
    width: (0.4 + Math.random()*1.6) * (widthScale === undefined ? widthMult : widthScale),
    // CA506 — see HISTORY.md § [1.5.7] Code Archaeology, CA506
    footprintRadius: maxLen
  };
  const blocker = forensicBlockerAlongPath({ originX:x, originY:y, originZ:VOID_BODY_HEIGHT_PX, victim, victimId:victim ? victim.id : undefined, x:x+Math.cos(decal.angle)*maxLen, y:y+Math.sin(decal.angle)*maxLen });
  if(blocker){ stainBloodBlocker(blocker, decal.width*2, decal.rgb, decal.angle); return; } // BLOOD-ALL-VOIDS-01 (1.7.136)
  pushDecal(decal);
}
// CA507 — see HISTORY.md § [1.5.7] Code Archaeology, CA507
const BONE_LIFESPAN = 1080000; // Legacy rock-debris ceiling; round-end cleanup shortens all remains to a six-second fade.
function spawnBoneDebris(x, y, enemyRadius){
  // BONE-SPREAD-01 (1.7.36): the average count stays 1.5 (60% one, 30% two, 10% three) but every bone now has its own size scaled from the enemy
  // (the old 9 px floor made every bone identical) and the spread is even across a disc a little wider than the body instead of piling up in the middle.
  const roll = Math.random(), count = roll < 0.6 ? 1 : roll < 0.9 ? 2 : 3;
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
// CA508 — see HISTORY.md § [1.5.7] Code Archaeology, CA508
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
// CA509 — see HISTORY.md § [1.5.7] Code Archaeology, CA509
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
  // CA510 — see HISTORY.md § [1.5.7] Code Archaeology, CA510
  const decal = { x, y, color:'#1a0505', rgb:{r:26,g:5,b:5}, lifespan: DEBRIS_LIFESPAN*1.4*decalLifespanVariance(), spawnTime: presentationTime,
    isPuncture: true, radius: 1.2 + Math.random()*0.8
  };
  pushDecal(decal);
}
function spawnDripTrail(x, y, color, lifespanMult){
  // CA511 — see HISTORY.md § [1.5.7] Code Archaeology, CA511
  const length = 7 + Math.random()*13;
  const sway = (Math.random()-0.5)*6; // slight wobble as it runs, like real drips following surface texture rather than falling perfectly straight
  const decal = { x, y, color, rgb: parseColorToRgba(color), lifespan: DECAL_LIFESPAN*(lifespanMult||1.6)*decalLifespanVariance(), spawnTime: presentationTime, isDripTrail: true,
    length, sway,
    width: 1 + Math.random()*1,
    footprintRadius: length // same anchor-vs-visual-extent issue as spawnBloodCastoff, just smaller scale
  };
  pushDecal(decal);
}
function spawnSatelliteDrops(x, y, color, count, biasAngle, distMult, victim){
  if(!bloodDropletsEnabled) return;
  const bodyScale = victim ? bloodPoolSizeScale(victim.radius) : 1;
  distMult = (distMult || 1)*bodyScale; // lets a specific caller (Archer's far-flung fine mist) send a droplet well beyond the normal scatter range without changing the default for everyone else
  const rgb = parseColorToRgba(color);
  for(let i=0; i<count; i++){
    const angle = biasAngle !== undefined ? biasAngle + (Math.random()-0.5)*1.4 : Math.random()*Math.PI*2;
    const dist = (6 + Math.random()*16) * distMult;
    // CA512 — see HISTORY.md § [1.5.7] Code Archaeology, CA512
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
  // CA513 — see HISTORY.md § [1.5.7] Code Archaeology, CA513
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
function drawBloodFootprint(ctx,d,color){
      ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.angle);ctx.fillStyle=color;
      ctx.beginPath();ctx.ellipse(-d.len*0.55,0,d.width*0.65,d.width*0.65,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(d.len*0.25,0,d.len*0.65,d.width,0,0,Math.PI*2);ctx.fill();
      if(d.dragLen>0){ctx.strokeStyle=color;ctx.lineWidth=d.width*0.6;ctx.beginPath();ctx.moveTo(-d.len,0);ctx.lineTo(-d.len-d.dragLen,0);ctx.stroke();}ctx.restore();

}
function spawnFootprint(x, y, color, angle, dragMult, bodyScale){
  bodyScale=bodyScale || 1;dragMult=clampNum(dragMult || 1,1,1.8);
  const len=(2+Math.random()*0.6)*bodyScale,width=(1+Math.random()*0.4)*bodyScale;
  pushDecal({x,y,color,rgb:parseColorToRgba(color),lifespan:DECAL_LIFESPAN*0.25,spawnTime:presentationTime,isFootprint:true,angle,len,width,dragLen:(dragMult-1)*2*bodyScale,footprintRadius:len+width});
}
const MAX_WET_BLOOD_CHECKS_PER_TICK = 8;
let wetBloodScanCursor = 0;
function updateWalkingBlood(dt){
  // CA515 — see HISTORY.md § [1.5.7] Code Archaeology, CA515
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
        // CA516 — see HISTORY.md § [1.5.7] Code Archaeology, CA516
        const dragMult = 1 + Math.max(0, (e.wetFeetSteps - (e.wetFeetStepsMax - (e.wetFeetSizeBonus||0)))) * 0.5;
        const heading=Math.atan2(e.vy,e.vx),side=e.bloodFootSide===1 ? -1 : 1;e.bloodFootSide=side;
        const strideSide=side*e.radius*0.22;
        spawnFootprint(e.x-Math.sin(heading)*strideSide,e.y+Math.cos(heading)*strideSide,'rgba('+c.r+','+c.g+','+c.b+','+(0.7*fade).toFixed(2)+')',heading,dragMult,bloodPoolSizeScale(e.radius));
        e.lastBloodFootX=e.x;e.lastBloodFootY=e.y;
      }
      continue;
    }
    // not currently leaving prints — check if standing in fresh blood to pick some up (throttled)
    e.wetCheckTimer = (e.wetCheckTimer||0) - dt;
  }
  // CA515A — stagger expensive decal searches so a crowd of enemies can't all
  // scan the decal history on one tick. The rotating cursor prevents starvation.
  const count = enemyPool.length;
  if(!count) return;
  const start = wetBloodScanCursor % count;
  let visited = 0, checks = 0;
  for(; visited < count && checks < MAX_WET_BLOOD_CHECKS_PER_TICK; visited++){
    const e = enemyPool[(start + visited) % count];
    if(!e.active || e.wetFeetSteps > 0 || e.wetCheckTimer > 0) continue;
    e.wetCheckTimer = 400 + Math.random()*200;
    checks++;
    // CA517 — see HISTORY.md § [1.5.7] Code Archaeology, CA517
    for(let i = decals.length-1; i >= Math.max(0, decals.length-220); i--){
      const d = decals[i];
      if(!isGroundBloodDecal(d)) continue;
      if(presentationTime - d.spawnTime > 7000) continue; // only fresh (still-wet) blood transfers
      // CA518 — see HISTORY.md § [1.5.7] Code Archaeology, CA518
      const pickupRadius = e.radius + 10 + (d.footprintRadius||0);
      const pickupRadiusSq = pickupRadius * pickupRadius;
      const pickupDx = d.x-e.x, pickupDy = d.y-e.y;
      if(pickupDx*pickupDx + pickupDy*pickupDy < pickupRadiusSq){
        // CA519 — see HISTORY.md § [1.5.7] Code Archaeology, CA519
        // BLOOD-GROUND-FIXED-01 (1.7.164): wet feet copy colour; never move or shrink the source puddle.
        // CA520 — see HISTORY.md § [1.5.7] Code Archaeology, CA520
        const sizeBonus = Math.min(3, Math.floor((d.footprintRadius||0) / 12));
        e.wetFeetSteps = e.wetFeetStepsMax = 4 + Math.floor(Math.random()*3) + sizeBonus;
        e.wetFeetSizeBonus = sizeBonus;
        e.wetFeetRgb = d.rgb;
        e.footTrailTimer = 0; e.lastBloodFootX=undefined;e.lastBloodFootY=undefined;
        // CA521 — see HISTORY.md § [1.5.7] Code Archaeology, CA521
        playSound('foot_squelch', e.x, sizeBonus);
        break;
      }
    }
  }
  wetBloodScanCursor = (start + Math.max(1, visited)) % count;
}
// CA522 — see HISTORY.md § [1.5.7] Code Archaeology, CA522
const BLOOD_SATURATION_RADIUS = 26;
const BLOOD_SATURATION_MAX = 10;
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
      if(count >= BLOOD_SATURATION_MAX) return true;
    }
  }
  return false;
}
function pushDecal(decal){
  if(isGroundBloodDecal(decal)) decal.lifespan=bloodMarkLifespan();
  if(waveState==='IDLE' && wavesCompleted>0){decal.cleanupStarted=true;decal.lifespan=18000;decal.spawnTime=presentationTime-12000;}
  // CA523 — see HISTORY.md § [1.5.7] Code Archaeology, CA523
  if(isGroundBloodDecal(decal) && decal.blobs === undefined && isBloodAreaSaturated(decal.x, decal.y)) return;
  const capacity = decalCapacity();
  if(capacity <= 0) return; // zero is an explicit supported setting
  enforceDecalCapacity();
  if(decals.length < capacity){
    decals.push(decal);
  } else {
    // CA524 — see HISTORY.md § [1.5.7] Code Archaeology, CA524
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
function bloodStainLifeT(stain){ return (presentationTime-stain.bornAt)/(stain.lifespan || DECAL_LIFESPAN); }
function bloodFadeAlpha(t){ return clampNum((1-t)/0.35,0,1); }
function decalLifespanVariance(){
  // CA525 — see HISTORY.md § [1.5.7] Code Archaeology, CA525
  return 1.15 + Math.random()*1.85; // 1.15x to 3.0x
}
// CA527 — see HISTORY.md § [1.5.7] Code Archaeology, CA527
const DECAL_BAKE_MIN_AGE_MS = 12000; // BLOOD-READABILITY-01: fresh detail stays live/sharp longer before cache baking
// FRESH-BLOOD-02 (1.7.122): fresh blood keeps its bright wet red for the first 12% of a stain's life (about 7–11 seconds) and only reaches its dried colour at 60% (about 36–54 seconds), so a fight leaves a readable, forensic record of what happened when.
const BLOOD_WET_END_T = 0.12, BLOOD_DRY_END_T = 0.60;
const DECAL_BAKE_PRESSURE_MIN_AGE_MS = 4000, DECAL_BAKE_PRESSURE_ON = 90, DECAL_BAKE_PRESSURE_OFF = 40; // DECAL-BAKE-PRESSURE-01 (1.7.99) — see HISTORY.md § [1.7.99]
let decalBakePressure = false;
const DECAL_AGING_RESTAMP_MS = 5000;
function decalBakeMinAgeMs(d){ return d.baked || decalBakePressure ? DECAL_BAKE_PRESSURE_MIN_AGE_MS : DECAL_BAKE_MIN_AGE_MS; }
function beginRoundDebrisCleanup(){
  for(const d of decals.concat(sprayDecals)){
    if(d.cleanupStarted) continue;
    d.cleanupStarted=true;
    // Preserve an earlier expiry; enter the existing final fade segment now.
    const remaining=Math.min(6000,Math.max(1,(d.lifespan || DECAL_LIFESPAN)-(presentationTime-d.spawnTime)));
    d.lifespan=remaining*3; d.spawnTime=presentationTime-remaining*2;
    d.baked=false; delete d.settledColor; delete d.settledAlpha;
  }
  for(const entity of [...towerPool,...enemyPool,...sceneryMap.values()]){
    if(!entity.bloodStains) continue;
    for(const stain of entity.bloodStains){
      if(stain.cleanupStarted) continue;
      const remaining=Math.min(6000,Math.max(1,(stain.lifespan||BLOOD_STAIN_LIFE_MS)-(presentationTime-stain.bornAt)));
      stain.cleanupStarted=true;stain.lifespan=remaining*3;stain.bornAt=presentationTime-remaining*2;
    }
    entity.bloodStampKey=null;entity.bloodStainRevision=(entity.bloodStainRevision||0)+1;
  }
  if(settledDecalCanvasReady){ settledDecalContext().clearRect(0,0,WORLD_MAX_W,WORLD_MAX_H); settledDecalHasContent=false; }
  settledDecalRebuildPending=true;
}
function decalLifeT(d){ return (presentationTime - d.spawnTime) / (d.lifespan || DECAL_LIFESPAN); }
function isDecalBakeEligible(d){
  const lifeT = decalLifeT(d);
  const age = presentationTime - d.spawnTime;
  // CA528 — see HISTORY.md § [1.5.7] Code Archaeology, CA528
  if(d.isRubble) return false; // RUBBLE-LIVE-01 (1.7.70): barricade timber and stone is drawn live like bones and skulls, never baked into the settled bitmap, so it stays sharp when zoomed in
  if(d.isEmojiDrop || d.isWorm) return false;
  if(d.isDrop || d.isFootprint) return age >= decalBakeMinAgeMs(d) && lifeT <= 0.60;
  if(d.blobs !== undefined) return age >= decalBakeMinAgeMs(d) && lifeT <= 0.60;
  return false;
}
// Same oxidation curve drawOneDecal() uses for lifeT <= 0.65 (no fade-out inside the bake window).
// FRESH-BLOOD-01 (1.7.36): red-blooded enemies (most of them) show realistic fresh blood: bright red at impact, darkening through dark red to the enemy's own
// shade (the 1.6.159 curve, restored). Enemies whose blood is not red (green, blue, pale and so on) keep their own colour, only lifted a little while wet.
function bloodIsRed(rgb){ return rgb.r >= rgb.g*1.5 && rgb.r >= rgb.b*1.5; }
function agedBloodRgb(d, lifeT){
  const rgb = d.rgb;
  if(!bloodIsRed(rgb)){
    const wetLift = 1 + 0.18*(1 - Math.min(1, Math.max(0, lifeT)*(d.lifespan || DECAL_LIFESPAN)/DECAL_BAKE_MIN_AGE_MS));
    return { r: Math.min(255, Math.round(rgb.r*wetLift)), g: Math.min(255, Math.round(rgb.g*wetLift)), b: Math.min(255, Math.round(rgb.b*wetLift)) };
  }
  if(lifeT < BLOOD_WET_END_T){
    const t = lifeT / BLOOD_WET_END_T;
    return { r: Math.round(255 + (175-255)*t), g: Math.round(40 + (32-40)*t), b: Math.round(40 + (30-40)*t) };
  }
  const t = Math.min(1, (lifeT - BLOOD_WET_END_T) / (BLOOD_DRY_END_T - BLOOD_WET_END_T));
  return { r: Math.round(175 + (rgb.r-175)*t), g: Math.round(32 + (rgb.g-32)*t), b: Math.round(30 + (rgb.b-30)*t) };
}
function agedBloodColor(d, lifeT){
  const c = agedBloodRgb(d, lifeT);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + d.rgb.a + ')';
}
function stampSettledDebris(sctx, d){
  sctx.save();
  sctx.globalAlpha=1;sctx.fillStyle='#d8c6a6';
  sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
  sctx.font = Math.round(d.size) + 'px serif';
  sctx.translate(d.x, d.y);
  sctx.rotate(d.rot);
  sctx.fillText(d.char, 0, 0);
  sctx.restore();
}
function drawBloodDrop(ctx,d,color){
  const width=d.width, len=Math.max(width*0.5,d.len);
  ctx.save();ctx.fillStyle=color;ctx.translate(d.x,d.y);ctx.rotate(d.angle);
  ctx.beginPath();ctx.ellipse(0,0,len,width*0.5,0,0,Math.PI*2);ctx.fill();
  if(len>width*0.65){
    ctx.beginPath();ctx.moveTo(len*0.65,-width*0.28);
    ctx.quadraticCurveTo(len*1.05,-width*0.14,len*1.22,0);
    ctx.quadraticCurveTo(len*1.05,width*0.14,len*0.65,width*0.28);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function stampSettledDrop(sctx,d){drawBloodDrop(sctx,d,agedBloodColor(d,decalLifeT(d)));}
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
  settledDecalRebuildPending = false;
  lastSettledDecalRebuild = presentationTime;
  const timing = extendedDiagnostics.decalRebuilds, elapsed = performance.now()-rebuildStarted;
  timing.count++; timing.totalMs += elapsed; timing.maxMs = Math.max(timing.maxMs,elapsed);
  timing.lastMs = elapsed; timing.lastStamps = stampCount;
  if(elapsed > 8) timing.over8ms++;
}
// CA530 — see HISTORY.md § [1.5.7] Code Archaeology, CA530
function sweepSettledDecals(expiredBakedCount){
  if(!settledDecalCanvasReady) return;
  let sctx = null;
  let agingDropBaked = false;
  let liveBloodCount = 0;
  if(expiredBakedCount > 0) settledDecalRebuildPending = true;
  for(const d of decals){
    if(!d.baked && (d.isDrop || d.isFootprint || d.blobs !== undefined)) liveBloodCount++;
    const eligible = isDecalBakeEligible(d);
    if(eligible && !d.baked){
      if(!sctx) sctx = settledDecalContext();
      stampSettledDecal(sctx, d);
      settledDecalHasContent = true;
      d.baked = true;
    } else if(!eligible && d.baked){
      settledDecalRebuildPending = true;
    }
    if(d.baked && (d.isDrop || d.isFootprint || d.blobs !== undefined) && decalLifeT(d) < BLOOD_DRY_END_T) agingDropBaked = true;
  }
  decalBakePressure = liveBloodCount >= (decalBakePressure ? DECAL_BAKE_PRESSURE_OFF : DECAL_BAKE_PRESSURE_ON);
  const sinceRebuild = presentationTime - lastSettledDecalRebuild;
  if((settledDecalRebuildPending && sinceRebuild >= SETTLED_DECAL_REBUILD_MIN_MS) || (agingDropBaked && sinceRebuild >= DECAL_AGING_RESTAMP_MS)) rebuildSettledDecalCanvas();
}
function maintainDecals(){
  enforceDecalCapacity();
  maintainSprayDecals();
  // CA531 — see HISTORY.md § [1.5.7] Code Archaeology, CA531
  if(presentationTime - lastDecalExpirySweep >= DECAL_EXPIRY_SWEEP_INTERVAL){
    lastDecalExpirySweep = presentationTime;
    let expiredBakedCount = 0;
    // Compact once instead of splicing once per expired entry; repeated splices shift the
    // remaining array each time and can turn a synchronized expiry into quadratic cleanup.
    let write = 0;
    const originalLength = decals.length;
    for(let read = 0; read < originalLength; read++){
      const d = decals[read];
      const age = presentationTime - d.spawnTime;
      const lifespan = d.lifespan || DECAL_LIFESPAN;
      if(age >= lifespan){ if(d.baked) expiredBakedCount++; continue; } // actually expires now, not just capacity-recycled
      decals[write++] = d;
    }
    decals.length = write;
    sweepSettledDecals(expiredBakedCount);
  }
}
// DECAL-CATEGORIES-01 (1.7.36): debris counted by kind (cached once per second) so the debug overlay and log show what is on the board and which drawing path it uses.
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
// SMOOTH-ANIM-01 (1.7.75): draws a projectile between its previous and current tick positions, like enemies. A jump of more than 80 px (a fresh launch or a reused slot) is drawn as is.
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
function drawDecals(ctx){
  const bounds = decalViewBounds();
  perfStats.totalDecals = decals.length + sprayDecals.length;
  perfStats.visibleDecals = 0;
  depthSortedDecalsThisFrame.length = 0;
  if(goreMode && bloodDropletsEnabled) for(const d of sprayDecals) if(presentationTime-d.spawnTime < d.lifespan && decalVisible(d,bounds)){ perfStats.visibleDecals++; drawOneDecal(ctx,d); }
  for(const d of decals){
    if(d.isRubble){
      if((!d.baked || camera.zoom > 1.25) && decalVisible(d,bounds)) drawOneDecal(ctx,d);
      continue;
    }
    if(d.isEmojiDrop || d.isWorm){
      if(decalVisible(d, bounds)) depthSortedDecalsThisFrame.push(d);
      continue;
    }
    if((!d.baked || camera.zoom > 1.25) && decalVisible(d, bounds)){
      perfStats.visibleDecals++;
      drawOneDecal(ctx, d);
    }
  }
}
function decalViewBounds(){
  // CA532 — see HISTORY.md § [1.5.7] Code Archaeology, CA532
  const cullMargin = TILE_SIZE * 1.2;
  return {
    left: (0 - camera.x) / camera.zoom - cullMargin,
    right: (CANVAS_W - camera.x) / camera.zoom + cullMargin,
    top: (0 - camera.y) / camera.zoom - cullMargin,
    bottom: (CANVAS_H - camera.y) / camera.zoom + cullMargin
  };
}
// CA533 — see HISTORY.md § [1.5.7] Code Archaeology, CA533
function visibleWorldRect(){
  const left = Math.max(0, Math.floor(-camera.x / camera.zoom));
  const top = Math.max(0, Math.floor(-camera.y / camera.zoom));
  const right = Math.min(WORLD_MAX_W, Math.ceil((CANVAS_W - camera.x) / camera.zoom));
  const bottom = Math.min(WORLD_MAX_H, Math.ceil((CANVAS_H - camera.y) / camera.zoom));
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
function blitWorldLayer(ctx, layerCanvas, view){
  if(view.width <= 0 || view.height <= 0) return;
  const rasterScale = layerCanvas.width / WORLD_MAX_W;
  ctx.drawImage(layerCanvas,
    view.left * rasterScale, view.top * rasterScale, view.width * rasterScale, view.height * rasterScale,
    view.left, view.top, view.width, view.height);
}
function decalVisible(d, b){ return d.x >= b.left && d.x <= b.right && d.y >= b.top && d.y <= b.bottom; }
// CA534 — see HISTORY.md § [1.5.7] Code Archaeology, CA534
function fxViewBounds(){
  const cullMargin = TILE_SIZE * 2;
  return {
    left: (0 - camera.x) / camera.zoom - cullMargin,
    right: (CANVAS_W - camera.x) / camera.zoom + cullMargin,
    top: (0 - camera.y) / camera.zoom - cullMargin,
    bottom: (CANVAS_H - camera.y) / camera.zoom + cullMargin
  };
}
function fxExtentVisible(x, y, extent, b){
  return x+extent >= b.left && x-extent <= b.right && y+extent >= b.top && y-extent <= b.bottom;
}
function fxVisible(x, y, b){ return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; }
function drawOneDecal(ctx, d){
    const age = presentationTime - d.spawnTime;
    const lifespan = d.lifespan || DECAL_LIFESPAN;
    if(age < 0 || age >= lifespan) return;
    const growT = 1; // no grow-in animation — real blood spatter appears instantaneously on impact, not as a fade/expand effect. A decal now renders at full size the exact frame it spawns.
    const lifeT = age / lifespan;
    // CA535 — see HISTORY.md § [1.5.7] Code Archaeology, CA535
    let color, alpha, r, g, b;
    if(!d.isEmojiDrop && !d.isWorm){
      // CA536 — see HISTORY.md § [1.5.7] Code Archaeology, CA536
      if(lifeT >= BLOOD_DRY_END_T && lifeT <= 0.65 && d.settledColor !== undefined){
        color = d.settledColor;
        alpha = d.settledAlpha;
        const aged = d.settledRgb || (d.settledRgb = agedBloodRgb(d, lifeT)); r=aged.r;g=aged.g;b=aged.b;
      } else {
      // CA537 — see HISTORY.md § [1.5.7] Code Archaeology, CA537
      const rgb = d.rgb;
      const aged = agedBloodRgb(d, lifeT); r = aged.r; g = aged.g; b = aged.b; // FRESH-BLOOD-01 (1.7.36)
      // CA538 — see HISTORY.md § [1.5.7] Code Archaeology, CA538
      const fadeOut = bloodFadeAlpha(lifeT);
      alpha = rgb.a * fadeOut;
      color = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      if(lifeT >= BLOOD_DRY_END_T && lifeT <= 0.65){ d.settledColor = color; d.settledAlpha = alpha; }
      }
    }
    if(d.isFootprint){ // BLOOD-FOOTPRINT-01 (1.7.137)
      drawBloodFootprint(ctx,d,color);
    } else if(d.isPeel){
      ctx.fillStyle = color;
      ctx.beginPath();
      d.points.forEach((p,i) => {
        const px = d.x + p.x*growT, py = d.y + p.y*growT;
        i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      });
      ctx.closePath(); ctx.fill();
      // pale blistered highlight in the center — reads as raw/peeled tissue rather than a blood pool
      ctx.fillStyle = 'rgba(255,220,200,' + (alpha*0.4).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, 2.5*growT, 0, Math.PI*2); ctx.fill();
    } else if(d.isLine){
      ctx.strokeStyle = color;
      ctx.lineWidth = d.width;
      ctx.lineCap = 'round';
      const len = d.maxLen * growT;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + Math.cos(d.angle)*len, d.y + Math.sin(d.angle)*len);
      ctx.stroke();
    } else if(d.isDripTrail){
      // CA539 — see HISTORY.md § [1.5.7] Code Archaeology, CA539
      const len = d.length * growT;
      const midX = d.x + d.sway, midY = d.y + len*0.55;
      const endX = d.x + d.sway*0.4, endY = d.y + len;
      ctx.strokeStyle = color;
      ctx.lineWidth = d.width * (0.55 + growT*0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      if(growT > 0.85){
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(endX, endY, d.width*0.85, 0, Math.PI*2); ctx.fill();
      }
    } else if(d.isPuncture){
      // CA540 — see HISTORY.md § [1.5.7] Code Archaeology, CA540
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.radius*growT, 0, Math.PI*2); ctx.fill();
    } else if(d.isEmojiDrop){
      // CA541 — see HISTORY.md § [1.5.7] Code Archaeology, CA541
      ctx.save();
      // CA542 — see HISTORY.md § [1.5.7] Code Archaeology, CA542
      ctx.globalAlpha = d.isRubble ? clampNum((1 - decalLifeT(d)) / 0.1, 0, 1) : (d.char === '🦴' || d.char === '💀') ? clampNum((1 - decalLifeT(d)) / 0.4, 0, 1) : 1; // skeletal remains fade over their final 40%
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(d.size*growT) + 'px serif';
      ctx.fillStyle='#fff';ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillText(d.char, 0, 0);
      ctx.restore();
    } else if(d.isWorm){
      // CA543 — see HISTORY.md § [1.5.7] Code Archaeology, CA543
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
        ctx.beginPath(); ctx.arc(d.x+b.dx*growT, d.y+b.dy*growT, b.r*growT, 0, Math.PI*2); ctx.fill();
      }
      // CA545 — see HISTORY.md § [1.5.7] Code Archaeology, CA545
      const wetT = lifeT < 0.05 ? 1 - (lifeT/0.05) : 0;
      if(wetT > 0 && d.blobs.length){
        const biggest = d.blobs.reduce((a,b) => b.r > a.r ? b : a);
        ctx.fillStyle = 'rgba(255,255,255,' + (wetT*0.08).toFixed(2) + ')';
        ctx.beginPath();
        ctx.ellipse(d.x+biggest.dx*growT - biggest.r*growT*0.25, d.y+biggest.dy*growT - biggest.r*growT*0.3,
          biggest.r*growT*0.35, biggest.r*growT*0.2, -0.5, 0, Math.PI*2);
        ctx.fill();
      }
      // CA546 — see HISTORY.md § [1.5.7] Code Archaeology, CA546
      const skeletonT = lifeT > 0.3 ? Math.min(0.4,(lifeT-0.3)) : 0;
      if(skeletonT > 0 && d.blobs.length){
        const rimColor = 'rgba(' + Math.round(r*0.78) + ',' + Math.round(g*0.78) + ',' + Math.round(b*0.78) + ',' + (alpha*0.55*skeletonT).toFixed(2) + ')';
        const coreColor = 'rgba(' + Math.round(r*1.12) + ',' + Math.round(g*1.05) + ',' + Math.round(b*1.05) + ',' + (alpha*0.5*skeletonT).toFixed(2) + ')';
        ctx.strokeStyle = rimColor;
        ctx.fillStyle = coreColor;
        for(const b2 of d.blobs){
          const bx = d.x+b2.dx*growT, by = d.y+b2.dy*growT, br = b2.r*growT;
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
  // CA547 — see HISTORY.md § [1.5.7] Code Archaeology, CA547
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
    p.stainsOnSettle = !!pools && Math.random() < BLOOD_SETTLE_STAIN_SHARE; // BLOOD-LEAN-01 (1.7.71): only some droplets that settle leave a stain
  }
}
// CA548 — see HISTORY.md § [1.5.7] Code Archaeology, CA548
function spawnShockring(x, y, color, maxRadius, angle, arcSpan){
  const p = particles[particleIndex];
  particleIndex = (particleIndex+1) % PARTICLE_COUNT;
  p.active = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.gravity = 0;
  p.isGib = false; p.isBlood = false; p.isStream = false; p.isRing = true; p.isBeam = false; p.isSwingArc = false;
  p.life = p.maxLife = 180 + Math.random()*60;
  p.color = color; p.size = maxRadius || 26;
  // CA549 — see HISTORY.md § [1.5.7] Code Archaeology, CA549
  p.ringAngle = angle;
  p.ringArc = arcSpan;
  p.friction = 1; p.canPool = false; p.pooled = false;
}
// CA550 — see HISTORY.md § [1.5.7] Code Archaeology, CA550
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
// CA551 — see HISTORY.md § [1.5.7] Code Archaeology, CA551
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
      p.rotSpeed *= p.friction; // rotational damping — a tumbling object loses angular momentum to drag the same way it loses linear momentum; previously rotSpeed was constant forever, so a gib kept spinning at full speed even once essentially stopped moving
      // CA552 — see HISTORY.md § [1.5.7] Code Archaeology, CA552
      const REST = 0.42; // moderate energy loss — a heavy chunk of debris doesn't bounce like a rubber ball, but isn't fully dead on impact either
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
  // CA553 — see HISTORY.md § [1.5.7] Code Archaeology, CA553
  const roll = -Math.log(Math.max(0.0001, Math.random()));
  return Math.min(4.5, 0.6 + roll * 0.7);
}
function spawnBloodStream(x, y, angle, count, sizeMult, brightColor, darkColor, victim){
  if(!bloodDropletsEnabled) return;
  // CA554 — see HISTORY.md § [1.5.7] Code Archaeology, CA554
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
// GORE-EXPLOSION-01 (1.7.100) — see HISTORY.md § [1.7.100]. A one-hit kill sometimes bursts into a forensic droplet cloud. Each droplet is a small ballistic body (ground x, y and height z) pulled down by
// gravity and slowed by quadratic air drag, F = -k|v|v, with its downward speed held at blood's terminal velocity of 7.65 m/s. On landing the impact angle is alpha = asin(W/L), so a stain's
// length is L = W / sin(alpha): a steep drop leaves a round mark, a shallow one an elongated ellipse pointing along the flight. The stain is a normal drop decal, so it is baked into the persistent
// background layer, and the droplet goes back to its pool slot.
const GORE_EXPLOSION_CHANCE = 0.06, FORENSIC_DROPLET_COUNT = 700, FORENSIC_PX_PER_METER = 28, FORENSIC_GRAVITY_PX = 9.81*FORENSIC_PX_PER_METER;
const FORENSIC_TERMINAL_PX = 7.65*FORENSIC_PX_PER_METER, FORENSIC_DRAG_K = FORENSIC_GRAVITY_PX/(FORENSIC_TERMINAL_PX*FORENSIC_TERMINAL_PX), FORENSIC_MAX_STAIN_ASPECT = 8, FORENSIC_STEP_S = 1/120;
const forensicDroplets = Array.from({ length: FORENSIC_DROPLET_COUNT }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, diameter: 1, color: '#a01818', rgb: null, ageS: 0 }));
let forensicDropletIndex = 0;
// FORENSIC-TERMINAL-02 (1.8.5): terminal speed scales with the square root of drop diameter, so 7.65 m/s is the ceiling for large drops and fine mist hangs and drifts. Drag is F = -k|v|v with k = g / terminal^2 per drop.
const FORENSIC_REFERENCE_DIAMETER_PX = 3, FORENSIC_MIN_TERMINAL_SHARE = 0.3;
function forensicTerminalPxFor(diameterPx){
  return FORENSIC_TERMINAL_PX*clampNum(Math.sqrt(diameterPx/FORENSIC_REFERENCE_DIAMETER_PX), FORENSIC_MIN_TERMINAL_SHARE, 1);
}
// FORENSIC-CLASS-01 (1.8.2): drop size follows launch speed the way bloodstain velocity classes do. Low-speed drops are large, medium-speed drops mid-sized, and anything above blood's 7.65 m/s terminal speed atomizes into a fine mist, so a rifle round throws more and smaller drops than a hammer blow of the same weapon width. Blade cast-off keeps its large drops, because shear off a moving edge does not atomize.
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
// FORENSIC-SPATTER-01 (1.7.126): the droplet physics above only ran for the rare gore explosion (6% of one-hit kills), so a normal fight showed no flying droplets. Every blood-drawing hit now throws a small droplet spray and every kill a larger one, shaped by how the wound was made: a sniper round gives a fast, fine, forward mist; a blunt weapon a medium radial spatter; a blade a cast-off fan along the swing; a spear a narrow forward-and-back jet; other ranged hits a light spray. The same droplets land as elongated stains (alpha = asin(W/L)).
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
  STONE_QUARRY:weaponBloodProfile("NONE",0,0,0,1,0,0,0,0,0)
});
function forensicSpatterProfile(sourceTower, profileKey){
  return WEAPON_BLOOD_PROFILES[profileKey || (sourceTower && sourceTower.type)] || WEAPON_BLOOD_PROFILES.ENVIRONMENT;
}
function weaponBloodAngle(victim, sourceTower, incomingAngle){
  return Number.isFinite(incomingAngle) ? incomingAngle : sourceTower ? Math.atan2(victim.y-sourceTower.y,victim.x-sourceTower.x) : Math.PI/2;
}
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
  for(let i=0;i<profile.marks;i++){
    const t = profile.marks === 1 ? 0.5 : i/(profile.marks-1);
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
  const dropletCount = Math.max(1, Math.round(profile.count*1.18*Math.min(1.4, 0.35 + hitPower*0.7)*killMult*(lowDetail ? 0.4 : 1))); // BLOOD-READABILITY-01 (1.7.140): modest volume increase, existing weight dimensions retained
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
// BLOOD-TRAIL-01 (1.7.128): a wounded animal leaves a trail you can follow. An enemy with an arrow (or any wound) still bleeding, or badly hurt, sheds droplets from the wound as it walks. Each droplet leaves at the enemy's own ground velocity from wound height, so it lands as an elongated stain pointing along the direction of travel (impact angle alpha = asin(W/L)); the gap between drops follows the walking distance, shrinks with more stuck arrows and lower health, and widens as the wound clots. An enemy standing still drips straight down in round drops that build into a pool under it.
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
      if(enemy.trailAccumPx >= spacing){
        enemy.trailAccumPx -= spacing; enemy.trailDropCount++;
        const speedPx = Math.hypot(enemy.vx || 0, enemy.vy || 0), heading = speedPx > 1 ? Math.atan2(enemy.vy, enemy.vx) : Math.atan2(stepY, stepX);
        const woundHeightPx = (0.45 + Math.random()*0.5)*FORENSIC_PX_PER_METER*weightScale, dropDiameter = (1.3 + Math.min(1.6, flow*0.5) + Math.random()*0.8)*dropScale;
        launchForensicDroplet(enemy.x, enemy.y, woundHeightPx, speedPx/FORENSIC_PX_PER_METER, heading + (Math.random() - 0.5)*0.12, 0, dropDiameter, dropColor, enemy);
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
// BLOOD-VOID-01 (1.7.130): a body that stands between a wound and the ground catches the droplets that would have landed behind it, which leaves a clean patch (a void pattern) in the spatter and blood on the body itself. When a droplet lands, the straight line from where it left to where it came down is tested against every stickman, barricade and enemy; if one is in the way and tall enough there, the droplet stains that body and leaves no mark on the ground. An emoji or stickman that blocked a spray stays stained for a few minutes, drying from red to brown and then fading.
const BLOOD_STAIN_MAX = 14, BLOOD_STAIN_LIFE_MS = 75000, BLOOD_STAIN_DRY_RGB = { r: 92, g: 38, b: 28 };
const VOID_BODY_HEIGHT_PX = 1.1*FORENSIC_PX_PER_METER;
function stainEntity(entity, offsetX, offsetY, size, rgb, angle){
  if(!entity.bloodStains) entity.bloodStains = [];
  const stain = { offsetX, offsetY, size, rgb, angle, lifespan:bloodMarkLifespan(), bornAt: presentationTime };
  if(waveState==='IDLE' && wavesCompleted>0){stain.cleanupStarted=true;stain.lifespan=18000;stain.bornAt=presentationTime-12000;}
  entity.bloodStainRevision=(entity.bloodStainRevision || 0)+1;
  if(entity instanceof Tower && isFighterTower(entity)) bindStickmanStain(entity,stain);
  if(entity.bloodStains.length < BLOOD_STAIN_MAX) entity.bloodStains.push(stain);
  else { entity.bloodStainNext = ((entity.bloodStainNext || 0) + 1) % BLOOD_STAIN_MAX; entity.bloodStains[entity.bloodStainNext] = stain; }
}
function drawBloodStains(ctx, entity){
  if(!goreMode || (entity instanceof Tower && isFighterTower(entity))) return;
  if(Number.isFinite(entity.gx) && Number.isFinite(entity.gy)){
    if(!entity.bloodStains || !entity.bloodStains.length) return;
    const size=sceneryVisualSize(entity),emoji=(CONFIG.CHANCE_STRUCTURES[entity.type] || {}).emoji || EVENT_PROP_EMOJI[entity.type] || (entity.type === 'TREE' ? TREE_VARIANT_EMOJI[entity.variant || 0] : entity.type === 'ROCK' ? '🪨' : entity.type === 'BUSH' ? '🪴' : entity.type === 'SUPPLY_CRATE' ? '📦' : entity.type === 'CHEST' ? '🎁' : '🥢');
    ctx.save();ctx.translate(entity.x,entity.y+size*0.5);ctx.scale((entity.flip ? -1 : 1)*(entity.widthStretch || 1),entity.tallStretch || 1);ctx.translate(0,-size*0.5+2);drawEmojiSurfaceBlood(ctx,entity,size,emoji,true);ctx.restore();return;
  }
  const stains = entity.bloodStains;
  if(!stains || !stains.length) return;
  const drawCap = (graphicsQuality === 'low' || underHeavyVisualLoad) ? 6 : BLOOD_STAIN_MAX;
  let live = 0;
  ctx.save();
  for(let index = stains.length - 1; index >= 0 && live < drawCap; index--){
    const stain = stains[index], ageT = bloodStainLifeT(stain);
    if(ageT >= 1) continue;
    live++;
    const rgb = stain.rgb || BLOOD_STAIN_DRY_RGB;
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
  // BLOOD-SURFACES-01 (1.7.135) — see HISTORY.md § [1.7.135]
  for(const tower of towerPool) if(tower.active) consider(tower, tower.type === 'BARRICADE' ? 14 : 10, tower.type === 'BARRICADE' ? 20 : (24*(tower.buildScaleY || 1) + 7)*STICKMAN_SCALE*Math.sqrt(tower.weight)*(tower.isLegendary ? 1.1 : 1), false);
  for(const enemy of enemyPool) if(enemy.active) consider(enemy, enemy.radius*0.8, enemy.radius*2, true);
  for(const item of sceneryMap.values()){
    const size = sceneryVisualSize(item), radius = size*0.4*(item.widthStretch || 1), groundY = item.y + size*0.5;
    if(item.x + radius < Math.min(fromX, droplet.x) || item.x - radius > Math.max(fromX, droplet.x) || groundY + radius < Math.min(fromY, droplet.y) || groundY - radius > Math.max(fromY, droplet.y)) continue;
    consider(item, radius, size*(item.tallStretch || 1), false, groundY);
  }
  for(const cat of catPool) if(cat.active) consider(cat, 12, 18, false);
  for(const skeleton of skeletonPool) if(skeleton.active) consider(skeleton, 8, 30, false);
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
  pushSprayDecal({ x: droplet.x, y: droplet.y, color: droplet.color, rgb: droplet.rgb, lifespan: DECAL_LIFESPAN*decalLifespanVariance(), spawnTime: presentationTime,
    isDrop: true, angle: Math.atan2(droplet.vy, droplet.vx), len: stainLength/2, width: droplet.diameter, footprintRadius: stainLength/2 });
  droplet.active = false;
}
function updateForensicDroplets(dtMs){
  let remainingS = Math.min(dtMs, 100)/1000;
  while(remainingS > 0){
    const stepS = Math.min(FORENSIC_STEP_S, remainingS);
    remainingS -= stepS;
    for(const droplet of forensicDroplets){
      if(!droplet.active) continue;
      droplet.ageS += stepS;
      const speedPx = Math.hypot(droplet.vx, droplet.vy, droplet.vz), dragPerS = droplet.dragK*speedPx;
      droplet.vx -= droplet.vx*dragPerS*stepS; droplet.vy -= droplet.vy*dragPerS*stepS;
      droplet.vz -= (droplet.vz*dragPerS + FORENSIC_GRAVITY_PX)*stepS;
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
   ENTITY CLASSES (continued): particles and gibs
   ========================================================= */
function spawnExpiratedMist(x, y){
  // CA555 — see HISTORY.md § [1.5.7] Code Archaeology, CA555
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
      // CA556 — see HISTORY.md § [1.5.7] Code Archaeology, CA556
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
      // CA557 — see HISTORY.md § [1.5.7] Code Archaeology, CA557
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
const PARTICLE_COUNT = 300, TEXT_COUNT = 100;
const floatingTexts = Array.from({length: TEXT_COUNT}, () => ({active:false,x:0,y:0,text:'',color:'#fff',life:0,maxLife:0}));
let textIndex = 0;
const ITEM_POPUP_LIFE_MS = 1800; // item equip/stored popups stay up long enough to read
function spawnFloatingText(x,y,text,color,lifeMs){
  const t = floatingTexts[textIndex];
  textIndex = (textIndex+1) % TEXT_COUNT;
  t.active = true; t.x = x; t.y = y; t.text = text; t.color = color;
  t.life = t.maxLife = lifeMs || 550;
  t.isIcon = false; t.isXp = false;
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
// CA560 — see HISTORY.md § [1.5.7] Code Archaeology, CA560
function spawnTowerQuip(x,y,text){
  const t = floatingTexts[textIndex];
  textIndex = (textIndex+1) % TEXT_COUNT;
  t.active = true; t.x = x; t.y = y; t.text = text; t.color = '#ffe9a8';
  t.life = t.maxLife = 1800;
  t.isIcon = false;
}
function updateFloatingTexts(frameMs){
  for(const t of floatingTexts){
    if(!t.active) continue;
    t.life -= frameMs;
    if(t.life <= 0){ t.active = false; continue; }
    if(!t.isIcon) t.y -= 22*frameMs/1000; // plain combat text drifts upward; icons stay put and animate in place instead
  }
}
// CA561 — see HISTORY.md § [1.5.7] Code Archaeology, CA561
const COIN_COUNT = 96;
const coinPickups = Array.from({length: COIN_COUNT}, () => ({active:false,x:0,y:0,vx:0,vy:0,value:0,age:0,lifespan:0,z:0,vz:0,airborne:false,flightMs:0}));
let coinIndex = 0, coinPoolMayShrink = false;
// CHEST-FOUNTAIN-01 (1.6.101) — see HISTORY.md § [1.6.101]. A cleared treasure chest throws a fountain of coins

const CHEST_FOUNTAIN_COIN_COUNT = 6; // CHEST-BURST-02 (1.6.110) — see HISTORY.md § [1.6.110]
const COIN_GRAVITY_PX_PER_S2 = 900;
const COIN_EMOJI_PX = 12;
const COIN_PICKUP_MIN_MS = 15000, COIN_PICKUP_MAX_MS = 20000; // COIN-LIFETIME-01 (1.7.36): owner decision — coins stay 15 to 20 seconds before they despawn (was 5 to 15)
// AMBIENT-LOG-STACK-01 (1.7.112) — see HISTORY.md § [1.7.112]: a log pile holds three logs and each tap collects one (a third of the pile's wood)
const AMBIENT_LOG_INTERVAL_MS = 45000, AMBIENT_LOG_WOOD = 15, AMBIENT_LOG_MAX_ON_BOARD = 12, AMBIENT_LOG_STACK_SIZE = 3;
const ambientLogs = [];
let ambientLogElapsedMs = 0;
function maybeSpawnAmbientLog(){
  if(!activeRegion || ambientLogs.length >= AMBIENT_LOG_MAX_ON_BOARD) return false;
  const candidates = [];
  const x0=Math.max(1,activeRegion.x0-4), x1=Math.min(COLS-2,activeRegion.x1+4), y0=Math.max(1,activeRegion.y0-4), y1=Math.min(ROWS-2,activeRegion.y1+4);
  for(let attempt=0;attempt<96;attempt++){
    const gx=x0+Math.floor(Math.random()*(x1-x0+1)),gy=y0+Math.floor(Math.random()*(y1-y0+1)),key=gx+','+gy;
    if(pathCells.has(key) || nearPathTileSet.has(key) || bonusGrassTiles.has(key) || sceneryMap.has(key) || tileHasHut(gx,gy))continue;
    const x=(gx+0.5)*TILE_SIZE,y=(gy+0.5)*TILE_SIZE;
    if(ambientLogs.some(log=>Math.hypot(log.x-x,log.y-y)<TILE_SIZE) || groundItems.some(item=>Math.hypot(item.x-x,item.y-y)<TILE_SIZE))continue;
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
const AMBIENT_LOG_STACK_SLOTS = [[-6, 5], [6, 5], [0, -5]]; // two logs on the ground and one on top
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
    gi.spawnTime = presentationTime - (Number.isFinite(saved.age) ? Math.max(0,Math.min(saved.age,GROUND_ITEM_LIFESPAN)) : 0);
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
    c.age=Number.isFinite(saved.age) ? Math.max(0,Math.min(saved.age,saved.lifespan)) : 0;
    c.lifespan=saved.lifespan; c.vx=0; c.vy=0; c.active=true;
  }
}
// HEART-FLIGHT-01 (1.7.36): hearts rise from a Healing Fountain and fly up to the lives counter so the heal is obvious.
const heartHudFlights = Array.from({length:12},()=>({active:false}));
let heartHudFlightCount = 0;
function launchHeartHudFlights(x, y, count, broken){
  if(PREFERS_REDUCED_MOTION || (gameState!=='PLAYING' && gameState!=='PAUSED') || document.hidden) return;
  const hearts = Math.max(1, Math.min(6, count));
  for(let i = 0; i < hearts; i++){
    const flight = heartHudFlights.find(f => !f.active);
    if(!flight) return;
    flight.x = x*camera.zoom + camera.x + (i - (hearts-1)/2)*10; flight.y = y*camera.zoom + camera.y;
    flight.startWidth = CANVAS_W; flight.startHeight = CANVAS_H; flight.age = -i*90; flight.active = true; flight.broken = !!broken; heartHudFlightCount++;
  }
}
// HEART-BREAK-01 (1.7.74): owner request — when a loose enemy costs a life, a broken heart pops over its head, flies up to the lives counter, and on arrival the counter flashes
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
// HEART-BEAT-01 (1.7.136) — see HISTORY.md § [1.7.136]
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
function launchGoldHudFlight(x,y,icon){
  if(PREFERS_REDUCED_MOTION || (gameState!=='PLAYING' && gameState!=='PAUSED') || document.hidden) return;
  let flight=goldHudFlights.find(f=>!f.active);
  if(!flight){
    flight=goldHudFlights.filter(f=>f.icon===(icon||null)).reduce((a,b)=>!a || a.age<b.age ? a : b,null);
    if(!flight) return;
    flight.count=(flight.count || 1)+1;return;
  }
  flight.x=x*camera.zoom+camera.x;flight.y=y*camera.zoom+camera.y;
  flight.startWidth=CANVAS_W;flight.startHeight=CANVAS_H;
  flight.age=0;flight.count=1;flight.icon=icon||null;flight.active=true;goldHudFlightCount++;lastGoldHudFlightAt=presentationTime;
}
function updateGoldHudFlights(dt){
  if(!goldHudFlightCount) return;
  for(const flight of goldHudFlights) if(flight.active){ flight.age+=dt; if(flight.age>=680){flight.active=false;goldHudFlightCount--;} }
}
function drawGoldHudFlights(ctx){
  if(!goldHudFlightCount) return;
  const canvasRect=getCanvasRect(),target=goldVal.getBoundingClientRect();
  if(!canvasRect.width || !canvasRect.height)return;
  const tx=(target.left+target.width/2-canvasRect.left)*CANVAS_W/canvasRect.width;
  const ty=(target.top+target.height/2-canvasRect.top)*CANVAS_H/canvasRect.height;
  ctx.save();ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
  for(const f of goldHudFlights) if(f.active){
    const t=Math.min(1,f.age/680),p=t*t*(3-2*t),arc=Math.sin(t*Math.PI);
    const startX=f.x*CANVAS_W/f.startWidth,startY=f.y*CANVAS_H/f.startHeight;
    let targetX=tx,targetY=ty;
    if(f.icon==='🪵'){ const r=document.getElementById('buildBtn').getBoundingClientRect(); targetX=(r.left+r.width/2-canvasRect.left)*CANVAS_W/canvasRect.width; targetY=(r.top+r.height/2-canvasRect.top)*CANVAS_H/canvasRect.height; }
    const x=startX+(targetX-startX)*p+arc*18,y=startY+(targetY-startY)*p-arc*38;
    ctx.globalAlpha=t>0.88 ? (1-t)/0.12 : 1;
    ctx.fillStyle='#fff';
    if(f.icon){ ctx.font='20px sans-serif'; ctx.fillText(f.icon,x,y); ctx.font='14px sans-serif'; } // DIAMOND-FLIES-01 (1.7.48): a diamond flies to the gold counter as the gem itself
    else ctx.fillText('🪙',x,y);
    if(f.count>1){ctx.font='bold 10px sans-serif';ctx.fillStyle='#ffe082';ctx.fillText('×'+f.count,x+10,y+8);ctx.font='14px sans-serif';}
  }
  ctx.restore();
}
// GOLD-FLIGHT-CLICK-01 (1.7.36): coins fly up to the gold counter only when the player clicks a coin or opens a bag.
function creditCoin(c, textColor, withFlight){
  if(c.isDiamond){
    // DIAMOND-GOLD-01 (1.7.48): owner decision — a clicked diamond turns into 1 to 100 gold, and nothing else (the permanent passive upgrade is gone), and the gem itself flies up into the gold counter.
    const diamondGold = DIAMOND_MIN_GOLD + Math.floor(Math.random()*(DIAMOND_MAX_GOLD - DIAMOND_MIN_GOLD + 1));
    gold += diamondGold;
    if(withFlight) launchGoldHudFlight(c.x, c.y, '💎');
    spawnFloatingText(c.x, c.y - 34, '+💎' + diamondGold, '#8ee8ff');
    spawnParticles(c.x, c.y, '#8ee8ff', 10);
    playSound('wave');
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
// see HISTORY.md § [1.6.176] Clarify notifications, expansion scenery, and first speed-up, GOLD-BAG-COIN-BURST-01. Bags pay their direct value and emit valued coin pickups.
// EMOJI-HITBOX-01 (1.6.146) — see HISTORY.md § [1.6.146]. Every emoji you can click (bags, coins, ground items, enemies, scenery) is hit exactly where it is drawn: its own square, at the size and centre it is drawn with.
function isWithinEmojiSquare(worldX, worldY, centerX, centerY, emojiPx){
  const half = emojiPx / 2;
  return Math.abs(worldX - centerX) <= half && Math.abs(worldY - centerY) <= half;
}
// GOLD-BAG-ITEM-01 (1.6.157) — see HISTORY.md § [1.6.157]. A gold bag is an ordinary ground item. Clicking it pays directly; unopened bags keep their gold.
const GOLD_BAG_ITEM = { id: 'GOLD_BAG', name: 'Gold Bag', icon: '💰', rarity: 'COMMON', isGoldBag: true };
const GOLD_BAG_LIFESPAN_MS = 180000, DIAMOND_BAG_CHANCE = 0.1, DIAMOND_MIN_GOLD = 1, DIAMOND_MAX_GOLD = 100, COIN_MAX_SCENERY_BOUNCES = 4;
const GOLD_BAG_MIN_GOLD = 1, GOLD_BAG_MAX_GOLD = 100;
const GOLD_BAG_MIN_COINS = 3, GOLD_BAG_MAX_COINS = 9;
const GOLD_BAG_MIN_COIN_VALUE = 1, GOLD_BAG_MAX_COIN_VALUE = 25;
function rollGoldBagGold(){ return GOLD_BAG_MIN_GOLD + Math.floor(Math.random()*(GOLD_BAG_MAX_GOLD-GOLD_BAG_MIN_GOLD+1)); }
function rollGoldBagCoinCount(){ return GOLD_BAG_MIN_COINS + Math.floor(Math.random()*(GOLD_BAG_MAX_COINS-GOLD_BAG_MIN_COINS+1)); }
function rollGoldBagCoinValue(){ return GOLD_BAG_MIN_COIN_VALUE + Math.floor(Math.random()*(GOLD_BAG_MAX_COIN_VALUE-GOLD_BAG_MIN_COIN_VALUE+1)); }
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
  // DIAMOND-CLICK-01 (1.7.42): hovering or sliding over coins collects coins, but a diamond is only ever collected by a deliberate click or tap.
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
      if(!c.isDiamond) creditCoin(c, null, true); // COIN-FADE-FLIGHT-01 (1.7.44): owner decision — a coin that fades out on its own also flies up to the gold counter
      // CA562 — see HISTORY.md § [1.5.7] Code Archaeology, CA562
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
        const blocker = sceneryAtPoint(c.x, c.y); // COIN-BOUNCE-01 (1.6.157): a coin never comes to rest on a tree or rock, where a click meant for it would clear the scenery
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
    // CA563 — see HISTORY.md § [1.5.7] Code Archaeology, CA563
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
      // CA564 — see HISTORY.md § [1.5.7] Code Archaeology, CA564
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
      drawTextSprite(ctx, t.text, t.isXp ? 9 : 13, t.color, t.x, t.y);
    }
  }
  ctx.globalAlpha = 1;
}
/* =========================================================
   STICKMAN RENDERING
   ========================================================= */
// CA565 — see HISTORY.md § [1.5.7] Code Archaeology, CA565
function weaponLenFromScale(minLen, maxLen, weaponScale){
  const t = Math.max(0, Math.min(1, (weaponScale - 1) / 0.6));
  return minLen + t * (maxLen - minLen);
}
// MELEE-SWING-01 (1.7.97) — see HISTORY.md § [1.7.97]
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
// WEAPON-ENCHANT-SYNC-01 (1.7.92) — see HISTORY.md § [1.7.92]
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
// BODY-BLOOD-ATTACH-01 (1.7.137): stains bind to real limb segments and interpolate with the current pose.
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
    const color=agedBloodRgb({rgb:stain.rgb,lifespan:stain.lifespan || DECAL_LIFESPAN},bloodStainLifeT(stain));
    stain.paint='rgb('+color.r+','+color.g+','+color.b+')';stain.paintStep=step;
  }
  return stain.paint;
}
function drawStickmanBloodStains(ctx,owner,headRx,headRy){
  if(!goreMode || !owner || !owner.bloodStains) return;
  const cap=(graphicsQuality==='low' || underHeavyVisualLoad) ? 6 : BLOOD_STAIN_MAX;
  let live=0;
  for(let i=owner.bloodStains.length-1;i>=0 && live<cap;i--){
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
    ctx.fillStyle=bloodStainPaint(stain);ctx.beginPath();ctx.ellipse(x,y,stain.bodySize,stain.bodySize*0.75,stain.angle,0,Math.PI*2);ctx.fill();ctx.restore();live++;
  }
}
function drawEmojiSurfaceBlood(ctx,entity,size,emoji,scenery){
  emoji=emoji || entity.emoji;
  if(!goreMode || !entity.bloodStains || !entity.bloodStains.length) return;
  if(!entity.bloodStains.some(stain=>bloodStainLifeT(stain)<1)){
    entity.bloodStains.length=0; entity.bloodStampKey=null; return; // expired marks never rerasterize an empty mask every 500ms
  }
  const stampKey=entity.bloodStainRevision+':'+emoji+':'+(entity.tallStretch || 1)+':'+(entity.widthStretch || 1)+':'+entity.flip+':'+size+':'+Math.floor(presentationTime/500)+':'+graphicsQuality+':'+underHeavyVisualLoad;
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
      m.globalAlpha=1;if(scenery && entity.type==='BRANCH') drawBranchSprite(m,size,undefined,entity); else if(scenery && entity.type==='STUMP') drawStumpSprite(m,size); else drawEmojiSprite(m,emoji,size);surfacePixels=m.getImageData(0,0,128,128).data;
      m.save();m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,128,128);m.restore();
    }
    let live=0;
    for(let i=entity.bloodStains.length-1;i>=0 && live<cap;i--){
      const stain=entity.bloodStains[i],age=bloodStainLifeT(stain);
      if(age>=1) continue;live++;
      m.globalAlpha=(stain.rgb.a===undefined ? 1 : stain.rgb.a)*0.88*bloodFadeAlpha(age);m.fillStyle=bloodStainPaint(stain);
      const sx=scenery ? (entity.widthStretch || 1)*(entity.flip ? -1 : 1) : 1,sy=scenery ? (entity.tallStretch || 1) : 1;
      let px=stain.offsetX/sx,py=scenery ? (stain.offsetY-size*0.5)/sy+size*0.5-2 : stain.offsetY;
      if(scenery){ // SURFACE-BLOOD-VISIBLE-01 (1.7.140): intercepted drops bind to an opaque glyph pixel, never its empty bounding box.
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
    m.globalAlpha=1;m.globalCompositeOperation='destination-in';if(scenery && entity.type==='BRANCH') drawBranchSprite(m,size,undefined,entity); else if(scenery && entity.type==='STUMP') drawStumpSprite(m,size); else drawEmojiSprite(m,emoji,size);m.restore();entity.bloodStampKey=stampKey;
  }
  ctx.drawImage(canvas,-size*0.9,-size*0.9,size*1.8,size*1.8);
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
// CA566 — see HISTORY.md § [1.5.7] Code Archaeology, CA566
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
// CA567 — see HISTORY.md § [1.5.7] Code Archaeology, CA567
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
      // CA568 — see HISTORY.md § [1.5.7] Code Archaeology, CA568
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
    if(this.attackTimer <= 0 && this.targetEnemy.active){ // re-checked here too — update() above can null/deactivate it, and applyDamage() itself is not safe to call on an inactive enemy
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
// CA569 — see HISTORY.md § [1.5.7] Code Archaeology, CA569
const MAX_ACTIVE_CATS = 24;
const catPool = Array.from({length: MAX_ACTIVE_CATS}, () => new CatCompanion());
// CA570 — see HISTORY.md § [1.5.7] Code Archaeology, CA570
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
const MAX_ACTIVE_SKELETONS = 8; // headroom above what's actually reachable today — MAX_ONE_PER_BOARD_TYPES caps Necromancer itself at one active copy, so at most 4 (tier 3's skeletonCount) can ever exist at once right now — rather than sizing the pool exactly to today's numbers
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
// CA571 — see HISTORY.md § [1.5.7] Code Archaeology, CA571
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
  const at = (along, across) => [handX + dirX*along + perpX*across, handY + dirY*along + perpY*across];
  const guardAt = Math.min(3,bladeLen*0.15), guardHalf = Math.min((big ? 4.2 : 3.1)*thickness,(bladeLen-guardAt)*0.22); // SWORD-PROPORTION-01 (1.7.140)
  // Grip sits at the palm; avoid extending the sword butt toward the elbow.
  ctx.lineCap = 'round'; ctx.strokeStyle = '#6b4930'; ctx.lineWidth = 2.3 * thickness;
  ctx.beginPath(); ctx.moveTo(...at(-Math.min(0.8,bladeLen*0.05), 0)); ctx.lineTo(...at(guardAt - 0.5, 0)); ctx.stroke();
  // soft glow for high-tier blades (a wide translucent stroke, never shadowBlur)
  if(level >= 3 && !lowGfx){
    ctx.strokeStyle = 'rgba(125,211,252,0.3)'; ctx.lineWidth = baseHalf * 2 + 2.2;
    ctx.beginPath(); ctx.moveTo(...at(guardAt, 0)); ctx.lineTo(...at(bladeLen, 0)); ctx.stroke();
  }
  // tapered blade ending in a point
  ctx.fillStyle = level >= 3 ? '#dfe9ee' : '#e6eaee';
  ctx.beginPath();
  ctx.moveTo(...at(guardAt, baseHalf)); ctx.lineTo(...at(shoulderAt, tipHalf)); ctx.lineTo(...at(bladeLen, 0));
  ctx.lineTo(...at(shoulderAt, -tipHalf)); ctx.lineTo(...at(guardAt, -baseHalf));
  ctx.closePath(); ctx.fill();
  if(!lowGfx){
    // bright edge on one side and a darker fuller down the middle give the steel some depth
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.moveTo(...at(guardAt + 1, baseHalf * 0.8)); ctx.lineTo(...at(shoulderAt, tipHalf * 0.8)); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,92,104,0.55)';
    ctx.beginPath(); ctx.moveTo(...at(guardAt + 2, 0)); ctx.lineTo(...at(bladeLen * 0.78, 0)); ctx.stroke();
  }
  // straight crossguard
  ctx.strokeStyle = big ? '#e8b64a' : '#a9afb5'; ctx.lineWidth = Math.min((big ? 2.2 : 1.7)*thickness,(bladeLen-guardAt)*0.12);
  ctx.beginPath(); ctx.moveTo(...at(guardAt, -guardHalf)); ctx.lineTo(...at(guardAt, guardHalf)); ctx.stroke();
  // pommel
  ctx.fillStyle = big ? '#e8b64a' : '#7a5230';
  ctx.beginPath(); ctx.arc(...at(-Math.min(1.2,bladeLen*0.08), 0), Math.min((big ? 1.7 : 1.3)*thickness,bladeLen*0.09), 0, Math.PI * 2); ctx.fill();
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
// SHADOW-CACHE-01 (1.7.50): found by benchmarking old versions against the current one on the same scene. The fighter shadow redrew the whole stickman into a 256 by 256 canvas, filled it
// black and blitted it every frame for every fighter, which cost about 1.7 ms of drawing per fighter in the benchmark (8 fighters 13 ms; 1.6.159, with no such shadow, spent 4 ms on them).
// Each fighter now keeps its own silhouette canvas, redrawn only when its pose actually changes (angle in 6 degree steps, swing, lunge, walk phase) and at most every 60 ms,
// so an idle fighter costs one cheap blit per frame. A small least-recently-used set bounds the memory.
const stickmanShadowCache = new Map(), STICKMAN_SHADOW_CACHE_MAX = 48, STICKMAN_SHADOW_REFRESH_MS = 60;
function stickmanShadowEntry(owner){
  let entry = stickmanShadowCache.get(owner.id);
  if(!entry){
    if(stickmanShadowCache.size >= STICKMAN_SHADOW_CACHE_MAX){ let oldestId = null, oldestUse = Infinity; for(const [id, candidate] of stickmanShadowCache) if(candidate.used < oldestUse){ oldestUse = candidate.used; oldestId = id; } stickmanShadowCache.delete(oldestId); }
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
      const m = entry.ctx;
      m.setTransform(1,0,0,1,0,0); m.globalAlpha=1; m.globalCompositeOperation='source-over'; m.clearRect(0,0,256,256);
      m.save(); m.translate(128,128); m.scale(ms,ms); extra.shadowPass=true; drawStickman(m,0,0,angle,level,type,extra); extra.shadowPass=false; m.restore();
      m.globalCompositeOperation='source-in'; m.fillStyle='#000'; m.fillRect(0,0,256,256); m.globalCompositeOperation='source-over';
      entry.key = key; entry.at = presentationTime;
    }
    mask = entry.canvas;
  } else {
    const m=stickmanShadowCtx;
    m.setTransform(1,0,0,1,0,0); m.globalAlpha=1; m.globalCompositeOperation='source-over'; m.clearRect(0,0,256,256);
    m.save(); m.translate(128,128); m.scale(ms,ms); extra.shadowPass=true; drawStickman(m,0,0,angle,level,type,extra); extra.shadowPass=false; m.restore();
    m.globalCompositeOperation='source-in'; m.fillStyle='#000'; m.fillRect(0,0,256,256); m.globalCompositeOperation='source-over';
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
const WALK_SPEED_PX_PER_MS = 0.17;
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
    // CA572 — see HISTORY.md § [1.5.7] Code Archaeology, CA572
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

  // CA573 — see HISTORY.md § [1.5.7] Code Archaeology, CA573
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
  // WEARABLE-ITEMS-01 (1.7.113) — see HISTORY.md § [1.7.113]: the Fancy Hat sits on the head and the Running Shoes on the feet while they are in the pack
  if(extra && extra.wearsFancyHat){ ctx.save(); ctx.translate(0, -31.5); drawEmojiSprite(ctx, '🎩', 15); ctx.restore(); }
  // CA574 — see HISTORY.md § [1.5.7] Code Archaeology, CA574
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
    for(const [footX, footY] of [[-8 + legSwing, 20.5 - Math.max(0, legSwing)*0.25], [8 + legSwing, 20.5 - Math.max(0, -legSwing)*0.25]]){ ctx.save(); ctx.translate(footX, footY); ctx.scale(shoeFlip, 1); drawEmojiSprite(ctx, '👟', 9); ctx.restore(); }
  }

  const isDual = type === 'SWORDSMAN' && extra && extra.spec === 'DUAL' && extra.angle2 != null;
  const isTwoHander = type === 'SWORDSMAN' && extra && extra.spec === 'TWOHANDER';

  const shoulderX = 0, shoulderY = -13, armLen = 13;

  if(type === 'SWORDSMAN'){
    const swingT = extra.swingProgress || 0;
    const dynamicBend = -0.3 + swingT*0.55; // cocked back at wind-up, extends through the strike
    const swordLen = weaponLenFromScale(isTwoHander ? 17 : 15, isTwoHander ? 24 : 23, extra.weaponScale);
    // CA575 — see HISTORY.md § [1.5.7] Code Archaeology, CA575
    const charge = (isTwoHander && swingT === 0) ? (extra.chargeProgress || 0) : 0;
    const chargeShake = charge > 0.5 ? Math.sin(performance.now()/40) * (charge-0.5)*2 * 0.09 : 0; // only trembles in the back half of the charge, amplitude ramping toward release
    // CA576 — see HISTORY.md § [1.5.7] Code Archaeology, CA576
    const drawTwoHanderExtras = (handX, handY, bladeAngle) => {
      ctx.strokeStyle = skinMain; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(handX,handY); ctx.stroke();
      recordBloodSegment(-8,-8,handX,handY);
      if(charge <= 0.5 || lowGfx) return;
      const tipX = handX + Math.cos(bladeAngle)*swordLen, tipY = handY + Math.sin(bladeAngle)*swordLen;
      // CA577 — see HISTORY.md § [1.5.7] Code Archaeology, CA577
      ctx.strokeStyle = `rgba(255,220,180,${((charge-0.5)*0.7).toFixed(2)})`;
      ctx.lineWidth = 1.5 + charge*2;
      ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(tipX,tipY); ctx.stroke();
      if(charge > 0.88){
        // final flicker right before release, same threshold-flash language as Mage's own
        const flicker = 0.5 + 0.5*Math.sin(performance.now()/55);
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
      // CA578 — see HISTORY.md § [1.5.7] Code Archaeology, CA578
      // IDLE-GRIP-01 (1.6.73) — see HISTORY.md § [1.6.73]
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
      const restAngle = -Math.PI/2 + 0.96 + chargeShake;
      const hand = drawArmAndHand(ctx, shoulderX, shoulderY, IDLE_GRIP_ARM_ANGLE, armLen, skinMain, 0.15);
      drawSwordBlade(ctx, hand.handX, hand.handY, restAngle, level, isTwoHander, lowGfx, swordLen, extra.weaponThickness);
      markWeapon(hand.handX, hand.handY, restAngle, swordLen);
      if(isTwoHander) drawTwoHanderExtras(hand.handX, hand.handY, restAngle);
    } else {
      // CA579 — see HISTORY.md § [1.5.7] Code Archaeology, CA579
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
    // CA580 — see HISTORY.md § [1.5.7] Code Archaeology, CA580
    const perpX = -Math.sin(angle), perpY = Math.cos(angle);
    const shoulderOffset = 1.8;
    const frontShoulderX = shoulderX + perpX*shoulderOffset, frontShoulderY = shoulderY + perpY*shoulderOffset;
    const backShoulderX = shoulderX - perpX*shoulderOffset, backShoulderY = shoulderY - perpY*shoulderOffset;
    // CA581 — see HISTORY.md § [1.5.7] Code Archaeology, CA581
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
    // CA582 — see HISTORY.md § [1.5.7] Code Archaeology, CA582
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
    // CA583 — see HISTORY.md § [1.5.7] Code Archaeology, CA583
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
    // CA584 — see HISTORY.md § [1.5.7] Code Archaeology, CA584
    const restBlend = extra.restBlend || 0;
    function shortestBlend(from, to, t){
      const diff = ((to - from + Math.PI*3) % (Math.PI*2)) - Math.PI;
      return from + diff*t;
    }
    const armAngle = shortestBlend(angle, Math.PI/2 - 0.7, restBlend); // matches Swordsman's actual resting sword-hand arm angle
    const staffClimbSign = Math.cos(angle) >= 0 ? -1 : 1; // the tip rises on both sides when facing left or right
    const staffAngle = shortestBlend(angle, -Math.PI/2 + 0.96, restBlend) + staffClimbSign * castKick * 0.55; // matches Swordsman's actual resting blade direction, plus the muzzle climb
    const offHand = drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, armAngle, armLen, skinMain, wandBend);
    const handX = hand.handX, handY = hand.handY;
    if(type === 'SNAPCASTER'){
      // SNAPCASTER-HANDS-01 (1.6.110) — see HISTORY.md § [1.6.110]
      const tickSeed = Math.floor(presentationTime/90);
      ctx.save();
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for(const h of [hand, offHand]){
        for(let k=0; k<2; k++){
          const a = ((tickSeed*37 + k*113 + (h === hand ? 0 : 61)) % 360) * Math.PI/180;
          const l1 = 4 + ((tickSeed + k*5) % 4), l2 = l1 + 3 + (k*2);
          ctx.beginPath();
          ctx.moveTo(h.handX, h.handY);
          ctx.lineTo(h.handX + Math.cos(a)*l1, h.handY + Math.sin(a)*l1);
          ctx.lineTo(h.handX + Math.cos(a+0.7)*l2, h.handY + Math.sin(a+0.7)*l2);
          ctx.stroke();
        }
      }
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
    // small pouch of spare shells on the hip — was the only class with zero distinguishing gear
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-3, -4, 6, 5, 1.2) : ctx.rect(-3, -4, 6, 5); ctx.fill();
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 1; ctx.stroke();
    const bomberAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
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
    // ammo belt across the chest — the other class with zero distinguishing gear
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-4,-15); ctx.lineTo(4,2); ctx.stroke();
    if(!lowGfx){
      ctx.fillStyle = '#c7ccd1';
      for(const t of [0.2, 0.4, 0.6, 0.8]){
        ctx.beginPath(); ctx.arc(-4+8*t, -15+17*t, 0.9, 0, Math.PI*2); ctx.fill();
      }
    }
    const gatlingAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen, skinMain);
    const handX = hand.handX, handY = hand.handY;
    // twin parallel barrels
    const perpX = -Math.sin(gatlingAngle), perpY = Math.cos(gatlingAngle);
    ctx.strokeStyle = level >= 3 ? '#bdeaff' : '#8a8f98';
    ctx.lineWidth = 2.5*extra.weaponThickness;
    for(const side of [-1,1]){
      const bx = handX+perpX*3*side, by = handY+perpY*3*side;
      const barrelLen = weaponLenFromScale(14, 22, extra.weaponScale);
      const tx = bx+Math.cos(gatlingAngle)*barrelLen, ty = by+Math.sin(gatlingAngle)*barrelLen;
      markWeapon(bx, by, gatlingAngle, barrelLen);
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.stroke();
    }
  } else if(type === 'AXEMAN' || type === 'BERSERKER'){
    const axeLen = weaponLenFromScale(15, 24, extra.weaponScale);
    // AXEMAN-IDLE-01 (1.6.59) — see HISTORY.md § [1.6.59]. Unlike Spearman/Hammerman, this never
    // had its own idle pose — it always used the raw attack-facing angle, even standing idle with
    // no target, which held both axes out stiffly at whatever direction the tower last faced.
    // Resting stance: axes held down at the sides.
    const axeAngle = extra.hasTarget ? angle : Math.PI/2 + 0.15;
    const hand1 = drawArmAndHand(ctx, shoulderX, shoulderY, axeAngle, armLen, skinMain, -0.4);
    drawAxeHead(ctx, hand1.handX, hand1.handY, axeAngle, level, axeLen, extra.weaponThickness);
    markWeapon(hand1.handX, hand1.handY, axeAngle, axeLen);
    const hand2 = drawArmAndHand(ctx, shoulderX, shoulderY, axeAngle, armLen, skinMain, 0.4);
    drawAxeHead(ctx, hand2.handX, hand2.handY, axeAngle, level, axeLen, extra.weaponThickness);
  } else if(type === 'SPEARMAN' || type === 'LANCER'){
    const spearBend = -0.3 + (extra.swingProgress || 0)*0.55;
    const spearAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96; // idle: upright, tilted 55° for head clearance; engaged: thrusts at the target
    if(!extra.hasTarget){
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    } else {
      // CA588 — see HISTORY.md § [1.5.7] Code Archaeology, CA588
      drawArmAndHand(ctx, shoulderX, shoulderY, Math.PI/2 + 0.7, armLen, skinMain, -0.15);
    }
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : spearAngle, armLen + (extra.thrustPx || 0), skinMain, spearBend);
    const handX = hand.handX, handY = hand.handY;
    // long shaft, extending a little behind the hand too for a held-pole look
    const shaftLen = weaponLenFromScale(type === 'LANCER' ? 20 : 15, type === 'LANCER' ? 30 : 24, extra.weaponScale);
    const tipX = handX + Math.cos(spearAngle)*shaftLen, tipY = handY + Math.sin(spearAngle)*shaftLen;
    markWeapon(handX, handY, spearAngle, shaftLen);
    const backX = handX - Math.cos(spearAngle)*8, backY = handY - Math.sin(spearAngle)*8;
    ctx.strokeStyle = type === 'LANCER' ? '#6b4930' : '#8a5a2b';
    ctx.lineWidth = (type === 'LANCER' ? 3.5 : 2.5)*extra.weaponThickness;
    ctx.beginPath(); ctx.moveTo(backX,backY); ctx.lineTo(tipX,tipY); ctx.stroke();
    // small triangular spearhead
    const perpX = -Math.sin(spearAngle), perpY = Math.cos(spearAngle);
    ctx.fillStyle = type === 'LANCER' || level >= 3 ? '#bdeaff' : '#c7ccd1';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - Math.cos(spearAngle)*(type === 'LANCER' ? 12 : 8) + perpX*(type === 'LANCER' ? 4.5 : 3), tipY - Math.sin(spearAngle)*(type === 'LANCER' ? 12 : 8) + perpY*(type === 'LANCER' ? 4.5 : 3));
    ctx.lineTo(tipX - Math.cos(spearAngle)*(type === 'LANCER' ? 12 : 8) - perpX*(type === 'LANCER' ? 4.5 : 3), tipY - Math.sin(spearAngle)*(type === 'LANCER' ? 12 : 8) - perpY*(type === 'LANCER' ? 4.5 : 3));
    ctx.closePath();
    ctx.fill();
    if(type === 'LANCER'){
      const guardX = tipX - Math.cos(spearAngle)*14, guardY = tipY - Math.sin(spearAngle)*14;
      ctx.strokeStyle = '#c7ccd1'; ctx.lineWidth = 2.2*extra.weaponThickness;
      ctx.beginPath(); ctx.moveTo(guardX - perpX*5, guardY - perpY*5); ctx.lineTo(guardX + perpX*5, guardY + perpY*5); ctx.stroke();
    }
  } else if(type === 'HAMMERMAN'){
    const hammerBend = -0.3 + (extra.swingProgress || 0)*0.55;
    const hammerAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    // IDLE-GRIP-01 (1.6.73) — see HISTORY.md § [1.6.73]
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
    ctx.fillStyle = level >= 3 ? '#bdeaff' : '#8a8f98';
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
    ctx.fillStyle = level >= 3 ? '#bdeaff' : '#9aa0a6';
    ctx.beginPath(); ctx.arc(shieldX, shieldY, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(shieldX, shieldY, 7, 0, Math.PI*2); ctx.stroke();
  } else if(type === 'HACKER'){
    // HACKER-01 (1.7.36): no weapon at all — both hands hold an open laptop in front of the chest.
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
    // CA589 — see HISTORY.md § [1.5.7] Code Archaeology, CA589
    const castAngle = isCasting ? angle : (Math.PI/2 - 0.7);
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, castAngle, armLen, skinMain, isCasting ? -0.3 : -0.15);
    {
      // CLERIC-BIBLE-01 (1.6.110) — see HISTORY.md § [1.6.110]
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
    // CA590 — see HISTORY.md § [1.5.7] Code Archaeology, CA590
    {
      const intProgress = clampNum(((extra.int||0) - ATTUNEMENT_THRESHOLD) / (STAT_EFFECT_CAP - ATTUNEMENT_THRESHOLD), 0, 1);
      const hatR = 2.5 + intProgress*3.5; // 2.5px newly-Cleric -> 6px right before evolving into Pope
      ctx.fillStyle = level >= 3 ? '#ffe9a8' : '#d8c9a0';
      ctx.strokeStyle = '#b89b5e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -29, hatR, Math.PI, 0); ctx.fill(); ctx.stroke();
    }
  } else if(type === 'POPE'){
    // CA591 — see HISTORY.md § [1.5.7] Code Archaeology, CA591
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
    // CA592 — see HISTORY.md § [1.5.7] Code Archaeology, CA592
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
    // CA593 — see HISTORY.md § [1.5.7] Code Archaeology, CA593
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
    // BLOWDART-ARM-01 (1.6.7) — see HISTORY.md § [1.6.7]. Direct report ("where's his other
    // arm?") — only the mouth-hand was ever drawn. A real blowgun grip uses both hands, the same
    // way SQUIRTGUN/GUNALINDER right below already draw a main hand plus a supporting off-hand; the
    // off-hand reaches from the shoulder to a point partway along the pipe, steadying it.
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
      for(const t of [0.25, 0.5, 0.75]){
        ctx.beginPath(); ctx.arc(-4+8*t, -15+17*t, 1, 0, Math.PI*2); ctx.fill();
      }
    }
    // dual-wielded pistols, both hands actively aiming — no relaxed off-hand for a gunslinger stance
    const gunAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    const hand1 = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : (Math.PI/2 + 0.7), armLen*0.9, skinMain, -0.2);
    const hand2 = drawArmAndHand(ctx, shoulderX, shoulderY, extra.hasTarget ? angle : IDLE_GRIP_ARM_ANGLE, armLen*0.9, skinMain, 0.2);
    ctx.font = (14 * extra.weaponScale * (0.85 + extra.weaponThickness*0.15)) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for(const hand of [hand1, hand2]){
      // pivot at the hand (the grip), glyph extends outward from there toward the aim direction
      ctx.save();
      ctx.translate(hand.handX, hand.handY);
      ctx.rotate(gunAngle);
      ctx.fillText('🔫', 0, 0);
      ctx.restore();
      markWeapon(hand.handX, hand.handY, gunAngle, weaponLenFromScale(11, 17, extra.weaponScale));
      if(!lowGfx){
        const gunLen = weaponLenFromScale(11, 17, extra.weaponScale);
      const tipX = hand.handX + Math.cos(gunAngle)*gunLen, tipY = hand.handY + Math.sin(gunAngle)*gunLen;
        ctx.fillStyle = 'rgba(124,220,24,0.5)';
        ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
      }
    }
  } else if(type === 'GUNALINDER'){
    // CA594 — see HISTORY.md § [1.5.7] Code Archaeology, CA594
    const gunAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    const mainHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.9, skinMain, -0.15);
    drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle + 0.35, armLen*0.75, skinMain, 0.1); // off-hand cupping underneath
    ctx.font = (15 * extra.weaponScale * (0.85 + extra.weaponThickness*0.15)) + 'px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(mainHand.handX, mainHand.handY);
    ctx.rotate(gunAngle);
    ctx.fillText('🔫', 0, 0);
    ctx.restore();
    markWeapon(mainHand.handX, mainHand.handY, gunAngle, weaponLenFromScale(12, 18, extra.weaponScale));
    if(!lowGfx){
      const gunLen = weaponLenFromScale(12, 18, extra.weaponScale);
      const tipX = mainHand.handX + Math.cos(gunAngle)*gunLen, tipY = mainHand.handY + Math.sin(gunAngle)*gunLen;
      ctx.fillStyle = 'rgba(200,160,60,0.5)';
      ctx.beginPath(); ctx.arc(tipX,tipY,2.5,0,Math.PI*2); ctx.fill();
    }
  } else if(type === 'MARKSMAN'){
    // CA595 — see HISTORY.md § [1.5.7] Code Archaeology, CA595
    const gunAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    const gripHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.85, skinMain, -0.1);
    const supportHand = drawArmAndHand(ctx, shoulderX, shoulderY, gunAngle, armLen*0.95, skinMain, 0.08); // support hand closer in than Sniper's — a shorter weapon
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
    // CA596 — see HISTORY.md § [1.5.7] Code Archaeology, CA596
    const gunAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
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
    // CA597 — see HISTORY.md § [1.5.7] Code Archaeology, CA597
    const throwAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    drawArmAndHand(ctx, shoulderX, shoulderY, throwAngle, armLen, skinMain, -0.35); // relaxed supporting arm
    const raisedAngle = throwAngle - 0.55; // held higher than the throw line itself, so the cat reads as carried rather than mid-swing
    const hand = drawArmAndHand(ctx, shoulderX, shoulderY, raisedAngle, armLen, skinMain, 0.35);
    const tp = extra.throwProgress || 0;
    const releaseDist = tp * 16;
    const catX = hand.handX + Math.cos(throwAngle)*(4 + releaseDist);
    const bobPhase = (extra.buildScaleX||1)*3 + (extra.buildScaleY||1); // cheap per-tower phase offset, same idea as the idle-breathing sway above, so a row of Cat Snappers doesn't bob in unison
    const bob = tp > 0 ? 0 : Math.abs(Math.sin(gameTime/280 + bobPhase)) * 5;
    const catY = hand.handY - 10 - bob - releaseDist*0.3;
    drawCat(ctx, catX, catY, tp > 0 ? throwAngle : 0, 0.62, { idle: tp <= 0, phase: bobPhase });
  } else if(type === 'NECROMANCER'){
    // CA598 — see HISTORY.md § [1.5.7] Code Archaeology, CA598
    const castAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
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
  } else if(type === 'BLOW_GUNNER'){
    // CA599 — see HISTORY.md § [1.5.7] Code Archaeology, CA599
    const mouthAngle = extra.hasTarget ? angle : -Math.PI/2 + 0.96;
    const mouthX = 0, mouthY = -21;
    const hand = drawArmAndHand(ctx, mouthX, mouthY, mouthAngle, armLen*0.7, skinMain, -0.3);
    const tipX = hand.handX + Math.cos(mouthAngle)*14*extra.weaponScale, tipY = hand.handY + Math.sin(mouthAngle)*14*extra.weaponScale;
    markWeapon(hand.handX, hand.handY, mouthAngle, 14*extra.weaponScale);
    ctx.strokeStyle = '#8fa8b3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hand.handX,hand.handY); ctx.lineTo(tipX,tipY); ctx.stroke();
    if(!lowGfx){
      // CA600 — see HISTORY.md § [1.5.7] Code Archaeology, CA600
      const wispT = (gameTime % 900) / 900;
      ctx.fillStyle = 'rgba(200,232,240,0.35)';
      ctx.beginPath(); ctx.arc(tipX, tipY - wispT*4, 2.2 + wispT*1.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,232,240,0.22)';
      ctx.beginPath(); ctx.arc(tipX+1.5, tipY - wispT*6 - 2, 1.8 + wispT*1.1, 0, Math.PI*2); ctx.fill();
    }
  }

  // CA601 — see HISTORY.md § [1.5.7] Code Archaeology, CA601
  if(level >= 2){
    ctx.save();
    ctx.fillStyle = '#9aa0a6';
    // CA602 — see HISTORY.md § [1.5.7] Code Archaeology, CA602
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
function chipBarricade(barricade){
  barricade.lastBarricadeHitAt = gameTime;
  barricade.barricadeHpLabelUntil = gameTime + 2000;
  barricade.hp = Math.max(0, barricade.hp - 1);
  barricade.barricadeChipUntil = gameTime + BARRICADE_CHIP_MS;
  spawnFloatingText(barricade.x, barricade.y - 26, '-1', '#e63946');
  spawnBarricadeDebris(barricade);
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
function resolveSweptEnemyCollisions(){
  const hash = buildEnemyHash();
  for(const e of enemyPool){
    if(!e.active || e.prevX === undefined || e.isLivestock || e.isBreakaway) continue; // BREAKAWAY-PHASE-01 (1.6.157): an enemy breaking off to attack a stickman is on its own phase and touches neither barricades nor other enemies // WANDERER-PHASE-01 (1.6.137) — see HISTORY.md § [1.6.137]: livestock and the troll pass through everything
    const nearby = queryNearby(hash, e.x, e.y, e.radius*3 + 40, COLLISION_QUERY_CAP);
    const collisionCap = Math.min(nearby.length, COLLISION_QUERY_CAP);
    for(let __ci=0; __ci<collisionCap; __ci++){ const other = nearby[__ci];
      if(!other.active || other.prevX === undefined || other.isLivestock || other.isBreakaway) continue;
      if(isCampRouteCrossing(e, other)) continue;
      if(e.id >= other.id) continue; // each pair once, same reasoning as resolveEnemyCollisions
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
  const hash = buildEnemyHash();
  for(let pass = 0; pass < PASSES; pass++){
    let correctionsThisPass = 0; // a pass that corrected nothing means the field is already settled — further passes would repeat identical work
    for(const e of enemyPool){
      if(!e.active || e.isLivestock || e.isBreakaway) continue;
      const nearby = queryNearby(hash, e.x, e.y, e.radius*3, COLLISION_QUERY_CAP);
      const collisionCap = Math.min(nearby.length, COLLISION_QUERY_CAP);
      for(let __ci=0; __ci<collisionCap; __ci++){ const other = nearby[__ci];
        if(!other.active || other.isLivestock || other.isBreakaway) continue;
        if(isCampRouteCrossing(e, other)) continue;
        if(e.id >= other.id) continue; // each pair resolved exactly once per pass — without this, A pushes B, then later in the same loop B independently re-detects A and pushes again, doubling the separation and shoving units off the path centerline near corners
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
function queryNearby(hash, x, y, range, maxResults){
  spatialQueryCallsThisFrame++;
  if(hash === EMPTY_ENEMY_HASH) return EMPTY_QUERY_RESULT; // no active enemies at all — skip the entire cell scan below rather than doing real work to look for nothing
  queryNearbyScratch.length = 0;
  const cellRadius = Math.ceil(range/TILE_SIZE) + 1;
  const cx = Math.floor(x/TILE_SIZE), cy = Math.floor(y/TILE_SIZE);
  const bounded = hash._minCellX !== undefined;
  const left = bounded ? Math.max(cx-cellRadius, hash._minCellX) : cx-cellRadius;
  const right = bounded ? Math.min(cx+cellRadius, hash._maxCellX) : cx+cellRadius;
  const top = bounded ? Math.max(cy-cellRadius, hash._minCellY) : cy-cellRadius;
  const bottom = bounded ? Math.min(cy+cellRadius, hash._maxCellY) : cy+cellRadius;
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
   MAIN LOOP (fixed timestep)
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
    let anyAlive = false; // LAG-PASS-03 (1.6.152): a plain loop that stops at the first live enemy, no closure per tick
    for(const candidate of enemyPool){
      if(candidate.active && !candidate.escaped && !candidate.isGuardian && !candidate.isHutBuilding && !candidate.isLivestock){ anyAlive = true; break; }
    }
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
      maybeSpawnCaravan();
      maybeShowWaveTutorialTip();
      // TENNIS-SHOES-MOVE-01 (1.7.44), now the Running Shoes (1.7.113): shoes are a normal item with a passive bonus, not a used item: every pair a stickman carries gives one free move
      // at the start of every round (counted once per pair, up to the cap), with no action from the player.
      for(const t of towerPool) if(t.active) for(const item of t.equippedItems) if(item.extraMove) grantTowerMove(t, '👟');
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
  const moveSpeed = isEnemyFrozen(target) ? 0 : Math.min(target.packedSpeed()*enemyMoveMultiplier(target), target.followSpeedCap === undefined ? Infinity : target.followSpeedCap);
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
    document.getElementById('targetEffects').textContent = [target.sizeTier, target.escaped ? 'Escaped' : '', target.frozenUntil > gameTime ? 'Frozen' : '', target.stunnedUntil > gameTime ? 'Stunned' : '', target.bleedUntil > gameTime ? 'Bleeding' : '', target.poisonUntil > gameTime ? 'Poisoned' : '', target.burnUntil > gameTime ? 'Burning' : ''].filter(Boolean).join(' · ');
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
  blitWorldLayer(ctx, mapCanvas, worldView); // static map, pre-rendered once — see BOOT
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
    drawEmojiGroundShadow(ctx,gi.itemDef.icon,gi.x,gi.y,GROUND_ITEM_EMOJI_PX,'serif',1);
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
    if(graphicsQuality === 'high'){ ctx.shadowColor = ringColorHex; ctx.shadowBlur = 8; } // GROUND-GLOW-SPRITE-01 (1.7.52): the glow is a cached sprite; the text halo stays on High only
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
  drawMarkedTargetIcon(ctx);
  drawParticles(ctx);
  drawFloatingTexts(ctx);
  drawItemUseEffects(ctx);
  drawCoinPickups(ctx);
  drawAmbientLogs(ctx);
  renderPhaseTime.particlesText += performance.now() - __rpt; __rpt = performance.now();
  for(const it of depthSortItems) if(it.kind==='e' && it.e.type==='BEE') it.e.draw(ctx); // above world emojis, below interface overlays
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
  ctx.translate(spawn.x, spawn.y - 34 + bob);
  ctx.scale(1.7, 1);
  ctx.fillText('❗', 0, 0);
  ctx.restore();
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
  wallTimeClampHits: 0, wallTimeClampedMs: 0, simulationCatchUpCapHits: 0, simulationDebtDroppedMs: 0, lastDroppedSimulationTimeMs: 0,
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
const CARAVAN_FIRST_ROUND_AFTER = 5, CARAVAN_CHANCE = 0.4, CARAVAN_MIN_GAP_ROUNDS = 2, CARAVAN_SPEED_PX_PER_S = 46, CARAVAN_TAP_RADIUS_PX = 36, CARAVAN_EXIT_PX = 520;
const CARAVAN_CLOP_STRIDE_PX = 24, WOOD_SELL_GOLD = 2, STONE_SELL_GOLD = 4;
const caravan = { active: false, exiting: false, x: 0, y: 0, dirX: 1, dirY: 0, targetIndex: 1, pathLength: 0, exitPx: 0, wheelPhase: 0, clopPx: 0, lastRound: -99 };
function caravanShopAvailable(){ return caravan.active && !caravan.exiting; }
function resetCaravan(){ caravan.active = false; caravan.exiting = false; caravan.lastRound = -99; }
function maybeSpawnCaravan(){
  if(caravan.active || wavesCompleted <= CARAVAN_FIRST_ROUND_AFTER || wavesCompleted - caravan.lastRound < CARAVAN_MIN_GAP_ROUNDS) return;
  if(wood <= 0 && stone <= 0) return;
  if(waypointsPx.length < 2 || Math.random() >= CARAVAN_CHANCE) return;
  caravan.active = true; caravan.exiting = false; caravan.exitPx = 0; caravan.clopPx = 0; caravan.lastRound = wavesCompleted;
  caravan.x = waypointsPx[0].x; caravan.y = waypointsPx[0].y; caravan.targetIndex = 1; caravan.pathLength = waypointsPx.length;
  caravan.dirX = waypointsPx[1].x - caravan.x; caravan.dirY = waypointsPx[1].y - caravan.y;
  playSound('caravan_arrive', caravan.x, undefined, caravan.y);
  showToast('🐴 A merchant caravan is on the road — tap him to trade, or open the Shop');
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
function updateCaravan(frameMs){
  if(!caravan.active) return;
  if(!document.getElementById('shop-modal').classList.contains('hidden') && !caravan.exiting) return; // he waits while the player trades
  if(!caravan.exiting && caravan.pathLength !== waypointsPx.length) retargetCaravanAfterPathChange();
  let stepPx = CARAVAN_SPEED_PX_PER_S * Math.min(100, frameMs) / 1000;
  const startX = caravan.x, startY = caravan.y;
  if(!caravan.exiting){
    const target = waypointsPx[caravan.targetIndex];
    if(!target){
      const finishLine = computeFinishLine();
      if(finishLine){ caravan.dirX = finishLine.ux; caravan.dirY = finishLine.uy; }
      caravan.exiting = true; updateHUD();
    } else {
      const dx = target.x - caravan.x, dy = target.y - caravan.y, distance = Math.hypot(dx, dy) || 0.0001;
      caravan.dirX = dx/distance; caravan.dirY = dy/distance;
      if(distance <= stepPx){ caravan.x = target.x; caravan.y = target.y; caravan.targetIndex++; }
      else { caravan.x += caravan.dirX*stepPx; caravan.y += caravan.dirY*stepPx; }
    }
  } else {
    caravan.x += caravan.dirX*stepPx; caravan.y += caravan.dirY*stepPx; caravan.exitPx += stepPx;
    if(caravan.exitPx >= CARAVAN_EXIT_PX){ caravan.active = false; caravan.exiting = false; updateHUD(); return; }
  }
  const movedPx = Math.hypot(caravan.x - startX, caravan.y - startY);
  caravan.wheelPhase += movedPx/6;
  caravan.clopPx += movedPx;
  if(caravan.clopPx >= CARAVAN_CLOP_STRIDE_PX){ caravan.clopPx -= CARAVAN_CLOP_STRIDE_PX; playSound('caravan_clop', caravan.x, undefined, caravan.y); }
}
function drawCaravan(ctx){
  if(!caravan.active) return;
  const facing = caravan.dirX >= 0 ? 1 : -1, bob = Math.sin(caravan.wheelPhase*0.55)*1.2;
  ctx.save();
  ctx.translate(caravan.x, caravan.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 9, 30, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.save();
  ctx.scale(facing, 1);
  ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, -4 + bob); ctx.lineTo(16, -6 + bob); ctx.stroke();
  ctx.fillStyle = '#8d5a2b'; ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5;
  roundedRectPath(ctx, -22, -17 + bob, 30, 13, 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(62,39,35,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-22, -11 + bob); ctx.lineTo(8, -11 + bob); ctx.stroke();
  ctx.fillStyle = '#d7b46a'; ctx.beginPath(); ctx.arc(-14, -19 + bob, 5, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(-4, -19 + bob, 4, Math.PI, 0); ctx.fill();
  for(const wheelX of [-15, 1]){
    ctx.save(); ctx.translate(wheelX, 0);
    ctx.fillStyle = '#d7ccc8'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.rotate(caravan.wheelPhase*facing); ctx.lineWidth = 1.2; ctx.beginPath();
    for(let spoke = 0; spoke < 3; spoke++){ const angle = spoke*Math.PI/3; ctx.moveTo(Math.cos(angle)*6, Math.sin(angle)*6); ctx.lineTo(-Math.cos(angle)*6, -Math.sin(angle)*6); }
    ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.translate(27, -9 + bob); ctx.scale(-1, 1); drawEmojiSprite(ctx, '🐴', 26); ctx.restore();
  ctx.restore();
  ctx.save(); ctx.translate(-6*facing, -26 + bob); drawEmojiSprite(ctx, '👳', 15); ctx.restore();
  if(!caravan.exiting){ ctx.save(); ctx.translate(0, -44 + Math.sin(presentationTime/380)*2); drawEmojiSprite(ctx, '🛍️', 16); ctx.restore(); }
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
  audioEngine.setMusicPhase(gameState === 'START' ? 'attract' : waveState !== 'IDLE' || countLooseEnemies() > 0 ? (bossIsOnField() ? 'boss' : 'wave') : 'field');
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
   ENTITY CLASSES: TOWER
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
   ENTITY CLASSES: PROJECTILE
   ========================================================= */
/* Lightweight pooled particles & floating text (rolling-index reuse, no allocation in loop) */
const particles = Array.from({length: PARTICLE_COUNT}, () => ({active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:0,color:'#fff',size:2,friction:0.93,pooled:false}));
let particleIndex = 0;

/* =========================================================
   AUDIO: SOUND ENGINE AND MUSIC
   ========================================================= */
/* =========================================================
   AUDIO AND MUSIC
   ========================================================= */
// MUSIC-MIX-01 — see HISTORY.md § [1.6.163] Audio mix and adaptive score, MUSIC-MIX-01.
let audioMasterVolume = 1, audioMusicVolume = 1, audioSfxVolume = 1;
const MASTER_OUTPUT_GAIN = 0.75; // MIX-LEVEL-01 (1.7.36): measured loudest SFX burst over boss music peaked at 0.37 of full scale with the old 0.5 gain, so +3.5 dB still leaves about 4 dB of headroom before the compressor
const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']; // AUDIO-GESTURE-01 (1.7.107); declared here, before the design contract runs
const MUSIC_TEMPO_BPM = 104;
const MUSIC_COMBAT_TEMPO_BPM = 144;
const MUSIC_CYCLE_SHIFTS = [0, 5, 7, 3, 0, 5, 7, 3]; // MUSIC-EVOLVE-01 (1.7.36): each 24-bar cycle moves the whole score to a new key
const MUSIC_SEASON_SHIFTS = [0, 2, 3, 5, 7, 2, 3, 5, 7, 10]; // and every ten completed waves shifts it again, so progress is audible
function mulberry32(seed){ let a = seed|0; return function(){ a = (a + 0x6D2B79F5)|0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FIELD_MELODY_B = [ // the contrasting second theme: slower, stepwise, higher, leaning on the relative major
  [7,null,null,5, 3,null,null,null], [2,null,3,null, 5,null,null,null], [7,null,null,8, 10,null,8,7], [5,null,null,null, null,null,null,null],
  [3,null,null,3, 5,null,7,null], [8,null,7,null, 5,null,3,null], [2,null,null,3, 5,null,3,2], [0,null,null,null, null,null,null,null],
  [10,null,null,8, 7,null,5,null], [7,null,8,null, 10,null,12,null], [10,null,8,7, 5,null,3,null], [2,null,null,null, 0,null,null,null]
];
const FIELD_ROOT_PROGRESSIONS = [
  [38,34,36,45,38,34,36,45,34,36,45,38],
  [38,41,36,43,38,41,34,45,38,36,43,45],
  [38,36,34,45,38,43,41,45,34,36,41,38]
];
const FIELD_BASS_PATTERNS = [ [[0,0],[3,7],[6,12]], [[0,0],[2,3],[4,5],[6,7]], [[0,0]], [[0,0],[3,0],[5,7]] ];
function fieldVariedBar(notes, rng){
  const out = notes.slice(), mode = rng();
  if(mode < 0.3) return out;
  if(mode < 0.55){ out.unshift(out.pop()); return out; } // syncopated: the whole bar moves one step later
  if(mode < 0.75){ let lifted = 0; for(let i = 7; i >= 0 && lifted < 3; i--) if(out[i] !== null){ out[i] += 12; lifted++; } return out; } // the last three notes climb an octave
  if(mode < 0.9){ for(let i = 1; i < 8; i += 2) if(out[i] === null && out[i-1] !== null && rng() < 0.6) out[i] = out[i-1] + [2, 1, 3].find(gap => MUSIC_KEY_PITCH_CLASSES.has((((out[i-1] + gap) % 12) + 12) % 12)); return out; } // passing notes stay inside the key
  let kept = 0; for(let i = 0; i < 8; i++) if(out[i] !== null && kept++ % 2 === 1) out[i] = null; // thinned: every other note rests
  return out;
}
const MUSIC_BOSS_TEMPO_BPM = 152; // MUSIC-BOSS-01 (1.7.36): a boss on the field switches combat music to a faster, darker Phrygian arrangement
const MUSIC_COMBAT_ROOTS = [38,38,41,36,38,43,41,38,38,36,43,38];
const MUSIC_PHRYGIAN_INTERVALS = [0,1,3,5,7,8,10,12,13,17];
const MUSIC_COMBAT_INTERVALS = [0,2,3,5,7,8,11,12,14,17];
const MUSIC_STEPS_PER_BAR = 8;
const MUSIC_BARS = 24;
const MUSIC_OPTIONAL_VOICE_HEADROOM = 4; // MUSIC-PRIORITY-01 (1.7.98) — see HISTORY.md § [1.7.98]
const MUSIC_VOICE_LIMIT = 10;
// MUSIC-BUDGET-01 (1.7.105) — see HISTORY.md § [1.7.105]: the in-game themes were losing about 170 optional notes and 10 required ones per 24 bars to the fixed 10-voice limit. The limit now follows the smoothed frame work time, so a light scene plays the full arrangement and a heavy one falls back to 10.
const MUSIC_VOICE_LIMIT_LIGHT = 24, MUSIC_VOICE_LIMIT_MEDIUM = 14, MUSIC_LOAD_LIGHT_MS = 4, MUSIC_LOAD_MEDIUM_MS = 8; // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
const MUSIC_MINOR_CHORD_ROOTS = new Set([38, 43]);
const MUSIC_ARPEGGIO_SHAPE = [0, 1, 2, 3, 2, 1];
const MUSIC_TURNAROUND_RUN = [-17, -14, -12, -9, -7, -5, -3, -1];
const MUSIC_TOM_PITCHES = [236, 198, 166, 140];
const MUSIC_VIBRATO_CENTS = 16;
const MUSIC_KEY_PITCH_CLASSES = new Set([0, 2, 3, 5, 7, 8, 10, 11]);
const MUSIC_HARMONY_GAPS = [5, 4, 3, 6];
const MUSIC_TEMPO_CREEP = 0.06;
const MUSIC_STING_PAIRS = [[0, 3], [3, 7], [7, 10], [12, 15]];
// MUSIC-ATTRACT-01 (1.7.100) — see HISTORY.md § [1.7.100]: the start screen plays a bright, major-key pop arrangement of the battle melody (I-V-vi-IV, four on the floor, offbeat hats, bouncing bass)
const MUSIC_ATTRACT_TEMPO_BPM = 128, MUSIC_ATTRACT_TONIC = 48;
const MUSIC_ATTRACT_CHORDS = [{ root: 36, triad: [0, 4, 7] }, { root: 43, triad: [0, 4, 7] }, { root: 45, triad: [0, 3, 7] }, { root: 41, triad: [0, 4, 7] }];
const MUSIC_ATTRACT_BASS = { 0: 0, 1: 0, 3: 12, 4: 7, 6: 12, 7: 7 };
// MUSIC-ATTRACT-02 (1.7.104) — see HISTORY.md § [1.7.104]: the 24-bar start-screen cycle is now a song (intro, two verses, a build, a chorus) played with its own brighter voices and a larger voice budget
const MUSIC_ATTRACT_VOICE_LIMIT = 24, MUSIC_ATTRACT_OPTIONAL_HEADROOM = 3, MUSIC_ATTRACT_SECTION_LEVEL = [0.38, 0.56, 0.68, 0.76, 0.9], MUSIC_ATTRACT_BUILD_CHORDS = [3, 3, 1, 1], MUSIC_ATTRACT_ARP = [0, 1, 2, 1, 2, 1, 2, 1];
const POP_VOICES = {
  warm: { wave: 'triangle', detunes: [0], attack: 0.035, sustain: 0.55, decay: 0.45, release: 0.12, cutoffStart: 2200, cutoffEnd: 1400, cutoffTime: 0.7, q: 0.3, echo: true },
  lead:  { wave: 'sawtooth', detunes: [-7, 7], attack: 0.008, sustain: 0.75, decay: 0.35, release: 0.07, cutoffStart: 5200, cutoffEnd: 3000, cutoffTime: 0.5, q: 0.6, echo: true },
  harmony: { wave: 'sawtooth', detunes: [0], attack: 0.01, sustain: 0.7, decay: 0.35, release: 0.06, cutoffStart: 3600, cutoffEnd: 2200, cutoffTime: 0.5, q: 0.5, echo: false },
  pad:   { wave: 'sawtooth', detunes: [0], attack: 0.07, sustain: 0.8, decay: 0.5, release: 0.3, cutoffStart: 1500, cutoffEnd: 1100, cutoffTime: 0.8, q: 0.3, echo: false },
  pluck: { wave: 'square', detunes: [0], attack: 0.003, sustain: 0.12, decay: 0.3, release: 0.04, cutoffStart: 8000, cutoffEnd: 1000, cutoffTime: 0.35, q: 0.8, echo: true },
  bass:  { wave: 'sawtooth', detunes: [0], sub: true, attack: 0.004, sustain: 0.55, decay: 0.4, release: 0.04, cutoffStart: 1500, cutoffEnd: 420, cutoffTime: 0.4, q: 1.2, echo: false },
  bell:  { wave: 'sine', detunes: [0], fmRatio: 3.5, fmIndex: 3.2, attack: 0.002, sustain: 0.1, decay: 0.5, release: 0.05, cutoffStart: 9000, cutoffEnd: 5000, cutoffTime: 0.6, q: 0.3, echo: true }
};
// MUSIC-SPACE-01 (1.7.116): tonal voices are spread across the stereo field by pitch, alternating sides note by note (leads stay near the centre), and sent to a short stereo hall; the music bus gets a gentle low-mid cut so the bass and chords stop masking the melody, and the idle theme opens its lowpass from 3200 to 4200 Hz for air.
const MUSIC_PAN_FLOOR_HZ = 240, MUSIC_PAN_SPAN_HZ = 1500, MUSIC_PAN_MAX = 0.6, MUSIC_PAN_LEAD_SHARE = 0.3, MUSIC_REVERB_SEND = 0.2, MUSIC_REVERB_SECONDS = 1.9, MUSIC_MUD_CUT_HZ = 280, MUSIC_MUD_CUT_DB = -2.5, MUSIC_FIELD_FILTER_HZ = 4200, MUSIC_MAKEUP_GAIN = 1.33, MUSIC_SECTION_LEVEL = [0.88, 1, 1.12], MUSIC_AIR_HZ = 3500, MUSIC_AIR_DB = 2.5;
const MUSIC_ECHO_SEND = 0.2, MUSIC_ECHO_FEEDBACK = 0.34, MUSIC_ECHO_DAMPING_HZ = 2600;
const MUSIC_CYCLE_STEPS = MUSIC_STEPS_PER_BAR * MUSIC_BARS;
const MUSIC_MINOR_INTERVALS = [0,2,3,5,7,9,10,12,14,17];
const MUSIC_MAJOR_INTERVALS = [0,2,4,5,7,9,11,12,14,17];
const MUSIC_BASS_ROOTS = [38, 34, 36, 45, 38, 34, 36, 45, 34, 36, 45, 38]; // MUSIC-FIELD-THEME-01 (1.7.36): i, bVI, bVII, V — a brooding war-march progression in D minor
const MUSIC_FIELD_MELODY = [ // FIELD-THEME-02 (1.7.98) — see HISTORY.md § [1.7.98]
  [0,null,null,7, 5,null,3,null], [2,null,3,null, 5,null,7,null], [0,null,null,7, 5,null,3,5], [10,null,8,null, 7,null,null,null],
  [0,null,null,7, 5,null,3,null], [2,null,3,null, 5,null,8,null], [7,null,null,5, 3,null,2,3], [2,null,-1,null, 0,null,null,null],
  [7,null,null,12, 10,null,8,null], [7,null,10,null, 12,null,14,null], [12,null,10,null, 8,null,7,5], [5,null,2,null, -1,null,0,null]
];
const MUSIC_COMBAT_MELODY = [
  [0,null,4,1,null,2,0,null],
  [null,4,1,null,2,3,null,0],
  [0,null,4,1,null,2,null,0],
  [4,null,2,1,0,null,null,null],
  [0,4,null,1,null,3,0,null],
  [null,4,1,null,2,3,null,0],
  [4,null,7,1,null,2,4,0],
  [3,2,null,1,0,null,null,null],
  [0,null,4,null,1,2,0,null],
  [4,1,null,2,null,4,0,null],
  [4,null,7,1,2,null,4,0],
  [2,1,null,0,null,null,null,null],
  [0,4,null,1,2,null,7,4],
  [null,4,1,null,2,3,null,0],
  [4,7,null,1,2,null,9,4],
  [2,null,1,0,null,null,null,null],
  [0,null,4,1,null,2,4,0],
  [4,null,1,2,null,7,4,0],
  [0,4,null,1,2,null,7,4],
  [4,2,null,1,0,null,null,null],
  [0,4,1,null,2,4,null,0],
  [4,null,7,1,2,null,7,4],
  [7,4,null,1,2,1,null,0],
  [4,null,2,1,0,null,null,null]
];
function musicDiatonicAbove(pitch, keyTonic){
  for(const gap of MUSIC_HARMONY_GAPS) if(MUSIC_KEY_PITCH_CLASSES.has((((pitch + gap - keyTonic) % 12) + 12) % 12)) return pitch + gap;
  return pitch + 7;
}
function musicChordTones(baseRoot){ return [0, MUSIC_MINOR_CHORD_ROOTS.has(baseRoot) ? 3 : 4, 7, 12]; }
function musicKeyShift(cycleIndex){
  const shift = (MUSIC_CYCLE_SHIFTS[cycleIndex % MUSIC_CYCLE_SHIFTS.length] + MUSIC_SEASON_SHIFTS[Math.min(9, Math.floor(wavesCompleted / 10))]) % 12;
  return shift > 6 ? shift - 12 : shift;
}
function midiToFrequency(note){ return 440 * Math.pow(2, (note - 69) / 12); }
// Five variants, never the same twice in a row: pitch ratios are whole semitones (0, +1, -1, +2, -2) and the noise colour moves with them.
const SFX_VARIANT_PITCH = [1, 1.0595, 0.9439, 1.1225, 0.8909], SFX_VARIANT_NOISE = [1, 1.12, 0.89, 1.25, 0.8];
// Sounds whose pitch is part of their meaning (melodic stingers, countdown, level ups, UI confirms) always play unchanged.
const SFX_VARIANT_EXEMPT = new Set(['heart_break','item_scroll','item_inject','wave_clear','levelup','evolution','hero','legendary','countdown_tick','countdown_go','coin','ui_buy','ui_deny','ui_open','ui_close','lose','wave','threat','item_eat','item_potion','expand_build']);
const AUDIO_EVENT_GAPS = Object.freeze({
  swing_blade:0.055, swing_pierce:0.055, swing_blunt:0.09, swing_axe:0.07,
  throw_axe:0.055, monster_swing:0.12, shot_archer:0.055, shot_sniper:0.08,
  shot_gatling:0.04, shot_blowdart:0.055, shot_gunalinder:0.055,
  shot_squirtgun:0.055, shot_cat:0.08, shot_bomber:0.12,
  cast_mage:0.075, cast_cleric:0.10, gore_death:0.065, foot_squelch:0.10,
  coin:0.045, bag:0.10, levelup:0.18, chatter_short:0.15,
  click:0.035, ui_open:0.08, ui_close:0.08, ui_buy:0.08, stat_spend:0.055, spawn_chatter:0.25,
  caravan_arrive:1.5, troll_arrive:1.5, clown_honk:0.3, caravan_clop:0.14, heart_break:0.3, threat:1.5, wave_clear:0.5, evolution:0.5, hero:0.5, legendary:1, lose:0.5, roundStart:0.6, wave:0.25, ui_deny:0.12
});
const AUDIO_PRIORITY_EVENTS = new Set(['caravan_arrive','troll_arrive','clown_honk','heart_break','click','ui_open','ui_close','ui_buy','ui_deny','stat_spend','coin','bag','roundStart','wave','wave_clear','threat','lose','evolution','hero','legendary','levelup']);
const AUDIO_FOCUS_EVENTS = new Set(['ui_buy','roundStart','wave_clear','threat','lose','evolution','hero','legendary','levelup']);
class SoundEngine{
  constructor(){
    this.unlocked=false;
    // CA171 — see HISTORY.md § [1.5.7] Code Archaeology, CA171
    this.activeVoiceExpiry = [];
    this.currentEventImportant = false;
    this.currentEventGain = 1;
    this.combatDuckUntil = 0;
    this.MAX_VOICES = 28;
    // CA172 — see HISTORY.md § [1.5.7] Code Archaeology, CA172
    this.lastFamilyPlayAt = {};
    this.lastEventPlayAt = Object.create(null);
    // CA173 — see HISTORY.md § [1.5.7] Code Archaeology, CA173
    this.debugCounters = { impactRequested: 0, impactPlayed: 0, impactSuppressed: 0, peakVoices: 0, voicesStarted: 0, priorityEvents: 0, musicLateRecoveries:0, musicSkippedSteps:0, musicWorstLatenessMs:0 };
    this.musicVoiceExpiry = [];
    this.musicStarted = false;
    this.musicPaused = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicNextTime = 0;
    this.requestedMusicPhase = 'field';
    this.musicPhase = 'field';
    this.musicBaseGain = audioMusicVolume;
    this.musicPanSide = 1;
  }
  buildMusicReverb(){
    const rate = this.ctx.sampleRate, length = Math.floor(rate * MUSIC_REVERB_SECONDS), preDelay = Math.floor(rate * 0.018);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for(let channel = 0; channel < 2; channel++){
      const data = impulse.getChannelData(channel);
      let smoothed = 0;
      for(let i = preDelay; i < length; i++){
        smoothed += (Math.random() * 2 - 1 - smoothed) * 0.3;
        data[i] = smoothed * Math.pow(1 - (i - preDelay) / (length - preDelay), 2.6);
      }
    }
    this.musicReverb = this.ctx.createConvolver();
    this.musicReverb.buffer = impulse;
    this.musicReverbSend = this.ctx.createGain();
    this.musicReverbSend.gain.value = MUSIC_REVERB_SEND;
    this.musicReverbSend.connect(this.musicReverb);
    this.musicReverb.connect(this.master);
  }
  setMusicSectionLevel(time, section){
    if(!this.musicSectionGain) return;
    this.musicSectionGain.gain.setTargetAtTime(MUSIC_SECTION_LEVEL[section] || 1, Math.max(time, this.ctx.currentTime), 0.35);
  }
  routeMusicVoice(gain, freq, spread, wet){
    let tail = gain;
    if(this.ctx.createStereoPanner && freq > MUSIC_PAN_FLOOR_HZ){
      const panner = this.ctx.createStereoPanner();
      this.musicPanSide = -this.musicPanSide;
      panner.pan.value = this.musicPanSide * spread * Math.min(MUSIC_PAN_MAX, (freq - MUSIC_PAN_FLOOR_HZ) / MUSIC_PAN_SPAN_HZ);
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(this.musicBus);
    if(wet && this.musicReverbSend) tail.connect(this.musicReverbSend);
    return tail;
  }
  // CA174 — see HISTORY.md § [1.5.7] Code Archaeology, CA174
  reserveVoiceSlot(duration, delay, important=false){
    const now = this.ctx.currentTime;
    // CA175 — see HISTORY.md § [1.5.7] Code Archaeology, CA175
    let voiceWriteIdx = 0;
    for(let i=0; i<this.activeVoiceExpiry.length; i++){
      if(this.activeVoiceExpiry[i] > now) this.activeVoiceExpiry[voiceWriteIdx++] = this.activeVoiceExpiry[i];
    }
    this.activeVoiceExpiry.length = voiceWriteIdx;
    if(this.activeVoiceExpiry.length >= this.MAX_VOICES + (important ? 4 : 0)) return false; // budget full — this specific call silently produces no sound rather than piling on further
    this.debugCounters.voicesStarted++;
    this.activeVoiceExpiry.push(now + (delay || 0) + duration);
    if(this.activeVoiceExpiry.length > this.debugCounters.peakVoices) this.debugCounters.peakVoices = this.activeVoiceExpiry.length;
    return true;
  }
  unlock(){
    // CA176 — see HISTORY.md § [1.5.7] Code Archaeology, CA176
    if(this.unlocked){
      if(this.ctx && this.ctx.state !== 'running' && this.ctx.resume){
        this.ctx.resume().catch(function(){ /* resume failures are non-fatal — game stays playable without audio */ });
      }
      return;
    }
    this.prewarm();
    if(!this.ctx) return;
    this.unlocked = true;
    if(this.ctx.state !== 'running') this.ctx.resume().catch(function(){ /* resume failures are non-fatal — game stays playable without audio */ });
    this.applyMix();
  }
  // AUDIO-PREWARM-01 (1.7.102) — see HISTORY.md § [1.7.102]: the audio graph, noise buffer and brass wave are built while the loading screen is up, so the first click only has to resume the context and start the music
  prewarm(){
    if(this.ctx || !(window.AudioContext || window.webkitAudioContext)) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.prepareMusicPalette();
    this.ensureNoiseBuffer();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.connect(this.ctx.destination);
    // CA177 — see HISTORY.md § [1.5.7] Code Archaeology, CA177
    this.saturation = this.ctx.createWaveShaper();
    const curveLen = 1024, k = 1.5;
    const curve = new Float32Array(curveLen);
    for(let i=0; i<curveLen; i++){
      const x = (i*2)/curveLen - 1;
      curve[i] = Math.tanh(k*x) / Math.tanh(k);
    }
    this.saturation.curve = curve;
    this.saturation.oversample = '2x';
    this.saturation.connect(this.compressor);
    // CA178 — see HISTORY.md § [1.5.7] Code Archaeology, CA178
    this.masterEQ = this.ctx.createBiquadFilter();
    this.masterEQ.type = 'peaking';
    this.masterEQ.frequency.value = 350;
    this.masterEQ.Q.value = 1.5;
    this.masterEQ.gain.value = -4;
    this.masterEQ.connect(this.saturation);
    this.master = this.ctx.createGain();
    this.master.gain.value = isMuted ? 0 : MASTER_OUTPUT_GAIN * audioMasterVolume;
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = audioSfxVolume;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = audioMusicVolume;
    this.musicBaseGain = audioMusicVolume;
    this.sfxBus.connect(this.master);
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = MUSIC_FIELD_FILTER_HZ;
    this.musicFilter.Q.value = 0.5;
    this.musicMudCut = this.ctx.createBiquadFilter();
    this.musicMudCut.type = 'peaking';
    this.musicMudCut.frequency.value = MUSIC_MUD_CUT_HZ;
    this.musicMudCut.Q.value = 0.9;
    this.musicMudCut.gain.value = MUSIC_MUD_CUT_DB;
    this.musicBus.connect(this.musicMudCut);
    this.musicMakeup = this.ctx.createGain();
    this.musicMakeup.gain.value = MUSIC_MAKEUP_GAIN;
    this.musicMudCut.connect(this.musicMakeup);
    this.musicSectionGain = this.ctx.createGain();
    this.musicSectionGain.gain.value = 1;
    this.musicAir = this.ctx.createBiquadFilter();
    this.musicAir.type = 'highshelf';
    this.musicAir.frequency.value = MUSIC_AIR_HZ;
    this.musicAir.gain.value = MUSIC_AIR_DB;
    this.musicMakeup.connect(this.musicSectionGain);
    this.musicSectionGain.connect(this.musicAir);
    this.musicAir.connect(this.musicFilter);
    this.musicFilter.connect(this.master);
    this.buildMusicReverb();
    this.musicEchoSend = this.ctx.createGain();
    this.musicEchoSend.gain.value = MUSIC_ECHO_SEND;
    this.musicEcho = this.ctx.createDelay(1);
    this.musicEchoDamping = this.ctx.createBiquadFilter();
    this.musicEchoDamping.type = 'lowpass';
    this.musicEchoDamping.frequency.value = MUSIC_ECHO_DAMPING_HZ;
    this.musicEchoFeedback = this.ctx.createGain();
    this.musicEchoFeedback.gain.value = MUSIC_ECHO_FEEDBACK;
    this.musicEchoSend.connect(this.musicEcho);
    this.musicEcho.connect(this.musicEchoDamping);
    this.musicEchoDamping.connect(this.musicEchoFeedback);
    this.musicEchoFeedback.connect(this.musicEcho);
    this.musicEchoDamping.connect(this.musicBus);
    this.musicEchoStepSeconds = 0;
    this.combatBus = this.ctx.createGain();
    this.feedbackBus = this.ctx.createGain();
    this.combatBus.gain.value = 1;
    this.feedbackBus.gain.value = 1;
    this.combatBus.connect(this.sfxBus);
    this.feedbackBus.connect(this.sfxBus);
    this.master.connect(this.masterEQ);
  }
  applyMix(){
    if(!this.unlocked) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(isMuted ? 0 : MASTER_OUTPUT_GAIN * audioMasterVolume, now, 0.025);
    this.sfxBus.gain.cancelScheduledValues(now);
    this.sfxBus.gain.setTargetAtTime(audioSfxVolume, now, 0.025);
    this.musicBaseGain = audioMusicVolume;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(this.musicPaused ? 0 : audioMusicVolume, now, 0.04);
  }
  setMusicPhase(phase, fadeNow=false){
    if(phase !== 'field' && phase !== 'wave' && phase !== 'boss' && phase !== 'attract') return;
    this.requestedMusicPhase=phase;
    if(!fadeNow || this.musicPhase===phase || !this.unlocked || !this.musicBus || this.musicPaused) return;
    const now=this.ctx.currentTime, gain=this.musicBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value,now);
    gain.linearRampToValueAtTime(0.0001,now+0.12);
    gain.setValueAtTime(0.0001,now+0.14);
    gain.linearRampToValueAtTime(audioMusicVolume,now+0.32);
    this.musicTransitionUntil=now+0.32;
    this.musicPhase=phase;
    this.musicStep=(phase === 'field' || phase === 'attract') ? 0 : (Math.ceil(this.musicStep/MUSIC_STEPS_PER_BAR)*MUSIC_STEPS_PER_BAR)%MUSIC_CYCLE_STEPS;
    this.musicNextTime=now+0.14;
  }
  setMusicPaused(paused){
    this.musicPaused = !!paused;
    if(!this.unlocked || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(this.musicPaused ? 0 : audioMusicVolume, now, this.musicPaused ? 0.025 : 0.08);
    if(!this.musicPaused) this.musicNextTime = now + 0.08;
  }
  startMusic(){
    if(!this.unlocked || this.musicStarted) return;
    this.musicStarted = true;
    this.musicPaused = !!(document.hidden || gameState === 'PAUSED');
    this.musicStep = 0;
    this.musicNextTime = this.ctx.currentTime + 0.08;
    const tick = () => {
      if(!this.musicStarted) return;
      this.musicFrameLoadMs = (this.musicFrameLoadMs === undefined ? perfStats.frameMs : this.musicFrameLoadMs*0.9 + perfStats.frameMs*0.1);
      const schedulerStart = performance.now(); // SCHEDULER-TIMING-01 (1.7.51): the music timer runs outside the game frame, so its cost was invisible; it is now measured
      const now = this.ctx.currentTime;
      const stepSeconds = this.musicStepSeconds();
      this.syncMusicEcho(stepSeconds, now);
      if(this.musicPaused || document.hidden || this.ctx.state !== 'running'){
        this.musicNextTime = now + stepSeconds;
      } else {
        if(this.musicNextTime < now - stepSeconds){
          const skipped = Math.ceil((now + 0.02 - this.musicNextTime) / stepSeconds);
          this.debugCounters.musicLateRecoveries++;
          this.debugCounters.musicSkippedSteps += skipped;
          this.debugCounters.musicWorstLatenessMs = Math.max(this.debugCounters.musicWorstLatenessMs, (now-this.musicNextTime)*1000);
          this.musicCycle = (this.musicCycle || 0) + Math.floor((this.musicStep + skipped) / MUSIC_CYCLE_STEPS);
          this.musicStep = (this.musicStep + skipped) % MUSIC_CYCLE_STEPS;
          this.musicNextTime += skipped * stepSeconds;
        }
        const horizon = now + 0.14;
        while(this.musicNextTime <= horizon){
          this.scheduleMusicStep(this.musicStep, this.musicNextTime);
          const stepsAdvanced = 1 + this.musicSkippedSteps(this.musicStep);
          if(this.musicStep + stepsAdvanced >= MUSIC_CYCLE_STEPS) this.musicCycle = (this.musicCycle || 0) + 1;
          this.musicStep = (this.musicStep + stepsAdvanced) % MUSIC_CYCLE_STEPS;
          this.musicNextTime += this.musicStepSeconds();
        }
      }
      const schedulerMs = performance.now() - schedulerStart;
      this.debugCounters.musicSchedulerAvgMs = (this.debugCounters.musicSchedulerAvgMs || 0)*0.95 + schedulerMs*0.05;
      this.debugCounters.musicSchedulerWorstMs = Math.max(this.debugCounters.musicSchedulerWorstMs || 0, schedulerMs);
      this.musicTimer = setTimeout(tick, 40);
    };
    tick();
  }
  stopMusic(){
    if(this.musicTimer !== null) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    this.musicStarted = false;
    this.musicPaused = true;
    if(this.unlocked && this.musicBus){
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0, now, 0.18);
    }
  }
  prepareMusicPalette(){
    if(this.brassWave) return;
    const real = new Float32Array(17), imag = new Float32Array(17);
    for(let h=1;h<17;h++) imag[h] = (h % 2 ? 1 : 0.65) / Math.pow(h, 1.35);
    this.brassWave = this.ctx.createPeriodicWave(real, imag);
  }
  sweepMusicFilter(time, open){
    this.musicFilterOpen = open;
    if(!this.musicFilter) return;
    const at = Math.max(time, this.ctx.currentTime), frequency = this.musicFilter.frequency;
    frequency.cancelScheduledValues(at);
    frequency.setValueAtTime(frequency.value, at);
    frequency.setTargetAtTime(open ? 14000 : MUSIC_FIELD_FILTER_HZ, at, open ? 0.3 : 0.5);
  }
  musicStepSeconds(){
    return 60 / (this.musicPhase === 'attract' ? MUSIC_ATTRACT_TEMPO_BPM : this.musicPhase === 'boss' ? MUSIC_BOSS_TEMPO_BPM : this.musicPhase === 'wave' ? MUSIC_COMBAT_TEMPO_BPM : MUSIC_TEMPO_BPM) / 2 / (1 + MUSIC_TEMPO_CREEP * (this.musicTempoCreep || 0));
  }
  // MUSIC-LURCH-01 (1.7.98) — see HISTORY.md § [1.7.98]
  musicSkippedSteps(step){
    const bar = Math.floor(step / MUSIC_STEPS_PER_BAR);
    const combat = this.musicPhase === 'wave' || this.musicPhase === 'boss';
    const shortBar = combat && bar % 8 === 5 && (this.musicPhase === 'boss' || bar >= 8);
    return shortBar && step % MUSIC_STEPS_PER_BAR === 5 ? 2 : 0;
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  syncMusicEcho(stepSeconds, now){
    if(!this.musicEcho || this.musicEchoStepSeconds === stepSeconds) return;
    this.musicEchoStepSeconds = stepSeconds;
    this.musicEcho.delayTime.setTargetAtTime(stepSeconds * 1.5, now, 0.05);
  }
  musicVoiceLimit(){
    if(this.musicPhase === 'attract') return MUSIC_ATTRACT_VOICE_LIMIT;
    const load = this.musicFrameLoadMs || 0;
    return load < MUSIC_LOAD_LIGHT_MS ? MUSIC_VOICE_LIMIT_LIGHT : load < MUSIC_LOAD_MEDIUM_MS ? MUSIC_VOICE_LIMIT_MEDIUM : MUSIC_VOICE_LIMIT;
  }
  reserveMusicVoice(startTime, duration, count=1, optional=false){
    const now = this.ctx.currentTime;
    let write = 0;
    for(let i=0;i<this.musicVoiceExpiry.length;i++){
      if(this.musicVoiceExpiry[i] > now) this.musicVoiceExpiry[write++] = this.musicVoiceExpiry[i];
    }
    this.musicVoiceExpiry.length = write;
    let overlapping=0;
    for(const expiry of this.musicVoiceExpiry) if(expiry>startTime) overlapping++;
    const voiceLimit = this.musicVoiceLimit();
    const optionalHeadroom = this.musicPhase === 'attract' ? MUSIC_ATTRACT_OPTIONAL_HEADROOM : MUSIC_OPTIONAL_VOICE_HEADROOM;
    if(overlapping + count > (optional ? voiceLimit - optionalHeadroom : voiceLimit)) return false;
    for(let i=0;i<count;i++) this.musicVoiceExpiry.push(startTime + duration + 0.015);
    return true;
  }
  ensureNoiseBuffer(){
    if(this.noiseBuffer) return;
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for(let i=0; i<len; i++) data[i] = Math.random()*2-1;
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  musicPercussion(time, accent, level=1){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0) return;
    const duration = accent ? 0.13 : 0.04;
    if(!this.reserveMusicVoice(time, duration, accent ? 2 : 1, !accent)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = accent ? 'bandpass' : 'highpass'; filter.frequency.value = accent ? 1900 : 7200; filter.Q.value = accent ? 0.9 : 0.6;
    gain.gain.setValueAtTime((accent ? 0.075 : 0.022) * level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, Math.random() * 1.5, duration);
    if(!accent) return;
    const body = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(210, time);
    body.frequency.exponentialRampToValueAtTime(120, time + 0.09);
    bodyGain.gain.setValueAtTime(0.05 * level, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    body.connect(bodyGain); bodyGain.connect(this.musicBus);
    body.onended = () => { body.disconnect(); bodyGain.disconnect(); };
    body.start(time);
    body.stop(time + 0.11);
  }
  musicCrash(time, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0) return;
    const duration = 0.5;
    if(!this.reserveMusicVoice(time, duration)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass'; filter.frequency.value = 5200; filter.Q.value = 0.5;
    gain.gain.setValueAtTime(0.05 * level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, Math.random() * 1.4, duration);
  }
  musicOpenHat(time, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0) return;
    const duration = 0.11;
    if(!this.reserveMusicVoice(time, duration, 1, true)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass'; filter.frequency.value = 6500; filter.Q.value = 0.5;
    gain.gain.setValueAtTime(0.03 * level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, Math.random() * 1.4, duration);
  }
  musicTone(freq, startTime, duration, type, peak, optional=false){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !freq) return;
    const fmVoice = type === 'fm' || type === 'fmkeys' || type === 'fmbass';
    const leadVoice = type === 'reed' || type === 'brass' || type === 'fm' || type === 'fmkeys';
    if(!this.reserveMusicVoice(startTime, duration, fmVoice ? 2 : 1, optional)) return;
    const vibratoVoice = duration >= 0.22 && (type === 'reed' || type === 'brass' || type === 'fmkeys') && this.reserveMusicVoice(startTime, duration, 1, true);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const endTime = startTime + duration;
    osc.type = fmVoice ? 'sine' : type === 'pluck' || type === 'reed' ? 'triangle' : type === 'brass' || type === 'wobble' ? 'sawtooth' : type === 'kick' || type === 'snap' ? 'sine' : type;
    if(type === 'brass' && this.brassWave) osc.setPeriodicWave(this.brassWave);
    let modulator = null, modulationGain = null;
    if(fmVoice){
      modulator = this.ctx.createOscillator();
      modulationGain = this.ctx.createGain();
      modulator.type = 'sine';
      const ratio = type === 'fmkeys' ? 1 : 2;
      const index = type === 'fmbass' ? 2.4 : type === 'fmkeys' ? 0.65 : 1.1;
      modulator.frequency.setValueAtTime(freq * ratio, startTime);
      modulationGain.gain.setValueAtTime(freq * index, startTime);
      modulationGain.gain.exponentialRampToValueAtTime(freq * (type === 'fmkeys' ? 0.12 : 0.06), startTime + duration * 0.72);
      modulationGain.gain.exponentialRampToValueAtTime(freq * 0.025, endTime);
      modulator.connect(modulationGain); modulationGain.connect(osc.frequency);
      modulator.start(startTime); modulator.stop(endTime + 0.015);
    }
    filter.type = 'lowpass';
    const cutoff = type === 'fmbass' ? 720 : type === 'fmkeys' ? 1900 : type === 'wobble' ? 260 : type === 'kick' ? 500 : type === 'snap' ? 900 : type === 'fm' ? 2200 : type === 'brass' ? 1500 : type === 'reed' ? 1700 : type === 'pluck' ? 2400 : type === 'triangle' ? 2600 : 900;
    filter.frequency.setValueAtTime(cutoff, startTime);
    if(type === 'reed') filter.frequency.exponentialRampToValueAtTime(1100, endTime);
    if(type === 'pluck' || type === 'brass') filter.frequency.exponentialRampToValueAtTime(type === 'pluck' ? 700 : 650, endTime);
    if(type === 'fmbass') filter.frequency.exponentialRampToValueAtTime(320, startTime + duration * 0.45);
    if(type === 'fmkeys') filter.frequency.exponentialRampToValueAtTime(850, endTime);
    filter.Q.value = type === 'wobble' ? 1.8 : 0.35;
    if(type === 'wobble'){
      filter.frequency.exponentialRampToValueAtTime(720, startTime + duration * 0.3);
      filter.frequency.exponentialRampToValueAtTime(180, startTime + duration * 0.65);
      filter.frequency.exponentialRampToValueAtTime(430, endTime);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + Math.min(duration * 0.25, type === 'reed' ? 0.028 : type === 'pluck' || type === 'fmbass' ? 0.004 : type === 'fmkeys' ? 0.008 : 0.012));
    const sustainTime = type === 'reed' ? duration * 0.70 : Math.min(duration * 0.85, Math.max(0.04, duration * 0.42));
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * (type === 'reed' ? 0.65 : 0.22)), startTime + sustainTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    osc.frequency.setValueAtTime(freq, startTime);
    if(type === 'kick' || type === 'snap') osc.frequency.exponentialRampToValueAtTime(type === 'kick' ? 46 : 95, startTime + duration * 0.6);
    osc.connect(filter);
    filter.connect(gain);
    const tail = this.routeMusicVoice(gain, freq, leadVoice ? MUSIC_PAN_LEAD_SHARE : 1, type !== 'kick' && type !== 'snap');
    if(leadVoice && this.musicEchoSend) gain.connect(this.musicEchoSend);
    let vibrato = null, vibratoDepth = null;
    if(vibratoVoice){
      vibrato = this.ctx.createOscillator();
      vibratoDepth = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(5.4 + Math.random() * 0.6, startTime);
      vibratoDepth.gain.setValueAtTime(0, startTime);
      vibratoDepth.gain.linearRampToValueAtTime(MUSIC_VIBRATO_CENTS, startTime + duration * 0.6);
      vibrato.connect(vibratoDepth); vibratoDepth.connect(osc.detune);
      vibrato.start(startTime); vibrato.stop(endTime + 0.015);
    }
    osc.start(startTime);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); if(tail !== gain) tail.disconnect(); if(modulator){ modulator.disconnect(); modulationGain.disconnect(); } if(vibrato){ vibrato.disconnect(); vibratoDepth.disconnect(); } };
    osc.stop(endTime + 0.015);
  }
  scheduleMusicStep(step, time){
    // Start quiet arrangements at their opening, even when returning mid-cycle from battle.
    if(step % MUSIC_STEPS_PER_BAR === 0 && this.musicPhase !== this.requestedMusicPhase && (this.requestedMusicPhase === 'field' || this.requestedMusicPhase === 'attract')) step = this.musicStep = 0;
    const bar = Math.floor(step / MUSIC_STEPS_PER_BAR);
    const beatStep = step % MUSIC_STEPS_PER_BAR;
    if(beatStep === 0) this.musicPhase = this.requestedMusicPhase;
    const combat = this.musicPhase === 'wave' || this.musicPhase === 'boss';
    const boss = this.musicPhase === 'boss';
    if(beatStep === 0) this.musicTempoCreep = (this.musicTempoCreep || 0) + ((combat ? this.musicIntensity || 0 : 0) - (this.musicTempoCreep || 0)) * 0.4;
    const attract = this.musicPhase === 'attract';
    if(beatStep === 0 && bar % 8 === 0) this.setMusicSectionLevel(time, attract ? -1 : Math.floor(bar / 8));
    if(beatStep === 0 && (combat || attract) !== this.musicFilterOpen) this.sweepMusicFilter(time, combat || attract);
    const phraseBar = bar % 4;
    const section = Math.floor(bar / 8);
    const cycleIndex = this.musicCycle || 0;
    const shift = musicKeyShift(cycleIndex);
    this.musicShift = shift;
    const stepSeconds = this.musicStepSeconds();
    if(attract){ this.scheduleAttractStep(time, bar, beatStep, stepSeconds, shift, cycleIndex); return; }
    if(beatStep === 0 && this.musicPhase !== this.musicStingPhase){
      this.musicStingPhase = this.musicPhase;
      if(combat) this.scheduleMusicSting(time, shift, stepSeconds, boss);
    }
    const baseChord = (combat ? MUSIC_COMBAT_ROOTS : MUSIC_BASS_ROOTS)[Math.floor(bar / 2) % MUSIC_BASS_ROOTS.length];
    const chord = baseChord + shift;
    const minor = baseChord === 38;
    const intensity = this.musicIntensity || 0;
    const breath = phraseBar === 3 && beatStep >= (combat && section === 2 ? 6 : combat ? 4 : 6);
    if(combat){
      if(beatStep === 0 || section === 1 && beatStep === 3 || section === 2 && beatStep === 6) this.musicTone(138, time, 0.15, 'kick', beatStep === 0 ? 0.15 : 0.10);
      if(beatStep === 4){
        this.musicPercussion(time, true);
        this.musicTone(195, time, 0.065, 'snap', 0.075);
      }
      if(!breath && (beatStep === 1 || beatStep === 3 || beatStep === 6)){
        const offset = beatStep === 6 ? (phraseBar === 2 ? 12 : 7) : beatStep === 3 ? (phraseBar === 1 ? 7 : phraseBar === 2 ? 5 : section === 1 ? 12 : 0) : 0;
        this.musicTone(midiToFrequency(chord + offset), time + (beatStep === 3 ? 0.003 : 0), 0.14, (section === 1 || boss) ? 'wobble' : 'fmbass', (section === 1 || boss) ? 0.12 : 0.085);
      }
      if(beatStep === 7 && (phraseBar === 1 || phraseBar === 3 && section > 0)) this.musicPercussion(time, false);
      if(!breath && beatStep === 5) this.musicTone(midiToFrequency(chord + 10), time, 0.11, 'fmbass', 0.06);
      if(boss && beatStep === 4) this.musicTone(138, time, 0.12, 'kick', 0.11);
      if(boss && beatStep % 2 === 1) this.musicPercussion(time, false);
      if(section > 0 && (beatStep === 2 || beatStep === 6)) this.musicPercussion(time, false);
      if(section > 0 && phraseBar === 3 && beatStep === 6) this.musicTone(138, time, 0.12, 'kick', 0.09);
      if(phraseBar === 3 && beatStep >= 6) this.musicPercussion(time, beatStep === 7);
      if(bar % 8 === 7 && beatStep === 7) this.musicTone(195, time, 0.07, 'snap', 0.09);
      if(!breath && (phraseBar === 1 || phraseBar === 2) && beatStep === 5) this.musicTone(midiToFrequency(chord + 12 + MUSIC_COMBAT_INTERVALS[2 + bar % 3]), time + 0.004, 0.12, 'fmkeys', 0.04);
      if(!breath && intensity > 0.5 && beatStep % 2 === 0) this.musicTone(midiToFrequency(chord + 24 + [0, 7, 12, 7][(beatStep / 2) % 4]), time, 0.09, 'pluck', 0.032 * intensity);
      if(!breath) this.scheduleCombatHats(time, beatStep, stepSeconds, 0.5 + 0.5 * intensity);
      if(!breath && (section > 0 || intensity > 0.35)) this.scheduleMusicArpeggio(time, baseChord, chord, beatStep, stepSeconds, 0.55 + 0.55 * intensity);
    }
    if(combat) this.scheduleCombatLayers(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath);
    if(!combat && (bar === 7 || bar === 15) && beatStep === 7) return;
    if(combat || bar > 0) this.scheduleSectionAccent(time, bar, beatStep, cycleIndex, combat);
    if(combat || bar >= 8) this.scheduleDrumFill(time, bar, beatStep, stepSeconds, combat ? 1 : 0.6);
    this.scheduleCycleTurnaround(time, bar, beatStep, stepSeconds, cycleIndex, combat);
    if(!combat) this.scheduleFieldStep(time, bar, beatStep, phraseBar, shift, cycleIndex, breath);
    const cadence=false;
    const degree = !combat ? null : MUSIC_COMBAT_MELODY[bar % MUSIC_COMBAT_MELODY.length][beatStep];
    if(degree !== null && !breath){
      const intervals = combat ? (boss || section === 2 && phraseBar === 3 ? MUSIC_PHRYGIAN_INTERVALS : MUSIC_COMBAT_INTERVALS) : minor ? MUSIC_MINOR_INTERVALS : MUSIC_MAJOR_INTERVALS;
      const octave = combat && section === 2 && beatStep === 2 ? 12 : 0;
      const keysFirst = (section === 0 || phraseBar === 2) !== (cycleIndex % 2 === 1);
      const voice = combat ? (section === 2 && phraseBar === 2 ? 'fm' : 'brass') : (cadence ? 'reed' : keysFirst ? 'fmkeys' : 'pluck');
      const duration=combat ? (beatStep===0 ? 0.25 : beatStep%2 ? 0.11 : 0.15) : cadence ? this.musicStepSeconds()*1.65 : voice==='reed' ? 0.28 : voice==='fmkeys' ? 0.24 : beatStep%2 ? 0.13 : 0.20;
      const accent=beatStep===0 ? 1 : beatStep%2 ? 0.78 : 0.90;
      const phraseGain=phraseBar===3 ? 0.82 : section===1 ? 0.94 : 1;
      const leadPitch = chord + (combat ? 12 : 24) + intervals[degree] + octave;
      this.musicTone(midiToFrequency(leadPitch), time + (Math.random() - 0.5) * 0.008, duration, voice, (combat ? 0.11 : 0.095)*accent*phraseGain*(0.92 + Math.random()*0.16));
      if(combat && (boss || section > 0) && (beatStep === 0 || beatStep === 4)) this.musicTone(midiToFrequency(leadPitch - 12), time, duration, 'brass', 0.05 * accent, true);
      if(combat && (boss || section > 0)) this.musicTone(midiToFrequency(musicDiatonicAbove(leadPitch, 38 + shift)), time + 0.003, duration, 'brass', 0.042 * accent, true);
      if(combat && (boss || section === 2)){
        this.popTone(midiToFrequency(leadPitch), time, duration, 'harmony', 0.026 * accent, true);
        this.popTone(midiToFrequency(leadPitch + 12), time + 0.002, duration * 0.8, 'bell', 0.03 * accent, true);
      }
    }
  }
  // MUSIC-ATTRACT-02 (1.7.104) — see HISTORY.md § [1.7.104]
  popTone(freq, time, duration, kind, peak, optional=false){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !freq) return;
    const spec = POP_VOICES[kind], oscillatorCount = spec.detunes.length + (spec.sub || spec.fmRatio ? 1 : 0), endTime = time + duration, releaseEnd = endTime + spec.release;
    if(!this.reserveMusicVoice(time, duration + spec.release, oscillatorCount, optional)) return;
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), sources = [];
    filter.type = 'lowpass'; filter.Q.value = spec.q;
    filter.frequency.setValueAtTime(spec.cutoffStart, time);
    filter.frequency.exponentialRampToValueAtTime(spec.cutoffEnd, time + Math.max(0.02, duration * spec.cutoffTime));
    const sustainTime = time + Math.max(spec.attack + 0.01, duration * spec.decay);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + spec.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * spec.sustain), sustainTime);
    gain.gain.setValueAtTime(Math.max(0.0001, peak * spec.sustain), Math.max(sustainTime, endTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    for(const detune of spec.detunes){
      const oscillator = this.ctx.createOscillator();
      oscillator.type = spec.wave; oscillator.frequency.setValueAtTime(freq, time); oscillator.detune.value = detune;
      oscillator.connect(filter); sources.push(oscillator);
    }
    if(spec.sub){
      const sub = this.ctx.createOscillator(), subGain = this.ctx.createGain();
      sub.type = 'sine'; sub.frequency.setValueAtTime(freq, time); subGain.gain.value = 0.9;
      sub.connect(subGain); subGain.connect(filter); sources.push(sub);
    }
    if(spec.fmRatio){
      const modulator = this.ctx.createOscillator(), modulationGain = this.ctx.createGain();
      modulator.type = 'sine'; modulator.frequency.setValueAtTime(freq * spec.fmRatio, time);
      modulationGain.gain.setValueAtTime(freq * spec.fmIndex, time);
      modulationGain.gain.exponentialRampToValueAtTime(freq * 0.05, time + Math.max(0.05, duration * 0.8));
      modulator.connect(modulationGain); modulationGain.connect(sources[0].frequency); sources.push(modulator);
    }
    filter.connect(gain);
    const tail = this.routeMusicVoice(gain, freq, kind === 'lead' ? MUSIC_PAN_LEAD_SHARE : 1, true);
    if(spec.echo && this.musicEchoSend) gain.connect(this.musicEchoSend);
    sources[0].onended = () => { for(const source of sources) source.disconnect(); filter.disconnect(); gain.disconnect(); if(tail !== gain) tail.disconnect(); };
    for(const source of sources){ source.start(time); source.stop(releaseEnd + 0.02); }
  }
  popSnare(time, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !this.reserveMusicVoice(time, 0.14, 2, true)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), body = this.ctx.createOscillator(), bodyGain = this.ctx.createGain();
    source.buffer = this.noiseBuffer; filter.type = 'bandpass'; filter.frequency.value = 2100; filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.11 * level, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    body.type = 'triangle'; body.frequency.setValueAtTime(230, time); body.frequency.exponentialRampToValueAtTime(130, time + 0.08);
    bodyGain.gain.setValueAtTime(0.08 * level, time); bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    body.connect(bodyGain); bodyGain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); body.disconnect(); bodyGain.disconnect(); };
    source.start(time, Math.random() * 1.5, 0.14); body.start(time); body.stop(time + 0.1);
  }
  popClap(time, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !this.reserveMusicVoice(time, 0.09, 1, true)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer; filter.type = 'bandpass'; filter.frequency.value = 1300; filter.Q.value = 1.1;
    gain.gain.setValueAtTime(0.0001, time);
    for(const offset of [0, 0.012, 0.026]){ gain.gain.setValueAtTime(0.07 * level, time + offset); gain.gain.exponentialRampToValueAtTime(0.012 * level, time + offset + 0.011); }
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, Math.random() * 1.5, 0.09);
  }
  popRiser(time, duration, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !this.reserveMusicVoice(time, duration, 1, true)) return;
    this.ensureNoiseBuffer();
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer; source.loop = true; filter.type = 'bandpass'; filter.Q.value = 2.2;
    filter.frequency.setValueAtTime(300, time); filter.frequency.exponentialRampToValueAtTime(9000, time + duration);
    gain.gain.setValueAtTime(0.002, time); gain.gain.exponentialRampToValueAtTime(0.075 * level, time + duration * 0.98); gain.gain.linearRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, 0); source.stop(time + duration + 0.02);
  }
  // MUSIC-BUILD-DROP-01 (1.7.171): reserve the landing before optional layers; no reverb on sub-bass.
  musicBassDrop(time, root, stepSeconds, level){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0) return;
    const duration = Math.min(1.2, stepSeconds * 4), frequency = midiToFrequency(root);
    if(!this.reserveMusicVoice(time, duration + 0.03, 2)) return;
    const sub = this.ctx.createOscillator(), body = this.ctx.createOscillator(), gain = this.ctx.createGain(), bodyGain = this.ctx.createGain();
    sub.type = 'sine'; body.type = 'triangle';
    sub.frequency.setValueAtTime(frequency * 2, time);
    sub.frequency.exponentialRampToValueAtTime(frequency, time + 0.12);
    body.frequency.setValueAtTime(frequency * 4, time);
    body.frequency.exponentialRampToValueAtTime(frequency * 2, time + 0.12);
    bodyGain.gain.value = 0.22;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.15 * level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.055 * level, time + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    sub.connect(gain); body.connect(bodyGain); bodyGain.connect(gain); gain.connect(this.musicBus);
    sub.onended = () => { sub.disconnect(); body.disconnect(); bodyGain.disconnect(); gain.disconnect(); };
    sub.start(time); body.start(time); sub.stop(time + duration + 0.02); body.stop(time + duration);
  }
  scheduleAttractStep(time, bar, beatStep, stepSeconds, shift, cycleIndex){
    const section = bar < 4 ? 0 : bar < 8 ? 1 : bar < 12 ? 2 : bar < 16 ? 3 : 4, level = MUSIC_ATTRACT_SECTION_LEVEL[section];
    const chord = MUSIC_ATTRACT_CHORDS[section === 3 ? MUSIC_ATTRACT_BUILD_CHORDS[bar - 12] : Math.floor(bar / 2) % MUSIC_ATTRACT_CHORDS.length];
    const chordRoot = chord.root + shift, tonic = MUSIC_ATTRACT_TONIC + shift, halfStep = stepSeconds / 2, isIntro = section === 0, isBuild = section === 3, isChorus = section === 4;
    // Leave one eighth-note of space before the main landing.
    if(bar === 15 && beatStep === 7) return;
    const drop = beatStep === 0 && (bar === 4 || bar === 16);
    if(drop) this.musicBassDrop(time, chordRoot, stepSeconds, bar === 16 ? 1 : 0.65);
    if(beatStep === 0 && bar % 2 === 0){
      const swell = isIntro ? 0.55 + bar * 0.15 : 1;
      [chord.triad[0], chord.triad[2]].forEach(interval => this.popTone(midiToFrequency(chordRoot + 24 + interval), time, stepSeconds * MUSIC_STEPS_PER_BAR * 1.96, 'pad', 0.03 * level * swell, true));
    }
    const rollBar = bar === 15, kickOut = rollBar && beatStep >= 4;
    if(bar >= 4 && !drop && !kickOut && beatStep % 2 === 0) this.musicTone(138, time, 0.14, 'kick', (beatStep === 0 ? 0.11 : 0.085) * level);
    if(isChorus && beatStep === 7 && bar % 2 === 1) this.musicTone(138, time, 0.12, 'kick', 0.07);
    const backbeat = (beatStep === 2 || beatStep === 6) && bar >= 4 && !(bar === 14 || rollBar);
    if(backbeat){ this.popSnare(time, level * 0.9); if(isChorus || section === 2) this.popClap(time, level * 0.8); }
    if(bar === 13 && (beatStep === 4 || beatStep === 7)) this.popSnare(time, 0.7);
    if(bar === 14 || rollBar){
      const progress = ((bar - 14) * MUSIC_STEPS_PER_BAR + beatStep) / (2 * MUSIC_STEPS_PER_BAR);
      this.popSnare(time, 0.45 + 0.55 * progress);
      this.popSnare(time + halfStep, 0.4 + 0.6 * progress);
    }
    if(bar >= 2 && (!isIntro || beatStep % 2 === 1)) this.musicPercussion(time, false, (isIntro ? 0.3 : 1.1) * level * (beatStep % 2 ? 1.15 : 0.8));
    if(section >= 2 && beatStep % 2 === 1) this.musicOpenHat(time, 1.2 * level);
    if(isChorus) this.musicPercussion(time + halfStep, false, 0.95);
    if(beatStep === 0 && ((bar === 16) || (bar === 20))) this.musicCrash(time, bar === 20 ? 0.8 : 1.1);
    if(beatStep === 0 && bar === 14) this.popRiser(time, stepSeconds * (MUSIC_STEPS_PER_BAR * 2 - 1), 0.85);
    if(beatStep === 0 && bar === 3) this.popRiser(time, stepSeconds * MUSIC_STEPS_PER_BAR, 0.32);
    if(bar === 7 || bar === 23) this.scheduleDrumFill(time, bar, beatStep, stepSeconds, 0.8);
    let bassOffset = null;
    if(isIntro) bassOffset = null;
    else if(isChorus) bassOffset = beatStep % 2 ? 12 : (beatStep === 4 ? 7 : 0);
    else if(isBuild) bassOffset = 0;
    else if(MUSIC_ATTRACT_BASS[beatStep] !== undefined) bassOffset = MUSIC_ATTRACT_BASS[beatStep];
    if(bassOffset !== null && !drop && !kickOut) this.popTone(midiToFrequency(chordRoot + 12 + bassOffset), time, stepSeconds * (beatStep % 2 ? 0.55 : 0.85), 'bass', 0.062 * level);
    if(bar >= 4){
      const arpIndex = MUSIC_ATTRACT_ARP[beatStep];
      this.popTone(midiToFrequency(chordRoot + 24 + chord.triad[arpIndex] + (beatStep >= 4 ? 12 : 0)), time, stepSeconds * 0.5, 'pluck', (isChorus ? 0.02 : 0.03) * level, true);
    }
    if(section >= 2 && (beatStep === 0 || beatStep === 3 || beatStep === 6)){
      this.popTone(midiToFrequency(chordRoot + 24 + chord.triad[1]), time, halfStep * 1.6, 'pluck', 0.026 * level, true);
      this.popTone(midiToFrequency(chordRoot + 24 + chord.triad[2]), time + 0.003, halfStep * 1.6, 'pluck', 0.022 * level, true);
    }
    if(beatStep === 7 && bar % 2 === 1 && bar >= 4 && !kickOut){
      const nextChord = MUSIC_ATTRACT_CHORDS[(Math.floor(bar / 2) + 1) % MUSIC_ATTRACT_CHORDS.length];
      this.popTone(midiToFrequency(nextChord.root + shift + 12), time + halfStep, halfStep * 1.5, 'bass', 0.06 * level);
    }
    if(isChorus && !kickOut) this.popTone(midiToFrequency(chordRoot + 12 + (beatStep % 2 ? 12 : 0)), time + halfStep, halfStep * 0.8, 'bass', 0.034 * level, true);
    const degree = MUSIC_COMBAT_MELODY[bar % 4][beatStep];
    const fitToChord = note => {
      if(beatStep !== 0 && beatStep !== 4) return note;
      for(const interval of chord.triad){
        const gap = (((note - (chordRoot + interval)) % 12) + 12) % 12;
        if(gap === 1) return note - 1;
        if(gap === 11) return note + 1;
      }
      return note;
    };
    if(degree !== null && degree !== undefined && !kickOut){
      const pitch = fitToChord(tonic + 24 + MUSIC_MAJOR_INTERVALS[degree]), held = beatStep === 0 ? stepSeconds * 1.7 : beatStep % 2 ? stepSeconds * 0.55 : stepSeconds * 0.85;
      if(section <= 1) this.popTone(midiToFrequency(pitch - 12), time, held * 1.4, 'warm', 0.09 * level);
      else {
        this.popTone(midiToFrequency(pitch), time, held, 'lead', (isChorus ? 0.058 : 0.04) * level);
        if(isChorus){
          this.popTone(midiToFrequency(fitToChord(tonic + 24 + MUSIC_MAJOR_INTERVALS[Math.min(9, degree + 2)])), time, held, 'harmony', 0.03, true);
          this.popTone(midiToFrequency(pitch + 12), time, held * 0.6, 'pluck', 0.026, true);
        }
      }
    }
  }
  // MUSIC-LAYERS-01 (1.7.105) — see HISTORY.md § [1.7.105]: the wave and boss themes gain a chord pad from the second section, a layered snare on the backbeat, and a noise riser through the last two bars of each section, so the 24 bars build instead of staying level
  scheduleCombatLayers(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath){
    if(beatStep === 0 && bar % 2 === 0 && bar > 0 && (section > 0 || boss)){
      const tones = musicChordTones(baseChord), padGain = (section === 2 || boss ? 0.032 : 0.024);
      this.popTone(midiToFrequency(chord + 24), time, stepSeconds * 15.5, 'pad', padGain, true);
      this.popTone(midiToFrequency(chord + 24 + tones[1]), time, stepSeconds * 15.5, 'pad', padGain * 0.8, true);
    }
    if(beatStep === 4 && !breath && (section > 0 || boss)) this.popSnare(time, boss ? 0.7 : 0.5);
    if(beatStep === 0 && bar % 8 === 6) this.popRiser(time, stepSeconds * MUSIC_STEPS_PER_BAR * 2, boss ? 0.8 : 0.55);
    this.scheduleCombatDrive(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath);
  }
  // COMBAT-DRIVE-01 (1.7.116): the wave and boss themes gain the engines of the late-era action scores: a galloping sixteenth bass with octave jumps and a chromatic lift (Ys, Soldier Blade), a high pedal ostinato alternating fifth and tonic (Monster Hunter), power-chord stabs on each second bar, a crescendo snare roll into every eighth bar, and a flat-fifth stab on boss off-beats.
  scheduleCombatDrive(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath){
    const half = stepSeconds / 2, intensity = this.musicIntensity || 0, driving = boss || section > 0;
    if(driving && !breath){
      for(let sub = 0; sub < 2; sub++){
        const index = beatStep * 2 + sub;
        const pitch = chord - 12 + (index % 4 === 2 ? 12 : 0) + (index % 8 === 7 ? 3 : 0);
        this.musicTone(midiToFrequency(pitch), time + sub * half, stepSeconds * 0.4, 'fmbass', 0.045 * (sub ? 0.75 : 1) * (0.7 + 0.3 * intensity), true);
      }
    }
    if((boss || section === 2) && !breath){
      for(let sub = 0; sub < 2; sub++){
        const index = beatStep * 2 + sub;
        const lift = bar % 4 === 3 && index >= 12 ? 1 : 0;
        this.musicTone(midiToFrequency(chord + 36 + (index % 2 ? 0 : 7) + lift), time + sub * half, stepSeconds * 0.35, 'pluck', 0.016 * (0.6 + 0.4 * intensity), true);
      }
    }
    if(driving && beatStep === 0 && bar % 2 === 0){
      this.musicTone(midiToFrequency(chord + 12), time, stepSeconds * 1.5, 'brass', 0.05, true);
      this.musicTone(midiToFrequency(chord + 19), time + 0.003, stepSeconds * 1.5, 'brass', 0.042, true);
    }
    if(bar % 8 === 7 && beatStep >= 4){
      for(let sub = 0; sub < 2; sub++) this.popSnare(time + sub * half, 0.3 + 0.08 * ((beatStep - 4) * 2 + sub));
    }
    if(boss && beatStep === 7 && bar % 2 === 1 && !breath){
      this.musicTone(midiToFrequency(chord + 18), time + half, stepSeconds * 0.8, 'brass', 0.05, true);
    }
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleCombatHats(time, beatStep, stepSeconds, level){
    if(beatStep % 2 === 0){ this.musicOpenHat(time, level); return; }
    this.musicPercussion(time, false, level * 0.6);
    this.musicPercussion(time + stepSeconds / 2, false, level * 0.8);
  }
  // MUSIC-STING-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleMusicSting(time, shift, stepSeconds, boss){
    const tonic = 38 + shift + 24;
    const level = boss ? 1.25 : 1;
    MUSIC_STING_PAIRS.forEach(([lowerOffset, upperOffset], hit) => {
      const hitTime = time + hit * stepSeconds * 2;
      const hold = hit === MUSIC_STING_PAIRS.length - 1 ? stepSeconds * 6 : stepSeconds * 1.8;
      this.musicTone(midiToFrequency(tonic + lowerOffset), hitTime, hold, 'brass', 0.075 * level);
      this.musicTone(midiToFrequency(tonic + upperOffset), hitTime, hold, 'brass', 0.06 * level);
    });
    this.musicTone(midiToFrequency(tonic - 24), time, stepSeconds * 4, 'fmbass', 0.1 * level);
    this.musicCrash(time + stepSeconds * 6, level);
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleMusicArpeggio(time, baseRoot, shiftedRoot, beatStep, stepSeconds, level){
    const tones = musicChordTones(baseRoot);
    for(let half = 0; half < 2; half++){
      const shapeIndex = (beatStep * 2 + half) % MUSIC_ARPEGGIO_SHAPE.length;
      const pitch = shiftedRoot + 12 + tones[MUSIC_ARPEGGIO_SHAPE[shapeIndex]];
      this.musicTone(midiToFrequency(pitch), time + half * stepSeconds / 2, stepSeconds * 0.42, 'pluck', 0.03 * level * (half ? 0.8 : 1), true);
    }
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleSectionAccent(time, bar, beatStep, cycleIndex, combat){
    if(beatStep !== 0 || bar % 8 !== 0 || (bar === 0 && cycleIndex === 0)) return;
    this.musicCrash(time, combat ? 1 : 0.6);
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleDrumFill(time, bar, beatStep, stepSeconds, level){
    if(bar % 8 !== 7 || beatStep < 4) return;
    for(let half = 0; half < 2; half++){
      const hitIndex = (beatStep - 4) * 2 + half;
      this.musicTone(MUSIC_TOM_PITCHES[Math.min(MUSIC_TOM_PITCHES.length - 1, Math.floor(hitIndex / 2))], time + half * stepSeconds / 2, 0.11, 'kick', 0.1 * level);
    }
  }
  // MUSIC-DRIVE-01 (1.7.98) — see HISTORY.md § [1.7.98]
  scheduleCycleTurnaround(time, bar, beatStep, stepSeconds, cycleIndex, combat){
    if(bar !== MUSIC_BARS - 1 || beatStep < 4) return;
    const incomingTonic = 38 + musicKeyShift(cycleIndex + 1) + 24;
    for(let half = 0; half < 2; half++){
      const runIndex = (beatStep - 4) * 2 + half;
      const lift = 0.55 + 0.45 * runIndex / (MUSIC_TURNAROUND_RUN.length - 1);
      this.musicTone(midiToFrequency(incomingTonic + MUSIC_TURNAROUND_RUN[runIndex]), time + half * stepSeconds / 2, stepSeconds * 0.45, combat ? 'brass' : 'reed', (combat ? 0.1 : 0.075) * lift);
    }
  }
  // IDLE-LAYERS-01, MUSIC-BUILD-DROP-01 (1.7.171): later sections add chord arpeggios, 3+3+2 stabs and phrase answers. Decorative bells are removed; risers resolve into pitched bass at bars 8 and 16, leaving the last eighth-note clear.
  scheduleIdleLayers(time, bar, beatStep, phraseBar, section, progression, baseRoot, root, stepSeconds, breath){
    const tones = musicChordTones(baseRoot), half = stepSeconds / 2, tonic = root - baseRoot + 38;
    if(section >= 1 && !breath){
      for(let sub = 0; sub < 2; sub++){
        const index = (beatStep * 2 + sub) % MUSIC_ARPEGGIO_SHAPE.length;
        const lift = (beatStep + sub) % 4 === 3 ? 12 : 0;
        this.musicTone(midiToFrequency(root + 24 + tones[MUSIC_ARPEGGIO_SHAPE[index]] + lift), time + sub * half, stepSeconds * 0.42, 'pluck', (section === 2 ? 0.026 : 0.019) * (sub ? 0.8 : 1), true);
      }
    }
    if(section >= 1 && !breath && (beatStep === 0 || beatStep === 3 || beatStep === 6)){
      this.musicTone(midiToFrequency(root + 12 + tones[1]), time, stepSeconds * 1.2, 'fmkeys', 0.032, true);
      this.musicTone(midiToFrequency(root + 12 + tones[2]), time + 0.003, stepSeconds * 1.2, 'fmkeys', 0.026, true);
    }
    if(beatStep === 0 && bar % 4 === 0) this.musicTone(midiToFrequency(tonic + 12), time, stepSeconds * 7.6, 'triangle', 0.03, true);
    if(section >= 1 && !breath && (beatStep === 3 || beatStep === 5)) this.musicTone(midiToFrequency(root - 12 + tones[beatStep === 3 ? 2 : 1]), time, stepSeconds * 0.85, 'fmbass', 0.038, true);
    if(beatStep === 7 && bar % 2 === 1){
      const nextBase = progression[(Math.floor(bar / 2) + 1) % progression.length];
      this.musicTone(midiToFrequency(nextBase + (root - baseRoot) + 12), time + half, stepSeconds * 0.9, 'fmbass', 0.06);
    }
    if(section === 2 && beatStep === 0 && bar % 4 === 0 && bar !== 16) this.musicTone(92, time, 0.3, 'kick', 0.09);
    if(phraseBar === 3 && beatStep >= 6){
      for(let sub = 0; sub < 2; sub++){
        const run = (beatStep - 6) * 2 + sub;
        this.musicTone(midiToFrequency(tonic + 24 + MUSIC_MINOR_INTERVALS[run + 1]), time + sub * half, stepSeconds * 0.45, 'pluck', 0.04 * (0.7 + run * 0.1), true);
      }
    }
    if(beatStep === 0 && (bar === 6 || bar === 14)) this.popRiser(time, stepSeconds * (MUSIC_STEPS_PER_BAR * 2 - 1), 0.4);
  }
  // FIELD-VARIATION-01 (1.7.36): the idle theme never plays the same 24 bars twice. Four arrangements rotate cycle by cycle (theme, answer,
  // contrast, development), each with its own melody treatment, bass pattern, drums and harmony, and every bar draws its small decisions from a
  // seeded generator, so it varies but is exactly repeatable.
  scheduleFieldStep(time, bar, beatStep, phraseBar, shift, cycleIndex, breath){
    const arrangement = cycleIndex % 4;
    const barRng = mulberry32(cycleIndex*7919 + bar*104729);
    const barPick = barRng(), barPick2 = barRng(), barPick3 = barRng();
    const progression = FIELD_ROOT_PROGRESSIONS[cycleIndex % FIELD_ROOT_PROGRESSIONS.length];
    const baseRoot = progression[Math.floor(bar / 2) % progression.length];
    const root = baseRoot + shift;
    const section = Math.floor(bar / 8);
    const buildUp = bar < 8;
    const stepSeconds = this.musicStepSeconds();
    if(bar < 4){
      if(beatStep === 0 && bar % 2 === 0) this.popTone(midiToFrequency(root + 12), time, stepSeconds * 15, 'pad', 0.014, true);
      const note = MUSIC_FIELD_MELODY[bar % 4][beatStep];
      if(note !== null) this.popTone(midiToFrequency(50 + shift + note), time, stepSeconds * 1.4, 'warm', 0.035 + bar * 0.004);
      return;
    }
    const drop = beatStep === 0 && (bar === 8 || bar === 16);
    if(drop) this.musicBassDrop(time, root, stepSeconds, bar === 16 ? 0.8 : 0.65);
    // bass
    const bassPattern = FIELD_BASS_PATTERNS[buildUp ? 2 : arrangement === 1 ? 1 : (barPick < 0.5 ? 0 : barPick < 0.8 ? 3 : 1)];
    if(!breath && !drop) for(const [bassStep, interval] of bassPattern) if(bassStep === beatStep) this.musicTone(midiToFrequency(root + interval), time, beatStep === 0 ? 0.27 : 0.16, arrangement === 1 ? 'fmbass' : 'triangle', beatStep === 0 ? 0.075 : 0.045);
    // pad drone under the answer and contrast arrangements
    if(beatStep === 0 && bar % 2 === 0 && (arrangement === 1 || arrangement === 2)){
      this.musicTone(midiToFrequency(root + 12), time, stepSeconds*7.5, 'triangle', 0.028);
      this.musicTone(midiToFrequency(root + 19), time, stepSeconds*7.5, 'triangle', 0.018);
    }
    if(beatStep === 0 && bar % 2 === 0) this.musicTone(midiToFrequency(root + 12 + musicChordTones(baseRoot)[1]), time, stepSeconds*7.5, 'triangle', 0.016, true);
    // drums
    if(!buildUp && !drop){
      const drumStyle = arrangement === 0 ? 0 : arrangement === 1 ? 2 : arrangement === 2 ? 1 : (barPick2 < 0.5 ? 1 : 2);
      if(drumStyle === 0){
        if(beatStep === 0) this.musicTone(110, time, 0.22, 'kick', 0.07);
        if(beatStep === 4 && (phraseBar === 1 || phraseBar === 3)) this.musicTone(110, time, 0.18, 'kick', 0.045);
      } else if(drumStyle === 1){
        if(beatStep === 0 || beatStep === 3 || beatStep === 6) this.musicTone(110, time, 0.2, 'kick', beatStep === 0 ? 0.07 : 0.045);
      } else {
        if(beatStep === 0 || beatStep === 4) this.musicTone(110, time, 0.2, 'kick', beatStep === 0 ? 0.07 : 0.05);
        if(beatStep === 2 || beatStep === 6) this.musicPercussion(time, false);
      }
    }
    if(phraseBar === 3 && beatStep >= 6) this.musicPercussion(time, beatStep === 7);
    if(bar % 8 === 7 && beatStep === 7) this.musicTone(195, time, 0.07, 'snap', 0.08);
    if(!buildUp && !breath && arrangement > 0 && beatStep === 4) this.musicPercussion(time, true, 0.55);
    if(!buildUp && !breath && section > 0 && arrangement >= 2 && beatStep % 2 === 0) this.musicPercussion(time + stepSeconds / 2, false, 0.7);
    if(!buildUp && !breath) this.scheduleMusicArpeggio(time, baseRoot, root, beatStep, stepSeconds, section > 0 || cycleIndex > 0 ? 0.5 : 0.34);
    // melody
    this.scheduleIdleLayers(time, bar, beatStep, phraseBar, section, progression, baseRoot, root, stepSeconds, breath);
    if(breath || (bar >= 8 && barPick3 < 0.08)) return;
    let notes = (arrangement === 2 ? FIELD_MELODY_B : MUSIC_FIELD_MELODY)[bar % 12];
    if(arrangement === 3) notes = fieldVariedBar(notes, mulberry32(cycleIndex*104729 + bar*7919));
    const offset = notes[beatStep];
    if(offset === null || offset === undefined) return;
    if(bar < 8){
      this.popTone(midiToFrequency(50 + shift + offset), time, stepSeconds * 1.4, 'warm', 0.05);
      return;
    }
    const voice = arrangement === 1 ? 'fmkeys' : arrangement === 3 ? (bar % 2 ? 'fmkeys' : 'reed') : 'reed';
    const pitch = 38 + shift + 24 + offset;
    const strong = beatStep === 0 ? 1 : 0.86;
    this.musicTone(midiToFrequency(pitch), time + (Math.random() - 0.5) * 0.008, beatStep % 4 === 0 ? 0.3 : 0.17, voice, 0.085 * strong * (0.92 + Math.random()*0.16));
    if((arrangement === 0 || arrangement === 3) && section > 0 && beatStep % 2 === 0) this.musicTone(midiToFrequency(musicDiatonicAbove(pitch, 38 + shift)), time + 0.004, beatStep % 4 === 0 ? 0.3 : 0.17, 'reed', 0.03, true);
    if(arrangement === 1 && (beatStep === 0 || beatStep === 4)) this.musicTone(midiToFrequency(pitch + 7), time + 0.004, 0.2, 'pluck', 0.028);
    if(arrangement === 2 && beatStep % 2 === 0) this.musicTone(midiToFrequency(pitch - 12), time + stepSeconds, 0.2, 'fmkeys', 0.03);
    if(arrangement === 3 && beatStep === 5 && (phraseBar === 1 || phraseBar === 2)) this.musicTone(midiToFrequency(root + 24 + [0, 3, 7][bar % 3]), time + 0.004, 0.14, 'pluck', 0.03);
  }
  // CA179 — see HISTORY.md § [1.5.7] Code Archaeology, CA179
  initReverb(){
    if(this.reverbNode) return;
    const len = Math.floor(this.ctx.sampleRate * 0.9);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for(let ch=0; ch<2; ch++){
      const data = buf.getChannelData(ch);
      for(let i=0; i<len; i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.2);
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = buf;
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.35;
    this.reverbNode.connect(this.reverbGain);
    // CA180 — see HISTORY.md § [1.5.7] Code Archaeology, CA180
    this.reverbGain.connect(this.sfxBus || this.master);
  }
  // CA181 — see HISTORY.md § [1.5.7] Code Archaeology, CA181
  panFor(worldX){
    if(worldX === undefined || typeof camera === 'undefined') return 0;
    const screenX = worldX*camera.zoom + camera.x;
    return clampNum((screenX - CANVAS_W/2) / (CANVAS_W/2), -1, 1);
  }
  gainFor(worldX, worldY){
    if(!Number.isFinite(worldX) || typeof camera === 'undefined') return 1;
    const dx = Math.max(0,Math.abs(worldX*camera.zoom+camera.x-CANVAS_W/2)-CANVAS_W*0.35) / Math.max(1,CANVAS_W/2);
    const dy = Number.isFinite(worldY) ? Math.max(0,Math.abs(worldY*camera.zoom+camera.y-CANVAS_H/2)-CANVAS_H*0.35) / Math.max(1,CANVAS_H/2) : 0;
    return Math.max(0.12,1/(1+dx*dx*3+dy*dy*3));
  }
  focusCue(){
    if(!this.combatBus || !this.unlocked || isMuted) return;
    const now = this.ctx.currentTime;
    if(now < this.combatDuckUntil) return;
    this.combatDuckUntil = now + 0.30;
    this.debugCounters.priorityEvents++;
    const gain = this.combatBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value,now);
    gain.linearRampToValueAtTime(0.55,now+0.015);
    gain.linearRampToValueAtTime(0.55,now+0.16);
    gain.linearRampToValueAtTime(1,now+0.30);
  }
  // CA182 — see HISTORY.md § [1.5.7] Code Archaeology, CA182
  duck(amountDb, durationSec){
    if(!this.unlocked || isMuted || this.musicPaused || this.musicBaseGain <= 0) return;
    const now = this.ctx.currentTime;
    if(now < (this.musicTransitionUntil || 0)) return;
    const baseline = this.musicBaseGain;
    const duckGain = baseline * Math.pow(10, amountDb / 20);
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(duckGain, now + 0.02);
    this.musicBus.gain.exponentialRampToValueAtTime(baseline, now + durationSec);
  }
  tone(freq, duration, type, freqEnd, pan, reverbSend, delay, force, stablePitch, amplitude){
    if(!this.unlocked) return;
    if(isMuted || audioSfxVolume <= 0) return;
    if(!this.reserveVoiceSlot(duration, delay, !!force || this.currentEventImportant)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    // CA183 — see HISTORY.md § [1.5.7] Code Archaeology, CA183
    const detune = stablePitch ? 1 : this.sfxVariantPitch * Math.pow(2, ((Math.random()-0.5)*80) / 1200);
    // CA184 — see HISTORY.md § [1.5.7] Code Archaeology, CA184
    const t0 = this.ctx.currentTime + (delay || 0);
    osc.frequency.setValueAtTime(freq*detune, t0);
    if(freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd*detune), t0+duration);
    const peak = (amplitude === undefined ? 0.22 : Math.max(0.001,amplitude)) * this.currentEventGain * (stablePitch ? 1 : 0.92+Math.random()*0.16);
    gain.gain.setValueAtTime(0.0001,t0);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001,peak),t0+Math.min(0.002,duration*0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
    let node = gain;
    if(pan){
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      node = panner;
    }
    osc.connect(gain); node.connect((force || this.currentEventImportant ? this.feedbackBus : this.combatBus) || this.sfxBus || this.master);
    if(reverbSend){ this.initReverb(); node.connect(this.reverbNode); }
    osc.onended = () => {
      osc.disconnect(); gain.disconnect();
      if(node !== gain) node.disconnect();
    };
    osc.start(t0); osc.stop(t0+duration);
  }
  noise(duration, filterFreq, filterType, pan, reverbSend, delay, gainMult){
    if(!this.unlocked) return;
    if(isMuted || audioSfxVolume <= 0) return;
    if(!this.reserveVoiceSlot(duration, delay, this.currentEventImportant)) return;
    // CA185 — see HISTORY.md § [1.5.7] Code Archaeology, CA185
    this.ensureNoiseBuffer();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const maxOffset = Math.max(0, this.noiseBuffer.duration - duration - 0.01);
    const offset = Math.random() * maxOffset;
    const envelope = this.ctx.createGain();
    // CA186 — see HISTORY.md § [1.5.7] Code Archaeology, CA186
    const peak = (gainMult !== undefined ? gainMult : 0.35) * this.currentEventGain * (0.92+Math.random()*0.16);
    const t0 = this.ctx.currentTime + (delay || 0);
    envelope.gain.setValueAtTime(0, t0);
    envelope.gain.linearRampToValueAtTime(peak,t0+Math.min(0.002,duration*0.1));
    envelope.gain.linearRampToValueAtTime(0, t0 + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType || 'lowpass'; filter.frequency.value = Math.min(this.ctx.sampleRate*0.45,(filterFreq || 1200)*this.sfxVariantNoise*(0.95+Math.random()*0.10));
    let node = filter;
    if(pan){
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      filter.connect(panner);
      node = panner;
    }
    src.connect(envelope); envelope.connect(filter); node.connect((this.currentEventImportant ? this.feedbackBus : this.combatBus) || this.sfxBus || this.master);
    if(reverbSend){ this.initReverb(); node.connect(this.reverbNode); }
    src.onended = () => {
      src.disconnect(); envelope.disconnect(); filter.disconnect();
      if(node !== filter) node.disconnect();
    };
    src.start(t0, offset, duration);
  }
  play(name, worldX, intensity, worldY){
    if(!this.unlocked || isMuted || audioSfxVolume <= 0) return;
    const previousPriority = this.currentEventImportant, previousGain = this.currentEventGain;
    this.currentEventImportant = isImportantAudioEvent(name);
    this.currentEventGain = this.currentEventImportant ? 1 : this.gainFor(worldX,worldY);
    try { this.playEvent(name,worldX,intensity); }
    finally { this.currentEventImportant=previousPriority; this.currentEventGain=previousGain; }
  }
  lastSfxVariant = {}; sfxVariantPitch = 1; sfxVariantNoise = 1;
  playEvent(name, worldX, intensity){
    if(!this.unlocked || isMuted || audioSfxVolume <= 0) return;
    const gap = AUDIO_EVENT_GAPS[name];
    if(gap !== undefined){
      const now = this.ctx.currentTime;
      const previous = this.lastEventPlayAt[name];
      if(previous !== undefined && now - previous < gap) return;
      this.lastEventPlayAt[name] = now;
    }
    if(AUDIO_FOCUS_EVENTS.has(name)) this.focusCue();
    // SFX-VARIANT-01 (1.7.36): the same event never plays the same variant twice in a row. Each variant shifts the pitch of the unpinned tones by whole
    // semitones and the colour of the noise layers, so repeated hits, shots and deaths stop sounding like one recording on loop.
    if(!SFX_VARIANT_EXEMPT.has(name)){
      const used = this.lastSfxVariant[name];
      let pick = Math.floor(Math.random()*SFX_VARIANT_PITCH.length);
      if(pick === used) pick = (pick + 1 + Math.floor(Math.random()*(SFX_VARIANT_PITCH.length-1))) % SFX_VARIANT_PITCH.length;
      this.lastSfxVariant[name] = pick;
      this.sfxVariantPitch = SFX_VARIANT_PITCH[pick]; this.sfxVariantNoise = SFX_VARIANT_NOISE[pick];
    } else { this.sfxVariantPitch = 1; this.sfxVariantNoise = 1; }
    const eventPan = this.panFor(worldX);
    switch(name){
      // ---- generic / legacy (still used for hit-flash, kills, waves, etc.) ----
      case 'bow':   this.tone(900,0.10,'sawtooth',150); break;
      case 'hit':   this.tone(300,0.06,'square',100); break;
      case 'death': this.noise(0.15); break;
      case 'gore_death': {
        // CA187 — see HISTORY.md § [1.5.7] Code Archaeology, CA187
        const panD = this.panFor(worldX);
        const wetness = 1 + Math.min(1.2, (intensity||1) - 1)*0.4;
        this.noise(0.13*wetness, 650, 'lowpass', panD);
        this.tone(130, 0.15*wetness, 'sawtooth', 50, panD);
        this.noise(0.045, 2400, 'bandpass', panD);
        break;
      }
      case 'foot_squelch': {
        // CA188 — see HISTORY.md § [1.5.7] Code Archaeology, CA188
        const panF = this.panFor(worldX);
        const wet = 1 + (intensity||0)*0.35;
        this.noise(0.055*wet, 850, 'lowpass', panF);
        this.tone(210, 0.035, 'sine', 110, panF);
        break;
      }
      case 'wave':  this.tone(440,0.20,'sine',660,undefined,undefined,undefined,true); break;
      case 'roundStart':
        this.duck(-2.5, 0.6);
        this.tone(392, 0.09, 'triangle', undefined, 0, false, 0, true, true, 0.16);
        this.tone(392, 0.09, 'triangle', undefined, 0, false, 0.16, true, true, 0.16);
        this.tone(587.33, 0.18, 'triangle', undefined, 0, false, 0.32, true, true, 0.16);
        break;
      case 'coin': {
        const pan = this.panFor(worldX);
        this.tone(1320, 0.055, 'sine', 1100, pan, false, 0, true, true, 0.14);
        this.tone(1980, 0.085, 'triangle', 1760, pan, false, 0.035, true, true, 0.07);
        break;
      }
      case 'bag': {
        const pan = this.panFor(worldX);
        this.noise(0.07, 1700, 'bandpass', pan, false, 0, 0.18);
        this.tone(510, 0.075, 'triangle', 740, pan, false, 0.025, true, true, 0.16);
        this.tone(1110, 0.11, 'sine', 1480, pan, false, 0.075, true, true, 0.10);
        break;
      }
      case 'miss': {
        if(this.ctx.currentTime < (this.nextMissSoundAt || 0)) break;
        this.nextMissSoundAt = this.ctx.currentTime + 0.25;
        this.tone(460, 0.035, 'sine', 260, this.panFor(worldX), false, 0, false, true, 0.025);
        break;
      }
      case 'chop':  this.tone(150,0.08,'square',80); break;
      case 'heart_break':
        // HEART-BREAK-01 (1.7.74): a broken heart reaches the lives counter: a dry little crack, then two soft falling notes (a sinking minor second), clear but not loud.
        this.duck(-1.5, 0.3);
        this.noise(0.035, 2600, 'bandpass', 0, false, 0, 0.09);
        this.tone(466, 0.22, 'triangle', 440, 0, true, 0.02, true, true, 0.11);
        this.tone(311, 0.34, 'sine', 262, 0, true, 0.15, true, true, 0.12);
        this.tone(78, 0.22, 'sine', 55, 0, false, 0.02, true, true, 0.09);
        break;
      case 'lose':  this.duck(-3, 0.3); this.tone(200,0.4,'sawtooth',50,undefined,undefined,undefined,true); break;
      case 'levelup': this.duck(-2.5, 0.25); this.tone(520,0.09,'sine',780,undefined,undefined,undefined,true); this.tone(780,0.14,'sine',1040,0,0,0.07,true); break;
      case 'evolution': // unlocking a new tower type — one of the rarest, most exciting events in
        // CA190 — see HISTORY.md § [1.5.7] Code Archaeology, CA190
        this.duck(-4, 0.4);
        this.tone(440, 0.10, 'sine', 660, undefined, true, undefined, true, true);
        this.tone(660, 0.12, 'sine', 880, 0, true, 0.08, true, true);
        this.tone(880, 0.20, 'sine', 1320, 0, true, 0.16, true, true);
        this.tone(1320, 0.16, 'sine', 1760, 0, true, 0.18, true, true); // sparkle harmonic, slightly overlapping the third note
        break;
      case 'hero': // a tower's 6th item slot fills, awakening it into a Hero — previously reused
        // CA191 — see HISTORY.md § [1.5.7] Code Archaeology, CA191
        this.duck(-2.5, 0.25);
        this.tone(440, 0.08, 'sine', 660, undefined, true, undefined, true, true);
        this.tone(660, 0.16, 'sine', 990, 0, true, 0.06, true, true);
        break;
      case 'legendary': // reaching 100 total stats — permanent, named by the player, and the
        // CA192 — see HISTORY.md § [1.5.7] Code Archaeology, CA192
        this.duck(-5, 0.6);
        this.tone(440, 0.10, 'sine', 660, undefined, true, undefined, true, true);
        this.tone(660, 0.10, 'sine', 880, 0, true, 0.07, true, true);
        this.tone(880, 0.12, 'sine', 1320, 0, true, 0.14, true, true);
        this.tone(1320, 0.14, 'sine', 1760, 0, true, 0.21, true, true);
        this.tone(1760, 0.55, 'sine', undefined, 0, true, 0.28, true, true); // sustained double-stop, note 1
        this.tone(2200, 0.55, 'sine', undefined, 0, true, 0.30, true, true); // sustained double-stop, note 2 — held together with the note above for the conclusive chord
        break;

      // ---- per-class melee attacks ----
      case 'swing_blade':
        this.noise(0.065, 1800, 'bandpass', eventPan, false, 0, 0.18);
        this.tone(310, 0.075, 'triangle', 170, eventPan, false, 0.015, false, false, 0.10);
        break;
      case 'swing_pierce':
        this.noise(0.035, 2600, 'bandpass', eventPan, false, 0, 0.11);
        this.tone(430, 0.045, 'triangle', 690, eventPan, false, 0, false, false, 0.09);
        break;
      case 'swing_blunt':
        this.noise(0.055, 420, 'lowpass', eventPan, false, 0.025, 0.22);
        this.tone(125, 0.12, 'sine', 65, eventPan, false, 0.025, false, false, 0.22);
        break;
      case 'swing_axe':
        this.noise(0.065, 1050, 'bandpass', eventPan, false, 0, 0.22);
        this.tone(230, 0.08, 'triangle', 95, eventPan, false, 0.015, false, false, 0.15);
        break;
      case 'throw_axe':
        this.tone(440, 0.10, 'sine', 780, eventPan, false, 0, false, false, 0.12);
        break;
      case 'monster_swing':
        this.noise(0.075, 600, 'lowpass', eventPan, false, 0, 0.25);
        this.tone(170, 0.10, 'triangle', 80, eventPan, false, 0, false, false, 0.18);
        break;
      case 'shot_archer':
        this.tone(860, 0.065, 'triangle', 240, eventPan, false, 0, false, false, 0.16);
        this.noise(0.025, 2400, 'bandpass', eventPan, false, 0, 0.07);
        break;
      case 'shot_sniper':
        this.noise(0.035, 2800, 'highpass', eventPan, false, 0, 0.25);
        this.tone(420, 0.055, 'triangle', 100, eventPan, false, 0, false, false, 0.18);
        break;
      case 'shot_gatling':
        this.tone(540, 0.025, 'triangle', 220, eventPan, false, 0, false, false, 0.10);
        break;
      case 'shot_blowdart':
        this.noise(0.04, 2000, 'bandpass', eventPan, false, 0, 0.12);
        break;
      case 'shot_gunalinder':
        this.noise(0.035, 950, 'bandpass', eventPan, false, 0, 0.17);
        this.tone(190, 0.045, 'triangle', 100, eventPan, false, 0, false, false, 0.13);
        break;
      case 'shot_squirtgun':
        this.noise(0.065, 1700, 'bandpass', eventPan, false, 0, 0.13);
        this.tone(580, 0.06, 'sine', 280, eventPan, false, 0, false, false, 0.09);
        break;
      case 'shot_cat':
        this.noise(0.04, 1400, 'bandpass', eventPan, false, 0, 0.08);
        this.tone(520, 0.07, 'sine', 820, eventPan, false, 0, false, false, 0.10);
        break;
      case 'shot_bomber':
        this.tone(150, 0.10, 'sine', 70, eventPan, false, 0, false, false, 0.20);
        this.noise(0.065, 400, 'lowpass', eventPan, false, 0, 0.18);
        break;
      case 'cast_mage':
        this.tone(620, 0.12, 'sine', 1180, eventPan, false, 0, false, false, 0.13);
        this.tone(930, 0.09, 'triangle', 1770, eventPan, false, 0.025, false, false, 0.065);
        break;
      case 'cast_cleric':
        this.tone(784, 0.12, 'sine', undefined, eventPan, false, 0, false, true, 0.12);
        this.tone(1176, 0.15, 'sine', undefined, eventPan, false, 0.045, false, true, 0.08);
        break;
      case 'threat':
        this.duck(-2, 0.3);
        this.tone(370, 0.075, 'triangle', 330, eventPan, false, 0, true, true, 0.14);
        this.tone(277, 0.10, 'triangle', 247, eventPan, false, 0.10, true, true, 0.12);
        break;
      case 'countdown_tick': {
        // COUNTDOWN-MUSICAL-01 (1.7.69): each number of the 3-2-1 is a soft, rising pluck in D minor (D, F, A, the same key the combat score sits in), with a quiet shimmer an
        // octave up, a gentle low pulse and a tiny clock tick. It gets a little louder with each number and all of it stays well under the music, then GO resolves it.
        const countdownStep = Math.max(0, Math.min(2, Math.round(intensity || 0)));
        const pluckHz = [587.33, 698.46, 880][countdownStep], pluckAmp = 0.05 + 0.012 * countdownStep;
        this.tone(pluckHz, 0.34, 'triangle', undefined, 0, true, 0, true, true, pluckAmp);
        this.tone(pluckHz * 2, 0.18, 'sine', undefined, 0, true, 0, true, true, pluckAmp * 0.35);
        this.tone(110, 0.14, 'sine', 55, 0, false, 0, true, true, 0.08 + 0.02 * countdownStep);
        this.noise(0.025, 3200 + countdownStep * 400, 'bandpass', 0, false, 0, 0.05);
        break;
      }
      case 'countdown_go':
        // COUNTDOWN-MUSICAL-01 (1.7.69): the resolution: the D minor figure opens into a bright D major chord (D, A, D, F sharp) over a low D, softly swelled.
        this.tone(293.66, 0.7, 'triangle', undefined, 0, true, 0, true, true, 0.065);
        this.tone(440, 0.7, 'triangle', undefined, 0, true, 0.02, true, true, 0.055);
        this.tone(587.33, 0.6, 'sine', undefined, 0, true, 0.04, true, true, 0.05);
        this.tone(739.99, 0.5, 'sine', undefined, 0, true, 0.06, true, true, 0.035);
        this.tone(73.42, 0.5, 'sine', undefined, 0, false, 0, true, true, 0.09);
        this.noise(0.25, 2400, 'bandpass', 0, false, 0, 0.05);
        break;
      case 'item_eat': {
        const panEat = this.panFor(worldX);
        for(let bite = 0; bite < 3; bite++){
          this.noise(0.06, 2300 + bite*180, 'bandpass', panEat, false, bite*0.11, 0.2);
          this.tone(150 - bite*12, 0.07, 'triangle', 90, panEat, false, bite*0.11, true, false, 0.08);
        }
        this.tone(520, 0.1, 'sine', 660, panEat, false, 0.38, true, true, 0.05);
        break;
      }
      case 'item_potion': {
        const panPot = this.panFor(worldX);
        this.tone(330, 0.08, 'sine', 300, panPot, true, 0, true, true, 0.06);
        for(let glug = 0; glug < 3; glug++) this.tone(260 + glug*40, 0.1, 'sine', 420 + glug*40, panPot, true, 0.1 + glug*0.13, true, false, 0.1);
        this.noise(0.4, 1500, 'bandpass', panPot, true, 0.08, 0.05);
        this.tone(880, 0.16, 'sine', undefined, panPot, true, 0.52, true, true, 0.06);
        break;
      }
      case 'item_scroll': {
        const panScroll = this.panFor(worldX);
        this.noise(0.16, 3200, 'highpass', panScroll, false, 0, 0.16);
        this.noise(0.14, 2400, 'bandpass', panScroll, false, 0.12, 0.14);
        this.noise(0.18, 3600, 'highpass', panScroll, false, 0.25, 0.12);
        this.tone(740, 0.14, 'triangle', 988, panScroll, true, 0.42, true, true, 0.07);
        break;
      }
      case 'item_inject': {
        const panInject = this.panFor(worldX);
        this.noise(0.06, 1800, 'bandpass', panInject, false, 0, 0.14);
        this.tone(1400, 0.05, 'square', 900, panInject, false, 0.05, true, true, 0.06);
        this.noise(0.22, 5200, 'highpass', panInject, false, 0.1, 0.12);
        this.tone(330, 0.22, 'sawtooth', 660, panInject, false, 0.14, true, true, 0.06);
        break;
      }
      case 'expand_build':
        for(let hit = 0; hit < 4; hit++){
          this.noise(0.05, 1100, 'bandpass', 0, false, hit*0.13, 0.22);
          this.tone(170 - hit*8, 0.09, 'triangle', 110, 0, false, hit*0.13, true, false, 0.14);
        }
        this.tone(90, 0.4, 'sine', 45, 0, true, 0.56, true, true, 0.2);
        this.noise(0.3, 700, 'lowpass', 0, true, 0.56, 0.14);
        this.tone(659.25, 0.2, 'triangle', undefined, 0, true, 0.72, true, true, 0.08);
        break;
      case 'wave_clear': {
        // WAVE-CLEAR-FANFARE-01 (1.7.36): a layered victory fanfare — rising brass arpeggio, a held major chord with octave bass,
        // timpani hits and a cymbal swell, transposed to the key the music is currently in.
        this.duck(-4, 1.8);
        const ratio = Math.pow(2, (this.musicShift || 0) / 12);
        // The owner likes the original wave-clear twang (a soft sine and triangle C, E, G arpeggio, the Animal Crossing meets DOS flavour),
        // so it stays as the opening of the new fanfare rather than being replaced (add-only).
        this.tone(523.25*ratio, 0.08, 'sine', undefined, 0, false, 0, true, true, 0.14);
        this.tone(659.25*ratio, 0.10, 'sine', undefined, 0, false, 0.075, true, true, 0.12);
        this.tone(784*ratio, 0.16, 'triangle', undefined, 0, false, 0.15, true, true, 0.10);
        const rise = [[440, 0.3], [587.33, 0.42], [739.99, 0.54], [880, 0.66]];
        for(const [freq, delay] of rise){
          this.tone(freq*ratio, 0.16, 'sawtooth', undefined, 0, false, delay, true, true, 0.075);
          this.tone(freq*2*ratio, 0.12, 'triangle', undefined, 0, false, delay, true, true, 0.04);
        }
        const hold = 0.82;
        [293.66, 440, 587.33, 739.99].forEach((freq, k) => this.tone(freq*ratio, 1.1, k % 2 ? 'triangle' : 'sawtooth', undefined, 0, true, hold, true, true, 0.07));
        this.tone(146.83*ratio, 1.1, 'sine', undefined, 0, false, hold, true, true, 0.16);
        this.tone(110*ratio, 0.3, 'sine', 55*ratio, 0, false, 0.3, true, true, 0.2);
        this.tone(110*ratio, 0.5, 'sine', 55*ratio, 0, false, hold, true, true, 0.22);
        this.noise(0.9, 5200, 'highpass', 0, true, hold, 0.08);
        this.noise(0.18, 260, 'lowpass', 0, false, 0, 0.2);
        break;
      }

      // CA196 — see HISTORY.md § [1.5.7] Code Archaeology, CA196
      case 'footstep': {
        const nowFS = this.ctx.currentTime;
        if(this.lastFootstepAt !== undefined && nowFS - this.lastFootstepAt < 0.07) break; // another step already played too recently — skip, don't queue
        this.lastFootstepAt = nowFS;
        const panFS = this.panFor(worldX);
        const w = intensity || 0;
        const gainByWeight = [0.04, 0.06, 0.09][w] || 0.04;
        this.noise(0.03 + w*0.02, 550 - w*160, 'lowpass', panFS, undefined, undefined, gainByWeight);
        break;
      }
      case 'enrage': // a tough enemy (Boss/Troll) crossing a low-HP threshold — a low, snarling
        // CA197 — see HISTORY.md § [1.5.7] Code Archaeology, CA197
        this.tone(180, 0.35, 'sawtooth', 55, this.panFor(worldX), true);
        this.noise(0.3, 220, 'lowpass', this.panFor(worldX), true);
        break;

      // CARAVAN-SOUND-01 (1.7.100): the merchant's arrival is a run of bright sleigh bells, a two-note horn and a hoof clatter; each step on the road is a woody double clop
      case 'caravan_arrive': {
        const arrivalPan = this.panFor(worldX);
        [1568, 1976, 2349, 1976, 2637, 3136, 2637, 3136].forEach((bell, index) => this.tone(bell, 0.16, 'triangle', undefined, arrivalPan, true, index*0.075, true, true, 0.05));
        this.tone(262, 0.22, 'sawtooth', 277, arrivalPan, true, 0.34, true, true, 0.07);
        this.tone(392, 0.36, 'triangle', 392, arrivalPan, true, 0.5, true, true, 0.08);
        for(let hoof = 0; hoof < 4; hoof++) this.noise(0.035, 900, 'bandpass', arrivalPan, false, 0.9 + hoof*0.16, 0.10);
        break;
      }
      case 'troll_arrive': {
        const trollPan = this.panFor(worldX);
        this.tone(62, 0.5, 'sawtooth', 41, trollPan, true, 0, true, true, 0.16);
        this.tone(93, 0.42, 'square', 58, trollPan, true, 0.04, true, true, 0.08);
        this.noise(0.38, 260, 'lowpass', trollPan, true, 0.02, 0.2);
        for(const stompDelay of [0.55, 0.85]){ this.tone(52, 0.14, 'sine', 34, trollPan, true, stompDelay, true, true, 0.2); this.noise(0.08, 140, 'lowpass', trollPan, false, stompDelay, 0.14); }
        break;
      }
      case 'clown_honk': {
        const honkPan = this.panFor(worldX);
        this.tone(466, 0.1, 'square', 392, honkPan, true, 0, true, true, 0.09);
        this.tone(349, 0.18, 'square', 523, honkPan, true, 0.12, true, true, 0.09);
        break;
      }
      case 'caravan_clop': {
        const clopPan = this.panFor(worldX);
        this.noise(0.03, 950, 'bandpass', clopPan, false, 0, 0.12);
        this.tone(170, 0.045, 'sine', 95, clopPan, false, 0.012, false, true, 0.08);
        this.noise(0.03, 800, 'bandpass', clopPan, false, 0.13, 0.09);
        break;
      }
      // CA198 — see HISTORY.md § [1.5.7] Code Archaeology, CA198
      case 'click': this.tone(1174.66,0.032,'triangle',undefined,0,false,0,false,true,0.055); this.tone(1567.98,0.040,'sine',undefined,0,false,0.018,false,true,0.035); break;
      case 'ui_open': this.tone(783.99,0.045,'triangle',undefined,0,false,0,true,true,0.07); this.tone(1174.66,0.075,'sine',undefined,0,false,0.035,true,true,0.055); break;
      case 'ui_close': this.tone(1174.66,0.040,'triangle',undefined,0,false,0,true,true,0.055); this.tone(783.99,0.055,'sine',undefined,0,false,0.025,true,true,0.04); break;
      case 'ui_buy':    this.tone(700, 0.06, 'sine', 1000, undefined, undefined, undefined, true, true); this.tone(1000, 0.08, 'sine', 1300, 0, 0, 0.05, true, true); break; // purchase — cheerful two-note chime
      case 'ui_deny':   this.tone(220, 0.075, 'triangle', 140, 0, false, 0, true, true, 0.14); break; // blocked/disabled action — low buzz
      case 'stat_spend': // allocating a stat point — deliberately warmer and more lingering than
        // CA199 — see HISTORY.md § [1.5.7] Code Archaeology, CA199
        this.tone(440, 0.18, 'sine', 550, undefined, true, undefined, true);
        this.tone(660, 0.22, 'sine', 720, 0, true, 0.03, true);
        break;
      case 'spawn_chatter': { // a tower's spoken moment — spawn quip, taking a hit, leveling up —
        // CA200 — see HISTORY.md § [1.5.7] Code Archaeology, CA200
        const panCh = this.panFor(worldX);
        const registers = {
          MAGE:    [280, 130], // lowest register
          WARRIOR: [460, 160], // medium
          ARCHER:  [640, 220]  // highest, quickest
        };
        const tempoMults = { MAGE: 1.6, WARRIOR: 1.0, ARCHER: 1.0 }; // Mage alone talks noticeably slower
        const register = registers[intensity] || [460, 220]; // unrecognized/no archetype — a neutral middle register
        const tempoMult = tempoMults[intensity] || 1.0;
        const basePitch = register[0] + Math.random()*register[1];
        const partDirection = Math.random() < 0.5 ? 1 : -1; // which part is the higher one
        const partShift = 70 + Math.random()*90; // how far apart the two parts' registers sit
        const partSyllableCounts = [2 + Math.floor(Math.random()*2), 2 + Math.floor(Math.random()*2)]; // 2-3 each
        let tCh = 0;
        for(let part = 0; part < 2; part++){
          const partPitch = basePitch + (part === 0 ? partDirection : -partDirection) * (partShift/2);
          for(let i = 0; i < partSyllableCounts[part]; i++){
            const startFreq = partPitch + (Math.random()-0.5)*100;
            const endFreq = startFreq + (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random()*140);
            this.tone(startFreq, 0.065*tempoMult, 'triangle', endFreq, panCh, true, tCh);
            tCh += (0.055 + Math.random()*0.03) * tempoMult;
          }
          tCh += 0.09 * tempoMult; // a small gap between the two phrase parts, like a pause between two words
        }
        break;
      }
      case 'chatter_short': { // a quick reactive "word" — taking a hit or leveling up — distinct
        // CA201 — see HISTORY.md § [1.5.7] Code Archaeology, CA201
        const panSh = this.panFor(worldX);
        const registersSh = { MAGE: [280, 130], WARRIOR: [460, 160], ARCHER: [640, 220] };
        const tempoMultsSh = { MAGE: 1.6, WARRIOR: 1.0, ARCHER: 1.0 };
        const archS = (intensity && intensity.archetype) || null;
        const registerSh = registersSh[archS] || [460, 220];
        const tempoMultSh = tempoMultsSh[archS] || 1.0;
        const pitchBias = (intensity && intensity.pitchBias) || 0; // e.g. -40 for a hit reaction, +40 for a level-up
        const basePitchSh = registerSh[0] + Math.random()*registerSh[1] + pitchBias;
        const syllables = 1 + Math.floor(Math.random()*2); // 1-2 — noticeably shorter than spawn_chatter's 4-6
        let tSh = 0;
        for(let i = 0; i < syllables; i++){
          const startFreq = basePitchSh + (Math.random()-0.5)*80;
          const endFreq = startFreq + (Math.random() < 0.5 ? 1 : -1) * (50 + Math.random()*110);
          this.tone(startFreq, 0.06*tempoMultSh, 'triangle', endFreq, panSh, true, tSh);
          tSh += (0.05 + Math.random()*0.025) * tempoMultSh;
        }
        break;
      }
    }
  }
}
const audioEngine = new SoundEngine();
function playSound(name, worldX, intensity, worldY){ audioEngine.play(name, worldX, intensity, worldY); }
// CA202 — see HISTORY.md § [1.5.7] Code Archaeology, CA202
function isImportantAudioEvent(eventType, context){
  if(context && (context.isBoss || context.isSelectedTower || context.isCritical)) return true;
  if(AUDIO_PRIORITY_EVENTS.has(eventType)) return true;
  return false;
}
function towerAudioBias(towerId){
  if(towerId === undefined) return 1;
  const h = ((towerId * 2654435761) >>> 0) % 1000;
  return 0.97 + (h / 1000) * 0.06;
}
function playImpactSound(archOrWeapon, worldX, hitPower, isCritical, towerId, worldY){
  if(!audioEngine.unlocked || isMuted || audioSfxVolume <= 0) return;
  const previousPriority=audioEngine.currentEventImportant, previousGain=audioEngine.currentEventGain;
  audioEngine.currentEventImportant=!!isCritical || !!(selectedTower && selectedTower.id===towerId);
  audioEngine.currentEventGain=audioEngine.gainFor(worldX,worldY);
  const before=audioEngine.debugCounters.voicesStarted, suppressedBefore=audioEngine.debugCounters.impactSuppressed;
  try { synthesizeImpactSound(archOrWeapon,worldX,hitPower,isCritical,towerId); }
  finally {
    if(audioEngine.debugCounters.voicesStarted>before) audioEngine.debugCounters.impactPlayed++;
    else if(audioEngine.debugCounters.impactSuppressed===suppressedBefore) audioEngine.debugCounters.impactSuppressed++;
    audioEngine.currentEventImportant=previousPriority; audioEngine.currentEventGain=previousGain;
  }
}
function synthesizeImpactSound(archOrWeapon, worldX, hitPower, isCritical, towerId){
  if(!audioEngine.unlocked) return;
  audioEngine.debugCounters.impactRequested++;
  const hp = clampNum(hitPower || 1, 0.3, 2.2);
  const bigMoment = !!isCritical || hp > 1.4; // routes a reverb send for real weight only on genuinely big hits, not every routine tick
  // CA203 — see HISTORY.md § [1.5.7] Code Archaeology, CA203
  const nowIS = audioEngine.ctx.currentTime;
  const lastPlay = audioEngine.lastFamilyPlayAt[archOrWeapon];
  if(lastPlay !== undefined && nowIS - lastPlay < (audioEngine.currentEventImportant ? 0.018 : 0.035)){
    audioEngine.debugCounters.impactSuppressed++;
    return;
  }
  audioEngine.lastFamilyPlayAt[archOrWeapon] = nowIS;

  const pan = audioEngine.panFor(worldX);
  const bias = towerAudioBias(towerId);
  // CA204 — see HISTORY.md § [1.5.7] Code Archaeology, CA204
  const thinSecondary = gameSpeed >= 5 && !bigMoment;
  if(archOrWeapon === 'BLADE'){
    // CA205 — see HISTORY.md § [1.5.7] Code Archaeology, CA205
    if(!thinSecondary) audioEngine.noise(0.05 + hp*0.02, (3200 + hp*800)*bias, 'highpass', pan, bigMoment);
    audioEngine.tone((500 + hp*80)*bias, 0.05, 'triangle', 180*bias, pan);
  } else if(archOrWeapon === 'BLUNT'){
    // low, dull, heavier — kinetic energy going into crushing/displacement rather than a clean cut
    if(!thinSecondary) audioEngine.noise(0.09 + hp*0.03, (300 + hp*100)*bias, 'lowpass', pan, bigMoment);
    audioEngine.tone((110 + hp*20)*bias, 0.1 + hp*0.03, 'sine', 45*bias, pan);
  } else if(archOrWeapon === 'PIERCE'){
    // CA206 — see HISTORY.md § [1.5.7] Code Archaeology, CA206
    if(!thinSecondary) audioEngine.noise(0.04, 4200*bias, 'highpass', pan, bigMoment);
    audioEngine.tone((700 + hp*100)*bias, 0.04, 'triangle', 300*bias, pan);
  } else if(archOrWeapon === 'ARCHER'){
    // CA207 — see HISTORY.md § [1.5.7] Code Archaeology, CA207
    if(!thinSecondary) audioEngine.noise(0.04, 2200*bias, 'bandpass', pan);
    audioEngine.tone((340 + hp*40)*bias, 0.04, 'triangle', 200*bias, pan);
  } else if(archOrWeapon === 'MAGE'){
    // CA208 — see HISTORY.md § [1.5.7] Code Archaeology, CA208
    audioEngine.tone((1400 + hp*200)*bias, 0.09, 'sine', 500*bias, pan, bigMoment);
    if(!thinSecondary) audioEngine.noise(0.08 + hp*0.04, (500 + hp*150)*bias, 'bandpass', pan, bigMoment);
    audioEngine.tone((80 + hp*15)*bias, 0.12 + hp*0.04, 'sine', 45*bias, pan, bigMoment);
  } else if(archOrWeapon === 'EXPLOSIVE'){
    audioEngine.noise(0.12 + hp*0.05, 220 + hp*80, 'lowpass', pan, true);
    audioEngine.tone(70 + hp*10, 0.14, 'sine', 35, pan, true);
  }
}
function tryAutoplayAudio(){
  audioEngine.prewarm();
  if(!audioEngine.ctx || !(navigator.userActivation && navigator.userActivation.hasBeenActive)) return;
  audioEngine.ctx.resume().then(() => {
    if(audioEngine.ctx.state !== 'running' || audioEngine.unlocked) return;
    audioEngine.unlocked = true; audioEngine.applyMix();
    if(gameState === 'START'){ audioEngine.setMusicPhase('attract'); audioEngine.startMusic(); }
  }).catch(function(){ /* the first click unlocks audio instead */ });
}
function unlockAudio(){
  audioEngine.unlock();
  if(gameState === 'START'){ audioEngine.setMusicPhase('attract'); audioEngine.startMusic(); } // MUSIC-ATTRACT-01 (1.7.100): the start screen plays from the first click, so the music is what draws a visitor in
}

/* =========================================================
   UI: INPUT, HUD, MENUS, DEBUG LOG, DESIGN CONTRACT AND SCREENS
   ========================================================= */
/* =========================================================
   CANVAS / INPUT SETUP
   ========================================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // OPAQUE-CANVAS-01 (1.6.120) — see HISTORY.md § [1.6.120]
const OPAQUE_CANVAS_BACKGROUND = '#8b5a2b'; // matches the --dirt page colour that used to show through the cleared canvas
ctx.fillStyle = OPAQUE_CANVAS_BACKGROUND; ctx.fillRect(0, 0, canvas.width, canvas.height);

let dprValue = 1;
// CA726 — see HISTORY.md § [1.5.7] Code Archaeology, CA726
let cachedCanvasRect = null;
function getCanvasRect(){
  if(!cachedCanvasRect) cachedCanvasRect = canvas.getBoundingClientRect();
  return cachedCanvasRect;
}
// CA727 — see HISTORY.md § [1.5.7] Code Archaeology, CA727
let mapCanvasReady = false;
// CA728 — see HISTORY.md § [1.5.7] Code Archaeology, CA728
let settledDecalCanvasReady = false;
// EMPTY-LAYER-SKIP-01 (1.7.36): measured at 2560 by 1305 with software drawing, blitting the empty settled-decal layer cost about 11 ms every frame
// (26.2 ms against 15.3 ms on an empty board). The layer is only drawn once something has actually been stamped into it.
let settledDecalHasContent = false;
// CA729 — see HISTORY.md § [1.5.7] Code Archaeology, CA729
function updateCanvasDimensions(){
  CANVAS_W = window.innerWidth || 800;
  CANVAS_H = window.innerHeight || 600;
}
// RENDER-GOVERNOR-01 (1.6.114) — see HISTORY.md § [1.6.114]; reworked as opt-in in 1.6.116 — see HISTORY.md § [1.6.116]
const RENDER_SCALE_STEPS = [1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25];
// RENDER-FLOOR-01 (1.6.118) — see HISTORY.md § [1.6.118]
function defaultRenderScaleFloorPercent(){ return graphicsQuality === 'high' ? 100 : 75; }
function renderScaleMaxStep(){
  if(graphicsQuality === 'high') return 0;
  let maxStep = 0;
  for(let i = 0; i < RENDER_SCALE_STEPS.length; i++) if(RENDER_SCALE_STEPS[i]*100 >= renderScaleFloorPercent - 0.01) maxStep = i;
  return maxStep;
}
const RENDER_SCALE_STORAGE_KEY = 'stickTD_renderStep';
const GOVERNOR_WINDOW_MS = 5000, GOVERNOR_DOWN_COOLDOWN_MS = 15000, GOVERNOR_UP_HOLD_MS = 120000;
const GOVERNOR_SLOW_GAP_MS = 40, GOVERNOR_FAST_GAP_MS = 20, GOVERNOR_IGNORE_GAP_MS = 400;
const LOW_FPS_OFFER_GAP_MS = 1000/15, LOW_FPS_RECOVER_GAP_MS = 1000/20, LOW_FPS_RECOVER_HOLD_MS = 5000;
const RENDER_SCALE_HISTORY_LIMIT = 20;
try {
  const savedStep = parseInt(localStorage.getItem(RENDER_SCALE_STORAGE_KEY), 10);
  if(autoRenderScaleEnabled && savedStep >= 0 && savedStep < RENDER_SCALE_STEPS.length) renderScaleStep = Math.min(savedStep, renderScaleMaxStep());
} catch(err) { /* storage unavailable — starts at full resolution */ }
let governorWindowMs = 0, governorWindowFrames = 0, governorCooldownMs = GOVERNOR_DOWN_COOLDOWN_MS, governorFastMs = 0;
let lowFpsDurationMs = 0, lowFpsRecoveredMs = 0, smoothedGapMs = 16.7;
const renderScaleHistory = [];
let lastGovernorAverageGapMs = 0, lastGovernorDecision = 'no decision yet';
function recordRenderScaleEvent(fromStep, toStep, reason){
  renderScaleHistory.push({ at: Math.round(presentationTime/1000), from: RENDER_SCALE_STEPS[fromStep], to: RENDER_SCALE_STEPS[toStep], reason });
  if(renderScaleHistory.length > RENDER_SCALE_HISTORY_LIMIT) renderScaleHistory.shift();
  lastGovernorDecision = Math.round(RENDER_SCALE_STEPS[fromStep]*100) + '% -> ' + Math.round(RENDER_SCALE_STEPS[toStep]*100) + '% (' + reason + ')';
}
function applyRenderScaleStep(newStep, reason){
  const previousStep = renderScaleStep;
  renderScaleStep = clampNum(newStep, 0, renderScaleMaxStep());
  if(renderScaleStep === previousStep) return;
  try { localStorage.setItem(RENDER_SCALE_STORAGE_KEY, String(renderScaleStep)); } catch(err) { /* storage unavailable */ }
  recordRenderScaleEvent(previousStep, renderScaleStep, reason);
  setupCanvas();
  clampCamera();
  if(gameState !== 'PLAYING') requestPausedRender();
}
function setAutoRenderScale(enabled){
  autoRenderScaleEnabled = !!enabled;
  autoRenderScaleUserSet = true;
  governorWindowMs = 0; governorWindowFrames = 0; governorFastMs = 0; governorCooldownMs = GOVERNOR_DOWN_COOLDOWN_MS;
  if(!autoRenderScaleEnabled) applyRenderScaleStep(0, 'automatic scaling turned off');
  lastGovernorDecision = autoRenderScaleEnabled ? 'automatic scaling turned on' : 'automatic scaling turned off';
  savePrefs();
}
function sampleRenderGovernor(rawGapMs){
  if(rawGapMs > GOVERNOR_IGNORE_GAP_MS || rawGapMs <= 0) return;
  smoothedGapMs = smoothedGapMs*0.95 + rawGapMs*0.05;
  if(!autoRenderScaleEnabled){
    if(smoothedGapMs > LOW_FPS_OFFER_GAP_MS){ lowFpsDurationMs += rawGapMs; lowFpsRecoveredMs = 0; }
    else if(smoothedGapMs < LOW_FPS_RECOVER_GAP_MS){
      lowFpsRecoveredMs += rawGapMs;
      if(lowFpsRecoveredMs >= LOW_FPS_RECOVER_HOLD_MS){ lowFpsDurationMs = 0; lowFpsRecoveredMs = 0; }
    }
  }
  if(!autoRenderScaleEnabled) return;
  governorCooldownMs -= rawGapMs;
  governorWindowMs += rawGapMs; governorWindowFrames++;
  if(governorWindowMs < GOVERNOR_WINDOW_MS) return;
  const averageGapMs = governorWindowMs / governorWindowFrames;
  lastGovernorAverageGapMs = averageGapMs;
  governorWindowMs = 0; governorWindowFrames = 0;
  const slowGapMs = Math.max(GOVERNOR_SLOW_GAP_MS, frameCapIntervalMs() * 1.6);
  const fastGapMs = Math.max(GOVERNOR_FAST_GAP_MS, frameCapIntervalMs() * 1.15);
  if(averageGapMs > slowGapMs){
    governorFastMs = 0;
    if(governorCooldownMs <= 0 && renderScaleStep < renderScaleMaxStep()){
      governorCooldownMs = GOVERNOR_DOWN_COOLDOWN_MS;
      applyRenderScaleStep(renderScaleStep + 1, 'average ' + Math.round(1000/averageGapMs) + ' FPS over ' + Math.round(GOVERNOR_WINDOW_MS/1000) + ' s');
    } else lastGovernorDecision = 'slow window (' + Math.round(1000/averageGapMs) + ' FPS) but ' + (renderScaleStep >= renderScaleMaxStep() ? 'already at the ' + renderScaleFloorPercent + '% floor' : 'cooling down');
  } else if(averageGapMs <= fastGapMs && renderScaleStep > 0){
    governorFastMs += GOVERNOR_WINDOW_MS;
    if(governorFastMs >= GOVERNOR_UP_HOLD_MS && governorCooldownMs <= 0){
      governorFastMs = 0; governorCooldownMs = GOVERNOR_DOWN_COOLDOWN_MS;
      applyRenderScaleStep(renderScaleStep - 1, 'steady ' + Math.round(1000/averageGapMs) + ' FPS for ' + Math.round(GOVERNOR_UP_HOLD_MS/1000) + ' s');
    }
  } else {
    governorFastMs = Math.max(0, governorFastMs - GOVERNOR_WINDOW_MS);
    lastGovernorDecision = 'window ' + Math.round(1000/averageGapMs) + ' FPS: no change';
  }
}
// REPAINT-01 (1.7.109) — see HISTORY.md § [1.7.109]: any event that can leave the canvas blank (a resize, coming back from the background, a restored canvas context) asks for one immediate frame, which skips the 30 FPS limiter and also draws while the game is paused.
let repaintPending = false;
function requestRepaint(){ repaintPending = true; }
let resizeSnapshotCanvas = null;
function setupCanvas(){
  if(graphicsQuality === 'high'){ renderScaleStep = 0; renderScaleFloorPercent = 100; }
  updateCanvasDimensions();
  const dprCap = graphicsQuality === 'low' ? 1 : 2;
  const newDpr = Math.min(window.devicePixelRatio || 1, dprCap) * RENDER_SCALE_STEPS[renderScaleStep];
  const dprChanged = newDpr !== dprValue;
  dprValue = newDpr;
  const backingWidth = Math.round(CANVAS_W * dprValue), backingHeight = Math.round(CANVAS_H * dprValue);
  if(canvas.width === backingWidth && canvas.height === backingHeight && !dprChanged){ ctx.imageSmoothingQuality = graphicsQuality === 'low' ? 'low' : 'high'; cachedCanvasRect = null; return; }
  // RESIZE-KEEP-01 (1.7.107) — see HISTORY.md § [1.7.107]: changing the canvas size clears it to opaque black, and on a phone the 30 FPS limiter skips every other frame, so a resize (browser bar, chat sheet) that landed on a skipped frame showed a black flash. The old picture is copied across, stretched to the new size, so the canvas is never presented blank.
  resizeSnapshotCanvas = resizeSnapshotCanvas || document.createElement('canvas');
  const hadPicture = canvas.width > 0 && canvas.height > 0;
  if(hadPicture){ resizeSnapshotCanvas.width = canvas.width; resizeSnapshotCanvas.height = canvas.height; resizeSnapshotCanvas.getContext('2d').drawImage(canvas, 0, 0); }
  canvas.width = backingWidth;
  canvas.height = backingHeight;
  if(hadPicture){ ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(resizeSnapshotCanvas, 0, 0, resizeSnapshotCanvas.width, resizeSnapshotCanvas.height, 0, 0, canvas.width, canvas.height); resizeSnapshotCanvas.width = resizeSnapshotCanvas.height = 0; }
  ctx.setTransform(dprValue,0,0,dprValue,0,0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = graphicsQuality === 'low' ? 'low' : 'high'; // resizing the canvas clears context state, so this must be reapplied
  // CA730 — see HISTORY.md § [1.5.7] Code Archaeology, CA730
  if(mapCanvasReady && dprChanged) resizeMapCanvasForDpr();
  cachedCanvasRect = null; // canvas geometry may have changed — force a fresh read on next pointer event
}
setupCanvas();
window.addEventListener('resize', () => { setupCanvas(); clampCamera(); requestRepaint(); }); // re-clamp (not re-center) so pan/zoom stays valid without jarringly resetting the view mid-game
window.addEventListener('orientationchange', () => { cachedCanvasRect = null; requestRepaint(); }); // some mobile browsers fire this without a corresponding resize
// CA731 — see HISTORY.md § [1.5.7] Code Archaeology, CA731
let hudFitSignature = '';
let notificationLayoutSignature='';
// NOTIFICATION-BELL-LEFT-01 (1.7.86) — see HISTORY.md § [1.7.86]
const NOTIFICATION_BELL_MARGIN_PX = 8, NOTIFICATION_BELL_CLEARANCE_PX = 14;
function placeNotificationBell(hud){
  const frame = hud.parentElement, bell = document.getElementById('notification-bell');
  if(!frame || !bell || getComputedStyle(hud).display === 'none') return;
  const columnGapPx = parseFloat(getComputedStyle(hud).columnGap) || 0;
  const hudChildren = Array.from(hud.children).filter(child => child !== bell);
  const hudContentWidth = hudChildren.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + Math.max(0, hudChildren.length - 1) * columnGapPx + 16;
  const roomOnLeft = (frame.clientWidth - hudContentWidth) / 2;
  const fitsBesideHud = roomOnLeft >= bell.getBoundingClientRect().width + NOTIFICATION_BELL_MARGIN_PX + NOTIFICATION_BELL_CLEARANCE_PX;
  if(fitsBesideHud && bell.parentElement === hud) frame.appendChild(bell);
  else if(!fitsBesideHud && bell.parentElement !== hud) hud.insertBefore(bell, hud.firstChild);
}
function positionNotificationControls(force=false){
  const frame=document.getElementById('canvas-frame'),hud=document.getElementById('hud-top'),bell=document.getElementById('notification-bell');
  if(!frame || !hud || !bell) return;
  const hasCue=['first-build-hint','first-next-wave-hint','first-speed-hint'].some(id=>{const el=document.getElementById(id);return el && !el.classList.contains('hidden');});
  const sig=[innerWidth,innerHeight,hud.style.display,hud.style.transform,document.getElementById('buildBtn')?.textContent,document.getElementById('runRewardBtn')?.hidden,hasCue].join('|');
  if(!force && sig===notificationLayoutSignature) return;
  notificationLayoutSignature=sig;
  const frameRect=frame.getBoundingClientRect(),hudRect=hud.getBoundingClientRect();
  const hudBottom=hudRect.height>0?Math.max(0,hudRect.bottom-frameRect.top):0;
  const floatingBell=bell.parentElement!==hud;
  bell.hidden=floatingBell && getComputedStyle(hud).display==='none';
  const bellRect=bell.getBoundingClientRect();
  const contentLeft=Math.max(8,Math.min(bellRect.left-frameRect.left,Math.max(8,frameRect.width-80)));
  frame.style.setProperty('--notification-content-left',contentLeft+'px');
  const top=Math.ceil((floatingBell ? Math.max(0,bellRect.bottom-frameRect.top) : hudBottom)+4);
  frame.style.setProperty('--notification-controls-top',top+'px');
  const contentTop=top;
  frame.style.setProperty('--notification-content-top',contentTop+'px');
}
function fitHudTopToOneLine(force){
  const hud = document.getElementById('hud-top');
  if(!hud) return;
  const buildLabel = document.getElementById('buildBtn')?.textContent || '';
  // DOM-REFLOW-01 (1.6.57) — see HISTORY.md § [1.6.57]. hud.clientWidth used to be part of this
  // signature, forcing a layout flush on every call — this function runs on every HUD update
  // (every kill, gold change, wave change), not just on resize. #hud-top's CSS is `left:0;right:0`
  // with no independent sizing trigger besides the viewport itself, and viewport resize is already
  // handled separately by the dedicated resize/orientationchange listeners below, which force a
  // re-fit directly. window.innerWidth alone is sufficient and reads no layout property at all.
  const sig = String(window.innerWidth) + '|' + buildLabel + '|' + document.getElementById('runRewardBtn').hidden;
  if(!force && sig === hudFitSignature) return; // counter updates must not resize the full bar after every kill
  hudFitSignature = sig;
  hud.style.transform = 'scale(1)'; // reset before measuring, so scrollWidth reflects natural unscaled size
  placeNotificationBell(hud);
  // Gold-gain popups are absolutely positioned outside normal flow; scrollWidth includes them
  // in some browsers and made the fit scale pulse when a kill displayed a reward.
  const naturalWidth = Array.from(hud.children).reduce((sum, child)=>sum+child.getBoundingClientRect().width,0)
    + Math.max(0,hud.children.length-1)*(parseFloat(getComputedStyle(hud).columnGap)||0) + 16;
  const availableWidth = window.innerWidth - 12; // small side margin so it never touches the screen edges
  if(naturalWidth > availableWidth){
    // CA732 — see HISTORY.md § [1.5.7] Code Archaeology, CA732
    const scale = Math.max(0.05, availableWidth / naturalWidth) * 0.94;
    hud.style.transform = 'scale(' + scale.toFixed(3) + ')';
  }
  positionNotificationControls(true);
}
fitHudTopToOneLine(true);
window.addEventListener('resize', () => fitHudTopToOneLine(true));
window.addEventListener('orientationchange', () => fitHudTopToOneLine(true));
if(typeof ResizeObserver!=='undefined'){
  const notificationLayoutObserver=new ResizeObserver(()=>positionNotificationControls(true));
  for(const id of ['canvas-frame','hud-top','notification-bell'])notificationLayoutObserver.observe(document.getElementById(id));
}
// CA733 — see HISTORY.md § [1.5.7] Code Archaeology, CA733
function fitStatRowToOneLine(){
  const row = document.getElementById('inspCombatRow');
  const panel = document.getElementById('inspect-panel');
  if(!row || !panel) return;
  row.style.transform = 'scale(1)'; // reset before measuring, so scrollWidth reflects natural unscaled size
  const naturalWidth = row.scrollWidth;
  const availableWidth = panel.clientWidth - 16; // panel's own 8px+8px padding (see #inspect-panel CSS)
  if(naturalWidth > availableWidth && availableWidth > 0){
    const scale = availableWidth / naturalWidth;
    row.style.transform = 'scale(' + scale.toFixed(3) + ')';
  }
}
window.addEventListener('resize', fitStatRowToOneLine);
window.addEventListener('orientationchange', fitStatRowToOneLine);
// CA737 — see HISTORY.md § [1.5.7] Code Archaeology, CA737
function fitNameplateToStatRow(){
  const panel = document.getElementById('inspect-panel');
  const mid = document.getElementById('inspNameplateMid');
  const portrait = document.getElementById('inspPortraitFrame');
  const chevron = document.getElementById('inspExpandChevron');
  const close = document.getElementById('inspClose');
  if(!panel || !mid || !portrait || !chevron || !close) return;
  const availableWidth = panel.clientWidth - 16; // same calculation fitStatRowToOneLine() uses
  const gapTotal = 6 * 3; // #inspNameplate's own gap (6px) across 3 gaps between its 4 children
  const midWidth = availableWidth - portrait.offsetWidth - chevron.offsetWidth - close.offsetWidth - gapTotal;
  if(midWidth > 20) mid.style.width = midWidth + 'px';
}
window.addEventListener('resize', fitNameplateToStatRow);
window.addEventListener('orientationchange', fitNameplateToStatRow);
// CA738 — see HISTORY.md § [1.5.7] Code Archaeology, CA738
function positionZoomControls(){
  const hud = document.getElementById('hud-top');
  const zoom = document.getElementById('zoom-controls');
  if(!hud || !zoom) return;
  const hudHeight = hud.getBoundingClientRect().height;
  zoom.style.top = Math.round(hudHeight + 10) + 'px';
}
positionZoomControls();
window.addEventListener('resize', positionZoomControls);
window.addEventListener('orientationchange', positionZoomControls);
// CA739 — see HISTORY.md § [1.5.7] Code Archaeology, CA739
function resizeGameFrame(){
  const canvasEl = document.getElementById('gameCanvas');
  if(!canvasEl) return;
  canvasEl.style.width = '100%';
  canvasEl.style.height = '100%';
}
resizeGameFrame();
window.addEventListener('resize', resizeGameFrame);
window.addEventListener('orientationchange', resizeGameFrame);
// Screen (CSS px) -> pre-camera canvas space (post letterbox scaling, pre dpr)
function toRawCanvasCoords(clientX, clientY){
  const rect = getCanvasRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return { x: (clientX-rect.left)*scaleX, y: (clientY-rect.top)*scaleY };
}
// Screen (CSS px) -> world space (accounts for camera pan/zoom) - used for game logic
function toCanvasCoords(e){
  const raw = toRawCanvasCoords(e.clientX, e.clientY);
  return { x: (raw.x - camera.x)/camera.zoom, y: (raw.y - camera.y)/camera.zoom };
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
/* --- Pan (drag) + pinch-zoom + tap-to-build, unified over Pointer Events --- */
const collectedPickupPointers = new Set();
const activePointers = new Map(); // pointerId -> {x,y} in client px
let dragPointerId = null, dragStartClient = null, isDragging = false;
let pinchStartDist = null;
const DRAG_THRESHOLD = 8; // CSS px before a press counts as a pan instead of a tap
function pinchInfo(){
  const iterator = activePointers.values();
  const first = iterator.next().value, second = iterator.next().value;
  const dist = Math.hypot(first.x-second.x, first.y-second.y);
  const mid = { x:(first.x+second.x)/2, y:(first.y+second.y)/2 };
  return { dist, mid };
}
function handleTap(clientX, clientY, pointerType){
  // CA740 — see HISTORY.md § [1.5.7] Code Archaeology, CA740
  if(gameState === 'PAUSED'){ resumeGame(); return; }
  if(gameState !== 'PLAYING') return;
  const {x,y} = toRawCanvasCoords(clientX, clientY);
  const worldX = (x - camera.x)/camera.zoom, worldY = (y - camera.y)/camera.zoom;
  const gx = Math.floor(worldX/TILE_SIZE), gy = Math.floor(worldY/TILE_SIZE);
  if(gx<0||gx>=COLS||gy<0||gy>=ROWS) return;

  if(placingCampfire){ placeCampfire(gx,gy); return; }
  if(moveModeTower){
    attemptMoveTower(gx, gy);
    return;
  }

  if(tryOpenCaravan(worldX, worldY)) return;
  if(tryCollectAmbientLog(worldX, worldY, pointerType)) return;
  if(!tryMarkTargetAt(worldX, worldY)) setMarkedTarget(null); // PIN-TAP-ONLY-01 (1.6.121) — see HISTORY.md § [1.6.121]

  const sceneryHit = sceneryAtPoint(worldX, worldY);
  if(sceneryHit){
    if(selectedBuildType){playSound('ui_deny');return;}
    startClearingScenery(sceneryHit.item);
    return;
  }

  const existing = towerPool.find(t => t.active && t.gridX===gx && t.gridY===gy);
  if(existing){
    if(selectedBuildType){ playSound('ui_deny'); return; }
    selectedTower = existing;
    playSound('spawn_chatter', existing.x, CLASS_ARCHETYPE[existing.type], existing.y); // the unit answers when you select it
    startCameraFollow(existing);
    inspPanelExpanded = existing.statPoints > 0; // skip the extra tap when there's something to spend
    selectedBuildType = null;
    refreshTrayUI();
    updateInspectPanel();
    return;
  }

  if(selectedBuildType){
    if(!isTowerBuildableNow(selectedBuildType)){ selectedBuildType = null; refreshTrayUI(); return; }
    if(!isInActiveRegion(gx, gy)){
      spawnFloatingText(gx*TILE_SIZE+TILE_SIZE/2, gy*TILE_SIZE+TILE_SIZE/2, '🔒 Expand map first', '#e63946');
      return;
    }
    if(!isTileBuildable(gx, gy, null, selectedBuildType)){ playSound('ui_deny'); return; }
    if(!isTowerTypeAvailable(selectedBuildType)){
      spawnFloatingText(gx*TILE_SIZE+TILE_SIZE/2, gy*TILE_SIZE+TILE_SIZE/2, '⛔ Only one ' + CONFIG.TOWERS[selectedBuildType].name + ' at a time', '#e63946');
      showToast('⛔ Only one ' + CONFIG.TOWERS[selectedBuildType].name + ' can stand at a time. Sell or move the existing one first.');
      return;
    }
    if(!canAffordTower(selectedBuildType)) return;
    const t = acquireActive(towerPool);
    if(!t) return;
    const buildGoldBefore = gold, buildWoodBefore = wood, buildStoneBefore = stone;
    let paidProducerGold = 0;
    if(selectedBuildType === 'BARRICADE'){
      // CA741 — see HISTORY.md § [1.5.7] Code Archaeology, CA741
      if(freeBarricadesLeft > 0) freeBarricadesLeft--;
      else { const bc = currentBarricadeCost(); wood -= bc.wood; stone -= bc.stone; }
    } else if(isProducerType(selectedBuildType)){
      const producerCost = producerBuildCost(selectedBuildType);
      if(!hackFreeBuild){ gold -= producerCost.gold; wood -= producerCost.wood; stone -= producerCost.stone; }
      paidProducerGold = producerCost.gold;
    } else {
      if(!hackFreeBuild) gold -= currentBuildCost(selectedBuildType);
    }
    t.create(selectedBuildType, gx, gy); // snapped to tile center by construction
    if(isProducerType(t.type)) t.totalSpent = paidProducerGold;
    // CA742 — see HISTORY.md § [1.5.7] Code Archaeology, CA742
    sessionTelemetry.towersBuilt++;
    {
      const isFirstOfType = !builtTowerTypesThisSession.has(selectedBuildType);
      builtTowerTypesThisSession.add(selectedBuildType);
      trackGameEvent('tower_built', { tower_type: selectedBuildType, cost:Math.max(0,buildGoldBefore-gold), wood_cost:Math.max(0,buildWoodBefore-wood), stone_cost:Math.max(0,buildStoneBefore-stone), payment_type:buildGoldBefore !== gold ? 'gold' : (buildWoodBefore !== wood || buildStoneBefore !== stone) ? 'resources' : 'free', towers:countActiveTowers(), first_of_type:isFirstOfType });
    }
    spawnTowerQuip(t.x, t.y - 40, randomJobQuote(t.type));
    playSound('spawn_chatter', t.x, CLASS_ARCHETYPE[t.type], t.y);
    selectedBuildType = null;
    selectedTower = t;
    if(isFighterTower(t)) markFirstFighterBuilt();
    startCameraFollow(t);
  inspPanelExpanded = false;
    playSound('click');
    refreshTrayUI();
    updateInspectPanel();
    updateHUD();
    return;
  }

  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  updateInspectPanel();
}
function attemptMoveTower(gx, gy){
  if(gx === moveModeTower.gridX && gy === moveModeTower.gridY){ exitMoveMode(); return; }
  if(!isTileBuildable(gx, gy, moveModeTower, moveModeTower.type)) return; // invalid tile — stay in move mode, let them try again
  logGameEvent(itemHolderLabel(moveModeTower) + ' moved to tile ' + gx + ',' + gy + ' (' + (moveModeTower.moveCharges - 1) + ' free moves left)');
  moveModeTower.walkTo(gx, gy);
  moveModeTower.moveCharges--;
  playSound('click');
  const movedTower = moveModeTower;
  exitMoveMode();
  selectedTower = movedTower;
  inspPanelExpanded = false;
  updateInspectPanel();
  updateHUD();
}
function enterMoveMode(tower){
  if(tower.moveCharges <= 0 || isProducerType(tower.type)) return;
  moveModeTower = tower;
  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  selectedBuildType = null;
  updateInspectPanel();
  refreshTrayUI();
  document.getElementById('move-mode-banner').classList.remove('hidden');
}
function exitMoveMode(){
  moveModeTower = null;
  document.getElementById('move-mode-banner').classList.add('hidden');
}
canvas.addEventListener('pointerdown', (e) => {
  stopPanInertia();
  panInertia.lastMoveTime = e.timeStamp;
  unlockAudio();
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if(activePointers.size === 2){
    if(draggingGroundItem || collectedPickupPointers.size) return;
    isDragging = true; // cancel any single-finger tap in progress
    pinchStartDist = pinchInfo().dist;
  } else if(activePointers.size === 1){
    dragPointerId = e.pointerId;
    dragStartClient = {x:e.clientX, y:e.clientY};
    isDragging = false;
    // CA743 — see HISTORY.md § [1.5.7] Code Archaeology, CA743
    if(gameState === 'PLAYING'){
      const { x: worldX, y: worldY } = toCanvasCoords(e);
      if(tryCollectCoinAt(worldX, worldY, e.pointerType)){
        collectedPickupPointers.add(e.pointerId);
        waveStartCameraPan = null; cancelCameraFollow();
      } else {
        for(const gi of groundItems){
          if(isWithinEmojiSquare(worldX, worldY, gi.x, gi.y + groundItemBobPx(gi), GROUND_ITEM_EMOJI_PX)){
            waveStartCameraPan = null; cancelCameraFollow();
            draggingGroundItem = gi;
            dragItemPos = { x: worldX, y: worldY };
            break;
          }
        }
      }
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if(gameState === 'PLAYING' && !draggingGroundItem && coinPickups.length){ const hoverPoint = toCanvasCoords(e); tryCollectCoinAt(hoverPoint.x, hoverPoint.y, e.pointerType, true); } // HOVER-COIN-01 (1.7.36): a mouse hover or a finger sliding over a coin collects it
  if(collectedPickupPointers.has(e.pointerId)) return;
  if(activePointers.size === 2 && (draggingGroundItem || collectedPickupPointers.size)) return;
  const prev = activePointers.get(e.pointerId);
  if(prev) activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if(activePointers.size === 2){
    const { dist, mid } = pinchInfo();
    if(pinchStartDist){
      const raw = toRawCanvasCoords(mid.x, mid.y);
      zoomAt(raw.x, raw.y, camera.zoom * (dist/pinchStartDist));
      if(gameState !== 'PLAYING') requestPausedRender(); // paused — same reasoning as the wheel handler's own fix: nudge one frame through now or the zoom change stays invisible until unpausing
    }
    pinchStartDist = dist;
    return;
  }

  if(activePointers.size === 1 && e.pointerId === dragPointerId && dragStartClient && prev){
    const dx = e.clientX - dragStartClient.x, dy = e.clientY - dragStartClient.y;
    if(!isDragging && Math.hypot(dx,dy) > DRAG_THRESHOLD) isDragging = true;
    if(draggingGroundItem){
      const raw = toCanvasCoords(e);
      dragItemPos = draggedItemPositionAt(raw,draggingGroundItem);
      if(gameState==='PAUSED') requestPausedRender();
    } else if(isDragging){
      const rect = getCanvasRect();
      const scaleX = CANVAS_W / rect.width, scaleY = CANVAS_H / rect.height;
      const panDx = (e.clientX - prev.x)*scaleX, panDy = (e.clientY - prev.y)*scaleY;
      camera.x += panDx;
      camera.y += panDy;
      trackPanVelocity(panDx, panDy, e.timeStamp);
      clampCamera();
      cancelCameraFollow();
      if(gameState !== 'PLAYING') requestPausedRender(); // paused — same reasoning as the wheel/pinch fixes: nudge one frame through now or the pan stays invisible until unpausing
    }
  }

  if(!isDragging && gameState === 'PLAYING'){
    const { x: worldX, y: worldY } = toCanvasCoords(e);
    if((selectedBuildType || moveModeTower) && e.pointerType !== 'touch'){
      const gx = Math.floor(worldX/TILE_SIZE), gy = Math.floor(worldY/TILE_SIZE);
      if(!hoverCell || hoverCell.gx !== gx || hoverCell.gy !== gy) hoverCell = {gx,gy};
    }
    const sceneryHover = sceneryAtPoint(worldX, worldY);
    hoveredSceneryKey = sceneryHover ? sceneryHover.key : null;
  }
});
function rejectFullInventoryDrop(item,target){
  playSound('ui_deny');
  const direction=Math.atan2(dragItemPos.y-target.y,dragItemPos.x-target.x);
  const angle=Number.isFinite(direction) ? direction : Math.PI/4;
  item.rejectFromX=target.x;item.rejectFromY=target.y;item.rejectStartedAt=presentationTime;
  item.x=Math.max(8,Math.min(COLS*TILE_SIZE-8,target.x+Math.cos(angle)*38));
  item.y=Math.max(8,Math.min(ROWS*TILE_SIZE-8,target.y+Math.sin(angle)*38));
}
function onPointerEnd(e){
  const wasSinglePointer = activePointers.size === 1 && e.pointerId === dragPointerId;
  const isCancel = e.type === 'pointercancel' || !wasSinglePointer;
  const collectedPickup = collectedPickupPointers.delete(e.pointerId);
  if(wasSinglePointer && isDragging && !isCancel && !collectedPickup && !draggingGroundItem && gameState === 'PLAYING') startPanInertia(e.timeStamp);
  activePointers.delete(e.pointerId);
  if(activePointers.size < 2) pinchStartDist = null;

  if(wasSinglePointer || e.pointerId === dragPointerId){
    if(!isCancel && draggingGroundItem){
      if(isDragging) dragItemPos=draggedItemPositionAt(toCanvasCoords(e),draggingGroundItem);
      const target = itemDropTargetAt(dragItemPos);
      if(draggingGroundItem.itemDef.isMapScroll){
        if(!isDragging) useFreeExpansionPickup(draggingGroundItem, '#7dd3fc');
      } else if(draggingGroundItem.itemDef.isGoldBag){ // GOLD-BAG-ITEM-01: dropped on a stickman it opens there; tapped without moving it opens where it lies; dragged elsewhere it is simply moved (below)
        if(target) openGoldBag(draggingGroundItem, target.x, target.y - 4);
        else if(!isDragging) openGoldBag(draggingGroundItem, draggingGroundItem.x, draggingGroundItem.y);
      } else if(isConsumableDef(draggingGroundItem.itemDef)){ // CONSUMABLE-STORED-01 (1.6.132) — a consumable dropped on a stickman is stored in its slots, never used on the spot
        const def = draggingGroundItem.itemDef;
        if(def.isFood && target){ eatDroppedFood(draggingGroundItem, target); // FOOD-STATS-01: food is eaten on the spot
        } else if(target && target.receiveItem(def)){
          groundItems = groundItems.filter(gi => gi !== draggingGroundItem);
          spawnFloatingText(target.x, target.y - 40, def.icon, '#ffffff', ITEM_POPUP_LIFE_MS); // ITEM-DROP-EMOJI-01 (1.6.116) — see HISTORY.md § [1.6.116]
          trackGameEvent(def.isDiggingTool ? 'item_equipped' : def.isHutLoot ? 'hut_loot_collected' : def.isStim ? 'stim_collected' : def.isFood ? 'food_collected' : 'treat_collected', def.isDiggingTool ? { item: def.id, rarity: def.rarity, tower_type: target.type, items_carried: target.equippedItems.length } : { item: def.id, tower_type: target.type });
          playSound('click');
          if(selectedTower === target) updateInspectPanel();
        } else if(target){
          rejectFullInventoryDrop(draggingGroundItem,target);
        }
      } else if(target && target.receiveItem(draggingGroundItem.itemDef)){
        groundItems = groundItems.filter(gi => gi !== draggingGroundItem);
        const equippedDef = draggingGroundItem.itemDef;
        spawnFloatingText(target.x, target.y - 40, equippedDef.isBarricade ? '🚧' : equippedDef.icon, '#ffffff', ITEM_POPUP_LIFE_MS);
        trackGameEvent('item_equipped', { item: equippedDef.id, rarity: equippedDef.rarity, tower_type: target.type, items_carried: target.equippedItems.length });
        playSound('click');
        if(selectedTower === target) updateInspectPanel();
      } else if(target && target.equippedItems.length >= MAX_ITEM_SLOTS){
        rejectFullInventoryDrop(draggingGroundItem,target);
      } else if(draggingGroundItem.itemDef.isBarricade){
        // CA747 — see HISTORY.md § [1.5.7] Code Archaeology, CA747
        const gx = Math.floor(dragItemPos.x / TILE_SIZE), gy = Math.floor(dragItemPos.y / TILE_SIZE);
        if(isTileBuildable(gx, gy, null, 'BARRICADE')){
          const newBarricade = acquireActive(towerPool);
          if(newBarricade){
            newBarricade.create('BARRICADE', gx, gy); // already paid for when the item was bought — free here
            groundItems = groundItems.filter(gi => gi !== draggingGroundItem);
            spawnFloatingText(newBarricade.x, newBarricade.y - 40, '🚧 Placed!', '#7dd3fc');
            playSound('click');
          }
        }
        // CA748 — see HISTORY.md § [1.5.7] Code Archaeology, CA748
      }
      if(!target && isDragging && groundItems.includes(draggingGroundItem)){
        draggingGroundItem.x = dragItemPos.x; draggingGroundItem.y = dragItemPos.y;
        playSound('click');
      }
    } else if(!isCancel && !collectedPickup && !draggingGroundItem && !isDragging){
      handleTap(e.clientX, e.clientY, e.pointerType);
    }
    // CA749 — see HISTORY.md § [1.5.7] Code Archaeology, CA749
    draggingGroundItem = null;
    dragPointerId = null; dragStartClient = null; isDragging = false;
    if(gameState==='PAUSED') requestPausedRender();
  }
}
canvas.addEventListener('pointerup', onPointerEnd);
canvas.addEventListener('pointercancel', onPointerEnd);
canvas.addEventListener('pointerleave', () => { hoverCell = null; hoveredSceneryKey = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const raw = toRawCanvasCoords(e.clientX, e.clientY);
  const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
  zoomAt(raw.x, raw.y, camera.zoom*factor);
  if(gameState !== 'PLAYING') requestPausedRender(); // paused — the main loop won't render on its own, so nudge one frame through now or the zoom change stays invisible until unpausing
}, { passive:false });
/* =========================================================
   UI WIRING
   ========================================================= */
const livesVal = document.getElementById('livesVal');
const goldVal = document.getElementById('goldVal');
const waveVal = document.getElementById('waveVal');
// CA750 — see HISTORY.md § [1.5.7] Code Archaeology, CA750
const shopLivesVal = document.getElementById('shopLivesVal');
const shopBuyLifeCost = document.getElementById('shopBuyLifeCost');
const woodVal = document.getElementById('woodVal');
const stoneVal = document.getElementById('stoneVal');
const looseNotice = document.getElementById('looseNotice');
const nextWaveBtn = document.getElementById('nextWaveBtn');
const inspectPanel = document.getElementById('inspect-panel');
const inspName = document.getElementById('inspName');
const inspLevel = document.getElementById('inspLevel');
// CA751 — see HISTORY.md § [1.5.7] Code Archaeology, CA751
const auraTooltip = document.getElementById('auraTooltip');
const barricadeInfoBtn = document.getElementById('barricadeInfoBtn');
const inspAtkRange = document.getElementById('inspAtkRange');
const inspAtkVal = document.getElementById('inspAtkVal');
const inspAuraBox = document.getElementById('inspAuraBox');
const inspAxeModeBtn = document.getElementById('inspAxeModeBtn');
const inspAxeModeVal = document.getElementById('inspAxeModeVal');
const inspAxeSwitches = document.getElementById('inspAxeSwitches');
const inspCombatRow = document.getElementById('inspCombatRow');
const inspCritVal = document.getElementById('inspCritVal');
const inspDefVal = document.getElementById('inspDefVal');
const inspDexBtn = document.getElementById('inspDexBtn');
const inspDexVal = document.getElementById('inspDexVal');
const inspDpsBetween = document.getElementById('inspDpsBetween');
const inspDpsVal = document.getElementById('inspDpsVal');
const inspDpsRangeVal = document.getElementById('inspDpsRangeVal');
const towerModalEl = document.getElementById('tower-modal');
const inspEvoBarFill = document.getElementById('inspEvoBarFill');
const inspEvoBarText = document.getElementById('inspEvoBarText');
const inspEvoBarTrack = document.getElementById('inspEvoBarTrack');
const inspEvoHint = document.getElementById('inspEvoHint');
const inspExpandChevron = document.getElementById('inspExpandChevron');
const inspFullOptions = document.getElementById('inspFullOptions');
const inspHpBarFill = document.getElementById('inspHpBarFill');
const inspHpBarText = document.getElementById('inspHpBarText');
const inspHpStatVal = document.getElementById('inspHpStatVal');
const inspIntBtn = document.getElementById('inspIntBtn');
const inspIntVal = document.getElementById('inspIntVal');
const inspItemsRow = document.getElementById('inspItemsRow');
const inspMoveBtn = document.getElementById('inspMoveBtn');
const inspMoveCost = document.getElementById('inspMoveCost');
const inspPortraitFace = document.getElementById('inspPortraitFace');
const inspRangeVal = document.getElementById('inspRangeVal');
const inspRepairBtn = document.getElementById('inspRepairBtn');
const inspRepairCost = document.getElementById('inspRepairCost');
const inspSpeedVal = document.getElementById('inspSpeedVal');
const inspStatPointsVal = document.getElementById('inspStatPointsVal');
const inspAutoSpend = document.getElementById('inspAutoSpend');
inspAutoSpend.addEventListener('pointerdown', (e) => e.stopPropagation());
inspAutoSpend.addEventListener('change', () => {
  if(!selectedTower) return;
  selectedTower.autoSpend = inspAutoSpend.checked;
  autoSpendStatPoints(selectedTower);
});
const inspStatsRow = document.getElementById('inspStatsRow');
const inspStoreBtn = document.getElementById('inspStoreBtn');
const inspStrBtn = document.getElementById('inspStrBtn');
const inspStrVal = document.getElementById('inspStrVal');
const statsInfoBtn = document.getElementById('statsInfoBtn');
const inspUpgradeBtn=document.getElementById('inspUpgradeBtn');
const inspTargetBtn=document.getElementById('inspTargetBtn');
const inspUpgradeCost = document.getElementById('inspUpgradeCost');
const inspSellBtn = document.getElementById('inspSellBtn');
const inspSellValue = document.getElementById('inspSellValue');
const inspTargetMode = document.getElementById('inspTargetMode');
const inspClose = document.getElementById('inspClose');
// CA752 — see HISTORY.md § [1.5.7] Code Archaeology, CA752
let hudDirty = false;
function updateHUD(){ hudDirty = true; }
function flushHUDIfDirty(){
  if(!hudDirty) return;
  hudDirty = false;
  // HUD-TIMING-01 (1.7.50): the HUD flush ran outside both the update and the render timers, so its cost was invisible in the debug overlay; it is now measured and shown (smoothed).
  const hudStart = performance.now();
  updateHUDImmediate();
  perfStats.hudMs = (perfStats.hudMs || 0)*0.9 + (performance.now() - hudStart)*0.1;
}
const hudPopAnimations = new WeakMap();
function restartHudPop(pop){
  const previous = hudPopAnimations.get(pop);
  if(previous && typeof previous.cancel === 'function') previous.cancel();
  pop.classList.remove('pop');
  if(typeof pop.animate === 'function'){
    hudPopAnimations.set(pop, pop.animate([
      {opacity:0,transform:'translateY(4px)',offset:0},
      {opacity:1,transform:'translateY(0)',offset:0.15},
      {opacity:1,transform:'translateY(-6px)',offset:0.7},
      {opacity:0,transform:'translateY(-12px)',offset:1}
    ], {duration:900,easing:'ease-out'}));
  }else{
    const marker = {};
    hudPopAnimations.set(pop, marker);
    requestAnimationFrame(() => {
      if(hudPopAnimations.get(pop) === marker) pop.classList.add('pop');
    });
  }
}
let lastShownGold = null, goldGainHideTimer = 0;
// CA753 — see HISTORY.md § [1.5.7] Code Archaeology, CA753
function showGoldGain(amount){
  const pop = document.getElementById('goldGainPop');
  if(!pop) return;
  const pending = (goldGainHideTimer && pop.dataset.pending) ? parseInt(pop.dataset.pending, 10) : 0;
  const total = pending + amount;
  pop.dataset.pending = total;
  pop.textContent = '+' + total;
  restartHudPop(pop);
  playSound('coin');
  clearTimeout(goldGainHideTimer);
  goldGainHideTimer = setTimeout(() => { goldGainHideTimer = 0; pop.dataset.pending = 0; pop.classList.remove('pop'); }, 900);
}
// LIVES-POP-01 (1.6.78) — see HISTORY.md § [1.6.78]
let lastShownLives = null, livesChangeHideTimer = 0;
function showLivesChange(delta){
  const pop = document.getElementById('livesChangePop');
  if(!pop || !delta) return;
  const isSameDirectionAsPending = livesChangeHideTimer && pop.dataset.pending && Math.sign(parseInt(pop.dataset.pending, 10)) === Math.sign(delta);
  const total = (isSameDirectionAsPending ? parseInt(pop.dataset.pending, 10) : 0) + delta;
  pop.dataset.pending = total;
  pop.textContent = (total > 0 ? '+' : '−') + Math.abs(total);
  pop.classList.toggle('lost', total < 0);
  pop.classList.toggle('gained', total > 0);
  restartHudPop(pop);
  clearTimeout(livesChangeHideTimer);
  livesChangeHideTimer = setTimeout(() => { livesChangeHideTimer = 0; pop.dataset.pending = 0; pop.classList.remove('pop'); }, 900);
}
// CA754 — see HISTORY.md § [1.5.7] Code Archaeology, CA754
function merchantShopOpen(){
  return caravanShopAvailable() || towerPool.some(t => t.active && t.type === 'MERCHANT' && t.disabledWavesLeft <= 0);
}
function nextWaveActionLabel(wavesStarted){ return wavesStarted === 0 ? 'Start Wave' : 'Next Wave'; }
function setHudText(element, value){
  const text = String(value);
  if(element.textContent !== text) element.textContent = text;
}
function updateHUDImmediate(){
  setHudText(livesVal, lives);
  if(lastShownLives !== null && lives !== lastShownLives) showLivesChange(lives - lastShownLives);
  lastShownLives = lives;
  if(lastShownGold === null) lastShownGold = gold;
  if(gold > lastShownGold) showGoldGain(gold - lastShownGold);
  lastShownGold = gold;
  setHudText(goldVal, gold);
  const lifeCost = buyLifeCost();
  if(shopLivesVal){
    setHudText(shopLivesVal, lives);
    setHudText(shopBuyLifeCost, '+💰' + lifeCost);
    shopBuyLifeBtn.disabled = gold < lifeCost;
  }
  setHudText(woodVal, wood);
  setHudText(stoneVal, stone);
  // CA755 — see HISTORY.md § [1.5.7] Code Archaeology, CA755
  const shopBtnEl = document.getElementById('shopBtn');
  if(shopBtnEl){
    const shopOpen = merchantShopOpen();
    shopBtnEl.classList.toggle('shop-locked', !shopOpen);
    const badge = document.getElementById('shopLockBadge');
    if(badge) badge.classList.toggle('hidden', shopOpen);
    shopBtnEl.title = shopOpen ? '' : (unlockedTowerTypes.has('MERCHANT') || wavesCompleted >= CONFIG.TOWERS.MERCHANT.unlocksAfterWave
      ? '🔒 Build a Merchant (👳) and keep him alive to open the Shop'
      : '🔒 Unlocks a Merchant tower at Wave ' + CONFIG.TOWERS.MERCHANT.unlocksAfterWave + ' — keep him alive to open the Shop');
  }
  setHudText(waveVal, waveIndex < CAMPAIGN_WAVE_COUNT
    ? waveIndex + '/' + CAMPAIGN_WAVE_COUNT
    : waveIndex + ' ∞');
  setHudText(looseNotice, ''); looseNotice.hidden = true; // LOOSE-NOTICE-REMOVED-01 (1.7.75): owner: the 'loose · costing' line is not the obvious cue they wanted; the broken heart flying to the counter is (HEART-BREAK-01)
  const wavePhaseEl = document.getElementById('wavePhase');
  if(wavePhaseEl){
    const phaseLabel = waveState === 'IDLE' ? 'STANDBY' : waveState === 'SPAWNING' ? 'INCOMING' : 'FIGHTING'; // WAVE-PHASE-TEXT-01 (1.7.129): the bar beside the wave number said nothing the number did not; it now names the phase
    if(wavePhaseEl.dataset.phase !== phaseLabel){ wavePhaseEl.dataset.phase = phaseLabel; wavePhaseEl.textContent = phaseLabel; }
  }
  const waveActionText = nextWaveActionLabel(waveIndex) + ' ';
  if(nextWaveBtn.firstChild && nextWaveBtn.firstChild.textContent !== waveActionText) nextWaveBtn.firstChild.textContent = waveActionText;
  nextWaveBtn.disabled = waveState !== 'IDLE';
  syncFirstPlayCues();

  refreshTrayUI();
  // CA756 — see HISTORY.md § [1.5.7] Code Archaeology, CA756
  if(towerModalEl && !towerModalEl.classList.contains('hidden')) buildTowerModal();
  fitHudTopToOneLine(); // guarded internally — only re-measures when the available layout changes
}
function refreshTrayUI(){
  const buildBtn = document.getElementById('buildBtn');
  buildBtn.classList.toggle('selected', !!selectedBuildType);
  buildBtn.classList.toggle('has-unlock', hasUnseenUnlock);
  setHudText(buildBtn, selectedBuildType ? (CONFIG.TOWERS[selectedBuildType].icon + ' ' + CONFIG.TOWERS[selectedBuildType].name) : '🏗️ Build');
}
function refreshBuildMenuAvailability(grid){
  const fireRow=grid.querySelector('.campfire-build-row');if(fireRow)fireRow.classList.toggle('unaffordable', !canAffordCampfire());
  const expandRow = grid.querySelector('.expand-row');
  if(expandRow){
    const full = regionFullyExpanded();
    const cost = expansionCost();
    const blocked = expansionBlockedReason();
    expandRow.classList.toggle('disabled', full || !!blocked || gold < cost);
    expandRow.classList.toggle('unaffordable', gold < cost); // EXPAND-COST-CUE-01 (1.7.138)
    const label = full ? 'Max Size' : blocked ? 'Expand — ' + blocked : 'Expand';
    const costEl = expandRow.querySelector('.cost');
    if(costEl){ costEl.hidden = full || !!blocked; if(costEl.textContent !== '💰'+cost) costEl.textContent = '💰'+cost; }
    const name = expandRow.querySelector('.name');
    if(name.textContent !== label) name.textContent = label;
  }
  for(const row of grid.querySelectorAll('[data-build-type]')){
    const type = row.dataset.buildType;
    const def = CONFIG.TOWERS[type];
    row.classList.toggle('selected', selectedBuildType === type);
    if(row.classList.contains('locked')) continue;
    let label, affordable, capacity = false;
    if(isProducerType(type)){
      label = producerCostLabel(producerBuildCost(type));
      affordable = canAffordTower(type);
    }else if(type === 'BARRICADE'){
      const cost = currentBarricadeCost();
      label = freeBarricadesLeft > 0 ? '🎁 FREE!' : '🪵'+cost.wood+' 🪨'+cost.stone;
      affordable = canAffordTower(type);
    }else{
      const cost = STARTER_TOWER_TYPES.includes(type) ? currentBuildCost(type) : def.baseCost;
      label = '💰'+cost;
      affordable = gold >= cost;
      capacity = !STARTER_TOWER_TYPES.includes(type) && !isTowerTypeAvailable(type);
    }
    const nameHtml = def.name + (capacity ? ' <span style="color:#e63946">(already on the field)</span>' : '');
    if(!capacity) row.classList.toggle('unaffordable', !affordable);
    const name = row.querySelector('.name');
    if(row.dataset.liveName !== nameHtml){ name.innerHTML = nameHtml; row.dataset.liveName = nameHtml; }
    const costEl = row.querySelector('.cost');
    if(costEl && costEl.textContent !== label) costEl.textContent = label;
  }
}
let buildMenuSignature = null;
function buildTowerModal(){
  placingCampfire=false;
  const grid = document.getElementById('tower-modal-grid');
  const signature = 'hacks:' + hacksEnabled + '|' + STARTER_TOWER_TYPES.map(type => type+':'+isTowerBuildableNow(type)).join('|') + '|' + [...unlockedTowerTypes].sort().join('|');
  if(buildMenuSignature === signature && grid.children.length){
    refreshBuildMenuAvailability(grid);
    return;
  }
  buildMenuSignature = signature;
  grid.innerHTML = '';
  const addBuildSection = label => { const heading = document.createElement('div'); heading.className = 'build-section-title'; heading.textContent = label; grid.appendChild(heading); };

  const fullyExpanded = regionFullyExpanded();
  const cost = expansionCost();
  const canExpand = !fullyExpanded && !expansionBlockedReason() && gold >= cost;
  const expandRow = document.createElement('div');
  expandRow.className = 'build-row expand-row' + (canExpand ? '' : ' disabled') + (gold < cost ? ' unaffordable' : '');
  const expandLabel = fullyExpanded ? 'Max Size' : expansionBlockedReason() ? 'Expand — ' + expansionBlockedReason() : 'Expand';
  expandRow.innerHTML =
    '<div class="icon">🗺️</div>' +
    '<div class="name">' + expandLabel + '</div>' +
    '<div class="cost"' + (fullyExpanded || expansionBlockedReason() ? ' hidden' : '') + '>💰' + cost + '</div>' +
    '<button class="help-btn" type="button">?</button>' +
    '<div class="build-row-blurb">Grows the map, during a wave or between waves: you can buy one expansion per wave. A wave gives one free expansion when it ends with no escaped enemies still alive. Otherwise that bonus is lost. A red cost means more gold is needed; other limits appear in the label.</div>';
  {
    expandRow.addEventListener('pointerdown', (e) => {
      if(e.target.classList.contains('help-btn')) return;
      e.stopPropagation();
      unlockAudio();
      if(regionFullyExpanded() || expansionBlockedReason() || gold < expansionCost()) return;
      if(expandRegion()){ updateHUD(); closeTowerModal(); }
    });
  }
  const expandHelpBtn = expandRow.querySelector('.help-btn');
  const expandBlurb = expandRow.querySelector('.build-row-blurb');
  expandHelpBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    expandBlurb.classList.toggle('show');
  });
  addBuildSection('Structures');
  grid.appendChild(expandRow);
  for(const producerType of PRODUCER_TYPES){
    const producerConfig = CONFIG.TOWERS[producerType], liveCost = producerBuildCost(producerType), affordable = canAffordProducerCost(liveCost), costLabel = producerCostLabel(liveCost);
    const row = document.createElement('div');
    row.dataset.buildType = producerType;
    row.className = 'build-row' + (selectedBuildType === producerType ? ' selected' : '') + (affordable ? '' : ' unaffordable');
    row.innerHTML = '<div class="icon">' + producerConfig.icon + '</div><div class="name">' + producerConfig.name + '</div><div class="cost">' + costLabel + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">' + producerConfig.blurb + '</div>';
    row.addEventListener('pointerdown', (e) => {
      if(e.target.classList.contains('help-btn')) return;
      e.stopPropagation();
      if(!canAffordTower(producerType)) return;
      selectedBuildType = producerType; selectedTower = null; cancelCameraFollow(); inspPanelExpanded = false;
      playSound('click'); closeTowerModal(); updateInspectPanel(); refreshTrayUI();
    });
    const producerHelp = row.querySelector('.help-btn'), producerBlurb = row.querySelector('.build-row-blurb');
    producerHelp.addEventListener('pointerdown', (e) => { e.stopPropagation(); producerBlurb.classList.toggle('show'); });
    grid.appendChild(row);
  }
  const campfireRow = document.createElement('div');
  campfireRow.className = 'build-row campfire-build-row' + (canAffordCampfire() ? '' : ' unaffordable');
  campfireRow.innerHTML = '<div class="icon">🔥</div><div class="name">Campfire</div><div class="cost">' + producerCostLabel({ gold: CAMPFIRE_BUILD_GOLD, wood: CAMPFIRE_BUILD_WOOD, stone: CAMPFIRE_BUILD_STONE }) + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">Built on empty grass. Cooks ingredients gathered from the ground and every stickman\'s inventory, burning stored wood as fuel.</div>';
  campfireRow.addEventListener('pointerdown', (e) => {
    if(e.target.classList.contains('help-btn')) return;
    e.stopPropagation();
    if(!canAffordCampfire()){ playSound('ui_deny'); return; }
    selectedBuildType = null; selectedTower = null; moveModeTower = null; cancelCameraFollow(); placingCampfire = true; closeTowerModal(); refreshTrayUI(); showToast('🔥 Place campfire on empty grass');
  });
  const campfireHelp = campfireRow.querySelector('.help-btn'), campfireBlurb = campfireRow.querySelector('.build-row-blurb');
  campfireHelp.addEventListener('pointerdown', (e) => { e.stopPropagation(); campfireBlurb.classList.toggle('show'); });
  grid.appendChild(campfireRow);
  addBuildSection('Stickmen Defenders');

  for(const type of STARTER_TOWER_TYPES){
    if(type === 'BARRICADE') continue;
    const def = CONFIG.TOWERS[type];
    const unlocked = isTowerBuildableNow(type);
    const liveCost = currentBuildCost(type);
    const affordable = gold >= liveCost;
    const costLabel = '💰' + liveCost;
    const row = document.createElement('div');
    row.dataset.buildType = type;
    row.className = 'build-row' + (unlocked ? '' : ' locked') + (selectedBuildType===type ? ' selected' : '');
    row.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name + '</div>' +
      (unlocked ? '<div class="cost">' + costLabel + '</div>' : '') +
      '<button class="help-btn" type="button">?</button>' +
      (unlocked
        ? '<div class="build-row-blurb">' + def.blurb + '</div>'
        : '<div class="build-row-lock">🔒 Unlocks after Wave ' + def.unlocksAfterWave + '</div>');
    if(unlocked){
      row.addEventListener('pointerdown', (e) => {
        if(e.target.classList.contains('help-btn')) return; // handled separately below
        e.stopPropagation();
        // CA759 — see HISTORY.md § [1.5.7] Code Archaeology, CA759
        const stillAffordable = gold >= currentBuildCost(type);
        if(!stillAffordable) return;
        selectedBuildType = type;
        selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
        playSound('click');
        closeTowerModal();
        updateInspectPanel();
        refreshTrayUI();
      });
    }
    const helpBtn = row.querySelector('.help-btn');
    const blurb = row.querySelector(unlocked ? '.build-row-blurb' : '.build-row-lock');
    helpBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      blurb.classList.toggle('show');
    });
    grid.appendChild(row);
  }
  // CA760 — see HISTORY.md § [1.5.7] Code Archaeology, CA760
  // UNLOCK-HELP-01 (1.7.111) — see HISTORY.md § [1.7.111]: a locked class shows its full description, which says what it does and exactly how it is unlocked
  const TOWER_UNLOCK_RIDDLE = Object.fromEntries(UNLOCKABLE_TOWER_TYPES.filter(type => CONFIG.TOWERS[type]).map(type => [type, '🔒 ' + CONFIG.TOWERS[type].blurb]));
  // BUILD-ORDER-01 (1.6.4) — see HISTORY.md § [1.6.4]. Unlocked towers sort to the top, locked
  // ones stay below — direct request ("unlocked units should be higher in the build menu once
  // they're unlocked... harder unlocks feel like mystery achievements"). Stable sort keeps each
  // group's own relative order (the fixed unlock-path order UNLOCKABLE_TOWER_TYPES was already in).
  const sortedUnlockableTowerTypes = [...UNLOCKABLE_TOWER_TYPES].sort((a, b) => {
    const aLocked = unlockedTowerTypes.has(a) ? 0 : 1;
    const bLocked = unlockedTowerTypes.has(b) ? 0 : 1;
    return aLocked - bLocked;
  });
  let lastUnlockGroup = null;
  let fortificationSectionAdded = false;
  const appendBarricadeSection = () => {
    if(fortificationSectionAdded) return;
    fortificationSectionAdded = true;
    addBuildSection('Fortifications');
    const def = CONFIG.TOWERS.BARRICADE;
    const unlocked = isTowerBuildableNow('BARRICADE');
    const isFreeBarricade = freeBarricadesLeft > 0;
    const liveBarricadeCost = currentBarricadeCost();
    const affordable = isFreeBarricade || (wood >= liveBarricadeCost.wood && stone >= liveBarricadeCost.stone);
    const costLabel = isFreeBarricade ? '🎁 FREE!' : '🪵' + liveBarricadeCost.wood + ' 🪨' + liveBarricadeCost.stone;
    const row = document.createElement('div');
    row.dataset.buildType = 'BARRICADE';
    row.className = 'build-row' + (unlocked ? '' : ' locked') + (selectedBuildType==='BARRICADE' ? ' selected' : '');
    row.innerHTML = '<div class="icon">' + def.icon + '</div><div class="name">' + def.name + '</div>' +
      (unlocked ? '<div class="cost">' + costLabel + '</div>' : '') + '<button class="help-btn" type="button">?</button>' +
      (unlocked ? '<div class="build-row-blurb">' + def.blurb + '</div>' : '<div class="build-row-lock">🔒 Unlocks through play</div>');
    if(unlocked) row.addEventListener('pointerdown', (e) => {
      if(e.target.classList.contains('help-btn')) return;
      e.stopPropagation();
      if(!canAffordTower('BARRICADE')) return;
      selectedBuildType = 'BARRICADE'; selectedTower = null; cancelCameraFollow(); inspPanelExpanded = false;
      playSound('click'); closeTowerModal(); updateInspectPanel(); refreshTrayUI();
    });
    const barricadeHelp = row.querySelector('.help-btn');
    const barricadeBlurb = row.querySelector(unlocked ? '.build-row-blurb' : '.build-row-lock');
    barricadeHelp.addEventListener('pointerdown', (e) => { e.stopPropagation(); barricadeBlurb.classList.toggle('show'); });
    grid.appendChild(row);
  };
  for(const type of sortedUnlockableTowerTypes){
    const isLockedGroup = !unlockedTowerTypes.has(type);
    if(isLockedGroup !== lastUnlockGroup){
      if(isLockedGroup){
        appendBarricadeSection();
        addBuildSection('Locked');
      }
      lastUnlockGroup = isLockedGroup;
    }
    // CA762 — see HISTORY.md § [1.5.7] Code Archaeology, CA762
    const def = CONFIG.TOWERS[type];
    const unlocked = unlockedTowerTypes.has(type);
    const affordable = gold >= def.baseCost;
    const costLabel = '💰' + def.baseCost;
    const lockMsg = TOWER_UNLOCK_RIDDLE[type] || '🔒 Locked — a secret combination unlocks this';
    // CA763 — see HISTORY.md § [1.5.7] Code Archaeology, CA763
    const atCapacity = unlocked && !isTowerTypeAvailable(type);
    const row = document.createElement('div');
    row.dataset.buildType = type;
    row.className = 'build-row' + (unlocked ? '' : ' locked') + (selectedBuildType===type ? ' selected' : '');
    row.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name +
        (atCapacity ? ' <span style="color:#e63946">(already on the field)</span>'
          : '') +
        '</div>' +
      (unlocked ? '<div class="cost">' + costLabel + '</div>' : '') +
      '<button class="help-btn" type="button">?</button>' +
      (unlocked
        ? '<div class="build-row-blurb">' + def.blurb + '</div>'
        : '<div class="build-row-lock">' + lockMsg + '</div>');
    if(unlocked){
      row.addEventListener('pointerdown', (e) => {
        if(e.target.classList.contains('help-btn')) return;
        e.stopPropagation();
        // CA764 — see HISTORY.md § [1.5.7] Code Archaeology, CA764
        const stillAffordable = gold >= def.baseCost;
        const stillAtCapacity = unlocked && !isTowerTypeAvailable(type);
        if(!stillAffordable || stillAtCapacity) return;
        selectedBuildType = type;
        selectedTower = null; cancelCameraFollow();
        inspPanelExpanded = false;
        playSound('click');
        closeTowerModal();
        updateInspectPanel();
        refreshTrayUI();
      });
    }
    const helpBtn2 = row.querySelector('.help-btn');
    const blurb2 = row.querySelector(unlocked ? '.build-row-blurb' : '.build-row-lock');
    helpBtn2.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      blurb2.classList.toggle('show');
    });
    grid.appendChild(row);
  }
  appendBarricadeSection();
  if(hacksEnabled){
    addBuildSection('Hacks');
    const def = CONFIG.TOWERS.HACKER;
    const atCapacity = !isTowerTypeAvailable('HACKER');
    const affordable = gold >= def.baseCost;
    const costLabel = '💰' + def.baseCost;
    const row = document.createElement('div');
    row.dataset.buildType = 'HACKER';
    row.className = 'build-row' + (selectedBuildType === 'HACKER' ? ' selected' : '');
    row.innerHTML = '<div class="icon">' + def.icon + '</div><div class="name">' + def.name + (atCapacity ? ' <span style="color:#e63946">(already on the field)</span>' : '') + '</div><div class="cost">' + costLabel + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">' + def.blurb + '</div>';
    row.addEventListener('pointerdown', (e) => {
      if(e.target.classList.contains('help-btn')) return;
      e.stopPropagation();
      if(gold < def.baseCost || !isTowerTypeAvailable('HACKER')) return;
      selectedBuildType = 'HACKER'; selectedTower = null; cancelCameraFollow(); inspPanelExpanded = false;
      playSound('click'); closeTowerModal(); updateInspectPanel(); refreshTrayUI();
    });
    const hackerHelp = row.querySelector('.help-btn'), hackerBlurb = row.querySelector('.build-row-blurb');
    hackerHelp.addEventListener('pointerdown', (e) => { e.stopPropagation(); hackerBlurb.classList.toggle('show'); });
    grid.appendChild(row);
  }
  refreshBuildMenuAvailability(grid);
}
function openTowerModal(){
  toggleNotificationPanel(false);
  buildTowerModal();
  towerModalEl.classList.remove('hidden');
  hasUnseenUnlock = false;
  refreshTrayUI();
  playSound('ui_open');
}
// HACKER-01 (1.7.36): the Hacker's developer menu. Every action is a plain game-state edit and marks the run as hacked
// so the debug log shows it. Not saved with the game; the toggles reset on reload.
let hackMenuOpenFor = null;
function openHackMenu(tower){
  const modal = document.getElementById('hack-modal');
  if(!modal) return;
  hackMenuOpenFor = tower;
  modal.classList.remove('hidden');
  const body = document.getElementById('hack-modal-body');
  const grant = (label, apply) => '<button type="button" data-hack="' + label + '">' + label + '</button>';
  body.innerHTML =
    '<p class="hack-note">💰 ' + Math.floor(gold) + ' &nbsp; 🪵 ' + Math.floor(wood) + ' &nbsp; 🪨 ' + Math.floor(stone) + '</p>' +
    '<h3>Gold</h3><div class="hack-row">' + ['+💰100','+💰1,000','+💰10,000','+💰100,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Wood</h3><div class="hack-row">' + ['+🪵100','+🪵1,000','+🪵10,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Stone</h3><div class="hack-row">' + ['+🪨100','+🪨1,000','+🪨10,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Stickmen</h3><div class="hack-row">' + ['Heal and revive all','+5 stat points to all','+25 stat points to all'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Field</h3><div class="hack-row">' + ['Defeat every enemy now','Expand the map now'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Rules</h3><div class="hack-row"><button type="button" data-hack="god" class="' + (hackGodMode ? 'on' : '') + '">Stickmen invulnerable: ' + (hackGodMode ? 'ON' : 'off') + '</button>' +
    '<button type="button" data-hack="free" class="' + (hackFreeBuild ? 'on' : '') + '">Free building: ' + (hackFreeBuild ? 'ON' : 'off') + '</button></div>' +
    '<p class="hack-note">Hacks are for testing and play-around. They are not saved and mark the debug log.</p>';
}
function closeHackMenu(){
  const modal = document.getElementById('hack-modal');
  if(modal) modal.classList.add('hidden');
  hackMenuOpenFor = null;
}
function runHackAction(action){
  hacksUsed = true;
  switch(action){
    case '+💰100': gold += 100; break;
    case '+💰1,000': gold += 1000; break;
    case '+💰10,000': gold += 10000; break;
    case '+💰100,000': gold += 100000; break;
    case '+🪵100': wood += 100; break;
    case '+🪵1,000': wood += 1000; break;
    case '+🪵10,000': wood += 10000; break;
    case '+🪨100': stone += 100; break;
    case '+🪨1,000': stone += 1000; break;
    case '+🪨10,000': stone += 10000; break;
    case 'Expand the map now':
      if(!regionFullyExpanded()){ gold += expansionCost(); expandRegion(); }
      break;
    case 'Heal and revive all':
      for(const t of towerPool){ if(!t.active || t.type === 'BARRICADE') continue; t.hp = t.maxHp; t.disabledUntil = 0; t.disabledWavesLeft = 0; }
      break;
    case '+5 stat points to all':
    case '+25 stat points to all': {
      const points = action === '+5 stat points to all' ? 5 : 25;
      for(const t of towerPool){ if(t.active && isFighterTower(t) && t.type !== 'HACKER') t.statPoints = (t.statPoints || 0) + points; }
      break;
    }
    case 'Defeat every enemy now':
      for(const enemy of enemyPool){
        for(let pass = 0; pass < 4 && enemy.active && !enemy.deathResolved; pass++) enemy.applyDamage((enemy.maxHp + (enemy.shieldHp || 0)) * 3 + 100, null, false, false, false, false, true);
      }
      break;
    case 'god': hackGodMode = !hackGodMode; break;
    case 'free': hackFreeBuild = !hackFreeBuild; break;
  }
  playSound('click');
  updateHUD();
  if(hackMenuOpenFor) openHackMenu(hackMenuOpenFor);
}
document.getElementById('hack-modal-body').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-hack]');
  if(button) runHackAction(button.dataset.hack);
});
document.getElementById('hackModalClose').addEventListener('click', () => {
  selectedTower = null; cancelCameraFollow(); closeHackMenu(); updateInspectPanel();
});
const buildHelpPopup = document.getElementById('build-help-popup');
function openBuildHelp(row){
  const textSource = row.querySelector('.build-row-blurb, .build-row-lock');
  document.getElementById('buildHelpIcon').textContent = row.querySelector('.icon') ? row.querySelector('.icon').textContent : '';
  document.getElementById('buildHelpTitle').textContent = row.querySelector('.name').textContent.split(' (')[0].trim();
  document.getElementById('buildHelpText').textContent = textSource ? textSource.textContent.replace(/^🔒\s*/, '') : '';
  buildHelpPopup.hidden = false;
  playSound('click');
}
function closeBuildHelp(){ buildHelpPopup.hidden = true; }
document.getElementById('tower-modal-grid').addEventListener('pointerdown', (e) => {
  const helpButton = e.target.closest('.help-btn');
  if(!helpButton) return;
  e.stopPropagation(); e.preventDefault();
  openBuildHelp(helpButton.closest('.build-row'));
}, true);
buildHelpPopup.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(e.target === buildHelpPopup) closeBuildHelp(); });
document.getElementById('buildHelpClose').addEventListener('pointerdown', (e) => { e.stopPropagation(); closeBuildHelp(); });
function closeTowerModal(){
  closeBuildHelp();
  towerModalEl.classList.add('hidden');
  playSound('ui_close');
}
function requireShopAccess(){
  if(gameState!=='PLAYING' && gameState!=='PAUSED')return false;
  if(merchantShopOpen())return true;
  document.getElementById('shop-modal').classList.add('hidden');
  showToast('🔒 Shop needs a living Merchant or a caravan on the road');playSound('ui_deny');
  return false;
}
function shopTowerIsCurrent(tower){
  return !!(tower && tower.active && selectedTower===tower);
}
function openShopModal(){
  if(!requireShopAccess())return false;
  buildShopGrid();
  document.getElementById('shop-modal').classList.remove('hidden');
  playSound('ui_open');
  trackGameEvent('shop_opened', { gold });
  return true;
}
function closeShopModal(){
  document.getElementById('shop-modal').classList.add('hidden');
  playSound('ui_close');
}
function buildShopGrid(){
  const grid = document.getElementById('shop-grid');
  const note = document.getElementById('shop-selected-note');
  grid.innerHTML = '';

  // CA765 — see HISTORY.md § [1.5.7] Code Archaeology, CA765
  const shopTower=selectedTower;
  const towerSelected = !!(shopTower && shopTower.active);
  note.innerHTML = (towerSelected
    ? 'Buying for your selected ' + selectedTower.def.name + '.'
    : 'Select any tower on the map to buy or manage its items.') +
    ' &nbsp; 🪵' + wood + ' &nbsp; 🪨' + stone;

  if(towerSelected && selectedTower.equippedItems.length){
    selectedTower.equippedItems.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'shop-equipped-row';
      row.style.gridColumn = '1/-1';
      row.innerHTML = '<span>' + it.icon + ' ' + it.name + (itemStatSummary(it) ? ' <small>' + itemStatSummary(it) + '</small>' : '') + '</span>';
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Sell · 💰' + itemSellValue(it);
      removeBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if(!requireShopAccess())return;
        if(!shopTowerIsCurrent(shopTower) || shopTower.equippedItems[idx]!==it){buildShopGrid();return;}
        if(shopTower.unequipItem(idx)){ playSound('click'); updateHUD(); updateInspectPanel(); buildShopGrid(); }
      });
      row.appendChild(removeBtn);
      grid.appendChild(row);
    });
  }

  for(const def of UNIVERSAL_ITEMS.filter(d => !d.isBarricade)){ // Barricade is bought from Build now, not Shop — see buildTowerModal()'s existing wood/stone/free-charge logic
    const alreadyOwned = towerSelected && selectedTower.equippedItems.some(i => i.id === def.id);
    const full = towerSelected && selectedTower.equippedItems.length >= MAX_ITEM_SLOTS;
    const useFreeCharge = def.isBarricade && freeBarricadesLeft > 0;
    const hasGold = gold >= def.cost;
    const hasWood = useFreeCharge || !def.woodCost || wood >= def.woodCost;
    const hasStone = useFreeCharge || !def.stoneCost || stone >= def.stoneCost;
    const canBuy = towerSelected && !full && hasGold && hasWood && hasStone;
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (canBuy ? '' : ' disabled') + (alreadyOwned ? ' owned' : '');
    let costLine = useFreeCharge ? '🎁 FREE!' : '💰' + def.cost;
    if(!useFreeCharge){
      if(def.woodCost) costLine += ' 🪵' + def.woodCost;
      if(def.stoneCost) costLine += ' 🪨' + def.stoneCost;
    }
    card.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name + '</div>' +
      '<div class="stat-line">' + itemStatLine(def) + '</div>' +
      '<div class="cost">' + costLine + '</div>';
    if(canBuy){
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if(!requireShopAccess())return;
        if(!shopTowerIsCurrent(shopTower)){buildShopGrid();return;}
        if(shopTower.buyItem(def)){
          playSound('click');
          updateHUD();
          updateInspectPanel();
          buildShopGrid();
        }
      });
    }
    grid.appendChild(card);
  }

  const medicalDivider = document.createElement('div');
  medicalDivider.className = 'shop-section-divider';
  medicalDivider.style.gridColumn = '1/-1';
  medicalDivider.textContent = '🩹 Medical Supplies — used from your inventory, never equipped to a tower';
  grid.appendChild(medicalDivider);
  for(const def of MEDICAL_ITEMS){
    const alreadyHeld = def.isRevive && hasDefibrillator;
    const canBuy = !alreadyHeld && gold >= def.cost;
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (canBuy ? '' : ' disabled') + (alreadyHeld ? ' owned' : '');
    const desc = def.isRevive ? 'Auto-revives once at 25% lives' : def.healFraction ? 'Restores 50% of missing lives' : 'Restores ' + def.healLives + ' lives';
    card.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name + (alreadyHeld ? ' (held)' : '') + '</div>' +
      '<div class="stat-line">' + desc + '</div>' +
      '<div class="cost">💰' + def.cost + '</div>';
    if(canBuy){
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if(!requireShopAccess())return;
        if(buyMedicalItem(def)){ updateHUD(); buildShopGrid(); }
      });
    }
    grid.appendChild(card);
  }

  const potionDivider = document.createElement('div');
  potionDivider.className = 'shop-section-divider';
  potionDivider.style.gridColumn = '1/-1';
  potionDivider.textContent = '🧪 Potions, Tonics and Revival — potions go into the selected stickman\u2019s pack; Revive brings a downed stickman back';
  grid.appendChild(potionDivider);
  const packHasRoom = towerSelected && isFighterTower(selectedTower) && selectedTower.type !== 'HACKER' && selectedTower.equippedItems.length < MAX_ITEM_SLOTS;
  for(const def of merchantPotionDefs()){
    const price = MERCHANT_POTION_PRICES[def.id], canBuy = packHasRoom && gold >= price;
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (canBuy ? '' : ' disabled');
    card.innerHTML = '<div class="icon">' + def.icon + '</div><div class="name">' + def.name + '</div><div class="stat-line">' + (towerSelected ? (packHasRoom ? 'For your selected stickman' : 'Pack full') : 'Select a stickman first') + '</div><div class="cost">💰' + price + '</div>';
    if(canBuy) card.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(buyMerchantPotion(def)){ updateHUD(); updateInspectPanel(); buildShopGrid(); } });
    grid.appendChild(card);
  }
  {
    const canRevive = canReviveSelectedStickman() && gold >= REVIVE_STICKMAN_COST;
    const reviveCard = document.createElement('div');
    reviveCard.className = 'shop-item-card' + (canRevive ? '' : ' disabled');
    reviveCard.innerHTML = '<div class="icon">✨</div><div class="name">Revive</div><div class="stat-line">' + (canReviveSelectedStickman() ? 'Brings your selected stickman back at ' + Math.round(REVIVE_STICKMAN_HP_FRACTION*100) + '% health' : 'Select a downed stickman') + '</div><div class="cost">💰' + REVIVE_STICKMAN_COST + '</div>';
    if(canRevive) reviveCard.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(reviveSelectedStickman()){ updateHUD(); updateInspectPanel(); buildShopGrid(); } });
    grid.appendChild(reviveCard);
  }

  const passiveDivider = document.createElement('div');
  passiveDivider.className = 'shop-section-divider';
  passiveDivider.style.gridColumn = '1/-1';
  passiveDivider.textContent = '✨ Passive Bonuses — applies permanently to every tower you own, current and future';
  grid.appendChild(passiveDivider);

  for(const def of PASSIVE_UPGRADES){
    const cost = passiveCost(def);
    const count = globalPassiveCounts[def.id] || 0;
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (gold < cost ? ' disabled' : '');
    card.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name + '</div>' +
      '<div class="stat-line">+1 ' + def.stat.toUpperCase() + ' (all) · owned x' + count + '</div>' +
      '<div class="cost">💰' + cost + '</div>';
    card.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if(!requireShopAccess())return;
      if(buyPassive(def.id)) buildShopGrid();
    });
    grid.appendChild(card);
  }

  // GOLD-SINKS-01 (1.7.49)
  const addDivider = text => { const divider = document.createElement('div'); divider.className = 'shop-section-divider'; divider.style.gridColumn = '1/-1'; divider.textContent = text; grid.appendChild(divider); };
  const addCard = (icon, name, line, cost, enabled, onBuy, owned) => {
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (enabled ? '' : ' disabled') + (owned ? ' owned' : '');
    card.innerHTML = '<div class="icon">' + icon + '</div><div class="name">' + name + '</div><div class="stat-line">' + line + '</div><div class="cost">💰' + cost + '</div>';
    if(enabled) card.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(onBuy()) buildShopGrid(); });
    grid.appendChild(card);
  };
  const stickmanReady = towerSelected && isFighterTower(selectedTower) && selectedTower.type !== 'HACKER';
  addDivider('🧺 Market — rations eaten at once by the selected stickman; each one bought makes the next cost more');
  for(const ration of RATIONS) addCard(ration.icon, ration.name, '+' + RATION_STAT_GAIN + ' ' + ration.stat.toUpperCase() + ' · bought x' + (marketBought[ration.stat] || 0), rationCost(ration.stat), stickmanReady && gold >= rationCost(ration.stat), () => buyRation(ration.stat));
  addDivider('🏋️ Training Yard — experience for the selected stickman');
  addCard('🎯', 'Drill', '+' + (foodFruitXp()*DRILL_XP_MULTIPLIER) + ' XP · drilled x' + drillsBought, drillCost(), stickmanReady && gold >= drillCost(), () => buyDrill());
  if(caravanShopAvailable()){
    const sellFragment = document.createDocumentFragment();
    const sellDivider = document.createElement('div'); sellDivider.className = 'shop-section-divider'; sellDivider.style.gridColumn = '1/-1';
    sellDivider.textContent = '🐴 Caravan Rare Shop — sell him wood (💰' + WOOD_SELL_GOLD + ' each) and stone (💰' + STONE_SELL_GOLD + ' each) while he is on the road';
    sellFragment.appendChild(sellDivider);
    for(const [resource, icon, rate, held] of [['wood', '🪵', WOOD_SELL_GOLD, wood], ['stone', '🪨', STONE_SELL_GOLD, stone]]){
      for(const [label, amount] of [['Sell 10', 10], ['Sell 100', 100], ['Sell all', held]]){
        const sellCount = Math.min(amount, held), card = document.createElement('div');
        card.dataset.caravanSell = resource;
        card.className = 'shop-item-card' + (sellCount > 0 ? '' : ' disabled');
        card.innerHTML = '<div class="icon">' + icon + '</div><div class="name">' + label + ' ' + resource + '</div><div class="stat-line">' + sellCount + ' × 💰' + rate + ' · you hold ' + held + '</div><div class="cost">💰+' + sellCount*rate + '</div>';
        if(sellCount > 0) card.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(sellToCaravan(resource, amount)) buildShopGrid(); });
        sellFragment.appendChild(card);
      }
    }
    grid.insertBefore(sellFragment, grid.firstChild);
  }
  addDivider('🧳 Travelling Merchant — new gear every wave, bought for the selected stickman');
  if(merchantBoughtWave !== waveIndex){ merchantBoughtWave = waveIndex; merchantBoughtIds = new Set(); }
  merchantStock().forEach((offer, index) => {
    const sold = merchantBoughtIds.has(index), full = towerSelected && selectedTower.equippedItems.length >= MAX_ITEM_SLOTS;
    addCard(offer.def.icon, offer.def.name + (sold ? ' (sold)' : ''), (ITEM_RARITIES[offer.def.rarity] ? ITEM_RARITIES[offer.def.rarity].label + ' · ' : '') + itemStatLine(offer.def), offer.cost, towerSelected && !sold && !full && gold >= offer.cost, () => buyMerchantItem(index), sold);
  });
}
document.getElementById('buildBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  if(gameState !== 'PLAYING') return;
  if(moveModeTower) exitMoveMode();
  openTowerModal();
});
document.getElementById('towerModalClose').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  closeTowerModal();
});
document.getElementById('tower-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'tower-modal') closeTowerModal();
});
document.getElementById('shopBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  if(gameState !== 'PLAYING') return;
  if(moveModeTower) exitMoveMode();
  openShopModal();
});
document.getElementById('shopModalClose').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  closeShopModal();
});
document.getElementById('shop-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'shop-modal') closeShopModal();
});
let pendingSlotPress = null;
const SLOT_DRAG_THRESHOLD_PX = 8;
function beginSlotItemDrag(sourceTower, idx, e, expectedItem){
  if(!sourceTower.active || !['PLAYING','PAUSED'].includes(gameState)) return;
  const item = sourceTower.equippedItems[idx];
  if(!item || item!==expectedItem) return;
  sourceTower.equippedItems.splice(idx, 1);
  itemLogReleased(item, 'on the ground (dragged out of ' + itemHolderLabel(sourceTower) + ')');
  refreshQuickUse(sourceTower);
  sourceTower.recomputeStats();
  updateInspectPanel();
  const groundItem = spawnGroundItem(sourceTower.x, sourceTower.y, item);
  draggingGroundItem = groundItem;
  dragItemPos = { x: sourceTower.x, y: sourceTower.y };
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  dragPointerId = e.pointerId;
  dragStartClient = { x: e.clientX, y: e.clientY };
  isDragging = true;
  canvas.setPointerCapture(e.pointerId);
  if(gameState==='PAUSED') requestPausedRender();
}
document.querySelectorAll('.item-slot, .quick-slot').forEach(slot => {
  slot.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if(!selectedTower || !selectedTower.active) return;
    const idx = +slot.dataset.slot;
    if(!selectedTower.equippedItems[idx]){
      openShopModal();
      return;
    }
    pendingSlotPress = { idx, item:selectedTower.equippedItems[idx], tower: selectedTower, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
  });
});
window.addEventListener('pointermove', (e) => {
  const press = pendingSlotPress;
  if(!press || e.pointerId !== press.pointerId) return;
  if(Math.hypot(e.clientX - press.x, e.clientY - press.y) < SLOT_DRAG_THRESHOLD_PX) return;
  pendingSlotPress = null;
  beginSlotItemDrag(press.tower, press.idx, e, press.item);
});
window.addEventListener('pointerup', (e) => {
  const press = pendingSlotPress;
  if(!press || e.pointerId !== press.pointerId) return;
  pendingSlotPress = null;
  if((gameState === 'PLAYING' || gameState === 'PAUSED') && press.tower.active && press.tower.equippedItems[press.idx]===press.item) activateInventorySlot(press.tower, press.idx);
});
function cancelPointerGesture(){
  const hadItemDrag=!!draggingGroundItem;
  const pointerIds=Array.from(activePointers.keys());
  activePointers.clear();collectedPickupPointers.clear();
  pendingSlotPress=null;draggingGroundItem=null;
  dragPointerId=null;dragStartClient=null;isDragging=false;pinchStartDist=null;
  stopPanInertia();
  for(const id of pointerIds){
    if(canvas.hasPointerCapture(id)){
      try{canvas.releasePointerCapture(id);}catch(error){}
    }
  }
  if(gameState==='PAUSED' || hadItemDrag)requestPausedRender();
}
window.addEventListener('pointercancel', () => { pendingSlotPress = null; });
window.addEventListener('blur',cancelPointerGesture);
canvas.addEventListener('lostpointercapture',e=>{if(activePointers.has(e.pointerId))cancelPointerGesture();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPointerGesture();});
document.addEventListener('keydown', (e) => {
  if(e.key==='Escape') placingCampfire=false;
  if(gameState !== 'PLAYING' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(document.querySelector('dialog[open]') || document.activeElement?.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement?.tagName) || document.activeElement?.closest?.('[role="button"]')) return;
  if(e.key < '1' || e.key > '6' || e.key.length !== 1) return;
  if(!selectedTower || !selectedTower.active) return;
  activateInventorySlot(selectedTower, +e.key - 1);
});
document.getElementById('statsInfoBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('help-modal').classList.remove('hidden');
  playSound('ui_open');
});
document.getElementById('item-guide-modal-close').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  closeItemGuide();
});
document.getElementById('help-modal-close').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('help-modal').classList.add('hidden');
  playSound('ui_close');
});
document.getElementById('help-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'help-modal'){ document.getElementById('help-modal').classList.add('hidden'); playSound('ui_close'); } // tap outside the card to dismiss
});
document.getElementById('barricadeInfoBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('barricade-help-modal').classList.remove('hidden');
  playSound('ui_open');
});
document.getElementById('barricade-help-modal-close').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('barricade-help-modal').classList.add('hidden');
  playSound('ui_close');
});
document.getElementById('barricade-help-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'barricade-help-modal'){ document.getElementById('barricade-help-modal').classList.add('hidden'); playSound('ui_close'); }
});
// CA768 — see HISTORY.md § [1.5.7] Code Archaeology, CA768
function renderTowerTelemetry(){
  const host = document.getElementById('towerTelemetry');
  host.replaceChildren();
  const towers = towerPool.filter(t => t.active && isFighterTower(t));
  if(!towers.length){
    const empty = document.createElement('p');
    empty.className = 'stats-hint';
    empty.textContent = 'No towers built yet.';
    host.appendChild(empty);
    return;
  }
  const columns = [
    { label:'Kills', value: t => t.killCount || 0 },
    { label:'Damage', value: t => Math.round(t.lifetimeDamage || 0) },
    { label:'XP', value: t => Math.round(t.lifetimeXp || 0) }
  ];
  const header = document.createElement('div');
  header.className = 'telemetry-row';
  for(const text of ['Tower', ...columns.map(c => c.label)]){
    const cell = document.createElement('div');
    cell.className = 'telemetry-head';
    cell.textContent = text;
    header.appendChild(cell);
  }
  host.appendChild(header);
  const maxima = columns.map(column => Math.max(1, ...towers.map(column.value)));
  for(const tower of towers.sort((a, b) => (b.killCount || 0) - (a.killCount || 0))){
    const row = document.createElement('div');
    row.className = 'telemetry-row';
    const name = document.createElement('div');
    name.className = 'telemetry-name';
    name.textContent = towerDisplayName(tower);
    row.appendChild(name);
    columns.forEach((column, i) => {
      const value = column.value(tower);
      const bar = document.createElement('div');
      bar.className = 'telemetry-bar';
      const fill = document.createElement('span');
      fill.style.width = Math.round(value / maxima[i] * 100) + '%';
      const text = document.createElement('b');
      text.textContent = value;
      bar.append(fill, text);
      row.appendChild(bar);
    });
    host.appendChild(row);
  }
}
function syncAudioVolumeControls(){
  const controls = [
    ['audioMasterVolume','audioMasterValue',audioMasterVolume],
    ['audioMusicVolume','audioMusicValue',audioMusicVolume],
    ['audioSfxVolume','audioSfxValue',audioSfxVolume]
  ];
  for(const [inputId, outputId, value] of controls){
    const input = document.getElementById(inputId), output = document.getElementById(outputId);
    if(input) input.value = String(Math.round(value * 100));
    if(output) output.textContent = Math.round(value * 100) + '%';
  }
}
function syncSettingsUI(){
  renderTowerTelemetry();
  syncAudioVolumeControls();
  document.getElementById('gfxHighRadio').checked = graphicsQuality === 'high';
  document.getElementById('gfxLowRadio').checked = graphicsQuality === 'low';
  document.getElementById('settingsMuteToggle').checked = isMuted;
  document.getElementById('settingsGoreToggle').checked = goreMode;
  document.getElementById('settingsBloodDropletsToggle').checked = bloodDropletsEnabled;
  document.getElementById('settingsHacksToggle').checked = hacksEnabled;
  document.getElementById('settingsZoomControlsToggle').checked = showZoomControls;
  document.getElementById('settingsFpsToggle').checked = showFpsCounter;
  document.getElementById('settingsDebugToggle').checked = debugOverlay;
  document.getElementById('settingsAutoPanToggle').checked = autoCameraPans;
    document.getElementById('settingsIntroTextToggle').checked = introTextEnabled;
  document.getElementById('settingsFrameCapToggle').checked = frameCapEnabled;
  document.getElementById('settingsFrameCapSlider').value = String(frameCapFps());
  document.getElementById('settingsFrameCapSlider').disabled = !frameCapEnabled;
  document.getElementById('settingsFrameCapValue').textContent = String(frameCapFps());
  document.getElementById('settingsScreenShakeToggle').checked = screenShakeEnabled;
  document.getElementById('settingsAutoRenderScaleToggle').checked = autoRenderScaleEnabled;
  document.getElementById('settingsRenderScaleFloor').value = String(graphicsQuality === 'high' ? 100 : renderScaleFloorPercent);
  document.getElementById('settingsRenderScaleFloor').disabled = graphicsQuality === 'high';
  document.getElementById('settingsRenderScale').value = String(Math.min(renderScaleStep,3));
  document.getElementById('settingsRenderScale').disabled = graphicsQuality === 'high';
}
// CA769 — see HISTORY.md § [1.5.7] Code Archaeology, CA769
document.getElementById('inspDpsBetween').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || isStructureType(selectedTower.type)) return;
  showDpsBreakdownModal(selectedTower);
  playSound('ui_open');
});
document.getElementById('settingsBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  syncSettingsUI();
  document.getElementById('settings-modal').classList.remove('hidden');
  playSound('ui_open');
});
document.getElementById('dpsBreakdownClose').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('dps-breakdown-modal').classList.add('hidden');
  playSound('ui_close');
});
document.getElementById('settingsModalClose').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.getElementById('settings-modal').classList.add('hidden');
  playSound('ui_close');
});
document.getElementById('settings-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'settings-modal'){ document.getElementById('settings-modal').classList.add('hidden'); playSound('ui_close'); }
});
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== target));
    if(target === 'items') renderItemCodex();
    if(target === 'changes') renderSettingsChangelog();
    playSound('click');
  });
});
document.getElementById('gfxHighRadio').addEventListener('change', () => {
  graphicsQuality = 'high'; syncAutoRenderScaleDefaultForGraphics(); setupCanvas(); applyQualityDefaultShake(); savePrefs();
  trackGameEvent('settings_changed', { setting: 'graphics_quality', setting_value: 'high' });
  document.querySelectorAll('.quality-btn').forEach(b => b.classList.toggle('selected', b.dataset.quality === 'high'));
});
document.getElementById('gfxLowRadio').addEventListener('change', () => {
  graphicsQuality = 'low'; syncAutoRenderScaleDefaultForGraphics(); setupCanvas(); applyQualityDefaultShake(); savePrefs();
  trackGameEvent('settings_changed', { setting: 'graphics_quality', setting_value: 'low' });
  document.querySelectorAll('.quality-btn').forEach(b => b.classList.toggle('selected', b.dataset.quality === 'low'));
});
function refreshAnalyticsConsentLabel(){
  const label = document.getElementById('analyticsConsentState');
  if(!label) return;
  const choice = window.analyticsConsentChoice || 'unset';
  label.textContent = choice === 'granted' ? 'Analytics are allowed. Change your choice any time.' : choice === 'denied' ? 'Analytics are declined and stay off.' : 'Analytics are off until you choose to allow them.';
}
window.refreshAnalyticsConsentLabel = refreshAnalyticsConsentLabel;
refreshAnalyticsConsentLabel();
document.getElementById('analyticsConsentBtn').addEventListener('click', () => {
  if(window.openStickTDAnalyticsChoice) window.openStickTDAnalyticsChoice();
});
document.getElementById('settingsMuteToggle').addEventListener('change', (e) => {
  isMuted = e.target.checked; savePrefs(); audioEngine.applyMix();
});
function bindAudioVolumeControl(inputId, outputId, kind){
  const input = document.getElementById(inputId), output = document.getElementById(outputId);
  input.addEventListener('input', () => {
    const value = clampNum(Number(input.value) / 100, 0, 1);
    if(kind === 'master') audioMasterVolume = value;
    else if(kind === 'music') audioMusicVolume = value;
    else audioSfxVolume = value;
    output.textContent = Math.round(value * 100) + '%';
    audioEngine.applyMix();
  });
  input.addEventListener('change', savePrefs);
}
bindAudioVolumeControl('audioMasterVolume','audioMasterValue','master');
bindAudioVolumeControl('audioMusicVolume','audioMusicValue','music');
bindAudioVolumeControl('audioSfxVolume','audioSfxValue','sfx');
document.getElementById('settingsHacksToggle').addEventListener('change', (e) => {
  hacksEnabled = e.target.checked; savePrefs();
  buildMenuSignature = null;
  if(!hacksEnabled) closeHackMenu();
});
document.getElementById('settingsBloodDropletsToggle').addEventListener('change', (e) => {
  bloodDropletsEnabled = e.target.checked;
  if(!bloodDropletsEnabled){ sprayDecals.length=0; sprayDecalIndex=0; for(const droplet of forensicDroplets) droplet.active = false; for(const particle of particles) if(particle.isBlood && !particle.isGib && !particle.isRing && !particle.isBeam) particle.active=false; if(attractState) for(const droplet of attractState.droplets) droplet.active = false; }
  savePrefs();requestPausedRedraw();
});
document.getElementById('settingsGoreToggle').addEventListener('change', (e) => {
  goreMode = e.target.checked; savePrefs();
  if(!goreMode){
    decals.length=0;decalIndex=0;sprayDecals.length=0;sprayDecalIndex=0;
    for(const droplet of forensicDroplets) droplet.active=false;
    for(const particle of particles) if(particle.isBlood || particle.isGib) particle.active=false;
    rebuildSettledDecalCanvas();
  }
  requestPausedRedraw();
  trackGameEvent('settings_changed', { setting: 'blood_effects', setting_value: goreMode ? 'on' : 'off' });
});
document.getElementById('settingsZoomControlsToggle').addEventListener('change', (e) => {
  showZoomControls = e.target.checked;
  document.getElementById('zoom-controls').classList.toggle('show', showZoomControls);
});
document.getElementById('settingsFpsToggle').addEventListener('change', (e) => {
  showFpsCounter = e.target.checked;
  savePrefs();
});
document.getElementById('settingsDebugToggle').addEventListener('change', (e) => {
  debugOverlay = e.target.checked;
  savePrefs();
});
document.getElementById('settingsAutoPanToggle').addEventListener('change', (e) => {
  autoCameraPans = e.target.checked;
  savePrefs();
});
document.getElementById('settingsIntroTextToggle').addEventListener('change', (e) => {
  introTextEnabled = e.target.checked;
  savePrefs();
  trackGameEvent('settings_changed', { setting: 'intro_text', setting_value: e.target.checked });
});
document.getElementById('startSettingsBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  syncSettingsUI();
  document.getElementById('settings-modal').classList.remove('hidden');
  playSound('ui_open');
});
document.getElementById('startChangesBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  playSound('ui_open');
  openChangesNotice();
});
document.getElementById('updateModalOk').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  closeChangesNotice();
  playSound('ui_close');
});
document.getElementById('update-modal').addEventListener('pointerdown', (e) => {
  if(e.target.id === 'update-modal'){ closeChangesNotice(); playSound('ui_close'); }
});
document.getElementById('settingsFrameCapToggle').addEventListener('change', (e) => {
  frameCapEnabled = e.target.checked;
  frameCapNextAt = 0;
  syncSettingsUI();
  savePrefs();
  trackGameEvent('settings_changed', { setting: 'frame_cap', setting_value: frameCapEnabled ? String(frameCapFps()) : 'off' });
});
document.getElementById('settingsFrameCapSlider').addEventListener('input', (e) => {
  frameCapFpsUser = clampNum(parseInt(e.target.value, 10) || FRAME_CAP_MIN_FPS, FRAME_CAP_MIN_FPS, FRAME_CAP_MAX_FPS);
  frameCapNextAt = 0;
  document.getElementById('settingsFrameCapValue').textContent = String(frameCapFps());
  savePrefs();
});
document.getElementById('settingsScreenShakeToggle').addEventListener('change', (e) => {
  screenShakeEnabled = e.target.checked;
  screenShakeUserSet = true;
  savePrefs();
});
document.getElementById('settingsAutoRenderScaleToggle').addEventListener('change', (e) => {
  setAutoRenderScale(e.target.checked);
  trackGameEvent('settings_changed', { setting: 'auto_render_scale', setting_value: e.target.checked ? 'on' : 'off' });
});
document.getElementById('settingsRenderScaleResetBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  governorWindowMs = 0; governorWindowFrames = 0; governorFastMs = 0; governorCooldownMs = GOVERNOR_DOWN_COOLDOWN_MS;
  applyRenderScaleStep(0, 'restored to full resolution by the player');
  playSound('click');
});
function clampRenderScaleToFloor(reason){
  if(renderScaleStep > renderScaleMaxStep()) applyRenderScaleStep(renderScaleMaxStep(), reason);
}
document.getElementById('settingsRenderScale').addEventListener('change', e => {
  const step = graphicsQuality === 'high' ? 0 : clampNum(parseInt(e.target.value,10)||0,0,3);
  autoRenderScaleEnabled=false; autoRenderScaleUserSet=true;
  if(graphicsQuality === 'low' && RENDER_SCALE_STEPS[step]*100 < renderScaleFloorPercent){
    renderScaleFloorPercent = step === 3 ? 50 : 75; renderScaleFloorUserSet=true;
  }
  applyRenderScaleStep(step,'manual render scale');
  savePrefs(); syncSettingsUI();
});
document.getElementById('settingsRenderScaleFloor').addEventListener('change', (e) => {
  renderScaleFloorPercent = graphicsQuality === 'high' ? 100 : parseInt(e.target.value, 10);
  e.target.value = String(renderScaleFloorPercent);
  renderScaleFloorUserSet = true;
  clampRenderScaleToFloor('lowest render resolution raised to ' + renderScaleFloorPercent + '%');
  savePrefs();
  trackGameEvent('settings_changed', { setting: 'render_scale_floor', setting_value: String(renderScaleFloorPercent) });
});
function applyQualityDefaultShake(){
  if(!renderScaleFloorUserSet){
    renderScaleFloorPercent = defaultRenderScaleFloorPercent();
    clampRenderScaleToFloor('graphics profile default floor ' + renderScaleFloorPercent + '%');
  }
  if(!screenShakeUserSet) screenShakeEnabled = graphicsQuality === 'high' && !PREFERS_REDUCED_MOTION;
  syncSettingsUI();
}
function syncAutoRenderScaleDefaultForGraphics(){
  if(!autoRenderScaleUserSet) autoRenderScaleEnabled = graphicsQuality === 'low';
}
document.getElementById('downloadSaveBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  downloadSaveFile();
});
document.getElementById('loadSaveInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => loadSaveFileText(reader.result);
  reader.readAsText(file);
  e.target.value = ''; // allow re-selecting the same file later
});
// RESET-OPTIONS-01 (1.6.69) — see HISTORY.md § [1.6.69]
const STICKTD_STORAGE_PREFIXES = ['stickTD_', 'sticktd:'];
const RESET_CONFIRM_MESSAGES = {
  unlocks: 'This removes every tower you have unlocked and restarts your run, so you must earn them all again. A save file you load later brings its own unlocks back. Continue?',
  everything: 'This removes cookies, unlocks and settings and restarts your run. You will see Santa’s cookie notice and applicable first-time tips again. Continue?'
};
function removeStoredKeysByPrefix(prefixes){
  try{
    const matchingKeys = [];
    for(let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if(key && prefixes.some(prefix => key.startsWith(prefix))) matchingKeys.push(key);
    }
    for(const key of matchingKeys) localStorage.removeItem(key);
  }catch(err){ /* storage unavailable — nothing persisted, so nothing to clear */ }
}
function expireReadableCookies(){
  const host = location.hostname;
  const domainVariants = ['', '; domain=' + host, '; domain=.' + host];
  for(const pair of document.cookie.split(';')){
    const name = pair.split('=')[0].trim();
    if(!name) continue;
    for(const domain of domainVariants){
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domain;
    }
  }
}
function clearUnlocksAndRestart(){
  trackGameEvent('progress_reset', { kind: 'unlocks' });
  try{ localStorage.removeItem(PERMANENT_UNLOCKS_KEY); }catch(err){ /* storage unavailable — nothing to clear */ }
  location.reload();
}
function clearAllProgressAndRestart(){
  trackGameEvent('progress_reset', { kind: 'everything' });
  removeStoredKeysByPrefix(STICKTD_STORAGE_PREFIXES);
  try{ sessionStorage.clear(); }catch(err){ /* storage unavailable — nothing to clear */ }
  expireReadableCookies();
  location.reload();
}
const RESET_ACTION_HANDLERS = { unlocks: clearUnlocksAndRestart, everything: clearAllProgressAndRestart };
function setResetConfirmationVisible(isVisible, action){
  const confirmText = document.getElementById('resetConfirmText');
  const confirmBtn = document.getElementById('resetConfirmBtn');
  confirmText.hidden = !isVisible;
  confirmBtn.hidden = !isVisible;
  document.getElementById('resetCancelBtn').hidden = !isVisible;
  if(isVisible){
    confirmText.textContent = RESET_CONFIRM_MESSAGES[action];
    confirmBtn.dataset.resetAction = action;
  } else {
    delete confirmBtn.dataset.resetAction;
  }
}
for(const resetBtnId of ['clearUnlocksBtn', 'clearAllDataBtn']){
  document.getElementById(resetBtnId).addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    setResetConfirmationVisible(true, e.currentTarget.dataset.resetAction);
    playSound('click');
  });
}
document.getElementById('replayFirstTimeTipsBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  seenTutorialTips = new Set();
  try{ localStorage.removeItem(SEEN_TIPS_KEY); }catch(err){ /* storage unavailable: tips were never remembered */ }
  showToast('First-time tips will appear again.');
  playSound('click');
});
document.getElementById('resetCancelBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  setResetConfirmationVisible(false);
  playSound('click');
});
document.getElementById('resetConfirmBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const handler = RESET_ACTION_HANDLERS[e.currentTarget.dataset.resetAction];
  if(handler) handler();
});
function getReadmeText(){
  return 'STICK TOWER DEFENSE\n' +
'====================\n' +
'Version ' + GAME_VERSION + '\n\n' +
'By SauerNinja — github.com/SauerNinja\n\n' +
'A free browser tower defense game in development. Build a squad of stickmen, train their stats, ' +
'equip loot and extend the path. Fight through 100 waves, then continue into endless play.\n\n' +
'HOW TO PLAY\n' +
'-----------\n' +
'Tap Build, pick a tower, then tap a hedge tile to place it. Tap a placed tower to upgrade, ' +
'sell, move, buy it gear from the Shop, or change its targeting priority. The map starts tiny ' +
'(2x2 tiles) and extends both ends of its winding path — some expansions are free milestones, ' +
'others you buy with gold. You can buy one expansion per wave, during or between waves. The wave-end free expansion is lost if escaped enemies are still alive.\n\n' +
'TOWERS\n' +
'------\n' +
'Swordsman - melee cone sweep, the starting warrior.\n' +
'Archer - ranged bow attacks with a visible draw before firing.\n' +
'Axeman - dual-wields hand axes, manually toggles between a close swing and a ranged throw.\n' +
'Spearman - long melee reach, slow but hard-hitting.\n' +
'Lancer - a knight lance whose damage scales with enemy weight, up to 1.75x on the heaviest foes.\n' +
'Cleric - supports allies and directly smites undead for 5x damage, ignoring armor.\n' +
'Hammerman - stuns on hit, carries a shield and extra HP.\n' +
'Mage - slows enemies it hits.\n' +
'Bomber - splash damage against groups.\n' +
'Gatling - very fast, low damage per shot, shreds swarms.\n' +
'More classes unlock as stickmen train: Marksman, Sniper, Blowdart, Gatling, Cowboy, Glaive, Ninja, Paladin, Berserker, Necromancer, Pope, Cat Snapper, Merchant and more, plus Log Mill and Stone Quarry for wood and stone.\n' +
'Barricade - does not attack. Extremely tough, can be placed directly on the enemy path, and ' +
'holds back enemies while they chip its 10 HP, at most one point per 10 seconds across all attackers.\n\n' +
'MOVES\n' +
'-----\n' +
'Every stickman has its own free moves. You start with one; a stickman gains one on every promotion, every boss it kills, and each round for every pair of Running Shoes it carries.\n\n' +
'BLOOD\n' +
'-----\n' +
'Every hit throws flying droplets shaped by the weapon: a sniper makes a fine mist, a hammer a radial spatter, a blade a cast-off fan, an arrow a back-spatter and, through the body, an exit spray, a spell a blast cone. A wounded or bleeding enemy leaves a trail you can follow, with drops that stretch in the direction it walked. A stickman or enemy standing in a spray blocks it, leaving a clean void behind and wearing the stains itself.\n\n' +
'ENEMIES\n' +
'-------\n' +
'Every wave marches in strict size order: all Tiny enemies first, then Small, then Standard, and only on ' +
'every fifth wave the Large enemies and Bosses at the very end. The next group waits until everything ' +
'ahead of it has died or crossed the finish. Bigger always means slower, tougher, and worth more XP. ' +
'Each new enemy family gets a five-wave chapter; the 100-wave campaign continues as a seeded infinite ' +
'Expedition. Fire and Ice enemies can break off the path to 1v1 a tower, inflicting burn or a slow.\n\n' +
'TRAINING XP\n' +
'-----------\n' +
'The killing blow earns full XP (Tiny 17, Small 20, Standard 25, Large 40, Boss 50); every 100 XP rolls ' +
'2 x (1-3) stat points, capped at 500 per stat and 1000 total per stickman. At 500 total you can name ' +
'the unit; at 1000 it is fully trained, earns a trophy, and its XP share becomes gold (25 XP = 1 gold). ' +
'Promote grants automatic stat rolls and extra spendable points. The resulting stats improve combat; promotion adds no separate damage bonus. STR also increases stickman weight and rendered size; enemy weight follows body size (15px radius = 1.0).\n\n' +
'ELEMENTS\n' +
'--------\n' +
'At 100 in a stat a stickman attunes: STR=Fire (burn), DEX=Electric (shock), INT=Ice (chill). ' +
'Training TWO stats to 500 mixes an advanced element: Fire+Electric=Proton (melts), ' +
'Fire+Ice=Dark Matter (stuns), Electric+Ice=Quasar (blinds). Proton, Quasar and Dark Matter are ' +
'elements, not towers. Every attack carries your element — projectiles and melee swings take its ' +
'colour, and the proc chance rises with the attuned stat, from 8% up to 32% at 500.\n\n' +
'An Archer that trains 100 STR unlocks the Crazy Chef: a knife-thrower whose direct damage scales on DEX, ' +
'hurling five kitchen knives then restocking for ten seconds.\n\n' +
'Tap the DPS number on a selected unit to see exactly how its damage is calculated. Tap a stat to spend one, hold to keep spending. Towers that only helped split a small ' +
'assist share. Enemies that crossed the finish only pay a reduced cleanup share. FARM targeting chases ' +
'last hits, LAST picks the enemy furthest from the finish, ASSIST leaves last hits to others, UNCLAIMED avoids enemies already doomed by shots in flight.\n\n' +
'ITEMS AND HEROES\n' +
'----------------\n' +
'Every tower starts with a free class-specific item. Buy better gear per class from the Shop, plus ' +
'global passive upgrades that apply to every tower you own. A tower with all 6 inventory slots filled with equipment ' +
'awakens into a Hero, with a permanent stat bonus and a visible crown.\n\n' +
'RESOURCES\n' +
'---------\n' +
'Gold from kills and wave clears. Wood and stone from clearing scattered trees and rocks (and rare ' +
'treasure chests/relics) — spent on the priciest tier of shop gear alongside gold.\n\n' +
'SETTINGS\n' +
'--------\n' +
'Video (graphics quality and automatic render resolution), Audio (volume and mute), Game (blood-and-gore toggle, save/load), and About (this file).\n\n' +
'LICENSE\n' +
'-------\n' +
'MIT.\n';
}
// CA770 — see HISTORY.md § [1.5.7] Code Archaeology, CA770
function tickDistributionLine(){
  const hist = perfStats.ticksThisFrameHistory;
  if(!hist.length) return 'Tick distribution: no samples yet';
  const buckets = { '0': 0, '1': 0, '2': 0, '3+': 0 };
  for(const v of hist){
    if(v <= 0) buckets['0']++;
    else if(v === 1) buckets['1']++;
    else if(v === 2) buckets['2']++;
    else buckets['3+']++;
  }
  const pct = n => (n/hist.length*100).toFixed(0);
  return 'Tick distribution (last ' + hist.length + ' frames): 0 ticks ' + pct(buckets['0']) + '%,  1 tick ' +
    pct(buckets['1']) + '%,  2 ticks ' + pct(buckets['2']) + '%,  3+ ticks ' + pct(buckets['3+']) +
    '%  (at 1x, healthy play is overwhelmingly "1 tick" and a large "3+" slice is the spiral-of-death signature; at 2x and above several ticks per frame are expected, so judge them against the requested speed, not on their own)';
}
/* =========================================================
   DEBUG LOG
   ========================================================= */
function generateDebugLog(){
  const now = new Date();
  const nowReal = Date.now();
  // CA771 — see HISTORY.md § [1.5.7] Code Archaeology, CA771
  function formatAgo(ts){
    if(!ts) return 'never';
    const ms = nowReal - ts;
    const s = Math.floor(ms/1000);
    const m = Math.floor(s/60);
    const rel = m > 0 ? (m + 'm ' + (s%60) + 's ago') : (s + 's ago');
    return new Date(ts).toTimeString().slice(0,8) + '  (' + rel + ')';
  }
  const activeCount = pool => pool.filter(x => x.active).length;
  const ac = audioEngine;
  let s = '';
  s += 'STICKTD DEBUG LOG\n';
  s += '==================\n';
  s += 'Generated: ' + now.toISOString() + ' (' + now.toString() + ')\n';
  s += 'Game version: ' + GAME_VERSION + '\n\n';

  s += 'SESSION TIMING\n';
  s += '---------------\n';
  s += 'Session started: ' + new Date(sessionStartRealTime).toString() + '\n';
  const uptimeMs = nowReal - sessionStartRealTime;
  const uptimeMin = Math.floor(uptimeMs/60000), uptimeSec = Math.floor((uptimeMs%60000)/1000);
  s += 'Session uptime: ' + uptimeMin + 'm ' + uptimeSec + 's' +
    '  (a spike happening in the first minute vs. after a long session are different bugs — ' +
    'check this before assuming "it takes a while to show up")\n';
  const pausedNowMs = pauseStartedAtReal !== null ? nowReal - pauseStartedAtReal : 0;
  s += 'Time spent paused this session: ' + Math.round((totalPausedMs+pausedNowMs)/1000) + 's total' +
    (pauseStartedAtReal !== null ? ' (currently paused)' : '') + '\n';
  s += 'Worst frame happened at: ' + formatAgo(perfStats.worstFrameAtReal) + '\n';
  s += 'Worst wall-clock gap happened at: ' + formatAgo(perfStats.worstWallGapAtReal) + '\n';
  s += 'Tab hidden (backgrounded) ' + tabHiddenCount + ' time(s) this session, ' +
    Math.round((tabTotalHiddenMs + (tabLastHiddenAt > tabLastShownAt ? nowReal - tabLastHiddenAt : 0))/1000) + 's total' +
    (tabLastHiddenAt > tabLastShownAt ? ' (currently hidden)' : tabLastHiddenAt ? ', last hidden ' + formatAgo(tabLastHiddenAt) : '') +
    '  (a wall-clock gap lining up with one of these is a tab switch or compositor pause, not the game engine itself -- a gap that does NOT line up with one is worth investigating further)\n\n';

  s += 'PERFORMANCE (perfStats)\n';
  s += '------------------------\n';
  s += 'Frame: ' + perfStats.frameMs.toFixed(2) + 'ms  Update: ' + perfStats.updateMs.toFixed(2) +
    'ms  Render: ' + perfStats.renderMs.toFixed(2) + 'ms\n';
  s += 'Frame ms — median: ' + perfPercentile(perfStats.frameMsHistory,0.5).toFixed(2) +
    '  p95: ' + perfPercentile(perfStats.frameMsHistory,0.95).toFixed(2) +
    '  p99: ' + perfPercentile(perfStats.frameMsHistory,0.99).toFixed(2) +
    '  max: ' + perfPercentile(perfStats.frameMsHistory,1).toFixed(2) +
    '  (last ' + perfStats.frameMsHistory.length + ' frames — an average can look healthy while intermittent stalls hide inside it, this is what actually reveals them)\n';
  // CA772 — see HISTORY.md § [1.5.7] Code Archaeology, CA772
  const fpsFromMs = ms => ms > 0 ? (1000/ms) : 0;
  s += 'Rendered callback FPS — median: ' + fpsFromMs(perfPercentile(perfStats.wallGapMsHistory,0.5)).toFixed(0) +
    '  p5: ' + fpsFromMs(perfPercentile(perfStats.wallGapMsHistory,0.95)).toFixed(0) +
    '  p1: ' + fpsFromMs(perfPercentile(perfStats.wallGapMsHistory,0.99)).toFixed(0) +
    '  min: ' + fpsFromMs(perfPercentile(perfStats.wallGapMsHistory,1)).toFixed(0) + '\n';
  s += 'Update ms — median: ' + perfPercentile(perfStats.updateMsHistory,0.5).toFixed(2) +
    '  p99: ' + perfPercentile(perfStats.updateMsHistory,0.99).toFixed(2) +
    '  max: ' + perfPercentile(perfStats.updateMsHistory,1).toFixed(2) + '\n';
  s += 'Render ms — median: ' + perfPercentile(perfStats.renderMsHistory,0.5).toFixed(2) +
    '  p99: ' + perfPercentile(perfStats.renderMsHistory,0.99).toFixed(2) +
    '  max: ' + perfPercentile(perfStats.renderMsHistory,1).toFixed(2) + '\n';
  s += 'Wall-clock gap between frames — median: ' + perfPercentile(perfStats.wallGapMsHistory,0.5).toFixed(2) +
    '  p95: ' + perfPercentile(perfStats.wallGapMsHistory,0.95).toFixed(2) +
    '  p99: ' + perfPercentile(perfStats.wallGapMsHistory,0.99).toFixed(2) +
    '  max: ' + perfPercentile(perfStats.wallGapMsHistory,1).toFixed(2) +
    '  (real time since the PREVIOUS frame actually ran, unlike Frame ms above which only times ' +
    'this callback\'s own JS — a high number here with healthy Frame/Update/Render ms means the ' +
    'browser itself is delaying rAF, e.g. touch/compositor contention during a pan or pinch gesture, ' +
    'not the game\'s own code)\n';
  s += 'Worst wall-clock gap this session: ' + perfStats.worstWallGapMs.toFixed(2) + 'ms, at wave ' + perfStats.worstWallGapAtWave + '\n';
  s += 'Speed: asked ' + (perfStats.requestedSpeed || 1).toFixed(0) + 'x, actually simulated ' + (perfStats.achievedSpeed || 0).toFixed(2) + 'x over the last second; one tick costs ' + (perfStats.msPerTick || 0).toFixed(3) + ' ms (x' + perfStats.ticksThisFrame + ' this frame)\n';
  s += 'HUD flush (smoothed): ' + (perfStats.hudMs || 0).toFixed(3) + ' ms. Music scheduler: avg ' + ((audioEngine.debugCounters && audioEngine.debugCounters.musicSchedulerAvgMs) || 0).toFixed(3) + ' ms, worst ' + ((audioEngine.debugCounters && audioEngine.debugCounters.musicSchedulerWorstMs) || 0).toFixed(2) + ' ms (it runs outside the game frame, every 40 ms)\n';
  if(downingCaptures.length){
    s += '\nDOWNING CAPTURES (the 3 seconds before and after a stickman went down)\n----------------------\n';
    for(const capture of downingCaptures){
      s += capture.tower + ' downed in wave ' + capture.wave + (capture.cause ? ' by ' + capture.cause : '') + (capture.done ? '' : ' (still recording)') + '\n';
      s += '  3 s before: ' + summariseDiagFrames(capture.before) + '\n  3 s after:  ' + summariseDiagFrames(capture.after) + '\n';
    }
    s += '\n';
  }
  s += 'Ticks this frame: ' + perfStats.ticksThisFrame + '  (max ever seen: ' + perfStats.maxTicksSeen + ' / current speed-scaled cap ' + perfStats.lastSimulationTickCap + ', base ' + MAX_SIMULATION_TICKS_PER_FRAME + ' at 1x)\n';
  s += 'Adaptive detail: ' + (underHeavyVisualLoad ? 'active' : 'inactive') + ', ' + perfStats.adaptiveVisualFrames +
    ' rendered frame(s) active; world-drawing pressure ' + perfStats.depthSortPressureFrames + ' frame(s) above ' +
    HEAVY_VISUAL_LOAD_DEPTH_SORT_MS.toFixed(1) + 'ms (' + HEAVY_VISUAL_LOAD_HOLD_MS + ' ms real-time hold)\n';
  { const k = decalCategoryCounts(); s += 'Debris by drawing path: live blood ' + k.liveBlood + ' (drawn each frame), baked blood ' + k.bakedBlood + ' (settled layer), bones ' + k.bones + ', skulls ' + k.skulls + ', worms ' + k.worms + ', rubble ' + k.rubble + ' (depth sorted with the world)\n  ' + lastMinuteSummary() + '\n'; }
  s += 'Worst frame this session: ' + perfStats.worstFrameMs.toFixed(2) + 'ms, at wave ' + perfStats.worstFrameAtWave +
    ', ' + perfStats.worstFrameTicks + ' ticks that frame (separate from the rolling-window max above — ' +
    'this persists even after the spike scrolls out of the last ' + PERF_HISTORY_SIZE + '-frame window)\n';
  function appendHistoricalPerfEvents(title, events, metricName){
    s += '\n' + title + '\n' + '-'.repeat(title.length) + '\n';
    if(!events.length){ s += 'No events crossed the recording threshold during this session.\n'; return; }
    for(let i=0;i<events.length;i++){
      const e = events[i];
      s += '#' + (i+1) + '  ' + metricName + ' ' + e.durationMs.toFixed(2) + 'ms  ' + e.time +
        '  frame ' + e.frameMs.toFixed(2) + 'ms (update ' + e.updateMs.toFixed(2) + ', render ' + e.renderMs.toFixed(2) +
        ')  callback gap ' + e.wallGapMs.toFixed(2) + 'ms\n';
      s += '   state: wave ' + e.wave + ' ' + e.waveState + '/' + e.gameState + ', speed ' + e.gameSpeed +
        'x, ticks ' + e.ticks + '/' + e.tickCap + ', debt ' + e.accumulatorMs.toFixed(2) + 'ms, tab hidden ' + e.tabHidden +
        ', quality ' + e.quality + ', DPR ' + e.dpr + ', camera ' + e.cameraX.toFixed(1) + ',' + e.cameraY.toFixed(1) +
        ' zoom ' + e.zoom.toFixed(3) + ', camera moved ' + e.cameraMoving + ' (' + e.cameraMoveX.toFixed(2) + ',' +
        e.cameraMoveY.toFixed(2) + 'px; zoom Δ' + e.cameraZoomDelta.toFixed(4) + ')' +
        ', adaptive detail ' + e.adaptiveDetailActive + ' (' + e.adaptiveDetailHoldMs + ' ms of hold left), depth sort ' +
        e.depthSortMs.toFixed(2) + 'ms' + (e.depthSortPressure ? ' OVER budget' : '') + '\n';
      s += '   entities: enemies ' + e.visibleEnemies + '/' + e.activeEnemies + ', towers ' + e.visibleTowers + '/' +
        e.activeTowers + ', projectiles ' + e.activeProjectiles + ', particles ' + e.activeParticles + ', texts ' +
        e.activeTexts + ', death animations ' + e.deathAnimations + ', decals ' + e.visibleDecals + '/' + e.decals +
        ', scenery ' + e.scenery + ', ground items ' + e.groundItems + ', barricade scans/queue ' +
        e.barricadeScanned + '/' + e.barricadeQueued + ', hashes/queries ' + e.hashBuilds + '/' + e.spatialQueries +
        (e.usedHeapMB === null ? '' : ', heap ' + e.usedHeapMB.toFixed(1) + 'MB') + '\n';
      s += '   decal rebuilds: ' + e.decalRebuildCount + ', last ms ' + e.decalRebuildLastMs + '\n';
      s += '   recent deaths (last 5s, maximum 40): ' + JSON.stringify(e.recentDeaths) + '\n';
      s += '   audio: ' + e.audioState + ', effects/music sources ' + e.audioVoices + '/' + e.musicVoices + '\n';
      s += '   update phases ms: ' + Object.entries(e.updatePhases).map(([k,v]) => phaseLabel(k) + '=' + v.toFixed(3)).join(' ') + '\n';
      s += '   render phases ms: ' + Object.entries(e.renderPhases).map(([k,v]) => phaseLabel(k) + '=' + v.toFixed(3)).join(' ') + '\n';
    }
  }
  appendHistoricalPerfEvents('SESSION SLOW-FRAME SNAPSHOTS (top ' + PERF_EVENT_HISTORY_LIMIT + ', frame workload >=16.7ms)', perfStats.slowFrameEvents, 'frame');
  appendHistoricalPerfEvents('SESSION LONG-CALLBACK-GAP SNAPSHOTS (top ' + PERF_EVENT_HISTORY_LIMIT + ', callback gap >=33.3ms)', perfStats.longCallbackGapEvents, 'gap');
  s += '\nMAIN-THREAD LONG TASKS (50 ms or more, reported by the browser)\n';
  s += '--------------------------------------------------------------\n';
  if(typeof PerformanceObserver !== 'function' || !PerformanceObserver.supportedEntryTypes || !PerformanceObserver.supportedEntryTypes.includes('longtask')) s += 'This browser does not report long tasks.\n';
  else {
    const longestTasks = mainThreadLongTasks.slice().sort((a, b) => b.ms - a.ms).slice(0, 10);
    s += mainThreadLongTasks.length + ' retained (max ' + MAIN_THREAD_LONG_TASK_LIMIT + '), ' + mainThreadLongTasks.reduce((sum, task) => sum + task.ms, 0).toFixed(0) + ' ms in total. Compare these times with the callback-gap snapshots above: a long task at the same moment means something on the page blocked drawing; none means the browser or graphics card delayed the frame.\n';
    for(const task of longestTasks) s += '  ' + task.atIso + '  ' + task.ms.toFixed(0) + ' ms  ' + task.source + '\n';
  }
  s += '\nSIMULATION CATCH-UP AND TIME LOSS\n';
  s += '---------------------------------\n';
  s += 'Frame-time clamp: ' + perfStats.wallTimeClampHits + ' frame(s), ' + perfStats.wallTimeClampedMs.toFixed(2) +
    'ms of wall time excluded (100ms at 1x; 150ms during fast-forward; last ceiling ' + perfStats.lastFrameTimeClampMs + 'ms).\n';
  s += 'Simulation tick cap: ' + perfStats.simulationCatchUpCapHits + ' frame(s) reached the speed-scaled cap (last cap ' + perfStats.lastSimulationTickCap + ' ticks; base ' + MAX_SIMULATION_TICKS_PER_FRAME + ' at 1x); discarded simulation debt total ' +
    perfStats.simulationDebtDroppedMs.toFixed(2) + 'ms, last frame ' +
    perfStats.lastDroppedSimulationTimeMs.toFixed(2) + 'ms. Remaining accumulator debt is ' +
    perfStats.lastAccumulatorDebtMs.toFixed(2) + 'ms after any cap discard.\n';
  s += 'Retained cap-discard events: ' + perfStats.simulationCapEvents.length + '/' + SIMULATION_CAP_EVENT_LIMIT +
    ' largest observed discarded-debt frames.\n';
  for(let i=0;i<perfStats.simulationCapEvents.length;i++){
    const e = perfStats.simulationCapEvents[i];
    s += '#' + (i+1) + '  discarded ' + e.durationMs.toFixed(2) + ' simulation-ms at cap ' + e.tickCap + ' ticks  ' + e.time +
      '  wall gap ' + e.wallGapMs.toFixed(2) + 'ms (clamped ' + e.wallTimeClampedMs.toFixed(2) +
      ')  JS frame ' + e.frameMs.toFixed(2) + 'ms (update ' + e.updateMs.toFixed(2) + ', render ' + e.renderMs.toFixed(2) +
      ')  wave ' + e.wave + ' ' + e.waveState + '/' + e.gameState + ' speed ' + e.gameSpeed + 'x ticks ' + e.ticks + '\n';
    s += '   load: enemies ' + e.activeEnemies + ', towers ' + e.activeTowers + ', particles ' + e.activeParticles +
      ', decals ' + e.decals + ', hashes/queries ' + e.hashBuilds + '/' + e.spatialQueries + '\n';
    s += '   decal rebuilds: ' + e.decalRebuildCount + ', last ms ' + e.decalRebuildLastMs + '\n';
      s += '   recent deaths (last 5s, maximum 40): ' + JSON.stringify(e.recentDeaths) + '\n';
      s += '   audio: ' + e.audioState + ', effects/music sources ' + e.audioVoices + '/' + e.musicVoices + '\n';
      s += '   update phases ms: ' + Object.entries(e.updatePhases).map(([k,v]) => phaseLabel(k) + '=' + v.toFixed(3)).join(' ') + '\n';
    s += '   render phases ms: ' + Object.entries(e.renderPhases).map(([k,v]) => phaseLabel(k) + '=' + v.toFixed(3)).join(' ') + '\n';
  }
  s += '\nLONG-SESSION PERFORMANCE TREND (completed active-play minute windows)\n';
  s += '--------------------------------------------------------------------\n';
  s += 'Retained periods: ' + perfStats.sessionTrendSamples.length + '/' + SESSION_TREND_HISTORY_LIMIT +
    ' (one sample per 60 seconds of accumulated rendered callback time; periods while paused are not included in active callback time).\n';
  if(!perfStats.sessionTrendSamples.length){
    s += 'No complete 60-second active-play period has been recorded yet.\n';
  } else {
    for(let i=0;i<perfStats.sessionTrendSamples.length;i++){
      const e = perfStats.sessionTrendSamples[i];
      s += '#' + (i+1) + '  ' + e.startTime + ' to ' + e.endTime + '  callbacks ' + e.frames +
        '  sampled callback time ' + e.durationSeconds.toFixed(1) + 's  wall span ' + e.wallSpanSeconds.toFixed(1) +
        's  callback FPS ' + e.callbackFps.toFixed(1) + '  wave ' + e.startWave + '->' + e.endWave +
        '  speed avg/end ' + e.averageRequestedSpeed.toFixed(2) + '/' + e.endRequestedSpeed.toFixed(2) + 'x\n';
      s += '   frame avg/max ' + e.averageFrameMs.toFixed(2) + '/' + e.maxFrameMs.toFixed(2) +
        'ms  update avg/max ' + e.averageUpdateMs.toFixed(2) + '/' + e.maxUpdateMs.toFixed(2) +
        'ms  render avg/max ' + e.averageRenderMs.toFixed(2) + '/' + e.maxRenderMs.toFixed(2) +
        'ms  callback gap avg/max ' + e.averageCallbackGapMs.toFixed(2) + '/' + e.maxCallbackGapMs.toFixed(2) +
        'ms  slow frames/gaps ' + e.slowFrames + '/' + e.longGaps + '\n';
      s += '   adaptive detail ' + e.adaptiveDetailFrames + '/' + e.frames + ' frames (' + e.adaptiveDetailFramePercent.toFixed(1) + '%), world-drawing pressure frames ' + e.depthSortPressureFrames + '\n';
      s += '   camera moving ' + e.cameraMovingFrames + '/' + e.frames + ' frames (' + e.cameraMovingFramePercent.toFixed(1) + '%), slow while moving ' +
        e.cameraMovingSlowFrames + ', render avg moving/stationary ' + e.averageMovingRenderMs.toFixed(2) + '/' +
        e.averageStationaryRenderMs.toFixed(2) + 'ms, max pan ' + e.maxCameraMovePixels.toFixed(2) + 'px, max zoom Δ ' +
        e.maxCameraZoomDelta.toFixed(4) + '\n';
      s += '   render phases avg/max ms: ' + Object.keys(e.renderPhaseMaxMs).map(k => k + '=' +
        e.renderPhaseAverageMs[k].toFixed(2) + '/' + e.renderPhaseMaxMs[k].toFixed(2)).join(' ') + '\n';
      s += '   max ticks/debt ' + e.maxTicks + '/' + e.maxDebtMs.toFixed(2) +
        'ms  cap hits/dropped simulation ' + e.capHits + '/' + e.droppedSimulationMs.toFixed(2) +
        'ms  wall clamps/lost wall time ' + e.wallClampFrames + '/' + e.wallTimeClampedMs.toFixed(2) + 'ms\n';
      s += '   peak enemies active/visible ' + e.maxEnemies + '/' + e.maxVisibleEnemies +
        ', towers active/visible ' + e.maxTowers + '/' + e.maxVisibleTowers + ', particles/decals ' +
        e.maxParticles + '/' + e.maxDecals + ', spatial queries/hash builds ' + e.maxQueries + '/' + e.maxHashes + '\n';
      s += '   heap start/end/max ' + (e.heapStartMB === null ? 'n/a' : e.heapStartMB.toFixed(1) + '/' + e.heapEndMB.toFixed(1) + '/' + e.heapMaxMB.toFixed(1) + 'MB') + '\n';
    }
  }
  s += '\nBROWSER LONG TASKS (PerformanceObserver, tasks >=50ms)\n';
  s += '-------------------------------------------------------\n';
  s += 'Observer: ' + (perfStats.longTaskObserverActive ? 'active' : perfStats.longTaskObserverError ? 'unavailable (' + perfStats.longTaskObserverError + ')' : 'unsupported or unavailable') +
    '  total observed: ' + perfStats.longTaskCount + '  retained: ' + perfStats.longTaskEvents.length + '/' + LONG_TASK_HISTORY_LIMIT + '\n';
  if(!perfStats.longTaskEvents.length){
    s += 'No browser long tasks were observed during this session. This API is browser-dependent and does not report GPU/compositor work.\n';
  } else {
    s += 'These tasks ran on the main thread; observer timestamps are entry start times, while attribution details depend on browser support.\n';
    for(let i=0;i<perfStats.longTaskEvents.length;i++){
      const e = perfStats.longTaskEvents[i];
      s += '#' + (i+1) + '  ' + e.durationMs.toFixed(2) + 'ms  ' + e.time + '  start +' + e.startTimeMs.toFixed(2) + 'ms\n';
      if(e.attributions.length){
        s += '   attribution: ' + e.attributions.map(a => [a.name, a.containerType, a.containerName, a.containerId].filter(Boolean).join('/')).join('; ') + '\n';
      } else {
        s += '   attribution: unavailable\n';
      }
    }
  }
  s += '\nLONG ANIMATION FRAMES (PerformanceObserver, frames >=50ms)\n';
  s += '------------------------------------------------------------\n';
  s += 'Observer: ' + (perfStats.longAnimationFrameObserverActive ? 'active' : perfStats.longAnimationFrameObserverError ? 'unavailable (' + perfStats.longAnimationFrameObserverError + ')' : 'unsupported or unavailable') +
    '  total observed: ' + perfStats.longAnimationFrameCount + '  retained: ' + perfStats.longAnimationFrameEvents.length + '/' + LONG_ANIMATION_FRAME_HISTORY_LIMIT + '\n';
  if(!perfStats.longAnimationFrameEvents.length){
    s += 'No long animation frames were observed, or this browser does not support the API. When available, this reports main-thread rendering and script attribution, not GPU/compositor timing.\n';
  } else {
    for(let i=0;i<perfStats.longAnimationFrameEvents.length;i++){
      const e = perfStats.longAnimationFrameEvents[i];
      s += '#' + (i+1) + '  ' + e.durationMs.toFixed(2) + 'ms  ' + e.time + '  blocking ' + e.blockingDurationMs.toFixed(2) +
        'ms  render ' + e.renderDurationMs.toFixed(2) + 'ms  style/layout ' + e.styleAndLayoutMs.toFixed(2) +
        'ms  first UI event delay ' + e.firstUIEventDelayMs.toFixed(2) + 'ms\n';
      if(e.scripts.length){
        s += '   scripts: ' + e.scripts.map(a => [a.functionName, a.source, a.invoker].filter(Boolean).join(' @ ') +
          ' ' + a.durationMs.toFixed(2) + 'ms forced-style/layout ' + a.forcedStyleAndLayoutMs.toFixed(2) + 'ms').join('; ') + '\n';
      } else {
        s += '   scripts: unavailable or none attributed\n';
      }
    }
  }
  s += '\nSLOW INTERACTION EVENTS (Event Timing API)\n';
  s += '------------------------------------------\n';
  s += 'Observer: ' + (perfStats.interactionObserverActive ? 'active' : perfStats.interactionObserverError ? 'unavailable (' + perfStats.interactionObserverError + ')' : 'unsupported or unavailable') +
    '  observed entries: ' + perfStats.interactionEventCount + '  retained: ' + perfStats.interactionEvents.length + '/' + INTERACTION_HISTORY_LIMIT +
    '  (browser timing thresholds and event coverage vary)\n';
  if(!perfStats.interactionEvents.length){
    s += 'No qualifying event timing entries were observed during this session.\n';
  } else {
    for(let i=0;i<perfStats.interactionEvents.length;i++){
      const e = perfStats.interactionEvents[i];
      s += '#' + (i+1) + '  ' + e.name + ' ' + e.durationMs.toFixed(2) + 'ms  ' + e.time +
        '  input delay ' + e.inputDelayMs.toFixed(2) + 'ms  handler ' + e.processingMs.toFixed(2) +
        'ms  presentation wait ' + e.presentationDelayMs.toFixed(2) + 'ms  interaction ' + e.interactionId + '\n';
    }
  }
  s += '\nSESSION JAVASCRIPT / RESOURCE ERRORS\n';
  s += '------------------------------------\n';
  s += 'Total captured: ' + perfStats.runtimeErrorCount + '  retained: ' + perfStats.runtimeErrors.length + '/' + RUNTIME_ERROR_HISTORY_LIMIT + '\n';
  if(!perfStats.runtimeErrors.length){
    s += 'No JavaScript errors, unhandled promise rejections, or resource-load errors were captured.\n';
  } else {
    for(let i=0;i<perfStats.runtimeErrors.length;i++){
      const e = perfStats.runtimeErrors[i];
      s += '#' + (i+1) + '  ' + e.time + '  ' + e.type + '  ' + e.message +
        (e.source ? '  at ' + e.source + (e.line ? ':' + e.line + ':' + e.column : '') : '') + '\n';
      if(e.stack) s += '   ' + e.stack.replace(/\n/g, '\n   ') + '\n';
    }
  }
  s += tickDistributionLine() + '\n';
  s += 'Requested speed: ' + gameSpeed + 'x   Actual simulation speed (last ~1s window): ' + perfStats.lastMeasuredActualSpeed.toFixed(2) + 'x\n';
  s += 'Accumulator debt (leftover simulation time not yet caught up): ' + perfStats.lastAccumulatorDebtMs.toFixed(1) + 'ms\n';
  s += 'Barricade: ' + perfStats.barricadeActiveScanned + ' active enemies scanned, ' + perfStats.barricadeQueuedCount +
    ' currently queued (max ever seen: ' + perfStats.barricadeMaxQueueLenSeen + ' / cap ' + MAX_QUEUE_DEPTH + '), ' +
    perfStats.barricadeSnapCount + ' snap operations this tick\n';
  s += 'Scenery visible/total: ' + perfStats.visibleScenery + '/' + perfStats.totalScenery + '\n';
  s += 'Decals visible/total: ' + perfStats.visibleDecals + '/' + perfStats.totalDecals + '\n';
  s += 'Enemies visible/active: ' + perfStats.visibleEnemies + '/' + perfStats.totalActiveEnemies + '\n';
  s += 'Towers visible/active: ' + perfStats.visibleTowers + '/' + perfStats.totalActiveTowers + '\n';
  s += 'Particles visible/total: ' + perfStats.visibleParticles + '/' + perfStats.totalParticles + '\n';
  s += 'Floating texts visible/total: ' + perfStats.visibleFloatingTexts + '/' + perfStats.totalFloatingTexts +
    '  (projectiles remain uncounted here — see Entity Pools below for their active count)\n\n';
  s += 'Enemy death handler: ' + enemyDeathTiming.count + ' kills; mean ' + (enemyDeathTiming.count ? enemyDeathTiming.totalMs/enemyDeathTiming.count : 0).toFixed(2) +
    'ms, max ' + enemyDeathTiming.maxMs.toFixed(2) + 'ms, >=8ms ' + enemyDeathTiming.over8ms +
    ' (synchronous death logic only; excludes later animation/render cost)\n';

  s += 'UPDATE() PHASE BREAKDOWN (ms spent this frame, across all ticks that ran)\n';
  s += '---------------------------------------------------------------------------\n';
  s += 'This is where perfStats.updateMs (' + perfStats.updateMs.toFixed(2) + 'ms) actually goes — ' +
    'read this before touching any specific subsystem; guessing which of several real costs is ' +
    'dominant is exactly what this section exists to stop.\n';
  const phaseLabels = { ambient: 'Wind/scenery (ambient)', spawning: 'Wave spawning',
    barricade: 'Barricade/pileup', enemyUpdate: 'Enemy.update() loop', collision: 'Collision resolution (swept + 3-pass relaxation)',
    hashBuild: 'buildEnemyHash()', towerUpdate: 'Tower.update() loop', projectile: 'Projectile.update() loop',
    catSkeleton: 'Cat/Skeleton minions', particles: 'Particles/death-anims/blood/floating-text', waveLogic: 'Wave-complete transition logic' };
  let phaseTotalThisFrame = 0;
  for(const k in phaseTime) phaseTotalThisFrame += phaseTime[k];
  for(const k in phaseTime){
    const pct = phaseTotalThisFrame > 0 ? (phaseTime[k]/phaseTotalThisFrame*100) : 0;
    s += '  ' + phaseLabels[k].padEnd(42) + phaseTime[k].toFixed(3) + 'ms this frame' +
      '  (' + pct.toFixed(1) + '%,  worst frame ever: ' + phaseMaxSeen[k].toFixed(3) + 'ms)\n';
  }
  s += '\n';

  s += 'RENDER() PHASE BREAKDOWN (ms spent this frame, one pass — render() runs once per rendered frame, not once per tick)\n';
  s += '---------------------------------------------------------------------------\n';
  s += 'This is where perfStats.renderMs (' + perfStats.renderMs.toFixed(2) + 'ms) actually goes — ' +
    'same purpose as the UPDATE() breakdown above, for the other half of every frame.\n';
  const renderPhaseLabels = { mapBlit: 'Static map blit (drawImage)', decals: 'drawDecals() — blood pools/streaks/debris',
    depthSorted: 'drawDepthSortedLayer() — scenery+enemies+towers+debris', groundItems: 'Ground items + drag overlay',
    minionsProjectiles: 'Cat/Skeleton/Projectile draw loops', particlesText: 'drawParticles()+drawFloatingTexts()',
    overlays: 'Post-camera overlays (boss compass/leaves/wave countdown)',
    worldSort: '  of world pass: depth sort', worldScenery: '  of world pass: scenery drawing', worldEnemies: '  of world pass: enemy drawing',
    worldTowers: '  of world pass: fighter drawing (with shadows)', worldDebris: '  of world pass: bones, worms and rubble' };
  let renderPhaseTotalThisFrame = 0;
  for(const k in renderPhaseTime) if(k.indexOf('world') !== 0) renderPhaseTotalThisFrame += renderPhaseTime[k]; // the world* keys are parts of depthSorted and must not be counted twice
  for(const k in renderPhaseTime){
    const pct = renderPhaseTotalThisFrame > 0 ? (renderPhaseTime[k]/renderPhaseTotalThisFrame*100) : 0;
    s += '  ' + (renderPhaseLabels[k] || k).padEnd(48) + renderPhaseTime[k].toFixed(3) + 'ms this frame' +
      '  (' + pct.toFixed(1) + '%,  worst frame ever: ' + renderPhaseMaxSeen[k].toFixed(3) + 'ms)\n';
  }
  s += '\n';

  s += 'SPATIAL QUERY / HASH ACTIVITY (this rendered frame, across all ticks)\n';
  s += '-------------------------------------------------------------------------\n';
  s += 'buildEnemyHash() calls: ' + perfStats.hashBuildsLastFrame + '   queryNearby() calls: ' + perfStats.spatialQueryCallsLastFrame + '\n';
  s += 'Largest single queryNearby() result this session: ' + queryNearbyMaxResultLenSeen + ' entities ' +
    '(a consistently huge number here would mean a range/cell-size mismatch, not a real crowd)\n';
  s += 'Reusable hash-bucket pool size: ' + enemyHashBucketPool.size + ' (buckets currently held in the pool — ' +
    'should stabilize, not grow without bound, once enemy positions have covered the map once)\n\n';

  s += 'MEMORY (Chrome only — performance.memory)\n';
  s += '-------------------------------------------\n';
  if(perfStats.memorySupported){
    s += 'Used heap: ' + perfStats.usedHeapMB.toFixed(1) + 'MB   Total heap: ' + perfStats.totalHeapMB.toFixed(1) +
      'MB   Limit: ' + perfStats.heapLimitMB.toFixed(1) + 'MB\n';
    if(perfStats.heapHistory.length >= 2){
      const [first, last] = perfHistoryEndpoints(perfStats.heapHistory);
      const minutesSpan = perfStats.heapHistory.length / 60; // sampled ~once/sec, so N samples ≈ N/60 minutes
      const growthPerMin = minutesSpan > 0 ? (last-first)/minutesSpan : 0;
      s += 'Heap trend over last ' + perfStats.heapHistory.length + ' samples (~' + minutesSpan.toFixed(1) + 'min): ' +
        first.toFixed(1) + 'MB -> ' + last.toFixed(1) + 'MB  (' + (growthPerMin>=0?'+':'') + growthPerMin.toFixed(2) + 'MB/min — ' +
        'a real sawtooth that keeps returning near baseline is normal GC behavior; a steady one-way climb means something is not being recycled)\n';
    } else {
      s += 'Not enough samples yet for a trend — check again after playing a bit longer.\n';
    }
  } else {
    s += "Not available in this browser (Firefox/Safari don't expose performance.memory). " +
      'Chrome/Edge with the game open a while gives the most useful trend data.\n';
  }
  const canvasBufferBytes = c => c && c.width && c.height ? c.width * c.height * 4 : 0;
  const displayCanvasBytes = canvasBufferBytes(canvas);
  const mapCanvasBytes = canvasBufferBytes(mapCanvas);
  const settledCanvasBytes = canvasBufferBytes(settledDecalCanvas);
  s += 'Estimated canvas RGBA backing stores: display ' + (displayCanvasBytes/1048576).toFixed(1) +
    'MiB, static map ' + (mapCanvasBytes/1048576).toFixed(1) + 'MiB, settled decals ' +
    (settledCanvasBytes/1048576).toFixed(1) + 'MiB, total ' +
    ((displayCanvasBytes+mapCanvasBytes+settledCanvasBytes)/1048576).toFixed(1) +
    'MiB. Estimate is width x height x 4 bytes and excludes browser/GPU copies and metadata.\n';
  s += '\n';

  s += 'GAME STATE\n';
  s += '----------\n';
  s += 'gameState: ' + gameState + '   waveState: ' + waveState + '\n';
  s += 'Wave: ' + waveIndex + ' (completed: ' + wavesCompleted + ')   Speed: ' + gameSpeed + 'x\n';
  s += 'Gold: ' + gold + '   Wood: ' + wood + '   Stone: ' + stone + '\n';
  s += 'Lives: ' + lives + ' (bought: ' + livesBought + ')\n';
  s += 'Free barricades: ' + freeBarricadesLeft + '/' + MAX_FREE_BARRICADES + '\n';
  s += 'Camera: x=' + camera.x.toFixed(1) + ' y=' + camera.y.toFixed(1) + ' zoom=' + camera.zoom.toFixed(3) + '\n\n';

  s += 'SETTINGS\n';
  s += '--------\n';
  s += 'Graphics quality: ' + graphicsQuality + '   Gore mode: ' + goreMode + '   Muted: ' + isMuted + '\n';
  s += 'FPS counter: ' + showFpsCounter + '   Screen shake: ' + screenShakeEnabled + '\n';
  s += 'Render scale: ' + Math.round(RENDER_SCALE_STEPS[renderScaleStep]*100) + '%   Automatic render resolution: ' + (autoRenderScaleEnabled ? 'on' : 'off') + '   Lowest allowed: ' + renderScaleFloorPercent + '%' + (renderScaleFloorUserSet ? ' (player choice)' : ' (profile default)') + '\n';
  s += 'Governor evidence: smoothed gap ' + smoothedGapMs.toFixed(1) + ' ms, last 20 s window average ' + lastGovernorAverageGapMs.toFixed(1) + ' ms, current below-15-FPS duration ' + Math.round(lowFpsDurationMs/1000) + ' s\n';
  s += 'Boss warnings this session: ' + (bossWarningLog.length ? bossWarningLog.map(b => 'wave ' + b.wave + ' phase ' + b.phaseIndex + ' (' + b.reason + ')').join(' | ') : 'none') + '\n';
  s += 'Last render scale decision: ' + lastGovernorDecision + '\n';
  s += 'Render scale history (' + renderScaleHistory.length + '): ' + (renderScaleHistory.length ? renderScaleHistory.map(h => 't+' + h.at + 's ' + Math.round(h.from*100) + '->' + Math.round(h.to*100) + '% ' + h.reason).join(' | ') : 'none') + '\n';
  s += 'DPR in use: ' + dprValue + '   Canvas: ' + CANVAS_W + 'x' + CANVAS_H + '\n\n';

  s += 'AUDIO ENGINE\n';
  s += '------------\n';
  s += 'Unlocked: ' + ac.unlocked + '   AudioContext state: ' + (ac.ctx ? ac.ctx.state : 'n/a') +
    '   Sample rate: ' + (ac.ctx ? ac.ctx.sampleRate : 'n/a') + '\n';
  s += 'Active voices: ' + ac.activeVoiceExpiry.length + '/' + ac.MAX_VOICES + '\n';
  s += 'Impact requested/played/suppressed: ' + ac.debugCounters.impactRequested + '/' +
    ac.debugCounters.impactPlayed + '/' + ac.debugCounters.impactSuppressed + '\n';
  s += 'Peak voices seen: ' + ac.debugCounters.peakVoices + '\n';
  s += 'Mix master/music/effects: ' + Math.round(audioMasterVolume*100) + '/' + Math.round(audioMusicVolume*100) + '/' + Math.round(audioSfxVolume*100) + '%   Music phase/running: ' + ac.musicPhase + '/' + ac.musicStarted + '\n';
  s += 'Audio admitted sources / focus cues: ' + ac.debugCounters.voicesStarted + '/' + ac.debugCounters.priorityEvents + '\n\n';

  s += 'ENTITY POOLS (active/capacity)\n';
  s += '-------------------------------\n';
  s += 'Enemies: ' + activeCount(enemyPool) + '/' + enemyPool.length + '\n';
  s += 'Towers: ' + activeCount(towerPool) + '/' + towerPool.length + '\n';
  s += 'Projectiles: ' + activeCount(projectilePool) + '/' + projectilePool.length + '\n';
  s += 'Particles: ' + activeCount(particles) + '/' + particles.length + '\n';
  s += 'Floating texts: ' + activeCount(floatingTexts) + '/' + floatingTexts.length + '\n';
  s += 'Death animations: ' + deathAnims.length + '\n';
  s += 'Ground decals: ' + decals.length + ' (cap ' + decalCapacity() + '); spray marks: ' + sprayDecals.length + ' (separate cap ' + sprayDecalCapacity() + ')\n';
  s += 'Scenery items: ' + sceneryMap.size + '\n';
  s += 'Flora items: ' + floraMap.size + '\n';
  if(hacksUsed) s += 'Hack menu used this run: yes\n';
  s += 'Design contract: ' + (designContractProblems.length ? designContractProblems.join(' | ') : 'OK') + '\n';
  s += 'Ground items: ' + groundItems.length + '/' + MAX_GROUND_ITEMS + (groundItems.length ?
    '  (oldest ' + Math.round((presentationTime - Math.min(...groundItems.map(gi => gi.spawnTime)))/1000) + 's old, ' + (GROUND_ITEM_LIFESPAN/60000) + 'm lifespan)' : '') + '\n\n';

  s += 'TOWER COMPOSITION\n';
  s += '------------------\n';
  const towerCounts = {};
  for(const t of towerPool){ if(!t.active) continue; towerCounts[t.type] = (towerCounts[t.type]||0) + 1; }
  const towerTypeList = Object.keys(towerCounts).sort();
  s += towerTypeList.length ? towerTypeList.map(type => type + ': ' + towerCounts[type]).join('   ') + '\n\n'
    : '(none placed)\n\n';

  s += 'HUT / CAMP STATE\n';
  s += '-----------------\n';
  const activeHuts = enemyPool.filter(e => e.active && e.isHutBuilding);
  if(activeHuts.length === 0){
    s += 'No active hut this session (or none spawned yet -- see HUT_MIN_EXPANSION_LEVEL)\n\n';
  } else {
    for(const hut of activeHuts){
      const ledgerSize = hut.campDamageLedger ? hut.campDamageLedger.size : 0;
      const guardianCount = enemyPool.filter(e => e.active && e.isGuardian && e.hutRef === hut).length;
      s += 'Hut at (' + Math.round(hut.x) + ',' + Math.round(hut.y) + '): HP ' + Math.round(hut.hp) + '/' + Math.round(hut.maxHp) +
        '   guardians ' + guardianCount + ' (alive count tracked: ' + (hut.guardiansAliveCount||0) + ')' +
        '   damage ledger entries: ' + ledgerSize + '   next respawn: ' +
        (hut.respawnAt ? Math.max(0, Math.round((hut.respawnAt - gameTime)/1000)) + 's from now' : 'n/a (guardians already alive)') + '\n';
    }
    s += '\n';
  }

  s += 'BROWSER / DEVICE\n';
  s += '----------------\n';
  s += 'User agent: ' + navigator.userAgent + '\n';
  s += 'Window: ' + window.innerWidth + 'x' + window.innerHeight + '   Screen: ' +
    (window.screen ? window.screen.width + 'x' + window.screen.height : 'n/a') + '\n';
  s += 'devicePixelRatio: ' + (window.devicePixelRatio || 1) + '\n';
  s += 'Graphics processor (as reported to the browser): ' + renderEnvironment.gpuRenderer + (renderEnvironment.softwareRendering === true ? '  <-- SOFTWARE RENDERING: hardware acceleration looks off' : '') + '\n';
  s += 'Power: ' + renderEnvironment.battery + '   Screen: ' + screen.width + 'x' + screen.height + '\n';
  s += 'Frame pacing: ' + framePacingVerdict() + '\n';
  s += 'Camera motion at full frame rate: ' + cameraMotionFullRateFrames + ' frames (the frame-rate limit never applies while the camera moves)\n';
  s += 'Frame rate cap: ' + (frameCapEnabled ? frameCapFps() + ' FPS (' + (frameCapFpsUser === null ? 'default for ' + graphicsQuality : 'player choice') + ')' : 'off') + '\n';
  s += 'Display refresh measured: ' + (vsyncIntervalMs > 0 ? (1000 / vsyncIntervalMs).toFixed(1) + ' Hz, cap paced to ' + (1000 / vsyncSnappedCapMs(frameCapIntervalMs() || vsyncIntervalMs)).toFixed(1) + ' FPS' : 'not yet measured') + '\n';
  s += 'Boot warm-up: ' + bootWarmupStats.jobs + ' jobs, ' + bootWarmupStats.workMs.toFixed(0) + ' ms of work, loading screen shown ' + bootWarmupStats.shownMs.toFixed(0) + ' ms\n';
  s += 'Language: ' + navigator.language + '   Online: ' + navigator.onLine + '   Build: ' + window.STICKTD_BUILD + '\n';
  s += 'Hardware threads: ' + (navigator.hardwareConcurrency || 'n/a') + '   Device memory: ' +
    (navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'n/a') +
    '   Max touch points: ' + (navigator.maxTouchPoints || 0) + '\n';
  let contextAttributes = 'unavailable';
  try { if(ctx.getContextAttributes) contextAttributes = JSON.stringify(ctx.getContextAttributes()); } catch(error) {}
  s += 'Canvas 2D context attributes: ' + contextAttributes + '\n';

  s += extendedDiagnosticReport();
  s += '\nDEVICE DIAGNOSTICS (browser-reported; unavailable fields are not inferred)\n' + deviceDebugReport();
  s += '\nTELEMETRY (last ' + telemetryRecent.length + ' local events; queued does not confirm Google delivery)\n';
  s += '---------------------------------------------------------------------------------------------\n';
  s += 'Analytics loader: ' + window.sticktdAnalyticsStatus + '; dropped while unavailable: ' + window.sticktdAnalyticsDropped + '\n';
  for(const reported of telemetryRecent) s += '  [' + reported.delivery + '] +' + reported.atSecond + 's  ' + reported.name + '  ' + JSON.stringify(reported.payload) + '\n';
  s += '\n' + itemLogReport();
  s += '\n' + gameEventReport() + '\n';
  if(hacksUsed) s += 'Hack menu used this run: yes\n';
  s += 'Design contract: ' + (designContractProblems.length ? designContractProblems.join(' | ') : 'OK') + '\n';

  return s;
}
// GAMEOVER-LOG-01 (1.6.2) — see HISTORY.md § [1.6.2]. Factored out of the Settings download
// button so the new end-screen button (below) can trigger the exact same file without duplicating
// the blob/anchor boilerplate.
function downloadDebugLogFile(){
  const blob = new Blob([generateDebugLog()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url; a.download = 'stickTD-debug-' + GAME_VERSION + '-' + stamp + '.txt'; a.click();
  URL.revokeObjectURL(url);
}
document.getElementById('downloadDebugLogBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  downloadDebugLogFile();
});
document.getElementById('downloadReadmeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const blob = new Blob([getReadmeText()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'README.txt'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('viewReadmeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const blob = new Blob([getReadmeText()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
});
document.getElementById('expandAboutBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const content = document.getElementById('about-expand-content');
  const willShow = content.classList.contains('hidden');
  if(willShow){
    content.innerHTML = '<p>Train and unlock stickman classes with distinct bodies, weapons and combat roles. ' +
      'The map starts as a tiny 2x2 area and extends both ends of its winding path — one expansion per round at most, extra ' +
      'ones queue for the next. Enemies occasionally break off the path to attack a tower directly; ' +
      'Barricades placed on the path can temporarily jam the whole line behind them, and enemies now ' +
      'queue up single-file. Items are bought per-class from the Shop and equip ' +
      'directly onto a tower — fully-geared towers awaken as Heroes.</p>';
    e.target.textContent = 'Less info ▴';
  } else {
    e.target.textContent = 'More info ▾';
  }
  content.classList.toggle('hidden');
});
document.getElementById('inspCraftBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(selectedTower && craftItemOn(selectedTower)) updateInspectPanel();
});
document.getElementById('inspAxeModeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || selectedTower.type !== 'AXEMAN') return;
  if(selectedTower.toggleAxeMode()){ playSound('click'); updateInspectPanel(); }
});
// CA773 — see HISTORY.md § [1.5.7] Code Archaeology, CA773

const inspQuickSlots = document.getElementById('inspQuickSlots');
function positionQuickSlots(){
  const rect = inspectPanel.getBoundingClientRect();
  if(!rect.height) return;
  const parent = inspQuickSlots.offsetParent ? inspQuickSlots.offsetParent.getBoundingClientRect() : null;
  const bottomGap = parent ? Math.max(0, parent.bottom - rect.bottom) : 8;
  inspQuickSlots.style.setProperty('--quick-bottom', (bottomGap + rect.height + 6) + 'px');
}
if(typeof ResizeObserver === 'function') new ResizeObserver(positionQuickSlots).observe(inspectPanel);
const quickSlotElements = [...document.querySelectorAll('.quick-slot')];
const inspBuffPips = document.getElementById('inspBuffPips');
const BUFF_PIP_ROWS = [['damage', '⚔️', 'POWER'], ['speed', '⚡', 'HASTE'], ['range', '🎯', 'HASTE']];
function updateBuffPips(tower){
  inspBuffPips.textContent = '';
  const buffs = isStructureType(tower.type) ? null : tower.roundBuffs;
  if(buffs){
    const groups = new Map(); // buffs with the same strength share one pip, so a meal that raises three stats takes one pip
    for(const [stat, icon, itemClass] of BUFF_PIP_ROWS){
      if(!(buffs[stat] > 1)) continue;
      const percent = Math.round((buffs[stat] - 1) * 100);
      const group = groups.get(percent) || { icons: '', names: [], itemClass };
      group.icons += icon; group.names.push(ROUND_BUFF_LABELS[stat]);
      groups.set(percent, group);
    }
    for(const [percent, group] of groups){
      const pip = document.createElement('span');
      pip.className = 'buff-pip';
      pip.style.color = ITEM_USE_CLASSES[group.itemClass].color;
      pip.textContent = group.icons + ' +' + percent + '%';
      pip.title = group.names.join(', ') + ' +' + percent + '% until the wave ends';
      inspBuffPips.appendChild(pip);
    }
  }
  inspBuffPips.classList.toggle('hidden', inspBuffPips.childElementCount === 0);
}
function refreshQuickUse(tower){ // QUICK-USE-EVENTS-01 (1.6.144) — see HISTORY.md § [1.6.144]: the row changes only when an item is used or enters or leaves the inventory
  if(tower === selectedTower) updateQuickSlots(tower, isStructureType(tower.type));
}
function updateQuickSlots(tower, isBarricade){
  let shown = 0;
  if(!isBarricade && !inspPanelExpanded){
    tower.equippedItems.forEach((item, slotIndex) => {
      if(!isConsumableDef(item) || shown >= quickSlotElements.length) return;
      const box = quickSlotElements[shown++];
      box.dataset.slot = String(slotIndex);
      box.dataset.key = String(slotIndex + 1);
      box.textContent = item.icon;
      box.title = item.name + ' — click to use (key ' + (slotIndex + 1) + '); drag to another stickman or onto the map';
      box.classList.add('filled', 'usable');
      applyItemGlowClass(box, item);
      box.classList.remove('hidden');
    });
  }
  for(let i = shown; i < quickSlotElements.length; i++){ quickSlotElements[i].classList.add('hidden'); quickSlotElements[i].textContent = ''; }
  inspQuickSlots.classList.toggle('hidden', shown === 0);
  positionQuickSlots();
}
let hpBarShowPercent = false; // toggled by clicking the HP bar — see the click handler near the other inspect-panel button wiring
// ATTACK-STATE-01 (1.7.36): the portrait ring shows why a fighter is or is not hitting, in colour and tooltip only so the nameplate never changes size:
// green = attacking, amber = preparing the next attack, blue = a target exists but is outside its range, grey = nothing to target. It updates only when the state changes.
let lastAttackStateKey = '';
function refreshAttackState(){
  const frame = document.getElementById('inspPortraitFrame');
  const tower = selectedTower;
  if(!frame || !tower || !tower.active || isStructureType(tower.type) || tower.type === 'HACKER'){ if(lastAttackStateKey){ lastAttackStateKey = ''; frame && frame.removeAttribute('data-attack'); } return; }
  let state;
  if(tower.target && tower.target.active) state = tower.cooldownTimer > 0 ? 'preparing' : 'attacking';
  else { let enemyOut = false; for(const e of enemyPool){ if(e.active && !e.isLivestock && !e.deathResolved){ enemyOut = true; break; } } state = enemyOut ? 'outside' : 'idle'; }
  const key = tower.id + ':' + state;
  if(key === lastAttackStateKey) return;
  lastAttackStateKey = key;
  frame.dataset.attack = state;
  frame.title = state === 'attacking' ? 'Attacking' : state === 'preparing' ? 'Preparing the next attack' : state === 'outside' ? 'Enemies are outside this fighter\'s range' : 'No enemies to target';
}
function updateInspectPanel(){
  if(selectedTower && selectedTower.type === 'HACKER'){ inspectPanel.classList.add('hidden'); openHackMenu(selectedTower); return; }
  closeHackMenu();
  if(!selectedTower){ inspectPanel.classList.add('hidden'); return; }
  inspectPanel.classList.remove('hidden');
  inspFullOptions.classList.toggle('hidden', !inspPanelExpanded);
  inspExpandChevron.style.transform = inspPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  inspExpandChevron.classList.toggle('has-points', selectedTower.statPoints > 0);
  const t = selectedTower;
  const isBarricade = t.type === 'BARRICADE';
  const isProducer = isProducerType(t.type), isStructure = isBarricade || isProducer;
  inspEvoBarTrack.classList.toggle('hidden', isStructure);
  inspCombatRow.classList.toggle('hidden', isStructure);
  inspStatsRow.classList.toggle('hidden', isStructure);
  inspItemsRow.classList.toggle('hidden', isStructure);
  inspUpgradeBtn.classList.toggle('hidden', isBarricade);
  inspMoveBtn.classList.toggle('hidden', isProducer);
  const repairBtn = inspRepairBtn;
  const needsRepair = isBarricade && t.hp < t.maxHp;
  repairBtn.classList.toggle('hidden', !needsRepair);
  if(needsRepair){
    const cost = barricadeRepairCost(t);
    inspRepairCost.textContent = '(🪵' + cost.wood + ' 🪨' + cost.stone + ')';
    repairBtn.disabled = wood < cost.wood || stone < cost.stone;
  }
  inspDpsBetween.classList.toggle('hidden', isStructure);
  inspTargetBtn.classList.toggle('hidden', isStructure);
  inspName.textContent = (t.isLegendary && t.legendaryName) ? ('🏆 ' + t.legendaryName) : t.def.name;
  const specLabel = t.spec ? (t.spec === 'TWOHANDER' ? ' · Zweihander' : ' · Dual Wield') : '';
  const heroLabel = t.isHero ? ' ⭐HERO' : '';
  inspLevel.textContent = isBarricade ? '' : isProducer ? ('Level ' + t.level + '/' + PRODUCER_MAX_LEVEL + ' · ' + PRODUCER_DEFS[t.type].icon + '+' + PRODUCER_DEFS[t.type].yields[t.level - 1] + ' every 60s') : (promotionRankLabel(t.level) + specLabel + heroLabel);
  inspPortraitFace.textContent = t.def.icon || '🙂';
  const hpPct = t.maxHp > 0 ? Math.max(0, Math.min(100, (t.hp/t.maxHp)*100)) : 0;
  inspHpBarFill.style.width = hpPct + '%';
  // CA774 — see HISTORY.md § [1.5.7] Code Archaeology, CA774
  const disabledSuffix = (!isBarricade && t.disabledWavesLeft > 0) ? (' (DOWNED · ' + t.disabledWavesLeft + ' rounds)') : '';
  inspHpBarText.textContent = (hpBarShowPercent ? (Math.round(hpPct) + '%') : (Math.round(t.hp) + '/' + t.maxHp)) + disabledSuffix;
  if(isProducer){
    const upgradeCost = producerUpgradeCost(t);
    inspUpgradeBtn.disabled = !upgradeCost || !canAffordProducerCost(upgradeCost);
    inspUpgradeCost.textContent = upgradeCost ? '(' + producerCostLabel(upgradeCost) + ')' : '(MAX)';
    inspSellValue.textContent = '(💰' + t.sellValue() + ')';
    inspStoreBtn.classList.add('hidden');
    inspAxeModeBtn.classList.add('hidden');
    statsInfoBtn.classList.add('hidden');
    barricadeInfoBtn.classList.add('hidden');
    inspAuraBox.classList.add('hidden');
    return;
  }
  if(isBarricade){
    // CA775 — see HISTORY.md § [1.5.7] Code Archaeology, CA775
    inspSellValue.textContent = '(💰' + t.sellValue() + ')';
    inspStoreBtn.classList.toggle('hidden', false);
    const moveBtn = inspMoveBtn;
    const moveCost = inspMoveCost;
    moveBtn.disabled = t.moveCharges <= 0;
    moveCost.textContent = '(' + t.moveCharges + ')';
    inspAxeModeBtn.classList.add('hidden');
    statsInfoBtn.classList.add('hidden');
    barricadeInfoBtn.classList.remove('hidden');
    inspAuraBox.classList.add('hidden');
    return;
  }
  const evoTrack = inspEvoBarTrack;
  evoTrack.classList.remove('hidden'); // every tower has an XP level, so this bar is always shown now
  if(t.expLevel >= MAX_TOWER_LEVEL){
    inspEvoBarFill.style.width = '100%';
    inspEvoBarText.textContent = 'MAX TRAINING'; // the Training XP bar tracks expLevel, separately from the promotion rank shown in inspLevel
  } else {
    const need = xpForNextLevel();
    inspEvoBarFill.style.width = Math.round(Math.min(1, t.xp/need)*100) + '%';
    inspEvoBarText.textContent = Math.round(t.xp) + '/' + need + ' Training XP';
  }
  const evoHint = inspEvoHint;
  if(BASE_ATTUNABLE_TYPES.includes(t.type)){
    if(!t.attunement){
      const stats = ['str','dex','int'];
      const bestValue = Math.max(...stats.map(k => t[k] || 0));
      const readyStat = stats.find(k => (t[k] || 0) >= ELEMENT_INFUSE_THRESHOLD);
      if(readyStat){
        const element = ATTUNEMENTS[readyStat];
        evoHint.textContent = ATTUNEMENT_ICON[element] + ' Ready to attune!';
      } else {
        const preferredArchetype = CLASS_ARCHETYPE[t.type];
        const leadingPreferredStat = preferredArchetype === 'WARRIOR' ? 'str' : preferredArchetype === 'ARCHER' ? 'dex' : preferredArchetype === 'MAGE' ? 'int' : null;
        const leadingStat = stats.find(k => (t[k] || 0) === bestValue);
        const leadingElement = ATTUNEMENTS[leadingStat];
        evoHint.textContent = bestValue > 0
          ? ATTUNEMENT_ICON[leadingElement] + ' ' + (ELEMENT_INFUSE_THRESHOLD - bestValue) + ' points until ' + leadingElement.charAt(0) + leadingElement.slice(1).toLowerCase() + ' Attunement'
          : '🎓 Spend points to start training — ' + (leadingPreferredStat ? leadingPreferredStat.toUpperCase() + ' is preferred' : 'any stat');
      }
      evoHint.classList.remove('hidden');
    } else {
      const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[t.attunement];
      const target = SPECIALIZATIONS[t.type] && SPECIALIZATIONS[t.type][t.attunement];
      // CA776 — see HISTORY.md § [1.5.7] Code Archaeology, CA776
      let nearest = null;
      if(target){
        const remaining = Math.max(0, specializationThresholdFor(target) - (t[attunedStat]||0));
        const targetDef = CONFIG.TOWERS[target];
        nearest = { remaining, text: remaining > 0
          ? (ATTUNEMENT_ICON[t.attunement] + ' ' + targetDef.icon + ' ' + targetDef.name + ' — ' + remaining + ' more ' + attunedStat.toUpperCase())
          : (ATTUNEMENT_ICON[t.attunement] + ' ' + targetDef.icon + ' ' + targetDef.name + ' — ready to unlock!') };
      }
      for(const rule of MIXED_ELEMENT_RULES){
        const pairs = { PROTON:['str','dex'], DARK_MATTER:['str','int'], QUASAR:['dex','int'] }[rule.element];
        if(!pairs) continue;
        const missing = pairs.reduce((sum, stat) => sum + Math.max(0, MIXED_PAIR_THRESHOLD - (t[stat] || 0)), 0);
        if(missing <= 0) continue; // already have this mix — covered by elementState elsewhere, not a "next" hint
        if(!nearest || missing < nearest.remaining){
          nearest = { remaining: missing, text: ELEMENT_LABELS[rule.element] + ' in ' + missing + ' more ' + pairs.map(p => p.toUpperCase()).join('/') };
        }
      }
      if(nearest){
        evoHint.textContent = nearest.text;
      } else {
        // CA777 — see HISTORY.md § [1.5.7] Code Archaeology, CA777
        const elementLabel = t.attunement.charAt(0) + t.attunement.slice(1).toLowerCase();
        evoHint.textContent = ATTUNEMENT_ICON[t.attunement] + ' ' + elementLabel + ' Attuned';
      }
      const tierNote = statTierNote(t);
      if(tierNote) evoHint.textContent += '  ·  ' + tierNote;
      const milestoneNote = progressionMilestoneNote(t);
      if(milestoneNote) evoHint.textContent += '  ·  ' + milestoneNote;
      evoHint.classList.remove('hidden');
    }
  } else {
    const evo = EVOLUTIONS[t.type];
    if(evo){
    // CA778 — see HISTORY.md § [1.5.7] Code Archaeology, CA778
    const branchStats = Object.keys(evo);
    const values = branchStats.map(k => t[k] || 0);
    const maxVal = Math.max(...values);
    const leaders = branchStats.filter(k => (t[k]||0) === maxVal);
    if(maxVal > 0 && leaders.length === 1){
      const statKey = leaders[0];
      const cur = t[statKey] || 0;
      const need = evo[statKey].threshold;
      const remaining = Math.max(0, need - cur);
      const targetDef = CONFIG.TOWERS[evo[statKey].target];
      evoHint.textContent = remaining > 0
        ? (targetDef.icon + ' ' + targetDef.name + ' unlock — ' + remaining + ' more ' + statKey.toUpperCase())
        : (targetDef.icon + ' ' + targetDef.name + ' unlock — ready!');
      evoHint.classList.remove('hidden');
    } else {
      evoHint.classList.add('hidden');
    }
    } else {
      evoHint.classList.add('hidden');
    }
  }

  const isMeleeMode = t.type === 'AXEMAN' ? t.axeMode === 'MELEE' : !!t.baseMeleeDamage;
  const atk = isMeleeMode ? (t.meleeDamage || t.damage) : t.damage;
  const rng = isMeleeMode ? (t.meleeRange || t.range) : t.range;
  const cd = isMeleeMode ? (t.meleeCooldown || t.cooldown) : t.cooldown;
  // CA779 — see HISTORY.md § [1.5.7] Code Archaeology, CA779
  inspAtkVal.textContent = '';
  const dmgHalf = Math.min(0.6, (t.type === 'MAGE' ? 0.4 : 0.2) + (t.primaryStatEff ? diminishingStatValue(t.primaryStatEff, 0.0003) : 0)); // must match applyDamage()'s effectiveVarianceHalfWidth exactly — base half-width per archetype (Snap Caster stays at the default ±20%, only base Mage gets the wider ±40% band) plus the same primary-stat spread bonus applyDamage() adds
  const dmgMinEl = inspAtkRange;
  // CA798 — see HISTORY.md § [1.6.61] Cleric damage display.
  const damageDisplayMultiplier = t.type === 'CLERIC' ? 5 : 1;
  const displayedAtk = atk * damageDisplayMultiplier;
  const dmgRangeText = Math.round(displayedAtk*(1-dmgHalf)) + '-' + Math.round(displayedAtk*(1+dmgHalf));
  if(dmgMinEl) dmgMinEl.textContent = dmgRangeText;
  if(inspDpsRangeVal) inspDpsRangeVal.textContent = dmgRangeText; // same computed range, shown again under DPS per direct request — one source of truth, two display spots
  inspHpStatVal.textContent = Math.round((t.hpStat||0)*1000)/1000;
  inspDefVal.textContent = Math.round((t.shieldPct||0)*100);
  inspRangeVal.textContent = rng;
  inspSpeedVal.textContent = cd ? (cd/1000).toFixed(2) : '0';
  inspCritVal.textContent = Math.round((t.critChance||0)*1000)/10 + '% 🗡️' + (Math.round((t.critMult||1.2)*100)/100);
  // CA780 — see HISTORY.md § [1.5.7] Code Archaeology, CA780
  const dpsShotsPerCycle = (t.burstCount && t.burstCount > 1) ? t.burstCount : 1;
  const dpsCycleMs = dpsShotsPerCycle > 1 ? (dpsShotsPerCycle-1)*(t.burstDelay||0) + cd : cd;
  const critExpectedMult = 1 + (t.critChance||0) * ((t.critMult||1.2) - 1);
  const dpsDamageMultiplier = t.type === 'CLERIC' ? 5 : 1;
  const dpsAccuracy = 1 - (t.missChance||0);
  const dps = dpsCycleMs > 0 ? (dpsShotsPerCycle * atk * dpsDamageMultiplier * critExpectedMult * dpsAccuracy) / (dpsCycleMs/1000) : 0;
  inspDpsVal.textContent = dps >= 100 ? Math.round(dps) : dps.toFixed(1);
  fitStatRowToOneLine();
  fitNameplateToStatRow();
  const arch = CLASS_ARCHETYPE[t.type];
  inspStrBtn.title = 'Strength: grows health, weight and body size' + (arch==='WARRIOR' ? '; also increases this class’s direct damage.' : '.');
  inspIntBtn.title = 'Intelligence: grows reach toward this class’s range cap and increases critical damage' + (arch==='MAGE' ? '; also increases direct damage.' : '.');
  inspDexBtn.title = 'Dexterity: improves attack speed, accuracy and critical chance' + (arch==='ARCHER' ? '; also increases this class’s direct damage.' : '.');
  // CA781 — see HISTORY.md § [1.5.7] Code Archaeology, CA781
  const auraBox = inspAuraBox;
  const strategy = TOWER_STRATEGY[t.type];
  auraBox.classList.toggle('hidden', !strategy);
  if(strategy){ auraBox.textContent = strategy.icon; auraBox.title = strategy.text; }
  auraTooltip.classList.add('hidden');
  if(t.canUpgrade()){
    const cost = t.nextUpgradeCost();
    inspUpgradeBtn.disabled = gold < cost;
    inspUpgradeCost.textContent = '(💰' + cost + ')';
  } else {
    inspUpgradeBtn.disabled = true;
    inspUpgradeCost.textContent = selectedTower.promotionCapacity() <= 0 ? '(SPEND POINTS)' : '(MAX)';
  }
  inspSellValue.textContent = '(💰' + t.sellValue() + ')';
  inspStoreBtn.classList.add('hidden'); // Barricade-only button; Barricade itself returned early above and set this visible there
  inspTargetMode.textContent = t.targetMode;
  const moveBtn = inspMoveBtn;
  const moveCost = inspMoveCost;
  moveBtn.disabled = t.moveCharges <= 0;
  moveCost.textContent = '(' + t.moveCharges + ')';

  const axeBtn = inspAxeModeBtn;
  if(t.type === 'AXEMAN'){
    axeBtn.classList.remove('hidden');
    inspAxeModeVal.textContent = t.axeMode === 'MELEE' ? 'Melee' : 'Range';
    inspAxeSwitches.textContent = '(' + t.axeSwitchesLeft + ' left)';
    axeBtn.disabled = t.axeSwitchesLeft <= 0;
  } else {
    axeBtn.classList.add('hidden');
  }

  statsInfoBtn.classList.remove('hidden');
  barricadeInfoBtn.classList.add('hidden');

  const slots = document.querySelectorAll('.item-slot');
  slots.forEach((slot, i) => {
    const item = t.equippedItems[i];
    slot.dataset.key = String(i + 1);
    if(item){
      slot.textContent = item.icon;
      slot.title = isConsumableDef(item)
        ? item.name + (item.isDiggingTool ? ' (reusable)' : '') + ' — click or press ' + (i + 1) + ' to use; drag to another stickman or onto the map'
        : item.name + (itemStatSummary(item) ? ' — ' + itemStatSummary(item) : '');
      slot.classList.add('filled');
      slot.classList.toggle('usable', isConsumableDef(item));
      applyItemGlowClass(slot, item);
    } else {
      slot.textContent = '';
      slot.title = 'Empty slot';
      slot.classList.remove('filled');
      slot.classList.remove('usable');
      applyItemGlowClass(slot, null);
    }
  });
  updateQuickSlots(t, isBarricade);
  updateBuffPips(t);
  const craftRecipe = findCraftableRecipeFor(t.equippedItems, t);
  const inspCraftBtn = document.getElementById('inspCraftBtn');
  if(craftRecipe){
    const resultDef = lookupItemDef(craftRecipe.result);
    inspCraftBtn.classList.remove('hidden');
    inspCraftBtn.textContent=(craftRecipe.fuelCost?'Cook ':'Combine ')+resultDef.icon;
    inspCraftBtn.title = (craftRecipe.fuelCost ? 'Cook ' : 'Combine into ') + resultDef.icon + ' ' + resultDef.name + '\n'+itemStatSummary(resultDef)+'\nConsumes: '+craftRecipe.ingredients.map(id=>lookupItemDef(id)?.name||id).join(', ')+(craftRecipe.fuelCost ? ' (uses ' + craftRecipe.fuelCost + ' campfire fuel)' : '');
  } else {
    inspCraftBtn.classList.add('hidden');
  }

  inspStatPointsVal.textContent = t.statPoints;
  inspAutoSpend.checked = !!t.autoSpend;
  // CA782 — see HISTORY.md § [1.5.7] Code Archaeology, CA782
  inspStrVal.textContent = t.str + (t.str > STAT_EFFECT_CAP ? ' (capped)' : '');
  inspDexVal.textContent = t.dex + (t.dex > STAT_EFFECT_CAP ? ' (capped)' : '');
  inspIntVal.textContent = t.int + (t.int > STAT_EFFECT_CAP ? ' (capped)' : '');
  const noPoints = t.statPoints <= 0;
  const archetypeOfSelected = CLASS_ARCHETYPE[t.type];
  const primaryStatOfSelected = archetypeOfSelected === 'WARRIOR' ? 'str' : archetypeOfSelected === 'ARCHER' ? 'dex' : archetypeOfSelected === 'MAGE' ? 'int' : null;
  for(const [id, stat] of [['inspStrBtn','str'],['inspDexBtn','dex'],['inspIntBtn','int']]){
    const btn = document.getElementById(id);
    const statCapped = t[stat] >= STAT_EFFECT_CAP || getTrainedStatTotal(t) >= STAT_TOTAL_CAP;
    btn.disabled = noPoints || statCapped;
    btn.classList.toggle('has-points', !noPoints && !statCapped);
    btn.classList.toggle('primary-stat', stat === primaryStatOfSelected);
    btn.title = stat === 'str' ? 'Strength — drives Warrior damage and stickman weight/size' : stat === primaryStatOfSelected ? 'Primary stat — drives this class\'s damage' : stat === 'int' ? 'Intelligence — drives Mage damage and every stickman\'s accuracy' : 'Support stat';
  }
}
inspUpgradeBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  if(selectedTower.upgrade()){
    updateHUD(); updateInspectPanel();
    playSound('ui_buy');
    // CA783 — see HISTORY.md § [1.5.7] Code Archaeology, CA783
  }
});
inspSellBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  logGameEvent('sold ' + itemHolderLabel(selectedTower) + ' for ' + selectedTower.sellValue() + ' gold');
  trackGameEvent('tower_sold', { tower_type: selectedTower.type, level: selectedTower.level, refund: selectedTower.sellValue() });
  gold += selectedTower.sellValue();
  for(const lostItem of selectedTower.equippedItems) itemLogReleased(lostItem, 'lost: ' + itemHolderLabel(selectedTower) + ' was sold');
  selectedTower.active = false;
  invalidateSpawnFlags();
  activeBarricades.delete(selectedTower);
  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  updateHUD(); updateInspectPanel();
});
document.getElementById('inspRepairBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || selectedTower.type !== 'BARRICADE' || selectedTower.hp >= selectedTower.maxHp) return;
  const cost = barricadeRepairCost(selectedTower);
  if(wood < cost.wood || stone < cost.stone) return;
  wood -= cost.wood; stone -= cost.stone;
  selectedTower.hp = selectedTower.maxHp;
  playSound('ui_buy');
  spawnFloatingText(selectedTower.x, selectedTower.y - 24, 'Repaired!', '#8bc34a');
  updateHUD(); updateInspectPanel();
});
document.getElementById('inspHpBarTrack').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  hpBarShowPercent = !hpBarShowPercent;
  playSound('click');
  updateInspectPanel();
});
document.getElementById('inspStoreBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || selectedTower.type !== 'BARRICADE') return;
  const x = selectedTower.x, y = selectedTower.y;
  selectedTower.active = false;
  invalidateSpawnFlags();
  activeBarricades.delete(selectedTower);
  spawnGroundItem(x, y, BARRICADE_ITEM, 'shop purchase');
  spawnFloatingText(x, y - 20, '📦 Ready to carry', '#7dd3fc');
  playSound('click');
  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  updateHUD(); updateInspectPanel();
});
inspTargetBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  const modes = ['FIRST','LAST','CLOSEST','STRONGEST','WEAKEST','FARM','ASSIST','UNCLAIMED'];
  const i = modes.indexOf(selectedTower.targetMode);
  selectedTower.targetMode = modes[(i+1)%modes.length];
  playSound('click');
  updateInspectPanel();
});
inspClose.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  updateInspectPanel();
});
document.getElementById('inspNameplate').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  inspPanelExpanded = !inspPanelExpanded;
  updateInspectPanel();
});
document.getElementById('inspMoveBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || selectedTower.moveCharges <= 0) return;
  enterMoveMode(selectedTower);
});
document.getElementById('cancelMoveBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  exitMoveMode();
});
// CA784 — see HISTORY.md § [1.5.7] Code Archaeology, CA784
const STAT_HOLD_DELAY_MS = 380, STAT_HOLD_REPEAT_MS = 65;
let statHoldTimer = 0;
function spendStatPoint(stat){
  if(!selectedTower || !selectedTower.allocateStat(stat)) return false;
  playSound('stat_spend');
  checkLegendaryStatus(selectedTower);
  updateInspectPanel();
  return true;
}
function stopStatHold(){ clearTimeout(statHoldTimer); statHoldTimer = 0; }
window.addEventListener('blur',stopStatHold);
function repeatStatHold(stat){
  if(document.hidden){ stopStatHold(); return; }
  if(!spendStatPoint(stat)){ stopStatHold(); return; }
  statHoldTimer = setTimeout(() => repeatStatHold(stat), STAT_HOLD_REPEAT_MS);
}
['str','dex','int'].forEach(stat => {
  const button = document.getElementById('insp' + stat[0].toUpperCase() + stat.slice(1) + 'Btn');
  button.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    stopStatHold();
    if(!spendStatPoint(stat)) return;
    statHoldTimer = setTimeout(() => repeatStatHold(stat), STAT_HOLD_DELAY_MS);
  });
  for(const endEvent of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(endEvent, stopStatHold);
});
document.getElementById('inspAuraBox').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  const strategy = TOWER_STRATEGY[selectedTower.type];
  if(!strategy) return;
  const tooltip = document.getElementById('auraTooltip');
  const wasHidden = tooltip.classList.contains('hidden');
  if(wasHidden){
    document.getElementById('auraTooltipIcon').textContent = strategy.icon;
    document.getElementById('auraTooltipText').textContent = strategy.text;
    playSound('click');
  }
  tooltip.classList.toggle('hidden', !wasHidden);
});
nextWaveBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  markFirstNextWaveCueAction();
  startNextWave();
});
const pauseBtn = document.getElementById('pauseBtn');
function resumeGame(){
  recordStateTransition('PLAYING'); gameState = 'PLAYING';
  audioEngine.setMusicPaused(false);
  lastTime = performance.now();
  if(pauseStartedAtReal !== null){ totalPausedMs += Date.now() - pauseStartedAtReal; pauseStartedAtReal = null; }
  pauseBtn.textContent = '⏸';
  pauseBtn.classList.remove('active');
  document.getElementById('pause-overlay').classList.add('hidden');
}
pauseBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  if(gameState === 'PLAYING'){
    recordStateTransition('PAUSED'); gameState = 'PAUSED';
    audioEngine.setMusicPaused(true);
    pauseStartedAtReal = Date.now(); // see totalPausedMs' own declaration — debug-log use only
    pauseBtn.textContent = '▶';
    pauseBtn.classList.add('active');
    document.getElementById('pause-overlay').classList.remove('hidden');
    render(ctx); // main loop won't render while paused — nudge one frame through now so the overlay actually appears immediately instead of waiting for the next pan/zoom to trigger a paint
  } else if(gameState === 'PAUSED'){
    resumeGame();
  }
});
// CA785 — see HISTORY.md § [1.5.7] Code Archaeology, CA785
document.addEventListener('keydown', (e) => {
  if(e.code !== 'Space' || e.repeat) return;
  if(document.querySelector('dialog[open]') || document.activeElement?.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement?.tagName) || document.activeElement?.closest?.('[role="button"]')) return;
  if(gameState === 'PLAYING'){
    e.preventDefault();
    unlockAudio();
    recordStateTransition('PAUSED'); gameState = 'PAUSED';
    audioEngine.setMusicPaused(true);
    pauseStartedAtReal = Date.now();
    pauseBtn.textContent = '▶';
    pauseBtn.classList.add('active');
    document.getElementById('pause-overlay').classList.remove('hidden');
    render(ctx);
  }
});
// CA786 — see HISTORY.md § [1.5.7] Code Archaeology, CA786
document.addEventListener('keydown', (e) => {
  if(gameState !== 'PAUSED' || e.defaultPrevented || e.repeat) return;
  if(document.querySelector('dialog[open]') || document.activeElement?.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement?.tagName) || document.activeElement?.closest?.('[role="button"]')) return;
  resumeGame();
});
// CA787 — see HISTORY.md § [1.5.7] Code Archaeology, CA787
document.addEventListener('visibilitychange', () => {
  if(document.hidden){
    stopStatHold();
    tabHiddenCount++;
    tabLastHiddenAt = Date.now();
  } else if(tabLastHiddenAt){
    tabTotalHiddenMs += Date.now() - tabLastHiddenAt;
    tabLastShownAt = Date.now();
  }
  if(document.hidden && gameState === 'PLAYING'){
    recordStateTransition('PAUSED'); gameState = 'PAUSED';
    pauseStartedAtReal = Date.now();
    pauseBtn.textContent = '▶';
    pauseBtn.classList.add('active');
    document.getElementById('pause-overlay').classList.remove('hidden');
  }
});
const shopBuyLifeBtn = document.getElementById('shopBuyLifeBtn');
shopBuyLifeBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  const cost = buyLifeCost();
  if(gold < cost) return;
  gold -= cost;
  lives += 1;
  livesBought++;
  trackGameEvent('life_purchased', { cost, lives_after:lives });
  playSound('ui_buy');
  updateHUD();
});
const speedBtn = document.getElementById('speedBtn');
const SPEED_LEVELS = [1, 2, 3, 5, MAX_SIMULATION_SPEED_MULTIPLIER];
speedBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  unlockAudio();
  const i = SPEED_LEVELS.indexOf(gameSpeed);
  gameSpeed = SPEED_LEVELS[(i + 1) % SPEED_LEVELS.length];
  markFirstSpeedUpUsed();
  trackGameEvent('game_speed_changed', { speed: gameSpeed });
  speedBtn.textContent = gameSpeed + 'x';
  speedBtn.classList.toggle('active', gameSpeed > 1);
});
document.getElementById('zoomInBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  zoomAt(CANVAS_W/2, CANVAS_H/2, camera.zoom*1.25);
});
document.getElementById('zoomOutBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  zoomAt(CANVAS_W/2, CANVAS_H/2, camera.zoom/1.25);
});
document.getElementById('zoomResetBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  centerCameraOnActiveRegion();
});
/* =========================================================
   DESIGN CONTRACT (load-time self-check, inside CONFIG)
   ========================================================= */
// SOURCE-SCAN-01 (1.8.5): the game is a set of script files, so rule-ID markers are looked up in the fetched source text. Pages that cannot fetch their own files (opened from disk) skip the scan instead of failing it.
let gameSourceText = null;
function sourceMentions(...markers){ return gameSourceText === null || markers.every(marker => gameSourceText.includes(marker)); }
function loadGameSourceText(){
  if(!/^https?:$/.test(location.protocol)) return Promise.resolve();
  const inlineText = [...document.scripts].filter(script => !script.src).map(script => script.textContent);
  return Promise.all([...document.scripts].filter(script => script.src).map(script => fetch(script.src).then(response => response.ok ? response.text() : Promise.reject(new Error(script.src)))))
    .then(parts => { gameSourceText = inlineText.concat(parts).join('\n'); })
    .catch(() => { gameSourceText = null; });
}
// VISUAL-DRIFT-01 (1.8.10) — see CHANGELOG.md § [1.8.10]: the established look of the title, top bar and buttons; a change to any of these needs the table and AGENTS.md updated in the same release
const LOOK_LOCKS = [
  ['titleWordmark', 'color', 'rgb(241, 196, 15)'], ['titleWordmark', 'fontFamily', 'Georgia, "Times New Roman", serif'],
  ['versionTag', 'color', 'rgb(245, 240, 230)'],
  ['playBtn', 'backgroundColor', 'rgba(10, 15, 8, 0.55)'], ['playBtn', 'borderRadius', '999px'],
  ['startSettingsBtn', 'borderRadius', '8px'], ['startChangesBtn', 'borderRadius', '8px'],
  ['buildBtn', 'color', 'rgb(58, 42, 0)'], ['buildBtn', 'borderRadius', '6px'],
  ['nextWaveBtn', 'color', 'rgb(58, 42, 0)'], ['settingsBtn', 'color', 'rgb(58, 42, 0)'],
  ['pauseBtn', 'backgroundColor', 'rgba(74, 47, 29, 0.85)'], ['speedBtn', 'backgroundColor', 'rgba(74, 47, 29, 0.85)'],
  ['goldVal', 'color', 'rgb(241, 196, 15)'], ['livesVal', 'color', 'rgb(255, 158, 150)'],
  ['wavePhase', 'color', 'rgb(185, 215, 255)'], ['wavePhase', 'backgroundColor', 'rgba(0, 0, 0, 0.3)'], ['wavePhase', 'borderRadius', '4px'],
  ['hud-top', 'fontFamily', '"Trebuchet MS", Verdana, sans-serif']
];
function validateLookLocks(){
  const drifted = [];
  for(const [elementId, property, expected] of LOOK_LOCKS){
    const element = document.getElementById(elementId);
    if(!element){ drifted.push(elementId + ' is missing'); continue; }
    const actual = getComputedStyle(element)[property];
    if(actual !== expected) drifted.push(elementId + '.' + property + ' is ' + actual + ', expected ' + expected);
  }
  return drifted;
}
function validateDesignContract(){
  const problems = validateRangeBalance();
  for(const drift of validateLookLocks()) problems.push('look changed: ' + drift + ' (VISUAL-DRIFT-01)');
  if([...document.scripts].some(script => /\/js\//.test(script.src) && new URL(script.src).searchParams.get('v') !== GAME_VERSION)) problems.push('every script tag in index.html must carry ?v= matching GAME_VERSION (SCRIPT-VERSION-01)');
  if(String(render).lastIndexOf('drawBarks(ctx);') < String(render).lastIndexOf('drawTowerScroll(ctx,it.t,it.scrollY)')) problems.push('chat bubbles must draw above scrolls (CHAT-OVERLAY-01)');
  if(!String(serializeGameState).includes('presentationClockMs') || !String(restoreGameStateInner).includes('restoreSceneryClock')) problems.push('scenery save timestamps must rebase across sessions (SCENERY-SAVE-CLOCK-01)');
  if(expansionLevel === 0 && !ringCandidateRegion){
    let startingGrassTiles = 0;
    for(const key of nearPathTileSet){ const [borderX, borderY] = key.split(',').map(Number); if(isInActiveRegion(borderX, borderY)) startingGrassTiles++; }
    if(pathCells.size !== STARTING_PATH_TILE_COUNT || startingGrassTiles !== STARTING_GRASS_TILE_COUNT) problems.push('a new game must start with ' + STARTING_PATH_TILE_COUNT + ' path tiles and ' + STARTING_GRASS_TILE_COUNT + ' grass tiles, found ' + pathCells.size + ' and ' + startingGrassTiles + ' (STARTING-MAP-01)');
  }
  if(!String(update).includes('if(countLooseEnemies() === 0) freeExpansionOwed++')) problems.push('escaped enemies at wave end forfeit the free expansion (CLEAN-WAVE-EXPAND-01)');
  if(!String(forensicBlockerAlongPath).includes('sceneryMap.values()') || !String(drawDepthSortedLayer).includes('drawBloodStains(ctx, it.item)')) problems.push('scenery catches and displays blood (BLOOD-SURFACES-01)');
  if(bloodPoolSizeScale(7.5) !== 0.5 || bloodPoolSizeScale(15) !== 1 || bloodPoolSizeScale(30) !== 2) problems.push('blood scale follows enemy weight (BLOOD-WEIGHT-01)');
  // The border rule is checked with the starting lock lifted, so it still guards the rule at boot even though
  // a new game deliberately shows only 2 of its grass tiles until the first expansion (STARTING-MAP-01).
  const lockedAtBoot = [...pendingRevealTileKeys];
  pendingRevealTileKeys.clear();
  const missingBorderTiles = countMissingPathBorderTiles();
  for(const lockedKey of lockedAtBoot) pendingRevealTileKeys.add(lockedKey);
  if(missingBorderTiles) problems.push('path border: ' + missingBorderTiles + ' tile(s) touching the route are not buildable green (PATH-BORDER-01)');
  const poleContrast = contrastRatioOfHex(FLAG_POLE_COLOR, DIRT_BACKGROUND_COLOR);
  if(poleContrast < POLE_MIN_CONTRAST_RATIO) problems.push('flag pole contrast against dirt is ' + poleContrast.toFixed(2) + ':1, needs at least ' + POLE_MIN_CONTRAST_RATIO + ':1 (FLAG-POLE-CONTRAST-01)');
  const dirtLuminance = relativeLuminanceOfHex(DIRT_BACKGROUND_COLOR);
  if(!(relativeLuminanceOfHex(PATH_TILE_DARK) < dirtLuminance && dirtLuminance < relativeLuminanceOfHex(PATH_TILE_LIGHT))) problems.push('path tones must run darker than the dirt background < dirt background < lighter than it (PATH-CHESS-01)');
  for(const [toneName, toneHex] of [['PATH_TILE_DARK', PATH_TILE_DARK], ['PATH_TILE_LIGHT', PATH_TILE_LIGHT]]){
    const saturation = saturationOfHex(toneHex);
    if(saturation < PATH_TILE_MIN_SATURATION) problems.push(toneName + ' is too grey (saturation ' + saturation.toFixed(2) + ', needs at least ' + PATH_TILE_MIN_SATURATION + '); the owner rejected a grey taupe path (PATH-CHESS-01)');
  }
  for(let gx=0; gx<6; gx++){
    for(let gy=0; gy<6; gy++){
      for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const neighborIsLightGreen = isLightBuildableTile(gx+dx, gy+dy);
        if(isDarkPathTile(gx, gy) !== neighborIsLightGreen){
          problems.push('checkerboard broken at tile ' + gx + ',' + gy + ': a dark dirt tile must touch light green and a light dirt tile dark green (PATH-CHESS-01)');
          gx = gy = 6; break;
        }
      }
    }
  }
  const archerStart = CONFIG.TOWERS.ARCHER.tiers[0].range;
  if(interpolateRangeByInt(archerStart, RANGE_CAPS.ARCHER, 0.5) !== Math.round((archerStart + RANGE_CAPS.ARCHER)/2)) problems.push('range must grow linearly with INT: 250 INT is the midpoint between the starting range and the cap (RANGE-CURVE-01)');
  if(interpolateRangeByInt(archerStart, RANGE_CAPS.ARCHER, 1) !== RANGE_CAPS.ARCHER) problems.push('range at 500 INT must equal the class cap (RANGE-CURVE-01)');
  if(PATH_BUILDABLE_MARGIN < MIN_PATH_BUILDABLE_MARGIN) problems.push('PATH_BUILDABLE_MARGIN is ' + PATH_BUILDABLE_MARGIN + ', below ' + MIN_PATH_BUILDABLE_MARGIN + '; the route needs a green tile touching it on every side (PATH-BORDER-01)');
  if(PATH_BUILDABLE_MARGIN > MAX_PATH_BUILDABLE_MARGIN) problems.push('PATH_BUILDABLE_MARGIN is ' + PATH_BUILDABLE_MARGIN + ', above ' + MAX_PATH_BUILDABLE_MARGIN + '; two tiles of green around the route was too much grass (MAP-CORRIDOR-01)');
  if(PATH_PEBBLE_TILE_CHANCE > MAX_PATH_PEBBLE_TILE_CHANCE) problems.push('PATH_PEBBLE_TILE_CHANCE is ' + PATH_PEBBLE_TILE_CHANCE + ', above ' + MAX_PATH_PEBBLE_TILE_CHANCE + '; pebbles must stay sparse and subtle (GROUND-DETAIL-01)');
  if(STARTER_PEBBLE_TILES_MAX > MAX_STARTER_DETAIL_TILES || STARTER_TUFT_TILES_MAX > MAX_STARTER_DETAIL_TILES) problems.push('the starting map may carry at most ' + MAX_STARTER_DETAIL_TILES + ' pebble tiles and ' + MAX_STARTER_DETAIL_TILES + ' tuft tiles: only "a few" on the first path and grass blocks (GROUND-DETAIL-RUN-01)');
  if(starterPebbleTileKeys.size < 1 || starterPebbleTileKeys.size > MAX_STARTER_DETAIL_TILES || starterTuftTileKeys.size < 1 || starterTuftTileKeys.size > MAX_STARTER_DETAIL_TILES) problems.push('the starting map must have between 1 and ' + MAX_STARTER_DETAIL_TILES + ' pebble tiles and tuft tiles, found ' + starterPebbleTileKeys.size + ' and ' + starterTuftTileKeys.size + ' (GROUND-DETAIL-RUN-01)');
  const savedRunSeed = groundDetailRunSeed;
  groundDetailRunSeed = 1; seedTileRandom(5, 5, 1); const firstDrawSeedA = nextTileRandom();
  groundDetailRunSeed = 2; seedTileRandom(5, 5, 1); const firstDrawSeedB = nextTileRandom();
  groundDetailRunSeed = savedRunSeed;
  if(firstDrawSeedA === firstDrawSeedB) problems.push('ground details must depend on the per-run seed so every game is unique (GROUND-DETAIL-RUN-01)');
  if(!(Math.sin(IDLE_GRIP_ARM_ANGLE) > 0.5)) problems.push('IDLE_GRIP_ARM_ANGLE must point the idle weapon arm downward, not raise it (IDLE-GRIP-01)');
  if(advanceLooseDrain(0, LOOSE_ENEMY_LIFE_DRAIN_MS - 1).hearts !== 0 || advanceLooseDrain(0, LOOSE_ENEMY_LIFE_DRAIN_MS).hearts !== 1 || advanceLooseDrain(0, LOOSE_ENEMY_LIFE_DRAIN_MS*2).hearts !== 2 || LOOSE_ENEMY_LIFE_DRAIN_MS !== 6000) problems.push('each loose enemy must cost exactly 1 life per 6 seconds (LOOSE-DRAIN-01)');
  {
    const fighter={active:true,type:'SWORDSMAN',hp:95,maxHp:100,disabledWavesLeft:0};
    if(runRecoveryHp(fighter)!==5 || runRecoveryHp({...fighter,hp:20})!==20 || runRecoveryHp({...fighter,disabledWavesLeft:1})!==0 || runRecoveryHp({...fighter,hp:0})!==0 || runRecoveryHp({...fighter,active:false})!==0 || runRecoveryHp({...fighter,type:'BARRICADE'})!==0) problems.push('milestone recovery must cap standing-fighter healing and exclude downed, zero-HP, inactive units and barricades (RUN-RECOVERY-01)');
  }
  if(showLivesChange.length !== 1 || !document.getElementById('livesChangePop')) problems.push('lives changes must pop beside the health counter (LIVES-POP-01)');
  { const santaLine = document.getElementById('consentSantaLine');
    const santaFace = document.getElementById('consentSantaFace');
    const consentButton = document.getElementById('consentAccept');
    const consentDecline = document.getElementById('consentDecline');
    const consentBanner = document.getElementById('consent-banner');
    if(!santaFace || !santaLine || !santaLine.textContent.includes('naughty or nice') || !consentButton || consentButton.textContent.trim() !== '🍪 Give Santa Cookies' || !consentDecline || consentDecline.textContent.trim() !== '🥷 Play Stealth' || !consentBanner || consentBanner.querySelectorAll('button').length !== 2 || !String(window.declineStickTDAnalyticsConsent).includes("'denied'")) problems.push('the Santa consent notice must offer clear accept and decline actions (ANALYTICS-CHOICE-01)');
  }
  { const settingsButton = document.getElementById('startSettingsBtn');
    const qualityPicker = document.getElementById('quality-picker');
    const goreOption = document.getElementById('settingsGoreToggle');
    const firstBuildHint = document.getElementById('first-build-hint');
    const firstSpeedHint = document.getElementById('first-speed-hint');
    if(!settingsButton || !qualityPicker || settingsButton.parentElement.id !== 'start-screen' || qualityPicker.contains(settingsButton) || settingsButton.textContent.trim() !== '⚙️ Options' || !goreOption || document.getElementById('goreToggle') || Array.from(document.querySelectorAll('label,p,button')).some(element => element.textContent.includes('I am 18+'))) problems.push('attract options are a labelled gear button at the bottom right, apart from the graphics quality choice, and gore has no age-gate prompt (FIRST-START-OPTIONS-01)');
    if(typeof placeNotificationBell !== 'function' || !String(fitHudTopToOneLine).includes('placeNotificationBell') || !String(positionNotificationControls).includes('floatingBell')) problems.push('the notification bell sits flush at the top left of the screen and joins the top bar only when the screen is too narrow to leave room for it (NOTIFICATION-BELL-LEFT-01)');
    if(typeof drawWeaponEnchant !== 'function' || !String(drawStickman).includes('drawWeaponEnchant') || typeof enemyMoveMultiplier !== 'function' || typeof isEnemyHeldInPlace !== 'function' || typeof Enemy.prototype.showDotDamageText !== 'function' || typeof Enemy.prototype.checkLivestockPairHearts !== 'function') problems.push('element glow is drawn on the weapon, stuck arrows slow enemies and held enemies hold the queue, damage-over-time numbers are summed per second, and farm hearts need a pair (WEAPON-ENCHANT-SYNC-01, ARROW-DRAG-01, QUEUE-HOLD-01, DOT-TEXT-01, LIVESTOCK-PAIR-HEART-01)');
    if(typeof drawStickmanBloodStains !== 'function' || !String(drawStickman).includes('drawStickmanBloodStains') || !String(Enemy.prototype.draw).includes('drawEmojiSurfaceBlood')) problems.push('blood follows live body geometry and uses surface masks (BODY-BLOOD-ATTACH-01)');
    if(!String(Tower.prototype.targetScore).includes("case 'LAST'") || !document.getElementById('settingsBloodDropletsToggle') || !String(launchForensicDroplet).includes('bloodDropletsEnabled')) problems.push('LAST targeting and an independent droplet option remain available (TARGET-LAST-01, BLOOD-DROPLETS-OPTION-01)');
    for(const key of bonusGrassTiles){
      const [gx,gy] = key.split(',').map(Number);
      if(!pathCells.has(key) && !livestockOnGrass({x:(gx+0.5)*TILE_SIZE,y:(gy+0.5)*TILE_SIZE})) problems.push('bonus grass must support egg growth (EGG-ALL-GRASS-01)');
    }
    if(!SHOVEL_ITEM.isReusable || FIXED_SCENERY_SCALE.BIRD_NEST > 0.22 || FIXED_SCENERY_SCALE.PICNIC !== FIXED_SCENERY_SCALE.BUSH || typeof drawClearingHourglass !== 'function') problems.push('shovels are reusable, nests/baskets stay compact and clearing hourglasses overlay the world (SHOVEL-REUSABLE-01, PROP-SIZE-01, CLEAR-OVERLAY-01)');
    if(LIVESTOCK_ADULT_ROUNDS !== 7 || livestockAdultRounds({type:'CHICKEN'}) !== 6 || !String(applyLivestockGrowthSize).includes('🥚') || FIXED_SCENERY_SCALE.BIRD_NEST > 0.35) problems.push('animals grow for seven rounds, chickens spend three as eggs and three as chicks, and nests stay small (ANIMAL-GROWTH-01, NEST-NEAR-TREE-01)');
    if(tinyGruntEvasion({type:'GRUNT',sizeTier:'TINY'}) !== 0.15 || attackMissChance(0,{type:'GRUNT',sizeTier:'TINY'}) !== 0.15 || tinyGruntEvasion({type:'GRUNT',sizeTier:'SMALL'}) !== 0) problems.push('only existing Tiny Grunts have an additional 15% evasion, including melee (TINY-GRUNT-EVASION-01)');
    if(heartBeatScale(90) <= 1 || !document.getElementById('livesHeart')) problems.push('HUD and flying damage hearts beat (HEART-BEAT-01)');
    if(Object.values(TOWER_STRATEGY).some(entry => /\bevol|\bupgrad/i.test(entry.text)) || Object.values(CONFIG.TOWERS).some(def => /\bevol|\bupgrad/i.test(def.blurb || ''))) problems.push('classes are unlocks, never upgrades or evolutions, so player-facing class text must not say evolve or upgrade (NO-EVOLVE-IN-PLACE-01, CLASS-UNLOCK-WORDING-01)');
    if(typeof fetchChangelogText !== 'function' || !String(loadChangelogEntries).includes('first.partial') || !String(renderSettingsChangelog).includes('Loading release notes')) problems.push('the Changes tab fetches only the top of the changelog, shows a loading line and always ends with a message or the notes plus a link, never a blank box (CHANGES-TAB-01)');
    if(typeof meleeLungePx !== 'function' || typeof drawMeleeSmear !== 'function' || typeof Tower.prototype.visualSwingOffset !== 'function' || !String(drawStickman).includes('drawMeleeSmear')) problems.push('melee attacks wind up, strike and settle back onto the aim without snapping, with a smear behind the blade and a thrust for spears (MELEE-SWING-01)');
    if(document.getElementById('training-overlay') || !firstBuildHint || firstBuildHint.textContent.trim() !== '👆' || firstBuildHint.parentElement.id !== 'buildBtnWrap' || !String(firstBuildHint.className).includes('hidden')) problems.push('first-time guidance is only a hidden-until-play hand beside Build, with no tower-choice or victory modal (FIRST-BUILD-CUE-01)');
    const firstNextWaveHint = document.getElementById('first-next-wave-hint');
    if(!firstSpeedHint || firstSpeedHint.textContent.trim() !== '👆' || firstSpeedHint.parentElement.id !== 'speedBtnWrap' || !firstNextWaveHint || firstNextWaveHint.textContent.trim() !== '👆' || firstNextWaveHint.parentElement.id !== 'nextWaveBtnWrap' || !String(startNextWave).includes('markFirstWaveStarted') || !String(markFirstNextWaveCueAction).includes('markFirstNextWaveUsed') || !String(syncFirstPlayCues).includes('!sequenceStarted && !sequenceDismissed && firstFighterWasBuilt()') || !String(markFirstSpeedUpUsed).includes("classList.add('hidden')")) problems.push('first-use guidance must show Next Wave after the first fighter is built and before wave one, then Fast Forward after wave start, and stay dismissed after speed use (FIRST-PLAY-CUE-SEQUENCE-01)');
  }
  if(!window.trackEvent || !String(window.trackEvent).includes('sticktdAnalyticsReady') || !window.enableStickTDAnalytics || !String(window.enableStickTDAnalytics).includes('appendChild(script)') || !String(window.declineStickTDAnalyticsConsent).includes("'denied'") || !String(window.disableStickTDAnalytics).includes("'denied'") || !document.getElementById('analyticsConsentBtn') || !window.openStickTDAnalyticsChoice) problems.push('analytics stays fully gated before opt-in and players can decline or review their choice in Settings (ANALYTICS-CONSENT-01)');
  if(window.detectPlayPlatform('gamejolt.com','',false,'') !== 'gamejolt' || window.detectPlayPlatform('itch.io','',false,'') !== 'itch.io' || window.detectPlayPlatform('sauerninja.github.io','',false,'') !== 'github-pages' || window.detectPlayPlatform('example.org','',true,'') !== 'embedded') problems.push('analytics identifies its host platform, including an unknown embedded host (PLATFORM-DETECT-03)');
  if(ENEMY_WALK_SPEED_SCALE > 0.3 || ENEMY_SPAWN_GAP_MS < 4500) problems.push('enemies must walk very slowly and arrive well spaced: walk speed scale at most 0.3 and at least 4.5 seconds between spawns (ENEMY-PACE-01)');
  if(![...FOOD_ITEMS, ...TREAT_ITEMS, ...STIM_ITEMS, ...MEAL_ITEMS, ...HUT_LOOT_ITEMS, ...LOOT_TONIC_ITEMS, SHOVEL_ITEM].every(isConsumableDef)) problems.push('every consumable must be stored in a stickman\'s slots and used by a click or hotkey, never on the spot (CONSUMABLE-STORED-01)');
  if(!(TREE_ROCK_SIZE_FRAC_AT_MIDDLE + TREE_ROCK_SIZE_FRAC_SLOPE + TREE_ROCK_SIZE_FRAC_SPREAD/2 < END_RING_MIN_SIZE_FRAC && END_GUARD_MAX_SIZE_FRAC <= END_RING_MIN_SIZE_FRAC && TREE_ROCK_SIZE_FRAC_AT_MIDDLE < TREE_ROCK_SIZE_FRAC_AT_MIDDLE + TREE_ROCK_SIZE_FRAC_SLOPE && HARVESTED_TILE_KEEP_FACTOR < 0.5)) problems.push('scenery: the ring tiles at the road ends hold the biggest pieces, size shrinks toward the middle, and cleared tiles rarely regrow trees or rocks (SCENERY-GRADIENT-01)');
  if(!String(buildTowerModal).includes('Stickmen Defenders') || !String(buildTowerModal).includes("addBuildSection('Fortifications')") || String(buildTowerModal).includes('Starter defenders') || String(buildTowerModal).includes('Specialist defenders')) problems.push('all available fighter characters must share Stickmen Defenders, with fortifications and locked characters in their own sections (BUILD-MENU-GROUPS-02)');
  if(!(String(buildTowerModal).indexOf("addBuildSection('Structures')") >= 0 && String(buildTowerModal).indexOf("addBuildSection('Structures')") < String(buildTowerModal).indexOf("addBuildSection('Stickmen Defenders')"))) problems.push('Structures (Expand) must be the first section in Build (BUILD-MAP-GROWTH-ORDER-01)');
  if(document.getElementById('notification-filters') || /notificationFilter|notificationCategory/.test(String(renderNotificationPanel) + String(recordNotification))) problems.push('the notification inbox must use one unfiltered list without category buttons (NOTIFICATION-INBOX-SIMPLE-01)');
  if(String(Enemy.prototype.draw).includes('this.radius*1.08') || String(Enemy.prototype.draw).includes('this.pack &&') || String(Tower.prototype.draw).includes('rgba(255,255,255,0.25)')) problems.push('enemy hit flashes, wolf packs and selected units must not draw white outline circles (NO-WHITE-HALO-01)');
  { const popupStack = document.getElementById('notification-popups');
    if(!popupStack || ['unlock-toast','wave-summary-toast','new-enemy-toast','killstreak-banner'].some(id => document.getElementById(id)?.parentElement !== popupStack) || !document.getElementById('notification-detail-popup') || !String(openNotificationEntry).includes('popup.showModal()')) problems.push('gameplay notifications must share the top-left popup stack and open their explanation when selected (NOTIFICATION-EXPLAIN-01)');
  }
  if(TREE_ROCK_TREE_SHARE_ON_EXPANSION !== 0.60 || Math.round((1-TREE_ROCK_TREE_SHARE_ON_EXPANSION)*100) !== 40 || treeRockKeepChance(0, 'contract') > 0.11 || treeRockKeepChance(0.5, 'contract') >= 0.4 || treeRockKeepChance(1, 'contract') !== 1) problems.push('expansion trees and stones must stay near a 60/40 mix with sparse middle scenery and denser road ends (EXPANSION-SCENERY-BALANCE-01)');
  if(DECAL_LIFESPAN!==75000 || BLOOD_STAIN_LIFE_MS!==75000 || typeof birthLivestockPairs!=='function' || LIVESTOCK_BREED_REST_ROUNDS!==3 || FIXED_SCENERY_SCALE.CHEST!==0.48) problems.push('Blood fades in60–90s, birth needs a saved mature pair with three-round rest, and props keep corrected sizes (BLOOD-LIFETIME-01, LIVESTOCK-PARENTS-01, PROP-SIZE-02).');
  if(String(updateWalkingBlood).includes('b.dx +=') || !String(landForensicDroplet).includes('pushSprayDecal') || !String(stampSettledDecal).includes('drawOneDecal')) problems.push('Ground puddles stay fixed, optional spray uses its own budget, and baking preserves live geometry (BLOOD-GROUND-FIXED-01, BLOOD-SPRAY-BUDGET-01).');
  if(!isInstantOpenProp({type:'BUSH'}) || (!String(Enemy.prototype.applyDamage).includes('spawnWeaponBloodContact') || !String(spawnWeaponBloodContact).includes('spawnSwordsmanBloodArc(victim,sourceTower)'))) problems.push('Potted plants collect instantly; landed sword hits retain the circular ground blood signature (POTTED-INSTANT-01, SWORD-BLOOD-ARC-01).');
  if(sceneryClearCost({ type:'BUSH', clearCost:0 }) !== 0) problems.push('the potted plant must be free to harvest (POTTED-BUSH-FREE-01)');
  if(enemyHealthAtWeight('GRUNT',2,1,false)!==2*enemyHealthAtWeight('GRUNT',1,1,false) || enemyHealthAtWeight('GRUNT',1,1,true)!==1) problems.push('Weight HP and tiny exception (WEIGHT-HP-181).');
  if(String(drawBranchSprite).includes('🪾') || typeof branchRandomFor !== 'function' || String(tryCollectAmbientLog).includes('log.count--')) problems.push('Branches are small scattered sticks of random size and orientation, never a tree glyph, and collect once (BRANCH-STICKS-01, BRANCH-PICKUP-03).');
  if(String(drawMap).includes('drawOuterWastelandTrees(ctx)') || !String(maybeSpawnAmbientLog).includes('nearPathTileSet.has(key)')) problems.push('Only collectible branches belong on unrevealed dirt (BRANCH-WASTELAND-02).');
  if(SMALL_SCENERY_SIZE_MULTIPLIER !== 0.5 || smallSceneryHarvestCost(100) !== 50 || SMALL_SCENERY_BUDDY_CHANCE <= 0 || SMALL_SCENERY_BUDDY_CHANCE > 1) problems.push('nearby small trees and rocks must be half scale, half harvest cost and use a bounded spawn chance (SMALL-SCENERY-CLUSTERS-01)');
  if(!Object.values(ITEM_USE_CLASSES).every(itemClass => itemClass.color && itemClass.notes.length >= 2) || ITEM_USE_HOLD_MS_BY_TIER.length !== 3) problems.push('every item class needs a colour and a sound motif, and each tier a hold time (ITEM-USE-FEEDBACK-01)');
  { const lane = acquireActive(enemyPool);
    if(lane) lane.active = true;
    const wanderer = lane ? acquireActive(enemyPool) : null;
    if(lane && wanderer){
      lane.id = idCounter++; wanderer.id = idCounter++;
      lane.active = true; lane.isLivestock = false; lane.x = 100; lane.y = 100; lane.radius = 15; lane.prevX = 100; lane.prevY = 100; lane.vx = 0; lane.vy = 0; lane.hp = 1; lane.maxHp = 1;
      wanderer.active = true; wanderer.isLivestock = true; wanderer.isHostileNpc = true; wanderer.x = 104; wanderer.y = 100; wanderer.radius = 15; wanderer.prevX = 104; wanderer.prevY = 100; wanderer.vx = 0; wanderer.vy = 0; wanderer.hp = 1; wanderer.maxHp = 1;
      resolveEnemyCollisions(); resolveSweptEnemyCollisions();
      if(lane.x !== 100 || lane.y !== 100 || wanderer.x !== 104 || wanderer.y !== 100) problems.push('wandering livestock and the troll must phase through lane enemies, never pushing or being pushed (WANDERER-PHASE-01)');
      lane.active = false; wanderer.active = false; wanderer.isLivestock = false; wanderer.isHostileNpc = false;
    }
  }
  if(!GOLD_BAG_ITEM.isGoldBag || isConsumableDef(GOLD_BAG_ITEM) || GOLD_BAG_LIFESPAN_MS < 120000) problems.push('a gold bag is an ordinary ground item that opens only when clicked or dropped on a stickman and keeps its gold if it leaves the ground (GOLD-BAG-ITEM-01)');
  if(GOLD_BAG_MIN_GOLD !== 1 || GOLD_BAG_MAX_GOLD !== 100 || normalizeGoldBagGold(0) !== 1 || normalizeGoldBagGold(1000) !== 100 || GOLD_BAG_MIN_COINS !== 3 || GOLD_BAG_MAX_COINS !== 9 || GOLD_BAG_MIN_COIN_VALUE !== 1 || GOLD_BAG_MAX_COIN_VALUE !== 25 || Tower.prototype.receiveItem.call({ type:'SWORDSMAN', equippedItems:[] }, GOLD_BAG_ITEM) !== false || !String(openGoldBag).includes('spawnGoldBagCoinBurst') || !String(creditGroundBagGold).includes('spawnGoldBagCoinBurst')) problems.push('Gold Bags distribute their 1–100 total Gold once through collectible coins (fewer for totals below three), and stay out of inventory (GOLD-BAG-COIN-BURST-01)');
  if(AMBIENT_LOG_INTERVAL_MS !== 45000 || AMBIENT_LOG_WOOD !== 15 || AMBIENT_LOG_MAX_ON_BOARD !== 12 || !String(tryCollectAmbientLog).includes('wood += logWood') || !String(handleTap).includes('tryCollectAmbientLog')) problems.push('wasteland branches should appear on a 45-second active-play cadence, remain clickable, and grant wood without entering inventory (AMBIENT-LOG-01)');
  if(!/spawnParticles\(tile\[0\]\*TILE_SIZE/.test(String(maybeSpawnChanceStructures)) || /\bitem\./.test(String(maybeSpawnChanceStructures))) problems.push('chance structure effects must use their selected tile coordinates and never reference an undefined item (CHANCE-STRUCTURE-SPAWN-CRASH-01)');
  if(!String(applyStimItem).includes('expiresAfterWave') || !String(clearRoundBuffs).includes('expiresAfterWave') || !String(useStoredConsumable).includes('!tower.active')) problems.push('round-only scope and combat consumables must expire at wave end and safely ignore stale inventory actions (ROUND-BUFF-LIFETIME-01)');
  if(itemDefinitionForSavedId('LUCKY_COIN') !== ITEM_BY_ID.get('BRASS_COMPASS')) problems.push('legacy Lucky Coin equipment must restore as Brass Compass (LUCKY-COIN-RETIRE-01)');
  { const migrated = applyLegacyLuckyCoinMigration({ id: 'BRASS_COMPASS', str: 0, dex: 1, int: 1 }, 'LUCKY_COIN', false);
    const reloaded = applyLegacyLuckyCoinMigration({ id: 'BRASS_COMPASS', str: 0, dex: 1, int: 1 }, 'BRASS_COMPASS', true);
    if(migrated.str !== 1 || reloaded.str !== 1 || !reloaded.legacyLuckyCoin) problems.push('Lucky Coin save migration preserves its stat and marker (LUCKY-COIN-RETIRE-01)');
  }
  { const contractBarricade = [...activeBarricades][0];
    if(contractBarricade && findTouchingBarricade({ x: contractBarricade.x, y: contractBarricade.y, radius: 15, isLivestock: true }) !== null) problems.push('livestock and the troll never touch a barricade (WANDERER-PHASE-01)');
  }
  if(randomEventEndpointRouteDistance(3, 1, 10, true) !== 4 || randomEventEndpointRouteDistance(6, 1, 10, false) !== 4) problems.push('random events target tiles 3–5 route steps from opposite endpoints (RANDOM-EVENT-SLOT-01)');
  if(randomEventHostileAllowed(4) || !randomEventHostileAllowed(5)) problems.push('hostile random events remain gated until wave 5 (RANDOM-EVENT-SLOT-01)');
  { const slotsWasUsed = randomEventSlotsUsed;
    openRandomEventSlot();
    const claims = [tryClaimRandomEventSlot(), tryClaimRandomEventSlot(), tryClaimRandomEventSlot()];
    if(!claims[0] || !claims[1] || claims[2] || randomEventSlotsUsed !== 2) problems.push('at most two random events can claim slots per expansion (RANDOM-EVENT-SLOT-01)');
    randomEventSlotsUsed = slotsWasUsed;
  }
  if(!isWithinEmojiSquare(10, -10, 0, 0, 20) || isWithinEmojiSquare(10.5, 0, 0, 0, 20) || isWithinEmojiSquare(0, -10.5, 0, 0, 20)) problems.push('the click area of an emoji is exactly its drawn square (EMOJI-HITBOX-01)');
  if(String(Tower.prototype.findTarget).includes('minimumTargetDistance') || String(Tower.prototype.update).includes('minimumTargetDistance')) problems.push('fighters must attack close targets without a minimum-range exclusion');
  if(!String(drawSelectedTowerRange).includes('tower.targetingRange') || !String(drawSelectedTowerRange).includes('RANGE_RING_DOT_PX') || !String(Enemy.prototype.spawn).includes('this.deathResolved = false') || !String(Enemy.prototype.die).includes('setMarkedTarget(null)')) problems.push('selected tactical reach and pooled pin/death lifecycle must remain protected');
  { const oversized = Object.entries(TELEMETRY_EVENTS).filter(([name, declared]) => name.length > 40 || new Set([...TELEMETRY_SHARED_PARAMS, ...declared, 'send_to']).size > 25 || declared.some(param => param.length > 40)).map(([name]) => name); // Google Analytics limits: 40 characters per event or parameter name, 25 parameters per event
    if(oversized.length) problems.push('analytics events over the Google Analytics limits (40-character names, 25 parameters): ' + oversized.join(', ') + ' (ANALYTICS-PARAMS-01)');
  }
  if(ATTRACT_ENEMY_MOVE_SCALE !== 0.60) problems.push('attract movement must remain 40% slower without changing gameplay (ATTRACT-PACE-01)');
  if(Object.keys(CONFIG.TOWERS).some(type => !WEAPON_BLOOD_PROFILES[type]) || !Object.isFrozen(WEAPON_BLOOD_PROFILES) || Object.values(WEAPON_BLOOD_PROFILES).some(profile => !Object.isFrozen(profile))) problems.push('every class needs an immutable explicit weapon blood profile (WEAPON-FORENSICS-01)');
  if(window.detectPlayPlatform('sauerninja.github.io','https://itch.io/',false,'?utm_source=itch') !== 'github-pages' || window.detectPlayPlatform('cdn.example','https://sauerninja.itch.io/',true,'') !== 'itch.io') problems.push('host platform must not be overwritten by campaign or top-level referrer (ANALYTICS-ACCURACY-01)');
  if(!/^(web|android|(windows|macos|linux|desktop)-[a-z0-9_]+)$/.test(window.STICKTD_BUILD || '') || !String(window.trackEvent).includes('STICKTD_BUILD') || !String(trackGameEvent).includes('STICKTD_BUILD')) problems.push('analytics events and telemetry name the exact build: web, android or system-architecture (ANALYTICS-BUILD-01)');
  if(document.querySelector('meta[name="application-version"]').content !== GAME_VERSION || !String(window.enableStickTDAnalytics).includes('send_page_view:false') || !String(window.disableStickTDAnalytics).includes('ga-disable-')) problems.push('analytics version, single page view and revoke guard must stay aligned (ANALYTICS-ACCURACY-01)');
  { const reservedAnalyticsParams = ['source', 'medium', 'campaign', 'term', 'content', 'value', 'currency'];
    const offending = Object.entries(TELEMETRY_EVENTS).filter(([, declared]) => declared.some(param => reservedAnalyticsParams.includes(param))).map(([name]) => name);
    if(offending.length) problems.push('analytics events must not use parameter names Google Analytics reads as traffic source or revenue (source, medium, campaign, term, content, value, currency): ' + offending.join(', ') + ' (ANALYTICS-PARAMS-01)');
  }
  { const scratchEnemy = new Enemy(); scratchEnemy.bleedUntil = 0; scratchEnemy.bleedStackDamages = [];
    scratchEnemy.applyBleed(7, 1000, null); const oneArrow = scratchEnemy.bleedDamagePerTick;
    scratchEnemy.applyBleed(7, 1000, null); scratchEnemy.applyBleed(7, 1000, null); const threeArrows = scratchEnemy.bleedDamagePerTick;
    if(oneArrow <= 0 || threeArrows !== 3 * oneArrow) problems.push('bleed damage per tick must multiply with the number of stuck arrows: three arrows deal three times one (BLEED-MULTIPLIES-01)');
  }
  { const probeTime = performance.now();
    const stale = lastCameraInteractionAt; lastCameraInteractionAt = -1e9;
    const idleActive = isCameraMotionActive(probeTime);
    markCameraInteraction(); const movingActive = isCameraMotionActive(performance.now());
    lastCameraInteractionAt = stale;
    if(idleActive || !movingActive || !String(loop).includes('isCameraMotionActive')) problems.push('camera motion must render at the screen\'s full refresh rate, never at the frame-rate limit: isCameraMotionActive() must be true while the camera moves and the main loop must consult it (CAMERA-SMOOTH-01)');
  }
  if(PROJECTILE_AMMO_BY_TOWER.ARCHER !== undefined || Object.values(PROJECTILE_AMMO_BY_TOWER).includes('ARROW')) problems.push('only the Archer shoots arrows: every other ranged tower needs its own ammo kind (AMMO-KIND-01)');
  if(!bleedSourceAllowed({ type: 'ARCHER' }) || !bleedSourceAllowed({ type: 'BLOWDART' }) || !bleedSourceAllowed({ type: 'GATLING' }) || ['SWORDSMAN', 'MAGE'].some(type => bleedSourceAllowed({ type }))) problems.push('only real projectile weapons can stick and cause bleed (PROJECTILE-STICK-01)');
  if(projectileStickKind({ type: 'AXEMAN', axeMode: 'RANGE' }) !== 'AXE' || bleedSourceAllowed({ type: 'AXEMAN', axeMode: 'MELEE' })) problems.push('only a thrown Axeman axe can stick and bleed, never a melee swing (PROJECTILE-STICK-01)');
  if(Object.keys(PRIMARY_DAMAGE_STAT_OVERRIDE).length) problems.push('every Archer-archetype class must scale direct damage with DEX; STR affects projectile sticking only (ARCHER-DEX-DAMAGE-01)');
  if(Math.abs(projectileStickChance(0) - 0.12) > 0.001 || !(projectileStickChance(250) > 0.4 && projectileStickChance(250) < 0.65) || projectileStickChance(500) < 0.9) problems.push('projectile stick chance starts at about 12% at 0 STR and rises gradually with every STR point to very likely at 500 (PROJECTILE-STICK-01, STICK-CHANCE-01)');
  if(FIRST_MAP_DROP_KILL !== 5 || !FIRST_MAP_SCROLL_ITEM.isMapScroll || COIN_PICKUP_MIN_MS !== 15000 || COIN_PICKUP_MAX_MS !== 20000) problems.push('one map scroll must drop within the first five eligible kills, both free-expansion pickups must be defined, and loose coins must last 15-20 seconds (COIN-LIFETIME-01)');
  { let consumed = false, blocked = false;
    const kept = !resolveExpansionPickupUse(() => false, () => { consumed = true; }, () => { blocked = true; });
    let consumedOnSuccess = false;
    const used = resolveExpansionPickupUse(() => true, () => { consumedOnSuccess = true; }, () => {});
    if(!kept || consumed || !blocked || !used || !consumedOnSuccess) problems.push('a map pickup must remain available when expansion is blocked and be consumed only after a successful expansion (EARLY-REWARD-USE-01)');
  }
  if(!isExpansionPickupItem({ itemDef: FIRST_MAP_SCROLL_ITEM }) || isExpansionPickupItem({ itemDef: GOLD_BAG_ITEM }) || canEvictGroundItem({ itemDef: FIRST_MAP_SCROLL_ITEM }) || !canEvictGroundItem({ itemDef: GOLD_BAG_ITEM })) problems.push('ground-item pressure must preserve free-expansion pickups without protecting ordinary gold bags (EARLY-REWARD-PRESERVE-01)');
  if(promotionRankLabel(1) !== 'Rank 1' || promotionRankLabel(7) !== 'Rank 7') problems.push('the promotion count must be labeled Rank, separate from Training XP (PROMOTION-RANK-LABEL-01)');
  if(nextWaveActionLabel(0) !== 'Start Wave' || nextWaveActionLabel(1) !== 'Next Wave') problems.push('the first wave action must say Start Wave without a wave number, then return to Next Wave (FIRST-WAVE-ACTION-01)');
  { const freeFighters = Object.entries(CONFIG.TOWERS).filter(([type, def]) => !['BARRICADE','PROTON','DARK_MATTER','QUASAR'].includes(type) && !(def.baseCost > 0)).map(([type]) => type); if(freeFighters.length) problems.push('every buildable fighter must have a gold price above zero (Barricade is paid in wood and stone; Proton, Dark Matter and Quasar are elements, not towers): ' + freeFighters.join(', ') + ' (NO-FREE-FIGHTERS-01)'); }
  if(!PRODUCER_TYPES.every(type => CONFIG.TOWERS[type] && CONFIG.TOWERS[type].baseCost > 0 && CONFIG.TOWERS[type].tiers[0].damage === 0 && isStructureType(type) && !isFighterTower({ type }) && !/\bupgrad|\bevol/i.test(CONFIG.TOWERS[type].blurb))) problems.push('structures cost gold, never attack and are never counted as fighters (STRUCTURE-PRODUCERS-01)');
  if(!String(unlockAudioOnGesture).includes('state === \'running\'') || typeof AUDIO_UNLOCK_EVENTS === 'undefined' || !AUDIO_UNLOCK_EVENTS.includes('touchend') || !AUDIO_UNLOCK_EVENTS.includes('pointerup')) problems.push('audio unlock retries on touchend, pointerup and click until the context runs, so the start-screen music starts on a phone tap (AUDIO-GESTURE-01)');
  if(String(runBootWarmup).includes('hidden = true') || !String(startFirstFrame).includes("classList.add('done')") || typeof audioEngine.prewarm !== 'function') problems.push('the loading screen fades out over the opaque game and the audio graph is built during loading (BOOT-FADE-01, AUDIO-PREWARM-01)');
  if(typeof SoundEngine.prototype.musicBassDrop !== 'function' || !POP_VOICES.warm || MUSIC_ATTRACT_SECTION_LEVEL[0] > 0.4) problems.push('intro and idle music open softly, keep a warm motif and resolve sweeps into bounded pitched bass (MUSIC-BUILD-DROP-01)');
  if(typeof updateRoundEnemyFollow !== 'function' || !String(cancelCameraFollow).includes('roundEnemyFollow = null')) problems.push('manual camera control cancels the countdown pan and first-enemy follow (ROUND-CAMERA-01)');
  if(!MUSIC_ATTRACT_SECTION_LEVEL.every((level, index) => index === 0 || level > MUSIC_ATTRACT_SECTION_LEVEL[index - 1]) || typeof audioEngine.popTone !== 'function' || MUSIC_ATTRACT_VOICE_LIMIT <= MUSIC_VOICE_LIMIT) problems.push('the start-screen music builds from a quiet intro to a loud chorus and has its own larger voice budget (MUSIC-ATTRACT-02)');
  if(MUSIC_VOICE_LIMIT_LIGHT <= MUSIC_VOICE_LIMIT_MEDIUM || MUSIC_VOICE_LIMIT_MEDIUM <= MUSIC_VOICE_LIMIT || typeof SoundEngine.prototype.scheduleCombatLayers !== 'function' || !String(SoundEngine.prototype.reserveMusicVoice).includes('musicVoiceLimit')) problems.push('the in-game music voice budget follows frame load (24, 14, then 10) and the wave and boss themes carry pad, snare and riser layers (MUSIC-BUDGET-01, MUSIC-LAYERS-01)');
  if(itemSellValue({ cost: 100 }) !== 50 || itemSellValue({ id: 'ADRENALINE' }) !== 60 || !MEDICAL_ITEMS.some(item => item.isRevive) || typeof reviveSelectedStickman !== 'function' || merchantPotionDefs().length < 6) problems.push('selling returns half the price paid or the merchant price, and the merchant stocks every potion, medical item and a revive (MERCHANT-SELL-01, MERCHANT-POTIONS-01)');
  if(!String(loop).includes('repaintPending') || !String(setupCanvas).includes('resizeSnapshotCanvas') || typeof restoreCanvasLayers !== 'function') problems.push('a resize, a return from the background or a restored canvas asks for one immediate repaint that skips the frame limiter, and a resize keeps the old picture (RESIZE-KEEP-01, REPAINT-01, CONTEXT-RESTORE-01)');
  if(MOBILE_FRAME_CAP_FPS !== 30 || !String(loop).includes('IS_MOBILE_DEVICE') || !String(defaultFrameCapFps).includes('IS_MOBILE_DEVICE') || !String(startFirstFrame).includes('vsyncProbeActive')) problems.push('a phone is locked to a steady 30 FPS with no camera exception, and the screen refresh rate is measured during loading (MOBILE-LOCK-30-01, VSYNC-PROBE-01)');
  { const seenIcons = new Map(), shared = []; for(const [type, def] of Object.entries(CONFIG.TOWERS)){ if(seenIcons.has(def.icon)) shared.push(seenIcons.get(def.icon) + ' and ' + type + ' share ' + def.icon); else seenIcons.set(def.icon, type); } if(shared.length) problems.push('no two classes can share an emoji: ' + shared.join('; ') + ' (CLASS-EMOJI-01)'); }
  if(WOOD_SELL_GOLD !== 2 || STONE_SELL_GOLD !== 4 || CARAVAN_FIRST_ROUND_AFTER !== 5 || !String(merchantShopOpen).includes('caravanShopAvailable') || !String(sellToCaravan).includes('caravanShopAvailable')) problems.push('the caravan pays 2 gold per wood and 4 per stone, comes only after round 5 and trades only while on the road (CARAVAN-01)');
  if(!(forensicDropletSizeFactor(1) > forensicDropletSizeFactor(4) && forensicDropletSizeFactor(4) > forensicDropletSizeFactor(FORENSIC_HIGH_VELOCITY_MS) && forensicDropletSizeFactor(FORENSIC_HIGH_VELOCITY_MS) > forensicDropletSizeFactor(25)) || forensicDropletSizeFactor(25) > 0.45 || String(spawnForensicSpatter).includes('exitSpray') || !String(spawnForensicSpatter).includes('launchAtomizedMist')) problems.push('drop size falls as launch speed rises and anything above 7.65 m/s atomizes into mist; back-spatter leaves slower than forward spatter (FORENSIC-CLASS-01)');
  if(CAMPFIRE_BUILD_WOOD !== 50 || !String(buildTowerModal).includes('campfireRow') || String(buildTowerModal).includes("createElement('button');fireRow") || !String(placeCampfire).includes('wood-=CAMPFIRE_BUILD_WOOD')) problems.push('the campfire is a normal row in the Structures list costing gold, 50 wood and stone (CAMPFIRE-STRUCTURE-01)');
  if(typeof spawnCastOffTrail !== 'function' || !String(spawnSwordsmanBloodArc).includes('spawnCastOffTrail') || String(spawnCastOffArc).includes('circular')) problems.push('blade cast-off lands as a curved row along the swing tangent beyond the wound, never a ring around the victim (CASTOFF-TANGENT-01)');
  if(Math.abs(FORENSIC_TERMINAL_PX/FORENSIC_PX_PER_METER - 7.65) > 1e-9 || !String(forensicTerminalPxFor).includes('FORENSIC_TERMINAL_PX') || !String(landForensicDroplet).includes('Math.asin')) problems.push('gore explosion droplets obey quadratic drag, a 7.65 m/s terminal velocity and an impact-angle stain (GORE-EXPLOSION-01)');
  if(ELEMENT_INFUSE_THRESHOLD !== 250 || MIXED_PAIR_THRESHOLD !== 250 || !ELEMENT_COMPONENTS.PROTON || ELEMENT_COMPONENTS.PROTON.join() !== 'FIRE,ELECTRIC' || ELEMENT_COMPONENTS.DARK_MATTER.join() !== 'FIRE,ICE' || ELEMENT_COMPONENTS.QUASAR.join() !== 'ELECTRIC,ICE' || ['PROTON','DARK_MATTER','QUASAR'].some(type => STARTER_TOWER_TYPES.includes(type) || EVOLVED_TOWER_TYPES.includes(type)) || mixedElementFor({str:250,dex:250,int:250}) !== 'PROTON' || mixedElementFor({str:260,dex:300,int:280}) !== 'QUASAR' || mixedElementFor({str:300,dex:0,int:250}) !== 'DARK_MATTER' || mixedElementFor({str:300,dex:249,int:0}) !== null || !String(drawStickman).includes('drawWeaponEnchant')) problems.push('elements are earned, never built: 250 STR/DEX/INT infuses Fire/Electric/Ice, a second element at 250 mixes into Proton (Fire+Electric), Dark Matter (Fire+Ice) or Quasar (Electric+Ice), and an elemental stickman always shows an enchantment on the weapon (ELEMENT-INFUSION-01)');
  if(!CONFIG.TOWERS.HACKER || !(CONFIG.TOWERS.HACKER.baseCost > 0) || CONFIG.TOWERS.HACKER.tiers[0].damage !== 0 || !MAX_ONE_PER_BOARD_TYPES.includes('HACKER') || !HACK_TOWER_TYPES.includes('HACKER') || STARTER_TOWER_TYPES.includes('HACKER') || EVOLVED_TOWER_TYPES.includes('HACKER') || HACKER_MAX_HP > 25 || typeof Tower.prototype.goStealth !== 'function' || !String(findNearestActiveTower).includes('stealthUntil')) problems.push('the Hacker is a hacks-only stickman: priced above zero, never attacks, tiny health, one per board even when downed, stealth hides him from enemy targeting, and he never appears in normal progression (HACKER-01)');
  if(String(creditGroundBagGold).includes('launchGoldHudFlight') || !String(openGoldBag).includes('launchGoldHudFlight') || !String(creditCoin).includes('withFlight') || String(Enemy.prototype.applyDamage).includes('launchGoldHudFlight')) problems.push('coins fly to the gold counter only when the player clicks a coin or opens a bag, never on a defeat, expiry or automatic payout (GOLD-FLIGHT-CLICK-01)');
  if(ICE_FREEZE_MIN_MS !== 2000 || ICE_FREEZE_MAX_MS !== 5000 || !(ICE_PROC_SHARE < 1) || !(FROZEN_DAMAGE_MULT > 1) || !String(Enemy.prototype.applyDamage).includes('frozenUntil') || !String(SoundEngine.prototype.playEvent).includes('WAVE-CLEAR-FANFARE-01') || !String(SoundEngine.prototype.scheduleMusicStep).includes('musicCycle') || !CONFIG.TOWERS.BLOW_GUNNER) problems.push('Ice is the rarest element to proc but the most effective: 2 to 5 second freeze that blocks the queue behind it and takes extra damage; Blow Gunner stays a buildable tower that can carry elements; the wave-clear fanfare and the cycle-by-cycle key changes stay in the score (ICE-BLOCK-01, WAVE-CLEAR-FANFARE-01, MUSIC-EVOLVE-01)');
  if(String(offerRunReward).indexOf('RUN-REWARD-REMOVED-01') < 0 && !String(offerRunReward).includes('return;') || typeof SoundEngine.prototype.setWindLevel === 'function' || !String(Tower.prototype.update).length || typeof expansionBlockedReason !== 'function' || !String(canvas.onpointermove || '1') || !String(updatePresentationEffects).includes('freeExpansionOwed')) problems.push('no wave choice rewards, no wind sound, the free expansion arrives only after every enemy is cleared, and coins collect on hover or slide (RUN-REWARD-REMOVED-01, EXPAND-AFTER-CLEAR-01, HOVER-COIN-01)');
  if(!String(Enemy.prototype.updateEscapedMovement).includes('LOOSE-CURIOUS-01') || !String(itemDropTargetAt).includes('HEAD-SNAP-01') || typeof GOLD_MAP_BAG_ITEM !== 'undefined') problems.push('escaped enemies are curious and aggro by distance, a dragged item snaps to a stickman by head or body, and bags are only bags (LOOSE-CURIOUS-01, HEAD-SNAP-01, CHEST-ONLY-01)');
  if(Math.abs(projectileStickChance(0) - 0.12) > 0.001 || !(projectileStickChance(250) > 0.4 && projectileStickChance(250) < 0.65) || projectileStickChance(500) < 0.9 || projectileStickChance(500) > 0.95) problems.push('arrows stick in enemies sometimes at 0 STR and gradually more often up to very likely at 500 STR (STICK-CHANCE-01)');
  if(!String(Enemy.prototype.draw).includes('LOOSE-GLOW-01') || typeof launchHeartHudFlights !== 'function' || !String(Tower.prototype.update).length) problems.push('loose enemies sit in a soft red glow with no ring and the fountain sends hearts to the lives counter (LOOSE-GLOW-01, HEART-FLIGHT-01)');
  { let attractOffScreenTopBottom = false, attractGrunts = 0; for(let i = 0; i < 300; i++){ const point = attractSpawnPoint(); if(point.yf < 0 || point.yf > 1 || (point.xf >= 0 && point.xf <= 1)) attractOffScreenTopBottom = true; if(attractPickEnemyType() === 'GRUNT') attractGrunts++; } if(attractOffScreenTopBottom || attractGrunts < 180) problems.push('the attract screen is mostly the big angry red guy and enemies come in from the left or right horizon, never from the sky (ATTRACT-HORIZON-01)'); }
  if(!String(drawEmojiGroundShadow).includes('BOX-SHADOW-01') || !String(drawEmojiGroundShadow).includes("fillStyle='#000'")) problems.push('the cardboard box casts a footprint shadow swept back-right like every other shadow, drawn in black (BOX-SHADOW-01)');
  { const quickRow = document.getElementById('inspQuickSlots'), plate = document.getElementById('inspect-panel'); if(quickRow && plate && (plate.contains(quickRow) || getComputedStyle(quickRow).position !== 'absolute')) problems.push('the quick items are free floating buttons outside the faceplate; the faceplate never grows to hold them (QUICK-FLOAT-01)'); }
  if(/roll < 0\.0[4-9]\) type = '/.test(String(spawnScenery)) || typeof maybeSpawnRandomEventsOnExpansion !== 'function' || !String(finalizeRingExpansion).includes('maybeSpawnRandomEventsOnExpansion')) problems.push('each expansion makes one random event near the flags and one near the finish carpet, and chests, crates and bushes are never rolled on ordinary tiles (ONE-EVENT-PER-END-01)');
  if(!String(initAttractLoop).includes('SCENE-TIME-OF-DAY-01')) problems.push('each new attract scene changes the time of day (SCENE-TIME-OF-DAY-01)');
  if(!String(spawnBoneDebris).includes('BONE-SPREAD-01')) problems.push('bones vary in size with the enemy and spread evenly (BONE-SPREAD-01)');
  if(String(update).includes('driveRingReveal(') || !String(updatePresentationEffects).includes('driveRingReveal(') || RING_REVEAL_TARGET_MS < 1500) problems.push('the expand reveal is slow, clean and drawn in real time at every game speed (EXPAND-REALTIME-01)');
  if(pathTurnFirstChance < 0.7) problems.push('the road prefers turning when it grows so it never becomes a long straight line (PATH-WINDY-01)');
  if(HEAVY_VISUAL_LOAD_HOLD_MS < 300 || HEAVY_VISUAL_LOAD_HOLD_MS > 2000 || typeof heavyVisualLoadHoldUntil !== 'number') problems.push('adaptive detail holds for a real-time interval, not a frame count (ADAPTIVE-HOLD-REALTIME-01)');
  if(!String(spawnDecal).includes('bloodDecalBlocked') || !String(generateScenery).includes('spawnWastelandStumps')) problems.push('blood pools respect intervening bodies and new runs include two harvestable wasteland branches (POOL-VOID-01, WASTELAND-STUMPS-01)');
  if(MAX_DECALS !== 2100 || MAX_DECALS_LOW_QUALITY !== 700 || !String(drawDecals).includes('camera.zoom > 1.25') || !String(render).includes('camera.zoom <= 1.25')) problems.push('blood defaults are high 2100 / low 700 and zoomed settled shapes replace the raster blit (BLOOD-ZOOM-01)');
  if(!String(spawnScenery).includes('sceneryPlanRandom') || !String(spawnArterialBeat).includes('bloodPoolSizeScale') || !String(spawnBloodStream).includes('bloodPoolSizeScale') || !String(updateBloodTrails).includes('bloodPoolSizeScale')) problems.push('ordinary scenery follows the saved seed and remaining blood emitters use victim weight (SCENERY-SEEDED-PLAN-01, BLOOD-WEIGHT-01)');
  if(typeof settledDecalHasContent !== 'boolean' || !String(render).includes('settledDecalHasContent')) problems.push('the empty settled decal layer is not drawn every frame (EMPTY-LAYER-SKIP-01)');
  { const redFresh = agedBloodRgb({ rgb: { r: 140, g: 20, b: 20, a: 1 }, lifespan: DECAL_LIFESPAN }, 0), greenFresh = agedBloodRgb({ rgb: { r: 60, g: 160, b: 50, a: 1 }, lifespan: DECAL_LIFESPAN }, 0); if(redFresh.r !== 255 || redFresh.g !== 40 || greenFresh.r > 80 || greenFresh.g < 160) problems.push('red blooded enemies show bright fresh blood and other colours keep their own (FRESH-BLOOD-01)'); }
  if(MUSIC_VOICE_LIMIT < 9 || ['scheduleMusicArpeggio', 'scheduleCombatHats', 'scheduleMusicSting', 'musicOpenHat', 'musicSkippedSteps', 'scheduleDrumFill', 'scheduleCycleTurnaround', 'scheduleSectionAccent', 'musicCrash', 'syncMusicEcho'].some(name => typeof SoundEngine.prototype[name] !== 'function')) problems.push('the score drives forward: arpeggiated chords, a drum kit with fills and section crashes, a turnaround that climbs into each new key, delayed vibrato and an echo on the leads (MUSIC-DRIVE-01)');
  if(typeof SoundEngine.prototype.scheduleFieldStep !== 'function' || FIELD_ROOT_PROGRESSIONS.length < 3 || SFX_VARIANT_PITCH.length < 4) problems.push('the idle theme rotates four arrangements and sound effects rotate variants so nothing loops identically (FIELD-VARIATION-01, SFX-VARIANT-01)');
  { const waveTypes = new Set(); let repeats = 0, previousFormation = null; for(let n = 1; n <= 60; n++){ const f = waveFormationFor(n); waveTypes.add(f); if(f === previousFormation && f !== 'STEADY') repeats++; previousFormation = f; } if(waveFormationFor(1) !== 'STEADY' || waveTypes.size < 5 || repeats > 0) problems.push('waves are dealt in varied formations, never the same non-steady formation twice in a row, with wave 1 always steady (WAVE-FORMATION-01)'); }
  if(typeof refreshAttackState !== 'function' || typeof decalCategoryCounts !== 'function' || !String(generateDebugLog).includes('decalCategoryCounts')) problems.push('the debug log counts debris by category and the fighter portrait shows its attack state without changing the plate size (DECAL-CATEGORIES-01, ATTACK-STATE-01)');
  { const lengthSaved = pathWaypointTiles; let grown, base, factor;
    try{pathWaypointTiles=[{x:0,y:0},{x:1,y:0}];base=tierPopulationForWave(1).TINY;factor=routeLengthFactor(1);pathWaypointTiles=Array.from({length:60},(_,i)=>({x:i,y:0}));grown=tierPopulationForWave(1).TINY;}finally{pathWaypointTiles=lengthSaved;}
    if(!(grown>base) || grown>Math.round(base*2.5)+1 || factor<1) problems.push('a much longer road brings more enemies, never fewer, up to 2.5 times (ROUTE-SCALES-WAVE-01)');
  }
  if(!String(render).includes('PAN-SNAP-01') || !String(SoundEngine.prototype.playEvent).includes("'item_scroll'") || !String(SoundEngine.prototype.playEvent).includes("'item_inject'")) problems.push('the camera draws at whole device pixels while panning and scrolls and injectors have their own sounds (PAN-SNAP-01)');
  if(dirtTileKeys.size !== 0 || !String(beginNextRingReveal).includes('GRASS-NEVER-SHRINKS-01') || String(beginNextRingReveal).includes('dirtTileKeys.add')) problems.push('the road is always surrounded by grass and the green area is only ever added to (GRASS-NEVER-SHRINKS-01)');
  if(typeof pickRoadGrowthStyle !== 'function' || typeof relocateTowersOffRoute !== 'function' || !String(extendPathWithNewRing).includes('orderRoadDirections') || String(extendPathWithNewRing).includes('towerPool') || typeof activeTowerTileKeys !== 'function') problems.push('roads grow in varied styles, mostly normal and sometimes wild, avoid fighters when they can, and move them onto grass when they cannot (ROAD-VARIETY-01, ROAD-FREEDOM-01, TOWERS-STAY-PUT-01)');
  if(!String(extendPathWithNewRing).includes('ROAD-ESCAPE-01') || !String(extendPathWithNewRing).includes('spacingAllowance')) problems.push('the road keeps growing when one end is boxed in or the spacing rule blocks it, instead of cutting itself off (ROAD-ESCAPE-01)');
  { const savedRoute = pathWaypointTiles; pathWaypointTiles = Array.from({ length: 4 + 2*10 }, (_, i) => ({ x: i, y: 0 })); const normalMax = batchSizeRangeForWave(10, 'TINY')[1]; pathWaypointTiles = Array.from({ length: 4 + 2*10 + 30 }, (_, i) => ({ x: i, y: 0 })); const longMax = batchSizeRangeForWave(10, 'TINY')[1]; pathWaypointTiles = savedRoute; if(!(longMax > normalMax) || batchSizeRangeForWave(1, 'TINY')[1] !== 1 || batchSizeRangeForWave(10, 'BOSS')[1] !== 1) problems.push('groups are larger on a longer road, with wave 1 and boss batches unchanged (GROUP-SIZE-ROUTE-01)'); }
  if(!/^\d+\.\d+\.\d+$/.test(GAME_VERSION) || GAME_VERSION === '1.7.36') problems.push('every upload has its own version, bumped together with the changelog and README (RELEASE-VERSION-01)');
  if(typeof keepRoomToBuild !== 'function' || !String(finalizeRingExpansion).includes('keepRoomToBuild')) problems.push('ordinary new props reserve building room without deleting existing scenery (ROOM-TO-BUILD-01, SCENERY-PRESERVE-01)');
  if(ENEMY_COUNT_MULTIPLIER < 1.2 || ENEMY_COUNT_MULTIPLIER > 2.5 || tierPopulationForWave(1).TINY < 12) problems.push('there are more enemies to fight on every wave without making any enemy stronger (MORE-ENEMIES-01)');
  if(document.getElementById('replayIntroBtn') || !document.getElementById('first-build-hint') || !document.getElementById('first-next-wave-hint') || !document.getElementById('first-speed-hint') || String(firstFighterWasBuilt).includes('localStorage')) problems.push('the introduction arrows (build, next wave, speed up) play on every new playthrough and are not remembered between visits (INTRO-EVERY-GAME-01)');
  if(!String(maybeSpawnRandomEventsOnExpansion).includes('PROP-CAP-01')) problems.push('event props never crowd out the room to build (PROP-CAP-01)');
  if(DIAMOND_BAG_CHANCE !== 0.1 || DIAMOND_MIN_GOLD !== 1 || DIAMOND_MAX_GOLD !== 100 || !String(creditCoin).includes('DIAMOND-GOLD-01') || !String(tryCollectCoinAt).includes('hoverOnly') || String(Enemy.prototype.draw).includes('setLineDash')) problems.push('a gold bag drops a diamond one time in ten, a diamond is worth 1 to 100 gold and needs a click, and loose enemies glow red with no ring (DIAMOND-GOLD-01, DIAMOND-CLICK-01, LOOSE-GLOW-01)');
  if(MAP_FROM_BAG_CHANCE !== 0.01 || typeof GOLD_MAP_BAG_ITEM !== 'undefined' || typeof rollMapFromBag !== 'function' || !String(openGoldBag).includes('rollMapFromBag') || !String(creditGroundBagGold).includes('rollMapFromBag') || String(dropItemsFromEnemy).includes('GOLD_MAP_BAG')) problems.push('there is only one kind of bag, the normal gold bag, and a map falls out of about one bag in a hundred (ONE-KIND-OF-BAG-01)');
  if(typeof rollTreeVariant !== 'function' || TREE_VARIANT_EMOJI.length < 3 || RANDOM_EVENT_CHOICES[0][0] !== 'CHEST' || RANDOM_EVENT_CHOICES[0][1] > 0.1 || !String(spawnScenery).includes('SCENERY-VARIETY-01')) problems.push('trees and rocks come in varied kinds, shapes and facings, and presents are the rarest event (SCENERY-VARIETY-01, EVENT-VARIETY-01)');
  { const kinds = new Set(RANDOM_EVENT_CHOICES.map(c => c[0])); const total = RANDOM_EVENT_CHOICES.reduce((a, c) => a + c[1], 0); if(kinds.size < 9 || Math.abs(total - 1) > 0.001 || typeof grantEventProp !== 'function' ) problems.push('there are nine kinds of random event and their chances add up to one (EVENT-VARIETY-01)'); }
  if(typeof Tower.prototype.walkTo !== 'function' || typeof Tower.prototype.advanceWalk !== 'function' || !String(attemptMoveTower).includes('walkTo') || !String(creditCoin).includes('withFlight') || !String(spawnGroundItem).includes('ITEM-ARC-01') || !String(Tower.prototype.update).includes('MOVE-WALKS-01')) problems.push('moved stickmen walk to their new tile, dropped items fly out in an arc, and faded coins fly to the counter (MOVE-WALKS-01, ITEM-ARC-01, COIN-FADE-FLIGHT-01)');
  { // OWNER-LEDGER-01 (1.7.44) — see HISTORY.md § [1.7.44]
    const src = fn => String(fn);
    const ledger = [
      ['no wind sound', typeof SoundEngine.prototype.setWindLevel === 'undefined'],
      ['no wave choice rewards', src(offerRunReward).includes('RUN-REWARD-REMOVED-01') || /^function offerRunReward\(wave\)\{\s*return;/.test('function ' + src(offerRunReward).replace(/^function\s*/, ''))],
      ['wave clear keeps its twang', src(SoundEngine.prototype.playEvent).includes('523.25')],
      ['countdown buzzer, eating, potion, scroll, injector and expand sounds', ['countdown_tick', 'countdown_go', 'item_eat', 'item_potion', 'item_scroll', 'item_inject', 'expand_build'].every(n => src(SoundEngine.prototype.playEvent).includes("'" + n + "'"))],
      ['hack cheat menu grants wood, stone and gold', ['+🪵1,000', '+🪨10,000', '+💰100,000'].every(a => src(runHackAction).includes(a))],
      ['intelligence tooltip', sourceMentions('drives Mage damage and every stickman')],
      ['elements at 250', ELEMENT_INFUSE_THRESHOLD === 250],
      ['expansion allowed mid-wave, one bought per wave', typeof expansionBlockedReason === 'function' && src(expandRegion).includes('expansionBlockedReason') && !src(expansionBlockedReason).includes('waveState') && src(expansionBlockedReason).includes('one per wave') && sourceMentions('EXPAND-MID-WAVE-01')],
      ['moves belong to each stickman, gained on promotion, boss kill and shoes', typeof grantTowerMove === 'function' && typeof moveCharges === 'undefined' && src(Tower.prototype.upgrade).includes('grantTowerMove') && src(Enemy.prototype.die).includes('grantTowerMove') && !document.getElementById('moveVal')],
      ['archer arrows leave the bow grip, in game and on the attract screen', sourceMentions('ARROW-GRIP-01', 'archerNockedArrowTip(angle,1,0)', 'archerNockedArrowTip(t.aimAngle, 1, 0)')],
      ['camera pans run on a clock that caps long frames', CAMERA_CLOCK_MAX_STEP_MS === 24 && src(updateCameraFollow).includes('cameraPanClock') && String(render).includes('PAN-SUBPIXEL-01')],
      ['with droplets enabled, hits and kills throw droplets; wounds leave a trail; bodies make voids and stains', typeof spawnForensicSpatter === 'function' && typeof updateBloodTrails === 'function' && typeof forensicBlockerAlongPath === 'function' && typeof drawBloodStains === 'function' && src(Enemy.prototype.die).includes('spawnForensicSpatter')],
      ['wave phase label replaces the wave bar, no lives bar', !!document.getElementById('wavePhase') && !document.getElementById('waveProgress') && !document.getElementById('livesMeter')],
      ['no static gold-bag building and one kind of bag', typeof GOLD_MAP_BAG_ITEM === 'undefined' && !src(spawnScenery).includes("type = 'COIN_POUCH'")],
      ['shoes give a free move per pair', sourceMentions('TENNIS-SHOES-MOVE-01') && DROP_ITEMS.find(item => item.id === 'RUNNING_SHOES').extraMove === true],
      ['chest loot is a roll, presents are rare', sourceMentions('CHEST-LOOT-01') && RANDOM_EVENT_CHOICES[0][1] <= 0.08],
      ['version is a real version', /^\d+\.\d+\.\d+$/.test(GAME_VERSION)]
    ];
    const broken = ledger.filter(entry => !entry[1]).map(entry => entry[0]);
    if(broken.length) problems.push('project rules ledger broken: ' + broken.join('; ') + ' (OWNER-LEDGER-01)');
  }
  if(!(LOOT_KILL_ODDS.supply < 1/150) || !(LOOT_KILL_ODDS.gear < 1/900) || ITEM_RARITIES.EPIC.weight > 1 || ITEM_RARITIES.RARE.weight > 7 || ITEM_RARITIES.COMMON.weight < 64) problems.push('items are rarer than before: kill odds, per-wave cap and rare and epic weights are kept low (LOOT-RARER-01)');
  if(!String(drawOneSceneryItem).includes('CLEAR-PIE-01') || String(drawOneSceneryItem).includes('r = size*0.62')) problems.push('clearing progress is a single yellow gradient wedge that fills clockwise behind the emoji, with no dark disc and no stripes, not a ring over it (CLEAR-PIE-01)');
  if(FOOD_STAT_BY_KIND.MEAT !== 'con' || FOOD_STAT_BY_KIND.FRUIT !== 'int' || FOOD_STAT_BY_KIND.VEGETABLE !== 'dex' || !String(applyFoodItem).includes('grantFoodStat') || !String(onPointerEnd).includes('eatDroppedFood') || String(grantEventProp).includes('rollStimItem') && String(grantEventProp).split("item.type === 'PICNIC'")[1].split("WOODPILE")[0].includes('rollStimItem')) problems.push('food is eaten instantly on a stickman and raises stats: meat Constitution, fruit INT, vegetables DEX; a picnic basket is food only (FOOD-STATS-01)');
  if(String(creditCoin).includes('grantDiamondReward') || !String(creditCoin).includes("'💎'") || typeof grantDiamondReward !== 'undefined') problems.push('a diamond turns into gold only and the gem flies up into the gold counter (DIAMOND-GOLD-01, DIAMOND-FLIES-01)');
  if(typeof buyRation !== 'function' || typeof buyDrill !== 'function' || typeof merchantStock !== 'function' || !String(buildShopGrid).includes('GOLD-SINKS-01') || !String(serializeGameState).includes('marketBought')) problems.push('the Shop has more places to sink gold: a ration market, a training yard and a travelling merchant (GOLD-SINKS-01)');
  if(typeof stickmanShadowEntry !== 'function' || !String(drawStickmanGroundShadow).includes('SHADOW-CACHE-01') && !String(drawStickmanGroundShadow).includes('owner') || typeof drawBatchedEnemyShadows !== 'function' || !String(drawDepthSortedLayer).includes('enemyShadowsBatched')) problems.push('fighter shadows are cached per pose and a crowd of enemies shares one batched shadow fill (SHADOW-CACHE-01, ENEMY-SHADOW-BATCH-01)');
  if(typeof grantStatPoints !== 'function' || String(grantFoodStat).includes('tower[stat] =') || !String(grantStatPoints).includes('refreshProgressionMilestones') || false) problems.push('food and rations honour the stat caps and milestones through one shared grant (STAT-GRANT-01)');
  if(!String(serializeGameState).includes('itemCosts') || !String(serializeGameState).includes('merchantSold') || String(pickItemLandingPoint).includes('fallback') || !String(queryNearby).includes('COLLISION-FAIR-01') || !String(flushHUDIfDirty).includes('HUD-TIMING-01')) problems.push('merchant prices and sold state are saved, item landings are always valid, crowded collision queries rotate fairly and the HUD time is measured (MERCHANT-SAVE-01, ITEM-ARC-01, COLLISION-FAIR-01, HUD-TIMING-01)');
  { const goodState = JSON.parse(JSON.stringify(serializeGameState())); const badState = JSON.parse(JSON.stringify(goodState)); badState.pathWaypointTiles[1] = null; if(!validateSaveShape(goodState) || validateSaveShape(badState)) problems.push('a save with a broken route tile is rejected before the current game is touched (SAVE-ROUTE-CHECK-01)'); }
  if(typeof startDowningCapture !== 'function' || !String(reportTowerDowned).includes('startDowningCapture') || typeof clearRunScopedStateForLoad !== 'function' || !String(restoreGameState).includes('rollback') || typeof projectileTargetLost !== 'function' || !String(CatCompanion).includes('sourceTowerId')) problems.push('loading is all or nothing and resets run state, recycled enemies and towers are never mistaken for the originals, and a stickman downing is captured for the debug log (LOAD-ALL-OR-NOTHING-01, GENERATION-CHECK-01, DOWNING-CAPTURE-01)');
  if(CONFIG.TOWERS.SWORDSMAN.baseCost !== 50 || CONFIG.TOWERS.ARCHER.baseCost !== 60 || CONFIG.TOWERS.MAGE.baseCost !== 70 || SCALING_COST_GROWTH < 2.25 || Math.round(CONFIG.TOWERS.SWORDSMAN.baseCost * SCALING_COST_GROWTH) !== 113) problems.push('starter costs must remain Swordsman 50, Archer 60, Mage 70, with same-class copies becoming substantially more expensive (STARTER-PRICE-LADDER-01)');
  if(applyClassCooldownBalance('SWORDSMAN', 1000) !== 1200 || applyClassCooldownBalance('ARCHER', 1000) !== 1150 || applyClassCooldownBalance('MAGE', 1000) !== 1400) problems.push('Swordsman attacks 20% slower, Mage 40% slower and every other class 15% slower than their base cooldowns (SWORDSMAN-RATE-01)');
  { const entries = [{ id: 1, read: false }, { id: 2, read: false }];
    markNotificationsRead(entries);
    if(countUnreadNotifications(entries) !== 0 || !dismissNotificationEntry(entries, 1) || entries.length !== 1 || dismissNotificationEntry(entries, 99)) problems.push('the inbox must mark all entries read and dismiss only the selected notification (NOTIFICATION-INBOX-CONTROLS-01)');
  }
  { const runningShoes = DROP_ITEMS.find(item => item.id === 'RUNNING_SHOES'), fancyHat = DROP_ITEMS.find(item => item.id === 'FANCY_HAT');
    if(!runningShoes || runningShoes.str !== equipmentStatBonus(20,'LEGENDARY') || runningShoes.dex !== 100 || runningShoes.int !== equipmentStatBonus(20,'LEGENDARY') || !runningShoes.extraMove || runningShoes.rarity !== 'LEGENDARY' || !fancyHat || fancyHat.str !== equipmentStatBonus(20,'LEGENDARY') || fancyHat.dex !== equipmentStatBonus(20,'LEGENDARY') || fancyHat.int !== 100 || fancyHat.rangeBonus !== 0.01 || fancyHat.rarity !== 'LEGENDARY') problems.push('Running Shoes and Fancy Hat use the Legendary per-stat band and keep their move/range effects (ITEM-LEGENDARY-01)');
    if(statEffectPoints(500, 50) !== 550 || statEffectPoints(600, 0) !== 500 || !ITEM_RARITIES.LEGENDARY.rainbow || Object.values(ITEM_RARITIES).filter(rarity => rarity.rainbow).length !== 1 || BOSS_RARITY_WEIGHTS.LEGENDARY <= 0) problems.push('equipment adds on top of the 500 trained-stat cap and rainbow glow belongs to Legendary only (EQUIPMENT-OVER-CAP-01, ITEM-GLOW-01)');
  }
  for(const [eventName, eventParams] of Object.entries(TELEMETRY_EVENTS)){
    if(!/^[a-z][a-z0-9_]*$/.test(eventName) || eventName.length > 40) problems.push('telemetry event "' + eventName + '" must be snake_case and at most 40 characters (TELEMETRY-01)');
    if(eventParams.length + 3 > 25) problems.push('telemetry event "' + eventName + '" has ' + (eventParams.length + 3) + ' parameters including the 3 standard ones; the limit is 25 (TELEMETRY-01)');
    for(const paramName of eventParams) if(!/^[a-z][a-z0-9_]*$/.test(paramName) || paramName.length > 40) problems.push('telemetry parameter "' + paramName + '" on "' + eventName + '" must be snake_case and at most 40 characters (TELEMETRY-01)');
  }
  for(const requiredEvent of ['game_started', 'wave_started', 'wave_completed', 'game_over', 'tower_downed', 'lag_detected', 'map_expanded', 'tower_built']){
    if(!TELEMETRY_EVENTS[requiredEvent]) problems.push('telemetry event "' + requiredEvent + '" must stay in the catalog (TELEMETRY-01)');
  }
  const itemIds = new Set();
  for(const item of ITEM_BY_ID.values()){
    if(itemIds.has(item.id)) problems.push('duplicate item id ' + item.id + ' (ITEM-DROPS-01)');
    itemIds.add(item.id);
  }
  if(DROP_ITEMS.length < 40) problems.push('the item catalog must offer at least 40 drop items, found ' + DROP_ITEMS.length + ' (ITEM-DROPS-01)');
  for(const item of DROP_ITEMS){
    const rarity = ITEM_RARITIES[item.rarity];
    if(!rarity){ problems.push('item ' + item.id + ' has an unknown rarity (ITEM-DROPS-01)'); continue; }
    for(const stat of ['str','dex','int','armor']) if(item[stat] && (item[stat] < rarity.statBudget[0] || item[stat] > rarity.statBudget[1])) problems.push('item ' + item.id + ' has ' + item[stat] + ' ' + stat + ', outside its rarity band (EQUIPMENT-RARITY-STATS-01)');
    if(item.cost !== 0) problems.push('drop-only item ' + item.id + ' must not be for sale (ITEM-DROPS-01)');
  }
  for(const rarityKey of Object.keys(ITEM_RARITIES)) if(!DROP_ITEMS.some(item => item.rarity === rarityKey)) problems.push('no drop items of rarity ' + rarityKey + ' (ITEM-DROPS-01)');
  for(const [enemyType, itemId] of Object.entries(ENEMY_SIGNATURE_DROPS)){
    if(!CONFIG.ENEMIES[enemyType]) problems.push('signature drop for unknown enemy ' + enemyType + ' (ITEM-DROPS-01)');
    if(!ITEM_BY_ID.has(itemId)) problems.push('signature drop ' + itemId + ' for ' + enemyType + ' is not in the catalog (ITEM-DROPS-01)');
  }
  if(Object.keys(ENEMY_SIGNATURE_DROPS).length < 20) problems.push('at least 20 enemy types must have a signature drop (ITEM-DROPS-01)');
  if(LOOT_KILL_ODDS.supply > 0.02 || LOOT_KILL_ODDS.tonic >= LOOT_KILL_ODDS.supply || LOOT_KILL_ODDS.gear >= LOOT_KILL_ODDS.tonic) problems.push('kill loot stays rare and ordered: common more likely than uncommon, uncommon more likely than rare (LOOT-ODDS-01)');
  for(const tierKey of ['TINY','SMALL','STANDARD','LARGE']){ const w = LOOT_CATEGORY_WEIGHTS_BY_TIER[tierKey]; if(!w || w.supply <= w.tonic || w.tonic <= w.gear) problems.push('loot tier ' + tierKey + ' must weigh supply above tonic above gear (LOOT-TABLE-01)'); }
  if(SCALING_COST_GROWTH < 2.25) problems.push('stickman build costs must grow at least 2.25x per copy on board (PRICE-SCALING-01)');
  if(FOOD_ITEMS.length < 20) problems.push('the food catalog must offer at least 20 items, found ' + FOOD_ITEMS.length + ' (FOOD-DROPS-01)');
  for(const [id, healValue] of Object.entries(MEAT_HEAL_BY_ID)) if(healValue > 30) problems.push('meat item ' + id + ' heals ' + healValue + ', above the small-heal cap of 30 (FOOD-DROPS-01)');
  if(!TREAT_ITEMS.every(t=>t.spendablePoints>0) || !String(applyTreatItem).includes('promotionCapacity()')) problems.push('desserts grant capped spendable points and XP (DESSERT-POINTS-01)');
  if(sceneryClearCost({type:'SUPPLY_CRATE',clearCost:10})!==0 || !String(startClearingScenery).includes('updateScenery(0)') || mushroomHarvestCount({scale:CONFIG.SCENERY.maxScale})!==10 || !String(drawAnimatedFlora).includes('CONFIG.FLORA.coverage <= 0')) problems.push('containers open free immediately, large mushrooms yield ten, and decorative flora stays disabled (CLICK-OPEN-FREE-01, MUSHROOM-HARVEST-01)');
  if(TREAT_ITEMS.length < 3) problems.push('at least 3 boss treats are required (FOOD-DROPS-01)');
  if(!MEDICAL_ITEMS.some(item => item.isRevive)) problems.push('the medical shop must offer a revive item (MEDICAL-SHOP-01)');
  if(HUT_LOOT_ITEMS.length < 2) problems.push('hut loot needs at least 2 pickup kinds (HUT-LOOT-01)');
  for(const element of ['FIRE','ELECTRIC','ICE']){ if(!ELEMENT_SKIN_TINTS[element] || !ELEMENT_ATTACK_EMOJI[element]) problems.push('element ' + element + ' is missing a skin tint or attack emoji (ELEMENT-TINT-01)'); }
  if(!TREAT_ITEMS.some(t => t.id === 'DONUT') || !TREAT_ITEMS.some(t => t.id === 'CHOCOLATE') || !TREAT_ITEMS.some(t => t.id === 'LOLLIPOP')) problems.push('donut, chocolate and lollipop tactical treats must all be in the catalog (TREAT-TACTICS-01)');
  if(DONUT_SHIELD_MAX > 5) problems.push('donut shield must stay capped at 5 charges (TREAT-TACTICS-01)');
  if(CHAIN_LIGHTNING_MAX_JUMPS < 1) problems.push('chain lightning must be able to jump to at least 1 additional enemy (ELEMENT-EFFECTS-01)');
  if(EXTRA_GRASS_EVERY_N_EXPANSIONS < 1) problems.push('bonus grass cadence must be a positive number of expansions (GRASS-RATIO-01)');
  if(CONFIG.FLORA.coverage !== 0 || String(keepRoomToBuild).includes('sceneryMap.delete') || String(applyFoodItem).includes('lives +=') || typeof healFedStickman !== 'function') problems.push('decorative flora is disabled, older scenery is retained and food heals stickmen rather than player lives (PURPOSEFUL-PROPS-01, SCENERY-PRESERVE-01, FOOD-STICKMAN-HEALTH-01)');
  for(const [type, def] of Object.entries(LIVESTOCK_TYPES)) if(!FOOD_BY_ID.has(def.meatId)) problems.push('livestock ' + type + ' drops an unknown meat item (LIVESTOCK-01)');
  if(!BERRY_FOOD_IDS.every(id => FOOD_BY_ID.has(id))) problems.push('every berry id a Bush can drop must exist in the food catalog (BUSH-BERRIES-01)');
  for(const [type, def] of Object.entries(LIVESTOCK_TYPES)) if(!CONFIG.ENEMIES[type] || !CONFIG.ENEMIES[type].bounty === undefined) problems.push('livestock ' + type + ' must have a matching CONFIG.ENEMIES entry (TARGET-MARK-01)');
  for(const recipe of CRAFTING_RECIPES){
    if(!lookupItemDef(recipe.result)) problems.push('craft recipe result "' + recipe.result + '" is not in the item catalog (ITEM-CRAFTING-01)');
    if(recipe.ingredients.length < 2) problems.push('craft recipe for "' + recipe.result + '" needs at least 2 ingredients (ITEM-CRAFTING-01)');
    for(const ingredientId of recipe.ingredients) if(!lookupItemDef(ingredientId)) problems.push('craft recipe for "' + recipe.result + '" needs unknown ingredient "' + ingredientId + '" (ITEM-CRAFTING-01)');
    if(recipe.ingredients.includes(recipe.result)) problems.push('craft recipe for "' + recipe.result + '" cannot use its own result as an ingredient (ITEM-CRAFTING-01)');
    if(recipe.ingredients.length > MAX_ITEM_SLOTS) problems.push('craft recipe for "' + recipe.result + '" needs more ingredients than a tower has slots (ITEM-CRAFTING-01)');
  }
  if(LIVESTOCK_MAX_ON_BOARD > 8) problems.push('livestock population must stay small (LIVESTOCK-01)');
  if(isLooseWalkableAt(-500, -500)) problems.push('loose enemies must not be allowed outside the route and its grass border (LOOSE-CONFINE-01)');
  for(const [structureType, structure] of Object.entries(CONFIG.CHANCE_STRUCTURES)){
    if(!structure.emoji || !structure.name || !(structure.useMs > 0)) problems.push(structureType + ' needs an emoji, a name and a use time (CHANCE-STRUCTURES-01)');
    if(structure.maxChance > 0.6 || structure.baseChance > structure.maxChance) problems.push(structureType + ' spawn chances must stay rare: base at most the cap, cap at most 0.6 (CHANCE-STRUCTURES-01)');
    if(structure.maxOnBoard < 1 || structure.maxOnBoard > 2) problems.push(structureType + ' may have at most 2 on the board (CHANCE-STRUCTURES-01)');
  }
  if(CONFIG.CHANCE_STRUCTURES.FOUNTAIN.healLives !== 10) problems.push('the Healing Fountain heals up to 10 lives (CHANCE-STRUCTURES-01)');
  const savedWaveState = waveState, savedWindStrength = flagWindStrength;
  for(const inProgressState of ['SPAWNING', 'ACTIVE']){
    waveState = inProgressState; flagWindStrength = 1; updateFlagWind(FLAG_WIND_FALL_MS*2);
    if(flagWindStrength !== 0) problems.push('flag wind must die while a wave is in progress (' + inProgressState + ') (FLAG-WIND-GATE-01)');
  }
  waveState = 'IDLE'; flagWindStrength = 0; updateFlagWind(FLAG_WIND_RISE_MS*2);
  if(flagWindStrength !== 1) problems.push('flag wind must blow while no wave is in progress (IDLE) (FLAG-WIND-GATE-01)');
  waveState = savedWaveState; flagWindStrength = savedWindStrength;
  return problems;
}
let designContractProblems = [];
// CA081 — see HISTORY.md § [1.5.7] Code Archaeology, CA081
function runDebugSelfTests(){
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  // CA082 — see HISTORY.md § [1.5.7] Code Archaeology, CA082
  {
    const e1 = new Enemy(); e1.spawn('GRUNT', 1, false); e1.active = true;
    const e2 = new Enemy(); e2.spawn('GRUNT', 1, false); e2.active = false;
    const targetable = [e1, e2].filter(e => e.active);
    check('dead enemy excluded from targeting query', !targetable.includes(e2) && targetable.includes(e1));
  }

  // CA083 — see HISTORY.md § [1.5.7] Code Archaeology, CA083
  {
    const e = new Enemy();
    e.spawn('GRUNT', 1, false);
    e.escaped = true; e.wanderVx = 5; e.wanderVy = -3; e.wanderRepickTimer = 500;
    e.escapedAttackTarget = { active: true }; e.escapedAttackTimer = 123; e.escapedAttackCheckTimer = 456; e.looseDrainMs = 5000;
    e.spawn('GRUNT', 1, false); // simulates pool reuse — same instance, fresh spawn
    check('escaped/wander fields reset on pool reuse', e.escaped === false && e.wanderVx === 0 && e.wanderVy === 0 && e.wanderRepickTimer === 0 && e.escapedAttackTarget === null && e.escapedAttackTimer === 0 && e.escapedAttackCheckTimer === 0);
  }

  // 3. Escaped enemies excluded from the wave-completion check, matching update()'s own filter.
  {
    const e1 = new Enemy(); e1.spawn('GRUNT', 1, false); e1.active = true; e1.escaped = false;
    const e2 = new Enemy(); e2.spawn('GRUNT', 1, false); e2.active = true; e2.escaped = true;
    const anyAlive = [e1, e2].some(e => e.active && !e.escaped);
    check('escaped enemy does not block wave completion', anyAlive === true && e2.escaped === true);
  }

  // CA084 — see HISTORY.md § [1.5.7] Code Archaeology, CA084
  {
    const savedStrength = windStrength, savedTarget = windTarget, savedTimer = windRetargetTimer, savedCeiling = windCeilingForWave;
    windStrength = 0; windTarget = 0; windRetargetTimer = 0; windCeilingForWave = 0.15;
    let maxSeen = 0;
    for(let i=0;i<500;i++){ updateWind(50); maxSeen = Math.max(maxSeen, windStrength); }
    const withinCeiling = maxSeen <= 0.15 + 1e-9;
    windStrength = savedStrength; windTarget = savedTarget; windRetargetTimer = savedTimer; windCeilingForWave = savedCeiling;
    check('wind never exceeds its wave ceiling', withinCeiling, 'max seen: ' + maxSeen.toFixed(3));
  }

  // CA085 — see HISTORY.md § [1.5.7] Code Archaeology, CA085
  {
    const savedStrength = windStrength;
    windStrength = 1;
    const warriorPenalty = windMissPenalty({ type: 'SWORDSMAN' });
    const archerPenalty = windMissPenalty({ type: 'ARCHER' });
    const magePenalty = windMissPenalty({ type: 'MAGE' });
    windStrength = savedStrength;
    check('wind never penalizes Warrior-archetype towers', warriorPenalty === 0);
    check('Mage wind penalty exceeds Archer at high wind', magePenalty > archerPenalty);
  }

  // CA086 — see HISTORY.md § [1.5.7] Code Archaeology, CA086
  {
    let allTargetsExist = true;
    for(const baseType of Object.keys(HYBRID_SPECIALIZATIONS)){
      for(const pairKey of Object.keys(HYBRID_SPECIALIZATIONS[baseType])){
        if(!CONFIG.TOWERS[HYBRID_SPECIALIZATIONS[baseType][pairKey]]) allTargetsExist = false;
      }
    }
    check('every HYBRID_SPECIALIZATIONS target exists in CONFIG.TOWERS', allTargetsExist);
  }

  // CA087 — see HISTORY.md § [1.5.7] Code Archaeology, CA087
  {
    const allReachable = EVOLVED_TOWER_TYPES.every(type => UNLOCKABLE_TOWER_TYPES.includes(type));
    check('every evolved tower type is reachable via UNLOCKABLE_TOWER_TYPES', allReachable);
  }

  // CA088 — see HISTORY.md § [1.5.7] Code Archaeology, CA088
  {
    const eBoth = new Enemy(); eBoth.spawn('GRUNT', 1, true, true); // both flags requested at once
    const eMini = new Enemy(); eMini.spawn('GRUNT', 1, false, true);
    const eNormal = new Enemy(); eNormal.spawn('GRUNT', 1, false, false);
    check('isBig/isMini stay mutually exclusive even if both requested', eBoth.isBig === true && eBoth.isMini === false);
    check('Mini variant has less HP, radius, and bounty than a normal spawn', eMini.maxHp < eNormal.maxHp && eMini.radius < eNormal.radius && eMini.bounty < eNormal.bounty);
  }

  // CA089 — see HISTORY.md § [1.5.7] Code Archaeology, CA089
  {
    check('BLOOD_ON_HIT_CHANCE is a valid probability strictly less than 1 (a real reduction, not a no-op)', typeof BLOOD_ON_HIT_CHANCE === 'number' && BLOOD_ON_HIT_CHANCE > 0 && BLOOD_ON_HIT_CHANCE < 1);
  }

  // 10. Wave plans rebuild identically from the same seed, and phases never reorder.
  {
    const planA = buildWavePlan(37), planB = buildWavePlan(37);
    const flatten = plan => plan.phases.map(ph => ph.batches.map(b => b.units.map(u => u.family + u.sizeTier).join(',')).join('|')).join('/');
    check('same seed and wave number rebuild an identical plan', flatten(planA) === flatten(planB));
    check('wave 1 is ten sequential single Tiny batches', validateWavePlan(buildWavePlan(1)).length === 0 && buildWavePlan(1).phases[0].batches.length === 10);
  }

  // 11. Escaped kills never award last-hit XP; normal kills award full tier XP to the killer.
  {
    const killer = new Tower(); killer.active = true; killer.type = 'SWORDSMAN'; killer.xp = 0; killer.expLevel = 0; killer.statPoints = 0; killer.killCount = 0; killer.waveXp = 0; killer.x = 0; killer.y = 0;
    const escapee = new Enemy(); escapee.spawn('GRUNT', 1, false); escapee.applySizeTier('TINY', 0.5, 1); escapee.escaped = true;
    escapee.damageLedger.set(killer, 10);
    awardKillExperience(escapee, killer, true);
    check('escaped kill pays only the reduced cleanup pool', Math.abs(killer.xp - SIZE_TIER_BANDS.TINY.xp * ESCAPED_CLEANUP_FRACTION) < 0.001 && killer.killCount === 0);
    killer.active = false;
  }

  // 12. Larger tiers are always slower, bigger, tougher, and worth more.
  {
    const tiny = new Enemy(); tiny.spawn('RUNNER', 1, false); tiny.applySizeTier('TINY', 0, 1);
    const large = new Enemy(); large.spawn('RUNNER', 1, false); large.applySizeTier('LARGE', 1, 1);
    check('Large Runner is slower, bigger, and tougher than a Tiny Runner', large.speed < tiny.speed && large.radius > tiny.radius && large.maxHp > tiny.maxHp);
  }

  // 13. Wave 1-15 focused-farm benchmark: half the weighted last hits fills 100+ training bars.
  {
    let budget = 0;
    for(let waveNumber = 1; waveNumber <= 15; waveNumber++) budget += expectedXpBudget(waveNumber);
    check('50% weighted last hits across waves 1-15 yields at least 100 training bars', budget * 0.5 / TRAINING_BAR_XP >= 100, Math.round(budget) + ' XP');
  }

  // CA090 — see HISTORY.md § [1.5.7] Code Archaeology, CA090
  {
    const straightAngle = calculateLeadIntercept(0, 0, 300, 100, 0, 0, 0);
    const stationaryOk = Math.abs(straightAngle) < 0.0001;
    const leadAngle = calculateLeadIntercept(0, 0, 300, 100, 0, 0, 150);
    const leadOk = Number.isFinite(leadAngle) && leadAngle > 0.0001; // shot must aim below the straight line (+Y) to actually catch a target moving in +Y
    check('calculateLeadIntercept aims directly at a stationary target', stationaryOk, straightAngle.toFixed(4));
    check('calculateLeadIntercept leads a perpendicular-moving target', leadOk, leadAngle.toFixed(4));
  }

  const passed = results.filter(r => r.pass).length;
  console.log('runDebugSelfTests(): ' + passed + '/' + results.length + ' passed');
  for(const r of results) console.log((r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  return results;
}
/* =========================================================
   START / END SCREENS
   ========================================================= */
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    graphicsQuality = btn.dataset.quality;
    syncAutoRenderScaleDefaultForGraphics();
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.toggle('selected', b === btn));
    setupCanvas();
    applyQualityDefaultShake();
    savePrefs();
  });
});
let firstFighterBuiltInSession = false;
let firstWaveStartedInSession = false, firstNextWaveUsedInSession = false, firstSpeedUpUsedInSession = false;
// INTRO-EVERY-GAME-01 (1.7.42): owner decision — the build, next wave and speed-up arrows play on every new playthrough, so nothing about them is remembered between visits any more.
function firstWaveWasStarted(){ return firstWaveStartedInSession; }
function firstNextWaveWasUsed(){ return firstNextWaveUsedInSession; }
function firstSpeedUpWasUsed(){ return firstSpeedUpUsedInSession; }
const firstCueSoundsSeen=new Set();
function soundFirstPlayCue(id){
  if(gameState!=='PLAYING' || firstCueSoundsSeen.has(id) || document.hidden) return;
  firstCueSoundsSeen.add(id);playSound('click');
}
function syncFirstPlayCues(){
  const nextHint = document.getElementById('first-next-wave-hint');
  const speedHint = document.getElementById('first-speed-hint');
  const sequenceStarted = firstWaveWasStarted() || waveIndex > 0 || wavesCompleted > 0;
  const sequenceDismissed = firstSpeedUpWasUsed();
  if(nextHint) nextHint.classList.toggle('hidden', !(!sequenceStarted && !sequenceDismissed && firstFighterWasBuilt()));
  if(speedHint) speedHint.classList.toggle('hidden', !(sequenceStarted && !sequenceDismissed));
  const buildHint=document.getElementById('first-build-hint');
  if(!sequenceStarted && !sequenceDismissed && !firstFighterWasBuilt() && buildHint && !buildHint.classList.contains('hidden')) soundFirstPlayCue('build');
  else if(!sequenceStarted && !sequenceDismissed && firstFighterWasBuilt()) soundFirstPlayCue('wave');
  else if(sequenceStarted && !sequenceDismissed) soundFirstPlayCue('speed');
  positionNotificationControls();
}
function markFirstWaveStarted(){
  reportOnboardingStep('first_wave_started');
  firstWaveStartedInSession = true;
  syncFirstPlayCues();
}
function markFirstNextWaveUsed(){
  if(!firstWaveWasStarted() || firstNextWaveWasUsed()) return;
  firstNextWaveUsedInSession = true;
  syncFirstPlayCues();
}
function markFirstNextWaveCueAction(){ markFirstNextWaveUsed(); }
function markFirstFighterBuilt(){
  reportOnboardingStep('first_defender');
  firstFighterBuiltInSession = true;
  const hint = document.getElementById('first-build-hint');
  if(hint) hint.classList.add('hidden');
  syncFirstPlayCues();
}
function firstFighterWasBuilt(){ return firstFighterBuiltInSession; }
function markFirstSpeedUpUsed(){
  if(!firstWaveWasStarted() && waveIndex === 0 && wavesCompleted === 0) return;
  reportOnboardingStep('first_speed_change');
  firstSpeedUpUsedInSession = true;
  const hint = document.getElementById('first-speed-hint');
  if(hint) hint.classList.add('hidden');
}
document.getElementById('playBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  let isFirstVisit = true;
  try{ isFirstVisit = !localStorage.getItem('stickTD_welcomeSeen'); }catch(err){ isFirstVisit = true; }
  unlockAudio();
  audioEngine.startMusic();
  audioEngine.setMusicPhase('field', true);
  startScreen.classList.add('hidden');
  document.getElementById('hud-top').style.display = 'flex';
  invalidateDebugOverlayLayout();
  // CA788 — see HISTORY.md § [1.5.7] Code Archaeology, CA788
  fitHudTopToOneLine(true);
  positionZoomControls();
  recordStateTransition('PLAYING'); gameState = 'PLAYING';
  centerCameraOnActiveRegion();
  lastTime = performance.now();
  blowingLeaves = [];
  updateHUD();
  beginTelemetryRun(false);
  const hasBuiltFighter = towerPool.some(tower => tower.active && isFighterTower(tower));
  if(hasBuiltFighter) markFirstFighterBuilt();
  const firstBuildHint = document.getElementById('first-build-hint');
  if(firstBuildHint) firstBuildHint.classList.toggle('hidden', firstFighterWasBuilt());
  syncFirstPlayCues();
  try{ if(isFirstVisit) localStorage.setItem('stickTD_welcomeSeen', '1'); }catch(err){}
});
window.addEventListener('pagehide', (event) => {
  telemetryStateChange('PAUSED');
  if(event.persisted) reportPlayActivity('pagehide');
  else reportSessionSummary('pagehide');
});
window.addEventListener('pageshow', () => telemetryStateChange(gameState));
document.addEventListener('visibilitychange', () => {
  telemetryStateChange(gameState);
  if(document.hidden) reportPlayActivity('hidden');
});
document.addEventListener('visibilitychange', () => audioEngine.setMusicPaused(document.hidden || gameState === 'PAUSED'));
document.getElementById('endDownloadLogBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  downloadDebugLogFile(); // GAMEOVER-LOG-01 (1.6.2) — see HISTORY.md § [1.6.2]
});
document.getElementById('restartBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  // RESTART-RELOAD-01 (1.6.2) — see HISTORY.md § [1.6.2]. Was resetGame() (a long manual
  // reset of dozens of in-memory variables) — replaced with a real browser reload so a restart is
  // guaranteed clean, not dependent on resetGame() correctly zeroing every single piece of state
  // this 16,000-line engine accumulates over a run.
  window.location.reload();
});
function endGame(message, cause){
  if(gameState==='GAME_OVER') return;
  recordStateTransition('GAME_OVER'); gameState = 'GAME_OVER';
  audioEngine.stopMusic();
  sessionTelemetry.gameOverReported = true;
  endTitle.textContent = 'Game Over';
  endMessage.textContent = message || ('The horde broke through on wave ' + waveIndex + '.\nRebuild your squad and try again.'); // GAMEOVER-LAYOUT-01 (1.6.79) — see HISTORY.md § [1.6.79]
  playSound('lose');
  endScreen.classList.remove('hidden');
  trackGameEvent('game_over', {
    cause: cause || 'lives', wave_reached: waveIndex, waves_completed: wavesCompleted,
    duration_s: Math.round(telemetryActiveMs()/1000),
    towers_built: sessionTelemetry.towersBuilt, towers_downed: sessionTelemetry.towersDowned, lives_bought: livesBought, loose_end: countLooseEnemies(), fps_median: perfMedianFps()
  });
  maybeReportLag();
  reportSessionSummary();
  if(stealthRun && stealthSantaSpawned && !stealthEncounterEnding){
    stealthEncounterEnding=true;
    if(stealthSantaDefeated) endTitle.textContent='Stealth Victory';
    document.getElementById('consentSantaLine').textContent=stealthSantaDefeated
      ? 'You beat Santa! Ninja is unlocked. Ho, ho, ho—would you give Santa analytics cookies for your next adventure? They help improve StickTD.'
      : 'Ho, ho, ho! A brave adventure. Would you give Santa analytics cookies for your next adventure? They help improve StickTD.';
    window.afterStealthConsentChoice=()=>window.location.reload();
    window.openStickTDAnalyticsChoice();
  }
}
