"""Gemini TTS пакетами: один запрос на персонажа (все его реплики с тегами подачи и паузами),
затем нарезка по самым длинным паузам. Экономит дневную квоту бесплатного тарифа (10 запросов/модель).
python3 synth_batch.py [группа ...]"""
import json, os, sys, subprocess, base64, urllib.request
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import gemini_tts
from gemini_tts import tts, key
from synth_gemini import CAST, TAG, FX

MODELS = os.environ.get("TTS_MODELS", "gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts,gemini-3.8-flash-lite-tts").split(",")
GROUPS = {"narr": ["n1a", "n1b", "n1c", "n2a", "n2b", "r1", "r2", "r3", "r4", "r5"],
          "schmidtA": ["s1a", "s1b", "s1c", "s1d", "s1e", "s2b"], "schmidtA1": ["s1a", "s1b", "s1c"], "s1c": ["s1c"], "schmidtA2": ["s1d", "s1e", "s2b"], "schmidtB": ["s2e", "s3c", "s4a", "s4b", "s4d"],
          "graves": ["s2a", "s2d", "s3b", "s4f", "s5b"], "lucky": ["s2f", "s3e", "s5a"], "gluh": ["s1f", "s4c", "s4e"],
          "bublik": ["s2c"], "boss": ["s3d"], "merc": ["s3a"]}
lines = {l["id"]: l for l in json.load(open(os.path.join(HERE, "lines.json"), encoding="utf-8"))["lines"]}

def transcribe(f):
    body = {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(f, "rb").read()).decode()}},
             {"text": "Расшифруй дословно речь в аудио, каждую фразу-реплику с новой строки. Только текст."}]}]}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
                                 data=json.dumps(body).encode(), headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
    try: return json.load(urllib.request.urlopen(req, timeout=300))["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e: return f"<err {e}>"

def split(path, n):
    a, sr = sf.read(path); a = a if a.ndim == 1 else a.mean(1)
    if n == 1: return [a], sr
    hop = sr // 100; rms = np.array([np.sqrt((a[i:i + hop] ** 2).mean()) for i in range(0, len(a) - hop, hop)])
    thr = max(0.008, np.percentile(rms, 90) * 0.04); sil = rms < thr
    runs, i = [], 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]: j += 1
            if i > 0 and j < len(sil): runs.append((j - i, i, j))
            i = j
        else: i += 1
    cuts = sorted(sorted(runs, reverse=True)[: n - 1], key=lambda r: r[1])
    if len(cuts) < n - 1: return None, sr
    bounds = [0] + [((c[1] + c[2]) // 2) * hop for c in cuts] + [len(a)]
    return [a[bounds[k]:bounds[k + 1]] for k in range(n)], sr

groups = sys.argv[1:] or list(GROUPS)
os.makedirs(os.path.join(HERE, "graw"), exist_ok=True)
for g in groups:
    ids = GROUPS[g]; voice = CAST[lines[ids[0]]["v"]][0]
    prompt = "\n\n[long pause]\n\n".join(f"[{TAG[i]}] {lines[i]['t']}" for i in ids)
    full = os.path.join(HERE, "graw", f"_{g}.wav"); ok = False
    for m in MODELS:
        gemini_tts.MODEL = m
        if tts(voice, prompt, full, tries=2): ok = True; print(g, "model", m); break
    if not ok: print(g, "FAILED"); continue
    segs, sr = split(full, len(ids))
    if segs is None: print(g, "SPLIT FAILED"); continue
    for i, s in zip(ids, segs): sf.write(os.path.join(HERE, "graw", i + ".wav"), s, sr); print(f"  {i}: {len(s)/sr:.2f}s  {lines[i]['t'][:60]}")
    print("  транскрипт:", transcribe(full).replace("\n", " | "))
