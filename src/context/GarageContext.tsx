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

interface GarageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS.fr;
  isArabic: boolean;
  dir: 'ltr' | 'rtl';
  clients: Client[];
  vehicles: Vehicle[];
  interventions: Intervention[];
  payments: Payment[];
  activeTab: 'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse';
  setActiveTab: (tab: 'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse') => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'createdAt'>) => Intervention;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  getClientBalance: (clientId: string) => ClientBalance;
  getClientById: (clientId: string) => Client | undefined;
  getVehicleById: (vehicleId: string) => Vehicle | undefined;
  getVehiclesByClient: (clientId: string) => Vehicle[];
  getInterventionsByClient: (clientId: string) => Intervention[];
  getInterventionsByVehicle: (vehicleId: string) => Intervention[];
  getPaymentsByClient: (clientId: string) => Payment[];
  resetDemoData: () => void;
  formatDH: (amount: number) => string;
  preselectedClientIdForPayment: string | null;
  setPreselectedClientIdForPayment: (id: string | null) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'meca_scan_atelier_maroc_v2';

const GarageContext = createContext<GarageContextType | undefined>(undefined);

export const GarageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflow' | 'interventions' | 'vehicles' | 'clients' | 'caisse'>('dashboard');
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

  // Sync to localStorage
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
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
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

    if (data.kilometrage) {
      updateVehicle(data.vehiculeId, { kilometrageActuel: data.kilometrage });
    }

    return newIntervention;
  };

  const updateIntervention = (id: string, updates: Partial<Intervention>) => {
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteIntervention = (id: string) => {
    setInterventions((prev) => prev.filter((i) => i.id !== id));
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
    return newPayment;
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

  const resetDemoData = () => {
    setClients(INITIAL_CLIENTS);
    setVehicles(INITIAL_VEHICLES);
    setInterventions(INITIAL_INTERVENTIONS);
    setPayments(INITIAL_PAYMENTS);
  };

  return (
    <GarageContext.Provider
      value={{
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
        addVehicle,
        updateVehicle,
        addIntervention,
        updateIntervention,
        deleteIntervention,
        addPayment,
        getClientBalance,
        getClientById,
        getVehicleById,
        getVehiclesByClient,
        getInterventionsByClient,
        getInterventionsByVehicle,
        getPaymentsByClient,
        resetDemoData,
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
