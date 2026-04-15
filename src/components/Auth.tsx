import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, User } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'recovery';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setErrorMsg('As palavras-passe não coincidem.');
          setLoading(false);
          return;
        }
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim() } }
        });
        if (error) throw error;
        setSuccessMsg('Conta criada com sucesso! Podes fazer login.');
        switchMode('login');
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Email de recuperação enviado! Verifica a tua caixa de entrada.');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: { heading: 'Bem-vindo de volta', sub: 'Workspace industrial Nexar' },
    register: { heading: 'Criar nova conta', sub: 'Workspace industrial Nexar' },
    recovery: { heading: 'Recuperar palavra-passe', sub: 'Insere o email associado à tua conta' },
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Decorative gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-inner">
            {mode === 'recovery'
              ? <KeyRound className="text-amber-500 w-6 h-6" />
              : <Lock className="text-blue-500 w-6 h-6" />
            }
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {titles[mode].heading}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {titles[mode].sub}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg p-3 text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-lg p-3 text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primeiro nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="João"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Último nome</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Moreira"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="nome@nexar.pt"
              />
            </div>
          </div>

          {mode !== 'recovery' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar palavra-passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Esqueci a password — apenas no login */}
          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode('recovery')}
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                Esqueci a palavra-passe
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 mt-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              mode === 'login' ? 'Entrar' :
              mode === 'register' ? 'Criar Conta' :
              'Enviar Email de Recuperação'
            )}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 text-center space-y-2">
          {mode === 'recovery' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {mode === 'login' ? "Não tens conta? Pede ao administrador ou regista-te" : "Já tens uma conta? Faz login aqui"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
