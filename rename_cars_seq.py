import os, re, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
CARS = os.path.join(ROOT, 'assets', 'cars')

# 1) 收集当前 car_*.png，按源图前缀数字排序
paths = sorted(glob.glob(os.path.join(CARS, 'car_*.png')))
def num(p):
    m = re.search(r'car_(\d+)\.png', os.path.basename(p))
    return int(m.group(1)) if m else 9999

items = [(os.path.basename(p), num(p)) for p in paths]
items.sort(key=lambda x: x[1])  # 按源图编号升序

# 源图编号 -> 顺序号(1..47)
seq_of = {src: i + 1 for i, (_, src) in enumerate(items)}
print('源图文件数:', len(items))
print('顺序映射示例:')
for src, seq in list(seq_of.items())[:3] + list(seq_of.items())[-3:]:
    print(f'  car_{src:02d}.png (源) -> car_{seq:02d}.png (顺序)')

# 2) 两阶段重命名，避免覆盖
tmp_map = {}
for fn, src in items:
    t = fn[:-4] + '_tmp.png'
    os.rename(os.path.join(CARS, fn), os.path.join(CARS, t))
    tmp_map[src] = t

for src, t in tmp_map.items():
    target = f'car_{seq_of[src]:02d}.png'
    os.rename(os.path.join(CARS, t), os.path.join(CARS, target))

# 3) 校验：重命名后 car_01..car_47 应全部存在
missing = [f'car_{i:02d}.png' for i in range(1, 48)
           if not os.path.exists(os.path.join(CARS, f'car_{i:02d}.png'))]
print('\n重命名后缺失文件:', missing if missing else '无（car_01..car_47 全部存在）')
print('当前 cars 目录文件总数:', len(glob.glob(os.path.join(CARS, 'car_*.png'))))
