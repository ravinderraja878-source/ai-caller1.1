import { NextResponse } from 'next/server';
import { prisma, ensureDbInitialized } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify if teacher account exists
    const teacher = await prisma.teacher.findUnique({
      where: { email: normalizedEmail },
    });

    if (!teacher) {
      // Return a generic security-conscious success response even if email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset link sent to ${teacher.email}. Please check your inbox or spam folder.`,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request. Please try again.' },
      { status: 500 }
    );
  }
}
