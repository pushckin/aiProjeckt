#!/usr/bin/env python3
"""Нарезка вертикальных Shorts из мультфильма: 1080x1920, запиканный мат, крупные субтитры."""
import re, subprocess, sys, os

SRC, SRT, OUT, FONTS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
os.makedirs(OUT, exist_ok=True)

# (имя, начало, конец, плашка, заголовок, длительность финальной плашки «полная версия», ширина кадра из 1920)
CLIPS = [
    ("2_Когда_в_отряде_есть_Глух",   59.5,  90.8, "ИНСТРУКТАЖ",          "КОГДА В ОТРЯДЕ\\NЕСТЬ ГЛУХ", 2.6, 1728),
    ("3_Тихо_как_ниндзя",   95.5, 131.0, "ПРОНИКНОВЕНИЕ",       "ТИХО,\\NКАК НИНДЗЯ", 2.6, 1728),
    ("1_Задание_выполнено", 185.3, 224.0, "ФИНАЛ",               "ЗАДАНИЕ ВЫПОЛНЕНО.\\NБЕЗ ПОТЕРЬ.", 2.6, 1728),
    ("5_Когда_кончился_кофе", 243.6, 256.9, "СЦЕНА ПОСЛЕ ТИТРОВ",  "КОГДА КОНЧИЛСЯ\\NКОФЕ", 0, 1728),
    ("4_Худший_отряд_спецназа",   12.6,  37.6, "ЗНАКОМЬТЕСЬ",         "ХУДШИЙ ОТРЯД\\NСПЕЦНАЗА", 2.6, 1920),
]
# интервалы мата в исходнике (с), найдены по огибающей голосовых дорожек
BLEEPS = [(79.848, 80.708), (122.341, 122.681), (207.259, 207.619)]
CENSOR = {"Блядь": "Б**дь", "сука": "с*ка", "хуйню": "х**ню"}


def ts(s):
    return float(s[:2]) * 3600 + float(s[3:5]) * 60 + float(s[6:8]) + float(s[9:12]) / 1000


def parse_srt(path):
    cues = []
    for block in open(path, encoding="utf-8").read().strip().split("\n\n"):
        lines = block.strip().split("\n")
        a, b = lines[1].split(" --> ")
        text = " ".join(lines[2:])
        for k, v in CENSOR.items():
            text = text.replace(k, v)
        cues.append((ts(a), ts(b), text))
    return cues


def split_cue(a, b, text):
    """Длинную реплику режем по предложениям, время делим по длине текста."""
    parts = [p for p in re.split(r"(?<=[.!?…])\s+", text) if p]
    merged = []
    for p in parts:  # склеиваем совсем короткие куски
        if merged and len(merged[-1]) + len(p) < 28:
            merged[-1] += " " + p
        else:
            merged.append(p)
    total = sum(len(p) for p in merged)
    out, t = [], a
    for p in merged:
        d = (b - a) * len(p) / total
        out.append((t, t + d, p))
        t += d
    return out


def ass_time(s):
    s = max(0, s)
    h, m = int(s // 3600), int(s // 60) % 60
    return f"{h}:{m:02d}:{s % 60:05.2f}"


HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Tag,Russo One,44,&H00101010,&H00000000,&H0000C8FF,&H00000000,0,0,0,0,100,100,2,0,3,10,0,8,60,60,250,1
Style: Title,Russo One,84,&H00FFFFFF,&H00000000,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,8,50,50,330,1
Style: Cap,RubikBlack,76,&H00FFFFFF,&H00000000,&H00000000,&H96000000,0,0,0,0,100,100,0,0,1,7,3,8,70,70,1370,1
Style: End,Russo One,54,&H0000C8FF,&H00000000,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,6,3,8,60,60,1370,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

cues = parse_srt(SRT)
for name, start, end, tag, title, endcard, cw in CLIPS:
    fh = round(1080 * 1080 / cw / 2) * 2
    fy = 570 + (760 - fh) // 2
    dur = end - start
    ev = [
        f"Dialogue: 0,{ass_time(0)},{ass_time(dur)},Tag,,0,0,0,,{tag}",
        f"Dialogue: 0,{ass_time(0)},{ass_time(dur)},Title,,0,0,0,,{{\\fad(150,0)}}{title}",
    ]
    for a, b, text in cues:
        if b <= start or a >= end:
            continue
        for ca, cb, ct in split_cue(a, b, text):
            # последние 2.6 с субтитры уступают место финальной плашке
            ca, cb = max(ca, start) - start, min(cb, end - endcard) - start
            if cb - ca > 0.15:
                ev.append(f"Dialogue: 1,{ass_time(ca)},{ass_time(cb)},Cap,,0,0,0,,{ct}")
    # финальная плашка: ведём на полную версию
    if endcard:
        ev.append(f"Dialogue: 2,{ass_time(dur - endcard)},{ass_time(dur)},End,,0,0,0,,{{\\fad(200,0)}}ПОЛНАЯ ВЕРСИЯ —\\NНА КАНАЛЕ ▶")
    ass_path = os.path.join(OUT, name + ".ass")
    open(ass_path, "w", encoding="utf-8").write(HEADER + "\n".join(ev) + "\n")

    bl = [(max(a, start) - start, min(b, end) - start) for a, b in BLEEPS if b > start and a < end]
    cond = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in bl) or "0"
    # sine выдаёт 1/8 полной шкалы, поэтому усиление 1.4 даёт громкость, близкую к речи
    afilt = (f"[0:a]volume=volume='if({cond},0,1)':eval=frame[m];"
             f"sine=frequency=1000:sample_rate=48000:duration={dur:.3f},aformat=channel_layouts=stereo,"
             f"volume=volume='if({cond},1.4,0)':eval=frame[bp];"
             f"[m][bp]amix=inputs=2:normalize=0:duration=first[a]")
    vfilt = ("[0:v]split[x][y];"
             "[x]scale=-2:1920,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.22:saturation=0.8[bg];"
             f"[y]crop={cw}:1080,scale=1080:{fh}[fg];"
             f"[bg][fg]overlay=0:{fy},ass={ass_path}:fontsdir={FONTS}[v]")
    out = os.path.join(OUT, name + ".mp4")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}",
           "-i", SRC, "-filter_complex", vfilt + ";" + afilt, "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"{name}: {dur:.1f}s, бипов: {len(bl)} -> {out}")
