import { useState, useEffect } from 'react';
import { supabase, Sale, Product, Customer } from '../lib/supabase';
import { Plus, ShoppingCart, TrendingUp, DollarSign, Trash2 } from 'lucide-react';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState<{ product_id: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [salesRes, productsRes, customersRes] = await Promise.all([
      supabase.from('sales').select('*, customer:customers(*)').order('sale_date', { ascending: false }),
      supabase.from('products').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ]);

    if (salesRes.data) setSales(salesRes.data as Sale[]);
    if (productsRes.data) setProducts(productsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);

    setLoading(false);
  };

  const addSaleItem = () => {
    setSaleItems([...saleItems, { product_id: '', quantity: 1 }]);
  };

  const updateSaleItem = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSaleItems(updated);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => {
      const product = products.find((p) => p.id === item.product_id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = calculateTotal();

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([
        {
          customer_id: selectedCustomer || null,
          total_amount: total,
          notes,
        },
      ])
      .select()
      .single();

    if (saleError || !saleData) return;

    const itemsToInsert = saleItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        sale_id: saleData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product?.price || 0,
        subtotal: (product?.price || 0) * item.quantity,
      };
    });

    await supabase.from('sale_items').insert(itemsToInsert);

    for (const item of saleItems) {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product_id);
      }
    }

    setShowModal(false);
    setSelectedCustomer('');
    setSaleItems([]);
    setNotes('');
    loadData();
  };

  const handleDelete = async (sale: Sale) => {
    // Check for sale items
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id);

    let confirmMessage = `¿Estás seguro de eliminar la venta del ${new Date(sale.sale_date).toLocaleDateString('es-MX')} por $${sale.total_amount.toFixed(2)}?`;
    
    if (items && items.length > 0) {
      confirmMessage += `\n\n⚠️ ADVERTENCIA: Esta venta tiene ${items.length} producto(s) asociado(s) que también serán eliminados en cascada.\n\nNOTA: El stock NO se restaurará automáticamente.`;
    }

    if (window.confirm(confirmMessage)) {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (!error) {
        loadData();
      } else {
        alert('Error al eliminar la venta: ' + error.message);
      }
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando ventas...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Ventas</h2>
          <p className="text-slate-600 mt-1">Registra y monitorea tus ventas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus size={20} />
          <span>Nueva Venta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-200">Total Ventas</span>
            <ShoppingCart size={24} className="text-slate-300" />
          </div>
          <p className="text-3xl font-bold">{sales.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100">Ingresos Totales</span>
            <DollarSign size={24} className="text-green-200" />
          </div>
          <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100">Promedio por Venta</span>
            <TrendingUp size={24} className="text-blue-200" />
          </div>
          <p className="text-3xl font-bold">
            ${sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Monto</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Notas</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(sale.sale_date).toLocaleDateString('es-MX')}
                </td>
                <td className="py-3 px-4 text-sm text-slate-900">
                  {sale.customer?.name || 'Sin cliente'}
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                  ${sale.total_amount.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{sale.notes || '-'}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleDelete(sale)}
                    className="text-slate-400 hover:text-red-600 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Registrar Nueva Venta</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente (opcional)
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Productos</label>
                  <button
                    type="button"
                    onClick={addSaleItem}
                    className="text-sm text-slate-900 hover:text-slate-700"
                  >
                    + Agregar producto
                  </button>
                </div>

                {saleItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateSaleItem(index, 'product_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    >
                      <option value="">Seleccionar producto...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - ${product.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeSaleItem(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                {saleItems.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    Agrega productos a la venta
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-700">Total:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saleItems.length === 0}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
