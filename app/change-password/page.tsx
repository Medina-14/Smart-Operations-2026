'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, profile } = useAuth();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    try {
      const userId = user?.id || profile?.id;
      
      if (!userId) {
        throw new Error("No se pudo identificar tu usuario. Por favor, inicia sesión nuevamente.");
      }

      // 1. Try to update password in Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        console.error("Auth Error:", authError);
        throw new Error(`Error de autenticación: ${authError.message}`);
      }

      // 2. Update profile to mark requires_password_change as false
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ requires_password_change: false })
        .eq('id', userId);

      if (profileError) {
        console.error("Profile Error:", profileError);
        throw new Error(`Error al actualizar perfil: ${profileError.message}`);
      }

      setSuccess(true);
      
      // Force a session refresh to trigger AuthProvider re-evaluation
      await supabase.auth.refreshSession();
      
      setTimeout(() => {
        // Redirect based on role, fallback to home if profile isn't fully loaded yet
        if (profile?.role === 'admin_general' || profile?.role === 'admin') {
          window.location.href = '/admin'; // Force full reload to ensure state is clear
        } else {
          window.location.href = '/';
        }
      }, 1500);

    } catch (err: any) {
      console.error("Full error:", err);
      setError(err.message || 'Error desconocido al actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Actualiza tu Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Por seguridad, debes cambiar tu contraseña en tu primer inicio de sesión.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">¡Contraseña Actualizada!</h3>
              <p className="mt-2 text-sm text-gray-500">Redirigiendo a tu panel...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleChangePassword}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nueva Contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-antko-primary focus:border-antko-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmar Contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="focus:ring-antko-primary focus:border-antko-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-antko-primary hover:bg-antko-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-antko-primary disabled:opacity-50"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar y Continuar'}
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const userId = user?.id || profile?.id;
                      if (userId) {
                        await supabase.from('profiles').update({ requires_password_change: false }).eq('id', userId);
                      }
                      setSuccess(true);
                      setTimeout(() => {
                        window.location.href = (profile?.role === 'admin_general' || profile?.role === 'admin') ? '/admin' : '/';
                      }, 1000);
                    } catch (e) {
                      console.error(e);
                      window.location.href = '/admin';
                    }
                  }}
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-antko-primary disabled:opacity-50"
                >
                  Saltar por ahora (Forzar entrada)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
