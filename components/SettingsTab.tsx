
import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, Camera, FileText, Palette, MoveHorizontal, MoreVertical, ArrowLeft, Check, Layout, Pipette, X, AlertCircle, Users, Shield, UserPlus, Trash2, User as UserIcon, Loader2, Lock, MapPin, Phone, KeyRound, Briefcase } from 'lucide-react';
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
  const isAdmin = useMemo(() => currentUser.role === 'admin' || (currentUser as any).role === 'super', [currentUser]);
  
  const [view, setView] = useState<'main' | 'print' | 'theme' | 'users'>('main');
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [pendingUserToSwitch, setPendingUserToSwitch] = useState<User | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhoto, setNewUserPhoto] = useState<string | null>(null);
  const [newUserSpecialty, setNewUserSpecialty] = useState<'Vendedor' | 'Técnico' | 'Outros'>('Técnico');

  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (user.id === currentUser.id) return;

    if (user.role === 'admin') {
      setPendingUserToSwitch(user);
      setIsAuthModalOpen(true);
    } else {
      if (isAdmin) {
        onSwitchProfile(user);
      } else {
        setPendingUserToSwitch(user);
        setIsAuthModalOpen(true);
      }
    }
  };

  const verifyAdminPassword = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setAuthError(false);
    
    if (!tenantId) {
        setAuthError(true);
        setIsVerifying(false);
        return;
    }

    const result = await OnlineDB.verifyAdminPassword(tenantId, authPassword);
    
    if (result.success) {
      if (pendingUserToSwitch) {
        onSwitchProfile(pendingUserToSwitch);
      }
      setIsAuthModalOpen(false);
      setAuthPassword('');
      setPendingUserToSwitch(null);
    } else {
      setAuthError(true);
      setAuthPassword('');
      setTimeout(() => setAuthError(false), 2000);
    }

    setIsVerifying(false);
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

  const triggerUpload = () => {
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

  const handleCreateUser = async () => {
    if (!isAdmin) return;
    if (!newUserName) return alert('O nome é obrigatório.');
    if (!tenantId) return alert('Erro interno: Tenant ID não encontrado.');
    
    setIsSaving(true);
    const userId = 'USR_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newUser: User = {
      id: userId,
      name: newUserName,
      role: 'colaborador',
      password: '', // Sem senha para colaboradores simples por padrão
      photo: newUserPhoto,
      specialty: newUserSpecialty
    };

    try {
      const res = await OnlineDB.upsertUser(tenantId, settings.storeName, newUser);
      
      if (res.success) {
        const updatedUsers = [...settings.users, { ...newUser, username: res.username }];
        setSettings({ ...settings, users: updatedUsers });
        
        setIsUserModalOpen(false);
        setNewUserName('');
        setNewUserPhoto(null);
        setNewUserSpecialty('Técnico');
        triggerSaveFeedback("Perfil Criado!");
      } else {
        alert("Erro no Banco: " + res.message);
      }
    } catch (e: any) {
      alert("Erro fatal ao salvar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const result = await OnlineDB.deleteRemoteUser(userToDelete.id);
      if (result.success) {
        const updatedUsers = settings.users.filter(u => u.id !== userToDelete.id);
        setSettings({ ...settings, users: updatedUsers });
        setUserToDelete(null);
        triggerSaveFeedback("Perfil Removido!");
      } else {
        alert(`Falha ao remover: ${result.message}`);
      }
    } catch (err: any) {
      alert("Erro de conexão com o banco.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (view === 'users') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500 pb-24 h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Equipe da Loja</h2>
          </div>
          {isAdmin && (
            <button onClick={() => setIsUserModalOpen(true)} className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-90 transition-all">
              <UserPlus size={24} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {settings.users.map(user => (
            <div 
              key={user.id} 
              onClick={() => handleSwitchAttempt(user)} 
              className={`p-5 rounded-[2.5rem] border transition-all cursor-pointer relative flex items-center justify-between shadow-sm overflow-hidden ${user.id === currentUser.id ? 'bg-white border-blue-500 ring-4 ring-blue-50' : 'bg-[#f1f1f1] border-transparent hover:bg-white hover:border-blue-200'}`}
            >
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {user.photo ? (
                    <img src={user.photo} className="w-14 h-14 rounded-3xl object-cover border-2 border-white shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-200 text-slate-400 rounded-3xl flex items-center justify-center border-2 border-white">
                      <UserIcon size={24} />
                    </div>
                  )}
                  {user.role === 'admin' && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border-2 border-white shadow-sm">
                      <Shield size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className={`font-black uppercase text-xs tracking-tight mb-1 ${user.id === currentUser.id ? 'text-blue-600' : 'text-slate-800'}`}>
                    {user.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {user.specialty || (user.role === 'admin' ? 'Administrador' : 'Colaborador')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {user.id === currentUser.id ? (
                  <span className="text-[9px] font-black text-white bg-blue-600 px-5 py-2 rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-500/20">Logado</span>
                ) : (
                  isAdmin && (user.role === 'colaborador') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUserToDelete({ id: user.id, name: user.name }); }} 
                      className="p-3 bg-white text-red-500 rounded-xl border border-slate-200 shadow-sm active:scale-90 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 size={20} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {userToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 border border-slate-100">
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Trash2 size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-slate-800 uppercase text-lg">Remover Colaborador?</h3>
                  <p className="text-slate-400 text-sm font-bold uppercase leading-tight px-4">
                    Deseja apagar permanentemente o perfil de <span className="text-red-600 font-black">"{userToDelete.name}"</span>?
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleConfirmDelete} 
                    disabled={isDeleting}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Exclusão'}
                  </button>
                  <button 
                    onClick={() => setUserToDelete(null)} 
                    disabled={isDeleting}
                    className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
             <div className="bg-white w-full max-w-xs rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 border border-slate-100">
                <div className="w-20 h-20 bg-slate-100 text-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                   <Lock size={36} />
                </div>
                <h3 className="text-center font-black text-slate-800 uppercase text-sm mb-1">Acesso Restrito</h3>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-10 leading-tight">Trocar perfil requer<br/>senha do ADM da Loja</p>
                
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
                
                {authError && <p className="text-center text-[9px] font-black text-red-500 uppercase mb-4 animate-bounce">Senha Incorreta!</p>}

                <div className="flex flex-col gap-2">
                   <button onClick={verifyAdminPassword} disabled={isVerifying} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50">
                     {isVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Validar Gerente'}
                   </button>
                   <button onClick={() => { setIsAuthModalOpen(false); setAuthPassword(''); setPendingUserToSwitch(null); }} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                </div>
             </div>
          </div>
        )}

        {isUserModalOpen && isAdmin && (
          <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end md:justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm mx-auto rounded-[3.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-100">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Colaborador</h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 p-3 bg-slate-50 rounded-full active:scale-90"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center gap-3">
                  <button onClick={triggerUserPhotoUpload} className="relative group">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden active:scale-95 transition-transform">
                      {newUserPhoto ? <img src={newUserPhoto} className="w-full h-full object-cover" /> : <Camera className="text-slate-200" size={32} />}
                    </div>
                  </button>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Foto do Perfil</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo</label>
                    <input 
                      value={newUserName} 
                      onChange={(e) => setNewUserName(e.target.value)} 
                      placeholder="NOME DO PROFISSIONAL" 
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black uppercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Cargo / Função</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Vendedor', 'Técnico', 'Outros'].map((spec) => (
                        <button
                          key={spec}
                          onClick={() => setNewUserSpecialty(spec as any)}
                          className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition-all ${
                            newUserSpecialty === spec 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                            : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCreateUser} 
                  disabled={isSaving} 
                  className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : 'Cadastrar Perfil'}
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Cores do App</h2>
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Garantia</h2>
        </div>
        <div className="bg-white rounded-[3rem] p-8 space-y-6 shadow-sm border border-slate-100">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Termo de Garantia Padrão</label>
            <textarea value={settings.pdfWarrantyText} onChange={(e) => updateSetting('pdfWarrantyText', e.target.value)} rows={5} className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none text-sm font-medium leading-relaxed" />
          </div>
          <button onClick={() => setView('main')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Salvar</button>
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
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">AJUSTES</h2>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-4 bg-slate-100 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-all">
            <MoreVertical size={24} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 py-4 overflow-hidden animate-in zoom-in-95 origin-top-right">
                <button onClick={() => { setView('theme'); setShowMenu(false); }} className={`w-full flex items-center gap-4 px-6 py-5 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left border-l-4 ${view === 'theme' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                  <Palette size={18} /> Aparência Global
                </button>
                <button onClick={() => { setView('print'); setShowMenu(false); }} className={`w-full flex items-center gap-4 px-6 py-5 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left border-l-4 ${view === 'print' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                  <FileText size={18} /> Dados do Recibo
                </button>
                <button onClick={() => { setView('users'); setShowMenu(false); }} className={`w-full flex items-center gap-4 px-6 py-5 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left border-l-4 ${view === 'users' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                  <Users size={18} /> Gestão de Equipe
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 py-10 relative">
        <div className="flex flex-col items-center gap-6 mb-4">
          <div className="relative group active:scale-95 transition-transform">
            <div className="w-52 h-52 bg-white rounded-[3.5rem] border-[10px] border-white shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-slate-100">
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" /> : <ImageIcon size={64} className="text-slate-100" />}
            </div>
            <button onClick={triggerUpload} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-5 rounded-full border-4 border-white shadow-xl hover:scale-110 transition-all">
              <Camera size={24} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-10">
          <div className="w-full space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center w-full block">Nome da Empresa</label>
             <input type="text" value={settings.storeName} onChange={(e) => updateSetting('storeName', e.target.value)} className="w-full px-8 py-6 bg-white border-none rounded-[2.5rem] font-black text-2xl text-slate-800 text-center shadow-xl shadow-slate-200/20 outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
          </div>

          <div className="w-full space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1.5"><MapPin size={12}/> Endereço Comercial</label>
             <input type="text" value={settings.storeAddress || ''} onChange={(e) => updateSetting('storeAddress', e.target.value)} className="w-full px-8 py-5 bg-white border-none rounded-[2rem] font-bold text-sm text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
          </div>

          <div className="w-full space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1.5"><Phone size={12}/> Telefone de Contato</label>
             <input type="text" value={settings.storePhone || ''} onChange={(e) => updateSetting('storePhone', e.target.value)} className="w-full px-8 py-5 bg-white border-none rounded-[2rem] font-bold text-sm text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
          </div>
        </div>

        <div className={`p-8 rounded-[3rem] border flex items-center gap-5 transition-all ${isCloudConnected ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'} mt-12 shadow-sm`}>
            <div className={`w-16 h-16 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shrink-0 ${isCloudConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isCloudConnected ? <Check size={32} /> : <AlertCircle size={32} />}
            </div>
            <div>
              <p className={`text-sm font-black uppercase tracking-tight ${isCloudConnected ? 'text-emerald-800' : 'text-red-800'}`}>
                {isCloudConnected ? 'Sincronização Ativa' : 'Banco de Dados Local'}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-black leading-tight">Backup em tempo real no SQL Supabase</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsTab;
