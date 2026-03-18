'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { fetchStandbyItems, updateStandbyItemStatus } from '@/lib/api';
import { Package, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function BodegaPHPage() {
  const { profile } = useAuth();
  const isViewOnly = profile?.role === 'admin';
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchStandbyItems();
      // Only show items that are waiting to be prepared or already prepared
      setItems(data.filter(item => item.status === 'esperando' || item.status === 'preparacion_lista'));
    } catch (err) {
      console.error('Error loading Bodega PH items:', err);
      setError('Error al cargar las solicitudes. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreparacionLista = async (id: string) => {
    setProcessingId(id);
    setError(null);
    setSuccess(null);
    
    try {
      const success = await updateStandbyItemStatus(id, 'preparacion_lista');
      if (success) {
        setSuccess('Item marcado como preparación lista. Ha sido enviado a Logística para su retiro.');
        await loadItems();
      } else {
        setError('Error al actualizar el estado del item.');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setProcessingId(null);
    }
  };

  if (profile?.role !== 'admin_general' && profile?.role !== 'admin' && profile?.role !== 'bodega_ph') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Se requiere rol de Bodega PH.</div>;
  }

  const esperando = items.filter(i => i.status === 'esperando');
  const preparados = items.filter(i => i.status === 'preparacion_lista');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Panel Bodega PH</h1>
        <p className="text-gray-500">Gestión de solicitudes de materiales y preparación para retiro logístico</p>
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-antko-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna: Solicitudes Pendientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-orange-50 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h2 className="font-semibold text-orange-800">Solicitudes Pendientes ({esperando.length})</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
              {esperando.length > 0 ? (
                <div className="space-y-4">
                  {esperando.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-bold text-antko-primary bg-antko-primary/10 px-2 py-1 rounded">
                            {item.nv_number}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                        </div>
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                          Esperando Preparación
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-mono text-xs text-gray-500">{item.sku}</p>
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-gray-600">Cantidad solicitada:</span>
                          <span className="font-bold text-lg text-antko-dark">{item.missing_qty}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePreparacionLista(item.id)}
                        disabled={processingId === item.id || isViewOnly}
                        className={`w-full font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          isViewOnly 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-antko-secondary hover:bg-antko-secondary/90 text-white'
                        }`}
                      >
                        {processingId === item.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                        <span>Preparación Lista</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna: Preparaciones Listas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-green-50 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-green-800">Listos para Retiro ({preparados.length})</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {preparados.length > 0 ? (
                <div className="space-y-4">
                  {preparados.map(item => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded">
                          {item.nv_number}
                        </span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          Esperando Logística
                        </span>
                      </div>
                      
                      <div>
                        <p className="font-mono text-xs text-gray-500">{item.sku}</p>
                        <p className="text-sm font-medium text-gray-700">{item.description}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Cantidad preparada: <span className="font-bold">{item.missing_qty}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                  <p>No hay preparaciones listas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
