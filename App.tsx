
import React, { useState, useEffect } from 'react';
import { ClipboardList, Wallet, Settings as SettingsIcon, Package, ShoppingCart, LogOut, RefreshCw, Globe, Loader2, UserCircle2 } from 'lucide-react';
import { ServiceOrder, AppSettings, Product, Sale, User } from './types';
import ServiceOrderTab from './components/ServiceOrderTab';
import FinanceTab from './components/FinanceTab';
import SettingsTab from './components/SettingsTab';
import StockTab from './components/StockTab';
import SalesTab from './components/SalesTab';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { getData, saveData } from './utils/db';
import { OnlineDB } from './utils/api';

const App: React.FC = () => {
  const [session, setSession] = useState<{ type: 'super' | 'admin' | null, tenantId?: string }>({ type: null });
  const [isLogged, setIsLogged] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [activeTab, setActiveTab] = useState<'os' | 'financeiro' | 'config' | 'estoque' | 'vendas' | 'usuarios'>('os');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--primary', settings.themePrimary || '#2563eb');
      document.documentElement.style.setProperty('--sidebar', settings.themeSidebar || '#0f172a');
      document.documentElement.style.setProperty('--bg-app', settings.themeBg || '#f8fafc');
      document.documentElement.style.setProperty('--active-tab', settings.themeBottomTab || '#0f172a');
    }
  }, [settings]);

  useEffect(() => {
    if (isLogged && session.type === 'admin' && session.tenantId) {
      fullSync(session.tenantId);
    }
  }, [isLogged, session]);

  const fullSync = async (tid: string) => {
    setIsSyncing(true);
    try {
      const localOrders = await getData('orders', `${tid}_orders`);
      const localProducts = await getData('products', `${tid}_products`);
      const localSales = await getData('sales', `${tid}_sales`);
      const localConfig = await getData('settings', `${tid}_config`);

      if (localOrders) setOrders(localOrders);
      if (localProducts) setProducts(localProducts);
      if (localSales) setSales(localSales);
      if (localConfig) {
        setSettings(localConfig);
        if (!currentUser) setCurrentUser(localConfig.users[0]);
      }

      const remoteOrders = await OnlineDB.fetchOrders(tid);
      if (remoteOrders === null) {
        setIsCloudConnected(false);
      } else {
        setIsCloudConnected(true);
        setOrders(remoteOrders);
        await saveData('orders', `${tid}_orders`, remoteOrders);

        const remoteProducts = await OnlineDB.fetchProducts(tid);
        if (remoteProducts !== null) {
          setProducts(remoteProducts);
          await saveData('products', `${tid}_products`, remoteProducts);
        }

        const remoteSales = await OnlineDB.syncPull(tid, 'sales');
        const remoteConfig = await OnlineDB.syncPull(tid, 'settings');

        if (remoteSales) { setSales(remoteSales); await saveData('sales', `${tid}_sales`, remoteSales); }
        if (remoteConfig) {
          setSettings(remoteConfig);
          await saveData('settings', `${tid}_config`, remoteConfig);
          if (!currentUser) setCurrentUser(remoteConfig.users[0]);
        }
      }

      if (!localConfig && isCloudConnected) {
        const defaultSettings: AppSettings = {
          storeName: 'Minha Loja', logoUrl: null, users: [{id:'adm_1', name: 'Administrador', role: 'admin', photo: null}], isConfigured: true,
          themePrimary: '#2563eb', themeSidebar: '#0f172a', themeBg: '#f8fafc', themeBottomTab: '#0f172a',
          pdfWarrantyText: "Garantia de 90 dias...", pdfFontSize: 8, pdfFontFamily: 'helvetica',
          pdfPaperWidth: 80, pdfTextColor: '#000000', pdfBgColor: '#FFFFFF',
          receiptHeaderSubtitle: 'ASSISTÊNCIA TÉCNICA ESPECIALIZADA',
          receiptLabelProtocol: 'PROTOCOLO',
          receiptLabelDate: 'DATA',
          receiptLabelClientSection: 'CLIENTE',
          receiptLabelClientName: 'NOME',
          receiptLabelClientPhone: 'FONE',
          receiptLabelClientAddress: 'ENDEREÇO',
          receiptLabelServiceSection: 'SERVIÇOS REALIZADOS NO APARELHO',
          receiptLabelDevice: 'APARELHO',
          receiptLabelDefect: 'DEFEITO',
          receiptLabelRepair: 'REPARO',
          receiptLabelTotal: 'VALOR TOTAL DO SERVIÇO',
          receiptLabelEntryPhotos: 'FOTOS DE ENTRADA',
          receiptLabelExitPhotos: 'FOTOS DE SAÍDA'
        };
        setSettings(defaultSettings);
        setCurrentUser(defaultSettings.users[0]);
      }
    } catch (e) {
      console.error("Erro na sincronização:", e);
      setIsCloudConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    const cleanUser = loginUser.trim().toLowerCase();
    const cleanPass = loginPass.trim();
    if (!cleanUser || !cleanPass) return;
    if (cleanUser === 'wandev' && (cleanPass === '123' || cleanPass === 'wan123')) {
      setSession({ type: 'super' }); setIsLogged(true); return;
    }
    setIsAuthenticating(true);
    try {
      const result = await OnlineDB.login(cleanUser, cleanPass);
      if (result.success) {
        setSession({ type: result.type as any, tenantId: result.tenant?.id });
        setIsLogged(true);
        setIsCloudConnected(true);
      } else { 
        alert(result.message); 
      }
    } catch (err) { 
      alert("Erro ao conectar com o banco de dados."); 
    } finally { 
      setIsAuthenticating(false); 
    }
  };

  const handleLogout = () => {
    setIsLogged(false); setSession({ type: null }); setSettings(null);
    setOrders([]); setProducts([]); setSales([]); setLoginUser(''); setLoginPass('');
    setCurrentUser(null);
  };

  const handleSwitchProfile = (user: User) => {
    setCurrentUser(user);
    if (user.role !== 'admin' && (activeTab === 'financeiro' || activeTab === 'config' || activeTab === 'estoque')) {
      setActiveTab('os');
    }
  };

  const saveOrders = async (newOrders: ServiceOrder[]) => {
    setOrders(newOrders);
    await saveData('orders', `${session.tenantId}_orders`, newOrders);
    if (session.tenantId) {
      const res = await OnlineDB.syncPush(session.tenantId, 'orders', newOrders);
      setIsCloudConnected(res.success);
    }
  };

  const removeOrder = async (orderId: string) => {
    const newOrders = orders.filter(o => o.id !== orderId);
    setOrders(newOrders);
    try {
      await saveData('orders', `${session.tenantId}_orders`, newOrders);
      if (session.tenantId) {
        const result = await OnlineDB.deleteOS(orderId);
        setIsCloudConnected(result.success);
      }
    } catch (e) {
      setIsCloudConnected(false);
    }
  };

  const saveProducts = async (newProducts: Product[]) => {
    setProducts(newProducts);
    await saveData('products', `${session.tenantId}_products`, newProducts);
    if (session.tenantId) {
      const res = await OnlineDB.syncPush(session.tenantId, 'products', newProducts);
      setIsCloudConnected(res.success);
    }
  };

  const removeProduct = async (productId: string) => {
    const newProducts = products.filter(p => p.id !== productId);
    setProducts(newProducts);
    try {
      await saveData('products', `${session.tenantId}_products`, newProducts);
      if (session.tenantId) {
        const result = await OnlineDB.deleteProduct(productId);
        setIsCloudConnected(result.success);
      }
    } catch (e) {
      setIsCloudConnected(false);
    }
  };

  const saveSales = async (newSales: Sale[]) => {
    setSales(newSales);
    await saveData('sales', `${session.tenantId}_sales`, newSales);
    if (session.tenantId) {
      const res = await OnlineDB.syncPush(session.tenantId, 'sales', newSales);
      setIsCloudConnected(res.success);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveData('settings', `${session.tenantId}_config`, newSettings);
    if (session.tenantId) {
      const res = await OnlineDB.syncPush(session.tenantId, 'settings', newSettings);
      setIsCloudConnected(res.success);
    }
  };

  const getNavItems = () => {
    const items = [
      { id: 'os', label: 'Ordens', icon: ClipboardList, color: 'var(--primary)' },
      { id: 'estoque', label: 'Estoque', icon: Package, color: '#f59e0b' },
      { id: 'vendas', label: 'Vendas', icon: ShoppingCart, color: '#10b981' },
      { id: 'financeiro', label: 'Financeiro', icon: Wallet, color: '#8b5cf6' },
      { id: 'config', label: 'Ajustes', icon: SettingsIcon, color: '#64748b' }
    ];

    if (currentUser?.role === 'admin') return items;
    
    // Vendedores e Técnicos não acessam Estoque, Financeiro nem Ajustes (Configurações Globais)
    // Eles acessam apenas OS e Vendas. A aba Ajustes (config) aparecerá APENAS para trocar de perfil se necessário.
    return items.filter(item => item.id !== 'financeiro' && item.id !== 'estoque' && item.id !== 'config');
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-sm bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 relative overflow-hidden">
          {isAuthenticating && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white gap-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">Acessando Nuvem...</p>
            </div>
          )}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mx-auto mb-6 shadow-2xl">A</div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Assistencia Pro</h1>
          </div>
          <div className="space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full p-5 bg-white/5 border border-white/10 rounded-[1.5rem] font-bold text-white outline-none text-sm" placeholder="Usuário Administrador" />
            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-5 bg-white/5 border border-white/10 rounded-[1.5rem] font-bold text-white outline-none text-sm" placeholder="Senha" />
            <button onClick={handleLogin} disabled={isAuthenticating} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 disabled:opacity-50 mt-4">Login Master</button>
          </div>
        </div>
      </div>
    );
  }

  if (session.type === 'super') return <SuperAdminDashboard onLogout={handleLogout} />;
  
  if (session.type === 'admin' && settings && currentUser) {
    const navItems = getNavItems();

    return (
      <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pl-72 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-app)' }}>
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-40 px-6 flex items-center justify-between md:left-72">
          <div className="flex items-center gap-4">
            {settings.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white shrink-0 flex items-center justify-center">
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`p-2 rounded-xl bg-white shadow-sm text-blue-500 shrink-0`}>
                {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Globe size={18} />}
              </div>
            )}
            <div>
               <h1 className="font-black text-slate-800 text-[10px] md:text-xs uppercase tracking-tight truncate">{settings.storeName}</h1>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{currentUser.name} ({currentUser.role})</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentUser.role !== 'admin' && (
              <button 
                onClick={() => setActiveTab('config')} 
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[8px] uppercase tracking-widest active:scale-95"
              >
                <UserCircle2 size={14} /> Trocar Perfil
              </button>
            )}
            <button onClick={handleLogout} className="p-3 text-slate-400 bg-white border border-slate-100 rounded-2xl active:scale-90"><LogOut size={18} /></button>
          </div>
        </header>

        <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 flex-col z-50 p-6" style={{ backgroundColor: 'var(--sidebar)' }}>
          <div className="flex flex-col h-full bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-10 text-center border-b border-white/5">
              <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] border border-white/20 flex items-center justify-center overflow-hidden mx-auto mb-4">
                {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover" /> : <div className="font-black text-white text-2xl">{currentUser.name.charAt(0)}</div>}
              </div>
              <p className="font-black text-white uppercase text-[10px] tracking-[0.2em]">{currentUser.name}</p>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">{currentUser.role}</p>
            </div>
            <nav className="p-6 space-y-3 flex-1">
              {navItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id as any)} 
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all relative group ${activeTab === item.id ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:bg-white/5'}`}
                >
                  <item.icon size={20} style={{ color: activeTab === item.id ? item.color : 'inherit' }} />
                  {item.label}
                  {activeTab === item.id && <div className="absolute right-4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />}
                </button>
              ))}
              {currentUser.role !== 'admin' && (
                 <button 
                  onClick={() => setActiveTab('config')} 
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all relative ${activeTab === 'config' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:bg-white/5'}`}
                >
                  <UserCircle2 size={20} />
                  Perfis
                </button>
              )}
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-6 pt-24 md:pt-24 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
          {activeTab === 'os' && <ServiceOrderTab orders={orders} setOrders={saveOrders} settings={settings} onDeleteOrder={removeOrder} />}
          {activeTab === 'estoque' && <StockTab products={products} setProducts={saveProducts} onDeleteProduct={removeProduct} />}
          {activeTab === 'vendas' && <SalesTab products={products} setProducts={saveProducts} sales={sales} setSales={saveSales} settings={settings} currentUser={currentUser} />}
          {activeTab === 'financeiro' && <FinanceTab orders={orders} sales={sales} />}
          {activeTab === 'config' && <SettingsTab settings={settings} setSettings={saveSettings} isCloudConnected={isCloudConnected} currentUser={currentUser} onSwitchProfile={handleSwitchProfile} />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-around p-3 md:hidden z-40 pb-8 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
           {navItems.map(item => (
             <button 
               key={item.id}
               onClick={() => setActiveTab(item.id as any)} 
               className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'text-white shadow-lg -translate-y-2' : 'text-slate-300'}`}
               style={{ backgroundColor: activeTab === item.id ? 'var(--active-tab)' : 'transparent' }}
             >
               <item.icon size={24} />
             </button>
           ))}
           {currentUser.role !== 'admin' && (
             <button 
               onClick={() => setActiveTab('config')} 
               className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === 'config' ? 'text-white shadow-lg -translate-y-2' : 'text-slate-300'}`}
               style={{ backgroundColor: activeTab === 'config' ? 'var(--active-tab)' : 'transparent' }}
             >
               <UserCircle2 size={24} />
             </button>
           )}
        </nav>
      </div>
    );
  }
  return null;
};

export default App;
