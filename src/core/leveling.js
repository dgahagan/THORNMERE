// XP tables, Review Board level-ups, spell-tier purchases and class changes.

import { DB } from './db.js';
import { statMod } from './character.js';
import { rollDice } from './rng.js';

// XP needed to go from level L to L+1.  xpMult defaults to 1.0 (Legacy).
export function xpIncrement(classId, level, xpMult = 1.0) {
  const f = DB.cls(classId).xpFactor;
  const l = Math.min(level, 10);
  return Math.round(f * 100 * Math.pow(1.6, l - 1) * xpMult);
}

// Total XP required to BE the given level.
export function xpForLevel(classId, level, xpMult = 1.0) {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpIncrement(classId, l, xpMult);
  return total;
}

export function canLevelUp(ch, xpMult = 1.0) {
  return ch.xp >= xpForLevel(ch.cls, ch.level + 1, xpMult);
}

export function levelUp(rng, ch) {
  const cls = DB.cls(ch.cls);
  ch.level += 1;
  const hpGain = Math.max(1, rollDice(rng, `1d${cls.hpDie}`) + statMod(ch.stats.CN));
  ch.maxHp += hpGain; ch.hp += hpGain;
  let spGain = 0;
  if (cls.spDie) {
    spGain = Math.max(1, rollDice(rng, `1d${cls.spDie}`) + statMod(ch.stats.IQ));
    ch.maxSp += spGain; ch.sp += spGain;
  }
  if (cls.bard) ch.songsLeft = ch.level;
  return { hpGain, spGain };
}

// ---- spells at the Review Board ------------------------------------------
export function maxTierAtLevel(level) { return Math.min(7, Math.floor((level + 1) / 2)); }
export function tierCost(tier) { return tier * tier * 120; }

export function schoolsAvailable(ch) {
  const cls = DB.cls(ch.cls);
  if (!cls.school) return [];
  return cls.school === 'all' ? ['hexen', 'lorist', 'storm'] : [cls.school];
}

export function nextTierFor(ch, school) {
  const cur = ch.schoolTiers[school] || 0;
  if (cur >= 7) return null;
  return cur + 1;
}

export function canBuyTier(ch, school, gold) {
  const tier = nextTierFor(ch, school);
  if (tier == null) return { ok: false, why: 'All seven tiers are known.' };
  if (!schoolsAvailable(ch).includes(school)) return { ok: false, why: 'Not your school.' };
  if (maxTierAtLevel(ch.level) < tier) return { ok: false, why: `Requires level ${tier * 2 - 1}.` };
  if (gold < tierCost(tier)) return { ok: false, why: `Costs ${tierCost(tier)} gold.` };
  return { ok: true, tier, cost: tierCost(tier) };
}

export function buyTier(ch, school) {
  const tier = nextTierFor(ch, school);
  ch.schoolTiers[school] = tier;
  for (const sp of DB.spellsFor(school, tier)) {
    if (!ch.knownSpells.includes(sp.code)) ch.knownSpells.push(sp.code);
  }
  return tier;
}

// New recruits open their school's first tier free — BT1 casters knew their
// level-1 spells from the muster; the Review Board sells the upgrades.
export function grantStartingSpells(ch) {
  const cls = DB.cls(ch.cls);
  if (!cls.school || cls.school === 'all') return false;
  if ((ch.schoolTiers[cls.school] || 0) >= 1) return false;
  buyTier(ch, cls.school);
  return true;
}

// ---- class change ---------------------------------------------------------
export function classChangeOptions(ch) {
  const out = [];
  for (const cls of DB.classes) {
    if (cls.id === ch.cls || !cls.changeRequires) continue;
    const req = cls.changeRequires;
    let ok = false;
    if (req.anySchoolTier) {
      ok = req.schools.some(s => (ch.schoolTiers[s] || 0) >= req.anySchoolTier);
    } else if (req.twoSchoolsTier) {
      const n = ['hexen', 'lorist', 'storm']
        .filter(s => (ch.schoolTiers[s] || 0) >= req.twoSchoolsTier).length;
      ok = n >= 2;
    }
    out.push({ cls, ok });
  }
  return out;
}

// Class change: back to level 1 and zero XP, but learned spells, HP and SP
// are kept — the long road of the multi-school mage.
export function changeClass(ch, newClassId) {
  const cls = DB.cls(newClassId);
  ch.cls = newClassId;
  ch.level = 1;
  ch.xp = 0;
  ch.classHistory.push(newClassId);
  if (cls.school && cls.school !== 'all' && ch.schoolTiers[cls.school] == null) {
    ch.schoolTiers[cls.school] = 0;
  }
  if (cls.bard) ch.songsLeft = 1;
}
