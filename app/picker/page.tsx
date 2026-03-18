'use client';

import { useState, useEffect } from 'react';
import { NVCard, NVData } from '@/components/ui/nv-card';
import { fetchNVs, updateNVStatus, updateNVItem } from '@/lib/api';
import { Send, AlertTriangle } from 'lucide-react';

export default function PickerPage() {
  const [nvs, setNvs] = useState<NVData[]>([]);
  const [collectedQty, setCollectedQty] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await fetchNVs();
      // Filter NVs that are in 'picking' status
      setNvs(data.filter(nv => nv.status === 'picking'));
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleQtyChange = (itemId: string, value: string, maxQty: number) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue)) numValue = 0;
    if (numValue < 0) numValue = 0;
    if (numValue > maxQty) numValue = maxQty;
    
    setCollectedQty(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  const sendToReview = async (nv: NVData) => {
    // Update each item's picked_qty and status
    for (const item of nv.items) {
      const qty = collectedQty[item.id] !== undefined ? collectedQty[item.id] : (item.picked_qty || 0);
      await updateNVItem(item.id, {
        picked_qty: qty,
        status: 'revision'
      });
    }

    // Update NV status to 'revision'
    const success = await updateNVStatus(nv.id, 'revision');
    
    if (success) {
      setNvs(nvs.filter(n => n.id !== nv.id));
      alert('Nota de Venta enviada a revisión del Supervisor de Picking.');
    } else {
      alert('Hubo un error al enviar a revisión.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel de Picking</h1>
        <p className="text-gray-500">Ingresar cantidades reales recolectadas y enviar a revisión</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : nvs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
          No hay Notas de Venta pendientes de picking.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {nvs.map((nv) => (
            <NVCard key={nv.id} nv={nv}>
              <div className="flex flex-col gap-4 w-full">
                <div className="space-y-3">
                  {nv.items.map(item => {
                    const currentQty = collectedQty[item.id] !== undefined ? collectedQty[item.id] : (item.picked_qty || 0);
                    const isShortage = currentQty < item.requested_qty;

                    return (
                      <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-antko-dark">{item.sku}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-gray-600 flex flex-col items-end">
                            <span>Solicitado: <span className="font-bold text-antko-dark">{item.requested_qty}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Recolectado:</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={item.requested_qty}
                              value={currentQty}
                              onChange={(e) => handleQtyChange(item.id, e.target.value, item.requested_qty)}
                              className={`w-20 border rounded-md px-2 py-1 text-center outline-none focus:ring-2 focus:ring-antko-primary/50 ${isShortage ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                            />
                          </div>
                          {isShortage && (
                            <div className="text-amber-500 flex items-center gap-1 text-xs font-medium" title="Cantidad recolectada es menor a la solicitada">
                              <AlertTriangle className="w-4 h-4" />
                              Faltante
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-end mt-2 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => sendToReview(nv)}
                    className="flex items-center gap-2 bg-antko-primary text-white px-6 py-2 rounded-lg hover:bg-antko-primary/90 font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Enviar a Revisión
                  </button>
                </div>
              </div>
            </NVCard>
          ))}
        </div>
      )}
    </div>
  );
}
