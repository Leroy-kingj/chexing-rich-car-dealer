import os, re, colorsys
from PIL import Image
from collections import Counter

CARS = "assets/cars"
GD = "game_data.js"

ENGLISH = {"黑":"black","白":"white","银":"silver","灰":"gray","红":"red",
           "蓝":"blue","青":"cyan","绿":"green","黄":"yellow","橙":"orange",
           "紫":"purple","粉":"pink"}
ORDER = ["绿","蓝","青","黄","橙","紫","粉","红","黑","白","银","灰"]
COLOR_MAP = {
    "黑":("achr",None,1.0,0.22), "白":("achr",None,0.12,1.12),
    "银":("achr",None,0.22,1.04),"灰":("achr",None,0.18,0.72),
    "红":("chrom",0.00,1.0,1.0), "蓝":("chrom",0.585,1.0,1.0),
    "青":("chrom",0.51,1.0,1.0), "绿":("chrom",0.33,1.0,1.0),
    "黄":("chrom",0.14,1.0,1.0), "橙":("chrom",0.075,1.0,1.0),
    "紫":("chrom",0.77,1.0,1.0), "粉":("chrom",0.92,0.85,1.0),
}

def target_for(name):
    for k in ORDER:
        if k in name:
            return k, COLOR_MAP[k]
    return None, None

def base_hue(path):
    im=Image.open(path).convert("RGBA"); px=im.load(); w,h=im.size
    hues=[]
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a<40: continue
            r/=255;g/=255;b/=255
            mn=min(r,g,b);mx=max(r,g,b)
            if mx-mn<0.12 or mx<0.18: continue
            hues.append(colorsys.rgb_to_hsv(r,g,b)[0])
    return Counter(hues).most_common(1)[0][0] if hues else 0.585

def recolor(src, tdef, baseH, out):
    im=Image.open(src).convert("RGBA"); px=im.load(); w,h=im.size
    o=im.copy().load(); typ,H,sMul,vMul=tdef
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a<40: continue
            r/=255;g/=255;b/=255
            hh,ss,vv=colorsys.rgb_to_hsv(r,g,b)
            if typ=="chrom":
                hh=(hh+(H-baseH)%1.0)%1.0; ss=min(1.0,ss*sMul)
            else:
                ss=min(1.0,ss*sMul); vv=min(1.0,vv*vMul)
            rr,gg,bb=colorsys.hsv_to_rgb(hh,ss,vv)
            o[x,y]=(int(rr*255),int(gg*255),int(bb*255),a)
    o_im=im.copy(); o_im.putdata([o[x,y] for y in range(h) for x in range(w)])
    o_im.save(out)

# parse game_data.js
with open(GD, encoding="utf-8") as f:
    lines = f.readlines()

cars=[]  # (id, name, image, line_idx)
for i,l in enumerate(lines):
    m_id=re.search(r'"id":\s*(\d+)', l)
    m_nm=re.search(r'"name":\s*"([^"]*)"', l)
    m_im=re.search(r'"image":\s*"([^"]*)"', l)
    if m_id and m_nm and m_im:
        cars.append((int(m_id.group(1)), m_nm.group(1), m_im.group(1), i))

# group by base image that is a car_XX.png (skip AI-timestamped / already-distinct)
groups={}
for cid,name,image,li in cars:
    if re.match(r'car_\d+\.png$', image):
        groups.setdefault(image, []).append((cid,name,image,li))

mapping={}  # id -> new filename
for base, members in groups.items():
    if len(members) < 2:
        continue  # single-variant base, nothing to fix
    bpath=os.path.join(CARS, base)
    if not os.path.exists(bpath):
        continue
    bH=base_hue(bpath)
    used=set()
    for cid,name,image,li in members:
        key,tdef=target_for(name)
        if key is None:
            continue
        en=ENGLISH[key]
        # avoid filename collision within group
        suffix=en
        cnt=1
        while suffix in used:
            cnt+=1; suffix=f"{en}{cnt}"
        used.add(suffix)
        outname=base.replace(".png", f"_{suffix}.png")
        outpath=os.path.join(CARS, outname)
        recolor(bpath, tdef, bH, outpath)
        mapping[cid]=outname
        print(f"  id={cid:3d} {name:14s} -> {outname}")

# patch game_data.js
newlines=lines[:]
for cid,outname in mapping.items():
    for i,l in enumerate(newlines):
        if re.search(rf'"id":\s*{cid}\b', l):
            newlines[i]=re.sub(r'("image":\s*")[^"]*(")', rf'\1{outname}\2', l)
            break
with open(GD,"w",encoding="utf-8") as f:
    f.writelines(newlines)
print(f"\nPatched game_data.js: {len(mapping)} variants recolored across {len([g for g in groups.values() if len(g)>=2])} series.")
