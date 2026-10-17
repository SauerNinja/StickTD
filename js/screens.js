"use strict";
// Start and end screens and the first-play cues. Loaded after js/diagnostics.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   START / END SCREENS
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
  document.getElementById('endRunSummary').textContent = describeRunEnd();
  document.getElementById('endRateBtn').classList.toggle('hidden', !PLATFORM_RATING_PAGES[window.STICKTD_PLATFORM]);
  endScreen.classList.remove('hidden');
  trackGameEvent('game_over', {
    cause: cause || 'lives', wave_reached: waveIndex, waves_completed: wavesCompleted,
    duration_s: Math.round(telemetryActiveMs()/1000),
    towers_built: sessionTelemetry.towersBuilt, towers_downed: sessionTelemetry.towersDowned, lives_bought: livesBought, loose_end: countLooseEnemies(), fps_median: perfMedianFps(),
    kills: sessionKills, best_streak: bestKillStreak, seed: runSeedCode, personal_best: runEndedAsBest, act: actNumberForWave(Math.max(waveIndex, wavesCompleted))
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
