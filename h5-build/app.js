/* ============================================================
   车行 — 主程序（匹配 UI 交互说明 A01-A19）
   ============================================================ */
(function(){
'use strict';

const D = window.GAME_DATA;
// CAR: 按 id 建立字典，避免数组下标错位
const CAR = D.cars;                 // 车辆数组（用于 .filter / 遍历）
const CAR_BY_ID = {};               // id -> 车辆（用于按 id 查询）
(D.cars || []).forEach(c => { CAR_BY_ID[c.id] = c; });
// logos: 品牌 -> logo 文件名
D.logos = {};
(D.cars || []).forEach(c => { if (c.brand && c.logo) D.logos[c.brand] = c.logo; });
const SAVE_KEY = 'chexing_save_v3';
const SHIELD_MAX = 3;
const MIN_TICKET_MINUTES = 30; // 好友车位开罚单最少停车时长（分钟）
const GACHA_STAMINA_MAX = 12;
const GACHA_RECOVER_MS = 60 * 60 * 1000; // 60分钟恢复1点
const FRIEND_PARK_MAX = 4; // 每个好友家最多停4辆
const FRIEND_MAX = 100; // 好友数量上限（玩家与对方共用同一上限值）

// 礼包码配置：code → { label, rewards: [{type:'dollars'|'beans', val}] }
const GIFT_CODES = {
  'VIP666':   { label:'VIP666',   rewards:[{type:'dollars', val:66666}] },
  'VIP888':   { label:'VIP888',   rewards:[{type:'dollars', val:88888}] },
  'VIP999':   { label:'VIP999',   rewards:[{type:'dollars', val:99999}] },
  'leroynb':  { label:'leroynb',  rewards:[{type:'beans', val:66666}, {type:'dollars', val:666666}] },
};
let _parkingTargetFspotIdx = 0; // 停车弹窗目标车位索引（renderParkAtFriendModal→doParkAtFriend传递）
const TICK_MS = 1000;


// ===== 改名系统 =====
const RENAME_COST_BEANS = 60000; // 首次免费，之后每次消耗黄金

// 屏蔽字库（游戏常用敏感词/脏话/政治敏感）
const BANNED_WORDS = [
  '操','艹','妈比','爹','娘','逼','屌','傻逼','日','干','死','杀','砍','炸','毒','赌','嫖','娼',
  '枪','刀','血','尸','奸','淫','骚','婊','妓','鸡','鸭','畜生','废物','垃圾',
  '滚','草','靠','fuck','shit','damn','bitch','whore','slut','asshole','bastard','dick',
  '法轮功','藏独','台独','疆独','港独','反党','反共','推翻','颠覆','暴动',
];

// 随机名字数据：省份/直辖市 + 百家姓 + 常用名
const RENAME_PROVINCES = ['北京','上海','天津','重庆','广东','江苏','浙江','山东','河南','四川','湖北','湖南','福建','安徽','河北','陕西','辽宁','江西','吉林','黑龙江','山西','云南','广西','贵州','甘肃','内蒙古','新疆','海南','宁夏','西藏','香港','澳门','台湾'];
const RENAME_SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公仉督晋楚汝法涂钦归海岳帅缑亢况后有琴商牟佘佴伯赏墨哈谌竺年爱阳佟言福';
const RENAME_GIVEN_NAMES = ['伟','芳','娜','秀英','敏','静','丽','强','磊','军','洋','勇','艳','杰','娟','涛','明','超','秀兰','霞','平','刚','桂英','华','鑫','玲','飞','玉兰','萍','红','建华','倩','淑珍','丹','建国','建军','文','英','慧','建','玲丽','莉','健','萍','浩','俊','婷','雪','亮','宁','琳','峰','辉','欣','宇','佳','薇','晨','旭','璐','欢','嘉怡','子轩','子涵','紫萱','梓涵','一诺','浩然','欣怡','子墨','思源','诗涵','启俊','宇航','皓轩','梦洁','雨泽','雅琪','佳怡','子瑞','明辉','欣妍','天翔','文博','子豪','语嫣','俊杰','思远','雨桐','雅静','晓彤','子珊','博文','嘉懿','雨欣','梓萱','雅楠','浩宇','欣然','子默','思琪','语彤','皓月','雅琳','子晴','明哲','欣悦','雨萱','梓豪','雅婷','浩然','子睿','思颖','语桐','皓然','雅欣','子墨','明轩','欣瑶','雨萌','梓睿','雅慧','浩轩','子瑜','思彤','语诺','皓宇','雅雯','子昂','明达','欣蕾','雨菲','梓妍','雅茹','浩然'];

// 随机生成名字：地名+姓+名
function generateRandomName(){
  return pick(RENAME_PROVINCES) + pick(RENAME_SURNAMES) + pick(RENAME_GIVEN_NAMES) + pick(RENAME_GIVEN_NAMES);
}

// 检查名字是否合法（非空、无屏蔽字、不重名）
function isNameValid(name){
  if(!name || !name.trim()) return false;
  const trimmed = name.trim();
  if(trimmed.length < 2 || trimmed.length > 12) return false;
  for(let w of BANNED_WORDS){ if(trimmed.includes(w)) return false; }
  return true;
}

// 检查名字是否已被占用（好友列表 + 机器人池 + 真实玩家池）
function isNameTaken(name){
  if(!name) return false;
  const t = name.trim().toLowerCase();
  if(S.friends.some(f => f.name && f.name.trim().toLowerCase() === t)) return true;
  if(BOT_POOL.some(b => b.name && b.name.trim().toLowerCase() === t)) return true;
  if(REAL_PLAYER_POOL.some(p => p.name && p.name.trim().toLowerCase() === t)) return true;
  return false;
}

/* ---------- 工具函数 ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const f = n => { if(n>=1e8) return (n/1e8).toFixed(2)+'亿'; if(n>=1e4) return (n/1e4).toFixed(2)+'万'; return Math.floor(n).toLocaleString(); };
const fbean = n => { if(n>=1e8) return (n/1e8).toFixed(2)+'亿'; if(n>=1e4) return (n/1e4).toFixed(2)+'万'; return Math.floor(n).toLocaleString(); };
// 市场订购黄金价格：显示具体数值（不缩写万/亿）
const fbeanFull = n => Math.floor(n).toLocaleString();
// 黄金货币统一图标（金元宝素材）
const BEAN_IC_SRC = 'assets/gold-bar.png';
const BEAN_IC = `<img class="bean-ic" src="${BEAN_IC_SRC}" alt="金">`;
// 刀乐货币统一图标（美元素材）
const DOLLAR_IC_SRC = 'assets/green-bills.png';
const DOLLAR_IC = `<img class="dollar-ic" src="${DOLLAR_IC_SRC}" alt="$">`;
const ASSET_IC = '📂';  // 资产图标（区别于刀乐$，避免混淆）
const DEF_AVA = '👤'; // 统一默认头像
const now = () => Date.now();
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const rnd = (lo,hi) => Math.random()*(hi-lo)+lo;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const uid = () => 'id_'+now()+'_'+Math.random().toString(36).slice(2,7);

function ratingBadge(r){ const valid=['S','A','B','C','D','E']; r=(valid.indexOf(r)>=0)?r:'E'; return `<span class="pc-rating r-${r}">${r}</span>`; }
// 车图路径：优先尝试 _cut 裁剪版（透明底），失败则回退原图
function _carImgSrc(c){
  if(!c || !c.image) return { orig:'', cut:null };
  const base = 'assets/cars/';
  const orig = base + c.image;
  // AI生成的长文件名图片有 _cut 透明底版本
  if(c.image.length > 20){
    const cut = c.image.replace(/\.png$/,'_cut.png');
    return { orig, cut: base + cut };
  }
  return { orig, cut: null };
}
function thumb(id){
  const c=CAR_BY_ID[id]; if(!c) return '';
  const s=_carImgSrc(c); if(!s.orig) return '';
  if(s.cut) return `<img class="gal-car-thumb" src="${s.cut}" onerror="this.onerror=null;this.src='${s.orig}'" alt="${c.name}">`;
  return `<img class="gal-car-thumb" src="${s.orig}" alt="${c.name}" onerror="this.style.display='none'">`;
}
function carImg(id,w,h){
  const c=CAR_BY_ID[id]; if(!c) return '';
  const s=_carImgSrc(c); if(!s.orig) return '';
  const style=`width:${w}px;height:${h}px;object-fit:contain`;
  if(s.cut) return `<img class="pc-car-img" src="${s.cut}" onerror="this.onerror=null;this.src='${s.orig}'" style="${style}" alt="${c.name}">`;
  return `<img class="pc-car-img" src="${s.orig}" style="${style}" alt="${c.name}" onerror="this.style.display='none'">`;
}
function logoImg(brand){ const l=D.logos[brand]; if(!l) return `<span class="text-mut" style="font-size:9px">${brand}</span>`; return `<img src="assets/logos/${l}" style="width:24px;height:18px;object-fit:contain" onerror="this.style.display='none'">`; }

/* ---------- 车名变色（按名称中的颜色词自动着色） ---------- */
// 颜色词 → CSS色值（长词优先匹配，避免短词截断长词）
const COLOR_PHRASES = [
  // 多字颜色词（优先）
  ['火焰红','#E53935'],['层云白','#CFD8DC'],['苹果绿','#8BC34A'],['动感橙','#FF9800'],
  ['荧光粉','#E91E63'],['哑光白','#BDBDBD'],['薄荷绿','#4DB6AC'],['神秘灰','#607D8B'],
  ['离子银','#B0BEC5'],['质子蓝','#1976D2'],['质子红','#E53935'],['水晶白','#E3F2FD'],
  ['滨海湾蓝','#0288D1'],['宝石青','#00ACC1'],['雪山白','#ECEFF1'],
  ['阿布扎比蓝','#0277BD'],['奥斯汀黄','#FFF176'],['荒野迷彩','#558B2F'],
  ['迷彩绿','#558B2F'],['花剑银','#90A4AE'],['金刚鹦鹉蓝','#1565C0'],
  ['探戈红','#D32F2F'],['维加斯黄','#FFF59D'],['米萨诺红','#C62828'],
  ['花键银','#546E7A'],['美洲豹黑','#1A237E'],['朱鹭白','#FAFAFA'],
  ['传奇黑','#263238'],['粉红烈焰','#FF5252'],['钻石蓝','#64B5F6'],
  ['铱银','#78909C'],['北极白','#F5F5F5'],['钙石蓝','#80CBC4'],
  ['锆英红','#AD1457'],['熔岩橙','#BF360C'],['蓝宝石','#2979FF'],
  ['宝石红','#C62828'],['富士白','#EFEBE9'],['安特里绿','#33691E'],
  ['中国红','#D32F2F'],['星辰蓝','#1A237E'],['森林绿','#2E7D32'],
  ['流光白','#E3F2FD'],['卫红','#C62828'],['竞速黄','#FFEE58'],
  ['慕尚黑','#212121'],['慕尚蓝','#1565C0'],['慕尚红','#C62828'],
  ['慕尚紫','#7B1FA2'],['猛禽宝石红','#D32F2F'],['猛禽星辰蓝','#1A237E'],
  ['猛禽森林绿','#2E7D32'],['猛禽流光白','#E3F2FD'],
  ['路虎揽胜富士白','#EFEBE9'],['路虎揽胜安特里绿','#33691E'],['路虎揽胜中国红','#D32F2F'],
  ['银色闪电','#B0BEC5'],['恩佐红','#D32F2F'],
  // 单字颜色词
  ['红','#E53935'],['蓝','#1976D2'],['绿','#388E3C'],['黄','#FBC02D'],
  ['白','#EEEEEE'],['黑','#212121'],['银','#9E9E9C'],['金','#FFD700'],
  ['橙','#F57C00'],['紫','#7B1FA2'],['粉','#EC407A'],['灰','#757575'],
  ['青','#00897B'],['棕','#795548'],['冰','#4FC3F7'],['暗','#37474F'],
  ['亮','#FFF9C4']
];
// 按词长降序排列，确保长词优先匹配
COLOR_PHRASES.sort((a,b) => b[0].length - a[0].length);

// 预编译正则：按长词优先的顺序做一次整词匹配，避免子词（如"粉""红"）在已插入的
// <span> 内部被二次着色导致嵌套与颜色错乱；同一颜色词整体统一为同一颜色。
const COLOR_PHRASE_MAP = {};
COLOR_PHRASES.forEach(([phrase,color])=>{ COLOR_PHRASE_MAP[phrase]=color; });
const COLOR_RE = new RegExp('(' + COLOR_PHRASES
  .map(([p])=> p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
  .join('|') + ')', 'g');

/**
 * 将车名中的颜色词替换为带颜色的 <span>
 * 长词优先整词匹配：一旦某子串属于更长的颜色词（如"荧光粉"），就不会再被"粉"单独着色，
 * 且整词统一使用同一颜色。
 * 例: "火神-火焰红" → "火神-<span style="color:#E53935">火焰红</span>"
 *     "I8质子蓝"   → "I8<span style="color:#1976D2">质子蓝</span>"
 */
function colorName(name){
  // 车名统一使用默认文字颜色，不按颜色词变色
  return name || '';
}
// 纯文本版本（用于 toast/alert 等不支持 HTML 的场景）
function colorNameText(name){ return name; }

/* ---------- 经济公式 ---------- */
function capOf(inst){ const c=CAR_BY_ID[inst.carId]; return inst.capacity || (c ? c.capacity : 6300); }
function incomeOf(inst){ const c=CAR_BY_ID[inst.carId]; if(!c) return 0; let base = inst.income || c.income; let bonus = inst.bonus || 0; /* 员工加成等 */ return base * (1 + bonus); }
function totalIncomePerMin(){ return S.inst.reduce((s,i)=>{ if(i.loc!=='spot' && i.loc!=='atFriend') return s; return s + incomeOf(i); },0); }

/** 根据员工身价计算加成比例 p = 0.05 + (lg(x/500)/lg(1.2)) * 0.01，向下取整到小数点后4位 */
function empBonusFromNetworth(networth){
  const x = Math.max(500, networth);
  const p = 0.05 + (Math.log10(x / 500) / Math.log10(1.2)) * 0.01;
  // 向下取整到4位小数
  return Math.floor(p * 10000) / 10000;
}
function assets(){ return S.inst.reduce((s,i)=>{ const v = i.value || (CAR_BY_ID[i.carId] ? CAR_BY_ID[i.carId].value : 0); return s+v; }, 0); }
/* 身价（雇佣价格）= 500 * 1.2^n，其中 n = lg(资产/500) / lg(1.2)，初始500，最低500 */
function calcNetworth(assetVal){
  if(!assetVal || assetVal <= 0) return 500;
  const n = Math.log(assetVal / 500) / Math.log(1.2);
  return Math.max(500, Math.floor(500 * Math.pow(1.2, Math.max(0, n))));
}
function networth(){ return S.networth || 500; }
function empEfficiency(netWorthVal){ /* p = 0.05 + n*0.01, 向下取整到小数点后3位 */ const nw = netWorthVal || networth(); const n = Math.log(Math.max(nw/500, 1)) / Math.log(1.2); return Math.floor((0.05 + Math.max(0,n)*0.01) * 10000) / 10000; }

/* ---------- 任务条件评估（名车之旅） ---------- */
function totalCarCount(){ return S.inst.reduce((s,i)=> s + (i.count||1), 0); }
function ratingCount(rating){ return S.inst.reduce((s,i)=>{ const c=CAR_BY_ID[i.carId]; return s + (c && c.rating===rating ? (i.count||1) : 0); },0); }
function ownedSpotsCount(){ return S.spots.filter(s=>s.unlocked).length; }
function friendCount(){ return S.friends.filter(f=>f.isFriend).length; }
function hasCap8Car(){ return S.inst.some(i=>{ const c=CAR_BY_ID[i.carId]; return c && c.capacity>=8; }); }
// 中文数字 → 阿拉伯数字（支持 一二三...十/两）
function cnNum(s){
  if(s == null) return null;
  if(/^\d+$/.test(s)) return parseInt(s, 10);
  const map = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  const v = map[s];
  return v === undefined ? null : v;
}
// 解析任务文本，返回 {done, cur, target}
function taskEval(task){
  const t = task.text || '';
  let cur = 0, target = 1, done = false;
  const num = re => { const m = t.match(re); return m ? cnNum(m[1]) : null; };
  let n;
  if((n = num(/招募(\d+)名?员工/)) !== null){ cur = S.stats.hired; target = n; }
  else if((n = num(/挖角员工?(\d+)次/)) !== null || (n = num(/挖角(\d+)名?员工/)) !== null){ cur = S.stats.poached; target = n; }
  else if((n = num(/给员工安排(\d+)次工作/)) !== null || (n = num(/给员工安排工作(\d+)次/)) !== null){ cur = S.stats.workCount; target = n; }
  else if((n = num(/分享((?:\d+|[一二三四五六七八九十两]))次?游戏/)) !== null){ cur = S.stats.shareCount; target = n; }
  else if((n = num(/拥有(\d+)辆([EDCBAS])级车/)) !== null){ const r = t.match(/([EDCBAS])级车/)[1]; cur = ratingCount(r); target = n; }
  else if((n = num(/拥有(\d+)个车位/)) !== null){ cur = ownedSpotsCount(); target = n; }
  else if((n = num(/去好友家停车(\d+)次/)) !== null){ cur = S.stats.parkFriendCount; target = n; }
  else if((n = num(/拥有(\d+)辆车/)) !== null){ cur = totalCarCount(); target = n; }
  else if((n = num(/赚取(\d+)刀乐/)) !== null){ cur = Math.floor(S.stats.earned); target = n; }
  else if((n = num(/拥有(\d+)名员工/)) !== null){ cur = S.employees.length; target = n; }
  else if((n = num(/拥有(\d+)名好友/)) !== null){ cur = friendCount(); target = n; }
  else if((n = num(/拥有(\d+)个员工位/)) !== null){ cur = S.empSlots; target = n; }
  else if((n = num(/订购(\d+)辆车/)) !== null){ cur = S.stats.orderCount; target = n; }
  else if((n = num(/给好友贴条(\d+)次/)) !== null){ cur = S.stats.ticketCount; target = n; }
  else if((n = num(/成功邀请(\d+)个好友/)) !== null){ cur = S.stats.inviteCount; target = n; }
  else if((n = num(/每分钟收入达到(\d+)/)) !== null){ cur = Math.floor(totalIncomePerMin()); target = n; }
  else if((n = num(/资产达到?(\d+)万/)) !== null){ cur = Math.floor(assets()); target = n*10000; }
  else if((n = num(/资产达到?(\d+)亿/)) !== null){ cur = Math.floor(assets()); target = n*100000000; }
  else if(/拥有一辆\+?8以上/.test(t)){ cur = hasCap8Car()?1:0; target = 1; }
  else { cur = 0; target = 0; } // 未知任务：无法评估
  done = target > 0 && cur >= target;
  return { done, cur, target };
}
// 整章是否全部任务完成
function chapterAllDone(ci){
  const ch = D.chapters[ci]; if(!ch) return false;
  return (ch.tasks||[]).every(t => taskEval(t).done);
}
function taskKey(ci, no){ return ci + '-' + no; }

/* ---------- 状态初始化 ---------- */
let _uid = 100;
function mk(carId, loc, spotIdx){
  _uid++;
  // 注意：spotIdx 可能为 0（1号车位），不能用 ||-1（会误把 0 当空 -> -1）
  return { iid:_uid, carId, loc, spotIdx:(spotIdx==null?-1:spotIdx), fspotIdx:undefined, accrued:0, bonus:0, count:1,
           empIid:null, workEnd:0, atFriend:null };
}
function makeFriends(){
  const names=['王宝强','黄渤','徐峥','沈腾','邓超','黄晓明','陈赫','郑恺','李晨','Angelababy'];
  const cars=[1,22,50,65,77];
  return names.map((n,i)=>({
    uid:''+(10000001+i), name:n, avatar:'', networth:rnd(500,3000),
    assets:rnd(100000,3000000), bestCarId:cars[i%cars.length],
    parkingSpots: rndi(4,8), parkedByMe:false, isFriend:true,
    friendsCount: rndi(20, 90), // 该好友自身的好友数（用于“对方好友上限”判断）
    employees:[], employedBy:null,
    timesHiredToday: 0, lastHiredDay: ''   // 雇佣系统：日雇次数追踪
  }));
}
function rndi(lo,hi){ return Math.floor(rnd(lo,hi+1)); }

// 机器人车友池：默认不自动加为好友，玩家需在"新的车友"页手动添加
const BOT_POOL = makeFriends();

// 真实玩家池：推荐车友中机器人不足10个时作为补充展示（不可与机器人重复 uid）
const REAL_PLAYER_POOL = [
  {uid:'20000001', name:'车神小明', bestCarId:77, assets:rnd(500000,5000000), friendsCount:rndi(20,90)},
  {uid:'20000002', name:'豪车女王', bestCarId:65, assets:rnd(300000,3000000), friendsCount:rndi(20,90)},
  {uid:'20000003', name:'速度与激情', bestCarId:50, assets:rnd(200000,2000000), friendsCount:rndi(20,90)},
  {uid:'20000004', name:'秋名山车神', bestCarId:22, assets:rnd(100000,1000000), friendsCount:rndi(20,90)},
  {uid:'20000005', name:'漂移达人', bestCarId:1, assets:rnd(50000,500000), friendsCount:rndi(20,90)},
];

let S;

function defaultState(){
  const inst = [ mk(83,'spot',0) ];
  // 车位：规范默认2个，可额外解锁6个 = 共8个
  const spots = []; for(let i=0;i<8;i++) spots.push({unlocked:i<2});
  // 员工位：默认2个（已在上轮修改）
  // 规范：玩家初始默认添加5个机器人好友（王宝强/黄渤/徐峥/沈腾/邓超）
  // 已添加的好友不会出现在"推荐车友"中；机器人不足时由真实玩家补充
  // 规范：初始好友必须带齐停车/贴罚单相关归一化字段，否则新号（无存档、走 defaultState）会缺失 ticketed/parkedAtMe 等，
  // 导致好友车位交互异常。load() 内的归一化只对“有存档的老号”生效，新号需在此补齐。
  const friends = BOT_POOL.slice(0, 5).map(b => Object.assign({}, b, {
    isFriend:true,
    ticketed:false,
    parkedAtMe:null,
    parkCarId: b.bestCarId || 1,
    parkAccrued:0
  }));
  // 好友车位：规范默认1个，可额外解锁3个 = 共4个（好友数达3/10/20解锁）
  const fspots = []; for(let i=0;i<4;i++) fspots.push({unlocked:i<1});
  return {
    v:3, uid: rndi(10000000, 99999999), name:'车友'+rndi(1000,9999),
    dollars: 5000, beans: 6000,
    networth: 500,   // 玩家自身身价（雇佣价格），独立于资产，默认500，与车友规则一致
    inst, spots, fspots,
    empSlots: 2, employees:[],          // 规范：雇佣空位初始为2个，可解锁6个
    friends,
    tasks:{}, questChapters:{}, seven:{lastDay:0, claimed:[], streak:0},
    stats:{ hired:0, poached:0, workCount:0, shareCount:0, parkFriendCount:0, orderCount:0, ticketCount:0, inviteCount:0, earned:0 },
    fc:{claimed:false, recharged:false, adsWatched:0, friendsInvited:0, claimedInvites:[]}, gacha:{stamina:GACHA_STAMINA_MAX, lastTs:now()},
    shield: SHIELD_MAX, exch:{count:0, lastDay:''},
    gallery:{}, messages:[], visitTarget:null,
    settings:{},
    lastTick: now(),
    // 好友雇佣系统：每日被雇次数 / 身价日跌
    timesHiredToday: 0, lastHireDay: '',   // 玩家自身今日被雇次数（上限4）
    // 淘车系统：按类型追踪购买次数/价格/历史（用于价格递增、前5次不重复、保护机制）
    taoche: initTaocheState(),
    // 订购系统：每日刷新 / 已购位置
    order: { lastRefreshDay: '', purchased: [] },
    // 夺宝收费/掠夺：记录被谁攻击过（用于复仇）
    gachaAttacks: [],
    // 充值（看广告）：每日每档观看进度 + 领取状态
    rchAds: { lastDay: '', watched: [0,0,0,0], claimed: [false,false,false,false] },
    // 礼包码：已兑换的码列表（每个码每个玩家只能用1次）
    redeemedCodes: [],
    // 改名系统：已改名次数（首次免费，之后每次消耗黄金）
    renameCount: 0,
    // 机器人每日在玩家好友车位停车（测试贴罚单用）：记录最近一次自动停车的自然日
    lastBotParkDay: '',
    // TapTap 登录态：{ openid, unionid, name, avatar } 或 null
    taptap: null,
    // 邀请系统：玩家专属邀请码 + 已发放奖励的邀请用户 uid（防重复发奖）
    inviteCode: null,
  };
}

/* ---------- 淘车状态初始化 ---------- */
function initTaocheState(){
  // 规范（截图+配置表）：
  // 城乡结合部: E/D级, 初始18000刀乐, 资产0解锁
  // 二三线城市: D/C级, 初始12万刀乐, 资产100万解锁
  // 一线大城市: D/B级, 初始90万刀乐, 资产300万解锁
  // 国际大都市: B/A级, 初始350万刀乐, 资产1000万解锁
  return [
    { key:'rural',    name:'城乡结合部', desc:'随机获得E、D级车辆', ratings:['E','D'], basePrice:18000,    minAsset:0,        count:0, history:[], protection:{} },
    { key:'tier2',    name:'二三线城市', desc:'随机获得D、C级车辆', ratings:['D','C'], basePrice:120000,   minAsset:1000000,   count:0, history:[], protection:{} },
    { key:'tier1',    name:'一线大城市', desc:'随机获得D、B级车辆', ratings:['D','B'], basePrice:900000,   minAsset:3000000,   count:0, history:[], protection:{} },
    { key:'international',name:'国际大都市',desc:'随机获得B、A级车辆',ratings:['B','A'],basePrice:3500000,minAsset:10000000,  count:0, history:[], protection:{} },
  ];
}

/* ---------- 存档 ---------- */
function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
  try{ trySubmitLeaderboard(); }catch(_){}
  // 云存档：TapTap 环境且已登录时异步同步（失败静默，不阻塞游戏）。节流 60s 在 SDK 内部处理。
  try{
    if(window.ChexingSDK && window.ChexingSDK.isTapMiniGame && S.taptap){
      window.ChexingSDK.saveToCloud(S);
    }
  }catch(_){}
}

/* ==================== 音效系统（Web Audio 程序化合成，无需素材文件） ==================== */
/* 说明：使用 Oscillator 实时合成音效，在 Android WebView 下零延迟、无加载/素材依赖、可离线运行。
   自动播放策略要求首次用户手势后创建/恢复 AudioContext，故在全局 click 中解锁。 */
const SFX = (() => {
  let ctx = null;
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      try { ctx = new AC(); } catch(e){ return null; }
    }
    if(ctx && ctx.state === 'suspended'){ ctx.resume().catch(()=>{}); }
    return ctx;
  }
  // 单个音符（带攻击/衰减包络）
  function tone(c, freq, start, dur, type, vol){
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(start); o.stop(start + dur + 0.03);
  }
  const presets = {
    // 通用按钮点击：轻快短促的“嗒”
    click:   c => { tone(c, 660, c.currentTime,      0.05, 'triangle', 0.16); },
    // 领取/成功：上行两音，悦耳
    success: c => { tone(c, 523, c.currentTime,      0.12, 'sine', 0.22);
                    tone(c, 784, c.currentTime + 0.10, 0.20, 'sine', 0.22); },
    // 收取刀乐：清脆双音“叮叮”
    coin:    c => { tone(c, 988, c.currentTime,      0.07, 'square', 0.14);
                    tone(c, 1319, c.currentTime + 0.06, 0.10, 'square', 0.14); },
    // 操作失败/余额不足：低沉下行“嗡”
    error:   c => { tone(c, 220, c.currentTime,      0.10, 'sawtooth', 0.16);
                    tone(c, 150, c.currentTime + 0.08, 0.18, 'sawtooth', 0.16); },
    // 轻量弹窗/小反馈
    pop:     c => { tone(c, 440, c.currentTime,      0.05, 'sine', 0.12); },
  };
  function play(name){
    if(S && S.soundOn === false) return;        // 静音
    const c = ensure(); if(!c) return;
    const p = presets[name]; if(!p) return;
    try { p(c); } catch(e){}
  }
  function unlock(){ ensure(); }
  function setMuted(m){ if(S){ S.soundOn = !m; save(); } }
  function isMuted(){ return !!(S && S.soundOn === false); }
  return { play, unlock, setMuted, isMuted };
})();
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    S = JSON.parse(raw);
    // v3 迁移
    if(!S.v || S.v < 3){
      S.v = 3;
      if(!S.fspots) S.fspots = [{unlocked:true}];
      if(S.shield===undefined) S.shield = SHIELD_MAX;
      if(!S.exch) S.exch = {count:0, lastDay:''};
      if(!S.gallery) S.gallery = {};
      // 规范：车位共8个(默认2+可解锁6)
      if(!S.spots || S.spots.length === 0){ S.spots = []; for(let i=0;i<8;i++) S.spots.push({unlocked:i<2}); }
      else if(S.spots.length > 8){ S.spots = S.spots.slice(0,8); }
      else while(S.spots.length < 8){ S.spots.push({unlocked:false}); }
      if(!S.visitTarget) S.visitTarget = null;
      if(!S.stats) S.stats = { hired:0, poached:0, workCount:0, shareCount:0, parkFriendCount:0, orderCount:0, ticketCount:0, inviteCount:0, earned:0 };
    }
    // v4 迁移：好友雇佣系统字段 + 好友车位规范修正
    if(S.v < 4){
      S.v = 4;
      if(S.empSlots === undefined || S.empSlots < 2) S.empSlots = 2;  // 规范：初始2个
      if(!Array.isArray(S.employees)) S.employees = [];  // 防御：确保员工数组存在，避免招募时 push 抛错
      if(S.timesHiredToday === undefined) S.timesHiredToday = 0;
      if(S.lastHireDay === undefined) S.lastHireDay = '';
      // 为每个好友补充 lastHiredDay 字段（用于身价日跌判断）
      if(S.friends){
        S.friends.forEach(fr => {
          if(fr.lastHiredDay === undefined) fr.lastHiredDay = '';
          if(fr.timesHiredToday === undefined) fr.timesHiredToday = 0;
        });
      }
      // 规范：好友车位共4个(默认1+可解锁3)
      if(!S.fspots || S.fspots.length === 0){ S.fspots = []; for(let i=0;i<4;i++) S.fspots.push({unlocked:i<1}); }
      else if(S.fspots.length > 4){ S.fspots = S.fspots.slice(0,4); }
      else while(S.fspots.length < 4){ S.fspots.push({unlocked:false}); }
    }
    // v5 迁移：淘车/订购系统状态
    if(S.v < 5){
      S.v = 5;
      if(!S.taoche) S.taoche = initTaocheState();
      if(!S.order) S.order = { lastRefreshDay: '', purchased: [] };
    }
    // v6 迁移：充值看广告系统
    if(S.v < 6){
      S.v = 6;
      if(!S.rchAds) S.rchAds = { lastDay: '', watched: [0,0,0,0], claimed: [false,false,false,false] };
    }
    // v7 迁移：首充进度字段
    if(S.v < 7){
      S.v = 7;
      if(S.fc){
        if(S.fc.adsWatched==null) S.fc.adsWatched = 0;
        if(S.fc.friendsInvited==null) S.fc.friendsInvited = 0;
        if(S.fc.recharged==null) S.fc.recharged = false;
      }
    }
    // v8 迁移：修正好友（含机器人车友）身价被 calcNetworth(assets) 污染成几十万的 bug。
    // 旧逻辑在渲染好友/排名页时会把好友身价覆盖成其资产值（10万~300万）并写回存档，
    // 导致雇佣成本不可承受。这里把被污染/异常的好友身价重置为基于 uid 的稳定低位值
    // （500~2999，符合"初始身价500起步、最低500保底"的设计），正常区间(500~5000)保留。
    if(S.friends){
      S.friends.forEach(fr => {
        const polluted = (typeof fr.networth !== 'number') || isNaN(fr.networth) || fr.networth < 500 || fr.networth > 5000;
        if(polluted){
          let h = 0; const key = fr.uid || fr.name || 'x';
          for(let k=0;k<key.length;k++) h = (h*31 + key.charCodeAt(k)) >>> 0;
          fr.networth = 500 + (h % 2500);  // 500~2999
        }
        if(fr.timesHiredToday === undefined) fr.timesHiredToday = 0;
        if(fr.lastHiredDay === undefined) fr.lastHiredDay = '';
      });
    }
    // v9 迁移：员工 topHirerUid 字段（最栽培Ta的老板）
    if(S.v < 9){
      S.v = 9;
      if(S.employees){
        S.employees.forEach(emp => {
          if(!emp.topHirerUid && emp.hiredFrom){
            emp.topHirerUid = emp.hiredFrom;
          }
        });
      }
    }
    // v10 迁移：玩家初始默认拥有5个机器人好友。
    // 仅对"从未添加过好友"的旧存档生效（S.friends 为空）；已拥有好友的存档保持不变。
    // 全新账号由 defaultState 直接初始化，不会进入此分支。
    if(S.v < 10){
      S.v = 10;
      if(!Array.isArray(S.friends)) S.friends = [];
      if(S.friends.length === 0){
        BOT_POOL.slice(0, 5).forEach(b => {
          if(!S.friends.some(f => f.uid === b.uid)){
            S.friends.push(Object.assign({}, b, { isFriend:true }));
          }
        });
      }
    }
    // v11 迁移：邀请奖励改为「必须由 SDK 返回真实注册用户」才发放（去伪）。
    // 旧版本曾允许点击即 +1（本地伪造计数），此处清零，强制以真实邀请数为准重新核验。
    if(S.v < 11){
      S.v = 11;
      if(S.fc){
        S.fc.friendsInvited = 0;
        S.fc.claimedInvites = [];
      }
    }
    // 修正：mk 旧逻辑 spotIdx||-1 误把 0 当空，导致默认五菱宏光S等停0号车位的车 spotIdx 变成 -1，
    // 车位面板 instAtSpot(0) 查不到而显示空，但车库按 loc==='spot' 判定为已停。这里一次性修正。
    S.inst.forEach(inst => {
      if(inst.loc==='spot' && (inst.spotIdx==null || inst.spotIdx < 0)){
        let placed = false;
        for(let i=0;i<S.spots.length;i++){
          if(S.spots[i] && S.spots[i].unlocked && !S.inst.some(o=>o!==inst && o.loc==='spot' && o.spotIdx===i)){
            inst.spotIdx = i; placed = true; break;
          }
        }
        if(!placed) inst.spotIdx = 0;
      }
    });

    // 字段归一化（每次加载都执行，独立于版本迁移）：
    // 旧存档可能缺 S.order 的 displayCars/protection 等新字段，导致 renderOrder 访问未定义字段崩溃 ——
    // 正是“订购功能又无法使用”反复出现的根因。这里统一补齐，彻底自愈。
    // 玩家自身身价：旧存档无此字段（曾用 calcNetworth(assets) 推算导致身价=资产），或残留被污染的高值，
    // 统一钳制到合理区间（500~5000，与车友经济一致，500保底），彻底修复"身价=资产"的问题。
    if(typeof S.networth !== 'number' || isNaN(S.networth) || S.networth < 500 || S.networth > 5000) S.networth = 500;
    if(S.order){
      if(!Array.isArray(S.order.purchased)) S.order.purchased = [];
      if(typeof S.order.protection !== 'object' || S.order.protection === null) S.order.protection = {};
      if(typeof S.order.displayCars !== 'object' || S.order.displayCars === null) S.order.displayCars = {};
      if(typeof S.order.lastRefreshDay !== 'string') S.order.lastRefreshDay = '';
    }
    // 兑换刀乐次数结构归一化：旧存档 S.exch 可能为原始数字/undefined/数组/缺字段，
    // 会导致 S.exch.count++ 静默失效（非严格）或抛错（严格模式），边界检查
    // `undefined >= 3` 永远为 false，表现为“观看广告不消耗次数、可无限兑换”。
    // 这里在每次加载时强制规范为 {count:Number, lastDay:String}，彻底自愈。
    if(S.exch == null || typeof S.exch !== 'object' || Array.isArray(S.exch)){
      S.exch = { count: 0, lastDay: '' };
    } else {
      if(typeof S.exch.count !== 'number' || isNaN(S.exch.count) || S.exch.count < 0) S.exch.count = 0;
      if(typeof S.exch.lastDay !== 'string') S.exch.lastDay = '';
    }

    // —— 核心易坏字段强制规范化（版本无关，每次加载都执行）——
    // 老号常因早期版本字段类型错误，导致三个问题一起出现：
    //   ① 无法招募员工   → S.employees 非数组，push/length 抛错
    //   ② 收益不重置(NaN) → S.inst[].accrued 缺失，tick 累积出 NaN 污染经济
    //   ③ 兑换不消耗次数 → 旧代码 S.exch 非对象，S.exch.count++ 抛错（当前已归一化）
    // 此处统一自愈，且必须放在 _uid 计算之前，避免 S.employees 非数组导致 load 崩溃丢档。
    if(!Array.isArray(S.employees)) S.employees = [];
    S.employees.forEach(emp => {
      if(emp == null || typeof emp !== 'object') return;
      if(typeof emp.iid !== 'number') emp.iid = uid();
      if(typeof emp.name !== 'string') emp.name = '员工';
      if(typeof emp.networth !== 'number' || isNaN(emp.networth)) emp.networth = 500;
      emp.networth = Math.max(500, Math.floor(emp.networth)); // 规范：身价最低保底500
      if(typeof emp.bonus !== 'number') emp.bonus = 0;
      // 根据身价重新计算加成（公式：p=0.05+(lg(x/500)/lg1.2)*0.01，向下取整4位）
      emp.bonus = empBonusFromNetworth(emp.networth);
      if(emp.workCarIid === undefined) emp.workCarIid = null;
      if(typeof emp.workEnd !== 'number') emp.workEnd = 0;
      if(emp.hiredFrom === undefined) emp.hiredFrom = null;
      // v11 迁移：修复 hiredFrom/topHirerUid 误设为被雇好友自身uid的问题
      // 如果 hiredFrom 等于某个好友的uid（说明是旧bug），修正为玩家uid
      if(emp.hiredFrom && S.friends.some(f => f.uid === emp.hiredFrom)){
        emp.hiredFrom = S.uid;
        if(emp.topHirerUid === emp.hiredFrom /* 旧值 */) emp.topHirerUid = S.uid;
      }
      if(!emp.topHirerUid && emp.hiredFrom) emp.topHirerUid = emp.hiredFrom;
      // v12 迁移：补齐身价贡献追踪
      if(!emp.nwContributors) emp.nwContributors = {};
      const _initUid = emp.hiredFrom || S.uid;
      if(!emp.nwContributors[_initUid]) emp.nwContributors[_initUid] = 0;
      if(!emp.topHirerUid) emp.topHirerUid = _initUid;
      if(typeof emp.lastMult !== 'number') emp.lastMult = 1;
    });
    if(!Array.isArray(S.inst)) S.inst = [];
    S.inst.forEach(inst => {
      if(inst == null || typeof inst !== 'object') return;
      // 关键：accrued 必须是有限数字，否则 tick 累积出 NaN → 收益不重置/经济污染
      if(typeof inst.accrued !== 'number' || isNaN(inst.accrued) || inst.accrued < 0) inst.accrued = 0;
      if(typeof inst.bonus !== 'number') inst.bonus = 0;
      if(typeof inst.enhanceLevel !== 'number') inst.enhanceLevel = 0;
      if(typeof inst.loc !== 'string') inst.loc = 'garage';
      if(typeof inst.spotIdx !== 'number') inst.spotIdx = -1;
      if(typeof inst.count !== 'number') inst.count = 1;
    });
    if(!Array.isArray(S.friends)) S.friends = [];
    S.friends.forEach(fr => {
      if(fr == null || typeof fr !== 'object') return;
      if(typeof fr.networth !== 'number' || isNaN(fr.networth) || fr.networth < 500 || fr.networth > 5000) fr.networth = 500;
      if(fr.timesHiredDay === undefined) fr.timesHiredDay = '';
      if(fr.timesHiredToday === undefined) fr.timesHiredToday = 0;
      if(fr.employedBy === undefined) fr.employedBy = null;
      // 机器人停在玩家车位的字段归一化
      if(fr.parkedAtMe === undefined) fr.parkedAtMe = null;
      if(fr.parkCarId === undefined) fr.parkCarId = fr.bestCarId || 1;
      if(typeof fr.parkAccrued !== 'number' || isNaN(fr.parkAccrued) || fr.parkAccrued < 0) fr.parkAccrued = 0;
      if(fr.ticketed !== true && fr.ticketed !== false) fr.ticketed = false; // 每次停车只能贴一次罚单（兼容 undefined/null/0/"false"等）
      // 停车时间戳：用于按真实停车时长累积收益（无则补一个，从加载时刻开始计时）
      if(fr.parkedAtMe != null && fr.parkedAtMe !== undefined && !fr.parkedAtTs) fr.parkedAtTs = now();
    });
    // 机器人每日自动停一辆车到玩家好友车位（仅当日尚未停过时执行）
    autoParkBotsDaily();
    if(typeof S.lastTick !== 'number' || isNaN(S.lastTick)) S.lastTick = now();
    if(!S.gacha || typeof S.gacha !== 'object') S.gacha = { stamina: GACHA_STAMINA_MAX, lastTs: now() };
    else {
      if(typeof S.gacha.stamina !== 'number' || isNaN(S.gacha.stamina)) S.gacha.stamina = GACHA_STAMINA_MAX;
      if(typeof S.gacha.lastTs !== 'number' || isNaN(S.gacha.lastTs)) S.gacha.lastTs = now();
    }
    // 注意：夺宝次数【允许】超出上限 12（签到/前日登录/欢乐夺宝获取），
    // 只有自然恢复才会封顶在 GACHA_STAMINA_MAX，所以这里【不再】把超限值收敛回上限。
    // 仅做 NaN/非法值兜底：
    if(S.gacha && (typeof S.gacha.stamina !== 'number' || isNaN(S.gacha.stamina))) S.gacha.stamina = GACHA_STAMINA_MAX;
    if(!S.fc || typeof S.fc !== 'object') S.fc = { claimed:false, recharged:false, adsWatched:0, friendsInvited:0, claimedInvites:[] };
    else {
      if(typeof S.fc.claimed !== 'boolean') S.fc.claimed = false;
      if(typeof S.fc.recharged !== 'boolean') S.fc.recharged = false;
      if(typeof S.fc.adsWatched !== 'number') S.fc.adsWatched = 0;
      if(typeof S.fc.friendsInvited !== 'number') S.fc.friendsInvited = 0;
      if(!Array.isArray(S.fc.claimedInvites)) S.fc.claimedInvites = [];
    }
    // 邀请码：缺省时基于 uid 生成稳定 6 位码
    if(!S.inviteCode){
      const u = String(S.uid || '');
      S.inviteCode = 'CX' + (u.length >= 6 ? u.slice(-6) : (u + '000000').slice(0,6));
    }
    if(!S.stats || typeof S.stats !== 'object' || S.stats === null) S.stats = { hired:0, poached:0, workCount:0, shareCount:0, parkFriendCount:0, orderCount:0, ticketCount:0, inviteCount:0, earned:0 };
    else {
      const defStats = { hired:0, poached:0, workCount:0, shareCount:0, parkFriendCount:0, orderCount:0, ticketCount:0, inviteCount:0, earned:0 };
      for(const k of Object.keys(defStats)) if(typeof S.stats[k] !== 'number') S.stats[k] = defStats[k];
    }
    // 任务系统字段归一化：老号可能缺失 tasks/questChapters → renderQuests() 崩溃导致弹窗打不开
    if(!S.tasks || typeof S.tasks !== 'object' || Array.isArray(S.tasks)) S.tasks = {};
    if(!S.questChapters || typeof S.questChapters !== 'object' || Array.isArray(S.questChapters)) S.questChapters = {};
    if(!S.seven || typeof S.seven !== 'object') S.seven = { lastDay:0, claimed:[], streak:0 };
    if(!S.taoche || !Array.isArray(S.taoche)) S.taoche = initTaocheState();
    if(!S.rchAds || typeof S.rchAds !== 'object') S.rchAds = { lastDay:'', watched:[0,0,0,0], claimed:[false,false,false,false] };

    // 玩家 UID 统一为 8 位数（新号由 defaultState 直接生成；老号在此归一化）。
    // 同时把存档中所有「指向玩家自身 uid」的引用一并更新，避免雇佣/身价贡献关系断裂。
    (function(){
      const is8 = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 10000000 && n <= 99999999; };
      if(is8(S.uid)) return; // 已合规，无需迁移
      const oldUid = S.uid;
      const newUid = rndi(10000000, 99999999); // 8 位整数，不会与 fr_*/vp_* 等字符串 uid 冲突
      S.uid = newUid;
      (S.employees||[]).forEach(emp => {
        if(emp == null || typeof emp !== 'object') return;
        if(emp.hiredFrom === oldUid) emp.hiredFrom = newUid;
        if(emp.topHirerUid === oldUid) emp.topHirerUid = newUid;
        if(emp.employedBy === oldUid) emp.employedBy = newUid;
        if(emp.nwContributors && typeof emp.nwContributors === 'object' && oldUid in emp.nwContributors){
          emp.nwContributors[newUid] = emp.nwContributors[oldUid];
          delete emp.nwContributors[oldUid];
        }
      });
      (S.friends||[]).forEach(fr => {
        if(fr && fr.employedBy === oldUid) fr.employedBy = newUid;
      });
    })();

    // 好友（机器人/真实玩家）UID 统一为 8 位数迁移
    // 老存档中好友 uid 为 'fr_0'~'fr_9' / 'vp_1'~'vp_5' 等字符串格式，
    // 需要映射为 8 位数字，并同步更新所有引用（员工 hiredFrom/topHirerUid/nwContributors、好友 employedBy 等）
    (function(){
      const is8 = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 10000000 && n <= 99999999; };
      // 收集所有需要迁移的好友旧UID
      const uidMap = {}; // oldUid -> newUid
      (S.friends||[]).forEach(fr => {
        if(!fr || is8(fr.uid)) return;
        const oldUid = fr.uid;
        let newUid;
        // 'fr_3' → 10000004, 'vp_2' → 20000002（与 makeFriends/REAL_PLAYER_POOL 新生成规则一致）
        if(typeof oldUid === 'string' && /^fr_(\d+)$/.test(oldUid)){
          newUid = '' + (10000001 + parseInt(oldUid.slice(3), 10));
        } else if(typeof oldUid === 'string' && /^vp_(\d+)$/.test(oldUid)){
          newUid = '' + (20000001 + parseInt(oldUid.slice(3), 10));
        } else {
          // 其他未知格式：基于原值做稳定哈希，确保同一旧uid始终映射到同一新uid
          let h = 0;
          for(let k=0;k<oldUid.length;k++) h = (h*31 + oldUid.charCodeAt(k)) >>> 0;
          newUid = '' + (30000001 + (h % 9000000)); // 30000001~39999999 区间
        }
        uidMap[oldUid] = newUid;
        fr.uid = newUid;
      });
      // 如果没有需要迁移的，直接返回
      if(Object.keys(uidMap).length === 0) return;
      // 同步更新所有引用
      const repl = (oldVal) => { return (oldVal in uidMap) ? uidMap[oldVal] : oldVal; };
      (S.employees||[]).forEach(emp => {
        if(emp == null || typeof emp !== 'object') return;
        if(emp.hiredFrom != null && emp.hiredFrom in uidMap) emp.hiredFrom = uidMap[emp.hiredFrom];
        if(emp.topHirerUid != null && emp.topHirerUid in uidMap) emp.topHirerUid = uidMap[emp.topHirerUid];
        if(emp.nwContributors && typeof emp.nwContributors === 'object'){
          const nc = {};
          for(const k of Object.keys(emp.nwContributors)) nc[repl(k)] = emp.nwContributors[k];
          emp.nwContributors = nc;
        }
      });
      (S.friends||[]).forEach(fr => {
        if(fr && fr.employedBy != null && fr.employedBy in uidMap) fr.employedBy = uidMap[fr.employedBy];
      });
      // 车位上停的来自好友的车：parkedAtMe 字段记录的是好友uid
      S.inst.forEach(inst => {
        if(inst && inst.loc === 'atFriend' && inst.atFriendUid && inst.atFriendUid in uidMap){
          inst.atFriendUid = uidMap[inst.atFriendUid];
        }
      });
      // 存档持久化一次（一次性迁移，下次加载不再触发）
      try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
    })();

    _uid = (Array.isArray(S.inst)?S.inst.length:0) + (Array.isArray(S.employees)?S.employees.length:0) + 200;
    return true;
  }catch(e){ return false; }
}

if(!load()) S = defaultState();

/* ---------- 好友雇佣：身价日跌 / 日雇次数重置 ---------- */
function todayStr(){ return new Date().toISOString().slice(0,10); }
// 本地自然日（按玩家所在时区），用于兑换/充值等"次日恢复"逻辑，避免 UTC 跨日导致计数在错误时间重置
function localToday(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
/**
 * 规范：一天内不被雇佣时身价下跌10%（最低保底500）。
 * 每日首次加载时检查，对昨日及之前未被雇佣的好友执行下跌。
 * 同时重置玩家自身的"今日被雇次数"计数器。
 */
function checkDailyHireSystem(){
  const tod = todayStr();
  // 重置玩家自身被雇次数（跨日清零）
  if(S.lastHireDay !== tod){
    S.timesHiredToday = 0;
    S.lastHireDay = tod;
  }
  // 好友身价日跌检查
  S.friends.forEach(fr => {
    if(fr.lastHiredDay && fr.lastHiredDay >= tod) return;  // 今天已被雇，不跌
    if(!fr.lastHiredDay && fr.networth <= 500) return;    // 从未被动过且已是保底值
    // 跌10%，保底500
    const nw = Math.max(500, Math.floor(fr.networth * 0.9));
    if(nw < fr.networth){ fr.networth = nw; }
  });
  // 玩家自身身价日跌（与车友一致：未受雇且已是保底则不动；否则跌10%保底500）
  if(S.lastHireDay !== tod && S.networth > 500){
    S.networth = Math.max(500, Math.floor(S.networth * 0.9));
  }
  save();
}
// 启动时立即执行一次
checkDailyHireSystem();

/* ---------- 七日登陆：每日连续性检测 ---------- */
// 规则：
//   1. 登陆第一天可以领取第一天奖励
//   2. 每连续登陆一天可领下一天奖励，前一天未领则次日还是这一天
//   3. 登陆一旦中断从第一天开始（重置streak和claimed）
//   4. 连续登陆7天后重新回到第一天
function checkSevenDayStreak(){
  const today = todayStr(); // yyyy-mm-dd
  const last = S.seven.lastDay; // 上次登录日期，0表示从未

  if(!last){
    // 首次登录，初始化
    S.seven.lastDay = today;
    save();
    return;
  }

  if(last === today) return; // 今天已检测过，跳过

  // 计算间隔天数
  const lastDate = new Date(last + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffMs = todayDate - lastDate;
  const diffDays = Math.round(diffMs / 86400000);

  if(diffDays === 1){
    // 连续登录，streak不变（用户今天可领 streak+1 天的奖励）
    S.seven.lastDay = today;
  } else if(diffDays > 1){
    // 中断！重置到第一天
    S.seven.streak = 0;
    S.seven.claimed = [];
    S.seven.lastDay = today;
  } else {
    // diffDays <= 0（时钟回拨等），忽略
    S.seven.lastDay = today;
  }
  save();
}
// 启动时立即执行
checkSevenDayStreak();

/* ---------- 好友车位：按好友数自动解锁 ---------- */
// 规范：好友数达3/10/20时依次解锁第2/3/4个好友车位
const FSPOT_FRIEND_THRESHOLDS = [0, 3, 10, 20]; // 索引0=默认已解锁
function checkFspotUnlock(){
  const fc = friendCount(); // isFriend 的好友数
  let changed = false;
  S.fspots.forEach((fs, i) => {
    if(fs.unlocked) return;
    if(fc >= FSPOT_FRIEND_THRESHOLDS[i]){
      fs.unlocked = true;
      changed = true;
    }
  });
  if(changed) save();
}
// 启动时检查
checkFspotUnlock();

/* ---------- DOM 快捷 ---------- */
function toast(msg){ const t=$('#toast'); t.innerHTML=msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2200); }
// 通用飘字：在指定锚点上方显示「刀乐+{num}」类提示并向上飘出淡出
// anchor：元素 / 选择器 / 缺省则屏幕中心
function showFloatGain(html, anchor){
  let rect;
  if(!anchor) rect = { left: innerWidth/2, top: innerHeight*0.4, width: 0, height: 0 };
  else {
    const el = (typeof anchor === 'string') ? $(anchor) : anchor;
    if(!el || !el.getBoundingClientRect) return;
    rect = el.getBoundingClientRect();
  }
  const f = document.createElement('div');
  f.className = 'float-gain';
  f.innerHTML = html;
  f.style.left = (rect.left + rect.width/2) + 'px';
  f.style.top = (rect.top + rect.height/2) + 'px';
  document.body.appendChild(f);
  setTimeout(()=>{ if(f && f.parentNode) f.parentNode.removeChild(f); }, 1300);
}
function ask(text, onOk){
  $('#confirm-text').innerHTML=text; $('#confirm').classList.remove('hidden');
  const ok=$('#confirm-ok'), cx=$('#confirm-cancel');
  const _ok=ok.onclick, _cx=cx.onclick;
  ok.onclick=()=>{ $('#confirm').classList.add('hidden'); ok.onclick=_ok;cx.onclick=_cx; onOk&&onOk(); };
  cx.onclick=()=>{ $('#confirm').classList.add('hidden'); ok.onclick=_ok;cx.onclick=_cx; };
}
/* 刀乐不足统一提示：是否前往兑换刀乐弹窗 */
function needDollars(){
  SFX.play('error');
  ask('刀乐不足，是否前往兑换？', ()=>renderExchangeModal());
}
function needBeans(){
  SFX.play('error');
  ask('黄金不足，是否前往充值？', ()=>renderRechargeModal());
}
function openModal(html){
  const m = $('#modal');
  const old = m.querySelector('.modal-auto-close');
  if(old) old.remove();
  $('#modal-body').innerHTML = html;
  m.classList.remove('hidden');
  $('#modal-overlay').classList.remove('hidden');
  // 自动补充关闭按钮：内容若无自带关闭按钮，则注入右上角关闭
  const body = $('#modal-body');
  if(body && !body.querySelector('[data-action="close-modal"]') && !body.querySelector('.gt-scene')){
    const btn = document.createElement('button');
    btn.className = 'modal-auto-close';
    btn.setAttribute('data-action','close-modal');
    btn.setAttribute('aria-label','关闭');
    btn.textContent = '×';
    m.appendChild(btn);
  }
}
function closeModal(){ if(_empInfoTimerIV){ clearInterval(_empInfoTimerIV); _empInfoTimerIV = null; } $('#modal').classList.add('hidden'); $('#modal-overlay').classList.add('hidden'); }

/**
 * 信息展示模态框（居中弹窗，用于资产说明、收入说明等）
 * 标题 + 自定义内容HTML + 底部"知道了"按钮
 */
function openInfoModal(title, bodyHtml){
  openModal(`
    <div class="info-modal">
      <div class="info-modal-title">${title}</div>
      <div class="info-modal-body">${bodyHtml}</div>
      <button class="btn-primary btn-wide info-modal-close" data-action="close-modal">知道了</button>
    </div>
  `);
}

/* 右侧滑出提示抽屉（解锁员工位等）。规范明确区别于"二次确认界面" */
function openSideConfirm(title, msg, onConfirm, confirmText, cancelText){
  confirmText = confirmText||'确认'; cancelText = cancelText||'取消';
  closeSideConfirm();
  const ov = document.createElement('div'); ov.id='side-overlay'; ov.className='side-overlay';
  const dr = document.createElement('div'); dr.id='side-drawer'; dr.className='side-drawer';
  dr.innerHTML = `<div class="side-title">${title}</div><div class="side-msg">${msg}</div>`
    + `<div class="side-actions"><button class="btn-ghost btn-wide" id="side-cancel">${cancelText}</button>`
    + `<button class="btn-primary btn-wide" id="side-ok">${confirmText}</button></div>`;
  document.body.appendChild(ov); document.body.appendChild(dr);
  ov.addEventListener('click', closeSideConfirm);
  document.getElementById('side-cancel').addEventListener('click', closeSideConfirm);
  document.getElementById('side-ok').addEventListener('click', ()=>{ closeSideConfirm(); onConfirm&&onConfirm(); });
  requestAnimationFrame(()=>{ ov.classList.add('show'); dr.classList.add('show'); });
}
function closeSideConfirm(){
  const o=document.getElementById('side-overlay'); const d=document.getElementById('side-drawer');
  if(o) o.remove(); if(d) d.remove();
}

/* ---------- 右侧说明抽屉（A02 资产 / 每分钟收入） ---------- */
function openDrawer(html){
  const b = $('#drawer-body'); if(!b) return;
  b.innerHTML = html;
  $('#drawer').classList.remove('hidden');
  $('#drawer-overlay').classList.remove('hidden');
}
function closeDrawer(){
  $('#drawer').classList.add('hidden');
  $('#drawer-overlay').classList.add('hidden');
}
function openAsset(){
  const a = assets();
  openInfoModal('资产', `
    <p class="info-modal-desc">所有车辆的价值之和，购买新车提升资产，就能订购更高级的车辆。</p>
    <div class="info-modal-kv"><span>当前资产：</span><b>${f(a)}</b></div>
  `);
}
function openIncome(){
  const pm = totalIncomePerMin();
  // 拆分基础产量和员工加成
  let baseTotal = 0, empBonusTotal = 0;
  S.inst.forEach(i => {
    if(i.loc!=='spot') return;
    const c = CAR_BY_ID[i.carId]; if(!c) return;
    const base = i.income || c.income;
    const bonus = i.bonus || 0;
    baseTotal += base;
    empBonusTotal += base * bonus;
  });

  openInfoModal('每分钟收入', `
    <div class="info-modal-hero">每分钟能为您产生刀乐收入：<b>${f(pm)}</b></div>
    <div class="info-modal-section">
      <div class="info-modal-section-title">基础产量：<span class="text-mut">车辆基本产量</span></div>
      <div class="info-modal-kv"><span>当前基础产量：</span><b>${f(baseTotal)}</b></div>
    </div>
    <div class="info-modal-section">
      <div class="info-modal-section-title">员工加成：<span class="text-mut">有员工工作时带来的产量加成</span></div>
      <div class="info-modal-kv"><span>当前员工加成：</span><b>${f(empBonusTotal)}</b></div>
    </div>
  `);
}

/* ---------- HUD 更新 ---------- */
function updateHUD(){
  $('#res-dollars').textContent = f(S.dollars);
  $('#res-beans').textContent = fbean(S.beans);
  // 头像：默认使用CSS绘制的默认头像（人形图标），有真实头像时显示图片
  const avi = $('#res-avatar-img');
  const avatarWrap = $('#res-avatar');
  if(avi && avatarWrap){
    if(S.avatar){ avi.src = S.avatar; avi.hidden = false; avatarWrap.classList.add('has-real-avatar'); }
    else { avi.removeAttribute('src'); avi.hidden = true; avatarWrap.classList.remove('has-real-avatar'); }
  }
  updateInfobar();
  updateEmpbar();
  updateNavDots();
}
let _infobarSig = null; // 缓存信息栏结构签名，仅当可见集合变化时重建
function updateInfobar(){
  const ib = $('#infobar'); if(!ib) return;
  // 规范A02：资产 / 欢乐夺宝 / 首充礼包 / 任务(=名车之旅) / 七日登陆 / 每分钟收入(最后) — 同一行
  const fcClaimed = S.fc && S.fc.claimed;
  const sevenDone = S.seven && S.seven.claimed.length >= 7;
  const gachaFull = S.gacha && S.gacha.stamina >= GACHA_STAMINA_MAX;
  const questRdot = hasClaimableQuest();
  const sevenRdot = !sevenDone && sevenTodayUnclaimed();
  // 福利（原首充）红点：未领取且已达成领取条件（充值/看满广告/邀满好友）
  const fcRdot = !fcClaimed && S.fc && (S.fc.recharged || (S.fc.adsWatched||0) >= 5 || (S.fc.friendsInvited||0) >= 5);
  // 结构签名：可见集合 + 红点状态
  const sig = `${fcClaimed?1:0}${sevenDone?1:0}${gachaFull?1:0}${questRdot?1:0}${sevenRdot?1:0}${fcRdot?1:0}`;
  if(sig !== _infobarSig){
    _infobarSig = sig;
    let h = '';
    h += `<div class="info-chip chip-asset" data-action="open-asset" title="点击查看资产说明">${ASSET_IC} <span id="ib-asset">${f(assets())}</span></div>`;
    h += `<div class="info-chip chip-gacha${gachaFull?' gacha-pulse':''}" data-action="go-gacha" title="欢乐夺宝">🎡 夺宝${gachaFull?'<span class=\"rdot\"></span>':''}</div>`;
    if(!fcClaimed){
      h += `<div class="info-chip chip-fc" data-action="open-firstcharge" title="新人福利">🎁 福利${fcRdot?'<span class=\"rdot\"></span>':''}</div>`;
    }
    h += `<div class="info-chip chip-quest" data-action="open-quests" title="名车之旅">✅ 任务${questRdot?'<span class=\"rdot\"></span>':''}</div>`;
    if(!sevenDone){
      h += `<div class="info-chip chip-sevenday" data-action="open-sevenday" title="七日登陆">📅 七日${sevenRdot?'<span class=\"rdot\"></span>':''}</div>`;
    }
    h += `<div class="info-chip chip-income" data-action="open-income" title="点击查看每分钟收入说明">⏱ <span id="ib-income">${f(totalIncomePerMin())}</span>/分</div>`;
    ib.innerHTML = h;
  } else {
    // 仅更新每秒变化的数字，不重建 DOM → 消除闪烁
    const a = $('#ib-asset'); if(a) a.textContent = f(assets());
    const inc = $('#ib-income'); if(inc) inc.textContent = f(totalIncomePerMin());
  }
}
function updateEmpbar(){
  const eb = $('#empbar'); if(!eb) return;
  const MAX_EMP = 8;
  let h = '';
  for(let i=0;i<MAX_EMP;i++){
    if(i < S.empSlots){
      const emp = S.employees[i];
      if(emp){
        const busy = emp.workEnd > now();
        h += `<div class="emp-slot-wrap" data-action="emp-info" data-eidx="${i}" title="${emp.name}${busy?' (工作中)':' (空闲)'}">
          <div class="emp-slot ${busy?'busy':'idle'}">
            <span class="emp-avatar">${DEF_AVA}</span>
            <span class="emp-status-dot ${busy?'dot-busy':'dot-idle'}">${busy?'忙':'闲'}</span>
          </div>
          <span class="emp-name">${emp.name}</span>
        </div>`;
      } else {
        h += `<div class="emp-slot-wrap">
          <button class="emp-slot empty" data-action="open-hire" title="雇佣好友"><span class="emp-hire-text">招募<br>员工</span></button>
          <span class="emp-name">空</span>
        </div>`;
      }
    } else {
      h += `<div class="emp-slot-wrap">
        <button class="emp-slot locked" data-action="unlock-empslot" data-eidx="${i}" title="解锁员工位">🔒</button>
        <span class="emp-name">点击解锁</span>
      </div>`;
    }
  }
  eb.innerHTML = h;
}
function updateNavDots(){
  const dots = { home:$('#nav-dot-home'), garage:$('#nav-dot-garage'), market:$('#nav-dot-market'), friends:$('#nav-dot-friends'), messages:$('#nav-dot-messages') };
  Object.keys(dots).forEach(k=>{ if(dots[k]) dots[k].classList.toggle('show',
    (k==='home' && hasFullCar()) ||
    (k==='messages' && S.messages && S.messages.some(m=>!m.read))
  );});
}
function hasClaimableQuest(){
  if(!D.chapters) return false;
  for(let ci=0;ci<D.chapters.length;ci++){
    const ch = D.chapters[ci];
    if(assets() < (ch.assetReq||0)) continue;
    // 章节奖励可领
    if(chapterAllDone(ci) && !S.questChapters[ci]) return true;
    // 子任务可领
    const tasks = ch.tasks||[];
    for(const t of tasks){
      const ev = taskEval(t);
      const tkey = taskKey(ci, t.no);
      if(ev.done && !S.tasks[tkey]) return true;
    }
  }
  return false;
}
/* 红点辅助：车行是否有满仓车辆 */
function hasFullCar(){ return S.inst.some(i => i.accrued >= capOf(i)); }

/* 返回包含"满仓车辆"的 swiper 面板索引集合，用于左右滑动箭头的红点提示
   面板：0=好友车位, 1=我的车位(1-4, idx0-3), 2=更多车位(5-8, idx4-7) */
function fullCarPanelSet(){
  const set = new Set();
  // 自己停在车位上的车满仓
  S.inst.forEach(i => {
    if(i.loc === 'spot' && i.accrued >= capOf(i)){
      set.add(i.spotIdx < 4 ? 1 : 2);
    }
  });
  // 好友停在玩家车位的车满仓（可被贴条收回）
  (S.friends||[]).forEach(fr => {
    if(fr.parkedAtMe === null || fr.parkedAtMe === undefined) return;
    const c = CAR_BY_ID[fr.parkCarId];
    if(!c) return;
    const cap = c.capacity || 6300;
    if((fr.parkAccrued||0) >= cap) set.add(0);
  });
  return set;
}
/* 红点辅助：七日登录今日是否未领 */
function sevenTodayUnclaimed(){
  if(!S.seven || S.seven.claimed.length >= 7) return false;
  const todayStr = localToday();
  if(S.seven.lastClaimDate === todayStr) return false;
  const streak = S.seven.claimed.length;
  const dayNum = streak + 1;
  return dayNum <= 7;
}

/* ========== 车位查询 ========== */
function unlockedSpots(){ return S.spots.filter(s=>s.unlocked).length; }
function freeSpotIdx(){
  for(let i=0;i<S.spots.length;i++){
    if(!S.spots[i].unlocked) continue;
    const occupied = S.inst.some(ii=>ii.loc==='spot'&&ii.spotIdx===i);
    if(!occupied) return i;
  }
  return -1;
}
function instAtSpot(idx){ return S.inst.find(i=>i.loc==='spot' && i.spotIdx===idx); }

/* 离线收益补偿：游戏重新打开（关掉页面 / 后台被杀 / 长时间后台）时，
   按真实离线时长补足玩家自有车（停在自家 spot / 好友家 atFriend）的收益。
   修复 bug：原 tick 的 dt 封顶 300s，关掉游戏再打开只补 5 分钟，
   离线更长则收益丢失，表现为"游戏不在线时停车进度不涨"。
   说明：每辆车按 capOf 封顶（与好友车真实时长累积逻辑一致），离线再久也只填满不溢出。 */
function applyOfflineProgress(){
  const t = now();
  const last = (typeof S.lastTick === 'number' && !isNaN(S.lastTick)) ? S.lastTick : t;
  const elapsedSec = Math.max(0, (t - last) / 1000);
  S.lastTick = t; // 立即推进，避免紧随其后的首次 live tick 用大 dt 重复累加
  if(elapsedSec < 1) return; // 几乎没离线，跳过
  let gained = 0;
  S.inst.forEach(inst=>{
    if(inst.loc !== 'spot' && inst.loc !== 'atFriend') return;
    const cap = capOf(inst);
    const before = inst.accrued || 0;
    const inc = incomeOf(inst) * elapsedSec / 60;
    const after = Math.min(before + inc, cap);
    gained += (after - before);
    inst.accrued = after;
  });
  gained = Math.floor(gained);
  if(gained > 0) toast(`离线收益 +${f(gained)} 刀乐`);
}

/* ========== Tick 核心 ========== */
function tick(){
  const t = now();
  const dt = Math.min((t - S.lastTick) / 1000, 300); // 最大5分钟防挂机溢出
  S.lastTick = t;

  // 车位收益累积（停在自己家 spot 或 停在好友家 atFriend 都正常累积刀乐收益，仅不能派遣员工）
  S.inst.forEach(inst=>{
    if(inst.loc !== 'spot' && inst.loc !== 'atFriend') return;
    const inc = incomeOf(inst) * dt / 60; // 每秒收入
    inst.accrued = Math.min(inst.accrued + inc, capOf(inst));
  });

  // 机器人/好友停在玩家车位的车：按真实停车时长累积收益（不受离线5分钟封顶限制，关掉页面也会持续累积）
  (S.friends||[]).forEach(fr => {
    if(fr.parkedAtMe === null || fr.parkedAtMe === undefined) return;
    // 兜底：parkCarId 缺失时回退到 bestCarId，避免拿不到车辆对象而直接 return，
    // 导致 parkedAtMe 有值却永远不更新 parkAccrued（停留时间冻结在 00:00）
    const fcarId = fr.parkCarId || fr.bestCarId;
    const c = CAR_BY_ID[fcarId];
    if(!c) return;
    const cap = c.capacity || 6300;
    const incPerMin = incomeOf({carId: c.id});
    let accrued;
    if(fr.parkedAtTs){
      const elapsedMin = (now() - fr.parkedAtTs) / 60000; // 真实停车分钟数（含离线时段）
      accrued = Math.min(incPerMin * elapsedMin, cap);
    } else {
      // 兼容：无停车时间戳的旧数据，按增量累积
      accrued = Math.min((fr.parkAccrued||0) + incPerMin * dt / 60, cap);
    }
    // 维持满仓（如测试直接拉满 parkAccrued）：封顶在 cap，不再继续增长
    if((fr.parkAccrued||0) >= cap) accrued = cap;
    fr.parkAccrued = accrued;
    // 注意：满仓后【不】自动收回车辆。好友车应一直停在车位上持续增长收益，
    // 直到玩家开罚单（停车 >= MIN_TICKET_MINUTES 分钟）将其遣送回家。
    // 这样可保证「停满30分钟才能开罚单」的规则对所有车（含满仓时长恰好30分钟的车，如王宝强）都成立，
    // 不会被「满仓自动收回」抢先在同一时刻把车送走而导致永远无法开罚单。
  });

  // 员工工作计时 — 到期自动完成
  S.employees.forEach(emp=>{
    if(emp.workEnd>0 && t>=emp.workEnd){
      const carIid = emp.workCarIid;
      if(carIid){
        const inst = S.inst.find(i=>i.iid===carIid);
        if(inst){ inst.empIid = null; inst.bonus = 0; }   // 工作结束：从车位移除员工
      }
      emp.workEnd = 0;
      emp.workCarIid = null;
      addMsg('system', `员工 ${emp.name} 工作完成归来！`);
    }
  });

  // 夺宝广告次数自然恢复：最多恢复到上限 GACHA_STAMINA_MAX（12），【不会】超出上限
  if(S.gacha.stamina < GACHA_STAMINA_MAX){
    const elapsed = t - S.gacha.lastTs;
    const recovers = Math.floor(elapsed / GACHA_RECOVER_MS);
    if(recovers > 0){
      S.gacha.stamina = Math.min(GACHA_STAMINA_MAX, S.gacha.stamina + recovers);
      S.gacha.lastTs += recovers * GACHA_RECOVER_MS;
    }
  } else {
    // 已超出上限（来自签到/前日登录/夺宝获取）：自然恢复不生效，但持续推进 lastTs，
    // 避免将来掉回上限以下时把离线累积的时间一次性补满。
    S.gacha.lastTs = t;
  }

  // 兑换次数每日重置（按本地自然日）
  const todayStr = localToday();
  if(S.exch.lastDay !== todayStr){ S.exch.count = 0; S.exch.lastDay = todayStr; }

  // 机器人每日再次停车（跨日时重新填充被贴条清空的车位）
  autoParkBotsDaily();

  // 好友车位贴条收益（好友车停了40-90分钟后可贴条）
  // 简化：模拟好友停车和离开

  save();
  updateHUD();
  if(current === 'home'){ updateParkGridsLite(); updateEmpbar(); updateSwipeChevrons(); }
  if(visiting && S.visitTarget){ renderVisitFspots(); }
}

/* ==================== 屏幕路由 ==================== */
let current = 'loading';
let visiting = false; // 是否在拜访模式

const SCREEN_TITLES = { home:'抢车位：华夏崛起', garage:'抢车位：华夏崛起', market:'抢车位：华夏崛起', friends:'抢车位：华夏崛起', messages:'抢车位：华夏崛起' };
function setTitle(t){ const el=$('#tb-title'); if(el) el.textContent=t; }

function go(name){
  current = name;
  visiting = false;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  const g = $('#game'); if(g) g.classList.toggle('view-home', name==='home');
  // 所有主界面页面统一隐藏返回按钮
  const backBtn = $('.tb-back');
  if(backBtn) backBtn.classList.add('tb-hidden');

  if(name === 'home') renderHome();
  else if(name === 'garage') renderGarage();
  else if(name === 'market') renderMarket();
  else if(name === 'friends') renderFriends();
  else if(name === 'messages') renderMessages();
  else if(name === 'gachaTarget'){ if(_gachaTarget) renderGachaTargetScene(_gachaMode, _gachaTarget); }
  setTitle(SCREEN_TITLES[name] || '抢车位：华夏崛起');
  closeModal();
}

/* ==================== A01 登录页 → A02 主界面 ==================== */
let gameStarted = false;

/** 从登录页进入主游戏界面 */
function enterGame(){
  if(gameStarted) return;
  gameStarted = true;

  // 隐藏登录页，显示游戏
  const ld = $('#loading');
  ld.classList.remove('active');
  setTimeout(() => { ld.style.display = 'none'; }, 400);

  $('#game').classList.remove('hidden');
  $('#game').classList.add('active');
  // 音效开关图标同步存档状态
  const sb = $('#tb-sound'); if(sb) sb.textContent = SFX.isMuted() ? '🔇' : '🔊';
  go('home');

  // 离线收益补偿：按真实离线时长补足玩家自有车收益（修复"离线不涨"bug），放在 tick 循环启动前
  applyOfflineProgress();

  // 启动 tick 循环
  setInterval(tick, TICK_MS);
  tick();

  // 清理虚假动态
  cleanupFakeMessages();

  // 进入游戏后静默同步真实邀请奖励（由 SDK 返回真实注册用户才发奖）
  syncInviteRewards();
}

/**
 * 登录成功后统一入口：先尝试从云端拉取存档（跨设备 / 防清档），
 * 写入本地后重新水合 + 版本迁移，最后进入游戏。
 * 这样即使本地存档被清，只要登录同一 TapTap 账号，云端存档即可恢复。
 */
async function proceedAfterLogin(){
  if(window.ChexingSDK && window.ChexingSDK.isTapMiniGame){
    try{
      const r = await window.ChexingSDK.loadFromCloud();
      if(r && r.success && r.data){
        try{ localStorage.setItem(SAVE_KEY, JSON.stringify(r.data)); }catch(e){}
        load();                    // 重新水合并执行版本迁移
      } else {
        load();                    // 云端无存档：确保本地存档可用（首次游玩则为默认新档）
      }
    }catch(e){ console.warn('[proceedAfterLogin] 云存档拉取失败，回退本地:', e); load(); }
  } else {
    load();                        // 浏览器调试环境：本地加载即可
  }
  // 默认使用 TapTap 账号名称作为玩家名（玩家尚未主动自定义过名字时）
  if (S.taptap && S.taptap.name && !(S.renameCount > 0)) {
    S.name = S.taptap.name;
  }
  save();                          // 本地 + 云端持久化（首次落云）
  enterGame();
  // 后台补全真实 TapTap 身份（openid/昵称/头像 + UID 绑定 + 防沉迷），不阻塞进入游戏
  resolveTapIdentity();
}

function boot(){
  // 安全获取 ChexingSDK（兼容 window / GameGlobal 等多种运行时，避免 SDK 缺失时整段崩溃）
  const CX = (typeof window !== 'undefined' && window.ChexingSDK) ? window.ChexingSDK
           : (typeof GameGlobal !== 'undefined' && GameGlobal.ChexingSDK) ? GameGlobal.ChexingSDK
           : (typeof globalThis !== 'undefined' && globalThis.ChexingSDK) ? globalThis.ChexingSDK
           : null;

  // 登录页已默认显示（#loading active），不需要隐藏

  // ⚠️ TapTap 环境检测必须是【动态】的：tap 由容器异步注入，SDK 内部已做多源探测+自愈合。
  const initTapEnv = () => {
    if (boot._tapReady) return;   // 只初始化一次
    boot._tapReady = true;
    // TapTap 环境：强制登录 —— 永久隐藏"跳过登录"，不给任何绕过入口
    const skipEl = document.querySelector('.login-skip');
    if (skipEl) skipEl.remove();

    if (!CX) return;              // 无 SDK 则跳过初始化（不影响页面展示）
    // 初始化 TapTap SDK（后台静默，不阻塞登录页）
    CX.initAd({ appId: 'taptap', adUnitId: 'reward_video' }).then(r => {
      console.log('[ChexingSDK] Ad initialized:', r);
      CX.preloadAd();
    }).catch(e => console.warn('[ChexingSDK] Ad init failed:', e));
    CX.initLogin().catch(e => console.warn('[ChexingSDK] Login init failed:', e));
    CX.checkLicense().catch(e => console.warn('[ChexingSDK] License check failed:', e));
    CX.checkUpdate().catch(e => console.warn('[ChexingSDK] Update check failed:', e));

    autoLogin();                  // ⭐ 进入登录页即自动登录（检测到账号直接进游戏）
  };

  if (CX && CX.isTapEnv) {
    initTapEnv();                                   // 同步就绪：立即初始化
  } else if (CX && CX.onTapReady) {
    CX.onTapReady(() => {                            // 异步就绪：tap 注入后回调
      if (CX && CX.isTapEnv) initTapEnv();
    });
  }
  // 确认非 TapTap 环境（探测 ~12s 超时）后才放出"跳过登录"，仅供浏览器调试
  if (CX && CX.onTapUnavailable) {
    CX.onTapUnavailable(() => {
      const skipEl = document.querySelector('.login-skip');
      if (skipEl) skipEl.style.display = '';
    });
  }

  // 调试钩子（仅供自动化测试访问内部状态/函数）
  window.__cx = {
    S: () => S,
    taskEval, chapterAllDone, claimTask, claimChapter, renderQuests,
    collectInst, settleAccrued, tick, refreshAllParkGrids, renderHome, CAR_BY_ID,
    renderExchangeModal, doExchange, claimSevenDay, renderSevenDay, totalIncomePerMin, incomeOf, capOf, collectAll,
    renderVisitFspots, renderParkAtFriendModal, doParkAtFriend, recallFromFriend, cleanupFakeMessages, renderMsgTab, renderFirstCharge,
    hasClaimableQuest, hasFullCar, sevenTodayUnclaimed, updateInfobar, updateNavDots, autoParkBotsDaily,
    refreshFspotGrid, openFspotInfoModal, ticketFriend, formatParkTime,
    load, save,
    showCarInfo, viewChapterReward, showCarGet,
    // 好友上限
    addFriend, acceptFriend, msgFriendReq, friendCount, FRIEND_MAX,
    BOT_POOL, REAL_PLAYER_POOL,
    searchUser, showUserInfoPopup,
    // 好友车位选车弹窗
    renderParkAtFriendModal,
    // 礼包码
    openGiftCodeModal, redeemGiftCode, GIFT_CODES,
    // 夺宝收费/掠夺
    pickGachaTarget, renderGachaTargetScene, executeGachaAction, renderRevengeModal, executeRevenge,
    // 夺宝次数（测试用）
    gainGachaStamina, updateGachaCenter,
    // 改名系统
    openRenameModal, confirmRename, generateRandomName, isNameValid, isNameTaken, RENAME_COST_BEANS, BANNED_WORDS,
    // 安排员工工作选车弹窗
    renderWorkArrange,
    // 分享系统
    shareGame,
    // TapTap 登录
    tapLogin, tapLogout, autoLogin, resolveTapIdentity, uidFromOpenid,
    // TapTap 真实玩家池
    fetchTapPlayers, findTapPlayer, findAnyPlayer, tapPool: () => TAP_PLAYER_POOL,
    // TapTap 七大功能模块
    ttReview, ttShareToTapTap, ttOpenLeaderboard, ttShowAchievements, ttCheckUpdate, ttCheckLicense, ttComplianceStart,
    // SDK
    ChexingSDK: () => window.ChexingSDK
  };
}

// 页面关闭/刷新前强制保存（防止安排员工等操作后因时序问题丢失 empIid 等字段）
window.addEventListener('beforeunload', () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} });
// 页面隐藏（切后台/锁屏/关闭）前尽量把最新进度同步到云端（节流 60s，失败静默）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try { if (window.ChexingSDK && window.ChexingSDK.isTapMiniGame && S.taptap) window.ChexingSDK.saveToCloud(S, true); } catch (_) {}
  }
});

// 页面加载后启动
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else setTimeout(boot, 100);

/* ---------- A02 主界面渲染 ---------- */
function renderHome(){
  renderFeatRow();
  refreshFspotGrid();      // 第0面板：好友车位
  refreshParkGrid();       // 第1面板：车位1-4
  refreshParkGrid2();      // 第2面板：车位5-8
  updateHUD();
  updateEmpbar();          // 显式刷新员工位状态栏（不依赖 updateHUD 间接调用）
  // 默认展示第1面板（车位1-4，跳过好友面板）
  const sw=$('#swiper'), p1=$('#panel1');
  if(sw&&p1) sw.scrollLeft = p1.offsetLeft;
  // 初始化触摸拖动 + 指示器
  initSwiper();
  updateSwiperDots();
  renderSwipeHints();         // 滑动导航按钮（去好友车位/我的车位）
}

/* ---------- Swiper 触摸拖动 + 页面指示器 ---------- */
let swiperInited = false;
function initSwiper(){
  if(swiperInited) return;
  const sw = $('#swiper');
  if(!sw) return;
  swiperInited = true;

  let startX = 0, startY = 0, isDragging = false, startTime = 0;

  // 触摸开始
  sw.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
    startTime = Date.now();
  }, {passive: true});

  // 触摸移动
  sw.addEventListener('touchmove', e => {
    if(!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // 如果垂直滑动幅度更大，允许页面垂直滚动
    if(Math.abs(dy) > Math.abs(dx) * 1.5) return;
    // 水平拖动时阻止默认行为，确保滑动控制权在我们手中
    e.preventDefault();
  }, {passive: false});

  // 触摸结束 — 吸附到最近页面
  sw.addEventListener('touchend', e => {
    if(!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dt = Date.now() - startTime;
    // 快速滑动(<300ms 且距离>30px)或慢速滑动距离超过面板宽度40%
    if((dt < 300 && Math.abs(dx) > 30) || Math.abs(dx) > sw.offsetWidth * 0.4){
      if(dx > 0) snapToPrevPanel(); else snapToNextPanel();
      dismissSwipeIntro();   // 用户已学会滑动，收起引导气泡
    } else {
      snapToNearestPanel();
    }
    setTimeout(updateSwiperDots, 350);
  }, {passive: true});

  // 鼠标拖动（桌面端）
  let msDown = false, msStartX = 0, msScrollStart = 0;
  sw.addEventListener('mousedown', e => {
    msDown = true; msStartX = e.clientX; msScrollStart = sw.scrollLeft; sw.style.cursor = 'grabbing'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if(!msDown) return;
    const dx = e.clientX - msStartX;
    sw.scrollLeft = msScrollStart - dx;
  });
  document.addEventListener('mouseup', e => {
    if(!msDown) return; msDown = false; sw.style.cursor = '';
    const dx = e.clientX - msStartX;
    if(Math.abs(dx) > sw.offsetWidth * 0.15){
      if(dx > 0) snapToPrevPanel(); else snapToNextPanel();
      dismissSwipeIntro();   // 用户已学会滑动，收起引导气泡
    } else { snapToNearestPanel(); }
    setTimeout(updateSwiperDots, 350);
  });

  // 滚动时更新指示器
  sw.addEventListener('scroll', () => {
    requestAnimationFrame(updateSwiperDots);
  }, {passive: true});

  // 点击指示器圆点跳转
  document.getElementById('swiperDots')?.addEventListener('click', e => {
    const dot = e.target.closest('.swiper-dot');
    if(!dot) return;
    const panelId = dot.dataset.panel;
    const panel = document.getElementById(panelId);
    if(panel){ sw.scrollTo({left: panel.offsetLeft, behavior:'smooth'}); }
  });
}
function snapToNearestPanel(){
  const sw = $('#swiper'); if(!sw) return;
  const panels = $$('.swipe-panel');
  let nearest = panels[0], minDist = Infinity;
  panels.forEach(p => { const d = Math.abs(p.offsetLeft - sw.scrollLeft); if(d < minDist){minDist=d;nearest=p;} });
  if(nearest) sw.scrollTo({left: nearest.offsetLeft, behavior:'smooth'});
}
function snapToNextPanel(){
  const sw = $('#swiper'); if(!sw) return;
  const panels = $$('.swipe-panel');
  for(let i=0;i<panels.length;i++){
    if(panels[i].offsetLeft > sw.scrollLeft + 5){
      sw.scrollTo({left: panels[i].offsetLeft, behavior:'smooth'}); return;
    }
  }
}
function snapToPrevPanel(){
  const sw = $('#swiper'); if(!sw) return;
  const panels = $$('.swipe-panel');
  for(let i=panels.length-1;i>=0;i--){
    if(panels[i].offsetLeft < sw.scrollLeft - 5){
      sw.scrollTo({left: panels[i].offsetLeft, behavior:'smooth'}); return;
    }
  }
}
function updateSwiperDots(){
  const sw = $('#swiper'); if(!sw) return;
  const dots = $$('#swiperDots .swiper-dot');
  const panels = $$('.swipe-panel');
  let closestIdx = 0, minDist = Infinity;
  panels.forEach((p,i) => {
    const d = Math.abs(p.offsetLeft - sw.scrollLeft);
    if(d < minDist){minDist=d; closestIdx=i;}
  });
  dots.forEach((d,i) => d.classList.toggle('active', i===closestIdx));
  // 同步更新左右滑动箭头
  updateSwipeChevrons();
}
function renderSwipeHints(){
  const home = $('#homeview');
  if(!home) return;
  home.style.position = 'relative';

  // 左边缘箭头：点击去上一页（好友车位）；仅在非首页面板时显示
  if(!document.getElementById('swipeHintLeft')){
    const left = document.createElement('div');
    left.id = 'swipeHintLeft';
    left.className = 'swipe-chevron left';
    left.innerHTML = '<span class="chev">‹</span>';
    left.addEventListener('click', () => snapToPrevPanel());
    home.appendChild(left);
  }
  // 右边缘箭头：点击去下一页（更多车位）；仅在非末页面板时显示
  if(!document.getElementById('swipeHintRight')){
    const right = document.createElement('div');
    right.id = 'swipeHintRight';
    right.className = 'swipe-chevron right';
    right.innerHTML = '<span class="chev">›</span>';
    right.addEventListener('click', () => snapToNextPanel());
    home.appendChild(right);
  }

  // 一次性手势引导气泡：本次会话首次进入车位页展示，用户滑动或超时后淡出
  if(!document.getElementById('swipeIntroPill') && !sessionStorage.getItem('swipeIntroDone')){
    const pill = document.createElement('div');
    pill.id = 'swipeIntroPill';
    pill.className = 'swipe-intro-pill';
    pill.innerHTML = '<span class="swipe-intro-finger">👆</span> 左右滑动切换车位';
    home.appendChild(pill);
    setTimeout(() => {
      pill.classList.add('fade-out');
      setTimeout(() => pill.remove(), 600);
    }, 3800);
    sessionStorage.setItem('swipeIntroDone', '1');
  }

  updateSwipeChevrons();
}

/* 用户发生滑动时收起一次性引导气泡 */
function dismissSwipeIntro(){
  const pill = document.getElementById('swipeIntroPill');
  if(pill && !pill.classList.contains('fade-out')){
    pill.classList.add('fade-out');
    setTimeout(() => pill.remove(), 600);
  }
}

/* 根据当前活跃面板，控制左右边缘箭头是否显示（仅在该方向有相邻页面时显示） */
/* 面板结构：panel0=好友车位, panel1=我的车位(1-4), panel2=更多车位(5-8) */
function updateSwipeChevrons(){
  const left = document.getElementById('swipeHintLeft');
  const right = document.getElementById('swipeHintRight');
  if(!left || !right) return;
  const panels = $$('.swipe-panel');
  const idx = getActivePanelIdx();
  // 首页面板不显示左箭头；末页面板不显示右箭头
  left.classList.toggle('hidden', idx <= 0);
  right.classList.toggle('hidden', idx >= panels.length - 1);
  // 满仓红点：在哪个方向有满仓车辆（可收取/贴条），就在对应箭头上显示红点
  const full = [...fullCarPanelSet()];
  left.classList.toggle('has-full', full.some(p => p < idx));
  right.classList.toggle('has-full', full.some(p => p > idx));
}

/* 获取当前最接近的panel索引 */
function getActivePanelIdx(){
  const sw = $('#swiper'); if(!sw) return 1;
  const panels = $$('.swipe-panel');
  let closestIdx = 0, minDist = Infinity;
  panels.forEach((p,i) => {
    const d = Math.abs(p.offsetLeft - sw.scrollLeft);
    if(d < minDist){ minDist=d; closestIdx=i; }
  });
  return closestIdx;
}

/* 跳转到好友车位面板 */
function goToFriendSpots(){
  const sw=$('#swiper'), fp=$('#friendPanel');
  if(sw&&fp&&sw.scrollTo){ try{ sw.scrollTo({left:fp.offsetLeft, behavior:'smooth'}); }catch(_){} }
  setTimeout(updateSwiperDots, 350);
}
/* 跳回到我的车位面板 */
function goToMySpots(){
  const sw=$('#swiper'), p1=$('#panel1');
  if(sw&&p1&&sw.scrollTo){ try{ sw.scrollTo({left:p1.offsetLeft, behavior:'smooth'}); }catch(_){} }
  setTimeout(updateSwiperDots, 350);
}

function renderFeatRow(){
  const r = $('#featRow'); if(!r) return;
  r.innerHTML = '';
}

/* ---------- 员工头像渲染（复用：车位卡片/员工面板/弹窗等） ---------- */
function renderEmpAvatar(emp, size){
  // 统一使用默认头像 👤（同主界面），带圆角头像框
  const s = Math.round(size || 32);
  const fs = Math.round(s * .5);
  return `<span class="emp-avatar-ph" style="width:${s}px;height:${s}px;font-size:${fs}px;border-radius:8px;background:var(--bg);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.1)">${DEF_AVA}</span>`;
}

/* ---------- 车位网格渲染辅助函数（生成单个park-card HTML） ---------- */
function renderParkCard(inst, idx){
  // 空车位 — 显示大P停车标志
  if(!inst){
    return `<div class="park-card" data-spot="${idx}">
      <div class="pc-empty-park">
        <div class="pc-p-icon">P</div>
        <div class="pc-p-label">空车位</div>
      </div>
      <button class="btn-primary btn-sm park-collect" style="margin-top:auto" data-action="open-market">获取车辆</button>
    </div>`;
  }
  const c = CAR_BY_ID[inst.carId];
  if(!c) return '';
  const cap = capOf(inst);
  const inc = incomeOf(inst);
  const pct = clamp(inst.accrued / cap * 100, 0, 100);
  const remainSec = inc > 0 ? Math.floor((cap - inst.accrued) / inc * 60) : 0;
  const rmH = String(Math.floor(remainSec / 3600)).padStart(2, '0');
  const rmM = String(Math.floor((remainSec % 3600) / 60)).padStart(2, '0');
  const rmS = String(remainSec % 60).padStart(2, '0');
  const rm = remainSec > 0 ? `${rmH}:${rmM}:${rmS}` : '已满仓';

  // 员工信息仅在收入进度区显示（pc-income-emp-wrap），不在车图上叠加头像
  let workEmpHtml = '';

  // 布局：员工头像+收入进度(含内联收取按钮) → 车图(含评级/品牌叠加/工作员工) → 倒计时
  // 收入进度区员工头像（圆形，显示当前安排在此车工作的员工）
  let incomeEmpHtml = '';
  // 主路径：通过 inst.empIid 查找
  let iemp = inst.empIid ? S.employees.find(e => e.iid === inst.empIid) : null;
  // 兜底路径：empIid 丢失时，通过员工的 workCarIid 反向查找（防止刷新后字段不一致）
  if(!iemp && inst.iid){
    iemp = S.employees.find(e => e.workCarIid === inst.iid && e.workEnd > 0);
    if(iemp) inst.empIid = iemp.iid; // 自动修复 empIid
  }
  if(iemp){
      const busy = iemp.workEnd > now();
      incomeEmpHtml = `<div class="pc-income-emp-wrap ${busy?'busy':'idle'}" data-action="emp-info" data-eidx="${S.employees.indexOf(iemp)}" title="${iemp.name}${busy?' 工作中':' 空闲'}">${renderEmpAvatar(iemp, 26)}<span class="pc-income-emp-name">${iemp.name}</span></div>`;
  }
  return `<div class="park-card" data-spot="${idx}">
    <!-- 收入进度（含员工头像 + 内联收取按钮） -->
    <div class="pc-income-area">
      <div class="pc-income-val">${DOLLAR_IC} <span class="pc-curr">${f(Math.floor(inst.accrued))}</span>/<span class="pc-cap">${f(cap)}</span></div>
      <div class="pc-prog-row">${incomeEmpHtml}<div class="pc-prog-bar"><div class="pc-prog-fill" style="width:${pct}%"></div></div><button class="pc-collect-inline${pct>=100?' full':''}" data-action="collect" data-iid="${inst.iid}" title="收取"><img class="pc-collect-bg" src="assets/collect-btn-bg.png" alt=""><img class="pc-collect-icon" src="assets/collect-btn-icon.png" alt=""></button></div>
    </div>
    <!-- 中央：车图（右上评级徽章 + 车图右下角品牌图标 + 左下角工作员工） + 车名（含强化等级内联） -->
    <div class="pc-body">
      <div class="pc-img-wrap clickable" data-action="view-parked-car-info" data-car-id="${c.id}" data-iid="${inst.iid}">
        ${ratingBadge(c.rating)}
        ${carImg(c.id, 140, 90)}
        ${logoImg(c.brand)}
        ${workEmpHtml}
      </div>
      <div class="pc-car-name">${c.name}${inst.enhanceLevel?`<span class="pc-enhance">+${inst.enhanceLevel}</span>`:''}</div>
    </div>
    <!-- e. 剩余时间 -->
    <div class="pc-timer-bar">
      <span>剩余时间</span><span class="pc-timer-val">${rm}</span>
    </div>
  </div>`;
}

/* ========== 车位网格轻量级更新（避免每秒重建DOM导致抖动） ========== */
/* 策略：仅当车位结构性状态变化（车辆变更/员工变动/锁定变化）时才重建DOM，
   平时每秒只更新进度条宽度、倒计时文字、收入数字等数字 —— 与 updateInfobar 签名缓存思路一致 */
let _parkSig1 = '', _parkSig2 = '', _fspotSig = '';

function _spotSignature(idx){
  const sp = S.spots[idx];
  if(!sp) return 'e:'+idx;
  if(!sp.unlocked) return 'l:'+idx;
  const inst = instAtSpot(idx);
  if(!inst) return 'v:'+idx;
  /* 结构签名：carId + empIid + enhanceLevel + accrued等级(0/非0满仓) */
  const full = inst.accrued >= capOf(inst) ? 1 : 0;
  return 'c:'+inst.carId+'|e:'+(inst.empIid||'')+'|h:'+(inst.enhanceLevel||0)+'|f:'+full+'@'+idx;
}

function updateParkGridsLite(){
  /* 第1面板：车位1-4 */
  const sig1 = _spotSignature(0)+'|'+_spotSignature(1)+'|'+_spotSignature(2)+'|'+_spotSignature(3);
  if(sig1 !== _parkSig1){ _parkSig1 = sig1; refreshParkGrid(); }
  else { _updateParkNumbers('parkGrid', 0, 4); }

  /* 第2面板：车位5-8 */
  const sig2 = _spotSignature(4)+'|'+_spotSignature(5)+'|'+_spotSignature(6)+'|'+_spotSignature(7);
  if(sig2 !== _parkSig2){ _parkSig2 = sig2; refreshParkGrid2(); }
  else { _updateParkNumbers('parkGrid2', 4, 8); }

  /* 第0面板：好友车位（好友停车状态变化时需要重建） */
  let fsig = '';
  const fspots = S.fspots || [];
  for(let i=0;i<4;i++){ const fs=fspots[i]||{}; fsig += (fs.unlocked?'u':'l')+':'+(fs.parkerUid||'')+(fs.ticketed?'|t':'')+'|'; }
  if(fsig !== _fspotSig){ _fspotSig = fsig; refreshFspotGrid(); }
  else { _updateFspotTimes(); } /* 每秒刷新停留时间 + 按钮状态 */
}

/* 仅更新车位卡片中的数字（进度条宽度、收入、倒计时），不重建DOM */
function _updateParkNumbers(gridId, startIdx, endIdx){
  const g = $('#'+gridId); if(!g) return;
  const cards = g.querySelectorAll('.park-card[data-spot]');
  cards.forEach(card => {
    const idx = parseInt(card.dataset.spot);
    if(idx < startIdx || idx >= endIdx) return;
    const sp = S.spots[idx];
    if(!sp || !sp.unlocked) return;
    const inst = instAtSpot(idx);
    if(!inst) return;
    const c = CAR_BY_ID[inst.carId];
    if(!c) return;

    const cap = capOf(inst);
    const pct = clamp(inst.accrued / cap * 100, 0, 100);

    /* 更新收入数字 */
    const currEl = card.querySelector('.pc-curr');
    if(currEl) currEl.textContent = f(Math.floor(inst.accrued));
    const capEl = card.querySelector('.pc-cap');
    if(capEl) capEl.textContent = f(cap);

    /* 更新进度条宽度 */
    const fillEl = card.querySelector('.pc-prog-fill');
    if(fillEl) fillEl.style.width = pct + '%';

    /* 更新收取按钮满仓状态 */
    const collectBtn = card.querySelector('.pc-collect-inline');
    if(collectBtn){
      if(pct >= 100 && !collectBtn.classList.contains('full')) collectBtn.classList.add('full');
      else if(pct < 100 && collectBtn.classList.contains('full')) collectBtn.classList.remove('full');
    }

    /* 更新倒计时 */
    const inc = incomeOf(inst);
    const remainSec = inc > 0 ? Math.floor((cap - inst.accrued) / inc * 60) : 0;
    const rmH = String(Math.floor(remainSec / 3600)).padStart(2,'0');
    const rmM = String(Math.floor((remainSec % 3600) / 60)).padStart(2,'0');
    const rmS = String(remainSec % 60).padStart(2,'0');
    const timerVal = card.querySelector('.pc-timer-val');
    if(timerVal) timerVal.textContent = remainSec > 0 ? (rmH+':'+rmM+':'+rmS) : '已满仓';
  });
}

/* 仅更新好友车位卡片中的停留时间 + 按钮状态（不重建DOM），每秒调用 */
function _updateFspotTimes(){
  const g = $('#friendParkGrid') || $('#fspotGrid'); if(!g) return;
  const cards = g.querySelectorAll('.park-card[data-fspot]');
  cards.forEach(card => {
    const fspotIdx = parseInt(card.dataset.fspot);
    // 找到停在这个车位的好友
    const parker = (S.friends || []).find(fr => fr.parkedAtMe === fspotIdx);
    if(!parker){ return; } /* 空车位或无车，跳过 */

    const fcarId = parker.parkCarId || parker.bestCarId;
    const pcar = CAR_BY_ID[fcarId];
    const incPerMin = pcar ? incomeOf({carId: pcar.id}) : 0;
    const cap = pcar ? (pcar.capacity || 6300) : 6300;

    /* 动态计算停车时长（毫秒→分:秒） */
    const parkedSec = parker.parkedAtTs ? Math.floor((now() - parker.parkedAtTs) / 1000)
                                        : Math.floor((parker.parkAccrued || 0) / ((incPerMin || 1) / 60));
    const fullSec = incPerMin > 0 ? Math.floor((cap / incPerMin) * 60) : 0;
    const displaySec = (fullSec > 0 && parkedSec > fullSec) ? fullSec : parkedSec;
    const h = Math.floor(displaySec / 3600);
    const m = Math.floor((displaySec % 3600) / 60);
    const s = displaySec % 60;
    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    /* 更新停留时间文本 */
    const timeEl = card.querySelector('.fspot-park-time');
    if(timeEl) timeEl.textContent = `停留时间 ${timeStr}`;

    /* 更新按钮状态（始终显示「开罚单」，点击时校验30分钟门槛） */
    const isTicketed = !!parker.ticketed;
    const actionRow = card.querySelector('.fspot-action-row');
    if(!actionRow) return;

    const oldBtn = actionRow.querySelector('.fspot-ticket-btn, .fspot-ticketed-btn, .fspot-ticket-wait-btn');
    if(!oldBtn) return;

    const isTicketedBtn = oldBtn.classList.contains('fspot-ticketed-btn');

    if(isTicketed && !isTicketedBtn){
      /* 应该变成已贴单 */
      oldBtn.outerHTML = `<button class="btn-ghost btn-sm fspot-ticketed-btn" disabled>已贴单</button>`;
    } else if(!isTicketed && !oldBtn.classList.contains('fspot-ticket-btn')){
      /* 未贴单：始终显示可点击的「开罚单」按钮（不足30分钟点击时由 ticketFriend 拦截并提示） */
      oldBtn.outerHTML = `<button class="btn-primary btn-sm fspot-ticket-btn" data-action="ticket-friend" data-friend-uid="${parker.uid}" data-fspot="${fspotIdx}">开罚单</button>`;
    }
  });
}

/* ---------- 第1面板：车位1-4 (A02 元件11) — 固定4格 ---------- */
function refreshParkGrid(){
  const g = $('#parkGrid'); if(!g) return;
  let h = '';
  const PAGE_SIZE = 4;
  for(let idx = 0; idx < PAGE_SIZE; idx++){
    const sp = S.spots[idx];
    if(!sp){
      // 车位不存在 — 显示空
      h += `<div class="park-card" data-spot="${idx}">
        <div class="pc-empty-park"><div class="pc-p-icon">P</div><div class="pc-p-label">空车位</div></div>
      </div>`;
      continue;
    }
    if(!sp.unlocked){
      const cost = (D.unlocks.spotCost&&D.unlocks.spotCost[idx]) || (idx+1)*10000;
      const canAfford = S.dollars >= cost;
      h += `<div class="park-card locked" data-spot="${idx}">
        <div class="pc-lock-wrap">
          <div class="pc-lock-icon">🔒</div>
          <div class="pc-lock-cost">${DOLLAR_IC} ${f(cost)}</div>
          <button class="park-unlock-btn${canAfford?' can-afford':''}" data-action="unlock-spot" data-idx="${idx}">点击解锁</button>
        </div>
      </div>`;
      continue;
    }
    const inst = instAtSpot(idx);
    h += renderParkCard(inst, idx);
  }
  g.innerHTML = h;
}

/* ---------- 第2面板：车位5-8 (无返回按钮、无更多车位文本) — 固定4格 ---------- */
function refreshParkGrid2(){
  const g = $('#parkGrid2'); if(!g) return;
  let h = '';
  const PAGE_SIZE = 4;
  const START_IDX = 4;
  for(let i = 0; i < PAGE_SIZE; i++){
    const idx = START_IDX + i;
    const sp = S.spots[idx];
    if(!sp){
      h += `<div class="park-card" data-spot="${idx}">
        <div class="pc-empty-park"><div class="pc-p-icon">P</div><div class="pc-p-label">空车位</div></div>
      </div>`;
      continue;
    }
    if(!sp.unlocked){
      const cost = (D.unlocks.spotCost&&D.unlocks.spotCost[idx]) || (idx+1)*10000;
      const canAfford = S.dollars >= cost;
      h += `<div class="park-card locked" data-spot="${idx}">
        <div class="pc-lock-wrap">
          <div class="pc-lock-icon">🔒</div>
          <div class="pc-lock-cost">${DOLLAR_IC} ${f(cost)}</div>
          <button class="park-unlock-btn${canAfford?' can-afford':''}" data-action="unlock-spot" data-idx="${idx}">点击解锁</button>
        </div>
      </div>`;
      continue;
    }
    const inst = instAtSpot(idx);
    h += renderParkCard(inst, idx);
  }
  g.innerHTML = h;
}

/* ---------- 第0面板：好友专用车位 (A06) — 固定4格 ---------- */
function refreshFspotGrid(){
  const g = $('#friendParkGrid'); if(!g) return;
  let h = '';
  const fspots = S.fspots || [];
  for(let i = 0; i < 4; i++){
    const fs = fspots[i] || {unlocked: false};
    if(!fs.unlocked){
      // 未解锁：显示锁 + 解锁条件（好友数）
      const needFriends = [0, 3, 10, 20][i] || (i * 7);
      const fc = friendCount();
      h += `<div class="park-card locked clickable" data-action="go-add-friends" data-fspot="${i}">
        <div class="pc-lock-wrap">
          <div class="pc-lock-icon">🔒</div>
          <div class="pc-lock-cost">👥 ${fc}/${needFriends} 好友</div>
          <div class="pc-lock-hint">添加更多好友解锁</div>
        </div>
      </div>`;
      continue;
    }
    // 已解锁：检查是否有好友车停在这里
    const parker = (S.friends || []).find(fr => fr.parkedAtMe === i);
    if(parker){
      // 有好友车停着：显示车辆 + 开罚单按钮 + 停留时间
      const fcarId = parker.parkCarId || parker.bestCarId;
      const pcar = CAR_BY_ID[fcarId];
      const pct = pcar ? clamp((parker.parkAccrued||0) / (pcar.capacity || 1) * 100, 0, 100) : 0;
      const isTicketed = !!parker.ticketed;
      // 按钮HTML：已贴单 / 开罚单（始终可点击，不足30分钟由点击处理函数拦截提示）
      let ticketBtnHtml;
      if(isTicketed){
        ticketBtnHtml = `<button class="btn-ghost btn-sm fspot-ticketed-btn" disabled>已贴单</button>`;
      } else {
        ticketBtnHtml = `<button class="btn-primary btn-sm fspot-ticket-btn" data-action="ticket-friend" data-friend-uid="${parker.uid}" data-fspot="${i}">开罚单</button>`;
      }
      h += `<div class="park-card" data-fspot="${i}">
        ${pcar?`<div class="pc-rating-row">${ratingBadge(pcar.rating)}</div>`:''}
        <div class="pc-body">
          ${pcar ? carImg(pcar.id, 140, 90) : '<span style="color:var(--mut)">未知车辆</span>'}
        </div>
        <div class="fspot-timer-row">
          <span class="fspot-parker-name">${parker.name}</span>
          <span class="fspot-park-time">停留时间 ${formatParkTime(parker)}</span>
        </div>
        <div class="fspot-action-row">
          ${ticketBtnHtml}
        </div>
      </div>`;
    } else {
      // 空闲好友车位：点击弹出说明弹窗
      h += `<div class="park-card fspot-empty-card" data-action="open-fspot-info" data-fspot="${i}">
        <div class="fspot-empty-content">
          <div class="fspot-empty-icon">🅿️</div>
          <div class="fspot-empty-label">好友车位</div>
        </div>
      </div>`;
    }
  }
  g.innerHTML = h;
}

// 格式化好友停车时长（MM:SS）
function formatParkTime(parker){
  if(!parker || parker.parkedAtMe === null || parker.parkedAtMe === undefined) return '--:--:--';
  // 优先用真实停车时刻 parkedAtTs 推算（与开罚单门槛一致），缺失时回退 accrued 反推
  if(parker.parkedAtTs){
    const fcarId = parker.parkCarId || parker.bestCarId;
    const pcar = CAR_BY_ID[fcarId];
    const incPerMin = pcar ? incomeOf({carId: pcar.id}) : 0;
    const cap = pcar ? (pcar.capacity || 6300) : 6300;
    let secs = Math.floor((now() - parker.parkedAtTs) / 1000);
    const fullSec = incPerMin > 0 ? Math.floor((cap / incPerMin) * 60) : 0;
    if(fullSec > 0 && secs > fullSec) secs = fullSec; // 满仓后停留时间停在此处
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  // 简化：用 accrued 反推大致时间
  const fcarId = parker.parkCarId || parker.bestCarId;
  const pcar = CAR_BY_ID[fcarId];
  if(!pcar) return '--:--:--';
  const incPerMin = incomeOf({carId: pcar.id});
  if(incPerMin <= 0) return '00:00:00';
  const mins = Math.floor((parker.parkAccrued || 0) / incPerMin);
  return `${String(mins).padStart(2,'0')}:00`;
}

/* ---------- 订购车锁广告 ---------- */
function renderOrderLockArea(){
  const a = $('#orderLockArea'); if(!a) return;
  // 找一个未解锁的车位
  const lockedIdx = S.spots.findIndex((s,i)=>!s.unlocked);
  const cost = lockedIdx>=0 ? ((D.unlocks.spotCost&&D.unlocks.spotCost[lockedIdx])||(lockedIdx+1)*10000) : 0;
  const canAfford = lockedIdx>=0 && S.dollars >= cost;
  a.innerHTML = `
    <div class="ol-ad" data-action="open-market">
      <div class="ol-ad-text">P</div>
      <div class="ol-ad-sub">订购车锁</div>
    </div>
    <div class="ol-lock">
      <div class="ol-lock-icon">🔒</div>
      ${lockedIdx>=0?`<div class="ol-lock-price">${DOLLAR_IC}${f(cost)}</div>
        <button class="ol-lock-btn${canAfford?' can-afford':''}" data-action="unlock-spot" data-idx="${lockedIdx}">解锁车位</div>`
        :'<div style="font-size:11px;color:var(--mut)">全部已解锁</div>'}
    </div>`;
}

/* ==================== A03 分享弹窗 ==================== */
// 分享统一走 TapTap SDK，不再弹自定义分享面板
let _shareReturnQuests = false;
function renderShare(fromQuest){
  _shareReturnQuests = !!fromQuest;
  // 直接调用 TapTap SDK 分享（不再弹出分享面板）
  ttShareToTapTap();
  // 计数+任务逻辑
  S.stats.shareCount++;
  save(); updateNavDots();
  syncInviteRewards().then(res => {
    if(res.ok && res.newCount === 0){
      toast('已分享！需有好友通过你的邀请链接\n下载注册后才能获得黄金奖励');
    }
  });
  if(_shareReturnQuests){ _shareReturnQuests = false; renderQuests(); }
}

/* ==================== A04 个人信息 ==================== */
function renderProfile(){
  const topCar = S.inst.length ? S.inst.reduce((a,b)=>CAR_BY_ID[b.carId].value>CAR_BY_ID[a.carId].value?b:a,S.inst[0]) : null;
  // 查找现任老板（雇佣我的好友）
  const myBoss = S.friends.find(f => f.uid === S.employedBy);
  openModal(`
    <div class="uip-wrap">
        <div class="uip-header">
          <div class="uip-name-row">
            <span class="uip-title">${S.name}</span>
            <button class="uip-rename-btn" data-action="open-rename-modal" title="改名">✏️</button>
          </div>
          <button class="uip-close" data-action="close-modal">✕</button>
        </div>
      <div class="uip-body">
        <div class="uip-top-row">
          <div class="uip-avatar">${S.avatar ? `<img src="${S.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '👤'}</div>
          <div class="uip-stats-col">
            <div class="uip-stat-row"><span class="uip-stat-icon">🏆</span>身价：<b>${f(networth())}</b></div>
            <div class="uip-stat-row"><span class="uip-stat-icon">${ASSET_IC}</span>资产：<b>${f(assets())}</b></div>
            <div class="uip-stat-row"><span class="uip-stat-icon">${BEAN_IC}</span>黄金：<b>${fbean(S.beans)}</b></div>
            <div class="uip-stat-row"><span class="uip-stat-icon">${DOLLAR_IC}</span>刀乐：<b>${f(S.dollars)}</b></div>
          </div>
          <button class="giftcode-entry-btn" data-action="open-giftcode" title="礼包码">
            <div class="giftcode-entry-ic">🎁</div>
            <span class="giftcode-entry-txt">礼包码</span>
          </button>
        </div>
        <div class="uip-uid">UID：${S.uid} ${S.taptap ? '<span class="uip-tt-badge" title="TapTap 已登录">✓</span>' : ''}</div>
        <div class="uip-boss-row">
          <div class="uip-boss-cell">
            <div class="uip-boss-label">现任老板</div>
            <div class="uip-boss-val">${myBoss ? myBoss.name : '还没有老板'}</div>
          </div>
          <div class="uip-boss-cell">
            <div class="uip-boss-label">最栽培我的老板</div>
            <div class="uip-boss-val-with-avatar">
              <div class="uip-boss-avatar">👤</div>
              <span>还没有被雇佣过</span>
            </div>
          </div>
        </div>
        <div class="uip-car-section">
          <div class="uip-car-label">最有价值的车</div>
          ${topCar?`<div class="uip-car-body">
            <div class="uip-car-img-wrap">
              ${carImg(topCar.carId,180,110)}
              ${ratingBadge(CAR_BY_ID[topCar.carId].rating)}
            </div>
            <div class="uip-car-name-row">${logoImg(CAR_BY_ID[topCar.carId].brand)}<span class="uip-car-name">${colorName(CAR_BY_ID[topCar.carId].name)}</span></div>
          </div>`:`<div class="text-mut fs-12 p-4">还没有车！</div>`}
        </div>
      </div>
    </div>
  `);
}

/* ==================== TapTap 登录 ==================== */
/** 登录页 loading 态开关 */
function setLoginBusy(busy, text){
  const btn = $('#login-btn');
  const loadingEl = $('#login-loading');
  if(btn) btn.disabled = !!busy;
  if(loadingEl){
    loadingEl.classList.toggle('hidden', !busy);
    if(text){ const sp = loadingEl.querySelector('span'); if(sp) sp.textContent = text; }
  }
}

/**
 * 进入登录页后的【自动登录】（强制登录的核心）：
 *   1) 本地已有登录态 且 tap.checkSession 判定会话仍有效 → 免登录直接进游戏
 *   2) 否则静默拉起 tap.login()（小游戏容器内玩家已登录 TapTap 客户端账号，通常无需二次确认）
 *   3) 失败则停留登录页，把按钮文案改为「重新登录」，绝不放行游客
 */
async function autoLogin(){
  const CX = window.ChexingSDK;
  if(!CX || !CX.isTapMiniGame) return;   // 仅 TapTap 小游戏环境自动登录
  if(gameStarted || autoLogin._running) return;
  autoLogin._running = true;
  setLoginBusy(true, '正在自动登录 TapTap...');
  try{
    if(S.taptap){
      const alive = await CX.checkSession();
      if(alive){
        console.log('[autoLogin] TapTap 会话有效，免登录进入');
        proceedAfterLogin();
        return;
      }
      console.log('[autoLogin] TapTap 会话已过期，重新静默登录');
    }
    await tapLogin({ silent:true });
  }catch(e){
    console.warn('[autoLogin] 异常：', e);
  }finally{
    autoLogin._running = false;
    if(!gameStarted) setLoginBusy(false);
  }
}

/**
 * 用 TapTap openid 稳定派生 8 位玩家 UID。
 * 意义：① 跨设备/重装后 UID 不变；② 其他玩家能用这个 UID 搜索到你。
 * 取值区间 40000000~99999999，避开机器人(1000xxxx)、内置玩家(2000xxxx)、历史迁移(30xxxxxx)。
 */
function uidFromOpenid(openid){
  const s = String(openid || '');
  let h = 5381;
  for(let i=0;i<s.length;i++) h = ((h*33) ^ s.charCodeAt(i)) >>> 0;
  // 雪崩混合（murmur3 finalizer）：避免相似 openid 派生出相邻 UID，降低碰撞与可猜测性
  // ⚠️ 每一步都要 >>>0 转回无符号：^ 运算返回有符号 32 位，负数取模会得到负 UID
  h = ((h ^ (h >>> 16)) >>> 0); h = Math.imul(h, 2246822507) >>> 0;
  h = ((h ^ (h >>> 13)) >>> 0); h = Math.imul(h, 3266489909) >>> 0;
  h = ((h ^ (h >>> 16)) >>> 0);
  return 40000000 + (h % 60000000);
}

/** TapTap Image 对象 → 头像 URL（兼容直接给字符串的情况） */
function tapAvatarUrl(av){
  if(!av) return null;
  if(typeof av === 'string') return av;
  return av.smallUrl || av.mediumUrl || av.url || av.originalUrl || null;
}

/**
 * 把玩家自身 UID 改为 newUid，并同步存档内所有指向自己的引用，
 * 避免雇佣关系/身价贡献因换 UID 而断裂（与 load() 里的 UID 归一化迁移同源）。
 */
function remapSelfUid(newUid){
  const oldUid = S.uid;
  if(oldUid === newUid) return;
  S.uid = newUid;
  (S.employees||[]).forEach(emp => {
    if(emp == null || typeof emp !== 'object') return;
    if(emp.hiredFrom === oldUid) emp.hiredFrom = newUid;
    if(emp.topHirerUid === oldUid) emp.topHirerUid = newUid;
    if(emp.employedBy === oldUid) emp.employedBy = newUid;
    if(emp.nwContributors && typeof emp.nwContributors === 'object' && oldUid in emp.nwContributors){
      emp.nwContributors[newUid] = emp.nwContributors[oldUid];
      delete emp.nwContributors[oldUid];
    }
  });
  (S.friends||[]).forEach(fr => { if(fr && fr.employedBy === oldUid) fr.employedBy = newUid; });
  if(S.employedBy === oldUid) S.employedBy = newUid;
  console.log('[UID] 已绑定 TapTap 账号：', oldUid, '→', newUid);
}

/**
 * 补全真实 TapTap 身份（openid / 昵称 / 头像）。
 * ⚠️ 关键：tap.login() 只返回 code，前端拿不到 openid（官方要求后端 code2Session）。
 *    本项目无后端，改走排行榜 API —— submitScores 的返回体与 loadCurrentPlayerLeaderboardScore
 *    都会回传当前玩家的真实 openid / unionid / 昵称 / 头像，这是纯前端拿到真实身份的唯一途径。
 * 拿到 openid 后：绑定玩家 UID（跨设备一致、可被他人搜索）+ 启动防沉迷合规。
 */
async function resolveTapIdentity(){
  const CX = window.ChexingSDK;
  if(!CX || !CX.isTapMiniGame || !S.taptap) return;
  if(!TAPTAP_LB_ASSETS) return;
  try{
    // 1) 提交一次分数 → 返回 results[0].openid / unionid
    const sub = await CX.submitLeaderboardScore(TAPTAP_LB_ASSETS, Math.floor(Number(S.dollars)||0));
    if(sub && sub.success && sub.openid){
      S.taptap.openid = sub.openid;
      S.taptap.unionid = sub.unionid || S.taptap.unionid || null;
    }
    // 2) 读回自己的榜单记录 → 拿真实昵称/头像（无需 scope.userInfo 授权弹窗）
    const cur = await CX.loadCurrentPlayerScore({ leaderboardId: TAPTAP_LB_ASSETS });
    if(cur && cur.success && cur.user){
      if(cur.user.openid)  S.taptap.openid  = cur.user.openid;
      if(cur.user.unionid) S.taptap.unionid = cur.user.unionid;
      if(cur.user.name)    S.taptap.name    = cur.user.name;
      const av = tapAvatarUrl(cur.user.avatar);
      if(av) S.taptap.avatar = av;
    }
    if(!S.taptap.openid){
      console.warn('[resolveTapIdentity] 未能取得 openid（排行榜可能未发布或网络异常）');
      return;
    }
    // 3) UID 绑定 TapTap 账号
    remapSelfUid(uidFromOpenid(S.taptap.openid));
    // 4) 昵称/头像同步（玩家未主动改过名时用 TapTap 账号信息）
    if(S.taptap.name && !(S.renameCount > 0)) S.name = S.taptap.name;
    if(S.taptap.avatar && !S.avatar) S.avatar = S.taptap.avatar;
    save();
    ttComplianceStart();          // 有真实 openid 后才能正确启动防沉迷
    try{ updateHUD(); }catch(e){}
    console.log('[resolveTapIdentity] 身份就绪：', S.taptap.name, S.uid);
  }catch(e){
    console.warn('[resolveTapIdentity] 失败：', e);
  }
}

/**
 * 登录页上的 TapTap 登录按钮（显示loading状态）
 */
function splashTapLogin(){
  setLoginBusy(true, '正在连接 TapTap...');
  tapLogin().finally(() => { if(!gameStarted) setLoginBusy(false); });
}

/**
 * 拉起 TapTap 登录，成功后把账号信息写入 S.taptap 并持久化
 * @param {object} [opts]
 * @param {boolean} [opts.silent] 自动登录场景：不弹"正在跳转"提示
 */
async function tapLogin(opts){
  if(!window.ChexingSDK){
    toast('登录功能暂不可用');
    return;
  }
  if(!window.ChexingSDK.isTapEnv){
    toast('请在 TapTap 客户端中使用登录功能');
    return;
  }
  const silent = !!(opts && opts.silent);
  if(!silent) toast('正在跳转到 TapTap 登录...');
  // 强制登录失败时，把按钮文案改成「重新登录」，引导玩家重试（不放行游客）
  const markRetry = () => {
    const btn = $('#login-btn');
    if(btn){ const sp = btn.querySelector('span:last-child'); if(sp) sp.textContent = '重新登录 TapTap'; }
  };
  try {
    const r = await window.ChexingSDK.login();
    if(r && r.success){
      S.taptap = {
        openid: r.openid || null,
        unionid: r.unionid || null,
        name: r.name || null,
        avatar: r.avatar || null,
        code: r.code || null,   // H5 环境的登录凭证（一次性，5 分钟有效）
      };
      save();
      if(!silent) toast('TapTap 登录成功：' + (S.taptap.name || 'TapTap 用户'));
      proceedAfterLogin();   // 登录成功：拉云端存档 → 水合 → 进入游戏（其中会补全真实身份）
    } else {
      const m = (r && r.msg) || '';
      // TapTap 环境：强制登录，失败/取消一律不放行，停留在登录页让玩家重试
      if(!window.ChexingSDK.isTapMiniGame){
        // 浏览器调试环境：无真实 TapTap 登录能力，允许游客进入（仅开发用）
        if(m.indexOf('取消') >= 0) toast('已取消登录（调试模式：游客进入）');
        else toast('登录失败（调试模式：游客进入）：' + (m || ''));
        setTimeout(enterGame, 900);
        return;
      }
      if(m.indexOf('取消') >= 0) toast('需要登录 TapTap 账号才能进入游戏');
      else toast('登录失败：' + (m || '') + '，请点击按钮重试');
      markRetry();
    }
  } catch(e){
    const msg = (e && e.message) ? e.message : String(e);
    if(!window.ChexingSDK || !window.ChexingSDK.isTapMiniGame){
      if(msg.indexOf('取消') >= 0) toast('已取消登录（调试模式：游客进入）');
      else toast('登录异常（调试模式：游客进入）：' + msg);
      setTimeout(enterGame, 900);
      return;
    }
    if(msg.indexOf('取消') >= 0) toast('需要登录 TapTap 账号才能进入游戏');
    else toast('登录异常：' + msg + '，请点击按钮重试');
    markRetry();
  }
}

/**
 * 退出 TapTap 登录，清除本地登录态
 */
async function tapLogout(){
  if(window.ChexingSDK){
    try { await window.ChexingSDK.logout(); } catch(e){ /* 忽略原生错误，仍清除本地态 */ }
    try { if(window.ChexingSDK.complianceExit) await window.ChexingSDK.complianceExit(); } catch(e){}
  }
  S.taptap = null;
  save();
  toast('已退出 TapTap 登录');
  renderProfile();
}

/* ==================== TapTap 七大功能模块 ==================== */
// 在 TapTap 开发者后台「游戏服务 → 排行榜」创建**两个**排行榜后，复制 ID 填到此处：
//   - 资产排名：分数=刀乐总额(S.dollars)，整数，降序
//   - 身价排名：分数=雇佣身价(S.networth)，整数，降序
// 留空时：打开对应榜单会提示"尚未配置"，提交分数会被静默跳过（不会报错）。
const TAPTAP_LB_ASSETS = 'ujpraygcl92w7ibe7v';   // 资产排行榜 客户端ID（TapTap后台已创建并发布）
const TAPTAP_LB_NETWORTH = 'vpxb3y7j0o1kmmy57n'; // 身价排行榜 客户端ID（TapTap后台已创建并发布）

// 启动防沉迷合规（登录成功后或游戏启动时调用）
async function ttComplianceStart(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv) return;
  const openId = (S.taptap && (S.taptap.openid || S.taptap.unionid)) || '';
  try { await window.ChexingSDK.complianceStartup({ openId }); }
  catch(e){ console.warn('[TapTap] compliance startup failed', e); }
}

// 去评价
async function ttReview(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中使用评价功能'); return; }
  toast('正在打开 TapTap 评价...');
  const r = await window.ChexingSDK.openReview();
  if(!(r && r.success)) toast((r && r.msg) ? ('打开评价失败：' + r.msg) : '打开评价失败');
}

// 分享游戏到 TapTap 动态（统一分享入口）
async function ttShareToTapTap(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中使用分享功能'); return; }
  const code = ensureInviteCode();
  toast('正在调起 TapTap 分享...');
  const r = await window.ChexingSDK.shareToTapTap({
    title: '抢车位：华夏崛起',
    contents: `【我的邀请码 ${code}】我在《抢车位：华夏崛起》停车赚钱，快来一起玩！`
  });
  // tap.showShareboard 的 success 仅表示「面板拉起成功」，不等于用户已完成分享。
  // 真正的分享结果（用户选了哪个渠道、是否发出去）由 TapTap 系统面板处理，H5 层拿不到回调。
  // 因此：面板成功拉起时静默计数（任务进度），但不飘「分享成功」；失败才提示。
  if(r && r.success){
    S.stats.shareCount++; save(); updateNavDots();
    syncInviteRewards();
    // 不再 toast('分享成功') —— 用户还没真正分享呢
  } else {
    toast((r && r.msg) ? ('分享失败：' + r.msg) : '分享失败');
  }
}

// 打开排行榜（根据当前 rankTab 打开对应榜单：asset→资产榜 / networth→身价榜）
async function ttOpenLeaderboard(tab){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中查看排行榜'); return; }
  const lbId = (tab === 'networth') ? TAPTAP_LB_NETWORTH : TAPTAP_LB_ASSETS;
  if(!lbId){
    toast('排行榜尚未配置（请在 app.js 设置 TAPTAP_LB_ASSETS / TAPTAP_LB_NETWORTH）');
    return;
  }
  toast('正在打开 TapTap 排行榜...');
  const r = await window.ChexingSDK.openLeaderboard({
    leaderboardId: lbId,
    openId: (S.taptap && (S.taptap.openid || S.taptap.unionid)) || ''
  });
  if(!(r && r.success)) toast((r && r.msg) ? ('打开排行榜失败：' + r.msg) : '打开排行榜失败');
}

// 提交排行榜分数（资产变动时由 save() 自动调用，debounce 4s）
// 同时提交两个榜单：资产榜=刀乐总额(S.dollars)，身价榜=雇佣身价(S.networth)
let _lbSubmitTimer = null;
function trySubmitLeaderboard(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv) return;
  if(!TAPTAP_LB_ASSETS && !TAPTAP_LB_NETWORTH) return;   // 两个都没配才跳过
  if(!S.taptap) return;
  if(_lbSubmitTimer) return;
  _lbSubmitTimer = setTimeout(async () => {
    _lbSubmitTimer = null;
    try {
      const assetScore = Math.floor(Number(S.dollars) || 0);
      const nwScore = Math.floor(Number(S.networth) || 0);
      const promises = [];
      if(TAPTAP_LB_ASSETS) promises.push(window.ChexingSDK.submitLeaderboardScore(TAPTAP_LB_ASSETS, assetScore));
      if(TAPTAP_LB_NETWORTH) promises.push(window.ChexingSDK.submitLeaderboardScore(TAPTAP_LB_NETWORTH, nwScore));
      await Promise.allSettled(promises);
    } catch(e){ console.warn('[排行榜] 提交分数异常：', e); }
  }, 4000);
}

/* ==================== TapTap 真实玩家池 ====================
 * ⚠️ 平台事实（官方文档）：TapTap 小游戏【没有】关系链 API、【没有】按 ID 搜索玩家的接口、
 *    也【没有】微信式开放数据域或 KV 存储；云存档只能读写自己的档。
 *    因此在无自建后端的前提下，**排行榜是拿到其他真实玩家数据的唯一官方通道**：
 *    loadLeaderboardScores 返回 { rank, score, user:{ name, avatar, openid, unionid } }。
 * 这里把两个榜单（资产/身价）的数据合并成"真实玩家池"，供：
 *    ① 全服排行榜展示真人 ② UID 搜索真人 ③ 加真人为好友
 * 局限：只能看到上过榜的玩家（各榜前 200）；加好友是本地单向记录，对方不会收到申请。
 */
let TAP_PLAYER_POOL = [];        // [{uid, openid, name, avatar, assets, networth, rank, isTap:true}]
let _tapPoolTs = 0;              // 上次成功拉取时间戳
const TAP_POOL_TTL = 120000;     // 缓存 2 分钟，避免频繁请求

/** 按资产估算一辆"最有价值的车"（真实玩家只有分数，没有车辆数据） */
function guessCarByAssets(assetVal){
  const v = Number(assetVal) || 0;
  let best = CAR[0];
  for(const c of CAR){ if((c.value||0) <= v && (!best || (c.value||0) > (best.value||0))) best = c; }
  return (best && best.id) || 1;
}

/** 拉取并合并两个榜单的真实玩家（带缓存 + 并发合流） */
async function fetchTapPlayers(force){
  const CX = window.ChexingSDK;
  if(!CX || !CX.isTapMiniGame) return TAP_PLAYER_POOL;
  if(!force && _tapPoolTs && (now() - _tapPoolTs) < TAP_POOL_TTL) return TAP_PLAYER_POOL;
  if(fetchTapPlayers._busy) return fetchTapPlayers._busy;
  fetchTapPlayers._busy = (async () => {
    try{
      const [ra, rn] = await Promise.all([
        TAPTAP_LB_ASSETS   ? CX.loadLeaderboardScores({ leaderboardId:TAPTAP_LB_ASSETS,   maxSize:200 }) : Promise.resolve(null),
        TAPTAP_LB_NETWORTH ? CX.loadLeaderboardScores({ leaderboardId:TAPTAP_LB_NETWORTH, maxSize:200 }) : Promise.resolve(null),
      ]);
      const map = {};   // openid -> player
      const merge = (res, field) => {
        if(!res || !res.success || !Array.isArray(res.scores)) return;
        res.scores.forEach(s => {
          const u = s && s.user;
          if(!u || !u.openid) return;
          const oid = u.openid;
          if(!map[oid]){
            map[oid] = {
              uid: String(uidFromOpenid(oid)),   // 与 BOT_POOL 一致用字符串，便于 data-fruid 比较
              openid: oid,
              name: u.name || 'TapTap玩家',
              avatar: tapAvatarUrl(u.avatar) || '',
              assets: 0, networth: 0, friendsCount: 0, isTap: true,
            };
          }
          map[oid][field] = Math.max(0, Math.floor(Number(s.score) || 0));
          if(field === 'assets') map[oid].rank = s.rank;
        });
      };
      merge(ra, 'assets');
      merge(rn, 'networth');

      const myOid = (S.taptap && S.taptap.openid) || null;
      const list = Object.values(map).filter(p => p.openid !== myOid);
      list.forEach(p => {
        // 身价缺失（只上了资产榜）时用资产折算，并封顶保证雇佣成本可承受
        if(!p.networth) p.networth = Math.min(3000, calcNetworth(p.assets));
        p.bestCarId = guessCarByAssets(p.assets);
      });
      TAP_PLAYER_POOL = list;
      _tapPoolTs = now();
      console.log('[TapTap玩家池] 已加载真实玩家', list.length, '人');
    }catch(e){
      console.warn('[TapTap玩家池] 拉取失败：', e);
    }finally{
      fetchTapPlayers._busy = null;
    }
    return TAP_PLAYER_POOL;
  })();
  return fetchTapPlayers._busy;
}

/** 在真实玩家池中按 UID 查找 */
function findTapPlayer(uid){
  const q = String(uid);
  return TAP_PLAYER_POOL.find(p => String(p.uid) === q) || null;
}

/** 统一的"按 UID 找人"：本地机器人 → 内置玩家 → TapTap 真实玩家 */
function findAnyPlayer(uid){
  const q = String(uid);
  return BOT_POOL.find(b => String(b.uid) === q)
      || REAL_PLAYER_POOL.find(p => String(p.uid) === q)
      || findTapPlayer(q)
      || null;
}

// 打开成就面板
async function ttShowAchievements(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中查看成就'); return; }
  toast('正在打开 TapTap 成就...');
  const r = await window.ChexingSDK.showAchievements();
  if(!(r && r.success)) toast((r && r.msg) ? ('打开成就失败：' + r.msg) : '打开成就失败');
}

// 检查更新
async function ttCheckUpdate(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中检查更新'); return; }
  toast('正在检查更新...');
  const r = await window.ChexingSDK.checkUpdate();
  if(r && r.success) toast('已检查更新（如有新版本将自动提示）');
  else toast((r && r.msg) ? ('检查更新失败：' + r.msg) : '检查更新失败');
}

// 正版验证
async function ttCheckLicense(){
  if(!window.ChexingSDK || !window.ChexingSDK.isTapEnv){ toast('请在 TapTap 客户端中进行正版验证'); return; }
  toast('正在进行正版验证...');
  const r = await window.ChexingSDK.checkLicense();
  if(r && r.success) toast('正版验证完成');
  else toast((r && r.msg) ? ('正版验证失败：' + r.msg) : '正版验证失败');
}

/* ==================== A04b 礼包码 ==================== */
function openGiftCodeModal(){
  openModal(`
    <div class="gc-modal-wrap">
      <div class="gc-modal-header">
        <span class="gc-modal-title">礼包码</span>
        <button class="gc-modal-close" data-action="close-modal">✕</button>
      </div>
      <div class="gc-modal-body">
        <div class="gc-hint">请输入礼包码</div>
        <input id="giftCodeInput" class="gc-input" placeholder="点击输入礼包码" autocomplete="off" />
        <button class="gc-confirm-btn" data-action="redeem-giftcode">确定</button>
      </div>
    </div>
  `);
  // 聚焦输入框
  setTimeout(() => { const inp = document.getElementById('giftCodeInput'); if(inp) inp.focus(); }, 50);
}

function redeemGiftCode(){
  const input = document.getElementById('giftCodeInput');
  if(!input){ toast('请输入正确的礼包码'); return; }
  const code = input.value.trim().toUpperCase();
  if(!code){ toast('请输入正确的礼包码'); return; }

  // 1) 查找礼包码
  const gift = GIFT_CODES[code];
  if(!gift){ toast('请输入正确的礼包码'); return; }

  // 2) 检查是否已领过
  if(!Array.isArray(S.redeemedCodes)) S.redeemedCodes = [];
  if(S.redeemedCodes.indexOf(code) >= 0){
    toast('已领取过同类型礼包');
    closeModal(); // 关闭弹窗让用户看清提示
    // 重新打开个人信息面板（用户从那里点的入口）
    renderProfile();
    return;
  }

  // 3) 发放奖励
  let rewardTexts = [];
  gift.rewards.forEach(r => {
    if(r.type === 'dollars'){
      S.dollars = (S.dollars || 0) + r.val;
      rewardTexts.push(f(r.val) + ' 刀乐');
    } else if(r.type === 'beans'){
      S.beans = (S.beans || 0) + r.val;
      rewardTexts.push(fbean(r.val) + ' 黄金');
    }
  });

  // 4) 标记已领
  S.redeemedCodes.push(code);
  save();

  toast(`兑换成功！获得 ${rewardTexts.join('、')}`);
  updateHUD(); // 刷新 HUD 显示新余额

  // 关闭礼包码弹窗，回到个人信息面板
  closeModal();
  renderProfile();
}

/* ===== 分享系统 ===== */
/**
 * 分享游戏（原生环境走 TapTap SDK，浏览器降级复制文案）
 * @param {object} opts 可选分享参数
 */
async function shareGame(opts = {}){
  const code = ensureInviteCode();

  // TapTap 环境：统一走 TapTap SDK 分享
  if(window.ChexingSDK && window.ChexingSDK.isTapEnv){
    return ttShareToTapTap();
  }

  // 浏览器降级：复制文案到剪贴板
  const baseUrl = opts.url || 'https://www.taptap.cn/app/抢车位：华夏崛起';
  const sep = baseUrl.indexOf('?') >= 0 ? '&' : '?';
  const inviteUrl = `${baseUrl}${sep}inviter=${encodeURIComponent(code)}`;
  const defaultOpts = {
    title: '抢车位：华夏崛起 - 我的车库帝国',
    text: `我在《抢车位：华夏崛起》拥有 ${S.inst.length} 辆车，总资产 ${f(S.dollars)} 刀乐！快来挑战我吧！邀请码：${code}`,
    url: inviteUrl,
  };
  const finalOpts = { ...defaultOpts, ...opts };
  if(!opts.url) finalOpts.url = inviteUrl;

  try {
    await navigator.clipboard.writeText(finalOpts.text + '\n' + (finalOpts.url || ''));
    toast('分享内容已复制到剪贴板');
    syncInviteRewards();
  } catch(e) {
    toast('分享功能暂不可用');
  }
}

/* ===== 邀请奖励（依赖 SDK 返回的真实邀请数据） ===== */
/**
 * 确保玩家有邀请码（基于 uid 稳定生成，仅首次写入）
 */
function ensureInviteCode(){
  if(!S.inviteCode){
    const u = String(S.uid || '');
    S.inviteCode = 'CX' + (u.length >= 6 ? u.slice(-6) : (u + '000000').slice(0,6));
    save();
  }
  return S.inviteCode;
}

/**
 * 从 SDK 同步真实邀请数据，并为"通过邀请链接真实注册"的新用户发放黄金奖励。
 * 完全依赖 ChexingSDK.getInvitedUsers() 的返回，绝不本地伪造。
 *
 * 规则：
 *  - 仅对 SDK 返回、且尚未发放过奖励的 uid 发奖（每用户 10000 黄金）
 *  - 已发放过的 uid 记录在 S.fc.claimedInvites，不重复发奖
 *  - S.fc.friendsInvited 以 SDK 返回的真实邀请数为准（取最大值，兼容往期本地计数）
 *
 * @returns {Promise<{ok:boolean, newCount:number, gold:number}>}
 */
async function syncInviteRewards(){
  ensureInviteCode();
  if(!window.ChexingSDK){
    toast('邀请功能暂不可用');
    return { ok:false, newCount:0, gold:0 };
  }
  let r;
  try {
    r = await window.ChexingSDK.getInvitedUsers({ inviteCode: S.inviteCode });
  } catch(e){
    console.warn('[invite] getInvitedUsers error:', e);
    return { ok:false, newCount:0, gold:0 };
  }
  const users = (r && r.success && Array.isArray(r.users)) ? r.users : [];
  // 以 SDK 真实邀请数为准
  if(users.length > (S.fc.friendsInvited||0)) S.fc.friendsInvited = users.length;
  // 找出尚未发奖的真实新用户
  const claimed = S.fc.claimedInvites || (S.fc.claimedInvites = []);
  const newOnes = users.filter(u => u && u.uid && !claimed.includes(u.uid));
  if(newOnes.length){
    const gold = newOnes.length * 10000;
    S.beans += gold;
    newOnes.forEach(u => claimed.push(u.uid));
    S.stats.inviteCount = (S.stats.inviteCount||0) + newOnes.length;
    save();
    updateHUD(); updateInfobar();
    toast(`🎉 邀请成功 ${newOnes.length} 位新用户，获得 ${fbean(gold)} 黄金！`);
    return { ok:true, newCount:newOnes.length, gold };
  }
  return { ok:true, newCount:0, gold:0 };
}

/* ===== 改名系统 ===== */
function openRenameModal(){
  const costText = (S.renameCount || 0) === 0 ? '免费' : fbean(RENAME_COST_BEANS) + ' 黄金';
  openModal(`
    <div class="rename-modal-wrap">
      <div class="rename-modal-header">
        <span class="rename-modal-title">更改姓名</span>
        <button class="uip-close" data-action="close-modal">✕</button>
      </div>
      <div class="rename-modal-body">
        <div class="rename-label">请输入名字</div>
        <div class="rename-input-row">
          <input type="text" class="rename-input" id="renameInput" value="${S.name}" maxlength="12" placeholder="请输入新名字">
          <button class="rename-dice-btn" data-action="random-name" title="随机生成">🎲</button>
        </div>
        <button class="rename-confirm-btn btn-primary" data-action="confirm-rename">${costText}</button>
      </div>
    </div>
  `);
  setTimeout(() => { const inp = document.getElementById('renameInput'); if(inp) { inp.focus(); inp.select(); } }, 50);
}

function confirmRename(){
  const input = document.getElementById('renameInput');
  if(!input){ toast('请输入名字'); return; }
  const newName = input.value.trim();
  if(!newName){ toast('名字非法'); return; }
  if(newName.length < 2 || newName.length > 12){ toast('名字非法'); return; }

  // 屏蔽字检查
  if(!isNameValid(newName)){ toast('名字非法'); return; }

  // 重名检查
  if(isNameTaken(newName)){ toast('改名字被占用'); return; }

  // 与当前名字相同
  if(newName === S.name){ toast('名字没有变化'); return; }

  // 费用检查（首次免费）
  const count = S.renameCount || 0;
  if(count > 0){
    if(S.beans < RENAME_COST_BEANS){
      toast('黄金不足，需要 ' + fbean(RENAME_COST_BEANS) + ' 黄金');
      return;
    }
    S.beans -= RENAME_COST_BEANS;
  }

  // 执行改名
  S.name = newName;
  S.renameCount = count + 1;
  save();

  // 同步更新好友列表中指向自己的引用（如果有好友记录了玩家旧名）
  // 注意：BOT_POOL 和 REAL_PLAYER_POOL 是全局常量，不在此修改

  updateHUD(); // 刷新 HUD 显示新名字
  toast(count === 0 ? '改名成功！' : '改名成功！消耗 ' + fbean(RENAME_COST_BEANS) + ' 黄金');
  closeModal();
  renderProfile();
}
const EXCH_DAILY_LIMIT = 3; // 每天可兑换次数（看广告）
function doExchange(){
  const amt = Math.floor(totalIncomePerMin() * 360); // 6小时产量
  if(amt <= 0){ toast('当前没有收入来源'); return; }
  // 先锚定到本地今日，避免跨日边缘读取到旧 lastDay 而被误判
  const today = localToday();
  if(S.exch.lastDay !== today){ S.exch.count = 0; S.exch.lastDay = today; }
  if(S.exch.count >= EXCH_DAILY_LIMIT){ toast('今日兑换次数已用完，请明日再来'); return; }
  // 调用原生激励视频广告（浏览器环境自动降级为模拟模式）
  if(window.ChexingSDK){
    toast('正在加载广告...');
    window.ChexingSDK.showRewardAd().then(result => {
      if(result && result.success){
        S.dollars += amt; S.stats.earned += amt; S.exch.count++;
        updateHUD(); renderExchangeModal();
        SFX.play('coin');
        toast(`观看广告完成，兑换成功！+${f(amt)} 刀乐（今日第${S.exch.count}/${EXCH_DAILY_LIMIT}次）`);
        save();
      } else {
        toast('广告未完整观看，无法兑换');
      }
    }).catch(() => {
      toast('广告加载失败，请稍后重试');
    });
  } else {
    // 无 SDK 时降级：演示模式
    S.dollars += amt; S.stats.earned += amt; S.exch.count++;
    updateHUD(); renderExchangeModal();
    SFX.play('coin');
    toast(`观看广告完成，兑换成功！+${f(amt)} 刀乐（今日第${S.exch.count}/${EXCH_DAILY_LIMIT}次）`);
    save();
  }
}
function renderExchangeModal(){
  const amt = Math.floor(totalIncomePerMin() * 360);
  const remaining = EXCH_DAILY_LIMIT - S.exch.count;
  const canExch = amt > 0 && S.exch.count < EXCH_DAILY_LIMIT;
  openModal(`
    <div class="exch-header"><span>兑换刀乐</span></div>
    <div class="exch-body">
      <div class="exch-chest">📦</div>
      <div class="exch-slogan">车的品质越高<br>刀乐收入越多</div>
      <div class="exch-subtitle">观看1个广告兑换6小时产量</div>
      <div class="exch-gold-box">
        <span class="exch-gold-icon">${DOLLAR_IC}</span>
        <b class="exch-gold-val">${f(amt)}</b>
      </div>
      <div class="exch-count">今日还可兑换 ${remaining} 次</div>
      <button class="exch-btn" ${canExch?'':'disabled'} data-action="do-exchange"><span class="exch-btn-icon">📺</span> 观看广告兑换</button>
      <div class="exch-footer">
        <span>每天可兑换 ${EXCH_DAILY_LIMIT} 次，次日自然日恢复</span>
      </div>
    </div>
  `);
}

/* ==================== A05b 充值（看广告模式）==================== */
const RCH_TIERS = [
  { gold: 6000,  ads: 1,   beans: 1 },
  { gold: 30000, ads: 5,   beans: 2 },
  { gold: 98000, ads: 15,  beans: 3 },
  { gold: 198000,ads: 30,  beans: 1 },
];

function resetRchAdsDaily(){
  const tod = todayStr();
  if(S.rchAds.lastDay !== tod){
    S.rchAds.lastDay = tod;
    // 规范：自然日仅重置【已领奖】的档位；
    // 未领奖但观看进度未满的档位保留 watched 进度，不随自然日清零。
    if(!Array.isArray(S.rchAds.watched)) S.rchAds.watched = [0,0,0,0];
    if(!Array.isArray(S.rchAds.claimed)) S.rchAds.claimed = [false,false,false,false];
    for(let i=0;i<S.rchAds.watched.length;i++){
      if(S.rchAds.claimed[i]){
        S.rchAds.watched[i] = 0;
        S.rchAds.claimed[i] = false;
      }
    }
    save();
  }
}

function watchAd(tierIdx){
  resetRchAdsDaily();
  const t = RCH_TIERS[tierIdx];
  if(S.rchAds.claimed[tierIdx]){ toast('今日已领取'); return; }
  if(S.rchAds.watched[tierIdx] >= t.ads){ return; } // should show claim btn instead
  // 调用原生激励视频广告（浏览器环境自动降级为模拟模式）
  if(window.ChexingSDK){
    toast('正在加载广告...');
    window.ChexingSDK.showRewardAd().then(result => {
      if(result && result.success){
        S.rchAds.watched[tierIdx]++;
        toast(`观看广告完成 (${S.rchAds.watched[tierIdx]}/${t.ads})`);
        save(); renderRechargeModal();
      } else {
        toast('广告还在准备中，请稍后再试');
      }
    }).catch(() => {
      toast('广告加载失败，请稍后重试');
    });
  } else {
    // 无 SDK 时降级：演示模式（点击即视为看完）
    S.rchAds.watched[tierIdx]++;
    toast(`观看广告完成 (${S.rchAds.watched[tierIdx]}/${t.ads})`);
    save(); renderRechargeModal();
  }
}

function claimRecharge(tierIdx){
  resetRchAdsDaily();
  const t = RCH_TIERS[tierIdx];
  if(S.rchAds.claimed[tierIdx]){ toast('今日已领取'); return; }
  if(S.rchAds.watched[tierIdx] < t.ads){ toast(`还需观看 ${t.ads - S.rchAds.watched[tierIdx]} 个广告`); return; }
  S.rchAds.claimed[tierIdx] = true;
  S.beans += t.gold;
  if(S.fc) S.fc.recharged = true; // 标记已充值（满足首充条件）
  toast(`领取成功！+${t.gold.toLocaleString()} 黄金`);
  save(); updateHUD(); renderRechargeModal();
}

function renderRechargeModal(){
  resetRchAdsDaily();
  openModal(`
    <div class="rch-header"><span>充值</span></div>
    <div class="rch-body">
      <div class="rch-banner" data-action="open-firstcharge" style="cursor:pointer">
        <div class="rch-banner-text">新人福利<br>豪车免费送</div>
        <div class="rch-banner-car">${carImg(21,120,70)}</div>
      </div>
      <div class="rch-grid">
        ${RCH_TIERS.map((t, i) => {
          const w = S.rchAds.watched[i] || 0;
          const claimed = S.rchAds.claimed[i];
          const done = w >= t.ads;
          let btnHtml = '';
          let tierAction = '', tierData = '';
          if(claimed){
            btnHtml = `<button class="rch-btn rch-btn-done" disabled>已领取</button>`;
          } else if(done){
            btnHtml = `<button class="rch-btn rch-btn-claim">领取</button>`;
            tierAction = 'claim-recharge'; tierData = i;
          } else {
            btnHtml = `<button class="rch-btn rch-btn-ad">📺 ${w}/${t.ads}</button>`;
            tierAction = 'watch-ad'; tierData = i;
          }
          return `
            <div class="rch-tier"${tierAction ? ` data-action="${tierAction}" data-tier="${tierData}"` : ''}>
            <div class="rch-beans"><img class="rch-yuanbao" src="${BEAN_IC_SRC}" alt=""></div>
              <div class="rch-gold">${t.gold}</div>
              ${btnHtml}
            </div>`;
        }).join('')}
      </div>
      <div class="rch-note">每档每天仅可领取一次，观看广告累积进度</div>
    </div>
  `);
}

/* ==================== A06 好友车位（集成在主界面左侧面板） ==================== */
/* 已通过 refreshFspotGrid 实现 */

/* ==================== A07 员工信息 ==================== */
// 员工信息弹窗计时器引用（全局，方便 closeModal 时清理）
let _empInfoTimerIV = null;
function renderEmployeeInfo(eidx){
  const emp = S.employees[eidx]; if(!emp) return;
  const busy = emp.workEnd > now();
  const c = emp.workCarIid ? S.inst.find(i=>i.iid===emp.workCarIid) : null;
  const carData = c ? CAR_BY_ID[c.carId] : null;

  // 清理旧计时器
  if(_empInfoTimerIV){ clearInterval(_empInfoTimerIV); _empInfoTimerIV = null; }

  // 现任老板 / 最栽培Ta的老板 — 只要有数据就显示（不限于工作中）
  const showBoss = true;  // 始终显示老板信息区域
  // 查找现任老板：优先在好友列表中找；如果 hiredFrom 是玩家自己(uid)，则构造"自己"
  let curBoss = null;
  if(emp.hiredFrom){
    if(emp.hiredFrom === S.uid){
      curBoss = {uid: S.uid, name: S.name, isMe: true, avatar: S.avatar}; // 玩家自己招募的员工
    } else {
      curBoss = S.friends.find(f => f.uid === emp.hiredFrom);
    }
  }
  // 最栽培Ta的老板：查找雇佣次数最多的好友（优先），没有则用现任老板
  let topBoss = null;
  if(emp.topHirerUid){
    if(emp.topHirerUid === S.uid){
      topBoss = {uid: S.uid, name: S.name, isMe: true, avatar: S.avatar};
    } else {
      topBoss = S.friends.find(f => f.uid === emp.topHirerUid);
    }
  }
  if(!topBoss) topBoss = curBoss;  // fallback

  function bossAvatarHtml(fr){
    if(!fr) return `<span class="emp-avatar-ph" style="width:40px;height:40px;font-size:16px">${DEF_AVA}</span>`;
    return fr.avatar
      ? `<img src="${fr.avatar}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="emp-avatar-ph" style="width:40px;height:40px;font-size:16px;display:none">${DEF_AVA}</span>`
      : `<span class="emp-avatar-ph" style="width:40px;height:40px;font-size:16px">${DEF_AVA}</span>`;
  }
  const leftBossHtml = showBoss && curBoss
    ? `<div class="emp-boss-cell"><div class="emp-boss-avatar">${bossAvatarHtml(curBoss)}</div><div class="emp-boss-name">${curBoss.name}</div></div>`
    : `<div class="emp-boss-cell"><div class="emp-boss-empty">他还没有老板</div></div>`;
  const rightBossHtml = showBoss && topBoss
    ? `<div class="emp-boss-cell"><div class="emp-boss-avatar">${bossAvatarHtml(topBoss)}</div><div class="emp-boss-name">${topBoss.name}</div></div>`
    : `<div class="emp-boss-cell"><div class="emp-boss-empty">他还没有被雇佣过</div></div>`;

  openModal(`
    <div class="modal-title">员工信息</div>
    <div class="emp-panel">
      <!-- 头像 + 信息 -->
      <div class="emp-panel-top">
        <div class="emp-panel-left">
          <div class="emp-panel-avatar">${emp.avatar?`<img src="${emp.avatar}" onerror="this.style.display='none'">`:`<span class="emp-avatar-ph">${DEF_AVA}</span>`}</div>
          <div class="emp-panel-name">${emp.name}</div>
        </div>
        <div class="emp-panel-stats">
          <div class="emp-stat-row"><span class="emp-stat-icon">🏆</span><span class="emp-stat-label">身价:</span><span class="emp-stat-val">${f(emp.networth)}</span></div>
          <div class="emp-stat-row"><span class="emp-stat-icon">${BEAN_IC}</span><span class="emp-stat-label">加成:</span><span class="emp-stat-val">${(emp.bonus*100).toFixed(0)}%</span></div>
        </div>
      </div>
      ${busy ? `
        <!-- 用车工作中 -->
        <div class="emp-work-section">
          <div class="emp-work-title"><span class="emp-state-dot busy-dot"></span>用车工作中</div>
          <div class="emp-work-body">
            <div class="emp-work-car">
              ${carData ? ratingBadge(carData.rating) : ''}
              ${carData ? thumb(carData.id) : '<span class="emp-avatar-ph" style="width:60px;height:40px;border-radius:6px">?</span>'}
            </div>
            <div class="emp-work-info">
              <div class="emp-work-carname">工作：${carData ? colorName(carData.name) : '未知'}</div>
              <div class="emp-work-timer" id="emp-work-timer">--:--:--</div>
            </div>
            <button class="emp-recall-btn" data-action="recall-emp" data-eidx="${eidx}">立即召回</button>
          </div>
        </div>
      ` : `
        <!-- 空闲状态 + 操作按钮 -->
        <div class="emp-idle-section">
          <div class="emp-idle-banner"><span class="emp-state-dot idle-dot"></span>当前空闲</div>
          <div class="emp-panel-btns">
            <button class="emp-btn emp-btn-fire" data-action="fire-emp" data-eidx="${eidx}">解雇</button>
            <button class="emp-btn emp-btn-work" data-action="arrange-work" data-eidx="${eidx}">安排工作</button>
          </div>
        </div>
      `}
      <!-- 老板区域 -->
      <div class="emp-boss-row">
        <div class="emp-boss-cell-wrap">
          <div class="emp-boss-label">现任老板</div>
          ${leftBossHtml}
        </div>
        <div class="emp-boss-cell-wrap">
          <div class="emp-boss-label">最裁培Ta的老板</div>
          ${rightBossHtml}
        </div>
      </div>
    </div>
  `);

  // 启动计时器：每秒刷新倒计时（仅工作中）
  if(busy && emp.workEnd > now()){
    const timerEl = document.getElementById('emp-work-timer');
    if(timerEl){
      _empInfoTimerIV = setInterval(()=>{
        const emp2 = S.employees[eidx];
        if(!emp2 || emp2.workEnd <= now()){
          if(_empInfoTimerIV){ clearInterval(_empInfoTimerIV); _empInfoTimerIV = null; }
          timerEl.textContent = '00:00:00';
          return;
        }
        const rs = Math.floor((emp2.workEnd - now()) / 1000);
        if(rs <= 0){
          if(_empInfoTimerIV){ clearInterval(_empInfoTimerIV); _empInfoTimerIV = null; }
          timerEl.textContent = '00:00:00';
          return;
        }
        const rh = String(Math.floor(rs / 3600)).padStart(2,'0');
        const rm = String(Math.floor((rs % 3600) / 60)).padStart(2,'0');
        const rss = String(rs % 60).padStart(2,'0');
        timerEl.textContent = `${rh}:${rm}:${rss}`;
      }, 1000);
      // 立即执行一次
      const rs = Math.floor((emp.workEnd - now()) / 1000);
      const rh = String(Math.floor(rs / 3600)).padStart(2,'0');
      const rm = String(Math.floor((rs % 3600) / 60)).padStart(2,'0');
      const rss = String(rs % 60).padStart(2,'0');
      timerEl.textContent = `${rh}:${rm}:${rss}`;
    }
  }
}

/* ==================== A08 工作安排（选择车辆 + 转盘） ==================== */
// 效率倍率6档等概率 [0.5, 0.8, 1, 1.2, 1.5, 2]
const WORK_MULTIPLIERS = [0.5, 0.8, 1, 1.2, 1.5, 2];
// 转盘6段详细数据：倍率、颜色、中文标签
const WORK_SPIN_SEGMENTS = [
  { mult: 0.5, color: '#9ca3af', label: '豪气干云' },
  { mult: 0.8, color: '#22c55e', label: '有待提高' },
  { mult: 1.0, color: '#3b82f6', label: '中规中矩' },
  { mult: 1.2, color: '#ec4899', label: '兢兢业业' },
  { mult: 1.5, color: '#ef4444', label: '一气呵成' },
  { mult: 2.0, color: '#f97316', label: '器宇轩昂' },
];
function pickWorkMultiplier(){
  return WORK_MULTIPLIERS[Math.floor(Math.random() * WORK_MULTIPLIERS.length)];
}
/** 根据倍率获取段数据 */
function getWorkSegByMult(m){
  return WORK_SPIN_SEGMENTS.find(s => s.mult === m) || WORK_SPIN_SEGMENTS[2];
}

/**
 * 步骤1：选择车辆弹窗
 * 显示所有停在车位的车辆，每辆显示：图+评级+名称 | 加成/容量/工作时间 | 操作按钮
 */
function renderWorkArrange(eidx){
  const emp = S.employees[eidx]; if(!emp) return;
  // 所有停在车位的车辆（含已有员工工作的车——显示召回按钮）
  const spotCars = S.inst.filter(i => i.loc==='spot' && CAR_BY_ID[i.carId]).sort((a,b) => {
    // 排序：未安排工作 > 已安排工作（empIid 为空在前）
    const aHas = a.empIid ? 1 : 0, bHas = b.empIid ? 1 : 0;
    if(aHas !== bHas) return aHas - bHas;
    // 同组内按容量从高到低
    const capA = a.capacity || CAR_BY_ID[a.carId].capacity || 0;
    const capB = b.capacity || CAR_BY_ID[b.carId].capacity || 0;
    return capB - capA;
  });
  if(spotCars.length === 0){
    toast('没有可用的车辆，请先购买车辆并停入车位'); return;
  }
  const p = empEfficiency(emp.networth);

  let rowsHtml = '';
  spotCars.forEach(inst => {
    const c = CAR_BY_ID[inst.carId];
    const hasEmp = !!inst.empIid;
    // 工作时长 = 汽车满容量时间(容量值/每分钟收入)的1/3，向上取整到分钟后再转秒
    const workSec = Math.ceil((inst.capacity || c.capacity) / (inst.income || c.income) / 3) * 60;
    const workMin = Math.ceil(workSec / 60);
    // 当前车上员工提供的加成
    const carEmpBonus = hasEmp ? (S.employees.find(e=>e.iid===inst.empIid)?.bonus||0)*100 : 0;
    // 强化后的名称和属性
    const displayName = colorName(c.name) + (inst.enhanceLevel ? '+' + inst.enhanceLevel : '');
    const displayCap = inst.capacity || c.capacity;

    rowsHtml += `
      <div class="cs-car-row">
        <div class="cs-car-left">
          <div class="cs-car-img-wrap">
            ${ratingBadge(c.rating)}
            ${thumb(c.id) || `<span class="emp-avatar-ph" style="width:100%;height:100%;border-radius:6px">?</span>`}
          </div>
          <div class="cs-car-name">${displayName}</div>
        </div>
        <div class="cs-car-right">
          <div class="cs-data-row"><span class="cs-data-icon">${BEAN_IC}</span><span>加成：</span><b>${carEmpBonus > 0 ? carEmpBonus.toFixed(0) : (p*100).toFixed(1)}%</b></div>
          <div class="cs-data-row"><span class="cs-data-icon">📦</span><span>容量：</span><b>${f(displayCap)}</b></div>
          <div class="cs-data-row"><span class="cs-data-icon">🕐</span><span>时间：</span><b>${workMin}分钟</b></div>
          ${hasEmp
            ? `<button class="cs-btn cs-btn-recall" data-action="recall-emp-from-car" data-eidx="${eidx}" data-iid="${inst.iid}">立即召回</button>`
            : `<button class="cs-btn cs-btn-work" data-action="select-car-work" data-eidx="${eidx}" data-ciid="${inst.iid}">上车工作</button>`
          }
        </div>
      </div>`;
  });

  openModal(`
    <div class="modal-title-bar">
      <span class="modal-title-text">选择车辆</span>
      <span class="modal-close-x" data-action="close-modal">×</span>
    </div>
    <div class="cs-car-list">${rowsHtml}</div>
  `);
}

/**
 * 步骤2：转盘弹窗 — 选定车辆后弹出
 * 6段矩形围成圆形转盘，每段显示倍率(彩色)+中文标签
 * 等概率随机倍率，显示身价提升和收入提升
 */
let _pendingSpinEidx = null;
let _pendingSpinCiid = null;
let _spinResultSeg = null;  // 转盘停止后的落点段数据
function renderWorkSpinner(eidx, ciid){
  const emp = S.employees[eidx]; const inst = S.inst.find(i=>i.iid===ciid);
  if(!emp || !inst){ toast('数据异常'); return; }
  const c = CAR_BY_ID[inst.carId]; if(!c){ toast('车辆数据异常'); return; }

  const p = empEfficiency(emp.networth);
  const effCap = inst.capacity || c.capacity;
  const effInc = inst.income || c.income;
  const workSec = Math.ceil(effCap / effInc / 3) * 60;
  const workMin = Math.ceil(workSec / 60);

  // 预计算：先随机出倍率用于展示（实际确认时再roll一次）
  const previewMult = pickWorkMultiplier();
  const previewSeg = getWorkSegByMult(previewMult);
  const incomeBoost = p * previewMult * 100;
  const nwGain = Math.floor(effInc * p * workMin / 10);

  _pendingSpinEidx = eidx;
  _pendingSpinCiid = ciid;
  _spinResultSeg = previewSeg;

  // 构建6段转盘HTML — 使用与夺宝转盘相同的极坐标定位方式
  // 每段60°，段中心角（从12点方向顺时针）：0=底(180°), 1=左下(240°), 2=左上(300°), 3=顶(0°), 4=右上(60°), 5=右下(120°)
  const segCenterAngles = [180, 240, 300, 0, 60, 120];
  let labelsHtml = '';
  WORK_SPIN_SEGMENTS.forEach((seg, i) => {
    const midAngle = segCenterAngles[i];  // 段中心角度
    const rad = (midAngle - 90) * Math.PI / 180;  // 转为数学坐标（0°=3点方向）
    // 倍率数字位置（距中心58%）
    const mx = 50 + 44 * Math.cos(rad);
    const my = 50 + 44 * Math.sin(rad);
    // 标签文字位置（距中心40%）
    const lx = 50 + 30 * Math.cos(rad);
    const ly = 50 + 30 * Math.sin(rad);
    // 倍率数字
    labelsHtml += `<span style="position:absolute;left:${mx}%;top:${my}%;transform:translate(-50%,-50%) rotate(${midAngle}deg);font-size:20px;font-weight:900;font-style:italic;color:${seg.color};white-space:nowrap;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,.3),0 0 8px rgba(255,255,255,.2);filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${seg.mult.toFixed(1)}×</span>`;
    // 标签文字（深色药丸背景，同夺宝风格）
    labelsHtml += `<span style="position:absolute;left:${lx}%;top:${ly}%;transform:translate(-50%,-50%) rotate(${midAngle}deg);background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.5);box-shadow:0 1px 3px rgba(0,0,0,.25)">${seg.label}</span>`;
  });

  openModal(`
    <div class="modal-title-bar">
      <span class="modal-title-text">工作效率</span>
      <span class="modal-close-x" data-action="close-modal">×</span>
    </div>
    <div class="spin-result-area">
      <div class="wsw-outer">
        <div class="work-spin-wheel" id="workWheelWrap">
          ${labelsHtml}
        </div>
        <div class="ws-pointer"></div>
        <div class="ws-center">转</div>
      </div>
      <div class="ws-result-row" id="wsResultRow">
        <div class="ws-result-icon" id="wsResultIcon">
          <span class="ws-ri-mult">？</span>
          <span class="ws-ri-label">等待结果</span>
        </div>
        <div class="ws-result-info spin-stats">
          <div class="spin-stat-row"><span class="spin-stat-label">身价提升</span><b class="spin-stat-val">？</b></div>
          <div class="spin-stat-row"><span class="spin-stat-label">收入提升</span><b class="spin-stat-val">？</b></div>
        </div>
      </div>
    </div>
    <button class="gacha-spin spin-confirm-btn" data-action="confirm-spin">确定</button>
  `);

  // 自动播放转盘动画
  requestAnimationFrame(() => playWheelAnimation(previewMult));
}

/** 转盘动画：旋转整个段容器到目标倍率对应的段（与夺宝转盘完全一致的算法） */
function playWheelAnimation(targetMult){
  const wheel = $('#workWheelWrap');
  if(!wheel) return;
  const segIdx = WORK_MULTIPLIERS.indexOf(targetMult);
  if(segIdx < 0) return;

  // 6段均分，每段60°；段中心角从12点方向顺时针计算
  // 索引顺序：0底(0.5×)=180° → 1左下(0.8×)=240° → 2左上(1.0×)=300° → 3顶(1.2×)=0° → 4右上(1.5×)=60° → 5右下(2.0×)=120°
  const segCenterAngles = [180, 240, 300, 0, 60, 120];
  const targetAngle = segCenterAngles[segIdx];

  // 随机多转5-8圈 + 目标角度，然后逆时针旋转（与夺宝一致：负角度）
  const extraSpins = 5 + Math.floor(Math.random() * 4);
  const finalAngle = extraSpins * 360 + targetAngle;

  // 加 spinning 类禁用交互
  wheel.classList.add('spinning');
  wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  wheel.style.transform = `rotate(${-finalAngle}deg)`;

  // 动画结束后揭晓结果
  setTimeout(() => {
    wheel.classList.remove('spinning');
    const seg = getWorkSegByMult(targetMult);
    updateSpinResultIcon(seg);
    // 填充实际数值
    const p = empEfficiency(S.employees[_pendingSpinEidx]?.networth || 0);
    const inst = S.inst.find(i=>i.iid===_pendingSpinCiid);
    if(inst){
      const c = CAR_BY_ID[inst.carId];
      const effCap = inst.capacity || (c?c.capacity:1);
      const effInc = inst.income || (c?c.income:1);
      const workMin = Math.ceil(Math.ceil(effCap / effInc / 3) * 60 / 60);
      const incomeBoostVal = p * seg.mult * 100;
      const nwGainVal = Math.floor(effInc * p * workMin / 10);
      const infoEl = $('#wsResultRow .ws-result-info');
      if(infoEl){
        infoEl.innerHTML = `
          <div class="spin-stat-row"><span class="spin-stat-label">身价提升</span><b class="spin-stat-val">+${f(nwGainVal)}</b></div>
          <div class="spin-stat-row"><span class="spin-stat-label">收入提升</span><b class="spin-stat-val text-green">+${incomeBoostVal.toFixed(0)}%</b></div>
        `;
      }
    }
  }, 3600);
}

/** 更新结果区缩略图 */
function updateSpinResultIcon(seg){
  if(!seg) return;
  const icon = $('#wsResultIcon');
  if(!icon) return;
  icon.innerHTML = `<span class="ws-ri-mult" style="color:${seg.color}">${seg.mult.toFixed(1)}×</span><span class="ws-ri-label">${seg.label}</span>`;
}

/** 确认转盘结果，正式分配工作 */
function confirmSpin(){
  if(_pendingSpinEidx == null || _pendingSpinCiid == null) return;
  const eidx = _pendingSpinEidx; const ciid = _pendingSpinCiid;
  _pendingSpinEidx = null; _pendingSpinCiid = null;

  const emp = S.employees[eidx]; const inst = S.inst.find(i=>i.iid===ciid);
  if(!emp || !inst){ closeModal(); toast('数据异常'); return; }
  if(inst.empIid){ closeModal(); toast('该车辆已有员工在工作'); return; }

  const multiplier = pickWorkMultiplier();  // 正式roll
  const p = empEfficiency(emp.networth);
  const c = CAR_BY_ID[inst.carId];
  const effCap = inst.capacity || c.capacity;
  const effInc = inst.income || c.income;
  const workSec = Math.ceil(effCap / effInc / 3) * 60;
  const workMs = workSec * 1000;

  inst.empIid = emp.iid;
  inst.bonus = (inst.bonus||0) + p * multiplier;
  emp.workCarIid = ciid;
  emp.workEnd = now() + workMs;
  emp.lastMult = multiplier;

  // 身价提升
  const workMin = Math.ceil(workSec / 60);
  const nwGain = Math.floor(effInc * p * workMin / 10);
  if(nwGain > 0){
    emp.networth += nwGain;
    // 记录当前雇主对身价的贡献（用于"最栽培Ta的老板"）
    if(!emp.nwContributors) emp.nwContributors = {};
    const employerUid = emp.hiredFrom || S.uid;
    emp.nwContributors[employerUid] = (emp.nwContributors[employerUid] || 0) + nwGain;
    // 同步更新 topHirerUid 为贡献最大的老板
    let maxNw = 0, maxUid = employerUid;
    for(const [uid, total] of Object.entries(emp.nwContributors)){
      if(total > maxNw){ maxNw = total; maxUid = uid; }
    }
    emp.topHirerUid = maxUid;
  }

  toast(`${emp.name} 开始在 ${c.name} 工作！倍率 ×${multiplier.toFixed(1)}${nwGain > 0 ? ' 身价+' + f(nwGain) : ''}`);
  S.stats.workCount++;
  closeModal(); save(); updateHUD(); updateEmpbar();
  if(current==='home') refreshParkGrid();
}

/* ==================== A09 雇佣好友 ==================== */
function renderHireFriend(mode='hire'){
  const tabHire = mode==='hire'?'active':'';
  const tabPoach = mode==='poach'?'active':'';

  // 筛选可雇佣/挖角的好友
  let candidates = S.friends.filter(fr => {
    if(mode === 'hire') return !fr.employedBy;
    return !!fr.employedBy && fr.employedBy !== S.uid;
  });

  // 挖角模式：空闲 > 忙碌 排序（雇佣模式保持原序）
  if(mode === 'poach'){
    candidates.sort((a,b)=>{
      const aBusy = isFriendWorking(a);
      const bBusy = isFriendWorking(b);
      if(aBusy !== bBusy) return aBusy ? 1 : -1;  // 空闲在前
      return b.networth - a.networth;  // 同状态按身价降序
    });
  }

  let listHtml = '';
  candidates.forEach(fr => {
    const c = CAR_BY_ID[fr.bestCarId] || CAR_BY_ID[1];
    // 规范：雇佣费用=好友身价；挖角费用=ceil(身价*1.1)向上取整
    const cost = mode==='poach' ? Math.ceil(fr.networth * 1.1) : Math.floor(fr.networth);
    // 规范：达到日雇上限(4次)的好友无法被挖角/雇佣
    const dailyLimit = 4;
    if(fr.timesHiredToday >= dailyLimit){
      listHtml += `<div class="friend-hire-row"><div class="flex-1"><div class="fw-800 fs-13">${fr.name}</div><div class="fs-11 text-red">今日已被雇佣${fr.timesHiredToday}次，已达上限</div></div></div>`;
      return;
    }

    // 挖角模式检测忙碌状态
    const isBusy = mode === 'poach' && isFriendWorking(fr);

    listHtml += `<div class="friend-hire-row">
      <div class="fhr-avatar">${fr.avatar?`<img src="${fr.avatar}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="fhr-avatar-ph" style="display:none">${DEF_AVA}</span>`:`<span class="fhr-avatar-ph">${DEF_AVA}</span>`}</div>
      <div class="fhr-car-wrap">
        <div class="fhr-car-img-wrap">
          ${carImg(fr.bestCarId,70,40)}
          <span class="fhr-rating">${ratingBadge(c.rating)}</span>
        </div>
        <div class="fhr-info-col">
          <span class="fhr-name">${fr.name}</span>
          <div class="fhr-networth"><span class="fhr-nw-icon">🏆</span> ${f(fr.networth)}</div>
        </div>
      </div>
      <div class="fhr-action">
        ${isBusy ? '<span class="fhr-busy-tag">忙碌中</span>' : `<div class="fhr-cost">${DOLLAR_IC} ${f(cost)}</div>`}
        <button class="emp-action-btn ${isBusy?'btn-disabled':''}" data-action="${isBusy?'do-poach-busy':'do-hire'}" data-fruid="${fr.uid}" data-cost="${cost}" data-mode="${mode}">${mode==='hire'?'雇佣':'挖角'}</button>
      </div>
    </div>`;
  });
  openModal(`
    <div class="modal-title">${mode==='hire'?'雇佣好友':'挖角好友'}</div>
    <div class="hire-tabs">
      <div class="hire-tab ${tabHire}" data-action="hire-tab">雇佣</div>
      <div class="hire-tab ${tabPoach}" data-action="poach-tab">挖角</div>
    </div>
    <div style="max-height:300px;overflow-y:auto">${listHtml||'<div class="text-center text-mut p-8">暂无可'+(mode==='hire'?'雇佣':'挖角')+'的好友</div>'}</div>
    <button class="btn-ghost btn-wide mt-8" data-action="go-new-friends">添加好友</button>
  `);
}

// 检测好友是否在工作中（被其他玩家雇佣且未完成）
function isFriendWorking(fr){
  if(!fr.employedBy || fr.employedBy === S.uid) return false;
  // 遍历所有玩家的员工，找到该好友是否在工作
  // 简化判断：如果好友有 employedBy 且不是当前用户，视为可能忙碌
  // 实际应该检查对方员工的 workEnd
  return true;  // 挖角场景下非自己雇佣的都算可能忙碌
}

function doHire(fruid, cost, mode){
  const fr = S.friends.find(f=>f.uid===fruid); if(!fr) return;
  // 防重复雇佣：已被自身雇佣的好友直接拦截（核心防呆，避免同一目标被重复发起雇佣）
  if(fr.employedBy === S.uid){ toast(`「${fr.name}」已经是你的员工了`); return; }
  if(S.dollars < cost){ needDollars(); return; }
  if(S.employees.length >= S.empSlots){ toast('员工位已满'); return; }
  // 规范：用户一天最多被雇佣4次（按好友维度计数）
  const dailyLimit = 4;
  if((fr.timesHiredToday || 0) >= dailyLimit){
    toast(`${fr.name} 今日已被雇佣${fr.timesHiredToday}次，达到上限`); return;
  }
  // 挖角模式：好友工作中无法被挖角
  if(mode === 'poach' && isFriendWorking(fr)){
    toast('对方工作中，无法被挖角'); return;
  }
  const verb = mode==='poach'?'挖角':'雇佣';
  // 规范 A09：雇佣/挖角按钮 → 弹出二次确认界面
  ask(`确定花费 ${DOLLAR_IC}${f(cost)} ${verb} ${fr.name} 吗？`, ()=>{
    // 二次确认时再次检查（防止确认期间状态变化 / 同一目标被重复雇佣）
    if(fr.employedBy === S.uid){ toast(`「${fr.name}」已经是你的员工了`); return; }
    if(S.dollars < cost){ needDollars(); return; }
    if(S.employees.length >= S.empSlots){ toast('员工位已满'); return; }
    if((fr.timesHiredToday || 0) >= dailyLimit){ toast('已达今日雇佣上限'); return; }

    S.dollars -= cost;
    if(mode === 'poach') S.stats.poached++; else S.stats.hired++;

    // 记录好友被雇次数
    fr.timesHiredToday = (fr.timesHiredToday || 0) + 1;
    fr.lastHiredDay = todayStr();

    // 规范：挖角后该好友身价上升
    if(mode === 'poach'){
      fr.networth = Math.floor(fr.networth * 1.05);  // 挖角→身价提升5%
    }

    // 挖角/雇佣后默认空闲（workEnd=0）
    // hiredFrom = 雇主(当前玩家)的uid，不是被雇好友的uid
    const nw = Math.max(500, Math.floor(fr.networth * rnd(0.8, 1.2))); // 规范：初始身价最低保底500
    const newEmp = {
      iid: uid(), name: fr.name, avatar: '', networth: nw,
      bonus: empBonusFromNetworth(nw), workCarIid: null, workEnd: 0, hiredFrom: S.uid, topHirerUid: S.uid, lastMult: 1,
      nwContributors: { [S.uid]: 0 }  // 身价贡献追踪：{ uid: 总贡献值 }
    };
    S.employees.push(newEmp);
    fr.employedBy = S.uid;
    toast(`成功${verb} ${fr.name}！`);
    // 关闭雇佣弹窗 + 同步刷新车行页面（员工状态栏与车位视图），防止重复雇佣同一目标
    closeModal();
    if(current === 'home'){ refreshParkGrid(); refreshParkGrid2(); refreshFspotGrid(); }
    updateEmpbar(); updateHUD(); save();
    addMsg('system', `你${verb}了 ${fr.name} 为员工！`);
  });
}

/* ==================== A10 首充界面 ==================== */
async function renderFirstCharge(){
  // 打开时先从 SDK 拉取真实邀请数据（奖励发放的唯一依据）
  try { await syncInviteRewards(); } catch(e){ /* 忽略同步异常，使用本地已有数据 */ }

  const claimed = S.fc.claimed;
  const FC_ADS_NEED = 5;
  const FC_INVITE_NEED = 5;
  const adsDone = S.fc.adsWatched || 0;
  const inviteDone = S.fc.friendsInvited || 0;
  const adsFull = adsDone >= FC_ADS_NEED;
  const inviteFull = inviteDone >= FC_INVITE_NEED;
  const canClaim = !claimed && (S.fc.recharged || adsFull || inviteFull);
  const giftCar = CAR_BY_ID[21]; // 宝马I8质子红
  const fcData = D.firstCharge || {};
  const rewards = fcData.rewards || [];
  const myCode = ensureInviteCode();

  openModal(`
    <div class="fc-modal">
      <!-- 顶部标签 -->
      <div class="fc-tabs">
        <span class="fc-tab">观看广告</span>
        <span class="fc-tab-sep">或</span>
        <span class="fc-tab">邀请好友</span>
      </div>
      <!-- 主标题 -->
      <div class="fc-headline">
        即送价值<span class="fc-big-num">88888</span>黄金大礼
      </div>
      <!-- 车辆展示区 -->
      <div class="fc-showcase">
        <div class="fc-car-head">
          ${ratingBadge(giftCar.rating)}
          ${logoImg(giftCar.brand)}
          <span class="fc-car-name">${giftCar.name}</span>
        </div>
        <div class="fc-car-area">
          ${carImg(giftCar.id,220,130)}
          <div class="fc-car-stats">
            <div class="fc-stat-row"><span class="fc-stat-icon">${DOLLAR_IC}</span>价值：${f(giftCar.value)}</div>
            <div class="fc-stat-row"><span class="fc-stat-icon">${DOLLAR_IC}</span>收入：${giftCar.income}/分钟</div>
            <div class="fc-stat-row"><span class="fc-stat-icon">${DOLLAR_IC}</span>容量：${f(giftCar.capacity)}</div>
          </div>
        </div>
      </div>
      <!-- 新人福利 -->
      <div class="fc-reward-box">
        <div class="fc-reward-label">新人福利</div>
        <div class="fc-reward-items">
          <div class="fc-rwd-item">
            ${thumb(21)}
            <span class="fc-rwd-count">1</span>
          </div>
          <div class="fc-rwd-item"><img class="fc-rwd-gold" src="${BEAN_IC_SRC}"><span class="fc-rwd-count">1000</span></div>
          <div class="fc-rwd-item"><img class="fc-rwd-money" src="${DOLLAR_IC_SRC}"><span class="fc-rwd-count">10万</span></div>
        </div>
      </div>
      <!-- 底部按钮 -->
      <div class="fc-actions">
        ${claimed ? '' : canClaim ? '' : `
        <div class="fc-action-item">
          <button class="fc-btn ${adsFull?'fc-btn-done':'btn-primary'}" data-action="fc-watch-ad" ${adsFull?'disabled':''}>
            <span class="fc-btn-icon">📺</span> 观看广告
          </button>
          <div class="fc-btn-count">已观看：${adsDone}/${FC_ADS_NEED}</div>
        </div>
        <div class="fc-action-item">
          <button class="fc-btn ${inviteFull?'fc-btn-done':'btn-primary'}" data-action="fc-invite" ${inviteFull?'disabled':''}>
            邀请好友
          </button>
          <div class="fc-btn-count">已真实邀请：${inviteDone}/${FC_INVITE_NEED}（需好友通过链接注册）</div>
        </div>
        `}
      </div>
      <div class="fc-invite-code">我的邀请码：<b>${myCode}</b> <button class="fc-refresh-btn" data-action="refresh-invite">刷新进度</button></div>
      ${claimed ? `<button class="fc-claim-btn fc-claimed-btn" disabled>已领取</button>` : canClaim ? `<button class="fc-claim-btn btn-primary" data-action="claim-fc">领取</button>` : ''}
    </div>
  `);
}

function claimFC(){
  if(S.fc.claimed) return;
  S.fc.claimed = true;
  S.dollars += 100000; S.beans += 1000;
  // 赠送宝马I8
  const freeSpot = freeSpotIdx();
  if(freeSpot >= 0){
    S.inst.push(mk(21, 'spot', freeSpot));
  } else {
    S.inst.push(mk(21, 'garage'));
  }
  toast('🎉 首充奖励已领取！');
  SFX.play('success'); SFX.play('coin');
  closeModal(); save(); updateHUD();
  if(current==='home') refreshParkGrid();
  updateInfobar();
}

/* ==================== A11 名车之旅（任务） ==================== */
let questOpen = {}; // 已展开的章节
function renderQuests(){
  // 防御：确保关键字段存在（运行时被意外破坏时也能打开弹窗）
  if(!S.tasks || typeof S.tasks !== 'object') S.tasks = {};
  if(!S.questChapters || typeof S.questChapters !== 'object') S.questChapters = {};
  if(!S.stats || typeof S.stats !== 'object' || S.stats === null) S.stats = { hired:0, poached:0, workCount:0, shareCount:0, parkFriendCount:0, orderCount:0, ticketCount:0, inviteCount:0, earned:0 };
  if(!D.chapters){ openModal('<div class=\"q-header\"><span>名车之旅</span></div><div style=\"padding:20px;text-align:center;color:var(--mut)\">任务数据加载中...</div>'); return; }

  let html = '<div class="q-header"><span>名车之旅</span></div><div class="chapter-list">';
  D.chapters.forEach((ch, ci) => {
    const unlocked = assets() >= (ch.assetReq||0);
    const rewardCar = CAR_BY_ID[ch.rewardCar];
    const chClaimed = !!S.questChapters[ci];
    const isOpen = !!questOpen[ci];
    const tasks = ch.tasks||[];
    const doneCount = tasks.filter(t => taskEval(t).done).length;

    if(!unlocked){
      html += `<div class="ch-card ch-locked">
        <div class="ch-header-row">
          <div class="ch-body">
            <div class="ch-title-row">
              <span class="ch-name">第${ci+1}章 ${ch.name||''}</span>
            </div>
            <div class="ch-desc">${ch.desc||''}</div>
          </div>
          <div class="ch-reward-side" data-action="view-chapter-reward" data-ci="${ci}" style="cursor:pointer">
            <div class="ch-rwd-label">本章奖励</div>
            <div class="ch-rwd-car">${rewardCar?ratingBadge(rewardCar.rating)+'<div class="ch-rwd-img">'+thumb(rewardCar.id)+'</div>':'?'}</div>
            <div class="ch-rwd-status">任务进度${doneCount}/${tasks.length}</div>
          </div>
        </div>
        <div class="ch-lock-overlay">
          <div class="ch-lock-icon">🔒</div>
          <div class="ch-lock-text">资产达到${f(ch.assetReq||0)}解锁</div>
        </div>
      </div>`;
      return;
    }

    // 章节奖励状态
    const allDone = chapterAllDone(ci);
    let rwdStatusCls = '', rwdStatusText = '';
    if(chClaimed){ rwdStatusCls='rwd-done'; rwdStatusText='奖励已领取'; }
    else if(allDone){ rwdStatusCls='rwd-ready'; rwdStatusText='奖励可领取'; }
    else{ rwdStatusText=`任务进度${doneCount}/${tasks.length}`; }

    // 章节内是否有可领取的任务（用于显示章节级红点）
    const hasClaimableInChapter = tasks.some(t => {
      const ev = taskEval(t);
      return ev.done && !S.tasks[taskKey(ci, t.no)];
    });

    html += `<div class="ch-card ${isOpen?'ch-open':''}">
      <div class="ch-header-row">
        <div class="ch-body" data-action="toggle-chapter" data-ci="${ci}">
          ${hasClaimableInChapter ? '<span class="ch-chapter-rdot"></span>' : ''}
          <div class="ch-title-row">
            <span class="ch-name">第${ci+1}章 ${ch.name||''}</span>
          </div>
          <div class="ch-desc">${ch.desc||''}</div>
          <div class="ch-arrow">${isOpen?'▲':'▼'}</div>
        </div>
        <div class="ch-reward-side ${rwdStatusCls}" data-action="view-chapter-reward" data-ci="${ci}" style="cursor:pointer">
          <div class="ch-rwd-label">本章奖励</div>
          <div class="ch-rwd-car">${rewardCar?ratingBadge(rewardCar.rating)+'<div class="ch-rwd-img">'+thumb(rewardCar.id)+'</div>':'?'}</div>
          <div class="ch-rwd-status">${rwdStatusText}</div>
        </div>
      </div>
      ${isOpen?`<div class="ch-tasks">${tasks.map(t=>{
        const ev = taskEval(t);
        const tkey = taskKey(ci, t.no);
        const claimed = !!S.tasks[tkey];
        let btnHtml;
        if(claimed) btnHtml = `<button class="ch-task-btn done" disabled>已领取</button>`;
        else if(ev.done) btnHtml = `<button class="ch-task-btn claim" data-action="claim-task" data-ci="${ci}" data-no="${t.no}">领取</button>`;
        else {
          // 分享类任务：前往直接调 TapTap SDK 分享；其余任务：前往跳回主页
          const goAction = /分享/.test(t.text||'') ? 'quest-share' : 'go-home';
          btnHtml = `<button class="ch-task-btn go" data-action="${goAction}">前往</button>`;
        }
        return `<div class="ch-task-row${ev.done&&!claimed?' ch-task-claimable':''}">
          ${ev.done&&!claimed?'<span class="ch-task-rdot"></span>':''}
          <div class="ch-task-left">
            <div class="ch-task-text">${t.text||''} (${Math.min(ev.cur,ev.target)}/${ev.target})</div>
            <div class="ch-task-reward">奖励：${DOLLAR_IC} ${t.reward||0}</div>
          </div>${btnHtml}
        </div>`;
      }).join('')}</div>`:''}
    </div>`;
  });
  html += '</div>';
  openModal(html);
}

// 领取单个任务奖励（需条件达成）
function claimTask(ci, no){
  const ch = D.chapters[ci]; if(!ch) return;
  const t = (ch.tasks||[]).find(x=>x.no===no); if(!t) return;
  const key = taskKey(ci, no);
  if(S.tasks[key]){ toast('该任务奖励已领取'); return; }
  if(!taskEval(t).done){ toast('任务条件尚未达成，无法领取'); return; }
  S.tasks[key] = true;
  if(t.reward) S.dollars += t.reward;
  SFX.play('success'); SFX.play('coin');
  toast(`任务完成！+${DOLLAR_IC}${f(t.reward||0)} 刀乐`);
  save(); updateHUD(); renderQuests();
}

// 领取章节奖励（需整章任务全部完成）
function claimChapter(ci){
  const ch = D.chapters[ci]; if(!ch) return;
  if(S.questChapters[ci]){ toast('章节奖励已领取'); return; }
  if(!chapterAllDone(ci)){ toast('请先完成本章全部任务'); return; }
  const car = CAR_BY_ID[ch.rewardCar];
  S.questChapters[ci] = true;
  SFX.play('success');
  save(); updateHUD();
  if(!car){
    toast('章节奖励已领取');
  } else {
    // 先刷新名车之旅界面（renderQuests 会以弹窗形式重绘），再弹出“获取车辆”弹窗置于最上层，避免被覆盖
    renderQuests();
    showCarGet(car); // 弹出“获取车辆”弹窗（同淘车订购：含新车入库/重复强化）
  }
  if(current==='home') refreshParkGrid();
}

// 点击"本章奖励"区域：可领取时领取，未达成时弹出图鉴样式车辆详情（二级弹窗，不关闭章节面板）
function viewChapterReward(ci){
  const ch = D.chapters[ci]; if(!ch) return;
  const car = CAR_BY_ID[ch.rewardCar];
  if(!car){ toast('暂无可预览的车辆'); return; }
  if(!S.questChapters[ci] && chapterAllDone(ci)){
    claimChapter(ci); // 已整章完成且未领取 → 直接领取
  } else {
    // 二级弹窗：在章节面板之上叠加车辆信息弹窗
    showCarInfoOverlay(car.id);
  }
}

/** 二级弹窗：车辆信息（叠加在当前模态框之上，关闭后回到下层） */
function showCarInfoOverlay(carId){
  const c = CAR_BY_ID[carId]; if(!c) return;
  const val = c.value, inc = c.income, cap = c.capacity;

  // 创建遮罩层 + 内容层，插入到 #modal 内
  const modal = $('#modal');
  if(!modal) return;

  // 移除已有的二级弹窗（防重复）
  const old = modal.querySelector('.car-info-overlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'car-info-overlay';
  overlay.innerHTML = `
    <div class="cio-backdrop" data-action="close-car-overlay"></div>
    <div class="cio-wrap">
      <div class="cio-close-x" data-action="close-car-overlay">×</div>
      <div class="cio-img-wrap">
        <div class="cio-rating">${ratingBadge(c.rating)}</div>
        ${carImg(carId,200,126)}
      </div>
      <div class="cio-name-row">
        ${logoImg(c.brand)}
        <span class="cio-name">${c.name}</span>
      </div>
      <div class="cio-attrs">
        <div class="cg-attr"><span class="cg-attr-label">价值：</span><b>${f(val)}</b></div>
        <div class="cg-attr"><span class="cg-attr-label">收入：</span><b>${f(inc)}/分钟</b></div>
        <div class="cg-attr"><span class="cg-attr-label">容量：</span><b>${f(cap)}</b></div>
      </div>
      <button class="cg-btn cg-btn-ok cio-confirm-btn" data-action="close-car-overlay">确定</button>
    </div>
  `;
  modal.appendChild(overlay);
  // 入场动画
  requestAnimationFrame(() => overlay.classList.add('cio-visible'));
}

/* ==================== A12 七日登陆 ==================== */
function renderSevenDay(){
  const rewards = D.sevenDay; // 从配置表读取
  const todayStreak = S.seven.streak;
  const allClaimed = S.seven.claimed.length >= 7;

  // 一轮完成：显示完成状态并提供重新开始
  if(allClaimed){
    let html = '<div class="sd-header"><span>七日登陆</span></div>';
    html += '<div class="sd-subtitle">🎉 恭喜完成本轮七日签到！</div>';
    html += '<div class="sd-grid">';
    for(let i=0;i<6;i++){
      const r = rewards[i];
      html += `<div class="sd-day sd-claimed"><div class="sd-day-label">第${i+1}天</div><div class="sd-day-icon">${r.type==='dollars'?DOLLAR_IC:'⚡'}</div><div class="sd-day-amount">${r.label}</div><div class="sd-stamp">已领取</div></div>`;
    }
    html += `<div class="sd-day7 sd-claimed" style="grid-column:span 3"><div class="sd-day7-label">第7天</div><div class="sd-day7-icon">🎉</div><div class="sd-stamp sd-stamp-d7">已领取</div></div>`;
    html += '</div>';
    html += `<button class="btn-primary" data-action="reset-seven" style="margin-top:10px;width:100%">开始新一轮签到</button>`;
    openModal(html);
    return;
  }

  let html = '<div class="sd-header"><span>七日登陆</span></div>';
  html += '<div class="sd-subtitle">需要七天连续签到<br>如果断签就要重来咯</div>';
  html += '<div class="sd-grid">';
  // Days 1-6 in 3x2 grid
  for(let i=0;i<6;i++){
    const r = rewards[i];
    const dayNum = i + 1;
    const claimed = S.seven.claimed.includes(dayNum);
    // 今天可领：streak+1 恰好等于当天（即连续登录到了该天的前一天），且未领取，且今天还未领过任何奖励
    const isToday = (todayStreak + 1) === dayNum;
    const canClaim = isToday && !claimed && S.seven.lastClaimDate !== localToday();
    const cls = 'sd-day' + (claimed ? ' sd-claimed' : '') + (isToday && !claimed && S.seven.lastClaimDate !== localToday() ? ' sd-today' : '');
    const actionAttr = canClaim ? `data-action="claim-seven" data-day="${dayNum}" style="cursor:pointer"` : '';
    let iconHtml = r.type==='dollars' ? DOLLAR_IC : (r.type==='stamina' ? '🎡' : '🚗');
    html += `<div class="${cls}" ${actionAttr}>
      <div class="sd-day-label">第${dayNum}天${canClaim?'<span class="sd-today-tag">今天</span>':''}</div>
      <div class="sd-day-icon">${iconHtml}</div>
      <div class="sd-day-amount">${r.label}</div>
      <div class="sd-day-type">${r.type==='dollars'?'刀乐':r.type==='stamina'?'夺宝次数':'车辆'}</div>
      ${claimed?'<div class="sd-stamp">已领取</div>':''}
    </div>`;
  }
  // Day 7 special
  const d7 = rewards[6];
  const d7claimed = S.seven.claimed.includes(7);
  const isD7today = (todayStreak + 1) === 7;
  const canD7claim = isD7today && !d7claimed && S.seven.lastClaimDate !== localToday();
  const d7cls = 'sd-day7' + (d7claimed?' sd-claimed':'') + (isD7today&&!d7claimed&&S.seven.lastClaimDate!==localToday()?' sd-today':'');
  const d7action = canD7claim ? `data-action="claim-seven" data-day="7" style="cursor:pointer"` : '';
  const d7icon = d7claimed ? '🎉' : (isD7today ? '🎁' : '?');
  html += `<div class="${d7cls}" ${d7action} style="grid-column:span 3">
    <div class="sd-day7-label">第7天${canD7claim?'<span class="sd-today-tag">今天</span>':''}</div>
    <div class="sd-day7-icon">${d7icon}</div>
    <div class="sd-day7-type">${d7.label}</div>
    ${d7claimed?'<div class="sd-stamp sd-stamp-d7">已领取</div>':''}
  </div>`;
  html += '</div>';
  openModal(html);
}

function claimSevenDay(day){
  if(S.seven.claimed.includes(day)){ toast('已领取过'); return }
  // 每个自然日只能领取一次
  if(S.seven.lastClaimDate === localToday()){ toast('今天已经领取过了，明天再来吧'); return }
  const r = D.sevenDay[day-1];
  if(!r){ toast('数据异常'); return; }
  let openedCarGet = false;
  if(r.type === 'car'){
    // 第7天：随机D-A车，概率=价值越低概率越高（反比权重）
    // 规则：每辆车权重 w = 1/value, 总权重 B = sum(w), 概率 = w/B
    const dACars = CAR.filter(c=>['D','C','B','A'].includes(c.rating));
    if(dACars.length === 0){ toast('数据异常：无D-A车辆'); return; }
    const weights = dACars.map(c => ({ c, w: 1 / (c.value || 1) }));
    const totalW = weights.reduce((s, item) => s + item.w, 0);
    let roll = Math.random() * totalW;
    let selectedCar = weights[0].c;
    for(const item of weights){
      roll -= item.w;
      if(roll <= 0){ selectedCar = item.c; break; }
    }
    showCarGet(selectedCar); // 弹出“获取车辆”弹窗（同淘车订购：含新车入库/重复强化）
    openedCarGet = true;
  } else if(r.type === 'dollars'){
    S.dollars += r.amount;
    toast(`🎉 第${day}天 领取 ${f(r.amount)} 刀乐！`);
  } else if(r.type === 'stamina'){
    gainGachaStamina(r.amount);
    toast(`🎉 第${day}天 领取 ${r.amount} 次夺宝！`);
  } else if(r.type === 'beans'){
    S.beans += r.amount;
    toast(`🎉 第${day}天 领取 ${fbean(r.amount)} 黄金！`);
  }
  S.seven.claimed.push(day);
  S.seven.streak = day;
  S.seven.lastClaimDate = localToday();
  // 第7天领完后自动重置（连续登陆7天后重新回到第一天）
  if(day >= 7 && S.seven.claimed.length >= 7){
    S.seven.streak = 0;
    S.seven.claimed = [];
  }
  if(!openedCarGet) closeModal(); // 车辆奖励已弹出获取弹窗，不关闭
  save(); updateHUD();
  if(current==='home') refreshParkGrid();
}

// 重置七日签到（手动开始新一轮）
function resetSevenDay(){
  S.seven.streak = 0;
  S.seven.claimed = [];
  save();
  renderSevenDay();
}

/* ==================== A13 车库界面 ==================== */
let garageTab = 'garage';
function renderGarage(){
  const sc = $('#screen'); if(sc){
    garageTab = 'garage';
    sc.innerHTML = `
      <div class="gg-tabs">
        <div class="gg-tab ${garageTab==='garage'?'active':''}" data-action="switch-gtab" data-gtab="garage">车库</div>
        <div class="gg-tab ${garageTab==='gallery'?'active':''}" data-action="switch-gtab" data-gtab="gallery">图鉴</div>
      </div>
      <div class="gg-stats"><span>拥有车辆：${S.inst.length}</span><span>${ASSET_IC} 资产：${f(assets())}</span></div>
      <div id="garageContent"></div>
    `;
    renderGarageTab();
  } else {
    openModal(`<div class="gg-modal-header">车库 & 图鉴</div><div id="garageContent"></div>`);
    renderGarageTab();
  }
}
function renderGarageTab(){
  const gc = $('#garageContent'); if(!gc) return;
  if(garageTab === 'gallery'){ renderGalleryTab(); return; }
  gc.innerHTML = `<div class="gg-grid">
    ${[...S.inst].sort((a,b)=>{
      const aPark = (a.loc==='spot'||a.atFriend)?1:0;
      const bPark = (b.loc==='spot'||b.atFriend)?1:0;
      if(aPark!==bPark) return bPark-aPark;          // 停车(产出中) > 闲置
      return incomeOf(b)-incomeOf(a);               // 收入高 > 收入低
    }).map(inst => {
      const c = CAR_BY_ID[inst.carId]; if(!c) return '';
      let statusCls='', statusTxt='', statusIcon='';
      if(inst.loc==='spot'){ statusCls='gg-st-park'; statusTxt='停车中'; statusIcon='🅿️'; }
      else if(inst.loc==='garage'){ statusCls='gg-st-idle'; statusTxt='闲置中'; statusIcon='🏠'; }
      else if(inst.atFriend){ statusCls='gg-st-friend'; statusTxt=`在好友家`; statusIcon='🅿️'; }
      const inc = incomeOf(inst);
      const cap = capOf(inst);
      // 图片区左上角图标：统一使用品牌LOGO
      const imgCornerIcon = `<span class="gg-img-corner gg-img-corner-logo">${logoImg(c.brand)}</span>`;
      // 工作员工信息（叠加在车图左下角）
      let garageEmpInfo = '';
      // 主路径：通过 inst.empIid 查找
      let gemp = inst.empIid ? S.employees.find(e => e.iid === inst.empIid) : null;
      // 兜底路径：empIid 丢失时，通过员工的 workCarIid 反向查找
      if(!gemp && inst.iid){
        gemp = S.employees.find(e => e.workCarIid === inst.iid && e.workEnd > 0);
        if(gemp) inst.empIid = gemp.iid; // 自动修复 empIid
      }
      if(gemp && gemp.workEnd > now()){
          const geidx = S.employees.indexOf(gemp);
          const busy = true;
          garageEmpInfo = `<div class="gg-card-emp-wrap ${busy?'busy':'idle'}" data-action="emp-info" data-eidx="${geidx}" title="${gemp.name}${busy?' 工作中':''}">${renderEmpAvatar(gemp, 26)}<span class="gg-card-emp-name">${gemp.name}</span></div>`;
      }
      // 好友家车辆信息
      const friendInfo = inst.atFriend ? (() => {
        const fr = S.friends.find(f => f.uid === inst.atFriend);
        if(!fr) return '';
        const earned = Math.floor(inst.accrued || 0);
        const pct = Math.min(100, cap > 0 ? earned / cap * 100 : 0);
        const isFull = earned >= cap;
        // 好友头像：统一用默认头像（同主界面）
        return `<div class="gg-friend-info clickable" data-action="visit-friend-home" data-friend-uid="${fr.uid}">
          <div class="gg-fi-avatar">${DEF_AVA}</div>
          <div class="gg-fi-right">
            <div class="gg-fi-name">在 ${fr.name||'??'}家</div>
            <div class="gg-fi-bar-wrap">
              <div class="gg-fi-bar ${isFull?'gg-fi-full':'gg-fi-notfull'}"><div class="gg-fi-fill" style="width:${pct}%"></div></div>
              <div class="gg-fi-val">${f(earned)}/${f(cap)}</div>
            </div>
          </div>
        </div>`;
      })() : '';
      // 操作按钮
      let actionBtn = '';
      if(inst.loc==='garage') actionBtn = `<button class="gg-btn" data-action="deploy-car" data-iid="${inst.iid}">出车</button>`;
      else if(inst.loc==='spot') actionBtn = `<button class="gg-btn" data-action="recall-car" data-iid="${inst.iid}">收回车库</button>`;
      else if(inst.atFriend) actionBtn = `<button class="gg-btn" data-action="recall-from-friend" data-iid="${inst.iid}">取回车辆</button>`;
      return `<div class="gg-card gg-card-clickable" data-action="view-garage-car" data-iid="${inst.iid}">
        <!-- 头部行：评级徽章 + 车名 -->
        <div class="gg-card-head">
          ${ratingBadge(c.rating)}
          <span class="gg-card-name">${c.name}${inst.enhanceLevel?`<span class="pc-enhance">+${inst.enhanceLevel}</span>`:''}</span>
        </div>
        <!-- 图片区域：左上角图标 + 车图 + ���下角状态标签 -->
        <div class="gg-card-img">
          ${imgCornerIcon}
          ${thumb(c.id)}
          <span class="gg-card-status ${statusCls}">${statusIcon}${statusTxt}</span>
          ${garageEmpInfo ? `<div class="gg-card-emp-overlay">${garageEmpInfo}</div>` : ''}
        </div>
        <!-- 统计数据（非好友家车辆） -->
        ${inst.atFriend ? '' : `<div class="gg-card-stats">
          <div class="gg-stat-row"><span class="gg-stat-ic">📥</span><span>收入：</span><b>${f(inc)}/分钟</b></div>
          <div class="gg-stat-row"><span class="gg-stat-ic">📦</span><span>容量：</span><b>${f(cap)}</b></div>
        </div>`}
        <!-- 好友家车辆信息（替代统计） -->
        ${friendInfo}
        <!-- 操作按钮 -->
        ${actionBtn}
      </div>`;
    }).join('')}
    <!-- 空车位卡片 -->
    <div class="gg-card gg-card-empty" data-action="open-market">
      <div class="gg-empty-plus">+</div>
      <div class="gg-empty-txt">点击获取新车</div>
    </div>
  </div>`;
}
function renderGalleryTab(){
  const gc = $('#garageContent'); if(!gc) return;
  const galleries = D.galleries || [];
  if(!galleries.length){ gc.innerHTML = '<div class="text-center text-mut p-8">暂无图鉴数据</div>'; return; }
  const totalCars = CAR.length;
  const ownedCars = S.inst.length;
  // 计算总收集数（去重车辆ID）
  const ownedIds = new Set(S.inst.map(i=>i.carId));
  const totalUnique = CAR.length;
  const ownedUnique = ownedIds.size;

  let h = `<div class="gg-progress-bar"><div class="gg-progress-fill" style="width:${totalUnique>0?(ownedUnique/totalUnique*100):0}%"></div><span class="gg-progress-text">车辆收集进度：${ownedUnique}/${totalUnique}</span></div>`;
  // 预计算每组状态，再排序：可领奖 > 未收集齐 > 已领奖；同状态按收集奖励黄金从低到高
  const galItems = galleries.map((gal, gi) => {
    const carIds = gal.carIds || gal.members || [];
    const ownedInGal = carIds.filter(cid => ownedIds.has(cid)).length;
    const total = carIds.length;
    const complete = total > 0 && ownedInGal >= total;
    const galId = gal.id || gi;
    const galReward = gal.reward || (gi===0?30000:gi===1?20000:10000);
    const claimed = !!S.gallery[galId];
    let status;
    if(complete && !claimed) status = 0;        // 可领奖
    else if(!complete) status = 1;              // 未收集齐
    else status = 2;                            // 已领奖
    return { gal, galId, carIds, total, complete, galReward, claimed, status };
  });
  galItems.sort((a, b) => {
    if(a.status !== b.status) return a.status - b.status;  // 状态优先级
    return a.galReward - b.galReward;                      // 同状态：奖励黄金从低到高
  });

  galItems.forEach(({ gal, galId, carIds, total, complete, galReward, claimed }) => {
    h += `<div class="gg-gal-group">
      <div class="gg-gal-head">
        <span class="gg-gal-name">${gal.name}</span>
        <span class="gg-gal-name">收集奖励</span>
      </div>
      <div class="gg-gal-body">
        <!-- 左侧：车辆网格 -->
        <div class="gg-gal-cars">
          ${carIds.map(cid => {
            const owned = ownedIds.has(cid);
            const c = CAR_BY_ID[cid];
            return `<div class="gg-gal-car ${owned?'':'gg-gal-lock'}" data-action="view-gallery-car" data-cid="${cid}">
              ${c?ratingBadge(c.rating):ratingBadge('D')}
              <div class="gg-gal-thumb">${thumb(cid)}</div>
              ${!owned?'<div class="gg-gal-mask"></div>':''}
            </div>`;
          }).join('')}
        </div>
        <!-- 右侧：收集奖励区 -->
        <div class="gg-gal-reward">
          <div class="gg-gal-rwd-amount">${galReward}</div>
          <div class="gg-gal-rwd-icon">${BEAN_IC}</div>
          ${complete&&!claimed?`<button class="gg-gal-btn gg-gal-btn-ok" data-action="claim-gallery" data-gid="${galId}">领取奖励</button>`:
            complete&&claimed?`<span class="gg-gal-done">已领取</span>`:
            `<button class="gg-gal-btn gg-gal-btn-dis" disabled>领取奖励</button>`}
        </div>
      </div>
    </div>`;
  });
  gc.innerHTML = h;
}

/* ==================== A14 市场 ==================== */
function renderMarket(){
  marketTab = 'taoche';
  const sc = $('#screen'); if(sc){
    sc.innerHTML = `
      <div class="market-tabs">
        <div class="market-tab ${marketTab==='taoche'?'active':''}" data-action="switch-mtab" data-mtab="taoche">淘车</div>
        <div class="market-tab ${marketTab==='order'?'active':''}" data-action="switch-mtab" data-mtab="order">订购</div>
      </div>
      <div id="marketContent"></div>
    `;
  } else {
    openModal(`<div class="gg-modal-header">市场</div><div id="marketContent"></div>`);
  }
  renderMarketTab();
}
let marketTab = 'taoche';
function renderMarketTab(){
  const mc = $('#marketContent'); if(!mc) return;
  if(marketTab === 'taoche') renderTaoche(mc);
  else renderOrder(mc);
}
function renderTaoche(container){
  const tiers = S.taoche || initTaocheState();
  let h = '<div class="mk-tc-list">';
  tiers.forEach((t, ti) => {
    const locked = assets() < t.minAsset;
    const pool = CAR.filter(c => t.ratings.includes(c.rating));
    const showCar = pool.reduce((a,c)=>c.value>a?c:a, pool[0]);
    const cost = getTaochePrice(t);
    h += `<div class="mk-tc-row ${locked?'mk-locked':''}">
      <div class="mk-tc-body">
        <div class="mk-tc-city mk-tc-tier-${ti}">${t.name}</div>
        <div class="mk-tc-main">
          <div class="mk-tc-img">${showCar?thumb(showCar.id):''}</div>
          <div class="mk-tc-desc">${t.desc}</div>
        </div>
      </div>
      <div class="mk-tc-side">
        <div class="mk-tc-cost"><span class="mk-cost-icon">${DOLLAR_IC}</span><b>${f(cost)}</b></div>
        <button class="mk-btn" ${locked?'disabled':''} data-action="taoche-buy" data-ti="${ti}">淘车</button>
      </div>
      ${locked?`<div class="mk-lock-overlay">
        <div class="mk-lock-icon">🔒</div>
        <div class="mk-lock-text">资产达到${f(t.minAsset)}解锁</div>
      </div>`:''}
    </div>`;
  });
  h += '</div>';
  container.innerHTML = h;
}

/* ---------- 淘车价格计算 ---------- */
// 1.95^n 常量
const TAOCHE_PRICE_MUL = 1.95;
function getTaochePrice(tier){
  if(tier.count === 0) return tier.basePrice;
  const capExp = 6;   // 1.95^6 后封顶
  const linearAddExp = 4; // 封顶后每次加 basePrice * 1.95^4
  const capMultiplier = Math.pow(TAOCHE_PRICE_MUL, capExp);
  const linearAdd = tier.basePrice * Math.pow(TAOCHE_PRICE_MUL, linearAddExp);
  if(tier.count <= capExp){
    // 递增阶段：base * 1.95^count
    return Math.floor(tier.basePrice * Math.pow(TAOCHE_PRICE_MUL, tier.count));
  } else {
    // 线性阶段：cap + (count - cap) * linearAdd
    const capped = Math.floor(tier.basePrice * capMultiplier);
    return Math.floor(capped + (tier.count - capExp) * linearAdd);
  }
}
function getNextTaochePrice(tier){
  // 模拟下一次购买后的价格
  const mock = {...tier, count: tier.count + 1};
  return getTaochePrice(mock);
}

/* ---------- 淘车概率公式（规范） ---------- */
/*
 * 当前奖池车辆总价值 A
 * 当前车价值为 n → 权重 = A / n
 * 所有权重之和 B
 * 抽中该车概率 = (A/n) / B * 100%
 *
 * 保护机制：每被购买1次，该车用于计算权重的价值提升50%（即有效value *= 1.5）
 */
function taocheDraw(tierIdx){
  const tier = S.taoche[tierIdx];
  if(!tier) return null;
  const pool = CAR.filter(c => tier.ratings.includes(c.rating));
  if(!pool.length) return null;

  // 前5次不重复：排除已购车辆
  const noRepeatLimit = 5;
  let availablePool = pool;
  if(tier.history.length < noRepeatLimit){
    const excludeIds = new Set(tier.history);
    availablePool = pool.filter(c => !excludeIds.has(c.id));
    if(!availablePool.length) availablePool = pool; // 池子不够大时放回重复
  }

  // 计算总价值 A
  const totalValue = availablePool.reduce((s,c) => s + c.value, 0);
  if(totalValue <= 0) return availablePool[0];

  // 计算权重：weight_i = A / effectiveValue_i
  // 保护机制：effectiveValue = baseValue * (1.5 ^ protectionCount)
  const weights = availablePool.map(c => {
    const protCount = (tier.protection[c.id] || 0);
    const effectiveValue = c.value * Math.pow(1.5, protCount);
    return { car: c, weight: totalValue / effectiveValue };
  });

  // 总权重 B
  const totalWeight = weights.reduce((s,w) => s + w.weight, 0);
  if(totalWeight <= 0) return availablePool[0];

  // 按权重随机抽取
  let rndVal = Math.random() * totalWeight;
  for(const w of weights){
    rndVal -= w.weight;
    if(rndVal <= 0) return w.car;
  }
  return weights[weights.length-1].car;
}

function taocheBuy(ti){
  const tier = S.taoche[ti];
  if(!tier) return;
  if(assets() < tier.minAsset){ toast(`需要 ${f(tier.minAsset)} 资产解锁${tier.name}`); return; }
  const cost = getTaochePrice(tier);
  if(S.dollars < cost){ needDollars(); return; }

  S.dollars -= cost;
  tier.count++;

  // 概率抽车
  const car = taocheDraw(ti);
  if(!car){ toast('抽车失败'); save(); updateHUD(); renderMarketTab(); return; }

  // 记录历史（前5次不重复）
  tier.history.push(car.id);
  // 保护机制：该车权重+50%（即下次有效价值*1.5）
  tier.protection[car.id] = (tier.protection[car.id] || 0) + 1;

  toast(`🎊 在【${tier.name}】淘到 ${car.name}！花费 ${DOLLAR_IC}${f(cost)}`);
  showCarGet(car);
  // 刷新市场界面（showCarGet会打开弹窗，关闭后需刷新）
  setTimeout(()=>{ if(current==='market') renderMarketTab(); }, 100);
}
function renderOrder(container){
  checkOrderRefresh();
  const order = S.order || { purchased: [], protection: {}, displayCars: {} };
  if(!order.displayCars) order.displayCars = {};  // 旧存档兼容：displayCars 字段可能不存在
  if(!order.protection) order.protection = {};     // 旧存档兼容：protection 字段可能不存在
  const slotDefs = [
    { rating: 'D', count: 1 },
    { rating: 'C', count: 2 },
    { rating: 'B', count: 2 },
    { rating: 'AS', count: 1 },
  ];

  // 先收集所有卡片数据，再排序：可订购 > 未解锁 > 已订购
  const cards = [];
  let globalSlotIdx = 0;
  slotDefs.forEach(def => {
    const isAS = def.rating === 'AS';
    const cars = isAS
      ? CAR.filter(c => (c.rating === 'A' || c.rating === 'S') && c.orderPrice)
      : CAR.filter(c => c.rating === def.rating && c.orderPrice);
    const rLabel = isAS ? (cars.length && cars[0].rating) : def.rating;

    for(let i=0; i<def.count; i++){
      const si = globalSlotIdx++;
      const purchased = order.purchased.includes(si);
      // 最后一辆A/S车：资产达到1000万才解锁购买（但仍展示随机出的具体车）
      const assetLocked = si >= 5 && assets() < 10000000;

      // 每天随机确定一辆具体可订购车辆（缓存到当天，避免每次刷新都变）
      if(!purchased && !order.displayCars[si]){
        order.displayCars[si] = pickOrderCar(isAS ? ['A','S'] : [def.rating], order.protection);
        save();
      }
      const showCar = order.displayCars[si];
      if(!purchased && !showCar) continue;

      let status;
      if(purchased) status = 2;          // 已订购
      else if(assetLocked) status = 1;   // 未解锁
      else status = 0;                   // 可订购

      cards.push({ si, def, isAS, rLabel, purchased, assetLocked, showCar, status });
    }
  });
  // 排序：可订购(0) > 未解锁(1) > 已订购(2)
  cards.sort((a, b) => a.status - b.status);

  let h = '<div class="mk-or-list">';
  cards.forEach(({ si, isAS, rLabel, purchased, assetLocked, showCar }) => {
    if(purchased){
      // 已订购：保留原展示，盖灰色蒙版 + 已订购标签
      const showId = showCar ? showCar.id : (CAR.find(c => c.rating === rLabel && c.orderPrice) || CAR[0]).id;
      const showName = showCar ? showCar.name : '已订购车辆';
      const showRating = showCar ? showCar.rating : rLabel;
      const v = showCar ? showCar.value : 0;
      const inc = showCar ? showCar.income : 0;
      const cap = showCar ? showCar.capacity : 0;
      h += `<div class="mk-or-card mk-or-purchased">
        <div class="mk-or-car-area">
          <div class="mk-or-img">${carImg(showId, 220, 140)}
            <div class="mk-or-overlay-label">${ratingBadge(showRating)} ${showName}</div>
          </div>
        </div>
        <div class="mk-or-stats">
          <div class="mk-or-stat"><span>${DOLLAR_IC}价值:</span><b>${f(v)}</b></div>
          <div class="mk-or-stat"><span>${DOLLAR_IC}收入:</span><b>${f(inc)}/分钟</b></div>
          <div class="mk-or-stat"><span>📦容量:</span><b>${f(cap)}</b></div>
          <div class="mk-or-buy"><button class="mk-or-btn" disabled>已订购</button></div>
        </div>
        <div class="mk-purchased-overlay"><div class="mk-purchased-icon">✓</div><div class="mk-purchased-text">已订购</div></div>
      </div>`;
      return;
    }

    const btnHtml = assetLocked
      ? `<button class="mk-or-btn" disabled>🔒 资产不足</button>`
      : `<button class="mk-or-btn" data-action="order-car" data-si="${si}" data-rating="${showCar.rating}" data-cid="${showCar.id}" data-price="${showCar.orderPrice}">${BEAN_IC} ${fbeanFull(showCar.orderPrice)}</button>`;
    const lockOverlay = assetLocked
      ? `<div class="mk-lock-overlay"><div class="mk-lock-icon">🔒</div><div class="mk-lock-text">资产达到10000000解锁</div></div>`
      : '';

    h += `<div class="mk-or-card ${assetLocked?'mk-or-locked':''}">
      <div class="mk-or-car-area">
        <div class="mk-or-img">${carImg(showCar.id, 220, 140)}
          <div class="mk-or-overlay-label">${ratingBadge(showCar.rating)} ${showCar.name}</div>
        </div>
      </div>
      <div class="mk-or-stats">
        <div class="mk-or-stat"><span>${DOLLAR_IC}价值:</span><b>${f(showCar.value)}</b></div>
        <div class="mk-or-stat"><span>${DOLLAR_IC}收入:</span><b>${f(showCar.income)}/分钟</b></div>
        <div class="mk-or-stat"><span>📦容量:</span><b>${f(showCar.capacity)}</b></div>
        <div class="mk-or-buy">${btnHtml}</div>
      </div>
      ${lockOverlay}
    </div>`;
  });
  h += '</div>';
  container.innerHTML = h;
}

/* ---------- 订购：每日刷新检查 ---------- */
function checkOrderRefresh(){
  const order = S.order || { lastRefreshDay: '', purchased: [], protection: {}, displayCars: {} };
  if(!order.displayCars) order.displayCars = {};  // 确保字段存在，避免 renderOrder 崩溃
  const tod = todayStr();
  if(order.lastRefreshDay !== tod){
    order.lastRefreshDay = tod;
    order.purchased = [];
    order.protection = {};
    order.displayCars = {};  // 重置每日展示车辆缓存
    save();
  }
}

/* ---------- 订购抽车（与淘车同概率公式） ---------- */
function pickOrderCar(ratings, protection){
  protection = protection || {};  // 防御：旧存档可能未传 protection
  const pool = CAR.filter(c => ratings.includes(c.rating) && c.orderPrice);
  if(!pool.length) return null;
  const totalValue = pool.reduce((s,c) => s + c.value, 0);
  if(totalValue <= 0) return pool[0];
  const weights = pool.map(c => {
    const protCount = (protection[c.id] || 0);
    const effectiveValue = c.value * Math.pow(1.5, protCount);
    return { car: c, weight: totalValue / effectiveValue };
  });
  const totalWeight = weights.reduce((s,w) => s + w.weight, 0);
  if(totalWeight <= 0) return pool[0];
  let rndVal = Math.random() * totalWeight;
  for(const w of weights){
    rndVal -= w.weight;
    if(rndVal <= 0) return w.car;
  }
  return weights[weights.length-1].car;
}

function orderCar(cid, price, si){
  if(S.beans < price){ needBeans(); return; }
  const car = CAR_BY_ID[cid]; if(!car) return;
  S.beans -= price;
  S.stats.orderCount++;

  // 标记该位置已购买
  const order = S.order || { purchased: [], protection: {} };
  if(si !== undefined && !order.purchased.includes(si)){
    order.purchased.push(si);
  }
  // 保护机制
  order.protection[cid] = (order.protection[cid] || 0) + 1;

  toast(`🎊 订购成功！${car.name}`);
  showCarGet(car);
  setTimeout(()=>{ if(current==='market') renderMarketTab(); }, 100);
}
function refreshOrder(){
  const order = S.order || { purchased: [], protection: {} };
  order.purchased = [];
  order.protection = {};
  save();
  toast('订购列表已刷新');
  if(current==='market') renderMarketTab();
}

/* ==================== A15 车辆获取 ==================== */
function showCarGet(car){
  // 检查是否重复
  const existing = S.inst.find(i=>i.carId===car.id);
  const isEnhance = !!existing;
  if(existing){
    // 重复获取：车辆强化
    existing.count++;
    existing.enhanceLevel = (existing.enhanceLevel || 0) + 1;
    const baseC = CAR_BY_ID[car.id];
    if(baseC){
      const bonus = 0.10;
      existing.value = Math.floor(baseC.value * (1 + bonus * existing.enhanceLevel));
      existing.income = Math.floor(baseC.income * (1 + bonus * existing.enhanceLevel));
      existing.capacity = Math.floor(baseC.capacity * (1 + bonus * existing.enhanceLevel));
    }
  } else {
    const freeSpot = freeSpotIdx();
    if(freeSpot >= 0) S.inst.push(mk(car.id,'spot',freeSpot));
    else S.inst.push(mk(car.id,'garage'));
  }
  save();   // 获取/强化后置化（避免刷新丢失强化等级）
  // 按原型构建弹窗
  const titleText = isEnhance ? '重复获取，车辆强化' : '恭喜您获得了';
  const nameText = isEnhance ? `${car.name}+1` : car.name;
  const baseC = CAR_BY_ID[car.id];
  // 计算显示值：新车用基础属性，强化车用增强后属性
  const showValue = existing ? existing.value : (baseC ? baseC.value : 0);
  const showIncome = existing ? existing.income : (baseC ? baseC.income : 0);
  const showCapacity = existing ? existing.capacity : (baseC ? baseC.capacity : 0);
  // 强化车计算bonus差值用于显示
  let valBonus = 0, incBonus = 0, capBonus = 0;
  if(isEnhance && baseC && existing.enhanceLevel){
    valBonus = showValue - baseC.value;
    incBonus = showIncome - baseC.income;
    capBonus = showCapacity - baseC.capacity;
  }
  const bonusTag = (baseVal, bonusVal) => bonusVal > 0 ? `${f(baseVal)}<span style="color:#16a34a;font-weight:800">+${f(bonusVal)}</span>` : f(baseVal);

  openModal(`
    <div class="cg-wrap">
      <div class="cg-title">${titleText}</div>
      <div class="cg-car-img-wrap">
        <div class="cg-rating-on-img">${ratingBadge(car.rating)}</div>
        ${carImg(car.id,220,140)}
      </div>
      <div class="cg-car-name-row">
        ${logoImg(car.brand)}
        <span class="cg-car-name">${nameText}</span>
      </div>
      <div class="cg-attrs">
        <div class="cg-attr"><span class="cg-attr-label">价值：</span><b>${isEnhance?bonusTag(baseC?baseC.value:0,valBonus):f(showValue)}</b></div>
        <div class="cg-attr"><span class="cg-attr-label">收入：</span><b>${isEnhance?bonusTag(baseC?baseC.income:0,incBonus)+'/分钟':f(showIncome)+'/分钟'}</b></div>
        <div class="cg-attr"><span class="cg-attr-label">容量：</span><b>${isEnhance?bonusTag(baseC?baseC.capacity:0,capBonus):f(showCapacity)}</b></div>
      </div>
      ${!isEnhance?`<div class="cg-subtitle">现在您可以在车库中查看此车</div>`:''}
      <div class="cg-btns">
        <button class="cg-btn cg-btn-ok" data-action="close-modal">确定</button>
        <button class="cg-btn cg-btn-share" data-action="share-result">分享</button>
      </div>
    </div>
  `);
}

/* ==================== 车辆详情卡片（车库/图鉴点击） ==================== */
function showCarInfo(carId, inst){
  const c = CAR_BY_ID[carId]; if(!c) return;
  const isEnhanced = inst && inst.enhanceLevel > 0;
  // 图鉴用基础属性，车库用实际属性
  const val = inst ? (inst.value || c.value) : c.value;
  const inc = inst ? incomeOf(inst) : c.income;
  const cap = inst ? capOf(inst) : c.capacity;
  // 强化车显示差值
  let valHtml = f(val), incHtml = f(inc) + '/分钟', capHtml = f(cap);
  if(isEnhanced && inst){
    const vD = val - c.value, iD = inc - c.income, cD = cap - c.capacity;
    if(vD > 0) valHtml = f(c.value) + '<span style="color:#16a34a;font-weight:800">+' + f(vD) + '</span>';
    if(iD > 0) incHtml = f(c.income) + '<span style="color:#16a34a;font-weight:800">+' + f(iD) + '</span>/分钟';
    if(cD > 0) capHtml = f(c.capacity) + '<span style="color:#16a34a;font-weight:800">+' + f(cD) + '</span>';
  }
  const nameSuffix = inst && inst.count > 1 ? '+' + (inst.count - 1) : '';

  openModal(`
    <div class="ci-wrap">
      <div class="ci-img-wrap">
        <div class="ci-rating">${ratingBadge(c.rating)}</div>
        ${carImg(carId,200,126)}
      </div>
      <div class="ci-name-row">
        ${logoImg(c.brand)}
        <span class="ci-name">${c.name}${nameSuffix}</span>
      </div>
      <div class="ci-attrs">
        <div class="cg-attr"><span class="cg-attr-label">价值：</span><b>${valHtml}</b></div>
        <div class="cg-attr"><span class="cg-attr-label">收入：</span><b>${incHtml}</b></div>
        <div class="cg-attr"><span class="cg-attr-label">容量：</span><b>${capHtml}</b></div>
      </div>
      ${isEnhanced?`<div class="ci-enhance-info">强化等级：Lv.${inst.enhanceLevel}</div>`:''}
      <div class="cg-btns">
        <button class="cg-btn cg-btn-ok" data-action="close-modal">确定</button>
      </div>
    </div>
  `);
}

/* ==================== A16 好友界面 ==================== */
// 好友界面状态：主tab(asset/networth/new) + 排名子tab(friend/global)
let rankTab = 'asset', rankSubTab = 'friend';
function renderFriends(){
  rankTab = 'asset'; rankSubTab = 'friend';
  const sc = $('#screen'); if(sc){
    sc.innerHTML = `
      <div class="rank-tabs">
        <div class="rank-tab active" data-action="rtab" data-rtab="asset">资产排名</div>
        <div class="rank-tab" data-action="rtab" data-rtab="networth">身价排名</div>
        <div class="rank-tab" data-action="rtab" data-rtab="new">新的车友</div>
      </div>
      <div id="rankSubTabs"></div>
      <div id="friendContent"></div>
      <div id="friendBottomBar"></div>
    `;
  } else {
    openModal(`<div class="modal-title">👥 好友</div><div id="friendContent"></div>`);
  }
  renderFriendTab();
}
function renderFriendTab(){
  const fc = $('#friendContent'); if(!fc) return;
  const subEl = $('#rankSubTabs'); if(subEl) subEl.innerHTML = '';

  // === "新的车友" tab ===
  if(rankTab === 'new'){
    // 推荐车友：未添加的机器人优先；机器人不足10个时用真实玩家补充；
    // 机器人+真实玩家总人数不足10个则有多少显示多少
    const notFriend = (u) => !S.friends.some(f => String(f.uid) === String(u.uid));
    const recBots = BOT_POOL.filter(notFriend);
    const recReal = REAL_PLAYER_POOL.filter(notFriend);
    // TapTap 环境：真实玩家（来自排行榜）排在推荐列表最前
    const inTapEnv = !!(window.ChexingSDK && window.ChexingSDK.isTapMiniGame);
    const recTap = inTapEnv ? TAP_PLAYER_POOL.filter(notFriend) : [];
    if(inTapEnv && !_tapPoolTs){
      // 首次进入该页签时后台拉一次真实玩家，拉到后重绘
      fetchTapPlayers().then(() => { if(rankTab === 'new') renderFriendTab(); });
    }
    const recList = [...recTap, ...recBots, ...recReal].slice(0, 10);
    let botHtml = '';
    if(recList.length > 0){
      botHtml = '<div class="nf-section"><div class="nf-header">推荐车友</div><div class="nf-desc text-accent">以下车友可手动添加</div><div class="nf-bot-list">';
      recList.forEach(bot => {
        const c = CAR_BY_ID[bot.bestCarId] || CAR_BY_ID[1];
        const ava = bot.avatar ? `<img class="rk-avatar-img" src="${bot.avatar}" alt="" onerror="this.style.display='none'">` : DEF_AVA;
        botHtml += `<div class="nf-bot-item">
          <div class="rk-avatar">${ava}</div>
          <div class="rk-rating-box">${ratingBadge(c.rating)}</div>
          <div class="nf-bot-info"><div class="nf-bot-name">${bot.name}</div><div class="nf-bot-sub">资产 ${f(bot.assets)} · ID ${bot.uid}</div></div>
          <button class="rk-btn rk-btn-add" data-action="add-friend-rank" data-fruid="${bot.uid}">加好友</button>
        </div>`;
      });
      botHtml += '</div></div>';
    }
    fc.innerHTML = `
      <div class="nf-section">
        <div class="nf-header">添加游戏好友</div>
        <div class="nf-desc text-accent">输入车友的ID来申请好友</div>
        <div class="nf-myid">我的ID：<b>${S.uid}</b><button class="nf-copy-btn" data-action="copy-my-uid">复制</button></div>
        <div class="nf-count-chip${friendCount() >= FRIEND_MAX ? ' full' : ''}">👥 我的好友 <b>${friendCount()}</b> / ${FRIEND_MAX}</div>
        <div class="nf-search-row">
          <input type="text" class="nf-input" placeholder="输入需要添加的玩家的ID" id="searchUidInput">
        </div>
        <button class="nf-search-btn btn-primary" data-action="search-user">搜索</button>
      </div>
      <div class="nf-invite">
        <div class="nf-invite-img">🎁</div>
        <div class="nf-invite-text">邀请好友进入游戏<br>每个新用户奖励</div>
        <div class="nf-invite-reward">${BEAN_IC}<span style="color:var(--gold);font-size:20px;font-weight:900">10000</span><span style="color:var(--gold)">黄金</span></div>
        <button class="btn-primary nf-invite-btn" data-action="nf-invite-share">邀请</button>
      </div>
      ${botHtml}
    `;
    return;
  }

  // === 资产排名 / 身价排名：子页签 ===
  if(subEl){
    subEl.innerHTML = `
      <div class="rank-subtabs">
        <div class="rank-subtab ${rankSubTab==='friend'?'active':''}" data-action="rsubtab" data-rsub="friend">好友</div>
        <div class="rank-subtab ${rankSubTab==='global'?'active':''}" data-action="rsubtab" data-rsub="global">全服</div>
      </div>
    `;
  }

  // 构建列表数据
  const sortBy = rankTab === 'asset' ? 'assets' : 'networth';
  const isGlobal = rankSubTab === 'global';

  const meRow = {uid:S.uid, name:S.name, assets:assets(), networth:networth(), bestCarId:(S.inst[0]||{}).carId, isMe:true, avatar:S.avatar};
  let listData;
  let tipHtml = '';
  if(isGlobal){
    const inTap = !!(window.ChexingSDK && window.ChexingSDK.isTapMiniGame);
    if(inTap){
      // ⭐ TapTap 环境：全服榜显示【真实玩家】（数据来自 TapTap 排行榜 API）
      if(!_tapPoolTs){
        // 首次进入：先显示加载态，拉到数据后自动重绘
        fc.innerHTML = '<div class="rank-empty-tip">正在加载全服排行榜…</div>';
        fetchTapPlayers().then(() => {
          if(rankTab !== 'new' && rankSubTab === 'global') renderFriendTab();
        });
        return;
      }
      fetchTapPlayers();   // 后台按 TTL 静默刷新
      if(TAP_PLAYER_POOL.length === 0){
        tipHtml = '<div class="rank-empty-tip">全服榜暂无其他玩家上榜，快去积累资产抢占榜首！</div>';
        listData = [...BOT_POOL, meRow];
      } else {
        listData = [...BOT_POOL, ...TAP_PLAYER_POOL, meRow];
      }
    } else {
      const virtualPlayers = REAL_PLAYER_POOL.map(vp => ({ ...vp, networth: calcNetworth(vp.assets) }));
      listData = [...S.friends, meRow, ...virtualPlayers];
    }
  } else {
    listData = [...S.friends, meRow];
  }

  // 排序
  listData.sort((a,b)=>(b[sortBy]||0)-(a[sortBy]||0));

  // 注意：好友（含机器人车友）的身价是独立属性（由 makeFriends 初始化 +
  // 身价日跌/挖角维护），绝不能用 calcNetworth(assets) 覆盖，否则会把身价
  // 算成好友资产值（几十万）并写回存档，导致雇佣成本不可承受。
  // 虚拟玩家(vp_*)的身价在第2501行 map 时已用资产公式计算，仅用于排名展示、不可雇佣。

  // 全服排名：TapTap 真实榜显示前 50，本地演示榜显示前 10；好友排名显示全部
  if(isGlobal) listData = listData.slice(0, (window.ChexingSDK && window.ChexingSDK.isTapMiniGame) ? 50 : 10);

  // 渲染列表（按原型：奖牌+头像+评级+车辆图+名称+数值+状态+按钮）
  let h = tipHtml + '<div class="rank-list">';
  listData.forEach((fr, i) => {
    const c = CAR_BY_ID[fr.bestCarId] || CAR_BY_ID[1];
    const isMe = fr.isMe;
    const isFriend = S.friends.some(f => f.uid === fr.uid);
    const valText = rankTab==='asset' ? f(fr.assets) : f(fr.networth);
    const valIcon = rankTab==='asset' ? ASSET_IC : '🏆';

    // 奖牌/排名
    let medalHtml = '';
    if(i === 0) medalHtml = '<div class="rk-medal rk-gold">🥇</div>';
    else if(i === 1) medalHtml = '<div class="rk-medal rk-silver">🥈</div>';
    else if(i === 2) medalHtml = '<div class="rk-medal rk-bronze">🥉</div>';
    else medalHtml = `<div class="rk-num">${i+1}</div>`;

    // 车位状态判断
    let parkStatus = '', parkStatusCls = '';
    if(isMe){
      // 自己不显示停车状态
      parkStatus = ''; parkStatusCls = '';
    } else if(isFriend){
      // 若该好友家已停了自己的车，则显示“停车中”而非“有车位”
      const iParkedHere = S.inst.some(inst => inst.atFriend === fr.uid);
      if(iParkedHere){ parkStatus = '停车中'; parkStatusCls = 'rk-park-blue'; }
      else { parkStatus = '有车位'; parkStatusCls = 'rk-park-green'; }
    } else {
      parkStatus = '无车位'; parkStatusCls = 'rk-park-red';
    }

    // 操作按钮
    let actionBtn = '';
    if(isMe){
      actionBtn = `<span class="rk-btn rk-btn-me">我自己</span>`;
    } else if(isFriend){
      actionBtn = `<button class="rk-btn rk-btn-visit" data-action="visit-friend" data-fruid="${fr.uid}">拜访</button>`;
    } else {
      actionBtn = `<button class="rk-btn rk-btn-add" data-action="add-friend-rank" data-fruid="${fr.uid}">加好友</button>`;
    }

    // 真实 TapTap 玩家用其账号头像；无头像/机器人回退默认头像
    const avaHtml = fr.avatar ? `<img class="rk-avatar-img" src="${fr.avatar}" alt="" onerror="this.style.display='none'">` : DEF_AVA;

    h += `<div class="rk-row" data-action="show-user-info" data-fruid="${fr.uid}">
      <div class="rk-left">${medalHtml}</div>
      <div class="rk-avatar">${avaHtml}</div>
      <div class="rk-car-thumb">${thumb(c.id)}<span class="rk-rating-on-car">${ratingBadge(c.rating)}</span></div>
      <div class="rk-info">
        <div class="rk-name" data-action="show-user-info" data-fruid="${fr.uid}">${fr.name}</div>
        <div class="rk-val-box"><span class="rk-val-icon">${valIcon}</span><b>${valText}</b></div>
      </div>
      <div class="rk-right">
        <div class="rk-status ${parkStatusCls}">${parkStatus}</div>
        ${actionBtn}
      </div>
    </div>`;
  });
  h += '</div>';
  fc.innerHTML = h;
}

/* --- 好友用户信息浮层（原型：点击用户名弹出） --- */
function showUserInfoPopup(fruid){
  // 查找用户数据
  let fr = null;
  if(fruid == S.uid){
    fr = {uid:S.uid, name:S.name, assets:assets(), networth:networth(), isMe:true};
  } else {
    fr = S.friends.find(f => f.uid == fruid) || findAnyPlayer(fruid);
    if(!fr) fr = {uid:fruid, name:'未知玩家', assets:0, networth:0};
  }
  const topCar = fr.isMe ?
    (S.inst.length ? S.inst.reduce((a,b)=>CAR_BY_ID[b.carId].value>CAR_BY_ID[a.carId].value?b:a,S.inst[0]) : null) :
    (fr.bestCarId ? CAR_BY_ID[fr.bestCarId] : null);

  const isFriend = !fr.isMe && S.friends.some(f => f.uid == fruid);

  openModal(`
    <div class="uip-wrap">
      <div class="uip-header">
        <span class="uip-title">${fr.name}</span>
        <button class="uip-close" data-action="close-modal">✕</button>
      </div>
      <div class="uip-body">
        <div class="uip-top-row">
          <div class="uip-avatar">${S.avatar ? `<img src="${S.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '👤'}</div>
          <div class="uip-stats-col">
            <div class="uip-stat-row"><span class="uip-stat-icon">🏆</span>身价：<b>${f(fr.networth)}</b></div>
            <div class="uip-stat-row"><span class="uip-stat-icon">${ASSET_IC}</span>资产：<b>${f(fr.assets)}</b></div>
          </div>
          ${!fr.isMe && !isFriend ? `<button class="uip-add-btn btn-primary btn-sm" data-action="add-friend-rank" data-fruid="${fruid}">加好友</button>` :
            !fr.isMe ? `<button class="uip-add-btn btn-ghost btn-sm" data-action="remove-friend" data-fruid="${fruid}">删除好友</button>` : ''}
        </div>
        <div class="uip-uid">UID：${fr.uid}</div>
        <div class="uip-boss-row">
          <div class="uip-boss-cell">
            <div class="uip-boss-label">现任老板</div>
            <div class="uip-boss-val">${fr.isMe?'还没有老板':'--'}</div>
          </div>
          <div class="uip-boss-cell">
            <div class="uip-boss-label">最栽培Ta的老板</div>
            <div class="uip-boss-val-with-avatar">
              <div class="uip-boss-avatar">👤</div>
              <span>${fr.isMe?'还没有被雇佣过':'--'}</span>
            </div>
          </div>
        </div>
        <div class="uip-car-section">
          <div class="uip-car-label">最有价值的车</div>
          ${topCar?`
            <div class="uip-car-body">
              <div class="uip-car-img-wrap">
                ${carImg(topCar.id,180,110)}
                ${ratingBadge(topCar.rating)}
              </div>
              <div class="uip-car-name-row">
                ${logoImg(topCar.brand)}
                <span class="uip-car-name">${colorName(topCar.name)}</span>
              </div>
            </div>`:`<div class="text-mut fs-12 p-4">暂无车辆</div>`}
        </div>
      </div>
    </div>
  `);
}

/* ==================== A17 拜访好友 ==================== */
function renderVisitFriend(fruid){
  const fr = S.friends.find(f=>f.uid===fruid); if(!fr) return;
  visiting = true;
  S.visitTarget = fruid;
  const sc = $('#screen'); if(sc){
    // ===== 元件1-3: 头像 + 资产 + 用户名称 =====
    const friendInitial = (fr.name||'?')[0];
    sc.innerHTML = `
      <!-- 好友信息头部：左侧头像+资产 | 右侧名称+员工 -->
      <div class="vf-header">
        <!-- 左侧列：头像+资产（与主界面HUD风格一致） -->
        <div class="vf-left-col">
          <div class="vf-avatar-wrap">
            <div class="vf-avatar-ph">${DEF_AVA}</div>
          </div>
          <div class="vf-stats-col">
            <div class="vf-stat-row"><span class="vf-stat-icon">🏆</span>身价：<b>${f(fr.networth||0)}</b></div>
            <div class="vf-stat-row"><span class="vf-stat-icon">${ASSET_IC}</span>资产：<b>${f(fr.assets||0)}</b></div>
          </div>
        </div>
        <!-- 右侧列 -->
        <div class="vf-right-col">
          <div class="vf-name-field">${fr.name}</div>
        </div>
      </div>

      <!-- 元件5+11合并: 好友车位（4格，与首页A06一致；含已停车辆/空闲/锁定） -->
      <div class="vf-section" id="vfFspots"></div>

      <!-- 底部导航: 元件7好友 + 元件8回家 -->
      <div class="vf-nav">
        <button class="vf-nav-btn" data-action="visit-friend-switch">
          <span class="vf-nav-icon">👤</span><span class="vf-nav-txt">好友</span>
        </button>
        <button class="vf-nav-btn" data-action="go-home-from-visit">
          <span class="vf-nav-icon">🏠</span><span class="vf-nav-txt">回家</span>
        </button>
      </div>
    `;
    renderVisitFspots();
  } else {
    openModal(`<div class="modal-title">拜访 ${fr.name}</div><div id="visitCars"></div>`);
    renderVisitCars();
  }
}

/* 元件5+9+10: 渲染停在该好友家的车辆（含取回按钮+容量进度条） */
function renderVisitParkedCars(){
  const el = $('#vfParkedCars'); if(!el) return;
  const parkedHere = S.inst.filter(i => i.atFriend === S.visitTarget);
  if(parkedHere.length === 0){
    el.innerHTML = '';
    return;
  }
  let h = '<div class="vf-parked-header">取回车辆</div>';
  h += '<div class="vf-parked-list">';
  parkedHere.forEach(inst => {
    const c = CAR_BY_ID[inst.carId]; if(!c) return;
    const cap = capOf(inst);
    const earned = Math.min(inst.accrued || 0, cap);
    const pct = cap > 0 ? Math.min(100, (earned/cap)*100) : 0;
    h += `<div class="vf-parked-item">
      <div class="vf-parked-left">
        <button class="vf-recall-btn" data-action="recall-from-friend" data-iid="${inst.iid}" title="取回车辆">⟲</button>
        ${thumb(inst.carId)}
        ${ratingBadge(c.rating)}
      </div>
      <div class="vf-parked-right">
        <div class="vf-prog-bar"><div class="vf-prog-fill" style="width:${pct}%"></div></div>
        <div class="vf-prog-text">${f(Math.floor(earned))}</div>
        <div class="vf-parked-btns">
          <button class="vf-collect-btn" data-action="collect" data-iid="${inst.iid}" title="收取收益">🤚 收取</button>
          <button class="vf-recall-btn" data-action="recall-from-friend" data-iid="${inst.iid}" title="取回车辆">⟲</button>
        </div>
      </div>
    </div>`;
  });
  h += '</div>';
  el.innerHTML = h;
}
/* DEAD_CODE_REMOVED_renderVisitCars - fully cleaned */

/* 元件5+11合并: 渲染拜访好友页面的4格好友车位（与首页A06一致） */
function renderVisitFspots(){
  const el = $('#vfFspots'); if(!el) return;
  const fc = friendCount();
  let h = '<div class="parking-grid">';

  // 拜访好友时只显示已解锁的好友车位（未解锁的不显示）
  const unlockedCount = [0, 3, 10, 20].reduce((n, req) => n + (fc >= req ? 1 : 0), 0);

  for(let i = 0; i < unlockedCount; i++){
    // 已解锁：检查该车位是否有自己的车停着
    const parkedCar = S.inst.find(inst => inst.atFriend === S.visitTarget && inst.fspotIdx === i);

    if(parkedCar){
      // 有车停着：显示车辆卡片（与自家 park-card 布局一致：$当前/容量+进度条+评级+品牌+车名+倒计时+操作按钮）
      const c = CAR_BY_ID[parkedCar.carId]; if(!c){ i++; continue; }
      const cap = capOf(parkedCar);
      const inc = incomeOf(parkedCar);
      const earned = Math.min(parkedCar.accrued || 0, cap);
      const pct = cap > 0 ? Math.min(100, (earned/cap)*100) : 0;
      // 倒计时（与 renderParkCard 一致）
      const remainSec = inc > 0 ? Math.floor((cap - earned) / inc * 60) : 0;
      const rmH = String(Math.floor(remainSec / 3600)).padStart(2, '0');
      const rmM = String(Math.floor((remainSec % 3600) / 60)).padStart(2, '0');
      const rmS = String(remainSec % 60).padStart(2, '0');
      const rm = remainSec > 0 ? `${rmH}:${rmM}:${rmS}` : '已满仓';
      h += `<div class="park-card" data-vfspot="${i}">
        <div class="pc-income-area">
          <div class="pc-income-val">${DOLLAR_IC} <span class="pc-curr">${f(Math.floor(earned))}</span>/<span class="pc-cap">${f(cap)}</span></div>
          <div class="pc-prog-row"><div class="pc-prog-bar"><div class="pc-prog-fill" style="width:${pct}%"></div></div><div class="vf-parked-btns" style="display:flex;gap:4px;margin-left:auto;flex-shrink:0;">
            <button class="btn-primary btn-sm" data-action="collect" data-iid="${parkedCar.iid}" title="收取收益">🤚 收取</button>
            <button class="btn-primary btn-sm" data-action="recall-from-friend" data-iid="${parkedCar.iid}" title="取回车辆">⟲ 取回</button>
          </div></div>
        </div>
        <div class="pc-body">
          <div class="pc-img-wrap clickable" data-action="view-parked-car-info" data-car-id="${c.id}" data-iid="${parkedCar.iid}">
            ${ratingBadge(c.rating)}
            ${carImg(c.id, 140, 90)}
            ${logoImg(c.brand)}
          </div>
          <div class="pc-car-name">${c.name}${parkedCar.enhanceLevel?`<span class="pc-enhance">+${parkedCar.enhanceLevel}</span>`:''}</div>
        </div>
        <div class="pc-timer-bar">
          <span>剩余时间</span><span class="pc-timer-val">${rm}</span>
        </div>
      </div>`;
    } else {
      // 空闲车位：点击打开选车弹窗
      h += `<div class="park-card" data-vfspot="${i}" data-action="open-park-at-friend" data-fspot-idx="${i}">
        <div class="pc-empty-park">
          <div class="pc-p-icon" style="font-size:40px;color:var(--accent)">F</div>
          <div class="pc-p-label">空闲车位</div>
        </div>
      </div>`;
    }
  }

  h += '</div>';
  el.innerHTML = h;
}

/* ===== 元件12+13+14: 好友车位 - 选车弹窗 + 停车规则 ===== */

/* 打开选车弹窗（元件12: 车辆列表） */
function renderParkAtFriendModal(fspotIdx){
  _parkingTargetFspotIdx = fspotIdx; // 传递给 doParkAtFriend
  // 检查目标车位是否已有车
  const spotTaken = S.inst.some(i => i.atFriend === S.visitTarget && i.fspotIdx === fspotIdx);
  if(spotTaken){ toast('该车位已停有车辆'); return; }

  // 规则：每个好友家只能停一辆车
  const alreadyParked = S.inst.some(i => i.atFriend === S.visitTarget);
  if(alreadyParked){ toast('每个好友家只能停一辆车哦!'); return; }

  // 规则14预检：总好友停车数
  const totalAtFriends = S.inst.filter(i => i.atFriend).length;
  if(totalAtFriends >= FRIEND_PARK_MAX){ toast('只能有4辆车停到好友家中。'); return; }

  // 规则13排序：闲置中 > 停在好友家 > 停在自己家，再按收入从高到低
  const cars = [...S.inst].sort((a,b)=>{
    const locOrder = {'garage':0, 'atFriend':1, 'spot':2};
    const la = locOrder[a.loc] ?? 9, lb = locOrder[b.loc] ?? 9;
    if(la !== lb) return la - lb;
    return (CAR_BY_ID[b.carId]?.income||0) - (CAR_BY_ID[a.carId]?.income||0);
  });

  let h = '<div class="vf-modal-titlebar"><span>选择车辆</span><button class="tb-close" data-action="close-modal">×</button></div>';
  h += '<div class="vf-park-list">';
  cars.forEach(inst => {
    const c = CAR_BY_ID[inst.carId]; if(!c) return;

    // 状态标签（与车库一致：图标+文字样式）
    let statusCls = '', statusTxt = '', statusIcon = '';
    if(inst.loc === 'garage'){ statusCls = 'gg-st-idle'; statusTxt = '闲置中'; statusIcon = '🏠'; }
    else if(inst.atFriend){ statusCls = 'gg-st-friend'; statusTxt = '停在好友家'; statusIcon = '🅿️'; }
    else if(inst.loc === 'spot'){ statusCls = 'gg-st-park'; statusTxt = '停在自己家'; statusIcon = '🅿️'; }

    // 时间：有员工工作时显示剩余工作时间，否则显示满容量时间
    let timeStr = '';
    const fullMin = c.income > 0 ? Math.ceil(c.capacity / c.income) : 0;
    if(inst.empIid){
      const emp = S.employees.find(e=>e.iid===inst.empIid);
      if(emp && emp.workEnd > now()){
        const remainSec = Math.ceil((emp.workEnd - now())/1000);
        timeStr = formatDuration(remainSec);
      } else {
        timeStr = fullMin + '分钟';
      }
    } else {
      timeStr = fullMin + '分钟';
    }

    // 规则：有员工正在工作的车不能直接换停
    let hasWorker = false;
    if(inst.empIid){
      const emp = S.employees.find(e=>e.iid===inst.empIid);
      hasWorker = !!(emp && emp.workEnd > now());
    }
    const lockCls = hasWorker ? ' is-locked' : '';
    const disabledTitle = hasWorker ? '当前该车辆有员工外出，无法使用。' : '';

    // 收入/容量信息
    const cap = capOf(inst);
    const inc = incomeOf(inst);

    h += `<div class="vf-park-row${lockCls}" data-action="park-at-friend" data-iid="${inst.iid}" title="${disabledTitle}">
      <div class="vfpr-left">
        <div class="vfpr-head">
          ${ratingBadge(c.rating)}
          <span class="vfpr-car-name">${c.name}${inst.enhanceLevel?`<span class="pc-enhance">+${inst.enhanceLevel}</span>`:''}</span>
        </div>
        <div class="vfpr-img-wrap">
          ${carImg(c.id, 140, 90)}
          <span class="gg-card-status ${statusCls}">${statusIcon}${statusTxt}</span>
        </div>
      </div>
      <div class="vfpr-right">
        <div class="vfpr-info">⏱ 时间：${timeStr}</div>
        <div class="vfpr-info">${DOLLAR_IC} 收入：${f(inc)}/分钟</div>
        <div class="vfpr-info">📦 容量：${f(cap)}</div>
        <button class="vfpr-btn${lockCls}">停车</button>
      </div>
    </div>`;
  });
  h += '</div>';

  openModal(h);
}

/* 执行停车（规则14全部校验） */
function doParkAtFriend(iid){
  const inst = S.inst.find(i=>i.iid===iid); if(!inst) return;

  // 规则：有员工正在工作的车辆无法使用
  let hasWorker = false;
  if(inst.empIid){
    const emp = S.employees.find(e=>e.iid===inst.empIid);
    hasWorker = !!(emp && emp.workEnd > now());
  }
  if(hasWorker){ toast('当前该车辆有员工外出，无法使用。'); return; }

  // 规则11：目标车位是否已被占用（每个车位只能停1辆）
  const targetIdx = _parkingTargetFspotIdx ?? 0;
  const spotTaken = S.inst.some(i => i.atFriend === S.visitTarget && i.fspotIdx === targetIdx && i.iid !== iid);
  if(spotTaken){ toast('该车位已有车辆停放'); closeModal(); return; }

  // 规则14b：总好友停车不超过4辆
  const totalAtFriends = S.inst.filter(i => i.atFriend).length;
  if(totalAtFriends >= FRIEND_PARK_MAX){ toast('只能有4辆车停到好友家中。'); closeModal(); return; }

  // 执行停车：结算当前收益
  settleAccrued(inst);  // 重新停车时结算原地累积收益并归零
  inst.loc = 'atFriend';
  inst.atFriend = S.visitTarget;
  inst.spotIdx = -1;
  inst.fspotIdx = targetIdx; // 记录停在哪个好友车位
  S.stats.parkFriendCount++;
  toast(`${CAR_BY_ID[inst.carId].name} 已停入第${targetIdx+1}号好友车位`);
  save();
  closeModal();
  renderVisitFspots(); refreshAllParkGrids();
}

/* 格式化持续时间（秒 → X分X秒 或 X小时X分） */
function formatDuration(sec){
  if(sec <= 0) return '0分钟';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if(h > 0) return `${h}小时${m}分`;
  if(m > 0) return `${m}分钟`;
  return `${s}秒`;
}

function recallFromFriend(iid){
  const inst = S.inst.find(i=>i.iid===parseInt(iid)); if(!inst) return;
  const got = settleAccrued(inst);  // 收回时一并结算在好友家累积的收益并归零进度（修复：此前漏重置，导致进度反复不归零）
  inst.loc = 'garage';
  inst.atFriend = null;
  inst.fspotIdx = undefined; // 清除好友车位索引
  if(got>0) toast(`${CAR_BY_ID[inst.carId].name} 已取回车库，收取 +${f(got)} 刀乐`);
  else toast(`${CAR_BY_ID[inst.carId].name} 已取回车库`);
  save(); updateHUD();
  if(visiting){ renderVisitFspots(); refreshAllParkGrids(); }
  else if(current==='garage') renderGarageTab();
}

/* ==================== A18 消息系统 ==================== */
function renderMessages(){
  msgTab = 'feed';
  const sc = $('#screen'); if(sc){
    sc.innerHTML = `
      <div class="msg-tabs">
        <div class="msg-tab active" data-action="msgtab" data-msgtab="feed">动态</div>
        <div class="msg-tab" data-action="msgtab" data-msgtab="notice">公告</div>
      </div>
      <div id="msgContent"></div>
    `;
  } else {
    openModal(`<div class="modal-title">✉️ 消息</div><div id="msgContent"></div>`);
  }
  renderMsgTab();
}
let msgTab = 'feed';
function renderMsgTab(){
  const mc = $('#msgContent'); if(!mc) return;
  if(msgTab === 'notice'){
    mc.innerHTML = `<div class="section"><h3>📢 公告</h3><div class="text-mut fs-12 p-8" style="white-space:pre-line">亲爱的玩家：
欢迎使用抢车位：华夏崛起！
收集炫酷的跑车，组建自己的奢华车队吧！

如有任何建议和疑问，请加入官方QQ群：1031327839</div></div>`;
    return;
  }
  if(!S.messages.length){
    mc.innerHTML = '<div class="text-center text-mut p-8">暂无动态</div>'; return;
  }
  let h = '<div class="msg-list">';
  S.messages.slice().reverse().forEach(m => {
    const d = new Date(m.ts);
    const timeStr = `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    switch(m.type){
      case 'friend_req':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-row">
            <div class="msg-card-avatar">${DEF_AVA}</div>
            <div class="msg-card-info">
              <span class="msg-card-name">${m.fromName || '某人'}</span>请求你加为好友
              <div class="msg-card-btns">
                <button class="msg-btn msg-btn-accept" data-action="accept-friend" data-mid="${m.mid}">同意</button>
                <button class="msg-btn msg-btn-reject" data-action="reject-friend" data-mid="${m.mid}">拒绝</button>
              </div>
            </div>
          </div>
        </div>`;
        break;

      case 'reward':
        // 过滤掉旧版在线奖励垃圾消息
        if(m.rewardType === 'online') break;
        const claimed = m.claimed;
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body">${m.text || '系统奖励'}</div>
          <div class="msg-card-row msg-card-reward">
            <span class="msg-card-rwd-icon">🎁</span>
            <span class="msg-card-rwd-amt">${m.amount ? f(m.amount) : ''}</span>
            ${claimed
              ? '<span class="msg-card-done">已领取</span>'
              : `<button class="msg-btn msg-btn-claim" data-action="claim-msg-reward" data-mid="${m.mid}">领取附件</button>`
            }
          </div>
        </div>`;
        break;

      case 'emp_poached':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body">你的<span class="msg-hl">${m.empName || '员工'}</span>被<span class="msg-hl">${m.poacherName || '某人'}</span>高薪挖走了，当前身价${f(m.networth||0)}，Ta将不再为你服务。</div>
        </div>`;
        break;

      case 'car_ticket':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body">你的<span class="msg-hl">${m.carName || '车'}</span>在<span class="msg-hl">${m.friendName || '某人家'}</span>停了<span class="msg-hl">${m.duration || '--'}</span>被贴罚单，${f(m.amount||0)}的收入损失了一半。</div>
        </div>`;
        break;

      case 'self_hired':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body"><span class="msg-hl">${m.employerName || '某人'}</span>雇佣了你为Ta卖命，当前身价${f(m.networth||0)}。</div>
        </div>`;
        break;

      case 'self_poached':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body"><span class="msg-hl">${m.poacherName || '某人'}</span>从<span class="msg-hl">${m.oldEmployer || '某人'}</span>那里挖角了你为Ta卖命，当前身价${f(m.networth||0)}。</div>
        </div>`;
        break;

      case 'self_fired':
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body"><span class="msg-hl">${m.employerName || '某人'}</span>把你解雇了，当前身价${f(m.networth||0)}。</div>
        </div>`;
        break;

      case 'system':
        // 真实发生的事件（如员工完成工作、雇佣好友、被收费/掠夺、贴罚单等）才展示
        if(!m.text) break;
        h += `<div class="msg-card" data-mid="${m.mid}">
          <div class="msg-card-time">${timeStr}</div>
          <div class="msg-card-body">${m.text}</div>
        </div>`;
        break;

      default:
        // 其他未定义类型不展示
        break;
    }
  });
  h += '</div>';
  mc.innerHTML = h;
  // 标记已读
  S.messages.forEach(m => m.read = true);
  updateNavDots();
}
function addMsg(type, text, extra){
  S.messages.push({ mid:uid(), type, text, ts:now(), read:false, ...extra });
  save();
  if(current==='messages') renderMsgTab();
  updateNavDots();
}
/* 清理由模拟器生成的虚假动态类型（这些类型只来自 startMsgSim，游戏中不会真实发生） */
function cleanupFakeMessages(){
  if(!S.messages || !S.messages.length) return;
  const FAKE_TYPES = ['friend_req','reward','emp_poached','car_ticket','self_hired','self_poached','self_fired'];
  const before = S.messages.length;
  S.messages = S.messages.filter(m => !FAKE_TYPES.includes(m.type));
  if(S.messages.length !== before){ save(); }
}

/* 原模拟消息生成器：动态只应展示真实发生的事件，故禁用随机伪造事件生成 */
function startMsgSim(){ /* disabled: 不再生成虚假动态 */ }

/* 消息创建便捷函数 */
function msgFriendReq(fromName, fromUid){
  addMsg('friend_req', '', {fromName, fromUid});
}
function msgReward(text, amount, rewardType, reward){
  addMsg('reward', text, {amount, rewardType:rewardType||'invite', reward:reward||{}, claimed:false});
}
function msgEmpPoached(empName, empIdx, poacherName, poacherUid, networth){
  addMsg('emp_poached', '', {empName, empIdx, poacherName, poacherUid, networth});
}
function msgCarTicket(carName, carId, friendName, friendUid, duration, amount){
  addMsg('car_ticket', '', {carName, carId, friendName, friendUid, duration, amount});
}
function msgSelfHired(employerName, employerUid, networth){
  addMsg('self_hired', '', {employerName, employerUid, networth});
}
function msgSelfPoached(poacherName, poacherUid, oldEmployer, networth){
  addMsg('self_poached', '', {poacherName, poacherUid, oldEmployer, networth});
}
function msgSelfFired(employerName, employerUid, networth){
  addMsg('self_fired', '', {employerName, employerUid, networth});
}

/* ==================== A19 欢乐夺宝 ==================== */
// 夺宝奖励配置（匹配原型截图）
const GACHA_REWARDS = [
  {type:'stamina', val:3, weight:12.2, label:'3次夺宝', color:'#06b6d4', icon:'🎡'},
  {type:'dollars', val:40000, weight:12.2, label:'4万', color:'#f59e0b', icon:DOLLAR_IC},
  {type:'plunder', val:0.9, weight:3.05, label:'掠夺', color:'#dc2626', icon:'⚔️'},
  {type:'dollars', val:4000, weight:61, label:'4000', color:'#3b82f6', icon:DOLLAR_IC},
  {type:'stamina', val:2, weight:15, label:'2次夺宝', color:'#0891b2', icon:'🎡'},
  {type:'dollars', val:100000, weight:6.1, label:'10万', color:'#ef4444', icon:DOLLAR_IC},
  {type:'fee', val:0.5, weight:8.133333, label:'收费', color:'#a855f7', icon:'📋'},
  {type:'dollars', val:10000, weight:24.4, label:'1万', color:'#22c55e', icon:DOLLAR_IC},
];
// 计算总权重（实际抽取概率仍按权重规则）
const GACHA_TOTAL_WEIGHT = GACHA_REWARDS.reduce((s,r)=>s+r.weight,0);
// 转盘显示扇区等宽（仅动画表现，与实际概率无关）
let gachaAnglePerReward = [];
{
  const seg = 360 / GACHA_REWARDS.length;
  GACHA_REWARDS.forEach((r, i) => {
    const start = i * seg;
    const end = (i + 1) * seg;
    gachaAnglePerReward.push({start, end, reward:r});
  });
}

function renderGacha(){
  openModal(`
    <div class="modal-title-bar">
      <span class="modal-title-text">欢乐夺宝</span>
      <span class="modal-close-x" data-action="close-modal">×</span>
    </div>
    <div class="gacha-modal-body">
      <div class="gacha-wheel-wrap">
        <div class="gacha-wheel" id="gwheel"></div>
        <div class="gacha-wheel-center" id="gwCenter">30/30</div>
      </div>
      <div id="gnext" class="gacha-countdown"></div>
      <button class="gacha-spin" data-action="gacha-spin">📺 观看一次广告</button>
      <div class="gacha-result" id="gresult">每次观看广告可转动一次</div>
    </div>
  `);
  renderGachaWheel();
  updateStamina();
}
/* ---------- 夺宝转盘渲染（图标+深色标签+广告次数计数器） ---------- */
function renderGachaWheel(){
  const wheel = $('#gwheel'); if(!wheel) return;
  // 用 conic-gradient 构建转盘扇区
  let gradientParts = [];
  let labelsHtml = '';
  GACHA_REWARDS.forEach((r, i) => {
    const ap = gachaAnglePerReward[i];
    const midAngle = (ap.start + ap.end) / 2;
    const rad = midAngle * Math.PI / 180 - Math.PI/2; // -90度起算
    // 图标位置（距中心68%）
    const ix = 50 + 46 * Math.cos(rad);
    const iy = 50 + 46 * Math.sin(rad);
    // 标签条位置（距中心50%）
    const tx = 50 + 33 * Math.cos(rad);
    const ty = 50 + 33 * Math.sin(rad);
    gradientParts.push(`${r.color} ${ap.start.toFixed(1)}deg ${ap.end.toFixed(1)}deg`);
    // 图标：emoji(长度≤2) / 已是<img>标签(如刀乐图标) / 图片路径 三种情况
    let iconHtml;
    const icStyle = `position:absolute;left:${ix}%;top:${iy}%;transform:translate(-50%,-50%) rotate(${midAngle}deg) scale(.9);width:24px;height:24px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))`;
    if(typeof r.icon === 'string' && r.icon.length <= 2){
      iconHtml = `<span style="position:absolute;left:${ix}%;top:${iy}%;transform:translate(-50%,-50%) rotate(${midAngle}deg);font-size:22px;line-height:1;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">${r.icon}</span>`;
    } else if(typeof r.icon === 'string' && r.icon.startsWith('<img')){
      // 已是完整 <img> 标签，直接注入并附加定位样式
      iconHtml = r.icon.replace('<img', `<img style="${icStyle}"`);
    } else {
      iconHtml = `<img src="${r.icon}" style="${icStyle}">`;
    }
    // 深色标签条
    labelsHtml += iconHtml;
    labelsHtml += `<span style="position:absolute;left:${tx}%;top:${ty}%;transform:translate(-50%,-50%) rotate(${midAngle}deg);background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.5)">${r.label}</span>`;
  });
  wheel.style.background = `conic-gradient(from 0deg, ${gradientParts.join(', ')})`;
  wheel.innerHTML = labelsHtml;
  // 更新中心计数器
  updateGachaCenter();
}
/* 夺宝次数获取统一从这里走。
   注意：签到 / 前日登录 / 欢乐夺宝获取 的夺宝次数【允许超出上限 12】，
   例如 11/12 + 签到5次 → 16/12（可用来到16次）。
   只有【自然恢复】才封顶在 GACHA_STAMINA_MAX（见 tick 中的恢复逻辑）。 */
function gainGachaStamina(n){
  if(!S.gacha || typeof S.gacha !== 'object') S.gacha = { stamina: GACHA_STAMINA_MAX, lastTs: now() };
  S.gacha.stamina = (S.gacha.stamina || 0) + (n||0);
}
function updateGachaCenter(){
  const c = $('#gwCenter'); if(c) c.textContent = `${S.gacha.stamina}/${GACHA_STAMINA_MAX}`;
}

/* ---------- 广告次数显示（倒计时 + 中心计数器更新） ---------- */
function updateStamina(){
  // 中心计数器更新
  updateGachaCenter();
  // 倒计时文字
  const nx = $('#gnext');
  if(nx){
    if(S.gacha.stamina >= GACHA_STAMINA_MAX) nx.textContent = '';
    else {
      const elapsed = now() - S.gacha.lastTs;
      const left = GACHA_RECOVER_MS - (elapsed % GACHA_RECOVER_MS);
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      nx.textContent = `距离下一次广告次数恢复还有${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }
  }
}

/* ---------- 夺宝标签页内容（抢夺/收费/摇号） ---------- */
let gachaRevengeTab = 'revenge';
function renderGachaTab(){
  const tc = $('#gachaTabContent'); if(!tc) return;
  // 更新tab激活状态
  $$('.gr-tab').forEach(t=>t.classList.toggle('active', t.dataset.grtab === gachaRevengeTab));

  if(gachaRevengeTab === 'lottery'){
    // 摇号：D级车掠夺列表
    renderLotteryPanel(tc);
  } else {
    // 抢夺/收费：好友列表
    renderRevengeList(tc);
  }
}
function renderRevengeList(container){
  const targets = S.friends.map(fr => ({
    uid: fr.uid, name: fr.name, label: `${fr.name} 的车行`
  }));
  let h = '<div class="revenge-list">';
  if(gachaRevengeTab === 'revenge'){
    h += '<div class="fs-12 text-mut mb-4" style="padding:8px 0">选择目标进行掠夺，获得对方资产的一定比例</div>';
  } else {
    h += '<div class="fs-12 text-mut mb-4" style="padding:8px 0">选择目标收取费用，获得对方产量的50%</div>';
  }
  targets.slice(0,5).forEach(t => {
    const actionLabel = gachaRevengeTab === 'revenue' ? '收费' : (gachaRevengeTab === 'revenge' ? '掠夺' : '收费');
    const actionData = gachaRevengeTab === 'revenue' ? 'gacha-fee' : 'gacha-plunder';
    h += `<div class="revenge-item">
      <span class="fw-800 fs-12">${t.label}</span>
      <div>
        <button class="revenge-btn btn-ghost btn-sm" data-action="${actionData}" data-target="${t.uid}">${actionLabel}</button>
      </div>
    </div>`;
  });
  h += '</div>';
  container.innerHTML = h;
}
function renderLotteryPanel(container){
  // 摇号：从D级车池中随机出车，可掠夺
  const dCars = CAR.filter(c => c.rating === 'D').slice(0, 5);
  let h = `<div class="fs-12 text-mut mb-4" style="padding:8px 0">摇号抽取D级车辆，消耗1次广告</div><div class="order-list">`;
  dCars.forEach(c => {
    h += `<div class="order-item">
      <div class="order-item-thumb">${thumb(c.id)}</div>
      <div class="order-item-info">
        <div class="order-item-name">${colorName(c.name)} ${ratingBadge(c.rating)}</div>
        <div class="order-item-price">价值 ${f(c.value)}</div>
      </div>
      <button class="btn-primary btn-sm" data-action="lottery-draw" data-cid="${c.id}">掠夺</button>
    </div>`;
  });
  h += '</div>';
  container.innerHTML = h;
}

/* ---------- 转一次（带动画） ---------- */
let gachaSpinning = false;
function gachaSpin(){
  if(gachaSpinning){ toast('正在转动中...'); return; }
  if(S.gacha.stamina <= 0){ toast('今日广告次数已用完，请等待恢复'); return; }

  // 调用原生激励视频广告，成功后才扣除次数并转盘（浏览器环境无SDK自动降级）
  const doSpin = () => {
    S.gacha.stamina--;
    S.gacha.lastTs = now();
    gachaSpinning = true;

    // 按权重随机选择奖励
    const totalW = GACHA_TOTAL_WEIGHT;
    let roll = Math.random() * totalW;
    let selectedIdx = 0;
    for(let i=0; i<GACHA_REWARDS.length; i++){
      roll -= GACHA_REWARDS[i].weight;
      if(roll <= 0){ selectedIdx = i; break; }
    }
    const selected = GACHA_REWARDS[selectedIdx];

    // 计算目标角度（扇区中心）
    const ap = gachaAnglePerReward[selectedIdx];
    const targetAngle = (ap.start + ap.end) / 2;
    // 总旋转角度 = 基础圈数(5-8圈) + 目标偏移
    // conic-gradient从0deg(顶部)顺时针增长，指针在顶部(12点方向)
    // 要让目标扇区转到顶部，需逆时针旋转targetAngle度
    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5-8圈
    const finalAngle = extraSpins * 360 + targetAngle;

    // 应用旋转动画
    const wheel = $('#gwheel');
    if(wheel){
      wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${-finalAngle}deg)`;
    }

    // 动画结束后结算
    setTimeout(()=>{
      gachaSpinning = false;
      if(wheel) wheel.style.transition = '';

      // 结算奖励
      let msg = '';
      if(selected.type === 'dollars'){
        S.dollars += selected.val; msg = `🎉 ${selected.label}！获得 ${f(selected.val)} 刀乐`;
        showFloatGain(`${DOLLAR_IC}<span>刀乐+${f(selected.val)}</span>`, '#gwCenter');
      } else if(selected.type === 'stamina'){
        gainGachaStamina(selected.val + 1); // +1 抵消本次 spin 消耗的 1 次，确保"3次夺宝"实际净得+3
        msg = `🎡 ${selected.label}！获得 +${selected.val} 次夺宝`;
      } else if(selected.type === 'fee' || selected.type === 'plunder'){
        // 收费/掠夺：跳转到目标场景（好友车行样式+遮罩+操作按钮）
        const target = pickGachaTarget();
        const mode = selected.type; // 'fee' | 'plunder'
        _gachaEnterFrom = 'spin';
        // 先渲染目标场景，渲染成功后再关闭夺宝弹窗。
        // 这样即使渲染异常也不会出现"弹窗已关却回到主界面"的尴尬。
        try {
          renderGachaTargetScene(mode, target);
          closeModal(); // 关闭夺宝弹窗
        } catch(err){
          console.error('[gacha] 目标场景渲染失败，回退到夺宝弹窗：', err);
          closeModal();
          renderGacha(); // 渲染失败时回到夺宝，而不是主界面
        }
        return; // 跳过后续的result显示和save
      }

      const res = $('#gresult');
      if(res) res.innerHTML = `<span style="color:var(--accent);font-weight:900">${msg}</span>`;

      save(); updateHUD(); updateStamina();
    }, 4200);
  };

  if(window.ChexingSDK){
    toast('正在加载广告...');
    gachaSpinning = true; // 锁定，防止广告加载期间重复点击
    window.ChexingSDK.showRewardAd().then(result => {
      if(result && result.success){ doSpin(); }
      else { gachaSpinning = false; toast('广告还在准备中，请稍后再试'); }
    }).catch(() => { gachaSpinning = false; toast('广告加载失败，请稍后重试'); });
  } else {
    doSpin();
  }
}
/** 从好友列表入口进入收费/掠夺目标场景：跳转到对方家界面，而非弹窗内直接结算 */
function openGachaTargetFromFriend(targetUid, mode){
  if(S.gacha.stamina <= 0){ toast('今日广告次数已用完'); return; }
  S.gacha.stamina--;
  const fr = S.friends.find(f=>f.uid===targetUid);
  if(!fr){ toast('目标不存在'); return; }
  const target = { uid:fr.uid, name:fr.name, bestCarId:fr.bestCarId||1, assets:fr.assets||rnd(50000,500000), isFriend:true };
  _gachaEnterFrom = 'friend';
  closeModal(); // 关闭夺宝弹窗，避免弹窗盖住目标场景
  renderGachaTargetScene(mode, target);
  updateStamina();
}

/* ==================== 夺宝收费/掠夺目标场景 ==================== */

// 当前收费/掠夺目标（全局状态）
let _gachaTarget = null; // { uid, name, bestCarId, assets, accrued, ... }
let _gachaMode = '';     // 'fee' | 'plunder'
let _gachaEnterFrom = 'spin'; // 'spin' | 'friend' — 进入目标场景的来源，控制"返回"去向
let _inGachaTarget = false; // 是否正处于收费/掠夺目标场景（作为独立屏幕状态，避免被误判为home而回退）

/** 从资产相近的30个虚拟玩家中随机抽取一个目标 */
function pickGachaTarget(){
  const myNet = S.inst.reduce((s,i)=>s+(CAR_BY_ID[i.carId]?.value||0),0) || 50000;
  // 构建候选池：好友 + 真实玩家 + 额外生成的虚拟玩家，凑够30个
  let pool = [];
  // 好友
  S.friends.forEach(fr => {
    pool.push({uid:fr.uid, name:fr.name, bestCarId:fr.bestCarId||1, assets:fr.assets||rnd(50000,500000), isFriend:true});
  });
  // 真实玩家
  REAL_PLAYER_POOL.forEach(p => {
    if(!pool.some(x=>x.uid===p.uid)) pool.push({...p, isFriend:false});
  });
  // 补充虚拟玩家到30个
  const VIRTUAL_NAMES = ['车神老王','飙车族长','极速小子','赛道之王','漂移大师','涡轮少年','引擎狂人','弯道杀手','直线飞人','轮胎专家'];
  while(pool.length < 30){
    const vi = pool.length % VIRTUAL_NAMES.length;
    pool.push({
      uid:'vg_'+pool.length,
      name:VIRTUAL_NAMES[vi]+(pool.length>9?pool.length:''),
      bestCarId: CAR[rndi(0,CAR.length-1)].id,
      assets:rnd(Math.max(10000, myNet*0.5), myNet*2),
      isFriend:false
    });
  }
  // 按资产相近度排序，取前30个
  pool.sort((a,b)=>Math.abs(a.assets-myNet) - Math.abs(b.assets-myNet));
  return pick(pool.slice(0, 30));
}

/**
 * 渲染收费/掠夺目标场景（全屏好友车行底图 + 半透明遮罩 + 中央按钮）
 * @param {string} mode - 'fee'(收费50%) | 'plunder'(掠夺100%)
 * @param {object} target - 目标玩家信息
 */
function renderGachaTargetScene(mode, target){
  _gachaMode = mode;
  _gachaTarget = target;
  _inGachaTarget = true;     // 进入收费/掠夺目标场景（独立屏幕状态）
  current = 'gachaTarget';  // 标记为独立屏幕，tick/home刷新不再误判为home
  visiting = false;
  // 关键：移除 view-home 类，否则 #game.view-home #screen { display:none } 会隐藏目标场景
  const g = $('#game'); if(g) g.classList.remove('view-home');

  // 计算预计收入
  const ratio = mode === 'fee' ? 0.5 : 1.0;
  const targetAccrued = target.accrued || Math.floor(target.assets * rnd(0.001, 0.01));
  const baseAmount = Math.floor(targetAccrued * ratio);
  const minHours = mode === 'fee' ? 1 : 2;
  const guarantee = Math.floor(totalIncomePerMin() * 60 * minHours);
  const finalAmount = Math.max(baseAmount, guarantee);

  const modeLabel = mode === 'fee' ? '收费' : '掠夺';
  const hasRevenge = (S.gachaAttacks && S.gachaAttacks.length > 0);

  // 构建好友车行底图（同拜访好友布局）
  const sc = $('#screen');
  if(!sc){ openModal('渲染失败'); return; }

  sc.innerHTML = `
    <div class="vf-titlebar">
      <button class="tb-btn tb-back" data-action="gacha-target-back">‹ 返回</button>
      <span class="vf-title">欢乐夺宝</span>
      <span></span>
    </div>

    <!-- 好友信息头部（同拜访好友） -->
    <div class="vf-header">
      <div class="vf-left-col">
        <div class="vf-avatar-wrap"><div class="vf-avatar-ph">${DEF_AVA}</div></div>
        <div class="vf-stats-col">
          <div class="vf-stat-row"><span class="vf-stat-icon">🏆</span>身价：<b>${f(target.networth||0)}</b></div>
          <div class="vf-stat-row"><span class="vf-stat-icon">${ASSET_IC}</span>资产：<b>${f(target.assets||0)}</b></div>
        </div>
      </div>
      <div class="vf-right-col">
        <div class="vf-name-field">${target.name}</div>
      </div>
    </div>

    <!-- 车位区域（模拟好友车行） -->
    <div class="gt-body-wrap">
      <div class="parking-grid">
        ${renderGachaTargetCars(target)}
      </div>
      <!-- 全屏半透明遮罩 + 中央操作按钮 -->
      <div class="gt-full-overlay">
        <button class="gt-action-btn" data-action="execute-gacha-action">${modeLabel}</button>
        <div class="gt-expected">预计收入${f(finalAmount)}刀乐</div>
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="gt-bottom">
      ${hasRevenge ? `<button class="gt-revenge-btn" data-action="open-revenge-modal">复仇</button>` : ''}
    </div>
  `;
}

/** 从收费/掠夺目标场景返回（统一入口，避免误回到主界面） */
function returnFromGachaTarget(){
  _inGachaTarget = false;
  // 恢复 view-home 类（返回后显示夺宝弹窗，底层应为主界面）
  const g = $('#game'); if(g) g.classList.add('view-home');
  if(_gachaEnterFrom === 'friend'){
    renderGacha();      // 重建夺宝弹窗
    renderGachaTab();   // 回到好友列表/抢夺标签页
  } else {
    renderGacha();
  }
}

/** 渲染目标玩家的车辆卡片（2-4辆随机车） */
function renderGachaTargetCars(target){
  let h = '';
  const carCount = 2 + rndi(0, 2); // 2-4辆
  for(let i=0; i<carCount; i++){
    let carId = target.bestCarId || 1;
    if(i > 0) carId = CAR[rndi(0, Math.min(CAR.length-1, 80))].id;
    const c = CAR_BY_ID[carId] || CAR_BY_ID[1];
    const cap = c.capacity || 5000;
    const earned = Math.floor(cap * rnd(0.3, 0.95));
    const pct = Math.min(100, (earned/cap)*100);
    h += `<div class="park-card">
      <div class="pc-income-area">
        <div class="pc-income-val"><span class="pc-curr">${DOLLAR_IC}${f(earned)}</span></div>
        <div class="pc-prog-bar"><div class="pc-prog-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="pc-body">
        ${ratingBadge(c.rating)}
        <div class="pc-img-wrap">
          ${carImg(c.id, 140, 90)}
          ${logoImg(c.brand)}
        </div>
        <div class="pc-car-name">${c.name}</div>
      </div>
    </div>`;
  }
  return h;
}

/** 执行收费/掠夺动作 */
function executeGachaAction(){
  if(!_gachaTarget){ toast('目标丢失'); return; }

  const mode = _gachaMode;
  const ratio = mode === 'fee' ? 0.5 : 1.0;
  const modeLabel = mode === 'fee' ? '收费' : '掠夺';

  // 计算实际收入（保底与预计一致：收费1h、掠夺2h）
  const targetAccrued = _gachaTarget.accrued || Math.floor((_gachaTarget.assets||50000) * rnd(0.001, 0.01));
  const baseAmount = Math.floor(targetAccrued * ratio);
  const minHours = mode === 'fee' ? 1 : 2;
  const guarantee = Math.floor(totalIncomePerMin() * 60 * minHours);
  const finalAmount = Math.max(baseAmount, guarantee);

  // 扣除体力（已在转盘时扣除，这里不再扣）
  S.dollars += finalAmount;

  // 记录消息
  const msg = `${modeLabel} ${_gachaTarget.name} ${f(finalAmount)} 刀乐`;
  toast(msg);
  addMsg('system', `${modeLabel === '收费'?'📋':'⚔️'} ${msg}`);

  save(); updateHUD();

  // 返回夺宝界面
  _inGachaTarget = false;
  const g = $('#game'); if(g) g.classList.add('view-home');
  renderGacha();
}

/** 打开复仇弹窗 */
function renderRevengeModal(){
  if(!S.gachaAttacks || S.gachaAttacks.length === 0){ toast('暂无可复仇的目标'); return; }

  const modeLabel = _gachaMode === 'fee' ? '收费' : '掠夺';
  const actionData = _gachaMode === 'fee' ? 'revenge-fee' : 'revenge-plunder';

  let h = '<div class="modal-title-bar">';
  h += '<span class="modal-title-text">复仇</span>';
  h += '<span class="modal-close-x" data-action="close-revenge-modal">×</span>';
  h += '</div>';
  h += '<div class="revenge-modal-body"><div class="revenge-list">';

  S.gachaAttacks.forEach(att => {
    const fr = S.friends.find(f=>f.uid===att.attackerUid) ||
              REAL_PLAYER_POOL.find(p=>p.uid===att.attackerUid) ||
              {uid:att.attackerUid, name:att.attackerName||'未知玩家', bestCarId:1};
    const c = CAR_BY_ID[fr.bestCarId] || CAR_BY_ID[1];
    const revBase = Math.floor((fr.assets||50000) * rnd(0.0005, 0.002));
    const revAmt = Math.max(revBase, Math.floor(totalIncomePerMin() * 5));

    h += `<div class="rev-item">
      <div class="rev-item-left">
        <div class="rev-avatar-ph">${DEF_AVA}</div>
        ${ratingBadge(c.rating)}
        <div class="rev-car-thumb">${thumb(c.id)}</div>
      </div>
      <div class="rev-item-center">
        <div class="rev-name">${fr.name}</div>
        <div class="rev-expected">预计收入${f(revAmt)}刀乐</div>
      </div>
      <div class="rev-item-right">
        <button class="rev-action-btn btn-ghost btn-sm" data-action="${actionData}" data-rev-uid="${att.attackerUid}" data-rev-amt="${revAmt}">${modeLabel}</button>
      </div>
    </div>`;
  });

  h += '</div></div>';
  openModal(h);
}

/** 执行复仇 */
function executeRevenge(revUid, revAmt){
  const att = S.gachaAttacks.find(a=>a.attackerUid===revUid);
  if(!att){ toast('目标不存在'); return; }

  const modeLabel = _gachaMode === 'fee' ? '收费' : '掠夺';
  S.dollars += revAmt;
  toast(`复仇${modeLabel}成功！获得 ${f(revAmt)} 刀乐`);
  addMsg('system', `💢 你向 ${att.attackerName||'该玩家'} 进行了复仇${modeLabel}！`);

  // 移除该条复仇记录
  S.gachaAttacks = S.gachaAttacks.filter(a=>a.attackerUid!==revUid);
  save(); updateHUD(); updateStamina();

  // 关闭弹窗回到场景
  closeModal();
  if(_gachaTarget) renderGachaTargetScene(_gachaMode, _gachaTarget);
}

/* ---------- 摇号：D级车掠夺 ---------- */
function lotteryDraw(carId){
  if(S.gacha.stamina <= 0){ toast('今日广告次数已用完'); return; }
  S.gacha.stamina--; S.gacha.lastTs = now();
  const car = CAR_BY_ID[carId]; if(!car) return;
  // 摇号获得该车（概率基于车辆价值权重）
  showCarGet(car);
  const res = $('#gresult');
  if(res) res.innerHTML = `<span style="color:var(--accent);font-weight:900">🎰 摇号获得 ${car.name}！</span>`;
  save(); updateHUD(); updateStamina(); renderGachaTab();
}

/* ==================== 事件路由 ==================== */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(el){
    const action = el.dataset.action;
    if(e.stopPropagation) e.stopPropagation();
    SFX.unlock(); SFX.play('click');   // 全局按钮点击音效

  switch(action){
    // 导航
    case 'go-back':
      if(_inGachaTarget){ returnFromGachaTarget(); break; }
      if(!closeModal()){ if(visiting){ visiting=false; go('home'); } else if(current!=='home') go('home'); else toast('已在主界面'); }
      break;
    case 'go-home': case 'go-home-from-visit': visiting=false; go('home'); break;
    case 'go-friends': closeModal(); go('friends'); break;
    case 'go-add-friends': closeModal(); go('friends'); rankTab='new'; renderFriendTab(); break;
    case 'go-friend-panel':
      { const sw=$('#swiper'), fp=$('#friendPanel'); if(sw&&fp&&sw.scrollTo){ try{ sw.scrollTo({left:fp.offsetLeft, behavior:'smooth'}); }catch(_){} } setTimeout(updateSwiperDots,350); }
      break;
    case 'go-my-panel':
      { const sw=$('#swiper'), mp=$('#myPanel'); if(sw&&mp&&sw.scrollTo){ try{ sw.scrollTo({left:mp.offsetLeft, behavior:'smooth'}); }catch(_){} } setTimeout(updateSwiperDots,350); }
      break;
    case 'go-more-panel':
      { const sw=$('#swiper'), rp=$('#morePanel'); if(sw&&rp&&sw.scrollTo){ try{ sw.scrollTo({left:rp.offsetLeft, behavior:'smooth'}); }catch(_){} } setTimeout(updateSwiperDots,350); }
      break;
    case 'go-gacha': renderGacha(); break;

    // 顶栏
    case 'open-profile': renderProfile(); break;
    case 'open-share': renderShare(true); break;
    case 'toggle-sound': {
      const muted = !SFX.isMuted();
      SFX.setMuted(muted);
      const sb = $('#tb-sound'); if(sb) sb.textContent = muted ? '🔇' : '🔊';
      if(!muted) SFX.play('pop');   // 取消静音时给一声反馈
      break;
    }
    case 'go-new-friends':
      closeModal();
      go('friends');            // renderFriends 内部会重置 rankTab='asset'
      rankTab = 'new';          // 在其后覆盖，确保默认选中"新的车友"
      renderFriendTab();
      $$('.rank-tab').forEach(t => t.classList.toggle('active', t.dataset.rtab === rankTab));
      break;
    case 'reset-save':
      ask('⚠️ 确定要清空全部进度吗？\n此操作会同时清除云端存档，不可恢复！', ()=>{
        try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
        // 同时清除 TapTap 云存档，避免本地清了云端还在（换设备或重装后恢复出旧档）
        try{ if(window.ChexingSDK && window.ChexingSDK.isTapMiniGame) window.ChexingSDK.deleteCloud().catch(()=>{}); }catch(_){}
        toast('存档已清空，正在重置…');
        setTimeout(()=>location.reload(), 600);
      });
      break;
    case 'open-exchange': renderExchangeModal(); break;
    case 'open-recharge': renderRechargeModal(); break;
    case 'open-firstcharge': renderFirstCharge(); break;
    case 'open-quests': renderQuests(); break;
    case 'toggle-chapter': { const ci = parseInt(el.dataset.ci); questOpen[ci] = !questOpen[ci]; renderQuests(); break; }
    case 'claim-task': claimTask(parseInt(el.dataset.ci), parseInt(el.dataset.no)); break;
    case 'claim-chapter': claimChapter(parseInt(el.dataset.ci)); break;
    case 'view-chapter-reward': viewChapterReward(parseInt(el.dataset.ci)); break;
    case 'close-car-overlay': {
      const ov = document.querySelector('.car-info-overlay');
      if(ov){ ov.classList.remove('cio-visible'); setTimeout(()=>ov.remove(),200); }
      break;
    }
    case 'open-sevenday': renderSevenDay(); break;
    case 'open-market': go('market'); break;
    case 'close-modal':
      // 工作效率转盘出结果后，关闭=确认安排工作
      if(_inGachaTarget){ returnFromGachaTarget(); break; }
      if(_pendingSpinEidx != null && _pendingSpinCiid != null){ confirmSpin(); }
      else { closeModal(); }
      break;

    // 右侧说明抽屉（A02 资产/收入）
    case 'open-asset': openAsset(); break;
    case 'open-income': openIncome(); break;
    case 'close-drawer': closeDrawer(); break;

    // 车位操作
    case 'collect': collectInst(el.dataset.iid); break;
    case 'collect-all': collectAll(); break;
    case 'unlock-spot': unlockSpot(parseInt(el.dataset.idx)); break;
    case 'ticket': ticketFriend(el.dataset.fruid, parseInt(el.dataset.fidx)); break;
    case 'ticket-friend': { const fi=S.friends.findIndex(f=>f.uid===el.dataset.friendUid); if(fi>=0) ticketFriend(fi, parseInt(el.dataset.fspot)); } break;
    case 'ticket-all': ticketAll(); break;
    case 'open-fspot-info': openFspotInfoModal(); break;
    case 'deploy-car': deployCar(el.dataset.iid); break;
    case 'recall-car': recallCar(el.dataset.iid); break;
    case 'recall-from-friend': recallFromFriend(el.dataset.iid); break;

    // 员工
    case 'emp-info': renderEmployeeInfo(parseInt(el.dataset.eidx)); break;
    case 'arrange-work': renderWorkArrange(parseInt(el.dataset.eidx)); break;
    case 'select-car-work': renderWorkSpinner(parseInt(el.dataset.eidx), parseInt(el.dataset.ciid)); break;
    case 'confirm-spin': confirmSpin(); break;
    case 'recall-emp-from-car':
      // 从选车弹窗中点击召回：先关闭弹窗再执行召回
      closeModal();
      recallEmp(parseInt(el.dataset.eidx));
      break;
    case 'fire-emp': fireEmp(parseInt(el.dataset.eidx)); break;
    case 'recall-emp': recallEmp(parseInt(el.dataset.eidx)); break;
    case 'open-hire': renderHireFriend('hire'); break;
    case 'unlock-empslot': unlockEmpSlot(parseInt(el.dataset.eidx)); break;
    case 'do-hire': doHire(el.dataset.fruid, parseInt(el.dataset.cost), el.dataset.mode); break;
    case 'do-poach-busy': toast('对方工作中，无法被挖角'); break;
    case 'hire-tab': renderHireFriend('hire'); break;
    case 'poach-tab': renderHireFriend('poach'); break;

    // 首充/任务/七日
    case 'claim-fc': claimFC(); break;
    case 'fc-watch-ad':
      if((S.fc.adsWatched||0) >= 5){ toast('今日观看次数已用完'); return; }
      if(window.ChexingSDK){
        toast('正在加载广告...');
        window.ChexingSDK.showRewardAd().then(result => {
          if(result && result.success){
            S.fc.adsWatched = (S.fc.adsWatched||0) + 1;
            toast('📺 观看广告完成！('+S.fc.adsWatched+'/5)');
            save(); renderFirstCharge();
          } else {
            toast('广告还在准备中，请稍后再试');
          }
        }).catch(() => { toast('广告加载失败，请稍后重试'); });
      } else {
        S.fc.adsWatched = (S.fc.adsWatched||0) + 1;
        toast('📺 观看广告完成！('+S.fc.adsWatched+'/5)');
        save(); renderFirstCharge();
      }
      break;
    case 'nf-invite-share':
      // 好友面板「邀请」按钮：直接分享，不弹任务面板
      ttShareToTapTap();
      S.stats.shareCount++; save(); updateNavDots();
      syncInviteRewards().then(res => {
        if(res.ok && res.newCount === 0){
          toast('已分享！需有好友通过你的邀请链接\n下载注册后才能获得黄金奖励');
        }
      });
      break;
    case 'fc-invite':
      if((S.fc.friendsInvited||0) >= 5){ toast('邀请名额已满（5/5）'); return; }
      // 分享统一走 TapTap SDK
      ttShareToTapTap();
      renderFirstCharge(); // 内部会先从 SDK 同步真实邀请数据再渲染
      break;
    case 'refresh-invite':
      // 手动刷新邀请进度（从 SDK 拉取真实注册用户）
      syncInviteRewards().then(res => {
        if(res.ok){
          if(res.newCount > 0) toast(`已领取 ${res.newCount} 位新用户的邀请奖励！`);
          else toast('已刷新：暂无新的好友通过邀请链接注册');
        } else {
          toast('邀请数据同步失败，请稍后重试');
        }
        renderFirstCharge();
      });
      break;
    case 'claim-seven': claimSevenDay(parseInt(el.dataset.day)); break;
    case 'reset-seven': resetSevenDay(); break;
    case 'claim-gallery': claimGallery(el.dataset.gid); break;
    case 'view-gallery-car': {
      const cid = parseInt(el.dataset.cid);
      const owned = S.inst.find(i=>i.carId===cid);
      showCarInfo(cid, owned || undefined);
      break;
    }
    case 'view-garage-car': {
      const iid = parseInt(el.dataset.iid);
      const inst = S.inst.find(i=>i.iid===iid);
      if(inst) showCarInfo(inst.carId, inst);
      break;
    }
    case 'view-parked-car-info': {
      const carId = parseInt(el.dataset.carId);
      const iid = parseInt(el.dataset.iid);
      const inst = S.inst.find(i=>i.iid===iid);
      showCarInfo(carId, inst);
      break;
    }

    // 市场
    case 'taoche-buy': taocheBuy(parseInt(el.dataset.ti)); break;
    case 'order-car': orderCar(parseInt(el.dataset.cid), parseInt(el.dataset.price), parseInt(el.dataset.si)); break;
    case 'refresh-order': refreshOrder(); break;
    case 'do-exchange':
      if(el.disabled || S.exch.count >= EXCH_DAILY_LIMIT){ toast('次数不足'); return; }
      doExchange(); break;
    case 'do-recharge': doRecharge(parseInt(el.dataset.ads)); break;
    case 'watch-ad': watchAd(parseInt(el.dataset.tier)); break;
    case 'claim-recharge': claimRecharge(parseInt(el.dataset.tier)); break;

    // 好友/拜访
    case 'visit-friend': renderVisitFriend(el.dataset.fruid); break;
    case 'visit-friend-home': renderVisitFriend(el.dataset.friendUid); break;
    case 'visit-friend-switch': go('friends'); break;
    case 'open-park-at-friend': renderParkAtFriendModal(parseInt(el.dataset.fspotIdx)||0); break;
    case 'park-at-friend': doParkAtFriend(parseInt(el.dataset.iid)); break;
    case 'search-user': searchUser(); break;
    case 'copy-my-uid': {
      const myId = String(S.uid);
      const ok = () => toast('已复制我的ID：' + myId);
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(myId).then(ok).catch(()=>toast('我的ID：'+myId)); }
        else {
          const ta = document.createElement('textarea');
          ta.value = myId; ta.style.position='fixed'; ta.style.opacity='0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          ok();
        }
      }catch(e){ toast('我的ID：' + myId); }
      break;
    }
    case 'accept-friend': acceptFriend(el.dataset.mid); break;
    case 'reject-friend': rejectFriend(el.dataset.mid); break;
    case 'show-user-info': showUserInfoPopup(el.dataset.fruid); break;
    case 'add-friend-rank': addFriend(el.dataset.fruid); break;
    case 'open-giftcode': openGiftCodeModal(); break;
    case 'redeem-giftcode': redeemGiftCode(); break;
    // 改名
    case 'open-rename-modal': openRenameModal(); break;
    case 'confirm-rename': confirmRename(); break;
    case 'random-name':
      const ri = document.getElementById('renameInput');
      if(ri){ let rn = generateRandomName(); while(isNameTaken(rn)) rn = generateRandomName(); ri.value = rn; }
      break;
    // 分享
    case 'quest-share':
      // 任务面板「分享一次游戏」前往按钮：直接 TapTap 分享，不弹任务面板
      ttShareToTapTap();
      S.stats.shareCount++; save(); updateNavDots();
      break;
    case 'share-game': shareGame(); break;
    // TapTap 登录
    case 'tap-login': tapLogin(); break;
    case 'tap-logout': tapLogout(); break;
    // 登录页操作
    case 'splash-tap-login': splashTapLogin(); break;
    case 'splash-skip-login': enterGame(); break;
    // TapTap 七大功能模块
    case 'tt-review': ttReview(); break;
    case 'tt-share': ttShareToTapTap(); break;
    case 'tt-leaderboard': ttOpenLeaderboard(rankTab); break;
    case 'tt-achievements': ttShowAchievements(); break;
    case 'tt-check-update': ttCheckUpdate(); break;
    case 'tt-check-license': ttCheckLicense(); break;

    // 消息
    case 'claim-msg-reward': claimMsgReward(el.dataset.mid); break;

    // 夺宝
    case 'gacha-spin': gachaSpin(); break;
    case 'gacha-fee': openGachaTargetFromFriend(el.dataset.target, 'fee'); break;
    case 'gacha-plunder': openGachaTargetFromFriend(el.dataset.target, 'plunder'); break;
    // 收费/掠夺目标场景
    case 'gacha-target-back':
      _inGachaTarget = false;
      if(_gachaEnterFrom === 'friend'){
        renderGacha();      // 重建夺宝弹窗
        renderGachaTab();   // 回到好友列表/抢夺标签页
      } else {
        renderGacha();
      }
      break;
    case 'execute-gacha-action':
      executeGachaAction(); break;
    case 'open-revenge-modal':
      renderRevengeModal(); break;
    case 'close-revenge-modal':
      // 关闭复仇弹窗后，重新渲染收费/掠夺目标场景（弹窗内容已被替换）
      closeModal();
      if(_gachaTarget) renderGachaTargetScene(_gachaMode, _gachaTarget);
      break;
    case 'revenge-fee': case 'revenge-plunder':
      executeRevenge(el.dataset.revUid, parseInt(el.dataset.revAmt)||0); break;
    case 'grtab':
      gachaRevengeTab = el.dataset.grtab === 'fee' ? 'revenue' : el.dataset.grtab; // fee tab uses revenue logic
      renderGachaTab();
      break;
    case 'lottery-draw':
      lotteryDraw(parseInt(el.dataset.cid));
      break;

    // 分享（所有渠道统一走 TapTap SDK）
    case 'share-wx-moments': case 'share-wx-friends': case 'share-weibo': case 'share-qq':
      closeModal();
      ttShareToTapTap();
      S.stats.shareCount++; save(); updateNavDots();
      syncInviteRewards().then(res => {
        if(res.ok && res.newCount === 0){
          toast('已分享！需有好友通过你的邀请链接\n下载注册后才能获得黄金奖励');
        }
      });
      if(_shareReturnQuests){ _shareReturnQuests = false; renderQuests(); }
      break;
    case 'share-result': renderShare(); break;

    // Tab切换
    case 'switch-gtab':
      garageTab = el.dataset.gtab;
      if(garageTab==='garage') renderGarageTab(); else renderGalleryTab();
      $$('.gg-tab').forEach(t=>t.classList.toggle('active',t.dataset.gtab===garageTab));
      break;
    case 'switch-mtab':
      marketTab = el.dataset.mtab; renderMarketTab();
      $$('.market-tab').forEach(t=>t.classList.toggle('active',t.dataset.mtab===marketTab));
      break;
    case 'rtab':
      rankTab = el.dataset.rtab;
      // 切换主tab时，排名类tab重置子tab为"好友"
      if(rankTab !== 'new') rankSubTab = 'friend';
      renderFriendTab();
      $$('.rank-tab').forEach(t=>t.classList.toggle('active',t.dataset.rtab===rankTab));
      break;
    case 'rsubtab':
      rankSubTab = el.dataset.rsub;
      renderFriendTab();
      break;
    case 'msgtab':
      msgTab = el.dataset.msgtab; renderMsgTab();
      $$('.msg-tab').forEach(t=>t.classList.toggle('active',t.dataset.msgtab===msgTab));
      break;

    // 登录页返回（已废弃，保留防错）
    case 'loading-back': enterGame(); break;
    default: console.log('unknown action:', action);
    }
    return;
  }
  // 底部导航：data-screen 切换
  const navEl = e.target.closest('[data-screen]');
  if(navEl){
    const screen = navEl.dataset.screen;
    if(screen) go(screen);
  }
});

/* ==================== 操作实现 ==================== */
// 统一结算某车累积收益并归零进度条。集中在此，避免各"收车/取回"路径漏重置 → 进度反复不归零
function settleAccrued(inst){
  if(!inst || inst.accrued <= 0) return 0;
  const amt = Math.floor(inst.accrued);
  S.dollars += amt; S.stats.earned += amt; inst.accrued = 0;
  return amt;
}
function collectInst(iid){
  const inst = S.inst.find(i=>i.iid===parseInt(iid)); if(!inst) return;
  if(inst.accrued <= 0){ toast('还没有可收取的金额'); return; }
  const amt = settleAccrued(inst);
  // 双重保险：即使 settleAccrued 已归零，再次显式清零
  inst.accrued = 0;
  SFX.play('coin');
  toast(`收取 +${f(amt)} 刀乐`);
  save(); updateHUD();
  // 用 renderHome() 完整重渲染（含所有面板+员工位+HUD），确保进度条彻底归零
  if(current === 'home') renderHome(); else if(visiting) renderVisitFspots(); else refreshAllParkGrids();
  // 直接 DOM 兜底：找到该实例对应的进度条元素，强制归零（防止 innerHTML 异步/缓存未生效）
  requestAnimationFrame(()=>{
    $$('.pc-collect-inline[data-iid="'+iid+'"]').forEach(btn => {
      const card = btn.closest('.park-card');
      if(!card) return;
      const fill = card.querySelector('.pc-prog-fill');
      if(fill) fill.style.width = '0%';
      const curr = card.querySelector('.pc-curr');
      if(curr) curr.textContent = '0';
    });
  });
}
function collectAll(){
  let total = 0;
  S.inst.forEach(inst => {
    if(inst.loc==='spot' || inst.loc==='atFriend'){ total += settleAccrued(inst); inst.accrued = 0; }  // 双重归零（含好友家）
  });
  if(total <= 0){ toast('没有可收取的金额'); return; }
  // 注意：settleAccrued 内部已将收益累加进 S.dollars / S.stats.earned，此处不再重复累加
  SFX.play('coin');
  toast(`一键收取 +${f(total)} 刀乐`);
  save(); updateHUD();
  if(current === 'home') renderHome(); else refreshAllParkGrids();
}
function refreshAllParkGrids(){
  refreshParkGrid(); refreshParkGrid2(); refreshFspotGrid();
}
function unlockSpot(idx){
  if(idx<0 || idx>=S.spots.length) return;
  if(S.spots[idx].unlocked) return;
  const cost = (D.unlocks.spotCost&&D.unlocks.spotCost[idx]) || (idx+1)*10000;
  ask(`确定花费 ${f(cost)} 刀乐开启新车位吗？`,()=>{
    if(S.dollars < cost){ needDollars(); return; }
    S.dollars -= cost; S.spots[idx].unlocked = true;
    toast(`车位 ${idx+1} 已解锁！`);
    save(); updateHUD(); refreshParkGrid(); refreshMoreParkGrid(); renderOrderLockArea();
  });
}
function ticketFriend(fridx, fidx){
  const fr = S.friends.find((f,i)=>i===fridx); if(!fr) return;
  if(fr.parkedAtMe === null || fr.parkedAtMe === undefined){ toast('该车位没有车辆'); return; }
  if(fr.ticketed){ toast('该好友本次停车已经开过罚单'); return; }
  // 停车时长门槛：至少停留 30 分钟才能开罚单（以真实停车时刻 parkedAtTs 为准，避免 parkAccrued 滞后导致误判）
  const fcarId = fr.parkCarId || fr.bestCarId;
  const pcar = CAR_BY_ID[fcarId];
  const incPerMin = pcar ? incomeOf({carId: pcar.id}) : totalIncomePerMin();
  const parkedMins = fr.parkedAtTs ? Math.floor((now() - fr.parkedAtTs) / 60000)
                                    : Math.floor((fr.parkAccrued || 0) / (incPerMin || 1));
  if(parkedMins < MIN_TICKET_MINUTES){ toast('目标车辆停留时间不足30分钟，无法开罚单'); return; }
  // 罚金 = 该车已累积收益的 50%（窃取一半收益），按真实停车时长重新核算 accrued 以保证准确
  const cap = pcar ? (pcar.capacity || 6300) : 6300;
  const realAccrued = fr.parkedAtTs ? Math.min(incPerMin * (now() - fr.parkedAtTs) / 60000, cap)
                                    : (fr.parkAccrued || 0);
  const fee = Math.floor(realAccrued * 0.5);
  S.dollars += fee; S.stats.earned += fee; S.stats.ticketCount++;
  fr.ticketed = true; // 标记已贴过
  // 好友车被遣送回去（清除停车状态），并重置累积收益
  fr.parkedAtMe = null;
  fr.parkAccrued = 0;
  addMsg('system', `你向 ${fr.name} 的车开了罚单，获得 ${f(fee)} 刀乐`);
  save(); updateHUD(); refreshFspotGrid();
  // 成功弹窗
  openModal(`
    <div class="fspot-ticket-success">
      <div class="fts-text">给好友贴罚单，窃取<span class="fts-amount">${f(fee)}刀乐</span>（50%收益），已遣送其车辆回家。</div>
      <button class="btn-primary" data-action="close-modal">确定</button>
    </div>
  `);
}
function ticketAll(){
  let total = 0, count = 0, skipped = 0;
  S.fspots.forEach((fs,idx) => {
    const parker = S.friends.find(fr => fr.parkedAtMe === idx);
    if(parker && !parker.ticketed){
      const fcarId = parker.parkCarId || parker.bestCarId;
      const pcar = CAR_BY_ID[fcarId];
      const incPerMin = pcar ? incomeOf({carId: pcar.id}) : totalIncomePerMin();
      const parkedMins = parker.parkedAtTs ? Math.floor((now() - parker.parkedAtTs) / 60000)
                                           : Math.floor((parker.parkAccrued || 0) / (incPerMin || 1));
      if(parkedMins < MIN_TICKET_MINUTES){ skipped++; return; } // 停留不足，跳过
      const cap = pcar ? (pcar.capacity || 6300) : 6300;
      const realAccrued = parker.parkedAtTs ? Math.min(incPerMin * (now() - parker.parkedAtTs) / 60000, cap)
                                            : (parker.parkAccrued || 0);
      const fee = Math.floor(realAccrued * 0.5); // 窃取50%累积收益
      total += fee; parker.parkedAtMe = null; parker.parkAccrued = 0; parker.parkedAtTs = null; parker.ticketed = true; S.stats.ticketCount++; count++;
    }
  });
  if(count <= 0){ toast(skipped > 0 ? '需要至少停留30分钟才可以开罚单' : '没有可贴条的车辆'); return; }
  S.dollars += total; S.stats.earned += total;
  addMsg('system', `一键贴条 ${count} 辆车，获得 ${f(total)} 刀乐`);
  save(); updateHUD(); refreshFspotGrid();
  openModal(`
    <div class="fspot-ticket-success">
      <div class="fts-text">给好友贴罚单，窃取<span class="fts-amount">${f(total)}刀乐</span>（50%收益），已遣送其车辆回家。</div>
      <button class="btn-primary" data-action="close-modal">确定</button>
    </div>
  `);
}

/* 好友车位说明弹窗 */
function openFspotInfoModal(){
  openModal(`
    <div class="modal-title">好友车位</div>
    <div class="fspot-info-body">
      <p>这里是专门给好友预留的停车位，好友在这里停车超过<strong style="color:var(--gold)">30分钟</strong>就可以给他贴罚单，窃取<strong style="color:var(--red)">50%的收益</strong>并送他回家。</p>
    </div>
    <button class="btn-primary btn-wide mt-12" data-action="go-friends">去好友家停车</button>
  `);
}

/* 机器人每日在玩家好友车位停一辆车（便于体验/测试贴罚单）。
   - 按本地自然日执行一次：当日已停过则跳过（lastBotParkDay 记录最近执行日）
   - 仅填充空闲且已解锁的 fspot，已在停的不会被覆盖/重复
   - 贴条后该车位当天留空，次日重新停放，循环往复方便重复测试 */
function autoParkBotsDaily(){
  const today = localToday();
  if(S.lastBotParkDay === today) return;
  S.lastBotParkDay = today;
  const fspots = S.fspots || [];
  const used = new Set();
  (S.friends||[]).forEach(fr => { if(fr.parkedAtMe !== null && fr.parkedAtMe !== undefined) used.add(fr.uid); });
  const cands = (S.friends||[]).filter(fr => fr.bestCarId != null && !used.has(fr.uid));
  let ci = 0;
  for(let i=0;i<fspots.length;i++){
    const fs = fspots[i]; if(!fs || !fs.unlocked) continue;
    const occupied = (S.friends||[]).some(fr => fr.parkedAtMe === i);
    if(occupied) continue;
    const fr = cands[ci++]; if(!fr) break;
    fr.parkedAtMe = i;
    fr.parkCarId = fr.bestCarId;
    fr.parkAccrued = 0;
    fr.parkedAtTs = now(); // 记录真实停车时刻，用于按真实时长累积收益
    fr.ticketed = false; // 重新停车后可再次贴罚单
  }
  // 即时刷新展示（若已在主页）
  if(current === 'home') refreshFspotGrid();
}
function deployCar(iid){
  const inst = S.inst.find(i=>i.iid===parseInt(iid)); if(!inst || inst.loc!=='garage') return;
  const spot = freeSpotIdx();
  if(spot < 0){ toast('没有空余车位'); return; }
  inst.loc = 'spot'; inst.spotIdx = spot;
  toast(`${CAR_BY_ID[inst.carId].name} 已出车到车位 ${spot+1}`);
  save(); updateHUD();
  if(current==='home') refreshParkGrid();
  if(current==='garage') renderGarageTab();
}
function recallCar(iid){
  const inst = S.inst.find(i=>i.iid===parseInt(iid)); if(!inst) return;
  // 规则：有员工正在工作的车辆无法收回车库
  if(inst.empIid){
    const emp = S.employees.find(e=>e.iid===inst.empIid);
    if(emp && emp.workEnd > now()){ toast('当前车辆有员工外出工作，暂时无法收回。'); return; }
  }
  settleAccrued(inst);  // 收回时结算收益并归零进度
  inst.loc = 'garage'; inst.spotIdx = -1;
  if(inst.empIid){ const emp=S.employees.find(e=>e.iid===inst.empIid); if(emp){ emp.workCarIid=null; emp.workEnd=0; } inst.empIid=null; }
  toast(`${CAR_BY_ID[inst.carId].name} 已收回车库`);
  save(); updateHUD(); updateEmpbar();
  if(current==='home'){ refreshParkGrid(); refreshParkGrid2(); }
  if(current==='garage') renderGarageTab();
}
function fireEmp(eidx){
  const emp = S.employees[eidx]; if(!emp) return;
  // 规范：工作中的员工无法解雇
  if(emp.workEnd > now()){
    toast(`${emp.name} 正在工作中，无法解雇。请先召回。`); return;
  }
  ask('确认要解雇当前员工吗？',()=>{
    // 清除工作状态
    if(emp.workCarIid){ const inst=S.inst.find(i=>i.iid===emp.workCarIid); if(inst){ inst.empIid=null; inst.bonus=0; } }
    S.employees.splice(eidx,1);
    toast(`已解雇 ${emp.name}`);
    closeModal(); save(); updateHUD(); updateEmpbar();
    if(current==='home') refreshParkGrid();
  });
}
function recallEmp(eidx){
  const emp = S.employees[eidx]; if(!emp) return;
  const cost = 500; // 规范：立即召回固定消耗黄金500
  ask(`确定花费${cost}黄金立即召回该员工么？`,()=>{
    if(S.beans < cost){ needBeans(); return; }
    S.beans -= cost;
    if(emp.workCarIid){ const inst=S.inst.find(i=>i.iid===emp.workCarIid); if(inst){ inst.empIid=null; inst.bonus=Math.max(0,(inst.bonus||0)-0.05); } }
    emp.workCarIid = null; emp.workEnd = 0;
    toast(`${emp.name} 已召回`);
    closeModal(); save(); updateHUD(); updateEmpbar();
    if(current==='home') refreshParkGrid();
  });
}
function unlockEmpSlot(eidx){
  // 工位必须依次解锁：找到第一个未解锁的工位
  const targetIdx = S.empSlots;  // 下一个待解锁的索引（0-based）
  if(targetIdx >= 8){ toast('所有员工位已全部解锁'); return; }
  const costs = D.unlocks.friendSlotCost || [0, 0, 10000, 30000, 100000, 500000, 1000000, 2000000];
  const cost = (costs[targetIdx] != null) ? costs[targetIdx] : 0;
  ask(`确定花费${f(cost)}刀乐开启新的员工位吗？`, ()=>{
    if(S.dollars < cost){ needDollars(); return; }
    S.dollars -= cost;
    S.empSlots = targetIdx + 1;
    toast(`员工位已解锁（共${S.empSlots}个）`);
    save(); updateHUD(); updateEmpbar();
  });
}
function claimGallery(gid){
  const gal = D.galleries.find(g=>g.id===gid); if(!gal || S.gallery[gid]) return;
  // 奖励：黄金（金条）
  const reward = gal.reward || 10000;
  S.beans = (S.beans||0) + reward;
  S.gallery[gid] = true;
  SFX.play('success'); SFX.play('coin');
  toast(`图鉴奖励已领取！+${fbean(reward)} 黄金`);
  save(); updateHUD();
  renderGalleryTab();
}
// 搜索玩家：可传 uid 直接调用，或不传参数则从 #searchUidInput 读取
// 查找顺序：已有好友 → 本地机器人/内置玩家 → TapTap 真实玩家池（必要时实时拉一次排行榜）
async function searchUser(uid){
  const q = (uid !== undefined) ? String(uid).trim() : (function(){ const input = $('#searchUidInput'); return input ? input.value.trim() : ''; })();
  if(!q){ toast('请输入正确的ID'); return; }
  if(String(S.uid) === q){ toast('这是你自己的 ID'); return; }

  let target = S.friends.find(f => String(f.uid) === q) || findAnyPlayer(q);

  // TapTap 环境下再实时拉一次排行榜（对方可能刚上榜，本地缓存还没有）
  if(!target && window.ChexingSDK && window.ChexingSDK.isTapMiniGame){
    toast('正在全服查找…');
    await fetchTapPlayers(true);
    target = findTapPlayer(q);
  }
  if(!target){
    toast(window.ChexingSDK && window.ChexingSDK.isTapMiniGame
      ? '未找到该玩家<br><span style="font-size:12px;opacity:.8">对方需先上过全服排行榜才能被搜到</span>'
      : '请输入正确的ID');
    return;
  }
  // 弹出对方信息面板（面板内自带"加好友"/"删除好友"按钮）
  showUserInfoPopup(q);
}
// 手动添加车友（机器人来自 BOT_POOL，真实玩家来自 REAL_PLAYER_POOL）
function addFriend(fruid){
  if(S.friends.some(f => String(f.uid) === String(fruid))){ toast('已经是好友了'); return; }
  // 1) 玩家自身好友上限
  if(friendCount() >= FRIEND_MAX){ toast('好友数量已达上限'); return; }
  const bot = findAnyPlayer(fruid);   // 含 TapTap 真实玩家
  if(!bot){ toast('找不到该玩家'); return; }
  // 2) 对方好友上限（对方已是满友状态，无法再接收好友申请）
  if((bot.friendsCount || 0) >= FRIEND_MAX){ toast('对方好友数量已达上限'); return; }
  // 机器人自带 networth；真实玩家用资产换算并封顶，保证可雇佣
  const networth = bot.networth || Math.min(3000, calcNetworth(bot.assets));
  S.friends.push(Object.assign({}, bot, { isFriend:true, networth }));
  bot.friendsCount = (bot.friendsCount || 0) + 1; // 模拟：对方好友数 +1
  // TapTap 真实玩家：小游戏平台无关系链/好友申请 API，此处为本地单向关注，如实告知
  if(bot.isTap) toast(`已关注 ${bot.name}<br><span style="font-size:12px;opacity:.8">对方不会收到申请通知</span>`);
  else toast(`已添加 ${bot.name} 为好友`);
  checkFspotUnlock();   // 好友数达标后立即解锁对应好友车位
  refreshFspotGrid();
  save();
  renderFriendTab();
}
function acceptFriend(mid){
  const m = S.messages.find(msg=>msg.mid===mid); if(!m) return;
  // 1) 玩家自身好友上限
  if(friendCount() >= FRIEND_MAX){ toast('好友数量已达上限'); m.claimed = true; save(); renderMsgTab(); return; }
  // 2) 对方好友上限（同意即双方互为好友，对方满友则无法建立）
  const sender = BOT_POOL.find(b => b.uid === m.fromUid) || REAL_PLAYER_POOL.find(p => p.uid === m.fromUid);
  if(sender && (sender.friendsCount || 0) >= FRIEND_MAX){
    toast('对方好友数量已达上限'); m.claimed = true; save(); renderMsgTab(); return;
  }
  if(!S.friends.some(f => f.uid === m.fromUid)){
    const base = sender || { uid:m.fromUid, name:m.fromName, bestCarId:1, assets:rnd(100000,500000), networth:1000 };
    const networth = base.networth || Math.min(3000, calcNetworth(base.assets));
    S.friends.push(Object.assign({}, base, {
      isFriend:true, networth, avatar:'', timesHiredToday:0, lastHiredDay:''
    }));
    if(sender) sender.friendsCount = (sender.friendsCount || 0) + 1; // 模拟：对方好友数 +1
    toast(`已添加 ${m.fromName} 为好友`);
  } else {
    toast('已经是好友了');
  }
  m.claimed = true;
  checkFspotUnlock();   // 同意好友申请后好友数+1，立即解锁对应好友车位
  refreshFspotGrid();
  save(); renderMsgTab();
}
function rejectFriend(mid){
  const idx = S.messages.findIndex(msg=>msg.mid===mid); if(idx<0) return;
  S.messages.splice(idx, 1);
  toast('已拒绝好友申请');
  save(); renderMsgTab();
}
function claimMsgReward(mid){
  const m = S.messages.find(msg=>msg.mid===mid); if(!m || m.claimed) return;
  if(m.reward){ if(m.reward.beans) S.beans += m.reward.beans; if(m.reward.dollars) S.dollars += m.reward.dollars; }
  m.claimed = true;
  toast('奖励已领取！');
  save(); updateHUD(); renderMsgTab();
}

/* ---------- 暴露给外部 ---------- */
window._save = save;
window._state = () => S;

})();
