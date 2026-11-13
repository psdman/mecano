import React from 'react';
import { useGarage } from '../context/GarageContext';
import { Wrench, Plus, Languages, ShieldCheck, LogOut, LayoutDashboard, ClipboardList, Car, Users, Wallet, ScanLine, Home } from 'lucide-react';
import { api } from '../utils/api';

interface TabDef { id: string; label: string; icon: React.ReactNode }

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, language, setLanguage, t, isArabic, isAdmin, user, settings } = useGarage();
  const garageName = settings.garageNom || t.appName;
  const garageLogo = settings.garageLogo;

  const can = (perm: string) => isAdmin || user?.permissions?.[perm] !== false;

  const tabs: TabDef[] = [
    { id: 'home', label: isArabic ? 'الرئيسية' : 'Accueil', icon: <Home className="w-4 h-4" /> },
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    ...(can('workflow') ? [{ id: 'workflow', label: t.workflow, icon: <ScanLine className="w-4 h-4" /> }] : []),
    ...(can('interventions') ? [{ id: 'interventions', label: t.interventions, icon: <ClipboardList className="w-4 h-4" /> }] : []),
    ...(can('vehicles') ? [{ id: 'vehicles', label: t.vehicles, icon: <Car className="w-4 h-4" /> }] : []),
    ...(can('clients') ? [{ id: 'clients', label: t.clients, icon: <Users className="w-4 h-4" /> }] : []),
    ...(can('caisse') ? [{ id: 'caisse', label: t.caisse, icon: <Wallet className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <ShieldCheck className="w-4 h-4" /> }] : []),
  ].filter((tab) => can(tab.id));

  const itemCls = (id: string) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
      activeTab === id
        ? 'bg-amber-400 text-slate-950 shadow-sm'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <>
      {/* ===== Sidebar desktop ===== */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-slate-950 text-white z-40 no-print">
        {/* Logo */}
        <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 px-5 h-16 border-b border-slate-800/80 cursor-pointer">
          {garageLogo ? (
            <img src={garageLogo} alt="logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-lg" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
              <Wrench className="w-5 h-5 text-slate-950" />
            </div>
          )}
          <div className="text-left">
            <div className="text-base font-extrabold tracking-tight leading-tight truncate max-w-[140px]">{garageName}</div>
            <div className="text-[10px] text-slate-500 font-medium">{isArabic ? 'كراج mecanique' : 'Garage Mécanique'}</div>
          </div>
        </button>

        {/* CTA */}
        <div className="px-4 pt-4">
          <button
            onClick={() => setActiveTab('workflow')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold rounded-xl shadow-md shadow-amber-400/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t.newEntry}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={itemCls(tab.id)}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom: langue + user + logout */}
        <div className="px-4 py-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            {language === 'fr' ? 'العربية' : 'Français'}
          </button>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] text-slate-500 truncate">{user?.username}</span>
            <button
              onClick={async () => { await api.logout(); window.location.reload(); }}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md cursor-pointer"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Barre mobile : cachée sur l'accueil, fine barre retour ailleurs ===== */}
      {activeTab !== 'home' && (
      <nav className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 shrink-0 cursor-pointer">
            {garageLogo ? (
              <img src={garageLogo} alt="logo" className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-slate-950" />
              </div>
            )}
          </button>
          <span className="text-sm font-extrabold text-slate-900 truncate">{tabs.find((t) => t.id === activeTab)?.label || garageName}</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 text-[11px] font-bold cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'fr' ? 'ع' : 'FR'}
            </button>
            <button
              onClick={async () => { await api.logout(); window.location.reload(); }}
              className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
      )}
    </>
  );
};
