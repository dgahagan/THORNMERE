// Shared test fixtures: load real data files from disk into the DB registry.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../src/core/db.js';
import { Rng } from '../src/core/rng.js';
import { newGame } from '../src/core/gamestate.js';
import { createCharacter, rollStats, addToInventory, equipItem } from '../src/core/character.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function loadDb() {
  return loadAll(async (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8')));
}

export function makeChar(rng, name, raceId, classId) {
  return createCharacter(rng, { name, raceId, classId, stats: rollStats(rng, raceId) });
}

// A reasonable starter party with basic gear, standing in town.
export function makeParty(seed = 42) {
  const rng = new Rng(seed);
  const game = newGame(seed);
  const specs = [
    ['Hroth', 'korrun', 'blade', 'broadsword', 'leather_armor'],
    ['Brenna', 'vael', 'blade', 'spear', 'leather_armor'],
    ['Aldwyn', 'vael', 'warden', 'shortsword', 'leather_armor'],
    ['Tamsin', 'fennick', 'skald', 'shortsword', 'padded_jack'],
    ['Morrigan', 'aldari', 'hexen', 'dagger', 'robes'],
    ['Elspeth', 'aldari', 'lorist', 'quarterstaff', 'robes']
  ];
  for (const [name, race, cls, weapon, armor] of specs) {
    const ch = makeChar(rng, name, race, cls);
    addToInventory(ch, weapon); equipItem(ch, 0);
    addToInventory(ch, armor); equipItem(ch, 1);
    if (cls === 'skald') { addToInventory(ch, 'reed_pipe'); equipItem(ch, 2); }
    game.roster.push(ch);
    game.partyIds.push(ch.id);
  }
  game.gold = 300;
  return { game, rng };
}
