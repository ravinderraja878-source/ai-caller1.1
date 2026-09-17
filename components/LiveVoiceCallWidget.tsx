'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, X, Smartphone, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface LiveVoiceCallWidgetProps {
  callId: string | null;
  studentName: string;
  parentName: string;
  parentPhone: string;
  collegeName?: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export function LiveVoiceCallWidget({
  callId,
  studentName,
  parentName,
  parentPhone,
  collegeName = 'College',
  onClose,
  onCompleted,
}: LiveVoiceCallWidgetProps) {
  const [callStatus, setCallStatus] = useState<string>('REQUESTED');
  const [duration, setDuration] = useState<number>(0);
  const [parentResponse, setParentResponse] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('Android SIM Gateway');
  const [polling, setPolling] = useState<boolean>(true);

  // Poll real call status from database / backend
  useEffect(() => {
    if (!callId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/calls/${callId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.call) return;

        const call = data.call;
        setCallStatus(call.status);
        if (call.duration) setDuration(call.duration);
        if (call.parentResponse) setParentResponse(call.parentResponse);
        if (call.transcript) setTranscript(call.transcript);
        if (call.device?.deviceName) setDeviceName(call.device.deviceName);

        if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(call.status)) {
          setPolling(false);
          if (onCompleted) onCompleted();
        }
      } catch (err) {
        console.error('Error polling call status:', err);
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [callId]);

  if (!callId) return null;

  const isTerminalState = ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(callStatus);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-300 space-y-5">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-lg">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-white">{studentName}</h4>
              <span className="text-xs text-emerald-400 font-semibold">(Parent: {parentName})</span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Destination: {parentPhone}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Real Call Status Bar */}
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">{deviceName}</span>
          </div>
          <StatusBadge status={callStatus} type="call" />
        </div>

        {/* Real Device Call Progress Indicator */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold uppercase">
            <span>Cellular Call State</span>
            {duration > 0 && <span>Duration: {duration}s</span>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'REQUESTED' ? 'bg-indigo-400 animate-ping' : 'bg-emerald-500'}`} />
              <span className={callStatus === 'REQUESTED' ? 'font-bold text-indigo-300' : 'text-slate-300'}>
                1. Call Request Sent to Android Gateway
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'DEVICE_RECEIVED' || callStatus === 'DIALING' ? 'bg-indigo-400 animate-ping' : ['RINGING', 'ANSWERED', 'COMPLETED'].includes(callStatus) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={['DEVICE_RECEIVED', 'DIALING'].includes(callStatus) ? 'font-bold text-indigo-300' : 'text-slate-400'}>
                2. Physical SIM Card Dialing Parent
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'RINGING' ? 'bg-amber-400 animate-ping' : ['ANSWERED', 'COMPLETED'].includes(callStatus) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={callStatus === 'RINGING' ? 'font-bold text-amber-300' : 'text-slate-400'}>
                3. Parent Cellular Phone Ringing
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'ANSWERED' ? 'bg-emerald-400 animate-pulse' : callStatus === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={callStatus === 'ANSWERED' ? 'font-bold text-emerald-300' : 'text-slate-400'}>
                4. Call Answered on Cellular Device
              </span>
            </div>
          </div>
        </div>

        {/* Rule #7 Requirement: Mandatory Cellular Audio Notice */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-indigo-300">
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Cellular Audio Note:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            "SIM calling connected, but AI audio integration requires a supported cellular audio gateway."
          </p>
        </div>

        {/* Display Parent Response if received */}
        {parentResponse && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-xs space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Parent Response Recorded:
            </span>
            <p className="text-slate-200 font-semibold">{parentResponse}</p>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800 gap-2">
        <a
          href={`tel:${parentPhone}`}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span>📱 Dial Parent ({parentPhone})</span>
        </a>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
        >
          {isTerminalState ? 'Close Window' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
