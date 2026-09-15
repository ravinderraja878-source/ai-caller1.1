# AI Caller SIM Gateway - Android Companion App

This companion application turns your personal Android smartphone into a physical **SIM Cellular Gateway** for your Vercel-deployed AI Attendance Application.

---

## 📱 How It Works

```
Teacher Dashboard (Vercel)
        ↓
Vercel Gateway API (/api/gateway)
        ↓
Android SIM Gateway (Companion App)
        ↓
Physical Indian SIM Card
        ↓
Parent Mobile Phone (Cellular Call)
```

---

## ⚙️ How to Build & Install

1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `android-sim-gateway/` folder.
3. Connect your Android phone (with your active physical SIM card inserted) via USB with **USB Debugging** enabled.
4. Click **Run 'app'** or build the APK via `Build → Build APK(s)`.
5. Install the APK on your Android phone.

---

## 🔗 How to Connect to Vercel

1. Open the **AI Caller SIM Gateway** app on your phone.
2. Grant permissions for **Phone Calls**, **Phone State**, and **Internet**.
3. Go to your **Profile / Calling Settings** on the web app.
4. Click **Connect Android Phone** to view your credentials.
5. Enter into the Android App:
   - **Vercel Backend URL**: `https://your-app.vercel.app`
   - **Teacher Account ID**: Your teacher account UUID
   - **My Mobile SIM Number**: `+91XXXXXXXXXX` (Your SIM number)
6. Click **Connect to Vercel Gateway**.

The dashboard will show **🟢 Connected**, and outbound call dispatches from the teacher dashboard will automatically dial via your phone's physical SIM card!
