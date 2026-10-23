"use strict";
// Debug log, README export, the design contract and the self-tests. Loaded after js/ui.js.
// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   DEBUG LOG
//   DESIGN CONTRACT (load-time self-check, run by the boot sequence at the end of js/waves.js)
/* =========================================================
   DEBUG LOG
   ========================================================= */
function generateDebugLog(){
  const now = new Date();
  const nowReal = Date.now();
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
  s += '\nSIMULATION CATCH-UP AND TIME LOSS\n';
  s += '---------------------------------\n';
  s += 'Frame-time clamp: ' + perfStats.wallTimeClampHits + ' frame(s), ' + perfStats.wallTimeClampedMs.toFixed(2) +
    'ms of wall time excluded (100ms at 1x; 150ms during fast-forward; last ceiling ' + perfStats.lastFrameTimeClampMs + 'ms).\n';
  s += 'Catch-up by reason: tick cap ' + (perfStats.simulationCatchUpCapHits - perfStats.cameraBudgetCapHits) + ' frame(s), camera 6ms budget ' + perfStats.cameraBudgetCapHits + ' frame(s) dropping ' + perfStats.cameraBudgetDroppedMs.toFixed(2) + 'ms\n';
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
    s += 'These tasks ran on the main thread; timestamps are start times and attribution depends on browser support. Compare them with the callback-gap snapshots above: a long task at the same moment means something on the page blocked drawing; none means the browser or graphics card delayed the frame.\n';
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
// GAMEOVER-LOG-01: the Settings button and the end screen's button save the same debug log file.
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
function readmeObjectUrl(){ return URL.createObjectURL(new Blob([getReadmeText()], { type: 'text/plain' })); }
document.getElementById('downloadReadmeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const url = readmeObjectUrl(), a = document.createElement('a');
  a.href = url; a.download = 'README.txt'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('viewReadmeBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  window.open(readmeObjectUrl(), '_blank');
});
document.getElementById('expandAboutBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const content = document.getElementById('about-expand-content');
  const willShow = content.classList.contains('hidden');
  if(willShow){
    content.innerHTML = '<p>Train and unlock stickman classes with distinct bodies, weapons and combat roles. ' +
      'The map starts small and extends both ends of its winding path: you can buy one expansion per wave, and a wave cleared ' +
      'with no escaped enemies left alive grants a free one. Enemies occasionally break off the path to attack a stickman directly; ' +
      'Barricades placed on the path hold the line, and enemies queue single-file behind them. Gear drops from enemies ' +
      'and is sold by a Merchant; a stickman with every slot filled with equipment awakens as a Hero.</p>';
    e.target.textContent = 'Less info ▴';
  } else {
    e.target.textContent = 'More info ▾';
  }
  content.classList.toggle('hidden');
});
/* =========================================================
   DESIGN CONTRACT (load-time self-check, run by the boot sequence at the end of js/waves.js)
   ========================================================= */
// SOURCE-SCAN-01: the game is a set of script files, so rule-ID markers are looked up in the fetched source text.
let gameSourceText = null;
function sourceMentions(...markers){ return gameSourceText === null || markers.every(marker => gameSourceText.includes(marker)); }
function loadGameSourceText(){
  if(!/^https?:$/.test(location.protocol)) return Promise.resolve();
  const inlineText = [...document.scripts].filter(script => !script.src).map(script => script.textContent);
  return Promise.all([...document.scripts].filter(script => script.src).map(script => fetch(script.src).then(response => response.ok ? response.text() : Promise.reject(new Error(script.src)))))
    .then(parts => { gameScriptSources = sourcesByScriptFile(parts); gameSourceText = inlineText.concat(parts).join('\n'); })
    .catch(() => { gameScriptSources = {}; gameSourceText = null; });
}
// FILE-CONTENTS-01: every js/ file opens with a Contents list naming its section banners in order, so a reader can find a topic without scrolling.
let gameScriptSources = {};
function sourcesByScriptFile(parts){
  const sources = {};
  [...document.scripts].filter(script => script.src).forEach((script, index) => {
    const fileMatch = (script.getAttribute('src') || '').match(/^js\/([a-z]+)\.js/);
    if(fileMatch) sources[fileMatch[1]] = parts[index];
  });
  return sources;
}
const SECTION_BANNER_PATTERN = /^\/\* =+\n {3}(.+)$/gm;
const CONTENTS_LINE_PATTERN = /^\/\/ {3}(.+)$/gm;
function contentsListMatchesBanners(sourceText){
  const contentsStart = sourceText.indexOf('// Contents (');
  if(contentsStart < 0) return false;
  const contentsBlock = sourceText.slice(contentsStart, sourceText.indexOf('\n/*', contentsStart));
  const listedTitles = [...contentsBlock.matchAll(CONTENTS_LINE_PATTERN)].map(match => match[1].trim());
  const bannerTitles = [...sourceText.matchAll(SECTION_BANNER_PATTERN)].map(match => match[1].trim()).filter(title => !title.startsWith('FILE MAP'));
  return listedTitles.join('|') === bannerTitles.join('|');
}
// VISUAL-DRIFT-01: the established look of the title, top bar and buttons; a change to any of these needs the table and AGENTS.md updated in the same release
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
  if(!String(update).includes('if(looseAtClear === 0) freeExpansionOwed++')) problems.push('escaped enemies at wave end forfeit the free expansion (CLEAN-WAVE-EXPAND-01)');
  if(!String(forensicBlockerAlongPath).includes('sceneryMap.get(') || !String(drawDepthSortedLayer).includes('drawBloodStains(ctx, it.item)')) problems.push('scenery catches and displays blood (BLOOD-SURFACES-01)');
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
  if(showLivesChange.length !== 1 || !document.getElementById('livesChangePop')) problems.push('lives changes must pop beside the health counter (LIVES-POP-01)');
  { const santaLine = document.getElementById('consentSantaLine');
    const santaFace = document.getElementById('consentSantaFace');
    const consentButton = document.getElementById('consentAccept');
    const consentBanner = document.getElementById('consent-banner');
    if(!santaFace || !santaLine || !santaLine.textContent.includes('naughty or nice') || !consentButton || consentButton.textContent.trim() !== '🍪 OK' || !consentBanner || consentBanner.querySelectorAll('button').length !== 1 || !document.getElementById('settingsStealthToggle') || !String(window.declineStickTDAnalyticsConsent).includes("'denied'")) problems.push('the Santa notice has one OK button and Stealth mode lives in Settings (CONSENT-OK-01)');
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
    if(document.getElementById('training-overlay') || !firstBuildHint || firstBuildHint.textContent.trim() !== '👆' || firstBuildHint.parentElement.id !== 'buildBtnWrap' || (gameState === 'START' && !String(firstBuildHint.className).includes('hidden'))) problems.push('first-time guidance is only a hidden-until-play hand beside Build, with no tower-choice or victory modal (FIRST-BUILD-CUE-01)');
    const firstNextWaveHint = document.getElementById('first-next-wave-hint');
    if(!firstSpeedHint || firstSpeedHint.textContent.trim() !== '👆' || firstSpeedHint.parentElement.id !== 'speedBtnWrap' || !firstNextWaveHint || firstNextWaveHint.textContent.trim() !== '👆' || firstNextWaveHint.parentElement.id !== 'nextWaveBtnWrap' || !String(startNextWave).includes('markFirstWaveStarted') || !String(markFirstNextWaveUsed).includes('syncFirstPlayCues') || !String(syncFirstPlayCues).includes('!sequenceStarted && !sequenceDismissed && firstFighterWasBuilt()') || !String(markFirstSpeedUpUsed).includes("classList.add('hidden')")) problems.push('first-use guidance must show Next Wave after the first fighter is built and before wave one, then Fast Forward after wave start, and stay dismissed after speed use (FIRST-PLAY-CUE-SEQUENCE-01)');
  }
  if(!window.trackEvent || !String(window.trackEvent).includes('sticktdAnalyticsReady') || !window.enableStickTDAnalytics || !String(window.enableStickTDAnalytics).includes('appendChild(script)') || !String(window.declineStickTDAnalyticsConsent).includes("'denied'") || !String(window.disableStickTDAnalytics).includes("'denied'") || !document.getElementById('settingsStealthToggle') || !window.grantStickTDAnalyticsConsent) problems.push('analytics stays fully gated before opt-in and players can switch to Stealth mode in Settings (ANALYTICS-CONSENT-01)');
  if(window.detectPlayPlatform('gamejolt.com','',false,'') !== 'gamejolt' || window.detectPlayPlatform('itch.io','',false,'') !== 'itch.io' || window.detectPlayPlatform('sauerninja.github.io','',false,'') !== 'github-pages' || window.detectPlayPlatform('example.org','',true,'') !== 'embedded') problems.push('analytics identifies its host platform, including an unknown embedded host (PLATFORM-DETECT-03)');
  if(ENEMY_WALK_SPEED_SCALE > 0.3 || ENEMY_SPAWN_GAP_MS < 4500) problems.push('enemies must walk very slowly and arrive well spaced: walk speed scale at most 0.3 and at least 4.5 seconds between spawns (ENEMY-PACE-01)');
  if(![...FOOD_ITEMS, ...TREAT_ITEMS, ...STIM_ITEMS, ...MEAL_ITEMS, ...HUT_LOOT_ITEMS, ...LOOT_TONIC_ITEMS, SHOVEL_ITEM].every(isConsumableDef)) problems.push('every consumable must be stored in a stickman\'s slots and used by a click or hotkey, never on the spot (CONSUMABLE-STORED-01)');
  if(!(TREE_ROCK_SIZE_FRAC_AT_MIDDLE + TREE_ROCK_SIZE_FRAC_SLOPE + TREE_ROCK_SIZE_FRAC_SPREAD/2 < END_RING_MIN_SIZE_FRAC && END_GUARD_MAX_SIZE_FRAC <= END_RING_MIN_SIZE_FRAC && TREE_ROCK_SIZE_FRAC_AT_MIDDLE < TREE_ROCK_SIZE_FRAC_AT_MIDDLE + TREE_ROCK_SIZE_FRAC_SLOPE && HARVESTED_TILE_KEEP_FACTOR < 0.5)) problems.push('scenery: the ring tiles at the road ends hold the biggest pieces, size shrinks toward the middle, and cleared tiles rarely regrow trees or rocks (SCENERY-GRADIENT-01)');
  if(!String(buildTowerModal).includes('Stickmen Defenders') || !String(buildTowerModal).includes("addBuildSection('Fortifications')") || String(buildTowerModal).includes('Starter defenders') || String(buildTowerModal).includes('Specialist defenders')) problems.push('all available fighter characters must share Stickmen Defenders, with fortifications and locked characters in their own sections (BUILD-MENU-GROUPS-02)');
  if(!(String(buildTowerModal).indexOf("addBuildSection('Stickmen Defenders')") >= 0 && String(buildTowerModal).indexOf("addBuildSection('Stickmen Defenders')") < String(buildTowerModal).indexOf("addBuildSection('Structures')"))) problems.push('Stickmen Defenders come first in Build, followed by Structures (BUILD-MENU-ORDER-02)');
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
  if(enemyHealthAtWeight('GRUNT',2,1)!==2*enemyHealthAtWeight('GRUNT',1,1) || enemyHealthAtWeight('GRUNT',0.6,1)<=1) problems.push('HP follows weight for every Grunt, Tiny included (WEIGHT-HP-181, WEIGHT-HP-182).');
  if(!String(drawBranchSprite).includes('BRANCH_GLYPH') || BRANCH_GLYPH !== '🪾' || typeof branchRandomFor !== 'function' || String(tryCollectAmbientLog).includes('log.count--')) problems.push('Branches are leafless-tree glyphs scattered at random sizes and angles, and collect once (BRANCH-EMOJI-01, BRANCH-PICKUP-03).');
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
  { const oversized = Object.entries(TELEMETRY_EVENTS).filter(([name, declared]) => name.length > 40 || declared.some(param => param.length > 40)).map(([name]) => name); // Google Analytics limits names to 40 characters; the 25-parameter limit is ANALYTICS-PARAM-BUDGET-01 below
    if(oversized.length) problems.push('analytics event or parameter names over the 40-character Google Analytics limit: ' + oversized.join(', ') + ' (ANALYTICS-PARAMS-01)');
  }
  if(ATTRACT_ENEMY_MOVE_SCALE !== 0.60) problems.push('attract movement must remain 40% slower without changing gameplay (ATTRACT-PACE-01)');
  if(Object.keys(CONFIG.TOWERS).some(type => !WEAPON_BLOOD_PROFILES[type]) || !Object.isFrozen(WEAPON_BLOOD_PROFILES) || Object.values(WEAPON_BLOOD_PROFILES).some(profile => !Object.isFrozen(profile))) problems.push('every class needs an immutable explicit weapon blood profile (WEAPON-FORENSICS-01)');
  if(window.detectPlayPlatform('sauerninja.github.io','https://itch.io/',false,'?utm_source=itch') !== 'github-pages' || window.detectPlayPlatform('cdn.example','https://sauerninja.itch.io/',true,'') !== 'itch.io') problems.push('host platform must not be overwritten by campaign or top-level referrer (ANALYTICS-ACCURACY-01)');
  if(!/^(web|android|(windows|macos|linux|desktop)-[a-z0-9_]+)$/.test(window.STICKTD_BUILD || '') || !String(window.trackEvent).includes('STICKTD_BUILD') || !String(trackGameEvent).includes('STICKTD_BUILD')) problems.push('analytics events and telemetry name the exact build: web, android or system-architecture (ANALYTICS-BUILD-01)');
  if(document.querySelector('meta[name="application-version"]').content !== GAME_VERSION || !String(window.enableStickTDAnalytics).includes('send_page_view:false') || !String(window.disableStickTDAnalytics).includes('ga-disable-')) problems.push('analytics version, single page view and revoke guard must stay aligned (ANALYTICS-ACCURACY-01)');
  { const reservedAnalyticsParams = ['source', 'medium', 'campaign', 'term', 'content', 'value', 'currency'];
    const offending = Object.entries(TELEMETRY_EVENTS).filter(([, declared]) => declared.some(param => reservedAnalyticsParams.includes(param))).map(([name]) => name);
    if(offending.length) problems.push('analytics events must not use parameter names Google Analytics reads as traffic source or revenue (source, medium, campaign, term, content, value, currency): ' + offending.join(', ') + ' (ANALYTICS-PARAMS-01)');
    const derivableLabels = ['telemetry_schema', 'play_label', 'event_group'];
    const sharedParams = [...new Set([...TELEMETRY_SHARED_PARAMS, 'referrer_site'])].filter(param => !derivableLabels.includes(param)); // ANALYTICS-PARAM-BUDGET-01: what is left after the derivable labels go
    const overBudget = Object.entries(TELEMETRY_EVENTS).filter(([, declared]) => new Set(sharedParams.concat(declared)).size > 24).map(([name]) => name);
    if(overBudget.length) problems.push('analytics events must fit Google Analytics\' 25-parameter limit even after the derivable labels are dropped: ' + overBudget.join(', ') + ' (ANALYTICS-PARAM-BUDGET-01)');
  }
  { const scratchEnemy = new Enemy(); scratchEnemy.bleedUntil = 0; scratchEnemy.bleedStackDamages = [];
    scratchEnemy.applyBleed(7, 1000, null); const oneArrow = scratchEnemy.bleedDamagePerTick;
    scratchEnemy.applyBleed(7, 1000, null); scratchEnemy.applyBleed(7, 1000, null); const threeArrows = scratchEnemy.bleedDamagePerTick;
    if(oneArrow <= 0 || threeArrows !== 3 * oneArrow) problems.push('bleed damage per tick must multiply with the number of stuck arrows: three arrows deal three times one (BLEED-MULTIPLIES-01)');
  }
  { const probeTime = performance.now();
    const stale = lastCameraInteractionAt; lastCameraInteractionAt = -1e9;
    const otherMotionActive = panInertia.active || !!waveStartCameraPan || !!(roundEnemyFollow && roundEnemyFollow.enemy) || !!(cameraFollow && cameraFollow.phase === 'panning') || (isDragging && activePointers.size > 0);
    const idleActive = !otherMotionActive && isCameraMotionActive(probeTime);
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
  if(nextWaveActionLabel(0).replace(/ \+💰\d+$/, '') !== 'Start Wave' || nextWaveActionLabel(1).replace(/ \+💰\d+$/, '') !== 'Next Wave') problems.push('the first wave action must say Start Wave without a wave number, then return to Next Wave (FIRST-WAVE-ACTION-01)');
  { const freeFighters = Object.entries(CONFIG.TOWERS).filter(([type, def]) => !['BARRICADE','PROTON','DARK_MATTER','QUASAR'].includes(type) && !(def.baseCost > 0)).map(([type]) => type); if(freeFighters.length) problems.push('every buildable fighter must have a gold price above zero (Barricade is paid in wood and stone; Proton, Dark Matter and Quasar are elements, not towers): ' + freeFighters.join(', ') + ' (NO-FREE-FIGHTERS-01)'); }
  if(!PRODUCER_TYPES.every(type => CONFIG.TOWERS[type] && CONFIG.TOWERS[type].baseCost > 0 && CONFIG.TOWERS[type].tiers[0].damage === 0 && isStructureType(type) && !isFighterTower({ type }) && !/\bupgrad|\bevol/i.test(CONFIG.TOWERS[type].blurb))) problems.push('structures cost gold, never attack and are never counted as fighters (STRUCTURE-PRODUCERS-01)');
  if(!String(unlockAudioOnGesture).includes('state === \'running\'') || typeof AUDIO_UNLOCK_EVENTS === 'undefined' || !AUDIO_UNLOCK_EVENTS.includes('touchend') || !AUDIO_UNLOCK_EVENTS.includes('pointerup')) problems.push('audio unlock retries on touchend, pointerup and click until the context runs, so the start-screen music starts on a phone tap (AUDIO-GESTURE-01)');
  if(String(runBootWarmup).includes('hidden = true') || !String(startFirstFrame).includes("classList.add('done')") || typeof audioEngine.prewarm !== 'function') problems.push('the loading screen fades out over the opaque game and the audio graph is built during loading (BOOT-FADE-01, AUDIO-PREWARM-01)');
  if(MUSIC_ATTRACT_TEMPO_BPM > 92 || !POP_VOICES.oboe || MUSIC_TOM_PITCHES[0] > 160) problems.push('the start screen stays slow and dark, answers the lead with an oboe line and the fills sound like timpani (MUSIC-REFERENCE-01)');
  if(typeof SoundEngine.prototype.musicBassDrop !== 'function' || !POP_VOICES.warm || MUSIC_ATTRACT_SECTION_LEVEL[0] > 0.4) problems.push('intro and idle music open softly, keep a warm motif and resolve sweeps into bounded pitched bass (MUSIC-BUILD-DROP-01)');
  if(typeof updateRoundEnemyFollow !== 'function' || !String(cancelCameraFollow).includes('roundEnemyFollow = null')) problems.push('manual camera control cancels the countdown pan and first-enemy follow (ROUND-CAMERA-01)');
  if(!MUSIC_ATTRACT_SECTION_LEVEL.every((level, index) => index === 0 || level > MUSIC_ATTRACT_SECTION_LEVEL[index - 1]) || typeof audioEngine.popTone !== 'function' || MUSIC_ATTRACT_VOICE_LIMIT <= MUSIC_VOICE_LIMIT) problems.push('the start-screen music builds from a quiet intro to a loud chorus and has its own larger voice budget (MUSIC-ATTRACT-02)');
  if(MUSIC_VOICE_LIMIT_LIGHT <= MUSIC_VOICE_LIMIT_MEDIUM || MUSIC_VOICE_LIMIT_MEDIUM <= MUSIC_VOICE_LIMIT || typeof SoundEngine.prototype.scheduleCombatLayers !== 'function' || !String(SoundEngine.prototype.reserveMusicVoice).includes('musicVoiceLimit')) problems.push('the in-game music voice budget follows frame load (24, 14, then 10) and the wave and boss themes carry pad, snare and riser layers (MUSIC-BUDGET-01, MUSIC-LAYERS-01)');
  if(itemSellValue({ cost: 100 }) !== 50 || itemSellValue({ id: 'ADRENALINE' }) !== 60 || !MEDICAL_ITEMS.some(item => item.isRevive) || typeof reviveSelectedStickman !== 'function' || merchantPotionDefs().length < 6) problems.push('selling returns half the price paid or the merchant price, and the merchant stocks every potion, medical item and a revive (MERCHANT-SELL-01, MERCHANT-POTIONS-01)');
  if(!String(loop).includes('repaintPending') || !String(setupCanvas).includes('resizeSnapshotCanvas') || typeof restoreCanvasLayers !== 'function') problems.push('a resize, a return from the background or a restored canvas asks for one immediate repaint that skips the frame limiter, and a resize keeps the old picture (RESIZE-KEEP-01, REPAINT-01, CONTEXT-RESTORE-01)');
  if(MOBILE_FRAME_CAP_FPS !== 30 || !String(loop).includes('IS_MOBILE_DEVICE') || !String(defaultFrameCapFps).includes('IS_MOBILE_DEVICE') || !String(startFirstFrame).includes('vsyncProbeActive')) problems.push('a phone is locked to a steady 30 FPS with no camera exception, and the screen refresh rate is measured during loading (MOBILE-LOCK-30-01, VSYNC-PROBE-01)');
  { const seenIcons = new Map(), shared = []; for(const [type, def] of Object.entries(CONFIG.TOWERS)){ if(seenIcons.has(def.icon)) shared.push(seenIcons.get(def.icon) + ' and ' + type + ' share ' + def.icon); else seenIcons.set(def.icon, type); } if(shared.length) problems.push('no two classes can share an emoji: ' + shared.join('; ') + ' (CLASS-EMOJI-01)'); }
  if(WOOD_SELL_GOLD !== 2 || STONE_SELL_GOLD !== 4 || CARAVAN_FIRST_ROUND_AFTER !== 2 || !String(merchantShopOpen).includes('caravanShopAvailable') || !String(sellToCaravan).includes('caravanShopAvailable')) problems.push('the caravan pays 2 gold per wood and 4 per stone, first comes after round 3 and trades only while on the road (CARAVAN-01)');
  if(!(forensicDropletSizeFactor(1) > forensicDropletSizeFactor(4) && forensicDropletSizeFactor(4) > forensicDropletSizeFactor(FORENSIC_HIGH_VELOCITY_MS) && forensicDropletSizeFactor(FORENSIC_HIGH_VELOCITY_MS) > forensicDropletSizeFactor(25)) || forensicDropletSizeFactor(25) > 0.45 || String(spawnForensicSpatter).includes('exitSpray') || !String(spawnForensicSpatter).includes('launchAtomizedMist')) problems.push('drop size falls as launch speed rises and anything above 7.65 m/s atomizes into mist; back-spatter leaves slower than forward spatter (FORENSIC-CLASS-01)');
  if(CAMPFIRE_BUILD_WOOD !== 50 || !String(buildTowerModal).includes('campfireRow') || String(buildTowerModal).includes("createElement('button');fireRow") || !String(placeCampfire).includes('wood-=CAMPFIRE_BUILD_WOOD')) problems.push('the campfire is a normal row in the Structures list costing gold, 50 wood and stone (CAMPFIRE-STRUCTURE-01)');
  if(typeof spawnCastOffTrail !== 'function' || !String(spawnSwordsmanBloodArc).includes('spawnCastOffTrail') || String(spawnCastOffArc).includes('circular')) problems.push('blade cast-off lands as a curved row along the swing tangent beyond the wound, never a ring around the victim (CASTOFF-TANGENT-01)');
  if(Math.abs(FORENSIC_TERMINAL_PX/FORENSIC_PX_PER_METER - 7.65) > 1e-9 || !String(forensicTerminalPxFor).includes('FORENSIC_TERMINAL_PX') || !String(landForensicDroplet).includes('Math.asin')) problems.push('gore explosion droplets obey quadratic drag, a 7.65 m/s terminal velocity and an impact-angle stain (GORE-EXPLOSION-01)');
  if(ELEMENT_INFUSE_THRESHOLD !== 250 || MIXED_PAIR_THRESHOLD !== 250 || !ELEMENT_COMPONENTS.PROTON || ELEMENT_COMPONENTS.PROTON.join() !== 'FIRE,ELECTRIC' || ELEMENT_COMPONENTS.DARK_MATTER.join() !== 'FIRE,ICE' || ELEMENT_COMPONENTS.QUASAR.join() !== 'ELECTRIC,ICE' || ['PROTON','DARK_MATTER','QUASAR'].some(type => STARTER_TOWER_TYPES.includes(type) || UNLOCKED_CLASS_TYPES.includes(type)) || mixedElementFor({str:250,dex:250,int:250}) !== 'PROTON' || mixedElementFor({str:260,dex:300,int:280}) !== 'QUASAR' || mixedElementFor({str:300,dex:0,int:250}) !== 'DARK_MATTER' || mixedElementFor({str:300,dex:249,int:0}) !== null || !String(drawStickman).includes('drawWeaponEnchant')) problems.push('elements are earned, never built: 250 STR/DEX/INT infuses Fire/Electric/Ice, a second element at 250 mixes into Proton (Fire+Electric), Dark Matter (Fire+Ice) or Quasar (Electric+Ice), and an elemental stickman always shows an enchantment on the weapon (ELEMENT-INFUSION-01)');
  if(!CONFIG.TOWERS.HACKER || !(CONFIG.TOWERS.HACKER.baseCost > 0) || CONFIG.TOWERS.HACKER.tiers[0].damage !== 0 || !MAX_ONE_PER_BOARD_TYPES.includes('HACKER') || !HACK_TOWER_TYPES.includes('HACKER') || STARTER_TOWER_TYPES.includes('HACKER') || UNLOCKED_CLASS_TYPES.includes('HACKER') || HACKER_MAX_HP > 25 || typeof Tower.prototype.goStealth !== 'function' || !String(towerTauntScore).includes('stealthUntil')) problems.push('the Hacker is a hacks-only stickman: priced above zero, never attacks, tiny health, one per board even when downed, stealth hides him from enemy targeting, and he never appears in normal progression (HACKER-01)');
  if(String(creditGroundBagGold).includes('launchGoldHudFlight') || !String(openGoldBag).includes('launchGoldHudFlight') || !String(creditCoin).includes('withFlight') || String(Enemy.prototype.applyDamage).includes('launchGoldHudFlight')) problems.push('coins fly to the gold counter only when the player clicks a coin or opens a bag, never on a defeat, expiry or automatic payout (GOLD-FLIGHT-CLICK-01)');
  if(ICE_FREEZE_MIN_MS !== 2000 || ICE_FREEZE_MAX_MS !== 5000 || !(ICE_PROC_SHARE < 1) || !(FROZEN_DAMAGE_MULT > 1) || !String(Enemy.prototype.applyDamage).includes('frozenUntil') || !String(SoundEngine.prototype.playEvent).includes('WAVE-CLEAR-FANFARE-01') || !String(SoundEngine.prototype.scheduleMusicStep).includes('musicCycle') || !CONFIG.TOWERS.BLOW_GUNNER) problems.push('Ice is the rarest element to proc but the most effective: 2 to 5 second freeze that blocks the queue behind it and takes extra damage; Blow Gunner stays a buildable tower that can carry elements; the wave-clear fanfare and the cycle-by-cycle key changes stay in the score (ICE-BLOCK-01, WAVE-CLEAR-FANFARE-01, MUSIC-EVOLVE-01)');
  if(typeof offerRunReward === 'function' || document.getElementById('runRewardBtn') || typeof SoundEngine.prototype.setWindLevel === 'function' || typeof expansionBlockedReason !== 'function' || tryCollectCoinAt.length < 4 || !String(updatePresentationEffects).includes('freeExpansionOwed')) problems.push('no wave choice rewards, no wind sound, the free expansion arrives only after every enemy is cleared, and coins collect on hover or slide (RUN-REWARD-REMOVED-01, EXPAND-AFTER-CLEAR-01, HOVER-COIN-01)');
  if(!String(Enemy.prototype.updateEscapedMovement).includes('LOOSE-ROAM-01') || !String(itemDropTargetAt).includes('HEAD-SNAP-01') || typeof GOLD_MAP_BAG_ITEM !== 'undefined') problems.push('escaped enemies roam off the road at once and fight the first stickman they meet, a dragged item snaps to a stickman by head or body, and bags are only bags (LOOSE-ROAM-01, HEAD-SNAP-01, CHEST-ONLY-01)');
  if(Math.abs(projectileStickChance(0) - 0.12) > 0.001 || !(projectileStickChance(250) > 0.4 && projectileStickChance(250) < 0.65) || projectileStickChance(500) < 0.9 || projectileStickChance(500) > 0.95) problems.push('arrows stick in enemies sometimes at 0 STR and gradually more often up to very likely at 500 STR (STICK-CHANCE-01)');
  if(!String(Enemy.prototype.draw).includes('LOOSE-GLOW-01') || typeof launchHeartHudFlights !== 'function') problems.push('loose enemies sit in a soft red glow with no ring and the fountain sends hearts to the lives counter (LOOSE-GLOW-01, HEART-FLIGHT-01)');
  { let attractOffScreenTopBottom = false, attractGrunts = 0; for(let i = 0; i < 300; i++){ const point = attractSpawnPoint(); if(point.yf < 0 || point.yf > 1 || (point.xf >= 0 && point.xf <= 1)) attractOffScreenTopBottom = true; if(attractPickEnemyType() === 'GRUNT') attractGrunts++; } if(attractOffScreenTopBottom || attractGrunts < 180) problems.push('the attract screen is mostly the big angry red guy and enemies come in from the left or right horizon, never from the sky (ATTRACT-HORIZON-01)'); }
  if(!String(drawEmojiGroundShadow).includes('BOX-SHADOW-01') || !String(drawEmojiGroundShadow).includes("fillStyle='#000'")) problems.push('the cardboard box casts a footprint shadow swept back-right like every other shadow, drawn in black (BOX-SHADOW-01)');
  { const quickRow = document.getElementById('inspQuickSlots'), plate = document.getElementById('inspect-panel'); if(quickRow && plate && (plate.contains(quickRow) || getComputedStyle(quickRow).position !== 'absolute')) problems.push('the quick items are free floating buttons outside the faceplate; the faceplate never grows to hold them (QUICK-FLOAT-01)'); }
  if(/roll < 0\.0[4-9]\) type = '/.test(String(spawnScenery)) || typeof maybeSpawnRandomEventsOnExpansion !== 'function' || !String(finalizeRingExpansion).includes('maybeSpawnRandomEventsOnExpansion')) problems.push('each expansion makes one random event near the flags and one near the finish carpet, and chests, crates and bushes are never rolled on ordinary tiles (ONE-EVENT-PER-END-01)');
  if(!String(initAttractLoop).includes('SCENE-TIME-OF-DAY-01')) problems.push('each new attract scene changes the time of day (SCENE-TIME-OF-DAY-01)');
  if(BONE_DROP_CHANCE >= 0.08 || typeof SHOVEL_CHARGES_PER_ROUND === 'undefined' || SHOVEL_CHARGES_PER_ROUND !== 3 || LOG_MAX_SCALE > 0.54 || !String(useStoredConsumable).includes('beginShovelDig') || !String(update).includes('resetShovelCharges(') || !String(digWithShovel).includes('dropTreasureBags') || !String(dropTreasureBags).includes('dropGoldBag')) problems.push('bones stay rarer than skulls and blood, logs stay small, and the shovel has three digs per round that refill when a wave is cleared (GORE-RARITY-01, LOG-SIZE-01, SHOVEL-CHARGES-01)');
  if(!STACKABLE_ITEM_IDS.has('HONEY') || typeof updateGroundItemDrift !== 'function' || !String(update).includes('updateGroundItemDrift(') || !/BEE'\) it\.e\.draw\(ctx\);[^\n]*\n\s*drawMarkedTargetIcon/.test(String(render))) problems.push('honey stacks in one slot, loose items drift to the nearest stickman whose range covers them and consumables are stored, and the pin is drawn after the bee (STACK-HONEY-01, ITEM-DRIFT-01, PIN-BEE-01)');
  if(typeof spawnBarricadeStrikeDebris !== 'function' || typeof spawnStickmanWound !== 'function' || !String(Tower.prototype.takeDamage).includes('maybeEnrage') || STICKMAN_RAGE_CHANCE > 0.1) problems.push('enemy strikes throw barricade debris away from the attacker, wound stickmen and rarely enrage them (BARRICADE-STRIKE-01, STICKMAN-WOUND-01, STICKMAN-RAGE-01)');
  { const engineSource = String(SoundEngine), voiceNames = kind => [...engineSource.matchAll(new RegExp(kind + "\\((?:[^()]|\\([^()]*\\))*?,\\s*'([a-z]+)'", 'g'))].map(match => match[1]);
    const missingPop = voiceNames('popTone').filter(name => !POP_VOICES[name]), missingTone = voiceNames('musicTone').filter(name => !String(SoundEngine.prototype.musicTone).includes("'" + name + "'"));
    if(missingPop.length || missingTone.length) problems.push('every music call names a voice the engine has: ' + [...new Set([...missingPop, ...missingTone])].join(', ') + ' (MUSIC-VOICES-01)'); }
  // Run progress, sharing, analytics labels, titles and canvas sharpness (RUN-SEED-01, RUN-PROGRESS-01, RUN-SUMMARY-01, RUN-SHARE-01, ANALYTICS-LABEL-01, SEO-TITLE-01, SHARP-CANVAS-01)
  { const titles = [document.title, document.querySelector('meta[property="og:title"]').content, document.querySelector('meta[name="twitter:title"]').content]; if(new Set(titles).size !== 1) problems.push('page, social and install titles must be one identical string (SEO-TITLE-01)');
    if(window.STICKTD_PLAY_LABEL !== window.STICKTD_PLATFORM + '/' + window.STICKTD_BUILD || !/^[a-z0-9.-]+$/.test(window.STICKTD_REFERRER_SITE) || !String(window.trackEvent).includes('play_label') || !String(window.enableStickTDAnalytics).includes('analyticsPageTitle')) problems.push('analytics must name every report by play label and referrer site (ANALYTICS-LABEL-01)'); }
  if(!String(setupCanvas).includes('const dprCap = 2')) problems.push('canvas pixel ratio cap must be 2 for every graphics profile (SHARP-CANVAS-01)');
  if(!TELEMETRY_EVENTS.act_started || !TELEMETRY_EVENTS.medal_earned || !TELEMETRY_EVENTS.game_over.includes('seed') || typeof copyRunSeed !== 'function' || !document.getElementById('endCopySeedBtn') || !document.getElementById('endRateBtn')) problems.push('act, medal and run-end telemetry plus the seed and rating buttons must stay (RUN-SHARE-01)');
  if(typeof ESCAPE_WALKBACK_MAX_TILES === 'undefined' || typeof Enemy.prototype.walkBackOntoRoute !== 'function' || !String(Enemy.prototype.updateEscaped).includes('walkBackOntoRoute') || String(Enemy.prototype.updateEscaped).includes('placeOnNearestRouteTile')) problems.push('an escaped enemy walks back onto the route instead of jumping (ESCAPE-WALKBACK-01)');
  if(typeof LIVESTOCK_AVOID_STRENGTH === 'undefined' || typeof Enemy.prototype.steerAroundEnemies !== 'function' || !String(Enemy.prototype.updateLivestockWander).includes('steerAroundEnemies')) problems.push('animals and bees steer away from enemies (LIVESTOCK-AVOID-01)');
  if(typeof drawSceneryGroundShadow !== 'function' || String(drawOneSceneryItem).includes('drawEmojiGroundShadow')) problems.push('scenery ground shadows are painted in their own pass before any sprite (SCENERY-SHADOW-PASS-01)');
  if(!PRODUCER_DEFS.VAULT || PRODUCER_DEFS.VAULT.slots.join() !== '18,24,30' || PRODUCER_DEFS.VAULT.slots.length !== PRODUCER_MAX_LEVEL || PRODUCER_DEFS.VAULT.upgrades.length !== PRODUCER_MAX_LEVEL - 1 || PRODUCER_DEFS.VAULT.build.stone <= PRODUCER_DEFS.VAULT.build.wood * 2 || document.querySelectorAll('.item-slot').length !== PRODUCER_DEFS.VAULT.slots[PRODUCER_MAX_LEVEL - 1] || isFighterTower({ type: 'VAULT' })) problems.push('the vault is a Build structure with 18 slots in three rows of six and two upgrades of six more, costing a little gold and wood and a lot of stone (VAULT-01)');
  if(BEE_HONEY_MIN_MS !== 300000 || BEE_HONEY_SPREAD_MS !== 300000 || !String(updateBeeHoney).includes('honeyDueMs')) problems.push('a bee makes honey after a random 5 to 10 minutes, like a Minecraft chicken laying eggs (BEE-HONEY-02)');
  if(ITEM_DRIFT_DELAY_MIN_MS !== 20000 || ITEM_DRIFT_DELAY_SPREAD_MS !== 10000 || typeof towerCanTakeDriftItem !== 'function' || !String(updateGroundItemDrift).includes('driftAt') || !String(updateGroundItemDrift).includes('towerCanTakeDriftItem')) problems.push('loose items wait 20 to 30 seconds, then drift only to a stickman that can take them (ITEM-DRIFT-02)');
  if(typeof pickLooseRoamGoal !== 'function' || !String(Enemy.prototype.updateEscapedMovement).includes('pickLooseRoamGoal') || !String(moveAroundScenery).includes('keepOffRoad')) problems.push('an escaped enemy roams the open ground off the road at once and fights the first stickman it meets (LOOSE-ROAM-01)');
  if(typeof advanceCountdownMusic !== 'function' || waveMusicLeadMs() < 1500 || waveMusicLeadMs() > 2600 || String(startWaveStartCameraPan).includes('SPAWN_MARKER_RISE_PX')) problems.push('the wave theme starts during the 3-2-1 so its bass drop lands on GO, and the wave-start camera centres on the spawn tile (MUSIC-COUNTDOWN-01, CAMERA-SPAWN-01)');
  if(typeof attractEasedLevel !== 'function' || attractEasedLevel(1, 4, 0) !== MUSIC_ATTRACT_SECTION_LEVEL[0] || attractEasedLevel(1, 7, 7) <= attractEasedLevel(1, 5, 0) || Math.abs(attractEasedLevel(2, 11, 7) - MUSIC_ATTRACT_SECTION_LEVEL[2]) > 0.001) problems.push('start-screen sections glide from the previous level to their own instead of stepping (MUSIC-ATTRACT-EASE-01)');
  if(!String(SoundEngine.prototype.scheduleAttractStep).includes("section >= 1 && section < 3") || !String(SoundEngine.prototype.scheduleAttractStep).includes('section >= 2 && section !== 3')) problems.push('the start-screen intro has no held drone chords or reed line; the pads join in the first verse and the oboe in the second (MUSIC-ATTRACT-EASE-01)');
  if(MUSIC_TEMPO_BPM !== MUSIC_ATTRACT_TEMPO_BPM || MUSIC_COMBAT_TEMPO_BPM !== 144 || MUSIC_BOSS_TEMPO_BPM !== 152 || MUSIC_ATTRACT_TONIC !== 50 || MUSIC_ATTRACT_CHORDS.map(chord => chord.root).join() !== MUSIC_BASS_ROOTS.slice(0, 4).join()) problems.push('every theme shares one key (D minor, i VI VII V) and one pulse: start screen and field 88 BPM, wave 144 and boss 152 (MUSIC-COHESION-01, MUSIC-DRIVE-01)');
  if(!String(SoundEngine.prototype.scheduleMusicStep).includes("musicBarRole === 'opening'") || !String(SoundEngine.prototype.scheduleMusicStep).includes("musicBarRole === 'landing'")) problems.push('the wave and boss opening bar plays only the sting and the bar after the drop states the leitmotif alone over the groove (MUSIC-OPENING-01)');
  if(MUSIC_STING_PICKUPS.length !== 3 || MUSIC_STING_DROP_STEP !== MUSIC_STEPS_PER_BAR || !String(SoundEngine.prototype.scheduleMusicSting).includes('musicBassDrop')) problems.push('the wave and boss opening is three rising brass pickups, a short riser and a bass drop on the next downbeat (MUSIC-STING-02)');
  if(typeof paintSceneryGroundShadows !== 'function' || SCENERY_SHADOW_STRENGTH !== 0.24 || !String(repaintSceneryShadowLayer).includes('drawSceneryGroundShadow(layer')) problems.push('scenery silhouette shadows are one union layer at strength 0.24 (SCENERY-SHADOW-UNION-01)');
  if(typeof runSeedFor !== 'function' || typeof runSeedCode !== 'string' || !runSeedCode || waveRunSeed !== runSeedFor(0xA3) || groundDetailRunSeed !== runSeedFor(0x51)) problems.push('run seeds are not built from the run code (RUN-SEED-01)');
  if(actTitleForWave(CAMPAIGN_WAVE_COUNT + 1) !== EXPEDITION_TITLE || !String(announceActStart).includes('wave > CAMPAIGN_WAVE_COUNT')) problems.push('after the campaign the Expedition is announced once and the last act is not repeated (ACT-ANNOUNCE-01)');
  if(ACT_NAMES.length !== 10 || actNumberForWave(1) !== 1 || actNumberForWave(11) !== 2 || actNumberForWave(999) !== 10 || MEDAL_DEFS.length < 10 || new Set(MEDAL_DEFS.map(m => m.id)).size !== MEDAL_DEFS.length || typeof awardMedal !== 'function') problems.push('acts or medals are malformed (RUN-PROGRESS-01)');
  if(!document.getElementById('endRunSummary') || !document.getElementById('settingsMedalToggle') || !document.getElementById('settingsRunSeed')) problems.push('run summary, medal toggle or seed input is missing (RUN-SUMMARY-01)');
  if(typeof HOSTILE_EVENT_BREATHER_WAVES === 'undefined' || HOSTILE_EVENT_BREATHER_WAVES < 2 || !String(runWaveClearRandomEvents).includes('lastHostileEventWave')) problems.push('a hostile random event is followed by a wave clear with only peaceful events (EVENT-PACING-01)');
  if(!isInstantOpenProp({type:'MUSHROOMS'}) || typeof spawnExpansionFinale !== 'function') problems.push('mushrooms open instantly and map expansion glitters tile by tile and ends in a golden burst (MUSHROOM-INSTANT-01, EXPANSION-GLORY-01)');
  if(!String(spawnBoneDebris).includes('BONE-SPREAD-01')) problems.push('bones vary in size with the enemy and spread evenly (BONE-SPREAD-01)');
  if(String(update).includes('driveRingReveal(') || !String(updatePresentationEffects).includes('driveRingReveal(') || RING_REVEAL_TARGET_MS < 1500) problems.push('the expand reveal is slow, clean and drawn in real time at every game speed (EXPAND-REALTIME-01)');
  if(pathTurnFirstChance < 0.7) problems.push('the road prefers turning when it grows so it never becomes a long straight line (PATH-WINDY-01)');
  if(HEAVY_VISUAL_LOAD_HOLD_MS < 300 || HEAVY_VISUAL_LOAD_HOLD_MS > 2000 || typeof heavyVisualLoadHoldUntil !== 'number') problems.push('adaptive detail holds for a real-time interval, not a frame count (ADAPTIVE-HOLD-REALTIME-01)');
  if(!String(spawnDecal).includes('bloodDecalBlocked') || !String(generateScenery).includes('spawnWastelandStumps')) problems.push('blood pools respect intervening bodies and new runs include two harvestable wasteland branches (POOL-VOID-01, WASTELAND-STUMPS-01)');
  if(typeof caravanEdgePoint !== 'function' || !String(updateCaravan).includes("'approach'") || !String(spawnCaravan).includes('caravanEdgePoint') || !document.getElementById('caravanWag')) problems.push('CARAVAN-JOURNEY-01: the merchant must enter from beyond the map edge, cross the road and leave off the far edge, with his wag icon under Shop');
  if(SPEARMAN_SWEEP_ARC_FRACTION <= 1.1 || !String(Tower.prototype.draw).includes("this.type === 'LANCER' || isFastForwardSimplified() ? this.baseAngle")) problems.push('SPEARMAN-SWEEP-01: the Spearman sweeps the widest melee arc (wider than the Berserker) and the Lancer keeps its thrust');
  if(!String(Tower.prototype.update).includes('POST_KILL_READY_MS') || !String(Tower.prototype.draw).includes('holdingAfterKill')) problems.push('KILL-READY-01: a stickman keeps the weapon raised for a few seconds after a kill before the idle pose');
  if(MUSIC_WAVE_THEME.length !== 24 || MUSIC_WAVE_THEME.some(row => row.length !== MUSIC_STEPS_PER_BAR)) problems.push('MUSIC-THEME-01: the wave theme must be a 24-bar tune of eight steps per bar');
  if(!(CONFIG.TOWERS.SQUIRTGUN.tiers[2].acidDamage > 0) || CONFIG.TOWERS.SQUIRTGUN.tiers[2].damage > 6 || ACID_MAX_STACKS !== 3 || typeof Enemy.prototype.applyAcidCoat !== 'function') problems.push('ACID-COAT-01: the squirt gun coats a small area with up to 3 stacks of acid and its direct damage stays low');
  if(!String(drawGunEmoji).includes('scale(-1')) problems.push('GUN-FACING-01: the gun glyph must be mirrored so the muzzle leads the aim');
  if(typeof pickTrollEdgeSpawnPoint !== 'function' || !String(spawnWanderingTroll).includes('buildTrollEntranceRoute') || !String(Enemy.prototype.updateLivestockWander).includes('walkTrollEntrance')) problems.push('TROLL-ENTRANCE-01: the wandering troll must enter from the map edge and tour the grass rim before hunting');
  if(!String(buildTowerModal).includes('appendUnlockableRow') || !String(isTowerTypeAvailable).includes('UNLOCKABLE_TOWER_TYPES') || String(buildTowerModal).includes('already on the field')) problems.push('BUILD-MENU-GROUPS-03 and SPECIAL-ONE-01: unlocked stickmen stand in Stickmen Defenders, each special one is limited to one and reads already active');
  if(typeof roadCharacterForRun !== 'function' || ROAD_CHARACTERS.length < 4 || !String(orderRoadDirections).includes('roadCurlDirection')) problems.push('ROAD-CHARACTER-01: each run must draw a road character and turning styles must keep a straight stretch between turns');
  if(typeof looseEnemyGlowSprite !== 'function' || String(Enemy.prototype.draw).includes('createRadialGradient')) problems.push('LOOSE-GLOW-CACHE-01: the loose-enemy glow is a cached sprite, never a gradient built per frame');
  if(!String(SoundEngine.prototype.scheduleMusicStep).includes('MUSIC_WAVE_THEME[bar % MUSIC_WAVE_THEME.length][beatStep - 1]')) problems.push('MUSIC-BIP-01: the wave theme answers its own rests with quiet high plucks');
  if(!String(openShopModal).includes('closeBuildMenuIfOpen') || !String(openHackMenu).includes('closeBuildMenuIfOpen')) problems.push('MENU-EXCLUSIVE-01: opening another menu closes the build menu');
  if(earlyPreviewFamily(3) !== 'SWARM' || !String(rushDispatchIfFieldClear).includes('EARLY_NO_RUSH_LAST_WAVE') || tierPopulationForWave(4).STANDARD < 1 || typeof grantEarlyGift !== 'function') problems.push('EARLY-HOOK-01: wave 3 previews Swarm, wave 4 has a champion and wave 1 leaves a gift');
  if(typeof sceneryShadowSignatureFor !== 'function' || !String(paintSceneryGroundShadows).includes('sceneryShadowSignature') || typeof SCENERY_SHADOW_MARGIN_PX !== 'number') problems.push('SCENERY-SHADOW-CACHE-01: the scenery shadow layer is repainted only when the camera or scenery changes');
  if(!(WAVE_CHEER_MS > 0) || !(CLOSE_CALL_FREEZE_MS > 0)) problems.push('WAVE-CHEER-01 / CLOSE-CALL-01: fighters cheer after a cleared wave and a finish-line kill freezes for a beat');
  if(ENEMY_EMOJI_VARIANTS.GRUNT || CONFIG.ENEMIES.GRUNT.emoji !== '😡') problems.push('GRUNT-ONE-FACE-01: a Grunt is always 😡, never a second face');
  if(String(SoundEngine.prototype.scheduleCombatLayers).includes('bar % 8 === 6) this.popRiser')) problems.push('COMBAT-RISER-01: the battle music sweeps once per cycle, not every 8 bars');
  { const classIcons = new Set(Object.values(CONFIG.TOWERS).map(tower => tower.icon)); const clashes = [...ITEM_BY_ID.values(), DEFIBRILLATOR_ITEM].filter(item => item && item.id !== 'BARRICADE_ITEM' && classIcons.has(item.icon)).map(item => item.id); if(clashes.length) problems.push('ITEM-ICON-UNIQUE-01: items never share an emoji with a class: ' + clashes.join(', ')); }
  if(String(emojiSpriteFor).includes('emojiSpriteRows.clear()')) problems.push('EMOJI-SPRITE-LRU-01: a full emoji sprite cache drops its least recently used sprites, never all at once');
  if(!String(resolveEnemyCollisions).includes('largestActiveEnemyRadius') || !String(resolveSweptEnemyCollisions).includes('largestActiveEnemyRadius')) problems.push('COLLISION-QUERY-EXACT-01: collision passes query only the cells an overlap can reach');
  if(!String(drawDecals).includes('drawZoomedSettledDecals') || String(drawDecals).includes('camera.zoom > 1.25) && decalVisible')) problems.push('ZOOMED-DECAL-CACHE-01: settled blood marks are drawn into a reused layer when zoomed in, never one by one each frame');
  if(typeof drawCrispMap !== 'function' || !String(rebakeMap).includes('mapBakeRevision++')) problems.push('CRISP-MAP-01: zoomed-in maps are drawn at screen resolution, never stretched');
  if(typeof SoundEngine !== 'function' || !document.querySelector('script[src^="js/audio.js"]')) problems.push('AUDIO-SPLIT-01: the sound engine and music live in js/audio.js, loaded before js/config.js');
  if(!String(handleTap).includes('hintIfFighterOutOfReach') || !String(maybeShowWaveTutorialTip).includes('SAVE_TIP_WAVE')) problems.push('REACH-HINT-01 and SAVE-TIP-01: an out-of-reach fighter gets a hint, and wave 3 suggests saving');
  if(LOOSE_DRAIN_FIRST_WAVE < 2 || !String(Enemy.prototype.updateEscaped).includes('LOOSE_DRAIN_FIRST_WAVE')) problems.push('LOOSE-DRAIN-GRACE-01: loose enemies drain no lives before wave 4');
  const loadedScriptOrder = [...document.scripts].map(script => (script.getAttribute('src') || '').match(/^js\/([a-z]+)\.js/)).filter(Boolean).map(match => match[1]);
  if(loadedScriptOrder.join() !== GAME_SCRIPT_ORDER.join()) problems.push('FILE-SPLIT-01: index.html loads ' + GAME_SCRIPT_ORDER.join(', ') + ' in that order, as the file map in js/config.js lists them');
  if(document.querySelector('script[src^="js/stickman.js"]') || (gameScriptSources.towers !== undefined && !gameScriptSources.towers.includes('function drawStickman('))) problems.push('STICKMEN-ARE-TOWERS-01: the stickmen are the towers, so the stickman figure, weapons and poses live in js/towers.js, not a separate file');
  const driftedContentsFiles = GAME_SCRIPT_ORDER.filter(fileName => gameScriptSources[fileName] !== undefined && !contentsListMatchesBanners(gameScriptSources[fileName]));
  if(driftedContentsFiles.length) problems.push('FILE-CONTENTS-01: the Contents list at the top of js/' + driftedContentsFiles.join('.js, js/') + '.js does not match its section banners');
  const assistNote = document.getElementById('aboutAssistNote');
  if(!assistNote || assistNote.textContent !== AI_ASSIST_NOTE || !getReadmeText().includes(AI_ASSIST_NOTE)) problems.push('AI-DISCLOSURE-01: Settings > About and the in-game README say coding was assisted by Claude and the design is human');
  if(WAVE_ONE_HP_SCALE >= 1) problems.push('FIRST-KILLS-01: wave-1 units have reduced hit points');
  if(spawnGapForWave(1) > 3000 || spawnGapForWave(OPENING_PACE_LAST_WAVE + 1) !== OPENING_FLOW_SPAWN_GAP_MS || spawnGapForWave(OPENING_FLOW_LAST_WAVE + 1) !== ENEMY_SPAWN_GAP_MS || WAVE_ONE_MAX_ON_ROUTE < 2) problems.push('OPENING-PACE-01 / OPENING-FLOW-01: waves 1 and 2 space units at most 3 s apart, wave 1 allows two enemies on the route, waves 3-10 use OPENING_FLOW_SPAWN_GAP_MS and later waves keep ENEMY_SPAWN_GAP_MS');
  if(typeof BATCH_RELEASE_MAX_HOLD_MS === 'undefined' || BATCH_RELEASE_MAX_HOLD_MS > 6000 || !String(advanceWaveDispatch).includes('releaseHoldMs')) problems.push('a batch fighting at the entrance holds the next batch at most 6 seconds (RELEASE-HOLD-CAP-01)');
  if(!String(tileBiome).includes('biomeNoise')) problems.push('BIOME-GRADIENT-01: biomes must follow one smooth field so Pinewood and Dunes never touch');
  if(BLOOD_STAIN_MAX < 48 || !String(stainEntity).includes('shift()') || String(stainEntity).includes('bloodStainNext') || BLOOD_SATURATION_MAX_HIGH <= BLOOD_SATURATION_MAX) problems.push('BLOOD-LAYER-01: blood marks on scenery and stickmen must stack newest-on-top without ring overwrite');
  if(!String(updateQuickSlots).includes('dataset.count')) problems.push('SLOT-COUNT-01: item stack counts must render as a corner badge');
  if(MAX_DECALS !== 4200 || MAX_DECALS_LOW_QUALITY !== 700 || !String(drawDecals).includes('camera.zoom > 1.25') || !String(render).includes('camera.zoom <= 1.25')) problems.push('blood defaults are high 2100 / low 700 and zoomed settled shapes replace the raster blit (BLOOD-ZOOM-01)');
  if(!String(spawnScenery).includes('sceneryPlanRandom') || !String(spawnArterialBeat).includes('bloodPoolSizeScale') || !String(spawnBloodStream).includes('bloodPoolSizeScale') || !String(updateBloodTrails).includes('bloodPoolSizeScale')) problems.push('ordinary scenery follows the saved seed and remaining blood emitters use victim weight (SCENERY-SEEDED-PLAN-01, BLOOD-WEIGHT-01)');
  if(typeof settledDecalHasContent !== 'boolean' || !String(render).includes('settledDecalHasContent')) problems.push('the empty settled decal layer is not drawn every frame (EMPTY-LAYER-SKIP-01)');
  { const redFresh = agedBloodRgb({ rgb: { r: 140, g: 20, b: 20, a: 1 }, lifespan: DECAL_LIFESPAN }, 0), greenFresh = agedBloodRgb({ rgb: { r: 60, g: 160, b: 50, a: 1 }, lifespan: DECAL_LIFESPAN }, 0); const redLate = agedBloodRgb({ rgb: { r: 140, g: 20, b: 20, a: 1 }, lifespan: DECAL_LIFESPAN }, 0.9), greenLate = agedBloodRgb({ rgb: { r: 60, g: 160, b: 50, a: 1 }, lifespan: DECAL_LIFESPAN }, 0.9); if(redFresh.r !== 255 || redFresh.g !== 40 || greenFresh.r > 80 || greenFresh.g < 160 || redLate.r !== redFresh.r || redLate.g !== redFresh.g || greenLate.g !== greenFresh.g || decalAgeMs({ spawnTime: presentationTime - 1e9, lifespan: 1000 }) > 500) problems.push('red blooded enemies show bright fresh blood, other colours keep their own, and no mark changes colour or fades before the round-end clean-up (FRESH-BLOOD-01, BLOOD-STABLE-01)'); }
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
  { // OWNER-LEDGER-01
    const src = fn => String(fn);
    const ledger = [
      ['no wind sound', typeof SoundEngine.prototype.setWindLevel === 'undefined'],
      ['no wave choice rewards', typeof offerRunReward === 'undefined' && !document.getElementById('runRewardBtn')],
      ['wave clear keeps its twang', src(SoundEngine.prototype.playEvent).includes('523.25')],
      ['countdown buzzer, eating, potion, scroll, injector and expand sounds', ['countdown_tick', 'countdown_go', 'item_eat', 'item_potion', 'item_scroll', 'item_inject', 'expand_build'].every(n => src(SoundEngine.prototype.playEvent).includes("'" + n + "'"))],
      ['hack cheat menu grants wood, stone and gold', ['+🪵1,000', '+🪨10,000', '+💰100,000'].every(a => src(runHackAction).includes(a))],
      ['stat tooltips: DEX gives accuracy', src(updateInspectPanelNow).includes('Dexterity: improves attack speed, accuracy') && !src(updateInspectPanelNow).includes('Intelligence —')],
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
  if(typeof drawFlagGroundShadow !== 'function' || !String(drawFinishFlagPole).includes('drawFlagGroundShadow') || !String(Tower.prototype.draw).includes("'🚧',this.x,this.y,28*STICKMAN_SCALE,'serif'")) problems.push('flag shadows are one shape and each emoji shadow is measured in the font its glyph is drawn with (FLAG-SHADOW-01, SHADOW-ALIGN-01)');
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
  for(const [type, def] of Object.entries(LIVESTOCK_TYPES)) if(!CONFIG.ENEMIES[type] || CONFIG.ENEMIES[type].bounty === undefined) problems.push('livestock ' + type + ' must have a matching CONFIG.ENEMIES entry (TARGET-MARK-01)');
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
  problems.push(...bootSelfTestFailures);
  return problems;
}
// SELF-TESTS-AT-BOOT-01: the boot sequence runs the self-tests once, so a failing test is listed with the design-contract problems in every debug log instead of waiting for a manual run.
let bootSelfTestFailures = [];
function runBootSelfTests(){
  const savedIdCounter = idCounter, savedEnemySpawnSerial = enemySpawnSerial;
  const failures = runDebugSelfTests(false).filter(result => !result.pass);
  idCounter = savedIdCounter; enemySpawnSerial = savedEnemySpawnSerial;
  bootSelfTestFailures = failures.map(result => 'SELF-TESTS-AT-BOOT-01: self-test failed: ' + result.name + (result.detail ? ' (' + result.detail + ')' : ''));
  return bootSelfTestFailures;
}
let designContractProblems = [];
function runDebugSelfTests(logResults = true){
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  {
    const e1 = new Enemy(); e1.spawn('GRUNT', 1, false); e1.active = true;
    const e2 = new Enemy(); e2.spawn('GRUNT', 1, false); e2.active = false;
    check('dead enemy excluded from targeting', isCombatTarget(e1) && !isCombatTarget(e2));
  }

  {
    const e = new Enemy();
    e.spawn('GRUNT', 1, false);
    e.escaped = true; e.wanderVx = 5; e.wanderVy = -3; e.wanderRepickTimer = 500;
    e.escapedAttackTarget = { active: true }; e.escapedAttackTimer = 123; e.escapedAttackCheckTimer = 456; e.looseDrainMs = 5000;
    e.spawn('GRUNT', 1, false); // simulates pool reuse — same instance, fresh spawn
    check('escaped/wander fields reset on pool reuse', e.escaped === false && e.wanderVx === 0 && e.wanderVy === 0 && e.wanderRepickTimer === 0 && e.escapedAttackTarget === null && e.escapedAttackTimer === 0 && e.escapedAttackCheckTimer === 0);
  }

  {
    const wild = new Enemy(); wild.spawn('CHICKEN', 1, false); wild.active = true; wild.isLivestock = true;
    const savedMark = markedTargetEnemy;
    const passive = !isCombatTarget(wild);
    markedTargetEnemy = wild; const markedIsTarget = isCombatTarget(wild); markedTargetEnemy = savedMark;
    check('livestock is passive until the player marks it (TARGET-MARK-01)', passive && markedIsTarget);
  }

  check('no wind affects accuracy (WIND-REMOVED-01)', typeof windMissPenalty === 'undefined' && typeof updateWind === 'undefined');

  {
    let allTargetsExist = true;
    for(const baseType of Object.keys(HYBRID_SPECIALIZATIONS)){
      for(const pairKey of Object.keys(HYBRID_SPECIALIZATIONS[baseType])){
        if(!CONFIG.TOWERS[HYBRID_SPECIALIZATIONS[baseType][pairKey]]) allTargetsExist = false;
      }
    }
    check('every HYBRID_SPECIALIZATIONS target exists in CONFIG.TOWERS', allTargetsExist);
  }

  {
    const allReachable = UNLOCKED_CLASS_TYPES.every(type => UNLOCKABLE_TOWER_TYPES.includes(type));
    check('every unlockable class is reachable via UNLOCKABLE_TOWER_TYPES', allReachable);
  }

  {
    const eBoth = new Enemy(); eBoth.spawn('GRUNT', 1, true, true); // both flags requested at once
    const eMini = new Enemy(); eMini.spawn('GRUNT', 1, false, true);
    const eNormal = new Enemy(); eNormal.spawn('GRUNT', 1, false, false);
    check('isBig/isMini stay mutually exclusive even if both requested', eBoth.isBig === true && eBoth.isMini === false);
    check('Mini variant has less HP, radius, and bounty than a normal spawn', eMini.maxHp < eNormal.maxHp && eMini.radius < eNormal.radius && eMini.bounty < eNormal.bounty);
  }

  {
    check('BLOOD_ON_HIT_CHANCE is a valid probability strictly less than 1 (a real reduction, not a no-op)', typeof BLOOD_ON_HIT_CHANCE === 'number' && BLOOD_ON_HIT_CHANCE > 0 && BLOOD_ON_HIT_CHANCE < 1);
  }

  // 10. Wave plans rebuild identically from the same seed, and phases never reorder.
  {
    const planA = buildWavePlan(37), planB = buildWavePlan(37);
    const flatten = plan => plan.phases.map(ph => ph.batches.map(b => b.units.map(u => u.family + u.sizeTier).join(',')).join('|')).join('/');
    check('same seed and wave number rebuild an identical plan', flatten(planA) === flatten(planB));
    check('wave 1 is one Tiny per batch, as many batches as its Tiny count', validateWavePlan(buildWavePlan(1)).length === 0 && buildWavePlan(1).phases[0].batches.length === tierPopulationForWave(1).TINY); // WAVE-ONE-COUNT-01
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

  {
    const straightAngle = calculateLeadIntercept(0, 0, 300, 100, 0, 0, 0);
    const stationaryOk = Math.abs(straightAngle) < 0.0001;
    const leadAngle = calculateLeadIntercept(0, 0, 300, 100, 0, 0, 150);
    const leadOk = Number.isFinite(leadAngle) && leadAngle > 0.0001; // shot must aim below the straight line (+Y) to actually catch a target moving in +Y
    check('calculateLeadIntercept aims directly at a stationary target', stationaryOk, straightAngle.toFixed(4));
    check('calculateLeadIntercept leads a perpendicular-moving target', leadOk, leadAngle.toFixed(4));
  }

  // PRD-ROLLS-01: luck-balanced rolls keep the stated average, even when the chance varies per roll, and make back-to-back misses rare.
  {
    const holder = {};
    let fired = 0, expected = 0, backToBack = 0, previous = false;
    for(let i = 0; i < 40000; i++){
      const chance = i % 2 ? 0.02 : 0.17;
      expected += chance;
      const fires = prdRollFires(chance, holder, 'balance');
      if(fires){ fired++; if(previous) backToBack++; }
      previous = fires;
    }
    check('luck-balanced rolls average their stated chance and rarely repeat', Math.abs(fired - expected) <= 2 && backToBack / fired < 0.05, fired + ' fired, ' + Math.round(expected) + ' expected, ' + backToBack + ' back to back');
  }

  if(!logResults) return results;
  const passed = results.filter(r => r.pass).length;
  console.log('runDebugSelfTests(): ' + passed + '/' + results.length + ' passed');
  for(const r of results) console.log((r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  return results;
}
