// The 10-attempt learning arc. Each attempt changes ONE thing based on what
// the previous taught. For each: one detailed "showcase" seed (battle-by-battle)
// plus a 30-seed success/wipe rate so the narrative isn't a lucky fluke.
import { writeFile } from 'node:fs/promises';
import { ensureDb, runAttempt } from './harness.mjs';

await ensureDb();

// ---- reusable member sets --------------------------------------------------
const M = {
  blade_k:  { name: 'Hroth',   race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'padded_jack',  helm: 'leather_cap' },
  warden_v: { name: 'Aldwyn',  race: 'vael',    cls: 'warden', weapon: 'shortsword',  armor: 'padded_jack',  shield: 'buckler' },
  knave_f:  { name: 'Pip',     race: 'fennick', cls: 'knave',  weapon: 'dagger',      armor: 'leather_armor' },
  skald_v:  { name: 'Tamsin',  race: 'vael',    cls: 'skald',  weapon: 'hand_axe',    armor: 'padded_jack',  instrument: 'reed_pipe' },
  hexen_a:  { name: 'Morrigan',race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes' },
  lorist_a: { name: 'Elspeth', race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
  // tuned/tougher line
  blade_k2: { name: 'Hroth',   race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
  warden_k: { name: 'Brand',   race: 'korrun',  cls: 'warden', weapon: 'hand_axe',    armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
  strider_h:{ name: 'Sorrel',  race: 'halfwyld',cls: 'strider',weapon: 'spear',       armor: 'padded_jack',   helm: 'leather_cap' },
};
const noSpells = (m) => ({ ...m, spellTier: 0 });

function build(members, rerolls = 1) { return { rerolls, members }; }

// ---- the 10 attempts -------------------------------------------------------
const ATTEMPTS = [
  { n: 1, title: 'Default party, no spells, no town trips, wandering into night',
    why: 'Reproduce the player\'s experience: take the pre-built party as-is and just walk around.',
    spec: build([M.blade_k, M.warden_v, M.knave_f, M.skald_v, noSpells(M.hexen_a), noSpells(M.lorist_a)]),
    o: { mode: 'remastered', managed: false, townNight: true } },

  { n: 2, title: 'Same party, but fight by DAY (avoid the night gate-wights)',
    why: 'Attempt 1 wiped to night encounters. Lesson: town is far deadlier after dark.',
    spec: build([M.blade_k, M.warden_v, noSpells(M.knave_f), M.skald_v, noSpells(M.hexen_a), noSpells(M.lorist_a)]),
    o: { mode: 'remastered', managed: false, townNight: false } },

  { n: 3, title: 'Buy tier-1 spells for the two casters',
    why: 'Day town is survivable but the Undercroft wipes us — our mages do nothing. Visit the Review Board.',
    spec: build([M.blade_k, M.warden_v, M.knave_f, M.skald_v, M.hexen_a, M.lorist_a]),
    o: { mode: 'remastered', managed: false, townNight: false } },

  { n: 4, title: 'Return to town between fights to heal & recharge SP',
    why: 'Spells help but SP runs dry after two fights and wounds stack. Use the Temple & Spark House.',
    spec: build([M.blade_k, M.warden_v, M.knave_f, M.skald_v, M.hexen_a, M.lorist_a]),
    o: { mode: 'remastered', managed: true, townNight: false } },

  { n: 5, title: 'Roll better stats (reroll until strong)',
    why: 'Front-liners still die to focus fire. Roll for high ST/CN and IQ for the casters.',
    spec: build([M.blade_k, M.warden_v, M.knave_f, M.skald_v, M.hexen_a, M.lorist_a], 60),
    o: { mode: 'remastered', managed: true, townNight: false } },

  { n: 6, title: 'Tougher front line: two Korrun + a Strider, drop the squishy Knave',
    why: 'The Fennick Knave (6 HP) keeps dying in the front three. Swap in a hardier line.',
    spec: build([M.blade_k2, M.warden_k, M.strider_h, M.lorist_a, M.hexen_a, M.skald_v], 60),
    o: { mode: 'remastered', managed: true, townNight: false } },

  { n: 7, title: 'Final tuned build — full smart play (Remastered)',
    why: 'Everything learned, together: tuned line, spells, services, good order.',
    spec: build([M.blade_k2, M.warden_k, M.strider_h, M.lorist_a, M.hexen_a, M.skald_v], 60),
    o: { mode: 'remastered', managed: true, townNight: false } },

  { n: 8, title: 'Tuned build vs town at NIGHT (the original death trap)',
    why: 'Prove the tuned build now survives what destroyed the default party.',
    spec: build([M.blade_k2, M.warden_k, M.strider_h, M.lorist_a, M.hexen_a, M.skald_v], 60),
    o: { mode: 'remastered', managed: true, townNight: true } },

  { n: 9, title: 'Tuned build in LEGACY mode (1985 rules, harder XP, no shared bag)',
    why: 'Confirm the strategy transfers to the unmodified experience.',
    spec: build([M.blade_k2, M.warden_k, M.strider_h, M.lorist_a, M.hexen_a, M.skald_v], 60),
    o: { mode: 'legacy', managed: true, townNight: false } },

  { n: 10, title: 'Tuned build pushes into the Howling Barrow (the OTHER dungeon)',
    why: 'Test whether the Barrow is a viable "first dungeon" at this level. (Spoiler: level up first.)',
    spec: build([M.blade_k2, M.warden_k, M.strider_h, M.lorist_a, M.hexen_a, M.skald_v], 60),
    o: { mode: 'remastered', managed: true, townNight: false, dungeon: 'barrow1' } },
];

const RATE_N = 30;
const pad = (s, n) => String(s).padEnd(n);
const out = [];

for (const a of ATTEMPTS) {
  const showcaseSeed = 4242 + a.n;
  const show = runAttempt(a.spec, { ...a.o, seed: showcaseSeed, dungeon: a.o.dungeon || 'undercroft1' });
  // rate over many seeds for the same config
  let succ = 0, wipe = 0, tw = 0, dw = 0, dth = 0;
  for (let i = 0; i < RATE_N; i++) {
    const l = runAttempt(a.spec, { ...a.o, seed: 7000 + i * 13, dungeon: a.o.dungeon || 'undercroft1' });
    if (l.success) succ++; if (l.wiped) wipe++; tw += l.townWins; dw += l.dungeonWins; dth += l.deaths.length;
  }
  const rate = { successPct: Math.round(100 * succ / RATE_N), wipePct: Math.round(100 * wipe / RATE_N),
    avgTownWins: +(tw / RATE_N).toFixed(1), avgDungeonWins: +(dw / RATE_N).toFixed(1), avgDeaths: +(dth / RATE_N).toFixed(1) };
  out.push({ ...a, showcaseSeed, show, rate });

  console.log(`\n=== ATTEMPT ${a.n}: ${a.title} ===`);
  console.log(`why: ${a.why}`);
  console.log(`config: ${a.o.mode}/${a.o.managed ? 'managed' : 'attrition'}${a.o.townNight ? '/townNIGHT' : ''} dungeon=${a.o.dungeon || 'undercroft1'}`);
  console.log(`rate over ${RATE_N} seeds: success ${rate.successPct}%  wipe ${rate.wipePct}%  townW ${rate.avgTownWins}  dungW ${rate.avgDungeonWins}  deaths ${rate.avgDeaths}`);
  console.log(`showcase seed ${showcaseSeed}: townWins ${show.townWins} dungeonWins ${show.dungeonWins} success=${show.success} wiped=${show.wiped} deaths=[${show.deaths.join(', ')}]`);
  for (const b of show.battles) {
    console.log(`   ${pad(b.phase, 11)} ${pad(b.foes, 34)} -> ${pad(b.state, 8)} r${b.rounds}${b.deaths.length ? '  DIED: ' + b.deaths.join(',') : ''}`);
  }
}

await writeFile(new URL('./attempts-detail.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\nWrote attempts-detail.json');
