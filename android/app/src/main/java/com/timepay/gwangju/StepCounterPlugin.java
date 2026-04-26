package com.timepay.gwangju;

import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * StepCounterPlugin — Capacitor ↔ 네이티브 만보기 브리지
 *
 * 기능:
 *   - start / stop: 인앱 실시간 만보기 (stepUpdate 이벤트)
 *   - getTodaySteps: SharedPreferences에서 오늘 걸음 수 조회
 *     (StepTrackingService가 백그라운드에서 저장한 값 포함)
 *   - getPendingSave: 서버 미저장 걸음 수 확인
 *   - markSaved: 서버 저장 완료 표시 (중복 저장 방지)
 */
@CapacitorPlugin(name = "StepCounter")
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private boolean isListening = false;
    private long baseStepCount = -1;
    private long sessionSteps = 0;

    @Override
    public void load() {
        sensorManager = (SensorManager) getActivity().getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    /** 만보기 센서 지원 여부 */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", stepSensor != null);
        ret.put("apiLevel", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    /** 인앱 실시간 측정 시작 */
    @PluginMethod
    public void start(PluginCall call) {
        if (stepSensor == null) { call.reject("센서 없음"); return; }
        if (isListening) { call.reject("이미 측정 중"); return; }
        baseStepCount = -1;
        sessionSteps = 0;
        isListening = true;
        sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    /** 인앱 실시간 측정 중지 */
    @PluginMethod
    public void stop(PluginCall call) {
        if (isListening) {
            sensorManager.unregisterListener(this);
            isListening = false;
        }
        JSObject ret = new JSObject();
        ret.put("steps", sessionSteps);
        call.resolve(ret);
    }

    /** 오늘 걸음 수 조회 (백그라운드 서비스 저장값 포함) */
    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        SharedPreferences prefs = getActivity().getSharedPreferences(
            StepTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
        long steps = prefs.getLong(StepTrackingService.KEY_STEPS, 0);
        String date  = prefs.getString(StepTrackingService.KEY_DATE, "");
        JSObject ret = new JSObject();
        ret.put("steps", steps);
        ret.put("date", date);
        ret.put("listening", isListening);
        call.resolve(ret);
    }

    /**
     * 서버 미저장 걸음 수 확인
     * 반환: { pending: boolean, steps: number, date: string }
     */
    @PluginMethod
    public void getPendingSave(PluginCall call) {
        SharedPreferences prefs = getActivity().getSharedPreferences(
            StepTrackingService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean pending = prefs.getBoolean(StepTrackingService.KEY_PENDING, false);
        long steps      = prefs.getLong(StepTrackingService.KEY_STEPS, 0);
        String date     = prefs.getString(StepTrackingService.KEY_DATE, "");
        JSObject ret = new JSObject();
        ret.put("pending", pending);
        ret.put("steps", steps);
        ret.put("date", date);
        call.resolve(ret);
    }

    /** 서버 저장 완료 표시 */
    @PluginMethod
    public void markSaved(PluginCall call) {
        getActivity().getSharedPreferences(
            StepTrackingService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(StepTrackingService.KEY_PENDING, false).apply();
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    // SensorEventListener (인앱 실시간 감지)
    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;
        long total = (long) event.values[0];
        if (baseStepCount < 0) baseStepCount = total;
        sessionSteps = total - baseStepCount;
        JSObject data = new JSObject();
        data.put("steps", sessionSteps);
        notifyListeners("stepUpdate", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    protected void handleOnDestroy() {
        if (isListening && sensorManager != null) {
            sensorManager.unregisterListener(this);
            isListening = false;
        }
    }
}
