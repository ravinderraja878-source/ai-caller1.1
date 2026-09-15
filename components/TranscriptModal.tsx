'use client';

import React from 'react';
import { X, FileText, PhoneCall, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface CallRecordDetail {
  id: string;
  student: {
    name: string;
    rollNumber: string;
    course: string;
    year: string;
    section: string;
    parentName: string;
    parentPhone: string;
  };
  parentPhone: string;
  status: string;
  duration: number;
  transcript?: string | null;
  parentResponse?: string | null;
  createdAt: string;
}

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: CallRecordDetail | null;
}

export function TranscriptModal({ isOpen, onClose, call }: TranscriptModalProps) {
  if (!isOpen || !call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">AI Call Transcript & Log</h3>
              <p className="text-xs text-slate-500 font-medium">Record ID: {call.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="py-5 space-y-4 overflow-y-auto flex-1">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</p>
              <p className="font-bold text-slate-800 text-sm">{call.student.name}</p>
              <p className="text-xs text-slate-500 font-mono">{call.student.rollNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent</p>
              <p className="font-bold text-slate-800 text-sm">{call.student.parentName}</p>
              <p className="text-xs text-indigo-600 font-mono">{call.parentPhone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class</p>
              <p className="font-bold text-slate-800 text-sm">
                {call.student.course} ({call.student.section})
              </p>
              <p className="text-xs text-slate-500">{call.student.year}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call Status</p>
              <div className="mt-1">
                <StatusBadge status={call.status} type="call" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> {call.duration} sec
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call Time</p>
              <p className="font-medium text-slate-700 text-xs mt-1">
                {new Date(call.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Extracted Parent Response Banner */}
          {call.parentResponse && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Extracted Reason for Absence
              </span>
              <p className="text-slate-900 font-semibold text-sm">{call.parentResponse}</p>
            </div>
          )}

          {/* Telugu Conversation Transcript Log */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Full Telugu Conversation Transcript
            </h4>
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 font-sans text-xs leading-relaxed space-y-2 max-h-64 overflow-y-auto">
              {call.transcript ? (
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-200">
                  {call.transcript}
                </pre>
              ) : (
                <p className="text-slate-500 italic">No transcript recorded for this call.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
