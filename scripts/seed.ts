import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Telugu AI Attendance Caller...');

  // Clean existing records
  await prisma.call.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Teacher A (Primary Demo Account)
  const teacherA = await prisma.teacher.create({
    data: {
      name: 'Dr. K. Srimannarayana',
      email: 'teacher@mallareddy.edu',
      passwordHash,
      collegeName: 'Malla Reddy University',
    },
  });

  // 2. Create Teacher B (For Tenant Isolation Testing)
  const teacherB = await prisma.teacher.create({
    data: {
      name: 'Prof. P. Lakshmi',
      email: 'teacherb@mallareddy.edu',
      passwordHash,
      collegeName: 'Malla Reddy University',
    },
  });

  console.log(`✅ Created Teachers:\n - ${teacherA.name} (${teacherA.email})\n - ${teacherB.name} (${teacherB.email})`);

  // 3. Add Students for Teacher A
  const teacherAStudentsData = [
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
      name: 'Suresh Kumar',
      rollNumber: '23CSE103',
      course: 'B.Tech CSE',
      year: '2nd Year',
      section: 'A',
      parentName: 'Narayana Swamy',
      parentPhone: '+919876543212',
    },
    {
      name: 'Divya Sri',
      rollNumber: '23CSE104',
      course: 'B.Tech CSE',
      year: '2nd Year',
      section: 'A',
      parentName: 'Satyanarayana',
      parentPhone: '+919876543213',
    },
    {
      name: 'Mahesh Babu',
      rollNumber: '23CSE105',
      course: 'B.Tech CSE',
      year: '2nd Year',
      section: 'A',
      parentName: 'Krishna Murthy',
      parentPhone: '+919876543214',
    },
    {
      name: 'Harika V',
      rollNumber: '23CSE106',
      course: 'B.Tech CSE',
      year: '2nd Year',
      section: 'B',
      parentName: 'Srinivasa Rao',
      parentPhone: '+919876543215',
    },
    {
      name: 'Sai Teja',
      rollNumber: '23CSE107',
      course: 'B.Tech CSE',
      year: '2nd Year',
      section: 'B',
      parentName: 'Bhaskar Reddy',
      parentPhone: '+919876543216',
    },
    {
      name: 'Bhavani P',
      rollNumber: '23ECE201',
      course: 'B.Tech ECE',
      year: '3rd Year',
      section: 'A',
      parentName: 'Prasad Sharma',
      parentPhone: '+919876543217',
    },
  ];

  const createdStudentsA = [];
  for (const studentData of teacherAStudentsData) {
    const student = await prisma.student.create({
      data: {
        ...studentData,
        teacherId: teacherA.id,
      },
    });
    createdStudentsA.push(student);
  }

  // 4. Add Students for Teacher B (Isolated)
  await prisma.student.create({
    data: {
      name: 'Karthik Raja (Isolated)',
      rollNumber: '23EEE301',
      course: 'B.Tech EEE',
      year: '1st Year',
      section: 'A',
      parentName: 'Subba Rao',
      parentPhone: '+919876543299',
      teacherId: teacherB.id,
    },
  });

  console.log(`✅ Created ${createdStudentsA.length} students for Teacher A and 1 student for Teacher B.`);

  // 5. Create Attendance for Today for Teacher A
  const todayStr = new Date().toISOString().split('T')[0];

  // Mark Anil Kumar and Divya Sri as Absent today
  const attendanceRecords = [];
  for (const student of createdStudentsA) {
    const isAbsent = student.rollNumber === '23CSE102' || student.rollNumber === '23CSE104';
    const att = await prisma.attendance.create({
      data: {
        studentId: student.id,
        teacherId: teacherA.id,
        date: todayStr,
        status: isAbsent ? 'Absent' : 'Present',
      },
    });
    attendanceRecords.push(att);
  }

  // 6. Create sample completed call record for Anil Kumar
  const anilRecord = createdStudentsA.find((s) => s.rollNumber === '23CSE102');
  const anilAttendance = attendanceRecords.find((a) => a.studentId === anilRecord?.id);

  if (anilRecord && anilAttendance) {
    await prisma.call.create({
      data: {
        studentId: anilRecord.id,
        teacherId: teacherA.id,
        attendanceId: anilAttendance.id,
        parentPhone: anilRecord.parentPhone,
        providerCallId: 'MOCK-SAMPLE-101',
        status: 'Completed',
        duration: 22,
        transcript: `[AI]: నమస్కారం. నేను కాలేజీ నుంచి మాట్లాడుతున్నాను. ఇది Anil Kumar గారి తల్లిదండ్రులతో మాట్లాడుతున్న కాల్ కదా?\n[PARENT]: అవునండి, నేను Venkat Rao ని మాట్లాడ్తున్నాను.\n[AI]: Anil Kumar గారు ఈ రోజు కాలేజీకి హాజరు కాలేదు. కారణం ఏమిటో చెప్పగలరా?\n[PARENT]: ఆయనకు జ్వరం వచ్చింది, డాక్టర్ దగ్గరకు తీసుకువెళ్లాము.\n[AI]: సరే, అర్థమైంది. Anil Kumar గారికి జ్వరం వచ్చిందని నమోదు చేస్తున్నాము. సమాచారం ఇచ్చినందుకు ధన్యవాదాలు.`,
        parentResponse: 'Student had fever (జ్వరం వచ్చింది)',
        completedAt: new Date(),
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('🔑 Credentials to log in:');
  console.log('   Email: teacher@mallareddy.edu');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
