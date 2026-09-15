'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Save,
  PhoneCall,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function AttendancePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'mock' | 'production'>('mock');

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [course, setCourse] = useState<string>('B.Tech CSE');
  const [year, setYear] = useState<string>('2nd Year');
  const [section, setSection] = useState<string>('A');

  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setTeacher(meData.teacher);
        setVoiceMode(meData.voiceMode);
      }

      const params = new URLSearchParams({
        date,
        course,
        year,
        section,
      });

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.attendance)) {
        setAttendanceList(data.attendance);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [date, course, year, section]);

  const toggleStudentStatus = (studentId: string) => {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.student.id === studentId) {
          const nextStatus = item.status === 'Present' ? 'Absent' : 'Present';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setSavedSuccessMsg(null);

      const records = attendanceList.map((item) => ({
        studentId: item.student.id,
        status: item.status,
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance');

      setSavedSuccessMsg(
        `✓ Attendance saved successfully! (${data.absentCount} absent students marked)`
      );
      fetchAttendanceData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const absentCount = attendanceList.filter((a) => a.status === 'Absent').length;
  const presentCount = attendanceList.filter((a) => a.status === 'Present').length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} voiceMode={voiceMode} />

      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Navbar setMobileOpen={setMobileOpen} teacher={teacher} voiceMode={voiceMode} />

        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarCheck className="h-7 w-7 text-indigo-600" /> Attendance Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Select class & date to mark daily attendance. Saving automatically syncs absent list for AI parent calling.
              </p>
            </div>

            <button
              onClick={handleSaveAttendance}
              disabled={saving || attendanceList.length === 0}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Attendance Record</span>
            </button>
          </div>

          {savedSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-semibold flex items-center justify-between">
              <span>{savedSuccessMsg}</span>
              {absentCount > 0 && (
                <Link
                  href="/absent-students"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-500"
                >
                  <PhoneCall className="h-3.5 w-3.5" /> Call Absent Parents <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {/* Filter Controls Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Attendance Date
                </label>
                <div className="relative">
                  <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Course
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="B.Tech CSE">B.Tech CSE</option>
                  <option value="B.Tech ECE">B.Tech ECE</option>
                  <option value="B.Tech EEE">B.Tech EEE</option>
                  <option value="B.Tech MECH">B.Tech MECH</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-6">
              <span>Total Class Students: <strong className="text-slate-900 font-bold">{attendanceList.length}</strong></span>
              <span className="text-emerald-700">Present: <strong>{presentCount}</strong></span>
              <span className="text-rose-700">Absent: <strong>{absentCount}</strong></span>
            </div>
          </div>

          {/* Student Grid / Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            {attendanceList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CalendarCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Students Found for Selection</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try selecting a different course, year, or section.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Student Name</th>
                      <th className="pb-3 px-4">Roll Number</th>
                      <th className="pb-3 px-4">Parent Phone</th>
                      <th className="pb-3 px-4 text-center">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {attendanceList.map((item) => {
                      const isPresent = item.status === 'Present';
                      return (
                        <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900">{item.student.name}</td>
                          <td className="py-4 px-4 font-mono text-xs text-slate-600 font-semibold">
                            {item.student.rollNumber}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-slate-600">
                            {item.student.parentPhone}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                              <button
                                onClick={() => toggleStudentStatus(item.student.id)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Present
                              </button>
                              <button
                                onClick={() => toggleStudentStatus(item.student.id)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                  !isPresent
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
