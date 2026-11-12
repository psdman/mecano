import React from 'react';
import { useGarage } from '../context/GarageContext';
import { Wrench, Plus, RotateCcw, Languages } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, resetDemoData, language, setLanguage, t, isArabic } = useGarage();

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Wordmark */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs group-hover:bg-amber-400 transition-colors">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
                {t.appName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {isArabic ? 'المغرب 🇲🇦' : 'Atelier Maroc 🇲🇦'}
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'dashboard'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.dashboard}
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'workflow'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.workflow}
            </button>
            <button
              onClick={() => setActiveTab('interventions')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'interventions'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.interventions}
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'vehicles'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.vehicles}
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'clients'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.clients}
            </button>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'caisse'
                  ? 'text-slate-900 font-bold border-b-2 border-amber-500'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.caisse}
            </button>
          </nav>

          {/* Zone 3: Language toggle & CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Multilingual Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              title={isArabic ? 'Passer en Français' : 'التحويل إلى العربية'}
            >
              <Languages className="w-3.5 h-3.5 text-amber-500" />
              <span>{isArabic ? 'Français' : 'العربية'}</span>
            </button>

            <button
              onClick={resetDemoData}
              title={t.demo}
              className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.demo}</span>
            </button>

            <button
              onClick={() => setActiveTab('workflow')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newEntry}</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="flex lg:hidden items-center gap-2 overflow-x-auto py-2.5 border-t border-slate-100 text-xs font-medium scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
            }`}
          >
            {t.dashboard}
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md ${
              activeTab === 'workflow' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600'
            }`}
          >
            {t.workflow}
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md ${
              activeTab === 'interventions' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
            }`}
          >
            {t.interventions}
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md ${
              activeTab === 'clients' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
            }`}
          >
            {t.clients}
          </button>
          <button
            onClick={() => setActiveTab('caisse')}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md ${
              activeTab === 'caisse' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
            }`}
          >
            {t.caisse}
          </button>
        </div>
      </div>
    </header>
  );
};
