import { ensureDb, runAttempt } from './harness-v2.mjs';
await ensureDb();

const TUNED = {
  rerolls: 60,
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

const r = runAttempt(TUNED, { mode: 'remastered', seed: 12345 });
console.log('success:', r.success, 'wiped:', r.wiped, 'townWins:', r.townWins, 'dungeonWins:', r.dungeonWins);
console.log('startGold:', r.startGold, 'finalGold:', r.finalGold, 'endClock:', r.endClock);
console.log('muster spend:', r.muster);
console.log('gold spent:', r.gold);
console.log('battles:', r.battles.length, '| townDay:', r.townDayFights, 'townNight:', r.townNightFights);
console.log('deaths:', r.deaths.length, 'permaDeaths:', r.permaDeaths.length, 'resurrections:', r.resurrections);
console.log('levelUps:', r.levelUps, 'chests:', r.chestsOpened, 'trapsSprung:', r.trapsSprung);
console.log('retreats:', r.retreats, 'townTrips:', r.townTrips, 'waitSteps:', r.waitSteps, 'waitedIntoNight:', r.waitedIntoNight);
console.log('travelStepsTown:', r.travelStepsTown, 'travelStepsDungeon:', r.travelStepsDungeon, 'travelFights:', r.travelFights);
console.log('fled:', r.fledCount, 'brokeEvents:', r.brokeEvents);
console.log('\nparty:');
for (const p of r.party) console.log('  ', p.name.padEnd(9), p.cls.padEnd(8), 'L'+p.lvl, 'hp', p.hp, 'sp', p.sp, 'tiers', JSON.stringify(p.tiers), p.dead?'DEAD':'');
console.log('\ngold timeline:', r.goldTimeline.map(t => `${t.at}:${t.gold}`).join('  '));
