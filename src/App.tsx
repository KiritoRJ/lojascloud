import React, { Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

const App: React.FC = () => {
  const [page, setPage] = React.useState('dashboard');

  const renderPage = () => {
    if (page === 'dashboard') {
      return <Dashboard />;
    }
    if (page === 'settings') {
      return <Settings />;
    }
  };

  return (
    <div className="flex">
      <Sidebar setPage={setPage} />
      <main className="flex-1 p-8">
        <Suspense fallback={<div>Carregando...</div>}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
