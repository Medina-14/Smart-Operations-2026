'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export type Profile = {
  id: string;
  role: 
    | 'admin_general' 
    | 'admin' 
    | 'comercial' 
    | 'bodega'
    | 'picker'
    | 'packing'
    | 'supervisor_picking'
    | 'supervisor_packing'
    | 'despacho'
    | 'logistica'
    | 'compras'
    | 'apoyo_compras'
    | 'reportes'
    | 'chofer'
    | 'bodega_ph';
  full_name: string;
  requires_password_change: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDashboardPath = (role: Profile['role']) => {
  switch (role) {
    case 'admin_general':
    case 'admin':
      return '/admin';
    case 'comercial':
      return '/commercial';
    case 'picker':
    case 'bodega': // fallback
      return '/picker';
    case 'bodega_ph':
      return '/bodega-ph';
    case 'packing':
      return '/packing';
    case 'supervisor_picking':
      return '/supervisor-picking';
    case 'supervisor_packing':
      return '/supervisor-packing';
    case 'despacho':
    case 'chofer':
      return '/driver';
    case 'logistica':
      return '/logistics';
    case 'compras':
    case 'apoyo_compras':
      return '/purchases';
    case 'reportes':
      return '/reports';
    default:
      return '/';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (!data) {
        console.error('No profile found for user:', authUser.id);
        
        // Auto-create profile for the admin or default to a basic role
        const isAdmin = authUser.email === 'elizabeth.medina@antko.cl';
        const newProfile = {
          id: authUser.id,
          role: isAdmin ? 'admin_general' : 'picker', // Default role
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
          requires_password_change: false
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating default profile:', createError);
          await supabase.auth.signOut();
          alert("Error: Tu cuenta no tiene un perfil asignado y no se pudo crear uno. Contacta al administrador.");
        } else {
          setProfile(createdProfile as Profile);
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && profile) {
        // Direct access to dashboard, ignoring requires_password_change
        if (pathname === '/login' || pathname === '/change-password') {
          router.push(getDashboardPath(profile.role));
        }
      }
    }
  }, [user, profile, isLoading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
