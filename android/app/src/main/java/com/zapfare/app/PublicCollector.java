package com.zapfare.app;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** On-device public WebViews, isolated from the trusted application's native bridge. */
public final class PublicCollector {
    private final Activity activity;
    private final FrameLayout root;
    private final WebView appView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, Job> jobs = new HashMap<>();
    private final String reader, formAssistant, checkoutAssistant;
    private Dialog assistantDialog;
    private WebView assistantView;
    private boolean destroyed;

    public PublicCollector(Activity activity, FrameLayout root, WebView appView) {
        this.activity=activity;this.root=root;this.appView=appView;
        reader=asset("collector/public-sources.js");formAssistant=asset("collector/form-assistant.js");checkoutAssistant=asset("collector/checkout-assistant.js");
    }
    private String asset(String path) {
        try (java.io.InputStream stream=activity.getAssets().open(path); java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream()) {
            byte[] buffer=new byte[8192];int n;while((n=stream.read(buffer))!=-1)output.write(buffer,0,n);
            return output.toString(StandardCharsets.UTF_8.name());
        } catch(Exception e){return "";}
    }
    private boolean allowed(String url) {
        Uri uri=Uri.parse(url);String host=uri.getHost();
        return "https".equals(uri.getScheme())&&("www.redbus.in".equals(host)||"www.ixigo.com".equals(host)||"www.abhibus.com".equals(host))&&uri.getUserInfo()==null;
    }
    private void configure(WebView view) {
        WebSettings settings=view.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(view,false);
    }
    public void collect(String request) {
        activity.runOnUiThread(()->{
            try {
                JSONObject object=new JSONObject(request);String id=object.getString("id"),url=object.getString("url");JSONObject query=object.getJSONObject("query");
                if(destroyed||id.length()>64||!allowed(url)||query.getString("from").length()>80||query.getString("to").length()>80||!query.getString("date").matches("\\d{4}-\\d{2}-\\d{2}"))return;
                if(jobs.size()>=2){deliver(id,new JSONObject().put("status","busy").put("message","Another website check is running."));return;}
                Job job=new Job(id,query,url);jobs.put(id,job);job.start();
            }catch(Exception ignored){}
        });
    }
    public void cancel(String id){activity.runOnUiThread(()->{Job job=jobs.get(id);if(job!=null)job.finish("cancelled","Search cancelled.",null);});}
    private void deliver(String id,JSONObject result){if(!destroyed)appView.evaluateJavascript("window.onNativeCollection&&window.onNativeCollection("+JSONObject.quote(id)+","+result.toString()+")",null);}
    private class Job {
        final String id,url;final JSONObject query;WebView view;boolean done=false;int attempts=0;
        final Runnable timeout=()->finish("unavailable","Website check timed out.",null);
        final Runnable poll=this::poll;
        Job(String id,JSONObject query,String url){this.id=id;this.query=query;this.url=url;}
        void start(){
            view=new WebView(activity);configure(view);view.setBackgroundColor(Color.WHITE);
            // Laid out behind the app, so page DOM has a real mobile viewport.
            root.addView(view,0,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
            view.setWebViewClient(new WebViewClient(){
                @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !allowed(r.getUrl().toString());}
                @Override public void onPageFinished(WebView v,String u){handler.removeCallbacks(poll);handler.postDelayed(poll,700);}
                @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())finish("unavailable","Website could not be loaded.",null);}
                @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse response){if(r.isForMainFrame()&&(response.getStatusCode()==403||response.getStatusCode()==429))finish("blocked","Website temporarily limited access.",null);}
            });
            handler.postDelayed(timeout,35000);view.loadUrl(url);
        }
        void poll(){
            if(done||destroyed)return;
            if(++attempts>16){finish("unreadable","The selected date or readable fares were not confirmed.",null);return;}
            view.evaluateJavascript(reader+"\n"+formAssistant+"\nJSON.stringify(advancePublicSearch("+query.toString()+"))",value->{
                if(done)return;
                try{
                    Object decoded=new JSONTokener(value).nextValue();JSONObject step=new JSONObject(String.valueOf(decoded));String status=step.optString("status");
                    if("done".equals(status)){finish("ready","Public page read.",step.getJSONObject("snapshot"));return;}
                    if("blocked".equals(status)||"interaction-required".equals(status)){finish(status,step.optString("message"),null);return;}
                    handler.postDelayed(poll,1000);
                }catch(Exception e){finish("unreadable","The website could not be inspected.",null);}
            });
        }
        void finish(String status,String message,JSONObject snapshot){
            if(done)return;done=true;handler.removeCallbacks(timeout);handler.removeCallbacks(poll);jobs.remove(id);
            if(view!=null){view.stopLoading();root.removeView(view);view.destroy();}
            try{JSONObject result=new JSONObject().put("status",status).put("message",message);if(snapshot!=null)result.put("snapshot",snapshot);deliver(id,result);}catch(Exception ignored){}
        }
    }
    public void openAssistant(String request){
        activity.runOnUiThread(()->{
            try{
                JSONObject target=new JSONObject(request);String url=target.getString("url");if(!allowed(url)||destroyed)return;
                if(assistantDialog!=null)assistantDialog.dismiss();
                Dialog dialog=new Dialog(activity,android.R.style.Theme_DeviceDefault_Light_NoActionBar);assistantDialog=dialog;
                LinearLayout layout=new LinearLayout(activity);layout.setOrientation(LinearLayout.VERTICAL);layout.setBackgroundColor(Color.WHITE);layout.setPadding(0,24,0,16);
                Button close=new Button(activity);close.setText("← Back to BestBook");close.setOnClickListener(v->dialog.dismiss());layout.addView(close);
                TextView status=new TextView(activity);status.setText("Review your route and date. Payments are completed on the website.");status.setTextColor(Color.rgb(24,61,53));status.setPadding(24,12,24,12);layout.addView(status);
                WebView web=new WebView(activity);assistantView=web;configure(web);layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));
                Runnable inspect=new Runnable(){int attempts=0;public void run(){if(!dialog.isShowing()||++attempts>40)return;web.evaluateJavascript(reader+"\n"+checkoutAssistant+"\nJSON.stringify(bestBookAssistCheckout("+target.toString()+"))",value->{try{JSONObject result=new JSONObject(String.valueOf(new JSONTokener(value).nextValue()));status.setText(result.optString("message"));if(result.has("checkout")){JSONObject checkout=result.getJSONObject("checkout");checkout.put("query",target.getJSONObject("query"));checkout.put("provider",target.getString("provider"));String identity=checkout.toString();if(!identity.equals(web.getTag())){web.setTag(identity);appView.evaluateJavascript("window.onNativeCheckout&&window.onNativeCheckout("+identity+")",null);}}}catch(Exception ignored){}if(dialog.isShowing())handler.postDelayed(this,2000);});}};
                web.setWebViewClient(new WebViewClient(){
                    @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if("https".equals(u.getScheme()))return false;if(!r.hasGesture())return true;try{activity.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
                    @Override public void onPageFinished(WebView v,String u){if(allowed(u))handler.post(inspect);}
                });
                dialog.setContentView(layout);dialog.setOnDismissListener(d->{handler.removeCallbacks(inspect);web.stopLoading();web.destroy();assistantView=null;assistantDialog=null;});dialog.show();dialog.getWindow().setLayout(-1,-1);web.loadUrl(url);
            }catch(Exception ignored){}
        });
    }
    public void destroy(){destroyed=true;for(Job job:new java.util.ArrayList<>(jobs.values()))job.finish("cancelled","Closed",null);if(assistantDialog!=null)assistantDialog.dismiss();handler.removeCallbacksAndMessages(null);}
}
