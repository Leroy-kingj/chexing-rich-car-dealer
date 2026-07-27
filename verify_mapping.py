import os, re, json, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = r"E:/Made Games/预写方案/自研备选/[社交收集、休闲]车行项目（99%）/汽车图鉴"
CARS = os.path.join(ROOT, 'assets', 'cars')

# 读取源图，按前缀数字排序 -> 顺序号
srcs = [f for f in os.listdir(SRC_DIR) if f.lower().endswith(('.jpg', '.jpeg'))]
def snum(f):
    m = re.match(r'(\d+)', f); return int(m.group(1)) if m else 1e9
srcs.sort(key=snum)

seq_src = {}  # 顺序号(1..47) -> (源文件名, 品牌, 车型)
for i, f in enumerate(srcs, 1):
    base = re.sub(r'\.(jpg|jpeg)$', '', f, flags=re.I)
    m = re.match(r'(\d+)(.+?)-(.+)', base)
    brand = m.group(2) if m else base
    model = m.group(3) if m else base
    seq_src[i] = (f, brand, model)

# 读取 game_data
raw = open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
raw = re.sub(r'//.*$', '', raw, flags=re.M)
D = json.loads(raw.replace('window.GAME_DATA', '').replace('=', '', 1).strip().rstrip(';'))

def norm(s):
    return (s or '').replace('·', '').replace(' ', '').replace('-', '').replace('.', '').lower()

print('=== 逐车核验 (顺序号 / 配置车名 / 源图品牌-车型 / 结果) ===')
mismatch = []
for car in D['cars']:
    if not car.get('image'):
        print(f"  [跳过] id={car['id']} {car['name']}  image=null (无素材)")
        continue
    seq = int(re.search(r'car_(\d+)\.png', car['image']).group(1))
    sfile, sbrand, smodel = seq_src[seq]
    cb = norm(car['brand'])
    cm = norm(car['name'])
    sb = norm(sbrand)
    sm = norm(smodel)
    # 品牌匹配
    brand_ok = (cb in sb) or (sb in cb) or (cb == 'biaozhi' and sb == 'biaozhi')  # 标致/标志别名
    # 车型匹配: 源车型需出现在配置名中
    model_ok = (sm in cm) or (cm in sm) or (sb == 'biaozhi')  # 标致别名放宽
    ok = brand_ok and model_ok
    if not ok:
        mismatch.append((seq, car['name'], car['brand'], sfile, sbrand, smodel))
        print(f"  [对不上] #{seq:02d} 配置='{car['brand']} {car['name']}' 源图='{sbrand}-{smodel}' ({sfile})")
    else:
        print(f"  [OK] #{seq:02d} {car['brand']} {car['name']}  <=> {sbrand}-{smodel}")

print('\n=== 汇总 ===')
print('总车数:', len([c for c in D['cars'] if c.get('image')]))
print('对不上数量:', len(mismatch))
print('提示: 标致(配置) vs 标志(源图文件名)为写法差异, 非素材错位。')
