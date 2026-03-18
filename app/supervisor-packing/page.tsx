'use client';

import { useState, useEffect } from 'react';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { PackageCheck, CheckCircle2, AlertTriangle, Truck, ChevronDown, ChevronRight, Box, Archive, Camera } from 'lucide-react';
import { fetchReceivingItems, confirmReceivingItem } from '@/lib/api';

export default function SupervisorPackingPage() {
  const [activeTab, setActiveTab] = useState<'receiving' | 'labels' | 'dispatch'>('receiving');
  const [scannedLabels, setScannedLabels] = useState<string[]>([]);
  const [dispatchValidated, setDispatchValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data for receiving
  const [receivingItems, setReceivingItems] = useState<any[]>([]);

  // Mock data for label validation
  const [expandedNv, setExpandedNv] = useState<string | null>(null);
  const [activeCameraNv, setActiveCameraNv] = useState<string | null>(null);
  const mockNvsForLabels = [
    { id: 'NV-4587', client: 'Acme Corp', packages: ['NV-4587-1', 'NV-4587-2'] },
    { id: 'NV-4588', client: 'Global Industries', packages: ['NV-4588-1'] }
  ];

  // Mock data for dispatch
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [activeCameraRoute, setActiveCameraRoute] = useState<string | null>(null);
  const mockRoutes = [
    { 
      id: 'RT-1024', 
      driver: 'Juan Pérez', 
      items: [
        { id: 'NV-4587', guide: 'GD-1001', packageCount: 2, type: 'NV' },
        { id: 'NV-4588', guide: 'GD-1002', packageCount: 1, type: 'NV' },
        { id: 'OC-9988', guide: 'N/A', packageCount: 3, type: 'OC' },
        { id: 'PH-4587-1234', guide: 'N/A', packageCount: 1, type: 'Bodega PH' }
      ] 
    }
  ];

  useEffect(() => {
    loadReceivingItems();
  }, []);

  const loadReceivingItems = async () => {
    setIsLoading(true);
    try {
      const items = await fetchReceivingItems();
      setReceivingItems(items);
    } catch (error) {
      console.error('Error loading receiving items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceivingChange = (id: string, value: number, max: number) => {
    const validValue = Math.min(Math.max(0, value), max);
    setReceivingItems(items => items.map(item => item.id === id ? { ...item, received: validValue } : item));
  };

  const handleConfirmItem = async (id: string, realId: string, type: string) => {
    const success = await confirmReceivingItem(type, realId);
    if (success) {
      setReceivingItems(items => items.filter(item => item.id !== id));
      if (type === 'OC') {
        alert('Recepción confirmada. La OC ha sido enviada al panel de Compras para su validación final.');
      } else {
        alert('Recepción confirmada. Se ha notificado al Supervisor de Picking (estado actualizado a "Ingresado" en Stand by).');
      }
    } else {
      alert('Error al confirmar la recepción.');
    }
  };

  const handleConfirmAll = async () => {
    if (receivingItems.length === 0) return;
    
    setIsLoading(true);
    let successCount = 0;
    
    for (const item of receivingItems) {
      const success = await confirmReceivingItem(item.type, item.realId);
      if (success) successCount++;
    }
    
    if (successCount > 0) {
      const hasOC = receivingItems.some(i => i.type === 'OC');
      const hasPH = receivingItems.some(i => i.type === 'Bodega PH');
      
      let msg = 'Recepciones procesadas exitosamente:\n\n';
      if (hasOC) msg += '📦 OC enviadas a panel de Compras para validación.\n';
      if (hasPH) msg += '📦 Productos de Bodega PH notificados a Supervisor de Picking (Stand by).';
      
      alert(msg);
      await loadReceivingItems();
    } else {
      alert('Error al procesar las recepciones.');
      setIsLoading(false);
    }
  };

  const handleScanLabel = async (data: string) => {
    if (!scannedLabels.includes(data)) {
      setScannedLabels(prev => [...prev, data]);
    }
    setActiveCameraNv(null); // Close camera after scan
  };

  const handleDispatchScan = (data: string) => {
    setTimeout(() => {
      setDispatchValidated(true);
      setActiveCameraRoute(null); // Close camera after scan
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Supervisor Packing</h1>
        <p className="text-gray-500">Gestionar recepción de materiales, validación de etiquetas y despacho final</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('receiving')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'receiving' ? 'bg-antko-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          1. Recepción de Materiales
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'labels' ? 'bg-antko-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          2. Validación Etiquetas
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'dispatch' ? 'bg-antko-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          3. Despacho Final
        </button>
      </div>

      <div className="mt-6">
        {isLoading && activeTab === 'receiving' ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
          </div>
        ) : activeTab === 'receiving' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-antko-dark mb-4 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-antko-primary" />
                Recepciones Pendientes (OC y Bodega PH)
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-2">Origen</th>
                        <th className="px-4 py-2">Ref</th>
                        <th className="px-4 py-2">SKU / Descripción</th>
                        <th className="px-4 py-2">Solicitado</th>
                        <th className="px-4 py-2">Recibido</th>
                        <th className="px-4 py-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivingItems.map(item => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${item.type === 'OC' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{item.ref}</td>
                          <td className="px-4 py-3">
                            <div className="font-mono">{item.sku}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{item.requested}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              value={item.received} 
                              onChange={(e) => handleReceivingChange(item.id, parseInt(e.target.value) || 0, item.requested)}
                              max={item.requested}
                              min={0}
                              className="w-20 border rounded px-2 py-1 outline-none focus:border-antko-primary" 
                            />
                            {item.received > item.requested && (
                              <span className="text-xs text-red-500 ml-2 block">Excede lo solicitado</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => handleConfirmItem(item.id, item.realId, item.type)}
                              className="text-antko-primary hover:underline font-medium"
                            >
                              Confirmar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={handleConfirmAll}
                      disabled={receivingItems.length === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        receivingItems.length > 0 
                          ? 'bg-antko-primary text-white hover:bg-antko-primary/90' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Procesar Recepciones
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-antko-dark mb-2">Notas de Venta (Bultos)</h3>
              {mockNvsForLabels.map(nv => (
                <div key={nv.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div 
                    className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedNv(expandedNv === nv.id ? null : nv.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedNv === nv.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-medium">{nv.id}</span>
                      <span className="text-sm text-gray-500">- {nv.client}</span>
                    </div>
                    <div className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {nv.packages.length} Bultos
                    </div>
                  </div>
                  {expandedNv === nv.id && (
                    <div className="p-4 border-t border-gray-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-gray-700">Líneas a revisar</h4>
                        <button 
                          onClick={() => setActiveCameraNv(activeCameraNv === nv.id ? null : nv.id)}
                          className="flex items-center gap-2 bg-antko-secondary text-white px-3 py-1.5 rounded-lg hover:bg-antko-secondary/90 transition-colors text-xs font-medium"
                        >
                          <Camera className="w-4 h-4" />
                          {activeCameraNv === nv.id ? 'Cerrar Cámara' : 'Escanear Bulto'}
                        </button>
                      </div>
                      
                      {activeCameraNv === nv.id && (
                        <div className="mb-4">
                          <CameraScanner onScan={handleScanLabel} title={`Escanear Etiqueta para ${nv.id}`} />
                        </div>
                      )}

                      <ul className="space-y-2">
                        {nv.packages.map(pkg => {
                          const isValidated = scannedLabels.includes(pkg);
                          return (
                            <li key={pkg} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                              <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-gray-400" />
                                <span className="font-mono text-sm">{pkg}</span>
                              </div>
                              {isValidated ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Validado
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
                                  Pendiente
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-antko-dark mb-4">Últimos Escaneos</h3>
                {scannedLabels.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No se han escaneado etiquetas aún.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {scannedLabels.slice(-5).reverse().map((label, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-mono font-medium">{label}</span>
                        <span className="ml-auto text-xs text-green-600 uppercase tracking-wider font-semibold">Válido</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-antko-dark mb-2">Rutas de Logística</h3>
              {mockRoutes.map(route => (
                <div key={route.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div 
                    className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setExpandedRoute(expandedRoute === route.id ? null : route.id);
                      if (expandedRoute !== route.id) {
                        const hasNV = route.items.some(item => item.type === 'NV');
                        setDispatchValidated(!hasNV);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {expandedRoute === route.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-bold text-antko-dark">{route.id}</span>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Truck className="w-4 h-4" /> {route.driver}
                    </div>
                  </div>
                  {expandedRoute === route.id && (
                    <div className="p-4 border-t border-gray-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-gray-700">Detalle de Ruta</h4>
                        {route.items.some(item => item.type === 'NV') ? (
                          <button 
                            onClick={() => setActiveCameraRoute(activeCameraRoute === route.id ? null : route.id)}
                            className="flex items-center gap-2 bg-antko-dark text-white px-3 py-1.5 rounded-lg hover:bg-antko-darker transition-colors text-xs font-medium"
                          >
                            <Camera className="w-4 h-4" />
                            {activeCameraRoute === route.id ? 'Cerrar Cámara' : 'Escanear Bultos'}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                            Validación No Requerida
                          </span>
                        )}
                      </div>

                      {activeCameraRoute === route.id && (
                        <div className="mb-4">
                          <CameraScanner onScan={handleDispatchScan} title={`Escanear Bultos para ${route.id}`} />
                        </div>
                      )}

                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                          <tr>
                            <th className="px-3 py-2">Ítem</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Guía Despacho</th>
                            <th className="px-3 py-2 text-center">Bultos</th>
                            <th className="px-3 py-2 text-center">Validación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {route.items.map(item => (
                            <tr key={item.id} className={item.type !== 'NV' ? 'bg-gray-50/50' : ''}>
                              <td className="px-3 py-2 font-medium">{item.id}</td>
                              <td className="px-3 py-2 text-gray-600">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.type === 'NV' ? 'bg-blue-100 text-blue-800' :
                                  item.type === 'OC' ? 'bg-purple-100 text-purple-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-600">{item.guide}</td>
                              <td className="px-3 py-2 text-center font-medium">{item.packageCount}</td>
                              <td className="px-3 py-2 text-center">
                                {item.type === 'NV' ? (
                                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Requerida</span>
                                ) : (
                                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">No Requerida</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-xs text-gray-500 italic mt-2">
                        * Nota: Solo se requiere evidencia fotográfica de bultos para Notas de Venta (NV) con Guía de Despacho. Retiros de OC y Bodega PH no requieren validación de bultos.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                <Truck className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-antko-dark mb-2">Validación Despacho Final</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Verifique que las etiquetas de los bultos coincidan con los documentos de ruta (solo para NV) antes de aprobar la carga en el camión.
                </p>
                
                {dispatchValidated ? (
                  <div className="bg-green-100 text-green-800 p-4 rounded-lg w-full">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <span className="font-bold text-lg">Carga Aprobada</span>
                    </div>
                    <p className="text-sm">Todos los bultos escaneados coinciden con la ruta seleccionada.</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-800 p-4 rounded-lg w-full border border-amber-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold">Validación Pendiente</span>
                    </div>
                    <p className="text-sm">Escanee los bultos para validar la carga de la ruta.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
