/* Breakout Land — background music. Loops the island theme ("Map of Moss"),
   gated by the existing mute button and played on the island only. Keeps the
   same public interface (start/stop/syncMute/setRegion) so the rest of the app
   wires in unchanged. */

const ambient = {
  audio: null,
  started: false,
  volume: 0.34,
  _fadeT: null,

  _src() { return (typeof window !== 'undefined' && window.MUSIC_SRC) || 'assets/map-of-moss.mp3'; },
  _ensure() {
    if (this.audio) return this.audio;
    const a = new Audio(this._src());
    a.loop = true; a.volume = 0; a.preload = 'auto';
    this.audio = a;
    return a;
  },

  start() {
    if (muted) return;
    const a = this._ensure();
    const p = a.play();
    if (p && p.catch) p.catch(() => {}); // autoplay may defer until a user gesture
    this.started = true;
    this._fade(this.volume, 1500);
  },

  stop() {
    this.started = false;
    if (!this.audio) return;
    this._fade(0, 700, () => { try { this.audio.pause(); } catch (e) {} });
  },

  // called by the mute button: silence or resume with the rest of the audio
  syncMute() {
    if (muted) this.stop();
    else if (typeof screenIs === 'function' && screenIs('world')) this.start();
  },

  // the background track is fixed now; region mood no longer changes the music
  setRegion() {},

  _fade(to, ms, done) {
    const a = this.audio; if (!a) return;
    clearInterval(this._fadeT);
    const from = a.volume, steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    this._fadeT = setInterval(() => {
      i++;
      a.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
      if (i >= steps) { clearInterval(this._fadeT); done && done(); }
    }, 50);
  },
};
