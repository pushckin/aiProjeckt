// sets.js — декорации: небо, силуэты ЛЭП/вертолётов/холмов, забор, вышка, ящики, лампы.
(function () {
  const SET = (window.SET = {});
  const K = "#1B130B";
  // svg-полотно внутри слоя
  SET.svg = (layerEl, w, h, inner, { x = 0, y = 0, cls = "" } = {}) => {
    const d = E.el("div", { class: "abs " + cls }, layerEl);
    Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    d.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">${inner}</svg>`;
    return d;
  };
  SET.box = (layerEl, x, y, w, h, style = {}) => { const d = E.el("div", { class: "abs" }, layerEl); Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px", ...style }); return d; };

  // линия холмов
  SET.hills = (w, base, amp, seed, fill, { step = 60, h = 1400 } = {}) => {
    let d = `M0,${h} L0,${base}`;
    for (let x = 0; x <= w + step; x += step) d += ` L${x},${base - amp * (0.5 + 0.5 * E.noise1(x / 380 + seed)) - amp * 0.35 * E.noise1(x / 120 + seed * 3)}`;
    return `<path d="${d} L${w + step},${h} Z" fill="${fill}"/>`;
  };
  // ЛЭП: решётчатая опора
  SET.pylon = (x, base, h, col, sw = 5) => {
    const w0 = h * 0.22, w1 = h * 0.05, top = base - h; let s = `<g stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round">`;
    s += `<path d="M${x - w0},${base} L${x - w1},${top} M${x + w0},${base} L${x + w1},${top}"/>`;
    const n = 9; for (let i = 0; i < n; i++) { const k0 = i / n, k1 = (i + 1) / n, y0 = base - h * k0, y1 = base - h * k1, a0 = E.lerp(w0, w1, k0), a1 = E.lerp(w0, w1, k1);
      s += `<path d="M${x - a0},${y0} L${x + a1},${y1} M${x + a0},${y0} L${x - a1},${y1} M${x - a1},${y1} L${x + a1},${y1}"/>`; }
    [0.12, 0.3].forEach((k, i) => { const y = top + h * k, a = h * (0.32 - i * 0.07); s += `<path d="M${x - a},${y} L${x + a},${y} M${x - a},${y} L${x - w1 * 2},${y - h * 0.06} M${x + a},${y} L${x + w1 * 2},${y - h * 0.06}"/>`; });
    return s + `</g>`;
  };
  // провода между опорами
  SET.wires = (x1, x2, y, sag, col) => [0, 1, 2].map((i) => `<path d="M${x1},${y + i * 22} Q${(x1 + x2) / 2},${y + sag + i * 22} ${x2},${y + i * 22}" stroke="${col}" stroke-width="2.5" fill="none"/>`).join("");
  // вертолёт-силуэт; винт анимируется через класс .rotor
  SET.heli = (col = "#2B2016") => `<g fill="${col}"><ellipse cx="0" cy="0" rx="120" ry="46"/><path d="M90,-10 L300,-22 L300,-6 L100,18z"/><path d="M285,-60 l28,0 l-6,58 l-26,0z"/>
     <rect x="-70" y="40" width="150" height="8" rx="4"/><rect x="-50" y="30" width="8" height="16"/><rect x="40" y="30" width="8" height="16"/><rect x="-8" y="-62" width="16" height="20"/>
     <path d="M-60,-20 q30,-30 90,-6 l-10,20z" fill="rgba(255,220,150,0.35)"/></g><g class="rotor"><rect x="-260" y="-70" width="520" height="7" rx="3" fill="${col}" opacity="0.8"/></g>`;
  // кусты
  SET.bush = (x, y, s, col = "#2F3A1E", col2 = "#3E4C26") => {
    let p = `<g transform="translate(${x},${y}) scale(${s})">`;
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI, r = 60 + E.hash(i + x) * 30; p += `<circle cx="${-Math.cos(a) * 110}" cy="${-Math.sin(a) * 70 + 10}" r="${r}" fill="${col}" stroke="${K}" stroke-width="6"/>`; }
    for (let i = 0; i < 5; i++) p += `<circle cx="${-80 + i * 40}" cy="${-40 - E.hash(i * 3 + x) * 30}" r="${30}" fill="${col2}"/>`;
    return p + `</g>`;
  };
  // забор с колючкой
  SET.fence = (x0, x1, y, h, col = "#2B2016") => {
    let s = `<g stroke="${col}" fill="none">`;
    for (let x = x0; x <= x1; x += 220) s += `<path d="M${x},${y} L${x},${y - h} L${x + 30},${y - h - 40}" stroke-width="12"/>`;
    s += `<path d="M${x0},${y - h * 0.05} L${x1},${y - h * 0.05} M${x0},${y - h} L${x1},${y - h}" stroke-width="7"/>`;
    for (let x = x0; x < x1; x += 34) s += `<path d="M${x},${y - h} L${x + 34},${y} M${x + 34},${y - h} L${x},${y}" stroke-width="2.5" opacity="0.7"/>`;
    for (let x = x0; x < x1; x += 44) s += `<circle cx="${x}" cy="${y - h - 24}" r="20" stroke-width="3"/>`;
    return s + `</g>`;
  };
  // вышка
  SET.tower = (x, base, h, col = "#3A2A1C") => `<g stroke="${K}" stroke-width="6" fill="${col}">
     <path d="M${x - 90},${base} L${x - 60},${base - h} M${x + 90},${base} L${x + 60},${base - h} M${x - 80},${base - h * 0.3} L${x + 70},${base - h * 0.62} M${x + 80},${base - h * 0.3} L${x - 70},${base - h * 0.62}" fill="none" stroke="${col}" stroke-width="16"/>
     <rect x="${x - 120}" y="${base - h - 20}" width="240" height="34"/><rect x="${x - 120}" y="${base - h - 120}" width="240" height="20"/><path d="M${x - 140},${base - h - 120} L${x},${base - h - 190} L${x + 140},${base - h - 120}z"/>
     <path d="M${x - 110},${base - h - 100} v80 M${x + 110},${base - h - 100} v80" stroke-width="8"/></g>`;
  // ящик
  SET.crate = (x, y, w, h, label = "", col = "#7A5A33") => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="${K}" stroke-width="6" rx="4"/>
     <path d="M${x + 10},${y + 10} L${x + w - 10},${y + h - 10} M${x + w - 10},${y + 10} L${x + 10},${y + h - 10}" stroke="#5A3F22" stroke-width="9"/><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="none" stroke="#5A3F22" stroke-width="6"/>
     ${label ? `<rect x="${x + w / 2 - 80}" y="${y + h / 2 - 24}" width="160" height="48" fill="#E9B949" stroke="${K}" stroke-width="4"/><text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" font-family="Russo One" font-size="30" fill="${K}">${label}</text>` : ""}</g>`;
  // висячая лампа
  SET.lamp = (x, y, len = 160) => `<g><path d="M${x},${y - len} V${y}" stroke="${K}" stroke-width="5"/><path d="M${x - 60},${y + 40} Q${x},${y - 30} ${x + 60},${y + 40}z" fill="#3B3B30" stroke="${K}" stroke-width="5"/>
     <ellipse cx="${x}" cy="${y + 42}" rx="24" ry="10" fill="#FFF1C8"/></g>`;
  // радиальный «солнечный» свет
  SET.sun = (layerEl, x, y, r, col = "rgba(255,236,190,0.9)") => E.glow(layerEl, x, y, r, col, 1);
})();
