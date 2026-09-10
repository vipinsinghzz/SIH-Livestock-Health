import React from 'react';
import { LivestockSaathiEmblem } from './LivestockSaathiLogo';

export default function AppLoadingScreen({ message = 'लोड हो रहा है... Loading Livestock Saathi...' }) {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="flex flex-col items-center text-center max-w-sm space-y-4 animate-fade-in">
        {/* Emblem with glow and pulse */}
        <div className="relative">
          <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-lg animate-pulse" />
          <LivestockSaathiEmblem size={76} className="relative drop-shadow-md animate-bounce" />
        </div>

        {/* Wordmark & Badging */}
        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
            LIVESTOCK{' '}
            <span className="text-emerald-700 bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              SAATHI
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 font-extrabold text-[10px] uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              SIH PS 128
            </span>
          </div>
        </div>

        {/* Spinner Bar */}
        <div className="w-36 h-1.5 bg-stone-200 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full w-1/2 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs text-slate-500 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
