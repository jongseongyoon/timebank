package com.timepay.gwangju;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * BootReceiver — 기기 재부팅 후 만보기 알람 재등록
 *
 * AlarmManager 알람은 기기가 꺼지면 사라집니다.
 * BOOT_COMPLETED를 받아 오늘 남은 알람 및 현재 시각이
 * 00:01~23:59 사이라면 서비스도 즉시 재시작합니다.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }

        Log.d(TAG, "Boot completed — rescheduling alarms");

        // 내일 00:01 / 23:59 알람 재등록
        AlarmReceiver.scheduleStart(context);
        AlarmReceiver.scheduleStop(context);

        // 현재 시각이 00:01 ~ 23:58 사이라면 서비스 즉시 시작
        java.util.Calendar now = java.util.Calendar.getInstance();
        int h = now.get(java.util.Calendar.HOUR_OF_DAY);
        int m = now.get(java.util.Calendar.MINUTE);
        boolean inTrackingWindow = (h > 0) || (h == 0 && m >= 1);
        boolean beforeStop = h < 23 || (h == 23 && m < 59);

        if (inTrackingWindow && beforeStop) {
            Intent svc = new Intent(context, StepTrackingService.class);
            svc.setAction(StepTrackingService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
            Log.d(TAG, "StepTrackingService started after boot");
        }
    }
}
