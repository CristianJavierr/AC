import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function VerifyEmail() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const type = params.get('type');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const isExpired = errorDescription?.toLowerCase().includes('expired') || errorDescription?.toLowerCase().includes('expir');
  const isSuccess = !error && !errorDescription && (type === 'signup' || type === null);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setResending(true);
    setResendSuccess(false);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/verify-email'
      }
    });
    
    if (!error) {
      setResendSuccess(true);
    }
    
    setResending(false);
  };

  useEffect(() => {
    // Clean up hash fragments (some providers append) so UI looks tidy
    if (window.location.hash) {
      history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Verificación de Correo</h1>
          <p className="text-slate-600 mt-1">Estado de tu confirmación de email</p>
        </div>

        {isSuccess && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
              <p className="font-medium">¡Tu correo fue verificado correctamente!</p>
              <p className="text-sm mt-1">Ahora puedes iniciar sesión para continuar.</p>
            </div>
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition"
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}

        {!isSuccess && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${isExpired ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'bg-red-50 border border-red-200 text-red-800'}`}> 
              <p className="font-medium">
                {isExpired ? 'El enlace de verificación ha expirado.' : 'No se pudo verificar tu correo.'}
              </p>
              {errorDescription && (
                <p className="text-sm mt-1">Detalle: {errorDescription}</p>
              )}
              <p className="text-sm mt-1">Puedes solicitar un nuevo enlace a continuación.</p>
            </div>
            
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
                <p className="font-medium">¡Correo reenviado!</p>
                <p className="text-sm mt-1">Revisa tu bandeja de entrada y spam.</p>
              </div>
            )}

            <form onSubmit={handleResendVerification} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tu correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={resending || !email}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {resending ? 'Reenviando...' : 'Reenviar verificación'}
              </button>
            </form>

            <button
              onClick={() => (window.location.href = '/')}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
