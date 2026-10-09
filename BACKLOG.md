## 1.7.167 — title-screen movement
- Opening attract enemies slowed40%; gameplay movement and speed settings unchanged. Syntax and focused phase/arrow-drag movement checks passed; browser visual pacing remains unverified.

## 1.7.166 — weapon forensic identity delivered
- Explicit profiles cover all33 tower entries, plus thrown axe, skeleton and environment. Core contact patterns differ by weapon action; actual projectile/blast/companion direction is threaded through affected impact/death paths. Noncombat towers explicitly emit no outgoing blood.
- Owner vision and every class's intended pattern are recorded comprehensively in CHANGELOG1.7.166 and protected in AGENTS/designContractProblems. Distinction comes from geometry, direction, scale and action, not colour swaps or escalating counts.
- Focused profile/geometry/emission and syntax checks passed. Browser visual comparison and sustained performance remain unverified. Existing supplemental family gore remains; anatomy, material-specific surface response and medical validation are not implemented or claimed. Do not broaden testing without request.

## 1.7.165 — latest audit outcome
- Implemented paired mature breeding, next-round hearts/births, saved pairing/cooldowns, three completed rest rounds and reserved baby capacity. Corrected basket/present sizing in existing and new saves.
- Implemented 60–90-second blood fading, restrained elliptical drop bodies/forward tips, smaller pool lobes/gloss and shorter cache-aging windows. Preserve stationary puddles and independently capped optional spray. Supersedes historical eight-second spray and six-minute surface-stain notes below.
- Reviewed affected code and integration against the previously verified111-commit history; current upstream head unchanged. Focused modified-behavior/syntax/native-canvas checks passed. Browser appearance, full gameplay and GPU performance remain unverified. No claim of medical validation or an exhaustive certification of unrelated game systems.

## 1.7.141 verification
- Play-test: no decorative flora, preserved old trees/rocks across expansions, current-end guard changes and route conversion only where needed, room for new builds without randomly deleting old scenery.
- Seeded road choices are planned by run seed/road length; a whole-map immutable layout is not precomputed, because player placement and route safety remain adaptive. Verify save/load keeps the existing map and future choices stable.
- Food heals the receiving stickman and shows no numeric healing/player-life text. Meat directly increases the existing heart/Constitution value and max health; save/load preserves foodConstitution. Check wounded/full-health units and edible treats; legacy saved player-life bonuses remain for compatibility.
- Enemy visual size rolls have more small/large extremes but stay in the existing tiers; HP rolls, wave phase order and rewards remain. Browser visuals/performance remain pending.

## 1.7.140 verification and chat request coverage
- Implemented in this draft: randomized start axis and winding preference; clean-wave-only free expansion; weight-based blood/voids/surface stains; pinned enemy card and responsive targeting with LAST; Tiny Grunt 1 HP/+15 evasion; natural queues; beating HUD/flying hearts; shared class miss/evasion paths; overlay scrolls; clearing hourglasses/dimming; droplet option; smaller rarer tree-side nests/baskets; staged animal growth; footprints; stronger equipment; red expansion cost; reusable shovel; emoji headbutts without red damage discs; sword proportions.
- Verified with focused function/geometry/native-canvas checks, not a full browser playthrough. Check queue corners/mixed sizes and headbutt motion together in gameplay; source fixes cannot guarantee every crowded scene is glitch-free.
- Play-test: compare Tiny Grunt/Grunt/boss contact drops and death sprays; scenery stain placement and color on trees/rocks; six-minute surface persistence; fresh detail before baking. Ground blood already lasts minutes but fixed pool caps can replace older marks. Zoomed baked-cache blur and full browser drawing cost remain unresolved until measured.
- Audio/music were preserved in this draft. Mage cooldown remains unchanged by the owner's clarification. Event history was scanned across 112 available commits with relevant event hunks reviewed; this was not a manual audit of every line or a verified live frequency test.
- Missing evidence: supplied screenshot/video scratch paths were unavailable. Mobile cards, actual game boot/design contract, visual balance, audio listening and high-graphics performance still need verification. No claim that every historical regression has been eliminated.

## 1.7.139 verification
- Play-test: emoji headbutts against barricades/stickmen with no red damage discs; reusable shovel clicks/hotkeys and transfer; compact nests/baskets in new and loaded saves; clearing hourglasses visible amid overlapping scenery. Check mobile zoom and high-graphics performance. Browser checks remain pending.

## 1.7.138 verification
- Play-test: expansion cost turns red when unaffordable and returns to gold when affordable; full-size/per-wave limits still explain the lock. Compare tiny/normal/large slash arcs, and confirm eggs mature on bonus grass after three completed rounds. Browser boot, visual review and performance remain pending.

## 1.7.137 verification
- Play-test: the complete browser boot/design contract, mobile/desktop targeting cards and LAST selection, clearing hourglass visibility, promotion scroll visibility, small-versus-large Mage blood, moving limb/emoji surface stains, footprint spacing and the droplet toggle. Native-canvas/mocked-DOM checks do not replace browser review; Chromium download failed.
- Play-test: equipment's requested 10–100 per-stat bonuses affect attack cadence, accuracy and armor strongly; compare the existing armor cap and high-stat behavior in actual play. Mage base attack interval is unchanged by owner decision.
- Play-test: three-round grass eggs, three-round chicks, seven-round animal babies, new-save growth stages and old-save adult migration; egg progress pauses off grass.
- Evidence first: compare high-graphics drawing/performance with 1.7.136 and 1.6.159. Surface masks refresh at most every 500 ms or when stains/size change, and body stains retain existing caps; browser cost has not been measured.
- Event audit: all 112 available commits were scanned for event changes in index/changelog; nine endpoint event categories remain, plus circus, troll, hut/castle/grave and caravan paths. The 1.7.36 consolidation, 1.7.40 prop cap and intentional 1.7.60 cairn removal explain reduced visibility; exact live event frequency still needs a playthrough/debug log. Do not restore retired rolls to increase variety without a specific owner decision.

## 1.7.133 audit
- Play-test: auto-pan stutter after 1.7.125. If the overlay's pan gap still shows 60 to 100 ms, find what stalls the browser (screen recording is one candidate).
- Play-test: blood load in a long fight (droplet pool 700, trail spacing 20 to 45 px, 14 stains a body); lower the counts in `forensicSpatterProfile` or `BLOOD_TRAIL_BASE_SPACING_PX` if frames slip.
- Open idea: a drying rim on pools and blood smears dragged by dying enemies.
- Tuning: starting moves (1) and the cap (3) per stickman.

## 1.7.117 audit
- Listen on desktop and phone for reverb depth (send 0.2), pan width (max 0.6) and brightness (air +2.5 dB at 3.5 kHz); every value is a named MUSIC_* constant.
- Check CPU on a low-end phone with the stereo convolver; if frames slip, set MUSIC_REVERB_SEND to 0 first.

## 1.7.116 audit
- Listen to wave and boss themes: gallop bass 0.045, pedal 0.016, stabs 0.05/0.042, snare roll 0.3-0.7; lower if busy or if the voice budget drops notes on phones.
- Idle walking bass is 0.038 from section 1.

## 1.7.115 audit
- Listen on desktop and phone: idle layer balance (arpeggio 0.019 to 0.026, stabs 0.032, bell 0.034) and start-screen stab level; lower if busy.
- Combat and boss themes were not changed this round; the chromatic ostinato idea (FF7) is the next candidate.

## 1.7.114 audit
- Check by eye on a phone: archer re-nock timing, the circus building and animals, troll sound level.
- Tuning: circus chance (14%), performer weights, baby size and growth, clown damage.
- Circus buildings are not saved (same as huts); a loaded save keeps the animals only.
- Round-end breeding applies to monkeys and elephants only; chickens, pigs and cows still breed on map expansion.

# Backlog — master list of open work

This is the single list of everything still open. Shipped work is removed and lives in `CHANGELOG.md`; the previous long version of this file (1,251 lines of round-by-round history, closed reviews and struck-through items) remains in the repository's git history. Keep it this way: add an item to the right section, and when it ships, move it to the changelog and delete it here.

**Status tags.** *Owner decision* = waiting on an answer from the owner. *Play-test* = built, needs a real playthrough to confirm. *Evidence first* = do not build until a debug log, trace or repro shows it matters. *Ready* = scoped well enough to build. *Design pass* = needs a written design before any code.

**Standing rules for this list:** the owner supplies evidence (debug log, save, screenshots, clips, opinion) and agents do not run long simulations to settle balance or lag; nothing is deleted from this list unless it shipped, was decided against by the owner, or was proven not to exist.

---

## 1.7.104 open items
- Decide whether the wave and boss themes should get a larger voice budget (they lose about 170 optional notes per cycle and the opening sting is partly dropped); check the cost on the phone first.
- Listen to the start-screen music (and `attract-music-preview.wav`) and say what to change: more drive, a bigger chorus, a different hook or more variety.

## 1.7.113 audit — what is left, in order of value
- Phone checks (nothing below is confirmed on a real device): steady 30 FPS while panning, no black flashes after a resize or an app switch, the start-screen music beginning on the first tap, the card-suit range ring and fog, the hat and shoes on a stickman, and the caravan crossing a map expansion.
- Tune from play: Legendary drop rate (0.25 of gear weight, 2 on a boss roll), Legendary sell value (1500), mill and quarry output and prices, caravan chance and spacing, gore explosion chance, potion and Revive prices.
- Emoji repeats between a class and an item or consumable (a class can still be told apart by context): Mage and Glass Marble 🔮, Snap Caster, Lightning Bolt and Defibrillator ⚡, Blow Gunner and Phoenix Ember ♨️, Spore Flask, Hyper-Serum and Nano-Tonic 🧪, Field Medkit and Bandage 🩹. A contract check could extend the unique-emoji rule to items.
- Text in the new tone: the strategy tips shown in the inspector are practical but not yet rewritten in the help-text voice.
- Zoom sharpness above about 1.5 times zoom needs tiled caches; measure first (see the entry below).
- Music: the first scheduler step creates its audio nodes on first play and is not pre-run during loading; the attract and wave themes can be re-tuned after listening to the preview renders.
- Caravan Rare Shop: further stock is to be specified; add it as sections in `buildShopGrid()`.

## 1.7.101 open items
- Tune from play: potion prices (80 to 300), Revive price (350) and its half-health return, and the 50% sell rate.

## 1.7.100 open items
- Tune from play: mill and quarry prices, yields (12/24/45 wood, 10/20/38 stone per minute) and hit points; caravan chance (40%), spacing (2 rounds), speed (46 px/s); gore explosion chance (6%) and sniper mist reach.
- Caravan Rare Shop: further stock is to be specified; add it as new sections in `buildShopGrid()`.
- Play-test: the caravan crossing a map expansion, the start-screen music by ear (and its loudness against the field theme), save and reload with a mill.
- Decision: first possible caravan round is after round 5 completes (round 6 end); say if round 5's own end should count.

## Lag candidates from the 1.7.93 profile (evidence first: confirm on a real device before building)
- Shipped 1.7.99 (TEXT-SPRITE-01, DECAL-BAKE-PRESSURE-01, SCENERY-SPRITE-01): text-sprite cache, earlier decal baking under load, scenery through the emoji sprite cache. Open: confirm the gain with the recipe below on a real device; baking scenery into the static layer was judged unsafe (depth sorting, hover, clearing).
- Stress scene of 120 bleeding enemies: unbaked blood decals cost about 450 path calls a frame (they bake after 4 s), particles are one path each with their own alpha, and about 100 floating texts are re-rastered every frame. A text-sprite cache and earlier decal baking under heavy load are the likely fixes.
- Recipe: Chrome profiler over 300 frames, plus a count of canvas calls by caller (patch `CanvasRenderingContext2D.prototype`).

## Stalls at 5x and 10x (evidence from the 1.7.90 log, 17 minutes)
- All ten worst stalls (350 to 884 ms between frames) happened at 5x or 10x, eight of them while a wave was spawning, with the game's own frame work under 3 ms and a heap of about 20 MB. 46 frames and 5.3 s of wall time were lost to the clamp. The log cannot say whether the page was blocked or the browser withheld the frame.
- Next step: play a few waves at 10x, download the debug log and read the new "Main-thread long tasks" section against the callback-gap snapshots. Tasks at the same moments point at the page (audio bursts, analytics, garbage collection); none point at the graphics card or the browser. Also try Low graphics at 10x once: the main canvas uses high-quality image smoothing on High.

## 1.7.92 play-test checks (built, need a real playthrough)
- Notched phone, portrait and landscape: the top bar, bell, tower panel and bottom buttons should clear the notch and home indicator (SAFE-AREA-01, checked only with an emulated inset).
- Weapon enchant: every class with a weapon has an exact weapon line except Hacker, Cat Snapper, Ninja and Archer's idle bow, which use a fallback or a short mark. Check those elemental classes in play and add `markWeapon` calls where the glow is off.
- Arrow slow and queues: an enemy with arrows should crawl; enemies behind a frozen, stunned or arrow-pinned one should wait or follow without overlapping; spawning pauses while a queue is backed up.
- Loading: read the debug log's `Boot warm-up` line on a real device; if work is far under 2 s the floor is what you see.
- Attract screen, in-game arrow look, pig hearts, rock sizes, once-a-second damage numbers, bell placement, ring dots.

## 1.7.75 open items
- Frame limit pacing (shipped 1.7.77, VSYNC-PACE-01): confirm in a debug log that 21 to 29 ms gaps no longer recur at a steady 60 FPS limit; if they do, the Chrome Performance trace below is still the next step.
- Real frame loss that the game cannot see (owner, 1.7.53 build): the overlay showed 37 to 41 FPS and gaps of 21 to 29 ms while update, render and HUD together took under 1 ms and the worst JavaScript frame in a minute was 6 ms. Time spent outside the page's JavaScript (the graphics process, compositing, a recorder or another tab) is the suspect, not the game code. Needs one Chrome Performance trace of a lagging attack (record 10 s, with the GPU lane visible), or the exported debug log from that moment, to say which.
- Candidates if the trace points at drawing: the image smoothing quality of the full-screen map and decal blits (`imageSmoothingQuality = 'high'`), per-frame emoji text at changing sizes (each new size costs a glyph raster), and the fixed 60 FPS limit on a display that is not 60 Hz.

## 1.7.70 open items
- Sharpness when zoomed in (owner, screenshot at 5.2 times zoom): ground tiles, blood and pebbles are baked at one pixel per world pixel, so they blur above about 1.5 times zoom while live-drawn emoji, stickmen, trees and rocks stay crisp. A zoom-aware cache would be about 10,000 by 6,600 pixels (about 280 MB) at 5 times, over the canvas limits, so it needs tiles: re-bake only the visible tiles at the current zoom, with a budget per frame, and fall back to the 1 times cache while a tile is pending. Measure the cost on the owner's machine before building.

## 1.7.51 open items
- Take on the owner's machine: panning against stationary frame cost (the camera bypasses the frame cap), and the transition cost of a render-scale change (it resizes and rebuilds both world caches); the new overlay figures and downing capture will show whether either matters.
- Candidate lag work, only if a real log points at it: bake scenery and its shadows into the static layer (about 2 ms each on a 37-item board in software drawing), and separate viewport render scale from world cache scale.
- Open decision: whether the 25% tighter batch gaps (TEMPO-01) should be relaxed.

## 1.7.49 open items
- Tune from play: ration, drill and merchant prices and growth (GOLD-SINKS-01); say if gold still piles up.
- Tune from play: food stat gains (1 to 3), and how often foods drop now that items are rarer.
- Tune from play: item drop odds (LOOT-RARER-01); say if items now feel too scarce or rare gear still too common.
- Tune from play: ten event kinds and their chances, chest loot odds (a bag from 30% of presents), walk speed (about 170 px per second, at most 2.4 seconds), item landing distance (30 to 76 px).
- Decided: not harder, more enemies; per-enemy bounty stays (owner, 1.7.49). Open: whether the 25% tighter batch gaps (TEMPO-01) should be relaxed.
- Decision needed: what counts as a scene for time of day on the playing field (skipped for now by the owner).
- Tune from play: the share of grass kept clear of trees and rocks (45%, ROOM-TO-BUILD-01); too little wood or stone early means lower it, too cramped means raise it.
- Possible: show the formation name on the wave label; tune the formation mix from play.

## Wave formations (shipped) and what is left
- Shipped: six formations per wave (see AGENTS). Open: show the formation name on the wave label if you want players to see it; tune the formation mix from play (for example more surges late).
- Open: panning cleanliness, in-game time of day, extra item sounds, wilder road shapes (needs approval).

## Performance investigation (from the owner's recorded run)

- *Evidence* — Browser reports software rendering (Basic Render Driver); confirm the owner's Chrome hardware acceleration setting, then compare frame cost at the same resolution with it on.
- *Play-test* — Split the broad drawing timer; test scenery and bone sprite caching, off-screen culling of a selected fighter, a real-time adaptive detail hold, and per-category decal counts. Measure before and after at the same board, zoom, speed and resolution.
- *Owner decision* — Stat balance ideas raised in outside reviews (accuracy curve, 15-point diminishing brackets, auto-spend marginal utility) are held until frame delivery is fixed; none is applied.

## Owner decisions

- *Play-test* — Gold bag payouts (1–100 direct, 3–9 coins worth 1–25 each) are about three times the previous total; confirm the economy still feels earned.
- *Play-test* — Music pass shipped (minor combat scale with leading tone, bass pedal, march taps, 3+3+2 accent, calm-to-wave lowpass sweep, flag-wind (the wind sound was removed by owner decision in 1.7.36) ambience). Listen and report mix balance. Boss arrangement, evolving keys, fills, counter-melody, intensity layer and the wave-clear fanfare shipped. Still open: listening feedback.
- *Owner decision* — Path generation: roads now prefer turning (85%), measured shorter straight runs. Wilder shapes (switchbacks, S-curves, loops) still need your approval and trapped-tower safety checks before any code.
- *Evidence* — Debug log from a real run on the device that lags (late waves, large map, high speed) to target the slow phase before any optimization.

## 1.7.35 notification acceptance

- *Play-test*: verify history and transient notification left edges align with the bell on narrow phones and embedded previews, including resize, reward button visibility and onboarding guidance. Keep all panels inside the viewport and preserve mutual exclusion with Build.

## 1.7.34 real-device acceptance

- *Play-test*: load the delivered index at high quality on desktop and low quality on mobile. Verify flags, every available fighter, companions and crate/scenery silhouettes. The prior emoji ReferenceError is repaired and the native canvas full-page fixture passes; real browser/device acceptance remains required.
- *Play-test*: finish a wave with Tennis Shoes while below the move-charge cap; verify the extra-move cue appears and no exception occurs.
- *Play-test*: listen to full planning/combat cycles with SFX active, on phone speakers and headphones. Assess the warmer keys and FM bass, melody memorability, fatigue, bass clarity and immediate wave-start fade. Offline finite-output/voice-cap checks pass; no subjective listening or whole-mix loudness claim.
- *Play-test*: retain first-five-minute FPS/frame pacing, mobile popup/options layout, two-ended grass-spaced expansion and all previous acceptance items. No fixture establishes lag-free behavior on every device.

## 1.7.33 shop acceptance

- **Play-test:** compare main Shop and empty-slot shortcut without/with a Merchant, including paused use. Down the Merchant with a shop open; old cards must deny without spending.
- **Play-test:** change selected unit or mutate inventory while a shop control is retained; stale equipment/Remove must refresh without affecting the wrong unit/item. Valid equipment, medical/passive and removal behavior should be unchanged.


## 1.7.32 input acceptance

- **Play-test:** interrupt ground/inventory drags and camera pinch/pan with tab switching, app switching or lost touch capture; verify no lingering item ghost, unintended tap or duplicate payment and that the next gesture works. Items already removed from inventory stay on the ground if interrupted.
- **Play-test:** confirm touch pickup target size after zoom, resize and rotation. Event-source fixtures passed; real browser interruptions and device frame pacing remain unmeasured.


## 1.7.31 follow-up acceptance

- **Play-test:** verify coin arrivals follow the HUD on resize/rotation and counted overflow remains readable; device frame-time improvement is not measured.
- **Play-test:** verify Settings release notes start at the uploaded version after refreshing both index and changelog. Help, stat tooltips and the downloaded in-game README now describe current rules; translations/localization are not implemented.
- **Owner decision:** current code has rapid killstreak milestones at 100–1,000. Older requested lifetime-kill milestones at 1,000–1,000,000 are a different progression design, not implemented by this documentation repair. Resolve design before changing combat/rewards.


## 1.7.30 play-test acceptance

- **Play-test:** verify notification details below the bell on portrait/landscape and desktop; confirm keyboard close and prior pause state restoration.
- **Play-test:** compare bone glyphs before/after nearby deaths; verify white light remains compact with a 20% core increase and subtle breathing halo.
- **Play-test:** check smooth enemy stride at 1x/2x, corners, breakaways and after pause; rendering interpolation cannot guarantee smoothness under actual frame stalls.
- **Play-test:** confirm enemy/bag pickup and expiry flights reach the gold HUD without duplicate income; crowded bursts coalesce within 32 visual slots. Paused collections retain flights until resume; reduced motion intentionally suppresses travel.
- **Play-test:** inspect compact crate/shadow and free item drops between adjacent fighters. Validate revised ordinary loose-coin/bag balance over real runs.


## 1.7.29 scenery acceptance

- **Play-test:** Check a fresh pre-wave expansion and an older empty expanded save: trees/rocks can now occupy reserved future exits, while towers cannot. Scenery on subsequently committed path tiles is removed through existing cleanup.
- **Play-test:** Confirm no scenery replacement on populated/harvested saves; preserve the clean unexpanded opening. Check endpoint visual density and remaining build space on small maps. Individual tree/rock counts remain randomized.

## 1.7.28 history audit and acceptance

- **Play-test:** Compact white Mage staff light at High/Low, close zoom and silhouette shadows; the rainbow pinwheel is intentionally removed by the latest owner decision.
- **Play-test:** Hut candidates on inward newly revealed land; retain tree/hut spacing, endpoint eligibility and finish-approach exclusion.
- **Ready / Design pass:** Exactly one successful event per endpoint remains a specification gap. A distinct persisted once-per-wave Lost Bag and proposed +2 Stick item remain unbuilt; existing bags, death loot, Lucky Branch, Cat Snapper, chain lightning and Lancer are implemented. Do not duplicate them based on old notes.
- **Evidence first:** Ground-item cap is soft when every item is protected from eviction. Design safe spawn failure/deferral across all callers before hard-capping; never destroy protected map pickups or return null to unchecked callers.
- **Review coverage:** All 98 checkout-ref commits were screened; 47 absent historical function names reconciled with current replacements/intended removals in CHANGELOG [1.7.28]. This is broader source review, not proof of zero semantic regressions or physical-device acceptance. Do not claim every patch line was manually proven correct.

## 1.7.27 acceptance checks

- **Play-test:** Expand before starting wave 1 and verify trees/rocks appear with their existing sizes/shadows; keep the initial two build spaces usable. Follow a turning route that opens grass inside its old bounding rectangle and confirm scenery/flora populate newly revealed land without covering towers or path.

## 1.7.26 acceptance checks

- **Play-test:** While paused, drag an inventory item onto the ground and another fighter, cancel a touch drag, and use a bag/healing item. Check item preview, completed drop and HUD update immediately while combat stays paused.

## 1.7.25 acceptance checks

- **Play-test:** Fast item release away from a fighter, canceled touch gestures, and slot changes/source death during a pending press. Verify inventory transfers and quick use still feel immediate.

## 1.7.24 acceptance checks

- **Play-test:** Drop an item in the gap between adjacent fighters, then directly onto each fighter, at desktop zoom and on phone. The shared 16-pixel capture radius should leave the gap free while retaining intentional equip and full-inventory rejection.

## 1.7.23 acceptance checks

- **Play-test:** Listen to the immediate idle-to-wave fade with wave-start/threat sounds, mute/pause and escaped enemies still fighting. Evaluate the retained original score and quiet brass planning answer against the owner's desired StickTD identity; complete reference audition before claiming it was done.
- **Play-test:** Confirm compact quick-item taps/drags on phone, with six items and expanded inventory. Verify zero-cost plant hover is silent and paid scenery retains its price.
- **Play-test:** Check landed barricade rubble during zoom/pan and late-life expiry; verify bones/skulls remain visible with gore enabled, without reintroducing expensive per-frame cache rebuilds.
- **Play-test:** Keep living animal farms through expand/save/reload; verify newborns do not cascade and eight-animal cap is suitable for play. Historical-save and overlapping restored livestock acceptance need real fixtures.
- **Evidence first:** Supply a saved layout if an endpoint is already sealed. New expansions are atomic and free on rejection, but legacy route/tower relocation and finite-world exhaustion are not solved by this change.

## Current chat reconciliation — 2026-10-04, upload candidate 1.7.30

1.7.20 added a compact rainbow Mage orb (superseded by the owner’s white-light correction in 1.7.28), glyph-descent shadow anchors, placement models/denial, rendered aim smoothing, bounded positioned-gold-to-HUD flights, quiet pointer-stage cues, one visible plant and varied endpoint growth. Test on desktop/mobile; old crowded saves are preserved. Flights credit immediately and are cosmetic; other gold sources keep prior feedback. Pointer/plant sentence was interpreted as accompanying audio plus fewer plants.

1.7.21 removes plant FREE labels and inspect horizontal scrolling, rejects full-inventory drops with buzzer/nearby hop, keeps settings tabs one row and moves debug/camera/tips to Game. High retains the compact Mage glow under load and continuous moving-unit coordinates. Full interpolation/frame pacing and narrow/long-value layout acceptance remain pending. Owner likes the DOS music direction; preserve it.

1.7.22 restores selected gold tactical reach/orange target splash and removes ranged minimum exclusions by owner decision. Pins clear on real death/pool reuse; resolved death guards and stale-target rejection preserve one killer/payment and fractional assists. Coin Pouch scenery uses 💰. Both scores get recurring original pitch motifs and distinct short menu pairs; blood retains species colour across live/baked rendering. Actual-source/native audio lifecycle, combat, cue/scope and historical performance fixture tests pass; physical browser/audio/FPS acceptance remains open. History/changelog were indexed and relevant subsystem deltas traced, not every historical line proven correct.

Code presence is not physical-browser acceptance. GitHub main remains 1.7.7 at the 2026-10-04 check; recent desktop preview screenshots show 1.7.19. Match each report to its own version.

Outstanding implementation/design:
- Endpoint events are partial: randomEventEndTileKeys uses alternating ends and route distance 3–5, with two event slots. Chance/placement failures can yield fewer events; exactly one successful event per end is not guaranteed. Previous review saying all endpoint placement was absent was too broad.
- New paths preserve spacing and reserve exits; sealed/crowded legacy paths are not repaired. Rejecting a cramped branch does not guarantee growth at both ends indefinitely. World bounds are finite. Do not delete/move existing towers or relax grass gaps to force a repair.
- Whole-game measured balance remains incomplete: class/enemy matchups, first-five-minute economy, present/gold flow, 1x engagement, boon progression and Stealth Santa/Ninja challenge difficulty require gameplay evidence.
- Audio proposals remain: adaptive boss/end scoring, material-specific impacts, additional Bomber/Sniper envelopes and named palettes. Voice stealing/worklets/persistent oscillators are optional evidence-led proposals, not automatically required omissions.

Implemented; acceptance still needed:
- First fighter → Next Wave pointer → first-wave speed pointer → saved dismissal; scope expiry/inventory guard; fixed Sell/Move/help row; attacker priority and breakaway explanation; title-only notifications/detail popups; removed category controls/welcome notice; bell left of Build and reciprocal closing.
- Pulsing loot gradients, expired coin credit, original synthesized bag/coin cues and bounded rewards; five-minute collectable logs; pickup/pan separation; render scale.
- Stealth choice, hidden wave-10 Santa using wave-100 strength, secretly beatable encounter, permanent fastest dual-hand Ninja and both-choice reset. Browser reload/consent behaviour and challenge balance need acceptance.
- High stickman/emoji silhouette shadows and drag shadows; enemy detail emoji/red border and stat/XP/weight labels; two-ended growth, finish-carpet cleanup, grass spacing, desktop inspect scaling and compact mobile debug. Old crowded route/scenery arrangements are not retroactively fixed.
- GPU-renderer-based default High, saved preference precedence and rich truthful diagnostics. True 1 GiB VRAM gating, exact CPU model and SSD/HDD identity are unavailable through standard browser APIs; do not invent them.
- Distinct planning/battle music, lower-register planning replies and phrase-dependent battle bass (1.7.17), reed sustain/filter articulation (1.7.18), recurring planning motif variations (1.7.19), default 100% with saved preferences, combat through escapees, original arrangement/expression passes, voice bounds, grouped effects, subtle miss cue and positional Y forwarding. Actual mix, mono/phone clarity and fatigue need listening.
- Attract-line fix repaints uncovered drift edges; the exact cyan phone line has not been reproduced/confirmed resolved. Responsive layout still needs Android orientation, zoom, long stat values and target-panel positioning checks.

1.7.16 skips unused desktop telemetry work on compact debug refreshes and fixes visible-row backdrop widths. Device performance remains unmeasured.

Primary unresolved quality goals:
- Phone rendering: supplied screenshots report about 23–30 FPS with render time dominating. Five-minute frame pacing, death spikes, long-session memory and High silhouette cost remain unmeasured on target devices. No zero-lag guarantee.
- MIDI structure was analysed; every supplied song was not auditioned. Text/reference reviews do not prove every newly supplied textbook was read cover to cover. Complete listening/full-source coverage remain unfinished.
- Top-100 quality, addictive first minute, zero regressions and mastered audio are goals, not test results. Do not substitute more speculative content for validating completed fixes.
- Keep the seven cumulative upload files, detailed UTC changelog, time-neutral README and untouched favicon/OG/references. No private tests/ZIPs in upload delivery. Owner uploads manually.

## 1. Owner setup — one-time clicks outside the game (Google Analytics, Search Console, GitHub)

None of this is done by the game or by an agent; tick items off as they are finished. Counts in Analytics include only visitors who accept analytics consent; visitors who decline or do not choose are not tracked, so totals are a floor.

- [ ] **Key events.** Analytics, Admin (gear, bottom left), Events, switch on "Mark as key event" for `game_started`, `engaged_player`, `save_downloaded`. `engaged_player` appears in the list only after it has been sent once. Do not mark `wave_milestone` (it repeats every fifth wave).
- [ ] **Custom dimensions** (Admin, Custom definitions, Create custom dimension, scope Event, parameter name exactly as written; without these a report cannot show which tower or item): `game_version`, `quality`, `platform` (values include `github-pages`, `itch.io`, `gamejolt`, `local-file`, `embedded`, `other`), `device`, `first_visit`, `tower_type`, `enemy_type`, `item`, `rarity`, `payment_type`, `structure`, `scenery_type`, `livestock`, `cause`, `setting`, `setting_value`.
- [ ] **Custom metrics** (same place, scope Event): `wave`, `waves_completed`, `wave_reached`, `duration_s` (unit Seconds), `lives_lost`, `cost`, `level`, `refund`, `fps_median`.
- [ ] **Data retention** to 14 months (Admin, Data settings, Data retention), and an internal-traffic filter so your own plays are excluded.
- [ ] **Search Console.** Add a URL-prefix property for the game address and use the HTML-tag verification method. Google Analytics loads only after player consent, so the crawler may not see that tag for verification. Add Search Console’s `google-site-verification` meta line to `<head>`, upload the updated file, then click Verify. Submit `sitemap.xml`, then use URL Inspection and Request indexing.
- [ ] **GitHub.** Add repository topics such as `tower-defense`, `html5-game`, `canvas`, `javascript`, `browser-game`, and confirm the website field points to the game.
- Optional follow-ups once data exists: a Looker Studio funnel of `wave_started` to `wave_completed` per wave, an alert on `lag_detected`, and per-tower-type survival from `tower_downed`.
- To report where the game was played, register `platform` as an event-scoped custom dimension, then use an Exploration with `game_started` (or `wave_started`) as the event and `platform` as the breakdown. This is runtime analytics attribution; the page’s SEO metadata remains the same on every host. Useful reports once data arrives (Explore): a funnel `game_started` to wave 1 cleared to `engaged_player` to `wave_milestone`; `tower_built` by `tower_type` beside `tower_sold` and `tower_downed`; `game_over` by `cause`; `item_dropped` by `enemy_type` and `rarity`; `lag_detected` by `device` and `quality`.

## 2. Waiting on an owner decision

- **Camera auto-zoom (Owner decision).** The start view is medium, but the wave-start pan (at least 1.2x) and tower-follow (at least 1.3x) still zoom in by themselves. Should they also become optional or stop zooming?
- **Number-key hotkeys while the quick-use row is showing (Owner decision).** Kept working; say if they should be off while the row is visible.
- **Endgame shape around the Santa final boss (Owner decision, Design pass).** Santa is already a design pillar (highest HP, summons cookie enemies). Undecided: how the campaign ends around him and whether the game ends or continues endlessly.
- **Long-road vision (Design pass).** The intended long-term shape is a very long road where the player interacts with the environment (scenery, clearing, resources) more than the path. Decided: keep the steep expansion cost curve, no discounts for clearing scenery. Open: raise the fixed world bounds (needs a save-compatible pass with a fixed origin offset and a save-format version bump, and multiplies map and decal canvas memory, about 42 MiB per canvas at 2x today), weight scenery, wood/stone and structures toward the far end of the path, tune scenery density and type mix along the road, more map expansions per wave, and longer, more layered waves (needs a pacing design before any numbers change).
- **Stage 4 (1000 stats) (Owner decision, Design pass).** Stages at 100, 250 and 500 are real. Stage 4 means inventing an entirely new deepest tier per lineage beyond Pope, Sniper, Gunalinder, Berserker and Lancer; it needs real content specified, not a threshold number.
- **"250 INT on Archer unlock" (Owner decision).** Incomplete as given: 250 matches no current threshold (100 INT attunement, 500 INT hybrids). Is it a new tower at that threshold or a correction to an existing number?
- **"Dark Wizard" (Owner decision).** A crowd-control tower that lifts an enemy in place, dealing damage over time while suspended; the enemy cannot move but stays targetable by other towers; lower per-hit damage, faster ticks. The description trailed off mid-thought (2026-09-15) and nothing was built. Is it still wanted?
- **Tower level cap 3 to 10 (Design pass).** `canUpgrade()` is bounded by the three tiers per tower; ten needs seven more tiers per tower and a rebalance of gold costs and wave scaling.
- **Design note:** the shipped tree has no Fire path for Mage, an intentional gap (see `AGENTS.md`), not an oversight.
- **Item and food ideas (Owner decision).** Resource drops that need a hand-in target (stone bundle from the Tank, wood from tree enemies); set bonuses; enemy-specific item effects (Frost Shard slows, Ember Core burns); item swap (three Common for one Uncommon) and salvage for gold; Bandage and First Aid Kit shop items (the Defibrillator exists); area-effect treats (frozen enemies, a syrup slow zone on the road) each needing a performance check on busy waves; the literal orbiting-donuts visual for the Donut shield; whether the fountain should also heal towers, not only lives; chance structures beyond the fountain (a shrine, a well, a supply cache are one table row plus a case in `useChanceStructure()`).
- **Build-menu nudge toward building (Owner decision).** Requested; the wording the owner wants is unclear.

## 2b. Owner-specified, not yet built (2026-09-30 batch)

- **Random events at the ends, per expand (Ready, needs a design pass on placement).** Per expand: exactly one random event within 3 to 5 squares of the spawn flags and exactly one within 3 to 5 squares of the finish line. Until wave 5 only positive, easy, non-aggressive events (no troll); never tell the player about the restriction. Replaces the current one-event-per-expand slot (`RANDOM-EVENT-SLOT-01`), which would become one slot per end.
- **Two-ended expansion acceptance (Play-test).** Implemented in 1.6.205. Verify repeated purchases, live enemy continuity and blocked endpoints; do not treat this as an unbuilt redesign.
- **Scenery placement picture (needs a words description).** The owner marked, on a screenshot, where some rocks could have been moved to and where trees could have gone (rocks from the far top-left cluster toward the flag zone, trees toward empty middle tiles). The intent is "bigger pieces near the ends, small and tiny in the middle"; the arrows could not be read with certainty. Check after the next expansion whether pieces cluster too far from the ends; the end guard (`guardRoadEnd()`) sets how many medium pieces sit near each end.
- **"No one is attacking that unit" (explained).** In the 1.6.154 screenshot the Archer was knocked out for three rounds, the Swordsman was out of reach and the Mage was between casts (7 s cooldown), so nothing was shooting the enemy at the barricade. The Mage balance change in 1.6.157 shortens neither the cooldown nor that gap; watch whether a slow, hard-hitting Mage leaves too many idle seconds.

## 3. Waiting on a real playthrough (built, needs confirming live)

- **1.6.178 release acceptance.** Verify the first-minute Build → Start Wave flow, Next Wave → Fast Forward cue sequence, saved cue dismissal, scope expiry, inventory taps, coin/bag glow, notifications, consent decline and saved ambient logs. Listen to the adaptive score and effects on desktop and phone speakers. Capture a frame-time trace around a defender being overrun; the existing performance fixes and new scheduler safeguards do not establish that all device lag is eliminated.

Checked in headless tests only. Send a screenshot, clip or debug log for any that feel off; the debug log carries the item log, game event log and frame-cap line.

- **Camera and frame rate:** the game opens at a medium view on a new game, a loaded save and the reset-view button. Settings frame-rate limit (30 Low / 60 High, slider to 250, off = uncapped): on the desktop stuck near 30 FPS, do the "Frame rate cap" log line and the frame-pacing verdict show whether the game's own cap or the browser is the ceiling.
- **Items and feedback:** quick-use row above a collapsed panel (position, box size on a phone); item-use sound motifs by ear, readout size on a phone, nameplate pip on a narrow panel; dropping a potion on a stickman stores it with no stat change until used; Items tab in Settings.
- **Promotions:** about 20 automatic plus 20 spendable points; watch how fast stat caps and diminishing returns bite.
- **Bags, coins and clicks:** bags stay closed until clicked and coins pop out; every clickable emoji is hit on its own border. The 1.6.179 minimum 44 CSS-pixel touch target is implemented; verify its feel on a phone.
- **Combat rules:** only Archer hits cause bleeding and it lasts while arrows are stuck (tune `BLEED_PER_ARROW_MAX_HP_SHARE`); new ammo shapes at real size; the troll arrives between waves, is fought and dies (is 160 health, armor 2, 10 damage per 1.6 s too tough or too weak).
- **World:** wanderers glide and pass through the lane and barricade queues; at most two random events per expansion, targeted near the route ends, with hostile events withheld before wave 5; ring tiles at the flag and exit hold only big trees and rocks, medium around them, small and tiny toward the middle, cleared tiles mostly staying open; the next map expansion is the place to check new trees stay inside the green area.
- **Older confirmations:** inspect-panel button row wraps at narrow widths; melee range hierarchy (Cleric and Pope longest, Spearman beyond Axeman) in real fights; Blowdart fires at the target's body at close range; debug overlay shrinks to fit on a narrow canvas; flag shape and direction (changed twice after placement was confirmed); displayed accuracy stays sane with damage-over-time and splash or minion towers; kill and Cleric telemetry counters rise (damage with kills and shots); the collision-cost cap shows no visible stacking or popping at a jammed barricade (funnel a big wave into one barricade); the fast-forward catch-up ceiling (45 ticks at 5x, 90 at 10x) on a real dense wave 9; pin position at several zooms, the barricade panel, and whether the Expand row ever stays greyed between waves with enough gold.
- **Armor floor 50%:** judging it needs a many-seed wave test (15 or more seeds, guaranteed armored enemies, run to wave clear); four seeds could not (spread larger than any difference).

## 4. Performance and lag — evidence first

Earlier captures showed short measured JavaScript phases alongside long frame gaps. Those timings do not identify the cause: deferred GPU/canvas work, audio, browser scheduling and unmeasured game work remain candidates. Use matched live traces and logs to justify larger performance changes.

- **Frame rate falling as waves progress (Evidence first).** Captures showed 25 FPS at wave 1 to 12-21 FPS at waves 8-10 with 1-9 ms of game JavaScript. Needs one Chrome Performance trace recorded at wave 8 or later, or the debug log from that moment (read its Graphics processor, Power, Frame pacing and Frame rate cap lines: software rendering, a 30 FPS power-saving mode, or game time). Callback rate was about 7 per second in one v1.6.54 capture with fast synchronous phases, which requires a trace to distinguish deferred rendering, browser scheduling and other costs.
- **Memory growth (Evidence first).** No leak established (heap about 12.6-12.9 MB, small rise over two minutes; GPU and canvas backing stores are not counted). Recheck over a longer session against post-GC baselines before adding pooling.
- **Incremental spatial-hash maintenance.** Currently rebuilt from scratch per call; the packed-density problem fixed in 1.6.44 was query cost, not rebuild cost. Only if a profile shows the rebuild itself is expensive.
- **Static scenery and decal caching.** Bake unchanging scenery and fully dried blood into chunked (256-512 px) offscreen layers, with careful invalidation (clearing, spawning, expansion, tall-stretch variation, aging blood) and the memory cost of `width x height x 4 bytes` weighed against `WORLD_MAX_W`/`WORLD_MAX_H`. Culling already removed the loudest symptom; revisit only if the debug log shows it is not enough. Related: chunked (dirty-region) settled-decal rebuild instead of a full-world repaint on expiry.
- **Emoji sprite caching (shipped 1.7.76 for transformed glyphs only).** Enemy, death-animation and High-graphics flora emoji use cached sprites (EMOJI-SPRITE-01) because they are drawn under a changing rotation or scale. Upright, unscaled emoji stay as text; the old software-raster microbenchmark still holds for those. Confirm with the overlay on a busy wave; if FPS is unchanged, a Chrome Performance trace is still the next step.
- **First-hit hitch.** Collision masks are already prewarmed for every configured enemy type at boot. Profile any remaining first-hit hitch before changing this system; do not add duplicate prewarming.
- **Web Workers (optional lever).** Could offload decal saturation scanning or collision-hash rebuilding at 5x/10x; feasible from a Blob URL inside the single file, but adds messaging complexity. Not a first move.
- **Android Chrome benchmarks.** Main canvas `alpha:false` and pointer-driven camera coalescing: measure raw rAF gaps before and after; keep only if measurably better.
- **Explicit entity states.** Replace the growing set of boolean flags on enemies (breakaway, queued, escaped, guardian and more) with a small state machine so systems cannot disagree about one enemy. Verify the claim against the current file first.
- **Presentation queue.** Record combat events (hit, kill) in a fixed ring buffer and let the renderer play sounds, particles and text from it, keeping the simulation free of presentation work.
- **Sound engine lookup tables.** Replace the large branching `SoundEngine.play` with a table of sound recipes (see section 7).
- **Wave and map editor.** A local tool that exports wave plans and route settings as data so tuning does not require editing the game file.
- **Headless balance simulator.** Weak, typical, farm and late-carry profiles; only if the owner wants simulation, since the standing rule is evidence from the owner.
- **Input-action abstraction.** Map physical input to semantic actions (`BUILD_OPEN`, `PAUSE_TOGGLE`, `NEXT_WAVE`) before adding any second input scheme; not urgent.
- **Offline play.** Not the removed `applicationCache` API; if wanted, a service worker plus the existing manifest.
- **Legacy kept on purpose (1.7.95).** The run-reward system (`restoreRunRewards`, `claimRunReward`, the 🎁 button, `runBoonCounts`) stays so saves made while rewards existed still load their blessings; remove it only with a save migration.
- **Cryptic names.** More renames like the 1.6.152 ones (`origQX` and `lowerP` are done) when their code is next touched.

## 5. Gameplay and content — scoped, not started

- **Lost Bag item system (Ready, well specified).** One bag per wave spawned idempotently with a persistent "already granted" marker separate from the bag object; viewport-culled ground-item rendering; a spatial-bucket index for pointer and drag selection instead of a full `groundItems` scan; save and load of loose ground items with stable IDs; isolation from the seeded wave RNG; a Stick item at +2/+2/+2. Build as its own focused version after confirming the loot table (Stick only for now).
- **End-of-round item drops and random events.** Only Lucky Branch exists in the universal items. Ask: a random chance per wave clear to drop a new item, more item types, and random events at round end, round start and map expansion (events now share at most two slots per expansion). Needs a first pass on what the item pool contains before drop-chance code.
- **Siege/catapult tower (Design pass).** Super slow reload, long range, AoE, 5x damage against buildings (huts and future buildings), a stick-figure trebuchet with a physically plausible arc. Needs a new projectile, a general "versus buildings" multiplier, and a decision on where it sits in the unlock tree.
- **Druid class.** A DEX-Mage with three switchable forms: Wolf Paws (default, rapid double-swing melee, short range), Bear Paws (single huge alternating-claw swing, short-range AoE, massive per-target damage, very slow) and Squid Tentacles (largest AoE, hits up to four random targets, lowest per-target damage). Full spec in the git history of this file.
- **STR-Mage chain (original idea, unbuilt).** What shipped is different: Necromancer is a single-tier INT-scaled Mage specialization with a skeleton-raising mechanic, not the original three-tier chain. The unbuilt original was Mage grown STR-heavy to Rogue Sorcerer, Crazy Wizard, then Necromancer with an AoE finisher dealing 1-10% of the caster's own max HP per cast, a 120 s cooldown shared by every class with the ability, locked out below 10% HP. It would be the first deliberate exception to archetype-exclusive damage (only STR drives Warrior damage, only INT drives Mage damage), so it needs an explicit design decision.
- **Warrior tree restructure (narrowed).** The additive half shipped: Axeman to Berserker and Spearman to Lancer, so every Swordsman branch has a second tier (Axeman was never renamed "Knight Errant"). Still unbuilt: a Hammerman that invests DEX, instead of continuing toward Paladin's INT path, branches into a distinct dual-wield class. That restructures an already-shipped part of the tree, with save-compatibility and balance risk. Overlaps the unlock-tree decision in section 2.
- **Spearman rework.** Longer spear and a 360-degree spin attack hitting everything in its AoE, with a longer cooldown. Spearman already has the Lancer second tier; do not treat that branch as unbuilt. The proposed spin attack is separate from that existing evolution.
- **Dual-wield attack timing (Design pass).** Main hand connects, then the off hand a beat later, then a recharge about 2.5x the time both hits took. Affects Axeman, dual-wield Swordsman and Squirt Gun; needs each class's swing-timing state machine traced first.
- **Boss signature move.** The boss is a stat-scaled Grunt-alike with periodic minions; a unique attack pattern was never built.
- **Dota-style item economy (Owner decision / Design pass).** On-death item drops and Merchant are implemented. Current Merchant unlock is after wave 15; the older wave-5 idea differs. Decide that gate and any further economy scope before changing it.
- **Dwarf Builder NPC.** Hammerman-proportioned, bright orange, wobble-walk animation, plus much stronger scenery scale variance after wave 3 with isometric depth-sorted overlap for oversized trees and boulders (scenery size gradient exists; check what remains).
- **Floating nametags and a minimap.** A WC3/WoW-style nametag above every tower (name, level, HP bar) and a radar-style overview of the whole map; the bottom panel covers the nametag's function today.
- **Progression ideas from the wave-architecture handoff.** Apprentice catch-up (+50% assist XP below 25% of the leader); milestone reward choices (REJECTED by the owner in 1.7.36: never wanted, do not build) every 10 waves; "Danger Contract" opt-in difficulty; melee and beam committed-damage tracking (projectiles only today); an explicit overkill column in the post-wave report; mid-wave save of the wave plan and dispatch cursor (saves between waves only today); watch the two-rolls-per-bar training in real play and add a diminishing effective-investment formula if late combat balloons.
- **Seeded combat randomness and coordinate-hashed scenery.** Replayable bug reports, and save files that stay small on very long roads.
- **Forensic visual review (Evidence first).** Needs a run zoomed into a recent fight with gore enabled plus its debug log and save, to judge stain shape, transfer and weapon-specific patterns; keep evidence-led effects and do not claim validated forensic reconstruction. Substrate-dependent rupture on rough terrain needs tile-type lookup plumbing that does not exist (no `getTileAt` or tile-type grid).

## 6. Balance — needs play data

- **Complete measured balance audit** of every tower class against enemy families and waves, with before and after results (requested; uses owner-supplied logs).
- **Swordsman "always wins" solo (Play-test).** The miss-chance change may not have fully resolved it; needs a real comparison, Swordsman alone against Archer plus Mage alone.
- **Undead armor values.** Zombie 9, Wraith 4, Skeleton 6, Reaper 10 were a first pass; revisit after testing the armor-ignoring Cleric smite to see whether small undead counters feel decisive without flattening larger undead encounters.
- **Enemy pace.** `ENEMY_WALK_SPEED_SCALE` and `ENEMY_SPAWN_GAP_MS` set the pace of every wave; the wave-completion events (`duration_s`, `lives_lost`) show how a change plays out.
- **Attack speed on level-up (probably explained, Evidence first).** Reported that towers gain attack speed just from EXP levels. Cooldown is driven by invested DEX, not level, but a level-up grants stat points and the panel's Auto spend option puts them into the class's preferred stat (DEX for Archers), which does raise attack speed. If it still looks wrong with Auto spend off, send the tower, its levels and the cooldown before and after.

## 7. Audio — follow-up passes

Reference: the uploaded game-audio books as first-tier principles, `index.html` as the implementation authority. The initial score and independent music/effects controls shipped in 1.6.163; the remaining items need listening evidence or a measured use case.

- **World-Y attenuation acceptance (Play-test).** Missing positional callers forwarded in 1.7.15; confirm vertical camera attenuation on real speakers. Keep UI feedback nonpositional.
- **Voice intelligence (Evidence first).** Important-event classification and four reserved slots shipped in 1.6.206. Voice stealing and richer per-family tiers remain optional follow-ups if essential cues are audibly lost.
- **Audio subgroup acceptance (Play-test).** Combat and feedback buses shipped in 1.6.206. Verify cue clarity and ducking by listening; add no additional buses without a demonstrated mix need.
- **Procedural impact model prototype.** Impulse plus resonant response for two cases only (blade on hard target, hammer on heavy target), compared against the current sound in real combat and dropped if worse.
- **Material response and forensic gore audio.** Reuse the gore system's material and biology classes; make the wet layer agree with the visual mechanism (impact spatter, cast-off, passive pooling) and stay silent for non-biological or shielded hits.
- **Three-stage envelopes beyond Mage and Hammerman/Paladin.** Extend to the Bomber lob and Sniper shot if it reads well; not to light, fast attacks.
- **Tower sonic identity.** Extract the ad hoc per-class parameters in `SoundEngine.play()` into named palettes (`AUDIO_PALETTES.METAL_BLADE`, `.BLUNT`, `.MAGIC`) plus class modifiers.
- **Adaptive score listening and composition pass.** The first version has a 24-bar field/wave theme and fades out on game over. Listen on desktop speakers, phone speakers and mono; tune levels, phrase contour and transitions from real play. Boss intensity and a distinct ending cue remain design choices, not implemented claims.
- **Full-palette mastering and added creature/ambience layers.** Needs real listening across phone speakers, desktop speakers and mono after the score and combat effects are balanced. Avoid adding layers until a playthrough shows a specific gap.

## 8. UI and visual polish

- **Inspect-panel responsiveness.** Prefer CSS grid or flex sizing over `fitStatRowToOneLine()`'s whole-row `transform:scale()` for the button row: no clipping or wrapping, less legibility loss at extreme late-game values.
- **Visual balance.** Never evaluated whether the screen (top bar centred, inspect panel bottom-left only, no persistent right-side element) reads left-heavy once a tower is selected.
- **Repeated motif.** An optional small corner flourish on every modal panel so the screens read as one designed system.
- **Blend modes for magic and glow.** `ctx.globalCompositeOperation` (`screen` or `lighter`) is unused anywhere; glows use plain alpha, so colours do not brighten where layers overlap. A visual style choice for the Warrior blunt shock ring, the Cleric's holy beam and similar effects; try it on a couple of existing glows and measure cost before rolling it out.
- **Reported visual items still open.** Spearman's spear tip "does not line up with the visual point": the code uses identical tip coordinates, so it needs a real screenshot to diagnose. Dual Squirt Gun hand "sits on the muzzle instead of the grip": depends on how the platform renders the glyph; a one-line `textAlign` flip is possible but blind changes can make it worse.
- **Flora growth.** Done for high graphics; Low stays static by design.

## 9. Reports needing a repro

- **Swordsman not attacking past a barricade.** Reported several times; every screenshot showed no enemies in range or none confirmably blocked. The full targeting path (`findTarget()`, `checkConeHits()`, `queryNearby()`) has no code that excludes barricade-blocked enemies. Needs a screenshot with an enemy clearly in range, plus the debug log.
- **Enemy jumping ahead on the path.** Reported once. Needs the enemy type and what else was happening (pack speed bonus, swept collision push, barricade queue snap, a slow or freeze wearing off could all look like a jump).
- **Enemies "sticking" at a congested chokepoint.** Enemies already follow one precomputed path by a single `traveled` value; the sticking is the local separation in `resolveEnemyCollisions()`. Reworked many times (single attacker per barricade, atomic queue slots, swept collisions, follow-speed cap, tight packing at barricades, collision cost cap); reopen only with a clip.
- **Finish-line escape recurrence.** If an enemy still slips past the finish line on a current build, send the debug overlay's `enemies X path / Y escaped` numbers at that moment so the corner and code path can be traced.

## 10. Notes for agents about external suggestions

Checked and closed, do not re-chase: the Mage-kill occlusion loop is not a lag contributor (even a worst-case 15-enemy Mage kill is about 3,000 trivial iterations, skipped entirely on Low graphics or under heavy visual load). The in-game debug overlay's per-phase timings (`phaseTime.*`) and exportable log are the right tool for finding the next bottleneck.

External AI reviews (ChatGPT, Gemini, an "External review proposal" of 2026-09-15) and book-derived ideas are leads, not facts: verify each against the current file before acting (roughly a third of past suggestions were wrong, outdated or unverifiable). Those already evaluated and set aside with reasons: a unified `activeAuras` array, decoupling `applyDamage()` into a combat-log dispatcher, a pure "STR only helps warriors" gate, separate class files, localStorage for settings (already used). `spawnQueue.shift()` being O(n) was verified and fixed earlier.

### Verified early-session work — 1.6.194

Gold coin rendering reuses one glow canvas instead of constructing gradients per coin per frame. The lives meter includes earned capacity and skips unchanged numeric writes. Instrumented source tests pass; first-five-minute mobile/desktop frame pacing and visual inspection remain open verification tasks. Do not describe the gradient construction reduction as measured FPS improvement.

### Final verification — 1.6.196

Complete-script emulated DOM/native Canvas2D startup contracts and self-tests pass, with all tower types, Build refresh, save/restore, scope expiry, staged fingers and a 400-enemy-death cleanup/render exercise. Real browser/device first-five-minute frame pacing, audio/visual review and complete campaign balance remain open. These checks do not reproduce the precise user wave-nine save or prove zero regressions.

### Audio/reward/control follow-up — 1.6.199

Implemented distinct combat phrasing, loose-enemy music continuation, original coin/bag cues, subtle throttled ranged misses, gold expiry payout, smaller conserved chest bursts, lower bag bonuses, legal-range defensive targeting, first-breakaway guidance and fixed Sell/Move/Help grid positions. Source and emulated whole-script tests pass. Listen on phone/desktop and visually check the inspector at narrow widths; subjective music quality and device frame pacing remain open.

### Notification/audio follow-up — 1.6.200

Implemented title-only notifications with full details in a modal, short breakaway/escape titles, retained wave/enemy results and pause ownership. Added original FM combat lead and quiet chord arpeggios using the supplied DOS guide as inspiration. Source voice/popup tests and syntax/data checks pass. Browser Escape/focus/pause interactions, narrow-screen layout, listening and device frame pacing remain open.

## Audio communication pass — 1.6.201
Implemented distinct weapon launch cues, world-position forwarding, short envelopes, bounded real-time repetition, softer default mix, narrower pitch variation, reward headroom, breakaway/escape warning and guarded wave-completion motif. Existing combat/standby music and cleanup contracts remain.
Open validation: listen to the first five minutes on phone speakers and headphones, including several simultaneous classes and speed 1/3/10; compare important warnings versus impacts, inspect mono clarity, and measure real-device audio/render frame time. Verify native notification-dialog focus/Escape and hidden-tab interactions. The last-escapee all-clear cue is implemented and tested in 1.6.221. Adaptive threat music and distance attenuation remain proposals, not delivered features.

## Music reference pass — 1.6.202
Implemented chord-relative phrases, pluck/reed planning contrast, FM/brass combat sections, sparse filtered-noise percussion, four-bar breathing space and an independent six-source music budget. Parsed all 19 supplied MIDI references for structure; did not copy or audition their tracks. Next validation: phone/headphone listening over five minutes and high-speed combat, percussion/lead balance, phase changes with escaped enemies, real-device frame time and long-session audio cleanup. Adaptive boss/threat scoring remains a proposal.

## Full inspiration-context pass — 1.6.203
Reviewed all 17 PDF sheets as extracted text and all 19 MIDI scores beyond metadata. Implemented original low martial brass, 140 BPM combat half-time cadence, kick/snare body, short automated bass sweeps, cached custom brass harmonics, prewarmed shared noise and separate 96 BPM standby. No reference track was auditioned: this environment lacks audio-listening capability. Listening to every supplied MIDI and the final game mix remains incomplete. Priorities for a listening pass: favorite Orc2gm versus human/menu contrast, Bigfoot low riff space, Tyrian syncopation, Escape Pod's later groove, Store/Ultima/Mainthe restraint; compare resulting StickTD clarity and fatigue over five minutes. Profile audio unlock/prewarming, music transitions and dense combat on real devices. Adaptive boss scoring and a persistent-voice/worklet redesign remain unimplemented proposals.

1.6.204: screenshot-reported generic gold enemy dialog replaced by red danger styling, actual enemy emoji and structured stat cards. Single/multiple enemies and generic reset pass full-script emulation. Verify browser layout/focus on narrow screens.

1.6.205: delivered two-ended irregular expansion, default 100% music, 24-bar developed combat theme and five-stat enemy details with tier-derived XP/weight ranges. Randomized path and native-canvas/full-script/audio checks pass. Remaining: listen to the arrangement in a real browser, check narrow-screen dialogs and measure first-five-minute device FPS. Physically boxed route ends remain protected and may not extend; do not cross existing towers to enforce symmetry. Earlier strict spiral preference is superseded by the latest owner request.

1.6.206: reconciled new Gemini PDF/DeepSeek reference against source; implemented persistent combat/feedback grouping, bounded focus duck, active priority classification, two-axis world attenuation, gentler onset/impact bodies and critical-burst gate. Expanded audio/full-script checks pass. Outstanding: real-browser listening/headphone audition, waveform/output peak measurement, narrow-screen layout and physical-device first-five-minute FPS. No claim of finished/mastered audio or guaranteed zero clipping. Wind ambience/element-specific impact layers/AudioWorklet/node pooling remain unimplemented proposals; preserve current owner wind removal and source bounds.

1.6.207: zero-time footstep gate and UI/spawn-chatter coalescing fixed/tested; browser listening/device FPS remain outstanding.

1.6.208: device rows/expanded local debug log delivered. Real-device overlay legibility remains to verify. Browser cannot provide CPU model, SSD/HDD type or system utilization.

1.6.212: loose coins/diamonds persist across saves and settled-decal rebuild timings are exported. Ordinary loose inventory persistence was implemented in 1.6.213 and its full save/load path checked in 1.6.221. Remaining: exact endpoint-event guarantees, real-device playtest and audio audition.

1.6.213: recognized ordinary loose equipment/consumables persist; unregistered special definitions need separate audit. Quiet GPU-informed initial quality shipped; verify High on target devices and retain manual/saved choices.

1.6.214: High always uses render step 0 (100%, DPR capped at 2), superseding lower saved High floors. Preserve Low scaling. Committed projectile bookkeeping resets only tracked targets; actual canvas reallocations require changed backing dimensions/DPR. Device performance and campaign balance still require play evidence.

1.6.215: consumed pickup pointers must not pan or start inertia. Item dragging stays separate from pinch zoom; stop camera follow on pickup/item presses. Manual render scale is in Video; High remains 100%, Low choices disable automatic scaling. Verify touch/mouse feel in browser.

### Stealth challenge acceptance — 1.6.220

Implemented owner-requested hidden wave-10 Santa with wave-100 scaling, permanent Ninja reward, dual-hand pooled stars and consent-choice reset. Integration tests cover both choices, Santa victory, permanent Build eligibility, pool retry and buffed cadence. Before release acceptance: playtest intended difficulty without god-mode; verify reloading retains Ninja, unfinished wave-10 saves retry wave 10, initial choice/run mode and Settings review work on real browsers. Profile sustained Ninja volleys at 1/3/10 speed and High silhouettes on desktop/mobile. No claim that ordinary first-run squads can beat wave-100 Santa or that the challenge is mathematically impossible. Escaped-enemy combat music was already implemented; the earlier review claim that it reverted immediately was incorrect.

1.6.221 acceptance evidence: full actual serialize/restore functions preserve Ninja Build unlock, tower DEX, loose ordinary loot, coin values and Stealth mode in mocked-DOM/native-Canvas testing. Expired coin credit is once-only; unfinished Stealth wave 10 retries from wave 9. Last-escapee music phase and once-only between-wave all-clear cue pass. Real-browser input/layout/audio, first-five-minute hardware frame pacing and challenge balance remain acceptance work. No new speculative roguelike reward-selection economy was added before balance playtest.

### 1.7.1 progression acceptance

Implemented wave-3/every-tenth-wave choice rewards, separate run stat blessings, supplies/recovery, bounded deferred claims and save continuity. Read both supplied roguelike references for build agency, understandable rewards and small reachable goals; no reference files are modified or shipped. Tested choices, pricing separation, notification-disabled access, manual pause ownership, duplicate clicks, malformed saves, full JSON save/load and prior gameplay fixtures. Playtest: first choice timing, which later choices players use, recovery versus offense value, stat/economy growth through waves 10/30/100, touch dialog comfort, dense High shadow/Ninja cost and sustained audio. Do not add more mechanics before observing these choices in play; actual device lag and MIDI/game audio listening remain open.

### Reference review and reward clarity — 1.7.3

Scanned the seven-page supplied video-review PDF as secondary design inspiration. Implemented native click/keyboard gift access, visible current Supply/Recovery benefit, shared capped standing-fighter healing eligibility and actual grant receipts. Existing particles/terrain caching/spatial queries/motion options/audio variation/pause/save systems already cover many suggestions. Deferred unapproved map/flow-field rewrites, exponential economy, meta-currency, forced draft states and broad relic chains; those require scoped design decisions and measured costs. Real-browser keyboard/touch focus, reward pacing, first-five-minute FPS and audio audition remain playtest tasks. Source video identities, timestamps and claims were not independently verified or watched.

1.7.4 follow-up: focused native/custom controls are excluded from global gameplay shortcuts; held stat allocation cancels on blur/hidden/modal transition and rejects hidden callbacks. Mocked keyboard checks establish that Space default activation is permitted, not actual browser activation. Playtest tab/OS focus loss during a stat hold and keyboard gift navigation on desktop.

1.7.6: corrected screenshot-reported notification bell/Build overlap using rendered-HUD/cue offsets and frame-bounded scrolling panels. Playtest embedded preview and standalone widths 320/375/768/1920, landscape short height, browser zoom and gift appearing/disappearing; confirm Build and hand cues stay clear and long notifications scroll within the frame.

1.7.7 owner revision supersedes the external bell row: bell sits directly left of Build inside the fitted HUD; Build and notification history mutually close. Verify 320/375/768 widths, gift visibility, long selected Build names and browser zoom; below-HUD scroll bounds/cue clearance remain. Extremely narrow views may fit but need legibility testing.

### 1.7.142 follow-up — 2026-10-08
Hut share increased slightly within existing eligible building-event rules. Default decal pools now high 900 / low 300, superseding earlier 750 / 250 defaults; custom overrides remain. Above 1.25× zoom draw retained settled shapes live instead of the raster cache. Ordinary scenery choices/end guards now use the saved run seed; events remain random and placement adapts to occupied tiles. Streams, arterial pulses and trails include victim weight/source. Focused checks pass; full browser visuals and zoom performance remain unverified.

### 1.7.143 follow-up — 2026-10-08
Picnic baskets cap at scale .30 including old saves. Emoji shadow contact uses painted glyph bounds and correct bottom-anchored stretch/mirroring. Existing sweets/desserts grant 1–4 capped spendable points plus existing XP/healing; chest loot adds an independent 25% dessert chance. Chest event frequency remains 6% with original limits. Fully expired emoji body stains clear before mask work. Full-history performance filter and targeted cache/blood hunk review find retained optimizations, with forensic interception and zoomed vector blood requiring browser measurement. No comprehensive lag-free claim: browser visuals, long-session FPS and actual device costs remain unverified.

### 1.7.144 follow-up — 2026-10-08
Owner sets tier decal defaults/presets High 2100 / Low 700, superseding earlier capacities; saved custom overrides remain. New runs include exactly two sparse seeded wasteland stumps, 40–60 wood each, free 12-second clearing with normal progress/save storage; older saves are not repopulated. Main blood pools now test each blob against nearest blockers using exact victim identity and victim-scaled origin height, leaving clean gaps and staining blockers. No artificial erasure of existing blood. Blob-level voids and increased-cap zoom cost require actual browser visual/performance verification.

### 1.7.145 follow-up — 2026-10-08
Containers (cardboard SUPPLY_CRATE, CHEST, PICNIC, legacy coin pouch/item) open free immediately via existing payout, including normalized old saves. Timed resources retain work: all fade to 32% and show turning/alternating hourglass on top, with progress behind. Mushrooms yield 3–5 at normal smaller sizes and up to ten at scale1.6 maximum; free20–50s harvest. Decorative flora has zero coverage plus spawn/live/baked draw guards; no wheat/sprout decoration. Browser visuals/save roundtrip remain unverified. Earlier crate10-gold price, 500ms container/mushroom delay and tree-only hourglass are superseded.

### 1.7.146 follow-up — 2026-10-08
Starting layout uses two independent coin flips: axis50/50 and side50/50, four25% layouts. Starting stumps now occupy visible outer wasteland in the opening viewport, not eight tiles offscreen; keep two, small/sparse,40–60wood/free12s. Viewport-aware placement supersedes the old distance rule only on new runs; retain existing save positions. Source-executed desktop/mobile layout checks pass; browser visuals remain unverified. Implement authorized requests on first ask, verify the actual path through generation/render/interaction, and clearly distinguish local delivered versions from published builds.

### 1.7.147 cumulative handoff — 2026-10-08
Distinct release folder with matching index/README/changelog version and all changes through 1.7.146. Expansion shortage text is absent and red numeric cost remains. Pending: visually investigate the latest swordsman circular blood-pattern complaint and basket-size complaint; no additional fix claimed for those. Full browser gameplay/performance remains unverified.

### 1.7.148 — instant stumps
Owner: gather stumps immediately on click for zero gold; keep 40–60 wood. New and loaded stumps use the existing immediate clearing payout/removal path. Supersedes all earlier 12-second stump harvesting rules.

### 1.7.149 follow-up
Pin centered/raised; attack anger accents occasional; rear rock blood blocked without painting visible front; baskets cap .20; Swordsman weight-scaled curved cast-off, including first hit. Supersedes pending implementation notes for swordsman/basket; visual verification is still pending.

### 1.7.150
Stickman attackers reserve body-separated circular positions; overflow waits. Debug log labels omit Download. Debug log identifies intermittent scenery draw stalls; browser crowd/obstacle verification and scenery profiling remain open.

### 1.7.151
Branches replace stumps, including loaded saves: instant/free,5–10wood;0–3 attempts per expansion outside grass. Ordinary scenery reveals per tile with brief pop/fade. Endpoint guards and eligible random events also place during tile reveal; finalization retains fallback event placement. Browser verification pending.

### 1.7.152 pin correction
Anchor the pointed end of 📌 at horizontal forehead center, three pixels above the original resting position. Restore original .54/.36 glyph-tip offsets; supersedes glyph-center positioning from1.7.149. Browser emoji alignment pending.

### 1.7.153 pin placement
Owner adjustment: pin three pixels left and four more up from1.7.152; retain point anchoring and animation.

### 1.7.154 sword grip
Sword butt stays near palm instead of elbow: grip back extension≤0.8,pommel≤1.2 local pixels; retain blade tip/reach/hand pose across sword variants. Browser verification pending.

### 1.7.155 hourglass
Use one centered ⌛ sprite with an eased full turn over600ms per1.8s cycle; no alternating glyph/half-turn reset. Reduced motion static. Supersedes earlier alternating-hourglass rules.

### 1.7.156 harvest indicator
Progress radius=size/2; hourglass uses identical item.x/item.y center. Supersedes raised-hourglass and oversized wedge geometry.

### 1.7.157 chat overlay
Stickman speech bubbles render last in world space, above scrolls and harvesting indicators. Harvest circle radius stays size/2 with hourglass at the same item center.

### 1.7.158 audit
Scenery saves preserve session-relative harvest/reveal/blood ages via presentationClockMs and restoreSceneryClock. Legacy saves restart timed work without another charge and complete reveal. Branch shadows use their own silhouette; healing-prop progress uses presentationTime. Browser visual/performance verification remains required.

Audit validation: 516 DOM/native-canvas assertions passed, 15 expansions, 300 crowded frames, High/Low zoom renders and inventory/save tests. Route-scaling contract uses fixed synthetic baselines; tree species uses tile RNG; reveal transforms stop after450ms; cooked meals hide healing quantities. Browser/GPU profiling and completion-time fallback events remain open.

### 1.7.159
Grunt max HP equals weight-based Constitution(round84×weight); Tiny remains1HP per earlier explicit rule. Mushroom sizes bypass endpoint bias:85% small/12% medium/3% huge. Migrate idle legacy mushrooms once; preserve in-progress size and save new rolls.

### 1.7.160
Finalization-only scenery pop-in softened using existing entrance animation. Full per-tile timing for huts/livestock/fallback placement remains open. Checks limited to changed behavior; no additional reports requested.

### 1.7.161
Pig radius14 rather than12;1–3bacon on harvest. Pin point anchors one CSS pixel below painted emoji top using actual render transform and cached pixel extrema; replaces fixed forehead offsets/pullback. Preserve other livestock yields/growth.

### 1.7.162
Combat-stat hover explanations and Luck removal implemented. Focused inspector/reward checks passed; actual browser tooltip appearance remains unverified.

### 1.7.163
Instant/free potted plants and independent visible Swordsman ground arcs implemented. All111 GitHub diffs reviewed for blood-related changes; exact head index reconstructed and hash matched. Focused checks passed; browser arc appearance/performance remains pending.

### 1.7.164 blood audit repairs
Fixed wet-foot puddle movement, separate bounded optional spray marks, live/baked renderer mismatch, cached pool RGB, stale pooled swing flags, zero/lowered budget handling and gore-off baked residue. Preserve earlier sword/weight/blocker/aging fixes. Focused changed-behavior checks passed; browser/GPU visuals and measured performance remain pending.
