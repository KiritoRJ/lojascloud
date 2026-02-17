
import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, Camera, FileText, Palette, MoveHorizontal, MoreVertical, ArrowLeft, Check, Layout, Pipette, X, AlertCircle, Users, Shield, UserPlus, Trash2, User as UserIcon, Loader2, Lock, MapPin, Phone, KeyRound } from 'lucide-react';
import { AppSettings, User } from '../types';
import { OnlineDB } from '../utils/api';

interface Props {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  isCloudConnected?: boolean;
  currentUser: User;
  onSwitchProfile: (user: User) => void;
  tenantId?: string; 
}

const SettingsTab: React.FC<Props> = ({ settings, setSettings, isCloudConnected = true, currentUser, onSwitchProfile, tenantId }) => {
  // UseMemo garante que a verificação de cargo seja reativa às mudanças de perfil
  const isAdmin = useMemo(() => currentUser.role === 'admin', [currentUser]);
  
  const [view, setView] = useState<'main' | 'print' | 'theme' | 'users'>(isAdmin ? 'main' : 'users');
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Estados para segurança de troca de perfil
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [pendingUserToSwitch, setPendingUserToSwitch] = useState<User | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'tecnico' | 'vendedor'>('tecnico');
  const [newUserPhoto, setNewUserPhoto] = useState<string | null>(null);

  const triggerSaveFeedback = (msg: string = "Sincronizado!") => {
    setIsSaving(true);
    setSaveMessage(msg);
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage(null);
    }, 2000);
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    if (!isAdmin) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    triggerSaveFeedback();
  };

  const handleSwitchAttempt = (user: User) => {
    if (user.id === currentUser.id) {
       onSwitchProfile(user);
       return;
    }

    if (isAdmin) {
      onSwitchProfile(user);
    } else {
      setPendingUserToSwitch(user);
      setIsAuthModalOpen(true);
    }
  };

  const verifyAdminPassword = () => {
    const storeAdmin = settings.users.find(u => u.role === 'admin');
    const correctPassword = storeAdmin?.password || '123';

    if (authPassword === correctPassword) {
      if (pendingUserToSwitch) {
        onSwitchProfile(pendingUserToSwitch);
      }
      setIsAuthModalOpen(false);
      setAuthPassword('');
      setAuthError(false);
      setPendingUserToSwitch(null);
    } else {
      setAuthError(true);
      setAuthPassword('');
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const triggerUpload = () => {
    if (!isAdmin) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateSetting('logoUrl', reader.result as string);
          input.value = '';
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const triggerUserPhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewUserPhoto(reader.result as string);
          input.value = '';
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCreateUser = async () => {
    if (!isAdmin) return;
    if (!newUserName || !newUserPassword) return alert('Nome e Senha são obrigatórios.');
    
    setIsSaving(true);
    const userId = 'USR_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newUser: User = {
      id: userId,
      name: newUserName,
      role: newUserRole,
      password: newUserPassword,
      photo: newUserPhoto
    };

    try {
      if (tenantId) {
        const res = await OnlineDB.upsertUser(tenantId, settings.storeName, newUser);
        if (!res.success) throw new Error(res.message);
        triggerSaveFeedback(`Acesso Criado! Login: ${res.username}`);
      }

      const updatedUsers = [...settings.users, newUser];
      setSettings({ ...settings, users: updatedUsers });
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserPassword('');
      setNewUserPhoto(null);
    } catch (e: any) {
      alert("Erro SQL Cloud: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    const userToDelete = settings.users.find(u => u.id === id);
    if (!userToDelete) return;

    if (userToDelete.id === currentUser.id) {
      return alert('Você não pode excluir o perfil que está usando agora.');
    }

    if (userToDelete.role === 'admin') {
      return alert('O perfil Administrador master não pode ser excluído.');
    }
    
    if (confirm(`Deseja excluir o perfil de "${userToDelete.name}" do SQL Cloud?`)) {
      setIsSaving(true);
      try {
        // Tenta remover do banco de dados relacional primeiro
        const res = await OnlineDB.deleteRemoteUser(id);
        
        // Se a remoção remota falhou por erro de rede ou permissão, avisamos mas permitimos limpar o estado local se o ADM insistir
        if (res.success) {
          const updatedUsers = settings.users.filter(u => u.id !== id);
          setSettings({ ...settings, users: updatedUsers });
          triggerSaveFeedback("Perfil Excluído!");
        } else {
          throw new Error("Falha na sincronização SQL.");
        }
      } catch (err) {
        alert("Erro ao remover: Verifique sua conexão com a nuvem.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (view === 'users') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all">
                <ArrowLeft size={24} />
              </button>
            )}
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Gerir Equipe</h2>
          </div>
          {isAdmin && (
            <button onClick={() => setIsUserModalOpen(true)} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-90">
              <UserPlus size={24} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.users.map(user => (
            <div key={user.id} onClick={() => handleSwitchAttempt(user)} className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer group relative flex items-center justify-between ${user.id === currentUser.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white/50 border-slate-100 shadow-sm hover:border-blue-200'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user.photo ? (
                    <img src={user.photo} className="w-16 h-16 rounded-3xl object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-3xl flex items-center justify-center border-2 border-white shadow-md">
                      <UserIcon size={32} />
                    </div>
                  )}
                  {user.role === 'admin' && <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border-2 border-white"><Shield size={12} /></div>}
                </div>
                <div>
                  <h3 className={`font-black uppercase text-xs ${user.id === currentUser.id ? 'text-blue-600' : 'text-slate-800'}`}>{user.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              
              {/* Somente o ADM pode apagar outros perfis (exceto ele mesmo e o master) */}
              {isAdmin && user.role !== 'admin' && user.id !== currentUser.id && (
                <button 
                  disabled={isSaving}
                  onClick={(e) => handleDeleteUser(user.id, e)} 
                  className="p-3 text-red-400 hover:text-red-600 bg-red-50 rounded-2xl transition-colors active:scale-90 disabled:opacity-30"
                >
                  <Trash2 size={20} />
                </button>
              )}
              
              {user.id === currentUser.id && (
                <span className="text-[8px] font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/30">Logado</span>
              )}
            </div>
          ))}
        </div>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
             <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100">
                <div className="w-20 h-20 bg-slate-100 text-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                   <Lock size={36} />
                </div>
                <h3 className="text-center font-black text-slate-800 uppercase text-sm mb-1">Acesso Restrito</h3>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8 leading-tight">Trocar perfil requer<br/>senha do ADM da Loja</p>
                
                <div className={`flex items-center gap-3 bg-slate-50 border rounded-2xl px-5 py-5 mb-4 transition-all ${authError ? 'border-red-500 bg-red-50 ring-4 ring-red-100' : 'border-slate-100 focus-within:border-blue-500'}`}>
                   <KeyRound size={20} className={authError ? 'text-red-500' : 'text-slate-300'} />
                   <input 
                     type="password" 
                     autoFocus
                     value={authPassword}
                     onChange={(e) => setAuthPassword(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && verifyAdminPassword()}
                     placeholder="SENHA DO ADM"
                     className="bg-transparent w-full outline-none font-black text-sm uppercase placeholder:text-slate-200"
                   />
                </div>
                
                {authError && <p className="text-center text-[9px] font-black text-red-500 uppercase mb-4 animate-bounce">Senha de ADM Incorreta!</p>}

                <div className="flex flex-col gap-2">
                   <button onClick={verifyAdminPassword} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Validar Gerente</button>
                   <button onClick={() => { setIsAuthModalOpen(false); setAuthPassword(''); setPendingUserToSwitch(null); }} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                </div>
             </div>
          </div>
        )}

        {isUserModalOpen && isAdmin && (
          <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end md:justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm mx-auto rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Colaborador</h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <button onClick={triggerUserPhotoUpload} className="relative group">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {newUserPhoto ? <img src={newUserPhoto} className="w-full h-full object-cover" /> : <Camera className="text-slate-200" size={32} />}
                    </div>
                  </button>
                </div>
                <div className="space-y-4">
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="NOME DO PROFISSIONAL" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black uppercase text-xs" />
                  <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="DEFINIR SENHA" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xs" />
                  <div className="flex gap-2">
                    <button onClick={() => setNewUserRole('tecnico')} className={`flex-1 py-4 rounded-2xl font-black text-[9px] tracking-widest uppercase ${newUserRole === 'tecnico' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>TÉCNICO</button>
                    <button onClick={() => setNewUserRole('vendedor')} className={`flex-1 py-4 rounded-2xl font-black text-[9px] tracking-widest uppercase ${newUserRole === 'vendedor' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>VENDEDOR</button>
                  </div>
                </div>
                <button onClick={handleCreateUser} disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center">
                  {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Colaborador SQL'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isAdmin) return null;

  if (view === 'theme') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Customização Visual</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Cor Principal (Botões)', key: 'themePrimary', icon: Palette },
            { label: 'Cor do Menu Lateral', key: 'themeSidebar', icon: Layout },
          ].map((item) => (
            <div key={item.key} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">{item.label}</p>
              <input 
                type="color" 
                value={(settings as any)[item.key] || '#000000'} 
                onChange={(e) => updateSetting(item.key as any, e.target.value)}
                className="w-full h-12 rounded-xl cursor-pointer bg-transparent border-0"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'print') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Configurar Recibo</h2>
        </div>
        <div className="bg-white rounded-[3rem] p-8 space-y-6 shadow-sm border border-slate-100">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Termo de Garantia Padrão</label>
            <textarea value={settings.pdfWarrantyText} onChange={(e) => updateSetting('pdfWarrantyText', e.target.value)} rows={5} className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none text-sm font-medium leading-relaxed" />
          </div>
          <button onClick={() => setView('main')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Salvar Alterações</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {saveMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20">
              <Check size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{saveMessage}</span>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Ajustes</h2>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-all">
            <MoreVertical size={24} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 py-4 overflow-hidden">
                <button onClick={() => { setView('theme'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <Palette size={18} /> Aparência Global
                </button>
                <button onClick={() => { setView('print'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <FileText size={18} /> Dados do Recibo
                </button>
                <button onClick={() => { setView('users'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <Users size={18} /> Gestão de Equipe
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 py-10">
        <div className="flex flex-col items-center gap-6 mb-4">
          <button onClick={triggerUpload} className="relative group active:scale-95 transition-transform">
            <div className="w-44 h-44 bg-white rounded-[3rem] border-[8px] border-white shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-slate-100">
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" /> : <ImageIcon size={64} className="text-slate-200" />}
            </div>
            <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-4 rounded-3xl border-4 border-white shadow-xl group-hover:scale-110 transition-all"><Camera size={20} /></div>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="w-full text-center space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Empresa</label>
             <input type="text" value={settings.storeName} onChange={(e) => updateSetting('storeName', e.target.value)} className="w-full px-8 py-5 bg-white border-none rounded-[2rem] font-black text-xl text-slate-800 text-center shadow-sm outline-none" />
          </div>

          <div className="w-full space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1.5"><MapPin size={12}/> Endereço Comercial</label>
             <input type="text" value={settings.storeAddress || ''} onChange={(e) => updateSetting('storeAddress', e.target.value)} className="w-full px-6 py-4 bg-white border-none rounded-2xl font-bold text-sm text-slate-800 shadow-sm outline-none" />
          </div>

          <div className="w-full space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1.5"><Phone size={12}/> Telefone de Contato</label>
             <input type="text" value={settings.storePhone || ''} onChange={(e) => updateSetting('storePhone', e.target.value)} className="w-full px-6 py-4 bg-white border-none rounded-2xl font-bold text-sm text-slate-800 shadow-sm outline-none" />
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border flex items-center gap-5 transition-all ${isCloudConnected ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'} mt-8 shadow-sm`}>
            <div className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${isCloudConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isCloudConnected ? <Check size={28} /> : <AlertCircle size={28} />}
            </div>
            <div>
              <p className={`text-xs font-black uppercase ${isCloudConnected ? 'text-emerald-800' : 'text-red-800'}`}>
                {isCloudConnected ? 'Sincronização Ativa' : 'Banco de Dados Local'}
              </p>
              <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1 font-black leading-tight">Backup em tempo real no SQL</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsTab;
