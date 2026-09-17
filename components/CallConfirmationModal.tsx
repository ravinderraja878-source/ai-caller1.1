'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, X, User, AlertCircle, Calendar, Phone, Smartphone, Sparkles } from 'lucide-react';

interface StudentCallDetails {
  studentId: string;
  studentName: string;
  rollNumber: string;
  parentName: string;
  parentPhone: string;
  attendanceId?: string;
  attendanceDate?: string;
}

interface CallConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  student: StudentCallDetails | null;
  teacherPhone?: string | null;
  voiceMode?: 'mock' | 'production' | 'personal_sim';
  loading?: boolean;
}

export function CallConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  student,
  teacherPhone,
  voiceMode = 'personal_sim',
  loading = false,
}: CallConfirmationModalProps) {
  const [gatewayStatus, setGatewayStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [checkingGateway, setCheckingGateway] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkGatewayStatus();
    }
  }, [isOpen]);

  const checkGatewayStatus = async () => {
    try {
      setCheckingGateway(true);
      const res = await fetch('/api/settings/voice');
      const data = await res.json();
      if (res.ok) {
        setGatewayStatus(data.gatewayConnected ? 'ONLINE' : 'OFFLINE');
      }
    } catch (err) {
      console.error('Failed to check gateway status:', err);
    } finally {
      setCheckingGateway(false);
    }
  };

  if (!isOpen || !student) return null;

  const isLiveSIM = voiceMode === 'production' || voiceMode === 'personal_sim';
  const isGatewayOffline = isLiveSIM && gatewayStatus === 'OFFLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${isLiveSIM ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                {isLiveSIM ? 'Confirm Personal SIM Call' : 'Confirm AI Voice Call'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isLiveSIM ? 'Cellular Call via Android Gateway' : 'Telugu AI Sandbox Call'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student</p>
                <h4 className="font-bold text-slate-900 text-base">{student.studentName}</h4>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                {student.rollNumber}
              </span>
            </div>

            {/* Parent vs Personal SIM details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-500" /> Parent
                </p>
                <p className="text-sm font-bold text-indigo-600 font-mono mt-0.5">{student.parentPhone}</p>
                <p className="text-[10px] text-slate-500 font-medium">{student.parentName}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" /> Calling From
                </p>
                <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                  {teacherPhone || '+91XXXXXXXXXX'}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">My Personal SIM</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-500" /> Date: {student.attendanceDate || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[11px]">
                Status: Absent
              </span>
            </div>
          </div>

          {/* SIM Gateway Connection Status */}
          {isLiveSIM && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between font-semibold ${gatewayStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 shrink-0" />
                <span>SIM Gateway Status:</span>
              </div>
              <span className="font-bold flex items-center gap-1">
                {gatewayStatus === 'ONLINE' ? '🟢 Connected' : '🔴 Offline'}
              </span>
            </div>
          )}

          {/* Warning notice if device is offline */}
          {isGatewayOffline && (
            <div className="p-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Your SIM phone is offline. Connect the Android SIM Gateway before making a call.
              </p>
            </div>
          )}

          {!isLiveSIM && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <p>Currently in <strong>DEMO MODE</strong> simulation. To make real cellular SIM calls, switch to Live SIM in Settings.</p>
            </div>
          )}
          {/* Direct Native Cellular Calling option */}
          <div className="pt-1">
            <a
              href={`tel:${student.parentPhone}`}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Phone className="h-4 w-4 text-emerald-400" />
              <span>📱 Open Phone Dialer Directly ({student.parentPhone})</span>
            </a>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Dispatching Call...</span>
              </>
            ) : (
              <>
                <PhoneCall className="h-4 w-4" />
                <span>Start Real AI Call</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
