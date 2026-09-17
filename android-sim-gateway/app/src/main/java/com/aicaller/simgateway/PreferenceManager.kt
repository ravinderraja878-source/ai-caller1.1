package com.aicaller.simgateway

import android.content.Context
import android.content.SharedPreferences
import android.provider.Settings
import java.util.UUID

class PreferenceManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("sim_gateway_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_TEACHER_ID = "teacher_id"
        private const val KEY_SIM_NUMBER = "sim_number"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        const val DEFAULT_SERVER_URL = "https://ai-caller1-1.vercel.app"
    }

    init {
        // Automatically generate a persistent device ID if none exists
        if (getDeviceId().isEmpty()) {
            val androidId = try {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            } catch (e: Exception) {
                null
            }

            val uniqueId = if (!androidId.isNullOrEmpty() && androidId != "9774d56d682e549c") {
                "gw_android_$androidId"
            } else {
                "gw_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12)
            }
            saveDeviceId(uniqueId)
        }
    }

    fun getServerUrl(): String {
        return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
    }

    fun saveServerUrl(url: String) {
        prefs.edit().putString(KEY_SERVER_URL, url.trim()).apply()
    }

    fun getTeacherId(): String {
        return prefs.getString(KEY_TEACHER_ID, "") ?: ""
    }

    fun saveTeacherId(teacherId: String) {
        prefs.edit().putString(KEY_TEACHER_ID, teacherId.trim()).apply()
    }

    fun getSimNumber(): String {
        return prefs.getString(KEY_SIM_NUMBER, "") ?: ""
    }

    fun saveSimNumber(simNumber: String) {
        prefs.edit().putString(KEY_SIM_NUMBER, simNumber.trim()).apply()
    }

    fun getDeviceId(): String {
        return prefs.getString(KEY_DEVICE_ID, "") ?: ""
    }

    fun saveDeviceId(deviceId: String) {
        prefs.edit().putString(KEY_DEVICE_ID, deviceId.trim()).apply()
    }

    fun getDeviceToken(): String {
        return prefs.getString(KEY_DEVICE_TOKEN, "") ?: ""
    }

    fun saveDeviceToken(token: String) {
        prefs.edit().putString(KEY_DEVICE_TOKEN, token.trim()).apply()
    }
}
