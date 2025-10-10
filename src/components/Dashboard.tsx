import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Package, ShoppingCart, Users, Calendar, UserCog, BarChart3 } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import Inventory from './Inventory';
import Sales from './Sales';
import Customers from './Customers';
import Appointments from './Appointments';
import UsersComponent from './Users';

type View = 'analytics' | 'inventory' | 'sales' | 'customers' | 'appointments' | 'users';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('analytics');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navigation = [
    { id: 'analytics' as View, name: 'Dashboard', icon: BarChart3 },
    { id: 'inventory' as View, name: 'Inventario', icon: Package },
    { id: 'sales' as View, name: 'Ventas', icon: ShoppingCart },
    { id: 'customers' as View, name: 'Clientes', icon: Users },
    { id: 'appointments' as View, name: 'Citas', icon: Calendar },
    { id: 'users' as View, name: 'Usuarios', icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-900">Adai Soluciones</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <LogOut size={20} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-auto">
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {currentView === 'analytics' && <AnalyticsDashboard />}
          {currentView === 'inventory' && <Inventory />}
          {currentView === 'sales' && <Sales />}
          {currentView === 'customers' && <Customers />}
          {currentView === 'appointments' && <Appointments />}
          {currentView === 'users' && <UsersComponent />}
        </div>
      </div>
    </div>
  );
}
