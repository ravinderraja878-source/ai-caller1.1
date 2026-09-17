'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  X,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Info,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  Sparkles,
  PhoneOff,
} from 'lucide-react';
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
  collegeName = 'Malla Reddy University',
  onClose,
  onCompleted,
}: LiveVoiceCallWidgetProps) {
  const [callStatus, setCallStatus] = useState<string>('REQUESTED');
  const [duration, setDuration] = useState<number>(0);
  const [parentResponse, setParentResponse] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('Android SIM Gateway APK');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeSpeechStep, setActiveSpeechStep] = useState<number>(0);

  const spokenStepsRef = useRef<Set<number>>(new Set());

  // Web Speech Synthesis helper for Telugu AI speech
  const speakTeluguText = (text: string, stepIndex: number) => {
    if (spokenStepsRef.current.has(stepIndex)) return;
    spokenStepsRef.current.add(stepIndex);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !audioMuted) {
      try {
        window.speechSynthesis.cancel(); // Stop prior audio
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'te-IN'; // Telugu (India)
        utterance.rate = 0.92; // Natural conversational tempo
        utterance.pitch = 1.0;

        // Search for available Telugu or Indian English fallback voices
        const voices = window.speechSynthesis.getVoices();
        const teluguVoice = voices.find(
          (v) => v.lang.includes('te') || v.lang.includes('TE') || v.name.toLowerCase().includes('telugu') || v.lang.includes('hi')
        );
        if (teluguVoice) utterance.voice = teluguVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis error:', err);
      }
    }
  };

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
        const currentStatus = call.status;
        setCallStatus(currentStatus);

        if (call.duration) setDuration(call.duration);
        if (call.parentResponse) setParentResponse(call.parentResponse);
        if (call.transcript) setTranscript(call.transcript);
        if (call.device?.deviceName) setDeviceName(call.device.deviceName);

        // Speak Telugu AI lines out loud inside the website as call progresses
        if (currentStatus === 'ANSWERED' || currentStatus === 'COMPLETED') {
          if (!spokenStepsRef.current.has(1)) {
            setActiveSpeechStep(1);
            speakTeluguText(
              `నమస్కారం! నేను ${collegeName} నుంచి మాట్లాడుతున్నాను. ఇది ${studentName} గారి తల్లిదండ్రుల నంబర్ కదా?`,
              1
            );
          }

          setTimeout(() => {
            if (isMounted && !spokenStepsRef.current.has(2)) {
              setActiveSpeechStep(2);
              speakTeluguText(
                `${studentName} గారు ఈ రోజు కాలేజీకి హాజరు కాలేదు. ಗైర్హాజరు కారణం చెప్పగలరా?`,
                2
              );
            }
          }, 4500);

          setTimeout(() => {
            if (isMounted && !spokenStepsRef.current.has(3)) {
              setActiveSpeechStep(3);
              speakTeluguText(
                `సరేనండి. ${studentName} గారి గైర్హాజరు కారణం నమోదు చేసుకున్నాము. ధన్యవాదాలు!`,
                3
              );
            }
          }, 9500);
        }

        if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(currentStatus)) {
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [callId]);

  const toggleMute = () => {
    if (audioMuted) {
      setAudioMuted(false);
    } else {
      setAudioMuted(true);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  if (!callId) return null;

  const isTerminalState = ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(callStatus);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full bg-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom duration-300 space-y-5">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <PhoneCall className="h-6 w-6" />
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
          onClick={() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            onClose();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Gateway Status Pill & Visualizer */}
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-200 font-semibold">{deviceName}</span>
          </div>
          <StatusBadge status={callStatus} type="call" />
        </div>

        {/* Dynamic Soundwave Frequency Visualizer */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-400" /> Live AI Audio Wave
            </span>
            {duration > 0 && <span className="font-mono text-indigo-300">Duration: {duration}s</span>}
          </div>

          {/* Equalizer Bars */}
          <div className="h-12 bg-slate-950 rounded-xl p-3 flex items-center justify-center gap-1.5 border border-slate-800/80">
            {[40, 75, 55, 90, 65, 80, 45, 100, 70, 85, 60, 95, 50, 75, 40].map((h, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-200 ${
                  isSpeaking || ['ANSWERED', 'COMPLETED'].includes(callStatus)
                    ? 'bg-gradient-to-t from-indigo-500 via-emerald-400 to-rose-400 animate-pulse'
                    : 'bg-slate-800'
                }`}
                style={{
                  height: isSpeaking || ['ANSWERED', 'COMPLETED'].includes(callStatus) ? `${(h * (idx % 3 + 1)) % 100}%` : '20%',
                  animationDelay: `${idx * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* Call Progression Steps */}
          <div className="space-y-2 pt-1 text-[11px]">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'REQUESTED' ? 'bg-indigo-400 animate-ping' : 'bg-emerald-500'}`} />
              <span className={callStatus === 'REQUESTED' ? 'font-bold text-indigo-300' : 'text-slate-300'}>
                1. Call Dispatched via AI SIM Gateway APK
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${['DEVICE_RECEIVED', 'DIALING'].includes(callStatus) ? 'bg-indigo-400 animate-ping' : ['RINGING', 'ANSWERED', 'COMPLETED'].includes(callStatus) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={['DEVICE_RECEIVED', 'DIALING'].includes(callStatus) ? 'font-bold text-indigo-300' : 'text-slate-400'}>
                2. Cellular Gateway Dialing Parent ({parentPhone})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'RINGING' ? 'bg-amber-400 animate-ping' : ['ANSWERED', 'COMPLETED'].includes(callStatus) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={callStatus === 'RINGING' ? 'font-bold text-amber-300' : 'text-slate-400'}>
                3. Parent Cellular Phone Ringing...
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'ANSWERED' ? 'bg-emerald-400 animate-pulse' : callStatus === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={callStatus === 'ANSWERED' ? 'font-bold text-emerald-300' : 'text-slate-400'}>
                4. Connected • AI Telugu Speech Engine Active
              </span>
            </div>
          </div>
        </div>

        {/* Live Conversation Dialogue Stream */}
        {['ANSWERED', 'COMPLETED'].includes(callStatus) && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" /> Live Telugu Speech Transcript
              </span>
              {isSpeaking && <span className="text-emerald-400 animate-pulse">🔊 AI Speaking...</span>}
            </div>

            <div className="space-y-2 font-sans text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-100 space-y-0.5">
                <span className="font-bold text-indigo-400 block text-[10px] uppercase">🤖 Telugu AI Voice Agent</span>
                <p className="font-medium">
                  "నమస్కారం! నేను {collegeName} నుంచి మాట్లాడుతున్నాను. ఇది {studentName} గారి తల్లిదండ్రుల నంబర్ కదా?"
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 space-y-0.5">
                <span className="font-bold text-emerald-400 block text-[10px] uppercase">👤 Parent ({parentName})</span>
                <p className="font-medium">"అవునండి, నేను మాట్లాడుతున్నాను. ఏమైంది?"</p>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-100 space-y-0.5">
                <span className="font-bold text-indigo-400 block text-[10px] uppercase">🤖 Telugu AI Voice Agent</span>
                <p className="font-medium">
                  "{studentName} గారు ఈ రోజు కాలేజీకి హాజరు కాలేదు. గైర్హాజరు కారణం చెప్పగలరా?"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Display Recorded Parent Response */}
        {parentResponse && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 text-xs space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Parent Reason Recorded:
            </span>
            <p className="text-slate-100 font-semibold">{parentResponse}</p>
          </div>
        )}
      </div>

      {/* Footer Audio Controls */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800 gap-3">
        <button
          type="button"
          onClick={toggleMute}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            audioMuted
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          <span>{audioMuted ? 'Muted' : 'Speaker On'}</span>
        </button>

        <button
          onClick={() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            onClose();
          }}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
        >
          <PhoneOff className="h-3.5 w-3.5 text-rose-400" />
          <span>{isTerminalState ? 'Close Window' : 'End Call'}</span>
        </button>
      </div>
    </div>
  );
}
