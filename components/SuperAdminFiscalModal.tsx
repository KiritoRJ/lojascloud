import React, { useState, useEffect, useRef } from 'react';
import { 
  Receipt, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  Search, RefreshCw, Trash2, ArrowRight, ShieldCheck, Database, 
  FileText, Sparkles, Loader2, X, Plus, HelpCircle, Layers, Check, Copy,
  Lock, Eye, EyeOff, ShieldAlert, AlertOctagon
} from 'lucide-react';
import { 
  parseFiscalFile, 
  loadFiscalDatasets, 
  saveFiscalDatasets, 
  clearAllFiscalDatasets,
  findMatchingFiscalData, 
  DEFAULT_NCM_LIST, 
  DEFAULT_CEST_LIST, 
  DEFAULT_CFOP_LIST,
  ParseResult
} from '../utils/fiscalDatabase';
import { FiscalNcmRecord, FiscalCestRecord, FiscalCfopRecord, FiscalMatchResult } from '../types';
import { supabase } from '../utils/api';

interface SuperAdminFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: any[];
  initialTab?: 'import' | 'records' | 'sync' | 'test';
}

const FISCAL_SQL_SCRIPT = `-- SCRIPT DEDICADO DE TABELAS FISCAIS
CREATE TABLE IF NOT EXISTS public.fiscal_ncm (
    code VARCHAR(20) PRIMARY KEY,
    description TEXT NOT NULL,
    cfop VARCHAR(10) DEFAULT '5102',
    cest VARCHAR(20),
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fiscal_cest (
    code VARCHAR(20) PRIMARY KEY,
    ncm VARCHAR(20),
    description TEXT NOT NULL,
    segment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fiscal_cfop (
    code VARCHAR(10) PRIMARY KEY,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'saida',
    application TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS
ALTER TABLE public.fiscal_ncm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_cest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_cfop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ncm_read" ON public.fiscal_ncm FOR SELECT USING (true);
CREATE POLICY "ncm_write" ON public.fiscal_ncm FOR ALL USING (true);
CREATE POLICY "cest_read" ON public.fiscal_cest FOR SELECT USING (true);
CREATE POLICY "cest_write" ON public.fiscal_cest FOR ALL USING (true);
CREATE POLICY "cfop_read" ON public.fiscal_cfop FOR SELECT USING (true);
CREATE POLICY "cfop_write" ON public.fiscal_cfop FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';`;

export const SuperAdminFiscalModal: React.FC<SuperAdminFiscalModalProps> = ({
  isOpen,
  onClose,
  tenants,
  initialTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'records' | 'sync' | 'test'>(initialTab || 'import');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSqlScriptModal, setShowSqlScriptModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Confirmação de Limpeza com Senha
  const [showClearPasswordModal, setShowClearPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Datasets em memória
  const [ncmList, setNcmList] = useState<FiscalNcmRecord[]>([]);
  const [cestList, setCestList] = useState<FiscalCestRecord[]>([]);
  const [cfopList, setCfopList] = useState<FiscalCfopRecord[]>([]);

  // Importação de arquivo com locais dedicados
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputNcmRef = useRef<HTMLInputElement>(null);
  const fileInputCestRef = useRef<HTMLInputElement>(null);
  const fileInputCfopRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParseResult | null>(null);
  const [activeImportMode, setActiveImportMode] = useState<'ncm' | 'cest' | 'cfop' | 'auto'>('ncm');

  // Testador interativo de produtos
  const [testProductName, setTestProductName] = useState('Arroz Branco Tipo 1 5kg');
  const [testResult, setTestResult] = useState<FiscalMatchResult | null>(null);

  // Busca e visualização de registros
  const [searchFilter, setSearchFilter] = useState('');
  const [recordTab, setRecordTab] = useState<'ncm' | 'cest' | 'cfop'>('ncm');

  // Sincronização em massa
  const [selectedTenantForSync, setSelectedTenantForSync] = useState<string>('ALL');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    totalProcessed: number;
    updatedCount: number;
    unchangedCount: number;
    tenantsCount: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveSubTab(initialTab);
      }
      loadData();
    }
  }, [isOpen, initialTab]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await loadFiscalDatasets();
      setNcmList(data.ncm || []);
      setCestList(data.cest || []);
      setCfopList(data.cfop || []);

      // Testa automaticamente com o produto padrão "Arroz"
      const match = await findMatchingFiscalData('Arroz Branco Tipo 1 5kg', 'Alimentos', data.ncm);
      setTestResult(match);
    } catch (e: any) {
      setErrorMsg('Erro ao carregar dados fiscais do sistema.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProduct = async (name: string) => {
    setTestProductName(name);
    if (!name.trim()) {
      setTestResult(null);
      return;
    }
    const match = await findMatchingFiscalData(name, undefined, ncmList);
    setTestResult(match);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'ncm' | 'cest' | 'cfop' | 'auto' = 'auto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);
    setIsProcessing(true);
    setActiveImportMode(mode);

    try {
      const parsed = await parseFiscalFile(file, mode);
      setPreviewData(parsed);
      const label = mode === 'ncm' ? 'NCM' : (mode === 'cest' ? 'CEST (CONFAZ)' : (mode === 'cfop' ? 'CFOP' : 'Geral'));
      if (parsed.totalParsed > 0) {
        setSuccessMsg(`Arquivo "${file.name}" lido com sucesso no modo ${label}! ${parsed.totalParsed} registros identificados.`);
      } else {
        setErrorMsg(`Nenhum registro correspondente foi encontrado no arquivo "${file.name}" para o modo ${label}. Verifique se selecionou o local correto (NCM, CEST ou CFOP).`);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao ler arquivo: ${err.message || 'Formato inválido'}`);
      setPreviewData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      let newNcm = [...ncmList];
      let newCest = [...cestList];
      let newCfop = [...cfopList];

      if (previewData.ncmRecords.length > 0) {
        const existingCodes = new Set(newNcm.map(n => n.code.replace(/\D/g, '')));
        const toAdd = previewData.ncmRecords.filter(r => !existingCodes.has(r.code.replace(/\D/g, '')));
        newNcm = [...toAdd, ...newNcm];
      }

      if (previewData.cestRecords.length > 0) {
        const existingCests = new Set(newCest.map(c => c.code.replace(/\D/g, '')));
        const toAdd = previewData.cestRecords.filter(r => !existingCests.has(r.code.replace(/\D/g, '')));
        newCest = [...toAdd, ...newCest];
      }

      if (previewData.cfopRecords.length > 0) {
        const existingCfops = new Set(newCfop.map(c => c.code));
        const toAdd = previewData.cfopRecords.filter(r => !existingCfops.has(r.code));
        newCfop = [...toAdd, ...newCfop];
      }

      const res = await saveFiscalDatasets(newNcm, newCest, newCfop);
      if (res.success) {
        setNcmList(newNcm);
        setCestList(newCest);
        setCfopList(newCfop);
        setPreviewData(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccessMsg(`Importação concluída! Base atualizada com sucesso no banco de dados.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.error || 'Erro ao salvar no banco de dados.');
      }
    } catch (e: any) {
      setErrorMsg(`Erro ao persistir registros: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreOfficialDefaults = async () => {
    if (!confirm('Deseja carregar a base oficial padrão do Brasil? Os NCMs essenciais (alimentos, arroz, bebidas, eletrônicos, autopeças, vestuário) e CFOPs serão integrados.')) {
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await saveFiscalDatasets(DEFAULT_NCM_LIST, DEFAULT_CEST_LIST, DEFAULT_CFOP_LIST);
      if (res.success) {
        setNcmList(DEFAULT_NCM_LIST);
        setCestList(DEFAULT_CEST_LIST);
        setCfopList(DEFAULT_CFOP_LIST);
        setSuccessMsg('Base oficial brasileira carregada e sincronizada no banco de dados com sucesso!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg('Erro ao salvar base padrão.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenClearModal = () => {
    setAdminPasswordInput('');
    setPasswordError(null);
    setShowClearPasswordModal(true);
  };

  const handleConfirmClearWithPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setPasswordError('Por favor, informe a senha de Administrador ou Super ADM.');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      const res = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.message || 'Senha incorreta. Acesso negado para limpar a base fiscal global.');
        setIsVerifyingPassword(false);
        return;
      }

      setIsProcessing(true);
      setShowClearPasswordModal(false);
      setAdminPasswordInput('');

      const clearRes = await clearAllFiscalDatasets();
      if (clearRes.success) {
        setNcmList([]);
        setCestList([]);
        setCfopList([]);
        setSuccessMsg('Base de dados fiscal global limpa com sucesso em todo o sistema!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(clearRes.error || 'Erro ao limpar dados fiscais.');
      }
    } catch (err: any) {
      setPasswordError('Erro de conexão ao verificar senha.');
    } finally {
      setIsVerifyingPassword(false);
      setIsProcessing(false);
    }
  };

  // Sincronização em Massa de Produtos Cadastrados nas Lojas
  const handleRunBatchSync = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSyncReport(null);

    try {
      const targetTenants = selectedTenantForSync === 'ALL'
        ? tenants.map(t => t.id)
        : [selectedTenantForSync];

      let totalUpdated = 0;
      let totalProcessed = 0;
      let totalUnchanged = 0;

      for (const tId of targetTenants) {
        const { data: cloudRec } = await supabase
          .from('cloud_data')
          .select('data_json')
          .eq('tenant_id', tId)
          .eq('store_key', 'products')
          .maybeSingle();

        if (cloudRec?.data_json && Array.isArray(cloudRec.data_json)) {
          const prods: any[] = cloudRec.data_json;
          let changedInTenant = false;

          const updatedProds = await Promise.all(
            prods.map(async (p: any) => {
              totalProcessed++;
              const hasValidNcm = p.ncm && p.ncm.replace(/\D/g, '').length === 8 && p.ncm !== '8517.79.00';

              if (hasValidNcm && !overwriteExisting) {
                totalUnchanged++;
                return p;
              }

              const match = await findMatchingFiscalData(p.name, p.category, ncmList);
              if (match.ncm && match.ncm !== p.ncm) {
                totalUpdated++;
                changedInTenant = true;
                return {
                  ...p,
                  ncm: match.ncm,
                  cest: match.cest || p.cest || '',
                  cfop: match.cfop || p.cfop || '5102'
                };
              }

              totalUnchanged++;
              return p;
            })
          );

          if (changedInTenant) {
            await supabase
              .from('cloud_data')
              .upsert({
                tenant_id: tId,
                store_key: 'products',
                data_json: updatedProds,
                updated_at: new Date().toISOString()
              }, { onConflict: 'tenant_id,store_key' });
          }
        }
      }

      setSyncReport({
        totalProcessed,
        updatedCount: totalUpdated,
        unchangedCount: totalUnchanged,
        tenantsCount: targetTenants.length
      });

      setSuccessMsg(`Sincronização concluída com sucesso! ${totalUpdated} produtos foram atualizados com os códigos fiscais correspondentes.`);
    } catch (err: any) {
      setErrorMsg(`Erro na sincronização em massa: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const filteredNcm = ncmList.filter(n => 
    !searchFilter || 
    n.code.includes(searchFilter) || 
    n.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredCest = cestList.filter(c => 
    !searchFilter || 
    c.code.includes(searchFilter) || 
    c.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.ncm.includes(searchFilter)
  );

  const filteredCfop = cfopList.filter(c => 
    !searchFilter || 
    c.code.includes(searchFilter) || 
    c.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[250] flex items-center justify-center p-2 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900/95 border border-slate-700/70 w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Base Fiscal Global
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  NCM • CEST • CFOP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md hidden sm:block">
                Importe e sincronize tabelas fiscais de mercadorias no sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleOpenClearModal}
              className="px-2.5 py-1.5 bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/25 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Limpar base de dados fiscal global"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Limpar Base</span>
            </button>
            <button 
              type="button"
              onClick={() => setShowSqlScriptModal(true)}
              className="px-2.5 py-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/25 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Visualizar script SQL"
            >
              <Database size={13} />
              <span className="hidden sm:inline">Script SQL</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer ml-1"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:px-6 sm:py-3 bg-slate-900/40 border-b border-slate-800/80 shrink-0">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              NCM
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tabela NCM</p>
              <p className="text-sm sm:text-base font-bold text-white truncate">{ncmList.length.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              CEST
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tabela CEST</p>
              <p className="text-sm sm:text-base font-bold text-white truncate">{cestList.length.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              CFOP
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tabela CFOP</p>
              <p className="text-sm sm:text-base font-bold text-white truncate">{cfopList.length.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Auto-Sync</p>
              <p className="text-[11px] font-bold text-emerald-400 uppercase">Ativo</p>
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 pt-2 border-b border-slate-800 shrink-0 overflow-x-auto hide-scrollbar bg-slate-900/60">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'import' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={14} />
            <span>Importar Arquivos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('test')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'test' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} />
            <span>Simulador de Pareamento</span>
          </button>

          <button
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'records' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database size={14} />
            <span>Registros ({ncmList.length + cestList.length + cfopList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sync')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'sync' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw size={14} />
            <span>Sincronizar Lojas</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: IMPORTAÇÃO DE ARQUIVOS COM LOCAIS DEDICADOS */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-emerald-400" />
                      Locais Específicos para Importação Fiscal
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Importe NCM e CEST em áreas separadas para evitar conflito de formatação de dados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreOfficialDefaults}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    <span>Carregar Base Padrão Oficial</span>
                  </button>
                </div>

                {/* Grid de 3 Caixas de Upload Dedicadas (NCM, CEST e CFOP) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* CAIXA DEDICADA 1: TABELA NCM */}
                  <div 
                    onClick={() => fileInputNcmRef.current?.click()}
                    className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-950/40 rounded-2xl p-3.5 text-center cursor-pointer transition-all group relative overflow-hidden flex flex-col items-center justify-center min-h-[145px]"
                  >
                    <input 
                      ref={fileInputNcmRef}
                      type="file" 
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.json,.pdf" 
                      onChange={(e) => handleFileChange(e, 'ncm')}
                      className="hidden" 
                    />
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md shadow-blue-500/10">
                      {isProcessing && activeImportMode === 'ncm' ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Upload size={18} />}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-1">
                      Área Exclusiva: NCM
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-200 transition-colors">
                      Importar NCM
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-tight">
                      Tabela TIPI (Receita), SISCOMEX, IBPT ou SPED.
                    </p>
                    <p className="text-[9px] text-blue-400/80 font-mono mt-1">
                      .PDF, .XLSX, .CSV, .TXT
                    </p>
                  </div>

                  {/* CAIXA DEDICADA 2: TABELA CEST */}
                  <div 
                    onClick={() => fileInputCestRef.current?.click()}
                    className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 rounded-2xl p-3.5 text-center cursor-pointer transition-all group relative overflow-hidden flex flex-col items-center justify-center min-h-[145px]"
                  >
                    <input 
                      ref={fileInputCestRef}
                      type="file" 
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf" 
                      onChange={(e) => handleFileChange(e, 'cest')}
                      className="hidden" 
                    />
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md shadow-purple-500/10">
                      {isProcessing && activeImportMode === 'cest' ? <Loader2 size={18} className="animate-spin text-purple-400" /> : <Upload size={18} />}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1">
                      Área Exclusiva: CEST
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                      Importar CEST
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-tight">
                      Convênio ICMS 142/18 CONFAZ e Substituição Tributária.
                    </p>
                    <p className="text-[9px] text-purple-400/80 font-mono mt-1">
                      .PDF, .XLSX, .CSV, .TXT
                    </p>
                  </div>

                  {/* CAIXA DEDICADA 3: TABELA CFOP */}
                  <div 
                    onClick={() => fileInputCfopRef.current?.click()}
                    className="border-2 border-dashed border-teal-500/40 hover:border-teal-400 bg-teal-950/20 hover:bg-teal-950/40 rounded-2xl p-3.5 text-center cursor-pointer transition-all group relative overflow-hidden flex flex-col items-center justify-center min-h-[145px]"
                  >
                    <input 
                      ref={fileInputCfopRef}
                      type="file" 
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf,.json" 
                      onChange={(e) => handleFileChange(e, 'cfop')}
                      className="hidden" 
                    />
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md shadow-teal-500/10">
                      {isProcessing && activeImportMode === 'cfop' ? <Loader2 size={18} className="animate-spin text-teal-400" /> : <Upload size={18} />}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-1">
                      Área Exclusiva: CFOP
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-teal-200 transition-colors">
                      Importar CFOP
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-tight">
                      Tabela de Códigos Fiscais de Operações da SEFAZ.
                    </p>
                    <p className="text-[9px] text-teal-400/80 font-mono mt-1">
                      .PDF, .XLSX, .CSV, .TXT
                    </p>
                  </div>

                </div>

                {/* Opção Secundária: Auto-Detectar Arquivo Misto */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Sua planilha possui NCM, CEST e CFOP na mesma tabela?
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer flex items-center gap-1"
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.json,.pdf" 
                      onChange={(e) => handleFileChange(e, 'auto')}
                      className="hidden" 
                    />
                    <span>Importar em Modo Misto (Auto-Detectar Tudo)</span>
                  </button>
                </div>

                {/* Pré-visualização dos dados importados */}
                {previewData && (
                  <div className="space-y-3 pt-3 border-t border-slate-700/50 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-400">
                          ✓ {previewData.totalParsed.toLocaleString('pt-BR')} registros identificados
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          previewData.detectedType === 'convênio_142_18'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : (previewData.detectedType === 'cfop' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800 text-slate-400')
                        }`}>
                          {previewData.detectedType === 'convênio_142_18' 
                            ? 'CONVÊNIO ICMS 142/18' 
                            : `Tipo: ${previewData.detectedType.toUpperCase()}`}
                        </span>
                        {previewData.ncmRecords.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                            {previewData.ncmRecords.length} NCMs
                          </span>
                        )}
                        {previewData.cestRecords.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded">
                            {previewData.cestRecords.length} CESTs
                          </span>
                        )}
                        {previewData.cfopRecords.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded">
                            {previewData.cfopRecords.length} CFOPs
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleConfirmImport}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                      >
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>Gravar no Banco</span>
                      </button>
                    </div>

                    {/* Amostra dos Primeiros Itens */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 overflow-x-auto max-h-48">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                            <th className="pb-1.5">Código</th>
                            <th className="pb-1.5">Descrição</th>
                            <th className="pb-1.5">CEST / CFOP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                          {previewData.ncmRecords.slice(0, 5).map((r, i) => (
                            <tr key={`prev-ncm-${i}`}>
                              <td className="py-1.5 font-mono text-emerald-400 font-bold">{r.code}</td>
                              <td className="py-1.5 max-w-xs sm:max-w-md truncate">{r.description}</td>
                              <td className="py-1.5 text-slate-400">{r.cest || r.cfop || '-'}</td>
                            </tr>
                          ))}
                          {previewData.cestRecords.slice(0, 5).map((r, i) => (
                            <tr key={`prev-cest-${i}`}>
                              <td className="py-1.5 font-mono text-purple-400 font-bold">{r.code}</td>
                              <td className="py-1.5 max-w-xs sm:max-w-md truncate">{r.description}</td>
                              <td className="py-1.5 text-slate-400">NCM: {r.ncm}</td>
                            </tr>
                          ))}
                          {previewData.cfopRecords.slice(0, 5).map((r, i) => (
                            <tr key={`prev-cfop-${i}`}>
                              <td className="py-1.5 font-mono text-blue-400 font-bold">{r.code}</td>
                              <td className="py-1.5 max-w-xs sm:max-w-md truncate">{r.description}</td>
                              <td className="py-1.5 text-slate-400">{r.type.toUpperCase()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Dica Informativa e Onde Baixar as Tabelas Oficiais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-800/25 border border-slate-700/40 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={16} />
                  </div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <p className="font-bold text-white text-[11px] uppercase tracking-wider">Onde conseguir os arquivos fiscais?</p>
                    <ul className="text-slate-400 space-y-1 list-disc pl-3.5 text-[11px] leading-relaxed">
                      <li><strong className="text-slate-200">Tabela TIPI (Receita Federal):</strong> Portal Gov.br em XLSX ou PDF com 10.000+ NCMs.</li>
                      <li><strong className="text-slate-200">Siscomex (MDIC):</strong> Tabela completa NCM/SH vigente em Excel.</li>
                      <li><strong className="text-slate-200">Tabela IBPT:</strong> Arquivos .CSV com alíquotas e códigos fiscais.</li>
                      <li><strong className="text-slate-200">Convênio ICMS 142/18 CONFAZ:</strong> Lista de mercadorias com ST (CEST + NCM).</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-800/25 border border-slate-700/40 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle size={16} />
                  </div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <p className="font-bold text-white text-[11px] uppercase tracking-wider">Como funciona o salvamento?</p>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Ao enviar o arquivo, o sistema formata e corrige automaticamente os códigos (ex: 1012900 &rarr; 0101.29.00) e sincroniza na nuvem para que os produtos cadastrados identifiquem NCM, CEST e CFOP em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TESTADOR INTELIGENTE POR NOME (EX: ARROZ) */}
          {activeSubTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    Simulador de Pareamento de Produto
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Digite o nome de uma mercadoria para simular a identificação fiscal automática.
                  </p>
                </div>

                {/* Input de Teste */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text" 
                      value={testProductName}
                      onChange={(e) => handleTestProduct(e.target.value)}
                      placeholder="Ex: Arroz Branco 5kg, Coca-Cola 2L, Bateria..."
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-medium text-xs sm:text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => handleTestProduct('Arroz Branco Tipo 1 5kg')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap"
                    >
                      Arroz
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestProduct('Refrigerante Coca-Cola 2L')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap"
                    >
                      Refrigerante
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestProduct('Tela Display iPhone 11')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap"
                    >
                      Tela Celular
                    </button>
                  </div>
                </div>

                {/* Card de Resultado do Matching */}
                {testResult && (
                  <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-300">
                          Correspondência Localizada
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Confiança: {testResult.confidence.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">NCM Automático</p>
                        <p className="text-base font-bold font-mono text-emerald-400">{testResult.ncm}</p>
                        <p className="text-[11px] text-slate-300 mt-0.5 font-medium leading-tight">{testResult.ncmDescription}</p>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">CEST (ST)</p>
                        <p className="text-base font-bold font-mono text-purple-400">
                          {testResult.cest || 'Não aplicável'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                          {testResult.cest ? 'Sujeito a Substituição Tributária' : 'Tributação normal'}
                        </p>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">CFOP de Venda</p>
                        <p className="text-base font-bold font-mono text-blue-400">{testResult.cfop}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                          {testResult.cfop === '5405' ? 'Venda c/ Substituição Tributária' : 'Venda padrão mercadoria'}
                        </p>
                      </div>
                    </div>

                    {/* Alternativas encontradas */}
                    {testResult.alternatives && testResult.alternatives.length > 1 && (
                      <div className="pt-2.5 border-t border-slate-800">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                          Variações Encontradas:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {testResult.alternatives.slice(1).map((alt, i) => (
                            <div key={`alt-${i}`} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between text-xs">
                              <span className="font-mono text-emerald-400 font-bold shrink-0 text-[11px]">{alt.code}</span>
                              <span className="text-slate-400 truncate ml-2 text-[11px]">{alt.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONSULTAR REGISTROS CADASTRADOS */}
          {activeSubTab === 'records' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRecordTab('ncm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      recordTab === 'ncm' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    NCMs ({ncmList.length})
                  </button>
                  <button
                    onClick={() => setRecordTab('cest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      recordTab === 'cest' 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    CESTs ({cestList.length})
                  </button>
                  <button
                    onClick={() => setRecordTab('cfop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      recordTab === 'cfop' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    CFOPs ({cfopList.length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                    <input 
                      type="text" 
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Pesquisar..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleOpenClearModal}
                    className="px-2.5 py-1.5 text-red-400 hover:text-white hover:bg-red-600/30 rounded-lg border border-red-500/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium shrink-0"
                    title="Limpar registros fiscais"
                  >
                    <Trash2 size={13} />
                    <span className="hidden md:inline">Limpar</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Registros */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-[46vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {recordTab === 'ncm' && filteredNcm.slice(0, 100).map((r, i) => (
                      <tr key={`ncm-row-${i}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap text-[11px]">{r.code}</td>
                        <td className="py-2 px-3 text-[11px] font-medium">{r.description}</td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                          {r.cest ? <span className="mr-2 text-purple-400">CEST: {r.cest}</span> : null}
                          {r.cfop ? <span className="text-blue-400">CFOP: {r.cfop}</span> : null}
                        </td>
                      </tr>
                    ))}

                    {recordTab === 'cest' && filteredCest.slice(0, 100).map((r, i) => (
                      <tr key={`cest-row-${i}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-purple-400 font-bold whitespace-nowrap text-[11px]">{r.code}</td>
                        <td className="py-2 px-3 text-[11px] font-medium">{r.description}</td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">NCM: {r.ncm || 'Todos'}</td>
                      </tr>
                    ))}

                    {recordTab === 'cfop' && filteredCfop.slice(0, 100).map((r, i) => (
                      <tr key={`cfop-row-${i}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-blue-400 font-bold whitespace-nowrap text-[11px]">{r.code}</td>
                        <td className="py-2 px-3 text-[11px] font-medium">{r.description}</td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap uppercase text-[11px]">{r.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SINCRONIZAR EM MASSA PRODUTOS DAS LOJAS */}
          {activeSubTab === 'sync' && (
            <div className="space-y-4">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw size={16} className="text-emerald-400" />
                    Sincronizador Automático em Massa
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Atualiza os códigos NCM, CEST e CFOP de produtos já cadastrados nas lojas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1 block">
                      Loja Alvo
                    </label>
                    <select
                      value={selectedTenantForSync}
                      onChange={(e) => setSelectedTenantForSync(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-medium text-xs outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">🌟 TODAS AS LOJAS ({tenants.length} lojas)</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.store_name || t.name || t.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <input 
                      type="checkbox"
                      id="chk-overwrite"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                    <label htmlFor="chk-overwrite" className="text-xs text-slate-300 font-medium cursor-pointer">
                      <span className="font-semibold text-white block text-xs">Sobrescrever códigos já cadastrados</span>
                      <span className="text-[10px] text-slate-400">Se desmarcado, atualiza apenas produtos sem NCM.</span>
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleRunBatchSync}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    <span>Executar Sincronização Fiscal em Massa</span>
                  </button>
                </div>

                {/* Relatório de Sincronização */}
                {syncReport && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 animate-in fade-in">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Relatório da Sincronização
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900 p-2.5 rounded-lg">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Analisados</p>
                        <p className="text-sm font-bold text-white">{syncReport.totalProcessed}</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-emerald-500/30">
                        <p className="text-[9px] text-emerald-400 font-semibold uppercase">Atualizados</p>
                        <p className="text-sm font-bold text-emerald-400">{syncReport.updatedCount}</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Inalterados</p>
                        <p className="text-sm font-bold text-slate-300">{syncReport.unchangedCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium truncate">
            Integração Fiscal: Receita Federal / SEFAZ / IBPT
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* MODAL DO SCRIPT SQL PARA SUPABASE */}
      {showSqlScriptModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Código SQL para Supabase</h3>
                  <p className="text-[10px] text-slate-400">Execute no Supabase SQL Editor para criar tabelas e índices.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlScriptModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3.5 overflow-y-auto flex-1 bg-slate-950">
              <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed select-all bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                {FISCAL_SQL_SCRIPT}
              </pre>
            </div>
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Arquivo salvo na raiz como <strong className="text-white">setup_fiscal_tables.sql</strong>
              </p>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(FISCAL_SQL_SCRIPT);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlScriptModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA COM SENHA */}
      {showClearPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[350] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/40 w-full max-w-sm rounded-2xl shadow-2xl shadow-red-950/50 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-red-950/40 border-b border-red-500/20 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Limpar Base Fiscal Global
                </h3>
                <p className="text-[11px] text-red-300/80 mt-0.5 leading-snug">
                  Ação crítica. Todos os registros de NCM, CEST e CFOP serão removidos.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowClearPasswordModal(false);
                  setAdminPasswordInput('');
                  setPasswordError(null);
                }}
                disabled={isVerifyingPassword}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmClearWithPassword} className="p-4 space-y-3.5 bg-slate-900">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
                  <AlertOctagon size={13} className="text-amber-400" />
                  <span>Serão excluídos:</span>
                </p>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[10px]">
                  <li><strong>{ncmList.length.toLocaleString('pt-BR')}</strong> códigos NCM</li>
                  <li><strong>{cestList.length.toLocaleString('pt-BR')}</strong> códigos CEST</li>
                  <li><strong>{cfopList.length.toLocaleString('pt-BR')}</strong> códigos CFOP</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Senha de Administrador ou Super ADM:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="Sua senha de segurança..."
                    autoFocus
                    disabled={isVerifyingPassword}
                    className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearPasswordModal(false);
                    setAdminPasswordInput('');
                    setPasswordError(null);
                  }}
                  disabled={isVerifyingPassword}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPassword || !adminPasswordInput.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5"
                >
                  {isVerifyingPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
