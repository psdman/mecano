import React from 'react';
import { useGarage } from '../context/GarageContext';
import { SAMPLE_VEHICLE_IMG } from '../data/seedData';
import {
  Wrench,
  Camera,
  Car,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    vehicles,
    clients,
    interventions,
    payments,
    getClientBalance,
    getClientById,
    getVehicleById,
    setActiveTab,
    setIsPaymentModalOpen,
    setPreselectedClientIdForPayment,
    t,
    formatDH,
    isArabic,
  } = useGarage();

  const activeInterventions = interventions.filter((i) => i.statut === 'en_cours');

  const clientsWithPendingBalance = clients
    .map((c) => ({
      client: c,
      balance: getClientBalance(c.id),
    }))
    .filter((item) => item.balance.soldeDu > 0.01)
    .sort((a, b) => b.balance.soldeDu - a.balance.soldeDu);

  const totalReceivables = clientsWithPendingBalance.reduce(
    (sum, item) => sum + item.balance.soldeDu,
    0
  );

  const totalInvoiced = interventions
    .filter((i) => i.statut !== 'annule')
    .reduce((sum, i) => sum + i.totalTTC, 0);

  const totalEncaiss = payments.reduce((sum, p) => sum + p.montant, 0);

  const handleOpenPayment = (clientId: string) => {
    setPreselectedClientIdForPayment(clientId);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold">
            <Camera className="w-3.5 h-3.5" />
            <span>{isArabic ? 'سكانير الكارت كريس بالمغرب' : 'Workflow Garagiste Marocain 🇲🇦'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t.heroTitle}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t.heroSubtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('workflow')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>{t.startScan}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {t.checkBalances} ({clientsWithPendingBalance.length} {isArabic ? 'باقي كيتسالو' : 'crédits'})
            </button>
          </div>
        </div>

        {/* Moroccan car bay visual */}
        <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 w-80 h-48 rounded-xl overflow-hidden border border-slate-700/60 shadow-xl opacity-90">
          <img
            src={SAMPLE_VEHICLE_IMG}
            alt="Garage Maroc"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vehicles in shop */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.inShop}
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            {activeInterventions.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isArabic ? 'طوموبيلات خدامين فيهم دابا' : 'Sur les ponts en ce moment'}
          </div>
        </div>

        {/* Receivables / Unpaid balances */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.receivables}
            </span>
            <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-600 mt-2">
            {formatDH(totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {clientsWithPendingBalance.length} {isArabic ? 'كليان باقي عليه كريدي' : 'client(s) avec reste à payer'}
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.turnover}
            </span>
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            {formatDH(totalInvoiced)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isArabic ? 'مجموع فواتير الإصلاح وقطع الغيار' : 'Cumul travaux & pièces'}
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.collected}
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-2">
            {formatDH(totalEncaiss)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {payments.length} {isArabic ? 'عملية قبض مسجلة' : 'règlement(s) perçus'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Repairs & Balances to Collect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Repairs */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t.activeRepairs} ({activeInterventions.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('interventions')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.seeAll}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeInterventions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isArabic ? 'ما كاينا حتى طوموبيل في الكراج دابا' : 'Aucun véhicule en cours à cet instant.'}
                </div>
              ) : (
                activeInterventions.map((item) => {
                  const vehicle = getVehicleById(item.vehiculeId);
                  const client = getClientById(item.clientId);

                  return (
                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-xs text-slate-900 rounded-sm">
                              {vehicle?.immatriculation || '-'}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {vehicle?.marque} {vehicle?.modele}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 mt-1 font-medium">
                            {item.motif}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {client?.nomComplet} · {item.pieces.length} {isArabic ? 'قطعة' : 'pièce(s)'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatDH(item.totalTTC)}
                          </div>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-sm">
                            {isArabic ? 'قيد العمل' : 'En cours'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('workflow')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t.quickEntry}
            </button>
          </div>
        </div>

        {/* Debts / Receivables to collect */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t.pendingDebts} ({clientsWithPendingBalance.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('clients')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.seeAll}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {clientsWithPendingBalance.length === 0 ? (
                <div className="p-8 text-center text-emerald-600 text-xs font-bold">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                  {isArabic ? 'جميع الحسابات خالصة ما كاين حتى كريدي !' : 'Tous les comptes clients sont réglés !'}
                </div>
              ) : (
                clientsWithPendingBalance.map(({ client, balance }) => (
                  <div key={client.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {client.nomComplet}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {client.telephone}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isArabic ? 'الباقي' : 'RESTE DÛ'}</span>
                          <span className="font-mono font-extrabold text-red-600 text-sm">
                            {formatDH(balance.soldeDu)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenPayment(client.id)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          {t.collectBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('caisse')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isArabic ? 'سجل الصندوق والمداخيل اليومية' : 'Consulter le journal de caisse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
