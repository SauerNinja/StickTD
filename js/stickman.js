"use strict";
// Stickman figure, weapon and pose drawing. Loaded after js/effects.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   STICKMAN RENDERING
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
  const stampKey=entity.bloodStainRevision+':'+emoji+':'+(entity.tallStretch || 1)+':'+(entity.widthStretch || 1)+':'+entity.flip+':'+size+':'+(entity.bloodStains.some(stain=>stain.cleanupStarted) ? Math.floor(presentationTime/500) : 0)+':'+graphicsQuality+':'+underHeavyVisualLoad; // BLOOD-STAMP-CACHE-01: marks only change over time during the round-end fade, so a held stamp is never re-rasterized
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
      if(!surfacePixels){ // BLOOD-STAMP-CACHE-01: the opaque-pixel map of a sprite is read back from the canvas once per sprite shape, never once per new mark
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
// GUN-FACING-01 (1.8.40): the 🔫 glyph is drawn muzzle-left, so rotating it by the aim angle held the gun backwards. It is mirrored so the muzzle leads along the aim, and kept upright when aiming left.
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
    // SPEARHEAD-01 (1.8.40): the shaft stops where the blade starts, and the leaf-shaped head is what reaches the tip of the weapon.
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
      drawGunEmoji(ctx, hand.handX, hand.handY, gunAngle);
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
    drawGunEmoji(ctx, mainHand.handX, mainHand.handY, gunAngle);
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
