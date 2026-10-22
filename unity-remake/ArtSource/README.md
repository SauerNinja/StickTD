# StickTD: Forge — Blender asset source

All 64 model assets have original Blender geometry, real armatures, vertex weights,
and six baked FBX animation takes. No downloaded meshes, textures, or animation clips
were used. `StickTD_Rigged.blend` is the detailed, rigged native workshop.
The earlier `StickTD_Assets.blend` is preserved. The user's existing DEEPLIGHT file
was inspected and never changed.

Reproduce in Blender 5.1:

```
blender --background --factory-startup --python ArtSource/build_assets.py
blender --background --factory-startup --python ArtSource/upgrade_rigged.py -- --qa
```

The first command reproduces the original 50 meshes and 10 original synthesized audio
clips. The upgrade reuses its geometry functions, adds armor/weapon/face/environment
detail, creates all rigs and weights, exports 64 FBXs, synthesizes three weather clips,
validates actual exported FBX skin clusters and takes, and renders the workshop.
`--qa` additionally renders twelve animation turntable frames. `make_rig_gif.py`
packages those rendered PNGs into an animated GIF using Pillow.

Every FBX has `Idle` (2 s), `Walk` (0.8 s), `Attack` (0.65 s), `Hit` (0.25 s),
`Death` (0.8 s), and `Special` (1.4 s) as individual baked takes. Vegetation also has
`Wind`; Chest has `Open`. These are compatible with Unity Legacy animation import.
Humanoids have 20 bones, including articulated upper/lower arms and legs, feet,
hands, Head, WeaponL/WeaponR attachments, and a cape bone. Wolf uses a quadruped rig;
Boulder rolls; Chest has a lid hinge; Tree has trunk/branch/crown deformation.
Terrain geometry remains fixed while actual grass blades bend. Static props and the
grounded ContactShadow/Puddle have fixed root clips.

Blender uses Z up and -Y front; FBX uses -Z forward/Y up with standard armature
coordinate transforms, yielding Unity +Z model facing and XZ ground planes. One unit
is one meter. Characters are about 1 m tall, with explicit larger enemy variants.
Material names encode sRGB colors, such as `ST_Teal_32B6A0`; ContactShadow uses
`Shadow_111F2A`. `asset_manifest.json` records bones, clip durations, geometry counts,
complete skin coverage, and evaluated skinned-vertex deformation measurements.
`validation_report.json` independently checks the binary FBX files.
