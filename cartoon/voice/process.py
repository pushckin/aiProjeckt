"""Обработка сырых реплик Gemini (graw/) → out/, timing.json, ../lib/voicedata.js"""
import json, os, subprocess, numpy as np, soundfile as sf
from synth_gemini import CAST, FX
HERE = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(HERE, "lines.json"), encoding="utf-8"))["lines"]
TRIM_TAIL = {"s1d": 0.17}  # оборвать «звук» → «зву…»
timing = {}
for ln in lines:
    raw = os.path.join(HERE, "graw", ln["id"] + ".wav"); out = os.path.join(HERE, "out", ln["id"] + ".wav")
    chain = "aresample=48000,highpass=f=60," + FX[CAST[ln["v"]][1]] + ",silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03,areverse," \
            "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.08,areverse,silenceremove=stop_periods=-1:stop_duration=0.55:stop_threshold=-38dB:stop_silence=0.4,loudnorm=I=-16:TP=-2:LRA=9,aresample=48000"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", chain, "-ac", "1", "-ar", "48000", out], check=True)
    a, sr = sf.read(out)
    if ln["id"] in TRIM_TAIL: a = a[: len(a) - int((TRIM_TAIL[ln["id"]] + 0.08) * sr)]; n = int(0.025 * sr); a[-n:] *= np.linspace(1, 0, n); sf.write(out, a, sr)
    hop = sr // 60; rms = np.array([np.sqrt((a[i:i + hop] ** 2).mean()) for i in range(0, len(a) - hop + 1, hop)])
    env = np.convolve(np.clip(rms / (np.percentile(rms, 95) + 1e-6), 0, 1), [0.25, 0.5, 0.25], "same")
    timing[ln["id"]] = {"v": ln["v"], "t": ln["t"], "dur": round(len(a) / sr, 3), "env": [round(float(x), 2) for x in env]}
    print(f"{ln['id']:5s} {len(a)/sr:5.2f}s  {ln['t'][:50]}")
json.dump(timing, open(os.path.join(HERE, "timing.json"), "w"), ensure_ascii=False)
open(os.path.join(HERE, "..", "lib", "voicedata.js"), "w", encoding="utf-8").write(
    "window.VOICE=" + json.dumps({k: {"v": d["v"], "dur": d["dur"], "env": d["env"]} for k, d in timing.items()}) + ";\n")
print("total voice", round(sum(d["dur"] for d in timing.values()), 1), "s")
