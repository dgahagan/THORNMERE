// Battle-by-battle + economy detail for the three best runs (for the report and
// to guide the browser showcase).
import { writeFile } from 'node:fs/promises';
import { ensureDb, runAttempt } from './harness-v2.mjs';
await ensureDb();

const TUNED = {
  rerolls: 60, musterReserve: 160,
  members: [
    { name: 'Hroth',   race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
    { name: 'Brand',   race: 'korrun',  cls: 'warden', weapon: 'hand_axe',    armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
    { name: 'Sorrel',  race: 'halfwyld',cls: 'strider',weapon: 'spear',       armor: 'padded_jack',   helm: 'leather_cap' },
    { name: 'Elspeth', race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Morrigan',race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Tamsin',  race: 'vael',    cls: 'skald',  weapon: 'shortsword',  armor: 'padded_jack', instrument: 'reed_pipe' },
  ],
  potions: [{ id: 'healing_draught', count: 2 }, { id: 'antidote', count: 1 }],
};

const BEST = [
  { mode: 'legacy', seed: 9068 },
  { mode: 'remastered', seed: 9085 },
  { mode: 'remastered', seed: 9017 },
];

const out = [];
const pad = (s, n) => String(s).padEnd(n);
for (const b of BEST) {
  const r = runAttempt(TUNED, { mode: b.mode, seed: b.seed });
  out.push(r);
  console.log(`\n=== BEST RUN — ${b.mode} seed ${b.seed} ===`);
  console.log(`success ${r.success} | town ${r.townWins} dungeon ${r.dungeonWins} | deaths ${r.deaths.length} (perma ${r.permaDeaths.length}) | retreats ${r.retreats}`);
  console.log(`muster: purse ${r.muster.purse} - gear ${r.muster.gear} - spells ${r.muster.spells} - potions ${r.muster.potions} = startGold ${r.startGold}`);
  console.log(`spent: temple ${r.gold.temple} spark ${r.gold.spark} wine ${r.gold.wine} resurrect ${r.gold.resurrect} upgrades ${r.gold.upgrades} | finalGold ${r.finalGold}`);
  console.log(`levelUps ${r.levelUps} | chests ${r.chestsOpened} | trapsSprung ${r.trapsSprung} | townDay ${r.townDayFights} townNight ${r.townNightFights} | endClock ${r.endClock}`);
  console.log('battles:');
  for (const x of r.battles) console.log('   ', pad(x.map, 11), pad(x.night ? 'NIGHT' : 'day', 5), pad(x.foes, 30), '->', pad(x.state, 8), 'r' + x.rounds, x.deaths.length ? 'DIED:' + x.deaths.join(',') : '');
  console.log('final party:');
  for (const p of r.party) console.log('   ', pad(p.name, 9), pad(p.cls, 8), 'L' + p.lvl, 'hp', p.hp, 'tiers', JSON.stringify(p.tiers), p.dead ? 'DEAD' : '');
}
await writeFile(new URL('./best3-detail.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\nWrote best3-detail.json');
