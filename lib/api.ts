import { supabase } from './supabase';
import { NVData, NVItem } from '@/components/ui/nv-card';

// ... (Mantén todas las funciones anteriores de NVs, Standby, OC, Packing, etc. hasta la línea de Vehicles)

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
  const { error: nvError } = await supabase
    .from('nvs')
    .update({ status: 'picking' })
    .eq('id', nvId);
    
  if (nvError) {
    console.error('Error updating NV status:', nvError);
    return false;
  }
  
  const { error: assignError } = await supabase
    .from('picker_assignments')
    .insert([{ nv_id: nvId, picker_id: pickerId }]);
    
  if (assignError) {
    console.error('Error logging picker assignment:', assignError);
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

export async function createRoute(driverId: string, vehicleId: string, nvIds: string[]): Promise<string | null> {
  const { data: routeData, error: routeError } = await supabase
    .from('routes')
    .insert([{ driver_id: driverId, vehicle_id: vehicleId, status: 'created' }])
    .select()
    .single();

  if (routeError) {
    console.error('Error creating route:', routeError);
    return null;
  }

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

// --- MANTENCIONES Y VEHÍCULOS ---

export async function addMaintenanceLog(logData: { vehicle_id: string, date: string, mileage: number, description: string, invoice_url?: string }) {
  const { error } = await supabase.from('maintenance_logs').insert([logData]);
  return !error;
}

export async function fetchMaintenanceLogs(vehicleId: string) {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });
  return data || [];
}

export interface VehicleData {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  chassis?: string;
  current_mileage: number;
  next_maintenance_mileage: number;
  permiso_circulacion_vencimiento?: string; // NUEVO
  registro_mantenciones?: string; // NUEVO
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

// NUEVA FUNCIÓN
export async function updateVehicleDetails(id: string, details: Partial<VehicleData>): Promise<boolean> {
  const { error } = await supabase
    .from('vehicles')
    .update(details)
    .eq('id', id);
    
  if (error) {
    console.error('Error updating vehicle details:', error);
    return false;
  }
  return true;
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

// --- BODEGA PH (Tipo Bulto y Logística) ---

export async function updateStandbyItemType(id: string, tipoBulto: string) {
  const { error } = await supabase
    .from('standby_items')
    .update({ tipo_bulto: tipoBulto })
    .eq('id', id);
  return !error;
}

// NUEVA FUNCIÓN
export async function sendStandbyItemToLogistics(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('standby_items')
    .update({ status: 'en_logistica' })
    .eq('id', id);
  return !error;
}

// ... (Mantén el resto de funciones de rutas y vehículos que ya tenías)
