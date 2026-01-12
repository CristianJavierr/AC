import { useState, useEffect } from 'react';
import { supabase, Customer } from '../lib/supabase';
import { Plus, Edit2, Mail, Phone, MapPin, Trash2, FileText, Users, BarChart3, ChevronDown, Search, X } from 'lucide-react';
import Pagination from './Pagination';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
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
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    loadCustomers();
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    setShowModal(true);
  };

  const handleDelete = async (customer: Customer) => {
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('customer_id', customer.id);

    let confirmMessage = '¿Estás seguro de eliminar al cliente "' + customer.name + '"?';

    if (services && services.length > 0) {
      confirmMessage += '\n\n⚠️ ADVERTENCIA: Este cliente tiene ' + services.length + ' servicio(s) asociado(s) que serán eliminados en cascada.';
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

  const customersWithEmail = customers.filter(c => c.email).length;
  const customersWithPhone = customers.filter(c => c.phone).length;
  const customersWithAddress = customers.filter(c => c.address).length;

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <div className="text-center py-8 text-slate-600 dark:text-slate-400">Cargando clientes...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Gestión de Clientes</h2>
          <p className="text-slate-600 text-sm sm:text-base mt-1 hidden sm:block">Administra tu cartera de clientes</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center justify-left gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition w-full sm:w-auto dark:bg-[#404040] dark:border-[#404040]"
        >
          <Plus size={20} />
          <span>Agregar Cliente</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buscar por nombre, email, teléfono..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between bg-slate-100 dark:bg-[#262626] rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Estadísticas</span>
          </div>
          <ChevronDown size={20} className={'text-slate-500 transition-transform duration-200 ' + (showStats ? 'rotate-180' : '')} />
        </button>

        {showStats && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-[#171717] dark:border-blue-400">
              <p className="text-blue-700 text-xs font-medium dark:text-blue-300">Total Clientes</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{customers.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-[#171717] dark:border-green-400">
              <p className="text-green-700 text-xs font-medium dark:text-green-300">Con Email</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-300">{customersWithEmail}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 dark:bg-[#171717] dark:border-purple-400">
              <p className="text-purple-700 text-xs font-medium dark:text-purple-300">Con Teléfono</p>
              <p className="text-xl font-bold text-purple-800 dark:text-purple-300">{customersWithPhone}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 dark:bg-[#171717] dark:border-orange-300">
              <p className="text-orange-700 text-xs font-medium dark:text-orange-300">Con Dirección</p>
              <p className="text-xl font-bold text-orange-800 dark:text-orange-200">{customersWithAddress}</p>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:border-[#404040] dark:bg-[#171717]">
          <div className="flex items-center gap-2 mb-2 ">
            <Users size={18} className="text-blue-600 dark:text-blue-400" />
            <p className="text-blue-700 text-sm font-medium dark:text-blue-400">Total Clientes</p>
          </div>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{customers.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:border-[#404040] dark:bg-[#171717]">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={18} className="text-green-600 dark:text-green-400" />
            <p className="text-green-700 text-sm font-medium dark:text-green-400">Con Email</p>
          </div>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{customersWithEmail}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 dark:border-[#404040] dark:bg-[#171717]">
          <div className="flex items-center gap-2 mb-2">
            <Phone size={18} className="text-purple-600 dark:text-purple-400" />
            <p className="text-purple-700 text-sm font-medium dark:text-purple-400">Con Teléfono</p>
          </div>
          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{customersWithPhone}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:border-[#404040] dark:bg-[#171717]">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-orange-600 dark:text-orange-400" />
            <p className="text-orange-700 text-sm font-medium dark:text-orange-400">Con Dirección</p>
          </div>
          <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{customersWithAddress}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {paginatedCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#404040] rounded-lg p-3 sm:p-5 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 truncate pr-2 dark:text-slate-100">{customer.name}</h3>
              <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                <button
                  onClick={() => openEditModal(customer)}
                  className="text-slate-400 hover:text-blue-600 transition p-1"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(customer)}
                  className="text-slate-400 hover:text-red-600 transition p-1"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {customer.email && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <Mail size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="line-clamp-1 sm:line-clamp-2">{customer.address}</span>
                </div>
              )}

              {customer.notes && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <FileText size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="line-clamp-1 sm:line-clamp-2">{customer.notes}</span>
                </div>
              )}

              {!customer.email && !customer.phone && !customer.address && !customer.notes && (
                <p className="text-xs text-slate-400 italic">Sin información de contacto</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredCustomers.length}
        itemsPerPage={itemsPerPage}
      />

      {customers.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No hay clientes registrados aún</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#171717] rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#404040] dark:bg-[#171717] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-[#171717]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition dark:bg-[#404040] dark:border-[#404040]"
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
