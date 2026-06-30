import { useState } from 'react';

import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  currentPage = 'dashboard',
  onNavigate = () => {},
  children,
  containerClassName = '',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page) => {
    onNavigate(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="stves-app-shell min-h-screen bg-[#f0f4f8]">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        sidebarOpen={sidebarOpen}
        onNavigate={handleNavigate}
      />

      <Sidebar
        isOpen={sidebarOpen}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="stves-main-content pt-16 lg:pl-64 min-h-screen">
        <div
          className={`stves-page-container p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto ${containerClassName}`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}