import React, { useState } from 'react';
import { useGarage } from '../context/GarageContext';
import { Client } from '../types/garage';
import {
  Search,
  Plus,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MapPin,
  Car,
  Printer,
  X,
  MessageCircle,
} from 'lucide-react';

export const ClientsBalances: React.FC = () => {
  const {
    clients,
    vehicles,
    interventions,
    payments,
    getClientBalance,
    setIsPaymentModalOpen,
    setPreselectedClientIdForPayment,
    t,
    isArabic,
    formatDH,
  } = useGarage();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled' | 'credit'>('all');
  const [selectedClientForStatement, setSelectedClientForStatement] = useState<Client | null>(null);

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newAdresse, setNewAdresse] = useState('');
  const { addClient } = useGarage();

  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    addClient({
      nom: newNom.trim(),
      prenom: newPrenom.trim(),
      nomComplet: `${newPrenom.trim()} ${newNom.trim()}`.trim(),
      telephone: newTel.trim(),
      adresse: newAdresse.trim() || undefined,
    });
    setNewNom('');
    setNewPrenom('');
    setNewTel('');
    setNewAdresse('');
    setIsNewClientModalOpen(false);
  };

  const filteredClients = clients.filter((client) => {
    const balance = getClientBalance(client.id);

    if (statusFilter === 'pending' && balance.soldeDu <= 0.01) return false;
    if (statusFilter === 'settled' && Math.abs(balance.soldeDu) > 0.01) return false;
    if (statusFilter === 'credit' && balance.soldeDu >= -0.01) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const clientVehicles = vehicles.filter((v) => v.clientId === client.id);
    const platesMatch = clientVehicles.some((v) => v.immatriculation.toLowerCase().includes(q));

    return (
      client.nomComplet.toLowerCase().includes(q) ||
      client.telephone.toLowerCase().includes(q) ||
      (client.adresse && client.adresse.toLowerCase().includes(q)) ||
      platesMatch
    );
  });

  const totalReceivables = clients.reduce((sum, c) => {
    const bal = getClientBalance(c.id);
    return sum + (bal.soldeDu > 0 ? bal.soldeDu : 0);
  }, 0);

  const totalInvoiced = clients.reduce((sum, c) => sum + getClientBalance(c.id).totalFacture, 0);
  const totalPaid = clients.reduce((sum, c) => sum + getClientBalance(c.id).totalPaye, 0);

  const handleOpenPaymentForClient = (clientId: string) => {
    setPreselectedClientIdForPayment(clientId);
    setIsPaymentModalOpen(true);
  };

  const openWhatsAppForClient = (client: Client, balanceDue: number) => {
    const phoneClean = client.telephone.replace(/[^0-9]/g, '');
    const phoneFormatted = phoneClean.startsWith('0') ? `212${phoneClean.slice(1)}` : phoneClean;
    const message = isArabic
      ? `السلام عليكم سي ${client.prenom || client.nom}، كراج ميكانيك السيارات. نود تذكيركم بأن رصيد حسابكم المتبقي هو ${formatDH(balanceDue)}. شكراً لكم !`
      : `Bonjour M. ${client.nomComplet}, de la part de votre garage mécanique. Nous vous informons que le reste dû sur votre compte est de ${formatDH(balanceDue)}. Merci !`;

    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.clientBalancesTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t.clientBalancesSubtitle}
          </p>
        </div>
        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>+ {isArabic ? 'زبون جديد' : 'Nouveau Client'}</span>
        </button>
      </div>

      {/* KPI Cards in DH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-red-100 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-bold">{t.totalDebts}</span>
          <div className="text-2xl font-extrabold font-mono text-red-600 mt-1">
            {formatDH(totalReceivables)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isArabic ? 'مجموع ما يجب استخلاصه من الزبناء' : 'Créances atelier à encaisser'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-bold">{t.totalInvoicedShop}</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            {formatDH(totalInvoiced)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isArabic ? 'مجموع ما تم إصلاحه وتغييره' : 'Total des ordres de réparation'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-bold">{t.totalPaidShop}</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
            {formatDH(totalPaid)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isArabic ? 'مجموع ما تم قبضه نقداً أو شيك' : 'Paiements déjà perçus'}
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.allFilter} ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              statusFilter === 'pending' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.pendingFilter}
          </button>
          <button
            onClick={() => setStatusFilter('settled')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              statusFilter === 'settled' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.settledFilter}
          </button>
        </div>
      </div>

      {/* Table of Clients */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t.thClient}</th>
                <th className="py-3 px-4">{t.thContact}</th>
                <th className="py-3 px-4">{t.thVehicles}</th>
                <th className="py-3 px-4 text-right">{t.thInvoiced}</th>
                <th className="py-3 px-4 text-right">{t.thPaid}</th>
                <th className="py-3 px-4 text-right">{t.thBalanceDue}</th>
                <th className="py-3 px-4 text-center">{t.thActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isArabic ? 'لا توجد نتائج' : 'Aucun client trouvé.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const balance = getClientBalance(client.id);
                  const clientVehicles = vehicles.filter((v) => v.clientId === client.id);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {client.nom.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {client.nomComplet}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              #{client.id.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{client.telephone}</span>
                          </div>
                          {client.adresse && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{client.adresse}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {clientVehicles.map((v) => (
                            <div
                              key={v.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-sm text-xs font-mono font-bold text-slate-800 mr-1"
                            >
                              <Car className="w-3 h-3 text-slate-500" />
                              <span>{v.immatriculation}</span>
                              <span className="font-sans font-normal text-slate-500 text-[10px]">
                                ({v.marque} {v.modele})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatDH(balance.totalFacture)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatDH(balance.totalPaye)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm">
                        {balance.soldeDu > 0 ? (
                          <span className="text-red-600">{formatDH(balance.soldeDu)}</span>
                        ) : (
                          <span className="text-emerald-600">{t.settledBadge}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPaymentForClient(client.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{t.collectBtn}</span>
                          </button>
                          {balance.soldeDu > 0 && (
                            <button
                              onClick={() => openWhatsAppForClient(client, balance.soldeDu)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title={t.sendWhatsApp}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedClientForStatement(client)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Statement Modal */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedClientForStatement.nomComplet}
                </h3>
                <p className="text-xs text-slate-500">{selectedClientForStatement.telephone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-slate-500 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedClientForStatement(null)}
                  className="p-2 text-slate-500 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-xs font-bold text-slate-600">{t.thBalanceDue} :</span>
                <span className="text-xl font-mono font-extrabold text-red-600">
                  {formatDH(getClientBalance(selectedClientForStatement.id).soldeDu)}
                </span>
              </div>

              {/* Interventions */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800 mb-2">{t.interventions}</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Détail</th>
                        <th className="p-2.5 text-right">{t.thInvoiced}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {interventions
                        .filter((i) => i.clientId === selectedClientForStatement.id)
                        .map((i) => (
                          <tr key={i.id}>
                            <td className="p-2.5 font-mono">{i.dateDebut}</td>
                            <td className="p-2.5">{i.numeroIntervention} · {i.motif}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {formatDH(i.totalTTC)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800 mb-2">{t.caisse}</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Mode</th>
                        <th className="p-2.5 text-right">{t.thPaid}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {payments
                        .filter((p) => p.clientId === selectedClientForStatement.id)
                        .map((p) => (
                          <tr key={p.id}>
                            <td className="p-2.5 font-mono">{p.date}</td>
                            <td className="p-2.5">{p.numeroRecu} ({p.mode})</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                              {formatDH(p.montant)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{t.newClientOption}</h3>
              <button onClick={() => setIsNewClientModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickClient} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.ownerName} *</label>
                  <input
                    type="text"
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    required
                    placeholder="Nom de famille"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.ownerFirstName}</label>
                  <input
                    type="text"
                    value={newPrenom}
                    onChange={(e) => setNewPrenom(e.target.value)}
                    placeholder="Prénom"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.phoneLabel}</label>
                <input
                  type="tel"
                  value={newTel}
                  onChange={(e) => setNewTel(e.target.value)}
                  required
                  placeholder="06 61 00 00 00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.address}</label>
                <input
                  type="text"
                  value={newAdresse}
                  onChange={(e) => setNewAdresse(e.target.value)}
                  placeholder="Casablanca"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewClientModalOpen(false)} className="px-3 py-2 border border-slate-300 text-xs rounded-lg cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer">
                  {isArabic ? 'حفظ الزبون' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
