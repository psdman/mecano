import React, { useState } from 'react';
import { Intervention } from '../types/garage';
import { useGarage } from '../context/GarageContext';
import { LicensePlate } from './LicensePlate';
import { X, Printer, Wrench, CheckCircle, MessageCircle, Pencil } from 'lucide-react';

interface InterventionDetailModalProps {
  intervention: Intervention | null;
  onClose: () => void;
}

export const InterventionDetailModal: React.FC<InterventionDetailModalProps> = ({
  intervention,
  onClose,
}) => {
  const { getClientById, getVehicleById, updateIntervention, formatDH, isArabic, t, settings } = useGarage();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    motif: '', diagnostic: '', kilometrage: 0,
    statut: 'en_cours' as Intervention['statut'],
    pieces: [] as Intervention['pieces'],
  });
  const [newPart, setNewPart] = useState({ designation: '', quantite: 1, prixUnitaireHT: 0 });

  if (!intervention) return null;

  const client = getClientById(intervention.clientId);
  const vehicle = getVehicleById(intervention.vehiculeId);

  const startEdit = () => {
    setEditForm({
      motif: intervention.motif,
      diagnostic: intervention.diagnostic || '',
      kilometrage: intervention.kilometrage || 0,
      statut: intervention.statut,
      pieces: intervention.pieces.map((p) => ({ ...p })),
    });
    setNewPart({ designation: '', quantite: 1, prixUnitaireHT: 0 });
    setEditing(true);
  };
  const addPart = () => {
    if (!newPart.designation.trim()) return;
    setEditForm({
      ...editForm,
      pieces: [...editForm.pieces, {
        id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        designation: newPart.designation.trim(),
        quantite: newPart.quantite,
        prixUnitaireHT: newPart.prixUnitaireHT,
        totalHT: Math.round(newPart.quantite * newPart.prixUnitaireHT * 100) / 100,
      }],
    });
    setNewPart({ designation: '', quantite: 1, prixUnitaireHT: 0 });
  };
  const removePart = (idx: number) => {
    setEditForm({ ...editForm, pieces: editForm.pieces.filter((_, i) => i !== idx) });
  };
  const saveEdit = () => {
    updateIntervention(intervention.id, {
      motif: editForm.motif,
      diagnostic: editForm.diagnostic || undefined,
      kilometrage: editForm.kilometrage || undefined,
      statut: editForm.statut,
      pieces: editForm.pieces,
    });
    setEditing(false);
  };

  const handleMarkAsFacture = () => {
    updateIntervention(intervention.id, { statut: 'facture', dateFin: new Date().toISOString().split('T')[0] });
  };

  const handlePrint = () => {
    window.print();
  };

  const sendWhatsAppInvoice = () => {
    if (!client) return;
    const phoneClean = client.telephone.replace(/[^0-9]/g, '');
    const phoneFormatted = phoneClean.startsWith('0') ? `212${phoneClean.slice(1)}` : phoneClean;
    const message = isArabic
      ? `السلام عليكم سي ${client.prenom || client.nom}، تفاصيل إصلاح سيارتكم ${vehicle?.immatriculation || ''} : ${intervention.motif}. المجموع الإجمالي الصافي: ${formatDH(intervention.totalTTC)}. كراج ميكانيك السيارات.`
      : `Bonjour M. ${client.nomComplet}, facture d’intervention pour votre véhicule ${vehicle?.immatriculation || ''} : ${intervention.motif}. Total à régler : ${formatDH(intervention.totalTTC)}. Garage Mécanique.`;

    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <div className="bg-white min-h-screen max-w-4xl w-full mx-auto border-x border-slate-200 shadow-sm">
        {/* Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isArabic ? 'ورقة الإصلاح / الفاتورة' : 'Ordre de Réparation / Facture'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {intervention.numeroIntervention}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={editing ? saveEdit : startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editing ? (isArabic ? 'حفظ' : 'Enregistrer') : (isArabic ? 'تعديل' : 'Modifier')}</span>
            </button>
            {client?.telephone && (
              <button
                onClick={sendWhatsAppInvoice}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
            {intervention.statut !== 'facture' && (
              <button
                onClick={handleMarkAsFacture}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تأكيد الإنجاز والخروج' : 'Marquer comme Facturé'}</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isArabic ? 'طباعة' : 'Imprimer'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div className="print-area p-8 space-y-6 text-slate-900 bg-white">
          <div className="print-pad">
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                {settings.garageLogo ? (
                  <img src={settings.garageLogo} alt="logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                    <Wrench className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <span className="text-lg font-extrabold tracking-tight block">{settings.garageNom || t.garageTitle}</span>
                  <span className="text-[10px] text-slate-500">{t.generalMech}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {settings.garageAdresse && <>{settings.garageAdresse}<br /></>}
                {settings.garageTelephone && <>Tél : {settings.garageTelephone}</>}
                {settings.garageEmail && <> · {settings.garageEmail}</>}
                {!settings.garageAdresse && !settings.garageTelephone && !settings.garageEmail && (
                  <>{t.cityCountry} · Tél: +212 5 22 00 11 22 / WhatsApp: +212 6 61 00 11 22</>
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs min-w-[240px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {isArabic ? 'الزبون (صاحب السيارة)' : 'Client (Propriétaire)'}
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {client?.nomComplet || 'Client Inconnu'}
              </div>
              <div className="text-slate-600 mt-1 font-mono">
                {client?.telephone && <div>Tél : {client.telephone}</div>}
                {client?.adresse && <div>{client.adresse}</div>}
              </div>
            </div>
          </div>

          {/* Vehicle Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">{isArabic ? 'رقم الإصلاح' : 'N° INTERVENTION'}</span>
              <span className="font-bold text-slate-900">{intervention.numeroIntervention}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">{isArabic ? 'الماتريكول' : 'VÉHICULE & MATRICULE'}</span>
              {vehicle?.immatriculation ? (
                <LicensePlate value={vehicle.immatriculation} className="font-bold text-slate-900" />
              ) : (
                <span className="font-bold text-slate-400">-</span>
              )}
              <span className="text-slate-500 text-[10px] block font-sans">
                {vehicle ? `${vehicle.marque} ${vehicle.modele}` : ''}
              </span>
              {vehicle?.vin && (
                <span className="text-slate-500 text-[10px] block font-sans">
                  {isArabic ? 'رقم الهيكل' : 'VIN'} : {vehicle.vin}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">{isArabic ? 'العداد' : 'KILOMÉTRAGE'}</span>
              <span className="font-bold text-slate-900">
                {intervention.kilometrage ? `${intervention.kilometrage.toLocaleString()} km` : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">{isArabic ? 'التاريخ' : 'DATE'}</span>
              <span className="font-bold text-slate-900">{intervention.dateDebut}</span>
            </div>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">{isArabic ? 'الخدمة المطلوبة' : 'Motif'}</label>
                <input value={editForm.motif} onChange={(e) => setEditForm({ ...editForm, motif: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">{isArabic ? 'التشخيص' : 'Diagnostic'}</label>
                <input value={editForm.diagnostic} onChange={(e) => setEditForm({ ...editForm, diagnostic: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isArabic ? 'العداد (km)' : 'Kilométrage'}</label>
                <input type="number" value={editForm.kilometrage} onChange={(e) => setEditForm({ ...editForm, kilometrage: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isArabic ? 'الحالة' : 'Statut'}</label>
                <select value={editForm.statut} onChange={(e) => setEditForm({ ...editForm, statut: e.target.value as Intervention['statut'] })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md">
                  <option value="en_cours">{isArabic ? 'قيد الإصلاح' : 'En cours'}</option>
                  <option value="termine">{isArabic ? 'منتهي' : 'Terminé'}</option>
                  <option value="facture">{isArabic ? 'تمت الفوترة' : 'Facturé'}</option>
                  <option value="annule">{isArabic ? 'ملغى' : 'Annulé'}</option>
                </select>
              </div>
              {/* Pièces : ajout / suppression */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">{isArabic ? 'قطع الغيار' : 'Pièces détachées'}</label>
                <div className="space-y-1.5 mb-2">
                  {editForm.pieces.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-md px-2 py-1.5">
                      <span className="flex-1 font-medium">{p.designation}</span>
                      <span className="font-mono text-slate-500">x{p.quantite}</span>
                      <span className="font-mono font-bold">{formatDH(p.totalHT)}</span>
                      <button onClick={() => removePart(i)} className="text-red-500 hover:text-red-700 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_70px_90px_auto] gap-2">
                  <input placeholder={isArabic ? 'تسمية القطعة' : 'Désignation'} value={newPart.designation}
                    onChange={(e) => setNewPart({ ...newPart, designation: e.target.value })}
                    className="px-2 py-1.5 border border-slate-300 rounded-md text-xs" />
                  <input type="number" min="1" value={newPart.quantite}
                    onChange={(e) => setNewPart({ ...newPart, quantite: Number(e.target.value) })}
                    className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono" />
                  <input type="number" min="0" placeholder="Prix HT" value={newPart.prixUnitaireHT || ''}
                    onChange={(e) => setNewPart({ ...newPart, prixUnitaireHT: Number(e.target.value) })}
                    className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono" />
                  <button onClick={addPart} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-md cursor-pointer">+</button>
                </div>
              </div>
            </div>
          ) : (
          <div className="text-xs space-y-1">
            <div>
              <span className="font-bold text-slate-700">{isArabic ? 'الخدمة المطلوبة : ' : 'Motif : '}</span>
              <span className="text-slate-900 font-medium">{intervention.motif}</span>
            </div>
            {intervention.diagnostic && (
              <div>
                <span className="font-bold text-slate-700">{isArabic ? 'تشخيص المعلم : ' : 'Diagnostic : '}</span>
                <span className="text-slate-600">{intervention.diagnostic}</span>
              </div>
            )}
          </div>
          )}

          {/* Parts Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{t.partDesignation}</th>
                  <th className="py-2.5 px-3 text-center">{t.qty}</th>
                  <th className="py-2.5 px-3 text-right">{t.unitPrice}</th>
                  <th className="py-2.5 px-3 text-right">{t.lineTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {intervention.pieces.map((part, index) => (
                  <tr key={index}>
                    <td className="py-2 px-3 text-slate-800">{part.designation}</td>
                    <td className="py-2 px-3 text-center font-mono">{part.quantite}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatDH(part.prixUnitaireHT)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatDH(part.totalHT)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/50">
                  <td className="py-2 px-3 text-slate-800 font-bold">{t.totalLabor}</td>
                  <td className="py-2 px-3 text-center font-mono text-slate-400">—</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {formatDH(intervention.totalMainDOeuvreHT)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{t.totalParts}</span>
                <span className="font-mono">{formatDH(intervention.totalPiecesHT)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{t.totalLabor}</span>
                <span className="font-mono">{formatDH(intervention.totalMainDOeuvreHT)}</span>
              </div>
              {intervention.remiseHT > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
                  <span>{t.discount}</span>
                  <span className="font-mono">-{formatDH(intervention.remiseHT)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-base font-extrabold">
                <span>{t.netTotal}</span>
                <span className="font-mono text-slate-900">{formatDH(intervention.totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
            <div>
              <span className="block font-bold text-slate-700">{t.mechanicSignature} :</span>
              <div className="h-16 mt-2 border border-dashed border-slate-300 rounded-md flex items-end p-2 text-[10px] text-slate-400">
                Garage Mécanique Maroc
              </div>
            </div>
            <div>
              <span className="block font-bold text-slate-700">{t.customerSignature} :</span>
              <div className="h-16 mt-2 border border-dashed border-slate-300 rounded-md flex items-end p-2 text-[10px] text-slate-400">
                {isArabic ? 'موافق على الإصلاح' : 'Bon pour accord'}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
