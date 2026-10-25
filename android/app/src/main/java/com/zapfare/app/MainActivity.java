package com.zapfare.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Notification;
import android.content.pm.PackageManager;
import android.Manifest;

public class MainActivity extends Activity {
    private WebView webView;
    private PublicCollector collector;
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(24,61,53));
        getWindow().setNavigationBarColor(Color.WHITE);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245,247,242));
        FrameLayout root = new FrameLayout(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        collector = new PublicCollector(this, root, webView);
        webView.addJavascriptInterface(new NativeBridge(), "BestBookNative");
        // Android 15 enforces edge-to-edge: keep WebView clear of system bars and keyboard.
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "Install a browser to open the booking provider.", Toast.LENGTH_LONG).show(); }
                    return true;
                }
                return !"file".equalsIgnoreCase(uri.getScheme()) || !uri.toString().startsWith("file:///android_asset/index.html");
            }
        });
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl("file:///android_asset/index.html");
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        webView.saveState(state);
    }
    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    public final class NativeBridge {
        @JavascriptInterface public void collect(String request) { if(request!=null&&request.length()<4096)collector.collect(request); }
        @JavascriptInterface public void cancel(String id) { if(id!=null&&id.length()<65)collector.cancel(id); }
        @JavascriptInterface public void openAssistant(String request) { if(request!=null&&request.length()<8192)collector.openAssistant(request); }
        @JavascriptInterface public void enableNotifications() {
            runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},12);});
        }
        @JavascriptInterface public void notifyPrice(String text) {
            if(text==null||text.length()>500)return;
            runOnUiThread(()->{
                if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
                NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("price-watch","Price watches",NotificationManager.IMPORTANCE_DEFAULT));
                Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(MainActivity.this,"price-watch"):new Notification.Builder(MainActivity.this);
                builder.setSmallIcon(com.zapfare.app.R.drawable.ic_launcher).setContentTitle("BestBook price watch").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setAutoCancel(true);
                manager.notify(text.hashCode(),builder.build());
            });
        }
    }
    @Override protected void onDestroy() {
        collector.destroy();
        webView.removeJavascriptInterface("BestBookNative");
        webView.destroy();
        super.onDestroy();
    }
}
