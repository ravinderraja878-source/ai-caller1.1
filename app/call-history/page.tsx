'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { TranscriptModal } from '@/components/TranscriptModal';
import { CallConfirmationModal } from '@/components/CallConfirmationModal';
import { LiveVoiceCallWidget } from '@/components/LiveVoiceCallWidget';
import {
  PhoneCall,
  FileText,
  Clock,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  PhoneOff,
} from 'lucide-react';

export default function CallHistoryPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'mock' | 'production'>('mock');
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCallForTranscript, setSelectedCallForTranscript] = useState<any | null>(null);

  // Retry call modal & widget
  const [selectedStudentForCall, setSelectedStudentForCall] = useState<any | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [callInitiating, setCallInitiating] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setTeacher(meData.teacher);
        setVoiceMode(meData.voiceMode);
      }

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/calls?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCalls(data.calls || []);
      }
    } catch (err) {
      console.error('Error loading call history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallHistory();
  }, [statusFilter]);

  const handleRetryCall = (callItem: any) => {
    setSelectedStudentForCall({
      studentId: callItem.student.id,
      studentName: callItem.student.name,
      rollNumber: callItem.student.rollNumber,
      parentName: callItem.student.parentName,
      parentPhone: callItem.student.parentPhone,
      attendanceId: callItem.attendanceId,
      attendanceDate: callItem.attendance?.date || new Date().toISOString().split('T')[0],
    });
    setConfirmModalOpen(true);
  };

  const handleConfirmRetryCall = async () => {
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
      if (!res.ok) throw new Error(data.error || 'Retry call initiation failed');

      setConfirmModalOpen(false);
      if (data.call?.id) {
        setActiveCallId(data.call.id);
      }

      fetchCallHistory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCallInitiating(false);
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
                <PhoneCall className="h-7 w-7 text-indigo-600" /> AI Call History & Parent Responses
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                View previous outbound AI voice call logs, extracted parent explanations, and conversation transcripts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 shadow-sm"
              >
                <option value="ALL">All Call Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Initiating">Initiating / Ringing</option>
                <option value="No Answer">No Answer / Busy</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Call History Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            {calls.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <PhoneOff className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Call Records Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Outbound AI voice calls launched from the absent student hub will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Student & Parent</th>
                      <th className="pb-3 px-4">Calling Method</th>
                      <th className="pb-3 px-4">Phone Numbers</th>
                      <th className="pb-3 px-4">Date & Time</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Duration</th>
                      <th className="pb-3 px-4">Extracted Response</th>
                      <th className="pb-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {calls.map((callItem) => (
                      <tr key={callItem.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900">{callItem.student.name}</p>
                          <p className="text-xs text-slate-500">Parent: {callItem.student.parentName}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${callItem.callingMethod === 'PERSONAL_SIM' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {callItem.callingMethod === 'PERSONAL_SIM' ? '📱 Personal SIM' : '🧪 Demo Mode'}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{callItem.device?.deviceName || 'Android Gateway'}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-mono">
                          <p className="font-bold text-indigo-600">Parent: {callItem.parentPhone}</p>
                          <p className="text-slate-500 text-[11px]">From: {callItem.teacherPhone || teacher?.phone || '+91XXXXXXXXXX'}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-slate-700">
                          {new Date(callItem.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={callItem.status} type="call" />
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600">
                          {callItem.duration}s
                        </td>
                        <td className="py-4 px-4">
                          {callItem.parentResponse ? (
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 block max-w-xs truncate">
                              {callItem.parentResponse}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No response logged</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedCallForTranscript(callItem)}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-xs font-bold inline-flex items-center gap-1"
                            title="View Call Transcript"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Transcript</span>
                          </button>

                          {(callItem.status === 'No Answer' || callItem.status === 'Failed' || callItem.status === 'Busy' || callItem.status === 'NO_ANSWER') && (
                            <button
                              onClick={() => handleRetryCall(callItem)}
                              className="p-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-xs font-bold inline-flex items-center gap-1"
                              title="Retry Call"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span className="hidden sm:inline">Retry</span>
                            </button>
                          )}
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

      <TranscriptModal
        isOpen={!!selectedCallForTranscript}
        onClose={() => setSelectedCallForTranscript(null)}
        call={selectedCallForTranscript}
      />

      <CallConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmRetryCall}
        student={selectedStudentForCall}
        loading={callInitiating}
      />

      <LiveVoiceCallWidget
        callId={activeCallId}
        studentName={selectedStudentForCall?.studentName || 'Student'}
        parentName={selectedStudentForCall?.parentName || 'Parent'}
        parentPhone={selectedStudentForCall?.parentPhone || ''}
        collegeName={teacher?.collegeName || 'Malla Reddy University'}
        onClose={() => setActiveCallId(null)}
        onCompleted={fetchCallHistory}
      />
    </div>
  );
}
