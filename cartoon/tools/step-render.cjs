// step-render.cjs — frame-exact render of chat-made motion parts (GSAP timeline + __sound contract), glued in order.
// Each frame is seeked with tl.seek(i/fps) and screenshotted, so nothing stutters or drops like a real-time tab recording.
// usage: node step-render.cjs out.mp4 part1.html [part2.html ...]   (env FPS=30)
const path = require("path"), fs = require("fs"), { spawn } = require("child_process");
// playwright: `npm i` in this folder (package.json), then `npx playwright install chromium` once
const { chromium } = require("playwright");
const [out, ...parts] = process.argv.slice(2);
const fps = +(process.env.FPS || 30), W = 1920, H = 1080;

const wavOf = (dur) => (async (dur) => {
  const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  if (window.__sound) window.__sound(ctx, 0);
  const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
  const out = new Int16Array(n * 2);
  for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  let s = ""; const u = new Uint8Array(out.buffer);
  for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return btoa(s);
})(dur);

(async () => {
  // installed Google Chrome if there is one, otherwise Playwright's own Chromium
  const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] })
    .catch(() => chromium.launch({ headless: true, args: ["--mute-audio"] }));
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), ".step-"));
  const pcm = [];
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-vf", `scale=${W}:${H}:flags=lanczos`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", path.join(tmp, "v.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  const open = async (file, dsf) => {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dsf });
    p.on("pageerror", (e) => console.log("PAGEERR", path.basename(file), e.message));
    // "load" can hang on Google Fonts in headless Chrome; wait for the timeline instead, give fonts up to 8 s
    await p.goto("file://" + path.resolve(file), { waitUntil: "domcontentloaded" });
    for (let k = 0; k < 150 && !(await p.evaluate(() => !!(window.__timelines && window.__timelines.main))); k++) await new Promise((r) => setTimeout(r, 200));
    await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
    const info = await p.evaluate(() => {
      for (const el of document.querySelectorAll("button")) if (/старт/i.test(el.textContent)) el.style.display = "none";
      const r = document.getElementById("root"), rect = r.getBoundingClientRect();
      return { dur: +r.dataset.duration || window.__timelines.main.duration(), x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    });
    return { p, info };
  };
  for (const file of parts) {
    console.log("part", path.basename(file));
    // the page scales #root to the window: reopen at the device scale that makes the root exactly 1920 px wide
    const first = await open(file, 1); await first.p.close();
    const { p, info } = await open(file, W / first.info.w);
    const n = Math.round(info.dur * fps);
    console.log("dur", info.dur, "frames", n, "root css", Math.round(info.w) + "x" + Math.round(info.h));
    const bytes = Math.round(info.dur * 48000) * 4;
    try { pcm.push(Buffer.from(await p.evaluate(wavOf, info.dur), "base64").subarray(0, bytes)); }
    catch (e) { console.log("SOUND BROKEN (silence used):", e.message.split("\n")[0]); pcm.push(Buffer.alloc(bytes)); }
    const clip = { x: info.x, y: info.y, width: info.w, height: info.h };
    for (let i = 0; i < n; i++) {
      await p.evaluate((t) => { window.__timelines.main.seek(t, false); }, i / fps); // return nothing: serializing the timeline hangs
      const shot = await p.screenshot({ type: "jpeg", quality: 92, clip, animations: "allow" });
      if (!ff.stdin.write(shot)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 30 === 0) console.log("frame", i);
    }
    await p.close();
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  fs.writeFileSync(path.join(tmp, "a.pcm"), Buffer.concat(pcm));
  await new Promise((r) => spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(tmp, "v.mp4"), "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", path.join(tmp, "a.pcm"),
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" }).on("close", r));
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close(); console.log("done", out);
})();
