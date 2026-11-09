"""Проверка реплики: Gemini расшифровывает wav и оценивает подачу. gemini_check.py file.wav ["ожидаемый текст"]"""
import base64, json, sys, urllib.request
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from gemini_tts import key
f = sys.argv[1]; exp = sys.argv[2] if len(sys.argv) > 2 else ""
q = ("Расшифруй дословно, что сказано в аудио (только речь). Затем одной строкой: тембр, эмоция, есть ли лишние слова/инструкции, "
     "пауза в начале/конце, артефакты." + (f" Ожидаемый текст: «{exp}». Совпадает ли?" if exp else ""))
body = {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(f, "rb").read()).decode()}}, {"text": q}]}]}
req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
                             data=json.dumps(body).encode(), headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req, timeout=300))
print(d["candidates"][0]["content"]["parts"][0]["text"])
