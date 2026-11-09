// engine.js — общий движок мультика (контракт OBSION: один GSAP-таймлайн, seek-детерминизм, __sound).
// Камера = состояние {cx,cy,s,r}; каждый слой получает свой трансформ с параллаксом по глубине p.
(function () {
  const E = (window.E = {});
  E.W = 1920; E.H = 1080;
  const fns = [];
  E.onFrame = (fn) => fns.push(fn);
  E.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  E.lerp = (a, b, k) => a + (b - a) * k;
  E.smooth = (x) => { x = E.clamp(x); return x * x * (3 - 2 * x); };
  E.easeOut = (x) => 1 - Math.pow(1 - E.clamp(x), 3);
  E.easeIn = (x) => Math.pow(E.clamp(x), 2.2);
  E.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  E.rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  E.noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return E.lerp(E.hash(i), E.hash(i + 1), u) * 2 - 1; };
  E.el = (tag, attrs = {}, parent, html) => {
    const n = document.createElement(tag);
    for (const k in attrs) { if (k === "style") Object.assign(n.style, attrs[k]); else n.setAttribute(k, attrs[k]); }
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  };

  // ───────────────────────── init ─────────────────────────
  E.init = ({ duration, partStart = 0, bg = "#0B0906" }) => {
    E.dur = duration; E.PS = partStart;
    const root = document.getElementById("root");
    root.dataset.duration = duration;
    root.style.background = bg;
    E.root = root;
    root.innerHTML = `
      <div id="camera"><div id="float"><div id="shake"><div id="layers"></div></div></div></div>
      <canvas id="grain" width="640" height="360"></canvas>
      <div id="grade"></div><div id="vignette"></div>
      <div id="lbTop" class="lb"></div><div id="lbBot" class="lb"></div>
      <div id="hud"></div>
      <div id="glitch"></div><div id="flash"></div><div id="black"></div>`;
    E.layersEl = root.querySelector("#layers");
    E.hud = root.querySelector("#hud");
    const tl = gsap.timeline({ paused: true });
    E.tl = tl; window.__timelines = { main: tl };
    tl.set({}, {}, duration); // таймлайн ровно нужной длины
    // экранные оверлеи — простые объекты-состояния
    E.ov = { flash: 0, black: 0, lb: 0, vig: 0.55, grade: 1, grain: 0.07, flashColor: "#FFF6DF", blur: 0, gray: 0 };
    const gl = root.querySelector("#glitch"); E.glBlocks = Array.from({ length: 18 }, () => E.el("div", { class: "gb" }, gl));
    gsap.set("#flash", { opacity: 0 }); gsap.set("#black", { opacity: 0 });
    // масштаб под окно (рендер снимает #root по его прямоугольнику)
    const fit = () => { const s = Math.min(innerWidth / 1920, innerHeight / 1080);
      root.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`; };
    addEventListener("resize", fit); fit();
    tl.eventCallback("onUpdate", E.frame);
    // кнопка старт (превью в браузере)
    if (!navigator.webdriver) {
      const b = E.el("button", { id: "startBtn" }, document.body, "▶ Старт");
      b.onclick = () => { b.style.display = "none"; const ac = new AudioContext(); if (window.__sound) window.__sound(ac, ac.currentTime + 0.05); E.playVoicesPreview && E.playVoicesPreview(); tl.play(0); };
      addEventListener("keydown", (e) => { if (e.key === "r" || e.key === "R") tl.play(0); });
    }
    return tl;
  };
  E.at = (t, fn) => E.tl.call(fn, null, t);
  // глитч: блочные пиксельные помехи + RGB-расслоение (по разбору трейлера WARDOGS)
  const glitches = []; E.glitches = glitches;
  E.glitch = (t, dur = 0.32, amp = 1, { sound = true } = {}) => { glitches.push({ t, dur, amp }); if (sound && E.sfx) E.sfx(t, "glitch", { dur }); };
  const glitchAmt = (t) => { let a = 0; for (const g of glitches) { const u = (t - g.t) / g.dur; if (u >= 0 && u <= 1) a = Math.max(a, g.amp * Math.sin(u * Math.PI)); } return a; };
  E.glitchAmt = glitchAmt;

  // ───────────────────────── камера ─────────────────────────
  E.cam = { cx: 960, cy: 540, s: 1, r: 0 };
  E.camTo = (t, to, dur = 1.2, ease = "power2.inOut") => E.tl.to(E.cam, { ...to, duration: dur, ease }, t);
  E.camSet = (to) => Object.assign(E.cam, to);
  const shakes = [];
  E.shake = (t, amp = 10, dur = 0.35, freq = 17) => shakes.push({ t, amp, dur, freq, seed: shakes.length * 7.3 });
  const camXform = (p) => {
    const c = E.cam, s = 1 + (c.s - 1) * p, cx = 960 + (c.cx - 960) * p, cy = 540 + (c.cy - 540) * p;
    return { s, cx, cy, r: c.r * Math.min(1, p) };
  };
  E.camXform = camXform;

  // ───────────────────────── слои ─────────────────────────
  const layers = [];
  E.layers = layers;
  // p: 0 — неподвижный задник, 1 — план героев, >1 — передний план. blur в px.
  E.layer = (name, p = 1, { blur = 0, w = 1920, h = 1080, z } = {}) => {
    const d = E.el("div", { class: "layer", id: "L_" + name }, E.layersEl);
    d.style.width = w + "px"; d.style.height = h + "px";
    if (blur) d.style.filter = `blur(${blur}px)`;
    const L = { name, p, el: d, kind: "dom" };
    layers.push(L); return d;
  };
  // canvas-слой эффектов: рисует в экранных координатах через трансформ камеры своей глубины
  E.fxLayer = (name, p = 1, { blur = 0, comp = "source-over" } = {}) => {
    const c = E.el("canvas", { class: "layer fx", id: "L_" + name, width: 1920, height: 1080 }, E.layersEl);
    if (blur) c.style.filter = `blur(${blur}px)`;
    const L = { name, p, el: c, kind: "fx", ctx: c.getContext("2d"), items: [], comp };
    layers.push(L); return L;
  };
  const layerByName = (n) => layers.find((l) => l.name === n);
  E.fx = (layerName, t, type, params = {}) => { const L = layerByName(layerName); L.items.push({ t, type, p: params }); };

  // ───────────────────────── кадр ─────────────────────────
  E.frame = () => {
    const t = E.tl.time(), g = E.PS + t;
    // парение (от общего времени — шов частей без скачка)
    const fl = document.getElementById("float");
    fl.style.transform = `translate(${Math.sin(g * 0.55) * 9}px,${Math.cos(g * 0.43) * 6}px) rotate(${Math.sin(g * 0.31) * 0.28}deg)`;
    // тряска
    let sx = 0, sy = 0, sr = 0;
    for (const k of shakes) { const u = t - k.t; if (u < 0 || u > k.dur) continue;
      const a = k.amp * Math.pow(1 - u / k.dur, 2);
      sx += Math.sin(u * k.freq * 6.283 + k.seed) * a; sy += Math.cos(u * k.freq * 5.1 + k.seed * 2) * a * 0.8; sr += Math.sin(u * k.freq * 3.3 + k.seed) * a * 0.03; }
    document.getElementById("shake").style.transform = `translate(${sx}px,${sy}px) rotate(${sr}deg)`;
    // слои
    for (const L of layers) {
      const X = camXform(L.p);
      if (L.kind === "dom") {
        L.el.style.transform = `translate(960px,540px) scale(${X.s}) rotate(${X.r}deg) translate(${-X.cx}px,${-X.cy}px)`;
      } else {
        const ctx = L.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1920, 1080);
        ctx.translate(960, 540); ctx.scale(X.s, X.s); ctx.rotate((X.r * Math.PI) / 180); ctx.translate(-X.cx, -X.cy);
        ctx.globalCompositeOperation = L.comp;
        for (const it of L.items) { const u = t - it.t; const f = FX[it.type]; if (!f) continue; if (u < 0 || u > (it.p.life || f.life || 6)) continue; ctx.save(); f.draw(ctx, u, it.p, t); ctx.restore(); }
      }
    }
    // фильтры слоёв: размытие, ч/б, RGB-расслоение глитча
    const o = E.ov, ga = glitchAmt(t), fr = Math.floor(g * 30);
    let f = "";
    if (o.blur > 0.05) f += `blur(${o.blur}px) `;
    if (o.gray > 0.01) f += `grayscale(${o.gray}) contrast(${1 + 0.3 * o.gray}) `;
    if (ga > 0.02) { const d = (6 + 10 * E.hash(fr)) * ga; f += `drop-shadow(${d}px 0 0 rgba(255,40,40,0.75)) drop-shadow(${-d}px 0 0 rgba(40,255,255,0.75)) `; }
    E.layersEl.style.filter = f || "none";
    E.glBlocks.forEach((b, i) => { if (ga < 0.05 || E.hash(fr * 13 + i) > 0.35 + 0.5 * ga) { b.style.display = "none"; return; }
      const r = E.rng(fr * 31 + i * 7); b.style.display = "block";
      Object.assign(b.style, { left: r() * 1920 + "px", top: r() * 1080 + "px", width: 40 + r() * 380 * ga + "px", height: 12 + r() * 90 + "px",
        background: ["#E9B949", "#F5F1E6", "#1B130B", "#E2372C", "#2AE"][Math.floor(r() * 5)], opacity: 0.5 + 0.5 * r(), transform: `translateX(${(r() - 0.5) * 80 * ga}px)` }); });
    document.getElementById("flash").style.opacity = o.flash;
    document.getElementById("flash").style.background = o.flashColor;
    document.getElementById("black").style.opacity = o.black;
    const lbh = o.lb * 120;
    document.getElementById("lbTop").style.height = lbh + "px"; document.getElementById("lbBot").style.height = lbh + "px";
    const vg = document.getElementById("vignette");
    vg.style.opacity = o.vig + Math.sin(g * 0.9) * 0.04;
    document.getElementById("grade").style.opacity = o.grade;
    drawGrain(Math.floor(g * 30), o.grain);
    for (const fn of fns) fn(t, g);
  };

  // зерно плёнки: детерминированно от номера кадра
  let grainImg = null;
  const drawGrain = (frame, amt) => {
    const c = document.getElementById("grain"); const ctx = c.getContext("2d");
    if (!grainImg) grainImg = ctx.createImageData(640, 360);
    const d = grainImg.data, r = E.rng(frame * 977 + 13);
    for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(grainImg, 0, 0); c.style.opacity = amt;
  };

  // ───────────────────────── эффекты (canvas, чистые функции времени) ─────────────────────────
  const puff = (ctx, x, y, r, c0, c1, a) => {
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.globalAlpha = E.clamp(a); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
  };
  E.puff = puff;
  const fireCol = (k) => { // 0 белый → жёлтый → оранжевый → красно-коричневый → дым
    const st = [[255, 250, 225], [255, 214, 120], [255, 128, 28], [150, 52, 18], [52, 38, 30]];
    const x = E.clamp(k) * (st.length - 1), i = Math.min(st.length - 2, Math.floor(x)), f = x - i;
    const c = st[i].map((v, j) => Math.round(v + (st[i + 1][j] - v) * f)); return c;
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const FX = (E.FXTYPES = {});

  // взрыв: вспышка, огненные клубы, искры, обломки, ударная волна, остаточный дым
  FX.explosion = { life: 7, draw(ctx, u, p) {
    const S = p.size || 1, R = E.rng(p.seed || 1), x0 = p.x, y0 = p.y;
    // ударная волна
    if (u < 0.6) { ctx.strokeStyle = `rgba(255,240,200,${(1 - u / 0.6) * 0.6})`; ctx.lineWidth = 18 * S * (1 - u / 0.6);
      ctx.beginPath(); ctx.ellipse(x0, y0, 40 * S + u * 900 * S, (40 * S + u * 900 * S) * 0.42, 0, 0, 6.2832); ctx.stroke(); }
    // ядро-вспышка
    if (u < 0.25) puff(ctx, x0, y0, 260 * S * (0.6 + u * 3), "rgba(255,255,240,1)", "rgba(255,200,90,0)", 1 - u / 0.25);
    // огненные клубы
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a = R() * 6.2832, sp = (0.4 + R() * 0.8) * 260 * S, d = sp * E.easeOut(u / 1.1), rise = u * u * 40 * S + u * 70 * S;
      const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d * 0.55 - rise - R() * 60 * S;
      const life = 1.6 + R() * 1.6, k = u / life; if (k > 1) continue;
      const r = (50 + R() * 70) * S * (0.5 + E.easeOut(u / 0.7) * 0.9 + k * 0.6);
      const c = fireCol(k * 1.15);
      puff(ctx, x, y, r, rgba(c, 0.95), rgba(c, 0), (1 - Math.pow(k, 3)) * 0.95);
    }
    // искры
    ctx.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI * R(), sp = (500 + R() * 900) * S, g = 900 * S, life = 0.6 + R() * 0.9; if (u > life) { R(); continue; }
      const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, x = x0 + vx * u, y = y0 + vy * u + 0.5 * g * u * u;
      const x2 = x - vx * 0.03, y2 = y - (vy + g * u) * 0.03;
      ctx.strokeStyle = `rgba(255,${200 + R() * 55 | 0},120,${1 - u / life})`; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // обломки
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.1 + R() * 0.8), sp = (400 + R() * 600) * S, g = 1400 * S, life = 1.4;
      if (u > life) { R(); R(); continue; }
      const x = x0 + Math.cos(a) * sp * u, y = y0 + Math.sin(a) * sp * u + 0.5 * g * u * u, rr = (8 + R() * 14) * S;
      ctx.save(); ctx.translate(x, y); ctx.rotate(u * (6 + R() * 10)); ctx.fillStyle = "#1B130B"; ctx.fillRect(-rr, -rr * 0.6, rr * 2, rr * 1.2); ctx.restore();
    }
    // дым, который остаётся
    for (let i = 0; i < 12; i++) {
      const st = 0.4 + R() * 0.6, k = (u - st) / 5.5; if (k < 0 || k > 1) { R(); R(); continue; }
      const x = x0 + (R() - 0.5) * 300 * S + k * 60 * S, y = y0 - 60 * S - k * (260 + R() * 200) * S, r = (90 + 160 * k) * S;
      puff(ctx, x, y, r, "rgba(60,46,36,0.75)", "rgba(60,46,36,0)", Math.sin(k * Math.PI) * 0.8);
    }
  } };

  // постоянный столб дыма на горизонте (для дальнего плана)
  FX.smokeColumn = { life: 999, draw(ctx, u, p) {
    const S = p.size || 1, n = 16, col = p.color || "70,52,38";
    for (let i = 0; i < n; i++) {
      const ph = ((u * (p.speed || 0.06)) + i / n) % 1, R = E.hash(i * 3.1 + (p.seed || 0));
      const x = p.x + Math.sin(ph * 5 + R * 6) * 30 * S + ph * (p.wind || 220) * S, y = p.y - ph * (p.h || 620) * S, r = (40 + ph * 170) * S;
      puff(ctx, x, y, r, `rgba(${col},${0.55 * (1 - ph)})`, `rgba(${col},0)`, Math.min(1, ph * 6));
    }
  } };

  // дульная вспышка
  FX.muzzle = { life: 0.12, draw(ctx, u, p) {
    const k = 1 - u / 0.12, S = p.size || 1; ctx.translate(p.x, p.y); ctx.rotate(p.a || 0);
    puff(ctx, 0, 0, 90 * S, "rgba(255,250,220,1)", "rgba(255,170,60,0)", k);
    ctx.fillStyle = `rgba(255,235,170,${k})`; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.2832, r = (i % 2 ? 20 : 70 + (i === 0 ? 60 : 0)) * S; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); }
    ctx.fill();
  } };

  // трассер пули
  FX.tracer = { life: 0.16, draw(ctx, u, p) {
    const k = u / 0.16, x = E.lerp(p.x, p.x2, k), y = E.lerp(p.y, p.y2, k), x1 = E.lerp(p.x, p.x2, Math.max(0, k - 0.35)), y1 = E.lerp(p.y, p.y2, Math.max(0, k - 0.35));
    const g = ctx.createLinearGradient(x1, y1, x, y); g.addColorStop(0, "rgba(255,220,140,0)"); g.addColorStop(1, "rgba(255,245,210,0.95)");
    ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
  } };

  // фейерверк в ангаре: ракеты-шутихи + разноцветные шары
  FX.fireworks = { life: 4.5, draw(ctx, u, p) {
    const R = E.rng(p.seed || 3), cols = ["255,90,60", "255,214,90", "120,230,120", "90,170,255", "240,120,255", "255,255,255"];
    for (let b = 0; b < (p.n || 9); b++) {
      const st = R() * 1.6, ax = p.x + (R() - 0.5) * 300, ty = p.y - 250 - R() * 330, tx = ax + (R() - 0.5) * 700, col = cols[(R() * cols.length) | 0];
      const fly = 0.35 + R() * 0.25, uu = u - st; if (uu < 0) { for (let k = 0; k < 30; k++) R(); continue; }
      if (uu < fly) { const k = E.easeOut(uu / fly), x = E.lerp(ax, tx, k), y = E.lerp(p.y, ty, k);
        ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(E.lerp(ax, tx, k * 0.85), E.lerp(p.y, ty, k * 0.85)); ctx.stroke();
        puff(ctx, x, y, 22, `rgba(${col},1)`, `rgba(${col},0)`, 1);
        for (let k2 = 0; k2 < 30; k2++) R(); continue; }
      const v = uu - fly, life = 1.5;
      if (v < 0.12) puff(ctx, tx, ty, 160, `rgba(255,255,240,0.9)`, `rgba(${col},0)`, 1 - v / 0.12);
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * 6.2832 + R() * 0.2, sp = 260 + R() * 160; if (v > life) continue;
        const x = tx + Math.cos(a) * sp * E.easeOut(v / 0.9), y = ty + Math.sin(a) * sp * E.easeOut(v / 0.9) + v * v * 160;
        const al = (1 - v / life) * (0.6 + 0.4 * Math.sin(v * 40 + k));
        puff(ctx, x, y, 12, `rgba(${col},${al})`, `rgba(${col},0)`, 1);
        ctx.fillStyle = `rgba(255,255,235,${al})`; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
  } };

  // искры (короткое замыкание, детонатор, удар)
  FX.sparks = { life: 0.9, draw(ctx, u, p) {
    const R = E.rng(p.seed || 9), n = p.n || 24; ctx.lineCap = "round";
    if (u < 0.1) puff(ctx, p.x, p.y, 80, "rgba(255,255,230,1)", "rgba(255,200,90,0)", 1 - u / 0.1);
    for (let i = 0; i < n; i++) {
      const a = (p.a || -1.57) + (R() - 0.5) * (p.spread || 3), sp = 300 + R() * 700, life = 0.3 + R() * 0.6; if (u > life) continue;
      const x = p.x + Math.cos(a) * sp * u, y = p.y + Math.sin(a) * sp * u + 700 * u * u;
      ctx.strokeStyle = `rgba(255,${210 + R() * 45 | 0},140,${1 - u / life})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 26, y - Math.sin(a) * 26 - 20 * u); ctx.stroke();
    }
  } };

  // дождь (наклонные штрихи) — p: плотность, скорость
  FX.rain = { life: 999, draw(ctx, u, p) {
    const n = p.n || 140, X = p.x || 0, Y = p.y || 0, W = p.w || 1920, H = p.h || 1080;
    ctx.strokeStyle = p.color || "rgba(220,200,160,0.35)"; ctx.lineWidth = p.lw || 2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const r1 = E.hash(i * 1.37 + (p.seed || 0)), r2 = E.hash(i * 7.91 + 3), sp = (p.speed || 1900) * (0.8 + r2 * 0.4);
      const y = Y + ((r2 * H + u * sp) % H), x = X + ((r1 * W + y * 0.18) % W), l = (p.len || 46) * (0.7 + r2 * 0.6);
      ctx.moveTo(x, y); ctx.lineTo(x - l * 0.18, y - l); }
    ctx.stroke();
  } };

  // пылинки / пепел
  FX.motes = { life: 999, draw(ctx, u, p) {
    const n = p.n || 60, W = p.w || 1920, H = p.h || 1080;
    for (let i = 0; i < n; i++) { const r1 = E.hash(i * 2.13 + (p.seed || 0)), r2 = E.hash(i * 5.7 + 1), r3 = E.hash(i * 9.1 + 2);
      const y = (p.y || 0) + ((r2 * H + u * (p.fall || 30) * (0.5 + r3)) % H), x = (p.x || 0) + ((r1 * W + Math.sin(u * 0.7 + i) * 40 + u * (p.wind || 15)) % W);
      const s = (p.size || 3) * (0.5 + r3);
      ctx.fillStyle = `rgba(${p.color || "255,226,170"},${(p.a || 0.5) * (0.4 + 0.6 * Math.sin(u * 1.3 + i * 2) ** 2)})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, 6.2832); ctx.fill(); }
  } };

  // пена пожаротушения: пузыри заполняют область снизу вверх
  FX.foam = { life: 999, draw(ctx, u, p) {
    const R = E.rng(p.seed || 4), n = p.n || 260, lvl = E.easeOut(u / (p.fill || 2.2));
    for (let i = 0; i < n; i++) {
      const bx = p.x + R() * p.w, by0 = p.y + p.h, by = by0 - R() * p.h * lvl - Math.sin(u * 2 + i) * 6, r = (14 + R() * 34) * (0.3 + lvl * 0.7);
      const delay = R() * 0.6; if (u < delay) continue;
      ctx.fillStyle = "rgba(250,247,238,0.96)"; ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgba(205,214,220,0.55)"; ctx.beginPath(); ctx.arc(bx + r * 0.25, by + r * 0.25, r * 0.7, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(bx - r * 0.35, by - r * 0.35, r * 0.22, 0, 6.2832); ctx.fill();
    }
    // струи из форсунок
    if (p.jets) for (const j of p.jets) for (let k = 0; k < 14; k++) { const ph = (u * 2.2 + k / 14) % 1;
      puff(ctx, j[0] + (E.hash(k) - 0.5) * 200 * ph, j[1] + ph * 600, 18 + ph * 40, "rgba(255,255,255,0.9)", "rgba(255,255,255,0)", 1 - ph); }
  } };

  // ядерный гриб: вспышка → огненный шар → ножка и шляпка → кольцо конденсата
  FX.nuke = { life: 30, draw(ctx, u, p) {
    const S = p.size || 1, x0 = p.x, y0 = p.y, R = E.rng(p.seed || 7);
    if (u < 0.5) puff(ctx, x0, y0 - 100 * S, 1400 * S * (0.4 + u), "rgba(255,255,245,1)", "rgba(255,230,160,0)", 1 - u / 0.5);
    const rise = E.easeOut(u / 7) * 720 * S, capY = y0 - 140 * S - rise, capR = (160 + E.easeOut(u / 6) * 300) * S;
    // ножка
    for (let i = 0; i < 26; i++) { const k = i / 25, y = E.lerp(y0, capY + capR * 0.3, k), w = (70 + (1 - k) * 60 + Math.sin(u * 3 + i) * 8) * S * (0.6 + E.easeOut(u / 3) * 0.6);
      const heat = E.clamp(1 - u / 9 - k * 0.2); const c = fireCol(1 - heat * 0.85);
      puff(ctx, x0 + Math.sin(i * 1.7 + u) * 12 * S, y, w, rgba(c, 0.95), rgba(c, 0), E.clamp(u * 2)); }
    // шляпка: тор из клубов, крутится
    for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.2832 + u * 0.35, rr = capR * (0.55 + R() * 0.25);
      const x = x0 + Math.cos(a) * rr, y = capY + Math.sin(a) * rr * 0.42 - R() * capR * 0.2;
      const heat = E.clamp(1 - u / 8 + (Math.sin(a) > 0 ? 0.15 : -0.1)); const c = fireCol(1 - heat * 0.9);
      puff(ctx, x, y, capR * (0.35 + R() * 0.2), rgba(c, 1), rgba(c, 0), E.clamp(u * 1.5)); }
    puff(ctx, x0, capY - capR * 0.15, capR * 0.75, rgba(fireCol(E.clamp(u / 9) * 0.9 + 0.1), 1), "rgba(255,120,30,0)", E.clamp(u * 1.5));
    // кольцо конденсата
    if (u > 1.5) { const k = E.clamp((u - 1.5) / 4); ctx.strokeStyle = `rgba(255,240,215,${0.5 * (1 - k)})`; ctx.lineWidth = 40 * S * (1 - k);
      ctx.beginPath(); ctx.ellipse(x0, capY + capR * 0.9, capR * (1.2 + k * 1.4), capR * (0.25 + k * 0.3), 0, 0, 6.2832); ctx.stroke(); }
    // пыль по земле
    for (let i = 0; i < 24; i++) { const a = R() < 0.5 ? -1 : 1, d = E.easeOut(u / 4) * (300 + R() * 1400) * S;
      puff(ctx, x0 + a * d, y0 - R() * 80 * S, (100 + R() * 140) * S * (0.5 + E.easeOut(u / 4)), "rgba(120,86,56,0.8)", "rgba(120,86,56,0)", E.clamp(u * 2) * 0.85); }
  } };

  // огонь факела (рисуется в точке, следуя за функцией позиции)
  FX.flame = { life: 999, draw(ctx, u, p) {
    const pos = p.pos(); if (!pos) return; const S = p.size || 1;
    for (let i = 0; i < 9; i++) { const ph = (u * 3.2 + i / 9) % 1, x = pos[0] + Math.sin(u * 9 + i * 2) * 10 * S * ph, y = pos[1] - ph * 110 * S;
      const c = fireCol(0.1 + ph * 0.9); puff(ctx, x, y, (36 - ph * 18) * S, rgba(c, 0.95), rgba(c, 0), 1 - ph); }
    puff(ctx, pos[0], pos[1] - 20 * S, 140 * S, "rgba(255,190,90,0.35)", "rgba(255,190,90,0)", 1);
  } };

  // ─────────────── свет: мягкие пятна поверх сцены (DOM, mix-blend) ───────────────
  E.glow = (layerEl, x, y, r, color, op = 1) => {
    const d = E.el("div", { class: "glow" }, layerEl);
    Object.assign(d.style, { left: x - r + "px", top: y - r + "px", width: 2 * r + "px", height: 2 * r + "px", background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, opacity: op });
    return d;
  };

  // ─────────────── голос: реплики, липсинк и метки для сведения ───────────────
  window.__cues = [];
  E.say = (ch, id, t, { gain = 1 } = {}) => {
    const v = window.VOICE[id]; if (!v) { console.warn("no voice", id); return 0; }
    window.__cues.push({ id, t, gain });
    if (ch) ch.lines.push({ t, env: v.env, dur: v.dur });
    return v.dur;
  };
  E.vdur = (id) => window.VOICE[id].dur;
})();
