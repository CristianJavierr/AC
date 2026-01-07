import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Wrench, Users, FileText, UserCog, BarChart3, Menu, ChevronDown, X } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import Services from './Services';
import Customers from './Customers';
import Invoices from './Invoices';
import UsersComponent from './Users';

type View = 'analytics' | 'services' | 'customers' | 'invoices' | 'users';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navigation = [
    { id: 'analytics' as View, name: 'Dashboard', icon: BarChart3 },
    { id: 'services' as View, name: 'Servicios', icon: Wrench },
    { id: 'customers' as View, name: 'Clientes', icon: Users },
    { id: 'invoices' as View, name: 'Facturas', icon: FileText },
    { id: 'users' as View, name: 'Usuarios', icon: UserCog },
  ];

  const currentNavItem = navigation.find(item => item.id === currentView);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (viewId: View) => {
    setCurrentView(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-900">AC</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Menú móvil desplegable */}
        <div className="md:hidden mb-4 relative" ref={menuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {currentNavItem && (
                <>
                  <currentNavItem.icon size={20} className="text-slate-700" />
                  <span className="font-medium text-slate-900">{currentNavItem.name}</span>
                </>
              )}
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-500 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown móvil */}
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-30">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Menú desktop horizontal */}
        <nav className="hidden md:flex gap-2 mb-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  currentView === item.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          {currentView === 'analytics' && <AnalyticsDashboard />}
          {currentView === 'services' && <Services />}
          {currentView === 'customers' && <Customers />}
          {currentView === 'invoices' && <Invoices />}
          {currentView === 'users' && <UsersComponent />}
        </div>
      </div>
    </div>
  );
}
