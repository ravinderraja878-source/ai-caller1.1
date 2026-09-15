import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getVoiceProvider, getActiveVoiceMode } from '@/lib/voice/VoiceService';

// GET /api/calls - Fetch call history for logged-in teacher
export async function GET(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const whereClause: any = {
      teacherId: session.teacherId,
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const calls = await prisma.call.findMany({
      where: whereClause,
      include: {
        student: true,
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, calls });
  } catch (error: any) {
    console.error('Fetch call history error:', error);
    return NextResponse.json({ error: 'Failed to retrieve call history' }, { status: 500 });
  }
}

// POST /api/calls - Initiate an AI voice call for a student
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, attendanceId, date } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Verify student belongs to logged-in teacher
    const student = await prisma.student.findFirst({
      where: { id: studentId, teacherId: session.teacherId },
      include: { teacher: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found or access denied' }, { status: 404 });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Create call record in database
    const callRecord = await prisma.call.create({
      data: {
        studentId: student.id,
        teacherId: session.teacherId,
        attendanceId: attendanceId || null,
        parentPhone: student.parentPhone,
        status: 'Initiating',
      },
    });

    const voiceProvider = getVoiceProvider();

    try {
      const result = await voiceProvider.initiateCall({
        callId: callRecord.id,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        attendanceDate,
        collegeName: student.teacher.collegeName || process.env.COLLEGE_NAME || 'Engineering College',
        teacherName: student.teacher.name,
      });

      // Update call record with provider SID
      const updatedCall = await prisma.call.update({
        where: { id: callRecord.id },
        data: {
          providerCallId: result.providerCallId,
          status: result.status,
        },
        include: { student: true },
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        call: updatedCall,
        voiceMode: getActiveVoiceMode(),
      });
    } catch (providerError: any) {
      console.error('Voice Provider error:', providerError);

      await prisma.call.update({
        where: { id: callRecord.id },
        data: { status: 'Failed', parentResponse: 'Initiation Failed: Provider configuration' },
      });

      return NextResponse.json(
        {
          error: providerError?.message || 'Unable to initiate voice call with provider.',
          callId: callRecord.id,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Initiate call error:', error);
    return NextResponse.json({ error: 'Internal server error initiating call' }, { status: 500 });
  }
}
