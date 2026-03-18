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
    setIsLoading(true); // Ensure loading is on
    try {
      console.log('Fetching profile for:', authUser.id);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile (Code:', status, '):', error);
        // If it's a 403, we might need to handle it or show a message
      }
      
      if (data) {
        console.log('Profile found:', data.id, 'Role:', data.role);
        setProfile(data as Profile);
      } else {
        console.warn('No profile record in table for user:', authUser.id);
        
        // Only attempt auto-create if we didn't get a 403 error previously
        if (!error) {
          const isAdmin = authUser.email === 'elizabeth.medina@antko.cl' || authUser.email?.includes('medina');
          const newProfile = {
            id: authUser.id,
            role: isAdmin ? 'admin_general' : 'picker',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            requires_password_change: false
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (!createError) {
            setProfile(createdProfile as Profile);
          } else {
            console.error('Failed to auto-create profile:', createError);
          }
        }
      }
    } catch (error) {
      console.error('Fatal error in fetchProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider State - isLoading:', isLoading, 'user:', user?.email, 'pathname:', pathname);
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && profile) {
        // Direct access to dashboard, ignoring requires_password_change
        if (pathname === '/login' || pathname === '/change-password' || pathname === '/') {
          const dashboard = getDashboardPath(profile.role);
          console.log('Redirecting to dashboard:', dashboard);
          router.push(dashboard);
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
