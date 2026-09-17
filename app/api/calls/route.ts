import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getTelephonyProvider, isLiveCallingActive } from '@/lib/telephony/TelephonyService';
import { normalizePhoneNumber } from '@/lib/telephony/phoneValidation';

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

    const validParentPhone = normalizePhoneNumber(student.parentPhone) || student.parentPhone;
    const teacherPhone = student.teacher.phone || '+91';

    // Clear any prior active call records for this student to allow instant new call dispatch
    await prisma.call.updateMany({
      where: {
        studentId: student.id,
        teacherId: session.teacherId,
        status: { in: ['REQUESTED', 'DEVICE_RECEIVED', 'DIALING', 'RINGING', 'ANSWERED', 'AI_CONNECTED', 'LISTENING', 'SPEAKING', 'Initiating'] },
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Auto-ensure connected gateway device exists
    let connectedDevice = await prisma.simGatewayDevice.findFirst({
      where: { teacherId: session.teacherId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connectedDevice) {
      connectedDevice = await prisma.simGatewayDevice.create({
        data: {
          id: `sim-gw-${session.teacherId.slice(0, 12)}`,
          deviceId: `DEV-${session.teacherId.slice(0, 8)}`,
          deviceToken: `TOKEN-${Date.now()}`,
          deviceName: 'Personal Android SIM Gateway',
          teacherId: session.teacherId,
          phoneNumber: teacherPhone,
          status: 'ONLINE',
          lastSeen: new Date(),
        },
      });
    } else {
      connectedDevice = await prisma.simGatewayDevice.update({
        where: { id: connectedDevice.id },
        data: { status: 'ONLINE', lastSeen: new Date() },
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Create call record in database
    const callRecord = await prisma.call.create({
      data: {
        studentId: student.id,
        teacherId: session.teacherId,
        attendanceId: attendanceId || null,
        parentPhone: validParentPhone,
        teacherPhone: teacherPhone,
        deviceId: connectedDevice.id,
        callingMethod: 'PERSONAL_SIM',
        provider: 'PERSONAL_SIM',
        status: 'REQUESTED',
        startedAt: new Date(),
      },
    });

    const telephonyProvider = getTelephonyProvider();

    try {
      const result = await telephonyProvider.makeCall({
        callId: callRecord.id,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: validParentPhone,
        teacherPhone: teacherPhone,
        attendanceDate,
        collegeName: student.teacher.collegeName || 'Malla Reddy University',
        teacherName: student.teacher.name,
      });

      const updatedCall = await prisma.call.findUnique({
        where: { id: callRecord.id },
        include: { student: true, device: true },
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        call: updatedCall,
        voiceMode: isLiveCallingActive() ? 'production' : 'mock',
      });
    } catch (providerError: any) {
      console.error('Telephony Provider error:', providerError);

      await prisma.call.update({
        where: { id: callRecord.id },
        data: { status: 'FAILED', parentResponse: `Initiation Notice: ${providerError?.message || 'Gateway error'}` },
      });

      return NextResponse.json(
        {
          error: providerError?.message || 'Unable to dispatch SIM call to parent phone.',
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
