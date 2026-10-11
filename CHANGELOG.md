# Changelog

Current minor-version family only. Older entries: [HISTORY.md](HISTORY.md). Versions use major.minor.patch; archive the previous family when minor changes.

## [1.8.1] — 2026-10-11 (UTC)
### Combat balance, branch collection and release builds
- Lower defender direct and alternate melee damage by 30% through stat recomputation; applies to loaded defenders. Preserve stat caps, weapon profiles and spell effects. Archer tier cooldowns become 1430/1350/1250 ms before existing multipliers, instead of 1430/693/572; draw times become 800/650/550 ms. Mage base damage becomes 22 rather than 26 to keep starting single-target expected output close to Archer while retaining wider variance and splash. This is a tuning pass, not a claim of completed playtesting.
- WEIGHT-HP-181: road enemies use species base HP × weight × wave HP multiplier × 1.25, rounded once. Within the same species/wave, doubling weight doubles unrounded HP. Preserve Tiny Grunts at 1 HP; livestock health is unchanged. Old saved live enemies retain their saved health; newly spawned enemies use the new rule.
- Bees draw once in an elevated world pass above scenery, actors and loose-item emojis, below speech and interface overlays.
- Retain cumulative 1.7.175 branch fixes: 🪾 sprites, one atomic pickup, wood flights to Build. Preserve 1.7.174 music, blood, cooking, bees/honey, cake, camera and reporting work.
- Move all previous release entries intact into HISTORY.md. Current changelog contains only 1.8.x. Agent guidance searches history selectively.
- Every main-branch push builds web, Windows portable EXE, Linux AppImage, macOS DMG (Intel and Apple Silicon) and Android debug APK. Commit-specific releases prevent silently replacing a build. Native packages are unsigned/test-signed and require platform validation; no production signing or store submission is implied.

