package com.santjsx.moodglyph

import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.os.BatteryManager
import android.widget.RemoteViews
import java.net.HttpURLConnection
import java.net.URL

class MoodGlyphWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Query system states
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val status = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val isSilent = am.ringerMode == AudioManager.RINGER_MODE_SILENT || am.ringerMode == AudioManager.RINGER_MODE_VIBRATE

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val filter = nm.currentInterruptionFilter
        val isDND = filter == NotificationManager.INTERRUPTION_FILTER_NONE ||
                filter == NotificationManager.INTERRUPTION_FILTER_ALARMS ||
                filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY

        // Map system state to Vercel API moods
        val mood = when {
            isDND || isSilent -> "dnd"
            level <= 15 && !isCharging -> "battery"
            isCharging -> "charging"
            else -> "idle"
        }

        // Perform updates for each widget instance
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId, mood)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        mood: String
    ) {
        // Run network operation in background thread
        Thread {
            try {
                // Fetch the 32-bit BMP directly from our serverless Vercel API
                val url = URL("https://mood-glyph-simulator.vercel.app/api/eyes?mood=$mood&v=${System.currentTimeMillis()}")
                val connection = url.openConnection() as HttpURLConnection
                connection.doInput = true
                connection.connect()
                val input = connection.inputStream
                val bitmap = BitmapFactory.decodeStream(input)

                // Instantiate widget views
                val views = RemoteViews(context.packageName, R.layout.mood_glyph_widget)
                views.setImageViewBitmap(R.id.widget_image, bitmap)

                // Setup PendingIntent to launch the MainActivity (the main React Native app) when clicked
                val configIntent = Intent(context, MainActivity::class.java)
                val configPendingIntent = PendingIntent.getActivity(
                    context, 0, configIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, configPendingIntent)

                // Push update to the home screen
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }
}
