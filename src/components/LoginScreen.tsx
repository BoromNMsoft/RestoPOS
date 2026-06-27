import { useState } from 'react';
import { UtensilsCrossed, Eye, EyeOff, LogIn, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Lit le dernier resto mémorisé (après une 1re connexion sur cet appareil)
function getLastResto(): { name: string; logo: string | null } | null {
  try {
    const raw = localStorage.getItem('lastResto');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastResto = getLastResto();

  const handlePhoneChange = (value: string) => {
    // Garde uniquement les chiffres
    const digitsOnly = value.replace(/\D/g, '');
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(phone, password);
    setLoading(false);
    if (err) {
      if (err.includes('Invalid login credentials')) {
        setError('Numéro ou mot de passe incorrect');
      } else {
        setError(err);
      }
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="w-full max-w-md">
        {/* Logo + nom du resto */}
        <div className="text-center mb-8">
          {lastResto?.logo ? (
            <img
              src={lastResto.logo}
              alt={lastResto.name}
              className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-xl shadow-amber-500/30 mb-4"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4">
              <UtensilsCrossed size={28} className="text-white" />
            </div>
          )}
          {lastResto?.name ? (
            <>
              <h1 className="text-3xl font-bold text-white tracking-tight">{lastResto.name}</h1>
              <p className="text-gray-400 mt-2 text-sm">Bienvenue — connectez-vous pour continuer</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white tracking-tight">Caissio App</h1>
              <p className="text-gray-400 mt-2 text-sm">Système de caisse restaurant</p>
            </>
          )}
        </div>

        {/* Login card */}
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
                  placeholder="0612345678"
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
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm pr-12"
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
              disabled={loading || !phone || !password}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Se connecter
                </>
              )}
            </button>
          </form>

         
        </div>
      </div>
    </div>
  );
}