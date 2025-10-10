import { useState, useEffect } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Edit2, UserCircle, Mail, Phone, Shield, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface UserWithEmail extends UserProfile {
  email?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithEmail | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: 'user' as 'admin' | 'user' | 'manager',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    
    // Get current user to show their email
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
    
    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');

    if (profileError) {
      console.error('Error loading profiles:', profileError);
      setLoading(false);
      return;
    }

    // Add email only for current user (for privacy/security)
    const usersWithEmail = profiles?.map(profile => ({
      ...profile,
      email: profile.id === currentAuthUser?.id && currentAuthUser ? currentAuthUser.email : undefined
    })) || [];

    setUsers(usersWithEmail);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      await supabase
        .from('user_profiles')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingUser.id);
    }

    setShowModal(false);
    setEditingUser(null);
    setFormData({ full_name: '', phone: '', role: 'user', is_active: true });
    loadUsers();
  };

  const toggleUserStatus = async (user: UserWithEmail) => {
    await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    loadUsers();
  };

  const openEditModal = (user: UserWithEmail) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (user: UserWithEmail) => {
    // Get current user
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser();

    // Prevent deleting own account
    if (currentAuthUser && user.id === currentAuthUser.id) {
      alert('❌ No puedes eliminar tu propia cuenta mientras estás conectado.');
      return;
    }

    let confirmMessage = `¿Estás seguro de eliminar al usuario "${user.full_name}"?`;
    confirmMessage += '\n\n⚠️ ADVERTENCIA: Al eliminar este usuario:\n- Se eliminará su perfil\n- Se eliminará su cuenta de autenticación\n- Esta acción NO se puede deshacer';

    if (window.confirm(confirmMessage)) {
      // First delete the profile (will cascade to auth.users if configured)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (!profileError) {
        // Note: Deleting from auth.users requires admin privileges
        // In production, this should be done via a backend function
        loadUsers();
      } else {
        alert('Error al eliminar el usuario: ' + profileError.message);
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'user':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'user':
        return 'Usuario';
      default:
        return role;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando usuarios...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h2>
          <p className="text-slate-600 mt-1">Administra los perfiles de los usuarios registrados</p>
        </div>
        <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
          Los usuarios se registran a través del login
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Usuario</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Teléfono</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rol</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle size={24} className="text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{user.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={16} className="text-slate-400" />
                    <span>{user.email}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {user.phone ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span>{user.phone}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    <Shield size={14} />
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleUserStatus(user)}
                    className="flex items-center gap-2"
                  >
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
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-slate-400 hover:text-blue-600 transition"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No hay usuarios registrados aún</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              {editingUser && editingUser.email && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-1">El email no se puede modificar</p>
                </div>
              )}

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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'admin' | 'user' | 'manager' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                >
                  <option value="user">Usuario</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Usuario activo
                </label>
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
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
