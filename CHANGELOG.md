# Changelog

## [1.0.207] - 2026-09-08
- **Replaced the oversized 321×321 favicon with a properly-sized 32×32 version, plus a
  `shortcut icon` fallback.** The original data actually decoded to a valid PNG (verified
  directly — proper signature, correct dimensions), so the underlying image was never corrupted;
  321×321 is just unusually large for a favicon and some browsers are inconsistent about scaling
  an oversized data-URI icon down cleanly. Standard favicon sizing plus a second `rel` for older
  browser compatibility maximizes the chance it actually renders. Also worth noting for anyone
  still not seeing it live: browsers cache favicons aggressively per-domain — a normal refresh
  often isn't enough, and the live GitHub Pages site won't show it at all until this file is
  actually uploaded there.
## [1.0.206] - 2026-09-08
- **Added real master-bus production processing — the last major lever for "produced" sound
  quality that hadn't been touched.** Signal chain was `source → master gain → compressor →
  destination`; now `source → master gain → 350 Hz boxiness cut → soft-clip saturation →
  compressor → destination`.
  - **Master EQ cut**: a gentle peaking filter at 350 Hz (Q 1.5, -4 dB). That band is where
    overlapping mid-range content — impacts, most of this engine's oscillator/noise sounds —
    accumulates into mud when several play at once; carving a shallow dip there gives sub-bass
    punch and upper-mid transient clarity room to actually cut through instead of the mix
    blurring into one crowded register.
  - **Soft-clip saturation**: a real `WaveShaperNode` with a hyperbolic-tangent transfer curve
    (`tanh(k·x)`, k=1.5) — the standard analog-style saturation curve. This is what makes a mix
    feel glued and intentional rather than just loud: it rounds off peaks smoothly instead of
    squaring them off the way hard digital clipping does, adding subtle warmth on the loudest
    simultaneous moments (swarm deaths, explosions) without coloring quiet sounds.
  - Both stages sit in the existing signal path everything already flows through (`this.master`),
    so no other code needed to change — reverb, mute, and every `tone()`/`noise()` call
    automatically pick up the new processing.
## [1.0.205] - 2026-09-08
- **Web Audio clock scheduling replaces `setTimeout()` for all three multi-note sounds**
  (`levelup`, `cast_cleric`, `ui_buy`). `tone()` gained an optional `delay` parameter, scheduled
  against `audioCtx.currentTime` up front rather than firing a second `tone()` call from a JS
  timer later — `setTimeout` is the wrong clock for tight audio timing, subject to JS event-loop
  jitter/throttling (background tabs, heavy simulation frames) that the audio hardware clock isn't.
- **Added a real global voice budget** — a genuine CPU/audio-thread safeguard, not a mix-quality
  nicety. Previously nothing stopped a 40-enemy swarm death or a cluster of simultaneous
  splash-damage hits from each independently spawning full oscillator/buffer/filter graphs with
  zero coordination. New `reserveVoiceSlot()` tracks active-voice expiry timestamps and caps
  concurrent voices at 28; wired directly into `tone()`/`noise()` themselves (the two lowest-level
  primitives everything in the engine funnels through, including `playImpactSound()` which
  bypasses the `play()` dispatcher entirely) — so this protects the whole engine without needing
  per-call-site changes anywhere else in the file. Once the budget is full, a new sound call
  simply produces no sound rather than piling on further voices.
- **Critical UI/system sounds bypass the voice budget entirely** — new `force` parameter on
  `tone()`, applied to `wave`, `lose`, `levelup`, `ui_buy`, and `ui_deny`. These should never be
  silently dropped just because a chaotic battle moment happened to fill the budget with combat
  noise; routine gameplay sounds (impacts, gore deaths, standard attacks) remain correctly
  subject to the cap, which is exactly the category the budget is meant to manage.
## [1.0.204] - 2026-09-08
- **Fixed a real, confirmed audio graph bug: reverb was never actually reverberating anything.**
  Verified against the live code (not assumed from external analysis): every `reverbSend` call
  site connected the dry source straight into `reverbGain`, completely bypassing `reverbNode` (the
  actual `ConvolverNode`) — the convolver had zero input the whole time, despite its impulse
  response being generated correctly. Separately, `reverbGain` connected directly to `compressor`,
  bypassing `this.master` entirely — since mute works by zeroing `master.gain`, any sound using
  `reverbSend` (critical hits, Mage, explosions) could still be faintly audible while "muted."
  Both fixed: the wet-send call sites in `tone()`/`noise()` now connect into `reverbNode` itself,
  and `reverbGain` now routes through `master` like every other sound.
- **Fixed a real early-boot fragility bug.** The diagnostic `window.error` handler is installed
  inside `<head>`, ~400 lines before `<body>` is even parsed — an error thrown early enough in
  boot meant `document.body` was still `null`, so the handler's own `.appendChild` would throw,
  silently swallowing both the original error and the diagnostic meant to report it. Now falls
  back to `document.documentElement` when `body` isn't available yet.
- **`noise()` no longer allocates and fills a brand-new `AudioBuffer` on every single call.**
  `noise()` fires extremely often (gore, impacts, explosions, UI) and was generating fresh
  sample-by-sample white noise every time — real repeated allocation/CPU work for content that
  doesn't need to be unique per call. Now generates one shared 2-second noise buffer once, lazily,
  and each call plays a random-offset slice of it (still audibly different call to call — the
  random offset changes, not the underlying data) with the original linear fade-out replicated via
  a `GainNode` envelope instead of baked into per-call buffer data. No audible behavior change,
  real performance win.
- **Added lightweight `localStorage` persistence for UI preferences** — graphics quality, mute,
  and the 18+ gore toggle now survive a page reload, separate from and without touching the
  existing file-based full game save system. Wrapped in try/catch throughout since storage can
  throw in restrictive contexts (private browsing, disabled storage) — persistence failing never
  breaks the game, it just silently doesn't persist that session. All three real toggle handlers
  (`gfxHighRadio`/`gfxLowRadio`/`settingsMuteToggle`/`settingsGoreToggle`/`goreToggle`) now save on
  change, and the actual DOM controls (not just the JS variables) sync to loaded values at boot.
## [1.0.202] - 2026-09-07
- **Attack speed display now shows two decimals instead of one** (`inspSpeedVal`), so gradual
  per-DEX-point increases (the underlying formula was already granular — +8%/point, diminishing
  — only the display was coarse) are actually visible rather than rounding several consecutive
  DEX points to the same displayed number.
- **Added Snap Caster — a new DEX-triggered Mage evolution** (`dex: {target:'SNAPCASTER',
  threshold:12}`), trading Mage's "rare and massive" identity for real firing frequency: cooldown
  1650/1450/1250ms — a big jump down from Mage's 4860/4320/3780, but still clearly slower than
  Archer's 740/630/520, matching "still slower than Archer" exactly. Damage scaled down to match
  (78/118/168) and its own signature: chain lightning procs at 35% per hit (vs. base Mage's 15%)
  and skewed heavily toward the shock+chain branch specifically rather than an even three-way
  split with burn/freeze.
- Wiring notes for future evolutions of this shape: `CLASS_ARCHETYPE.SNAPCASTER` is set to
  `'ARCHER'` (DEX-scaled damage, matching the established precedent that an evolution's ongoing
  stat-scaling archetype is independent of its trigger stat — Bomber is INT-triggered but stays
  ARCHER-archetype the same way). Because `CLASS_ARCHETYPE` also feeds the gore-archetype fallback,
  that would have given Snap Caster kills Archer's puncture-mark treatment despite still being
  visually a magic bolt — added an explicit override in `resolveGoreArchetype()` (same shape as
  the existing Bomber/Cleric overrides) so its kills correctly read as Mage's cone. Also extended
  every exact `type === 'MAGE'` check needed for correct rendering/behavior: `isMagicMissile`/
  projectile color, the staff-angle/charge-glow render logic, `drawStickman`'s pose branch, and
  added `JOB_BUILD`/skin-color table entries (a distinct electric-yellow tint, not a reused violet)
  so it doesn't just render as an undifferentiated Mage. Left Mage-specific target-lock hysteresis
  and the ±40% damage-variance width as Mage-only — Snap Caster's cooldown is too fast to need the
  anti-snap treatment, and its identity is speed/consistency, not variance.
## [1.0.201] - 2026-09-07
- **Fixed bones/skulls never actually being permanent — a real latent bug, not just a fade-timing
  preference.** Their decal render branch used the shared `alpha` variable (which includes the
  85%-lifespan fadeOut curve), but their `rgb` object never had an `.a` property, so
  `alpha = rgb.a * fadeOut` evaluated to `NaN`. Canvas silently ignores an invalid `globalAlpha`
  value, meaning bones/skulls were actually rendering at whatever opacity happened to be left over
  from the previous draw call — undefined behavior, not a controlled fade. Fixed by hardcoding
  `globalAlpha = 1` for this decal type explicitly, and added the missing `.a:1` to the underlying
  rgb objects for correctness. They now render at full, consistent opacity for their entire
  lifespan, never fading.
- **Cleric's curse kills now get their own dedicated death treatment — a fine "evaporation" mist —
  instead of silently falling through to the generic melee default.** Cleric isn't mapped in
  `CLASS_ARCHETYPE` at all, so `resolveGoreArchetype()` was defaulting every Cleric-caused kill to
  `'WARRIOR'`, giving a curse-dissolved undead the same cut-and-arc treatment as an actual sword
  strike — despite Cleric never physically touching anything. New `'HOLY'` archetype, grounded in
  BPA's own glossary definition of "Misting" (blood atomized to a fine spray by the application of
  force) — here that force is the curse itself, not a weapon. Rendered as overwhelmingly fine mist
  using the existing `sizeMin` fine-particle capability, almost no gibs, no directional cast-off at
  all (nothing here has a swing or impact vector to align with), with a pale golden-white holy tint
  mixed into the enemy's own blood color rather than replacing it — so a species' identity (still
  green for undead/insects, still red for standard flesh) stays legible underneath the overlay.
## [1.0.200] - 2026-09-07
- **Full physics-book review: added inelastic map-edge bouncing and rotational damping for gibs,
  closing a gap confirmed open since an early review.** Physics for JS Games ch.13 gives the real
  formula for a non-perfectly-elastic wall bounce: the velocity component perpendicular to the wall
  is scaled by a restitution factor (0-1) on impact rather than simply negated. Previously gibs had
  zero boundary collision at all — confirmed months ago and left as a known gap since most marks are
  placed by scripted formula rather than true flight. Fixed now specifically for gibs (the one
  particle type with enough visual weight for a bounce to actually read): they bounce off the map
  edge with a moderate 0.42 restitution factor instead of flying straight through it. Also added
  rotational damping (`p.rotSpeed *= p.friction`, same coefficient already decaying linear
  velocity) — previously a gib's tumble rate was constant forever, spinning at full speed even
  once essentially stopped moving, which was physically inconsistent with its own decelerating
  linear velocity right next to it.
## [1.0.199] - 2026-09-07
- **Map expansion now takes longer, per request.** `grantFreeExpansion()`'s cadence stretched from
  every 3 waves to every 4 (~33% longer between extensions), keeping the same guaranteed early-game
  unlocks (waves 1-4) so the opening still feels generous.
- **Found and fixed a real balance bug while investigating wave pacing: waves 45-99 in the fixed
  wave table were a repeating block with byte-identical enemy counts every ~7-wave cycle — zero
  difficulty growth across more than half the fixed wave range.** Confirmed waves 1-44 scale
  properly (counts genuinely increment wave to wave); the growth flatlines completely starting
  exactly at wave 45. The wave-type cadences (Boss every 10, Trick every 7-offset-by-1, etc.)
  overlap irregularly rather than forming one clean repeating unit, so hand-restructuring the raw
  literal data risked scrambling which wave gets which flavor. Fixed safely instead: enemy counts
  now scale smoothly with wave number for any wave in that flat range, applied at spawn-queue
  build time rather than to the stored data — every wave's composition, flavor, and label stays
  exactly as originally authored; only how many of each enemy actually spawn grows, from the
  original count at wave 45 up to +65% by wave 99. Wave 100 (the actual milestone Boss finale) and
  every wave before 45 are completely unaffected.
## [1.0.198] - 2026-09-07
- **Confirmed ants (SWARM) already have distinct blood** — `getBloodProfile()` already routed
  SWARM/SPLITTER/SPLITMINI to a bright-green "insect hemolymph" palette, not standard flesh red.
  No change needed there; verified before assuming it needed building.
- **Zombies now bleed a distinct sickly green, separate from every other undead's shared dark
  necrotic red.** Zombie is still flagged `isUndead` for Cleric-targeting/curse purposes — this is
  purely a blood-color carve-out, checked before the generic isUndead fallback so Wraith, Skeleton,
  and Reaper keep their existing coagulated dark-red look while Zombie gets its own genre-classic
  ooze.
- **Added Monarch (🦋) — the fastest enemy in the game at speed 112**, beating the previous fastest
  (Wraith, 94). Low HP (33) and modest bounty (6), matching a fast-fragile role. Purple blood
  (`bright:'#9b5fc0'`), its own distinct profile rather than borrowed from anything else in the
  roster. Added to `generateSwarmWave()` — the "🐜 SWARM SURGE" wave type already emphasizes fast,
  numerous, fragile enemies (Swarm, Wolf, Runner), so a fast fragile butterfly fits the existing
  theme rather than needing a new wave category.
## [1.0.197] - 2026-09-07
- **Added a distinct visceral death sound (`gore_death`), separated out from the generic `death`
  sound rather than modifying it directly.** Caught a real scoping issue before shipping: `death`
  is a shared sound also used for barricades breaking and scenery (trees/rocks) being cleared —
  making that one wetter/more visceral would have made a barricade sound like a splat too. New
  case instead: layered noise body (the "splat"), a low falling tone underneath for weight, and a
  brief bandpass crack on top for texture — scaled by `goreScale` (already driving the rest of the
  death event), so a Boss's death sounds a bit heavier than a Grunt's. Wired into the actual enemy
  `die()` call site in place of the old generic sound.
- **Added a footstep-in-blood sound, grounded directly in a specific BPA passage (ch.5): "stepping
  into a pool of blood can cause spatters on the inner aspects of footwear... blood is splashed
  from one shoe to the other."** That's a real physical contact event the book treats as
  significant, not a silent non-event — new `foot_squelch` fires the instant an enemy's foot first
  contacts a fresh pool (the existing footprint-pickup trigger point), scaled a touch wetter for a
  bigger puddle via the same size-bonus already driving how many steps the trail lasts.
- Extended `AudioEngine.play()` and the `playSound()` wrapper to accept optional `worldX`/
  `intensity` params, routed through the stereo panning and reverb-send infrastructure added in
  1.0.192 — both new sounds use real spatial positioning, not dead-center like the untouched
  legacy cases.
## [1.0.196] - 2026-09-07
- **Fixed Mage whiffing shots against moving targets — a real projectile-tunneling bug, not a
  targeting/aim issue.** Traced it precisely rather than guess: the lead-prediction aim angle was
  already correct (confirmed in 1.0.181's work — `fireProjectile()` reuses the exact same angle
  computed in `update()`), and collision detection only ever tested the projectile's exact current
  position each frame against nearby enemies. Mage's `projectileSpeed` is 1400-1600 units/sec — 2.5
  to 4x every other tower in the game (Archer 320-400, Gatling 560-640, Bomber 260-300) — so at a
  typical frame step it can move further in one tick than a target enemy's own radius, letting the
  shot skip clean past a MOVING target between one position check and the next. A stationary target
  doesn't have this problem, since the single-point check has a far better chance of landing inside
  a radius that isn't also moving — matching exactly what was reported ("missed until the enemy
  stopped"). Fixed with proper swept collision: new `pointSegmentDist2()` checks distance from each
  candidate enemy to the LINE SEGMENT the projectile traveled this frame, not just its new endpoint,
  and the enemy-search radius now widens to cover that whole segment length. Applies to every
  projectile in the game, not just Mage's — any sufficiently fast shot was theoretically exposed to
  the same tunneling risk, just far less noticeably at normal tower speeds.
## [1.0.195] - 2026-09-07
- **Fixed a real bug found while modularizing "the stone guy drops rocks": Boulder was splitting
  into two 🦠 SPLITMINI microbes on death, complete with insect-green blood, instead of its own
  rock fragments.** `spawnSplitChildren()` hardcoded `'SPLITMINI'` regardless of which enemy type
  actually split — even though Boulder's own in-game description always said "splits on death like
  a heavier Splitter," implying its own distinct fragment, not a borrowed one. Added a proper
  `ROCKLET` enemy type (🪨, stats scaled from Boulder the same way SPLITMINI is scaled from
  Splitter) and fixed `getBloodProfile()` so it's correctly classified as rock/dust rather than
  falling through to standard flesh blood.
- **Modularized the split-child dispatch — the actual "make it less spaghetti" ask.** Replaced the
  hardcoded string with `SPLIT_CHILD_TYPE`, a single lookup table (`{ SPLITTER: 'SPLITMINI',
  BOULDER: 'ROCKLET' }`) now living next to the enemy config tables where it belongs. Adding a
  future splitting enemy is one new line in that table, not a new branch inside
  `spawnSplitChildren()` itself — the function's own logic never needs to change again to support
  a new split relationship. Confirmed no other code special-cases Boulder specifically (only the
  blood-profile lookup did) — enemies render generically via their own `emoji`/`radius` fields, so
  Rocklet needed no additional rendering hook to work correctly.
## [1.0.194] - 2026-09-07
- **Mage cooldown reduced 10% and damage increased 10%, all three tiers.** Cooldown:
  5400/4800/4200ms → 4860/4320/3780ms. Damage: 170/290/450 → 187/319/495. Since the ±40% damage
  variance is proportional, the min/max range scales with the new base automatically — no separate
  variance change needed. Range, slow effects, and everything else about Mage is untouched.
## [1.0.193] - 2026-09-07
- **Added skeletal remains on death — bones and skull drops, two independent probability rolls.**
  `spawnBoneDebris()`: 50% chance, 1-3 🦴 emoji scattered around the death point, each individually
  sized 1/10 to 1/5 of the enemy's own diameter. `spawnSkullDrop()`: separate 25% chance, one 💀
  sized at half the enemy's diameter. Neither is gated to a particular weapon or archetype — bones
  are a property of the body, not of what killed it — but both skip dust/construct enemies
  (`bio.isDust`), which have no skeleton to leave behind. Rendered as a new `isEmojiDrop` decal
  type, deliberately kept OUT of the existing blood hemoglobin-oxidation color pipeline (bone
  doesn't oxidize the way fresh blood does) — just a plain glyph that pops in on spawn and fades
  with its own lifespan. Persist notably longer than blood (45 minutes vs. blood's ~30) via a fixed
  `BONE_LIFESPAN`, since there's no forensic reason for bone fragments to fade on the same clock a
  wet bloodstain does.
## [1.0.192] - 2026-09-07
- **Substantially upgraded combat sound — the forensics book has essentially nothing on acoustics
  (checked directly rather than assume), so this is grounded in the physics book's kinetic-energy
  framing and real Web Audio synthesis technique instead.**
  - **Stereo panning**: new `panFor(worldX)` converts a hit's world position to a -1..1 pan value
    relative to the camera's current view — a hit on the left of the screen now genuinely sounds
    more in the left ear. Added as optional params to `tone()`/`noise()`; every existing call site
    that doesn't pass one still plays dead-center exactly as before, zero risk to the ~60 existing
    sound cases.
  - **Synthesized reverb send**: a real `ConvolverNode` fed a procedurally-generated impulse
    response (exponentially-decaying noise, same buffer-synthesis technique the existing `noise()`
    already used — no external audio file), routed only to genuinely big moments (critical hits,
    Mage) via an optional `reverbSend` param, so most sounds stay dry and punchy while the big hits
    get real spatial weight.
  - **Impact sound now scales with the same `hitPower`/`isCritical` roll already driving the blood
    visuals** — previously combat sound was static per weapon type regardless of how hard a hit
    actually landed, the one place the "sync numbers/visuals/audio to the same roll" pattern hadn't
    reached. New `playImpactSound()`, distinct timbre per archetype reasoned from kinetic energy
    (sharper/faster impacts get brighter high-frequency noise, heavier/slower ones get more
    low-end) rather than just louder copies of one generic sound: Blade sharp/bright, Blunt
    low/dull, Pierce thin/focused, Archer soft/understated (matching the same "modest external
    signs despite real damage" forensic point behind its dark entry-wound mark), Mage layered
    shimmer+weight scaling hardest of any archetype (matching its ±40% variance band), Explosive
    a heavy low thud. Hooked into `applyDamage` at the exact point `decalArch`/`hitPower`/
    `isCritical` are already computed — no new state needed.
## [1.0.191] - 2026-09-07
- **Fire-DOT now interacts with blood for the first time — a burning enemy's ground pools render
  darkened and sooty instead of the normal fresh blood tone.** Scanned BPA's full chapter list for
  unexplored material and found "Effects of Fire and Soot on Bloodstains" (ch.9): blood exposed to
  active heat/soot appears distinctly darker than an ordinary stain, and the two are visually
  sequenced differently at a real scene. Checked the existing burn-tick handler and confirmed it
  had zero interaction with blood at all — a burning enemy bled the exact same bright color as a
  non-burning one. New `bloodTintForFire(enemy, baseHex)` checks `burnUntil > gameTime` and swaps
  in a sooty near-black (`#170d08`) in place of the enemy's normal blood-dark tone. Wired into all
  three ground-pool decal call sites (bleed-tick, hit-time, death-time) — the most visually
  prominent, persistent marks — rather than every single spawn call across the file, keeping the
  change contained while still being clearly visible during an active burn.
## [1.0.190] - 2026-09-07
- **Void patterns implemented for Mage's streak cone — the first real gap-in-the-pattern effect
  in the game, previously deferred twice for lacking safe access to nearby-enemy data.** BPA
  ch.9-10: an absence of blood in an otherwise-sprayed area, caused by another body physically
  blocking the spray at the instant of the hit. Root blocker resolved: `enemyHash` (the spatial
  query structure used for tower targeting) was only ever a per-frame local inside the main loop,
  inaccessible from deep inside `Enemy.prototype.applyDamage()`/`die()` without threading a new
  parameter through every call site. Hoisted it to module scope instead (assigned fresh each frame,
  same timing as before) — a much smaller, safer change than rewriting `applyDamage`'s signature.
  Mage's streak loop now queries the small local neighborhood once per hit (not once per streak),
  and any individual streak whose ray would pass within another active enemy's own radius before
  reaching its landing distance is simply skipped — a real, physically-grounded gap rather than
  every streak always drawing regardless of what's standing in the way. Scoped to Mage only for
  now as a clean first implementation; extending to other archetypes is a small follow-up given the
  core plumbing is now in place.
## [1.0.189] - 2026-09-07
- **Added a genuine dark "entry wound" mark for Archer, grounded in a specific book passage that
  hadn't been mined yet.** BPA ch.2 ("Stab Wounds"/"Gunshot Wounds"): puncture wounds are deeper
  than they measure on the surface, and "abdominal stab wounds, even fatal ones, rarely have
  significant external bleeding" — the same section notes low/moderate-velocity penetrating wounds
  (an arrow, nowhere near the >2000 ft/s "near amputation" threshold) bleed "quite modest[ly]"
  externally despite real lethality. New `spawnPunctureMark()`: a small, dark near-black point
  (`#1a0505`), deliberately understated rather than the bright arterial red used everywhere else —
  the actual visible blood comes from the separate spray/satellite/drip/back-spatter layers around
  it, matching the book's point that the entry point itself looks modest even when the wound is
  serious. Replaces a call that had genuinely existed for a while (`spawnDecal(..., true)`,
  reusing the standard colorful blob decal at high opacity) whose OWN comment already promised
  "a small, concentrated dark mark right at the wound" — the code just never actually delivered
  a distinct dark mark until now; this makes it match what it already claimed to do. Archer is now
  the only archetype with this specific "dark pinprick + scattered pale halo" signature — Blade's
  mark is a linear cut, Blunt's a round crush, Mage's a wide cone.
## [1.0.188] - 2026-09-07
- **Walking blood trail now actually appears while an enemy has an arrow-induced bleed status,
  not just when it's below 40% HP.** Found the real gap: the ongoing drip system was gated
  entirely on low HP — a freshly arrow-struck enemy at, say, 70% HP with an active bleed produced
  no walking trail at all, even though it was genuinely bleeding. Widened the trigger to
  `hp < 40% OR bleedUntil > gameTime`, so any bled enemy now leaves a trail regardless of overall
  health. Also scatters a couple of extra, much finer flecks slightly off the main drip line while
  moving — a person walking with an open wound doesn't drip in one perfectly straight thread, real
  trails scatter a bit side to side with each step.
- **Bleed is now cumulative — multiple arrows stuck in the same target add to the bleed rate
  instead of just refreshing to whichever hit was strongest.** `applyBleed()` previously took
  `Math.max()` of the new and existing damage-per-tick (explicitly "doesn't stack"); it now adds
  them together, capped at 4 stacks (`bleedStackCount`) so a fast-firing Archer can't compound this
  into an unbounded instant death spiral — a real body also only has so much blood pressure to lose
  regardless of how many wounds are open. The cessation-taper clock (`bleedStartedAt`) only resets
  on the very first arrow, so a second or third one stacking onto an existing wound doesn't restart
  the taper from scratch. Stack count resets to 0 once the bleed fully expires.
## [1.0.187] - 2026-09-07
- **Added an animated "still bleeding" indicator — jumps out, wiggles, then fades over 2 seconds,
  firing roughly every 20 seconds while an enemy's bleed status is active.** New `spawnBleedIcon()`,
  distinct from the existing plain-text status reminder (`🩸 BLEEDING`, which still fires separately
  every 120s) — this one is a genuinely animated 🩸 emoji: a quick overshoot-bounce scale-up in the
  first 20% of its life, a decaying side-to-side wiggle through the middle, and a fade only in the
  final 30%. Reuses the existing pooled `floatingTexts` array (a new `isIcon` flag distinguishes it
  in `drawFloatingTexts`) rather than a separate system. Note: shares the same 100-slot pool as
  every other floating combat number, so during a very dense wave with lots of simultaneous hits,
  a bleed icon could occasionally get its pool slot recycled before its 2-second animation finishes
  — the same trade-off every other floating text already has, not something unique to this feature.
  The "tiny driblets" half of the request was already covered by the existing cardiac bleed-tick
  system (1.0.164), which spawns small drip particles every 420-900ms while bleeding — no changes
  needed there.
## [1.0.186] - 2026-09-07
- **Mage's base damage doubled across all three tiers**: 85→170, 145→290, 225→450. Since the ±40%
  damage variance (1.0.182) is a proportional multiplier on top of base damage, doubling the base
  automatically scales the min/max range with it — tier 1's roll is now 102-238 instead of 51-119,
  still the same ±40% spread, just twice as powerful in both directions as requested. Cooldowns,
  range, slow effects, and everything else about Mage are unchanged — this is purely a damage buff.
- **Enhanced Mage's cast sound** to match the increased power — added a deep bass thump underneath
  the existing two-tone rising shimmer (`cast_mage`), so a rarer, now much harder-hitting cast has
  the low-end weight to match.
## [1.0.185] - 2026-09-07
- **Lowered the HUD-bar fit-to-screen floor from 0.55x to 0.4x.** Re-verified the full containment
  chain (viewport meta tag, `#game-wrapper` → `#canvas-frame` → `#hud-top`) and found it structurally
  sound — but the reported edge-clipping screenshots may have predated the 1.0.172/1.0.176 HUD
  fixes, so this is a safety-net change rather than a confirmed root-cause fix. At the old 0.55
  floor, if the bar's natural content was wide enough relative to a narrow screen, the mathematically
  required scale could fall below what the floor allowed, and the floor would win — leaving genuine
  overflow past the screen edge rather than a fully-fit bar. "Never clip" now takes priority over
  "never shrink too small," since the reported problem was content sticking out past the edge, not
  legibility.
## [1.0.184] - 2026-09-07
- **Fixed an unbounded size-stacking bug causing an occasional, forensically implausible giant
  blood pool — confirmed from screenshots showing a single splat visibly dominating over a full
  tile.** `spawnDecal`'s rare "bigger pool" tier (a ~4% chance, `sizeMult` 1.7-2.6x) was multiplying
  on top of the archetype size multiplier with no combined cap — Mage's own multiplier is already
  1.75x (the largest of any archetype), so a rare-tier roll landing on a Mage hit could reach
  2.6*1.75 = 4.55x base size. Added a hard ceiling of 3.2x on the FINAL size after both multipliers
  are applied, universally across every archetype — Mage's rare-tier pool is still the largest
  possible splatter in the game (above any other archetype's own 2.6x rare-tier ceiling on its
  own), it just can no longer compound unbounded when both the rare roll and the archetype
  multiplier land at the same time.
## [1.0.183] - 2026-09-07
- **Blunt-trauma shockring is no longer a full 360° circle.** Confirmed it was already correctly
  scaled by the min/max damage variance system (`hitPower`), but the ring itself was hardcoded to
  `ctx.arc(..., 0, Math.PI*2)` — a complete circle biased equally in every direction, including
  straight back toward the attacking tower. Real displaced blood from a blunt impact biases toward
  the far side of the blow, not equally toward whatever struck it. `spawnShockring()` now takes an
  optional `angle`/`arcSpan` pair: the arc is centered on `impactAngle` (the blow's actual direction
  of travel) and spans roughly 205° for the primary ring, 145° for the smaller secondary echo —
  more than a half circle so it doesn't look clipped, but genuinely biased away from the source
  rather than a full ring. Omitting both parameters preserves the old full-circle behavior for any
  future caller that doesn't pass them. Applied to all three existing call sites (hit-time primary
  ring, hit-time secondary echo, and death-time ring).
## [1.0.182] - 2026-09-07
- **Fixed footprints essentially never appearing despite large, visible areas of blood on the
  ground — a real bug, not a rarity tuning issue.** `spawnBloodCastoff` (the big dramatic radiating
  lines dominating recent screenshots) anchors its decal at the impact point, but the visible line
  reaches up to ~100px away for Mage's biggest streaks — yet it never set `footprintRadius`, so
  `updateWalkingBlood`'s pickup check only looked within ~20-30px of that anchor. An enemy standing
  at the far end of a long, clearly-visible streak registered as nowhere near any blood at all.
  Added `footprintRadius` to `spawnBloodCastoff` (set to the line's own `maxLen`) and
  `spawnDripTrail` (same anchor-vs-visual-extent issue, smaller scale), plus minor completeness
  additions to `spawnCastOffArc`/`spawnSatelliteDrops`'s individual drop decals. This should now
  apply to every blood type, matching what was asked — the pickup logic itself was never
  weapon/archetype-specific, it just couldn't see past a decal's own anchor point before.
- **Mage now has the widest damage variance band of any tower: ±40% (0.6x-1.4x), vs. ±20%
  everywhere else.** Its rare, high-stakes shots should feel the most volatile — a real dud or a
  real haymaker — matching its "rare, devastating shots" identity more than a tightly-banded roll
  would. Still symmetric around 1.0 and still a fixed proportional band (scales identically at
  every tier), so average DPS is unaffected — this only widens hit-to-hit spread specifically for
  Mage. Updated the streak-count `dmgRollT` calculation (1.0.181's "1 to 4 lines" feature) to match
  the new 0.6-1.4 range instead of the old hardcoded 0.8-1.2.
## [1.0.181] - 2026-09-07 — HOTFIX
- **Fixed a serious regression from 1.0.179: Mage could stop attacking entirely.** The previous fix
  made Mage's `findTarget()` return early and skip re-evaluation completely as long as its current
  target stayed `.active` and in range — an absolute lock with no path back to normal scanning. If
  that very first lock ever landed on a target Mage structurally couldn't damage for any reason
  (there's a known separate unresolved issue in this codebase about some towers failing to hit
  targets behind barricades), Mage would stay stuck on that unreachable target forever, since
  nothing could ever trigger a re-scan — the normal retargeting churn that used to accidentally
  paper over this was exactly what got removed. Replaced the hard lock with a much wider hysteresis
  margin instead (6.0x for positive-score modes, 0.35x for negative/CLOSEST, vs. 1.15x/0.85x for
  every other tower) — the full scan-and-compare flow still runs every frame, so Mage can always
  self-correct, it just takes a drastically better-scoring target to actually pull it away
  mid-charge instead of a minor 15% edge. Every other tower's targeting is unchanged.
## [1.0.180] - 2026-09-07
- **Fixed the actual visual source of Mage's "resetting" cast — a pose snap, not a data reset.**
  1.0.179 confirmed `chargeProgress`/`cooldownTimer` never reset on target loss/change. What DOES
  reset: `staffAngle` (and the arm angle feeding it) switched between "aimed at target" and a
  separate upright "idle" pose the instant `hasTarget` flipped false — which happens naturally once
  Mage sits fully charged waiting for a target for more than 500ms (very common given its 4.2-5.4s
  cooldown), or the moment a new target appears. The glowing charge orb is drawn at the staff's tip,
  so that pose snap physically moved it to a different screen position each time — reading exactly
  like the whole cast restarting even though the charge percentage itself never moved. Fixed at both
  the data and render layer: `this.angle` no longer snaps to the idle pose for Mage specifically
  (it now holds its last aimed direction indefinitely while waiting for a target), and the staff/arm
  render now always points along `angle` unconditionally instead of branching on `hasTarget`. The
  charge-up is now visually continuous regardless of target presence or changes, exactly as
  requested. No other tower type's angle or pose logic is affected.
## [1.0.179] - 2026-09-07
- **Fixed Mage's attack visibly "resetting" mid-charge.** Traced the actual state first before
  touching anything: `chargeProgress`/`cooldownTimer` were confirmed to have zero dependency on
  target identity — they were never actually being reset. The real cause was `findTarget()`'s
  standard 15% hysteresis margin being re-evaluated every frame for every tower, including Mage —
  fine for towers that fire in under a second, but Mage's cooldown is 4.2-5.4s, by far the longest
  charge window in the game. Over that stretch it's easy for a faster/closer enemy to edge out the
  current target's score by more than 15% at some point, silently swapping `this.target` mid-charge
  — and since the aim angle re-predicts toward whichever target is currently selected every frame,
  that swap made the Mage's arm visibly snap to a totally different direction mid-cast, reading
  exactly like the attack recalibrating from scratch. Mage now locks onto its target for the
  entire charge-up once acquired, skipping the re-scan entirely as long as that target stays alive
  and in range — only re-evaluating when it actually dies or leaves range, never because a
  better-scoring target happened to wander by. Every other tower's targeting is unchanged.
## [1.0.178] - 2026-09-07
- **Archer now has real back-spatter, at both hit-time and death-time.** Checked the book's actual
  attribution rather than assuming: BPA ch.7 ties forward+back spatter specifically to gunshot-type
  high-velocity PENETRATION — which is Archer's real-world analog (an arrow/bolt puncture), not
  Mage's magical blast. Mage got this treatment first, but Archer is the textbook case for it and
  had none. Added a smaller, shorter-range burst fired back toward the tower on every Archer hit
  and kill, matching the book's described asymmetry (back-spatter is markedly less voluminous than
  the forward exit spray, not a mirrored burst in both directions).
- **`spawnParticles()` gained an optional `sizeMin` parameter** (defaults to `undefined`, reproducing
  the original 2-4px range exactly for every existing call site) so a caller can request genuinely
  fine mist droplets instead of the standard size band.
- **Added a universal death-time atomization mist layer**, using the new `sizeMin` parameter — a
  distinct band of fine 0.5-1px particles radiating omnidirectionally on top of whatever
  weapon-specific death burst already fired, scaled by the same `goreScale` (bigger enemies produce
  more of it) as the rest of the death event. Every kill now has more visible "small particle"
  texture regardless of which archetype or weapon actually landed the blow.
## [1.0.177] - 2026-09-07
- **Fixed cast-off streak width to genuinely follow a sqrt curve, matching what the code's own
  comment always claimed but the formula never actually did.** `widthMult` was `1 + (sizeMult-1)*
  0.55` — linear, not sqrt, so it barely flattened growth at high sizeMult. This is exactly why
  Mage's radiating streaks (sizeMult 3.0-4.2, the largest in the game) read visibly bolder/thicker
  than intended — BPA explicitly describes cast-off as "linear," i.e. a thin line regardless of
  length. Changed to `1 + (Math.sqrt(sizeMult) - 1)`, a true sqrt relationship: Blade's existing
  range (sizeMult 0.4-2.1) is barely affected, while Mage's long streaks get meaningfully thinner
  without losing any length — only width flattens.
## [1.0.176] - 2026-09-07
- **Cleaned up inconsistent HUD button sizing from the 1.0.172 one-line fix.** Two separate root
  causes: (1) none of the HUD buttons had `white-space:nowrap` or `flex-shrink:0`, so on top of the
  intentional outer `transform:scale()` fit, the browser was ALSO independently flex-shrinking each
  button below its own natural content width — "Next Wave ▶" has the longest text, so it was the
  one that visibly wrapped into two lines, while shorter buttons just looked slightly squeezed
  instead. Added `#hud-top > *{flex-shrink:0;white-space:nowrap;}` so every button keeps its
  natural size and never wraps internally — the outer scale is now the ONLY thing responsible for
  fitting the bar to the screen, instead of two competing sizing mechanisms fighting each other.
  (2) `.hud-btn` (Pause/1x), `.hud-action-btn` (Build/Shop/gear), and `#nextWaveBtn` had three
  different min-heights (36px/38px/42px) — unified all three to 38px for one consistent button
  height across the whole bar.
## [1.0.175] - 2026-09-07
- **Added a discrete critical hit tier** — separate from the continuous `hitRoll`/`hitPower`
  variance (1.0.168, 1.0.170): a 10% chance per hit of `isCritical`, giving hitPower/cutSize a flat
  1.35x boost (mutually exclusive with the anomalous-minimal roll) and its own floating combat-text
  treatment (💥 prefix, gold color) distinct from normal and holy-bonus damage numbers. Closes the
  "maybe a crit" item that had been sitting open since it was first mentioned.
- **Added the "wipe" pool-disturbance mechanic — BPA distinguishes this from the existing footprint
  "swipe" system, and previously only swipe existed.** A swipe is a bloody object depositing new
  marks on clean ground (the existing footprint trail, correctly modeled). A wipe is the opposite:
  something passing through ALREADY-wet blood disturbs the stain itself. Layered into the existing
  throttled `updateWalkingBlood` pickup-check loop (no new per-frame cost) — when a moving enemy
  steps into a fresh pool decal, its blobs now nudge slightly along the enemy's direction of travel
  and shrink a touch each time, so a pool a creep walks through visibly smears and thins in its
  wake instead of sitting untouched forever.
- **Added expirated blood as its own forensic mechanism (BPA ch.8)** — blood mixed with air from a
  throat/chest wound, mechanically distinct from puncture/blunt/slash spatter and not tied to which
  weapon delivered the killing blow (a sword, arrow, or mace can all plausibly catch the airway).
  New `spawnExpiratedMist()`: a fine pale pink air-diluted mist plus a few faint near-static white
  "bubble" specks. Fires as an occasional (15%) additive flourish layered on top of whatever
  weapon-specific death gore already fired — never replaces it, gated off for dust/no-arterial
  enemies and low-detail deaths.
## [1.0.174] - 2026-09-07 — HOTFIX
- **Fixed a boot-crashing regression from 1.0.172 that prevented the game from starting at all.**
  `fitHudTopToOneLine()` referenced the outer `livesVal`/`goldVal`/`waveVal` consts, but was called
  immediately at script load (`fitHudTopToOneLine(true)`, line ~6671) — well before those consts
  are actually declared (line ~6922), throwing `ReferenceError: Cannot access 'livesVal' before
  initialization` and halting the entire script. Fixed by having the function look elements up
  directly via `document.getElementById()` instead of relying on the outer consts, which
  decouples it from declaration order entirely regardless of where or when it's called. My error —
  the 1.0.172 syntax check (`node --check`) caught malformed JS but couldn't catch a temporal-dead-
  zone runtime error, since that only surfaces on actual execution, not static parsing.
## [1.0.173] - 2026-09-07
- **Added serum separation rings to pooled bloodstains — a real, distinct forensic detail (BPA
  ch.9, "Clotting of Blood") that had been referenced from an external AI's fictional code review
  but never actually verified or built.** Grepped the live file for "serum"/"clot" and confirmed
  zero hits before implementing. As a real clot retracts, it squeezes out the remaining liquid
  serum, which spreads slightly beyond the clot's own edge as a thin, translucent pale-yellow halo
  — deliberately separate from the existing skeletonization rim (which darkens the stain's OWN
  edge); serum sits just outside it. Windowed to the wet clot-retraction period only: onset within
  the first couple minutes of real clotting, fully gone again by the point a stain reads as fully
  dried (matched to the same 40%-of-life mark the existing color-aging curve settles at). Gated to
  pools with genuinely sized blobs (`r > 2.5`) — real serum separation isn't visible on fine spatter
  flecks, only larger pooled stains.
- **Bleed-tick spurts now weaken as a creep's OVERALL blood volume drops, not just as the current
  wound ages.** `beatIntensity` was previously scoped entirely to the individual wound's own
  cessation taper — a creep already worn down to a sliver of HP by earlier hits still spurted at
  full "just opened" strength from a freshly-reapplied bleed. New `hypoDamp = 0.4 + 0.6 *
  (this.hp/this.maxHp)` factor floors at 0.4 (even a dying creep still visibly bleeds, just weakly,
  never fully silent) and scales down toward that floor as overall HP drops — matching real
  hypovolemic shock, where a body running low on blood simply has less pressure left to spurt with,
  regardless of how fresh any one wound is. Closes a gap self-flagged during an earlier review pass.
## [1.0.172] - 2026-09-07
- **Top HUD bar (Build/Shop/gear, hearts/gold/wave stats, Pause/1x/Next Wave) no longer wraps onto
  a second row on narrow mobile screens — it now always stays on one line, scaling the whole bar
  down proportionally instead.** Previously `#hud-top` used `flex-wrap:wrap`, which caused Next
  Wave and other controls to spill below the stat readouts on phone-width screens. Switched to
  `flex-wrap:nowrap` and added `fitHudTopToOneLine()`, which measures the bar's natural unwrapped
  width against the available screen width and applies a single `transform:scale()` to the whole
  bar if it doesn't fit — every button keeps its exact proportions and icon/text relationship, just
  smaller as a unit, floored at 0.55x so it never shrinks past legibility. Guarded with a cheap
  fingerprint of just the gold/lives/wave text (the only things that could change the bar's natural
  width mid-game) so the expensive re-measure only actually runs when that fingerprint changes or
  on resize/orientationchange — not on every `updateHUD()` call, which fires on every kill/hit and
  could be many times a second during a dense wave.
## [1.0.171] - 2026-09-07
- **Blade cast-off is now dampened on a tower's genuinely first-ever hit, grounded directly in a
  cited forensic passage (BPA ch.8): "the initial blow generally does not produce sufficient
  exposed blood on the weapon to produce cast-off bloodstains."** Cast-off specifically requires
  blood already coating the weapon from a prior strike — it's distinct from the wound's own spatter,
  which happens on hit one same as any other. Added `sourceTower.weaponBloodied`, tracked per-tower
  (not per-enemy — a blade doesn't get wiped clean between victims mid-battle): the very first hit
  any given Swordsman/Axeman lands, ever, produces a cast-off line/arc at ~22% normal size; every
  hit after that (on any target) is full-strength, since the blade stays bloodied for the rest of
  the fight. The wound-source particle spray is untouched by this — only the weapon-borne cast-off
  line and arc are dampened, matching exactly what the cited mechanism actually claims.
- **Added a small, uniform "anomalously minimal hit" chance (9%) across every archetype** — not
  from a specific book formula, but consistent with its general point that real spatter volume
  isn't perfectly predictable from force alone (skin elasticity, exact strike angle, and where a
  blow lands all shift the outcome independent of raw force). `isAnomalousMinimal` multiplies
  `hitPower` (and Blade's `cutSize`) down to ~35-40% on the rare hits it triggers — the visual
  equivalent of a real solid strike that, for whatever reason, just didn't produce much visible
  blood. Gives every archetype the "sometimes it's just smaller" variance previously only Blade had
  a taste of via `hitRoll`'s ±18% band, without touching actual damage dealt.
## [1.0.169] - 2026-09-07
- **Masterwork pass: every weapon archetype now has a fully distinct ground-pool shape, not just a
  distinct hit-time particle burst.** `spawnDecal`'s elongation table only ever branched on ARCHER/
  MAGE/EXPLOSIVE — Blade, Blunt, and Pierce (all three "WARRIOR" sub-types) silently shared one
  identical pool profile, even though their particle bursts had been differentiated for several
  versions. Root cause: the `weapon` variable (BLADE/BLUNT/PIERCE) was declared inside a block that
  went out of scope before reaching the decal call. Hoisted `weapon` to the top of the hit
  resolution (computed once per hit, negligible cost) so it's available everywhere in the function,
  and gave `spawnDecal` two new branches: BLUNT is now the roundest/widest of the three melee
  weapons (matches its shockring/radial identity, `sizeMult *= 1.25`), PIERCE is now the narrowest/
  most elongated (a deep thrust gushes along one tight line, `sizeMult *= 0.85`), and BLADE keeps
  the original moderate directional-cut profile as the fallback default.
- **Death blows now also sub-branch by weapon type — previously every melee kill collapsed
  identically regardless of what actually killed it.** BLUNT deaths now get a radial burst plus
  their own shockring (echoing the hit-time BLUNT identity instead of borrowing Blade's directional
  gush streams) and slightly more gib debris. PIERCE deaths are now narrower and more forward-gush-
  heavy (fewer ambient particles, a stronger tighter stream) than the ambient Blade collapse. Blade
  keeps its existing directional-collapse treatment, now explicitly its own branch rather than the
  only option. The death-time ground pool also now uses the correct weapon-specific shape from the
  point above, instead of always falling back to the generic WARRIOR profile.
- **EXPLOSIVE (Bomber) hit-time burst now scales with `hitPower`** — the last archetype still
  firing a flat particle count regardless of hit severity, closing a gap flagged twice previously.
## [1.0.168] - 2026-09-07
- **Real per-hit damage variance added (±20% min/max roll), and it now directly drives the blood
  system instead of blood staying on a purely cosmetic random roll.** Previously `hitRoll` (the
  variable that adds "no two identical hits look the same" variety to blood) was a plain
  `Math.random()` with zero connection to actual damage — now it IS the same roll that determines
  how much damage the hit actually deals. `damageVariance = 0.8 + Math.random()*0.4`, applied to
  the base damage before armor/shield mitigation, symmetric around 1.0 so average DPS over many
  hits is completely unchanged (a Uniform 0.8-1.2 roll has a mean of exactly 1.0) — this adds
  hit-to-hit spread, it does not shift overall tower balance up or down. Because it's a fixed
  proportional band rather than an absolute bonus, it scales identically at every tower tier — a
  level-99 Mage's roll is exactly as bounded as a level-1 Archer's, so blood intensity still can't
  creep up with tower level, the original concern this whole system was built to avoid. Net effect:
  a lucky high roll now deals visibly more damage on the floating combat text number AND produces a
  visibly bigger, gorier splatter in the same hit — what the player sees numerically and visually
  now agree with each other.
## [1.0.167] - 2026-09-07
- **Mage impacts now punch through in a wide forward cone instead of scattering omnidirectionally
  or reusing the Swordsman's swing-arc geometry.** Both the hit-time and death-time Mage branches
  previously called `spawnCastOffArc()` for their radiating streaks — but that function's math
  (`arcDir`, `angularStep`, a tangent-angle offset) models blood flung tangentially off a *rotating
  swinging weapon*, which is Swordsman/Axeman's physics, not a stationary bolt's. That's the actual
  reason Mage could still read as "swordsman-flavored" even after 1.0.161 removed the shared
  shockring — the streak shape itself was still swing-derived. Dropped `spawnCastOffArc` from both
  Mage branches entirely; streaks are now straight `spawnBloodCastoff` spokes confined to a ~132°
  cone (`mageConeWidth = 2.3`) centered on `impactAngle` — the bolt's actual direction of travel —
  instead of scattered at fully random angles around the whole circle. The main particle bursts and
  satellite drops are now cone-confined the same way (`spawnParticles`'s existing `coneAngle`/
  `coneSpread` params, previously unused by Mage; `spawnSatelliteDrops`'s `biasAngle`).
- **Mage's ground pool is now a wide directional splash oriented along the bolt's travel, not a
  round blob.** `spawnDecal`'s MAGE elongation profile changed from near-round (`longMin:0.95,
  shortMin:0.85`) to genuinely cone-shaped (`longMin:1.35, shortMin:0.6`) — stays the single
  largest pool of the four archetypes (unchanged `sizeMult *= 1.75`), but now reads as a wide
  forward splash instead of a big circle, giving Mage a shape distinct from both Archer's thin
  narrow streak and Warrior's moderate cut-line smear.
## [1.0.166] - 2026-09-07
- **Every hit now gets a purely cosmetic, bounded ±18% random roll (`hitRoll`) applied on top of
  the existing severity-based scaling (`hitPower`/`cutSize`), so two hits of identical damage no
  longer produce visually identical blood.** This is intentionally separate from severity: `hitRoll`
  is plain `Math.random()` with zero relationship to actual damage dealt, tower tier, or target HP
  — it can never scale up with tower level the way a damage-based multiplier could, so a level-99
  Mage's cosmetic variance is exactly as bounded as a level-1 Archer's. Actual damage values, DPS,
  and combat balance are completely untouched by this — it only affects the visual size of
  particle counts/cut-line length, never HP subtracted. Addresses "the blood looks too predictable/
  the same pattern every time" without risking blood scaling out of control as towers level up.
## [1.0.165] - 2026-09-07
- **Swordsman's cast-off cut-line no longer draws at near-full size on a light graze.** `cutSize`
  (the multiplier on the blade's cut-line/cast-off length) had a floor of `1.1` — meaning even the
  weakest possible hit still drew the wound at ~110% of tuned base size, which is why every
  Swordsman hit read as a heavy strike regardless of how little damage it actually dealt. Floor
  dropped to `0.4` (a genuinely thin nick), ceiling trimmed from `2.5x` to `2.1x` for balance. Also
  scaled the BLADE branch's general blood-spray particle count by hit severity (`hitPower`, see
  below) — previously fixed at `12` regardless of how hard the hit landed, the one archetype branch
  this scaling had been missed on in the prior pass.

## [1.0.164] - 2026-09-07
- **Arterial bleed-tick now pulses on a cardiac rhythm instead of firing on a flat 700ms metronome.**
  A sine wave keyed to how long the wound's been open drives both tick spacing (420ms at the peak
  of a beat, up to 900ms in the trough) and spurt size together — a strong beat means a bigger
  spurt *and* a shorter wait until the next one, matching how real arterial bleeding surges and
  eases rather than dripping at constant intensity. Persistent ground marks (decal, drip trail)
  intentionally stay on the existing cessation taper rather than the beat — a permanent stain
  flickering in size with a heartbeat would look wrong; only the momentary spray pulses.

## [1.0.163] - 2026-09-07
- **Blood pools now read as genuinely thicker/more viscous for insect and undead enemies, not just
  slower-draining underfoot.** `spawnDecal()` gained an optional `viscous` parameter (defaults to
  off — every untouched call site is unaffected), reusing the existing `bio.viscous` flag already
  driving footprint friction. When set: blob count drops ~40% (fewer, chunkier clumps instead of a
  wide scatter), the center-weighting exponent tightens from 1.4 to 2.4 (blobs cluster instead of
  spreading), and the archetype's elongation blends halfway toward round (a viscous Mage hit still
  reads rounder than a viscous Archer hit, just less extreme than either would with normal blood).
  Threaded through the three call sites where `bio` was already in scope (hit-time mark, death-time
  pool, bleed-tick decal).

## [1.0.162] - 2026-09-07
- **Mage, Archer, Warrior/BLUNT, and Warrior/PIERCE hit-time gore now scales with how hard the hit
  actually was, not a fixed burst every time.** Only the BLADE cut-line previously scaled with hit
  severity (`cutSize`) — every other archetype fired identical particle/satellite/streak counts on
  a graze and a near-kill alike, which is the actual mechanism behind Mage in particular always
  reading as "maxed out." New shared `hitPower` scalar (`0.55 + flinchSeverity*0.75`, so an average
  hit still looks like the tuned baseline and only real extremes stand out) now multiplies: Archer's
  spray/satellite counts, Mage's primary bursts/satellite count/streak count/back-spatter, BLUNT's
  primary bursts/satellite count/shockring radius, and PIERCE's gush particle/stream counts.

## [1.0.161] - 2026-09-06
- **Mage damage rebalanced — the tower was badly underpowered.** Base tier damage was 6/9/13,
  which against its 5.4s/4.8s/4.2s cooldowns worked out to roughly 1-3 DPS — far below every other
  tower (Archer alone runs 27-85 DPS across its tiers) and completely out of line with the Mage's
  "rare, devastating shot" identity: it was rare, but not devastating. Raised to 85/145/225 damage
  per hit (≈14x at tier 1), landing Mage's DPS in the same range as Archer's while it keeps its own
  identity through the slow effect and now-larger impact visuals rather than through raw uptime.
- **Moved the circular shockring gore effect from Mage to Warrior/BLUNT (Hammerman/Paladin).**
  Forensically, a round/radial ring pattern is a blunt-trauma signature — a crushing weapon
  compresses a genuinely round area of impact. A magical bolt or a blade has no such surface, so
  giving Mage a ring read as generic "circular splash" rather than something specific to how the
  hit actually happened. Mage's impact identity is now pure directional streak: cast-off-arc drop
  fans (shared with Warrior's slash technique) bumped from 6-9 to 8-11 per hit, each one longer
  (2.2-3.0 → 2.8-3.8 size multiplier), so the removed ring's visual weight is replaced by more/
  longer radiating lines instead of a round shape. Warrior/BLUNT gained a modest shockring
  (18-26px) alongside its existing radial particle burst, which is the one melee case where a ring
  is the forensically correct read.
- Gave every tower archetype its own attack sound instead of two shared generic tones. Previously
  every ranged tower (Archer, Sniper, Gatling, Blowdart, Gunalinder, Squirtgun, Mage) fired the
  same `'bow'` tone and every melee tower (Swordsman, Spearman, Hammerman, Paladin, Axeman) fired
  the same `'sword'` tone; Cleric had no attack sound at all. Added 13 distinct synthesized sounds
  dispatched by actual tower type (`swing_blade`, `swing_pierce`, `swing_blunt`, `swing_axe`/
  `throw_axe`, `shot_archer`, `shot_sniper`, `shot_gatling`, `shot_blowdart`, `shot_gunalinder`,
  `shot_squirtgun`, `shot_bomber`, `cast_mage`, `cast_cleric`), plus a separate `monster_swing` for
  the Troll's tower-bash attack so it no longer borrows the Swordsman's sound.
- Separated menu/UI sounds from combat sounds and from each other. Added `ui_open`/`ui_close`
  (short up/down blips on the Build, Shop, and Settings modals — previously silent on open/close),
  and `ui_buy` (a two-note purchase chime on Buy Life and tower Upgrade, previously either a
  generic `click` or no sound). `click` is kept for lightweight taps (tabs, item slots, toggles).
  Extended the synth engine's `noise()` helper to take a filter frequency/type so several of these
  (e.g. Sniper's crack, Gunalinder's clack) layer filtered noise under a tone instead of every
  sound being a single pure oscillator sweep.
- Tightened the top HUD bar further and removed the fullscreen button. `justify-content:center`
  with an explicit `column-gap` (added in 1.0.160) still consumed more horizontal space at narrow
  widths than the old `space-between` did when there was no slack to spread, pushing "Next Wave"
  onto a second row on mobile/minimized windows. Set `column-gap` to a tight `3px` by default and
  only widen it to `clamp(6px,1.2vw,12px)` above a `640px` breakpoint, trimmed padding on all HUD
  buttons, and removed the fullscreen button (markup, its `pointerdown`/`fullscreenchange`
  listeners, and its CSS rule) entirely per direct request, freeing up enough width that
  minimized/mobile keeps everything on one row again. Also added a `<meter>` for the lives gauge
  and a `<progress>` bar for wave completion next to the existing HUD spans.

## [1.0.160] - 2026-09-06
- Fixed the top HUD bar spreading edge-to-edge on wide desktop screens. `#hud-top` used
  `justify-content:space-between` with no width cap, which stretches its children across the full
  viewport width — on a narrow mobile window there's little width to spread across so it looks
  naturally clustered, but the exact same rule spreads far apart on a wide monitor. Added
  `max-width:900px; margin:0 auto;` so the bar caps out at a fixed width and centers itself on wide
  screens, bringing the two ends much closer together, while having zero effect on any viewport
  already narrower than that (mobile is unaffected).
- Traced and fixed the real cause of the Mage "resetting its attack" complaint. The cooldown timer
  itself was never actually resetting on a target switch (confirmed: it decrements unconditionally
  every frame regardless of target, and fires the instant a target is available with cooldown
  expired) — but the visible arm/staff pose was. The grace window added in 1.0.149 was a fixed
  500ms, and with cooldowns now running 4.2-9.5s (the Mage rebalance in 1.0.144), a real gap
  between one target leaving its limited range and the next arriving routinely exceeds 500ms —
  so the pose kept snapping back to idle mid-charge every time a target cycled out, even though the
  actual charge was still counting down the whole time. That constant visual "reset" is what read
  as the tower being stun-locked and never firing, even though it should have already been firing
  correctly on whatever target happened to be in range once its cooldown expired. Fixed by tying
  the engaged pose to the cooldown itself (`this.cooldownTimer > 0`) rather than only recent target
  presence — the tower now visibly stays in its ready/charging stance for its entire cooldown,
  falling back to a genuine idle pose only once fully charged with nothing to shoot at for a real
  stretch. If enemies are still slipping through completely unhit after this, that would point to a
  real range/cooldown balance question rather than a bug — worth reporting separately if so.

## [1.0.159] - 2026-09-06
- Implemented the `WEAKEST` targeting mode — flagged as open across at least three separate
  `BACKLOG.md` entries going back several sessions, but never actually built. Added it consistently
  everywhere the existing `FIRST`/`CLOSEST`/`STRONGEST` modes are handled: both scoring functions
  (`findTarget()` and `findSecondaryTarget()`), scored as `-hp` so the shared "higher score wins"
  comparison works identically to every other mode, and added to the mode-cycling button's list.
  The UI label and save/load path both already just read/write the mode as a plain string with no
  hardcoded list to update, so this needed no other changes to show up correctly or survive a save.

## [1.0.158] - 2026-09-06
- Wired two fully-built, previously-abandoned wave generators into the procedural wave rotation:
  `generateTrickWave()` (looks like an easy opener, then springs a real threat partway through)
  and `generateGrindWave()` (long, sustained, high-total-count — tests economy over time rather
  than a reaction-check flood). Both were complete, used the exact same data format as every other
  working generator, and had zero call sites anywhere in the file — confirmed before touching
  anything. Widened the wave-variety cycle from `n % 7` to `n % 9` to include them. Purely
  additive: two more distinct wave flavors, nothing existing removed or changed in what it does.
  Honest note on the one real side effect: widening the modulo shifts which specific wave *number*
  lands on which flavor going forward, since the remainder arithmetic changes — that has no
  player-facing meaning attached to it (nothing tracks "wave 47 is always Elite type"), but it's a
  real change to the mapping, not just new content sitting inertly alongside the old.
- Removed `resetCamera()` — confirmed zero call sites anywhere in the file (same standard applied
  to the two dead color-helper functions removed in 1.0.154). Removing genuinely unreachable code
  changes zero behavior, since nothing was ever calling it.

## [1.0.157] - 2026-09-06
- Read HTML5 Games, 2nd Edition (Seidelin) Chapter 3 ("Going Mobile," p. 73, Listing 3-28)
  directly and checked its exact mobile-browser-lockdown CSS recipe against this file's real
  styles. Found a genuine, verified, purely-additive gap: `user-select:none` and
  `-webkit-user-select:none` were already present, but the book's other three properties for the
  same purpose were missing entirely — `-webkit-touch-callout:none` (suppresses the long-press
  callout menu on tappable elements), `-webkit-tap-highlight-color:rgba(0,0,0,0)` (removes the
  gray flash Android/older WebKit browsers show on tap), and `-webkit-text-size-adjust:none`
  (stops the browser auto-resizing text on orientation change). All three added to the same
  top-level `html,body` rule the existing properties were already on. Zero functional risk — these
  only suppress default mobile-browser chrome behaviors that have no place in a touch game to
  begin with, and don't affect layout, JS, or anything CSS/JS actually reads.
- Also checked the same book's Chapter 6 canvas-graphics recommendations (state stack discipline,
  curves, blend modes) against the real code: curve usage (`quadraticCurveTo`) and consistent
  `lineCap:'round'` are already applied correctly (5 and 4 real usages respectively) — confirmed
  rather than assumed. `ctx.globalCompositeOperation` (blend modes, e.g. `'screen'`/`'lighter'` for
  a genuinely luminous glow instead of plain alpha blending on magic effects) is completely unused
  anywhere in the file — a real, valid stylistic opportunity, recorded in `BACKLOG.md` rather than
  applied here, since it's a visual style choice rather than a correctness fix.

## [1.0.156] - 2026-09-06
- Read HTML5 Mastery directly (not a summary) and found a real, significant, previously-unverified
  gap: this project's own `AGENTS.md` claimed semantic HTML5 elements (`<header>`, `<nav>`,
  `<aside>`, `<meter>`, `<progress>`, `<details>`) were "already the convention" in this codebase's
  UI — a direct count found zero of any of them anywhere in `index.html`. The entire UI is 124
  generic `<div>`s. That claim was inherited from an aspirational description early in this
  project's history and never actually checked against the file — corrected in `AGENTS.md` now,
  along with the real finding that a proper fix is genuinely low-risk (CSS/JS here style and select
  by class/id, never by tag name) but deserves its own careful, one-container-at-a-time pass rather
  than a bulk rename risked in the same turn as unrelated work, since a mismatched closing tag in
  deeply nested markup wouldn't be caught by the JS syntax check this project already runs.
- Shipped the one part of that finding that's unambiguously zero-risk this turn: added `aria-label`
  to the 9 buttons in the file that are genuinely icon-only (no visible text content at all) and
  didn't have one — `settingsBtn`, `fullscreenBtn`, `inspExpandChevron`, `inspClose`,
  `statsInfoBtn`, `barricadeInfoBtn`, `towerModalClose`, `shopModalClose`, `settingsModalClose`.
  Buttons that already have visible text alongside their icon (`buildBtn`: "🏗️ Build", etc.)
  already had an adequate accessible name and needed nothing added.
- Added a "Code map" section to `README.md`: direct GitHub links into specific lines of
  `index.html` for every major section and several specific systems people actually go looking for
  (`CONFIG.TOWERS`, `class Enemy`, `spawnDecal()`, the main loop, etc.), with an explicit caveat
  that line numbers drift as the file changes and the section-header comment above a given spot is
  the reliable anchor if a link lands slightly off.
- Added two durable principles to `AGENTS.md`: `CHANGELOG.md` outranks inline comments when the
  two disagree about why something is the way it is (comments can silently go stale as code
  changes around them — directly motivated by the two stale comments found and fixed in 1.0.155;
  the changelog is dated, versioned, and append-only by this project's own discipline, so it's the
  more reliable record), plus explicit guidance for an AI agent working with a smaller effective
  context window than Claude's (read the file's own navigation aids before reading code, search
  for specifics instead of reading broad ranges, state uncertainty plainly instead of guessing).

## [1.0.155] - 2026-09-06
- Fixed two stale comments found via a direct audit against Clean Code's own warning ("the older
  a comment is, and the farther away it is from the code it describes, the more likely it is to be
  just plain wrong"): two comments near the follow-speed-cap buffer and radius-aware spawn spacing
  still described Swarm's radius as 12px, left over from before the enemy size-tier redesign
  changed it to 9px a few versions ago. The formulas themselves were never wrong (they read
  `.radius` live off the enemy, so they auto-adjusted correctly) — only the illustrative numbers in
  the comments explaining *why* the formula exists had gone stale. No behavior change, pure
  documentation-accuracy fix.

## [1.0.154] - 2026-09-06
- Removed two confirmed-dead color helper functions (`jitterColorLightness()`,
  `darkerJitteredColor()`) — verified zero call sites anywhere in the file (not even a stale
  reference) before removing; superseded by `colorAtLightness()` when the tower skin-tone system
  was reworked earlier this session, but the old functions were never cleaned up.
- Found and fixed real, verified code duplication: `toCanvasCoords(e)` — a helper that converts a
  pointer event to world-space coordinates — sat completely unused while its exact two-line
  computation (`toRawCanvasCoords()` + camera pan/zoom adjustment) was manually copy-pasted at
  five separate call sites across the pointer-drag, hover-preview, and scenery-hover-price
  handlers. Consolidated all five onto the existing helper. Pure textual substitution with
  identical runtime output at every site — verified each one computes exactly the same values as
  what it replaced before making the change, not just that it looked equivalent.

## [1.0.153] - 2026-09-06
- Found and fixed a real, verified consistency gap while re-reading the Canvas 2D performance
  chapters against the actual rendering code: `ctx.shadowBlur` (a genuinely expensive per-pixel
  operation) is already correctly gated behind the Low-graphics setting in a couple of places, but
  the Mage's magic-missile projectile render used both `shadowBlur` *and* a per-frame
  `createLinearGradient()` allocation with no gate at all — Low graphics mode was silently not
  saving anything on the one projectile type that actually used the expensive path. Added the same
  gate used elsewhere: Low graphics now renders the missile with a flat stroke/fill (same silhouette,
  no gradient allocation, no shadow blur). Applied the same gate to the ground-item glow for full
  consistency (lower real impact there, since ground items are few and short-lived, but the setting
  should mean the same thing everywhere it's checked).
- Confirmed (rather than assumed) that `updateHUD()`/`refreshTrayUI()` are correctly event-driven
  — called only from the ~23 real gameplay events that actually change gold/lives/wave/tray state,
  never from the render loop — so no further action needed there; this matches the same
  event-driven-not-polled principle that motivated the `updateTargetFrame()` fix in 1.0.152.

## [1.0.152] - 2026-09-06
- Fixed a real, verified performance issue: `updateTargetFrame()` ran unconditionally at the top of
  `render()` (every single frame, 60fps) and did two `getBoundingClientRect()` calls (forcing
  synchronous browser layout) plus six unconditional DOM text/style writes every time, regardless
  of whether the target, its stats, or the panel's on-screen position had actually changed. Added a
  dirty-check: text/HP-bar content now only writes to the DOM when the underlying values
  (target identity, HP, armor, speed) actually change, and the expensive geometry recompute only
  runs when the frame just became visible or the layout may genuinely have moved (window
  resize) — not every frame regardless of state. No visible behavior change; the target nameplate
  still updates in real time whenever its values do.

## [1.0.151] - 2026-09-06
- Fixed the between-TYPE size hierarchy (ants smaller than Grunts, Tank/Boulder bigger than
  Grunts, etc.) being drowned out by the individual per-spawn size variance added in 1.0.150. That
  variance (±20%) was wide enough to overlap between adjacent types — every type's base radius was
  squeezed into a narrow 10-20px band except Boss, so a big Swarm (12×1.2=14.4) and a small Grunt
  (16×0.8=12.8) could land at nearly the same rendered size, erasing the type-level distinction the
  request was actually about. Two changes together fix it: widened the base radius values into
  clear tiers (mini 8-9 / small 11-14 / standard 14-16 / big 19-23 / huge 34 for Boss), and
  tightened individual variance from ±20% down to ±12% so it no longer crosses tier boundaries.
  Checked the resulting ranges directly: Swarm's largest possible individual (10.1px) is now well
  below Grunt's smallest (13.2px), and Tank's smallest (19.4px) is well above Grunt's largest
  (16.8px) — the type hierarchy is now reliable, not just usually-true. The HP/bounty stat
  correlation from 1.0.150 was rescaled to match the new, tighter variance range (still 0.9x-1.1x
  HP / 0.93x-1.07x bounty end to end). No changes needed anywhere else — the radius-aware spawn
  spacing and follow-speed-cap buffer formulas from earlier versions are written generically
  relative to a reference size rather than hardcoded per type, so they scale correctly with the new
  values automatically.

## [1.0.150] - 2026-09-06
- Added natural per-instance size variance to every enemy type. Radius (and therefore rendered
  size, since the emoji font size already derives from `this.radius` directly) was previously a
  fixed constant straight from `CONFIG.ENEMIES`, identical for every individual of a type — the
  only size variation that existed at all was the rare 0.5% golden "Big" variant. Now every
  ordinary spawn rolls 80%-120% of its type's base radius, so within one Swarm wave some ants
  genuinely read smaller and some bigger, not just uniformly identical. A modest, fair stat
  correlation goes with it — a smaller individual has proportionally less HP (0.85x-1.15x range)
  and is worth slightly less bounty (0.9x-1.1x), so a smaller hitbox isn't a free lunch for
  squeezing through congestion with no tradeoff. Skipped for the golden Big variant, which keeps
  its own distinct, consistent 1.4x scale-up rather than layering two separate size systems.
  Nothing else needed to change — all the pathing/collision code already reads `e.radius` live off
  each enemy instance rather than a fixed per-type lookup, so per-instance variance drops in
  cleanly on top of it.

## [1.0.149] - 2026-09-06
- Fixed the Mage attack pose (and every ranged tower's) visibly resetting to idle every time it
  briefly lost a target — even between two kills a frame apart. `this.angle` and `extra.hasTarget`
  (which drives the whole arm/staff pose, not just the aim direction) both snapped straight back to
  idle the instant `this.target` became null, then re-engaged the moment a new target was found —
  reading as the whole attack animation restarting constantly, even though the underlying cooldown/
  charge (fixed in 1.0.146) was never actually reset. Added a 500ms grace window
  (`recentlyEngaged`, anchored on `lastTargetTime`): losing a target now holds the last aim angle
  and engaged pose for half a second before falling back to idle, so a brief gap between targets no
  longer visibly resets the animation.
- Added a second, independent lever against on-path bunching, on top of the speed-based type
  reordering from 1.0.148: small, numerous enemy types (Swarm, Splitmini) still visibly bunch even
  with the mixed-speed catch-up problem eliminated, because their tiny radius means many of them
  physically fit within collision-trigger range of each other at the same flat spacing that's
  plenty of room for something bigger. Added a radius-aware minimum spawn gap, applied after the
  speed-based type reassignment so it reflects whichever type actually ended up in each slot — a
  Swarm-sized enemy (12px radius) now gets a meaningfully wider gap from the spawn before it than a
  standard 16-18px enemy does, while nothing changes for anything at or above that size.

## [1.0.148] - 2026-09-06
- Reordered wave spawn types by speed instead of leaving them in whatever order each curated/
  procedural wave's groups happened to list them in. A slow unit (Tank, Boss) spawning ahead of a
  faster one (Runner, Swarm) meant the faster unit inevitably caught up to it on the path and had
  its own speed capped to match (`followSpeedCap`, added in 1.0.139) — a direct, entirely avoidable
  contributor to visible on-path bunching, and one that happened on nearly every wave with mixed
  unit types, exactly as reported. Fixed at the source: after a wave's spawn queue is fully built
  and timed, the enemy *types* (not their delays/timing — every spawn still happens at the exact
  same moment as before) are reassigned across the queue so speed strictly decreases from the
  first spawn to the last. A fast unit now never spawns behind something slower in the first place,
  so it never needs to catch up and get capped by it.

## [1.0.147] - 2026-09-06
- Widened scenery size variance — `minScale`/`maxScale` was 1.0-1.3 (only a 30% size range, and no
  way to ever roll smaller than "normal"), which is why some pieces looked bigger than others but
  none looked genuinely small. Now 0.6-1.6, so a real range of small saplings/pebbles up through
  large old growth is possible. Clear cost/time still interpolate proportionally across the new
  range automatically (a small 0.6-scale piece is now correctly cheaper/faster to clear too, not
  just visually smaller).
- Added a distinct tall/stretched tree variant (25% of trees, 1.15-1.5x) — a genuinely different
  silhouette from just "a bigger tree," rolled independently of the normal size scale so a tree can
  be small-and-tall, large-and-stretched, or any other combination. The stretch is anchored at the
  tree's base rather than its center, so the trunk stays correctly planted at ground level while
  only the canopy extends upward — scaling from the center instead would have sunk the trunk into
  the ground as the tree got taller, which is the "correct layers" this was asking for.

## [1.0.146] - 2026-09-06
- Fixed a real aim mismatch on every ranged tower, most visible on Mage since its shots are now
  rare enough for a miss-looking hit to actually be noticed: the visible weapon rotation
  (`this.angle`) aimed straight at the target's *current* position, while the actual projectile
  fired along a lead-predicted angle accounting for the target's velocity (`fireProjectile()`).
  Against a moving target those two angles diverge, so the tower visibly aimed one way while the
  shot flew another. Unified them — the weapon now rotates using the same lead-predicted angle the
  shot will actually use, computed once per frame and reused directly in `fireProjectile()` instead
  of being recalculated a second time (guaranteeing they can never drift apart again).
- Added a real answer to "the charge should happen even if not targeting": Mage's cooldown was
  already ticking down regardless of whether a target existed (that part was never actually
  broken), but there was zero visual feedback of it — so during the new, much longer wait between
  shots the tower looked idle/unresponsive right up until it suddenly fired. The staff-tip orb now
  visibly grows and brightens continuously as the cooldown counts down (`chargeProgress`, driven
  purely by `cooldownTimer`/`cooldown`, with no dependency on having a target), with a fast white
  flicker in the final 15% before release. The long wait now reads as deliberate build-up instead
  of looking broken — and this should also make the "high-impact blood barely shows up" complaint
  resolve on its own, since it was really "the tower doesn't look like it's doing anything for 5-9
  seconds," not that the (already-amplified) hit effects themselves were too weak.
- Tightened the stall-watchdog failsafe added in 1.0.140 in response to continued reports of mixed-
  unit-type corner pileups: checks twice as often (every 500ms instead of 1000ms) and intervenes
  after ~1.5s of real stall instead of ~3s, with a stronger correction nudge (32px, up from 24) so
  it actually clears a mixed-size pileup rather than just inching forward. The "no real progress"
  threshold is now scaled to each enemy's own radius instead of a flat 3px, so a large Tank/Boss
  crawling a few pixels isn't mistaken for a stall the way a tiny fast Swarm doing the same
  genuinely would be.

## [1.0.145] - 2026-09-05
- Rebalanced Cleric (Mage's one evolution) to match Mage's new "high-impact, long-wait" identity
  instead of firing at a moderate, steady rate — the longest cooldown of any tower now, exactly as
  requested: cooldown roughly 5x (2500/2200/1900ms → 12500/11000/9500ms), damage 20% lower
  (14/20/28 → 11/16/22).
- Added a real visual match for the ability: Cleric's curse now manifests as an actual strike of
  white-hot holy light descending vertically onto the target from directly overhead, with a bright
  flash at the point of impact — not a plain colored particle puff like before. New
  `spawnHolyBeam()` reuses the shared particle pool (same pattern as the Mage shockring) so it
  costs one extra pool slot and fades on its own; only fires when the curse actually lands (not on
  a miss). The undead 5x-tick-damage bonus is unchanged.

## [1.0.144] - 2026-09-05
- Reworked Mage into a rare, devastating-shot class instead of a moderate-frequency damage dealer:
  cooldown increased exactly 5x across all three tiers (1080/960/840ms → 5400/4800/4200ms),
  damage reduced 20% (7/11/16 → 6/9/13), and projectile speed roughly doubled again on top of the
  earlier increase (660/700/740 → 1400/1500/1600 — by a wide margin the fastest projectile in the
  game; a literal 10x as originally described would put it at 6600+, which would cross the whole
  map in a fraction of a second and read as an invisible hitscan rather than a visible bolt, so
  interpreted as "dramatically faster" rather than the literal multiplier).
  **Balance note worth flagging directly**: a 5x longer cooldown combined with 20% less damage per
  hit is roughly a ~84% reduction in sustained DPS compared to before, and a similarly large drop
  in how often its slow debuff is actually applied to enemies. This is a deliberate, large role
  shift — Mage becomes an occasional, spectacular set-piece hit rather than a steady contributor —
  worth confirming that's the intended tradeoff in actual play, not just in the numbers.
  - The impact itself was amplified further to match the new rarity: more particles (36/20, up
    from 26/14), a guaranteed double shockwave ring (was a 40% chance for the second one), more
    satellite drops (7-9, up from 5-6), and more/bolder radiating streaks (4-7, up from 2-4). Same
    amplification applied to the death burst.

## [1.0.143] - 2026-09-05
- Cleaned up `updateBarricadesAndPileup()`, the pathing function that's had the most iteration
  this session: merged two pairs of loops that each iterated the same `active` array separately
  for no reason — computing `candidateBarricade` was its own pass right after building the
  `active` list even though neither step depends on the other having finished for every enemy
  first, and the same was true for the queue-position-reset pass and the claimed-slots pass right
  after the sort. Reduced from 7 full passes over the active enemy list down to 5, purely by
  combining genuinely independent, order-agnostic work — no behavior change, verified by the
  original `queueSlotDist === undefined` check in the claimed-slots loop being tautologically true
  in every case (since the very same merged loop had just set it), confirming the merge preserves
  identical results.
- Looked at two other real opportunities and deliberately left them alone rather than guess:
  the spatial hash (`buildEnemyHash()`) gets rebuilt up to 5 times per frame across swept
  collision, the 3-pass collision relaxation, and tower targeting — but each rebuild reflects a
  genuinely different point in time where positions have already changed since the last one, so
  collapsing any of them would mean resolving collisions against stale positions. Similarly,
  `queryNearby()` allocates a fresh array on every call (called dozens of times per frame) — a
  shared/reused buffer would cut that allocation pressure, but would require verifying zero
  reentrancy across every caller (`findTarget`, `updateSwordsman`, `updateClericSmite`, and others)
  to guarantee nothing reads a stale buffer mid-use, which wasn't verifiable with full confidence
  in this pass. Both are real, specific leads for a future session with room to verify them
  properly — flagged here rather than either ignored or guessed at.

## [1.0.142] - 2026-09-05
- Fixed Mage's long blood streaks reading as too thick. `spawnBloodCastoff()`'s `sizeMult`
  parameter previously scaled length and width identically, so a "longer, bolder" streak got
  proportionally thicker into more of a smear than a line. Width now scales at just over half the
  rate of length (a dampened curve), so a long streak actually reads as long and thin, the way a
  real cast-off streak should. Also pulled Mage's own streak `sizeMult` range down (1.8-2.6 →
  1.4-2.0) on top of that general fix.
- Fixed blood decals rendering on top of trees/rocks instead of underneath them. `drawScenery()`
  was called before `drawDecals()` every frame; swapped the order — blood now sits on the ground
  and scenery (a physically taller object) correctly occludes any stain directly behind it, instead
  of stains appearing painted over tree canopies.
- Removed the pulsing yellow "upgrade available" glow ring that rendered under every tower whose
  next gold-tier upgrade the player could currently afford — redundant with the tower panel's own
  scroll/upgrade indicator, and with enough affordable towers on screen at once it read as visual
  clutter rather than useful signal.
- Footprints now genuinely streak/smear rather than staying uniform round dots when an enemy has
  just stepped through a large blood pool — the first few steps out of a big pile drag an
  elongated mark that gradually shortens back to a normal print as the extra blood from that pile
  runs out, instead of every footprint (big pile or small) looking the same shape.
- On the reported bunching: the fixes already shipped this session (proportional follow-speed-cap
  buffer, stronger tangent-bias separation, single-attacker-per-barricade, and the stall-watchdog
  failsafe in 1.0.140 that forces any illegitimately-stuck enemy to keep progressing after 3
  seconds) are all still in this build and confirmed present in the code. No new structural
  pathing change went into this version specifically, since there's no new concrete lead beyond
  what's already been tried — if a Swarm-heavy wave is still visibly clumping after 1.0.139/1.0.140,
  the most useful next step would be pinpointing whether it's a hard stop (the stall watchdog
  should catch that within ~3s) or just slow/congested movement through a genuine chokepoint
  (which is closer to expected behavior than a bug).

## [1.0.141] - 2026-09-05
- Mage's projectile speed increased substantially: 520/550/580 across its three tiers, now
  660/700/740 — now the fastest projectile in the game (previously Gatling's 560-640 was faster),
  matching the "high impact, high energy" identity the blood effects have been building toward.
- Added long, bold radiating blood streaks to Mage hits and kills — previously the Mage burst was
  all particles, satellite drops, and shockwave rings, with no actual streak lines the way Warrior
  gets. 2-4 bold cast-off streaks (sizeMult 1.8-2.6, longer than even Warrior's cut) now fan out
  omnidirectionally from the impact point on every hit — omnidirectional rather than aligned to
  one strike vector, since a magical blast has no swing direction the way a blade does. Kills spawn
  3-5 of the same streaks for extra intensity on the killing blow.

## [1.0.140] - 2026-09-05
- Added a last-resort anti-bunching failsafe, independent of whatever the specific root cause of
  any given stuck-cluster bug turns out to be — this session has found and fixed several genuine
  contributing bugs to enemy clumping, but rather than continuing to chase the next possible edge
  case one at a time, added a structural guarantee that bunching can never permanently block a
  wave's progress at all, regardless of cause. `checkStallWatchdog()` tracks each enemy's actual
  path progress (`traveled`) over rolling ~1-second windows. Every *legitimate* reason an enemy
  stops advancing (queued at a barricade, stunned) is explicitly excluded up front and never
  accumulates a strike. For everything else — an enemy that isn't supposed to be blocked at all
  but has made essentially no forward progress for 3 consecutive seconds anyway — it gets a single
  forced nudge directly toward its next waypoint, bypassing the normal collision-limited movement
  just for that one correction, and the counter resets. This is invisible during ordinary play (it
  only ever fires when something has already gone wrong elsewhere) and doesn't fix any specific
  bug on its own, but it's a hard ceiling: no enemy can now be stuck in place for more than a few
  seconds, no matter what future or undiscovered issue might otherwise cause it.

## [1.0.139] - 2026-09-05
- Found a likely real contributor to the "swarm cluster stuck in a column" issue reported with
  screenshots of a Swarm wave. Two changes:
  - The follow-speed-cap's trigger buffer (how close a unit needs to be to the one ahead before its
    speed gets capped to match) was a flat 14px regardless of unit size. That's trivial for a
    Tank/Boss, but over 1.5x a Swarm's entire diameter (radius 12) — meaning a dense cluster of
    small, fast Swarm units was capping each other's speed far more eagerly than proportionally
    reasonable, cascading a "slow down and wait" chain through an entire tightly-packed group even
    when there was still plenty of physical room to keep moving. The buffer now scales with the
    pair's own combined radius (capped at 14, so larger units are unaffected), which meaningfully
    tightens the trigger range for small enemies specifically.
  - Reduced the collision-separation tangent-bias's cross-path damping from 0.45 to 0.3 — dense
    clusters of many identical-speed units (exactly what a big Swarm wave funneling through a
    single-tile entrance produces) settle faster when separation leans further into sliding past
    each other along the path instead of jostling side to side, which is what let a tightly-packed
    group keep shoving each other without making net forward progress.
  - This is a genuine improvement to a real contributing mechanism, but given how many angles this
    class of bug has had, worth confirming against fresh gameplay before considering it fully
    closed — please flag if a Swarm-heavy wave still visibly clumps after this.

## [1.0.138] - 2026-09-05
- Archer and Mage hits/kills now carry just as much visual presence as Warrior's slash, matching
  the actual request rather than the earlier interpretation of "low-impact" as "visually sparse":
  - The persistent ground-mark chance is now archetype-aware — Archer and Mage were leaving
    visibly fewer lasting marks than Warrior even though each is just as intense in its own way,
    so both now roll at 50% instead of the shared 30% (Warrior stays at 30%, since its cut-line +
    arc are already a guaranteed, substantial mark every hit).
  - Archer keeps its low-concentration puncture identity but the mist now scatters as 2-3 droplets
    per hit instead of 1, plus an occasional short graze streak — less blood *concentration*, but
    just as many visible marks, achieved through spread rather than volume. Same boost applied to
    its death burst (more drip trails, more far-flung droplets).
  - Mage gets more satellite drops per hit (5-6, up from 4) and death (4-6, new), plus a chance of
    a second, tighter inner shockring on some hits for extra flourish.

## [1.0.137] - 2026-09-05
- Made the BLADE (Swordsman/Axeman) slash pattern itself genuinely unique per hit, not just
  randomized in shape:
  - The cut-line's size now scales with how hard the hit actually was (using the same severity
    value already driving hit-flinch) — a glancing graze leaves a thin nick, a heavy blow a bold,
    unmistakable gash, instead of every blade hit drawing the identical size line regardless of
    damage dealt.
  - Axeman's dual axes now produce two independent, overlapping cast-off arcs from slightly
    different angles (with a chance of a third, smaller one), instead of the exact same single-arc
    effect Swordsman gets — dual-wielding finally reads as a genuinely different weapon rather
    than reusing one-blade gore.
  - Added a small per-hit color micro-jitter on top of each enemy's own fixed blood tint for the
    cut-line and arc specifically — real blood shade varies slightly hit to hit (oxygenation,
    thickness, freshness), not one flat tone reused for every slash a given enemy ever takes.

## [1.0.136] - 2026-09-05
- Found the actual reason melee blood kept reading as repetitive: every WARRIOR-archetype class —
  Swordsman and Axeman (bladed), but also Hammerman/Paladin (blunt mace) and Spearman (thrusting
  spear) — produced the exact identical cut-line-plus-cast-off-arc pattern regardless of what
  weapon actually hit. Added `resolveWeaponSubtype()` and split the WARRIOR branch into three real
  wound geometries: **BLADE** (Swordsman/Axeman) keeps the cut-line + cast-off arc; **BLUNT**
  (Hammerman/Paladin) now produces genuine blunt-trauma impact spatter — an omnidirectional burst
  with no single directional cut line, since a mace crushes rather than cuts; **PIERCE** (Spearman)
  now produces a real puncture-and-gush along one line, closer to an arrow wound in geometry but
  more violent, with no perpendicular cut-line and no swing arc since a thrust doesn't sweep
  tangentially. The death-time cessation cast-off arc is now also gated to bladed weapons only —
  a mace or spear doesn't carry blood on an edge the way a sword does.
- Widened `spawnCastOffArc()`'s own randomness substantially — drop count (was a narrow 4-6, now
  3-8), angular step, and a new overall per-call `scale` factor that varies the whole arc's reach
  and tightness together, on top of the existing per-drop jitter. A full-force overhead swing and
  a quick short jab no longer produce arcs that read as the same shape just repositioned.

## [1.0.135] - 2026-09-05
- Mage impacts are now unmistakably the most violent of the three archetypes, not just "more
  particles than before." Added `spawnShockring()` — a brief expanding, fading ring at the point
  of impact, reusing the existing particle pool (new `isRing` flag) so it costs nothing extra to
  manage. Mage hits and kills now spawn this ring alongside a bigger, faster particle burst
  (26/14 on hit, up from 22/10; 28/18 on a low-graphics-safe death burst, up from 22/14) and
  slightly stronger back-spatter.
- Archer impacts now follow the requested tradeoff exactly: less blood and a smaller immediate
  burst (particle count cut further, from 5 to 4 on hit), but real forensic accuracy to how a
  genuine high-velocity fine mist behaves — low friction (0.94, up from 0.85) means the spray that
  does fly carries much more of its initial speed before settling, and a chance of one satellite
  droplet flung 2.6x further than the normal scatter range. Less volume, more distance — the
  opposite tradeoff from Mage's big-but-close burst. Applied the same "fewer particles, one
  far-flung droplet" identity to Archer's death burst for consistency with the hit-time behavior.
- Added a `distMult` parameter to `spawnSatelliteDrops()` so a specific caller (Archer's far-flung
  mist droplet) can send a drop well beyond the normal scatter range without changing the default
  behavior for every other caller.

## [1.0.134] - 2026-09-05
- Simplified the table-of-contents comment added in 1.0.133 — dropped the line numbers (which
  drift as the file changes and were half the clutter) and the mixed prose/description format in
  favor of a single clean line of section names to search for, matching the plain style of the
  section headers themselves.

## [1.0.133] - 2026-09-05
- Code-quality pass with zero gameplay/behavior changes, focused purely on readability and
  maintainability:
  - Added a table-of-contents comment at the very top of the script listing every major section
    (config, entity classes, wave system, main loop, UI wiring, etc.) with its approximate line
    number, so navigating this large single-file codebase — by a human or an AI working on it — 
    doesn't require scrolling blind or guessing which section a given system lives in.
  - Extracted `isEnemyFrozen(e)` — the exact same "is this enemy currently unable to move" check
    (blocked at a barricade OR stunned) was independently duplicated 5 times across 3 different
    functions (`updateBarricadesAndPileup`, `resolveSweptEnemyCollisions`,
    `resolveEnemyCollisions`). Centralized into one named helper with identical logic — this is a
    pure DRY refactor with no behavior change, it just means there's one definition to update if
    "frozen" ever needs to account for a new status effect in the future, instead of five.
  - Deliberately did not touch performance-sensitive areas (e.g. the 3-pass collision relaxation's
    per-pass spatial-hash rebuilds) where a naive optimization could subtly change collision
    accuracy — safe correctness took priority over speculative speedups there.

## [1.0.132] - 2026-09-05
- Sword slashes now produce a real cast-off ARC, not just a straight streak. Checked the
  bloodstain-pattern-analysis reference directly: real cast-off (blood thrown from a weapon during
  a swing) travels tangentially to the arc of that swing and lands as a curved trail of individual
  drops — "wide or narrow linear or slightly curved trails... with the more elongated bloodstains
  most distant from the source," rounder near the origin and progressively more elongated further
  along the arc as the impact angle gets more acute. Added `spawnCastOffArc()`, which places a fan
  of individual teardrop stains along a curving path away from the wound, each oriented tangent to
  its own point on the arc (the actual direction that specific drop was flung, not radially outward
  from the wound) with increasing elongation further out — a real swing-arc pattern instead of one
  straight line. Warrior melee hits now spawn the direct cut-line at the wound itself PLUS this
  cast-off arc trailing away from it; the killing blow's death-time cast-off also switched from a
  straight streak to the same arc (a cessation cast-off — the blade stops abruptly at the target
  while blood already in flight keeps going, per the same reference).

## [1.0.131] - 2026-09-05
- Found the real reason Warrior/Archer/Mage blood still looked the same despite the archetype-
  specific hit particles from 1.0.128: those particles fade within about a second, but the ground
  decal — the thing that actually persists for up to 30 minutes and is what a player is really
  comparing when they say two classes "look the same" — fell through to one shared shape profile
  for both Warrior AND Mage, and had no size difference between any archetype at all. Now all four
  archetypes have their own distinct pool shape AND size: Archer pools are long, narrow, and
  noticeably smaller (a real puncture drags into a thin streak, not a wide pool); Mage pools are the
  biggest and roundest of the four (a violent, omnidirectional high-energy impact); Explosive stays
  round but mid-sized; Warrior keeps its original moderate directional smear. Also gave the Warrior
  slash-wound cast-off line its own bold size multiplier (1.8x length/width) so it reads clearly as
  an actual cut instead of just another same-size generic streak.

## [1.0.130] - 2026-09-05
- Simplified the Shop down to one unified view instead of switching between Items/Passives/
  Inventory tabs — with only one item in the game (Lucky Branch) and three passives, tab-switching
  was more navigation than the content actually needed. Removed the Inventory tab entirely (it just
  listed every tower's equipped items, redundant with each tower's own panel) and now show equipped
  items, the Lucky Branch purchase card, and the three passive upgrades together in one scrollable
  list, with a section divider between items and passives. Current wood/stone is now shown right in
  the shop note line instead of being tucked away in the removed Inventory tab.
- Lucky Branch now also costs wood (15), not just gold — gives wood collected from clearing scenery
  an actual use again now that it's not spent on the old per-class Masterwork gear tier.

## [1.0.129] - 2026-09-05
- Fixed enemies not reliably picking up footprints when walking through big blood puddles. The
  wet-feet pickup check compared an enemy's distance to a pool decal's stored anchor point only —
  but a big or massive pool's actual blobs can spread well beyond that anchor, so an enemy visibly
  standing in the edge of a large puddle wasn't detected as being "in blood" unless it happened to
  be near the exact center point. Each pool decal now records how far its own blobs actually reach
  (`footprintRadius`), and the pickup check extends its range by that amount — matching what's
  actually drawn on screen instead of just the stored coordinate. Stepping in a genuinely big pool
  now also picks up a little more blood, taking a couple of extra steps to run dry than a small
  splatter does.

## [1.0.128] - 2026-09-05
- Fixed embedded arrows appearing to stick out of a random side of the enemy (sometimes the middle,
  sometimes the far side) regardless of where the shot actually came from. The embedding position
  was a fully random angle around the enemy, unrelated to the arrow's real flight path. It now
  anchors on the near side relative to the shot's travel direction (the side facing the shooter,
  where the arrow struck first), with the arrow's own angle matching the real flight path so the
  head visibly points inward and the shaft sticks out the correct entry side, with a little natural
  lateral scatter so it's not the exact same spot every time.
- Added themed status-effect visuals instead of every effect being a flat colored circle wash:
  drifting ice-crystal icons around a slowed/frozen unit, flickering flame icons around a burning
  one, and lightning bolts orbiting above a stunned one's head (stun previously had no dedicated
  visual at all). The colored circle tint stays underneath as a base, with the icons on top making
  what's actually affecting a unit readable at a glance.
- Fixed stun/slow only propagating one unit back through a queue instead of cascading through the
  whole line. A follower's speed cap was computed from the unit ahead's own base speed and slow
  debuff, but not from whatever cap THAT unit had already inherited from further ahead — so a
  stunned unit would correctly freeze the one directly behind it, but a third unit further back
  only checked the second unit's own (unaffected) stun state and missed the inherited block
  entirely. The cap now folds in whatever the unit ahead is already limited to, so a stun or slow
  correctly cascades back through an entire queued line, not just to the immediate follower.
- Extended the archetype-specific blood identity (melee slash / archer puncture / mage burst) from
  hits to kills as well — previously only the EXPLOSIVE (Bomber) death burst was differentiated,
  everything else shared one generic "ordinary death" burst regardless of what actually killed it.
  Archer kills now stay low-impact even in death (minimal burst, drip trails instead of a wide
  gush); Mage kills get a faster, wider, higher-energy burst than an ordinary collapse; Warrior
  kills keep the existing directional-collapse-with-arterial-gush behavior.
- Added back-spatter to Mage hits: a small amount of fine mist thrown back toward the source, not
  just forward through the target — real high-velocity impacts do this, and it's specifically what
  forensic investigators look for to determine where a shot came from, so it fits the "high-impact"
  identity Mage hits are going for.

## [1.0.127] - 2026-09-05
- Fixed two units visibly overlapping/occupying the same space at a barricade, which was also the
  real cause of what looked like enemies "jamming up on corners" near barricades. The 1.0.125 fix
  that limits a barricade to one attacker at a time set `pileBlocked = true` for every enemy found
  touching it — attacker and non-attacker alike — before deciding which one was the real attacker.
  Since the queue-catchment pass (which assigns a real, non-overlapping resting slot) skips any
  enemy that's already `pileBlocked`, the non-attacker "runner-up" enemy was marked blocked without
  ever being given a slot, so it just sat wherever it already was — directly overlapping the
  attacker. Now only the actual attacker gets `pileBlocked` set in that step; anyone else who was
  also in contact range falls through to the queue-catchment pass and gets a proper slot behind the
  attacker instead.
- Impact blood is now genuinely distinct per weapon archetype instead of two of the three sharing
  one generic branch:
  - **Melee (Warrior)** now reads as an actual laceration: cast-off streaks are angled roughly
    perpendicular to the strike direction (the cut line itself, since a slash travels across the
    target rather than straight into it) and bleed along both directions of that line, with a
    chance of a running drip down from the wound — a knife/blade wound, not a generic splash.
  - **Archer** flipped from a high-velocity spray cone to a genuine low-impact puncture: a handful
    of low-speed particles right at the wound and a strong chance of a slow drip, since an arrow
    makes a small precise hole rather than blasting blood outward with force.
  - **Mage** is now its own dedicated branch (previously grouped in with Warrior) — fast, wide, high
    particle-count radial burst plus an instant cluster of satellite drops, reading as a violent,
    high-energy magical impact rather than a controlled directional spray.
- Reduced the flat per-spawn delay bonus from 2000ms down to 400ms. Wave spawning now also pauses
  reactively whenever anything is actually queued at a barricade (1.0.125) and enforces a 350ms
  global minimum gap between any two spawns regardless of congestion — with those two handling real
  congestion control, unconditionally taxing every single spawn by a full 2 seconds was needlessly
  slow when the lane was completely clear.
- Added a safety valve against a permanent soft-lock: if a barricade jam holds continuously for 15
  seconds — most critically if the player is out of gold and literally cannot afford anything that
  would break it — wave spawning now force-resumes regardless of whether the jam actually cleared.
  Without this, an unbreakable jam combined with an empty wallet could pause spawning forever,
  preventing the wave (and the run) from ever finishing.

## [1.0.126] - 2026-09-04
- Reworked the item system to be WC3/Dota-style: one shared item pool for every tower instead of
  14 separate class-specific gear lists. Replaced the entire `SHOP_ITEMS` structure (Wooden/Iron/
  Gold/Masterwork tiers per class, ~50 individual items) with a single universal item — **Lucky
  Branch** 🌿, +1 STR / +1 DEX / +1 INT — usable by any tower, any class, no restrictions. More
  items can be added to this same shared list later without touching anything else. The pre-existing
  rare "Sturdy Branch" scenery-clear drop was the same concept already (a universal +1/+1/+1 relic)
  and is now unified with the shop item as the same object.
- Towers no longer start with a free class-specific "starter" weapon — matching Dota/WC3, units
  start with empty item slots and you equip everything yourself. Items also now carry through
  evolution instead of being cleared (they're universal, so they still make sense on the new class).
- Items can now be dragged directly from one tower to another, WC3/Dota-inventory style. Tapping a
  filled item slot in a tower's panel picks the item up (removing it from that tower on the spot)
  and hands control to the same drag-and-drop pipeline already used for picking up ground/relic
  item drops — drag it over another tower on the map and release to equip it there instead, no gold
  charged either way since this moves an already-owned item rather than buying one. Added a new
  `Tower.prototype.receiveItem()` for this (and for ground pickups) that never touches gold/wood/
  stone, since reusing `buyItem()` for a transfer would have incorrectly re-charged for an item the
  player already paid for. Tapping an empty slot still opens the shop, same as before.
- Shop UI simplified from 14 per-class tabs down to one shared Items tab (plus the existing
  Passives and Inventory tabs) — any tower can buy directly from the same list once selected.

## [1.0.125] - 2026-09-04
- Fixed multiple enemies simultaneously "attacking" the same barricade at once. Contact range
  (radius+14px) was generous enough that two or three enemies squeezed together on a wide tile
  could all independently register as touching the same barricade, each playing the contact-bump
  animation as if several were hitting it at the same time. `updateBarricadesAndPileup()` now picks
  exactly one front-most enemy per barricade as the actual attacker (bump animation + damage tick);
  everyone else in contact range is queued and frozen like normal, waiting their turn, instead of
  also visibly attacking.
- Wave spawning now pauses entirely while any enemy is queued/waiting at a barricade, instead of
  continuing to add new enemies on top of an already-backed-up line. `waveTimer` itself freezes
  while paused (not just the spawn check), so nothing becomes "overdue" and there's no burst of
  catch-up spawns the instant the blockage clears — spawning just resumes exactly where it left off.
- Fixed the last enemy of a wave sometimes getting visibly cut off mid death-animation. `die()`
  sets the enemy inactive immediately but its squash-and-fade animation (added in 1.0.124) still
  has up to ~220ms left to play; the wave-complete check only looked at whether any enemy was still
  `active`, so on the very last kill of a wave it could trigger the wave-complete
  popup/transition on the exact same frame the corpse's animation started. Wave completion now also
  waits for any in-flight death animation to finish before triggering.

## [1.0.124] - 2026-09-04
- Added two missing pieces of core hit-feedback/death animation, both purely render-only additions
  with zero interaction with pathing, collision, or targeting logic:
  - **Hit-flinch reaction** — every hit now nudges the enemy sprite a small amount away from the
    strike direction, decaying back to rest over ~130-220ms depending on how heavy the hit was
    (a graze barely registers, a heavy blow visibly rocks the target back). This never touches
    `this.x`/`this.y` (or `traveled`/`pathIndex`) — it's applied the same way the existing
    barricade-bump wiggle already was, as an additive render-only offset in `draw()`, so it's
    completely safe regardless of how often it fires and applies whether or not the gore toggle is
    on, since it's core hit feedback rather than a gore effect.
  - **Death animation** — enemies previously vanished the instant their HP hit 0. `die()` now
    captures a lightweight, fully decoupled squash-and-fade snapshot (`spawnDeathAnim()`, tracked
    entirely outside the `Enemy`/`enemyPool` system in its own small array) before deactivating the
    enemy, so a kill now visibly settles over ~220ms instead of popping out of existence. Being
    fully decoupled from the enemy object itself means it carries no risk of a "dying but still
    targetable/collidable" state — the real enemy is gone immediately as before; the animation is
    just a brief visual echo drawn on top.

## [1.0.123] - 2026-09-04
- Fixed blood corridors accumulating into an endless "spaghetti" of streaks along any lane that saw
  sustained fighting (e.g. an Archer repeatedly hitting enemies walking down the same stretch of
  path over a whole wave). Every accessory blood mark (cast-off streaks, drip trails, satellite
  drops, footprints) had no upper bound on how many could stack in the same small area over time —
  each individual hit was reasonably sized on its own, but a heavily-fought corridor just kept
  layering more on indefinitely. Added a local saturation check in `pushDecal()` (the single choke
  point every blood decal already passes through): once a spot already has ~10 accessory marks
  within a 26px radius, further ones there are skipped instead of piling on. The main wound pool
  decal (the one with a `blobs` array — one per hit/death) is exempt, so a fresh wound still always
  gets its mark; only the smaller repeating accessory marks are capped. A real fought-over spot
  still reads as visibly bloodied, it just stops growing new distinct streaks past a realistic
  saturation point instead of accumulating without limit for the rest of the wave.

## [1.0.122] - 2026-09-04
- Three real bloodstain-pattern-analysis (BPA) principles added to the blood system, not just more
  volume:
  - **Distance-based droplet shape** — `spawnSatelliteDrops()` now ties a droplet's elongation and
    width to how far it actually landed from the source. A droplet that travels further strikes at
    a shallower angle and carries less mass, so it stretches into a longer, more directional
    teardrop while getting narrower; near-origin drops stay rounder and squatter. Previously length
    and width were independent random rolls with no relationship to the distance the drop itself
    landed at.
  - **Archetype-aware pool elongation** — `spawnDecal()` now varies aspect ratio by attacker
    archetype instead of a single random range for everything: a high-velocity piercing hit
    (Archer) strikes at a shallow angle and drags into a long, directional stain; an omnidirectional
    blast (explosive) has no single strike vector and pools closer to circular; ordinary melee/magic
    hits fall in between. Reflects the real BPA relationship between impact angle and stain shape.
  - **Bleeding cessation taper** — the bleed DOT no longer spurts at constant full intensity and
    then cuts off dead the instant it expires. Spurt particle count, and the chance of a fresh
    satellite drop/decal/drip trail on each tick, now taper down as the wound approaches its own
    natural end (down to roughly a third of peak intensity right before it closes), matching how
    real bleeding actually winds down rather than stopping abruptly.

## [1.0.121] - 2026-09-04
- Removed the decal grow-in animation entirely. Every blood decal (pools, streaks, drip trails,
  droplets, skin peels) previously animated from small to full size over a short window after
  spawning — even shortened to 180ms in the last pass, this was still a visible fade/expand effect,
  not how real blood spatter behaves: an impact deposits blood at full extent in that instant, it
  doesn't grow into shape afterward. `growT` (the animation's 0-1 progress value used throughout
  `drawDecals()`) is now a fixed 1, so every decal renders at its full, final size on the exact
  frame it's created. This is a straightforward accuracy fix, not a tuning pass — no more grow
  animation, at any duration, for any decal type.

## [1.0.120] - 2026-09-04
- Fixed blood pools ballooning into one huge, unreadable solid mass instead of distinct forensic
  splatter. The 1.0.118 pass that fixed repetitive shapes also left `spawnDecal()`'s size tiers far
  too large (rare pools up to 6.5x size with up to 15 blobs) and, combined with 1.0.118 removing
  `smallBias` from the death-pool call (needed so deaths could roll bigger than hits, but with no
  upper guardrail), several nearby deaths could each independently roll a massive pool and merge
  into a single dominating blob — exactly what the screenshots showed. Size tiers are now capped
  much lower across the board (max ~2.6x instead of ~6.5x, max 9 blobs instead of 15, smaller blob
  radii), and the extra streak/drip-trail/satellite-drop frequency added in 1.0.116 is dialed back
  down (fewer decals per hit and per death) so the forensic shape variety from 1.0.118 stays
  readable as distinct splatters instead of solid coverage.
- Fixed blood appearing to keep "blooming" after the enemy that caused it was already gone. Every
  decal grows from small to full size over a fixed animation window — this was 700ms, which on the
  now-much-larger pools was long enough to visibly notice a puddle still expanding well after the
  corpse had already vanished (the enemy is removed instantly; the pool's own grow-in animation
  isn't), reading as delayed/out-of-nowhere blood even though it was triggered at the correct
  instant. Shortened to 180ms — still a soft appearance, not an instant pop, but fast enough that
  it no longer visibly outlives the death that caused it.

## [1.0.119] - 2026-09-04
- Fixed drip trails and cast-off streaks reading as oversized. The size widening in 1.0.118 (aimed
  at breaking up repetitive shapes) overshot on raw size along with it — `spawnDripTrail()` length
  pulled back from 12-38px to 7-20px and width from 1.6-3.2px to 1-2px; `spawnBloodCastoff()`
  length pulled back from 9-35px to 8-24px and width from 1.3-4.5px to 1-2.6px. Shape variety
  (random orientation, angle jitter) from 1.0.118 is untouched — only the raw dimensions were
  too big.
- Fixed footprints becoming noticeably rarer. `updateWalkingBlood()`'s wet-feet pickup check only
  scanned the most recent 40 decals (within the last 4 seconds) for something nearby to step in —
  with several more streaks/drips now spawned per hit and per death, those 40 most-recent decals
  could easily all belong to a fight happening somewhere else on the map within a couple of
  seconds, so an enemy standing right next to an actual puddle would still find nothing fresh
  enough to pick up. Widened the scan to the most recent 220 decals and the freshness window to 7
  seconds. Footprints themselves are also sized up slightly and drawn at higher opacity (0.55x ->
  0.7x of the fade factor) so they read clearly against the larger splatters/streaks around them
  instead of getting visually lost.

## [1.0.118] - 2026-09-04
- Fixed blood splatters looking repetitive/patterned instead of forensically unique per hit.
  `spawnDecal()` (the main pooling splatter) previously jittered its blobs inside the exact same
  fixed rectangular envelope every time — same aspect ratio, same orientation, independent uniform
  jitter — just rescaled by size, so any two same-size splatters looked like the same shape moved
  around. It now gives every decal its own randomized identity: a random orientation (loosely
  following the actual impact angle when the caller has one, otherwise fully random), a random
  aspect ratio (independent elongation and narrowness per decal, so some splatters end up nearly
  round and others a long smear), and blobs placed with a center-weighted polar distribution
  instead of rectangular jitter — a dense core with scattered outliers, the way a real bloodstain
  actually forms, plus mostly small flecks with occasional bigger merged blobs rather than every
  blob drawing from one narrow radius band. Also fixed the death-pool decal call incorrectly
  passing `smallBias=true`, which forced literally every kill's pool into the same narrow size
  band and skipped the big/massive pool rolls entirely — every death looked the same size, which
  was a large part of the repetitive look. Cast-off streak (`spawnBloodCastoff`) angle/length/
  width jitter ranges were also widened, since the previous narrow bands (±0.15 rad, 14-28px,
  2-3.5px) made every streak read as the same shape too.

## [1.0.117] - 2026-09-04
- Fixed blood appearing to spawn out of nowhere several seconds after an enemy had already died.
  `startDripSite()` (used for both a heavy mid-combat wound and the killing blow) scheduled a
  delayed trickle of up to 8 drops landing over the following ~2-5 seconds at a fixed world
  position — but that schedule was completely decoupled from the enemy itself (it only stored x,y,
  not a reference to the unit), so it kept firing regardless of whether the enemy was still alive,
  already dead, or long gone. A killing blow's own drip burst could keep adding new blood at that
  spot for several seconds after the body was already gone, which is exactly the "blood coming from
  nowhere" a few seconds post-death. `startDripSite()` now fires its entire burst immediately, at
  the actual instant of the hit or the instant of death — same total amount of blood (still
  proportional to how heavy the hit was), just with zero delay, so blood now only ever appears at a
  real moment of impact or death, never afterward. The separate ongoing low-HP passive drip and the
  bleed DOT tick are unaffected by this — both are already gated on the enemy still being alive
  (`hp > 0`) each frame, so they've always stopped the instant an enemy actually dies.

## [1.0.116] - 2026-09-04
- More blood streaks, and more realistic-looking blood overall. Added a new decal type,
  `spawnDripTrail()` — a gently curved running drip with a small pooled bead at the tip, rendered
  with a quadratic curve rather than a straight line, distinct from the existing straight cast-off
  streak (which reads as the initial spatter at the moment of impact, not what blood does a beat
  after landing). Wired it into hits, deaths, the ongoing low-HP passive drip, and the bleed DOT
  tick, so running drips show up throughout combat, not just at the killing blow. Also increased
  streak frequency generally: hit-time cast-off chance raised (30-55% -> 50-75%), plus a chance at a
  second off-angle streak per hit since real spatter rarely lands as one clean line; satellite drop
  chance on hit raised from 50% to 65%; death now spawns a 2-3 streak fan around the strike
  direction instead of a single 40%-chance streak, 2-3 drip trails off the death pool at varying
  angles, and more satellite drops (3-6, up from 2-4).

## [1.0.115] - 2026-09-04
- Pants (skinShade) lightness range widened and shifted up — was a uniform 18-85 (mean ~51), which
  landed in the visually dark/muddy zone often enough that it read as "pants are always dark," even
  though the roll itself was already uniform random. Several classes' pants base hue is fairly
  saturated (deep red, violet, etc.), which reads darker to the eye than the same lightness number
  would on a lighter hue. Now rolls uniformly across 28-92 (mean ~60) — still a wide 64-point spread
  so genuinely dark pants remain a real possibility, just no longer dominating the distribution.

## [1.0.114] - 2026-09-04
- Fixed fast units trying to walk past a slower unit directly ahead of them on the same single-file
  path — there's no lane to pass in, so every frame the faster unit kept computing its own full
  speed and shoving into the slower unit's back, which the collision passes then had to keep
  fighting right back. That push-and-correct cycle every frame is what read as jittery bumping
  whenever a fast type (Runner, Wraith, Swarm) caught up to a slow one (Tank, Zombie, Boulder).
  `updateBarricadesAndPileup()` now computes a `followSpeedCap` for each enemy once something is
  genuinely close ahead of it (near actual contact distance, not just anywhere on the same path),
  set to that leading unit's own current effective speed — 0 if the leader is stopped/frozen. Enemy
  movement now clamps to that cap when it's lower than the unit's own speed, so a fast unit
  naturally slows to match the pace of whatever's directly in front of it instead of trying to
  overtake. Units with nothing close ahead are completely unaffected and move at full speed.

## [1.0.113] - 2026-09-04
- Rebalanced damage growth so the primary stat (STR for Warriors, DEX for Archers, INT for Mages)
  is the dominant lever for how hard a tower hits, instead of gold-tier level-ups alone. Every
  class's raw tier table has a large built-in damage jump from tier 1 to its max tier (e.g.
  Swordsman goes 18 -> 78, a 4.3x increase) that previously carried through in full and then got
  the primary-stat multiplier applied on top of it — so most of a tower's total damage growth came
  from spending gold on levels, and investing stat points barely moved the needle by comparison.
  `Tower.prototype.applyTierStats()` now anchors to tier 1's own damage and only lets 45% of the
  growth above that baseline carry through before the stat multiplier applies. Leveling up still
  feels rewarding — more range, faster cooldown, unlocked mechanics, and a real but smaller damage
  bump — but the primary stat is now what actually drives a tower's damage ceiling. Applies
  universally from one place, covering every tower's ranged/primary damage and (for Axeman) its
  separate melee-swing damage the same way.

## [1.0.112] - 2026-09-04
- Fixed multiple enemy types dumping onto the spawn tile at the exact same moment, a direct cause
  of on-path bunching. Each wave definition can have several concurrent enemy-type groups (some
  curated waves have 6-8), and every group's first unit starts at delay 0 — so a wave with, say,
  Grunt/Swarm/Tank/Fire groups all beginning at once spawned all four on the same tick, stacked on
  the same tile, before pathing had any chance to spread them out. The previous per-group spacing
  only staggered spawns within one type's own group and did nothing to prevent this cross-group
  overlap. The fully merged, sorted spawn queue now gets a pass enforcing a hard 350ms minimum gap
  between every individual spawn regardless of which group it came from — any spawn that would land
  too close to the one before it gets pushed later in time instead.

## [1.0.111] - 2026-09-04
- Fixed skin and pants tone not actually being independent of the class's preset color — Mage in
  particular kept landing with light pants nearly every time. The previous roll applied a random
  offset ON TOP of each class's own fixed base lightness (e.g. Mage's preset pants tone happens to
  sit fairly light), so the result was still statistically anchored to that preset instead of being
  genuinely free. `Tower.prototype.rollSkinTones()` now rolls skin and pants lightness as two fully
  independent uniform-random values across a wide fixed range each, completely ignoring the class's
  own preset lightness — every class can now land anywhere from notably dark to notably light on
  either layer, with no bias toward its preset tone. `faceColor` remains the one deliberate
  exception: it's always derived as 8-10% darker than that specific tower's own rolled skin, so the
  face still reliably reads as a shade of the head/body rather than an unrelated random color.

## [1.0.110] - 2026-09-04
- Increased the gap between individual enemy spawns by 2 seconds, to give the pathing/collision
  system noticeably more room to settle each new arrival before the next one shows up. Applied as
  `group.spawnDelay + 2000` at the single point where every wave's spawn queue gets built, so it
  covers every hand-authored wave (1-100+) and every procedurally generated wave uniformly, rather
  than needing to edit each wave definition's individual spawnDelay value by hand.

## [1.0.109] - 2026-09-04
- Fixed the main remaining source of jittery enemy pathing and enemies bumping into each other.
  `updateBarricadesAndPileup()` had a second, separate "anti-overlap" pass — independent from the
  actual barricade-queue logic — that teleport-snapped any enemy whose raw path-distance
  (`traveled`) to the one ahead of it fell under the queue spacing, with **no spatial (x,y) check
  at all**. That condition is true for essentially every normally marching column of enemies on
  every single frame (that's what a marching column is), so it was fighting ordinary forward
  movement continuously — snap back, move forward, snap back again, every frame, for most of the
  enemies on screen at once. It could also misfire across entirely separate lanes, since two
  enemies can land on a similar `traveled` value while being physically far apart on a looping or
  spiral path. Removed it entirely: `resolveSweptEnemyCollisions()` and `resolveEnemyCollisions()`
  (run later the same frame, after movement) already enforce spacing correctly using each enemy's
  real physical position, which is the right layer for this and doesn't have either problem. The
  genuine barricade-queue snapping (enemies actually touching or chained behind a blocked
  barricade) is untouched and still works as before.

## [1.0.108] - 2026-09-04
- Fixed barricades (and several other glyph overlays) occasionally rendering "ghosted"/partially
  see-through, the same underlying bug as the enemy transparency fix in 1.0.107 but in a different
  spot: `ctx.fillText('🚧', ...)` for barricades never set `fillStyle` immediately before drawing,
  so it inherited whatever translucent color the previous draw call left behind — most often a
  fading blood decal (`drawDecals()` runs before towers every frame and sets `fillStyle` to a
  partial-alpha rgba as part of its own fade-out). Audited every other emoji/icon `fillText` call
  in the renderer for the same missing-fillStyle gap and fixed each one: the enemy revive skull
  icon, the tower crown/trophy/scroll overlays, the disabled-tower dizzy icon, and the scenery
  (trees/rocks/chests) glyphs, which are the first thing drawn each frame and were therefore the
  most exposed to inheriting stale state left over from the end of the previous frame.

## [1.0.107] - 2026-09-04
- Fixed enemies rendering fully transparent. The status-aura circles drawn just before the enemy's
  emoji sprite (slow/burn/poison/pileBlocked rings) each set `ctx.fillStyle` to a translucent rgba
  color and never reset it afterward — `ctx.globalAlpha` being forced back to 1.0 doesn't help here,
  since a color string's own alpha channel is independent of `globalAlpha`. On rendering paths where
  the emoji glyph honors `fillStyle` as a tint, the enemy sprite itself was inheriting whatever
  translucent aura color had been drawn last (most commonly the pileBlocked ring, which fires
  constantly for any queued unit) — that's what actually produced "all enemies transparent," not a
  compositing/alpha leak. `fillStyle` is now forced to a fully opaque color immediately before the
  glyph is drawn, regardless of what aura rings drew before it.
- Fixed fast-moving enemies occasionally walking straight through each other instead of colliding.
  The existing collision system only ever compares each enemy's position at the start and end of a
  frame — two enemies moving toward each other fast enough can start a frame apart, fully cross
  paths, and end the frame apart again on the other side without their positions ever actually
  coinciding at either checkpoint, so the check never sees an overlap at all. Added
  `resolveSweptEnemyCollisions()`, which runs before the regular collision pass and checks each
  pair's closest approach along their actual movement segment for the frame (a swept circle-vs-
  circle test), not just the two endpoints — catching and correcting the tunnel-through case the
  endpoint-only check structurally cannot see.

## [1.0.106] - 2026-09-04
- Further fixed enemies bunching up and getting stuck on each other. Three remaining issues after
  the previous pass: (1) the queue spacing behind a blocked enemy was a flat 26px regardless of
  enemy size, but `resolveEnemyCollisions()`'s own non-overlap distance is `radius*2+2` — for
  anything bigger than a Swarm (radius 12), that's already wider than 26px, so a freshly-snapped
  queue slot was immediately flagged as "overlapping" again on the very next collision pass,
  fighting itself every frame and reading as jittery/stuck. Queue spacing is now derived per-enemy
  from its own radius with margin over the collision system's own minimum distance, so a queue
  snap is never immediately re-flagged. (2) A single collision-resolution pass per frame isn't
  enough to settle a genuine cluster of 3+ enemies converging at once — resolving pair A/B could
  immediately re-overlap pair B/C, so dense crowds only fully settled over several visible frames.
  `resolveEnemyCollisions()` now runs 3 relaxation passes per frame (rebuilding the spatial hash
  each time) so crowds actually settle within the frame instead of visibly fighting it out over
  time. (3) Separation between two moving, unblocked enemies was purely radial, which shoves units
  rounding a corner sideways off the path centerline and into walls — a direct cause of corner
  hang-ups. Pushes between moving enemies are now biased toward their own direction of travel
  (damping the cross-path component to 45%) so overlap gets resolved mostly by units sliding past
  each other along the path, not by getting shoved off it.
- Added a genuine bleeding damage-over-time effect. Sufficiently heavy hits (>15% of the target's
  max HP) now open an actual wound — a ticking DOT (strongest application wins, doesn't stack)
  that, on top of the existing low-HP passive drip, actively sprays fresh blood, drops satellite
  droplets, and occasionally lays down a new pooling decal on every tick while it's active. Shows
  a periodic "🩸 BLEEDING" reminder label the same way Burning/Cursed already do.
- Blood color now varies per individual enemy, not just per species. Previously every enemy of a
  given type (and every hit on it) drew from one exact flat palette. Each enemy now rolls its own
  blood tint once at spawn (a per-instance hue/lightness jitter on top of its species' base
  palette) and keeps it consistent across every hit and its eventual death — so two Grunts
  standing side by side can now visibly bleed slightly different, individually-distinct shades of
  red, the same way their skin tones already vary.

## [1.0.105] - 2026-09-04
- Towers of the same class now vary in height and weight, not just color. New
  `Tower.prototype.rollBuild()` rolls an independent ±14% height jitter and ±14% weight/breadth
  jitter around that class's own baseline `JOB_BUILD` proportions, so two Mages (for example) can
  genuinely read as a taller/leaner one and a shorter/stockier one instead of both sharing one
  fixed silhouette. Rolled once at `create()` and re-rolled at `evolveInto()` (new class, new
  physique); intentionally NOT re-rolled on `upgrade()` — leveling up is the same individual
  getting stronger, not growing a different body. All internal spawn-point/label-height math that
  previously read the flat per-class `JOB_BUILD` scale (projectile muzzle offsets, the crown/
  trophy/stat-point icon height, camera-follow centering) now reads each tower's own rolled
  `buildScaleX`/`buildScaleY` instead, so those stay visually anchored to the actual (now varied)
  sprite instead of an average class silhouette.
- Pants/lower-body tone now varies independently of skin tone instead of tracking it at a fixed
  contrast. Previously `skinShade` (the legs) was darkened by the exact same offset as `skinMain`
  (the body/head), so within a class every tower's pants were always the same relative shade as
  its skin. `Tower.prototype.rollSkinTones()` now rolls a separate ±28% offset for `skinShade`,
  so it's now common to see, e.g., a darker-skinned Mage with lighter pants and a lighter-skinned
  Mage with darker pants — real per-tower variety instead of one tone driving both layers.

## [1.0.104] - 2026-09-04
- Fixed enemies bunching up, ghosting/stacking on top of each other, and hanging up or backtracking
  on corners. This was four separate interacting bugs: (1) queue-slot snapping in
  `updateBarricadesAndPileup()` moved an enemy's `x`/`y` to its new queue position but never
  updated `traveled`/`pathIndex`, so the very next movement tick recomputed a target from the
  stale, further-along waypoint and yanked the enemy straight back toward where it had just been
  snapped from; (2) the waypoint-arrival check required landing within one exact frame's movement
  of a corner, so a collision push of even a fraction of a pixel past the corner caused a full
  reversal-and-retry loop while trailing enemies piled into the reversing unit; (3)
  `resolveEnemyCollisions()` had no per-pair filter, so every overlapping pair got pushed apart
  twice in the same frame (once when processed as A→B, again as B→A), and skipped separation
  entirely whenever both units were queue-blocked — which is every unit in a queue, so physics
  shut off exactly where crowding was worst; (4) the 70px queue-catchment radius was pure
  Euclidean distance against a 64px-wide path grid, so enemies on parallel lanes of a spiral/
  hairpin turn falsely detected each other as queued and snapped across tracks. Added a shared
  `snapEnemyToTraveled()` helper that keeps position and path-progress state atomic, a path-
  distance gate on the catchment check, an ID-ordered collision pass, a true non-overlap `minDist`,
  and a gentle lateral nudge for chokepoint units instead of a full physics lockout.
- Fixed enemies visually fading or disappearing when clustered/queued. The hit-flash effect was
  painting a translucent white *fill* circle directly over the sprite on every hit; several
  overlapping fills on a tight cluster taking simultaneous damage washed the emoji colors out
  toward white, reading as faded or invisible units. Replaced it with a stroked ring outside the
  sprite so the emoji itself is never painted over, and wrapped `Enemy.prototype.draw()` in a
  strict `ctx.save()`/`ctx.restore()` pair with an explicit `globalAlpha` reset so no state can
  leak between one enemy's draw call and the next.
- Locked the bottom-left inspect panel's combat stats row to a single line at all viewport widths.
  `#inspCombatRow` was wrapping to a second row inside the 320px panel because six stats at
  `gap:10px`/`font-size:clamp(11px,1.8vw,14px)` needed ~380px but only had ~304px available,
  which also inflated the placard's height. Switched to `flex-wrap:nowrap`, tightened the gap to
  `clamp(2px,0.8vw,5px)`, and scaled the font down to `clamp(9px,1.3vw,11px)` with `line-height:1`.
- Reworked stickman face color so it's a genuine subtle shade of the tower's own skin tone instead
  of a near-black mask. The old `darkerJitteredColor()` had a hard 55% lightness ceiling, which
  crushed light/pastel body colors (e.g. Archer's pale green) down to a muddy near-black head.
  Removed that ceiling and tied `faceColor` directly to each tower's own rolled `skinMain` instead
  of the class's flat base color.
- Every tower class now rolls genuinely distinct, wide-range individual skin tones (not just a
  small ±8% wobble), and re-rolls its shade on upgrade and on evolution so leveling up and
  evolving are visibly reflected in appearance. New shared `Tower.prototype.rollSkinTones()`
  derives `skinMain`, `skinShade`, and `faceColor` from one shared per-tower lightness offset
  (±22%) so all three layers stay tonally coherent instead of three independently-randomized
  colors; applies to all classes, not just Archer.
- Extended forensic blood realism and field lifespan. `MAX_DECALS` raised from 500 to 2000 and
  `DECAL_LIFESPAN` raised from 300s (5 min) to 1800s (30 min) — in long, high-wave games old
  stains were being capacity-recycled or expiring well before their timer, which read as blood
  simply not lasting. Seriously wounded enemies (below 40% HP) now drip continuously as they
  travel, not just at the instant of a specific hit — fast-moving wounded units trail an elongated
  teardrop behind their direction of travel, stationary/queued ones pool in place. Enemies pressed
  against a barricade while bleeding now leave a directional contact-transfer wipe smear on the
  barricade itself, distinct from the general splatter beneath them. Aged blood pools (roughly
  2+ minutes into their life) now render a darkened, oxidized outer rim with a slightly lighter,
  flatter interior — a skeletonization/drying-ring effect — so long-lived stains visibly read as
  older rather than staying visually identical for their whole lifespan.

## [1.0.103] - 2026-09-03
- Blood decals now last longer with real per-decal variance instead of one flat duration: every
  decal is guaranteed at least 15% longer than the previous baseline, and sometimes up to 3x
  longer — a pool that used to always last exactly 300s now ranges 345s-900s, streaks range
  690s-1800s (up to 30 min). Verified the distribution numerically across 10,000 samples before
  shipping (min 1.15x, max 3.00x, average 2.08x). Footprint trail marks were deliberately left
  without this variance — they're meant to stay short-lived, distinct from the actual wound stain.
- Stickman faces now have a real fill instead of being hollow outlines — a darker, per-instance
  randomized shade of that tower's own body color (same hue, same jitter mechanism already used
  for skinMain/skinShade), giving every tower a genuinely distinct face color rather than a
  transparent head. New `darkerJitteredColor()` helper, since the existing `jitterColorLightness()`
  has a 30-92 lightness floor specifically to keep skin tones legible, which would have prevented
  it from ever landing on a genuinely dark tone.

## [1.0.102] - 2026-09-03
- Fixed the actual bug behind blood fading faster at higher game speeds. Decals were aging
  against `gameTime`, which advances proportionally faster the higher `gameSpeed` is set (more
  simulation ticks run per real second) — so a decal with a fixed `gameTime` lifespan genuinely
  reached that threshold sooner in real wall-clock time at 3x/10x. Added a separate `realTime`
  clock that advances by actual unscaled elapsed milliseconds regardless of game speed; every
  decal (blob pools, streaks, satellite drops, skin-peel, footprints) now ages against that
  instead. Verified with a simulation: at identical 10 real seconds elapsed, `gameTime` was 10s/
  30s/100s at 1x/3x/10x speed respectively, while `realTime` stayed exactly 10s in all three —
  confirming decals now age identically no matter the speed setting.
- Blood no longer ages at all during the rest period between waves (`waveState === 'IDLE'`) —
  `realTime` is frozen during that window, so time spent deciding what to build next doesn't eat
  into a stain's lifespan.
- Decal capacity raised from 150 to 500 concurrent — "more max allowed blood."
- Decoupled blood intensity from graphics quality entirely. The death-gore block was scaling
  particle counts and skipping several effects (satellite drops, drip sites, castoff streaks)
  whenever `graphicsQuality === 'low'`, on top of the goreMode toggle. Blood is now controlled
  only by whether gore is enabled — full intensity gore shows at any graphics setting.

## [1.0.101] - 2026-09-03
- Removed the arbitrary periodic "wounded" gushing — previously any enemy below 35% HP had a
  background timer independently re-rolling a chance to gush every ~1-2s, with no connection to
  any specific attack. Dripping is now tied directly to the hit that caused it: `startDripSite()`
  takes a `severity` param (the hit's damage as a fraction of the target's max HP) and scales drop
  count proportionally — 1 drop for a graze up to 8 for a near-fatal blow, and hits below an 8%
  severity threshold don't start a drip at all. Verified the scaling numerically across a range of
  hit sizes before shipping. Applied to both the general on-hit case and the Archer puncture-wound
  gush, which now also scales by the actual shot's damage instead of a fixed default.

## [1.0.100] - 2026-09-03
- Non-lethal hits now have a real chance (40%) to leave a lasting mark on the ground, not just
  transient particles. Every on-hit gore branch already spawned particles/streams on every hit,
  but all of that fades within about a second — without a persistent decal, blood only ever
  visibly stuck around after the killing blow, which is exactly what was reported. New decal is
  smaller/less frequent than the full death pool (uses the existing `smallBias` mode) so repeated
  hits build up visible battle damage without outshining an actual kill. Applies uniformly across
  every archetype branch (Warrior/Mage, Archer, Explosive) except dust/rock enemies, which never
  leave blood decals.

## [1.0.99] - 2026-09-03
- Extended base decal lifespan again (180s → 300s / 5 min) — every decal type scales with this
  since they're all multipliers of the base, so streaks now last up to 10 minutes.
- Added a wet-sheen glisten highlight to fresh pools — real blood is glossy/reflective when wet
  and goes matte as it dries, which the existing color-darkening curve alone didn't capture. A
  soft white highlight on the pool's largest blob fades out smoothly over the first ~15s of life
  (verified numerically: 0.35 alpha at spawn → 0 by 15s), giving fresh wounds a genuinely wet look
  distinct from the reddish-brown oxidizing stage that follows.

## [1.0.98] - 2026-09-03
- Fixed enemies piling up messily instead of forming a clean single-file "conga line" queue at a
  chokepoint (e.g. behind a Barricade). Root cause: the old queue system only chained a line
  through enemies that were *strictly adjacent* in traveled-order — on an early-game wide-open
  map, enemies approaching from different lateral positions with similar-but-not-adjacent traveled
  values fell through that check entirely and were left to fight for space via the generic
  collision-push system instead, producing the jumbled scatter.
  - Rewrote the queue assignment as a single forward pass with a real spatial catchment radius
    (70px) around any already-blocked enemy, so multiple lanes converging on one chokepoint all
    get pulled into the same queue regardless of traveled-adjacency.
  - Caught and fixed two real bugs while building this, both found via standalone simulation
    before shipping (per the game-critical-logic testing convention): (1) an early version
    overwrote `traveled` itself when snapping an enemy into its slot, which could create ties with
    another enemy's original traveled value and break the "genuinely ahead" ordering check; fixed
    by tracking slot position in a separate `queueSlotDist` field, never touching `traveled`.
    (2) even after that fix, two enemies that were each individually closer (by original position)
    to the very front of the line than to each other could still independently compute the exact
    same slot — fixed with explicit slot-collision tracking that walks an enemy further back in
    fixed increments until it finds a genuinely free spot.
  - Verified with two simulations before shipping: a 5-enemy multi-lane convergence, and an 8
    -enemy stress test with fully randomized scattered starting positions — both produced a clean
    line with zero overlapping slots.

## [1.0.97] - 2026-09-03
- Mage's projectile now visually reads as a magic missile instead of a generic arrow — a glowing
  white-hot orb core with a soft colored outer glow and a fading energy trail behind it, instead
  of the shared line-and-barbs shape every other physical projectile uses.
- Mage's projectile speed reverted back up to high-velocity (520-580, was 320-360 from an earlier
  "slower but higher impact" pass) per explicit correction — fast-traveling and hard-hitting
  rather than slow and hard-hitting. Damage stayed at its earlier boosted values. The heavier
  on-hit blood splatter for Mage specifically (18 vs 14 particles, 7 vs 4 streams, 55% vs 30%
  castoff chance, shipped in 1.0.87) was already in place and confirmed still intact.

## [1.0.96] - 2026-09-03
- Reworked camera-follow's pan math to remove a coupling bug: target X/Y were being recomputed
  every frame using the *currently animating* zoom, and since both position and zoom shared the
  same easing curve, the target itself was a moving point rather than a fixed one — mathematically
  this makes camera.x/y follow a quadratic path (there's a `zoom(t) * eased(t)` term, which is
  quadratic in `t`) instead of a straight line, which can produce a "wrong direction, then
  corrects" motion depending on the tower's position and zoom delta. Target X/Y/zoom are now all
  computed once at pan start and interpolated independently — verified with a simulation that the
  tower's distance to true center now shrinks on every single step with no exceptions, which is
  mathematically guaranteed by this construction regardless of tower position or zoom delta.
  (My reproduction of the *old* code's exact failure case wasn't conclusive in every scenario I
  tried, so I won't overclaim I nailed the precise prior mechanism — but the new version is
  provably immune to this class of bug either way, which is the property that actually matters.)
- Cut the wait-before-panning from 600ms to 150ms — was reported as pausing too long before
  starting.

## [1.0.95] - 2026-09-03
- Fixed embedded arrows not actually moving with the enemy body. The body itself is drawn with a
  knockback-bump offset (`bumpDx/bumpDy`, from pressing against a Barricade) plus a constant
  walk-bob while moving, but the embedded-arrow rendering only ever used the raw `this.x, this.y`
  — never those same offsets. The arrows were visually lagging behind the body's normal bob motion
  the entire time it walked, which is very likely what looked like a collision/overlap glitch in
  the reported screenshot (an arrow rendering slightly detached from its own enemy can look like
  two separate overlapping things). Arrows now use the identical adjusted position the body uses.
- Also moved the arrow's anchor point from a small random offset clustered near center (up to
  ±0.35 radius) to the body's actual edge (0.85 radius, at a random angle around it) — reads as a
  real puncture wound at the surface instead of something floating near the middle of the sprite.
- Reviewed `resolveEnemyCollisions()` for gaps while investigating — it applies uniformly to every
  active enemy (including breakaway ones), no exclusion holes found; the arrow desync above is the
  most likely actual cause of what was reported as a collision issue.

## [1.0.94] - 2026-09-03
- Doubled the base decal lifespan again (90s → 180s) — real bloodstains persist for hours without
  cleanup, and fading this fast was undercutting that. Every decal type scales with this: pools
  now last 180s, streaks (already 2x the base) go to 360s, skin-peel patches to 234s, footprint
  trails stay quick at 45s. The color-aging curve (bright red → reddish-brown → dried) is
  fraction-based, so it automatically stretches proportionally with the longer lifespan rather
  than needing to be recalibrated separately.

## [1.0.93] - 2026-09-03
- Changed the overhead "unspent stat points available" indicator from a glowing 💀 skull to a
  glowing 📜 scroll, matching the same icon already used for the in-panel expand toggle. Confirmed
  the click-to-open-straight-to-stats behavior (tapping a tower with points auto-expands to the
  stats section instead of landing collapsed) was already in place and untouched by this change.

## [1.0.92] - 2026-09-03
- Camera pan/follow now centers on each tower's true visual midpoint, not its raw draw anchor.
  `drawStickman()` translates to `(tower.x, tower.y)` at foot level, not the sprite's visual
  center — the local sprite actually spans roughly head-top (-31) to feet (+20), so its true
  midpoint sits noticeably above the anchor point. Centering purely on `tower.y` left the
  character sitting visibly below true screen center. New `towerVisualCenterY()` helper accounts
  for this, plus each class's own body `scaleY` (same per-class-proportions pattern already used
  for the projectile-spawn muzzle-alignment fix). Verified with a standalone simulation for both
  a lean class (Archer) and a squat one (Hammerman) that the visual midpoint — not just the
  anchor — lands exactly on screen center in both cases.

## [1.0.91] - 2026-09-03
- Fixed camera-follow zooming out unexpectedly. The 1.0.89 "fixed distance" change made the pan
  always target exactly 1.3x zoom regardless of the current zoom level — if the player had
  already zoomed in further than that before selecting a tower, the follow would pull the camera
  back OUT to 1.3x, which read as a random wrong-direction zoom. Restored the "never zoom out"
  guarantee: the pan now targets `Math.max(currentZoom, 1.3)` — guarantees at least that close-up
  distance when zoomed out further, but leaves the zoom alone if already closer than that.
  Verified all three cases (zoomed out, at the recommended distance, zoomed in further) with a
  standalone check before shipping.

## [1.0.90] - 2026-09-03
- New universal, shared-item drop system, Dota-style: opened treasure chests now have an 8% chance
  to drop a 🌿 Sturdy Branch (+1 STR/DEX/INT, works on any tower — not class-specific gear) as a
  physical item sitting on the map. Drag it onto whichever tower should hold it to equip; it stays
  put if you release it somewhere else, so a failed drop just leaves it available to try again.
  - Implemented real pointer drag-and-drop: ground-item hit-testing on pointerdown takes priority
    over the normal camera-pan drag, item position tracks the cursor in world-space during the
    drag, and release checks for a tower under the drop point.
  - Reuses the existing `buyItem()` equip path (cost 0, so no gold is charged) — respects the
    same 6-slot cap and Hero-awakening check every other item already does.
  - **Scope note**: this adds a new universal item alongside the existing per-class Shop gear
    system (13 classes × 4 tiers) rather than replacing it — removing that entire established,
    balanced system is a much bigger decision than adding a new item type, so it wasn't done
    without confirming that's actually wanted first.

## [1.0.89] - 2026-09-03
- Camera pan-to-unit reworked: total sequence cut from 9s (3s wait + 6s pan) to 2s (0.6s wait +
  1.4s pan) — the old duration felt far too slow. Switched from a razor-edge exponential ease-in
  (where ~90% of the motion was crammed into the final instant, making it look like nothing was
  happening for most of the sequence) to a smooth ease-in-out cubic, so movement is visible
  throughout instead of a long dead pause followed by a snap.
- Zoom now always pans to the fixed 1.3x recommended distance regardless of the current zoom
  level, instead of only zooming in when already more zoomed out than that.
- Re-verified with a standalone simulation that the tower's screen position still lands exactly
  on true center at completion under the new timing/curve.

## [1.0.88] - 2026-09-03
- Fixed the actual bug behind camera pan-to-unit never centering: `clampCamera()` bounds the
  camera against the full theoretical `WORLD_MAX_W/H` (the largest the map could ever expand to),
  not the currently revealed play area. Early in a run, the active region sits near one corner of
  that theoretical space, so centering on a tower there required a camera position the clamp was
  silently overriding back to its restrictive bounds every single frame — the pan was fighting
  itself the whole time. Intentional camera-follow now skips that clamp entirely, since it's a
  deliberate move, not a manual pan that needs edge protection. Verified with a standalone
  simulation that the tower's screen position now lands exactly on true center at pan completion.
- Added the requested "pan to a recommended distance" — the camera now also eases zoom toward a
  comfortable 1.3x close-up alongside the position pan (only zooms in if already more zoomed out
  than that, never zooms out), animating together with the position pan rather than as a separate
  step.
- Also shipping forensic gore work built last session that got left unversioned:
  - Real forensic bloodstain-aging timeline, calibrated so one round represents ~5 real-world
    hours: bright oxyhemoglobin red holds for the first ~10 equivalent minutes, transitions
    through a reddish-brown oxidizing stage, and settles to the fully-dried true color by ~2
    equivalent hours — a genuine two-stage color transition instead of one flat lerp. Verified the
    curve numerically at real-world-hour checkpoints before shipping.
  - Badly-wounded-but-still-alive enemies (below 35% HP) now periodically gush a little blood
    while moving, not just on the hit that wounded them — a real wound keeps bleeding.

## [1.0.87] - 2026-09-03
- Streaks (cast-off decals) now last 2x as long as blob pools/drops instead of sharing one
  universal lifespan — they were called out as a favorite effect and were fading at the same rate
  as everything else.
- New walking-blood system: any enemy standing on or near still-fresh blood (spawned within the
  last 4s) picks it up on its feet and leaves a trail of small, quick-fading footprint marks as it
  walks away — each print fainter than the last until it runs dry (verified the decay curve
  numerically: 0.46 → 0.37 → 0.28 → 0.18 → 0.09 → 0 over 6 steps). This was the explicitly
  requested effect that didn't exist yet.
- Weapon-specific forensic differentiation:
  - **Archer**: arrows now physically embed and stay stuck in the enemy (small angled shaft +
    arrowhead rendered on the body, capped at 4 so a heavily-hit enemy doesn't turn into a
    pincushion), and each hit starts an ongoing gush (a drip site) on top of the normal splatter —
    a real puncture wound bleeds continuously, not just once.
  - **Mage**: projectiles now travel noticeably slower (320-360 vs. the old 460-500) but hit
    harder (damage raised ~20-25% per tier to compensate) — a heavier, more deliberate bolt.
    Mage hits also spawn significantly more streaks (18 particles/7 streams vs. 14/4 for a
    standard melee hit, castoff chance nearly doubled to 55%) and elemental procs (burn/freeze)
    now leave a new "skin peeling" decal — a jagged blistered patch with a pale raw-tissue
    highlight, visually distinct from a normal blood pool since it's elemental damage, not a
    physical wound.
  - Melee (Warrior/generic) kept as the existing castoff-sweep baseline that Archer/Mage now
    build on top of.

## [1.0.86] - 2026-09-03
- Camera pan-to-unit: selecting or placing a tower now waits 3s, then pans the camera to center on
  it over 6s using a strong exponential ease-in — barely moves for the first few seconds, then
  rapidly accelerates to arrival (verified numerically: only ~3% of the pan distance covered at
  the 3s mark of the pan itself, 50% covered by 90% through it). Camera then continuously tracks
  the tower while it stays selected. Cancels cleanly on manual drag, pinch/scroll zoom, or
  deselection — wired into all 6 deselection points in the code individually.
- Blood decal lifecycle reworked: decals previously never actually expired, only got recycled by
  capacity (150-decal cap, oldest overwritten). Now they have a real 90-second lifespan (doubled
  from a 45s baseline) — bright red at spawn, shifting to the enemy's true biology color over the
  first 20% of life, holding steady, then fading to fully transparent over the final 15% so old
  stains clear out instead of accumulating indefinitely. Verified the full color/alpha curve
  numerically across the lifespan before shipping.
- Wired the previously-declared-but-unused `bio.viscous` flag (from the biology profiles shipped
  in 1.0.76) into real friction physics: insect hemolymph and coagulated undead blood now
  genuinely travel less far than thin standard blood (0.88 friction vs 0.93), a real fluid-density
  difference instead of a flag that did nothing.
- ⚖️ Target and 🔀 Move button icons.
- Zoom-controls Settings toggle (Settings → Game), off by default since pinch/scroll zoom already
  works without the on-screen buttons — persisted in saves.
- Real enemy-enemy collision resolution, replacing the previous system which only checked the one
  enemy directly ahead in path order and explicitly excluded stunned/frozen enemies from collision
  entirely — meaning a frozen enemy wasn't an obstacle at all and everyone walked straight through
  it. `resolveEnemyCollisions()` now does genuine circle-circle collision against every nearby
  enemy (reusing the existing spatial hash), including frozen ones as real static obstacles that
  can't be pushed and can't be walked through — verified both the normal-pair and frozen-pair
  cases with a standalone simulation before shipping.
  - Caught a real bug while wiring this in: an early edit's `str_replace` matched and consumed
    `buildEnemyHash()`'s own function-signature line while inserting the new collision function
    above it — the exact "heading consumption" failure pattern `AGENTS.md` already warns about,
    just in code instead of the changelog. Caught immediately by the mandatory `node --check`
    pass and fixed before continuing.

## [1.0.85] - 2026-09-03
- Target and Move buttons now show ⚖️ and 🔀 icons.
- Added a Settings → Game toggle for the on-screen zoom +/-/reset buttons, off by default (pinch
  and scroll-to-zoom already work without them) — opt-in for anyone who prefers explicit buttons.
  Persisted in save files.
- General enemy anti-overlap: previously the path-queue system only kicked in when an enemy was
  actively blocked (a Barricade, or queued behind one). A fast enemy (Runner) catching up to a
  slow one ahead of it (Tank) on the open path had nothing stopping it from visually overlapping
  or passing through. Extended `updateBarricadesAndPileup()`'s spacing check to apply generally,
  not just to blocked chains — enemies now hold a minimum trailing distance from whatever's ahead
  of them regardless of whether anything is actually blocking, without touching the existing
  blocked-queue snap logic's behavior.
- Post-death drip sites: kills now spawn a few extra blood drops over the next ~1-2.5 seconds
  after the initial splatter, instead of everything landing in one instant burst. Capped pool
  (24 concurrent drip sites, oldest cut short past that) to stay performance-safe.
- Logged two large requested features to `BACKLOG.md` with real scoping rather than rushing them:
  walking-blood forensics (footprint decals as enemies track through spatter) and a full three-form
  Druid class (Wolf/Bear/Squid AoE tradeoffs, mode-switch UI, once-per-round gate) — both need new
  subsystems beyond what a quick config addition can cover.

## [1.0.84] - 2026-09-03
- New deep INT evolution chain for Archer's Bomber branch: Bomber → Gunalinder (INT 25, 2nd tier)
  → Sniper (INT 40, 3rd tier) — the deepest single-stat investment of any class in the game.
  - **Gunalinder**: a revolver that fires all 6 chambers in a rapid burst (90ms between shots)
    before a long reload, implemented as a real state machine in `updateRanged()` rather than a
    reskin of the existing single-shot firing loop. Caught and fixed a bug in my own first draft
    of this logic, where the very first shot incorrectly jumped straight to the full reload
    cooldown instead of starting the burst — verified the corrected timing with a standalone
    simulation (6 shots in the first 450ms, clean 1700ms gap before the next burst).
  - **Sniper**: 420 base range (cap 520) — confirmed via the DPS/range table used in the 1.0.70
    balance pass that this is genuinely the longest range of any tower, ahead of Mage's previous
    420 cap.
  - Caught a real stale-field bug while wiring this up: `applyTierStats()` uses `Object.assign()`,
    which never clears fields absent from a new tier. Without an explicit reset, a tower evolving
    *away* from Gunalinder would keep its old `burstCount` and incorrectly keep firing in bursts.
  - Full gear tiers, colors, body proportions, flavor quotes, and custom `drawStickman()` poses
    (two-handed revolver grip; extended rifle barrel with a scope glint) for both classes. README
    and the in-game help modal's evolution tree updated to match.

## [1.0.83] - 2026-09-03
- Towers with unspent stat points now show a glowing green 💀 above their head on the map (gentle
  pulsing glow via `shadowBlur`, not a hard flash), stacking above the Hero crown/Legendary trophy
  if the tower has those too. Excludes Barricades, which never earn stat points.
- Tapping a tower on the map now auto-expands the inspect panel straight to full options if it has
  points to spend, instead of always landing on the collapsed view and requiring a second tap on
  the 📜 scroll toggle.

## [1.0.82] - 2026-09-03
- Added individual satellite blood drops — a new decal type (`isDrop`, small elongated teardrops
  each oriented along their own travel angle) scattered near a splatter, matching the real
  bloodstain-pattern-analysis phenomenon where a main spatter breaks into smaller individual
  droplets around its edges rather than being one uniform blob. Biased toward the impact
  direction on hits (angled scatter), fully radial around the pool on deaths. Gated off low
  graphics for the death case to stay perf-conscious, same as the other death-only decal effects.

## [1.0.81] - 2026-09-03
- Fixed target frame overflowing off the right edge on mobile — confirmed via an actual mobile
  screenshot (this had been logged in `BACKLOG.md` as unconfirmed since all prior sizing feedback
  came from desktop screenshots; now verified real). On viewports under 600px wide,
  `updateTargetFrame()` now stacks it above the inspect panel instead of to its right, and clamps
  its max-width to the available space either way so it can't run off-screen in either layout.

## [1.0.80] - 2026-09-03
- Two more forensic-accuracy passes on top of the archetype/biology work from 1.0.76:
  - **Real mist cone, not radial.** Archer-hit "mist" was still using the generic fully-radial
    `spawnParticles()` — its own code comment claimed a "tight cone along impactAngle" but nothing
    actually constrained the angle. Added real cone support (`coneAngle`/`coneSpread` params) and
    wired mist to a genuine ~46° cone. Verified numerically: 1000 simulated spawns, max deviation
    from the impact angle came out to exactly 0.400 rad (~23°), matching the intended half-cone.
  - **Per-particle friction + ground pooling.** Every particle previously decayed velocity at the
    same universal 0.93/frame regardless of type, so mist behaved identically to heavy splatter.
    Mist now uses 0.80 friction — decelerates hard into a dense cluster (2.5 units/s left after
    ~333ms vs. 51.5 for normal splatter, verified with a standalone simulation) instead of
    spreading like every other particle. Blood particles that settle (velocity < 6) now leave a
    tiny permanent ground stain via the existing capped decal system instead of just fading
    invisibly mid-air — real droplets land and soak in.
  - Guarded against a real bug from the shared particle-pool architecture: `spawnGibs()` and
    `spawnBloodStream()` pull from the same recycled `particles` array as `spawnParticles()`, so a
    slot's leftover `friction`/`canPool` state from a previous spawn could bleed into the next
    unrelated particle type. Both functions now explicitly reset those fields.

## [1.0.79] - 2026-09-03
- Non-explosive deaths no longer use a full omnidirectional particle burst — that was reading as
  an "explosion" regardless of what actually killed the enemy, since the same ~90-100-particle
  radial spray fired for every death. Only genuinely explosive kills (Bomber) keep that burst now;
  every other kill gets a modest ambient splatter plus a tight arterial "gush" of a few large
  streams weighted toward the direction of the last hit — a directional collapse instead of a pop.
  Also cut gib (chunky flying debris) count down to 1-2 for ordinary kills instead of 4-10, since
  visible chunks flying read as "explosion" more than fine spray does.
  - Verified the actual particle-count reduction numerically before shipping: a Grunt-tier
    ordinary kill went from 101 particles to 30 (~70% cut); a Boss-tier one from 181 to 53.

## [1.0.78] - 2026-09-03
- Condensed the top HUD stats: ❤️ Lives and 💰 Gold now sit on one row, 🔀 move-charges and Wave
  count on a row below that, instead of all four spread across a single horizontal line. Saves
  meaningful horizontal space next to the Build/Shop/Settings buttons and Next Wave button.

## [1.0.77] - 2026-09-03
- Starting lives raised from 30 to 100 (HUD default, initial state, and new-game reset all
  updated together).
- Caught and fixed a stale README instruction while updating this: it still said "Tap the ❤️ HUD
  stat to buy an extra life," but buy-life moved into the Shop modal back in v1.0.73 — the HUD
  heart is just a readout now. Updated the wording to point at the Shop instead.

## [1.0.76] - 2026-09-03
- Gore now branches on both weapon archetype and enemy biology instead of one universal red
  particle burst everywhere:
  - **Weapon archetype** (`resolveGoreArchetype()`): Archer-type towers produce tight,
    high-velocity forward-spatter mist along the impact angle; Bomber (explosive despite being
    ARCHER-archetype for stats) produces a 360° burst with no directional constraint; everything
    else (Warrior/Mage) gets the medium-velocity castoff sweep, weighted toward the impact angle
    but not fully constrained to it.
  - **Enemy biology** (`getBloodProfile()`, keyed off properties the game already tracks —
    `isUndead`, and type for Swarm/Splitter/Boulder): insects (Swarm, Splitter, Splitmini) bleed
    cyan-green hemolymph; undead (anything with `isUndead: true`) bleed near-black coagulated
    blood and skip the bright high-velocity arterial-spray layer entirely (real coagulated blood
    oozes, it doesn't spurt); Boulder produces gray/brown rock dust with no liquid streams and no
    pooling decal at all, since it isn't blood.
  - Extended `spawnBloodStream()` to accept optional bright/dark color overrides (previously
    hardcoded to standard red regardless of what was hit) and added a `hexToRgba()` helper so
    decal/castoff alpha transparency still works with biology colors instead of only literal red.
  - Caught and fixed a self-inflicted bug during this edit: an early `str_replace` accidentally
    deleted `spawnDecal()`'s own function-signature line while inserting the two new helper
    functions above it — caught immediately by the mandatory `node --check` pass before
    continuing, per the verification workflow in `AGENTS.md`.

## [1.0.75] - 2026-09-03
- Target-of-target frame now hides entirely while the inspect panel is expanded (full options
  open) instead of stretching to match the panel's height — it reappears once the panel is
  collapsed. Solves the negative-space complaint more directly than resizing it ever would.
- Removed the redundant "🛒 Items" button — the inventory slots themselves have been clickable to
  open the Shop since 1.0.72, so the separate button was dead weight.
- Inventory expanded from 4 slots to a true 6-slot Dota-style grid — `MAX_ITEM_SLOTS` bumped to 6
  (the actual game mechanic, not just the visual), Hero-awakening threshold updated to match
  (fill all 6 to become a Hero, was 4), help modal and stale code comments updated accordingly.
  Inter-tower drag-and-drop item throwing between slots logged to `BACKLOG.md` as its own
  follow-up — real pointer-drag and cross-tower hit-testing is a distinct feature from the slot
  display itself.

## [1.0.74] - 2026-09-03
- Audited every suggestion from the Gemini "chapter" documents against the actual current code:
  - **Shipped**: New Enemy toast polish — each enemy's emoji is now 2.6em with a hardware-accelerated
    (`transform`-only) waddle keyframe, a ✕ close button in the top-right clears the pending
    timeout and dismisses early, and the auto-hide timer went from 5500ms to 6600ms (+20%).
  - **Already existed, no change needed**: `EVOLUTIONS`/`CLASS_ARCHETYPE` gating, wave-pacing,
    the new-enemy-introduced popup itself, and archetype-exclusive STR/DEX/INT damage — all from
    earlier versions this same session, re-verified still correct.
  - **Explicitly contradicts a later, real instruction — not applied**: widening
    `#inspect-panel` to 360px (a Gemini-draft fix for stat-row wrapping) directly conflicts with
    the actual person's explicit request earlier this session to shrink it from 480px to 320px.
    Removing `#inspTargetFrame`'s `minHeight` and shrink-wrapping it also directly contradicts the
    actual person's explicit request to make it match the main panel's height. Both left as-is.
  - **Genuinely missing, but too large for a single pass — logged to `BACKLOG.md` instead**:
    forensic-realism gore rewrite (directional spatter by weapon archetype, per-enemy blood
    biology/color, pooling to a static layer), mobile-viewport stacking for the target frame.

## [1.0.73] - 2026-09-03
- Buy Life moved out of the main HUD and into the Shop modal as a dedicated row below the header
  (❤️ Lives counter + Buy Life button, same exponential cost curve as before) — the HUD now shows
  lives as a plain readout again, matching the original request that it not clutter the main
  screen.
- Removed the redundant HUD mute button (🔊/🔇 in the top-right controls). Mute already lived in
  Settings → Audio; having it duplicated in the main HUD wasn't necessary.
- New STR-based "taunt" mechanic: breakaway targeting (`findNearestActiveTower`, used by Fire/Ice
  breakaway attacks and Troll's swing) is now weighted by both proximity and each candidate
  tower's STR investment, not pure nearest-distance. A tower with 20 STR is roughly 2.24x more
  likely to draw aggro than an identical-distance 0-STR tower — works for any archetype, so a
  heavily-STR Mage can out-taunt a low-STR Warrior, per request. Verified the weighting
  numerically before shipping.
- Logged several larger requested features to `BACKLOG.md` rather than rushing them: a STR-Mage
  evolution chain (Rogue Sorcerer → Crazy Wizard → Necromancer with an HP-percentage sacrifice
  AoE), Swordsman cleave diminishing returns past 5 targets, a restructured branching Warrior
  evolution net (Axeman → "Knight Errant" → Berserker; Hammerman gaining DEX branching into a
  dual-wield path), a forensic-realism gore rewrite, a Dota-style item-drop/merchant economy, and
  a wobbling Dwarf Builder NPC with more pronounced post-wave-3 scenery scaling. Each is
  well-specified but large enough to deserve its own focused pass rather than a rushed bundle.

## [1.0.72] - 2026-09-03
- Inventory row now shows 4 bordered WC3/Dota-style item slots instead of a plain text summary
  (icons joined by spaces, or "No items"). Used 4 slots specifically to match the actual
  `MAX_ITEM_SLOTS`/Hero-awakening mechanic (filling all 4 makes a tower a Hero) rather than the
  visually-iconic-but-mismatched 6-slot Dota inventory grid.
  - Empty slots show a dim inset border; filled slots show the item's icon with a gold glow and
    a tooltip with its name.
  - Slots are clickable — tapping any of them (filled or empty) opens the Shop for that tower's
    gear, same as the existing 🛒 Items button.

## [1.0.71] - 2026-09-03
- Added a small "TARGETING" header label above the enemy name in the target-of-target frame.
- Widened the target frame (220px → 270px max-width) and enlarged its content — bigger portrait
  (32px → 40px), slightly larger gaps — to fill the panel's height (which already matches the
  player nameplate's height as of 1.0.65) instead of leaving empty top/bottom padding.
- Fixed Troll being able to randomly appear as early as wave 1 — the 2% random-substitution roll
  in `startNextWave()` wasn't checking whether Troll had actually been introduced yet, so it could
  show up (with no explanatory popup) well before its official wave-22 debut. Now gated on
  `seenEnemyTypes.has('TROLL')`, which the new-enemy-introduced system (1.0.59) already tracks.

## [1.0.70] - 2026-09-03
- Balance pass applying "shorter range = more damage, higher attack speed = less damage" as a
  general design check across all towers. Extracted tier-1 range, damage-per-hit, and
  attacks/second for every tower and sorted by range to find violations:
  - **Bomber was the clear violator** — 2nd-longest range in the game (240) with higher per-hit
    damage (26) than every short-range melee unit except Spearman. Trimmed its range ~12.5%
    across all three tiers (240/260/280 → 210/228/246), damage left untouched — its high damage
    is now earned by sitting mid-pack on range instead of near the top.
  - Fast attackers already fit the pattern well and needed no changes: Gatling (7.14/s, 5 dmg),
    Squirtgun (5.00/s, 6 dmg), and Blowdart (2.70/s, 8 dmg) all pair high attack speed with low
    per-hit damage, exactly as intended.
  - Slow, short-range hitters already fit too: Spearman (0.56/s, 40 dmg — README's own "slow but
    hard-hitting") and the melee Warriors (Swordsman/Hammerman/Paladin) all trend toward more
    damage as range drops.
  - **Deliberately left Archer alone** despite having the single longest range (260) paired with
    above-average damage (20) — its README-documented identity is explicitly built around this
    exact trait ("slower arrows, real power behind each shot"). Treated as an intentional,
    documented exception rather than an oversight to silently override.
  - Also left Mage and Cleric's low damage-for-their-range as-is — both are utility casters
    (slow/status, curse/heal) whose value was never meant to come from raw hit damage.

## [1.0.69] - 2026-09-03
- More splatter on impact: each hit's particle burst went from 9 → 14, its directional blood
  stream from 3 → 4 particles, and hits now have a 30% chance of a directional castoff streak too
  (previously impacts had no streak at all, only kills did).
- Less reliance on ground pools at death, while keeping the particle/gib/stream burst as-is (the
  part that was already liked): the main death pool now only appears 65% of the time (was
  guaranteed), and when it does, uses a new `smallBias` decal mode that skips the big/massive pool
  rolls entirely — verified numerically that this drops the average pool size from ~1.72x to
  ~0.60x. The two chained "extra stain" pools that could previously stack up to 3 total decals per
  kill (35% × up to 2 more) were removed outright; the occasional directional castoff streak (a
  spatter line, not a filled pool) stays.

## [1.0.68] - 2026-09-03
- Fixed Blowdart's disconnected-looking arm: it had a second "steadying" off-hand anchored 4px
  off the torso centerline (`shoulderX - 4*faceSign`), which visibly floated apart from the body
  instead of reading as attached to it. Removed that off-hand entirely rather than patching its
  anchor — matches the single-arm reference sketch provided.
- The remaining arm now anchors at mouth height (just under the head, above the shoulder line)
  instead of shoulder height, so the pipe reads as actually held up to the face in one continuous
  gesture from head to tip, per the reference sketch.
- Updated the dart's actual spawn point in `fireProjectile()` to match — it was still using the
  universal shoulder-height pivot (-13) for every class; Blowdart now uses -21 (mouth height) so
  the dart still leaves exactly from the visible pipe tip instead of drifting out of sync with the
  new arm position.

## [1.0.67] - 2026-09-03
- Evolution hint now shows the target class's own icon and name in an "X Upgrade" format instead
  of a generic 🔒 lock emoji — e.g. "🔫 Gatling Upgrade — 6 more STR" instead of
  "🔒 6 more STR → Gatling".
- All 26 gold-tier upgrade costs across every tower bumped ~35% (rounded to the nearest 5) — e.g.
  Swordsman's three upgrades were 60/90/130/180, now 80/120/175/245. Ties into the same
  "grinding is more consequential" pass from 1.0.63 — gold investment now demands more commitment.

## [1.0.66] - 2026-09-03
- Reorganized the expanded options into two explicit rows instead of relying on flex-wrap to
  land buttons in a sensible place: Upgrade + Sell on top, Target + Move (+ Axeman's Mode toggle
  when applicable) + ❓ below.
- The evolution hint now sits inline on the same line as "STATS: N to spend" instead of its own
  row below the stat buttons.
- Split the ❓ help modal in two: the general one (now genuinely only about stickmen/hero towers —
  leveling, stats, archetypes, evolution, items, Legendary status, kill streaks, downed towers)
  no longer mentions Barricades at all. Barricade gets its own dedicated ❓ button and modal
  (block-strength HP, map expansion) — only one of the two ❓ buttons is visible at a time,
  swapped based on the selected tower's type.

## [1.0.65] - 2026-09-03
- Target-of-target frame now matches the inspect panel's actual rendered height (`min-height` set
  dynamically off the panel's `getBoundingClientRect()`, same call that already positions it) so
  the two plates read as one consistent set instead of the enemy plate looking noticeably shorter.

## [1.0.64] - 2026-09-03
- Attack speed on tower nameplates now uses ⏳ (hourglass) instead of ⚡. Walk speed on enemies
  (the target-of-target frame and the new-enemy-introduced popup) now uses 👟 (shoe) instead of
  ⚡ — distinguishes "how fast it attacks" from "how fast it moves" at a glance instead of both
  sharing the same lightning-bolt icon. Other unrelated uses of ⚡ (Kill Streaks header, shock
  status text, Masterwork gear icons) left as-is.

## [1.0.63] - 2026-09-03
- Starting lives raised from 20 to 30.
- New buy-life button (the ❤️ HUD stat is now clickable): costs gold, exponentially more
  expensive each purchase (`30 × 1.6^purchases` — 30, 48, 77, 123, 197...). Persisted across
  save/load via `livesBought`.
- All 18 enemies rebalanced to be slower but more dangerous: ~28% slower movement speed, ~22%
  more HP, ~15% more bounty and break-damage. Easier to track and react to, but hit harder and
  take longer to kill — same overall difficulty curve, different pacing.
- Added a leisurely walking bob to every enemy, synced to actual distance traveled (not just
  time) so it reads as a real gait rather than idle floating — was previously a totally static
  sprite except for the existing speed-based stretch/squash.
- Widened the archetype-preferred-stat payoff (`PREFERRED_STAT_MULT` 1.25 → 1.6): specialization
  and consistent stat investment now matter substantially more, Dota-style — an under-leveled or
  poorly-specialized tower falls meaningfully behind against the now-tankier enemy roster, instead
  of staying roughly competitive regardless of investment.

## [1.0.62] - 2026-09-03
- Full balance audit across all 13 towers and 18 enemies, done with actual computed metrics
  rather than eyeballing — extracted `CONFIG` and ran standalone Node scripts to compute:
  - **Tower DPS-per-gold-cost** (tier-1, accounting for melee-vs-ranged hybrid modes correctly —
    e.g. Axeman's dual-mode toggle was previously double-counted by summing both instead of
    taking the active one — and poison as a flat DPS bonus at its fixed 600ms tick rate).
  - **Tier-to-tier DPS growth ratios** for every tower (all towers scale ~1.5×-1.9× per tier
    upgrade — already consistent, no changes needed here).
  - **Enemy bounty-vs-threat ratio** (a composite of HP, armor, and speed) to find under/over
    -rewarded enemies.
  - Findings: most of the roster was already internally consistent. Two genuine outliers:
    - **Hammerman** was clearly under-tuned relative to similarly-costed towers (0.248 DPS/gold
      vs a 0.34-0.48 peer range) even accounting for its stun/shield/tank utility — damage bumped
      ~15% across all three tiers (20/30/45 → 23/34/52), landing at 0.285 DPS/gold: still lower
      than pure-damage classes (as its tank role should be), but no longer a stark outlier.
    - **Zombie**'s bounty (9) was low for its threat level — comparable HP+armor profile to Tank
      (150hp/9armor vs Tank's 220hp/6armor) but paid far less than Tank's 14 bounty. Bumped to 12.
  - Deliberately did NOT touch: Bomber (low single-target DPS is offset by its 55-radius splash,
    not captured by a per-target DPS metric), Mage/Cleric (their value is slow/status/curse/heal
    utility, not raw hit damage — by design), or Troll (intentionally the highest bounty-per-threat
    in the game, since its whole gimmick is a short kill window before it wanders off).

## [1.0.61] - 2026-09-03
- Reorganized the expanded stats section: was one cramped wrapping row (points counter, evolution
  hint, and all three STR/DEX/INT buttons all jammed together, wrapping unevenly). Now it's three
  clean stacked rows — a points-available header, an even 3-column STR/DEX/INT button grid, and
  a highlighted evolution-hint callout box below it.
- The evolution hint is now smarter about when to show a prediction: it only calls out a "most
  likely" evolution when exactly one relevant stat is strictly ahead of the others. At the start
  (all zero) or when two-plus stats are tied, it hides entirely instead of guessing — e.g.
  investing the first point in DEX now shows "🔓 9 more DEX → Axeman" or similar, but a fresh
  tower or an even 2/2/0 split shows nothing.

## [1.0.60] - 2026-09-03
- New WoW-style "target of target" frame: when the selected tower has an active target, a small
  red-bordered frame appears just to the right of the inspect panel showing that enemy's emoji,
  name, live HP bar, 🛡️ armor, and ⚡ speed. Only visible while the tower is actively targeting
  something — hidden otherwise.
  - Updates every rendered frame (not just on state-change events like the main panel) so the
    HP bar tracks combat live.
  - Positioned dynamically off the inspect panel's actual rendered width via
    `getBoundingClientRect()` rather than a fixed CSS offset, since the panel's width varies with
    its content.

## [1.0.59] - 2026-09-03
- Barricades no longer earn EXP or level up. They don't attack, so kill/killstreak XP never
  applied to them anyway, but the round-survival XP grant was universal and silently leveling
  them up regardless — fixed at the single `gainTowerExp()` funnel so every XP source respects it.
- New "New Enemy!" popup at the start of any wave that introduces an enemy type the player hasn't
  seen yet — same visual language as the wave-end summary popup, showing that enemy's emoji,
  name, HP/speed/bounty, and a one-line note on its special behavior (e.g. Healer heals allies,
  Skeleton revives once, Troll walks backward for a big bounty). Auto-fades after 5.5s.
  - Tracks `seenEnemyTypes`, persisted in save files; older saves reconstruct it from wave history
    on load so an in-progress run doesn't suddenly re-announce enemies already met.
  - Verified against the wave data that this fires exactly once per new type across waves 1-15,
    matching the one-new-enemy-per-wave pacing shipped in v1.0.52.

## [1.0.58] - 2026-09-03
- Speed button now cycles 1x → 2x → 3x → 5x → 10x → back to 1x (was capped at 3x).
- Added a safety cap (90 physics ticks per rendered frame) to the main loop's fixed-timestep
  catch-up, so a slow device running at 10x can't stall on one giant frame trying to fully catch
  up — any leftover simulation time just rolls into the next frame instead.

## [1.0.57] - 2026-09-03
- Reverted the XP bar's height back to 9px (undoing the 1.0.53 thinning) — that wasn't the
  actual complaint.
- Shrunk the panel's overall max-width from 480px to 320px, so the HP/XP bar (which stretches to
  fill available nameplate width) is shorter and the whole panel no longer runs most of the way
  across the screen.

## [1.0.56] - 2026-09-03
- The 📜 scroll toggle button now glows green (same style as the STR/DEX/INT stat buttons) whenever
  the selected tower has unspent stat points — visible even while the panel is collapsed, so
  players notice there's something to spend without having to open the full options first.

## [1.0.55] - 2026-09-03
- Fixed projectiles spawning visibly lower than the weapon they're supposedly fired from.
  `fireProjectile()` and `fireAxeThrow()` both used a flat shoulder-pivot height (`-13 *
  STICKMAN_SCALE`) for every class, but `drawStickman()` also scales that pivot by each class's
  own body proportions (`JOB_BUILD[type].scaleY`) and by the Legendary 1.1x size bump — neither of
  which the spawn-point math accounted for. Tall/lean classes like Archer (scaleY 1.08) render
  their weapon noticeably higher than the old flat pivot placed it, so their arrows spawned below
  the bow. Both spawn functions now multiply in the same `bodyScaleY` and Legendary factor that
  the renderer actually uses, so the muzzle position matches the visible weapon tip again.

## [1.0.54] - 2026-09-03
- New wave-end summary popup: shows total gold gained this wave, plus a per-class breakdown of
  EXP earned, each row led by that exact tower type's own emoji (e.g. a Blowdart's row uses 🎯,
  not the base Archer's 🏹) sorted highest-XP first. Auto-fades after 4.5s.
  - Added per-wave XP tracking (`tower.waveXp`), reset when each new wave starts, accumulated
    alongside the existing lifetime `xp` field inside `gainTowerExp()`.
  - Added a `waveStartGold` snapshot taken at wave start so the popup can show gold gained
    specifically during that wave (kills, bounty, and the end-of-wave gold bonus), not lifetime
    totals.

## [1.0.53] - 2026-09-03
- XP bar shrunk (9px→6px height, smaller text) so it reads as a slim secondary bar under HP
  rather than competing with it for visual weight.
- Combat stats row (⚔️❤️🛡️🎯⚡🍀) switched from `justify-content:space-between` to centered
  with a fixed 10px gap — the space-between was stretching gaps unevenly wide across the panel
  width. Also pulled tighter against the nameplate above it.

## [1.0.52] - 2026-09-03
- Reworked the first 15 hand-authored waves so each one introduces at most one brand-new enemy
  type instead of dumping several at once — previously wave 6 introduced Zombie and Skeleton
  together, and wave 7 introduced Runner, Splitter, and Wraith all in the same wave. Verified with
  a standalone script confirming exactly one new type per wave across waves 1-15 (wave 2 is a pure
  Grunt ramp-up with no new type, by design).
- True Dota-style stat gating: STR, DEX, and INT damage bonuses are now exclusive to their
  matching archetype instead of all applying at once. Previously every tower got the same +6%
  damage/point from STR regardless of class, with DEX/INT adding *extra* damage on top for
  Archer/Mage types. Now damage comes only from the archetype's own preferred stat — STR for
  Warriors, DEX for Archers, INT for Mages — matching the rate that STR previously had (+6%/point,
  same diminishing-returns curve). STR's +3% max HP/point and DEX's attack-speed/luck bonuses
  remain universal, since those were never framed as the "damage stat."
  - This was already correctly wired for the archetype system (Blowdart, Gatling, Bomber, and
    Squirtgun already counted as Archer-archetype via `CLASS_ARCHETYPE`; Cleric already counted as
    Mage-archetype) — no changes needed there, just the damage formula itself.
  - Updated the STR/DEX/INT button tooltips and the in-game "❓ How Everything Works" modal to
    describe the new gating accurately, and made the tooltips archetype-aware (`CLASS_ARCHETYPE`
    lookup) instead of checking the literal base type, so Blowdart/Gatling/Bomber/Squirtgun/Cleric
    now show the correct damage-stat callout too — previously only the base Archer/Mage classes
    got that tooltip text even though the mechanic already applied to their evolutions.

## [1.0.51] - 2026-09-03
- Blowdart's blowpipe now tracks the target continuously, same pattern as Mage's wand and
  Squirtgun's pistols — it previously only flipped between two fixed left/right poses regardless
  of the actual aim angle, so the pipe visibly wasn't pointing at what it was shooting. The
  projectile's actual spawn point (`fireProjectile()`) was already angle-correct; only the visible
  sprite was static. Draw geometry now matches the muzzle-offset formula exactly
  (`armLen*0.7 + 14*weaponScale`) so the dart leaves right from the pipe's tip at any facing angle.

## [1.0.50] - 2026-09-03
- Nameplate HP/XP bar now stretches to fill the available width next to the portrait instead of
  being capped at a fixed 170px, so it reads as noticeably longer/more prominent.
- Combat stats row (⚔️❤️🛡️🎯⚡🍀) now spreads evenly across the panel's full width
  (`justify-content:space-between`) to match the width of the nameplate row above it, instead of
  clumping on the left with unused space on the right.
- Tightened overall panel padding (10px→8px) and inter-element gap (8px→6px) for a more condensed
  look, per feedback that the previous pass was still too roomy.

## [1.0.49] - 2026-09-03
- Full leveling system rework, replacing the old "gold-tier upgrade = level" mechanic with a
  genuine Dota-style EXP system:
  - Every tower now has its own EXP level (1-99), tracked separately from its gold-bought upgrade
    tier. The nameplate's "Lv." now shows this EXP level.
  - EXP is earned from kills (small, frequent), killstreak milestones (a bigger burst), gold-tier
    upgrades (a flat training bonus), and — new — simply surviving to the end of a round, which
    now grants EXP to every active tower on the board.
  - Each level-up grants exactly 1 stat point, replacing the old flat "+4 points per gold-tier
    upgrade" lump sum, so growth is smaller and much more frequent rather than arriving in big
    chunks.
  - The nameplate's second bar (previously "evolution progress," shown only for evolvable towers)
    is now always visible and shows live XP progress toward the next level instead. Evolution
    progress moved into a small italic hint line in the expanded stats panel
    (e.g. "🔓 STR 7/10 → Hammerman").
  - Added a distinct two-tone level-up chime.
  - Updated the in-game "❓ How Everything Works" modal to explain the new leveling flow.
  - Save/load updated to persist the new `xp`/`expLevel` fields; older saves default to level 1.
  - Verified the leveling curve with a standalone 3-hour simulated-grind script (per the
    game-critical-logic testing convention) — reaches level 99 in a plausible timeframe without
    runaway growth or dead ends.

## [1.0.48] - 2026-09-03
- Reverted the bottom-left close button placement from 1.0.47 — that looked disconnected from
  the nameplate. ❌ now sits inline in the nameplate row, directly to the right of the 📜 toggle,
  same 28×28 square size as the toggle.
- Capped the inspect panel's overall width (`max-width:min(480px, 100% - 16px)`) instead of
  stretching it edge-to-edge across the screen — it was expanding much wider than the content
  needed.

## [1.0.47] - 2026-09-03
- Inspect panel's ❌ close button now matches the 📜 toggle button's size and square shape (was a
  much larger circular badge) and moved from an overlapping top-right corner to the bottom-left
  of the panel, so it no longer visually competes with the nameplate/portrait area.

## [1.0.46] - 2026-09-03
- Nameplate toggle button now shows 📜 instead of the ⌄/⌃ text arrow — the arrow still had a
  legible up/down state, so it's now conveyed with a CSS rotation on the scroll icon instead of
  swapping glyphs.
- Inspect panel's close button now shows ❌ instead of ✕, matching the emoji-forward icon style
  used elsewhere in the panel (⚔️❤️🛡️🎯⚡🍀).
- Condensed the nameplate row: smaller portrait, tighter gaps between the name/level line and the
  HP/evolution bars, and a smaller close button so the emoji doesn't look oversized in its circle.

All notable changes to Stick Tower Defense are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

See `AGENTS.md` for the workflow this file follows. See `BACKLOG.md` for ideas not yet built.

## [1.0.45] - 2026-09-03

- **Fixed projectiles spawning too low** — found the actual bug: the muzzle offset formula was
  purely radial from the tower's ground-level base position, completely omitting the fixed
  shoulder-height offset (`shoulderY = -13`) every class's arm/weapon pivots from before extending
  outward along the aim angle. For the most common case — a roughly horizontal shot at a
  similarly-positioned enemy — the old formula added zero vertical correction at all, so arrows
  spawned from the tower's dead-center ground point instead of ~15 world units up at actual bow
  height. Fixed both spawn sites (the main projectile function and Axeman's thrown axe) by adding
  the same fixed shoulder baseline the render-time hand position already uses, verified with real
  numbers before shipping rather than assumed correct from the formula alone.

## [1.0.44] - 2026-09-03

- **Fixed the close button overlapping the chevron** — moved `#inspClose` out of the flex flow
  entirely and absolutely-positioned it to the panel's own top-right corner, so it can never
  compete for space with the nameplate's chevron again.
- **Condensed the HP bar to real WoW scale** — was stretching edge-to-edge across the whole panel
  via `flex:1 1 auto`; capped the nameplate's middle column to a fixed 170px and shrank the bar
  height, matching how compact real WoW unit frames actually are.
- **Added an evolution-progress bar** — checked first and confirmed there's no actual numeric
  EXP/kill-count system in this game at all; leveling is entirely gold-purchased tier upgrades.
  Rather than fabricate a fake progress bar with no underlying data, built this against what's
  actually real: progress toward the nearest stat-based evolution threshold, honestly hidden for
  classes with no further evolution path (Spearman, Cleric, Squirt Gun, Paladin).
- Logged "expand level cap to 10" and "build a real EXP system" as backlog items rather than
  building them now — both are genuine content/balance projects (7 more tiers × 13 tower configs
  for the level cap alone), not something to fold into a UI polish pass.

## [1.0.43] - 2026-09-02

- **Added exponential-rarity blood stream sizing** — on-hit streams were previously a fixed size
  every time (count=3, no variance). Added an exponential-distribution size roll: verified with a
  20,000-sample simulation that ~58% of hits produce small splatters, ~28% normal, ~10% big, and
  only ~3.4% genuinely huge — a real long-tail rarity curve, not a flat random range. Floored at
  0.6x so blood is never absent on any hit (confirmed the floor still produces ~88-95% of baseline
  size, never zero), capped at 4.5x so the rare huge case stays dramatic without running away
  (up to 2.2x longer, ~2x thicker, nearly 3x as many streams). Both existing call sites (on-hit
  and on-death) get this automatically since the new parameter is optional and backward-compatible
  — death streams now share the same rarity curve as a free consistency win.

## [1.0.42] - 2026-09-02

- **Rebuilt the nameplate to actually look like a WoW nameplate** — added a circular portrait
  frame showing the tower's icon as its "face", a proper HP bar (fill + text overlay, green
  gradient) instead of no health visual at all, and replaced the small inline chevron text with
  a genuinely obvious bordered button (32x32, gold border, higher contrast). Verified every new
  element has exactly one HTML definition and consistent JS references before shipping — full
  syntax and HTML tag-balance checks both passed clean.
- Confirmed the Cleric fixes from the prior message were already shipped (v1.0.40) rather than
  redoing duplicate work — the uploaded screenshot and document were repeats of the same context.

## [1.0.41] - 2026-09-02

- **Added periodic status-effect reminder labels** — burn, curse, slow, and stun on enemies (and
  burn/slow on towers, from breakaway attacks) now surface floating text naming the active status
  every 120 seconds, not just at the moment it's applied. Long-running effects were easy to lose
  track of otherwise. Confirmed `spawnFloatingText`'s actual signature before wiring calls to it
  rather than assuming.
- **Process change**: added `BACKLOG.md` alongside `CHANGELOG.md`, and updated `AGENTS.md` to
  capture ideas and suggestions as they come up mid-conversation, not just completed work.

## [1.0.40] - 2026-09-02

- **Fixed Cleric only ever attacking undead** — confirmed the exact bug: `if(!e.isUndead) continue`
  skipped every non-undead enemy in target selection, meaning Cleric was effectively non-functional
  whenever no undead were nearby. Now targets the nearest enemy of any type.
- **Cleric is now a curse-DoT, not a single instant hit** — reused the existing poison/DoT
  infrastructure (`applyPoison`) instead of a burst `applyDamage` call. Deals 5x tick damage
  against undead specifically. Verified the actual tick math against the real 600ms poison tick
  interval rather than assuming a fixed tick count — undead take up to 138 total damage at max
  tier, normal enemies a real but modest 15-30.
- **Fixed Cleric's damage dropping on evolution from Mage** — confirmed with real numbers: Mage's
  max tier (13) was higher than Cleric's base tier (6), meaning a fully-upgraded Mage evolving into
  Cleric was a straight downgrade. Rescaled Cleric to 14/20/28 — even its base tier now exceeds
  Mage's fully-upgraded one.
- **Fixed the idle pose holding a cross overhead permanently** — the raised casting-arm gesture
  was unconditional every frame, idle or not. Now only raises toward the target while actively
  casting; rests at a natural side position when idle, matching the pattern used by every other
  class in the file.


- **Fixed the compact/expand feature being completely non-functional** — while checking "anything
  else" after the nameplate redesign, found that `#inspFullOptions` had zero matching CSS anywhere
  in the file. Every other `.hidden` toggle in this codebase is defined per-element (there's no
  shared generic rule), and this element never got its own — meaning the JS was correctly toggling
  the class the whole time, but nothing told the browser what that class should actually do to
  this element. The full options section had been showing unconditionally regardless of expand
  state since the feature was built. Added the missing rule and reverified both the JS syntax and
  full HTML tag balance before shipping.

## [1.0.39] - 2026-09-02

- **Fixed the compact/expand feature being completely non-functional** — while checking "anything
  else" after the nameplate redesign, found that `#inspFullOptions` had zero matching CSS anywhere
  in the file. Every other `.hidden` toggle in this codebase is defined per-element (there's no
  shared generic rule), and this element never got its own — meaning the JS was correctly toggling
  the class the whole time, but nothing told the browser what that class should actually do to
  this element. The full options section had been showing unconditionally regardless of expand
  state since the feature was built. Added the missing rule and reverified both the JS syntax and
  full HTML tag balance before shipping.

## [1.0.38] - 2026-09-02

- **Redesigned the panel toggle to match real WC3 nameplate behavior** — removed the separate
  "⌄ Options" button entirely. Tapping the nameplate itself (name + level) now toggles between
  compact and full view, with just a small chevron indicating it's expandable, rather than a
  labeled button explaining what to do. Added proper tap styling (active-state highlight, pointer
  cursor) since no CSS existed for these elements before. Verified full HTML tag balance and
  confirmed no dangling references to the removed button anywhere in the file before shipping.

## [1.0.37] - 2026-09-02

- **Tapping a tower now shows a compact view first, with a "⌄ Options" button to open the full
  panel** — matches the requested WC3/WoW nameplate flow (tap the unit, get basic info, use a
  button to expand into full options) without building a separate canvas-tracked floating overlay,
  which would have needed real-time world-to-screen projection and carried genuine risk of
  positioning edge cases. Reused the existing bottom panel instead: compact by default (name,
  level, combat stats), full options (upgrade/move/sell/target/stats/inventory) collapsed behind
  the button, resetting to compact every time a different tower is newly selected.
- **Caught a genuinely dangerous bug before shipping this** — a bulk find-and-replace used to add
  the reset logic across 10 call sites matched a substring inside the variable's own `let`
  declaration line, inserting an assignment to `inspPanelExpanded` *before* its declaration. This
  is a temporal-dead-zone violation that would have thrown a ReferenceError and crashed the
  entire game on page load — and critically, `node --check` (syntax-only) does not catch this
  class of bug at all, since the code is syntactically valid. Found it by manually reviewing every
  insertion site rather than trusting the syntax check alone, then verified the fix with an actual
  Node execution simulating the real declaration order, not just a re-run of `--check`.

## [1.0.36] - 2026-09-02

- **Fixed remaining projectile-spawn precision errors** — checked every class's muzzle offset
  formula directly against its exact render geometry rather than trusting the earlier
  approximations. Confirmed Mage, Bomber, Gatling, and Squirt Gun were already exact matches
  (no change needed). Found two real, confirmed discrepancies: Blowdart's formula was missing the
  weaponScale multiplier on the pipe length (9.7px error at max INT investment — nearly a third
  of the correct offset), and Archer was missing the +2 draw-tension term the render math applies
  at full draw (2.3px error). Also confirmed the bow's visual midpoint is exactly at the hand
  position (bowTop/bowBot are both offset perpendicular from the hand, not from a further point),
  so "spawns from the middle of the bow" was already structurally correct — the fix was in the
  reach distance leading up to that point, not the concept.

## [1.0.35] - 2026-09-02

- **Added an upgrade-available glow** — a pulsing golden ring appears around any tower that's
  below max level *and* currently affordable, visible directly on the map without needing to
  select the tower first. Confirmed this didn't already exist anywhere in the codebase before
  building it — no nametag or upgrade-indicator system was present at all.
- **Note on scope**: full WC3/WoW-style floating nametags above every active tower (name, level,
  HP bar, expandable panel) is a substantially larger feature — real-time world-to-screen
  projection for potentially 20+ simultaneous towers, with a real risk of cluttering the screen.
  Built the concrete, immediately useful piece (the glow) rather than the full overlay system in
  the same pass; the existing bottom inspect panel already covers stats/leveling once a tower is
  selected.

## [1.0.34] - 2026-09-02

- **Bomber and Gatling now have distinguishing gear** — audited every class and confirmed these
  two (plus Spearman) were the only ones with zero accessory of any kind. Gave Bomber a shell
  pouch on the hip and Gatling an ammo belt across the chest with cartridge marks (reused the
  same geometry already verified clear of the head from the bandolier work). Left Spearman as-is
  — a spear alone is a complete look and doesn't need added gear the way a gunner does.
- **Confirmed no save/load gap from this session's visual work** — checked `serializeGameState()`
  directly: weaponScale, weaponThickness, and decals are all computed fresh from stats (str/dex/
  int/range) that were already being saved, not separate state that needed new persistence.

## [1.0.33] - 2026-09-02

- **Quiver gap widened slightly** — was still reading as a bit too attached to the body.
- **Blowdart now has a hip pouch** instead of no back accessory at all — a small dart pouch on
  the hip, opposite the throwing hand.
- **Squirt Gun now has a bandolier** instead of no accessory — crossed straps across the torso
  with cartridge dots, fitting a dual-gunner better than a quiver would. Verified the bandolier's
  top point stays clear of the head before shipping.

## [1.0.32] - 2026-09-02

- **Blood decals now grow and settle over time instead of appearing instantly at full size** —
  each stain tracks its own spawn time; blobs start small and expand to full size over 0.7
  seconds (verified with the actual curve math), then the whole decal darkens/settles to 75%
  opacity over the next few seconds and holds there permanently — a lasting stain, not a
  vanishing effect.
- **Added occasional directional cast-off streaks** — real blood spatter travels away from where
  the strike came from, not radially outward like a splash. ~40% of kills (when the attacking
  tower is known) now spawn a growing line decal along that actual attacker-to-target angle,
  alongside the normal splatter.

## [1.0.31] - 2026-09-02

- **Quiver no longer merges into the body** — was touching the torso flush at x=0; given a small
  gap plus a visible shoulder strap connecting it to the body, so it reads as worn on a strap
  instead of fused into the silhouette.
- **Blood puddles are only sometimes messy now, not every time** — the extra scattered decals were
  guaranteed on every single kill. Made them probabilistic: verified the actual resulting split —
  65% of kills leave one clean stain, ~35% get the messier multi-splatter look. Every kill still
  leaves a mark, just not maximum chaos every time.

## [1.0.30] - 2026-09-02

- **Projectiles now spawn from the actual weapon tip instead of the tower's center** — confirmed
  the bug: every arrow, bolt, staff blast, and mortar shell was spawning from `this.x, this.y`
  regardless of where the weapon visually is. Fixed for all 6 ranged classes (Archer, Mage,
  Bomber, Gatling, Blowdart, Squirt Gun) plus Axeman's thrown axe — found this was a second,
  separate code path that would've been missed if only the main projectile function was checked.
  The offset replicates the same local-space reach (arm length + weapon length) used when
  rendering the stickman, converted to world-space, so it scales correctly with weaponScale (INT
  investment) exactly like the visible weapon does — verified with real numbers across every
  class and both ends of the INT range (20-40px offsets, growing correctly where the weapon
  itself grows, fixed where it doesn't).

## [1.0.29] - 2026-09-02

- **Quiver rebuilt per spec** — replaced the abstract line-fan with an actual rectangular quiver
  body (filled, outlined) with three arrow shafts and fletching sticking out the top, its inner
  edge touching the torso directly instead of floating disconnected or being hidden behind it.
  Also flipped the side logic — was on the same side as the facing direction, now correctly on
  the opposite side (facing right → quiver on the left, and vice versa). Caught the fletching tips
  poking 2 units into the head with the initial position before shipping, adjusted and reverified
  clear.

## [1.0.28] - 2026-09-02

- **Added a rare "massive pool" tier to blood decals** — was previously a binary normal/big split
  (80%/20%); now a three-tier system where ~70% stay ordinary, ~22% come out noticeably bigger,
  and ~7% are genuinely massive splatters (up to 5x the size of a typical pool). Verified the
  actual distribution and size ranges with a 5000-sample simulation before shipping, not just
  eyeballed the probabilities.

## [1.0.27] - 2026-09-02

- **Actually fixed the quiver rendering in front of the body instead of behind it** — the previous
  three attempts only adjusted its X/Y position, but the real bug was draw order: the quiver was
  drawn *after* the torso, so it always rendered on top regardless of where it sat. Also, the
  quiver was positioned far enough from center (±6 units) that the torso's own line never actually
  overlapped it, so even correct draw order alone wouldn't have occluded anything — verified this
  with the actual geometry before attempting a fix. Brought the quiver base in to ±2 units from
  center and now explicitly redraw the torso on top of it with a deliberately widened stroke,
  confirmed with real numbers to genuinely cover the quiver base this time.

## [1.0.26] - 2026-09-02

- **Screen shake now only triggers on Boss kills** — every single enemy death was shaking the
  screen, which gets tiring fast during dense waves with dozens of kills. Regular kills keep all
  the gore (streams, gibs, particles, decals) but stay visually calm; Bosses stay impactful.

## [1.0.25] - 2026-09-02

- **Real flowing blood streams with water physics** — new particle type that tracks its previous
  position each tick and renders as a genuine connected line (not a dot or dash), tapering in
  width as it loses momentum. Verified with actual physics math: the stream arcs downward under
  gravity while decelerating, exactly like a real jet of liquid rather than scattered dust.
  Directional on hit (uses the actual angle from attacker to target), radiating outward on death.
- **Fixed the Archer's quiver still overlapping the head** — lowered it to back/shoulder-blade
  height and shortened the arrow fan; verified the new top edge sits well below the head boundary
  instead of extending past it.

## [1.0.24] - 2026-09-02

- **Gore now scales with the size of the kill** — a Swarm death is a smaller burst than a Tank or
  Boss death, instead of every kill spawning an identical amount of gore regardless of how tough
  the enemy was. Scales off the enemy's own maxHp, bounded between 0.7x and 1.8x so it stays
  proportional without Bosses spawning an absurd particle count.
- **Subtle idle breathing sway** — towers with no target now have a small vertical bob instead of
  standing perfectly rigid. Each tower's phase is offset by its own position so a row of idle
  towers doesn't all bob in unison.

## [1.0.23] - 2026-09-02

- **Fixed the Archer's quiver on the wrong side of the back** — flipped its position, and made it
  dynamically mirror based on facing direction (was a fixed position regardless of which way the
  Archer was aiming), so it stays correct whichever direction the tower faces, not just the one
  snapshot it was reported in.

## [1.0.22] - 2026-09-02

- **All arms now connect at exactly one shared shoulder point** instead of two nearby-but-distinct
  offset points (was ±1.5-4 units apart depending on class). Applied to all 26 occurrences across
  every weapon-holding class.
- **Chest plate redesigned as a tapered trapezoid** — narrow at the top, widening toward the
  waist, instead of a uniform-width bar. Also moved its top edge from y=-16 down to y=-10, giving
  7 units of real clearance from the neck (was reaching almost up to it).

## [1.0.21] - 2026-09-02

- **Fixed the Archer's drawing-arm shoulder sitting almost on the neck** — verified with real
  coordinates: the back shoulder was landing just 0.5 units below the head/neck boundary when
  facing horizontally, from a shoulder offset (3.5) that was too large. Reduced to 1.8, which
  pulls it to 2.2 units of clearance — over 4x more room — confirmed with the same math before
  shipping, not just eyeballed.

## [1.0.20] - 2026-09-02

- **Armor now draws on top of arms instead of being crossed over by them** — the chest plate
  (level 2+) and helmet (level 3+) were rendered before the arms, so arm lines cut across and
  obscured them. Moved armor rendering to happen after everything else instead.
- **Increased weapon size growth per INT investment** — first attempt at this actually made growth
  *slower* (verified the mistake with real numbers before shipping it, then reverted). The
  correct fix: increased the actual min/max size targets for all 8 classes by roughly 15-30%
  rather than changing the growth curve itself. Confirmed with real numbers that the same amount
  of INT investment now produces a visibly bigger weapon (e.g. Swordsman: 17.5 units old vs. 19.0
  new, at the same realistic investment level) while the zero-INT baseline size didn't shrink.
  Re-verified head clearance against every new max size — Swordsman and Two-Hander needed more
  conservative caps (23/24 instead of an initially-planned 26/30) to stay clear.

## [1.0.19] - 2026-09-02

- **Restored upright weapons when idle/between rounds** — a couple versions ago these were
  switched to hang downward to sidestep a head-clearance issue with the bigger weapon sizes, but
  upright reads better and was the original design intent. Restored the 55°-tilted upright pose
  and re-verified with real numbers (not assumed from before) that every class's current actual
  max size still clears the head at this angle — all 7 confirmed clear, none needed further
  adjustment.

## [1.0.18] - 2026-09-02

- **Fixed the Archer's drawing-arm elbow bending unnaturally upward when facing right (or left)**
  — traced the exact cause: the back shoulder's own offset already sits above center when facing
  horizontally, and the old perpendicular elbow-kick compounded in that same direction, stacking
  the elbow well above the shoulder. Replaced the perpendicular kick with a fixed downward droop,
  matching real archery form (the drawing elbow stays level or drops slightly, never rises).
  Verified with real coordinates for the exact "facing right" case reported — the elbow now sits
  below the shoulder instead of stacked above it, and this holds at every facing direction since
  the droop no longer depends on aim angle at all.

## [1.0.17] - 2026-09-02

- **Fixed the off-hand crossing to the wrong side of the body while swinging** — last version's
  vertical clamp only stopped it from swinging up into the air, but didn't stop the horizontal
  case: when the weapon swings toward the left, its "exact opposite" angle points right, sending
  the off-hand (anchored on the left shoulder) reaching all the way across the body. Confirmed
  this with real angle math before touching code. Rather than patching the direction-tracking
  approach a third time, replaced it entirely — the off-hand is now fixed at its natural resting
  angle regardless of the weapon's swing direction, so there is no longer any possible angle where
  it can cross the body or swing upward, verified by testing it against five different weapon
  angles and confirming the output is now identical every time. Applied to all 6 classes that
  shared the old pattern (Swordsman, Spearman, Mage, Bomber, Gatling, Cleric).

## [1.0.16] - 2026-09-02

- **Fixed the off-hand swinging up into the air while attacking** — it counterbalanced the exact
  opposite of the weapon arm's swing angle, which is correct most of the time but points straight
  up whenever the enemy being fought happens to be above the tower. Clamped so it reflects back
  downward instead, keeping the same left/right lean without ever raising into the air. Verified
  across five different swing scenarios (enemy above, below, left, right, diagonal) — the exact
  "enemy above" case that broke before now stays correctly grounded. Applied to all 6 affected
  classes (Swordsman, Spearman, Mage, Bomber, Gatling, Cleric).
- **Fixed a color mismatch on the Archer** — the nocked arrow shown mid-draw was brown, but the
  actual fired arrow projectile is yellow/gold. Matched them so the same arrow looks consistent
  whether it's being drawn or already in flight.

## [1.0.15] - 2026-09-02

- **Weapons are noticeably bigger at base, and STR now makes them thicker** — added a new
  `weaponThickness` stat (diminishing returns, capped at 1.8x) applied to blade width, crossguard
  size, hilt size, and equivalent head/tip geometry across every weapon-holding class. INT still
  controls length via the existing system, now with meaningfully larger min/max ranges per class
  (e.g. Swordsman went from 9-12.5 to 14-24 units).
- The bigger base sizes meant the old straight-up idle pose no longer had enough vertical
  clearance below the head, so idle weapons across all affected classes now tilt 55° instead of
  pointing straight up — verified with real numbers that every single class's new maximum size
  stays clear of the head at this angle, not just guessed at.

## [1.0.14] - 2026-09-02

- **Fixed arms visually floating away from the torso** — every two-armed class positioned its
  arms starting ±3 to ±4 units to either side of the torso's centerline, with nothing drawn to
  bridge that gap, so arms read as disconnected from the body. Reduced to ±1.5 across all 15
  affected call sites (still enough separation to distinguish left/right, but close enough to
  read as actually attached).
- **Fixed the Archer's drawing-arm elbow flaring the wrong way** — the elbow kick used a fixed
  rotational formula independent of which side the back shoulder actually sits on, so depending
  on which direction the Archer was facing, the elbow could bend toward the body instead of away
  from it. Now kicks in the same direction the back shoulder is already offset, which is
  guaranteed correct regardless of facing — verified across all four cardinal directions, not
  just the one that happened to look right during testing.

## [1.0.13] - 2026-09-02

- **Found and removed the actual root cause of every "extra limb" report across this entire
  session.** There was a leftover global block — drawn unconditionally, for every class except
  Axeman and dual/two-hander Swordsman specs, completely outside the careful per-class off-hand
  systems that were built afterward — that stamped a hardcoded extra arm-like line (0,-12) to
  (-10,-2) on top of everything else, every single frame. Every class already had its own correct
  off-hand logic; this was pure leftover dead code silently drawing a genuine extra limb on top of
  it the whole time. Manually verified (not just scripted) that Swordsman, Mage, and Spearman each
  render exactly the arms they should — no more, no less — with this block gone.

## [1.0.12] - 2026-09-02

- **Fixed weapon size changing when a tower swings/fires** — idle and engaged poses were computing
  weapon length from two entirely different formulas (a short idle-safe base vs. the old full
  combat length), so the weapon visibly grew or shrank depending on whether the tower had a
  target. Replaced with a single shared function (`weaponLenFromScale`) that both states now call
  identically — same length whether idle or mid-swing, only INT/range investment changes it.
- Every weapon-holding class now has an explicit min length (at no INT invested) and max length
  (at that class's own range cap), verified with real numbers: min is hit exactly at baseline,
  max is hit exactly at the range cap, and the value never overshoots even against out-of-range
  inputs. Applied to all 8 classes — Swordsman, Axeman, Spearman, Hammerman, Mage, Bomber,
  Gatling, and Squirt Gun.

## [1.0.11] - 2026-09-02

- **Fixed weapon growth (INT/range investment) being completely invisible when idle** — a
  regression from the head-overlap fix two versions ago. Proved it with real numbers: every
  weaponScale from 1.0x to 1.6x was clamping to the exact same length, meaning INT investment had
  zero visible effect on idle weapon size, for all 7 affected classes (Swordsman, Spearman,
  Hammerman, Mage, Bomber, Gatling, Squirt Gun). The fix: idle poses now use their own shorter
  base length sized to fit entirely within the safe head-clearance budget, so growth is visible
  at every single step across the realistic range, while the clamp remains as a safety net only
  for genuinely extreme edge cases (e.g. a maxed-out Two-Hander).
- **Lowered the shoulder pivot slightly** (y=-15 → y=-13) — the previous "attach arms at the
  body's edge" fix had overcorrected a bit too high.

## [1.0.10] - 2026-09-02

- **Random pool-size variance** — roughly 1 in 5 blood pools now come out dramatically bigger
  (verified: up to 2.6x larger at the extreme, not just marginal noise), with more blobs and a
  wider spread, so the ground doesn't fill up with uniform puddles.
- Pushed overall gore further: more particles in every layer, more gib debris per kill (up to 10
  at high graphics), and a third scattered stain per death for a genuinely messy, uneven pool
  rather than a tidy ring around the kill point.

## [1.0.9] - 2026-09-02

- **Fixed Archer's drawing arm — the real cause of the recurring "extra limb" look.** The string
  arm was using the same generic fixed-segment-ratio arm function as every other class, but that
  function assumes a roughly full-length reach. Pulling it in close (as short as 6 units, early
  in the draw animation) forced the upper arm and forearm into a cramped, overlapping fold that
  read as an extra limb. Replaced with proper geometry for this specific case: the string hand
  slides back from the bow grip along the aim axis exactly like a real draw motion, and the elbow
  kicks out perpendicular to the shoulder-to-hand line so it stays clean at any pull distance.
  Verified with real geometry math across the full draw cycle (0% to 100%) — both arm segments
  stay a sane, non-degenerate length the entire time, no collapse at any point.

## [1.0.8] - 2026-09-02

- **Significantly escalated gore intensity** — main blood burst nearly doubled (22→42 particles),
  added a third bright high-velocity spray layer, and a new tumbling "gib" debris system (chunky
  rotating squares, distinct from the fine spray, with heavier physics). Pooling decals now spawn
  two overlapping stains per death instead of one, each with more and larger splatter blobs.
  Screen shake on kill increased and lasts longer. On-hit spray (not just kills) also boosted, so
  every hit reads as visceral, not just the kill itself.
- Fixed a real bug caught before shipping the above: the particle pool is reused in a circular
  buffer, so a slot previously used for the new gib debris could leak its rotating-square render
  mode into a later, unrelated particle spawn. Every regular particle spawn now explicitly resets
  that flag.

## [1.0.7] - 2026-09-02

- **Extended curated waves from 20 to 100** — rather than hand-typing 80 one-off arrays (slow,
  error-prone, hard to balance consistently), built on the existing procedural-wave formulas and
  added two new archetypes: 🃏 Trick (opens deceptively weak, then springs Splitters/Trolls/Tanks
  mid-wave) and ⛏️ Grind (a long, widely-spaced slog testing sustained DPS and economy rather than
  burst reaction). Waves cycle through 7 archetypes with a dedicated 👑 Boss milestone every 10th
  wave (30, 40, 50...100), all baked into real, concrete wave definitions rather than left to
  run-time randomness.
- Caught and fixed a real overflow bug during generation: the original count-scaling formulas,
  uncapped, would have produced a 698-enemy wave by wave 98 — nearly 3x the enemy pool's actual
  220-object capacity, meaning most of that wave would have silently failed to spawn. Capped the
  scaling input so the worst-case wave (157 enemies) stays safely under the pool limit.
- The wave-type toast (previously only shown for waves beyond the hand-authored range) now also
  fires for these new curated waves, so the Trick/Grind/Boss distinction is visible in-game.

## [1.0.6] - 2026-09-02

- **Fixed idle weapons overshooting past the head** — a regression from raising the shoulder
  pivot two versions ago (to fix arms attaching at the middle of the body): every class's idle
  "weapon held straight up" pose never got re-checked against the new, higher shoulder position,
  so the sword/staff/hammer/etc. tip was crossing up into the head — confirmed with actual
  geometry math, not just a guess (blade tip landed inside the head's circle at every weapon
  scale, even the base case). Added a shared clamp so any idle weapon's upward reach is capped
  just below the head, applied to all 7 affected classes (Swordsman, Spearman, Hammerman, Mage,
  Bomber, Gatling, Squirt Gun) from one shared function.

## [1.0.5] - 2026-09-02

- **Gravity on gore particles** — the blood burst on hit/death now arcs and falls instead of
  spraying out in a flat radial pattern, reading as actual directional spray rather than a
  generic particle puff. Every other particle use (gold pickups, sparkles, star effects) is
  unaffected — gravity is opt-in per spawn.
- **Persistent ground blood decals** — enemy deaths in gore mode now leave a permanent pooling
  stain on the ground (a few overlapping irregular blobs, not a plain circle), capped at 150
  active stains on a circular buffer so it stays performance-safe over a long session. Clears on
  a new game and immediately when gore mode is turned off.

## [1.0.4] - 2026-09-02

- **Extended curated waves from 15 to 20** — 5 new hand-authored waves escalating through the full
  enemy roster (heavier Tank/Zombie/Wraith combinations, denser Swarm/Wolf floods, an Undead
  Uprising, and a Shielded/Splitter gauntlet), ending in a bigger 2-Boss finale at wave 20.
  Procedural generation still takes over seamlessly past that, unchanged.
- **Steeper per-wave HP scaling** — 20% growth per wave instead of 15%, so difficulty ramps up
  meaningfully faster across the whole game, not just in the new waves.
- Confirmed Barricades were already correctly restricted to path tiles only (this had been flagged
  as possibly missing — checked the actual code and it was already implemented correctly).

## [1.0.3] - 2026-09-02

- **Fixed DEX/INT damage bonuses not applying to evolved classes** — the check was against a
  tower's literal type (`'ARCHER'`, `'MAGE'`) rather than its archetype, so Blowdart, Squirt Gun,
  Gatling, Bomber, and Cleric all silently lost their own archetype's primary damage scaling the
  moment they evolved. Now checks archetype, so every class in a family keeps its stat scaling
  through every evolution stage.
- Added an Attack Speed stat (⚡, attacks/second) to the tower inspect panel — previously only
  visible indirectly through cooldown timing, not shown as an actual number anywhere.
- Squirt Gun now renders holding actual pistol emoji (🔫) instead of plain grey line-shapes.

## [1.0.2] - 2026-09-02

- **Fixed arms attaching at the middle of the body instead of the shoulder** — the shared shoulder
  pivot every class's arms draw from was sitting roughly a third of the way down the torso rather
  than at the top edge near the neck. One constant change fixes this for every class at once.
- **Redesigned Blowdart's rendering** — replaced its continuous-angle arm/pipe rig (the same
  fragile pattern that kept causing detached-looking limbs) with a simple left/right facing flip:
  one arm fixed in a mouth-held pose, mirrored depending on which side it's shooting toward,
  instead of tracking an arbitrary rotation angle.
- Removed the static version line from README.md — it duplicated the in-game version display and
  was easy to forget updating, causing it to silently drift out of sync.

## [1.0.1] - 2026-09-02

Class identity overhaul: three starting towers with a full evolution tree, a real stat system
with archetype preferences and diminishing returns, and a much deeper combat layer (poison, holy
damage, accuracy). Also a significant mobile/rendering pass — this was the single largest patch
since 1.0.0.

**Class archetypes & evolution**
- Only Swordsman, Archer, and Mage are directly buildable now. Every other class — Axeman,
  Spearman, Hammerman, Gatling, Blowdart, Bomber, Cleric — is reached by investing 10+ points into
  a specific stat on one of those three, a one-way transformation that keeps accumulated stats.
- New second-tier evolution: Blowdart → Dual Squirt Gun at 25 DEX, twin water pistols spraying
  corrosive green acid.
- Every class belongs to one of three archetypes (Warrior/STR, Archer-style/DEX, Mage/INT) — a
  tower's favored stat is 25% more effective per point than the same investment on a mismatched
  class.
- Diminishing returns on every stat: every 5 points invested, the next 5 are worth progressively
  less, down to a 25% floor.
- Some classes cap out early on a stat that doesn't fit their identity — Mage/Cleric/all four
  melee classes plateau on accuracy at 15 DEX; Archer plateaus on HP at 15 STR.

**Stat effects**
- STR: damage and max HP. DEX: attack speed, accuracy (new miss-chance system, 12% base), and
  🍀 Luck — bonus gold per kill. INT: range, plus class-specific bonuses (Mage's own damage,
  Archer's own damage, Blowdart/Squirt Gun's poison strength).
- Random stat growth on every level-up (0-2 in each stat, plus a bonus 1-2 in the favored stat),
  on top of manually-spendable points (bumped from 3 to 4 per level).
- 100 total stats invested makes a tower Legendary — name it, permanent +10% size, +5% max HP,
  +5% damage reduction.

**Combat & status effects**
- Poison (Blowdart/Squirt Gun), holy damage bonus vs. undead (Cleric's smite, 1.5x + armor
  bypass), chain lightning on the Mage's shock proc.
- A tower that hits 0 HP is now locked out of action for the next 2 full rounds, not just a
  short timer.
- Kill streaks retuned: 1.2s window between kills (was too forgiving), splash/cone hits only
  count once toward a streak regardless of how many enemies they kill at once.

**New enemies & towers**
- Zombie, Wraith, Skeleton (revives once), Wolf (pack speed bonus) — Zombie/Wraith/Skeleton
  tagged undead, vulnerable to holy damage.
- Cleric tower — heals the board's lowest-HP tower once per round (multiple Clerics coordinate,
  never piling onto the same target), separately smites nearby undead.
- 6 procedurally-generated wave archetypes past wave 15 (Swarm Surge, Elite Vanguard, Undead
  Uprising, Ambush Tactics, Siege Assault, Standard) instead of one scaling formula forever.

**Rendering & animation**
- Every weapon-holding class now has both arms genuinely rendered and connected — several classes
  had been missing an off-hand entirely, or had one frozen independently of the weapon arm's
  actual swing/aim angle.
- Idle stance (no target): both arms at a symmetric 45°, weapon held up, independent of arm angle.
  Engaged: weapon points/swings at the target, off-hand counterbalances opposite it.
- Fixed heads rendering as ovals instead of circles — the head was drawn as a perfect circle, but
  after each class's own non-uniform body scale had already been applied to the canvas transform,
  so the circle was getting stretched by that ratio. Radii are now pre-compensated per class.
- Weapon visual length now scales with a tower's actual range (INT investment).

**Mobile & UI**
- Fixed the root cause of the game needing "Desktop site" mode to render correctly on phones — a
  hard CSS block was completely hiding the game whenever the screen was portrait, and separately a
  camera-clamp formula assumed the viewport and the world were always the same size.
- Canvas now fills the actual window at native resolution instead of a fixed letterboxed frame.
- Consolidated two separate "?" info buttons into one comprehensive help modal.
- Moved the Expand button into the Build menu to reclaim HUD space.

- Swordsman attack speed increased (~13-15% shorter cooldown across all tiers).
- Archer attack speed decreased (~13-15% longer draw + cooldown cycle across all tiers) to better
  balance its higher per-shot damage from the draw mechanic.
- Inspect panel stat display reworked: STR/DEX/INT no longer look like disabled/dimmed buttons —
  they stay normal-colored always, gain a green glow specifically when points are available to
  spend, and use a recessed inset-shadow "slider" style instead of a flat raised-button background
  so they read as a display, not a clickable action. Info icons (❓) for STATS and INVENTORY moved
  to sit before their labels and lost their button chrome (plain glyph, no circle/border).

## [1.0.0] - 2026-08-31

First versioned release. Baseline snapshot of the full feature set built up to this point.

- **8 tower classes plus Barricade** (Swordsman, Archer, Axeman, Spearman, Hammerman, Mage, Bomber,
  Gatling) — each with a distinct color identity, body build, and combat role, so classes read as
  visually distinct at a glance rather than reskins of the same figure.
- **Archer draw mechanic** — the bow now visibly charges before firing instead of snapping to a
  static pose; slower arrows but real damage behind a completed draw, because the old instant-fire
  archer didn't read as an archer at all.
- **Expanding spiral map** — starts as a tiny 2x2 area (half path, half buildable), and grows ring
  by ring as waves clear. Expansions alternate between extending the path as a connected spiral
  loop and adding pure buildable space, so the map both winds outward visually and gives you room
  to build, rather than regenerating into a disconnected new shape each time.
- **Barricade** — a non-attacking, path-placeable obstacle. Freezes the first enemy that touches it
  (and anything queued behind it, spaced so they never overlap) — HP only drops from actual hits,
  rate-limited to 1 point per 2 seconds, because a passive timer didn't feel like a "health" stat.
- **Breakaway enemies** — Fire and Ice types (and a small chance for any enemy) can leave the path
  entirely to attack a tower directly, inflicting burn or a slow debuff on it. Gives towers actual
  stakes beyond just DPS math.
- **Troll enemy** — big bounty, walks backward toward the entrance instead of forward, and can
  swing at a nearby tower to drop debris that costs gold to clear.
- **Hero item system** — every tower starts with free class gear; better gear (Iron/Gold/Masterwork)
  is bought per-class from the Shop, plus global passives that apply to every tower owned. A tower
  with all 4 slots filled awakens as a Hero with a permanent stat bonus.
- **Infinite waves** — procedurally scaled difficulty continues past wave 15, since this is meant
  to support long hero-building sessions rather than end at a fixed wave count.
- **Settings menu** — Video (graphics quality), Audio (mute), Game (18+ gore toggle, save/load),
  About (in-app README viewer/downloader).
- **Save / Load** — full game state serializes to a downloadable `.txt` file with a random seed
  header; restorable on this device or any other. Save files are stamped with the game version.
- Numerous balance passes (Swordsman attack speed up, Archer attack speed down, melee swing arc
  widened so it reliably hits everything within its stated range) and bug fixes (an upgrade-cost
  method name colliding with a same-named tier data field, which silently broke every tower upgrade
  past the first one; a Barricade HP display bug caused by a generic regen system applying to a
  tower type it shouldn't have; map generation that could leave zero buildable tiles in a small
  starting region).
