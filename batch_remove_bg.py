#!/usr/bin/env python3
"""
批量抠图脚本：将汽车图鉴和车标图鉴的图片底板移除，输出透明PNG。
用法: python batch_remove_bg.py
输入: 汽车图鉴/*.jpg|jpeg, 车标图鉴/*.png
输出: assets/cars/car_XX.png, assets/logos/logo_XX.png
"""

import os
import sys
import json
import re
import time
from pathlib import Path

# --- 配置 ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR
CAR_SRC_DIR = Path(r"E:\Made Games\预写方案\自研备选\[社交收集、休闲]车行项目（99%）\汽车图鉴")
LOGO_SRC_DIR = Path(r"E:\Made Games\预写方案\自研备选\[社交收集、休闲]车行项目（99%）\车标图鉴")
CAR_OUT_DIR = PROJECT_DIR / "assets" / "cars"
LOGO_OUT_DIR = PROJECT_DIR / "assets" / "logos"

# --- 加载游戏数据 ---
def load_game_data():
    js_path = PROJECT_DIR / "game_data.js"
    content = js_path.read_text("utf-8")
    # 找到 = 后面的 JSON 部分
    idx = content.index("=")
    rest = content[idx+1:].strip()
    while rest and rest[-1] in (";", "\n", "\r", " "):
        rest = rest[:-1]
    return json.loads(rest)

# --- 抠图处理 ---
def remove_bg(input_path, output_path):
    """用 rembg 移除背景，输出 PNG"""
    try:
        from rembg import remove
        from PIL import Image

        img = Image.open(input_path)
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        start = time.time()
        result = remove(img)
        elapsed = time.time() - start

        result.save(output_path, "PNG")
        size_kb = output_path.stat().st_size / 1024
        print(f"  ✓ {input_path.name} -> {output_path.name} ({size_kb:.0f}KB, {elapsed:.1f}s)")
        return True
    except Exception as e:
        print(f"  ✗ {input_path.name} ERROR: {e}")
        return False

# --- 主流程 ---
def main():
    data = load_game_data()
    cars = data.get("cars", [])

    # 确保输出目录存在
    CAR_OUT_DIR.mkdir(parents=True, exist_ok=True)
    LOGO_OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ===== 1. 处理汽车图片 =====
    print("=" * 60)
    print("第1步: 处理汽车图片（抠图去底板）")
    print(f"源目录: {CAR_SRC_DIR}")
    print(f"输出目录: {CAR_OUT_DIR}")
    print("=" * 60)

    # 建立: 唯一image文件名 -> [源文件路径列表] 的映射
    # 数据中 image 字段如 "car_01.jpg", 源文件名如 "01福特-野马.jpg"
    # 用编号前缀匹配: "01" -> car_01
    image_to_sources = {}
    for car in cars:
        img_file = car.get("image")
        if not img_file:
            continue
        if img_file not in image_to_sources:
            image_to_sources[img_file] = []

    # 遍历源文件，按编号前缀匹配
    src_files = sorted(CAR_SRC_DIR.iterdir())
    processed_images = set()

    for src_file in src_files:
        if src_file.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        # 提取编号前缀: "01福特-野马.jpg" -> "01"
        m = re.match(r"^(\d{1,2})", src_file.stem)
        if not m:
            print(f"  ? 无法识别编号: {src_file.name}")
            continue
        num = int(m.group(1))
        target_name = f"car_{num:02d}.png"
        target_path = CAR_OUT_DIR / target_name

        if target_name in processed_images:
            continue  # 同一编号只处理一次

        remove_bg(src_file, target_path)
        processed_images.add(target_name)

    print(f"\n汽车图片处理完成: {len(processed_images)}/{len(image_to_sources)} 张\n")

    # ===== 2. 处理车标图片 =====
    print("=" * 60)
    print("第2步: 处理车标图片（抠图去底板）")
    print(f"源目录: {LOGO_SRC_DIR}")
    print(f"输出目录: {LOGO_OUT_DIR}")
    print("=" * 60)

    # 建立 brand -> logo 文件名映射
    brand_to_logo = {}
    for car in cars:
        brand = car.get("brand", "").strip()
        logo = car.get("logo")
        if brand and logo and brand not in brand_to_logo:
            brand_to_logo[brand] = logo

    logo_count = 0
    for src_file in sorted(LOGO_SRC_DIR.iterdir()):
        if src_file.suffix.lower() != ".png":
            continue
        brand_name = src_file.stem  # 如 "丰田", "法拉利"
        if brand_name in brand_to_logo:
            logo_filename = brand_to_logo[brand_name]
            # 输出为 PNG (保持原名但确保扩展名正确)
            out_name = Path(logo_filename).stem + ".png"
            target_path = LOGO_OUT_DIR / out_name
            remove_bg(src_file, target_path)
            logo_count += 1
        else:
            print(f"  ? 未匹配品牌: {brand_name}")

    print(f"\n车标处理完成: {logo_count} 个\n")

    # ===== 3. 更新 game_data.js 的扩展名 =====
    print("=" * 60)
    print("第3步: 更新 game_data.js 图片引用 (.jpg -> .png)")
    print("=" * 60)

    changed = 0
    js_content = (PROJECT_DIR / "game_data.js").read_text("utf-8")

    # 替换 .jpg/.jpeg 为 .png 在 image 和 logo 字段中
    # 匹配 "image": "...jpg" 或 "logo": "...jpg"
    _ext_re = re.compile(r'\.(jpg|jpeg)$')
    def _replace_json_ext(m):
        nonlocal changed
        key = m.group(1)
        val = m.group(2)
        new_val = _ext_re.sub('.png', val)
        if new_val != val:
            changed += 1
        return f'"{key}": "{new_val}"'
    new_js = re.sub(
        r'"(image|logo)":\s*"([^"]+\.(?:jpg|jpeg))"',
        _replace_json_ext,
        js_content
    )

    # 统计实际变化
    old_exts = len(re.findall(r'\.(jpg|jpeg)"', js_content))
    new_exts = len(re.findall(r'\.(jpg|jpeg)"', new_js))

    (PROJECT_DIR / "game_data.js").write_text(new_js, "utf-8")
    print(f"  已将 .jpg/.jpeg 引用更新为 .png ({changed} 处)\n")

    print("=" * 60)
    print("全部完成!")
    print(f"  汽车: {CAR_OUT_DIR}/ 下 {len(list(CAR_OUT_DIR.glob('*.png')))} 个 PNG")
    print(f"  车标: {LOGO_OUT_DIR}/ 下 {len(list(LOGO_OUT_DIR.glob('*.png')))} 个 PNG")
    print("=" * 60)

if __name__ == "__main__":
    main()
