import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET or POST /api/gateway/poll - Android device polls for pending outbound call requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const deviceToken = searchParams.get('deviceToken');

    if (!deviceId || !deviceToken) {
      return NextResponse.json({ error: 'deviceId and deviceToken query params are required' }, { status: 400 });
    }

    const device = await prisma.simGatewayDevice.findUnique({
      where: { deviceId },
    });

    if (!device || device.deviceToken !== deviceToken) {
      return NextResponse.json({ error: 'Invalid device credentials' }, { status: 401 });
    }

    // Update device lastSeen
    await prisma.simGatewayDevice.update({
      where: { id: device.id },
      data: { status: 'ONLINE', lastSeen: new Date() },
    });

    // Find pending calls requested for this teacher or assigned to this device
    const pendingCalls = await prisma.call.findMany({
      where: {
        teacherId: device.teacherId,
        status: 'REQUESTED',
      },
      include: {
        student: true,
        teacher: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    if (pendingCalls.length === 0) {
      return NextResponse.json({ success: true, calls: [] });
    }

    // Mark pending calls as assigned to this device & status DEVICE_RECEIVED
    const callPayloads = [];

    for (const call of pendingCalls) {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          deviceId: device.id,
          status: 'DEVICE_RECEIVED',
        },
      });

      callPayloads.push({
        callId: call.id,
        studentId: call.studentId,
        studentName: call.student.name,
        parentName: call.student.parentName,
        parentPhone: call.parentPhone,
        teacherPhone: call.teacherPhone || device.phoneNumber || call.teacher.phone,
        collegeName: call.teacher.collegeName || 'College',
        teacherName: call.teacher.name,
        attendanceDate: call.createdAt.toISOString().split('T')[0],
      });
    }

    return NextResponse.json({
      success: true,
      calls: callPayloads,
    });
  } catch (error: any) {
    console.error('Error polling call requests:', error);
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
