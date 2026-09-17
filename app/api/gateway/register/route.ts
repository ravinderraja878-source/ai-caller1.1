import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/gateway/register - Secure Android Device Registration & Pairing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, email, deviceName, phoneNumber, simNumber, deviceId: incomingDeviceId, deviceModel } = body;
    const phone = phoneNumber || simNumber;

    let teacher = null;

    if (teacherId) {
      teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });
    }

    if (!teacher && email) {
      teacher = await prisma.teacher.findUnique({
        where: { email },
      });
    }

    // Fallback: If teacher ID not found, but exactly 1 teacher exists in DB, auto-pair with that teacher
    if (!teacher) {
      const allTeachers = await prisma.teacher.findMany({ take: 2 });
      if (allTeachers.length === 1) {
        teacher = allTeachers[0];
      }
    }

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher account not found. Please log into dashboard profile settings to view your correct Teacher ID.' },
        { status: 404 }
      );
    }

    // Update teacher's verified phone number if provided
    if (phone) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { phone: phone, isVerified: true },
      });
    }

    const deviceIdToUse = incomingDeviceId || `sim_device_${crypto.randomBytes(6).toString('hex')}`;
    const generatedToken = `tok_${crypto.randomBytes(16).toString('hex')}`;
    const nameToUse = deviceName || deviceModel || 'Android SIM Phone';

    // Check if device already exists for this deviceId or teacherId
    const existingDevice = await prisma.simGatewayDevice.findFirst({
      where: {
        OR: [
          { deviceId: deviceIdToUse },
          { teacherId: teacher.id }
        ]
      }
    });

    let device;
    if (existingDevice) {
      device = await prisma.simGatewayDevice.update({
        where: { id: existingDevice.id },
        data: {
          deviceId: deviceIdToUse,
          deviceToken: generatedToken,
          deviceName: nameToUse,
          phoneNumber: phone || existingDevice.phoneNumber || teacher.phone || null,
          status: 'ONLINE',
          lastSeen: new Date(),
        },
      });
    } else {
      device = await prisma.simGatewayDevice.create({
        data: {
          deviceId: deviceIdToUse,
          deviceToken: generatedToken,
          deviceName: nameToUse,
          teacherId: teacher.id,
          phoneNumber: phone || teacher.phone || null,
          status: 'ONLINE',
          lastSeen: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Android SIM Gateway registered successfully',
      deviceId: device.deviceId,
      deviceToken: device.deviceToken,
      deviceName: device.deviceName,
      phoneNumber: device.phoneNumber,
      teacherId: teacher.id,
      teacherName: teacher.name,
    });
  } catch (error: any) {
    console.error('Error registering gateway device:', error);
    return NextResponse.json({ error: error?.message || 'Failed to register gateway device' }, { status: 500 });
  }
}

