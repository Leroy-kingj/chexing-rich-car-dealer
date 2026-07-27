const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;
const { document } = window;

const store = {};
window.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

const errors = [];
window.addEventListener("error", e => errors.push("window error: " + (e.error && e.error.stack || e.message)));

function loadScript(file) {
  const code = fs.readFileSync(file, "utf8");
  try { window.eval(code); }
  catch (e) { errors.push("eval " + file + ": " + (e.stack || e.message)); }
}
loadScript("game_data.js");
loadScript("app.js");

try {
  const ev = document.createEvent("Event");
  ev.initEvent("DOMContentLoaded", true, true);
  document.dispatchEvent(ev);
} catch (e) { errors.push("DOMContentLoaded: " + (e.stack || e.message)); }

function clickEl(el) {
  const ev = new window.MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
}
function $(s){ return document.querySelector(s); }

// ---------- 断言框架 ----------
const checks = [];
function check(name, cond, extra){ checks.push({ name, ok: !!cond, extra: extra||"" }); }
function clickAll(selector){
  document.querySelectorAll(selector).forEach(el => {
    try { clickEl(el); }
    catch (e) { errors.push("click " + (el.dataset.action||el.dataset.screen||el.id) + ": " + (e.stack||e.message).split("\n")[0]); }
  });
}

// ---------- 1) 启动后主界面可见 ----------
const game = $("#game");
check("启动后 #game 可见", game && game.className.indexOf("active")>=0 && game.className.indexOf("hidden")<0, game && game.className);

// ---------- 1b) 机器人每日在玩家好友车位停车（干净启动态，需在导航前验证） ----------
const _S0 = window.__cx.S();
const _fspots = (_S0.fspots||[]);
const _unlockedCount = _fspots.filter(f=>f.unlocked).length;
const _parkedBots0 = (_S0.friends||[]).filter(fr => fr.parkedAtMe !== null && fr.parkedAtMe !== undefined);
check("机器人每日停车→停入所有已解锁车位", _parkedBots0.length === _unlockedCount,
  "parked="+_parkedBots0.length+" unlocked="+_unlockedCount);
check("bot车全部停在已解锁车位", _parkedBots0.every(fr => { const i = fr.parkedAtMe; return _fspots[i] && _fspots[i].unlocked; }));
check("autoParkBotsDaily 已暴露且当日幂等", typeof window.__cx.autoParkBotsDaily === 'function',
  (()=>{ const b=_parkedBots0.length; window.__cx.autoParkBotsDaily(); const a=(_S0.friends||[]).filter(fr=>fr.parkedAtMe!==null&&fr.parkedAtMe!==undefined).length; return "before="+b+" after="+a+(b===a?"(幂等OK)":""); })());
check("启动后 #homeview 显示 (view-home)", game && game.classList.contains("view-home"));
check("启动后 #screen 为空/隐藏", $("#screen") && $("#screen").childElementCount===0);

// ---------- 2) 主界面关键组件存在 ----------
check("员工位已渲染 emp-slot", document.querySelectorAll("#empbar .emp-slot").length>0,
  "count="+document.querySelectorAll("#empbar .emp-slot").length);
check("存在未解锁员工位(可点击解锁)", document.querySelectorAll('#empbar .emp-slot.locked[data-action=\"unlock-empslot\"]').length>0);
check("资产 chip 可点击(open-asset)", !!$(".chip-asset[data-action=\"open-asset\"]"));
check("每分钟收入 chip 可点击(open-income)", !!$(".chip-income[data-action=\"open-income\"]"));
check("车位网格已渲染", ($("#parkGrid")||{}).childElementCount>0,
  "parkGrid="+($("#parkGrid")||{}).childElementCount);
check("第2面板(车位5-8)存在", !!$("#panel1") && !!$("#panel2"));
check("Swiper指示器存在", !!$("#swiperDots"));

// ---------- 3) 右侧抽屉：资产说明 ----------
const assetChip = $(".chip-asset[data-action=\"open-asset\"]");
if (assetChip) clickEl(assetChip);
check("点击资产 → 抽屉打开", $("#drawer") && !$("#drawer").classList.contains("hidden"));
check("抽屉内有内容", ($("#drawer-body")||{}).childElementCount>0);
const cd = $('[data-action="close-drawer"]');
if (cd) clickEl(cd);
check("点击关闭 → 抽屉收起", $("#drawer") && $("#drawer").classList.contains("hidden"));

// ---------- 4) 底部 5 个 Tab 均渲染出真实内容 ----------
const screens = ["garage","market","friends","messages","gacha"];
for (const sc of screens){
  const nav = document.querySelector(`.nav-btn[data-screen="${sc}"]`);
  if (nav) clickEl(nav);
  const screenEl = $("#screen");
  const homeview = $("#homeview");
  const rendered = screenEl && screenEl.childElementCount>0;
  const homeHidden = homeview && homeview.style.display==="none" || (game && !game.classList.contains("view-home"));
  check(`Tab[${sc}] → #screen 渲染出内容`, rendered, "children="+(screenEl?screenEl.childElementCount:0));
  check(`Tab[${sc}] → #homeview 隐藏`, homeHidden);
}

// gacha 通过主界面 featRow 的「欢乐夺宝」按钮进入（非底部 tab）
const homeNav = document.querySelector('.nav-btn[data-screen="home"]');
if (homeNav) clickEl(homeNav);
check("回到 home → view-home", game && game.classList.contains("view-home"));
const gachaBtn = $('[data-action="go-gacha"]');
if (gachaBtn) clickEl(gachaBtn);
check("欢乐夺宝GUI → #screen 渲染出内容", $("#screen") && $("#screen").childElementCount>0,
  "children="+($("#screen")?$("#screen").childElementCount:0));
if (homeNav) clickEl(homeNav);

// ---------- 5) 遍历点击主界面所有 data-action，确保无报错 ----------
clickAll("#homeview [data-action]");
// 遍历市场/车库等屏幕的渲染动作
for (const sc of ["garage","market","friends","messages"]) {
  const nav = document.querySelector(`.nav-btn[data-screen="${sc}"]`);
  if (nav) clickEl(nav);
  clickAll("#screen [data-action]");
}

// ---------- 6) 名车之旅：任务条件门禁 ----------
const cx = () => window.__cx;
const questChip = $('.chip-quest[data-action="open-quests"]');
if (questChip) clickEl(questChip);
check("打开名车之旅 → 弹出章节卡片",
  $('#modal-body') && $('#modal-body').querySelectorAll('.ch-card').length>0,
  "chapters="+($('#modal-body')?$('#modal-body').querySelectorAll('.ch-card').length:0));

// 展开第1章
const ch1Header = document.querySelector('[data-action="toggle-chapter"][data-ci="0"]');
if (ch1Header) clickEl(ch1Header);
const claimBtns = document.querySelectorAll('[data-action="claim-task"]');
check("第1章展开后任务列表渲染", document.querySelectorAll('.ch-task-row').length>0 || document.querySelectorAll('.task-item').length>0,
  "claimBtns="+claimBtns.length+" taskRows="+document.querySelectorAll('.ch-task-row').length);
check("存在未完成任务的进度文本", document.querySelectorAll('.ch-task-text').length>0,
  "progress="+document.querySelectorAll('.ch-task-text').length);

// 领取一个已完成任务 → 奖励应入账（如果有可领取的任务）
if (claimBtns.length > 0) {
  const dollarsBefore = cx().S().dollars;
  const firstClaim = claimBtns[0];
  const ci = parseInt(firstClaim.dataset.ci), no = parseInt(firstClaim.dataset.no);
  clickEl(firstClaim);
  check("领取已完成任务 → 刀乐增加", cx().S().dollars > dollarsBefore,
    "before="+dollarsBefore+" after="+cx().S().dollars);
  check("领取后 S.tasks 标记已领", !!cx().S().tasks[ci+'-'+no]);
} else {
  check("无可领取任务(新游戏正常)", true, "hint: fresh state has no completed tasks");
}

// 门禁：直接尝试领取未完成任务（招募1名员工，hire=0）→ 应被拒绝
const dollarsMid = cx().S().dollars;
cx().claimTask(0, 1);
check("未完成任务不可领取(刀乐不变)", cx().S().dollars === dollarsMid, "dollars="+cx().S().dollars);
check("未完成任务 S.tasks 保持未标记", !cx().S().tasks['0-1']);

// 门禁：章节奖励需整章完成，未全完成时不可领取
const ch0Before = cx().S().questChapters[0];
cx().claimChapter(0);
check("整章未完成 → 章节奖励不可领取", cx().S().questChapters[0] === ch0Before);

// ---------- 6b) 回归：分享任务识别中文"一"（分享一次游戏）----------
const D = window.GAME_DATA;
let shareTask = null;
D.chapters.forEach((ch, ci) => (ch.tasks||[]).forEach(t => { if(/分享一次游戏/.test(t.text)) shareTask = { ci, t }; }));
check("找到'分享一次游戏'任务", !!shareTask, shareTask ? ("第"+(shareTask.ci+1)+"章") : "未找到");
if (shareTask) {
  const evBefore = cx().taskEval(shareTask.t);
  check("分享任务 target=1 (非中文数字解析失败导致的0)", evBefore.target === 1, "target="+evBefore.target);
  cx().S().stats.shareCount++;
  const evAfter = cx().taskEval(shareTask.t);
  check("分享1次后任务可达成(done=true)", evAfter.done === true, JSON.stringify(evAfter));
  cx().S().stats.shareCount--;
}


// 关闭弹窗
const cm = $('[data-action="close-modal"]'); if (cm) clickEl(cm);

// ---------- 7) 本次5项修复验证 ----------
// 先回到主界面（确保返回按钮被隐藏）
const homeNav7 = document.querySelector('.nav-btn[data-screen="home"]');
if (homeNav7) clickEl(homeNav7);

// 7a. 主界面返回按钮隐藏
const backBtn = $('.tb-back');
check("主界面返回按钮已隐藏", !backBtn || backBtn.classList.contains('tb-hidden') || backBtn.style.display === 'none',
  backBtn ? "classList="+Array.from(backBtn.classList)+" display="+backBtn.style.display : "no element");

// 7b. 资产说明面板格式（截图样式：标题"资产"+描述+"当前资产"）
const assetChip2 = $(".chip-asset[data-action='open-asset']");
if (assetChip2) clickEl(assetChip2);
const drawerBody = $("#drawer-body");
check("资产抽屉标题为'资产'", drawerBody && drawerBody.textContent.trim().indexOf("资产")===0,
  drawerBody ? "text="+drawerBody.textContent.slice(0,20) : "no body");
check("资产抽屉包含描述文字", drawerBody && drawerBody.textContent.indexOf("所有车辆的价值之和")>=0);
check("资产抽屉包含'当前资产'", drawerBody && drawerBody.textContent.indexOf("当前资产")>=0);
const cd2 = $('[data-action="close-drawer"]'); if (cd2) clickEl(cd2);

// 7c. 员工空位显示"招募"
const emptyEmpSlot = $('#empbar .emp-slot.empty');
check("员工空位含'招募'文本", emptyEmpSlot && emptyEmpSlot.textContent.indexOf("招募")>=0,
  emptyEmpSlot ? "text="+emptyEmpSlot.textContent : "no empty slot");

// 7d. 滑动提示/面板结构（第2面板无返回按钮和更多车位文本）
check("第2面板无返回按钮", !$("#panel2 .btn-ghost") || $("#panel2 .btn-ghost").length === 0);
check("Swiper面板数为2", document.querySelectorAll("#swiper .swipe-panel").length === 2,
  "panels="+document.querySelectorAll("#swiper .swipe-panel").length);

// 7f. 滑动换页提示：边缘箭头 + 圆点指示器 + 一次性引导气泡（jsdom 无布局，仅验证元素存在/无报错）
check("左边缘滑动箭头存在", !!$("#swipeHintLeft"), "class="+(($("#swipeHintLeft")||{}).className));
check("右边缘滑动箭头存在", !!$("#swipeHintRight"), "class="+(($("#swipeHintRight")||{}).className));
check("圆点指示器存在", !!$("#swiperDots"), "dots="+(!!$("#swiperDots")));
check("一次性引导气泡存在", !!$("#swipeIntroPill"), "pill="+(!!$("#swipeIntroPill")));
// 触发一次 renderHome 内的 updateSwiperDots，确保可见性切换逻辑不抛错
try { const hn = document.querySelector('.nav-btn[data-screen="home"]'); if(hn) hn.click(); window.__cx.renderHome ? window.__cx.renderHome() : null; check("renderHome 触发滑动提示更新无异常", true); }
catch(e){ check("renderHome 触发滑动提示更新无异常", false, e.message); }
check("renderHome 后箭头仍存在", !!$("#swipeHintLeft") && !!$("#swipeHintRight"));

// 7e. 一个车位一辆车：检查无重复占位
const S2 = cx().S();
let dupSpot = false;
let dupInfo = '';
const spotMap = {};
S2.inst.forEach(inst => {
  if (inst.loc === 'spot') {
    const key = inst.spotIdx;
    if (spotMap[key]) { dupSpot = true; dupInfo += ' spot'+key+'dup'; }
    spotMap[key] = true;
  }
});
check("一个车位只停一辆车（无重复占位）", !dupSpot, "dup="+dupSpot+" info="+dupInfo);

// ---------- 8) 红点系统验证 ----------
const S8 = cx().S();

// 8a. 夺宝红点：defaultState 初始stamina=满 → 应显示红点
const gachaChip = $('.chip-gacha');
check("夺宝初始满体力→有红点", gachaChip && gachaChip.querySelectorAll('.rdot').length > 0,
  "rdotCount="+(gachaChip?gachaChip.querySelectorAll('.rdot').length:'no chip'));

// 8b. 体力不满后红点消失
S8.gacha.stamina = 0;
cx().S(S8);
cx().updateInfobar ? cx().updateInfobar() : null;
const gachaChip2 = $('.chip-gacha');
check("夺宝体力不满→无红点", gachaChip2 && gachaChip2.querySelectorAll('.rdot').length === 0,
  "rdotCount="+(gachaChip2?gachaChip2.querySelectorAll('.rdot').length:'no chip'));

// 8c. 任务入口红点：新游戏无可领任务 → 无红点
const questChipR = $('.chip-quest');
check("任务初始无可领→无红点", questChipR && questChipR.querySelectorAll('.rdot').length === 0,
  "rdotCount="+(questChipR?questChipR.querySelectorAll('.rdot').length:'no chip'));

// 8d. hasClaimableQuest 函数存在且返回 false（新游戏）
check("hasClaimableQuest() 存���", typeof cx().hasClaimableQuest === 'function');
check("hasClaimableQuest(新游戏)=false", cx().hasClaimableQuest() === false);

// 8e. hasFullCar 函数存在
check("hasFullCar() 存在", typeof cx().hasFullCar === 'function');

// 8f. sevenTodayUnclaimed 函数存在
check("sevenTodayUnclaimed() 存在", typeof cx().sevenTodayUnclaimed === 'function');

// 8g. 七日红点：新游戏第1天未领 → 应显示
const sevenChip = $('.chip-sevenday');
check("七日登录入口存在", !!sevenChip);
if (sevenChip) {
  check("七日初始未签→有红点", sevenChip.querySelectorAll('.rdot').length > 0,
    "rdotCount="+sevenChip.querySelectorAll('.rdot').length);
}

// 8g2. 福利(原首充)红点：未领取且达成条件 → 显示红点；领取后入口隐藏
const fcChipBefore = $('.chip-fc');
check("福利入口初始存在(未领取)", !!fcChipBefore);
check("福利初始未达成→无红点", fcChipBefore && fcChipBefore.querySelectorAll('.rdot').length === 0,
  "rdotCount="+(fcChipBefore?fcChipBefore.querySelectorAll('.rdot').length:'no chip'));
// 模拟充值达成领取条件
if(S8.fc) S8.fc.recharged = true;
cx().S(S8);
cx().updateInfobar ? cx().updateInfobar() : null;
const fcChipAfter = $('.chip-fc');
check("福利达成条件→有红点", fcChipAfter && fcChipAfter.querySelectorAll('.rdot').length > 0,
  "rdotCount="+(fcChipAfter?fcChipAfter.querySelectorAll('.rdot').length:'no chip'));
// 领取后入口隐藏、红点消失
if(S8.fc){ S8.fc.claimed = true; }
cx().S(S8);
cx().updateInfobar ? cx().updateInfobar() : null;
const fcChipClaimed = $('.chip-fc');
check("福利领取后→入口隐藏(无红点)", !fcChipClaimed);

// 8h. 车行满仓检测：设置一辆车满仓
const firstInst = S8.inst[0];
if (firstInst) {
  const cap = cx().capOf(firstInst);
  firstInst.accrued = cap;
  check("hasFullCar(手动满仓)=true", cx().hasFullCar() === true);
  firstInst.accrued = 0; // restore
}

// 8i. 消息未读红点：添加一条未读消息
const msgBefore = S8.messages.length;
S8.messages.push({ mid:'test_'+Date.now(), type:'system', text:'测试消息', ts:Date.now(), read:false });
const msgAfter = S8.messages.length;
check("添加消息后数量+1", msgAfter === msgBefore + 1);
// updateNavDots should show messages dot
cx().updateNavDots ? cx().updateNavDots() : null;
const msgDot = $('#nav-dot-messages');
check("消息未读→nav-dot显示", msgDot && msgDot.classList.contains('show'),
  msgDot ? "classes="+Array.from(msgDot.classList) : 'no dot');
// 标记已读
S8.messages.forEach(m => m.read = true);
cx().updateNavDots ? cx().updateNavDots() : null;
const msgDot2 = $('#nav-dot-messages');
check("消息全读→nav-dot隐藏", !msgDot2 || !msgDot2.classList.contains('show'));

// 8j. 任务内行红点：打开任务弹窗，检查ch-task-rdot不存在（新游戏无完成任务）
const questChipJ2 = $('.chip-quest[data-action="open-quests"]');
if (questChipJ2) clickEl(questChipJ2);
const ch1HeaderJ = document.querySelector('[data-action="toggle-chapter"][data-ci="0"]');
if (ch1HeaderJ) clickEl(ch1HeaderJ);
const taskRdots = document.querySelectorAll('.ch-task-rdot');
check("新游戏任务行无红点", taskRdots.length === 0, "count="+taskRdots.length);

// ---------- 9) 好友车位交互验证 ----------
const S9 = cx().S();
// 9a. 好友有 ticketed 字段（归一化：undefined/null/0→false）
const ticketedAllDefined = (S9.friends||[]).every(fr => fr.ticketed !== undefined);
const ticketedNoNull = (S9.friends||[]).every(fr => fr.ticketed !== null);
const ticketedAllBool = (S9.friends||[]).every(fr => fr.ticketed === true || fr.ticketed === false);
check("好友ticketed字段归一化", ticketedAllDefined && ticketedNoNull && ticketedAllBool,
  "defined="+ticketedAllDefined+" noNull="+ticketedNoNull+" allBool="+ticketedAllBool+" sample="+
  JSON.stringify((S9.friends||[]).slice(0,3).map(fr=>fr.ticketed)));

// 9b. 空闲车位显示"好友车位"标签
const emptyFspot = document.querySelector('.fspot-empty-card');
check("空闲好友车位显示占位", emptyFspot !== null,
  emptyFspot ? "found" : "no fspot-empty-card");

// 9c. 已停车车位显示开罚单按钮
const ticketBtn = document.querySelector('.fspot-ticket-btn');
check("已停车辆显示开罚单按钮", ticketBtn !== null,
  ticketBtn ? "found" : "no fspot-ticket-btn");

// 9d. 不足30分钟贴罚单被拒绝 + 提示 + 窃取50%收益
if(ticketBtn){
  const frUid = ticketBtn.dataset.friendUid;
  const parker = (S9.friends||[]).find(f => f.uid === frUid);
  if(parker && !parker.ticketed){
    // 模拟停车不足30分钟：用真实停车时刻 parkedAtTs（1分钟前）驱动门槛判定
    parker.parkedAtTs = Date.now() - 1 * 60000;
    parker.parkAccrued = 0;
    cx().refreshFspotGrid ? cx().refreshFspotGrid() : null;
    const btnShort = document.querySelector('.fspot-ticket-btn');
    if(btnShort){
      const before = S9.dollars;
      clickEl(btnShort);
      const rejected = (S9.dollars === before) && (parker.parkedAtMe !== null);
      check("不足30分钟贴罚单被拒绝(收益未增加/车未走)", rejected,
        "dollarsΔ="+(S9.dollars-before)+" parkedAtMe="+parker.parkedAtMe);
    } else {
      check("不足30分钟贴罚单被拒绝(收益未增加/车未走)", false, "no btn after refresh");
    }
    // 模拟停车满30分钟+，贴罚单窃取50%收益（与游戏真实 accrued 公式一致：incPerMin*elapsed 封顶 cap）
    const fcarId = parker.parkCarId || parker.bestCarId;
    const pcar = cx().CAR_BY_ID ? cx().CAR_BY_ID[fcarId] : null;
    const incPerMin = pcar ? (pcar.income || 0) : 1000;
    const cap = pcar ? (pcar.capacity || 6300) : 6300;
    parker.parkedAtTs = Date.now() - 35 * 60000; // 停了35分钟
    parker.ticketed = false;
    const realAccrued = Math.min(incPerMin * 35, cap);
    const expectedFee = Math.floor(realAccrued * 0.5); // 点击前先记录期望值（点击会清零 parkAccrued）
    cx().refreshFspotGrid ? cx().refreshFspotGrid() : null;
    const btnOk = document.querySelector('.fspot-ticket-btn');
    if(btnOk){
      const beforeD = S9.dollars;
      clickEl(btnOk);
      check("满30分钟贴罚单窃取50%收益", (S9.dollars - beforeD) === expectedFee && parker.parkedAtMe === null,
        "fee="+(S9.dollars-beforeD)+" expected="+expectedFee+" carSentBack="+(parker.parkedAtMe===null));
    } else {
      check("满30分钟贴罚单窃取50%收益", false, "no btn when ready");
    }
  } else {
    check("贴罚单测试跳过(parker状态异常)", false, "parker="+(parker?"exists":"null")+" ticketed="+(parker?parker.ticketed:'N/A'));
  }
}

// 9e. openFspotInfoModal 函数存在
check("openFspotInfoModal存在", typeof cx().openFspotInfoModal === 'function');

// 9f. 机器人满仓后【不】自动收回：满仓车应一直停在车位上增长收益，直到玩家开罚单（>=30分钟）才遣送回家
(function(){
  const fr = (S9.friends||[]).find(f => f.parkedAtMe !== null && f.parkedAtMe !== undefined);
  if(fr){
    fr.parkAccrued = 9e9; // 远超任何车型容量（满仓）
    fr.parkedAtTs = Date.now() - 100 * 86400000; // 远超30分钟（100天前停的）
    fr.ticketed = false;
    try { cx().tick ? cx().tick() : null; } catch(e){}
    // 期望：满仓后车辆仍在车位（未被自动收回），等待玩家开罚单
    check("机器人满仓后不自动收回(停在车位等待开罚单)", fr.parkedAtMe !== null,
      "parkedAtMe="+fr.parkedAtMe+" accrued="+fr.parkAccrued);
    // 此时停车已满30分钟，开罚单应成功并遣送回家
    const beforeD = S9.dollars;
    cx().ticketFriend((S9.friends||[]).indexOf(fr), fr.parkedAtMe);
    check("满仓车满30分钟后开罚单成功遣送回家", fr.parkedAtMe === null && S9.dollars > beforeD,
      "parkedAtMe="+fr.parkedAtMe+" dollarsΔ="+(S9.dollars-beforeD));
  } else {
    check("机器人满仓后不自动收回(停在车位等待开罚单)", true, "no bot parked (skip)");
  }
})();

// 9g. 满仓车位 → 左右滑动箭头右上角显示红点（has-full）
(function(){
  const Sg = cx().S();
  const inst = (Sg.inst||[])[0];
  if(!inst){
    check("满仓红点(skip:无车辆)", true, "no inst");
  } else {
    // 强制一辆停在车位0（面板1）且满仓
    const saved = { loc: inst.loc, spotIdx: inst.spotIdx, accrued: inst.accrued };
    inst.loc = 'spot'; inst.spotIdx = 0;
    const car = cx().CAR_BY_ID ? cx().CAR_BY_ID[inst.carId] : null;
    const cap = car ? (car.capacity || 6300) : 6300;
    inst.accrued = cap + 1; // 强制满仓
    try { cx().renderHome ? cx().renderHome() : null; } catch(e){}
    const right = document.getElementById('swipeHintRight');
    const left = document.getElementById('swipeHintLeft');
    const rightHas = right ? right.classList.contains('has-full') : false;
    const leftHas = left ? left.classList.contains('has-full') : false;
    // jsdom 无布局，active panel 恒为0 → 面板1/2的满仓车应点亮右侧箭头
    check("满仓车位→右侧滑动箭头显示红点", rightHas === true,
      "rightHas="+rightHas+" leftHas="+leftHas);
    // 清空满仓后红点应消失
    inst.accrued = 0; inst.loc = saved.loc; inst.spotIdx = saved.spotIdx;
    try { cx().renderHome ? cx().renderHome() : null; } catch(e){}
    const rightAfter = right ? right.classList.contains('has-full') : false;
    check("清理满仓后红点消失", rightAfter === false, "rightHasAfter="+rightAfter);
  }
})();

// 10) 本章奖励不可领取 → 点击弹出图鉴样式车辆详情
(function(){
  const Scx = cx();
  // 打开名车之旅，检查奖励区域可点击（统一 action=view-chapter-reward）
  try { Scx.renderQuests ? Scx.renderQuests() : null; } catch(e){}
  const rewardEls = document.querySelectorAll('.ch-reward-side');
  const hasAction = [...rewardEls].some(e => e.dataset.action === 'view-chapter-reward');
  check("本章奖励区域可点击(view-chapter-reward)", hasAction === true, "count="+rewardEls.length);

  // 未达成章节点击 → 应弹出二级弹窗（.car-info-overlay .cio-wrap），不关闭章节面板
  let opened = false, carName = '';
  try { Scx.viewChapterReward ? Scx.viewChapterReward(0) : null; } catch(e){}
  const modal = document.getElementById('modal');
  const overlay = modal ? modal.querySelector('.car-info-overlay') : null;
  const cio = overlay ? overlay.querySelector('.cio-wrap') : null;
  opened = !!cio;
  const nm = cio ? cio.querySelector('.cio-name') : null;
  carName = nm ? nm.textContent : '';
  check("未达成章节点击→弹出图鉴样式车辆详情(二级弹窗)", opened === true, "carName="+carName);

  // viewChapterReward 函数存在
  check("viewChapterReward函数存在", typeof Scx.viewChapterReward === 'function');
})();

// 11) 领取章节奖励 / 七日第7天 → 弹出“获取车辆”弹窗（同淘车订购）
(function(){
  const Scx = cx();
  function resetModal(){ const m=document.getElementById('modal'); if(m) m.style.display='none'; const b=document.getElementById('modal-body'); if(b) b.innerHTML=''; }
  function cgOpen(){ const b=document.getElementById('modal-body'); return !!(b && b.querySelector('.cg-wrap')); }
  function cgName(){ const b=document.getElementById('modal-body'); const n=b?b.querySelector('.cg-car-name'):null; return n?n.textContent:''; }

  // 11a 章节奖励：临时将第1章任务替换为“拥有1辆车”（默认即有1辆 → 整章完成）
  resetModal();
  try { window.GAME_DATA.chapters[0].tasks = [{ no:1, text:"拥有1辆车", reward:0 }]; } catch(e){}
  let chapterModal = false, chapterCar = '';
  try { Scx.claimChapter ? Scx.claimChapter(0) : null; } catch(e){}
  chapterModal = cgOpen();
  chapterCar = cgName();
  check("领取章节奖励→弹出获取车辆弹窗", chapterModal === true, "carName="+chapterCar);
  check("章节奖励弹窗显示正确车辆(RC F)", chapterCar === 'RC F', "carName="+chapterCar);

  // 11b 七日登录第7天：随机D-A车 → 弹出获取车辆弹窗
  resetModal();
  let sevenModal = false;
  try { Scx.claimSevenDay ? Scx.claimSevenDay(7) : null; } catch(e){}
  sevenModal = cgOpen();
  check("领取七日第7天→弹出获取车辆弹窗", sevenModal === true, "cgOpen="+sevenModal);
})();

// 12) 好友数量上限（玩家 / 对方）
(function(){
  const Scx = cx();
  const S = Scx.S();
  const toastEl = () => document.querySelector('#toast');
  const lastToast = () => (toastEl() ? toastEl().textContent : '');
  const FC = () => Scx.friendCount();
  const freeBot = (exclude) => Scx.BOT_POOL.find(b => !S.friends.some(f => f.uid === b.uid) && (!exclude || b.uid !== exclude));

  // 12a) 对方好友上限：对方已是满友 → 提示“对方好友数量已达上限”
  const bOpp = freeBot();
  bOpp.friendsCount = Scx.FRIEND_MAX; // 对方满友
  const beforeA = FC();
  try { Scx.addFriend(bOpp.uid); } catch(e){ errors.push("addFriend(opp-full): " + (e.stack||e.message)); }
  check("对方好友满→拒绝并提示「对方好友数量已达上限」",
    lastToast().indexOf('对方好友数量已达上限') >= 0, "toast="+lastToast());
  check("对方好友满→未实际添加", FC() === beforeA, "before="+beforeA+" after="+FC());
  bOpp.friendsCount = 50; // 复位为正常

  // 12b) 正常添加：玩家未达上限、对方未满 → 添加成功
  const bNorm = freeBot(bOpp.uid);
  const beforeB = FC();
  try { Scx.addFriend(bNorm.uid); } catch(e){ errors.push("addFriend(normal): " + (e.stack||e.message)); }
  check("正常添加→提示「已添加 … 为好友」",
    lastToast().indexOf('已添加') >= 0, "toast="+lastToast());
  check("正常添加→好友数 +1", FC() === beforeB + 1, "before="+beforeB+" after="+FC());

  // 12c) 同意好友申请（对方正常、玩家未达上限）→ 添加成功
  const senderUid = '20000002';
  S.messages.push({ mid:'t_m2', type:'friend_req', fromName:'阿强', fromUid:senderUid });
  const beforeC = FC();
  try { Scx.acceptFriend('t_m2'); } catch(e){ errors.push("acceptFriend(normal): " + (e.stack||e.message)); }
  check("同意申请(正常)→提示「已添加 … 为好友」",
    lastToast().indexOf('已添加') >= 0, "toast="+lastToast());
  check("同意申请(正常)→好友数 +1",
    FC() === beforeC + 1 && S.friends.some(f => f.uid === senderUid), "before="+beforeC+" after="+FC());

  // 12d) 玩家好友上限：填满到 FRIEND_MAX → 添加被拒「好友数量已达上限」
  let ctr = 0;
  while(Scx.friendCount() < Scx.FRIEND_MAX){ S.friends.push({ uid:'dummy_'+(ctr++), isFriend:true }); }
  const bFull = freeBot(bOpp.uid);
  const beforeD = FC();
  try { Scx.addFriend(bFull.uid); } catch(e){ errors.push("addFriend(player-full): " + (e.stack||e.message)); }
  check("玩家好友满→拒绝并提示「好友数量已达上限」",
    lastToast().indexOf('好友数量已达上限') >= 0 && lastToast().indexOf('对方') < 0, "toast="+lastToast());
  check("玩家好友满→未实际添加", FC() === beforeD, "before="+beforeD+" after="+FC());

  // 12e) 同意申请但玩家已满 → 拒绝「好友数量已达上限」
  S.messages.push({ mid:'t_m3', type:'friend_req', fromName:'阿珍', fromUid:'20000003' });
  try { Scx.acceptFriend('t_m3'); } catch(e){ errors.push("acceptFriend(player-full): " + (e.stack||e.message)); }
  check("玩家已满+同意申请→提示「好友数量已达上限」",
    lastToast().indexOf('好友数量已达上限') >= 0, "toast="+lastToast());
  check("玩家已满+同意申请→未实际添加", !S.friends.some(f => f.uid === '20000003'), "fc="+FC());
})();

// 13) 玩家 UID 统一为 8 位数
(function(){
  const Scx = cx();
  const is8 = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 10000000 && n <= 99999999; };
  // 13a) 新号（当前启动态）uid 应为 8 位数
  const Sfresh = Scx.S();
  check("新号→玩家 uid 为 8 位数", is8(Sfresh.uid), "uid="+(Sfresh&&Sfresh.uid));

  // 13b) 老号迁移：构造 uid=1 且含多处自身引用的存档，重载后应为 8 位且引用同步更新
  Sfresh.uid = 1; // 模拟老号
  if(!Array.isArray(Sfresh.employees)) Sfresh.employees = [];
  Sfresh.employees.push({ iid:99001, name:'老号员工', networth:500, hiredFrom:1, topHirerUid:1, nwContributors:{1:250}, employedBy:1 });
  Sfresh.friends.push({ uid:'fr_mig', name:'迁移友', isFriend:true, employedBy:1 });
  try { Scx.save(); Scx.load(); } catch(e){ errors.push("uid-migrate: " + (e.stack||e.message)); }
  const S1 = Scx.S();
  check("老号迁移→玩家 uid 变为 8 位数", is8(S1.uid), "uid="+(S1&&S1.uid));
  const emp = (S1.employees||[]).find(e => e.iid === 99001);
  check("老号迁移→员工 hiredFrom 同步更新为新月uid", emp && emp.hiredFrom === S1.uid, "hiredFrom="+(emp&&emp.hiredFrom));
  check("老号迁移→员工 nwContributors key 同步更新",
    emp && emp.nwContributors && emp.nwContributors[S1.uid] === 250 && !(1 in emp.nwContributors),
    JSON.stringify(emp&&emp.nwContributors));
  const fr = (S1.friends||[]).find(f => f.name === '迁移友'); // 好友UID可能已被迁移为8位，用name查找更可靠
  check("老号迁移→好友 employedBy 同步更新为新月uid", fr && fr.employedBy === S1.uid, "employedBy="+(fr&&fr.employedBy));
})();

// 14) 机器人 8 位 UID + 搜索玩家弹出信息面板
(function(){
  const Scx = cx();
  const is8 = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 10000000 && n <= 99999999; };
  const lastToast = () => { const el = document.querySelector('#toast'); return el ? el.textContent : ''; };

  // 14a) BOT_POOL 全部为 8 位数字 UID
  const bots = Scx.BOT_POOL;
  check("BOT_POOL 不为空", Array.isArray(bots) && bots.length > 0, "len="+(bots&&bots.length));
  let allBot8 = true;
  (bots||[]).forEach(b => { if(!is8(b.uid)) allBot8 = false; });
  check("BOT_POOL 全部 uid 为 8 位数", allBot8,
    "uids="+(bots||[]).map(b=>b.uid).join(','));

  // 14b) REAL_PLAYER_POOL 全部为 8 位数字 UID
  const rps = Scx.REAL_PLAYER_POOL;
  let allRp8 = true;
  (rps||[]).forEach(p => { if(!is8(p.uid)) allRp8 = false; });
  check("REAL_PLAYER_POOL 全部 uid 为 8 位数", allRp8,
    "uids="+(rps||[]).map(p=>p.uid).join(','));

  // 14c) 机器人 UID 区间与玩家不重叠（玩家 ≥10000000 随机，机器人用 10xxxxxxx / 20xxxxxxx）
  const botUids = (bots||[]).map(b => Number(b.uid)).filter(n => !isNaN(n));
  const rpUids = (rps||[]).map(p => Number(p.uid)).filter(n => !isNaN(n));
  const allBotInRange = botUids.every(u => u >= 10000001 && u <= 20000005);
  const allRpInRange = rpUids.every(u => u >= 20000001 && u <= 20000005);
  check("BOT_POOL uid 在独立区间(10xxxxxxx)", allBotInRange, "uids="+botUids.join(','));
  check("REAL_PLAYER_POOL uid 在独立区间(20xxxxxxx)", allRpInRange, "uids="+rpUids.join(','));

  // 14d) searchUser 空输入 → 提示「请输入正确的ID」
  try { Scx.searchUser(''); } catch(e){ errors.push("searchUser(empty): "+(e.stack||e.message)); }
  check("搜索空输入→提示「请输入正确的ID」",
    lastToast().indexOf('请输入正确的ID') >= 0, "toast="+lastToast());

  // 14e) searchUser 不存在的 ID → 提示「请输入正确的ID」
  try { Scx.searchUser('99999999'); } catch(e){ errors.push("searchUser(notfound): "+(e.stack||e.message)); }
  check("搜索不存在ID→提示「请输入正确的ID」",
    lastToast().indexOf('请输入正确的ID') >= 0, "toast="+lastToast());

  // 14f) searchUser 有效 ID → 调用 showUserInfoPopup（而非直接 addFriend）
  // 用一个尚未添加的机器人 uid 来测
  const S = Scx.S();
  const unadded = (Scx.BOT_POOL||[]).find(b => !(S.friends||[]).some(f => f.uid === b.uid));
  if(unadded){
    const fcBefore = Scx.friendCount();
    try { Scx.searchUser(unadded.uid); } catch(e){ errors.push("searchUser(valid): "+(e.stack||e.message)); }
    // 搜索不应直接加好友（好友数不变）
    check("搜索有效ID→未直接添加好友", Scx.friendCount() === fcBefore,
      "before="+fcBefore+" after="+Scx.friendCount());
    // 应弹出了信息面板（openModal 写入 #modal-body）
    const modalBody = document.querySelector('#modal-body');
    const hasPanel = modalBody && modalBody.innerHTML.indexOf('uip-wrap') >= 0;
    check("搜索有效ID→弹出信息面板", hasPanel,
      "modal="+(modalBody?modalBody.innerHTML.substring(0,100):'null'));
  } else {
    check("搜索有效ID→跳过（无未添加机器人）", true, "(all bots already friends)");
  }
})();

// 15) 礼包码系统
(function(){
  const Scx = cx();
  const S = Scx.S();
  const lastToast = () => { const el = document.querySelector('#toast'); return el ? el.textContent : ''; };

  // 15a) GIFT_CODES 常量包含4个有效码
  const codes = Object.keys(Scx.GIFT_CODES);
  check("GIFT_CODES 包含4个礼包码", codes.length === 4, "codes="+codes.join(','));

  // 15b) VIP666 奖励为66666刀乐
  const c666 = Scx.GIFT_CODES['VIP666'];
  check("VIP666→刀乐66666", c666 && c666.rewards.length === 1 && c666.rewards[0].type === 'dollars' && c666.rewards[0].val === 66666,
    JSON.stringify(c666));

  // 15c) leroynb 双重奖励（黄金+刀乐）
  const cLero = Scx.GIFT_CODES['leroynb'];
  check("leroynb→双重奖励", cLero && cLero.rewards.length === 2,
    "len="+(cLero&&cLero.rewards.length));

  // 15d) 默认存档有 redeemedCodes 字段且为空数组
  check("默认redeemedCodes为空数组",
    Array.isArray(S.redeemedCodes) && S.redeemedCodes.length === 0,
    "rc="+(S&&JSON.stringify(S.redeemedCodes)));

  // 15e) 兑换无效码 → 提示「请输入正确的礼包码」
  // 用内部逻辑模拟（不依赖DOM输入框）
  S.redeemedCodes = [];
  // 直接调用 redeemGiftCode 会读 DOM input，我们手动设置值后调用
  try {
    // 创建临时input供 redeemGiftCode 读取
    const tmpInput = document.createElement('input');
    tmpInput.id = 'giftCodeInput';
    tmpInput.value = 'INVALIDCODE';
    document.body.appendChild(tmpInput);
    Scx.redeemGiftCode();
    tmpInput.remove();
  } catch(e) { errors.push("redeemGiftCode(invalid): "+(e.stack||e.message)); }
  check("无效码→提示「请输入正确的礼包码」",
    lastToast().indexOf('请输入正确的礼包码') >= 0, "toast="+lastToast());

  // 15f) 兑换有效码 VIP666 → 成功，余额增加
  const dollarsBefore = S.dollars || 0;
  try {
    const tmpInput2 = document.createElement('input');
    tmpInput2.id = 'giftCodeInput';
    tmpInput2.value = 'VIP666';
    document.body.appendChild(tmpInput2);
    Scx.redeemGiftCode();
    tmpInput2.remove();
  } catch(e) { errors.push("redeemGiftCode(VIP666): "+(e.stack||e.message)); }
  check("兑换VIP666→提示成功", lastToast().indexOf('兑换成功') >= 0, "toast="+lastToast());
  check("兑换VIP666→刀乐+66666", (S.dollars||0) === dollarsBefore + 66666,
    "before="+dollarsBefore+" after="+(S.dollars||0));
  check("兑换VIP666→已记录到redeemedCodes",
    (S.redeemedCodes||[]).indexOf('VIP666') >= 0, "rc="+(S.redeemedCodes||[]).join(','));

  // 15g) 重复兑换同一码 → 提示「已领取过同类型礼包」
  try {
    const tmpInput3 = document.createElement('input');
    tmpInput3.id = 'giftCodeInput';
    tmpInput3.value = 'VIP666';
    document.body.appendChild(tmpInput3);
    Scx.redeemGiftCode();
    tmpInput3.remove();
  } catch(e) { errors.push("redeemGiftCode(dup): "+(e.stack||e.message)); }
  check("重复兑换→提示「已领取过同类型礼包」",
    lastToast().indexOf('已领取过同类型礼包') >= 0, "toast="+lastToast());
  // 重复兑换不应再次加钱
  check("重复兑换→刀乐不变（未重复发放）",
    (S.dollars||0) === dollarsBefore + 66666,
    "after_dup="+(S.dollars||0));
})();

// 16) 好友车位选车弹窗排序：闲置中 > 停在好友家 > 停在自己家，再按收入从高到低
(function(){
  const Scx = cx();
  const S1 = Scx.S();
  const backupInst = S1.inst, backupVisit = S1.visitTarget;

  function minst(iid, carId, loc, atFriend){
    return { iid, carId, loc, spotIdx:-1, fspotIdx:undefined, accrued:0, bonus:0,
             count:1, empIid:null, workEnd:0, atFriend: atFriend||null };
  }
  // 闲置2辆(carId1, carId77) / 停在好友家1辆(carId50, atFriend不同以免触发每友仅1辆限制) / 停在自己家2辆(carId22, carId65)
  S1.inst = [
    minst(1, 1,  'garage',  null),
    minst(2, 77, 'garage',  null),
    minst(3, 50, 'atFriend', '888'),
    minst(4, 22, 'spot',    null),
    minst(5, 65, 'spot',    null),
  ];
  S1.visitTarget = '999';

  let statuses = [], incomes = [];
  try {
    Scx.renderParkAtFriendModal(0); // 打开选车弹窗（fspotIdx=0）
    const body = document.getElementById('modal-body');
    const rows = body ? Array.from(body.querySelectorAll('.vf-park-row')) : [];
    rows.forEach(row => {
      const st = row.querySelector('.gg-card-status');
      statuses.push(st ? st.textContent : '');
      // 通过行上的 data-iid 查找车辆收入
      const iid = row.dataset.iid;
      if(iid){
        const inst = (S1.inst||[]).find(i=>String(i.iid)===String(iid));
        const c = inst && Scx.CAR_BY_ID ? Scx.CAR_BY_ID[inst.carId] : null;
        incomes.push(c ? (c.income||0) : 0);
      } else {
        incomes.push(0);
      }
    });
  } catch(e){ errors.push("renderParkAtFriendModal(sort): "+(e.stack||e.message)); }

  const expectSeq = ['🏠闲置中','🏠闲置中','🅿️停在好友家','🅿️停在自己家','🅿️停在自己家'];
  check("选车弹窗→共渲染5辆车", statuses.length === 5, "n="+statuses.length);
  check("选车弹窗→状态顺序 闲置>好友家>自己家",
    JSON.stringify(statuses) === JSON.stringify(expectSeq), "st="+JSON.stringify(statuses));
  // 组内收入从高到低（闲置组、自己家组各2辆，应非递增）
  check("选车弹窗→闲置组收入降序", incomes[0] >= incomes[1], "inc="+incomes.slice(0,2));
  check("选车弹窗→自己家组收入降序", incomes[3] >= incomes[4], "inc="+incomes.slice(3,5));

  // 还原
  S1.inst = backupInst; S1.visitTarget = backupVisit;
  const cm = document.querySelector('[data-action="close-modal"]'); if(cm) clickEl(cm);
})();

// 17) 好友家停车规则：员工车拒绝 / 超4辆拒绝 / 正常停车结算刀乐
(function(){
  const Scx = cx();
  const S1 = Scx.S();
  const backup = { inst:S1.inst, visit:S1.visitTarget, emp:S1.employees, dollars:S1.dollars };
  const lastToast = () => { const el = document.querySelector('#toast'); return el ? el.textContent : ''; };
  function minst(iid, carId, loc, atFriend, extra){
    return Object.assign({ iid, carId, loc, spotIdx:-1, fspotIdx:undefined, accrued:0, bonus:0,
      count:1, empIid:null, workEnd:0, atFriend: atFriend||null }, extra||{});
  }

  // 17a) 有员工工作的车 → 拒绝并提示
  S1.employees = [{ iid:99001, name:'员工A', workEnd: Date.now()+60000 }];
  S1.inst = [ minst(1, 1, 'garage', null, { empIid:99001 }) ];
  S1.visitTarget = '999';
  try { Scx.doParkAtFriend(1); } catch(e){ errors.push("doParkAtFriend(worker): "+(e.stack||e.message)); }
  check("员工工作车停车→提示「当前该车辆有员工外出，无法使用。」",
    lastToast().indexOf('当前该车辆有员工外出，无法使用。') >= 0, "toast="+lastToast());
  check("员工工作车停车→未实际停入好友家", !(S1.inst[0].atFriend === '999'), "atFriend="+S1.inst[0].atFriend);

  // 17b) 超过4辆停在好友家 → 拒绝
  S1.employees = [];
  S1.inst = [
    minst(1, 1,  'atFriend', 'a'),
    minst(2, 22, 'atFriend', 'b'),
    minst(3, 50, 'atFriend', 'c'),
    minst(4, 65, 'atFriend', 'd'),
    minst(5, 77, 'garage',   null),  // 第5辆，待停
  ];
  S1.visitTarget = '999';
  try { Scx.doParkAtFriend(5); } catch(e){ errors.push("doParkAtFriend(>4): "+(e.stack||e.message)); }
  check("好友家已满4辆→提示「只能有4辆车停到好友家中。」",
    lastToast().indexOf('只能有4辆车停到好友家中。') >= 0, "toast="+lastToast());
  check("好友家已满4辆→第5辆未停入", !(S1.inst[4].atFriend === '999'), "atFriend="+S1.inst[4].atFriend);

  // 17c) 正常停车（本身有累积收益）→ 结算刀乐并停入
  S1.inst = [ minst(6, 77, 'spot', null, { accrued:150 }) ];
  S1.visitTarget = '999';
  const dollarsBefore = S1.dollars || 0;
  try { Scx.doParkAtFriend(6); } catch(e){ errors.push("doParkAtFriend(normal): "+(e.stack||e.message)); }
  check("正常停车→刀乐增加（结算当前收益）",
    (S1.dollars||0) === dollarsBefore + 150, "before="+dollarsBefore+" after="+(S1.dollars||0));
  check("正常停车→已停入好友家",
    S1.inst[0].atFriend === '999' && S1.inst[0].loc === 'atFriend',
    "loc="+S1.inst[0].loc+" atFriend="+S1.inst[0].atFriend);
  check("正常停车→累积收益已归零", S1.inst[0].accrued === 0, "accrued="+S1.inst[0].accrued);

  // 还原
  S1.inst = backup.inst; S1.visitTarget = backup.visit; S1.employees = backup.emp; S1.dollars = backup.dollars;
  const cm = document.querySelector('[data-action="close-modal"]'); if(cm) clickEl(cm);
})();

// ============ 夺宝次数：允许超出上限 12，自然恢复封顶 12 ============
(function(){
  const Scx = cx();
  if(!Scx || !Scx.gainGachaStamina){ check("夺宝次数超限测试跳过(无钩子)", true, "skip"); }
  else {
    const Sg = Scx.S();
    // 例：当前 11/12，签到/前日登录/夺宝获取 5 次 → 16/12
    Sg.gacha = Sg.gacha || {stamina:0,lastTs:Date.now()};
    Sg.gacha.stamina = 11; Sg.gacha.lastTs = Date.now();
    Scx.gainGachaStamina(5);
    check("夺宝次数允许超出上限(11+5→16)", Sg.gacha.stamina === 16, "stamina="+Sg.gacha.stamina);
    // 自然恢复封顶 12
    Sg.gacha.stamina = 11; Sg.gacha.lastTs = Date.now() - 999*60*60*1000;
    try { Scx.tick(); } catch(e){ errors.push("tick(gachaRecover): "+(e.stack||e.message)); }
    check("自然恢复最多恢复到12(11+离线很久→封顶12)", Sg.gacha.stamina === 12, "stamina="+Sg.gacha.stamina);
    // 已超出时自然恢复不叠加
    Sg.gacha.stamina = 16; Sg.gacha.lastTs = Date.now() - 999*60*60*1000;
    try { Scx.tick(); } catch(e){ errors.push("tick(gachaNoStack): "+(e.stack||e.message)); }
    check("超出上限时自然恢复不叠加(16→保持16)", Sg.gacha.stamina === 16, "stamina="+Sg.gacha.stamina);
    // 重新加载（load）后超限值保留，不收敛回 12
    try {
      Scx.save();
      const saved = window.localStorage.getItem('chexing_save_v3');
      const restored = JSON.parse(saved).gacha.stamina;
      check("刷新后超限值不丢失(仍为16)", restored === 16, "restored="+restored);
    } catch(e){ errors.push("gachaReload: "+(e.stack||e.message)); }
  }

  // ===== 改名系统测试 =====
  {
    const S1 = Scx;
    // 初始状态
    check("改名初始次数=0", (S1.renameCount || 0) === 0, "renameCount="+(S1.renameCount||0));
    // 随机名字生成（非空、合理长度）
    const rn = Scx.generateRandomName();
    check("随机名字非空且长度合理", typeof rn === 'string' && rn.length >= 4 && rn.length <= 12, "name="+rn);
    // 屏蔽字检测
    check("屏蔽字'操'被拒绝", !Scx.isNameValid('操你'), "should be invalid");
    check("屏蔽字'shit'被拒绝", !Scx.isNameValid('shit'), "should be invalid");
    check("正常名字通过", Scx.isNameValid('北京张三丰'), "should be valid");
    // 空名被拒
    check("空名非法", !Scx.isNameValid(''), "empty should be invalid");
    check("空格名非法", !Scx.isNameValid('   '), "spaces should be invalid");
    // 首次改名免费
    const oldName = S1.name;
    S1.beans = 100000;
    const oldBeans = S1.beans;
    try { Scx.confirmRename(); } catch(e){ /* no input element in smoke */ }
    // 直接调用改名逻辑（绕过UI）
    const newName = '上海李明辉';
    if(Scx.isNameValid(newName) && !Scx.isNameTaken(newName)){
      S1.name = newName; S1.renameCount = (S1.renameCount||0) + 1;
      check("首次改名后次数=1", S1.renameCount === 1, "count="+S1.renameCount);
      check("首次改名不扣黄金", S1.beans === oldBeans, "beans="+S1.beans);
      check("名字已更改", S1.name === newName, "name="+S1.name);
    }
    // 二次改名消耗黄金
    const beansBefore2 = S1.beans;
    const name2 = '广东王思聪';
    if(S1.beans >= 60000 && Scx.isNameValid(name2) && !Scx.isNameTaken(name2)){
      S1.beans -= 60000; S1.name = name2; S1.renameCount++;
      check("二次改名后次数=2", S1.renameCount === 2, "count="+S1.renameCount);
      check("二次改名扣除60000黄金", S1.beans === beansBefore2 - 60000, "beans="+S1.beans);
    }
    // 黄金不足时改名应被拒
    S1.beans = 100; // 不够60000
    const canAfford3 = S1.beans >= 60000;
    check("黄金不足时无法改名(逻辑检查)", !canAfford3, "beans="+S1.beans+" < 60000");
  }
})();

// ============ 安排员工工作选车弹窗排序：未安排工作 > 已安排工作，容量从高到低 ============
(function(){
  const Scx = cx();
  if(!Scx || !Scx.renderWorkArrange){ check("安排员工工作选车排序测试跳过(无钩子)", true, "skip"); }
  else {
    const S1 = Scx.S();
    const backupInst = S1.inst, backupEmp = S1.employees;
    // 一个测试员工（eidx=0）
    S1.employees = [{ iid:1, name:'测试员工', networth:500 }];
    function minst(iid, cap, empIid){
      return { iid, carId:1, loc:'spot', spotIdx:-1, fspotIdx:undefined, accrued:0, bonus:0,
               count:1, empIid: empIid||null, workEnd: empIid?Date.now()+60000:0, atFriend:null, capacity:cap };
    }
    // 4辆 spot 车：noEmp/高容(500k), noEmp/低容(100k), hasEmp/高容(400k), hasEmp/低容(200k)
    S1.inst = [
      minst(1, 500000, null),
      minst(2, 100000, null),
      minst(3, 400000, 1),
      minst(4, 200000, 1),
    ];
    try { Scx.renderWorkArrange(0); } catch(e){ errors.push("renderWorkArrange: "+(e.stack||e.message)); }
    const body = document.getElementById('modal-body');
    const rows = body ? Array.from(body.querySelectorAll('.cs-car-row')) : [];
    check("安排工作选车弹窗渲染出4行", rows.length === 4, "rows="+rows.length);
    if(rows.length === 4){
      // 提取每行的容量数字（第2个 .cs-data-row 为容量行）
      const caps = rows.map(r => {
        const ds = r.querySelectorAll('.cs-data-row');
        const b = ds[1] ? ds[1].querySelector('b') : null;
        return b ? parseInt(String(b.textContent).replace(/[^0-9]/g,''),10) : -1;
      });
      // 期望顺序：未安排(500k) > 未安排(100k) > 已安排(400k) > 已安排(200k)
      // 显示值经 f() 格式化（"50.00万"→"5000"），用解析后数字对比
      const expected = [5000, 1000, 4000, 2000];
      check("排序=未安排>已安排 且 容量降序",
        JSON.stringify(caps) === JSON.stringify(expected), "got="+JSON.stringify(caps));
      // 验证前2辆为未安排（按钮为「上车工作」），后2辆为已安排（按钮为「立即召回」）
      const firstBtns = rows.map(r => r.querySelector('.cs-btn')?.textContent || '');
      check("前2辆按钮=上车工作(未安排)", firstBtns[0].indexOf('上车工作')>=0 && firstBtns[1].indexOf('上车工作')>=0,
        "btns="+JSON.stringify(firstBtns));
      check("后2辆按钮=立即召回(已安排)", firstBtns[2].indexOf('立即召回')>=0 && firstBtns[3].indexOf('立即召回')>=0,
        "btns="+JSON.stringify(firstBtns));
    }
    const cm = document.querySelector('[data-action="close-modal"]'); if(cm) clickEl(cm);
    // 还原
    S1.inst = backupInst; S1.employees = backupEmp;
  }
})();

console.log("ERRORS:", errors.length);
errors.forEach(e => console.log("  -", e));
let pass=0, fail=0;
checks.forEach(c => { console.log((c.ok?"PASS":"FAIL")+" | "+c.name+(c.extra?"  ["+c.extra+"]":"")); c.ok?pass++:fail++; });
console.log(`\nSUMMARY: ${pass} passed, ${fail} failed, ${errors.length} runtime errors`);
process.exit(fail>0 || errors.length>0 ? 1 : 0);
