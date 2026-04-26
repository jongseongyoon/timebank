package com.timepay.gwangju;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

/**
 * TimePay MainActivity
 *
 * Capacitor WebView 안에서 실행되는 웹앱(timebank-mocha.vercel.app)이
 * 카메라·위치 권한을 요청할 때 네이티브 Android 권한 다이얼로그가
 * 자연스럽게 뜨도록 처리합니다.
 *
 * 권한 처리 흐름:
 *   웹앱 JS → WebView → onPermissionRequest / onGeolocationPermissionsShowPrompt
 *   → 네이티브 권한 다이얼로그 → 결과 콜백 → WebView 허용
 */
public class MainActivity extends BridgeActivity {

    private static final int REQ_PERMISSIONS = 200;
    private static final String TAG = "MainActivity";

    // WebView 카메라 권한 콜백 (onPermissionRequest에서 보관)
    private PermissionRequest pendingWebPermission;

    // WebView 위치 권한 콜백 (onGeolocationPermissionsShowPrompt에서 보관)
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ① 네이티브 만보기 플러그인 등록
        registerPlugin(StepCounterPlugin.class);

        super.onCreate(savedInstanceState);

        // ② WebView에 WebChromeClient 오버라이드 — 권한 요청 가로채기
        setupWebViewPermissions();

        // ③ 앱 시작 시 필수 권한 일괄 요청 (한 번만 물어봄)
        requestEssentialPermissions();

        // ④ 매일 00:01 / 23:59 알람 등록 (이미 등록돼 있으면 덮어씀)
        AlarmReceiver.scheduleStart(this);
        AlarmReceiver.scheduleStop(this);
        Log.d(TAG, "Daily alarms scheduled");

        // ⑤ 현재 시각이 00:01~23:58이면 만보기 서비스 즉시 시작
        startStepServiceIfNeeded();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 앱이 포그라운드로 돌아올 때 pending_save 확인 → JS로 처리 위임
        // JS에서 Capacitor.Plugins.StepCounter.getPendingSave() 호출 후 서버 전송
    }

    private void startStepServiceIfNeeded() {
        java.util.Calendar now = java.util.Calendar.getInstance();
        int h = now.get(java.util.Calendar.HOUR_OF_DAY);
        int m = now.get(java.util.Calendar.MINUTE);
        boolean inWindow = (h > 0) || (h == 0 && m >= 1);
        boolean beforeStop = h < 23 || (h == 23 && m < 59);
        if (inWindow && beforeStop) {
            android.content.Intent svc = new android.content.Intent(this, StepTrackingService.class);
            svc.setAction(StepTrackingService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(svc);
            } else {
                startService(svc);
            }
            Log.d(TAG, "StepTrackingService started on app open");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // WebChromeClient 오버라이드
    //   Capacitor Bridge가 WebView를 초기화한 뒤 이 메서드를 호출하므로
    //   super.onCreate() 이후에 실행해야 합니다.
    // ─────────────────────────────────────────────────────────────
    private void setupWebViewPermissions() {
        WebView webView = getBridge().getWebView();

        // WebView 설정 — 위치·혼합콘텐츠
        WebSettings settings = webView.getSettings();
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        webView.setWebChromeClient(new WebChromeClient() {

            // ── 카메라 / 마이크 권한 (getUserMedia 등)
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] requestedResources = request.getResources();
                boolean needCamera = false;

                for (String res : requestedResources) {
                    if (res.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                            || res.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        needCamera = true;
                    }
                }

                if (!needCamera) {
                    request.grant(requestedResources);
                    return;
                }

                // 이미 카메라 권한이 있으면 즉시 허용
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(requestedResources);
                } else {
                    // 권한 없으면 Android 다이얼로그 띄우고 콜백 보관
                    pendingWebPermission = request;
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.CAMERA},
                            REQ_PERMISSIONS
                    );
                }
            }

            // ── 위치 권한 (navigator.geolocation)
            @Override
            public void onGeolocationPermissionsShowPrompt(
                    String origin,
                    GeolocationPermissions.Callback callback) {

                boolean fineGranted = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;

                boolean coarseGranted = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;

                if (fineGranted || coarseGranted) {
                    // 이미 허용된 경우 즉시 WebView에 전달
                    callback.invoke(origin, true, false);
                } else {
                    // 권한 없으면 Android 다이얼로그 띄우고 콜백 보관
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            },
                            REQ_PERMISSIONS + 1
                    );
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Android 권한 다이얼로그 결과 처리
    // ─────────────────────────────────────────────────────────────
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults) {

        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (requestCode == REQ_PERMISSIONS) {
            // 카메라 권한 결과 → WebView에 전달
            if (pendingWebPermission != null) {
                if (granted) {
                    pendingWebPermission.grant(pendingWebPermission.getResources());
                } else {
                    pendingWebPermission.deny();
                }
                pendingWebPermission = null;
            }

        } else if (requestCode == REQ_PERMISSIONS + 1) {
            // 위치 권한 결과 → WebView에 전달
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 앱 최초 실행 시 필수 권한 일괄 요청
    // ─────────────────────────────────────────────────────────────
    private void requestEssentialPermissions() {
        String[] all = {
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACTIVITY_RECOGNITION,
        };

        List<String> needed = new ArrayList<>();
        for (String perm : all) {
            if (ContextCompat.checkSelfPermission(this, perm)
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add(perm);
            }
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    needed.toArray(new String[0]),
                    REQ_PERMISSIONS + 2
            );
        }
    }
}
