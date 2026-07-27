#!/usr/bin/env python3
"""生成『车行』安卓应用图标：品牌橙底 + 白色车体剪影（不依赖中文字体）。
输出：store-listing/icon/icon-512.png + icon.svg，以及 android 各密度 mipmap。
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORANGE = (232, 90, 0, 255)      # #e85a00 品牌橙
ORANGE_DK = (200, 74, 0, 255)
WHITE = (255, 255, 255, 255)
OUT = os.path.join(ROOT, "store-listing", "icon")
os.makedirs(OUT, exist_ok=True)


def rounded_square(size, radius_ratio=0.22):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=ORANGE)
    # 轻微渐变感：底部叠一层暗橙
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([0, int(size * 0.55), size - 1, size - 1], radius=r, fill=ORANGE_DK)
    img = Image.alpha_composite(img, sh)
    return img


def draw_car(d, s):
    """在 size=s 的画布上画白色车体剪影，居中。"""
    cx = s / 2
    # 车身主体（圆角矩形）
    body_top = s * 0.42
    body_bot = s * 0.66
    body_l = s * 0.16
    body_r = s * 0.84
    d.rounded_rectangle([body_l, body_top, body_r, body_bot], radius=s * 0.05, fill=WHITE)
    # 车顶（梯形感：上方小矩形）
    roof_top = s * 0.30
    roof_l = s * 0.34
    roof_r = s * 0.66
    d.rounded_rectangle([roof_l, roof_top, roof_r, body_top + s * 0.02], radius=s * 0.03, fill=WHITE)
    # 车窗（橙色挖空）
    d.rounded_rectangle([roof_l + s * 0.02, roof_top + s * 0.02, roof_r - s * 0.02, body_top - s * 0.01],
                        radius=s * 0.02, fill=ORANGE)
    # 车轮
    wr = s * 0.085
    for wx in (s * 0.32, s * 0.68):
        wy = body_bot + s * 0.02
        d.ellipse([wx - wr, wy - wr, wx + wr, wy + wr], fill=WHITE)
        d.ellipse([wx - wr * 0.5, wy - wr * 0.5, wx + wr * 0.5, wy + wr * 0.5], fill=ORANGE)


def make_icon(size):
    img = rounded_square(size)
    d = ImageDraw.Draw(img)
    draw_car(d, size)
    # 轻微阴影提升质感
    return img


# 1) 512 主图标（store-listing）
master = make_icon(512)
master.save(os.path.join(OUT, "icon-512.png"))

# 2) SVG 源（矢量，方便二次加工）
svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#e85a00"/><stop offset="1" stop-color="#c84a00"/></linearGradient></defs>
<rect x="0" y="0" width="512" height="512" rx="112" fill="url(#g)"/>
<g fill="#ffffff">
<rect x="82" y="215" width="348" height="124" rx="26"/>
<rect x="174" y="154" width="164" height="70" rx="16"/>
<rect x="190" y="166" width="132" height="44" rx="10" fill="#e85a00"/>
<circle cx="164" cy="350" r="44"/><circle cx="348" cy="350" r="44"/>
<circle cx="164" cy="350" r="22" fill="#e85a00"/><circle cx="348" cy="350" r="22" fill="#e85a00"/>
</g></svg>'''
with open(os.path.join(OUT, "icon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)

# 3) 安卓 mipmap 各密度（legacy ic_launcher / ic_launcher_round + 自适应 foreground）
densities = {
    "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192,
}
android_res = os.path.join(ROOT, "android-app", "android", "app", "src", "main", "res")
for folder, dsize in densities.items():
    fd = os.path.join(android_res, folder)
    os.makedirs(fd, exist_ok=True)
    # legacy 方形图标
    make_icon(dsize).save(os.path.join(fd, "ic_launcher.png"))
    # 圆形图标（裁剪为圆）
    circ = make_icon(dsize)
    mask = Image.new("L", (dsize, dsize), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, dsize - 1, dsize - 1], fill=255)
    circ.putalpha(mask)
    circ.save(os.path.join(fd, "ic_launcher_round.png"))
    # 自适应前景（透明背景的车体，108 基准按密度缩放）
    fg = Image.new("RGBA", (dsize, dsize), (0, 0, 0, 0))
    fd2 = ImageDraw.Draw(fg)
    # 前景只在中心 72dp 区域绘制车体
    scale = dsize / 108.0
    # 用一个临时大图绘制再缩放到中心
    tmp = Image.new("RGBA", (108, 108), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    draw_car(td, 108)
    tmp = tmp.resize((int(72 * scale), int(72 * scale)), Image.LANCZOS)
    fg.paste(tmp, (int((dsize - 72 * scale) / 2), int((dsize - 72 * scale) / 2)), tmp)
    fg.save(os.path.join(fd, "ic_launcher_foreground.png"))

print("icon generated:", os.path.join(OUT, "icon-512.png"))
print("android mipmaps updated for:", list(densities.keys()))
