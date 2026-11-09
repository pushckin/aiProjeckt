"""sheet.py video.mp4 out.jpg [step=0.25] — frame sheet with a timecode in the corner of every frame (for the chat critic)."""
import subprocess, sys, tempfile, glob, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]; step = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
d = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-vf", f"fps={1/step},scale=384:-1", f"{d}/f%04d.jpg"], check=True)
fs = sorted(glob.glob(f"{d}/*.jpg")); cols = 5; im0 = Image.open(fs[0]); w, h = im0.size
S = Image.new("RGB", (cols * w, -(-len(fs) // cols) * h), "white"); g = ImageDraw.Draw(S)
try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except OSError: f = None
for i, p in enumerate(fs):
    x, y = (i % cols) * w, (i // cols) * h; S.paste(Image.open(p), (x, y))
    t = f"{i*step:.2f}".replace(".", ","); g.rectangle([x, y, x + 70, y + 28], fill="black"); g.text((x + 6, y + 3), t, fill="white", font=f)
S.save(out, quality=85); [os.remove(p) for p in fs]; print(out, len(fs))
