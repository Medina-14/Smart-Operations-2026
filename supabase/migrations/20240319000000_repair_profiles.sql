-- migration to repair profiles table and RLS
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin_general', 'admin', 'comercial', 'bodega', 'bodega_ph', 'despacho', 'compras', 'apoyo_compras', 'picker', 'supervisor_picking', 'packing', 'supervisor_packing', 'chofer', 'logistica', 'reportes')),
  full_name TEXT NOT NULL,
  requires_password_change BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- LIMPIEZA TOTAL DE POLÍTICAS PARA EVITAR RECURSIÓN
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Lectura total autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción propia" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Actualización propia" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
