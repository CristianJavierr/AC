import { useState, useEffect, useRef } from 'react';
import { supabase, Service, Customer, UserProfile, ServiceStatus, ServiceType } from '../lib/supabase';
import { Plus, Edit2, Trash2, Wrench, Calendar, MapPin, User, AlertCircle, DollarSign, FileText, ChevronDown, BarChart3 } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filterStatus, setFilterStatus] = useState<ServiceStatus | 'all'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    service_type: 'repair' as ServiceType,
    title: '',
    description: '',
    address: '',
    scheduled_date: '',
    status: 'pending' as ServiceStatus,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: '',
    labor_cost: 0,
    materials_cost: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Cerrar menú de filtros al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [servicesRes, customersRes, techniciansRes] = await Promise.all([
      supabase
        .from('services')
        .select('*, customer:customers(*), technician:user_profiles(*)')
        .order('scheduled_date', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
      supabase.from('user_profiles').select('*').eq('role', 'technician').eq('is_active', true).order('full_name'),
    ]);

    if (servicesRes.data) setServices(servicesRes.data as Service[]);
    if (customersRes.data) setCustomers(customersRes.data);
    if (techniciansRes.data) setTechnicians(techniciansRes.data);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceData = {
      ...formData,
      technician_id: formData.technician_id || null,
      status: formData.technician_id ? (formData.status === 'pending' ? 'assigned' : formData.status) : 'pending',
    };

    if (editingService) {
      await supabase
        .from('services')
        .update({ ...serviceData, updated_at: new Date().toISOString() })
        .eq('id', editingService.id);
    } else {
      await supabase.from('services').insert([serviceData]);
    }

    setShowModal(false);
    setEditingService(null);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      technician_id: '',
      service_type: 'repair',
      title: '',
      description: '',
      address: '',
      scheduled_date: '',
      status: 'pending',
      priority: 'medium',
      notes: '',
      labor_cost: 0,
      materials_cost: 0,
    });
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      customer_id: service.customer_id,
      technician_id: service.technician_id || '',
      service_type: service.service_type,
      title: service.title,
      description: service.description || '',
      address: service.address,
      scheduled_date: service.scheduled_date.slice(0, 16),
      status: service.status,
      priority: service.priority,
      notes: service.notes || '',
      labor_cost: service.labor_cost,
      materials_cost: service.materials_cost,
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingService(null);
    resetForm();
    setShowModal(true);
  };

  const handleDelete = async (service: Service) => {
    if (window.confirm(`¿Estás seguro de eliminar el servicio "${service.title}"?`)) {
      const { error } = await supabase.from('services').delete().eq('id', service.id);
      if (!error) {
        loadData();
      } else {
        alert('Error al eliminar el servicio: ' + error.message);
      }
    }
  };

  const updateServiceStatus = async (service: Service, newStatus: ServiceStatus) => {
    const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }
    await supabase.from('services').update(updateData).eq('id', service.id);
    loadData();
  };

  const createInvoice = async (service: Service) => {
    // Generate invoice number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `${year}-%`);
    
    const invoiceNumber = `${year}-${String((count || 0) + 1).padStart(5, '0')}`;
    
    const subtotal = service.labor_cost + service.materials_cost;
    const taxRate = 16;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { error } = await supabase.from('invoices').insert([{
      service_id: service.id,
      customer_id: service.customer_id,
      invoice_number: invoiceNumber,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
    }]);

    if (error) {
      alert('Error al crear la factura: ' + error.message);
    } else {
      alert(`Factura ${invoiceNumber} creada exitosamente`);
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

  const getServiceTypeLabel = (type: ServiceType) => {
    switch (type) {
      case 'installation':
        return 'Instalación';
      case 'repair':
        return 'Reparación';
      case 'maintenance':
        return 'Mantenimiento';
      case 'inspection':
        return 'Inspección';
      default:
        return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-blue-500 text-white';
      case 'low':
        return 'bg-slate-400 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return priority;
    }
  };

  const filteredServices = filterStatus === 'all' ? services : services.filter((s) => s.status === filterStatus);

  const handleFilterSelect = (status: ServiceStatus | 'all') => {
    setFilterStatus(status);
    setFilterMenuOpen(false);
  };

  const filterOptions = [
    { value: 'all' as const, label: 'Todos' },
    { value: 'pending' as const, label: 'Pendientes' },
    { value: 'assigned' as const, label: 'Asignados' },
    { value: 'in_progress' as const, label: 'En Progreso' },
    { value: 'completed' as const, label: 'Completados' },
    { value: 'cancelled' as const, label: 'Cancelados' },
  ];

  const currentFilter = filterOptions.find(f => f.value === filterStatus);

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando servicios...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Gestión de Servicios</h2>
          <p className="text-slate-600 text-sm sm:text-base mt-1 hidden sm:block">Instalaciones, reparaciones y mantenimiento de aires acondicionados</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Filtros - Móvil (dropdown) */}
      <div className="md:hidden mb-4 relative" ref={filterMenuRef}>
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${filterStatus === 'all' ? 'bg-slate-400' : filterStatus === 'pending' ? 'bg-yellow-500' : filterStatus === 'assigned' ? 'bg-blue-500' : filterStatus === 'in_progress' ? 'bg-orange-500' : filterStatus === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium text-slate-900">{currentFilter?.label}</span>
          </div>
          <ChevronDown size={20} className={`text-slate-500 transition-transform duration-200 ${filterMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-30">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterSelect(option.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                  filterStatus === option.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${option.value === 'all' ? 'bg-slate-400' : option.value === 'pending' ? 'bg-yellow-500' : option.value === 'assigned' ? 'bg-blue-500' : option.value === 'in_progress' ? 'bg-orange-500' : option.value === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros - Desktop */}
      <div className="hidden md:flex gap-2 mb-6">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilterStatus(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              filterStatus === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats - Botón para mostrar en móvil */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-600" />
            <span className="font-medium text-slate-700">Estadísticas</span>
          </div>
          <ChevronDown size={20} className={`text-slate-500 transition-transform duration-200 ${showStats ? 'rotate-180' : ''}`} />
        </button>

        {showStats && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-700 text-xs font-medium">Pendientes</p>
              <p className="text-xl font-bold text-yellow-800">{services.filter((s) => s.status === 'pending').length}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-xs font-medium">Asignados</p>
              <p className="text-xl font-bold text-blue-800">{services.filter((s) => s.status === 'assigned').length}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-700 text-xs font-medium">En Progreso</p>
              <p className="text-xl font-bold text-orange-800">{services.filter((s) => s.status === 'in_progress').length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-xs font-medium">Completados</p>
              <p className="text-xl font-bold text-green-800">{services.filter((s) => s.status === 'completed').length}</p>
            </div>
            <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-xs font-medium">Cancelados</p>
              <p className="text-xl font-bold text-red-800">{services.filter((s) => s.status === 'cancelled').length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats - Desktop (siempre visible) */}
      <div className="hidden md:grid grid-cols-5 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 text-sm font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-800">{services.filter((s) => s.status === 'pending').length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm font-medium">Asignados</p>
          <p className="text-2xl font-bold text-blue-800">{services.filter((s) => s.status === 'assigned').length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-700 text-sm font-medium">En Progreso</p>
          <p className="text-2xl font-bold text-orange-800">{services.filter((s) => s.status === 'in_progress').length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 text-sm font-medium">Completados</p>
          <p className="text-2xl font-bold text-green-800">{services.filter((s) => s.status === 'completed').length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm font-medium">Cancelados</p>
          <p className="text-2xl font-bold text-red-800">{services.filter((s) => s.status === 'cancelled').length}</p>
        </div>
      </div>

      {/* Lista de servicios */}
      <div className="space-y-3 md:space-y-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white border border-slate-200 rounded-lg p-3 sm:p-5 hover:shadow-md transition"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
              <div className="flex-1 min-w-0">
                {/* Badges - más compactos en móvil */}
                <div className="flex items-center gap-1.5 sm:gap-3 mb-2 flex-wrap">
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${getPriorityColor(service.priority)}`}>
                    {getPriorityLabel(service.priority)}
                  </span>
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusLabel(service.status)}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-700 rounded text-[10px] sm:text-xs font-medium">
                    {getServiceTypeLabel(service.service_type)}
                  </span>
                </div>

                <h3 className="font-semibold text-base sm:text-lg text-slate-900 mb-1 sm:mb-2 truncate">{service.title}</h3>

                {service.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 line-clamp-2">{service.description}</p>
                )}

                {/* Info grid - compacto en móvil */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                    <User size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{service.customer?.name || 'Sin cliente'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                    <Wrench size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{service.technician?.full_name || 'Sin asignar'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 col-span-2 sm:col-span-1">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{service.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 col-span-2 sm:col-span-1">
                    <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{new Date(service.scheduled_date).toLocaleDateString('es-MX', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {/* Costos - ocultar detalles en móvil, solo mostrar total */}
                  <div className="hidden sm:flex items-center gap-2 text-slate-600">
                    <DollarSign size={14} className="text-slate-400" />
                    <span>Mano de obra: ${service.labor_cost.toFixed(2)} | Materiales: ${service.materials_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 font-semibold col-span-2 sm:col-span-1">
                    <DollarSign size={14} className="text-slate-400 sm:hidden flex-shrink-0" />
                    <span>Total: ${(service.labor_cost + service.materials_cost).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-row md:flex-col gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                {service.status !== 'completed' && service.status !== 'cancelled' && (
                  <select
                    value={service.status}
                    onChange={(e) => updateServiceStatus(service, e.target.value as ServiceStatus)}
                    className="flex-1 md:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="assigned">Asignado</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                )}
                {service.status === 'completed' && (
                  <button
                    onClick={() => createInvoice(service)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition"
                    title="Generar Factura"
                  >
                    <FileText size={14} />
                    <span>Facturar</span>
                  </button>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(service)}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 transition"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No hay servicios {filterStatus !== 'all' ? `con estado "${getStatusLabel(filterStatus)}"` : 'registrados'}</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        customer_id: e.target.value,
                        address: customer?.address || formData.address
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Técnico Asignado</label>
                  <select
                    value={formData.technician_id}
                    onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Sin asignar</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Servicio <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as ServiceType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="installation">Instalación</option>
                    <option value="repair">Reparación</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="inspection">Inspección</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioridad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Ej: Instalación de aire split 12000 BTU"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={3}
                  placeholder="Detalles adicionales del servicio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección del Servicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Dirección completa donde se realizará el servicio"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha y Hora Programada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                {editingService && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ServiceStatus })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="assigned">Asignado</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Costo Mano de Obra ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Costo Materiales ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.materials_cost}
                    onChange={(e) => setFormData({ ...formData, materials_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  <strong>Total del Servicio:</strong> ${(formData.labor_cost + formData.materials_cost).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                  placeholder="Notas internas..."
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
                  {editingService ? 'Actualizar' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
