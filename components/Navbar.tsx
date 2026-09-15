'use client';

import React from 'react';
import { Menu, Building2, User, PhoneCall, Sparkles } from 'lucide-react';

interface NavbarProps {
  setMobileOpen?: (open: boolean) => void;
  teacher?: {
    name: string;
    email: string;
    collegeName: string;
  } | null;
  voiceMode?: 'mock' | 'production' | 'personal_sim' | string;
}

export function Navbar({ setMobileOpen, teacher, voiceMode = 'mock' }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 h-20 glass-nav px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>{teacher?.collegeName || process.env.NEXT_PUBLIC_COLLEGE_NAME || 'Malla Reddy University'}</span>
          </div>
          <h2 className="text-slate-800 font-bold text-lg tracking-tight">
            Teacher Portal
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Voice Mode Banner Pill */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            voiceMode === 'production' || voiceMode === 'personal_sim'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>{voiceMode === 'production' || voiceMode === 'personal_sim' ? 'Personal SIM Active' : 'Demo Mode Active'}</span>
        </div>

        {/* User Info Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="h-10 w-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
            {teacher?.name ? teacher.name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {teacher?.name || 'Faculty Member'}
            </p>
            <p className="text-xs text-slate-500 font-medium">{teacher?.email || 'teacher@vignan.edu'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
