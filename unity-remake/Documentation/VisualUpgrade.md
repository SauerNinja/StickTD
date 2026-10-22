# Visual and animation upgrade — 2026-10-22

The upgraded project adds detailed Blender models, weighted skeletal animation, a denser woodland meadow, directional and contact shadows, wind, wet surfaces, puddles, rain, mist, drifting leaves, fireflies, weather audio, bloom, and color grading.

## Asset and animation evidence

- 64 FBX models, 64 skinned meshes, 691 bone bindings, and complete vertex-weight coverage.
- 392 Blender animation takes: six required takes per asset, plus vegetation wind and chest opening takes. Fixed terrain and grounded props have fixed root takes rather than artificial movement.
- Unity import validation passed for all 384 required Legacy clips. Sampled Swordsman, Archer, and Mage attack clips deform actual mesh vertices.
- An asynchronous live Play Mode check verified skeletal walking, attack, and death movement, plus pause freezing and probe cleanup. See `visual-import-checks.json` and `visual-motion-checks.json`.
- Native source: `ArtSource/StickTD_Rigged.blend`; reproducible exporter: `ArtSource/upgrade_rigged.py`; independent FBX validation: `ArtSource/validation_report.json`.

## Scene and weather evidence

- Opening meadow contains 1,651 batched Blender plants. Fixed terrain shares baked Blender meshes; characters retain runtime skeletons.
- Inspected clear daylight, golden hour, rain, mist, and storm captures. Overcast lighting/fog parameters also verified live.
- Clear-to-storm transition used the actual 12-second blend: wetness progressed from 0 through 0.22138 to 1, with storm wind reaching 1.8. Rain emitted 372 live particles; storm emitted 684. Particle meshes have one submesh as required by Unity.
- Runtime foliage, ground, puddle, particle, and atmosphere shaders reported supported.
- Model Workshop renders all 64 models with six animation controls, rotation and zoom. Its render texture contains visible geometry immediately on opening. Closing removes its camera, canvas, and render texture and restores campaign lighting and pause state.
- Main view screenshots are under `Documentation/Screenshots/enhanced-*.png`; workshop screenshot is `workshop-fixed.png`. Blender motion preview is `ArtSource/RigAnimationPreview.gif`.

## Gameplay regression evidence

`GameplayChecks.Run()` passed 85 assertions covering legal and illegal placement, exact costs, promotion, XP, evolution, specialist stability, Hero equipment, harvesting, expansion route preservation, splitter children, skeleton revival, and active-wave save/load of economy, actors, statuses, equipment and projectiles. The check preserves the user's manual save.

Two real-time combat waves completed with three defenders. Wave 1 ended with 8 kills, 100 lives, 113 gold and no enemies. Wave 2 ended with 25 cumulative kills, 100 lives and 213 gold. After clearing historical development diagnostics, Wave 2 produced zero console errors and zero warnings. Idle editor frame time sampled approximately 19.7 ms; this is an observation on this machine, not a performance guarantee.

## Running the upgrade

Run `Play StickTD.cmd` or `Builds/StickTD-Enhanced/StickTD.exe`. Keep the executable with its adjacent data files. The earlier build remains at `Builds/StickTD`.

The enhanced Windows build succeeded (206,358,321 bytes) and was launched as process 14628. Its standalone title screen visibly renders the detailed terrain, foliage, shadows and workshop button. Startup log inspection found no script exceptions or shader errors. `enhanced-build-result.json`, `enhanced-player-sha256.json`, and `EnhancedPlayer.log` record this build. Desktop input testing stopped when concurrent user input was detected; the workshop and combat checks above were performed in the live Unity editor.

Use **V** or the weather button to hold a weather profile; enable **WEATHER: AUTO** for cycling. **MODEL WORKSHOP** is on the title screen and pause menu.
