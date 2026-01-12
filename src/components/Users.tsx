import { useState, useEffect, useRef } from 'react';
import { supabase, UserProfile, UserRole } from '../lib/supabase';
import { Edit2, UserCircle, Mail, Phone, Shield, ToggleLeft, ToggleRight, Trash2, Wrench, UserCog, Plus, Eye, EyeOff, AlertCircle, ChevronDown, BarChart3, Users as UsersIcon } from 'lucide-react';

interface UserWithEmail extends UserProfile {
  email?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithEmail | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'technician' as UserRole,
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
    checkCurrentUserRole();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) {
        setCurrentUserRole(profile.role as UserRole);
      }
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');

    if (profileError) {
      console.error('Error loading profiles:', profileError);
      setLoading(false);
      return;
    }

    setUsers(profiles || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editingUser) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (updateError) {
        setError('Error al actualizar: ' + updateError.message);
        return;
      }
    } else {
      setCreating(true);

      if (!formData.email || !formData.password || !formData.full_name) {
        setError('Email, contraseña y nombre son requeridos');
        setCreating(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setCreating(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone,
          }
        }
      });

      if (signUpError) {
        setError('Error al crear usuario: ' + signUpError.message);
        setCreating(false);
        return;
      }

      if (signUpData.user && formData.phone) {
        await supabase
          .from('user_profiles')
          .update({ phone: formData.phone, is_active: formData.is_active })
          .eq('id', signUpData.user.id);
      }

      setCreating(false);
    }

    setShowModal(false);
    setEditingUser(null);
    resetForm();
    loadUsers();
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', full_name: '', phone: '', role: 'technician', is_active: true });
    setShowPassword(false);
    setError(null);
  };

  const toggleUserStatus = async (user: UserWithEmail) => {
    await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    loadUsers();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: UserWithEmail) => {
    setEditingUser(user);
    setFormData({
      email: '',
      password: '',
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (user: UserWithEmail) => {
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser();

    if (currentAuthUser && user.id === currentAuthUser.id) {
      alert('No puedes eliminar tu propia cuenta mientras estás conectado.');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar al usuario "' + user.full_name + '"?')) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (!profileError) {
        loadUsers();
      } else {
        alert('Error al eliminar el usuario: ' + profileError.message);
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'technician': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 dark:bg-[#262626] text-slate-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <UserCog size={14} />;
      case 'technician': return <Wrench size={14} />;
      default: return <Shield size={14} />;
    }
  };

  const getRoleDotColor = (role: UserRole | 'all') => {
    switch (role) {
      case 'all': return 'bg-slate-400';
      case 'admin': return 'bg-purple-500';
      case 'technician': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  const filterOptions = [
    { value: 'all' as const, label: 'Todos' },
    { value: 'admin' as const, label: 'Administradores' },
    { value: 'technician' as const, label: 'Técnicos' },
  ];

  const currentFilter = filterOptions.find(f => f.value === filterRole);

  const handleFilterSelect = (role: UserRole | 'all') => {
    setFilterRole(role);
    setFilterMenuOpen(false);
  };

  const filteredUsers = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  const isAdmin = currentUserRole === 'admin';
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalTechnicians = users.filter(u => u.role === 'technician').length;
  const totalActive = users.filter(u => u.is_active).length;

  if (loading) {
    return <div className="text-center py-8 text-slate-600 dark:text-slate-400 dark:text-slate-400">Cargando usuarios...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Gestión de Usuarios</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1 hidden sm:block">Administradores y Técnicos del sistema</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Filtros - Móvil (dropdown) */}
      <div className="md:hidden mb-4 relative" ref={filterMenuRef}>
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 dark:border-[#404040] dark:bg-[#171717] rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className={'w-2 h-2 rounded-full ' + getRoleDotColor(filterRole)}></span>
            <span className="font-medium text-slate-900 dark:text-white dark:text-white ">{currentFilter?.label}</span>
          </div>
          <ChevronDown size={20} className={'text-slate-500 transition-transform duration-200 ' + (filterMenuOpen ? 'rotate-180' : '')} />
        </button>

        {filterMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 dark:border-[#404040] rounded-lg shadow-lg overflow-hidden z-30 dark:bg-[#171717]">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterSelect(option.value)}
                className={'w-full flex items-center gap-3 px-4 py-3 transition ' + (
                  filterRole === option.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                )}
              >
                <span className={'w-2 h-2 rounded-full ' + getRoleDotColor(option.value)}></span>
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
            onClick={() => setFilterRole(option.value)}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ' + (
              filterRole === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats - Móvil (colapsable) */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between bg-slate-100 dark:bg-[#262626] rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Estadísticas</span>
          </div>
          <ChevronDown size={20} className={'text-slate-500 transition-transform duration-200 ' + (showStats ? 'rotate-180' : '')} />
        </button>

        {showStats && (
          <div className="grid grid-cols-2 gap-2 mt-2 ">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:border-[#404040] dark:bg-[#171717]">
              <p className="text-blue-700 text-xs font-medium dark:text-blue-400">Total Usuarios</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{users.length}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 dark:border-[#404040] dark:bg-[#171717]">
              <p className="text-purple-700 text-xs font-medium dark:text-purple-400">Administradores</p>
              <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{totalAdmins}</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 dark:border-[#404040] dark:bg-[#171717]">
              <p className="text-cyan-700 text-xs font-medium dark:text-cyan-400">Técnicos</p>
              <p className="text-xl font-bold text-cyan-800 dark:text-cyan-200">{totalTechnicians}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:border-[#404040] dark:bg-[#171717]">
              <p className="text-green-700 text-xs font-medium dark:text-green-400">Activos</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-200">{totalActive}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats - Desktop (siempre visible) */}
      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UsersIcon size={18} className="text-blue-600" />
            <p className="text-blue-700 text-sm font-medium">Total Usuarios</p>
          </div>
          <p className="text-2xl font-bold text-blue-800">{users.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCog size={18} className="text-purple-600" />
            <p className="text-purple-700 text-sm font-medium">Administradores</p>
          </div>
          <p className="text-2xl font-bold text-purple-800">{totalAdmins}</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={18} className="text-cyan-600" />
            <p className="text-cyan-700 text-sm font-medium">Técnicos</p>
          </div>
          <p className="text-2xl font-bold text-cyan-800">{totalTechnicians}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ToggleRight size={18} className="text-green-600" />
            <p className="text-green-700 text-sm font-medium">Activos</p>
          </div>
          <p className="text-2xl font-bold text-green-800">{totalActive}</p>
        </div>
      </div>

      {/* Lista de usuarios - Móvil (cards) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white dark:bg-[#171717] dark:bg-[#171717] border border-slate-200 dark:border-[#404040] dark:border-[#404040] rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <UserCircle size={24} className="text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user.full_name}</h3>
                    <p className="text-[10px] text-slate-500">Desde {new Date(user.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <span className={'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ' + getRoleBadgeColor(user.role)}>
                    {getRoleIcon(user.role)}
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <Phone size={12} className="text-slate-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
              <button onClick={() => toggleUserStatus(user)} className="flex items-center gap-1.5">
                {user.is_active ? (
                  <>
                    <ToggleRight size={20} className="text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Activo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={20} className="text-slate-400" />
                    <span className="text-xs text-slate-400">Inactivo</span>
                  </>
                )}
              </button>

              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(user)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de usuarios - Desktop (tabla) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Usuario</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Teléfono</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Rol</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Estado</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <UserCircle size={24} className="text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white dark:text-white">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString('es-MX')}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {user.phone ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">
                      <Phone size={16} className="text-slate-400" />
                      <span>{user.phone}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + getRoleBadgeColor(user.role)}>
                    {getRoleIcon(user.role)}
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleUserStatus(user)} className="flex items-center gap-2">
                    {user.is_active ? (
                      <>
                        <ToggleRight size={24} className="text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Activo</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={24} className="text-slate-400" />
                        <span className="text-sm text-slate-400">Inactivo</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(user)} className="text-slate-400 hover:text-red-600 transition" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            No hay usuarios {filterRole !== 'all' ? 'con rol "' + getRoleLabel(filterRole) + '"' : 'registrados aún'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#171717] dark:bg-[#171717] rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="usuario@ejemplo.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:text-slate-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Nombre del usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="(opcional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                >
                  <option value="technician">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-900 dark:text-white border-slate-300 rounded focus:ring-slate-900"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">Usuario activo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-[#171717]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {creating ? 'Creando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
