# Realistic exercise demos (male and female)

The app's "Real body" demos are sprite sheets in `assets/humans/`, rendered from
the same key poses as the drawn animations (`src/animation/moves.ts`), so timing
and coaching cues match.

## What is used, and the licences

| Part | Source | Licence |
| --- | --- | --- |
| Bodies, skins, hair, eyes, clothes, shoes | MakeHuman assets bundled with MakeHuman / MPFB | CC0 1.0 (public domain) |
| MPFB add-on (only used to build the bodies, not shipped) | makehumancommunity/mpfb2 | GPLv3 code; its output is yours (see MPFB LICENSE, section D) |
| Blender (only used to render, not shipped) | `pip install bpy` | GPL; renders are yours |

Only the rendered images ship in the app. Logos and watermarks were removed from
the clothing textures (`prep_textures.py`).

## Re-render (optional)

Needs Python 3.13, about 2 GB of disk and a few hours on a 4-core machine.

```bash
python3 -m venv venv && venv/bin/pip install bpy==5.2.5
git clone --depth 1 https://github.com/makehumancommunity/mpfb2.git
# MakeHuman system assets (CC0): skins, clothes, hair, eyes, eyebrows, eyelashes
# copied into the MPFB user data folder (Blender's extensions/.user/user_default/mpfb/data).
python3 prep_textures.py <that data folder>
node --import ../../scripts/ts-resolve.mjs export-frames.mjs frames.json
for s in male female; do MPFB_SRC=mpfb2/src/mpfb venv/bin/python render.py -- --frames frames.json --sex $s --out out --res 480x360 --samples 14; done
python3 pack.py frames.json out ../..
```

`char.py` sets the body shape, skin tone, hair and outfit for each body.
`render.py` poses the rig from the 2D frames, keeps hands and feet on the floor,
adds simple props (chair, wall, step, mat, door) and frames the camera.
