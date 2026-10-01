
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Smartphone, Package, ShoppingCart, BarChart3, Settings, LogOut, Menu, X, Loader2, ShieldCheck, KeyRound, ChevronRight, Store, TrendingUp, Users, CheckCircle2, ArrowRight, ArrowLeft, Shield, Wrench, WifiOff, Sparkles, Download, HelpCircle, FileText } from 'lucide-react';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User, Customer } from './types';
import ServiceOrderTab from './components/ServiceOrderTab';
import CustomersTab from './components/CustomersTab';
import StockTab from './components/StockTab';
import SalesTab from './components/SalesTab';
import FinanceTab from './components/FinanceTab';
import SettingsTab from './components/SettingsTab';
import EmployeeManagementTab from './components/EmployeeManagementTab';
import ToolsTab from './components/ToolsTab';
import { FiscalTab } from './components/FiscalTab';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { ResellerDashboard } from './components/ResellerDashboard';
import SubscriptionView from './components/SubscriptionView';
import CustomerCatalog from './components/CustomerCatalog';
import PublicTrackingPage from './components/PublicTrackingPage';
import { DeviceHardwareTestPage } from './components/DeviceHardwareTestPage';
import { InstallAppModal } from './components/InstallAppModal';
import { SpotlightTour } from './components/SpotlightTour';
import { OnlineDB, supabase } from './utils/api';
import { OfflineSync } from './utils/offlineSync';
import { OfflineAuth } from './utils/offlineAuth';
import { ResellerService } from './utils/resellerService';
import { getChangedOrders } from './utils/orderUtils';
import { db } from './utils/localDb';
import { useAppNotifications } from './utils/useAppNotifications';
import { ConnectionStatusManager } from './utils/connectionStatus';
import { 
  ConnectionStatusTag, 
  DatabaseOfflineBanner, 
  ConnectionStatusToast 
} from './components/DatabaseOfflineAlert';
import { TrialBanner } from './components/TrialBanner';

type Tab = 'os' | 'clientes' | 'estoque' | 'vendas' | 'fiscal' | 'financeiro' | 'config' | 'team' | 'ferramentas';

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Minha Assistência',
  storeTradeName: 'Minha Assistência',
  storeCorporateName: 'Minha Assistência Técnica LTDA',
  storeCnpj: '00.000.000/0001-91',
  storeStateRegistration: 'ISENTO',
  storeCity: 'São Paulo',
  storeState: 'SP',
  storeAddress: 'Rua das Flores, 123, Centro',
  storePhone: '(11) 99999-9999',
  logoUrl: null,
  users: [],
  isConfigured: true,
  themePrimary: '#2563eb',
  themeSidebar: '#0f172a',
  themeBg: '#f8fafc',
  themeBottomTab: '#0f172a',
  pdfWarrantyText: "Concede-se garantia pelo prazo de 90 (noventa) dias contra defeitos de fabricação ou do serviço executado. A garantia não cobre danos por mau uso, contato com líquidos ou quedas.",
  pdfFontSize: 8,
  pdfFontFamily: 'helvetica',
  pdfPaperWidth: 80,
  printerSize: 58,
  pdfTextColor: '#000000',
  pdfBgColor: '#FFFFFF',
  itemsPerPage: 32,
  enableBillNotifications: false
};

const App: React.FC = () => {
  const [session, setSession] = useState<{ 
    isLoggedIn: boolean; 
    type: 'super' | 'admin' | 'colaborador' | 'reseller'; 
    tenantId?: string; 
    user?: User; 
    reseller?: any;
    isSuper?: boolean;
    impersonatedBySuper?: boolean;
    subscriptionStatus?: string; 
    subscriptionExpiresAt?: string;
    customMonthlyPrice?: number;
    customQuarterlyPrice?: number;
    customYearlyPrice?: number;
    lastPlanType?: 'monthly' | 'quarterly' | 'yearly';
    enabledFeatures?: {
      osTab: boolean;
      customersTab?: boolean;
      stockTab: boolean;
      salesTab: boolean;
      fiscalTab?: boolean;
      fiscalMode?: boolean;
      financeTab: boolean;
      toolsTab?: boolean;
      aiFeature?: boolean;
      profiles: boolean;
      xmlExportImport: boolean;
      hideFinancialReports?: boolean;
      promoBanner?: boolean;
    };
    maxUsers?: number;
    maxOS?: number;
    maxProducts?: number;
    printerSize?: 58 | 80;
  } | null>(() => {
    try {
      const storedSession = localStorage.getItem('session_pro');
      const storedUser = localStorage.getItem('currentUser_pro');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        // Se for a antiga sessão de demo, descarta e limpa
        if (parsed.tenantId === 'T_DEMO_LOJA' || parsed.user?.id === 'admin-demo') {
          localStorage.removeItem('session_pro');
          localStorage.removeItem('currentUser_pro');
          return null;
        }
        if (parsed.isSuper && !parsed.tenantId) {
          return { isLoggedIn: true, type: 'super', isSuper: true };
        }
        if (parsed.type === 'reseller' && parsed.reseller) {
          return { isLoggedIn: true, type: 'reseller', reseller: parsed.reseller };
        }
        if (parsed.tenantId) {
          const user = storedUser ? JSON.parse(storedUser) : null;
          return {
            isLoggedIn: true,
            type: parsed.type || 'admin',
            tenantId: parsed.tenantId,
            user: user,
            isSuper: parsed.isSuper,
            impersonatedBySuper: parsed.impersonatedBySuper,
            subscriptionStatus: parsed.subscriptionStatus,
            subscriptionExpiresAt: parsed.subscriptionExpiresAt,
            customMonthlyPrice: parsed.customMonthlyPrice,
            customQuarterlyPrice: parsed.customQuarterlyPrice,
            customYearlyPrice: parsed.customYearlyPrice,
            lastPlanType: parsed.lastPlanType,
            enabledFeatures: parsed.enabledFeatures,
            maxUsers: parsed.maxUsers,
            maxOS: parsed.maxOS,
            maxProducts: parsed.maxProducts,
            printerSize: parsed.printerSize
          };
        }
      }
    } catch (e) {}
    return null;
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prefilledCustomerForOS, setPrefilledCustomerForOS] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'ferramentas' || params.get('view') === 'adb-cleaner' || window.location.hash.includes('adb-cleaner')) {
        return 'ferramentas';
      }
      if (params.get('tab') === 'config') return 'config';
      if (params.get('tab') === 'os') return 'os';
      if (params.get('tab') === 'clientes') return 'clientes';
      if (params.get('tab') === 'estoque') return 'estoque';
      if (params.get('tab') === 'vendas') return 'vendas';
      if (params.get('tab') === 'fiscal') return 'fiscal';
      if (params.get('tab') === 'financeiro') return 'financeiro';
      if (params.get('tab') === 'team') return 'team';

      const saved = localStorage.getItem('last_active_tab') as Tab;
      if (saved && ['os', 'clientes', 'estoque', 'vendas', 'fiscal', 'financeiro', 'config', 'team', 'ferramentas'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'config';
  });

  // Salva a aba ativa para nunca perder o contexto ao minimizar no celular
  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('last_active_tab', activeTab);
      }
    } catch (e) {}
  }, [activeTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [isVerifyingLogout, setIsVerifyingLogout] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAiGloballyDisabled, setIsAiGloballyDisabled] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleCustomFs = (e: any) => {
      setIsFullscreen(!!e.detail);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('pos-fullscreen-change' as any, handleCustomFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('pos-fullscreen-change' as any, handleCustomFs);
    };
  }, []);

  const currentUser = useMemo(() => {
    if (!settings?.users) return session?.user || null;
    
    // If we are logged in as an admin, ensure the admin user object is used
    if (session?.type === 'admin') {
      const admin = settings.users.find(u => u.role === 'admin');
      return admin || session?.user || settings.users[0] || null;
    }
    
    return session?.user || settings.users[0] || null;
  }, [session?.user, session?.type, settings?.users]);
  useAppNotifications(transactions, products, orders, sales, settings, currentUser);

  const navItems = useMemo(() => [
    { id: 'os', label: 'Ordens', icon: Smartphone, roles: ['admin', 'colaborador'], feature: 'osTab' },
    { id: 'clientes', label: 'Clientes', icon: Users, roles: ['admin', 'colaborador'], feature: 'customersTab' },
    { id: 'estoque', label: 'Estoque', icon: Package, roles: ['admin'], feature: 'stockTab' },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart, roles: ['admin', 'colaborador'], feature: 'salesTab' },
    { id: 'fiscal', label: 'Fiscal', icon: FileText, roles: ['admin', 'colaborador'], feature: 'fiscalTab' },
    { id: 'financeiro', label: 'Finanças', icon: BarChart3, roles: ['admin'], feature: 'financeTab' },
    { id: 'team', label: 'Equipe', icon: ShieldCheck, roles: ['admin'], feature: 'financeTab' },
    { id: 'ferramentas', label: 'Ferramentas', icon: Wrench, roles: ['admin', 'colaborador'], feature: 'toolsTab' },
    { id: 'config', label: 'Ajustes', icon: Settings, roles: ['admin', 'colaborador'] },
  ], []);

  const visibleNavItems = useMemo(() => {
    if (!currentUser) return [];
    return navItems.filter(item => {
      const roleAllowed = item.roles.includes(currentUser.role);
      const isFiscalEnabled = !!(session?.enabledFeatures?.fiscalMode || (session?.enabledFeatures as any)?.fiscalModeEnabled);
      const featureAllowed = item.id === 'fiscal'
        ? (isFiscalEnabled && (session?.enabledFeatures as any)?.fiscalTab !== false)
        : (!item.feature || (session?.enabledFeatures as any)?.[item.feature] !== false);
      return roleAllowed && featureAllowed;
    });
  }, [currentUser, session?.enabledFeatures, navItems]);

  // Se a aba ativa atual não estiver permitida para esta loja/perfil, redireciona para a primeira aba visível
  useEffect(() => {
    if (session?.isLoggedIn && visibleNavItems.length > 0 && !visibleNavItems.some(item => item.id === activeTab)) {
      setActiveTab(visibleNavItems[0].id as Tab);
    }
  }, [session?.isLoggedIn, visibleNavItems, activeTab]);

  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';

  // 1. Extração universal do Token de Teste de Hardware
  let hardwareTestToken: string | null = null;
  if (pathname.startsWith('/teste-hardware/') || pathname.startsWith('/test/')) {
    const raw = pathname.startsWith('/teste-hardware/')
      ? pathname.split('/teste-hardware/')[1]
      : pathname.split('/test/')[1];
    hardwareTestToken = raw?.split('/')[0]?.split('?')[0]?.split('#')[0] || null;
  } else if (pathname === '/teste-hardware' || pathname === '/test') {
    hardwareTestToken = searchParams.get('token') || searchParams.get('id') || searchParams.get('os') || null;
  }
  if (!hardwareTestToken) {
    hardwareTestToken = searchParams.get('teste-hardware') || searchParams.get('test') || searchParams.get('hardware-test') || searchParams.get('hardware_test') || null;
  }
  if (!hardwareTestToken && hash) {
    const cleanHash = hash.replace(/^#\/?/, '');
    if (cleanHash.startsWith('teste-hardware/') || cleanHash.startsWith('test/')) {
      const raw = cleanHash.startsWith('teste-hardware/')
        ? cleanHash.split('teste-hardware/')[1]
        : cleanHash.split('test/')[1];
      hardwareTestToken = raw?.split('/')[0]?.split('?')[0] || null;
    }
  }

  // 2. Extração universal do Token de Acompanhamento Público
  let publicTrackingToken: string | null = null;
  if (pathname.startsWith('/acompanhamento/')) {
    publicTrackingToken = pathname.split('/acompanhamento/')[1]?.split('/')[0]?.split('?')[0]?.split('#')[0] || null;
  } else if (pathname === '/acompanhamento') {
    publicTrackingToken = searchParams.get('token') || searchParams.get('id') || null;
  }
  if (!publicTrackingToken) {
    publicTrackingToken = searchParams.get('track') || searchParams.get('acompanhamento') || null;
  }
  if (!publicTrackingToken && hash) {
    const cleanHash = hash.replace(/^#\/?/, '');
    if (cleanHash.startsWith('acompanhamento/')) {
      publicTrackingToken = cleanHash.split('acompanhamento/')[1]?.split('/')[0]?.split('?')[0] || null;
    }
  }

  // 3. Catálogo público (apenas rotas explícitas /catalogo/ ou parâmetros de catálogo)
  let catalogTenantId = searchParams.get('catalog') || searchParams.get('loja');
  let catalogSlug: string | null = null;
  
  if (pathname.startsWith('/catalogo/')) {
    catalogTenantId = pathname.split('/catalogo/')[1].replace(/\/$/, '');
  } else if (pathname.startsWith('/loja/')) {
    catalogTenantId = pathname.split('/loja/')[1].replace(/\/$/, '');
  }

  useEffect(() => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    
    OfflineSync.init();
    ConnectionStatusManager.init();
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Debug: check if app is already installed or standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    OnlineDB.getAISystemStatus().then(status => {
      setIsAiGloballyDisabled(!!status?.disabled);
    }).catch(() => {});
  }, [session?.tenantId]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ storeName: '', username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [availableOfflineUsers, setAvailableOfflineUsers] = useState<Array<{ username: string; name: string; role: string }>>([]);

  useEffect(() => {
    OfflineAuth.getAvailableOfflineUsers().then(users => {
      setAvailableOfflineUsers(users);
    }).catch(() => {});
  }, [isOnline, session]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.storeName || !registerForm.username || !registerForm.password) {
      setLoginError("Preencha todos os campos.");
      return;
    }
    setIsRegistering(true);
    setLoginError(null);
    try {
      const tenantId = 'T_' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const res = await OnlineDB.createTenant({
        id: tenantId,
        storeName: registerForm.storeName,
        adminUsername: registerForm.username,
        adminPasswordPlain: registerForm.password,
        logoUrl: null,
        phoneNumber: ''
      });

      if (res.success) {
        try {
          localStorage.setItem('first_access_' + tenantId, 'true');
          localStorage.setItem('first_access_new_store', 'true');
        } catch (e) {}
        setLoginForm({ username: registerForm.username, password: registerForm.password });
        setIsRegisterMode(false);
        setLoginError("Loja criada com sucesso! Faça login para começar seus 7 dias grátis.");
      } else {
        setLoginError(res.message || "Erro ao criar loja.");
      }
    } catch (e) {
      setLoginError("Erro de conexão.");
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedSession = localStorage.getItem('session_pro');
        const storedUser = localStorage.getItem('currentUser_pro');
        
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.isSuper && !parsed.tenantId) {
            setSession({
              isLoggedIn: true,
              type: 'super',
              isSuper: true
            });
          } else if (parsed.tenantId) {
            const user = storedUser ? JSON.parse(storedUser) : null;
            setSession({
              isLoggedIn: true,
              type: parsed.type || 'admin',
              tenantId: parsed.tenantId,
              user: user,
              isSuper: parsed.isSuper,
              impersonatedBySuper: parsed.impersonatedBySuper,
              subscriptionStatus: parsed.subscriptionStatus,
              subscriptionExpiresAt: parsed.subscriptionExpiresAt,
              customMonthlyPrice: parsed.customMonthlyPrice,
              customQuarterlyPrice: parsed.customQuarterlyPrice,
              customYearlyPrice: parsed.customYearlyPrice,
              lastPlanType: parsed.lastPlanType,
              enabledFeatures: parsed.enabledFeatures,
              maxUsers: parsed.maxUsers,
              maxOS: parsed.maxOS,
              maxProducts: parsed.maxProducts,
              printerSize: parsed.printerSize
            });
          }
        }
      } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  const loadData = useCallback(async (tenantId: string) => {
    try {
      // 1. CARREGAMENTO LOCAL INSTANTÂNEO (< 50ms) - interface pronta de imediato
      const localData = await OfflineSync.getLocalData(tenantId);
      if (localData) {
        const initialSettings = { ...DEFAULT_SETTINGS, ...(localData.settings || {}) };
        initialSettings.users = localData.users || [];
        setSettings(initialSettings);
        setOrders(localData.orders || []);
        setCustomers(localData.customers || []);
        setProducts(localData.products || []);
        setSales(localData.sales || []);
        setTransactions(localData.transactions || []);
      }

      setIsCloudConnected(typeof navigator !== 'undefined' ? navigator.onLine : true);

      // 2. REVALIDAÇÃO / SINCRONIZAÇÃO EM SEGUNDO PLANO SE ESTIVER ONLINE
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const [cloudData, tenantData] = await Promise.all([
            OfflineSync.pullAllData(tenantId),
            OnlineDB.getTenantById(tenantId)
          ]);

          if (cloudData) {
            setIsCloudConnected(true);
            ConnectionStatusManager.reportSuccess();
            const finalSettings = { ...DEFAULT_SETTINGS, ...cloudData.settings };
            
            // Se o tenantData trouxer um printer_size atualizado, usamos ele
            if (tenantData?.printer_size) {
              finalSettings.printerSize = tenantData.printer_size;
              setSession(prev => prev ? { ...prev, printerSize: tenantData.printer_size } : null);
            } else if (session?.printerSize) {
              finalSettings.printerSize = session.printerSize;
            }
            
            finalSettings.users = cloudData.users || [];
            setSettings(finalSettings);
            setOrders(cloudData.orders || []);
            setCustomers(cloudData.customers || []);
            setProducts(cloudData.products || []);
            setSales(cloudData.sales || []);
            setTransactions(cloudData.transactions || []);
            return;
          } else {
            setIsCloudConnected(false);
          }
        } catch (cloudErr) {
          setIsCloudConnected(false);
          ConnectionStatusManager.reportError(cloudErr);
        }
      } else {
        setIsCloudConnected(false);
      }
    } catch (e) {
      console.error("Erro ao carregar dados locais:", e);
      setIsCloudConnected(false);
    } finally {
      // Garante que a interface nunca fique eternamente travada em "Validando Sistema..."
      setSettings(prev => prev || { ...DEFAULT_SETTINGS });
    }
  }, [session?.printerSize]);

  useEffect(() => {
    if (session?.isLoggedIn && session.tenantId) {
      loadData(session.tenantId);
    }
  }, [session?.isLoggedIn, session?.tenantId, loadData]);

  // Real-time listener for data updates + instant hardware test broadcast sync
  useEffect(() => {
    if (!session?.isLoggedIn || !session.tenantId) return;

    const tenantId = session.tenantId;
    let timeout: any;
    const tableDebounceTimers: Record<string, any> = {};

    const debouncedLoad = (delay = 300) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => loadData(tenantId), delay);
    };

    const debounceTableSync = (table: string, syncFn: () => Promise<void>, delay = 400) => {
      if (tableDebounceTimers[table]) {
        clearTimeout(tableDebounceTimers[table]);
      }
      tableDebounceTimers[table] = setTimeout(() => {
        syncFn();
      }, delay);
    };
    
    // 1. Supabase Postgres Real-time Channel (atualizações em tempo real com ZERO EGRESS via payload WebSocket)
    const channel = supabase
      .channel(`tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_orders', filter: `tenant_id=eq.${tenantId}` },
        (payload: any) => {
          try {
            if (payload?.eventType === 'INSERT' || payload?.eventType === 'UPDATE') {
              const mapped = OnlineDB.mapOrderFromRow(payload.new);
              if (mapped) {
                db.orders.put({ ...mapped, tenantId });
                setOrders(prev => {
                  const idx = prev.findIndex(o => o.id === mapped.id);
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                  }
                  return [mapped, ...prev];
                });
                return; // Zero egress: atualizou instantaneamente pelo WebSocket
              }
            } else if (payload?.eventType === 'DELETE') {
              const delId = payload.old?.id;
              if (delId) {
                db.orders.delete(delId);
                setOrders(prev => prev.filter(o => o.id !== delId));
                return;
              }
            }
          } catch (e) {}
          debounceTableSync('orders', async () => {
            const res = await OfflineSync.pullOrders(tenantId);
            if (res) setOrders(res);
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `tenant_id=eq.${tenantId}` },
        (payload: any) => {
          try {
            if (payload?.eventType === 'INSERT' || payload?.eventType === 'UPDATE') {
              const mapped = OnlineDB.mapCustomerFromRow(payload.new);
              if (mapped) {
                db.customers.put({ ...mapped, tenantId });
                setCustomers(prev => {
                  const idx = prev.findIndex(c => c.id === mapped.id);
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                  }
                  return [...prev, mapped];
                });
                return;
              }
            } else if (payload?.eventType === 'DELETE') {
              const delId = payload.old?.id;
              if (delId) {
                db.customers.delete(delId);
                setCustomers(prev => prev.filter(c => c.id !== delId));
                return;
              }
            }
          } catch (e) {}
          debounceTableSync('customers', async () => {
            const res = await OfflineSync.pullCustomers(tenantId);
            if (res) setCustomers(res);
          }, 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `tenant_id=eq.${tenantId}` },
        (payload: any) => {
          try {
            if (payload?.eventType === 'INSERT' || payload?.eventType === 'UPDATE') {
              const mapped = OnlineDB.mapSaleFromRow(payload.new);
              if (mapped) {
                db.sales.put({ ...mapped, tenantId });
                setSales(prev => {
                  const idx = prev.findIndex(s => s.id === mapped.id);
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                  }
                  return [mapped, ...prev];
                });
                return;
              }
            } else if (payload?.eventType === 'DELETE') {
              const delId = payload.old?.id;
              if (delId) {
                db.sales.delete(delId);
                setSales(prev => prev.filter(s => s.id !== delId));
                return;
              }
            }
          } catch (e) {}
          debounceTableSync('sales', async () => {
            const res = await OfflineSync.pullSales(tenantId);
            if (res) setSales(res);
          }, 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` },
        (payload: any) => {
          try {
            if (payload?.eventType === 'INSERT' || payload?.eventType === 'UPDATE') {
              const mapped = OnlineDB.mapProductFromRow(payload.new);
              if (mapped) {
                db.products.put({ ...mapped, tenantId });
                setProducts(prev => {
                  const idx = prev.findIndex(p => p.id === mapped.id);
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                  }
                  return [mapped, ...prev];
                });
                return;
              }
            } else if (payload?.eventType === 'DELETE') {
              const delId = payload.old?.id;
              if (delId) {
                db.products.delete(delId);
                setProducts(prev => prev.filter(p => p.id !== delId));
                return;
              }
            }
          } catch (e) {}
          debounceTableSync('products', async () => {
            const res = await OfflineSync.pullProducts(tenantId);
            if (res) setProducts(res);
          }, 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenantId}` },
        (payload: any) => {
          try {
            if (payload?.eventType === 'INSERT' || payload?.eventType === 'UPDATE') {
              const mapped = OnlineDB.mapTransactionFromRow(payload.new);
              if (mapped) {
                db.transactions.put({ ...mapped, tenantId });
                setTransactions(prev => {
                  const idx = prev.findIndex(t => t.id === mapped.id);
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = mapped;
                    return copy;
                  }
                  return [mapped, ...prev];
                });
                return;
              }
            } else if (payload?.eventType === 'DELETE') {
              const delId = payload.old?.id;
              if (delId) {
                db.transactions.delete(delId);
                setTransactions(prev => prev.filter(t => t.id !== delId));
                return;
              }
            }
          } catch (e) {}
          debounceTableSync('transactions', async () => {
            const res = await OfflineSync.pullTransactions(tenantId);
            if (res) setTransactions(res);
          }, 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` },
        () => debouncedLoad(500)
      )
      .subscribe();

    // 2. BroadcastChannel para sincronização instantânea de testes de hardware entre abas
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('os_hardware_test_sync');
      bc.onmessage = (event) => {
        const { token, diagnosticResults } = event.data || {};
        if (token && diagnosticResults) {
          setOrders(prev => prev.map(o => {
            if (o.trackingToken === token || o.id === token) {
              return {
                ...o,
                diagnosticTests: diagnosticResults
              };
            }
            return o;
          }));
          debounceTableSync('orders', async () => {
            const res = await OfflineSync.pullOrders(tenantId);
            if (res) setOrders(res);
          }, 300);
        }
      };
    }

    // 3. Sincronização de segurança em segundo plano:
    // O Supabase Realtime (WebSocket acima) já entrega todas as alterações instantaneamente com quase zero Egress.
    // Intervalo de segurança estendido para 10 minutos (ao invés de 8 segundos) para evitar estourar a cota de Egress.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        debouncedLoad(0);
      }
    }, 10 * 60 * 1000); // 10 minutos

    // Sincroniza ao voltar para a aba apenas se tiver passado mais de 5 minutos desde a última sincronização
    let lastActiveSync = Date.now();
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (Date.now() - lastActiveSync > 5 * 60 * 1000) {
          lastActiveSync = Date.now();
          debouncedLoad(0);
        }
      }
    };
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      clearTimeout(timeout);
      Object.values(tableDebounceTimers).forEach(t => clearTimeout(t));
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [session?.isLoggedIn, session?.tenantId, loadData]);

  useEffect(() => {
    if (!session?.isLoggedIn || session.type === 'super' || !session.tenantId) return;

    const deviceId = localStorage.getItem('device_id') || '';
    const maxUsers = session.maxUsers || 1;

    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      const res = await OnlineDB.heartbeatSession(session.tenantId!, deviceId, maxUsers);
      if (res && res.kicked) {
        handleLogout();
        alert("Sua sessão foi encerrada porque o limite de acessos simultâneos da loja foi atingido por outro dispositivo.");
      }
    }, 2 * 60 * 1000); // Heartbeat a cada 2 minutos

    return () => clearInterval(interval);
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // 1. SE O DISPOSITIVO ESTIVER OFFLINE, TENTA DIRETO A VALIDAÇÃO LOCAL
      if (!isDeviceOnline) {
        const offlineRes = await OfflineAuth.verifyOfflineLogin(loginForm.username, loginForm.password);
        if (offlineRes.success && offlineRes.session) {
          const offlineSession = {
            ...offlineRes.session,
            isLoggedIn: true,
            isOfflineMode: true
          };
          const offlineUser = offlineRes.user || {
            id: offlineRes.tenant?.id || 'temp',
            name: offlineRes.tenant?.name || offlineRes.tenant?.username || 'Administrador',
            role: offlineRes.type as any,
            photo: null
          };
          localStorage.setItem('session_pro', JSON.stringify(offlineSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(offlineUser));
          setSession({ ...offlineSession, user: offlineUser });
          setIsLoggingIn(false);
          return;
        } else {
          setLoginError(offlineRes.message || "Aparelho offline. Credenciais não encontradas no cache deste dispositivo.");
          setIsLoggingIn(false);
          return;
        }
      }

      // 2. SE ESTIVER ONLINE, CONECTA NO SUPABASE
      // 2.1 Verifica primeiro se as credenciais pertencem a um Revendedor cadastrado
      try {
        const resellerAuth = await ResellerService.authenticateReseller(loginForm.username, loginForm.password);
        if (resellerAuth.success && resellerAuth.reseller) {
          const resellerSession = {
            isLoggedIn: true,
            type: 'reseller' as const,
            reseller: resellerAuth.reseller
          };
          const resellerUser = {
            id: resellerAuth.reseller.id,
            name: resellerAuth.reseller.name,
            role: 'admin' as const,
            photo: null
          };
          localStorage.setItem('session_pro', JSON.stringify(resellerSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(resellerUser));
          localStorage.setItem('cached_current_reseller', JSON.stringify(resellerAuth.reseller));
          setSession(resellerSession as any);
          setIsLoggingIn(false);
          return;
        } else if (resellerAuth.message?.includes('Senha incorreta')) {
          setLoginError('Senha incorreta para a conta de revendedor.');
          setIsLoggingIn(false);
          return;
        } else if (resellerAuth.message?.includes('Acesso bloqueado')) {
          setLoginError(resellerAuth.message);
          setIsLoggingIn(false);
          return;
        }
      } catch (resellerErr) {
        console.warn('Verificação de revendedor ignorada:', resellerErr);
      }

      const result = await OnlineDB.login(loginForm.username, loginForm.password);
      
      if (result.success) {
        if (result.type === 'super') {
          const superSession = { isLoggedIn: true, type: 'super', isSuper: true };
          const superUser = { id: 'super', name: 'Super Admin', role: 'super' as const, photo: null };
          localStorage.setItem('session_pro', JSON.stringify(superSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(superUser));
          try {
            await OfflineAuth.saveOfflineAuth(
              loginForm.username,
              loginForm.password,
              'super',
              'super_tenant',
              { id: 'super_tenant', name: 'Super Admin' },
              superUser,
              superSession
            );
          } catch (cacheErr) {
            console.warn("Aviso ao salvar credenciais super offline:", cacheErr);
          }
          setSession(superSession as any);
        } else {
          const tenantId = result.tenant?.id;
          const maxUsers = result.tenant?.maxUsers || 1;
          const deviceId = localStorage.getItem('device_id') || '';
          
          try {
            const sessionRes = await OnlineDB.checkAndRegisterSession(tenantId, maxUsers, deviceId, loginForm.username);
            if (!sessionRes.success) {
              setLoginError(sessionRes.message);
              setIsLoggingIn(false);
              return;
            }
          } catch (sessErr) {
            console.warn("Aviso ao registrar sessão remota:", sessErr);
          }

          const newSession = { 
            isLoggedIn: true, 
            type: result.type as any, 
            tenantId: tenantId,
            isSuper: false,
            subscriptionStatus: result.tenant?.subscriptionStatus,
            subscriptionExpiresAt: result.tenant?.subscriptionExpiresAt,
            customMonthlyPrice: result.tenant?.customMonthlyPrice,
            customQuarterlyPrice: result.tenant?.customQuarterlyPrice,
            customYearlyPrice: result.tenant?.customYearlyPrice,
            lastPlanType: result.tenant?.lastPlanType,
            enabledFeatures: result.tenant?.enabledFeatures,
            maxUsers: result.tenant?.maxUsers,
            maxOS: result.tenant?.maxOS,
            maxProducts: result.tenant?.maxProducts,
            printerSize: result.tenant?.printerSize
          };

          const finalUser = { 
            id: result.tenant?.id || 'temp', 
            name: result.tenant?.name || result.tenant?.username || 'Administrador', 
            role: result.type as any, 
            photo: null 
          };

          localStorage.setItem('session_pro', JSON.stringify(newSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(finalUser));

          // SALVA CREDENCIAIS LOCALMENTE CRIPTOGRAFADAS PARA PERMITIR LOGIN OFFLINE FUTURO
          try {
            await OfflineAuth.saveOfflineAuth(
              loginForm.username,
              loginForm.password,
              result.type as any,
              tenantId,
              result.tenant,
              finalUser,
              newSession
            );
          } catch (cacheErr) {
            console.warn("Aviso ao salvar credenciais offline:", cacheErr);
          }

          setSession({ ...newSession, user: finalUser });

          try {
            const hasCompletedTour = tenantId ? localStorage.getItem('tour_completed_' + tenantId) === 'true' : false;
            const isFirstAccess = !hasCompletedTour && (
              localStorage.getItem('first_access_new_store') === 'true' || 
              (tenantId && localStorage.getItem('first_access_' + tenantId) === 'true')
            );
            if (isFirstAccess) {
              setActiveTab('config');
              setIsOnboardingOpen(true);
              localStorage.removeItem('first_access_new_store');
              if (tenantId) {
                localStorage.removeItem('first_access_' + tenantId);
                localStorage.setItem('tour_completed_' + tenantId, 'true');
              }
            } else {
              setIsOnboardingOpen(false);
            }
          } catch (firstErr) {}
        }
      } else {
        // Se a chamada de login falhou por erro temporário ou conexão, tenta validação offline
        const offlineRes = await OfflineAuth.verifyOfflineLogin(loginForm.username, loginForm.password);
        if (offlineRes.success && offlineRes.session) {
          const offlineSession = {
            ...offlineRes.session,
            isLoggedIn: true,
            isOfflineMode: true
          };
          const offlineUser = offlineRes.user || {
            id: offlineRes.tenant?.id || 'temp',
            name: offlineRes.tenant?.name || offlineRes.tenant?.username || 'Administrador',
            role: offlineRes.type as any,
            photo: null
          };
          localStorage.setItem('session_pro', JSON.stringify(offlineSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(offlineUser));
          setSession({ ...offlineSession, user: offlineUser });
        } else {
          setLoginError(result.message || "Acesso negado.");
        }
      }
    } catch (err) {
      // Erro inesperado ou falta total de conexão
      try {
        const offlineRes = await OfflineAuth.verifyOfflineLogin(loginForm.username, loginForm.password);
        if (offlineRes.success && offlineRes.session) {
          const offlineSession = {
            ...offlineRes.session,
            isLoggedIn: true,
            isOfflineMode: true
          };
          const offlineUser = offlineRes.user || {
            id: offlineRes.tenant?.id || 'temp',
            name: offlineRes.tenant?.name || offlineRes.tenant?.username || 'Administrador',
            role: offlineRes.type as any,
            photo: null
          };
          localStorage.setItem('session_pro', JSON.stringify(offlineSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(offlineUser));
          setSession({ ...offlineSession, user: offlineUser });
        } else {
          setLoginError("Erro de conexão. Para entrar offline, use uma conta já acessada neste aparelho.");
        }
      } catch (fallbackErr) {
        setLoginError("Erro de rede. Verifique sua conexão.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginAs = async (tenantId: string) => {
    const tenant = await OnlineDB.getTenantById(tenantId);
    if (tenant) {
      const isFromReseller = session?.type === 'reseller' || !!session?.reseller;
      const currentReseller = session?.reseller || (isFromReseller && localStorage.getItem('cached_current_reseller') ? JSON.parse(localStorage.getItem('cached_current_reseller')!) : undefined);

      const newSession = {
        isLoggedIn: true,
        type: 'admin' as const,
        tenantId: tenant.id,
        isSuper: false,
        reseller: currentReseller,
        impersonatedBySuper: !currentReseller,
        impersonatedByReseller: !!currentReseller,
        subscriptionStatus: tenant.subscription_status,
        subscriptionExpiresAt: tenant.subscription_expires_at,
        customMonthlyPrice: tenant.custom_monthly_price,
        customQuarterlyPrice: tenant.custom_quarterly_price,
        customYearlyPrice: tenant.custom_yearly_price,
        lastPlanType: tenant.last_plan_type,
        enabledFeatures: tenant.enabled_features,
        maxUsers: tenant.max_users,
        maxOS: tenant.tenant_limits?.max_os,
        maxProducts: tenant.tenant_limits?.max_products,
        printerSize: tenant.printer_size || 58,
      };
      const finalUser = {
        id: tenant.users?.find((u: any) => u.role === 'admin')?.id || 'admin',
        name: tenant.users?.find((u: any) => u.role === 'admin')?.name || 'Admin',
        role: 'admin' as const,
        photo: null,
      };
      localStorage.setItem('session_pro', JSON.stringify(newSession));
      localStorage.setItem('currentUser_pro', JSON.stringify(finalUser));
      setSession({ ...newSession, user: finalUser });
    }
  };

  // Retorna diretamente para o painel Super ADM ou Painel do Revendedor
  const returnToSuperAdmin = () => {
    const cachedReseller = session?.reseller || (localStorage.getItem('cached_current_reseller') ? JSON.parse(localStorage.getItem('cached_current_reseller')!) : null);
    if ((session as any)?.impersonatedByReseller && cachedReseller) {
      const resellerSession = { isLoggedIn: true, type: 'reseller' as const, reseller: cachedReseller };
      const resellerUser = { id: cachedReseller.id, name: cachedReseller.name, role: 'admin' as const, photo: null };
      localStorage.setItem('session_pro', JSON.stringify(resellerSession));
      localStorage.setItem('currentUser_pro', JSON.stringify(resellerUser));
      setSession(resellerSession as any);
      setSettings(null);
      setOrders([]);
      setCustomers([]);
      setPrefilledCustomerForOS(null);
      setProducts([]);
      setSales([]);
      setActiveTab('vendas');
      setIsLogoutModalOpen(false);
      setLogoutPassword('');
      setLogoutError(false);
      return;
    }

    const superSession = { isLoggedIn: true, type: 'super' as const, isSuper: true };
    const superUser = { id: 'super', name: 'Super Admin', role: 'super' as const, photo: null };
    localStorage.setItem('session_pro', JSON.stringify(superSession));
    localStorage.setItem('currentUser_pro', JSON.stringify(superUser));
    setSession(superSession as any);
    setSettings(null);
    setOrders([]);
    setCustomers([]);
    setPrefilledCustomerForOS(null);
    setProducts([]);
    setSales([]);
    setActiveTab('vendas');
    setIsLogoutModalOpen(false);
    setLogoutPassword('');
    setLogoutError(false);
  };

  const handleLogout = async () => {
    if (session?.tenantId) {
      const deviceId = localStorage.getItem('device_id') || '';
      await OnlineDB.removeSession(session.tenantId, deviceId);
    }
    localStorage.removeItem('session_pro');
    localStorage.removeItem('currentUser_pro');
    setSession(null);
    setSettings(null);
    setOrders([]);
    setCustomers([]);
    setPrefilledCustomerForOS(null);
    setProducts([]);
    setSales([]);
    setActiveTab('vendas');
    setIsLogoutModalOpen(false);
    setLogoutPassword('');
    setLogoutError(false);
  };

  const confirmLogout = async () => {
    if (!session?.tenantId) return handleLogout();

    // Se estiver em modo Super ADM e clicar sem digitar senha (campo vazio), retorna direto ao Super ADM
    if (session.impersonatedBySuper && !logoutPassword.trim()) {
      returnToSuperAdmin();
      return;
    }

    setIsVerifyingLogout(true);
    setLogoutError(false);
    
    // Valida contra a senha do admin da loja OU com a senha do Super Admin (chave mestra)
    const result = await OnlineDB.verifyAdminPassword(session.tenantId, logoutPassword);
    if (result.success) {
      // Se autenticado e veio do Super Admin ou usou a senha do Super Admin, volta ao painel Super ADM
      if (session.impersonatedBySuper || (result as any).isSuperAdmin) {
        returnToSuperAdmin();
      } else {
        handleLogout();
      }
    } else {
      setLogoutError(true);
      setLogoutPassword('');
      setTimeout(() => setLogoutError(false), 2000);
    }
    setIsVerifyingLogout(false);
  };

  const renderLogoutModal = () => {
    if (!isLogoutModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 border border-slate-100">
          <div className={`w-16 h-16 ${session?.impersonatedBySuper ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'} rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner`}>
            {session?.impersonatedBySuper ? <ShieldCheck size={32} /> : <LogOut size={32} />}
          </div>
          <h3 className="text-center font-black text-slate-800 uppercase text-sm mb-1">
            Confirmar Saída
          </h3>
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-tight">
            Digite sua senha ADM
          </p>

          {session?.impersonatedBySuper && (
            <div className="mb-6 space-y-2.5">
              <button 
                type="button" 
                onClick={returnToSuperAdmin} 
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-xl shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Voltar ao Painel Super ADM</span>
              </button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[8px] font-black uppercase text-slate-400">ou digite sua senha adm</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            </div>
          )}
          
          <div className={`flex items-center gap-3 bg-slate-50 border rounded-2xl px-5 py-4 mb-3 transition-all ${logoutError ? 'border-red-500 bg-red-50 ring-4 ring-red-100' : 'border-slate-100 focus-within:border-blue-500'}`}>
            <KeyRound size={20} className={logoutError ? 'text-red-500' : 'text-slate-300'} />
            <input 
              type="password" 
              autoFocus={!session?.impersonatedBySuper}
              value={logoutPassword}
              onChange={(e) => setLogoutPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmLogout()}
              placeholder="DIGITE SUA SENHA ADM"
              className="bg-transparent w-full outline-none font-black text-xs uppercase placeholder:text-slate-300"
            />
          </div>
          
          {logoutError && <p className="text-center text-[9px] font-black text-red-500 uppercase mb-3 animate-bounce">Senha Incorreta!</p>}

          <div className="flex flex-col gap-2">
            <button 
              onClick={confirmLogout} 
              disabled={isVerifyingLogout} 
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isVerifyingLogout ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Saída'}
            </button>
            {session?.impersonatedBySuper && (
              <button 
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 text-slate-400 hover:text-red-600 font-bold uppercase text-[9px] tracking-wider transition-colors cursor-pointer"
              >
                Deslogar Totalmente (Ir para Tela de Login)
              </button>
            )}
            <button 
              onClick={() => { setIsLogoutModalOpen(false); setLogoutPassword(''); setLogoutError(false); }} 
              className="w-full py-2 text-slate-400 font-black uppercase text-[9px] tracking-widest cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const saveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (session?.tenantId) {
      await OfflineSync.saveSettings(session.tenantId, newSettings);
    }
  };

  const saveOrders = async (newOrders: ServiceOrder[]) => {
    const prevOrders = orders;
    setOrders(newOrders);
    if (session?.tenantId) {
      const changed = getChangedOrders(prevOrders, newOrders);
      if (changed.length > 0) {
        // Envia para o Supabase / fila offline APENAS as ordens que realmente foram alteradas ou criadas
        await OfflineSync.saveOrdersBatch(session.tenantId, newOrders, changed);
      } else {
        // Se nenhuma OS mudou, apenas mantém atualizado localmente sem gerar requisição de rede
        await db.orders.bulkPut(newOrders.map(o => ({ ...o, tenantId: session.tenantId })));
      }
    }
  };

  const saveCustomer = async (customer: Customer) => {
    const exists = customers.some(c => c.id === customer.id);
    const updated = exists 
      ? customers.map(c => c.id === customer.id ? customer : c)
      : [customer, ...customers];
    setCustomers(updated);
    if (session?.tenantId) {
      await OfflineSync.saveCustomer(session.tenantId, customer);
    }
  };

  const saveCustomers = async (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    if (session?.tenantId) {
      await OfflineSync.saveCustomers(session.tenantId, newCustomers);
    }
  };

  const removeCustomer = async (id: string) => {
    if (!session?.tenantId) return;
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    await OfflineSync.deleteCustomer(session.tenantId, id);
  };

  const removeOrder = async (id: string) => {
    if (session?.tenantId) {
      const updated = orders.map(o => o.id === id ? { ...o, isDeleted: true } : o);
      setOrders(updated);
      await OfflineSync.deleteOrder(session.tenantId, id);
    }
  };

  const saveProducts = async (newProducts: Product[]) => {
    const prevProducts = products;
    setProducts(newProducts);
    if (session?.tenantId) {
      try {
        const fiscalCache: Record<string, any> = {};
        newProducts.forEach(p => {
          if (p.taxProfileId || p.csosnCst) {
            fiscalCache[p.id] = {
              taxProfileId: p.taxProfileId,
              taxProfileName: p.taxProfileName,
              csosnCst: p.csosnCst,
              origin: p.origin,
              cstPis: p.cstPis,
              cstCofins: p.cstCofins,
              crtCode: p.crtCode,
              cfop: p.cfop,
              ncm: p.ncm,
              cest: p.cest,
              icmsAliquota: p.icmsAliquota,
              pisAliquota: p.pisAliquota,
              cofinsAliquota: p.cofinsAliquota
            };
          }
        });
        if (Object.keys(fiscalCache).length > 0) {
          const prevCache = localStorage.getItem(`products_fiscal_cache_${session.tenantId}`);
          const merged = prevCache ? { ...JSON.parse(prevCache), ...fiscalCache } : fiscalCache;
          localStorage.setItem(`products_fiscal_cache_${session.tenantId}`, JSON.stringify(merged));
        }
      } catch {}

      const prevMap = new Map(prevProducts.map(p => [p.id, p]));
      const changed = newProducts.filter(newP => {
        const oldP = prevMap.get(newP.id);
        if (!oldP) return true;
        return JSON.stringify(newP) !== JSON.stringify(oldP);
      });
      await OfflineSync.saveProductsBatch(session.tenantId, newProducts, changed.length > 0 ? changed : undefined);
    }
  };

  const removeProduct = async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    if (session?.tenantId) {
      await OfflineSync.deleteProduct(session.tenantId, id);
    }
  };

  const saveSales = async (newSales: Sale[]) => {
    const prevSales = sales;
    setSales(newSales);
    if (session?.tenantId) {
      const prevMap = new Map(prevSales.map(s => [s.id, s]));
      const changed = newSales.filter(newS => {
        const oldS = prevMap.get(newS.id);
        if (!oldS) return true;
        return JSON.stringify(newS) !== JSON.stringify(oldS);
      });
      await OfflineSync.saveSalesBatch(session.tenantId, newSales, changed.length > 0 ? changed : undefined);
    }
  };

  const removeSale = async (sale: Sale) => {
    if (!session?.tenantId) return;
    const updatedSales = sales.map(s => s.id === sale.id ? { ...s, isDeleted: true } : s);
    setSales(updatedSales);
    const updatedProducts = products.map(p => {
      if (p.id === sale.productId) {
        return { ...p, quantity: p.quantity + sale.quantity };
      }
      return p;
    });
    setProducts(updatedProducts);
    
    await Promise.all([
      OfflineSync.deleteSale(session.tenantId, sale.id),
      OnlineDB.cancelCommission(sale.id, 'sale'),
      ...updatedProducts.map(p => OfflineSync.saveProduct(session.tenantId!, p))
    ]);
  };

  const saveTransactions = async (newTransactions: Transaction[]) => {
    const prevTransactions = transactions;
    setTransactions(newTransactions);
    if (session?.tenantId) {
      const prevMap = new Map(prevTransactions.map(t => [t.id, t]));
      const changed = newTransactions.filter(newT => {
        const oldT = prevMap.get(newT.id);
        if (!oldT) return true;
        return JSON.stringify(newT) !== JSON.stringify(oldT);
      });
      await OfflineSync.saveTransactionsBatch(session.tenantId, newTransactions, changed.length > 0 ? changed : undefined);
    }
  };

  const removeTransaction = async (id: string) => {
    if (!session?.tenantId) return;
    const updated = transactions.map(t => t.id === id ? { ...t, isDeleted: true } : t);
    setTransactions(updated);
    await OfflineSync.deleteTransaction(session.tenantId, id);
  };

  const handleSwitchProfile = (user: User) => {
    if (session) {
      const newType = user.role;
      const newSession = { ...session, user, type: newType };
      setSession(newSession);
      localStorage.setItem('currentUser_pro', JSON.stringify(user));
      localStorage.setItem('session_pro', JSON.stringify({ ...newSession, user: undefined })); // Persist session type
      const allowedTabs = navItems.filter(item => item.roles.includes(newType)).map(i => i.id);
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('vendas');
      }
    }
  };

  // Teste de hardware de celular (acesso externo via QR Code ou link direto)
  if (hardwareTestToken) {
    return <DeviceHardwareTestPage osIdOrToken={hardwareTestToken} />;
  }

  // Acompanhamento público de O.S. (acesso externo cliente)
  if (publicTrackingToken) {
    return <PublicTrackingPage token={publicTrackingToken} />;
  }

  if (catalogTenantId || catalogSlug) {
    return <CustomerCatalog tenantId={catalogTenantId} catalogSlug={catalogSlug} deferredPrompt={deferredPrompt} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Iniciando Sistema...</p>
      </div>
    );
  }

  if (!session?.isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex font-sans">
        {/* LADO ESQUERDO - VISUAL (Desktop) */}
        <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
          {/* Imagem de Fundo com Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://picsum.photos/seed/retail_store/1920/1080" 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
              alt="Store Background"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40"></div>
          </div>

          {/* Conteúdo de Marketing */}
          <div className="relative z-10 animate-in slide-in-from-left-10 duration-700">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Smartphone className="text-white" size={24} />
              </div>
              <span className="font-black text-2xl tracking-tighter uppercase">Lojas Cloud</span>
            </div>
            
            <h1 className="text-5xl font-black tracking-tight leading-tight mb-6">
              Gerencie sua loja <br/>
              <span className="text-blue-500">como um gigante.</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-md leading-relaxed font-medium">
              Controle total de estoque, vendas, ordens de serviço e financeiro. Tudo em um só lugar, acessível de qualquer dispositivo.
            </p>
          </div>

          {/* Grid de Recursos */}
          <div className="relative z-10 grid grid-cols-2 gap-4 mt-12 animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group cursor-default">
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Package className="text-blue-400" size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">Controle de Estoque</h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Rastreie produtos e evite perdas</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group cursor-default">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="text-emerald-400" size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">PDV Rápido</h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Vendas ágeis e integradas</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group cursor-default">
              <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-purple-400" size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">Relatórios Financeiros</h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Visão clara do seu lucro</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group cursor-default">
              <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Smartphone className="text-orange-400" size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">Acesso Mobile</h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Gerencie de onde estiver</p>
            </div>
          </div>

          {/* Rodapé Visual */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-12">
            <div className="flex gap-4">
              <span>© 2024 Lojas Cloud</span>
              <span>Termos de Uso</span>
              <span>Privacidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-emerald-500">Sistema Online</span>
            </div>
          </div>
        </div>

        {/* LADO DIREITO - FORMULÁRIO (Login/Registro) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 lg:p-12 bg-white relative min-h-screen overflow-y-auto">
          {/* Background Pattern (Mobile) */}
          <div className="absolute inset-0 lg:hidden z-0 opacity-5 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>

          <div className="w-full max-w-md mx-auto space-y-4 lg:space-y-8 animate-in slide-in-from-right-10 duration-700 relative z-10 py-4 lg:py-0">
            {/* Cabeçalho Mobile */}
            <div className="lg:hidden text-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 mb-3 rotate-3">
                <Smartphone className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Lojas Cloud</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão completa para o seu negócio</p>
            </div>

            {/* Título do Formulário */}
            <div className="space-y-1 lg:space-y-2 text-center lg:text-left">
              <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {isRegisterMode ? 'Crie sua conta grátis' : 'Bem-vindo'}
              </h2>
              <p className="text-xs lg:text-base text-slate-500 font-medium">
                {isRegisterMode ? 'Comece seus 7 dias de teste agora mesmo.' : 'Digite suas credenciais para acessar o painel.'}
              </p>
              {!isRegisterMode && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold border border-blue-200/70">
                  <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                  <span>Login unificado: Lojistas, Colaboradores e Revendedores</span>
                </div>
              )}
            </div>

            {/* Formulários */}
            {isRegisterMode ? (
              <form onSubmit={handleRegister} className="space-y-3 lg:space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Loja</label>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                      type="text" 
                      value={registerForm.storeName} 
                      onChange={e => setRegisterForm({...registerForm, storeName: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs placeholder:text-slate-300" 
                      placeholder="Ex: Tech Cell" 
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário Administrador</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                      type="text" 
                      value={registerForm.username} 
                      onChange={e => setRegisterForm({...registerForm, username: e.target.value.toLowerCase()})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs placeholder:text-slate-300" 
                      placeholder="seu.usuario" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                      type="password" 
                      value={registerForm.password} 
                      onChange={e => setRegisterForm({...registerForm, password: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs placeholder:text-slate-300" 
                      placeholder="••••••" 
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="flex items-center gap-3 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{loginError}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isRegistering} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isRegistering ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                      <span>Criar Minha Loja</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span></div>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setIsRegisterMode(false); setLoginError(null); }} 
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border border-slate-100"
                >
                  Já tenho uma conta
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 lg:space-y-5">
                {!isOnline && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 animate-in fade-in space-y-2">
                    <div className="flex items-center gap-2">
                      <WifiOff size={16} className="text-amber-600 shrink-0" />
                      <div className="text-[10px] font-bold leading-tight">
                        <p className="uppercase tracking-wider font-black text-amber-700">Modo Offline Ativo</p>
                        <p className="text-amber-600 font-normal mt-0.5">Você pode entrar normalmente com uma conta já autenticada neste aparelho.</p>
                      </div>
                    </div>
                    {availableOfflineUsers.length > 0 ? (
                      <div className="pt-1 border-t border-amber-500/20">
                        <p className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Contas salvas neste dispositivo:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {availableOfflineUsers.map(u => (
                            <button
                              key={u.username}
                              type="button"
                              onClick={() => setLoginForm(prev => ({ ...prev, username: u.username }))}
                              className="px-2.5 py-1 bg-amber-100/80 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold border border-amber-300 transition-all flex items-center gap-1 active:scale-95"
                              title="Clique para preencher o usuário"
                            >
                              <span>{u.name || u.username}</span>
                              <span className="text-[8px] opacity-60 font-mono">({u.username})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-amber-500/20 text-[9px] text-amber-700 leading-normal">
                        Nenhuma conta foi autenticada previamente neste navegador. Conecte-se à internet uma vez para sincronizar as credenciais locais.
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / Login</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                      type="text" 
                      autoFocus 
                      value={loginForm.username} 
                      onChange={e => setLoginForm({...loginForm, username: e.target.value.toLowerCase()})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs placeholder:text-slate-300" 
                      placeholder="seu.usuario" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                      type="password" 
                      value={loginForm.password} 
                      onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs placeholder:text-slate-300" 
                      placeholder="••••••" 
                    />
                  </div>
                </div>

                {loginError && (
                  <div className={`flex items-center gap-3 ${loginError.includes('sucesso') ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-500 bg-red-50 border-red-100'} p-3 rounded-xl border animate-in slide-in-from-top-2`}>
                    <div className={`w-6 h-6 ${loginError.includes('sucesso') ? 'bg-emerald-100' : 'bg-red-100'} rounded-full flex items-center justify-center shrink-0`}>
                      <ShieldCheck size={14} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{loginError}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoggingIn} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {isLoggingIn ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                      <span>Acessar Sistema</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span></div>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setIsRegisterMode(true); setLoginError(null); }} 
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border border-slate-100 cursor-pointer"
                >
                  Criar nova loja grátis
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (session.type === 'super') return <SuperAdminDashboard onLogout={handleLogout} onLoginAs={handleLoginAs} />;

  if (session.type === 'reseller' && session.reseller) {
    return (
      <ResellerDashboard
        reseller={session.reseller}
        onLogout={handleLogout}
        onLoginAs={handleLoginAs}
      />
    );
  }

  if (session.subscriptionStatus === 'expired' || isSubscriptionModalOpen) {
    return (
      <>
        <SubscriptionView 
          tenantId={session.tenantId!} 
          storeName={settings?.storeName || 'Sua Loja'} 
          expiresAt={session.subscriptionExpiresAt!}
          customMonthlyPrice={session.customMonthlyPrice}
          customQuarterlyPrice={session.customQuarterlyPrice}
          customYearlyPrice={session.customYearlyPrice}
          onLogout={() => setIsLogoutModalOpen(true)}
          onClose={session.subscriptionStatus !== 'expired' ? () => setIsSubscriptionModalOpen(false) : undefined}
          isTrial={session.subscriptionStatus === 'trial'}
          onSuccess={(newExpiresAt) => {
            const updatedSession = { ...session, subscriptionStatus: 'active', subscriptionExpiresAt: newExpiresAt };
            setSession(updatedSession);
            localStorage.setItem('session_pro', JSON.stringify(updatedSession));
            setIsSubscriptionModalOpen(false);
          }}
        />
        {renderLogoutModal()}
      </>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs">Sincronizando Dados</p>
        <button onClick={() => setIsLogoutModalOpen(true)} className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-10 cursor-pointer">Sair</button>
        {renderLogoutModal()}
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Permitir início do gesto até 180px da borda esquerda para contornar o gesto nativo de 'voltar' da borda infinita
    if (touch.clientX < 180) {
      setTouchStartX(touch.clientX);
      setTouchStartY(touch.clientY);
    } else {
      setTouchStartX(null);
      setTouchStartY(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = Math.abs(touch.clientY - touchStartY);
    
    // Se arrastou para a direita mais de 35px e o movimento é predominantemente horizontal
    if (diffX > 35 && diffX > diffY * 0.8) {
      setIsSidebarOpen(true);
      setTouchStartX(null);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <aside className={`${isFullscreen ? 'hidden' : 'hidden md:flex'} flex-col ${isSidebarCollapsed ? 'w-0 p-0 border-none opacity-0 pointer-events-none overflow-hidden' : 'w-72 p-6 opacity-100 overflow-y-auto'} bg-slate-900 text-white h-[100dvh] sticky top-0 transition-all duration-300 ease-in-out hide-scrollbar [&::-webkit-scrollbar]:hidden`}>
        <div className="flex items-center justify-between mb-12 min-w-[240px]">
          <div className="flex items-center gap-4 overflow-hidden animate-in fade-in">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover rounded-xl" /> : <Smartphone size={20} />}
            </div>
            <h1 className="text-sm font-black tracking-tighter uppercase leading-tight truncate">{settings.storeName}</h1>
          </div>
          <button onClick={() => setIsSidebarCollapsed(true)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        <nav id="tour-sidebar-nav" className="flex-1 space-y-2 min-w-[240px]">
          {visibleNavItems.map((item, idx) => (
            <button key={`nav-desktop-${item.id}-${idx}`} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={20} className="shrink-0" />
              <span className="animate-in fade-in whitespace-nowrap">{item.label}</span>
            </button>
          ))}

          <div className="pt-3 space-y-2">
            <button 
              type="button" 
              onClick={() => setIsInstallModalOpen(true)}
              className="w-full flex items-center gap-3.5 px-4 py-3 bg-gradient-to-r from-blue-600/30 to-indigo-600/20 hover:from-blue-600 hover:to-indigo-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-transparent rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 group shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 group-hover:bg-white group-hover:text-blue-600 transition-all">
                <Download size={16} />
              </div>
              <div className="text-left min-w-0 flex-1">
                <span className="block truncate">Instalar no PC/Celular</span>
                <span className="text-[8px] text-blue-400 group-hover:text-blue-100 font-bold block uppercase tracking-normal">Acesso 1 Clique</span>
              </div>
            </button>
          </div>
        </nav>
        <div className="mt-auto pt-4 border-t border-white/5 min-w-[240px]">
          {session?.subscriptionStatus === 'trial' && (
            <div className="mb-4 p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Plano de Teste
                </span>
              </div>
              <p className="text-[9px] text-slate-300 leading-tight mb-2.5">
                Aproveite todos os recursos. Assine agora para não perder o acesso!
              </p>
              <button
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Assinar um Plano</span>
                <ArrowRight size={11} />
              </button>
            </div>
          )}
          <div className="px-2 mb-4">
            <ConnectionStatusTag className="w-full justify-center py-2" />
          </div>
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden border border-white/10 shrink-0">
              {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600 font-black text-xs">?</div>}
            </div>
            <div className="min-w-0 animate-in fade-in">
              <p className="text-[9px] font-black uppercase text-white truncate">{currentUser.name}</p>
              <p className="text-[7px] font-bold uppercase text-slate-500 truncate">{currentUser.specialty || (currentUser.role === 'admin' ? 'Administrador' : 'Colaborador')}</p>
            </div>
          </div>
          {session?.impersonatedBySuper && (
            <button 
              type="button"
              onClick={returnToSuperAdmin} 
              className="w-full flex items-center gap-3 px-4 py-3 mb-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600 hover:to-indigo-600 text-purple-200 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all border border-purple-500/30 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft size={16} className="shrink-0" />
              <span className="animate-in fade-in truncate">Voltar ao Super ADM</span>
            </button>
          )}
          <button onClick={() => setIsLogoutModalOpen(true)} className="w-full flex items-center gap-4 px-6 py-4 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer">
            <LogOut size={20} className="shrink-0" />
            <span className="animate-in fade-in">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        {/* Barra superior permanente de modo Super Administrador */}
        {session?.impersonatedBySuper && !isFullscreen && (
          <div className="w-full bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white px-3 sm:px-5 py-2.5 shadow-lg flex items-center justify-between shrink-0 z-30 border-b border-purple-500/40 animate-in slide-in-from-top">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <span className="px-2 py-0.5 rounded-md bg-purple-800/80 text-purple-200 font-black text-[9px] uppercase tracking-wider shrink-0 border border-purple-600/50">
                  Super ADM
                </span>
                <span className="text-[11px] text-white font-bold truncate">
                  Loja: <span className="text-purple-300 font-extrabold">{settings.storeName}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={returnToSuperAdmin}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 sm:px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 border border-purple-400/40 cursor-pointer"
                title="Sair desta loja e voltar para o Painel Super ADM"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Voltar ao</span> <span>Super ADM</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Top Header */}
        {!isFullscreen && (
          <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 px-3 py-2 shrink-0 z-20 shadow-sm gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                id="tour-mobile-header-menu"
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all overflow-hidden border-2 border-white ring-2 ring-blue-500/30 cursor-pointer shrink-0"
                title="Toque na foto para abrir o menu lateral"
              >
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} className="w-full h-full object-cover rounded-lg" alt={settings.storeName} />
                ) : (
                  <Smartphone size={18} />
                )}
              </button>
              <div 
                onClick={() => setIsSidebarOpen(true)} 
                className="cursor-pointer flex flex-col justify-center select-none min-w-0"
              >
                <span className="font-black text-xs uppercase tracking-tight text-slate-900 truncate max-w-[140px] leading-tight">
                  {settings.storeName}
                </span>
                <span className="text-[9px] font-bold text-blue-600 tracking-wider flex items-center gap-0.5 leading-tight mt-0.5">
                  Abrir Menu ▾
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {session?.impersonatedBySuper && (
                <button
                  type="button"
                  onClick={returnToSuperAdmin}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer border border-purple-400/40"
                  title="Voltar ao Painel Super ADM"
                >
                  <ArrowLeft size={11} />
                  <span>Super ADM</span>
                </button>
              )}
              <button
                id="tour-mobile-install-btn"
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
                title="Instalar App no celular"
              >
                <Download size={10} />
                <span>Instalar</span>
              </button>
              {session?.subscriptionStatus === 'trial' && (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-1"
                  title="Plano de Teste - Clique para assinar"
                >
                  <Sparkles size={10} className="text-amber-600 animate-pulse" />
                  <span>Assinar</span>
                </button>
              )}
              <ConnectionStatusTag />
            </div>
          </div>
        )}

        {/* Desktop Top Header (Barra Superior de Status) */}
        {!isFullscreen && (
          <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shrink-0 z-10">
            <div className="flex items-center gap-3">
              {isSidebarCollapsed && (
                <button 
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Expandir menu lateral"
                >
                  <Menu size={18} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="tour-header-install"
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
                title="Instalar o aplicativo no PC ou Celular"
              >
                <Download size={13} />
                <span>Instalar App</span>
              </button>

              {session?.subscriptionStatus === 'trial' && (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
                  title="Sua loja está em plano de teste gratuito. Clique para assinar."
                >
                  <Sparkles size={12} className="text-amber-600 animate-pulse" />
                  <span>Plano de Teste</span>
                  <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black">Assinar</span>
                </button>
              )}
              <ConnectionStatusTag />
            </div>
          </div>
        )}

        {/* Banner de Plano de Teste (Trial) com Botão para Assinar */}
        {!isFullscreen && (
          <TrialBanner 
            subscriptionStatus={session?.subscriptionStatus}
            subscriptionExpiresAt={session?.subscriptionExpiresAt}
            onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {/* Alerta de Banco SQL Offline / Modo Offline */}
        {!isFullscreen && (
          <DatabaseOfflineBanner 
            tenantId={session?.tenantId} 
            onRefreshData={() => session?.tenantId && loadData(session.tenantId)} 
          />
        )}

        {/* Alça Lateral Ergonômica para Celulares com Borda Infinita / Gestos */}
        {!isFullscreen && (
          <div 
            onClick={() => setIsSidebarOpen(true)}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(true);
            }}
            className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 cursor-pointer group select-none py-2 pr-2"
            title="Deslize ou toque para abrir o menu"
          >
            <div className="w-2.5 h-16 bg-blue-600/70 hover:bg-blue-600 active:bg-blue-700 rounded-r-xl shadow-md shadow-blue-600/30 flex items-center justify-center transition-all">
              <div className="w-0.5 h-6 bg-white/90 rounded-full"></div>
            </div>
          </div>
        )}

        <div 
          id="app-main-scroll-container" 
          className={`flex-1 max-w-none mx-auto w-full animate-in fade-in duration-700 hide-scrollbar [&::-webkit-scrollbar]:hidden ${
            isFullscreen
              ? 'p-0 overflow-hidden w-full h-full flex flex-col min-h-0'
              : activeTab === 'vendas'
              ? 'overflow-y-auto p-3 pb-28 lg:overflow-hidden lg:p-2 lg:h-full lg:flex lg:flex-col lg:min-h-0'
              : `overflow-y-auto p-4 pt-4 pb-6 md:pt-6 md:pb-4 ${isSidebarCollapsed ? 'md:pl-6' : 'md:pl-6'}`
          }`}
        >
          {activeTab === 'os' && (
            <ServiceOrderTab 
              orders={orders} 
              setOrders={saveOrders} 
              settings={settings} 
              onUpdateSettings={saveSettings} 
              onDeleteOrder={removeOrder} 
              tenantId={session.tenantId || ''} 
              maxOS={session.maxOS} 
              currentUser={currentUser}
              customers={customers}
              onSaveCustomer={saveCustomer}
              onSaveCustomers={saveCustomers}
              prefilledCustomer={prefilledCustomerForOS}
              onClearPrefilledCustomer={() => setPrefilledCustomerForOS(null)}
              enabledFeatures={session?.enabledFeatures}
            />
          )}
          {activeTab === 'clientes' && (session?.enabledFeatures?.customersTab !== false) && (
            <CustomersTab 
              customers={customers}
              orders={orders}
              settings={settings}
              currentUser={currentUser}
              tenantId={session.tenantId || ''}
              onSaveCustomer={saveCustomer}
              onSaveCustomers={saveCustomers}
              onDeleteCustomer={removeCustomer}
              onUpdateSettings={saveSettings}
              onNavigateToNewOS={(customer) => {
                setPrefilledCustomerForOS(customer);
                setActiveTab('os');
              }}
              onViewOrder={() => {
                setActiveTab('os');
              }}
            />
          )}
          {activeTab === 'estoque' && (
            <StockTab 
              products={products} 
              setProducts={saveProducts} 
              onDeleteProduct={removeProduct} 
              settings={settings} 
              onUpdateSettings={saveSettings} 
              maxProducts={session.maxProducts} 
              tenantId={session.tenantId || ''} 
              aiEnabled={!isAiGloballyDisabled && session.enabledFeatures?.aiFeature !== false}
              enabledFeatures={session.enabledFeatures}
            />
          )}
          {activeTab === 'vendas' && <SalesTab products={products} setProducts={saveProducts} sales={sales.filter(s => !s.isDeleted)} setSales={saveSales} settings={settings} onUpdateSettings={saveSettings} currentUser={currentUser} onDeleteSale={removeSale} tenantId={session.tenantId || ''} enabledFeatures={session?.enabledFeatures} />}
          {activeTab === 'fiscal' && (
            <FiscalTab
              settings={settings}
              setSettings={saveSettings}
              sales={sales.filter(s => !s.isDeleted)}
              products={products}
              setProducts={saveProducts}
              customers={customers}
              serviceOrders={orders.filter(o => !o.isDeleted)}
              tenantId={session.tenantId || ''}
            />
          )}
          {activeTab === 'financeiro' && <FinanceTab orders={orders} sales={sales} products={products} transactions={transactions} setTransactions={saveTransactions} setOrders={saveOrders} onDeleteTransaction={removeTransaction} onDeleteSale={removeSale} tenantId={session.tenantId || ''} settings={settings} enabledFeatures={session.enabledFeatures} />}
          {activeTab === 'team' && (
            <EmployeeManagementTab 
              tenantId={session.tenantId || ''} 
              sales={sales.filter(s => !s.isDeleted)} 
              serviceOrders={orders.filter(o => !o.isDeleted)} 
              products={products}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'ferramentas' && <ToolsTab settings={settings} currentUser={currentUser} tenantId={session.tenantId || ''} />}
          {activeTab === 'config' && (
            <SettingsTab 
              products={products} 
              setProducts={saveProducts} 
              settings={settings} 
              setSettings={saveSettings} 
              serviceOrders={orders}
              customers={customers}
              sales={sales}
              isCloudConnected={isCloudConnected} 
              currentUser={currentUser} 
              onSwitchProfile={handleSwitchProfile} 
              tenantId={session.tenantId} 
              deferredPrompt={deferredPrompt} 
              onInstallApp={handleInstallApp} 
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              subscriptionStatus={session.subscriptionStatus} 
              subscriptionExpiresAt={session.subscriptionExpiresAt} 
              lastPlanType={session.lastPlanType} 
              enabledFeatures={session.enabledFeatures} 
              maxUsers={session.maxUsers} 
              maxOS={session.maxOS} 
              maxProducts={session.maxProducts} 
              onLogout={() => setIsLogoutModalOpen(true)} 
              onOpenSubscription={() => setIsSubscriptionModalOpen(true)} 
            />
          )}
        </div>
      </main>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-transparent z-50 flex justify-start md:hidden">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px]" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="relative w-[78vw] max-w-[260px] h-full bg-slate-50 text-slate-900 p-4 sm:p-5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 border-r border-slate-200/90 rounded-r-3xl overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navegação</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 rounded-full active:scale-90 shadow-xs">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl mb-4 border border-slate-200/80 shadow-xs shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0 overflow-hidden">
                {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" /> : <Smartphone size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{settings.storeName}</h3>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">
                  {currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </p>
              </div>
            </div>

            <div className="mb-3 px-1">
              <ConnectionStatusTag className="w-full justify-center py-2" />
            </div>

            <nav id="tour-mobile-nav" className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1">
               {visibleNavItems.map((item, idx) => (
                <button 
                  key={`nav-mobile-sidebar-${item.id}-${idx}`} 
                  onClick={() => { setActiveTab(item.id as Tab); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                      : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <item.icon size={17} className={activeTab === item.id ? 'animate-pulse' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              ))}

              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsInstallModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Download size={15} />
                  <span>Instalar App no Celular</span>
                </button>
              </div>
            </nav>

            <div className="mt-3 pt-3 border-t border-slate-200/80 shrink-0 space-y-2">
              {session?.subscriptionStatus === 'trial' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsSubscriptionModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span>Assinar um Plano</span>
                  <ArrowRight size={13} />
                </button>
              )}
              {session?.impersonatedBySuper && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    returnToSuperAdmin();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white font-black text-[10px] uppercase tracking-wider border border-purple-500/40 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>Voltar ao Painel Super ADM</span>
                </button>
              )}
              <button 
                onClick={() => setIsLogoutModalOpen(true)} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 font-black text-[10px] uppercase tracking-widest border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-all active:scale-95 cursor-pointer"
              >
                <LogOut size={16} /> 
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      {renderLogoutModal()}

      {/* Modal Interativo de Instalação do App (PWA) no Celular/PC */}
      <InstallAppModal 
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setIsInstallModalOpen(false);
        }}
      />

      {/* Tour Guiado Interativo Direto no Sistema */}
      <SpotlightTour 
        isActive={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
        onSkip={() => setIsOnboardingOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab as Tab)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenSidebar={() => {
          setIsSidebarOpen(true);
          setIsSidebarCollapsed(false);
        }}
        onCloseSidebar={() => {
          setIsSidebarOpen(false);
        }}
        tenantId={session?.tenantId}
      />

      {/* Notificação Toast em Tempo Real de Queda / Retorno do Banco SQL */}
      <ConnectionStatusToast />
    </div>
  );
};

export default App;
