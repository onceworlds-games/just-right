// Builds public/models/*.glb from the CC0 models downloaded into a scratch folder (see CREDITS.md for every source):
//   node tools/assets.mjs <scratch-dir>
// <scratch-dir> holds chars/<id>.glb (the Quaternius cast) and props/<nnn>.glb (Kenney and Quaternius props), named as below.
// Each output is one file: cast.glb (every character under a node named by its key, one shared set of animations),
// props.glb and nature.glb (every model under a node named by its key). Textures are shrunk, geometry is welded,
// deduplicated and meshopt-compressed.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, meshopt, textureCompress, mergeDocuments, unpartition, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { join, resolve, dirname } from 'node:path';
import { mkdirSync, statSync } from 'node:fs';

const SRC = resolve(process.argv[2] ?? '.');
const OUT = resolve(dirname(new URL(import.meta.url).pathname), '..', 'public', 'models');
mkdirSync(OUT, { recursive: true });

// The cast: the Quaternius chibi characters (Modular Sushi Restaurant Kit). `anims` marks the one whose 30 animations are kept.
export const CAST = {
  goldi: { file: 'chars/cMsI6FDhNx.glb', anims: true }, // Rabbit Blond
  bunny: { file: 'chars/mKev485XTR.glb' }, // Rabbit
  cyan: { file: 'chars/RPZ9gxcFL3.glb' }, // Rabbit Cyan Hair
  pigtails: { file: 'chars/SwKX8OIlw8.glb' }, // Rabbit With pigtails
  grey: { file: 'chars/KRnXIKJbqp.glb' }, // Rabbit Grey
  bear: { file: 'chars/q1uJ28Hs8T.glb' }, // Panda (recoloured into the three bears at load)
};

// Props: key -> props/<n>.glb (n is the row of the download index; the model names are in CREDITS.md).
export const PROPS = {
  stove: 60, toaster: 3, chair: 4, chairCushion: 5, chairRound: 6, bedSingle: 7, bedDouble: 8, bowlCereal: 9, potStew: 12,
  honey: 14, cake: 15, bread: 17, loaf: 18, carton: 20, cup: 22, mug: 23, spoon: 24, ladle: 25, knife: 26, table: 27,
  tableCloth: 28, bench: 30, bookcase: 31, books: 32, rugRound: 33, plant: 35, cabinet: 36, cabinetUpper: 38, sink: 39,
  board: 40, rollingPin: 41, pancakes: 42, pie: 43, muffin: 44, apple: 45, strawberry: 46, door: 51, lamp: 56, coatRack: 57,
  sideTable: 58, longTable: 70, plankTable: 69, shelves: 72, wallShelves: 74, fireplace: 75, rug: 79, nightStand: 88,
  curtains: 97, breadSlice: 102, stoolRed: 179, chairLadder: 180, armchair: 182, chairBent: 183, doorRound: 185,
  roundWindow: 186, crate: 190, crate2: 192, bucket: 196, bell: 148, well: 149, fence: 153, fence2: 154, barrel: 156,
  barrel2: 157, hay: 160, gardenBench: 161, dock: 164, dock2: 165, log: 167,
};
export const NATURE = {
  tree1: 105, tree2: 106, tree3: 107, tree4: 108, tree5: 109, pine1: 120, pine2: 121, pine3: 122, bush1: 125, bush2: 126,
  bush3: 127, bush4: 128, flowerBush: 132, flowers1: 133, flowers2: 134, grass1: 135, grass2: 136, grass3: 137, grass4: 139,
  rock1: 142, rock2: 143, mushrooms: 145, mushroomBig: 147, twisted1: 168, twisted2: 169, fern: 173, plantBig: 174,
  clover: 176, tallGrass: 178, blobTree1: 115, blobTree2: 116,
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;

/** Reads a source and puts its scene under one node named `key`. */
async function keyed(file, key, { keepAnims = false } = {}) {
  const doc = await io.read(join(SRC, file));
  const root = doc.getRoot();
  if (!keepAnims) for (const a of root.listAnimations()) a.dispose();
  else for (const a of root.listAnimations()) a.setName(a.getName().split('|').pop());
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const holder = doc.createNode(key);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    holder.addChild(child);
  }
  scene.addChild(holder);
  return doc;
}

async function bundle(name, entries, { maxTexture = 512 } = {}) {
  const out = new Document();
  out.createBuffer();
  const scene = out.createScene(name);
  out.getRoot().setDefaultScene(scene);
  for (const [key, e] of entries) {
    const doc = await keyed(e.file, key, { keepAnims: !!e.anims });
    const map = mergeDocuments(out, doc);
    for (const s of doc.getRoot().listScenes()) {
      const merged = map.get(s);
      for (const child of merged.listChildren()) {
        merged.removeChild(child);
        scene.addChild(child);
      }
      merged.dispose();
    }
  }
  await out.transform(
    unpartition(),
    resample(),
    dedup(),
    weld(),
    prune({ keepLeaves: true, keepAttributes: false }),
    textureCompress({ encoder: sharp, resize: [maxTexture, maxTexture] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const path = join(OUT, `${name}.glb`);
  await io.write(path, out);
  console.log(`${name}.glb ${(statSync(path).size / 1024).toFixed(0)} KB, ${entries.length} models`);
}

await bundle('cast', Object.entries(CAST));
await bundle('props', Object.entries(PROPS).map(([k, n]) => [k, { file: `props/${String(n).padStart(3, '0')}.glb` }]));
await bundle('nature', Object.entries(NATURE).map(([k, n]) => [k, { file: `props/${String(n).padStart(3, '0')}.glb` }]), { maxTexture: 256 });
