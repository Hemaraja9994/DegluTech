# Exercise avatars

The 3D patients in `apps/desktop/public/avatars/` come from the
[Microsoft Rocketbox avatar library](https://github.com/microsoft/Microsoft-Rocketbox)
(MIT licence, notice in `apps/desktop/public/avatars/ROCKETBOX-LICENSE.txt`).
Research use should cite: Gonzalez-Franco M. et al. (2020) The Rocketbox Library and the Utility
of Freely Available Rigged Avatars. Frontiers in Virtual Reality 1:561558.

| File | Source avatar |
| --- | --- |
| `avatar-woman.glb` | `Assets/Avatars/Adults/Female_Adult_11/Export/Female_Adult_11_facial.fbx` |
| `avatar-man.glb` | `Assets/Avatars/Adults/Male_Adult_17/Export/Male_Adult_17_facial.fbx` |

## How the files were made

1. Textures: TGA to PNG, resized to 1024 px (colour) and 512 px (normal maps).
2. `FBX2glTF -b --blend-shape-normals` (npm `fbx2gltf@0.9.7-p1`).
3. `node convert-avatar.mjs <dir> <name> <texture-prefix> <out.glb>`: keeps the 29 face shapes the
   exercises use (jaw, lips, cheeks, tongue, brows, blink), drops shape normals and unused data,
   and attaches the textures. Do not quantise: it breaks face shapes in some Three.js versions.
4. `python3 fix-target-names.py <out.glb>`: writes the face-shape names that Three.js looks up.

`rocketbox-target-names.json` lists all 175 face shapes in their original order.
The mapping from exercise movements to face shapes is in `apps/desktop/src/avatar3d.ts`.
