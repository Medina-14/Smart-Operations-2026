'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Truck, Map, User, FileText, Camera, RefreshCw, CheckCircle2, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { fetchStandbyItems, updateStandbyItemStatus, fetchVehicles, VehicleData, fetchDrivers, DriverData, createRoute } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<'hall' | 'preliminary' | 'definitive'>('hall');
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const isViewOnly = profile?.role === 'admin';
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  
  // Hall Logístico State
  const [availableItems, setAvailableItems] = useState<any[]>([
    { id: 'NV-4587', type: 'NV', client: 'Acme Corp', packages: 2, suggestedRoute: 'Ruta Norte', selected: false },
    { id: 'NV-4588', type: 'NV', client: 'Global Industries', packages: 1, suggestedRoute: 'Ruta Centro', selected: false },
    { id: 'OC-9988', type: 'OC', client: 'Proveedor X', packages: 3, suggestedRoute: 'Retiro Proveedor', selected: false },
  ]);

  useEffect(() => {
    loadBodegaPHItems();
    loadVehicles();
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const data = await fetchDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const data = await fetchVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadBodegaPHItems = async () => {
    try {
      const standbyItems = await fetchStandbyItems();
      const preparados = standbyItems.filter(item => item.status === 'preparacion_lista');
      
      if (preparados.length > 0) {
        const newItems = preparados.map(item => ({
          id: `PH-${item.nv_number}-${item.id.substring(0, 4)}`,
          realId: item.id, // Store the real ID for later updates
          type: 'Bodega PH',
          client: `Retiro Bodega PH (NV: ${item.nv_number})`,
          packages: 1,
          suggestedRoute: 'Retiro Interno',
          selected: false,
          details: [{ sku: item.sku, desc: item.description, qty: item.missing_qty }]
        }));
        
        setAvailableItems(prev => {
          // Filter out existing PH items to avoid duplicates on reload
          const filtered = prev.filter(i => i.type !== 'Bodega PH');
          return [...filtered, ...newItems];
        });
      }
    } catch (error) {
      console.error('Error loading Bodega PH items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ruta Preliminar State
  const [preliminaryRoutes, setPreliminaryRoutes] = useState<any[]>([
    {
      id: 'temp-1',
      title: 'Ruta Santiago Norte',
      items: [
        { id: 'NV-4589', client: 'Tech Solutions', packages: 4, details: [{ sku: 'SKU-1001', desc: 'Laptop', qty: 2 }] }
      ]
    }
  ]);
  const [expandedPrelimNv, setExpandedPrelimNv] = useState<string | null>(null);

  // Ruta Definitiva State
  const [definitiveRoutes, setDefinitiveRoutes] = useState<any[]>([
    {
      id: 'RT-1024',
      status: 'validating', // validating, ready, sent
      driver: '',
      vehicle: '',
      items: [
        { id: 'NV-4587', guide: null, validated: false },
        { id: 'NV-4588', guide: null, validated: false }
      ]
    }
  ]);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const webcamRef = useRef<Webcam>(null);
  const [activeScanContext, setActiveScanContext] = useState<{routeId: string, itemId: string} | null>(null);

  // --- Hall Logístico Actions ---
  const toggleSelection = (id: string) => {
    setAvailableItems(items => items.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const addToPreliminary = () => {
    const selected = availableItems.filter(i => i.selected);
    if (selected.length === 0) return;

    const routeTitle = prompt('Ingrese nombre para la ruta preliminar (ej: Ruta Santiago Centro):');
    if (!routeTitle) return;

    const newItems = selected.map(s => ({
      id: s.id,
      realId: s.realId,
      client: s.client,
      packages: s.packages,
      details: s.details || [{ sku: 'SKU-MOCK', desc: 'Producto Mock', qty: 1 }] // Use real details if available
    }));

    setPreliminaryRoutes([...preliminaryRoutes, { id: `temp-${Date.now()}`, title: routeTitle, items: newItems }]);
    setAvailableItems(items => items.filter(i => !i.selected));
    setActiveTab('preliminary');
  };

  // --- Ruta Preliminar Actions ---
  const removeFromPreliminary = (routeId: string, itemId: string) => {
    setPreliminaryRoutes(routes => routes.map(r => {
      if (r.id === routeId) {
        return { ...r, items: r.items.filter((i: any) => i.id !== itemId) };
      }
      return r;
    }).filter(r => r.items.length > 0));
    
    // In a real app, we'd add it back to availableItems
  };

  const createDefinitiveRoute = async (routeId: string) => {
    const route = preliminaryRoutes.find(r => r.id === routeId);
    if (!route) return;

    // Update Bodega PH items to remove them from the Bodega PH panel
    for (const item of route.items as any[]) {
      if (item.id.startsWith('PH-') && item.realId) {
        console.log('Updating Bodega PH item status to procesado for:', item.realId);
        await updateStandbyItemStatus(item.realId, 'procesado');
      }
    }

    const newDefinitive = {
      id: `RT-${Math.floor(Math.random() * 10000)}`,
      status: 'validating',
      driver: '',
      vehicle: '',
      items: route.items.map((i: any) => ({ id: i.id, realId: i.realId, guide: null, validated: false }))
    };

    setDefinitiveRoutes([...definitiveRoutes, newDefinitive]);
    setPreliminaryRoutes(routes => routes.filter(r => r.id !== routeId));
    setActiveTab('definitive');
    alert('Ruta definitiva creada. Los ítems de Bodega PH han sido retirados del panel de Bodega PH.');
  };

  // --- Ruta Definitiva Actions ---
  const captureAndAnalyze = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && activeScanContext) {
      setIsScanning(true);
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imageSrc,
            promptType: 'ocr_delivery_guide'
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setScanResult(data);
          
          // Update the specific item in the route
          setDefinitiveRoutes(routes => routes.map(r => {
            if (r.id === activeScanContext.routeId) {
              return {
                ...r,
                items: r.items.map((i: any) => 
                  i.id === activeScanContext.itemId ? { ...i, guide: data.guide_number || 'GD-1001', validated: true } : i
                )
              };
            }
            return r;
          }));
        } else {
          alert('Error analizando imagen: ' + data.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Fallo al analizar la imagen');
      } finally {
        setIsScanning(false);
        setActiveScanContext(null);
      }
    }
  }, [webcamRef, activeScanContext]);

  const updateRouteDetails = (routeId: string, field: 'driver' | 'vehicle', value: string) => {
    setDefinitiveRoutes(routes => routes.map(r => r.id === routeId ? { ...r, [field]: value } : r));
  };

  const sendToSupervisor = async (routeId: string) => {
    const route = definitiveRoutes.find(r => r.id === routeId);
    if (!route || !route.driver || !route.vehicle) {
      alert('Por favor, asigne un chofer y un vehículo antes de enviar.');
      return;
    }

    // Extract NV IDs (realId) from the route items. 
    // Note: Bodega PH items might not have an NV ID directly, or they might.
    // For now, we'll just pass the ones that look like UUIDs (from NVs).
    const nvIds = route.items
      .filter((i: any) => i.type === 'NV' && i.realId && i.realId.length > 10)
      .map((i: any) => i.realId);

    const dbRouteId = await createRoute(route.driver, route.vehicle, nvIds);
    
    if (dbRouteId) {
      setDefinitiveRoutes(routes => routes.map(r => r.id === routeId ? { ...r, status: 'sent', dbId: dbRouteId } : r));
      alert('Ruta enviada a Supervisor Packing para validación final.');
    } else {
      alert('Error al crear la ruta en la base de datos.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel Logística</h1>
        <p className="text-gray-500">Gestionar hall logístico, rutas preliminares y validación de rutas definitivas</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('hall')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'hall' ? 'bg-antko-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          1. Hall Logístico
        </button>
        <button
          onClick={() => setActiveTab('preliminary')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'preliminary' ? 'bg-antko-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          2. Ruta Preliminar
        </button>
        <button
          onClick={() => setActiveTab('definitive')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'definitive' ? 'bg-antko-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          3. Ruta Definitiva
        </button>
      </div>

      <div className="mt-6">
        {/* HALL LOGÍSTICO */}
        {activeTab === 'hall' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-antko-dark">Disponibles para Despacho</h3>
              <div className="flex gap-2">
                <button 
                  onClick={loadBodegaPHItems}
                  disabled={isLoading}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button 
                  onClick={addToPreliminary}
                  disabled={!availableItems.some(i => i.selected) || isViewOnly}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    availableItems.some(i => i.selected) && !isViewOnly
                      ? 'bg-antko-primary text-white hover:bg-antko-primary/90' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Agregar a Ruta Preliminar
                </button>
              </div>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cliente / Proveedor</th>
                  <th className="px-4 py-3">Bultos</th>
                  <th className="px-4 py-3">Ruta Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {availableItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={item.selected} 
                        onChange={() => toggleSelection(item.id)}
                        className="w-4 h-4 text-antko-primary rounded border-gray-300 focus:ring-antko-primary"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.type === 'NV' ? 'bg-blue-100 text-blue-800' : 
                        item.type === 'OC' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.client}</td>
                    <td className="px-4 py-3">{item.packages}</td>
                    <td className="px-4 py-3 text-gray-600">{item.suggestedRoute}</td>
                  </tr>
                ))}
                {availableItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay elementos disponibles en el hall.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* RUTA PRELIMINAR */}
        {activeTab === 'preliminary' && (
          <div className="space-y-6">
            {preliminaryRoutes.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                No hay rutas preliminares. Seleccione elementos en el Hall Logístico para crear una.
              </div>
            ) : (
              preliminaryRoutes.map(route => (
                <div key={route.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-antko-dark">{route.title}</h3>
                    <button 
                      onClick={() => createDefinitiveRoute(route.id)}
                      disabled={isViewOnly}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isViewOnly 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-antko-secondary text-white hover:bg-antko-secondary/90'
                      }`}
                    >
                      Crear Ruta Definitiva
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    {route.items.map((item: any) => (
                      <div key={item.id} className="border rounded-lg overflow-hidden">
                        <div 
                          className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                          onClick={() => setExpandedPrelimNv(expandedPrelimNv === item.id ? null : item.id)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedPrelimNv === item.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-medium">{item.id}</span>
                            <span className="text-sm text-gray-500">- {item.client}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {item.packages} Bultos
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFromPreliminary(route.id, item.id); }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {expandedPrelimNv === item.id && (
                          <div className="p-3 border-t border-gray-100 bg-white">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-500 uppercase">
                                <tr>
                                  <th className="pb-2">SKU</th>
                                  <th className="pb-2">Descripción</th>
                                  <th className="pb-2 text-right">Cantidad</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.details.map((detail: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="py-1 font-mono">{detail.sku}</td>
                                    <td className="py-1">{detail.desc}</td>
                                    <td className="py-1 text-right">{detail.qty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RUTA DEFINITIVA */}
        {activeTab === 'definitive' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {definitiveRoutes.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                  No hay rutas definitivas. Cree una desde la pestaña Ruta Preliminar.
                </div>
              ) : (
                definitiveRoutes.map(route => {
                  const allValidated = route.items.every((i: any) => i.validated);
                  
                  return (
                    <div key={route.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-antko-dark text-white p-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Map className="w-5 h-5" /> {route.id}
                        </h3>
                        <span className="text-xs font-medium uppercase tracking-wider bg-white/20 px-2 py-1 rounded">
                          {route.status === 'sent' ? 'Enviado a Supervisor' : 'Validación Documental'}
                        </span>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                              <tr>
                                <th className="px-4 py-3">Documento / NV</th>
                                <th className="px-4 py-3">Guía de Despacho</th>
                                <th className="px-4 py-3 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {route.items.map((item: any) => (
                                <tr key={item.id} className="bg-white">
                                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    {item.id}
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.validated ? (
                                      <span className="flex items-center gap-1 text-green-600 font-medium">
                                        <CheckCircle2 className="w-4 h-4" /> {item.guide} (Validado)
                                      </span>
                                    ) : (
                                      <span className="text-amber-500 text-xs font-medium bg-amber-50 px-2 py-1 rounded">Pendiente</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {!item.validated && route.status !== 'sent' && (
                                      <button 
                                        onClick={() => setActiveScanContext({ routeId: route.id, itemId: item.id })}
                                        className="text-antko-secondary hover:underline text-xs font-medium"
                                      >
                                        Escanear GD
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {allValidated && route.status !== 'sent' && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <h4 className="font-semibold text-gray-800">Asignación de Transporte</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chofer</label>
                                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <select 
                                    className="bg-transparent w-full outline-none text-sm"
                                    value={route.driver}
                                    onChange={(e) => updateRouteDetails(route.id, 'driver', e.target.value)}
                                  >
                                    <option value="">Seleccionar Chofer...</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
                                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                  <Truck className="w-4 h-4 text-gray-400 mr-2" />
                                  <select 
                                    className="bg-transparent w-full outline-none text-sm"
                                    value={route.vehicle}
                                    onChange={(e) => updateRouteDetails(route.id, 'vehicle', e.target.value)}
                                  >
                                    <option value="">Seleccionar Vehículo...</option>
                                    {vehicles.map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.brand || 'Vehículo'} {v.model || ''} - {v.plate}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                              <button 
                                disabled={!route.driver || !route.vehicle}
                                onClick={() => sendToSupervisor(route.id)}
                                className="bg-antko-dark text-white px-6 py-2 rounded-lg font-medium hover:bg-antko-darker disabled:opacity-50 transition-colors"
                              >
                                Enviar a Supervisor Packing
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-1">
              {activeScanContext !== null ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center sticky top-6">
                  <h3 className="text-lg font-semibold text-antko-dark mb-4 text-center">
                    Escanear Guía de Despacho<br/>
                    <span className="text-sm font-normal text-gray-500">para {activeScanContext.itemId}</span>
                  </h3>
                  
                  <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'environment' }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-antko-secondary/50 m-8 rounded pointer-events-none"></div>
                    
                    <button
                      onClick={captureAndAnalyze}
                      disabled={isScanning}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-antko-secondary text-white p-4 rounded-full shadow-lg hover:bg-antko-secondary/90 transition-colors disabled:opacity-50"
                    >
                      {isScanning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Alinee la Guía de Despacho (GD) dentro del marco y capture para extraer datos usando IA.
                  </p>
                </div>
              ) : scanResult ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-6">
                  <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Validación IA Exitosa
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs uppercase">Número de Guía</span>
                      <span className="font-mono font-medium text-lg">{scanResult.guide_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase">Número NV</span>
                      <span className="font-mono font-medium">{scanResult.nv_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center h-64 sticky top-6">
                  <Camera className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">
                    Seleccione &quot;Escanear GD&quot; en una NV para activar el escáner de cámara con IA.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
