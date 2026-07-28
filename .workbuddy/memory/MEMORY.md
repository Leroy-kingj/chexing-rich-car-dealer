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

## 其它约定
- ⚠️ **重要工作流**：本地修改攒着，**绝不「修一条推一条」**。用户明确强调这样效率低。只有用户说"打包/构建/发布/出包"时才一次性 commit+push+触发 GitHub Actions 构建。
- 平时可连续改多项、攒一批本地修改，推送前再同步 `android-app/www` 与 `public/` 并统一提交。
