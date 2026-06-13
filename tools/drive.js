// Playwright-based UI driver for manual verification scenarios.
// Uses the playwright bundled inside the globally installed @playwright/mcp.
// Usage: node tools/drive.js <scenario> [--show]
// Scenarios: combat, shop, riddle, boss, victory

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const globalRoot = execSync('npm root -g').toString().trim();
const require2 = createRequire(globalRoot + '/@playwright/mcp/node_modules/');
const { chromium } = require2('playwright');

const BASE = 'http://127.0.0.1:8377';
const scenario = process.argv[2] || 'combat';
const show = process.argv.includes('--show');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({
    headless: !show,
    channel: undefined,
    args: ['--no-sandbox']
  }).catch(async () =>
    chromium.launch({ headless: !show, channel: 'chrome', args: ['--no-sandbox'] }));
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.on('console', m => { if (/error/i.test(m.type())) console.log('PAGE-ERR:', m.text()); });
  page.on('pageerror', e => console.log('PAGE-EXCEPTION:', e.message));

  await page.goto(`${BASE}/?seed=7&debug=1`);
  await page.waitForFunction(() => /New game/.test(document.getElementById('menu')?.textContent || ''));

  const menu = () => page.evaluate(() => document.getElementById('menu').textContent || '');
  const logTail = (n = 600) => page.evaluate((n) => (document.getElementById('log').textContent || '').slice(-n), n);
  const status = () => page.evaluate(() => document.getElementById('status').textContent || '');
  const key = async (k, ms = 60) => { await page.keyboard.press(k); await sleep(ms); };
  const type = async (s) => { for (const c of s) await key(c, 15); await key('Enter'); };
  const shot = (name) => page.screenshot({ path: `/tmp/thorn_${name}.png` });
  const waitMenu = (re, t = 10000) => page.waitForFunction(
    (src) => new RegExp(src).test(document.getElementById('menu').textContent || ''),
    re.source, { timeout: t });

  const newPartyAtHall = async () => {
    await key('n');
    await waitMenu(/experience/i);   // new-game now opens the Remastered/Legacy/Custom chooser
    await key('r');                  // Remastered, then walk into the Hall
    await key('ArrowUp');
    await waitMenu(/Adventurers' Hall/);
    const create = async (name, race, cls) => {
      await key('c'); await type(name); await key(race); await key(cls);
      await key('a');   // accept stats
      await key('a');   // accept the offered face (portrait)
    };
    await create('Hroth', '2', '1');
    await create('Brenna', '1', '1');
    await create('Aldwyn', '1', '2');
    await create('Tamsin', '3', '6');
    await create('Morrigan', '4', '7');
    await create('Elspeth', '4', '8');
    await key('s');
    await key('l');
  };

  // resolve a whole combat by mashing attack; handles group pick + narration
  const autoCombat = async (maxIters = 400) => {
    for (let i = 0; i < maxIters; i++) {
      const m = await menu();
      if (i % 60 === 59) console.log(`  …iter ${i}: menu="${m.slice(0, 90).replace(/\n/g, '|')}" log="${(await logTail(90)).replace(/\n/g, '|')}"`);
      if (/BATTLE!/.test(m)) { await key(' '); continue; }
      if (/orders for/.test(m)) { await key('a'); continue; }
      if (/which group/i.test(m)) { await key((m.match(/\((\d)\)/) || [, '1'])[1]); continue; }
      if (/banded chest/i.test(m)) { await key('o'); await sleep(80); await key('1'); continue; }
      if (/Who lifts the lid/i.test(m)) { await key('1'); continue; }
      if (/THE FEN HAS WON/.test(m)) return 'defeat';
      if (m.trim() === '') { // maybe narration: flush with a neutral key
        await page.keyboard.press('Shift');
        await sleep(60);
        const m2 = await menu();
        if (m2.trim() === '') return 'done';
        continue;
      }
      await sleep(60);
    }
    return 'timeout';
  };

  const teleport = (to) => page.evaluate((to) => window.__thorn.travel(to), to);
  const force = (spec) => page.evaluate((spec) => window.__thorn.startCombat(spec), spec);
  const gameState = () => page.evaluate(() => {
    const g = window.__thorn.game;
    return g && {
      pos: g.pos, gold: g.gold, clock: g.clock,
      party: g.partyIds.map(id => {
        const c = g.roster.find(r => r.id === id);
        return { name: c.name, hp: c.hp, maxHp: c.maxHp, xp: c.xp, dead: !!c.status.dead, inv: c.inventory.map(e => e.id) };
      }),
      flags: g.flags
    };
  });

  console.log('scenario:', scenario);
  await newPartyAtHall();
  console.log('party mustered');

  if (scenario === 'combat') {
    await teleport({ map: 'undercroft1', x: 5, y: 5, facing: 0 });
    await key('t'); // torch
    await force({ groups: [{ monster: 'fen_rat', count: 4 }, { monster: 'mirefang', count: 2 }] });
    await waitMenu(/BATTLE!/);
    await shot('combat_intro');
    await key(' ');
    await waitMenu(/orders for/);
    await shot('combat_orders');
    const res = await autoCombat();
    console.log('combat result:', res);
    console.log('log tail:', (await logTail(500)).replace(/\n+/g, ' | '));
    console.log('state:', JSON.stringify(await gameState()).slice(0, 400));
  }

  if (scenario === 'shop') {
    await key('ArrowDown'); await key('ArrowUp'); // turn around, step away from hall
    // walk to Greta's: from (4,15)… easier: teleport in front of the door
    await teleport({ map: 'town', x: 11, y: 16, facing: 0 });
    await key('ArrowUp');
    await waitMenu(/Greta/);
    await shot('shop');
    await key('b'); await key('1'); // who buys: Hroth
    await waitMenu(/stock/);
    await shot('shop_stock');
    await key('4'); // buy something
    console.log('after buy:', (await logTail(200)).replace(/\n+/g, ' | '));
    await key('Escape'); await key('Escape'); await key('l');
  }

  if (scenario === 'riddle') {
    await teleport({ map: 'undercroft1', x: 13, y: 10, facing: 1 }); // beside the riddle door
    await key('t');
    await shot('riddle_door');
    await key('ArrowUp');
    await sleep(150);
    await shot('riddle_prompt');
    await type('candle');
    console.log('riddle log:', (await logTail(240)).replace(/\n+/g, ' | '));
    await key('ArrowUp');
    console.log('passed through:', JSON.stringify((await gameState()).pos));
  }

  if (scenario === 'boss') {
    // strengthen party for the Tallow King, then walk onto his cell
    await page.evaluate(() => {
      const g = window.__thorn.game;
      for (const id of g.partyIds) {
        const c = g.roster.find(r => r.id === id);
        c.level = 8; c.maxHp = 90; c.hp = 90;
      }
    });
    await teleport({ map: 'undercroft2', x: 3, y: 16, facing: 0 });
    await key('t');
    await key('ArrowUp'); // onto the boss cell
    await sleep(200);
    await shot('boss_intro');
    const res = await autoCombat(800);
    console.log('boss result:', res);
    const st = await gameState();
    console.log('has verse_first:', st.party.some(p => p.inv.includes('verse_first')), 'gold:', st.gold);
    await shot('boss_after');
  }

  if (scenario === 'review') {
    await page.evaluate(() => {
      const g = window.__thorn.game;
      for (const id of g.partyIds) { const c = g.roster.find(r => r.id === id); c.xp = 500; }
      g.gold = 2000;
    });
    await teleport({ map: 'town', x: 18, y: 16, facing: 0 });
    await key('ArrowUp');
    await waitMenu(/Review Board sees whom/);
    await key('5'); // Morrigan the hexen
    await waitMenu(/Magistrate/);
    await shot('review');
    await key('t'); await key('t'); // train twice
    console.log('train log:', (await logTail(160)).replace(/\n+/g, ' | '));
    await key('s'); // buy spells
    await waitMenu(/Spell archive/);
    await key('1'); // hexen tier 1
    console.log('spells log:', (await logTail(220)).replace(/\n+/g, ' | '));
    await key('Escape'); await key('l');
    const st = await gameState();
    console.log('morrigan:', JSON.stringify(st.party[4]));
    // save at hall then continue from main menu
    await teleport({ map: 'town', x: 4, y: 16, facing: 0 });
    await key('ArrowUp');
    await waitMenu(/Adventurers' Hall/);
    await key('s'); await key('l');
    await key('q'); await key('y'); // quit with autosave
    await waitMenu(/New game/);
    await key('c'); // continue hall save
    await sleep(300);
    const st2 = await gameState();
    console.log('continued: gold', st2.gold, 'party size', st2.party.length, 'pos', JSON.stringify(st2.pos));
  }

  if (scenario === 'victory') {
    await page.evaluate(() => {
      const g = window.__thorn.game;
      const c = g.roster.find(r => r.id === g.partyIds[0]);
      c.inventory.push({ id: 'verse_first', ident: true }, { id: 'verse_second', ident: true }, { id: 'verse_third', ident: true });
    });
    await teleport({ map: 'town', x: 11, y: 10, facing: 0 });
    await key('ArrowUp');
    await waitMenu(/Bell Tower/);
    await shot('belltower');
    await key('p');
    await sleep(300);
    await shot('victory');
    console.log('victory menu:', (await menu()).slice(0, 200).replace(/\n+/g, ' | '));
  }

  await browser.close();
}

main().catch(e => { console.error('DRIVE FAILED:', e.message); process.exit(1); });
