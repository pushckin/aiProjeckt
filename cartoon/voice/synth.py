"""Синтез реплик Piper → обработка ffmpeg → wav 48 кГц + огибающие для липсинка.
usage: python3 synth.py            (всё)   python3 synth.py s1a s2c   (выборочно)
"""
import json, subprocess, sys, os, numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, "lines.json"), encoding="utf-8"))
OUT = os.path.join(HERE, "out"); RAW = os.path.join(HERE, "raw")
os.makedirs(OUT, exist_ok=True); os.makedirs(RAW, exist_ok=True)

FX = {
    "trailer": "highpass=f=55,equalizer=f=110:t=q:w=1:g=4,equalizer=f=3200:t=q:w=1.2:g=2,"
               "acompressor=threshold=-22dB:ratio=4:attack=5:release=120,aecho=0.85:0.55:70|140:0.22|0.12",
    "rasp":    "highpass=f=75,equalizer=f=180:t=q:w=1:g=2,equalizer=f=2600:t=q:w=1:g=2.5,"
               "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=100",
    "radio":   "highpass=f=380,lowpass=f=3300,equalizer=f=1500:t=q:w=0.8:g=5,"
               "acrusher=bits=9:mix=0.18:mode=log,acompressor=threshold=-24dB:ratio=8:attack=2:release=60",
    "shout":   "highpass=f=90,equalizer=f=3000:t=q:w=1:g=4,acompressor=threshold=-20dB:ratio=5:attack=3:release=80,"
               "volume=1.6,asoftclip=type=tanh",
    "boss":    "highpass=f=45,equalizer=f=90:t=q:w=1:g=6,volume=2.2,asoftclip=type=tanh,"
               "acompressor=threshold=-18dB:ratio=4,aecho=0.8:0.5:45:0.25",
    "dry":     "highpass=f=80,equalizer=f=2800:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=100",
}

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode: print(r.stderr.decode()[-800:]); raise SystemExit(1)
    return r

only = set(sys.argv[1:])
timing_path = os.path.join(HERE, "timing.json")
timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {}
for ln in cfg["lines"]:
    if only and ln["id"] not in only: continue
    v = cfg["voices"][ln["v"]]
    raw = os.path.join(RAW, ln["id"] + ".wav"); out = os.path.join(OUT, ln["id"] + ".wav")
    run(["piper", "-m", os.path.join(HERE, "models", f"ru_RU-{v['model']}-medium.onnx"), "-f", raw,
         "--length_scale", str(v["length"]), "--noise_scale", "0.6", "--noise_w", "0.75", "--sentence_silence", "0.18"],
        input=ln["t"].encode())
    pitch = 2 ** (v["semi"] / 12)
    chain = (f"aresample=48000,rubberband=pitch={pitch:.5f}:formant=shifted," if v["semi"] else "aresample=48000,") + FX[v["fx"]]
    # обрезать тишину по краям, нормализовать к −16 LUFS
    chain += ",silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02," \
             "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse," \
             "loudnorm=I=-16:TP=-2:LRA=9,aresample=48000"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", chain, "-ac", "1", "-ar", "48000", out])
    a, sr = sf.read(out)
    if "cut" in ln:  # оборванная реплика: короткий спад 30 мс в самом конце
        n = int(0.03 * sr); a[-n:] *= np.linspace(1, 0, n); sf.write(out, a, sr)
    # огибающая 60 к/с для липсинка, 0..1
    hop = sr // 60; rms = np.array([np.sqrt((a[i:i + hop] ** 2).mean()) for i in range(0, len(a) - hop + 1, hop)])
    env = np.clip(rms / (np.percentile(rms, 95) + 1e-6), 0, 1)
    env = np.convolve(env, [0.25, 0.5, 0.25], "same")
    timing[ln["id"]] = {"v": ln["v"], "t": ln["t"], "dur": round(len(a) / sr, 3), "env": [round(float(x), 2) for x in env]}
    print(f"{ln['id']:5s} {ln['v']:14s} {len(a)/sr:5.2f}s  {ln['t'][:50]}")

json.dump(timing, open(timing_path, "w"), ensure_ascii=False)
lib = os.path.join(HERE, "..", "lib", "voicedata.js")
open(lib, "w", encoding="utf-8").write("window.VOICE=" + json.dumps({k: {"v": d["v"], "dur": d["dur"], "env": d["env"]} for k, d in timing.items()}) + ";\n")
print("total voice", round(sum(d["dur"] for d in timing.values()), 1), "s")
