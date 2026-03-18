-- Supabase Schema for Smart Operations - ANTKO Group

-- 1. DROP EXISTING TABLES (in correct order to avoid foreign key errors)
DROP TABLE IF EXISTS route_documents CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS package_items CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS standby_items CASCADE;
DROP TABLE IF EXISTS nv_items CASCADE;
DROP TABLE IF EXISTS nvs CASCADE;
DROP TABLE IF EXISTS sales_items CASCADE;
DROP TABLE IF EXISTS sales_documents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. CREATE TABLES

-- Profiles (Manejo de Roles y Accesos)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin_general', 'admin', 'comercial', 'bodega', 'bodega_ph', 'despacho', 'compras', 'apoyo_compras', 'picker', 'supervisor_picking', 'packing', 'supervisor_packing', 'chofer', 'logistica', 'reportes')),
  full_name TEXT NOT NULL,
  requires_password_change BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Seguridad de Fila)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ELIMINAR TODAS LAS POLÍTICAS EXISTENTES PARA EVITAR RECURSIÓN
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- CREAR POLÍTICAS SEGURAS (SIN RECURSIÓN)
CREATE POLICY "Permitir lectura para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción de perfil propio" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Permitir actualización de perfil propio" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Notas de Venta (NV)
CREATE TABLE IF NOT EXISTS public.nvs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, picking, revision, packing, validar_despacho, despachado
  dispatch_address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  observations TEXT,
  route TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NV Items
CREATE TABLE IF NOT EXISTS nv_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_id UUID REFERENCES nvs(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_qty INTEGER NOT NULL,
  picked_qty INTEGER DEFAULT 0,
  packed_qty INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendiente', -- pendiente, pickeado, revision, validado, error_picking, pendiente_compra, standby_ph, empacado
  proof_image_url TEXT
);

-- Standby Items (Bodega PH)
CREATE TABLE IF NOT EXISTS standby_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_item_id UUID REFERENCES nv_items(id) ON DELETE CASCADE,
  missing_qty INTEGER NOT NULL,
  status TEXT DEFAULT 'esperando', -- esperando, ingresado, procesado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_id UUID REFERENCES nvs(id) ON DELETE CASCADE,
  package_number INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'created', -- created, validated, dispatched
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Package Items
CREATE TABLE IF NOT EXISTS package_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  nv_item_id UUID REFERENCES nv_items(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL
);

-- Purchase Orders (OC)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oc_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'gestionado', -- gestionado, recepcionado, completado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oc_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  nv_item_id UUID REFERENCES nv_items(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  chassis TEXT,
  current_mileage INTEGER DEFAULT 0,
  next_maintenance_mileage INTEGER DEFAULT 0
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT DEFAULT 'created', -- created, validated, in_transit, completed
  end_mileage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Route Documents
CREATE TABLE IF NOT EXISTS route_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  nv_id UUID REFERENCES nvs(id),
  guide_number TEXT,
  status TEXT DEFAULT 'pending'
);

-- Picker Assignments
CREATE TABLE IF NOT EXISTS picker_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_id UUID REFERENCES nvs(id) ON DELETE CASCADE,
  picker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Picker Corrections
CREATE TABLE IF NOT EXISTS picker_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nv_id UUID REFERENCES nvs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES nv_items(id) ON DELETE CASCADE,
  picker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert mock vehicles
INSERT INTO vehicles (plate, brand, current_mileage, next_maintenance_mileage) VALUES
  ('VRBW-71', 'Maxus', 15000, 20000),
  ('TPLZ-15', 'Mahindra', 45000, 50000),
  ('VCPK-81', 'Mahindra', 8000, 10000),
  ('RFPH-30', 'Mahindra', 120000, 125000),
  ('RZLH-53', 'Mahindra', 65000, 70000),
  ('SLTC-12', 'Hyundai', 32000, 40000),
  ('RTYP-78', 'Volvo', 180000, 190000),
  ('CHEV-01', 'Chevrolet', 5000, 10000),
  ('VSDW-97', 'Chevrolet', 0, 10000),
  ('BBHY-58', 'Chevrolet', 0, 10000),
  ('TTZH-93', 'Mahindra', 0, 10000)
ON CONFLICT DO NOTHING;
