"""python3 tools_grid.py out.jpg cols img1 img2 ... — сетка снимков с подписью времени (из имени файла)"""
import sys, re
from PIL import Image, ImageDraw, ImageFont
out, cols, fs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert("RGB").resize((640, 360)) for f in fs]
S = Image.new("RGB", (cols * 640, -(-len(ims) // cols) * 360), "white"); g = ImageDraw.Draw(S)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
except Exception: font = None
for i, (im, f) in enumerate(zip(ims, fs)):
    x, y = (i % cols) * 640, (i // cols) * 360; S.paste(im, (x, y)); m = re.search(r"_([\d.]+)\.(jpg|png)$", f)
    g.rectangle([x, y, x + 96, y + 34], fill="black"); g.text((x + 6, y + 3), m.group(1) if m else "", fill="white", font=font)
S.save(out, quality=88); print(out)
