package com.timepay.gwangju;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * TimePay 만보기 포그라운드 서비스
 * - 00:01 ~ 23:59 동안 백그라운드에서 계속 실행
 * - 기기 화면이 꺼져 있어도 TYPE_STEP_COUNTER 센서로 걸음 수 누적
 * - 걸음 수는 SharedPreferences("timepay_steps")에 실시간 저장
 * - 23:59 AlarmReceiver가 STOP_AND_SAVE 액션 전송 시 저장 후 자동 종료
 */
public class StepTrackingService extends Service implements SensorEventListener {

    public static final String ACTION_START        = "ACTION_START_STEP_TRACKING";
    public static final String ACTION_STOP_SAVE    = "ACTION_STOP_AND_SAVE";

    static final String PREFS_NAME   = "timepay_steps";
    static final String KEY_STEPS    = "steps_today";
    static final String KEY_DATE     = "steps_date";
    static final String KEY_PENDING  = "pending_save";  // 서버 저장 미완료 플래그
    static final String KEY_BASE     = "base_step_count";

    private static final String CHANNEL_ID = "timepay_pedometer_channel";
    private static final int    NOTIF_ID   = 1001;
    private static final String TAG        = "StepTrackingService";

    private SensorManager sensorManager;
    private Sensor        stepSensor;
    private long          baseStepCount = -1;
    private long          todaySteps    = 0;
    private String        todayDate;

    // ──────────────────────────────────────────────────────────────

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification(0));

        String action = (intent != null) ? intent.getAction() : null;
        todayDate = today();

        SharedPreferences prefs = getPrefs();

        if (ACTION_STOP_SAVE.equals(action)) {
            // 23:59 알람 수신 → 현재 걸음 수 저장 후 서비스 종료
            long steps = prefs.getLong(KEY_STEPS, 0);
            prefs.edit()
                .putLong(KEY_STEPS, steps)
                .putString(KEY_DATE, todayDate)
                .putBoolean(KEY_PENDING, true)   // 앱이 열리면 서버로 전송
                .apply();
            Log.d(TAG, "STOP_AND_SAVE: " + steps + " steps on " + todayDate);
            stopSelf();
            return START_NOT_STICKY;
        }

        // ACTION_START — 오늘 날짜와 저장된 날짜 비교해서 기준값 처리
        String savedDate = prefs.getString(KEY_DATE, "");
        if (!todayDate.equals(savedDate)) {
            // 새 날짜 → 걸음 수 초기화
            prefs.edit()
                .putLong(KEY_STEPS, 0)
                .putString(KEY_DATE, todayDate)
                .putBoolean(KEY_PENDING, false)
                .putLong(KEY_BASE, -1)
                .apply();
            baseStepCount = -1;
            todaySteps = 0;
        } else {
            // 같은 날 재시작 → 기존 기준값 복원
            baseStepCount = prefs.getLong(KEY_BASE, -1);
            todaySteps = prefs.getLong(KEY_STEPS, 0);
        }

        // 센서 등록
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (stepSensor != null) {
            sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
            Log.d(TAG, "Step sensor registered, baseStepCount=" + baseStepCount);
        } else {
            Log.w(TAG, "No TYPE_STEP_COUNTER sensor on this device");
        }

        return START_STICKY;   // 시스템이 서비스를 죽여도 재시작
    }

    // ──────────────────────────────────────────────────────────────
    // SensorEventListener
    // ──────────────────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        long total = (long) event.values[0];

        if (baseStepCount < 0) {
            // 처음 이벤트 수신 시 기준값 설정
            baseStepCount = total - todaySteps;   // 이미 저장된 걸음 수 보존
            getPrefs().edit().putLong(KEY_BASE, baseStepCount).apply();
        }

        todaySteps = Math.max(0, total - baseStepCount);

        // SharedPreferences에 저장
        getPrefs().edit()
            .putLong(KEY_STEPS, todaySteps)
            .putString(KEY_DATE, todayDate)
            .apply();

        // 알림 업데이트
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification(todaySteps));
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    // ──────────────────────────────────────────────────────────────

    @Override
    public void onDestroy() {
        if (sensorManager != null) sensorManager.unregisterListener(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    // ──────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────

    private SharedPreferences getPrefs() {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "TimePay 만보기",
                NotificationManager.IMPORTANCE_LOW
            );
            ch.setDescription("오늘의 걸음 수를 백그라운드에서 자동 측정합니다");
            ch.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(long steps) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentTitle("TimePay 만보기")
            .setContentText(steps > 0 ? steps + "보 / 10,000보" : "걸음 수 측정 중…")
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
}
