#!/usr/bin/env node
// Build script: generates all three feelies PDFs.
// Usage: node scripts/build-feelies.js
// Output: feelies/thornmere-map.pdf
//         feelies/thornmere-manual.pdf
//         feelies/thornmere-command-card.pdf

import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { loadGameData, DB } from './lib/data-loader.js';
import { generateMap }    from './lib/pdf-map.js';
import { generateManual } from './lib/pdf-manual.js';
import { generateCard }   from './lib/pdf-command-card.js';

const ROOT    = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'feelies');

async function main() {
  console.log('Loading game data…');
  await loadGameData();

  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Generating town map…');
  await generateMap(join(OUT_DIR, 'thornmere-map.pdf'));

  console.log('Generating manual…');
  await generateManual(join(OUT_DIR, 'thornmere-manual.pdf'), DB);

  console.log('Generating command card…');
  await generateCard(join(OUT_DIR, 'thornmere-command-card.pdf'));

  console.log('\nDone! PDFs written to feelies/');
  console.log('  thornmere-map.pdf         — landscape A4, print and unfold');
  console.log('  thornmere-manual.pdf      — portrait A4, staple spine or ring-bind');
  console.log('  thornmere-command-card.pdf — landscape A4, fold in half or paste to monitor');
}

main().catch(err => { console.error(err); process.exit(1); });
