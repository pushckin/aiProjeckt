"""Синтез одной реплики через Gemini TTS (Google AI Studio). Ключ — из ~/.config/watch/.env или GEMINI_API_KEY.
gemini_tts.py <голос> <файл.wav> <текст с режиссёрской подсказкой>"""
import base64, json, os, re, sys, time, urllib.request, urllib.error, wave

MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")

def key():
    if os.environ.get("GEMINI_API_KEY"): return os.environ["GEMINI_API_KEY"]
    return re.search(r"^GEMINI_API_KEY=(.*)$", open(os.path.expanduser("~/.config/watch/.env")).read(), re.M).group(1).strip()

def tts(voice, prompt, out, tries=4):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    for k in range(tries):
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
                                     data=json.dumps(body).encode(), headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=420))
            part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
            raw = base64.b64decode(part["data"]); mime = part.get("mimeType", "")
            print("mime:", mime, len(raw), file=sys.stderr)
            if raw[:4] == b"RIFF": open(out, "wb").write(raw); return True
            m = re.search(r"rate=(\d+)", mime); rate = int(m.group(1)) if m else 24000
            with wave.open(out, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)
            return True
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode(errors="ignore"); print("HTTP", e.code, msg, file=sys.stderr)
            if e.code in (429, 500, 503): time.sleep(8 * (k + 1)); continue
            return False
        except (TimeoutError, urllib.error.URLError, ConnectionError) as e:
            print("net:", e, file=sys.stderr); time.sleep(5); continue
        except (KeyError, IndexError) as e:
            print("no audio:", json.dumps(d)[:300], file=sys.stderr); time.sleep(3)
    return False

if __name__ == "__main__":
    ok = tts(sys.argv[1], sys.argv[3], sys.argv[2]); print("ok" if ok else "FAIL"); sys.exit(0 if ok else 1)
