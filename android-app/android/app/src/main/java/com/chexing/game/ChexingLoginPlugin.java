package com.chexing.game;

import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.taptap.sdk.login.TapTapAccount;
import com.taptap.sdk.login.TapTapLogin;
import com.taptap.sdk.kit.internal.callback.TapTapCallback;
import com.taptap.sdk.kit.internal.exception.TapTapException;

/**
 * ChexingLoginPlugin —— 桥接 TapTap 原生登录（TapSDK v4）。
 *
 * JS 侧通过 ChexingSDK.login() / initLogin() / logout() / getAccount() 调用。
 *
 * 凭证统一在 TapSdkHolder 中维护，本插件不再硬编码。
 */
@CapacitorPlugin(name = "ChexingLogin")
public class ChexingLoginPlugin extends Plugin {

    private static final String TAG = "ChexingLogin";

    private boolean initialized = false;

    // 登录成功后缓存的账号信息（用于 getAccount）
    private String cachedOpenId = null;
    private String cachedUnionId = null;
    private String cachedName = null;
    private String cachedAvatar = null;

    /**
     * 初始化 TapSDK（登录模块依赖核心模块，统一初始化一次即可）。
     * 应在游戏启动时调用一次（app.js boot() 中已调用）。
     */
    @PluginMethod
    public void initLogin(PluginCall call) {
        try {
            TapSdkHolder.ensureInit(getContext());
            initialized = true;

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "login_sdk_initialized");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "initLogin failed", e);
            call.reject("TapTap 登录初始化失败: " + e.getMessage());
        }
    }

    /**
     * 拉起 TapTap 登录授权。
     * 成功后返回 { success:true, openid, unionid, name, avatar, accessToken }
     * 用户取消返回 reject("用户取消了登录")
     */
    @PluginMethod
    public void login(PluginCall call) {
        try {
            // 确保 SDK 已初始化
            TapSdkHolder.ensureInit(getContext());
            initialized = true;

            final PluginCall pending = call;
            // TapTap 登录必须在主线程调用
            getActivity().runOnUiThread(() -> {
                // 4.10.7 使用字面量权限 scope（Scopes 类在该版本未导出）
                String[] scopes = new String[]{ "public_profile" };
                TapTapLogin.loginWithScopes(getActivity(), scopes, new TapTapCallback<TapTapAccount>() {
                    @Override
                    public void onSuccess(TapTapAccount account) {
                        try {
                            cachedOpenId = account.getOpenId();
                            cachedUnionId = account.getUnionId();
                            cachedName = account.getName();
                            cachedAvatar = account.getAvatar();

                            JSObject result = new JSObject();
                            result.put("success", true);
                            result.put("openid", cachedOpenId);
                            result.put("unionid", cachedUnionId);
                            result.put("name", cachedName);
                            result.put("avatar", cachedAvatar);
                            try {
                                result.put("accessToken", String.valueOf(account.getAccessToken()));
                            } catch (Exception ignore) { /* 某些版本无此字段 */ }

                            Log.i(TAG, "login success openid=" + cachedOpenId + " name=" + cachedName);
                            pending.resolve(result);
                        } catch (Exception e) {
                            Log.e(TAG, "login onSuccess error", e);
                            pending.reject("解析登录结果失败: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onCancel() {
                        Log.i(TAG, "login canceled by user");
                        pending.reject("用户取消了登录");
                    }

                    @Override
                    public void onFail(@NonNull TapTapException exception) {
                        Log.e(TAG, "login failed", exception);
                        pending.reject("登录失败: " + exception.getMessage());
                    }
                });
            });

            // 保持调用存活，等待授权回调
            call.setKeepAlive(true);

        } catch (Exception e) {
            Log.e(TAG, "login failed", e);
            call.reject("登录失败: " + e.getMessage());
        }
    }

    /**
     * 获取当前已登录账号信息（未登录时 loggedIn=false）。
     */
    @PluginMethod
    public void getAccount(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("loggedIn", cachedOpenId != null);
            result.put("openid", cachedOpenId);
            result.put("unionid", cachedUnionId);
            result.put("name", cachedName);
            result.put("avatar", cachedAvatar);
            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * 退出 TapTap 登录。
     */
    @PluginMethod
    public void logout(PluginCall call) {
        try {
            TapTapLogin.logout();
            cachedOpenId = null;
            cachedUnionId = null;
            cachedName = null;
            cachedAvatar = null;

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "logout_success");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "logout failed", e);
            call.reject("退出登录失败: " + e.getMessage());
        }
    }
}
