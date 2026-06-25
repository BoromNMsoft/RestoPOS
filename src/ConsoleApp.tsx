import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import SuperAdminConsole from './components/SuperAdminConsole';
import { LayoutGrid, Eye, EyeOff, LogIn, Mail, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ConsoleApp() {
  const { authUser, loading, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  // Pas connecté → écran de login console
  if (!authUser) {
    return <ConsoleLogin />;
  }

  // Connecté mais pas super_admin → accès refusé
  if (authUser.role !== 'super_admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Accès réservé</h2>
          <p className="text-gray-400 text-sm mb-6">
            Cet espace est réservé au super administrateur. Votre compte n'y a pas accès.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={16} /> Aller à l'application
            </a>
            <button
              onClick={signOut}
              className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Super-admin → console
  return (
    <SuperAdminConsole
      fullName={authUser.fullName}
      darkMode={darkMode}
      onToggleDark={() => setDarkMode(d => !d)}
      onSignOut={signOut}
    />
  );
}

function ConsoleLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Connexion directe par email (pas de conversion téléphone)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(err.message.includes('Invalid login credentials') ? 'Identifiants incorrects' : err.message);
    }
    // En cas de succès, AuthProvider détecte la session et bascule sur la console
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30 mb-4">
            <LayoutGrid size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Console</h1>
          <p className="text-gray-400 mt-2 text-sm">Espace super administrateur</p>
        </div>

        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                  placeholder="email@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm pr-12"
                  placeholder="Mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Accéder à la console
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Retour à l'application
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}