import React, { useState } from 'react';
import { api, SessionUser } from '../utils/api';
import { Wrench } from 'lucide-react';

export const Login: React.FC<{ onLogin: (u: SessionUser) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.login(username, password);
    setLoading(false);
    if (res.success && res.user) onLogin(res.user);
    else setError(res.error || 'Identifiants incorrects');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-400 rounded-xl flex items-center justify-center mx-auto">
            <Wrench className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">MecaScan</h1>
          <p className="text-xs text-slate-500">Garage Mécanique — Connexion</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nom d'utilisateur</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl cursor-pointer">
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="text-[10px] text-slate-400 text-center">Compte par défaut : admin / admin123</p>
      </form>
    </div>
  );
};
