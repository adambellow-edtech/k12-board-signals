/* Breakout Land — procedural ambient soundscape (zero audio assets).
   A soft pad + occasional birdsong, kept deliberately quiet, fully gated by the
   existing mute button, and shifting gently per region so each land has its own
   mood. Shares the WebAudio context with the SFX so one mute silences all. */

const ambient = {
  ctx: null, master: null, filter: null, oscs: [], lfo: null, birdTimer: null,
  started: false, regionRoot: 130.81,

  // subtle musical character per region (root note + filter openness)
  REGION_TONE: {
    plaza:   { root: 130.81, cut: 640 },   // C3, calm
    number:  { root: 146.83, cut: 780 },   // D3, brighter
    word:    { root: 110.00, cut: 560 },   // A2, warm/low
    science: { root: 123.47, cut: 720 },   // B2, airy
    logic:   { root: 164.81, cut: 820 },   // E3, crisp
  },

  start() {
    if (this.started || muted) return;
    const ctx = ac(); if (!ctx) return;
    if (ctx.resume) ctx.resume();
    this.ctx = ctx;

    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = this.REGION_TONE.plaza.cut; filter.Q.value = 0.7;
    filter.connect(master); this.filter = filter;

    // a soft pad: root, fifth, octave, twelfth
    const ratios = [1, 1.5, 2, 3], gains = [0.05, 0.032, 0.024, 0.010];
    this.oscs = ratios.map((r, i) => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle';
      o.frequency.value = this.regionRoot * r; o.detune.value = (i - 1) * 3;
      const g = ctx.createGain(); g.gain.value = gains[i];
      o.connect(g); g.connect(filter); o.start();
      return { o, g, ratio: r };
    });

    // a very slow filter sweep gives the pad gentle life
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lg = ctx.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
    this.lfo = { lfo, lg };

    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 3);
    this.started = true;
    this.scheduleBird();
  },

  stop() {
    if (!this.started) return;
    clearTimeout(this.birdTimer);
    const ctx = this.ctx, t = ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 1);
    } catch (e) {}
    const oscs = this.oscs, lfo = this.lfo;
    setTimeout(() => {
      oscs.forEach(n => { try { n.o.stop(); } catch (e) {} });
      if (lfo) { try { lfo.lfo.stop(); } catch (e) {} }
    }, 1100);
    this.oscs = []; this.lfo = null; this.started = false;
  },

  setRegion(id) {
    const tone = this.REGION_TONE[id] || this.REGION_TONE.plaza;
    this.regionRoot = tone.root;
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.oscs.forEach(n => { try { n.o.frequency.linearRampToValueAtTime(tone.root * n.ratio, t + 2.5); } catch (e) {} });
    try { this.filter.frequency.linearRampToValueAtTime(tone.cut, t + 2.5); } catch (e) {}
  },

  // called by the mute button: silence or resume with the rest of the audio
  syncMute() {
    if (muted) this.stop();
    else if (typeof screenIs === 'function' && screenIs('world')) this.start();
  },

  scheduleBird() {
    if (!this.started) return;
    this.birdTimer = setTimeout(() => { this.chirp(); this.scheduleBird(); }, 5000 + Math.random() * 9000);
  },
  chirp() {
    if (muted || !this.ctx) return;
    const ctx = this.ctx;
    const base = 1400 + Math.random() * 500;
    [0, 1, 2].forEach(i => {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.value = base + i * (120 + Math.random() * 120);
      const g = ctx.createGain(); const t = ctx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.028, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.16);
    });
  },
};
