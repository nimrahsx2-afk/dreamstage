#!/usr/bin/env node
/**
 * Converts KHR_materials_pbrSpecularGlossiness → metallic-roughness (required for Three.js r147+).
 *
 * Usage (from client/):
 *   npm run models:metalrough
 *   npm run models:metalrough -- public/models/Marque_Scene11.glb
 *
 * Blender export (recommended): File → Export → glTF 2.0 → Material: PBR Metallic Roughness
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough } from '@gltf-transform/functions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.resolve(__dirname, '../public/models');

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

async function collectGlbs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await collectGlbs(full)));
    } else if (e.name.toLowerCase().endsWith('.glb')) {
      files.push(full);
    }
  }
  return files;
}

async function convertFile(inputPath) {
  const doc = await io.read(inputPath);
  const root = doc.getRoot();
  const used = root.listExtensionsUsed().map((ext) => ext.extensionName);
  const needs = used.includes('KHR_materials_pbrSpecularGlossiness');

  if (!needs) {
    console.log(`  skip (no spec/gloss): ${path.basename(inputPath)}`);
    return;
  }

  await doc.transform(metalRough());
  const outPath = inputPath.replace(/\.glb$/i, '.metalrough.glb');
  await io.write(outPath, doc);
  console.log(`  wrote ${path.relative(modelsDir, outPath)}`);
  console.log(`    → Replace original after verifying in editor, or swap filename in code/DB.`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets =
    args.length > 0
      ? args.map((a) => path.resolve(process.cwd(), a))
      : await collectGlbs(modelsDir);

  if (targets.length === 0) {
    console.error('No .glb files found.');
    process.exit(1);
  }

  console.log(`Converting ${targets.length} file(s) to metallic-roughness…\n`);

  for (const file of targets) {
    try {
      const st = await stat(file);
      if (!st.isFile()) continue;
      console.log(path.basename(file));
      await convertFile(file);
    } catch (err) {
      console.error(`  FAILED: ${file}`, err);
    }
  }

  console.log('\nDone. Three.js r161 no longer loads KHR_materials_pbrSpecularGlossiness.');
}

main();
