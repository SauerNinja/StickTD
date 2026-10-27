"use strict";
// Canvas and input setup, HUD, menus, shop, the inspect panel and the pause, speed and zoom controls. Loaded after js/loop.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   CANVAS / INPUT SETUP
//   UI WIRING
//   BUILD MENU, HACK MENU AND SHOP
//   INVENTORY SLOT DRAG AND GESTURES
//   SETTINGS PANEL, RESET AND README
//   INSPECT PANEL, PAUSE, SPEED AND ZOOM CONTROLS
/* =========================================================
   CANVAS / INPUT SETUP
   ========================================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // OPAQUE-CANVAS-01
const OPAQUE_CANVAS_BACKGROUND = '#8b5a2b'; // the --dirt page colour
ctx.fillStyle = OPAQUE_CANVAS_BACKGROUND; ctx.fillRect(0, 0, canvas.width, canvas.height);
let dprValue = 1;
let cachedCanvasRect = null;
function getCanvasRect(){
  if(!cachedCanvasRect) cachedCanvasRect = canvas.getBoundingClientRect();
  return cachedCanvasRect;
}
let mapCanvasReady = false;
let settledDecalCanvasReady = false;
// EMPTY-LAYER-SKIP-01: measured at 2560 by 1305 with software drawing, blitting the empty settled-decal layer cost about 11 ms every frame
// (26.2 ms against 15.3 ms on an empty board). The layer is only drawn once something has actually been stamped into it.
let settledDecalHasContent = false, settledDecalRevision = 0;
function updateCanvasDimensions(){
  CANVAS_W = window.innerWidth || 800;
  CANVAS_H = window.innerHeight || 600;
}
// RENDER-GOVERNOR-01: automatic render scaling, a setting the player can turn off
const RENDER_SCALE_STEPS = [1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25];
// RENDER-FLOOR-01
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
// REPAINT-01: any event that can leave the canvas blank (a resize, coming back from the background, a restored canvas context) asks for one immediate frame, which skips the 30 FPS limiter and also draws while the game is paused.
let repaintPending = false;
function requestRepaint(){ repaintPending = true; }
let resizeSnapshotCanvas = null;
function setupCanvas(){
  if(graphicsQuality === 'high'){ renderScaleStep = 0; renderScaleFloorPercent = 100; }
  updateCanvasDimensions();
  const dprCap = 2; // SHARP-CANVAS-01
  const newDpr = Math.min(window.devicePixelRatio || 1, dprCap) * RENDER_SCALE_STEPS[renderScaleStep];
  const dprChanged = newDpr !== dprValue;
  dprValue = newDpr;
  const backingWidth = Math.round(CANVAS_W * dprValue), backingHeight = Math.round(CANVAS_H * dprValue);
  if(canvas.width === backingWidth && canvas.height === backingHeight && !dprChanged){ ctx.imageSmoothingQuality = graphicsQuality === 'low' ? 'low' : 'high'; cachedCanvasRect = null; return; }
  // RESIZE-KEEP-01: changing the canvas size clears it to opaque black, and on a phone the 30 FPS limiter skips every other frame, so a resize (browser bar, chat sheet) that landed on a skipped frame showed a black flash.
  resizeSnapshotCanvas = resizeSnapshotCanvas || document.createElement('canvas');
  const hadPicture = canvas.width > 0 && canvas.height > 0;
  if(hadPicture){ resizeSnapshotCanvas.width = canvas.width; resizeSnapshotCanvas.height = canvas.height; resizeSnapshotCanvas.getContext('2d').drawImage(canvas, 0, 0); }
  canvas.width = backingWidth;
  canvas.height = backingHeight;
  if(hadPicture){ ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(resizeSnapshotCanvas, 0, 0, resizeSnapshotCanvas.width, resizeSnapshotCanvas.height, 0, 0, canvas.width, canvas.height); resizeSnapshotCanvas.width = resizeSnapshotCanvas.height = 0; }
  ctx.setTransform(dprValue,0,0,dprValue,0,0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = graphicsQuality === 'low' ? 'low' : 'high'; // resizing the canvas clears context state, so this must be reapplied
  if(mapCanvasReady && dprChanged) resizeMapCanvasForDpr();
  cachedCanvasRect = null; // canvas geometry may have changed — force a fresh read on next pointer event
}
setupCanvas();
window.addEventListener('resize', () => { setupCanvas(); clampCamera(); requestRepaint(); }); // re-clamp (not re-center) so pan/zoom stays valid without jarringly resetting the view mid-game
window.addEventListener('orientationchange', () => { cachedCanvasRect = null; requestRepaint(); }); // some mobile browsers fire this without a corresponding resize
let hudFitSignature = '';
let notificationLayoutSignature='';
// NOTIFICATION-BELL-LEFT-01
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
  const sig=[innerWidth,innerHeight,hud.style.display,hud.style.transform,document.getElementById('buildBtn')?.textContent,hasCue].join('|');
  if(!force && sig===notificationLayoutSignature) return;
  notificationLayoutSignature=sig;
  const frameRect=frame.getBoundingClientRect(),hudRect=hud.getBoundingClientRect();
  const hudBottom=hudRect.height>0?Math.max(0,hudRect.bottom-frameRect.top):0;
  const floatingBell=bell.parentElement!==hud;
  bell.hidden=floatingBell && getComputedStyle(hud).display==='none';
  const bellRect=bell.getBoundingClientRect();
  const contentLeft=Math.max(8,clampNum(frameRect.width-80, 8, bellRect.left-frameRect.left));
  frame.style.setProperty('--notification-content-left',contentLeft+'px');
  const top=Math.ceil((floatingBell ? Math.max(0,bellRect.bottom-frameRect.top) : hudBottom)+4);
  frame.style.setProperty('--notification-controls-top',top+'px');
  frame.style.setProperty('--notification-content-top',top+'px');
}
function fitHudTopToOneLine(force){
  const hud = document.getElementById('hud-top');
  if(!hud) return;
  const buildLabel = document.getElementById('buildBtn')?.textContent || '';
  // DOM-REFLOW-01: the fit signature reads window.innerWidth only, never a layout property; resize listeners force a re-fit.
  const sig = String(window.innerWidth) + '|' + buildLabel;
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
// TEXT-FIT-01: text that does not fit its box shrinks until it sits on one line, down to a readable floor; it never wraps.
const SHOP_TEXT_MIN_PX = 8;
function shrinkTextToOneLine(el, minPx){
  el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize);
  while(el.scrollWidth > el.clientWidth + 0.5 && size > minPx){ size = Math.max(minPx, size - 0.5); el.style.fontSize = size + 'px'; }
}
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
canvas.style.width = '100%';
canvas.style.height = '100%';
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
  if(gameState === 'PAUSED'){ resumeGame(); return; }
  if(gameState !== 'PLAYING') return;
  const {x,y} = toRawCanvasCoords(clientX, clientY);
  const worldX = (x - camera.x)/camera.zoom, worldY = (y - camera.y)/camera.zoom;
  const gx = Math.floor(worldX/TILE_SIZE), gy = Math.floor(worldY/TILE_SIZE);
  if(gx<0||gx>=COLS||gy<0||gy>=ROWS) return;
  if(placingCampfire){ placeCampfire(gx,gy); return; }
  if(moveModeTower){ attemptMoveTower(gx, gy); return; }
  if(tryOpenCaravan(worldX, worldY)) return;
  if(tryCollectAmbientLog(worldX, worldY, pointerType)) return;
  if(!tryMarkTargetAt(worldX, worldY)) setMarkedTarget(null); // PIN-TAP-ONLY-01
  const sceneryHit = sceneryAtPoint(worldX, worldY);
  if(sceneryHit){
    if(selectedBuildType){playSound('ui_deny');return;}
    startClearingScenery(sceneryHit.item);
    return;
  }
  const existing = towerPool.find(t => t.active && t.gridX===gx && t.gridY===gy);
  if(existing){
    if(selectedBuildType){ playSound('ui_deny'); return; }
    closeBuildMenuIfOpen();
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
    if(isFighterTower(t)){ markFirstFighterBuilt(); hintIfFighterOutOfReach(t); }
    startCameraFollow(t);
    inspPanelExpanded = false;
    playSound('build_note');
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
  if(gameState === 'PLAYING' && !draggingGroundItem && coinPickups.length){ const hoverPoint = toCanvasCoords(e); tryCollectCoinAt(hoverPoint.x, hoverPoint.y, e.pointerType, true); } // HOVER-COIN-01: a mouse hover or a finger sliding over a coin collects it
  if(collectedPickupPointers.has(e.pointerId)) return;
  if(activePointers.size === 2 && (draggingGroundItem || collectedPickupPointers.size)) return;
  const prev = activePointers.get(e.pointerId);
  if(prev) activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(activePointers.size === 2){
    const { dist, mid } = pinchInfo();
    if(pinchStartDist){
      const raw = toRawCanvasCoords(mid.x, mid.y);
      zoomAt(raw.x, raw.y, camera.zoom * (dist/pinchStartDist));
      if(gameState !== 'PLAYING') requestPausedRender();
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
      if(gameState !== 'PLAYING') requestPausedRender();
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
      } else if(draggingGroundItem.itemDef.isGoldBag){ // GOLD-BAG-ITEM-01
        if(target) openGoldBag(draggingGroundItem, target.x, target.y - 4);
        else if(!isDragging) openGoldBag(draggingGroundItem, draggingGroundItem.x, draggingGroundItem.y);
      } else if(isConsumableDef(draggingGroundItem.itemDef)){ // CONSUMABLE-STORED-01
        const def = draggingGroundItem.itemDef;
        if(def.isFood && target && !isVaultType(target.type)){ eatDroppedFood(draggingGroundItem, target); // FOOD-STATS-01: food is eaten on the spot
        } else if(target && target.receiveItem(def)){
          groundItems = groundItems.filter(gi => gi !== draggingGroundItem);
          spawnFloatingText(target.x, target.y - 40, def.icon, '#ffffff', ITEM_POPUP_LIFE_MS); // ITEM-DROP-EMOJI-01
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
      } else if(target && target.equippedItems.length >= itemCapacityOf(target)){
        rejectFullInventoryDrop(draggingGroundItem,target);
      } else if(draggingGroundItem.itemDef.isBarricade){
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
      }
      if(!target && isDragging && groundItems.includes(draggingGroundItem)){
        draggingGroundItem.x = dragItemPos.x; draggingGroundItem.y = dragItemPos.y;
        draggingGroundItem.placedByPlayer = true; // ITEM-DRIFT-01: an item the player set down stays where it was put
        playSound('click');
      }
    } else if(!isCancel && !collectedPickup && !draggingGroundItem && !isDragging){
      handleTap(e.clientX, e.clientY, e.pointerType);
    }
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
  if(gameState !== 'PLAYING') requestPausedRender();
}, { passive:false });
/* =========================================================
   UI WIRING
   ========================================================= */
const livesVal = document.getElementById('livesVal');
const goldVal = document.getElementById('goldVal');
const waveVal = document.getElementById('waveVal');
const shopLivesVal = document.getElementById('shopLivesVal');
const shopBuyLifeCost = document.getElementById('shopBuyLifeCost');
const woodVal = document.getElementById('woodVal');
const stoneVal = document.getElementById('stoneVal');
const looseNotice = document.getElementById('looseNotice');
const nextWaveBtn = document.getElementById('nextWaveBtn');
const inspectPanel = document.getElementById('inspect-panel');
const inspName = document.getElementById('inspName');
const inspLevel = document.getElementById('inspLevel');
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
let hudDirty = false;
function updateHUD(){ hudDirty = true; }
function flushHUDIfDirty(){
  if(!hudDirty) return;
  hudDirty = false;
  // HUD-TIMING-01: the HUD flush runs outside the update and render timers, so it is timed on its own (smoothed) for the debug overlay.
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
// LIVES-POP-01
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
function merchantShopOpen(){
  return caravanShopAvailable() || towerPool.some(t => t.active && t.type === 'MERCHANT' && t.disabledWavesLeft <= 0);
}
function nextWaveActionLabel(wavesStarted){ const bonus = waveState === 'IDLE' ? earlyCallBonusNow() : 0; return (wavesStarted === 0 ? 'Start Wave' : 'Next Wave') + (bonus > 0 ? ' +💰' + bonus : ''); } // EARLY-CALL-01: the button shows the early-call gold while it lasts
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
  setHudText(looseNotice, ''); looseNotice.hidden = true; // LOOSE-NOTICE-REMOVED-01, HEART-BREAK-01
  const wavePhaseEl = document.getElementById('wavePhase');
  if(wavePhaseEl){
    const phaseLabel = waveState === 'IDLE' ? 'STANDBY' : waveState === 'SPAWNING' ? 'INCOMING' : 'FIGHTING'; // WAVE-PHASE-TEXT-01
    if(wavePhaseEl.dataset.phase !== phaseLabel) wavePhaseEl.dataset.phase = phaseLabel;
    const enemiesLeft = waveState === 'ACTIVE' ? routeObligationCount() : 0; // SCHELL-VISIBLE-PROGRESS-01: once every enemy is out, the label counts down what is left
    const phaseText = enemiesLeft > 0 ? enemiesLeft + ' LEFT' : phaseLabel;
    if(wavePhaseEl.textContent !== phaseText) wavePhaseEl.textContent = phaseText;
  }
  const waveActionText = nextWaveActionLabel(waveIndex) + ' ';
  if(nextWaveBtn.firstChild && nextWaveBtn.firstChild.textContent !== waveActionText) nextWaveBtn.firstChild.textContent = waveActionText;
  nextWaveBtn.disabled = waveState !== 'IDLE';
  syncFirstPlayCues();
  refreshTrayUI();
  if(towerModalEl && !towerModalEl.classList.contains('hidden')) buildTowerModal();
  fitHudTopToOneLine(); // guarded internally — only re-measures when the available layout changes
}
/* =========================================================
   BUILD MENU, HACK MENU AND SHOP
   ========================================================= */
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
    expandRow.classList.toggle('unaffordable', gold < cost); // EXPAND-COST-CUE-01
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
    const nameHtml = def.name + (capacity ? ' <span style="color:#e63946">(already active)</span>' : '');
    if(!capacity) row.classList.toggle('unaffordable', !affordable);
    const name = row.querySelector('.name');
    if(row.dataset.liveName !== nameHtml){ name.innerHTML = nameHtml; row.dataset.liveName = nameHtml; }
    const costEl = row.querySelector('.cost');
    if(costEl && costEl.textContent !== label) costEl.textContent = label;
  }
}
let buildMenuSignature = null;
function chooseBuildType(type){
  selectedBuildType = type;
  selectedTower = null; cancelCameraFollow();
  inspPanelExpanded = false;
  playSound('click');
  closeTowerModal();
  updateInspectPanel();
  refreshTrayUI();
}
// BUILD-HELP-01: every row's ? button opens the shared help popup (see openBuildHelp); the row's hidden blurb is the popup's text.
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
  expandRow.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    unlockAudio();
    if(regionFullyExpanded() || expansionBlockedReason() || gold < expansionCost()) return;
    if(expandRegion()){ updateHUD(); closeTowerModal(); }
  });
  addBuildSection('Stickmen Defenders');
  for(const type of STARTER_TOWER_TYPES){
    if(type === 'BARRICADE') continue;
    const def = CONFIG.TOWERS[type];
    const unlocked = isTowerBuildableNow(type);
    const costLabel = '💰' + currentBuildCost(type);
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
        e.stopPropagation();
        if(gold >= currentBuildCost(type)) chooseBuildType(type);
      });
    }
    grid.appendChild(row);
  }
  // UNLOCK-HELP-01: a locked class shows its full description, which says what it does and every way it is unlocked: its training route and, when it has one, the wave that also unlocks it.
  const unlockWaveNote = def => def.unlocksAfterWave > 0 && !/Wave \d/.test(def.blurb) ? ' It also unlocks on its own once Wave ' + def.unlocksAfterWave + ' is cleared.' : '';
  const TOWER_UNLOCK_RIDDLE = Object.fromEntries(UNLOCKABLE_TOWER_TYPES.filter(type => CONFIG.TOWERS[type]).map(type => [type, '🔒 ' + CONFIG.TOWERS[type].blurb + unlockWaveNote(CONFIG.TOWERS[type])]));
  // BUILD-ORDER-01: unlocked classes sort above locked ones; the stable sort keeps the unlock-path order within each group.
  const sortedUnlockableTowerTypes = [...UNLOCKABLE_TOWER_TYPES].sort((a, b) => {
    const aLocked = unlockedTowerTypes.has(a) ? 0 : 1;
    const bLocked = unlockedTowerTypes.has(b) ? 0 : 1;
    return aLocked - bLocked;
  });
  const appendUnlockableRow = (type) => {
    const def = CONFIG.TOWERS[type];
    const unlocked = unlockedTowerTypes.has(type);
    const costLabel = '💰' + def.baseCost;
    const lockMsg = TOWER_UNLOCK_RIDDLE[type] || '🔒 Locked — a secret combination unlocks this';
    const atCapacity = unlocked && !isTowerTypeAvailable(type);
    const row = document.createElement('div');
    row.dataset.buildType = type;
    row.className = 'build-row' + (unlocked ? '' : ' locked') + (selectedBuildType===type ? ' selected' : '');
    row.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name +
        (atCapacity ? ' <span style="color:#e63946">(already active)</span>'
          : '') +
        '</div>' +
      (unlocked ? '<div class="cost">' + costLabel + '</div>' : '') +
      '<button class="help-btn" type="button">?</button>' +
      (unlocked
        ? '<div class="build-row-blurb">' + def.blurb + (MAX_ONE_PER_BOARD_TYPES.includes(type) && !/only one/i.test(def.blurb) ? ' Only one can be active.' : '') + '</div>'
        : '<div class="build-row-lock">' + lockMsg + '</div>');
    if(unlocked){
      row.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if(gold >= def.baseCost && isTowerTypeAvailable(type)) chooseBuildType(type);
      });
    }
    grid.appendChild(row);
  };
  let lockedSectionAdded = false;
  let fortificationSectionAdded = false;
  const appendBarricadeSection = () => {
    if(fortificationSectionAdded) return;
    fortificationSectionAdded = true;
    addBuildSection('Fortifications');
    const def = CONFIG.TOWERS.BARRICADE;
    const unlocked = isTowerBuildableNow('BARRICADE');
    const isFreeBarricade = freeBarricadesLeft > 0;
    const liveBarricadeCost = currentBarricadeCost();
    const costLabel = isFreeBarricade ? '🎁 FREE!' : '🪵' + liveBarricadeCost.wood + ' 🪨' + liveBarricadeCost.stone;
    const row = document.createElement('div');
    row.dataset.buildType = 'BARRICADE';
    row.className = 'build-row' + (unlocked ? '' : ' locked') + (selectedBuildType==='BARRICADE' ? ' selected' : '');
    row.innerHTML = '<div class="icon">' + def.icon + '</div><div class="name">' + def.name + '</div>' +
      (unlocked ? '<div class="cost">' + costLabel + '</div>' : '') + '<button class="help-btn" type="button">?</button>' +
      (unlocked ? '<div class="build-row-blurb">' + def.blurb + '</div>' : '<div class="build-row-lock">🔒 Unlocks through play</div>');
    if(unlocked) row.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if(canAffordTower('BARRICADE')) chooseBuildType('BARRICADE');
    });
    grid.appendChild(row);
  };
  for(const type of sortedUnlockableTowerTypes) if(unlockedTowerTypes.has(type)) appendUnlockableRow(type); // BUILD-MENU-GROUPS-03: every unlocked stickman stands in Stickmen Defenders
  addBuildSection('Structures');
  grid.appendChild(expandRow);
  for(const producerType of PRODUCER_TYPES){
    const producerConfig = CONFIG.TOWERS[producerType], liveCost = producerBuildCost(producerType), affordable = canAffordProducerCost(liveCost), costLabel = producerCostLabel(liveCost);
    const row = document.createElement('div');
    row.dataset.buildType = producerType;
    row.className = 'build-row' + (selectedBuildType === producerType ? ' selected' : '') + (affordable ? '' : ' unaffordable');
    row.innerHTML = '<div class="icon">' + producerConfig.icon + '</div><div class="name">' + producerConfig.name + '</div><div class="cost">' + costLabel + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">' + producerConfig.blurb + '</div>';
    row.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if(canAffordTower(producerType)) chooseBuildType(producerType);
    });
    grid.appendChild(row);
  }
  const campfireRow = document.createElement('div');
  campfireRow.className = 'build-row campfire-build-row' + (canAffordCampfire() ? '' : ' unaffordable');
  campfireRow.innerHTML = '<div class="icon">🔥</div><div class="name">Campfire</div><div class="cost">' + producerCostLabel({ gold: CAMPFIRE_BUILD_GOLD, wood: CAMPFIRE_BUILD_WOOD, stone: CAMPFIRE_BUILD_STONE }) + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">Built on empty grass. Cooks ingredients gathered from the ground and every stickman\'s inventory, burning stored wood as fuel.</div>';
  campfireRow.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if(!canAffordCampfire()){ playSound('ui_deny'); return; }
    selectedBuildType = null; selectedTower = null; moveModeTower = null; cancelCameraFollow(); placingCampfire = true; closeTowerModal(); refreshTrayUI(); showToast('🔥 Place campfire on empty grass');
  });
  grid.appendChild(campfireRow);
  for(const type of sortedUnlockableTowerTypes){
    if(unlockedTowerTypes.has(type)) continue;
    if(!lockedSectionAdded){ appendBarricadeSection(); addBuildSection('Locked'); lockedSectionAdded = true; }
    appendUnlockableRow(type);
  }
  appendBarricadeSection();
  if(hacksEnabled){
    addBuildSection('Hacks');
    const def = CONFIG.TOWERS.HACKER;
    const atCapacity = !isTowerTypeAvailable('HACKER');
    const costLabel = '💰' + def.baseCost;
    const row = document.createElement('div');
    row.dataset.buildType = 'HACKER';
    row.className = 'build-row' + (selectedBuildType === 'HACKER' ? ' selected' : '');
    row.innerHTML = '<div class="icon">' + def.icon + '</div><div class="name">' + def.name + (atCapacity ? ' <span style="color:#e63946">(already active)</span>' : '') + '</div><div class="cost">' + costLabel + '</div><button class="help-btn" type="button">?</button><div class="build-row-blurb">' + def.blurb + '</div>';
    row.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if(gold >= def.baseCost && isTowerTypeAvailable('HACKER')) chooseBuildType('HACKER');
    });
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
// HACKER-01: the Hacker's developer menu. Every action is a plain game-state edit and marks the run as hacked
// so the debug log shows it. Not saved with the game; the toggles reset on reload.
let hackMenuOpenFor = null;
function openHackMenu(tower){
  const modal = document.getElementById('hack-modal');
  if(!modal) return;
  closeBuildMenuIfOpen();
  hackMenuOpenFor = tower;
  modal.classList.remove('hidden');
  const body = document.getElementById('hack-modal-body');
  const grant = label => '<button type="button" data-hack="' + label + '">' + label + '</button>';
  body.innerHTML =
    '<p class="hack-note">💰 ' + Math.floor(gold) + ' &nbsp; 🪵 ' + Math.floor(wood) + ' &nbsp; 🪨 ' + Math.floor(stone) + '</p>' +
    '<h3>Gold</h3><div class="hack-row hack-row-4">' + ['+💰100','+💰1,000','+💰10,000','+💰100,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Wood</h3><div class="hack-row">' + ['+🪵100','+🪵1,000','+🪵10,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Stone</h3><div class="hack-row">' + ['+🪨100','+🪨1,000','+🪨10,000'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Stickmen</h3><div class="hack-row hack-row-stack">' + ['Heal and revive all','+5 stat points to all','+25 stat points to all'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Field</h3><div class="hack-row hack-row-stack">' + ['Defeat every enemy now','Expand the map now'].map(l => grant(l)).join('') + '</div>' +
    '<h3>Summon</h3><div class="hack-row hack-row-stack">' + ['Summon the caravan','Summon a circus','Summon a troll'].map(l => grant(l)).join('') + '</div>' +
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
    case 'Summon the caravan': // HACK-SUMMON-01: summons respect the one-at-a-time limit of each visitor
      if(!spawnCaravan()) showToast('🐪 The caravan is already here.');
      break;
    case 'Summon a circus':
      if(liveCircuses().length > 0) showToast('🎪 A circus is already set up.');
      else if(!setUpCircusAt(findFreeTileBesideRoad())) showToast('🎪 No room beside the road for a circus.');
      break;
    case 'Summon a troll':
      if(trollIsOnBoard()) showToast('🧌 A troll is already here.');
      else if(!spawnWanderingTroll()) showToast('🧌 No room for a troll to enter.');
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
// MENU-EXCLUSIVE-01: opening the shop, settings, a stickman's panel, the hack menu or the cooking dialog closes the build menu so two panels never stack.
function closeBuildMenuIfOpen(){
  if(towerModalEl.classList.contains('hidden')) return;
  closeBuildHelp();
  towerModalEl.classList.add('hidden');
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
  closeBuildMenuIfOpen();
  document.getElementById('shop-modal').classList.remove('hidden');
  buildShopGrid(); // after unhiding, so text fitting can measure
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
  const addDivider = text => { const divider = document.createElement('div'); divider.className = 'shop-section-divider'; divider.style.gridColumn = '1/-1'; const [title, ...rest] = text.split(' — '); divider.innerHTML = '<span class="shop-divider-title"></span><span class="shop-divider-note"></span>'; divider.firstChild.textContent = title; divider.lastChild.textContent = rest.join(' — '); grid.appendChild(divider); }; // SHOP-ONE-LINE-01: title and note each sit on their own line
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
  for(const def of UNIVERSAL_ITEMS.filter(d => !d.isBarricade)){ // barricades are built from the Build menu
    const alreadyOwned = towerSelected && selectedTower.equippedItems.some(i => i.id === def.id);
    const full = towerSelected && selectedTower.equippedItems.length >= MAX_ITEM_SLOTS;
    const canBuy = towerSelected && !full && gold >= def.cost && (!def.woodCost || wood >= def.woodCost) && (!def.stoneCost || stone >= def.stoneCost);
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (canBuy ? '' : ' disabled') + (alreadyOwned ? ' owned' : '');
    let costLine = '💰' + def.cost;
    if(def.woodCost) costLine += ' 🪵' + def.woodCost;
    if(def.stoneCost) costLine += ' 🪨' + def.stoneCost;
    card.innerHTML =
      '<div class="icon">' + def.icon + '</div>' +
      '<div class="name">' + def.name + '</div>' +
      '<div class="stat-line">' + itemStatSummary(def) + '</div>' +
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
  addDivider('🩹 Medical Supplies — used from your inventory, never equipped');
  for(const def of MEDICAL_ITEMS){
    const alreadyHeld = def.isRevive && hasDefibrillator;
    const canBuy = !alreadyHeld && gold >= def.cost;
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (canBuy ? '' : ' disabled') + (alreadyHeld ? ' owned' : '');
    const desc = def.isRevive ? 'Revives you once at ' + Math.round(DEFIBRILLATOR_REVIVE_LIVES_FRACTION*100) + '% lives' : def.healFraction ? 'Heals ' + Math.round(def.healFraction*100) + '% of lost lives' : 'Heals ' + def.healLives + ' lives';
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
  addDivider('🧪 Potions, Tonics and Revival — potions fill the pack; Revive raises the downed');
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
    reviveCard.innerHTML = '<div class="icon">✨</div><div class="name">Revive</div><div class="stat-line">' + (canReviveSelectedStickman() ? 'Back at ' + Math.round(REVIVE_STICKMAN_HP_FRACTION*100) + '% health' : 'Select a downed stickman') + '</div><div class="cost">💰' + REVIVE_STICKMAN_COST + '</div>';
    if(canRevive) reviveCard.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(reviveSelectedStickman()){ updateHUD(); updateInspectPanel(); buildShopGrid(); } });
    grid.appendChild(reviveCard);
  }
  addDivider('✨ Passive Bonuses — permanent, for every stickman, now and later');
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
  // GOLD-SINKS-01
  const addCard = (icon, name, line, cost, enabled, onBuy, owned) => {
    const card = document.createElement('div');
    card.className = 'shop-item-card' + (enabled ? '' : ' disabled') + (owned ? ' owned' : '');
    card.innerHTML = '<div class="icon">' + icon + '</div><div class="name">' + name + '</div><div class="stat-line">' + line + '</div><div class="cost">💰' + cost + '</div>';
    if(enabled) card.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(!requireShopAccess()) return; if(onBuy()) buildShopGrid(); });
    grid.appendChild(card);
  };
  const stickmanReady = towerSelected && isFighterTower(selectedTower) && selectedTower.type !== 'HACKER';
  addDivider('🧺 Market — eaten at once; each one raises the next price');
  for(const ration of RATIONS) addCard(ration.icon, ration.name, '+' + RATION_STAT_GAIN + ' ' + ration.stat.toUpperCase() + ' · bought x' + (marketBought[ration.stat] || 0), rationCost(ration.stat), stickmanReady && gold >= rationCost(ration.stat), () => buyRation(ration.stat));
  addDivider('🏋️ Training Yard — experience for the selected stickman');
  addCard('🎯', 'Drill', '+' + (foodFruitXp()*DRILL_XP_MULTIPLIER) + ' XP · drilled x' + drillsBought, drillCost(), stickmanReady && gold >= drillCost(), () => buyDrill());
  if(caravanShopAvailable()){
    const sellFragment = document.createDocumentFragment();
    const sellDivider = document.createElement('div'); sellDivider.className = 'shop-section-divider'; sellDivider.style.gridColumn = '1/-1';
    sellDivider.textContent = '🐪 Caravan Rare Shop — sell him wood (💰' + WOOD_SELL_GOLD + ' each) and stone (💰' + STONE_SELL_GOLD + ' each) while he is on the road';
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
    addCard(offer.def.icon, offer.def.name + (sold ? ' (sold)' : ''), (ITEM_RARITIES[offer.def.rarity] ? ITEM_RARITIES[offer.def.rarity].label + ' · ' : '') + itemStatSummary(offer.def), offer.cost, towerSelected && !sold && !full && gold >= offer.cost, () => buyMerchantItem(index), sold);
  });
  for(const el of grid.querySelectorAll('.name, .stat-line, .cost, .shop-divider-title, .shop-divider-note')) shrinkTextToOneLine(el, SHOP_TEXT_MIN_PX);
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
/* =========================================================
   INVENTORY SLOT DRAG AND GESTURES
   ========================================================= */
let pendingSlotPress = null;
const SLOT_DRAG_THRESHOLD_PX = 8;
function beginSlotItemDrag(sourceTower, idx, e, expectedItem){
  if(!sourceTower.active || !['PLAYING','PAUSED'].includes(gameState)) return;
  const item = sourceTower.equippedItems[idx];
  if(!item || item!==expectedItem) return;
  const draggedDef = heldCount(item) > 1 ? makeItemInstance(Object.getPrototypeOf(item), 'split from a stack') : item;
  if(draggedDef === item){
    sourceTower.equippedItems.splice(idx, 1);
    itemLogReleased(item, 'on the ground (dragged out of ' + itemHolderLabel(sourceTower) + ')');
  } else item.count = heldCount(item) - 1;
  refreshQuickUse(sourceTower);
  sourceTower.recomputeStats();
  updateInspectPanel();
  const groundItem = spawnGroundItem(sourceTower.x, sourceTower.y, draggedDef);
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
      if(!isVaultType(selectedTower.type)) openShopModal();
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
// KEYBOARD-FOCUS-01: game shortcuts stay quiet while a dialog is open or the player is typing or focused on a control.
function keyboardFocusIsElsewhere(){
  const focused = document.activeElement;
  return !!(document.querySelector('dialog[open]') || focused?.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(focused?.tagName) || focused?.closest?.('[role="button"]'));
}
document.addEventListener('keydown', (e) => {
  if(e.key==='Escape') placingCampfire=false;
  if(gameState !== 'PLAYING' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(keyboardFocusIsElsewhere()) return;
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
/* =========================================================
   SETTINGS PANEL, RESET AND README
   ========================================================= */
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
  document.getElementById('settingsMedalToggle').checked = medalNotificationsEnabled;
  document.getElementById('settingsAutoWaveToggle').checked = autoStartWavesEnabled;
  document.getElementById('runSeedNote').textContent = 'This run: ' + runSeedCode;
  renderMedalList();
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
document.getElementById('inspDpsBetween').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || isStructureType(selectedTower.type)) return;
  showDpsBreakdownModal(selectedTower);
  playSound('ui_open');
});
function openSettingsModal(e){
  e.stopPropagation();
  unlockAudio();
  syncSettingsUI();
  closeBuildMenuIfOpen();
  document.getElementById('settings-modal').classList.remove('hidden');
  playSound('ui_open');
}
document.getElementById('settingsBtn').addEventListener('pointerdown', openSettingsModal);
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
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // a tab chosen at the edge of the scrolling row comes fully into view
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
// CONSENT-OK-01: the Santa notice has one button, OK; Stealth mode (no analytics, and the Stealth Santa challenge) is a Settings choice.
function refreshAnalyticsConsentLabel(){
  const label = document.getElementById('analyticsConsentState'), toggle = document.getElementById('settingsStealthToggle');
  const stealth = window.analyticsConsentChoice === 'denied';
  if(toggle) toggle.checked = stealth;
  if(label) label.textContent = stealth ? 'Stealth mode: analytics stay off, and Wave 10 of a run brings the Stealth Santa.' : 'Analytics are on.';
}
window.refreshAnalyticsConsentLabel = refreshAnalyticsConsentLabel;
refreshAnalyticsConsentLabel();
document.getElementById('settingsStealthToggle').addEventListener('change', (e) => {
  if(e.target.checked) window.declineStickTDAnalyticsConsent();
  else window.grantStickTDAnalyticsConsent();
  playSound('click');
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
document.getElementById('endCopySeedBtn').addEventListener('click', (e) => copyRunSeed(e.currentTarget));
document.getElementById('endRateBtn').addEventListener('click', () => { const page = PLATFORM_RATING_PAGES[window.STICKTD_PLATFORM]; if(page) window.open(page, '_blank', 'noopener'); });
document.getElementById('settingsAutoWaveToggle').addEventListener('change', (e) => {
  autoStartWavesEnabled = e.target.checked;
  savePrefs();
});
document.getElementById('settingsMedalToggle').addEventListener('change', (e) => {
  medalNotificationsEnabled = e.target.checked;
  savePrefs();
});
document.getElementById('settingsRunSeed').addEventListener('change', (e) => {
  const typed = e.target.value.trim().toUpperCase().slice(0, 24);
  e.target.value = typed;
  try{ if(typed) localStorage.setItem(RUN_SEED_KEY, typed); else localStorage.removeItem(RUN_SEED_KEY); }catch(err){ /* storage unavailable: the code cannot be kept */ }
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
document.getElementById('startSettingsBtn').addEventListener('pointerdown', openSettingsModal);
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
// RESET-OPTIONS-01
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
const AI_ASSIST_NOTE = 'Coding assisted by Claude (Anthropic). Design is human.'; // AI-DISCLOSURE-01: shown small in Settings > About and kept in both READMEs
function getReadmeText(){
  return 'STICK TOWER DEFENSE\n' +
'====================\n' +
'Version ' + GAME_VERSION + '\n\n' +
'By SauerNinja — github.com/SauerNinja\n' +
AI_ASSIST_NOTE + '\n\n' +
'A tower defense game about a squad of stickmen. Build the squad, train their stats, ' +
'equip loot and extend the path. Fight through 100 waves, then continue into endless play.\n\n' +
'HOW TO PLAY\n' +
'-----------\n' +
'Tap Build, pick a tower, then tap a grass tile to place it. Tap a placed tower to promote, ' +
'sell, move, buy it gear from the Shop, or change its targeting priority. The map starts tiny ' +
'(2x2 tiles) and extends both ends of its winding path — some expansions are free milestones, ' +
'others you buy with gold. You can buy one expansion per wave, during or between waves. The wave-end free expansion is lost if escaped enemies are still alive.\n\n' +
'TOWERS\n' +
'------\n' +
'Swordsman - melee cone sweep: the hardest hitter, with the shortest reach and medium accuracy.\n' +
'Archer - the most accurate and the lightest hitter, at medium range; deep arrows cause bleeding.\n' +
'Axeman - dual-wields hand axes, manually toggles between a close swing and a ranged throw.\n' +
'Spearman - long melee reach, slow but hard-hitting.\n' +
'Lancer - a knight lance whose damage scales with enemy weight, up to 1.75x on the heaviest foes.\n' +
'Cleric - supports allies and directly smites undead for 5x damage, ignoring armor.\n' +
'Hammerman - stuns on hit, carries a shield and extra HP.\n' +
'Mage - the longest reach and medium damage, but misses most often; its blasts slow survivors.\n' +
'Bomber - splash damage against groups.\n' +
'Gatling - very fast, low damage per shot, shreds swarms.\n' +
'More classes unlock as stickmen train, and many also unlock once enough waves are cleared: Marksman, Sniper, Blowdart, Cowboy, Glaive, Ninja, Paladin, Berserker, Necromancer, Pope, Cat Snapper, Merchant and more, plus Log Mill and Stone Quarry for wood and stone.\n' +
'Barricade - does not attack. Extremely tough, can be placed directly on the enemy path, and ' +
'holds back enemies while they chip its 10 HP, at most one point per ' + Math.round(BARRICADE_HIT_INTERVAL_MS/1000) + ' seconds across all attackers.\n\n' +
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
'Expedition. Any enemy has a small chance to break off the path and fight a nearby stickman.\n\n' +
'TRAINING XP\n' +
'-----------\n' +
'The killing blow earns full XP (' + Object.values(SIZE_TIER_BANDS).map(band => band.label + ' ' + band.xp).join(', ') + '); every ' + TRAINING_BAR_XP + ' XP rolls ' +
TRAINING_BAR_ROLLS + ' x (' + TRAINING_ROLL_MIN + '-' + TRAINING_ROLL_MAX + ') stat points, capped at ' + STAT_EFFECT_CAP + ' per stat and ' + STAT_TOTAL_CAP + ' total per stickman. At ' + NAMING_THRESHOLD + ' total you can name ' +
'the unit; at ' + MASTERY_THRESHOLD + ' it is fully trained, earns a trophy, and its XP share becomes gold (' + MASTERY_XP_PER_GOLD + ' XP = 1 gold). ' +
'Promote grants automatic stat rolls, a large pool of spendable points and a random talent roll into one stat, and costs far less than another copy of the same class. The resulting stats improve combat; promotion adds no separate damage bonus. STR also increases stickman weight and rendered size; enemy weight follows body size (15px radius = 1.0).\n\n' +
'ELEMENTS\n' +
'--------\n' +
'At ' + ELEMENT_INFUSE_THRESHOLD + ' in a stat a stickman attunes: STR=Fire (burn), DEX=Electric (chain lightning), INT=Ice (freeze). ' +
'Training TWO stats to ' + MIXED_PAIR_THRESHOLD + ' mixes an advanced element that applies both effects at once: Fire+Electric=Proton, ' +
'Fire+Ice=Dark Matter, Electric+Ice=Quasar. Proton, Quasar and Dark Matter are ' +
'elements, not towers. Every attack carries your element — projectiles and melee swings take its ' +
'colour, and the proc chance rises with the attuned stat, from ' + Math.round(ATTUNEMENT_PROC_MIN*100) + '% up to ' + Math.round(ATTUNEMENT_PROC_MAX*100) + '% at ' + STAT_EFFECT_CAP + '.\n\n' +
'An Archer that trains ' + CRAZY_CHEF_STR_THRESHOLD + ' STR unlocks the Crazy Chef: a knife-thrower whose damage scales with Strength, ' +
'hurling five kitchen knives then restocking for ten seconds.\n\n' +
'Tap the DPS number on a selected unit to see exactly how its damage is calculated. Tap a stat to spend one, hold to keep spending. Towers that only helped split a small ' +
'assist share. Enemies that crossed the finish only pay a reduced cleanup share. FARM targeting chases ' +
'last hits, LAST picks the enemy furthest from the finish, ASSIST leaves last hits to others, UNCLAIMED avoids enemies already doomed by shots in flight.\n\n' +
'ITEMS AND HEROES\n' +
'----------------\n' +
'Stickmen start with empty packs. Gear drops from enemies and is sold in the Shop, alongside ' +
'passive bonuses that apply to every tower you own. A tower with all ' + MAX_ITEM_SLOTS + ' inventory slots filled with equipment ' +
'awakens into a Hero, with a permanent stat bonus and a visible crown.\n\n' +
'RESOURCES\n' +
'---------\n' +
'Gold from kills and wave clears. Wood and stone from clearing scattered trees and rocks (and rare ' +
'treasure chests/relics), plus the Log Mill and Stone Quarry — spent on barricades, structures and the priciest shop gear alongside gold.\n\n' +
'SETTINGS\n' +
'--------\n' +
'Video (graphics quality and automatic render resolution), Audio (volume and mute), Game (blood-and-gore toggle, save/load), Items (the item guide), Medals, Stats, About (this file) and Changes (release notes).\n\n' +
'LICENSE\n' +
'-------\n' +
'MIT.\n';
}
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
   INSPECT PANEL, PAUSE, SPEED AND ZOOM CONTROLS
   ========================================================= */
document.getElementById('inspCraftBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(selectedTower && craftItemOn(selectedTower)) updateInspectPanel();
});
document.getElementById('inspAxeModeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower || selectedTower.type !== 'AXEMAN') return;
  if(selectedTower.toggleAxeMode()){ playSound('click'); updateInspectPanel(); }
});

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
function refreshQuickUse(tower){ // QUICK-USE-EVENTS-01
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
      box.dataset.count = item.isDiggingTool ? String(shovelChargesLeft(tower)) : heldCount(item) > 1 ? '×' + heldCount(item) : '';
      box.title = item.name + (item.isDiggingTool ? ' (' + shovelChargesLeft(tower) + ' of ' + SHOVEL_CHARGES_PER_ROUND + ' digs left this round)' : '') + ' — click to use (key ' + (slotIndex + 1) + '); drag to another stickman or onto the map';
      box.classList.add('filled', 'usable');
      applyItemGlowClass(box, item);
      box.classList.remove('hidden');
    });
  }
  for(let i = shown; i < quickSlotElements.length; i++){ quickSlotElements[i].classList.add('hidden'); quickSlotElements[i].textContent = ''; quickSlotElements[i].dataset.count = ''; }
  inspQuickSlots.classList.toggle('hidden', shown === 0);
  positionQuickSlots();
}
let hpBarShowPercent = false; // toggled by clicking the HP bar — see the click handler near the other inspect-panel button wiring
// ATTACK-STATE-01: the portrait ring shows why a fighter is or is not hitting, in colour and tooltip only so the nameplate never changes size:
// green = attacking, amber = preparing the next attack, blue = a target exists but is outside its range, grey = nothing to target.
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
function updateInspectPanel(){ // HUD-DOM-PHASE-01: inspect-panel DOM time is counted in the debug log's render phases
  const inspectDomStart = performance.now();
  try { updateInspectPanelNow(); } finally { renderPhaseTime.inspectDom += performance.now() - inspectDomStart; }
}
function updateInspectPanelNow(){
  if(selectedTower && selectedTower.type === 'HACKER'){ inspectPanel.classList.add('hidden'); openHackMenu(selectedTower); return; }
  closeHackMenu();
  if(!selectedTower){ inspectPanel.classList.add('hidden'); return; }
  inspectPanel.classList.remove('hidden');
  inspFullOptions.classList.toggle('hidden', !inspPanelExpanded);
  inspExpandChevron.style.transform = inspPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  inspExpandChevron.classList.toggle('has-points', selectedTower.statPoints > 0);
  const t = selectedTower;
  const isBarricade = t.type === 'BARRICADE';
  const isProducer = isProducerType(t.type), isStructure = isBarricade || isProducer, isVault = isVaultType(t.type);
  inspEvoBarTrack.classList.toggle('hidden', isStructure);
  inspCombatRow.classList.toggle('hidden', isStructure);
  inspStatsRow.classList.toggle('hidden', isStructure);
  inspItemsRow.classList.toggle('hidden', isStructure && !isVault);
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
  inspLevel.textContent = isBarricade ? '' : isVault ? ('Level ' + t.level + '/' + PRODUCER_MAX_LEVEL + ' · ' + itemCapacityOf(t) + ' slots') : isProducer ? ('Level ' + t.level + '/' + PRODUCER_MAX_LEVEL + ' · ' + PRODUCER_DEFS[t.type].icon + '+' + PRODUCER_DEFS[t.type].yields[t.level - 1] + ' every 60s') : (promotionRankLabel(t.level) + specLabel + heroLabel);
  inspPortraitFace.textContent = t.def.icon || '🙂';
  const hpPct = t.maxHp > 0 ? Math.max(0, Math.min(100, (t.hp/t.maxHp)*100)) : 0;
  inspHpBarFill.style.width = hpPct + '%';
  const disabledSuffix = (!isBarricade && t.disabledWavesLeft > 0) ? (' (DOWNED · ' + countLabel(t.disabledWavesLeft, 'round') + ')') : '';
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
    if(isVault){ renderInventorySlots(t); document.getElementById('inspCraftBtn').classList.add('hidden'); }
    return;
  }
  if(isBarricade){
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
  inspEvoBarTrack.classList.remove('hidden'); // every fighter has a training level
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
      const stats = TRAINED_STATS;
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
          ? ATTUNEMENT_ICON[leadingElement] + ' ' + countLabel(ELEMENT_INFUSE_THRESHOLD - bestValue, 'point') + ' until ' + leadingElement.charAt(0) + leadingElement.slice(1).toLowerCase() + ' Attunement'
          : '🎓 Spend points to start training — ' + (leadingPreferredStat ? leadingPreferredStat.toUpperCase() + ' is preferred' : 'any stat');
      }
      evoHint.classList.remove('hidden');
    } else {
      const attunedStat = ATTUNEMENT_STAT_BY_ELEMENT[t.attunement];
      const target = SPECIALIZATIONS[t.type] && SPECIALIZATIONS[t.type][t.attunement];
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
        const elementLabel = t.attunement.charAt(0) + t.attunement.slice(1).toLowerCase();
        evoHint.textContent = ATTUNEMENT_ICON[t.attunement] + ' ' + elementLabel + ' Attuned';
      }
      const milestoneNote = progressionMilestoneNote(t);
      if(milestoneNote) evoHint.textContent += '  ·  ' + milestoneNote;
      evoHint.classList.remove('hidden');
    }
  } else {
    const evo = CLASS_STAT_UNLOCKS[t.type];
    const branchStats = evo ? Object.keys(evo) : [];
    const maxVal = branchStats.length ? Math.max(...branchStats.map(k => t[k] || 0)) : 0;
    const leaders = branchStats.filter(k => (t[k] || 0) === maxVal);
    if(maxVal > 0 && leaders.length === 1){
      const statKey = leaders[0];
      const remaining = Math.max(0, evo[statKey].threshold - (t[statKey] || 0));
      const targetDef = CONFIG.TOWERS[evo[statKey].target];
      evoHint.textContent = remaining > 0
        ? (targetDef.icon + ' ' + targetDef.name + ' unlock — ' + remaining + ' more ' + statKey.toUpperCase())
        : (targetDef.icon + ' ' + targetDef.name + ' unlock — ready!');
      evoHint.classList.remove('hidden');
    } else {
      evoHint.classList.add('hidden');
    }
  }
  const isMeleeMode = t.type === 'AXEMAN' ? t.axeMode === 'MELEE' : !!t.baseMeleeDamage;
  const atk = isMeleeMode ? (t.meleeDamage || t.damage) : t.damage;
  const rng = isMeleeMode ? (t.meleeRange || t.range) : t.range;
  const cd = isMeleeMode ? (t.meleeCooldown || t.cooldown) : t.cooldown;
  inspAtkVal.textContent = '';
  const dmgHalf = damageSpreadHalfWidth(t);
  const dmgMinEl = inspAtkRange;
  const damageDisplayMultiplier = t.type === 'CLERIC' ? CLERIC_SMITE_MULT : 1;
  const displayedAtk = atk * damageDisplayMultiplier;
  const dmgRangeText = Math.round(displayedAtk*(1-dmgHalf)) + '-' + Math.round(displayedAtk*(1+dmgHalf));
  if(dmgMinEl) dmgMinEl.textContent = dmgRangeText;
  if(inspDpsRangeVal) inspDpsRangeVal.textContent = dmgRangeText; // the same computed range, shown again under DPS
  inspHpStatVal.textContent = Math.round((t.hpStat||0)*1000)/1000;
  inspDefVal.textContent = Math.round((t.shieldPct||0)*100);
  inspRangeVal.textContent = rng;
  inspSpeedVal.textContent = cd ? (cd/1000).toFixed(2) : '0';
  inspCritVal.textContent = Math.round((t.critChance||0)*1000)/10 + '% 🗡️' + (Math.round((t.critMult||1.2)*100)/100);
  const dpsShotsPerCycle = (t.burstCount && t.burstCount > 1) ? t.burstCount : 1;
  const dpsCycleMs = dpsShotsPerCycle > 1 ? (dpsShotsPerCycle-1)*(t.burstDelay||0) + cd : cd;
  const critExpectedMult = 1 + (t.critChance||0) * ((t.critMult||1.2) - 1);
  const dpsDamageMultiplier = damageDisplayMultiplier;
  const dpsAccuracy = 1 - (t.missChance||0);
  const dps = dpsCycleMs > 0 ? (dpsShotsPerCycle * atk * dpsDamageMultiplier * critExpectedMult * dpsAccuracy) / (dpsCycleMs/1000) : 0;
  inspDpsVal.textContent = dps >= 100 ? Math.round(dps) : dps.toFixed(1);
  fitStatRowToOneLine();
  fitNameplateToStatRow();
  const arch = CLASS_ARCHETYPE[t.type];
  const damageStat = arch==='WARRIOR' || t.type==='CRAZY_CHEF' ? 'str' : arch==='ARCHER' ? 'dex' : arch==='MAGE' ? 'int' : null; // matches primaryDamageMult in Tower.recomputeStats
  const damageNote = stat => damageStat === stat ? '; also increases this class’s direct damage.' : '.';
  inspStrBtn.title = 'Strength: grows health, weight and body size' + damageNote('str');
  inspIntBtn.title = 'Intelligence: grows reach toward this class’s range cap and increases critical damage' + damageNote('int');
  inspDexBtn.title = 'Dexterity: improves attack speed, accuracy and critical chance' + damageNote('dex');
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
  renderInventorySlots(t);
  updateQuickSlots(t, isBarricade);
  updateBuffPips(t);
  const craftRecipe = findCraftableRecipeFor(t.equippedItems);
  const inspCraftBtn = document.getElementById('inspCraftBtn');
  if(craftRecipe){
    const resultDef = lookupItemDef(craftRecipe.result);
    inspCraftBtn.classList.remove('hidden');
    inspCraftBtn.textContent='Combine '+resultDef.icon;
    inspCraftBtn.title = 'Combine into ' + resultDef.icon + ' ' + resultDef.name + '\n'+itemStatSummary(resultDef)+'\nConsumes: '+craftRecipe.ingredients.map(id=>lookupItemDef(id)?.name||id).join(', ');
  } else {
    inspCraftBtn.classList.add('hidden');
  }
  inspStatPointsVal.textContent = t.statPoints;
  inspAutoSpend.checked = !!t.autoSpend;
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
    if(!btn.disabled){ const preview = statPointPreview(t, stat); if(preview) btn.title += '\nNext point: ' + preview; } // STAT-PREVIEW-01: appended to the stat tooltips set above
  }
}
// VAULT-01: one renderer for a stickman's six slots and a vault's 18 to 30; slots past the holder's capacity stay hidden.
function renderInventorySlots(t){
  const capacity = itemCapacityOf(t), vault = isVaultType(t.type);
  document.getElementById('inspItemsLabel').textContent = vault ? 'VAULT · ' + t.equippedItems.length + '/' + capacity : 'INVENTORY';
  document.querySelectorAll('.item-slot').forEach((slot, i) => {
    slot.hidden = i >= capacity;
    const item = t.equippedItems[i];
    slot.dataset.key = vault ? '' : String(i + 1);
    if(item){
      slot.textContent = item.icon;
      slot.dataset.count = heldCount(item) > 1 ? '×' + heldCount(item) : '';
      slot.title = vault ? item.name + ' — drag out to take it' : isConsumableDef(item)
        ? item.name + (item.isDiggingTool ? ' (reusable)' : '') + ' — click or press ' + (i + 1) + ' to use; drag to another stickman or onto the map'
        : item.name + (itemStatSummary(item) ? ' — ' + itemStatSummary(item) : '');
      slot.classList.add('filled');
      slot.classList.toggle('usable', !vault && isConsumableDef(item));
      applyItemGlowClass(slot, item);
    } else {
      slot.textContent = '';
      slot.dataset.count = '';
      slot.title = 'Empty slot';
      slot.classList.remove('filled');
      slot.classList.remove('usable');
      applyItemGlowClass(slot, null);
    }
  });
}
inspUpgradeBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  if(selectedTower.upgrade()){
    updateHUD(); updateInspectPanel();
    playSound('ui_buy');
  }
});
inspSellBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if(!selectedTower) return;
  logGameEvent('sold ' + itemHolderLabel(selectedTower) + ' for ' + selectedTower.sellValue() + ' gold');
  trackGameEvent('tower_sold', { tower_type: selectedTower.type, level: selectedTower.level, refund: selectedTower.sellValue() });
  gold += selectedTower.sellValue();
  if(isVaultType(selectedTower.type)) for(const storedItem of selectedTower.equippedItems) for(let copy = 0; copy < heldCount(storedItem); copy++) spawnGroundItem(selectedTower.x, selectedTower.y, Object.getPrototypeOf(storedItem), 'vault sold');
  else for(const lostItem of selectedTower.equippedItems) itemLogReleased(lostItem, 'lost: ' + itemHolderLabel(selectedTower) + ' was sold');
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
  spawnGroundItem(x, y, BARRICADE_ITEM, 'barricade picked up');
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
const STAT_HOLD_DELAY_MS = 380, STAT_HOLD_REPEAT_MS = 65;
let statHoldTimer = 0;
// STAT-PREVIEW-01: each stat button's tooltip says what the next point would change (Game Balance: let players see a choice's effect before
// committing). The preview adds the point, recomputes, reads the results and restores the stickman exactly, including health and the Veteran flag.
function statPointPreview(tower, stat){
  if(!tower || isStructureType(tower.type) || tower[stat] >= STAT_EFFECT_CAP || getTrainedStatTotal(tower) >= STAT_TOTAL_CAP) return '';
  const before = { damage: tower.damage, range: tower.range, cooldown: tower.cooldown, maxHp: tower.maxHp, miss: tower.missChance, crit: tower.critChance };
  const savedHp = tower.hp, savedVeteran = tower.isVeteran;
  statPreviewRunning = true;
  try { tower[stat]++; tower.recomputeStats(); }
  finally {
    const after = { damage: tower.damage, range: tower.range, cooldown: tower.cooldown, maxHp: tower.maxHp, miss: tower.missChance, crit: tower.critChance };
    tower[stat]--; tower.recomputeStats(); tower.hp = savedHp; tower.isVeteran = savedVeteran; statPreviewRunning = false;
    const parts = [];
    if(after.damage !== before.damage) parts.push('damage ' + before.damage + ' → ' + after.damage);
    if(Math.round(after.range) !== Math.round(before.range)) parts.push('range ' + Math.round(before.range) + ' → ' + Math.round(after.range));
    if(after.cooldown !== before.cooldown) parts.push('attack every ' + (before.cooldown/1000).toFixed(2) + 's → ' + (after.cooldown/1000).toFixed(2) + 's');
    if(after.maxHp !== before.maxHp) parts.push('health ' + before.maxHp + ' → ' + after.maxHp);
    if(Math.abs(after.miss - before.miss) >= 0.0005) parts.push('miss ' + (before.miss*100).toFixed(1) + '% → ' + (after.miss*100).toFixed(1) + '%');
    if(Math.abs((after.crit || 0) - (before.crit || 0)) >= 0.0005) parts.push('critical ' + ((before.crit||0)*100).toFixed(1) + '% → ' + ((after.crit||0)*100).toFixed(1) + '%');
    return parts.length ? parts.join(', ') : 'no visible change yet';
  }
}
function spendStatPoint(stat){
  if(!selectedTower || !selectedTower.allocateStat(stat)) return false;
  playSound('stat_spend');
  refreshProgressionMilestones(selectedTower);
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
TRAINED_STATS.forEach(stat => {
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
  markFirstNextWaveUsed();
  startNextWave();
});
const pauseBtn = document.getElementById('pauseBtn');
function pauseGame(){
  recordStateTransition('PAUSED'); gameState = 'PAUSED';
  audioEngine.setMusicPaused(true);
  pauseStartedAtReal = Date.now(); // debug-log use only, see totalPausedMs
  pauseBtn.textContent = '▶';
  pauseBtn.classList.add('active');
  document.getElementById('pause-overlay').classList.remove('hidden');
}
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
    pauseGame();
    playSound('pause_cue');
    render(ctx);
  } else if(gameState === 'PAUSED'){
    resumeGame();
    playSound('resume_cue');
  }
});
document.addEventListener('keydown', (e) => {
  if(e.code !== 'Space' || e.repeat) return;
  if(keyboardFocusIsElsewhere()) return;
  if(gameState === 'PLAYING'){
    e.preventDefault();
    unlockAudio();
    pauseGame();
    playSound('pause_cue');
    render(ctx);
  }
});
document.addEventListener('keydown', (e) => {
  if(gameState !== 'PAUSED' || e.defaultPrevented || e.repeat) return;
  if(keyboardFocusIsElsewhere()) return;
  resumeGame();
});
document.addEventListener('visibilitychange', () => {
  if(document.hidden){
    stopStatHold();
    tabHiddenCount++;
    tabLastHiddenAt = Date.now();
  } else if(tabLastHiddenAt){
    tabTotalHiddenMs += Date.now() - tabLastHiddenAt;
    tabLastShownAt = Date.now();
  }
  if(document.hidden && gameState === 'PLAYING') pauseGame();
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
  if(gameSpeed === 1) playSound('record_scratch'); else playSound('speed_up', undefined, SPEED_LEVELS.indexOf(gameSpeed));
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
