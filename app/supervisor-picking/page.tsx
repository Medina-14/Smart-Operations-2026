'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { NVCard, NVData } from '@/components/ui/nv-card';
import { fetchNVs, updateNVStatus, updateNVItem, fetchStandbyItems, createStandbyItem, updateStandbyItemStatus, StandbyItemData, fetchPickers, assignNvToPicker, logPickerCorrection, PickerData } from '@/lib/api';
import { Users, AlertTriangle, ShoppingCart, Archive, Clock, Camera, Check, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

type TabType = 'asignacion' | 'revision' | 'standby';

export default function SupervisorPickingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('asignacion');
  const [nvs, setNvs] = useState<NVData[]>([]);
  const [standbyItems, setStandbyItems] = useState<StandbyItemData[]>([]);
  const [pickers, setPickers] = useState<PickerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPicker, setSelectedPicker] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      const [nvsData, standbyData, pickersData] = await Promise.all([
        fetchNVs(),
        fetchStandbyItems(),
        fetchPickers()
      ]);
      setNvs(nvsData.filter(nv => ['pendiente', 'picking', 'revision'].includes(nv.status)));
      setStandbyItems(standbyData);
      setPickers(pickersData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // Camera & Validation State
  const [activeCameraItem, setActiveCameraItem] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<Record<string, string>>({});
  const [manageQty, setManageQty] = useState<Record<string, number>>({});
  const webcamRef = useRef<Webcam>(null);

  const assignPicker = async (nvId: string) => {
    const pickerId = selectedPicker[nvId];
    if (!pickerId) {
      alert('Debe seleccionar un picker antes de asignar.');
      return;
    }

    const success = await assignNvToPicker(nvId, pickerId);
    if (success) {
      setNvs(nvs.map(nv => nv.id === nvId ? { ...nv, status: 'picking', picker_id: pickerId } : nv));
      alert(`NV asignada a picker exitosamente.`);
    }
  };

  const handleCapture = useCallback((itemId: string) => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setItemPhotos(prev => ({ ...prev, [itemId]: imageSrc }));
      setActiveCameraItem(null);
    }
  }, [webcamRef]);

  const validateItem = async (nvId: string, itemId: string) => {
    if (!itemPhotos[itemId]) {
      alert('Debe capturar una imagen de respaldo antes de validar.');
      return;
    }
    
    // In a real app, you would upload the photo to Supabase Storage here
    const success = await updateNVItem(itemId, { status: 'validado' });
    if (success) {
      setNvs(nvs.map(nv => {
        if (nv.id === nvId) {
          return {
            ...nv,
            items: nv.items.map(i => i.id === itemId ? { ...i, status: 'validado' } : i)
          };
        }
        return nv;
      }));
    }
  };

  const rejectItem = async (nvId: string, itemId: string) => {
    if (!itemPhotos[itemId]) {
      alert('Debe capturar una imagen de respaldo para documentar el error.');
      return;
    }
    
    const reason = prompt('Ingrese el motivo de la corrección:');
    if (!reason) return;

    const nv = nvs.find(n => n.id === nvId);
    const pickerId = nv?.picker_id || 'unknown';

    const success = await updateNVItem(itemId, { status: 'error_picking' });
    if (success) {
      await logPickerCorrection(nvId, itemId, pickerId, reason);
      
      setNvs(nvs.map(nv => {
        if (nv.id === nvId) {
          return {
            ...nv,
            items: nv.items.map(i => i.id === itemId ? { ...i, status: 'error_picking' } : i)
          };
        }
        return nv;
      }));
      alert('Ítem devuelto al picker para corrección. Se ha registrado el error.');
    }
  };

  const sendToPurchases = async (nvId: string, itemId: string, qtyToBuy: number) => {
    if (qtyToBuy > 0) {
      const success = await updateNVItem(itemId, { status: 'pendiente_compra' });
      if (success) {
        setNvs(nvs.map(nv => {
          if (nv.id === nvId) {
            return {
              ...nv,
              items: nv.items.map(item => 
                item.id === itemId ? { ...item, status: 'pendiente_compra' } : item
              )
            };
          }
          return nv;
        }));
        alert(`Se ha enviado la solicitud de compra por ${qtyToBuy} unidades.`);
      }
    } else {
      alert('Ingrese una cantidad válida mayor a 0.');
    }
  };

  const sendToStandby = async (nvId: string, item: any, qtyToStandby: number) => {
    if (qtyToStandby > 0) {
      const successItem = await updateNVItem(item.id, { status: 'standby_ph' });
      const successStandby = await createStandbyItem(item.id, qtyToStandby);
      
      if (successItem && successStandby) {
        // Refresh standby items
        const newStandbyData = await fetchStandbyItems();
        setStandbyItems(newStandbyData);
        
        setNvs(nvs.map(n => {
          if (n.id === nvId) {
            return {
              ...n,
              items: n.items.map(i => 
                i.id === item.id ? { ...i, status: 'standby_ph' } : i
              )
            };
          }
          return n;
        }));
        alert(`Producto enviado a Stand by (Bodega PH) por ${qtyToStandby} unidades.`);
      }
    } else {
      alert('Ingrese una cantidad válida mayor a 0.');
    }
  };

  const moveToRevision = async (item: StandbyItemData) => {
    // Update NV item status back to revision
    const successItem = await updateNVItem(item.nv_item_id, { status: 'revision' });
    // Update standby item status to processed or delete it. For now, we just remove it from view
    // In a real app we might want to keep history, but here we just delete or mark as done.
    // Let's just remove it from the local state for now, assuming the DB trigger or another status handles it.
    // Actually, let's just delete it from standby_items or mark as 'procesado'
    const successStandby = await updateStandbyItemStatus(item.id, 'procesado');
    
    if (successItem && successStandby) {
      setStandbyItems(items => items.filter(i => i.id !== item.id));
      
      // Update local NV state
      setNvs(nvs.map(n => {
        return {
          ...n,
          items: n.items.map(i => 
            i.id === item.nv_item_id ? { ...i, status: 'revision' } : i
          )
        };
      }));
      
      alert(`El producto ${item.sku} ha sido cargado a la pestaña de Revisión para continuar con el embalaje.`);
    }
  };

  const authorizeRevision = async (nvId: string) => {
    const success = await updateNVStatus(nvId, 'packing');
    if (success) {
      setNvs(nvs.filter(nv => nv.id !== nvId));
      alert('Revisión autorizada. NV enviada a Packing.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Supervisor Picking</h1>
        <p className="text-gray-500">Asignar NV, revisar picking y gestionar faltantes</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'asignacion' ? 'border-antko-primary text-antko-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('asignacion')}
        >
          Asignación
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'revision' ? 'border-antko-primary text-antko-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('revision')}
        >
          Revisión
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'standby' ? 'border-antko-primary text-antko-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('standby')}
        >
          Stand by (Bodega PH)
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeTab === 'asignacion' && (
            <>
              {nvs.filter(nv => nv.status === 'pendiente' || nv.status === 'picking').map((nv) => (
                <NVCard key={nv.id} nv={nv}>
                  {nv.status === 'pendiente' ? (
                    <div className="flex items-center gap-2">
                      <select 
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-antko-primary"
                        value={selectedPicker[nv.id] || ''}
                        onChange={(e) => setSelectedPicker(prev => ({ ...prev, [nv.id]: e.target.value }))}
                      >
                        <option value="">Seleccionar Picker...</option>
                        {pickers.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => assignPicker(nv.id)}
                        disabled={!selectedPicker[nv.id]}
                        className="flex items-center gap-2 bg-antko-secondary text-white px-4 py-2 rounded-lg hover:bg-antko-secondary/90 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Users className="w-4 h-4" />
                        Asignar
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 italic">Asignado a picking</span>
                  )}
                </NVCard>
              ))}
              {nvs.filter(nv => nv.status === 'pendiente' || nv.status === 'picking').length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                  No hay Notas de Venta pendientes de asignación.
                </div>
              )}
            </>
          )}

        {activeTab === 'revision' && (
          <>
            {nvs.filter(nv => nv.status === 'revision').map((nv) => {
              const allProcessed = nv.items.every(i => i.status !== 'revision' && i.status !== 'error_picking');
              
              return (
              <NVCard key={nv.id} nv={nv}>
                <div className="flex flex-col gap-4 w-full">
                  <div className="space-y-4">
                    {nv.items.map(item => {
                      const missingQty = item.requested_qty - (item.picked_qty || 0);
                      const isShortage = missingQty > 0;
                      const currentManageQty = manageQty[item.id] !== undefined ? manageQty[item.id] : missingQty;

                      return (
                        <div key={item.id} className={`flex flex-col bg-white p-4 rounded-lg border shadow-sm ${item.status === 'error_picking' ? 'border-red-200 bg-red-50/30' : isShortage && item.status === 'revision' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-antko-dark">{item.sku}</p>
                              <p className="text-xs text-gray-500">{item.description}</p>
                              
                              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                <span>Req: <span className="font-bold text-antko-dark">{item.requested_qty}</span></span>
                                <span>Pick: <span className="font-bold text-antko-dark">{item.picked_qty || 0}</span></span>
                                {isShortage && <span className="text-amber-600 font-medium">Falta: {missingQty}</span>}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {item.status === 'validado' ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                                  <CheckCircle2 className="w-4 h-4" /> Validado
                                </span>
                              ) : item.status === 'error_picking' ? (
                                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                                  Devuelto a Picker
                                </span>
                              ) : item.status === 'pendiente_compra' ? (
                                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  En Compras
                                </span>
                              ) : item.status === 'standby_ph' ? (
                                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                  Stand by PH
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setActiveCameraItem(activeCameraItem === item.id ? null : item.id)}
                                    className={`p-2 rounded-md transition-colors ${itemPhotos[item.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    title="Capturar respaldo"
                                  >
                                    {itemPhotos[item.id] ? <ImageIcon className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => validateItem(nv.id, item.id)}
                                    className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                    title="Validar coincidencia"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => rejectItem(nv.id, item.id)}
                                    className="p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                    title="Devolver a Picker (Error)"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Camera Section */}
                          {activeCameraItem === item.id && !itemPhotos[item.id] && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="relative w-full max-w-sm mx-auto aspect-video bg-black rounded-lg overflow-hidden mb-3">
                                <Webcam
                                  audio={false}
                                  ref={webcamRef}
                                  screenshotFormat="image/jpeg"
                                  videoConstraints={{ facingMode: 'environment' }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => handleCapture(item.id)}
                                  className="bg-antko-secondary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-antko-secondary/90"
                                >
                                  <Camera className="w-4 h-4" /> Tomar Foto
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Photo Preview */}
                          {itemPhotos[item.id] && activeCameraItem === item.id && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={itemPhotos[item.id]} alt="Respaldo" className="max-w-sm w-full rounded-lg border border-gray-300 mb-3" />
                              <button 
                                onClick={() => {
                                  const newPhotos = {...itemPhotos};
                                  delete newPhotos[item.id];
                                  setItemPhotos(newPhotos);
                                }}
                                className="text-red-500 text-sm font-medium hover:underline"
                              >
                                Eliminar foto y volver a tomar
                              </button>
                            </div>
                          )}

                          {/* Management Actions (Comprar / Bodega PH) */}
                          {item.status === 'revision' && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                              <div className="text-sm text-gray-600">
                                Gestionar faltante / stock:
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={currentManageQty}
                                  onChange={(e) => setManageQty({...manageQty, [item.id]: parseInt(e.target.value) || 0})}
                                  min={1}
                                  className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-antko-primary"
                                />
                                <button 
                                  onClick={() => sendToPurchases(nv.id, item.id, currentManageQty)}
                                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-xs font-medium transition-colors"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  Comprar
                                </button>
                                <button 
                                  onClick={() => sendToStandby(nv.id, item, currentManageQty)}
                                  className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 text-xs font-medium transition-colors"
                                >
                                  <Archive className="w-4 h-4" />
                                  Bodega PH
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => authorizeRevision(nv.id)}
                      disabled={!allProcessed}
                      className="bg-antko-dark text-white px-6 py-2 rounded-lg font-medium hover:bg-antko-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Completar y Autorizar Revisión
                    </button>
                  </div>
                </div>
              </NVCard>
            )})}
            {nvs.filter(nv => nv.status === 'revision').length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                No hay Notas de Venta en revisión.
              </div>
            )}
          </>
        )}

        {activeTab === 'standby' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-antko-dark flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Productos en Espera (Bodega PH)
              </h3>
              <p className="text-sm text-gray-500 mt-1">Estos productos están a la espera de validación por el Supervisor de Packing cuando ingresen a bodega.</p>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium">Fecha/Hora</th>
                    <th className="px-6 py-3 font-medium">NV</th>
                    <th className="px-6 py-3 font-medium">SKU / Descripción</th>
                    <th className="px-6 py-3 font-medium text-right">Faltante</th>
                    <th className="px-6 py-3 font-medium text-center">Estado</th>
                    <th className="px-6 py-3 font-medium text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {standbyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-500">{item.date}</td>
                      <td className="px-6 py-4 font-medium text-antko-dark">{item.nv_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-antko-dark">{item.sku}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600">{item.missing_qty}</td>
                      <td className="px-6 py-4 text-center">
                        {item.status === 'esperando' ? (
                          <span className="text-xs font-medium px-2 py-1 rounded bg-purple-100 text-purple-700">
                            Esperando Ingreso
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                            Ingresado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.status === 'ingresado' ? (
                          <button 
                            onClick={() => moveToRevision(item)}
                            className="text-xs bg-antko-primary text-white px-3 py-1.5 rounded hover:bg-antko-primary/90 transition-colors font-medium"
                          >
                            Cargar a Revisión
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {standbyItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No hay productos en Stand by.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
