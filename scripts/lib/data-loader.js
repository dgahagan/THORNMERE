// Loads game data from disk for use in build scripts (Node.js environment).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DB, loadAll } from '../../src/core/db.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export async function loadGameData() {
  return loadAll(path => JSON.parse(readFileSync(join(ROOT, path), 'utf8')));
}

export { DB };
