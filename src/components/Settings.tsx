import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { User, Mail, Phone, Shield, Sun, Moon, UserCircle } from 'lucide-react';
import type { UserProfile } from '../lib/supabase';

interface UserData extends UserProfile {
    email?: string;
}

export default function Settings() {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            // Obtener usuario actual
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                console.error('Error getting authenticated user:', authError);
                setLoading(false);
                return;
            }

            if (!user) {
                console.log('No authenticated user found');
                setLoading(false);
                return;
            }

            console.log('Authenticated user ID:', user.id);

            // Obtener perfil del usuario
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

            if (error) {
                console.error('Error loading profile:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
                setLoading(false);
                return;
            }

            if (!profile) {
                console.log('No profile found for user, showing basic info');
                // Si no hay perfil, mostrar solo info básica del auth
                setUserData({
                    id: user.id,
                    email: user.email,
                    full_name: user.email?.split('@')[0] || 'Usuario',
                    role: 'technician',
                    is_active: true,
                    created_at: user.created_at,
                    updated_at: user.updated_at || user.created_at
                });
                setLoading(false);
                return;
            }

            // Combinar datos de auth y profile
            setUserData({
                ...profile,
                email: user.email
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading user data:', error);
            setLoading(false);
        }
    };

    const getRoleLabel = (role: string) => {
        return role === 'admin' ? 'Administrador' : 'Técnico';
    };

    const getRoleBadgeColor = (role: string) => {
        return role === 'admin'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-600 dark:text-slate-400">Cargando...</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-600 dark:text-slate-400">Error al cargar datos del usuario</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Configuración</h2>
                <p className="text-slate-600 dark:text-slate-400">Gestiona tu cuenta y preferencias</p>
            </div>

            {/* Información de la cuenta */}
            <div className="bg-white dark:bg-[#171717] rounded-lg border border-slate-200 dark:border-[#404040] p-6">
                <div className="flex items-center gap-3 mb-6">
                    <UserCircle className="text-slate-700 dark:text-slate-300" size={24} />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Información de la Cuenta
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Nombre completo */}
                    <div className="flex items-start gap-3">
                        <User className="text-slate-400 dark:text-slate-500 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Nombre completo</p>
                            <p className="text-base font-medium text-slate-900 dark:text-white">
                                {userData.full_name}
                            </p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-3">
                        <Mail className="text-slate-400 dark:text-slate-500 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Correo electrónico</p>
                            <p className="text-base font-medium text-slate-900 dark:text-white">
                                {userData.email}
                            </p>
                        </div>
                    </div>

                    {/* Teléfono */}
                    {userData.phone && (
                        <div className="flex items-start gap-3">
                            <Phone className="text-slate-400 dark:text-slate-500 mt-1" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Teléfono</p>
                                <p className="text-base font-medium text-slate-900 dark:text-white">
                                    {userData.phone}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Rol */}
                    <div className="flex items-start gap-3">
                        <Shield className="text-slate-400 dark:text-slate-500 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Rol</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userData.role)}`}>
                                {getRoleLabel(userData.role)}
                            </span>
                        </div>
                    </div>

                    {/* Estado de cuenta */}
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Estado de la cuenta</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${userData.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                {userData.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Apariencia */}
            <div className="bg-white dark:bg-[#171717] rounded-lg border border-slate-200 dark:border-[#404040] p-6">
                <div className="flex items-center gap-3 mb-6">
                    {theme === 'dark' ? (
                        <Moon className="text-slate-700 dark:text-slate-300" size={24} />
                    ) : (
                        <Sun className="text-slate-700 dark:text-slate-300" size={24} />
                    )}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Apariencia
                    </h3>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white mb-1">Tema oscuro</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Activa el modo oscuro para reducir el brillo de la pantalla
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={toggleTheme}
                        className={`relative inline-flex h-7 w-14 min-w-14 flex-shrink-0 items-center rounded-full transition-colors overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-black ${theme === 'dark'
                            ? 'bg-[#262626] dark:bg-[#404040]'
                            : 'bg-slate-300 dark:bg-[#262626]'
                            }`}
                        role="switch"
                        aria-checked={theme === 'dark'}
                    >
                        <span className="sr-only">Cambiar tema</span>
                        <span
                            className={`inline-flex h-5 w-5 items-center justify-center transform rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                                }`}
                        >
                            {theme === 'dark' ? (
                                <Moon size={14} className="text-slate-700" />
                            ) : (
                                <Sun size={14} className="text-slate-700" />
                            )}
                        </span>
                    </button>
                </div>
            </div>

            {/* Información adicional */}
            <div className="bg-slate-50 dark:bg-[#171717]/50 rounded-lg border border-slate-200 dark:border-[#404040] p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Última actualización:</strong> {new Date(userData.updated_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <strong>Cuenta creada:</strong> {new Date(userData.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>
        </div>
    );
}
