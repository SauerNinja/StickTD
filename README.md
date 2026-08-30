# Stick Squad Defense

A zero-dependency, browser-based tower defense game. Procedural stick-figure towers, emoji enemies, no external image or audio assets — everything is drawn on an HTML5 Canvas and synthesized with the Web Audio API.

**[Play it here](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/)** ← update this link once deployed

## How to play

- Tap **Build**, pick a tower, then tap a hedge tile to place it.
- Tap a placed tower to upgrade it, sell it, **move** it, or cycle its targeting priority (First / Closest / Strongest).
- You get 1 free tower relocation ("Move") to start, plus another every 2 waves you clear (capped at 3).
- More towers unlock as you clear waves — locked ones show in the Build panel grayed out with the wave they unlock on.
- Use ⏸ Pause, the 1x/2x/3x fast-forward button, and 🔊 mute in the HUD as needed.
- Press **Next Wave** when you're ready. Survive all 15 waves.
- Runs on desktop (mouse + scroll-to-zoom) and mobile (touch, pinch-to-zoom, drag-to-pan), landscape orientation.

## Glossary

Stats below are base (level 1) values. Enemy HP additionally scales up by 15% per wave (`1 + (wave-1) × 0.15`), so late-wave Grunts hit much harder than wave-1 Grunts even though the base numbers below don't change.

### Towers

| Tower | Cost | Unlocks | Role | Notes |
|---|---|---|---|---|
| ⚔️ **Swordsman** | 💰50 | Wave 0 (start) | Melee AOE cone | Hits every enemy caught in a swept arc in front of it. Goes to **level 5**, where you choose a permanent specialization — see below. |
| 🏹 **Archer** | 💰60 | Wave 0 (start) | Ranged, single target | Long range, aims with predictive lead so it doesn't whiff on fast enemies. |
| 🪓 **Axeman** | 💰75 | After wave 2 | Hybrid melee/ranged | Automatically switches per attack: a quick two-handed swing if the target is in melee range, otherwise a slow, heavy axe throw. Has two independent range rings (throw range + a smaller melee range) shown when selected. |
| 🔱 **Spearman** | 💰65 | After wave 5 | Melee, long reach | Same swing-cone mechanic as the Swordsman, but with much greater reach and a visibly slower, heavier windup. Trades attack speed for range and damage. |
| 🔮 **Mage** | 💰70 | After wave 3 | Ranged, control | Low damage, but slows whatever it hits (strongest slow wins if multiple Mages hit the same target; duration refreshes rather than stacking to a permanent freeze). |
| 💣 **Bomber** | 💰90 | After wave 6 | Ranged, splash | Lobs an explosive that damages every enemy within its blast radius on impact — the AOE counter to grouped enemies. |
| 🔫 **Gatling** | 💰80 | After wave 9 | Ranged, rapid fire | Very fast cooldown, low damage per shot. Best against Swarm-type waves where per-hit damage matters less than sheer fire rate. |

**Swordsman level 5 specializations** (permanent, chosen once):
- **Two-Hander** 🗡️ — one massive blade, a much wider sweep (~207° vs the normal ~90° cone), +60% damage, but a slower cooldown.
- **Dual Wield** ⚔️ — two independent swords, each can lock onto a *different* enemy and runs its own full swing animation in the same instant. Each blade hits lighter (75% damage) but you get two swings per cooldown window.

All towers have 3 upgrade tiers except the Swordsman, which has 5 (tiers 4–5 lead into the specialization choice above). Selling refunds 70% of everything spent on a tower (base cost + upgrades).

### Enemies

| Enemy | Emoji | HP | Speed | Bounty | Notes |
|---|---|---|---|---|---|
| Grunt | 😡 | 60 | Normal | 💰5 | The baseline — no special traits. |
| Swarm | 🐜 | 22 | Fast | 💰2 | Low HP, spawns in tight fast-moving clusters. Weak individually, dangerous in numbers — good target for AOE or rapid-fire towers. |
| Tank | 🗿 | 220 | Slow | 💰14 | Flat damage reduction (armor 6) — chips away high-fire-rate/low-damage towers much more effectively than it looks. Needs real per-hit damage to bring down efficiently. |
| Runner | 🥷 | 45 | Very fast | 💰8 | Outruns most towers' effective DPS unless slowed or intercepted early. |
| Boss | 👹 | 2200 | Slow | 💰150 | Appears on wave 15 (the finale), escorted by Grunts. |

**Big/Golden Variant**: any enemy has a small chance (0.5%) to spawn as a golden "big" version — **+20% HP, +40% size, +40% bounty, +20% speed**. Marked with a pulsing gold ring and a "BIG!" floating label when it spawns, so it's easy to spot and prioritize (or avoid) on sight.

### Wave structure

15 waves total, ramping from a Grunt-only tutorial wave through mixed Swarm/Tank/Runner combinations, up to the wave-15 Boss finale. Enemy HP scales up each wave via the multiplier above; clearing a wave grants a small gold bonus and, every 2 waves, a free tower Move charge.

## Running locally

Just open `index.html` in a browser. No server or build tools required.

(Optional, for a local dev server: `python3 -m http.server` from the repo root, then visit `http://localhost:8000`.)

## Architecture

Single self-contained `index.html` — no build step, no npm install, no bundler. Deliberately kept to one file rather than split into modules, since the whole game is small enough that file-splitting would add friction without payoff.

- **Rendering**: everything drawn procedurally on Canvas — stick figures via `ctx.arc`/`lineTo` paths (two-segment bent arms, not straight sticks), enemies as native emoji via `ctx.fillText`. The static hedge maze is baked once into an offscreen canvas at boot and blitted per frame rather than redrawn — by far the biggest performance win. Zero image/audio assets to load, so it boots instantly.
- **Audio**: `SoundEngine` class synthesizes all sounds live with Web Audio oscillators/noise buffers, routed through a compressor so simultaneous sounds don't clip.
- **Game loop**: fixed 60Hz timestep with a capped per-frame delta (prevents a huge time jump if the tab is backgrounded and returns). Fast-forward scales how much simulated time is fed into the loop per real frame, rather than scaling `dt` itself, so 2x/3x speeds up everything uniformly and consistently.
- **Object pooling**: enemies, towers, projectiles, particles, and floating damage text are all pre-allocated and reused — nothing is allocated inside the per-frame loop.
- **Collision**: enemies are bucketed into a spatial hash grid each frame; towers/projectiles only check nearby buckets instead of every enemy on the map.
- **Input**: unified Pointer Events (mouse + touch) with pinch-to-zoom and drag-to-pan; canvas coordinates are normalized against the CSS-rendered size and current camera transform so taps land correctly regardless of device pixel ratio, zoom, or pan.
- **Graphics quality toggle**: High/Low choice on the start screen controls the device-pixel-ratio cap and a few purely-decorative glow layers — nothing gameplay-relevant changes between the two.

### Tower mechanics worth knowing if you extend this

- **Swordsman/Spearman** (melee AOE): the swing angle eases through anticipation → fast whip → settle (not linear), and damage is applied via angular phase-matching — an enemy is hit only once the blade's swept angle actually passes their position that frame, not all at once at swing-start. Each enemy can only be hit once per swing (tracked via a per-swing hit set). Spearman reuses this exact same code path with different range/arc/cooldown tiers.
- **Axeman** picks its action (melee vs. throw) fresh every attack cycle based on live distance to its target — see `Tower.updateAxeman()`.
- **Archer/Mage/Bomber/Gatling** all share one generalized `fireProjectile()` path; splash radius and slow-on-hit are optional per-tower fields the `Projectile` class checks for, so adding a new ranged effect is a config change plus a branch in `Projectile.onImpact()`, not a whole new firing method.
- **Targeting** uses hysteresis: a tower won't drop a still-valid target for a marginally-better one — the new candidate has to beat the current target's score by ~15% — which avoids visible target-flicker when two enemies are near-equidistant.
- Fast-moving enemies (Swarm, Runner) get a cheap squash-and-stretch scale applied along their movement vector for a sense of momentum.

## Extending the game

To add a new tower: add an entry to `CONFIG.TOWERS` (icon, cost, unlock wave, blurb, tiers array), then either reuse an existing role (`updateSwordsman`/`updateRanged`/`updateAxeman`) or add a new one, plus a rendering branch in `drawStickman()`. To add a new enemy: add an entry to `CONFIG.ENEMIES` and reference its key from `CONFIG.WAVES`. To adjust difficulty, edit `CONFIG.WAVES` (each wave is an array of `{ type, count, spawnDelay }` spawn groups) or the per-wave HP multiplier in `spawnEnemy()`.

## License

MIT — see [LICENSE](LICENSE).
