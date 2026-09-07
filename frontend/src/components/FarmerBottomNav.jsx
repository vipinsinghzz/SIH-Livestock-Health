import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Stethoscope, Mic, PlusCircle, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FarmerBottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 shadow-lg lg:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] truncate max-w-[60px]">{t('nav.home')}</span>
        </NavLink>

        <NavLink
          to="/animals"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <HeartPulse className="w-5 h-5" />
          <span className="text-[10px] truncate max-w-[60px]">{t('nav.animals')}</span>
        </NavLink>

        {/* Center Prominent Disease Scan Button */}
        <NavLink
          to="/report-sick"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 ring-4 ring-white active:scale-95 transition">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-emerald-800 mt-1 truncate max-w-[65px]">{t('nav.report_sick')}</span>
        </NavLink>

        <NavLink
          to="/kisan-saathi"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Mic className="w-5 h-5" />
          <span className="text-[10px] truncate max-w-[65px]">{t('nav.kisan_saathi')}</span>
        </NavLink>

        <NavLink
          to="/veterinary-help"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Stethoscope className="w-5 h-5" />
          <span className="text-[10px] truncate max-w-[60px]">{t('nav.veterinary_help')}</span>
        </NavLink>
      </div>
    </nav>
  );
}
