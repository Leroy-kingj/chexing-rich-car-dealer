import os, colorsys
from PIL import Image
from collections import Counter

CARS = "assets/cars"

# color keyword -> target. type 'chrom' uses H; 'achr' uses s/v multipliers
COLOR_MAP = {
    "黑":   ("achr", None, 1.0, 0.22),   # black: darken
    "白":   ("achr", None, 0.12, 1.12),  # white: desaturate+lighten
    "银":   ("achr", None, 0.22, 1.04),  # silver
    "灰":   ("achr", None, 0.18, 0.72),  # gray
    "红":   ("chrom", 0.00, 1.0, 1.0),
    "蓝":   ("chrom", 0.585, 1.0, 1.0),
    "青":   ("chrom", 0.51, 1.0, 1.0),
    "绿":   ("chrom", 0.33, 1.0, 1.0),
    "黄":   ("chrom", 0.14, 1.0, 1.0),
    "橙":   ("chrom", 0.075,1.0, 1.0),
    "紫":   ("chrom", 0.77, 1.0, 1.0),
    "粉":   ("chrom", 0.92, 0.85,1.0),
}
# order matters: longer keywords first
ORDER = ["绿","蓝","青","红","黄","橙","紫","粉","黑","白","银","灰"]

def target_for(name):
    for k in ORDER:
        if k in name:
            return k, COLOR_MAP[k]
    return None, None

def base_hue(path):
    im = Image.open(path).convert("RGBA"); px = im.load(); w,h = im.size
    hues=[]
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if a < 40: continue
            r/=255; g/=255; b/=255
            mn=min(r,g,b); mx=max(r,g,b)
            if mx-mn < 0.12: continue   # skip near-achromatic (outline/shadow/white)
            if mx < 0.18: continue      # skip very dark
            hh,ss,vv = colorsys.rgb_to_hsv(r,g,b)
            hues.append(hh)
    if not hues: return 0.585
    c=Counter(hues); return c.most_common(1)[0][0]

def recolor(path, tkey, tdef, baseH, outpath):
    im = Image.open(path).convert("RGBA")
    px = im.load(); w,h = im.size
    out = im.copy(); o = out.load()
    typ, H, sMul, vMul = tdef
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if a < 40:
                o[x,y]=(r,g,b,a); continue
            r/=255; g/=255; b/=255
            hh,ss,vv = colorsys.rgb_to_hsv(r,g,b)
            if typ == "chrom":
                delta = (H - baseH) % 1.0
                hh = (hh + delta) % 1.0
                ss = min(1.0, ss * sMul)
            else:  # achromatic
                ss = min(1.0, ss * sMul)
                vv = min(1.0, vv * vMul)
            rr,gg,bb = colorsys.hsv_to_rgb(hh, ss, vv)
            o[x,y] = (int(rr*255), int(gg*255), int(bb*255), a)
    out.save(outpath)
    # verify: report dominant body hue after
    hues=[]
    op=out.load()
    for y in range(h):
        for x in range(w):
            r,g,b,a=op[x,y]
            if a<40: continue
            r/=255;g/=255;b/=255
            mn=min(r,g,b);mx=max(r,g,b)
            if mx-mn<0.12 or mx<0.18: continue
            hues.append(colorsys.rgb_to_hsv(r,g,b)[0])
    res = Counter(hues).most_common(1)[0][0] if hues else -1
    print(f"  {os.path.basename(outpath)[:40]:40s} new_body_hue={res:.3f} (target {H})")

# ---- validate on 慕尚 (car_26) and I8 (car_12) ----
series = {
    "car_26.png": [  # 慕尚
        ("慕尚黑","黑"), ("慕尚蓝","蓝"), ("慕尚红","红"), ("慕尚紫","紫"),
    ],
    "car_12.png": [  # I8
        ("I8神秘灰","灰"), ("I8离子银","银"), ("I8质子蓝","蓝"), ("I8水晶白","白"), ("I8质子红","红"),
    ],
}
for base, variants in series.items():
    bp = os.path.join(CARS, base)
    bH = base_hue(bp)
    print(f"BASE {base} base_hue={bH:.3f}")
    for vname, key in variants:
        _, tdef = target_for(key)
        out = os.path.join(CARS, base.replace(".png", f"_{key}.png"))
        recolor(bp, key, tdef, bH, out)
    print()
print("VALIDATION RUN COMPLETE (files written for 慕尚 + I8 only).")
