import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

// GET /api/students - Fetch students belonging strictly to logged-in teacher
export async function GET(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const course = searchParams.get('course') || '';
    const year = searchParams.get('year') || '';
    const section = searchParams.get('section') || '';

    const whereClause: any = {
      teacherId: session.teacherId, // STRICT DATA ISOLATION
    };

    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { rollNumber: { contains: query } },
        { parentName: { contains: query } },
        { parentPhone: { contains: query } },
      ];
    }

    if (course && course !== 'ALL') whereClause.course = course;
    if (year && year !== 'ALL') whereClause.year = year;
    if (section && section !== 'ALL') whereClause.section = section;

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: { rollNumber: 'asc' },
    });

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ error: 'Failed to fetch student records' }, { status: 500 });
  }
}

// POST /api/students - Add student for logged-in teacher
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, rollNumber, course, year, section, parentName, parentPhone } = body;

    if (!name || !rollNumber || !course || !year || !section || !parentName || !parentPhone) {
      return NextResponse.json(
        { error: 'All student fields are required' },
        { status: 400 }
      );
    }

    // Check for duplicate roll number under this teacher
    const existingStudent = await prisma.student.findFirst({
      where: {
        teacherId: session.teacherId,
        rollNumber: rollNumber.trim().toUpperCase(),
      },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: `Student with Roll Number '${rollNumber}' already exists in your account.` },
        { status: 409 }
      );
    }

    const student = await prisma.student.create({
      data: {
        teacherId: session.teacherId,
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        course: course.trim(),
        year: year.trim(),
        section: section.trim().toUpperCase(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error('Add student error:', error);
    return NextResponse.json({ error: 'Failed to add student record' }, { status: 500 });
  }
}
