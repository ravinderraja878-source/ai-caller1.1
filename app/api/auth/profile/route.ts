import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/telephony/phoneValidation';

// PUT /api/auth/profile - Update teacher profile & verified caller phone number
export async function PUT(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, collegeName, phone } = body;

    let normalizedPhone = null;
    if (phone) {
      normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'Invalid teacher phone number format. Must be E.164 format (e.g. +919876543210).' }, { status: 400 });
      }
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id: session.teacherId },
      data: {
        name: name ? name.trim() : undefined,
        collegeName: collegeName ? collegeName.trim() : undefined,
        phone: normalizedPhone || undefined,
        isVerified: !!normalizedPhone,
      },
    });

    return NextResponse.json({
      success: true,
      teacher: {
        id: updatedTeacher.id,
        name: updatedTeacher.name,
        email: updatedTeacher.email,
        collegeName: updatedTeacher.collegeName,
        phone: updatedTeacher.phone,
        isVerified: updatedTeacher.isVerified,
      },
    });
  } catch (error: any) {
    console.error('Update teacher profile error:', error);
    return NextResponse.json({ error: 'Failed to update teacher profile' }, { status: 500 });
  }
}
