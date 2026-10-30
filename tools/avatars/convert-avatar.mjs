import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization, KHRTextureTransform } from '@gltf-transform/extensions';
import { quantize, prune, dedup } from '@gltf-transform/functions';
import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [,, dir, name, prefix, outFile] = process.argv;
const all = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'rocketbox-target-names.json'), 'utf8'))[name];
const KEEP = ['AK_06_CheekPuff','AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight','AK_23_JawForward','AK_24_JawLeft','AK_25_JawOpen','AK_26_JawRight','AK_27_MouthClose','AK_32_MouthFunnel','AK_36_MouthPressLeft','AK_37_MouthPressRight','AK_38_MouthPucker','AK_44_MouthSmileLeft','AK_45_MouthSmileRight','AK_46_MouthStretchLeft','AK_47_MouthStretchRight','AK_52_TongueOut','AU_04_BrowLowerer','AU_07_LidTightener','AU_17_ChinRaiser','AU_01_InnerBrowRaiser','HB_08_TongueOut','HB_09_TongueIn','HB_10_L_Tongue','HB_10_R_Tongue','HB_11_TongueDown','HB_12_TongueUp','AU_25_LipsPart','AU_27_MouthStretch'];
const io = new NodeIO().registerExtensions([KHRMeshQuantization, KHRTextureTransform]);
const doc = await io.read(path.join(dir, name + '.glb'));
const root = doc.getRoot();
for (const mesh of root.listMeshes()) {
  const keepIdx = KEEP.map(k => all.indexOf(k));
  if (keepIdx.some(i => i < 0)) throw new Error('missing target ' + KEEP[keepIdx.findIndex(i => i < 0)]);
  for (const prim of mesh.listPrimitives()) {
    const targets = prim.listTargets();
    targets.forEach((t, i) => { if (!keepIdx.includes(i)) { prim.removeTarget(t); t.dispose(); } });
    // reorder to KEEP order
    const kept = prim.listTargets(); kept.forEach(t => prim.removeTarget(t));
    const order = keepIdx.map(i => targets[i]); order.forEach(t => prim.addTarget(t));
  }
  mesh.setWeights(KEEP.map(() => 0));
  mesh.setExtras({ targetNames: KEEP });
}
// textures by material name
const tex = async (file, size, fmt) => {
  let img = sharp(path.join(dir, file)).resize(size, size);
  const buf = fmt === 'png' ? await img.png({ compressionLevel: 9 }).toBuffer() : await img.jpeg({ quality: 82 }).toBuffer();
  return doc.createTexture(file).setImage(buf).setMimeType(fmt === 'png' ? 'image/png' : 'image/jpeg');
};
for (const t of root.listTextures()) t.dispose();
for (const m of root.listMaterials()) {
  const n = m.getName();
  const part = n.replace(prefix + '_', '');
  m.setMetallicFactor(0).setRoughnessFactor(0.62).setBaseColorFactor([1,1,1,1]);
  m.setMetallicRoughnessTexture(null); m.setEmissiveTexture(null); m.setOcclusionTexture(null);
  if (part === 'opacity') {
    m.setBaseColorTexture(await tex(prefix + '_opacity_color.png', 1024, 'png')).setNormalTexture(null).setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true);
  } else {
    m.setBaseColorTexture(await tex(`${prefix}_${part}_color.png`, 1024, 'jpg'));
    m.setNormalTexture(await tex(`${prefix}_${part}_normal.png`, 512, 'jpg')).setAlphaMode('OPAQUE');
  }
}
for (const m of root.listMeshes()) for (const pr of m.listPrimitives()) for (const t of pr.listTargets()) { const n = t.getAttribute('NORMAL'); if (n) { t.setAttribute('NORMAL', null); } }
await doc.transform(prune({ keepAttributes: false }), dedup());
for (const a of root.listAnimations()) a.dispose();
await io.write(outFile, doc);
console.log(outFile, (fs.statSync(outFile).size / 1e6).toFixed(2) + ' MB', root.listMaterials().map(m => m.getName() + ':' + m.getAlphaMode()));
