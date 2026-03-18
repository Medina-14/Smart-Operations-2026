'use client';

import { useState } from 'react';
import { Truck, MapPin, CheckCircle, FileText, Search, ChevronDown, ChevronUp, Image as ImageIcon, Clock } from 'lucide-react';

export default function LogisticsDeliveredPage() {
  const [completedRoutes] = useState([
    {
      id: 'RT-1024',
      driver: 'Juan Pérez',
      vehicle: 'Furgón - AB-CD-12',
      date: '2023-10-27',
      closingTime: '15:30',
      status: 'completado',
      stops: [
        { 
          id: 's1', 
          client: 'Acme Corp', 
          address: '123 Industrial Blvd, Sector A', 
          nv: 'NV-4587', 
          guide: 'GD-1001',
          time: '09:15 AM',
          proofImage: 'https://picsum.photos/seed/proof1/400/300',
          items: [{ sku: 'SKU-A1', desc: 'Monitor 24"', qty: 2 }]
        },
        { 
          id: 's2', 
          client: 'Global Industries', 
          address: '456 Tech Park, Building 3', 
          nv: 'NV-4588', 
          guide: 'GD-1002',
          time: '11:45 AM',
          proofImage: 'https://picsum.photos/seed/proof2/400/300',
          items: [{ sku: 'SKU-B2', desc: 'Teclado Mecánico', qty: 5 }]
        },
      ]
    },
    {
      id: 'RT-1023',
      driver: 'Carlos Gómez',
      vehicle: 'Camión - EF-GH-34',
      date: '2023-10-26',
      closingTime: '14:15',
      status: 'completado',
      stops: [
        { 
          id: 's4', 
          client: 'BuildIt Inc', 
          address: '101 Construction Ave', 
          nv: 'NV-4580', 
          guide: 'GD-0998',
          time: '10:00 AM',
          proofImage: 'https://picsum.photos/seed/proof3/400/300',
          items: [{ sku: 'SKU-C3', desc: 'Silla Ergonómica', qty: 10 }]
        }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const filteredRoutes = completedRoutes.filter(route => 
    route.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.stops.some(stop => stop.nv.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleRoute = (id: string) => {
    setExpandedRouteId(expandedRouteId === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-antko-dark">Logística – Rutas Entregadas</h1>
        <p className="text-gray-500">Historial de rutas completadas y entregas confirmadas</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por ID de Ruta, Chofer o Número NV..." 
          className="flex-1 outline-none bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {filteredRoutes.map(route => (
          <div key={route.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className="bg-gray-50 p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleRoute(route.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-antko-dark flex items-center gap-2">
                    Ruta: {route.id}
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase tracking-wider">
                      Completada
                    </span>
                  </h2>
                  <div className="text-sm text-gray-500 flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {route.driver} ({route.vehicle})</span>
                    <span className="hidden sm:inline">|</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {route.date} - Cierre: {route.closingTime}</span>
                  </div>
                </div>
              </div>
              <button className="text-antko-secondary hover:text-antko-primary p-2">
                {expandedRouteId === route.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            {expandedRouteId === route.id && (
              <div className="p-6 bg-white">
                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider border-b pb-2">Detalle de Entregas ({route.stops.length})</h3>
                <div className="space-y-6">
                  {route.stops.map(stop => (
                    <div key={stop.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-antko-dark text-lg">{stop.client}</h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4 text-gray-400" /> {stop.address}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-2">
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {stop.nv}
                            </span>
                            <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {stop.guide}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Entregado: {stop.time}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Items List */}
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Productos Entregados</h5>
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase border-b">
                              <tr>
                                <th className="pb-2 font-medium">SKU</th>
                                <th className="pb-2 font-medium">Descripción</th>
                                <th className="pb-2 font-medium text-right">Cant.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {stop.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 font-mono text-gray-600">{item.sku}</td>
                                  <td className="py-2 text-gray-800">{item.desc}</td>
                                  <td className="py-2 text-right font-medium">{item.qty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Proof of Delivery */}
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" /> Prueba de Entrega (Guía Firmada)
                          </h5>
                          <div className="border rounded-lg overflow-hidden bg-gray-100 aspect-video relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={stop.proofImage} 
                              alt={`Guía firmada para ${stop.nv}`} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="bg-white text-antko-dark px-4 py-2 rounded-lg text-sm font-medium">
                                Ampliar Imagen
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {filteredRoutes.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
            No se encontraron rutas completadas que coincidan con su búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
