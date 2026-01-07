import { useState, useEffect } from 'react';
import { supabase, Service, ServiceStatus, ServiceType } from '../lib/supabase';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Wrench,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  totalServices: number;
  pendingServices: number;
  inProgressServices: number;
  completedServices: number;
  totalCustomers: number;
  totalTechnicians: number;
  totalInvoiced: number;
  urgentServices: number;
}

interface ServicesByMonth {
  month: string;
  completed: number;
  total: number;
}

interface ServicesByType {
  type: ServiceType;
  count: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalServices: 0,
    pendingServices: 0,
    inProgressServices: 0,
    completedServices: 0,
    totalCustomers: 0,
    totalTechnicians: 0,
    totalInvoiced: 0,
    urgentServices: 0,
  });

  const [servicesByMonth, setServicesByMonth] = useState<ServicesByMonth[]>([]);
  const [servicesByType, setServicesByType] = useState<ServicesByType[]>([]);
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get services data
      const { data: services } = await supabase.from('services').select('*');
      const totalServices = services?.length || 0;
      const pendingServices = services?.filter((s) => s.status === 'pending').length || 0;
      const inProgressServices = services?.filter((s) => s.status === 'in_progress' || s.status === 'assigned').length || 0;
      const completedServices = services?.filter((s) => s.status === 'completed').length || 0;
      const urgentServices = services?.filter((s) => s.priority === 'urgent' && s.status !== 'completed' && s.status !== 'cancelled').length || 0;

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get technicians count
      const { count: techniciansCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'technician')
        .eq('is_active', true);

      // Get total invoiced (paid invoices)
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid');
      const totalInvoiced = paidInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Get services by month (last 6 months)
      const monthData = await getServicesByMonth(services || []);
      setServicesByMonth(monthData);

      // Get services by type
      const typeData = getServicesByType(services || []);
      setServicesByType(typeData);

      // Get recent services
      const { data: recent } = await supabase
        .from('services')
        .select('*, customer:customers(*), technician:user_profiles(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (recent) setRecentServices(recent as Service[]);

      setStats({
        totalServices,
        pendingServices,
        inProgressServices,
        completedServices,
        totalCustomers: customersCount || 0,
        totalTechnicians: techniciansCount || 0,
        totalInvoiced,
        urgentServices,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }

    setLoading(false);
  };

  const getServicesByMonth = (services: any[]): ServicesByMonth[] => {
    const last6Months = [];
    const today = new Date();
// Generar datos para los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('es-MX', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthServices = services.filter((service) => {
        const serviceDate = new Date(service.scheduled_date);
        return serviceDate >= monthStart && serviceDate <= monthEnd;
      });

      const completedInMonth = monthServices.filter((s) => s.status === 'completed').length;

      last6Months.push({
        month: monthName,
        completed: completedInMonth,
        total: monthServices.length,
      });
    }

    return last6Months;
  };

  const getServicesByType = (services: any[]): ServicesByType[] => {
    const types: Record<ServiceType, number> = {
      installation: 0,
      repair: 0,
      maintenance: 0,
      inspection: 0,
    };

    services.forEach((service) => {
      if (types[service.service_type as ServiceType] !== undefined) {
        types[service.service_type as ServiceType]++;
      }
    });

    return Object.entries(types).map(([type, count]) => ({
      type: type as ServiceType,
      count,
    }));
  };

  const getServiceTypeLabel = (type: ServiceType) => {
    switch (type) {
      case 'installation':
        return 'Instalaciones';
      case 'repair':
        return 'Reparaciones';
      case 'maintenance':
        return 'Mantenimientos';
      case 'inspection':
        return 'Inspecciones';
      default:
        return type;
    }
  };

  const getServiceTypeColor = (type: ServiceType) => {
    switch (type) {
      case 'installation':
        return 'bg-blue-500';
      case 'repair':
        return 'bg-orange-500';
      case 'maintenance':
        return 'bg-green-500';
      case 'inspection':
        return 'bg-purple-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'assigned':
        return 'Asignado';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-orange-100 text-orange-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const maxServices = Math.max(...servicesByMonth.map((d) => d.total), 1);
  const totalServicesByType = servicesByType.reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-slate-600 mt-2">Resumen de servicios de aires acondicionados</p>
      </div>

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Services */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/50 via-white to-[#BADFDB]/30 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#BADFDB]/30 to-[#BADFDB]/10 rounded-2xl backdrop-blur-sm border border-[#BADFDB]/30">
                <Briefcase size={24} className="text-[#5FB8B1]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Total de Servicios</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {stats.totalServices}
              </h3>
            </div>
          </div>
        </div>

        {/* Pending Services */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FCF9EA]/70 via-[#FCF9EA]/50 to-[#FCF9EA]/60 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#FCF9EA]/60 to-[#FCF9EA]/30 rounded-2xl backdrop-blur-sm border border-[#FCF9EA]/60">
                <Clock size={24} className="text-[#9B8352]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Servicios Pendientes</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {stats.pendingServices}
              </h3>
              {stats.inProgressServices > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  En progreso: <span className="font-semibold text-slate-700">{stats.inProgressServices}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Completed Services */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-green-100/50 via-white to-green-50/30 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-100/60 to-green-50/30 rounded-2xl backdrop-blur-sm border border-green-200/60">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Completados</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-green-700 to-green-500 bg-clip-text text-transparent">
                {stats.completedServices}
              </h3>
            </div>
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FFA4A4]/35 via-white to-[#FFA4A4]/25 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#FFA4A4]/25 to-[#FFA4A4]/10 rounded-2xl backdrop-blur-sm border border-[#FFA4A4]/25">
                <DollarSign size={24} className="text-[#FF9494]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Total Facturado</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                ${stats.totalInvoiced.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de servicios urgentes */}
      {stats.urgentServices > 0 && (
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FFA4A4]/50 via-white to-[#FFA4A4]/30 mb-8">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFA4A4]/20 rounded-full blur-3xl -z-10"></div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#FFA4A4]/30 to-[#FFA4A4]/10 rounded-2xl backdrop-blur-sm border border-[#FFA4A4]/30">
                <AlertTriangle className="text-[#FF6B6B]" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">
                  Servicios Urgentes
                </h4>
                <p className="text-sm text-slate-600">
                  Hay {stats.urgentServices} servicio(s) marcados como urgentes pendientes de atención.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Services by Month Chart */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/40 via-white to-[#FCF9EA]/40">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#BADFDB]/10 rounded-full blur-3xl -z-10"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-[#BADFDB]/20 to-[#BADFDB]/10 rounded-xl">
                <BarChart3 size={24} className="text-[#5FB8B1]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Servicios por Mes
              </h3>
            </div>
            <div className="space-y-4">
              {servicesByMonth.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 capitalize">
                      {data.month}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
                      {data.completed}/{data.total} completados
                    </span>
                  </div>
                  <div className="relative w-full h-3 bg-slate-100/80 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-[#BADFDB] to-[#5FB8B1] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(data.total / maxServices) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services by Type */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-slate-200/50 via-white to-slate-100/50">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-100/80 to-slate-50/80 rounded-xl">
                <Wrench size={24} className="text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Servicios por Tipo
              </h3>
            </div>
            <div className="space-y-4">
              {servicesByType.map((item, index) => (
                <div key={index} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300">
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full ${getServiceTypeColor(item.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-900">{getServiceTypeLabel(item.type)}</h4>
                      <span className="text-sm font-bold text-slate-700">{item.count}</span>
                    </div>
                    <div className="relative w-full h-2 bg-slate-100/80 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-0 ${getServiceTypeColor(item.type)} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: totalServicesByType > 0 ? `${(item.count / totalServicesByType) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {totalServicesByType === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No hay servicios registrados
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Services & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Services */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/40 via-white to-[#FFA4A4]/40">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-[#BADFDB]/20 to-[#BADFDB]/10 rounded-xl">
                <Briefcase size={24} className="text-[#5FB8B1]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Servicios Recientes
              </h3>
            </div>
            <div className="space-y-3">
              {recentServices.length > 0 ? (
                recentServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{service.title}</h4>
                      <p className="text-sm text-slate-500">{service.customer?.name || 'Sin cliente'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                      {getStatusLabel(service.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No hay servicios recientes
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-slate-200/50 via-white to-slate-100/50">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-100/80 to-slate-50/80 rounded-xl">
                <TrendingUp size={24} className="text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Resumen Rápido
              </h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50/80">
                <div className="flex items-center gap-3 mb-2">
                  <Users size={18} className="text-slate-500" />
                  <span className="text-sm text-slate-600">Clientes</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalCustomers}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80">
                <div className="flex items-center gap-3 mb-2">
                  <Wrench size={18} className="text-slate-500" />
                  <span className="text-sm text-slate-600">Técnicos Activos</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalTechnicians}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign size={18} className="text-slate-500" />
                  <span className="text-sm text-slate-600">Facturado (Pagado)</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">${stats.totalInvoiced.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
