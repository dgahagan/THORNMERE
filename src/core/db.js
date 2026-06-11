// Data registry. Call initDb(raw) once with all parsed JSON; modules then
// import { DB } for indexed access. Browser loads via fetch, tests via fs.

export const DB = {
  races: [], classes: [], items: [], spells: [], songs: [], monsters: [],
  maps: {},
  balance: { remasteredXpMultiplier: 0.60 },   // default; overwritten by loadAll
  race(id) { return this.races.find(r => r.id === id); },
  cls(id) { return this.classes.find(c => c.id === id); },
  item(id) { const it = this.items.find(i => i.id === id); if (!it) throw new Error('no item ' + id); return it; },
  spell(code) { return this.spells.find(s => s.code === code); },
  song(id) { return this.songs.find(s => s.id === id); },
  monster(id) { const m = this.monsters.find(m => m.id === id); if (!m) throw new Error('no monster ' + id); return m; },
  map(id) { const m = this.maps[id]; if (!m) throw new Error('no map ' + id); return m; },
  spellsFor(school, tier) { return this.spells.filter(s => s.school === school && s.tier === tier); }
};

const MAP_IDS = ['town', 'undercroft1', 'undercroft2', 'barrow1', 'barrow2', 'barrow3',
  'needle1', 'needle2', 'needle3', 'needle4'];

export function initDb(raw) {
  DB.races = raw.races; DB.classes = raw.classes; DB.items = raw.items;
  DB.spells = raw.spells; DB.songs = raw.songs; DB.monsters = raw.monsters;
  DB.maps = raw.maps;
  if (raw.balance) DB.balance = raw.balance;
  return DB;
}

// loader(path) must return parsed JSON for a path like 'data/items.json'
export async function loadAll(loader) {
  const [races, classes, items, spells, songs, monsters, balance] = await Promise.all(
    ['races', 'classes', 'items', 'spells', 'songs', 'monsters', 'balance']
      .map(n => loader(`data/${n}.json`)));
  const maps = {};
  await Promise.all(MAP_IDS.map(async id => { maps[id] = await loader(`data/maps/${id}.json`); }));
  return initDb({ races, classes, items, spells, songs, monsters, maps, balance });
}
