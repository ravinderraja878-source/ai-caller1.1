import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth/jwt';
import { COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, collegeName } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const existingTeacher = await prisma.teacher.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingTeacher) {
      return NextResponse.json(
        { error: 'A teacher account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        collegeName: collegeName || process.env.COLLEGE_NAME || 'Engineering College',
      },
    });

    const token = signToken({
      teacherId: teacher.id,
      email: teacher.email,
      name: teacher.name,
      collegeName: teacher.collegeName,
    });

    const response = NextResponse.json({
      success: true,
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
      { error: 'Failed to create teacher account. Please try again.' },
      { status: 500 }
    );
  }
}
