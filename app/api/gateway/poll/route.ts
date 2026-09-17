import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET or POST /api/gateway/poll - Android device polls for pending outbound call requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const teacherId = searchParams.get('teacherId');
    const deviceToken = searchParams.get('deviceToken');

    if (!deviceId && !teacherId) {
      return NextResponse.json({ error: 'deviceId or teacherId query param is required' }, { status: 400 });
    }

    let device = null;
    if (deviceId) {
      device = await prisma.simGatewayDevice.findFirst({
        where: { deviceId },
      });
    }

    if (!device && teacherId) {
      device = await prisma.simGatewayDevice.findFirst({
        where: { teacherId },
      });
    }

    const effectiveTeacherId = device?.teacherId || teacherId;

    if (device) {
      // Update device lastSeen
      await prisma.simGatewayDevice.update({
        where: { id: device.id },
        data: { status: 'ONLINE', lastSeen: new Date() },
      });
    }

    if (!effectiveTeacherId) {
      return NextResponse.json({ success: true, calls: [] });
    }

    // Find pending calls requested for this teacher
    const pendingCalls = await prisma.call.findMany({
      where: {
        teacherId: effectiveTeacherId,
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
          deviceId: device?.id || null,
          status: 'DEVICE_RECEIVED',
        },
      });

      callPayloads.push({
        callId: call.id,
        studentId: call.studentId,
        studentName: call.student.name,
        parentName: call.student.parentName,
        parentPhone: call.parentPhone,
        teacherPhone: call.teacherPhone || device?.phoneNumber || call.teacher.phone,
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

