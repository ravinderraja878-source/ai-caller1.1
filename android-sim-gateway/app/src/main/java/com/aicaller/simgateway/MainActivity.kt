package com.aicaller.simgateway

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.text.method.ScrollingMovementMethod
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etTeacherId: EditText
    private lateinit var etPhoneNumber: EditText
    private lateinit var btnConnect: Button
    private lateinit var tvStatus: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var layoutStatus: LinearLayout
    private lateinit var tvSimDetails: TextView
    private lateinit var tvBatteryNet: TextView
    private lateinit var tvLogs: TextView
    private lateinit var btnClearLogs: TextView
    private lateinit var btnCopyLogs: TextView

    private lateinit var preferenceManager: PreferenceManager
    private var gatewayService: SimGatewayService? = null
    private var isBound = false

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, service: IBinder) {
            val binder = service as SimGatewayService.LocalBinder
            gatewayService = binder.getService()
            isBound = true

            gatewayService?.onLogListener = { logMsg ->
                runOnUiThread {
                    appendLog(logMsg)
                }
            }

            gatewayService?.onStatusListener = { statusStr ->
                runOnUiThread {
                    updateStatusUI(statusStr)
                }
            }

            if (gatewayService?.isRunning == true) {
                updateStatusUI("ONLINE")
            }
        }

        override fun onServiceDisconnected(arg0: ComponentName) {
            isBound = false
            gatewayService = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            setContentView(R.layout.activity_main)
            preferenceManager = PreferenceManager(this)

            initViews()
            loadSavedConfig()
            checkAndRequestPermissions()
            refreshDeviceInfo()
        } catch (e: Throwable) {
            android.util.Log.e("MainActivity", "Fatal error in onCreate: ${e.message}")
        }
    }

    private fun initViews() {
        etServerUrl = findViewById(R.id.etServerUrl)
        etTeacherId = findViewById(R.id.etTeacherId)
        etPhoneNumber = findViewById(R.id.etPhoneNumber)
        btnConnect = findViewById(R.id.btnConnect)
        tvStatus = findViewById(R.id.tvStatus)
        tvDeviceId = findViewById(R.id.tvDeviceId)
        layoutStatus = findViewById(R.id.layoutStatus)
        tvSimDetails = findViewById(R.id.tvSimDetails)
        tvBatteryNet = findViewById(R.id.tvBatteryNet)
        tvLogs = findViewById(R.id.tvLogs)
        btnClearLogs = findViewById(R.id.btnClearLogs)
        btnCopyLogs = findViewById(R.id.btnCopyLogs)

        tvLogs.movementMethod = ScrollingMovementMethod()

        tvDeviceId.text = "ID: ${preferenceManager.getDeviceId()}"

        btnConnect.setOnClickListener {
            if (gatewayService?.isRunning == true) {
                stopGatewayService()
            } else {
                startGatewayService()
            }
        }

        btnClearLogs.setOnClickListener {
            tvLogs.text = "> Logs cleared.\n"
        }

        btnCopyLogs.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Gateway Logs", tvLogs.text)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Logs copied to clipboard!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadSavedConfig() {
        etServerUrl.setText(preferenceManager.getServerUrl())
        etTeacherId.setText(preferenceManager.getTeacherId())
        etPhoneNumber.setText(preferenceManager.getSimNumber())

        val simInfo = SimUtils.getSimInformation(this)
        if (etPhoneNumber.text.toString().isEmpty() && !simInfo.rawPhoneNumber.isNullOrEmpty()) {
            etPhoneNumber.setText(simInfo.rawPhoneNumber)
        }
    }

    private fun refreshDeviceInfo() {
        val simInfo = SimUtils.getSimInformation(this)
        val battery = SimUtils.getBatteryLevel(this)
        val netInfo = SimUtils.getNetworkInformation(this)

        tvSimDetails.text = if (simInfo.isSimPresent) {
            "SIM: Ready (${simInfo.carrierName})"
        } else {
            "SIM: ${simInfo.simState} (No physical SIM)"
        }

        tvBatteryNet.text = "Battery: $battery% | Net: ${netInfo.type}"
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG,
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 101)
        }
    }

    private fun startGatewayService() {
        val serverUrl = etServerUrl.text.toString().trim()
        val teacherId = etTeacherId.text.toString().trim()
        val phoneNum = etPhoneNumber.text.toString().trim()

        if (serverUrl.isEmpty() || teacherId.isEmpty()) {
            Toast.makeText(this, "Please enter Vercel Backend URL and Teacher ID", Toast.LENGTH_SHORT).show()
            return
        }

        preferenceManager.saveServerUrl(serverUrl)
        preferenceManager.saveTeacherId(teacherId)
        preferenceManager.saveSimNumber(phoneNum)

        updateStatusUI("CONNECTING")

        val intent = Intent(this, SimGatewayService::class.java).apply {
            putExtra("serverUrl", serverUrl)
            putExtra("teacherId", teacherId)
            putExtra("simNumber", phoneNum)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Throwable) {
            android.util.Log.e("MainActivity", "Error starting service: ${e.message}")
        }

        try {
            bindService(intent, connection, Context.BIND_AUTO_CREATE)
        } catch (e: Throwable) {
            android.util.Log.e("MainActivity", "Error binding service: ${e.message}")
        }

        appendLog("Initiating SIM Gateway background service...")
    }

    private fun stopGatewayService() {
        if (isBound) {
            gatewayService?.stopGateway()
            try {
                unbindService(connection)
            } catch (e: Exception) {
                // Ignore if unbind fails
            }
            isBound = false
        }
        updateStatusUI("OFFLINE")
        appendLog("Gateway disconnected by user.")
    }

    private fun updateStatusUI(status: String) {
        when (status.uppercase()) {
            "ONLINE" -> {
                tvStatus.text = getString(R.string.status_online)
                tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_online))
                layoutStatus.setBackgroundResource(R.drawable.bg_status_online)
                btnConnect.text = getString(R.string.btn_disconnect)
                btnConnect.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_offline)
            }
            "CONNECTING" -> {
                tvStatus.text = getString(R.string.status_connecting)
                tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_connecting))
                layoutStatus.setBackgroundResource(R.drawable.bg_status_connecting)
                btnConnect.text = "Connecting..."
            }
            else -> {
                tvStatus.text = getString(R.string.status_offline)
                tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_offline))
                layoutStatus.setBackgroundResource(R.drawable.bg_status_offline)
                btnConnect.text = getString(R.string.btn_connect)
                btnConnect.backgroundTintList = ContextCompat.getColorStateList(this, R.color.primary)
            }
        }
        refreshDeviceInfo()
    }

    private fun appendLog(msg: String) {
        try {
            val timeStr = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            tvLogs.append("\n[$timeStr] $msg")

            tvLogs.post {
                try {
                    val layout = tvLogs.layout
                    if (layout != null && tvLogs.lineCount > 0) {
                        val lineTop = layout.getLineTop(Math.min(tvLogs.lineCount, layout.lineCount - 1))
                        val scrollAmount = lineTop - tvLogs.height
                        if (scrollAmount > 0) {
                            tvLogs.scrollTo(0, scrollAmount)
                        }
                    }
                } catch (e: Throwable) {
                    // Safe catch layout scroll exceptions
                }
            }
        } catch (e: Throwable) {
            android.util.Log.e("MainActivity", "Error appending log: ${e.message}")
        }
    }
}
