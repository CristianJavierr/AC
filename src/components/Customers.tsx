import { useState, useEffect } from 'react';
import { supabase, Customer } from '../lib/supabase';
import { Plus, Edit2, Mail, Phone, Building, MapPin, Trash2 } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').order('name');

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCustomer) {
      await supabase.from('customers').update(formData).eq('id', editingCustomer.id);
    } else {
      await supabase.from('customers').insert([formData]);
    }

    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', company: '', address: '' });
    loadCustomers();
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', company: '', address: '' });
    setShowModal(true);
  };

  const handleDelete = async (customer: Customer) => {
    // Check for related sales
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('customer_id', customer.id);

    // Check for related appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('customer_id', customer.id);

    let confirmMessage = `¿Estás seguro de eliminar al cliente "${customer.name}"?`;
    
    const warnings = [];
    if (sales && sales.length > 0) {
      warnings.push(`${sales.length} venta(s)`);
    }
    if (appointments && appointments.length > 0) {
      warnings.push(`${appointments.length} cita(s)`);
    }

    if (warnings.length > 0) {
      confirmMessage += `\n\n⚠️ ADVERTENCIA: Este cliente tiene ${warnings.join(' y ')} asociada(s).\n\nAl eliminarlo:\n- Las ventas mantendrán sus datos pero sin referencia al cliente\n- Las citas serán eliminadas en cascada`;
    }

    if (window.confirm(confirmMessage)) {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (!error) {
        loadCustomers();
      } else {
        alert('Error al eliminar el cliente: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando clientes...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h2>
          <p className="text-slate-600 mt-1">Administra tu cartera de clientes</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus size={20} />
          <span>Agregar Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-slate-900">{customer.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(customer)}
                  className="text-slate-400 hover:text-blue-600 transition p-1"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(customer)}
                  className="text-slate-400 hover:text-red-600 transition p-1"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span>{customer.email}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.company && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building size={16} className="text-slate-400" />
                  <span>{customer.company}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="line-clamp-2">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No hay clientes registrados aún</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                />
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
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  {editingCustomer ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
