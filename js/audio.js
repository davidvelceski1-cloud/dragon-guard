/* Dragon Guard – synthesised sound effects (Web Audio API, no audio files).
   The AudioContext is only created after the player's first tap (browser autoplay rules). */
(function () {
  'use strict';
  const A = (DG.Audio = {});
  const VOLUME = 0.55;
  let ac = null, master = null, noiseBuf = null, muted = false;

  /** Create / resume the audio context. Safe to call on every user gesture. */
  A.unlock = function () {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = muted ? 0 : VOLUME;
        master.connect(ac.destination);

        // One second of white noise, reused for explosions / whooshes
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;

        // iOS: playing a silent buffer inside the gesture fully unlocks output
        const s = ac.createBufferSource();
        s.buffer = ac.createBuffer(1, 1, 22050);
        s.connect(ac.destination);
        s.start(0);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* audio not available */ }
  };

  // ---- building blocks ----
  function envelope(gainNode, t0, attack, dur, peak) {
    gainNode.gain.setValueAtTime(0.0001, t0);
    gainNode.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function tone(freq, dur, type, vol, opts) {
    opts = opts || {};
    const t0 = ac.currentTime + (opts.delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    envelope(g, t0, opts.attack || 0.005, dur, vol);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, opts) {
    opts = opts || {};
    const t0 = ac.currentTime + (opts.delay || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = opts.filter || 'lowpass';
    f.frequency.setValueAtTime(opts.freq || 1000, t0);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + dur);
    const g = ac.createGain();
    envelope(g, t0, opts.attack || 0.003, dur, vol);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function roar(soft) {
    const t0 = ac.currentTime;
    const dur = soft ? 0.45 : 0.8;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(soft ? 260 : 200, t0);
    o.frequency.exponentialRampToValueAtTime(soft ? 120 : 60, t0 + dur);
    // fast vibrato makes it growly
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    f.Q.value = 6;
    const g = ac.createGain();
    envelope(g, t0, 0.05, dur, soft ? 0.22 : 0.5);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start(t0); lfo.start(t0);
    o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    noise(dur, soft ? 0.1 : 0.25, { freq: 700, freqTo: 200 });
  }

  // ---- the sound effects ----
  const SFX = {
    shot()    { noise(0.18, 0.5, { freq: 1800, freqTo: 300 }); tone(160, 0.18, 'sine', 0.7, { to: 45 }); },
    hit()     { tone(700, 0.09, 'triangle', 0.35); tone(1050, 0.14, 'triangle', 0.3, { delay: 0.06 }); },
    defeat()  {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.28, { delay: i * 0.055 }));
      noise(0.25, 0.2, { freq: 3000, filter: 'highpass' });
    },
    wrong()   { tone(200, 0.28, 'square', 0.16, { to: 90 }); tone(212, 0.28, 'sawtooth', 0.1, { to: 95 }); },
    roar(soft) { roar(soft); },
    win()     {
      const notes = [523, 659, 784, 1047, 784, 1047];
      const times = [0, 0.12, 0.24, 0.36, 0.52, 0.62];
      notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 0.5 : 0.16, 'triangle', 0.3, { delay: times[i] }));
      notes.forEach((f, i) => tone(f / 2, 0.16, 'square', 0.06, { delay: times[i] }));
    },
    lose()    { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.3, { delay: i * 0.2 })); },
    select()  { tone(880, 0.06, 'sine', 0.25); },
    empty()   { tone(140, 0.12, 'square', 0.15); },
    click()   { tone(620, 0.04, 'sine', 0.15); },
    volleyReady() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.22, { delay: i * 0.07 })); },
    volley()  {
      noise(0.6, 0.6, { freq: 2500, freqTo: 150 });
      tone(110, 0.5, 'sawtooth', 0.3, { to: 40 });
      [523, 659, 784, 1047].forEach((f) => tone(f, 0.5, 'triangle', 0.12, { delay: 0.05 }));
    }
  };

  A.play = function (name, arg) {
    if (!ac || muted || !SFX[name]) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      SFX[name](arg);
    } catch (e) { /* never let audio break the game */ }
  };

  A.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ac.currentTime, 0.02);
  };

  A.isMuted = () => muted;
})();
