"""Озвучка через Google AI Studio (Gemini TTS) с режиссёрскими тегами + проверка расшифровкой.
python3 synth_gemini.py [id ...]   → voice/graw/*.wav (сырые), voice/out/*.wav (обработанные), timing.json, ../lib/voicedata.js"""
import json, os, sys, subprocess, re, base64, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from gemini_tts import tts, key

CAST = {  # голос Gemini, обработка
    "narr": ("Charon", "trailer"), "schmidt": ("Algenib", "dry"), "schmidt_radio": ("Algenib", "radio"),
    "graves": ("Orus", "radio"), "bublik": ("Fenrir", "shout"), "lucky": ("Puck", "dry"), "gluh": ("Sadachbia", "shout"),
    "boss": ("Alnilam", "boss"), "merc": ("Zubenelgenubi", "dry"),
}
TAG = {  # подача каждой реплики
    "n1a": "deep, epic movie-trailer narrator, slow, dramatic", "n1b": "deep, epic movie-trailer narrator, slow, dramatic",
    "n1c": "deep, epic movie-trailer narrator, slow, ominous", "n2a": "deep, epic movie-trailer narrator, dramatic pause",
    "n2b": "deep, epic movie-trailer narrator, solemn and serious",
    "r1": "deep trailer narrator, dry ironic", "r2": "deep trailer narrator, cool and respectful", "r3": "deep trailer narrator, amused",
    "r4": "deep trailer narrator, sarcastic", "r5": "deep trailer narrator, dry ironic",
    "s1a": "hoarse, low, threatening whisper of a tired old army captain", "s1b": "hoarse, low, businesslike whisper",
    "s1c": "hoarse whisper, stern, getting more irritated", "s1d": "menacing whisper, leaning in, cut off abruptly mid-word",
    "s1e": "exhausted, deadpan, through clenched teeth", "s1f": "shouting way too loudly like a deaf person, cheerful and proud",
    "s2a": "calm, cold, emotionless sniper speaking quietly on the radio", "s2b": "whispering into a radio, smug",
    "s2c": "insane ecstatic battle scream of a fanatic", "s2d": "calm, cold, emotionless, slight dry pause",
    "s2e": "panicked furious shout-whisper", "s2f": "goofy, overjoyed, carefree yelling",
    "s3a": "confused and puzzled, hesitant", "s3b": "calm, cold, emotionless sniper reporting on the radio",
    "s3c": "self-pitying, sobbing, crying, broken voice", "s3d": "deep, menacing, roaring cartel boss",
    "s3e": "goofy, delighted, carefree", "s4a": "shaky, hysterical laughter, relieved, almost crying", "s4b": "hysterically happy, out of breath",
    "s4c": "shouting way too loudly like a deaf person, delighted", "s4d": "terrified, very slow, quiet, trying not to panic",
    "s4e": "shouting loudly, confused, like a deaf person", "s4f": "calm, cold, emotionless, matter-of-fact",
    "s5a": "goofy, cheerful, carefree, soot-covered survivor", "s5b": "calm, cold, emotionless, bored on the radio",
}
FX = {
    "trailer": "highpass=f=50,equalizer=f=110:t=q:w=1:g=3,acompressor=threshold=-22dB:ratio=3:attack=5:release=120,aecho=0.85:0.5:60|130:0.2|0.1",
    "dry": "highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=100",
    "radio": "highpass=f=350,lowpass=f=3400,equalizer=f=1600:t=q:w=0.8:g=4,acrusher=bits=10:mix=0.12:mode=log,acompressor=threshold=-24dB:ratio=6:attack=2:release=60",
    "shout": "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=3:release=80",
    "boss": "highpass=f=45,equalizer=f=100:t=q:w=1:g=4,volume=1.6,asoftclip=type=tanh,acompressor=threshold=-18dB:ratio=3",
}

def transcribe(f):
    q = "Расшифруй дословно речь в аудио. Выведи только текст, без комментариев."
    body = {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(f, "rb").read()).decode()}}, {"text": q}]}]}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
                                 data=json.dumps(body).encode(), headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
    try: return json.load(urllib.request.urlopen(req, timeout=240))["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e: return f"<err {e}>"

norm = lambda s: re.sub(r"[^а-яё ]", "", s.lower().replace("ё", "е")).split()
def similar(a, b):
    A, B = norm(a), norm(b); return len(set(A) & set(B)) / max(1, len(set(B)))

lines = json.load(open(os.path.join(HERE, "lines.json"), encoding="utf-8"))["lines"]
only = set(sys.argv[1:]); os.makedirs(os.path.join(HERE, "graw"), exist_ok=True); os.makedirs(os.path.join(HERE, "out"), exist_ok=True)

def one(ln):
    vid, fx = CAST[ln["v"]]; raw = os.path.join(HERE, "graw", ln["id"] + ".wav"); best = None
    for attempt in range(3):
        if not tts(vid, f"[{TAG[ln['id']]}] {ln['t']}", raw): continue
        got = transcribe(raw); sc = similar(got, ln["t"])
        if best is None or sc > best[0]: best = (sc, got, open(raw, "rb").read())
        if sc >= 0.85: break
    if best is None: return ln["id"], "FAIL", ""
    open(raw, "wb").write(best[2]); return ln["id"], round(best[0], 2), best[1]

todo = [l for l in lines if not only or l["id"] in only]
with ThreadPoolExecutor(4) as ex: res = list(ex.map(one, todo))
for r in res: print(*r)

timing_path = os.path.join(HERE, "timing.json")
timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {}
for ln in todo:
    raw = os.path.join(HERE, "graw", ln["id"] + ".wav"); out = os.path.join(HERE, "out", ln["id"] + ".wav")
    if not os.path.exists(raw): continue
    chain = "aresample=48000," + FX[CAST[ln["v"]][1]] + ",silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse," \
            "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,areverse,loudnorm=I=-16:TP=-2:LRA=9,aresample=48000"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", chain, "-ac", "1", "-ar", "48000", out], check=True)
    a, sr = sf.read(out)
    if "cut" in ln: n = int(0.03 * sr); a[-n:] *= np.linspace(1, 0, n); sf.write(out, a, sr)
    hop = sr // 60; rms = np.array([np.sqrt((a[i:i + hop] ** 2).mean()) for i in range(0, len(a) - hop + 1, hop)])
    env = np.convolve(np.clip(rms / (np.percentile(rms, 95) + 1e-6), 0, 1), [0.25, 0.5, 0.25], "same")
    timing[ln["id"]] = {"v": ln["v"], "t": ln["t"], "dur": round(len(a) / sr, 3), "env": [round(float(x), 2) for x in env]}
    print(f"{ln['id']:5s} {len(a)/sr:5.2f}s")
json.dump(timing, open(timing_path, "w"), ensure_ascii=False)
open(os.path.join(HERE, "..", "lib", "voicedata.js"), "w", encoding="utf-8").write(
    "window.VOICE=" + json.dumps({k: {"v": d["v"], "dur": d["dur"], "env": d["env"]} for k, d in timing.items()}) + ";\n")
print("total voice", round(sum(timing[l["id"]]["dur"] for l in lines if l["id"] in timing), 1), "s")
