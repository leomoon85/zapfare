const fs=require('fs');let s=fs.readFileSync('android/app/src/main/java/com/zapfare/app/MainActivity.java','utf8');
s=s.replace('import android.widget.Toast;','import android.widget.Toast;\nimport android.widget.FrameLayout;\nimport android.webkit.JavascriptInterface;\nimport android.app.NotificationChannel;\nimport android.app.NotificationManager;\nimport android.app.Notification;\nimport android.content.pm.PackageManager;\nimport android.Manifest;');
s=s.replace('private WebView webView;','private WebView webView;\n    private PublicCollector collector;');
s=s.replace('setContentView(webView);','FrameLayout root = new FrameLayout(this);\n        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));\n        setContentView(root);\n        collector = new PublicCollector(this, root, webView);\n        webView.addJavascriptInterface(new NativeBridge(), "BestBookNative");');
s=s.replace('webView.destroy();','collector.destroy();\n        webView.removeJavascriptInterface("BestBookNative");\n        webView.destroy();');
s=s.replace('    @Override protected void onDestroy()',`    public final class NativeBridge {
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
    @Override protected void onDestroy()`);
fs.writeFileSync('android/app/src/main/java/com/zapfare/app/MainActivity.java',s);
let manifest=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8').replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');fs.writeFileSync('android/app/src/main/AndroidManifest.xml',manifest);
let html=fs.readFileSync('index.html','utf8').replace('<meta name="theme-color"','<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'self\' wss://relay.damus.io wss://nos.lol; img-src \'self\' data:; object-src \'none\'; frame-src \'none\'; base-uri \'none\'"><meta name="theme-color"');fs.writeFileSync('index.html',html);
