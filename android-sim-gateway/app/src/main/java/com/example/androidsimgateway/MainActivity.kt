package com.example.androidsimgateway

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.aicaller.simgateway.PreferenceManager
import com.aicaller.simgateway.R
import com.aicaller.simgateway.SimGatewayService

class MainActivity : AppCompatActivity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etTeacherId: EditText
    private lateinit var etPhoneNumber: EditText
    private lateinit var btnConnect: Button
    private lateinit var tvStatus: TextView
    private lateinit var preferenceManager: PreferenceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        preferenceManager = PreferenceManager(this)

        etServerUrl = findViewById(R.id.etServerUrl)
        etTeacherId = findViewById(R.id.etTeacherId)
        etPhoneNumber = findViewById(R.id.etPhoneNumber)
        btnConnect = findViewById(R.id.btnConnect)
        tvStatus = findViewById(R.id.tvStatus)

        etServerUrl.setText(preferenceManager.getServerUrl())
        etTeacherId.setText(preferenceManager.getTeacherId())
        etPhoneNumber.setText(preferenceManager.getSimNumber())

        btnConnect.setOnClickListener {
            val serverUrl = etServerUrl.text.toString().trim()
            val teacherId = etTeacherId.text.toString().trim()
            val phoneNum = etPhoneNumber.text.toString().trim()

            if (serverUrl.isEmpty() || teacherId.isEmpty()) {
                Toast.makeText(this, "Please enter Backend URL & Teacher ID", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            preferenceManager.saveServerUrl(serverUrl)
            preferenceManager.saveTeacherId(teacherId)
            preferenceManager.saveSimNumber(phoneNum)

            val intent = Intent(this, SimGatewayService::class.java).apply {
                putExtra("serverUrl", serverUrl)
                putExtra("teacherId", teacherId)
                putExtra("simNumber", phoneNum)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }

            Toast.makeText(this, "Connecting to Vercel Gateway...", Toast.LENGTH_SHORT).show()
        }
    }
}
