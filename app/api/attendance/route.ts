import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

// GET /api/attendance - Retrieve student attendance list for a date & class
export async function GET(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const course = searchParams.get('course') || '';
    const year = searchParams.get('year') || '';
    const section = searchParams.get('section') || '';

    const studentWhere: any = {
      teacherId: session.teacherId,
    };

    if (course && course !== 'ALL') studentWhere.course = course;
    if (year && year !== 'ALL') studentWhere.year = year;
    if (section && section !== 'ALL') studentWhere.section = section;

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: { rollNumber: 'asc' },
    });

    const studentIds = students.map((s) => s.id);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        teacherId: session.teacherId,
        date,
        studentId: { in: studentIds },
      },
    });

    const attendanceMap = new Map(attendanceRecords.map((a) => [a.studentId, a]));

    const result = students.map((student) => {
      const record = attendanceMap.get(student.id);
      return {
        student,
        status: record ? record.status : 'Present', // Default to Present if unset
        attendanceId: record?.id || null,
        date,
      };
    });

    return NextResponse.json({ success: true, date, attendance: result });
  } catch (error: any) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendance' }, { status: 500 });
  }
}

// POST /api/attendance - Batch save attendance for students
export async function POST(request: Request) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, records } = body as {
      date: string;
      records: Array<{ studentId: string; status: 'Present' | 'Absent' }>;
    };

    if (!date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Date and non-empty records array are required' },
        { status: 400 }
      );
    }

    // Verify all student IDs belong to this teacher
    const studentIds = records.map((r) => r.studentId);
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        teacherId: session.teacherId,
      },
      select: { id: true },
    });

    const validStudentSet = new Set(validStudents.map((s) => s.id));
    const authorizedRecords = records.filter((r) => validStudentSet.has(r.studentId));

    // Batch upsert attendance entries
    const upsertPromises = authorizedRecords.map((record) => {
      return prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date,
          },
        },
        update: {
          status: record.status,
        },
        create: {
          studentId: record.studentId,
          teacherId: session.teacherId,
          date,
          status: record.status,
        },
      });
    });

    await Promise.all(upsertPromises);

    const absentStudentsCount = authorizedRecords.filter((r) => r.status === 'Absent').length;

    return NextResponse.json({
      success: true,
      message: `Attendance saved for ${authorizedRecords.length} students.`,
      absentCount: absentStudentsCount,
      date,
    });
  } catch (error: any) {
    console.error('Save attendance error:', error);
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
  }
}
