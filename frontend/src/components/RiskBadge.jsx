import React from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck, Flame, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function RiskBadge({ riskLevel, showAiTag = false, size = 'md' }) {
  const { t } = useTranslation();

  const configs = {
    Low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: ShieldCheck,
      label: t('risk.low')
    },
    Moderate: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
      label: t('risk.moderate')
    },
    High: {
      bg: 'bg-orange-50 text-orange-800 border-orange-200',
      dot: 'bg-orange-500',
      icon: AlertCircle,
      label: t('risk.high')
    },
    Critical: {
      bg: 'bg-red-50 text-red-800 border-red-300 font-semibold ring-2 ring-red-500/20',
      dot: 'bg-red-600 animate-ping',
      icon: Flame,
      label: t('risk.critical')
    }
  };

  const config = configs[riskLevel] || configs.Low;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
      ? 'px-3.5 py-1.5 text-sm font-medium' 
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${config.bg} ${sizeClasses}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{config.label}</span>
      </span>

      {showAiTag && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200" title="Placeholder pending real ML model integration">
          <Cpu className="w-3 h-3 text-indigo-600" />
          <span>Simulated AI (v0.1)</span>
        </span>
      )}
    </div>
  );
}
