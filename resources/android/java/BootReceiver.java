package com.dzynlab.lucy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Puts all alarms back after the phone restarts or Lucy is updated. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        AlarmStore.rescheduleAll(context.getApplicationContext());
    }
}
