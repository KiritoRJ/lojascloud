import { useState, useEffect, useCallback, useRef } from 'react';
import { PosTerminalInfo, User } from '../types';

export function getDeviceTypeAndName(): { isMobile: boolean; isTablet: boolean; deviceInfo: string } {
  if (typeof navigator === 'undefined') {
    return { isMobile: false, isTablet: false, deviceInfo: 'Computador PDV' };
  }
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPod/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTablet = isIPad || (isAndroid && !/Mobile/i.test(ua));
  const isMobile = (isAndroid && /Mobile/i.test(ua)) || isIOS || /Windows Phone|BlackBerry/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS/i.test(ua) && !isIPad;
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let deviceInfo = 'Computador PDV';
  if (isAndroid && isMobile) deviceInfo = 'Celular Android';
  else if (isIOS) deviceInfo = 'Celular iPhone';
  else if (isIPad) deviceInfo = 'Tablet iPad';
  else if (isTablet) deviceInfo = 'Tablet Android';
  else if (isMobile) deviceInfo = 'Smartphone / Mobile';
  else if (isWindows) deviceInfo = 'PC Windows';
  else if (isMac) deviceInfo = 'Computador Mac';
  else if (isLinux) deviceInfo = 'Computador Linux';

  return { isMobile, isTablet, deviceInfo };
}

export function usePosTerminals(tenantId: string | undefined, currentUser: User | null) {
  // 1. Identificador único e estável por dispositivo/janela/celular/computador
  const [machineId] = useState<string>(() => {
    let saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pos_terminal_session_id') : null;
    if (!saved && typeof localStorage !== 'undefined') {
      // Verifica se há um ID exclusivo salvo no dispositivo
      saved = localStorage.getItem('pos_terminal_device_id');
    }
    if (!saved) {
      const { isMobile, isTablet } = getDeviceTypeAndName();
      const prefix = isMobile ? 'cel_' : isTablet ? 'tab_' : 'pc_';
      saved = prefix + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      try {
        sessionStorage?.setItem('pos_terminal_session_id', saved);
        localStorage?.setItem('pos_terminal_device_id', saved);
      } catch (e) {
        // ignore
      }
    }
    return saved;
  });

  // 2. Número de terminal fixado manualmente (0 = Detecção Automática)
  const [configuredTerminalNumber, setConfiguredTerminalNumberState] = useState<number>(() => {
    let saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pos_configured_terminal_number') : null;
    return saved ? parseInt(saved, 10) : 0;
  });

  const [terminalNumber, setTerminalNumber] = useState<number>(() => {
    return configuredTerminalNumber > 0 ? configuredTerminalNumber : 1;
  });

  const [terminalName, setTerminalName] = useState<string>(() => {
    const num = configuredTerminalNumber > 0 ? configuredTerminalNumber : 1;
    return `PDV ${String(num).padStart(2, '0')}`;
  });

  const [totalActiveTerminals, setTotalActiveTerminals] = useState<number>(1);
  const [activeTerminals, setActiveTerminals] = useState<PosTerminalInfo[]>([
    {
      terminalNumber: configuredTerminalNumber > 0 ? configuredTerminalNumber : 1,
      terminalName: `PDV ${String(configuredTerminalNumber > 0 ? configuredTerminalNumber : 1).padStart(2, '0')}`,
      operatorName: currentUser?.name || 'Operador',
      operatorRole: currentUser?.role || 'colaborador',
      isCurrent: true,
      deviceInfo: getDeviceTypeAndName().deviceInfo,
      lastSeen: Date.now(),
      isOnline: true
    }
  ]);
  const [isTerminalsModalOpen, setIsTerminalsModalOpen] = useState(false);

  const configuredNumberRef = useRef(configuredTerminalNumber);
  configuredNumberRef.current = configuredTerminalNumber;

  const setConfiguredTerminalNumber = useCallback((num: number) => {
    setConfiguredTerminalNumberState(num);
    if (num > 0) {
      try {
        sessionStorage.setItem('pos_configured_terminal_number', String(num));
      } catch (e) {}
      setTerminalNumber(num);
      setTerminalName(`PDV ${String(num).padStart(2, '0')}`);
    } else {
      try {
        sessionStorage.removeItem('pos_configured_terminal_number');
      } catch (e) {}
    }
    // Dispara heartbeat imediato para atualizar toda a rede
    triggerHeartbeat();
  }, []);

  const triggerHeartbeat = useCallback(async () => {
    const tId = tenantId || 'default';
    const { deviceInfo } = getDeviceTypeAndName();

    try {
      const res = await fetch('/api/pos/terminal-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tId,
          machineId,
          configuredNumber: configuredNumberRef.current,
          operatorName: currentUser?.name || 'Operador',
          operatorRole: currentUser?.role || 'colaborador',
          operatorId: currentUser?.id,
          deviceInfo
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTerminalNumber(data.currentTerminalNumber);
          setTerminalName(data.currentTerminalName);
          setTotalActiveTerminals(data.totalActiveTerminals);
          setActiveTerminals(data.activeTerminals);

          // Sincroniza via BroadcastChannel para outras abas no mesmo dispositivo
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            try {
              const bc = new BroadcastChannel('pos_terminals_sync');
              bc.postMessage({ type: 'TERMINAL_HEARTBEAT_ACK', sourceId: machineId, data });
              bc.close();
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      // Fallback em caso de offline
    }
  }, [tenantId, machineId, currentUser]);

  useEffect(() => {
    triggerHeartbeat();
    const interval = setInterval(triggerHeartbeat, 5000);
    const handleFocus = () => triggerHeartbeat();
    window.addEventListener('focus', handleFocus);

    // Canal BroadcastChannel para sincronização instantânea inter-abas
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('pos_terminals_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'TERMINAL_JOIN' || event.data?.type === 'TERMINAL_LEAVE') {
            triggerHeartbeat();
          } else if (event.data?.type === 'TERMINAL_HEARTBEAT_ACK' && event.data?.data) {
            const data = event.data.data;
            if (Array.isArray(data.activeTerminals)) {
              setTotalActiveTerminals(data.totalActiveTerminals);
              setActiveTerminals(data.activeTerminals.map((t: PosTerminalInfo) => ({
                ...t,
                isCurrent: t.terminalNumber === terminalNumber
              })));
            }
          }
        };
        bc.postMessage({ type: 'TERMINAL_JOIN', machineId });
      } catch (err) {}
    }

    // Avisa o servidor ao descarregar a janela/aba
    const handleUnload = () => {
      const tId = tenantId || 'default';
      try {
        if (bc) {
          bc.postMessage({ type: 'TERMINAL_LEAVE', machineId });
        }
        navigator.sendBeacon?.(
          '/api/pos/terminal-leave',
          new Blob([JSON.stringify({ tenantId: tId, machineId })], { type: 'application/json' })
        );
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleUnload);
      if (bc) bc.close();
    };
  }, [triggerHeartbeat, machineId, tenantId, terminalNumber]);

  return {
    machineId,
    terminalNumber,
    terminalName,
    totalActiveTerminals,
    activeTerminals,
    configuredTerminalNumber,
    setConfiguredTerminalNumber,
    isTerminalsModalOpen,
    setIsTerminalsModalOpen,
    refreshTerminals: triggerHeartbeat
  };
}
