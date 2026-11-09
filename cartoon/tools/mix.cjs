// mix.cjs — склейка частей + дорожка голосов по меткам E.say + финальное сведение + субтитры .srt
// usage: node tools/mix.cjs   (части берутся из render/p0..p5.mp4, страницы из scenes/)
const { chromium } = require("playwright"); const path = require("path"); const fs = require("fs"); const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), FPS = 30;
const PARTS = [["p0", "p0_title"], ["p1", "p1_hangar"], ["p2", "p2_perimeter"], ["p3", "p3_corridor"], ["p4", "p4_finale"], ["p5", "p5_credits"]];
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, "voice/lines.json"), "utf8")).lines;
const text = Object.fromEntries(lines.map((l) => [l.id, l.t]));
const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
(async () => {
  const b = await chromium.launch(); const cues = []; let off = 0;
  for (const [k, page] of PARTS) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto("file://" + path.join(ROOT, "scenes", page + ".html"), { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 100 && !(await p.evaluate(() => !!(window.__timelines && window.__timelines.main))); i++) await new Promise((r) => setTimeout(r, 100));
    const info = await p.evaluate(() => ({ dur: +document.getElementById("root").dataset.duration, cues: window.__cues, vdur: Object.fromEntries(Object.entries(window.VOICE).map(([k, v]) => [k, v.dur])) }));
    const n = Math.round(info.dur * FPS);
    for (const c of info.cues) cues.push({ ...c, g: off + c.t, dur: info.vdur[c.id] });
    console.log(k, "dur", info.dur.toFixed(2), "offset", off.toFixed(2), "cues", info.cues.length);
    off += n / FPS; await p.close();
  }
  await b.close();
  const total = off; fs.writeFileSync(path.join(ROOT, "render/cues.json"), JSON.stringify(cues, null, 1));
  // 1) склейка видео (одинаковые параметры — без перекодирования)
  fs.writeFileSync(path.join(ROOT, "render/list.txt"), PARTS.map(([k]) => `file '${k}.mp4'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", path.join(ROOT, "render/list.txt"), "-c", "copy", path.join(ROOT, "render/joined.mp4")]);
  // 2) дорожка голосов
  const inputs = [], filt = [];
  cues.forEach((c, i) => { inputs.push("-i", path.join(ROOT, "voice/out", c.id + ".wav")); const ms = Math.round(c.g * 1000);
    filt.push(`[${i}]aresample=48000,volume=${c.gain || 1},adelay=${ms}|${ms},apad=whole_dur=${total.toFixed(3)}[v${i}]`); });
  filt.push(cues.map((_, i) => `[v${i}]`).join("") + `amix=inputs=${cues.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)}[vo]`);
  ff([...inputs, "-filter_complex", filt.join(";"), "-map", "[vo]", "-ac", "2", "-ar", "48000", path.join(ROOT, "render/voice.wav")]);
  // 3) сведение: эффекты+музыка (из видео) на −22 LUFS, голос −16, мастер −14 LUFS / TP −1.5
  const sfxGain = process.env.SFX_GAIN || "0.55";
  ff(["-i", path.join(ROOT, "render/joined.mp4"), "-i", path.join(ROOT, "render/voice.wav"), "-filter_complex",
    `[0:a]volume=${sfxGain}[s];[1:a]volume=1.0[v];[s][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", path.join(ROOT, "render/OPERACIYA_final.mp4")]);
  // 4) субтитры
  const ts = (s) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, se = Math.floor(s) % 60, ms = Math.round((s % 1) * 1000); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(se).padStart(2, "0")},${String(ms).padStart(3, "0")}`; };
  const srt = cues.sort((a, b) => a.g - b.g).map((c, i) => `${i + 1}\n${ts(c.g)} --> ${ts(c.g + c.dur + 0.3)}\n${text[c.id]}\n`).join("\n");
  fs.writeFileSync(path.join(ROOT, "render/OPERACIYA_final.srt"), srt);
  console.log("total", total.toFixed(2), "s → render/OPERACIYA_final.mp4");
})();
