'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Plus, Edit2, Trash2, X, Shield, User, AlertCircle } from 'lucide-react';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  requires_password_change: boolean;
  email?: string;
};

export default function UserManagementPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'comercial'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin_general') {
      loadUsers();
    }
  }, [profile]);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            full_name: formData.full_name,
            role: formData.role,
            password: formData.password || undefined
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
      } else {
        // Create new user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      await loadUsers();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el usuario');
    }
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', full_name: '', role: 'comercial' });
    setEditingUser(null);
    setError(null);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: '', // Email cannot be easily changed in this simple flow without resending confirmation
      password: '', // Leave blank unless changing
      full_name: user.full_name,
      role: user.role
    });
    setShowModal(true);
  };

  if (profile?.role !== 'admin_general') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Solo el Administrador General puede gestionar usuarios.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-antko-dark">Gestión de Usuarios</h1>
          <p className="text-gray-500">Crea y administra los accesos a los paneles</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-antko-primary text-white px-4 py-2 rounded-lg hover:bg-antko-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4">Nombre</th>
                <th className="p-4">Rol / Panel</th>
                <th className="p-4">Estado Contraseña</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${user.role === 'admin_general' ? 'bg-purple-100 text-purple-800' : 
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.requires_password_change ? (
                      <span className="text-orange-600 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Pendiente cambio
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Actualizada
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.role !== 'admin_general' && (
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-antko-dark">
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol / Acceso a Panel</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary bg-white"
                  disabled={profile?.role !== 'admin_general'}
                >
                  <option value="comercial">Comercial</option>
                  <option value="compras">Compras</option>
                  <option value="apoyo_compras">Apoyo en Compras</option>
                  <option value="bodega">Bodega (General)</option>
                  <option value="bodega_ph">Bodega PH</option>
                  <option value="picker">Picker</option>
                  <option value="supervisor_picking">Supervisor Picking</option>
                  <option value="packing">Packing</option>
                  <option value="supervisor_packing">Supervisor Packing</option>
                  <option value="despacho">Despacho (General)</option>
                  <option value="chofer">Chofer</option>
                  <option value="logistica">Logística</option>
                  <option value="reportes">Reportes</option>
                  <option value="admin">Administrador</option>
                  {profile?.role === 'admin_general' && (
                    <option value="admin_general">Administrador General</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary"
                  placeholder={editingUser ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'}
                />
                {!editingUser && (
                  <p className="text-xs text-gray-500 mt-1">El usuario deberá cambiarla en su primer ingreso.</p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg font-medium bg-antko-primary text-white hover:bg-antko-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
