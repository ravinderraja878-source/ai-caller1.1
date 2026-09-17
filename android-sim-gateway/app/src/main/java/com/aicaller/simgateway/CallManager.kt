package com.aicaller.simgateway

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log

class CallManager(
    private val context: Context,
    private val onStateChanged: (status: String, duration: Int) -> Unit
) {

    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    private var isCallInProgress = false
    private var callStartTime: Long = 0

    // Modern TelephonyCallback for Android 12+ (API 31+)
    private var telephonyCallback: TelephonyCallback? = null

    // Legacy PhoneStateListener for Android < 12
    @Suppress("DEPRECATION")
    private var legacyPhoneStateListener: PhoneStateListener? = null

    fun startListening() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleState(state)
                    }
                }
                telephonyCallback?.let {
                    telephonyManager.registerTelephonyCallback(context.mainExecutor, it)
                }
            } else {
                @Suppress("DEPRECATION")
                legacyPhoneStateListener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        handleState(state)
                    }
                }
                @Suppress("DEPRECATION")
                telephonyManager.listen(legacyPhoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
            }
        } catch (e: Exception) {
            Log.e("CallManager", "Failed to register call state listener: ${e.message}")
        }
    }

    fun stopListening() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let {
                    telephonyManager.unregisterTelephonyCallback(it)
                }
                telephonyCallback = null
            } else {
                @Suppress("DEPRECATION")
                if (legacyPhoneStateListener != null) {
                    telephonyManager.listen(legacyPhoneStateListener, PhoneStateListener.LISTEN_NONE)
                    legacyPhoneStateListener = null
                }
            }
        } catch (e: Exception) {
            Log.e("CallManager", "Failed to unregister call state listener: ${e.message}")
        }
    }

    private fun handleState(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                Log.d("CallManager", "Cellular Phone Ringing/Dialing...")
                onStateChanged("CALLING", 0)
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (!isCallInProgress) {
                    isCallInProgress = true
                    callStartTime = System.currentTimeMillis()
                    Log.d("CallManager", "Cellular Call Connected / Active")
                    onStateChanged("CONNECTED", 0)
                }
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (isCallInProgress) {
                    isCallInProgress = false
                    val durationSec = ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                    Log.d("CallManager", "Cellular Call Ended. Duration: $durationSec s")
                    onStateChanged("ENDED", durationSec)
                }
            }
        }
    }

    fun placeCellularCall(parentPhoneNumber: String): Boolean {
        val cleanNumber = parentPhoneNumber.trim()
        if (cleanNumber.isEmpty()) {
            onStateChanged("FAILED", 0)
            return false
        }

        return try {
            val encodedNum = Uri.encode(cleanNumber)
            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$encodedNum")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(callIntent)
            onStateChanged("CALL_INITIATED", 0)
            true
        } catch (e: SecurityException) {
            Log.e("CallManager", "Permission CALL_PHONE denied: ${e.message}")
            onStateChanged("FAILED", 0)
            false
        } catch (e: Exception) {
            Log.e("CallManager", "Error placing cellular call: ${e.message}")
            onStateChanged("FAILED", 0)
            false
        }
    }
}
