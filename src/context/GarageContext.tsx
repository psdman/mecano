import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, Vehicle, Intervention, Payment, ClientBalance } from '../types/garage';
import {
  INITIAL_CLIENTS,
  INITIAL_VEHICLES,
  INITIAL_INTERVENTIONS,
  INITIAL_PAYMENTS,
} from '../data/seedData';
import { calculateClientBalance, formatPrice } from '../utils/garageCalculations';
import { TRANSLATIONS, Language } from '../utils/translations';
import { api, SessionUser } from '../utils/api';

interface GarageContextType {
  user: SessionUser | null;
  isAdmin: boolean;
  settings: Record<string, string>;
  saveSettings: (s: Record<string, string>) => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS.fr;
  isArabic: boolean;
  dir: 'ltr' | 'rtl';
  clients: Client[];
  vehicles: Vehicle[];
  interventions: Intervention[];
  payments: Payment[];
  activeTab: 'home' | 'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse' | 'admin';
  setActiveTab: (tab: 'home' | 'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse' | 'admin') => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'createdAt'>) => Intervention;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  getClientBalance: (clientId: string) => ClientBalance;
  getClientById: (clientId: string) => Client | undefined;
  getVehicleById: (vehicleId: string) => Vehicle | undefined;
  getVehiclesByClient: (clientId: string) => Vehicle[];
  getInterventionsByClient: (clientId: string) => Intervention[];
  getInterventionsByVehicle: (vehicleId: string) => Intervention[];
  getPaymentsByClient: (clientId: string) => Payment[];
  formatDH: (amount: number) => string;
  preselectedClientIdForPayment: string | null;
  setPreselectedClientIdForPayment: (id: string | null) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'meca_scan_atelier_maroc_v3';

const GarageContext = createContext<GarageContextType | undefined>(undefined);

export const GarageProvider: React.FC<{ children: React.ReactNode; user?: SessionUser | null }> = ({ children, user = null }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem(`${STORAGE_KEY}_lang`);
      return (savedLang as Language) || 'fr';
    } catch {
      return 'fr';
    }
  });

  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const t = TRANSLATIONS[language];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(`${STORAGE_KEY}_lang`, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse' | 'admin'>('home');
  const [settings, setSettings] = useState<Record<string, string>>({});

  const saveSettings = async (s: Record<string, string>) => {
    setSettings(s);
    await api.saveSettings(s).catch(() => {});
  };
  const [preselectedClientIdForPayment, setPreselectedClientIdForPayment] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_clients`);
      return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_vehicles`);
      return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  const [interventions, setInterventions] = useState<Intervention[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_interventions`);
      return saved ? JSON.parse(saved) : INITIAL_INTERVENTIONS;
    } catch {
      return INITIAL_INTERVENTIONS;
    }
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_payments`);
      return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
  });

  // Hydratation depuis la base D1 (Cloudflare) au chargement
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const collections: Array<[string, React.Dispatch<React.SetStateAction<any[]>>]> = [
          ['clients', setClients], ['vehicles', setVehicles],
          ['interventions', setInterventions], ['payments', setPayments],
        ];
        await Promise.all(collections.map(async ([coll, set]) => {
          const res = await api.getCollection(coll);
          // Fusionne serveur + local : les enregistrements créés hors-ligne
          // (absents du serveur) sont conservés au lieu d'être écrasés.
          if (alive && res.success && Array.isArray(res.items)) {
            set((prev: any[]) => {
              const serverIds = new Set(res.items.map((i: any) => i.id));
              const localOnly = prev.filter((i: any) => i.id && !serverIds.has(i.id));
              return [...res.items, ...localOnly];
            });
          }
        }));
        // Charge aussi les réglages admin
        const sRes = await api.getSettings();
        if (alive && sRes.success && sRes.settings) setSettings(sRes.settings);
      } catch { /* API indisponible → localStorage */ }
      if (alive) setHydrated(true);
    })();
    return () => { alive = false; };
  }, []);

  // Sync localStorage + base D1
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_clients`, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_vehicles`, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_interventions`, JSON.stringify(interventions));
  }, [interventions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(payments));
  }, [payments]);

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    api.upsertRecord('clients', newClient).catch(() => {});
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    const merged = { ...clients.find((c) => c.id === id), ...updates } as Client;
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    api.upsertRecord('clients', merged).catch(() => {});
  };

  const deleteClient = (id: string) => {
    const clientVehicles = vehicles.filter((v) => v.clientId === id);
    const clientInterventions = interventions.filter((i) => i.clientId === id);
    const clientPayments = payments.filter((p) => p.clientId === id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setVehicles((prev) => prev.filter((v) => v.clientId !== id));
    setInterventions((prev) => prev.filter((i) => i.clientId !== id));
    setPayments((prev) => prev.filter((p) => p.clientId !== id));
    api.deleteRecord('clients', id).catch(() => {});
    clientVehicles.forEach((v) => api.deleteRecord('vehicles', v.id).catch(() => {}));
    clientInterventions.forEach((i) => api.deleteRecord('interventions', i.id).catch(() => {}));
    clientPayments.forEach((p) => api.deleteRecord('payments', p.id).catch(() => {}));
  };

  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    api.upsertRecord('vehicles', newVehicle).catch(() => {});
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    const merged = { ...vehicles.find((v) => v.id === id), ...updates } as Vehicle;
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    api.upsertRecord('vehicles', merged).catch(() => {});
  };

  const deleteVehicle = (id: string) => {
    const vehicleInterventions = interventions.filter((i) => i.vehiculeId === id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    setInterventions((prev) => prev.filter((i) => i.vehiculeId !== id));
    api.deleteRecord('vehicles', id).catch(() => {});
    vehicleInterventions.forEach((i) => api.deleteRecord('interventions', i.id).catch(() => {}));
  };

  const addIntervention = (data: Omit<Intervention, 'id' | 'createdAt'>): Intervention => {
    const count = interventions.length + 1;
    const pad = String(count).padStart(3, '0');
    const newIntervention: Intervention = {
      ...data,
      id: `int-${Date.now()}`,
      numeroIntervention: data.numeroIntervention || `INT-${new Date().getFullYear()}-${pad}`,
      createdAt: new Date().toISOString(),
    };
    setInterventions((prev) => [newIntervention, ...prev]);
    api.upsertRecord('interventions', newIntervention).catch(() => {});

    if (data.kilometrage) {
      updateVehicle(data.vehiculeId, { kilometrageActuel: data.kilometrage });
    }

    return newIntervention;
  };

  const updateIntervention = (id: string, updates: Partial<Intervention>) => {
    const merged = { ...interventions.find((i) => i.id === id), ...updates } as Intervention;
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    api.upsertRecord('interventions', merged).catch(() => {});
  };

  const deleteIntervention = (id: string) => {
    setInterventions((prev) => prev.filter((i) => i.id !== id));
    api.deleteRecord('interventions', id).catch(() => {});
  };

  const addPayment = (paymentData: Omit<Payment, 'id' | 'createdAt'>): Payment => {
    const count = payments.length + 1;
    const pad = String(count).padStart(3, '0');
    const newPayment: Payment = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      numeroRecu: paymentData.numeroRecu || `REC-${new Date().getFullYear()}-${pad}`,
      createdAt: new Date().toISOString(),
    };
    setPayments((prev) => [newPayment, ...prev]);
    api.upsertRecord('payments', newPayment).catch(() => {});
    return newPayment;
  };

  const updatePayment = (id: string, updates: Partial<Payment>) => {
    const merged = { ...payments.find((p) => p.id === id), ...updates } as Payment;
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    api.upsertRecord('payments', merged).catch(() => {});
  };

  const deletePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    api.deleteRecord('payments', id).catch(() => {});
  };

  const getClientBalance = (clientId: string): ClientBalance => {
    return calculateClientBalance(clientId, interventions, payments);
  };

  const getClientById = (clientId: string) => clients.find((c) => c.id === clientId);
  const getVehicleById = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);
  const getVehiclesByClient = (clientId: string) => vehicles.filter((v) => v.clientId === clientId);
  const getInterventionsByClient = (clientId: string) => interventions.filter((i) => i.clientId === clientId);
  const getInterventionsByVehicle = (vehicleId: string) => interventions.filter((i) => i.vehiculeId === vehicleId);
  const getPaymentsByClient = (clientId: string) => payments.filter((p) => p.clientId === clientId);

  const formatDH = (amount: number) => formatPrice(amount, isArabic);

  return (
    <GarageContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        settings,
        saveSettings,
        language,
        setLanguage,
        t,
        isArabic,
        dir,
        clients,
        vehicles,
        interventions,
        payments,
        activeTab,
        setActiveTab,
        addClient,
        updateClient,
        deleteClient,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addIntervention,
        updateIntervention,
        deleteIntervention,
        addPayment,
        updatePayment,
        deletePayment,
        getClientBalance,
        getClientById,
        getVehicleById,
        getVehiclesByClient,
        getInterventionsByClient,
        getInterventionsByVehicle,
        getPaymentsByClient,
        formatDH,
        preselectedClientIdForPayment,
        setPreselectedClientIdForPayment,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
};

export const useGarage = () => {
  const context = useContext(GarageContext);
  if (!context) {
    throw new Error('useGarage must be used within a GarageProvider');
  }
  return context;
};
