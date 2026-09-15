package com.aicaller.simgateway

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log

class CallManager(
    private val context: Context,
    private val onStateChanged: (status: String, duration: Int) => Unit
) {

    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    private var isCallInProgress = false
    private var callStartTime: Long = 0

    private val phoneStateListener = object : PhoneStateListener() {
        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            super.onCallStateChanged(state, phoneNumber)

            when (state) {
                TelephonyManager.CALL_STATE_RINGING -> {
                    Log.d("CallManager", "Cellular Phone Ringing: $phoneNumber")
                    onStateChanged("RINGING", 0)
                }
                TelephonyManager.CALL_STATE_OFFHOOK -> {
                    if (!isCallInProgress) {
                        isCallInProgress = true
                        callStartTime = System.currentTimeMillis()
                        Log.d("CallManager", "Cellular Call Answered/Active")
                        onStateChanged("ANSWERED", 0)
                    }
                }
                TelephonyManager.CALL_STATE_IDLE -> {
                    if (isCallInProgress) {
                        isCallInProgress = false
                        val durationSec = ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                        Log.d("CallManager", "Cellular Call Completed. Duration: $durationSec s")
                        onStateChanged("COMPLETED", durationSec)
                    }
                }
            }
        }
    }

    fun startListening() {
        try {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
        } catch (e: Exception) {
            Log.e("CallManager", "Failed to start PhoneStateListener: ${e.message}")
        }
    }

    fun stopListening() {
        try {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
        } catch (e: Exception) {
            Log.e("CallManager", "Failed to stop PhoneStateListener: ${e.message}")
        }
    }

    fun placeCellularCall(parentPhoneNumber: String): Boolean {
        return try {
            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:${parentPhoneNumber.trim()}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(callIntent)
            onStateChanged("DIALING", 0)
            true
        } catch (e: Exception) {
            Log.e("CallManager", "Error placing cellular call: ${e.message}")
            onStateChanged("FAILED", 0)
            false
        }
    }
}
