// v2 experiments on the realistic harness. Aggregate table for DEFAULT /
// DEFAULT+spells / TUNED across both modes, then the 10 Remastered + 10 Legacy
// TUNED runs individually, ranked, so we can pick the best 3 for the browser.
import { writeFile } from 'node:fs/promises';
import { ensureDb, runAttempt } from './harness-v2.mjs';

await ensureDb();

const DEFAULT = {
  prebuilt: true, rerolls: 1,
  members: [
    { name: 'Hroth',    race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'padded_jack',  helm: 'leather_cap' },
    { name: 'Aldwyn',   race: 'vael',    cls: 'warden', weapon: 'shortsword',  armor: 'padded_jack',  shield: 'buckler' },
    { name: 'Pip',      race: 'fennick', cls: 'knave',  weapon: 'dagger',      armor: 'leather_armor' },
    { name: 'Tamsin',   race: 'vael',    cls: 'skald',  weapon: 'hand_axe',    armor: 'padded_jack',  instrument: 'reed_pipe' },
    { name: 'Morrigan', race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Elspeth',  race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
  ]
};
const DEFAULT_SPELLS = { ...DEFAULT, prebuiltBuySpells: true };

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

const N = parseInt(process.argv[2] || '30', 10);
const pad = (s, n) => String(s).padEnd(n);

function summarize(logs) {
  const n = logs.length, avg = (f) => logs.reduce((a, l) => a + f(l), 0) / n;
  return {
    n,
    successPct: Math.round(100 * logs.filter(l => l.success).length / n),
    wipePct: Math.round(100 * logs.filter(l => l.wiped).length / n),
    stuckPct: Math.round(100 * logs.filter(l => l.stuck).length / n),
    avgTownWins: +avg(l => l.townWins).toFixed(1),
    avgDungeonWins: +avg(l => l.dungeonWins).toFixed(1),
    avgDeaths: +avg(l => l.deaths.length).toFixed(1),
    avgPerma: +avg(l => l.permaDeaths.length).toFixed(1),
    avgFinalGold: Math.round(avg(l => l.finalGold)),
    avgTownNightFights: +avg(l => l.townNightFights).toFixed(1),
    avgTownDayFights: +avg(l => l.townDayFights).toFixed(1),
    avgRetreats: +avg(l => l.retreats).toFixed(1),
    avgTrapsSprung: +avg(l => l.trapsSprung).toFixed(1),
  };
}

const BUILDS = { DEFAULT, DEFAULT_SPELLS, TUNED };
const out = { N, aggregate: {}, tunedRuns: { remastered: [], legacy: [] } };

console.log(`Seeds per cell: ${N}\n`);
for (const [name, spec] of Object.entries(BUILDS)) {
  out.aggregate[name] = {};
  console.log(`### ${name}`);
  console.log(pad('mode', 12), pad('succ%', 6), pad('wipe%', 6), pad('stuck%', 7), pad('twnW', 5), pad('dnW', 5), pad('deaths', 7), pad('perma', 6), pad('night', 6), pad('day', 5), pad('retr', 5), 'gold');
  for (const mode of ['remastered', 'legacy']) {
    const logs = [];
    for (let i = 0; i < N; i++) logs.push(runAttempt(spec, { mode, seed: 5000 + i * 11 }));
    const s = summarize(logs);
    out.aggregate[name][mode] = s;
    console.log(pad(mode, 12), pad(s.successPct, 6), pad(s.wipePct, 6), pad(s.stuckPct, 7), pad(s.avgTownWins, 5), pad(s.avgDungeonWins, 5), pad(s.avgDeaths, 7), pad(s.avgPerma, 6), pad(s.avgTownNightFights, 6), pad(s.avgTownDayFights, 5), pad(s.avgRetreats, 5), s.avgFinalGold);
  }
  console.log();
}

// ---- 10 TUNED runs per mode, ranked, to pick the browser showcase set ----
const rank = (l) => (l.success ? 1e6 : 0) - l.permaDeaths.length * 1000 - l.deaths.length * 100 + l.finalGold + l.dungeonWins * 50 + l.townWins * 20;
for (const mode of ['remastered', 'legacy']) {
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(runAttempt(TUNED, { mode, seed: 9000 + i * 17 }));
  runs.forEach(r => { r._score = rank(r); r._seed = r.seed; });
  runs.sort((a, b) => b._score - a._score);
  out.tunedRuns[mode] = runs.map(r => ({
    seed: r.seed, score: Math.round(r._score), success: r.success, wiped: r.wiped, stuck: r.stuck,
    townWins: r.townWins, dungeonWins: r.dungeonWins, deaths: r.deaths.length, perma: r.permaDeaths.length,
    finalGold: r.finalGold, startGold: r.startGold, levelUps: r.levelUps, retreats: r.retreats,
    townDay: r.townDayFights, townNight: r.townNightFights, trapsSprung: r.trapsSprung, chests: r.chestsOpened,
    gold: r.gold, endClock: r.endClock,
  }));
  console.log(`### TUNED ${mode} — 10 runs ranked (for best-3 browser pick)`);
  console.log(pad('seed', 7), pad('succ', 5), pad('twn', 4), pad('dng', 4), pad('deaths', 7), pad('perma', 6), pad('gold', 5), pad('lvUp', 5), pad('retr', 5), 'score');
  for (const r of out.tunedRuns[mode]) {
    console.log(pad(r.seed, 7), pad(r.success ? 'YES' : (r.wiped ? 'wipe' : r.stuck ? 'stuck' : 'no'), 5), pad(r.townWins, 4), pad(r.dungeonWins, 4), pad(r.deaths, 7), pad(r.perma, 6), pad(r.finalGold, 5), pad(r.levelUps, 5), pad(r.retreats, 5), r.score);
  }
  console.log();
}

const best3 = [...out.tunedRuns.remastered, ...out.tunedRuns.legacy]
  .map((r, i) => ({ ...r, mode: i < 10 ? 'remastered' : 'legacy' }))
  .filter(r => r.success).sort((a, b) => b.score - a.score).slice(0, 3);
out.best3 = best3;
console.log('### BEST 3 (across both modes) for the browser showcase:');
for (const r of best3) console.log(`  ${r.mode} seed ${r.seed}: ${r.townWins}T/${r.dungeonWins}D, deaths ${r.deaths} (perma ${r.perma}), gold ${r.finalGold}, score ${r.score}`);

await writeFile(new URL('./results-v2.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\nWrote results-v2.json');
