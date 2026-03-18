import { NVData } from '@/components/ui/nv-card';

export const mockNVs: NVData[] = [
  {
    id: '1',
    nv_number: 'NV-4587',
    client_name: 'Acme Corp',
    status: 'pendiente',
    items: [
      { id: 'i1', sku: 'SKU-1001', description: 'Industrial Widget A', requested_qty: 50, picked_qty: 0, packed_qty: 0, status: 'pendiente' },
      { id: 'i2', sku: 'SKU-1002', description: 'Steel Bolt 5mm', requested_qty: 200, picked_qty: 0, packed_qty: 0, status: 'pendiente' },
    ]
  },
  {
    id: '2',
    nv_number: 'NV-4588',
    client_name: 'Global Industries',
    status: 'picking',
    items: [
      { id: 'i3', sku: 'SKU-2001', description: 'Heavy Duty Gear', requested_qty: 10, picked_qty: 10, packed_qty: 0, status: 'pickeado' },
      { id: 'i4', sku: 'SKU-2002', description: 'Lubricant Oil 1L', requested_qty: 5, picked_qty: 2, packed_qty: 0, status: 'pendiente_compra' },
    ]
  },
  {
    id: '3',
    nv_number: 'NV-4589',
    client_name: 'Tech Solutions',
    status: 'packing',
    items: [
      { id: 'i5', sku: 'SKU-3001', description: 'Circuit Board X1', requested_qty: 100, picked_qty: 100, packed_qty: 50, status: 'empacado' },
    ]
  }
];
