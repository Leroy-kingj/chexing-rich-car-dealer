# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# TapTap SDK 已自带混淆，重复混淆会出错，需跳过
-keep class com.tds.** { *; }
-keep class com.taptap.** { *; }
-keep class com.tapsdk.** { *; }
-keep class tds.androidx.** { *; }
# 数据存储（如使用 TDS 登录/云存档）相关混淆保留
-keep class com.leancloud.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
