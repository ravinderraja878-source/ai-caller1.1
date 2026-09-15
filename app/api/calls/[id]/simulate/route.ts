import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { buildFullMockTranscript } from '@/lib/voice/teluguAI';

// POST /api/calls/[id]/simulate - Advance or complete simulated call state for live UI testing
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const nextStatus = body.nextStatus || 'Completed';

    const call = await prisma.call.findFirst({
      where: { id, teacherId: session.teacherId },
      include: { student: true, teacher: true, attendance: true },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    let updateData: any = { status: nextStatus };

    if (nextStatus === 'Completed') {
      const { transcript, parentResponse } = buildFullMockTranscript({
        studentName: call.student.name,
        parentName: call.student.parentName,
        attendanceDate: call.attendance?.date || new Date().toISOString().split('T')[0],
        collegeName: call.teacher.collegeName || process.env.COLLEGE_NAME || 'Engineering College',
        teacherName: call.teacher.name,
      });

      updateData = {
        status: 'Completed',
        duration: Math.floor(Math.random() * 20) + 15,
        transcript,
        parentResponse,
        completedAt: new Date(),
      };
    }

    const updatedCall = await prisma.call.update({
      where: { id },
      data: updateData,
      include: { student: true, attendance: true },
    });

    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error: any) {
    console.error('Simulate call error:', error);
    return NextResponse.json({ error: 'Failed to simulate call step' }, { status: 500 });
  }
}
