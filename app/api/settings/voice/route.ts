import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// POST /api/settings/voice - Save Personal SIM Calling settings
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { voiceMode, teacherPhone } = body;

    // Update .env file dynamically if voiceMode is updated
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateOrAddEnvKey = (content: string, key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${value}"`);
      }
      return `${content}\n${key}="${value}"`;
    };

    const targetMode = voiceMode === 'production' || voiceMode === 'personal_sim' ? 'personal_sim' : 'mock';

    process.env.VOICE_MODE = targetMode;
    envContent = updateOrAddEnvKey(envContent, 'VOICE_MODE', targetMode);
    fs.writeFileSync(envPath, envContent, 'utf8');

    if (teacherPhone) {
      await prisma.teacher.update({
        where: { id: session.teacherId },
        data: { phone: teacherPhone, isVerified: true },
      });
    }

    // Get current connected gateway device if any
    const connectedDevice = await prisma.simGatewayDevice.findFirst({
      where: { teacherId: session.teacherId, status: 'ONLINE' },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      message: targetMode === 'personal_sim'
        ? 'Live Personal SIM Calling Mode activated!'
        : 'Switched to DEMO Mode.',
      voiceMode: targetMode,
      gatewayConnected: Boolean(connectedDevice),
      connectedDevice: connectedDevice ? {
        deviceName: connectedDevice.deviceName,
        phoneNumber: connectedDevice.phoneNumber,
        lastSeen: connectedDevice.lastSeen,
      } : null,
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update calling settings' }, { status: 500 });
  }
}

// GET /api/settings/voice - Fetch current SIM Calling & Gateway Status
export async function GET() {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: session.teacherId },
      include: {
        devices: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const activeDevice = teacher.devices.find((d) => d.status === 'ONLINE') || teacher.devices[0] || null;
    const isOnline = activeDevice ? activeDevice.status === 'ONLINE' && (new Date().getTime() - new Date(activeDevice.lastSeen).getTime()) < 120000 : false;

    const voiceMode = (process.env.VOICE_MODE || 'personal_sim').toLowerCase();

    return NextResponse.json({
      voiceMode: voiceMode === 'mock' ? 'mock' : 'personal_sim',
      teacherPhone: teacher.phone || '+91',
      gatewayConnected: isOnline,
      device: activeDevice ? {
        id: activeDevice.id,
        deviceId: activeDevice.deviceId,
        deviceName: activeDevice.deviceName,
        phoneNumber: activeDevice.phoneNumber || teacher.phone,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: activeDevice.lastSeen,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching voice settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
