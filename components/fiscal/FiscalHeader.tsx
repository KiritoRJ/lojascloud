import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Wifi, 
  Building2, 
  Calendar, 
  FileText, 
  Package, 
  Wrench, 
  Activity, 
  Layers, 
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Tag
} from 'lucide-react';
import { AppSettings, CertificateA1Data } from '../../types';

interface FiscalHeaderProps {
  settings: AppSettings;
  certificate?: CertificateA1Data;
  activeSubTab: string;
  onSelectSubTab: (tab: any) => void;
  stats: {
    nfeCount: number;
    nfceCount: number;
    nfseCount: number;
    eventsCount: number;
    xmlCount: number;
    pendingCount: number;
  };
  environment: 'homologacao' | 'producao';
  onChangeEnvironment?: (env: 'homologacao' | 'producao') => void;
  onOpenCertModal?: () => void;
}

export const FiscalHeader: React.FC<FiscalHeaderProps> = ({
  settings,
  certificate,
  activeSubTab,
  onSelectSubTab,
  stats,
  environment,
  onChangeEnvironment,
  onOpenCertModal
}) => {
  const isCertValid = certificate?.hasCertificate && certificate.status === 'valid';
  const isCertExpiring = certificate?.hasCertificate && certificate.status === 'expiring_soon';
  const isCertExpired = certificate?.hasCertificate && certificate.status === 'expired';

  const menuItems = [
    { id: 'nfe', label: 'NF-e', badge: stats.nfeCount, desc: 'Modelo 55 • Mercantil & B2B', icon: FileText },
    { id: 'nfce', label: 'NFC-e', badge: stats.nfceCount, desc: 'Modelo 65 • Cupom PDV', icon: Package },
    { id: 'nfse', label: 'NFS-e', badge: stats.nfseCount, desc: 'Serviços & O.S. • LC 116', icon: Wrench },
    { id: 'perfis', label: 'Regras Fiscais', desc: 'Perfis Tributários • CSOSN • CST', icon: Tag },
    { id: 'eventos', label: 'Eventos', badge: stats.eventsCount, desc: 'CC-e • Cancelamentos • Inutilização', icon: Activity },
    { id: 'xml', label: 'XML', badge: stats.xmlCount, desc: 'Entrada • Estoque • ZIP Contador', icon: Layers },
    { id: 'certificado', label: 'Certificado', desc: 'Certificado Digital A1 (.pfx)', icon: ShieldCheck, isCert: true },
    { id: 'auditoria', label: 'Auditoria', desc: 'SEFAZ • Regras • Validações', icon: Sparkles }
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner do Módulo Fiscal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Informações da Empresa & Status */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black tracking-tight uppercase">Módulo Fiscal & Tributário</h1>
                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  environment === 'producao' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                }`}>
                  SEFAZ {environment === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO / TESTES'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {settings.storeName} • CNPJ: <span className="font-mono font-bold text-white">{settings.storeCnpj || '00.000.000/0001-00'}</span>
                {settings.storeStateRegistration && <span> • IE: <span className="font-mono text-slate-200">{settings.storeStateRegistration}</span></span>}
              </p>
            </div>
          </div>

          {/* Badges de Status & Ambiente */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {/* Certificado Status Badge */}
            <button
              type="button"
              onClick={() => onSelectSubTab('certificado')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isCertValid 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : isCertExpiring
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60 animate-pulse'
                  : isCertExpired
                  ? 'bg-red-950/60 border-red-500/40 text-red-300 hover:bg-red-900/60'
                  : 'bg-slate-800/80 border-slate-600/60 text-slate-300 hover:bg-slate-700/80'
              }`}
              title="Clique para gerenciar o Certificado Digital A1"
            >
              {isCertValid ? (
                <ShieldCheck size={14} className="text-emerald-400" />
              ) : isCertExpired ? (
                <ShieldAlert size={14} className="text-red-400" />
              ) : (
                <AlertTriangle size={14} className="text-amber-400" />
              )}
              <span>
                {certificate?.hasCertificate 
                  ? `A1: ${certificate.daysRemaining ?? 0}d restantes` 
                  : 'Certificado A1: Pendente'}
              </span>
            </button>

            {/* SEFAZ WebService Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>SEFAZ Online</span>
            </div>

            {/* Alternador de Ambiente */}
            {onChangeEnvironment && (
              <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => onChangeEnvironment('homologacao')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    environment === 'homologacao'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Testes
                </button>
                <button
                  type="button"
                  onClick={() => onChangeEnvironment('producao')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    environment === 'producao'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Produção
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Rápido de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 pt-4 border-t border-slate-700/60">
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">NF-e (Mod. 55)</p>
            <p className="text-base font-black text-white">{stats.nfeCount} <span className="text-[10px] font-normal text-slate-400">emitidas</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">NFC-e (Mod. 65)</p>
            <p className="text-base font-black text-emerald-400">{stats.nfceCount} <span className="text-[10px] font-normal text-slate-400">cupons</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">NFS-e (Serviços)</p>
            <p className="text-base font-black text-blue-400">{stats.nfseCount} <span className="text-[10px] font-normal text-slate-400">notas</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Eventos / CC-e</p>
            <p className="text-base font-black text-amber-400">{stats.eventsCount} <span className="text-[10px] font-normal text-slate-400">registros</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">XMLs Gerenciados</p>
            <p className="text-base font-black text-purple-400">{stats.xmlCount} <span className="text-[10px] font-normal text-slate-400">arquivos</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Certificado A1</p>
            <p className={`text-base font-black truncate ${isCertValid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {certificate?.hasCertificate ? (certificate.daysRemaining ? `${certificate.daysRemaining}d` : 'Ativo') : 'Pendente'}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Abas Fiscais (Submenu Estruturado conforme solicitado) */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {menuItems.map(item => {
          const isActive = activeSubTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSubTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.isCert && isCertExpiring && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
