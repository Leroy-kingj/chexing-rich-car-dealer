/**
 * ChexingSDK - 首富车行 TapTap SDK 桥接层
 *
 * 支持双环境运行：
 * - Capacitor Android 原生环境（通过 Capacitor Plugin 调用 Java/Kotlin）
 * - TapTap H5 小游戏环境（通过 tap 全局 JSBridge 调用）
 * - 浏览器调试环境（自动降级为 toast/模拟）
 *
 * 提供统一的 JS API 供游戏代码调用原生功能：
 * - ChexingSDK.share()        系统分享面板
 * - ChexingSDK.shareImage()   分享图片
 * - ChexingSDK.showRewardAd() 激励视频广告
 * - ChexingSDK.initAd()       初始化广告
 * - ChexingSDK.initLogin()    初始化 TapTap 登录 SDK
 * - ChexingSDK.login()        TapTap 登录（返回 openid/unionid/昵称/头像）
 * - ChexingSDK.getAccount()   获取当前已登录账号
 * - ChexingSDK.logout()       退出 TapTap 登录
 * - ChexingSDK.getInvitedUsers()  查询通过邀请链接真实注册的新用户（邀请奖励依据）
 *
 * TapTap 七大功能模块（ChexingTap 原生插件 / H5 Bridge）：
 * - ChexingSDK.complianceStartup() / complianceExit() / complianceState()  防沉迷合规
 * - ChexingSDK.checkUpdate() / updateGame()                                更新
 * - ChexingSDK.openReview()                                              评价
 * - ChexingSDK.checkLicense()                                           正版校验
 * - ChexingSDK.shareToTapTap()                                          分享到 TapTap
 * - ChexingSDK.openLeaderboard()                                        排行榜
 * - ChexingSDK.unlockAchievement() / showAchievements()                 成就
 */
const ChexingSDK = (() => {
  const TAG = '[ChexingSDK]';
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  // ===== TapTap JSBridge 动态挂载对象（健壮探测）=====
  // 关键背景（TapTap 官方小游戏文档明确）：
  //   1) 真机小游戏运行时【没有 window 对象，全局对象是 GameGlobal】；
  //   2) tap 由容器异步注入，不能一次性 typeof 求值。
  // 因此不能假设 window 存在、也不能只查裸全局 tap。
  // 这里把 tap 声明为 IIFE 作用域变量（遮蔽外部裸全局），从多种可能的全局位置
  // 动态探测并缓存：裸全局 tap / window.tap / GameGlobal.tap / globalThis。
  // 任何一处命中即视为 TapTap 环境就绪。
  let tap = null;                 // 缓存探测到的 TapTap 桥接对象（IIFE 作用域，避免依赖外部裸变量）
  let isTapMiniGame = false;      // 由 tap 探测结果驱动
  let _rewardAdBusy = false;      // 激励视频防重复拉起锁（防止连点 / SDK 复用实例导致广告反复弹出）

  function _resolveTapSource() {
    try { if (typeof window !== 'undefined' && window.tap) return window.tap; } catch (e) {}
    try { if (typeof GameGlobal !== 'undefined' && GameGlobal.tap) return GameGlobal.tap; } catch (e) {}
    try { if (typeof globalThis !== 'undefined' && globalThis.tap) return globalThis.tap; } catch (e) {}
    try { if (typeof tap !== 'undefined' && tap) return tap; } catch (e) {}  // 已缓存副本
    return null;
  }
  function _refreshTap() {
    const t = _resolveTapSource();
    if (t && tap !== t) {
      tap = t;
      if (!isTapMiniGame) {
        isTapMiniGame = true;
        log('tap JSBridge ready (detected)');
        _fireTapReady();
      }
    }
    return tap;
  }

  // TapTap 分享模板 ID（后台「分享设置→自定义分享模板」创建，已审核通过）
  const TAPTAP_SHARE_TEMPLATE_ID = 'ST17852487074771ZFOXF7UF';
  // TapTap 激励视频广告位 ID（后台「流量变现 → 广告位管理」创建激励视频广告位后获取，待填；留空则广告不可用但不白发奖）
  const TAPTAP_REWARD_AD_UNIT = '1054324';  // 竖屏激励视频广告位（TapTap 后台「流量变现→广告位管理」获取；游戏为竖屏，勿用横屏位 1054323）

  // ---- 内部工具 ----
  function log(...args) { console.log(TAG, ...args); }
  function warn(...args) { console.warn(TAG, ...args); }

  // TapTap JSBridge 注入探测：tap 可能晚于游戏脚本注入，轮询等待（最多 ~12s）。
  // 注入后刷新 tap 引用并触发已注册的 onTapReady 回调（app.js 据此隐藏"跳过登录"+初始化 SDK）。
  const _tapReadyCbs = [];
  let _tapReadyFired = false;
  function _fireTapReady() {
    if (_tapReadyFired) return;
    _tapReadyFired = true;
    _tapReadyCbs.splice(0).forEach(cb => { try { cb(); } catch (e) { warn('onTapReady cb error:', e); } });
  }
  // 探测超时（确认不在 TapTap 环境）回调：登录页据此才显示"跳过登录"（调试用）
  const _tapGoneCbs = [];
  let _tapGoneFired = false;
  function _fireTapUnavailable() {
    if (_tapGoneFired || _tapReadyFired) return;
    _tapGoneFired = true;
    _tapGoneCbs.splice(0).forEach(cb => { try { cb(); } catch (e) { warn('onTapUnavailable cb error:', e); } });
  }
  function _pollTapReady(times = 0) {
    if (_refreshTap()) return;            // 已探测到，结束轮询
    if (times >= 40) {                    // 300ms * 40 ≈ 12s
      log('tap JSBridge 未在超时内注入，按非 TapTap 环境运行');
      _fireTapUnavailable();
      return;
    }
    setTimeout(() => _pollTapReady(times + 1), 300);
  }
  _pollTapReady();
  function onTapReady(cb) {
    if (typeof cb !== 'function') return;
    if (_refreshTap()) { try { cb(); } catch (e) { warn('onTapReady cb error:', e); } }
    else _tapReadyCbs.push(cb);
  }
  /** 确认「非 TapTap 环境」时回调（探测 ~12s 超时后触发；已就绪则永不触发） */
  function onTapUnavailable(cb) {
    if (typeof cb !== 'function') return;
    if (_tapReadyFired || _refreshTap()) return;
    if (_tapGoneFired) { try { cb(); } catch (e) {} return; }
    _tapGoneCbs.push(cb);
  }

  /**
   * 安全调用 Capacitor Plugin
   * @param {string} pluginName 插件名（如 'ChexingShare'）
   * @param {string} method 方法名
   * @param {object} data 参数
   * @returns {Promise<{success:boolean, msg:string}>}
   */
  async function callPlugin(pluginName, method, data = {}) {
    if (!isNative) {
      warn(`${pluginName}.${method} called in browser (non-native), using fallback`);
      return { success: false, msg: 'unsupported_platform' };
    }
    try {
      const { Capacitor } = await import(/* webpackIgnore: true */ '@capacitor/core');
      const result = await Capacitor.plugins[pluginName]?.[method]?.(data);
      return result || { success: false, msg: 'no_response' };
    } catch (e) {
      warn(`${pluginName}.${method} error:`, e);
      return { success: false, msg: e.message || 'plugin_error' };
    }
  }

  // ---- 公开 API ----

  /**
   * 分享文本（调起系统分享面板）
   * @param {object} opts
   * @param {string} [opts.title]   分享标题，默认"首富车行"
   * @param {string} [opts.text]    分享文案
   * @param {string} [opts.url]     分享链接
   * @returns {Promise<{success:boolean}>}
   */
  async function share(opts = {}) {
    const { title = '首富车行', text = '', url = '' } = opts;
    log('share:', { title, text, url });

    if (!isNative) {
      // 浏览器降级：尝试 Web Share API 或复制到剪贴板
      if (navigator.share) {
        try {
          await navigator.share({ title, text: text || title, url });
          return { success: true, msg: 'web_share_api' };
        } catch (e) {
          if (e.name !== 'AbortError') warn('Web Share API failed:', e);
        }
      }
      // 最终降级：提示用户
      toast('请在 TapTap 客户端中使用分享功能');
      return { success: false, msg: 'browser_fallback' };
    }

    return callPlugin('ChexingShare', 'share', { title, text, url });
  }

  /**
   * 分享图片（调起系统图片分享面板）
   * @param {object} opts
   * @param {string} [opts.title]   标题
   * @param {string} [opts.text]    文案
   * @param {string} [opts.imagePath] 本地图片路径
   * @param {string} [opts.imageUrl] 图片 URL
   */
  async function shareImage(opts = {}) {
    log('shareImage:', opts);
    if (!isNative) {
      toast('请在 TapTap 客户端中使用图片分享功能');
      return { success: false, msg: 'browser_fallback' };
    }
    return callPlugin('ChexingShare', 'shareImage', opts);
  }

  /**
   * 初始化广告 SDK
   * 应在游戏启动时调用一次
   * @param {object} opts
   * @param {string} [opts.appId]     应用 ID
   * @param {string} [opts.adUnitId]  广告位 ID
   */
  async function initAd(opts = {}) {
    log('initAd:', opts);
    return callPlugin('ChexingAd', 'initAd', opts);
  }

  /**
   * 展示激励视频广告
   * @returns {Promise<{success:boolean, msg:string}>}
   *   success=true  → 广告完整观看，可发放奖励
   *   success=false → 用户关闭/失败，不应发奖励
   *
   * 用法：
   *   const result = await ChexingSDK.showRewardAd();
   *   if (result.success) {
   *     // 发放奖励...
   *   }
   */
  async function showRewardAd(adUnitId) {
    log('showRewardAd called');
    _refreshTap();
    // ===== 非 TapTap 环境（浏览器本地调试，未检测到 tap 桥接）：模拟 2 秒观看，仅本地调试用 =====
    if (!isNative && !isTapMiniGame) {
      toast('【测试模式】模拟观看广告...');
      return new Promise(resolve => {
        setTimeout(() => {
          toast('【测试模式】广告观看完成！');
          resolve({ success: true, msg: 'test_mode_success' });
        }, 2000);
      });
    }
    // ===== TapTap 小游戏环境：真实激励视频广告（看完才发奖，否则不发） =====
    if (isTapMiniGame) {
      const unit = adUnitId || TAPTAP_REWARD_AD_UNIT;
      if (!unit) {
        warn('showRewardAd: 未配置 TAPTAP_REWARD_AD_UNIT 广告位 ID');
        toast('广告位未配置，暂不能观看广告');
        return { success: false, msg: 'ad_unit_not_configured' };
      }
      if (_rewardAdBusy) {
        toast('广告正在播放中，请稍候…');
        return { success: false, msg: 'ad_busy' };
      }
      _rewardAdBusy = true;
      return new Promise((resolve) => {
        let settled = false;
        let shown = false; // 防止 onLoad 重复触发导致广告反复自动拉起
        let ad;
        // 具名 handler：TapTap/微信激励视频的 offLoad/offClose/offError 必须传【原引用】才能真正解绑，
        // 无参调用在多数版本是 no-op，会导致监听器跨调用累积，复用时 onLoad 再次拉起广告（关了又打开）。
        let onLoadH, onErrH, onCloseH;
        const cleanup = () => {
          try { if (onLoadH) ad.offLoad(onLoadH); } catch (_) {}
          try { if (onCloseH) ad.offClose(onCloseH); } catch (_) {}
          try { if (onErrH) ad.offError(onErrH); } catch (_) {}
          try { if (ad.destroy) ad.destroy(); } catch (_) {}
        };
        const finish = (r) => {
          _rewardAdBusy = false;
          cleanup();
          if (!settled) { settled = true; resolve(r); }
        };
        try {
          ad = tap.createRewardedVideoAd({ adUnitId: unit });
        } catch (e) {
          _rewardAdBusy = false;
          warn('createRewardedVideoAd exception:', e);
          resolve({ success: false, msg: e.message || 'ad_exception' });
          return;
        }
        onLoadH = () => {
          log('rewarded video ad loaded');
          if (shown) return; // 已展示过则不再二次拉起（修复：退出后反复自动打开广告）
          shown = true;
          ad.show().catch(e => finish({ success: false, msg: 'ad_show_failed:' + (e?.errMsg || e?.message || e) }));
        };
        onErrH = (err) => {
          warn('rewarded video ad error:', err);
          finish({ success: false, msg: 'ad_error:' + (err?.errMsg || err?.message || String(err)) });
        };
        onCloseH = (res) => {
          // res.isEnded === false 表示中途关闭（未看完）；未定义按看完处理
          const finished = !(res && res.isEnded === false);
          log('rewarded video ad close, finished:', finished);
          finish(finished ? { success: true, msg: 'ad_watched' } : { success: false, msg: 'ad_not_finished' });
        };
        ad.onLoad(onLoadH);
        ad.onError(onErrH);
        ad.onClose(onCloseH);
        // 显式加载：TapTap 激励视频需先 load() 才会触发 onLoad 并弹出广告
        ad.load();
      });
    }
    // ===== Capacitor 原生环境 =====
    return callPlugin('ChexingAd', 'showRewardVideo', {});
  }

  /**
   * 预加载激励视频广告（建议在适当时机提前调用）
   */
  async function preloadAd() {
    log('preloadAd');
    return callPlugin('ChexingAd', 'preloadAd', {});
  }

  /**
   * 广告是否已就绪
   */
  async function isAdReady() {
    const r = await callPlugin('ChexingAd', 'isReady', {});
    return r?.ready || false;
  }

  // ---- TapTap 登录 ----

  /**
   * 初始化 TapTap 登录 SDK（应在游戏启动时调用一次）
   * @param {object} [opts]
   * @param {string} [opts.clientId]    开发者后台 Client ID（缺省用原生端占位符）
   * @param {string} [opts.clientToken] 开发者后台 Client Token
   */
  async function initLogin(opts = {}) {
    _refreshTap();
    log('initLogin:', opts, 'isTapMiniGame:', isTapMiniGame);
    if (isTapMiniGame) {
      // H5 小游戏环境：tap JSBridge 无需显式初始化，直接可用
      return { success: true, msg: 'tap_bridge_ready' };
    }
    return callPlugin('ChexingLogin', 'initLogin', opts);
  }

  // H5 小游戏登录缓存的账号信息
  let _h5CachedAccount = null;

  /**
   * 检查 TapTap 登录态（session_key）是否仍然有效。
   * 官方推荐的「已登录则静默续期」判定：success → 登录态有效；fail → 需重新 tap.login()。
   * @returns {Promise<boolean>}
   */
  async function checkSession() {
    _refreshTap();
    if (!isTapMiniGame || !tap || typeof tap.checkSession !== 'function') return false;
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => done(false), 6000);   // 防止回调never（容器异常）导致登录流程卡死
      try {
        tap.checkSession({ success: () => done(true), fail: () => done(false) });
      } catch (e) { done(false); }
    });
  }

  /**
   * 查询用户已授予的权限（用于判断能否直接调用 tap.getUserInfo）。
   * ⚠️ 小游戏内 tap.authorize({scope:'scope.userInfo'}) 不会弹窗，
   *    未授权时只能通过 tap.createUserInfoButton 由用户手势触发授权。
   *    因此这里先查授权状态，未授权就跳过 getUserInfo，改由排行榜 API 补昵称/头像。
   * @returns {Promise<object>} authSetting 对象，失败返回 {}
   */
  async function getSetting() {
    _refreshTap();
    if (!isTapMiniGame || !tap || typeof tap.getSetting !== 'function') return {};
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => done({}), 5000);
      try {
        tap.getSetting({
          success: (res) => done((res && res.authSetting) || {}),
          fail: () => done({}),
        });
      } catch (e) { done({}); }
    });
  }

  /**
   * 拉起 TapTap 登录授权
   * @returns {Promise<{success:boolean, openid?:string, unionid?:string, name?:string, avatar?:string, code?:string}>}
   *
   * 环境行为：
   * - Capacitor 原生：调用 ChexingLogin Plugin → 直接返回 openid/unionid/name/avatar
   * - H5 小游戏：调用 tap.login() 获取 code + tap.getUserInfo() 获取昵称头像
   *   ⚠️ H5 环境的 openid 需要后端 code2Session 换取，前端只能拿到 code + 非敏感用户信息
   * - 浏览器：返回 { success:false, msg:'unsupported_platform' }
   */
  async function login() {
    _refreshTap();
    log('login called, isTapMiniGame:', isTapMiniGame, 'isNative:', isNative);

    // ===== H5 小游戏环境：使用 tap JSBridge =====
    // 说明（官方文档）：tap.login 的 success 只返回 code（5 分钟有效、一次性）；
    // openid/unionid 前端拿不到，本项目改用「排行榜 API 回传的 user.openid」补齐（见 resolveIdentity）。
    if (isTapMiniGame) {
      const codeResult = await new Promise((resolve) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        // 兜底超时：容器异常导致 success/fail 都不回调时不至于卡死登录页
        setTimeout(() => done({ success: false, msg: 'login_timeout' }), 15000);
        try {
          tap.login({
            timeout: 10000,
            success(res) {
              log('tap.login success, code:', res && res.code);
              if (!res || !res.code) { done({ success: false, msg: 'no_code_received' }); return; }
              done({ success: true, code: res.code });
            },
            fail(err) {
              log('tap.login fail:', err);
              const errMsg = (err && err.errMsg) || (err && err.message) || String(err);
              if (errMsg.indexOf('取消') >= 0 || errMsg.indexOf('cancel') >= 0) {
                done({ success: false, msg: '用户取消了登录' });
              } else {
                done({ success: false, msg: errMsg || 'login_failed' });
              }
            },
          });
        } catch (e) {
          warn('tap.login exception:', e);
          done({ success: false, msg: e.message || 'login_exception' });
        }
      });

      if (!codeResult.success) return codeResult;

      // 昵称/头像：仅在用户【已授权 scope.userInfo】时才调 getUserInfo，
      // 未授权时静默跳过（小游戏内 authorize 不弹窗，硬调只会 fail 并拖慢登录）。
      let name = null, avatar = null;
      try {
        const authSetting = await getSetting();
        if (authSetting && authSetting['scope.userInfo']) {
          const ui = await new Promise((resolve) => {
            let settled = false;
            const done = (v) => { if (!settled) { settled = true; resolve(v); } };
            setTimeout(() => done(null), 6000);
            try {
              tap.getUserInfo({
                lang: 'zh_CN',
                success: (r) => done((r && r.userInfo) || null),
                fail: (err) => { warn('tap.getUserInfo fail:', err); done(null); },
              });
            } catch (e) { done(null); }
          });
          if (ui) { name = ui.nickName || null; avatar = ui.avatarUrl || null; }
        } else {
          log('scope.userInfo 未授权，跳过 getUserInfo（昵称/头像改由排行榜 API 补齐）');
        }
      } catch (e) { warn('getUserInfo flow error:', e); }

      _h5CachedAccount = { code: codeResult.code, name, avatar, openid: null, unionid: null };
      return {
        success: true,
        code: codeResult.code,
        name, avatar,
        openid: null,
        unionid: null,
        msg: 'h5_login_ok',
      };
    }

    // ===== Capacitor 原生环境 =====
    if (isNative) {
      return callPlugin('ChexingLogin', 'login', {});
    }

    // ===== 浏览器环境 =====
    toast('请在 TapTap 客户端中使用登录功能');
    return { success: false, msg: 'unsupported_platform' };
  }

  /**
   * 获取当前已登录账号
   * @returns {Promise<{loggedIn:boolean, openid?, unionid?, name?, avatar?}>}
   */
  async function getAccount() {
    if (isTapMiniGame) {
      return {
        loggedIn: _h5CachedAccount !== null,
        openid: _h5CachedAccount?.openid || null,
        unionid: _h5CachedAccount?.unionid || null,
        name: _h5CachedAccount?.name || null,
        avatar: _h5CachedAccount?.avatar || null,
      };
    }
    return callPlugin('ChexingLogin', 'getAccount', {});
  }

  /**
   * 退出 TapTap 登录
   * @returns {Promise<{success:boolean}>}
   */
  async function logout() {
    log('logout called');
    if (isTapMiniGame) {
      _h5CachedAccount = null;
      // H5 小游戏环境可能没有 logout API，清除本地缓存即可
      return { success: true, msg: 'logout_success' };
    }
    return callPlugin('ChexingLogin', 'logout', {});
  }

  /**
   * 查询通过当前玩家邀请链接真实下载/注册的新用户列表。
   * 邀请奖励发放的唯一真实依据 —— 必须由原生端/服务端返回真实数据，前端不得伪造。
   *
   * @param {object} [opts]
   * @param {string} [opts.inviteCode] 邀请者邀请码（缺省由原生端取当前登录账号）
   * @returns {Promise<{success:boolean, users?:Array<{uid:string, name?:string, registeredAt?:number}>, msg?:string}>}
   *   成功：{ success:true, users:[...] }  （无真实邀请时 users 为空数组）
   *   失败/非原生：{ success:false, users:[] }
   *
   * 原生端约定插件：ChexingInvite.getInvitedUsers({inviteCode})
   */
  async function getInvitedUsers(opts = {}) {
    if (!isNative) {
      // 浏览器降级：默认无真实数据（满足"必须由 SDK 返回真实邀请"的要求，绝不伪造）
      // 网页测试用：URL 带 ?mockInvite=N 时返回 N 个模拟用户，便于联调
      try {
        const m = new URLSearchParams(location.search).get('mockInvite');
        const n = parseInt(m, 10);
        if (!isNaN(n) && n > 0) {
          const users = [];
          for (let i = 1; i <= n; i++) {
            users.push({ uid: 'mock_' + i, name: '模拟好友' + i, registeredAt: Date.now() });
          }
          return { success: true, users };
        }
      } catch (e) { /* ignore */ }
      return { success: true, users: [] };
    }
    return callPlugin('ChexingInvite', 'getInvitedUsers', opts);
  }

  // ---- TapTap 七大功能模块（ChexingTap 原生插件 / H5 Bridge） ----
  // 统一封装：非 TapTap 环境自动降级为 toast 提示
  async function tapCall(method, data = {}) {
    _refreshTap();
    if (!isNative && !isTapMiniGame) {
      warn(`ChexingTap.${method} called in non-tap environment, using fallback`);
      toast(`请在 TapTap 客户端中使用「${method}」功能`);
      return { success: false, msg: 'unsupported_platform' };
    }
    if (isTapMiniGame) {
      // H5 小游戏环境：仅支持 tap.login / tap.getUserInfo / tap.showShareboard 等有限 API
      // 其他功能（评价/成就/更新/正版校验/防沉迷）在 H5 中由平台侧处理或不可用
      const h5Available = ['login', 'getUserInfo', 'showShareboard', 'shareAppMessage'];
      if (h5Available.includes(method) && typeof tap[method] === 'function') {
        try {
          const result = await new Promise((resolve, reject) => {
            tap[method]({
              ...data,
              success(res) { resolve({ success: true, data: res }); },
              fail(err) { resolve({ success: false, msg: err?.errMsg || err?.message || String(err) }); },
            });
          });
          return result;
        } catch(e) {
          warn(`tap.${method} error:`, e);
          return { success: false, msg: e.message || 'bridge_error' };
        }
      }
      // H5 中不支持的功能：静默返回成功（平台侧已处理），不弹错误打扰玩家
      log(`[H5] ${method} 由 TapTap 平台侧处理，前端跳过`);
      return { success: true, msg: 'h5_platform_handled' };
    }
    return callPlugin('ChexingTap', method, data);
  }

  /** 启动防沉迷合规（openId 缺省时由原生端取当前登录账号） */
  async function complianceStartup(opts = {}) { return tapCall('complianceStartup', opts); }
  /** 退出合规 */
  async function complianceExit() { return tapCall('complianceExit'); }
  /** 查询合规状态：{ ageRange, remainingTime, accessToken } */
  async function complianceState() { return tapCall('complianceState'); }

  /** 静默检测强制更新 */
  async function checkUpdate() { return tapCall('checkUpdate'); }
  /** 拉起应用内更新流程 */
  async function updateGame() { return tapCall('updateGame'); }

  /** 打开 TapTap 评价/评分页 */
  async function openReview() { return tapCall('openReview'); }

  /** 启动 TapTap 正版校验 */
  async function checkLicense() { return tapCall('checkLicense'); }

  /** 分享到 TapTap 动态/好友：{ title?, contents/desc? }
   *  注意：H5 小游戏 tap.showShareboard / tap.shareAppMessage 均需要后台配置的 templateId（必填）。
   *  未配置 templateId 时自动降级为「复制邀请文案到剪贴板」。
   */
  async function shareToTapTap(opts = {}) {
    _refreshTap();
    const title = opts.title || '抢车位：华夏崛起';
    const contents = opts.contents || '';
    const desc = opts.desc || '';
    const shareDesc = desc || contents || '快来一起玩！';
    const fullText = `${title}\n${shareDesc}`;

    // H5 小游戏环境
    if (isTapMiniGame) {
      const effectiveTemplateId = opts.templateId || TAPTAP_SHARE_TEMPLATE_ID;
      log('shareToTapTap H5 mode:', { title, desc: shareDesc, templateId: effectiveTemplateId });

      // 方案A：尝试 tap.showShareboard（需要后台配置 templateId 才能成功）
      if (typeof tap.showShareboard === 'function' && effectiveTemplateId) {
        return new Promise((resolve) => {
          try {
            tap.showShareboard({
              templateId: effectiveTemplateId,
              title,
              desc: shareDesc,
              success(res) {
                log('tap.showShareboard success:', res);
                resolve({ success: true, msg: 'share_ok' });
              },
              fail(err) {
                warn('tap.showShareboard fail:', err);
                resolve({ success: false, msg: err?.errMsg || err?.message || 'share_failed' });
              },
            });
          } catch(e) {
            resolve({ success: false, msg: e.message || 'share_exception' });
          }
        });
      }

      // 方案B：尝试 tap.shareAppMessage（同样需要 templateId）
      if (typeof tap.shareAppMessage === 'function' && effectiveTemplateId) {
        return new Promise((resolve) => {
          try {
            tap.shareAppMessage({
              templateId: effectiveTemplateId,
              title,
              desc: shareDesc,
              query: '',
              success() { resolve({ success: true, msg: 'share_ok' }); },
              fail(err) {
                resolve({ success: false, msg: err?.errMsg || 'share_failed' });
              },
            });
          } catch(e) {
            resolve({ success: false, msg: e.message || 'share_exception' });
          }
        });
      }

      // 方案C：无 templateId → 降级为复制邀请文案到剪贴板
      log('shareToTapTap: 无 templateId，降级为剪贴板复制');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullText);
          toast('邀请文案已复制，去 TapTap/微信粘贴发送给好友吧！');
        } else {
          // 降级方案：用 textarea 选中+execCommand 兼容旧浏览器
          const ta = document.createElement('textarea');
          ta.value = fullText; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          toast('邀请文案已复制，去粘贴发送给好友吧！');
        }
        return { success: true, msg: 'clipboard_fallback' };
      } catch(e) {
        warn('剪贴板复制也失败:', e);
        toast('分享功能暂不可用');
        return { success: false, msg: 'clipboard_failed' };
      }
    }

    // Capacitor 原生环境
    return tapCall('shareToTapTap', opts);
  }

  /** 打开排行榜：{ leaderboardId?, openId? }
   *  H5 小游戏：走 tap.getLeaderboardManager().openLeaderboard()（真实官方面板）
   *  原生环境：走 ChexingTap 原生插件
   */
  async function openLeaderboard(opts = {}) {
    _refreshTap();
    if (isTapMiniGame) {
      try {
        const mgr = tap.getLeaderboardManager && tap.getLeaderboardManager();
        if (mgr && typeof mgr.openLeaderboard === 'function') {
          return await new Promise((resolve) => {
            mgr.openLeaderboard({
              ...(opts.leaderboardId ? { leaderboardId: opts.leaderboardId } : {}),
              success: (res) => resolve({ success: true, data: res }),
              fail: (err) => resolve({ success: false, msg: err?.errMsg || err?.message || 'open_failed' }),
            });
          });
        }
        return { success: false, msg: 'leaderboard_unavailable' };
      } catch (e) {
        return { success: false, msg: e.message || 'leaderboard_error' };
      }
    }
    return tapCall('openLeaderboard', opts);
  }

  /** 提交排行榜分数
   *  @param {string} leaderboardId  TapTap 后台创建的排行榜 ID
   *  @param {number} score          分数（必须为整数，小数会被取整）
   *  H5 小游戏：tap.getLeaderboardManager().submitScores()
   *  原生环境：ChexingTap.submitLeaderboardScore
   */
  async function submitLeaderboardScore(leaderboardId, score) {
    _refreshTap();
    const sc = Math.floor(Number(score) || 0);
    if (isTapMiniGame) {
      try {
        const mgr = tap.getLeaderboardManager && tap.getLeaderboardManager();
        if (!mgr || typeof mgr.submitScores !== 'function') {
          return { success: false, msg: 'leaderboard_unavailable' };
        }
        return await new Promise((resolve) => {
          mgr.submitScores({
            scores: [{ leaderboardId, score: sc }],
            callback: {
              onSuccess: (res) => {
                // 官方返回 res.results[]：{ leaderboardId, openid, unionid, periodToken, scoreResult }
                // ⭐ 这是纯前端拿到自己真实 openid / unionid 的唯一途径（tap.login 只给 code）
                let openid = null, unionid = null;
                try {
                  const r0 = (res && Array.isArray(res.results) && res.results[0]) || null;
                  if (r0) { openid = r0.openid || null; unionid = r0.unionid || null; }
                } catch (e) {}
                resolve({ success: true, data: res, openid, unionid });
              },
              onFailure: (code, message) => resolve({ success: false, msg: message || ('code_' + code) }),
            },
          });
        });
      } catch (e) {
        return { success: false, msg: e.message || 'submit_error' };
      }
    }
    return callPlugin('ChexingTap', 'submitLeaderboardScore', { leaderboardId, score: sc });
  }

  /**
   * 拉取排行榜榜单数据（供游戏内自绘 UI 使用）。
   * 官方：LeaderboardManager.loadLeaderboardScores
   * @param {object} opts
   * @param {string} opts.leaderboardId 排行榜 ID
   * @param {number} [opts.maxSize=50]  条数上限，范围 [1,200]
   * @param {string} [opts.collection]  'public'(默认全服) | 'friends'(TapTap 好友榜)
   * @param {string} [opts.continuationToken] 翻页令牌
   * @returns {Promise<{success:boolean, scores?:Array, msg?:string}>}
   *   scores[i] = { rank, score, scoreDisplay, user:{ name, avatar, openid, unionid } }
   *   ⭐ user 里带有【其他真实玩家】的昵称/头像/openid —— 游戏内真实玩家数据的唯一来源
   */
  async function loadLeaderboardScores(opts = {}) {
    _refreshTap();
    if (!isTapMiniGame) return { success: false, msg: 'not_tap_minigame' };
    const { leaderboardId, maxSize = 50, collection, continuationToken } = opts;
    if (!leaderboardId) return { success: false, msg: 'no_leaderboard_id' };
    try {
      const mgr = tap.getLeaderboardManager && tap.getLeaderboardManager();
      if (!mgr || typeof mgr.loadLeaderboardScores !== 'function') {
        return { success: false, msg: 'leaderboard_unavailable' };
      }
      return await new Promise((resolve) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        setTimeout(() => done({ success: false, msg: 'load_timeout' }), 12000);
        mgr.loadLeaderboardScores({
          leaderboardId,
          maxSize: Math.max(1, Math.min(200, maxSize)),
          ...(collection ? { collection } : {}),
          ...(continuationToken ? { continuationToken } : {}),
          callback: {
            onSuccess: (res) => done({
              success: true,
              scores: (res && res.scores) || [],
              isTruncated: res && res.isTruncated,
              nextContinuationToken: res && res.nextContinuationToken,
            }),
            onFailure: (code, message) => done({ success: false, msg: message || ('code_' + code) }),
          },
        });
      });
    } catch (e) {
      return { success: false, msg: e.message || 'load_error' };
    }
  }

  /**
   * 拉取当前玩家在指定榜单的成绩（含自己的 openid / 昵称 / 头像）。
   * 官方：LeaderboardManager.loadCurrentPlayerLeaderboardScore
   * @returns {Promise<{success:boolean, score?:object, user?:object, msg?:string}>}
   */
  async function loadCurrentPlayerScore(opts = {}) {
    _refreshTap();
    if (!isTapMiniGame) return { success: false, msg: 'not_tap_minigame' };
    const { leaderboardId, collection } = opts;
    if (!leaderboardId) return { success: false, msg: 'no_leaderboard_id' };
    try {
      const mgr = tap.getLeaderboardManager && tap.getLeaderboardManager();
      if (!mgr || typeof mgr.loadCurrentPlayerLeaderboardScore !== 'function') {
        return { success: false, msg: 'leaderboard_unavailable' };
      }
      return await new Promise((resolve) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        setTimeout(() => done({ success: false, msg: 'load_timeout' }), 12000);
        mgr.loadCurrentPlayerLeaderboardScore({
          leaderboardId,
          ...(collection ? { collection } : {}),
          callback: {
            onSuccess: (res) => {
              const cs = (res && res.currentUserScore) || null;
              done({ success: !!cs, score: cs, user: (cs && cs.user) || null, msg: cs ? 'ok' : 'no_score' });
            },
            onFailure: (code, message) => done({ success: false, msg: message || ('code_' + code) }),
          },
        });
      });
    } catch (e) {
      return { success: false, msg: e.message || 'load_error' };
    }
  }

  /** 解锁成就：{ achievementId } */
  async function unlockAchievement(opts = {}) { return tapCall('unlockAchievement', opts); }
  /** 打开成就面板 */
  async function showAchievements() { return tapCall('showAchievements'); }

  // ---- 云存档（TapTap CloudSaveManager）----
  // 文档要点（@taptap/instant-games-open-mcp 集成指南）：
  //   - tap 是运行时自动注入的全局对象，无需 npm install / import。
  //   - 存档文件写在 tap.env.USER_DATA_PATH（tapfile://usr），再通过 CloudSaveManager 上传云端。
  //   - 服务端限制：400001 上传频率(每分钟 1 次)、400007 不允许并发、400009 存档名禁空格/中文。
  //   - 仅 TapTap H5 小游戏环境可用；浏览器调试 / Capacitor 原生环境自动跳过。
  const CLOUD_SLOT = 'chexing_save';                 // 存档名：无空格、无中文（满足 400009）
  let _cloudBusy = false;                            // 并发锁（应对 400007）
  let _cloudLastSave = 0;                            // 上次成功上传时间戳（应对 400001）
  const _cloudThrottleMs = 60000;                    // 节流：60s（与服务端频率上限一致）

  function _cloudSaveManager() {
    _refreshTap();
    if (!isTapMiniGame) return null;
    try { return (tap && typeof tap.getCloudSaveManager === 'function') ? tap.getCloudSaveManager() : null; } catch (e) { return null; }
  }
  function _fsManager() {
    _refreshTap();
    if (!isTapMiniGame) return null;
    try { return (tap && typeof tap.getFileSystemManager === 'function') ? tap.getFileSystemManager() : null; } catch (e) { return null; }
  }
  function _cloudDir() {
    try { return (tap && tap.env && tap.env.USER_DATA_PATH) ? tap.env.USER_DATA_PATH : 'tapfile://usr'; } catch (e) { return 'tapfile://usr'; }
  }
  function _cloudFilePath() { return _cloudDir() + '/' + CLOUD_SLOT + '.json'; }

  /**
   * 保存游戏数据到 TapTap 云存档（跨设备 / 防清档核心）。
   * @param {object} dataObj 游戏存档对象（通常是全局 S）
   * @param {boolean} [force] 忽略本地 60s 节流（页面隐藏前最后同步用），仍受服务端 60s 频率限制
   * @returns {Promise<{success:boolean, msg:string}>}
   */
  async function saveToCloud(dataObj, force) {
    const csm = _cloudSaveManager();
    const fs = _fsManager();
    if (!csm || !fs) return { success: false, msg: 'cloud_unavailable' };
    const nowTs = Date.now();
    if (!force && (nowTs - _cloudLastSave) < _cloudThrottleMs) return { success: false, msg: 'throttled' };
    if (_cloudBusy) return { success: false, msg: 'busy' };
    _cloudBusy = true;
    try {
      const filePath = _cloudFilePath();
      const json = JSON.stringify(dataObj || {});
      // 防御：确保用户数据目录存在
      try { fs.mkdir({ dirPath: _cloudDir(), recursive: true, success() {}, fail() {} }); } catch (e) {}
      await new Promise((res, rej) => { fs.writeFile({ filePath, data: json, encoding: 'utf8', success: () => res(), fail: (e) => rej(e) }); });
      // 查询已有存档，决定创建还是更新（单存档策略：同名更新）
      const list = await new Promise((res) => { csm.getArchiveList({ success: (r) => res(r), fail: () => res(null) }); });
      const existing = (list && Array.isArray(list.saves)) ? list.saves.find(s => s.name === CLOUD_SLOT) : null;
      if (existing && existing.uuid) {
        await new Promise((res) => {
          csm.updateArchive({
            archiveUUID: existing.uuid,
            archiveMetaData: { name: CLOUD_SLOT, summary: 'auto', playtime: 0 },
            archiveFilePath: filePath,
            success: () => res(), fail: (e) => res(e),
          });
        });
      } else {
        await new Promise((res) => {
          csm.createArchive({
            archiveMetaData: { name: CLOUD_SLOT, summary: 'auto', playtime: 0 },
            archiveFilePath: filePath,
            success: () => res(), fail: (e) => res(e),
          });
        });
      }
      _cloudLastSave = Date.now();
      log('cloud save ok');
      return { success: true, msg: 'cloud_saved' };
    } catch (e) {
      warn('cloud save failed:', e);
      return { success: false, msg: String((e && e.errMsg) || e) };
    } finally {
      _cloudBusy = false;
    }
  }

  /**
   * 从 TapTap 云存档拉取游戏数据。
   * @returns {Promise<{success:boolean, data?:object, msg:string}>}
   */
  async function loadFromCloud() {
    const csm = _cloudSaveManager();
    const fs = _fsManager();
    if (!csm || !fs) return { success: false, msg: 'cloud_unavailable' };
    return new Promise((resolve) => {
      csm.getArchiveList({
        success: (res) => {
          const archive = (res.saves && res.saves.length) ? res.saves.find(s => s.name === CLOUD_SLOT) : null;
          if (!archive || !archive.uuid) { resolve({ success: false, msg: 'no_archive' }); return; }
          const target = _cloudDir() + '/' + CLOUD_SLOT + '_dl.json';
          csm.getArchiveData({
            archiveUUID: archive.uuid,
            archiveFileId: archive.fileId,
            targetFilePath: target,
            success: (dl) => {
              const fp = (dl && dl.filePath) ? dl.filePath : target;
              fs.readFile({
                filePath: fp,
                encoding: 'utf8',
                success: (fr) => {
                  try { resolve({ success: true, data: JSON.parse(fr.data) }); }
                  catch (e) { resolve({ success: false, msg: 'parse_error' }); }
                },
                fail: () => resolve({ success: false, msg: 'read_failed' }),
              });
            },
            fail: () => resolve({ success: false, msg: 'download_failed' }),
          });
        },
        fail: () => resolve({ success: false, msg: 'list_failed' }),
      });
    });
  }

  /**
   * 删除云存档（清档时调用，避免本地清了云端还在）。
   */
  async function deleteCloud() {
    const csm = _cloudSaveManager();
    if (!csm) return;
    try {
      const list = await new Promise((res) => { csm.getArchiveList({ success: (r) => res(r), fail: () => res(null) }); });
      const a = (list && Array.isArray(list.saves)) ? list.saves.find(s => s.name === CLOUD_SLOT) : null;
      if (a && a.uuid) {
        await new Promise((res) => { csm.deleteArchive({ archiveUUID: a.uuid, success: () => res(), fail: () => res() }); });
        log('cloud archive deleted');
      }
    } catch (e) { warn('deleteCloud failed:', e); }
  }

  // ---- 导出 ----
  return {
    isNative,
    get isTapMiniGame() { return _refreshTap() != null; },
    get isTapEnv() { return isNative || _refreshTap() != null; },
    refreshTapEnv: _refreshTap,
    onTapReady,
    onTapUnavailable,
    share,
    shareImage,
    initAd,
    showRewardAd,
    preloadAd,
    isAdReady,
    // 登录
    initLogin,
    login,
    checkSession,
    getSetting,
    getAccount,
    logout,
    // 邀请
    getInvitedUsers,
    // 七大功能模块
    complianceStartup,
    complianceExit,
    complianceState,
    checkUpdate,
    updateGame,
    openReview,
    checkLicense,
    shareToTapTap,
    openLeaderboard,
    submitLeaderboardScore,
    loadLeaderboardScores,
    loadCurrentPlayerScore,
    unlockAchievement,
    showAchievements,
    // 云存档
    saveToCloud,
    loadFromCloud,
    deleteCloud,
    // 版本信息
    version: '1.5.0',
    get platform() { return _refreshTap() != null ? 'taptap-h5' : (isNative ? 'android' : 'web'); },
  };

  // 如果全局 toast 不存在，提供一个简单实现
  function toast(msg) {
    try { if (typeof window !== 'undefined' && typeof window.toast === 'function') { window.toast(msg); return; } } catch (e) {}
    try { if (typeof GameGlobal !== 'undefined' && typeof GameGlobal.toast === 'function') { GameGlobal.toast(msg); return; } } catch (e) {}
    try { alert(msg); } catch (e) {}
  }
})();

// 挂载到全局供游戏代码使用（兼容多种运行时：window / globalThis / GameGlobal / self）
try { if (typeof window !== 'undefined') window.ChexingSDK = ChexingSDK; } catch (e) {}
try { if (typeof globalThis !== 'undefined') globalThis.ChexingSDK = ChexingSDK; } catch (e) {}
try { if (typeof GameGlobal !== 'undefined') GameGlobal.ChexingSDK = ChexingSDK; } catch (e) {}
try { if (typeof self !== 'undefined') self.ChexingSDK = ChexingSDK; } catch (e) {}

// 导出（如果支持 ES modules）
if (typeof module !== 'undefined') module.exports = ChexingSDK;
