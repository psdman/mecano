import React, { useState, useEffect } from 'react';
import { useGarage } from '../context/GarageContext';
import { CameraCaptureModal } from './CameraCaptureModal';
import { LicensePlate } from './LicensePlate';
import {
  calculateInterventionTotals,
  formatMoroccanLicensePlate,
} from '../utils/garageCalculations';
import { COMMON_MOROCCAN_PARTS } from '../utils/translations';
import { suggestCorrection } from '../utils/spellcheck';
import { compressImageForUpload } from '../utils/imageCompress';
import { extractVehicleDataLocal } from '../utils/ocrExtract';
import { ReplacedPart, PaymentMethod } from '../types/garage';
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Car,
  FileText,
  User,
  Wrench,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  SpellCheck,
} from 'lucide-react';

export const WorkflowScanner: React.FC = () => {
  const {
    clients,
    addClient,
    addVehicle,
    addIntervention,
    addPayment,
    setActiveTab,
    setPreselectedClientIdForPayment,
    t,
    isArabic,
    formatDH,
    settings,
  } = useGarage();

  // Applique les réglages admin (taux horaire, remise, TVA, acompte) quand ils sont chargés
  useEffect(() => {
    const n = (k: string) => settings[k] !== undefined ? Number(settings[k]) : NaN;
    if (!isNaN(n('mainDOeuvreMontant'))) setMainDOeuvreMontant(n('mainDOeuvreMontant'));
    if (!isNaN(n('remiseHT'))) setRemiseHT(n('remiseHT'));
    if (!isNaN(n('tauxTva'))) setTauxTva(n('tauxTva'));
    if (!isNaN(n('depositAmount'))) setDepositAmount(n('depositAmount'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Photos
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const [carteGrisePhoto, setCarteGrisePhoto] = useState<string | null>(null);
  const [carteGriseVersoPhoto, setCarteGriseVersoPhoto] = useState<string | null>(null);

  // Camera modal
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'vehicle' | 'carteGrise' | 'carteGriseVerso'>('vehicle');

  // OCR state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Step 2 detected fields
  const [detectedPlate, setDetectedPlate] = useState('');
  const [detectedNom, setDetectedNom] = useState('');
  const [detectedPrenom, setDetectedPrenom] = useState('');
  const [detectedAdresse, setDetectedAdresse] = useState('');
  const [detectedMarque, setDetectedMarque] = useState('');
  const [detectedModele, setDetectedModele] = useState('');
  const [detectedVin, setDetectedVin] = useState('');
  const [detectedDateMec, setDetectedDateMec] = useState('');
  const [detectedCarburant, setDetectedCarburant] = useState('');

  // Step 3 Client & Vehicle
  const [selectedClientId, setSelectedClientId] = useState<string>('new');
  const [clientTelephone, setClientTelephone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [vehicleKilometrage, setVehicleKilometrage] = useState<number>(0);
  const [vehicleNotes, setVehicleNotes] = useState('');

  // Step 4 Parts in Moroccan Dirhams (DH)
  const [interventionMotif, setInterventionMotif] = useState('');
  const [interventionDiagnostic, setInterventionDiagnostic] = useState('');
  const [parts, setParts] = useState<ReplacedPart[]>([]);
  const [mainDOeuvreMontant, setMainDOeuvreMontant] = useState<number>(120);
  const [remiseHT, setRemiseHT] = useState<number>(30);
  const [tauxTva, setTauxTva] = useState<number>(20);

  // Immediate deposit in DH
  const [withDeposit, setWithDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [depositMode, setDepositMode] = useState<PaymentMethod>('especes');

  // Confirmation
  const [createdRecords, setCreatedRecords] = useState<{
    clientId: string;
    vehicleId: string;
    interventionId: string;
  } | null>(null);

  const openCamera = (target: 'vehicle' | 'carteGrise' | 'carteGriseVerso') => {
    setCameraTarget(target);
    setCameraModalOpen(true);
  };

  const handleCameraCapture = (base64Data: string) => {
    if (cameraTarget === 'vehicle') {
      setVehiclePhoto(base64Data);
    } else if (cameraTarget === 'carteGriseVerso') {
      setCarteGriseVersoPhoto(base64Data);
    } else {
      setCarteGrisePhoto(base64Data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'vehicle' | 'carteGrise' | 'carteGriseVerso') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          if (target === 'vehicle') {
            setVehiclePhoto(reader.result as string);
          } else if (target === 'carteGriseVerso') {
            setCarteGriseVersoPhoto(reader.result as string);
          } else {
            setCarteGrisePhoto(reader.result as string);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Launch AI detection
  const handleRunAiDetection = async () => {
    if (!vehiclePhoto && !carteGrisePhoto) {
      setScanError(isArabic ? 'يرجى تحميل صورة الكارت كريس أو السيارة' : 'Veuillez charger au moins une photo pour le scan.');
      return;
    }

    setIsAnalyzing(true);
    setScanError(null);

    try {
      // Compresse les photos côté client (payload plus léger pour l'API)
      const [vehicleCompressed, carteGriseCompressed, carteGriseVersoCompressed] =
        await Promise.all([
          vehiclePhoto ? compressImageForUpload(vehiclePhoto) : null,
          carteGrisePhoto ? compressImageForUpload(carteGrisePhoto) : null,
          carteGriseVersoPhoto ? compressImageForUpload(carteGriseVersoPhoto) : null,
        ]);

      const response = await fetch('/api/scan-vehicle-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleImage: vehicleCompressed,
          carteGriseImage: carteGriseCompressed,
          carteGriseVersoImage: carteGriseVersoCompressed,
        }),
      });

      const rawText = await response.text();
      let resData: any;
      try {
        resData = JSON.parse(rawText);
      } catch {
        throw new Error(
          isArabic
            ? 'خطأ في الخادم. تأكد أن الخادم يعمل ثم حاول مرة أخرى.'
            : `Erreur serveur (HTTP ${response.status}). Vérifiez que le serveur est bien démarré.`
        );
      }

      if (resData.success && resData.data) {
        const d = resData.data;
        if (d.immatriculation) setDetectedPlate(formatMoroccanLicensePlate(d.immatriculation));
        if (d.nomProprietaire) setDetectedNom(d.nomProprietaire);
        if (d.prenomProprietaire) setDetectedPrenom(d.prenomProprietaire);
        if (d.adresseProprietaire) setDetectedAdresse(d.adresseProprietaire);
        if (d.marque) setDetectedMarque(d.marque);
        if (d.modele) setDetectedModele(d.modele);
        if (d.vin) setDetectedVin(d.vin);
        if (d.dateMiseEnCirculation) setDetectedDateMec(d.dateMiseEnCirculation);
        if (d.carburant) setDetectedCarburant(d.carburant);

        // Check matching client
        const fullName = `${d.prenomProprietaire || ''} ${d.nomProprietaire || ''}`.trim().toLowerCase();
        const existing = clients.find((c) =>
          c.nomComplet.toLowerCase().includes(fullName) ||
          c.nom.toLowerCase().includes((d.nomProprietaire || '').toLowerCase())
        );

        if (existing) {
          setSelectedClientId(existing.id);
          setClientTelephone(existing.telephone || '');
        } else {
          setSelectedClientId('new');
        }

        setCurrentStep(2);
      } else {
        throw new Error(resData.error || 'Erreur détection');
      }
    } catch (err: any) {
      // Fallback OCR local (Tesseract.js) quand les APIs vision échouent
      try {
        const localData = await extractVehicleDataLocal({
          carteGrise: carteGrisePhoto,
          carteGriseVerso: carteGriseVersoPhoto,
          vehicle: vehiclePhoto,
        });
        if (localData && (localData.immatriculation || localData.marque)) {
          if (localData.immatriculation) setDetectedPlate(formatMoroccanLicensePlate(localData.immatriculation));
          if (localData.nomProprietaire) setDetectedNom(localData.nomProprietaire);
          if (localData.prenomProprietaire) setDetectedPrenom(localData.prenomProprietaire);
          if (localData.adresseProprietaire) setDetectedAdresse(localData.adresseProprietaire);
          if (localData.marque) setDetectedMarque(localData.marque);
          if (localData.modele) setDetectedModele(localData.modele);
          if (localData.vin) setDetectedVin(localData.vin);
          if (localData.dateMiseEnCirculation) setDetectedDateMec(localData.dateMiseEnCirculation);
          if (localData.carburant) setDetectedCarburant(localData.carburant);

          const fullName = `${localData.prenomProprietaire || ''} ${localData.nomProprietaire || ''}`.trim().toLowerCase();
          const existing = clients.find((c) =>
            c.nomComplet.toLowerCase().includes(fullName) ||
            c.nom.toLowerCase().includes((localData.nomProprietaire || '').toLowerCase())
          );
          if (existing) {
            setSelectedClientId(existing.id);
            setClientTelephone(existing.telephone || '');
          } else {
            setSelectedClientId('new');
          }
          setScanError(
            isArabic
              ? 'تم الاستخراج محلياً — قد تكون بعض الحقول ناقصة، يرجى التحقق منها.'
              : 'Extraction locale (OCR) — certains champs peuvent être incomplets, vérifiez-les.'
          );
          setCurrentStep(2);
          return;
        }
      } catch {
        // OCR local a aussi échoué
      }
      setScanError(
        err?.message ||
          (isArabic
            ? 'فشل الكشف التلقائي. حاول مرة أخرى أو أدخل المعلومات يدويًا.'
            : 'La détection automatique a échoué. Réessayez ou saisissez les informations manuellement.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddPart = () => {
    const newPart: ReplacedPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      designation: '',
      reference: '',
      quantite: 1,
      prixUnitaireHT: 0,
      totalHT: 0,
    };
    setParts([...parts, newPart]);
  };

  const handleUpdatePart = (id: string, updates: Partial<ReplacedPart>) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        updated.totalHT = Math.round(updated.quantite * updated.prixUnitaireHT * 100) / 100;
        return updated;
      })
    );
  };

  const handleDeletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSelectQuickMoroccanPart = (id: string, item: (typeof COMMON_MOROCCAN_PARTS)[0]) => {
    handleUpdatePart(id, {
      designation: isArabic ? item.ar : item.fr,
      reference: item.ref,
      prixUnitaireHT: item.prix,
    });
  };

  // Totals
  const totals = calculateInterventionTotals(
    parts.map((p) => ({ quantite: p.quantite, prixUnitaireHT: p.prixUnitaireHT })),
    1,               // 1 "heure" factice : le montant MO est saisi directement
    mainDOeuvreMontant,
    remiseHT,
    tauxTva
  );

  const handleFinalSubmit = () => {
    let finalClientId = selectedClientId;

    if (selectedClientId === 'new') {
      const nomComplet = `${detectedPrenom} ${detectedNom}`.trim();
      const newClient = addClient({
        nom: detectedNom,
        prenom: detectedPrenom,
        nomComplet,
        telephone: clientTelephone,
        email: clientEmail || undefined,
        adresse: detectedAdresse,
      });
      finalClientId = newClient.id;
    }

    const newVehicle = addVehicle({
      clientId: finalClientId,
      immatriculation: formatMoroccanLicensePlate(detectedPlate),
      marque: detectedMarque,
      modele: detectedModele,
      vin: detectedVin,
      dateMiseEnCirculation: detectedDateMec,
      carburant: detectedCarburant,
      kilometrageActuel: vehicleKilometrage || undefined,
      photoVehiculeUrl: vehiclePhoto || undefined,
      photoCarteGriseUrl: carteGrisePhoto || undefined,
      photoCarteGriseVersoUrl: carteGriseVersoPhoto || undefined,
      notes: vehicleNotes,
    });

    const newIntervention = addIntervention({
      numeroIntervention: '',
      vehiculeId: newVehicle.id,
      clientId: finalClientId,
      dateDebut: new Date().toISOString().split('T')[0],
      statut: 'en_cours',
      motif: interventionMotif,
      diagnostic: interventionDiagnostic,
      kilometrage: vehicleKilometrage,
      pieces: parts.filter((p) => p.designation.trim() !== ''),
      mainDOeuvreHeures: mainDOeuvreMontant,
      tauxHoraireHT: 1,
      totalPiecesHT: totals.totalPiecesHT,
      totalMainDOeuvreHT: totals.totalMainDOeuvreHT,
      remiseHT: totals.remiseHT,
      totalHT: totals.totalHT,
      tauxTva: totals.tauxTva,
      totalTva: totals.totalTva,
      totalTTC: totals.totalTTC,
    });

    if (withDeposit && depositAmount > 0) {
      addPayment({
        numeroRecu: '',
        clientId: finalClientId,
        interventionId: newIntervention.id,
        montant: depositAmount,
        mode: depositMode,
        date: new Date().toISOString().split('T')[0],
        notes: `Avance versée pour ${newVehicle.immatriculation}`,
      });
    }

    setCreatedRecords({
      clientId: finalClientId,
      vehicleId: newVehicle.id,
      interventionId: newIntervention.id,
    });

    setCurrentStep(5);
  };

  // WhatsApp generator link
  const openWhatsAppShare = () => {
    const phoneClean = clientTelephone.replace(/[^0-9]/g, '');
    const phoneFormatted = phoneClean.startsWith('0') ? `212${phoneClean.slice(1)}` : phoneClean;
    const clientName = clients.find((c) => c.id === createdRecords?.clientId)?.nomComplet
      || `${detectedPrenom} ${detectedNom}`.trim() || 'Client';
    const firstName = clientName.split(' ')[0] || 'Client';
    const message = isArabic
      ? `السلام عليكم سي ${firstName}، طوموبيل ديالك (${detectedPlate}) تم تسجيلها في الكراج. مجموع الإصلاح: ${formatDH(totals.totalTTC)}. شكراً لك!`
      : `Bonjour M. ${firstName}, votre véhicule (${detectedPlate}) est bien pris en charge à notre atelier. Total réparation: ${formatDH(totals.totalTTC)}. Merci pour votre confiance !`;

    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Workflow Step Tracker */}
      <div className="mb-6 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>1</span>
            <span className="hidden sm:inline">{t.step1Title.split('.')[1]}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>2</span>
            <span className="hidden sm:inline">{t.step2Title.split(':')[0]}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>3</span>
            <span className="hidden sm:inline">{t.step3Title.split('.')[1]}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>4</span>
            <span className="hidden sm:inline">{t.step4Title.split('.')[1]}</span>
          </div>
        </div>
      </div>

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title={
          cameraTarget === 'vehicle'
            ? t.vehiclePhoto
            : cameraTarget === 'carteGriseVerso'
              ? `${t.carteGrisePhoto} — ${t.carteGriseVerso}`
              : `${t.carteGrisePhoto} — ${t.carteGriseRecto}`
        }
      />

      {/* ================= STEP 1: PHOTOS ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.step1Title}</h1>
              <p className="text-sm text-slate-600 mt-1">{t.step1Subtitle}</p>
            </div>
          </div>

          {scanError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{scanError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slot 1: Véhicule */}
            <div className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-800">
                  <Car className="w-4 h-4 text-amber-500" />
                  <span>{t.vehiclePhoto}</span>
                </div>
                {vehiclePhoto && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {t.ready}
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center items-center bg-slate-50 min-h-[220px]">
                {vehiclePhoto ? (
                  <div className="relative w-full h-52 rounded-lg overflow-hidden border border-slate-200">
                    <img src={vehiclePhoto} alt="Véhicule" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setVehiclePhoto(null)}
                      className="absolute top-2 right-2 px-2 py-1 bg-slate-950/80 hover:bg-red-600 text-white rounded-md text-xs cursor-pointer"
                    >
                      {t.deletePhoto}
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-4">{isArabic ? 'وجه السيارة مع البلاكة' : 'Face avant ou plaque visible'}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => openCamera('vehicle')}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>{t.takePhoto}</span>
                      </button>
                      <label className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>{t.upload}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'vehicle')} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Slot 2: Carte Grise */}
            <div className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-800">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>{t.carteGrisePhoto}</span>
                </div>
                {(carteGrisePhoto || carteGriseVersoPhoto) && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {t.ready}
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 bg-slate-50 min-h-[240px]">
                <div className="grid grid-cols-2 gap-3 h-full">
                  {([
                    { photo: carteGrisePhoto, label: t.carteGriseRecto, target: 'carteGrise' as const, clear: () => setCarteGrisePhoto(null) },
                    { photo: carteGriseVersoPhoto, label: t.carteGriseVerso, target: 'carteGriseVerso' as const, clear: () => setCarteGriseVersoPhoto(null) },
                  ]).map((side) => (
                    <div key={side.target} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">{side.label}</span>
                      <div className="flex-1 flex flex-col justify-center items-center bg-white border border-slate-200 rounded-lg p-2.5 min-h-[190px]">
                        {side.photo ? (
                          <div className="relative w-full h-40 rounded-md overflow-hidden border border-slate-200">
                            <img src={side.photo} alt={side.label} className="w-full h-full object-cover" />
                            <button
                              onClick={side.clear}
                              className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-slate-950/80 hover:bg-red-600 text-white rounded text-[10px] cursor-pointer"
                            >
                              {t.deletePhoto}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center p-2">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                onClick={() => openCamera(side.target)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-md cursor-pointer flex items-center gap-1"
                              >
                                <Camera className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.takePhoto}</span>
                              </button>
                              <label className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md cursor-pointer flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5 text-slate-500" />
                                <span>{t.upload}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, side.target)} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>{isArabic ? 'إدخال يدوي' : 'Saisie manuelle'}</span>
            </button>
            <button
              onClick={handleRunAiDetection}
              disabled={isAnalyzing || (!vehiclePhoto && !carteGrisePhoto)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.analyzing}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.runDetection}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: DÉTECTION ================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.step2Title}</h1>
              <p className="text-sm text-slate-600 mt-1">{t.step2Subtitle}</p>
            </div>
            <button onClick={() => setCurrentStep(1)} className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer">
              {t.retake}
            </button>
          </div>

          {/* Moroccan Plate Banner Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Authentic Moroccan Plate Styling */}
              <div className="flex items-center border-2 border-slate-700 bg-white text-slate-950 rounded-md overflow-hidden font-mono text-xl sm:text-2xl font-extrabold tracking-wider shadow-inner px-4 py-1.5">
                <span className="text-amber-600 mr-2 font-sans text-xs">🇲🇦</span>
                <LicensePlate value={detectedPlate} className="font-mono" />
              </div>
              <div>
                <div className="text-xs text-slate-400">{isArabic ? 'السيارة المكتشفة' : 'Véhicule détecté'}</div>
                <div className="text-base font-bold text-white">{detectedMarque} {detectedModele}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">{isArabic ? 'صاحب السيارة' : 'Propriétaire'}</div>
              <div className="text-base font-bold text-amber-400">{detectedPrenom} {detectedNom}</div>
            </div>
          </div>

          {/* Editable Details Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.matriculeLabel}</label>
                <input
                  type="text"
                  value={detectedPlate}
                  onChange={(e) => setDetectedPlate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.ownerName}</label>
                <input
                  type="text"
                  value={detectedNom}
                  onChange={(e) => setDetectedNom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.ownerFirstName}</label>
                <input
                  type="text"
                  value={detectedPrenom}
                  onChange={(e) => setDetectedPrenom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.brand}</label>
                <input
                  type="text"
                  value={detectedMarque}
                  onChange={(e) => setDetectedMarque(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.model}</label>
                <input
                  type="text"
                  value={detectedModele}
                  onChange={(e) => setDetectedModele(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.fuel}</label>
                <input
                  type="text"
                  value={detectedCarburant}
                  onChange={(e) => setDetectedCarburant(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.vin}</label>
                <input
                  type="text"
                  value={detectedVin}
                  onChange={(e) => setDetectedVin(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.address}</label>
                <input
                  type="text"
                  value={detectedAdresse}
                  onChange={(e) => setDetectedAdresse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isArabic ? 'تاريخ أول تسجيل' : 'Date de mise en circulation'}</label>
                <input
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  value={detectedDateMec}
                  onChange={(e) => setDetectedDateMec(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setCurrentStep(1)} className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer">
              Retour
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <span>{t.nextStep3}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: CLIENT & VÉHICULE ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.step3Title}</h1>
            <p className="text-sm text-slate-600 mt-1">{t.step3Subtitle}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedClientId('new')}
                className={`p-4 border rounded-xl text-left cursor-pointer transition-colors ${
                  selectedClientId === 'new' ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">{t.newClientOption}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {detectedPrenom} {detectedNom}
                </p>
              </button>

              <div className="p-3 border border-slate-200 rounded-xl flex flex-col justify-center">
                <label className="text-xs font-bold text-slate-700 mb-1">{t.existingClientOption}</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (e.target.value !== 'new') {
                      const found = clients.find((c) => c.id === e.target.value);
                      if (found) setClientTelephone(found.telephone);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="new">-- {t.newClientOption} ({detectedPrenom} {detectedNom}) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nomComplet} ({c.telephone})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Téléphone WhatsApp & Kilométrage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.phoneLabel}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={clientTelephone}
                    onChange={(e) => setClientTelephone(e.target.value)}
                    placeholder="06 61 00 00 00"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                    WhatsApp
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.mileageLabel}
                </label>
                <input
                  type="number"
                  value={vehicleKilometrage}
                  onChange={(e) => setVehicleKilometrage(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setCurrentStep(2)} className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer">
              Retour
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <span>{t.nextStep4}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: PIÈCES CHANGÉES AVEC PRIX ================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.step4Title}</h1>
            <p className="text-sm text-slate-600 mt-1">{t.step4Subtitle}</p>
          </div>

          {/* Motif */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1">{t.workDesc}</label>
            <input
              type="text"
              value={interventionMotif}
              onChange={(e) => setInterventionMotif(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>

          {/* 1-Click Common Moroccan Parts Quick Selector */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900">
                {isArabic ? '⚡ قطع غيار سريعة بضغطة زر :' : '⚡ Raccourcis pièces courantes Maroc :'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MOROCCAN_PARTS.slice(0, 8).map((cp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const newPart: ReplacedPart = {
                      id: `part-${Date.now()}-${idx}`,
                      designation: isArabic ? cp.ar : cp.fr,
                      reference: cp.ref,
                      quantite: 1,
                      prixUnitaireHT: cp.prix,
                      totalHT: cp.prix,
                    };
                    setParts([...parts, newPart]);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-slate-800 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  + {isArabic ? cp.ar : cp.fr} ({cp.prix} DH)
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Table of parts */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold uppercase text-slate-900">{t.partsListTitle}</span>
              </div>
              <button
                type="button"
                onClick={handleAddPart}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {t.addPart}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-5/12">{t.partDesignation}</th>
                    <th className="py-2.5 px-3 w-2/12 text-center">{t.qty}</th>
                    <th className="py-2.5 px-3 w-2/12 text-right">{t.unitPrice}</th>
                    <th className="py-2.5 px-3 w-2/12 text-right">{t.lineTotal}</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map((part) => (
                    <tr key={part.id}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={part.designation}
                          onChange={(e) => handleUpdatePart(part.id, { designation: e.target.value })}
                          placeholder="Nom de la pièce"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-medium"
                        />
                        {(() => {
                          const suggestion = suggestCorrection(part.designation);
                          if (!suggestion) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(part.id, { designation: suggestion.corrected })}
                              title={suggestion.changes.map((c) => `${c.from} → ${c.to}`).join(', ')}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[10px] font-semibold rounded cursor-pointer"
                            >
                              <SpellCheck className="w-3 h-3" />
                              {isArabic ? `تصحيح: ${suggestion.corrected}` : `Corriger : ${suggestion.corrected}`}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={part.quantite}
                          onChange={(e) => handleUpdatePart(part.id, { quantite: Math.max(1, Number(e.target.value)) })}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-md text-xs text-center font-mono font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            value={part.prixUnitaireHT}
                            onChange={(e) => handleUpdatePart(part.id, { prixUnitaireHT: Math.max(0, Number(e.target.value)) })}
                            className="w-24 px-2 py-1.5 border border-slate-200 rounded-md text-xs text-right font-mono font-bold"
                          />
                          <span className="text-slate-400">DH</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatDH(part.totalHT)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeletePart(part.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Labor & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-900">{t.laborTitle}</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{isArabic ? 'أجرة يد المعلم (درهم)' : 'Main d\'œuvre totale (DH)'}</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={mainDOeuvreMontant}
                  onChange={(e) => setMainDOeuvreMontant(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.discount}</label>
                <input
                  type="number"
                  min="0"
                  value={remiseHT}
                  onChange={(e) => setRemiseHT(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.vatRate}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={tauxTva}
                  onChange={(e) => setTauxTva(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withDeposit}
                    onChange={(e) => setWithDeposit(e.target.checked)}
                    className="rounded-xs text-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-900">{t.immediateDeposit}</span>
                </label>

                {withDeposit && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.depositAmount}</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.paymentMethod}</label>
                      <select
                        value={depositMode}
                        onChange={(e) => setDepositMode(e.target.value as PaymentMethod)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold"
                      >
                        <option value="especes">{t.cash}</option>
                        <option value="cheque">{t.check}</option>
                        <option value="virement">{t.transfer}</option>
                        <option value="carte">{t.card}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t.financialSummary}</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">{t.totalParts}</span>
                    <span className="font-mono">{formatDH(totals.totalPiecesHT)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">{t.totalLabor}</span>
                    <span className="font-mono">{formatDH(totals.totalMainDOeuvreHT)}</span>
                  </div>
                  {totals.remiseHT > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-800 text-amber-400">
                      <span>{t.discount}</span>
                      <span className="font-mono">-{formatDH(totals.remiseHT)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">{t.totalHt}</span>
                    <span className="font-mono">{formatDH(totals.totalHT)}</span>
                  </div>
                  {totals.tauxTva > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">{t.totalVat} ({totals.tauxTva}%)</span>
                      <span className="font-mono">{formatDH(totals.totalTva)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-700 flex items-baseline justify-between">
                <span className="text-xs text-slate-300 font-bold">{t.netTotal}</span>
                <span className="text-2xl font-extrabold font-mono text-amber-400">
                  {formatDH(totals.totalTTC)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button onClick={() => setCurrentStep(3)} className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer">
              Retour
            </button>
            <button
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>{t.submitIntervention}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 5: SUCCÈS ================= */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t.congratsTitle}</h2>
            <p className="text-xs text-slate-600 mt-2">{t.congratsSubtitle}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">الماتريكول / Matricule :</span>
              <LicensePlate value={detectedPlate} className="font-bold text-slate-900" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الزبون / Client :</span>
              <span className="font-bold text-slate-900">{detectedPrenom} {detectedNom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المجموع الصافي / Total Net :</span>
              <span className="font-bold text-slate-900">{formatDH(totals.totalTTC)}</span>
            </div>
            {withDeposit && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>التسبيق / Avance :</span>
                <span>-{formatDH(depositAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={openWhatsAppShare}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.sendWhatsApp}</span>
            </button>
            <button
              onClick={() => {
                if (createdRecords?.clientId) setPreselectedClientIdForPayment(createdRecords.clientId);
                setActiveTab('clients');
              }}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t.clientBalanceBtn}
            </button>
            <button
              onClick={() => {
                setVehiclePhoto(null);
                setCarteGrisePhoto(null);
                setCurrentStep(1);
              }}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t.newVehicleBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
