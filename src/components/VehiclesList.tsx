import React, { useState } from 'react';
import { useGarage } from '../context/GarageContext';
import { LicensePlate } from './LicensePlate';
import {
  Car,
  Search,
  Plus,
  User,
  Calendar,
  Gauge,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Vehicle } from '../types/garage';

export const VehiclesList: React.FC = () => {
  const {
    vehicles,
    interventions,
    getClientById,
    setActiveTab,
    updateVehicle,
    deleteVehicle,
    formatDH,
    isArabic,
    t,
  } = useGarage();

  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState({ immatriculation: '', marque: '', modele: '', vin: '', carburant: '', kilometrageActuel: 0, notes: '' });

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setEditForm({
      immatriculation: v.immatriculation, marque: v.marque, modele: v.modele,
      vin: v.vin || '', carburant: v.carburant || '', kilometrageActuel: v.kilometrageActuel || 0,
      notes: v.notes || '',
    });
  };
  const saveEdit = () => {
    if (!editing) return;
    updateVehicle(editing.id, { ...editForm, kilometrageActuel: Number(editForm.kilometrageActuel) || undefined });
    setEditing(null);
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const client = getClientById(v.clientId);

    return (
      v.immatriculation.toLowerCase().includes(q) ||
      v.marque.toLowerCase().includes(q) ||
      v.modele.toLowerCase().includes(q) ||
      (v.vin && v.vin.toLowerCase().includes(q)) ||
      (client && client.nomComplet.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.vehicles}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {isArabic ? 'لائحة سيارات الكراج مع الماتريكول وأصحابها وسجل الإصلاح' : 'Véhicules enregistrés, affectation aux propriétaires et historique d’entretien.'}
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث بالماتريكول، الماركة، أو الموديل...' : 'Rechercher par immatriculation, marque, modèle, VIN...'}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            {isArabic ? 'لا توجد سيارات مطابقة' : 'Aucun véhicule trouvé.'}
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const client = getClientById(vehicle.clientId);
            const vehicleInterventions = interventions.filter((i) => i.vehiculeId === vehicle.id);
            const totalRepairsAmount = vehicleInterventions.reduce((sum, i) => sum + i.totalTTC, 0);

            return (
              <div
                key={vehicle.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {vehicle.photoVehiculeUrl ? (
                      <img
                        src={vehicle.photoVehiculeUrl}
                        alt={`${vehicle.marque} ${vehicle.modele}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Car className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                        <span className="text-xs text-slate-400 font-mono">
                          {vehicle.marque} {vehicle.modele}
                        </span>
                      </div>
                    )}

                    {/* Moroccan license plate sticker */}
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs text-slate-900 font-mono font-extrabold text-xs px-2.5 py-1 rounded-sm shadow-sm border border-slate-300">
                      <LicensePlate value={vehicle.immatriculation} className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-sm border border-slate-300" />
                    </div>

                    {vehicle.carburant && (
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
                        {vehicle.carburant}
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {vehicle.marque} {vehicle.modele}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        VIN : {vehicle.vin || '-'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">{isArabic ? 'صاحب السيارة :' : 'Propriétaire :'}</span>
                      <span className="font-bold text-slate-800">
                        {client?.nomComplet || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vehicle.kilometrageActuel ? `${vehicle.kilometrageActuel.toLocaleString()} km` : '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>MEC: {vehicle.dateMiseEnCirculation || vehicle.annee || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isArabic ? 'الإصلاحات' : 'RÉPARATIONS'}</span>
                    <span className="font-extrabold text-slate-800">
                      {vehicleInterventions.length} {isArabic ? 'عملية' : 'intervention(s)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isArabic ? 'مجموع ما صرف' : 'TOTAL DÉPENSÉ'}</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {formatDH(totalRepairsAmount)}
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(vehicle)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer"
                    title={isArabic ? 'تعديل' : 'Modifier'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(isArabic ? 'حذف السيارة وكل إصلاحاتها؟' : 'Supprimer ce véhicule et ses interventions ?')) deleteVehicle(vehicle.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title={isArabic ? 'حذف' : 'Supprimer'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal édition véhicule */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">{isArabic ? 'تعديل السيارة' : 'Modifier le véhicule'}</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['immatriculation', isArabic ? 'الماتريكول' : 'Immatriculation'],
                ['marque', isArabic ? 'الماركة' : 'Marque'],
                ['modele', isArabic ? 'الموديل' : 'Modèle'],
                ['vin', 'VIN'],
                ['carburant', isArabic ? 'الوقود' : 'Carburant'],
                ['kilometrageActuel', isArabic ? 'العداد (km)' : 'Kilométrage'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                  <input
                    type={key === 'kilometrageActuel' ? 'number' : 'text'}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: key === 'kilometrageActuel' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">{isArabic ? 'ملاحظات' : 'Notes'}</label>
                <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg cursor-pointer">{isArabic ? 'إلغاء' : 'Annuler'}</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer">{isArabic ? 'حفظ' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
