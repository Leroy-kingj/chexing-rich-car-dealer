# 车行 · 构建 / 签名 / 发布到 TapTap 指南

本指南帮助你把 `android-app/` 里的 Capacitor 安卓工程编译成可安装的包，并发布到 TapTap 测试版。

> 当前沙箱环境**没有 Android SDK / Java**，无法在此编译签名。以下步骤在你的本机（装有 Android Studio）完成。

---

## 一、前置环境（本机）
- **Android Studio**（含 Android SDK、Gradle、JDK 17+）
- 已安装 Git Bash 或终端
- Java 17（Android Studio 自带）

---

## 二、打开工程并同步
1. 打开 Android Studio → `Open` → 选择 `android-app/android` 目录。
2. 首次打开会下载 Gradle 与 SDK 构建工具（按提示同意并等待 Sync 完成）。
3. 确认 `app/src/main/assets/public/` 下能看到 `index.html`、`app.js`、`game_data.js`、`css/`、`assets/`（这是已同步好的网页游戏）。

### 改了网页代码后如何更新
若你修改了 `app.js` / `index.html` / `css` / `assets`，在本仓库根目录执行：
```bash
cd android-app
npx cap sync android      # 把 www/ 重新同步进安卓工程
```
然后再回到 Android Studio 点 `Sync Project with Gradle Files`。

---

## 三、生成签名密钥（仅首次）
在终端执行（请牢记密码与别名，丢失无法找回）：
```bash
keytool -genkeypair -v -keystore ../chexing-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias chexing
```
- 生成的 `chexing-release.keystore` 放在 `android-app/` 同级（**切勿提交到公开仓库**）。
- 建议把 keystore 备份到安全位置。

---

## 四、配置签名
编辑 `android-app/android/app/build.gradle`，在 `android { ... }` 内加入：
```gradle
signingConfigs {
    release {
        storeFile file("../chexing-release.keystore")
        storePassword "你的密钥库密码"
        keyAlias "chexing"
        keyPassword "你的密钥密码"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## 五、构建发布包
- **APK（测试/内测最方便）**：
  Android Studio 菜单 `Build → Build Bundle(s) / APK(s) → Build APK(s)`，
  产物在 `android-app/android/app/build/outputs/apk/release/app-release.apk`。
- **AAB（正式上架推荐）**：
  `Build → Generate Signed Bundle / APK → Android App Bundle`，
  产物为 `app-release.aab`。
- 命令行（可选）：
  ```bash
  cd android-app/android
  ./gradlew assembleRelease      # APK
  ./gradlew bundleRelease        # AAB
  ```

---

## 六、发布到 TapTap 测试版
1. 登录 [TapTap 开发者后台](https://developer.taptap.cn)。
2. 「创建游戏」→ 填写游戏名称 **车行**、分类（休闲/放置）、一句话简介等（文案见 `store-listing/listing.md`）。
3. 在「版本管理 / 测试版」中：
   - 上传刚构建的 **APK**（测试版用 APK 最方便分发）。
   - 填写版本号（如 `1.0.0-beta.1`）、更新说明。
   - 上传商店素材：图标（`store-listing/icon/icon-512.png`）、截图（按 `store-listing/screenshots.md` 截取）。
   - 填写隐私政策链接（托管 `store-listing/privacy-policy.html` 后的 URL）。
4. 提交**测试版 / 内测**审核（测试版通常无需完整版号评审，可快速分发二维码给玩家）。
5. 审核通过后，生成测试下载二维码/链接，即可邀请玩家试玩收集反馈。
6. 正式上架时，改传 **AAB** 并提交完整版评审。

---

## 七、包名与品牌自定义（如需）
- 包名（应用唯一标识）：修改 `android-app/capacitor.config.json` 的 `appId`（如 `com.yourcompany.chexing`），然后重新 `npx cap sync android`。
- 应用显示名：当前为「车行」，改 `capacitor.config.json` 的 `appName` 后重新 sync。
- 应用图标：已生成为品牌橙底白车，源文件 `store-listing/icon/icon.svg`，重绘后运行 `python tools/make_icon.py` 可重新生成并写入各密度 mipmap。

---

## 八、目录结构速览
```
.
├─ index.html / app.js / game_data.js / css / assets   ← 网页游戏本体
├─ android-app/                                         ← Capacitor 安卓工程
│  ├─ www/                                              ← 网页构建副本（cap sync 来源）
│  ├─ capacitor.config.json                             ← 包名/应用名配置
│  └─ android/                                          ← 原生安卓工程（Android Studio 打开它）
├─ store-listing/                                       ← TapTap 上架文案与素材
│  ├─ listing.md
│  ├─ privacy-policy.html
│  ├─ screenshots.md
│  └─ icon/  (icon-512.png / icon.svg)
└─ tools/make_icon.py                                   ← 图标生成脚本
```
