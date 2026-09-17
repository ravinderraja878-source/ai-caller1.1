# AI Caller SIM Gateway (Android Application)

**AI Caller SIM Gateway** is a companion Android application for the **AI Attendance Calling System**. It runs on an Android smartphone containing a physical SIM card and acts as a cellular gateway, allowing your Vercel web application to initiate real cellular voice calls to parents using your physical Indian SIM card.

---

## 🏗 System Architecture

```
┌────────────────────────┐
│    Teacher Web App     │
│  (Next.js / Dashboard) │
└───────────┬────────────┘
            │ HTTPS API
            ▼
┌────────────────────────┐
│     Vercel Backend     │
│ https://ai-caller1-1.  │
│       vercel.app       │
└───────────┬────────────┘
            │ HTTPS Heartbeat & Poll API
            ▼
┌────────────────────────┐
│  Android SIM Gateway   │ (Runs on Android phone with physical SIM card)
│ (com.aicaller.gateway) │
└───────────┬────────────┘
            │ Physical SIM Telephony Call
            ▼
┌────────────────────────┐
│ Parent's Mobile Phone  │
└────────────────────────┘
```

---

## 🚀 Features

1. **Gateway Registration**:
   - Configurable Vercel Backend URL (`https://ai-caller1-1.vercel.app`).
   - Dynamically configurable Teacher Account ID.
   - Automatically generated unique persistent Gateway / Device ID (`gw_...`).
   - Configurable SIM phone number.

2. **Live Gateway Status**:
   - Status indicators: `OFFLINE`, `CONNECTING`, `ONLINE`.
   - Real-time battery percentage and network state reporting.
   - Physical SIM card detection and carrier operator display.

3. **Physical SIM Calling**:
   - Initiates actual cellular voice calls through the phone's physical SIM card via Android Telephony APIs (`ACTION_CALL`).
   - Monitors call state transitions (`CALL_INITIATED`, `CALLING`, `CONNECTED`, `ENDED`, `FAILED`).
   - Reports exact call durations back to the backend.

4. **Background Operation**:
   - Runs as an Android **Foreground Service** with a persistent status notification to prevent battery optimization kill.
   - Automatically polls backend and maintains heartbeats even when the phone screen is off or app is minimized.

5. **Live Log Console**:
   - Displays real-time gateway activity logs, incoming call requests, masked parent phone numbers (e.g. `+91 98******10`), and errors.
   - Includes **Copy** and **Clear** log options for easy debugging.

---

## 🛠 Prerequisites & Requirements

- **Android Studio**: Android Studio Hedgehog (2023.1.1) or newer / Jellyfish / Ladybug.
- **Android Phone**: Physical Android device running Android 7.0 (API Level 24) or higher.
- **Active Physical SIM Card**: SIM card inserted into the Android phone with voice call pack/recharge.

---

## 📱 How to Connect Your Android Phone & Enable USB Debugging

1. **Enable Developer Options on Android Phone**:
   - Go to **Settings** > **About Phone**.
   - Tap **Build Number** 7 times until you see `"You are now a developer!"`.
2. **Enable USB Debugging**:
   - Go to **Settings** > **System / Additional Settings** > **Developer Options**.
   - Turn ON **USB Debugging**.
3. **Connect to PC**:
   - Connect your Android phone to your PC using a USB cable.
   - On the phone pop-up, select **Allow USB Debugging** (check *"Always allow from this computer"*).

---

## 💻 How to Open & Build in Android Studio

1. **Open Project**:
   - Open Android Studio.
   - Click **Open** and select the folder:
     `android-sim-gateway`
2. **Gradle Sync**:
   - Android Studio will automatically sync the Gradle configuration.
   - If prompted, select JDK 17 or JDK 21.
3. **Build Debug APK**:
   - Go to top menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The generated APK will be located at:
     `android-sim-gateway/app/build/outputs/apk/debug/app-debug.apk`
4. **Run Directly on Device**:
   - Select your connected phone from the device dropdown list in Android Studio.
   - Click the green **Run ▶** button (Shift + F10).
   - The app will automatically install and open on your phone.

---

## ⚙️ App Configuration & Setup

When you launch **AI Caller SIM Gateway** on your Android phone:

1. **Backend URL**: Keep default `https://ai-caller1-1.vercel.app` (or your custom deployed URL).
2. **Teacher Account ID**: Enter your Teacher ID from your Vercel Dashboard profile.
3. **My SIM Phone Number**: Enter your mobile number (e.g. `+91XXXXXXXXXX`).
4. **Grant Permissions**:
   - When prompted, grant **Phone Calls**, **Phone State**, and **Notifications** permissions.
5. **Connect**: Tap **CONNECT GATEWAY**.
   - Status badge will change to `🟢 ONLINE`.
   - The persistent notification **"AI Caller SIM Gateway Running"** will appear in your status bar.

---

## 📡 Backend API Contract Specifications

The Vercel backend (`https://ai-caller1-1.vercel.app`) must implement the following 4 HTTP API endpoints:

### 1. Device Registration (`POST /api/gateway/register`)
**Request Body**:
```json
{
  "teacherId": "teacher_abc123",
  "deviceId": "gw_android_9774d56d682e549c",
  "simNumber": "+919876543210",
  "platform": "android",
  "deviceModel": "Pixel 7 Pro",
  "manufacturer": "Google",
  "sdkVersion": 34
}
```
**Response**:
```json
{
  "success": true,
  "deviceId": "gw_android_9774d56d682e549c",
  "deviceToken": "sec_token_991823712",
  "message": "Gateway registered successfully"
}
```

---

### 2. Device Heartbeat (`POST /api/gateway/heartbeat`)
Sent periodically every 15 seconds while gateway is connected.

**Request Body**:
```json
{
  "teacherId": "teacher_abc123",
  "deviceId": "gw_android_9774d56d682e549c",
  "simNumber": "+919876543210",
  "status": "ONLINE",
  "batteryLevel": 88,
  "networkStatus": "Cellular (Jio 4G)",
  "timestamp": 1789472810000
}
```
**Response**:
```json
{
  "success": true,
  "status": "ONLINE"
}
```

---

### 3. Poll Pending Calls (`GET /api/gateway/poll?deviceId=...&teacherId=...`)
Polled every 5 seconds by the Android gateway to check for outgoing call dispatch requests triggered by the Teacher Web App.

**Response (When call is queued)**:
```json
{
  "success": true,
  "calls": [
    {
      "type": "CALL_PARENT",
      "callId": "call_99201",
      "parentPhone": "+919876543210",
      "studentName": "Ravi Kumar",
      "parentName": "Parent",
      "date": "15 September 2026",
      "institutionName": "Malla Reddy University"
    }
  ]
}
```
*(If no calls pending, returns `{"success": true, "calls": []}`)*

---

### 4. Call Status Update (`POST /api/gateway/call-status`)
Sent by the Android app when call state changes during cellular call execution.

**Request Body**:
```json
{
  "callId": "call_99201",
  "deviceId": "gw_android_9774d56d682e549c",
  "status": "CALL_INITIATED", // Statuses: CALL_INITIATED | CALLING | CONNECTED | ENDED | FAILED
  "duration": 42,
  "timestamp": 1789472850000
}
```

---

## 🔒 Security & Safety

- **HTTPS Required**: All requests use HTTPS protocol to protect teacher and phone data.
- **Number Masking**: Parent numbers in logs are automatically masked (e.g. `+91 98******10`).
- **Teacher Isolation**: Gateway registration requires a valid `teacherId`, ensuring only authorized calls associated with that teacher account can be processed.

---

## 📋 Technical Project File Structure

```
android-sim-gateway/
├── app/
│   ├── build.gradle
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── java/com/aicaller/simgateway/
│           │   ├── ApiClient.kt
│           │   ├── CallManager.kt
│           │   ├── MainActivity.kt
│           │   ├── PreferenceManager.kt
│           │   ├── SimGatewayService.kt
│           │   └── SimUtils.kt
│           └── res/
│               ├── drawable/
│               ├── layout/activity_main.xml
│               ├── mipmap-anydpi-v26/
│               └── values/
│                   ├── colors.xml
│                   ├── strings.xml
│                   └── themes.xml
├── build.gradle
├── settings.gradle
├── gradlew
├── gradlew.bat
├── gradle/wrapper/gradle-wrapper.properties
└── README.md
```
