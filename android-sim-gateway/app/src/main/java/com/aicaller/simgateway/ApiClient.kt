package com.aicaller.simgateway

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiClient(private var baseUrl: String) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
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

    fun registerDevice(teacherId: String, deviceName: String, phoneNumber: String): JSONObject? {
        val payload = JSONObject().apply {
            put("teacherId", teacherId)
            put("deviceName", deviceName)
            put("phoneNumber", phoneNumber)
        }
        val request = Request.Builder()
            .url("$baseUrl/api/gateway/register")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                return JSONObject(response.body?.string() ?: "{}")
            }
        }
        return null
    }

    fun sendHeartbeat(deviceId: String, deviceToken: String, phoneNumber: String): JSONObject? {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("deviceToken", deviceToken)
            put("phoneNumber", phoneNumber)
            put("status", "ONLINE")
        }
        val request = Request.Builder()
            .url("$baseUrl/api/gateway/heartbeat")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                return JSONObject(response.body?.string() ?: "{}")
            }
        }
        return null
    }

    fun pollPendingCalls(deviceId: String, deviceToken: String): JSONObject? {
        val request = Request.Builder()
            .url("$baseUrl/api/gateway/poll?deviceId=$deviceId&deviceToken=$deviceToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                return JSONObject(response.body?.string() ?: "{}")
            }
        }
        return null
    }

    fun updateCallStatus(
        deviceId: String,
        deviceToken: String,
        callId: String,
        status: String,
        duration: Int = 0,
        parentResponse: String? = null,
        failureReason: String? = null
    ): Boolean {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("deviceToken", deviceToken)
            put("callId", callId)
            put("status", status)
            put("duration", duration)
            if (parentResponse != null) put("parentResponse", parentResponse)
            if (failureReason != null) put("failureReason", failureReason)
        }
        val request = Request.Builder()
            .url("$baseUrl/api/gateway/call-status")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }
}
