# 📞 Telugu AI Attendance Caller for Colleges

A production-ready full-stack Next.js web application for colleges that allows faculty members to manage student records, mark daily attendance, view absent students, and automatically launch Telugu AI voice calls to parents to capture absence explanations.

---

## 🌟 Key Features

- **Teacher Authentication & Tenant Isolation**: Secure bcrypt password hashing and JWT sessions stored in `HttpOnly` cookies. Server-side validation guarantees multi-tenant data isolation per teacher account.
- **Student Directory Management**: Full CRUD operations with search and dynamic filtering by Course, Year, and Section.
- **Interactive Attendance Tracker**: Date picker and grid toggles for Present / Absent status with batch database saving.
- **Absent Student Hub & One-Click AI Calling**: View absent students with parent phone numbers and click "Call Parent with AI".
- **Bulk Queue Calling**: Queue sequential AI voice calls for all absent students with real-time progress (`3 / 10 calls completed`).
- **Telugu AI Voice Conversation Engine**:
  - Speaks natural, respectful everyday Telugu.
  - Dynamically interpolates exact student name (`{{student_name}}`), parent name, attendance date, and college name.
  - Extracts and categorizes parent response reasons ("Student had fever", "Urgent family emergency", etc.).
- **VoiceProvider Architecture**:
  - `VOICE_MODE=mock`: Built-in sandbox simulator with live audio/transcript widget for instant local testing without telephony fees.
  - `VOICE_MODE=production`: Connects to Twilio Voice API / TwiML / Media Streams for real phone calls.
- **Call History & Transcripts**: Track call status (Completed, Ringing, No Answer, Busy), duration, full Telugu conversation logs, and retry failed calls.
- **100% Vercel Compatible**: Uses Next.js App Router serverless route handlers, PostgreSQL/Supabase ORM, and provider webhooks.

---

## 🚀 Step-by-Step Setup & Vercel Deployment Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database & Prisma ORM

By default, the project uses local SQLite (`file:./dev.db`) for zero-config development.
For production on Vercel, connect **Supabase PostgreSQL**:

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. In `.env`, update `DATABASE_URL` with your Supabase connection string:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
3. Run schema generation and sync:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### 3. Seed Database with Demo Accounts & Students

Run the seed script to populate sample teachers, students, and call history:

```bash
npx ts-node scripts/seed.ts
```

**Demo Credentials**:
- Email: `teacher@vignan.edu`
- Password: `password123`

### 4. Configure Environment Variables

Create `.env` (or set Vercel Environment Variables):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="telugu-ai-attendance-caller-super-secret-key-2026"

# Voice Mode: 'mock' (sandbox simulator) or 'production' (real Twilio calls)
VOICE_MODE="mock"

# Telephony Provider Credentials (for production)
VOICE_PROVIDER_API_KEY="your_twilio_auth_token"
VOICE_PROVIDER_ACCOUNT_ID="your_twilio_account_sid"
VOICE_PROVIDER_PHONE_NUMBER="+919876543210"

# AI Voice API Key
AI_API_KEY="your_ai_api_key"

COLLEGE_NAME="Vignan Institute of Technology & Science"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 6. Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Import project into your [Vercel Dashboard](https://vercel.com).
3. Add the Environment Variables above in Vercel Project Settings.
4. Set Build Command: `prisma generate && next build`.
5. Deploy!

---

## 📜 API Route Endpoints

- `POST /api/auth/register` - Teacher sign-up
- `POST /api/auth/login` - Teacher login
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get logged-in teacher info
- `GET /api/students` - Query teacher's students
- `POST /api/students` - Create student record
- `PUT /api/students/:id` - Update student record
- `DELETE /api/students/:id` - Remove student record
- `GET /api/attendance` - Get class attendance
- `POST /api/attendance` - Batch save attendance
- `GET /api/attendance/absent` - Get absent students & call statuses
- `POST /api/calls` - Launch single AI voice call
- `POST /api/calls/bulk` - Queue sequential calls for all absent students
- `GET /api/calls` - Fetch call history logs
- `GET /api/calls/:id` - Fetch call details & transcript
- `POST /api/calls/:id/simulate` - Fast-forward mock call state
- `POST /api/voice/webhook` - Telephony TwiML webhook
- `POST /api/voice/status` - Telephony status callback
- `POST /api/voice/response` - Telephony speech-to-text response callback
