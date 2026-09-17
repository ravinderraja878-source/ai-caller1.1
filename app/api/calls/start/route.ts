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

    // 3. Clear any prior active call records for this student to allow instant new call dispatch
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

    // 4. Retrieve teacher's personal SIM number
    const teacherPhone = student.teacher.phone || null;

    // 5. Ensure Android SIM Gateway device connection status
    let connectedDevice = await prisma.simGatewayDevice.findFirst({
      where: {
        teacherId: session.teacherId,
      },
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
          phoneNumber: teacherPhone || '+91',
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
