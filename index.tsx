
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createClient } from '@supabase/supabase-js';
import { OfflineSyncService } from './src/services/offlineSyncService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required environment variables!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const offlineSyncService = new OfflineSyncService(supabase);

export const OfflineSyncServiceContext = React.createContext<OfflineSyncService | null>(null);

import { registerSW } from 'virtual:pwa-register';
import { registerLocale, setDefaultLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';

registerLocale('pt-BR', ptBR);
setDefaultLocale('pt-BR');

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('PWA: Novo conteúdo disponível, por favor atualize.');
  },
  onOfflineReady() {
    console.log('PWA: Aplicativo pronto para uso offline.');
  },
  onRegistered(r) {
    console.log('PWA: Service Worker registrado com sucesso:', r);
  },
  onRegisterError(error) {
    console.error('PWA: Erro ao registrar Service Worker:', error);
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <OfflineSyncServiceContext.Provider value={offlineSyncService}>
      <App />
    </OfflineSyncServiceContext.Provider>
  </React.StrictMode>
);
