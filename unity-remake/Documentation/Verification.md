# Verification — 2026-10-22

Unity Editor: **6000.3.19f1**, Windows x64, built-in renderer. Blender: **5.1.2**.

## Observed results

- Windows player built successfully: `Builds/StickTD/StickTD.exe` with its accompanying data files. Unity reported 153,442,364 bytes. This is an unsigned development build.
- The standalone player launched, remained responsive, and rendered the title screen correctly. The player log contained no C# exceptions or missing-asset errors. Native Play-button automation stopped when the computer-use tool detected concurrent user input; no retry was made against the user's interaction.
- Unity's frame-count wait observed advancing frames, and `playerLoopTicking` reported true.
- A normal opening squad (Archer, Swordsman, Mage; 170 total gold) completed wave 1: **8 enemies defeated, 100 lives, 113 gold**, with XP and training points awarded to the squad. No gameplay errors were logged during that run.
- `GameplayChecks.Run()` passed **85 assertions**. The checks cover valid and invalid placement, actual costs, promotion, XP, branching evolution, purchased-specialist stability, four-slot Hero equipment, harvesting and reset, expansion costs and route continuity, Splitter children, one Skeleton revival and bounty, and a paused active-wave save/load roundtrip including projectiles and damage ownership. Existing save bytes were preserved.
- All **50 FBX models** imported with mesh renderers. All four spiral sizes are continuous, contain no repeated tile, and retain the previous route as an exact suffix after expansion.
- Blender validation confirmed meter scale, grounded origins, one mesh per model, Unity-facing axes, XZ rings, one-meter tiles, and the foundation dimensions. Ten WAV clips are included.
- Visual checks covered the title and 1600×900 HUD, defender selection, health/XP bars, upgrade/training controls, range ring, active enemies and final shortened Inspect tab. Screenshots are in `Documentation/Screenshots/`.

## Issues found and corrected

- First compile: an instance/static mismatch for map tile size. Corrected before play testing.
- Specialist training could replace an advanced purchased class with an earlier evolution. Exact-parent and rank guards now prevent this, and the assertions cover Sniper and Paladin.
- The initial revival behavior was assigned to Zombie. It now belongs to Skeleton, matching the reference.
- Font line height hid two HUD headings and wrapped the selected-defender tab. The text layout and label were corrected.
- Unity's own search-index startup emitted an `ArgumentOutOfRangeException` in `UnityEditor.Search.SearchDatabase`. Creating the default project search index resolved the current editor error state; the final console ground-truth snapshot reports zero errors and zero warnings. The historical entry is retained in `final-console.json`.
- The Hub-launched Editor exited before sustained testing. A dedicated local Editor process was used for the successful compilation, live testing, captures and build.

## Practical limits

The remake implements the core 15-class/18-enemy loop with 15 introductory waves and seven repeating endless wave archetypes. It retunes pacing and evolution thresholds for shorter sessions. It does not port every visitor, producer, inventory, alternate mode or other late-added system in the current browser version. Long-term balance across all endless waves and every possible build has not been manually verified.

Original source reference: `16bba91f8d1d719136a674fd2267dc804d1986ba`. Original MIT notice is preserved.
