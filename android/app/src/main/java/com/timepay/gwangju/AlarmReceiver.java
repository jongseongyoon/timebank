package com.timepay.gwangju;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

/**
 * AlarmReceiver — 매일 00:01 만보기 시작 / 23:59 만보기 저장+중지
 *
 * 스케줄:
 *   00:01 → StepTrackingService ACTION_START
 *   23:59 → StepTrackingService ACTION_STOP_AND_SAVE
 *
 * 각 알람이 수신될 때 다음 날 같은 시각으로 재등록합니다.
 */
public class AlarmReceiver extends BroadcastReceiver {

    static final String ACTION_DAILY_START = "com.timepay.gwangju.DAILY_START";
    static final String ACTION_DAILY_STOP  = "com.timepay.gwangju.DAILY_STOP";

    private static final int  REQ_START = 301;
    private static final int  REQ_STOP  = 302;
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "onReceive: " + action);

        if (ACTION_DAILY_START.equals(action)) {
            // 00:01 — 만보기 서비스 시작
            startStepService(context);
            // 내일 00:01 재등록
            scheduleStart(context);

        } else if (ACTION_DAILY_STOP.equals(action)) {
            // 23:59 — 만보기 저장 후 중지
            stopStepService(context);
            // 내일 23:59 재등록
            scheduleStop(context);
        }
    }

    // ──────────────────────────────────────────────────────────────

    private void startStepService(Context ctx) {
        Intent svc = new Intent(ctx, StepTrackingService.class);
        svc.setAction(StepTrackingService.ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
    }

    private void stopStepService(Context ctx) {
        Intent svc = new Intent(ctx, StepTrackingService.class);
        svc.setAction(StepTrackingService.ACTION_STOP_SAVE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 알람 등록 유틸
    // ──────────────────────────────────────────────────────────────

    /** 오늘 또는 내일 00:01 알람 등록 */
    public static void scheduleStart(Context ctx) {
        Calendar cal = nextOccurrence(0, 1);
        setExact(ctx, ACTION_DAILY_START, REQ_START, cal);
        Log.d(TAG, "Start alarm scheduled: " + cal.getTime());
    }

    /** 오늘 또는 내일 23:59 알람 등록 */
    public static void scheduleStop(Context ctx) {
        Calendar cal = nextOccurrence(23, 59);
        setExact(ctx, ACTION_DAILY_STOP, REQ_STOP, cal);
        Log.d(TAG, "Stop alarm scheduled: " + cal.getTime());
    }

    /**
     * 오늘 해당 시각이 이미 지났으면 내일로 설정
     */
    private static Calendar nextOccurrence(int hour, int minute) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        return cal;
    }

    private static void setExact(Context ctx, String action, int reqCode, Calendar cal) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.setAction(action);
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Android 6+ Doze 모드에서도 정확히 실행
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
        }
    }
}
