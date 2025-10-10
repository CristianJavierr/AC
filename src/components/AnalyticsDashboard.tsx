import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingAppointments: number;
  averageOrderValue: number;
  recentSalesGrowth: number;
}

interface SalesChartData {
  month: string;
  revenue: number;
  sales: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    pendingAppointments: 0,
    averageOrderValue: 0,
    recentSalesGrowth: 0,
  });

  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get sales data
      const { data: sales } = await supabase.from('sales').select('*');
      const totalSales = sales?.length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get products data
      const { data: products } = await supabase.from('products').select('*');
      const totalProducts = products?.length || 0;
      const lowStockProducts =
        products?.filter((p) => p.stock <= p.min_stock).length || 0;

      // Get pending appointments
      const { count: pendingAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');

      // Calculate sales growth (last 30 days vs previous 30 days)
      const today = new Date();
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous60Days = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

      const { data: recentSales } = await supabase
        .from('sales')
        .select('total_amount, sale_date')
        .gte('sale_date', last30Days.toISOString());

      const { data: previousSales } = await supabase
        .from('sales')
        .select('total_amount, sale_date')
        .gte('sale_date', previous60Days.toISOString())
        .lt('sale_date', last30Days.toISOString());

      const recentRevenue = recentSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const previousRevenue = previousSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const recentSalesGrowth =
        previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Get sales by month (last 6 months)
      const chartData = await getSalesChartData();
      setSalesChartData(chartData);

      // Get top products
      const topProds = await getTopProducts();
      setTopProducts(topProds);

      setStats({
        totalSales,
        totalRevenue,
        totalCustomers: customersCount || 0,
        totalProducts,
        lowStockProducts,
        pendingAppointments: pendingAppointmentsCount || 0,
        averageOrderValue,
        recentSalesGrowth,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }

    setLoading(false);
  };

  const getSalesChartData = async (): Promise<SalesChartData[]> => {
    const { data: sales } = await supabase.from('sales').select('total_amount, sale_date');
    if (!sales) return [];

    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('es-MX', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthSales = sales.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      last6Months.push({
        month: monthName,
        revenue: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
        sales: monthSales.length,
      });
    }

    return last6Months;
  };

  const getTopProducts = async (): Promise<TopProduct[]> => {
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('product_id, quantity, subtotal, product:products(name)');

    if (!saleItems) return [];

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    saleItems.forEach((item: any) => {
      const productName = item.product?.name || 'Producto eliminado';
      const existing = productMap.get(productName);

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
      } else {
        productMap.set(productName, {
          name: productName,
          quantity: item.quantity,
          revenue: item.subtotal,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const maxRevenue = Math.max(...salesChartData.map((d) => d.revenue), 1);

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Dashboard Analítico
        </h2>
        <p className="text-slate-600 mt-2">Resumen general del negocio</p>
      </div>

      {/* Tarjetas de métricas principales - Liquid Glass Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/50 via-white to-[#BADFDB]/30 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#BADFDB]/30 to-[#BADFDB]/10 rounded-2xl backdrop-blur-sm border border-[#BADFDB]/30">
                <DollarSign size={24} className="text-[#5FB8B1]" />
              </div>
              {stats.recentSalesGrowth !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm ${
                    stats.recentSalesGrowth >= 0 
                      ? 'bg-emerald-100/80 text-emerald-700' 
                      : 'bg-red-100/80 text-red-700'
                  }`}
                >
                  {stats.recentSalesGrowth >= 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  <span>{Math.abs(stats.recentSalesGrowth).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Ingresos Totales</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                ${stats.totalRevenue.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FCF9EA]/70 via-[#FCF9EA]/50 to-[#FCF9EA]/60 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#FCF9EA]/60 to-[#FCF9EA]/30 rounded-2xl backdrop-blur-sm border border-[#FCF9EA]/60">
                <ShoppingCart size={24} className="text-[#9B8352]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Ventas Realizadas</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {stats.totalSales}
              </h3>
              {stats.totalSales > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Promedio: <span className="font-semibold text-slate-700">${stats.averageOrderValue.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FFA4A4]/35 via-white to-[#FFA4A4]/25 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#FFA4A4]/25 to-[#FFA4A4]/10 rounded-2xl backdrop-blur-sm border border-[#FFA4A4]/25">
                <Users size={24} className="text-[#FF9494]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Clientes Registrados</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {stats.totalCustomers}
              </h3>
            </div>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FFBDBD]/50 via-white to-[#FFBDBD]/30 hover:shadow-xl transition-all duration-500">
          <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#FFBDBD]/30 to-[#FFBDBD]/10 rounded-2xl backdrop-blur-sm border border-[#FFBDBD]/30">
                <Calendar size={24} className="text-[#FF8888]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Citas Pendientes</p>
              <h3 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {stats.pendingAppointments}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de inventario */}
      {stats.lowStockProducts > 0 && (
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#FFA4A4]/50 via-white to-[#FFA4A4]/30 mb-8">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/50">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFA4A4]/20 rounded-full blur-3xl -z-10"></div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#FFA4A4]/30 to-[#FFA4A4]/10 rounded-2xl backdrop-blur-sm border border-[#FFA4A4]/30">
                <AlertTriangle className="text-[#FF6B6B]" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">
                  Alerta de Inventario Bajo
                </h4>
                <p className="text-sm text-slate-600">
                  {stats.lowStockProducts} producto(s) tienen stock bajo o agotado. Revisa el inventario.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/40 via-white to-[#FCF9EA]/40">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#BADFDB]/10 rounded-full blur-3xl -z-10"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-[#BADFDB]/20 to-[#BADFDB]/10 rounded-xl">
                <BarChart3 size={24} className="text-[#5FB8B1]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Ingresos por Mes
              </h3>
            </div>
            <div className="space-y-4">
              {salesChartData.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 capitalize">
                      {data.month}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
                      ${data.revenue.toFixed(2)} <span className="text-slate-400">({data.sales})</span>
                    </span>
                  </div>
                  <div className="relative w-full h-3 bg-slate-100/80 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-[#BADFDB] to-[#5FB8B1] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-slate-200/50 via-white to-slate-100/50">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-100/80 to-slate-50/80 rounded-xl">
                <Package size={24} className="text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Productos Más Vendidos
              </h3>
            </div>
            <div className="space-y-4">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={index} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg backdrop-blur-sm transition-transform group-hover:scale-110 ${
                        index === 0
                          ? 'bg-gradient-to-br from-[#FCF9EA]/50 to-[#FCF9EA]/30 text-[#B8A06E]'
                          : index === 1
                          ? 'bg-gradient-to-br from-[#BADFDB]/50 to-[#BADFDB]/30 text-[#5FB8B1]'
                          : index === 2
                          ? 'bg-gradient-to-br from-[#FFBDBD]/50 to-[#FFBDBD]/30 text-[#FF8888]'
                          : 'bg-gradient-to-br from-slate-100/80 to-slate-50/80 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate mb-1">{product.name}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-600">{product.quantity} unidades</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                          ${product.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No hay datos de ventas disponibles
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de inventario */}
      <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-[#BADFDB]/40 via-white to-[#FFA4A4]/40">
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/50">
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#BADFDB]/10 rounded-full blur-3xl -z-10"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-[#BADFDB]/20 to-[#BADFDB]/10 rounded-xl">
              <Package size={24} className="text-[#5FB8B1]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Resumen de Inventario
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-slate-200/50 to-slate-100/50">
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:bg-white/80 transition-all duration-300">
                <div className="text-3xl font-bold bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1">
                  {stats.totalProducts}
                </div>
                <div className="text-sm text-slate-600 font-medium">Total de Productos</div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-[#BADFDB]/50 to-[#BADFDB]/30">
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:bg-white/80 transition-all duration-300">
                <div className="text-3xl font-bold bg-gradient-to-br from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-1">
                  {stats.totalProducts - stats.lowStockProducts}
                </div>
                <div className="text-sm text-emerald-700 font-medium">Con Stock Suficiente</div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-[#FFA4A4]/50 to-[#FFBDBD]/50">
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:bg-white/80 transition-all duration-300">
                <div className="text-3xl font-bold bg-gradient-to-br from-[#FF6B6B] to-[#FF8888] bg-clip-text text-transparent mb-1">
                  {stats.lowStockProducts}
                </div>
                <div className="text-sm text-[#FF6B6B] font-medium">Stock Bajo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
