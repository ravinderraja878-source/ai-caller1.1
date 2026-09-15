import React from 'react';
import {
  CheckCircle2,
  XCircle,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Clock,
  Mic,
  Volume2,
  AlertCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'attendance' | 'call';
}

export function StatusBadge({ status, type = 'call' }: StatusBadgeProps) {
  if (type === 'attendance') {
    const isPresent = status === 'Present';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isPresent
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}
      >
        {isPresent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {status}
      </span>
    );
  }

  // Call Statuses
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Completed
        </span>
      );
    case 'Connected':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
          Connected
        </span>
      );
    case 'AI Speaking':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
          <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
          AI Speaking
        </span>
      );
    case 'Listening':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
          <Mic className="h-3.5 w-3.5 text-purple-600" />
          Parent Responding
        </span>
      );
    case 'Ringing':
    case 'Initiating':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <PhoneForwarded className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
          {status}
        </span>
      );
    case 'No Answer':
    case 'Busy':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <PhoneOff className="h-3.5 w-3.5 text-slate-500" />
          {status}
        </span>
      );
    case 'Failed':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          Failed
        </span>
      );
  }
}
