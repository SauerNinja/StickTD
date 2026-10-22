# Unity release — 2026-10-22

Download the packages from [Unity enhanced release](https://github.com/spinner323/StickTD/releases/tag/unity-enhanced-2026.10.22), with the independent tag `unity-enhanced-2026.10.22`. This is a separate Unity reinterpretation of StickTD, with adapted progression and balance; it does not claim full parity with the browser game.

## Separate portable builds

| Download asset | Archive's top folder | Contents |
| --- | --- | --- |
| `StickTD-Unity-Enhanced-2026.10.22-Windows-x64.zip` | `StickTD-Enhanced/` | Detailed, rigged models, skeletal animations, dynamic weather and upgraded rendering |
| `StickTD-Unity-Original-2026.10.22-Windows-x64.zip` | `StickTD/` | Earlier Unity build, preserved byte-for-byte |

Both packages contain unsigned Windows x64 Development players built with Unity **6000.3.19f1**. Extract each archive into its own directory and run its `StickTD.exe`; keep the executable, data folder and adjacent runtime files together. The release supplies `SHA256SUMS.txt` for the archives and separate SHA256 file manifests for the original and enhanced players. Compare an archive's hash with `Get-FileHash -Algorithm SHA256 <archive-path>` before extracting it.

The earlier local player remains at `Builds/StickTD/`; the enhanced player remains at `Builds/StickTD-Enhanced/`. Packaging reads those directories without rebuilding or modifying their files. Both players use the existing Unity persistent save location described in the README, so separate installation directories do not create separate save profiles.

## Repository isolation

Editable Unity source, Blender source, launchers and supporting documentation are added only under `unity-remake/` on [the fork's source branch](https://github.com/spinner323/StickTD/tree/codex/unity-enhanced-build/unity-remake). A pull request will propose that isolated directory to [SauerNinja/StickTD](https://github.com/SauerNinja/StickTD); it does not replace the browser game.

The existing browser files, **1.8.90** version, changelog, workflows and published releases remain unchanged. The Unity tag uses a separate name and its release does not replace the browser release as Latest. Player binaries are release assets; build directories and Unity-generated caches remain outside source control. The MIT notice is retained with the source and both players.

## Verified upgrade

- Blender validation records **64 rigged models, 691 bone bindings and 392 baked animation takes**, with complete vertex-weight coverage. Unity imported all 384 required clips, and sampled attacks on three defenders deformed their vertices.
- Live animation checks passed for walking, attacks, death and pause freezing. The Model Workshop previews the models and their animation states.
- **85 gameplay assertions passed**, including placement, costs, progression, equipment, harvesting, expansion and active-wave save/load. Two live combat waves completed with 100 lives; the second produced no console errors or warnings after historical diagnostics were cleared.
- Weather checks covered clear, golden hour, overcast, rain, mist and storm profiles. The actual 12-second clear-to-storm blend reached full wetness, with live rain particles and supported rendering shaders.
- The enhanced standalone player launched and rendered its title screen without script exceptions or shader errors in its startup log.

Detailed evidence is in [VisualUpgrade.md](VisualUpgrade.md), [enhanced-verification.json](enhanced-verification.json), [visual-import-checks.json](visual-import-checks.json) and [visual-motion-checks.json](visual-motion-checks.json). These checks establish the observed behavior; they do not establish full browser feature parity, long-session balance or performance on other machines.
