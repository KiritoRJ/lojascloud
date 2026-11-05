import { useState, useEffect, useCallback } from 'react';

export function isAppRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Standalone display mode (PWA padrão em Chrome, Edge, Android, etc.)
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  
  // 2. iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any)?.standalone === true;

  // 3. Android TWA / WebAPK wrapper
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  // 4. Outros modos de aplicação instalada (fullscreen, minimal-ui, window-controls-overlay)
  const isFullscreenApp = window.matchMedia?.('(display-mode: fullscreen)')?.matches ?? false;
  const isMinimalUIApp = window.matchMedia?.('(display-mode: minimal-ui)')?.matches ?? false;
  const isWindowControlsApp = window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches ?? false;

  // 5. Parâmetros de inicialização de PWA na URL
  const isPWAQuery = typeof window !== 'undefined' && (
    window.location.search.includes('source=pwa') ||
    window.location.search.includes('mode=standalone') ||
    window.location.search.includes('installed=true') ||
    window.location.hash.includes('standalone')
  );

  // 6. Sinalização persistida pós-instalação
  let isSavedAsInstalled = false;
  try {
    isSavedAsInstalled = 
      localStorage.getItem('pwa_app_installed') === 'true' ||
      localStorage.getItem('app_installed') === 'true';
  } catch (e) {}

  return (
    isStandaloneMedia ||
    isIOSStandalone ||
    isAndroidApp ||
    isFullscreenApp ||
    isMinimalUIApp ||
    isWindowControlsApp ||
    isPWAQuery ||
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

  const markAsInstalled = useCallback(() => {
    setIsInstalled(true);
    setDeferredPrompt(null);
    try {
      localStorage.setItem('pwa_app_installed', 'true');
      localStorage.setItem('app_installed', 'true');
      (window as any).deferredPrompt = null;
      window.dispatchEvent(new Event('pwa-installed-change'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    // Atualiza estado inicial
    const currentStatus = isAppRunningStandalone();
    setIsInstalled(currentStatus);

    // Detecção nativa do Chromium se o aplicativo já está instalado no sistema operacional
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      try {
        (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            console.log('[PWA] Aplicativo detectado como instalado no sistema operacional');
            markAsInstalled();
          }
        }).catch(() => {});
      } catch (e) {}
    }

    // Escuta evento do navegador para salvar prompt de instalação
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    // Escuta evento disparado quando o app é instalado com sucesso
    const handleAppInstalled = () => {
      console.log('[PWA] Aplicativo instalado com sucesso no aparelho!');
      markAsInstalled();
    };

    // Escuta mudanças de media query para modos de exibição standalone
    const standaloneMq = window.matchMedia?.('(display-mode: standalone)');
    const fullscreenMq = window.matchMedia?.('(display-mode: fullscreen)');
    const minimalUiMq = window.matchMedia?.('(display-mode: minimal-ui)');

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        markAsInstalled();
      }
    };

    const handleCustomInstallEvent = () => {
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed-change', handleCustomInstallEvent);
    
    standaloneMq?.addEventListener?.('change', handleMediaChange);
    fullscreenMq?.addEventListener?.('change', handleMediaChange);
    minimalUiMq?.addEventListener?.('change', handleMediaChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed-change', handleCustomInstallEvent);
      standaloneMq?.removeEventListener?.('change', handleMediaChange);
      fullscreenMq?.removeEventListener?.('change', handleMediaChange);
      minimalUiMq?.removeEventListener?.('change', handleMediaChange);
    };
  }, [markAsInstalled]);

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
    setIsInstalled,
    markAsInstalled
  };
}
