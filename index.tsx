
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

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
    <App />
  </React.StrictMode>
);
