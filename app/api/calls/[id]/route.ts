import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getVoiceProvider } from '@/lib/voice/VoiceService';

// GET /api/calls/[id] - Fetch call details and sync latest call status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const call = await prisma.call.findFirst({
      where: { id, teacherId: session.teacherId },
      include: {
        student: true,
        attendance: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call record not found or access denied' }, { status: 404 });
    }

    // Sync status with voice provider if providerCallId exists
    if (call.providerCallId && call.status !== 'Completed' && call.status !== 'Failed' && call.status !== 'No Answer') {
      const voiceProvider = getVoiceProvider();
      const latestStatus = await voiceProvider.getCallStatus(call.providerCallId);

      const updateData: any = {
        status: latestStatus.status,
        duration: latestStatus.duration || call.duration,
      };

      if (latestStatus.transcript) {
        updateData.transcript = latestStatus.transcript;
      }
      if (latestStatus.parentResponse) {
        updateData.parentResponse = latestStatus.parentResponse;
      }
      if (latestStatus.status === 'Completed' && !call.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedCall = await prisma.call.update({
        where: { id },
        data: updateData,
        include: {
          student: true,
          attendance: true,
        },
      });

      return NextResponse.json({ success: true, call: updatedCall });
    }

    return NextResponse.json({ success: true, call });
  } catch (error: any) {
    console.error('Fetch call detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch call detail' }, { status: 500 });
  }
}
