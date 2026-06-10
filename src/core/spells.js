// Exploration-mode spellcasting. Combat-mode resolution lives in combat.js
// (it needs combat state); both share the helpers here.

import { DB } from './db.js';
import { rollDice } from './rng.js';
import { addEffect, removeEffect, hasEffect } from './effects.js';
import {
  currentMap, inZone, partySlotsFree, realParty
} from './gamestate.js';
import { zapTrapAhead } from './maze.js';
import { healChar, isAlive } from './character.js';

let summonCounter = 1;

export function makeSummon(rng, monsterId, illusion) {
  const def = DB.monster(monsterId);
  const hp = Math.max(1, rollDice(rng, def.hp));
  return {
    id: 'sum' + (summonCounter++),
    summon: true, illusion: !!illusion,
    monsterId, name: def.name,
    hp, maxHp: hp,
    status: {}
  };
}

export function knowsSpell(ch, code) { return ch.knownSpells.includes(code); }

export function canCastNow(game, ch, spell, { combat = false } = {}) {
  if (!knowsSpell(ch, spell.code)) return 'You do not know that spell.';
  if (combat && !spell.combat) return 'That spell has no place in battle.';
  if (!combat && !spell.explore) return 'That spell is only for battle.';
  if (ch.sp < spell.sp) return 'Not enough spell points.';
  return null;
}

// Spend SP; in an anti-magic zone the spell fizzles (SP still spent).
export function paySpell(game, ch, spell) {
  ch.sp -= spell.sp;
  if (inZone(game, 'antimagic')) return false;
  return true;
}

export function durationOf(eff, casterLevel) {
  return (eff.duration || 0) + casterLevel * 10;
}

// Cast an exploration spell. target: character object for ally-target spells.
// Returns events list.
export function castExplore(game, rng, ch, spell, target = null) {
  const events = [];
  const err = canCastNow(game, ch, spell, { combat: false });
  if (err) return [{ type: 'msg', text: err }];
  if (!paySpell(game, ch, spell)) {
    return [{ type: 'msg', text: `${ch.name} casts ${spell.name}... and the dead air swallows it. Fizzle!` }];
  }
  const eff = spell.effect;
  const until = game.clock + durationOf(eff, ch.level);
  const say = (text) => events.push({ type: 'msg', text });
  say(`${ch.name} casts ${spell.name} (${spell.code}).`);

  switch (eff.kind) {
    case 'light':
      addEffect(game, { kind: 'light', radius: eff.radius, until });
      say('A clean light spreads around the party.');
      break;
    case 'shield':
      addEffect(game, { kind: 'shield', ac: eff.ac, until });
      say('The air hardens about you like held breath.');
      break;
    case 'levitate':
      addEffect(game, { kind: 'levitate', until });
      say('The party rises a hand’s width off the stone.');
      break;
    case 'compass':
      addEffect(game, { kind: 'compass', until });
      say('A pale needle hangs in the air, pointing true.');
      break;
    case 'secrets':
      addEffect(game, { kind: 'secrets', until });
      say('Seams and hinges glow in walls that claimed to have neither.');
      break;
    case 'trueseeing':
      addEffect(game, { kind: 'trueseeing', until });
      if (eff.secrets) addEffect(game, { kind: 'secrets', until });
      say('Your eyes are unclouded. Nothing false can stand before you.');
      break;
    case 'phase':
      addEffect(game, { kind: 'phase', until: game.clock + 2 });
      say('The wall ahead forgets itself. Walk now.');
      break;
    case 'trapzap':
      say(zapTrapAhead(game) ? 'Something ahead snaps, sparks, and dies. The way is safe.'
        : 'The way ahead held no trap to slay.');
      break;
    case 'recall': {
      const t = DB.map('town');
      game.pos = { map: 'town', x: t.entry.x, y: t.entry.y, facing: t.entry.facing };
      game.song = null;
      events.push({ type: 'mapchange' });
      say('The world folds like a closing book — you stand before the Adventurers’ Hall.');
      break;
    }
    case 'heal': {
      const targets = spell.target === 'party' ? realParty(game) : [target || ch];
      for (const t of targets) {
        if (!isAlive(t)) continue;
        const amt = eff.full ? t.maxHp : rollDice(rng, eff.dice);
        const healed = healChar(t, amt);
        if (healed > 0) say(`${t.name} is healed ${healed}.`);
        for (const flag of eff.cure || []) if (t.status[flag]) { delete t.status[flag]; say(`${t.name} is cured of ${flag}.`); }
      }
      break;
    }
    case 'cure': {
      const t = target || ch;
      for (const flag of eff.flags) if (t.status[flag]) { delete t.status[flag]; say(`${t.name} is cured of ${flag}.`); }
      break;
    }
    case 'resurrect': {
      const t = target;
      if (!t || !t.status.dead) { say('They are not dead.'); break; }
      delete t.status.dead; t.hp = 1;
      say(`${t.name} draws a long, surprised breath.`);
      break;
    }
    case 'summon': {
      if (partySlotsFree(game) <= 0) { say('There is no room in the marching order.'); break; }
      const s = makeSummon(rng, eff.monster, eff.illusion);
      game.summons.push(s);
      say(`${s.name} takes its place in the marching order.`);
      break;
    }
    default:
      say('Nothing happens. (Unhandled effect: ' + eff.kind + ')');
  }
  return events;
}
