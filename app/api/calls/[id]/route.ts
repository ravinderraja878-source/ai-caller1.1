import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getTelephonyProvider } from '@/lib/telephony/TelephonyService';

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
        device: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call record not found or access denied' }, { status: 404 });
    }

    const upperStatus = call.status ? call.status.toUpperCase() : '';
    const isTerminal = ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(upperStatus);

    // Sync status with telephony provider if not terminal
    if (!isTerminal) {
      const telephonyProvider = getTelephonyProvider();
      const latestStatus = await telephonyProvider.getCallStatus(call.providerCallId || call.id);

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
      if ((latestStatus.status === 'COMPLETED' || latestStatus.status === 'Completed') && !call.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedCall = await prisma.call.update({
        where: { id },
        data: updateData,
        include: {
          student: true,
          attendance: true,
          device: true,
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
