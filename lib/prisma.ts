import { PrismaClient } from '@prisma/client';

// Fallback DATABASE_URL if not set in Vercel environment variables
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  // Use writable /tmp directory on Vercel serverless functions, or local relative path
  process.env.DATABASE_URL = process.env.VERCEL ? 'file:/tmp/dev.db' : 'file:./dev.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  initialized: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let initPromise: Promise<void> | null = null;

// Helper to guarantee SQLite database tables exist BEFORE executing queries on Vercel/Serverless
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

        globalForPrisma.initialized = true;
      } catch (err) {
        console.error('Prisma auto-table init error:', err);
      }
    })();
  }

  await initPromise;
}
