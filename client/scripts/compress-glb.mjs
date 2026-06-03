#!/usr/bin/env node
/**
 * Compress GLB for web: Draco geometry + WebP textures (max 2048px).
 *
 * Usage (from client/):
 *   npm run models:compress -- public/models/Marque_Scene11.glb
 *   npm run models:compress -- public/models/Marque_Scene11.glb public/models/out.glb
 *
 * Writes <basename>.draco.glb by default. Use --replace to overwrite input (backs up to .original.glb).
 */

import { spawn } from 'node:child_process';
import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const replace = argv.includes('--replace');
  const filtered = argv.filter((a) => a !== '--replace');

  if (filtered.length === 0) {
    console.error('Usage: npm run models:compress -- <input.glb> [output.glb] [--replace]');
    process.exit(1);
  }

  const input = path.resolve(process.cwd(), filtered[0]);
  const output =
    filtered[1] != null
      ? path.resolve(process.cwd(), filtered[1])
      : input.replace(/\.glb$/i, '.draco.glb');

  const before = (await stat(input)).size;
  console.log(`Input:  ${input} (${(before / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Output: ${output}\n`);

  await run('npx', [
    '--yes',
    '@gltf-transform/cli',
    'optimize',
    input,
    output,
    '--compress',
    'draco',
    '--texture-compress',
    'webp',
    '--texture-size',
    '2048',
    '-v',
  ]);

  const after = (await stat(output)).size;
  const ratio = ((1 - after / before) * 100).toFixed(1);
  console.log(`\nDone: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB (${ratio}% smaller)`);

  if (replace) {
    const backup = input.replace(/\.glb$/i, '.original.glb');
    await copyFile(input, backup);
    await copyFile(output, input);
    console.log(`Replaced ${path.basename(input)} (backup: ${path.basename(backup)})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
