import React, { useState, useEffect } from 'react';
import { useGarage } from '../context/GarageContext';
import { PaymentMethod } from '../types/garage';
import { X, CreditCard, Banknote, Landmark, FileCheck, Check } from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    preselectedClientIdForPayment,
    setPreselectedClientIdForPayment,
    clients,
    interventions,
    getClientBalance,
    addPayment,
    t,
    isArabic,
    formatDH,
  } = useGarage();

  const [clientId, setClientId] = useState<string>('');
  const [interventionId, setInterventionId] = useState<string>('');
  const [montant, setMontant] = useState<number>(0);
  const [mode, setMode] = useState<PaymentMethod>('especes');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (preselectedClientIdForPayment) {
      setClientId(preselectedClientIdForPayment);
    } else if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [preselectedClientIdForPayment, clients, clientId]);

  const currentBalance = clientId ? getClientBalance(clientId) : null;
  const clientInterventions = clientId
    ? interventions.filter((i) => i.clientId === clientId && i.statut !== 'annule')
    : [];

  useEffect(() => {
    if (currentBalance && currentBalance.soldeDu > 0) {
      setMontant(currentBalance.soldeDu);
    }
  }, [clientId]);

  if (!isPaymentModalOpen) return null;

  const handleClose = () => {
    setIsPaymentModalOpen(false);
    setPreselectedClientIdForPayment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || montant <= 0) return;

    addPayment({
      numeroRecu: '',
      clientId,
      interventionId: interventionId || undefined,
      montant,
      mode,
      date,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t.paymentModalTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.paymentModalSubtitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.clientDebtor}
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setInterventionId('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              required
            >
              {clients.map((c) => {
                const bal = getClientBalance(c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.nomComplet} — {isArabic ? 'باقي مسال :' : 'Reste dû :'} {formatDH(bal.soldeDu)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Balance Notice */}
          {currentBalance && (
            <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500">{isArabic ? 'الفاتورة :' : 'Facturé :'} </span>
                <span className="font-bold text-slate-800">{formatDH(currentBalance.totalFacture)}</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500">{isArabic ? 'خالص :' : 'Payé :'} </span>
                <span className="font-bold text-emerald-600">{formatDH(currentBalance.totalPaye)}</span>
              </div>
              <div className="font-bold">
                <span className={currentBalance.soldeDu > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {currentBalance.soldeDu > 0
                    ? `${isArabic ? 'باقي عليه :' : 'Reste dû :'} ${formatDH(currentBalance.soldeDu)}`
                    : t.settledBadge}
                </span>
              </div>
            </div>
          )}

          {/* Montant avec raccourcis */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {t.amountReceived}
              </label>
              {currentBalance && currentBalance.soldeDu > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMontant(currentBalance.soldeDu)}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold rounded-xs cursor-pointer"
                  >
                    {t.fullBalance} ({formatDH(currentBalance.soldeDu)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMontant(Math.round((currentBalance.soldeDu / 2) * 100) / 100)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-xs cursor-pointer"
                  >
                    50%
                  </button>
                </div>
              )}
            </div>
            <input
              type="number"
              step="1"
              min="1"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-lg font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              required
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {t.paymentMethod}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'especes', label: t.cash, icon: Banknote },
                { id: 'cheque', label: t.check, icon: FileCheck },
                { id: 'virement', label: t.transfer, icon: Landmark },
                { id: 'carte', label: t.card, icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as PaymentMethod)}
                    className={`p-2.5 border rounded-lg flex flex-col items-center gap-1 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 text-slate-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mode === 'cheque'
                  ? isArabic ? 'رقم الشيك والبنك' : 'N° de chèque & Banque'
                  : isArabic ? 'رقم الوصل أو المعاملة' : 'N° de reçu ou référence'}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: CHQ Attijari 89234"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.paymentDate}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={montant <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.validatePayment}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
