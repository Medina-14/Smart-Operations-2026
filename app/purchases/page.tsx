'use client';

import { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle2, ShoppingCart, PackageCheck, ClipboardCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchPendingPurchases, fetchManagedOCs, createPurchaseOrder, updateOCStatus, processReceivedOC, PurchaseItemData, ManagedOCData } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

type TabType = 'pendientes' | 'gestionado' | 'validar';

export default function PurchasesPage() {
  const { profile } = useAuth();
  const isComercial = profile?.role === 'comercial';

  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pendingItems, setPendingItems] = useState<PurchaseItemData[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [managedOCs, setManagedOCs] = useState<ManagedOCData[]>([]);
  const [expandedOC, setExpandedOC] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pending, managed] = await Promise.all([
        fetchPendingPurchases(),
        fetchManagedOCs()
      ]);
      setPendingItems(pending);
      setManagedOCs(managed);
    } catch (err) {
      console.error('Error loading purchases data:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleUploadOC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedItemIds.length === 0) {
      setError('Debe seleccionar al menos un producto para asociar a la OC.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        try {
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              imageBase64: base64,
              promptType: 'ocr_purchase_order'
            })
          });
          
          const result = await response.json();
          
          if (result.error) {
            setError('Error al procesar la OC con IA: ' + result.error);
            setIsUploading(false);
            return;
          }

          const ocNumber = result.oc_number || `OC-${Math.floor(Math.random() * 10000)}`;
          const itemsToMove = pendingItems.filter(i => selectedItemIds.includes(i.id));
          
          const success = await createPurchaseOrder(ocNumber, itemsToMove);
          
          if (success) {
            setSuccess(`OC ${ocNumber} validada por IA y creada correctamente. Los productos han sido movidos a "Gestionado".`);
            setSelectedItemIds([]);
            await loadData();
            setActiveTab('gestionado');
          } else {
            setError('Error al crear la Orden de Compra en la base de datos.');
          }
        } catch (err) {
          console.error('AI Processing Error:', err);
          setError('Hubo un error al conectar con el servicio de IA.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File reading error:', err);
      setError('Error al leer el archivo.');
      setIsUploading(false);
    }
  };

  const simulatePackingReception = async (ocId: string, ocNumber: string) => {
    const success = await updateOCStatus(ocId, 'recepcionado');
    if (success) {
      setSuccess(`Recepción de ${ocNumber} validada por Supervisor Packing (Simulación).`);
      await loadData();
    } else {
      setError(`Error al actualizar el estado de la OC ${ocNumber}.`);
    }
  };

  const validateAndSendToPicking = async (ocId: string, ocNumber: string, items: PurchaseItemData[]) => {
    const success = await processReceivedOC(ocId, items);
    if (success) {
      setSuccess(`Recepción de ${ocNumber} validada. SKUs enviados al panel de Supervisor Picking.`);
      await loadData();
    } else {
      setError(`Error al procesar la OC ${ocNumber}.`);
    }
  };

  const gestionados = managedOCs.filter(oc => oc.status === 'gestionado');
  const recepcionados = managedOCs.filter(oc => oc.status === 'recepcionado');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel Compras</h1>
        <p className="text-gray-500">Gestionar solicitudes de compra, subir Órdenes de Compra (OC) y validar recepciones</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => { setActiveTab('pendientes'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'pendientes' ? 'bg-antko-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          1. Pendientes
        </button>
        <button
          onClick={() => { setActiveTab('gestionado'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'gestionado' ? 'bg-antko-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          2. Gestionado
          {gestionados.length > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{gestionados.length}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('validar'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'validar' ? 'bg-antko-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          3. Validar Recepción
          {recepcionados.length > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{recepcionados.length}</span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="text-green-800 font-medium">Éxito</h3>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
      <div className="mt-6">
        {activeTab === 'pendientes' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-antko-dark">Productos Pendientes de Compra</h2>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedItemIds.length > 0 && !isUploading && !isComercial
                  ? 'bg-antko-secondary text-white cursor-pointer hover:bg-antko-secondary/90' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Validando IA...' : 'Subir OC (PDF)'}</span>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleUploadOC} 
                  disabled={selectedItemIds.length === 0 || isUploading || isComercial} 
                />
              </label>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-antko-primary focus:ring-antko-primary"
                        checked={pendingItems.length > 0 && selectedItemIds.length === pendingItems.length}
                        disabled={isComercial}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIds(pendingItems.map(i => i.id));
                          } else {
                            setSelectedItemIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Número NV</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium text-center">Cant. Faltante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingItems.length > 0 ? (
                    pendingItems.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-antko-primary focus:ring-antko-primary"
                            checked={selectedItemIds.includes(item.id)}
                            disabled={isComercial}
                            onChange={() => toggleSelection(item.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{item.nv_number}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-center text-amber-600 font-medium">
                          {item.qty}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No hay productos pendientes de compra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'gestionado' && (
          <div className="space-y-4">
            {gestionados.length > 0 ? (
              gestionados.map(oc => (
                <div key={oc.ocNumber} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div 
                    className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedOC(expandedOC === oc.ocNumber ? null : oc.ocNumber)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedOC === oc.ocNumber ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-bold text-antko-dark">{oc.ocNumber}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2">
                        {oc.items.length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 italic">Esperando recepción en Packing...</span>
                      {!isComercial && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); simulatePackingReception(oc.id, oc.ocNumber); }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded transition-colors"
                        >
                          Simular Recepción
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {expandedOC === oc.ocNumber && (
                    <div className="p-4">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-2">NV</th>
                            <th className="px-4 py-2">SKU</th>
                            <th className="px-4 py-2">Descripción</th>
                            <th className="px-4 py-2 text-center">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {oc.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 font-medium">{item.nv_number}</td>
                              <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                              <td className="px-4 py-2">{item.description}</td>
                              <td className="px-4 py-2 text-center font-medium">{item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                No hay Órdenes de Compra en estado gestionado.
              </div>
            )}
          </div>
        )}

        {activeTab === 'validar' && (
          <div className="space-y-4">
            {recepcionados.length > 0 ? (
              recepcionados.map(oc => (
                <div key={oc.ocNumber} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-800">{oc.ocNumber}</span>
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-2">
                        Recepcionado en Packing
                      </span>
                    </div>
                    {!isComercial && (
                      <button 
                        onClick={() => validateAndSendToPicking(oc.id, oc.ocNumber, oc.items)}
                        className="bg-antko-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-antko-darker transition-colors"
                      >
                        Validar y Enviar a Supervisor Picking
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-2">NV</th>
                          <th className="px-4 py-2">SKU</th>
                          <th className="px-4 py-2">Descripción</th>
                          <th className="px-4 py-2 text-center">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {oc.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 font-medium">{item.nv_number}</td>
                            <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2 text-center font-medium">{item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                No hay recepciones pendientes de validación.
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
