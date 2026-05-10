import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.error || 'Greška');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-card rounded-card p-8 border border-border">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl text-white">AI</div>
          <h1 className="text-2xl font-bold text-text-primary">Unified AI Inbox</h1>
          <p className="text-text-secondary mt-1">Centralizovani inbox sa AI asistentom</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-text-muted" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-input-bg border border-input-border rounded-btn py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-text-primary"
                placeholder="vas@email.com" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Lozinka</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-text-muted" size={18} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-input-bg border border-input-border rounded-btn py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-text-primary"
                placeholder="••••••••" required minLength={6} />
            </div>
          </div>

          {error && <div className="text-red-text text-sm bg-red-bg p-3 rounded-btn">{error}</div>}

          <button type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-btn transition-colors flex items-center justify-center gap-2">
            {mode === 'login' ? <><LogIn size={18} /> Prijavi se</> : <><UserPlus size={18} /> Registruj se</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-blue-500 hover:text-blue-400 text-sm">
            {mode === 'login' ? 'Nemate nalog? Registrujte se' : 'Već imate nalog? Prijavite se'}
          </button>
        </div>
      </div>
    </div>
  );
}
