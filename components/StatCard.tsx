import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple';
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-600',
    text: 'text-indigo-600',
    valText: 'text-indigo-950',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-600',
    text: 'text-emerald-600',
    valText: 'text-emerald-950',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    iconBg: 'bg-rose-600',
    text: 'text-rose-600',
    valText: 'text-rose-950',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-600',
    text: 'text-amber-600',
    valText: 'text-amber-950',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    iconBg: 'bg-blue-600',
    text: 'text-blue-600',
    valText: 'text-blue-950',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    iconBg: 'bg-purple-600',
    text: 'text-purple-600',
    valText: 'text-purple-950',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const styles = colorMap[color] || colorMap.indigo;

  return (
    <div className={`p-6 rounded-2xl border ${styles.border} ${styles.bg} glass-card shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className={`text-3xl font-extrabold ${styles.valText} tracking-tight`}>{value}</h3>
          {subtitle && <p className="text-xs font-medium text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`h-12 w-12 rounded-xl ${styles.iconBg} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
