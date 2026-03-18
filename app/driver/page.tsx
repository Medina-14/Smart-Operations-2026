'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, Clock, Truck, Camera, X, Upload } from 'lucide-react';
import Webcam from 'react-webcam';
import { closeRouteAndUpdateMileage, fetchDriverRoute } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

export default function DriverPage() {
  const { profile } = useAuth();
  const [route, setRoute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadRoute();
    }
  }, [profile]);

  const loadRoute = async () => {
    setIsLoading(true);
    try {
      if (!profile) return;
      const data = await fetchDriverRoute(profile.id);
      if (data) {
        setRoute({ ...data, driver: profile.full_name });
      } else {
        setRoute(null);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && activeStopId) {
      setRoute((prev: any) => ({
        ...prev,
        stops: prev.stops.map((stop: any) => 
          stop.id === activeStopId 
            ? { ...stop, status: 'completado', proofImage: imageSrc, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } 
            : stop
        )
      }));
      setActiveStopId(null);
    }
  }, [webcamRef, activeStopId]);

  const [isClosingRoute, setIsClosingRoute] = useState(false);
  const [endMileage, setEndMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allCompleted = route?.stops?.every((s: any) => s.status === 'completado') || false;

  if (isLoading) {
    return <div className="p-8 text-center">Cargando ruta asignada...</div>;
  }

  if (!route) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sin Ruta Asignada</h2>
        <p className="text-gray-500">No tienes ninguna ruta activa en este momento. Espera a que Logística te asigne una nueva ruta.</p>
      </div>
    );
  }

  const finalizeDeliveries = () => {
    setRoute((prev: any) => ({ ...prev, status: 'entregas_finalizadas' }));
    alert('Entregas finalizadas. Por favor, regrese a bodega para cerrar la ruta.');
  };

  const handleCloseRoute = async () => {
    if (!endMileage || isNaN(Number(endMileage))) {
      alert('Por favor ingrese un kilometraje válido.');
      return;
    }
    
    setIsSubmitting(true);
    const success = await closeRouteAndUpdateMileage(route.id, route.vehicleId, Number(endMileage));
    
    if (success) {
      setRoute((prev: any) => ({ ...prev, status: 'finalizada' }));
      setIsClosingRoute(false);
    } else {
      alert('Error al cerrar la ruta. Por favor, intente nuevamente.');
    }
    setIsSubmitting(false);
  };

  if (route.status === 'finalizada') {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-antko-dark mb-2">Ruta Cerrada en Bodega</h1>
        <p className="text-gray-500 mb-8">El kilometraje ha sido registrado y la ruta ha finalizado exitosamente.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-antko-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-antko-primary/90 transition-colors"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (route.status === 'entregas_finalizadas') {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="bg-blue-100 text-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-antko-dark mb-2">Entregas Finalizadas</h1>
        <p className="text-gray-500 mb-8">Diríjase a bodega para realizar el cierre de la ruta.</p>
        <button 
          onClick={() => setIsClosingRoute(true)}
          className="bg-antko-dark text-white px-8 py-4 rounded-xl font-bold hover:bg-antko-darker transition-colors shadow-lg text-lg"
        >
          Cerrar Ruta en Bodega
        </button>

        {isClosingRoute && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-left">
              <h2 className="text-xl font-bold text-antko-dark mb-4">Cierre de Ruta en Bodega</h2>
              <p className="text-gray-600 mb-4">Ingrese el kilometraje actual del vehículo ({route.vehicle}) para finalizar.</p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje Final (km)</label>
                <input 
                  type="number" 
                  value={endMileage}
                  onChange={(e) => setEndMileage(e.target.value)}
                  placeholder="Ej: 145000"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-antko-primary bg-white text-lg"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setIsClosingRoute(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCloseRoute}
                  disabled={isSubmitting || !endMileage}
                  className="bg-antko-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-antko-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative pb-24">
      <div className="bg-antko-dark text-white p-6 rounded-xl shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Ruta Activa: {route.id}</h1>
          <p className="text-gray-300 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Vehículo: {route.vehicle}
          </p>
        </div>
        <div className="bg-antko-primary/20 text-antko-primary px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-sm border border-antko-primary/30">
          En Tránsito
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-antko-dark flex items-center gap-2">
          <Navigation className="w-5 h-5 text-antko-secondary" />
          Lista de Entregas
        </h2>
        
        <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
          {route.stops?.map((stop: any, index: number) => (
            <div key={stop.id} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                stop.status === 'completado' ? 'border-green-500' : 
                index === 1 ? 'border-antko-secondary' : 'border-gray-300'
              }`}></div>
              
              <div className={`bg-white p-4 rounded-xl shadow-sm border ${
                stop.status === 'completado' ? 'border-green-100' : 
                activeStopId === stop.id ? 'border-antko-secondary ring-2 ring-antko-secondary/20' : 'border-gray-100'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`font-bold ${stop.status === 'completado' ? 'text-gray-500 line-through' : 'text-antko-dark'}`}>
                      {stop.client}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {stop.address}
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {stop.nv}
                  </span>
                </div>
                
                {activeStopId === stop.id ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-antko-dark">Capturar Guía Firmada</h4>
                        <button onClick={() => setActiveStopId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden mb-4">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{ facingMode: 'environment' }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 rounded pointer-events-none"></div>
                      </div>
                      <button 
                        onClick={handleCapture}
                        className="w-full bg-antko-secondary text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-antko-secondary/90 transition-colors"
                      >
                        <Camera className="w-5 h-5" /> Tomar Foto y Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" /> {stop.time}
                    </div>
                    
                    {stop.status === 'completado' ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium text-sm">
                        <CheckCircle className="w-4 h-4" /> Entregado
                      </span>
                    ) : (
                      <button 
                        onClick={() => setActiveStopId(stop.id)}
                        className="bg-antko-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-antko-secondary/90 transition-colors"
                      >
                        Confirmar Entrega
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom bar for Finalizar Entregas */}
      {allCompleted && route.status === 'en_transito' && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-bold text-green-600">¡Todas las entregas completadas!</span><br/>
              Puede reportar el fin de las entregas.
            </div>
            <button 
              onClick={finalizeDeliveries}
              className="bg-antko-dark text-white px-8 py-3 rounded-lg font-bold hover:bg-antko-darker transition-colors shadow-lg flex items-center gap-2"
            >
              <Upload className="w-5 h-5" /> Finalizar Entregas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
