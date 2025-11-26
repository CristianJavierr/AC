import { useState, useEffect } from 'react';
import { supabase, Appointment, Customer } from '../lib/supabase';
import { Plus, Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [appointmentsRes, customersRes] = await Promise.all([
      supabase.from('appointments').select('*, customer:customers(*)').order('start_time'),
      supabase.from('customers').select('*').order('name'),
    ]);

    if (appointmentsRes.data) setAppointments(appointmentsRes.data as Appointment[]);
    if (customersRes.data) setCustomers(customersRes.data);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAppointment) {
      await supabase
        .from('appointments')
        .update(formData)
        .eq('id', editingAppointment.id);
    } else {
      await supabase.from('appointments').insert([formData]);
    }

    setShowModal(false);
    setEditingAppointment(null);
    setFormData({
      customer_id: '',
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      status: 'scheduled',
    });
    loadData();
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      customer_id: appointment.customer_id || '',
      title: appointment.title,
      description: appointment.description || '',
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      status: appointment.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (appointment: Appointment) => {
    const confirmMessage = `¿Estás seguro de eliminar la cita "${appointment.title}" del ${new Date(appointment.start_time).toLocaleDateString('es-MX')}?`;

    if (window.confirm(confirmMessage)) {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (!error) {
        loadData();
      } else {
        alert('Error al eliminar la cita: ' + error.message);
      }
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getAppointmentsForDay = (date: Date | null) => {
    if (!date) return [];
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time);
      return (
        aptDate.getDate() === date.getDate() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setShowDayModal(true);
    }
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando citas...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agenda de Citas</h2>
          <p className="text-slate-600 mt-1">Programa y gestiona citas con clientes</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista
            </button>
          </div>
          <button
            onClick={() => {
              setEditingAppointment(null);
              setFormData({
                customer_id: '',
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                status: 'scheduled',
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus size={20} />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-slate-600 py-2">
                {day}
              </div>
            ))}

            {getMonthDays().map((day, index) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isToday =
                day &&
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-24 p-2 border border-slate-200 rounded-lg cursor-pointer transition ${
                    day ? 'bg-white hover:bg-slate-50 hover:shadow-md' : 'bg-slate-50 cursor-default'
                  } ${isToday ? 'ring-2 ring-slate-900' : ''}`}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium text-slate-900 mb-1">
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className="text-xs p-1 bg-slate-900 text-white rounded truncate"
                          >
                            {new Date(apt.start_time).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {apt.title}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-slate-500">
                            +{dayAppointments.length - 2} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{apt.title}</h3>
                  {apt.description && (
                    <p className="text-sm text-slate-600 mb-2">{apt.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {getStatusLabel(apt.status)}
                  </span>
                  <button
                    onClick={() => handleEdit(apt)}
                    className="text-slate-400 hover:text-blue-600 transition p-1"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(apt)}
                    className="text-slate-400 hover:text-red-600 transition p-1"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span>{apt.customer?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarIcon size={16} className="text-slate-400" />
                  <span>{new Date(apt.start_time).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock size={16} className="text-slate-400" />
                  <span>
                    {new Date(apt.start_time).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(apt.end_time).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {appointments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No hay citas programadas</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingAppointment ? 'Editar Cita' : 'Programar Nueva Cita'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAppointment(null);
                    setFormData({
                      customer_id: '',
                      title: '',
                      description: '',
                      start_time: '',
                      end_time: '',
                      status: 'scheduled',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  {editingAppointment ? 'Guardar Cambios' : 'Programar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedDate.toLocaleDateString('es-MX', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {getAppointmentsForDay(selectedDate).length === 0
                      ? 'No hay citas programadas'
                      : `${getAppointmentsForDay(selectedDate).length} cita(s) programada(s)`}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {getAppointmentsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-slate-500">No hay citas para este día</p>
                  <button
                    onClick={() => {
                      setShowDayModal(false);
                      const dateStr = selectedDate.toISOString().split('T')[0];
                      setFormData({
                        ...formData,
                        start_time: `${dateStr}T09:00`,
                        end_time: `${dateStr}T10:00`,
                      });
                      setShowModal(true);
                    }}
                    className="mt-4 text-slate-900 hover:text-slate-700 font-medium"
                  >
                    + Agregar cita
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getAppointmentsForDay(selectedDate)
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-lg">{apt.title}</h4>
                            {apt.description && (
                              <p className="text-sm text-slate-600 mt-1">{apt.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                              {getStatusLabel(apt.status)}
                            </span>
                            <button
                              onClick={() => {
                                setShowDayModal(false);
                                handleEdit(apt);
                              }}
                              className="text-slate-400 hover:text-blue-600 transition p-1"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(apt)}
                              className="text-slate-400 hover:text-red-600 transition p-1"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User size={16} className="text-slate-400" />
                            <span>{apt.customer?.name || 'Sin cliente'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            <span>
                              {new Date(apt.start_time).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(apt.end_time).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setShowDayModal(false)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
