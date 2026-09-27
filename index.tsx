
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { registerLocale, setDefaultLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';

registerLocale('pt-BR', ptBR);
setDefaultLocale('pt-BR');

// Registrar SW de forma segura (evita exceções em iframes restritos ou ambiente de preview)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  try {
    registerSW({
      onNeedRefresh() {
        console.log('PWA: Novo conteúdo disponível, por favor atualize.');
      },
      onOfflineReady() {
        console.log('PWA: Aplicativo pronto para uso offline.');
      },
      onRegistered(r) {
        console.log('PWA: Service Worker registrado com sucesso (virtual):', r);
      },
      onRegisterError(error) {
        console.warn('PWA: Aviso ao registrar Service Worker (virtual):', error);
      }
    });
  } catch (err) {
    console.warn('PWA: Registro ignorado no ambiente atual:', err);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Garantir a remoção imediata do loader assim que a árvore do React começa a renderizar
const loader = document.getElementById('app-loader');
if (loader) {
  loader.style.opacity = '0';
  setTimeout(() => {
    try {
      loader.remove();
    } catch (_) {}
  }, 350);
}
