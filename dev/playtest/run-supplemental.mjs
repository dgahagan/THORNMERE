// Supplemental: town-at-NIGHT survivability, and the Howling Barrow as an
// alternate "first dungeon". Same builds as the main experiment.
import { ensureDb, runAttempt } from './harness.mjs';
import { readFile } from 'node:fs/promises';

await ensureDb();

const DEFAULT = {
  rerolls: 1,
  members: [
    { name: 'Hroth',    race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'padded_jack',  helm: 'leather_cap' },
    { name: 'Aldwyn',   race: 'vael',    cls: 'warden', weapon: 'shortsword',  armor: 'padded_jack',  shield: 'buckler' },
    { name: 'Pip',      race: 'fennick', cls: 'knave',  weapon: 'dagger',      armor: 'leather_armor' },
    { name: 'Tamsin',   race: 'vael',    cls: 'skald',  weapon: 'hand_axe',    armor: 'padded_jack',  instrument: 'reed_pipe' },
    { name: 'Morrigan', race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes', spellTier: 0 },
    { name: 'Elspeth',  race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes', spellTier: 0 },
  ]
};
const TUNED = {
  rerolls: 60,
  members: [
    { name: 'Hroth',   race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
    { name: 'Brand',   race: 'korrun',  cls: 'warden', weapon: 'hand_axe',    armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
    { name: 'Sorrel',  race: 'halfwyld',cls: 'strider',weapon: 'spear',       armor: 'padded_jack',   helm: 'leather_cap' },
    { name: 'Elspeth', race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Morrigan',race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Tamsin',  race: 'vael',    cls: 'skald',  weapon: 'shortsword',  armor: 'padded_jack', instrument: 'reed_pipe' },
  ]
};

const N = parseInt(process.argv[2] || '40', 10);
const pad = (s, n) => String(s).padEnd(n);

function summarize(logs) {
  const n = logs.length;
  const avg = (f) => logs.reduce((a, l) => a + f(l), 0) / n;
  return {
    successPct: Math.round(100 * logs.filter(l => l.success).length / n),
    wipePct: Math.round(100 * logs.filter(l => l.wiped).length / n),
    avgTownWins: +avg(l => l.townWins).toFixed(1),
    avgDungeonWins: +avg(l => l.dungeonWins).toFixed(1),
    avgDeaths: +avg(l => l.deaths.length).toFixed(1),
  };
}

const cases = [
  { tag: 'TOWN-NIGHT default/managed',  spec: DEFAULT, o: { mode: 'remastered', managed: true,  townNight: true } },
  { tag: 'TOWN-NIGHT default/attrit',   spec: DEFAULT, o: { mode: 'remastered', managed: false, townNight: true } },
  { tag: 'TOWN-NIGHT tuned/managed',    spec: TUNED,   o: { mode: 'remastered', managed: true,  townNight: true } },
  { tag: 'TOWN-NIGHT tuned/attrit',     spec: TUNED,   o: { mode: 'remastered', managed: false, townNight: true } },
  { tag: 'BARROW default/managed',      spec: DEFAULT, o: { mode: 'remastered', managed: true,  dungeon: 'barrow1' } },
  { tag: 'BARROW tuned/managed',        spec: TUNED,   o: { mode: 'remastered', managed: true,  dungeon: 'barrow1' } },
  { tag: 'BARROW tuned/legacy-managed', spec: TUNED,   o: { mode: 'legacy',     managed: true,  dungeon: 'barrow1' } },
];

console.log(`Seeds per cell: ${N}\n`);
console.log(pad('case', 30), pad('succ%', 6), pad('wipe%', 6), pad('twnW', 5), pad('dnW', 5), 'deaths');
for (const c of cases) {
  const logs = [];
  for (let i = 0; i < N; i++) logs.push(runAttempt(c.spec, { ...c.o, seed: 2000 + i * 7 }));
  const s = summarize(logs);
  console.log(pad(c.tag, 30), pad(s.successPct, 6), pad(s.wipePct, 6), pad(s.avgTownWins, 5), pad(s.avgDungeonWins, 5), s.avgDeaths);
}
