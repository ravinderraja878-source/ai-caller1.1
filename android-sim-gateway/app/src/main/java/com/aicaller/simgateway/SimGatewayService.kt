package com.aicaller.simgateway

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONObject

class SimGatewayService : Service() {

    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private lateinit var apiClient: ApiClient
    private lateinit var callManager: CallManager

    var serverUrl: String = ""
    var teacherId: String = ""
    var phoneNumber: String = ""
    var deviceId: String = ""
    var deviceToken: String = ""
    var isRunning: Boolean = false

    var onLogListener: ((String) -> Unit)? = null
    var onStatusListener: ((Boolean) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): SimGatewayService = this@SimGatewayService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        apiClient = ApiClient("")
        callManager = CallManager(this) { status, duration ->
            handleCallStateChanged(status, duration)
        }
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification("SIM Gateway Active & Ready")
        startForeground(1001, notification)

        serverUrl = intent?.getStringExtra("serverUrl") ?: ""
        teacherId = intent?.getStringExtra("teacherId") ?: ""
        phoneNumber = intent?.getStringExtra("phoneNumber") ?: ""

        if (serverUrl.isNotEmpty()) {
            apiClient.updateBaseUrl(serverUrl)
            startGatewayLoop()
        }

        return START_STICKY
    }

    private fun startGatewayLoop() {
        if (isRunning) return
        isRunning = true
        onStatusListener?.invoke(true)
        callManager.startListening()

        serviceScope.launch {
            log("Registering device with backend...")

            val regRes = apiClient.registerDevice(teacherId, android.os.Build.MODEL, phoneNumber)
            if (regRes != null && regRes.optBoolean("success")) {
                deviceId = regRes.optString("deviceId")
                deviceToken = regRes.optString("deviceToken")
                log("✓ Device Registered successfully! ID: $deviceId")

                // Main Polling Loop
                while (isRunning && isActive) {
                    try {
                        // Heartbeat
                        apiClient.sendHeartbeat(deviceId, deviceToken, phoneNumber)

                        // Poll for pending call dispatches
                        val pollRes = apiClient.pollPendingCalls(deviceId, deviceToken)
                        if (pollRes != null && pollRes.optBoolean("success")) {
                            val calls = pollRes.optJSONArray("calls")
                            if (calls != null && calls.length() > 0) {
                                val callObj = calls.getJSONObject(0)
                                executeOutboundCall(callObj)
                            }
                        }
                    } catch (e: Exception) {
                        log("Poll cycle error: ${e.message}")
                    }
                    delay(3000) // Poll every 3 seconds
                }
            } else {
                log("❌ Device registration failed. Check server URL & Teacher ID.")
                stopGateway()
            }
        }
    }

    private var activeCallId: String? = null

    private suspend fun executeOutboundCall(callObj: JSONObject) {
        val callId = callObj.getString("callId")
        val parentPhone = callObj.getString("parentPhone")
        val studentName = callObj.getString("studentName")

        activeCallId = callId
        log("📞 Received Call Request for $studentName ($parentPhone)...")

        apiClient.updateCallStatus(deviceId, deviceToken, callId, "DEVICE_RECEIVED")

        withContext(Dispatchers.Main) {
            val success = callManager.placeCellularCall(parentPhone)
            if (success) {
                log("📲 Dialing $parentPhone on physical SIM card...")
            } else {
                log("❌ Failed to initiate cellular call on SIM card.")
                apiClient.updateCallStatus(deviceId, deviceToken, callId, "FAILED", failureReason = "Device SIM dial failed")
            }
        }
    }

    private fun handleCallStateChanged(status: String, duration: Int) {
        val currentCallId = activeCallId ?: return
        log("Call State Updated: $status (Duration: $duration s)")

        serviceScope.launch {
            apiClient.updateCallStatus(
                deviceId = deviceId,
                deviceToken = deviceToken,
                callId = currentCallId,
                status = status,
                duration = duration,
                parentResponse = if (status == "COMPLETED") "Physical SIM call completed via Android Gateway" else null
            )

            if (status == "COMPLETED" || status == "FAILED" || status == "BUSY" || status == "NO_ANSWER") {
                activeCallId = null
            }
        }
    }

    fun stopGateway() {
        isRunning = false
        onStatusListener?.invoke(false)
        callManager.stopListening()
        serviceScope.cancel()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun log(message: String) {
        Log.d("SimGatewayService", message)
        onLogListener?.invoke(message)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            const val CHANNEL_ID = "sim_gateway_channel"
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AI Caller SIM Gateway",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        val CHANNEL_ID = "sim_gateway_channel"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI SIM Gateway Running")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setOngoing(true)
            .build()
    }
}
