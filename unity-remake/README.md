# Stick Tower Defense — Unity remake

A playable 3D reinterpretation of [SauerNinja/StickTD](https://github.com/SauerNinja/StickTD), built in Unity 6 with an original Blender asset library. Command animated stick-figure defenders on an expanding spiral woodland battlefield with wind-blown meadows and changing weather.

## Play

The [separate Unity release](https://github.com/spinner323/StickTD/releases/tag/unity-enhanced-2026.10.22) uses tag `unity-enhanced-2026.10.22`. Download `StickTD-Unity-Enhanced-2026.10.22-Windows-x64.zip` for the upgrade, or `StickTD-Unity-Original-2026.10.22-Windows-x64.zip` for the preserved earlier Unity build. Both are unsigned Windows x64 Development builds. Extract each archive into its own directory and keep all accompanying files with `StickTD.exe`. See [release and checksum details](Documentation/UnityRelease-2026.10.22.md).

Run `Play StickTD.cmd` or `Builds/StickTD-Enhanced/StickTD.exe` after building, or open the `Unity` folder in **Unity 6000.3.19f1**, open `Assets/Scenes/StickTD.unity`, and press Play.

`Play StickTD Original.cmd` opens the earlier build when it is installed in `Builds/StickTD/`.

If the scene has not been generated yet, choose **StickTD → Create or rebuild game scene**. Choose **StickTD → Build Windows game** for a standalone Windows build. The build is portable; keep its executable and accompanying data files together.

1. Choose a defender in the Build deck, then click a grass tile beside the road. Barricades go directly on the road.
2. Click trees, rocks, and chests to gather resources. Call a wave when the squad is ready.
3. Select defenders to promote them, spend earned attribute points, and change their targeting.
4. Buy equipment and global upgrades in Camp. Four equipped items awaken a Hero.
5. Expand between waves for a longer spiral and more build space. Save and load from the menu.

| Control | Action |
| --- | --- |
| Left click | Place, select, or harvest |
| Right click / Escape | Cancel placement or selection |
| 1 / 2 / 3 / 4 | Swordsman / Archer / Mage / Barricade |
| Space | Call next wave |
| P | Pause or resume |
| Tab | Cycle simulation speed |
| Wheel | Zoom |
| Middle drag / WASD / arrows | Pan |
| F | Frame the battlefield |
| F5 / F9 | Save / load |
| M | Mute or unmute |
| V / weather button | Cycle weather and hold the selected profile |

The weather controls switch between clear skies, golden hour, overcast, rain, ground mist and storms. Auto mode blends through weather profiles. The Model Workshop on the title screen and pause menu previews every model with its idle, walk, attack, hit, death and special animation; drag to turn it and use the wheel to zoom.

Save data is stored locally under Unity's persistent data directory for `StickTD Remake/Stick Tower Defense — Unity` as `sticktd-save.json`. Saving is manual. Loading pauses the expedition.

## Contents

- `Unity/` — editable project, C# game systems, UI, FBX models, and audio.
- `ArtSource/StickTD_Assets.blend` — native Blender source workshop.
- `ArtSource/StickTD_Rigged.blend` — detailed, skinned source with armatures and animation takes.
- `ArtSource/upgrade_rigged.py` — reproducible detail, rigging and animation export script.
- `ArtSource/build_assets.py` — reproducible Blender authoring and export script.
- `ArtSource/asset_manifest.json` — model bounds, mesh counts, and provenance.
- `Documentation/` — playtest evidence and implementation notes.
- `Builds/StickTD-Enhanced/` — upgraded Windows player; the earlier build is preserved separately.
- `Builds/StickTD/` — earlier Unity player, retained byte-for-byte unchanged.
- `Reference/` — unmodified source checkout used during development; excluded from the remake's Git history.

All 64 game meshes and 13 sound assets are authored in Blender. The models contain real weighted armatures with 691 bone bindings and 392 baked animation takes. Unity samples skeletal clips for combat and movement, batches meadow plants, and adds weather, wind shading, soft shadows, puddles, fog, bloom and color grading. Terrain remains fixed. Unity builds the interface from text and UI rectangles using its built-in font. No downloaded models, texture packs, or image-generation assets are used.

The remake retains the original's core defense, evolution, equipment, resource, and endless-wave loop with a new 3D presentation and retuned pacing. It is an independent implementation, not a direct port of every system in the current browser release. Evolution thresholds and balance are adapted for shorter sessions.

Repository integration places this project under `unity-remake/` on the fork's `codex/unity-enhanced-build` branch. The browser game's existing files, version **1.8.90**, and published releases are retained unchanged; the Unity release has its own tag and downloads.

Original game and design: Sauer__Ninja. Original source reviewed at commit `16bba91f8d1d719136a674fd2267dc804d1986ba`. The original MIT notice is preserved in `LICENSE` and copied into the player build.
