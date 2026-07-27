package com.chexing.game;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "ChexingShare")
public class ChexingSharePlugin extends Plugin {

    private static final String TAG = "ChexingShare";

    @PluginMethod
    public void share(PluginCall call) {
        try {
            String title = call.getString("title", "首富车行");
            String text = call.getString("text", "");
            String url = call.getString("url", "");

            // Build share text
            StringBuilder shareText = new StringBuilder();
            if (title != null && !title.isEmpty()) {
                shareText.append(title);
            }
            if (text != null && !text.isEmpty()) {
                if (shareText.length() > 0) shareText.append("\n");
                shareText.append(text);
            }

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_SUBJECT, title != null ? title : "首富车行");
            intent.putExtra(Intent.EXTRA_TEXT, shareText.toString());

            if (url != null && !url.isEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, shareText.toString() + "\n" + url);
            }

            // Add chooser title
            Intent chooser = Intent.createChooser(intent, "分享到");
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "share_chooser_opened");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Share failed", e);
            call.reject("分享失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void shareImage(PluginCall call) {
        try {
            String title = call.getString("title", "首富车行");
            String text = call.getString("text", "");
            String imagePath = call.getString("imagePath", "");
            String imageUrl = call.getString("imageUrl", "");

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/*");
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
            if (text != null && !text.isEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, text);
            }

            // Handle image from path or URL
            if (imageUrl != null && !imageUrl.isEmpty()) {
                intent.putExtra(Intent.EXTRA_STREAM, Uri.parse(imageUrl));
            } else if (imagePath != null && !imagePath.isEmpty()) {
                // For local files, use FileProvider or direct URI
                java.io.File file = new java.io.File(imagePath);
                if (file.exists()) {
                    Uri imageUri = androidx.core.content.FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        file
                    );
                    intent.putExtra(Intent.EXTRA_STREAM, imageUri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }
            }

            Intent chooser = Intent.createChooser(intent, "分享图片到");
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("msg", "share_image_chooser_opened");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "ShareImage failed", e);
            call.reject("图片分享失败: " + e.getMessage());
        }
    }
}
