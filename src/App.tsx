import React, { useState, useEffect } from 'react';
import { processSyncQueue } from './utils/supabaseSync';
import { syncOnlineToOffline } from './utils/DataService';

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    const handleOnline = async () => {
      console.log('App está online');
      setIsOnline(true);
      setSyncStatus('syncing');
      try {
        await processSyncQueue();
        // Supondo um tenantId fixo por enquanto. Em um app real, isso viria do estado de autenticação.
        await syncOnlineToOffline('user-tenant-id'); 
        setSyncStatus('success');
      } catch (error) {
        console.error('Falha na sincronização ao ficar online:', error);
        setSyncStatus('error');
      }
    };

    const handleOffline = () => {
      console.log('App está offline');
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sincronização inicial se estiver online no carregamento
    if (isOnline) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Assistência Técnica Pro</h1>
          <div className="flex items-center space-x-2">
            <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-500'}`}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        <p>Status da Sincronização: {syncStatus}</p>
        {/* O conteúdo principal da sua aplicação (rotas, etc.) iria aqui */}
      </main>
    </div>
  );
};

export default App;
