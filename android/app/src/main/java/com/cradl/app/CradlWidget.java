package com.cradl.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class CradlWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_cradl);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        String feedText = prefs.getString("widget_feed_text", "\uD83C\uDF7C No feeds yet");
        String sleepText = prefs.getString("widget_sleep_text", "\uD83D\uDE34 No sleeps yet");
        String nappyText = prefs.getString("widget_nappy_text", "\uD83E\uDDF7 No nappies yet");

        views.setTextViewText(R.id.widget_feed, feedText);
        views.setTextViewText(R.id.widget_sleep, sleepText);
        views.setTextViewText(R.id.widget_nappy, nappyText);

        views.setOnClickPendingIntent(R.id.btn_feed, createActionIntent(context, "feed"));
        views.setOnClickPendingIntent(R.id.btn_sleep, createActionIntent(context, "sleep"));
        views.setOnClickPendingIntent(R.id.btn_nappy, createActionIntent(context, "pee"));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createActionIntent(Context context, String action) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://com.cradl.app/?action=" + action));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, action.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
