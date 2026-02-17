
import React, { useState, useEffect } from 'react';
import { Store, Image as ImageIcon, Camera, FileText, Type, Palette, MoveHorizontal, MoreVertical, ArrowLeft, Check, Layout, Pipette, Tags, X, AlertCircle, Users, Shield, UserPlus, Trash2, User as UserIcon, Loader2 } from 'lucide-react';
import { AppSettings, User } from '../types';

interface Props {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  isCloudConnected?: boolean;
  currentUser: User;
  onSwitchProfile: (user: User) => void;
}

const SettingsTab: React.FC<Props> = ({ settings, setSettings, isCloudConnected = true, currentUser, onSwitchProfile }) => {
  const [view, setView] = useState<'main' | 'print' | 'theme' | 'users'>('main');
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // User Management Local State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'tecnico' | 'vendedor'>('tecnico');
  const [newUserPhoto, setNewUserPhoto] = useState<string | null>(null);

  const triggerSaveFeedback = (msg: string = "Configurações Salvas!") => {
    setIsSaving(true);
    setSaveMessage(msg);
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage(null);
    }, 2000);
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    // Embora o App.tsx já salve, aqui garantimos a percepção do usuário
    if (view !== 'users') triggerSaveFeedback();
  };

  const triggerUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => updateSetting('logoUrl', reader.result as string);
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
        reader.onloadend = () => setNewUserPhoto(reader.result as string);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCreateUser = () => {
    if (!newUserName) return;
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUserName,
      role: newUserRole,
      photo: newUserPhoto
    };
    const updatedUsers = [...settings.users, newUser];
    updateSetting('users', updatedUsers);
    setIsUserModalOpen(false);
    setNewUserName('');
    setNewUserPhoto(null);
    triggerSaveFeedback("Perfil Criado com Sucesso!");
  };

  const handleDeleteUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'adm_1') return alert('O administrador principal não pode ser excluído.');
    if (confirm('Deseja excluir este perfil permanentemente?')) {
      const updatedUsers = settings.users.filter(u => u.id !== id);
      updateSetting('users', updatedUsers);
      triggerSaveFeedback("Perfil Removido!");
    }
  };

  if (view === 'users') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">GERENCIAR PERFIS</h2>
          </div>
          <button onClick={() => setIsUserModalOpen(true)} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-90"><UserPlus size={24} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.users.map(user => (
            <div key={user.id} onClick={() => { onSwitchProfile(user); triggerSaveFeedback(`Perfil: ${user.name}`); }} className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer group relative flex items-center justify-between ${user.id === currentUser.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white/50 border-slate-100 shadow-sm hover:border-blue-200'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user.photo ? (
                    <img src={user.photo} className="w-16 h-16 rounded-3xl object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center border-2 border-white shadow-md"><UserIcon size={32} /></div>
                  )}
                  {user.role === 'admin' && <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border-2 border-white"><Shield size={12} /></div>}
                </div>
                <div>
                  <h3 className={`font-black uppercase text-xs ${user.id === currentUser.id ? 'text-blue-600' : 'text-slate-800'}`}>{user.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              {user.id !== currentUser.id && user.id !== 'adm_1' && (
                <button onClick={(e) => handleDeleteUser(user.id, e)} className="p-3 text-red-400 hover:text-red-600 bg-red-50 rounded-2xl transition-colors"><Trash2 size={20} /></button>
              )}
              {user.id === currentUser.id && (<span className="text-[8px] font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/30">Ativo</span>)}
            </div>
          ))}
        </div>

        {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end md:justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm mx-auto rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Perfil</h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center gap-3">
                  <button onClick={triggerUserPhotoUpload} className="relative active:scale-95 transition-transform group">
                    <div className="w-28 h-28 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {newUserPhoto ? <img src={newUserPhoto} className="w-full h-full object-cover" /> : <Camera className="text-slate-200" size={40} />}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-2xl border-4 border-white shadow-xl group-hover:scale-110 transition-all"><Camera size={14} /></div>
                  </button>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Foto do Colaborador</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo</label>
                    <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black uppercase text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Função no App</label>
                    <div className="flex gap-2">
                      <button onClick={() => setNewUserRole('tecnico')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${newUserRole === 'tecnico' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>TÉCNICO</button>
                      <button onClick={() => setNewUserRole('vendedor')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${newUserRole === 'vendedor' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>VENDEDOR</button>
                    </div>
                  </div>
                </div>
                <button onClick={handleCreateUser} disabled={!newUserName} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all uppercase text-[10px] tracking-widest disabled:opacity-30">Confirmar SQL</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'theme') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight text-custom-primary">PERSONALIZAÇÃO</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Cor Primária', key: 'themePrimary', desc: 'Botões e Destaques', icon: Palette },
            { label: 'Cor do Menu', key: 'themeSidebar', desc: 'Sidebar Lateral (PC)', icon: Layout },
            { label: 'Cor de Fundo', key: 'themeBg', desc: 'Cor Principal do App', icon: Pipette },
            { label: 'Cor das Abas Ativas', key: 'themeBottomTab', desc: 'Menu Inferior (Mobile)', icon: MoveHorizontal },
          ].map((item) => (
            <div key={item.key} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><item.icon size={20} /></div>
                <div>
                  <p className="font-black text-slate-800 text-xs uppercase tracking-widest">{item.label}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <input 
                   type="color" 
                   value={(settings as any)[item.key] || '#000000'} 
                   onChange={(e) => updateSetting(item.key as any, e.target.value)}
                   className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0"
                 />
                 <span className="font-mono text-xs font-black text-slate-400 uppercase">{(settings as any)[item.key]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl">
           <div>
              <p className="font-black text-sm uppercase tracking-widest mb-1">Preview Real-time</p>
              <p className="text-xs text-slate-400 opacity-80">As alterações são aplicadas instantaneamente.</p>
           </div>
           <button onClick={() => { setView('main'); triggerSaveFeedback(); }} className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest">SALVAR</button>
        </div>
      </div>
    );
  }

  if (view === 'print') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('main')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AJUSTES DO CUPOM</h2>
        </div>
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><FileText size={12}/> Termos de Garantia (Rodapé)</label>
              <textarea value={settings.pdfWarrantyText} onChange={(e) => updateSetting('pdfWarrantyText', e.target.value)} rows={3} className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none text-sm font-medium" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-50 pt-8">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Tags size={12}/> Títulos das Seções</label>
                <div className="space-y-4">
                  {[
                    { key: 'receiptHeaderSubtitle', label: 'Subtítulo do Topo' },
                    { key: 'receiptLabelProtocol', label: 'Rótulo Protocolo/OS' },
                    { key: 'receiptLabelDate', label: 'Rótulo de Data' },
                    { key: 'receiptLabelClientSection', label: 'Título Seção Cliente' },
                    { key: 'receiptLabelServiceSection', label: 'Título Seção Equipamento' },
                    { key: 'receiptLabelEntryPhotos', label: 'Título Fotos Entrada' },
                    { key: 'receiptLabelExitPhotos', label: 'Título Fotos Saída' },
                    { key: 'receiptLabelTotal', label: 'Rótulo Valor Total' },
                  ].map((field) => (
                    <div key={field.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{field.label}</p>
                      <input 
                        value={(settings as any)[field.key] || ''} 
                        onChange={(e) => updateSetting(field.key as any, e.target.value)} 
                        placeholder="Deixe vazio para ocultar"
                        className="w-full bg-transparent font-bold text-slate-800 outline-none text-xs" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Type size={12}/> Rótulos de Campos</label>
                <div className="space-y-4">
                  {[
                    { key: 'receiptLabelClientName', label: 'Rótulo Nome Cliente' },
                    { key: 'receiptLabelClientPhone', label: 'Rótulo Telefone' },
                    { key: 'receiptLabelClientAddress', label: 'Rótulo Endereço' },
                    { key: 'receiptLabelDevice', label: 'Rótulo Aparelho' },
                    { key: 'receiptLabelDefect', label: 'Rótulo Defeito' },
                    { key: 'receiptLabelRepair', label: 'Rótulo Reparo Realizado' },
                  ].map((field) => (
                    <div key={field.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{field.label}</p>
                      <input 
                        value={(settings as any)[field.key] || ''} 
                        onChange={(e) => updateSetting(field.key as any, e.target.value)} 
                        className="w-full bg-transparent font-bold text-slate-800 outline-none text-xs" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-900 flex justify-end">
               <button onClick={() => { setView('main'); triggerSaveFeedback(); }} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">SALVAR CUPOM</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Toast de Feedback */}
      {saveMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in">
           <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{saveMessage}</span>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between relative">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">CONFIGURAÇÕES</h2>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 transition-all active:scale-90"><MoreVertical size={24} /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 py-4 animate-in zoom-in-95 duration-200">
                <button onClick={() => { setView('theme'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Palette size={18} /></div>Personalização
                </button>
                <button onClick={() => { setView('print'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><FileText size={18} /></div>Cupom Fiscal
                </button>
                <button onClick={() => { setView('users'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest text-left">
                  <div className="p-2 bg-purple-50 text-purple-500 rounded-xl"><Users size={18} /></div>Gestão de Perfis
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-12 py-10">
        <div className="flex flex-col items-center gap-6">
          <button onClick={triggerUpload} className="relative group">
            <div className="w-44 h-44 bg-white rounded-[3rem] border-[8px] border-white shadow-2xl flex items-center justify-center overflow-hidden transition-transform active:scale-95 ring-1 ring-slate-100">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={64} className="text-slate-200" />
              )}
            </div>
            <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-4 rounded-3xl border-4 border-white shadow-xl group-hover:scale-110 transition-all"><Camera size={20} /></div>
          </button>
          <div className="w-full text-center space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Título do Painel</label>
             <input type="text" value={settings.storeName} onChange={(e) => updateSetting('storeName', e.target.value)} onBlur={() => triggerSaveFeedback()} className="w-full px-8 py-6 bg-white border-none rounded-[2.5rem] font-black text-3xl text-slate-800 text-center shadow-sm placeholder:text-slate-200 outline-none" />
          </div>
        </div>

        <div className="space-y-6">
           <div className={`p-8 rounded-[2.5rem] border flex items-center gap-5 transition-colors duration-300 ${isCloudConnected ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
              <div className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${isCloudConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {isCloudConnected ? <Check size={28} /> : <AlertCircle size={28} />}
              </div>
              <div>
                <p className={`text-xs font-bold ${isCloudConnected ? 'text-emerald-800' : 'text-red-800'}`}>
                  {isCloudConnected ? 'Dados sincronizados na nuvem' : 'Servidor da nuvem não está conectado'}
                </p>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1 font-black">Sincronização SQL Real-Time</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
