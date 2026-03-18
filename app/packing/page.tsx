'use client';

import { useState, useRef, useEffect } from 'react';
import { NVCard, NVData } from '@/components/ui/nv-card';
import { Box, UserCheck, PlusCircle, X } from 'lucide-react';
import { LabelPrinter, LabelData } from '@/components/ui/label-printer';
import { fetchPackingNVs, createPackageRecord, sendNVToSupervisorPacking } from '@/lib/api';

export default function PackingPage() {
  const [nvs, setNvs] = useState<NVData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedNvId, setAssignedNvId] = useState<string | null>(null);
  const [labelToPrint, setLabelToPrint] = useState<LabelData | null>(null);
  const [showRouteModal, setShowRouteModal] = useState<string | null>(null);
  const [routeInput, setRouteInput] = useState('');
  const packageCounter = useRef(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPackingNVs();
      setNvs(data);
    } catch (error) {
      console.error('Error loading NVs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignToMe = (nvId: string) => {
    setAssignedNvId(nvId);
  };

  const createPackage = async (nv: NVData, item: any, qty: number) => {
    const currentPackage = packageCounter.current;
    
    // Create package in DB
    const success = await createPackageRecord(nv.id, currentPackage, [{
      nv_item_id: item.id,
      sku: item.sku,
      description: item.description,
      qty: qty
    }]);

    if (!success) {
      alert('Error al crear el bulto en la base de datos.');
      return;
    }

    packageCounter.current += 1;
    
    const newLabel: LabelData = {
      nv_id: nv.id,
      item_id: item.id,
      nv_number: nv.nv_number,
      sku: item.sku,
      description: item.description,
      quantity: qty,
      package_number: currentPackage,
      total_packages: 10 // Mock total
    };
    
    setLabelToPrint(newLabel);
    
    // Refresh data to show updated packed_qty
    await loadData();
  };

  const cancelPackage = () => {
    if (!labelToPrint || !labelToPrint.nv_id || !labelToPrint.item_id) return;
    
    // In a real app, we would need an API function to delete the package and revert the packed_qty.
    // For now, we'll just hide the label.
    setLabelToPrint(null);
  };

  const openRouteModal = (nvId: string) => {
    setShowRouteModal(nvId);
    setRouteInput('');
  };

  const confirmSendToSupervisor = async () => {
    if (showRouteModal) {
      const success = await sendNVToSupervisorPacking(showRouteModal, routeInput);
      if (success) {
        setAssignedNvId(null);
        setShowRouteModal(null);
        alert('NV enviada a Supervisor Packing exitosamente.');
        await loadData();
      } else {
        alert('Error al enviar NV a Supervisor Packing.');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Hall de Packing</h1>
        <p className="text-gray-500">Seleccionar una NV, crear bultos e imprimir etiquetas</p>
      </div>

      {labelToPrint && (
        <div className="bg-green-50 border-2 border-green-200 p-6 rounded-xl flex flex-col items-center justify-center gap-4 shadow-sm mb-8">
          <h3 className="text-green-800 font-semibold text-lg">Bulto Creado Exitosamente</h3>
          <p className="text-green-700 text-center max-w-md">
            El bulto {labelToPrint.package_number} para {labelToPrint.nv_number} conteniendo {labelToPrint.quantity}x {labelToPrint.sku} está listo.
          </p>
          <div className="flex items-center gap-4">
            <LabelPrinter 
              labelData={labelToPrint} 
              onPrintComplete={() => setLabelToPrint(null)} 
            />
            <button 
              onClick={cancelPackage}
              className="px-6 py-3 rounded-xl font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Cancelar impresión
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4">
        {nvs.map((nv) => {
          const allItemsPacked = nv.items.every(item => item.packed_qty >= item.picked_qty);
          
          return (
          <div key={nv.id} className={`transition-all duration-300 ${assignedNvId && assignedNvId !== nv.id ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <NVCard nv={nv}>
              {assignedNvId !== nv.id ? (
                <button 
                  onClick={() => assignToMe(nv.id)}
                  className="flex items-center gap-2 bg-antko-dark text-white px-4 py-2 rounded-lg hover:bg-antko-darker transition-colors text-sm font-medium"
                >
                  <UserCheck className="w-4 h-4" />
                  Asignarme
                </button>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                    <span className="font-medium flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Asignado a ti
                    </span>
                    <button 
                      onClick={() => setAssignedNvId(null)}
                      className="text-sm underline hover:text-blue-900"
                    >
                      Liberar NV
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">Crear Bultos</h4>
                    {nv.items.map(item => {
                      const remainingToPack = item.picked_qty - item.packed_qty;
                      if (remainingToPack <= 0) return null;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div>
                            <p className="font-medium text-antko-dark">{item.sku}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-antko-dark">{remainingToPack}</span> restantes por empacar
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                id={`qty-${item.id}`}
                                defaultValue={remainingToPack} 
                                max={remainingToPack}
                                min={1}
                                className="w-20 border border-gray-300 rounded-md px-3 py-1.5 text-center font-medium"
                              />
                              <button 
                                onClick={() => {
                                  const input = document.getElementById(`qty-${item.id}`) as HTMLInputElement;
                                  const qty = parseInt(input.value, 10);
                                  if (qty > 0 && qty <= remainingToPack) {
                                    createPackage(nv, item, qty);
                                  } else {
                                    alert('Cantidad inválida');
                                  }
                                }}
                                className="flex items-center gap-1 bg-antko-primary text-white px-4 py-2 rounded-md hover:bg-antko-primary/90 text-sm font-medium transition-colors"
                              >
                                <PlusCircle className="w-4 h-4" />
                                Crear Bulto
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {allItemsPacked && (
                      <div className="mt-6 flex justify-end">
                        <button 
                          onClick={() => openRouteModal(nv.id)}
                          className="bg-antko-dark text-white px-6 py-2 rounded-lg font-medium hover:bg-antko-darker transition-colors"
                        >
                          Enviar a Supervisor Packing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </NVCard>
          </div>
          );
        })}
      </div>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-antko-dark">Asignar Ruta</h2>
              <button onClick={() => setShowRouteModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Por favor, ingrese la ruta sugerida para esta Nota de Venta antes de enviarla al Supervisor de Packing.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruta de la NV</label>
                <input 
                  type="text" 
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-antko-primary"
                  placeholder="Ej: Ruta Norte, Ruta Sur, etc."
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowRouteModal(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSendToSupervisor}
                disabled={!routeInput.trim()}
                className="px-6 py-2 rounded-lg font-medium bg-antko-primary text-white hover:bg-antko-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
