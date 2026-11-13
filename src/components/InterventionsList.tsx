import React, { useState } from 'react';
import { useGarage } from '../context/GarageContext';
import { InterventionDetailModal } from './InterventionDetailModal';
import { LicensePlate } from './LicensePlate';
import { Intervention, InterventionStatus } from '../types/garage';
import {
  Search,
  Plus,
  Calendar,
  Eye,
  Trash2,
} from 'lucide-react';

export const InterventionsList: React.FC = () => {
  const {
    interventions,
    getClientById,
    getVehicleById,
    deleteIntervention,
    setActiveTab,
    formatDH,
    isArabic,
    t,
  } = useGarage();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InterventionStatus>('all');
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  const filteredInterventions = interventions.filter((i) => {
    if (statusFilter !== 'all' && i.statut !== statusFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const vehicle = getVehicleById(i.vehiculeId);
    const client = getClientById(i.clientId);

    return (
      i.numeroIntervention.toLowerCase().includes(q) ||
      i.motif.toLowerCase().includes(q) ||
      (vehicle && vehicle.immatriculation.toLowerCase().includes(q)) ||
      (client && client.nomComplet.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.interventions}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {isArabic ? 'سجل عمليات الإصلاح، قطع الغيار، وخدمة يد المعلم' : 'Historique des travaux mécaniques et des pièces détachées changées.'}
          </p>
        </div>
        <button
          onClick={() => setActiveTab('workflow')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>{t.newEntry}</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث بالماتريكول، الزبون، أو العطب...' : 'Rechercher par immatriculation, numéro, client ou motif...'}
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
            {t.allFilter} ({interventions.length})
          </button>
          <button
            onClick={() => setStatusFilter('en_cours')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              statusFilter === 'en_cours' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {isArabic ? 'قيد العمل' : 'En cours'}
          </button>
          <button
            onClick={() => setStatusFilter('facture')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              statusFilter === 'facture' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {isArabic ? 'تمت الفوترة' : 'Facturées'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{isArabic ? 'رقم الوصل' : 'N° Réparation'}</th>
                <th className="py-3 px-4">{isArabic ? 'السيارة والماتريكول' : 'Véhicule'}</th>
                <th className="py-3 px-4">{t.thClient}</th>
                <th className="py-3 px-4">{isArabic ? 'الخدمة والقطع' : 'Travaux & Pièces'}</th>
                <th className="py-3 px-4">{isArabic ? 'الحالة' : 'Statut'}</th>
                <th className="py-3 px-4 text-right">{t.netTotal}</th>
                <th className="py-3 px-4 text-center">{t.thActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInterventions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isArabic ? 'لا توجد إصلاحات مطابقة' : 'Aucune intervention trouvée.'}
                  </td>
                </tr>
              ) : (
                filteredInterventions.map((intervention) => {
                  const vehicle = getVehicleById(intervention.vehiculeId);
                  const client = getClientById(intervention.clientId);

                  return (
                    <tr key={intervention.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{intervention.numeroIntervention}</div>
                        <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{intervention.dateDebut}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <LicensePlate value={vehicle?.immatriculation} className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm inline-block" />
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {vehicle ? `${vehicle.marque} ${vehicle.modele}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {client?.nomComplet || 'Client Inconnu'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {client?.telephone || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 max-w-xs truncate">
                          {intervention.motif}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span>{intervention.pieces.length} {isArabic ? 'قطع مبدلة' : 'pièce(s)'}</span>
                          <span className="mx-1">·</span>
                          <span>{formatDH(intervention.totalMainDOeuvreHT)} {isArabic ? 'يد المعلم' : 'MO'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {intervention.statut === 'en_cours' ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">
                            {isArabic ? 'قيد الإصلاح' : 'En cours'}
                          </span>
                        ) : intervention.statut === 'facture' ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                            {isArabic ? 'تمت الفوترة' : 'Facturé'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                            {intervention.statut}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatDH(intervention.totalTTC)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedIntervention(intervention)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'معاينة' : 'Fiche'}</span>
                        </button>
                        <button
                          onClick={() => { if (confirm(isArabic ? 'حذف أمر الإصلاح؟' : 'Supprimer cette intervention ?')) deleteIntervention(intervention.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title={isArabic ? 'حذف' : 'Supprimer'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InterventionDetailModal
        intervention={selectedIntervention}
        onClose={() => setSelectedIntervention(null)}
      />
    </div>
  );
};
