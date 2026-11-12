import React, { useState } from 'react';
import { useGarage } from '../context/GarageContext';
import { PaymentMethod } from '../types/garage';
import {
  Banknote,
  CreditCard,
  FileCheck,
  Landmark,
  Plus,
  Search,
} from 'lucide-react';

export const CaissePaiements: React.FC = () => {
  const { payments, getClientById, setIsPaymentModalOpen, formatDH, isArabic, t } = useGarage();
  const [filterMode, setFilterMode] = useState<'all' | PaymentMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPayments = payments.filter((p) => {
    if (filterMode !== 'all' && p.mode !== filterMode) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const client = getClientById(p.clientId);

    return (
      p.numeroRecu.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q)) ||
      (client && client.nomComplet.toLowerCase().includes(q))
    );
  });

  const totalCB = payments.filter((p) => p.mode === 'carte').reduce((sum, p) => sum + p.montant, 0);
  const totalEspeces = payments.filter((p) => p.mode === 'especes').reduce((sum, p) => sum + p.montant, 0);
  const totalCheques = payments.filter((p) => p.mode === 'cheque').reduce((sum, p) => sum + p.montant, 0);
  const totalVirements = payments.filter((p) => p.mode === 'virement').reduce((sum, p) => sum + p.montant, 0);

  const getMethodBadge = (mode: PaymentMethod) => {
    switch (mode) {
      case 'especes':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
            <Banknote className="w-3 h-3" /> {t.cash}
          </span>
        );
      case 'cheque':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-sm">
            <FileCheck className="w-3 h-3" /> {t.check}
          </span>
        );
      case 'virement':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
            <Landmark className="w-3 h-3" /> {t.transfer}
          </span>
        );
      case 'carte':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm">
            <CreditCard className="w-3 h-3" /> {t.card}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.caisse}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {isArabic ? 'سجل المداخيل اليومية بالكاش والشيكات' : 'Journal des paiements reçus (Espèces, Chèques, Virements).'}
          </p>
        </div>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>{t.collectBtn}</span>
        </button>
      </div>

      {/* KPI strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>{t.cash}</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-600 mt-1">
            {formatDH(totalEspeces)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>{t.check}</span>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatDH(totalCheques)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>{t.transfer}</span>
            <Landmark className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatDH(totalVirements)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>{t.card}</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatDH(totalCB)}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث برقم الوصل، الزبون، أو رقم الشيك...' : 'Rechercher un reçu, un client, un numéro de chèque...'}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start sm:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.allFilter} ({payments.length})
          </button>
          <button
            onClick={() => setFilterMode('especes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filterMode === 'especes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.cash}
          </button>
          <button
            onClick={() => setFilterMode('cheque')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filterMode === 'cheque' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.check}
          </button>
          <button
            onClick={() => setFilterMode('virement')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filterMode === 'virement' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.transfer}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{isArabic ? 'رقم الوصل' : 'N° Reçu'}</th>
                <th className="py-3 px-4">{isArabic ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{t.thClient}</th>
                <th className="py-3 px-4">{t.paymentMethod}</th>
                <th className="py-3 px-4">{isArabic ? 'مرجع / ملاحظات' : 'Réf / Observations'}</th>
                <th className="py-3 px-4 text-right">{isArabic ? 'المبلغ المقبوض' : 'Montant Encaissé'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {isArabic ? 'لا توجد مداخيل مسجلة' : 'Aucun paiement trouvé.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const client = getClientById(payment.clientId);

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {payment.numeroRecu}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {payment.date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {client?.nomComplet || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getMethodBadge(payment.mode)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{payment.reference || '-'}</div>
                        {payment.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{payment.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                        {formatDH(payment.montant)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
