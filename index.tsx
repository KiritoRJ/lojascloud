
import React from 'react';
import ReactDOM from 'react-dom/client';
// O navegador/WebView precisa da extensão explícita .tsx para encontrar o arquivo
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  if ((window as any).hideAppLoader) {
    (window as any).hideAppLoader();
  }
} catch (err) {
  console.error("Erro na renderização do React:", err);
}
