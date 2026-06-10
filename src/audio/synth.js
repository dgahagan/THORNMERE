// Chiptune synth engine: square/pulse, triangle and noise voices with simple
// AD envelopes over WebAudio — SID/Paula-adjacent. All music and SFX are
// note/pattern data (data/audio/*.json); nothing here loads an audio file.
//
// Audio starts only after a user gesture (unlock()). Volumes persist via the
// caller. Music ducks slightly under SFX.

const CFG_KEY = 'thornmere.audio';

export class Synth {
  constructor() {
    this.ctx = null;
    this.master = null; this.musicBus = null; this.sfxBus = null; this.duck = null;
    this.cfg = { master: 0.8, music: 0.7, sfx: 0.8, mute: false };
    try {
      const saved = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (saved) this.cfg = { ...this.cfg, ...saved };
    } catch { /* fresh config */ }
    this.noiseBuf = null;
    this.current = null;       // {name, timer, nodes:Set, loopLen, nextAt}
    this.ambient = null;
  }

  unlocked() { return !!this.ctx; }

  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.duck = this.ctx.createGain();          // music duck stage
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.duck).connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    // pre-render one second of white noise
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let seed = 0x2f6e2b1;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x3fffffff) - 1;
    }
    this.applyCfg();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyCfg() {
    if (!this.ctx) return;
    const c = this.cfg;
    this.master.gain.value = c.mute ? 0 : c.master;
    this.musicBus.gain.value = c.music;
    this.sfxBus.gain.value = c.sfx;
    localStorage.setItem(CFG_KEY, JSON.stringify(c));
  }

  set(key, val) { this.cfg[key] = val; this.applyCfg(); }

  // ---- voices ---------------------------------------------------------------
  // One note: voice 'square'|'pulse'|'tri'|'noise', freq Hz, at (ctx time),
  // dur seconds, vol 0..1, env {a, r}, slide (Hz at end), bus.
  note({ voice = 'square', freq = 440, at, dur = 0.2, vol = 0.5, a = 0.005, r = 0.05, slide = 0, duty = 0.25, bus }) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + a);
    g.gain.setValueAtTime(vol, Math.max(at + a, at + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.01);
    g.connect(bus);
    let src;
    if (voice === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      if (freq) {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
        src.connect(f).connect(g);
      } else src.connect(g);
    } else {
      src = ctx.createOscillator();
      if (voice === 'pulse') src.setPeriodicWave(this.pulseWave(duty));
      else src.type = voice === 'tri' ? 'triangle' : 'square';
      src.frequency.setValueAtTime(freq, at);
      if (slide) src.frequency.exponentialRampToValueAtTime(Math.max(20, slide), at + dur);
      src.connect(g);
    }
    src.start(at);
    src.stop(at + dur + 0.05);
    return src;
  }

  pulseWave(duty) {
    this._pw ??= {};
    const key = duty.toFixed(2);
    if (!this._pw[key]) {
      const n = 32;
      const real = new Float32Array(n), imag = new Float32Array(n);
      for (let i = 1; i < n; i++) {
        real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      }
      this._pw[key] = this.ctx.createPeriodicWave(real, imag);
    }
    return this._pw[key];
  }

  // ---- sequencer --------------------------------------------------------------
  // pattern: {bpm, tracks:[{voice,duty?,vol,detune?,notes:"c4:2 e4:1 r:1 ..."}]}
  // A token is name+octave:sixteenths or r:sixteenths. Returns loop length (s).
  schedulePattern(pat, at, bus, transpose = 0, detuneCents = 0, nodes = null) {
    const spb = 60 / (pat.bpm || 120);          // seconds per beat
    const six = spb / 4;
    let loopLen = 0;
    for (const tr of pat.tracks) {
      let t = at;
      for (const tok of tr.notes.trim().split(/\s+/)) {
        const [p, len] = tok.split(':');
        const dur = (parseFloat(len) || 1) * six;
        if (p !== 'r') {
          const freq = noteFreq(p, transpose) * Math.pow(2, detuneCents / 1200);
          const src = this.note({
            voice: tr.voice, duty: tr.duty ?? 0.25, freq, at: t,
            dur: dur * (tr.gate ?? 0.9), vol: tr.vol ?? 0.4,
            a: tr.a ?? 0.004, r: tr.r ?? 0.04, bus
          });
          nodes?.add(src);
        }
        t += dur;
      }
      loopLen = Math.max(loopLen, t - at);
    }
    return loopLen;
  }

  // looping music: stops whatever played before (short fade, no clicks)
  playMusic(name, pat, { transpose = 0, detune = 0 } = {}) {
    if (!this.ctx) return;
    if (this.current?.name === name) return;
    this.stopMusic();
    const nodes = new Set();
    const state = { name, nodes, timer: null };
    const tick = () => {
      // schedule next loop iteration just before the current one ends
      const at = Math.max(this.ctx.currentTime + 0.03, state.nextAt || 0);
      const len = this.schedulePattern(pat, at, this.musicBus, transpose, detune, nodes);
      state.nextAt = at + len;
      state.timer = setTimeout(tick, Math.max(50, (state.nextAt - this.ctx.currentTime - 0.25) * 1000));
    };
    this.current = state;
    tick();
  }

  // one-shot piece (fanfare, sting, combat flourish)
  playOnce(pat, { transpose = 0, bus = null } = {}) {
    if (!this.ctx) return 0;
    return this.schedulePattern(pat, this.ctx.currentTime + 0.03, bus || this.musicBus, transpose);
  }

  stopMusic() {
    const cur = this.current;
    if (!cur) return;
    clearTimeout(cur.timer);
    for (const src of cur.nodes) { try { src.stop(this.ctx.currentTime + 0.03); } catch { /* already done */ } }
    this.current = null;
  }

  // ---- sfx ----------------------------------------------------------------------
  // recipe: [{voice,freq,slide?,dur,vol,a?,r?,delay?,duty?}, ...]
  playSfx(recipe) {
    if (!this.ctx || !recipe) return;
    const at0 = this.ctx.currentTime + 0.01;
    for (const n of recipe) {
      this.note({ ...n, at: at0 + (n.delay || 0), bus: this.sfxBus });
    }
    // duck the music briefly
    const d = this.duck.gain;
    const t = this.ctx.currentTime;
    d.cancelScheduledValues(t);
    d.setValueAtTime(d.value, t);
    d.linearRampToValueAtTime(0.55, t + 0.02);
    d.linearRampToValueAtTime(1.0, t + 0.5);
  }
}

const NOTE_IDX = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function noteFreq(token, transpose = 0) {
  // 'c4', 'f#3', 'bb2'
  const m = /^([a-g])([#b]?)(\d)$/.exec(token.toLowerCase());
  if (!m) return 440;
  let semi = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const oct = parseInt(m[3], 10);
  const midi = (oct + 1) * 12 + semi + transpose;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
