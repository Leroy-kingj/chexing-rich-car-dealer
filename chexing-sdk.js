/**
 * ChexingSDK - 首富车行 TapTap 安卓版 SDK 桥接层
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
 * TapTap 七大功能模块（ChexingTap 原生插件）：
 * - ChexingSDK.complianceStartup() / complianceExit() / complianceState()  防沉迷合规
 * - ChexingSDK.checkUpdate() / updateGame()                                更新
 * - ChexingSDK.openReview()                                              评价
 * - ChexingSDK.checkLicense()                                           正版校验
 * - ChexingSDK.shareToTapTap()                                          分享到 TapTap
 * - ChexingSDK.openLeaderboard()                                        排行榜
 * - ChexingSDK.unlockAchievement() / showAchievements()                 成就
 *
 * 在非安卓环境（浏览器）中自动降级为 toast/模拟。
 */
const ChexingSDK = (() => {
  const TAG = '[ChexingSDK]';
  // 环境检测：是否在 Capacitor 原生容器内运行
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  // ---- 内部工具 ----
  function log(...args) { console.log(TAG, ...args); }
  function warn(...args) { console.warn(TAG, ...args); }

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
  async function showRewardAd() {
    log('showRewardAd called');
    if (!isNative) {
      // 浏览器测试模式：模拟 2 秒后返回成功
      toast('【测试模式】模拟观看广告...');
      return new Promise(resolve => {
        setTimeout(() => {
          toast('【测试模式】广告观看完成！');
          resolve({ success: true, msg: 'test_mode_success' });
        }, 2000);
      });
    }
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
    log('initLogin:', opts);
    return callPlugin('ChexingLogin', 'initLogin', opts);
  }

  /**
   * 拉起 TapTap 登录授权
   * @returns {Promise<{success:boolean, openid?:string, unionid?:string, name?:string, avatar?:string}>}
   *   浏览器环境：返回 { success:false, msg:'unsupported_platform' }
   *
   * 用法：
   *   const r = await ChexingSDK.login();
   *   if (r.success) { 使用 r.openid / r.name / r.avatar ... }
   */
  async function login() {
    log('login called');
    if (!isNative) {
      toast('请在 TapTap 客户端中使用登录功能');
      return { success: false, msg: 'unsupported_platform' };
    }
    return callPlugin('ChexingLogin', 'login', {});
  }

  /**
   * 获取当前已登录账号
   * @returns {Promise<{loggedIn:boolean, openid?, unionid?, name?, avatar?}>}
   */
  async function getAccount() {
    return callPlugin('ChexingLogin', 'getAccount', {});
  }

  /**
   * 退出 TapTap 登录
   * @returns {Promise<{success:boolean}>}
   */
  async function logout() {
    log('logout called');
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

  // ---- TapTap 七大功能模块（ChexingTap 原生插件） ----
  // 统一封装：浏览器环境自动降级为 toast 提示
  async function tapCall(method, data = {}) {
    if (!isNative) {
      warn(`ChexingTap.${method} called in browser (non-native), using fallback`);
      toast(`请在 TapTap 客户端中使用「${method}」功能`);
      return { success: false, msg: 'unsupported_platform' };
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

  /** 分享到 TapTap 动态：{ title?, contents?, failUrl? } */
  async function shareToTapTap(opts = {}) { return tapCall('shareToTapTap', opts); }

  /** 打开排行榜：{ leaderboardId, openId? } */
  async function openLeaderboard(opts = {}) { return tapCall('openLeaderboard', opts); }

  /** 解锁成就：{ achievementId } */
  async function unlockAchievement(opts = {}) { return tapCall('unlockAchievement', opts); }
  /** 打开成就面板 */
  async function showAchievements() { return tapCall('showAchievements'); }

  // ---- 导出 ----
  return {
    isNative,
    share,
    shareImage,
    initAd,
    showRewardAd,
    preloadAd,
    isAdReady,
    // 登录
    initLogin,
    login,
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
    unlockAchievement,
    showAchievements,
    // 版本信息
    version: '1.2.0',
    platform: isNative ? 'android' : 'web',
  };

  // 如果全局 toast 不存在，提供一个简单实现
  function toast(msg) {
    if (typeof window.toast === 'function') {
      window.toast(msg);
    } else {
      alert(msg);
    }
  }
})();

// 挂载到全局供游戏代码使用
window.ChexingSDK = ChexingSDK;

// 导出（如果支持 ES modules）
if (typeof module !== 'undefined') module.exports = ChexingSDK;
