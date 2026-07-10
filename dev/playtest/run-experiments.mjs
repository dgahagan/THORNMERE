// Experiment driver: run each party build across many seeds and both modes,
// in managed (heal/recharge between fights) and attrition ("walk around, no
// town trips") regimes. Prints a comparison table and writes raw JSON.
import { writeFile } from 'node:fs/promises';
import { ensureDb, runAttempt } from './harness.mjs';

await ensureDb();

// ---- party builds ----------------------------------------------------------
// DEFAULT: the in-game Fen-Pact comp & gear, single stat roll, NO spells bought
// (what a new player gets if they don't visit the Review Board).
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

// DEFAULT+SPELLS: same comp/gear/roll but tier-1 spells bought.
const DEFAULT_SPELLS = JSON.parse(JSON.stringify(DEFAULT));
for (const m of DEFAULT_SPELLS.members) delete m.spellTier;

// TUNED: rerolled stats, tougher front line, healer + blaster + skald, spells.
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

const BUILDS = { DEFAULT, DEFAULT_SPELLS, TUNED };

const N = parseInt(process.argv[2] || '40', 10);
const regimes = [
  { mode: 'remastered', managed: true },
  { mode: 'remastered', managed: false },
  { mode: 'legacy',     managed: true },
  { mode: 'legacy',     managed: false },
];

function summarize(logs) {
  const n = logs.length;
  const succ = logs.filter(l => l.success).length;
  const wiped = logs.filter(l => l.wiped).length;
  const avg = (f) => (logs.reduce((a, l) => a + f(l), 0) / n);
  return {
    n,
    successPct: Math.round(100 * succ / n),
    wipePct: Math.round(100 * wiped / n),
    avgTownWins: +avg(l => l.townWins).toFixed(1),
    avgDungeonWins: +avg(l => l.dungeonWins).toFixed(1),
    avgDeaths: +avg(l => l.deaths.length).toFixed(1),
    avgBattles: +avg(l => l.battles.length).toFixed(1),
    avgFinalGold: Math.round(avg(l => l.finalGold)),
  };
}

const all = {};
const pad = (s, n) => String(s).padEnd(n);
console.log(`Seeds per cell: ${N}\n`);
for (const [name, spec] of Object.entries(BUILDS)) {
  all[name] = {};
  console.log(`### ${name}`);
  console.log(pad('regime', 22), pad('succ%', 6), pad('wipe%', 6), pad('twnW', 5), pad('dnW', 5), pad('deaths', 7), pad('batt', 6), 'gold');
  for (const r of regimes) {
    const logs = [];
    for (let i = 0; i < N; i++) {
      logs.push(runAttempt(spec, { ...r, seed: 1000 + i * 7, dungeon: 'undercroft1' }));
    }
    const s = summarize(logs);
    all[name][`${r.mode}/${r.managed ? 'managed' : 'attrition'}`] = s;
    console.log(
      pad(`${r.mode}/${r.managed ? 'managed' : 'attrit'}`, 22),
      pad(s.successPct, 6), pad(s.wipePct, 6), pad(s.avgTownWins, 5),
      pad(s.avgDungeonWins, 5), pad(s.avgDeaths, 7), pad(s.avgBattles, 6), s.avgFinalGold
    );
  }
  console.log();
}

await writeFile(new URL('./results-summary.json', import.meta.url), JSON.stringify(all, null, 2));
console.log('Wrote results-summary.json');
