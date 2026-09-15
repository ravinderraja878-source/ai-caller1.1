import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/gateway/call-status - Receive real-time cellular call state events from Android SIM Gateway
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      deviceId,
      deviceToken,
      callId,
      status,
      duration = 0,
      transcript,
      parentResponse,
      failureReason,
    } = body;

    if (!deviceId || !deviceToken || !callId || !status) {
      return NextResponse.json({ error: 'deviceId, deviceToken, callId, and status are required' }, { status: 400 });
    }

    // Verify device authorization
    const device = await prisma.simGatewayDevice.findUnique({
      where: { deviceId },
    });

    if (!device || device.deviceToken !== deviceToken) {
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 });
    }

    const callRecord = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!callRecord) {
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    const updateData: any = {
      status,
      deviceId: device.id,
      callingMethod: 'PERSONAL_SIM',
    };

    if (status === 'ANSWERED' && !callRecord.startedAt) {
      updateData.startedAt = new Date();
    }

    if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(status)) {
      updateData.completedAt = new Date();
      if (duration) updateData.duration = duration;
      if (transcript) updateData.transcript = transcript;
      if (parentResponse) updateData.parentResponse = parentResponse;
      if (failureReason && !parentResponse) {
        updateData.parentResponse = `Device Status: ${failureReason}`;
      }
    }

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: updateData,
    });

    // Update device status back to ONLINE if call completed
    if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(status)) {
      await prisma.simGatewayDevice.update({
        where: { id: device.id },
        data: { status: 'ONLINE', lastSeen: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      callId: updatedCall.id,
      status: updatedCall.status,
    });
  } catch (error: any) {
    console.error('Error updating call status from gateway:', error);
    return NextResponse.json({ error: 'Failed to update call status' }, { status: 500 });
  }
}
