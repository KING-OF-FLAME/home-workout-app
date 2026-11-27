// Samples every exercise animation into evenly spaced frames of 2D joint
// positions. render.py (Blender + MakeHuman) poses the 3D bodies from these.
// Run: node --import ./scripts/ts-resolve.mjs tools/render-humans/export-frames.mjs out.json
import { writeFileSync } from 'node:fs';
import { MOVES } from '../../src/animation/moves.ts';
import { prepare, timeline, sample, GROUND } from '../../src/animation/skeleton.ts';

const out = { ground: GROUND, unit: 0.0205, moves: {} };
for (const [id, move] of Object.entries(MOVES)) {
  const prepared = prepare(move.frames, move.view);
  const tl = timeline(move.frames);
  // About 8 frames per second of movement, between 12 and 28 frames per loop.
  const n = Math.max(12, Math.min(28, Math.round(tl.total / 125)));
  const frames = [];
  for (let i = 0; i < n; i++) {
    const s = sample(prepared, tl, (i / n) * tl.total, move.view);
    frames.push({ p: s.points, spine: s.spine, cue: s.cue ?? null, air: 0 });
  }
  out.moves[id] = { view: move.view, faceUp: !!move.faceUp, props: move.props ?? [], ms: tl.total, frames };
}
writeFileSync(process.argv[2] ?? 'frames.json', JSON.stringify(out));
console.log(Object.keys(out.moves).length, 'moves exported');
