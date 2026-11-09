// sound.js — звук кодом: эффекты + музыка по настроениям, приглушение музыки под голос.
// Сцена складывает события в E.sfx(t, имя, параметры) и E.music(t, длительность, настроение);
// window.__sound(ctx, t0) играет всё в переданном контексте (OfflineAudioContext при рендере).
(function () {
  const SFXL = [], MUS = [];
  E.sfx = (t, name, p = {}) => SFXL.push({ t, name, p });
  E.music = (t, dur, mood, p = {}) => MUS.push({ t, dur, mood, p });

  window.__sound = (ctx, t0) => {
    const R = E.rng(777);
    const master = ctx.createGain(); master.gain.value = 1.0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    const sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    const musBus = ctx.createGain(); musBus.gain.value = 0.55; musBus.connect(master);
    const duck = ctx.createGain(); duck.connect(musBus);
    // приглушение музыки под репликами (−9 дБ)
    duck.gain.setValueAtTime(1, t0);
    const cues = (window.__cues || []).slice().sort((a, b) => a.t - b.t);
    for (const c of cues) { const d = E.vdur(c.id); const a = t0 + Math.max(0, c.t - 0.12), b = t0 + c.t + d + 0.25;
      duck.gain.setTargetAtTime(0.36, a, 0.05); duck.gain.setTargetAtTime(1, b, 0.25); }

    // общий шумовой буфер (зерно)
    const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); { const d = nb.getChannelData(0), r = E.rng(4242); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    const T = (t) => t0 + t;
    const noise = (t, dur, { type = "lowpass", f = 1000, q = 0.7, f2, gain = 0.5, a = 0.005, rel, out = sfxBus, pan = 0 } = {}) => {
      const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, T(t)); flt.Q.value = q;
      if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f2), T(t + dur));
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(t)); g.gain.exponentialRampToValueAtTime(gain, T(t + a)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + dur));
      let node = g; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
      s.connect(flt); flt.connect(g); node.connect(out); s.start(T(t), R() * 2); s.stop(T(t + dur + 0.05)); return { g, flt };
    };
    const tone = (t, dur, { f = 220, f2, type = "sine", gain = 0.3, a = 0.005, out = sfxBus, detune = 0, lp } = {}) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, T(t)); o.detune.value = detune; if (f2) o.frequency.exponentialRampToValueAtTime(f2, T(t + dur));
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(t)); g.gain.exponentialRampToValueAtTime(gain, T(t + a)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + dur));
      let n = o; if (lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); n = fl; }
      n.connect(g); g.connect(out); o.start(T(t)); o.stop(T(t + dur + 0.05)); return { o, g };
    };
    // ── эффекты ──
    const A = {
      boom(t, { size = 1 } = {}) { tone(t, 1.6 * size, { f: 120, f2: 30, gain: 0.9 * Math.min(1.2, size) }); noise(t, 2.8 * size, { f: 900, f2: 120, gain: 0.8, a: 0.004 });
        noise(t, 0.25, { type: "highpass", f: 2500, gain: 0.5 }); noise(t + 0.15, 3.5 * size, { f: 300, f2: 80, gain: 0.35, a: 0.2 }); },
      nuke(t) { tone(t, 6, { f: 70, f2: 22, gain: 1 }); noise(t, 9, { f: 1600, f2: 60, gain: 0.95, a: 0.01 }); noise(t + 0.4, 10, { f: 220, f2: 50, gain: 0.6, a: 1.2 }); noise(t, 0.4, { type: "highpass", f: 1800, gain: 0.7 }); },
      braam(t, { dur = 3.2, note = 55, gain = 0.32 } = {}) { [0, 7, 12].forEach((iv, i) => [-9, 9].forEach((dt) => { const o = tone(t, dur, { f: note * Math.pow(2, iv / 12), type: "sawtooth", gain: gain / (i + 1.5), a: 0.04, detune: dt, out: sfxBus, lp: 700 }); }));
        tone(t, dur, { f: note / 2, gain: 0.5, a: 0.03 }); noise(t, 0.6, { f: 400, f2: 120, gain: 0.3 }); },
      taiko(t, { gain = 0.7 } = {}) { tone(t, 0.6, { f: 95, f2: 42, gain }); noise(t, 0.18, { type: "bandpass", f: 260, q: 1.2, gain: gain * 0.5 }); },
      hit(t, { gain = 0.4 } = {}) { [523, 811, 1187, 1720].forEach((f, i) => tone(t, 1.2 - i * 0.2, { f, gain: gain / (i + 2), type: "triangle" })); noise(t, 0.12, { type: "highpass", f: 3000, gain: gain * 0.6 }); tone(t, 0.4, { f: 110, f2: 50, gain }); },
      whoosh(t, { dur = 0.6, gain = 0.25 } = {}) { const n = noise(t, dur, { type: "bandpass", f: 350, q: 1.4, gain, a: dur * 0.6 }); n.flt.frequency.exponentialRampToValueAtTime(2200, T(t + dur * 0.6)); n.flt.frequency.exponentialRampToValueAtTime(400, T(t + dur)); },
      riser(t, { dur = 2, gain = 0.2 } = {}) { noise(t, dur, { type: "highpass", f: 400, f2: 6000, gain, a: dur * 0.9 }); tone(t, dur, { f: 110, f2: 880, type: "sawtooth", gain: gain * 0.4, a: dur * 0.9, lp: 2500 }); },
      click(t, { gain = 0.5 } = {}) { noise(t, 0.03, { type: "highpass", f: 2500, gain }); tone(t, 0.04, { f: 1800, f2: 900, type: "square", gain: gain * 0.2 }); },
      radio(t, { off = false } = {}) { noise(t, 0.09, { type: "bandpass", f: 1800, q: 1, gain: 0.25 }); tone(t + (off ? 0 : 0.06), 0.05, { f: off ? 900 : 1250, type: "square", gain: 0.06 }); },
      hiss(t, { dur = 2, gain = 0.035 } = {}) { noise(t, dur, { type: "bandpass", f: 2400, q: 0.6, gain, a: 0.05 }); },
      shot(t, { gain = 0.55 } = {}) { noise(t, 0.11, { f: 1100, f2: 300, gain }); tone(t, 0.12, { f: 160, f2: 60, gain: gain * 0.7 }); noise(t + 0.05, 0.06, { type: "highpass", f: 4000, gain: 0.12 }); tone(t + 0.1, 0.05, { f: 2600, type: "square", gain: 0.03 }); },
      gun(t, { gain = 0.6 } = {}) { noise(t, 0.3, { f: 3000, f2: 200, gain }); tone(t, 0.25, { f: 140, f2: 45, gain }); },
      casing(t) { [3800, 5200, 4400].forEach((f, i) => tone(t + i * 0.07, 0.12, { f, type: "triangle", gain: 0.05 })); },
      spin(t, { dur = 1.5 } = {}) { tone(t, dur, { f: 60, f2: 420, type: "sawtooth", gain: 0.12, a: dur * 0.8, lp: 1800 }); for (let i = 0; i < dur * 22; i++) noise(t + i / 22, 0.03, { type: "highpass", f: 2000, gain: 0.05 + 0.1 * (i / (dur * 22)) }); },
      alarm(t, { dur = 6, gain = 0.16 } = {}) { const o = ctx.createOscillator(); o.type = "sawtooth"; const g = ctx.createGain(); const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 1800;
        for (let k = 0; k < dur / 1.6; k++) { o.frequency.setValueAtTime(520, T(t + k * 1.6)); o.frequency.linearRampToValueAtTime(880, T(t + k * 1.6 + 0.8)); o.frequency.linearRampToValueAtTime(520, T(t + k * 1.6 + 1.6)); }
        g.gain.setValueAtTime(0.0001, T(t)); g.gain.exponentialRampToValueAtTime(gain, T(t + 0.2)); g.gain.setValueAtTime(gain, T(t + dur - 0.5)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + dur));
        o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(T(t)); o.stop(T(t + dur + 0.1)); },
      rain(t, { dur = 10, gain = 0.09 } = {}) { noise(t, dur, { type: "highpass", f: 1400, gain, a: 0.6 }); noise(t, dur, { f: 380, gain: gain * 1.4, a: 0.6 });
        for (let i = 0; i < dur * 7; i++) tone(t + R() * dur, 0.03, { f: 1800 + R() * 2600, type: "triangle", gain: 0.012 + R() * 0.02 }); },
      thunder(t, { gain = 0.5 } = {}) { noise(t, 3.5, { f: 260, f2: 60, gain, a: 0.08 }); noise(t, 0.4, { f: 1400, f2: 300, gain: gain * 0.4 }); },
      fireworks(t, { dur = 4 } = {}) { for (let i = 0; i < 9; i++) { const st = t + R() * 1.6; noise(st, 0.4, { type: "bandpass", f: 2500, f2: 600, q: 2, gain: 0.12 }); this.pop(st + 0.4 + R() * 0.2); } for (let i = 0; i < 90; i++) noise(t + 0.5 + R() * dur, 0.02, { type: "highpass", f: 3000, gain: 0.05 + R() * 0.08 }); },
      pop(t) { noise(t, 0.5, { f: 1500, f2: 200, gain: 0.45 }); tone(t, 0.3, { f: 180, f2: 60, gain: 0.4 }); },
      crackle(t, { dur = 2, gain = 0.06 } = {}) { for (let i = 0; i < dur * 30; i++) noise(t + R() * dur, 0.015, { type: "highpass", f: 2500, gain: gain * (0.4 + R()) }); noise(t, dur, { f: 500, gain: gain * 0.6, a: 0.2 }); },
      thud(t, { gain = 0.6 } = {}) { tone(t, 0.3, { f: 110, f2: 45, gain }); noise(t, 0.2, { f: 600, f2: 150, gain: gain * 0.6 }); },
      bonk(t) { [420, 655, 980].forEach((f, i) => tone(t, 0.5 - i * 0.1, { f, type: "triangle", gain: 0.15 / (i + 1) })); this.thud(t, { gain: 0.4 }); },
      step(t, { gain = 0.12 } = {}) { noise(t, 0.08, { f: 700, f2: 200, gain }); },
      steps(t, { n = 6, dt = 0.32, gain = 0.1 } = {}) { for (let i = 0; i < n; i++) this.step(t + i * dt, { gain: gain * (0.8 + R() * 0.4) }); },
      chew(t, { dur = 1.5 } = {}) { for (let i = 0; i < dur * 4; i++) { noise(t + i * 0.25, 0.09, { type: "bandpass", f: 1600 + R() * 1500, q: 2, gain: 0.12 }); tone(t + i * 0.25, 0.05, { f: 3000 + R() * 2000, type: "triangle", gain: 0.03 }); } },
      splat(t) { noise(t, 0.5, { f: 900, f2: 120, gain: 0.5 }); noise(t, 1.2, { type: "bandpass", f: 500, q: 1, gain: 0.2, a: 0.05 }); },
      foam(t, { dur = 6 } = {}) { noise(t, dur, { type: "highpass", f: 2000, gain: 0.12, a: 0.3 }); for (let i = 0; i < dur * 12; i++) tone(t + R() * dur, 0.06, { f: 300 + R() * 500, f2: 900 + R() * 900, gain: 0.03 }); },
      heli(t, { dur = 6, gain = 0.4 } = {}) { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 240;
        const g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 17; lg.gain.value = gain * 0.6; lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(gain, T(t + 1.5)); g.gain.setValueAtTime(gain, T(t + dur - 1)); g.gain.linearRampToValueAtTime(0.0001, T(t + dur));
        s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(T(t)); s.stop(T(t + dur)); lfo.start(T(t)); lfo.stop(T(t + dur)); tone(t, dur, { f: 1900, type: "sine", gain: 0.012, a: 1.5 }); },
      wind(t, { dur = 8, gain = 0.08 } = {}) { const n = noise(t, dur, { type: "bandpass", f: 500, q: 0.8, gain, a: 1 }); for (let k = 0; k < dur; k += 2) n.flt.frequency.linearRampToValueAtTime(350 + R() * 500, T(t + k)); },
      tick(t, { gain = 0.2 } = {}) { tone(t, 0.04, { f: 2400, type: "square", gain: gain * 0.3 }); noise(t, 0.02, { type: "highpass", f: 4000, gain }); },
      beep(t, { f = 1400, dur = 0.12, gain = 0.12 } = {}) { tone(t, dur, { f, type: "square", gain, lp: 3000 }); },
      skate(t, { dur = 2 } = {}) { noise(t, dur, { f: 420, gain: 0.25, a: 0.1 }); for (let i = 0; i < dur * 3; i++) tone(t + i / 3, 0.05, { f: 900, type: "triangle", gain: 0.05 }); },
      zap(t, { dur = 0.4 } = {}) { tone(t, dur, { f: 2200, f2: 600, type: "sawtooth", gain: 0.08, lp: 5000 }); noise(t, dur, { type: "highpass", f: 3000, gain: 0.2 }); },
      whack(t) { noise(t, 0.12, { f: 1600, f2: 300, gain: 0.6 }); tone(t, 0.18, { f: 180, f2: 70, gain: 0.6 }); },
      fire(t, { dur = 4 } = {}) { noise(t, dur, { type: "bandpass", f: 700, q: 0.5, gain: 0.07, a: 0.3 }); this.crackle(t, { dur, gain: 0.04 }); },
      hum(t, { dur = 8 } = {}) { tone(t, dur, { f: 50, type: "sine", gain: 0.06, a: 0.5 }); tone(t, dur, { f: 100, type: "triangle", gain: 0.02, a: 0.5 }); noise(t, dur, { type: "bandpass", f: 900, q: 0.4, gain: 0.025, a: 0.5 }); },
      doorOpen(t) { noise(t, 0.9, { type: "bandpass", f: 300, q: 1, gain: 0.2, a: 0.1 }); tone(t + 0.85, 0.3, { f: 90, f2: 50, gain: 0.3 }); this.beep(t, { f: 880, dur: 0.15 }); },
      sand(t, { dur = 3 } = {}) { noise(t, dur, { type: "bandpass", f: 1200, q: 0.5, gain: 0.08, a: 0.5 }); },
      metal(t, { gain = 0.3 } = {}) { [1250, 1980, 3120].forEach((f, i) => tone(t, 0.35, { f, type: "triangle", gain: gain / (i + 2) })); noise(t, 0.08, { type: "highpass", f: 2000, gain: gain * 0.5 }); },
      glitch(t, { dur = 0.3 } = {}) { for (let i = 0; i < dur * 40; i++) { const st = t + R() * dur; tone(st, 0.02 + R() * 0.03, { f: 200 + R() * 3000, type: "square", gain: 0.05 + R() * 0.05, lp: 6000 }); } noise(t, dur, { type: "highpass", f: 3000, gain: 0.08 }); },
      scurry(t) { for (let i = 0; i < 8; i++) noise(t + i * 0.05, 0.03, { type: "bandpass", f: 3000, q: 3, gain: 0.06 }); },
    };
    for (const it of SFXL) { if (A[it.name]) A[it.name].call(A, it.t, it.p); }

    // ── музыка ──
    const note = (n) => 55 * Math.pow(2, n / 12); // n=0 → A1
    const mtone = (t, dur, f, { type = "sawtooth", gain = 0.1, a = 0.01, lp = 1200, rel = 0.08 } = {}) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(t)); g.gain.exponentialRampToValueAtTime(gain, T(t + a)); g.gain.setValueAtTime(gain, T(t + Math.max(a, dur - rel))); g.gain.exponentialRampToValueAtTime(0.0001, T(t + dur));
      o.connect(fl); fl.connect(g); g.connect(duck); o.start(T(t)); o.stop(T(t + dur + 0.05)); };
    const kick = (t, gn = 0.5) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, T(t)); o.frequency.exponentialRampToValueAtTime(42, T(t + 0.18));
      g.gain.setValueAtTime(gn, T(t)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + 0.35)); o.connect(g); g.connect(duck); o.start(T(t)); o.stop(T(t + 0.4)); };
    const snare = (t, gn = 0.25) => noise(t, 0.18, { type: "bandpass", f: 1900, q: 0.7, gain: gn, out: duck });
    const hat = (t, gn = 0.06) => noise(t, 0.04, { type: "highpass", f: 7000, gain: gn, out: duck });
    const tom = (t, f = 110, gn = 0.35) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f, T(t)); o.frequency.exponentialRampToValueAtTime(f * 0.5, T(t + 0.3));
      g.gain.setValueAtTime(gn, T(t)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + 0.45)); o.connect(g); g.connect(duck); o.start(T(t)); o.stop(T(t + 0.5)); };
    const pad = (t, dur, notes, gain = 0.05, lp = 1400) => notes.forEach((n) => [-7, 7].forEach((dt) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = note(n); o.detune.value = dt;
      const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(gain, T(t + Math.min(1.2, dur * 0.4)));
      g.gain.setValueAtTime(gain, T(t + dur * 0.7)); g.gain.linearRampToValueAtTime(0.0001, T(t + dur)); o.connect(fl); fl.connect(g); g.connect(duck); o.start(T(t)); o.stop(T(t + dur + 0.05)); }));

    for (const m of MUS) {
      const { t, dur, mood } = m, v = m.p.vol ?? 1, end = t + dur;
      if (mood === "drone") { pad(t, dur, [0, 7, 12], 0.05 * v, 500); mtone(t, dur, note(-12), { type: "sine", gain: 0.18 * v, a: 1.5, rel: 1 }); }
      if (mood === "trailer") { const b = 60 / 96; let i = 0;
        for (let x = t; x < end - 0.05; x += b / 2, i++) { const bar = Math.floor(i / 8), st = i % 8;
          mtone(x, b / 2 * 0.9, note([12, 12, 15, 12, 12, 17, 15, 10][st] + (bar % 4 === 3 ? -2 : 0)), { gain: 0.06 * v, lp: 1100 });
          if (st === 0 || st === 3 || st === 6) tom(x, 80, 0.32 * v); if (st === 4) snare(x, 0.12 * v); }
        pad(t, dur, [0, 7], 0.035 * v, 700); }
      if (mood === "stealth") { const b = 60 / 92; let i = 0;
        for (let x = t; x < end - 0.05; x += b / 2, i++) { mtone(x, 0.22, note(i % 8 === 6 ? 3 : 0), { type: "square", gain: 0.055 * v, lp: 420 }); hat(x + b / 4, 0.03 * v); if (i % 4 === 0) kick(x, 0.22 * v); }
        pad(t, dur, [12, 15, 19], 0.022 * v, 900); }
      if (mood === "action") { const b = 60 / 140; let i = 0; const seq = [0, 0, 12, 0, 0, 10, 0, 7, 0, 0, 12, 0, 3, 3, 5, 7];
        for (let x = t; x < end - 0.05; x += b / 4, i++) { const st = i % 16, bar = Math.floor(i / 16);
          mtone(x, b / 4 * 0.85, note(seq[st] + (bar % 4 === 2 ? 5 : bar % 4 === 3 ? 3 : 0)), { type: "sawtooth", gain: 0.06 * v, lp: 900 });
          if (st % 4 === 0) kick(x, 0.45 * v); if (st === 4 || st === 12) snare(x, 0.22 * v); if (st % 2 === 1) hat(x, 0.045 * v); if (st === 0 && bar % 2 === 0) mtone(x, b * 1.5, note(24), { gain: 0.05 * v, lp: 2000 }); }
        pad(t, dur, [12, 19], 0.025 * v, 1200); }
      if (mood === "sad") { const ch = [[12, 15, 19], [8, 12, 15], [3, 7, 10], [10, 14, 17]], b = 60 / 66; for (let k = 0, x = t; x < end - 0.1; k++, x += b * 4) pad(x, Math.min(b * 4.4, end - x), ch[k % 4], 0.04 * v, 1600);
        for (let k = 0, x = t + b; x < end - 0.5; k++, x += b) mtone(x, b * 0.9, note([24, 27, 26, 22, 24, 20, 22, 19][k % 8]), { type: "triangle", gain: 0.05 * v, a: 0.08, lp: 2500, rel: 0.4 }); }
      if (mood === "disco") { const b = 60 / 122; let i = 0;
        for (let x = t; x < end - 0.05; x += b / 2, i++) { if (i % 2 === 0) kick(x, 0.45 * v); else hat(x, 0.09 * v); if (i % 4 === 2) snare(x, 0.2 * v);
          mtone(x, b / 2 * 0.7, note((i % 2 ? 12 : 0) + [0, 0, 5, 5, 7, 7, 3, 3][Math.floor(i / 4) % 8]), { type: "square", gain: 0.05 * v, lp: 800 });
          if (i % 8 === 3) [24, 28, 31].forEach((n) => mtone(x, 0.15, note(n + [0, 5, 7, 3][Math.floor(i / 8) % 4]), { type: "sawtooth", gain: 0.025 * v, lp: 3000 })); } }
      if (mood === "triumph") { const ch = [[15, 19, 22], [10, 14, 17], [12, 15, 19], [8, 12, 15]], b = 60 / 80; for (let k = 0, x = t; x < end - 0.1; k++, x += b * 2) { pad(x, Math.min(b * 2.2, end - x), ch[k % 4], 0.05 * v, 2200); tom(x, 70, 0.3 * v); } }
      if (mood === "tension") { const b = 60 / 120; for (let x = t, i = 0; x < end - 0.05; x += b / 2, i++) { hat(x, 0.05 * v); if (i % 2 === 0) mtone(x, 0.1, note(36), { type: "triangle", gain: 0.03 * v, lp: 4000 }); }
        pad(t, dur, [13, 24, 25], 0.025 * v, 2500); mtone(t, dur, note(-12), { type: "sine", gain: 0.15 * v, a: 1 }); }
      if (mood === "ambient") { pad(t, dur, [0, 7, 15], 0.03 * v, 800); }
      if (mood === "sting") { pad(t, dur, [0, 3, 7, 12], 0.07 * v, 2000); tom(t, 60, 0.5 * v); }
    }
  };
})();
