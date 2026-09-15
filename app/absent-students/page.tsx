'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { CallConfirmationModal } from '@/components/CallConfirmationModal';
import { LiveVoiceCallWidget } from '@/components/LiveVoiceCallWidget';
import {
  UserX,
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

export default function AbsentStudentsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'mock' | 'production'>('mock');

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Calling state
  const [bulkCalling, setBulkCalling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Single Call Modal & Simulator
  const [selectedStudentForCall, setSelectedStudentForCall] = useState<any | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [callInitiating, setCallInitiating] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const fetchAbsentStudents = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setTeacher(meData.teacher);
        setVoiceMode(meData.voiceMode);
      }

      const res = await fetch(`/api/attendance/absent?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setAbsentStudents(data.absentStudents || []);
      }
    } catch (err) {
      console.error('Error fetching absent students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsentStudents();
  }, [date]);

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
      if (!res.ok) throw new Error(data.error || 'Failed to initiate call');

      setConfirmModalOpen(false);
      if (data.call?.id) {
        setActiveCallId(data.call.id);
      }

      fetchAbsentStudents();
    } catch (err: any) {
      alert(`Call initiation error: ${err.message}`);
    } finally {
      setCallInitiating(false);
    }
  };

  // Section 28: Bulk Queue All Absent Parent Calls
  const handleBulkCallAll = async () => {
    if (absentStudents.length === 0) return;
    if (!confirm(`Queue sequential AI Telugu calls for all ${absentStudents.length} absent students?`)) return;

    try {
      setBulkCalling(true);
      const attendanceIds = absentStudents.map((a) => a.attendanceId);
      setBulkProgress({ current: 0, total: attendanceIds.length });

      const res = await fetch('/api/calls/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceIds, date }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed bulk initiation');

      setBulkProgress({ current: data.count, total: attendanceIds.length });
      setTimeout(() => {
        setBulkCalling(false);
        setBulkProgress(null);
        fetchAbsentStudents();
      }, 2000);
    } catch (err: any) {
      alert(`Bulk call error: ${err.message}`);
      setBulkCalling(false);
      setBulkProgress(null);
    }
  };

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
                <UserX className="h-7 w-7 text-rose-600" /> Today's Absent Student Hub
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Initiate one-click or bulk sequential AI voice calls to collect parent absence reasons.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 shadow-sm"
                />
              </div>

              {absentStudents.length > 0 && (
                <button
                  onClick={handleBulkCallAll}
                  disabled={bulkCalling}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <PhoneForwarded className="h-4 w-4" />
                  <span>Call All Parents ({absentStudents.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Bulk Progress Bar Indicator */}
          {bulkProgress && (
            <div className="p-4 rounded-2xl bg-indigo-900 text-white border border-indigo-700 shadow-lg space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" /> Bulk Queueing AI Calls in Progress...
                </span>
                <span className="font-mono text-indigo-300">
                  {bulkProgress.current} / {bulkProgress.total} calls queued
                </span>
              </div>
              <div className="w-full h-2.5 bg-indigo-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Absent Students Cards / List */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            {absentStudents.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base">No Absent Students Recorded for {date}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  All students are marked present or attendance has not been saved for this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {absentStudents.map((item) => (
                  <div
                    key={item.attendanceId}
                    className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-4 shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-mono text-xs font-bold">
                          {item.student.rollNumber}
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg mt-1">{item.student.name}</h3>
                        <p className="text-xs font-medium text-slate-500">
                          {item.student.course} ({item.student.section}) - {item.student.year}
                        </p>
                      </div>

                      {item.latestCall ? (
                        <StatusBadge status={item.latestCall.status} type="call" />
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                          Not Called
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-semibold">Parent Name:</span>
                        <span className="font-bold text-slate-800">{item.student.parentName}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="font-semibold">Phone Number:</span>
                        <span className="font-mono font-bold text-indigo-600">{item.student.parentPhone}</span>
                      </div>
                    </div>

                    {item.latestCall?.parentResponse ? (
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                        <span className="font-bold block text-emerald-900 mb-0.5">💬 Parent Response:</span>
                        <p className="font-medium text-slate-800">{item.latestCall.parentResponse}</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-500 text-xs italic">
                        No absence reason logged yet.
                      </div>
                    )}

                    <button
                      onClick={() => handleStartCallClick(item)}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <PhoneCall className="h-4 w-4" />
                      <span>📞 Call Parent with AI</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CallConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmCall}
        student={selectedStudentForCall}
        teacherPhone={teacher?.phone}
        voiceMode={voiceMode}
        loading={callInitiating}
      />

      <LiveVoiceCallWidget
        callId={activeCallId}
        studentName={selectedStudentForCall?.studentName || 'Student'}
        parentName={selectedStudentForCall?.parentName || 'Parent'}
        parentPhone={selectedStudentForCall?.parentPhone || ''}
        collegeName={teacher?.collegeName || 'Malla Reddy University'}
        onClose={() => setActiveCallId(null)}
        onCompleted={fetchAbsentStudents}
      />
    </div>
  );
}
