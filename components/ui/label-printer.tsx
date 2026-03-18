'use client';

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

export interface LabelData {
  nv_id?: string;
  item_id?: string;
  nv_number: string;
  sku: string;
  description: string;
  quantity: number;
  package_number: number;
  total_packages: number;
}

interface LabelPrinterProps {
  labelData: LabelData | null;
  onPrintComplete?: () => void;
}

export function LabelPrinter({ labelData, onPrintComplete }: LabelPrinterProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Etiqueta-${labelData?.nv_number}-${labelData?.package_number}`,
    onAfterPrint: onPrintComplete,
  });

  if (!labelData) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden printable area */}
      <div className="hidden">
        <div 
          ref={componentRef} 
          className="w-[4in] h-[6in] p-8 bg-white text-black flex flex-col justify-between border-2 border-black"
          style={{ margin: 0, padding: '20px', boxSizing: 'border-box' }}
        >
          <div className="text-center border-b-4 border-black pb-4 mb-4">
            <h1 className="text-4xl font-bold uppercase tracking-widest">ANTKO Group</h1>
            <p className="text-xl font-semibold mt-2">Smart Operations</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm uppercase font-bold tracking-widest">Número NV</p>
              <p className="text-5xl font-black font-mono mt-1">{labelData.nv_number}</p>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-black">
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">SKU</p>
              <p className="text-2xl font-mono font-bold">{labelData.sku}</p>
              <p className="text-gray-500 text-xs uppercase font-bold mt-3 mb-1">Descripción</p>
              <p className="text-lg font-semibold leading-tight">{labelData.description}</p>
            </div>
            
            <div className="flex justify-between items-end border-t-2 border-black pt-4">
              <div>
                <p className="text-gray-500 text-xs uppercase font-bold">Cantidad</p>
                <p className="text-4xl font-black">{labelData.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs uppercase font-bold">Paquete</p>
                <p className="text-3xl font-black">{labelData.package_number} <span className="text-xl text-gray-500">de</span> {labelData.total_packages}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t-2 border-black text-center">
            {/* Mock Barcode */}
            <div className="h-16 w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px)] opacity-80 mb-2"></div>
            <p className="font-mono text-sm tracking-widest">{labelData.nv_number}-{labelData.package_number}</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => handlePrint()}
        className="flex items-center gap-2 bg-antko-dark text-white px-6 py-3 rounded-xl shadow-md hover:bg-antko-darker transition-colors font-medium text-lg"
      >
        <Printer className="w-5 h-5" />
        Imprimir Etiqueta de Paquete
      </button>
    </div>
  );
}
