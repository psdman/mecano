import React, { useEffect, useState } from 'react';
import { useGarage } from '../context/GarageContext';
import { api } from '../utils/api';
import { ShieldCheck, UserPlus, Trash2, KeyRound, Save, Settings2, Building2, Upload } from 'lucide-react';
import { compressImageForUpload } from '../utils/imageCompress';

interface UserRow { id: string; username: string; role: string; nom?: string; created_at: string }

export const AdminPanel: React.FC = () => {
  const { settings, saveSettings, user } = useGarage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'mecanicien', nom: '' });
  const [pwd, setPwd] = useState({ old: '', next: '', confirm: '' });
  const [local, setLocal] = useState<Record<string, string>>({});

  const load = async () => {
    const r = await api.listUsers();
    if (r.success) setUsers(r.users);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setLocal(settings); }, [settings]);

  const createUser = async () => {
    const r = await api.createUser(newUser);
    setMsg(r.success ? 'Utilisateur créé.' : (r.error || 'Erreur'));
    if (r.success) { setNewUser({ username: '', password: '', role: 'mecanicien', nom: '' }); load(); }
  };
  const delUser = async (id: string) => {
    const r = await api.deleteUser(id);
    setMsg(r.success ? 'Utilisateur supprimé.' : (r.error || 'Erreur'));
    if (r.success) load();
  };
  const changePwd = async () => {
    if (pwd.next !== pwd.confirm) { setMsg('Les mots de passe ne correspondent pas.'); return; }
    const r = await api.changePassword(pwd.old, pwd.next);
    setMsg(r.success ? 'Mot de passe modifié.' : (r.error || 'Erreur'));
    if (r.success) setPwd({ old: '', next: '', confirm: '' });
  };
  const saveGarage = async () => { await saveSettings(local); setMsg('Réglages enregistrés.'); };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImageForUpload(String(reader.result), 400);
      setLocal({ ...local, garageLogo: compressed });
    };
    reader.readAsDataURL(file);
  };

  const num = (k: string, d = '') => local[k] ?? settings[k] ?? d;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Administration</h1>
          <p className="text-xs text-slate-500">Connecté en tant que {user?.username} ({user?.role === 'admin' ? 'Administrateur' : 'Mécanicien'})</p>
        </div>
      </div>
      {msg && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500" /> Utilisateurs</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-bold text-slate-900">{u.username}</span>
                  {u.nom && <span className="text-slate-500"> — {u.nom}</span>}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{u.role}</span>
                </div>
                {u.id !== user?.id && (
                  <button onClick={() => delUser(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
            <input placeholder="Mot de passe" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
            <input placeholder="Nom (optionnel)" value={newUser.nom} onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs">
              <option value="mecanicien">Mécanicien</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={createUser} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer">Créer l'utilisateur</button>
        </div>

        {/* Réglages garage */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Settings2 className="w-4 h-4 text-amber-500" /> Réglages de l'atelier</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['tauxHoraireHT', 'Taux horaire main d\'œuvre (DH/h)'],
              ['mainDOeuvreHeures', 'Heures MO par défaut'],
              ['remiseHT', 'Remise par défaut (DH)'],
              ['tauxTva', 'TVA par défaut (%)'],
              ['depositAmount', 'Acompte par défaut (DH)'],
              ['acomptePourcentage', 'Acompte % du total'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                <input type="number" value={num(k)} onChange={(e) => setLocal({ ...local, [k]: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono" />
              </div>
            ))}
          </div>
          <button onClick={saveGarage} className="w-full py-2 bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg hover:bg-amber-300 cursor-pointer flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Enregistrer les réglages
          </button>
        </div>
      </div>

      {/* Identité du garage */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Identité du garage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom du garage</label>
              <input value={num('garageNom', 'MecaScan Atelier')} onChange={(e) => setLocal({ ...local, garageNom: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Adresse</label>
              <input value={num('garageAdresse')} onChange={(e) => setLocal({ ...local, garageAdresse: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" placeholder="Ex: 12 Rue X, Casablanca" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone</label>
                <input value={num('garageTelephone')} onChange={(e) => setLocal({ ...local, garageTelephone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" placeholder="06 XX XX XX XX" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                <input value={num('garageEmail')} onChange={(e) => setLocal({ ...local, garageEmail: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" placeholder="contact@garage.ma" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Logo du garage</label>
            <div className="flex items-center gap-3">
              {local.garageLogo ? (
                <img src={local.garageLogo} alt="logo" className="w-16 h-16 object-contain border border-slate-200 rounded-lg bg-slate-50" />
              ) : (
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-300">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Choisir une image
                <input type="file" accept="image/*" onChange={onLogoFile} className="hidden" />
              </label>
            </div>
            {local.garageLogo && (
              <button onClick={() => setLocal({ ...local, garageLogo: '' })}
                className="mt-2 text-[11px] text-red-500 font-bold hover:underline cursor-pointer">Supprimer le logo</button>
            )}
          </div>
        </div>
        <button onClick={saveGarage} className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg hover:bg-amber-300 cursor-pointer inline-flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" /> Enregistrer l'identité
        </button>
      </div>

      {/* Mot de passe */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 max-w-xl">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" /> Mon mot de passe</h2>
        <div className="grid grid-cols-3 gap-3">
          <input type="password" placeholder="Actuel" value={pwd.old} onChange={(e) => setPwd({ ...pwd, old: e.target.value })}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
          <input type="password" placeholder="Nouveau" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
          <input type="password" placeholder="Confirmer" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
        </div>
        <button onClick={changePwd} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer">Changer le mot de passe</button>
      </div>
    </div>
  );
};
