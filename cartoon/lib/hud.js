// hud.js — титры и плашки в стиле трейлера WARDOGS (Russo One + жёлтый тег + белая рамка).
(function () {
  const H = (window.H = {});
  const el = (html, style) => { const d = E.el("div", { class: "abs" }, E.hud, html); Object.assign(d.style, style || {}); return d; };
  H.el = el;
  // глитч текста: RGB-расслоение и ступенчатый сдвиг
  H.glitchText = (node, t, dur = 0.4) => { E.sfx(t, "glitch", { dur: dur * 0.8 });
    E.onFrame((tt, g) => { const u = (tt - t) / dur; if (u < 0 || u > 1) { if (node._gl === t) { node.style.textShadow = ""; node.style.translate = ""; node._gl = null; } return; }
      node._gl = t; const a = Math.sin(u * Math.PI), fr = Math.floor(g * 30), d = (4 + 10 * E.hash(fr + 3)) * a;
      node.style.textShadow = `${d}px 0 0 rgba(255,40,40,.85), ${-d}px 0 0 rgba(40,255,255,.85)`; node.style.translate = `${(E.hash(fr) - 0.5) * 40 * a}px 0`; }); };

  // глава: жёлтый тег + крупное название, раскрытие маской, уход маской вправо
  H.chapter = (t, num, title, dur = 3.4, pos = { left: "110px", bottom: "150px" }) => {
    const d = el(`<div class="tag y" style="font-size:42px;display:inline-block">ГЛАВА ${num}</div>
      <div class="logo" style="font-size:118px;margin-top:14px">${title}</div>
      <div style="height:6px;width:420px;background:#F5F1E6;margin-top:18px"></div>`, pos);
    Object.assign(d.style, { background: "rgba(11,9,6,0.62)", padding: "22px 34px 26px" });
    gsap.set(d, { opacity: 0 }); E.tl.to(d, { opacity: 1, duration: 0.3, ease: "power2.out" }, t - 0.05); E.tl.to(d, { opacity: 0, duration: 0.35, ease: "power2.in" }, t + dur + 0.25);
    const [tag, ttl, line] = d.children;
    [tag, ttl, line].forEach((n) => gsap.set(n, { clipPath: "inset(0% 100% 0% 0%)" }));
    E.tl.to(tag, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: "power3.out" }, t);
    E.tl.to(ttl, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.out" }, t + 0.15);
    E.tl.to(line, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power2.inOut" }, t + 0.3);
    gsap.set(d, { x: 0 }); E.tl.to(d, { x: 26, duration: dur, ease: "none" }, t);
    [line, ttl, tag].forEach((n, i) => E.tl.to(n, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.45, ease: "power3.in" }, t + dur + i * 0.08));
    E.sfx(t, "whoosh", { dur: 0.5, gain: 0.12 }); E.sfx(t + 0.15, "hit", { gain: 0.18 });
    H.glitchText(d, t, 0.45); H.glitchText(d, t + dur + 0.1, 0.4);
    return d;
  };

  // удар слова (№53 · Спетые слоги бьют по одному на удар): влетает крупно с размытием, дрейфует, уходит наклоном в 3D
  H.slam = (text, t, hold, { size = 220, x = 960, y = 540, color = "#F5F1E6", from = 1.8, rot = 0, exit = "tip", cls = "word" } = {}) => {
    const d = el(`<div class="${cls}" style="font-size:${size}px;color:${color};position:relative;left:-50%">${text}</div>`, { left: x + "px", top: y - size * 0.55 + "px", perspective: "900px" });
    const w = d.firstChild;
    gsap.set(w, { opacity: 0, scale: from, filter: "blur(16px)", rotation: rot });
    E.tl.to(w, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.24, ease: "power3.out" }, t);
    E.tl.to(w, { scale: 1.05, duration: hold, ease: "none" }, t + 0.24);
    if (exit === "tip") E.tl.to(w, { rotationX: 75, y: -60, opacity: 0, filter: "blur(10px)", duration: 0.3, ease: "power2.in" }, t + 0.24 + hold);
    else if (exit === "fall") E.tl.to(w, { rotationX: -80, y: 80, opacity: 0, duration: 0.3, ease: "power2.in" }, t + 0.24 + hold);
    return d;
  };

  // карточка бойца для переклички: тег класса, имя, статы с полосками
  H.card = (t, dur, { cls, rank = "", name, stats = [], x = 120, y = 250, accent = "#E9B949" }) => {
    const rows = stats.map(([k, v]) => typeof v === "number"
      ? `<div style="display:flex;align-items:center;gap:22px;margin-top:16px"><div class="tag w" style="font-size:44px;width:300px">${k}</div>
          <div style="width:340px;height:28px;border:5px solid #F5F1E6;padding:4px"><div class="bar" data-v="${v}" style="height:100%;width:0%;background:${accent}"></div></div></div>`
      : `<div style="display:flex;align-items:center;gap:22px;margin-top:16px"><div class="tag w" style="font-size:44px;width:300px">${k}</div><div class="tag" style="font-size:50px;color:${accent};text-shadow:0 3px 0 rgba(0,0,0,.5)">${v}</div></div>`).join("");
    const d = el(`<div class="tag y" style="font-size:40px;display:inline-block">${cls}</div>
      <div class="tag w" style="font-size:44px;margin-top:22px">${rank}</div><div class="logo" style="font-size:170px;margin:2px 0 10px">${name}</div>${rows}`, { left: x + "px", top: y + "px" });
    const kids = [...d.children];
    kids.forEach((n) => gsap.set(n, { clipPath: "inset(0% 100% 0% 0%)", x: -30 }));
    kids.forEach((n, i) => E.tl.to(n, { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.55, ease: "power3.out" }, t + i * 0.09));
    d.querySelectorAll(".bar").forEach((b, i) => E.tl.to(b, { width: Math.round(+b.dataset.v * 100) + "%", duration: 0.7, ease: "power2.out" }, t + 0.5 + i * 0.12));
    kids.slice().reverse().forEach((n, i) => E.tl.to(n, { clipPath: "inset(0% 0% 0% 100%)", x: 30, duration: 0.35, ease: "power2.in" }, t + dur + i * 0.05));
    E.sfx(t, "whoosh", { dur: 0.45, gain: 0.1 });
    stats.forEach((s, i) => typeof s[1] === "number" && E.sfx(t + 0.5 + i * 0.12, "tick", { gain: 0.08 }));
    return d;
  };

  // индикатор рации: точка + имя + живая волна по огибающей реплики
  H.radio = (t, id, who, { x = 110, y = 110 } = {}) => {
    const dur = E.vdur(id);
    const bars = Array.from({ length: 14 }, () => `<div style="width:9px;background:#E9B949;height:6px;border-radius:2px"></div>`).join("");
    const d = el(`<div style="display:flex;align-items:center;gap:18px"><div class="dot" style="width:22px;height:22px;border-radius:50%;background:#E2372C"></div>
      <div class="radio" style="font-size:40px">РАЦИЯ · ${who}</div><div class="wv" style="display:flex;align-items:center;gap:5px;height:50px;margin-left:10px">${bars}</div></div>`, { left: x + "px", top: y + "px" });
    gsap.set(d, { opacity: 0, x: -30 });
    E.tl.to(d, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t - 0.25);
    E.tl.to(d, { opacity: 0, x: -20, duration: 0.35, ease: "power2.in" }, t + dur + 0.2);
    const env = window.VOICE[id].env, bs = [...d.querySelectorAll(".wv div")], dot = d.querySelector(".dot");
    E.onFrame((tt) => { const u = tt - t; if (u < -0.4 || u > dur + 0.6) return; const i = Math.max(0, Math.floor(u * 60)), v = u >= 0 && u < dur ? env[Math.min(env.length - 1, i)] || 0 : 0;
      bs.forEach((b, k) => { b.style.height = 6 + v * 44 * (0.45 + 0.55 * Math.abs(Math.sin(k * 1.9 + tt * 11))) + "px"; }); dot.style.opacity = 0.5 + 0.5 * Math.sin(tt * 8) ** 2; });
    E.sfx(t - 0.12, "radio"); E.sfx(t + dur + 0.05, "radio", { off: true }); E.sfx(t - 0.05, "hiss", { dur: dur + 0.15 });
    return d;
  };

  // крупная надпись-вставка (таймер, «ЗАГРУЗКА» и т.п.)
  H.big = (t, dur, html, { size = 300, color = "#E2372C", x = 960, y = 540, font = "Russo One" } = {}) => {
    const d = el(`<div style="font-family:'${font}';font-size:${size}px;color:${color};position:relative;left:-50%;white-space:nowrap;text-align:center;line-height:1">${html}</div>`, { left: x + "px", top: y - size * 0.5 + "px" });
    const w = d.firstChild; gsap.set(w, { opacity: 0, scale: 1.4, filter: "blur(12px)" });
    E.tl.to(w, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.2, ease: "power3.out" }, t);
    E.tl.to(w, { opacity: 0, scale: 0.92, duration: 0.2, ease: "power2.in" }, t + dur);
    return d;
  };
})();
