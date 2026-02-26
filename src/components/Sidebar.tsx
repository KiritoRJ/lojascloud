import React from 'react';

interface SidebarProps {
  setPage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setPage }) => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white">
      <div className="p-4 text-2xl font-bold">Assitência Pro</div>
      <nav className="mt-8">
        <a href="#" onClick={() => setPage('dashboard')} className="block px-4 py-2 text-lg hover:bg-gray-700">Dashboard</a>
        <a href="#" onClick={() => setPage('settings')} className="block px-4 py-2 text-lg hover:bg-gray-700">Configurações</a>
      </nav>
    </div>
  );
};

export default Sidebar;
