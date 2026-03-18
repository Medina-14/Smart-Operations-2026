'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Users, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PickerPerformance {
  picker_id: string;
  picker_name: string;
  total_assigned: number;
  total_corrections: number;
  error_rate: number;
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const [performanceData, setPerformanceData] = useState<PickerPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      try {
        // Fetch pickers
        const { data: pickers } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'picker');

        if (!pickers) return;

        // Fetch assignments
        const { data: assignments } = await supabase
          .from('picker_assignments')
          .select('picker_id');

        // Fetch corrections
        const { data: corrections } = await supabase
          .from('picker_corrections')
          .select('picker_id');

        const performance: PickerPerformance[] = pickers.map(picker => {
          const assignedCount = assignments?.filter(a => a.picker_id === picker.id).length || 0;
          const correctionCount = corrections?.filter(c => c.picker_id === picker.id).length || 0;
          const errorRate = assignedCount > 0 ? (correctionCount / assignedCount) * 100 : 0;

          return {
            picker_id: picker.id,
            picker_name: picker.full_name || picker.email,
            total_assigned: assignedCount,
            total_corrections: correctionCount,
            error_rate: errorRate
          };
        });

        // Sort by total assigned descending
        performance.sort((a, b) => b.total_assigned - a.total_assigned);
        setPerformanceData(performance);
      } catch (error) {
        console.error('Error loading performance data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile?.role === 'admin_general' || profile?.role === 'admin') {
      loadPerformance();
    }
  }, [profile]);

  if (profile?.role !== 'admin_general' && profile?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Se requiere rol de Administrador.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Reportes de Desempeño</h1>
        <p className="text-gray-500">Análisis de rendimiento y calidad de trabajo del equipo de Picking</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-antko-dark">Desempeño de Pickers</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Picker</th>
                  <th className="px-6 py-4 text-center">NVs Asignadas</th>
                  <th className="px-6 py-4 text-center">Correcciones Solicitadas</th>
                  <th className="px-6 py-4 text-center">Tasa de Error</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {performanceData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No hay datos de desempeño disponibles.
                    </td>
                  </tr>
                ) : (
                  performanceData.map((data) => (
                    <tr key={data.picker_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {data.picker_name.charAt(0).toUpperCase()}
                        </div>
                        {data.picker_name}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        {data.total_assigned}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-amber-600">
                        {data.total_corrections}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          data.error_rate === 0 ? 'bg-green-100 text-green-700' :
                          data.error_rate < 10 ? 'bg-blue-100 text-blue-700' :
                          data.error_rate < 20 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {data.error_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {data.error_rate === 0 && data.total_assigned > 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                            <CheckCircle2 className="w-4 h-4" /> Excelente
                          </span>
                        ) : data.error_rate > 20 ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
                            <AlertTriangle className="w-4 h-4" /> Requiere Atención
                          </span>
                        ) : data.total_assigned === 0 ? (
                          <span className="text-gray-400 text-xs italic">Sin actividad</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium text-xs">
                            <TrendingUp className="w-4 h-4" /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
