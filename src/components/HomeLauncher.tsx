import React from 'react';
import { useGarage } from '../context/GarageContext';
import {
  LayoutDashboard, ScanLine, ClipboardList, Car, Users, Wallet,
  ShieldCheck, Wrench, Sparkles, Languages, LogOut,
} from 'lucide-react';
import { api } from '../utils/api';

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord', ar: 'لوحة القيادة', icon: LayoutDashboard, color: 'bg-blue-500' },
  { id: 'workflow', label: 'Scanner / Réparer', ar: 'مسح / إصلاح', icon: ScanLine, color: 'bg-amber-500' },
  { id: 'interventions', label: 'Interventions', ar: 'الإصلاحات', icon: ClipboardList, color: 'bg-emerald-500' },
  { id: 'vehicles', label: 'Véhicules', ar: 'السيارات', icon: Car, color: 'bg-sky-600' },
  { id: 'clients', label: 'Clients', ar: 'الزبائن', icon: Users, color: 'bg-violet-500' },
  { id: 'caisse', label: 'Caisse', ar: 'الصندوق', icon: Wallet, color: 'bg-rose-500' },
  { id: 'admin', label: 'Administration', ar: 'الإدارة', icon: ShieldCheck, color: 'bg-slate-700' },
] as const;

export const HomeLauncher: React.FC = () => {
  const { setActiveTab, isArabic, isAdmin, user, settings, language, setLanguage } = useGarage();
  const name = settings?.garageNom || 'MecaScan';

  const can = (perm: string) => isAdmin || user?.permissions?.[perm] !== false;
  const visible = TABS.filter((tab) =>
    (tab.id === 'admin' ? isAdmin : can(tab.id)) && can(tab.id)
  );

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Langue + déconnexion */}
      <div className="absolute top-3 end-3 flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5" /> {language === 'fr' ? 'ع' : 'FR'}
        </button>
        <button
          onClick={async () => { await api.logout(); window.location.reload(); }}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 shadow-sm cursor-pointer"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      {/* Logo / nom */}
      <div className="mb-10 text-center">
        {settings?.garageLogo ? (
          <img src={settings.garageLogo} alt="logo" className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl bg-white shadow-lg p-2" />
        ) : (
          <div className="w-20 h-20 rounded-3xl bg-amber-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-400/30">
            <Wrench className="w-10 h-10 text-slate-950" />
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-slate-900">{name}</h1>
        <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {isArabic ? 'اختر القسم' : 'Choisissez une section'}
        </p>
      </div>

      {/* Grille de grandes icônes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-2xl">
        {visible.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="group flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all cursor-pointer active:scale-95"
            >
              <div className={`w-16 h-16 rounded-2xl ${tab.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-sm font-extrabold text-slate-800 text-center leading-tight">
                {isArabic ? tab.ar : tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
