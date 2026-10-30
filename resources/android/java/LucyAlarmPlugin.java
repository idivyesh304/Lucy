package com.dzynlab.lucy;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/** Bridge between the Lucy app screens and the Android alarm engine. */
@CapacitorPlugin(name = "LucyAlarm")
public class LucyAlarmPlugin extends Plugin {
    private static LucyAlarmPlugin instance;

    @Override
    public void load() {
        instance = this;
        AlarmStore.ensureChannels(getContext());
    }

    static void ping() {
        LucyAlarmPlugin p = instance;
        if (p != null) {
            try { p.notifyListeners("actions", new JSObject(), true); } catch (Exception ignored) { }
        }
    }

    @PluginMethod
    public void setAll(PluginCall call) {
        JSArray arr = call.getArray("alarms", new JSArray());
        try {
            AlarmStore.replaceAll(getContext(), new JSONArray(arr.toString()));
            JSObject r = new JSObject();
            r.put("count", arr.length());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not schedule: " + e.getMessage());
        }
    }

    @PluginMethod
    public void add(PluginCall call) {
        try {
            JSONObject a = new JSONObject(call.getData().toString());
            AlarmStore.add(getContext(), a);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not schedule: " + e.getMessage());
        }
    }

    @PluginMethod
    public void takeActions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("json", AlarmStore.takeActions(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void setSpeak(PluginCall call) {
        Boolean on = call.getBoolean("on", true);
        AlarmStore.setSpeakEnabled(getContext(), on == null || on);
        call.resolve();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.isEmpty()) { call.resolve(); return; }
        Speaker.speak(getContext(), text, null);
        call.resolve();
    }

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        boolean ignoring = true;
        if (Build.VERSION.SDK_INT >= 23) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        JSObject r = new JSObject();
        r.put("ignoring", ignoring);
        call.resolve(r);
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                i.setData(Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception ignored) { }
        }
        call.resolve();
    }
}
