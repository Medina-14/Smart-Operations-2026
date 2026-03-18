'use client';

import { useState } from 'react';
import { FileBarChart, RefreshCw, Download, Bot } from 'lucide-react';

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // In a real app, we would fetch data from Supabase and send it to Gemini for analysis.
      // Here we simulate the data gathering and AI analysis.
      const mockData = {
        packages_shipped: 145,
        pending_nvs: 23,
        purchase_delays: 5,
        date: new Date().toISOString().split('T')[0]
      };

      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: mockData })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setReport(data);
      } else {
        alert('Error generando reporte: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Fallo al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/export?table=nvs');
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_operaciones_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error al descargar el reporte.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-antko-dark">Reporte de Operaciones IA</h1>
          <p className="text-gray-500">Generar insights diarios sobre el rendimiento del almacén</p>
        </div>
        <button 
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-antko-primary text-white px-6 py-3 rounded-xl shadow-md hover:bg-antko-primary/90 transition-colors font-medium disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
          Generar Reporte Diario
        </button>
      </div>

      {report ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-antko-dark text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Resumen Diario de Operaciones</h2>
              <p className="text-gray-400 text-sm mt-1">{report.date}</p>
            </div>
            <button 
              onClick={handleDownload}
              className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              title="Descargar datos en CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Paquetes Enviados</p>
                <p className="text-4xl font-bold text-antko-primary">{report.metrics.packages_shipped}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">NVs Pendientes</p>
                <p className="text-4xl font-bold text-amber-500">{report.metrics.pending_nvs}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Retrasos en Compras</p>
                <p className="text-4xl font-bold text-red-500">{report.metrics.purchase_delays}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-antko-dark mb-3 border-b pb-2">Análisis IA</h3>
              <div className="prose prose-sm max-w-none text-gray-700">
                <p>{report.analysis}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-antko-dark mb-3 border-b pb-2">Recomendaciones</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {report.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center text-gray-500">
          <FileBarChart className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Ningún Reporte Generado</h3>
          <p className="max-w-md">
            Haga clic en el botón &quot;Generar Reporte Diario&quot; para analizar los datos de operaciones de hoy usando Gemini IA.
          </p>
        </div>
      )}
    </div>
  );
}
