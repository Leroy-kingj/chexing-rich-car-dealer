package com.chexing.game;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.taptap.sdk.compliance.TapTapCompliance;
import com.taptap.sdk.compliance.TapTapComplianceCallback;
import com.taptap.sdk.update.TapTapUpdate;
import com.taptap.sdk.update.TapTapUpdateCallback;
import com.taptap.sdk.review.TapTapReview;
import com.taptap.sdk.license.TapTapLicense;
import com.taptap.sdk.share.TapTapShare;
import com.taptap.sdk.share.TapTapShareBuilder;
import com.taptap.sdk.leaderboard.androidx.TapTapLeaderboard;
import com.taptap.sdk.achievement.TapTapAchievement;
import com.taptap.sdk.login.TapTapLogin;
import com.taptap.sdk.login.TapTapAccount;

import java.util.Map;


/**
 * ChexingTapPlugin —— 桥接 TapTap 七大功能模块：
 *   合规（防沉迷）/ 更新 / 评价 / 正版校验 / 分享 / 排行榜 / 成就
 *
 * 所有方法内部统一先调用 TapSdkHolder.ensureInit()，因此无需关心初始化顺序。
 * 在浏览器（非原生）环境下，ChexingSDK 层会直接降级，不会走到本插件。
 */
@CapacitorPlugin(name = "ChexingTap")
public class ChexingTapPlugin extends Plugin {

    private static final String TAG = "ChexingTap";

    // 合规回调只注册一次（防止重复回调导致重复逻辑）
    private static TapTapComplianceCallback sComplianceCallback = null;

    // 取当前已登录账号的 openId，合规 / 排行榜需要
    private String currentOpenId() {
        try {
            TapTapAccount acc = TapTapLogin.getCurrentTapAccount();
            if (acc != null) {
                String id = acc.getOpenId();
                if (id != null && !id.isEmpty()) return id;
            }
        } catch (Exception ignore) {
            // 未登录或 SDK 未就绪
        }
        return "";
    }

    // ============================ 合规（防沉迷） ============================

    /**
     * 启动防沉迷合规。游戏启动且已拿到 openId 时调用一次。
     * openId 缺省时尝试取当前登录账号。
     */
    @PluginMethod
    public void complianceStartup(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            String openId = call.getString("openId", "");
            if (openId == null || openId.isEmpty()) openId = currentOpenId();

            TapTapCompliance.startup(getActivity(), openId);

            if (sComplianceCallback == null) {
                sComplianceCallback = new TapTapComplianceCallback() {
                    @Override
                    public void onComplianceResult(int code, Map result) {
                        Log.i(TAG, "onComplianceResult code=" + code + " result=" + result);
                    }
                };
                TapTapCompliance.registerComplianceCallback(sComplianceCallback);
            }

            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "complianceStartup failed", e);
            call.reject("合规初始化失败: " + e.getMessage());
        }
    }

    /**
     * 退出合规（例如用户退出登录后调用）。
     */
    @PluginMethod
    public void complianceExit(PluginCall call) {
        try {
            TapTapCompliance.exit();
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "complianceExit failed", e);
            call.reject("退出合规失败: " + e.getMessage());
        }
    }

    /**
     * 查询合规状态：年龄区间、剩余可玩时间（秒）、当前 accessToken。
     */
    @PluginMethod
    public void complianceState(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("ageRange", TapTapCompliance.getAgeRange());
            r.put("remainingTime", TapTapCompliance.getRemainingTime());
            r.put("accessToken", TapTapCompliance.getCurrentAccessToken());
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ============================ 更新 ============================

    /**
     * 静默检测强制更新（有更新时 TapTap 会自动弹窗提示）。
     */
    @PluginMethod
    public void checkUpdate(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            TapTapUpdate.checkForceUpdate();
            JSObject r = new JSObject();
            r.put("success", true);
            r.put("msg", "checkForceUpdate_called");
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "checkUpdate failed", e);
            call.reject("检测更新失败: " + e.getMessage());
        }
    }

    /**
     * 拉起 TapTap 应用内更新流程（用户取消会触发 onCancel，成功则应用自重启）。
     */
    @PluginMethod
    public void updateGame(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            getActivity().runOnUiThread(() -> {
                TapTapUpdate.updateGame(getActivity(), new TapTapUpdateCallback() {
                    @Override
                    public void onCancel() {
                        Log.i(TAG, "updateGame canceled by user");
                    }
                });
            });
            JSObject r = new JSObject();
            r.put("success", true);
            r.put("msg", "update_flow_started");
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "updateGame failed", e);
            call.reject("更新失败: " + e.getMessage());
        }
    }

    // ============================ 评价 ============================

    /**
     * 打开 TapTap 评价/评分页。
     */
    @PluginMethod
    public void openReview(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            TapTapReview.openReview();
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "openReview failed", e);
            call.reject("打开评价失败: " + e.getMessage());
        }
    }

    // ============================ 正版校验 ============================

    /**
     * 启动 TapTap 正版校验（盗版会弹窗提示）。
     */
    @PluginMethod
    public void checkLicense(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            TapTapLicense.checkLicense(getActivity());
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "checkLicense failed", e);
            call.reject("正版校验失败: " + e.getMessage());
        }
    }

    // ============================ 分享到 TapTap ============================

    /**
     * 调起 TapTap 动态分享。
     * opts: { title, contents, failUrl }
     */
    @PluginMethod
    public void shareToTapTap(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            String title = call.getString("title", "首富车行");
            String contents = call.getString("contents", "我在首富车行当老板，快来一起经营你的车行帝国！");
            String failUrl = call.getString("failUrl", "https://www.taptap.cn/app/3ahf55jztit22xj8cy");

            TapTapShareBuilder builder = new TapTapShareBuilder();
            builder.addAppId();   // 注意：4.10.7 该重载返回 void，需单独调用（从已初始化的 SDK 读取 appId）
            TapTapShare share = builder.addTitle(title)
                    .addContents(contents)
                    .addFailUrl(failUrl)
                    .build();

            final int code = share.share(getActivity());
            JSObject r = new JSObject();
            r.put("success", code == 0);
            r.put("code", code);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "shareToTapTap failed", e);
            call.reject("分享失败: " + e.getMessage());
        }
    }

    // ============================ 排行榜 ============================

    /**
     * 打开 TapTap 排行榜。
     * opts: { leaderboardId, openId? }  —— leaderboardId 为开发者后台配置的榜单 ID
     */
    @PluginMethod
    public void openLeaderboard(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            String leaderboardId = call.getString("leaderboardId", "");
            String openId = call.getString("openId", "");
            if (openId == null || openId.isEmpty()) openId = currentOpenId();

            TapTapLeaderboard.openLeaderboard(getActivity(), openId, leaderboardId);
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "openLeaderboard failed", e);
            call.reject("打开排行榜失败: " + e.getMessage());
        }
    }

    // ============================ 成就 ============================

    /**
     * 解锁指定成就。
     * opts: { achievementId }  —— achievementId 为开发者后台配置的成就 ID
     */
    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            String achievementId = call.getString("achievementId", "");
            if (achievementId == null || achievementId.isEmpty()) {
                call.reject("achievementId 不能为空");
                return;
            }
            TapTapAchievement.unlock(achievementId);
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "unlockAchievement failed", e);
            call.reject("解锁成就失败: " + e.getMessage());
        }
    }

    /**
     * 打开成就面板。
     */
    @PluginMethod
    public void showAchievements(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            TapTapAchievement.showAchievements();
            JSObject r = new JSObject();
            r.put("success", true);
            call.resolve(r);
        } catch (Exception e) {
            Log.e(TAG, "showAchievements failed", e);
            call.reject("打开成就失败: " + e.getMessage());
        }
    }
}
