import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getActiveVoiceMode } from '@/lib/voice/VoiceService';

export async function GET() {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, teacher: null }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: session.teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      collegeName: true,
      createdAt: true,
    },
  });

  if (!teacher) {
    return NextResponse.json({ authenticated: false, teacher: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    teacher,
    voiceMode: getActiveVoiceMode(),
  });
}
