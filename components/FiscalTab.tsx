import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Package, 
  Wrench, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  AppSettings, 
  Sale, 
  Product, 
  Customer, 
  ServiceOrder, 
  NfceNfeItem, 
  CertificateA1Data 
} from '../types';
import { FiscalHeader } from './fiscal/FiscalHeader';
import { NfeSection } from './fiscal/NfeSection';
import { NfceSection } from './fiscal/NfceSection';
import { NfseSection } from './fiscal/NfseSection';
import { EventosSection } from './fiscal/EventosSection';
import { XmlSection } from './fiscal/XmlSection';
import { CertificadoSection } from './fiscal/CertificadoSection';
import { AuditoriaSection } from './fiscal/AuditoriaSection';
import { PerfisTributariosSection } from './fiscal/PerfisTributariosSection';

interface FiscalTabProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  sales?: Sale[];
  products?: Product[];
  setProducts?: (products: Product[]) => void;
  customers?: Customer[];
  serviceOrders?: ServiceOrder[];
  tenantId?: string;
  initialSubTab?: 'nfe' | 'nfce' | 'nfse' | 'perfis' | 'eventos' | 'xml' | 'certificado' | 'auditoria';
  onBack?: () => void;
}

export const FiscalTab: React.FC<FiscalTabProps> = ({
  settings,
  setSettings,
  sales = [],
  products = [],
  setProducts = () => {},
  customers = [],
  serviceOrders = [],
  tenantId = '',
  initialSubTab = 'nfce',
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'nfe' | 'nfce' | 'nfse' | 'perfis' | 'eventos' | 'xml' | 'certificado' | 'auditoria'>(initialSubTab);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega e sincroniza as Notas Emitidas (NF-e e NFC-e) - Sem notas de teste fictícias
  const [notes, setNotes] = useState<NfceNfeItem[]>(() => {
    const saved = localStorage.getItem(`fiscal_notes_${tenantId || 'global'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove quaisquer notas de teste criadas anteriormente
          const cleaned = parsed.filter(n => n && !n.id?.startsWith('doc_init_') && n.id !== 'doc_init_01');
          localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const saveNotes = (updated: NfceNfeItem[]) => {
    setNotes(updated);
    localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updated));
  };

  const environment = settings.nfceNfeConfig?.environment || 'homologacao';
  const handleChangeEnvironment = (newEnv: 'homologacao' | 'producao') => {
    const updated = {
      ...settings,
      nfceNfeConfig: settings.nfceNfeConfig 
        ? { ...settings.nfceNfeConfig, environment: newEnv }
        : {
            environment: newEnv,
            provider: 'sefaz_direta' as const,
            apiKey: '',
            companyName: settings.storeName,
            cnpj: settings.storeCnpj || '00.000.000/0001-00',
            ie: settings.storeStateRegistration || 'ISENTO',
            cityIbgeCode: '3550308',
            cityName: 'São Paulo',
            uf: 'SP',
            cnae: '4752-1/00',
            taxRegime: 'simples_nacional' as const,
            csosnDefault: '102',
            cfopDefault: '5102',
            ncmDefault: '8517.79.00',
            icmsDefaultRate: 0,
            nfceSeries: '1',
            nfceNextNumber: 1,
            nfeSeries: '1',
            nfeNextNumber: 1,
            cscId: '000001',
            cscCode: ''
          }
    };
    setSettings(updated);
    showToast(`Ambiente SEFAZ alterado para ${newEnv.toUpperCase()}`, 'info');
  };

  const eventsCount = (() => {
    try {
      const saved = localStorage.getItem(`fiscal_events_${tenantId || 'global'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {}
    return 0;
  })();

  const xmlCount = (() => {
    try {
      const saved = localStorage.getItem(`fiscal_xmls_${tenantId || 'global'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {}
    return 0;
  })();

  const stats = {
    nfeCount: notes.filter(n => n.docType === 'nfe').length,
    nfceCount: notes.filter(n => n.docType === 'nfce').length,
    nfseCount: (settings.nfseConfig?.rpsNextNumber || 1) - 1,
    eventsCount,
    xmlCount,
    pendingCount: notes.filter(n => n.status === 'processing').length
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-black uppercase tracking-wider animate-in slide-in-from-bottom-2 ${
          toastMessage.type === 'success' 
            ? 'bg-slate-900 text-emerald-400 border-emerald-500/40' 
            : toastMessage.type === 'error'
            ? 'bg-red-950 text-red-300 border-red-500/40'
            : 'bg-slate-900 text-blue-300 border-blue-500/40'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Fiscal e Sub-Navegação */}
      <FiscalHeader
        settings={settings}
        certificate={settings.certificateA1}
        activeSubTab={activeSubTab}
        onSelectSubTab={(tab) => setActiveSubTab(tab)}
        stats={stats}
        environment={environment}
        onChangeEnvironment={handleChangeEnvironment}
      />

      {/* RENDERIZAÇÃO DO SUBMÓDULO ATIVO CONFORME A ESTRUTURA FISCAL */}
      <div className="transition-all">
        {activeSubTab === 'nfe' && (
          <NfeSection
            settings={settings}
            setSettings={setSettings}
            products={products}
            customers={customers}
            sales={sales}
            tenantId={tenantId}
            notes={notes}
            setNotes={saveNotes}
            onShowToast={showToast}
          />
        )}

        {activeSubTab === 'nfce' && (
          <NfceSection
            settings={settings}
            setSettings={setSettings}
            products={products}
            customers={customers}
            sales={sales}
            tenantId={tenantId}
            notes={notes}
            setNotes={saveNotes}
            onShowToast={showToast}
          />
        )}

        {activeSubTab === 'nfse' && (
          <NfseSection
            settings={settings}
            setSettings={setSettings as any}
            serviceOrders={serviceOrders}
            customers={customers}
            tenantId={tenantId}
            onBack={() => setActiveSubTab('nfce')}
          />
        )}

        {activeSubTab === 'perfis' && (
          <PerfisTributariosSection
            tenantId={tenantId}
            showToast={showToast}
          />
        )}

        {activeSubTab === 'eventos' && (
          <EventosSection
            settings={settings}
            tenantId={tenantId}
            notes={notes}
            onShowToast={showToast}
          />
        )}

        {activeSubTab === 'xml' && (
          <XmlSection
            settings={settings}
            products={products}
            setProducts={setProducts}
            tenantId={tenantId}
            notes={notes}
            onShowToast={showToast}
          />
        )}

        {activeSubTab === 'certificado' && (
          <CertificadoSection
            settings={settings}
            setSettings={setSettings}
            tenantId={tenantId}
            onShowToast={showToast}
          />
        )}

        {activeSubTab === 'auditoria' && (
          <AuditoriaSection
            settings={settings}
            products={products}
            setProducts={setProducts}
            notes={notes}
            tenantId={tenantId}
            onShowToast={showToast}
          />
        )}
      </div>
    </div>
  );
};
