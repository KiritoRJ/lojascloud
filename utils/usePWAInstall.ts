import { useState, useEffect, useCallback } from 'react';

export function isAppRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Standalone display mode (PWA padrão em Chrome, Edge, Android, etc.)
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  
  // 2. iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // 3. Android TWA / WebAPK wrapper
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  // 4. Outros modos de aplicação instalada (fullscreen, minimal-ui, window-controls-overlay)
  const isFullscreenApp = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUIApp = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isWindowControlsApp = window.matchMedia('(display-mode: window-controls-overlay)').matches;

  // 5. Sinalização persistida pós-instalação
  let isSavedAsInstalled = false;
  try {
    isSavedAsInstalled = localStorage.getItem('pwa_app_installed') === 'true';
  } catch (e) {}

  return (
    isStandaloneMedia ||
    isIOSStandalone ||
    isAndroidApp ||
    isFullscreenApp ||
    isMinimalUIApp ||
    isWindowControlsApp ||
    isSavedAsInstalled
  );
}

export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isAppRunningStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
      return (window as any).deferredPrompt;
    }
    return null;
  });

  useEffect(() => {
    // Atualiza estado inicial
    setIsInstalled(isAppRunningStandalone());

    // Escuta evento do navegador para salvar prompt de instalação
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    // Escuta evento disparado quando o app é instalado com sucesso
    const handleAppInstalled = () => {
      console.log('[PWA] Aplicativo instalado com sucesso no aparelho!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('pwa_app_installed', 'true');
        (window as any).deferredPrompt = null;
      } catch (e) {}
    };

    // Escuta mudanças de media query (ex: se abriu em janela standalone)
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleMediaChange);
    } else {
      (mediaQueryList as any).addListener?.(handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleMediaChange);
      } else {
        (mediaQueryList as any).removeListener?.(handleMediaChange);
      }
    };
  }, []);

  const install = useCallback(async () => {
    const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPrompt : null);
    if (!promptToUse) return false;

    try {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem('pwa_app_installed', 'true');
          (window as any).deferredPrompt = null;
        } catch (e) {}
        return true;
      }
    } catch (err) {
      console.error('[PWA] Erro ao disparar instalação:', err);
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstalled,
    deferredPrompt,
    isInstallable: !isInstalled && !!deferredPrompt,
    install,
    setIsInstalled
  };
}
