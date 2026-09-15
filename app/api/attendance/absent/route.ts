import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

// GET /api/attendance/absent - Retrieve absent students with latest call details
export async function GET(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Fetch all attendance marked 'Absent' for this teacher and date
    const absentRecords = await prisma.attendance.findMany({
      where: {
        teacherId: session.teacherId,
        date,
        status: 'Absent',
      },
      include: {
        student: true,
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    const absentStudents = absentRecords.map((record) => {
      const latestCall = record.calls[0] || null;
      return {
        attendanceId: record.id,
        date: record.date,
        student: record.student,
        latestCall: latestCall
          ? {
              callId: latestCall.id,
              status: latestCall.status,
              duration: latestCall.duration,
              parentResponse: latestCall.parentResponse,
              createdAt: latestCall.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      date,
      count: absentStudents.length,
      absentStudents,
    });
  } catch (error: any) {
    console.error('Fetch absent students error:', error);
    return NextResponse.json({ error: 'Failed to fetch absent students' }, { status: 500 });
  }
}
