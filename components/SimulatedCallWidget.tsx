'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, Volume2, Mic, CheckCircle2, X, Sparkles, Play, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface SimulatedCallWidgetProps {
  callId: string | null;
  studentName: string;
  parentName: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export function SimulatedCallWidget({
  callId,
  studentName,
  parentName,
  onClose,
  onCompleted,
}: SimulatedCallWidgetProps) {
  const [status, setStatus] = useState<string>('Initiating');
  const [transcript, setTranscript] = useState<string>('');
  const [parentResponse, setParentResponse] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  useEffect(() => {
    if (!callId) return;

    // Poll status or step through simulation
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${callId}`);
        const data = await res.json();
        if (data.success && data.call) {
          setStatus(data.call.status);
          if (data.call.transcript) setTranscript(data.call.transcript);
          if (data.call.parentResponse) setParentResponse(data.call.parentResponse);

          if (data.call.status === 'Completed' || data.call.status === 'Failed') {
            clearInterval(interval);
            if (onCompleted) onCompleted();
          }
        }
      } catch (err) {
        console.error('Poll call error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [callId, onCompleted]);

  const handleSimulateFinish = async () => {
    if (!callId) return;
    try {
      const res = await fetch(`/api/calls/${callId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus: 'Completed' }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        setStatus('Completed');
        setTranscript(data.call.transcript);
        setParentResponse(data.call.parentResponse);
        if (onCompleted) onCompleted();
      }
    } catch (err) {
      console.error('Simulation force finish error:', err);
    }
  };

  if (!callId) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-300">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg calling-pulse">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-white">{studentName}</h4>
              <span className="text-xs text-indigo-400 font-semibold">(Parent: {parentName})</span>
            </div>
            <p className="text-xs text-slate-400">Telugu AI Assistant Simulated Outbound Call</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body Live Status */}
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Live Call State</span>
          <StatusBadge status={status} type="call" />
        </div>

        {/* Audio Wave Visualizer Simulation */}
        {status !== 'Completed' && status !== 'Failed' && (
          <div className="flex items-center justify-center gap-1.5 py-4 bg-indigo-950/40 rounded-2xl border border-indigo-500/20">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-10 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-14 bg-indigo-300 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-8 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        )}

        {/* Live Telugu Transcript */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto space-y-2">
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Live Telugu Conversation Transcript
          </p>
          {transcript ? (
            <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
              {transcript}
            </pre>
          ) : (
            <p className="text-xs text-slate-500 italic">
              AI dialer connecting to parent phone line...
            </p>
          )}
        </div>

        {/* Parent Response Box */}
        {parentResponse && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-xs">
            <span className="font-bold text-emerald-400 block mb-1">✓ Parent Response Captured:</span>
            <p className="text-slate-200 font-medium">{parentResponse}</p>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
        <span className="text-xs text-slate-400">Mock Mode Sandbox</span>
        {status !== 'Completed' ? (
          <button
            onClick={handleSimulateFinish}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Fast-Forward Call</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
          >
            Close Widget
          </button>
        )}
      </div>
    </div>
  );
}
