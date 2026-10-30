import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const root = new URL('../apps/desktop/', import.meta.url);
const glbJson = (file: string) => {
  const b = readFileSync(new URL(`public/avatars/${file}`, root));
  assert.equal(b.toString('ascii', 0, 4), 'glTF', `${file} is not a binary glTF`);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8', 20, 20 + len));
};
const source = readFileSync(new URL('src/avatar3d.ts', root), 'utf8');
const shapesUsed = [...new Set([...source.matchAll(/W\.([A-Z]{2}_\d{2}_[A-Za-z_]+)/g)].map(m => m[1]))];
const bonesUsed = [...new Set([...source.matchAll(/'(Bip01_[A-Za-z_]+)'/g)].map(m => m[1]))];

for (const file of ['avatar-woman.glb', 'avatar-man.glb']) {
  test(`${file}: every face shape the exercises drive is present`, () => {
    const j = glbJson(file);
    const names: string[] = j.meshes[0].extras.targetNames;
    assert.ok(shapesUsed.length >= 25);
    for (const s of shapesUsed) assert.ok(names.includes(s), `missing face shape ${s}`);
    for (const m of j.meshes) for (const p of m.primitives) assert.equal(p.targets.length, names.length);
  });
  test(`${file}: rig has the bones the player moves, and stays phone-sized`, () => {
    const j = glbJson(file);
    const nodes = new Set(j.nodes.map((n: { name: string }) => n.name.replace(/ /g, '_')));
    for (const b of bonesUsed) assert.ok(nodes.has(b), `missing bone ${b}`);
    assert.ok(statSync(new URL(`public/avatars/${file}`, root)).size < 6_000_000);
  });
}
