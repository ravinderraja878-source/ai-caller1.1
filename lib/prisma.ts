import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Detect Vercel serverless environment (where root filesystem is read-only)
const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NOW_BUILDER);

// On Vercel, SQLite must use /tmp/dev.db because current directory is read-only at runtime
let targetDbUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
  ? process.env.DATABASE_URL
  : (isVercel ? 'file:/tmp/dev.db' : 'file:./dev.db');

if (isVercel && (targetDbUrl.startsWith('file:.') || targetDbUrl === 'file:./dev.db')) {
  targetDbUrl = 'file:/tmp/dev.db';
}

process.env.DATABASE_URL = targetDbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  initialized: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: targetDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let initPromise: Promise<void> | null = null;

// Helper to guarantee SQLite database tables & demo user exist BEFORE queries execute
export async function ensureDbInitialized() {
  if (globalForPrisma.initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "teachers" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL UNIQUE,
            "passwordHash" TEXT NOT NULL,
            "collegeName" TEXT NOT NULL,
            "phone" TEXT,
            "isVerified" BOOLEAN NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "students" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "teacherId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "rollNumber" TEXT NOT NULL,
            "course" TEXT NOT NULL,
            "year" TEXT NOT NULL,
            "section" TEXT NOT NULL,
            "parentName" TEXT NOT NULL,
            "parentPhone" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "attendance" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "studentId" TEXT NOT NULL,
            "teacherId" TEXT NOT NULL,
            "date" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "sim_gateway_devices" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "deviceId" TEXT NOT NULL UNIQUE,
            "deviceToken" TEXT NOT NULL,
            "deviceName" TEXT DEFAULT 'Android Phone',
            "teacherId" TEXT NOT NULL,
            "phoneNumber" TEXT,
            "status" TEXT NOT NULL DEFAULT 'OFFLINE',
            "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "calls" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "studentId" TEXT NOT NULL,
            "teacherId" TEXT NOT NULL,
            "attendanceId" TEXT,
            "deviceId" TEXT,
            "parentPhone" TEXT NOT NULL,
            "teacherPhone" TEXT,
            "callingMethod" TEXT NOT NULL DEFAULT 'PERSONAL_SIM',
            "provider" TEXT NOT NULL DEFAULT 'PERSONAL_SIM',
            "providerCallId" TEXT,
            "status" TEXT NOT NULL,
            "duration" INTEGER NOT NULL DEFAULT 0,
            "transcript" TEXT,
            "parentResponse" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "startedAt" DATETIME,
            "completedAt" DATETIME,
            FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("attendanceId") REFERENCES "attendance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
            FOREIGN KEY ("deviceId") REFERENCES "sim_gateway_devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE
          );
        `);

        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "teachers_email_key" ON "teachers"("email");`);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "students_teacherId_rollNumber_key" ON "students"("teacherId", "rollNumber");`);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "attendance_studentId_date_key" ON "attendance"("studentId", "date");`);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "sim_gateway_devices_deviceId_key" ON "sim_gateway_devices"("deviceId");`);

        // Seed default demo teacher if table is empty
        const existingTeacher = await prisma.teacher.findFirst();
        if (!existingTeacher) {
          const passwordHash = await bcrypt.hash('password123', 10);
          const demoTeacher = await prisma.teacher.create({
            data: {
              id: 'demo-teacher-id-01',
              name: 'Dr. K. Srimannarayana',
              email: 'teacher@mallareddy.edu',
              passwordHash,
              collegeName: 'Malla Reddy University',
              isVerified: true,
            },
          });

          const sampleStudent = await prisma.student.create({
            data: {
              name: 'Rahul Kumar',
              rollNumber: '23CSE101',
              course: 'B.Tech CSE',
              year: '2nd Year',
              section: 'A',
              parentName: 'Ramesh Kumar',
              parentPhone: '+919876543210',
              teacherId: demoTeacher.id,
            },
          });

          await prisma.attendance.create({
            data: {
              studentId: sampleStudent.id,
              teacherId: demoTeacher.id,
              date: new Date().toISOString().split('T')[0],
              status: 'Absent',
            },
          });
        }

        globalForPrisma.initialized = true;
      } catch (err: any) {
        console.error('Prisma auto-table init notice:', err);
      }
    })();
  }

  await initPromise;
}

