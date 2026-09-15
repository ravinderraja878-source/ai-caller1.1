import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/gateway/heartbeat - Android Gateway status & heartbeat update
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, deviceToken, status = 'ONLINE', phoneNumber } = body;

    if (!deviceId || !deviceToken) {
      return NextResponse.json({ error: 'deviceId and deviceToken are required' }, { status: 400 });
    }

    // Verify device credentials
    const device = await prisma.simGatewayDevice.findUnique({
      where: { deviceId },
    });

    if (!device || device.deviceToken !== deviceToken) {
      return NextResponse.json({ error: 'Invalid device credentials' }, { status: 401 });
    }

    // Update lastSeen timestamp and status
    const updatedDevice = await prisma.simGatewayDevice.update({
      where: { id: device.id },
      data: {
        status: status,
        lastSeen: new Date(),
        phoneNumber: phoneNumber || device.phoneNumber,
      },
    });

    // Check if there are active queued calls for this device
    const pendingCallsCount = await prisma.call.count({
      where: {
        deviceId: device.id,
        status: 'REQUESTED',
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
