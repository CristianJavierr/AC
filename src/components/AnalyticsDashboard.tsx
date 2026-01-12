import { useState, useEffect } from 'react';
import { supabase, Service, ServiceStatus, ServiceType } from '../lib/supabase';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Wrench,
  CheckCircle,
  Clock,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface DashboardStats {
  totalRevenue: number;
  previousRevenue: number;
  totalServices: number;
  previousServices: number;
  completedServices: number;
  previousCompleted: number;
  pendingServices: number;
  inProgressServices: number;
  totalCustomers: number;
  previousCustomers: number;
  totalTechnicians: number;
  urgentServices: number;
}

interface RevenueData {
  name: string;
  revenue: number;
  services: number;
}

interface ServiceTypeData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TechnicianPerformance {
  name: string;
  completed: number;
  revenue: number;
}

export default function AnalyticsDashboard() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    previousRevenue: 0,
    totalServices: 0,
    previousServices: 0,
    completedServices: 0,
    previousCompleted: 0,
    pendingServices: 0,
    inProgressServices: 0,
    totalCustomers: 0,
    previousCustomers: 0,
    totalTechnicians: 0,
    urgentServices: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<ServiceTypeData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [serviceStatusData, setServiceStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([]);
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const periodLabels = {
    day: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
  };

  useEffect(() => {
    loadDashboardData();
  }, [timePeriod]);

  const getDateRange = (period: TimePeriod): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
    const now = new Date();
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);
        prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
    }

    return { start, end, prevStart, prevEnd };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const { start, end, prevStart, prevEnd } = getDateRange(timePeriod);

    try {
      // Get all services
      const { data: allServices } = await supabase.from('services').select('*, technician:user_profiles(*)');

      // Filter services by period
      const currentServices = allServices?.filter(s => {
        const date = new Date(s.scheduled_date);
        return date >= start && date <= end;
      }) || [];

      const previousServices = allServices?.filter(s => {
        const date = new Date(s.scheduled_date);
        return date >= prevStart && date <= prevEnd;
      }) || [];

      // Get invoices
      const { data: allInvoices } = await supabase.from('invoices').select('*');

      const currentInvoices = allInvoices?.filter(inv => {
        const date = new Date(inv.issue_date);
        return date >= start && date <= end && inv.status === 'paid';
      }) || [];

      const previousInvoices = allInvoices?.filter(inv => {
        const date = new Date(inv.issue_date);
        return date >= prevStart && date <= prevEnd && inv.status === 'paid';
      }) || [];

      const totalRevenue = currentInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const previousRevenue = previousInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Get customers
      const { data: customers } = await supabase.from('customers').select('created_at');
      const currentCustomers = customers?.filter(c => {
        const date = new Date(c.created_at);
        return date <= end;
      }).length || 0;
      const previousCustomers = customers?.filter(c => {
        const date = new Date(c.created_at);
        return date <= prevEnd;
      }).length || 0;

      // Get technicians count
      const { count: techniciansCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'technician')
        .eq('is_active', true);

      // Calculate stats
      const completedCurrent = currentServices.filter(s => s.status === 'completed').length;
      const completedPrevious = previousServices.filter(s => s.status === 'completed').length;
      const pending = currentServices.filter(s => s.status === 'pending').length;
      const inProgress = currentServices.filter(s => s.status === 'in_progress' || s.status === 'assigned').length;
      const urgent = currentServices.filter(s => s.priority === 'urgent' && s.status !== 'completed' && s.status !== 'cancelled').length;

      setStats({
        totalRevenue,
        previousRevenue,
        totalServices: currentServices.length,
        previousServices: previousServices.length,
        completedServices: completedCurrent,
        previousCompleted: completedPrevious,
        pendingServices: pending,
        inProgressServices: inProgress,
        totalCustomers: currentCustomers,
        previousCustomers,
        totalTechnicians: techniciansCount || 0,
        urgentServices: urgent,
      });

      // Generate revenue trend data
      setRevenueData(generateRevenueData(allInvoices || [], allServices || [], timePeriod));

      // Service type distribution
      const typeColors: Record<ServiceType, string> = {
        installation: '#3B82F6',
        repair: '#F97316',
        maintenance: '#22C55E',
        inspection: '#A855F7',
      };

      const typeLabels: Record<ServiceType, string> = {
        installation: 'Instalación',
        repair: 'Reparación',
        maintenance: 'Mantenimiento',
        inspection: 'Inspección',
      };

      const typeCounts: Record<ServiceType, number> = {
        installation: 0,
        repair: 0,
        maintenance: 0,
        inspection: 0,
      };

      currentServices.forEach(s => {
        if (typeCounts[s.service_type as ServiceType] !== undefined) {
          typeCounts[s.service_type as ServiceType]++;
        }
      });

      setServiceTypeData(
        Object.entries(typeCounts).map(([type, count]) => ({
          name: typeLabels[type as ServiceType],
          value: count,
          color: typeColors[type as ServiceType],
        }))
      );

      // Service status distribution
      const statusColors = {
        pending: '#EAB308',
        assigned: '#3B82F6',
        in_progress: '#F97316',
        completed: '#22C55E',
        cancelled: '#EF4444',
      };

      const statusLabels = {
        pending: 'Pendiente',
        assigned: 'Asignado',
        in_progress: 'En Progreso',
        completed: 'Completado',
        cancelled: 'Cancelado',
      };

      const statusCounts: Record<string, number> = {};
      currentServices.forEach(s => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });

      setServiceStatusData(
        Object.entries(statusCounts).map(([status, count]) => ({
          name: statusLabels[status as ServiceStatus] || status,
          value: count,
          color: statusColors[status as ServiceStatus] || '#64748B',
        }))
      );

      // Technician performance
      const techStats: Record<string, { name: string; completed: number; revenue: number }> = {};
      currentServices.filter(s => s.status === 'completed' && s.technician).forEach(s => {
        const techId = s.technician_id;
        const techName = s.technician?.full_name || 'Sin asignar';
        if (!techStats[techId]) {
          techStats[techId] = { name: techName, completed: 0, revenue: 0 };
        }
        techStats[techId].completed++;
        techStats[techId].revenue += (s.labor_cost || 0) + (s.materials_cost || 0);
      });

      setTechPerformance(
        Object.values(techStats)
          .sort((a, b) => b.completed - a.completed)
          .slice(0, 5)
      );

      // Recent services
      const { data: recent } = await supabase
        .from('services')
        .select('*, customer:customers(*), technician:user_profiles(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (recent) setRecentServices(recent as Service[]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }

    setLoading(false);
  };

  const generateRevenueData = (invoices: any[], services: any[], period: TimePeriod): RevenueData[] => {
    const data: RevenueData[] = [];
    const now = new Date();

    if (period === 'day') {
      // Last 24 hours by hour
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

        const revenue = invoices
          .filter(inv => {
            const date = new Date(inv.issue_date);
            return date >= hourStart && date < hourEnd && inv.status === 'paid';
          })
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        const serviceCount = services.filter(s => {
          const date = new Date(s.scheduled_date);
          return date >= hourStart && date < hourEnd;
        }).length;

        data.push({
          name: `${hour.getHours()}:00`,
          revenue,
          services: serviceCount,
        });
      }
    } else if (period === 'week') {
      // Last 7 days
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const revenue = invoices
          .filter(inv => {
            const date = new Date(inv.issue_date);
            return date >= dayStart && date < dayEnd && inv.status === 'paid';
          })
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        const serviceCount = services.filter(s => {
          const date = new Date(s.scheduled_date);
          return date >= dayStart && date < dayEnd;
        }).length;

        data.push({
          name: days[day.getDay()],
          revenue,
          services: serviceCount,
        });
      }
    } else if (period === 'month') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        const revenue = invoices
          .filter(inv => {
            const date = new Date(inv.issue_date);
            return date >= weekStart && date <= weekEnd && inv.status === 'paid';
          })
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        const serviceCount = services.filter(s => {
          const date = new Date(s.scheduled_date);
          return date >= weekStart && date <= weekEnd;
        }).length;

        data.push({
          name: `Sem ${4 - i}`,
          revenue,
          services: serviceCount,
        });
      }
    } else {
      // Last 12 months
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const revenue = invoices
          .filter(inv => {
            const date = new Date(inv.issue_date);
            return date >= month && date <= monthEnd && inv.status === 'paid';
          })
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        const serviceCount = services.filter(s => {
          const date = new Date(s.scheduled_date);
          return date >= month && date <= monthEnd;
        }).length;

        data.push({
          name: months[month.getMonth()],
          revenue,
          services: serviceCount,
        });
      }
    }

    return data;
  };

  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current >= 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const getStatusLabel = (status: ServiceStatus) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: ServiceStatus) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600 dark:text-slate-400">Cargando dashboard...</div>;
  }

  const revenueChange = calculateChange(stats.totalRevenue, stats.previousRevenue);
  const servicesChange = calculateChange(stats.totalServices, stats.previousServices);
  const completedChange = calculateChange(stats.completedServices, stats.previousCompleted);
  const customersChange = calculateChange(stats.totalCustomers, stats.previousCustomers);

  return (
    <div className="space-y-6">
      {/* Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Análisis de rendimiento • {periodLabels[timePeriod]}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-[#262626] p-1 rounded-lg">
          {(['day', 'week', 'month', 'year'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timePeriod === period
                ? 'bg-white dark:bg-[#404040] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* Urgent Alert */}
      {stats.urgentServices > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
          </div>
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">
              {stats.urgentServices} servicio(s) urgente(s) requieren atención
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${revenueChange.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {revenueChange.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {revenueChange.value.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ingresos</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
        </div>

        {/* Services */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Briefcase className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${servicesChange.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {servicesChange.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {servicesChange.value.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Servicios</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.totalServices}</p>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${completedChange.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {completedChange.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {completedChange.value.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Completados</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.completedServices}</p>
        </div>

        {/* Customers */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${customersChange.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {customersChange.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {customersChange.value.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Clientes</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.totalCustomers}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Tendencia de Ingresos</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: '#22C55E', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Services by Type */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Servicios por Tipo</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Services Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Servicios por Período</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                  }}
                />
                <Bar dataKey="services" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Servicios" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Estado Actual</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={16} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Pendientes</span>
              </div>
              <span className="font-bold text-yellow-700 dark:text-yellow-400">{stats.pendingServices}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Wrench className="text-orange-600 dark:text-orange-400" size={16} />
                <span className="text-sm text-slate-700 dark:text-slate-300">En Progreso</span>
              </div>
              <span className="font-bold text-orange-700 dark:text-orange-400">{stats.inProgressServices}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600 dark:text-blue-400" size={16} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Técnicos Activos</span>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-400">{stats.totalTechnicians}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Technicians */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Top Técnicos</h3>
          </div>
          {techPerformance.length > 0 ? (
            <div className="space-y-3">
              {techPerformance.map((tech, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#262626] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-[#404040] rounded-full flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{tech.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tech.completed} servicios</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">${tech.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">Sin datos de técnicos</p>
          )}
        </div>

        {/* Recent Services */}
        <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Servicios Recientes</h3>
          </div>
          {recentServices.length > 0 ? (
            <div className="space-y-3">
              {recentServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#262626] rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{service.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{service.customer?.name || 'Sin cliente'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusLabel(service.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay servicios recientes</p>
          )}
        </div>
      </div>
    </div>
  );
}
