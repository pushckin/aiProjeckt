// проверка: одно свойство одного объекта не анимируется двумя твинами одновременно (закон §3а)
const { chromium } = require("playwright"); const path = require("path");
(async () => { const b = await chromium.launch();
  for (const f of process.argv.slice(2)) { const p = await b.newPage();
    p.on("pageerror", (e) => console.log("PAGEERR", f, e.message));
    await p.goto("file://" + path.resolve(f), { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 100 && !(await p.evaluate(() => !!(window.__timelines && window.__timelines.main))); i++) await new Promise((r) => setTimeout(r, 100));
    const res = await p.evaluate(() => { const tl = window.__timelines.main, out = [], ids = new Map(); let n = 0;
      const id = (o) => { if (!ids.has(o)) ids.set(o, (o === E.cam ? "CAM" : o === E.ov ? "OV" : o.id || o.className || "obj") + "#" + n++); return ids.get(o); };
      const tw = tl.getChildren(true, true, false).filter((t) => t.duration() > 0.0001);
      const rec = [];
      for (const t of tw) { const s = t.startTime(), e = s + t.duration(); for (const tg of t.targets()) for (const k of Object.keys(t.vars)) {
        if (["duration", "ease", "delay", "overwrite", "onComplete", "repeat", "yoyo", "parent", "data", "immediateRender", "lazy"].includes(k)) continue; rec.push({ o: id(tg), k, s, e }); } }
      rec.sort((a, b) => a.s - b.s);
      for (let i = 0; i < rec.length; i++) for (let j = i + 1; j < rec.length && rec[j].s < rec[i].e - 0.01; j++)
        if (rec[i].o === rec[j].o && rec[i].k === rec[j].k) out.push(`${rec[i].o}.${rec[i].k} ${rec[i].s.toFixed(2)}-${rec[i].e.toFixed(2)} vs ${rec[j].s.toFixed(2)}-${rec[j].e.toFixed(2)}`);
      return { dur: tl.duration(), out }; });
    console.log(path.basename(f), "dur", res.dur.toFixed(2), "overlaps:", res.out.length); res.out.slice(0, 25).forEach((l) => console.log("  ", l)); await p.close(); }
  await b.close(); })();
