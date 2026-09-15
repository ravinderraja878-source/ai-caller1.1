import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getTelephonyProvider, isLiveCallingActive } from '@/lib/telephony/TelephonyService';
import { normalizePhoneNumber } from '@/lib/telephony/phoneValidation';

// POST /api/calls/test - Make a real test SIM call via connected Android Gateway
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parentTestNumber, teacherNumber } = body;

    if (!parentTestNumber) {
      return NextResponse.json({ error: 'Parent test phone number is required' }, { status: 400 });
    }

    const normalizedParentPhone = normalizePhoneNumber(parentTestNumber);
    if (!normalizedParentPhone) {
      return NextResponse.json({ error: 'Invalid parent test mobile number.' }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: session.teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const fromPhone = teacherNumber || teacher.phone || null;

    if (!isLiveCallingActive()) {
      return NextResponse.json({
        success: false,
        error: 'Calling mode is set to "DEMO MODE". Switch to "LIVE PERSONAL SIM" in Profile Settings to use your physical SIM.',
      }, { status: 400 });
    }

    // Check Android SIM Gateway status
    const connectedDevice = await prisma.simGatewayDevice.findFirst({
      where: {
        teacherId: teacher.id,
        status: 'ONLINE',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connectedDevice) {
      return NextResponse.json({
        success: false,
        error: 'Your SIM phone is offline. Connect the Android SIM Gateway before making a call.',
        code: 'GATEWAY_OFFLINE',
      }, { status: 400 });
    }

    // Get any student belonging to teacher for test record reference
    const sampleStudent = await prisma.student.findFirst({ where: { teacherId: teacher.id } });

    // Create test call record
    const callRecord = await prisma.call.create({
      data: {
        studentId: sampleStudent?.id || teacher.id,
        teacherId: teacher.id,
        parentPhone: normalizedParentPhone,
        teacherPhone: fromPhone,
        deviceId: connectedDevice.id,
        callingMethod: 'PERSONAL_SIM',
        provider: 'PERSONAL_SIM',
        status: 'REQUESTED',
      },
    });

    const provider = getTelephonyProvider();
    const result = await provider.makeCall({
      callId: callRecord.id,
      studentId: callRecord.studentId,
      studentName: sampleStudent?.name || 'Rahul Kumar',
      parentName: sampleStudent?.parentName || 'Ramesh Kumar',
      parentPhone: normalizedParentPhone,
      teacherPhone: fromPhone,
      attendanceDate: new Date().toISOString().split('T')[0],
      collegeName: teacher.collegeName || 'Malla Reddy University',
      teacherName: teacher.name,
    });

    await prisma.call.update({
      where: { id: callRecord.id },
      data: {
        providerCallId: result.providerCallId,
        status: result.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test SIM call request dispatched to Android SIM Gateway.',
      providerCallId: result.providerCallId,
      parentPhone: normalizedParentPhone,
      teacherPhone: fromPhone,
      deviceName: connectedDevice.deviceName,
      deviceId: connectedDevice.deviceId,
    });
  } catch (error: any) {
    console.error('Test SIM call error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'The test call could not be dispatched to your Android SIM device.',
    }, { status: 500 });
  }
}
