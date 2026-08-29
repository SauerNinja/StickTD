# Stick Squad Defense

A zero-dependency, browser-based tower defense game. Procedural stick-figure towers, emoji enemies, no external image or audio assets — everything is drawn on an HTML5 Canvas and synthesized with the Web Audio API.

**[Play it here](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/)** ← update this link once deployed

## How to play

- Tap/click a tower card, then tap a hedge tile to build.
- Tap a placed tower to upgrade it, sell it, or cycle its targeting priority (First / Closest / Strongest).
- Press **Next Wave** when you're ready. Survive all 15 waves.
- Runs on desktop (mouse) and mobile (touch), landscape orientation.

## Running locally

Just open `index.html` in a browser. No server or build tools required.

(Optional, for a local dev server: `python3 -m http.server` from the repo root, then visit `http://localhost:8000`.)

## Architecture

Single self-contained `index.html` — no build step, no npm install, no bundler. Deliberately kept to one file rather than split into modules, since the whole game is small enough that file-splitting would add friction without payoff.

- **Rendering**: everything drawn procedurally on Canvas — stick figures via `ctx.arc`/`lineTo` paths, enemies as native emoji via `ctx.fillText`. Zero image/audio assets to load, so it boots instantly.
- **Audio**: `SoundEngine` class synthesizes all sounds live with Web Audio oscillators/noise buffers, routed through a compressor so simultaneous sounds don't clip.
- **Game loop**: fixed 60Hz timestep with a capped per-frame delta (prevents a huge time jump if the tab is backgrounded and returns).
- **Object pooling**: particles and floating damage text are pre-allocated and reused via a rolling index — nothing is allocated inside the per-frame loop.
- **Collision**: enemies are bucketed into a spatial hash grid each frame; towers/projectiles only check nearby buckets instead of every enemy on the map.
- **Input**: unified Pointer Events (mouse + touch), canvas coordinates normalized against the CSS-rendered size so taps land correctly regardless of device pixel ratio.

### Tower mechanics worth knowing if you extend this

- **Swordsman** (melee AOE): the sword's swing angle eases through anticipation → fast whip → settle (not linear), and damage is applied via angular phase-matching — an enemy is hit only once the blade's swept angle actually passes their position that frame, not all at once at swing-start. Each enemy can only be hit once per swing (tracked via a per-swing hit set).
- **Archer** (ranged single-target): aims with simple predictive lead — `enemy.x + vx * timeToImpact` — rather than the enemy's current position, so it doesn't consistently miss fast-moving targets.
- **Targeting** uses hysteresis: a tower won't drop a still-valid target for a marginally-better one — the new candidate has to beat the current target's score by ~15% — which avoids visible target-flicker when two enemies are near-equidistant.
- Fast-moving enemies (Swarm, Runner) get a cheap squash-and-stretch scale applied along their movement vector for a sense of momentum.

## Extending the game

To add a new tower or enemy type: extend the `CONFIG.TOWERS` / `CONFIG.ENEMIES` objects and, for a new tower archetype, add a `fire()`/`update()` branch on the `Tower` class. To adjust difficulty, edit `CONFIG.WAVES` (each wave is an array of `{ type, count, spawnDelay }` spawn groups) or the per-wave HP multiplier in `spawnEnemy()`.

## License

MIT — see [LICENSE](LICENSE).
