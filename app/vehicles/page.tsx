'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { fetchVehicles, updateVehicleMaintenance, VehicleData } from '@/lib/api';
import { Truck, Wrench, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Save } from 'lucide-react';

export default function VehiclesPage() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit state
  const [editMaintenance, setEditMaintenance] = useState<{ [id: string]: string }>({});
  const [isSaving, setIsSaving] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVehicles();
      setVehicles(data);
      
      // Initialize edit state
      const initialEditState: { [id: string]: string } = {};
      data.forEach(v => {
        initialEditState[v.id] = v.next_maintenance_mileage.toString();
      });
      setEditMaintenance(initialEditState);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaintenance = async (id: string) => {
    const nextMileage = parseInt(editMaintenance[id]);
    if (isNaN(nextMileage)) {
      alert('Por favor ingrese un kilometraje válido.');
      return;
    }

    setIsSaving(prev => ({ ...prev, [id]: true }));
    try {
      const success = await updateVehicleMaintenance(id, nextMileage);
      if (success) {
        setVehicles(prev => prev.map(v => v.id === id ? { ...v, next_maintenance_mileage: nextMileage } : v));
        alert('Kilometraje de próxima mantención actualizado correctamente.');
      } else {
        alert('Error al actualizar la mantención.');
      }
    } catch (error) {
      console.error('Error saving maintenance:', error);
      alert('Error inesperado al guardar.');
    } finally {
      setIsSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (profile?.role !== 'admin_general' && profile?.role !== 'admin' && profile?.role !== 'despacho') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Se requiere rol de Despacho o Administrador.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel de Vehículos</h1>
        <p className="text-gray-500">Control de kilometraje y mantenciones preventivas de la flota</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {vehicles.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No hay vehículos registrados en el sistema.</p>
            </div>
          ) : (
            vehicles.map(vehicle => {
              const remaining = vehicle.next_maintenance_mileage - vehicle.current_mileage;
              const isUrgent = remaining <= 1000 && vehicle.next_maintenance_mileage > 0;
              const isOverdue = remaining < 0 && vehicle.next_maintenance_mileage > 0;
              const isExpanded = expandedId === vehicle.id;

              return (
                <div key={vehicle.id} className={`bg-white rounded-xl shadow-sm border transition-colors ${isOverdue ? 'border-red-300' : isUrgent ? 'border-orange-300' : 'border-gray-200'}`}>
                  {/* Header (Clickable) */}
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(vehicle.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600' : isUrgent ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-antko-dark">{vehicle.plate}</h2>
                        <p className="text-sm text-gray-500">
                          {vehicle.brand} {vehicle.model ? `- ${vehicle.model}` : ''} • Último reporte: <span className="font-mono font-medium text-gray-900">{vehicle.current_mileage.toLocaleString('es-CL')} km</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {vehicle.next_maintenance_mileage > 0 ? (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Estado Mantención</p>
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                              <AlertTriangle className="w-4 h-4" /> Atrasada por {Math.abs(remaining).toLocaleString('es-CL')} km
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                              <AlertTriangle className="w-4 h-4" /> Faltan {remaining.toLocaleString('es-CL')} km
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                              <CheckCircle2 className="w-4 h-4" /> Faltan {remaining.toLocaleString('es-CL')} km
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic hidden sm:block">Sin mantención programada</span>
                      )}
                      
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Info Card */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Información Actual
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600">Patente</span>
                              <span className="font-bold text-antko-dark">{vehicle.plate}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600">Marca / Modelo</span>
                              <span className="font-medium text-antko-dark">{vehicle.brand || 'N/A'} {vehicle.model || ''}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600">N° Chasis</span>
                              <span className="font-mono text-sm text-antko-dark">{vehicle.chassis || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600">Kilometraje Actual</span>
                              <span className="font-mono font-bold text-antko-dark">{vehicle.current_mileage.toLocaleString('es-CL')} km</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Próxima Mantención</span>
                              <span className="font-mono font-bold text-antko-primary">{vehicle.next_maintenance_mileage > 0 ? `${vehicle.next_maintenance_mileage.toLocaleString('es-CL')} km` : 'No definida'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Update Card */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Wrench className="w-4 h-4" /> Programar Mantención
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Actualice el kilometraje en el que se debe realizar la próxima mantención del vehículo.
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Próximo Kilometraje (km)</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  value={editMaintenance[vehicle.id] || ''}
                                  onChange={(e) => setEditMaintenance(prev => ({ ...prev, [vehicle.id]: e.target.value }))}
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary"
                                  placeholder="Ej: 150000"
                                />
                                <button 
                                  onClick={() => handleSaveMaintenance(vehicle.id)}
                                  disabled={isSaving[vehicle.id]}
                                  className="bg-antko-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-antko-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  {isSaving[vehicle.id] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                  Guardar
                                </button>
                              </div>
                            </div>
                            
                            {vehicle.next_maintenance_mileage > 0 && (
                              <div className={`p-3 rounded-lg text-sm ${isOverdue ? 'bg-red-50 text-red-700' : isUrgent ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                                {isOverdue ? (
                                  <><strong>¡Atención!</strong> La mantención está atrasada. El vehículo superó el kilometraje programado.</>
                                ) : isUrgent ? (
                                  <><strong>¡Pronto!</strong> Faltan menos de 1.000 km para la próxima mantención.</>
                                ) : (
                                  <span>El vehículo está al día con sus mantenciones.</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
