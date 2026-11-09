// node tools_shot.cjs page.html out.png t1 [t2 ...] — снимки отдельных моментов страницы
const { chromium } = require("playwright"); const path = require("path");
(async () => { const [page, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => console.log("PAGEERR", e.message)); p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.text()); });
  await p.goto("file://" + path.resolve(page), { waitUntil: "domcontentloaded" });
  for (let k = 0; k < 100 && !(await p.evaluate(() => !!(window.__timelines && window.__timelines.main))); k++) await new Promise((r) => setTimeout(r, 100));
  await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]));
  for (const t of (ts.length ? ts : ["0"])) { await p.evaluate((t) => { window.__timelines.main.seek(+t, false); }, t);
    const f = ts.length > 1 ? out.replace(/\.(png|jpg)$/, `_${t}.$1`) : out; await p.screenshot({ path: f, type: f.endsWith(".jpg") ? "jpeg" : "png" }); console.log(f); }
  await b.close(); })();
