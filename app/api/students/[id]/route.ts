import { NextResponse } from 'next/server';
import { getTeacherSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

// PUT /api/students/[id] - Edit student record
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, rollNumber, course, year, section, parentName, parentPhone } = body;

    // Verify ownership
    const existing = await prisma.student.findFirst({
      where: { id, teacherId: session.teacherId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Student record not found or access denied' },
        { status: 404 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        rollNumber: rollNumber ? rollNumber.trim().toUpperCase() : existing.rollNumber,
        course: course ? course.trim() : existing.course,
        year: year ? year.trim() : existing.year,
        section: section ? section.trim().toUpperCase() : existing.section,
        parentName: parentName ? parentName.trim() : existing.parentName,
        parentPhone: parentPhone ? parentPhone.trim() : existing.parentPhone,
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

// DELETE /api/students/[id] - Remove student record
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getTeacherSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify ownership
    const existing = await prisma.student.findFirst({
      where: { id, teacherId: session.teacherId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Student record not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
