import { ShoppingCart, LayoutDashboard, Package, Moon, Sun, UtensilsCrossed, LogOut, Shield, Settings, Monitor, History, Lock, ClipboardList } from 'lucide-react';import { ViewType } from '../types';
import { useAuth, UserRole } from '../hooks/useAuth';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  cartCount: number;
  ordersCount: number;   // ← ajoute
  onSignOut: () => void; // ← ajoute
  restaurantName?: string;        // ← ajoute
  restaurantLogo?: string | null; // ← ajoute
}
export default function Header({ currentView, onViewChange, darkMode, onToggleDark, cartCount, ordersCount, onSignOut, restaurantName, restaurantLogo }: HeaderProps) {
  const { authUser} = useAuth();
  const role = authUser?.role as UserRole | null;

  const navItems: { view: ViewType; icon: React.ReactNode; label: string; adminOnly?: boolean; cashierOnly?: boolean }[] = [
    { view: 'pos',       icon: <ShoppingCart size={18} />,    label: 'Caisse' },
    { view: 'orders',    icon: <ClipboardList size={18} />,   label: 'Commandes' },
    { view: 'history',   icon: <History size={18} />,         label: 'Mes ventes',  cashierOnly: true },
    { view: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard',   adminOnly: true },
    { view: 'products',  icon: <Package size={18} />,         label: 'Produits',    adminOnly: true },
    { view: 'closure', icon: <Lock size={18} />, label: 'Clôture', adminOnly: true },
    { view: 'settings',  icon: <Settings size={18} />,        label: 'Paramètres',  adminOnly: true },

  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly) return role === 'admin';
    if (item.cashierOnly) return role === 'cashier';
    return true;
  });

  const roleLabel = role === 'admin' ? 'Admin' : 'Caissier';
  const roleColor = role === 'admin'
    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50 relative">
      <div className="flex items-center gap-2">
        {restaurantLogo ? (
          <img src={restaurantLogo} alt={restaurantName} className="w-8 h-8 rounded-lg object-cover shadow-md" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <UtensilsCrossed size={16} className="text-white" />
          </div>
        )}
        <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
          {restaurantName ?? 'RestoPOS'}
        </span>
      </div>

      <nav className="flex items-center gap-1">
        {visibleNavItems.map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentView === view
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {icon}
            {label}
            {view === 'pos' && cartCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold min-w-[20px] text-center animate-pulse">
                {cartCount}
              </span>
            )}
            {view === 'orders' && ordersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold min-w-[20px] text-center animate-pulse">
                {ordersCount}
              </span>
            )}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${roleColor}`}>
            <Shield size={12} />
            {roleLabel}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate">
            {authUser?.fullName}
          </span>
          {authUser?.stationName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              <Monitor size={12} />
              {authUser.stationName}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={onSignOut}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
          title="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </nav>
    </header>
  );
}