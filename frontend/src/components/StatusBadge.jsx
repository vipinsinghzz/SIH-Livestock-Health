import React from 'react';
import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status, size = 'md' }) {
  const { t } = useTranslation();

  const styles = {
    'Reported': 'bg-slate-100 text-slate-700 border-slate-200',
    'Triaged': 'bg-blue-50 text-blue-700 border-blue-200',
    'Field Verified': 'bg-purple-50 text-purple-700 border-purple-200',
    'Escalated': 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    'Contained': 'bg-emerald-50 text-emerald-800 border-emerald-300',
    'Closed': 'bg-gray-100 text-gray-500 border-gray-200 line-through'
  };

  const keyMap = {
    'Reported': 'status.reported',
    'Triaged': 'status.triaged',
    'Field Verified': 'status.field_verified',
    'Escalated': 'status.escalated',
    'Contained': 'status.contained',
    'Closed': 'status.closed'
  };

  const label = t(keyMap[status] || status);
  const styleClass = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-md border ${styleClass} ${sizeClass}`}>
      {label}
    </span>
  );
}
