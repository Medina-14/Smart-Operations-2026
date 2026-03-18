'use client';

import { User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export function Header() {
  const pathname = usePathname();
  const { profile } = useAuth();

  if (pathname === '/login' || pathname === '/change-password') {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-antko-dark">Smart Operations – ANTKO Group</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-antko-primary/20 flex items-center justify-center text-antko-primary">
            <User className="w-4 h-4" />
          </div>
          <span>{profile?.full_name || 'Cargando...'}</span>
        </div>
      </div>
    </header>
  );
}
