'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { fetchVehicles, updateVehicleMaintenance, VehicleData, fetchMaintenanceLogs, addMaintenanceLog } from '@/lib/api';
import { Truck, Wrench, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Save, FileText, Plus, Calendar } from 'lucide-react';

export default function VehiclesPage() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit state
  const [editMaintenance, setEditMaintenance] = useState<{ [id: string]: string }>({});
  const [isSaving, setIsSaving] = useState<{ [id: string]: boolean }>({});
  
  // Bitácora state
  const [logs, setLogs] = useState<any[]>([]);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLog, setNewLog] = useState({ date: '', mileage: '', description: '', invoice_url: '' });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVehicles();
      setVehicles(data);
      const initialEditState: { [id: string]: string } = {};
      data.forEach(v => { initialEditState[v.id] = v.next_maintenance_mileage.toString(); });
      setEditMaintenance(initialEditState);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Cargar bitácora al expandir
      const maintenanceLogs = await fetchMaintenanceLogs(id);
      setLogs(maintenanceLogs);
    }
  };

  const handleSaveMaintenance = async (id: string) => {
    const nextMileage = parseInt(editMaintenance[id]);
    if (isNaN(nextMileage)) { alert('Kilometraje inválido.'); return; }
    setIsSaving(prev => ({ ...prev, [id]: true }));
    try {
      const success = await updateVehicleMaintenance(id, nextMileage);
      if (success) {
        setVehicles(prev => prev.map(v => v.id === id ? { ...v, next_maintenance_mileage: nextMileage } : v));
        alert('Mantención actualizada.');
      }
    } finally {
      setIsSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAddLog = async (vehicleId: string) => {
    if (!newLog.date || !newLog.mileage || !newLog.description) { alert('Completa los campos obligatorios.'); return; }
    const success = await addMaintenanceLog({
      vehicle_id: vehicleId,
      date: newLog.date,
      mileage: parseInt(newLog.mileage),
      description: newLog.description,
      invoice_url: newLog.invoice_url
    });
    if (success) {
      alert('Bitácora agregada.');
      setNewLog({ date: '', mileage: '', description: '', invoice_url: '' });
      setIsAddingLog(false);
      const updatedLogs = await fetchMaintenanceLogs(vehicleId);
      setLogs(updatedLogs);
    }
  };

  if (profile?.role !== 'admin_general' && profile?.role !== 'admin' && profile?.role !== 'despacho') {
    return <div className="p-8 text-center text-red-500">Acceso denegado.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel de Vehículos</h1>
        <p className="text-gray-500">Control de flota, mantenciones y documentación</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div></div>
      ) : (
        <div className="grid gap-4">
          {vehicles.map(vehicle => {
            const remaining = vehicle.next_maintenance_mileage - vehicle.current_mileage;
            const isUrgent = remaining <= 1000 && vehicle.next_maintenance_mileage > 0;
            const isOverdue = remaining < 0 && vehicle.next_maintenance_mileage > 0;
            const isExpanded = expandedId === vehicle.id;

            return (
              <div key={vehicle.id} className={`bg-white rounded-xl shadow-sm border ${isOverdue ? 'border-red-300' : isUrgent ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(vehicle.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600' : isUrgent ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-antko-dark">{vehicle.plate}</h2>
                      <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>

                {isExpanded && (
                  <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-6">
                    {/* Información y Programación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold mb-4">Información Actual</h3>
                        <div className="space-y-2 text-sm">
                          <p><strong>Patente:</strong> {vehicle.plate}</p>
                          <p><strong>Venc. Permiso Circ.:</strong> {vehicle.permiso_circulacion_vencimiento || 'No definido'}</p>
                          <p><strong>Kilometraje:</strong> {vehicle.current_mileage.toLocaleString('es-CL')} km</p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold mb-4">Programar Mantención</h3>
                        <div className="flex gap-2">
                          <input type="number" value={editMaintenance[vehicle.id] || ''} onChange={(e) => setEditMaintenance(prev => ({ ...prev, [vehicle.id]: e.target.value }))} className="flex-1 border rounded-lg px-3 py-2" />
                          <button onClick={() => handleSaveMaintenance(vehicle.id)} className="bg-antko-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
                        </div>
                      </div>
                    </div>

                    {/* Bitácora */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Wrench className="w-4 h-4" /> Bitácora de Mantenciones</h3>
                        <button onClick={() => setIsAddingLog(!isAddingLog)} className="text-sm text-antko-primary flex items-center gap-1"><Plus className="w-4 h-4" /> Agregar Registro</button>
                      </div>

                      {isAddingLog && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                          <input type="date" className="border rounded px-2 py-1" onChange={e => setNewLog({...newLog, date: e.target.value})} />
                          <input type="number" placeholder="Km" className="border rounded px-2 py-1" onChange={e => setNewLog({...newLog, mileage: e.target.value})} />
                          <input type="text" placeholder="Descripción" className="border rounded px-2 py-1" onChange={e => setNewLog({...newLog, description: e.target.value})} />
                          <input type="text" placeholder="URL Factura PDF" className="border rounded px-2 py-1" onChange={e => setNewLog({...newLog, invoice_url: e.target.value})} />
                          <button onClick={() => handleAddLog(vehicle.id)} className="bg-green-600 text-white rounded px-2 py-1">Guardar</button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {logs.map(log => (
                          <div key={log.id} className="flex justify-between items-center p-2 border-b text-sm">
                            <span>{new Date(log.date).toLocaleDateString()} - {log.description} ({log.mileage} km)</span>
                            {log.invoice_url && <a href={log.invoice_url} target="_blank" className="text-blue-600 flex items-center gap-1"><FileText className="w-4 h-4" /> Factura</a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
