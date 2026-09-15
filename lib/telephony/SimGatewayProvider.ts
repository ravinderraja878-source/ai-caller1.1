import { TelephonyProvider, OutboundCallRequest, TelephonyCallResult, TelephonyStatusResult } from './TelephonyProvider';
import { prisma } from '@/lib/prisma';

export class SimGatewayProvider implements TelephonyProvider {
  name = 'PERSONAL_SIM';

  /**
   * Initiate outbound cellular call dispatch via Android SIM Gateway
   */
  async makeCall(params: OutboundCallRequest): Promise<TelephonyCallResult> {
    // 1. Find an active connected Android SIM gateway for the teacher
    const callRecord = await prisma.call.findUnique({
      where: { id: params.callId },
      include: { teacher: true },
    });

    if (!callRecord) {
      throw new Error(`Call record ${params.callId} not found`);
    }

    // Look for an ONLINE gateway device belonging to this teacher
    const gatewayDevice = await prisma.simGatewayDevice.findFirst({
      where: {
        teacherId: callRecord.teacherId,
        status: 'ONLINE',
      },
      orderBy: { updatedAt: 'desc' },
    });

    // We allow queuing if in demo mode or if offline with clear notice, but for real SIM calling device must be connected
    if (!gatewayDevice) {
      throw new Error(
        'No active Android SIM Gateway connected. Please pair your Android phone in Calling Settings before making a call.'
      );
    }

    // Assign device ID to call record and update status to REQUESTED
    await prisma.call.update({
      where: { id: params.callId },
      data: {
        deviceId: gatewayDevice.id,
        callingMethod: 'PERSONAL_SIM',
        status: 'REQUESTED',
        providerCallId: `SIM_REQ_${params.callId.slice(0, 8)}`,
      },
    });

    return {
      provider: 'PERSONAL_SIM',
      providerCallId: `SIM_REQ_${params.callId.slice(0, 8)}`,
      status: 'REQUESTED',
      message: `Secure call request queued for Android SIM Gateway (${gatewayDevice.deviceName || 'Android Device'})`,
    };
  }

  async getCallStatus(providerCallId: string): Promise<TelephonyStatusResult> {
    const call = await prisma.call.findFirst({
      where: {
        OR: [{ providerCallId }, { id: providerCallId }],
      },
    });

    if (!call) {
      return {
        providerCallId,
        status: 'FAILED',
        duration: 0,
      };
    }

    return {
      providerCallId: call.providerCallId || call.id,
      status: call.status,
      duration: call.duration || 0,
      transcript: call.transcript || undefined,
      parentResponse: call.parentResponse || undefined,
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    const call = await prisma.call.findFirst({
      where: { OR: [{ providerCallId }, { id: providerCallId }] },
    });

    if (call) {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      return true;
    }
    return false;
  }

  async validateWebhook(request: Request): Promise<boolean> {
    const token = request.headers.get('x-gateway-token');
    return Boolean(token);
  }
}
