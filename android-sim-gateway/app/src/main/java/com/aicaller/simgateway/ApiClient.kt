package com.aicaller.simgateway

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiClient(private var baseUrl: String) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun updateBaseUrl(url: String) {
        var cleanUrl = url.trim()
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "https://$cleanUrl"
        }
        if (cleanUrl.endsWith("/")) {
            cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1)
        }
        this.baseUrl = cleanUrl
    }

    fun registerDevice(
        teacherId: String,
        deviceId: String,
        simNumber: String
    ): JSONObject? {
        val payload = JSONObject().apply {
            put("teacherId", teacherId)
            put("deviceId", deviceId)
            put("simNumber", simNumber)
            put("platform", "android")
            put("deviceModel", android.os.Build.MODEL)
            put("manufacturer", android.os.Build.MANUFACTURER)
            put("sdkVersion", android.os.Build.VERSION.SDK_INT)
        }

        val request = Request.Builder()
            .url("$baseUrl/api/gateway/register")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val responseStr = response.body?.string() ?: "{}"
                    JSONObject(responseStr)
                } else {
                    Log.e("ApiClient", "registerDevice failed: ${response.code} ${response.message}")
                    Log.e("ApiClient", "Response body: ${response.body?.string()}")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e("ApiClient", "registerDevice exception: ${e.message}")
            null
        }
    }

    fun sendHeartbeat(
        teacherId: String,
        deviceId: String,
        simNumber: String,
        status: String,
        batteryLevel: Int,
        networkStatus: String
    ): JSONObject? {
        val payload = JSONObject().apply {
            put("teacherId", teacherId)
            put("deviceId", deviceId)
            put("simNumber", simNumber)
            put("status", status)
            put("batteryLevel", batteryLevel)
            put("networkStatus", networkStatus)
            put("timestamp", System.currentTimeMillis())
        }

        val request = Request.Builder()
            .url("$baseUrl/api/gateway/heartbeat")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val responseStr = response.body?.string() ?: "{}"
                    JSONObject(responseStr)
                } else {
                    Log.e("ApiClient", "registerDevice failed: ${response.code} ${response.message}")
                    Log.e("ApiClient", "Response body: ${response.body?.string()}")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e("ApiClient", "registerDevice exception: ${e.message}")
            null
        }
    }

    fun pollPendingCalls(deviceId: String, teacherId: String): JSONObject? {
        val url = "$baseUrl/api/gateway/poll?deviceId=$deviceId&teacherId=$teacherId"
        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val responseStr = response.body?.string() ?: "{}"
                    JSONObject(responseStr)
                } else {
                    Log.e("ApiClient", "registerDevice failed: ${response.code} ${response.message}")
                    Log.e("ApiClient", "Response body: ${response.body?.string()}")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e("ApiClient", "registerDevice exception: ${e.message}")
            null
        }
    }

    fun updateCallStatus(
        callId: String,
        deviceId: String,
        status: String,
        duration: Int = 0,
        failureReason: String? = null
    ): Boolean {
        val payload = JSONObject().apply {
            put("callId", callId)
            put("deviceId", deviceId)
            put("status", status)
            put("duration", duration)
            if (failureReason != null) {
                put("failureReason", failureReason)
            }
            put("timestamp", System.currentTimeMillis())
        }

        val request = Request.Builder()
            .url("$baseUrl/api/gateway/call-status")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            false
        }
    }
}
