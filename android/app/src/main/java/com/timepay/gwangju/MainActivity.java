package com.timepay.gwangju;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // TimePay 만보기 플러그인 등록
        registerPlugin(StepCounterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
