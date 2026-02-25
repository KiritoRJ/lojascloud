
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './utils/supabaseClient';
import { Smartphone, Package, ShoppingCart, BarChart3, Settings, LogOut, Menu, X, Loader2, ShieldCheck, Terminal } from 'lucide-react';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User } from './types';
import ServiceOrderTab from './components/ServiceOrderTab';
import StockTab from './components/StockTab';
import SalesTab from './components/SalesTab';
import FinanceTab from './components/FinanceTab';
import SettingsTab from './components/SettingsTab';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SqlEditorTab from './components/SqlEditorTab';
import SubscriptionView from './components/SubscriptionView';
import { OnlineDB } from './utils/api';
import { OfflineSync } from './utils/offlineSync';
import { db } from './utils/localDb';

type Tab = 'os' | 'estoque' | 'vendas' | 'financeiro' | 'config' | 'sqlEditor';

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Minha Assistência',
  storeAddress: '',
  storePhone: '',
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
  itemsPerPage: 8
};

const App: React.FC = () => {
  const [session, setSession] = useState<{ 
    isLoggedIn: boolean; 
    type: 'super' | 'admin' | 'colaborador'; 
    tenantId?: string; 
    user?: User; 
    subscriptionStatus?: string; 
    subscriptionExpiresAt?: string;
    customMonthlyPrice?: number;
    customQuarterlyPrice?: number;
    customYearlyPrice?: number;
    enabledFeatures?: {
      osTab: boolean;
      stockTab: boolean;
      salesTab: boolean;
      financeTab: boolean;
      profiles: boolean;
      xmlExportImport: boolean;
    };
    maxUsers?: number;
    maxOS?: number;
    maxProducts?: number;
    printerSize?: 58 | 80;
  } | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('os');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const checkAndResetDb = async () => {
      const dbVersionKey = 'db_schema_version';
      const currentVersion = '11'; // Deve corresponder à versão no localDb.ts
      const storedVersion = localStorage.getItem(dbVersionKey);
      console.log(`[DB Check] Stored version: ${storedVersion}, Required: ${currentVersion}`);

      if (storedVersion !== currentVersion) {
        console.log(`[DB Check] Schema mismatch. Resetting database.`);
        try {
          await db.delete();
          console.log('[DB Check] Database deleted successfully.');
          localStorage.setItem(dbVersionKey, currentVersion);
          window.location.reload();
        } catch (error) {
          console.error('[DB Check] Failed to delete database:', error);
        }
        return; // Impede a continuação da execução para aguardar o reload
      }
    };

    checkAndResetDb().then(() => {
        OfflineSync.init(); // Apenas inicializa listeners
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        
        const cleanup = () => {
          window.removeEventListener('online', handleStatusChange);
          window.removeEventListener('offline', handleStatusChange);
        };
        return cleanup;
    });

    // Adiciona um listener para o evento 'online' para iniciar a sincronização
    // Isso garante que a sincronização só ocorra quando o app estiver online e o SW estiver pronto
    window.addEventListener('online', OfflineSync.sincronizarPendentes);
    return () => {
      window.removeEventListener('online', OfflineSync.sincronizarPendentes);
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Debug: check if app is already installed or standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        const storedSession = localStorage.getItem('session_pro');
        const storedUser = localStorage.getItem('currentUser_pro');
        
        if (supabaseSession && storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.isSuper) {
            setSession({
            isLoggedIn: true,
            type: 'super'
          });
          } else if (parsed.tenantId) {
            // Buscamos o usuário do banco de dados para garantir que os dados estejam atualizados
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*, tenants(*, tenant_limits(*))')
              .eq('id', supabaseSession.user.id)
              .maybeSingle();
            
            if (userError) throw userError;
            if (!userData) throw new Error('Dados do usuário não encontrados no banco.');

            const tenant = userData.tenants;
            const limits = tenant?.tenant_limits;
            const expiresAt = tenant?.subscription_expires_at;
            const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

            const finalUser = storedUser ? JSON.parse(storedUser) : null; // Ainda usamos o storedUser para o objeto User completo

            setSession({
              isLoggedIn: true,
              type: userData.role || 'admin',
              tenantId: userData.tenant_id,
              user: finalUser,
              subscriptionStatus: isExpired ? 'expired' : (tenant?.subscription_status || 'trial'),
              subscriptionExpiresAt: expiresAt,
              customMonthlyPrice: tenant?.custom_monthly_price,
              customQuarterlyPrice: tenant?.custom_quarterly_price,
              customYearlyPrice: tenant?.custom_yearly_price,
              enabledFeatures: tenant?.enabled_features,
              maxUsers: tenant?.max_users,
              maxOS: limits?.max_os,
              maxProducts: limits?.max_products,
              printerSize: tenant?.printer_size
            });
          }
        } else {
          // Se não há sessão Supabase ou storedSession, faz logout
          handleLogout();
        }
      } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
        handleLogout(); // Garante que a sessão seja limpa em caso de erro
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  const loadData = useCallback(async (tenantId: string) => {
    setIsInitializing(true);
    try {
      if (navigator.onLine) {
        setIsCloudConnected(true);
        // Etapa 1: Puxar dados da nuvem primeiro para garantir a versão mais recente
        await OfflineSync.pullAllData(tenantId);
        // Etapa 2: Sincronizar pendentes após o pull, para evitar conflitos
        await OfflineSync.sincronizarPendentes();
        // Etapa 3: Carregar os dados locais (agora atualizados com a nuvem) para a UI
        const refreshedData = await OfflineSync.getLocalData(tenantId);
        updateStateWithLocalData(refreshedData, session);
      } else {
        setIsCloudConnected(false);
        // Se offline, carregar apenas os dados locais
        const localData = await OfflineSync.getLocalData(tenantId);
        updateStateWithLocalData(localData, session);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [session]);

  const updateStateWithLocalData = (data: any, session: any) => {
    const newSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    if (session?.printerSize) {
      newSettings.printerSize = session.printerSize;
    }
    newSettings.users = data.users || [];
    setSettings(newSettings);
    setOrders(data.orders || []);
    setProducts(data.products || []);
    setSales(data.sales || []);
    setTransactions(data.transactions || []);
    // Se a sessão não tem um usuário, tenta usar o primeiro usuário local (admin)
    if (!session?.user && data.users && data.users.length > 0) {
      const adminUser = data.users.find((u: User) => u.role === 'admin');
      if (adminUser) {
        setSession(prev => prev ? { ...prev, user: adminUser } : null);
      }
    }
  };

  useEffect(() => {
    if (session?.isLoggedIn && session.tenantId) {
      loadData(session.tenantId);

      const channel = supabase
        .channel('public:products')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${session.tenantId}` },
          (payload) => {
            console.log('Realtime payload recebido:', payload);
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setProducts((prevProducts) => prevProducts.filter(p => p.id !== deletedId));
              db.products.delete(deletedId);
            } else if (payload.eventType === 'INSERT') {
                const newProduct = payload.new as Product;
                setProducts((prev) => [...prev, newProduct]);
                db.products.put({ ...newProduct, tenantId: session.tenantId! });
            } else if (payload.eventType === 'UPDATE') {
                const updatedProduct = payload.new as Product;
                setProducts((prev) => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
                db.products.put({ ...updatedProduct, tenantId: session.tenantId! });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.isLoggedIn, session?.tenantId, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      const result = await OnlineDB.login(loginForm.username, loginForm.password);
      
      if (result.success) {
        if (result.type === 'super') {
          const superSession = { isLoggedIn: true, type: 'super', isSuper: true };
          localStorage.setItem('session_pro', JSON.stringify(superSession));
          setSession(superSession as any);
        } else {
          const tenantId = result.tenant?.id;
          const userFromDb = (result.tenant as any)?.users?.find((u: any) => u.tenant_id === tenantId && u.role === result.type);

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
            enabledFeatures: result.tenant?.enabledFeatures,
            maxUsers: result.tenant?.maxUsers,
            maxOS: result.tenant?.maxOS,
            maxProducts: result.tenant?.maxProducts,
            printerSize: result.tenant?.printerSize
          };
          const finalUser = userFromDb ? {
            id: userFromDb.id,
            name: userFromDb.name || userFromDb.username,
            role: userFromDb.role,
            photo: userFromDb.photo,
            specialty: userFromDb.specialty
          } : {
            id: result.tenant?.id || 'temp', 
            name: result.tenant?.name || result.tenant?.username || 'Administrador', 
            role: result.type as any, 
            photo: null 
          };
          localStorage.setItem('session_pro', JSON.stringify(newSession));
          localStorage.setItem('currentUser_pro', JSON.stringify(finalUser));
          setSession({ ...newSession, user: finalUser });
        }
      } else {
        setLoginError(result.message || "Acesso negado.");
      }
    } catch (err) {
      setLoginError("Erro de rede. Verifique sua conexão.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginAs = async (tenantId: string) => {
    const tenant = await OnlineDB.getTenantById(tenantId);
    if (tenant) {
      const newSession = {
        isLoggedIn: true,
        type: 'admin' as const,
        tenantId: tenant.id,
        isSuper: false,
        subscriptionStatus: tenant.subscription_status,
        subscriptionExpiresAt: tenant.subscription_expires_at,
        customMonthlyPrice: tenant.custom_monthly_price,
        customQuarterlyPrice: tenant.custom_quarterly_price,
        customYearlyPrice: tenant.custom_yearly_price,
        enabledFeatures: tenant.enabled_features,
        maxUsers: tenant.max_users,
        maxOS: tenant.tenant_limits?.max_os,
        maxProducts: tenant.tenant_limits?.max_products,
      };
      const finalUser = {
        id: (tenant as any).users.find((u: any) => u.role === 'admin')?.id || 'admin',
        name: (tenant as any).users.find((u: any) => u.role === 'admin')?.name || 'Admin',
        role: 'admin' as const,
        photo: null,
      };
      localStorage.setItem('session_pro', JSON.stringify(newSession));
      localStorage.setItem('currentUser_pro', JSON.stringify(finalUser));
      setSession({ ...newSession, user: finalUser });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_pro');
    localStorage.removeItem('currentUser_pro');
    setSession(null);
    setSettings(null);
    setOrders([]);
    setProducts([]);
    setSales([]);
    setActiveTab('os');
  };

  const saveSettings = async (newSettings: AppSettings) => {
    if (!session?.tenantId) return;
    setSettings(newSettings);
    await OfflineSync.salvarLocalmente(session.tenantId, 'settings', 'upsert', newSettings);
  };

  const saveOrders = async (newOrders: ServiceOrder[]) => {
    if (!session?.tenantId) return;
    // Otimização: Apenas salva as ordens que realmente mudaram.
    const changedOrders = newOrders.filter(newOrder => {
      const oldOrder = orders.find(o => o.id === newOrder.id);
      return !oldOrder || JSON.stringify(oldOrder) !== JSON.stringify(newOrder);
    });

    if (changedOrders.length === 0) return;

    setOrders(newOrders);
    for (const order of changedOrders) {
      await OfflineSync.salvarLocalmente(session.tenantId, 'orders', 'upsert', order);
    }
  };

  const removeOrder = async (id: string) => {
    if (!session?.tenantId) return;
    const updated = orders.map(o => o.id === id ? { ...o, isDeleted: true } : o);
    setOrders(updated);
    await OfflineSync.salvarLocalmente(session.tenantId, 'orders', 'delete', { id });
  };

  const saveProducts = async (newProducts: Product[]) => {
    if (!session?.tenantId) return;
    const changedProducts = newProducts.filter(newProd => {
        const oldProd = products.find(p => p.id === newProd.id);
        return !oldProd || JSON.stringify(oldProd) !== JSON.stringify(newProd);
    });

    if (changedProducts.length === 0) return;

    setProducts(newProducts);
    for (const product of changedProducts) {
        await OfflineSync.salvarLocalmente(session.tenantId, 'products', 'upsert', product);
    }
  };

  const removeProduct = async (id: string) => {
    if (!session?.tenantId) return;
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    await OfflineSync.salvarLocalmente(session.tenantId, 'products', 'delete', { id });
  };

  const saveSales = async (newSales: Sale[]) => {
    if (!session?.tenantId) return;
    const changedSales = newSales.filter(newSale => {
      const oldSale = sales.find(s => s.id === newSale.id);
      return !oldSale || JSON.stringify(oldSale) !== JSON.stringify(newSale);
    });

    if (changedSales.length === 0) return;

    setSales(newSales);
    for (const sale of changedSales) {
      await OfflineSync.salvarLocalmente(session.tenantId, 'sales', 'upsert', sale);
    }
  };

  const removeSale = async (sale: Sale) => {
    if (!session?.tenantId) return;
    const updatedSales = sales.map(s => s.id === sale.id ? { ...s, isDeleted: true } : s);
    setSales(updatedSales);

    // Reverte o estoque do produto
    const productToUpdate = products.find(p => p.id === sale.productId);
    if (productToUpdate) {
      const updatedProduct = { ...productToUpdate, quantity: productToUpdate.quantity + sale.quantity };
      const updatedProducts = products.map(p => p.id === sale.productId ? updatedProduct : p);
      setProducts(updatedProducts);
      await OfflineSync.salvarLocalmente(session.tenantId, 'products', 'upsert', updatedProduct);
    }

    await OfflineSync.salvarLocalmente(session.tenantId, 'sales', 'delete', { id: sale.id });
  };

  const saveTransactions = async (newTransactions: Transaction[]) => {
    if (!session?.tenantId) return;
    const changedTransactions = newTransactions.filter(newTrans => {
      const oldTrans = transactions.find(t => t.id === newTrans.id);
      return !oldTrans || JSON.stringify(oldTrans) !== JSON.stringify(newTrans);
    });

    if (changedTransactions.length === 0) return;

    setTransactions(newTransactions);
    for (const transaction of changedTransactions) {
      await OfflineSync.salvarLocalmente(session.tenantId, 'transactions', 'upsert', transaction);
    }
  };

  const removeTransaction = async (id: string) => {
    if (!session?.tenantId) return;
    const updated = transactions.map(t => t.id === id ? { ...t, isDeleted: true } : t);
    setTransactions(updated);
    await OfflineSync.salvarLocalmente(session.tenantId, 'transactions', 'delete', { id });
  };

  const handleSwitchProfile = (user: User) => {
    if (session) {
      const newType = user.role;
      setSession({ ...session, user, type: newType });
      localStorage.setItem('currentUser_pro', JSON.stringify(user));
      const allowedTabs = navItems.filter(item => item.roles.includes(newType)).map(i => i.id);
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('os');
      }
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Validando Sistema...</p>
      </div>
    );
  }

  if (!session?.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-white/10">
              <Smartphone size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">LOJAS CLOUD</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {isRegisterMode ? 'Crie sua loja grátis por 7 dias' : 'sua loja nas nuvens'}
            </p>
          </div>

          {isRegisterMode ? (
            <form onSubmit={handleRegister} className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome da Loja</label>
                <input type="text" value={registerForm.storeName} onChange={e => setRegisterForm({...registerForm, storeName: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-colors text-xs" placeholder="Ex: Tech Cell" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Administrador</label>
                <input type="email" value={registerForm.username} onChange={e => setRegisterForm({...registerForm, username: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-colors text-xs" placeholder="seu@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Senha</label>
                <input type="password" value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-colors text-xs" placeholder="••••••" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                  <ShieldCheck size={14} className="shrink-0" />
                  <p className="text-[9px] font-black uppercase tracking-tight">{loginError}</p>
                </div>
              )}
              <button type="submit" disabled={isRegistering} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all mt-4 disabled:opacity-50">
                {isRegistering ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Criar Minha Loja'}
              </button>
              <button type="button" onClick={() => { setIsRegisterMode(false); setLoginError(null); }} className="w-full text-slate-500 font-black uppercase text-[9px] tracking-widest hover:text-white transition-colors">
                Já tenho uma conta
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email / Login</label>
                <input type="email" autoFocus value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-colors text-xs" placeholder="seu@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Senha</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-colors text-xs" placeholder="••••••" />
              </div>
              {loginError && (
                <div className={`flex items-center gap-2 ${loginError.includes('sucesso') ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'} p-3 rounded-xl border`}>
                  <ShieldCheck size={14} className="shrink-0" />
                  <p className="text-[9px] font-black uppercase tracking-tight">{loginError}</p>
                </div>
              )}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all mt-4 disabled:opacity-50">
                {isLoggingIn ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Acessar Sistema'}
              </button>
              <button type="button" onClick={() => { setIsRegisterMode(true); setLoginError(null); }} className="w-full text-slate-500 font-black uppercase text-[9px] tracking-widest hover:text-white transition-colors">
                Criar nova loja grátis
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (session.type === 'super') return <SuperAdminDashboard onLogout={handleLogout} onLoginAs={handleLoginAs} />;

  if (session.subscriptionStatus === 'expired') {
    return (
      <SubscriptionView 
        tenantId={session.tenantId!} 
        storeName={settings?.storeName || 'Sua Loja'} 
        expiresAt={session.subscriptionExpiresAt!}
        customMonthlyPrice={session.customMonthlyPrice}
        customQuarterlyPrice={session.customQuarterlyPrice}
        customYearlyPrice={session.customYearlyPrice}
        onLogout={handleLogout}
        onSuccess={(newExpiresAt) => {
          const updatedSession = { ...session, subscriptionStatus: 'active', subscriptionExpiresAt: newExpiresAt };
          setSession(updatedSession);
          localStorage.setItem('session_pro', JSON.stringify(updatedSession));
        }}
      />
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs">Sincronizando Dados</p>
        <button onClick={handleLogout} className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-10">Sair</button>
      </div>
    );
  }

  const currentUser = session.user || settings.users[0];
  const navItems = [
    { id: 'os', label: 'Ordens', icon: Smartphone, roles: ['admin', 'colaborador'], feature: 'osTab' },
    { id: 'estoque', label: 'Estoque', icon: Package, roles: ['admin'], feature: 'stockTab' },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart, roles: ['admin', 'colaborador'], feature: 'salesTab' },
    { id: 'financeiro', label: 'Finanças', icon: BarChart3, roles: ['admin'], feature: 'financeTab' },
    { id: 'config', label: 'Ajustes', icon: Settings, roles: ['admin', 'colaborador'] },
  ];
  
  const visibleNavItems = navItems.filter(item => {
    const roleAllowed = item.roles.includes(currentUser.role);
    const featureAllowed = !item.feature || (session.enabledFeatures as any)?.[item.feature] !== false;
    return roleAllowed && featureAllowed;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-24' : 'w-72'} bg-slate-900 text-white p-6 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out`}>
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-12`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-4 overflow-hidden animate-in fade-in">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover rounded-xl" /> : <Smartphone size={20} />}
              </div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-tight truncate">{settings.storeName}</h1>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            {isSidebarCollapsed ? <Menu size={24} /> : <X size={20} />}
          </button>
        </div>
        <nav className="flex-1 space-y-2">
          {visibleNavItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-6'} py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="animate-in fade-in whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-8 pt-8 border-t border-white/5">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} mb-6`}>
            <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden border border-white/10 shrink-0">
              {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600 font-black text-xs">?</div>}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 animate-in fade-in">
                <p className="text-[9px] font-black uppercase text-white truncate">{currentUser.name}</p>
                <p className="text-[7px] font-bold uppercase text-slate-500 truncate">{currentUser.specialty || (currentUser.role === 'admin' ? 'Administrador' : 'Colaborador')}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-6'} py-4 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-colors`}>
            <LogOut size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="animate-in fade-in">Sair</span>}
          </button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover rounded-xl" /> : <Smartphone size={20} />}
          </div>
          <h1 className="font-black text-slate-800 text-sm tracking-tighter uppercase truncate max-w-[150px]">{settings.storeName}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400"><Menu size={24} /></button>
      </header>

      <main className="flex-1 p-4 pt-24 pb-28 md:pt-10 md:pb-4 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
        {activeTab === 'os' && <ServiceOrderTab orders={orders.filter(o => !o.isDeleted)} setOrders={saveOrders} settings={settings} onDeleteOrder={removeOrder} tenantId={session.tenantId || ''} maxOS={session.maxOS} />}
        {activeTab === 'estoque' && <StockTab products={products} setProducts={saveProducts} onDeleteProduct={removeProduct} settings={settings} maxProducts={session.maxProducts} />}
        {activeTab === 'vendas' && <SalesTab products={products} setProducts={saveProducts} sales={sales.filter(s => !s.isDeleted)} setSales={saveSales} settings={settings} currentUser={currentUser} onDeleteSale={removeSale} tenantId={session.tenantId || ''} />}
        {activeTab === 'financeiro' && <FinanceTab orders={orders} sales={sales} products={products} transactions={transactions} setTransactions={saveTransactions} onDeleteTransaction={removeTransaction} onDeleteSale={removeSale} tenantId={session.tenantId || ''} settings={settings} />}
        {activeTab === 'config' && <SettingsTab settings={settings} setSettings={saveSettings} isCloudConnected={isCloudConnected} currentUser={currentUser} onSwitchProfile={handleSwitchProfile} tenantId={session.tenantId} deferredPrompt={deferredPrompt} onInstallApp={handleInstallApp} subscriptionStatus={session.subscriptionStatus} subscriptionExpiresAt={session.subscriptionExpiresAt} enabledFeatures={session.enabledFeatures} maxUsers={session.maxUsers} maxOS={session.maxOS} maxProducts={session.maxProducts} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-40">
        {visibleNavItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`p-2 transition-all ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <item.icon size={24} strokeWidth={activeTab === item.id ? 3 : 2} />
          </button>
        ))}
      </nav>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 animate-in fade-in">
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 p-8 flex flex-col animate-in slide-in-from-right">
            <button onClick={() => setIsSidebarOpen(false)} className="self-end text-slate-400 mb-8"><X size={28} /></button>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl mb-8">
                {currentUser.photo ? <img src={currentUser.photo} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 bg-slate-800 rounded-xl" />}
                <div className="min-w-0">
                  <p className="text-xs font-black text-white uppercase truncate max-w-[120px]">{currentUser.name}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{currentUser.specialty || (currentUser.role === 'admin' ? 'Administrador' : 'Colaborador')}</p>
                </div>
              </div>
              <nav className="space-y-2 mb-10">
                 {visibleNavItems.map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>
              <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 text-red-400 font-black text-[10px] uppercase tracking-widest border border-red-400/20 rounded-xl bg-red-400/5">
                <LogOut size={20} /> Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
