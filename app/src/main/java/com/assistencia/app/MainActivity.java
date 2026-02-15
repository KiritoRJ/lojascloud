
package com.assistencia.app;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    // COLOQUE AQUI A URL DO SEU GITHUB PAGES APÓS FAZER O DEPLOY
    // Exemplo: "https://seu-usuario.github.io/nome-do-repositorio/"
    private static final String APP_URL = ""; 

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();
        
        // Configurações essenciais para React e Apps Online
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        
        // Otimização para funcionamento Online
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        
        // Habilitar Cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Cliente para lidar com gallery/camera e elementos de interface
        webView.setWebChromeClient(new WebChromeClient());
        
        // Mantém a navegação dentro do WebView
        webView.setWebViewClient(new WebViewClient());

        // Lógica de carregamento: Prioriza URL remota, senão usa asset local
        if (APP_URL != null && !APP_URL.isEmpty() && APP_URL.startsWith("http")) {
            webView.loadUrl(APP_URL);
        } else {
            webView.loadUrl("file:///android_asset/index.html");
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
