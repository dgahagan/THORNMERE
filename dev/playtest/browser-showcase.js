// Browser showcase driver (reference copy of what was injected live).
//
// Paste/evaluate this in the game's page console (with ?debug so window.__thorn
// exists) AFTER starting a New Game and picking a mode. It installs window.__SHOW
// with an honest-economy party builder, an encounter drawer from the real tables,
// a paid recovery routine (visible gold drop), and a menu-driven combat driver
// that plays real UI battles by dispatching keystrokes.
//
// Usage in the console (mode chosen via the New Game menu first):
//   await (async () => {                       // install
//     /* paste the IIFE below, then: */
//   })();
//   __SHOW.injectParty(9085);                  // honest-gold tuned party
//   await __SHOW.playPhase('town', 5, {flush:true});
//   __SHOW.recover();
//   __thorn.travel({map:'undercroft1', x:2, y:2, facing:1});
//   await __SHOW.playPhase('undercroft1', 5, {flush:true});
//
// flush:false = watch narration play; flush:true = skip narration (fast).
// Harness-v2 (Node) is authoritative for statistics; this is the watchable demo.

await (async () => {
  const base = location.origin + '/src/core/';
  const [char, lev, rngM, svc, dbM] = await Promise.all([
    import(base + 'character.js'), import(base + 'leveling.js'), import(base + 'rng.js'),
    import(base + 'services.js'), import(base + 'db.js')
  ]);
  const DB = dbM.DB;
  const ARCH = { blade: 'warrior', warden: 'warrior', strider: 'rogue', lorist: 'caster', hexen: 'caster', skald: 'skald' };
  const TUNED = {
    rerolls: 60, musterReserve: 160,
    members: [
      { name: 'Hroth', race: 'korrun', cls: 'blade', weapon: 'broadsword', armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
      { name: 'Brand', race: 'korrun', cls: 'warden', weapon: 'hand_axe', armor: 'leather_armor', shield: 'buckler', helm: 'leather_cap' },
      { name: 'Sorrel', race: 'halfwyld', cls: 'strider', weapon: 'spear', armor: 'padded_jack', helm: 'leather_cap' },
      { name: 'Elspeth', race: 'aldari', cls: 'lorist', weapon: 'quarterstaff', armor: 'robes' },
      { name: 'Morrigan', race: 'aldari', cls: 'hexen', weapon: 'quarterstaff', armor: 'robes' },
      { name: 'Tamsin', race: 'vael', cls: 'skald', weapon: 'shortsword', armor: 'padded_jack', instrument: 'reed_pipe' },
    ],
    potions: [{ id: 'healing_draught', count: 2 }, { id: 'antidote', count: 1 }],
  };
  const g = () => window.__thorn.game;
  const score = (cls, st) => st[cls.primeStat] * 3 + st.CN * 2 + st.LK + (cls.spDie ? st.IQ * 1.5 : 0) + (!cls.school ? st.ST + st.DX : 0);

  function buildParty(game, rng, spec) {
    const reserve = spec.musterReserve ?? 150, muster = { purse: 0, gear: 0, spells: 0, potions: 0 }, chars = [];
    for (const m of spec.members) {
      const cls = DB.cls(m.cls); let best = null, bs = -1;
      for (let i = 0; i < (spec.rerolls ?? 1); i++) { const st = char.rollStats(rng, m.race); const s = score(cls, st); if (s > bs) { bs = s; best = st; } }
      const ch = char.createCharacter(rng, { name: m.name, raceId: m.race, classId: m.cls, stats: best });
      ch.portrait = `pc_${m.race}_${ARCH[m.cls]}_a`;
      char.addToInventory(ch, 'torch');
      const p = 90 + rng.range(0, 60); game.gold += p; muster.purse += p;
      game.roster.push(ch); svc.addToParty(game, ch.id); chars.push([ch, m]);
    }
    const buyGear = (ch, m, slot, floor) => { if (!m[slot]) return; const price = DB.item(m[slot]).price || 0; if (game.gold - price < floor) return; game.gold -= price; muster.gear += price; const i = ch.inventory.length; if (char.addToInventory(ch, m[slot])) char.equipItem(ch, i); };
    for (const [ch, m] of chars) for (const s of ['weapon', 'armor', 'instrument']) buyGear(ch, m, s, 0);
    for (const [ch] of chars) { const sc = DB.cls(ch.cls).school; if (sc && sc !== 'all') { let t; while ((t = lev.nextTierFor(ch, sc)) != null && t <= 1 && lev.maxTierAtLevel(ch.level) >= t && game.gold >= lev.tierCost(t)) { game.gold -= lev.tierCost(t); muster.spells += lev.tierCost(t); lev.buyTier(ch, sc); } } }
    for (const [ch, m] of chars) for (const s of ['shield', 'helm', 'gauntlets']) buyGear(ch, m, s, reserve);
    for (const pc of spec.potions || []) for (let i = 0; i < (pc.count || 1); i++) { const price = DB.item(pc.id).price || 0; if (game.gold - price < reserve) break; const h = game.roster.find(c => game.partyIds.includes(c.id) && c.inventory.length < 8); if (h && char.addToInventory(h, pc.id, true)) { game.gold -= price; muster.potions += price; } }
    return muster;
  }

  const S = window.__SHOW = {};
  S._m = { char, lev, svc, DB, Rng: rngM.Rng, rollDice: rngM.rollDice };
  S.lrng = new rngM.Rng(0xBEEF);
  S.dispatch = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  S.menu = () => document.getElementById('menu').innerText;
  S.sleep = (ms) => new Promise(r => setTimeout(r, ms));
  S.setClock = (t) => { g().clock = t; window.__thorn.render(); return g().clock; };

  S.injectParty = (seed) => {
    const G = g(); const m = buildParty(G, new rngM.Rng(seed >>> 0), TUNED); window.__thorn.render();
    return { startGold: G.gold, muster: m, party: G.partyIds.map(id => { const c = G.roster.find(x => x.id === id); return `${c.name} ${DB.cls(c.cls).name} L${c.level} HP${c.hp} ${c.knownSpells.join('/') || '-'}`; }) };
  };

  S.drawEncounter = (mapId, night = false) => {
    const map = DB.map(mapId); let enc = map.encounters; if (map.kind === 'town') enc = night ? enc.night : enc.day;
    const n = Math.min(4, S._m.rollDice(S.lrng, enc.groups)); const tot = enc.table.reduce((a, t) => a + t.weight, 0); const groups = [];
    for (let i = 0; i < n; i++) { let w = S.lrng.int(tot), row = enc.table[0]; for (const r of enc.table) { if (w < r.weight) { row = r; break; } w -= r.weight; } groups.push({ monster: row.monster, count: S._m.rollDice(S.lrng, DB.monster(row.monster).group) }); }
    return { groups };
  };

  S.recover = () => {
    const G = g(), party = G.partyIds.map(id => G.roster.find(c => c.id === id)), mult = G.settings?.reducedXp ? 0.6 : 1.0, spent = { temple: 0, spark: 0, res: 0, upgrades: 0, levels: 0 };
    for (const ch of party) while (lev.canLevelUp(ch, mult)) { lev.levelUp(S.lrng, ch); spent.levels++; }
    for (const ch of party) if (ch.status.dead) { const c = svc.templePrices(ch).resurrect; if (G.gold >= c) { const b = G.gold; svc.templeService(G, ch, 'resurrect'); spent.res += b - G.gold; } }
    for (const ch of party) for (const f of ['poison', 'fear']) if (ch.status[f]) { const b = G.gold; svc.templeService(G, ch, f); spent.temple += b - G.gold; }
    for (const ch of party) if (char.isAlive(ch) && ch.hp < ch.maxHp) { const c = svc.templePrices(ch).heal; if (G.gold >= c) { const b = G.gold; svc.templeService(G, ch, 'heal'); spent.temple += b - G.gold; } }
    for (const ch of party) if (ch.maxSp > 0 && char.isAlive(ch) && ch.sp < ch.maxSp) { const c = svc.sparkCost(ch); if (G.gold - c >= 20) { const b = G.gold; svc.sparkRecharge(G, ch); spent.spark += b - G.gold; } }
    const reserve = 200 + Math.max(...party.map(c => c.level)) * 50;
    for (const ch of party) { const sc = DB.cls(ch.cls).school; if (!sc || sc === 'all') continue; const t = lev.nextTierFor(ch, sc); if (t != null && lev.maxTierAtLevel(ch.level) >= t && G.gold - lev.tierCost(t) >= reserve) { const b = G.gold; lev.buyTier(ch, sc); G.gold -= lev.tierCost(t); spent.upgrades += b - G.gold; } }
    window.__thorn.render(); return { gold: G.gold, spent, levels: party.map(c => c.level) };
  };

  S.ready = () => { const G = g(), party = G.partyIds.map(id => G.roster.find(c => c.id === id)); return !party.some(c => c.status.dead) && party.filter(c => char.isAlive(c)).every(c => c.hp >= c.maxHp * 0.7) && !party.some(c => char.isAlive(c) && c.status.poison); };

  S.doOrders = async (name) => {
    const G = g(); const m = S.menu(); const ch = G.roster.find(c => c.name === name);
    const groups = [...m.matchAll(/(\d+)\)\s+\d+\s+.*?\((\d+)'\)/g)].map(x => ({ idx: +x[1], dist: +x[2] }));
    const nearest = groups.slice().sort((a, b) => a.dist - b.dist)[0] || { idx: 1, dist: 10 };
    const pickGroup = async () => { await S.sleep(35); if (/which group/i.test(S.menu())) S.dispatch(String(nearest.idx)); };
    const cls = ch.cls;
    if (cls === 'skald' && ch.songsLeft > 0 && groups.length >= 1) { S.dispatch('s'); await S.sleep(40); S.dispatch('6'); await S.sleep(30); return; }
    if ((cls === 'hexen' || cls === 'lorist') && ch.sp >= 1 && nearest.dist <= 30) { S.dispatch('c'); await S.sleep(40); S.dispatch('1'); await pickGroup(); return; }
    if (nearest.dist <= 10) { S.dispatch('a'); await pickGroup(); return; }
    S.dispatch('v'); // close the distance
  };

  S.playBattle = async ({ flush = false, maxRounds = 60 } = {}) => {
    let guard = 0;
    for (let i = 0; i < 40 && !/orders for/.test(S.menu()); i++) { if (/BATTLE/.test(S.menu())) S.dispatch(' '); await S.sleep(60); }
    while (guard++ < maxRounds * 8) {
      await S.sleep(flush ? 40 : 90);
      const m = S.menu();
      if (/\bVICTORY\b/.test((m.split('\n')[0] || ''))) {
        S.dispatch(' '); await S.sleep(150);
        if (/banded chest/i.test(S.menu())) { S.dispatch('o'); await S.sleep(80); S.dispatch('1'); await S.sleep(250); S.dispatch(' '); await S.sleep(120); }
        return 'victory';
      }
      if (/FEN HAS WON/i.test(m)) return 'defeat';
      const turn = m.match(/orders for (\w+)/);
      if (turn) { await S.doOrders(turn[1]); continue; }
      if (!m.trim() && flush) S.dispatch(' ');
    }
    return 'timeout';
  };

  S.playPhase = async (mapId, needWins, { flush = true, night = false, recoverFirst = true } = {}) => {
    const log = []; let wins = 0, guard = 0;
    if (recoverFirst) S.recover();
    while (wins < needWins && guard++ < 60) {
      if (!S.ready()) S.recover();
      const G = g(); if (!G.partyIds.map(id => G.roster.find(c => c.id === id)).some(c => char.isAlive(c))) { log.push({ fatal: true }); break; }
      const spec = S.drawEncounter(mapId, night);
      window.__thorn.startCombat(spec);
      const res = await S.playBattle({ flush });
      log.push({ foes: spec.groups.map(x => x.count + 'x' + x.monster).join('+'), res });
      if (res === 'victory') wins++;
      if (res === 'defeat') break;
    }
    return { wins, log, gold: g().gold };
  };

  return 'installed __SHOW';
})();
