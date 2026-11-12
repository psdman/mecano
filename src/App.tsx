import React, { useEffect, useState } from 'react';
import { GarageProvider, useGarage } from './context/GarageContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { WorkflowScanner } from './components/WorkflowScanner';
import { InterventionsList } from './components/InterventionsList';
import { VehiclesList } from './components/VehiclesList';
import { ClientsBalances } from './components/ClientsBalances';
import { CaissePaiements } from './components/CaissePaiements';
import { PaymentModal } from './components/PaymentModal';
import { Login } from './components/Login';
import { api, SessionUser } from './utils/api';
import { LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab } = useGarage();

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans">
      <Navigation />

      <main className="flex-1">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'workflow' && <WorkflowScanner />}
        {activeTab === 'interventions' && <InterventionsList />}
        {activeTab === 'vehicles' && <VehiclesList />}
        {activeTab === 'clients' && <ClientsBalances />}
        {activeTab === 'caisse' && <CaissePaiements />}
      </main>

      <PaymentModal />

      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">MecaScan Atelier</span>
            <span>·</span>
            <span>Logiciel d’aide au garagiste et mécanicien</span>
          </div>
          <button
            onClick={async () => { await api.logout(); window.location.reload(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    api.me().then((r) => setUser(r.success ? r.user : null)).catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Chargement...</div>;
  }
  if (!user) {
    return <Login onLogin={setUser} />;
  }
  return (
    <GarageProvider>
      <AppContent />
    </GarageProvider>
  );
}
