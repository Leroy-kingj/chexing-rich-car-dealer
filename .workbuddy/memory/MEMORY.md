# 项目长期记忆：抢车位·华夏崛起（Capacitor Android / TapTap 版）

## 打包约定（重要）
- **后续构建产物 APK 包体名称统一用 `qcwhxjq.apk`**（GitHub Actions 构件名 qcwhxjq，内部 APK 即 qcwhxjq.apk）。

## 构建 / 推送方式（本环境网络限制）
- 本环境 `github.com:443`(HTTPS) 被防火墙阻断，但 `api.github.com:443` 与 `SSH:22` 可达。
- 已注册 SSH deploy key（仓库 Deploy keys id `158542169`，write）用于推送，命令：
  `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_cxbuild -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git push git@github.com:Leroy-kingj/chexing-rich-car-dealer.git master`
- 推送触发 GitHub Actions 云构建（ubuntu + JDK17）产出 APK。删除该 key 前本环境无法自动推送。

## 已接入关键能力
- **TapTap 防沉迷（合规）**：`build.gradle` 依赖 `com.taptap.sdk:tap-compliance:4.10.7`；原生 `ChexingTapPlugin.complianceStartup()` 调 `TapTapCompliance.startup(activity, openId)` 并注册 `TapTapComplianceCallback`；前端 TapTap 登录成功后 `ttComplianceStart()` → `ChexingSDK.complianceStartup(openId)`。合规 SDK 资源在 `_tapsdk/ex_tap-compliance/`（实名认证弹窗 + anti-addiction token）。
- TapTap 七大功能：登录 / 防沉迷 / 更新 / 评价 / 正版校验 / 分享 / 排行榜 / 成就，均经 `ChexingTapPlugin` + `chexing-sdk.js` 桥接。

## TapTap 小游戏（H5）发布工作流（instant-games-open-mcp）
- 工具包：`@taptap/instant-games-open-mcp`（纯 HTML5 / DOM 游戏可走 `prepare_h5_upload`+`upload_h5_game`；`@taptap/maker` 仅支持 Lua，不适用本项目）。
- **关键约束**：`upload_h5_game` 内部写死调 `/level/v1/upload`，**只接受「关卡类型」小游戏**。原 App `894229` 是「非关卡游戏」→ 用 MCP 传不进去。
- **可用路线**：用 `create_app`（`genre:casual`）新建一个**关卡类型**小游戏应用（会**自动选中**并获得 `miniapp_id`），再把 `h5-build/` 传上去。本项目的已发布小游戏 App = **`895103`「抢车位：华夏崛起」**（纯净名称，无后缀），状态：**已上线**（快速通道，版本更新直接上线）。旧项目 `895040`（带"小游戏"后缀）待用户决定是否删除。
- **必填项 `screenOrientation`**：发布时报「缺 screenOrientation」，须先 `update_app_info`（`developerId:430680, appId:895103, screenOrientation:1` 竖屏 / 2 横屏）。本项目是**竖屏**（css 注释"移动端竖屏 375-414px"+竖屏锁定）。
- **缓存落盘**：OAuth token 在 `AppData\Local\Temp\taptap-mcp\cache\local\oauth-token.json`，app 选择在 `...\cache\<hash>\app.json`。进程退出后新进程可直接读，**无需重新扫码、不会重复建应用**。
- **快速上架副作用**：以「休闲游戏大全」关卡形式分发，显示名会被覆盖为该合集名（游戏标题本身正确）。
- ⚠️ **图片上传限制（重要）**：MCP 的 `upload_image`（图标/截图/横幅上传）内部强制需要 `TAPTAP_MCP_CLIENT_SECRET`（生产签名密钥），**OAuth（MAC token）模式下无此密钥 → 图片类无法自动上传**；而 `update_app_info` 的**文本字段**（description/genre/screenOrientation 等）在 OAuth 下可正常调用。图标/截图只能：(a) 用户给 Client ID+Secret 我配置后自动传；或 (b) 用户在 TapTap 网页后台手动传。`894229` 商店页只暴露 500×400 缩略图（<512 被拒），真实 512×512 图标 URL 拿不到，不能靠填外部 URL 绕过。
- **H5 包目录**：`h5-build/`（从根 `index.html/app.js/game_data.js/chexing-sdk.js/css/assets` 拷出，避免把 node_modules/.git/APK 源传上去）。上传脚本参考 `_mcp_*.js`（OAuth→create_app/select→prepare→upload 一条龙，QR 用唯一文件名避免预览锁）。

## TapTap 小游戏 H5 运行时真实 JS API（已验证，重要）
- 全局 JSBridge 对象是 **`tap`**（非 `tt`）。官方文档接口：`tap.login` / `tap.getUserInfo` / `tap.showShareboard` / `tap.createRewardedVideoAd` / `tap.getLeaderboardManager()`。
- ⚠️ **环境检测致命坑（两次踩坑，已彻底修）**：
  - 坑1：`window.tap` 由 TapTap 容器**异步注入**。顶层 `const isTapMiniGame = typeof tap!=='undefined'` 只算一次会误判；且若用 `const` 声明、轮询里再赋值 `isTapMiniGame=true` 会抛 TypeError 使轮询链崩溃。
  - **坑2（最致命，tt11 依旧三问题未解的真正根因）**：`isTapEnv` getter 与 `tapCall()` 调用了**从未定义的 `_isTapEnv()`** → 每次环境检测抛 ReferenceError，整条初始化链崩溃（boot 的 getter 抛错→initTapEnv 永不执行→跳过登录不隐藏；tapLogin/分享的 `isTapEnv` 检查抛错→功能失败；广告走模拟发奖）。**教训：改 env 检测逻辑后，必须 `grep` 确认没有遗留对不存在函数的引用，并 `node --check` + 仿真。**
  - **官方运行时事实**：真机小游戏**无 `window` 对象、全局对象是 `GameGlobal`**；`tap` 异步注入。因此检测必须**多源健壮探测** `window.tap` / `GameGlobal.tap` / `globalThis.tap`，缓存到 IIFE 变量，导出 getter 每次访问即时 `_refreshTap()` 自愈合；全局挂载也要多目标（window/globalThis/GameGlobal/self）避免无 window 时整段崩溃。
  - 现方案：`let tap=null` + `_resolveTapSource()` 多源探测 + `_refreshTap()` 自愈合 +getter + `onTapReady` 回调（轮询 ~12s）。已用 Node 仿真验证：tap 异步注入后 `isTapEnv` 自动 true、login 正确走到 `tap.login()`。
- **激励视频广告**：`tap.createRewardedVideoAd({ adUnitId })` 创建单例；`ad.onLoad(()=>ad.show())`；`ad.onClose(res=>{ res.isEnded===false 表示中途关闭未看完 })`；`ad.onError(...)`。必须后台「流量变现→广告位管理」创建激励视频广告位拿到 adUnitId，填入 `chexing-sdk.js` 的 `TAPTAP_REWARD_AD_UNIT`（当前留空→广告位未配置提示、不白发奖）。
- **分享**：`tap.showShareboard({ templateId, sceneParam, success, fail })`，templateId 必填（已填 `ST17852487074771ZFOXF7UF`，已审核通过）；success 仅表示面板拉起，非分享成功。
- **排行榜**：`tap.getLeaderboardManager().submitScores({ scores:[{leaderboardId,score}], callback })` / `.openLeaderboard({ leaderboardId })`。资产榜 `ujpraygcl92w7ibe7v`、身价榜 `vpxb3y7j0o1kmmy57n`。
- 纯前端 H5 下 `tap.login()` 只返回 code（需后端 code2Session 换 openid），前端仅取昵称/头像；好友关系链 H5 接不进（需原生 SDK/后端）。

## 其它约定
- ⚠️ **重要工作流**：本地修改攒着，**绝不「修一条推一条」**。用户明确强调这样效率低。只有用户说"打包/构建/发布/出包"时才一次性 commit+push+触发 GitHub Actions 构建。

## 强制登录 + 云存档（tt15 起，用户 2026-07-30 拍板"强制登录，接云存档"）
- **强制登录**：TapTap 小游戏环境内**取消游客兜底**，登录失败/取消停留在登录页（提示"请登录 TapTap 后进入游戏"）；浏览器调试环境仍允许游客进入（无真实 TapTap 登录能力，仅开发用）。
- **云存档**：`chexing-sdk.js` 封装 `saveToCloud / loadFromCloud / deleteCloud`（`tap.getCloudSaveManager()` + `tap.getFileSystemManager()`，存档名 `chexing_save` 单存档同名更新）；节流 60s、并发锁、仅 `isTapMiniGame` 生效。
- **防清档核心流**：`proceedAfterLogin()` = 登录成功 → `loadFromCloud()` 拉云端档覆盖本地 → `load()` 水合+迁移 → `save()` → `enterGame()`。换设备/清本地缓存后登录同一账号即可恢复。
- `save()` 在 `isTapMiniGame && S.taptap` 时异步云同步；`visibilitychange` hidden 兜底最后同步；`reset-save` 清档时同时 `deleteCloud()`。

## TapTap 上传 vs 提交审核（重要，2026-07-29 用户怒斥纠正）
- ⚠️ **重大纠正**：`upload_h5_game` 的"应用处于审核中状态"返回文案是**快速上架固定套话，不可信**。真正是否进审核看 `get_app_status`：本项目 895103 已上线，版本更新走快速通道 → 真实状态「审核状态：已上线 (4)」，**不进人工审核队列，开发者立即可自测**。
- **上传（传可测版）≠ 提交审核**：用户说"上传/传包/让我测"= 直接 `upload_h5_game` 更新开发版；用户说"提交审核/发布上线"才涉及审核（谨慎）。
- 每个版本改动完，用户下令"上传"即传；上传后**必须 `get_app_status` 查真实状态并如实汇报**（文案不可信，勿被"审核中"套话误导）。
- 已上线应用反复上传更新不会反复进审核，放心传可测版——不要因"怕触发审核"迟迟不上传。
- ⚠️ **【严重事故教训·2026-07-30】上传前必须 `get_current_app_info` 确认 selected app 是目标应用！** MCP 的 selected app 缓存在 `...\cache\<hash>\app.json`，**会被用户在别处操作（如打开另一款小游戏 895115 水果派对）静默切换**。本环境 server cwd 还指向旧项目「双响炮」，缓存曾先后变成 895240/895115——若直接 `upload_h5_game` 会把当前项目包**误传到错误应用**（已发生：把抢车位 h5-build 误传 895115 水果派对，使其进入审核中）。**标准安全流程：每次上传前先 `get_current_app_info` 核对 appId；不符则 `select_app(developer_id:430680, app_id:895103)` 切回，再 `prepare_h5_upload` 确认路径+app，最后 `upload_h5_game`。** 误传后无法自动撤销，只能由用户在错误应用后台手动撤回/重传。

## ⚠️ 安全红线：不要向仓库提交真实凭证（2026-08-01 踩坑）
- **GitHub secret scanning 会拦截 push**：若提交内容含明文 PAT/密钥（如 `ghp_...`），远端直接 `remote rejected ... push declined due to repository rule violations`，推送失败。
- 本环境 `.workbuddy/memory/*.md` 笔记里**切勿粘贴真实 token**（2026-08-01 在 `2026-07-28.md` 误写用户提供的 GitHub PAT，首次 push 被拦；脱敏后 `git commit --amend` 重推才过）。
- **知悉真实凭证时**：只用一次即焚，或写入本地 `.gitignore` 覆盖的文件 / 环境变量，**绝不写进会被 commit 的源码或笔记**。一旦误提交：① 立即作废该凭证（GitHub → Settings → Developer settings → PAT 撤销）；② 从提交的文件中脱敏并 `commit --amend`（未推）或历史改写（已推需 force push，谨慎）。
- Push 命令走 SSH deploy key（见上「构建/推送方式」），本就不需要 PAT；下载 APK 构件才需 PAT，下载完即作废。
