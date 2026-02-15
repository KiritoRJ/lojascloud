
package com.assistencia.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String TARGET_URL = "https://lovely-empanada-d13b49.netlify.app/";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        
        // Configurações essenciais para Web Apps modernos (React/Vite)
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        
        // Suporte a HTTPS e conteúdo misto
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Mantém a navegação dentro do app se for o mesmo domínio
                if (url.startsWith(TARGET_URL)) {
                    return false;
                }
                // Links externos (como WhatsApp) podem ser abertos fora se necessário
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Tenta carregar do assetLoader se a URL for interna, senão segue o fluxo normal
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Se houver erro de rede (offline), mostra uma mensagem amigável
                String errorHtml = "<html><body style='display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;'>" +
                        "<h1 style='color:#ef4444;'>Sem Conexão</h1>" +
                        "<p>Não foi possível carregar o sistema. Verifique sua internet.</p>" +
                        "<button onclick='window.location.reload()' style='padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;'>Tentar Novamente</button>" +
                        "</body></html>";
                view.loadData(errorHtml, "text/html", "UTF-8");
            }
        });

        // Necessário para upload de arquivos/fotos via WebView
        webView.setWebChromeClient(new WebChromeClient() {
            // Aqui você pode adicionar o suporte a seleção de arquivos se necessário
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            if (checkPermissions()) {
                handleDownload(url);
            } else {
                requestPermissions();
            }
        });

        // Carrega a URL do Netlify
        webView.loadUrl(TARGET_URL);
    }

    private void handleDownload(String url) {
        try {
            if (url.startsWith("data:")) {
                String base64Data = url.substring(url.indexOf(",") + 1);
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                String fileName = "Recibo_" + System.currentTimeMillis() + ".pdf";
                File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File file = new File(path, fileName);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(decodedBytes);
                fos.close();
                Toast.makeText(this, "PDF salvo em Downloads!", Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Erro ao salvar arquivo", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
