package com.chexing.game;

import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ChexingAd")
public class ChexingAdPlugin extends Plugin {

    private static final String TAG = "ChexingAd";

    // Ad state
    private boolean isAdReady = false;
    private boolean isAdShowing = false;
    private PluginCall pendingAdCall = null;

    @PluginMethod
    public void initAd(PluginCall call) {
        try {
            // TODO: Initialize TapTap Ad SDK here with app credentials
            // This will be called once during app startup
            String appId = call.getString("appId", "");
            String adUnitId = call.getString("adUnitId", "");

            Log.i(TAG, "initAd called: appId=" + appId + ", adUnitId=" + adUnitId);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "ad_initialized");
            result.put("platform", "taptap");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "initAd failed", e);
            call.reject("广告初始化失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showRewardVideo(PluginCall call) {
        try {
            if (isAdShowing) {
                call.reject("广告正在播放中");
                return;
            }

            isAdShowing = true;
            pendingAdCall = call;

            // TODO: Replace with actual TapTap/AdMob/GDT rewarded video ad implementation
            // For testing: simulate ad playback with delay
            getActivity().runOnUiThread(() -> {
                Toast.makeText(getContext(), "正在加载激励视频广告...", Toast.LENGTH_SHORT).show();

                // Simulate ad completion after 2 seconds (for testing)
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    onAdResult(true, "embed_success");
                }, 2000);
            });

            // Keep call alive - don't resolve/reject here
            call.setKeepAlive(true);

        } catch (Exception e) {
            Log.e(TAG, "showRewardVideo failed", e);
            isAdShowing = false;
            call.reject("广告播放失败: " + e.getMessage());
        }
    }

    /**
     * Called when ad completes or fails.
     * This method should be called from the actual ad SDK callback.
     */
    public void onAdResult(boolean success, String msg) {
        isAdShowing = false;

        if (pendingAdCall != null) {
            try {
                JSObject result = new JSObject();
                result.put("success", success);
                result.put("msg", msg != null ? msg : "");
                pendingAdCall.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Error resolving ad call", e);
            }
            pendingAdCall = null;
        }
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        try {
            // TODO: Check actual ad readiness from SDK
            JSObject result = new JSObject();
            result.put("ready", isAdReady);
            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void preloadAd(PluginCall call) {
        try {
            // TODO: Preload rewarded video ad from SDK
            isAdReady = true;
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "ad_preloaded");
            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
