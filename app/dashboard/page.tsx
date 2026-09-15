'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CallConfirmationModal } from '@/components/CallConfirmationModal';
import { LiveVoiceCallWidget } from '@/components/LiveVoiceCallWidget';
import {
  Users,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Clock,
  MessageSquare,
  PhoneForwarded,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'mock' | 'production'>('mock');
  const [loading, setLoading] = useState(true);

  // Metrics
  const [totalStudents, setTotalStudents] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [callsCompleted, setCallsCompleted] = useState(0);
  const [callsPending, setCallsPending] = useState(0);
  const [parentResponsesCount, setParentResponsesCount] = useState(0);

  // Lists
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  // Call modal & simulation widget
  const [selectedStudentForCall, setSelectedStudentForCall] = useState<any | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [callInitiating, setCallInitiating] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch Session info
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setTeacher(meData.teacher);
        setVoiceMode(meData.voiceMode || 'mock');
      }

      // Fetch Students
      const studRes = await fetch('/api/students');
      const studData = await studRes.json();
      if (studData.success) {
        setTotalStudents(studData.students.length);
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch Today's Attendance
      const attRes = await fetch(`/api/attendance?date=${todayStr}`);
      const attData = await attRes.json();

      if (attData.success && Array.isArray(attData.attendance)) {
        const present = attData.attendance.filter((a: any) => a.status === 'Present').length;
        const absent = attData.attendance.filter((a: any) => a.status === 'Absent').length;
        setPresentToday(present);
        setAbsentToday(absent);
      }

      // Fetch Absent Students with call statuses
      const absRes = await fetch(`/api/attendance/absent?date=${todayStr}`);
      const absData = await absRes.json();
      if (absData.success) {
        setAbsentStudents(absData.absentStudents || []);
      }

      // Fetch Call History
      const callRes = await fetch('/api/calls?limit=20');
      const callData = await callRes.json();
      if (callData.success && Array.isArray(callData.calls)) {
        setRecentCalls(callData.calls);

        const completed = callData.calls.filter((c: any) => c.status === 'Completed').length;
        const pending = callData.calls.filter(
          (c: any) => c.status === 'Initiating' || c.status === 'Ringing' || c.status === 'Connected'
        ).length;
        const responses = callData.calls.filter((c: any) => c.parentResponse).length;

        setCallsCompleted(completed);
        setCallsPending(pending);
        setParentResponsesCount(responses);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStartCallClick = (item: any) => {
    setSelectedStudentForCall({
      studentId: item.student.id,
      studentName: item.student.name,
      rollNumber: item.student.rollNumber,
      parentName: item.student.parentName,
      parentPhone: item.student.parentPhone,
      attendanceId: item.attendanceId,
      attendanceDate: item.date,
    });
    setConfirmModalOpen(true);
  };

  const handleConfirmCall = async () => {
    if (!selectedStudentForCall) return;

    try {
      setCallInitiating(true);
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentForCall.studentId,
          attendanceId: selectedStudentForCall.attendanceId,
          date: selectedStudentForCall.attendanceDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate AI call');
      }

      setConfirmModalOpen(false);
      if (data.call?.id) {
        setActiveCallId(data.call.id);
      }

      fetchDashboardData();
    } catch (err: any) {
      alert(`Call initiation error: ${err.message}`);
    } finally {
      setCallInitiating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} voiceMode={voiceMode} />

      {/* Main Workspace */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Navbar setMobileOpen={setMobileOpen} teacher={teacher} voiceMode={voiceMode} />

        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Faculty Attendance Command Center
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome, {teacher?.name || 'Faculty Member'}
                </h1>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                  Manage student attendance and launch automated Telugu AI voice calls to collect parent absence reasons directly.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchDashboardData}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                  title="Refresh Dashboard"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  href="/attendance"
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/40 flex items-center gap-2 transition-all shrink-0"
                >
                  <span>Mark Attendance</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Section 19: 6 Metric Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Total Students"
              value={totalStudents}
              subtitle="Enrolled class records"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Present Today"
              value={presentToday}
              subtitle="In classroom"
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Absent Today"
              value={absentToday}
              subtitle="Requires follow-up"
              icon={XCircle}
              color="rose"
            />
            <StatCard
              title="Calls Completed"
              value={callsCompleted}
              subtitle="AI calls finished"
              icon={PhoneCall}
              color="blue"
            />
            <StatCard
              title="Calls Pending"
              value={callsPending}
              subtitle="Dialing or ringing"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Parent Responses"
              value={parentResponsesCount}
              subtitle="Absence reasons logged"
              icon={MessageSquare}
              color="purple"
            />
          </div>

          {/* Today's Absent Students Table & One-Click AI Call */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-rose-600" /> Today's Absent Students
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Directly call absent student parents with Telugu AI assistant to record absence explanations.
                </p>
              </div>

              <Link
                href="/absent-students"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View Full Absent Hub <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {absentStudents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Absent Students Today!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  All marked students are present or attendance has not been recorded yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Student Name</th>
                      <th className="pb-3 px-4">Roll Number</th>
                      <th className="pb-3 px-4">Parent Details</th>
                      <th className="pb-3 px-4">Call Status</th>
                      <th className="pb-3 px-4">Parent Response</th>
                      <th className="pb-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {absentStudents.map((item) => (
                      <tr key={item.attendanceId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900">{item.student.name}</td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 font-semibold">
                          {item.student.rollNumber}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800 text-xs">{item.student.parentName}</p>
                          <p className="font-mono text-xs text-indigo-600">{item.student.parentPhone}</p>
                        </td>
                        <td className="py-4 px-4">
                          {item.latestCall ? (
                            <StatusBadge status={item.latestCall.status} type="call" />
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Not Called Yet
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {item.latestCall?.parentResponse ? (
                            <span className="text-xs font-semibold text-slate-800 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200 block max-w-xs truncate">
                              {item.latestCall.parentResponse}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No response logged</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleStartCallClick(item)}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 transition-all"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            <span>📞 Call Parent with AI</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Dialog Modal */}
      <CallConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmCall}
        student={selectedStudentForCall}
        teacherPhone={teacher?.phone}
        voiceMode={voiceMode}
        loading={callInitiating}
      />

      {/* Live Real-Time Telugu AI Voice Call Overlay */}
      <LiveVoiceCallWidget
        callId={activeCallId}
        studentName={selectedStudentForCall?.studentName || 'Student'}
        parentName={selectedStudentForCall?.parentName || 'Parent'}
        parentPhone={selectedStudentForCall?.parentPhone || ''}
        collegeName={teacher?.collegeName || 'Malla Reddy University'}
        onClose={() => setActiveCallId(null)}
        onCompleted={fetchDashboardData}
      />
    </div>
  );
}
