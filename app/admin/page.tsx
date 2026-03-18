'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Users, FileText, Package, Truck, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalNVs: 0,
    pendingNVs: 0,
    totalUsers: 0,
    standbyItems: 0,
    pendingPurchases: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: totalNVs },
          { count: pendingNVs },
          { count: totalUsers },
          { count: standbyItems },
          { count: pendingPurchases }
        ] = await Promise.all([
          supabase.from('nvs').select('*', { count: 'exact', head: true }),
          supabase.from('nvs').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('standby_items').select('*', { count: 'exact', head: true }).eq('status', 'esperando'),
          supabase.from('nv_items').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_compra')
        ]);

        setStats({
          totalNVs: totalNVs || 0,
          pendingNVs: pendingNVs || 0,
          totalUsers: totalUsers || 0,
          standbyItems: standbyItems || 0,
          pendingPurchases: pendingPurchases || 0
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile?.role === 'admin_general' || profile?.role === 'admin') {
      loadStats();
    }
  }, [profile]);

  if (profile?.role !== 'admin_general' && profile?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Se requiere rol de Administrador.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Resumen de Operación</h1>
        <p className="text-gray-500">Vista general del estado de la empresa</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total NVs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNVs}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">NVs Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingNVs}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Items en Bodega PH</p>
                <p className="text-2xl font-bold text-gray-900">{stats.standbyItems}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos a Paneles</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/commercial" className="p-4 border border-gray-200 rounded-lg hover:border-antko-primary hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-antko-dark">Panel Comercial</h3>
                  <p className="text-sm text-gray-500 mt-1">Ver y cargar NVs</p>
                </Link>
                <Link href="/picker" className="p-4 border border-gray-200 rounded-lg hover:border-antko-primary hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-antko-dark">Panel Picking</h3>
                  <p className="text-sm text-gray-500 mt-1">Preparación de pedidos</p>
                </Link>
                <Link href="/purchasing" className="p-4 border border-gray-200 rounded-lg hover:border-antko-primary hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-antko-dark">Panel Compras</h3>
                  <p className="text-sm text-gray-500 mt-1">Gestión de OCs</p>
                </Link>
                <Link href="/packing" className="p-4 border border-gray-200 rounded-lg hover:border-antko-primary hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-antko-dark">Panel Packing</h3>
                  <p className="text-sm text-gray-500 mt-1">Embalaje y bultos</p>
                </Link>
                <Link href="/dispatch" className="p-4 border border-gray-200 rounded-lg hover:border-antko-primary hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-antko-dark">Panel Despacho</h3>
                  <p className="text-sm text-gray-500 mt-1">Rutas y entregas</p>
                </Link>
                {profile?.role === 'admin_general' && (
                  <Link href="/admin/users" className="p-4 border border-antko-primary bg-antko-primary/5 rounded-lg hover:bg-antko-primary/10 transition-colors">
                    <h3 className="font-medium text-antko-primary">Gestión de Usuarios</h3>
                    <p className="text-sm text-gray-600 mt-1">Crear y editar cuentas</p>
                  </Link>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas de Operación</h2>
              <div className="space-y-4">
                {stats.pendingPurchases > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Compras Pendientes</p>
                      <p className="text-sm opacity-90">Hay {stats.pendingPurchases} ítems esperando ser gestionados en compras.</p>
                    </div>
                  </div>
                )}
                {stats.standbyItems > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 text-orange-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Bodega Puente Habilitada</p>
                      <p className="text-sm opacity-90">Hay {stats.standbyItems} ítems esperando ingreso físico a bodega.</p>
                    </div>
                  </div>
                )}
                {stats.pendingPurchases === 0 && stats.standbyItems === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                    <p>No hay alertas críticas en la operación.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
