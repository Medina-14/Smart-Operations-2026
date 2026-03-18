import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'Smart Operations – ANTKO Group',
  description: 'Plataforma de operaciones logísticas y de almacén',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-antko-light" suppressHydrationWarning>
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
