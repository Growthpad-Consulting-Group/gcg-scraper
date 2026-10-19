'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useTheme } from '@/shared/contexts/ThemeContext';

export type StatCardColor = 'orange' | 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: StatCardColor;
  subtitle?: string;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
}

const gradients: Record<StatCardColor, string> = {
  orange: 'from-gcg-orange to-gcg-orange-dark',
  green:  'from-emerald-500 to-emerald-400',
  blue:   'from-blue-500 to-blue-400',
  yellow: 'from-amber-500 to-amber-400',
  red:    'from-red-500 to-red-400',
  purple: 'from-purple-500 to-purple-400',
  gray:   'from-gray-500 to-gray-400',
};

const shadows: Record<StatCardColor, string> = {
  orange: 'shadow-gcg-orange/25',
  green:  'shadow-emerald-500/25',
  blue:   'shadow-blue-500/25',
  yellow: 'shadow-amber-500/25',
  red:    'shadow-red-500/25',
  purple: 'shadow-purple-500/25',
  gray:   'shadow-gray-500/20',
};

export default function StatCard({ title, value, icon, color = 'orange', subtitle, loading = false, href, onClick }: StatCardProps) {
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const gradient = gradients[color];
  const shadow = shadows[color];

  const className = `relative block overflow-hidden rounded-2xl p-4 border group transition-all duration-500 h-full bg-white/80 backdrop-blur-xl border-slate-100 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-sm${
    href || onClick ? ' cursor-pointer active:scale-[0.98] hover:scale-[1.01]' : ''
  }`;

  const content = (
    <>
      {/* decorative circle */}
      <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-14 -mt-14 group-hover:scale-110 transition-transform duration-300`} />
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadow} shrink-0`}>
            {loading
              ? <Icon icon="mdi:loading" className="w-5 h-5 text-white animate-spin" />
              : <Icon icon={icon} className="w-5 h-5 text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {loading ? <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" /> : value}
            </div>
            {subtitle && <div className={`text-xs font-mono mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</div>}
            <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          </div>
        </div>
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={className}>{content}</Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={`w-full text-left ${className}`}>{content}</button>
  ) : (
    <div className={className}>{content}</div>
  );
}
