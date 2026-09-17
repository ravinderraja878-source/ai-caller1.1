package com.aicaller.simgateway

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONObject

class SimGatewayService : Service() {

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "sim_gateway_channel"
        private const val TAG = "SimGatewayService"
    }

    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private lateinit var apiClient: ApiClient
    private lateinit var callManager: CallManager
    private lateinit var preferenceManager: PreferenceManager

    var serverUrl: String = ""
    var teacherId: String = ""
    var simNumber: String = ""
    var deviceId: String = ""
    var isRunning: Boolean = false

    var activeCallId: String? = null

    var onLogListener: ((String) -> Unit)? = null
    var onStatusListener: ((String) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): SimGatewayService = this@SimGatewayService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        preferenceManager = PreferenceManager(this)
        apiClient = ApiClient(preferenceManager.getServerUrl())
        callManager = CallManager(this) { status, duration ->
            handleCallStateChanged(status, duration)
        }
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification("Initializing Gateway Service...")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    )
                } else {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start foreground service with specific types: ${e.message}")
                try {
                    startForeground(NOTIFICATION_ID, notification)
                } catch (e2: Exception) {
                    Log.e(TAG, "Fallback startForeground failed: ${e2.message}")
                }
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        serverUrl = intent?.getStringExtra("serverUrl") ?: preferenceManager.getServerUrl()
        teacherId = intent?.getStringExtra("teacherId") ?: preferenceManager.getTeacherId()
        simNumber = intent?.getStringExtra("simNumber") ?: preferenceManager.getSimNumber()
        deviceId = preferenceManager.getDeviceId()

        if (serverUrl.isNotEmpty() && teacherId.isNotEmpty()) {
            apiClient.updateBaseUrl(serverUrl)
            startGatewayLoop()
        } else {
            log("⚠️ Missing Server URL or Teacher ID. Please configure on connection screen.")
        }

        return START_STICKY
    }

    private fun startGatewayLoop() {
        if (isRunning) return
        isRunning = true
        notifyStatus("CONNECTING")
        callManager.startListening()

        serviceScope.launch {
            log("==========================================")
            log("🚀 SIM Gateway Starting...")
            log("📌 Target Server: $serverUrl")
            log("📌 Teacher ID: $teacherId")
            log("📌 Device Gateway ID: $deviceId")
            log("📌 SIM Number: ${simNumber.ifEmpty { "Not configured" }}")

            // Check SIM state
            val simInfo = SimUtils.getSimInformation(this@SimGatewayService)
            if (!simInfo.isSimPresent) {
                log("⚠️ WARNING: SIM Card status: ${simInfo.simState}. Ensure physical SIM card is inserted!")
            } else {
                log("✓ Physical SIM Card Ready (${simInfo.carrierName})")
            }

            log("Registering device gateway with backend...")
            val regRes = apiClient.registerDevice(teacherId, deviceId, simNumber)

            if (regRes != null && (regRes.optBoolean("success") || regRes.has("deviceId"))) {
                val token = regRes.optString("deviceToken", "")
                if (token.isNotEmpty()) {
                    preferenceManager.saveDeviceToken(token)
                }
                log("🟢 DEVICE ONLINE & REGISTERED! Gateway ID: $deviceId")
                notifyStatus("ONLINE")
                updateNotification("ONLINE • Gateway connected & listening")

                var loopCount = 0

                while (isRunning && isActive) {
                    try {
                        val battery = SimUtils.getBatteryLevel(this@SimGatewayService)
                        val netInfo = SimUtils.getNetworkInformation(this@SimGatewayService)

                        // Send Heartbeat every ~15 seconds (every 3 cycles of 5s)
                        if (loopCount % 3 == 0) {
                            val hbRes = apiClient.sendHeartbeat(
                                teacherId = teacherId,
                                deviceId = deviceId,
                                simNumber = simNumber,
                                status = "ONLINE",
                                batteryLevel = battery,
                                networkStatus = netInfo.detail
                            )
                            if (hbRes != null) {
                                Log.d(TAG, "Heartbeat ack received. Battery: $battery%, Net: ${netInfo.detail}")
                            } else {
                                Log.w(TAG, "Heartbeat missed response (Backend unreachable)")
                            }
                        }

                        // Poll Backend for Call Commands
                        val pollRes = apiClient.pollPendingCalls(deviceId, teacherId)
                        if (pollRes != null && pollRes.optBoolean("success")) {
                            val calls = pollRes.optJSONArray("calls")
                            if (calls != null && calls.length() > 0) {
                                val callObj = calls.getJSONObject(0)
                                executeOutboundCall(callObj)
                            }
                        }

                    } catch (e: Exception) {
                        log("⚠️ Communication error: ${e.message}")
                    }

                    loopCount++
                    delay(5000) // Poll every 5 seconds
                }
            } else {
                log("❌ Device registration failed. Verify Backend URL & Teacher ID.")
                notifyStatus("OFFLINE")
                updateNotification("OFFLINE • Registration Failed")
                stopGateway()
            }
        }
    }

    private suspend fun executeOutboundCall(callObj: JSONObject) {
        val callId = callObj.optString("callId", "")
        val parentPhone = callObj.optString("parentPhone", "")
        val studentName = callObj.optString("studentName", "Student")

        if (callId.isEmpty() || parentPhone.isEmpty()) {
            log("⚠️ Received invalid call command: $callObj")
            return
        }

        activeCallId = callId
        val maskedPhone = SimUtils.maskPhoneNumber(parentPhone)
        log("📞 INCOMING COMMAND: Call $studentName ($maskedPhone) [CallID: $callId]")

        // Report CALL_INITIATED to backend
        apiClient.updateCallStatus(callId = callId, deviceId = deviceId, status = "CALL_INITIATED")

        withContext(Dispatchers.Main) {
            val success = callManager.placeCellularCall(parentPhone)
            if (success) {
                log("📲 Dialing $maskedPhone via physical SIM...")
                apiClient.updateCallStatus(callId = callId, deviceId = deviceId, status = "CALLING")
            } else {
                log("❌ SIM Dial Failed for $maskedPhone")
                apiClient.updateCallStatus(
                    callId = callId,
                    deviceId = deviceId,
                    status = "FAILED",
                    failureReason = "Physical SIM call placement failed"
                )
                activeCallId = null
            }
        }
    }

    private fun handleCallStateChanged(status: String, duration: Int) {
        val currentCallId = activeCallId ?: return
        log("📱 Call Status Changed -> $status ${if (duration > 0) "($duration s)" else ""}")

        serviceScope.launch {
            apiClient.updateCallStatus(
                callId = currentCallId,
                deviceId = deviceId,
                status = status,
                duration = duration
            )

            if (status == "ENDED" || status == "FAILED" || status == "COMPLETED") {
                activeCallId = null
            }
        }
    }

    fun stopGateway() {
        isRunning = false
        notifyStatus("OFFLINE")
        callManager.stopListening()
        serviceScope.cancel()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun log(message: String) {
        Log.d(TAG, message)
        onLogListener?.invoke(message)
    }

    private fun notifyStatus(statusStr: String) {
        onStatusListener?.invoke(statusStr)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AI Caller SIM Gateway Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains connection with Vercel backend to place SIM cellular calls"
            }
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI Caller SIM Gateway")
            .setContentText(contentText)
            // Successfully updated to the newly created icon below!
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, createNotification(contentText))
    }
}