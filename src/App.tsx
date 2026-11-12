import React from 'react';
import { GarageProvider, useGarage } from './context/GarageContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { WorkflowScanner } from './components/WorkflowScanner';
import { InterventionsList } from './components/InterventionsList';
import { VehiclesList } from './components/VehiclesList';
import { ClientsBalances } from './components/ClientsBalances';
import { CaissePaiements } from './components/CaissePaiements';
import { PaymentModal } from './components/PaymentModal';

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

      {/* Global Payment Modal accessible from anywhere */}
      <PaymentModal />

      {/* Clean quiet footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">MecaScan Atelier</span>
            <span>·</span>
            <span>Logiciel d’aide au garagiste et mécanicien</span>
          </div>
          <div className="text-slate-400">
            Scanner Carte Grise &amp; Véhicules · Gestion des Pièces · Suivi des Soldes &amp; Paiements
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <GarageProvider>
      <AppContent />
    </GarageProvider>
  );
}
