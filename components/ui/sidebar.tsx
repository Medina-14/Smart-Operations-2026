'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { 
  Briefcase, 
  ClipboardList, 
  PackageSearch, 
  ShoppingCart, 
  Box, 
  CheckSquare, 
  Truck, 
  Map,
  BarChart,
  CheckCircle,
  ShieldAlert,
  FileText
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  // Hide sidebar on login and change-password pages
  if (pathname === '/login' || pathname === '/change-password') {
    return null;
  }

  const allLinks = [
    { href: '/admin', label: 'Resumen Operación', icon: BarChart, roles: ['admin_general', 'admin'] },
    { href: '/admin/reports', label: 'Reportes', icon: FileText, roles: ['admin_general', 'admin'] },
    { href: '/commercial', label: 'Comercial', icon: Briefcase, roles: ['admin_general', 'admin', 'comercial'] },
    { href: '/bodega-ph', label: 'Bodega PH', icon: Box, roles: ['admin_general', 'admin', 'bodega_ph'] },
    { href: '/supervisor-picking', label: 'Supervisor Picking', icon: ClipboardList, roles: ['admin_general', 'admin', 'bodega', 'supervisor_picking'] },
    { href: '/picker', label: 'Picking', icon: PackageSearch, roles: ['admin_general', 'admin', 'bodega', 'picker'] },
    { href: '/purchases', label: 'Compras', icon: ShoppingCart, roles: ['admin_general', 'admin', 'comercial', 'bodega', 'compras', 'apoyo_compras'] },
    { href: '/packing', label: 'Packing', icon: Box, roles: ['admin_general', 'admin', 'bodega', 'packing'] },
    { href: '/supervisor-packing', label: 'Supervisor Packing', icon: CheckSquare, roles: ['admin_general', 'admin', 'bodega', 'supervisor_packing'] },
    { href: '/logistics', label: 'Logística', icon: Truck, roles: ['admin_general', 'admin', 'despacho', 'logistica'] },
    { href: '/driver', label: 'Chofer', icon: Map, roles: ['admin_general', 'admin', 'despacho', 'chofer'] },
    { href: '/vehicles', label: 'Vehículos', icon: Truck, roles: ['admin_general', 'admin', 'despacho'] },
    { href: '/logistics-delivered', label: 'Logística – Rutas Entregadas', icon: CheckCircle, roles: ['admin_general', 'admin', 'despacho', 'logistica'] },
    { href: '/admin/users', label: 'Gestión Usuarios', icon: ShieldAlert, roles: ['admin_general'] },
  ];

  const links = allLinks.filter(link => profile && link.roles.includes(profile.role));

  return (
    <aside className="w-64 bg-antko-dark text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-antko-primary">Smart Operations</h2>
        <p className="text-sm text-gray-400">ANTKO Group</p>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors ${pathname === link.href ? 'bg-white/10 text-antko-primary' : ''}`}
            >
              <Icon className="w-5 h-5 text-antko-secondary" />
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="mb-4 px-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Usuario Actual</p>
          <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-xs text-antko-primary capitalize">{profile?.role?.replace('_', ' ')}</p>
        </div>
        <button 
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
