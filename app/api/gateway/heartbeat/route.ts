import { NextResponse } from 'next/server';
import { prisma, ensureDbInitialized } from '@/lib/prisma';

// POST /api/gateway/heartbeat - Android Gateway status & heartbeat update
export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { deviceId, deviceToken, teacherId, status = 'ONLINE', phoneNumber, simNumber } = body;
    const phone = phoneNumber || simNumber;

    if (!deviceId && !teacherId) {
      return NextResponse.json({ error: 'deviceId or teacherId is required' }, { status: 400 });
    }

    // Find device by deviceId or teacherId
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

    if (!device) {
      return NextResponse.json({ error: 'Device record not found. Please register device first.' }, { status: 404 });
    }

    if (deviceToken && device.deviceToken && device.deviceToken !== deviceToken) {
      // If token strictly mismatch, still log warning but permit heartbeat for deviceId
      console.warn(`Heartbeat token mismatch for device ${deviceId}`);
    }

    // Update lastSeen timestamp and status
    const updatedDevice = await prisma.simGatewayDevice.update({
      where: { id: device.id },
      data: {
        status: status,
        lastSeen: new Date(),
        phoneNumber: phone || device.phoneNumber,
      },
    });

    // Check if there are active queued calls for this device or teacher
    const pendingCallsCount = await prisma.call.count({
      where: {
        OR: [
          { deviceId: device.id, status: 'REQUESTED' },
          { teacherId: device.teacherId, status: 'REQUESTED' }
        ]
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedDevice.status,
      lastSeen: updatedDevice.lastSeen,
      hasPendingCalls: pendingCallsCount > 0,
      pendingCount: pendingCallsCount,
    });
  } catch (error: any) {
    console.error('Error in gateway heartbeat:', error);
    return NextResponse.json({ error: 'Heartbeat processing error' }, { status: 500 });
  }
}

