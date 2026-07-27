# 车行 · TapTap 上架材料包（store-listing）

本目录为《车行》提交 TapTap 所需的**商店文案与素材**，与安卓工程 `android-app/` 配套使用。

## 目录内容
| 文件 | 用途 |
|------|------|
| `listing.md` | 游戏名称、简介、详细介绍、分类/标签/关键词、适龄、更新说明等可复制文案 |
| `privacy-policy.html` | 隐私政策模板（需自行托管后，将 URL 填入 TapTap 后台） |
| `screenshots.md` | 截图尺寸规格与建议截取画面清单 |
| `icon/icon-512.png` | 应用图标 512×512（已同步进安卓工程 mipmap） |
| `icon/icon.svg` | 图标矢量源，便于二次加工 |

## 使用顺序
1. 阅读 `listing.md`，把文案粘贴进 TapTap 开发者后台对应字段。
2. 将 `privacy-policy.html` 托管到任意可访问的网址（或用 TapTap 提供的隐私政策填写入口），填入后台。
3. 按 `screenshots.md` 截取游戏画面，上传到后台「游戏截图」。
4. 上传由 `android-app/` 构建出的 APK/AAB（见 `publish-guide.md`）。
5. 提交测试版（内测/抢先体验）审核。

> 所有文案均为可直接提交的草稿，请替换 `<填写…>` 占位符，并按实际运营补充隐私政策细节。
