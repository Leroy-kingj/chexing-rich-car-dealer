package com.chexing.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChexingSharePlugin.class);
        registerPlugin(ChexingAdPlugin.class);
        registerPlugin(ChexingLoginPlugin.class);
        registerPlugin(ChexingTapPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
