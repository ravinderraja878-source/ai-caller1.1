import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/gateway/register - Secure Android Device Registration & Pairing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, email, deviceName, phoneNumber } = body;

    if (!teacherId && !email) {
      return NextResponse.json({ error: 'teacherId or email is required' }, { status: 400 });
    }

    // Find teacher by ID or Email
    const teacher = await prisma.teacher.findFirst({
      where: teacherId ? { id: teacherId } : { email },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher account not found' }, { status: 404 });
    }

    // If teacher provided a SIM phone number during registration, update teacher's phone number as well
    if (phoneNumber) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { phone: phoneNumber, isVerified: true },
      });
    }

    // Generate unique device ID and secure token
    const generatedDeviceId = `sim_device_${crypto.randomBytes(6).toString('hex')}`;
    const generatedToken = `tok_${crypto.randomBytes(16).toString('hex')}`;

    // Create or update SIM Gateway Device record
    const device = await prisma.simGatewayDevice.create({
      data: {
        deviceId: generatedDeviceId,
        deviceToken: generatedToken,
        deviceName: deviceName || 'Android SIM Phone',
        teacherId: teacher.id,
        phoneNumber: phoneNumber || teacher.phone || null,
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

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
