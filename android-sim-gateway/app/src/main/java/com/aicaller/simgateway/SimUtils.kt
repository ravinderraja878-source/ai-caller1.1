package com.aicaller.simgateway

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager

object SimUtils {

    data class SimInfo(
        val isSimPresent: Boolean,
        val carrierName: String,
        val simState: String,
        val rawPhoneNumber: String?
    )

    data class NetworkInfo(
        val type: String, // "WIFI", "CELLULAR", "NONE"
        val isConnected: Boolean,
        val detail: String
    )

    fun getSimInformation(context: Context): SimInfo {
        return try {
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                ?: return SimInfo(false, "No Telephony Service", "UNKNOWN", null)

            val simStateInt = try {
                telephonyManager.simState
            } catch (e: Throwable) {
                TelephonyManager.SIM_STATE_UNKNOWN
            }

            val simStateStr = when (simStateInt) {
                TelephonyManager.SIM_STATE_READY -> "READY"
                TelephonyManager.SIM_STATE_ABSENT -> "ABSENT"
                TelephonyManager.SIM_STATE_PIN_REQUIRED -> "PIN_REQUIRED"
                TelephonyManager.SIM_STATE_PUK_REQUIRED -> "PUK_REQUIRED"
                TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "NETWORK_LOCKED"
                TelephonyManager.SIM_STATE_UNKNOWN -> "UNKNOWN"
                else -> "NOT_READY"
            }

            val isPresent = simStateInt == TelephonyManager.SIM_STATE_READY

            var carrier = try { telephonyManager.networkOperatorName } catch (e: Throwable) { "" }
            if (carrier.isEmpty()) {
                carrier = try { telephonyManager.simOperatorName } catch (e: Throwable) { "" }
            }
            if (carrier.isEmpty()) {
                carrier = if (isPresent) "Cellular SIM" else "No SIM Card"
            }

            var phoneNum: String? = null
            try {
                if (isPresent && context.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                        val activeList = subManager?.activeSubscriptionInfoList
                        if (!activeList.isNullOrEmpty()) {
                            val activeInfo = activeList[0]
                            carrier = activeInfo.carrierName?.toString() ?: carrier
                            phoneNum = activeInfo.number
                        }
                    }
                    if (phoneNum.isNullOrEmpty()) {
                        @Suppress("DEPRECATION")
                        phoneNum = telephonyManager.line1Number
                    }
                }
            } catch (e: Throwable) {
                // Permission or API restrictions
            }

            SimInfo(
                isSimPresent = isPresent,
                carrierName = carrier,
                simState = simStateStr,
                rawPhoneNumber = phoneNum
            )
        } catch (e: Throwable) {
            SimInfo(false, "Cellular SIM", "UNKNOWN", null)
        }
    }

    fun getBatteryLevel(context: Context): Int {
        return try {
            val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus: Intent? = context.registerReceiver(null, intentFilter)
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) {
                ((level / scale.toFloat()) * 100).toInt()
            } else {
                100
            }
        } catch (e: Throwable) {
            100
        }
    }

    fun getNetworkInformation(context: Context): NetworkInfo {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return NetworkInfo("NONE", false, "No Connectivity Manager")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val activeNetwork = cm.activeNetwork ?: return NetworkInfo("NONE", false, "Disconnected")
                val caps = cm.getNetworkCapabilities(activeNetwork) ?: return NetworkInfo("NONE", false, "No Capabilities")

                when {
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                        NetworkInfo("WIFI", true, "WiFi Connected")
                    }
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                        val simInfo = getSimInformation(context)
                        NetworkInfo("CELLULAR", true, "Cellular (${simInfo.carrierName})")
                    }
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                        NetworkInfo("ETHERNET", true, "Ethernet Connected")
                    }
                    else -> NetworkInfo("OTHER", true, "Connected")
                }
            } else {
                @Suppress("DEPRECATION")
                val activeInfo = cm.activeNetworkInfo
                if (activeInfo == null || !activeInfo.isConnected) {
                    return NetworkInfo("NONE", false, "Disconnected")
                }
                @Suppress("DEPRECATION")
                val typeName = activeInfo.typeName
                NetworkInfo(typeName, true, "$typeName Connected")
            }
        } catch (e: Throwable) {
            NetworkInfo("UNKNOWN", true, "Network Active")
        }
    }

    fun maskPhoneNumber(phone: String): String {
        return try {
            val clean = phone.trim()
            if (clean.length <= 5) return clean
            val prefix = if (clean.length >= 3) clean.substring(0, 3) else ""
            val suffix = clean.substring(clean.length - 2)
            val maskedLength = clean.length - prefix.length - suffix.length
            val stars = "*".repeat(if (maskedLength > 0) maskedLength else 4)
            "$prefix$stars$suffix"
        } catch (e: Throwable) {
            phone
        }
    }
}

