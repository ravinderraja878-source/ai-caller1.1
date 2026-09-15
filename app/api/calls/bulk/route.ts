import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getVoiceProvider, getActiveVoiceMode } from '@/lib/voice/VoiceService';

// POST /api/calls/bulk - Initiate calls sequentially for a list of absent student attendance IDs
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceIds, date } = body;

    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return NextResponse.json({ error: 'Array of attendanceIds is required' }, { status: 400 });
    }

    // Verify all attendance records belong to this teacher and are marked 'Absent'
    const records = await prisma.attendance.findMany({
      where: {
        id: { in: attendanceIds },
        teacherId: session.teacherId,
        status: 'Absent',
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid absent records found' }, { status: 404 });
    }

    const voiceProvider = getVoiceProvider();
    const initiatedCalls = [];

    // Process calls sequentially
    for (const record of records) {
      const callRecord = await prisma.call.create({
        data: {
          studentId: record.studentId,
          teacherId: session.teacherId,
          attendanceId: record.id,
          parentPhone: record.student.parentPhone,
          status: 'Initiating',
        },
      });

      try {
        const result = await voiceProvider.initiateCall({
          callId: callRecord.id,
          studentId: record.studentId,
          studentName: record.student.name,
          parentName: record.student.parentName,
          parentPhone: record.student.parentPhone,
          attendanceDate: record.date || date || new Date().toISOString().split('T')[0],
          collegeName: record.teacher.collegeName || process.env.COLLEGE_NAME || 'Engineering College',
          teacherName: record.teacher.name,
        });

        const updatedCall = await prisma.call.update({
          where: { id: callRecord.id },
          data: {
            providerCallId: result.providerCallId,
            status: result.status,
          },
          include: { student: true },
        });

        initiatedCalls.push(updatedCall);
      } catch (err: any) {
        await prisma.call.update({
          where: { id: callRecord.id },
          data: { status: 'Failed', parentResponse: 'Bulk initiation error' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: initiatedCalls.length,
      totalRequested: attendanceIds.length,
      calls: initiatedCalls,
      voiceMode: getActiveVoiceMode(),
    });
  } catch (error: any) {
    console.error('Bulk call error:', error);
    return NextResponse.json({ error: 'Failed to initiate bulk calls' }, { status: 500 });
  }
}
