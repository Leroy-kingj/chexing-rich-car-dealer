# -*- coding: utf-8 -*-
import xlrd, os, shutil, json

SRC = r"E:/Made Games/预写方案/游戏框架预案合集1/[社交收集、休闲]车行项目（99%）"
ROOT = r"C:/Users/Administrator/WorkBuddy/2026-07-23-12-28-02"
ASSETS = os.path.join(ROOT, "assets")
CAR_DIR = os.path.join(ASSETS, "cars")
LOGO_DIR = os.path.join(ASSETS, "logos")
os.makedirs(CAR_DIR, exist_ok=True)
os.makedirs(LOGO_DIR, exist_ok=True)

# id(1-88) -> original image filename in 汽车图鉴
IMG = {
 1:"01福特-野马.jpg",2:"02福特-蒙迪欧.jpg",3:"03丰田-86.jpg",4:"04斯巴鲁-BRZ.jpg",
 5:"05比亚迪-秦.jpg",6:"06阿尔法·罗密欧-Giulia.jpg",7:"07比亚迪-唐.jpg",8:"08阿斯顿马丁-火神.jpg",
 9:"08阿斯顿马丁-火神.jpg",10:"08阿斯顿马丁-火神.jpg",11:"11兰博基尼-埃文塔多.jpg",
 12:"11兰博基尼-埃文塔多.jpg",13:"11兰博基尼-埃文塔多.jpg",14:"11兰博基尼-埃文塔多.jpg",
 15:"15兰博基尼-Huracan.jpg",16:"16马自达MX-5.jpg",17:"17宝马-I8.jpg",18:"17宝马-I8.jpg",
 19:"17宝马-I8.jpg",20:"17宝马-I8.jpg",21:"17宝马-I8.jpg",22:"22宝马-M5.jpg",23:"22宝马-M5.jpg",
 24:"22宝马-M5.jpg",25:"25宝马-M3.jpg",26:"25宝马-M3.jpg",27:"25宝马-M3.jpg",28:"28奥迪-R8.jpg",
 29:"28奥迪-R8.jpg",30:"28奥迪-R8.jpg",31:"28奥迪-R8.jpg",32:"28奥迪-R8.jpg",33:"33奥迪-RS7.jpg",
 34:"33奥迪-RS7.jpg",35:"33奥迪-RS7.jpg",36:"36奥迪-A7.jpg",37:"36奥迪-A7.jpg",38:"36奥迪-A7.jpg",
 39:"39奔驰-SL级AMG.jpg",40:"39奔驰-SL级AMG.jpg",41:"39奔驰-SL级AMG.jpg",42:"42奔驰-迈巴赫S级.jpg",
 43:"42奔驰-迈巴赫S级.jpg",44:"44奔驰-GLS级.jpg",45:"44奔驰-GLS级.jpg",46:"44奔驰-GLS级.jpg",
 47:"47奔驰-E级.jpg",48:"47奔驰-E级.jpg",49:"47奔驰-E级.jpg",50:"50 布加迪-威航.jpg",
 51:None,52:"52保时捷-718.jpg",53:"53保时捷-911.jpg",54:"53保时捷-911.jpg",55:"53保时捷-911.jpg",
 56:"53保时捷-911.jpg",57:"53保时捷-911.jpg",58:"58宾利-欧陆.jpg",59:"59宾利-慕尚.jpg",
 60:"59宾利-慕尚.jpg",61:"59宾利-慕尚.jpg",62:"59宾利-慕尚.jpg",63:"63大众-甲壳虫.jpg",
 64:"64大众-高尔夫.jpg",65:"65福特-F150.jpg",66:"65福特-F150.jpg",67:"65福特-F150.jpg",
 68:"65福特-F150.jpg",69:"69路虎-揽胜.jpg",70:"69路虎-揽胜.jpg",71:"69路虎-揽胜.jpg",
 72:"72法拉利-488.jpg",73:"73法拉利-LaFerrari.jpg",74:"74捷豹-F-type.jpg",75:"75雷克萨斯-LC.jpg",
 76:"76雷克萨斯-RC F.jpg",77:"77劳斯莱斯-幻影.jpg",78:"78迈凯伦-720S.jpg",79:"79玛莎拉蒂GC.jpg",
 80:"80玛莎拉蒂-GT.jpg",81:"81日产-370Z.jpg",82:"82日产-GT-R.jpg",83:"83五菱宏光S.jpg",
 84:"84雪佛兰-科迈罗.jpg",85:"85奔驰-银色闪电.jpg",86:"86标志-ONYX.jpg",87:"87雷诺-R.S.01.jpeg",
 88:"88法拉利-恩佐.jpeg",
}

# brand -> logo file (None = use text badge)
LOGOS = {
 "福特":"福特.png","丰田":"丰田.png","斯巴鲁":"斯巴鲁.png","比亚迪":"比亚迪.png",
 "阿尔法·罗密欧":"阿尔法·罗密欧.png","阿斯顿·马丁":"阿斯顿·马丁.png","兰博基尼":"兰博基尼.png",
 "马自达":"马自达.png","宝马":"宝马.png","奥迪":"奥迪.png","奔驰":None,"布加迪":"布加迪.png",
 "本田":None,"保时捷":"保时捷.png","宾利":None,"大众":"大众.png","路虎":"路虎.png",
 "法拉利":"法拉利.png","捷豹":"捷豹.png","雷克萨斯":"雷克萨斯.png","劳斯莱斯":"劳斯莱斯.png",
 "迈凯伦":"迈凯伦.png","玛莎拉蒂":"玛莎拉蒂.png","日产":"日产.png","五菱":"五菱.png",
 "雪佛兰":"雪佛兰.png","标志":"标志.png","雷诺":"雷诺.png",
}

def num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except Exception:
        return None

# ---- copy car images (unique) ----
img_map = {}   # original filename -> sanitized name
used = {}
src_car = os.path.join(SRC, "汽车图鉴")
for fid, orig in IMG.items():
    if orig is None:
        continue
    if orig in img_map:
        continue
    idx = len(img_map) + 1
    ext = os.path.splitext(orig)[1]
    dest = f"car_{idx:02d}{ext}"
    shutil.copy2(os.path.join(src_car, orig), os.path.join(CAR_DIR, dest))
    img_map[orig] = dest

# ---- copy logos (unique) ----
logo_map = {}
src_logo = os.path.join(SRC, "车标图鉴")
for brand, lf in LOGOS.items():
    if lf is None:
        logo_map[brand] = None
        continue
    if lf in logo_map:
        logo_map[brand] = logo_map[lf]
        continue
    idx = len([k for k,v in logo_map.items() if v]) + 1
    ext = os.path.splitext(lf)[1]
    dest = f"logo_{idx:02d}{ext}"
    shutil.copy2(os.path.join(src_logo, lf), os.path.join(LOGO_DIR, dest))
    logo_map[brand] = dest

# ---- parse 汽车列表 ----
wb = xlrd.open_workbook(os.path.join(SRC, "相关配置.xls"), on_demand=True)

def sheet(name):
    return wb.sheet_by_name(name)

sh = sheet("汽车列表")
cars = []
for r in range(9, sh.nrows):  # data starts R009
    def g(c):
        v = sh.cell(r, c).value
        return v
    cid = num(g(0))
    if cid is None:
        continue
    cid = int(cid)
    name = str(g(1)).strip()
    brand = str(g(2)).strip()
    value = num(g(4)) or 0
    rating = str(g(5)).strip()
    order_price = None if str(g(6)).strip() == "无法订购" else num(g(6))
    gallery = str(g(7)).strip()
    income = num(g(8)) or 0
    capacity = num(g(9)) or 0
    tags = []
    if str(g(11)).strip() == "新手车":
        tags.append("starter")
    if str(g(11)).strip() == "首充":
        tags.append("firstcharge")
    orig = IMG.get(cid)
    image = img_map.get(orig) if orig else None
    cars.append({
        "id": cid, "name": name, "brand": brand, "rating": rating,
        "value": value, "orderPrice": order_price, "gallery": gallery,
        "income": income, "capacity": capacity, "tags": tags,
        "image": image, "logo": logo_map.get(brand),
    })
print("cars parsed:", len(cars))

# ---- galleries (summary from the per-gallery rows) ----
# Build from column [7] membership + rewards captured in a manual table
GALLERY_REWARD = {
 "新手上路":1000, "英国绅士":100000, "豪迈野牛":80000, "宝马系列":10000,
 "奥迪系列":10000, "奔驰系列":10000, "日系风采":2000, "新浪潮":50000, "马力十足":5000,
}
from collections import defaultdict
gal_members = defaultdict(list)
for c in cars:
    gal_members[c["gallery"]].append(c["id"])
galleries = []
for gname, members in gal_members.items():
    galleries.append({
        "name": gname,
        "reward": GALLERY_REWARD.get(gname, 0),
        "members": members,
    })
print("galleries:", [(g["name"], len(g["members"])) for g in galleries])

# ---- tasks (名车之旅) ----
sh = sheet("任务配置")
chapters = [
 {"id":1,"name":"初入车行","desc":"怀着对汽车的热爱，我组建了自己的车行，听到引擎的轰鸣，热血沸腾！","rewardCar":76,"tasks":[]},
 {"id":2,"name":"拥抱财富","desc":"功夫不负有心人，车行经营初具成效，迈入豪车俱乐部已经不是梦想！","rewardCar":21,"tasks":[]},
 {"id":3,"name":"显露身手","desc":"努力的天才不会被命运抛弃，秋名山赛道，我一战成名！","rewardCar":58,"tasks":[]},
 {"id":4,"name":"称霸赛场","desc":"世界汽车拉力锦标赛，我带领车队领跑全场，车神的称号，已经响彻天下！","rewardCar":15,"tasks":[]},
 {"id":5,"name":"突破桎梏","desc":"世界上大多数豪车厂商的资助者，限量款已经不再追求，只有私人订制！","rewardCar":11,"tasks":[]},
 {"id":6,"name":"我的世界","desc":"什么是车？车的灵魂？我的车就是我的世界！","rewardCar":50,"tasks":[]},
]
# columns: ch1=0,1,2 ; ch2=4,5,6 ; ch3=8,9,10 ; ch4=0,1,2 ; ch5=4,5,6 ; ch6=8,9,10
colmap = {1:(0,1,2),2:(4,5,6),3:(8,9,10),4:(0,1,2),5:(4,5,6),6:(8,9,10)}
# header rows for chapters 1-3 at R002/R003 (data R003..R013), chapters 4-6 at R016/R017/R018..R028
for ch in chapters:
    if ch["id"] <= 3:
        # find data rows: chapter 1 rows R003-R013 (col 0,1,2), chapter2 col4,5,6, chapter3 col8,9,10
        pass
# Simpler: hardcode from the dumped text (already verified)
TASKS = {
 1:[("招募1名员工",12000),("给员工安排1次工作",15000),("分享一次游戏",5000),("拥有3辆E级车",10000),
    ("拥有3个车位",5000),("去好友家停车1次",8000),("拥有2辆D级车",5000),("每分钟收入达到1800",10000),
    ("拥有5辆车",5000),("赚取3500刀乐",5000),("赚取50000刀乐",8000)],
 2:[("挖角1名员工",12000),("拥有4个员工位",12000),("拥有3名好友",15000),("给员工安排工作2次",8000),
    ("拥有4个车位",12000),("订购1辆车",12000),("去好友家停车2次",8000),("赚取20万刀乐",12000),
    ("拥有10辆车",15000),("资产达到100万",15000),("给好友贴条1次",8000)],
 3:[("每分钟收入达到3200",20000),("成功邀请1个好友",20000),("拥有4名员工",20000),("拥有12辆车",25000),
    ("拥有5个员工位",25000),("给员工安排工作4次",25000),("拥有6个车位",25000),("资产到达700万",25000),
    ("给好友贴条3次",25000),("挖角员工3次",25000),("拥有2辆C级车",25000)],
 4:[("每分钟收入达到5000",30000),("成功邀请1个好友",30000),("拥有5名员工",30000),("拥有20辆车",35000),
    ("拥有6个员工位",35000),("给员工安排工作5次",35000),("拥有4个好友车位",35000),("资产到达2000万",35000),
    ("给好友贴条5次",35000),("挖角员工5次",35000),("拥有2辆B级车",35000)],
 5:[("每分钟收入达到5000",40000),("成功邀请2个好友",40000),("拥有6名员工",40000),("拥有30辆车",45000),
    ("拥有7个员工位",45000),("给员工安排工作10次",45000),("拥有8个车位",45000),("资产到达5000万",45000),
    ("给好友贴条10次",45000),("挖角员工10次",45000),("拥有2辆A级车",45000)],
 6:[("每分钟收入达到5000",50000),("成功邀请2个好友",50000),("拥有8名员工",50000),("拥有50辆车",60000),
    ("拥有一辆+8以上的车",60000),("给员工安排工作20次",60000),("拥有5辆A级车",60000),("资产到达2亿",60000),
    ("给好友贴条20次",60000),("挖角员工20次",60000),("拥有1辆S级车",60000)],
}
for ch in chapters:
    for i,(t,rew) in enumerate(TASKS[ch["id"]], 1):
        ch["tasks"].append({"no":i,"text":t,"reward":rew})

# ---- unlocks ----
# 车位 (dealership spots): pos->cost刀乐 ; 好友位: pos->cost ; 淘车 tiers: asset ; 订购 slots: asset
SPOT_COST = [0, 10000, 30000, 100000, 500000, 1000000, 2000000, 5000000]  # index=pos-1
FRIEND_SLOT_COST = [0, 0, 10000, 30000, 100000, 500000, 1000000, 2000000]
TAOCHE_TIERS = [
 {"name":"城乡结合部","asset":0,"ratings":["E","D"],"cost":2000},
 {"name":"二三线城市","asset":1000000,"ratings":["C"],"cost":20000},
 {"name":"一线大城市","asset":3000000,"ratings":["B"],"cost":200000},
 {"name":"国际大都市","asset":10000000,"ratings":["A"],"cost":2000000},
]
EMP_SLOT_COST = [0, 50000, 200000, 500000, 2000000, 10000000, 50000000]  # pos1..6+

# ---- 身价/效率 ----
NETWORTH = {"base":500, "rate":1.2}
EFFICIENCY = {"base":0.05, "step":0.01}

# ---- 首充 / 夺宝 / 七日登陆 ----
FIRST_CHARGE = {
 "condition":"首充任意金额 或 累计邀请5个好友",
 "rewardCar":21,  # 宝马I8质子红
 "rewards":[
   {"type":"car","id":21},
   {"type":"beans","amount":1000,"label":"1000黄金"},
   {"type":"dollars","amount":100000,"label":"10万刀乐"},
 ],
}
SEVEN_DAY = [
 {"day":1,"type":"dollars","amount":100000,"label":"10万刀乐"},
 {"day":2,"type":"stamina","amount":10,"label":"10体力"},
 {"day":3,"type":"dollars","amount":200000,"label":"20万刀乐"},
 {"day":4,"type":"stamina","amount":20,"label":"20体力"},
 {"day":5,"type":"dollars","amount":300000,"label":"30万刀乐"},
 {"day":6,"type":"stamina","amount":30,"label":"30体力"},
 {"day":7,"type":"car","rating":"D-A","label":"随机D-A车"},
]
GACHA = {
 "staminaMax":10, "staminaRecoverMs":180000,  # 3 min per stamina (game-time)
 "weights":[
   {"reward":"刀乐2000","value":2,"weight":61,"prob":0.458},
   {"reward":"刀乐5000","value":5,"weight":24.4,"prob":0.183},
   {"reward":"刀乐2万","value":10,"weight":12.2,"prob":0.092},
   {"reward":"刀乐5万","value":20,"weight":6.1,"prob":0.046},
   {"reward":"体力2","value":10,"weight":12.2,"prob":0.092},
   {"reward":"体力3","value":15,"weight":8.13,"prob":0.061},
   {"reward":"收费","value":20,"weight":6.1,"prob":0.046},
   {"reward":"掠夺","value":40,"weight":3.05,"prob":0.023},
 ],
}

data = {
 "cars": cars,
 "galleries": galleries,
 "chapters": chapters,
 "unlocks": {
   "spotCost": SPOT_COST,
   "friendSlotCost": FRIEND_SLOT_COST,
   "taocheTiers": TAOCHE_TIERS,
   "empSlotCost": EMP_SLOT_COST,
 },
 "networth": NETWORTH,
 "efficiency": EFFICIENCY,
 "firstCharge": FIRST_CHARGE,
 "sevenDay": SEVEN_DAY,
 "gacha": GACHA,
}

with open(os.path.join(ROOT, "data_raw.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

# emit as JS
with open(os.path.join(ROOT, "game_data.js"), "w", encoding="utf-8") as f:
    f.write("// Auto-generated from 相关配置.xls + 汽车图鉴\n")
    f.write("window.GAME_DATA = ")
    f.write(json.dumps(data, ensure_ascii=False))
    f.write(";\n")

print("WROTE game_data.js")
print("car images copied:", len(img_map), "logo images copied:", len([v for v in logo_map.values() if v]))
wb.release_resources()
