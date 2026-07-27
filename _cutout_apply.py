import os
from PIL import Image

# currency icons + supplemented COLORED cars (white/gray bg). White-bodied cars excluded.
TARGETS = [
    ("assets/A_single_bright_green_US_dolla_2026-07-24T08-36-40.png", "white"),
    ("assets/A_single_cartoon_golden_Chines_2026-07-24T08-36-40.png", "white"),
    ("assets/cars/Apple_green_Aston_Martin_Vulca_2026-07-24T03-39-47.png", "white"),
    ("assets/cars/Vibrant_orange_Lamborghini_Ave_2026-07-24T03-39-47.png", "white"),
    ("assets/cars/Fluorescent_pink_Lamborghini_A_2026-07-24T03-39-47.png", "white"),
    ("assets/cars/Mint_green_Lamborghini_Aventad_2026-07-24T03-39-47.png", "white"),
    ("assets/cars/Glossy_black_Porsche_911_Carre_2026-07-24T03-40-46.png", "white"),
    ("assets/cars/Sapphire_blue_Porsche_911_Carr_2026-07-24T03-40-46.png", "white"),
    ("assets/cars/Guards_red_Porsche_911_Carrera_2026-07-24T03-40-46.png", "sat"),
    ("assets/cars/Racing_yellow_Porsche_911_Carr_2026-07-24T03-40-47.png", "white"),
]

def is_white_bg(r, g, b):
    return r > 200 and g > 200 and b > 200 and (max(r, g, b) - min(r, g, b)) < 60

def is_desat_bg(r, g, b):
    return (max(r, g, b) - min(r, g, b)) < 22 and max(r, g, b) > 90

for path, method in TARGETS:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    removed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 20:
                continue
            if method == "white" and is_white_bg(r, g, b):
                px[x, y] = (r, g, b, 0); removed += 1
            elif method == "sat" and is_desat_bg(r, g, b):
                px[x, y] = (r, g, b, 0); removed += 1
    # band opacity after cut (real measurement)
    band = tot = 0
    for y in range(h):
        for x in range(w):
            if x < 12 or x >= w - 12 or y < 12 or y >= h - 12:
                tot += 1
                if px[x, y][3] >= 40: band += 1
    band_pct = band * 100 // tot
    opaque = sum(1 for yy in range(h) for xx in range(w) if px[xx, yy][3] >= 40)
    opaque_pct = opaque * 100 // (w * h)
    im.save(path)
    print(f"{os.path.basename(path)[:46]:46s} saved | bg={removed*100//(w*h):3d}% opaque_left={opaque_pct:3d}% frame_band={band_pct:2d}%")

print("\nDONE. White-bodied cars (3) skipped -> will regenerate via AI.")
