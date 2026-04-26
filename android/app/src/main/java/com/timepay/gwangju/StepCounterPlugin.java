package com.timepay.gwangju;

import android.content.Context;
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
 * TimePay 만보기 플러그인
 * Android 하드웨어 만보기 센서 (TYPE_STEP_COUNTER) 직접 사용
 * - Google Fit / Health Connect 없이도 정확한 걸음 수 제공
 * - 기기 재부팅 시 초기화됨 (기기 전원 켠 이후 누적 걸음)
 */
@CapacitorPlugin(name = "StepCounter")
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private boolean isListening = false;
    private long baseStepCount = -1;   // 측정 시작 시점의 기준값
    private long sessionSteps = 0;

    @Override
    public void load() {
        sensorManager = (SensorManager) getActivity().getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    /** 만보기 센서 지원 여부 확인 */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", stepSensor != null);
        ret.put("apiLevel", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    /** 걸음 측정 시작 */
    @PluginMethod
    public void start(PluginCall call) {
        if (stepSensor == null) {
            call.reject("이 기기는 걸음 수 센서를 지원하지 않습니다.");
            return;
        }
        if (isListening) {
            call.reject("이미 측정 중입니다.");
            return;
        }

        baseStepCount = -1;   // 다음 이벤트에서 기준값 설정
        sessionSteps = 0;
        isListening = true;
        sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);

        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    /** 걸음 측정 중지 및 현재 걸음 수 반환 */
    @PluginMethod
    public void stop(PluginCall call) {
        if (!isListening) {
            JSObject ret = new JSObject();
            ret.put("steps", sessionSteps);
            call.resolve(ret);
            return;
        }
        sensorManager.unregisterListener(this);
        isListening = false;

        JSObject ret = new JSObject();
        ret.put("steps", sessionSteps);
        call.resolve(ret);
    }

    /** 현재까지의 세션 걸음 수 조회 */
    @PluginMethod
    public void getSteps(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("steps", sessionSteps);
        ret.put("listening", isListening);
        call.resolve(ret);
    }

    // ── SensorEventListener

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        long totalSteps = (long) event.values[0];

        if (baseStepCount == -1) {
            baseStepCount = totalSteps;   // 측정 시작 시점 기록
        }

        sessionSteps = totalSteps - baseStepCount;

        // JavaScript 측에 실시간 이벤트 전달
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
