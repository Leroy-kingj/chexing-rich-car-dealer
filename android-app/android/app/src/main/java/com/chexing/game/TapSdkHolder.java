package com.chexing.game;

import android.content.Context;

import com.taptap.sdk.core.TapTapRegion;
import com.taptap.sdk.core.TapTapSdk;
import com.taptap.sdk.core.TapTapSdkOptions;

/**
 * 统一的 TapSDK 初始化持有者。
 *
 * 登录模块（ChexingLoginPlugin）与各功能模块（ChexingTapPlugin）都依赖核心 SDK，
 * 用静态变量保证 TapTapSdk.init 在进程内只调用一次（重复调用会被 TapTap 拒绝）。
 *
 * 凭证（Client ID / Client Token）集中在此处维护，与 TapTap 开发者后台保持一致。
 */
public final class TapSdkHolder {

    // ====== TapTap 应用凭证（开发者后台 → 你的游戏 → 游戏服务 → 配置） ======
    public static final String CLIENT_ID = "3ahf55jztit22xj8cy";
    public static final String CLIENT_TOKEN = "rPqw6reaTYaqgzIfmavdCRQwYI66G6uLxn51cgkC";
    // =========================================================================

    private static boolean initialized = false;

    private TapSdkHolder() {
        // 工具类，禁止实例化
    }

    /**
     * 确保 TapSDK 核心已初始化（幂等）。在任意使用 TapSDK 模块的 PluginMethod 开头调用即可。
     */
    public static synchronized void ensureInit(Context context) {
        if (!initialized && context != null) {
            TapTapSdkOptions options = new TapTapSdkOptions(CLIENT_ID, CLIENT_TOKEN, TapTapRegion.CN);
            TapTapSdk.init(context, options);
            initialized = true;
        }
    }

    public static synchronized boolean isInitialized() {
        return initialized;
    }
}
