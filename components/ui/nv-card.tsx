'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NVItem {
  id: string;
  sku: string;
  description: string;
  requested_qty: number;
  picked_qty: number;
  packed_qty: number;
  status: string;
}

export interface NVData {
  id: string;
  nv_number: string;
  client_name: string;
  status: string;
  picker_id?: string;
  items: NVItem[];
  dispatch_address?: string;
  contact_name?: string;
  contact_phone?: string;
  observations?: string;
  suggested_route?: string;
}

interface NVCardProps {
  nv: NVData;
  children?: React.ReactNode; // For role-specific actions
}

export function NVCard({ nv, children }: NVCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-antko-primary/10 flex items-center justify-center text-antko-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-antko-dark">NV: {nv.nv_number}</h3>
            <p className="text-sm text-gray-500">{nv.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider">
            {nv.status}
          </span>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50/50">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-100/50 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium text-center">Solicitado</th>
                      <th className="px-4 py-3 font-medium text-center">Pickeado</th>
                      <th className="px-4 py-3 font-medium text-center">Empacado</th>
                      <th className="px-4 py-3 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {nv.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-center font-medium">{item.requested_qty}</td>
                        <td className="px-4 py-3 text-center text-antko-secondary">{item.picked_qty}</td>
                        <td className="px-4 py-3 text-center text-antko-primary">{item.packed_qty}</td>
                        <td className="px-4 py-3 text-right">
                           <span className="px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {children && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                  {children}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
