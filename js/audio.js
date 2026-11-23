// Простые звуковые эффекты на WebAudio — без файлов, синтезом.
(function () {
  let ctx = null;
  const last = {};
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol) {
    const c = ac();
    if (!c) return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.value = vol || 0.08;
    s.buffer = buf;
    s.connect(f).connect(g).connect(c.destination);
    s.start();
  }
  const SOUNDS = {
    click: () => tone(520, 0.05, 'square', 0.025),
    gather: () => tone(380 + Math.random() * 120, 0.06, 'triangle', 0.05),
    coin: () => { tone(880, 0.07, 'triangle', 0.05); tone(1320, 0.1, 'triangle', 0.05, 0.06); },
    hit: () => noise(0.08, 0.06),
    build: () => [392, 494, 587].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, i * 0.08)),
    level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'square', 0.035, i * 0.08)),
    win: () => [523, 659, 784, 659, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.04, i * 0.11)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.03, i * 0.15)),
    spell: () => tone(300, 0.5, 'sawtooth', 0.035, 0, 1200),
    horn: () => { tone(196, 0.5, 'sawtooth', 0.03); tone(294, 0.6, 'sawtooth', 0.025, 0.25); },
    alert: () => { tone(988, 0.08, 'square', 0.03); tone(988, 0.08, 'square', 0.03, 0.12); },
  };
  G.SFX = {
    play(name) {
      if (!G.S || !G.S.sound || G.offlineSim || document.visibilityState !== 'visible') return;
      const now = performance.now();
      if (last[name] && now - last[name] < 45) return;
      last[name] = now;
      try { if (SOUNDS[name]) SOUNDS[name](); } catch (e) { /* звук недоступен */ }
    },
  };
})();
