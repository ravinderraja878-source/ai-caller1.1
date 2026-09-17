'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  User,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Save,
  Phone,
  Play,
  QrCode,
  RefreshCw,
  X,
  Copy,
  Check,
} from 'lucide-react';

export default function ProfilePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'mock' | 'personal_sim'>('personal_sim');

  // Teacher Profile state
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('+91');
  const [collegeName, setCollegeName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Gateway Device state
  const [gatewayStatus, setGatewayStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Saving Mode state
  const [savingMode, setSavingMode] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Test Real SIM Call state
  const [testParentPhone, setTestParentPhone] = useState('+91');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings/voice');
      const data = await res.json();
      if (res.ok) {
        setVoiceMode(data.voiceMode === 'mock' ? 'mock' : 'personal_sim');
        if (data.teacherPhone) setTeacherPhone(data.teacherPhone);
        setGatewayStatus(data.gatewayConnected ? 'ONLINE' : 'OFFLINE');
        setDeviceInfo(data.device || null);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const loadSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.teacher) {
        setTeacher(data.teacher);
        setTeacherName(data.teacher.name || '');
        if (data.teacher.phone) setTeacherPhone(data.teacher.phone);
        setCollegeName(data.teacher.collegeName || '');
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    }
  };

  useEffect(() => {
    loadSession();
    loadSettings();
    const interval = setInterval(loadSettings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacherName,
          collegeName,
          phone: teacherPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileMsg('✓ Teacher profile & personal SIM number saved!');
      loadSession();
      loadSettings();
    } catch (err: any) {
      setProfileMsg(`⚠️ ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSwitchCallingMode = async (selectedMode: 'mock' | 'personal_sim') => {
    setSavingMode(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const res = await fetch('/api/settings/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceMode: selectedMode,
          teacherPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update calling mode');

      setVoiceMode(data.voiceMode);
      setSaveSuccessMsg(data.message);
      loadSettings();
    } catch (err: any) {
      setSaveErrorMsg(err.message);
    } finally {
      setSavingMode(false);
    }
  };

  const handleMakeTestCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/calls/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTestNumber: testParentPhone,
          teacherNumber: teacherPhone,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Test SIM call failed.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const copyPairingDetails = () => {
    const text = JSON.stringify(
      {
        serverUrl: typeof window !== 'undefined' ? window.location.origin : '',
        teacherId: teacher?.id,
        email: teacher?.email,
      },
      null,
      2
    );
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} voiceMode={voiceMode === 'personal_sim' ? 'production' : 'mock'} />

      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Navbar setMobileOpen={setMobileOpen} teacher={teacher} voiceMode={voiceMode === 'personal_sim' ? 'production' : 'mock'} />

        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Smartphone className="h-7 w-7 text-indigo-600" /> Personal SIM Calling Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure your personal Indian SIM card mobile number, manage your Android SIM Gateway device connection, and test outbound cellular phone calls.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account & Teacher Personal SIM Profile */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Personal SIM Profile
              </h2>

              {profileMsg && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-semibold">
                  {profileMsg}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fixed Faculty Teacher ID
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={teacher?.id || 'FAC-2026-LOADING'}
                    className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-extrabold text-indigo-700 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Unique fixed Faculty ID assigned to your account for SIM Gateway pairing and record tracking.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Faculty Name
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    My Mobile Number (Physical SIM Number)
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="+919876543210"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    This personal mobile number will be used for cellular calls dispatched to your Android phone SIM card.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    College Name
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  {profileSaving ? 'Saving...' : 'Save Personal SIM Number & Details'}
                </button>
              </form>
            </div>

            {/* Personal SIM Calling & Android SIM Gateway Status Panel */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" /> Personal SIM Calling
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    gatewayStatus === 'ONLINE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${gatewayStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {gatewayStatus === 'ONLINE' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {saveSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* SIM Calling Status Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 col-span-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SIM Gateway Status</p>
                  <p className={`font-bold text-sm flex items-center gap-1.5 mt-0.5 ${gatewayStatus === 'ONLINE' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {gatewayStatus === 'ONLINE' ? '🟢 Connected' : '🔴 Offline / Disconnected'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Mobile Number</p>
                  <p className="font-bold text-sm font-mono text-indigo-700 mt-0.5">
                    {teacherPhone || '+91XXXXXXXXXX'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SIM Device</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {deviceInfo?.deviceName || 'Android Phone'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Calling Mode</p>
                  <p className="font-bold text-indigo-600 mt-0.5">
                    {voiceMode === 'personal_sim' ? 'PERSONAL SIM' : 'DEMO MODE'}
                  </p>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Connection Status: <strong className={gatewayStatus === 'ONLINE' ? 'text-emerald-600' : 'text-slate-600'}>{gatewayStatus === 'ONLINE' ? 'Online' : 'Offline'}</strong></span>
                  {deviceInfo?.lastSeen && (
                    <span>Last Seen: {new Date(deviceInfo.lastSeen).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Calling Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSwitchCallingMode('personal_sim')}
                    disabled={savingMode}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      voiceMode === 'personal_sim'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>📱 LIVE PERSONAL SIM</span>
                    <span className="text-[10px] font-normal opacity-80">Use physical mobile SIM card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchCallingMode('mock')}
                    disabled={savingMode}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      voiceMode === 'mock'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🧪 DEMO MODE</span>
                    <span className="text-[10px] font-normal opacity-80">Sandbox simulation test</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPairModalOpen(true)}
                  className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Connect Android Phone</span>
                </button>
                <button
                  type="button"
                  onClick={loadSettings}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Connection</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Personal SIM Call Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" /> Test SIM Connection & Cellular Call
            </h2>

            <p className="text-xs text-slate-500">
              Dispatches a test cellular call request to your physical Android phone SIM card to verify dialing to a mobile number.
            </p>

            <form onSubmit={handleMakeTestCall} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
                  My Personal SIM Number
                </label>
                <input
                  type="text"
                  readOnly
                  value={teacherPhone || '+91-Not-Configured'}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Test Destination Mobile Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={testParentPhone}
                  onChange={(e) => setTestParentPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={testLoading || (voiceMode === 'personal_sim' && gatewayStatus === 'OFFLINE')}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {testLoading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>Make Test SIM Call</span>
                </button>
              </div>
            </form>

            {voiceMode === 'personal_sim' && gatewayStatus === 'OFFLINE' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Your SIM phone is offline. Connect the Android SIM Gateway before making a call.</span>
              </div>
            )}

            {testResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                {testResult.success ? (
                  <>
                    <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Test call request sent to Android SIM Gateway!
                    </p>
                    <p className="font-mono text-xs">Provider Ref: <strong className="text-indigo-700">{testResult.providerCallId}</strong></p>
                    <p className="text-[11px] text-slate-600">Dispatched call to {testResult.parentPhone} via device {testResult.deviceName || 'Android SIM Gateway'}.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-rose-800 text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600" /> SIM Call Failed / Gateway Offline
                    </p>
                    <p className="text-rose-700 font-medium">{testResult.error}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Connect Android Phone Gateway Pairing Modal */}
      {pairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Connect Android SIM Gateway</h3>
                  <p className="text-xs text-slate-500 font-medium">Pair your physical Android phone with Vercel</p>
                </div>
              </div>
              <button
                onClick={() => setPairModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Install the <strong>AI Caller SIM Gateway</strong> app on your Android phone containing your physical Indian SIM card. Enter these credentials in the companion app:
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Vercel Backend URL</span>
                  <span className="text-xs text-indigo-600 font-bold break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-vercel-app.vercel.app'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Teacher Account ID</span>
                  <span className="text-xs text-slate-800 font-bold">{teacher?.id || 'Loading...'}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Registered SIM Number</span>
                  <span className="text-xs text-emerald-700 font-bold">{teacherPhone || '+91XXXXXXXXXX'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                <p className="font-bold">📱 Companion App Location:</p>
                <p className="font-mono text-[11px]">/android-sim-gateway/</p>
                <p className="text-[11px] text-indigo-700">Open the project folder in Android Studio or build APK to run on your phone.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={copyPairingDetails}
                className="flex-1 py-3 px-4 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 flex items-center justify-center gap-2 transition-all"
              >
                {copiedKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedKey ? 'Credentials Copied!' : 'Copy Pairing Details'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPairModalOpen(false)}
                className="py-3 px-5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
