// Smoke test: load DB, build a party, run one managed attempt, print summary.
import { ensureDb, runAttempt } from './harness.mjs';

await ensureDb();

// Candidate "smart" party: 3 melee front, lorist healer, hexen blaster, skald.
const spec = {
  rerolls: 60,
  members: [
    { name: 'Hroth',    race: 'korrun',  cls: 'blade',  weapon: 'broadsword', armor: 'padded_jack', helm: 'leather_cap' },
    { name: 'Brand',    race: 'korrun',  cls: 'warden', weapon: 'hand_axe',   armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
    { name: 'Sorrel',   race: 'halfwyld',cls: 'strider',weapon: 'spear',      armor: 'padded_jack', helm: 'leather_cap' },
    { name: 'Elspeth',  race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Morrigan', race: 'aldari',  cls: 'hexen',  weapon: 'quarterstaff', armor: 'robes' },
    { name: 'Tamsin',   race: 'vael',    cls: 'skald',  weapon: 'shortsword', armor: 'padded_jack', instrument: 'reed_pipe' },
  ],
};

const log = runAttempt(spec, { mode: 'remastered', managed: true, seed: 12345, dungeon: 'undercroft1' });
console.log('mode:', log.mode, 'managed:', log.managed);
console.log('townWins:', log.townWins, 'dungeonWins:', log.dungeonWins, 'success:', log.success, 'wiped:', log.wiped);
console.log('battles fought:', log.battles.length, 'deaths:', log.deaths.length, 'finalGold:', log.finalGold);
console.log('goldSpent:', log.goldSpent);
console.log('party:');
for (const p of log.party) console.log('  ', p.name.padEnd(9), p.cls.padEnd(8), 'L'+p.lvl, 'hp', p.hp, 'sp', p.sp, 'ac', p.ac, p.dead?'DEAD':'');
console.log('\nfirst 6 battles:');
for (const b of log.battles.slice(0, 6)) console.log('  ', b.phase, b.foes, '->', b.state, 'r'+b.rounds, b.deaths.length?('deaths:'+b.deaths.join(',')):'');
