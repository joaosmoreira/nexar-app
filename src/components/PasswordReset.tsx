import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAppStore } from '../store/useAppStore';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Ecra de reset de password — aparece quando o utilizador
 * chega à app via link de recuperaçao do email.
 */
export function PasswordReset() {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPw !== confirmPw) {
      setError('As palavras-passe não coincidem.');
      return;
    }
    if (newPw.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPw });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => {
        useAppStore.getState().setPasswordRecovery(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/15 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-inner">
            {success ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <KeyRound className="text-amber-500 w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {success ? 'Password Alterada!' : 'Definir Nova Palavra-passe'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {success ? 'A redirecionar para a aplicação...' : 'Insere a tua nova palavra-passe abaixo'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-lg p-3 text-center">
            Palavra-passe alterada com sucesso! A entrar...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nova palavra-passe</label>
              <input
                autoFocus
                type="password"
                required
                minLength={6}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar nova palavra-passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Repete a nova palavra-passe"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg px-4 py-2.5 mt-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar Palavra-passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
