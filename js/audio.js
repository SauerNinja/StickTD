"use strict";

// Contents (one line per section banner below, in file order; keep in step when sections change — FILE-CONTENTS-01):
//   SOUND ENGINE AND ADAPTIVE MUSIC
//   SOUND EFFECT DISPATCH AND AUDIO UNLOCK
// StickTD audio: the Web Audio sound engine, synthesized sound effects and the adaptive music score (AUDIO-SPLIT-01, 1.8.43).
// Loaded before js/config.js; everything here is classic-script global scope, shared with the other files.
/* =========================================================
   SOUND ENGINE AND ADAPTIVE MUSIC
   ========================================================= */
// MUSIC-MIX-01 — see HISTORY.md § [1.6.163] Audio mix and adaptive score, MUSIC-MIX-01.
let audioMasterVolume = 1, audioMusicVolume = 1, audioSfxVolume = 1;
const MASTER_OUTPUT_GAIN = 0.75; // MIX-LEVEL-01 (1.7.36): measured loudest SFX burst over boss music peaked at 0.37 of full scale with the old 0.5 gain, so +3.5 dB still leaves about 4 dB of headroom before the compressor
const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']; // AUDIO-GESTURE-01 (1.7.107); declared here, before the design contract runs
const MUSIC_TEMPO_BPM = 88; // MUSIC-COHESION-01 (1.8.35): one 88 BPM pulse, field and start screen at 1x, wave and boss at 1.5x
const MUSIC_COMBAT_TEMPO_BPM = 144; // MUSIC-DRIVE-01 (1.8.58): back to the pre-1.8.35 battle tempo; 132 BPM took the drive out of the wave music
const MUSIC_CYCLE_SHIFTS = [0, 5, 7, 3, 10, 2, 0, 7, 5, 8, 3, 10]; // MUSIC-JOURNEY-01 (1.8.20): twelve cycles before the key path repeats, up from eight // MUSIC-EVOLVE-01 (1.7.36): each 24-bar cycle moves the whole score to a new key
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
const MUSIC_TOM_PITCHES = [150, 128, 108, 92];
const MUSIC_TIMPANI_HZ = 84;
const MUSIC_DUCKED_KINDS = new Set(['pad', 'harmony', 'pluck', 'warm']), MUSIC_LEAD_DUCK = 0.8, MUSIC_LEAD_SWELL = 1.15, MUSIC_LEAD_OCTAVE_LEVEL = 0.22;
const MUSIC_LEITMOTIF = Object.freeze([[0, 0, 2], [2, 7, 2], [4, 12, 2], [6, 14, 1], [7, 12, 1]]);
const MUSIC_VIBRATO_CENTS = 16;
const MUSIC_KEY_PITCH_CLASSES = new Set([0, 2, 3, 5, 7, 8, 10, 11]);
const MUSIC_HARMONY_GAPS = [5, 4, 3, 6];
const MUSIC_TEMPO_CREEP = 0.06;
const MUSIC_STING_PICKUPS = Object.freeze([[0, 0, 7, 0.05], [2, 3, 10, 0.062], [4, 5, 12, 0.076]]), MUSIC_STING_DROP_STEP = MUSIC_STEPS_PER_BAR; // MUSIC-STING-02 (1.8.33): [step, root offset, fifth-or-above offset, gain]
// MUSIC-ATTRACT-01 (1.7.100) — see HISTORY.md § [1.7.100]: the start screen plays its own arrangement of the battle melody
// MUSIC-ATTRACT-03 (1.8.12) — see CHANGELOG.md § [1.8.12]: the start screen is a dark minor-key march (i, VI, VII, V), slower, in a lower register, without the sparkling arpeggio octave, open hats and claps
// MUSIC-REFERENCE-01 (1.8.15) — see CHANGELOG.md § [1.8.15]: the start screen slows to 88 BPM, holds each verse chord as a four-bar bass pedal under a quiet low fifth, answers the lead with an oboe line, rests twice per cycle and develops its motif; wave and field music gain a timpani downbeat and a fill every fourth bar
const MUSIC_ATTRACT_TEMPO_BPM = 88, MUSIC_ATTRACT_TONIC = 50;
const MUSIC_ATTRACT_CHORDS = [{ root: 38, triad: [0, 3, 7] }, { root: 34, triad: [0, 4, 7] }, { root: 36, triad: [0, 4, 7] }, { root: 45, triad: [0, 4, 7] }];
const MUSIC_ATTRACT_BASS = { 0: 0, 1: 0, 3: 12, 4: 7, 6: 12, 7: 7 };
// MUSIC-ATTRACT-02 (1.7.104) — see HISTORY.md § [1.7.104]: the 24-bar start-screen cycle is now a song (intro, two verses, a build, a chorus) played with its own brighter voices and a larger voice budget
const MUSIC_ATTRACT_VOICE_LIMIT = 24, MUSIC_ATTRACT_OPTIONAL_HEADROOM = 3, MUSIC_ATTRACT_SECTION_LEVEL = [0.38, 0.56, 0.68, 0.76, 0.9], MUSIC_ATTRACT_BUILD_CHORDS = [3, 3, 1, 1], MUSIC_ATTRACT_ARP = [0, 1, 2, 1, 2, 1, 2, 1];
// MUSIC-ATTRACT-EASE-01 (1.8.36): each start-screen section glides from the previous section's level to its own over its first half instead of stepping, so drums, snare and hats grow in rather than arriving at full strength.
function attractEasedLevel(section, bar, beatStep){
  const sectionBars = section === 4 ? 8 : 4, progress = ((bar - section * 4) * MUSIC_STEPS_PER_BAR + beatStep) / (sectionBars * MUSIC_STEPS_PER_BAR), amount = Math.min(1, progress * 2), smooth = amount * amount * (3 - 2 * amount);
  const previous = MUSIC_ATTRACT_SECTION_LEVEL[Math.max(0, section - 1)], target = MUSIC_ATTRACT_SECTION_LEVEL[section];
  return previous + (target - previous) * smooth;
}
const POP_VOICES = {
  warm: { wave: 'triangle', detunes: [0], attack: 0.035, sustain: 0.55, decay: 0.45, release: 0.12, cutoffStart: 2200, cutoffEnd: 1400, cutoffTime: 0.7, q: 0.3, echo: true },
  lead:  { vibrato: { rate: 5.6, cents: 9, delay: 0.18 }, wave: 'sawtooth', detunes: [-7, 7], attack: 0.008, sustain: 0.75, decay: 0.35, release: 0.07, cutoffStart: 5200, cutoffEnd: 3000, cutoffTime: 0.5, q: 0.6, echo: true },
  harmony: { wave: 'sawtooth', detunes: [0], attack: 0.01, sustain: 0.7, decay: 0.35, release: 0.06, cutoffStart: 3600, cutoffEnd: 2200, cutoffTime: 0.5, q: 0.5, echo: false },
  pad:   { wave: 'sawtooth', detunes: [0], attack: 0.07, sustain: 0.8, decay: 0.5, release: 0.3, cutoffStart: 1500, cutoffEnd: 1100, cutoffTime: 0.8, q: 0.3, echo: false },
  pluck: { wave: 'square', detunes: [0], attack: 0.003, sustain: 0.12, decay: 0.3, release: 0.04, cutoffStart: 8000, cutoffEnd: 1000, cutoffTime: 0.35, q: 0.8, echo: true },
  bass:  { wave: 'sawtooth', detunes: [0], sub: true, attack: 0.004, sustain: 0.55, decay: 0.4, release: 0.04, cutoffStart: 1500, cutoffEnd: 420, cutoffTime: 0.4, q: 1.2, echo: false },
  oboe:  { vibrato: { rate: 5.2, cents: 11, delay: 0.22 }, wave: 'sawtooth', detunes: [-4, 4], attack: 0.05, sustain: 0.7, decay: 0.4, release: 0.12, cutoffStart: 2000, cutoffEnd: 1300, cutoffTime: 0.6, q: 1.4, echo: true },
  bell:  { wave: 'sine', detunes: [0], fmRatio: 3.5, fmIndex: 3.2, attack: 0.002, sustain: 0.1, decay: 0.5, release: 0.05, cutoffStart: 9000, cutoffEnd: 5000, cutoffTime: 0.6, q: 0.3, echo: true }
};
// MUSIC-SPACE-01 (1.7.116): tonal voices are spread across the stereo field by pitch, alternating sides note by note (leads stay near the centre), and sent to a short stereo hall; the music bus gets a gentle low-mid cut so the bass and chords stop masking the melody, and the idle theme opens its lowpass from 3200 to 4200 Hz for air.
const MUSIC_PAN_FLOOR_HZ = 240, MUSIC_PAN_SPAN_HZ = 1500, MUSIC_PAN_MAX = 0.6, MUSIC_PAN_LEAD_SHARE = 0.3, MUSIC_REVERB_SEND = 0.2, MUSIC_REVERB_SECONDS = 1.9, MUSIC_MUD_CUT_HZ = 280, MUSIC_MUD_CUT_DB = -2.5, MUSIC_FIELD_FILTER_HZ = 4200, MUSIC_MAKEUP_GAIN = 1.75, MUSIC_SECTION_LEVEL = [0.92, 1.02, 1.16], MUSIC_AIR_HZ = 3500, MUSIC_AIR_DB = 3.2; // MUSIC-LOUD-01 (1.8.19)
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
// MUSIC-THEME-01 (1.8.40): the wave theme is a real 24-bar tune in absolute semitones above the key's D3, over Dm Dm F C / Dm Gm F Dm / Dm C Gm Dm. Section A states a heroic rising call and answers it higher, section B climbs and sequences through Gm and F, section C soars to the top of the range and lands home. The old table was degrees of whichever chord was sounding, so the tune only ever shuffled around the same five notes.
const MUSIC_WAVE_THEME = [
  [12,null,null,7,8,null,7,null], [5,null,7,null,12,null,null,null], [12,null,14,15,14,null,12,null], [10,null,7,null,8,null,7,5],
  [15,null,12,null,10,null,12,15], [17,null,15,null,12,null,10,null], [14,null,17,19,17,null,14,null], [12,null,14,null,10,null,null,null],
  [19,null,17,null,15,null,14,null], [12,null,14,15,17,null,19,null], [20,null,19,null,17,null,15,null], [17,null,15,null,12,null,8,null],
  [15,null,17,null,19,null,22,null], [24,null,22,null,19,null,17,15], [14,null,17,null,15,null,12,null], [14,12,null,7,null,12,null,null],
  [24,null,null,19,17,null,19,null], [15,null,17,null,19,null,24,null], [26,null,24,null,22,null,19,null], [22,null,26,null,29,null,26,null],
  [24,null,20,null,17,null,20,24], [29,null,27,null,24,null,20,null], [24,null,19,null,24,null,27,null], [26,24,null,19,null,24,null,null]
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
// BUILD-MELODY-01 (1.8.51): each placement plays the next note of a short phrase in the score's current key instead of the same click (SimGolf's placement tune, Sid Meier's Memoir!).
const BUILD_MELODY_STEPS = [0, 3, 7, 5, 3, 7, 10, 12, 10, 7, 5, 3];
const BUILD_MELODY_BASE_NOTE = 72;
const SFX_VARIANT_EXEMPT = new Set(['loot_drop','build_note','heart_break','item_scroll','item_inject','wave_clear','levelup','evolution','hero','legendary','countdown_tick','countdown_go','coin','ui_buy','ui_deny','ui_open','ui_close','lose','wave','threat','item_eat','item_potion','expand_build']);
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
    this.compressor.threshold.setValueAtTime(-15, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
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
      this.musicOpeningBarsLeft = combat ? 2 : 0;
    }
    if(beatStep === 0){
      this.musicBarRole = combat && this.musicOpeningBarsLeft > 0 ? (this.musicOpeningBarsLeft === 2 ? 'opening' : 'landing') : null;
      if(this.musicOpeningBarsLeft > 0) this.musicOpeningBarsLeft--;
    }
    if(this.musicBarRole === 'opening') return;
    const baseChord = (combat ? MUSIC_COMBAT_ROOTS : MUSIC_BASS_ROOTS)[Math.floor(bar / 2) % MUSIC_BASS_ROOTS.length];
    const chord = baseChord + shift;
    const intensity = this.musicIntensity || 0;
    const breath = phraseBar === 3 && beatStep >= (combat && section === 2 ? 6 : combat ? 4 : 6);
    if(combat){
      if(beatStep === 0 || section === 1 && beatStep === 3 || section === 2 && beatStep === 6) this.musicTone(138, time, 0.15, 'kick', beatStep === 0 ? 0.15 : 0.10);
      if(beatStep === 0 && bar % 4 === 0) this.musicTone(MUSIC_TIMPANI_HZ, time, 0.34, 'kick', 0.13);
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
    if(this.musicBarRole === 'landing') this.scheduleLeitmotif(time, beatStep, chord, stepSeconds, 'brass', boss ? 0.066 : 0.058);
    if(!combat && (bar === 7 || bar === 15) && beatStep === 7) return;
    if(combat || bar > 0) this.scheduleSectionAccent(time, bar, beatStep, cycleIndex, combat);
    if(combat || bar >= 8) this.scheduleDrumFill(time, bar, beatStep, stepSeconds, combat ? 1 : 0.6);
    this.scheduleCycleTurnaround(time, bar, beatStep, stepSeconds, cycleIndex, combat);
    if(!combat) this.scheduleFieldStep(time, bar, beatStep, phraseBar, shift, cycleIndex, breath);
    const cadence=false;
    const degree = !combat || this.musicBarRole === 'landing' ? null : MUSIC_WAVE_THEME[bar % MUSIC_WAVE_THEME.length][beatStep];
    if(degree !== null && !breath){
      const keysFirst = (section === 0 || phraseBar === 2) !== (cycleIndex % 2 === 1);
      const voice = combat ? (section === 2 && phraseBar === 2 ? 'fm' : 'brass') : (cadence ? 'reed' : keysFirst ? 'fmkeys' : 'pluck');
      const duration=combat ? (beatStep===0 ? 0.25 : beatStep%2 ? 0.11 : 0.15) : cadence ? this.musicStepSeconds()*1.65 : voice==='reed' ? 0.28 : voice==='fmkeys' ? 0.24 : beatStep%2 ? 0.13 : 0.20;
      const accent=beatStep===0 ? 1 : beatStep%2 ? 0.78 : 0.90;
      const phraseGain=phraseBar===3 ? 0.82 : section===1 ? 0.94 : 1;
      const leadPitch = 38 + shift + 12 + (boss && degree % 12 === 2 ? degree - 1 : degree);
      this.musicTone(midiToFrequency(leadPitch), time + (Math.random() - 0.5) * 0.008, duration, voice, (combat ? 0.11 : 0.095)*accent*phraseGain*(0.92 + Math.random()*0.16));
      if(combat && (boss || section > 0) && (beatStep === 0 || beatStep === 4)) this.musicTone(midiToFrequency(leadPitch - 12), time, duration, 'brass', 0.05 * accent, true);
      if(combat && (boss || section > 0)) this.musicTone(midiToFrequency(musicDiatonicAbove(leadPitch, 38 + shift)), time + 0.003, duration, 'brass', 0.042 * accent, true);
      if(combat && (boss || section === 2)){
        this.popTone(midiToFrequency(leadPitch), time, duration, 'harmony', 0.026 * accent, true);
        this.popTone(midiToFrequency(leadPitch + 12), time + 0.002, duration * 0.8, 'bell', 0.03 * accent, true);
      }
    }
    // MUSIC-BIP-01 (1.8.41): a very quiet high pluck answers the lead in its rests, an octave above the note it follows, on alternating rests only, so the theme keeps its breaths and gains small bips between phrases.
    const echoedDegree = combat && !breath && degree === null && this.musicBarRole !== 'landing' && beatStep > 0 && (bar + beatStep) % 2 === 1 ? MUSIC_WAVE_THEME[bar % MUSIC_WAVE_THEME.length][beatStep - 1] : null;
    if(echoedDegree !== null) this.musicTone(midiToFrequency(38 + shift + 24 + echoedDegree), time + 0.004, 0.07, 'pluck', 0.02 * (0.6 + 0.4 * intensity), true);
  }
  // MUSIC-ATTRACT-02 (1.7.104) — see HISTORY.md § [1.7.104]
  popTone(freq, time, duration, kind, peak, optional=false){
    if(!this.unlocked || isMuted || audioMusicVolume <= 0 || !freq) return;
    const spec = POP_VOICES[kind], expressive = spec.vibrato && duration >= 0.3, oscillatorCount = spec.detunes.length + (spec.sub || spec.fmRatio ? 1 : 0) + (expressive ? 2 : 0), endTime = time + duration, releaseEnd = endTime + spec.release;
    // MUSIC-LEAD-02 (1.8.22): accompaniment steps back a fifth under a sounding lead note so the melody always cuts through.
    if(expressive) this.leadSoundingUntil = Math.max(this.leadSoundingUntil || 0, endTime);
    else if(MUSIC_DUCKED_KINDS.has(kind) && time < (this.leadSoundingUntil || 0)) peak *= MUSIC_LEAD_DUCK;
    if(!this.reserveMusicVoice(time, duration + spec.release, oscillatorCount, optional)) return;
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), sources = [];
    filter.type = 'lowpass'; filter.Q.value = spec.q;
    filter.frequency.setValueAtTime(spec.cutoffStart, time);
    filter.frequency.exponentialRampToValueAtTime(spec.cutoffEnd, time + Math.max(0.02, duration * spec.cutoffTime));
    const sustainTime = time + Math.max(spec.attack + 0.01, duration * spec.decay);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + spec.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * spec.sustain), sustainTime);
    const swells = expressive && duration >= 0.6;
    gain.gain.setValueAtTime(Math.max(0.0001, peak * spec.sustain), swells ? sustainTime : Math.max(sustainTime, endTime));
    if(swells) gain.gain.linearRampToValueAtTime(peak * spec.sustain * MUSIC_LEAD_SWELL, endTime); // held notes bloom toward their end like a sung phrase
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    // MUSIC-LEAD-01 (1.8.22): sustained lead notes enter with a quick scoop from slightly flat and gain a vibrato that arrives after a short delay, the way a console lead is played.
    const vibratoLfo = expressive ? this.ctx.createOscillator() : null, vibratoDepth = expressive ? this.ctx.createGain() : null;
    if(expressive){
      vibratoLfo.type = 'sine'; vibratoLfo.frequency.setValueAtTime(spec.vibrato.rate, time);
      vibratoDepth.gain.setValueAtTime(0, time);
      vibratoDepth.gain.linearRampToValueAtTime(spec.vibrato.cents, time + spec.vibrato.delay + 0.2);
      vibratoLfo.connect(vibratoDepth); sources.push(vibratoLfo);
    }
    if(expressive){ // a quiet triangle an octave above gives the lead the bright shimmer of a console pulse-and-triangle pair
      const octave = this.ctx.createOscillator(), octaveGain = this.ctx.createGain();
      octave.type = 'triangle'; octave.frequency.setValueAtTime(freq * 2, time); octaveGain.gain.value = MUSIC_LEAD_OCTAVE_LEVEL;
      octave.connect(octaveGain); octaveGain.connect(filter); sources.push(octave);
    }
    for(const detune of spec.detunes){
      const oscillator = this.ctx.createOscillator();
      oscillator.type = spec.wave; oscillator.frequency.setValueAtTime(freq, time);
      if(expressive){
        oscillator.detune.setValueAtTime(detune - 24, time); oscillator.detune.linearRampToValueAtTime(detune, time + 0.035);
        vibratoDepth.connect(oscillator.detune);
      } else oscillator.detune.value = detune;
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
    sources[0].onended = () => { for(const source of sources) source.disconnect(); if(vibratoDepth) vibratoDepth.disconnect(); filter.disconnect(); gain.disconnect(); if(tail !== gain) tail.disconnect(); };
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
    const section = bar < 4 ? 0 : bar < 8 ? 1 : bar < 12 ? 2 : bar < 16 ? 3 : 4, level = attractEasedLevel(section, bar, beatStep);
    const chord = MUSIC_ATTRACT_CHORDS[section === 3 ? MUSIC_ATTRACT_BUILD_CHORDS[bar - 12] : section === 4 ? Math.floor(bar / 2) % MUSIC_ATTRACT_CHORDS.length : Math.floor(bar / 4) % MUSIC_ATTRACT_CHORDS.length];
    const chordRoot = chord.root + shift, tonic = MUSIC_ATTRACT_TONIC + shift, halfStep = stepSeconds / 2, isIntro = section === 0, isBuild = section === 3, isChorus = section === 4;
    // Leave one eighth-note of space before the main landing.
    if(bar === 15 && beatStep === 7) return;
    const restBar = (bar === 3 || bar === 11) && beatStep >= 5;
    this.scheduleAttractIntroBed(time, bar, beatStep, stepSeconds, chord, chordRoot, shift);
    if(beatStep === 0 && bar % 4 === 0 && section >= 1 && section < 3){
      this.popTone(midiToFrequency(chordRoot), time, stepSeconds * MUSIC_STEPS_PER_BAR * 3.96, 'pad', 0.02 * level, true);
      this.popTone(midiToFrequency(chordRoot + 7), time, stepSeconds * MUSIC_STEPS_PER_BAR * 3.96, 'pad', 0.014 * level, true);
      if(bar > 0) this.musicTone(MUSIC_TIMPANI_HZ, time, 0.3, 'kick', 0.1 * level);
    }
    const drop = beatStep === 0 && (bar === 4 || bar === 16);
    if(drop) this.musicBassDrop(time, chordRoot, stepSeconds, bar === 16 ? 0.8 : 0.4);
    if(beatStep === 0 && bar % 2 === 0 && section >= 1){
      [chord.triad[0], chord.triad[2]].forEach(interval => this.popTone(midiToFrequency(chordRoot + 24 + interval), time, stepSeconds * MUSIC_STEPS_PER_BAR * 1.96, 'pad', 0.03 * level, true));
    }
    const rollBar = bar === 15, kickOut = rollBar && beatStep >= 4;
    if(bar >= 4 && !drop && !kickOut && (isChorus || isBuild ? beatStep % 2 === 0 : beatStep === 0 || beatStep === 4)) this.musicTone(138, time, 0.14, 'kick', (beatStep === 0 ? 0.11 : 0.085) * level);
    if(isChorus && beatStep === 7 && bar % 2 === 1) this.musicTone(138, time, 0.12, 'kick', 0.07);
    const backbeat = (beatStep === 2 || beatStep === 6) && bar >= 4 && !(bar === 14 || rollBar);
    if(backbeat){ this.popSnare(time, level * 0.9); }
    if(bar === 13 && (beatStep === 4 || beatStep === 7)) this.popSnare(time, 0.7);
    if(bar === 14 || rollBar){
      const progress = ((bar - 14) * MUSIC_STEPS_PER_BAR + beatStep) / (2 * MUSIC_STEPS_PER_BAR);
      this.popSnare(time, 0.45 + 0.55 * progress);
      this.popSnare(time + halfStep, 0.4 + 0.6 * progress);
    }
    if(bar >= 2 && !restBar && (isChorus || isBuild || beatStep % 2 === 1)) this.musicPercussion(time, false, (isIntro ? 0.3 : 1.1) * level * (beatStep % 2 ? 1.15 : 0.8));
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
    if(bar >= 8 && !restBar && (section >= 3 || beatStep % 2 === 0)){
      const arpIndex = MUSIC_ATTRACT_ARP[beatStep];
      this.popTone(midiToFrequency(chordRoot + 12 + chord.triad[arpIndex] + (beatStep >= 4 ? 12 : 0)), time, stepSeconds * 0.5, 'pluck', (isChorus ? 0.016 : 0.022) * level, true);
    }
    if(section >= 2 && !restBar && (beatStep === 0 || beatStep === 3 || beatStep === 6)){
      this.popTone(midiToFrequency(chordRoot + 12 + chord.triad[1]), time, halfStep * 1.6, 'pluck', 0.02 * level, true);
      this.popTone(midiToFrequency(chordRoot + 12 + chord.triad[2]), time + 0.003, halfStep * 1.6, 'pluck', 0.017 * level, true);
    }
    if(beatStep === 7 && bar % 2 === 1 && bar >= 4 && !kickOut){
      const nextChord = MUSIC_ATTRACT_CHORDS[(Math.floor(bar / 2) + 1) % MUSIC_ATTRACT_CHORDS.length];
      this.popTone(midiToFrequency(nextChord.root + shift + 12), time + halfStep, halfStep * 1.5, 'bass', 0.06 * level);
    }
    if(isChorus && !kickOut) this.popTone(midiToFrequency(chordRoot + 12 + (beatStep % 2 ? 12 : 0)), time + halfStep, halfStep * 0.8, 'bass', 0.034 * level, true);
    const motifRow = bar % 4 + ((section === 2 || section === 4 && bar >= 20) ? 4 : 0);
    const degree = restBar ? null : MUSIC_COMBAT_MELODY[motifRow][beatStep];
    if(section >= 2 && section !== 3 && !restBar && !kickOut && (beatStep === 2 || beatStep === 6)){
      const counterTone = chord.triad[(bar + (beatStep >> 2)) % chord.triad.length];
      this.popTone(midiToFrequency(chordRoot + 24 + counterTone), time, stepSeconds * 1.7, 'oboe', 0.036 * level, true);
    }
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
      const pitch = fitToChord(tonic + 24 + MUSIC_COMBAT_INTERVALS[degree]), held = beatStep === 0 ? stepSeconds * 1.7 : beatStep % 2 ? stepSeconds * 0.55 : stepSeconds * 0.85;
      if(section <= 1) this.popTone(midiToFrequency(pitch - 12), time, held * 1.4, 'warm', 0.09 * level);
      else {
        this.popTone(midiToFrequency(pitch - 12), time, held, 'lead', (isChorus ? 0.058 : 0.04) * level);
        if(isChorus) this.popTone(midiToFrequency(fitToChord(tonic + 12 + MUSIC_COMBAT_INTERVALS[Math.min(9, degree + 2)])), time, held, 'harmony', 0.03, true);
      }
    }
  }
  // MUSIC-INTRO-BED-01 (1.8.58): the first four bars of the start screen had only the low melody, so the song opened thin. They now open on a soft
  // swelling chord pad (bars 0 and 2) with a harp-like rising arpeggio from bar 1, which sets the place before the drums arrive (Diablo's composer gave
  // every new environment at least 20 seconds to establish itself). The last bar of the cycle lays a quiet tonic chord under the final beats so the loud
  // chorus hands over to the quiet intro instead of stopping dead.
  scheduleAttractIntroBed(time, bar, beatStep, stepSeconds, chord, chordRoot, shift){
    const barSeconds = stepSeconds * MUSIC_STEPS_PER_BAR;
    if(bar < 4){
      if(beatStep === 0 && bar % 2 === 0) chord.triad.forEach((interval, index) => this.popTone(midiToFrequency(chordRoot + 12 + interval), time, barSeconds * 1.96, 'pad', (index === 0 ? 0.022 : 0.015) * (bar === 0 ? 0.75 : 1), true));
      if(bar >= 1 && beatStep % 2 === 0 && !(bar === 3 && beatStep >= 4)){
        const rise = [0, 1, 2, 1][beatStep >> 1], octave = beatStep === 4 ? 12 : 0;
        this.popTone(midiToFrequency(chordRoot + 24 + chord.triad[rise] + octave), time, stepSeconds * 1.6, 'pluck', 0.012 + 0.003 * bar, true);
      }
    }
    if(bar === 23 && beatStep === 4){
      const homeRoot = MUSIC_ATTRACT_CHORDS[0].root + shift;
      [0, 7, 12].forEach(interval => this.popTone(midiToFrequency(homeRoot + 12 + interval), time, barSeconds * 1.5, 'pad', 0.016, true));
    }
  }
  // MUSIC-LAYERS-01 (1.7.105) — see HISTORY.md § [1.7.105]: the wave and boss themes gain a chord pad from the second section, a layered snare on the backbeat, and a noise riser through the last two bars of each section, so the 24 bars build instead of staying level
  scheduleCombatLayers(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath){
    if(beatStep === 0 && bar % 2 === 0 && bar > 0 && (section > 0 || boss)){
      const tones = musicChordTones(baseChord), padGain = (section === 2 || boss ? 0.032 : 0.024);
      this.popTone(midiToFrequency(chord + 24), time, stepSeconds * 15.5, 'pad', padGain, true);
      this.popTone(midiToFrequency(chord + 24 + tones[1]), time, stepSeconds * 15.5, 'pad', padGain * 0.8, true);
      this.popTone(midiToFrequency(chord + 12 + 7), time, stepSeconds * 15.5, 'pad', padGain * 0.6, true);
    }
    if(beatStep === 4 && !breath && (section > 0 || boss)) this.popSnare(time, boss ? 0.7 : 0.5);
    if(beatStep === 0 && bar === MUSIC_BARS - 2) this.popRiser(time, stepSeconds * MUSIC_STEPS_PER_BAR * 2, boss ? 0.6 : 0.35); // COMBAT-RISER-01 (1.8.43): one quieter sweep per 24-bar cycle, into the key change, instead of one every 8 bars
    if(beatStep === 0 && bar > 0 && bar % 8 === 0 && (section > 0 || boss)) this.scheduleHeroicPhraseHit(time, chord, boss, stepSeconds);
    if(bar % 8 === 4 && (section > 0 || boss) && !breath) this.scheduleLeitmotif(time, beatStep, chord, stepSeconds, 'brass', boss ? 0.052 : 0.044);
    this.scheduleCombatDrive(time, bar, beatStep, section, baseChord, chord, boss, stepSeconds, breath);
  }
  // MUSIC-LEITMOTIF-01 (1.8.20): one rising call (root, fifth, octave, ninth, octave) returns in the idle score as an oboe and in the wave and boss scores as brass, so the two scores share a theme.
  scheduleLeitmotif(time, beatStep, root, stepSeconds, voice, gain){
    for(const [step, interval, length] of MUSIC_LEITMOTIF){
      if(step !== beatStep) continue;
      if(voice === 'brass') this.musicTone(midiToFrequency(root + 12 + interval), time, stepSeconds * length, 'brass', gain, true);
      else this.popTone(midiToFrequency(root + 12 + interval), time, stepSeconds * length, voice, gain, true);
      this.popTone(midiToFrequency(root + 24 + interval), time + 0.004, stepSeconds * length, 'bell', gain * 0.35, true);
    }
  }
  // MUSIC-HEROIC-01 (1.8.19): every eighth bar of the wave and boss themes lands as a full orchestral hit, a crash, a timpani stroke and a held brass power chord (root, fifth, octave) that rings for two bars.
  scheduleHeroicPhraseHit(time, chord, boss, stepSeconds){
    this.musicCrash(time, boss ? 1 : 0.75);
    this.musicTone(MUSIC_TIMPANI_HZ, time, 0.42, 'kick', boss ? 0.16 : 0.13);
    const hold = stepSeconds * MUSIC_STEPS_PER_BAR * 2;
    for(const [interval, gain] of [[12, 0.055], [19, 0.048], [24, 0.042]]) this.musicTone(midiToFrequency(chord + interval), time, hold, 'brass', gain * (boss ? 1.15 : 1), true);
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
    const tonic = 38 + shift + 24, level = boss ? 1.25 : 1, dropTime = time + MUSIC_STING_DROP_STEP * stepSeconds;
    for(const [step, lowerOffset, upperOffset, gain] of MUSIC_STING_PICKUPS){
      const hitTime = time + step * stepSeconds;
      this.musicTone(midiToFrequency(tonic + lowerOffset), hitTime, stepSeconds * 1.3, 'brass', gain * level);
      this.musicTone(midiToFrequency(tonic + upperOffset), hitTime, stepSeconds * 1.3, 'brass', gain * 0.8 * level);
      this.musicTone(MUSIC_TIMPANI_HZ, hitTime, 0.3, 'kick', 0.1 * level);
    }
    this.popRiser(time + stepSeconds * 4.5, stepSeconds * (MUSIC_STING_DROP_STEP - 4.5), 0.35 * level);
    this.musicBassDrop(dropTime, 38 + shift, stepSeconds, 1.25 * level);
    this.musicTone(MUSIC_TIMPANI_HZ, dropTime, 0.5, 'kick', 0.17 * level);
    this.musicCrash(dropTime, level);
    for(const interval of [0, 7, 12]) this.musicTone(midiToFrequency(tonic + interval), dropTime, stepSeconds * 6, 'brass', 0.075 * level);
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
    const majorFill = bar % 8 === 7;
    if(!(majorFill || level >= 1 && bar % 4 === 3) || beatStep < (majorFill ? 4 : 6)) return;
    for(let half = 0; half < 2; half++){
      const hitIndex = (beatStep - 4) * 2 + half;
      this.musicTone(MUSIC_TOM_PITCHES[Math.min(MUSIC_TOM_PITCHES.length - 1, Math.floor(hitIndex / 2))], time + half * stepSeconds / 2, 0.11, 'kick', (majorFill ? 0.1 : 0.07) * level);
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
    if(beatStep === 0 && bar % 4 === 0 && !buildUp && !drop) this.musicTone(MUSIC_TIMPANI_HZ, time, 0.34, 'kick', 0.08);
    if(beatStep === 0 && bar % 4 === 0 && arrangement !== 1 && arrangement !== 2) this.musicTone(midiToFrequency(root + 19), time, stepSeconds*MUSIC_STEPS_PER_BAR*3.9, 'triangle', 0.014, true);
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
    if(!buildUp && !breath && bar % 8 === 4) this.scheduleLeitmotif(time, beatStep, root, stepSeconds, 'oboe', 0.03);
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
  lastSfxVariant = {}; sfxVariantPitch = 1; sfxVariantNoise = 1; buildMelodyIndex = 0;
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
      case 'loot_drop': {
        const noteCount = Math.max(2, Math.min(4, intensity || 2)), rootPitch = 79 + (this.musicShift || 0);
        for(let note = 0; note < noteCount; note++){ const noteFrequency = midiToFrequency(rootPitch + [0, 4, 7, 12][note]); this.tone(noteFrequency,0.16,'sine',undefined,eventPan,true,note*0.07,true,true,0.07); this.tone(noteFrequency*2,0.12,'triangle',undefined,eventPan,false,note*0.07+0.01,true,true,0.025); }
        break;
      }
      case 'build_note': {
        const notePitch = BUILD_MELODY_BASE_NOTE + (this.musicShift || 0) + BUILD_MELODY_STEPS[this.buildMelodyIndex % BUILD_MELODY_STEPS.length];
        this.buildMelodyIndex = (this.buildMelodyIndex + 1) % BUILD_MELODY_STEPS.length;
        const noteFrequency = midiToFrequency(notePitch);
        this.tone(noteFrequency,0.07,'triangle',undefined,0,false,0,false,true,0.06); this.tone(noteFrequency*2,0.09,'sine',undefined,0,false,0.014,false,true,0.028); break;
      }
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
/* =========================================================
   SOUND EFFECT DISPATCH AND AUDIO UNLOCK
   ========================================================= */
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
function tryAutoplayAudio(){ // AUTOPLAY-APP-01 (1.8.11) — see CHANGELOG.md § [1.8.11]: installed apps allow sound without a click, so their music starts with the loading screen
  audioEngine.prewarm();
  const installedApp = window.STICKTD_PLATFORM === 'desktop-app' || window.STICKTD_PLATFORM === 'android-app';
  if(!audioEngine.ctx || !(installedApp || (navigator.userActivation && navigator.userActivation.hasBeenActive))) return;
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
