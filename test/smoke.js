// Headless smoke driver: plays the game via synthetic keystrokes.
// ?phase=town|dungeon|combat selects how far to go. Logs SMOKE: lines.

const phase = new URLSearchParams(location.search).get('phase') || 'town';
const say = (s) => console.log('SMOKE: ' + s);
window.addEventListener('error', e => console.log('SMOKE-ERROR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno));

const press = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const menuText = () => document.getElementById('menu').textContent || '';
const logText = () => document.getElementById('log').textContent || '';

async function until(pred, label, timeout = 8000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    if (pred()) return true;
    await sleep(40);
  }
  say('TIMEOUT waiting for ' + label + ' | menu=' + menuText().slice(0, 120));
  return false;
}

// generic interrupt handler: combat, chests, stairs prompts, narration
async function settle(maxIter = 400) {
  for (let i = 0; i < maxIter; i++) {
    const m = menuText();
    if (/BATTLE!/.test(m)) { press(' '); await sleep(50); continue; }
    if (/orders for/.test(m)) { press('a'); await sleep(50); continue; }
    if (/which group/i.test(m)) { press('1'); await sleep(50); continue; }
    if (/banded chest/i.test(m)) { press('l'); await sleep(50); continue; }
    if (/Take the stairs/i.test(m)) { press('n'); await sleep(50); continue; }
    if (/THE FEN HAS WON/i.test(m)) { say('PARTY WIPED (acceptable in smoke)'); return false; }
    if (m.trim() === '') { press(' '); await sleep(35); // flush narration if any
      if (menuText().trim() === '') return true;
      continue;
    }
    return true;
  }
  return true;
}

async function typeText(s) {
  for (const c of s) { press(c); await sleep(15); }
  press('Enter');
  await sleep(60);
}

async function move(key, n = 1) {
  for (let i = 0; i < n; i++) {
    press(key);
    await sleep(55);
    await settle();
  }
}

async function createChar(name, raceKey, classKey) {
  press('c'); await sleep(60);
  await typeText(name);
  press(raceKey); await sleep(60);
  press(classKey); await sleep(60);
  press('a'); await sleep(60); // accept stats
  press('a'); await sleep(60); // accept the offered face (portrait)
  say('created ' + name);
}

async function run() {
  await until(() => /New game/.test(menuText()), 'main menu');
  press('n'); await sleep(80);
  say('new game started');

  // walk into the Hall
  press('ArrowUp'); await sleep(80);
  await until(() => /Adventurers' Hall/.test(menuText()), 'hall menu');
  say('entered hall');

  await createChar('Hroth', '2', '1');     // Korrun Blade
  await createChar('Brenna', '1', '1');    // Vael Blade
  await createChar('Aldwyn', '1', '2');    // Vael Warden
  await createChar('Tamsin', '3', '6');    // Fennick Skald
  await createChar('Morrigan', '4', '7');  // Aldari Hexen
  await createChar('Elspeth', '4', '8');   // Aldari Lorist

  press('s'); await sleep(60);             // save
  say('saved at hall: ' + /saved/i.test(logText()));
  press('l'); await sleep(60);             // leave
  say('left hall, roster rows=' + document.querySelectorAll('#roster .row:not(.hdr):not(.empty)').length);

  if (phase === 'town') { say('DONE town'); return; }

  // route to the tannery: east along y16 to x15, south to y8, west to x11
  press('ArrowRight'); await sleep(40);    // face E
  await move('ArrowUp', 11);
  press('ArrowRight'); await sleep(40);    // face S
  await move('ArrowUp', 8);
  press('ArrowRight'); await sleep(40);    // face W
  await move('ArrowUp', 4);
  press('ArrowLeft'); await sleep(40);     // face S
  press('ArrowUp'); await sleep(80);       // into the tannery face
  const okTannery = await until(() => /Tannery/i.test(menuText()), 'tannery menu');
  if (!okTannery) { say('FAILED to reach tannery; status=' + document.getElementById('status').textContent); return; }
  press('d'); await sleep(100);
  await settle();
  say('descended: ' + /Undercroft/.test(document.getElementById('status').textContent));

  press('t'); await sleep(60);             // light torch
  say('torch lit: ' + /lights a torch/i.test(logText()));

  if (phase === 'dungeon') {
    await move('ArrowUp', 2);
    say('DONE dungeon, status=' + document.getElementById('status').textContent.replace(/\n/g, ' | '));
    return;
  }

  // phase 'combat': wander until a battle menu appears, then stop.
  // Turn when a step bumps a wall so corners can't trap the walker.
  for (let i = 0; i < 200; i++) {
    const before = logText().length;
    press('ArrowUp');
    await sleep(80);
    if (/BATTLE!/.test(menuText()) || /orders for/.test(menuText())) {
      say('DONE combat encountered at step ' + i + ' | ' + menuText().split('\n')[1]);
      return;
    }
    if (/wall wins\.$/.test(logText().slice(before).trim()) || logText().slice(before).includes('wall wins')) {
      press(i % 3 === 0 ? 'ArrowRight' : 'ArrowLeft');
      await sleep(60);
    }
    if (/Take the stairs/i.test(menuText())) { press('n'); await sleep(60); }
    if (i % 40 === 39) say('wandering… i=' + i + ' log tail=' + logText().slice(-90).replace(/\n/g, '|'));
  }
  say('no combat found in 200 steps');
}

run().then(() => say('SCRIPT COMPLETE')).catch(e => console.log('SMOKE-ERROR: ' + (e.stack || e)));
