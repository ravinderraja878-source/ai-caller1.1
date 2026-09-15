import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, ensureDbInitialized } from '@/lib/prisma';
import { signToken } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { name, email, password, collegeName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Faculty name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Faculty email address is required' }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if teacher with email already exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingTeacher) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please Sign In instead.' },
        { status: 409 }
      );
    }

    // Hash password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new Teacher account
    const teacher = await prisma.teacher.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        collegeName: collegeName?.trim() || 'Malla Reddy University',
        isVerified: true,
      },
    });

    // Auto-create sample student class for the new teacher so they have students ready
    const sampleStudents = [
      {
        name: 'Rahul Kumar',
        rollNumber: '23CSE101',
        course: 'B.Tech CSE',
        year: '2nd Year',
        section: 'A',
        parentName: 'Ramesh Kumar',
        parentPhone: '+919876543210',
      },
      {
        name: 'Anil Kumar',
        rollNumber: '23CSE102',
        course: 'B.Tech CSE',
        year: '2nd Year',
        section: 'A',
        parentName: 'Venkat Rao',
        parentPhone: '+919876543211',
      },
      {
        name: 'Divya Sri',
        rollNumber: '23CSE103',
        course: 'B.Tech CSE',
        year: '2nd Year',
        section: 'A',
        parentName: 'Satyanarayana',
        parentPhone: '+919876543212',
      },
      {
        name: 'Mahesh Babu',
        rollNumber: '23CSE104',
        course: 'B.Tech CSE',
        year: '2nd Year',
        section: 'A',
        parentName: 'Krishna Murthy',
        parentPhone: '+919876543213',
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    for (const studentData of sampleStudents) {
      const student = await prisma.student.create({
        data: {
          ...studentData,
          teacherId: teacher.id,
        },
      });

      // Mark Rahul Kumar as Absent today for instant testing
      const isAbsent = student.rollNumber === '23CSE101';
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          teacherId: teacher.id,
          date: todayStr,
          status: isAbsent ? 'Absent' : 'Present',
        },
      });
    }

    // Sign JWT auth token
    const token = signToken({
      teacherId: teacher.id,
      email: teacher.email,
      name: teacher.name,
      collegeName: teacher.collegeName,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        collegeName: teacher.collegeName,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create teacher account. Please try again.' },
      { status: 500 }
    );
  }
}
