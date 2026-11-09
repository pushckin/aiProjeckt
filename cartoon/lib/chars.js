// chars.js — мультяшные персонажи: SVG-риг + состояние, которое твинит GSAP, + процедурная жизнь и липсинк.
(function () {
  const C = (window.C = {});
  const K = "#1B130B", SW = 6;
  let uid = 0;
  const NS = "http://www.w3.org/2000/svg";

  // ── палитры персонажей ──
  const SKIN = { schmidt: ["#E2AE84", "#B9845E"], graves: ["#CF9C72", "#A9774F"], bublik: ["#F2BE98", "#D3946C"], lucky: ["#F3C7A0", "#D59E76"],
    gluh: ["#D9A274", "#B47C50"], boss: ["#BD8254", "#93603A"], merc: ["#C99468", "#A2704A"] };
  const SPEC = {
    schmidt: { wt: 172, wb: 150, ht: 150, rh: 100, hx: 34, cloth: "#6E6A3F", clothD: "#4B4728", pants: "#5C5935", hat: "cap" },
    graves:  { wt: 156, wb: 132, ht: 158, rh: 96, hx: 32, cloth: "#4A4A34", clothD: "#2F2F22", pants: "#3E3E2C", hat: "hood" },
    bublik:  { wt: 210, wb: 262, ht: 150, rh: 108, hx: 46, cloth: "#6E6A3F", clothD: "#4B4728", pants: "#5C5935", hat: "tinyhelmet" },
    lucky:   { wt: 120, wb: 108, ht: 162, rh: 94, hx: 26, cloth: "#77723F", clothD: "#514D2A", pants: "#615D36", hat: "bighelmet" },
    gluh:    { wt: 180, wb: 166, ht: 146, rh: 102, hx: 36, cloth: "#6B6740", clothD: "#47442A", pants: "#59562F", hat: "helmet" },
    boss:    { wt: 270, wb: 230, ht: 175, rh: 98, hx: 52, cloth: "#1E1B18", clothD: "#0F0D0B", pants: "#2B2A27", hat: "bald" },
    merc:    { wt: 168, wb: 146, ht: 152, rh: 96, hx: 34, cloth: "#3B3B37", clothD: "#26261F", pants: "#33332E", hat: "balaclava" },
  };

  const svg = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const P = (d, fill, parent, extra = {}) => svg("path", { d, fill, stroke: K, "stroke-width": SW, "stroke-linejoin": "round", "stroke-linecap": "round", ...extra }, parent);
  const G = (parent, tr) => svg("g", tr ? { transform: tr } : {}, parent);
  const rr = (x, y, w, h, r) => `M${x + r},${y} h${w - 2 * r} q${r},0 ${r},${r} v${h - 2 * r} q0,${r} ${-r},${r} h${-(w - 2 * r)} q${-r},0 ${-r},${-r} v${-(h - 2 * r)} q0,${-r} ${r},${-r}z`;

  // ── реквизит (начало координат — хват в кисти, ствол вдоль +x) ──
  const PROPS = {
    rifle: (g) => { P(rr(-80, -14, 120, 26, 8), "#7B4E27", g); P(rr(-10, -20, 150, 30, 6), "#2A2622", g); P(rr(130, -12, 90, 12, 4), "#2A2622", g);
      P("M40,8 q8,40 -6,62 l-24,-6 q14,-22 6,-52z", "#2A2622", g); P(rr(150, -26, 8, 16, 2), "#2A2622", g); },
    sniper: (g) => { P(rr(-90, -16, 130, 30, 10), "#3D3B2A", g); P(rr(0, -18, 170, 28, 6), "#2A2622", g); P(rr(160, -9, 200, 11, 4), "#2A2622", g);
      P(rr(30, -56, 110, 26, 12), "#1B1A16", g); svg("circle", { cx: 140, cy: -43, r: 9, fill: "#E9B949", stroke: K, "stroke-width": 4 }, g);
      P("M360,-16 v24", "none", g); P("M60,10 l-12,40 M110,10 l14,40", "none", g); },
    grenade: (g) => { P("M-4,-30 a24,28 0 1,0 8,0z", "#56603A", g); P("M-8,-32 h20 v-10 h-20z", "#2A2622", g); P("M10,-38 q22,-4 20,22", "none", g);
      svg("circle", { cx: -14, cy: -44, r: 9, fill: "none", stroke: "#C9C1A8", "stroke-width": 4 }, g); P("M-16,-20 h28 M-18,-6 h34", "none", g, { "stroke-width": 3 }); },
    grenadeNoPin: (g) => { P("M-4,-30 a24,28 0 1,0 8,0z", "#56603A", g); P("M-8,-32 h20 v-10 h-20z", "#2A2622", g); P("M-16,-20 h28 M-18,-6 h34", "none", g, { "stroke-width": 3 }); },
    torch: (g) => { P(rr(-9, -150, 18, 170, 7), "#6E4524", g); P(rr(-16, -170, 32, 36, 8), "#8C7A5C", g); G(g).setAttribute("class", "flame"); },
    can: (g) => { P(rr(-30, -62, 60, 64, 10), "#9A9A92", g); P(rr(-30, -46, 60, 30, 2), "#B8442E", g, { "stroke-width": 4 });
      svg("text", { x: 0, y: -25, "text-anchor": "middle", "font-family": "Rubik", "font-weight": 900, "font-size": 15, fill: "#F5F1E6" }, g).textContent = "ТУШЁНКА"; },
    detonator: (g) => { P(rr(-46, -40, 92, 56, 8), "#5A5440", g); svg("circle", { cx: 0, cy: -12, r: 16, fill: "#E2372C", stroke: K, "stroke-width": 5 }, g); P("M30,16 q30,10 60,0", "none", g, { "stroke-width": 4 }); },
    borscht: (g) => { P(rr(-46, -44, 92, 60, 6), "#A6302A", g); P(rr(-40, -36, 80, 22, 3), "#F2C77A", g, { "stroke-width": 3 });
      svg("text", { x: 0, y: -19, "text-anchor": "middle", "font-family": "Russo One", "font-size": 17, fill: "#1B130B" }, g).textContent = "БОРЩ"; },
    flash: (g) => { P(rr(-12, -40, 24, 46, 5), "#E9B949", g); P(rr(-8, -56, 16, 18, 2), "#BFBFBF", g, { "stroke-width": 4 }); },
    knife: (g) => { P(rr(-8, -10, 46, 20, 6), "#2A2622", g); P("M38,-10 l70,4 q6,6 0,12 l-70,4z", "#D8D4C8", g); },
    radio: (g) => { P(rr(-18, -64, 36, 70, 7), "#2A2622", g); P("M10,-64 v-34", "none", g); svg("rect", { x: -11, y: -54, width: 22, height: 14, fill: "#E9B949" }, g); },
    pin: (g) => { svg("circle", { cx: 0, cy: -10, r: 12, fill: "none", stroke: "#C9C1A8", "stroke-width": 5 }, g); P("M10,-4 l16,8", "none", g, { "stroke-width": 4, stroke: "#C9C1A8" }); },
    battery: (g) => { P(rr(-70, -150, 140, 160, 18), "#5E6A4A", g); P(rr(-50, -172, 100, 26, 6), "#3B3B34", g);
      const s = G(g, "translate(0,-80)"); svg("circle", { r: 40, fill: "#E9B949", stroke: K, "stroke-width": 5 }, s);
      for (let i = 0; i < 3; i++) P(`M0,0 L${34 * Math.cos(i * 2.094 - 1.57 + 0.5)},${34 * Math.sin(i * 2.094 - 1.57 + 0.5)} A34,34 0 0,1 ${34 * Math.cos(i * 2.094 - 1.57 - 0.5)},${34 * Math.sin(i * 2.094 - 1.57 - 0.5)}z`, K, s, { "stroke-width": 0 });
      svg("circle", { r: 9, fill: "#E9B949" }, s);
      svg("circle", { class: "blink", cx: 46, cy: -130, r: 11, fill: "#FF3B2C", stroke: K, "stroke-width": 4 }, g);
      const scr = svg("rect", { class: "screen", x: -48, y: -30, width: 96, height: 30, rx: 4, fill: "#200A08", stroke: K, "stroke-width": 4 }, g);
      svg("text", { class: "timer", x: 0, y: -8, "text-anchor": "middle", "font-family": "Russo One", "font-size": 22, fill: "#FF3B2C" }, g).textContent = "";
      scr; },
    gatling: (g) => { P(rr(-60, -40, 130, 80, 14), "#2E2B27", g); const b = G(g); b.setAttribute("class", "barrels");
      for (let i = 0; i < 4; i++) P(rr(60, -30 + i * 15, 210, 12, 5), "#3E3A35", b, { "stroke-width": 4 });
      P(rr(250, -38, 26, 76, 8), "#2E2B27", g); P(rr(-30, 30, 60, 70, 10), "#5A3E22", g); P("M-40,-40 q-30,-60 40,-70", "none", g, { "stroke-width": 8 }); },
    cig: (g) => { P(rr(0, -5, 44, 10, 4), "#F5F1E6", g, { "stroke-width": 3 }); svg("rect", { x: 40, y: -5, width: 8, height: 10, fill: "#FF7A1A" }, g); },
  };
  C.PROPS = PROPS;

  // ── сборка персонажа ──
  C.make = (type, layerEl, { x = 960, y = 900, sc = 1, outfit = "uniform", seed = 1, z } = {}) => {
    const id = "c" + ++uid, S = SPEC[type], [skin, skinD] = SKIN[type];
    const wrap = document.createElement("div"); wrap.className = "char"; layerEl.appendChild(wrap);
    if (z != null) wrap.style.zIndex = z;
    const root = svg("svg", { width: 900, height: 900, viewBox: "-450 -760 900 900", overflow: "visible" }, wrap);
    const defs = svg("defs", {}, root);
    const grad = svg("linearGradient", { id: id + "sh", x1: 0, y1: 0, x2: 1, y2: 0.25 }, defs);
    [[0, "#FFD99A", 0.55], [0.16, "#FFD99A", 0], [0.58, "#000", 0], [1, "#000", 0.38]].forEach(([o, c, a]) => svg("stop", { offset: o, "stop-color": c, "stop-opacity": a }, grad));
    const shG = svg("radialGradient", { id: id + "sd" }, defs);
    svg("stop", { offset: 0, "stop-color": "#000", "stop-opacity": 0.5 }, shG); svg("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0 }, shG);
    const shade = (d, parent) => svg("path", { d, fill: `url(#${id}sh)` }, parent);
    const part = (d, fill, parent, ex) => { P(d, fill, parent, ex); shade(d, parent); };

    const st = { x, y, sc, op: 1, rot: 0, lean: 0, bob: 0, sqx: 1, sqy: 1, turn: 0, head: 0, armLu: 8, armLl: 10, armRu: 8, armRl: 10, legL: 0, legR: 0,
      walk: 0, walkAmp: 0, lid: 0, brow: 0, smile: 0.2, mouthOpen: 0, eyeWide: 0, px: 0, py: 0, twitch: 0, talkGain: 1, propR: 0, propL: 0, blush: 0, tear: 0, soot: 0, jump: 0 };
    const ch = { type, id, wrap, st, lines: [], seed, props: {}, S };

    // тень
    svg("ellipse", { cx: 0, cy: 6, rx: S.wb * 0.62 + 30, ry: 22, fill: `url(#${id}sd)` }, root);
    const body = G(root); ch.g = { body };
    // ноги
    const leg = (side) => { const g = G(body); const k = side === "L" ? -1 : 1;
      part(rr(-24, 0, 48, 112, 20), S.pants, g);
      if (type === "bublik" && outfit === "undies") { g.innerHTML = ""; part(rr(-22, 0, 44, 112, 20), skin, g); }
      part(rr(-33 + k * 6, 96, 66, 34, 13), "#2A2219", g);
      P(`M${-24 + k * 6},118 h48`, "none", g, { stroke: "#4A3A2A", "stroke-width": 4 });
      return g; };
    ch.g.legL = leg("L"); ch.g.legR = leg("R");
    if (type === "lucky") { const sk = G(body); sk.setAttribute("class", "skate"); sk.style.display = "none"; ch.g.skate = sk;
      P(rr(-120, 126, 240, 18, 9), "#C9442E", sk); [-80, 80].forEach((xx) => svg("circle", { cx: xx, cy: 154, r: 13, fill: "#F2C77A", stroke: K, "stroke-width": 5 }, sk)); }
    // торс
    const torso = G(body); ch.g.torso = torso;
    const wt = S.wt, wb = S.wb, ht = S.ht;
    const torsoD = type === "bublik"
      ? `M${-wb / 2 + 20},0 C${-wb / 2 - 30},${-ht * 0.25} ${-wt / 2 - 20},${-ht * 0.75} ${-wt / 2 + 6},${-ht + 14} Q${-wt / 2 + 12},${-ht} ${-wt / 2 + 34},${-ht} L${wt / 2 - 34},${-ht} Q${wt / 2 - 12},${-ht} ${wt / 2 - 6},${-ht + 14} C${wt / 2 + 20},${-ht * 0.75} ${wb / 2 + 30},${-ht * 0.25} ${wb / 2 - 20},0 Z`
      : `M${-wb / 2},0 C${-wb / 2 - 6},${-ht * 0.5} ${-wt / 2 - 4},${-ht * 0.8} ${-wt / 2},${-ht + 18} Q${-wt / 2},${-ht} ${-wt / 2 + 22},${-ht} L${wt / 2 - 22},${-ht} Q${wt / 2},${-ht} ${wt / 2},${-ht + 18} C${wt / 2 + 4},${-ht * 0.8} ${wb / 2 + 6},${-ht * 0.5} ${wb / 2},0 Z`;
    const undies = type === "bublik" && outfit === "undies";
    part(torsoD, undies ? skin : S.cloth, torso);
    // детали торса
    if (type === "bublik") {
      if (undies) { P("M-6,-46 q6,8 12,0", "none", torso, { "stroke-width": 4 }); P("M-60,-112 q20,14 40,0 M20,-112 q20,14 40,0", "none", torso, { "stroke-width": 4 });
        part(rr(-wb / 2 + 14, -26, wb - 28, 44, 14), "#F5F1E6", torso);
        for (let i = 0; i < 6; i++) svg("path", { d: `M${-90 + i * 36},-8 c-6,-8 -16,0 0,10 c16,-10 6,-18 0,-10z`, fill: "#E2372C" }, torso);
      } else { P(`M${-wt / 2 + 20},${-ht + 6} L${wt / 2 - 40},-20`, "none", torso, { "stroke-width": 20, stroke: "#3B2F1E" });
        for (let i = 0; i < 4; i++) { const gx = -wt / 2 + 44 + i * 36, gy = -ht + 30 + i * 30; const gg = G(torso, `translate(${gx},${gy}) scale(0.7)`); PROPS.grenade(gg); }
        part(rr(-wb / 2 + 10, -18, wb - 20, 20, 6), "#3B2F1E", torso); }
    } else if (type === "boss") {
      P(`M${-wt / 2 + 40},${-ht} q${wt / 2 - 40},${70} ${wt - 80},0`, "none", torso, { stroke: "#E9B949", "stroke-width": 9 });
      svg("circle", { cx: 0, cy: -ht + 66, r: 13, fill: "#E9B949", stroke: K, "stroke-width": 4 }, torso);
      P(`M${-wt / 2 + 6},${-ht + 10} q${wt / 2},${40} ${wt - 12},0`, "none", torso, { stroke: skin, "stroke-width": 0 });
    } else {
      // разгрузка/жилет с подсумками
      const vest = type === "graves" ? "#3D3B2A" : type === "merc" ? "#2B2B27" : S.clothD;
      part(rr(-wt / 2 + 18, -ht + 26, wt - 36, ht - 44, 16), vest, torso);
      const pw = Math.min(36, (wt - 60) / 3);
      for (let i = 0; i < 3; i++) part(rr(-wt / 2 + 28 + i * (pw + 6), -62, pw, 40, 6), S.clothD, torso, { "stroke-width": 4 });
      part(rr(-wb / 2 + 8, -20, wb - 16, 22, 6), "#3B2F1E", torso);
      svg("rect", { x: -12, y: -18, width: 24, height: 18, fill: "#C9B27A", stroke: K, "stroke-width": 4 }, torso);
      if (type === "schmidt") { [-1, 1].forEach((k) => { svg("rect", { x: k * (wt / 2 - 30) - 18, y: -ht - 4, width: 36, height: 14, fill: "#E9B949", stroke: K, "stroke-width": 4, rx: 3 }, torso); }); }
      if (type === "merc") { part(rr(-wt / 2 - 6, -ht + 38, 26, 30, 4), "#B7302A", torso, { "stroke-width": 4 }); }
      if (type === "graves") { P(`M${wt / 2 - 30},${-ht + 20} v-90`, "none", torso, { "stroke-width": 5 }); svg("circle", { cx: wt / 2 - 30, cy: -ht - 74, r: 6, fill: K }, torso); }
      if (type === "lucky") { svg("text", { x: 0, y: -ht + 70, "text-anchor": "middle", "font-family": "Russo One", "font-size": 22, fill: "#E9B949", stroke: K, "stroke-width": 1 }, torso).textContent = "7"; }
    }
    // руки (дальняя и ближняя одинаково, кадр фронтальный)
    const arm = (side) => {
      const k = side === "L" ? -1 : 1, sx = k * (wt / 2 - (type === "bublik" ? 30 : 12)), sy = -ht + 22;
      const g0 = G(torso, `translate(${sx},${sy})`), up = G(g0);
      const armC = undies ? skin : type === "boss" ? skin : S.cloth, w1 = type === "boss" ? 56 : type === "bublik" ? 48 : type === "lucky" ? 34 : 40;
      part(rr(-w1 / 2, -10, w1, 92, w1 / 2), armC, up);
      if (type === "boss") { P("M-12,24 l10,14 l10,-14 l-6,24 h-8z", "#2B2016", up, { "stroke-width": 0 }); }
      const lo = G(up, "translate(0,80)");
      part(rr(-w1 / 2 + 3, -8, w1 - 6, 84, (w1 - 6) / 2), type === "boss" || undies ? skin : type === "lucky" ? S.cloth : skin, lo);
      if (type !== "boss" && !undies && type !== "lucky") part(rr(-w1 / 2 + 1, -10, w1 - 2, 22, 8), S.cloth, lo);
      const hand = G(lo, "translate(0,82)"); const pr = G(hand);
      svg("circle", { cx: 0, cy: 0, r: type === "boss" ? 30 : 23, fill: type === "graves" || type === "merc" ? "#2A2622" : type === "schmidt" ? "#4A3A2A" : skin, stroke: K, "stroke-width": SW }, hand);
      return { g0, up, lo, hand, pr };
    };
    ch.g.armL = arm("L"); ch.g.armR = arm("R");
    // голова
    const headG = G(torso, `translate(0,${-ht + 10})`); ch.g.head = headG;
    const rh = S.rh, hy = -rh + 6;
    part(rr(-24, -30, 48, 40, 14), type === "graves" || type === "merc" ? "#2E2B22" : skin, headG);
    const skull = G(headG, `translate(0,${hy})`); ch.g.skull = skull;
    // уши
    const earS = type === "gluh" ? 1.9 : type === "lucky" ? 1.35 : 1;
    const ears = G(skull); ch.g.ears = ears;
    if (type !== "graves" && type !== "merc") [-1, 1].forEach((k) => { const e = G(ears, `translate(${k * (rh - 6)},6) scale(${earS})`); P(`M0,-20 q${k * 34},-6 ${k * 30},22 q${k * -4},18 ${k * -26},10z`, skin, e); P(`M${k * 6},-8 q${k * 14},2 ${k * 12},14`, "none", e, { "stroke-width": 4 }); });
    if (type === "gluh") { const ha = G(ears, `translate(${rh + 30},2)`); P(rr(-14, -22, 28, 44, 12), "#E6D3A8", ha); svg("circle", { cx: 0, cy: -2, r: 6, fill: "#7A6A4A" }, ha); }
    const headShape = type === "bublik" ? `M0,${-rh} C${rh * 1.25},${-rh} ${rh * 1.2},${rh * 1.05} 0,${rh * 1.02} C${-rh * 1.2},${rh * 1.05} ${-rh * 1.25},${-rh} 0,${-rh}z`
      : type === "lucky" ? `M0,${-rh} C${rh * 1.05},${-rh} ${rh * 0.95},${rh * 1.15} 0,${rh * 1.12} C${-rh * 0.95},${rh * 1.15} ${-rh * 1.05},${-rh} 0,${-rh}z`
      : type === "boss" ? `M0,${-rh} C${rh * 1.2},${-rh} ${rh * 1.25},${rh * 1.1} 0,${rh} C${-rh * 1.25},${rh * 1.1} ${-rh * 1.2},${-rh} 0,${-rh}z`
      : `M0,${-rh} C${rh * 1.12},${-rh} ${rh * 1.12},${rh} 0,${rh} C${-rh * 1.12},${rh} ${-rh * 1.12},${-rh} 0,${-rh}z`;
    const headFill = type === "graves" ? "#2E2B22" : type === "merc" ? "#1E1B18" : skin;
    part(headShape, headFill, skull);
    if (type === "graves" || type === "merc") { // прорезь для глаз
      P(rr(-rh * 0.78, -rh * 0.36, rh * 1.56, rh * 0.62, rh * 0.3), type === "graves" ? skin : SKIN.merc[0], skull);
      if (type === "graves") for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.32; P(`M${Math.cos(a) * rh},${Math.sin(a) * rh} l${Math.cos(a) * 22},${Math.sin(a) * 22 + 6}`, "none", skull, { stroke: "#4C5A2E", "stroke-width": 7 }); }
    }
    // лицо (сдвигается при повороте головы)
    const face = G(skull); ch.g.face = face;
    const eyeY = type === "graves" || type === "merc" ? -rh * 0.06 : -rh * 0.08, eyeX = rh * 0.36;
    const eyeR = type === "lucky" ? [16, 21] : type === "bublik" ? [19, 23] : type === "boss" ? [15, 15] : [16, 20];
    const eyes = [];
    [-1, 1].forEach((k, i) => {
      const eg = G(face, `translate(${k * eyeX},${eyeY})`);
      let rx = eyeR[0], ry = eyeR[1]; if (type === "lucky" && k > 0) { rx *= 1.25; ry *= 1.25; }
      const cp = svg("clipPath", { id: `${id}e${i}` }, defs); svg("ellipse", { cx: 0, cy: 0, rx, ry }, cp);
      svg("ellipse", { cx: 0, cy: 0, rx, ry, fill: "#FFFDF4" }, eg);
      const pg = G(eg); pg.setAttribute("clip-path", `url(#${id}e${i})`);
      const pupil = svg("circle", { cx: 0, cy: 2, r: type === "bublik" ? 6 : 8.5, fill: K }, pg);
      svg("circle", { cx: 3, cy: -2, r: 2.6, fill: "#fff" }, pg);
      const lid = svg("rect", { x: -rx - 2, y: -ry - 2, width: 2 * rx + 4, height: 0, fill: type === "merc" ? SKIN.merc[0] : skin }, pg);
      const lidLo = svg("rect", { x: -rx - 2, y: ry + 2, width: 2 * rx + 4, height: 0, fill: type === "merc" ? SKIN.merc[0] : skin }, pg);
      svg("ellipse", { cx: 0, cy: 0, rx, ry, fill: "none", stroke: K, "stroke-width": 5 }, eg);
      const brow = svg("path", { d: `M${-rx - 4},${-ry - 10} q${rx + 4},-12 ${2 * rx + 8},0`, fill: "none", stroke: type === "schmidt" ? "#6B5A48" : K, "stroke-width": type === "boss" ? 10 : 8, "stroke-linecap": "round" }, eg);
      eyes.push({ eg, pupil, lid, lidLo, brow, rx, ry, k });
    });
    ch.g.eyes = eyes;
    if (type === "schmidt") { [-1, 1].forEach((k) => P(`M${k * eyeX - 14},${eyeY + 26} q14,8 28,0`, "none", face, { "stroke-width": 3.5, stroke: "#8A5F44" })); }
    if (type === "boss") { const gl = G(face); ch.g.glasses = gl; [-1, 1].forEach((k) => P(rr(k * eyeX - 30, eyeY - 18, 60, 36, 10), "#0F0D0B", gl, { "stroke-width": 5 })); P(`M${-eyeX + 30},${eyeY - 6} h${2 * eyeX - 60}`, "none", gl, { "stroke-width": 6 });
      svg("path", { d: `M${-eyeX - 20},${eyeY - 10} l14,-6`, stroke: "#fff", "stroke-width": 4, opacity: 0.6 }, gl); P(`M${rh * 0.5},${-rh * 0.6} l20,40`, "none", skull, { stroke: "#7A3A2A", "stroke-width": 5 }); }
    // нос
    if (type !== "graves" && type !== "merc") P(type === "lucky" ? `M-4,${rh * 0.12} q14,26 -2,30` : type === "bublik" ? `M-14,${rh * 0.2} a14,12 0 1,0 28,0 a14,12 0 1,0 -28,0` : `M-6,${rh * 0.1} q20,26 -4,34`, type === "bublik" ? skinD : "none", face, { "stroke-width": 5 });
    // веснушки, румянец, щетина
    if (type === "lucky") for (let i = 0; i < 10; i++) svg("circle", { cx: (i % 2 ? 1 : -1) * (rh * 0.35 + (i % 5) * 7), cy: rh * 0.18 + ((i * 7) % 11), r: 2.6, fill: "#B0683C" }, face);
    const blush = G(face); blush.setAttribute("opacity", type === "bublik" ? 0.55 : 0); ch.g.blush = blush;
    [-1, 1].forEach((k) => svg("ellipse", { cx: k * rh * 0.6, cy: rh * 0.3, rx: 18, ry: 11, fill: "#E66A5A" }, blush));
    if (type === "schmidt" || type === "boss") for (let i = 0; i < 26; i++) svg("circle", { cx: (E.hash(i) - 0.5) * rh * 1.3, cy: rh * 0.45 + E.hash(i + 9) * rh * 0.42, r: 1.8, fill: "#5B4636", opacity: 0.6 }, face);
    // рот
    const mouthG = G(face, `translate(0,${type === "graves" || type === "merc" ? rh * 0.5 : rh * 0.52})`);
    const mouth = svg("path", { d: "", fill: "#3A1410", stroke: K, "stroke-width": 5, "stroke-linejoin": "round" }, mouthG);
    const teeth = svg("path", { d: "", fill: "#FFFDF4" }, mouthG);
    const tongue = svg("path", { d: "", fill: "#D9645A" }, mouthG);
    const mouthLine = svg("path", { d: "", fill: "none", stroke: K, "stroke-width": 5, "stroke-linecap": "round" }, mouthG);
    ch.g.mouth = { mouthG, mouth, teeth, tongue, mouthLine };
    if (type === "graves" || type === "merc") { mouth.setAttribute("fill", "#141210"); }
    if (type === "schmidt") { ch.g.mst = P(`M-40,-8 q20,-16 40,-4 q20,-12 40,4 q-18,12 -40,4 q-22,8 -40,-4z`, "#6B5A48", mouthG, { "stroke-width": 4 });
      const cg = G(mouthG, "translate(26,6) rotate(14)"); PROPS.cig(cg); ch.g.cig = cg; const sm = G(cg); ch.g.smoke = sm;
      for (let i = 0; i < 5; i++) svg("circle", { r: 8, fill: "#E8DCC6", opacity: 0 }, sm); }
    // головной убор
    const hatG = G(skull); ch.g.hat = hatG;
    if (S.hat === "cap") { part(`M${-rh * 0.95},${-rh * 0.45} Q${-rh * 1.05},${-rh * 1.25} 0,${-rh * 1.22} Q${rh * 1.05},${-rh * 1.25} ${rh * 0.95},${-rh * 0.45} z`, "#5F5B35", hatG);
      part(rr(-rh * 0.97, -rh * 0.62, rh * 1.94, rh * 0.26, 8), "#2B2016", hatG); P(`M${-rh * 0.9},${-rh * 0.36} Q0,${-rh * 0.06} ${rh * 0.9},${-rh * 0.36} L${rh * 0.75},${-rh * 0.46} Q0,${-rh * 0.3} ${-rh * 0.75},${-rh * 0.46}z`, K, hatG);
      svg("circle", { cx: 0, cy: -rh * 0.8, r: 14, fill: "#E9B949", stroke: K, "stroke-width": 4 }, hatG); P(`M-6,${-rh * 0.82} l6,-8 l6,8 l-6,8z`, "#B7302A", hatG, { "stroke-width": 2 }); }
    if (S.hat === "helmet" || S.hat === "tinyhelmet" || S.hat === "bighelmet") {
      const hs = S.hat === "tinyhelmet" ? 0.72 : S.hat === "bighelmet" ? 1.22 : 1.04, hg = G(hatG, `translate(0,${S.hat === "tinyhelmet" ? -rh * 0.62 : S.hat === "bighelmet" ? -rh * 0.44 : -rh * 0.3}) rotate(${S.hat === "bighelmet" ? -9 : S.hat === "tinyhelmet" ? 7 : 0}) scale(${hs})`);
      part(`M${-rh * 1.02},${rh * 0.02} C${-rh * 1.05},${-rh * 1.05} ${rh * 1.05},${-rh * 1.05} ${rh * 1.02},${rh * 0.02} q4,14 -12,16 h${-rh * 1.8} q-16,-2 -12,-16z`, "#5A5A33", hg);
      for (let i = 0; i < 5; i++) P(`M${-rh * 0.8 + i * rh * 0.4},${-rh * 0.75 + Math.abs(i - 2) * 16} l${rh * 0.25},${rh * 0.55}`, "none", hg, { stroke: "#3D3D22", "stroke-width": 4 });
      part(rr(-rh * 0.5, -rh * 0.6, rh * 0.5, rh * 0.32, 8), "#2F2F22", hg, { "stroke-width": 4 });
      if (S.hat !== "bighelmet") P(`M${-rh * 0.95},${rh * 0.1} Q${-rh * 0.9},${rh * 1.05} 0,${rh * 1.1} Q${rh * 0.9},${rh * 1.05} ${rh * 0.95},${rh * 0.1}`, "none", G(hatG), { stroke: "#3B2F1E", "stroke-width": 6, opacity: S.hat === "tinyhelmet" ? 0 : 0.85 });
    }
    if (S.hat === "hood") { part(`M${-rh * 1.08},${rh * 0.3} C${-rh * 1.25},${-rh * 1.3} ${rh * 1.25},${-rh * 1.3} ${rh * 1.08},${rh * 0.3} l-10,-10 C${rh * 0.9},${-rh * 0.9} ${-rh * 0.9},${-rh * 0.9} ${-rh * 1.08 + 10},${rh * 0.3 - 10}z`, "#3E4A26", hatG);
      const gg = G(hatG, `translate(0,${-rh * 0.62})`); part(rr(-rh * 0.75, -16, rh * 1.5, 32, 14), "#1B1A16", gg); [-1, 1].forEach((k) => svg("ellipse", { cx: k * rh * 0.34, cy: 0, rx: 22, ry: 12, fill: "#E9B949", stroke: K, "stroke-width": 4, opacity: 0.85 }, gg)); }
    if (S.hat === "bald") { P(`M${-rh * 0.4},${-rh * 0.86} q${rh * 0.2},-10 ${rh * 0.35},0`, "none", hatG, { stroke: "#fff", "stroke-width": 6, opacity: 0.45 }); }
    if (S.hat === "balaclava") { P(`M${-rh * 0.9},${-rh * 0.55} Q0,${-rh * 1.25} ${rh * 0.9},${-rh * 0.55}`, "none", hatG, { stroke: "#2B2B27", "stroke-width": 10 }); }
    // сажа (после взрывов)
    const soot = G(skull); soot.setAttribute("opacity", 0); ch.g.soot = soot;
    for (let i = 0; i < 9; i++) svg("ellipse", { cx: (E.hash(i * 3 + seed) - 0.5) * rh * 1.4, cy: (E.hash(i * 5 + seed) - 0.3) * rh * 1.1, rx: 14 + E.hash(i) * 18, ry: 8 + E.hash(i + 2) * 10, fill: "#1B130B", opacity: 0.55 }, soot);
    // слеза
    const tear = svg("path", { d: `M${eyeX - 6},${eyeY + 22} q-8,14 0,20 q8,-6 0,-20z`, fill: "#9FD3E8", stroke: K, "stroke-width": 3, opacity: 0 }, face); ch.g.tear = tear;

    // реквизит
    ch.give = (side, name) => { const a = side === "L" ? ch.g.armL : ch.g.armR; a.pr.innerHTML = ""; if (name) { PROPS[name](a.pr); } ch.props[side] = name; return a.pr; };
    ch.lines = [];
    C.all.push(ch);
    return ch;
  };
  C.all = [];

  // ── рот: форма от открытия o (0..1) и улыбки s (−1..1) ──
  const mouthPath = (ch, o, s, w) => {
    const m = ch.g.mouth, grin = ch.type === "gluh" ? 0.55 : ch.type === "lucky" ? 0.3 : 0;
    o = Math.max(o, grin * 0.5);
    if (o < 0.06) { m.mouth.setAttribute("d", ""); m.teeth.setAttribute("d", ""); m.tongue.setAttribute("d", "");
      m.mouthLine.setAttribute("d", `M${-w / 2},${-s * 6} Q0,${s * 16} ${w / 2},${-s * 6}`); return; }
    m.mouthLine.setAttribute("d", "");
    const top = -s * 6 - o * 4, bot = s * 10 + o * 46, ww = w * (1 + o * 0.15 + Math.max(0, s) * 0.2);
    m.mouth.setAttribute("d", `M${-ww / 2},${-s * 8} Q0,${top - 6} ${ww / 2},${-s * 8} Q${ww * 0.35},${bot} 0,${bot} Q${-ww * 0.35},${bot} ${-ww / 2},${-s * 8}z`);
    const th = ch.type === "gluh" ? Math.min(18, 4 + o * 18) : Math.min(12, o * 22);
    m.teeth.setAttribute("d", ch.type === "graves" || ch.type === "merc" ? "" : `M${-ww * 0.4},${-s * 8 + 2} Q0,${top - 2} ${ww * 0.4},${-s * 8 + 2} L${ww * 0.36},${-s * 8 + th} Q0,${top + th} ${-ww * 0.36},${-s * 8 + th}z`);
    m.tongue.setAttribute("d", o > 0.35 && ch.type !== "graves" && ch.type !== "merc" ? `M${-ww * 0.22},${bot - 4} Q0,${bot - o * 22} ${ww * 0.22},${bot - 4} Q0,${bot + 2} ${-ww * 0.22},${bot - 4}z` : "");
  };

  // ── кадр: применяем состояние ко всем персонажам ──
  C.render = (t, g) => {
    for (const ch of C.all) {
      const s = ch.st, S = ch.S, sd = ch.seed;
      ch.wrap.style.opacity = s.op; ch.wrap.style.display = s.op <= 0.001 ? "none" : "block";
      if (s.op <= 0.001) continue;
      // речь
      let talk = 0;
      for (const L of ch.lines) { const u = t - L.t; if (u >= -0.03 && u < L.dur) { const i = Math.max(0, Math.floor((u + 0.033) * 60)); talk = L.env[Math.min(L.env.length - 1, i)] || 0; } }
      const open = E.clamp(Math.max(s.mouthOpen, talk * 0.95 * s.talkGain));
      // процедурная жизнь
      const breath = Math.sin(t * 1.6 + sd * 2) * 0.016, ph = s.walk * Math.PI * 2, wa = s.walkAmp;
      const bob = s.bob - Math.abs(Math.sin(ph)) * 16 * wa - talk * 3 - s.jump;
      const legL = s.legL + Math.sin(ph) * 28 * wa, legR = s.legR - Math.sin(ph) * 28 * wa;
      const armSw = Math.sin(ph) * 16 * wa;
      // моргание
      let blink = 0; const bp = 2.6 + E.hash(sd) * 2, bt = (t + E.hash(sd * 3) * bp) % bp; if (bt < 0.14) blink = Math.sin((bt / 0.14) * Math.PI);
      const sc = s.sc;
      ch.wrap.style.transform = `translate(${s.x - 450}px,${s.y - 760}px) scale(${sc}) rotate(${s.rot}deg)`;
      ch.wrap.style.transformOrigin = "450px 760px";
      const hipY = -130 + (ch.type === "lucky" && ch.g.skate && ch.g.skate.style.display !== "none" ? -40 : 0);
      ch.g.legL.setAttribute("transform", `translate(${-S.hx},${hipY + bob * 0.3}) rotate(${legL})`);
      ch.g.legR.setAttribute("transform", `translate(${S.hx},${hipY + bob * 0.3}) rotate(${legR})`);
      ch.g.torso.setAttribute("transform", `translate(0,${hipY + bob}) rotate(${s.lean}) scale(${s.sqx * (1 - breath * 0.5)},${s.sqy * (1 + breath)})`);
      const A = (a, side, up, lo) => { const k = side === "L" ? 1 : -1; a.up.setAttribute("transform", `rotate(${k * up})`); a.lo.setAttribute("transform", `translate(0,80) rotate(${-k * lo})`); };
      A(ch.g.armL, "L", s.armLu + armSw, s.armLl); A(ch.g.armR, "R", s.armRu - armSw, s.armRl);
      ch.g.armR.pr.setAttribute("transform", `rotate(${s.propR - (-(s.armRu - armSw) + s.armRl)}) scale(${s.flipR ? -1 : 1},1)`); ch.g.armL.pr.setAttribute("transform", `rotate(${s.propL - ((s.armLu + armSw) - s.armLl)})`);
      ch.g.head.setAttribute("transform", `translate(0,${-S.ht + 10}) rotate(${s.head + talk * 2.5 * Math.sin(t * 7 + sd)})`);
      ch.g.face.setAttribute("transform", `translate(${s.turn * 24},${s.py * 3})`);
      ch.g.ears.setAttribute("transform", `translate(${-s.turn * 8},0)`);
      ch.g.hat.setAttribute("transform", `translate(${s.turn * 8},0)`);
      // глаза
      for (const e of ch.g.eyes) {
        const wide = s.eyeWide, sc2 = 1 + wide * 0.25;
        e.eg.setAttribute("transform", `translate(${e.k * S.rh * 0.36},${(ch.type === "graves" || ch.type === "merc" ? -S.rh * 0.06 : -S.rh * 0.08)}) scale(${sc2})`);
        e.pupil.setAttribute("cx", s.px * e.rx * 0.45); e.pupil.setAttribute("cy", 2 + s.py * e.ry * 0.4);
        e.pupil.setAttribute("r", (ch.type === "bublik" ? 6 : 8.5) * (1 - wide * 0.35));
        let lid = Math.max(s.lid, blink);
        let twitch = 0;
        if (s.twitch > 0 && e.k > 0) { const tp = (t * 1.7) % 1; twitch = tp < 0.35 ? s.twitch * (0.5 + 0.5 * Math.sin(t * 70)) : 0; }
        e.lid.setAttribute("height", Math.max(0, lid * (2 * e.ry + 4) + twitch * e.ry * 0.8));
        e.lidLo.setAttribute("y", e.ry + 2 - twitch * e.ry * 0.7); e.lidLo.setAttribute("height", twitch * e.ry * 0.7 + 1);
        const b = s.brow, by = -e.ry - 10 - b * 8 - wide * 8;
        e.brow.setAttribute("d", `M${-e.rx - 4},${by + e.k * b * -8 + (b < 0 ? e.k * 10 * -b : 0)} q${e.rx + 4},${-12 - b * 4} ${2 * e.rx + 8},${(b < 0 ? -e.k * 18 * -b : 0)}`);
      }
      mouthPath(ch, open, s.smile, ch.type === "boss" ? 60 : ch.type === "bublik" ? 56 : 46);
      ch.g.blush.setAttribute("opacity", (ch.type === "bublik" ? 0.55 : 0) + s.blush);
      ch.g.soot.setAttribute("opacity", s.soot);
      ch.g.tear.setAttribute("opacity", s.tear);
      if (ch.g.tear && s.tear > 0) ch.g.tear.setAttribute("transform", `translate(0,${((t * 40) % 30)})`);
      // дым сигареты
      if (ch.g.smoke) [...ch.g.smoke.children].forEach((c, i) => { const p2 = (t * 0.6 + i / 5) % 1; c.setAttribute("cx", 50 + p2 * 30 + Math.sin(t * 2 + i) * 8); c.setAttribute("cy", -p2 * 120); c.setAttribute("r", 5 + p2 * 16); c.setAttribute("opacity", 0.5 * (1 - p2) * Math.min(1, p2 * 5)); });
      // пламя факела
      ch.wrap.querySelectorAll(".flame").forEach((fl) => { let h = "";
        for (let i = 0; i < 3; i++) { const sz = [1, 0.7, 0.42][i], col = ["#FF7A1A", "#FFC24A", "#FFF3C4"][i], w = 34 * sz, hh = (95 + Math.sin(t * 13 + i) * 18) * sz, sway = Math.sin(t * 9 + i * 2) * 14 * sz;
          h += `<path d="M${-w},-170 Q${-w * 1.1},${-170 - hh * 0.6} ${sway},${-170 - hh} Q${w * 1.1},${-170 - hh * 0.6} ${w},-170 Q0,-150 ${-w},-170z" fill="${col}" ${i === 0 ? `stroke="${K}" stroke-width="4"` : ""}/>`; }
        fl.innerHTML = h; });
      // мигание батареи / стволы пулемёта
      ch.wrap.querySelectorAll(".blink").forEach((b) => b.setAttribute("fill", Math.sin(t * 12) > 0 ? "#FF3B2C" : "#5A1410"));
      ch.wrap.querySelectorAll(".barrels").forEach((b) => b.setAttribute("transform", `translate(0,${Math.sin(t * (ch.st.spin || 0)) * 6})`));
    }
  };
  E.onFrame(C.render);

  // ── хелперы движения ──
  // ходьба: x едет с изингом, фаза шага растёт пропорционально пути
  C.walk = (ch, t, toX, dur, { stride = 150, ease = "power1.inOut", toY } = {}) => {
    const tl = E.tl, dist = Math.abs(toX - (ch._x ?? ch.st.x)); ch._x = toX;
    tl.to(ch.st, { walkAmp: 1, duration: 0.25, ease: "power1.out" }, t);
    tl.to(ch.st, { x: toX, ...(toY != null ? { y: toY } : {}), duration: dur, ease }, t);
    tl.to(ch.st, { walk: `+=${Math.max(1, Math.round(dist / stride))}`, duration: dur, ease }, t);
    tl.to(ch.st, { walkAmp: 0, duration: 0.3, ease: "power1.in" }, t + dur - 0.3);
  };
  // поза: набор свойств с пружиной
  C.pose = (ch, t, props, dur = 0.45, ease = "back.out(1.6)") => E.tl.to(ch.st, { ...props, duration: dur, ease }, t);
  // прыжок-подскок (сжатие → взлёт → приземление со сплющиванием)
  C.hop = (ch, t, h = 60) => { const tl = E.tl;
    tl.to(ch.st, { sqy: 0.88, sqx: 1.1, duration: 0.1, ease: "power2.out" }, t);
    tl.to(ch.st, { jump: h, sqy: 1.08, sqx: 0.94, duration: 0.22, ease: "power2.out" }, t + 0.1);
    tl.to(ch.st, { jump: 0, sqy: 0.9, sqx: 1.08, duration: 0.2, ease: "power2.in" }, t + 0.32);
    tl.to(ch.st, { sqy: 1, sqx: 1, duration: 0.35, ease: "elastic.out(1,0.5)" }, t + 0.52); };
})();
