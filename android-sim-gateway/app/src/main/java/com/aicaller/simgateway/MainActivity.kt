package com.aicaller.simgateway

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etTeacherId: EditText
    private lateinit var etPhoneNumber: EditText
    private lateinit var btnConnect: Button
    private lateinit var tvStatus: TextView
    private lateinit var tvLogs: TextView

    private var gatewayService: SimGatewayService? = null
    private var isBound = false

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, service: IBinder) {
            val binder = service as SimGatewayService.LocalBinder
            gatewayService = binder.getService()
            isBound = true

            gatewayService?.onLogListener = { logMsg ->
                runOnUiThread {
                    tvLogs.append("\n$logMsg")
                }
            }

            gatewayService?.onStatusListener = { isOnline ->
                runOnUiThread {
                    updateStatusUI(isOnline)
                }
            }

            if (gatewayService?.isRunning == true) {
                updateStatusUI(true)
            }
        }

        override fun onServiceDisconnected(arg0: ComponentName) {
            isBound = false
            gatewayService = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate()
        setContentView(R.layout.activity_main)

        etServerUrl = findViewById(R.id.etServerUrl)
        etTeacherId = findViewById(R.id.etTeacherId)
        etPhoneNumber = findViewById(R.id.etPhoneNumber)
        btnConnect = findViewById(R.id.btnConnect)
        tvStatus = findViewById(R.id.tvStatus)
        tvLogs = findViewById(R.id.tvLogs)

        checkAndRequestPermissions()

        btnConnect.setOnClickListener {
            if (gatewayService?.isRunning == true) {
                stopGatewayService()
            } else {
                startGatewayService()
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.INTERNET
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
            Toast.makeText(this, "Please enter Server URL and Teacher Account ID", Toast.LENGTH_SHORT).show()
            return
        }

        val intent = Intent(this, SimGatewayService::class.java).apply {
            putExtra("serverUrl", serverUrl)
            putExtra("teacherId", teacherId)
            putExtra("phoneNumber", phoneNum)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        bindService(intent, connection, Context.BIND_AUTO_CREATE)
        tvLogs.setText("Starting SIM Gateway Service...")
    }

    private fun stopGatewayService() {
        if (isBound) {
            gatewayService?.stopGateway()
            unbindService(connection)
            isBound = false
        }
        updateStatusUI(false)
        tvLogs.append("\nGateway Disconnected.")
    }

    private fun updateStatusUI(isOnline: Boolean) {
        if (isOnline) {
            tvStatus.text = "🟢 SIM Gateway Connected"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
            btnConnect.text = "Disconnect Gateway"
        } else {
            tvStatus.text = "🔴 Gateway Disconnected"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            btnConnect.text = "Connect to Vercel Gateway"
        }
    }
}
