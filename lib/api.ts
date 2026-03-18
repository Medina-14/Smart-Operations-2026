import { supabase } from './supabase';
import { NVData, NVItem } from '@/components/ui/nv-card';

// --- SUPABASE DATABASE INTEGRATION ---

export async function fetchNVs(): Promise<NVData[]> {
  const { data, error } = await supabase
    .from('nvs')
    .select(`
      id,
      nv_number,
      client_name,
      status,
      dispatch_address,
      contact_name,
      contact_phone,
      observations,
      route,
      nv_items (
        id,
        sku,
        description,
        requested_qty,
        picked_qty,
        packed_qty,
        status,
        proof_image_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching NVs:', error);
    return [];
  }

  return data.map((nv: any) => ({
    id: nv.id,
    nv_number: nv.nv_number,
    client_name: nv.client_name,
    status: nv.status,
    dispatch_address: nv.dispatch_address,
    contact_name: nv.contact_name,
    contact_phone: nv.contact_phone,
    observations: nv.observations,
    route: nv.route,
    items: nv.nv_items || []
  }));
}

export async function createNV(nvData: Omit<NVData, 'id' | 'items'> & { dispatch_address?: string; contact_name?: string; contact_phone?: string; observations?: string }, items: Omit<NVItem, 'id'>[]): Promise<NVData | null> {
  const { data: newNV, error: nvError } = await supabase
    .from('nvs')
    .insert([{
      nv_number: nvData.nv_number,
      client_name: nvData.client_name,
      status: nvData.status || 'pendiente',
      dispatch_address: nvData.dispatch_address,
      contact_name: nvData.contact_name,
      contact_phone: nvData.contact_phone,
      observations: nvData.observations
    }])
    .select()
    .single();

  if (nvError || !newNV) {
    console.error('Error creating NV:', nvError);
    return null;
  }

  const itemsToInsert = items.map(item => ({
    nv_id: newNV.id,
    sku: item.sku,
    description: item.description,
    requested_qty: item.requested_qty,
    picked_qty: item.picked_qty || 0,
    packed_qty: item.packed_qty || 0,
    status: item.status || 'pendiente'
  }));

  const { data: newItems, error: itemsError } = await supabase
    .from('nv_items')
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    console.error('Error creating NV items:', itemsError);
    return null;
  }

  return {
    id: newNV.id,
    nv_number: newNV.nv_number,
    client_name: newNV.client_name,
    status: newNV.status,
    dispatch_address: newNV.dispatch_address,
    contact_name: newNV.contact_name,
    contact_phone: newNV.contact_phone,
    observations: newNV.observations,
    items: newItems.map(item => ({
      id: item.id,
      sku: item.sku,
      description: item.description,
      requested_qty: item.requested_qty,
      picked_qty: item.picked_qty,
      packed_qty: item.packed_qty,
      status: item.status,
      proof_image_url: item.proof_image_url
    }))
  };
}

export async function updateNVStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('nvs')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating NV status:', error);
    return false;
  }
  return true;
}

export async function updateNVItem(id: string, updates: Partial<NVItem> & { proof_image_url?: string }): Promise<boolean> {
  const { error } = await supabase
    .from('nv_items')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating NV item:', error);
    return false;
  }
  return true;
}

export interface StandbyItemData {
  id: string;
  nv_item_id: string;
  nv_number: string;
  sku: string;
  description: string;
  missing_qty: number;
  requested_qty: number;
  date: string;
  status: string;
}

export async function fetchStandbyItems(): Promise<StandbyItemData[]> {
  const { data, error } = await supabase
    .from('standby_items')
    .select(`
      id,
      nv_item_id,
      missing_qty,
      status,
      created_at,
      nv_items (
        sku,
        description,
        requested_qty,
        nvs (
          nv_number
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching standby items:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    nv_item_id: item.nv_item_id,
    nv_number: item.nv_items?.nvs?.nv_number || 'N/A',
    sku: item.nv_items?.sku || 'N/A',
    description: item.nv_items?.description || 'N/A',
    missing_qty: item.missing_qty,
    requested_qty: item.nv_items?.requested_qty || 0,
    date: new Date(item.created_at).toLocaleString('es-CL'),
    status: item.status
  }));
}

export async function createStandbyItem(nvItemId: string, missingQty: number): Promise<boolean> {
  const { error } = await supabase
    .from('standby_items')
    .insert([{
      nv_item_id: nvItemId,
      missing_qty: missingQty,
      status: 'esperando'
    }]);

  if (error) {
    console.error('Error creating standby item:', error);
    return false;
  }
  return true;
}

export async function updateStandbyItemStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('standby_items')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating standby item status:', error);
    return false;
  }
  return true;
}

export interface PurchaseItemData {
  id: string; // nv_item_id
  nv_number: string;
  sku: string;
  description: string;
  qty: number; // requested_qty - picked_qty
}

export async function fetchPendingPurchases(): Promise<PurchaseItemData[]> {
  // Get items with status 'pendiente_compra'
  const { data: items, error } = await supabase
    .from('nv_items')
    .select(`
      id,
      sku,
      description,
      requested_qty,
      picked_qty,
      nvs (
        nv_number
      )
    `)
    .eq('status', 'pendiente_compra');

  if (error) {
    console.error('Error fetching pending purchases:', error);
    return [];
  }

  // Get items already in purchase orders to filter them out
  const { data: ocItems, error: ocError } = await supabase
    .from('purchase_order_items')
    .select('nv_item_id');

  if (ocError) {
    console.error('Error fetching OC items:', ocError);
    return [];
  }

  const ocItemIds = new Set(ocItems.map((i: any) => i.nv_item_id));

  return items
    .filter((item: any) => !ocItemIds.has(item.id))
    .map((item: any) => ({
      id: item.id,
      nv_number: item.nvs?.nv_number || 'N/A',
      sku: item.sku,
      description: item.description,
      qty: item.requested_qty - (item.picked_qty || 0)
    }));
}

export interface ManagedOCData {
  id: string;
  ocNumber: string;
  status: 'gestionado' | 'recepcionado';
  items: PurchaseItemData[];
}

export async function fetchManagedOCs(): Promise<ManagedOCData[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      oc_number,
      status,
      purchase_order_items (
        nv_item_id,
        qty,
        nv_items (
          sku,
          description,
          nvs (
            nv_number
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching managed OCs:', error);
    return [];
  }

  return data.map((oc: any) => ({
    id: oc.id,
    ocNumber: oc.oc_number,
    status: oc.status as 'gestionado' | 'recepcionado',
    items: oc.purchase_order_items.map((item: any) => ({
      id: item.nv_item_id,
      nv_number: item.nv_items?.nvs?.nv_number || 'N/A',
      sku: item.nv_items?.sku || 'N/A',
      description: item.nv_items?.description || 'N/A',
      qty: item.qty
    }))
  }));
}

export async function createPurchaseOrder(ocNumber: string, items: PurchaseItemData[]): Promise<boolean> {
  const { data: newOC, error: ocError } = await supabase
    .from('purchase_orders')
    .insert([{
      oc_number: ocNumber,
      status: 'gestionado'
    }])
    .select()
    .single();

  if (ocError || !newOC) {
    console.error('Error creating OC:', ocError);
    return false;
  }

  const itemsToInsert = items.map(item => ({
    oc_id: newOC.id,
    nv_item_id: item.id,
    qty: item.qty
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating OC items:', itemsError);
    return false;
  }

  return true;
}

export async function updateOCStatus(ocId: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', ocId);

  if (error) {
    console.error('Error updating OC status:', error);
    return false;
  }
  return true;
}

export async function fetchPackingNVs(): Promise<NVData[]> {
  const { data, error } = await supabase
    .from('nvs')
    .select(`
      id,
      nv_number,
      client_name,
      status,
      dispatch_address,
      contact_name,
      contact_phone,
      observations,
      route,
      nv_items (
        id,
        sku,
        description,
        requested_qty,
        picked_qty,
        packed_qty,
        status,
        proof_image_url
      )
    `)
    .eq('status', 'packing')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching packing NVs:', error);
    return [];
  }

  return data.map((nv: any) => ({
    id: nv.id,
    nv_number: nv.nv_number,
    client_name: nv.client_name,
    status: nv.status,
    dispatch_address: nv.dispatch_address,
    contact_name: nv.contact_name,
    contact_phone: nv.contact_phone,
    observations: nv.observations,
    route: nv.route,
    items: nv.nv_items || []
  }));
}

export async function createPackageRecord(nvId: string, packageNumber: number, items: { nv_item_id: string; sku: string; description: string; qty: number }[]): Promise<boolean> {
  // 1. Create Package
  const { data: newPackage, error: pkgError } = await supabase
    .from('packages')
    .insert([{
      nv_id: nvId,
      package_number: packageNumber,
      status: 'created'
      // created_by would be added here if we had auth context
    }])
    .select()
    .single();

  if (pkgError || !newPackage) {
    console.error('Error creating package:', pkgError);
    return false;
  }

  // 2. Create Package Items
  const itemsToInsert = items.map(item => ({
    package_id: newPackage.id,
    nv_item_id: item.nv_item_id,
    sku: item.sku,
    description: item.description,
    quantity: item.qty
  }));

  const { error: itemsError } = await supabase
    .from('package_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating package items:', itemsError);
    return false;
  }

  // 3. Update NV Items packed_qty and status
  for (const item of items) {
    // Get current item to calculate new packed_qty
    const { data: currentItem } = await supabase
      .from('nv_items')
      .select('packed_qty, picked_qty')
      .eq('id', item.nv_item_id)
      .single();
      
    if (currentItem) {
      const newPackedQty = (currentItem.packed_qty || 0) + item.qty;
      const newStatus = newPackedQty >= currentItem.picked_qty ? 'empacado' : 'pendiente';
      
      await supabase
        .from('nv_items')
        .update({ 
          packed_qty: newPackedQty,
          status: newStatus
        })
        .eq('id', item.nv_item_id);
    }
  }

  return true;
}

export async function sendNVToSupervisorPacking(nvId: string, route: string): Promise<boolean> {
  const { error } = await supabase
    .from('nvs')
    .update({ 
      status: 'validar_despacho',
      route: route 
    })
    .eq('id', nvId);

  if (error) {
    console.error('Error sending NV to supervisor:', error);
    return false;
  }
  return true;
}

export async function fetchReceivingItems(): Promise<any[]> {
  const items: any[] = [];
  
  // Fetch OCs
  const { data: ocs, error: ocError } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      oc_number,
      purchase_order_items (
        nv_item_id,
        qty,
        nv_items (
          sku,
          description
        )
      )
    `)
    .eq('status', 'gestionado');

  if (!ocError && ocs) {
    ocs.forEach((oc: any) => {
      oc.purchase_order_items.forEach((item: any) => {
        items.push({
          id: `oc-${oc.id}-${item.nv_items?.sku}`,
          realId: oc.id,
          type: 'OC',
          ref: oc.oc_number,
          sku: item.nv_items?.sku,
          description: item.nv_items?.description,
          requested: item.qty,
          received: item.qty // Default to requested
        });
      });
    });
  }

  // Fetch Standby PH
  const { data: standby, error: stError } = await supabase
    .from('standby_items')
    .select(`
      id,
      missing_qty,
      nv_items (
        sku,
        description,
        nvs (
          nv_number
        )
      )
    `)
    .eq('status', 'esperando');

  if (!stError && standby) {
    standby.forEach((st: any) => {
      items.push({
        id: `ph-${st.id}`,
        realId: st.id,
        type: 'Bodega PH',
        ref: st.nv_items?.nvs?.nv_number,
        sku: st.nv_items?.sku,
        description: st.nv_items?.description,
        requested: st.missing_qty,
        received: st.missing_qty
      });
    });
  }

  return items;
}

export async function confirmReceivingItem(type: string, realId: string): Promise<boolean> {
  if (type === 'OC') {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'recepcionado' })
      .eq('id', realId);
    return !error;
  } else if (type === 'Bodega PH') {
    const { error } = await supabase
      .from('standby_items')
      .update({ status: 'ingresado' })
      .eq('id', realId);
    return !error;
  }
  return false;
}

export async function processReceivedOC(ocId: string, items: PurchaseItemData[]): Promise<boolean> {
  for (const item of items) {
    // 1. Update NV Item status to 'standby_ph'
    await supabase
      .from('nv_items')
      .update({ status: 'standby_ph' })
      .eq('id', item.id);
      
    // 2. Create Standby Item
    await supabase
      .from('standby_items')
      .insert([{
        nv_item_id: item.id,
        missing_qty: item.qty,
        status: 'esperando'
      }]);
  }
  return true;
}

// --- Vehicles & Routes ---

export interface PickerData {
  id: string;
  full_name: string;
  email: string;
}

export async function fetchPickers(): Promise<PickerData[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'picker');
    
  if (error) {
    console.error('Error fetching pickers:', error);
    return [];
  }
  return data || [];
}

export async function assignNvToPicker(nvId: string, pickerId: string): Promise<boolean> {
  // Update NV status to picking and assign picker
  const { error: nvError } = await supabase
    .from('nvs')
    .update({ status: 'picking' })
    .eq('id', nvId);
    
  if (nvError) {
    console.error('Error updating NV status:', nvError);
    return false;
  }
  
  // Log assignment
  const { error: assignError } = await supabase
    .from('picker_assignments')
    .insert([{ nv_id: nvId, picker_id: pickerId }]);
    
  if (assignError) {
    console.error('Error logging picker assignment:', assignError);
    // Continue anyway, assignment is secondary
  }
  
  return true;
}

export async function logPickerCorrection(nvId: string, itemId: string, pickerId: string, reason: string): Promise<boolean> {
  const { error } = await supabase
    .from('picker_corrections')
    .insert([{ nv_id: nvId, item_id: itemId, picker_id: pickerId, reason }]);
    
  if (error) {
    console.error('Error logging picker correction:', error);
    return false;
  }
  return true;
}
export interface DriverData {
  id: string;
  full_name: string;
}

export async function fetchDrivers(): Promise<DriverData[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'chofer')
    .order('full_name');
    
  if (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }
  return data || [];
}

export interface RouteData {
  id: string;
  driver_id: string;
  vehicle_id: string;
  status: string;
  end_mileage?: number;
  created_at: string;
}

export async function createRoute(driverId: string, vehicleId: string, nvIds: string[]): Promise<string | null> {
  // 1. Create the route
  const { data: routeData, error: routeError } = await supabase
    .from('routes')
    .insert([{ driver_id: driverId, vehicle_id: vehicleId, status: 'created' }])
    .select()
    .single();

  if (routeError) {
    console.error('Error creating route:', routeError);
    return null;
  }

  // 2. Create route documents for each NV
  if (nvIds.length > 0) {
    const documents = nvIds.map(nvId => ({
      route_id: routeData.id,
      nv_id: nvId,
      status: 'pending'
    }));

    const { error: docError } = await supabase
      .from('route_documents')
      .insert(documents);

    if (docError) {
      console.error('Error creating route documents:', docError);
    }
  }

  return routeData.id;
}

export async function fetchDriverRoute(driverId: string): Promise<any | null> {
  // Fetch the active route for the driver
  const { data: routeData, error: routeError } = await supabase
    .from('routes')
    .select(`
      id,
      status,
      vehicle_id,
      vehicles ( plate, brand, model ),
      route_documents (
        id,
        status,
        guide_number,
        nvs ( nv_number, client_name, dispatch_address )
      )
    `)
    .eq('driver_id', driverId)
    .in('status', ['created', 'validated', 'in_transit'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (routeError) {
    if (routeError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching driver route:', routeError);
    }
    return null;
  }

  if (!routeData) return null;

  // Transform to the format expected by the frontend
  const stops = routeData.route_documents.map((doc: any, index: number) => ({
    id: doc.id,
    client: doc.nvs?.client_name || 'Cliente Desconocido',
    address: doc.nvs?.dispatch_address || 'Dirección no especificada',
    nv: doc.nvs?.nv_number || 'S/N',
    status: doc.status === 'completed' ? 'completado' : 'pendiente',
    time: `Est. ${10 + index}:00 AM`, // Mock time
    proofImage: null
  }));

  const vehicleData = Array.isArray(routeData.vehicles) ? routeData.vehicles[0] : routeData.vehicles;

  return {
    id: routeData.id,
    vehicleId: routeData.vehicle_id,
    status: routeData.status,
    driver: '', // Will be filled by frontend
    vehicle: `${vehicleData?.brand || ''} ${vehicleData?.model || ''} - ${vehicleData?.plate || ''}`,
    stops
  };
}

export interface VehicleData {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  chassis?: string;
  current_mileage: number;
  next_maintenance_mileage: number;
}

export async function fetchVehicles(): Promise<VehicleData[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('plate');
    
  if (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
  return data || [];
}

export async function updateVehicleMaintenance(id: string, nextMileage: number): Promise<boolean> {
  const { error } = await supabase
    .from('vehicles')
    .update({ next_maintenance_mileage: nextMileage })
    .eq('id', id);
    
  if (error) {
    console.error('Error updating vehicle maintenance:', error);
    return false;
  }
  return true;
}

export async function closeRouteAndUpdateMileage(routeId: string, vehicleId: string, endMileage: number): Promise<boolean> {
  // 1. Update route status and end mileage
  const { error: routeError } = await supabase
    .from('routes')
    .update({ status: 'completed', end_mileage: endMileage })
    .eq('id', routeId);
    
  if (routeError) {
    console.error('Error updating route:', routeError);
    return false;
  }
  
  // 2. Update vehicle current mileage
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({ current_mileage: endMileage })
    .eq('id', vehicleId);
    
  if (vehicleError) {
    console.error('Error updating vehicle mileage:', vehicleError);
    return false;
  }
  
  return true;
}
