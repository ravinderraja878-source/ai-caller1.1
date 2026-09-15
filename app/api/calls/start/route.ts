import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getTelephonyProvider, isLiveCallingActive } from '@/lib/telephony/TelephonyService';
import { normalizePhoneNumber } from '@/lib/telephony/phoneValidation';

// POST /api/calls/start - Initiate call to parent via Android SIM Gateway
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, attendanceId, date } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // 1. Verify student belongs strictly to logged-in teacher
    const student = await prisma.student.findFirst({
      where: { id: studentId, teacherId: session.teacherId },
      include: { teacher: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found or access denied' }, { status: 404 });
    }

    // 2. Validate and normalize parent phone number (E.164 format +91XXXXXXXXXX)
    const validParentPhone = normalizePhoneNumber(student.parentPhone);
    if (!validParentPhone) {
      return NextResponse.json({ error: 'Invalid parent mobile number.' }, { status: 400 });
    }

    // 3. Check for active calls in progress
    const activeCall = await prisma.call.findFirst({
      where: {
        studentId: student.id,
        teacherId: session.teacherId,
        status: { in: ['REQUESTED', 'DEVICE_RECEIVED', 'DIALING', 'RINGING', 'ANSWERED', 'AI_CONNECTED', 'LISTENING', 'SPEAKING'] },
      },
    });

    if (activeCall) {
      return NextResponse.json({ error: 'Call already in progress for this student.' }, { status: 409 });
    }

    // 4. Retrieve teacher's personal SIM number
    const teacherPhone = student.teacher.phone || null;

    // 5. Check Android SIM Gateway connection status when live SIM mode is active
    let connectedDevice = null;
    if (isLiveCallingActive()) {
      connectedDevice = await prisma.simGatewayDevice.findFirst({
        where: {
          teacherId: session.teacherId,
          status: 'ONLINE',
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!connectedDevice) {
        return NextResponse.json(
          {
            error: 'Your SIM phone is offline. Connect the Android SIM Gateway before making a call.',
            code: 'GATEWAY_OFFLINE',
          },
          { status: 400 }
        );
      }
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // 6. Create call record
    const callRecord = await prisma.call.create({
      data: {
        studentId: student.id,
        teacherId: session.teacherId,
        attendanceId: attendanceId || null,
        parentPhone: validParentPhone,
        teacherPhone: teacherPhone,
        deviceId: connectedDevice?.id || null,
        callingMethod: isLiveCallingActive() ? 'PERSONAL_SIM' : 'DEMO',
        provider: isLiveCallingActive() ? 'PERSONAL_SIM' : 'DEMO',
        status: 'REQUESTED',
      },
    });

    const telephonyProvider = getTelephonyProvider();

    try {
      // 7. Dispatch call request to Android SIM Gateway
      const result = await telephonyProvider.makeCall({
        callId: callRecord.id,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: validParentPhone,
        teacherPhone: teacherPhone,
        attendanceDate,
        collegeName: student.teacher.collegeName || 'College',
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
        isLive: isLiveCallingActive(),
        gatewayConnected: true,
      });
    } catch (providerError: any) {
      console.error('SIM Gateway Call Error:', providerError);

      await prisma.call.update({
        where: { id: callRecord.id },
        data: {
          status: 'FAILED',
          parentResponse: `Gateway Error: ${providerError?.message || 'SIM Gateway failure'}`,
        },
      });

      return NextResponse.json(
        {
          error: providerError?.message || 'The SIM call could not be dispatched to your Android phone.',
          callId: callRecord.id,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Start SIM call error:', error);
    return NextResponse.json({ error: 'Internal server error starting SIM call' }, { status: 500 });
  }
}
