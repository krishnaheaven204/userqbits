'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/auth/login' ||
    pathname === '/auth/register' ||
    pathname?.startsWith('/register');

  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Toaster position="top-right" reverseOrder={false} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div className="main-content-wrapper">
        <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <div className="pc-content">
          {children}
        </div>
      </div>
    </div>
  );
}
