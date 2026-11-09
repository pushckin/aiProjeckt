const { chromium } = require("playwright"); const path = require("path");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [hash, out] of [["", "thumb_full.png"], ["#cens", "thumb_cens_full.png"]]) {
    await p.goto("file://" + path.resolve(__dirname, "thumb.html") + hash, { waitUntil: "domcontentloaded" }); await p.reload({ waitUntil: "domcontentloaded" });
    await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))])); await new Promise((r) => setTimeout(r, 500));
    await p.evaluate(() => { window.__timelines.main.seek(0.5, false); });
    await p.screenshot({ path: path.join(__dirname, out) }); }
  await b.close(); })();
